// POST /api/bookings/create
// Creates a booking and returns deposit info + payment_token.
// Does NOT charge card here — Stripe payment handled separately.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmation, sendAdminNewBookingNotification } from '@/lib/emails'

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
  try {
    const body = await req.json()
    const {
      service_id,
      variant_id,
      addon_ids,        // number[]
      date,             // 'YYYY-MM-DD'
      time,             // 'HH:MM'
      payment_method,   // 'stripe' | 'bank_transfer'
      customer,         // { name, email, phone, notes }
      loyalty_points_redeemed,
    } = body

    if (!service_id || !date || !time || !customer?.email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Load service + variant to calculate price
    const { data: service } = await supabase
      .from('services')
      .select('id, name, price_from, is_active')
      .eq('id', service_id)
      .single()

    if (!service?.is_active) {
      return NextResponse.json({ error: 'Service not available' }, { status: 400 })
    }

    let basePrice = Number(service.price_from)
    let duration  = 60

    if (variant_id) {
      const { data: variant } = await supabase
        .from('service_variants')
        .select('price, duration_mins')
        .eq('id', variant_id)
        .single()
      if (variant) {
        basePrice = Number(variant.price)
        duration  = variant.duration_mins
      }
    } else {
      const { data: svc } = await supabase
        .from('services')
        .select('duration_mins')
        .eq('id', service_id)
        .single()
      if (svc) duration = svc.duration_mins
    }

    // 2. Add-on prices
    let addonTotal = 0
    const resolvedAddons: { addon_id: number; price_charged: number }[] = []
    if (addon_ids?.length) {
      const { data: addons } = await supabase
        .from('service_addons')
        .select('id, price')
        .in('id', addon_ids)
        .eq('is_active', true)
      for (const a of addons ?? []) {
        addonTotal += Number(a.price)
        resolvedAddons.push({ addon_id: a.id, price_charged: Number(a.price) })
      }
    }

    // 3. Load deposit % from settings
    const { data: depositSetting } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'deposit_percent')
      .single()
    const depositPct = parseInt(depositSetting?.setting_value ?? '30') / 100

    // 4. Loyalty discount
    let loyaltyDiscount = 0
    if (loyalty_points_redeemed > 0) {
      const { data: redeemSetting } = await supabase
        .from('settings')
        .select('setting_value')
        .eq('setting_key', 'loyalty_redeem_rate')
        .single()
      const redeemRate = parseInt(redeemSetting?.setting_value ?? '100')
      loyaltyDiscount = loyalty_points_redeemed / redeemRate
    }

    const totalPrice = Math.max(0, basePrice + addonTotal - loyaltyDiscount)
    const depositAmount = Math.ceil(totalPrice * depositPct * 100) / 100
    const remainingBalance = Math.max(0, totalPrice - depositAmount)

    // 5. Upsert customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, loyalty_points')
      .eq('email', customer.email.toLowerCase().trim())
      .maybeSingle()

    let customerId: number
    if (existingCustomer) {
      customerId = existingCustomer.id
      await supabase.from('customers').update({
        name:  customer.name,
        phone: customer.phone,
      }).eq('id', customerId)
    } else {
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          name:  customer.name,
          email: customer.email.toLowerCase().trim(),
          phone: customer.phone,
        })
        .select('id')
        .single()
      if (error || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
      }
      customerId = newCustomer.id
    }

    // 6. Check customer is not blocked
    const { data: cust } = await supabase
      .from('customers')
      .select('is_blocked')
      .eq('id', customerId)
      .single()
    if (cust?.is_blocked) {
      return NextResponse.json(
        { error: 'We are unable to accept your booking at this time. Please contact us directly.' },
        { status: 403 }
      )
    }

    // 7. Double-check slot is still available
    const slotCheck = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/bookings/slots?date=${date}&duration=${duration}`
    )
    const { slots } = await slotCheck.json()
    const slot = slots?.find((s: any) => s.time === time)
    if (!slot?.available) {
      return NextResponse.json({ error: 'This time slot is no longer available. Please choose another.' }, { status: 409 })
    }

    // 8. Create booking
    const booking_ref    = generateRef()
    const payment_token  = generateToken()

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        booking_ref,
        customer_id:            customerId,
        service_id,
        variant_id:             variant_id ?? null,
        booked_date:            date,
        booked_time:            time + ':00',
        status:                 'pending',
        payment_method:         payment_method,
        payment_method_allowed: payment_method === 'stripe' ? 'stripe' : 'bank_transfer',
        deposit_amount:         depositAmount,
        deposit_paid:           false,
        total_price:            totalPrice,
        remaining_balance:      remainingBalance,
        client_notes:           customer.notes ?? '',
        policy_accepted:        true,
        payment_token,
        loyalty_points_redeemed: loyalty_points_redeemed ?? 0,
        loyalty_discount:       loyaltyDiscount,
      })
      .select('id')
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    // 9. Insert add-ons
    if (resolvedAddons.length) {
      await supabase.from('booking_addons').insert(
        resolvedAddons.map(a => ({ booking_id: booking.id, ...a }))
      )
    }

    // 10. Deduct loyalty points
    if (loyalty_points_redeemed > 0) {
      await supabase.from('loyalty_transactions').insert({
        customer_id: customerId,
        booking_id:  booking.id,
        type:        'redeem',
        points:      -loyalty_points_redeemed,
        description: `Redeemed for booking ${booking_ref}`,
      })
      await supabase.from('customers').update({
        loyalty_points: (existingCustomer?.loyalty_points ?? 0) - loyalty_points_redeemed,
      }).eq('id', customerId)
    }

    // 11. Log activity
    await supabase.from('booking_activity').insert({
      booking_id: booking.id,
      actor:      'system',
      note:       `Booking created online. Payment method: ${payment_method}`,
    })

    // 12. Send confirmation email (fire-and-forget — don't fail the booking if email errors)
    const { data: bankSettings } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['bank_account_name', 'bank_sort_code', 'bank_account_number', 'admin_email'])

    const bs: Record<string, string> = {}
    for (const s of bankSettings ?? []) bs[s.setting_key] = s.setting_value

    const dt = new Date(date + 'T12:00:00')
    const friendlyDate = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const [hh, mm] = time.split(':')
    const hr = parseInt(hh)
    const friendlyTime = `${hr % 12 === 0 ? 12 : hr % 12}:${mm} ${hr >= 12 ? 'PM' : 'AM'}`

    void sendBookingConfirmation({
      customerName:     customer.name,
      customerEmail:    customer.email,
      bookingRef:       booking_ref,
      serviceName:      service.name,
      date:             friendlyDate,
      time:             friendlyTime,
      depositAmount:    depositAmount,
      totalPrice:       totalPrice,
      remainingBalance: remainingBalance,
      paymentMethod:    payment_method,
      bankAccountName:  bs.bank_account_name,
      bankSortCode:     bs.bank_sort_code,
      bankAccountNumber: bs.bank_account_number,
    })

    if (bs.admin_email) {
      void sendAdminNewBookingNotification({
        bookingRef:     booking_ref,
        customerName:   customer.name,
        customerEmail:  customer.email,
        customerPhone:  customer.phone ?? '',
        serviceName:    service.name,
        date:           friendlyDate,
        time:           friendlyTime,
        depositAmount:  depositAmount,
        paymentMethod:  payment_method,
        adminEmail:     bs.admin_email,
      })
    }

    return NextResponse.json({
      success:        true,
      booking_ref,
      booking_id:     booking.id,
      payment_token,
      deposit_amount: depositAmount,
      total_price:    totalPrice,
      payment_method,
    })
  } catch (err: any) {
    console.error('[bookings/create]', err)
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 })
  }
}
