"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
  assistantName: string | null;
  canTakeAppointments: boolean;
  systemPrompt: string | null;
  createdAt: string;
};

type KnowledgeDoc = {
  id: string;
  title: string;
  source: string | null;
  createdAt: string;
  chunkCount: number;
};

type AdminSettingsResponse = {
  settings: {
    aiProvider: "openai" | "ollama";
    hasOpenaiApiKey: boolean;
    openaiChatModel: string;
    openaiEmbeddingModel: string;
    ollamaBaseUrl: string | null;
    ollamaChatModel: string;
    ollamaEmbeddingModel: string;
    appBaseUrl: string | null;
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

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [ingestFile, setIngestFile] = useState<File | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDoc[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState("");
  const [savingClient, setSavingClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [canTakeAppointments, setCanTakeAppointments] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editAssistantName, setEditAssistantName] = useState("");
  const [editCanTakeAppointments, setEditCanTakeAppointments] = useState(true);
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [status, setStatus] = useState<string>("");
  const [agentTab, setAgentTab] = useState<"create" | "manage">("create");

  const [aiProvider, setAiProvider] = useState<"openai" | "ollama">("ollama");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiChatModel, setOpenaiChatModel] = useState("gpt-4o-mini");
  const [openaiEmbeddingModel, setOpenaiEmbeddingModel] = useState("text-embedding-3-small");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaChatModel, setOllamaChatModel] = useState("qwen2.5:7b");
  const [ollamaEmbeddingModel, setOllamaEmbeddingModel] = useState("nomic-embed-text");
  const [appBaseUrl, setAppBaseUrl] = useState("");
  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false);
  const [blobConfigured, setBlobConfigured] = useState(false);
  const [envOverrides, setEnvOverrides] = useState<AdminSettingsResponse["envOverrides"] | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => null);

    fetch("/api/admin/clients")
      .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus(data.error ?? "Errore nel caricamento agenti");
          return;
        }
        setClients(data);
        if (data.length > 0) {
          setSelectedClientId(data[0].id);
          setEditClientId(data[0].id);
          setEditName(data[0].name);
          setEditSlug(data[0].slug);
          setEditAssistantName(data[0].assistantName ?? "");
          setEditCanTakeAppointments(data[0].canTakeAppointments ?? true);
          setEditSystemPrompt(data[0].systemPrompt ?? "");
          void loadKnowledge(data[0].id);
        }
      })
      .catch(() => null);
  }, []);

  async function loadKnowledge(agentId: string) {
    if (!agentId) {
      setKnowledgeDocs([]);
      return;
    }

    setLoadingKnowledge(true);
    try {
      const response = await fetch(`/api/admin/knowledge?agentId=${encodeURIComponent(agentId)}`);
      const data = (await response.json()) as (KnowledgeDoc & { error?: string })[] | { error?: string };
      if (!response.ok) {
        const errorData = data as { error?: string };
        setStatus(errorData.error ?? "Errore caricamento memoria agente");
        return;
      }
      setKnowledgeDocs(data as KnowledgeDoc[]);
    } finally {
      setLoadingKnowledge(false);
    }
  }

  async function loadClients() {
    const response = await fetch("/api/admin/clients");
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Errore nel caricamento agenti");
      return;
    }

    setClients(data);
    if (!selectedClientId && data.length > 0) {
      setSelectedClientId(data[0].id);
      void loadKnowledge(data[0].id);
    }
    if (!editClientId && data.length > 0) {
      const first = data[0];
      setEditClientId(first.id);
      setEditName(first.name);
      setEditSlug(first.slug);
      setEditAssistantName(first.assistantName ?? "");
      setEditCanTakeAppointments(first.canTakeAppointments ?? true);
      setEditSystemPrompt(first.systemPrompt ?? "");
    }
    setStatus(`Agenti caricati: ${data.length}`);
  }

  async function createClient(event: FormEvent) {
    event.preventDefault();

    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        assistantName: assistantName.trim() || undefined,
        canTakeAppointments,
        systemPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Creazione agente fallita");
      return;
    }

    setName("");
    setSlug("");
    setAssistantName("");
    setCanTakeAppointments(true);
    setSystemPrompt("");
    setStatus(`Creato agente ${data.name}`);
    await loadClients();
  }

  function onSelectEditClient(id: string) {
    setEditClientId(id);
    const client = clients.find((item) => item.id === id);
    if (!client) return;
    setEditName(client.name);
    setEditSlug(client.slug);
    setEditAssistantName(client.assistantName ?? "");
    setEditCanTakeAppointments(client.canTakeAppointments ?? true);
    setEditSystemPrompt(client.systemPrompt ?? "");
  }

  function onSelectKnowledgeAgent(id: string) {
    setSelectedClientId(id);
    void loadKnowledge(id);
  }

  async function saveClientChanges(event: FormEvent) {
    event.preventDefault();
    if (!editClientId) {
      setStatus("Seleziona un agente da aggiornare");
      return;
    }

    setSavingClient(true);
    try {
      const response = await fetch("/api/admin/clients", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editClientId,
          name: editName,
          slug: editSlug,
          assistantName: editAssistantName.trim() || undefined,
          canTakeAppointments: editCanTakeAppointments,
          systemPrompt: editSystemPrompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Aggiornamento agente fallito");
        return;
      }
      setStatus(`Agente aggiornato: ${data.name}`);
      await loadClients();
    } finally {
      setSavingClient(false);
    }
  }

  async function deleteClient() {
    if (!editClientId) {
      setStatus("Seleziona un agente da cancellare");
      return;
    }
    if (!confirm("Confermi la cancellazione dell'agente selezionato?")) return;

    setDeletingClient(true);
    try {
      const response = await fetch(`/api/admin/clients?id=${encodeURIComponent(editClientId)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Cancellazione agente fallita");
        return;
      }

      setStatus("Agente cancellato");
      setEditClientId("");
      setEditName("");
      setEditSlug("");
      setEditAssistantName("");
      setEditCanTakeAppointments(true);
      setEditSystemPrompt("");
      await loadClients();
    } finally {
      setDeletingClient(false);
    }
  }

  async function importLegacyClients() {
    setImportingLegacy(true);
    try {
      const response = await fetch("/api/admin/clients/import-legacy", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Import agenti legacy fallito");
        return;
      }
      setStatus(data.message ?? "Import legacy completato");
      await loadClients();
    } finally {
      setImportingLegacy(false);
    }
  }

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
    setHasOpenaiApiKey(data.settings.hasOpenaiApiKey);
    setBlobConfigured(data.settings.blobConfigured);
    setEnvOverrides(data.envOverrides);
    setStatus("Impostazioni caricate");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        aiProvider,
        openaiApiKey: openaiApiKey.trim() || undefined,
        openaiChatModel,
        openaiEmbeddingModel,
        ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
        ollamaChatModel,
        ollamaEmbeddingModel,
        appBaseUrl: appBaseUrl.trim() || undefined,
      }),
    });

    const data = (await response.json()) as AdminSettingsResponse;
    if (!response.ok) {
      setStatus(data.error ?? "Errore nel salvataggio impostazioni");
      return;
    }

    setOpenaiApiKey("");
    setHasOpenaiApiKey(data.settings.hasOpenaiApiKey);
    setBlobConfigured(data.settings.blobConfigured);
    setEnvOverrides(data.envOverrides);
    setStatus("Impostazioni salvate");
  }

  async function ingestKnowledgeFile(event: FormEvent) {
    event.preventDefault();

    if (!selectedClientId) {
      setStatus("Seleziona prima un agente");
      return;
    }

    if (!ingestFile) {
      setStatus("Seleziona un file .txt o .md");
      return;
    }

    const formData = new FormData();
    formData.append("file", ingestFile);
    setIngesting(true);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "x-client-id": selectedClientId,
        },
        body: formData,
      });

      const raw = await response.text();
      const data = (raw ? JSON.parse(raw) : {}) as {
        documentId?: string;
        chunkCount?: number;
        provider?: "openai" | "ollama";
        error?: string;
      };

      if (!response.ok) {
        setStatus(data.error ?? "Errore ingest file");
        return;
      }

      setStatus(
        `Ingest completato: documento ${data.documentId}, chunk ${data.chunkCount}, provider ${data.provider}`,
      );
      setIngestFile(null);
      await loadKnowledge(selectedClientId);
    } catch {
      setStatus("Errore ingest: risposta non valida dal server");
    } finally {
      setIngesting(false);
    }
  }

  async function deleteKnowledgeDoc(documentId: string) {
    if (!selectedClientId) return;
    if (!confirm("Confermi la cancellazione di questo file dalla memoria dell'agente?")) return;

    setDeletingDocId(documentId);
    try {
      const response = await fetch(
        `/api/admin/knowledge?agentId=${encodeURIComponent(selectedClientId)}&documentId=${encodeURIComponent(documentId)}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Errore cancellazione file");
        return;
      }
      setStatus("File rimosso dalla memoria agente");
      await loadKnowledge(selectedClientId);
    } finally {
      setDeletingDocId("");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Admin Dashboard</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Utente loggato: {userEmail || "caricamento..."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={loadClients}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--ink)",
              background: "var(--ink)",
              color: "white",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Carica agenti
          </button>
          <button
            type="button"
            onClick={importLegacyClients}
            disabled={importingLegacy}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              cursor: importingLegacy ? "not-allowed" : "pointer",
            }}
          >
            {importingLegacy ? "Import in corso..." : "Importa agenti legacy"}
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
          <button
            type="button"
            onClick={loadSettings}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Carica impostazioni API
          </button>
          <Link
            href="/admin/email"
            style={{
              display: "inline-flex",
              alignItems: "center",
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            Automazione email
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Impostazioni API</h2>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          ENV ha priorita su DB. Per provider Ollama imposta base URL e modelli.
        </p>
        <form onSubmit={saveSettings} style={{ display: "grid", gap: 10 }}>
          <select
            value={aiProvider}
            onChange={(event) => setAiProvider(event.target.value as "openai" | "ollama")}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          >
            <option value="ollama">Ollama</option>
            <option value="openai">OpenAI</option>
          </select>

          <input
            type="url"
            placeholder="OLLAMA_BASE_URL (es. http://localhost:11434)"
            value={ollamaBaseUrl}
            onChange={(event) => setOllamaBaseUrl(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            required
            placeholder="Ollama chat model"
            value={ollamaChatModel}
            onChange={(event) => setOllamaChatModel(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            required
            placeholder="Ollama embedding model (es. nomic-embed-text)"
            value={ollamaEmbeddingModel}
            onChange={(event) => setOllamaEmbeddingModel(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
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
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            required
            placeholder="OpenAI chat model"
            value={openaiChatModel}
            onChange={(event) => setOpenaiChatModel(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            required
            placeholder="OpenAI embedding model"
            value={openaiEmbeddingModel}
            onChange={(event) => setOpenaiEmbeddingModel(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />

          <input
            type="url"
            placeholder="APP_BASE_URL (es. https://ai-chat-hub-nu.vercel.app)"
            value={appBaseUrl}
            onChange={(event) => setAppBaseUrl(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <button
            type="submit"
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "white",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Salva impostazioni API
          </button>
        </form>
        <div className="mono" style={{ fontSize: 12, color: "var(--muted)", display: "grid", gap: 4 }}>
          <div>Provider attivo: {aiProvider}</div>
          <div>OpenAI key configurata: {hasOpenaiApiKey ? "si" : "no"}</div>
          <div>ENV override provider: {envOverrides?.aiProvider ? "si" : "no"}</div>
          <div>ENV override OpenAI key: {envOverrides?.openaiApiKey ? "si" : "no"}</div>
          <div>ENV override chat model OpenAI: {envOverrides?.openaiChatModel ? "si" : "no"}</div>
          <div>
            ENV override embedding model OpenAI: {envOverrides?.openaiEmbeddingModel ? "si" : "no"}
          </div>
          <div>ENV override OLLAMA_BASE_URL: {envOverrides?.ollamaBaseUrl ? "si" : "no"}</div>
          <div>ENV override OLLAMA_CHAT_MODEL: {envOverrides?.ollamaChatModel ? "si" : "no"}</div>
          <div>
            ENV override OLLAMA_EMBEDDING_MODEL: {envOverrides?.ollamaEmbeddingModel ? "si" : "no"}
          </div>
          <div>ENV override APP_BASE_URL: {envOverrides?.appBaseUrl ? "si" : "no"}</div>
          <div>BLOB_READ_WRITE_TOKEN configurato (ENV): {blobConfigured ? "si" : "no"}</div>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Gestisci agente</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setAgentTab("create")}
            style={{
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: agentTab === "create" ? "var(--ink)" : "white",
              color: agentTab === "create" ? "white" : "var(--ink)",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Crea agente
          </button>
          <button
            type="button"
            onClick={() => setAgentTab("manage")}
            style={{
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: agentTab === "manage" ? "var(--ink)" : "white",
              color: agentTab === "manage" ? "white" : "var(--ink)",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Gestisci agente
          </button>
        </div>

        {agentTab === "create" ? (
          <form onSubmit={createClient} style={{ display: "grid", gap: 10 }}>
            <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
              Limite massimo: 3 agenti per utente.
            </p>
            <input
              required
              placeholder="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <input
              required
              placeholder="slug-esempio"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <input
              placeholder="Nome assistant (es. Sofia)"
              value={assistantName}
              onChange={(event) => setAssistantName(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <textarea
              placeholder="System prompt"
              value={systemPrompt}
              onChange={(event) => setSystemPrompt(event.target.value)}
              rows={4}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, resize: "vertical" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={canTakeAppointments}
                onChange={(event) => setCanTakeAppointments(event.target.checked)}
              />
              Abilita presa appuntamenti in chat
            </label>
            <button
              type="submit"
              style={{
                width: "fit-content",
                borderRadius: 10,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "white",
                padding: "8px 12px",
                cursor: "pointer",
              }}
            >
              Crea
            </button>
          </form>
        ) : (
          <form onSubmit={saveClientChanges} style={{ display: "grid", gap: 10 }}>
            <select
              value={editClientId}
              onChange={(event) => onSelectEditClient(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            >
              <option value="">Seleziona agente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.slug})
                </option>
              ))}
            </select>

            <input
              required
              placeholder="Nome"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <input
              required
              placeholder="slug"
              value={editSlug}
              onChange={(event) => setEditSlug(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <input
              placeholder="Nome assistant"
              value={editAssistantName}
              onChange={(event) => setEditAssistantName(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
            />
            <textarea
              placeholder="System prompt"
              rows={3}
              value={editSystemPrompt}
              onChange={(event) => setEditSystemPrompt(event.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, resize: "vertical" }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={editCanTakeAppointments}
                onChange={(event) => setEditCanTakeAppointments(event.target.checked)}
              />
              Abilita presa appuntamenti in chat
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={savingClient}
                style={{
                  width: "fit-content",
                  borderRadius: 10,
                  border: "1px solid var(--ink)",
                  background: "var(--ink)",
                  color: "white",
                  padding: "8px 12px",
                  cursor: savingClient ? "not-allowed" : "pointer",
                }}
              >
                {savingClient ? "Salvataggio..." : "Aggiorna agente"}
              </button>
              <button
                type="button"
                onClick={deleteClient}
                disabled={deletingClient || !editClientId}
                style={{
                  width: "fit-content",
                  borderRadius: 10,
                  border: "1px solid #8f2f2f",
                  background: "#8f2f2f",
                  color: "white",
                  padding: "8px 12px",
                  cursor: deletingClient || !editClientId ? "not-allowed" : "pointer",
                }}
              >
                {deletingClient ? "Cancellazione..." : "Cancella agente"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Knowledge Base (RAG)</h2>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Carica file `.txt` o `.md` sull&apos;agente selezionato. L&apos;AI usera questi contenuti per rispondere.
        </p>
        <form onSubmit={ingestKnowledgeFile} style={{ display: "grid", gap: 10 }}>
          <select
            value={selectedClientId}
            onChange={(event) => onSelectKnowledgeAgent(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          >
            <option value="">Seleziona agente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.slug})
              </option>
            ))}
          </select>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(event) => setIngestFile(event.target.files?.[0] ?? null)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, background: "white" }}
          />
          <button
            type="submit"
            disabled={ingesting}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--ink)",
              background: "var(--ink)",
              color: "white",
              padding: "8px 12px",
              cursor: ingesting ? "not-allowed" : "pointer",
            }}
          >
            {ingesting ? "Indicizzazione..." : "Carica e indicizza"}
          </button>
          <button
            type="button"
            onClick={() => loadKnowledge(selectedClientId)}
            disabled={loadingKnowledge || !selectedClientId}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              cursor: loadingKnowledge || !selectedClientId ? "not-allowed" : "pointer",
            }}
          >
            {loadingKnowledge ? "Aggiornamento..." : "Aggiorna memoria agente"}
          </button>
        </form>
        <div style={{ display: "grid", gap: 8 }}>
          {knowledgeDocs.length === 0 && (
            <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
              Nessun file in memoria per questo agente.
            </p>
          )}
          {knowledgeDocs.map((doc) => (
            <article
              key={doc.id}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 10,
                display: "grid",
                gap: 6,
              }}
            >
              <strong style={{ fontSize: 14 }}>{doc.title}</strong>
              <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                chunk: {doc.chunkCount} | source: {doc.source ?? "upload"} | {new Date(doc.createdAt).toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => deleteKnowledgeDoc(doc.id)}
                disabled={deletingDocId === doc.id}
                style={{
                  width: "fit-content",
                  borderRadius: 10,
                  border: "1px solid #8f2f2f",
                  background: "#8f2f2f",
                  color: "white",
                  padding: "6px 10px",
                  cursor: deletingDocId === doc.id ? "not-allowed" : "pointer",
                }}
              >
                {deletingDocId === doc.id ? "Rimozione..." : "Rimuovi file"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Agenti</h2>
        <p className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
          {status || "Nessuna azione eseguita"}
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {clients.map((client) => (
            <article key={client.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
              <strong>{client.name}</strong>
              <p className="mono" style={{ margin: "6px 0", fontSize: 12, color: "var(--muted)" }}>
                {client.id}
              </p>
              <p style={{ margin: 0, color: "var(--muted)" }}>slug: {client.slug}</p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                assistant: {client.assistantName?.trim() || "Assistant"}
              </p>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                appuntamenti chat: {client.canTakeAppointments ? "abilitati" : "disabilitati"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
