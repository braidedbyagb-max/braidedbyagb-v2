// POST /api/account/profile — update logged-in customer's profile
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, phone, hair_notes } = await req.json()

  const admin = createAdminClient()

  // Resolve customer_id
  const { data: authLink } = await admin
    .from('customer_auth')
    .select('customer_id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const customerId = authLink?.customer_id
    ?? (await admin.from('customers').select('id').eq('email', user.email!).maybeSingle()).data?.id

  if (!customerId) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const { error } = await admin
    .from('customers')
    .update({ name, phone, hair_notes })
    .eq('id', customerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
