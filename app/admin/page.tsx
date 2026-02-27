"use client";

import { FormEvent, useState } from "react";

type Client = {
  id: string;
  name: string;
  slug: string;
  systemPrompt: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const [adminSecret, setAdminSecret] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [status, setStatus] = useState<string>("");

  async function loadClients() {
    const response = await fetch("/api/admin/clients", {
      headers: { "x-admin-secret": adminSecret },
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Errore nel caricamento");
      return;
    }

    setClients(data);
    setStatus(`Client caricati: ${data.length}`);
  }

  async function createClient(event: FormEvent) {
    event.preventDefault();

    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": adminSecret,
      },
      body: JSON.stringify({ name, slug, systemPrompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error ?? "Creazione fallita");
      return;
    }

    setName("");
    setSlug("");
    setSystemPrompt("");
    setStatus(`Creato client ${data.name}`);
    await loadClients();
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <h1 style={{ margin: 0 }}>Admin Dashboard</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            ADMIN_SECRET
          </span>
          <input
            type="password"
            value={adminSecret}
            onChange={(event) => setAdminSecret(event.target.value)}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10 }}
          />
        </label>
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
          Carica client
        </button>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Crea client</h2>
        <form onSubmit={createClient} style={{ display: "grid", gap: 10 }}>
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
          <textarea
            placeholder="System prompt"
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            rows={4}
            style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, resize: "vertical" }}
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
            Crea
          </button>
        </form>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>Client</h2>
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
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
