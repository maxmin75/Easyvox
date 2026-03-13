"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type QuoteItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  sessionId: string | null;
  customerName: string;
  company: string;
  city: string;
  email: string;
  phone: string;
  support: string;
  aiType: string;
  training: string;
  customizations: string | null;
  setupInitial: number;
  monthlyCost: number;
  trainingCost: number;
  emailSentToCustomer: boolean;
  emailSentToInternal: boolean;
  emailError: string | null;
  createdAt: string;
};

type QuotesResponse = {
  filters: { clientId: string | null };
  quotes: QuoteItem[];
  error?: string;
};

export default function AdminQuotesPage() {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId") ?? "";
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carica i preventivi.");

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  useEffect(() => {
    void loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!queryClientId) return;
    setSelectedClientId(queryClientId);
  }, [queryClientId]);

  useEffect(() => {
    if (!selectedClientId) return;
    void loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId]);

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
      if (queryClientId) setSelectedClientId(queryClientId);
      setStatus(`Agenti disponibili: ${data.length}`);
    } catch {
      setStatus("Errore di rete nel caricamento agenti");
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotes() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (selectedClientId) params.set("clientId", selectedClientId);
      const response = await fetch(`/api/admin/quotes?${params.toString()}`);
      const data = (await response.json()) as QuotesResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento preventivi");
        return;
      }
      setQuotes(data.quotes ?? []);
      setStatus(
        data.filters.clientId
          ? `Preventivi per agente ${selectedClient?.slug ?? data.filters.clientId}`
          : "Preventivi di tutti gli agenti",
      );
    } catch {
      setStatus("Errore di rete nel caricamento preventivi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Preventivi</h1>

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
            style={secondaryButtonStyle(loading)}
          >
            Carica agenti
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={loadQuotes}
            style={primaryButtonStyle(loading)}
          >
            Carica preventivi
          </button>
        </div>

        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status}
        </p>
      </section>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1320 }}>
            <thead>
              <tr style={{ background: "#f6f8fb" }}>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Contatti</th>
                <th style={thStyle}>Configurazione</th>
                <th style={thStyle}>Costi</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Agente</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, fontSize: 14, color: "var(--muted)" }}>
                    Nessun preventivo da mostrare.
                  </td>
                </tr>
              ) : (
                quotes.map((item) => {
                  const when = new Date(item.createdAt).toLocaleString("it-IT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>{when}</td>
                      <td style={tdStyle}>
                        <strong>{item.customerName}</strong>
                        <div>{item.company}</div>
                        <div className="mono" style={{ fontSize: 12 }}>{item.city}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>{item.email}</div>
                        <div>{item.phone}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>Supporto: {item.support}</div>
                        <div>AI: {item.aiType}</div>
                        <div>Addestramento: {item.training}</div>
                        <div>Custom: {item.customizations || "su richiesta"}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>Setup: EUR {item.setupInitial}</div>
                        <div>Addestramento: EUR {item.trainingCost}</div>
                        <div>
                          Mensile: {item.monthlyCost > 0 ? `EUR ${item.monthlyCost}` : "locale cliente"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div>Cliente: {item.emailSentToCustomer ? "inviata" : "no"}</div>
                        <div>Interna: {item.emailSentToInternal ? "inviata" : "no"}</div>
                        <div style={{ color: item.emailError ? "#b42318" : "inherit" }}>
                          {item.emailError || "-"}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {item.clientName} <span className="mono">({item.clientSlug})</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid var(--line)",
  fontSize: 12,
  color: "var(--muted)",
};

const tdStyle: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid var(--line)",
  fontSize: 14,
  verticalAlign: "top",
};

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: "fit-content",
    borderRadius: 10,
    border: "1px solid var(--ink)",
    background: "var(--ink)",
    color: "white",
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function secondaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    width: "fit-content",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "white",
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
