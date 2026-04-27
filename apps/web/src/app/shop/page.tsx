import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import SiteNav from '@/app/_components/SiteNav'
import SiteFooter from '@/app/_components/SiteFooter'

export const metadata: Metadata = {
  title: 'Shop — BraidedbyAGB · Hair Products & Accessories',
  description: 'Shop curated hair care products and accessories from BraidedbyAGB. UK delivery available.',
}

interface Product {
  id: number
  name: string
  slug: string
  description: string | null
  price: number
  image_url: string | null
  product_variants: { colour: string; stock_qty: number }[]
}

function totalStock(variants: { stock_qty: number }[]): number {
  return variants.reduce((s, v) => s + (v.stock_qty ?? 0), 0)
}

export default async function ShopPage() {
  const supabase = createAdminClient()

  const { data: raw } = await supabase
    .from('products')
    .select('id, name, slug, description, price, image_url, product_variants(colour, stock_qty)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const products: Product[] = (raw ?? []).map((p: any) => ({
    ...p,
    price: Number(p.price),
  }))

  const hasProducts = products.length > 0

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 68 }}>

        {/* Delivery banner */}
        <div className="delivery-banner">
          🚚 Free UK delivery on orders over £40 · Orders dispatched within 1–2 business days
        </div>

        {/* Hero */}
        <section className="page-hero">
          <div className="page-hero-bg" />
          <div className="page-container">
            <div className="page-hero-content">
              <span className="page-hero-eyebrow">BraidedbyAGB</span>
              <h1 className="page-hero-title">Shop</h1>
              <p className="page-hero-subtitle">Curated hair care products and accessories, handpicked for your hair.</p>
            </div>
          </div>
        </section>

        {/* Products */}
        <section style={{ background: '#fff', padding: '64px 0 80px' }}>
          <div className="page-container">
            {hasProducts ? (
              <div className="shop-grid">
                {products.map(product => {
                  const stock = totalStock(product.product_variants)
                  const colours = product.product_variants.map(v => v.colour).filter(Boolean)
                  const inStock = stock > 0 || product.product_variants.length === 0
                  return (
                    <article key={product.id} className="shop-card">
                      <div className="shop-card-img">
                        {product.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="shop-card-img-placeholder">
                            <span>💜</span>
                          </div>
                        )}
                        {!inStock && (
                          <span className="shop-badge shop-badge-out">Out of Stock</span>
                        )}
                      </div>
                      <div className="shop-card-body">
                        <h3 className="shop-card-name">{product.name}</h3>
                        {product.description && (
                          <p className="shop-card-desc">{product.description}</p>
                        )}
                        {colours.length > 0 && (
                          <p className="shop-card-colours">
                            {colours.length === 1 ? colours[0] : `${colours.length} colours available`}
                          </p>
                        )}
                        <div className="shop-card-footer">
                          <span className="shop-card-price">£{product.price.toFixed(2)}</span>
                          {inStock ? (
                            <a
                              href={`https://wa.me/447769064971?text=${encodeURIComponent(`Hi! I'd like to order: ${product.name} (£${product.price.toFixed(2)}). Could you confirm availability?`)}`}
                              className="btn btn-primary btn-sm"
                              target="_blank"
                              rel="noopener"
                            >
                              Order via WhatsApp
                            </a>
                          ) : (
                            <button className="btn btn-outline-primary btn-sm" disabled>
                              Out of Stock
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              /* Empty state */
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontSize: '4rem', marginBottom: 16 }}>✂️</p>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--color-deep-purple)', marginBottom: 12 }}>
                  Shop Coming Soon
                </h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem', maxWidth: 480, margin: '0 auto 32px', lineHeight: 1.7 }}>
                  We&apos;re putting the finishing touches on our product range. In the meantime, message us on WhatsApp — we can help you find the right products for your hair.
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <a
                    href="https://wa.me/447769064971?text=Hi! I'm looking for hair products, can you help?"
                    className="btn btn-primary btn-lg"
                    target="_blank"
                    rel="noopener"
                  >
                    💬 WhatsApp Us
                  </a>
                  <Link href="/booking" className="btn btn-outline-primary btn-lg">
                    Book an Appointment
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Policies reminder */}
        {hasProducts && (
          <section style={{ background: 'var(--color-bg)', padding: '48px 0' }}>
            <div className="page-container">
              <div className="policy-reminder-grid">
                <div className="policy-reminder-item">
                  <span className="policy-icon">🚚</span>
                  <div>
                    <h5>UK Delivery</h5>
                    <p>Standard delivery 2–5 working days. Free over £40.</p>
                  </div>
                </div>
                <div className="policy-reminder-item">
                  <span className="policy-icon">📦</span>
                  <div>
                    <h5>Quick Dispatch</h5>
                    <p>Orders dispatched within 1–2 business days.</p>
                  </div>
                </div>
                <div className="policy-reminder-item">
                  <span className="policy-icon">🔄</span>
                  <div>
                    <h5>Unopened Returns</h5>
                    <p>Unopened items returnable within 14 days with proof of purchase.</p>
                  </div>
                </div>
                <div className="policy-reminder-item">
                  <span className="policy-icon">💬</span>
                  <div>
                    <h5>Questions?</h5>
                    <p>WhatsApp us on <a href="https://wa.me/447769064971">07769 064 971</a>.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="cta-strip">
          <div className="page-container">
            <div className="cta-strip-inner">
              <h3 className="cta-strip-title">
                {hasProducts ? 'Need help choosing the right product?' : 'Ready to book your next style?'}
              </h3>
              <a
                href="https://wa.me/447769064971"
                className="btn btn-gold btn-lg"
                target="_blank"
                rel="noopener"
              >
                WhatsApp Us — 07769 064 971
              </a>
            </div>
          </div>
        </section>

      </main>
      <SiteFooter />
    </>
  )
}
