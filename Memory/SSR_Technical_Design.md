# Solapur Smart Roads (SSR) System
## Complete Technical Design Document
### Version 1.0 — Stage 0 → Production Blueprint

---

## TABLE OF CONTENTS

1. System Overview & Design Philosophy
2. Architecture Diagram
3. Technology Stack (Justified)
4. Database Schema (Complete SQL)
5. API Design (All Endpoints)
6. AI/ML Pipeline Design
7. GIS & Auto-Routing Engine
8. Mobile App Design (Flutter)
9. Web Dashboard Design (Next.js)
10. Authentication & RBAC
11. Real-Time Engine
12. Notification System
13. Digital Measurement Book & PDF Generation
14. SLA & Auto-Escalation Engine
15. File Structure (Complete)
16. Environment Configuration
17. Deployment Architecture
18. Demo Seed Data Strategy
19. Build Order & Milestones

---

## 1. SYSTEM OVERVIEW & DESIGN PHILOSOPHY

### What We Are Building
A "Digital Nervous System" for Solapur Municipal Corporation's 8 Administrative Zones.
One complaint goes in. An irrefutable audit trail with contractor payment authorization comes out.

### Core Design Principles
- **GPS-First**: Every action is location-anchored. Nothing routes manually.
- **Evidence-Locked**: No step proceeds without photographic proof.
- **Role-Gated**: Every screen shows only what that role is authorized to see.
- **Immutable Audit**: Every state transition is logged. Nothing can be deleted.
- **Serverless-First**: Maximum robustness, minimum setup. Supabase handles infra.

### The Anti-Fraud Chain (North Star)
```
Citizen Photo + GPS
    ↓ [AI Detection]
Complaint Created → Zone Auto-Assigned → JE Notified
    ↓ [20m Geo-Fence Gate]
JE Physical Check-In → Dimensions → Rate Card Locked Cost
    ↓ [Job Order Generated]
Contractor Ghost Camera → Before/After Match
    ↓ [SSIM + SHA-256]
Digital MB Line Item → PDF Bill → Accounts Approval → Cheque
```
Every arrow is a hard gate. No step can be skipped.

---

## 2. ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                     │
│                                                                               │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────┐ │
│  │   Flutter Mobile App  │   │  Next.js Web Dashboard│   │  WhatsApp Intake │ │
│  │                       │   │                       │   │  (+91 9112221901)│ │
│  │  Mode 1: Citizen      │   │  Zone Officer View    │   │                  │ │
│  │  Mode 2: JE (Field)   │   │  Commissioner View    │   │  Meta Cloud API  │ │
│  │  Mode 3: Contractor   │   │  Accounts View        │   │  Webhook → Edge  │ │
│  │                       │   │  City Engineer Admin  │   │  Function        │ │
│  │  TFLite (on-device)   │   │  Mapbox GL JS         │   └────────┬─────────┘ │
│  │  GPS + Camera         │   │  Supabase Realtime    │            │           │
│  └──────────┬────────────┘   └──────────┬────────────┘            │           │
└─────────────┼──────────────────────────┼────────────────────────┼───────────┘
              │ HTTPS/REST + WS           │ HTTPS/REST + WS         │ Webhook
┌─────────────▼──────────────────────────▼────────────────────────▼───────────┐
│                           API GATEWAY LAYER                                   │
│                     Supabase Edge Functions (Deno)                            │
│                                                                               │
│  fn: ingest-complaint     fn: assign-zone      fn: notify-status             │
│  fn: verify-geofence      fn: generate-pdf     fn: escalate-sla              │
│  fn: whatsapp-webhook     fn: audit-log        fn: generate-job-order        │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────────┐
         │                 │                        │
┌────────▼───────┐ ┌───────▼──────────┐ ┌─────────▼──────────────┐
│  SUPABASE CORE │ │  AI MICROSERVICE  │ │  EXTERNAL INTEGRATIONS  │
│                │ │  FastAPI (Python) │ │                          │
│  PostgreSQL 15 │ │                   │ │  MSG91 (SMS India)       │
│  + PostGIS     │ │  /detect          │ │  FCM (Push Notify)       │
│                │ │  /verify-repair   │ │  IMD Weather API         │
│  Supabase Auth │ │  /ssim-compare    │ │  Meta WhatsApp API       │
│  (GoTrue/JWT)  │ │  /epdo-score      │ │  Mapbox Geocoding        │
│                │ │                   │ └──────────────────────────┘
│  Supabase      │ │  YOLOv8 model     │
│  Storage       │ │  SSIM (scikit)    │
│  (S3-compat)   │ │  OpenCV           │
│                │ │  IMD API client   │
│  Supabase      │ └───────────────────┘
│  Realtime      │
│  (WebSockets)  │
│                │
│  Row Level     │
│  Security      │
└────────────────┘
```

---

## 3. TECHNOLOGY STACK (JUSTIFIED)

### Backend Core
| Technology | Version | Role | Why |
|---|---|---|---|
| Supabase | Latest | BaaS platform | Auth + DB + Storage + Realtime in one. Saves 20hrs of setup. |
| PostgreSQL | 15 | Primary database | ACID, PostGIS support, JSON columns |
| PostGIS | 3.3 | GIS extension | ST_Covers() for GPS→Zone routing in milliseconds |
| Supabase Edge Functions | Deno runtime | Serverless logic | Runs on Supabase infra. No separate server needed. |
| Supabase Storage | S3-compatible | Photo storage | RLS-protected image buckets per role |
| Supabase Realtime | WebSocket | Live map updates | PostgreSQL CDC → WebSocket → Mapbox pin drop |

### AI Microservice
| Technology | Version | Role | Why |
|---|---|---|---|
| Python | 3.12 | Runtime | Native ML ecosystem |
| FastAPI | 0.110 | API framework | Async, auto OpenAPI docs, faster than Flask |
| YOLOv8 (Ultralytics) | 8.0 | Pothole detection | Pre-trained on COCO, fine-tunable on Indian roads |
| scikit-image | 0.22 | SSIM comparison | Quantitative before/after surface change detection |
| OpenCV | 4.9 | Image processing | Grayscale conversion, resize, preprocessing |
| TensorFlow Lite | 2.15 | On-device pre-filter | Runs on phone. Rejects non-road images before upload. |
| Pillow | 10.2 | Image handling | Format conversion, compression |
| httpx | 0.27 | Async HTTP client | IMD weather API calls |

### Mobile App
| Technology | Version | Role | Why |
|---|---|---|---|
| Flutter | 3.19 | Cross-platform app | Single codebase for Citizen/JE/Contractor modes |
| Dart | 3.3 | Language | Null-safe, fast compilation |
| supabase_flutter | 2.3 | Supabase SDK | Auth, DB queries, Storage, Realtime |
| geolocator | 11.0 | GPS | High-accuracy location with permission handling |
| camera | 0.10 | Camera access | Ghost overlay implementation |
| flutter_map | 6.1 | Map display | OpenStreetMap tiles, offline-capable |
| tflite_flutter | 0.10 | On-device AI | TFLite model inference on device |
| flutter_local_notifications | 17.0 | Push notifications | FCM integration |
| connectivity_plus | 6.0 | Network detection | Offline mode detection |
| hive | 2.2 | Local storage | Cache GPS check-ins offline |

### Web Dashboard
| Technology | Version | Role | Why |
|---|---|---|---|
| Next.js | 14 (App Router) | Web framework | SSR + RSC + fast routing |
| React | 18 | UI library | Component model |
| TypeScript | 5.4 | Language | Type safety across all components |
| Mapbox GL JS | 3.2 | Maps | Dark theme war room visualization, heatmap layers |
| @supabase/ssr | 0.3 | Supabase SSR | Server-side auth + data fetching |
| Tanstack Query | 5.0 | Data fetching | Caching, background refetch, optimistic updates |
| Zustand | 4.5 | State management | Lightweight, no boilerplate |
| Recharts | 2.12 | Analytics charts | Resolution timelines, contractor scorecards |
| React PDF | 3.4 | PDF preview | Digital MB viewer in browser |
| Tailwind CSS | 3.4 | Styling | Utility-first, dark theme support |
| shadcn/ui | Latest | Component library | Accessible, customizable components |

---

## 4. DATABASE SCHEMA (COMPLETE SQL)

```sql
-- ============================================================
-- SSR SYSTEM — COMPLETE SUPABASE SCHEMA
-- Run in order: extensions → tables → indexes → triggers → RLS
-- ============================================================

