import type { Metadata } from 'next'
import SiteNav from '@/app/_components/SiteNav'
import SiteFooter from '@/app/_components/SiteFooter'
import ReviewFormClient from './ReviewFormClient'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = {
  title: 'Leave a Review — BraidedbyAGB',
  description: 'Share your experience at BraidedbyAGB. We love hearing from our clients!',
}

interface PageProps {
  searchParams: Promise<{ ref?: string }>
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const { ref } = await searchParams

  let prefillName: string | undefined
  let prefillEmail: string | undefined
  let prefillService: string | undefined
  let isTokenBased = false

  // If a booking ref is provided, pre-fill from the completed booking
  if (ref) {
    const supabase = createAdminClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        service_id,
        customers(name, email),
        services(name)
      `)
      .eq('booking_ref', ref.toUpperCase())
      .eq('status', 'completed')
      .single()

    if (booking) {
      isTokenBased = true
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = booking.customers as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service  = booking.services  as any
      prefillName    = customer?.name    ?? undefined
      prefillEmail   = customer?.email   ?? undefined
      prefillService = service?.name     ?? undefined
    }
  }

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 68 }}>

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-bg" />
          <div className="page-container">
            <div className="page-hero-content">
              <span className="page-hero-eyebrow">We&apos;d Love to Hear From You</span>
              <h1 className="page-hero-title">Leave a Review</h1>
              <p className="page-hero-subtitle">
                {isTokenBased
                  ? `Thank you for visiting us${prefillName ? `, ${prefillName.split(' ')[0]}` : ''}! How was your experience?`
                  : 'Your feedback helps us grow and helps other clients choose with confidence.'}
              </p>
            </div>
          </div>
        </section>

        {/* Form card */}
        <section style={{ background: 'var(--color-bg)', padding: '64px 0 80px' }}>
          <div className="page-container">
            <div style={{ maxWidth: 640, margin: '0 auto' }}>

              {isTokenBased && prefillName && (
                <div style={{
                  background: 'linear-gradient(135deg,#7A0050,#CC1A8A)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 32,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}>
                  <span style={{ fontSize: '2rem' }}>💜</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                      Hi {prefillName.split(' ')[0]}! Thank you for your visit.
                    </p>
                    {prefillService && (
                      <p style={{ margin: '4px 0 0', fontSize: '0.88rem', opacity: 0.85 }}>
                        You&apos;re reviewing: <strong>{prefillService}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: '40px 36px',
                boxShadow: '0 4px 24px rgba(122,0,80,0.08)',
              }}>
                <ReviewFormClient
                  prefillName={prefillName}
                  prefillEmail={prefillEmail}
                  prefillService={prefillService}
                  token={ref}
                  isTokenBased={isTokenBased}
                />
              </div>

              <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                All reviews are verified and published after a quick check.
              </p>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  )
}
