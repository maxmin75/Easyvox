"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/brand";

const rotatingWords = [
  "risponde ai clienti",
  "guida i visitatori",
  "raccoglie contatti",
  "automatizza il lavoro",
  "aumenta le conversioni",
];

const features = [
  {
    title: "AI conversazionale",
    text: "Interagisce in modo naturale, comprende il contesto e mantiene il filo della conversazione.",
    accent: "lime",
  },
  {
    title: "Lead e contatti",
    text: "Trasforma domande e interesse in richieste concrete, consulenze e opportunita commerciali.",
    accent: "cyan",
  },
  {
    title: "Memoria cliente",
    text: "Ricorda preferenze, richieste e cronologia per offrire un'esperienza coerente e personale.",
    accent: "lime",
  },
  {
    title: "Supporto operativo",
    text: "Riduce richieste ripetitive e alleggerisce il team con risposte immediate e utili.",
    accent: "cyan",
  },
  {
    title: "Brand su misura",
    text: "Tono di voce, servizi, catalogo e logiche vengono configurati sulla tua realta.",
    accent: "lime",
  },
  {
    title: "Flussi integrabili",
    text: "Si collega a demo, booking, CRM, email e processi digitali dove serve davvero.",
    accent: "cyan",
  },
];

const benefits = [
  "Accoglie subito il visitatore e capisce cosa cerca.",
  "Spiega servizi e prodotti in modo chiaro e convincente.",
  "Filtra richieste, qualifica lead e guida all'azione.",
  "Resta attivo 24/7 senza perdere tono, coerenza o contesto.",
];

const useCases = [
  {
    title: "Aziende",
    text: "Per supporto commerciale, richieste inbound, FAQ e flussi di contatto strutturati.",
  },
  {
    title: "Professionisti",
    text: "Per prenotazioni, pre-qualifica, spiegazione servizi e assistenza fuori orario.",
  },
  {
    title: "E-commerce",
    text: "Per accompagnare la scelta, chiarire dubbi e ridurre abbandoni durante l'acquisto.",
  },
];

const faqs = [
  {
    q: "EasyVox e un semplice chatbot?",
    a: "No. E un assistente AI configurato su attivita, contenuti, tono e obiettivi reali del progetto.",
  },
  {
    q: "Si puo personalizzare completamente?",
    a: "Si. Prompt, contenuti, memoria, logiche di raccolta dati e aree operative vengono modellati sul business.",
  },
  {
    q: "Può raccogliere lead e richieste?",
    a: "Si. Può guidare l'utente verso demo, contatto, consulenza, booking o altre azioni utili.",
  },
  {
    q: "Serve competenza tecnica interna?",
    a: "No. L'implementazione può essere gestita centralmente, lasciando al team solo il controllo dei contenuti e degli obiettivi.",
  },
];

function useTypewriter(words: string[]) {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex % words.length];
    const timeout = window.setTimeout(
      () => {
        if (isDeleting) {
          const next = currentWord.slice(0, Math.max(displayText.length - 1, 0));
          setDisplayText(next);
          if (next.length === 0) {
            setIsDeleting(false);
            setWordIndex((value) => (value + 1) % words.length);
          }
          return;
        }

        const next = currentWord.slice(0, displayText.length + 1);
        setDisplayText(next);
        if (next === currentWord) {
          window.setTimeout(() => setIsDeleting(true), 1800);
        }
      },
      isDeleting ? 25 : 55,
    );

    return () => window.clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex, words]);

  return displayText;
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { ref, isVisible } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-700 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <p className="landing-eyebrow">{eyebrow}</p>
      <h2 className="landing-section-title">{title}</h2>
      {subtitle ? <p className="landing-section-subtitle">{subtitle}</p> : null}
    </div>
  );
}

