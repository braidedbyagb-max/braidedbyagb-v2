// API helpers — all calls go to the Next.js web backend.
// The mobile app reuses the same API routes as the web admin.

import { supabase } from './supabase'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://braidedbyagb.co.uk'

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

// ── Supabase direct queries (admin client via service_role not available
//    on mobile — use anon key + RLS policies or via API routes) ──────────

export async function fetchTodayBookings() {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_ref, booked_time, status, total_price, deposit_paid, payment_method, customers(name, phone), services(name, duration_mins)')
    .eq('booked_date', today)
    .not('status', 'in', '("cancelled","late_cancelled")')
    .order('booked_time')
  if (error) throw error
  return data ?? []
}

export async function fetchBookings(filter: 'today' | 'pending' | 'confirmed' | 'all') {
  const today = new Date().toISOString().split('T')[0]
  let query = supabase
    .from('bookings')
    .select('id, booking_ref, booked_date, booked_time, status, total_price, deposit_paid, payment_method, is_archived, customers(name, phone), services(name)')
    .order('booked_date', { ascending: false })
    .order('booked_time', { ascending: false })
    .limit(80)

  if (filter === 'today') {
    query = query.eq('booked_date', today).not('status', 'in', '("cancelled","late_cancelled","no_show")')
  } else if (filter === 'pending') {
    query = query.eq('status', 'pending').eq('is_archived', false)
  } else if (filter === 'confirmed') {
    query = query.eq('status', 'confirmed').eq('is_archived', false)
  } else {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchBookingDetail(id: number) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      customers ( id, name, email, phone, loyalty_points ),
      services ( name, duration_mins ),
      service_variants ( variant_name ),
      booking_addons ( price_charged, service_addons(name) ),
      booking_activity ( id, actor, note, created_at ),
      invoices ( id, invoice_number, amount, status, pdf_url )
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchCustomers(search?: string) {
  let query = supabase
    .from('customers')
    .select('id, name, email, phone, loyalty_points, is_blocked, tags, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchCustomerProfile(id: number) {
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_ref, booked_date, status, total_price, services(name)')
    .eq('customer_id', id)
    .order('booked_date', { ascending: false })
    .limit(20)

  const { data: notes } = await supabase
    .from('customer_notes')
    .select('id, note, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: loyalty } = await supabase
    .from('loyalty_transactions')
    .select('id, type, points, description, created_at')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(15)

  const ltv = (bookings ?? [])
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + Number(b.total_price), 0)

  return { customer, bookings: bookings ?? [], notes: notes ?? [], loyalty: loyalty ?? [], ltv }
}

export async function fetchDashboardStats() {
  const today = new Date().toISOString().split('T')[0]

  const [todayRes, pendingRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, booking_ref, booked_time, status, total_price, deposit_paid, payment_method, remaining_balance, customers(name, phone), services(name)')
      .eq('booked_date', today)
      .not('status', 'in', '("cancelled","late_cancelled","no_show")')
      .order('booked_time'),
    supabase
      .from('bookings')
      .select('id, booking_ref, customers(name)')
      .eq('status', 'pending')
      .eq('deposit_paid', false)
      .eq('is_archived', false)
      .limit(5),
  ])

  const todayBookings = todayRes.data ?? []
  const pendingDeposits = pendingRes.data ?? []

  // Today's takings = deposit_amount on completed bookings today
  const takings = todayBookings
    .filter(b => b.status === 'completed')
    .reduce((s, b) => s + Number(b.total_price), 0)

  return { todayBookings, pendingDeposits, takings }
}
