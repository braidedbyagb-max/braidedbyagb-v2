import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'BraidedbyAGB — Hair Braiding Farnborough, Hampshire',
  description:
    'Professional hair braiding services in Farnborough, Hampshire. Knotless braids, box braids, cornrows and more. Book your appointment online.',
  openGraph: {
    title: 'BraidedbyAGB — Hair Braiding Farnborough',
    description: 'Professional hair braiding in Farnborough, Hampshire. Book your appointment online.',
    images: ['/og-image.jpg'],
  },
}

export default async function HomePage() {
  const supabase = createAdminClient()

  const { data: services } = await supabase
    .from('services')
    .select('id, name, slug, description, price_from, image_url, is_new')
    .eq('is_active', true)
    .order('display_order')
    .limit(6)

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl" style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-deep-purple)' }}>
            BraidedbyAGB
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/#services" className="hidden sm:block" style={{ color: 'var(--color-text)' }}>Services</Link>
            <Link href="/#about"    className="hidden sm:block" style={{ color: 'var(--color-text)' }}>About</Link>
            <Link href="/booking"
              className="px-4 py-2 rounded-full text-white font-bold transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}>
              Book Now
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section
          className="py-24 px-4 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--color-deep-purple) 0%, var(--color-primary) 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
               style={{ background: 'var(--color-gold)', transform: 'translate(40%, -40%)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'var(--color-gold)', transform: 'translate(-40%, 40%)' }} />

          <div className="relative max-w-3xl mx-auto">
            <div className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-6"
                 style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              Based in Farnborough, Hampshire
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight"
                style={{ fontFamily: 'var(--font-primary)' }}>
              Beautiful Braids,<br />
              <span style={{ color: 'var(--color-gold)' }}>Your Way</span>
            </h1>
            <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
              Expert hair braiding tailored to you. From knotless braids to intricate cornrows — sit back and let me do the magic.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="px-8 py-4 rounded-full font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
                style={{ background: 'var(--color-gold)', color: 'var(--color-deep-purple)' }}
              >
                Book Your Appointment
              </Link>
              <Link
                href="/#services"
                className="px-8 py-4 rounded-full font-bold text-lg transition-all hover:bg-white/20"
                style={{ border: '2px solid rgba(255,255,255,0.5)', color: '#fff' }}
              >
                View Services
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust badges ─────────────────────────────────── */}
        <section className="py-10 px-4" style={{ background: 'var(--color-bg)' }}>
          <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: '✨', label: 'Expert Stylist' },
              { icon: '📅', label: 'Easy Online Booking' },
              { icon: '💳', label: 'Secure Deposits' },
              { icon: '📍', label: 'Farnborough, Hampshire' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <span className="text-3xl">{item.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────── */}
        <section id="services" className="py-16 px-4" style={{ background: '#fff' }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
                Services
              </h2>
              <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
                Choose from our range of professional braiding styles
              </p>
            </div>

            {services && services.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
                Services coming soon — contact us to enquire.
              </div>
            )}

            <div className="text-center mt-10">
              <Link
                href="/booking"
                className="inline-block px-8 py-3.5 rounded-full font-bold transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                Book Your Appointment →
              </Link>
            </div>
          </div>
        </section>

        {/* ── About ────────────────────────────────────────── */}
        <section id="about" className="py-16 px-4" style={{ background: 'var(--color-bg)' }}>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-black mb-4" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
                  About BraidedbyAGB
                </h2>
                <p className="text-base mb-4 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  I&apos;m a professional hair braiding stylist based in Farnborough, Hampshire, with a passion for creating beautiful, long-lasting styles that celebrate your natural hair.
                </p>
                <p className="text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text)' }}>
                  Whether you&apos;re looking for protective styles, a fresh new look, or something unique — I work with you to create exactly what you envision, using premium techniques and taking care of your hair&apos;s health throughout.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/booking"
                    className="px-6 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-90 text-center"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                  >
                    Book Now
                  </Link>
                  <a
                    href="https://instagram.com/braidedbyagb"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full font-bold text-sm transition-opacity hover:opacity-80 text-center"
                    style={{ border: '2px solid var(--color-primary)', color: 'var(--color-primary)' }}
                  >
                    See My Work →
                  </a>
                </div>
              </div>

              {/* Placeholder image / decorative box */}
              <div className="rounded-2xl overflow-hidden aspect-square flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, var(--color-deep-purple), var(--color-primary))' }}>
                <div className="text-center text-white p-8">
                  <div className="text-6xl mb-4">💆‍♀️</div>
                  <p className="font-bold text-xl" style={{ fontFamily: 'var(--font-primary)' }}>BraidedbyAGB</p>
                  <p className="text-sm opacity-80 mt-1">Farnborough, Hampshire</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="py-16 px-4" style={{ background: '#fff' }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
                How It Works
              </h2>
              <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
                Booking your appointment is quick and easy
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Choose Your Style', desc: 'Browse our services and pick the perfect braiding style for you.' },
                { step: '2', title: 'Pick a Date & Time', desc: 'Select from available slots that work with your schedule.' },
                { step: '3', title: 'Pay Your Deposit', desc: 'Secure your booking with a small deposit — pay the rest on the day.' },
              ].map(item => (
                <div key={item.step} className="text-center">
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-black text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--color-deep-purple)' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/booking"
                className="inline-block px-8 py-3.5 rounded-full font-bold transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-primary)', color: '#fff' }}
              >
                Get Started →
              </Link>
            </div>
          </div>
        </section>

        {/* ── CTA banner ───────────────────────────────────── */}
        <section
          className="py-20 px-4 text-center"
          style={{ background: 'linear-gradient(135deg, var(--color-deep-purple) 0%, var(--color-primary) 100%)' }}
        >
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-primary)' }}>
              Ready to Transform Your Look?
            </h2>
            <p className="text-white/80 mb-8">
              Book your appointment today and let&apos;s create something beautiful together.
            </p>
            <Link
              href="/booking"
              className="inline-block px-8 py-4 rounded-full font-bold text-lg transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'var(--color-gold)', color: 'var(--color-deep-purple)' }}
            >
              Book Your Appointment
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-8" style={{ background: 'var(--color-deep-purple)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div>
              <p className="font-bold text-white text-lg mb-2" style={{ fontFamily: 'var(--font-primary)' }}>
                BraidedbyAGB
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Professional hair braiding in Farnborough, Hampshire.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Quick Links</p>
              <div className="space-y-2">
                {[
                  { href: '/#services', label: 'Services' },
                  { href: '/booking', label: 'Book Appointment' },
                  { href: '/#about', label: 'About' },
                ].map(l => (
                  <Link key={l.href} href={l.href} className="block text-sm hover:text-white transition-colors"
                        style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Contact</p>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <p>📍 Farnborough, Hampshire</p>
                <a href="mailto:hello@braidedbyagb.co.uk" className="block hover:text-white transition-colors">
                  ✉️ hello@braidedbyagb.co.uk
                </a>
                <a href="https://instagram.com/braidedbyagb" target="_blank" rel="noopener noreferrer"
                   className="block hover:text-white transition-colors">
                  📸 @braidedbyagb
                </a>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-xs" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
            © {new Date().getFullYear()} BraidedbyAGB. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}

// ── Service card ─────────────────────────────────────────────
function ServiceCard({ service }: { service: any }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col transition-transform hover:-translate-y-1"
         style={{ border: '1px solid var(--color-border)', background: '#fff' }}>
      {/* Image / placeholder */}
      <div className="aspect-video relative overflow-hidden flex items-center justify-center"
           style={{ background: service.image_url ? '#f3f4f6' : 'linear-gradient(135deg, var(--color-deep-purple), var(--color-primary))' }}>
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">💆‍♀️</span>
        )}
        {service.is_new && (
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--color-gold)', color: 'var(--color-deep-purple)' }}>
            NEW
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
          {service.name}
        </h3>
        {service.description && (
          <p className="text-sm mb-4 flex-1 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            {service.description.length > 100 ? service.description.slice(0, 100) + '…' : service.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3"
             style={{ borderTop: '1px solid var(--color-border)' }}>
          <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
            From £{Number(service.price_from).toFixed(0)}
          </span>
          <Link
            href="/booking"
            className="px-4 py-2 rounded-full text-sm font-bold transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  )
}
