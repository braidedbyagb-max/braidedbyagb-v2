'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

// ── Types ────────────────────────────────────────────────────
interface Service {
  id: number
  name: string
  description: string
  duration_mins: number
  price_from: number
  image_url: string | null
  is_new: boolean
  service_variants: Variant[]
  service_addons: Addon[]
}
interface Variant { id: number; variant_name: string; price: number; duration_mins: number; is_active: boolean }
interface Addon   { id: number; name: string; price: number; is_active: boolean }
interface TimeSlot { time: string; label: string; available: boolean }

interface Props {
  services: Service[]
  settings: Record<string, string>
}

const STEPS = ['Service', 'Date & Time', 'Your Details', 'Payment']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Main wizard ──────────────────────────────────────────────
export default function BookingWizard({ services, settings }: Props) {
  const [step, setStep] = useState(0)

  // Selections
  const [service,   setService]   = useState<Service | null>(null)
  const [variant,   setVariant]   = useState<Variant | null>(null)
  const [addons,    setAddons]    = useState<Addon[]>([])
  const [date,      setDate]      = useState('')     // 'YYYY-MM-DD'
  const [time,      setTime]      = useState('')     // 'HH:MM'
  const [slots,     setSlots]     = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [dayBlocked, setDayBlocked] = useState(false)

  // Calendar state
  const now = new Date()
  const [calYear,  setCalYear]  = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth()) // 0-indexed

  // Customer details
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [notes,   setNotes]   = useState('')
  const [policy,  setPolicy]  = useState(false)
  const [payMethod, setPayMethod] = useState<'stripe' | 'bank_transfer'>('stripe')

  // Payment / result
  const [clientSecret,  setClientSecret]  = useState('')
  const [bookingResult, setBookingResult] = useState<any>(null)
  const [creating,      setCreating]      = useState(false)
  const [createError,   setCreateError]   = useState('')

  // Loyalty
  const [loyaltyBalance,       setLoyaltyBalance]       = useState(0)
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0)
  const [loyaltyLoggedIn,      setLoyaltyLoggedIn]      = useState(false)

  // Pre-fill from logged-in session
  useEffect(() => {
    fetch('/api/account/profile')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) return
        setLoyaltyLoggedIn(true)
        setLoyaltyBalance(data.loyalty_points ?? 0)
        if (!name)  setName(data.name ?? '')
        if (!email) setEmail(data.email ?? '')
        if (!phone) setPhone(data.phone ?? '')
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived prices
  const duration = variant?.duration_mins ?? service?.duration_mins ?? 60
  const basePrice = variant?.price ?? service?.price_from ?? 0
  const addonTotal = addons.reduce((s, a) => s + a.price, 0)
  const redeemRate   = parseInt(settings.loyalty_redeem_rate ?? '100')
  const minRedemption = 500
  const loyaltyDiscount = loyaltyPointsToRedeem >= minRedemption
    ? loyaltyPointsToRedeem / redeemRate
    : 0
  const totalPrice = Math.max(0, basePrice + addonTotal - loyaltyDiscount)
  const depositPct = parseInt(settings.deposit_percent ?? '30') / 100
  const depositAmount = Math.ceil(totalPrice * depositPct * 100) / 100

  // Fetch slots when date changes
  const fetchSlots = useCallback(async (d: string, dur: number) => {
    if (!d) return
    setSlotsLoading(true)
    setSlots([])
    setTime('')
    try {
      const res = await fetch(`/api/bookings/slots?date=${d}&duration=${dur}`)
      const data = await res.json()
      setDayBlocked(data.day_blocked)
      setSlots(data.slots ?? [])
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 1 && date) fetchSlots(date, duration)
  }, [date, duration, step, fetchSlots])

  // Create booking then get payment intent
  async function handleCreateBooking() {
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: service!.id,
          variant_id: variant?.id ?? null,
          addon_ids:  addons.map(a => a.id),
          date, time,
          payment_method: payMethod,
          customer: { name, email, phone, notes },
          loyalty_points_redeemed: loyaltyPointsToRedeem >= minRedemption ? loyaltyPointsToRedeem : 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Booking failed')

      setBookingResult(data)

      if (payMethod === 'stripe') {
        const piRes = await fetch('/api/bookings/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_ref: data.booking_ref }),
        })
        const piData = await piRes.json()
        if (!piRes.ok) throw new Error(piData.error)
        setClientSecret(piData.client_secret)
      }

      setStep(3)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function formatDate(d: string) {
    if (!d) return ''
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  // ── Progress bar ─────────────────────────────────────────
  const canProceed = [
    !!service,
    !!date && !!time,
    !!name && !!email && !!phone && policy,
    false, // step 3 = payment (no "next")
  ]

  return (
    <div>
      {/* Step tabs */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={i < step
                  ? { background: '#059669', color: '#fff' }
                  : i === step
                  ? { background: 'var(--color-primary)', color: '#fff' }
                  : { background: '#e5e7eb', color: '#9ca3af' }
                }
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs mt-1 font-medium hidden sm:block"
                    style={{ color: i === step ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 rounded"
                   style={{ background: i < step ? '#059669' : '#e5e7eb' }} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

        {/* ── STEP 0: SERVICE ── */}
        {step === 0 && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--color-deep-purple)' }}>
              Choose a Service
            </h2>
            <div className="space-y-3">
              {services.map(svc => (
                <div key={svc.id}>
                  <button
                    onClick={() => { setService(svc); setVariant(null); setAddons([]) }}
                    className="w-full text-left p-4 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: service?.id === svc.id ? 'var(--color-primary)' : 'var(--color-border)',
                      background:  service?.id === svc.id ? 'rgba(204,26,138,0.04)' : 'white',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
                            {svc.name}
                          </p>
                          {svc.is_new && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                                  style={{ background: 'var(--color-primary)' }}>New</span>
                          )}
                        </div>
                        {svc.description && (
                          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                            {svc.description}
                          </p>
                        )}
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          ⏱ {svc.duration_mins} mins
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-bold" style={{ color: 'var(--color-primary)' }}>
                          from £{Number(svc.price_from).toFixed(2)}
                        </p>
                        <div className="w-5 h-5 rounded-full border-2 mt-2 ml-auto flex items-center justify-center"
                             style={{ borderColor: service?.id === svc.id ? 'var(--color-primary)' : '#d1d5db' }}>
                          {service?.id === svc.id && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-primary)' }} />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Variants */}
                  {service?.id === svc.id && svc.service_variants.filter(v => v.is_active).length > 0 && (
                    <div className="ml-4 mt-2 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider"
                         style={{ color: 'var(--color-text-muted)' }}>Select style / length:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {svc.service_variants.filter(v => v.is_active).map(v => (
                          <button key={v.id}
                            onClick={() => setVariant(variant?.id === v.id ? null : v)}
                            className="p-3 rounded-lg border text-left transition-all text-sm"
                            style={{
                              borderColor: variant?.id === v.id ? 'var(--color-primary)' : 'var(--color-border)',
                              background:  variant?.id === v.id ? 'rgba(204,26,138,0.06)' : 'white',
                            }}>
                            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{v.variant_name}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--color-primary)' }}>
                              £{Number(v.price).toFixed(2)} · {v.duration_mins}min
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {service?.id === svc.id && svc.service_addons.filter(a => a.is_active).length > 0 && (
                    <div className="ml-4 mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider"
                         style={{ color: 'var(--color-text-muted)' }}>Optional add-ons:</p>
                      {svc.service_addons.filter(a => a.is_active).map(addon => {
                        const selected = addons.some(a => a.id === addon.id)
                        return (
                          <button key={addon.id}
                            onClick={() => setAddons(prev =>
                              selected ? prev.filter(a => a.id !== addon.id) : [...prev, addon]
                            )}
                            className="w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all"
                            style={{
                              borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                              background:  selected ? 'rgba(204,26,138,0.04)' : 'white',
                            }}>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                   style={{ borderColor: selected ? 'var(--color-primary)' : '#d1d5db',
                                            background: selected ? 'var(--color-primary)' : 'white' }}>
                                {selected && <span className="text-white text-xs">✓</span>}
                              </div>
                              <span style={{ color: 'var(--color-text)' }}>{addon.name}</span>
                            </div>
                            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                              +£{Number(addon.price).toFixed(2)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: DATE & TIME ── */}
        {step === 1 && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--color-deep-purple)' }}>
              Choose Date & Time
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mini calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                    else setCalMonth(m => m - 1)
                  }} className="px-2 py-1 rounded text-sm font-bold"
                    style={{ color: 'var(--color-text-muted)' }}>‹</button>
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-deep-purple)' }}>
                    {FULL_MONTHS[calMonth]} {calYear}
                  </span>
                  <button onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                    else setCalMonth(m => m + 1)
                  }} className="px-2 py-1 rounded text-sm font-bold"
                    style={{ color: 'var(--color-text-muted)' }}>›</button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {['M','T','W','T','F','S','S'].map((d, i) => (
                    <div key={i} className="text-center text-xs font-bold py-1"
                         style={{ color: 'var(--color-text-muted)' }}>{d}</div>
                  ))}
                </div>

                {/* Days */}
                {(() => {
                  const firstDay = new Date(calYear, calMonth, 1)
                  const totalDays = new Date(calYear, calMonth + 1, 0).getDate()
                  const offset = (firstDay.getDay() + 6) % 7
                  const cells = [...Array(offset).fill(null), ...Array.from({length: totalDays}, (_, i) => i + 1)]
                  while (cells.length % 7 !== 0) cells.push(null)
                  const todayStr = new Date().toISOString().split('T')[0]

                  return (
                    <div className="grid grid-cols-7 gap-0.5">
                      {cells.map((day, idx) => {
                        if (!day) return <div key={idx} />
                        const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                        const isPast = ds < todayStr
                        const isSelected = ds === date
                        const isToday = ds === todayStr

                        return (
                          <button key={idx}
                            disabled={isPast}
                            onClick={() => { setDate(ds); fetchSlots(ds, duration) }}
                            className="aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            style={isSelected
                              ? { background: 'var(--color-primary)', color: '#fff' }
                              : isToday
                              ? { background: 'rgba(204,26,138,0.12)', color: 'var(--color-primary)', fontWeight: 700 }
                              : { color: 'var(--color-text)' }
                            }
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  )
                })()}

                {date && (
                  <p className="text-xs mt-3 font-semibold text-center" style={{ color: 'var(--color-primary)' }}>
                    {formatDate(date)}
                  </p>
                )}
              </div>

              {/* Time slots */}
              <div>
                {!date ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Select a date to see available times.
                    </p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                      Checking availability…
                    </p>
                  </div>
                ) : dayBlocked ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                      Sorry, we&apos;re unavailable on this date.<br />Please choose another day.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3"
                       style={{ color: 'var(--color-text-muted)' }}>Available times:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(slot => (
                        <button key={slot.time}
                          disabled={!slot.available}
                          onClick={() => setTime(slot.time)}
                          className="py-2 px-1 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={time === slot.time
                            ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                            : slot.available
                            ? { color: 'var(--color-text)', borderColor: 'var(--color-border)', background: 'white' }
                            : { color: '#9ca3af', borderColor: '#e5e7eb', textDecoration: 'line-through' }
                          }
                        >
                          {slot.label}
                        </button>
                      ))}
                      {slots.length === 0 && !dayBlocked && (
                        <p className="col-span-3 text-sm text-center py-4"
                           style={{ color: 'var(--color-text-muted)' }}>
                          No slots available this day.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: DETAILS ── */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-5" style={{ color: 'var(--color-deep-purple)' }}>
              Your Details
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Full Name',     value: name,  set: setName,  type: 'text',  ph: 'Your full name' },
                { label: 'Email Address', value: email, set: setEmail, type: 'email', ph: 'your@email.com' },
                { label: 'Phone Number',  value: phone, set: setPhone, type: 'tel',   ph: '07xxx xxxxxx' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    {f.label} *
                  </label>
                  <input type={f.type} required value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full border rounded-xl px-4 py-3 text-sm"
                    style={{ borderColor: 'var(--color-border)', outline: 'none' }} />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                  Notes (optional)
                </label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Any hair notes, special requests, or questions…"
                  className="w-full border rounded-xl px-4 py-3 text-sm resize-none"
                  style={{ borderColor: 'var(--color-border)', outline: 'none' }} />
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Deposit payment method *
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'stripe',        label: '💳 Pay by Card',          sub: 'Secure card payment' },
                    { key: 'bank_transfer', label: '🏦 Bank Transfer',         sub: 'Pay via bank transfer' },
                  ] as const).map(m => (
                    <button key={m.key} onClick={() => setPayMethod(m.key)}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: payMethod === m.key ? 'var(--color-primary)' : 'var(--color-border)',
                        background:  payMethod === m.key ? 'rgba(204,26,138,0.05)' : 'white',
                      }}>
                      <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{m.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{m.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Loyalty points redemption */}
              {loyaltyLoggedIn && loyaltyBalance >= minRedemption && (
                <div className="rounded-xl border p-4 space-y-3"
                     style={{ borderColor: 'rgba(240,192,48,0.4)', background: 'rgba(240,192,48,0.05)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-deep-purple)' }}>
                      🎁 Loyalty Points
                    </p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(240,192,48,0.2)', color: '#92400e' }}>
                      Balance: {loyaltyBalance} pts
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Redeem {redeemRate} points = £1 off. Minimum {minRedemption} points.
                  </p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      max={loyaltyBalance}
                      step={100}
                      value={loyaltyPointsToRedeem || ''}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0
                        setLoyaltyPointsToRedeem(Math.min(v, loyaltyBalance))
                      }}
                      placeholder="0"
                      className="w-28 border rounded-lg px-3 py-2 text-sm font-mono"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <span className="text-sm font-semibold"
                          style={{ color: loyaltyPointsToRedeem >= minRedemption ? '#059669' : 'var(--color-text-muted)' }}>
                      {loyaltyPointsToRedeem >= minRedemption
                        ? `= −£${loyaltyDiscount.toFixed(2)} discount ✓`
                        : `Min ${minRedemption} pts`}
                    </span>
                    {loyaltyBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setLoyaltyPointsToRedeem(
                          // max = min(all balance, points for 50% of total)
                          Math.min(loyaltyBalance, Math.floor((totalPrice * 0.5) * redeemRate))
                        )}
                        className="text-xs font-semibold underline"
                        style={{ color: 'var(--color-primary)' }}>
                        Apply max
                      </button>
                    )}
                  </div>
                  {loyaltyPointsToRedeem > 0 && loyaltyPointsToRedeem < minRedemption && (
                    <p className="text-xs text-amber-700">
                      Enter at least {minRedemption} points to redeem.
                    </p>
                  )}
                </div>
              )}

              {/* Policy */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={policy} onChange={e => setPolicy(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 w-4 h-4 accent-pink-600" />
                <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                  I agree to the cancellation policy: cancellations within 48 hours of the appointment
                  will result in forfeiture of the deposit. No-shows will be charged in full.
                </span>
              </label>

              {createError && (
                <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700 border border-red-200">
                  {createError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: PAYMENT ── */}
        {step === 3 && bookingResult && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-deep-purple)' }}>
              {payMethod === 'bank_transfer' ? 'Bank Transfer Details' : 'Complete Payment'}
            </h2>

            {/* Booking summary */}
            <div className="mb-5 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', background: 'rgba(204,26,138,0.03)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Booking Summary
              </p>
              <p className="font-bold" style={{ color: 'var(--color-deep-purple)' }}>{service?.name}
                {variant ? ` — ${variant.variant_name}` : ''}
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {formatDate(date)} at {slots.find(s => s.time === time)?.label ?? time}
              </p>
              <div className="mt-3 pt-3 border-t space-y-1 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-muted)' }}>Total</span>
                  <span className="font-semibold">£{Number(bookingResult.total_price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span style={{ color: 'var(--color-primary)' }}>Deposit due now</span>
                  <span style={{ color: 'var(--color-primary)' }}>£{Number(bookingResult.deposit_amount).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs mt-2 font-mono" style={{ color: 'var(--color-text-muted)' }}>
                Ref: {bookingResult.booking_ref}
              </p>
            </div>

            {payMethod === 'bank_transfer' ? (
              <BankTransferInstructions
                bookingRef={bookingResult.booking_ref}
                amount={bookingResult.deposit_amount}
                settings={settings}
                onDone={() => setStep(4 as any)}
              />
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{
                clientSecret,
                appearance: { theme: 'stripe', variables: { colorPrimary: '#CC1A8A' } },
              }}>
                <StripePaymentForm
                  bookingRef={bookingResult.booking_ref}
                  amount={bookingResult.deposit_amount}
                />
              </Elements>
            ) : (
              <p className="text-sm animate-pulse" style={{ color: 'var(--color-text-muted)' }}>
                Setting up payment…
              </p>
            )}
          </div>
        )}

        {/* ── Booking summary sidebar (steps 0-2) ── */}
        {step < 3 && (
          <div className="px-6 pb-4 pt-0">
            {service && (
              <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(204,26,138,0.05)', borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Your selection
                </p>
                <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  {service.name}{variant ? ` — ${variant.variant_name}` : ''}
                </p>
                {addons.length > 0 && addons.map(a => (
                  <p key={a.id} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>+ {a.name}</p>
                ))}
                {date && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>📅 {formatDate(date)}</p>}
                {time && <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>🕐 {slots.find(s=>s.time===time)?.label ?? time}</p>}
                <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: 'rgba(204,26,138,0.15)' }}>
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-xs text-green-700">
                      <span>🎁 Loyalty discount</span>
                      <span className="font-semibold">−£{loyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Total</span>
                    <span>£{totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>Deposit ({settings.deposit_percent ?? 30}%)</span>
                    <span className="font-bold" style={{ color: 'var(--color-primary)' }}>£{depositAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="px-5 py-3 rounded-xl text-sm font-semibold border transition-colors"
                  style={{ color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }}>
                  ← Back
                </button>
              )}
              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed[step]}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)' }}>
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleCreateBooking}
                  disabled={!canProceed[step] || creating}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--color-primary)' }}>
                  {creating ? 'Creating booking…' : `Confirm & ${payMethod === 'stripe' ? 'Pay Deposit' : 'Get Bank Details'} →`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bank Transfer Instructions ───────────────────────────────
function BankTransferInstructions({
  bookingRef, amount, settings, onDone,
}: {
  bookingRef: string; amount: number; settings: Record<string, string>; onDone: () => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
        Please transfer the deposit to the following account. Use your booking reference as the payment reference.
      </p>

      <div className="rounded-xl p-4 space-y-3" style={{ background: '#f8f9fa', border: '1px solid var(--color-border)' }}>
        {[
          { label: 'Account Name',   value: settings.bank_account_name ?? 'BraidedbyAGB' },
          { label: 'Sort Code',      value: settings.bank_sort_code ?? '—' },
          { label: 'Account Number', value: settings.bank_account_number ?? '—' },
          { label: 'Amount',         value: `£${Number(amount).toFixed(2)}` },
          { label: 'Reference',      value: bookingRef },
        ].map(r => (
          <div key={r.label} className="flex justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>{r.label}</span>
            <span className="font-bold font-mono" style={{ color: 'var(--color-deep-purple)' }}>{r.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-4 bg-amber-50 border border-amber-200">
        <p className="text-sm text-amber-800">
          ⚠ Your booking is <strong>not confirmed</strong> until we receive and verify your bank transfer.
          This usually takes 1–2 hours during business hours. You&apos;ll receive a confirmation email once approved.
        </p>
      </div>

      <div className="text-center pt-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-deep-purple)' }}>
          Booking reference: <span className="font-mono text-lg" style={{ color: 'var(--color-primary)' }}>{bookingRef}</span>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Save this reference — you&apos;ll need it for your bank transfer.
        </p>
        <a href="/" className="inline-block mt-4 text-sm font-semibold underline"
           style={{ color: 'var(--color-primary)' }}>
          Return to home →
        </a>
      </div>
    </div>
  )
}

// ── Stripe Payment Form ──────────────────────────────────────
function StripePaymentForm({ bookingRef, amount }: { bookingRef: string; amount: number }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying,  setPaying]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setError('')
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation?ref=${bookingRef}`,
      },
    })
    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed. Please try again.')
      setPaying(false)
    }
    // On success Stripe redirects to return_url — no further handling needed here
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
        <div className="p-4">
          <PaymentElement />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-sm text-red-700 border border-red-200">{error}</div>
      )}

      <button type="submit"
        disabled={!stripe || paying}
        className="w-full py-3.5 rounded-xl text-base font-bold text-white transition-opacity disabled:opacity-50"
        style={{ background: 'var(--color-primary)' }}>
        {paying ? 'Processing payment…' : `Pay deposit £${Number(amount).toFixed(2)}`}
      </button>

      <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
        🔒 Secured by Stripe · Booking ref: {bookingRef}
      </p>
    </form>
  )
}
