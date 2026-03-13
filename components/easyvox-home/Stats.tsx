'use client'

import { useEffect, useState } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

function Counter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const { ref, isVisible } = useScrollReveal(0.3)

  useEffect(() => {
    if (!isVisible) return
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(target * eased))
      if (progress === 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [isVisible, target, duration])

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      <span
        style={{ fontFamily: 'var(--font-display)' }}
        className="text-5xl md:text-7xl font-extrabold text-gradient"
      >
        {count}{suffix}
      </span>
    </div>
  )
}

const STATS = [
  { value: 24, suffix: '/7', label: 'Sempre disponibile', desc: 'Nessun orario. Nessuna pausa.' },
  { value: 80, suffix: '%', label: 'Richieste automatizzate', desc: 'Le domande ripetitive non arrivano più al tuo team.' },
  { value: 3, suffix: 'x', label: 'Più conversioni', desc: 'Un sito che dialoga converte molto di più.' },
  { value: 0, suffix: 'sec', label: 'Tempo di risposta', desc: 'Immediato. Sempre. Per ogni visitatore.' },
]

export default function Stats() {
  const { ref, isVisible } = useScrollReveal()

  const WHAT_CAN_DO = [
    'Accogliere un visitatore e capire cosa cerca',
    'Spiegare un servizio in modo semplice e professionale',
    'Guidare verso una richiesta di contatto',
    'Ridurre le domande ripetitive del 80%',
    'Offrire supporto disponibile 24/7',
    'Migliorare la percezione innovativa del brand',
    'Raccogliere dati utili per il commerciale',
    'Creare un\'esperienza più interattiva',
  ]

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <Counter target={s.value} suffix={s.suffix} />
              <p
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-white font-semibold mt-2 mb-1 text-sm"
              >
                {s.label}
              </p>
              <p className="text-white/30 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* What can do */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="tag text-[#c8ff00]/60 mb-4">Cosa può fare nel concreto</p>
              <h2
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-4xl md:text-5xl font-bold text-white leading-tight"
              >
                Dalla prima visita
                <br />
                <span className="text-gradient">all&apos;azione concreta</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WHAT_CAN_DO.map((item, i) => (
                <div
                  key={item}
                  className="flex items-start gap-3 py-3 border-b border-white/5"
                  style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateX(0)' : 'translateX(12px)',
                    transition: `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms`,
                  }}
                >
                  <span className="text-[#c8ff00] mt-0.5 text-sm">→</span>
                  <span className="text-white/55 text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
