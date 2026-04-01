# Solapur Smart Roads (SSR) — Supabase Database Setup Guide

## रोड NIRMAN — SAMVED Hackathon 2026

---

## Quick Start

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `ssr-solapur-smart-roads`
3. Region: `South Asia (Mumbai)` — lowest latency for Solapur
4. Save the **Project URL** and **anon key**

### Step 2: Run Migrations (In Order)
Open the **SQL Editor** in Supabase Dashboard and run each file sequentially:

```
001_extensions.sql     → PostGIS, UUID, trigram, cron, crypto
002_enums.sql          → 7 enum types (ticket_status, user_role, etc.)
003_master_tables.sql  → 8 reference tables (zones, prabhags, rate_cards, etc.)
004_core_tables.sql    → 7 core tables (profiles, tickets, events, bills, etc.)
005_indexes.sql        → 40+ performance indexes (GIST, B-tree, GIN)
006_functions.sql      → 10 database functions (routing, EPDO, dedup, etc.)
007_triggers.sql       → 5 triggers (auto-route, auto-ref, audit, computed fields)
008_rls.sql            → 25+ RLS policies (Permission Pyramid)
009_seed_data.sql      → Zone boundaries, demo accounts, Realtime config
```

### Step 3: Create Demo Users
In Supabase Dashboard → Authentication → Users, create these accounts:

| Email | Password | Role |
|---|---|---|
| citizen@ssr.demo | Demo@SSR2025 | citizen |
| je.zone1@ssr.demo | Demo@SSR2025 | je (Zone 1) |
| je.zone4@ssr.demo | Demo@SSR2025 | je (Zone 4) |
| de.zone4@ssr.demo | Demo@SSR2025 | de (Zone 4) |
| contractor.z4@ssr.demo | Demo@SSR2025 | contractor (Zone 4) |
| zo.zone4@ssr.demo | Demo@SSR2025 | assistant_commissioner (Zone 4) |
| cityengineer@ssr.demo | Demo@SSR2025 | city_engineer |
| commissioner@ssr.demo | Demo@SSR2025 | commissioner |
| accounts@ssr.demo | Demo@SSR2025 | accounts |
| superadmin@ssr.demo | Demo@SSR2025 | super_admin |

Then run in SQL Editor:
```sql
SELECT fn_seed_demo_profiles();
```

### Step 4: Create Storage Buckets
Dashboard → Storage → New Bucket:
- `ticket-photos` (Public)
- `after-photos` (Public)
- `je-inspection` (Private)
- `bill-pdfs` (Private)

### Step 5: Enable Realtime
Dashboard → Database → Replication → Enable for:
- `tickets`
- `ticket_events`
- `contractor_bills`
- `notifications`

### Step 6: Verify Setup
Run this test query to verify PostGIS routing works:

```sql
-- Test: Does GPS point route to correct zone?
SELECT z.name, z.id
FROM zones z
WHERE ST_Covers(
  z.boundary::geometry,
  ST_SetSRID(ST_MakePoint(75.9064, 17.6823), 4326)::geometry
);
-- Expected: Zone 4 — Majrewadi (or nearest zone)
```

---

## Schema Overview

### Tables (15 total)

| # | Table | Rows (Demo) | Purpose |
|---|---|---|---|
| 1 | departments | 6 | SMC departments with map pin colors |
| 2 | zones | 8 | Administrative zones with PostGIS boundaries |
| 3 | prabhags | 26 | Election divisions (intermediate GIS layer) |
| 4 | prabhag_zone_mapping | 27 | M:N junction for split prabhags |
| 5 | rate_cards | 7 | Anti-corruption price lock (FY 2025-26) |
| 6 | sla_config | 4 | SLA timers by severity tier |
| 7 | escalation_rules | 7 | DMA auto-escalation rules |
| 8 | chronic_locations | 0 | Hotspot detection (auto-populated) |
| 9 | profiles | 16 | User profiles extending Supabase Auth |
| 10 | contractors | 1 | Contractor company details |
| 11 | tickets | 50 | Core complaint table |
| 12 | ticket_events | ~150 | Immutable audit trail |
| 13 | contractor_bills | 0 | Digital Measurement Book |
| 14 | contractor_metrics | 1 | Vendor Scorecard data |
| 15 | notifications | 0 | SMS/Push notification log |

### Enum Types (7)
`ticket_status` · `user_role` · `damage_cause` · `severity_tier` · `department_code` · `approval_tier` · `bill_status`

### Functions (10)
`fn_assign_zone_and_prabhag` · `fn_assign_je` · `fn_generate_ticket_ref` · `fn_log_status_change` · `fn_calculate_epdo` · `fn_compute_approval_tier` · `fn_ticket_computed_fields` · `fn_check_spatial_duplicate` · `fn_check_chronic_location` · `fn_zone_budget_consumed`

### Triggers (5)
`trg_assign_zone` · `trg_ticket_ref` · `trg_audit_status` · `trg_computed_fields` · `trg_profiles_updated`

---

## Environment Variables

After setup, save these in your `.env`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Key PostGIS Queries

### GPS → Zone Routing
```sql
SELECT z.name FROM zones z
WHERE ST_Covers(z.boundary::geometry, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geometry);
```

### 50m Deduplication
```sql
SELECT * FROM fn_check_spatial_duplicate(:lng, :lat);
```

### Budget Consumption
```sql
SELECT fn_zone_budget_consumed(:zone_id);
```

### Chronic Location Check
```sql
SELECT fn_check_chronic_location(:lng, :lat, :zone_id);
```