export default function HomeLanding() {
  const typed = useTypewriter(rotatingWords);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <main className="landing-shell">
      <section className="landing-hero">
        <div className="landing-orb landing-orb-lime" />
        <div className="landing-orb landing-orb-cyan" />
        <div className="container">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-pill">AI conversazionale progettata per il business</div>
              <h1 className="landing-title">
                Il tuo sito, finalmente,
                <span className="landing-title-muted"> un assistente AI che</span>
                <span className="landing-gradient">
                  {" "}
                  {typed || "lavora per te"}
                  <span className="landing-caret" aria-hidden="true">
                    |
                  </span>
                </span>
              </h1>
              <p className="landing-lead">
                {BRAND_NAME} porta sul tuo sito una presenza intelligente, attiva e personalizzata:
                accoglie, spiega, assiste, ricorda e accompagna il cliente verso il passo successivo.
              </p>
              <div className="landing-actions">
                <Link href="/demo" className="landing-primary">
                  Provalo ora
                </Link>
                <a href="#come-funziona" className="landing-secondary">
                  Scopri come funziona
                </a>
                <Link href="/login?tab=admin" className="landing-inline-link">
                  Area admin
                </Link>
              </div>
              <div className="landing-stats">
                <div>
                  <span>Operativita</span>
                  <strong>24/7 presenza attiva</strong>
                </div>
                <div>
                  <span>Memoria</span>
                  <strong>Contesto cliente persistente</strong>
                </div>
                <div>
                  <span>Obiettivo</span>
                  <strong>Lead, supporto e conversioni</strong>
                </div>
              </div>
            </div>

            <aside className="landing-panel" aria-label="Anteprima EasyVox">
              <div className="landing-card landing-card-primary">
                <p className="landing-card-label">{BRAND_DOMAIN}</p>
                <strong>Vox segue la conversazione, qualifica e smista in tempo reale.</strong>
                <ol>
                  <li>Risposte coerenti con tono, servizi e obiettivi del brand.</li>
                  <li>Raccolta dati e riconoscimento di intenti commerciali o di supporto.</li>
                  <li>Attivazione di demo, contatti, booking e processi operativi.</li>
                </ol>
              </div>
              <div className="landing-card">
                <p className="landing-card-label">Use case</p>
                <strong>Aziende, professionisti, e-commerce, attivita locali.</strong>
                <span>Una homepage che non si limita a mostrare informazioni: conversa e converte.</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="funzionalita" className="landing-section">
        <div className="container">
          <SectionTitle
            eyebrow="Funzionalita"
            title="Tutto cio di cui il tuo business ha bisogno"
            subtitle="La home apre il progetto con una pagina piu forte, ma resta collegata alle aree operative gia presenti."
          />
          <div className="landing-grid landing-grid-3">
            {features.map((feature, index) => (
              <article key={feature.title} className={`landing-feature ${feature.accent}`} style={{ animationDelay: `${index * 70}ms` }}>
                <span className="landing-feature-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="come-funziona" className="landing-section">
        <div className="container landing-split">
          <div>
            <SectionTitle
              eyebrow="Come funziona"
              title="Una chat che non fa scena soltanto: aiuta davvero il business"
              subtitle="Riduce i tempi di risposta, migliora la qualita delle informazioni e accompagna l'utente verso un'azione concreta."
            />
            <div className="landing-grid landing-grid-2">
              {benefits.map((item, index) => (
                <article key={item} className="landing-feature" style={{ animationDelay: `${index * 70}ms` }}>
                  <h3>{item}</h3>
                </article>
              ))}
            </div>
          </div>

          <aside className="landing-steps">
            <p className="landing-eyebrow">Workflow</p>
            {[
              "Analisi di attivita, tono, obiettivi e funzioni richieste.",
              "Configurazione agente AI, knowledge base e logiche operative.",
              "Collegamento a sito, demo, CRM, email e processi utili.",
              "Ottimizzazione continua delle conversazioni e dei risultati.",
            ].map((step) => (
              <div key={step} className="landing-step">
                <span className="landing-step-dot" aria-hidden="true" />
                <p>{step}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>

      <section id="use-case" className="landing-section">
        <div className="container">
          <SectionTitle
            eyebrow="Use case"
            title="Pensato per chi vuole un sito piu intelligente"
            subtitle="Ogni installazione viene adattata al contesto reale: commerciale, supporto, vendita o prenotazione."
          />
          <div className="landing-grid landing-grid-3">
            {useCases.map((item, index) => (
              <article key={item.title} className="landing-feature" style={{ animationDelay: `${index * 70}ms` }}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section">
        <div className="container">
          <SectionTitle eyebrow="FAQ" title="Dubbi comuni, risposte chiare" />
          <div className="landing-faq">
            {faqs.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={item.q} className="landing-faq-item">
                  <button className="landing-faq-button" onClick={() => setActiveFaq(isOpen ? null : index)}>
                    <span>{item.q}</span>
                    <span className={`landing-faq-icon ${isOpen ? "open" : ""}`}>+</span>
                  </button>
                  <div className={`landing-faq-answer ${isOpen ? "open" : ""}`}>
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="landing-band">
            <div>
              <p className="landing-eyebrow">{BRAND_DOMAIN}</p>
              <h2>Vuoi vedere {BRAND_NAME} in azione sul tuo flusso reale?</h2>
              <p>
                Prova la demo pubblica oppure accedi all&apos;area admin per configurare agente,
                contenuti e logiche operative senza toccare il resto dell&apos;app.
              </p>
            </div>
            <div className="landing-actions landing-actions-band">
              <Link href="/demo" className="landing-primary">
                Apri demo
              </Link>
              <Link href="/login?tab=admin" className="landing-secondary">
                Vai all&apos;admin
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .landing-shell {
          background:
            radial-gradient(circle at top left, rgba(200, 255, 0, 0.14), transparent 32%),
            radial-gradient(circle at 85% 20%, rgba(0, 229, 255, 0.14), transparent 24%),
            linear-gradient(180deg, #090b10 0%, #0e1219 52%, #f4f6fb 52%, #f4f6fb 100%);
          color: #eff3ff;
          overflow: clip;
        }

        .landing-hero {
          position: relative;
          padding: 42px 0 72px;
        }

        .landing-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(80px);
          pointer-events: none;
        }

        .landing-orb-lime {
          top: 100px;
          left: -70px;
          width: 260px;
          height: 260px;
          background: rgba(200, 255, 0, 0.18);
        }

        .landing-orb-cyan {
          right: 4%;
          top: 110px;
          width: 320px;
          height: 320px;
          background: rgba(0, 229, 255, 0.16);
        }

        .landing-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
          gap: 32px;
          align-items: center;
          min-height: calc(100vh - 180px);
        }

        .landing-pill,
        .landing-eyebrow,
        .landing-card-label,
        .landing-feature-index {
          font-family: var(--font-mono), monospace;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .landing-pill {
          display: inline-flex;
          align-items: center;
          margin-bottom: 18px;
          padding: 10px 14px;
          border: 1px solid rgba(200, 255, 0, 0.2);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(230, 255, 133, 0.86);
          font-size: 0.72rem;
        }

        .landing-title {
          max-width: 11ch;
          margin: 0;
          font-size: clamp(3.4rem, 7vw, 6.8rem);
          line-height: 0.94;
          letter-spacing: -0.06em;
          color: #fbfdff;
        }

        .landing-title-muted {
          display: block;
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.32);
          font-size: 0.58em;
          font-weight: 300;
          letter-spacing: -0.03em;
        }

        .landing-gradient {
          display: inline-block;
          background: linear-gradient(135deg, #d8ff51 0%, #83f8ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          min-height: 1.2em;
        }

        .landing-caret {
          color: #d8ff51;
          animation: blink 0.9s steps(1, end) infinite;
        }

        .landing-lead {
          max-width: 62ch;
          margin: 24px 0 0;
          color: rgba(239, 243, 255, 0.72);
          font-size: 1.08rem;
          line-height: 1.75;
        }

        .landing-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
          margin-top: 28px;
        }

        .landing-primary,
        .landing-secondary,
        .landing-inline-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          border-radius: 999px;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .landing-primary {
          padding: 0 24px;
          background: #d8ff51;
          color: #0b1016;
          font-weight: 700;
          box-shadow: 0 18px 40px rgba(200, 255, 0, 0.18);
        }

        .landing-primary:hover,
        .landing-secondary:hover,
        .landing-inline-link:hover {
          transform: translateY(-1px);
        }

        .landing-secondary {
          padding: 0 22px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.82);
        }

        .landing-inline-link {
          min-height: auto;
          color: rgba(216, 255, 81, 0.88);
          font-weight: 600;
        }

        .landing-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 34px;
        }

        .landing-stats div,
        .landing-card,
        .landing-feature,
        .landing-step,
        .landing-band,
        .landing-faq-item {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.045);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .landing-stats div {
          padding: 16px 18px;
          border-radius: 22px;
        }

        .landing-stats span {
          display: block;
          margin-bottom: 8px;
          color: rgba(255, 255, 255, 0.44);
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .landing-stats strong {
          color: #f7faff;
          font-size: 0.98rem;
          line-height: 1.45;
        }

        .landing-panel {
          display: grid;
          gap: 16px;
        }

        .landing-card {
          padding: 22px;
          border-radius: 28px;
          box-shadow: 0 14px 36px rgba(3, 5, 8, 0.2);
        }

        .landing-card-primary {
          background:
            linear-gradient(160deg, rgba(216, 255, 81, 0.18), rgba(255, 255, 255, 0.05)),
            rgba(255, 255, 255, 0.05);
        }

        .landing-card-label {
          display: block;
          margin-bottom: 12px;
          color: rgba(216, 255, 81, 0.78);
          font-size: 0.72rem;
        }

        .landing-card strong {
          display: block;
          color: #f8fbff;
          font-size: 1.3rem;
          line-height: 1.35;
        }

        .landing-card ol,
        .landing-card span {
          margin: 16px 0 0;
          color: rgba(239, 243, 255, 0.72);
          line-height: 1.7;
        }

        .landing-card ol {
          padding-left: 18px;
        }

        .landing-section {
          position: relative;
          padding: 72px 0;
        }

        .landing-section:nth-of-type(n + 2) {
          color: #102030;
        }

        .landing-section-title {
          margin: 0;
          color: #112031;
          font-size: clamp(2.1rem, 4vw, 3.6rem);
          line-height: 1.02;
          letter-spacing: -0.05em;
        }

        .landing-eyebrow {
          margin: 0 0 14px;
          color: #6f7f95;
          font-size: 0.74rem;
        }

        .landing-section-subtitle {
          margin: 14px auto 0;
          color: #526172;
          max-width: 58ch;
          font-size: 1.02rem;
          line-height: 1.7;
        }

        .landing-grid {
          display: grid;
          gap: 18px;
        }

        .landing-grid-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .landing-grid-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .landing-feature {
          padding: 24px;
          border-radius: 28px;
          color: #122033;
          animation: fadeUp 0.7s ease both;
          border-color: rgba(16, 32, 51, 0.08);
          background: rgba(255, 255, 255, 0.7);
          box-shadow: 0 18px 45px rgba(20, 31, 49, 0.07);
        }

        .landing-feature.lime {
          background:
            linear-gradient(180deg, rgba(216, 255, 81, 0.12), rgba(255, 255, 255, 0.9)),
            rgba(255, 255, 255, 0.9);
        }

        .landing-feature.cyan {
          background:
            linear-gradient(180deg, rgba(131, 248, 255, 0.14), rgba(255, 255, 255, 0.92)),
            rgba(255, 255, 255, 0.92);
        }

        .landing-feature h3 {
          margin: 0 0 10px;
          font-size: 1.28rem;
          line-height: 1.3;
        }

        .landing-feature p {
          margin: 0;
          color: #526172;
          line-height: 1.7;
        }

        .landing-feature-index {
          display: inline-block;
          margin-bottom: 16px;
          color: #7084a0;
          font-size: 0.72rem;
        }

        .landing-split {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          gap: 22px;
          align-items: start;
        }

        .landing-steps {
          padding-top: 56px;
        }

        .landing-step {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 18px 20px;
          border-radius: 22px;
          margin-bottom: 14px;
          border-color: rgba(16, 32, 51, 0.08);
          background: rgba(255, 255, 255, 0.74);
        }

        .landing-step p {
          margin: 0;
          color: #4d5b6c;
          line-height: 1.65;
        }

        .landing-step-dot {
          width: 10px;
          height: 10px;
          margin-top: 8px;
          border-radius: 999px;
          background: linear-gradient(135deg, #d8ff51 0%, #83f8ff 100%);
          box-shadow: 0 0 0 6px rgba(216, 255, 81, 0.18);
          flex: 0 0 auto;
        }

        .landing-faq {
          max-width: 860px;
          margin: 0 auto;
          display: grid;
          gap: 12px;
        }

        .landing-faq-item {
          border-radius: 22px;
          border-color: rgba(16, 32, 51, 0.08);
          background: rgba(255, 255, 255, 0.74);
        }

        .landing-faq-button {
          width: 100%;
          padding: 22px 24px;
          border: 0;
          background: transparent;
          color: #102030;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          font: inherit;
          cursor: pointer;
        }

        .landing-faq-button span:first-child {
          font-size: 1.04rem;
          font-weight: 600;
          line-height: 1.5;
        }

        .landing-faq-icon {
          font-size: 1.35rem;
          color: #7084a0;
          transition: transform 0.2s ease;
        }

        .landing-faq-icon.open {
          transform: rotate(45deg);
        }

        .landing-faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.25s ease;
        }

        .landing-faq-answer.open {
          max-height: 180px;
        }

        .landing-faq-answer p {
          margin: 0;
          padding: 0 24px 22px;
          color: #526172;
          line-height: 1.7;
        }

        .landing-band {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) auto;
          gap: 24px;
          align-items: center;
          padding: 34px;
          border-radius: 32px;
          border-color: rgba(16, 32, 51, 0.09);
          background:
            radial-gradient(circle at top right, rgba(131, 248, 255, 0.18), transparent 28%),
            linear-gradient(145deg, rgba(216, 255, 81, 0.16), rgba(255, 255, 255, 0.8));
          box-shadow: 0 20px 60px rgba(20, 31, 49, 0.09);
        }

        .landing-band h2 {
          margin: 0;
          color: #102030;
          font-size: clamp(2rem, 3vw, 3rem);
          line-height: 1.05;
          letter-spacing: -0.05em;
        }

        .landing-band p:last-child {
          margin: 14px 0 0;
          color: #4d5b6c;
          max-width: 54ch;
          line-height: 1.7;
        }

        .landing-actions-band {
          justify-content: flex-end;
        }

        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 980px) {
          .landing-hero-grid,
          .landing-split,
          .landing-band,
          .landing-grid-3,
          .landing-grid-2 {
            grid-template-columns: 1fr;
          }

          .landing-steps {
            padding-top: 0;
          }

          .landing-actions-band {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .landing-hero {
            padding-top: 20px;
          }

          .landing-title {
            max-width: none;
            font-size: clamp(2.8rem, 14vw, 4.4rem);
          }

          .landing-stats {
            grid-template-columns: 1fr;
          }

          .landing-primary,
          .landing-secondary,
          .landing-inline-link {
            width: 100%;
          }

          .landing-band {
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
