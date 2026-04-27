-- ============================================================
-- BraidedbyAGB v2 — CRM Schema
-- Run after 002_accounting.sql
-- ============================================================

-- ── Loyalty Transactions ─────────────────────────────────────
CREATE TABLE loyalty_transactions (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('earn','redeem','manual_add','manual_remove','expire')),
  points      INTEGER NOT NULL,   -- positive = add, negative = remove
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loyalty_customer ON loyalty_transactions (customer_id);
CREATE INDEX idx_loyalty_booking  ON loyalty_transactions (booking_id);
CREATE INDEX idx_loyalty_type     ON loyalty_transactions (type);

-- ── Customer Admin Notes ──────────────────────────────────────
CREATE TABLE customer_notes (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes (customer_id);

-- ── Customer Auth (Supabase magic-link login) ─────────────────
-- Links a Supabase Auth user to a customer record
CREATE TABLE customer_auth (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  auth_user_id UUID NOT NULL UNIQUE,  -- auth.users.id from Supabase Auth
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_auth_user ON customer_auth (auth_user_id);

-- ── Email Log ─────────────────────────────────────────────────
-- Records every transactional email sent via Resend
CREATE TABLE email_log (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  resend_id   TEXT,               -- Resend message ID for tracking
  to_email    TEXT NOT NULL,
  subject     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN (
                'booking_confirmation',
                'booking_reminder_24h',
                'booking_reminder_2h',
                'deposit_receipt',
                'balance_receipt',
                'invoice',
                'cancellation',
                'late_cancellation',
                'loyalty_points',
                'loyalty_expiry_warning',
                'magic_link',
                'review_request',
                'order_confirmation',
                'order_shipped',
                'newsletter',
                'admin_daily_brief',
                'admin_evening_preview',
                'admin_30min_alert',
                'custom'
              )),
  booking_id  INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  order_id    INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_log_customer ON email_log (customer_id);
CREATE INDEX idx_email_log_type     ON email_log (type);
CREATE INDEX idx_email_log_sent     ON email_log (sent_at DESC);

-- ── Consultation / Intake Questions ──────────────────────────
-- Admin attaches custom pre-booking questions to a service
CREATE TABLE consultation_questions (
  id             SERIAL PRIMARY KEY,
  service_id     INTEGER REFERENCES services(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  input_type     TEXT NOT NULL DEFAULT 'text'
                   CHECK (input_type IN ('text','textarea','select','checkbox','radio')),
  options        TEXT[],            -- for select / radio / checkbox options
  is_required    BOOLEAN DEFAULT FALSE,
  display_order  INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Consultation Answers ──────────────────────────────────────
-- Client answers stored per booking
CREATE TABLE consultation_answers (
  id              SERIAL PRIMARY KEY,
  booking_id      INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES consultation_questions(id) ON DELETE CASCADE,
  answer_text     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, question_id)
);

-- ── Waitlist ──────────────────────────────────────────────────
CREATE TABLE waitlist (
  id           SERIAL PRIMARY KEY,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  service_id   INTEGER REFERENCES services(id) ON DELETE CASCADE,
  desired_date DATE NOT NULL,
  notified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_date    ON waitlist (desired_date);
CREATE INDEX idx_waitlist_service ON waitlist (service_id);

-- ── Portfolio (Before & After photos) ────────────────────────
CREATE TABLE portfolio_items (
  id             SERIAL PRIMARY KEY,
  service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,
  before_url     TEXT,
  after_url      TEXT NOT NULL,
  caption        TEXT,
  is_published   BOOLEAN DEFAULT FALSE,
  display_order  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Booking Activity Log ──────────────────────────────────────
-- Timestamped notes / status changes on a booking
CREATE TABLE booking_activity (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  actor      TEXT NOT NULL DEFAULT 'admin',   -- 'admin' | 'system' | 'customer'
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_activity ON booking_activity (booking_id);

-- ── RLS Policies: allow service role full access ─────────────
-- (Supabase service_role key bypasses RLS by default;
--  these policies allow the anon/authenticated roles for the customer portal)

ALTER TABLE loyalty_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_auth            ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_answers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_activity         ENABLE ROW LEVEL SECURITY;

-- Portfolio items: anyone can read published ones
CREATE POLICY "portfolio_public_read"
  ON portfolio_items FOR SELECT
  USING (is_published = TRUE);

-- Consultation questions: anyone can read active ones (needed during booking)
CREATE POLICY "consultation_questions_public_read"
  ON consultation_questions FOR SELECT
  USING (is_active = TRUE);

-- Customers can read/write their own loyalty transactions
CREATE POLICY "loyalty_own_read"
  ON loyalty_transactions FOR SELECT
  USING (
    customer_id = (
      SELECT customer_id FROM customer_auth
      WHERE auth_user_id = auth.uid()
    )
  );

-- Customers can read their own answers
CREATE POLICY "consultation_answers_own_read"
  ON consultation_answers FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customer_auth ca ON ca.customer_id = b.customer_id
      WHERE ca.auth_user_id = auth.uid()
    )
  );
