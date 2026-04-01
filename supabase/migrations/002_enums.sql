-- ============================================================
-- SSR SYSTEM — MIGRATION 002: ENUM TYPES
-- Solapur Smart Roads — रोड NIRMAN
-- ============================================================
-- All custom enum types used across the schema.
-- Enums enforce data integrity at the DB level — no invalid
-- status strings can ever enter the system.
-- ============================================================

-- Ticket lifecycle states
-- Maps to the unified workflow: O17 from PS objectives
CREATE TYPE ticket_status AS ENUM (
  'open',            -- Citizen submitted, AI processed
  'verified',        -- JE physically verified on-site
  'assigned',        -- Contractor assigned via Job Order
  'in_progress',     -- Contractor has started work
  'audit_pending',   -- After photo uploaded, awaiting SSIM check
  'resolved',        -- SSIM passed + citizen confirmed (or auto-closed)
  'rejected',        -- JE rejected as invalid / not-found
  'escalated',       -- SLA breached, pushed up the chain
  'cross_assigned'   -- Reassigned to another department (Water/MSEDCL)
);

-- 9 roles matching the SSR permission pyramid
-- Maps to RBAC matrix in Section 10 of tech design
CREATE TYPE user_role AS ENUM (
  'citizen',               -- Unlimited, OTP login, no credentials needed
  'je',                    -- Junior Engineer — primary mobile app user (30-40)
  'de',                    -- Deputy Engineer — estimate verifier (8)
  'assistant_commissioner', -- Zone Officer — budget holder (8)
  'city_engineer',         -- HQ Admin — rate card + contractor management (1)
  'commissioner',          -- IAS Officer — strategic view-only (1)
  'contractor',            -- Empaneled firms — vendor portal (~20)
  'accounts',              -- Audit/Accounts — read-only + billing (1)
  'super_admin'            -- SMC IT Dept — full control (1-2)
);

-- Root causes of road damage
-- Used by JE during verification + AI classification
CREATE TYPE damage_cause AS ENUM (
  'heavy_rainfall',           -- Monsoon damage
  'construction_excavation',  -- Ongoing construction activity
  'utility_water',            -- Water Supply pipe leak/burst
  'utility_drainage',         -- Drainage overflow/collapse
  'utility_electricity',      -- MSEDCL cable/pole work
  'utility_telecom',          -- Telecom/cable dig-up
  'poor_construction',        -- Contractor quality failure
  'heavy_vehicular_load',     -- Overloaded trucks
  'general_wear'              -- Natural aging/wear
);

-- EPDO-derived severity classification
-- Determines SLA tier and escalation timeline
CREATE TYPE severity_tier AS ENUM (
  'CRITICAL',   -- EPDO >= 8.0 → 24h SLA
  'HIGH',       -- EPDO >= 5.0 → 48h SLA
  'MEDIUM',     -- EPDO >= 3.0 → 72h SLA
  'LOW'         -- EPDO <  3.0 → 168h (7 day) SLA
);

-- Department codes for multi-department routing
-- Powers the "Not PWD?" toggle (O13)
CREATE TYPE department_code AS ENUM (
  'ROADS',          -- Engineering / Roads (default)
  'WATER_SUPPLY',   -- Water Supply Dept
  'DRAINAGE',       -- Drainage Dept
  'MSEDCL',         -- Maharashtra State Electricity
  'TRAFFIC',        -- Traffic Management
  'DISASTER_MGMT'   -- Disaster Management Cell
);

-- Cost-based approval tier
-- Determines which level of hierarchy approves the work order
-- < ₹50K = JE/SE direct, ₹50K-5L = SE→EE, > ₹5L = Commissioner chain
CREATE TYPE approval_tier AS ENUM (
  'minor',      -- < ₹50,000 — JE/SE approves directly
  'moderate',   -- ₹50K – ₹5L — SE → EE → Work Order
  'major'       -- > ₹5L — EE → Dy.Commr → Commissioner → Tender
);

-- Bill lifecycle states
CREATE TYPE bill_status AS ENUM (
  'draft',            -- Auto-generated, not yet submitted
  'submitted',        -- Contractor submitted for review
  'accounts_review',  -- Accounts dept reviewing photo proof
  'approved',         -- Cheque authorized
  'paid',             -- Payment released
  'rejected'          -- Photo proof insufficient / fraud detected
);
