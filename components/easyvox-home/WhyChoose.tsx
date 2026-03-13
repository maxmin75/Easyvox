'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

const BENEFITS = [
  { title: 'Risponde subito', desc: 'I clienti vogliono risposte rapide. EasyVox è disponibile in ogni momento, 24 ore su 24.' },
  { title: 'Spiega meglio', desc: 'Servizi complessi, modalità operative, differenze tra prodotti: tutto reso più chiaro e accessibile.' },
  { title: 'Genera contatti', desc: 'Una conversazione ben guidata diventa una richiesta concreta. Dal visitatore al lead qualificato.' },
  { title: 'Migliora l\'UX', desc: 'Interagire con un\'AI ben costruita è più semplice e spesso più efficace di navigare tra pagine disperse.' },
  { title: 'Alleggerisce il lavoro', desc: 'Molte richieste ripetitive gestite in automatico, liberando tempo per attività ad alto valore.' },
  { title: 'Si adatta a te', desc: 'Ogni progetto EasyVox è costruito in base alla tua tipologia di azienda, ai processi e agli obiettivi.' },
]

function BenefitCard({ benefit, index }: { benefit: (typeof BENEFITS)[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.1)

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="group relative overflow-hidden glass rounded-2xl p-8 transition-all duration-300 hover:border-white/15 cursor-default"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${index * 80}ms, transform 0.6s ease ${index * 80}ms, border-color 0.3s`,
      }}
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#c8ff00]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div
        style={{ fontFamily: 'var(--font-mono)' }}
        className="text-xs text-[#c8ff00]/30 mb-4"
      >
        {String(index + 1).padStart(2, '0')}
      </div>
      <h3
        style={{ fontFamily: 'var(--font-display)' }}
        className="text-xl font-bold text-white mb-3 group-hover:text-[#c8ff00] transition-colors duration-300"
      >
        {benefit.title}
      </h3>
      <p className="text-white/40 text-sm leading-relaxed">{benefit.desc}</p>
    </div>
  )
}

export default function WhyChoose() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-[#c8ff00]/3 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`mb-16 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="tag text-[#c8ff00]/60 mb-4">Perché sceglierlo</p>
          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-tight"
          >
            Perché EasyVox può fare{' '}
            <span className="text-gradient">la differenza</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((benefit, index) => (
            <BenefitCard key={benefit.title} benefit={benefit} index={index} />
          ))}
        </div>

        {/* Value prop block */}
        <div className="mt-16 glass rounded-3xl p-8 md:p-12 border border-[#c8ff00]/10">
          <div className="max-w-3xl">
            <h3
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight"
            >
              Non solo una chat.{' '}
              <span className="text-gradient">Un nuovo modo di stare online.</span>
            </h3>
            <p className="text-white/45 text-lg leading-relaxed font-light">
              La maggior parte dei siti mostra informazioni. EasyVox interagisce.
              Questo significa passare da una presenza passiva a una presenza attiva,
              capace di dialogare con il visitatore, comprenderne il bisogno e accompagnarlo.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
