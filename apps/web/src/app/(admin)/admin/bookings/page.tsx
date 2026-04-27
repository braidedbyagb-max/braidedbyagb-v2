import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Bookings' }

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'late_cancelled' | 'no_show'

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pending:        { label: 'Pending',        color: '#92400e', bg: '#fef3c7' },
  confirmed:      { label: 'Confirmed',      color: '#065f46', bg: '#d1fae5' },
  completed:      { label: 'Completed',      color: '#1e40af', bg: '#dbeafe' },
  cancelled:      { label: 'Cancelled',      color: '#991b1b', bg: '#fee2e2' },
  late_cancelled: { label: 'Late Cancel',    color: '#7c2d12', bg: '#ffedd5' },
  no_show:        { label: 'No Show',        color: '#4b5563', bg: '#f3f4f6' },
}

type Tab = 'all' | BookingStatus | 'archived'

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',            label: 'All' },
  { key: 'pending',        label: 'Pending' },
  { key: 'confirmed',      label: 'Confirmed' },
  { key: 'completed',      label: 'Completed' },
  { key: 'cancelled',      label: 'Cancelled' },
  { key: 'archived',       label: 'Archived' },
]

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string }>
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const tab = (params.tab ?? 'all') as Tab
  const query = params.q ?? ''

  const supabase = await createClient()

  let req = supabase
    .from('bookings')
    .select(`
      id, booking_ref, booked_date, booked_time,
      status, total_price, deposit_paid, deposit_amount,
      remaining_balance, payment_method, is_archived,
      customers ( id, name, email, phone )
    `)
    .order('booked_date', { ascending: false })
    .order('booked_time', { ascending: false })

  if (tab === 'archived') {
    req = req.eq('is_archived', true)
  } else {
    req = req.eq('is_archived', false)
    if (tab !== 'all') {
      req = req.eq('status', tab)
    }
  }

  if (query) {
    req = req.or(
      `booking_ref.ilike.%${query}%,customers.name.ilike.%${query}%,customers.email.ilike.%${query}%`
    )
  }

  const { data: bookings, error } = await req.limit(100)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>Bookings</h1>
        <Link
          href="/admin/bookings/new"
          className="px-4 py-2 rounded-full text-sm font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          + New Booking
        </Link>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/bookings?tab=${t.key}${query ? `&q=${query}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={
                tab === t.key
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { color: 'var(--color-text-muted)', background: 'white' }
              }
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form method="GET" action="/admin/bookings" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, email, ref…"
            className="border rounded-lg px-3 py-1.5 text-sm w-56"
            style={{ borderColor: 'var(--color-border)', outline: 'none' }}
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-red-600 text-sm">Failed to load bookings: {error.message}</div>
        ) : bookings?.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No bookings found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider"
                  style={{ background: '#f9fafb', color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold">Ref</th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
                <th className="text-right px-4 py-3 font-semibold">Deposit</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings?.map((b: any, i: number) => (
                <tr
                  key={b.id}
                  className="border-b last:border-0 hover:bg-pink-50/40 transition-colors"
                  style={{ borderColor: '#f3f4f6' }}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold"
                          style={{ color: 'var(--color-primary)' }}>
                      {b.booking_ref}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {b.customers?.name ?? '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {b.customers?.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {new Date(b.booked_date + 'T12:00:00').toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>
                    {b.booked_time?.substring(0, 5)}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const s = STATUS_CONFIG[b.status as BookingStatus]
                      return s ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ color: s.color, background: s.bg }}>
                          {s.label}
                        </span>
                      ) : <span>{b.status}</span>
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold"
                      style={{ color: 'var(--color-text)' }}>
                    £{Number(b.total_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.deposit_paid ? (
                      <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        Paid £{Number(b.deposit_amount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-pink-50"
                      style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
