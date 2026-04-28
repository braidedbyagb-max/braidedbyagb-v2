'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Pending',        color: '#92400e', bg: '#fef3c7' },
  confirmed:      { label: 'Confirmed',      color: '#065f46', bg: '#d1fae5' },
  completed:      { label: 'Completed',      color: '#1e40af', bg: '#dbeafe' },
  cancelled:      { label: 'Cancelled',      color: '#991b1b', bg: '#fee2e2' },
  late_cancelled: { label: 'Late Cancel',    color: '#7c2d12', bg: '#ffedd5' },
  no_show:        { label: 'No Show',        color: '#4b5563', bg: '#f3f4f6' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CONFIG[status] ?? { label: status, color: '#4b5563', bg: '#f3f4f6' }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

interface Props {
  booking: any
  activity: any[]
}

export default function BookingDetailClient({ booking, activity }: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [loading,      setLoading]      = useState<string | null>(null)
  const [note,         setNote]         = useState('')
  const [addingNote,   setAddingNote]   = useState(false)
  const [showComplete, setShowComplete] = useState(false)
  const [balanceMethod, setBalanceMethod] = useState<'cash' | 'card' | 'none'>('cash')
  const [actionError,  setActionError]  = useState<string | null>(null)
  const [paymentLink,  setPaymentLink]  = useState(booking.payment_token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/pay?token=${booking.payment_token}`
    : null)

  const hasBalance = Number(booking.remaining_balance) > 0

  // ── Simple status update (confirm / no_show) ──────────────
  async function updateStatus(newStatus: string) {
    setLoading(newStatus)
    setActionError(null)
    await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id)
    await supabase.from('booking_activity').insert({
      booking_id: booking.id,
      actor: 'admin',
      note: `Status changed to ${newStatus}`,
    })
    setLoading(null)
    router.refresh()
  }

  // ── Complete booking → API route (accounting + loyalty + invoice) ──
  async function completeBooking() {
    setLoading('completed')
    setActionError(null)
    const method = hasBalance ? balanceMethod : 'none'
    try {
      const res = await fetch('/api/admin/bookings/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_id: booking.id, balance_method: method }),
      })
      if (!res.ok) {
        const d = await res.json()
        setActionError(d.error ?? 'Failed to complete booking')
      }
    } catch {
      setActionError('Network error — please try again')
    }
    setLoading(null)
    setShowComplete(false)
    router.refresh()
  }

  // ── Cancel booking → API route (archive + journal + email) ───
  async function cancelBooking(newStatus: 'cancelled' | 'late_cancelled' | 'no_show') {
    setLoading(newStatus)
    setActionError(null)
    try {
      const res = await fetch('/api/admin/bookings/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ booking_id: booking.id, status: newStatus }),
      })
      if (!res.ok) {
        const d = await res.json()
        setActionError(d.error ?? 'Failed to cancel booking')
      }
    } catch {
      setActionError('Network error — please try again')
    }
    setLoading(null)
    router.refresh()
  }

  async function confirmDeposit() {
    setLoading('confirm_deposit')
    try {
      const res = await fetch('/api/admin/bookings/confirm-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking.id }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Failed to confirm deposit')
      }
    } finally {
      setLoading(null)
      router.refresh()
    }
  }

  async function generatePaymentLink() {
    setLoading('payment_link')
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    await supabase.from('bookings').update({ payment_token: token }).eq('id', booking.id)
    const link = `${window.location.origin}/pay?token=${token}`
    setPaymentLink(link)
    setLoading(null)
  }

  async function addNote() {
    if (!note.trim()) return
    setAddingNote(true)
    await supabase.from('booking_activity').insert({
      booking_id: booking.id,
      actor: 'admin',
      note: note.trim(),
    })
    setNote('')
    setAddingNote(false)
    router.refresh()
  }

  const customer = booking.customers
  const service  = booking.services
  const addons   = booking.booking_addons ?? []
  const isPending    = booking.status === 'pending'
  const isConfirmed  = booking.status === 'confirmed'
  const isCompleted  = booking.status === 'completed'
  const isCancellable = ['pending', 'confirmed'].includes(booking.status)

  return (
    <div className="max-w-5xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/bookings"
           className="text-sm font-medium"
           style={{ color: 'var(--color-text-muted)' }}>
          ← Bookings
        </a>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-mono font-bold" style={{ color: 'var(--color-primary)' }}>
          {booking.booking_ref}
        </span>
      </div>

      {/* Archived banner */}
      {booking.is_archived && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
          ⚠ This booking is archived.{' '}
          <button
            onClick={() => updateStatus('cancelled')}
            className="underline ml-1"
          >
            Restore
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Booking summary */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
                  {booking.booking_ref}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Created {new Date(booking.created_at).toLocaleDateString('en-GB')}
                </p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1"
                   style={{ color: 'var(--color-text-muted)' }}>Service</p>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {service?.name ?? '—'}
                  {booking.service_variants?.variant_name && (
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {' '}— {booking.service_variants.variant_name}
                    </span>
                  )}
                </p>
                {service?.duration_mins && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {service.duration_mins} mins
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1"
                   style={{ color: 'var(--color-text-muted)' }}>Date & Time</p>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {formatDate(booking.booked_date)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {formatTime(booking.booked_time)}
                </p>
              </div>
            </div>

            {/* Add-ons */}
            {addons.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-2"
                   style={{ color: 'var(--color-text-muted)' }}>Add-ons</p>
                {addons.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{a.service_addons?.name}</span>
                    <span className="font-medium">£{Number(a.price_charged).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Price breakdown */}
            <div className="mt-4 pt-4 border-t space-y-2 text-sm"
                 style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Total Price</span>
                <span className="font-semibold">£{Number(booking.total_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Deposit</span>
                <span className={`font-semibold ${booking.deposit_paid ? 'text-green-600' : 'text-amber-600'}`}>
                  £{Number(booking.deposit_amount).toFixed(2)} {booking.deposit_paid ? '✓ Paid' : '(unpaid)'}
                </span>
              </div>
              {Number(booking.remaining_balance) > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Balance Due</span>
                  <span className="font-bold text-base" style={{ color: 'var(--color-primary)' }}>
                    £{Number(booking.remaining_balance).toFixed(2)}
                  </span>
                </div>
              )}
              {Number(booking.loyalty_discount) > 0 && (
                <div className="flex justify-between text-purple-700">
                  <span>Loyalty discount</span>
                  <span>−£{Number(booking.loyalty_discount).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Client notes */}
            {booking.client_notes && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1"
                   style={{ color: 'var(--color-text-muted)' }}>Client Notes</p>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>{booking.client_notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
                style={{ color: 'var(--color-text-muted)' }}>Actions</h3>

            {actionError && (
              <div className="mb-3 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                {actionError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {isPending && !booking.deposit_paid && booking.payment_method === 'bank_transfer' && (
                <ActionBtn
                  label={loading === 'confirm_deposit' ? 'Confirming…' : '✓ Confirm Bank Transfer'}
                  onClick={confirmDeposit}
                  loading={loading === 'confirm_deposit'}
                  variant="success"
                />
              )}
              {isPending && (
                <ActionBtn
                  label="Confirm Booking"
                  onClick={() => updateStatus('confirmed')}
                  loading={loading === 'confirmed'}
                  variant="primary"
                />
              )}
              {isConfirmed && !showComplete && (
                <ActionBtn
                  label="Mark Completed"
                  onClick={() => setShowComplete(true)}
                  loading={false}
                  variant="primary"
                />
              )}
              {isCancellable && (
                <>
                  <ActionBtn
                    label={loading === 'cancelled' ? 'Cancelling…' : 'Cancel'}
                    onClick={() => cancelBooking('cancelled')}
                    loading={loading === 'cancelled'}
                    variant="danger"
                  />
                  <ActionBtn
                    label={loading === 'late_cancelled' ? 'Cancelling…' : 'Late Cancel (fee)'}
                    onClick={() => cancelBooking('late_cancelled')}
                    loading={loading === 'late_cancelled'}
                    variant="warning"
                  />
                </>
              )}
              {!isCompleted && (
                <ActionBtn
                  label={loading === 'no_show' ? 'Saving…' : 'No Show'}
                  onClick={() => cancelBooking('no_show')}
                  loading={loading === 'no_show'}
                  variant="warning"
                />
              )}
            </div>

            {/* Completion panel — payment method selector */}
            {showComplete && (
              <div className="mt-4 p-4 rounded-xl border"
                   style={{ borderColor: 'var(--color-border)', background: '#f9fafb' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-deep-purple)' }}>
                  {hasBalance
                    ? `How was the £${Number(booking.remaining_balance).toFixed(2)} balance collected?`
                    : 'Confirm completion — no balance due.'}
                </p>
                {hasBalance && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {([
                      { value: 'cash', label: '💵 Cash' },
                      { value: 'card', label: '💳 Card (terminal)' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setBalanceMethod(opt.value)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                        style={{
                          borderColor: balanceMethod === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                          background:  balanceMethod === opt.value ? 'var(--color-primary)' : '#fff',
                          color:       balanceMethod === opt.value ? '#fff' : 'var(--color-text)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  This will create accounting entries, award loyalty points, and send a receipt to the client.
                </p>
                <div className="flex gap-2">
                  <ActionBtn
                    label={loading === 'completed' ? 'Completing…' : '✓ Confirm Complete'}
                    onClick={completeBooking}
                    loading={loading === 'completed'}
                    variant="success"
                  />
                  <button
                    onClick={() => setShowComplete(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment link */}
          {!isCompleted && !booking.is_archived && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3"
                  style={{ color: 'var(--color-text-muted)' }}>Payment Link</h3>
              {paymentLink ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={paymentLink}
                      className="flex-1 text-xs border rounded-lg px-3 py-2 bg-gray-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(paymentLink)}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                    Send this link to the client via WhatsApp or email.
                  </p>
                  <button
                    onClick={generatePaymentLink}
                    className="text-xs mt-2 underline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Regenerate link
                  </button>
                </div>
              ) : (
                <ActionBtn
                  label={loading === 'payment_link' ? 'Generating…' : 'Generate Payment Link'}
                  onClick={generatePaymentLink}
                  loading={loading === 'payment_link'}
                  variant="primary"
                />
              )}
            </div>
          )}

          {/* Activity log / notes */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
                style={{ color: 'var(--color-text-muted)' }}>Activity Log</h3>

            {/* Add note */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                placeholder="Add a note…"
                className="flex-1 text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: 'var(--color-border)' }}
              />
              <button
                onClick={addNote}
                disabled={addingNote || !note.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}
              >
                Add
              </button>
            </div>

            {activity.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {activity.map((a: any) => (
                  <div key={a.id} className="flex gap-3 text-sm">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                         style={{ background: 'var(--color-primary)', marginTop: '6px' }} />
                    <div className="flex-1">
                      <p style={{ color: 'var(--color-text)' }}>{a.note}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {a.actor} · {new Date(a.created_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-muted)' }}>Client</h3>
            <p className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
              {customer?.name}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {customer?.email}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {customer?.phone}
            </p>

            <div className="flex gap-2 mt-4">
              <a
                href={`https://wa.me/${customer?.phone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-xs font-semibold py-2 rounded-lg text-white"
                style={{ background: '#25D366' }}
              >
                WhatsApp
              </a>
              <a
                href={`mailto:${customer?.email}`}
                className="flex-1 text-center text-xs font-semibold py-2 rounded-lg"
                style={{ color: 'var(--color-primary)', border: '1.5px solid var(--color-border)' }}
              >
                Email
              </a>
            </div>

            <a
              href={`/admin/crm/${customer?.id}`}
              className="block text-center text-xs mt-3 font-medium underline"
              style={{ color: 'var(--color-text-muted)' }}
            >
              View full profile →
            </a>
          </div>

          {/* Payment info */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-muted)' }}>Payment</h3>
            <div className="space-y-2 text-sm">
              <Row label="Method" value={booking.payment_method ?? '—'} />
              <Row label="Allowed" value={booking.payment_method_allowed} />
              <Row
                label="Deposit"
                value={booking.deposit_paid ? '✓ Paid' : 'Unpaid'}
                valueClass={booking.deposit_paid ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}
              />
            </div>
          </div>

          {/* Invoices */}
          {booking.invoices?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-3"
                  style={{ color: 'var(--color-text-muted)' }}>Invoices</h3>
              {booking.invoices.map((inv: any) => (
                <div key={inv.id} className="text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono font-semibold" style={{ color: 'var(--color-primary)' }}>
                      {inv.invoice_number}
                    </span>
                    <span className="font-semibold">£{Number(inv.amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    <span>{inv.status}</span>
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="underline">
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loyalty */}
          {Number(booking.loyalty_points_redeemed) > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-muted)' }}>Loyalty</h3>
              <p className="text-sm">
                <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                  {booking.loyalty_points_redeemed} pts
                </span>
                {' '}redeemed (−£{Number(booking.loyalty_discount).toFixed(2)})
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = '' }: {
  label: string; value: string; valueClass?: string
}) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className={`font-medium ${valueClass}`} style={!valueClass ? { color: 'var(--color-text)' } : {}}>
        {value}
      </span>
    </div>
  )
}

function ActionBtn({
  label, onClick, loading, variant,
}: {
  label: string
  onClick: () => void
  loading: boolean
  variant: 'primary' | 'success' | 'danger' | 'warning'
}) {
  const styles = {
    primary: { background: 'var(--color-primary)', color: '#fff' },
    success: { background: '#059669', color: '#fff' },
    danger:  { background: '#dc2626', color: '#fff' },
    warning: { background: '#d97706', color: '#fff' },
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
      style={styles[variant]}
    >
      {label}
    </button>
  )
}
