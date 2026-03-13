"use client";

import { useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
};

type CrmContact = {
  clientId: string;
  clientName: string;
  clientSlug: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  productInterest: string | null;
  interestType: string | null;
  city: string | null;
  lastMessage: string | null;
  interactionCount: number;
  sessionsCount: number;
  firstInteractionAt: string;
  lastInteractionAt: string;
};

type CrmResponse = {
  filters: { clientId: string | null };
  contacts: CrmContact[];
  error?: string;
};

export default function AdminCrmPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Caricamento CRM globale...");

  useEffect(() => {
    // Initial CRM view should open already populated in global mode.
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadClients() {
    const response = await fetch("/api/admin/clients");
    const data = (await response.json()) as Client[] & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Errore caricamento agenti");
    }
    setClients(data);
    return data;
  }

  async function loadCrm(clientId?: string) {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);

    const response = await fetch(`/api/admin/crm${params.toString() ? `?${params.toString()}` : ""}`);
    const data = (await response.json()) as CrmResponse;

    if (!response.ok) {
      throw new Error(data.error ?? "Errore caricamento CRM");
    }

    setContacts(data.contacts ?? []);
    setStatus(data.filters.clientId ? "CRM filtrato per agente" : "CRM globale caricato");
    return data;
  }

  async function loadInitialData() {
    setLoading(true);
    try {
      const [loadedClients, loadedCrm] = await Promise.all([loadClients(), loadCrm()]);
      setStatus(
        loadedCrm.contacts.length > 0
          ? `CRM globale caricato. Contatti visibili: ${loadedCrm.contacts.length}. Agenti disponibili: ${loadedClients.length}`
          : `CRM globale caricato. Nessun contatto trovato. Agenti disponibili: ${loadedClients.length}`,
      );
    } catch {
      setStatus("Errore di rete durante caricamento CRM");
    } finally {
      setLoading(false);
    }
  }

  async function refreshClients() {
    setLoading(true);
    try {
      const data = await loadClients();
      setStatus(`Agenti disponibili: ${data.length}`);
    } catch {
      setStatus("Errore di rete durante caricamento agenti");
    } finally {
      setLoading(false);
    }
  }

  async function refreshCrm() {
    setLoading(true);
    try {
      await loadCrm(selectedClientId || undefined);
    } catch {
      setStatus("Errore di rete durante caricamento CRM");
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const interactions = contacts.reduce((sum, item) => sum + item.interactionCount, 0);
    return { contacts: contacts.length, interactions };
  }, [contacts]);

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>CRM</h1>

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
            onClick={refreshClients}
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
            onClick={refreshCrm}
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
            Carica CRM
          </button>
        </div>

        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status}
        </p>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 4 }}>
        <strong>Riepilogo</strong>
        <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
          Contatti: {totals.contacts} | Interazioni: {totals.interactions}
        </span>
      </section>

      {contacts.length > 0 ? (
        <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
          <strong>Nomi che stanno interagendo</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {contacts.slice(0, 24).map((contact, index) => (
              <span
                key={`${contact.clientId}-${contact.email ?? contact.name}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "rgba(15, 23, 42, 0.04)",
                  padding: "6px 10px",
                  fontSize: 12,
                }}
              >
                {contact.name}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {contacts.length === 0 ? (
        <section className="card" style={{ padding: 16 }}>
          <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Nessun contatto CRM disponibile.
          </p>
        </section>
      ) : (
        <section className="card" style={{ padding: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1320 }}>
            <thead>
              <tr>
                {[
                  "Agente",
                  "Nome completo",
                  "Nome",
                  "Cognome",
                  "Email",
                  "Telefono",
                  "Prodotto",
                  "Tipo interesse",
                  "Citta",
                  "Sito",
                  "Interazioni",
                  "Sessioni",
                  "Prima interazione",
                  "Ultima interazione",
                  "Ultimo messaggio",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid var(--line)",
                      padding: "8px 6px",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, index) => (
                <tr key={`${contact.clientId}-${contact.name}-${contact.email ?? index}`}>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.clientName} ({contact.clientSlug})
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.name}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.firstName ?? "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.lastName ?? "-"}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {contact.email ?? "-"}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {contact.phone ?? "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.productInterest ?? "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.interestType ?? "-"}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13 }}>
                    {contact.city ?? "-"}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {contact.website ?? "-"}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {contact.interactionCount}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {contact.sessionsCount}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {new Date(contact.firstInteractionAt).toLocaleString("it-IT")}
                  </td>
                  <td className="mono" style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 12 }}>
                    {new Date(contact.lastInteractionAt).toLocaleString("it-IT")}
                  </td>
                  <td style={{ borderBottom: "1px solid var(--line)", padding: "8px 6px", fontSize: 13, maxWidth: 260 }}>
                    {contact.lastMessage?.trim() ? contact.lastMessage : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
