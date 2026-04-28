-- ============================================================
-- BraidedbyAGB v2 — Real Data Migration from MySQL
-- Converts the phpMyAdmin export to Supabase-compatible SQL.
-- Run in Supabase SQL Editor AFTER migrations 001–006.
-- ============================================================

-- ── 1. Wipe placeholder seed data (dependency order) ─────────
TRUNCATE TABLE booking_addons    CASCADE;
TRUNCATE TABLE payments          CASCADE;
TRUNCATE TABLE bookings          CASCADE;
TRUNCATE TABLE reviews           CASCADE;
TRUNCATE TABLE service_addons    CASCADE;
TRUNCATE TABLE service_variants  CASCADE;
TRUNCATE TABLE services          CASCADE;
TRUNCATE TABLE customers         CASCADE;
TRUNCATE TABLE orders            CASCADE;
TRUNCATE TABLE order_items       CASCADE;

-- Reset only settings that the seed inserted with wrong/placeholder values
DELETE FROM settings WHERE setting_key IN (
  'business_name','business_phone','business_email','business_address',
  'deposit_percent','bank_account_name','bank_sort_code','bank_account_number',
  'admin_email','loyalty_earn_rate','loyalty_redeem_rate','instagram_handle',
  'whatsapp_number','cancellation_hours'
);

-- ── 2. Settings ───────────────────────────────────────────────
INSERT INTO settings (setting_key, setting_value) VALUES
  ('site_name',                        'BraidedbyAGB'),
  ('business_name',                    'BraidedbyAGB'),
  ('site_email',                       'hello@braidedbyagb.co.uk'),
  ('business_email',                   'hello@braidedbyagb.co.uk'),
  ('admin_email',                      'hello@braidedbyagb.co.uk'),
  ('site_phone',                       '07769 064 971'),
  ('business_phone',                   '07769 064 971'),
  ('whatsapp_number',                  '07769064971'),
  ('site_address',                     'Farnborough, Hampshire, UK'),
  ('business_address',                 'Farnborough, Hampshire, UK'),
  ('site_tagline',                     'African Hair Braiding Specialist'),
  ('deposit_percent',                  '30'),
  ('cancellation_hours',               '48'),
  ('late_arrival_mins',                '20'),
  ('bank_account_name',                'BRAIDED BY AGB'),
  ('bank_sort_code',                   '518122'),
  ('bank_account_number',              '93594801'),
  ('bank_transfer_hold_hours',         '24'),
  ('auto_cancel_bank_transfer_hours',  '24'),
  ('booking_buffer_hours',             '2'),
  ('instagram_handle',                 '@BraidedbyAGB'),
  ('instagram_url',                    'https://instagram.com/BraidedbyAGB'),
  ('tiktok_url',                       'https://tiktok.com/BraidedbyAGB'),
  ('facebook_handle',                  ''),
  ('facebook_url',                     ''),
  ('tiktok_handle',                    ''),
  ('review_delay_hours',               '3'),
  ('product_review_delay_days',        '2'),
  ('review_incentive_enabled',         '0'),
  ('review_incentive_type',            'percent'),
  ('review_incentive_value',           '10'),
  ('admin_notify_morning',             '1'),
  ('admin_notify_evening',             '1'),
  ('admin_notify_30min',               '1'),
  ('loyalty_earn_rate',                '1'),
  ('loyalty_redeem_rate',              '100')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- ── 3. Customers ──────────────────────────────────────────────
