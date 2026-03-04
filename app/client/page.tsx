"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ClientHomePage() {
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
      <h1 style={{ margin: 0 }}>Area Clienti</h1>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Account attivo: {userEmail || "caricamento..."}
        </p>
        <p style={{ margin: 0 }}>
          Qui puoi usare le funzionalita operative dedicate ai clienti. Le funzioni di amministrazione EasyVox non
          sono visibili in questa area.
        </p>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Accessi disponibili</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/demo" style={quickLinkStyle}>
            Demo chat
          </Link>
          <Link href="/ai-ui-chat" style={quickLinkStyle}>
            AI UI Chat
          </Link>
        </div>
      </section>
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
