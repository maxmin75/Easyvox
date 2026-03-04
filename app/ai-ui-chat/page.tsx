"use client";

import { FormEvent, useMemo, useState } from "react";
import { ActionRenderer } from "@/components/ai-ui-actions/ActionRenderer";
import { type UiAction } from "@/lib/ai-ui-actions/contracts";
import styles from "@/app/ai-ui-chat/page.module.css";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  actions: UiAction[];
};

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AiUiChatPage() {
  const conversationId = useMemo(() => makeId(), []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      text: "Ciao, posso attivare azioni UI: prodotti, dettaglio, booking, supporto e checkout.",
      actions: [],
    },
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userText = input.trim();
    if (!userText || loading) return;

    const nextUserMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      text: userText,
      actions: [],
    };

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-ui-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userMessage: userText,
        }),
      });

      const data = (await res.json()) as { message?: string; actions?: UiAction[] };

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: typeof data?.message === "string" ? data.message : "Risposta non valida dal server.",
        actions: Array.isArray(data?.actions) ? data.actions : [],
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: "Errore di rete. Riprova.",
          actions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>AI UI Actions Playground</h1>
          <p className={styles.subtitle}>
            La AI risponde con JSON strutturato. Il frontend renderizza solo actions validate in whitelist.
          </p>
        </header>

        <section className={styles.chatBox}>
          <div className={styles.messages}>
            {messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${message.role === "user" ? styles.user : styles.assistant}`}
              >
                {message.text}
              </article>
            ))}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Scrivi: mostra prodotti audio, apri prodotto p-002, supporto..."
              disabled={loading}
            />
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? "Invio..." : "Invia"}
            </button>
          </form>
        </section>

        <section className={styles.actions}>
          {messages
            .filter((message) => message.role === "assistant" && message.actions.length > 0)
            .map((message) => (
              <ActionRenderer key={`actions-${message.id}`} actions={message.actions} />
            ))}
        </section>
      </div>
    </main>
  );
}
