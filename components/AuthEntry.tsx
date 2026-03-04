"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";

type Mode = "login" | "register";

type AuthEntryProps = {
  modeLocked?: Mode;
  standalone?: boolean;
};

type SocialProviderId = "google" | "twitter";

const SOCIAL_PROVIDER_LABELS: Record<SocialProviderId, string> = {
  google: "Google",
  twitter: "X.com",
};

export function AuthEntry({ modeLocked, standalone = false }: AuthEntryProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(modeLocked ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialProviders, setSocialProviders] = useState<SocialProviderId[]>([]);
  const currentMode = modeLocked ?? mode;

  useEffect(() => {
    if (modeLocked) return;

    let isMounted = true;
    (async () => {
      try {
        const providers = await getProviders();
        const enabled = (["google", "twitter"] as const).filter((providerId) =>
          Boolean(providers?.[providerId]),
        );
        if (isMounted) {
          setSocialProviders(enabled);
        }
      } catch {
        if (isMounted) {
          setSocialProviders([]);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [modeLocked]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(currentMode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  async function onSocialLogin(provider: SocialProviderId) {
    if (modeLocked) return;
    if (!socialProviders.includes(provider)) {
      setStatus("Provider social non disponibile. Configura le variabili OAuth in Vercel.");
      return;
    }
    setStatus("");
    try {
      await signIn(provider, { callbackUrl: "/post-login" });
    } catch {
      setStatus("Errore durante il login social. Controlla configurazione OAuth e callback URL.");
    }
  }

  const authPanel = (
    <section className="landing-block auth-panel" aria-label="Accesso account">
      <div className="auth-panel-head">
        <h2>Accedi alla dashboard</h2>
        <p className="mono">{modeLocked ? "Inserisci le credenziali per continuare." : "Entra oppure crea un account per iniziare."}</p>
      </div>

      {!modeLocked ? (
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

      <form onSubmit={onSubmit} className="auth-form">
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
          {loading ? "Attendere..." : currentMode === "login" ? "Entra in dashboard" : "Crea account"}
        </button>
      </form>

      {!modeLocked ? (
        <div className="auth-social-wrap" aria-label="Accesso social">
          <p className="mono auth-social-label">oppure continua con</p>
          <div className="auth-social-grid">
            {socialProviders.map((providerId) => (
              <button
                key={providerId}
                type="button"
                className="auth-social-button"
                onClick={() => onSocialLogin(providerId)}
              >
                {SOCIAL_PROVIDER_LABELS[providerId]}
              </button>
            ))}
          </div>
          {socialProviders.length === 0 ? (
            <p className="mono auth-status">Login social non disponibile: configura i provider OAuth in produzione.</p>
          ) : null}
        </div>
      ) : null}

      <p className="mono auth-status">{status || "Dopo l’autenticazione sarai reindirizzato in area Admin."}</p>
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
          <p className="landing-kicker">EasyVox Platform</p>
          <h1>Assistenti AI affidabili per team che vogliono risposte chiare, veloci e coerenti.</h1>
          <p className="landing-subcopy">
            Un’unica piattaforma per knowledge base, monitoraggio qualità e deploy multicanale senza complessità
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
