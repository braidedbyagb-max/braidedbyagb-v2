-- ============================================================
-- BraidedbyAGB v2 — Accounting Schema (Double-Entry)
-- Run after 001_core_schema.sql
-- ============================================================

-- ── Chart of Accounts ────────────────────────────────────────
CREATE TABLE accounts (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(10) NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  parent_id  INTEGER REFERENCES accounts(id),
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Journal Entries ──────────────────────────────────────────
CREATE TABLE journal_entries (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  reference   TEXT,           -- booking_ref, invoice_number, expense id, etc.
  source      TEXT NOT NULL
                CHECK (source IN ('booking_deposit','booking_balance','booking_cancellation',
                                   'tap_to_pay','expense','owner_draw',
                                   'loyalty_redemption','manual')),
  source_id   INTEGER,        -- FK to the originating record id
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_date   ON journal_entries (date DESC);
CREATE INDEX idx_journal_source ON journal_entries (source, source_id);

-- ── Journal Entry Lines ──────────────────────────────────────
-- Constraint: for every journal_entry, SUM(debit) = SUM(credit)
CREATE TABLE journal_entry_lines (
  id               SERIAL PRIMARY KEY,
  journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id       INTEGER REFERENCES accounts(id),
  debit            NUMERIC(10,2) DEFAULT 0 CHECK (debit >= 0),
  credit           NUMERIC(10,2) DEFAULT 0 CHECK (credit >= 0),
  memo             TEXT
);

CREATE INDEX idx_jel_entry   ON journal_entry_lines (journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines (account_id);

-- ── Invoices / Receipts ──────────────────────────────────────
CREATE TABLE invoices (
  id             SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,  -- 'INV-2026-0001'
  type           TEXT NOT NULL DEFAULT 'receipt'
                   CHECK (type IN ('receipt','invoice','credit_note')),
  booking_id     INTEGER REFERENCES bookings(id),
  order_id       INTEGER REFERENCES orders(id),
  customer_id    INTEGER REFERENCES customers(id),
  amount         NUMERIC(10,2) NOT NULL,
  status         TEXT DEFAULT 'sent' CHECK (status IN ('draft','sent','voided')),
  pdf_url        TEXT,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_booking  ON invoices (booking_id);

-- ── Expenses ─────────────────────────────────────────────────
CREATE TABLE expenses (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  account_id  INTEGER REFERENCES accounts(id),  -- 5000–5199 expense accounts
  receipt_url TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Owner's Draw ─────────────────────────────────────────────
CREATE TABLE owner_draws (
  id         SERIAL PRIMARY KEY,
  date       DATE NOT NULL,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Invoice number sequence helper ───────────────────────────
CREATE SEQUENCE invoice_number_seq START 1;

CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS TEXT AS $$
DECLARE
  yr TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
  n  INTEGER;
BEGIN
  n := nextval('invoice_number_seq');
  RETURN 'INV-' || yr || '-' || LPAD(n::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ── Seed: Default Chart of Accounts ─────────────────────────
INSERT INTO accounts (code, name, type) VALUES
  -- ASSETS
  ('1000', 'Stripe Account',      'asset'),
  ('1010', 'Cash',                'asset'),
  ('1020', 'Business Bank',       'asset'),
  ('1100', 'Accounts Receivable', 'asset'),
  -- LIABILITIES
  ('2000', 'Customer Deposits Held', 'liability'),
  -- EQUITY
  ('3000', 'Owner''s Equity',    'equity'),
  -- INCOME
  ('4000', 'Service Revenue',       'income'),
  ('4010', 'Product Revenue',       'income'),
  ('4020', 'Late Cancellation Fees','income'),
  -- EXPENSES
  ('5000', 'Cost of Sales — Extensions', 'expense'),
  ('5100', 'Business Expenses',          'expense'),
  ('5110', 'Marketing & Advertising',    'expense'),
  ('5120', 'Equipment & Supplies',       'expense'),
  ('5200', 'Owner''s Draw',             'expense')
ON CONFLICT (code) DO NOTHING;

-- Link parent accounts
UPDATE accounts SET parent_id = (SELECT id FROM accounts WHERE code='5100') WHERE code IN ('5110','5120');
