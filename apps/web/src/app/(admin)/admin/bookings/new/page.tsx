import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import NewBookingClient from './NewBookingClient'

export const metadata: Metadata = { title: 'New Booking — Admin' }

export default async function AdminNewBookingPage() {
  const supabase = createAdminClient()

  const [{ data: services }, { data: settingsRows }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, price_from, duration_mins, is_active, service_variants(id, variant_name, price, duration_mins, is_active), service_addons(id, name, price, is_active)')
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['deposit_percent', 'bank_account_name', 'bank_sort_code', 'bank_account_number']),
  ])

  const settings: Record<string, string> = {}
  for (const s of settingsRows ?? []) settings[s.setting_key] = s.setting_value

  return <NewBookingClient services={services ?? []} settings={settings} />
}
