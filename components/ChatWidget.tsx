"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "text" | "loading";
};

type ChatFile = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type ChatWidgetProps = {
  clientId?: string;
  username?: string;
  apiBaseUrl?: string;
  sessionId?: string;
};

export function ChatWidget({ clientId, username, apiBaseUrl = "", sessionId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantName, setAssistantName] = useState("Assistant");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const resolvedSessionId = useMemo(() => sessionId ?? crypto.randomUUID(), [sessionId]);
  const tenantHeaderKey = clientId ? "x-client-id" : "x-client-slug";
  const tenantHeaderValue = (clientId ?? username ?? "").trim();
  const tenantLabel = clientId ? `Ditta: ${clientId}` : username ? `Ditta: ${username}` : "Ditta non impostata";

  function appendMessage(message: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID() }]);
  }

  function clearLoadingMessage() {
    setMessages((prev) => prev.filter((message) => message.kind !== "loading"));
  }

  const tenantHeaders = useMemo(
    () => ({
      "content-type": "application/json",
      [tenantHeaderKey]: tenantHeaderValue,
    }),
    [tenantHeaderKey, tenantHeaderValue],
  );

  async function loadSessionFiles() {
    if (!tenantHeaderValue) return;
    const params = new URLSearchParams({ sessionId: resolvedSessionId });
    const response = await fetch(`${apiBaseUrl}/api/files?${params.toString()}`, {
      headers: {
        [tenantHeaderKey]: tenantHeaderValue,
      },
    });
    const data = (await response.json()) as { files?: ChatFile[]; error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Errore caricamento file");
    }
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    loadSessionFiles().catch(() => {
      setUploadStatus("Impossibile caricare allegati chat");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantHeaderValue, resolvedSessionId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || loading) return;
    if (!tenantHeaderValue) {
      appendMessage({
        role: "assistant",
        kind: "text",
        text: "Ditta non impostata. Apri la demo con `?ditta=<slug>` oppure passa `username` al widget.",
      });
      return;
    }

    setText("");
    appendMessage({ role: "user", kind: "text", text: message });
    appendMessage({ role: "assistant", kind: "loading", text: "" });
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: "POST",
        headers: tenantHeaders,
        body: JSON.stringify({
          sessionId: resolvedSessionId,
          message,
        }),
      });

      const data = (await response.json()) as { reply?: string; assistantName?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Errore chat");
      }

      setAssistantName(data.assistantName?.trim() || "Assistant");
      clearLoadingMessage();
      appendMessage({ role: "assistant", kind: "text", text: data.reply ?? "Nessuna risposta" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      clearLoadingMessage();
      appendMessage({ role: "assistant", kind: "text", text: `Errore: ${detail}` });
    } finally {
      setLoading(false);
    }
  }

  function onTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function onSelectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || uploading) return;
    if (!tenantHeaderValue) {
      setUploadStatus("Ditta non impostata: impossibile allegare file");
      return;
    }

    setUploading(true);
    setUploadStatus("Caricamento allegato...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", resolvedSessionId);
      const response = await fetch(`${apiBaseUrl}/api/files`, {
        method: "POST",
        headers: {
          [tenantHeaderKey]: tenantHeaderValue,
        },
        body: form,
      });
      const data = (await response.json()) as { file?: ChatFile; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Errore upload file");
      }
      setFiles((prev) => [data.file as ChatFile, ...prev]);
      setUploadStatus(`Allegato caricato: ${file.name}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore upload";
      setUploadStatus(`Errore allegato: ${detail}`);
    } finally {
      setUploading(false);
    }
  }

  async function removeFile(fileId: string) {
    if (!tenantHeaderValue) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/files/${fileId}`, {
        method: "DELETE",
        headers: {
          [tenantHeaderKey]: tenantHeaderValue,
        },
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Errore eliminazione file");
      }
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      setUploadStatus("Allegato rimosso");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore eliminazione";
      setUploadStatus(`Errore allegato: ${detail}`);
    }
  }

  return (
    <section className="card" style={{ width: "100%", maxWidth: 420, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <strong>EasyVox, Ai chat Hub Widget</strong>
        <p className="mono" style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {tenantLabel}
        </p>
      </header>

      <div
        ref={messagesContainerRef}
        style={{
          minHeight: 220,
          maxHeight: 320,
          overflowY: "auto",
          display: "grid",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: message.role === "user" ? "#fff0d7" : "#fff",
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
              {message.role === "user" ? "tu" : assistantName}
            </div>
            {message.kind === "loading" ? (
              <div className="chat-loader-dots" aria-live="polite" aria-label={`${assistantName} sta scrivendo`}>
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{message.text}</div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            Inizia una conversazione.
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder="Scrivi qui..."
          rows={3}
          style={{
            flex: 1,
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
          aria-label={loading ? "Invio in corso" : "Invia messaggio"}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid var(--ink)",
            background: "var(--ink)",
            color: "white",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1,
            display: "grid",
            placeItems: "center",
            padding: 0,
            cursor: loading ? "not-allowed" : "pointer",
            flexShrink: 0,
            justifySelf: "end",
          }}
        >
          {loading ? "…" : "↑"}
        </button>
      </form>

      <section style={{ marginTop: 14, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Allegati della chat</strong>
          <label
            style={{
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              cursor: uploading ? "not-allowed" : "pointer",
              opacity: uploading ? 0.65 : 1,
            }}
          >
            {uploading ? "Carico..." : "Allega file"}
            <input type="file" onChange={onSelectFile} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>

        {uploadStatus ? (
          <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
            {uploadStatus}
          </p>
        ) : null}

        <div style={{ display: "grid", gap: 6 }}>
          {files.length === 0 ? (
            <p className="mono" style={{ margin: 0, fontSize: 11, color: "var(--muted)" }}>
              Nessun file allegato a questa chat.
            </p>
          ) : (
            files.map((file) => (
              <article
                key={file.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  display: "grid",
                  gap: 5,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>{file.filename}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                  {(file.sizeBytes / 1024).toFixed(1)} KB
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`${apiBaseUrl}/api/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--accent)" }}
                  >
                    Apri
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    style={{
                      fontSize: 12,
                      border: "none",
                      padding: 0,
                      background: "transparent",
                      color: "#b42318",
                      cursor: "pointer",
                    }}
                  >
                    Rimuovi
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
