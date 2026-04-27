'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  expenses: any[]
  accounts: any[]
  draws: any[]
}

export default function ExpensesClient({ expenses, accounts, draws }: Props) {
  const router = useRouter()
  const [tab, setTab]         = useState<'expenses' | 'draws'>('expenses')
  const [loading, setLoading] = useState(false)

  // Expense form
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [desc, setDesc]         = useState('')
  const [amount, setAmount]     = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id?.toString() ?? '')
  const [notes, setNotes]       = useState('')

  // Draw form
  const [drawDate, setDrawDate]     = useState(new Date().toISOString().split('T')[0])
  const [drawAmount, setDrawAmount] = useState('')
  const [drawNotes, setDrawNotes]   = useState('')

  const supabase = createClient()

  async function logExpense(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          date,
          description: desc,
          amount: parseFloat(amount),
          account_id: parseInt(accountId),
          notes: notes || null,
        })
        .select('id')
        .single()

      if (error) throw error

      // Create journal entry via API
      const acct = accounts.find(a => a.id === parseInt(accountId))
      await fetch('/api/accounting/log-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expense.id,
          description: desc,
          account_code: acct?.code,
          amount: parseFloat(amount),
          date,
        }),
      })

      setDesc(''); setAmount(''); setNotes('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function logDraw(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: draw, error } = await supabase
        .from('owner_draws')
        .insert({
          date: drawDate,
          amount: parseFloat(drawAmount),
          notes: drawNotes || null,
        })
        .select('id')
        .single()

      if (error) throw error

      await fetch('/api/accounting/log-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draw_id: draw.id,
          amount: parseFloat(drawAmount),
          date: drawDate,
          notes: drawNotes,
        }),
      })

      setDrawAmount(''); setDrawNotes('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm"
  const inputStyle = { borderColor: 'var(--color-border)', outline: 'none' }

  return (
    <div className="max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['expenses', 'draws'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize"
            style={tab === t
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { color: 'var(--color-text-muted)', background: 'white', border: '1.5px solid var(--color-border)' }
            }>
            {t === 'draws' ? "Pay Myself" : "Business Expenses"}
          </button>
        ))}
      </div>

      {tab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Log expense form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-base mb-4" style={{ color: 'var(--color-deep-purple)' }}>
                Log Expense
              </h3>
              <form onSubmit={logExpense} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Description</label>
                  <input type="text" required value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="e.g. Instagram ads, hair supplies…"
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Amount (£)</label>
                  <input type="number" required min="0.01" step="0.01" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Category</label>
                  <select required value={accountId} onChange={e => setAccountId(e.target.value)}
                    className={inputCls} style={inputStyle}>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={2} placeholder="Additional notes…"
                    className={inputCls} style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: 'var(--color-primary)' }}>
                  {loading ? 'Saving…' : 'Log Expense'}
                </button>
              </form>
            </div>
          </div>

          {/* Expenses list */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
                  Recent Expenses
                </h3>
              </div>
              {expenses.length === 0 ? (
                <p className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>No expenses logged yet.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
                  {expenses.map(exp => (
                    <div key={exp.id} className="px-6 py-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                            {exp.description}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                            {exp.accounts?.name} · {new Date(exp.date + 'T12:00:00').toLocaleDateString('en-GB')}
                          </p>
                          {exp.notes && (
                            <p className="text-xs mt-1 italic" style={{ color: 'var(--color-text-muted)' }}>
                              {exp.notes}
                            </p>
                          )}
                        </div>
                        <span className="font-bold text-sm text-red-600">
                          −£{Number(exp.amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'draws' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Pay myself form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-base mb-4" style={{ color: 'var(--color-deep-purple)' }}>
                Pay Myself
              </h3>
              <form onSubmit={logDraw} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Date</label>
                  <input type="date" required value={drawDate} onChange={e => setDrawDate(e.target.value)}
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Amount (£)</label>
                  <input type="number" required min="0.01" step="0.01" value={drawAmount}
                    onChange={e => setDrawAmount(e.target.value)}
                    placeholder="0.00"
                    className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes (optional)</label>
                  <textarea value={drawNotes} onChange={e => setDrawNotes(e.target.value)}
                    rows={2} placeholder="e.g. Weekly pay, April"
                    className={inputCls} style={inputStyle} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: 'var(--color-deep-purple)' }}>
                  {loading ? 'Saving…' : '💷 Record Payment to Self'}
                </button>
              </form>
            </div>
          </div>

          {/* Draws history */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
                <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
                  Owner&apos;s Draw History
                </h3>
              </div>
              {draws.length === 0 ? (
                <p className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>No draws recorded yet.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
                  {draws.map(d => (
                    <div key={d.id} className="px-6 py-4 flex justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                          {d.notes ?? "Owner's draw"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      <span className="font-bold text-sm" style={{ color: 'var(--color-deep-purple)' }}>
                        £{Number(d.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
