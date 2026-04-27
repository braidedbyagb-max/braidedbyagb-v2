-- 005_reminder_columns.sql
-- Add reminder tracking columns to bookings table

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_2h_sent  BOOLEAN DEFAULT FALSE;

-- Add admin_email to settings (if not already seeded)
INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_email', '')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_morning_brief_last_sent', '')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('loyalty_redeem_rate', '100')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('loyalty_earn_rate', '1')
ON CONFLICT (setting_key) DO NOTHING;

-- Cron secret for /api/cron/reminders
INSERT INTO settings (setting_key, setting_value)
VALUES ('cron_secret', '')
ON CONFLICT (setting_key) DO NOTHING;
