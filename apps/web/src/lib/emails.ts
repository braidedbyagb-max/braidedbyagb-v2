/**
 * Transactional email helpers using Resend.
 * All functions return { error } or nothing on success.
 */

import { getResend, FROM_EMAIL } from './resend'

// ── Shared HTML helpers ───────────────────────────────────────

function emailWrapper(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BraidedbyAGB</title>
</head>
<body style="margin:0;padding:0;background:#F0D6F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0D6F5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#7A0050;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
              BraidedbyAGB
            </h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">
              Farnborough, Hampshire
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
            ${bodyHtml}

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #f0e4f5;margin:32px 0;">

            <!-- Footer -->
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
              BraidedbyAGB · Farnborough, Hampshire<br>
              <a href="mailto:hello@braidedbyagb.co.uk" style="color:#CC1A8A;">hello@braidedbyagb.co.uk</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function bookingTable(fields: Array<{ label: string; value: string }>): string {
  const rows = fields
    .filter(f => f.value)
    .map(
      f => `<tr>
        <td style="padding:8px 0;color:#7A4A70;font-size:14px;width:140px;">${f.label}</td>
        <td style="padding:8px 0;color:#2A0020;font-size:14px;font-weight:600;">${f.value}</td>
      </tr>`
    )
    .join('\n')

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#faf5ff;border-radius:10px;padding:16px 20px;">
    <tbody>${rows}</tbody>
  </table>`
}

function primaryButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${url}" style="display:inline-block;padding:14px 32px;background:#CC1A8A;color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;">
      ${text}
    </a>
  </div>`
}

// ── Email senders ─────────────────────────────────────────────

interface BookingConfirmationData {
  customerName: string
  customerEmail: string
  bookingRef: string
  serviceName: string
  date: string          // e.g. "Monday, 12 May 2026"
  time: string          // e.g. "10:00 AM"
  depositAmount: number
  totalPrice: number
  remainingBalance: number
  paymentMethod: 'stripe' | 'bank_transfer'
  bankAccountName?: string
  bankSortCode?: string
  bankAccountNumber?: string
}

export async function sendBookingConfirmation(data: BookingConfirmationData) {
  const resend = getResend()

  const isBank = data.paymentMethod === 'bank_transfer'
  const depositText = isBank
    ? `Please transfer <strong>£${data.depositAmount.toFixed(2)}</strong> to secure your booking.`
    : `Your deposit of <strong>£${data.depositAmount.toFixed(2)}</strong> has been charged to your card.`

  const bankSection = isBank ? `
    <div style="margin:20px 0;background:#eff6ff;border-radius:10px;padding:20px;border-left:4px solid #3b82f6;">
      <p style="margin:0 0 12px;font-weight:700;color:#1d4ed8;font-size:15px;">Bank Transfer Details</p>
      <table cellpadding="0" cellspacing="0">
        <tr><td style="color:#1e40af;font-size:14px;padding:4px 16px 4px 0;">Account Name</td>
            <td style="color:#1d4ed8;font-weight:700;font-size:14px;">${data.bankAccountName ?? 'BraidedbyAGB'}</td></tr>
        <tr><td style="color:#1e40af;font-size:14px;padding:4px 16px 4px 0;">Sort Code</td>
            <td style="color:#1d4ed8;font-weight:700;font-size:14px;font-family:monospace;">${data.bankSortCode ?? '—'}</td></tr>
        <tr><td style="color:#1e40af;font-size:14px;padding:4px 16px 4px 0;">Account Number</td>
            <td style="color:#1d4ed8;font-weight:700;font-size:14px;font-family:monospace;">${data.bankAccountNumber ?? '—'}</td></tr>
        <tr><td style="color:#1e40af;font-size:14px;padding:4px 16px 4px 0;">Reference</td>
            <td style="color:#7c3aed;font-weight:700;font-size:14px;font-family:monospace;">${data.bookingRef}</td></tr>
      </table>
      <p style="margin:12px 0 0;font-size:12px;color:#3730a3;">⚠ Always use your booking reference as the payment reference.</p>
    </div>` : ''

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#7A0050;">
      ${isBank ? 'Booking Received!' : 'Booking Confirmed! ✓'}
    </h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Hi ${data.customerName}, ${isBank
        ? 'your booking has been received. Please complete your deposit payment to confirm your spot.'
        : 'your appointment is confirmed and your deposit has been received.'}
    </p>

    ${bookingTable([
      { label: 'Reference',    value: data.bookingRef },
      { label: 'Service',      value: data.serviceName },
      { label: 'Date',         value: data.date },
      { label: 'Time',         value: data.time },
      { label: 'Total',        value: `£${data.totalPrice.toFixed(2)}` },
      { label: 'Deposit',      value: `£${data.depositAmount.toFixed(2)}` },
      { label: 'Balance Due',  value: data.remainingBalance > 0 ? `£${data.remainingBalance.toFixed(2)} (payable on the day)` : '' },
    ])}

    <p style="margin:0 0 4px;font-size:14px;color:#2A0020;">${depositText}</p>

    ${bankSection}

    <div style="margin:24px 0;background:#fff7ed;border-radius:8px;padding:16px;border-left:4px solid #fb923c;">
      <p style="margin:0;font-size:13px;color:#9a3412;">
        <strong>Cancellation Policy:</strong> Cancellations made less than 48 hours before your appointment will forfeit your deposit. Please contact us as early as possible if you need to reschedule.
      </p>
    </div>

    <p style="margin:0;font-size:14px;color:#7A4A70;">
      If you have any questions, reply to this email or WhatsApp us directly.
    </p>
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.customerEmail,
    subject: isBank
      ? `Booking Received — ${data.bookingRef} | BraidedbyAGB`
      : `Booking Confirmed — ${data.bookingRef} | BraidedbyAGB`,
    html: emailWrapper(body),
  })

  if (error) console.error('[email] sendBookingConfirmation:', error)
  return { error }
}

