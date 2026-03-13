'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'py-3 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5'
          : 'py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-[#c8ff00] rounded-lg opacity-20 animate-pulse" />
            <div className="absolute inset-1 bg-[#c8ff00] rounded-md flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="#0a0a0f" />
                <path d="M5 8C5 6.34 6.34 5 8 5s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z" fill="#c8ff00" opacity="0.8" />
              </svg>
            </div>
          </div>
          <span
            style={{ fontFamily: 'var(--font-display)' }}
            className="text-xl font-bold tracking-tight text-white"
          >
            EasyVox
          </span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {['Funzionalità', 'Come funziona', 'Use Case', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login?tab=admin" className="text-sm text-white/50 hover:text-white transition-colors">
            Accedi
          </Link>
          <Link href="/demo" className="px-4 py-2 bg-[#c8ff00] text-[#0a0a0f] rounded-full text-sm font-semibold hover:bg-white transition-colors duration-200">
            Richiedi demo
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white/60 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 bg-current transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-current transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-current transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mt-4 mx-6 glass rounded-2xl p-6 space-y-4">
          {['Funzionalità', 'Come funziona', 'Use Case', 'FAQ'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
              className="block text-white/70 hover:text-white transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <Link href="/demo" className="block w-full mt-2 px-4 py-3 bg-[#c8ff00] text-[#0a0a0f] rounded-full text-sm font-semibold text-center">
            Richiedi demo
          </Link>
        </div>
      )}
    </nav>
  )
}
