"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setStatus("Link di recupero non valido.");
      return;
    }
    if (password.length < 8) {
      setStatus("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Le password non coincidono.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/admin/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(data.error ?? "Reset password fallito.");
        return;
      }
      setStatus("Password aggiornata. Ora puoi accedere come admin.");
      setTimeout(() => {
        router.push("/login?tab=admin");
      }, 1200);
    } catch {
      setStatus("Errore di rete.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container auth-standalone-page">
      <section className="landing-block auth-panel" aria-label="Reset password admin">
        <div className="auth-panel-head">
          <h2>Nuova password admin</h2>
          <p className="mono">Imposta una nuova password per l&apos;accesso admin EasyVox.</p>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            Nuova password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            Conferma password
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? "Attendere..." : "Salva nuova password"}
          </button>
        </form>

        <p className="mono auth-status">{status || "Il link di recupero scade automaticamente."}</p>
        <Link href="/login?tab=admin" className="topbar-link" style={{ width: "fit-content" }}>
          Torna al login admin
        </Link>
      </section>
    </main>
  );
}
