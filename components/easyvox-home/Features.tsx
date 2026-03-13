'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

const FEATURES = [
  {
    icon: '💬',
    title: 'AI Conversazionale',
    desc: 'Interagisce in modo naturale, comprende richieste, mantiene il filo del discorso e fornisce risposte coerenti e utili.',
    accent: '#c8ff00',
  },
  {
    icon: '🎯',
    title: 'Presenta Prodotti',
    desc: 'Racconta ciò che fai, spiega vantaggi, differenze, prezzi indicativi e proposte commerciali in modo chiaro.',
    accent: '#00e5ff',
  },
  {
    icon: '📥',
    title: 'Raccoglie Contatti',
    desc: 'Accompagna il visitatore verso una richiesta di contatto, una consulenza, una prenotazione o un\'altra azione utile.',
    accent: '#c8ff00',
  },
  {
    icon: '🧠',
    title: 'Memoria Cliente',
    desc: 'Può ricordare interessi, richieste, storico e preferenze per offrire un\'esperienza più coerente e personalizzata.',
    accent: '#00e5ff',
  },
  {
    icon: '⚡',
    title: 'Supporto 24/7',
    desc: 'Disponibile in ogni momento, riduce tempi di attesa, dispersione e frustrazione. Nessuna richiesta senza risposta.',
    accent: '#c8ff00',
  },
  {
    icon: '🔗',
    title: 'Automazioni',
    desc: 'Si inserisce in processi più ampi: raccolta dati, follow-up, logiche operative e strumenti esterni.',
    accent: '#00e5ff',
  },
  {
    icon: '🎨',
    title: 'Tono di Voce',
    desc: 'Comunica in linea con il tuo brand: professionale, tecnico, istituzionale o più diretto. Mai generico.',
    accent: '#c8ff00',
  },
  {
    icon: '📊',
    title: 'CRM e Dati',
    desc: 'Le informazioni raccolte vengono organizzate per il team commerciale e per la gestione delle relazioni.',
    accent: '#00e5ff',
  },
  {
    icon: '🔧',
    title: 'Progetto Unico',
    desc: 'Non esiste un unico EasyVox uguale per tutti. Ogni installazione è costruita intorno al tuo contesto reale.',
    accent: '#c8ff00',
  },
]

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[0]
  index: number
}) {
  const { ref, isVisible } = useScrollReveal(0.05)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`group glass glass-hover rounded-2xl p-6 cursor-default transition-all duration-700 hover:border-white/15 hover:-translate-y-1`}
      style={{
        transitionDelay: `${index * 60}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${index * 60}ms, transform 0.6s ease ${index * 60}ms, background 0.3s, border-color 0.3s, translate 0.2s`,
      }}
    >
      <div
        className="text-3xl mb-4 w-12 h-12 flex items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${feature.accent}10` }}
      >
        {feature.icon}
      </div>
      <h3
        style={{ fontFamily: 'var(--font-display)' }}
        className="text-lg font-bold text-white mb-2 group-hover:text-[#c8ff00] transition-colors duration-300"
      >
        {feature.title}
      </h3>
      <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/55 transition-colors duration-300">
        {feature.desc}
      </p>
    </div>
  )
}

export default function Features() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section id="funzionalità" className="relative py-32 overflow-hidden">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#c8ff00]/3 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="tag text-[#c8ff00]/60 mb-4">Funzionalità Principali</p>
          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
          >
            Tutto ciò di cui{' '}
            <span className="text-gradient">il tuo business</span>
            <br />
            ha bisogno
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto font-light">
            Configurato sulla tua attività, in base al settore e al tipo di utilizzo desiderato.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
