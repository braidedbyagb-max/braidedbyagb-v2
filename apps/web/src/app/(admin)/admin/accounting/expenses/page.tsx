import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ExpensesClient from './ExpensesClient'

export const metadata: Metadata = { title: 'Expenses' }

export default async function ExpensesPage() {
  const supabase = await createClient()

  const [expensesRes, accountsRes, drawsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('*, accounts(code, name)')
      .order('date', { ascending: false })
      .limit(50),
    supabase
      .from('accounts')
      .select('id, code, name')
      .eq('type', 'expense')
      .eq('is_active', true)
      .order('code'),
    supabase
      .from('owner_draws')
      .select('*')
      .order('date', { ascending: false })
      .limit(10),
  ])

  return (
    <ExpensesClient
      expenses={expensesRes.data ?? []}
      accounts={accountsRes.data ?? []}
      draws={drawsRes.data ?? []}
    />
  )
}
