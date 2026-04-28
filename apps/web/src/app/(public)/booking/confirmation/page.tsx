import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Booking Confirmed — BraidedbyAGB',
  description: 'Your booking has been received.',
}

interface Props {
  searchParams: Promise<{ ref?: string; payment_intent?: string; redirect_status?: string }>
}

export default async function BookingConfirmationPage({ searchParams }: Props) {
  const params = await searchParams
  const bookingRef    = params.ref
  const redirectStatus = params.redirect_status  // 'succeeded' | 'processing' | 'requires_payment_method'
  const paymentIntent  = params.payment_intent

  if (!bookingRef) {
    return <ConfirmationError message="No booking reference found. Please contact us if you completed a booking." />
  }

  const supabase = createAdminClient()

  const [{ data: booking }, { data: settingsRows }] = await Promise.all([
    supabase
      .from('bookings')
      .select(`
        id, booking_ref, booked_date, booked_time, status,
        deposit_amount, deposit_paid, total_price, remaining_balance,
        payment_method, client_notes,
        services ( name, duration_mins ),
        service_variants ( variant_name ),
        customers ( name, email, phone ),
        booking_addons ( id, price_charged, service_addons ( name ) )
      `)
      .eq('booking_ref', bookingRef)
      .single(),
    supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['bank_account_name', 'bank_sort_code', 'bank_account_number']),
  ])

  const settings: Record<string, string> = {}
  for (const s of settingsRows ?? []) settings[s.setting_key] = s.setting_value

  if (!booking) {
    return <ConfirmationError message={`Booking ${bookingRef} not found. Please contact us.`} />
  }

  // Determine status message
  const isPaid       = booking.deposit_paid
  const isStripe     = booking.payment_method === 'stripe'
  const isBankXfer   = booking.payment_method === 'bank_transfer'
  const stripeOk     = redirectStatus === 'succeeded'
  const stripeProc   = redirectStatus === 'processing'
  const stripeFailed = redirectStatus === 'requires_payment_method'

  const service   = booking.services as any
  const variant   = booking.service_variants as any
  const customer  = booking.customers as any
  const addons    = (booking.booking_addons ?? []) as any[]

  function formatDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  function formatTime(t: string) {
    // t is like "10:00:00"
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    const ampm = hr >= 12 ? 'PM' : 'AM'
    const hr12 = hr % 12 === 0 ? 12 : hr % 12
    return `${hr12}:${m} ${ampm}`
  }
  function fmt(n: number) {
    return `£${n.toFixed(2)}`
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header icon */}
        <div className="text-center mb-8">
          {stripeFailed ? (
            <>
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                   style={{ background: '#fee2e2' }}>
                ✕
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                Payment Unsuccessful
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your booking has been reserved but the payment didn&apos;t go through.
              </p>
            </>
          ) : stripeProc ? (
            <>
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                   style={{ background: '#fef3c7' }}>
                ⏳
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#d97706' }}>
                Payment Processing
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your payment is being processed. We&apos;ll email you once it&apos;s confirmed.
              </p>
            </>
          ) : isBankXfer ? (
            <>
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                   style={{ background: '#dbeafe' }}>
                🏦
              </div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
                Booking Received!
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Please send your bank transfer deposit to secure your appointment.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                   style={{ background: '#d1fae5' }}>
                ✓
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#059669' }}>
                Booking Confirmed!
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Your deposit has been received and your appointment is secured.
              </p>
            </>
          )}
        </div>

        {/* Booking reference */}
        <div className="rounded-xl p-4 text-center mb-6"
             style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <p className="text-sm opacity-80 mb-1">Booking Reference</p>
          <p className="text-2xl font-bold tracking-wider">{booking.booking_ref}</p>
          <p className="text-xs opacity-70 mt-1">Save this reference — you&apos;ll need it if you contact us</p>
        </div>

        {/* Stripe retry link */}
        {stripeFailed && (
          <div className="rounded-xl p-4 mb-6 text-center"
               style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
            <p className="text-sm font-medium" style={{ color: '#dc2626' }}>
              Your booking has been saved. You can retry payment by{' '}
              <Link href={`/pay?ref=${bookingRef}`}
                    className="underline font-bold">
                clicking here
              </Link>
              {' '}or contact us and we&apos;ll send you a payment link.
            </p>
          </div>
        )}

        {/* Appointment summary */}
        <div className="rounded-xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Appointment Details
          </h2>

          <div className="space-y-3">
            <Row label="Service" value={[service?.name, variant?.variant_name].filter(Boolean).join(' — ')} />
            {addons.length > 0 && (
              <Row label="Add-ons" value={addons.map((a: any) => a.service_addons?.name).filter(Boolean).join(', ')} />
            )}
            <Row label="Date" value={formatDate(booking.booked_date)} />
            <Row label="Time" value={formatTime(booking.booked_time)} />
            <Row label="Duration" value={`${service?.duration_mins ?? 60} min`} />
            <div className="border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
              <Row label="Total Price"   value={fmt(Number(booking.total_price))} />
              <Row label="Deposit Due"   value={fmt(Number(booking.deposit_amount))} />
              {Number(booking.remaining_balance) > 0 && (
                <Row label="Balance Due on Day" value={fmt(Number(booking.remaining_balance))} />
              )}
            </div>
          </div>
        </div>

        {/* Customer details */}
        <div className="rounded-xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Your Details
          </h2>
          <div className="space-y-3">
            <Row label="Name"  value={customer?.name} />
            <Row label="Email" value={customer?.email} />
            <Row label="Phone" value={customer?.phone} />
            {booking.client_notes && (
              <Row label="Notes" value={booking.client_notes} />
            )}
          </div>
        </div>

        {/* Bank transfer instructions (if applicable) */}
        {isBankXfer && !isPaid && (
          <BankTransferBox
            bookingRef={bookingRef}
            depositAmount={Number(booking.deposit_amount)}
            accountName={settings.bank_account_name}
            sortCode={settings.bank_sort_code}
            accountNumber={settings.bank_account_number}
          />
        )}

        {/* What happens next */}
        <div className="rounded-xl p-6 mb-8" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            What Happens Next
          </h2>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--color-text)' }}>
            {isBankXfer && !isPaid ? (
              <>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
                  <span>Send your deposit of <strong>{fmt(Number(booking.deposit_amount))}</strong> via bank transfer using the details above, quoting your reference <strong>{bookingRef}</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>2</span>
                  <span>We&apos;ll confirm your booking by email once we receive your payment (usually within 1–2 hours during business hours).</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>3</span>
                  <span>You&apos;ll receive a reminder email 24 hours before your appointment. Please arrive 5–10 minutes early.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>4</span>
                  <span>Pay your remaining balance of <strong>{fmt(Number(booking.remaining_balance))}</strong> on the day of your appointment.</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>1</span>
                  <span>A confirmation email has been sent to <strong>{customer?.email}</strong>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--color-primary)', color: '#fff' }}>2</span>
                  <span>You&apos;ll receive a reminder email 24 hours before your appointment. Please arrive 5–10 minutes early.</span>
                </li>
                {Number(booking.remaining_balance) > 0 && (
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'var(--color-primary)', color: '#fff' }}>3</span>
                    <span>Pay your remaining balance of <strong>{fmt(Number(booking.remaining_balance))}</strong> on the day of your appointment.</span>
                  </li>
                )}
              </>
            )}
          </ol>
        </div>

        {/* Cancellation policy */}
        <div className="rounded-xl p-4 mb-8 text-sm" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
          <p className="font-semibold mb-1" style={{ color: '#c2410c' }}>Cancellation Policy</p>
          <p style={{ color: '#9a3412' }}>
            Cancellations made less than 48 hours before your appointment will forfeit your deposit.
            Please contact us as early as possible if you need to reschedule.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 text-center">
          <Link
            href="/"
            className="flex-1 px-6 py-3 rounded-full font-bold transition-opacity hover:opacity-80 text-sm"
            style={{ background: 'var(--color-primary)', color: '#fff' }}
          >
            Back to Home
          </Link>
          <a
            href={`https://wa.me/447769064971?text=Hi%2C%20my%20booking%20reference%20is%20${bookingRef}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-6 py-3 rounded-full font-bold transition-opacity hover:opacity-80 text-sm"
            style={{ background: '#25D366', color: '#fff' }}
          >
            Contact Us on WhatsApp
          </a>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="font-medium flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-right font-medium" style={{ color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function BankTransferBox({
  bookingRef, depositAmount, accountName, sortCode, accountNumber,
}: {
  bookingRef: string
  depositAmount: number
  accountName?: string
  sortCode?: string
  accountNumber?: string
}) {
  return (
    <div className="rounded-xl p-6 mb-6" style={{ background: '#eff6ff', border: '2px solid #3b82f6' }}>
      <h2 className="font-bold text-lg mb-1" style={{ color: '#1d4ed8' }}>
        Bank Transfer Details
      </h2>
      <p className="text-sm mb-4" style={{ color: '#1e40af' }}>
        Please transfer <strong>£{depositAmount.toFixed(2)}</strong> within 24 hours to secure your booking.
      </p>
      <div className="space-y-3 text-sm">
        <BankRow label="Account Name"   value={accountName ?? 'BraidedbyAGB'} />
        <BankRow label="Sort Code"      value={sortCode ?? '—'} />
        <BankRow label="Account Number" value={accountNumber ?? '—'} />
        <div className="border-t pt-3" style={{ borderColor: '#bfdbfe' }}>
          <BankRow label="Payment Reference" value={bookingRef} highlight />
        </div>
      </div>
      <p className="text-xs mt-3" style={{ color: '#3730a3' }}>
        ⚠ Always use your booking reference as the payment reference so we can match your payment.
      </p>
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

function ConfirmationError({ message }: { message: string }) {
  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
             style={{ background: '#fee2e2' }}>
          !
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-deep-purple)' }}>
          Booking Not Found
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {message}
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/booking"
                className="px-6 py-3 rounded-full font-bold text-sm"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
            Make a New Booking
          </Link>
          <a href="mailto:hello@braidedbyagb.co.uk"
             className="px-6 py-3 rounded-full font-bold text-sm"
             style={{ background: 'var(--color-deep-purple)', color: '#fff' }}>
            Contact Us
          </a>
        </div>
      </div>
    </div>
  )
}
