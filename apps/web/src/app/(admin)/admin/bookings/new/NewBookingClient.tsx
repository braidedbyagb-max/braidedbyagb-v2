'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Variant { id: number; variant_name: string; price: number; duration_mins: number; is_active: boolean }
interface Addon   { id: number; name: string; price: number; is_active: boolean }
interface Service { id: number; name: string; price_from: number; duration_mins: number; service_variants: Variant[]; service_addons: Addon[] }

interface Props {
  services: Service[]
  settings: Record<string, string>
}

export default function NewBookingClient({ services, settings }: Props) {
  const router = useRouter()

  // Service
  const [serviceId,  setServiceId]  = useState<number | null>(null)
  const [variantId,  setVariantId]  = useState<number | null>(null)
  const [addonIds,   setAddonIds]   = useState<number[]>([])

  // Date/time
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  // Customer
  const [name,  setName]  = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Payment
  const [payMethod,  setPayMethod]  = useState<'stripe' | 'bank_transfer' | 'both'>('both')
  const [sendEmail,  setSendEmail]  = useState(true)

  // Result
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [result,    setResult]    = useState<any>(null)
  const [copied,    setCopied]    = useState(false)

  const selectedService = services.find(s => s.id === serviceId)
  const selectedVariant = selectedService?.service_variants.find(v => v.id === variantId)

  const depositPct  = parseInt(settings.deposit_percent ?? '30') / 100
  const basePrice   = selectedVariant?.price ?? selectedService?.price_from ?? 0
  const addonTotal  = addonIds.reduce((sum, id) => {
    const addon = selectedService?.service_addons.find(a => a.id === id)
    return sum + (addon?.price ?? 0)
  }, 0)
  const totalPrice  = basePrice + addonTotal
  const depositAmt  = Math.ceil(totalPrice * depositPct * 100) / 100

  function toggleAddon(id: number) {
    setAddonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!serviceId || !date || !time || !name || !email) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          variant_id: variantId,
          addon_ids:  addonIds,
          date, time,
          payment_method: payMethod === 'both' ? 'bank_transfer' : payMethod,
          payment_method_allowed: payMethod,
          customer: { name, email, phone, notes },
          send_confirmation_email: sendEmail,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create booking')
      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function copyLink() {
    if (!result?.payment_link) return
    navigator.clipboard.writeText(result.payment_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (result) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin/bookings')} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>← Bookings</button>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>Booking Created</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>Booking Created</h2>
            <p className="text-3xl font-black mt-2 font-mono" style={{ color: 'var(--color-primary)' }}>
              {result.booking_ref}
            </p>
          </div>

          <div className="space-y-3 text-sm mb-6">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Deposit</span>
              <span className="font-bold">£{result.deposit_amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
              <span className="font-bold">£{result.total_price?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment link */}
          {result.payment_link && (
            <div className="rounded-xl p-4 mb-5" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#166534' }}>Payment Link (share with client)</p>
              <div className="flex gap-2 items-center">
                <input
                  readOnly
                  value={result.payment_link}
                  className="flex-1 px-3 py-2 rounded-lg border text-xs font-mono bg-white"
                  style={{ borderColor: '#86efac' }}
                />
                <button
                  onClick={copyLink}
                  className="px-3 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0"
                  style={{ background: copied ? '#059669' : 'var(--color-primary)' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hi ${name}! Here is your payment link to secure your booking: ${result.payment_link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-semibold"
                style={{ color: '#25D366' }}
              >
                📱 Share on WhatsApp
              </a>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/admin/bookings/${result.booking_id}`)}
              className="flex-1 py-2.5 rounded-full font-bold text-sm text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              View Booking
            </button>
            <button
              onClick={() => router.push('/admin/bookings/new')}
              className="flex-1 py-2.5 rounded-full font-bold text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
            >
              New Booking
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/admin/bookings')} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>← Bookings</button>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>New Booking</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">

        {/* Service selection */}
        <section>
          <h2 className="font-bold mb-3" style={{ color: 'var(--color-deep-purple)' }}>Service *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {services.map(svc => (
              <button
                key={svc.id}
                onClick={() => { setServiceId(svc.id); setVariantId(null); setAddonIds([]) }}
                className="text-left px-4 py-3 rounded-xl border text-sm transition-all"
                style={{
                  borderColor: serviceId === svc.id ? 'var(--color-primary)' : 'var(--color-border)',
                  background:  serviceId === svc.id ? '#fdf2f8' : '#fff',
                  color: 'var(--color-text)',
                }}
              >
                <span className="font-semibold block">{svc.name}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>From £{Number(svc.price_from).toFixed(0)} · {svc.duration_mins} min</span>
              </button>
            ))}
          </div>

          {/* Variants */}
          {selectedService && selectedService.service_variants.filter(v => v.is_active).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Variant</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setVariantId(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                  style={{ borderColor: variantId === null ? 'var(--color-primary)' : 'var(--color-border)', background: variantId === null ? '#fdf2f8' : '#fff' }}
                >
                  Base (£{Number(selectedService.price_from).toFixed(0)})
                </button>
                {selectedService.service_variants.filter(v => v.is_active).map(v => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: variantId === v.id ? 'var(--color-primary)' : 'var(--color-border)', background: variantId === v.id ? '#fdf2f8' : '#fff' }}
                  >
                    {v.variant_name} (£{Number(v.price).toFixed(0)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add-ons */}
          {selectedService && selectedService.service_addons.filter(a => a.is_active).length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Add-ons</p>
              <div className="flex flex-wrap gap-2">
                {selectedService.service_addons.filter(a => a.is_active).map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleAddon(a.id)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
                    style={{ borderColor: addonIds.includes(a.id) ? 'var(--color-primary)' : 'var(--color-border)', background: addonIds.includes(a.id) ? '#fdf2f8' : '#fff' }}
                  >
                    {addonIds.includes(a.id) ? '✓ ' : ''}{a.name} (+£{Number(a.price).toFixed(0)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Date & Time */}
        <section>
          <h2 className="font-bold mb-3" style={{ color: 'var(--color-deep-purple)' }}>Date & Time *</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
          </div>
        </section>

        {/* Customer */}
        <section>
          <h2 className="font-bold mb-3" style={{ color: 'var(--color-deep-purple)' }}>Client Details *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                     className="w-full px-3 py-2 rounded-lg border text-sm"
                     style={{ borderColor: 'var(--color-border)' }} />
            </div>
          </div>
        </section>

        {/* Payment method */}
        <section>
          <h2 className="font-bold mb-3" style={{ color: 'var(--color-deep-purple)' }}>Allowed Payment Method</h2>
          <div className="flex flex-wrap gap-2">
            {([
              { val: 'both',          label: 'Card or Bank Transfer' },
              { val: 'stripe',        label: 'Card Only' },
              { val: 'bank_transfer', label: 'Bank Transfer Only' },
            ] as const).map(opt => (
              <button
                key={opt.val}
                onClick={() => setPayMethod(opt.val)}
                className="px-4 py-2 rounded-lg border text-sm font-semibold"
                style={{ borderColor: payMethod === opt.val ? 'var(--color-primary)' : 'var(--color-border)', background: payMethod === opt.val ? '#fdf2f8' : '#fff' }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} />
              Send booking confirmation email to client
            </label>
          </div>
        </section>

        {/* Price summary */}
        {selectedService && (
          <div className="rounded-xl p-4 text-sm" style={{ background: '#faf5ff', border: '1px solid #e9d5ff' }}>
            <div className="flex justify-between mb-1">
              <span style={{ color: 'var(--color-text-muted)' }}>Service</span>
              <span>£{basePrice.toFixed(2)}</span>
            </div>
            {addonTotal > 0 && (
              <div className="flex justify-between mb-1">
                <span style={{ color: 'var(--color-text-muted)' }}>Add-ons</span>
                <span>£{addonTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2 mt-2" style={{ borderColor: '#e9d5ff' }}>
              <span>Total</span>
              <span>£{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>Deposit ({settings.deposit_percent ?? 30}%)</span>
              <span>£{depositAmt.toFixed(2)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg p-3 text-sm" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>
        )}

        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full py-3.5 rounded-full font-bold text-white disabled:opacity-60"
          style={{ background: 'var(--color-primary)' }}
        >
          {saving ? 'Creating…' : 'Create Booking & Generate Payment Link'}
        </button>
      </div>
    </div>
  )
}
