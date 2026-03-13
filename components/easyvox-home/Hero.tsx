'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTypewriter } from '@/hooks/useTypewriter'

const ROTATING_WORDS = [
  'risponde ai clienti',
  'guida i visitatori',
  'raccoglie contatti',
  'automatizza il lavoro',
  'aumenta le conversioni',
]

export default function Hero() {
  const { displayText, isTyping } = useTypewriter(ROTATING_WORDS, {
    typeSpeed: 55,
    deleteSpeed: 25,
    pauseDuration: 2200,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: { x: number; y: number; vx: number; vy: number; r: number; opacity: number }[] = []

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      })
    }

    let animId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,255,0,${p.opacity})`
        ctx.fill()
      })

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(200,255,0,${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      {/* Cursor glow */}
      <div
        className="cursor-glow"
        style={{ left: mousePos.x, top: mousePos.y }}
      />

      {/* Radial gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#c8ff00]/5 blur-3xl" />
        <div className="absolute top-20 right-20 w-[300px] h-[300px] rounded-full bg-[#00e5ff]/5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 left-20 w-[200px] h-[200px] rounded-full bg-[#c8ff00]/8 blur-3xl animate-float" />
      </div>

      {/* Top bar announcement */}
      <div className="relative z-10 mb-8 flex items-center gap-2 px-4 py-2 glass rounded-full border-glow">
        <div className="w-1.5 h-1.5 rounded-full bg-[#c8ff00] animate-pulse" />
        <span className="tag text-[#c8ff00]/80">
          AI Conversazionale · Progettata per il Business
        </span>
      </div>

      {/* Main heading */}
      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        <h1
          style={{ fontFamily: 'var(--font-display)' }}
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight mb-6"
        >
          <span className="text-gradient-warm block">Il tuo sito, finalmente,</span>
          <span className="text-white/20 block text-4xl md:text-5xl lg:text-6xl font-light tracking-wide my-3">
            un assistente AI che
          </span>
          <span className="text-gradient inline-block min-h-[1.2em]">
            {displayText}
            <span
              className={`inline-block w-0.5 h-[0.85em] bg-[#c8ff00] ml-1 align-middle transition-opacity ${
                isTyping ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ verticalAlign: 'middle' }}
            />
          </span>
        </h1>

        <p
          style={{ fontFamily: 'var(--font-body)' }}
          className="mt-8 text-lg md:text-xl text-white/45 max-w-2xl mx-auto leading-relaxed font-light"
        >
          EasyVox porta sul tuo sito una presenza intelligente, attiva e personalizzata:
          un assistente AI capace di accogliere, spiegare, assistere, ricordare
          e accompagnare il cliente durante il percorso.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/demo" className="group relative px-8 py-4 bg-[#c8ff00] text-[#0a0a0f] rounded-full font-bold text-base overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(200,255,0,0.4)]">
            <span className="relative z-10">Provalo ora</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          </Link>
          <a href="#come-funziona" className="group px-8 py-4 glass glass-hover rounded-full text-white/70 hover:text-white font-medium text-base transition-all duration-300 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full border border-white/30 flex items-center justify-center group-hover:border-[#c8ff00]/50 transition-colors">
              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                <path d="M1 1L7 5L1 9V1Z" />
              </svg>
            </div>
            Scopri come funziona
          </a>
        </div>

        {/* Microcopy */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/30 text-sm">
          {[
            'Personalizzabile sulla tua attività',
            'Attivabile su sito o web app',
            'Pensato per migliorare le conversioni',
          ].map((text) => (
            <span key={text} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#c8ff00]/40" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 text-xs">
        <span className="tag">Scorri</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/20 to-transparent" />
      </div>

      {/* Decorative bottom blur */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
    </section>
  )
}
