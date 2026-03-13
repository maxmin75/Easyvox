'use client'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-8 h-8">
                <div className="absolute inset-1 bg-[#c8ff00] rounded-md flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" fill="#0a0a0f" />
                    <path d="M5 8C5 6.34 6.34 5 8 5s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z" fill="#c8ff00" opacity="0.8" />
                  </svg>
                </div>
              </div>
              <span
                style={{ fontFamily: 'var(--font-display)' }}
                className="text-xl font-bold text-white"
              >
                EasyVox
              </span>
            </div>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs">
              AI conversazionale per aziende, professionisti ed e-commerce. La tua presenza AI, progettata per parlare, guidare e supportare.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="tag text-white/30 mb-4">Prodotto</p>
            <div className="space-y-2">
              {['Funzionalità', 'Come funziona', 'Use Case', 'Prezzi'].map((link) => (
                <a key={link} href="#" className="block text-sm text-white/40 hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="tag text-white/30 mb-4">Contatti</p>
            <div className="space-y-2">
              {['Demo', 'Supporto', 'Partnership', 'Blog'].map((link) => (
                <a key={link} href="#" className="block text-sm text-white/40 hover:text-white transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs">
            © 2025 EasyVox. Tutti i diritti riservati.
          </p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Cookie', 'Termini'].map((link) => (
              <a key={link} href="#" className="text-xs text-white/20 hover:text-white/40 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
