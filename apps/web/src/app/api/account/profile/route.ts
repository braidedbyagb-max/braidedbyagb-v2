// GET /api/account/profile
// Returns the current authenticated customer's profile (name, email, loyalty_points).
// Used by the booking wizard to pre-fill details and show loyalty balance.
// Returns 200 with authenticated:false if not logged in.

import { NextResponse } from 'next/server'
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ authenticated: false })
    }

    // Admin client bypasses RLS to fetch customer record
    const supabase = createAdminClient()
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, loyalty_points')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    return NextResponse.json({
      authenticated:  true,
      email:          user.email,
      name:           customer?.name ?? '',
      phone:          customer?.phone ?? '',
      loyalty_points: customer?.loyalty_points ?? 0,
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
