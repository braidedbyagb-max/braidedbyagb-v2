import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { journalOwnerDraw } from '@/lib/accounting'

export async function POST(req: NextRequest) {
  try {
    const { draw_id, amount, date, notes } = await req.json()
    const supabase = createAdminClient()
    const journalId = await journalOwnerDraw(supabase, {
      drawId: draw_id,
      amount,
      date,
      notes,
    })
    return NextResponse.json({ success: true, journal_entry_id: journalId })
  } catch (err: any) {
    console.error('[accounting/log-draw]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
