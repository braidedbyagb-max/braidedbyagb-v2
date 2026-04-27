import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CustomerProfileClient from './CustomerProfileClient'

export const metadata: Metadata = { title: 'Customer Profile' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [customerRes, bookingsRes, loyaltyRes, notesRes] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('bookings')
      .select('id, booking_ref, booked_date, status, total_price, services(name)')
      .eq('customer_id', id)
      .order('booked_date', { ascending: false })
      .limit(20),
    supabase.from('loyalty_transactions')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('customer_notes')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (customerRes.error || !customerRes.data) notFound()

  // Calculate LTV
  const ltv = (bookingsRes.data ?? [])
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  return (
    <CustomerProfileClient
      customer={customerRes.data}
      bookings={bookingsRes.data ?? []}
      loyalty={loyaltyRes.data ?? []}
      notes={notesRes.data ?? []}
      ltv={ltv}
    />
  )
}
