import { Resend } from 'resend'

// Lazy singleton — avoids "no API key" error at build time
let _resend: Resend | null = null

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!)
  }
  return _resend
}

export const FROM_EMAIL = () =>
  `${process.env.RESEND_FROM_NAME ?? 'BraidedbyAGB'} <${process.env.RESEND_FROM_EMAIL ?? 'hello@braidedbyagb.co.uk'}>`
