import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import CalendarClient from './CalendarClient'

export const metadata: Metadata = { title: 'Calendar' }

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const now   = new Date()
  const year  = parseInt(params.year  ?? String(now.getFullYear()))
  const month = parseInt(params.month ?? String(now.getMonth() + 1))

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createAdminClient()

  const [bookingsRes, blocksRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, booking_ref, booked_date, booked_time, status, customers(name), services(name, duration_mins)')
      .gte('booked_date', from)
      .lte('booked_date', to)
      .not('status', 'in', '("cancelled","late_cancelled")')
      .eq('is_archived', false)
      .order('booked_time'),
    supabase
      .from('availability')
      .select('*')
      .gte('avail_date', from)
      .lte('avail_date', to),
  ])

  return (
    <CalendarClient
      year={year}
      month={month}
      bookings={bookingsRes.data ?? []}
      blocks={blocksRes.data ?? []}
    />
  )
}
