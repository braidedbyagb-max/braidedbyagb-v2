import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Loyalty Points' }

export default async function LoyaltyPage() {
  const supabase = await createClient()

  const [customersRes, recentRes, settingsRes] = await Promise.all([
    // Top customers by points
    supabase
      .from('customers')
      .select('id, name, email, loyalty_points')
      .gt('loyalty_points', 0)
      .order('loyalty_points', { ascending: false })
      .limit(20),
    // Recent transactions
    supabase
      .from('loyalty_transactions')
      .select('*, customers(name)')
      .order('created_at', { ascending: false })
      .limit(30),
    // Settings for earn/redeem rates
    supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['loyalty_earn_rate','loyalty_redeem_rate','loyalty_min_redemption']),
  ])

  const settings: Record<string, string> = {}
  for (const s of settingsRes.data ?? []) settings[s.setting_key] = s.setting_value

  const totalOutstanding = (customersRes.data ?? [])
    .reduce((sum, c) => sum + (c.loyalty_points ?? 0), 0)
  const totalLiability = totalOutstanding / parseInt(settings.loyalty_redeem_rate ?? '100')

  const TYPE_STYLE: Record<string, { color: string; label: string }> = {
    earn:          { color: '#059669', label: 'Earned' },
    redeem:        { color: '#7c3aed', label: 'Redeemed' },
    manual_add:    { color: '#0284c7', label: 'Manual Add' },
    manual_remove: { color: '#dc2626', label: 'Manual Remove' },
    expire:        { color: '#6b7280', label: 'Expired' },
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Total Points Outstanding</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
            {totalOutstanding.toLocaleString()} pts
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Points Liability (£)</p>
          <p className="text-2xl font-bold text-amber-700">
            £{totalLiability.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1"
             style={{ color: 'var(--color-text-muted)' }}>Active Members</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            {customersRes.data?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top customers */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
              Top Loyalty Members
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {(customersRes.data ?? []).slice(0, 10).map((c: any, i: number) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold w-6 text-center"
                        style={{ color: i < 3 ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>
                    {c.loyalty_points.toLocaleString()} pts
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    = £{(c.loyalty_points / parseInt(settings.loyalty_redeem_rate ?? '100')).toFixed(2)}
                  </p>
                  <Link href={`/admin/crm/${c.id}`}
                    className="text-xs underline" style={{ color: 'var(--color-primary)' }}>
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
              Recent Transactions
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            {(recentRes.data ?? []).map((t: any) => {
              const style = TYPE_STYLE[t.type] ?? { color: '#6b7280', label: t.type }
              return (
                <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {t.customers?.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold" style={{ color: style.color }}>
                        {style.label}
                      </span>
                      {t.description && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          · {t.description}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(t.created_at).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <span className="font-bold text-sm"
                        style={{ color: t.points >= 0 ? '#059669' : '#dc2626' }}>
                    {t.points >= 0 ? '+' : ''}{t.points} pts
                  </span>
                </div>
              )
            })}
            {!recentRes.data?.length && (
              <p className="px-6 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                No transactions yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rate summary */}
      <div className="mt-6 bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-4"
            style={{ color: 'var(--color-text-muted)' }}>Current Rates</h3>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Earn rate</p>
            <p className="font-bold text-lg mt-1" style={{ color: 'var(--color-text)' }}>
              {settings.loyalty_earn_rate ?? 1} pt per £1
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Redeem rate</p>
            <p className="font-bold text-lg mt-1" style={{ color: 'var(--color-text)' }}>
              {settings.loyalty_redeem_rate ?? 100} pts = £1
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--color-text-muted)' }}>Minimum to redeem</p>
            <p className="font-bold text-lg mt-1" style={{ color: 'var(--color-text)' }}>
              {settings.loyalty_min_redemption ?? 500} pts
            </p>
          </div>
        </div>
        <Link href="/admin/settings"
          className="inline-block mt-4 text-xs font-semibold underline"
          style={{ color: 'var(--color-primary)' }}>
          Change rates in Settings →
        </Link>
      </div>
    </div>
  )
}
