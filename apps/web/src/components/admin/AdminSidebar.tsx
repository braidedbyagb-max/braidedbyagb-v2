'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: '📊',
  },
  {
    label: 'Bookings',
    href: '/admin/bookings',
    icon: '📅',
  },
  {
    label: 'Calendar',
    href: '/admin/calendar',
    icon: '🗓',
  },
  {
    label: 'CRM',
    href: '/admin/crm',
    icon: '👥',
  },
  {
    label: 'Orders',
    href: '/admin/orders',
    icon: '📦',
  },
  {
    label: 'Accounting',
    href: '/admin/accounting',
    icon: '💷',
    children: [
      { label: 'Overview', href: '/admin/accounting' },
      { label: 'Invoices', href: '/admin/accounting/invoices' },
      { label: 'Expenses', href: '/admin/accounting/expenses' },
    ],
  },
  {
    label: 'Loyalty',
    href: '/admin/loyalty',
    icon: '⭐',
  },
  {
    label: 'Services',
    href: '/admin/services',
    icon: '✂️',
  },
  {
    label: 'Settings',
    href: '/admin/settings',
    icon: '⚙️',
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col shadow-lg"
      style={{
        background: 'linear-gradient(180deg, #7A0050 0%, #2A0020 100%)',
        minHeight: '100vh',
      }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/admin/dashboard" className="block">
          <div className="text-white font-bold text-xl" style={{ fontFamily: 'var(--font-primary)' }}>
            BraidedbyAGB
          </div>
          <div className="text-white/50 text-xs mt-0.5 tracking-wider uppercase">Admin Portal</div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map((item) => (
          <div key={item.href} className="mb-1">
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>

            {/* Sub-navigation */}
            {item.children && isActive(item.href) && (
              <div className="ml-9 mt-1 space-y-0.5">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block px-3 py-1.5 rounded-md text-xs transition-all ${
                      pathname === child.href
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="text-white/40 text-xs">v2.0.0</div>
      </div>
    </aside>
  )
}
