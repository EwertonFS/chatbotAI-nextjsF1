"use client";

import { useState } from "react";
import LoadingBuble from "./LoadingBuble";
import PromptSuggestionsRow from "./PromptSuggestionsRow";

type Message = { role: string; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle prompt click
  const handlePromptClick = async (prompt: string) => {
    const newMessages = [...messages, { role: "user", content: prompt }];
    setMessages(newMessages);
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const noMessages = !messages || messages.length === 0;

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input?.trim()) {
      return;
    }
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      console.log("Response status:", response.status, "ok:", response.ok);
      if (!response.ok) throw new Error("API error");
      let data;
      try {
        data = await response.json();
        console.log("Response data:", data);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        const text = await response.text();
        console.log("Response text:", text);
        throw e;
      }
      setMessages([
        ...newMessages,
        { role: "assistant", content: data.content },
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <section className="flex flex-col items-center justify-center w-full flex-1 overflow-y-auto mb-8">
        {noMessages ? (
          <PromptSuggestionsRow onPromptClick={handlePromptClick} />
        ) : (
          <div className="flex flex-col w-full gap-4">
            {messages.map((m, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${m.role === "user" ? "bg-zinc-100 dark:bg-zinc-800 self-end" : "bg-transparent self-start"}`}
              >
                <span className="font-bold">
                  {m.role === "user" ? "Você" : "F1 Bot"}:
                </span>
                <div className="mt-2 whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
            {isLoading && <LoadingBuble />}
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="w-full flex gap-2">
        <input
          className="flex-1 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent dark:text-white"
          type="text"
          placeholder="Digite sua pergunta sobre Fórmula 1..."
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
        <button
          type="submit"
          className="p-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
        >
          Enviar
        </button>
      </form>
    </>
  );
}