INSERT INTO customers (id, name, email, phone, email_optin, created_at) OVERRIDING SYSTEM VALUE VALUES
  (1,  'Glory Oloruntoba', 'oloruntobaglorymabel@gmail.com',  '07769064971', true, '2026-02-28 09:24:15+00'),
  (5,  'Tolulope',         'tolu.ao@gmail.com',               '',            true, '2026-03-01 04:57:55+00'),
  (20, 'Tolulope Agboola', 'therealtolu@gmail.com',           '07776736821', true, '2026-03-05 19:52:59+00'),
  (23, 'Glory',            'glorymoloruntoba@gmail.com',      '07769064971', true, '2026-03-18 16:02:16+00'),
  (24, 'Sophie',           'sophie_giles93@hotmail.com',      '',            true, '2026-03-21 15:29:42+00'),
  (26, 'Rianna Soares',    'riannasoares@icloud.com',         '07969866628', true, '2026-03-24 17:57:55+00'),
  (27, 'Ricardo Soares',   'ricardo.soarez@gmail.com',        '07957238446', true, '2026-03-24 17:59:05+00'),
  (28, 'Kamsi Ukandu',     'ukanduc@yahoo.com',               '07988696571', true, '2026-03-29 16:26:41+00'),
  (30, 'Claire Critchley', 'pearldrops06@yahoo.co.uk',        '07775711161', true, '2026-04-20 14:19:45+00'),
  (31, 'Afya Boadiwaa',    'afyaboadiwaaoppong@gmail.com',    '07868187243', true, '2026-04-21 16:15:33+00'),
  (32, 'Jessie Puplampu',  'afuaboadiwaaoppong@gmail.com',    '07868187243', true, '2026-04-21 16:24:50+00'),
  (34, 'Jola Adeyemo',     'adeyemojola0@gmail.com',          '07570863521', true, '2026-04-22 03:56:56+00'),
  (36, 'Krystal Todd',     'krystaltodd@yahood.co.uk',        '07960326388', true, '2026-04-27 12:15:57+00'),
  (37, 'Krystle Todd',     'krstletodd@yahoo.co.uk',          '07960326388', true, '2026-04-27 12:25:21+00');

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- ── 4. Services ───────────────────────────────────────────────
-- Active services (shown on /services page) — slugs corrected from MySQL typos.
-- Inactive services (is_active=false) are included only for FK integrity with
-- historical bookings — they won't appear on the public site.

INSERT INTO services (id, name, slug, description, price_from, duration_mins, category, image_url, prep_notes, is_new, is_active, display_order, created_at) OVERRIDING SYSTEM VALUE VALUES
  -- ── INACTIVE (historical FK integrity only) ──────────────────
  (2,  'Knotless Braids (archived)',     'knotless-braids-archived',
       'A gentler, natural-looking braid starting with your own hair.',
       70.00,  90,  'Braids', NULL, '', false, false, 0, '2026-02-28 12:00:03+00'),
  (15, 'Box Braids (archived)',          'ox-braids',
       'Traditional box braids.',
       70.00,  180, 'Braids', NULL, 'Kindly come with hair washed and detangled.', false, false, 0, '2026-02-28 19:41:04+00'),
  (16, 'Faux Locs (archived)',           'aux-locs',
       'A protective and stylish hairstyle that mimics the look of natural dreadlocks.',
       100.00, 180, 'Locs',   NULL, 'Hair must be washed and detangled.', false, false, 0, '2026-02-28 19:45:53+00'),
  -- ── ACTIVE ───────────────────────────────────────────────────
  (25, 'Island Twists',                  'island-twists',
       'Protective hairstyle made with two-strand twists and curly strands added throughout for a soft, full, and textured finish.',
       65.00,  180, '',         NULL,                                       '',                                    false, true, 1,  '2026-03-05 21:24:17+00'),
  (27, 'French Curls',                   'french-curls',
       'Elegant braids finished with soft, bouncy curls at the ends for a glamorous and flowing look.',
       70.00,  120, 'Braids',   NULL,                                       '',                                    false, true, 2,  '2026-03-05 21:35:44+00'),
  (30, 'Full Head Starter Locs',         'full-head-starter-locs',
       'Complete set of neat twists or interlocks applied to the entire head, creating the foundation for long-lasting, mature locs.',
       100.00, 360, 'Locs',     NULL,                                       '',                                    false, true, 3,  '2026-03-05 21:53:25+00'),
  (32, 'Half-Head Starter Locs',         'half-head-starter-locs',
       'Twists or interlocks applied to part of the head, offering a stylish, protective look while leaving the rest of the hair shaved.',
       90.00,  120, 'Locs',     NULL,                                       '',                                    false, true, 4,  '2026-03-05 23:22:40+00'),
  (35, 'Men''s Braids',                  'mens-braids',
       'Neat, stylish braiding patterns designed to suit different hair lengths and head shapes.',
       30.00,  60,  'Cornrows', '/uploads/services/6eb896141fad8eca.jpeg',  '',                                    false, true, 5,  '2026-03-06 17:56:54+00'),
  (36, 'Faux Locs',                      'faux-locs',
       'A protective and stylish hairstyle that mimics the look of natural dreadlocks without the long-term commitment.',
       90.00,  180, 'Locs',     NULL,                                       '',                                    false, true, 6,  '2026-03-06 18:01:04+00'),
  (37, 'Box Braids',                     'box-braids',
       'Traditional box braids.',
       50.00,  180, 'Braids',   '/uploads/services/42f989e95f9839c9.jpeg',  '',                                    false, true, 7,  '2026-03-06 18:03:49+00'),
  (38, 'Cornrows',                       'cornrows',
       'Straight back or curved lines with natural hair only.',
       25.00,  60,  'Cornrows', '/uploads/services/c731b67b9fd2db7a.jpeg',  '',                                    false, true, 8,  '2026-03-09 03:39:14+00'),
  (39, 'Knotless Braids',                'knotless-braids',
       'A gentler, natural-looking braid starting with your own hair.',
       70.00,  180, 'Braids',   '/uploads/services/bd6a44c703723807.jpeg',  '',                                    false, true, 9,  '2026-03-10 17:08:08+00'),
  (40, 'Boho Braids',                    'boho-braids',
       'Stylish braided look with loose curly strands added throughout for a soft, textured, and effortless finish.',
       65.00,  180, 'Braids',   '/uploads/services/98316008aee8f408.jpeg',  '',                                    false, true, 10, '2026-03-10 17:15:00+00'),
  (41, 'Retwists',                       'retwists',
       'Keep your locs looking fresh, neat, and healthy with a professional retwist.',
       50.00,  120, 'Locs',     NULL,                                       '',                                    false, true, 11, '2026-03-13 07:22:20+00'),
  (42, 'Two Braids',                     'two-braids',
       'A sleek and stylish protective hairstyle featuring two neatly done braids.',
       30.00,  30,  'Cornrows', '/uploads/services/f21f2e40f3e2b9b33.jpeg', '',                                    false, true, 12, '2026-03-13 09:50:51+00'),
  (43, 'Feed-in Braids',                 'feed-in-braids',
       'Feed-in braids are neat, natural-looking cornrows created by gradually adding hair extensions for a smooth and seamless finish.',
       40.00,  120, 'Braids',   '/uploads/services/7c3b665d2e2b9b33.png',   '',                                    false, true, 13, '2026-03-19 19:11:45+00'),
  (44, 'Knotless Braids (Kids)',         'knotless-braids-kids',
       'Knotless braids for kids from age 5–12 (or younger if child can sit well).',
       50.00,  180, 'Braids',   NULL,                                       'Hair must be clean and fully detangled.', false, true, 14, '2026-04-21 16:09:28+00'),
  (45, 'Box Braids (Kids)',              'box-braids-kids',
       'Box braids for kids from age 5–12 (or younger if child can sit well).',
       40.00,  180, 'Braids',   NULL,                                       '',                                    false, true, 15, '2026-04-21 16:19:45+00'),
  (46, 'Half-Cornrows / Half-Knotless', 'half-cornrows-half-knotless',
       'A stylish combination of neat front cornrows with braids at the back.',
       50.00,  180, 'Braids',   '/uploads/services/6fea1fb29a239571.jpeg',  '',                                    false, true, 16, '2026-04-27 11:58:43+00');

