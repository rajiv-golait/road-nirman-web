-- ============================================================
-- SSR SYSTEM — MIGRATION 003: MASTER DATA TABLES
-- Solapur Smart Roads — रोड NIRMAN
-- ============================================================
-- Reference tables that rarely change. Seeded once, used everywhere.
-- These must be created BEFORE core tables (foreign key targets).
-- ============================================================


-- ============================================================
-- 3A: DEPARTMENTS
-- 6 departments that handle road-related complaints in Solapur
-- The map_pin_color drives the Multi-Department Toggle (O13)
-- ============================================================

CREATE TABLE departments (
  id            SERIAL PRIMARY KEY,
  code          department_code UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  name_marathi  TEXT,
  map_pin_color VARCHAR(7) NOT NULL DEFAULT '#EF4444',
  contact_email TEXT,
  contact_phone VARCHAR(15),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE departments IS 'SMC departments that handle road damage complaints. Map pin color changes when ticket is cross-assigned.';
COMMENT ON COLUMN departments.map_pin_color IS 'Hex color for Mapbox pin — Red=Roads, Blue=Water, Cyan=Drainage, Yellow=MSEDCL';

INSERT INTO departments (code, name, name_marathi, map_pin_color) VALUES
  ('ROADS',         'Engineering / Roads',       'अभियांत्रिकी / रस्ते',     '#EF4444'),
  ('WATER_SUPPLY',  'Water Supply Department',   'पाणी पुरवठा विभाग',        '#3B82F6'),
  ('DRAINAGE',      'Drainage Department',       'ड्रेनेज विभाग',             '#06B6D4'),
  ('MSEDCL',        'MSEDCL (Electricity)',      'MSEDCL (वीज)',              '#EAB308'),
  ('TRAFFIC',       'Traffic Department',        'वाहतूक विभाग',              '#8B5CF6'),
  ('DISASTER_MGMT', 'Disaster Management',       'आपत्ती व्यवस्थापन',         '#F97316');


-- ============================================================
-- 3B: ADMINISTRATIVE ZONES (8 Zones — Kshetriya Karyalay)
-- Budget and engineering staff sit at Zone level.
-- The boundary polygon enables GPS → Zone auto-routing via ST_Covers()
-- ============================================================

CREATE TABLE zones (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  name_marathi        TEXT,
  key_areas           TEXT,                            -- "Majrewadi, Nai Zindagi, Bijapur Road"
  boundary            GEOGRAPHY(POLYGON, 4326),        -- PostGIS polygon for ST_Covers()
  centroid_lat        FLOAT,                           -- Approximate center for demo fallback
  centroid_lng        FLOAT,
  annual_road_budget  NUMERIC(15,2) DEFAULT 0,         -- ₹ allocated for FY
  budget_consumed     NUMERIC(15,2) DEFAULT 0,         -- ₹ spent (updated by triggers)
  created_at          TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE zones IS '8 administrative zones of Solapur Municipal Corporation. Primary routing target for all complaints.';
COMMENT ON COLUMN zones.boundary IS 'PostGIS POLYGON boundary. For hackathon: approximate polygons. Production: official SMC GIS shapefiles.';

-- Seed 8 zones with approximate centroids and key areas
-- Real polygon boundaries will be added in 009_seed_data.sql
INSERT INTO zones (id, name, name_marathi, key_areas, centroid_lat, centroid_lng, annual_road_budget) VALUES
  (1, 'Zone 1 — Fort Area',       'क्षेत्र १ — किल्ला परिसर',       'Fort Area, Siddheshwar Temple, Gandhi Chowk, Raviwar Peth',           17.6951, 75.9093, 5000000),
  (2, 'Zone 2 — Railway Lines',   'क्षेत्र २ — रेल्वे लाइन्स',     'Railway Lines, Civil Lines, North Sadar Bazar (High VIP Movement)',   17.6782, 75.9103, 5000000),
  (3, 'Zone 3 — Akkalkot Road',   'क्षेत्र ३ — अक्कलकोट रोड',      'MIDC Road, Akkalkot Road, New Paccha Peth, Sangameshwar Nagar',      17.6891, 75.9312, 5000000),
  (4, 'Zone 4 — Majrewadi',       'क्षेत्र ४ — मजरेवाडी',           'Majrewadi, Nai Zindagi, Solapur-Bijapur Road, Hotgi Road',           17.6634, 75.9401, 5000000),
  (5, 'Zone 5 — Shelgi',          'क्षेत्र ५ — शेळगी',              'Shelgi, Degaon, Vijapur Road (Expansion Areas), Tuljapur Road',      17.7012, 75.9182, 5000000),
  (6, 'Zone 6 — Jule Solapur',    'क्षेत्र ६ — जुळे सोलापूर',      'Jule Solapur, Nehru Nagar (Residential Hubs)',                        17.6534, 75.9301, 5000000),
  (7, 'Zone 7 — Ashok Chowk',     'क्षेत्र ७ — अशोक चौक',          'Ashok Chowk, Forest Area, Kumthe, NH-65 Pune Highway, Hadco Colony', 17.6934, 75.8867, 5000000),
  (8, 'Zone 8 — Saat Rasta',      'क्षेत्र ८ — सात रस्ता',         'Saat Rasta, Murarji Peth, Market Yard (Commercial Hub), Barshi Road', 17.6745, 75.9187, 5000000);

-- Reset sequence to avoid conflicts
SELECT setval('zones_id_seq', 8);


-- ============================================================
-- 3C: PRABHAGS (26 Election Divisions — intermediate GIS layer)
-- GPS → Prabhag → Zone is the two-step routing chain.
-- Some Prabhags span 2 zones — handled by is_split flag (hackathon)
-- and prabhag_zone_mapping junction table (production).
-- ============================================================

CREATE TABLE prabhags (
  id            SERIAL PRIMARY KEY,    -- 1–26
  name          TEXT NOT NULL,
  name_marathi  TEXT,
  zone_id       INT NOT NULL REFERENCES zones(id),  -- Primary zone (hackathon simplification)
  boundary      GEOGRAPHY(POLYGON, 4326),
  is_split      BOOLEAN DEFAULT false,               -- True if Prabhag spans 2+ zones
  seat_count    INT DEFAULT 4,                       -- Electoral seats (most = 4, some = 3)
  created_at    TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE prabhags IS '26 election divisions (Prabhags). Intermediate GIS layer between GPS point and Zone.';
COMMENT ON COLUMN prabhags.is_split IS 'Some Prabhags (e.g. Bhavani Peth) span 2 zones. For hackathon: route to primary zone. Production: use prabhag_zone_mapping.';

-- Seed 26 Prabhags with zone assignments
-- Zone mapping inferred from research — confirm with SMC GIS for production
INSERT INTO prabhags (id, name, zone_id, is_split, seat_count) VALUES
  -- Zone 1: Central/Old City
  (1,  'Prabhag 1',  1, false, 3),
  (2,  'Prabhag 2',  1, false, 4),
  (3,  'Prabhag 3',  1, true,  4),   -- Bhavani Peth — spans Z1/Z2
  -- Zone 2: North-Central
  (4,  'Prabhag 4',  2, false, 4),
  (5,  'Prabhag 5',  2, false, 4),
  (6,  'Prabhag 6',  2, false, 4),
  -- Zone 3: Northeast — Akkalkot Road
  (7,  'Prabhag 7',  3, false, 4),
  (8,  'Prabhag 8',  3, false, 4),
  (9,  'Prabhag 9',  3, false, 4),
  -- Zone 4: East — Vijapur/Hotgi Road
  (10, 'Prabhag 10', 4, false, 4),
  (11, 'Prabhag 11', 4, false, 4),
  (12, 'Prabhag 12', 4, false, 4),
  -- Zone 5: Southeast — Tuljapur Road
  (13, 'Prabhag 13', 5, false, 4),
  (14, 'Prabhag 14', 5, false, 4),
  (15, 'Prabhag 15', 5, false, 4),
  -- Zone 6: South — Majarewadi
  (16, 'Prabhag 16', 6, false, 4),
  (17, 'Prabhag 17', 6, false, 4),
  (18, 'Prabhag 18', 6, false, 4),
  -- Zone 7: West/Northwest — NH-65
  (19, 'Prabhag 19', 7, false, 4),
  (20, 'Prabhag 20', 7, false, 4),
  (21, 'Prabhag 21', 7, false, 4),
  (22, 'Prabhag 22', 7, false, 4),
  -- Zone 8: Northwest/Outer — Kegaon
  (23, 'Prabhag 23', 8, false, 4),
  (24, 'Prabhag 24', 8, false, 4),
  (25, 'Prabhag 25', 8, false, 3),
  (26, 'Prabhag 26', 8, false, 3);

SELECT setval('prabhags_id_seq', 26);


-- ============================================================
-- 3D: PRABHAG-ZONE JUNCTION TABLE (Production M:N relationship)
-- For split Prabhags that span multiple zones.
-- Hackathon: use prabhags.zone_id (single FK).
-- Production: query this table for accurate routing.
-- ============================================================

CREATE TABLE prabhag_zone_mapping (
  prabhag_id          INT REFERENCES prabhags(id),
  zone_id             INT REFERENCES zones(id),
  overlap_percentage  FLOAT DEFAULT 100.0,     -- What % of the Prabhag falls in this Zone
  is_primary_zone     BOOLEAN DEFAULT true,    -- Which Zone "owns" for routing
  PRIMARY KEY (prabhag_id, zone_id)
);

COMMENT ON TABLE prabhag_zone_mapping IS 'Junction table for Prabhags spanning multiple zones. For hackathon: not actively used. Production: critical for accurate routing.';

-- Seed: All prabhags map 1:1 except Prabhag 3 (Bhavani Peth)
INSERT INTO prabhag_zone_mapping (prabhag_id, zone_id, overlap_percentage, is_primary_zone)
SELECT id, zone_id, 100.0, true FROM prabhags WHERE NOT is_split;

-- Split prabhag: Bhavani Peth spans Zone 1 and Zone 2
INSERT INTO prabhag_zone_mapping (prabhag_id, zone_id, overlap_percentage, is_primary_zone) VALUES
  (3, 1, 60.0, true),    -- 60% in Zone 1 (primary)
  (3, 2, 40.0, false);   -- 40% in Zone 2


-- ============================================================
-- 3E: RATE CARDS (Anti-corruption price lock)
-- The JE can NEVER type a price. They input dimensions only.
-- Cost = area × rate_per_unit (fetched from this table, read-only).
-- Approved by City Engineer at start of fiscal year.
-- ============================================================

CREATE TABLE rate_cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year     VARCHAR(7) NOT NULL,        -- "2025-26"
  work_type       TEXT NOT NULL,              -- "Hot Mix Patching", "Cold Mix Patching"
  work_type_marathi TEXT,
  unit            VARCHAR(20) NOT NULL,       -- "sqm", "running_meter", "cubic_meter"
  rate_per_unit   NUMERIC(10,2) NOT NULL,     -- ₹450.00
  zone_id         INT REFERENCES zones(id),   -- NULL = applies to all zones
  approved_by     UUID,                       -- City Engineer who approved (FK set after profiles created)
  approved_at     TIMESTAMPTZ,
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE rate_cards IS 'Annual rate contract prices. Powers the anti-corruption price lock — JE inputs dimensions, system calculates cost.';
COMMENT ON COLUMN rate_cards.rate_per_unit IS 'Price per unit from L1 bidder annual tender. Cannot be overridden by JE.';

-- Seed rate cards for FY 2025-26 (all zones)
INSERT INTO rate_cards (fiscal_year, work_type, work_type_marathi, unit, rate_per_unit, effective_from, is_active) VALUES
  ('2025-26', 'Hot Mix Patching',       'हॉट मिक्स पॅचिंग',        'sqm',           450.00,  '2025-04-01', true),
  ('2025-26', 'Cold Mix Patching',      'कोल्ड मिक्स पॅचिंग',      'sqm',           400.00,  '2025-04-01', true),
  ('2025-26', 'Full Resurfacing',       'पूर्ण पुनर्पृष्ठीकरण',     'sqm',           850.00,  '2025-04-01', true),
  ('2025-26', 'CC Panel Replacement',   'सीसी पॅनल बदलणे',         'sqm',          1200.00,  '2025-04-01', true),
  ('2025-26', 'WBM Repair',            'डब्ल्यूबीएम दुरुस्ती',     'sqm',           350.00,  '2025-04-01', true),
  ('2025-26', 'Edge Repair',           'कडा दुरुस्ती',             'running_meter',  300.00,  '2025-04-01', true),
  ('2025-26', 'Drain Cover Repair',    'नाला कव्हर दुरुस्ती',      'unit',          2500.00,  '2025-04-01', true);


-- ============================================================
-- 3F: SLA CONFIGURATION
-- EPDO severity tier → max response/resolution hours.
-- Based on DMA framework + our aggressive targets.
-- ============================================================

CREATE TABLE sla_config (
  severity          severity_tier PRIMARY KEY,
  response_hours    INT NOT NULL,    -- Max hours for JE first action
  resolution_hours  INT NOT NULL,    -- Max hours to fully Resolved
  escalate_l1_hours INT NOT NULL,    -- Escalate to DE after X hours
  escalate_l2_hours INT NOT NULL,    -- Escalate to Asst Commissioner
  escalate_l3_hours INT NOT NULL     -- Escalate to City Engineer
);

COMMENT ON TABLE sla_config IS 'SLA timers by EPDO severity tier. DMA framework: 7 working days total (3+2+2). Our system: 24h–168h.';

INSERT INTO sla_config VALUES
  ('CRITICAL', 4,   24,   12,  24,  48),    -- 24h total, escalate fast
  ('HIGH',     8,   48,   24,  48,  72),    -- 48h total
  ('MEDIUM',   12,  72,   36,  72,  96),    -- 72h total
  ('LOW',      24,  168,  72,  120, 168);   -- 7 days total


-- ============================================================
-- 3G: ESCALATION RULES (7 rules from DMA Section 8.1)
-- Powers the pg_cron escalation engine.
-- ============================================================

CREATE TABLE escalation_rules (
  id                    SERIAL PRIMARY KEY,
  rule_number           INT UNIQUE NOT NULL,
  rule_name             TEXT NOT NULL,
  description           TEXT,
  trigger_hours         INT NOT NULL,           -- Hours since last action
  from_status           ticket_status,          -- Current ticket status
  escalate_to_role      user_role,              -- Who gets notified
  notification_template TEXT,                   -- SMS/push message template
  auto_reopen           BOOLEAN DEFAULT false,  -- Rule 6: auto-reopen
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE escalation_rules IS '7 auto-escalation rules from DMA framework Section 8.1. Checked every 30 minutes by pg_cron.';

INSERT INTO escalation_rules (rule_number, rule_name, description, trigger_hours, from_status, escalate_to_role, notification_template, auto_reopen) VALUES
  (1, 'No Acknowledgement',    'Complaint not acknowledged within 4 hours',          4,   'open',           'de',                    'ALERT: Ticket {ref} not acknowledged in 4h. Immediate JE action required.', false),
  (2, 'No Site Inspection',    'No site inspection logged within 48 hours',          48,  'open',           'de',                    'ESCALATION: Ticket {ref} — no inspection in 48h. Escalated to Deputy Engineer.', false),
  (3, 'No Work Order',         'No work order generated within 5 working days',      120, 'verified',       'city_engineer',         'ESCALATION: Ticket {ref} — no work order in 5 days. Escalated to Executive Engineer.', false),
  (4, 'No Resolution 10d',    'No resolution within 10 working days',               240, 'assigned',       'assistant_commissioner', 'CRITICAL: Ticket {ref} — unresolved for 10 days. Dy. Commissioner notified.', false),
  (5, 'No Resolution 21d',    'No resolution within 21 working days (Aaple Sarkar)', 504, 'in_progress',    'commissioner',          'URGENT: Ticket {ref} — 21-day breach. Commissioner meeting agenda flag.', false),
  (6, 'Citizen Confirmation',  'Resolved ticket — citizen SMS YES/NO auto-reopen',   0,   'resolved',       NULL,                    'SMC Solapur: Is the road at {location} repaired? Reply YES or NO to this number.', true),
  (7, 'Chronic Location',      '3+ complaints same GPS in 90 days',                 0,   NULL,             'city_engineer',         'CHRONIC: Location {location} has {count} complaints in 90 days. Defect liability review required.', false);


-- ============================================================
-- 3H: CHRONIC LOCATIONS TRACKER (Rule 7)
-- PostGIS point + complaint counter for hotspot detection.
-- ============================================================

CREATE TABLE chronic_locations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  latitude        FLOAT NOT NULL,
  longitude       FLOAT NOT NULL,
  address_text    TEXT,
  zone_id         INT REFERENCES zones(id),
  complaint_count INT DEFAULT 0,
  first_complaint TIMESTAMPTZ,
  last_complaint  TIMESTAMPTZ,
  is_flagged      BOOLEAN DEFAULT false,
  flagged_at      TIMESTAMPTZ,
  assigned_ee     UUID,                              -- Executive Engineer assigned for review
  defect_review   BOOLEAN DEFAULT false,             -- Is there a recent contractor work?
  contractor_id   UUID,                              -- Contractor responsible (if defect)
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE chronic_locations IS 'Locations with 3+ complaints in 90 days. Auto-flagged for EE escalation and defect liability review.';