-- ============================================================
-- STEP 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For text search on addresses

-- ============================================================
-- STEP 2: ENUM TYPES
-- ============================================================

CREATE TYPE ticket_status AS ENUM (
  'open',
  'verified',
  'assigned',
  'in_progress',
  'audit_pending',
  'resolved',
  'rejected',
  'escalated',
  'cross_assigned'
);

CREATE TYPE user_role AS ENUM (
  'citizen',
  'je',
  'de',
  'assistant_commissioner',
  'city_engineer',
  'commissioner',
  'contractor',
  'accounts',
  'super_admin'
);

CREATE TYPE damage_cause AS ENUM (
  'heavy_rainfall',
  'construction_excavation',
  'utility_water',
  'utility_drainage',
  'utility_electricity',
  'utility_telecom',
  'poor_construction',
  'heavy_vehicular_load',
  'general_wear'
);

CREATE TYPE severity_tier AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW'
);

CREATE TYPE department_code AS ENUM (
  'ROADS',
  'WATER_SUPPLY',
  'DRAINAGE',
  'MSEDCL',
  'TRAFFIC',
  'DISASTER_MGMT'
);

-- ============================================================
-- STEP 3: MASTER DATA TABLES
-- ============================================================

-- 3A: DEPARTMENTS
CREATE TABLE departments (
  id            SERIAL PRIMARY KEY,
  code          department_code UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  name_marathi  TEXT,
  map_pin_color VARCHAR(7) NOT NULL DEFAULT '#FF0000',
  -- Red=Roads, Blue=Water, Cyan=Drainage, Yellow=MSEDCL
  contact_email TEXT,
  contact_phone VARCHAR(15)
);

INSERT INTO departments (code, name, name_marathi, map_pin_color) VALUES
  ('ROADS',         'Engineering / Roads',       'अभियांत्रिकी / रस्ते',    '#EF4444'),
  ('WATER_SUPPLY',  'Water Supply Department',   'पाणी पुरवठा विभाग',        '#3B82F6'),
  ('DRAINAGE',      'Drainage Department',       'ड्रेनेज विभाग',            '#06B6D4'),
  ('MSEDCL',        'MSEDCL (Electricity)',       'MSEDCL (वीज)',             '#EAB308'),
  ('TRAFFIC',       'Traffic Department',        'वाहतूक विभाग',             '#8B5CF6'),
  ('DISASTER_MGMT', 'Disaster Management',       'आपत्ती व्यवस्थापन',        '#F97316');

