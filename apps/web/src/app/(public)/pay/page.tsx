import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import PayPageClient from './PayPageClient'

export const metadata: Metadata = {
  title: 'Complete Your Payment — BraidedbyAGB',
  description: 'Secure your hair braiding appointment with your deposit.',
}

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function PayPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return <PayError message="No payment token found. Please use the link sent to you or contact us." />
  }

  const supabase = createAdminClient()

  // Load booking by payment_token — only valid for pending, unpaid bookings
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      id, booking_ref, booked_date, booked_time,
      deposit_amount, deposit_paid, total_price, remaining_balance,
      payment_method, payment_method_allowed, payment_token, status,
      services ( name, duration_mins ),
      service_variants ( variant_name ),
      customers ( name, email, phone ),
      booking_addons ( id, service_addons ( name ), price_charged )
    `)
    .eq('payment_token', token)
    .single()

  if (!booking) {
    return <PayError message="This payment link is invalid or has already been used." />
  }
  if (booking.deposit_paid) {
    return <PayError message="This booking has already been paid. If you have any questions, please contact us." success />
  }
  if (booking.status === 'cancelled' || booking.status === 'rejected') {
    return <PayError message="This booking has been cancelled and is no longer available for payment." />
  }

  // Load settings
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['bank_account_name', 'bank_sort_code', 'bank_account_number'])

  const settings: Record<string, string> = {}
  for (const s of settingsRows ?? []) settings[s.setting_key] = s.setting_value

  const service  = booking.services as any
  const variant  = booking.service_variants as any
  const customer = booking.customers as any
  const addons   = (booking.booking_addons ?? []) as any[]

  return (
    <PayPageClient
      booking={{
        id:             booking.id,
        booking_ref:    booking.booking_ref,
        booked_date:    booking.booked_date,
        booked_time:    booking.booked_time,
        deposit_amount: Number(booking.deposit_amount),
        total_price:    Number(booking.total_price),
        remaining_balance: Number(booking.remaining_balance),
        payment_method_allowed: booking.payment_method_allowed as 'stripe' | 'bank_transfer' | 'both',
        payment_token:  token,
        service_name:   [service?.name, variant?.variant_name].filter(Boolean).join(' — '),
        duration_mins:  service?.duration_mins ?? 60,
        addons:         addons.map((a: any) => a.service_addons?.name).filter(Boolean),
        customer_name:  customer?.name ?? '',
        customer_email: customer?.email ?? '',
      }}
      settings={settings}
    />
  )
}

function PayError({ message, success }: { message: string; success?: boolean }) {
  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
          style={{ background: success ? '#d1fae5' : '#fee2e2' }}
        >
          {success ? '✓' : '!'}
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-deep-purple)' }}>
          {success ? 'Already Paid' : 'Link Not Available'}
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {message}
        </p>
        <a
          href="mailto:hello@braidedbyagb.co.uk"
          className="px-6 py-3 rounded-full font-bold text-sm inline-block"
          style={{ background: 'var(--color-primary)', color: '#fff' }}
        >
          Contact Us
        </a>
      </div>
    </div>
  )
}
