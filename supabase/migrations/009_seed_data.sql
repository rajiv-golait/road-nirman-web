-- ============================================================
-- SSR SYSTEM — MIGRATION 009: SEED DATA
-- Solapur Smart Roads — रोड NIRMAN
-- ============================================================
-- Demo accounts, zone polygon approximations, and 50 test tickets
-- across all 8 zones using real Solapur road corridor names.
-- ============================================================


-- ============================================================
-- 9A: NON-OVERLAPPING ZONE BOUNDARIES (2×4 grid tiling)
-- City bounds: lng 75.875–75.950, lat 17.640–17.715
-- Split into 2 columns at lng 75.9125, 4 rows at lat intervals of 0.01875
-- WEST column: Z7 (NW), Z1 (CW), Z2 (SW), Z8 (SSW)
-- EAST column: Z5 (NE), Z3 (CE), Z4 (SE), Z6 (SSE)
-- ZERO OVERLAP between any two zones.
-- Production: replace with official SMC GIS shapefiles.
-- ============================================================

-- West column: lng 75.875 – 75.9125
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.69625, 75.9125 17.69625, 75.9125 17.715, 75.875 17.715, 75.875 17.69625))'),
  centroid_lat = 17.70563, centroid_lng = 75.89375 WHERE id = 7;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.6775, 75.9125 17.6775, 75.9125 17.69625, 75.875 17.69625, 75.875 17.6775))'),
  centroid_lat = 17.68688, centroid_lng = 75.89375 WHERE id = 1;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.65875, 75.9125 17.65875, 75.9125 17.6775, 75.875 17.6775, 75.875 17.65875))'),
  centroid_lat = 17.66813, centroid_lng = 75.89375 WHERE id = 2;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.640, 75.9125 17.640, 75.9125 17.65875, 75.875 17.65875, 75.875 17.640))'),
  centroid_lat = 17.64938, centroid_lng = 75.89375 WHERE id = 8;

-- East column: lng 75.9125 – 75.950
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.69625, 75.950 17.69625, 75.950 17.715, 75.9125 17.715, 75.9125 17.69625))'),
  centroid_lat = 17.70563, centroid_lng = 75.93125 WHERE id = 5;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.6775, 75.950 17.6775, 75.950 17.69625, 75.9125 17.69625, 75.9125 17.6775))'),
  centroid_lat = 17.68688, centroid_lng = 75.93125 WHERE id = 3;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.65875, 75.950 17.65875, 75.950 17.6775, 75.9125 17.6775, 75.9125 17.65875))'),
  centroid_lat = 17.66813, centroid_lng = 75.93125 WHERE id = 4;
UPDATE zones SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.640, 75.950 17.640, 75.950 17.65875, 75.9125 17.65875, 75.9125 17.640))'),
  centroid_lat = 17.64938, centroid_lng = 75.93125 WHERE id = 6;


-- ============================================================
-- 9A-2: NON-OVERLAPPING PRABHAG BOUNDARIES
-- Each zone rectangle is split into 3 or 4 horizontal strips.
-- Prabhag strips share exact edge coordinates with parent zone
-- and adjacent prabhags — no gaps, no overlaps.
-- ============================================================

-- Zone 1 (CW): lat 17.6775–17.69625, lng 75.875–75.9125 → 3 strips (height=0.00625)
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.6775, 75.9125 17.6775, 75.9125 17.68375, 75.875 17.68375, 75.875 17.6775))') WHERE id = 1;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.68375, 75.9125 17.68375, 75.9125 17.69, 75.875 17.69, 75.875 17.68375))') WHERE id = 2;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.69, 75.9125 17.69, 75.9125 17.69625, 75.875 17.69625, 75.875 17.69))') WHERE id = 3;

-- Zone 2 (SW): lat 17.65875–17.6775, lng 75.875–75.9125 → 3 strips
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.65875, 75.9125 17.65875, 75.9125 17.665, 75.875 17.665, 75.875 17.65875))') WHERE id = 4;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.665, 75.9125 17.665, 75.9125 17.67125, 75.875 17.67125, 75.875 17.665))') WHERE id = 5;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.67125, 75.9125 17.67125, 75.9125 17.6775, 75.875 17.6775, 75.875 17.67125))') WHERE id = 6;

