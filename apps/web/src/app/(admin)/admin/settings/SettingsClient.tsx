'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  settings: Record<string, string>
}

const SECTIONS = [
  {
    title: 'Business Details',
    fields: [
      { key: 'business_name',    label: 'Business Name',   type: 'text' },
      { key: 'business_email',   label: 'Email',           type: 'email' },
      { key: 'business_phone',   label: 'Phone',           type: 'text' },
      { key: 'business_address', label: 'Address',         type: 'text' },
    ],
  },
  {
    title: 'Booking Policy',
    fields: [
      { key: 'deposit_percent',      label: 'Deposit %',                   type: 'number', help: 'Percentage of total charged as deposit (e.g. 30)' },
      { key: 'cancellation_hours',   label: 'Late Cancellation Threshold', type: 'number', help: 'Hours before appointment that cancellation becomes "late" (e.g. 48)' },
    ],
  },
  {
    title: 'Bank Transfer Details',
    fields: [
      { key: 'bank_account_name',   label: 'Account Name',   type: 'text' },
      { key: 'bank_sort_code',      label: 'Sort Code',      type: 'text', help: 'e.g. 00-00-00' },
      { key: 'bank_account_number', label: 'Account Number', type: 'text' },
    ],
  },
  {
    title: 'Loyalty Points',
    fields: [
      { key: 'loyalty_earn_rate',         label: 'Points per £1 spent',        type: 'number', help: 'e.g. 1 = 1 point per pound' },
      { key: 'loyalty_redeem_rate',       label: 'Points per £1 off',          type: 'number', help: 'e.g. 100 = 100 points = £1' },
      { key: 'loyalty_min_redemption',    label: 'Minimum points to redeem',   type: 'number', help: 'e.g. 500' },
      { key: 'loyalty_max_redemption_pct',label: 'Max redemption (% of total)',type: 'number', help: 'e.g. 50 = max 50% off' },
      { key: 'loyalty_expiry_months',     label: 'Points expiry (months)',     type: 'number', help: 'e.g. 12 = 1 year inactivity' },
    ],
  },
  {
    title: 'Admin Notifications',
    fields: [
      { key: 'admin_notify_morning', label: 'Morning daily brief (7:30 AM)',        type: 'toggle' },
      { key: 'admin_notify_evening', label: 'Evening preview (8:00 PM)',             type: 'toggle' },
      { key: 'admin_notify_30min',   label: '30-minute pre-appointment alert',       type: 'toggle' },
    ],
  },
]

export default function SettingsClient({ settings: initial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [values, setValues] = useState<Record<string, string>>({ ...initial })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)

  async function saveSection(keys: string[]) {
    const sectionKey = keys[0]
    setSaving(sectionKey)
    for (const key of keys) {
      await supabase.from('settings')
        .upsert({ setting_key: key, setting_value: values[key] ?? '' }, { onConflict: 'setting_key' })
    }
    setSaving(null)
    setSaved(sectionKey)
    setTimeout(() => setSaved(null), 2000)
    router.refresh()
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm"
  const inputStyle = { borderColor: 'var(--color-border)', outline: 'none' }

  return (
    <div className="max-w-2xl space-y-6">
      {SECTIONS.map(section => {
        const keys = section.fields.map(f => f.key)
        const isSaving = saving === keys[0]
        const isSaved  = saved  === keys[0]

        return (
          <div key={section.title} className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-base mb-5" style={{ color: 'var(--color-deep-purple)' }}>
              {section.title}
            </h3>

            <div className="space-y-4">
              {section.fields.map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1"
                         style={{ color: 'var(--color-text-muted)' }}>
                    {field.label}
                  </label>

                  {field.type === 'toggle' ? (
                    <button
                      onClick={() => setValues(v => ({ ...v, [field.key]: v[field.key] === '1' ? '0' : '1' }))}
                      className="flex items-center gap-3"
                    >
                      <div className="relative w-10 h-6 rounded-full transition-colors"
                           style={{ background: values[field.key] === '1' ? 'var(--color-primary)' : '#d1d5db' }}>
                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
                             style={{ transform: values[field.key] === '1' ? 'translateX(16px)' : 'translateX(0)' }} />
                      </div>
                      <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {values[field.key] === '1' ? 'Enabled' : 'Disabled'}
                      </span>
                    </button>
                  ) : (
                    <input
                      type={field.type}
                      value={values[field.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      className={inputCls}
                      style={inputStyle}
                    />
                  )}

                  {'help' in field && field.help && (
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{field.help}</p>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => saveSection(keys)}
              disabled={isSaving}
              className="mt-5 px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ background: isSaved ? '#059669' : 'var(--color-primary)' }}
            >
              {isSaving ? 'Saving…' : isSaved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
