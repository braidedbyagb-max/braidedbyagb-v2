// POST /api/admin/bookings/complete
// Marks a booking completed, creates accounting journal entries,
// awards loyalty points, generates PDF receipt, and sends receipt email.
//
// Body: { booking_id: number, balance_method: 'cash' | 'card' | 'none' }
//   cash  → DR Cash (1010) + DR Deposits (2000) → CR Revenue (4000)
//   card  → DR Stripe (1000) + DR Deposits (2000) → CR Revenue (4000)
//   none  → No balance to collect (balance was 0); DR Deposits (2000) → CR Revenue (4000)

import { NextRequest, NextResponse } from 'next/server'
import { createClient }        from '@/lib/supabase/server'
import { createAdminClient }   from '@/lib/supabase/admin'
import { journalCashCompletion, journalTapToPayCompletion } from '@/lib/accounting'
import { awardLoyaltyPoints }  from '@/lib/loyalty'
import { createAndSendInvoice } from '@/lib/invoices'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, balance_method } = await req.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
  }
  if (!['cash', 'card', 'none'].includes(balance_method)) {
    return NextResponse.json({ error: 'Invalid balance_method (cash | card | none)' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const today    = new Date().toISOString().split('T')[0]

  // Load booking with all required fields
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, booking_ref, status,
      total_price, deposit_amount, remaining_balance,
      deposit_paid, payment_method,
      booked_date, booked_time,
      loyalty_discount, loyalty_points_redeemed,
      customer_id,
      customers ( id, name, email, loyalty_points ),
      services ( name ),
      booking_addons ( price_charged, service_addons ( name ) )
    `)
    .eq('id', booking_id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (booking.status === 'completed') {
    return NextResponse.json({ error: 'Booking already completed' }, { status: 400 })
  }

  const customer = booking.customers as any
  const service  = booking.services  as any
  const addons   = (booking.booking_addons as any[] ?? []).map((a: any) => ({
    name:  a.service_addons?.name ?? 'Add-on',
    price: Number(a.price_charged),
  }))

  const total    = Number(booking.total_price)
  const deposit  = Number(booking.deposit_amount)
  const balance  = Number(booking.remaining_balance)
  const loyDisc  = Number(booking.loyalty_discount ?? 0)

  // ── 1. Mark booking completed ─────────────────────────────
  await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', booking_id)

  // ── 2. Journal entry ──────────────────────────────────────
  try {
    if (balance_method === 'cash') {
      await journalCashCompletion(supabase, {
        bookingId:  booking_id,
        bookingRef: booking.booking_ref,
        deposit,
        balance,
        total,
        date: today,
      })
    } else if (balance_method === 'card') {
      await journalTapToPayCompletion(supabase, {
        bookingId:  booking_id,
        bookingRef: booking.booking_ref,
        deposit,
        balance,
        total,
        date: today,
      })
    } else {
      // No balance — still need to release the deposit liability to revenue
      // DR 2000 → CR 4000 for the deposit portion; balance was 0
      await journalCashCompletion(supabase, {
        bookingId:  booking_id,
        bookingRef: booking.booking_ref,
        deposit,
        balance: 0,
        total,
        date: today,
      })
    }
  } catch (err: any) {
    // Log but don't block — accounting can be corrected manually
    console.error('[complete] Journal entry failed:', err.message)
  }

  // ── 3. Log balance payment record (if balance collected) ──
  if (balance > 0 && balance_method !== 'none') {
    await supabase.from('payments').insert({
      booking_id: booking_id,
      amount:     balance,
      type:       'balance',
      method:     balance_method === 'cash' ? 'cash' : 'stripe',
      status:     'confirmed',
      confirmed_at: new Date().toISOString(),
    })
  }

  // ── 4. Award loyalty points ───────────────────────────────
  if (customer?.id) {
    try {
      await awardLoyaltyPoints(supabase, {
        customerId:  customer.id,
        bookingId:   booking_id,
        amountSpent: total - loyDisc,
        bookingRef:  booking.booking_ref,
      })
    } catch (err: any) {
      console.error('[complete] Loyalty award failed:', err.message)
    }
  }

  // ── 5. Generate invoice + send receipt email ──────────────
  try {
    await createAndSendInvoice({
      supabase,
      bookingId:        booking_id,
      bookingRef:       booking.booking_ref,
      customerId:       customer?.id ?? booking.customer_id,
      customerName:     customer?.name  ?? 'Customer',
      customerEmail:    customer?.email ?? '',
      serviceName:      service?.name   ?? 'Service',
      bookedDate:       booking.booked_date,
      bookedTime:       booking.booked_time,
      addons,
      totalPrice:       total,
      depositAmount:    deposit,
      depositPaid:      booking.deposit_paid,
      remainingBalance: balance,
      loyaltyDiscount:  loyDisc,
      paymentMethod:    balance_method === 'none'
        ? (booking.payment_method ?? 'stripe')
        : balance_method,
      invoiceStatus: 'PAID',
    })
  } catch (err: any) {
    console.error('[complete] Invoice/email failed:', err.message)
  }

  // ── 6. Activity log ───────────────────────────────────────
  const methodLabel: Record<string, string> = {
    cash: 'cash', card: 'card (terminal)', none: 'no balance due',
  }
  await supabase.from('booking_activity').insert({
    booking_id: booking_id,
    actor:      'admin',
    note:       `Booking completed — balance collected via ${methodLabel[balance_method]}`,
  })

  return NextResponse.json({ success: true })
}
