import Link from 'next/link'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Nav */}
      <header className="sticky top-0 z-50 shadow-sm"
              style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{
            fontFamily: 'var(--font-primary)',
            color: 'var(--color-deep-purple)',
          }}>
            BraidedbyAGB
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/booking"
              className="px-4 py-2 rounded-full text-white font-bold transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              Book Now
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="py-8 mt-auto" style={{ background: 'var(--color-deep-purple)' }}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-bold text-white text-lg mb-1"
             style={{ fontFamily: 'var(--font-primary)' }}>
            BraidedbyAGB
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Farnborough, Hampshire · hello@braidedbyagb.co.uk
          </p>
        </div>
      </footer>
    </>
  )
}
