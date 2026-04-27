// POST /api/contact
// Handles homepage contact form submissions
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendContactEnquiry } from '@/lib/emails'

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Please fill in your name, email and message.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // Get admin email from settings
    const supabase = createAdminClient()
    const { data: adminEmailRow } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'admin_email')
      .single()

    const adminEmail = adminEmailRow?.setting_value ?? process.env.ADMIN_EMAIL ?? 'hello@braidedbyagb.co.uk'

    const { error } = await sendContactEnquiry({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || undefined,
      message: message.trim(),
      adminEmail,
    })

    if (error) {
      console.error('[contact] email send failed:', error)
      return NextResponse.json({ error: 'Message could not be sent. Please WhatsApp us directly on 07769 064 971.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] unexpected error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
