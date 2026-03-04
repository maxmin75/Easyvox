"use client";

import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type ChatSession = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  sessionId: string;
  startedAt: string;
  lastMessageAt: string;
  messages: Array<{
    id: string;
    createdAt: string;
    userMessage: string;
    assistantMessage: string;
  }>;
  files: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }>;
  appointments: Array<{
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    scheduledFor: string;
    createdAt: string;
  }>;
  crmContacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    createdAt: string;
  }>;
};

type ChatArchiveResponse = {
  filters: { clientId: string | null };
  sessions: ChatSession[];
  error?: string;
};

export default function AdminChatsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carica archivio chat.");

  useEffect(() => {
    void loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/clients");
      const data = (await response.json()) as Client[] & { error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento agenti");
        return;
      }
      setClients(data);
      setStatus(`Agenti disponibili: ${data.length}`);
    } catch {
      setStatus("Errore di rete durante caricamento agenti");
    } finally {
      setLoading(false);
    }
  }

  async function loadArchive() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sessionLimit: "25" });
      if (selectedClientId) params.set("clientId", selectedClientId);

      const response = await fetch(`/api/admin/chats?${params.toString()}`);
      const data = (await response.json()) as ChatArchiveResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento archivio chat");
        return;
      }
      setSessions(data.sessions ?? []);
      setStatus(
        data.filters.clientId ? "Archivio chat filtrato per agente" : "Archivio chat globale caricato",
      );
    } catch {
      setStatus("Errore di rete durante caricamento archivio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Archivio Chat</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <label className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          Filtra per agente (opzionale)
        </label>
        <select
          value={selectedClientId}
          onChange={(event) => setSelectedClientId(event.target.value)}
          style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
        >
          <option value="">Tutti gli agenti</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.slug})
            </option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={loading}
            onClick={loadClients}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "white",
              padding: "8px 12px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Carica agenti
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={loadArchive}
            style={{
              width: "fit-content",
              borderRadius: 10,
              border: "1px solid var(--ink)",
              background: "var(--ink)",
              color: "white",
              padding: "8px 12px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Carica archivio
          </button>
        </div>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status}
        </p>
      </section>

      {sessions.length === 0 ? (
        <section className="card" style={{ padding: 16 }}>
          <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Nessuna chat disponibile. Premi &quot;Carica archivio&quot;.
          </p>
        </section>
      ) : (
        sessions.map((session) => (
          <section key={`${session.clientId}:${session.sessionId}`} className="card" style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong>
                {session.clientName} ({session.clientSlug})
              </strong>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                Sessione: {session.sessionId}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                Da {new Date(session.startedAt).toLocaleString("it-IT")} a{" "}
                {new Date(session.lastMessageAt).toLocaleString("it-IT")}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <strong style={{ fontSize: 13 }}>Messaggi</strong>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {session.messages.map((message) => (
                    <article key={message.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                        {new Date(message.createdAt).toLocaleString("it-IT")}
                      </div>
                      <div style={{ fontSize: 14, marginBottom: 6 }}>
                        <strong>Utente:</strong> {message.userMessage}
                      </div>
                      <div style={{ fontSize: 14 }}>
                        <strong>Assistant:</strong> {message.assistantMessage}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 13 }}>Allegati ({session.files.length})</strong>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, display: "grid", gap: 3 }}>
                  {session.files.length === 0 ? (
                    <span>Nessun allegato.</span>
                  ) : (
                    session.files.map((file) => (
                      <span key={file.id}>
                        - {file.filename} ({Math.round(file.sizeBytes / 1024)} KB)
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 13 }}>Appuntamenti ({session.appointments.length})</strong>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, display: "grid", gap: 3 }}>
                  {session.appointments.length === 0 ? (
                    <span>Nessun appuntamento.</span>
                  ) : (
                    session.appointments.map((appointment) => (
                      <span key={appointment.id}>
                        - {appointment.fullName} |{" "}
                        {new Date(appointment.scheduledFor).toLocaleString("it-IT", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}{" "}
                        | {appointment.email ?? appointment.phone ?? "-"}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 13 }}>Dati CRM riconosciuti ({session.crmContacts.length})</strong>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, display: "grid", gap: 3 }}>
                  {session.crmContacts.length === 0 ? (
                    <span>Nessun dato CRM riconosciuto.</span>
                  ) : (
                    session.crmContacts.map((contact) => (
                      <span key={contact.id}>
                        - {contact.name} | {contact.email ?? "-"} | {contact.phone ?? "-"} | {contact.website ?? "-"}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ))
      )}
    </main>
  );
}
