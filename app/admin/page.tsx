"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminHomePage() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => null);
  }, []);

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Aree di configurazione</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <Link href="/admin/system-settings" style={cardLinkStyle}>
            <strong>Impostazioni di sistema</strong>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              LLM/AI, Email, Calendari, API
            </span>
          </Link>

          <Link href="/admin/agents" style={cardLinkStyle}>
            <strong>Assistenti / Agenti</strong>
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              Creazione, gestione, knowledge base e configurazione per ogni agente
            </span>
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Accessi rapidi</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/email" style={quickLinkStyle}>Email</Link>
          <Link href="/admin/appointments" style={quickLinkStyle}>Calendari</Link>
          <Link href="/admin/crm" style={quickLinkStyle}>CRM</Link>
          <Link href="/admin/chats" style={quickLinkStyle}>Chat</Link>
          <Link href="/admin/metrics" style={quickLinkStyle}>Metriche</Link>
        </div>
      </section>
    </main>
  );
}

const cardLinkStyle = {
  display: "grid",
  gap: 4,
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 12,
  textDecoration: "none",
  color: "inherit",
  background: "white",
} as const;

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