// ── Deposit paid confirmation (after bank transfer confirmed by admin) ──

export async function sendDepositPaidConfirmation(data: {
  customerName: string
  customerEmail: string
  bookingRef: string
  serviceName: string
  date: string
  time: string
  remainingBalance: number
}) {
  const resend = getResend()

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#059669;">Deposit Received ✓</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Hi ${data.customerName}, we&apos;ve received your deposit and your appointment is now confirmed!
    </p>

    ${bookingTable([
      { label: 'Reference', value: data.bookingRef },
      { label: 'Service',   value: data.serviceName },
      { label: 'Date',      value: data.date },
      { label: 'Time',      value: data.time },
      { label: 'Balance',   value: data.remainingBalance > 0 ? `£${data.remainingBalance.toFixed(2)} payable on the day` : 'Fully paid' },
    ])}

    <p style="margin:0;font-size:14px;color:#2A0020;">
      Please arrive 5–10 minutes before your appointment. We look forward to seeing you!
    </p>
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.customerEmail,
    subject: `Deposit Confirmed — ${data.bookingRef} | BraidedbyAGB`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendDepositPaidConfirmation:', error)
  return { error }
}

// ── 24-hour reminder ──────────────────────────────────────────

export async function sendReminderEmail(data: {
  customerName: string
  customerEmail: string
  bookingRef: string
  serviceName: string
  date: string
  time: string
  remainingBalance: number
}) {
  const resend = getResend()

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#7A0050;">Appointment Reminder</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Hi ${data.customerName}, just a reminder that your appointment is <strong>tomorrow</strong>!
    </p>

    ${bookingTable([
      { label: 'Reference', value: data.bookingRef },
      { label: 'Service',   value: data.serviceName },
      { label: 'Date',      value: data.date },
      { label: 'Time',      value: data.time },
      { label: 'Balance Due', value: data.remainingBalance > 0 ? `£${data.remainingBalance.toFixed(2)} — please bring cash or card` : '' },
    ])}

    <p style="margin:0 0 16px;font-size:14px;color:#2A0020;">
      Please arrive <strong>5–10 minutes early</strong>. If you need to cancel or reschedule, please let us know as soon as possible.
    </p>

    <div style="margin:0;background:#faf5ff;border-radius:8px;padding:16px;">
      <p style="margin:0;font-size:13px;color:#7A4A70;">
        📍 Farnborough, Hampshire — exact address will be confirmed via WhatsApp before your appointment.
      </p>
    </div>
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.customerEmail,
    subject: `Reminder: Your appointment tomorrow — ${data.bookingRef} | BraidedbyAGB`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendReminderEmail:', error)
  return { error }
}

// ── 2-hour reminder ───────────────────────────────────────────

export async function sendTwoHourReminderEmail(data: {
  customerName: string
  customerEmail: string
  bookingRef: string
  serviceName: string
  time: string
}) {
  const resend = getResend()

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#7A0050;">See You Soon!</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Hi ${data.customerName}, your appointment is in approximately <strong>2 hours</strong>.
    </p>

    ${bookingTable([
      { label: 'Service', value: data.serviceName },
      { label: 'Time',    value: data.time },
      { label: 'Ref',     value: data.bookingRef },
    ])}

    <p style="margin:0;font-size:14px;color:#2A0020;">
      Please arrive on time. If you have any last-minute questions, contact us on WhatsApp.
    </p>
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.customerEmail,
    subject: `See you in 2 hours! — ${data.bookingRef} | BraidedbyAGB`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendTwoHourReminderEmail:', error)
  return { error }
}

// ── Cancellation notice ───────────────────────────────────────

