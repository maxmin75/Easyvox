'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const USE_CASES = [
  {
    id: 'aziende',
    label: 'Aziende',
    icon: '🏢',
    headline: 'Per chi gestisce relazioni complesse',
    desc: 'Migliorare comunicazione, gestione richieste, supporto commerciale e organizzazione dei contatti. EasyVox diventa il punto di contatto per nuovi prospect e clienti esistenti.',
    actions: [
      'Spiega attività, tempi e modalità operative',
      'Raccoglie richieste di contatto qualificate',
      'Risponde alle FAQ senza intervento umano',
      'Supporta il team commerciale',
    ],
  },
  {
    id: 'professionisti',
    label: 'Professionisti',
    icon: '👤',
    headline: 'Per chi lavora con il proprio tempo',
    desc: 'Spiegare servizi, rispondere alle domande frequenti e guidare nuovi potenziali clienti verso una consulenza. Senza perdere ore a rispondere sempre alle stesse domande.',
    actions: [
      'Filtra richieste e pre-qualifica i clienti',
      'Spiega i servizi in modo professionale',
      'Guida verso la prenotazione di una consulenza',
      'Disponibile anche fuori orario',
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    icon: '🛒',
    headline: 'Per chi vende online',
    desc: 'Supporta il cliente nella scelta, presenta prodotti, chiarisce dubbi e aumenta la qualità dell\'esperienza di acquisto. Meno carrelli abbandonati, più conversioni.',
    actions: [
      'Aiuta a trovare il prodotto giusto',
      'Risponde a domande su taglie, materiali, spedizioni',
      'Propone soluzioni pertinenti ai bisogni',
      'Riduce le richieste di reso',
    ],
  },
  {
    id: 'locali',
    label: 'Attività Locali',
    icon: '📍',
    headline: 'Per chi vuole essere trovato e capito',
    desc: 'Rispondere rapidamente, fornire informazioni utili, raccogliere richieste e dare un\'immagine più innovativa. Anche la piccola attività può avere un assistente AI.',
    actions: [
      'Fornisce informazioni su orari e servizi',
      'Raccoglie prenotazioni e richieste',
      'Dà un\'immagine moderna e professionale',
      'Risponde in ogni momento',
    ],
  },
]

export default function UseCases() {
  const [active, setActive] = useState('aziende')
  const { ref, isVisible } = useScrollReveal()
  const current = USE_CASES.find((u) => u.id === active)!

  return (
    <section id="use-case" className="relative py-32 overflow-hidden">
      <div className="absolute right-0 top-1/4 w-[300px] h-[500px] bg-[#00e5ff]/4 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="tag text-[#c8ff00]/60 mb-4">Use Case</p>
          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-4xl md:text-6xl font-bold text-white leading-tight"
          >
            Pensato per chi vuole
            <br />
            <span className="text-gradient">un sito più intelligente</span>
          </h2>
        </div>

        {/* Tab selector */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {USE_CASES.map((u) => (
            <button
              key={u.id}
              onClick={() => setActive(u.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                active === u.id
                  ? 'bg-[#c8ff00] text-[#0a0a0f]'
                  : 'glass glass-hover text-white/50 hover:text-white'
              }`}
            >
              <span>{u.icon}</span>
              <span>{u.label}</span>
            </button>
          ))}
        </div>

        {/* Active content */}
        <div
          key={active}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in"
          style={{
            animation: 'fadeSlideIn 0.4s ease forwards',
          }}
        >
          <div className="glass rounded-3xl p-8 md:p-10">
            <div className="text-5xl mb-6">{current.icon}</div>
            <h3
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-2xl md:text-3xl font-bold text-white mb-4"
            >
              {current.headline}
            </h3>
            <p className="text-white/45 leading-relaxed text-base mb-6">{current.desc}</p>
            <Link href="/demo" className="inline-block px-6 py-3 bg-[#c8ff00] text-[#0a0a0f] rounded-full text-sm font-bold hover:bg-white transition-colors duration-200">
              Scopri la soluzione →
            </Link>
          </div>

          <div className="space-y-3">
            {current.actions.map((action, i) => (
              <div
                key={action}
                className="flex items-center gap-4 glass rounded-xl px-5 py-4 transition-all duration-300 hover:border-white/15"
                style={{
                  animation: `fadeSlideIn 0.4s ease ${i * 80}ms forwards`,
                  opacity: 0,
                }}
              >
                <div className="w-5 h-5 rounded-full bg-[#c8ff00]/15 border border-[#c8ff00]/30 flex items-center justify-center shrink-0">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="#c8ff00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-white/65 text-sm">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  )
}
