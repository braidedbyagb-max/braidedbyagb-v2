import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteNav from '@/app/_components/SiteNav'
import SiteFooter from '@/app/_components/SiteFooter'
import ServicesClient from './ServicesClient'

export const metadata: Metadata = {
  title: 'Services & Prices — BraidedbyAGB · African Hair Braiding Farnborough',
  description: 'All BraidedbyAGB services and prices. Box braids, knotless braids, cornrows, starter locs, twists and more. Farnborough, UK.',
}

export default async function ServicesPage() {
  const supabase = createAdminClient()

  const { data: raw } = await supabase
    .from('services')
    .select(`
      id, name, slug, description, duration_mins, price_from, category,
      prep_notes, image_url, is_new,
      service_variants(price, variant_name)
    `)
    .eq('is_active', true)
    .order('display_order')

  // Compute max price and variant names from variants
  const services = (raw ?? []).map((s: any) => {
    const prices = (s.service_variants ?? []).map((v: any) => Number(v.price))
    const variantNames = (s.service_variants ?? []).map((v: any) => v.variant_name).join(', ')
    return {
      ...s,
      price_from: prices.length > 0 ? Math.min(...prices) : Number(s.price_from),
      max_price:  prices.length > 0 ? Math.max(...prices) : null,
      variant_names: variantNames || null,
    }
  })

  const categories = [...new Set(
    services.map((s: any) => s.category).filter(Boolean) as string[]
  )]

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 68 }}>

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-bg" />
          <div className="page-container">
            <div className="page-hero-content">
              <span className="page-hero-eyebrow">Farnborough, UK</span>
              <h1 className="page-hero-title">Services &amp; Prices</h1>
              <p className="page-hero-subtitle">Every style crafted with precision, care and authentic expertise.</p>
            </div>
          </div>
        </section>

        {/* Services list (client — has filter) */}
        <ServicesClient services={services} categories={categories} />

        {/* Policy reminder */}
        <section style={{ background: 'var(--color-bg)', padding: '48px 0' }}>
          <div className="page-container">
            <div className="policy-reminder-grid">
              <div className="policy-reminder-item">
                <span className="policy-icon">💳</span>
                <div>
                  <h5>30% Deposit Required</h5>
                  <p>A non-refundable deposit is required to secure all appointments.</p>
                </div>
              </div>
              <div className="policy-reminder-item">
                <span className="policy-icon">⏰</span>
                <div>
                  <h5>20-Minute Late Arrival</h5>
                  <p>Please arrive within 20 minutes of your appointment time.</p>
                </div>
              </div>
              <div className="policy-reminder-item">
                <span className="policy-icon">📅</span>
                <div>
                  <h5>48-Hour Cancellation</h5>
                  <p>Cancellations must be made at least 48 hours in advance.</p>
                </div>
              </div>
              <div className="policy-reminder-item">
                <span className="policy-icon">💬</span>
                <div>
                  <h5>Running Late?</h5>
                  <p>WhatsApp us immediately on <a href="https://wa.me/447769064971">07769 064 971</a>.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-strip">
          <div className="page-container">
            <div className="cta-strip-inner">
              <h3 className="cta-strip-title">Ready to Book Your Appointment?</h3>
              <Link href="/booking" className="btn btn-gold btn-lg">Book Now — 07769 064 971</Link>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  )
}