SELECT setval('services_id_seq', (SELECT MAX(id) FROM services));

-- ── 5. Service Variants ───────────────────────────────────────
INSERT INTO service_variants (id, service_id, variant_name, price, duration_mins, is_active) OVERRIDING SYSTEM VALUE VALUES
  -- Knotless Braids archived (2)
  (4,   2,  'Medium',                                    65.00,  90,  true),
  (5,   2,  'Small',                                     70.00,  90,  true),
  (16,  2,  'Large',                                     55.00,  90,  true),
  (77,  2,  'Extra small',                               90.00,  90,  true),
  -- Box Braids archived (15)
  (22,  15, 'Small',                                     60.00,  180, true),
  (23,  15, 'Medium',                                    55.00,  180, true),
  (24,  15, 'Large',                                     50.00,  180, true),
  -- Island Twists (25)
  (42,  25, 'Small',                                     95.00,  180, true),
  (43,  25, 'Medium',                                    85.00,  180, true),
  (44,  25, 'Large',                                     65.00,  180, true),
  (79,  25, 'Extra small',                              110.00,  180, true),
  -- French Curls (27)
  (50,  27, 'Small',                                     80.00,  120, true),
  (51,  27, 'Medium',                                    70.00,  120, true),
  -- Full Head Starter Locs (30)
  (58,  30, 'Microlocs',                                250.00,  360, true),
  (59,  30, 'Sisterlocs',                               500.00,  360, true),
  (60,  30, 'Traditional locs',                         150.00,  360, true),
  -- Men's Braids (35)
  (68,  35, 'Cornrows',                                  30.00,   60, true),
  (69,  35, 'Stitch',                                    40.00,   60, true),
  (70,  35, 'Twists',                                    50.00,   60, true),
  (101, 35, 'With extensions added for thickness/length', 40.00,  60, true),
  -- Box Braids (37)
  (71,  37, 'Small',                                     60.00,  180, true),
  (72,  37, 'Medium',                                    55.00,  180, true),
  (73,  37, 'Large',                                     50.00,  180, true),
  -- Cornrows (38)
  (80,  38, 'Underwig straight-lines',                   25.00,   60, true),
  (81,  38, 'Curved or zig-zag',                         35.00,   60, true),
  -- Knotless Braids (39)
  (82,  39, 'Small',                                     70.00,  180, true),
  (83,  39, 'Medium',                                    65.00,  180, true),
  (84,  39, 'Large',                                     55.00,  180, true),
  (85,  39, 'Extra small',                              120.00,  180, true),
  -- Boho Braids (40)
  (86,  40, 'Small',                                     95.00,  180, true),
  (87,  40, 'Medium',                                    85.00,  180, true),
  (88,  40, 'Extra small',                              110.00,  180, true),
  (89,  40, 'Large',                                     65.00,  180, true),
  -- Retwists (41)
  (90,  41, 'Short locs',                                60.00,  120, true),
  (91,  41, 'Medium locs',                               70.00,  120, true),
  (92,  41, 'Long locs',                                 90.00,  120, true),
  -- Two Braids (42)
  (94,  42, 'With extensions added for thickness/length', 40.00,  60, true),
  (95,  42, 'Natural hair only',                         30.00,   30, true),
  -- Feed-in Braids (43)
  (96,  43, 'Straight back',                             40.00,  120, true),
  (97,  43, 'Stitch',                                    50.00,  120, true),
  (98,  43, 'Ponytail (small size)',                     70.00,  120, true),
  (99,  43, 'Ponytail (medium size)',                    55.00,  120, true),
  (100, 43, 'Alicia Keys braids',                        45.00,  120, true),
  -- Knotless Braids Kids (44)
  (102, 44, 'Small',                                     60.00,  180, true),
  (103, 44, 'Medium',                                    50.00,  180, true),
  (104, 44, 'Large',                                     40.00,  180, true),
  -- Box Braids Kids (45)
  (105, 45, 'Small',                                     55.00,  180, true),
  (106, 45, 'Medium',                                    50.00,  180, true),
  (107, 45, 'Large',                                     40.00,  180, true),
  -- Half-Cornrows / Half-Knotless (46)
  (109, 46, 'Small',                                     80.00,  300, true),
  (110, 46, 'Medium',                                    70.00,  240, true),
  (111, 46, 'Large',                                     60.00,  180, true);

