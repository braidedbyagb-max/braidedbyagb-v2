// POST /api/admin/bookings/confirm-deposit
// Confirms a bank transfer deposit: updates booking, creates journal entry, sends email.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { journalBankTransferDeposit } from '@/lib/accounting'
import { sendDepositPaidConfirmation } from '@/lib/emails'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id } = await req.json()
  if (!booking_id) return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })

  const admin = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Load booking
  const { data: booking } = await admin
    .from('bookings')
    .select('id, booking_ref, deposit_amount, deposit_paid, status, booked_date, booked_time, remaining_balance, services(name), customers(name, email)')
    .eq('id', booking_id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.deposit_paid) return NextResponse.json({ error: 'Deposit already confirmed' }, { status: 400 })

  // Mark as paid + confirmed
  await admin.from('bookings').update({
    deposit_paid: true,
    status: booking.status === 'pending' ? 'confirmed' : booking.status,
  }).eq('id', booking_id)

  // Log payment record
  await admin.from('payments').insert({
    booking_id: booking_id,
    amount:     Number(booking.deposit_amount),
    type:       'deposit',
    method:     'bank_transfer',
    status:     'confirmed',
    confirmed_at: new Date().toISOString(),
  })

  // Journal entry
  await journalBankTransferDeposit(admin, {
    bookingId:  booking_id,
    bookingRef: booking.booking_ref,
    amount:     Number(booking.deposit_amount),
    date:       today,
  })

  // Activity log
  await admin.from('booking_activity').insert({
    booking_id: booking_id,
    actor: 'admin',
    note: 'Bank transfer deposit confirmed manually',
  })

  // Send confirmation email (fire-and-forget)
  const svc = booking.services as any
  const cus = booking.customers as any
  if (cus?.email) {
    const dt = new Date(booking.booked_date + 'T12:00:00')
    const fd = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const [hh, mm] = booking.booked_time.split(':')
    const hr = parseInt(hh)
    const ft = `${hr % 12 === 0 ? 12 : hr % 12}:${mm} ${hr >= 12 ? 'PM' : 'AM'}`

    void sendDepositPaidConfirmation({
      customerName:     cus.name ?? 'Customer',
      customerEmail:    cus.email,
      bookingRef:       booking.booking_ref,
      serviceName:      svc?.name ?? '',
      date:             fd,
      time:             ft,
      remainingBalance: Number(booking.remaining_balance),
    })
  }

  return NextResponse.json({ success: true })
}
