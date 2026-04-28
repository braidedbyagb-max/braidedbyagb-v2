import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Customers' }

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string }>
}

export default async function CRMPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q ?? ''
  const supabase = createAdminClient()

  let req = supabase
    .from('customers')
    .select('id, name, email, phone, loyalty_points, is_blocked, tags, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (query) {
    req = req.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
  }
  if (params.tag) {
    req = req.contains('tags', [params.tag])
  }

  const { data: customers } = await req

  // Get booking counts per customer
  const customerIds = (customers ?? []).map(c => c.id)
  const { data: bookingCounts } = customerIds.length > 0
    ? await supabase
        .from('bookings')
        .select('customer_id')
        .in('customer_id', customerIds)
        .in('status', ['completed', 'confirmed'])
    : { data: [] }

  const countMap: Record<number, number> = {}
  for (const b of bookingCounts ?? []) {
    countMap[b.customer_id] = (countMap[b.customer_id] ?? 0) + 1
  }

  return (
    <div>
      {/* Search */}
      <div className="flex gap-3 mb-6">
        <form method="GET" className="flex gap-2 flex-1 max-w-sm">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, email, phone…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          />
          <button type="submit"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}>
            Search
          </button>
        </form>

        {/* Tag filters */}
        <div className="flex gap-2">
          {['VIP', 'Regular', 'New Client', 'At Risk'].map(tag => (
            <Link
              key={tag}
              href={`/admin/crm?tag=${encodeURIComponent(tag)}${query ? `&q=${query}` : ''}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              style={params.tag === tag
                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'white' }
              }
            >
              {tag}
            </Link>
          ))}
          {params.tag && (
            <Link href="/admin/crm"
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ color: 'var(--color-text-muted)' }}>
              ✕ Clear
            </Link>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Total Customers</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {customers?.length ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Active (1+ booking)</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
            {Object.keys(countMap).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Blocked</p>
          <p className="text-2xl font-bold text-red-600">
            {customers?.filter(c => c.is_blocked).length ?? 0}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {!customers?.length ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No customers found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider"
                  style={{ background: '#f9fafb', color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Contact</th>
                <th className="text-left px-4 py-3 font-semibold">Tags</th>
                <th className="text-center px-4 py-3 font-semibold">Bookings</th>
                <th className="text-center px-4 py-3 font-semibold">Loyalty</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}
                    className="border-b last:border-0 hover:bg-pink-50/40 transition-colors"
                    style={{ borderColor: '#f3f4f6' }}>
                  <td className="px-4 py-3">
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Since {new Date(c.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs" style={{ color: 'var(--color-text)' }}>{c.email}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{c.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags ?? []).map((tag: string) => (
                        <span key={tag}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(204,26,138,0.1)', color: 'var(--color-primary)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                      {countMap[c.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>
                      {c.loyalty_points ?? 0} pts
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_blocked ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                        Blocked
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/crm/${c.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-pink-50"
                      style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
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