export async function sendCancellationEmail(data: {
  customerName: string
  customerEmail: string
  bookingRef: string
  serviceName: string
  date: string
  depositForfeited: boolean
}) {
  const resend = getResend()

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#dc2626;">Booking Cancelled</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Hi ${data.customerName}, your booking has been cancelled.
    </p>

    ${bookingTable([
      { label: 'Reference', value: data.bookingRef },
      { label: 'Service',   value: data.serviceName },
      { label: 'Date',      value: data.date },
    ])}

    ${data.depositForfeited ? `
    <div style="margin:20px 0;background:#fee2e2;border-radius:8px;padding:16px;border-left:4px solid #dc2626;">
      <p style="margin:0;font-size:13px;color:#9b1c1c;">
        <strong>Deposit Forfeited:</strong> As this cancellation was made within 48 hours of the appointment, your deposit has been forfeited in accordance with our cancellation policy.
      </p>
    </div>` : ''}

    <p style="margin:0 0 16px;font-size:14px;color:#2A0020;">
      We hope to see you again soon. Book a new appointment whenever you&apos;re ready.
    </p>

    ${primaryButton('Book Again', `${process.env.NEXT_PUBLIC_APP_URL}/booking`)}
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.customerEmail,
    subject: `Booking Cancelled — ${data.bookingRef} | BraidedbyAGB`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendCancellationEmail:', error)
  return { error }
}

// ── Admin: new booking notification ──────────────────────────

export async function sendAdminNewBookingNotification(data: {
  bookingRef: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceName: string
  date: string
  time: string
  depositAmount: number
  paymentMethod: string
  adminEmail: string
}) {
  const resend = getResend()

  const body = `
    <h2 style="margin:0 0 8px;font-size:22px;color:#7A0050;">New Booking Received</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">A new booking has been made.</p>

    ${bookingTable([
      { label: 'Reference',  value: data.bookingRef },
      { label: 'Client',     value: data.customerName },
      { label: 'Email',      value: data.customerEmail },
      { label: 'Phone',      value: data.customerPhone },
      { label: 'Service',    value: data.serviceName },
      { label: 'Date',       value: data.date },
      { label: 'Time',       value: data.time },
      { label: 'Deposit',    value: `£${data.depositAmount.toFixed(2)}` },
      { label: 'Payment',    value: data.paymentMethod === 'stripe' ? 'Card (Stripe)' : 'Bank Transfer' },
    ])}

    ${primaryButton('View in Admin', `${process.env.NEXT_PUBLIC_APP_URL}/admin/bookings`)}
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.adminEmail,
    subject: `New Booking: ${data.customerName} — ${data.date}`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendAdminNewBookingNotification:', error)
  return { error }
}

// ── Admin: morning brief ──────────────────────────────────────

export async function sendAdminMorningBrief(data: {
  adminEmail: string
  date: string
  bookings: Array<{
    booking_ref: string
    booked_time: string
    customer_name: string
    customer_phone: string
    service_name: string
    deposit_paid: boolean
    payment_method: string
  }>
}) {
  const resend = getResend()

  const rows = data.bookings.map(b => {
    const waLink = `https://wa.me/${b.customer_phone.replace(/\D/g, '')}?text=Hi+${encodeURIComponent(b.customer_name)}`
    const isPending = !b.deposit_paid && b.payment_method === 'bank_transfer'
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e4f5;font-weight:600;color:#2A0020;font-size:13px;">${b.booked_time.slice(0,5)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e4f5;font-size:13px;color:#2A0020;">
          ${b.customer_name}
          ${isPending ? '<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:#fef3c7;color:#92400e;border-radius:999px;font-size:11px;font-weight:600;">Bank pending</span>' : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e4f5;font-size:13px;color:#7A4A70;">${b.service_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e4f5;">
          <a href="${waLink}" style="font-size:12px;color:#25D366;font-weight:600;">WhatsApp</a>
        </td>
      </tr>`
  }).join('\n')

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#7A0050;">Good Morning! ☀️</h2>
    <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
      Here&apos;s your schedule for <strong>${data.date}</strong> — ${data.bookings.length} appointment${data.bookings.length !== 1 ? 's' : ''}.
    </p>

    ${data.bookings.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e4f5;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#7A0050;">
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Time</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Client</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Service</th>
          <th style="padding:10px 12px;text-align:left;color:#fff;font-size:12px;font-weight:600;">Contact</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>` : '<p style="color:#7A4A70;font-size:14px;">No bookings today — enjoy your day off!</p>'}

    ${primaryButton('Open Admin Panel', `${process.env.NEXT_PUBLIC_APP_URL}/admin/bookings`)}
  `

  const { error } = await resend.emails.send({
    from:    FROM_EMAIL(),
    to:      data.adminEmail,
    subject: `📅 Today's Schedule — ${data.date} (${data.bookings.length} bookings)`,
    html:    emailWrapper(body),
  })

  if (error) console.error('[email] sendAdminMorningBrief:', error)
  return { error }
}
