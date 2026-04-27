import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'My Bookings' }

export default async function AccountBookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/account')

  const admin = createAdminClient()

  // Resolve customer
  const { data: authLink } = await admin
    .from('customer_auth')
    .select('customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const customerId = authLink?.customer_id
    ?? (await admin.from('customers').select('id').eq('email', user.email!).maybeSingle()).data?.id

  let bookings: any[] = []
  if (customerId) {
    const { data } = await admin
      .from('bookings')
      .select('id, booking_ref, booked_date, booked_time, status, deposit_paid, total_price, remaining_balance, services(name), service_variants(variant_name), booking_addons(service_addons(name))')
      .eq('customer_id', customerId)
      .order('booked_date', { ascending: false })

    bookings = data ?? []
  }

  function formatDate(d: string) {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }
  function formatTime(t: string) {
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr % 12 === 0 ? 12 : hr % 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  const today = new Date().toISOString().split('T')[0]

  const upcoming = bookings.filter(b => b.booked_date >= today && !['cancelled', 'rejected', 'late_cancelled', 'completed'].includes(b.status))
  const past     = bookings.filter(b => b.booked_date < today || ['completed', 'cancelled', 'rejected', 'late_cancelled'].includes(b.status))

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending:        { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      confirmed:      { bg: '#d1fae5', color: '#065f46', label: 'Confirmed' },
      completed:      { bg: '#e0e7ff', color: '#3730a3', label: 'Completed' },
      cancelled:      { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      late_cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Late Cancel' },
      rejected:       { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
    }
    const style = map[s] ?? { bg: '#f3f4f6', color: '#374151', label: s }
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: style.bg, color: style.color }}>{style.label}</span>
  }

  const BookingRow = ({ b }: { b: any }) => {
    const svc  = b.services as any
    const addons = (b.booking_addons ?? []).map((a: any) => a.service_addons?.name).filter(Boolean)
    return (
      <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-bold" style={{ color: 'var(--color-deep-purple)' }}>
              {svc?.name ?? 'Appointment'}
            </p>
            {addons.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>+ {addons.join(', ')}</p>
            )}
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {formatDate(b.booked_date)} · {formatTime(b.booked_time)}
            </p>
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--color-text-muted)' }}>{b.booking_ref}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {statusBadge(b.status)}
            <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
              £{Number(b.total_price).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/account/dashboard" className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
            ← Dashboard
          </Link>
          <span className="font-bold text-base" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
            My Bookings
          </span>
          <Link href="/booking" className="px-4 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: 'var(--color-primary)' }}>
            Book
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Upcoming */}
        <section className="mb-8">
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Upcoming ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>No upcoming appointments.</p>
              <Link href="/booking" className="inline-block px-5 py-2 rounded-full font-bold text-sm text-white" style={{ background: 'var(--color-primary)' }}>
                Book Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(b => <BookingRow key={b.id} b={b} />)}
            </div>
          )}
        </section>

        {/* Past */}
        <section>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Past ({past.length})
          </h2>
          {past.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No past bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {past.map(b => <BookingRow key={b.id} b={b} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
