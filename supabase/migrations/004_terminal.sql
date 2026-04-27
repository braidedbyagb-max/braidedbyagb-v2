-- ============================================================
-- BraidedbyAGB v2 — Stripe Terminal Schema
-- Run after 003_crm.sql
-- ============================================================

-- ── Terminal Readers Registry ─────────────────────────────────
-- Tracks registered physical card readers (Phase B / Stripe Reader M2)
-- Phase A (Tap to Pay on Android) doesn't need rows here, but
-- the table is ready for when a physical reader is added.
CREATE TABLE terminal_readers (
  id               SERIAL PRIMARY KEY,
  stripe_reader_id TEXT NOT NULL UNIQUE,  -- 'tmr_xxx' from Stripe
  label            TEXT NOT NULL,         -- e.g. 'Main Reader'
  location_id      TEXT,                  -- Stripe Terminal location ID
  status           TEXT DEFAULT 'active'
                     CHECK (status IN ('active','inactive')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── In-Person Payments ────────────────────────────────────────
-- Every card payment collected via Tap to Pay or physical reader
CREATE TABLE in_person_payments (
  id                       SERIAL PRIMARY KEY,
  booking_id               INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,  -- 'pi_xxx'
  amount                   NUMERIC(10,2) NOT NULL,
  collect_type             TEXT NOT NULL
                             CHECK (collect_type IN ('deposit','balance','full')),
  method                   TEXT NOT NULL DEFAULT 'tap_to_pay'
                             CHECK (method IN ('tap_to_pay','card_reader')),
  reader_id                INTEGER REFERENCES terminal_readers(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'processing'
                             CHECK (status IN ('processing','succeeded','failed','cancelled')),
  journal_entry_id         INTEGER REFERENCES journal_entries(id) ON DELETE SET NULL,
  invoice_id               INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ipp_booking ON in_person_payments (booking_id);
CREATE INDEX idx_ipp_status  ON in_person_payments (status);

-- ── Updated_at trigger for in_person_payments ─────────────────
CREATE TRIGGER trg_in_person_payments_updated_at
  BEFORE UPDATE ON in_person_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Connection Token Log ──────────────────────────────────────
-- Optional: audit log of Terminal connection tokens issued
-- (Each mobile app session calls /api/terminal/connection-token;
--  logging helps diagnose SDK reconnect issues in the field)
CREATE TABLE terminal_connection_tokens (
  id         SERIAL PRIMARY KEY,
  issued_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  device_id  TEXT        -- optional: device fingerprint or Expo install ID
);

-- ── RLS: terminal tables are admin-only ───────────────────────
ALTER TABLE terminal_readers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_person_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_connection_tokens ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role (used by Next.js API routes
-- via the SUPABASE_SERVICE_ROLE_KEY) can access these tables.
-- The anon / authenticated keys used by the customer portal
-- have zero access here by default (RLS with no matching policy = deny).
