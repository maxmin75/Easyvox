'use client'

import Link from 'next/link'
import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function CTA() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full bg-[#c8ff00]/6 blur-3xl" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 text-center">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 border border-[#c8ff00]/15">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
            <span className="tag text-[#c8ff00]/70">Inizia oggi</span>
          </div>

          <h2
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6"
          >
            Vuoi vedere come
            <br />
            <span className="text-gradient">EasyVox può lavorare</span>
            <br />
            sulla tua attività?
          </h2>

          <p className="text-white/40 text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Scopri come un assistente AI conversazionale può aiutarti a presentare meglio
            ciò che fai, rispondere ai clienti in modo più efficace e creare un&apos;esperienza
            digitale più evoluta.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/demo" className="group relative px-10 py-5 bg-[#c8ff00] text-[#0a0a0f] rounded-full font-bold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_60px_rgba(200,255,0,0.4)] w-full sm:w-auto text-center">
              <span className="relative z-10">Richiedi una demo</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
            </Link>
            <Link href="/demo" className="px-10 py-5 glass glass-hover rounded-full text-white/70 hover:text-white font-medium text-lg transition-all duration-300 w-full sm:w-auto text-center">
              Parla con EasyVox
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-white/25 text-sm">
            {[
              'Progetto personalizzato',
              'Esperienza conversazionale moderna',
              'Scalabile nel tempo',
              'Orientato ai risultati',
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="rgba(200,255,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
