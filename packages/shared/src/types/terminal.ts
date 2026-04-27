// ============================================================
// BraidedbyAGB — Stripe Terminal Types
// ============================================================

export type TerminalMethod = 'tap_to_pay' | 'card_reader'
export type TerminalPaymentStatus = 'processing' | 'succeeded' | 'failed' | 'cancelled'
export type CollectType = 'deposit' | 'balance' | 'full'

export interface InPersonPayment {
  id: number
  booking_id: number
  stripe_payment_intent_id: string
  amount: number
  method: TerminalMethod
  status: TerminalPaymentStatus
  created_at: string
}

export interface TerminalReader {
  id: number
  stripe_reader_id: string
  label: string
  status: 'active' | 'inactive'
  created_at: string
}

// Payload sent to POST /api/terminal/create-payment-intent
export interface CreateTerminalPaymentIntentBody {
  booking_id: number
  collect_type: CollectType
}

// Response from POST /api/terminal/create-payment-intent
export interface CreateTerminalPaymentIntentResponse {
  payment_intent_id: string
  client_secret: string
  amount: number
  currency: string
}
