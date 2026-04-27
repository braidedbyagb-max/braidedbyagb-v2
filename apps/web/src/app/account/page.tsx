'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function AccountLoginPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/account/dashboard`,
        },
      })
      if (err) throw err
      setSent(true)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-block font-black text-2xl"
             style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-deep-purple)' }}>
            BraidedbyAGB
          </a>
          <h1 className="text-2xl font-bold mt-4 mb-1" style={{ color: 'var(--color-deep-purple)' }}>
            My Account
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Enter your email and we&apos;ll send you a magic link to sign in — no password needed.
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="font-bold text-xl mb-2" style={{ color: 'var(--color-deep-purple)' }}>
                Check Your Email
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                We&apos;ve sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="underline font-medium"
                  style={{ color: 'var(--color-primary)' }}
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin}>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none mb-4 transition-colors"
                style={{
                  borderColor: 'var(--color-border)',
                  background: '#fafafa',
                }}
              />

              {error && (
                <div className="rounded-lg p-3 text-sm mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full font-bold text-white transition-opacity disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {loading ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>
          This is for existing customers only.{' '}
          <a href="/booking" className="underline" style={{ color: 'var(--color-primary)' }}>
            Book an appointment →
          </a>
        </p>
      </div>
    </div>
  )
}
