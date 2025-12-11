import Image from "next/image";
import Chat from "./components/Chat";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-row items-center mb-12">
          <h1 className="text-6xl font-bold mr-4">F1</h1>
          <Image
            src="/f1-logo.svg"
            alt="F1 Chatbot Logo"
            width={80}
            height={80}
            priority
          />
        </div>

        <Chat />
      </main>
    </div>
  );
}