SELECT setval('service_variants_id_seq', (SELECT MAX(id) FROM service_variants));

-- ── 6. Service Add-ons ────────────────────────────────────────
INSERT INTO service_addons (id, service_id, name, price, is_active) OVERRIDING SYSTEM VALUE VALUES
  -- Island Twists (25)
  (20,  25, 'Shoulder-length',                        0.00,  true),
  (21,  25, 'Mid-back/bra-length',                   20.00,  true),
  (22,  25, 'Waist-length',                          30.00,  true),
  (23,  25, 'Bum-length',                            40.00,  true),
  (53,  25, 'Wash',                                  10.00,  true),
  (54,  25, 'Blow-dry',                              15.00,  true),
  (72,  25, 'Wash and blow-dry',                     20.00,  true),
  (105, 25, 'Home service (within Farnborough)',     15.00,  true),
  (106, 25, 'Home service (outside Farnborough)',    25.00,  true),
  -- French Curls (27)
  (24,  27, 'Shoulder-length',                        0.00,  true),
  (29,  27, 'Mid-back/bra-length',                   20.00,  true),
  (31,  27, 'Bum-length',                            40.00,  true),
  (32,  27, 'Waist-length',                          30.00,  true),
  (60,  27, 'Wash',                                  10.00,  true),
  (61,  27, 'Blow-dry',                              15.00,  true),
  (74,  27, 'Wash and blow-dry',                     20.00,  true),
  (97,  27, 'Home service (within Farnborough)',     15.00,  true),
  (100, 27, 'Home service (outside Farnborough)',    25.00,  true),
  -- Full Head Starter Locs (30)
  (62,  30, 'Wash',                                  10.00,  true),
  (63,  30, 'Blow-dry',                              15.00,  true),
  (75,  30, 'Wash and blow-dry',                     20.00,  true),
  (111, 30, 'Home service (within Farnborough)',     15.00,  true),
  (112, 30, 'Home service (outside Farnborough)',    25.00,  true),
  -- Half-Head Starter Locs (32)
  (64,  32, 'Wash',                                  10.00,  true),
  (65,  32, 'Blow-dry',                              10.00,  true),
  (76,  32, 'Wash and blow-dry',                     15.00,  true),
  -- Men's Braids (35)
  (50,  35, 'Wash and blow-dry',                     15.00,  true),
  (51,  35, 'Wash',                                  10.00,  true),
  (52,  35, 'Blow-dry',                              10.00,  true),
  (93,  35, 'Extension',                              5.00,  true),
  -- Faux Locs (36)
  (77,  36, 'Wash and blow-dry',                     20.00,  true),
  (78,  36, 'Wash',                                  10.00,  true),
  (79,  36, 'Blow-dry',                              15.00,  true),
  -- Box Braids (37)
  (33,  37, 'Shoulder-length',                        0.00,  true),
  (34,  37, 'Mid-back length',                       20.00,  true),
  (35,  37, 'Waist-length',                          30.00,  true),
  (38,  37, 'Bum-length',                            40.00,  true),
  (66,  37, 'Wash',                                  10.00,  true),
  (67,  37, 'Blow-dry',                              15.00,  true),
  (94,  37, 'Curly ends',                            10.00,  true),
  (103, 37, 'Home service (within Farnborough)',     15.00,  true),
  (104, 37, 'Home service (outside Farnborough)',    25.00,  true),
  -- Cornrows (38)
  (56,  38, 'Wash',                                  10.00,  true),
  (57,  38, 'Blow-dry',                              15.00,  true),
  -- Knotless Braids (39)
  (39,  39, 'Shoulder-length',                        0.00,  true),
  (40,  39, 'Mid-back/bra-length',                   20.00,  true),
  (41,  39, 'Waist-length',                          30.00,  true),
  (42,  39, 'Bum-length',                            40.00,  true),
  (68,  39, 'Wash',                                  10.00,  true),
  (69,  39, 'Blow-dry',                              15.00,  true),
  (95,  39, 'Curly ends',                            10.00,  true),
  (101, 39, 'Home service (within Farnborough)',     15.00,  true),
  (102, 39, 'Home service (outside Farnborough)',    25.00,  true),
  -- Boho Braids (40)
  (44,  40, 'Shoulder-length',                        0.00,  true),
  (45,  40, 'Mid-back/bra-length',                   30.00,  true),
  (46,  40, 'Waist-length',                          50.00,  true),
  (47,  40, 'Bum-length',                            65.00,  true),
  (70,  40, 'Wash',                                  10.00,  true),
  (71,  40, 'Blow-dry',                              15.00,  true),
  (83,  40, 'Wash and blow-dry',                     20.00,  true),
  (98,  40, 'Home service (outside Farnborough)',    25.00,  true),
  -- Retwists (41)
  (48,  41, 'Styling',                               15.00,  true),
  (49,  41, 'Wash',                                  10.00,  true),
  (107, 41, 'Home service (within Farnborough)',     15.00,  true),
  (108, 41, 'Home service (outside Farnborough)',    25.00,  true),
  -- Two Braids (42)
  (80,  42, 'Wash and blow-dry',                     20.00,  true),
  (81,  42, 'Wash',                                  10.00,  true),
  (82,  42, 'Blow-dry',                              15.00,  true),
  (92,  42, 'Extension',                              5.00,  true),
  -- Feed-in Braids (43)
  (85,  43, 'Shoulder-length',                        0.00,  true),
  (86,  43, 'Mid-back/bra-length',                   20.00,  true),
  (87,  43, 'Waist-length',                          30.00,  true),
  (88,  43, 'Bum-length',                            40.00,  true),
  (89,  43, 'Wash',                                  10.00,  true),
  (90,  43, 'Blow-dry',                              15.00,  true),
  (91,  43, 'Wash and blow-dry',                     20.00,  true),
  (96,  43, 'Curly ends',                            10.00,  true),
  (109, 43, 'Home service (within Farnborough)',     15.00,  true),
  (110, 43, 'Home service (outside Farnborough)',    25.00,  true),
  -- Knotless Braids Kids (44)
  (113, 44, 'Curly ends',                            10.00,  true),
  (114, 44, 'Shoulder-length',                        0.00,  true),
  (115, 44, 'Mid-back',                              10.00,  true),
  (116, 44, 'Waist-length',                          20.00,  true),
  -- Box Braids Kids (45)
  (117, 45, 'Curly ends',                            10.00,  true),
  (118, 45, 'Waist-length',                          20.00,  true),
  (119, 45, 'Shoulder-length',                        0.00,  true),
  (120, 45, 'Mid-back',                              10.00,  true),
  -- Half-Cornrows / Half-Knotless (46)
  (121, 46, 'Curly ends',                            10.00,  true),
  (122, 46, 'Shoulder-length',                        0.00,  true),
  (123, 46, 'Waist-length',                          30.00,  true),
  (124, 46, 'Mid-back',                              20.00,  true);

