'use client'

import { useScrollReveal } from '@/hooks/useScrollReveal'

export default function WhatIs() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section id="cos'è-easyvox" className="relative py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[#00e5ff]/4 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Visual */}
          <div
            ref={ref as React.RefObject<HTMLDivElement>}
            className={`transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
          >
            <div className="relative">
              {/* Chat bubble mockup */}
              <div className="glass rounded-3xl p-6 space-y-4 border border-white/6">
                {/* Header */}
                <div className="flex items-center gap-3 pb-4 border-b border-white/6">
                  <div className="w-9 h-9 rounded-xl bg-[#c8ff00]/15 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-[#c8ff00]" />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)' }} className="text-sm font-semibold text-white">
                      EasyVox
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <p className="text-xs text-white/40">Online · Risponde subito</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/80 leading-relaxed">
                      Ciao! In cosa posso aiutarti oggi?
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[#c8ff00]/10 border border-[#c8ff00]/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white/70 leading-relaxed">
                      Vorrei capire meglio i vostri prezzi e i servizi inclusi.
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-white/80 leading-relaxed">
                      Certo! Abbiamo tre piani. Per quale settore stai cercando?
                      <br />
                      <span className="text-[#c8ff00]/70">Così ti indico la soluzione più adatta 🎯</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-[#c8ff00]/10 border border-[#c8ff00]/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white/70">
                      E-commerce nel settore moda.
                    </div>
                  </div>
                  {/* Typing indicator */}
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-[#c8ff00]/60 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Input bar */}
                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                  <div className="flex-1 text-sm text-white/20 px-3 py-2 glass rounded-xl">
                    Scrivi qui la tua domanda...
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-[#c8ff00] flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="#0a0a0f">
                      <path d="M1 7L13 7M13 7L8 2M13 7L8 12" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 glass rounded-xl px-3 py-2 border border-[#c8ff00]/20 animate-float">
                <span className="tag text-[#c8ff00]">24/7 Attivo</span>
              </div>
              <div
                className="absolute -bottom-4 -left-4 glass rounded-xl px-3 py-2 border border-[#00e5ff]/20"
                style={{ animationDelay: '2s' }}
              >
                <span className="tag text-[#00e5ff]">AI Contestuale</span>
              </div>
            </div>
          </div>

          {/* Right: Text */}
          <div
            className={`transition-all duration-1000 delay-200 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
          >
            <p className="tag text-[#c8ff00]/60 mb-4">Cos&apos;è EasyVox</p>
            <h2
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-4xl md:text-5xl font-bold leading-tight text-white mb-6"
            >
              Non un chatbot statico.
              <br />
              <span className="text-gradient">Un sistema intelligente.</span>
            </h2>
            <div className="space-y-4 text-white/50 leading-relaxed text-lg font-light">
              <p>
                EasyVox è un sistema AI conversazionale pensato per aziende che vogliono comunicare
                meglio, risparmiare tempo e offrire un&apos;esperienza più moderna ai propri clienti.
              </p>
              <p>
                È un assistente AI evoluto, configurato sulla tua attività, sui tuoi servizi,
                sul tuo tono di voce e sui tuoi obiettivi. Può informare, guidare, qualificare
                richieste, supportare il cliente e integrarsi nei processi digitali dell&apos;azienda.
              </p>
              <p className="text-white/70">
                EasyVox nasce per rendere l&apos;Intelligenza Artificiale{' '}
                <span className="text-white">concreta, utile e utilizzabile davvero:</span>{' '}
                non una vetrina tecnologica, ma uno strumento operativo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
