import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Accounting' }

async function getAccountingData(from: string, to: string) {
  const supabase = createAdminClient()

  // P&L: group journal entry lines by account type in the period
  const { data: lines } = await supabase
    .from('journal_entry_lines')
    .select(`
      debit, credit,
      accounts ( code, name, type ),
      journal_entries!inner ( date )
    `)
    .gte('journal_entries.date', from)
    .lte('journal_entries.date', to)

  const income: Record<string, { name: string; code: string; total: number }> = {}
  const expenses: Record<string, { name: string; code: string; total: number }> = {}

  for (const line of lines ?? []) {
    const acct = (line as any).accounts
    if (!acct) continue
    if (acct.type === 'income' && Number(line.credit) > 0) {
      if (!income[acct.code]) income[acct.code] = { name: acct.name, code: acct.code, total: 0 }
      income[acct.code].total += Number(line.credit)
    }
    if (acct.type === 'expense' && Number(line.debit) > 0) {
      if (!expenses[acct.code]) expenses[acct.code] = { name: acct.name, code: acct.code, total: 0 }
      expenses[acct.code].total += Number(line.debit)
    }
  }

  const totalIncome   = Object.values(income).reduce((s, a) => s + a.total, 0)
  const totalExpenses = Object.values(expenses).reduce((s, a) => s + a.total, 0)
  const netProfit     = totalIncome - totalExpenses

  // Outstanding balances
  const { data: outstanding } = await supabase
    .from('bookings')
    .select('id, booking_ref, remaining_balance, customers(name)')
    .gt('remaining_balance', 0)
    .in('status', ['confirmed', 'completed'])
    .eq('is_archived', false)
    .limit(10)

  return {
    income: Object.values(income).sort((a, b) => b.total - a.total),
    expenses: Object.values(expenses).sort((a, b) => b.total - a.total),
    totalIncome,
    totalExpenses,
    netProfit,
    outstanding: outstanding ?? [],
  }
}

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function AccountingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now  = new Date()
  const from = params.from ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to   = params.to   ?? now.toISOString().split('T')[0]

  const { income, expenses, totalIncome, totalExpenses, netProfit, outstanding } =
    await getAccountingData(from, to)

  const isProfitable = netProfit >= 0

  return (
    <div>
      {/* Date range filter */}
      <form method="GET" className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
            From
          </label>
          <input type="date" name="from" defaultValue={from}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
            To
          </label>
          <input type="date" name="to" defaultValue={to}
            className="border rounded-lg px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--color-border)' }} />
        </div>
        <button type="submit"
          className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'var(--color-primary)' }}>
          Apply
        </button>
        {/* Quick ranges */}
        {[
          { label: 'This month',   from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`, to: now.toISOString().split('T')[0] },
          { label: 'This year',    from: `${now.getFullYear()}-01-01`, to: now.toISOString().split('T')[0] },
          { label: 'Last month',   from: (() => { const d = new Date(now.getFullYear(), now.getMonth()-1, 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` })(),
                                    to:   (() => { const d = new Date(now.getFullYear(), now.getMonth(), 0); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })() },
        ].map(r => (
          <a key={r.label}
             href={`/admin/accounting?from=${r.from}&to=${r.to}`}
             className="px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors hover:bg-pink-50"
             style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
            {r.label}
          </a>
        ))}
      </form>

      {/* Quick links */}
      <div className="flex gap-3 mb-6">
        {[
          { href: '/admin/accounting/invoices', label: '🧾 Invoices' },
          { href: '/admin/accounting/expenses', label: '💸 Log Expense' },
        ].map(l => (
          <Link key={l.href} href={l.href}
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors hover:bg-pink-50"
            style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)', background: 'white' }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Total Income" value={`£${totalIncome.toFixed(2)}`} color="#059669" icon="📈" />
        <SummaryCard label="Total Expenses" value={`£${totalExpenses.toFixed(2)}`} color="#dc2626" icon="📉" />
        <SummaryCard
          label="Net Profit"
          value={`${isProfitable ? '' : '−'}£${Math.abs(netProfit).toFixed(2)}`}
          color={isProfitable ? '#059669' : '#dc2626'}
          icon={isProfitable ? '✅' : '⚠️'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-muted)' }}>Income Breakdown</h3>
          {income.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No income recorded in this period.</p>
          ) : (
            <div className="space-y-3">
              {income.map(a => (
                <div key={a.code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--color-text)' }}>{a.name}</span>
                    <span className="font-semibold text-green-700">£{a.total.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
                    <div className="h-full rounded-full bg-green-500" style={{
                      width: `${totalIncome > 0 ? (a.total / totalIncome * 100) : 0}%`
                    }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between text-sm font-bold"
                   style={{ borderColor: 'var(--color-border)' }}>
                <span>Total</span>
                <span className="text-green-700">£{totalIncome.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Expenses breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-muted)' }}>Expenses Breakdown</h3>
          {expenses.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No expenses in this period.</p>
          ) : (
            <div className="space-y-3">
              {expenses.map(a => (
                <div key={a.code}>
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: 'var(--color-text)' }}>{a.name}</span>
                    <span className="font-semibold text-red-700">£{a.total.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: '#f3f4f6' }}>
                    <div className="h-full rounded-full bg-red-400" style={{
                      width: `${totalExpenses > 0 ? (a.total / totalExpenses * 100) : 0}%`
                    }} />
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between text-sm font-bold"
                   style={{ borderColor: 'var(--color-border)' }}>
                <span>Total</span>
                <span className="text-red-700">£{totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Outstanding balances */}
        {outstanding.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
                style={{ color: 'var(--color-text-muted)' }}>Outstanding Balances</h3>
            <div className="space-y-2">
              {outstanding.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0"
                     style={{ borderColor: '#f3f4f6' }}>
                  <div>
                    <span className="font-mono font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>
                      {b.booking_ref}
                    </span>
                    <span className="ml-2" style={{ color: 'var(--color-text)' }}>
                      {b.customers?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-700">
                      £{Number(b.remaining_balance).toFixed(2)} due
                    </span>
                    <a href={`/admin/bookings/${b.id}`}
                       className="text-xs underline" style={{ color: 'var(--color-primary)' }}>
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color, icon }: {
  label: string; value: string; color: string; icon: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2"
             style={{ color: 'var(--color-text-muted)' }}>{label}</p>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