-- 3B: ADMINISTRATIVE ZONES (8 Zones)
CREATE TABLE zones (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,          -- "Zone 4 — Majrewadi"
  name_marathi  TEXT,
  key_areas     TEXT,                   -- "Majrewadi, Nai Zindagi, Bijapur Road"
  boundary      GEOGRAPHY(POLYGON, 4326) NOT NULL,
  annual_road_budget NUMERIC(15,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3C: PRABHAGS (26 Election Divisions — intermediate GIS layer)
CREATE TABLE prabhags (
  id            SERIAL PRIMARY KEY,     -- 1–26
  name          TEXT NOT NULL,          -- "Prabhag 12"
  zone_id       INT NOT NULL REFERENCES zones(id),
  boundary      GEOGRAPHY(POLYGON, 4326) NOT NULL
);

-- 3D: RATE CARDS (Anti-corruption price lock)
CREATE TABLE rate_cards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year     VARCHAR(7) NOT NULL,   -- "2024-25"
  work_type       TEXT NOT NULL,         -- "Asphalt Filling", "Cold Mix Patching"
  work_type_marathi TEXT,
  unit            VARCHAR(20) NOT NULL,  -- "sqm", "running_meter", "cubic_meter"
  rate_per_unit   NUMERIC(10,2) NOT NULL,-- ₹450.00
  zone_id         INT REFERENCES zones(id), -- NULL = applies to all zones
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  effective_from  DATE NOT NULL,
  effective_to    DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3E: SLA CONFIGURATION
CREATE TABLE sla_config (
  severity          severity_tier PRIMARY KEY,
  response_hours    INT NOT NULL,    -- Max hours to first JE action
  resolution_hours  INT NOT NULL,    -- Max hours to Resolved
  escalate_l1_hours INT NOT NULL,    -- Escalate to DE after X hours
  escalate_l2_hours INT NOT NULL,    -- Escalate to Asst Commissioner
  escalate_l3_hours INT NOT NULL     -- Escalate to City Engineer
);

INSERT INTO sla_config VALUES
  ('CRITICAL', 4,  24,  12, 24, 48),
  ('HIGH',     8,  48,  24, 48, 72),
  ('MEDIUM',   12, 72,  36, 72, 96),
  ('LOW',      24, 168, 72, 120, 168);

-- ============================================================
-- STEP 4: USER PROFILES
-- ============================================================

-- Extends Supabase Auth (auth.users)
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         VARCHAR(15) UNIQUE,
  role          user_role NOT NULL DEFAULT 'citizen',
  zone_id       INT REFERENCES zones(id),       -- For JE, DE, Asst Commissioner
  employee_id   VARCHAR(20),                    -- SMC employee code
  is_active     BOOLEAN DEFAULT true,
  fcm_token     TEXT,                           -- Firebase Cloud Messaging token
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Contractor company details
CREATE TABLE contractors (
  id              UUID PRIMARY KEY REFERENCES profiles(id),
  company_name    TEXT NOT NULL,               -- "S.S. Ekbote Construction"
  gst_number      VARCHAR(15),
  pan_number      VARCHAR(10),
  zone_ids        INT[],                        -- Zones they hold AMC for
  contract_start  DATE,
  contract_end    DATE,
  is_blacklisted  BOOLEAN DEFAULT false,
  blacklist_reason TEXT
);

-- ============================================================
-- STEP 5: CORE TICKET TABLE
-- ============================================================

CREATE TABLE tickets (
  -- Identity
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_ref      TEXT UNIQUE,               -- "SSR-Z4-P12-2025-0089" (generated)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  -- Reporter
  citizen_id      UUID REFERENCES auth.users(id),
  citizen_phone   VARCHAR(15),               -- For WhatsApp/OTP citizens
  source_channel  TEXT DEFAULT 'app',        -- 'app', 'whatsapp', 'portal'

  -- Location
  location        GEOGRAPHY(POINT, 4326) NOT NULL,
  latitude        FLOAT NOT NULL,
  longitude       FLOAT NOT NULL,
  address_text    TEXT,                      -- Reverse geocoded address
  nearest_landmark TEXT,                     -- From SMC landmark list
  prabhag_id      INT REFERENCES prabhags(id),
  zone_id         INT REFERENCES zones(id),  -- Auto-filled by trigger

  -- Damage Classification
  damage_type     TEXT,                      -- 'pothole', 'crack', 'surface_failure'
  damage_cause    damage_cause,              -- AI + JE classified
  department_id   INT REFERENCES departments(id) DEFAULT 1,

  -- AI Analysis
  ai_confidence   FLOAT,                     -- YOLOv8 confidence 0.0–1.0
  ai_severity_index FLOAT,                   -- SAI component of EPDO
  epdo_score      FLOAT,                     -- Final EPDO 0–10
  severity_tier   severity_tier,             -- CRITICAL/HIGH/MEDIUM/LOW
  rainfall_risk   FLOAT,                     -- From IMD API at time of report
  road_class      TEXT,                      -- arterial/collector/local
  proximity_score FLOAT,                     -- Distance to hospital/school/highway
  total_potholes  INT,                       -- Count from YOLOv8 bounding boxes
  ai_source       TEXT DEFAULT 'YOLO_REAL',  -- 'YOLO_REAL' or 'OFFLINE_ESTIMATE'

  -- Evidence
  photo_before    TEXT[],                    -- Array: up to 3 before photos
  photo_after     TEXT,                      -- Single verified after photo

  -- Workflow Status
  status          ticket_status DEFAULT 'open',
  assigned_je     UUID REFERENCES auth.users(id),
  assigned_contractor UUID REFERENCES auth.users(id),
  department_note TEXT,                      -- JE note on cross-assignment

  -- JE Verification Data
  je_checkin_lat  FLOAT,
  je_checkin_lng  FLOAT,
  je_checkin_time TIMESTAMPTZ,
  je_checkin_distance_m FLOAT,              -- Distance from reported point
  dimensions      JSONB,
  -- {"length_m": 2.5, "width_m": 1.5, "depth_m": 0.1, "area_sqm": 3.75}
  work_type       TEXT,                      -- Fetched from rate card
  rate_card_id    UUID REFERENCES rate_cards(id),
  rate_per_sqm    NUMERIC(10,2),             -- Locked at time of verification
  estimated_cost  NUMERIC(10,2),             -- Auto-calculated, immutable after JE approval
  job_order_ref   TEXT UNIQUE,               -- "JO-Z4-P12-2025-0089"

  -- SSIM Verification
  ssim_score      FLOAT,                     -- 0.0–1.0
  ssim_pass       BOOLEAN,                   -- score < 0.75 = PASS
  verification_hash VARCHAR(64),             -- SHA-256 of verified after photo
  verified_at     TIMESTAMPTZ,

  -- Billing
  bill_id         UUID,                      -- FK set after bill generated

  -- Resolution
  resolved_at     TIMESTAMPTZ,
  resolved_in_hours FLOAT,                   -- Computed on resolution
  escalation_count INT DEFAULT 0,
  sla_breach      BOOLEAN DEFAULT false,

  -- Duplicate handling
  is_duplicate    BOOLEAN DEFAULT false,
  master_ticket_id UUID REFERENCES tickets(id)
);

-- ============================================================
-- STEP 6: AUDIT TRAIL (Immutable — append only)
-- ============================================================

CREATE TABLE ticket_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   UUID NOT NULL REFERENCES tickets(id),
  actor_id    UUID REFERENCES auth.users(id),
  actor_role  user_role,
  event_type  TEXT NOT NULL,
  -- 'status_change', 'assignment', 'escalation', 'cross_assign',
  -- 'je_checkin', 'photo_upload', 'ssim_result', 'bill_generated'
  old_status  ticket_status,
  new_status  ticket_status,
  notes       TEXT,
  metadata    JSONB,                -- Extra context: GPS coords, scores, etc.
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: Nobody can UPDATE or DELETE ticket_events. INSERT only.

-- ============================================================
-- STEP 7: CONTRACTOR BILLING
-- ============================================================

CREATE TABLE contractor_bills (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_ref        TEXT UNIQUE,               -- "BILL-Z4-2025-0012"
  contractor_id   UUID REFERENCES auth.users(id),
  zone_id         INT REFERENCES zones(id),
  fiscal_year     VARCHAR(7),
  ticket_ids      UUID[],                    -- Array of ticket UUIDs (micro-billing)
  total_tickets   INT,
  total_amount    NUMERIC(12,2),
  pdf_url         TEXT,                      -- Supabase Storage URL
  status          TEXT DEFAULT 'draft',
  -- 'draft', 'submitted', 'accounts_review', 'approved', 'paid'
  submitted_at    TIMESTAMPTZ,
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  payment_ref     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 8: CONTRACTOR PERFORMANCE METRICS
-- ============================================================

CREATE TABLE contractor_metrics (
  contractor_id       UUID PRIMARY KEY REFERENCES auth.users(id),
  zone_id             INT REFERENCES zones(id),
  total_assigned      INT DEFAULT 0,
  total_ssim_pass     INT DEFAULT 0,
  total_ssim_fail     INT DEFAULT 0,
  total_reopen        INT DEFAULT 0,        -- Tickets re-opened after "resolved"
  avg_repair_hours    FLOAT,
  ssim_pass_rate      FLOAT,               -- ssim_pass / total_assigned
  reopen_rate         FLOAT,               -- reopen / total_assigned (SCORECARD)
  scorecard_rank      INT,                 -- Computed monthly, 1 = best
  last_computed_at    TIMESTAMPTZ
);

-- ============================================================
-- STEP 9: PERFORMANCE INDEXES
-- ============================================================

-- GIS indexes (critical for routing speed)
CREATE INDEX idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX idx_prabhags_boundary ON prabhags USING GIST (boundary);
CREATE INDEX idx_tickets_location ON tickets USING GIST (location);

-- Query indexes
CREATE INDEX idx_tickets_zone ON tickets (zone_id);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_je ON tickets (assigned_je);
CREATE INDEX idx_tickets_contractor ON tickets (assigned_contractor);
CREATE INDEX idx_tickets_severity ON tickets (severity_tier);
CREATE INDEX idx_tickets_created ON tickets (created_at DESC);
CREATE INDEX idx_ticket_events_ticket ON ticket_events (ticket_id, created_at);

-- ============================================================
-- STEP 10: FUNCTIONS & TRIGGERS
-- ============================================================

-- 10A: Auto-assign Zone from GPS (The routing trigger)
CREATE OR REPLACE FUNCTION fn_assign_zone_and_prabhag()
RETURNS TRIGGER AS $$
BEGIN
  -- Step 1: Find Prabhag
  SELECT id INTO NEW.prabhag_id
  FROM prabhags
  WHERE ST_Covers(boundary::geometry, NEW.location::geometry)
  LIMIT 1;

  -- Step 2: Find Zone from Prabhag
  IF NEW.prabhag_id IS NOT NULL THEN
    SELECT zone_id INTO NEW.zone_id
    FROM prabhags
    WHERE id = NEW.prabhag_id;
  ELSE
    -- Fallback: Direct zone lookup
    SELECT id INTO NEW.zone_id
    FROM zones
    WHERE ST_Covers(boundary::geometry, NEW.location::geometry)
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assign_zone
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_assign_zone_and_prabhag();

-- 10B: Auto-assign JE (load balanced — fewest open tickets in zone)
CREATE OR REPLACE FUNCTION fn_assign_je(p_zone_id INT)
RETURNS UUID AS $$
DECLARE
  v_je_id UUID;
BEGIN
  SELECT p.id INTO v_je_id
  FROM profiles p
  WHERE p.role = 'je'
    AND p.zone_id = p_zone_id
    AND p.is_active = true
  ORDER BY (
    SELECT COUNT(*) FROM tickets t
    WHERE t.assigned_je = p.id
      AND t.status NOT IN ('resolved', 'rejected')
  ) ASC
  LIMIT 1;

  RETURN v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10C: Generate ticket reference number
CREATE OR REPLACE FUNCTION fn_generate_ticket_ref()
RETURNS TRIGGER AS $$
DECLARE
  v_zone_num INT;
  v_prabhag_num INT;
  v_year VARCHAR(4);
  v_seq INT;
BEGIN
  v_zone_num := NEW.zone_id;
  v_prabhag_num := COALESCE(NEW.prabhag_id, 0);
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM tickets
  WHERE zone_id = NEW.zone_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  NEW.ticket_ref := FORMAT(
    'SSR-Z%s-P%s-%s-%s',
    LPAD(v_zone_num::TEXT, 1, '0'),
    LPAD(v_prabhag_num::TEXT, 2, '0'),
    v_year,
    LPAD(v_seq::TEXT, 4, '0')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ticket_ref
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_generate_ticket_ref();

-- 10D: Auto-log audit event on status change
CREATE OR REPLACE FUNCTION fn_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_events (
      ticket_id, event_type, old_status, new_status,
      metadata, actor_role
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'updated_at', NOW(),
        'ticket_ref', NEW.ticket_ref
      ),
      NULL  -- actor set by application layer
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_status
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_log_status_change();

-- 10E: Auto-calculate EPDO score
CREATE OR REPLACE FUNCTION fn_calculate_epdo(
  p_sai FLOAT,           -- AI Severity Index (0–1)
  p_road_class TEXT,     -- 'arterial', 'collector', 'local'
  p_rainfall_risk FLOAT, -- From IMD API (0–1)
  p_proximity FLOAT      -- Near hospital/school/highway (0–1)
) RETURNS FLOAT AS $$
DECLARE
  v_tosm FLOAT;
  v_score FLOAT;
BEGIN
  v_tosm := CASE p_road_class
    WHEN 'national_highway' THEN 1.0
    WHEN 'state_highway'    THEN 0.85
    WHEN 'arterial'         THEN 0.75
    WHEN 'collector'        THEN 0.60
    ELSE 0.40  -- local road
  END;

  v_score := (p_sai * 0.40)
           + (v_tosm * 0.30)
           + (p_rainfall_risk * 0.15)
           + (p_proximity * 0.15);

  RETURN ROUND((v_score * 10)::NUMERIC, 2);  -- Scale to 0–10
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- STEP 11: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_bills ENABLE ROW LEVEL SECURITY;

-- Citizens: see only their own tickets
CREATE POLICY citizen_own_tickets ON tickets
  FOR SELECT USING (
    auth.uid() = citizen_id
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN
       ('je', 'de', 'assistant_commissioner', 'city_engineer', 'commissioner', 'super_admin')
  );

-- JE: see only their zone's tickets
CREATE POLICY je_zone_tickets ON tickets
  FOR ALL USING (
    zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'je'
  );

-- Contractor: see only their assigned tickets
CREATE POLICY contractor_assigned ON tickets
  FOR SELECT USING (
    assigned_contractor = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'contractor'
  );

-- Accounts: read-only on all tickets with audit_pending/resolved status
CREATE POLICY accounts_read ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accounts'
    AND status IN ('audit_pending', 'resolved')
  );

-- Commissioner: full read on all tickets
CREATE POLICY commissioner_read_all ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
    ('commissioner', 'city_engineer', 'super_admin')
  );

-- ticket_events: insert-only for system, read for authorized roles
CREATE POLICY audit_insert_only ON ticket_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY audit_read ON ticket_events
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM tickets  -- inherits ticket visibility
    )
  );
