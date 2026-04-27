-- ============================================================
-- BraidedbyAGB v2 — Seed Data
-- Run in Supabase: Dashboard → SQL Editor → paste & run
-- ============================================================

-- ── 1. CHART OF ACCOUNTS ─────────────────────────────────────
-- Safe to re-run: uses ON CONFLICT DO NOTHING

INSERT INTO accounts (code, name, type) VALUES
  -- Assets
  ('1000', 'Stripe Account',        'asset'),
  ('1010', 'Cash',                  'asset'),
  ('1020', 'Bank Account',          'asset'),
  ('1100', 'Accounts Receivable',   'asset'),
  -- Liabilities
  ('2000', 'Customer Deposits Held','liability'),
  ('2010', 'Loyalty Points Liability','liability'),
  -- Equity
  ('3000', 'Owner''s Equity',       'equity'),
  -- Income
  ('4000', 'Service Revenue',       'income'),
  ('4010', 'Product Revenue',       'income'),
  ('4020', 'Late Cancellation Fees','income'),
  ('4030', 'Gratuities Received',   'income'),
  -- Cost of Sales
  ('5000', 'Cost of Sales — Extensions', 'expense'),
  -- Business Expenses
  ('5100', 'Business Expenses',     'expense'),
  ('5110', 'Marketing & Advertising','expense'),
  ('5120', 'Equipment & Supplies',  'expense'),
  ('5130', 'Software & Subscriptions','expense'),
  ('5140', 'Phone & Communications','expense'),
  -- Owner Draw
  ('5200', 'Owner''s Draw',         'expense')
ON CONFLICT (code) DO NOTHING;

-- ── 1b. ADD MISSING COLUMNS ──────────────────────────────────
-- category column missing from original services migration
ALTER TABLE services ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL;
-- prep_notes (shown on services & booking pages)
ALTER TABLE services ADD COLUMN IF NOT EXISTS prep_notes TEXT DEFAULT NULL;

-- ── 2. SETTINGS ───────────────────────────────────────────────
-- Core settings (adjust values after running)

INSERT INTO settings (setting_key, setting_value) VALUES
  ('business_name',          'BraidedbyAGB'),
  ('business_phone',         '07769064971'),
  ('business_email',         'hello@braidedbyagb.co.uk'),
  ('business_address',       'Farnborough, Hampshire, UK'),
  ('deposit_percent',        '30'),
  ('bank_account_name',      'BraidedbyAGB'),
  ('bank_account_number',    ''),
  ('bank_sort_code',         ''),
  ('bank_reference_prefix',  'AGB'),
  ('admin_email',            'hello@braidedbyagb.co.uk'),
  ('admin_morning_brief_last_sent', ''),
  ('loyalty_earn_rate',      '1'),
  ('loyalty_redeem_rate',    '100'),
  ('instagram_handle',       'BraidedbyAGB'),
  ('whatsapp_number',        '447769064971')
ON CONFLICT (setting_key) DO NOTHING;

-- ── 3. SERVICES ───────────────────────────────────────────────
-- IMPORTANT: These are the most common services for BraidedbyAGB.
-- Review these via Admin → Services after running and:
--   • Adjust prices to match your actual pricing
--   • Add or remove services as needed
--   • Update duration_mins to match your real booking times

-- Delete existing (empty) services if you want a clean start
-- (Comment out next line if you already added services via admin)
-- TRUNCATE TABLE service_variants, service_addons, services RESTART IDENTITY CASCADE;

INSERT INTO services (name, slug, description, duration_mins, price_from, category, prep_notes, is_active, is_new, display_order)
VALUES
  (
    'Knotless Braids',
    'knotless-braids',
    'Feed-in knotless box braids with a natural, seamless root. Less tension on the scalp for a more comfortable, longer-lasting protective style.',
    300, 80.00, 'Braids',
    'Please arrive with clean, detangled, stretched or blow-dried hair. Extensions can be purchased from our shop.',
    true, false, 1
  ),
  (
    'Box Braids',
    'box-braids',
    'Classic box braids — a timeless protective style available in a range of sizes from small to jumbo.',
    240, 70.00, 'Braids',
    'Arrive with clean, dry, detangled hair. Please confirm your preferred size and extension colour when booking.',
    true, false, 2
  ),
  (
    'Cornrows',
    'cornrows',
    'Neat, flat cornrows in straight-back, curved or custom patterns. Great as a standalone style or as a base for other styles.',
    120, 40.00, 'Cornrows',
    'Hair must be clean, dry and detangled. Let us know if you have a specific pattern in mind.',
    true, false, 3
  ),
  (
    'Feed-In Braids',
    'feed-in-braids',
    'Extensions fed in gradually for a natural-looking finish with minimal scalp tension. Ideal for ponytails, updos and freestyle designs.',
    180, 60.00, 'Braids',
    'Arrive with clean, stretched hair. Bring your preferred extension colour or purchase from our shop.',
    true, false, 4
  ),
  (
    'Starter Locs',
    'starter-locs',
    'Begin your loc journey with professionally started locs using the comb coil, palm roll or interlocking method.',
    240, 90.00, 'Locs',
    'Hair should be clean and free of products. Come with a consultation to discuss your preferred method.',
    true, true, 5
  ),
  (
    'Loc Retwist',
    'loc-retwist',
    'Professional maintenance retwist to keep your locs neat, clean and growing strong. Includes a scalp check.',
    120, 50.00, 'Locs',
    'Please wash your locs 1–2 days before your appointment and come with them fully dry.',
    true, false, 6
  ),
  (
    'Faux Locs',
    'faux-locs',
    'Get the loc look without the commitment. Wrapped or crochet faux locs installed for a bohemian or distressed finish.',
    300, 100.00, 'Locs',
    'Arrive with clean, stretched hair. Extensions are included in the price unless otherwise stated.',
    true, false, 7
  ),
  (
    'Passion Twists',
    'passion-twists',
    'Bohemian, wavy twists using curly hair for a voluminous and romantic protective style.',
    240, 80.00, 'Twists',
    'Come with clean, dry hair. Extensions are included. Let us know your preferred length at booking.',
    true, false, 8
  ),
  (
    'Kids Braids',
    'kids-braids',
    'Gentle braiding styles for children. We work patiently and carefully to ensure a comfortable experience.',
    120, 40.00, 'Kids',
    'Please ensure your child''s hair is clean and detangled before arrival.',
    true, false, 9
  )
