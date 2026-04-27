import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ProfileClient from './ProfileClient'

export const metadata: Metadata = { title: 'My Profile' }

export default async function AccountProfilePage() {
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
  if (customerId) {
    const { data } = await admin
      .from('customers')
      .select('id, name, email, phone, hair_notes')
      .eq('id', customerId)
      .single()
    customer = data
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'white', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/account/dashboard" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            ← Dashboard
          </Link>
          <span className="font-bold text-base" style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}>
            My Profile
          </span>
          <div />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <ProfileClient customer={customer} />
      </main>
    </div>
  )
}
