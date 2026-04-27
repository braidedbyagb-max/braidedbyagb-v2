// ============================================================
// BraidedbyAGB — Accounting Types (Double-Entry)
// ============================================================

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export interface Account {
  id: number
  code: string      // e.g. '1000', '4000'
  name: string      // e.g. 'Stripe Account', 'Service Revenue'
  type: AccountType
  parent_id: number | null
  is_active: boolean
  created_at: string
  // Computed
  balance?: number
  children?: Account[]
}

export interface JournalEntry {
  id: number
  date: string          // 'YYYY-MM-DD'
  description: string
  reference: string | null   // booking_ref, invoice number, etc.
  source: JournalEntrySource
  source_id: number | null
  created_at: string
  lines?: JournalEntryLine[]
}

export type JournalEntrySource =
  | 'booking_deposit'
  | 'booking_balance'
  | 'booking_cancellation'
  | 'tap_to_pay'
  | 'expense'
  | 'owner_draw'
  | 'loyalty_redemption'
  | 'manual'

export interface JournalEntryLine {
  id: number
  journal_entry_id: number
  account_id: number
  debit: number
  credit: number
  memo: string | null
  account?: Account
}

// ── Invoices ────────────────────────────────────────────────

export type InvoiceType = 'receipt' | 'invoice' | 'credit_note'
export type InvoiceStatus = 'draft' | 'sent' | 'voided'

export interface Invoice {
  id: number
  invoice_number: string  // 'INV-2026-0001'
  type: InvoiceType
  booking_id: number | null
  order_id: number | null
  customer_id: number
  amount: number
  status: InvoiceStatus
  pdf_url: string | null
  sent_at: string | null
  created_at: string
  // Joins
  customer?: import('./customer').Customer
  booking?: import('./booking').Booking
}

// ── Expenses ────────────────────────────────────────────────

export interface Expense {
  id: number
  date: string
  description: string
  amount: number
  account_id: number   // maps to expense account (5000–5199)
  receipt_url: string | null
  notes: string | null
  created_at: string
  account?: Account
}

// ── Owner's Draw ─────────────────────────────────────────────

export interface OwnerDraw {
  id: number
  date: string
  amount: number
  notes: string | null
  created_at: string
}

// ── Reports ─────────────────────────────────────────────────

export interface ProfitAndLoss {
  period_start: string
  period_end: string
  income: { account: Account; total: number }[]
  expenses: { account: Account; total: number }[]
  total_income: number
  total_expenses: number
  net_profit: number
}

export interface LedgerEntry {
  date: string
  description: string
  reference: string | null
  account: string
  debit: number
  credit: number
  balance: number
}
