'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BookingInfo {
  id: number
  booking_ref: string
  booked_date: string
  booked_time: string
  deposit_amount: number
  total_price: number
  remaining_balance: number
  payment_method_allowed: 'stripe' | 'bank_transfer' | 'both'
  payment_token: string
  service_name: string
  duration_mins: number
  addons: string[]
  customer_name: string
  customer_email: string
}

interface Props {
  booking: BookingInfo
  settings: Record<string, string>
}

function formatDate(d: string) {
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const hr12 = hr % 12 === 0 ? 12 : hr % 12
  return `${hr12}:${m} ${ampm}`
}
function fmt(n: number) { return `£${n.toFixed(2)}` }

export default function PayPageClient({ booking, settings }: Props) {
  const [activeTab, setActiveTab] = useState<'stripe' | 'bank_transfer'>(
    booking.payment_method_allowed === 'bank_transfer' ? 'bank_transfer' : 'stripe'
  )
  const [clientSecret, setClientSecret] = useState('')
  const [loadingIntent, setLoadingIntent] = useState(false)
  const [intentError, setIntentError] = useState('')

  const showStripe = booking.payment_method_allowed === 'stripe' || booking.payment_method_allowed === 'both'
  const showBank   = booking.payment_method_allowed === 'bank_transfer' || booking.payment_method_allowed === 'both'

  async function getPaymentIntent() {
    if (clientSecret) return
    setLoadingIntent(true)
    setIntentError('')
    try {
      const res = await fetch('/api/bookings/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_ref: booking.booking_ref }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.client_secret)
    } catch (err: any) {
      setIntentError(err.message)
    } finally {
      setLoadingIntent(false)
    }
  }

  // Auto-load intent if stripe is the only / default tab
  // We call this lazily when the Stripe tab is selected

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
            Complete Your Booking
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Pay your deposit to secure your appointment with BraidedbyAGB
          </p>
        </div>

        {/* Booking summary */}
        <div className="rounded-xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Appointment Summary
          </h2>
          <div className="space-y-2 text-sm">
            <SummaryRow label="Ref"      value={booking.booking_ref} bold />
            <SummaryRow label="Service"  value={booking.service_name} />
            {booking.addons.length > 0 && (
              <SummaryRow label="Add-ons" value={booking.addons.join(', ')} />
            )}
            <SummaryRow label="Date"     value={formatDate(booking.booked_date)} />
            <SummaryRow label="Time"     value={formatTime(booking.booked_time)} />
            <SummaryRow label="For"      value={booking.customer_name} />
            <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--color-border)' }}>
              <SummaryRow label="Total"        value={fmt(booking.total_price)} />
              <SummaryRow label="Deposit Due"  value={fmt(booking.deposit_amount)} bold />
              {booking.remaining_balance > 0 && (
                <SummaryRow label="Balance on Day" value={fmt(booking.remaining_balance)} />
              )}
            </div>
          </div>
        </div>

        {/* Payment section */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {/* Tabs (only if both methods allowed) */}
          {booking.payment_method_allowed === 'both' && (
            <div className="flex" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <TabButton
                active={activeTab === 'stripe'}
                onClick={() => { setActiveTab('stripe'); getPaymentIntent() }}
                label="💳 Pay by Card"
              />
              <TabButton
                active={activeTab === 'bank_transfer'}
                onClick={() => setActiveTab('bank_transfer')}
                label="🏦 Bank Transfer"
              />
            </div>
          )}

          <div className="p-6 bg-white">
            {/* Stripe payment */}
            {showStripe && (activeTab === 'stripe' || booking.payment_method_allowed === 'stripe') && (
              <div style={{ display: activeTab === 'stripe' ? 'block' : 'none' }}>
                {loadingIntent && (
                  <div className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Preparing payment form…
                  </div>
                )}
                {intentError && (
                  <div className="rounded-lg p-4 text-sm mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    {intentError}
                  </div>
                )}
                {!clientSecret && !loadingIntent && !intentError && (
                  <button
                    onClick={getPaymentIntent}
                    className="w-full py-3 rounded-full font-bold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    Load Payment Form
                  </button>
                )}
                {clientSecret && (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: { colorPrimary: '#CC1A8A', borderRadius: '12px' },
                      },
                    }}
                  >
                    <StripePayForm
                      bookingRef={booking.booking_ref}
                      depositAmount={booking.deposit_amount}
                    />
                  </Elements>
                )}
              </div>
            )}

            {/* Bank transfer */}
            {showBank && (activeTab === 'bank_transfer' || booking.payment_method_allowed === 'bank_transfer') && (
              <div style={{ display: activeTab === 'bank_transfer' ? 'block' : 'none' }}>
                <BankTransferPanel
                  bookingRef={booking.booking_ref}
                  depositAmount={booking.deposit_amount}
                  accountName={settings.bank_account_name}
                  sortCode={settings.bank_sort_code}
                  accountNumber={settings.bank_account_number}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cancellation note */}
        <p className="mt-6 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          By paying, you agree to our cancellation policy. Cancellations within 48 hours of your appointment will forfeit your deposit.
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-3 text-sm font-semibold transition-colors"
      style={{
        background: active ? '#fff' : '#f9fafb',
        color:      active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'} style={{ color: 'var(--color-text)', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

function BankTransferPanel({
  bookingRef, depositAmount, accountName, sortCode, accountNumber,
}: {
  bookingRef: string
  depositAmount: number
  accountName?: string
  sortCode?: string
  accountNumber?: string
}) {
  return (
    <div>
      <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--color-deep-purple)' }}>
        Bank Transfer Details
      </h3>
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
        Transfer <strong>£{depositAmount.toFixed(2)}</strong> to the details below. Use your booking reference as the payment reference so we can match it.
      </p>

      <div className="rounded-xl p-5 space-y-3 text-sm" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <BankRow label="Account Name"      value={accountName ?? 'BraidedbyAGB'} />
        <BankRow label="Sort Code"         value={sortCode ?? '—'} />
        <BankRow label="Account Number"    value={accountNumber ?? '—'} />
        <div className="border-t pt-3" style={{ borderColor: '#bfdbfe' }}>
          <BankRow label="Payment Reference" value={bookingRef} highlight />
        </div>
      </div>

      <div className="mt-4 rounded-lg p-3 text-xs" style={{ background: '#fef3c7', color: '#92400e' }}>
        ⏳ Your appointment will be confirmed within 1–2 hours of receiving your payment during business hours.
      </div>
    </div>
  )
}

function BankRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: '#1e40af' }}>{label}</span>
      <span className="font-bold font-mono" style={{ color: highlight ? '#7c3aed' : '#1d4ed8' }}>
        {value}
      </span>
    </div>
  )
}

// ── Stripe form ───────────────────────────────────────────────
function StripePayForm({ bookingRef, depositAmount }: { bookingRef: string; depositAmount: number }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying,    setPaying]    = useState(false)
  const [payError,  setPayError]  = useState('')

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setPayError('')
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/booking/confirmation?ref=${bookingRef}`,
        },
      })
      if (error) {
        setPayError(error.message ?? 'Payment failed. Please try again.')
      }
      // On success Stripe redirects to return_url — control never reaches here
    } catch (err: any) {
      setPayError(err.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement className="mb-5" />

      {payError && (
        <div className="rounded-lg p-3 text-sm mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {payError}
        </div>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full py-3.5 rounded-full font-bold text-white transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {paying ? 'Processing…' : `Pay Deposit — £${depositAmount.toFixed(2)}`}
      </button>

      <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-muted)' }}>
        🔒 Payments are processed securely by Stripe
      </p>
    </form>
  )
}
