import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { journalExpense } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  try {
    const { expense_id, description, account_code, amount, date } = await req.json()
    const supabase = createAdminClient()
    const journalId = await journalExpense(supabase, {
      expenseId: expense_id,
      description,
      accountCode: account_code,
      amount,
      date,
    })
    return NextResponse.json({ success: true, journal_entry_id: journalId })
  } catch (err: any) {
    console.error('[accounting/log-expense]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
