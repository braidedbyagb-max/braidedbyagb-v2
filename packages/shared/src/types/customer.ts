// ============================================================
// BraidedbyAGB — Customer & CRM Types
// ============================================================

export type CustomerTag = 'VIP' | 'Regular' | 'New Client' | 'At Risk' | 'Blocked'

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  email_optin: boolean
  loyalty_points: number
  is_blocked: boolean
  block_reason: string | null
  blocked_at: string | null
  tags: CustomerTag[]
  hair_notes: string | null
  profile_photo_url: string | null
  created_at: string
  updated_at: string
  // Computed (from aggregates)
  lifetime_value?: number
  total_bookings?: number
  completed_bookings?: number
  average_spend?: number
  last_booking_date?: string | null
  favourite_service?: string | null
}

export interface CustomerNote {
  id: number
  customer_id: number
  note: string
  created_at: string
}

export interface CustomerAuth {
  id: number
  customer_id: number
  auth_user_id: string  // Supabase auth.users.id (UUID)
  created_at: string
}

// ── Loyalty ──────────────────────────────────────────────────

export type LoyaltyTransactionType =
  | 'earn'
  | 'redeem'
  | 'manual_add'
  | 'manual_remove'
  | 'expire'
  | 'bonus'

export interface LoyaltyTransaction {
  id: number
  customer_id: number
  booking_id: number | null
  order_id: number | null
  type: LoyaltyTransactionType
  points: number        // positive = add, negative = remove
  balance_after: number // running balance after this transaction
  description: string
  created_at: string
}

export interface LoyaltySettings {
  earn_rate: number       // points per £1 spent (default 1)
  redeem_rate: number     // points per £1 discount (default 100)
  min_redemption: number  // minimum points to redeem (default 500)
  max_redemption_pct: number // max % of booking total (default 50)
  expiry_months: number   // months of inactivity before expiry (default 12)
}
