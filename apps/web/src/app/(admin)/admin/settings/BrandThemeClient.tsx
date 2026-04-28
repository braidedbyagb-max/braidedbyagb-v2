'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const DEFAULTS: Record<string, string> = {
  brand_color_primary:      '#CC1A8A',
  brand_color_primary_dark: '#A8146E',
  brand_color_deep_purple:  '#7A0050',
  brand_color_gold:         '#F0C030',
  brand_color_bg:           '#F0D6F5',
  brand_color_text:         '#2A0020',
  brand_color_text_muted:   '#7A4A70',
  brand_font_primary:       'Montserrat',
  brand_font_body:          'Lato',
}

const COLOURS = [
  { key: 'brand_color_primary',      label: 'Primary',        hint: 'Buttons, links, accents' },
  { key: 'brand_color_primary_dark', label: 'Primary hover',  hint: 'Button hover state' },
  { key: 'brand_color_deep_purple',  label: 'Deep accent',    hint: 'Headings, nav' },
  { key: 'brand_color_gold',         label: 'Gold',           hint: 'Stars, badges, highlights' },
  { key: 'brand_color_bg',           label: 'Page background',hint: 'Site background colour' },
  { key: 'brand_color_text',         label: 'Body text',      hint: 'Main readable text' },
  { key: 'brand_color_text_muted',   label: 'Muted text',     hint: 'Secondary / helper text' },
]

const FONTS = [
  'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Open Sans',
  'Inter', 'Lato', 'Roboto', 'DM Sans', 'Josefin Sans',
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville',
]

interface Props {
  settings: Record<string, string>
}

