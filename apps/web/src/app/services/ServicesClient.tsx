'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Service {
  id: number
  name: string
  slug: string
  description: string | null
  duration_mins: number
  price_from: number
  max_price?: number
  category: string | null
  prep_notes: string | null
  image_url: string | null
  is_new: boolean
  variant_names?: string
}

function formatDuration(mins: number): string {
  if (!mins) return ''
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const GRAD_MAP: Record<string, string> = {
  knotless: 'linear-gradient(145deg,#4B0082,#9400D3)',
  box:      'linear-gradient(145deg,#3a0060,#7a0080)',
  feed:     'linear-gradient(145deg,#2d0050,#6600aa)',
  cornrow:  'linear-gradient(145deg,#5c003c,#8B0060)',
  twist:    'linear-gradient(145deg,#380060,#800080)',
  passion:  'linear-gradient(145deg,#380060,#800080)',
  loc:      'linear-gradient(145deg,#1a0040,#4B0082)',
  starter:  'linear-gradient(145deg,#1a0040,#4B0082)',
  faux:     'linear-gradient(145deg,#2a0044,#660099)',
  kid:      'linear-gradient(145deg,#660044,#aa0066)',
}
const FALLBACK_GRADS = [
  'linear-gradient(145deg,#4B0082,#800080)',
  'linear-gradient(145deg,#2d0050,#800080)',
  'linear-gradient(145deg,#500050,#9400D3)',
]
function getGrad(slug: string, idx: number) {
  const lower = slug.toLowerCase()
  for (const [key, grad] of Object.entries(GRAD_MAP)) {
    if (lower.includes(key)) return grad
  }
  return FALLBACK_GRADS[idx % 3]
}

export default function ServicesClient({ services, categories }: {
  services: Service[]
  categories: string[]
}) {
  const [active, setActive] = useState('all')

  const visible = active === 'all'
    ? services
    : services.filter(s => (s.category ?? '').toLowerCase() === active)

  return (
    <>
      {/* Category filter */}
      <section style={{ background: 'var(--color-bg)', padding: '32px 0' }}>
        <div className="page-container">
          <div className="filter-row">
            <button
              className={`filter-btn${active === 'all' ? ' active' : ''}`}
              onClick={() => setActive('all')}
            >
              All Services
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn${active === cat.toLowerCase() ? ' active' : ''}`}
                onClick={() => setActive(cat.toLowerCase())}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services list */}
      <section style={{ background: '#fff', padding: '48px 0' }}>
        <div className="page-container">
          {visible.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-text-muted)' }}>
              No services in this category yet.
            </div>
          ) : (
            <div className="services-list">
              {visible.map((svc, idx) => {
                const dur = formatDuration(svc.duration_mins)
                const grad = getGrad(svc.slug, idx)
                return (
                  <article key={svc.id} className="service-list-item">
                    <div className="service-list-img" style={{ background: svc.image_url ? undefined : grad }}>
                      {svc.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={svc.image_url} alt={svc.name} loading="lazy" />
                      ) : (
                        <div className="service-list-img-placeholder" style={{ background: grad }} />
                      )}
                      {svc.is_new && <span className="badge-new">New</span>}
                    </div>
                    <div className="service-list-body">
                      <div className="service-list-info">
                        <h2 className="service-list-name">{svc.name}</h2>
                        {svc.description && (
                          <p className="service-list-desc">{svc.description}</p>
                        )}
                        <div className="service-list-meta">
                          {dur && <span className="meta-item">⏱ {dur}</span>}
                          {svc.category && <span className="meta-item">🏷 {svc.category}</span>}
                          {svc.variant_names && (
                            <span className="meta-item">Options: {svc.variant_names}</span>
                          )}
                        </div>
                        {svc.prep_notes && (
                          <div className="service-prep-note">
                            <strong>📋 Prep:</strong> {svc.prep_notes}
                          </div>
                        )}
                      </div>
                      <div className="service-list-action">
                        <div className="service-list-price">
                          <span className="price-from">From</span>
                          <span className="price-amount">£{Number(svc.price_from).toFixed(0)}</span>
                          {svc.max_price && svc.max_price !== svc.price_from && (
                            <span className="price-to">– £{Number(svc.max_price).toFixed(0)}</span>
                          )}
                        </div>
                        <Link href={`/booking/${svc.slug}`} className="btn btn-primary">Book Now</Link>
                        <Link href={`/booking`} className="btn btn-outline-primary">View Details</Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
