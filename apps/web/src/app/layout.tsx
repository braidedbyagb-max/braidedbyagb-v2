import type { Metadata } from 'next'
import { Montserrat, Lato, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { createAdminClient } from '@/lib/supabase/admin'

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

const cormorant = Cormorant_Garamond({
  variable: '--font-accent',
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
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

// Keys → CSS variable names
const BRAND_MAP: Record<string, string> = {
  brand_color_primary:      '--color-primary',
  brand_color_primary_dark: '--color-primary-dark',
  brand_color_deep_purple:  '--color-deep-purple',
  brand_color_gold:         '--color-gold',
  brand_color_bg:           '--color-bg',
  brand_color_text:         '--color-text',
  brand_color_text_muted:   '--color-text-muted',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetch brand overrides from DB. Fails silently — CSS defaults in globals.css are the fallback.
  let brandStyle = ''
  let googleFontHref = ''

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'brand_%')

    const s: Record<string, string> = {}
    for (const row of data ?? []) s[row.setting_key] = row.setting_value

    // Build CSS variable overrides for colours
    const colourRules = Object.entries(BRAND_MAP)
      .filter(([key]) => s[key])
      .map(([key, cssVar]) => `  ${cssVar}: ${s[key]};`)
      .join('\n')

    // Build font overrides if non-default fonts are set
    const fp = s.brand_font_primary
    const fb = s.brand_font_body
    const fontRules = [
      fp && fp !== 'Montserrat' ? `  --font-primary: '${fp}', sans-serif;` : '',
      fb && fb !== 'Lato'       ? `  --font-body: '${fb}', sans-serif;`    : '',
    ].filter(Boolean).join('\n')

    const allRules = [colourRules, fontRules].filter(Boolean).join('\n')
    if (allRules) {
      brandStyle = `:root {\n${allRules}\n}`
    }

    // Google Fonts link for non-default fonts
    const customFonts = [
      fp && fp !== 'Montserrat' ? fp : null,
      fb && fb !== 'Lato'       ? fb : null,
    ].filter((f): f is string => Boolean(f))

    if (customFonts.length > 0) {
      const families = customFonts
        .map(f => `family=${encodeURIComponent(f)}:wght@300;400;600;700;800;900`)
        .join('&')
      googleFontHref = `https://fonts.googleapis.com/css2?${families}&display=swap`
    }
  } catch {
    // DB unavailable — globals.css defaults remain active
  }

  return (
    <html
      lang="en-GB"
      className={`${montserrat.variable} ${lato.variable} ${cormorant.variable} h-full antialiased`}
    >
      <head>
        {googleFontHref && (
          <link rel="preconnect" href="https://fonts.googleapis.com" />
        )}
        {googleFontHref && (
          <link rel="stylesheet" href={googleFontHref} />
        )}
        {brandStyle && (
          <style dangerouslySetInnerHTML={{ __html: brandStyle }} />
        )}
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
