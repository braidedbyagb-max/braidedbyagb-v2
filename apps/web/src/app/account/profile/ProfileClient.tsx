'use client'

import { useState } from 'react'

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  hair_notes?: string
}

export default function ProfileClient({ customer }: { customer: Customer | null }) {
  const [name,      setName]      = useState(customer?.name ?? '')
  const [phone,     setPhone]     = useState(customer?.phone ?? '')
  const [hairNotes, setHairNotes] = useState(customer?.hair_notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!customer?.id) return
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/account/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, hair_notes: hairNotes }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Save failed')
      }
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!customer) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
        <p>No profile found. Please sign in again.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave}>
      <div className="rounded-xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <h2 className="font-bold text-lg mb-5" style={{ color: 'var(--color-deep-purple)' }}>
          Personal Details
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: '#fafafa' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Email</label>
            <input
              type="email"
              value={customer.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              style={{ borderColor: 'var(--color-border)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Email cannot be changed. Contact us if you need to update it.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: '#fafafa' }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6 mb-6" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--color-deep-purple)' }}>
          Hair Profile
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Help us prepare for your appointment. Share anything about your hair — type, texture, sensitivities, preferences.
        </p>
        <textarea
          value={hairNotes}
          onChange={e => setHairNotes(e.target.value)}
          rows={4}
          placeholder="e.g. 4C hair, medium length, sensitive scalp, prefer no extensions..."
          className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none"
          style={{ borderColor: 'var(--color-border)', background: '#fafafa' }}
        />
      </div>

      {error && (
        <div className="rounded-lg p-3 text-sm mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg p-3 text-sm mb-4" style={{ background: '#d1fae5', color: '#065f46' }}>
          ✓ Profile saved successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-full font-bold text-white transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-primary)' }}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  )
}