export default function BrandThemeClient({ settings }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...DEFAULTS,
    ...Object.fromEntries(
      Object.entries(settings).filter(([k]) => k.startsWith('brand_'))
    ),
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  // Inject Google Fonts into the page for the live preview
  useEffect(() => {
    const fp = values.brand_font_primary
    const fb = values.brand_font_body
    const families = [fp, fb]
      .filter((f, i, arr) => f && arr.indexOf(f) === i)
      .map(f => `family=${encodeURIComponent(f!)}:wght@400;600;700;800;900`)
      .join('&')
    const url = `https://fonts.googleapis.com/css2?${families}&display=swap`
    const existing = document.querySelector('link[data-brand-preview]')
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = url
    link.dataset.brandPreview = 'true'
    document.head.appendChild(link)
  }, [values.brand_font_primary, values.brand_font_body])

  function set(key: string, val: string) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function save() {
    setSaving(true)
    for (const [key, value] of Object.entries(values)) {
      if (!key.startsWith('brand_')) continue
      await supabase
        .from('settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  async function reset() {
    setValues({ ...DEFAULTS })
    setSaving(true)
    for (const [key, value] of Object.entries(DEFAULTS)) {
      await supabase
        .from('settings')
        .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    router.refresh()
  }

  // Shorthand for the preview panel
  const pv = {
    primary:    values.brand_color_primary,
    deep:       values.brand_color_deep_purple,
    gold:       values.brand_color_gold,
    bg:         values.brand_color_bg,
    text:       values.brand_color_text,
    muted:      values.brand_color_text_muted,
    fontH:      values.brand_font_primary,
    fontB:      values.brand_font_body,
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-bold text-base" style={{ color: 'var(--color-deep-purple)' }}>
          Brand &amp; Theme
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(204,26,138,0.08)', color: 'var(--color-primary)' }}>
          Live preview →
        </span>
      </div>
      <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Changes apply site-wide. Reload the page after saving to see the updated theme.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── Controls ───────────────────────────────────── */}
        <div className="space-y-6">

          {/* Colours */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3"
               style={{ color: 'var(--color-text-muted)' }}>Colours</p>
            <div className="space-y-3">
              {COLOURS.map(({ key, label, hint }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="relative cursor-pointer flex-shrink-0">
                    <input
                      type="color"
                      value={values[key] ?? '#000000'}
                      onChange={e => set(key, e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className="w-10 h-10 rounded-xl border-2 shadow-sm transition-transform hover:scale-105"
                      style={{
                        background: values[key] ?? '#000',
                        borderColor: 'rgba(0,0,0,0.12)',
                      }}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight"
                       style={{ color: 'var(--color-text)' }}>{label}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>
                  </div>
                  <span className="text-xs font-mono flex-shrink-0"
                        style={{ color: 'var(--color-text-muted)' }}>
                    {values[key] ?? ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3"
               style={{ color: 'var(--color-text-muted)' }}>Fonts</p>
            <div className="space-y-3">
              {[
                { key: 'brand_font_primary', label: 'Heading / display font' },
                { key: 'brand_font_body',    label: 'Body text font' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1"
                         style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                  <select
                    value={values[key] ?? ''}
                    onChange={e => set(key, e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{
                      borderColor: 'var(--color-border)',
                      fontFamily: `'${values[key]}', sans-serif`,
                    }}
                  >
                    {FONTS.map(f => (
                      <option key={f} value={f} style={{ fontFamily: `'${f}', sans-serif` }}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live preview ────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
             style={{ color: 'var(--color-text-muted)' }}>Preview</p>

          <div className="rounded-2xl overflow-hidden border shadow-sm"
               style={{ borderColor: pv.primary + '30' }}>

            {/* Nav bar */}
            <div className="px-5 py-3 flex items-center justify-between"
                 style={{ background: pv.primary }}>
              <span style={{
                fontFamily: `'${pv.fontH}', sans-serif`,
                fontWeight: 900, fontSize: 15, color: '#fff', letterSpacing: '0.02em',
              }}>
                BraidedbyAGB
              </span>
              <div style={{ display: 'flex', gap: 16 }}>
                {['Services', 'Book', 'Shop'].map(l => (
                  <span key={l} style={{
                    fontFamily: `'${pv.fontH}', sans-serif`,
                    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                  }}>{l}</span>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="p-5" style={{ background: pv.bg }}>
              <p style={{
                fontFamily: `'${pv.fontH}', sans-serif`,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: pv.gold, marginBottom: 6,
              }}>
                Award-winning braiding
              </p>
              <h4 style={{
                fontFamily: `'${pv.fontH}', sans-serif`,
                fontSize: 22, fontWeight: 900, color: pv.deep, lineHeight: 1.1,
                marginBottom: 8,
              }}>
                Knotless Braids &amp;<br />Box Braids
              </h4>
              <p style={{
                fontFamily: `'${pv.fontB}', sans-serif`,
                fontSize: 12, color: pv.muted, lineHeight: 1.7, marginBottom: 14,
              }}>
                Professional hair braiding in Farnborough, Hampshire.
                Book your appointment online today.
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button style={{
                  background: pv.primary, color: '#fff',
                  fontFamily: `'${pv.fontH}', sans-serif`,
                  fontWeight: 700, fontSize: 11, padding: '8px 18px',
                  borderRadius: 4, border: 'none', cursor: 'default',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  Book Now
                </button>
                <button style={{
                  background: 'transparent', color: pv.primary,
                  fontFamily: `'${pv.fontH}', sans-serif`,
                  fontWeight: 700, fontSize: 11, padding: '8px 18px',
                  borderRadius: 4, border: `2px solid ${pv.primary}`,
                  cursor: 'default', letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
                  View Services
                </button>
              </div>

              {/* Review card */}
              <div style={{
                background: '#fff', borderRadius: 10, padding: '14px 16px',
                borderLeft: `4px solid ${pv.gold}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ color: pv.gold, fontSize: 12 }}>★</span>
                  ))}
                </div>
                <p style={{
                  fontFamily: `'${pv.fontB}', sans-serif`,
                  fontSize: 11, color: pv.text, lineHeight: 1.6,
                  fontStyle: 'italic', marginBottom: 8,
                }}>
                  "Absolutely love my new braids! So professional."
                </p>
                <p style={{
                  fontFamily: `'${pv.fontH}', sans-serif`,
                  fontSize: 10, fontWeight: 800, color: pv.deep,
                }}>
                  Sarah M. · Knotless Braids
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6 pt-5 border-t"
           style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-60"
          style={{ background: saved ? '#059669' : 'var(--color-primary)' }}
        >
          {saving ? 'Saving…' : saved ? '✓ Theme saved' : 'Save Theme'}
        </button>
        <button
          onClick={reset}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          Reset to defaults
        </button>
        <p className="text-xs ml-auto hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
          Reload after saving to see changes on this page
        </p>
      </div>
    </div>
  )
}
