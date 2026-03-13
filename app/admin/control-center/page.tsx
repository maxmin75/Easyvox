"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ControlUser = {
  id: string;
  email: string;
  name: string | null;
  planTier: "FREE" | "PLUS";
  plusPurchasedAt: string | null;
  createdAt: string;
  _count: {
    clients: number;
    sessions: number;
  };
};

type ControlPurchase = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  message: string | null;
  createdAt: string;
  purchaseIntentDetectedAt: string | null;
  purchaseEmailSentAt: string | null;
  purchaseEmailError: string | null;
  client: {
    id: string;
    name: string;
    slug: string;
    owner: { email: string } | null;
  };
};

type ControlClient = {
  id: string;
  name: string;
  slug: string;
  assistantName: string | null;
  canTakeAppointments: boolean;
  requireProfiling: boolean;
  createdAt: string;
  owner: { email: string } | null;
  _count: {
    documents: number;
    chunks: number;
    conversations: number;
    leads: number;
    appointments: number;
  };
  quickLinks: {
    demoChat: string;
    adminAgents: string;
  };
};

type ControlCenterResponse = {
  totals?: {
    users: number;
    plusUsers: number;
    tenants: number;
    purchaseIntents: number;
  };
  users: ControlUser[];
  purchases: ControlPurchase[];
  clients: ControlClient[];
  error?: string;
};

function fmt(date: string | null | undefined): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("it-IT");
}

export default function AdminControlCenterPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [users, setUsers] = useState<ControlUser[]>([]);
  const [purchases, setPurchases] = useState<ControlPurchase[]>([]);
  const [clients, setClients] = useState<ControlClient[]>([]);
  const [plusUsers, setPlusUsers] = useState(0);

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(
    () => ({
      users: users.length,
      purchases: purchases.length,
      clients: clients.length,
      plusUsers,
    }),
    [users.length, purchases.length, clients.length, plusUsers],
  );

  async function loadData() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/control-center");
      const data = (await response.json()) as ControlCenterResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore durante il caricamento.");
        return;
      }
      setUsers(data.users ?? []);
      setPurchases(data.purchases ?? []);
      setClients(data.clients ?? []);
      setPlusUsers(data.totals?.plusUsers ?? 0);
    } catch {
      setStatus("Errore di rete.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 16 }}>
      <header className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>EasyVox Admin Control Center</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Gestione centralizzata utenti registrati, acquisti e aree clienti.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" style={linkStyle}>
            Dashboard admin
          </Link>
          <Link href="/admin/agents" style={linkStyle}>
            Formazione AI/Agenti
          </Link>
          <button type="button" onClick={loadData} style={buttonStyle}>
            {loading ? "Aggiornamento..." : "Aggiorna dati"}
          </button>
          <button type="button" onClick={logout} style={buttonStyle}>
            Logout
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <article className="card" style={{ padding: 14 }}>
          <p style={metricLabelStyle}>Utenti registrati</p>
          <strong style={metricValueStyle}>{totals.users}</strong>
        </article>
        <article className="card" style={{ padding: 14 }}>
          <p style={metricLabelStyle}>Acquisti/Intenti</p>
          <strong style={metricValueStyle}>{totals.purchases}</strong>
        </article>
        <article className="card" style={{ padding: 14 }}>
          <p style={metricLabelStyle}>Clienti/Agenti</p>
          <strong style={metricValueStyle}>{totals.clients}</strong>
        </article>
        <article className="card" style={{ padding: 14 }}>
          <p style={metricLabelStyle}>Utenti Plus</p>
          <strong style={metricValueStyle}>{totals.plusUsers}</strong>
        </article>
      </section>

      {status ? (
        <p className="card" style={{ margin: 0, padding: 12, borderColor: "#fca5a5" }}>
          {status}
        </p>
      ) : null}

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Utenti registrati</h2>
        {users.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>Nessun utente trovato.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Creato il</th>
                  <th style={thStyle}>Piano</th>
                  <th style={thStyle}>Clienti</th>
                  <th style={thStyle}>Sessioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td style={tdStyle}>{user.email}</td>
                    <td style={tdStyle}>{user.name || "-"}</td>
                    <td style={tdStyle}>{fmt(user.createdAt)}</td>
                    <td style={tdStyle}>
                      {user.planTier}
                      {user.plusPurchasedAt ? ` (${fmt(user.plusPurchasedAt)})` : ""}
                    </td>
                    <td style={tdStyle}>{user._count.clients}</td>
                    <td style={tdStyle}>{user._count.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Acquisti / richieste attivazione</h2>
        {purchases.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>Nessun acquisto rilevato.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Contatto</th>
                  <th style={thStyle}>Messaggio</th>
                  <th style={thStyle}>Intento</th>
                  <th style={thStyle}>Email inviata</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td style={tdStyle}>
                      <strong>{purchase.client.name}</strong>
                      <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12 }}>{purchase.client.slug}</p>
                    </td>
                    <td style={tdStyle}>
                      <p style={{ margin: 0 }}>{purchase.name}</p>
                      <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12 }}>
                        {purchase.email || "-"} {purchase.phone ? `| ${purchase.phone}` : ""}
                      </p>
                    </td>
                    <td style={tdStyle}>{purchase.message?.slice(0, 150) || "-"}</td>
                    <td style={tdStyle}>{fmt(purchase.purchaseIntentDetectedAt)}</td>
                    <td style={tdStyle}>{purchase.purchaseEmailError ? `Errore: ${purchase.purchaseEmailError}` : fmt(purchase.purchaseEmailSentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Aree clienti</h2>
        {clients.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>Nessun cliente creato.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {clients.map((client) => (
              <article key={client.id} style={clientCardStyle}>
                <div style={{ display: "grid", gap: 4 }}>
                  <strong>{client.name}</strong>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                    slug: {client.slug} | owner: {client.owner?.email || "-"}
                  </p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                    assistant: {client.assistantName || "Assistant"} | appuntamenti:{" "}
                    {client.canTakeAppointments ? "si" : "no"} | profilazione: {client.requireProfiling ? "si" : "no"}
                  </p>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                    docs: {client._count.documents} | chunk: {client._count.chunks} | chat: {client._count.conversations} |
                    lead: {client._count.leads} | app: {client._count.appointments}
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <Link href={client.quickLinks.adminAgents} style={linkStyle}>
                    Ripara/Forma agente
                  </Link>
                  <Link href={client.quickLinks.demoChat} style={linkStyle} target="_blank">
                    Apri chat pubblica
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 760,
} as const;

const thStyle = {
  textAlign: "left" as const,
  fontSize: 12,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  borderBottom: "1px solid var(--line)",
  padding: "8px 10px",
};

const tdStyle = {
  borderBottom: "1px solid var(--line)",
  padding: "8px 10px",
  verticalAlign: "top" as const,
};

const buttonStyle = {
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  cursor: "pointer",
} as const;

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  textDecoration: "none",
  color: "inherit",
} as const;

const metricLabelStyle = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase" as const,
  color: "var(--muted)",
} as const;

const metricValueStyle = {
  fontSize: 26,
} as const;

const clientCardStyle = {
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 12,
  display: "grid",
  gap: 10,
  background: "white",
} as const;
