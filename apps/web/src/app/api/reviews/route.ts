// POST /api/reviews
// Accepts a review submission from the public review page.
// Handles both token-based (ref=BOOKING_REF) and walk-in (name + email) submissions.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewReviewNotification } from '@/lib/emails'

export async function POST(req: NextRequest) {
  try {
    const { rating, review_text, reviewer_name, reviewer_email, service_name, token } =
      await req.json()

    // ── Basic validation ────────────────────────────────────────
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating.' }, { status: 400 })
    }
    if (!review_text || review_text.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters.' }, { status: 400 })
    }
    if (!reviewer_name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    let customerId: number | null = null
    let bookingId:  number | null = null
    let serviceId:  number | null = null
    let clientName  = reviewer_name.trim()

    // ── Token-based (booking ref link) ──────────────────────────
    if (token) {
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_id,
          service_id,
          customers(name, email),
          services(name)
        `)
        .eq('booking_ref', token.toUpperCase())
        .eq('status', 'completed')
        .single()

      if (booking) {
        bookingId  = booking.id
        customerId = booking.customer_id
        serviceId  = booking.service_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clientName = (booking.customers as any)?.name ?? clientName
      }
    }

    // ── Walk-in: upsert customer by email ───────────────────────
    if (!customerId && reviewer_email?.trim()) {
      const email = reviewer_email.trim().toLowerCase()

      // Look for existing customer
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .single()

      if (existing) {
        customerId = existing.id
      } else {
        // Create a minimal customer record
        const { data: created } = await supabase
          .from('customers')
          .insert({
            name:  clientName,
            email,
            phone: '',
          })
          .select('id')
          .single()

        if (created) customerId = created.id
      }
    }

    // ── Look up service by name if not known ────────────────────
    if (!serviceId && service_name?.trim()) {
      const { data: svc } = await supabase
        .from('services')
        .select('id')
        .ilike('name', `%${service_name.trim()}%`)
        .limit(1)
        .single()

      if (svc) serviceId = svc.id
    }

    // ── Insert review ───────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('reviews')
      .insert({
        booking_id:  bookingId,
        customer_id: customerId,
        service_id:  serviceId,
        client_name: clientName,
        rating,
        review_text: review_text.trim(),
        status:      'pending',
      })

    if (insertError) {
      console.error('[reviews] insert error:', insertError)
      return NextResponse.json({ error: 'Could not save review. Please try again.' }, { status: 500 })
    }

    // ── Notify admin ────────────────────────────────────────────
    const { data: adminEmailRow } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'admin_email')
      .single()

    const adminEmail =
      adminEmailRow?.setting_value ??
      process.env.ADMIN_EMAIL ??
      'hello@braidedbyagb.co.uk'

    await sendNewReviewNotification({
      adminEmail,
      reviewerName: clientName,
      rating,
      reviewText:  review_text.trim(),
      serviceName: service_name?.trim() || null,
    }).catch(err => console.error('[reviews] notify email failed:', err))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[reviews] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
