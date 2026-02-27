import Link from "next/link";

export default function Home() {
  return (
    <main className="container" style={{ padding: "42px 0 64px" }}>
      <section
        className="card"
        style={{
          padding: 28,
          display: "grid",
          gap: 20,
          background:
            "linear-gradient(130deg, color-mix(in srgb, var(--surface), #fff 65%) 20%, #fff2da 100%)",
        }}
      >
        <p className="mono" style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
          Next.js + Prisma + PostgreSQL + pgvector + RLS
        </p>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 3.5rem)", lineHeight: 1 }}>AI Chat Hub</h1>
        <p style={{ margin: 0, maxWidth: 700, color: "var(--muted)", fontSize: 18 }}>
          Piattaforma multi-tenant con chat AI, retrieval RAG isolato per tenant, widget embeddabile e
          dashboard admin.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <Link
            href="/demo"
            style={{
              borderRadius: 999,
              background: "var(--ink)",
              color: "white",
              textDecoration: "none",
              padding: "10px 16px",
            }}
          >
            Apri demo widget
          </Link>
          <Link
            href="/admin"
            style={{
              borderRadius: 999,
              border: "1px solid var(--line)",
              textDecoration: "none",
              padding: "10px 16px",
            }}
          >
            Apri dashboard admin
          </Link>
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <div className="card" style={{ padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>Sicurezza applicata</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)", lineHeight: 1.6 }}>
            <li>Middleware blocca API tenant-scoped senza `clientId` valido.</li>
            <li>RLS Postgres applicata su tutte le tabelle tenant-scoped.</li>
            <li>`withTenant` imposta `app.tenant_id` in transazione e forza query via `tx`.</li>
            <li>Retrieval RAG filtrato sia da RLS che da filtro SQL esplicito `client_id = ...`.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
