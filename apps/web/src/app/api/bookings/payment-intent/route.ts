// POST /api/bookings/payment-intent
// Creates a Stripe PaymentIntent for an online deposit.
// Body: { booking_ref: string }
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { booking_ref } = await req.json()
    if (!booking_ref) return NextResponse.json({ error: 'Missing booking_ref' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, booking_ref, deposit_amount, deposit_paid, customer_id, customers(email, name)')
      .eq('booking_ref', booking_ref)
      .single()

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (booking.deposit_paid) return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 })

    const amountPence = Math.round(Number(booking.deposit_amount) * 100)
    const customer = booking.customers as any

    const intent = await stripe.paymentIntents.create({
      amount:               amountPence,
      currency:             'gbp',
      payment_method_types: ['card'],
      metadata: {
        booking_id:   String(booking.id),
        booking_ref:  booking.booking_ref,
        collect_type: 'deposit',
      },
      receipt_email: customer?.email ?? undefined,
      description:   `Deposit for booking ${booking.booking_ref}`,
    })

    return NextResponse.json({ client_secret: intent.client_secret, amount: amountPence / 100 })
  } catch (err: any) {
    console.error('[bookings/payment-intent]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
