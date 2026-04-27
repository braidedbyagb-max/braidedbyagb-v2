import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BookingDetailClient from './BookingDetailClient'

export const metadata: Metadata = { title: 'Booking Detail' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers ( * ),
      services ( name, duration_mins ),
      service_variants ( variant_name ),
      booking_addons ( price_charged, service_addons ( name ) ),
      invoices ( id, invoice_number, amount, status, pdf_url, sent_at )
    `)
    .eq('id', id)
    .single()

  if (error || !booking) notFound()

  const { data: activity } = await supabase
    .from('booking_activity')
    .select('*')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })

  return <BookingDetailClient booking={booking} activity={activity ?? []} />
}
