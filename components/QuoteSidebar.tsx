"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/components/quote-sidebar.module.css";

type QuoteSupportType = "istanza" | "server" | "macchina locale";
type QuoteAiType = "primum open source";
type QuoteTrainingType = "soft" | "medium" | "enterprise";

type QuoteDraft = {
  name: string;
  company: string;
  city: string;
  email: string;
  phone: string;
  support: QuoteSupportType;
  aiType: QuoteAiType;
  training: QuoteTrainingType;
  customizations: string;
};

const defaultDraft: QuoteDraft = {
  name: "",
  company: "",
  city: "",
  email: "",
  phone: "",
  support: "istanza",
  aiType: "primum open source",
  training: "soft",
  customizations: "",
};

type QuoteSidebarProps = {
  clientId?: string;
  username?: string;
  apiBaseUrl?: string;
};

export function QuoteSidebar({ clientId, username, apiBaseUrl = "" }: QuoteSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft>(defaultDraft);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const tenantHeaderKey = clientId ? "x-client-id" : "x-client-slug";
  const tenantHeaderValue = (clientId ?? username ?? "demo").trim();

  const isComplete = useMemo(
    () =>
      Boolean(
        draft.name.trim() &&
          draft.company.trim() &&
          draft.city.trim() &&
          draft.email.trim() &&
          draft.phone.trim(),
      ),
    [draft],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onQuoteOpen = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<QuoteDraft>>;
      setIsOpen(true);
      if (customEvent.detail) {
        setDraft((current) => ({
          ...current,
          ...customEvent.detail,
        }));
      }
    };

    const onQuotePrefill = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<QuoteDraft>>;
      if (customEvent.detail) {
        setDraft((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(customEvent.detail).filter(([, value]) => value !== undefined && value !== ""),
          ),
        }));
      }
    };

    window.addEventListener("easyvox:quote-open", onQuoteOpen);
    window.addEventListener("easyvox:quote-prefill", onQuotePrefill);
    return () => {
      window.removeEventListener("easyvox:quote-open", onQuoteOpen);
      window.removeEventListener("easyvox:quote-prefill", onQuotePrefill);
    };
  }, []);

  async function downloadPdf() {
    if (!isComplete || downloading) return;
    setDownloading(true);
    setFeedback(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/quote/pdf`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(tenantHeaderValue ? { [tenantHeaderKey]: tenantHeaderValue } : {}),
        },
        body: JSON.stringify({
          sessionId:
            typeof window !== "undefined"
              ? window.sessionStorage.getItem("easyvox:last-session-id") ?? undefined
              : undefined,
          name: draft.name.trim(),
          company: draft.company.trim(),
          city: draft.city.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim(),
          support: draft.support,
          aiType: draft.aiType,
          training: draft.training,
          customizations: draft.customizations.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Errore generazione PDF");
      }

      const quoteSummaryHeader = response.headers.get("x-easyvox-quote-summary");
      const emailWarningHeader = response.headers.get("x-easyvox-email-warning");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `preventivo-easyvox-${draft.company.trim().replace(/\s+/g, "-").toLowerCase() || "cliente"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setFeedback(
        emailWarningHeader
          ? `PDF generato. Avviso email: ${decodeURIComponent(emailWarningHeader)}`
          : "PDF generato.",
      );
      window.dispatchEvent(
        new CustomEvent("easyvox:quote-created", {
          detail: {
            text: quoteSummaryHeader
              ? decodeURIComponent(quoteSummaryHeader)
              : [
                  `Preventivo EasyVox per ${draft.company.trim()}`,
                  `Nome: ${draft.name.trim()}`,
                  `Citta: ${draft.city.trim()}`,
                  `Email: ${draft.email.trim()}`,
                  `Telefono: ${draft.phone.trim()}`,
                ].join("\n"),
          },
        }),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Errore generazione PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <aside ref={panelRef} className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`} aria-label="Preventivi">
      <button
        type="button"
        className={styles.tab}
        aria-expanded={isOpen}
        aria-controls="quote-content"
        onClick={() => setIsOpen((current) => !current)}
      >
        Preventivi
      </button>
      <div id="quote-content" className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>Preventivo EasyVox</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Chiudi preventivi"
          >
            ×
          </button>
          <p className={styles.meta}>Compila o lascia che la chat precompili il form.</p>
        </div>
        <div className={styles.form}>
          <label className={styles.field}>
            <span>Nome</span>
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Ditta</span>
            <input value={draft.company} onChange={(event) => setDraft((current) => ({ ...current, company: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Citta</span>
            <input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Email</span>
            <input type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Telefono</span>
            <input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span>Supporto</span>
            <select value={draft.support} onChange={(event) => setDraft((current) => ({ ...current, support: event.target.value as QuoteSupportType }))}>
              <option value="istanza">Istanza</option>
              <option value="server">Server</option>
              <option value="macchina locale">Macchina locale</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Tipologia AI</span>
            <select value={draft.aiType} onChange={(event) => setDraft((current) => ({ ...current, aiType: event.target.value as QuoteAiType }))}>
              <option value="primum open source">Primum open source</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Addestramento</span>
            <select value={draft.training} onChange={(event) => setDraft((current) => ({ ...current, training: event.target.value as QuoteTrainingType }))}>
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span>Customizzazione</span>
            <textarea
              rows={4}
              value={draft.customizations}
              onChange={(event) => setDraft((current) => ({ ...current, customizations: event.target.value }))}
              placeholder="Su richiesta"
            />
          </label>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} disabled={!isComplete || downloading} onClick={() => void downloadPdf()}>
              {downloading ? "Generazione..." : "Scarica PDF"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setDraft(defaultDraft)}>
              Reset
            </button>
          </div>
          <p className={styles.helper}>
            {feedback ?? "La chat puo aprire questa scheda e precompilarla mentre raccoglie i dati del preventivo."}
          </p>
        </div>
      </div>
    </aside>
  );
}