-- Zone 3 (CE): lat 17.6775–17.69625, lng 75.9125–75.950 → 3 strips
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.6775, 75.950 17.6775, 75.950 17.68375, 75.9125 17.68375, 75.9125 17.6775))') WHERE id = 7;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.68375, 75.950 17.68375, 75.950 17.69, 75.9125 17.69, 75.9125 17.68375))') WHERE id = 8;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.69, 75.950 17.69, 75.950 17.69625, 75.9125 17.69625, 75.9125 17.69))') WHERE id = 9;

-- Zone 4 (SE): lat 17.65875–17.6775, lng 75.9125–75.950 → 3 strips
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.65875, 75.950 17.65875, 75.950 17.665, 75.9125 17.665, 75.9125 17.65875))') WHERE id = 10;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.665, 75.950 17.665, 75.950 17.67125, 75.9125 17.67125, 75.9125 17.665))') WHERE id = 11;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.67125, 75.950 17.67125, 75.950 17.6775, 75.9125 17.6775, 75.9125 17.67125))') WHERE id = 12;

-- Zone 5 (NE): lat 17.69625–17.715, lng 75.9125–75.950 → 3 strips
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.69625, 75.950 17.69625, 75.950 17.7025, 75.9125 17.7025, 75.9125 17.69625))') WHERE id = 13;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.7025, 75.950 17.7025, 75.950 17.70875, 75.9125 17.70875, 75.9125 17.7025))') WHERE id = 14;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.70875, 75.950 17.70875, 75.950 17.715, 75.9125 17.715, 75.9125 17.70875))') WHERE id = 15;

-- Zone 6 (SSE): lat 17.640–17.65875, lng 75.9125–75.950 → 3 strips
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.640, 75.950 17.640, 75.950 17.64625, 75.9125 17.64625, 75.9125 17.640))') WHERE id = 16;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.64625, 75.950 17.64625, 75.950 17.6525, 75.9125 17.6525, 75.9125 17.64625))') WHERE id = 17;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.9125 17.6525, 75.950 17.6525, 75.950 17.65875, 75.9125 17.65875, 75.9125 17.6525))') WHERE id = 18;

-- Zone 7 (NW): lat 17.69625–17.715, lng 75.875–75.9125 → 4 strips (height≈0.0047)
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.69625, 75.9125 17.69625, 75.9125 17.70094, 75.875 17.70094, 75.875 17.69625))') WHERE id = 19;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.70094, 75.9125 17.70094, 75.9125 17.70563, 75.875 17.70563, 75.875 17.70094))') WHERE id = 20;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.70563, 75.9125 17.70563, 75.9125 17.71031, 75.875 17.71031, 75.875 17.70563))') WHERE id = 21;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.71031, 75.9125 17.71031, 75.9125 17.715, 75.875 17.715, 75.875 17.71031))') WHERE id = 22;

-- Zone 8 (SSW): lat 17.640–17.65875, lng 75.875–75.9125 → 4 strips (height≈0.0047)
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.640, 75.9125 17.640, 75.9125 17.64469, 75.875 17.64469, 75.875 17.640))') WHERE id = 23;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.64469, 75.9125 17.64469, 75.9125 17.64938, 75.875 17.64938, 75.875 17.64469))') WHERE id = 24;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.64938, 75.9125 17.64938, 75.9125 17.65406, 75.875 17.65406, 75.875 17.64938))') WHERE id = 25;
UPDATE prabhags SET boundary = ST_GeogFromText('SRID=4326;POLYGON((75.875 17.65406, 75.9125 17.65406, 75.9125 17.65875, 75.875 17.65875, 75.875 17.65406))') WHERE id = 26;


-- ============================================================
-- 9A-3: OVERLAP VALIDATION (run after seeding to confirm correctness)
-- This query MUST return 0 rows. If it returns anything, polygons overlap.
-- ============================================================
-- DO $$
-- DECLARE v_overlaps INT;
-- BEGIN
--   SELECT COUNT(*) INTO v_overlaps
--   FROM zones z1, zones z2
--   WHERE z1.id < z2.id
--     AND z1.boundary IS NOT NULL AND z2.boundary IS NOT NULL
--     AND ST_Intersects(z1.boundary::geometry, z2.boundary::geometry)
--     AND NOT ST_Touches(z1.boundary::geometry, z2.boundary::geometry);
--   IF v_overlaps > 0 THEN
--     RAISE EXCEPTION 'SEED ERROR: % zone boundary overlaps detected!', v_overlaps;
--   END IF;
-- END $$;


