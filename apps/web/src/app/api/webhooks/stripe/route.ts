// POST /api/webhooks/stripe
// Receives Stripe events (payment_intent.succeeded, etc.)
// Handles online payments from the public booking flow.
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { journalStripeDeposit, journalTapToPayCompletion } from '@/lib/accounting'
import { sendDepositPaidConfirmation } from '@/lib/emails'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const today    = new Date().toISOString().split('T')[0]

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as any
        const { booking_id, booking_ref, collect_type } = intent.metadata

        if (!booking_id) break // Not a booking payment

        const bookingId = parseInt(booking_id)
        const amount    = intent.amount / 100 // pence → pounds

        if (collect_type === 'deposit' || !collect_type) {
          // Online deposit paid — DR Stripe, CR Deposits Held
          await supabase
            .from('bookings')
            .update({ deposit_paid: true, payment_method: 'stripe', status: 'confirmed' })
            .eq('id', bookingId)

          await journalStripeDeposit(supabase, {
            bookingId,
            bookingRef: booking_ref ?? `BKG-${bookingId}`,
            amount,
            date: today,
          })

          // Log to payments table
          await supabase.from('payments').insert({
            booking_id: bookingId,
            stripe_id:  intent.id,
            amount,
            type:   'deposit',
            method: 'stripe',
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })

          // Send deposit-paid confirmation email (fire-and-forget)
          const { data: bk } = await supabase
            .from('bookings')
            .select('booked_date, booked_time, remaining_balance, services(name), customers(name, email)')
            .eq('id', bookingId)
            .single()

          if (bk) {
            const svc = bk.services as any
            const cus = bk.customers as any
            const dt2  = new Date(bk.booked_date + 'T12:00:00')
            const fd2  = dt2.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            const [h2, m2] = bk.booked_time.split(':')
            const hr2 = parseInt(h2)
            const ft2 = `${hr2 % 12 === 0 ? 12 : hr2 % 12}:${m2} ${hr2 >= 12 ? 'PM' : 'AM'}`

            void sendDepositPaidConfirmation({
              customerName:     cus?.name ?? 'Customer',
              customerEmail:    cus?.email ?? '',
              bookingRef:       booking_ref ?? '',
              serviceName:      svc?.name ?? '',
              date:             fd2,
              time:             ft2,
              remainingBalance: Number(bk.remaining_balance),
            })
          }
        }
        break
      }

      // Handle refunds, disputes etc. here as needed
      default:
        // Ignore unhandled events
        break
    }
  } catch (err: any) {
    console.error('[webhook] Handler error:', err.message)
    // Don't return 500 — Stripe will retry; just log
  }

  return NextResponse.json({ received: true })
}
