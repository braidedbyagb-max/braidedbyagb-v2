// ============================================================
// BraidedbyAGB — Journal Entry Creation Helpers
// ============================================================
// All financial events call these helpers, which create the
// correct double-entry journal entries in the accounts table.
// Account codes:
//   1000 Stripe Account (asset)
//   1010 Cash (asset)
//   1020 Business Bank (asset)
//   1100 Accounts Receivable (asset)
//   2000 Customer Deposits Held (liability)
//   4000 Service Revenue (income)
//   4010 Product Revenue (income)
//   4020 Late Cancellation Fees (income)
//   5000-5199 Expense accounts
//   5200 Owner's Draw

import { SupabaseClient } from '@supabase/supabase-js'

// ── Account code → id lookup cache ───────────────────────────
let accountCache: Map<string, number> | null = null

async function getAccountId(supabase: SupabaseClient, code: string): Promise<number> {
  if (!accountCache) {
    const { data } = await supabase
      .from('accounts')
      .select('id, code')
    accountCache = new Map((data ?? []).map((a: any) => [a.code, a.id]))
  }
  const id = accountCache.get(code)
  if (!id) throw new Error(`Account code ${code} not found in chart of accounts`)
  return id
}

interface JournalLine {
  account_code: string
  debit: number
  credit: number
  memo?: string
}

async function createJournalEntry(
  supabase: SupabaseClient,
  {
    date,
    description,
    reference,
    source,
    source_id,
    lines,
  }: {
    date: string          // 'YYYY-MM-DD'
    description: string
    reference?: string
    source: string
    source_id?: number
    lines: JournalLine[]
  }
): Promise<number> {
  // Validate balance
  const totalDebit  = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Journal entry is not balanced: DR ${totalDebit} ≠ CR ${totalCredit}`)
  }

  // Insert header
  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({ date, description, reference: reference ?? null, source, source_id: source_id ?? null })
    .select('id')
    .single()

  if (entryError || !entry) {
    throw new Error(`Failed to create journal entry: ${entryError?.message}`)
  }

  // Insert lines
  const lineRows = await Promise.all(
    lines.map(async (l) => ({
      journal_entry_id: entry.id,
      account_id: await getAccountId(supabase, l.account_code),
      debit: l.debit,
      credit: l.credit,
      memo: l.memo ?? null,
    }))
  )

  const { error: linesError } = await supabase
    .from('journal_entry_lines')
    .insert(lineRows)

  if (linesError) {
    throw new Error(`Failed to insert journal lines: ${linesError.message}`)
  }

  return entry.id
}

// ── Stripe deposit received online ───────────────────────────
// DR 1000 Stripe Account  £X
// CR 2000 Customer Deposits £X
export async function journalStripeDeposit(
  supabase: SupabaseClient,
  { bookingId, bookingRef, amount, date }: {
    bookingId: number
    bookingRef: string
    amount: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Stripe deposit — ${bookingRef}`,
    reference: bookingRef,
    source: 'booking_deposit',
    source_id: bookingId,
    lines: [
      { account_code: '1000', debit: amount, credit: 0,      memo: 'Stripe payment received' },
      { account_code: '2000', debit: 0,      credit: amount, memo: `Deposit held — ${bookingRef}` },
    ],
  })
}

