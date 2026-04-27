// ============================================================
// BraidedbyAGB — Booking Types
// ============================================================
import type { Customer } from './customer'
import type { Invoice } from './accounting'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'late_cancelled'
  | 'no_show'

export type PaymentMethod = 'stripe' | 'bank_transfer' | 'cash' | 'tap_to_pay'
export type PaymentMethodAllowed = 'stripe' | 'bank_transfer' | 'both'

export interface Booking {
  id: number
  booking_ref: string
  customer_id: number
  service_id: number
  variant_id: number | null
  booked_date: string        // 'YYYY-MM-DD'
  booked_time: string        // 'HH:MM:SS'
  status: BookingStatus
  payment_method: PaymentMethod
  deposit_amount: number
  deposit_paid: boolean
  total_price: number
  remaining_balance: number
  client_notes: string
  admin_notes: string
  policy_accepted: boolean
  receipt_url: string | null
  payment_token: string | null
  payment_method_allowed: PaymentMethodAllowed
  loyalty_points_redeemed: number
  loyalty_discount: number
  is_archived: boolean
  reminder_24_sent: boolean
  reminder_2_sent: boolean
  review_request_sent: boolean
  admin_reminder_30_sent: boolean
  created_at: string
  updated_at: string
  // Joins
  customer?: Customer
  service?: Service
  variant?: ServiceVariant
  addons?: BookingAddon[]
  invoice?: Invoice
}

export interface BookingAddon {
  id: number
  booking_id: number
  addon_id: number
  price_charged: number
  addon?: ServiceAddon
}

export interface Service {
  id: number
  name: string
  slug: string
  description: string
  duration_mins: number
  price_from: number
  image_url: string | null
  is_active: boolean
  is_new: boolean
  created_at: string
}

export interface ServiceVariant {
  id: number
  service_id: number
  variant_name: string
  price: number
  duration_mins: number
  is_active: boolean
}

export interface ServiceAddon {
  id: number
  service_id: number
  name: string
  price: number
  is_active: boolean
}

export interface Availability {
  id: number
  avail_date: string
  time_slot: string | null
  is_blocked: boolean
  block_reason: string | null
}

export interface TimeSlot {
  time: string   // 'HH:MM'
  label: string  // '9:00 AM'
  available: boolean
}
