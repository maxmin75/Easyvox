"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/brand";

const words = ["vende", "risponde", "ricorda", "qualifica", "automatizza", "converte"];

const features = [
  {
    eyebrow: "Conversazione",
    title: "AI conversazionale su misura",
    text: "Un assistente addestrato sulla tua attivita, sul tuo tono di voce e sui tuoi obiettivi commerciali.",
  },
  {
    eyebrow: "Memoria",
    title: "Memoria cliente",
    text: "Ricorda utenti, richieste, acquisti, preferenze e contesto per offrire un'esperienza continuativa.",
  },
  {
    eyebrow: "Workflow",
    title: "Automazioni operative",
    text: "Raccoglie contatti, indirizza richieste, apre moduli, booking e processi aziendali utili.",
  },
  {
    eyebrow: "Follow-up",
    title: "Email e nurturing",
    text: "Gestisce raccolta lead, invio comunicazioni, risposte automatiche e follow-up commerciale.",
  },
  {
    eyebrow: "Supporto",
    title: "Aziende ed e-commerce",
    text: "Presenta prodotti e servizi, aiuta il cliente a scegliere e accompagna fino alla conversione.",
  },
  {
    eyebrow: "Sicurezza",
    title: "Architettura controllata",
    text: "Chiavi lato server, prompt centralizzato, knowledge base esterna e logica backend sotto controllo.",
  },
];

const steps = [
  "Analizziamo la tua attivita e definiamo tono, obiettivi e funzioni.",
  "Configuriamo agente AI, prompt, knowledge base e logiche operative.",
  "Colleghiamo il sistema a sito, webapp, CRM, email e flussi utili.",
  "Ottimizziamo nel tempo le conversazioni per aumentare risultati e qualita.",
];

const benefits = [
  ["Lead piu qualificati", "Domande intelligenti, raccolta dati e smistamento richieste."],
  ["Piu conversioni", "L'utente viene accompagnato con chiarezza fino all'azione desiderata."],
  ["Meno lavoro ripetitivo", "Le richieste frequenti vengono gestite in automatico."],
  ["Esperienza premium", "Un'interfaccia moderna, rapida e memorabile per il tuo brand."],
];

const architecture = [
  [
    "Knowledge base esterna",
    "Documenti, FAQ e contenuti organizzati per far rispondere l'agente in modo coerente.",
  ],
  [
    "Prompt e logica centrale",
    "Comportamento dell'assistente controllato da un prompt master richiamato via backend.",
  ],
  [
    "Esperienza scalabile",
    "Il sistema e pensato per crescere con piu utenti, piu funzioni e piu valore nel tempo.",
  ],
];

const modelFamilies = [
  "GPT-4o",
  "GPT-4.1",
  "GPT-4 Turbo",
  "GPT-3.5 Turbo",
  "o3-mini (reasoning)",
  "o4-mini (reasoning)",
  "Claude 3 Opus",
  "Claude 3 Sonnet",
  "Claude 3 Haiku",
  "Llama 3 8B",
  "Llama 3 70B",
  "Claude",
  "Llama",
  "Mistral",
  "Titan (Amazon)",
];

function useTypewriter(items: string[], speed = 110, pause = 1300) {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = items[wordIndex % items.length];
    const timeout = window.setTimeout(() => {
      if (!deleting) {
        const next = current.slice(0, displayed.length + 1);
        setDisplayed(next);
        if (next === current) {
          window.setTimeout(() => setDeleting(true), pause);
        }
      } else {
        const next = current.slice(0, displayed.length - 1);
        setDisplayed(next);
        if (next.length === 0) {
          setDeleting(false);
          setWordIndex((index) => (index + 1) % items.length);
        }
      }
    }, deleting ? speed / 2 : speed);

    return () => window.clearTimeout(timeout);
  }, [deleting, displayed, items, pause, speed, wordIndex]);

  return displayed;
}

