import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase.from('settings').select('setting_key, setting_value')

  const settings: Record<string, string> = {}
  for (const row of rows ?? []) {
    settings[row.setting_key] = row.setting_value
  }

  return <SettingsClient settings={settings} />
}
