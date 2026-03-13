"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/brand";

const rotatingWords = ["accoglie", "risponde", "qualifica", "ricorda", "converte"];

const backgroundConversation = [
  "Chat tra cliente e AI che parlano di un prodotto",
  "Cliente: Ciao, vorrei avere informazioni su un vostro prodotto.",
  "AI: Certamente. Dimmi pure quale prodotto ti interessa e ti aiuto volentieri.",
  "Cliente: Ho visto il vostro assistente AI per aziende, ma non ho capito bene cosa fa.",
  "AI: Ti spiego in modo semplice: e un assistente virtuale personalizzato che puo rispondere ai clienti, presentare prodotti o servizi, raccogliere contatti, dare informazioni utili e aiutare l azienda a gestire meglio le richieste.",
  "Cliente: Quindi e una specie di chat sul sito?",
  "AI: Si, ma non solo. Puo essere molto piu evoluto di una normale chat: puo essere configurato sul tono della tua azienda, conoscere i tuoi servizi, guidare l utente nella scelta e in alcuni casi anche automatizzare azioni come raccolta lead, supporto clienti o invio di informazioni.",
  "Cliente: Interessante. Puo essere personalizzato per la mia attivita?",
  "AI: Assolutamente si. Il sistema viene adattato in base alla tua azienda, ai tuoi prodotti, alle domande frequenti dei clienti e agli obiettivi commerciali. In pratica non e una chat generica, ma una AI costruita per parlare davvero del tuo business.",
  "Cliente: Io ho un azienda che vende arredamento. Potrebbe aiutarmi?",
  "AI: Si, molto. Per esempio potrebbe spiegare i prodotti, aiutare il cliente a scegliere in base alle esigenze, proporre articoli correlati, raccogliere richieste di preventivo e rispondere alle domande piu frequenti su misure, materiali, tempi e consegna.",
];

const featureCards = [
  {
    label: "Conversazione su misura",
    title: "Un assistente che parla come il tuo brand.",
    text: "Tono, conoscenza, obiettivi e priorita operative vengono modellati sulla tua realta.",
  },
  {
    label: "Lead e richieste",
    title: "Ogni dialogo puo diventare un passaggio concreto.",
    text: "Domande, intenti e bisogni vengono filtrati per trasformare interesse in opportunita utili.",
  },
  {
    label: "Memoria cliente",
    title: "Il contesto non si perde dopo il primo messaggio.",
    text: "Preferenze, storico e dettagli rilevanti aiutano a mantenere continuita nella relazione.",
  },
];

const flow = [
  "Analizziamo tono, offerta, pubblico e priorita del progetto.",
  "Costruiamo logica conversazionale, contenuti e raccolta dati.",
  "Colleghiamo demo, contatto, preventivo, booking o supporto operativo.",
  "Affiniamo il sistema in base ai dialoghi reali e ai risultati ottenuti.",
];

const useCases = [
  {
    title: "Aziende",
    text: "Per richieste inbound, supporto commerciale, pre-qualifica e snellimento del primo contatto.",
  },
  {
    title: "Professionisti",
    text: "Per spiegare servizi, fare filtro, raccogliere esigenze e guidare verso la consulenza.",
  },
  {
    title: "E-commerce",
    text: "Per chiarire dubbi, accompagnare la scelta e ridurre i punti di abbandono.",
  },
];

const faqs = [
  {
    question: "EasyVox e un semplice chatbot?",
    answer:
      "No. E un assistente AI configurato su contenuti, tono, processi e obiettivi commerciali reali.",
  },
  {
    question: "Si puo adattare alla mia attivita?",
    answer:
      "Si. Ogni implementazione puo essere calibrata su linguaggio, servizi, CTA, memoria e passaggi operativi.",
  },
  {
    question: "Può raccogliere richieste e contatti?",
    answer:
      "Si. Può guidare il dialogo verso demo, richiesta informazioni, appuntamento o passaggio commerciale dedicato.",
  },
  {
    question: "Resta utile anche quando il team non e disponibile?",
    answer:
      "Si. Mantiene presenza costante, filtra le richieste e prepara il terreno per il follow-up del team.",
  },
];

