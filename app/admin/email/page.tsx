"use client";

import Link from "next/link";
import { type CSSProperties, FormEvent, useEffect, useState } from "react";

type EmailSettingsResponse = {
  settings: {
    purchaseEmailEnabled: boolean;
    hasResendApiKey: boolean;
    purchaseEmailFrom: string;
    purchaseEmailReplyTo: string;
    purchaseEmailSubjectTemplate: string;
    purchaseEmailBodyTemplate: string;
    purchaseIntentKeywords: string;
  };
  envOverrides: {
    resendApiKey: boolean;
    purchaseEmailFrom: boolean;
  };
  error?: string;
};

export default function AdminEmailPage() {
  const [status, setStatus] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [resendApiKey, setResendApiKey] = useState("");
  const [hasResendApiKey, setHasResendApiKey] = useState(false);
  const [from, setFrom] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [keywords, setKeywords] = useState("");
  const [envOverrides, setEnvOverrides] = useState<EmailSettingsResponse["envOverrides"] | null>(
    null,
  );
  const [testTo, setTestTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  async function loadSettings() {
    const response = await fetch("/api/admin/email-settings");
    const data = (await response.json()) as EmailSettingsResponse;
    if (!response.ok) {
      setStatus(data.error ?? "Errore caricamento impostazioni email");
      return;
    }

    setEnabled(data.settings.purchaseEmailEnabled);
    setHasResendApiKey(data.settings.hasResendApiKey);
    setFrom(data.settings.purchaseEmailFrom);
    setReplyTo(data.settings.purchaseEmailReplyTo);
    setSubjectTemplate(data.settings.purchaseEmailSubjectTemplate);
    setBodyTemplate(data.settings.purchaseEmailBodyTemplate);
    setKeywords(data.settings.purchaseIntentKeywords);
    setEnvOverrides(data.envOverrides);
    setStatus("Impostazioni email caricate");
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();

    const response = await fetch("/api/admin/email-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purchaseEmailEnabled: enabled,
        resendApiKey: resendApiKey.trim() || undefined,
        purchaseEmailFrom: from.trim() || undefined,
        purchaseEmailReplyTo: replyTo.trim() || undefined,
        clearPurchaseEmailReplyTo: !replyTo.trim(),
        purchaseEmailSubjectTemplate: subjectTemplate.trim(),
        purchaseEmailBodyTemplate: bodyTemplate.trim(),
        purchaseIntentKeywords: keywords.trim(),
      }),
    });

    const data = (await response.json()) as EmailSettingsResponse;
    if (!response.ok) {
      setStatus(data.error ?? "Errore salvataggio impostazioni email");
      return;
    }

    setResendApiKey("");
    setHasResendApiKey(data.settings.hasResendApiKey);
    setEnvOverrides(data.envOverrides);
    setStatus("Impostazioni email salvate");
  }

  async function sendTestEmail() {
    if (!testTo.trim()) {
      setStatus("Inserisci una email di test");
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() }),
      });
      const data = (await response.json()) as { ok?: boolean; id?: string; error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Invio test fallito");
        return;
      }
      setStatus(`Email test inviata${data.id ? ` (id: ${data.id})` : ""}`);
    } finally {
      setSendingTest(false);
    }
  }

  return (
    <main className="container" style={{ padding: "30px 0 60px", display: "grid", gap: 18 }}>
      <section className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Automazione Email Acquisto</h1>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          Configura invio automatico quando in chat emerge intento di acquisto.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" style={linkStyle}>
            Torna a Dashboard
          </Link>
          <button type="button" onClick={() => void loadSettings()} style={secondaryButtonStyle}>
            Ricarica
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Configurazione</h2>
        <form onSubmit={saveSettings} style={{ display: "grid", gap: 10 }}>
          <label style={labelStyle}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Abilita invio automatico email acquisto
          </label>

          <input
            type="password"
            placeholder={
              hasResendApiKey
                ? "Resend API key (gia presente, inserisci solo per aggiornarla)"
                : "Resend API key"
            }
            value={resendApiKey}
            onChange={(event) => setResendApiKey(event.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            required
            placeholder="Mittente (es. no-reply@tuodominio.it)"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="Reply-To (opzionale)"
            value={replyTo}
            onChange={(event) => setReplyTo(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="Parole chiave trigger, separate da virgola"
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            style={inputStyle}
          />
          <input
            required
            placeholder="Oggetto template"
            value={subjectTemplate}
            onChange={(event) => setSubjectTemplate(event.target.value)}
            style={inputStyle}
          />
          <textarea
            required
            rows={12}
            placeholder="Corpo template"
            value={bodyTemplate}
            onChange={(event) => setBodyTemplate(event.target.value)}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          <button type="submit" style={primaryButtonStyle}>
            Salva impostazioni email
          </button>
        </form>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Variabili disponibili</h2>
        <code style={codeStyle}>{`{{clientName}} {{assistantName}} {{customerName}} {{customerEmail}} {{customerPhone}} {{customerWebsite}} {{message}} {{date}}`}</code>
      </section>

      <section className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Invio test</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="email destinatario test"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 260 }}
          />
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={sendingTest}
            style={primaryButtonStyle}
          >
            {sendingTest ? "Invio..." : "Invia test"}
          </button>
        </div>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <p className="mono" style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
          {status || "Nessuna azione eseguita"}
        </p>
        <div className="mono" style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          <div>Resend key configurata: {hasResendApiKey ? "si" : "no"}</div>
          <div>ENV override RESEND_API_KEY: {envOverrides?.resendApiKey ? "si" : "no"}</div>
          <div>
            ENV override PURCHASE_EMAIL_FROM: {envOverrides?.purchaseEmailFrom ? "si" : "no"}
          </div>
        </div>
      </section>
    </main>
  );
}

const inputStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: 10,
};

const labelStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
};

const primaryButtonStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "white",
  padding: "8px 12px",
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  width: "fit-content",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "white",
  padding: "8px 12px",
  cursor: "pointer",
};

const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 10,
  border: "1px solid var(--ink)",
  background: "var(--ink)",
  color: "white",
  padding: "8px 12px",
  textDecoration: "none",
};

const codeStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: 10,
  background: "white",
  fontSize: 12,
  lineHeight: 1.7,
  wordBreak: "break-word",
};
