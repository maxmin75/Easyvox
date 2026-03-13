"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { BRAND_URL } from "@/lib/brand";

const MAX_SYSTEM_PROMPT_CHARS = 40000;

type AdminSettingsResponse = {
  settings: {
    aiProvider: "openai" | "ollama" | "local";
    hasOpenaiApiKey: boolean;
    openaiChatModel: string;
    openaiEmbeddingModel: string;
    ollamaBaseUrl: string | null;
    ollamaChatModel: string;
    ollamaEmbeddingModel: string;
    appBaseUrl: string | null;
    easyvoxSystemPrompt: string | null;
    blobConfigured: boolean;
  };
  envOverrides: {
    aiProvider: boolean;
    openaiApiKey: boolean;
    openaiChatModel: boolean;
    openaiEmbeddingModel: boolean;
    ollamaBaseUrl: boolean;
    ollamaChatModel: boolean;
    ollamaEmbeddingModel: boolean;
    appBaseUrl: boolean;
  };
  error?: string;
};

export default function SystemSettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [isEasyVoxAdmin, setIsEasyVoxAdmin] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [aiProvider, setAiProvider] = useState<"openai" | "ollama" | "local">("ollama");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiChatModel, setOpenaiChatModel] = useState("gpt-4o-mini");
  const [openaiEmbeddingModel, setOpenaiEmbeddingModel] = useState("text-embedding-3-small");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaChatModel, setOllamaChatModel] = useState("qwen3.5:0.8b");
  const [ollamaEmbeddingModel, setOllamaEmbeddingModel] = useState("nomic-embed-text");
  const [appBaseUrl, setAppBaseUrl] = useState("");
  const [easyvoxSystemPrompt, setEasyvoxSystemPrompt] = useState("");
  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
  const [blobConfigured, setBlobConfigured] = useState(false);
  const [envOverrides, setEnvOverrides] = useState<AdminSettingsResponse["envOverrides"] | null>(
    null,
  );

  async function loadSettings() {
    const response = await fetch("/api/admin/settings");
    const data = (await response.json()) as AdminSettingsResponse;
    if (!response.ok) {
      setStatus(data.error ?? "Errore nel caricamento impostazioni");
      return;
    }

    setAiProvider(data.settings.aiProvider);
    setOpenaiChatModel(data.settings.openaiChatModel);
    setOpenaiEmbeddingModel(data.settings.openaiEmbeddingModel);
    setOllamaBaseUrl(data.settings.ollamaBaseUrl ?? "http://localhost:11434");
    setOllamaChatModel(data.settings.ollamaChatModel);
    setOllamaEmbeddingModel(data.settings.ollamaEmbeddingModel);
    setAppBaseUrl(data.settings.appBaseUrl ?? "");
    setEasyvoxSystemPrompt(data.settings.easyvoxSystemPrompt ?? "");
    setHasOpenaiApiKey(data.settings.hasOpenaiApiKey);
    setBlobConfigured(data.settings.blobConfigured);
    setEnvOverrides(data.envOverrides);
    setStatus("Impostazioni di sistema caricate");
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null; isEasyVoxAdmin?: boolean }) => {
        if (data.user?.email) setUserEmail(data.user.email);
        setIsEasyVoxAdmin(Boolean(data.isEasyVoxAdmin));
      })
      .catch(() => null);

    const timer = window.setTimeout(() => {
      void loadSettings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!isEasyVoxAdmin) {
      setStatus("Permesso negato: solo admin EasyVox.");
      return;
    }
    setSavingSettings(true);
    try {
      const normalizedOllamaBaseUrl = normalizeUrlInput(ollamaBaseUrl);
      const normalizedAppBaseUrl = normalizeUrlInput(appBaseUrl);
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aiProvider,
          openaiApiKey: openaiApiKey.trim() || undefined,
          openaiChatModel,
          openaiEmbeddingModel,
          ollamaBaseUrl: normalizedOllamaBaseUrl,
          ollamaChatModel,
          ollamaEmbeddingModel,
          appBaseUrl: normalizedAppBaseUrl,
          easyvoxSystemPrompt: easyvoxSystemPrompt.trim() || null,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as AdminSettingsResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore nel salvataggio impostazioni");
        return;
      }

      setAiProvider(data.settings.aiProvider);
      setOpenaiApiKey("");
      setOpenaiChatModel(data.settings.openaiChatModel);
      setOpenaiEmbeddingModel(data.settings.openaiEmbeddingModel);
      setOllamaBaseUrl(data.settings.ollamaBaseUrl ?? "http://localhost:11434");
      setOllamaChatModel(data.settings.ollamaChatModel);
      setOllamaEmbeddingModel(data.settings.ollamaEmbeddingModel);
      setAppBaseUrl(data.settings.appBaseUrl ?? "");
      setEasyvoxSystemPrompt(data.settings.easyvoxSystemPrompt ?? "");
      setHasOpenaiApiKey(data.settings.hasOpenaiApiKey);
      setBlobConfigured(data.settings.blobConfigured);
      setEnvOverrides(data.envOverrides);
      setStatus("Impostazioni di sistema salvate");
    } catch {
      setStatus("Errore di rete nel salvataggio impostazioni");
    } finally {
      setSavingSettings(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Impostazioni di sistema</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Utente loggato: {userEmail || "caricamento..."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" style={linkNeutral}>Home admin</Link>
          <Link href="/admin/agents" style={linkNeutral}>Assistenti/Agenti</Link>
          <Link href="/admin/email" style={linkNeutral}>Email</Link>
          <Link href="/admin/appointments" style={linkNeutral}>Calendari</Link>
          <button type="button" onClick={() => void loadSettings()} style={buttonNeutral}>Ricarica impostazioni</button>
          <button type="button" onClick={logout} style={buttonNeutral}>Logout</button>
        </div>
      </section>

      {!isEasyVoxAdmin ? (
        <section className="card" style={{ padding: 16 }}>
          <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Area riservata all&apos;amministratore EasyVox. Come tenant puoi gestire agenti, CRM, chat e appuntamenti.
          </p>
        </section>
      ) : null}

      <section className="card" style={{ padding: 16, display: "grid", gap: 12, opacity: isEasyVoxAdmin ? 1 : 0.5 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>LLM / AI</h2>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          ENV ha priorita su DB. Per usare Ollama locale da Vercel imposta qui un URL Cloudflare pubblico.
        </p>
        <form onSubmit={saveSettings} style={{ display: "grid", gap: 10 }}>
          <select
            value={aiProvider}
            onChange={(event) => setAiProvider(event.target.value as "openai" | "ollama" | "local")}
            style={inputStyle}
          >
            <option value="ollama">Ollama</option>
            <option value="local">Local fine-tuned</option>
            <option value="openai">OpenAI</option>
          </select>

          <input
            type="url"
            placeholder="OLLAMA_BASE_URL (es. http://localhost:11434)"
            value={ollamaBaseUrl}
            onChange={(event) => setOllamaBaseUrl(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="Ollama chat model"
            value={ollamaChatModel}
            onChange={(event) => setOllamaChatModel(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="Ollama embedding model (es. nomic-embed-text)"
            value={ollamaEmbeddingModel}
            onChange={(event) => setOllamaEmbeddingModel(event.target.value)}
            style={inputStyle}
          />

          <input
            type="password"
            placeholder={
              hasOpenaiApiKey
                ? "OpenAI API Key (gia presente, inserisci solo per aggiornarla)"
                : "OpenAI API Key"
            }
            value={openaiApiKey}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="OpenAI chat model"
            value={openaiChatModel}
            onChange={(event) => setOpenaiChatModel(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="OpenAI embedding model"
            value={openaiEmbeddingModel}
            onChange={(event) => setOpenaiEmbeddingModel(event.target.value)}
            style={inputStyle}
          />

          <input
            type="url"
            placeholder={`APP_BASE_URL (es. ${BRAND_URL})`}
            value={appBaseUrl}
            onChange={(event) => setAppBaseUrl(event.target.value)}
            style={inputStyle}
          />
          <textarea
            id="easyvox-system-prompt"
            placeholder="Prompt di sistema EasyVox (chat senza tenant)"
            value={easyvoxSystemPrompt}
            onChange={(event) => setEasyvoxSystemPrompt(event.target.value)}
            rows={5}
            maxLength={MAX_SYSTEM_PROMPT_CHARS}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <div
            className="mono"
            style={{
              justifySelf: "end",
              fontSize: 11,
              color: easyvoxSystemPrompt.length > MAX_SYSTEM_PROMPT_CHARS * 0.9 ? "#b54708" : "var(--muted)",
            }}
          >
            {easyvoxSystemPrompt.length.toLocaleString("it-IT")} / {MAX_SYSTEM_PROMPT_CHARS.toLocaleString("it-IT")} caratteri
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <button type="submit" style={buttonPrimary} disabled={!isEasyVoxAdmin || savingSettings}>
              {savingSettings ? "Salvataggio..." : "Salva impostazioni AI/API"}
            </button>
            {savingSettings ? <span className="inline-spinner" aria-hidden="true" /> : null}
          </div>
        </form>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Stato sistema</h2>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 4 }}>
          <div>Provider attivo: {aiProvider}</div>
          <div>OpenAI key configurata: {hasOpenaiApiKey ? "si" : "no"}</div>
          <div>ENV override provider: {envOverrides?.aiProvider ? "si" : "no"}</div>
          <div>ENV override OpenAI key: {envOverrides?.openaiApiKey ? "si" : "no"}</div>
          <div>ENV override OLLAMA_BASE_URL: {envOverrides?.ollamaBaseUrl ? "si" : "no"}</div>
          <div>ENV override APP_BASE_URL: {envOverrides?.appBaseUrl ? "si" : "no"}</div>
          <div>BLOB_READ_WRITE_TOKEN configurato (ENV): {blobConfigured ? "si" : "no"}</div>
          <div>{status || "Nessuna azione eseguita"}</div>
        </div>
      </section>
    </main>
  );
}

const inputStyle = { border: "1px solid var(--line)", borderRadius: 10, padding: 10 };

const buttonPrimary = {
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "white",
  padding: "8px 12px",
  cursor: "pointer",
} as const;

const buttonNeutral = {
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  cursor: "pointer",
} as const;

const linkNeutral = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  textDecoration: "none",
  color: "inherit",
} as const;

function normalizeUrlInput(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}
