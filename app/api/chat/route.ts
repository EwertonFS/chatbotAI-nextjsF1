import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GOOGLE_AI_GENERATE,
} = process.env;

const google = createGoogleGenerativeAI({
    apiKey: GOOGLE_AI_GENERATE,
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT || "", {
    keyspace: ASTRA_DB_NAMESPACE,
});

export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        console.log("--> [API] Received chat request");
        const { messages } = await req.json();
        const latestMessage = messages?.[messages?.length - 1]?.content;
        console.log("--> [API] Latest message:", latestMessage);

        let docContext = "";

        // 1. Generate Embedding
        if (latestMessage) {
            try {
                console.log("--> [API] Generating embedding...");
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_GENERATE || "");
                const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

                const embeddingResult = await embeddingModel.embedContent(latestMessage);
                const vector = embeddingResult.embedding.values;
                console.log("--> [API] Embedding generated. Vector length:", vector.length);

                try {
                    console.log("--> [API] Querying Astra DB...");
                    const collection = await db.collection(ASTRA_DB_COLLECTION!);
                    const cursor = collection.find({}, {
                        sort: { $vector: vector },
                        limit: 10,
                    });
                    const documents = await cursor.toArray();
                    console.log(`--> [API] Found ${documents.length} documents in DB`);

                    const docsMap = documents?.map((doc) => doc.text);
                    docContext = JSON.stringify(docsMap);
                } catch (err) {
                    console.error("--> [API] Error querying DB:", err);
                }
            } catch (err) {
                console.error("--> [API] Error generating embedding:", err);
                // Continue without context
            }
        }

        const template = `
      Você é um assistente de IA que sabe tudo sobre Fórmula 1.
      Use o contexto abaixo para complementar o que você já sabe sobre corridas de Fórmula 1.
      O contexto fornecerá os dados mais recentes de páginas da Wikipédia,
      do site oficial da F1 e de outras fontes.
      Se o contexto não incluir as informações necessárias, responda com base no seu
      conhecimento existente e não mencione a fonte da informação nem
      o que o contexto inclui ou não inclui.
      Formate as respostas usando markdown quando aplicável e não retorne
      imagens.
      
      ----------
      STARTER CONTEXT:
      ${docContext}
      END CONTEXT
      ------------
    `;
        
        console.log("--> [API] Starting generateText with Gemini...");
        const result = await generateText({
            model: google("gemini-2.5-flash"),
            system: template,
            messages,
        });

        console.log("--> [API] GenerateText result:", result);
        console.log("--> [API] Result text:", result.text);

        return new Response(JSON.stringify({ content: result.text }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("--> [API] Critical Error in chat route:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

export async function GET(req: Request) {
    return new Response("API is working! send a POST request to chat.", { status: 200 });
}
