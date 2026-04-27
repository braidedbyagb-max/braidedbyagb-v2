import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import BookingWizard from './BookingWizard'

export const metadata: Metadata = {
  title: 'Book an Appointment',
  description: 'Book your hair braiding appointment with BraidedbyAGB in Farnborough, Hampshire.',
}

export default async function BookingPage() {
  const supabase = await createClient()

  const { data: services } = await supabase
    .from('services')
    .select(`
      id, name, slug, description, duration_mins, price_from, image_url, is_new,
      service_variants ( id, variant_name, price, duration_mins, is_active ),
      service_addons   ( id, name, price, is_active )
    `)
    .eq('is_active', true)
    .order('display_order')

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'deposit_percent',
      'bank_account_name',
      'bank_sort_code',
      'bank_account_number',
    ])

  const settings: Record<string, string> = {}
  for (const s of settingsRows ?? []) settings[s.setting_key] = s.setting_value

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>
            Book Your Appointment
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            A {settings.deposit_percent ?? 30}% deposit is required to secure your booking.
          </p>
        </div>
        <BookingWizard services={services ?? []} settings={settings} />
      </div>
    </div>
  )
}
