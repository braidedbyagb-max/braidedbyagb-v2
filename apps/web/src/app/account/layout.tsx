import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'My Account — BraidedbyAGB',
    template: '%s | My Account — BraidedbyAGB',
  },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
