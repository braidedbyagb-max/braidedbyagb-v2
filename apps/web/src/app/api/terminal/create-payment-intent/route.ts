// POST /api/terminal/create-payment-intent
// Creates a Stripe PaymentIntent for an in-person card collection.
// Body: { booking_id: number, collect_type: 'deposit' | 'balance' | 'full' }
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type { CreateTerminalPaymentIntentBody, CreateTerminalPaymentIntentResponse } from '@braidedbyagb/shared'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateTerminalPaymentIntentBody
    const { booking_id, collect_type } = body

    if (!booking_id || !collect_type) {
      return NextResponse.json({ error: 'Missing booking_id or collect_type' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Load the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_ref, deposit_amount, remaining_balance, total_price, status, deposit_paid')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Determine the amount to charge
    let amountPence: number
    if (collect_type === 'deposit') {
      if (booking.deposit_paid) {
        return NextResponse.json({ error: 'Deposit already paid' }, { status: 400 })
      }
      amountPence = Math.round(Number(booking.deposit_amount) * 100)
    } else if (collect_type === 'balance') {
      const balance = Number(booking.remaining_balance)
      if (balance <= 0) {
        return NextResponse.json({ error: 'No balance outstanding' }, { status: 400 })
      }
      amountPence = Math.round(balance * 100)
    } else {
      // 'full' — charge entire total (e.g. walk-in, no prior deposit)
      amountPence = Math.round(Number(booking.total_price) * 100)
    }

    if (amountPence < 30) {
      // Stripe minimum is 30p
      return NextResponse.json({ error: 'Amount too small' }, { status: 400 })
    }

    // Create PaymentIntent with capture_method: automatic (Terminal handles capture)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: 'gbp',
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        booking_id: String(booking_id),
        booking_ref: booking.booking_ref,
        collect_type,
      },
    })

    // Log the in-person payment (status: processing)
    await supabase.from('in_person_payments').insert({
      booking_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: amountPence / 100,
      collect_type,
      method: 'tap_to_pay',
      status: 'processing',
    })

    const response: CreateTerminalPaymentIntentResponse = {
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret!,
      amount: amountPence / 100,
      currency: 'gbp',
    }

    return NextResponse.json(response)
  } catch (err: any) {
    console.error('[terminal/create-payment-intent]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    )
  }
}
