"use client";

import { FormEvent, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  text: string;
};

type ChatWidgetProps = {
  clientId: string;
  apiBaseUrl?: string;
  sessionId?: string;
};

export function ChatWidget({ clientId, apiBaseUrl = "", sessionId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const resolvedSessionId = useMemo(() => sessionId ?? crypto.randomUUID(), [sessionId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || loading) return;

    setText("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-client-id": clientId,
        },
        body: JSON.stringify({
          sessionId: resolvedSessionId,
          message,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Errore chat");
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply ?? "Nessuna risposta" }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      setMessages((prev) => [...prev, { role: "assistant", text: `Errore: ${detail}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ width: "100%", maxWidth: 420, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <strong>AI Chat Hub Widget</strong>
        <p className="mono" style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          clientId: {clientId}
        </p>
      </header>

      <div
        style={{
          minHeight: 220,
          maxHeight: 320,
          overflowY: "auto",
          display: "grid",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: message.role === "user" ? "#fff0d7" : "#fff",
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              {message.role}
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{message.text}</div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            Inizia una conversazione.
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Scrivi qui..."
          rows={3}
          style={{
            width: "100%",
            resize: "vertical",
            borderRadius: 10,
            border: "1px solid var(--line)",
            padding: 10,
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            borderRadius: 10,
            border: "1px solid var(--ink)",
            background: "var(--ink)",
            color: "white",
            fontWeight: 700,
            padding: "10px 12px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Invio..." : "Invia"}
        </button>
      </form>
    </section>
  );
}