function useTypewriter(words: string[]) {
  const [wordIndex, setWordIndex] = useState(0);
  const [display, setDisplay] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex % words.length];
    const timer = window.setTimeout(
      () => {
        if (isDeleting) {
          const next = current.slice(0, Math.max(display.length - 1, 0));
          setDisplay(next);
          if (next.length === 0) {
            setIsDeleting(false);
            setWordIndex((value) => (value + 1) % words.length);
          }
          return;
        }

        const next = current.slice(0, display.length + 1);
        setDisplay(next);
        if (next === current) {
          window.setTimeout(() => setIsDeleting(true), 1900);
        }
      },
      isDeleting ? 42 : 82,
    );

    return () => window.clearTimeout(timer);
  }, [display, isDeleting, wordIndex, words]);

  return display || words[0];
}

export default function EasyVoxHomePage() {
  const typedWord = useTypewriter(rotatingWords);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <>
      <style jsx global>{`
        .topbar {
          display: none !important;
        }

        body {
          background: #ffffff;
        }
      `}</style>

      <main className="easyvox-cinematic">
        <div className="background-stage" aria-hidden="true">
          <div className="background-grid" />
          <div className="background-glow glow-a" />
          <div className="background-glow glow-b" />
          <div className="conversation-wall">
            <div className="conversation-text">
              {backgroundConversation.map((line, index) => (
                <p
                  key={`${line.slice(0, 24)}-${index}`}
                  className={`conversation-line ${
                    index === 0 ? "title" : line.startsWith("Cliente:") ? "client" : "ai"
                  }`}
                  style={{ ["--typing-delay" as string]: `${index * 1.1}s` }}
                >
                  <span>{line}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="blur-layer" />
          <div className="fade-layer" />
        </div>

        <section className="hero-shell">
          <header className="hero-nav">
            <div className="brand-lockup">
              <div className="brand-mark" />
              <div>
                <strong>{BRAND_NAME}</strong>
                <span>{BRAND_DOMAIN}</span>
              </div>
            </div>

            <nav>
              <a href="#capacita">Capacita</a>
              <a href="#metodo">Metodo</a>
              <a href="#contesti">Contesti</a>
              <a href="#faq">FAQ</a>
            </nav>

            <div className="nav-actions">
              <Link href="/login?tab=admin" className="nav-link ghost">
                Area admin
              </Link>
              <Link href="/demo" className="nav-link solid">
                Prova la demo
              </Link>
            </div>
          </header>

          <div className="hero-grid container">
            <div className="hero-copy glass-panel">
              <p className="eyebrow">AI conversazionale progettata per risultati concreti</p>
              <h1>
                Una presenza digitale che <span className="typed-word">{typedWord}</span>
                <span className="caret" aria-hidden="true">
                  |
                </span>
              </h1>
              <p className="lead">
                {BRAND_NAME} entra nella conversazione, capisce il contesto e accompagna ogni
                persona verso il passaggio piu utile: supporto, contatto, demo, preventivo o
                consulenza.
              </p>

              <div className="hero-actions">
                <Link href="/demo" className="nav-link solid large">
                  Guarda la demo
                </Link>
                <a href="#capacita" className="nav-link ghost large">
                  Vedi le capacita
                </a>
              </div>

              <div className="hero-metrics">
                <div>
                  <span>Operativita</span>
                  <strong>Presenza attiva 24/7</strong>
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

            <aside className="hero-aside">
              <article className="spotlight-card glass-panel">
                <p className="card-label">Flusso intelligente</p>
                <h2>Non una chat decorativa. Un motore che ascolta e indirizza.</h2>
                <ul>
                  <li>Accoglie con messaggi coerenti al brand.</li>
                  <li>Capisce bisogni commerciali e richieste operative.</li>
                  <li>Raccolta dati, filtro e attivazione del passo successivo.</li>
                </ul>
              </article>

              <article className="mini-chat glass-panel">
                <div className="mini-chat-head">
                  <span className="thread-status" />
                  <span>anteprima dialogo</span>
                </div>
                <div className="mini-bubble user">Vorrei capire se siete adatti al mio caso.</div>
                <div className="mini-bubble assistant">
                  Ti aiuto subito: ti faccio poche domande e ti porto alla soluzione migliore.
                </div>
                <div className="mini-bubble user">Mi serve qualcosa che lavori anche fuori orario.</div>
                <div className="mini-bubble assistant">
                  Perfetto. Posso restare attivo, raccogliere dettagli e preparare il follow-up.
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section id="capacita" className="content-section container">
          <div className="section-heading">
            <p className="eyebrow">Capacita</p>
            <h2>Trasparente davanti, dinamica dietro, utile in ogni passaggio.</h2>
            <p>
              La pagina resta ariosa e traslucida, mentre lo sfondo comunica in modo continuo la
              natura conversazionale del prodotto.
            </p>
          </div>

          <div className="feature-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="glass-panel feature-card">
                <p className="card-label">{card.label}</p>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="metodo" className="content-section container">
          <div className="split-panel glass-panel">
            <div className="section-heading left">
              <p className="eyebrow">Metodo</p>
              <h2>La conversazione viene progettata, non improvvisata.</h2>
              <p>
                EasyVox allinea tono, contenuti e logica operativa per portare la persona dal primo
                dubbio al passo successivo con continuita.
              </p>
            </div>

            <div className="flow-list">
              {flow.map((item, index) => (
                <div key={item} className="flow-item">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contesti" className="content-section container">
          <div className="section-heading">
            <p className="eyebrow">Contesti</p>
            <h2>Una struttura utile per chi deve spiegare, filtrare e far avanzare il dialogo.</h2>
          </div>

          <div className="use-cases">
            {useCases.map((item) => (
              <article key={item.title} className="glass-panel use-case">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <Link href="/demo" className="text-link">
                  Apri la demo
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="content-section container">
          <div className="glass-panel faq-shell">
            <div className="section-heading left">
              <p className="eyebrow">FAQ</p>
              <h2>Dubbi frequenti, risposte dirette.</h2>
            </div>

            <div className="faq-list">
              {faqs.map((item, index) => {
                const open = activeFaq === index;
                return (
                  <article key={item.question} className={`faq-item ${open ? "open" : ""}`}>
                    <button type="button" onClick={() => setActiveFaq(open ? null : index)}>
                      <span>{item.question}</span>
                      <span>{open ? "−" : "+"}</span>
                    </button>
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="content-section container cta-bottom">
          <div className="glass-panel cta-panel">
            <div>
              <p className="eyebrow">EasyVox</p>
              <h2>Se vuoi, questa puo diventare la nuova direzione della tua home.</h2>
              <p>
                La demo mostra il concept: sfondo animato, layer sfocato, struttura trasparente e
                messaggi centrati su conversazione, memoria e conversione.
              </p>
            </div>
            <div className="cta-actions">
              <Link href="/demo" className="nav-link solid large">
                Apri la demo
              </Link>
              <Link href="/login?tab=admin" className="nav-link ghost large">
                Entra in admin
              </Link>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .easyvox-cinematic {
          --bg: #ffffff;
          --bg-soft: rgba(255, 255, 255, 0.72);
          --line: rgba(7, 17, 29, 0.12);
          --line-strong: rgba(78, 172, 143, 0.28);
          --text: #0d1a2a;
          --muted: rgba(13, 26, 42, 0.68);
          --mint: #9df5d6;
          --cyan: #53bfe7;
          --gold: #f6d37c;
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: radial-gradient(circle at top, #f4fbff 0%, #ffffff 48%, #f4f8fb 100%);
          color: var(--text);
          font-family: "DM Sans", sans-serif;
        }

        .container {
          width: min(1180px, calc(100vw - 40px));
          margin: 0 auto;
        }

        .background-stage,
        .hero-shell {
          position: relative;
        }

        .background-stage {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }

        .background-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
          background-size: 72px 72px;
          mask-image: radial-gradient(circle at center, black 30%, transparent 85%);
          opacity: 0.08;
        }

        .background-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(110px);
          opacity: 0.55;
        }

        .glow-a {
          top: 8%;
          left: -8%;
          width: 420px;
          height: 420px;
          background: rgba(83, 191, 231, 0.14);
        }

        .glow-b {
          right: -10%;
          bottom: 6%;
          width: 520px;
          height: 520px;
          background: rgba(157, 245, 214, 0.12);
        }

        .conversation-wall {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8vh 6vw;
          transform: rotate(-30deg) scale(1.32);
          transform-origin: center center;
          animation: wallZoom 30s cubic-bezier(0.22, 1, 0.36, 1) infinite alternate;
          will-change: transform;
        }

        .conversation-text {
          width: min(1240px, 110vw);
          display: grid;
          gap: 18px;
          opacity: 0.4;
        }

        .conversation-line,
        .mini-chat-head {
          margin: 0;
        }

        .conversation-line {
          font-family: "DM Mono", monospace;
          font-size: clamp(1.02rem, 1.55vw, 1.34rem);
          line-height: 1.95;
          letter-spacing: -0.01em;
          color: rgba(16, 32, 51, 0.72);
        }

        .conversation-line.title {
          margin-bottom: 8px;
          font-family: "Syne", sans-serif;
          font-size: clamp(2.1rem, 4vw, 3.8rem);
          line-height: 1.1;
          letter-spacing: -0.05em;
          color: rgba(16, 32, 51, 0.44);
        }

        .conversation-line.client {
          color: rgba(135, 95, 13, 0.78);
        }

        .conversation-line.ai {
          color: rgba(12, 91, 120, 0.78);
        }

        .conversation-line span {
          display: inline-block;
          width: 0;
          overflow: hidden;
          white-space: nowrap;
          vertical-align: top;
          animation: laneTyping 11s steps(160, end) infinite;
          animation-delay: var(--typing-delay, 0s);
        }

        .thread-status {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--mint), var(--cyan));
          box-shadow: 0 0 18px rgba(115, 217, 255, 0.8);
        }

        .blur-layer {
          position: absolute;
          inset: 0;
          backdrop-filter: blur(0.6px) saturate(101%);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.01) 0%,
            rgba(255, 255, 255, 0.03) 32%,
            rgba(255, 255, 255, 0.06) 100%
          );
        }

        .fade-layer {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.02) 24%, rgba(244, 248, 251, 0.12) 100%),
            radial-gradient(circle at center, transparent 0%, rgba(244, 248, 251, 0.06) 70%);
        }

        .hero-shell {
          position: relative;
          z-index: 1;
          padding: 26px 0 34px;
        }

        .hero-nav {
          width: min(1240px, calc(100vw - 32px));
          margin: 0 auto 28px;
          padding: 14px 18px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 18px;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.58);
          backdrop-filter: blur(12px);
        }

        .brand-lockup {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .brand-mark {
          width: 16px;
          height: 16px;
          border-radius: 5px;
          background: linear-gradient(135deg, var(--mint), var(--cyan));
          box-shadow: 0 0 24px rgba(115, 217, 255, 0.6);
        }

        .brand-lockup strong,
        .hero-copy h1,
        .spotlight-card h2,
        .section-heading h2,
        .feature-card h3,
        .use-case h3,
        .cta-panel h2 {
          font-family: "Syne", sans-serif;
        }

        .brand-lockup strong {
          display: block;
          font-size: 1rem;
          letter-spacing: -0.03em;
        }

        .brand-lockup span {
          display: block;
          color: rgba(13, 26, 42, 0.5);
          font-size: 0.84rem;
        }

        .hero-nav nav {
          display: flex;
          justify-content: center;
          gap: 22px;
          flex-wrap: wrap;
        }

        .hero-nav nav a,
        .text-link {
          color: rgba(13, 26, 42, 0.72);
          text-decoration: none;
        }

        .hero-nav nav a:hover,
        .text-link:hover {
          color: #0d1a2a;
        }

        .nav-actions,
        .hero-actions,
        .cta-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .nav-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border-radius: 999px;
          border: 1px solid transparent;
          text-decoration: none;
          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .nav-link:hover {
          transform: translateY(-1px);
        }

        .nav-link.solid {
          color: #06111d;
          font-weight: 700;
          background: linear-gradient(135deg, var(--mint), #f4fffe);
          box-shadow: 0 20px 50px rgba(157, 245, 214, 0.18);
        }

        .nav-link.ghost {
          color: var(--text);
          border-color: var(--line);
          background: rgba(255, 255, 255, 0.42);
        }

        .nav-link.large {
          min-height: 52px;
          padding: 0 22px;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.16fr) minmax(320px, 0.84fr);
          gap: 22px;
          align-items: stretch;
        }

        .glass-panel {
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.38);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            0 24px 60px rgba(14, 32, 52, 0.1);
          backdrop-filter: blur(10px);
        }

        .hero-copy,
        .spotlight-card,
        .mini-chat,
        .feature-card,
        .use-case,
        .faq-shell,
        .cta-panel,
        .split-panel {
          border-radius: 32px;
        }

        .hero-copy {
          padding: 38px;
        }

        .eyebrow,
        .card-label {
          margin: 0 0 14px;
          color: var(--mint);
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          margin: 0;
          max-width: 11ch;
          font-size: clamp(3.4rem, 8vw, 6.8rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
        }

        .typed-word {
          color: var(--mint);
        }

        .caret {
          color: rgba(13, 26, 42, 0.72);
          animation: caretBlink 1s step-end infinite;
        }

        .lead,
        .section-heading p,
        .feature-card p,
        .spotlight-card li,
        .use-case p,
        .faq-answer p,
        .cta-panel p,
        .flow-item p {
          color: var(--muted);
        }

        .lead {
          max-width: 640px;
          margin: 24px 0 0;
          font-size: 1.12rem;
          line-height: 1.65;
        }

        .hero-actions {
          margin-top: 28px;
        }

        .hero-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 30px;
        }

        .hero-metrics div {
          padding: 16px 18px;
          border-radius: 22px;
          border: 1px solid rgba(7, 17, 29, 0.08);
          background: rgba(255, 255, 255, 0.36);
        }

        .hero-metrics span {
          display: block;
          margin-bottom: 8px;
          font-size: 0.82rem;
          color: rgba(13, 26, 42, 0.48);
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }

        .hero-metrics strong {
          display: block;
          font-size: 0.96rem;
          line-height: 1.4;
        }

        .hero-aside {
          display: grid;
          gap: 22px;
        }

        .spotlight-card,
        .mini-chat {
          padding: 28px;
        }

        .spotlight-card h2,
        .section-heading h2,
        .cta-panel h2 {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1.02;
          letter-spacing: -0.05em;
        }

        .spotlight-card ul {
          margin: 22px 0 0;
          padding-left: 18px;
        }

        .spotlight-card li + li {
          margin-top: 10px;
        }

        .mini-bubble {
          opacity: 1;
          max-width: 92%;
          font-size: 0.95rem;
        }

        .content-section {
          position: relative;
          z-index: 1;
          padding: 18px 0;
        }

        .section-heading {
          max-width: 760px;
          margin-bottom: 22px;
        }

        .section-heading.left {
          margin-bottom: 0;
        }

        .section-heading p {
          margin: 16px 0 0;
          font-size: 1.04rem;
          line-height: 1.65;
        }

        .feature-grid,
        .use-cases {
          display: grid;
          gap: 18px;
        }

        .feature-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .feature-card,
        .use-case {
          padding: 26px;
        }

        .feature-card h3,
        .use-case h3 {
          margin: 0 0 12px;
          font-size: 1.6rem;
          line-height: 1.1;
          letter-spacing: -0.04em;
        }

        .split-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
          gap: 28px;
          padding: 30px;
        }

        .flow-list {
          display: grid;
          gap: 14px;
        }

        .flow-item {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 14px;
          padding: 18px;
          border-radius: 22px;
          border: 1px solid rgba(7, 17, 29, 0.08);
          background: rgba(255, 255, 255, 0.34);
        }

        .flow-item span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: rgba(115, 217, 255, 0.1);
          color: var(--mint);
          font-family: "DM Mono", monospace;
          font-size: 0.98rem;
        }

        .flow-item p,
        .feature-card p,
        .use-case p,
        .cta-panel p {
          margin: 0;
          line-height: 1.65;
        }

        .use-cases {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .text-link {
          display: inline-flex;
          margin-top: 16px;
          color: var(--mint);
        }

        .faq-shell {
          padding: 30px;
        }

        .faq-list {
          margin-top: 24px;
          display: grid;
          gap: 12px;
        }

        .faq-item {
          border: 1px solid rgba(7, 17, 29, 0.08);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.34);
          overflow: hidden;
        }

        .faq-item button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          background: transparent;
          color: var(--text);
          border: 0;
          cursor: pointer;
          text-align: left;
          font: inherit;
        }

        .faq-answer {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.25s ease;
        }

        .faq-answer p {
          overflow: hidden;
          margin: 0;
          padding: 0 20px 0;
        }

        .faq-item.open .faq-answer {
          grid-template-rows: 1fr;
        }

        .faq-item.open .faq-answer p {
          padding-bottom: 18px;
        }

        .cta-bottom {
          padding-bottom: 42px;
        }

        .cta-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          padding: 30px;
        }

        @keyframes bubbleIn {
          0%,
          8% {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          14%,
          72% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          84%,
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(1.02);
          }
        }

        @keyframes laneTyping {
          0%,
          10% {
            width: 0;
          }
          26%,
          74% {
            width: 160ch;
          }
          84%,
          100% {
            width: 160ch;
          }
        }

        @keyframes threadFloat {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          50% {
            transform: translate3d(0, -28px, 0) rotate(-1.8deg);
          }
        }

        @keyframes wallZoom {
          0% {
            transform: rotate(-30deg) scale(1.22) translate3d(0%, 0%, 0);
          }
          100% {
            transform: rotate(-30deg) scale(1.42) translate3d(1.8%, -1.4%, 0);
          }
        }

        @keyframes caretBlink {
          50% {
            opacity: 0;
          }
        }

        @media (max-width: 1080px) {
          .hero-nav,
          .hero-grid,
          .feature-grid,
          .use-cases,
          .split-panel,
          .cta-panel {
            grid-template-columns: 1fr;
          }

          .hero-nav {
            justify-items: start;
          }

          .hero-nav nav {
            justify-content: flex-start;
          }

          .hero-metrics {
            grid-template-columns: 1fr;
          }

          .conversation-text {
            width: min(112vw, 900px);
            opacity: 0.34;
          }
        }

        @media (max-width: 720px) {
          .container,
          .hero-nav {
            width: min(100vw - 24px, 100%);
          }

          .hero-shell {
            padding-top: 12px;
          }

          .hero-nav,
          .hero-copy,
          .spotlight-card,
          .mini-chat,
          .feature-card,
          .use-case,
          .faq-shell,
          .cta-panel,
          .split-panel {
            border-radius: 24px;
          }

          .hero-copy,
          .spotlight-card,
          .mini-chat,
          .feature-card,
          .use-case,
          .faq-shell,
          .cta-panel,
          .split-panel {
            padding: 22px;
          }

          .hero-copy h1 {
            max-width: none;
            font-size: clamp(2.7rem, 15vw, 4.2rem);
          }

          .spotlight-card h2,
          .section-heading h2,
          .cta-panel h2 {
            font-size: clamp(1.8rem, 9vw, 2.6rem);
          }

          .conversation-wall {
            padding: 10vh 5vw;
          }

          .conversation-text {
            width: 118vw;
            gap: 12px;
            opacity: 0.28;
          }

          .conversation-line {
            font-size: 0.88rem;
            line-height: 1.7;
          }

          .conversation-line.title {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </>
  );
}