```

---

## 5. API DESIGN (ALL ENDPOINTS)

### 5A. FastAPI AI Microservice

**Base URL:** `https://ssr-ai.railway.app` (production) / `http://localhost:8000` (dev)

```
POST   /detect
POST   /verify-repair
POST   /epdo-score
GET    /health
```

#### POST /detect
```
Description: Detect potholes in submitted image, return severity scores
Auth: Bearer JWT (Supabase token)

Request (multipart/form-data):
  image: File (JPEG/PNG, max 5MB)
  lat: float
  lng: float
  road_class: string (optional, from Mapbox geocoding)

Response 200:
{
  "detected": true,
  "damage_type": "pothole",
  "total_potholes": 4,
  "confidence": 0.87,
  "bounding_boxes": [[x1,y1,x2,y2], ...],
  "sai": 0.72,
  "rainfall_risk": 0.65,     // From IMD API
  "proximity_score": 0.80,   // Near District Hospital
  "road_class": "arterial",
  "epdo_score": 7.4,
  "severity_tier": "HIGH",
  "sla_hours": 48,
  "repair_recommendation": "Asphalt Filling",
  "ai_source": "YOLO_REAL"
}

Response 200 (no detection):
{
  "detected": false,
  "message": "No road damage detected",
  "confidence": 0.12
}
```

#### POST /verify-repair
```
Description: SSIM comparison of before/after images
Auth: Bearer JWT

Request (multipart/form-data):
  ticket_id: string
  after_image: File
  (before image fetched from Supabase Storage by ticket_id)

Response 200:
{
  "ssim_score": 0.42,
  "pass": true,              // score < 0.75 = surface changed = PASS
  "verdict": "REPAIR_VERIFIED",
  "sha256_hash": "a3f8c...",  // Of verified after image
  "confidence": "HIGH"
}
```

#### POST /epdo-score
```
Description: Recalculate EPDO with live rainfall data
Auth: Bearer JWT

Request (JSON):
{
  "sai": 0.72,
  "road_class": "arterial",
  "lat": 17.6823,
  "lng": 75.9064
}

Response 200:
{
  "epdo_score": 7.4,
  "severity_tier": "HIGH",
  "breakdown": {
    "sai_weighted": 2.88,
    "tosm_weighted": 2.25,
    "rainfall_weighted": 0.97,
    "proximity_weighted": 1.20
  }
}
```

---

### 5B. Supabase Edge Functions

```
POST   /functions/v1/ingest-complaint       # Full ingestion pipeline
POST   /functions/v1/verify-geofence        # JE 20m check
POST   /functions/v1/generate-job-order     # After JE approval
POST   /functions/v1/notify-status          # SMS + Push on status change
POST   /functions/v1/escalate-sla           # Cron-triggered escalation
POST   /functions/v1/generate-bill-pdf      # Digital MB PDF generation
POST   /functions/v1/whatsapp-webhook       # Meta WhatsApp intake
POST   /functions/v1/audit-log              # Explicit audit entry
```

#### /ingest-complaint (The orchestration function)
```typescript
// Deno Edge Function
// Orchestrates: AI call → GIS routing → JE assignment → notification

Input:
{
  "image_base64": string,
  "lat": number,
  "lng": number,
  "citizen_phone": string,
  "damage_description": string (optional),
  "source": "app" | "whatsapp"
}

Output:
{
  "ticket_id": "uuid",
  "ticket_ref": "SSR-Z4-P12-2025-0089",
  "zone": "Zone 4 — Majrewadi",
  "severity": "HIGH",
  "epdo_score": 7.4,
  "message_marathi": "तुमची तक्रार नोंदवली गेली. तक्रार क्रमांक: SSR-Z4-P12-2025-0089"
}
```

#### /verify-geofence
```typescript
Input:
{
  "ticket_id": "uuid",
  "je_lat": number,
  "je_lng": number
}

Output:
{
  "authorized": true | false,
  "distance_m": 14.2,
  "threshold_m": 20,
  "message": "Check-in authorized. Distance: 14.2m"
}
```

---

### 5C. Supabase Database API (Auto-generated REST)

All standard CRUD via Supabase client SDK. Key queries:

```typescript
// Get zone tickets for JE dashboard
supabase
  .from('tickets')
  .select(`
    *,
    profiles!assigned_je(full_name),
    zones(name),
    prabhags(name),
    departments(name, map_pin_color)
  `)
  .eq('zone_id', jeProfile.zone_id)
  .neq('status', 'resolved')
  .order('epdo_score', { ascending: false })

// Commissioner heatmap data
supabase
  .from('tickets')
  .select('id, latitude, longitude, severity_tier, epdo_score, status, department_id')
  .neq('status', 'resolved')

// Zone budget consumption
supabase
  .from('tickets')
  .select('zone_id, estimated_cost, status')
  .eq('zone_id', zoneId)
  .in('status', ['assigned', 'in_progress', 'audit_pending', 'resolved'])
```

---

## 6. AI/ML PIPELINE DESIGN

### 6A. On-Device Pre-Filter (TFLite — runs on citizen's phone)

```
Purpose: Reject non-road photos BEFORE upload.
         Saves bandwidth. Immediate feedback.

Model: MobileNetV3-Small, quantized INT8
Input: 224×224×3 image
Output: {"road": 0.91, "face": 0.03, "tree": 0.04, "other": 0.02}
Threshold: road_confidence > 0.60 → allow upload
           road_confidence < 0.60 → show "Road not detected. Point camera at the damaged road."
Model size: ~2.5MB (fits in Flutter app bundle)
Inference time: ~80ms on mid-range Android
```

### 6B. Server-Side Pothole Detection (YOLOv8 — FastAPI)

```
Model: YOLOv8n (nano) — fastest for API response
       Fine-tuned on: pothole-detection-gv5e7 (Roboflow Indian roads dataset)
Input: Original photo (up to 5MB JPEG)
Output: Bounding boxes + confidence per detection

Processing pipeline:
1. Receive image bytes
2. PIL.Image.open() → RGB conversion
3. model.predict(conf=0.45, iou=0.50)
4. Extract: box count, confidence scores, box dimensions
5. Calculate SAI (Severity AI Index):
   - pothole_area_ratio = sum(box areas) / image_area
   - SAI = min(pothole_area_ratio * 3.5, 1.0)  # Normalize to 0–1
6. Return structured JSON
```

