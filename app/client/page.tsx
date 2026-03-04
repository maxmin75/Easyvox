"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type TenantItem = {
  id: string;
  name: string;
  slug: string;
  isOwner: boolean;
  requireUserAuthForChat: boolean;
};

type TenantUsersResponse = {
  items: Array<{
    userId: string;
    email: string;
    role: "OWNER" | "MEMBER";
    addedAt: string;
    userCreatedAt: string;
    lastChatLoginAt: string | null;
    activeSessions: number;
  }>;
  error?: string;
};

type AiSettingsResponse = {
  saved: {
    aiProvider: "openai" | "ollama" | null;
    hasOpenaiApiKey: boolean;
    openaiChatModel: string | null;
    openaiEmbeddingModel: string | null;
    ollamaBaseUrl: string | null;
    ollamaChatModel: string | null;
    ollamaEmbeddingModel: string | null;
    updatedAt: string | null;
  };
  effective: {
    aiProvider: "openai" | "ollama";
    hasOpenaiApiKey: boolean;
    openaiChatModel: string;
    openaiEmbeddingModel: string;
    ollamaBaseUrl: string | null;
    ollamaChatModel: string;
    ollamaEmbeddingModel: string;
  };
  error?: string;
};

export default function ClientHomePage() {
  const [userEmail, setUserEmail] = useState("");
  const [status, setStatus] = useState("");
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [members, setMembers] = useState<TenantUsersResponse["items"]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const [aiProvider, setAiProvider] = useState<"openai" | "ollama">("openai");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiChatModel, setOpenaiChatModel] = useState("gpt-4o-mini");
  const [openaiEmbeddingModel, setOpenaiEmbeddingModel] = useState("text-embedding-3-small");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaChatModel, setOllamaChatModel] = useState("qwen2.5:7b");
  const [ollamaEmbeddingModel, setOllamaEmbeddingModel] = useState("nomic-embed-text");
  const [hasSavedOpenaiKey, setHasSavedOpenaiKey] = useState(false);
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedClientId) ?? null,
    [selectedClientId, tenants],
  );

  const loadTenants = useCallback(async () => {
    const response = await fetch("/api/client/tenants");
    const data = (await response.json()) as { items?: TenantItem[]; error?: string };
    if (!response.ok) {
      setStatus(data.error ?? "Errore caricamento tenant");
      return;
    }
    const items = data.items ?? [];
    setTenants(items);
    if (items.length > 0) {
      setSelectedClientId((current) => current || items[0].id);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => null);

    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    if (!selectedClientId) return;
    void loadAiSettings(selectedClientId);
    if (selectedTenant?.isOwner) {
      void loadMembers(selectedClientId);
    } else {
      setMembers([]);
    }
  }, [selectedClientId, selectedTenant?.isOwner]);

  async function loadMembers(clientId: string) {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/client/users?clientId=${encodeURIComponent(clientId)}`);
      const data = (await response.json()) as TenantUsersResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento utenti tenant");
        return;
      }
      setMembers(data.items ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadAiSettings(clientId: string) {
    const response = await fetch(`/api/client/ai-settings?clientId=${encodeURIComponent(clientId)}`);
    const data = (await response.json()) as AiSettingsResponse;
    if (!response.ok) {
      setStatus(data.error ?? "Errore caricamento impostazioni AI");
      return;
    }

    setAiProvider(data.saved.aiProvider ?? data.effective.aiProvider);
    setOpenaiChatModel(data.saved.openaiChatModel ?? data.effective.openaiChatModel);
    setOpenaiEmbeddingModel(data.saved.openaiEmbeddingModel ?? data.effective.openaiEmbeddingModel);
    setOllamaBaseUrl(data.saved.ollamaBaseUrl ?? data.effective.ollamaBaseUrl ?? "http://localhost:11434");
    setOllamaChatModel(data.saved.ollamaChatModel ?? data.effective.ollamaChatModel);
    setOllamaEmbeddingModel(data.saved.ollamaEmbeddingModel ?? data.effective.ollamaEmbeddingModel);
    setHasSavedOpenaiKey(data.saved.hasOpenaiApiKey);
    setOpenaiApiKey("");
  }

  async function saveAiSettings(event: FormEvent) {
    event.preventDefault();
    if (!selectedClientId) return;

    setSavingAiSettings(true);
    try {
      const response = await fetch("/api/client/ai-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          aiProvider,
          openaiApiKey: openaiApiKey.trim() || undefined,
          openaiChatModel,
          openaiEmbeddingModel,
          ollamaBaseUrl: ollamaBaseUrl.trim() || undefined,
          ollamaChatModel,
          ollamaEmbeddingModel,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Errore salvataggio impostazioni AI");
        return;
      }
      setStatus("Impostazioni AI personali aggiornate.");
      setOpenaiApiKey("");
      await loadAiSettings(selectedClientId);
    } finally {
      setSavingAiSettings(false);
    }
  }

  async function addTenantUser(event: FormEvent) {
    event.preventDefault();
    if (!selectedClientId) return;

    setAddingUser(true);
    try {
      const response = await fetch("/api/client/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          email: newUserEmail.trim(),
          password: newUserPassword,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Errore creazione utente tenant");
        return;
      }
      setNewUserEmail("");
      setNewUserPassword("");
      setStatus("Utente tenant creato/abilitato.");
      await loadMembers(selectedClientId);
    } finally {
      setAddingUser(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Area Clienti</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Account attivo: {userEmail || "caricamento..."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void loadTenants()} style={quickButtonStyle}>Ricarica tenant</button>
          <button type="button" onClick={logout} style={quickButtonStyle}>Logout</button>
          <Link href="/client/profile-settings" style={quickLinkStyle}>Impostazioni Profilo</Link>
          <Link href="/demo" style={quickLinkStyle}>Apri chat demo</Link>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Seleziona Tenant</h2>
        <select
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
          style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
        >
          <option value="">Seleziona</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name} ({tenant.slug}){tenant.isOwner ? " - owner" : ""}
            </option>
          ))}
        </select>
        {selectedTenant ? (
          <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Login chat richiesto: {selectedTenant.requireUserAuthForChat ? "si" : "no"}
          </p>
        ) : null}
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Le tue impostazioni AI (personali)</h2>
        <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
          Default: impostazioni di sistema. Qui puoi fare override solo per il tuo utente in questo tenant.
        </p>
        <form onSubmit={saveAiSettings} style={{ display: "grid", gap: 10 }}>
          <select
            value={aiProvider}
            onChange={(event) => setAiProvider(event.target.value as "openai" | "ollama")}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          >
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama</option>
          </select>
          <input
            type="password"
            placeholder={hasSavedOpenaiKey ? "OpenAI API key (gia salvata, aggiorna se necessario)" : "OpenAI API key"}
            value={openaiApiKey}
            onChange={(event) => setOpenaiApiKey(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            value={openaiChatModel}
            onChange={(event) => setOpenaiChatModel(event.target.value)}
            placeholder="OpenAI chat model"
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            value={openaiEmbeddingModel}
            onChange={(event) => setOpenaiEmbeddingModel(event.target.value)}
            placeholder="OpenAI embedding model"
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            value={ollamaBaseUrl}
            onChange={(event) => setOllamaBaseUrl(event.target.value)}
            placeholder="Ollama base URL"
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            value={ollamaChatModel}
            onChange={(event) => setOllamaChatModel(event.target.value)}
            placeholder="Ollama chat model"
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <input
            value={ollamaEmbeddingModel}
            onChange={(event) => setOllamaEmbeddingModel(event.target.value)}
            placeholder="Ollama embedding model"
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
          <button
            type="submit"
            disabled={!selectedClientId || savingAiSettings}
            style={quickButtonStyle}
          >
            {savingAiSettings ? "Salvataggio..." : "Salva impostazioni personali"}
          </button>
        </form>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Utenti del Tenant</h2>
        {selectedTenant?.isOwner ? (
          <>
            <form onSubmit={addTenantUser} style={{ display: "grid", gap: 10 }}>
              <input
                type="email"
                required
                placeholder="email utente"
                value={newUserEmail}
                onChange={(event) => setNewUserEmail(event.target.value)}
                style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
              />
              <input
                type="password"
                required
                minLength={8}
                placeholder="password iniziale"
                value={newUserPassword}
                onChange={(event) => setNewUserPassword(event.target.value)}
                style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
              />
              <button
                type="submit"
                disabled={!selectedClientId || addingUser}
                style={quickButtonStyle}
              >
                {addingUser ? "Creazione..." : "Aggiungi utente tenant"}
              </button>
            </form>
            <button
              type="button"
              onClick={() => selectedClientId && void loadMembers(selectedClientId)}
              disabled={!selectedClientId || loadingUsers}
              style={quickButtonStyle}
            >
              {loadingUsers ? "Aggiornamento..." : "Aggiorna accessi utenti"}
            </button>
            <div style={{ display: "grid", gap: 8 }}>
              {members.length === 0 ? (
                <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                  Nessun utente associato a questo tenant.
                </p>
              ) : (
                members.map((member) => (
                  <article key={member.userId} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
                    <strong>{member.email}</strong>
                    <p className="mono" style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      ruolo: {member.role} | sessioni attive: {member.activeSessions}
                    </p>
                    <p className="mono" style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      ultimo login chat:{" "}
                      {member.lastChatLoginAt ? new Date(member.lastChatLoginAt).toLocaleString("it-IT") : "mai"}
                    </p>
                  </article>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            Solo l&apos;owner del tenant puo gestire utenti e vedere lo storico accessi.
          </p>
        )}
      </section>

      <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
        {status || "Pronto"}
      </p>
    </main>
  );
}

const quickLinkStyle = {
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

const quickButtonStyle = {
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  cursor: "pointer",
} as const;
