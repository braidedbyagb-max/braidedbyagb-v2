import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Transaction Ledger' }

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  booking_payment:      { label: 'Booking',     color: '#065f46', bg: '#d1fae5' },
  booking_completion:   { label: 'Completion',  color: '#1e40af', bg: '#dbeafe' },
  cancellation_fee:     { label: 'Cancellation',color: '#9a3412', bg: '#fee2e2' },
  expense:              { label: 'Expense',      color: '#6b21a8', bg: '#f3e8ff' },
  owner_draw:           { label: 'Draw',         color: '#92400e', bg: '#fef3c7' },
  manual:               { label: 'Manual',       color: '#374151', bg: '#f3f4f6' },
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string; account?: string }>
}

export default async function LedgerPage({ searchParams }: PageProps) {
  const params  = await searchParams
  const now     = new Date()
  const from    = params.from    ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to      = params.to      ?? now.toISOString().split('T')[0]
  const acctFilter = params.account ?? ''

  const supabase = createAdminClient()

  // Load accounts for filter dropdown
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, code, name, type')
    .eq('is_active', true)
    .order('code')

  // Load journal entries in range
  const { data: entries } = await supabase
    .from('journal_entries')
    .select(`
      id, date, description, reference, source, created_at,
      journal_entry_lines (
        id, debit, credit, memo,
        accounts ( id, code, name, type )
      )
    `)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('id', { ascending: false })
    .limit(500)

  // Filter by account if requested
  const filtered = acctFilter
    ? (entries ?? []).filter(e =>
        (e.journal_entry_lines as any[]).some(
          l => String((l.accounts as any)?.id) === acctFilter
        )
      )
    : (entries ?? [])

  // Totals
  let totalDebits = 0
  let totalCredits = 0
  for (const entry of filtered) {
    for (const line of (entry.journal_entry_lines as any[]) ?? []) {
      totalDebits  += Number(line.debit)
      totalCredits += Number(line.credit)
    }
  }

  return (
    <div>
      {/* Back link */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin/accounting"
          className="text-sm font-medium"
          style={{ color: 'var(--color-text-muted)' }}>
          ← Accounting
        </Link>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Transaction Ledger
        </span>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>From</label>
          <input type="date" name="from" defaultValue={from}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>To</label>
          <input type="date" name="to" defaultValue={to}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Account</label>
          <select name="account" defaultValue={acctFilter}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }}>
            <option value="">All accounts</option>
            {(accounts ?? []).map((a: any) => (
              <option key={a.id} value={String(a.id)}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}>
          Filter
        </button>
        {/* Quick date ranges */}
        {[
          { label: 'This month', from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`, to: now.toISOString().split('T')[0] },
          { label: 'This year',  from: `${now.getFullYear()}-01-01`, to: now.toISOString().split('T')[0] },
        ].map(r => (
          <a key={r.label}
            href={`/admin/accounting/ledger?from=${r.from}&to=${r.to}${acctFilter ? `&account=${acctFilter}` : ''}`}
            className="px-3 py-1.5 text-xs rounded-lg border font-medium hover:bg-pink-50"
            style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            {r.label}
          </a>
        ))}
      </form>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Entries
          </p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
            {filtered.length}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Total Debits
          </p>
          <p className="text-2xl font-bold text-red-600">£{totalDebits.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Total Credits
          </p>
          <p className="text-2xl font-bold text-green-600">£{totalCredits.toFixed(2)}</p>
        </div>
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No journal entries in this period.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {filtered.map((entry: any) => {
              const badge = TYPE_BADGE[entry.source] ?? TYPE_BADGE.manual
              const lines = (entry.journal_entry_lines ?? []) as any[]

              return (
                <div key={entry.id} className="px-5 py-4">
                  {/* Entry header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold"
                            style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {entry.description}
                      </span>
                      {entry.reference && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded"
                              style={{ background: '#f3f4f6', color: 'var(--color-text-muted)' }}>
                          {entry.reference}
                        </span>
                      )}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: badge.color, background: badge.bg }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Lines */}
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#f0f0f0' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: '#fafafa' }}>
                          <th className="text-left px-3 py-2 font-semibold"
                              style={{ color: 'var(--color-text-muted)' }}>Account</th>
                          <th className="text-left px-3 py-2 font-semibold"
                              style={{ color: 'var(--color-text-muted)' }}>Memo</th>
                          <th className="text-right px-3 py-2 font-semibold text-red-500">Debit</th>
                          <th className="text-right px-3 py-2 font-semibold text-green-600">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line: any) => (
                          <tr key={line.id} className="border-t" style={{ borderColor: '#f0f0f0' }}>
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs font-semibold"
                                    style={{ color: 'var(--color-primary)' }}>
                                {line.accounts?.code}
                              </span>
                              <span className="ml-2" style={{ color: 'var(--color-text)' }}>
                                {line.accounts?.name}
                              </span>
                            </td>
                            <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
                              {line.memo ?? '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-red-600">
                              {Number(line.debit) > 0 ? `£${Number(line.debit).toFixed(2)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-green-700">
                              {Number(line.credit) > 0 ? `£${Number(line.credit).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
        Showing up to 500 entries · {filtered.length} in view
      </p>
    </div>
  )
}
