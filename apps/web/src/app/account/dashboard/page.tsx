import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function AccountDashboardPage() {
  // 1. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/account')

  const admin = createAdminClient()

  // 2. Find linked customer record
  const { data: authLink } = await admin
    .from('customer_auth')
    .select('customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  let customer: any = null
  let upcomingBookings: any[] = []
  let pastBookings: any[] = []
  let loyaltyPoints = 0

  if (authLink?.customer_id) {
    const cid = authLink.customer_id

    const [custRes, bkRes] = await Promise.all([
      admin.from('customers').select('id, name, email, loyalty_points').eq('id', cid).single(),
      admin.from('bookings')
        .select('id, booking_ref, booked_date, booked_time, status, deposit_paid, total_price, remaining_balance, services(name)')
        .eq('customer_id', cid)
        .order('booked_date', { ascending: false })
        .limit(20),
    ])

    customer      = custRes.data
    loyaltyPoints = customer?.loyalty_points ?? 0

    const today = new Date().toISOString().split('T')[0]
    const all   = bkRes.data ?? []

    upcomingBookings = all
      .filter(b => b.booked_date >= today && !['cancelled', 'rejected', 'late_cancelled'].includes(b.status))
      .sort((a, b) => a.booked_date.localeCompare(b.booked_date))

    pastBookings = all
      .filter(b => b.booked_date < today || ['completed'].includes(b.status))
      .slice(0, 5)
  } else {
    // No customer record linked — try to match by email
    const { data: cust } = await admin
      .from('customers')
      .select('id, name, email, loyalty_points')
      .eq('email', user.email!)
      .maybeSingle()

    if (cust) {
      customer = cust
      loyaltyPoints = cust.loyalty_points ?? 0

      // Auto-link
      await admin.from('customer_auth').upsert({
        customer_id:  cust.id,
        auth_user_id: user.id,
      }, { onConflict: 'auth_user_id' })
    }
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

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      pending:      { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      confirmed:    { bg: '#d1fae5', color: '#065f46', label: 'Confirmed' },
      completed:    { bg: '#e0e7ff', color: '#3730a3', label: 'Completed' },
      cancelled:    { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
      late_cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Late Cancel' },
    }
    const style = map[s] ?? { bg: '#f3f4f6', color: '#374151', label: s }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: style.bg, color: style.color }}>
        {style.label}
      </span>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Nav */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg" style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-deep-purple)' }}>
            BraidedbyAGB
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>{customer?.name ?? user.email}</span>
            <form action="/account/signout" method="post">
              <button type="submit" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
            Welcome back{customer?.name ? `, ${customer.name.split(' ')[0]}` : ''}! 👋
          </h1>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Loyalty Points"
            value={loyaltyPoints.toString()}
            sub={loyaltyPoints >= 100 ? `= £${(loyaltyPoints / 100).toFixed(0)} discount` : 'Earn 1 pt per £1 spent'}
            href="/account/loyalty"
            cta="View history"
          />
          <StatCard
            label="Upcoming"
            value={upcomingBookings.length.toString()}
            sub={upcomingBookings.length > 0 ? 'appointment' + (upcomingBookings.length !== 1 ? 's' : '') + ' booked' : 'No upcoming bookings'}
          />
          <StatCard
            label="Past Bookings"
            value={pastBookings.length.toString()}
            sub="total appointments"
            href="/account/bookings"
            cta="View all"
          />
        </div>

        {/* Upcoming bookings */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-deep-purple)' }}>Upcoming Appointments</h2>
            <Link href="/booking" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
              + Book New
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
              <p className="text-base mb-4" style={{ color: 'var(--color-text-muted)' }}>No upcoming appointments.</p>
              <Link href="/booking"
                    className="inline-block px-6 py-2.5 rounded-full font-bold text-sm text-white"
                    style={{ background: 'var(--color-primary)' }}>
                Book an Appointment
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(b => {
                const svc = b.services as any
                return (
                  <div key={b.id} className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold" style={{ color: 'var(--color-deep-purple)' }}>
                          {svc?.name ?? 'Appointment'}
                        </p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {formatDate(b.booked_date)} at {formatTime(b.booked_time)}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          Ref: {b.booking_ref}
                          {!b.deposit_paid && (
                            <span className="ml-2 px-2 py-0.5 rounded-full"
                                  style={{ background: '#fef3c7', color: '#92400e', fontSize: 11 }}>
                              Deposit pending
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {statusBadge(b.status)}
                        {Number(b.remaining_balance) > 0 && (
                          <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                            £{Number(b.remaining_balance).toFixed(2)} due on day
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section>
          <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/booking',           label: 'Book Again',      icon: '📅' },
              { href: '/account/bookings',  label: 'All Bookings',    icon: '📋' },
              { href: '/account/loyalty',   label: 'Loyalty Points',  icon: '⭐' },
              { href: '/account/profile',   label: 'My Profile',      icon: '👤' },
            ].map(a => (
              <Link
                key={a.href}
                href={a.href}
                className="rounded-xl p-4 text-center flex flex-col items-center gap-2 transition-colors hover:opacity-80"
                style={{ background: '#fff', border: '1px solid var(--color-border)' }}
              >
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatCard({ label, value, sub, href, cta }: {
  label: string; value: string; sub: string; href?: string; cta?: string
}) {
  return (
    <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </p>
      <p className="text-3xl font-black" style={{ color: 'var(--color-deep-purple)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>
      {href && cta && (
        <Link href={href} className="text-xs font-semibold mt-2 block" style={{ color: 'var(--color-primary)' }}>
          {cta} →
        </Link>
      )}
    </div>
  )
}
