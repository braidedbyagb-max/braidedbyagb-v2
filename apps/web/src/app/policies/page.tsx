import type { Metadata } from 'next'
import SiteNav from '@/app/_components/SiteNav'
import SiteFooter from '@/app/_components/SiteFooter'
import PoliciesNavClient from './PoliciesNavClient'

export const metadata: Metadata = {
  title: 'Policies — BraidedbyAGB',
  description: 'BraidedbyAGB booking, cancellation, late arrival, refund and shipping policies.',
}

export default function PoliciesPage() {
  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 68 }}>

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-bg" />
          <div className="page-container">
            <div className="page-hero-content">
              <span className="page-hero-eyebrow">Important Information</span>
              <h1 className="page-hero-title">Our Policies</h1>
              <p className="page-hero-subtitle">Please read our policies before booking your appointment.</p>
            </div>
          </div>
        </section>

        <section style={{ background: '#fff', paddingBottom: 80 }}>
          <div className="page-container">
            <div className="policies-grid">

              {/* Sticky side nav — client for scroll highlight */}
              <PoliciesNavClient />

              {/* Policy sections */}
              <div className="policies-content">

                <div className="policy-section" id="deposit">
                  <h2 className="policy-section-title">💳 Deposit Policy</h2>
                  <p>A <strong>non-refundable deposit of 30%</strong> of the total service price is required to confirm all appointments. This deposit secures your time slot and covers preparation costs.</p>
                  <div className="policy-highlight">
                    <strong>Important:</strong> Your appointment is not confirmed until the deposit has been received. Bookings without a deposit will be held for 24 hours (bank transfer) before being automatically cancelled.
                  </div>
                  <p>The remaining balance is payable <strong>on the day of your appointment</strong>, either in cash or via bank transfer.</p>
                  <p>Deposits can be paid by card (Stripe) or bank transfer at the time of booking.</p>
                </div>

                <div className="policy-section" id="cancellation">
                  <h2 className="policy-section-title">📅 Cancellation Policy</h2>
                  <p>We understand that life happens. However, late cancellations affect other clients and our scheduling significantly.</p>
                  <div className="policy-highlight">
                    <strong>Cancellations must be made at least 48 hours before your appointment.</strong> Cancellations made within 48 hours of the appointment will result in the deposit being forfeited.
                  </div>
                  <p>To cancel your appointment, please WhatsApp us on <a href="https://wa.me/447769064971">07769 064 971</a> with your booking reference number.</p>
                  <p>If you cancel with more than 48 hours&apos; notice and wish to rebook, your deposit will be transferred to a new appointment within 30 days.</p>
                </div>

                <div className="policy-section" id="late-arrival">
                  <h2 className="policy-section-title">⏰ Late Arrival Policy</h2>
                  <div className="policy-highlight" style={{ borderLeftColor: 'var(--color-primary)' }}>
                    <strong>Clients are expected to arrive within 20 minutes of their scheduled appointment time.</strong> Arrivals after 20 minutes may result in your appointment being cancelled and your deposit being forfeited.
                  </div>
                  <p>We operate on a tight schedule to ensure every client receives the full time and care they deserve. Late arrivals affect not only your appointment but those of other clients.</p>
                  <p><strong>If you are running late, please WhatsApp us immediately on <a href="https://wa.me/447769064971">07769 064 971</a></strong> so we can do our best to accommodate you. Communication is key — we are always willing to work with you where possible.</p>
                  <p>Persistent late arrivals (more than twice) may result in being required to pay a full upfront payment for future bookings.</p>
                </div>

                <div className="policy-section" id="no-show">
                  <h2 className="policy-section-title">🚫 No-Show Policy</h2>
                  <p>A no-show is defined as failing to attend your appointment without prior notice.</p>
                  <div className="policy-highlight">
                    <strong>No-shows will result in the full deposit being forfeited.</strong> Clients with two or more no-shows may be required to pay the full service cost upfront for future bookings.
                  </div>
                  <p>We hold your appointment time exclusively for you. Please respect both our time and the time of other clients by letting us know as early as possible if you cannot attend.</p>
                </div>

                <div className="policy-section" id="refund">
                  <h2 className="policy-section-title">💜 Refund Policy</h2>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--color-deep-purple)', margin: '16px 0 8px' }}>Services</h3>
                  <p>Deposits are strictly non-refundable. If you are unhappy with your service, please let us know <strong>before you leave</strong> so we can address any concerns. We take client satisfaction very seriously and will always work to make things right.</p>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--color-deep-purple)', margin: '16px 0 8px' }}>Products</h3>
                  <p>We do not accept returns or offer refunds on <strong>opened hair products</strong> for hygiene reasons. Unopened products in their original packaging may be returned within 14 days of purchase with proof of purchase.</p>
                  <div className="policy-highlight">
                    If your product arrives damaged or incorrect, please WhatsApp us within 48 hours of receipt with photos and we will resolve the issue promptly.
                  </div>
                </div>

                <div className="policy-section" id="shipping">
                  <h2 className="policy-section-title">📦 Shipping Policy</h2>
                  <p>We offer <strong>UK standard delivery</strong> on all products. Orders are typically dispatched within 1–2 business days.</p>
                  <div className="policy-highlight">
                    <strong>Estimated delivery times:</strong><br />
                    Standard UK delivery: 2–5 working days<br />
                    Local Farnborough pickup: Available by arrangement (free of charge)
                  </div>
                  <p>You will receive an email notification when your order is dispatched. Shipping costs are calculated at checkout based on order size and destination.</p>
                  <p>We are not responsible for delays caused by Royal Mail or other carriers. For time-sensitive orders, please contact us before placing your order.</p>
                </div>

                <div className="policy-section" id="privacy">
                  <h2 className="policy-section-title">🔒 Privacy Policy</h2>
                  <p>BraidedbyAGB is committed to protecting your personal data in accordance with the <strong>UK General Data Protection Regulation (UK GDPR)</strong>.</p>
                  <p><strong>What we collect:</strong> Name, email address, phone number, and appointment/order details provided at the time of booking or purchase.</p>
                  <p><strong>How we use it:</strong> To process your bookings and orders, send appointment reminders and order updates, and to occasionally contact you about our services (only with your consent).</p>
                  <p><strong>Who we share it with:</strong> We do not sell or share your personal data with third parties, except where required to process payments (Stripe) or deliver orders.</p>
                  <p><strong>Your rights:</strong> You have the right to access, correct, or request deletion of your personal data at any time. To exercise these rights, please email us at <a href="mailto:hello@braidedbyagb.co.uk">hello@braidedbyagb.co.uk</a>.</p>
                  <p><strong>Data retention:</strong> We retain your data for as long as necessary to provide our services and comply with legal obligations.</p>
                  <p>By booking an appointment or placing an order, you consent to the above use of your personal data.</p>
                </div>

              </div>
            </div>
          </div>
        </section>

        <section className="cta-strip">
          <div className="page-container">
            <div className="cta-strip-inner">
              <h3 className="cta-strip-title">Questions about our policies?</h3>
              <a href="https://wa.me/447769064971" className="btn btn-gold btn-lg">WhatsApp Us — 07769 064 971</a>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  )
}
