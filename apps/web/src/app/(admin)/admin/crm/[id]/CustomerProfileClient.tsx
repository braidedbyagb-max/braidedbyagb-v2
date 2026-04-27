'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const TAGS = ['VIP', 'Regular', 'New Client', 'At Risk']

const STATUS_COLOR: Record<string, string> = {
  completed:  'text-blue-700 bg-blue-50',
  confirmed:  'text-green-700 bg-green-50',
  pending:    'text-amber-700 bg-amber-50',
  cancelled:  'text-red-700 bg-red-50',
  no_show:    'text-gray-600 bg-gray-100',
}

interface Props {
  customer: any
  bookings: any[]
  loyalty: any[]
  notes: any[]
  ltv: number
}

export default function CustomerProfileClient({ customer, bookings, loyalty, notes, ltv }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [note, setNote]           = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [hairNotes, setHairNotes] = useState(customer.hair_notes ?? '')
  const [savingHair, setSavingHair] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [showBlock, setShowBlock] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(customer.tags ?? [])

  async function addNote() {
    if (!note.trim()) return
    setSavingNote(true)
    await supabase.from('customer_notes').insert({ customer_id: customer.id, note: note.trim() })
    setNote('')
    setSavingNote(false)
    router.refresh()
  }

  async function saveHairNotes() {
    setSavingHair(true)
    await supabase.from('customers').update({ hair_notes: hairNotes }).eq('id', customer.id)
    setSavingHair(false)
    router.refresh()
  }

  async function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(next)
    await supabase.from('customers').update({ tags: next }).eq('id', customer.id)
    router.refresh()
  }

  async function blockCustomer() {
    if (!blockReason.trim()) return
    setLoading(true)
    await supabase.from('customers').update({
      is_blocked: true,
      block_reason: blockReason,
      blocked_at: new Date().toISOString(),
    }).eq('id', customer.id)
    setLoading(false)
    setShowBlock(false)
    router.refresh()
  }

  async function unblockCustomer() {
    setLoading(true)
    await supabase.from('customers').update({
      is_blocked: false,
      block_reason: null,
      blocked_at: null,
    }).eq('id', customer.id)
    setLoading(false)
    router.refresh()
  }

  async function adjustPoints(delta: number, description: string) {
    const type = delta > 0 ? 'manual_add' : 'manual_remove'
    await supabase.from('loyalty_transactions').insert({
      customer_id: customer.id,
      type,
      points: delta,
      description,
    })
    await supabase.from('customers').update({
      loyalty_points: (customer.loyalty_points ?? 0) + delta,
    }).eq('id', customer.id)
    router.refresh()
  }

  const completedBookings = bookings.filter(b => b.status === 'completed').length

  return (
    <div className="max-w-5xl">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/crm" className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          ← Customers
        </Link>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{customer.name}</span>
      </div>

      {/* Blocked banner */}
      {customer.is_blocked && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-red-700">⚠ This client is blocked</p>
            {customer.block_reason && (
              <p className="text-xs text-red-600 mt-0.5">Reason: {customer.block_reason}</p>
            )}
          </div>
          <button onClick={unblockCustomer} disabled={loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-50">
            Unblock
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: identity + stats */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-deep-purple))' }}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>{customer.name}</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Client since {new Date(customer.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span>📧</span> <span className="break-all">{customer.email}</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <span>📱</span> <span>{customer.phone}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <a href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex-1 text-center text-xs font-semibold py-2 rounded-lg text-white"
                 style={{ background: '#25D366' }}>
                WhatsApp
              </a>
              <a href={`mailto:${customer.email}`}
                 className="flex-1 text-center text-xs font-semibold py-2 rounded-lg border"
                 style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
                Email
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}>Business Metrics</h3>
            <StatRow label="Lifetime Value"    value={`£${ltv.toFixed(2)}`} bold color="var(--color-primary)" />
            <StatRow label="Total Bookings"    value={String(bookings.length)} />
            <StatRow label="Completed"         value={String(completedBookings)} />
            <StatRow label="Loyalty Points"    value={`${customer.loyalty_points ?? 0} pts`} color="var(--color-gold)" bold />
            <StatRow label="Email opt-in"      value={customer.email_optin ? 'Yes' : 'No'} />
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-muted)' }}>Tags</h3>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={selectedTags.includes(tag)
                    ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                    : { color: 'var(--color-text-muted)', borderColor: 'var(--color-border)', background: 'white' }
                  }>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Block / Loyalty adjust */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider mb-2"
                style={{ color: 'var(--color-text-muted)' }}>Admin Actions</h3>

            {/* Loyalty adjust */}
            <div className="flex gap-2">
              <button onClick={() => {
                const pts = prompt('Points to ADD (e.g. 100):')
                const reason = prompt('Reason:')
                if (pts && reason) adjustPoints(parseInt(pts), reason)
              }}
                className="flex-1 text-xs font-semibold py-2 rounded-lg border text-green-700 border-green-200 hover:bg-green-50">
                + Add Points
              </button>
              <button onClick={() => {
                const pts = prompt('Points to REMOVE (e.g. 50):')
                const reason = prompt('Reason:')
                if (pts && reason) adjustPoints(-Math.abs(parseInt(pts)), reason)
              }}
                className="flex-1 text-xs font-semibold py-2 rounded-lg border text-red-700 border-red-200 hover:bg-red-50">
                − Remove Points
              </button>
            </div>

            {!customer.is_blocked ? (
              showBlock ? (
                <div className="space-y-2">
                  <textarea rows={2} value={blockReason} onChange={e => setBlockReason(e.target.value)}
                    placeholder="Reason for blocking (internal only)…"
                    className="w-full text-xs border rounded-lg px-3 py-2"
                    style={{ borderColor: 'var(--color-border)' }} />
                  <div className="flex gap-2">
                    <button onClick={blockCustomer} disabled={loading}
                      className="flex-1 text-xs font-semibold py-2 rounded-lg bg-red-600 text-white disabled:opacity-60">
                      Confirm Block
                    </button>
                    <button onClick={() => setShowBlock(false)}
                      className="flex-1 text-xs font-semibold py-2 rounded-lg border"
                      style={{ borderColor: 'var(--color-border)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowBlock(true)}
                  className="w-full text-xs font-semibold py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50">
                  🚫 Block Client
                </button>
              )
            ) : null}
          </div>
        </div>

        {/* Right: bookings, hair notes, loyalty, notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hair profile */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-base mb-3" style={{ color: 'var(--color-deep-purple)' }}>Hair Profile</h3>
            <textarea
              rows={4}
              value={hairNotes}
              onChange={e => setHairNotes(e.target.value)}
              placeholder="Hair type, length, texture, preferences, sensitivities, style notes…"
              className="w-full text-sm border rounded-lg px-3 py-2 resize-none"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <button onClick={saveHairNotes} disabled={savingHair}
              className="mt-2 px-4 py-1.5 text-sm font-semibold rounded-lg text-white disabled:opacity-60"
              style={{ background: 'var(--color-primary)' }}>
              {savingHair ? 'Saving…' : 'Save Hair Notes'}
            </button>
          </div>

          {/* Booking history */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
              <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
                Booking History
              </h3>
            </div>
            {bookings.length === 0 ? (
              <p className="p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>No bookings yet.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
                {bookings.map(b => (
                  <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                        {b.services?.name ?? '—'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(b.booked_date + 'T12:00:00').toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })} · {b.booking_ref}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[b.status] ?? 'text-gray-600 bg-gray-100'}`}>
                        {b.status}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        £{Number(b.total_price).toFixed(2)}
                      </span>
                      <Link href={`/admin/bookings/${b.id}`}
                        className="text-xs underline" style={{ color: 'var(--color-primary)' }}>
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loyalty history */}
          {loyalty.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-base mb-3" style={{ color: 'var(--color-deep-purple)' }}>
                Loyalty Points History
              </h3>
              <div className="space-y-2">
                {loyalty.map(t => (
                  <div key={t.id} className="flex justify-between text-sm py-1.5 border-b last:border-0"
                       style={{ borderColor: '#f3f4f6' }}>
                    <div>
                      <p style={{ color: 'var(--color-text)' }}>{t.description ?? t.type}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(t.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <span className={`font-bold ${t.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.points > 0 ? '+' : ''}{t.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-base mb-3" style={{ color: 'var(--color-deep-purple)' }}>
              Admin Notes
            </h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add a note about this client…"
                className="flex-1 text-sm border rounded-lg px-3 py-2"
                style={{ borderColor: 'var(--color-border)' }} />
              <button onClick={addNote} disabled={savingNote || !note.trim()}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
                style={{ background: 'var(--color-primary)' }}>
                Add
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No notes yet.</p>
            ) : (
              <div className="space-y-2">
                {notes.map(n => (
                  <div key={n.id} className="flex gap-3 py-2 border-b last:border-0"
                       style={{ borderColor: '#f3f4f6' }}>
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                         style={{ background: 'var(--color-primary)' }} />
                    <div>
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>{n.note}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(n.created_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ label, value, bold, color }: {
  label: string; value: string; bold?: boolean; color?: string
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className={bold ? 'font-bold' : 'font-medium'} style={{ color: color ?? 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  )
}
