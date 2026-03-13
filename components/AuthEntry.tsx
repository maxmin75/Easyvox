"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/brand";

type Mode = "login" | "register";
type AuthEntryProps = {
  modeLocked?: Mode;
  standalone?: boolean;
  adminOnly?: boolean;
};

export function AuthEntry({ modeLocked, standalone = false, adminOnly = false }: AuthEntryProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(modeLocked ?? "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminRecoveryMode, setAdminRecoveryMode] = useState(false);
  const [adminRecoveryEmail, setAdminRecoveryEmail] = useState("");
  const currentMode = modeLocked ?? mode;

  useEffect(() => {
    if (adminOnly) setMode("login");
  }, [adminOnly]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(currentMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(currentMode === "login" ? { email, password } : { name, email, password }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Operazione fallita");
        return;
      }

      setStatus("Accesso effettuato");
      router.push("/post-login");
      router.refresh();
    } catch {
      setStatus("Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  async function onAdminRecoverySubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/admin/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: adminRecoveryEmail }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Recupero password fallito");
        return;
      }
      setStatus(data.message ?? "Se l'email e corretta, riceverai un link di recupero.");
    } catch {
      setStatus("Errore di rete");
    } finally {
      setLoading(false);
    }
  }

  const authPanel = (
    <section className="landing-block auth-panel" aria-label="Accesso account">
      <div className="auth-panel-head">
        <h2>Admin</h2>
        <p className="mono">
          Area riservata all&apos;amministrazione centrale di EasyVox.
        </p>
      </div>

      {!modeLocked && !adminOnly ? (
        <div className="auth-toggle" role="tablist" aria-label="Modalita accesso">
          <button type="button" onClick={() => setMode("login")} className={mode === "login" ? "is-active" : ""}>
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "is-active" : ""}
          >
            Register
          </button>
        </div>
      ) : null}

      {adminOnly && adminRecoveryMode ? (
        <form onSubmit={onAdminRecoverySubmit} className="auth-form">
          <label>
            Email admin
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={adminRecoveryEmail}
              onChange={(event) => setAdminRecoveryEmail(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Attendere..." : "Invia link di recupero"}
          </button>
          <button
            type="button"
            className="auth-submit"
            onClick={() => {
              setAdminRecoveryMode(false);
              setStatus("");
            }}
            style={{ background: "transparent", color: "var(--ink)", borderColor: "var(--line)" }}
          >
            Torna al login
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="auth-form">
          {currentMode === "register" ? (
            <label>
              Nome
              <input
                type="text"
                required
                placeholder="Mario Rossi"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Attendere..." : currentMode === "login" ? "Accedi come Admin" : "Crea account"}
          </button>
        </form>
      )}

      {adminOnly ? (
        <button
          type="button"
          className="topbar-link"
          style={{ width: "fit-content", background: "transparent" }}
          onClick={() => {
            setAdminRecoveryMode((current) => !current);
            setStatus("");
            setAdminRecoveryEmail(email || adminRecoveryEmail);
          }}
        >
          {adminRecoveryMode ? "Chiudi recupero password" : "Recupera password"}
        </button>
      ) : null}

      <p className="mono auth-status">
        {status || "Dopo l&apos;autenticazione sarai reindirizzato nell&apos;area admin."}
      </p>
    </section>
  );

  if (standalone) {
    return (
      <main className="container auth-standalone-page">
        {authPanel}
      </main>
    );
  }

  return (
    <main className="container landing">
      <section className="landing-grid">
        <div className="landing-block landing-hero">
          <p className="landing-kicker">{BRAND_DOMAIN}</p>
          <h1>Assistenti AI affidabili per team che vogliono risposte chiare, veloci e coerenti.</h1>
          <p className="landing-subcopy">
            {BRAND_NAME} concentra knowledge base, monitoraggio qualita e deploy multicanale senza complessita
            operativa.
          </p>
          <div className="landing-metrics">
            <div>
              <span className="landing-metric-label">Setup medio</span>
              <strong>2 giorni</strong>
            </div>
            <div>
              <span className="landing-metric-label">Canali supportati</span>
              <strong>Web, CRM, App</strong>
            </div>
            <div>
              <span className="landing-metric-label">Focus</span>
              <strong>Accuratezza risposte</strong>
            </div>
          </div>
        </div>

        <div className="landing-block landing-feature-grid">
          <article className="landing-feature">
            <span className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3.5 5.5 7v10L12 20.5 18.5 17V7z" />
                <path d="M8.5 9.5h7M8.5 13h7" />
              </svg>
            </span>
            <p>Knowledge base controllata: solo fonti approvate e sempre tracciabili.</p>
          </article>
          <article className="landing-feature">
            <span className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4.5a5 5 0 0 1 5 5V12a5 5 0 0 1-10 0V9.5a5 5 0 0 1 5-5Z" />
                <path d="M4.5 12.5h15M7 16.5h10" />
              </svg>
            </span>
            <p>Feedback loop continuo per migliorare tono, precisione e soddisfazione utenti.</p>
          </article>
          <article className="landing-feature">
            <span className="landing-feature-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
                <path d="M8 10h8M8 14h5" />
              </svg>
            </span>
            <p>Widget white-label e dashboard admin per gestire più clienti in modo ordinato.</p>
          </article>
        </div>

        {authPanel}

        <div className="landing-block landing-proof">
          <p className="landing-proof-title">Una UX semplice per team operativi, customer care e product manager.</p>
          <div className="landing-proof-logos" aria-hidden="true">
            <span>Qualita conversazionale</span>
            <span>Controllo centralizzato</span>
            <span>Scalabilita multi-tenant</span>
          </div>
          <p className="landing-proof-note">Design moderno, chiaro e orientato alla conversione.</p>
        </div>
      </section>
    </main>
  );
}
