'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function NavClient() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <header className="sp-nav" id="site-header">
      <div className="sp-nav-inner">
        <Link href="/" className="sp-logo" onClick={close}>
          <Image src="/images/braidedbyagblogo.png" alt="BraidedbyAGB" width={160} height={42} priority />
        </Link>
        <nav className="sp-nav-links">
          <Link href="/#about">About</Link>
          <Link href="/#services">Services</Link>
          <Link href="/#testimonials">Testimonials</Link>
          <Link href="/#policy">Policy</Link>
          <Link href="/#contact">Contact</Link>
        </nav>
        <Link href="/booking" className="btn btn-gold sp-book-btn">Book Now</Link>
        <button
          className={`sp-hamburger${open ? ' open' : ''}`}
          aria-label="Menu"
          onClick={() => setOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
      </div>
      <div className={`sp-mobile-menu${open ? ' open' : ''}`}>
        <Link href="/#about" onClick={close}>About</Link>
        <Link href="/#services" onClick={close}>Services</Link>
        <Link href="/#testimonials" onClick={close}>Testimonials</Link>
        <Link href="/#policy" onClick={close}>Policy</Link>
        <Link href="/#contact" onClick={close}>Contact</Link>
        <Link href="/booking" className="btn btn-gold" style={{ marginTop: 8, width: '100%', justifyContent: 'center' }} onClick={close}>
          Book Now
        </Link>
      </div>
    </header>
  )
}
