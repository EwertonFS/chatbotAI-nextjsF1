interface PromptSuggestionsRowProps {
    onPromptClick: (prompt: string) => void;
}

const PromptSuggestionsRow = ({ onPromptClick }: PromptSuggestionsRowProps) => {

    const examplePrompts = [
        "Quem venceu a última corrida?",
        "Explique a regra do Safety Car",
        "Quem é o atual campeão mundial?",
        "Quais são as equipes de 2024?"
    ];

    return (
        <div className="flex flex-col items-center w-full gap-4">
            <p className="text-xl mb-4 text-zinc-500">Comece uma conversa sobre Fórmula 1</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {examplePrompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => onPromptClick(prompt)}
                        className="p-4 text-left rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default PromptSuggestionsRow;