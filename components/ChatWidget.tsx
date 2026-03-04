"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: "text" | "loading" | "file";
};

type ChatWidgetProps = {
  clientId?: string;
  username?: string;
  apiBaseUrl?: string;
  sessionId?: string;
};

type CustomerProfile = {
  name: string;
  email: string;
};

export function ChatWidget({ clientId, username, apiBaseUrl = "", sessionId }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileEmailInput, setProfileEmailInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profilingRequired, setProfilingRequired] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [chatUserEmail, setChatUserEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [assistantName, setAssistantName] = useState("Assistant");
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tenantHeaderKey = clientId ? "x-client-id" : "x-client-slug";
  const tenantHeaderValue = (clientId ?? username ?? "").trim();
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionId ?? "");
  const sessionStorageKey = useMemo(
    () => `easyvox-chat-session:${tenantHeaderKey}:${tenantHeaderValue || "demo"}`,
    [tenantHeaderKey, tenantHeaderValue],
  );
  const profileStorageKey = useMemo(
    () => `easyvox-chat-profile:${tenantHeaderKey}:${tenantHeaderValue || "demo"}`,
    [tenantHeaderKey, tenantHeaderValue],
  );
  const tenantLabel = clientId ? `Ditta: ${clientId}` : username ? `Ditta: ${username}` : "Easyvox chat";

  function appendMessage(message: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID() }]);
  }

  function clearLoadingMessage() {
    setMessages((prev) => prev.filter((message) => message.kind !== "loading"));
  }

  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (tenantHeaderValue) headers[tenantHeaderKey] = tenantHeaderValue;
    return headers;
  }, [tenantHeaderKey, tenantHeaderValue]);

  useEffect(() => {
    if (sessionId) {
      setResolvedSessionId(sessionId);
      return;
    }
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(sessionStorageKey);
    if (stored && stored.trim().length >= 3) {
      setResolvedSessionId(stored);
      return;
    }

    const generated = crypto.randomUUID();
    window.localStorage.setItem(sessionStorageKey, generated);
    setResolvedSessionId(generated);
  }, [sessionId, sessionStorageKey]);

  useEffect(() => {
    if (!tenantHeaderValue) {
      setProfilingRequired(false);
      return;
    }
    const query = clientId
      ? `clientId=${encodeURIComponent(clientId)}`
      : `clientSlug=${encodeURIComponent(tenantHeaderValue)}`;
    fetch(`${apiBaseUrl}/api/internal/client-exists?${query}`)
      .then((response) => response.json())
      .then((data: { requireProfiling?: boolean; requireUserAuthForChat?: boolean }) => {
        setProfilingRequired(Boolean(data.requireProfiling));
        setAuthRequired(Boolean(data.requireUserAuthForChat));
      })
      .catch(() => {
        setProfilingRequired(false);
        setAuthRequired(false);
      });
  }, [apiBaseUrl, clientId, tenantHeaderValue]);

  useEffect(() => {
    if (!tenantHeaderValue) {
      setChatUserEmail("");
      return;
    }

    const headers: Record<string, string> = {};
    headers[tenantHeaderKey] = tenantHeaderValue;
    fetch(`${apiBaseUrl}/api/chat-auth/me`, { headers })
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        setChatUserEmail(data.user?.email?.trim().toLowerCase() ?? "");
      })
      .catch(() => {
        setChatUserEmail("");
      });
  }, [apiBaseUrl, tenantHeaderKey, tenantHeaderValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(profileStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as CustomerProfile;
      if (parsed.name?.trim() && parsed.email?.trim()) {
        setCustomerProfile({
          name: parsed.name.trim(),
          email: parsed.email.trim().toLowerCase(),
        });
      }
    } catch {
      // ignore local storage parse errors
    }
  }, [profileStorageKey]);

  function submitProfile() {
    const name = profileNameInput.trim();
    const email = profileEmailInput.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !emailRegex.test(email)) {
      setProfileError("Inserisci nome completo ed email valida.");
      return;
    }
    const profile = { name, email };
    setCustomerProfile(profile);
    setProfileNameInput("");
    setProfileEmailInput("");
    setProfileError("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    }
  }

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    });
  }, [messages, loading]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = text.trim();
    if (!message || loading || !resolvedSessionId) return;
    if (profilingRequired && !customerProfile) return;
    if (authRequired && !chatUserEmail) return;

    setText("");
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches) {
      textareaRef.current?.blur();
    }
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
          customerName: customerProfile?.name,
          customerEmail: customerProfile?.email,
          useEasyvoxChat: !tenantHeaderValue,
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
    if (profilingRequired && !customerProfile) return;
    if (authRequired && !chatUserEmail) return;
    if (!resolvedSessionId) {
      return;
    }
    if (!tenantHeaderValue) {
      return;
    }

    setUploading(true);
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
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Errore upload file");
      }
      appendMessage({ role: "user", kind: "file", text: file.name });
    } catch {
    } finally {
      setUploading(false);
    }
  }

  async function submitChatLogin() {
    if (!tenantHeaderValue) return;
    const email = loginEmail.trim().toLowerCase();
    if (!email || !loginPassword) {
      setLoginError("Inserisci email e password.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat-auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [tenantHeaderKey]: tenantHeaderValue,
        },
        body: JSON.stringify({ email, password: loginPassword }),
      });
      const data = (await response.json()) as { error?: string; user?: { email?: string } };
      if (!response.ok) {
        setLoginError(data.error ?? "Login fallito");
        return;
      }
      setChatUserEmail(data.user?.email?.trim().toLowerCase() ?? email);
      setLoginEmail("");
      setLoginPassword("");
      setLoginError("");
    } catch {
      setLoginError("Errore di rete");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logoutChatUser() {
    await fetch(`${apiBaseUrl}/api/chat-auth/logout`, { method: "POST" }).catch(() => null);
    setChatUserEmail("");
  }

  return (
    <section className="card" style={{ width: "100%", padding: 16, paddingBottom: 230 }}>
      <header style={{ marginBottom: 12 }}>
        <strong>EasyVox, Ai chat Hub</strong>
        <p className="mono" style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
          {tenantLabel}
        </p>
        {authRequired ? (
          chatUserEmail ? (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                Utente chat: {chatUserEmail}
              </p>
              <button
                type="button"
                onClick={logoutChatUser}
                style={{
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: "white",
                  padding: "4px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <strong style={{ fontSize: 13 }}>Accesso richiesto</strong>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  type="email"
                  placeholder="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "8px 10px", fontSize: 13 }}
                />
                <input
                  type="password"
                  placeholder="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "8px 10px", fontSize: 13 }}
                />
                {loginError ? (
                  <p style={{ margin: 0, color: "#b42318", fontSize: 12 }}>{loginError}</p>
                ) : (
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                    Inserisci le credenziali utente abilitate per questo tenant.
                  </p>
                )}
                <div>
                  <button
                    type="button"
                    onClick={submitChatLogin}
                    disabled={loggingIn}
                    style={{
                      borderRadius: 8,
                      border: "1px solid var(--ink)",
                      background: "var(--ink)",
                      color: "white",
                      padding: "8px 12px",
                      fontSize: 13,
                      cursor: loggingIn ? "not-allowed" : "pointer",
                    }}
                  >
                    {loggingIn ? "Accesso..." : "Accedi"}
                  </button>
                </div>
              </div>
            </div>
          )
        ) : null}
      </header>

      <div
        ref={messagesContainerRef}
        style={{
          minHeight: 220,
          display: "grid",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: message.role === "user" ? "flex-end" : "flex-start",
              gap: 4,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--muted)",
              }}
            >
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
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  maxWidth: "85%",
                  padding: message.role === "user" ? "10px 12px" : 0,
                  borderRadius: message.role === "user" ? 5 : 0,
                  background: message.role === "user" ? "#797f88" : "transparent",
                  color: message.role === "user" ? "#ffffff" : "inherit",
                }}
              >
                {message.kind === "file" ? `[allegato] ${message.text}` : message.text}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
            Inizia una conversazione.
          </div>
        )}
      </div>

      <form
        className="chat-input-form"
        onSubmit={onSubmit}
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 100,
          width: "min(760px, calc(100% - 32px))",
          zIndex: 9999,
          display: "grid",
          gap: 10,
        }}
      >
        {profilingRequired && !customerProfile && (
          <div
            style={{
              border: "1px solid #d4d7dc",
              background: "#f8fafc",
              borderRadius: 10,
              padding: 12,
              display: "grid",
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 14 }}>Prima di iniziare: inserisci nome ed email</strong>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="text"
                value={profileNameInput}
                onChange={(event) => setProfileNameInput(event.target.value)}
                placeholder="Nome e cognome"
                style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "10px 12px", fontSize: 14 }}
              />
              <input
                type="email"
                value={profileEmailInput}
                onChange={(event) => setProfileEmailInput(event.target.value)}
                placeholder="email@dominio.com"
                style={{ borderRadius: 8, border: "1px solid #d4d7dc", padding: "10px 12px", fontSize: 14 }}
              />
              {profileError ? (
                <p style={{ margin: 0, color: "#b42318", fontSize: 12 }}>{profileError}</p>
              ) : (
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                  Questi dati servono per personalizzare la chat e inviare conferme appuntamenti.
                </p>
              )}
              <div>
                <button
                  type="button"
                  onClick={submitProfile}
                  style={{
                    borderRadius: 8,
                    border: "1px solid var(--ink)",
                    background: "var(--ink)",
                    color: "white",
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Inizia chat
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={{ position: "relative", width: "100%" }}>
          <textarea
            className="chat-input-textarea"
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={
              profilingRequired && !customerProfile
                ? "Inserisci prima nome ed email"
                : authRequired && !chatUserEmail
                ? "Accedi con email e password per iniziare"
                : "Hei Ciao chiedimi quello che vuoi!!!"
            }
            rows={3}
            disabled={(profilingRequired && !customerProfile) || (authRequired && !chatUserEmail)}
            style={{
              width: "100%",
              resize: "vertical",
              borderRadius: 10,
              border: "none",
              background: "#f1f4f8",
              padding: "12px 96px 12px 12px",
              fontSize: 14,
              outline: "none",
            }}
          />
          <input ref={fileInputRef} type="file" onChange={onSelectFile} disabled={uploading} style={{ display: "none" }} />
          <div
            style={{
              position: "absolute",
              right: 10,
              bottom: 8,
              display: "flex",
              gap: 6,
            }}
          >
            <button
              className="chat-input-icon-button chat-input-tooltip"
              data-tooltip="Allega file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Allega file"
              disabled={uploading}
              hidden={(profilingRequired && !customerProfile) || (authRequired && !chatUserEmail)}
              style={{
                borderRadius: "50%",
                border: "1px solid var(--ink)",
                background: "var(--ink)",
                color: "#ffffff",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              <svg className="chat-input-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M21.44 11.05L12.25 20.25a6 6 0 11-8.49-8.49l9.2-9.19a4 4 0 115.65 5.65l-9.2 9.2a2 2 0 11-2.83-2.83l8.49-8.48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className="chat-input-icon-button chat-input-tooltip"
              data-tooltip={loading ? "Invio in corso" : "Invia messaggio"}
              type="submit"
              disabled={loading}
              hidden={(profilingRequired && !customerProfile) || (authRequired && !chatUserEmail)}
              aria-label={loading ? "Invio in corso" : "Invia messaggio"}
              style={{
                borderRadius: "50%",
                border: "1px solid var(--ink)",
                background: "var(--ink)",
                color: "white",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? (
                "…"
              ) : (
                <svg className="chat-input-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M4 12L20 4l-4 16-4-6-8-2z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