ON CONFLICT (slug) DO NOTHING;

-- ── 3b. SERVICE VARIANTS ──────────────────────────────────────
-- Add size/length variants for the main services
-- (prices and durations are illustrative — update to match yours)

-- Knotless Braids variants
INSERT INTO service_variants (service_id, variant_name, price, duration_mins, is_active)
SELECT s.id, v.variant_name, v.price, v.duration_mins, true
FROM services s,
  (VALUES
    ('Small',  120.00, 420),
    ('Medium',  90.00, 300),
    ('Large',   80.00, 240),
    ('Jumbo',   70.00, 180)
  ) AS v(variant_name, price, duration_mins)
WHERE s.slug = 'knotless-braids'
  AND NOT EXISTS (
    SELECT 1 FROM service_variants sv WHERE sv.service_id = s.id AND sv.variant_name = v.variant_name
  );

-- Box Braids variants
INSERT INTO service_variants (service_id, variant_name, price, duration_mins, is_active)
SELECT s.id, v.variant_name, v.price, v.duration_mins, true
FROM services s,
  (VALUES
    ('Small',  100.00, 360),
    ('Medium',  80.00, 270),
    ('Large',   70.00, 210),
    ('Jumbo',   60.00, 150)
  ) AS v(variant_name, price, duration_mins)
WHERE s.slug = 'box-braids'
  AND NOT EXISTS (
    SELECT 1 FROM service_variants sv WHERE sv.service_id = s.id AND sv.variant_name = v.variant_name
  );

-- Cornrows variants
INSERT INTO service_variants (service_id, variant_name, price, duration_mins, is_active)
SELECT s.id, v.variant_name, v.price, v.duration_mins, true
FROM services s,
  (VALUES
    ('4–6 rows',     40.00, 90),
    ('8–10 rows',    55.00, 120),
    ('12+ rows',     70.00, 150),
    ('Custom design',90.00, 180)
  ) AS v(variant_name, price, duration_mins)
WHERE s.slug = 'cornrows'
  AND NOT EXISTS (
    SELECT 1 FROM service_variants sv WHERE sv.service_id = s.id AND sv.variant_name = v.variant_name
  );

-- Starter Locs variants
INSERT INTO service_variants (service_id, variant_name, price, duration_mins, is_active)
SELECT s.id, v.variant_name, v.price, v.duration_mins, true
FROM services s,
  (VALUES
    ('Comb Coils',     90.00, 240),
    ('Palm Roll',      90.00, 240),
    ('Interlocking',  100.00, 270)
  ) AS v(variant_name, price, duration_mins)
WHERE s.slug = 'starter-locs'
  AND NOT EXISTS (
    SELECT 1 FROM service_variants sv WHERE sv.service_id = s.id AND sv.variant_name = v.variant_name
  );

-- ── 3c. COMMON ADD-ONS ────────────────────────────────────────

INSERT INTO service_addons (service_id, name, price, is_active)
SELECT s.id, a.name, a.price, true
FROM services s,
  (VALUES
    ('Beads & Accessories',  5.00),
    ('Scalp Oil Treatment',  5.00),
    ('Hair Colouring',      15.00)
  ) AS a(name, price)
WHERE s.slug IN ('knotless-braids','box-braids','cornrows','feed-in-braids')
  AND NOT EXISTS (
    SELECT 1 FROM service_addons sa WHERE sa.service_id = s.id AND sa.name = a.name
  );

-- ── 4. REVIEWS TABLE (if missing) ────────────────────────────
-- The reviews table may not exist yet — create it if needed

CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  booking_id  INTEGER REFERENCES bookings(id),
  service_id  INTEGER REFERENCES services(id),
  review_type TEXT DEFAULT 'service',
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  is_featured BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── DONE ─────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Go to Admin → Services to verify/edit prices and descriptions
-- 2. Update settings above with your real bank details
-- 3. The accounting page will show data once bookings go through
