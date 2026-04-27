'use client'

import { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'deposit',      label: 'Deposit Policy' },
  { id: 'cancellation', label: 'Cancellation Policy' },
  { id: 'late-arrival', label: 'Late Arrival Policy' },
  { id: 'no-show',      label: 'No-Show Policy' },
  { id: 'refund',       label: 'Refund Policy' },
  { id: 'shipping',     label: 'Shipping Policy' },
  { id: 'privacy',      label: 'Privacy Policy' },
]

export default function PoliciesNavClient() {
  const [active, setActive] = useState('')

  useEffect(() => {
    const handler = () => {
      let current = ''
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && window.scrollY >= el.offsetTop - 120) current = s.id
      }
      setActive(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className="policies-nav" aria-label="Policy sections">
      {SECTIONS.map(s => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`policies-nav-link${active === s.id ? ' active' : ''}`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}
