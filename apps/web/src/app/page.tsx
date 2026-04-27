import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import NavClient from './_components/NavClient'
import ContactFormClient from './_components/ContactFormClient'

export const metadata: Metadata = {
  title: 'BraidedbyAGB — African Hair Braiding Specialist · Farnborough, UK',
  description:
    'Professional African hair braiding specialist in Farnborough, Hampshire. Knotless braids, box braids, cornrows, starter locs and more. Book online today.',
  openGraph: {
    title: 'BraidedbyAGB — African Hair Braiding Specialist · Farnborough, UK',
    description: 'Professional African hair braiding specialist in Farnborough, Hampshire. Knotless braids, box braids, cornrows, starter locs and more. Book online today.',
    images: ['/images/braidedbyagblogo.png'],
    url: 'https://braidedbyagb.co.uk',
    type: 'website',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(mins: number): string {
  if (!mins) return ''
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const SERVICE_STYLES: Record<string, { grad: string; tag: string }> = {
  knotless:  { grad: 'linear-gradient(145deg,#4B0082,#9400D3)', tag: 'Most Popular' },
  box:       { grad: 'linear-gradient(145deg,#3a0060,#7a0080)', tag: 'Classic' },
  feed:      { grad: 'linear-gradient(145deg,#2d0050,#6600aa)', tag: 'Seamless' },
  cornrow:   { grad: 'linear-gradient(145deg,#5c003c,#8B0060)', tag: 'Neat' },
  twist:     { grad: 'linear-gradient(145deg,#380060,#800080)', tag: 'Elegant' },
  loc:       { grad: 'linear-gradient(145deg,#1a0040,#4B0082)', tag: 'Protective' },
  starter:   { grad: 'linear-gradient(145deg,#1a0040,#4B0082)', tag: 'Journey' },
  faux:      { grad: 'linear-gradient(145deg,#2a0044,#660099)', tag: 'Protective' },
  kid:       { grad: 'linear-gradient(145deg,#660044,#aa0066)', tag: 'Gentle' },
  underwig:  { grad: 'linear-gradient(145deg,#3a0030,#700055)', tag: 'Foundation' },
}
const FALLBACK_STYLES = [
  { grad: 'linear-gradient(145deg,#4B0082,#800080)', tag: 'Style' },
  { grad: 'linear-gradient(145deg,#2d0050,#800080)', tag: 'Style' },
  { grad: 'linear-gradient(145deg,#500050,#9400D3)', tag: 'Style' },
]

function getServiceStyle(slug: string, idx: number): { grad: string; tag: string } {
  const lower = slug.toLowerCase()
  for (const [key, style] of Object.entries(SERVICE_STYLES)) {
    if (lower.includes(key)) return style
  }
  return FALLBACK_STYLES[idx % 3]
}

// ── Placeholder reviews ───────────────────────────────────────────────────────
const PLACEHOLDER_REVIEWS = [
  { name: 'Adaeze O.',  service: 'Knotless Braids', rating: 5, text: "Absolutely incredible work! My knotless braids are so neat and natural-looking. I've had so many compliments. Will definitely be coming back!" },
  { name: 'Fatima B.',  service: 'Box Braids',      rating: 5, text: "Professional, warm and so talented. The atmosphere was lovely and my braids lasted over 2 months. 100% recommend BraidedbyAGB." },
  { name: 'Sarah K.',   service: 'Cornrows',        rating: 5, text: "Found BraidedbyAGB on Instagram and I'm so glad I did. Punctual, professional and the results were flawless. Booking again next month!" },
  { name: 'Blessing A.',service: 'Starter Locs',    rating: 5, text: "Started my loc journey here and I couldn't be happier. So knowledgeable and patient. The aftercare advice alone was worth it!" },
]

// ── SVGs ─────────────────────────────────────────────────────────────────────
const WhatsAppSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ marginRight: 6 }}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.135 1.532 5.875L0 24l6.318-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.36-.213-3.731.89.933-3.618-.234-.372A9.818 9.818 0 1112 21.818z"/>
  </svg>
)

const InstagramSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const WhatsAppIconSvg = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.135 1.532 5.875L0 24l6.318-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.36-.213-3.731.89.933-3.618-.234-.372A9.818 9.818 0 1112 21.818z"/>
  </svg>
)