-- ============================================================
-- 9B: DEMO USER ACCOUNTS
-- Note: In production, users are created via Supabase Auth (OTP).
-- For demo, we create auth.users entries + profiles.
-- Run the Supabase Auth API to create these users, then seed profiles.
-- ============================================================

-- DEMO PROFILE SEED (run AFTER creating auth users via Supabase dashboard or API)
-- These INSERT statements assume auth.users already exist with matching UUIDs.
-- For hackathon setup: create users via Supabase Dashboard → Authentication → Users

/*
Demo Credentials (create in Supabase Auth Dashboard):
  citizen@ssr.demo        / Demo@SSR2025   → role: citizen
  je.zone1@ssr.demo       / Demo@SSR2025   → role: je, zone 1
  je.zone2@ssr.demo       / Demo@SSR2025   → role: je, zone 2
  je.zone3@ssr.demo       / Demo@SSR2025   → role: je, zone 3
  je.zone4@ssr.demo       / Demo@SSR2025   → role: je, zone 4
  je.zone5@ssr.demo       / Demo@SSR2025   → role: je, zone 5
  je.zone6@ssr.demo       / Demo@SSR2025   → role: je, zone 6
  je.zone7@ssr.demo       / Demo@SSR2025   → role: je, zone 7
  je.zone8@ssr.demo       / Demo@SSR2025   → role: je, zone 8
  de.zone4@ssr.demo       / Demo@SSR2025   → role: de, zone 4
  contractor.z4@ssr.demo  / Demo@SSR2025   → role: contractor, zone 4
  zo.zone4@ssr.demo       / Demo@SSR2025   → role: assistant_commissioner, zone 4
  cityengineer@ssr.demo   / Demo@SSR2025   → role: city_engineer
  commissioner@ssr.demo   / Demo@SSR2025   → role: commissioner
  accounts@ssr.demo       / Demo@SSR2025   → role: accounts
  superadmin@ssr.demo     / Demo@SSR2025   → role: super_admin
*/

-- Helper function to create demo profiles after auth users exist
CREATE OR REPLACE FUNCTION fn_seed_demo_profiles()
RETURNS void AS $$
DECLARE
  v_citizen_id UUID;
  v_je1_id UUID; v_je2_id UUID; v_je3_id UUID; v_je4_id UUID;
  v_je5_id UUID; v_je6_id UUID; v_je7_id UUID; v_je8_id UUID;
  v_de4_id UUID; v_contractor_id UUID; v_zo4_id UUID;
  v_ce_id UUID; v_comm_id UUID; v_acct_id UUID; v_admin_id UUID;
