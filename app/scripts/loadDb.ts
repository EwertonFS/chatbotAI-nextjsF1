/**
 * Script de Carga de Dados para o Chatbot F1
 * 
 * Este script realiza web scraping de páginas sobre Fórmula 1,
 * processa o conteúdo em chunks menores, gera embeddings usando Google Gemini,
 * e armazena tudo no Astra DB para uso em RAG (Retrieval-Augmented Generation).
 */

// ========================================
// IMPORTAÇÕES
// ========================================

// Cliente para interagir com o banco de dados Astra DB (DataStax)
import { DataAPIClient } from "@datastax/astra-db-ts";

// Loader para fazer scraping de páginas web usando Puppeteer (navegador headless)
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

// SDK do Google Gemini para geração de embeddings
import { GoogleGenerativeAI } from "@google/generative-ai";

// Divisor de texto que quebra documentos grandes em chunks menores
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Carrega variáveis de ambiente do arquivo .env
import "dotenv/config";

// ========================================
// CONFIGURAÇÃO DE VARIÁVEIS DE AMBIENTE
// ========================================

// Extrai as variáveis necessárias do ambiente
const { 
    ASTRA_DB_NAMESPACE,        // Namespace (keyspace) do banco
    ASTRA_DB_COLLECTION,       // Nome da coleção onde os dados serão armazenados
    ASTRA_DB_API_ENDPOINT,     // URL do endpoint da API do Astra DB
    ASTRA_DB_APPLICATION_TOKEN,// Token de autenticação para o Astra DB
    GOOGLE_AI_GENERATE         // Chave de API do Google Gemini
} = process.env;

// Valida se todas as variáveis obrigatórias estão presentes
if (!ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !GOOGLE_AI_GENERATE) {
    throw new Error("Missing or invalid environment variables. Please check your .env file.");
}

// ========================================
// TIPOS E CONSTANTES
// ========================================

// Define os tipos de métricas de similaridade suportadas pelo Astra DB
type SimilarityMetric = 'dot_product' | 'cosine' | 'euclidean';

// Inicializa o cliente do Google Gemini
const ai = new GoogleGenerativeAI(GOOGLE_AI_GENERATE);

// ========================================
// FUNÇÃO DE TESTE DO GEMINI
// ========================================

/**
 * Testa a conexão com a API do Google Gemini
 * Gera uma resposta simples para verificar se a chave de API está funcionando
 */
async function checkGemini() {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const response = await model.generateContent("Explain how AI works in a few words");
        console.log("Gemini Test Response:", response.response.text());
    } catch (error) {
        console.error("Gemini Test Failed:", error);
    }
}

// ========================================
// DADOS DE ORIGEM
// ========================================

/**
 * URLs das páginas que serão processadas
 * Adicione mais URLs aqui para expandir a base de conhecimento do chatbot
 */
const f1Data = [
    'https://pt.wikipedia.org/wiki/Campeonato_Mundial_de_F%C3%B3rmula_1_de_2025'
];

// ========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ========================================

// Cria uma instância do cliente Astra DB com autenticação
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

// Conecta ao banco de dados específico usando o endpoint e namespace
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE });

// ========================================
// CONFIGURAÇÃO DO DIVISOR DE TEXTO
// ========================================

/**
 * Configura o divisor de texto
 * - chunkSize: Tamanho máximo de cada chunk em caracteres (512)
 * - chunkOverlap: Quantos caracteres de sobreposição entre chunks (200)
 *   A sobreposição ajuda a manter o contexto entre chunks adjacentes
 */
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 200,
});

// ========================================
// CRIAÇÃO DA COLEÇÃO NO ASTRA DB
// ========================================

/**
 * Cria uma coleção vetorial no Astra DB
 * @param similarityMetric - Métrica usada para calcular similaridade entre vetores
 */
const createCollection = async (similarityMetric: SimilarityMetric = 'dot_product') => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION!, {
            vector: {
                dimension: 768, // Gemini text-embedding-004 usa 768 dimensões
                metric: similarityMetric // Algoritmo de busca por similaridade
            }
        });
        console.log("Collection created:", res);
    } catch (e: any) {
        // Se a coleção já existir, apenas avisa e continua
        if (e.message?.includes('already exists')) {
            console.log("Collection already exists, skipping creation.");
        } else {
            console.error("Error creating collection:", e);
        }
    }
};

// ========================================
// WEB SCRAPING
// ========================================

/**
 * Realiza scraping de uma página web usando Puppeteer
 * @param url - URL da página a ser extraída
 * @returns Conteúdo da página em texto puro (sem HTML)
 */
const scrapePage = async (url: string) => {
    // Configura o loader do Puppeteer
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true, // Executa sem interface gráfica
            args: [
                '--disable-gpu',         // Desabilita GPU para ambientes serverless
                '--disable-dev-shm-usage', // Evita problemas de memória compartilhada
                '--no-sandbox'           // Necessário em alguns ambientes Docker/CI
            ]
        },
        gotoOptions: {
            waitUntil: 'domcontentloaded' // Espera o DOM carregar antes de processar
        },
        evaluate: async (page, browser) => {
            // Extrai o HTML da página
            const result = await page.evaluate(() => document.body.innerHTML);
            await browser.close(); // Fecha o navegador para liberar recursos
            return result;
        }
    });

    // Faz o scraping e remove todas as tags HTML, deixando apenas texto
    const content = await loader.scrape();
    return content?.replace(/<[^>]*>?/gm, "") || "";
};

// ========================================
// PROCESSAMENTO E CARGA DE DADOS
// ========================================

/**
 * Função principal que:
 * 1. Faz scraping de cada URL
 * 2. Divide o conteúdo em chunks
 * 3. Gera embeddings para cada chunk
 * 4. Armazena no Astra DB
 */
const loadSampleData = async () => {
    // Obtém referência à coleção
    const collection = await db.collection(ASTRA_DB_COLLECTION!);
    
    // Processa cada URL da lista
    for await (const url of f1Data) {
        console.log(`Scraping ${url}...`);
        
        // 1. Faz scraping da página
        const content = await scrapePage(url);
        
        // 2. Divide o conteúdo em chunks menores
        const chunks = await splitter.splitText(content);
        console.log(`Generated ${chunks.length} chunks.`);

        // 3. Processa cada chunk
        let i = 0;
        for await (const chunk of chunks) {
            console.log(`Processing chunk ${++i}/${chunks.length}`);
            
            // 4. Gera o embedding (vetor) para o chunk usando Gemini
            const model = ai.getGenerativeModel({ model: "text-embedding-004" });
            const embedding = await model.embedContent(chunk);

            // Extrai o vetor numérico do resultado
            const vector = embedding.embedding.values;

            // 5. Insere o chunk e seu vetor no banco de dados
            const res = await collection.insertOne({
                $vector: vector, // Vetor para busca semântica
                text: chunk      // Texto original do chunk
            });

            console.log("Inserted chunk:", res);
        }
    }
};

// ========================================
// EXECUÇÃO PRINCIPAL
// ========================================

/**
 * IIFE (Immediately Invoked Function Expression) que executa o script
 * Ordem de execução:
 * 1. Testa a conexão com o Gemini
 * 2. Cria a coleção no Astra DB (se não existir)
 * 3. Carrega e processa os dados das URLs
 */
(async () => {
    await checkGemini();        // Testa API do Gemini
    await createCollection();   // Cria/verifica coleção
    await loadSampleData();     // Processa e carrega dados
})();