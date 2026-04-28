import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage() {
  const supabase = createAdminClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(name, email), bookings(booking_ref)')
    .order('created_at', { ascending: false })
    .limit(100)

  const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    sent:   { color: '#065f46', bg: '#d1fae5' },
    draft:  { color: '#92400e', bg: '#fef3c7' },
    voided: { color: '#6b7280', bg: '#f3f4f6' },
  }
  const TYPE_LABEL: Record<string, string> = {
    receipt:     'Receipt',
    invoice:     'Invoice',
    credit_note: 'Credit Note',
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {!invoices?.length ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No invoices yet. They are generated automatically when payments are confirmed.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider"
                  style={{ background: '#f9fafb', color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold">Invoice #</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Booking</th>
                <th className="text-right px-4 py-3 font-semibold">Amount</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Sent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const style = STATUS_STYLE[inv.status] ?? STATUS_STYLE.draft
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-pink-50/30 transition-colors"
                      style={{ borderColor: '#f3f4f6' }}>
                    <td className="px-4 py-3 font-mono font-semibold text-xs"
                        style={{ color: 'var(--color-primary)' }}>
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
                      {TYPE_LABEL[inv.type] ?? inv.type}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {inv.customers?.name ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {inv.customers?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs"
                        style={{ color: 'var(--color-text-muted)' }}>
                      {inv.bookings?.booking_ref ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold"
                        style={{ color: 'var(--color-text)' }}>
                      £{Number(inv.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ color: style.color, background: style.bg }}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {inv.sent_at
                        ? new Date(inv.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer"
                           className="text-xs font-semibold underline"
                           style={{ color: 'var(--color-primary)' }}>
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