// ── Page component ────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = createAdminClient()

  // Load services + reviews in parallel
  const [{ data: services }, { data: dbReviews }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, slug, description, price_from, duration_mins, image_url, is_new')
      .eq('is_active', true)
      .order('display_order')
      .limit(9),
    supabase
      .from('reviews')
      .select('id, review_text, rating, customers(name), services(name)')
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('approved_at', { ascending: false })
      .limit(6),
  ])

  const displayReviews = dbReviews && dbReviews.length > 0
    ? dbReviews.map((r: any) => ({
        name:    r.customers?.name ?? 'Client',
        service: r.services?.name  ?? '',
        rating:  r.rating,
        text:    r.review_text,
      }))
    : PLACEHOLDER_REVIEWS

  return (
    <>
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <NavClient />

      <main style={{ paddingTop: 68 }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="sp-hero">
          <div className="sp-hero-bg">
            <Image
              src="/images/homeimg.png"
              alt=""
              fill
              className="sp-hero-img"
              priority
              style={{ objectFit: 'cover' }}
            />
            <div className="sp-hero-overlay" />
          </div>
          <div className="sp-hero-content">
            <p className="sp-hero-eyebrow">Premium Hair Studio</p>
            <h1 className="sp-hero-title">
              Precision.<br />
              Artistry.<br />
              <em>Confidence.</em>
            </h1>
            <p className="sp-hero-body">
              Welcome to BraidedbyAGB — your destination for authentic African braiding and protective styles. Expert technique, a warm private studio, and styles crafted to celebrate you.
            </p>
            <div className="sp-hero-btns">
              <Link href="/booking" className="btn btn-gold btn-lg">Book Appointment</Link>
              <Link href="#policy" className="btn btn-outline btn-lg">View Policy</Link>
            </div>
          </div>
          <div className="sp-hero-aside">
            <Image
              src="/images/homeimg.png"
              alt="BraidedbyAGB styles"
              fill
              style={{ objectFit: 'cover' }}
            />
          </div>
        </section>

        {/* ── About ────────────────────────────────────────────── */}
        <section className="sp-section sp-about" id="about">
          <div className="sp-container">
            <p className="sp-label dark">Our Founder</p>
            <h2 className="sp-title dark">Meet the creative mind<br />behind BraidedbyAGB</h2>
            <div className="sp-founder-grid">
              <div className="sp-founder-img">
                <Image
                  src="/images/founder.png"
                  alt="Glory — Founder &amp; Lead Stylist"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>
              <div className="sp-founder-body">
                <h3>Glory</h3>
                <span className="sp-founder-role">Founder &amp; Lead Stylist · Farnborough, Hampshire</span>
                <p>I founded Braidedbyagb from a deep love of African hair culture and a passion for making every client feel seen, celebrated and beautiful. I am based in Farnborough and every appointment is a one-to-one experience. No rush, no compromises, just flawless braids crafted with care.</p>
                <p>BraidedbyAGB is a luxury African hair braiding studio offering refined protective styles and bespoke braiding. With a focus on clean partings, healthy hair, and elegant finishes, every client receives a personalised experience crafted with precision and care.</p>
                <p style={{ marginTop: 14 }}>Each appointment is a relaxed, one-to-one experience designed to leave you feeling confident, polished, and celebrated — with every service delivered in excellence.</p>
                <div className="sp-usps">
                  <div className="sp-usp">
                    <span>✓</span>
                    <div>
                      <strong>Authentic Craftsmanship</strong>
                      <em>Neat, detailed braids with a luxury finish rooted in African tradition</em>
                    </div>
                  </div>
                  <div className="sp-usp">
                    <span>✓</span>
                    <div>
                      <strong>Client-Centred Experience</strong>
                      <em>Thoughtfully tailored styles in a warm, private studio just for you</em>
                    </div>
                  </div>
                  <div className="sp-usp">
                    <span>✓</span>
                    <div>
                      <strong>Long-Lasting Results</strong>
                      <em>Premium techniques and quality extensions that go the distance</em>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────── */}
        <section className="sp-section sp-services" id="services">
          <div className="sp-container">
            <p className="sp-label dark">What We Offer</p>
            <h2 className="sp-title dark">Our Services</h2>
            <p className="sp-lead dark">Every style crafted with precision and care using premium techniques.</p>

            {services && services.length > 0 && (
              <div className="sp-svc-grid">
                {services.map((svc, idx) => {
                  const style = getServiceStyle(svc.slug ?? svc.name, idx)
                  const price = Number(svc.price_from ?? 0)
                  const dur   = formatDuration(svc.duration_mins ?? 0)
                  return (
                    <article key={svc.id} className="sp-svc-card">
                      {svc.is_new && <span className="sp-badge-new">New</span>}
                      <div className="sp-svc-vis" style={{ background: style.grad }}>
                        {svc.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={svc.image_url} alt={svc.name} />
                        ) : (
                          <span className="sp-svc-tag">{style.tag}</span>
                        )}
                        <div className="sp-svc-price">From £{price.toFixed(0)}</div>
                      </div>
                      <div className="sp-svc-body">
                        <h3>{svc.name}</h3>
                        {svc.description && (
                          <p>
                            {svc.description.length > 90
                              ? svc.description.slice(0, 90) + '...'
                              : svc.description}
                          </p>
                        )}
                        <div className="sp-svc-foot">
                          {dur && <span>⏱ {dur}</span>}
                          <Link href={`/booking/${svc.slug ?? ''}`} className="btn btn-primary btn-sm">
                            Book Now
                          </Link>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}

            {/* Custom styles card */}
            <div className="sp-custom">
              <div className="sp-custom-icon">✦</div>
              <div className="sp-custom-text">
                <h3>Have Something Unique in Mind?</h3>
                <p>Zigzag cornrows, geometric partings, braids with beads, goddess styles — if you can imagine it, we can create it.</p>
                <ul>
                  <li>Geometric &amp; zigzag partings</li>
                  <li>Braids with beads or accessories</li>
                  <li>Custom cornrow patterns &amp; designs</li>
                  <li>Mixed technique styles</li>
                </ul>
              </div>
              <div className="sp-custom-cta">
                <p>Get in touch to discuss your vision</p>
                <a
                  href="https://wa.me/447769064971?text=Hi!%20I%27d%20like%20to%20enquire%20about%20a%20custom%20braid%20style%20%E2%80%94%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-gold"
                >
                  <WhatsAppSvg />
                  Chat on WhatsApp
                </a>
                <Link href="#contact" className="btn btn-outline">Send an Enquiry</Link>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/services" className="btn btn-outline btn-lg">View All Services &amp; Prices</Link>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────── */}
        <section className="sp-section sp-testimonials" id="testimonials">
          <div className="sp-container">
            <p className="sp-label dark">Testimonials</p>
            <h2 className="sp-title dark">What Our Clients Say</h2>
            <p className="sp-lead dark">Don&apos;t just take our word for it. Here&apos;s what our satisfied clients have to say about their experience with us.</p>
            <div className="sp-reviews-grid">
              {displayReviews.map((r, i) => (
                <div key={i} className="sp-review">
                  <div className="sp-stars">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={n <= r.rating ? 'on' : ''}>★</span>
                    ))}
                  </div>
                  <blockquote>&ldquo;{r.text}&rdquo;</blockquote>
                  <div className="sp-review-meta">
                    <strong>{r.name}</strong>
                    {r.service && <span>{r.service}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <Link href="/review" className="btn btn-gold">Leave a Review ★</Link>
            </div>
          </div>
        </section>

        {/* ── Contact ──────────────────────────────────────────── */}
        <section className="sp-section sp-contact" id="contact">
          <div className="sp-container">
            <p className="sp-label dark">Contact Us</p>
            <h2 className="sp-title dark">Have a question? We&apos;d love<br />to hear from you.</h2>
            <div className="sp-contact-grid">
              <div className="sp-contact-info">
                <h3>Get In Touch</h3>
                <p>We&apos;re here to help you achieve your perfect hairstyle. Reach out and let&apos;s create something beautiful together.</p>
                <div className="sp-contact-items">
                  <div className="sp-ci">
                    <span>📍</span>
                    <div>
                      <strong>Location</strong>
                      <em>Farnborough, Hampshire, UK</em>
                      <small>Serving Hampshire &amp; Surrey</small>
                    </div>
                  </div>
                  <div className="sp-ci">
                    <span>📞</span>
                    <div>
                      <strong>Phone / WhatsApp</strong>
                      <a href="tel:07769064971">07769 064 971</a>
                    </div>
                  </div>
                  <div className="sp-ci">
                    <span>✉️</span>
                    <div>
                      <strong>Email</strong>
                      <a href="mailto:hello@braidedbyagb.co.uk">hello@braidedbyagb.co.uk</a>
                      <small>We&apos;ll respond within 24 hours</small>
                    </div>
                  </div>
                </div>
                <div className="sp-social">
                  <p>Follow Our Journey</p>
                  <div className="sp-social-row">
                    <a href="https://instagram.com/BraidedbyAGB" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                      <InstagramSvg />
                      Instagram
                    </a>
                    <a href="https://wa.me/447769064971" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                      <WhatsAppIconSvg />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              <div className="sp-contact-form-wrap">
                <ContactFormClient />
              </div>
            </div>
          </div>
        </section>

        {/* ── Policy ───────────────────────────────────────────── */}
        <section className="sp-section sp-policy" id="policy">
          <div className="sp-container">
            <p className="sp-label">Booking Policy</p>
            <h2 className="sp-title">Our Booking Policy</h2>
            <p className="sp-lead">At BraidedbyAGB, your time and ours are valuable. Please read and respect our policies for a smooth experience.</p>
            <div className="sp-policy-grid">
              <div className="sp-policy-card">
                <span className="sp-policy-icon">📅</span>
                <h4>Booking &amp; Deposit</h4>
                <p>A non-refundable deposit is required to secure your appointment. This confirms your slot and is deducted from your final balance on the day.</p>
              </div>
              <div className="sp-policy-card">
                <span className="sp-policy-icon">⏰</span>
                <h4>Cancellations</h4>
                <p>Please give at least 48 hours notice to cancel or reschedule. Cancellations with less than 48 hours notice will forfeit the deposit.</p>
              </div>
              <div className="sp-policy-card">
                <span className="sp-policy-icon">🕐</span>
                <h4>Late Arrivals</h4>
                <p>If you arrive more than 20 minutes late without prior notice, we reserve the right to cancel the appointment and retain the deposit.</p>
              </div>
              <div className="sp-policy-card">
                <span className="sp-policy-icon">💇</span>
                <h4>Hair Preparation</h4>
                <p>Please arrive with clean, detangled, and fully dry hair. Hair requiring washing or detangling may incur an additional charge.</p>
              </div>
              <div className="sp-policy-card">
                <span className="sp-policy-icon">✨</span>
                <h4>Extensions</h4>
                <p>Extensions are available from our shop or you may bring your own. Please confirm requirements when booking so we can prepare everything in advance.</p>
              </div>
              <div className="sp-policy-card">
                <span className="sp-policy-icon">💳</span>
                <h4>Payment</h4>
                <p>We accept card, bank transfer, and cash. The remaining balance is due on the day. Prices shown are starting prices — final cost confirmed at booking.</p>
              </div>
            </div>
            <p className="sp-policy-note">
              Thank you for respecting my time and business. By booking with BraidedbyAGB, you agree to these terms. Let&apos;s keep things professional and smooth for both of us.
            </p>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <Link href="/policies" className="btn btn-outline">Read Full Policy</Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="sp-footer">
        <div className="sp-container">
          <div className="sp-footer-inner">
            <p>Copyright © {new Date().getFullYear()} BraidedbyAGB. All rights reserved.</p>
            <div className="sp-footer-links">
              <Link href="/policies">Privacy Policy</Link>
              <Link href="/policies#cancellation">Cancellation Policy</Link>
              <Link href="/policies#refund">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── WhatsApp float ───────────────────────────────────────── */}
      <a
        href="https://wa.me/447769064971?text=Hi%2C%20I%27d%20like%20to%20book%20an%20appointment%20at%20BraidedbyAGB"
        className="whatsapp-float"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.134.558 4.135 1.532 5.875L0 24l6.318-1.508A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.36-.213-3.731.89.933-3.618-.234-.372A9.818 9.818 0 1112 21.818z"/>
        </svg>
      </a>
    </>
  )
}
