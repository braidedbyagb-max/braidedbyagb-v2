// POST /api/admin/bookings/create
// Admin-side booking creation (bypasses slot check, no deposit required upfront).
// Creates the booking, generates a payment link, optionally sends confirmation email.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmation } from '@/lib/emails'

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let ref = 'BKG-'
  for (let i = 0; i < 8; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
}

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    service_id, variant_id, addon_ids,
    date, time,
    payment_method,           // 'stripe' | 'bank_transfer'
    payment_method_allowed,   // 'stripe' | 'bank_transfer' | 'both'
    customer,                 // { name, email, phone, notes }
    send_confirmation_email,
  } = body

  if (!service_id || !date || !time || !customer?.email || !customer?.name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Load service
  const { data: service } = await admin
    .from('services')
    .select('id, name, price_from, duration_mins')
    .eq('id', service_id)
    .single()

  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  let basePrice = Number(service.price_from)
  let duration  = service.duration_mins

  if (variant_id) {
    const { data: variant } = await admin
      .from('service_variants')
      .select('price, duration_mins')
      .eq('id', variant_id)
      .single()
    if (variant) {
      basePrice = Number(variant.price)
      duration  = variant.duration_mins
    }
  }

  // Add-ons
  let addonTotal = 0
  const resolvedAddons: { addon_id: number; price_charged: number }[] = []
  if (addon_ids?.length) {
    const { data: addons } = await admin
      .from('service_addons')
      .select('id, price')
      .in('id', addon_ids)
      .eq('is_active', true)
    for (const a of addons ?? []) {
      addonTotal += Number(a.price)
      resolvedAddons.push({ addon_id: a.id, price_charged: Number(a.price) })
    }
  }

  // Deposit %
  const { data: depositSetting } = await admin
    .from('settings')
    .select('setting_value')
    .eq('setting_key', 'deposit_percent')
    .single()
  const depositPct  = parseInt(depositSetting?.setting_value ?? '30') / 100
  const totalPrice  = basePrice + addonTotal
  const depositAmt  = Math.ceil(totalPrice * depositPct * 100) / 100
  const remaining   = Math.max(0, totalPrice - depositAmt)

  // Upsert customer
  const { data: existingCust } = await admin
    .from('customers')
    .select('id')
    .eq('email', customer.email.toLowerCase().trim())
    .maybeSingle()

  let customerId: number
  if (existingCust) {
    customerId = existingCust.id
    await admin.from('customers').update({ name: customer.name, phone: customer.phone ?? '' }).eq('id', customerId)
  } else {
    const { data: newCust, error: custErr } = await admin
      .from('customers')
      .insert({ name: customer.name, email: customer.email.toLowerCase().trim(), phone: customer.phone ?? '' })
      .select('id')
      .single()
    if (custErr || !newCust) return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
    customerId = newCust.id
  }

  // Check blocked
  const { data: cust } = await admin.from('customers').select('is_blocked').eq('id', customerId).single()
  if (cust?.is_blocked) {
    return NextResponse.json({ error: 'Customer is blocked from booking' }, { status: 403 })
  }

  // Create booking
  const booking_ref    = generateRef()
  const payment_token  = generateToken()
  const effPayMethod   = payment_method ?? (payment_method_allowed === 'stripe' ? 'stripe' : 'bank_transfer')

  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .insert({
      booking_ref,
      customer_id:            customerId,
      service_id,
      variant_id:             variant_id ?? null,
      booked_date:            date,
      booked_time:            time.includes(':') ? (time.length === 5 ? time + ':00' : time) : time + ':00',
      status:                 'pending',
      payment_method:         effPayMethod,
      payment_method_allowed: payment_method_allowed ?? 'both',
      deposit_amount:         depositAmt,
      deposit_paid:           false,
      total_price:            totalPrice,
      remaining_balance:      remaining,
      client_notes:           customer.notes ?? '',
      policy_accepted:        true,
      payment_token,
    })
    .select('id')
    .single()

  if (bookingErr || !booking) {
    return NextResponse.json({ error: bookingErr?.message ?? 'Failed to create booking' }, { status: 500 })
  }

  // Add-ons
  if (resolvedAddons.length) {
    await admin.from('booking_addons').insert(
      resolvedAddons.map(a => ({ booking_id: booking.id, ...a }))
    )
  }

  // Activity log
  await admin.from('booking_activity').insert({
    booking_id: booking.id,
    actor: 'admin',
    note: `Booking created manually by admin. Payment method: ${effPayMethod}`,
  })

  // Optional confirmation email
  if (send_confirmation_email) {
    const { data: bankSettings } = await admin
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['bank_account_name', 'bank_sort_code', 'bank_account_number'])

    const bs: Record<string, string> = {}
    for (const s of bankSettings ?? []) bs[s.setting_key] = s.setting_value

    const dt = new Date(date + 'T12:00:00')
    const fd = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const [hh, mm] = time.split(':')
    const hr = parseInt(hh)
    const ft = `${hr % 12 === 0 ? 12 : hr % 12}:${mm} ${hr >= 12 ? 'PM' : 'AM'}`

    void sendBookingConfirmation({
      customerName:      customer.name,
      customerEmail:     customer.email,
      bookingRef:        booking_ref,
      serviceName:       service.name,
      date:              fd,
      time:              ft,
      depositAmount:     depositAmt,
      totalPrice:        totalPrice,
      remainingBalance:  remaining,
      paymentMethod:     effPayMethod as 'stripe' | 'bank_transfer',
      bankAccountName:   bs.bank_account_name,
      bankSortCode:      bs.bank_sort_code,
      bankAccountNumber: bs.bank_account_number,
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const paymentLink = `${appUrl}/pay?token=${payment_token}`

  return NextResponse.json({
    success:        true,
    booking_ref,
    booking_id:     booking.id,
    payment_token,
    payment_link:   paymentLink,
    deposit_amount: depositAmt,
    total_price:    totalPrice,
  })
}
