'use client'

import { useState } from 'react'

interface Props {
  prefillName?: string
  prefillEmail?: string
  prefillService?: string
  token?: string
  isTokenBased: boolean
}

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

export default function ReviewFormClient({ prefillName, prefillEmail, prefillService, token, isTokenBased }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover]   = useState(0)
  const [state, setState]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [successName, setSuccessName] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (rating === 0) { setErrorMsg('Please select a star rating.'); setState('error'); return }

    setState('sending')
    setErrorMsg('')

    const fd   = new FormData(e.currentTarget)
    const body = {
      rating,
      review_text:    (fd.get('review_text')    as string).trim(),
      reviewer_name:  (fd.get('reviewer_name')  as string | null)?.trim() ?? prefillName ?? '',
      reviewer_email: (fd.get('reviewer_email') as string | null)?.trim() ?? prefillEmail ?? '',
      service_name:   (fd.get('service_name')   as string | null)?.trim() ?? prefillService ?? '',
      token: token ?? '',
    }

    if (!body.review_text || body.review_text.length < 10) {
      setErrorMsg('Please write at least a short review (10+ characters).')
      setState('error')
      return
    }
    if (!isTokenBased && (!body.reviewer_name || !body.reviewer_email)) {
      setErrorMsg('Please enter your name and email address.')
      setState('error')
      return
    }

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSuccessName(body.reviewer_name.split(' ')[0] || '')
        setState('sent')
      } else {
        const d = await res.json().catch(() => ({}))
        setErrorMsg(d.error ?? 'Could not submit review. Please try again.')
        setState('error')
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: '4rem', marginBottom: 16 }}>💜</p>
        <h1 style={{ fontSize: '2rem', color: 'var(--color-deep-purple)', marginBottom: 12 }}>
          Thank You{successName ? `, ${successName}` : ''}!
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: 24 }}>
          Your review has been submitted and is awaiting approval. We truly appreciate you taking the time to share your experience! 🌟
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/booking" className="btn btn-primary">Book Another Appointment</a>
          <a href="/"        className="btn btn-outline-primary">Back to Home</a>
        </div>
        <p style={{ marginTop: 32, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          Don&apos;t forget to tag us on Instagram —{' '}
          <a href="https://instagram.com/BraidedbyAGB" target="_blank" rel="noopener">@BraidedbyAGB</a> 💜
        </p>
      </div>
    )
  }

  const displayRating = hover || rating

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {state === 'error' && (
        <div style={{ background: '#fde8e8', border: '1px solid #f5a8a8', borderRadius: 6, padding: '12px 16px', color: '#8b0000', fontSize: '0.88rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Name + email for walk-in only */}
      {!isTokenBased && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="sp-field">
              <label htmlFor="reviewer_name">Your Name *</label>
              <input id="reviewer_name" type="text" name="reviewer_name" placeholder="e.g. Amara" required />
            </div>
            <div className="sp-field">
              <label htmlFor="reviewer_email">Email Address *</label>
              <input id="reviewer_email" type="email" name="reviewer_email" placeholder="your@email.com" required />
            </div>
          </div>
          <div className="sp-field">
            <label htmlFor="service_name">Which Service Did You Have?</label>
            <input id="service_name" type="text" name="service_name" placeholder="e.g. Knotless Braids, Box Braids..." />
          </div>
        </>
      )}

      {/* Star rating */}
      <div style={{ textAlign: 'center' }}>
        <label style={{ display: 'block', fontFamily: 'var(--font-primary)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 10 }}>
          Your Rating *
        </label>
        <div className="star-picker">
          {[1, 2, 3, 4, 5].map(n => (
            <span
              key={n}
              className={`star-pick${n <= displayRating ? ' lit' : ''}`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              role="button"
              aria-label={`${n} star${n !== 1 ? 's' : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        {displayRating > 0 && (
          <p style={{ fontFamily: 'var(--font-primary)', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            {RATING_LABELS[displayRating]}
          </p>
        )}
      </div>

      {/* Review text */}
      <div className="sp-field">
        <label htmlFor="review_text">Your Review *</label>
        <textarea
          id="review_text"
          name="review_text"
          rows={5}
          placeholder="Tell us about your experience — what did you love most about your style?"
          required
          minLength={10}
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: '100%', justifyContent: 'center' }}
        disabled={state === 'sending'}
      >
        {state === 'sending' ? 'Submitting…' : 'Submit My Review ★'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
        Your review will be published after a quick check. Thank you! 💜
      </p>
    </form>
  )
}