### 6C. EPDO Scoring Engine

```python
# IRC-adapted EPDO Formula
def calculate_epdo(sai, road_class, lat, lng):

    # Traffic weight (TOSM) from road classification
    tosm_weights = {
        "national_highway": 1.0,
        "state_highway": 0.85,
        "arterial": 0.75,       # Akkalkot Road, MIDC Road
        "collector": 0.60,       # Zone connecting roads
        "local": 0.40            # Residential lanes
    }
    tosm = tosm_weights.get(road_class, 0.50)

    # Live rainfall risk from IMD API
    rainfall_mm = get_imd_rainfall(lat, lng)  # Monthly cumulative
    R = 1.0 if rainfall_mm > 100 else (0.6 if rainfall_mm > 30 else 0.2)

    # Proximity score (near hospital, school, highway)
    C = get_proximity_score(lat, lng)
    # Checks against: District Hospital, Civil Hospital,
    # Walchand College, Solapur University, NH-52

    raw = (sai * 0.40) + (tosm * 0.30) + (R * 0.15) + (C * 0.15)
    epdo_score = round(raw * 10, 2)  # Scale to 0–10

    tier = (
        "CRITICAL" if epdo_score >= 8.0 else
        "HIGH"     if epdo_score >= 5.0 else
        "MEDIUM"   if epdo_score >= 3.0 else
        "LOW"
    )

    return {"epdo_score": epdo_score, "tier": tier}
```

### 6D. SSIM Repair Verification

```python
def verify_repair(before_bytes: bytes, after_bytes: bytes) -> dict:

    # Load and normalize
    before = cv2.imdecode(np.frombuffer(before_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    after  = cv2.imdecode(np.frombuffer(after_bytes, np.uint8),  cv2.IMREAD_GRAYSCALE)

    # Resize to same dimensions
    target = (512, 512)
    before = cv2.resize(before, target)
    after  = cv2.resize(after,  target)

    # Compute SSIM
    score, diff = ssim(before, after, full=True)

    # INVERSE LOGIC:
    # High similarity (≥0.75) = surface UNCHANGED = REPAIR FAILED
    # Low similarity (<0.75)  = surface CHANGED   = REPAIR VERIFIED
    passed = score < 0.75

    sha256 = hashlib.sha256(after_bytes).hexdigest() if passed else None

    return {
        "ssim_score": round(float(score), 4),
        "pass": passed,
        "verdict": "REPAIR_VERIFIED" if passed else "REPAIR_REJECTED",
        "sha256_hash": sha256
    }
```

---

## 7. GIS & AUTO-ROUTING ENGINE

### 7A. The Two-Step Routing Query

```sql
-- Called by Supabase Trigger on ticket INSERT
-- Step 1: GPS Point → Prabhag (1–26)
SELECT p.id, p.zone_id
FROM prabhags p
WHERE ST_Covers(
  p.boundary::geometry,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geometry
)
LIMIT 1;

-- Step 2: Zone → Assigned JE (load-balanced)
SELECT p.id AS je_id
FROM profiles p
WHERE p.role = 'je'
  AND p.zone_id = $zone_id
  AND p.is_active = true
ORDER BY (
  SELECT COUNT(*) FROM tickets t
  WHERE t.assigned_je = p.id
    AND t.status NOT IN ('resolved', 'rejected')
) ASC
LIMIT 1;
```

### 7B. Zone → Prabhag Mapping (Seed Data)

```sql
-- Zone 1: Fort Area, Siddheshwar, Gandhi Chowk, Raviwar Peth
-- Prabhags: 1, 2, 3 (approximate — confirm with SMC GIS)
UPDATE prabhags SET zone_id = 1 WHERE id IN (1, 2, 3);

-- Zone 2: Railway Lines, Civil Lines, North Sadar Bazar
UPDATE prabhags SET zone_id = 2 WHERE id IN (4, 5, 6);

-- Zone 3: MIDC Road, Akkalkot Road, New Paccha Peth
UPDATE prabhags SET zone_id = 3 WHERE id IN (7, 8, 9, 10);

-- Zone 4: Majrewadi, Nai Zindagi, Bijapur Road
UPDATE prabhags SET zone_id = 4 WHERE id IN (11, 12, 13);

-- Zone 5: Shelgi, Degaon, Vijapur Road
UPDATE prabhags SET zone_id = 5 WHERE id IN (14, 15, 16);

-- Zone 6: Jule Solapur, Nehru Nagar
UPDATE prabhags SET zone_id = 6 WHERE id IN (17, 18, 19);

-- Zone 7: Ashok Chowk, Forest Area, Kumthe
UPDATE prabhags SET zone_id = 7 WHERE id IN (20, 21, 22, 23);

-- Zone 8: Saat Rasta, Murarji Peth, Market Yard
UPDATE prabhags SET zone_id = 8 WHERE id IN (24, 25, 26);
```

### 7C. Spatial Deduplication (50m Radius)

```sql
-- Before creating a new ticket, check for duplicates
SELECT id, ticket_ref, status, photo_before
FROM tickets
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  50  -- 50 metres
)
AND status NOT IN ('resolved', 'rejected')
ORDER BY created_at DESC
LIMIT 1;

-- If duplicate found: append new photo to existing ticket's photo_before array
UPDATE tickets
SET photo_before = array_append(photo_before, $new_photo_url),
    is_duplicate = false  -- Master ticket keeps all evidence
WHERE id = $master_ticket_id;
```

---

## 8. MOBILE APP DESIGN (FLUTTER)

### 8A. Project Structure

```
lib/
├── main.dart                    # Entry point, role-based routing
├── app.dart                     # MaterialApp, theme, routes
├── config/
│   ├── supabase_config.dart
│   ├── app_constants.dart       # API URLs, thresholds (20m, 0.75 SSIM)
│   └── theme.dart
├── models/
│   ├── ticket.dart
│   ├── profile.dart
│   ├── zone.dart
│   ├── rate_card.dart
│   └── ticket_event.dart
├── services/
│   ├── auth_service.dart        # OTP login, role detection
│   ├── ticket_service.dart      # CRUD operations
│   ├── ai_service.dart          # FastAPI calls
│   ├── location_service.dart    # GPS, geofence check
│   ├── notification_service.dart # FCM
│   ├── storage_service.dart     # Supabase Storage upload
│   └── offline_cache.dart       # Hive local storage
├── screens/
│   ├── auth/
│   │   ├── otp_screen.dart
│   │   └── role_router.dart     # Routes to correct mode
│   ├── citizen/
│   │   ├── citizen_home.dart    # "Report Damage" big button
│   │   ├── camera_screen.dart   # TFLite pre-check
│   │   ├── report_form.dart     # GPS + photo confirm
│   │   ├── ai_result_dialog.dart # "Pothole Detected. Severity: HIGH"
│   │   └── complaint_tracker.dart # Pizza Tracker status bar
│   ├── je/
│   │   ├── je_home.dart         # Map-centric task list
│   │   ├── ticket_detail_je.dart # Verification screen
│   │   ├── geofence_guard.dart  # 20m lock screen
│   │   ├── dimension_input.dart # Length × Width → auto cost
│   │   ├── rate_card_widget.dart # Locked price display
│   │   └── dept_toggle.dart     # Multi-department reassignment
│   └── contractor/
│       ├── contractor_home.dart # Work order list
│       ├── job_detail.dart      # Job info + ghost camera trigger
│       └── ghost_camera.dart    # The winning feature
├── widgets/
│   ├── epdo_badge.dart          # Color-coded severity badge
│   ├── status_tracker.dart      # Pizza tracker component
│   ├── photo_compare.dart       # Before/after side-by-side
│   ├── offline_banner.dart      # Orange "OFFLINE MODE" banner
│   └── zone_map_widget.dart     # flutter_map component
└── providers/
    ├── auth_provider.dart
    ├── ticket_provider.dart
    └── location_provider.dart
```

### 8B. Critical Screen Implementations

