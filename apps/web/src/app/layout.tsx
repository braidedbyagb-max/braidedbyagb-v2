import type { Metadata } from 'next'
import { Montserrat, Lato } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({
  variable: '--font-primary',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  display: 'swap',
})

const lato = Lato({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'BraidedbyAGB — Hair Braiding Farnborough',
    template: '%s | BraidedbyAGB',
  },
  description:
    'Professional hair braiding services in Farnborough, Hampshire. Book your appointment online.',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://braidedbyagb.co.uk',
    siteName: 'BraidedbyAGB',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en-GB"
      className={`${montserrat.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