export default function HomeShowcase() {
  const typed = useTypewriter(words);

  return (
    <main className="home-page">
      <div className="container">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="home-eyebrow mono">Webapp AI per aziende, professionisti ed e-commerce</p>
            <h1>La tua AI che {typed || "opera"}.</h1>
            <p className="home-lead">
              {BRAND_NAME} trasforma sito o webapp in un&apos;esperienza conversazionale moderna, capace di presentare
              servizi, raccogliere lead, ricordare i clienti e guidare ogni conversazione verso un risultato concreto.
            </p>
            <div className="home-hero-actions">
              <Link href="/demo" className="home-primary-cta">
                Prova la demo
              </Link>
              <a href="#how" className="home-secondary-cta">
                Scopri come funziona
              </a>
            </div>
            <div className="home-micro-stats" aria-label="Indicatori">
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

          <aside className="home-hero-panel" aria-label="Anteprima prodotto">
            <div className="home-panel-card home-panel-card-primary">
              <p className="mono">Assistente attivo</p>
              <strong>Vox segue la conversazione, qualifica e smista in tempo reale.</strong>
              <ol>
                <li>Risponde in modo coerente con tono e obiettivi del brand.</li>
                <li>Raccoglie dati utili e riconosce intenti commerciali o di supporto.</li>
                <li>Attiva booking, follow-up, moduli e processi operativi.</li>
              </ol>
            </div>
            <div className="home-panel-card">
              <p className="mono">Use case</p>
              <strong>Lead qualificati, memoria cliente, contatti, email automatiche.</strong>
            </div>
          </aside>
        </section>

        <section id="features" style={{ marginTop: 18 }}>
          <p className="home-section-label mono">Funzionalita</p>
          <div className="home-grid">
            {features.map((feature, index) => (
              <article key={feature.title} className="home-feature-card">
                <span className="home-feature-index mono">
                  {String(index + 1).padStart(2, "0")} · {feature.eyebrow}
                </span>
                <h2>{feature.title}</h2>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="home-story">
          <article className="home-story-block">
            <p className="home-section-label mono">Perche funziona</p>
            <h2>Una chat che non fa scena soltanto: aiuta davvero il business.</h2>
            <p className="home-lead">
              EasyVox accorcia i tempi di risposta, migliora la qualita delle informazioni e accompagna l&apos;utente
              fino all&apos;azione desiderata con un flusso chiaro, naturale e misurabile.
            </p>
            <div className="home-grid" style={{ marginTop: 28 }}>
              {benefits.map(([title, text]) => (
                <article key={title} className="home-feature-card">
                  <h2>{title}</h2>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </article>

          <aside className="home-story-rail">
            <p className="home-section-label mono">Come funziona</p>
            {steps.map((step) => (
              <div key={step} className="home-step">
                <span className="home-step-dot" aria-hidden="true" />
                <p>{step}</p>
              </div>
            ))}
          </aside>
        </section>

        <section style={{ marginTop: 18 }}>
          <p className="home-section-label mono">Architettura</p>
          <div className="home-grid">
            {architecture.map(([title, text]) => (
              <article key={title} className="home-feature-card">
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-cta-band">
          <div>
            <p className="home-section-label mono">{BRAND_DOMAIN}</p>
            <h2>Vuoi vedere {BRAND_NAME} in azione sul tuo flusso reale?</h2>
            <p className="home-lead" style={{ color: "rgba(248, 250, 252, 0.78)", maxWidth: "52ch" }}>
              Prova la demo oppure accedi all&apos;area admin per configurare agente, contenuti e logiche operative.
            </p>
          </div>
          <div className="home-cta-links">
            <Link href="/demo" className="home-primary-cta">
              Apri demo
            </Link>
            <Link href="/login?tab=admin" className="home-inline-link">
              Area admin
            </Link>
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <p className="home-section-label mono">Modelli e stack</p>
          <div className="home-grid">
            <article className="home-feature-card">
              <h2>Chat AI embeddabile e multi-assistente</h2>
              <p>Crea figure commerciali, gestionali, di supporto o segreteria in base al contesto del cliente.</p>
            </article>
            <article className="home-feature-card">
              <h2>Famiglie modello supportate</h2>
              <p>{modelFamilies.join(", ")}.</p>
            </article>
            <article className="home-feature-card">
              <h2>Operativita controllata lato backend</h2>
              <p>Prompt centrale, chiavi server-side, knowledge base e logiche applicative sotto controllo.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
