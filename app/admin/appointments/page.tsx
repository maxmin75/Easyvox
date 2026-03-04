"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type AppointmentItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  sessionId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  scheduledFor: string;
  timezone: string | null;
  notes: string | null;
  createdAt: string;
};

type AppointmentsResponse = {
  filters: { clientId: string | null };
  appointments: AppointmentItem[];
  error?: string;
};

export default function AdminAppointmentsPage() {
  const searchParams = useSearchParams();
  const queryClientId = searchParams.get("clientId") ?? "";
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Carica gli appuntamenti.");

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
    void loadAppointments();
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
      if (queryClientId) {
        setSelectedClientId(queryClientId);
      }
      setStatus(`Agenti disponibili: ${data.length}`);
    } catch {
      setStatus("Errore di rete nel caricamento agenti");
    } finally {
      setLoading(false);
    }
  }

  async function loadAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (selectedClientId) params.set("clientId", selectedClientId);
      const response = await fetch(`/api/admin/appointments?${params.toString()}`);
      const data = (await response.json()) as AppointmentsResponse;
      if (!response.ok) {
        setStatus(data.error ?? "Errore caricamento appuntamenti");
        return;
      }
      setAppointments(data.appointments ?? []);
      setStatus(
        data.filters.clientId
          ? `Appuntamenti per agente ${selectedClient?.slug ?? data.filters.clientId}`
          : "Appuntamenti di tutti gli agenti",
      );
    } catch {
      setStatus("Errore di rete nel caricamento appuntamenti");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Appuntamenti</h1>

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
            onClick={loadAppointments}
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
            Carica appuntamenti
          </button>
        </div>

        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status}
        </p>
      </section>

      <section className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead>
              <tr style={{ background: "#f6f8fb" }}>
                <th style={thStyle}>Data/Ora</th>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Contatto</th>
                <th style={thStyle}>Agente</th>
                <th style={thStyle}>Note</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, fontSize: 14, color: "var(--muted)" }}>
                    Nessun appuntamento da mostrare.
                  </td>
                </tr>
              ) : (
                appointments.map((item) => {
                  const when = new Date(item.scheduledFor).toLocaleString("it-IT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  });
                  return (
                    <tr key={item.id}>
                      <td style={tdStyle}>{when}</td>
                      <td style={tdStyle}>{item.fullName}</td>
                      <td style={tdStyle}>{item.email ?? item.phone ?? "-"}</td>
                      <td style={tdStyle}>
                        {item.clientName} <span className="mono">({item.clientSlug})</span>
                      </td>
                      <td style={tdStyle}>{item.notes || "-"}</td>
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
  padding: "10px 12px",
  borderBottom: "1px solid var(--line)",
  fontSize: 14,
  verticalAlign: "top",
};
