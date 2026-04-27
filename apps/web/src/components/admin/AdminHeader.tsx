'use client'

import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':            'Dashboard',
  '/admin/bookings':             'Bookings',
  '/admin/calendar':             'Calendar',
  '/admin/crm':                  'Customers',
  '/admin/orders':               'Orders',
  '/admin/accounting':           'Accounting',
  '/admin/accounting/invoices':  'Invoices',
  '/admin/accounting/expenses':  'Expenses',
  '/admin/loyalty':              'Loyalty Points',
  '/admin/services':             'Services',
  '/admin/settings':             'Settings',
}

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const title = Object.entries(PAGE_TITLES)
    .filter(([key]) => pathname.startsWith(key))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm"
      style={{ minHeight: '60px' }}
    >
      <h1
        className="text-lg font-bold"
        style={{ color: 'var(--color-deep-purple)', fontFamily: 'var(--font-primary)' }}
      >
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* Quick actions */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          View site ↗
        </a>

        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-md border transition-colors hover:bg-red-50"
          style={{
            color: '#dc2626',
            borderColor: '#fca5a5',
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
