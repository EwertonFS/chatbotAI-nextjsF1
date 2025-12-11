/**
 * Componente de Loading estilo WhatsApp
 * Mostra três pontos animados que simulam o efeito de "digitando..."
 */
const LoadingBuble = () => {
  return (
    <div className="flex items-start gap-2">
      {/* Container do loading bubble - estilo mensagem do bot */}
      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3 flex items-center gap-1">
        {/* Três pontos com animação de fade */}
        <span
          className="w-2 h-2 bg-zinc-500 dark:bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
        />
        <span
          className="w-2 h-2 bg-zinc-500 dark:bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
        />
        <span
          className="w-2 h-2 bg-zinc-500 dark:bg-zinc-400 rounded-full animate-bounce"
          style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
        />
      </div>
    </div>
  );
};

export default LoadingBuble;