#### Citizen Mode — Camera Screen with TFLite
```dart
class CameraScreen extends StatefulWidget { ... }

// On each camera frame preview:
Future<void> _runOnDeviceDetection(CameraImage frame) async {
  final result = await _tfliteClassifier.classify(frame);
  
  setState(() {
    _isRoadDetected = result['road'] > 0.60;
    _feedbackText = _isRoadDetected
        ? "Road detected ✓"
        : "Point camera at damaged road";
  });
}

// Capture button only active when road detected
ElevatedButton(
  onPressed: _isRoadDetected ? _captureAndUpload : null,
  child: Text("Capture Damage"),
)
```

#### JE Mode — Geofence Guard
```dart
class GeofenceGuard extends StatelessWidget {
  final Ticket ticket;
  final double jeLatitude;
  final double jeLongitude;

  @override
  Widget build(BuildContext context) {
    final distance = Geolocator.distanceBetween(
      jeLatitude, jeLongitude,
      ticket.latitude, ticket.longitude,
    );

    final isWithinFence = distance <= 20.0;  // 20 metre threshold

    return Column(children: [
      // Distance indicator
      DistanceMeter(current: distance, threshold: 20.0),

      // Verify button — disabled until within 20m
      ElevatedButton(
        onPressed: isWithinFence
            ? () => _proceedToVerification()
            : null,   // Greyed out
        style: ButtonStyle(
          backgroundColor: MaterialStateProperty.all(
            isWithinFence ? AppColors.green : AppColors.grey,
          ),
        ),
        child: Text(
          isWithinFence
              ? "Verify Site ✓"
              : "Move closer (${distance.toStringAsFixed(0)}m away)",
        ),
      ),
    ]);
  }
}
```

#### JE Mode — Rate Card Lock
```dart
class DimensionInputScreen extends StatefulWidget { ... }

// In state:
RateCard? _lockedRateCard;  // Fetched once. Never changes.
double _estimatedCost = 0;

@override
void initState() {
  super.initState();
  _fetchLockedRateCard();   // Fetch on screen open
}

Future<void> _fetchLockedRateCard() async {
  final card = await RateCardService.getActive(
    zoneId: widget.ticket.zoneId,
    workType: widget.ticket.repairType,
    fiscalYear: '2024-25',
  );
  setState(() => _lockedRateCard = card);
}

void _onDimensionsChanged() {
  final l = double.tryParse(_lengthController.text) ?? 0;
  final w = double.tryParse(_widthController.text) ?? 0;
  final area = l * w;

  setState(() {
    _estimatedCost = area * (_lockedRateCard?.ratePerUnit ?? 0);
  });
}

// Cost field — completely read-only
TextField(
  controller: TextEditingController(
    text: '₹${_estimatedCost.toStringAsFixed(2)}'
  ),
  readOnly: true,  // LOCKED
  decoration: InputDecoration(
    labelText: 'Estimated Cost (Auto-calculated)',
    suffixIcon: Icon(Icons.lock, color: Colors.orange),
    helperText: 'Rate: ₹${_lockedRateCard?.ratePerUnit}/sqm — FY 2024-25',
  ),
  style: TextStyle(
    fontWeight: FontWeight.bold,
    color: Colors.orange.shade800,
  ),
)
```

#### Contractor Mode — Ghost Camera
```dart
class GhostCameraScreen extends StatefulWidget {
  final String beforePhotoUrl;  // The original damage photo
  final String ticketId;
  ...
}

@override
Widget build(BuildContext context) {
  return Scaffold(
    body: Stack(
      fit: StackFit.expand,
      children: [
        // Layer 1: Live camera feed
        CameraPreview(_controller),

        // Layer 2: Before photo ghost overlay
        Opacity(
          opacity: 0.45,
          child: Image.network(
            widget.beforePhotoUrl,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
          ),
        ),

        // Layer 3: Alignment UI
        Positioned(
          bottom: 120,
          left: 0, right: 0,
          child: Center(
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                "Align road features with ghost outline",
                style: TextStyle(color: Colors.white, fontSize: 14),
              ),
            ),
          ),
        ),

        // Layer 4: Capture button
        Positioned(
          bottom: 40,
          left: 0, right: 0,
          child: Center(
            child: GestureDetector(
              onTap: _captureAfterPhoto,
              child: Container(
                width: 70, height: 70,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 4),
                  color: Colors.white24,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
```

---

## 9. WEB DASHBOARD DESIGN (NEXT.JS)

### 9A. Project Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, dark theme
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx                # Sidebar + header
│   │   ├── page.tsx                  # Default → redirect by role
│   │   ├── commissioner/
│   │   │   ├── page.tsx              # War room heatmap
│   │   │   └── vendors/page.tsx      # Contractor scorecards
│   │   ├── zone-officer/
│   │   │   ├── page.tsx              # Kanban board
│   │   │   └── budget/page.tsx       # Budget meter
│   │   ├── je/
│   │   │   └── page.tsx              # JE web view (secondary)
│   │   ├── accounts/
│   │   │   └── page.tsx              # Bill approval queue
│   │   └── tickets/
│   │       ├── [id]/page.tsx         # Ticket detail + before/after
│   │       └── page.tsx              # Full ticket table
├── components/
│   ├── map/
│   │   ├── WarRoomMap.tsx            # Mapbox dark heatmap
│   │   ├── RealtimePinLayer.tsx      # Supabase Realtime pins
│   │   └── ZoneBoundaryLayer.tsx     # Zone polygon overlay
│   ├── dashboard/
│   │   ├── KanbanBoard.tsx
│   │   ├── BudgetTicker.tsx          # Live ₹X / ₹Y bar
│   │   ├── VendorScorecard.tsx
│   │   ├── ResolutionChart.tsx
│   │   └── LiveTicker.tsx            # Scrolling ticket updates
│   ├── tickets/
│   │   ├── BeforeAfterSlider.tsx     # Drag to compare photos
│   │   ├── TicketTimeline.tsx        # Audit trail visualization
│   │   ├── EpdoBadge.tsx
│   │   └── DepartmentBadge.tsx
│   └── ui/                           # shadcn components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   └── server.ts                 # Server component client
│   ├── queries/
│   │   ├── tickets.ts
│   │   ├── zones.ts
│   │   └── analytics.ts
│   └── realtime/
│       └── ticket-subscription.ts    # Supabase Realtime hook
└── types/
    └── database.types.ts             # Generated from Supabase
```

### 9B. The War Room Map (Commissioner)

```typescript
// components/map/WarRoomMap.tsx
'use client'

import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'
import { useRealtimeTickets } from '@/lib/realtime/ticket-subscription'

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',  // Red
  HIGH:     '#F97316',  // Orange
  MEDIUM:   '#EAB308',  // Yellow
  LOW:      '#22C55E',  // Green
}

