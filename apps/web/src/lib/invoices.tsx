// ============================================================
// BraidedbyAGB — Invoice / Receipt Generation
// ============================================================
// Generates PDF receipts using @react-pdf/renderer,
// uploads to Supabase Storage, inserts an invoices record,
// and sends the receipt email via Resend.
// SERVER-SIDE ONLY — do not import in client components.

/* eslint-disable react/react-in-jsx-scope */
import { renderToBuffer } from '@react-pdf/renderer'
import { SupabaseClient }  from '@supabase/supabase-js'
import { getResend, FROM_EMAIL } from './resend'
import InvoiceDocument, { type InvoiceData } from '@/components/pdf/InvoiceDocument'

// ── Invoice number sequencing ─────────────────────────────────

async function nextInvoiceNumber(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let seq = 1
  if (data?.invoice_number) {
    const parts = data.invoice_number.split('-')
    seq = parseInt(parts[2] ?? '0') + 1
  }

  return `INV-${year}-${String(seq).padStart(4, '0')}`
}

// ── Format helpers ────────────────────────────────────────────

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h)
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ── Core invoice creation ─────────────────────────────────────

interface CreateInvoiceOptions {
  supabase:       SupabaseClient
  bookingId:      number
  bookingRef:     string
  customerId:     number
  customerName:   string
  customerEmail:  string
  serviceName:    string
  bookedDate:     string   // 'YYYY-MM-DD'
  bookedTime:     string   // 'HH:MM'
  addons:         Array<{ name: string; price: number }>
  totalPrice:     number
  depositAmount:  number
  depositPaid:    boolean
  remainingBalance: number
  loyaltyDiscount:  number
  paymentMethod:  string
  invoiceStatus:  'PAID' | 'DEPOSIT PAID' | 'PENDING'
}

export async function createAndSendInvoice(opts: CreateInvoiceOptions): Promise<{
  invoiceNumber: string
  pdfUrl:        string | null
}> {
  const invoiceNumber = await nextInvoiceNumber(opts.supabase)

  const invData: InvoiceData = {
    invoiceNumber,
    invoiceDate:      todayLabel(),
    bookingRef:       opts.bookingRef,
    customerName:     opts.customerName,
    customerEmail:    opts.customerEmail,
    serviceName:      opts.serviceName,
    serviceDate:      formatDateLong(opts.bookedDate),
    serviceTime:      formatTime(opts.bookedTime),
    addons:           opts.addons,
    totalPrice:       opts.totalPrice,
    depositAmount:    opts.depositAmount,
    depositPaid:      opts.depositPaid,
    remainingBalance: opts.remainingBalance,
    loyaltyDiscount:  opts.loyaltyDiscount,
    paymentMethod:    opts.paymentMethod,
    status:           opts.invoiceStatus,
  }

  // 1. Render PDF
  let pdfBuffer: Buffer | null = null
  let pdfUrl: string | null = null
  try {
    pdfBuffer = await renderToBuffer(
      <InvoiceDocument inv={invData} />
    ) as Buffer
  } catch (err) {
    console.error('[invoices] PDF render failed:', err)
  }

  // 2. Upload to Supabase Storage
  if (pdfBuffer) {
    try {
      const filePath = `${new Date().getFullYear()}/${invoiceNumber}.pdf`
      const { data: uploadData, error: uploadError } = await opts.supabase
        .storage
        .from('invoices')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadError && uploadData) {
        const { data: urlData } = opts.supabase
          .storage
          .from('invoices')
          .getPublicUrl(filePath)
        pdfUrl = urlData.publicUrl
      } else if (uploadError) {
        console.error('[invoices] Storage upload failed:', uploadError.message)
      }
    } catch (err) {
      console.error('[invoices] Storage error:', err)
    }
  }

  // 3. Insert invoice record
  await opts.supabase.from('invoices').insert({
    invoice_number: invoiceNumber,
    type:           'receipt',
    booking_id:     opts.bookingId,
    customer_id:    opts.customerId,
    amount:         opts.totalPrice,
    status:         'sent',
    pdf_url:        pdfUrl,
    sent_at:        new Date().toISOString(),
  })

  // 4. Send receipt email via Resend
  if (opts.customerEmail) {
    try {
      await sendReceiptEmail({
        invoiceNumber,
        customerName:     opts.customerName,
        customerEmail:    opts.customerEmail,
        bookingRef:       opts.bookingRef,
        serviceName:      opts.serviceName,
        serviceDate:      formatDateLong(opts.bookedDate),
        serviceTime:      formatTime(opts.bookedTime),
        totalPrice:       opts.totalPrice,
        depositAmount:    opts.depositAmount,
        remainingBalance: opts.remainingBalance,
        loyaltyDiscount:  opts.loyaltyDiscount,
        pdfBuffer,
        pdfUrl,
      })
    } catch (err) {
      console.error('[invoices] Email send failed:', err)
    }
  }

  return { invoiceNumber, pdfUrl }
}

