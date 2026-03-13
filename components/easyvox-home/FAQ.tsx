'use client'

import { useState } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const FAQ_ITEMS = [
  {
    q: 'EasyVox è un semplice chatbot?',
    a: 'No. EasyVox è pensato come un assistente AI conversazionale evoluto, configurato sulla tua attività, sui tuoi contenuti e sugli obiettivi del tuo progetto. Non è una chat statica con risposte predefinite.',
  },
  {
    q: 'Si può personalizzare completamente?',
    a: 'Sì. Il sistema può essere configurato su tono di voce, contenuti, servizi, logiche di risposta, raccolta dati, flussi conversazionali e funzioni utili alla tua realtà. Ogni EasyVox è unico.',
  },
  {
    q: 'È adatto solo ai grandi business?',
    a: 'No. EasyVox può essere utile sia ad aziende strutturate sia a professionisti, attività locali ed e-commerce che vogliono migliorare la relazione con i clienti. La soluzione si adatta alla dimensione.',
  },
  {
    q: 'Può raccogliere contatti e lead?',
    a: 'Sì. Può accompagnare il visitatore verso una richiesta di contatto, una consulenza, una prenotazione o un\'altra azione utile al business, raccogliendo i dati in modo ordinato.',
  },
  {
    q: 'Può ricordare informazioni sui clienti?',
    a: 'Se previsto nella configurazione del progetto, può gestire una memoria contestuale utile a offrire un\'esperienza più coerente e personalizzata. Interessi, richieste, storico.',
  },
  {
    q: 'Si integra nei processi aziendali?',
    a: 'Può essere progettato per dialogare con logiche operative, raccolta dati e flussi organizzativi, in base alla struttura tecnica del progetto. CRM, follow-up, automazioni.',
  },
  {
    q: 'Serve avere competenze tecniche?',
    a: 'No. L\'obiettivo di EasyVox è rendere la tecnologia accessibile e utile. Ci occupiamo noi dell\'intera implementazione e configurazione.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  const { ref, isVisible } = useScrollReveal()

  return (
    <section id="faq" className="relative py-32 overflow-hidden">
      <div className="absolute left-0 bottom-0 w-[400px] h-[400px] rounded-full bg-[#c8ff00]/3 blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="tag text-[#c8ff00]/60 mb-4">Domande frequenti</p>
          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-4xl md:text-6xl font-bold text-white leading-tight"
          >
            Hai ancora dei{' '}
            <span className="text-gradient">dubbi?</span>
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="glass rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/12"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms, background 0.3s, border-color 0.3s`,
              }}
            >
              <button
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span
                  style={{ fontFamily: 'var(--font-display)' }}
                  className={`font-semibold transition-colors duration-200 ${
                    open === i ? 'text-[#c8ff00]' : 'text-white group-hover:text-white/80'
                  }`}
                >
                  {item.q}
                </span>
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ml-4 transition-all duration-300 ${
                    open === i
                      ? 'border-[#c8ff00]/50 bg-[#c8ff00]/10 rotate-45'
                      : 'border-white/20 group-hover:border-white/40'
                  }`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    className={open === i ? 'text-[#c8ff00]' : 'text-white/50'}
                  >
                    <path d="M5 2V8M2 5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </button>

              <div
                className="overflow-hidden transition-all duration-400"
                style={{ maxHeight: open === i ? '300px' : '0px' }}
              >
                <p className="px-6 pb-5 text-white/45 text-sm leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
