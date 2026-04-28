// POST /api/admin/bookings/cancel
// Cancels or late-cancels a booking.
// - Archives the booking (hidden from default list)
// - If late_cancelled and deposit was paid: journals cancellation fee (deposit forfeited)
// - Sends cancellation email to client
//
// Body: { booking_id: number, status: 'cancelled' | 'late_cancelled' | 'no_show' }

import { NextRequest, NextResponse } from 'next/server'
import { createClient }       from '@/lib/supabase/server'
import { createAdminClient }  from '@/lib/supabase/admin'
import { journalCancellationFee } from '@/lib/accounting'
import { sendCancellationEmail }  from '@/lib/emails'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Auth check
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { booking_id, status } = await req.json()

  if (!booking_id) {
    return NextResponse.json({ error: 'Missing booking_id' }, { status: 400 })
  }
  if (!['cancelled', 'late_cancelled', 'no_show'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status (cancelled | late_cancelled | no_show)' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const today    = new Date().toISOString().split('T')[0]

  // Load booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, booking_ref, status,
      deposit_paid, deposit_amount,
      booked_date, booked_time,
      customers ( name, email ),
      services ( name )
    `)
    .eq('id', booking_id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }
  if (['completed', 'cancelled', 'late_cancelled'].includes(booking.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a booking with status: ${booking.status}` },
      { status: 400 }
    )
  }

  const customer = booking.customers as any
  const service  = booking.services  as any
  const deposit  = Number(booking.deposit_amount)

  // ── 1. Update status + archive ────────────────────────────
  await supabase
    .from('bookings')
    .update({ status, is_archived: true })
    .eq('id', booking_id)

  // ── 2. Cancellation fee journal (late cancel + deposit paid) ──
  const depositForfeited = status === 'late_cancelled' && booking.deposit_paid && deposit > 0
  if (depositForfeited) {
    try {
      await journalCancellationFee(supabase, {
        bookingId:  booking_id,
        bookingRef: booking.booking_ref,
        deposit,
        date: today,
      })
    } catch (err: any) {
      console.error('[cancel] Cancellation fee journal failed:', err.message)
    }
  }

  // ── 3. Send cancellation email ────────────────────────────
  if (customer?.email) {
    const dt = new Date(booking.booked_date + 'T12:00:00')
    const fd = dt.toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    void sendCancellationEmail({
      customerName:     customer.name  ?? 'Customer',
      customerEmail:    customer.email,
      bookingRef:       booking.booking_ref,
      serviceName:      service?.name  ?? 'your appointment',
      date:             fd,
      depositForfeited,
    })
  }

  // ── 4. Activity log ───────────────────────────────────────
  const noteMap: Record<string, string> = {
    cancelled:      'Booking cancelled by admin',
    late_cancelled: `Late cancellation by admin${depositForfeited ? ' — deposit forfeited' : ''}`,
    no_show:        'Marked as no-show',
  }
  await supabase.from('booking_activity').insert({
    booking_id: booking_id,
    actor:      'admin',
    note:       noteMap[status],
  })

  return NextResponse.json({ success: true, depositForfeited })
}