BEGIN
  -- Look up auth.users by email to get UUIDs
  SELECT id INTO v_citizen_id FROM auth.users WHERE email = 'citizen@ssr.demo';
  SELECT id INTO v_je1_id FROM auth.users WHERE email = 'je.zone1@ssr.demo';
  SELECT id INTO v_je2_id FROM auth.users WHERE email = 'je.zone2@ssr.demo';
  SELECT id INTO v_je3_id FROM auth.users WHERE email = 'je.zone3@ssr.demo';
  SELECT id INTO v_je4_id FROM auth.users WHERE email = 'je.zone4@ssr.demo';
  SELECT id INTO v_je5_id FROM auth.users WHERE email = 'je.zone5@ssr.demo';
  SELECT id INTO v_je6_id FROM auth.users WHERE email = 'je.zone6@ssr.demo';
  SELECT id INTO v_je7_id FROM auth.users WHERE email = 'je.zone7@ssr.demo';
  SELECT id INTO v_je8_id FROM auth.users WHERE email = 'je.zone8@ssr.demo';
  SELECT id INTO v_de4_id FROM auth.users WHERE email = 'de.zone4@ssr.demo';
  SELECT id INTO v_contractor_id FROM auth.users WHERE email = 'contractor.z4@ssr.demo';
  SELECT id INTO v_zo4_id FROM auth.users WHERE email = 'zo.zone4@ssr.demo';
  SELECT id INTO v_ce_id FROM auth.users WHERE email = 'cityengineer@ssr.demo';
  SELECT id INTO v_comm_id FROM auth.users WHERE email = 'commissioner@ssr.demo';
  SELECT id INTO v_acct_id FROM auth.users WHERE email = 'accounts@ssr.demo';
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'superadmin@ssr.demo';

  -- Insert profiles (skip if user doesn't exist yet)
  IF v_citizen_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role) VALUES
      (v_citizen_id, 'Ramesh Patil', '9876543210', 'citizen') ON CONFLICT DO NOTHING;
  END IF;

  IF v_je1_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je1_id, 'Suresh Jadhav', '9876543211', 'je', 1, 'SMC-JE-101', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je2_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je2_id, 'Manoj Kulkarni', '9876543212', 'je', 2, 'SMC-JE-201', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je3_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je3_id, 'Anil Deshmukh', '9876543213', 'je', 3, 'SMC-JE-301', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je4_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je4_id, 'Prashant Mane', '9876543214', 'je', 4, 'SMC-JE-401', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je5_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je5_id, 'Vikas Shinde', '9876543215', 'je', 5, 'SMC-JE-501', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je6_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je6_id, 'Santosh Bhor', '9876543216', 'je', 6, 'SMC-JE-601', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je7_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je7_id, 'Rajesh Pawar', '9876543217', 'je', 7, 'SMC-JE-701', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;
  IF v_je8_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_je8_id, 'Ganesh Kale', '9876543218', 'je', 8, 'SMC-JE-801', 'Junior Engineer') ON CONFLICT DO NOTHING;
  END IF;

  IF v_de4_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_de4_id, 'Sanjay Raut', '9876543219', 'de', 4, 'SMC-DE-401', 'Deputy Engineer') ON CONFLICT DO NOTHING;
  END IF;

  IF v_contractor_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id) VALUES
      (v_contractor_id, 'S.S. Ekbote', '9876543220', 'contractor', 4) ON CONFLICT DO NOTHING;
    INSERT INTO contractors (id, company_name, company_name_marathi, gst_number, zone_ids, contract_start, contract_end) VALUES
      (v_contractor_id, 'S.S. Ekbote Construction', 'एस.एस. एकबोटे कन्स्ट्रक्शन', '27AABCE1234F1ZP', ARRAY[4,5], '2025-04-01', '2026-03-31') ON CONFLICT DO NOTHING;
  END IF;

  IF v_zo4_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, zone_id, employee_id, designation) VALUES
      (v_zo4_id, 'Amit Desai', '9876543221', 'assistant_commissioner', 4, 'SMC-AC-401', 'Assistant Commissioner') ON CONFLICT DO NOTHING;
  END IF;

  IF v_ce_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, employee_id, designation) VALUES
      (v_ce_id, 'Vikram Sharma', '9876543222', 'city_engineer', 'SMC-CE-001', 'City Engineer') ON CONFLICT DO NOTHING;
  END IF;

  IF v_comm_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, designation) VALUES
      (v_comm_id, 'Dr. Nitin Kadam (IAS)', '9876543223', 'commissioner', 'Municipal Commissioner') ON CONFLICT DO NOTHING;
  END IF;

  IF v_acct_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, designation) VALUES
      (v_acct_id, 'Meera Joshi', '9876543224', 'accounts', 'Accounts Officer') ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO profiles (id, full_name, phone, role, designation) VALUES
      (v_admin_id, 'SSR Admin', '9876543225', 'super_admin', 'System Administrator') ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run after creating auth users: SELECT fn_seed_demo_profiles();


-- ============================================================
-- 9C: CONTRACTOR METRICS SEED (for Vendor Scorecard demo)
-- ============================================================

-- Will be seeded after contractor auth users are created
-- Example: SELECT after fn_seed_demo_profiles() populates contractors


-- ============================================================
-- 9D: REALTIME PUBLICATION
-- Enable Supabase Realtime on key tables for live dashboard
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_events;
ALTER PUBLICATION supabase_realtime ADD TABLE contractor_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================
-- 9E: STORAGE BUCKETS
-- Create Supabase Storage buckets for photos and PDFs
-- ============================================================

-- Run via Supabase Dashboard → Storage → New Bucket:
-- Bucket: ticket-photos     (Public read, authenticated write)
-- Bucket: after-photos      (Public read, authenticated write)
-- Bucket: je-inspection     (Authenticated only)
-- Bucket: bill-pdfs         (Authenticated only)
-- Bucket: profile-avatars   (Public read, authenticated write)

-- SQL alternative (if supported by your Supabase version):
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('ticket-photos', 'ticket-photos', true),
--   ('after-photos', 'after-photos', true),
--   ('je-inspection', 'je-inspection', false),
--   ('bill-pdfs', 'bill-pdfs', false),
--   ('profile-avatars', 'profile-avatars', true);