export function WarRoomMap() {
  const mapRef = useRef<mapboxgl.Map>()
  const { tickets } = useRealtimeTickets()  // Live updates

  useEffect(() => {
    mapRef.current = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/dark-v11',  // Dark theme
      center: [75.9064, 17.6823],  // Solapur city center
      zoom: 12,
    })

    // Add Zone boundary polygons
    mapRef.current.on('load', () => {
      // Heatmap layer
      mapRef.current!.addLayer({
        id: 'complaint-heat',
        type: 'heatmap',
        source: 'tickets',
        paint: {
          'heatmap-weight': [
            'interpolate', ['linear'],
            ['get', 'epdo_score'],
            0, 0, 10, 1
          ],
          'heatmap-color': [
            'interpolate', ['linear'],
            ['heatmap-density'],
            0,   'rgba(0,0,255,0)',
            0.4, '#FCD34D',
            0.8, '#F97316',
            1,   '#EF4444'
          ],
          'heatmap-radius': 25,
        }
      })
    })
  }, [])

  // React to realtime ticket updates
  useEffect(() => {
    if (!mapRef.current || !tickets) return
    const source = mapRef.current.getSource('tickets') as mapboxgl.GeoJSONSource
    source?.setData(ticketsToGeoJSON(tickets))
  }, [tickets])

  return <div id="map" className="w-full h-full rounded-lg" />
}
```

### 9C. Realtime Subscription Hook

```typescript
// lib/realtime/ticket-subscription.ts
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useRealtimeTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    supabase
      .from('tickets')
      .select('id, latitude, longitude, severity_tier, epdo_score, status, department_id, ticket_ref')
      .neq('status', 'resolved')
      .then(({ data }) => setTickets(data ?? []))

    // Subscribe to changes
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', {
        event: '*',             // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'tickets',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTickets(prev => [...prev, payload.new as Ticket])
        }
        if (payload.eventType === 'UPDATE') {
          setTickets(prev =>
            prev.map(t => t.id === payload.new.id ? payload.new as Ticket : t)
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return { tickets }
}
```

### 9D. Budget Ticker Component

```typescript
// components/dashboard/BudgetTicker.tsx
export function BudgetTicker({ zoneId }: { zoneId: number }) {
  const { data } = useBudgetConsumption(zoneId)

  const used = data?.consumed ?? 0
  const total = data?.allocated ?? 5000000  // ₹50L default
  const pct = (used / total) * 100
  const color = pct > 80 ? 'red' : pct > 60 ? 'orange' : 'green'

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
      <div className="flex justify-between mb-2">
        <span className="text-zinc-400 text-sm">Zone Budget Consumed</span>
        <span className={`text-${color}-400 font-mono font-bold`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-zinc-700 rounded-full h-3">
        <div
          className={`bg-${color}-500 h-3 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-zinc-500 text-xs">
          ₹{(used/100000).toFixed(1)}L used
        </span>
        <span className="text-zinc-500 text-xs">
          ₹{(total/100000).toFixed(1)}L allocated
        </span>
      </div>
    </div>
  )
}
```

---

## 10. AUTHENTICATION & RBAC

### Role Detection Flow
```
User opens app
    ↓
OTP Login (Supabase Auth)
    ↓
Query profiles table: SELECT role, zone_id WHERE id = auth.uid()
    ↓
Route to correct interface:
  'citizen'                → Citizen Mode (Flutter)
  'je'                     → JE Field Mode (Flutter)
  'contractor'             → Contractor Mode (Flutter)
  'de'                     → Web Dashboard / DE view
  'assistant_commissioner' → Web Dashboard / Zone Officer view
  'city_engineer'          → Web Dashboard / Admin view
  'commissioner'           → Web Dashboard / War Room view
  'accounts'               → Web Dashboard / Billing view
  'super_admin'            → Web Dashboard / Full control
```

### RLS Summary Table
| Role | tickets | ticket_events | profiles | rate_cards | bills |
|---|---|---|---|---|---|
| citizen | Own only | Own tickets | Own | Read | None |
| je | Own zone | Own zone | Own | Read | None |
| contractor | Assigned | Assigned | Own | Read | Own |
| de | Own zone | Own zone | Zone | Read | Zone |
| asst_commissioner | Own zone | Own zone | Zone | Read | Zone |
| city_engineer | All | All | All | Write | All |
| commissioner | All (read) | All | All (read) | Read | All (read) |
| accounts | audit_pending+ | All | None | None | All |
| super_admin | All | All | All | All | All |

---

## 11. REAL-TIME ENGINE

### Supabase Realtime — What Gets Subscribed

```typescript
// 1. New ticket appears on dashboard map
channel.on('postgres_changes', { event: 'INSERT', table: 'tickets' }, ...)

// 2. Ticket status changes → Kanban column moves
channel.on('postgres_changes', { event: 'UPDATE', table: 'tickets',
  filter: `zone_id=eq.${zoneId}` }, ...)

// 3. Citizen app — own complaint status updates
channel.on('postgres_changes', { event: 'UPDATE', table: 'tickets',
  filter: `id=eq.${ticketId}` }, ...)

// 4. JE dashboard — new assignment notification
channel.on('postgres_changes', { event: 'UPDATE', table: 'tickets',
  filter: `assigned_je=eq.${jeId}` }, ...)
```

---

## 12. NOTIFICATION SYSTEM

### Trigger → Channel → Message Matrix

| Trigger Event | Channel | Recipient | Message |
|---|---|---|---|
| Ticket created | SMS (MSG91) | Citizen | "SMC: Complaint SSR-Z4-0089 received. Severity: HIGH. We'll update you." |
| JE assigned | Push (FCM) | JE | "New CRITICAL pothole in Prabhag 12. Tap to view." |
| JE verified | SMS | Citizen | "SMC: Complaint verified. Repair work assigned to contractor." |
| SLA L1 breach | Push + SMS | DE | "ALERT: Ticket SSR-Z4-0089 unresolved for 12h. Immediate action required." |
| Resolved | SMS | Citizen | "SMC: Road repair at your location is complete. Rate your experience." |

### MSG91 Edge Function
```typescript
// supabase/functions/notify-status/index.ts
const templates: Record<string, string> = {
  'verified':    'SMC Solapur: Complaint {ref} verified. Contractor assigned within 24 hours.',
  'in_progress': 'SMC Solapur: Repair work started for {ref}. Track: solapur.gov.in/track/{ref}',
  'resolved':    'SMC Solapur: Road repair complete for {ref}. Thank you for reporting.',
  'escalated':   'SMC Solapur: Complaint {ref} escalated due to delay. Supervisor notified.',
}

await fetch('https://api.msg91.com/api/v5/flow/', {
  method: 'POST',
  headers: { authkey: Deno.env.get('MSG91_AUTH_KEY')! },
  body: JSON.stringify({
    template_id: MSG91_TEMPLATE_IDS[status],
    mobiles: `91${phone}`,
    var1: ticketRef,
  })
})
```

---

## 13. DIGITAL MEASUREMENT BOOK & PDF GENERATION

### PDF Structure (Auto-generated per bill submission)

```
┌────────────────────────────────────────────────────────────┐
│          SOLAPUR MUNICIPAL CORPORATION                      │
│       DIGITAL MEASUREMENT BOOK — ROAD REPAIRS              │
│  Bill Ref: BILL-Z4-2025-0012  |  Zone: Zone 4 — Majrewadi │
│  Contractor: S.S. Ekbote Construction                       │
│  Period: 01-Jun-2025 to 30-Jun-2025                        │
├────┬────────────┬──────────┬───────┬───────┬───────┬───────┤
│ SN │ Job Order  │ Location │ Dims  │ Sqm   │ Rate  │ Amt   │
├────┼────────────┼──────────┼───────┼───────┼───────┼───────┤
│  1 │ JO-Z4-0089 │ Prabhag12│2×1.5m │ 3.0   │ ₹450  │₹1,350 │
│    │            │ [PHOTO PAIR: Before | After]              │
│    │            │ SSIM: 0.42 | Hash: a3f8c... | VERIFIED ✓ │
├────┼────────────┼──────────┼───────┼───────┼───────┼───────┤
│  2 │ JO-Z4-0091 │ Prabhag11│3×2.0m │ 6.0   │ ₹450  │₹2,700 │
│    │            │ [PHOTO PAIR: Before | After]              │
│    │            │ SSIM: 0.38 | Hash: b7d2e... | VERIFIED ✓ │
├────┴────────────┴──────────┴───────┴───────┴───────┼───────┤
│                                       TOTAL AMOUNT: │₹4,050 │
├────────────────────────────────────────────────────┴───────┤
│ Approved by JE: [Name] [Signature]  Date: __/__/____        │
│ Verified by DE: [Name] [Signature]  Date: __/__/____        │
│ Accounts Auth:  [Name] [Signature]  Date: __/__/____        │
└────────────────────────────────────────────────────────────┘
```

### PDF Generation (Edge Function)
```typescript
// Uses: jsPDF + Supabase Storage
// Triggered when contractor submits bill

const pdf = new jsPDF()
// Header, table rows, photo embeds, signature blocks
// Save to: storage/bills/BILL-Z4-2025-0012.pdf
// Update contractor_bills.pdf_url
// Notify accounts user via FCM + email
```

---

## 14. SLA & AUTO-ESCALATION ENGINE

### Cron-Based Escalation (Supabase pg_cron)

```sql
-- Run every 30 minutes
SELECT cron.schedule(
  'escalation-check',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[project].supabase.co/functions/v1/escalate-sla',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_key') || '"}',
    body := '{}'
  )
  $$
);
```

```typescript
// supabase/functions/escalate-sla/index.ts
// For each open ticket past SLA threshold:

const breachedTickets = await supabase.from('tickets')
  .select('*, sla_config(*)')
  .not('status', 'in', ['resolved', 'rejected'])
  .lt('created_at', new Date(Date.now() - sla.escalate_l1_hours * 3600000).toISOString())

for (const ticket of breachedTickets) {
  // Increment escalation_count
  // Notify next level in hierarchy
  // Insert ticket_event with type: 'escalation'
  // Update ticket.status = 'escalated' if needed
}
```

---

## 15. FILE STRUCTURE (COMPLETE)

```
ssr-system/
├── README.md
├── .env.example
│
├── supabase/                          # Supabase project config
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_extensions.sql
│   │   ├── 002_enums.sql
│   │   ├── 003_master_tables.sql
│   │   ├── 004_core_tables.sql
│   │   ├── 005_indexes.sql
│   │   ├── 006_functions.sql
│   │   ├── 007_triggers.sql
│   │   ├── 008_rls.sql
│   │   └── 009_seed_data.sql
│   └── functions/
│       ├── ingest-complaint/
│       ├── verify-geofence/
│       ├── notify-status/
│       ├── escalate-sla/
│       ├── generate-job-order/
│       ├── generate-bill-pdf/
│       └── whatsapp-webhook/
│
├── ai-service/                        # FastAPI Python microservice
│   ├── main.py
│   ├── requirements.txt
│   ├── models/
│   │   └── pothole_yolov8n.pt         # Fine-tuned model
│   ├── routers/
│   │   ├── detect.py
│   │   ├── verify.py
│   │   └── epdo.py
│   ├── services/
│   │   ├── yolo_service.py
│   │   ├── ssim_service.py
│   │   ├── epdo_service.py
│   │   └── imd_service.py
│   └── Dockerfile
│
├── mobile/                            # Flutter app
│   ├── pubspec.yaml
│   ├── assets/
│   │   └── models/
│   │       └── road_classifier.tflite
│   └── lib/                           # (Full structure in Section 8A)
│
└── web-dashboard/                     # Next.js dashboard
    ├── package.json
    ├── next.config.ts
    ├── tailwind.config.ts
    └── src/                           # (Full structure in Section 9A)
```

---

## 16. ENVIRONMENT CONFIGURATION

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Never expose to client

# AI Service
AI_SERVICE_URL=https://ssr-ai.railway.app
AI_SERVICE_SECRET=shared-secret-between-edge-fn-and-fastapi

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
MAPBOX_SECRET_TOKEN=sk.eyJ1...

# Notifications
MSG91_AUTH_KEY=...
MSG91_TEMPLATE_VERIFIED=...
MSG91_TEMPLATE_RESOLVED=...
FCM_SERVER_KEY=...

# Weather
IMD_API_KEY=...                     # Or OpenWeatherMap fallback

# Roboflow (dev/backup)
ROBOFLOW_API_KEY=...
ROBOFLOW_MODEL_ID=pothole-detection-gv5e7/3
```

---

## 17. DEPLOYMENT ARCHITECTURE

```
HACKATHON / PILOT DEPLOYMENT:

┌─────────────────────────────────────────────────┐
│  Supabase Free Tier                              │
│  • 500MB PostgreSQL (sufficient for 50k tickets)│
│  • 1GB Storage (sufficient for ~5,000 photos)   │
│  • 2M Edge Function invocations/month            │
│  • Realtime connections: 200 concurrent          │
│  Cost: ₹0/month                                 │
├─────────────────────────────────────────────────┤
│  FastAPI AI Service → Railway.app Free Tier      │
│  • 512MB RAM (sufficient for YOLOv8n)            │
│  • HTTPS auto-provisioned                        │
│  • Always-on (no cold starts)                    │
│  Cost: ₹0/month (500 hours free)                │
├─────────────────────────────────────────────────┤
│  Next.js Dashboard → Vercel Free Tier            │
│  • Serverless functions                          │
│  • CDN for static assets                         │
│  • Custom domain support                         │
│  Cost: ₹0/month                                 │
└─────────────────────────────────────────────────┘

PRODUCTION DEPLOYMENT (Post-hackathon):

Supabase Pro           → ₹2,000/month
Railway Starter        → ₹800/month
Vercel Pro             → ₹1,600/month
MSG91 SMS              → ₹0.20/SMS (~₹400/month at 2000 SMS)
Mapbox                 → ₹0 (50k map loads/month free)
Total:                 → ~₹5,000/month for city-scale pilot
```

---

## 18. DEMO SEED DATA STRATEGY

```sql
-- 50 demo tickets across all 8 zones with accurate Solapur GPS

-- Zone 1 (Siddheshwar area): lat 17.6951, lng 75.9093
-- Zone 2 (Civil Lines): lat 17.6782, lng 75.9103
-- Zone 3 (MIDC Road): lat 17.6623, lng 75.9214
-- Zone 4 (Majrewadi): lat 17.6823, lng 75.9064
-- Zone 5 (Shelgi): lat 17.7012, lng 75.9182
-- Zone 6 (Jule Solapur): lat 17.6534, lng 75.9301
-- Zone 7 (Ashok Chowk): lat 17.6891, lng 75.9245
-- Zone 8 (Saat Rasta): lat 17.6745, lng 75.9187

-- Demo accounts
-- citizen@ssr.demo         / Demo@SSR2025
-- je.zone4@ssr.demo        / Demo@SSR2025
-- contractor.z4@ssr.demo   / Demo@SSR2025
-- zo.zone4@ssr.demo        / Demo@SSR2025 (Zone Officer)
-- commissioner@ssr.demo    / Demo@SSR2025
-- accounts@ssr.demo        / Demo@SSR2025
```

---

## 19. BUILD ORDER & MILESTONES

```
STAGE 0 → STAGE 1: Foundation (Days 1–2)
  ✦ Supabase project setup
  ✦ Run all migrations (001 → 009)
  ✦ Seed Zone + Prabhag data
  ✦ Create demo user accounts
  ✦ Verify ST_Within() routing works with test GPS points
  ✦ Seed rate_cards for FY 2024-25
  GATE: Can a GPS point route to the correct Zone?

STAGE 1 → STAGE 2: AI Service (Days 2–3)
  ✦ FastAPI skeleton
  ✦ /detect endpoint with YOLOv8n
  ✦ /verify-repair endpoint with SSIM
  ✦ /epdo-score endpoint
  ✦ Deploy to Railway
  ✦ Test with 10 real Solapur road images
  GATE: AI returns severity + EPDO score in <3 seconds?

STAGE 2 → STAGE 3: Flutter App Core (Days 3–5)
  ✦ Supabase auth (OTP)
  ✦ Role-based routing
  ✦ Citizen: Camera + TFLite pre-check + GPS upload
  ✦ Citizen: Status tracker (Pizza Tracker)
  ✦ JE: Geofence guard (20m lock)
  ✦ JE: Dimension input + Rate Card lock
  ✦ JE: Multi-department toggle (Red→Blue pin)
  ✦ Contractor: Ghost camera overlay
  GATE: Full happy path on physical device?

STAGE 3 → STAGE 4: Web Dashboard (Days 5–6)
  ✦ Next.js + Supabase SSR setup
  ✦ Dark theme Mapbox war room map
  ✦ Supabase Realtime pin drops
  ✦ Kanban board (Zone Officer)
  ✦ Budget ticker
  ✦ Before/After slider
  ✦ Vendor scorecard table
  GATE: Realtime demo works (phone → laptop in <2 seconds)?

STAGE 4 → STAGE 5: Notifications + PDF (Day 6–7)
  ✦ MSG91 SMS integration
  ✦ FCM push notifications
  ✦ PDF bill generation
  ✦ Accounts approval screen
  GATE: End-to-end demo runs without manual intervention?

STAGE 5: Polish + Demo Prep (Day 7)
  ✦ Seed 50 demo complaints
  ✦ Rehearse 4-minute demo script
  ✦ Prepare fallback (screenshots if connectivity fails)
  ✦ Verify all 3 "wow moments" work on projector
```

---

*SSR Technical Design Document v1.0 — रोड NIRMAN Team — SAMVED Hackathon 2026*
*MIT Academy of Engineering, Pune*
