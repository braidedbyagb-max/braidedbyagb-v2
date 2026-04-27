// POST /api/terminal/connection-token
// Creates a Stripe Terminal connection token for the mobile app SDK.
// Called once per app session (SDK init / reconnect).
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    const token = await stripe.terminal.connectionTokens.create()

    // Optional: log the issuance (helps debug SDK reconnect issues in the field)
    const supabase = createAdminClient()
    await supabase.from('terminal_connection_tokens').insert({
      expires_at: null, // Stripe doesn't surface an expiry on connection tokens
    })

    return NextResponse.json({ secret: token.secret })
  } catch (err: any) {
    console.error('[terminal/connection-token]', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to create connection token' },
      { status: 500 }
    )
  }
}
