'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Variant { id?: number; variant_name: string; price: number; duration_mins: number; is_active: boolean }
interface Addon   { id?: number; name: string; price: number; is_active: boolean }
interface Service {
  id?: number
  name: string
  slug: string
  description: string
  duration_mins: number
  price_from: number
  image_url: string | null
  is_active: boolean
  is_new: boolean
  display_order: number
  service_variants: Variant[]
  service_addons: Addon[]
}

const blankService = (): Service => ({
  name: '', slug: '', description: '', duration_mins: 60, price_from: 0,
  image_url: null, is_active: true, is_new: false, display_order: 99,
  service_variants: [], service_addons: [],
})

const blankVariant = (): Variant => ({ variant_name: '', price: 0, duration_mins: 60, is_active: true })
const blankAddon   = (): Addon   => ({ name: '', price: 0, is_active: true })

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export default function ServicesClient({ initialServices }: { initialServices: Service[] }) {
  const [services,      setServices]      = useState<Service[]>(initialServices)
  const [editing,       setEditing]       = useState<Service | null>(null)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const [deleting,      setDeleting]      = useState<number | null>(null)
  const [imgUploading,  setImgUploading]  = useState(false)
  const [imgError,      setImgError]      = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // ── Open editor ──────────────────────────────────────────────
  function openNew() { setEditing(blankService()); setError('') }
  function openEdit(svc: Service) { setEditing(JSON.parse(JSON.stringify(svc))); setError('') }
  function closeEditor() { setEditing(null); setError('') }

  // ── Save (create or update) ──────────────────────────────────
  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const method = editing.id ? 'PUT' : 'POST'
      const res    = await fetch('/api/admin/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      // Refresh list
      const res2 = await fetch('/api/admin/services')
      const d2   = await res2.json()
      setServices(d2.services ?? [])
      setEditing(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('Delete this service? This will also remove all its variants and add-ons.')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      setServices(prev => prev.filter(s => s.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  // ── Image upload to Supabase Storage ────────────────────────
  async function handleImageUpload(file: File) {
    setImgUploading(true)
    setImgError('')
    try {
      const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const filePath = `services/${fileName}`

      const { error: uploadErr } = await supabase.storage
        .from('services')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadErr) throw new Error(uploadErr.message)

      const { data: urlData } = supabase.storage.from('services').getPublicUrl(filePath)
      field('image_url', urlData.publicUrl)
    } catch (err: any) {
      setImgError(err.message ?? 'Upload failed')
    } finally {
      setImgUploading(false)
    }
  }

  // ── Editor field helpers ─────────────────────────────────────
  function field<K extends keyof Service>(key: K, value: Service[K]) {
    setEditing(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function setVariant(i: number, k: keyof Variant, v: any) {
    setEditing(prev => {
      if (!prev) return prev
      const variants = [...prev.service_variants]
      variants[i] = { ...variants[i], [k]: v }
      return { ...prev, service_variants: variants }
    })
  }
  function addVariant() {
    setEditing(prev => prev ? { ...prev, service_variants: [...prev.service_variants, blankVariant()] } : prev)
  }
  function removeVariant(i: number) {
    setEditing(prev => {
      if (!prev) return prev
      const variants = prev.service_variants.filter((_, idx) => idx !== i)
      return { ...prev, service_variants: variants }
    })
  }

  function setAddon(i: number, k: keyof Addon, v: any) {
    setEditing(prev => {
      if (!prev) return prev
      const addons = [...prev.service_addons]
      addons[i] = { ...addons[i], [k]: v }
      return { ...prev, service_addons: addons }
    })
  }
  function addAddon() {
    setEditing(prev => prev ? { ...prev, service_addons: [...prev.service_addons, blankAddon()] } : prev)
  }
  function removeAddon(i: number) {
    setEditing(prev => {
      if (!prev) return prev
      const addons = prev.service_addons.filter((_, idx) => idx !== i)
      return { ...prev, service_addons: addons }
    })
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-deep-purple)' }}>Services</h1>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-full text-sm font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          + New Service
        </button>
      </div>

      {/* Services table */}
      {services.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>No services yet.</p>
          <button onClick={openNew} className="px-5 py-2 rounded-full font-bold text-sm text-white" style={{ background: 'var(--color-primary)' }}>
            Add Your First Service
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Service</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Price</th>
                <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>Duration</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>Variants</th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--color-text-muted)' }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {services.map((svc, idx) => (
                <tr key={svc.id ?? idx} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-4 py-3">
                    <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{svc.name}</p>
                    {svc.is_new && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: '#fef3c7', color: '#92400e' }}>NEW</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text)' }}>
                    From £{Number(svc.price_from).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                    {svc.duration_mins} min
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--color-text-muted)' }}>
                    {svc.service_variants.length} variant{svc.service_variants.length !== 1 ? 's' : ''}
                    {svc.service_addons.length > 0 && ` · ${svc.service_addons.length} add-on${svc.service_addons.length !== 1 ? 's' : ''}`}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: svc.is_active ? '#d1fae5' : '#fee2e2', color: svc.is_active ? '#065f46' : '#991b1b' }}>
                      {svc.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(svc)}
                            className="text-sm font-medium mr-3" style={{ color: 'var(--color-primary)' }}>
                      Edit
                    </button>
                    <button
                      onClick={() => svc.id && handleDelete(svc.id)}
                      disabled={deleting === svc.id}
                      className="text-sm font-medium" style={{ color: '#dc2626' }}
                    >
                      {deleting === svc.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit / Create modal ──────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6" style={{ background: '#fff' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: 'var(--color-deep-purple)' }}>
                {editing.id ? 'Edit Service' : 'New Service'}
              </h2>
              <button onClick={closeEditor} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Basic info */}
            <section className="mb-5">
              <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Name *</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                    value={editing.name}
                    onChange={e => { field('name', e.target.value); field('slug', slugify(e.target.value)) }}
                    placeholder="e.g. Knotless Braids"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Slug</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
                    style={{ borderColor: 'var(--color-border)' }}
                    value={editing.slug}
                    onChange={e => field('slug', e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                    style={{ borderColor: 'var(--color-border)' }}
                    rows={3}
                    value={editing.description}
                    onChange={e => field('description', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Base Price (£) *</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                    value={editing.price_from}
                    onChange={e => field('price_from', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Duration (mins) *</label>
                  <input
                    type="number" min="15" step="15"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                    value={editing.duration_mins}
                    onChange={e => field('duration_mins', parseInt(e.target.value) || 60)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Display Order</label>
                  <input
                    type="number" min="0"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ borderColor: 'var(--color-border)' }}
                    value={editing.display_order}
                    onChange={e => field('display_order', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Service Image</label>

                  {/* Current image preview */}
                  {editing.image_url && (
                    <div className="relative mb-2 w-full h-36 rounded-xl overflow-hidden border"
                         style={{ borderColor: 'var(--color-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={editing.image_url}
                        alt="Service"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => field('image_url', null)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleImageUpload(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imgUploading}
                    className="w-full py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-60"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                  >
                    {imgUploading ? 'Uploading…' : editing.image_url ? '↺ Replace image' : '↑ Upload image'}
                  </button>
                  {imgError && (
                    <p className="text-xs mt-1 text-red-600">{imgError}</p>
                  )}
                  {/* Fallback: paste a URL directly */}
                  <input
                    className="w-full px-3 py-2 rounded-lg border text-xs mt-2"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                    value={editing.image_url ?? ''}
                    onChange={e => field('image_url', e.target.value || null)}
                    placeholder="Or paste an image URL…"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.is_active} onChange={e => field('is_active', e.target.checked)} />
                  Active (visible on booking page)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={editing.is_new} onChange={e => field('is_new', e.target.checked)} />
                  Mark as NEW
                </label>
              </div>
            </section>

            {/* Variants */}
            <section className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Variants (optional — e.g. Short / Medium / Long)
                </h3>
                <button onClick={addVariant} className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                  + Add Variant
                </button>
              </div>
              {editing.service_variants.length === 0 && (
                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                  No variants — base price and duration apply to all bookings.
                </p>
              )}
              <div className="space-y-2">
                {editing.service_variants.map((v, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="Variant name (e.g. Medium)"
                      value={v.variant_name}
                      onChange={e => setVariant(i, 'variant_name', e.target.value)}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      className="w-20 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="£"
                      value={v.price}
                      onChange={e => setVariant(i, 'price', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="number" min="15" step="15"
                      className="w-20 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="mins"
                      value={v.duration_mins}
                      onChange={e => setVariant(i, 'duration_mins', parseInt(e.target.value) || 60)}
                    />
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={v.is_active} onChange={e => setVariant(i, 'is_active', e.target.checked)} />
                      On
                    </label>
                    <button onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Add-ons */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Add-ons (optional — e.g. Extensions, Colour Treatment)
                </h3>
                <button onClick={addAddon} className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                  + Add Add-on
                </button>
              </div>
              {editing.service_addons.length === 0 && (
                <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No add-ons for this service.</p>
              )}
              <div className="space-y-2">
                {editing.service_addons.map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="flex-1 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="Add-on name"
                      value={a.name}
                      onChange={e => setAddon(i, 'name', e.target.value)}
                    />
                    <input
                      type="number" min="0" step="0.01"
                      className="w-20 px-3 py-1.5 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                      placeholder="£"
                      value={a.price}
                      onChange={e => setAddon(i, 'price', parseFloat(e.target.value) || 0)}
                    />
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={a.is_active} onChange={e => setAddon(i, 'is_active', e.target.checked)} />
                      On
                    </label>
                    <button onClick={() => removeAddon(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                  </div>
                ))}
              </div>
            </section>

            {/* Error */}
            {error && (
              <div className="rounded-lg p-3 text-sm mb-4" style={{ background: '#fee2e2', color: '#dc2626' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={closeEditor}
                className="flex-1 py-2.5 rounded-full font-bold text-sm border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editing.name}
                className="flex-1 py-2.5 rounded-full font-bold text-sm text-white disabled:opacity-60"
                style={{ background: 'var(--color-primary)' }}
              >
                {saving ? 'Saving…' : editing.id ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
