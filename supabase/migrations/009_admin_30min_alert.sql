-- 009_admin_30min_alert.sql
-- Add 30-minute pre-appointment reminder tracking to bookings.
-- Add settings keys for evening preview and 30-min alert.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS admin_reminder_30_sent BOOLEAN DEFAULT FALSE;

-- Settings keys for admin cron notifications
INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_evening_preview_last_sent', '')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_notify_morning', 'true')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_notify_evening', 'true')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO settings (setting_key, setting_value)
VALUES ('admin_notify_30min', 'true')
ON CONFLICT (setting_key) DO NOTHING;
