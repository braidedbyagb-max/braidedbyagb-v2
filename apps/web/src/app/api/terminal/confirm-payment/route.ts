// POST /api/terminal/confirm-payment
// Called by the mobile app after Stripe Terminal SDK confirms the payment.
// Handles:
//   1. Verifying payment status with Stripe
//   2. Updating booking (deposit_paid / status / remaining_balance)
//   3. Creating double-entry journal entries
//   4. Generating invoice number + triggering PDF/email (via /api/accounting/send-invoice)
//
// Body: { payment_intent_id: string }
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { journalTapToPayCompletion, journalStripeDeposit } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  try {
    const { payment_intent_id } = await req.json()

    if (!payment_intent_id) {
      return NextResponse.json({ error: 'Missing payment_intent_id' }, { status: 400 })
    }

    // 1. Verify the intent actually succeeded
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id)
    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `PaymentIntent status is ${intent.status}, not succeeded` },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 2. Load the in-person payment record
    const { data: ipp, error: ippError } = await supabase
      .from('in_person_payments')
      .select('id, booking_id, collect_type, amount, status')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single()

    if (ippError || !ipp) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    if (ipp.status === 'succeeded') {
      // Already processed (idempotent)
      return NextResponse.json({ success: true, already_processed: true })
    }

    // 3. Load the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, booking_ref, deposit_amount, remaining_balance, total_price, status, deposit_paid, customer_id')
      .eq('id', ipp.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]
    let journalEntryId: number

    // 4. Update booking + create journal entry based on collect_type
    if (ipp.collect_type === 'deposit') {
      // Deposit collected via Tap to Pay
      await supabase
        .from('bookings')
        .update({
          deposit_paid: true,
          payment_method: 'tap_to_pay',
          status: booking.status === 'pending' ? 'confirmed' : booking.status,
        })
        .eq('id', booking.id)

      journalEntryId = await journalStripeDeposit(supabase, {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        amount: Number(booking.deposit_amount),
        date: today,
      })

    } else if (ipp.collect_type === 'balance') {
      // Balance collected — booking is now complete
      const deposit = Number(booking.deposit_amount)
      const balance = Number(booking.remaining_balance)
      const total   = Number(booking.total_price)

      await supabase
        .from('bookings')
        .update({
          remaining_balance: 0,
          status: 'completed',
        })
        .eq('id', booking.id)

      journalEntryId = await journalTapToPayCompletion(supabase, {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        deposit,
        balance,
        total,
        date: today,
      })

    } else {
      // 'full' — no prior deposit, full amount charged in one go
      const total = Number(booking.total_price)

      await supabase
        .from('bookings')
        .update({
          deposit_paid: true,
          remaining_balance: 0,
          status: 'completed',
          payment_method: 'tap_to_pay',
        })
        .eq('id', booking.id)

      // Full payment treated as deposit + immediate revenue recognition
      journalEntryId = await journalTapToPayCompletion(supabase, {
        bookingId: booking.id,
        bookingRef: booking.booking_ref,
        deposit: 0,
        balance: total,
        total,
        date: today,
      })
    }

    // 5. Mark the in-person payment as succeeded + link journal entry
    await supabase
      .from('in_person_payments')
      .update({ status: 'succeeded', journal_entry_id: journalEntryId })
      .eq('id', ipp.id)

    // 6. Create invoice number + trigger PDF/email (fire-and-forget)
    const invoiceNumber = await generateInvoiceNumber(supabase)
    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        type: 'receipt',
        booking_id: booking.id,
        customer_id: booking.customer_id,
        amount: ipp.amount,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (invoice) {
      await supabase
        .from('in_person_payments')
        .update({ invoice_id: invoice.id })
        .eq('id', ipp.id)
    }

    // TODO: trigger PDF generation + Resend email
    // await sendInvoiceEmail(booking, invoice)

    return NextResponse.json({
      success: true,
      booking_ref: booking.booking_ref,
      invoice_number: invoiceNumber,
      journal_entry_id: journalEntryId,
    })

  } catch (err: any) {
    console.error('[terminal/confirm-payment]', err)
    return NextResponse.json(
      { error: err.message ?? 'Internal error' },
      { status: 500 }
    )
  }
}

async function generateInvoiceNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await supabase.rpc('next_invoice_number')
  return data as string
}
