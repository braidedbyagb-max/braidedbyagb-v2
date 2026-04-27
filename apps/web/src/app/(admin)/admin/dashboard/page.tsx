import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Dashboard' }

async function getDashboardStats() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [todayBookings, pendingBookings, monthRevenue, recentBookings] = await Promise.all([
    // Today's confirmed bookings
    supabase
      .from('bookings')
      .select('id, booked_time, total_price, status, customers(name, phone)')
      .eq('booked_date', today)
      .in('status', ['confirmed', 'completed'])
      .eq('is_archived', false)
      .order('booked_time'),

    // Pending (awaiting deposit)
    supabase
      .from('bookings')
      .select('id')
      .eq('status', 'pending')
      .eq('deposit_paid', false)
      .eq('is_archived', false),

    // This month's revenue (completed journal entries for income)
    supabase
      .from('journal_entry_lines')
      .select('credit, journal_entries!inner(date)')
      .gte('journal_entries.date', today.substring(0, 7) + '-01')
      .gt('credit', 0),

    // Recent bookings (last 5)
    supabase
      .from('bookings')
      .select('id, booking_ref, booked_date, booked_time, status, total_price, customers(name)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const monthTotal = (monthRevenue.data ?? []).reduce(
    (sum, row) => sum + Number(row.credit),
    0
  )

  return {
    todayCount: todayBookings.data?.length ?? 0,
    todayBookings: todayBookings.data ?? [],
    pendingCount: pendingBookings.data?.length ?? 0,
    monthRevenue: monthTotal,
    recentBookings: recentBookings.data ?? [],
  }
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Pending',        color: '#92400e', bg: '#fef3c7' },
  confirmed:      { label: 'Confirmed',      color: '#065f46', bg: '#d1fae5' },
  completed:      { label: 'Completed',      color: '#1e40af', bg: '#dbeafe' },
  cancelled:      { label: 'Cancelled',      color: '#991b1b', bg: '#fee2e2' },
  late_cancelled: { label: 'Late Cancel',    color: '#7c2d12', bg: '#ffedd5' },
  no_show:        { label: 'No Show',        color: '#4b5563', bg: '#f3f4f6' },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? { label: status, color: '#4b5563', bg: '#f3f4f6' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  )
}

function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

export default async function DashboardPage() {
  const { todayCount, todayBookings, pendingCount, monthRevenue, recentBookings } =
    await getDashboardStats()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{today}</p>
        <h2 className="text-2xl font-bold mt-0.5" style={{ color: 'var(--color-deep-purple)' }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'} 👋
        </h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Today's Appointments"
          value={String(todayCount)}
          icon="📅"
          color="var(--color-primary)"
        />
        <StatCard
          label="Pending Payments"
          value={String(pendingCount)}
          icon="⏳"
          color={pendingCount > 0 ? '#d97706' : '#6b7280'}
        />
        <StatCard
          label="This Month's Revenue"
          value={`£${monthRevenue.toFixed(2)}`}
          icon="💷"
          color="#059669"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's bookings */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-base mb-4" style={{ color: 'var(--color-deep-purple)' }}>
            Today&apos;s Schedule
          </h3>
          {todayBookings.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No appointments today.
            </p>
          ) : (
            <div className="space-y-3">
              {todayBookings.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {b.customers?.name ?? '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {formatTime(b.booked_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>
                      £{Number(b.total_price).toFixed(2)}
                    </p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent bookings */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
              Recent Bookings
            </h3>
            <a href="/admin/bookings" className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
              View all →
            </a>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No bookings yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      {b.customers?.name ?? '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {b.booking_ref} · {new Date(b.booked_date).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={b.status} />
                    <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text)' }}>
                      £{Number(b.total_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider mb-2"
             style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold" style={{ color }}>
            {value}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
