"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfileSettingsPage() {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: { email?: string } | null }) => {
        if (data.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => null);
  }, []);

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <header className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h1 style={{ margin: 0 }}>Impostazioni Profilo</h1>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Account attivo: {userEmail || "caricamento..."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/client" style={quickLinkStyle}>
            Area Cliente
          </Link>
          <Link href="/demo" style={quickLinkStyle}>
            Chat Tenant
          </Link>
        </div>
      </header>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Impostazioni - Aree operative del tuo perimetro</h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Da qui gestisci tutto il tuo tenant: agenti, chat, CRM, appuntamenti, metriche e utenti.
        </p>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Gestione agenti</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Row text="Creare nuovi agenti" />
          <Row text="Gestire agenti esistenti" />
          <Row text="Modificare prompt e nome assistant" />
        </div>
        <Link href="/admin/agents" style={actionStyle}>
          Apri Gestione Agenti
        </Link>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Opzioni chat</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Row text="Caricare/rimuovere documenti per training (knowledge base)" />
          <Row text="Gestire impostazioni AI personali" />
          <Row text="Scegliere provider/modello AI per te" />
          <Row text="Vedere chat/sedute del tuo tenant" />
          <Row text="Salvare la tua API key senza toccare quella degli altri" />
          <Row text="Fallback automatico al sistema se non imposti override personali" />
          <Row text="Usare la chat tenant" />
          <Row text="Se il tenant richiede login: accesso con email/password" />
          <Row text="Se profilazione attiva: inserimento nome + email prima della chat" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/client" style={actionStyle}>
            Impostazioni AI personali
          </Link>
          <Link href="/admin/chats" style={quickLinkStyle}>
            Archivio chat/sedute
          </Link>
          <Link href="/demo" style={quickLinkStyle}>
            Apri chat tenant
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>CRM, Appuntamenti, Metriche</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Row text="CRM del tuo profilo/tenant" />
          <Row text="Appuntamenti del tuo tenant" />
          <Row text="Metriche del tuo tenant" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/crm" style={quickLinkStyle}>
            Apri CRM
          </Link>
          <Link href="/admin/appointments" style={quickLinkStyle}>
            Apri Appuntamenti
          </Link>
          <Link href="/admin/metrics" style={quickLinkStyle}>
            Apri Metriche
          </Link>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Gestione utenti tenant (se owner)</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <Row text="Aggiungere utenti del tuo tenant (email/password)" />
          <Row text="Vedere chi accede alla chat del tenant" />
          <Row text="Controllare ultimo login chat e sessioni attive" />
        </div>
        <Link href="/client" style={actionStyle}>
          Apri Gestione Utenti Tenant
        </Link>
      </section>
    </main>
  );
}

function Row({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        background: "white",
        padding: "10px 12px",
        fontSize: 14,
      }}
    >
      {text}
    </div>
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

const actionStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--ink)",
  background: "var(--ink)",
  color: "white",
  padding: "8px 12px",
  textDecoration: "none",
} as const;
