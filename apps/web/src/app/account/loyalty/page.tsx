import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'Loyalty Points' }

export default async function AccountLoyaltyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/account')

  const admin = createAdminClient()

  const { data: authLink } = await admin
    .from('customer_auth')
    .select('customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const customerId = authLink?.customer_id
    ?? (await admin.from('customers').select('id').eq('email', user.email!).maybeSingle()).data?.id

  let customer: any = null
  let transactions: any[] = []
  let redeemRate = 100 // points per £1

  if (customerId) {
    const [custRes, txRes, settingRes] = await Promise.all([
      admin.from('customers').select('name, loyalty_points').eq('id', customerId).single(),
      admin.from('loyalty_transactions')
        .select('id, type, points, description, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('settings').select('setting_value').eq('setting_key', 'loyalty_redeem_rate').single(),
    ])

    customer     = custRes.data
    transactions = txRes.data ?? []
    redeemRate   = parseInt(settingRes.data?.setting_value ?? '100')
  }

  const points = customer?.loyalty_points ?? 0
  const worth  = (points / redeemRate).toFixed(2)

  function formatDt(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const typeColour: Record<string, { bg: string; color: string }> = {
    earn:          { bg: '#d1fae5', color: '#065f46' },
    redeem:        { bg: '#fee2e2', color: '#991b1b' },
    manual_add:    { bg: '#e0e7ff', color: '#3730a3' },
    manual_remove: { bg: '#fee2e2', color: '#991b1b' },
    expire:        { bg: '#f3f4f6', color: '#374151' },
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/account/dashboard" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            ← Dashboard
          </Link>
          <span className="font-bold text-base" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
            Loyalty Points
          </span>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Balance card */}
        <div
          className="rounded-2xl p-8 text-center mb-8"
          style={{ background: 'linear-gradient(135deg, var(--color-deep-purple), var(--color-primary))', color: '#fff' }}
        >
          <p className="text-sm opacity-80 mb-2">Your Balance</p>
          <p className="text-6xl font-black mb-2">{points}</p>
          <p className="text-sm opacity-80">points</p>
          {points >= redeemRate && (
            <div className="mt-4 inline-block px-4 py-2 rounded-full text-sm font-semibold"
                 style={{ background: 'rgba(255,255,255,0.2)' }}>
              ≈ £{worth} discount available
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="rounded-xl p-5 mb-8" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <h2 className="font-bold mb-3" style={{ color: 'var(--color-deep-purple)' }}>How Loyalty Points Work</h2>
          <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <p>⭐ Earn <strong>1 point</strong> for every £1 spent on appointments</p>
            <p>🎁 <strong>{redeemRate} points = £1</strong> off your next booking</p>
            <p>💡 Minimum redemption: 500 points (= £{(500 / redeemRate).toFixed(0)} off)</p>
            <p>⏰ Points expire after 12 months of account inactivity</p>
          </div>
        </div>

        {/* Transaction history */}
        <h2 className="font-bold text-lg mb-4" style={{ color: 'var(--color-deep-purple)' }}>
          History ({transactions.length})
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
              No transactions yet. Points are awarded after completed appointments.
            </p>
            <Link href="/booking" className="inline-block px-5 py-2 rounded-full font-bold text-sm text-white" style={{ background: 'var(--color-primary)' }}>
              Book an Appointment
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const style = typeColour[tx.type] ?? { bg: '#f3f4f6', color: '#374151' }
              const positive = tx.points > 0
              return (
                <div key={tx.id} className="rounded-xl px-4 py-3 flex items-center justify-between"
                     style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                      {tx.description || tx.type}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDt(tx.created_at)}
                    </p>
                  </div>
                  <span className="font-bold text-sm" style={{ color: positive ? style.color : '#dc2626' }}>
                    {positive ? '+' : ''}{tx.points}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
