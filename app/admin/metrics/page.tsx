"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type MetricsResponse = {
  filters: { clientId: string | null };
  totals: {
    conversations: number;
    leads: number;
    feedback: number;
    documents: number;
    chunks: number;
  };
  byClient: Array<{
    id: string;
    name: string;
    slug: string;
    totals: {
      conversations: number;
      leads: number;
      feedback: number;
      documents: number;
      chunks: number;
    };
  }>;
  error?: string;
};

const EMPTY_METRICS: MetricsResponse["totals"] = {
  conversations: 0,
  leads: 0,
  feedback: 0,
  documents: 0,
  chunks: 0,
};

export default function AdminMetricsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [totals, setTotals] = useState<MetricsResponse["totals"]>(EMPTY_METRICS);
  const [byClient, setByClient] = useState<MetricsResponse["byClient"]>([]);
  const [status, setStatus] = useState("Carica gli agenti e poi le metriche.");
  const [loading, setLoading] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => null);
  }, []);

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

  async function loadMetrics() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClientId) params.set("clientId", selectedClientId);

      const response = await fetch(`/api/admin/metrics?${params.toString()}`);
      const data = (await response.json()) as MetricsResponse;

      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento metriche");
        return;
      }

      setTotals(data.totals);
      setByClient(data.byClient ?? []);
      setStatus(
        data.filters.clientId
          ? `Metriche per agente ${selectedClient?.slug ?? data.filters.clientId}`
          : "Metriche globali",
      );
    } catch {
      setStatus("Errore di rete durante caricamento metriche");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const cards = [
    { label: "Conversazioni", value: totals.conversations },
    { label: "Lead", value: totals.leads },
    { label: "Tiket", value: totals.feedback },
    { label: "Documenti", value: totals.documents },
    { label: "Mail inviate", value: totals.chunks },
  ];

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Admin Metrics</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Utente loggato: {userEmail || "caricamento..."}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
            onClick={loadMetrics}
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
            Carica metriche
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
        </div>
      </section>

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
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status}
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {cards.map((card) => (
          <article key={card.label} className="card" style={{ padding: 14, display: "grid", gap: 6 }}>
            <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>
              {card.label}
            </span>
            <strong style={{ fontSize: 28, lineHeight: 1 }}>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Dettaglio per agente</h2>
        {byClient.length === 0 ? (
          <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
            Nessun dato disponibile. Premi &quot;Carica metriche&quot; dopo aver chattato con un agente.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {byClient.map((client) => (
              <article
                key={client.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: 12,
                  display: "grid",
                  gap: 6,
                }}
              >
                <strong style={{ fontSize: 15 }}>{client.name}</strong>
                <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {client.slug}
                </span>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  Conversazioni: {client.totals.conversations} | Lead: {client.totals.leads} | Ticket:{" "}
                  {client.totals.feedback} | Documenti: {client.totals.documents} | Chunks: {client.totals.chunks}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
