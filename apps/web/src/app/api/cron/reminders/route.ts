// GET /api/cron/reminders
// Called by Vercel Cron (every 30 min). Sends:
//   1. 24-hour customer reminders
//   2. 2-hour customer reminders
//   3. Admin morning brief (7:30 AM UK)
//   4. Admin evening preview (8:00 PM UK)
//
// Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
// Set CRON_SECRET to any random string you generate (e.g. openssl rand -hex 32)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail, sendTwoHourReminderEmail, sendAdminMorningBrief } from '@/lib/emails'

export const runtime = 'nodejs'

function toMinutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export async function GET(req: NextRequest) {
  // Vercel sends: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase  = createAdminClient()
  const nowUtc    = new Date()
  const ukNow     = new Date(nowUtc.toLocaleString('en-GB', { timeZone: 'Europe/London' }))
  const todayDate = ukNow.toISOString().split('T')[0]
  const hourUk    = ukNow.getHours()
  const minUk     = ukNow.getMinutes()
  const nowMins   = hourUk * 60 + minUk

  const results: Record<string, number | string> = {}

  // ── 1. 24-hour reminders ──────────────────────────────────────
  const tomorrow = new Date(ukNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = tomorrow.toISOString().split('T')[0]

  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, booked_date, booked_time, remaining_balance, reminder_24h_sent, services(name), customers(name, email)')
    .eq('booked_date', tomorrowDate)
    .eq('status', 'confirmed')
    .eq('reminder_24h_sent', false)

  let sent24h = 0
  for (const b of upcomingBookings ?? []) {
    const svc = b.services as any
    const cus = b.customers as any
    if (!cus?.email) continue

    const dt = new Date(b.booked_date + 'T12:00:00')
    const fd = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const [hh, mm] = b.booked_time.split(':')
    const hr = parseInt(hh)
    const ft = `${hr % 12 === 0 ? 12 : hr % 12}:${mm} ${hr >= 12 ? 'PM' : 'AM'}`

    const { error } = await sendReminderEmail({
      customerName:     cus.name ?? 'Customer',
      customerEmail:    cus.email,
      bookingRef:       b.booking_ref,
      serviceName:      svc?.name ?? '',
      date:             fd,
      time:             ft,
      remainingBalance: Number(b.remaining_balance),
    })

    if (!error) {
      await supabase.from('bookings').update({ reminder_24h_sent: true }).eq('id', b.id)
      await supabase.from('booking_activity').insert({
        booking_id: b.id,
        actor: 'system',
        note: '24-hour reminder email sent',
      })
      sent24h++
    }
  }
  results.reminders_24h = sent24h

  // ── 2. 2-hour reminders ───────────────────────────────────────
  // Find bookings starting in 1.5–2.5 hours (to catch every 30-min cron window)
  const windowStart = nowMins + 90
  const windowEnd   = nowMins + 150

  const { data: soonBookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, booked_date, booked_time, reminder_2h_sent, services(name), customers(name, email)')
    .eq('booked_date', todayDate)
    .eq('status', 'confirmed')
    .eq('reminder_2h_sent', false)

  let sent2h = 0
  for (const b of soonBookings ?? []) {
    const bookingMins = toMinutes(b.booked_time)
    if (bookingMins < windowStart || bookingMins > windowEnd) continue

    const svc = b.services as any
    const cus = b.customers as any
    if (!cus?.email) continue

    const [hh, mm] = b.booked_time.split(':')
    const hr = parseInt(hh)
    const ft = `${hr % 12 === 0 ? 12 : hr % 12}:${mm} ${hr >= 12 ? 'PM' : 'AM'}`

    const { error } = await sendTwoHourReminderEmail({
      customerName:  cus.name ?? 'Customer',
      customerEmail: cus.email,
      bookingRef:    b.booking_ref,
      serviceName:   svc?.name ?? '',
      time:          ft,
    })

    if (!error) {
      await supabase.from('bookings').update({ reminder_2h_sent: true }).eq('id', b.id)
      await supabase.from('booking_activity').insert({
        booking_id: b.id,
        actor: 'system',
        note: '2-hour reminder email sent',
      })
      sent2h++
    }
  }
  results.reminders_2h = sent2h

  // ── 3. Admin morning brief (07:30–08:00 UK) ───────────────────
  if (hourUk === 7 && minUk >= 30) {
    const { data: lastSentRow } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'admin_morning_brief_last_sent')
      .single()

    if (lastSentRow?.setting_value !== todayDate) {
      const { data: adminEmailRow } = await supabase
        .from('settings').select('setting_value').eq('setting_key', 'admin_email').single()
      const adminEmail = adminEmailRow?.setting_value

      const { data: briefBookings } = await supabase
        .from('bookings')
        .select('booking_ref, booked_time, deposit_paid, payment_method, customers(name, phone), services(name)')
        .eq('booked_date', todayDate)
        .in('status', ['confirmed', 'pending'])
        .order('booked_time')

      if (adminEmail && briefBookings) {
        const friendlyDate = ukNow.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        await sendAdminMorningBrief({
          adminEmail,
          date: friendlyDate,
          bookings: briefBookings.map(b => {
            const cus = b.customers as any
            const svc = b.services as any
            return {
              booking_ref:    b.booking_ref,
              booked_time:    b.booked_time,
              customer_name:  cus?.name ?? '',
              customer_phone: cus?.phone ?? '',
              service_name:   svc?.name ?? '',
              deposit_paid:   b.deposit_paid,
              payment_method: b.payment_method,
            }
          }),
        })

        // Update last_sent
        await supabase.from('settings').upsert({
          setting_key:   'admin_morning_brief_last_sent',
          setting_value: todayDate,
        }, { onConflict: 'setting_key' })

        results.morning_brief = 'sent'
      }
    } else {
      results.morning_brief = 'already_sent_today'
    }
  }

  return NextResponse.json({ ok: true, date: todayDate, ...results })
}
