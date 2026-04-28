import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Orders' }

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#92400e', bg: '#fef3c7' },
  processing: { label: 'Processing', color: '#1e40af', bg: '#dbeafe' },
  shipped:    { label: 'Shipped',    color: '#065f46', bg: '#d1fae5' },
  delivered:  { label: 'Delivered',  color: '#5b21b6', bg: '#ede9fe' },
  cancelled:  { label: 'Cancelled',  color: '#991b1b', bg: '#fee2e2' },
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = params.status ?? ''
  const supabase = createAdminClient()

  let req = supabase
    .from('orders')
    .select('*, customers(name, email), order_items(quantity, price_charged, products(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) req = req.eq('status', status)

  const { data: orders } = await req

  return (
    <div>
      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: '', label: 'All' }, ...Object.entries(STATUS_STYLE).map(([k, v]) => ({ key: k, label: v.label }))].map(t => (
          <Link key={t.key}
            href={`/admin/orders${t.key ? `?status=${t.key}` : ''}`}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={status === t.key
              ? { background: 'var(--color-primary)', color: '#fff' }
              : { color: 'var(--color-text-muted)', background: 'white' }
            }>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {!orders?.length ? (
          <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
            No orders found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider"
                  style={{ background: '#f9fafb', color: 'var(--color-text-muted)' }}>
                <th className="text-left px-4 py-3 font-semibold">Order Ref</th>
                <th className="text-left px-4 py-3 font-semibold">Client</th>
                <th className="text-left px-4 py-3 font-semibold">Items</th>
                <th className="text-center px-4 py-3 font-semibold">Delivery</th>
                <th className="text-center px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Total</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const style = STATUS_STYLE[o.status] ?? STATUS_STYLE.pending
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-pink-50/30 transition-colors"
                      style={{ borderColor: '#f3f4f6' }}>
                    <td className="px-4 py-3 font-mono font-semibold text-xs"
                        style={{ color: 'var(--color-primary)' }}>
                      {o.order_ref}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {o.customers?.name ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {o.customers?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {(o.order_items ?? []).slice(0, 2).map((item: any, i: number) => (
                        <p key={i} className="text-xs" style={{ color: 'var(--color-text)' }}>
                          {item.quantity}× {item.products?.name}
                        </p>
                      ))}
                      {(o.order_items?.length ?? 0) > 2 && (
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          +{o.order_items.length - 2} more
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                        {o.delivery_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ color: style.color, background: style.bg }}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--color-text)' }}>
                      £{Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OrderStatusDropdown orderId={o.id} currentStatus={o.status} />
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

// Inline server-safe status badge — client interactivity handled via form action
function OrderStatusDropdown({ orderId, currentStatus }: { orderId: number; currentStatus: string }) {
  return (
    <Link href={`/admin/orders/${orderId}`}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-pink-50"
      style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
      Manage →
    </Link>
  )
}
