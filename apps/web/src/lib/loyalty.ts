// ============================================================
// BraidedbyAGB — Loyalty Points Helpers
// ============================================================
// Points are earned on booking completion (1 pt per £1 spent by default).
// Points are redeemed at checkout (100 pts = £1 by default).
// All rates are configurable in admin settings.

import { SupabaseClient } from '@supabase/supabase-js'

// ── Rate helpers ──────────────────────────────────────────────

async function getLoyaltyRates(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'loyalty_earn_rate',
      'loyalty_redeem_rate',
      'loyalty_min_redemption',
      'loyalty_max_redemption_pct',
    ])

  const s: Record<string, string> = {}
  for (const row of data ?? []) s[row.setting_key] = row.setting_value

  return {
    earnRate:        parseFloat(s.loyalty_earn_rate        ?? '1'),   // pts per £1
    redeemRate:      parseFloat(s.loyalty_redeem_rate      ?? '100'), // pts per £1 off
    minRedemption:   parseInt(s.loyalty_min_redemption     ?? '500'), // min pts to redeem
    maxRedemptionPct:parseFloat(s.loyalty_max_redemption_pct ?? '50'),// max % of booking total
  }
}

// ── Award points on booking completion ───────────────────────

export async function awardLoyaltyPoints(
  supabase: SupabaseClient,
  {
    customerId,
    bookingId,
    amountSpent,   // total booking amount (after any loyalty discount)
    bookingRef,
  }: {
    customerId: number
    bookingId:  number
    amountSpent: number
    bookingRef:  string
  }
): Promise<{ pointsAwarded: number }> {
  const { earnRate } = await getLoyaltyRates(supabase)
  const points = Math.floor(amountSpent * earnRate)

  if (points <= 0) return { pointsAwarded: 0 }

  // Log the transaction
  await supabase.from('loyalty_transactions').insert({
    customer_id: customerId,
    booking_id:  bookingId,
    type:        'earn',
    points,
    description: `Earned on ${bookingRef}`,
  })

  // Increment customer balance (read-then-write; safe for single-admin use)
  const { data: cust } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()

  const newBalance = (cust?.loyalty_points ?? 0) + points
  await supabase.from('customers').update({ loyalty_points: newBalance }).eq('id', customerId)

  return { pointsAwarded: points }
}

// ── Manual points adjustment (admin) ─────────────────────────

export async function adjustLoyaltyPoints(
  supabase: SupabaseClient,
  {
    customerId,
    points,         // positive = add, negative = remove
    type,           // 'manual_add' | 'manual_remove'
    description,
  }: {
    customerId:  number
    points:      number
    type:        'manual_add' | 'manual_remove'
    description: string
  }
): Promise<{ newBalance: number }> {
  await supabase.from('loyalty_transactions').insert({
    customer_id: customerId,
    type,
    points,
    description,
  })

  const { data: cust } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()

  const newBalance = Math.max(0, (cust?.loyalty_points ?? 0) + points)
  await supabase.from('customers').update({ loyalty_points: newBalance }).eq('id', customerId)

  return { newBalance }
}

// ── Validate and apply a redemption at checkout ───────────────

export async function validateRedemption(
  supabase: SupabaseClient,
  {
    customerId,
    pointsToRedeem,
    bookingTotal,
  }: {
    customerId:     number
    pointsToRedeem: number
    bookingTotal:   number
  }
): Promise<{ valid: boolean; discountAmount: number; error?: string }> {
  const { redeemRate, minRedemption, maxRedemptionPct } = await getLoyaltyRates(supabase)

  const { data: cust } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()

  const balance = cust?.loyalty_points ?? 0

  if (pointsToRedeem < minRedemption) {
    return { valid: false, discountAmount: 0, error: `Minimum ${minRedemption} points to redeem` }
  }
  if (pointsToRedeem > balance) {
    return { valid: false, discountAmount: 0, error: 'Insufficient points' }
  }

  const discountAmount  = pointsToRedeem / redeemRate
  const maxDiscount     = (bookingTotal * maxRedemptionPct) / 100

  if (discountAmount > maxDiscount) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Maximum redemption is ${maxRedemptionPct}% of booking total (£${maxDiscount.toFixed(2)})`,
    }
  }

  return { valid: true, discountAmount }
}

// ── Redeem points on booking creation ────────────────────────

export async function redeemLoyaltyPoints(
  supabase: SupabaseClient,
  {
    customerId,
    bookingId,
    pointsToRedeem,
    bookingRef,
  }: {
    customerId:     number
    bookingId:      number
    pointsToRedeem: number
    bookingRef:     string
  }
): Promise<{ newBalance: number }> {
  await supabase.from('loyalty_transactions').insert({
    customer_id: customerId,
    booking_id:  bookingId,
    type:        'redeem',
    points:      -pointsToRedeem, // negative = deducted
    description: `Redeemed on ${bookingRef}`,
  })

  const { data: cust } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .single()

  const newBalance = Math.max(0, (cust?.loyalty_points ?? 0) - pointsToRedeem)
  await supabase.from('customers').update({ loyalty_points: newBalance }).eq('id', customerId)

  return { newBalance }
}