SELECT setval('service_addons_id_seq', (SELECT MAX(id) FROM service_addons));

-- ── 7. Bookings ───────────────────────────────────────────────
-- MySQL status '' → 'pending'. Booking 21 (£1595 test) excluded.
INSERT INTO bookings (
  id, booking_ref, customer_id, service_id, variant_id,
  booked_date, booked_time, status, payment_method,
  deposit_amount, deposit_paid, total_price, remaining_balance,
  client_notes, admin_notes, payment_token, payment_method_allowed,
  is_archived, reminder_24_sent, reminder_2_sent, review_request_sent,
  admin_reminder_30_sent, policy_accepted, created_at, updated_at
) OVERRIDING SYSTEM VALUE VALUES
  (1,  'AGB-2026-000',      1,  2,   4,   '2026-02-28','11:30:00','pending',   'bank_transfer',46.50, false,155.00, 108.50,'',                                                                        NULL,'',                                               'both',false,false,false,false,false,true,'2026-02-28 09:24:15+00','2026-03-05 18:24:27+00'),
  (19, 'AGB-2026-00021A',  20,  15,  22,  '2026-03-11','11:00:00','pending',   'bank_transfer',27.00, true, 90.00,  63.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-05 19:52:59+00','2026-03-19 11:37:48+00'),
  (20, 'AGB-2026-002020',   1,  16,  NULL,'2026-03-12','17:00:00','pending',   'bank_transfer',30.00, false,100.00, 70.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-05 20:03:19+00','2026-03-05 20:17:24+00'),
  (22, 'AGB202600022761',  23,  41,  91,  '2026-03-25','10:00:00','pending',   'bank_transfer',21.00, true, 70.00,  49.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-18 16:02:16+00','2026-03-19 11:38:51+00'),
  (23, 'AGB202600023321',  20,  25,  42,  '2026-03-19','16:30:00','pending',   'stripe',       43.50, false,145.00,101.50, NULL,                                                                      NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-19 10:35:35+00','2026-03-19 11:37:38+00'),
  (24, 'AGB202600024966',  20,  25,  43,  '2026-03-20','16:00:00','pending',   'stripe',       48.00, false,160.00,112.00, NULL,                                                                      NULL,'8002d9cda36e0e158c56d090d2a2ebf2','both',false,false,false,false,false,true,'2026-03-19 11:19:15+00','2026-03-19 11:37:28+00'),
  (25, 'AGB202600025479',  26,  42,  94,  '2026-03-27','18:00:00','pending',   'bank_transfer',13.50, false,45.00,  31.50, 'Kindly upload receipt and share via WhatsApp',                            NULL,'7c61964c9b7bbda35b3bfdbf20926f86','both',false,false,false,false,false,true,'2026-03-24 17:57:55+00','2026-03-25 04:33:37+00'),
  (26, 'AGB202600026076',  27,  42,  94,  '2026-03-27','17:30:00','confirmed', 'stripe',       16.50, true, 55.00,  38.50, 'App for daughter.',                                                       NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-24 17:59:05+00','2026-03-25 04:34:11+00'),
  (27, 'AGB202600027272',  28,  27,  51,  '2026-03-30','09:30:00','pending',   'bank_transfer',30.00, true, 100.00, 70.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-29 16:26:41+00','2026-03-29 16:32:27+00'),
  (28, 'AGB202600028356',  28,  27,  51,  '2026-03-29','09:30:00','confirmed', 'bank_transfer',30.00, true, 100.00, 70.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-03-29 16:49:13+00','2026-03-29 16:52:55+00'),
  (29, 'AGB202600029472',  30,  38,  81,  '2026-04-29','10:00:00','pending',   'stripe',       10.50, true, 35.00,  24.50, 'It''s for my son, he has hair just below his shoulders, he will be 10',  NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-04-20 14:19:45+00','2026-04-20 14:38:07+00'),
  (30, 'AGB202600030394',  31,  44,  103, '2026-05-01','17:00:00','pending',   'bank_transfer',15.00, false,50.00,  35.00, NULL,                                                                      NULL,'d11d9b0a0b98716a7bedbc9aadc43b76','both',false,false,false,false,false,true,'2026-04-21 16:15:33+00','2026-04-21 16:25:58+00'),
  (31, 'AGB202600031347',   1,  45,  NULL,'2026-04-23','09:30:00','pending',   'bank_transfer',12.00, false,40.00,  28.00, NULL,                                                                      NULL,'50dd7b6c3c0f114bd82b696cc6595ec0','both',false,false,false,false,false,true,'2026-04-21 16:21:44+00','2026-04-21 16:25:44+00'),
  (32, 'AGB202600032236',  32,  44,  NULL,'2026-05-01','17:00:00','pending',   'bank_transfer',15.00, false,50.00,  35.00, NULL,                                                                      NULL,'640d834adf32123b1094e2efe6e06dde','both',false,false,false,false,false,true,'2026-04-21 16:24:50+00','2026-04-21 16:36:03+00'),
  (33, 'AGB202600033557',  32,  44,  103, '2026-04-30','17:00:00','confirmed', 'stripe',       15.00, true, 50.00,  35.00, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-04-21 16:31:12+00','2026-04-21 16:33:21+00'),
  (34, 'AGB202600034909',  34,  41,  90,  '2026-04-29','15:00:00','confirmed', 'bank_transfer',22.50, true, 75.00,  52.50, NULL,                                                                      NULL,'8066bc832839e2804d3ef1084711ef65','both',false,false,false,false,false,true,'2026-04-22 03:56:56+00','2026-04-22 04:34:22+00'),
  (35, 'AGB202600035592',   1,  41,  90,  '2026-04-29','10:00:00','pending',   'bank_transfer',22.50, false,75.00,  52.50, NULL,                                                                      NULL,'15768caf32d0357801a5bdcae370053f','both',false,false,false,false,false,true,'2026-04-22 04:15:22+00','2026-04-22 04:35:28+00'),
  (36, 'AGB202600036806',  34,  41,  90,  '2026-04-28','15:00:00','pending',   'stripe',       22.50, true, 75.00,  52.50, '',                                                                        NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-04-22 04:27:14+00','2026-04-22 04:36:00+00'),
  (37, 'AGB202600037455',   1,  25,  NULL,'2026-04-25','11:30:00','pending',   'bank_transfer',19.50, false,65.00,  45.50, NULL,                                                                      NULL,'f9a69434cd79734539dbe1a0898529c5','both',false,false,false,false,false,true,'2026-04-25 02:56:48+00','2026-04-25 17:37:45+00'),
  (38, 'AGB202600038715',  36,  46,  110, '2026-05-22','17:00:00','pending',   'bank_transfer',15.00, false,50.00,  35.00, 'Cornrows in front, loose braids at the back. Natural hair only.',         NULL,'0a3d3f28526a2c9f37b14694ca2c1a2f','both',false,false,false,false,false,true,'2026-04-27 12:15:57+00','2026-04-27 12:22:03+00'),
  (39, 'AGB202600039632',  37,  46,  110, '2026-05-22','17:00:00','pending',   'bank_transfer',15.00, false,50.00,  35.00, 'Cornrows in front and loose braids at the back. With natural hair only.',NULL,'f9843536b450b11bbd0f09c1c587d878','both',false,false,false,false,false,true,'2026-04-27 12:25:21+00','2026-04-27 13:05:50+00'),
  (40, 'AGB202600040468',  37,  46,  NULL,'2026-05-22','10:30:00','confirmed', 'stripe',       15.00, true, 50.00,  35.00, 'Cornrow in front, loose braids at the back. Natural hair only.',          NULL,NULL,                                             'both',false,false,false,false,false,true,'2026-04-27 13:05:40+00','2026-04-27 13:30:44+00');

SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));

-- ── 8. Booking Add-ons ────────────────────────────────────────
INSERT INTO booking_addons (id, booking_id, addon_id, price_charged) OVERRIDING SYSTEM VALUE VALUES
  (3,  23, 20,  0.00),   -- booking 23, shoulder-length (island twists)
  (4,  23, 22,  50.00),  -- booking 23, waist-length
  (5,  24, 20,  0.00),   -- booking 24, shoulder-length
  (6,  24, 22,  50.00),  -- booking 24, waist-length
  (7,  24, 53,  10.00),  -- booking 24, wash
  (8,  24, 54,  15.00),  -- booking 24, blow-dry
  (9,  25, 92,  5.00),   -- booking 25, extension (two braids)
  (10, 26, 82,  15.00),  -- booking 26, blow-dry (two braids)
  (11, 27, 29,  30.00),  -- booking 27, mid-back/bra-length (french curls)
  (12, 28, 29,  30.00),  -- booking 28, mid-back/bra-length
  (13, 30, 114, 0.00),   -- booking 30, shoulder-length (kids knotless)
  (14, 32, 114, 0.00),   -- booking 32, shoulder-length
  (15, 34, 107, 15.00),  -- booking 34, home service within Farnborough (retwists)
  (16, 35, 107, 15.00),  -- booking 35, home service within Farnborough
  (17, 36, 107, 15.00),  -- booking 36, home service within Farnborough
  (18, 37, 20,  0.00),   -- booking 37, shoulder-length (island twists)
  (19, 38, 122, 0.00),   -- booking 38, shoulder-length (half-cornrows)
  (20, 39, 122, 0.00),   -- booking 39, shoulder-length
  (21, 40, 122, 0.00);   -- booking 40, shoulder-length

SELECT setval('booking_addons_id_seq', (SELECT MAX(id) FROM booking_addons));

-- ── 9. Payments ───────────────────────────────────────────────
-- Excluded: payments 4 & 8 (linked to booking 21 — test data)
INSERT INTO payments (id, booking_id, stripe_id, amount, type, method, status, confirmed_by, confirmed_at, created_at) OVERRIDING SYSTEM VALUE VALUES
  (1,  1,  NULL,                            46.50, 'deposit', 'bank_transfer', 'pending',   NULL,             NULL,                     '2026-02-28 09:24:15+00'),
  (2,  19, NULL,                            27.00, 'deposit', 'bank_transfer', 'succeeded', 'admin',          '2026-03-05 20:00:37+00', '2026-03-05 19:52:59+00'),
  (3,  20, NULL,                            30.00, 'deposit', 'bank_transfer', 'pending',   NULL,             NULL,                     '2026-03-05 20:03:19+00'),
  (5,  22, NULL,                            21.00, 'deposit', 'bank_transfer', 'succeeded', 'admin',          '2026-03-18 16:10:04+00', '2026-03-18 16:02:16+00'),
  (6,  26, 'pi_3TEcyZPRIZjOv17l1HMo2guT',  16.50, 'deposit', 'stripe',        'succeeded', 'stripe_webhook', '2026-03-24 21:59:05+00', '2026-03-24 17:59:05+00'),
  (7,  27, NULL,                            30.00, 'deposit', 'bank_transfer', 'succeeded', 'admin',          '2026-03-29 16:29:51+00', '2026-03-29 16:26:41+00'),
  (8,  28, NULL,                            30.00, 'deposit', 'bank_transfer', 'succeeded', 'admin',          '2026-03-29 16:52:55+00', '2026-03-29 16:49:13+00'),
  (9,  29, 'pi_3TOMQ6PRIZjOv17l0hSZfFmT',  10.50, 'deposit', 'stripe',        'succeeded', 'stripe_webhook', '2026-04-20 18:19:45+00', '2026-04-20 14:19:45+00'),
  (10, 33, 'pi_3TOkwrPRIZjOv17l0zcXwvYy',  15.00, 'deposit', 'stripe',        'succeeded', 'stripe_webhook', '2026-04-21 20:31:12+00', '2026-04-21 16:31:12+00'),
  (11, 36, 'pi_3TOw7nPRIZjOv17l09kA30pD',  22.50, 'deposit', 'stripe',        'succeeded', 'stripe_webhook', '2026-04-22 08:27:14+00', '2026-04-22 04:27:14+00'),
  (12, 40, 'pi_3TQszVPRIZjOv17l0wjSdlgD',  15.00, 'deposit', 'stripe',        'succeeded', 'stripe_webhook', '2026-04-27 13:30:44+00', '2026-04-27 13:30:44+00');

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));

-- ── 10. Reviews (2 approved) ──────────────────────────────────
INSERT INTO reviews (id, customer_id, booking_id, service_id, client_name, rating, review_text, status, created_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 5,  NULL, NULL, 'Tolulope', 4, 'Very professional and detailed.',
   'approved', '2026-03-01 04:57:55+00'),
  (2, 24, NULL, NULL, 'Sophie',   5, 'Very good price, Very professional. My child and husband love their hair, definitely booking again. Thankyou soo much x',
   'approved', '2026-03-21 15:29:42+00');

SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));

-- ── Done — verify row counts ──────────────────────────────────
SELECT 'customers'      AS tbl, COUNT(*) FROM customers
UNION ALL SELECT 'services',       COUNT(*) FROM services      WHERE is_active = true
UNION ALL SELECT 'services (all)', COUNT(*) FROM services
UNION ALL SELECT 'service_variants',COUNT(*) FROM service_variants
UNION ALL SELECT 'service_addons', COUNT(*) FROM service_addons
UNION ALL SELECT 'bookings',       COUNT(*) FROM bookings
UNION ALL SELECT 'booking_addons', COUNT(*) FROM booking_addons
UNION ALL SELECT 'payments',       COUNT(*) FROM payments
UNION ALL SELECT 'reviews',        COUNT(*) FROM reviews;
-- Expected: 14 / 16 / 19 / 54 / 84 / 21 / 19 / 11 / 2
