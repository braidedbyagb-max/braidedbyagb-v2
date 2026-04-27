-- ============================================================
-- BraidedbyAGB v2 — Core Schema
-- Run in Supabase SQL Editor (migrations/001)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Customers ────────────────────────────────────────────────
CREATE TABLE customers (
  id                SERIAL PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  phone             TEXT NOT NULL,
  email_optin       BOOLEAN DEFAULT TRUE,
  loyalty_points    INTEGER DEFAULT 0,
  is_blocked        BOOLEAN DEFAULT FALSE,
  block_reason      TEXT,
  blocked_at        TIMESTAMPTZ,
  tags              TEXT[] DEFAULT '{}',
  hair_notes        TEXT,
  profile_photo_url TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers (email);

-- ── Services ─────────────────────────────────────────────────
CREATE TABLE services (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  duration_mins  INTEGER NOT NULL DEFAULT 60,
  price_from     NUMERIC(10,2) NOT NULL,
  image_url      TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  is_new         BOOLEAN DEFAULT FALSE,
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE service_variants (
  id            SERIAL PRIMARY KEY,
  service_id    INTEGER REFERENCES services(id) ON DELETE CASCADE,
  variant_name  TEXT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  duration_mins INTEGER NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE service_addons (
  id         SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC(10,2) NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE
);

-- ── Availability ─────────────────────────────────────────────
CREATE TABLE availability (
  id           SERIAL PRIMARY KEY,
  avail_date   DATE NOT NULL,
  time_slot    TIME,             -- NULL = full-day block
  is_blocked   BOOLEAN DEFAULT TRUE,
  block_reason TEXT,
  UNIQUE (avail_date, time_slot)
);

-- ── Bookings ─────────────────────────────────────────────────
CREATE TABLE bookings (
  id                      SERIAL PRIMARY KEY,
  booking_ref             VARCHAR(20) NOT NULL UNIQUE,
  customer_id             INTEGER REFERENCES customers(id),
  service_id              INTEGER REFERENCES services(id),
  variant_id              INTEGER REFERENCES service_variants(id),
  booked_date             DATE NOT NULL,
  booked_time             TIME NOT NULL,
  status                  TEXT DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','completed',
                                              'cancelled','late_cancelled','no_show')),
  payment_method          TEXT CHECK (payment_method IN ('stripe','bank_transfer','cash','tap_to_pay')),
  deposit_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_paid            BOOLEAN DEFAULT FALSE,
  total_price             NUMERIC(10,2) NOT NULL,
  remaining_balance       NUMERIC(10,2) NOT NULL DEFAULT 0,
  client_notes            TEXT DEFAULT '',
  admin_notes             TEXT DEFAULT '',
  policy_accepted         BOOLEAN DEFAULT FALSE,
  receipt_url             TEXT,
  payment_token           VARCHAR(64) UNIQUE,
  payment_method_allowed  TEXT DEFAULT 'both'
                            CHECK (payment_method_allowed IN ('stripe','bank_transfer','both')),
  loyalty_points_redeemed INTEGER DEFAULT 0,
  loyalty_discount        NUMERIC(10,2) DEFAULT 0,
  is_archived             BOOLEAN DEFAULT FALSE,
  reminder_24_sent        BOOLEAN DEFAULT FALSE,
  reminder_2_sent         BOOLEAN DEFAULT FALSE,
  review_request_sent     BOOLEAN DEFAULT FALSE,
  admin_reminder_30_sent  BOOLEAN DEFAULT FALSE,
  from_pipeline           BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer   ON bookings (customer_id);
CREATE INDEX idx_bookings_date       ON bookings (booked_date);
CREATE INDEX idx_bookings_status     ON bookings (status);
CREATE INDEX idx_bookings_token      ON bookings (payment_token) WHERE payment_token IS NOT NULL;

CREATE TABLE booking_addons (
  id            SERIAL PRIMARY KEY,
  booking_id    INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id      INTEGER REFERENCES service_addons(id),
  price_charged NUMERIC(10,2) NOT NULL
);

-- ── Products & Shop ──────────────────────────────────────────
CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_variants (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER REFERENCES products(id) ON DELETE CASCADE,
  colour           TEXT NOT NULL,
  stock_qty        INTEGER DEFAULT 0,
  low_stock_alert  INTEGER DEFAULT 3,
  low_stock_alerted_at TIMESTAMPTZ
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE orders (
  id              SERIAL PRIMARY KEY,
  order_ref       VARCHAR(20) NOT NULL UNIQUE,
  customer_id     INTEGER REFERENCES customers(id),
  booking_id      INTEGER REFERENCES bookings(id),
  subtotal        NUMERIC(10,2) NOT NULL,
  total           NUMERIC(10,2) NOT NULL,
  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  delivery_type   TEXT DEFAULT 'shipping' CHECK (delivery_type IN ('shipping','pickup')),
  payment_method  TEXT,
  from_pipeline   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  review_request_sent BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id),
  quantity      INTEGER NOT NULL DEFAULT 1,
  price_charged NUMERIC(10,2) NOT NULL
);

-- ── Payments ─────────────────────────────────────────────────
CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  booking_id    INTEGER REFERENCES bookings(id),
  stripe_id     TEXT,
  amount        NUMERIC(10,2) NOT NULL,
  type          TEXT CHECK (type IN ('deposit','balance','full')),
  method        TEXT,
  status        TEXT DEFAULT 'pending',
  confirmed_by  TEXT,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE reviews (
  id           SERIAL PRIMARY KEY,
  booking_id   INTEGER REFERENCES bookings(id),
  customer_id  INTEGER REFERENCES customers(id),
  service_id   INTEGER REFERENCES services(id),
  product_id   INTEGER REFERENCES products(id),
  client_name  TEXT NOT NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text  TEXT NOT NULL,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Discounts / Vouchers ─────────────────────────────────────
CREATE TABLE discount_codes (
  id              SERIAL PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  type            TEXT DEFAULT 'percent' CHECK (type IN ('percent','fixed','gift_voucher')),
  value           NUMERIC(10,2) NOT NULL,
  min_order       NUMERIC(10,2) DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER DEFAULT 0,
  expires_at      DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Settings ─────────────────────────────────────────────────
CREATE TABLE settings (
  id             SERIAL PRIMARY KEY,
  setting_key    TEXT NOT NULL UNIQUE,
  setting_value  TEXT NOT NULL DEFAULT '',
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Service product links (pipeline) ─────────────────────────
CREATE TABLE service_product_links (
  id             SERIAL PRIMARY KEY,
  service_id     INTEGER REFERENCES services(id) ON DELETE CASCADE,
  product_id     INTEGER REFERENCES products(id) ON DELETE CASCADE,
  display_label  TEXT,
  display_order  INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE
);

-- ── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default settings
INSERT INTO settings (setting_key, setting_value) VALUES
  ('deposit_percent',                '30'),
  ('cancellation_hours',             '48'),
  ('business_name',                  'BraidedbyAGB'),
  ('business_email',                 'hello@braidedbyagb.co.uk'),
  ('business_phone',                 '07769064971'),
  ('business_address',               'Farnborough, Hampshire, UK'),
  ('bank_account_name',              'BraidedbyAGB'),
  ('bank_sort_code',                 ''),
  ('bank_account_number',            ''),
  ('stripe_public_key',              ''),
  ('loyalty_earn_rate',              '1'),
  ('loyalty_redeem_rate',            '100'),
  ('loyalty_min_redemption',         '500'),
  ('loyalty_max_redemption_pct',     '50'),
  ('loyalty_expiry_months',          '12'),
  ('admin_notify_morning',           '1'),
  ('admin_notify_evening',           '1'),
  ('admin_notify_30min',             '1'),
  ('admin_morning_brief_last_sent',  ''),
  ('admin_evening_preview_last_sent','')
ON CONFLICT (setting_key) DO NOTHING;
