'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

const STEPS = [
  {
    num: '01',
    title: 'Analisi della tua attività',
    desc: 'Studiamo il tuo business, la tua offerta, il tipo di clienti e gli obiettivi che vuoi raggiungere.',
  },
  {
    num: '02',
    title: 'Configurazione dell\'assistente',
    desc: 'Costruiamo il comportamento dell\'AI, definiamo tono di voce, logiche di risposta e obiettivi conversazionali.',
  },
  {
    num: '03',
    title: 'Inserimento delle informazioni',
    desc: 'L\'assistente viene alimentato con materiali, servizi, FAQ, casi d\'uso e informazioni operative.',
  },
  {
    num: '04',
    title: 'Attivazione sul tuo spazio',
    desc: 'EasyVox viene inserito nel sito, in una landing page o in una web app dedicata.',
  },
  {
    num: '05',
    title: 'Ottimizzazione continua',
    desc: 'Il progetto migliora nel tempo, in base alle domande reali degli utenti e agli obiettivi del business.',
  },
]

function StepCard({ step, index }: { step: (typeof STEPS)[0]; index: number }) {
  const { ref, isVisible } = useScrollReveal(0.2)
  const isEven = index % 2 === 0

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`flex-1 ${isEven ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
        <div
          className={`glass glass-hover rounded-2xl p-6 transition-all duration-300 hover:border-white/15 hover:-translate-y-0.5`}
        >
          <div className="flex items-start gap-4">
            <div
              style={{ fontFamily: 'var(--font-mono)' }}
              className="text-xs text-[#c8ff00]/40 font-medium mt-0.5 shrink-0"
            >
              {step.num}
            </div>
            <div>
              <h3
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-lg font-bold text-white mb-2"
              >
                {step.title}
              </h3>
              <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex w-5 h-5 shrink-0 items-center justify-center z-10">
        <div className="w-3 h-3 rounded-full bg-[#c8ff00] shadow-[0_0_12px_rgba(200,255,0,0.6)]" />
      </div>

      <div className="hidden md:block flex-1" />
    </div>
  )
}

export default function HowItWorks() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section id="come-funziona" className="relative py-32 overflow-hidden">
      <div className="absolute right-0 bottom-0 w-[600px] h-[300px] bg-[#c8ff00]/3 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-20 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="tag text-[#c8ff00]/60 mb-4">Come funziona</p>
          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-4xl md:text-6xl font-bold text-white leading-tight"
          >
            Da zero al tuo assistente AI
            <br />
            <span className="text-gradient">in pochi passi</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-[2.5rem] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/8 to-transparent hidden sm:block" />

          <div className="space-y-12">
            {STEPS.map((step, index) => (
              <StepCard key={step.num} step={step} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
