'use client'

import { useState } from 'react'

export default function ContactFormClient() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    setErrorMsg('')

    const fd = new FormData(e.currentTarget)
    const body = {
      name:    (fd.get('contact_name')    as string).trim(),
      email:   (fd.get('contact_email')   as string).trim(),
      phone:   (fd.get('contact_phone')   as string).trim(),
      message: (fd.get('contact_message') as string).trim(),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setState('sent')
      } else {
        const d = await res.json().catch(() => ({}))
        setErrorMsg(d.error ?? 'Message could not be sent. Please WhatsApp or call us on 07769 064 971.')
        setState('error')
      }
    } catch {
      setErrorMsg('Message could not be sent. Please WhatsApp or call us directly on 07769 064 971.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div className="sp-form-success">
        <span>✓</span>
        <h4>Message Sent!</h4>
        <p>Thank you, we&apos;ll be in touch within 24 hours.</p>
      </div>
    )
  }

  return (
    <form className="sp-form" onSubmit={handleSubmit}>
      {state === 'error' && (
        <div className="sp-form-error">{errorMsg}</div>
      )}
      <div className="sp-field">
        <label htmlFor="contact_name">Full Name</label>
        <input id="contact_name" type="text" name="contact_name" placeholder="Your full name" required />
      </div>
      <div className="sp-field">
        <label htmlFor="contact_email">Email</label>
        <input id="contact_email" type="email" name="contact_email" placeholder="your@email.com" required />
      </div>
      <div className="sp-field">
        <label htmlFor="contact_phone">Phone <span>(optional)</span></label>
        <input id="contact_phone" type="tel" name="contact_phone" placeholder="07700 000000" />
      </div>
      <div className="sp-field">
        <label htmlFor="contact_message">Message</label>
        <textarea id="contact_message" name="contact_message" rows={5} placeholder="How can we help you?" required />
      </div>
      <button
        type="submit"
        className="btn btn-gold"
        style={{ width: '100%', justifyContent: 'center' }}
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
