-- ============================================================
-- SSR SYSTEM — MIGRATION 001: EXTENSIONS
-- Solapur Smart Roads — रोड NIRMAN
-- ============================================================
-- Run this FIRST. Extensions must be enabled before any tables.
-- ============================================================

-- PostGIS: Spatial queries — ST_Covers(), ST_DWithin(), Geography types
-- Powers the GPS → Prabhag → Zone auto-routing engine
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigram search for text-based address/landmark lookups
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pg_cron: Scheduled tasks (SLA escalation checks every 30 min)
-- Note: pg_cron is pre-installed on Supabase but needs enabling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- pgcrypto: For gen_random_uuid() and cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
