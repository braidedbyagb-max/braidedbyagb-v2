// GET /api/bookings/slots?date=YYYY-MM-DD&duration=120
// Returns 30-min slots for the given date, marked available/unavailable.
// Duration-aware: a slot is unavailable if:
//   (a) an existing booking overlaps it, OR
//   (b) the new service starting at that slot would overlap an existing booking.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OPEN_HOUR  = 9    // 09:00
const CLOSE_HOUR = 18   // 18:00 — last possible END time
const SLOT_MINS  = 30

function toMins(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function toTime(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function formatLabel(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h > 12 ? h - 12 : h || 12
  return `${displayH}:${String(m).padStart(2,'0')} ${period}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date     = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') ?? '60')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // 1. Check if the whole day is blocked
  const { data: dayBlock } = await supabase
    .from('availability')
    .select('id')
    .eq('avail_date', date)
    .eq('is_blocked', true)
    .is('time_slot', null)
    .maybeSingle()

  if (dayBlock) {
    return NextResponse.json({ slots: [], day_blocked: true })
  }

  // 2. Load existing bookings for this date (confirmed / pending only)
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('booked_time, services(duration_mins), service_variants(duration_mins)')
    .eq('booked_date', date)
    .in('status', ['pending', 'confirmed', 'completed'])

  // 3. Load any time-specific blocks
  const { data: timeBlocks } = await supabase
    .from('availability')
    .select('time_slot')
    .eq('avail_date', date)
    .eq('is_blocked', true)
    .not('time_slot', 'is', null)

  const blockedTimes = new Set((timeBlocks ?? []).map(b => b.time_slot?.substring(0, 5)))

  // Build list of { start, end } in minutes for existing bookings
  const occupied: { start: number; end: number }[] = []
  for (const b of existingBookings ?? []) {
    const startMins = toMins((b.booked_time as string).substring(0, 5))
    const dur = (b.service_variants as any)?.duration_mins
            ?? (b.services as any)?.duration_mins
            ?? 60
    occupied.push({ start: startMins, end: startMins + dur })
  }

  // 4. Generate all possible 30-min start slots
  const openMins  = OPEN_HOUR  * 60
  const closeMins = CLOSE_HOUR * 60
  const slots = []

  for (let t = openMins; t + duration <= closeMins; t += SLOT_MINS) {
    const slotEnd = t + duration
    const timeStr = toTime(t)

    // Time-specific block
    if (blockedTimes.has(timeStr)) {
      slots.push({ time: timeStr, label: formatLabel(t), available: false })
      continue
    }

    // Overlap check:
    // New booking [t, slotEnd) overlaps existing [b.start, b.end) if:
    //   t < b.end  AND  slotEnd > b.start
    const overlaps = occupied.some(b => t < b.end && slotEnd > b.start)

    slots.push({ time: timeStr, label: formatLabel(t), available: !overlaps })
  }

  return NextResponse.json({ slots, day_blocked: false })
}
