import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import SettingsClient from './SettingsClient'
import BrandThemeClient from './BrandThemeClient'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('settings').select('setting_key, setting_value')

  const settings: Record<string, string> = {}
  for (const row of rows ?? []) {
    settings[row.setting_key] = row.setting_value
  }

  return (
    <div className="space-y-6">
      <SettingsClient settings={settings} />
      <BrandThemeClient settings={settings} />
    </div>
  )
}