// ── Bank transfer deposit confirmed by admin ──────────────────
// DR 1020 Business Bank  £X
// CR 2000 Customer Deposits £X
export async function journalBankTransferDeposit(
  supabase: SupabaseClient,
  { bookingId, bookingRef, amount, date }: {
    bookingId: number
    bookingRef: string
    amount: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Bank transfer deposit — ${bookingRef}`,
    reference: bookingRef,
    source: 'booking_deposit',
    source_id: bookingId,
    lines: [
      { account_code: '1020', debit: amount, credit: 0,      memo: 'Bank transfer received' },
      { account_code: '2000', debit: 0,      credit: amount, memo: `Deposit held — ${bookingRef}` },
    ],
  })
}

// ── Booking completed — balance via Tap to Pay ───────────────
// DR 1000 Stripe Account  £balance
// DR 2000 Customer Deposits £deposit (release liability)
// CR 4000 Service Revenue  £total
export async function journalTapToPayCompletion(
  supabase: SupabaseClient,
  { bookingId, bookingRef, deposit, balance, total, date }: {
    bookingId: number
    bookingRef: string
    deposit: number
    balance: number
    total: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Booking completed (Tap to Pay) — ${bookingRef}`,
    reference: bookingRef,
    source: 'tap_to_pay',
    source_id: bookingId,
    lines: [
      { account_code: '1000', debit: balance,  credit: 0,     memo: 'Balance via Tap to Pay' },
      { account_code: '2000', debit: deposit,  credit: 0,     memo: 'Deposit released to revenue' },
      { account_code: '4000', debit: 0,        credit: total, memo: `Service revenue — ${bookingRef}` },
    ],
  })
}

// ── Booking completed — balance via cash ─────────────────────
// DR 1010 Cash  £balance
// DR 2000 Customer Deposits £deposit
// CR 4000 Service Revenue  £total
export async function journalCashCompletion(
  supabase: SupabaseClient,
  { bookingId, bookingRef, deposit, balance, total, date }: {
    bookingId: number
    bookingRef: string
    deposit: number
    balance: number
    total: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Booking completed (cash) — ${bookingRef}`,
    reference: bookingRef,
    source: 'booking_balance',
    source_id: bookingId,
    lines: [
      { account_code: '1010', debit: balance,  credit: 0,     memo: 'Balance received in cash' },
      { account_code: '2000', debit: deposit,  credit: 0,     memo: 'Deposit released to revenue' },
      { account_code: '4000', debit: 0,        credit: total, memo: `Service revenue — ${bookingRef}` },
    ],
  })
}

// ── Booking cancelled — deposit forfeited ────────────────────
// DR 2000 Customer Deposits £deposit
// CR 4020 Late Cancellation Fees £deposit
export async function journalCancellationFee(
  supabase: SupabaseClient,
  { bookingId, bookingRef, deposit, date }: {
    bookingId: number
    bookingRef: string
    deposit: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Late cancellation fee — ${bookingRef}`,
    reference: bookingRef,
    source: 'booking_cancellation',
    source_id: bookingId,
    lines: [
      { account_code: '2000', debit: deposit, credit: 0,       memo: 'Deposit forfeited' },
      { account_code: '4020', debit: 0,       credit: deposit, memo: `Cancellation fee — ${bookingRef}` },
    ],
  })
}

// ── Business expense logged ───────────────────────────────────
// DR <expense_account>  £amount
// CR 1020 Business Bank £amount
export async function journalExpense(
  supabase: SupabaseClient,
  { expenseId, description, accountCode, amount, date }: {
    expenseId: number
    description: string
    accountCode: string
    amount: number
    date: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Expense: ${description}`,
    source: 'expense',
    source_id: expenseId,
    lines: [
      { account_code: accountCode, debit: amount, credit: 0,      memo: description },
      { account_code: '1020',      debit: 0,      credit: amount, memo: 'Paid from business bank' },
    ],
  })
}

// ── Owner's draw ─────────────────────────────────────────────
// DR 5200 Owner's Draw  £amount
// CR 1020 Business Bank £amount
export async function journalOwnerDraw(
  supabase: SupabaseClient,
  { drawId, amount, date, notes }: {
    drawId: number
    amount: number
    date: string
    notes?: string
  }
) {
  return createJournalEntry(supabase, {
    date,
    description: `Owner's draw${notes ? ': ' + notes : ''}`,
    source: 'owner_draw',
    source_id: drawId,
    lines: [
      { account_code: '5200', debit: amount, credit: 0,      memo: notes ?? "Owner's draw" },
      { account_code: '1020', debit: 0,      credit: amount, memo: 'Bank transfer to owner' },
    ],
  })
}