// ── Receipt email ─────────────────────────────────────────────

async function sendReceiptEmail(data: {
  invoiceNumber:    string
  customerName:     string
  customerEmail:    string
  bookingRef:       string
  serviceName:      string
  serviceDate:      string
  serviceTime:      string
  totalPrice:       number
  depositAmount:    number
  remainingBalance: number
  loyaltyDiscount:  number
  pdfBuffer:        Buffer | null
  pdfUrl:           string | null
}) {
  const resend = getResend()

  const tableRows = [
    { label: 'Invoice',   value: data.invoiceNumber },
    { label: 'Booking',   value: data.bookingRef },
    { label: 'Service',   value: data.serviceName },
    { label: 'Date',      value: data.serviceDate },
    { label: 'Time',      value: data.serviceTime },
    data.loyaltyDiscount > 0
      ? { label: 'Loyalty discount', value: `−£${data.loyaltyDiscount.toFixed(2)}` }
      : null,
    { label: 'Total',     value: `£${data.totalPrice.toFixed(2)}` },
    data.remainingBalance > 0
      ? { label: 'Balance due', value: `£${data.remainingBalance.toFixed(2)} (payable on the day)` }
      : { label: 'Status', value: '✓ Fully paid' },
  ].filter(Boolean) as Array<{ label: string; value: string }>

  const rows = tableRows
    .map(r => `<tr>
      <td style="padding:8px 0;color:#7A4A70;font-size:14px;width:140px;">${r.label}</td>
      <td style="padding:8px 0;color:#2A0020;font-size:14px;font-weight:600;">${r.value}</td>
    </tr>`)
    .join('')

  const downloadSection = data.pdfUrl
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${data.pdfUrl}"
           style="display:inline-block;padding:12px 28px;background:#CC1A8A;color:#fff;
                  text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">
          Download Receipt PDF
        </a>
      </div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F0D6F5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0D6F5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr>
        <td style="background:#7A0050;border-radius:12px 12px 0 0;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">BraidedbyAGB</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Farnborough, Hampshire</p>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
          <h2 style="margin:0 0 8px;font-size:22px;color:#059669;">Receipt — ${data.invoiceNumber} ✓</h2>
          <p style="margin:0 0 20px;color:#7A4A70;font-size:15px;">
            Hi ${data.customerName}, here is your receipt. Thank you for visiting us!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="margin:20px 0;background:#faf5ff;border-radius:10px;padding:16px 20px;">
            <tbody>${rows}</tbody>
          </table>
          ${downloadSection}
          <hr style="border:none;border-top:1px solid #f0e4f5;margin:28px 0;">
          <p style="margin:0;font-size:14px;color:#2A0020;">
            We hope you love your hair! Don&apos;t forget to share your look and tag us.
            Book your next appointment whenever you&apos;re ready.
          </p>
          <div style="text-align:center;margin:20px 0 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://braidedbyagb.co.uk'}/booking"
               style="display:inline-block;padding:12px 28px;background:#CC1A8A;color:#fff;
                      text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">
              Book Again
            </a>
          </div>
          <hr style="border:none;border-top:1px solid #f0e4f5;margin:28px 0;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
            BraidedbyAGB · Farnborough, Hampshire<br>
            <a href="mailto:hello@braidedbyagb.co.uk" style="color:#CC1A8A;">hello@braidedbyagb.co.uk</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`

  // Build attachments — attach PDF if buffer was generated
  const attachments = data.pdfBuffer
    ? [{ filename: `${data.invoiceNumber}.pdf`, content: data.pdfBuffer }]
    : []

  await resend.emails.send({
    from:        FROM_EMAIL(),
    to:          data.customerEmail,
    subject:     `Receipt ${data.invoiceNumber} — BraidedbyAGB`,
    html,
    attachments,
  })
}
