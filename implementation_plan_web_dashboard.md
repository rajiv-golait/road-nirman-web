# SSR Web Dashboards — Implementation Plan

> **Source of truth:** [Dashboards Plan.md](file:///r:/Road%20Nirman/Dashboards%20Plan.md) + Supabase migrations `002`–`008`
> **Visual reference:** [WebD UI/](file:///r:/Road%20Nirman/WebD%20UI) (Stitch exports — layout direction only)
> **Target path:** `R:\Road Nirman\web-dashboard\`

---

## 1. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 14 App Router + TypeScript | SSR for initial load, client components for interactivity |
| Auth / Data | `@supabase/ssr` + anon key + RLS | All permissions enforced at DB level |
| State | TanStack Query v5 | Cache, revalidation, optimistic updates |
| Maps | Mapbox GL JS | Zone/prabhag boundary overlays, ticket pins |
| Charts | Recharts | KPI charts, trend lines, bar charts |
| Styling | Tailwind CSS v3 | Matches Stitch output; shared design tokens |
| Components | Shadcn/ui (base) + custom layer | Accessible primitives, custom dashboard shells |
| Icons | Material Symbols Outlined | Matches Stitch exports |
| Fonts | Manrope (headlines) + Public Sans (body) + JetBrains Mono (refs) | Matches Stitch design system |

### Environment Variables

```env
# Client-side (used by dashboard app)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=

# Server-only (NOT used by standard dashboard sessions)
# SUPABASE_SERVICE_ROLE_KEY=   ← reserved for admin jobs / report generation only
```

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY` must NEVER be used in standard dashboard sessions. All user-facing reads/writes go through the anon key + RLS. The frontend cannot bypass the ticket state machine or trigger guards.

---

## 2. Data Contract — Typed Models from Supabase Schema

All frontend types are derived directly from the actual migrations. No invented fields.

### 2.1 Enums (from [002_enums.sql](file:///r:/Road%20Nirman/supabase/migrations/002_enums.sql))

```typescript
// ticket_status — the ONLY valid lifecycle states
type TicketStatus =
  | 'open'           // Citizen submitted, AI processed
  | 'verified'       // JE physically verified on-site
  | 'assigned'       // Contractor/Mukadam assigned via Job Order
  | 'in_progress'    // Work has started
  | 'audit_pending'  // After photo uploaded, awaiting SSIM check
  | 'resolved'       // SSIM passed + citizen confirmed
  | 'rejected'       // JE rejected as invalid
  | 'escalated'      // SLA breached, pushed up the chain
  | 'cross_assigned' // Reassigned to another department

// Display labels for UI (shared constant)
const STATUS_DISPLAY: Record<TicketStatus, string> = {
  open:           'Received',
  verified:       'Verified',
  assigned:       'Repair Assigned',
  in_progress:    'Fixing',
  audit_pending:  'Quality Check',
  resolved:       'Resolved',
  rejected:       'Rejected',
  escalated:      'Escalated',
  cross_assigned: 'Cross-Assigned',
}

// bill_status — contractor billing lifecycle
type BillStatus = 'draft' | 'submitted' | 'accounts_review' | 'approved' | 'paid' | 'rejected'

// severity_tier — EPDO-derived
type SeverityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

// user_role — 13 roles in the system
type UserRole =
  | 'citizen' | 'je' | 'mukadam' | 'ae' | 'de' | 'ee'
  | 'assistant_commissioner' | 'city_engineer' | 'commissioner'
  | 'standing_committee' | 'contractor' | 'accounts' | 'super_admin'

// approval_tier — cost-based
type ApprovalTier = 'minor' | 'moderate' | 'major'
```

### 2.2 Core Models (from [004_core_tables.sql](file:///r:/Road%20Nirman/supabase/migrations/004_core_tables.sql))

```typescript
interface Profile {
  id: string              // UUID, FK to auth.users
  full_name: string
  phone: string | null
  email: string | null
  role: UserRole
  zone_id: number | null  // For zone-scoped roles
  department_id: number
  employee_id: string | null
  designation: string | null
  is_active: boolean
  opi_score: number | null
  opi_zone: 'green' | 'yellow' | 'red' | null
  opi_last_computed: string | null
}

interface Ticket {
  id: string
  ticket_ref: string       // "SSR-Z4-P12-2025-0089"
  // Reporter
  citizen_id: string | null
  citizen_name: string | null
  source_channel: string
  // Location
  latitude: number
  longitude: number
  address_text: string | null
  road_name: string | null
  prabhag_id: number | null
  zone_id: number | null
  // Classification
  damage_type: string | null
  damage_cause: string | null
  // AI Analysis
  epdo_score: number | null
  severity_tier: SeverityTier | null
  total_potholes: number | null
  ai_confidence: number | null
  // Evidence
  photo_before: string[]        // ← ARRAY in DB; UI uses first image as primary
  photo_after: string | null    // ← single string
  photo_je_inspection: string | null
  // Workflow
  status: TicketStatus
  assigned_je: string | null
  assigned_contractor: string | null   // XOR with assigned_mukadam
  assigned_mukadam: string | null      // XOR with assigned_contractor
  approval_tier: ApprovalTier | null
  // JE Verification
  dimensions: { length_m: number; width_m: number; depth_m: number; area_sqm: number } | null
  work_type: string | null
  rate_card_id: string | null
  rate_per_unit: number | null
  estimated_cost: number | null
  job_order_ref: string | null
  // SSIM
  ssim_score: number | null
  ssim_pass: boolean | null     // INVERSE: < 0.75 = PASS (surface changed)
  verification_hash: string | null
  // Resolution
  resolved_at: string | null
  resolved_in_hours: number | null
  escalation_count: number
  sla_breach: boolean
  warranty_expiry: string | null
  // Citizen Feedback
  citizen_confirmed: boolean | null
  citizen_rating: number | null   // 1–5
  // Flags
  is_duplicate: boolean
  is_chronic_location: boolean
  created_at: string
  updated_at: string
}

interface TicketEvent {
  id: string
  ticket_id: string
  actor_id: string | null
  actor_role: UserRole | null
  event_type: string      // 'status_change', 'assignment', 'escalation', etc.
  old_status: TicketStatus | null
  new_status: TicketStatus | null
  notes: string | null
  metadata: Record<string, any> | null
  created_at: string
}

interface ContractorBill {
  id: string
  bill_ref: string           // "BILL-Z4-2025-0012"
  contractor_id: string
  zone_id: number | null
  fiscal_year: string
  total_tickets: number
  total_area_sqm: number
  total_amount: number
  status: BillStatus
  submitted_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  approved_by: string | null
  payment_ref: string | null
  payment_date: string | null
  rejection_reason: string | null
}

interface BillLineItem {
  id: string
  bill_id: string
  ticket_id: string
  work_type: string
  area_sqm: number
  rate_per_unit: number
  line_amount: number        // area_sqm × rate_per_unit (immutable)
  ssim_score: number | null
  ssim_pass: boolean | null
  photo_before: string | null
  photo_after: string | null
  verification_hash: string | null
}

interface ContractorMetrics {
  contractor_id: string
  zone_id: number | null
  total_assigned: number
  total_completed: number
  total_ssim_pass: number
  total_ssim_fail: number
  total_reopen: number
  avg_repair_hours: number | null
  ssim_pass_rate: number | null
  reopen_rate: number | null
  quality_index: number | null
  scorecard_rank: number | null
}
```

### 2.3 Reference Models (from [003_master_tables.sql](file:///r:/Road%20Nirman/supabase/migrations/003_master_tables.sql))

```typescript
interface Zone {
  id: number               // 1–8
  name: string             // "Zone 4 — Majrewadi"
  name_marathi: string
  key_areas: string
  annual_road_budget: number
  budget_consumed: number
  centroid_lat: number
  centroid_lng: number
}

interface Prabhag {
  id: number               // 1–26
  name: string
  zone_id: number
  is_split: boolean
}

interface RateCard {
  id: string
  fiscal_year: string
  work_type: string        // "Hot Mix Patching", etc.
  unit: string             // "sqm", "running_meter", "unit"
  rate_per_unit: number
  is_active: boolean
}

interface SlaConfig {
  severity: SeverityTier
  response_hours: number
  resolution_hours: number
  escalate_l1_hours: number   // → DE
  escalate_l2_hours: number   // → AC
  escalate_l3_hours: number   // → CE
}

interface EscalationRule {
  rule_number: number         // 1–7
  rule_name: string
  trigger_hours: number
  from_status: TicketStatus | null
  escalate_to_role: UserRole | null
}

interface ChronicLocation {
  id: string
  latitude: number
  longitude: number
  address_text: string | null
  zone_id: number | null
  complaint_count: number
  is_flagged: boolean
}

interface Contractor {
  id: string
  company_name: string
  zone_ids: number[]
  is_blacklisted: boolean
  defect_flags: number       // 3 → auto-blacklisted
}
```

---

## 3. Permission Matrix — What Each Web Role Can Actually Do

Derived from [008_rls.sql](file:///r:/Road%20Nirman/supabase/migrations/008_rls.sql) and trigger guards.

> [!IMPORTANT]
> The frontend ONLY exposes actions that the backend RLS + triggers already permit. If a button would be rejected by the DB, it must not appear in the UI.

### 3.1 Ticket Visibility (SELECT)

| Role | Scope | Source Policy |
|------|-------|---------------|
| `je` | Zone-scoped (`zone_id = user.zone_id`) | `tickets_je_select` |
| `ae` | Zone-scoped | `tickets_ae_select` |
| `de` | Zone-scoped | `tickets_de_select` |
| `assistant_commissioner` | Zone-scoped | `tickets_ac_select` |
| `ee` | **All tickets** (city-wide) | `tickets_admin_select` |
| `city_engineer` | **All tickets** | `tickets_admin_select` |
| `commissioner` | **All tickets** | `tickets_admin_select` |
| `standing_committee` | **All tickets** | `tickets_admin_select` |
| `accounts` | Only `audit_pending` + `resolved` tickets | `tickets_accounts_select` |
| `super_admin` | **All tickets** | `tickets_admin_select` |

### 3.2 Ticket Mutations (UPDATE)

| Role | Can Update? | Constraint |
|------|-------------|------------|
| `je` | ✅ Zone-scoped | Trigger guards enforce valid transitions |
| `ae` | ✅ Zone-scoped | Trigger guards enforce valid transitions |
| `de` | ✅ Zone-scoped | Trigger guards enforce valid transitions |
| `assistant_commissioner` | ✅ Zone-scoped | Trigger guards enforce valid transitions |
| `ee` | ✅ All tickets | `tickets_admin_update` |
| `city_engineer` | ✅ All tickets | `tickets_admin_update` |
| `super_admin` | ✅ All tickets | `tickets_admin_update` |
| `commissioner` | ❌ **Read-only** | No UPDATE policy |
| `standing_committee` | ❌ **Read-only** | No UPDATE policy |
| `accounts` | ❌ **Read-only on tickets** | Only SELECT on `audit_pending`/`resolved` |

### 3.3 Bill Visibility & Mutations

| Role | SELECT | UPDATE |
|------|--------|--------|
| `accounts` | ✅ All bills | ✅ All bills (approve/reject) |
| `standing_committee` | ✅ All bills | ❌ **Read-only** |
| `commissioner` | ✅ All bills | ❌ **Read-only** |
| `assistant_commissioner` | ✅ Zone bills only | ❌ |
| `ee` | ✅ All bills | ✅ |
| `city_engineer` | ✅ All bills | ✅ |
| `super_admin` | ✅ All bills | ✅ |

> [!WARNING]
> **Standing Committee has ZERO mutation capabilities anywhere in the system.** No UPDATE policies exist for this role on any table. The UI must never render action buttons (approve, reject, assign, etc.) for this role.

---

## 4. Shared Component Architecture

### 4.1 Dashboard Shell

A single `DashboardShell` component wrapping all 10 routes:

```
┌─────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  TopBar (64px)                  │
│  ─────────────    │  ────────────────────────────── │
│  Logo             │  [Title] [Search] [Date] [🔔]   │
│  Nav items        │─────────────────────────────────│
│  ─────────────    │                                  │
│  User badge       │  Content Area                    │
│  Zone + Role      │  (role-specific page)            │
│                   │                                  │
│                   │──────────────────────────────────│
│                   │  StatusBar (40px)                 │
└─────────────────────────────────────────────────────┘
```

**Sidebar config** is driven by a per-role nav manifest:
```typescript
interface NavItem {
  label: string
  icon: string       // Material Symbols name
  href: string
  badge?: number     // live count
}

const JE_NAV: NavItem[] = [
  { label: 'Planning View', icon: 'assignment', href: '/je' },
  { label: 'Zone Map',      icon: 'map',        href: '/je/map' },
  { label: 'Analytics',     icon: 'analytics',   href: '/je/analytics' },
  { label: 'History Log',   icon: 'history',     href: '/je/history' },
]
```

**Visual variants:**
- **Light theme** (default): JE, AE, DE, EE, AC, City Engineer, Accounts, Standing Committee, Super Admin
- **Dark theme**: Commissioner (War Room) — dark navy `#0F172A` background

### 4.2 Shared Components

| Component | Props | Used By |
|-----------|-------|---------|
| `KpiCard` | `label, value, trend?, color, icon?` | All dashboards |
| `StatusPill` | `status: TicketStatus` | All ticket surfaces |
| `SeverityBadge` | `tier: SeverityTier` | All ticket surfaces |
| `BillStatusPill` | `status: BillStatus` | Accounts, Standing Committee |
| `TicketTable` | `tickets[], columns[], onRowClick` | JE, AE, DE, EE, AC |
| `TicketDetailDrawer` | `ticket, events[], onAction` | All operational roles |
| `BillDetailPanel` | `bill, lineItems[], onApprove?, onReject?` | Accounts |
| `BillDetailReadOnly` | `bill, lineItems[]` | Standing Committee |
| `MapPanel` | `tickets[], zones[], prabhags[], onSelect` | JE, DE, EE, CE, Commissioner |
| `ZonePrabhagFilter` | `zones[], selectedZone, selectedPrabhag` | Zone-scoped roles |
| `DateRangeFilter` | `from, to, onChange` | All dashboards |
| `AlertBanner` | `rule: EscalationRule, tickets[]` | AE (Rule 1), DE (Rule 2) |
| `OpiScorecard` | `profile: Profile` | AE, AC |
| `ContractorScorecard` | `metrics: ContractorMetrics` | EE, CE, Commissioner |
| `ExportButton` | `format: 'csv'|'pdf', endpoint` | All dashboards |
| `EmptyState` | `icon, message` | All |
| `LoadingSkeleton` | `variant` | All |

### 4.3 Shared Constants

```typescript
// lib/constants/status.ts
export const STATUS_DISPLAY = { ... }  // as defined above
export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:           'bg-slate-100 text-slate-600',
  verified:       'bg-blue-100 text-blue-700',
  assigned:       'bg-indigo-100 text-indigo-700',
  in_progress:    'bg-amber-100 text-amber-800',
  audit_pending:  'bg-yellow-100 text-yellow-800',
  resolved:       'bg-green-100 text-green-700',
  rejected:       'bg-red-100 text-red-700',
  escalated:      'bg-red-200 text-red-900',
  cross_assigned: 'bg-purple-100 text-purple-700',
}

export const SEVERITY_COLORS: Record<SeverityTier, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH:     'bg-orange-100 text-orange-800',
  MEDIUM:   'bg-yellow-100 text-yellow-800',
  LOW:      'bg-green-100 text-green-700',
}

export const BILL_STATUS_COLORS: Record<BillStatus, string> = {
  draft:           'bg-slate-100 text-slate-500',
  submitted:       'bg-slate-100 text-slate-600',
  accounts_review: 'bg-orange-100 text-orange-700',
  approved:        'bg-blue-100 text-blue-700',
  paid:            'bg-green-100 text-green-700',
  rejected:        'bg-red-100 text-red-700',
}

// lib/constants/terminology.ts
// NEVER use "ward" — always "prabhag"
// NEVER use "division" — always "zone"
```

---

## 5. Routing & Middleware

### 5.1 Route Structure

```
app/
├── (auth)/
│   └── login/page.tsx
├── (dashboard)/
│   ├── layout.tsx              ← DashboardShell wrapper
│   ├── je/
│   │   ├── page.tsx            ← Planning View (inbox + map)
│   │   ├── map/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── history/page.tsx
│   ├── ae/
│   │   ├── page.tsx            ← Overview (workload + supervision queue)
│   │   ├── workloads/page.tsx
│   │   ├── escalations/page.tsx
│   │   ├── map/page.tsx
│   │   └── reports/page.tsx
│   ├── de/
│   │   ├── page.tsx            ← Command Center
│   │   ├── work-orders/page.tsx
│   │   ├── chronic-hotspots/page.tsx
│   │   ├── technical-queue/page.tsx
│   │   ├── map/page.tsx
│   │   └── reports/page.tsx
│   ├── ee/
│   │   ├── page.tsx            ← Macro Performance
│   │   ├── zones/page.tsx
│   │   ├── chronic-locations/page.tsx
│   │   ├── defect-liability/page.tsx
│   │   ├── contractors/page.tsx
│   │   └── reports/page.tsx
│   ├── assistant-commissioner/
│   │   ├── page.tsx            ← Zone Overview
│   │   ├── sla-breaches/page.tsx
│   │   ├── ticket-lifecycle/page.tsx
│   │   ├── officer-performance/page.tsx
│   │   ├── budget/page.tsx
│   │   └── rule-6/page.tsx
│   ├── city-engineer/
│   │   ├── page.tsx            ← Engineering Oversight
│   │   ├── rate-cards/page.tsx
│   │   ├── contractors/page.tsx
│   │   ├── recurring-failures/page.tsx
│   │   ├── defect-liability/page.tsx
│   │   └── reports/page.tsx
│   ├── commissioner/
│   │   ├── page.tsx            ← Strategic Command Center (dark mode)
│   │   ├── live-map/page.tsx
│   │   ├── incident-feed/page.tsx
│   │   ├── vendor-audit/page.tsx
│   │   └── financial-nexus/page.tsx
│   ├── accounts/
│   │   ├── page.tsx            ← Bill Queue
│   │   ├── line-items/page.tsx
│   │   ├── proof-review/page.tsx
│   │   ├── payment-status/page.tsx
│   │   ├── payout-summary/page.tsx
│   │   └── reports/page.tsx
│   ├── standing-committee/
│   │   ├── page.tsx            ← Expenditure Overview (read-only)
│   │   ├── contractor-performance/page.tsx
│   │   ├── oversight-queue/page.tsx
│   │   ├── zone-spending/page.tsx
│   │   └── audit-reports/page.tsx
│   └── admin/
│       ├── page.tsx            ← Dashboard Switcher
│       ├── users/page.tsx
│       ├── system-config/page.tsx
│       ├── audit-logs/page.tsx
│       └── role-assignment/page.tsx
```

### 5.2 Middleware (Role-Based Route Guard)

```typescript
// middleware.ts
const ROLE_ROUTES: Record<UserRole, string> = {
  je: '/je',
  ae: '/ae',
  de: '/de',
  ee: '/ee',
  assistant_commissioner: '/assistant-commissioner',
  city_engineer: '/city-engineer',
  commissioner: '/commissioner',
  accounts: '/accounts',
  standing_committee: '/standing-committee',
  super_admin: '/admin',
  // Mobile-only roles → redirect to /not-authorized
  citizen: '/not-authorized',
  contractor: '/not-authorized',
  mukadam: '/not-authorized',
}
```

Logic:
1. Check Supabase SSR session → no session? → redirect to `/login`
2. Fetch `profiles.role` for the authenticated user
3. If the requested route doesn't match the user's role → redirect to their correct dashboard
4. Exception: `super_admin` can access ALL routes

---

## 6. Dashboard-by-Dashboard Spec

### 6.1 JE Companion Dashboard

**Visual ref:** [JE/screen.png](file:///r:/Road%20Nirman/WebD%20UI/JE/screen.png)
**Theme:** Light | **Data scope:** Zone-scoped (own `zone_id`)

**Layout:** 60/40 split — ticket inbox (left) + map + KPIs (right)

| Section | Data Source | Notes |
|---------|------------|-------|
| Ticket inbox | `tickets WHERE zone_id = user.zone_id AND status NOT IN ('resolved', 'rejected')` | Scrollable list, filter chips by status |
| Filter chips | Hardcoded from `TicketStatus` enum values relevant to JE | `Received, Verified, Repair Assigned, Fixing, Quality Check` |
| Planning map | Mapbox GL + ticket pins colored by severity | Prabhag boundary overlay from `prabhags.boundary` |
| Route optimizer | Browser `navigator.geolocation` | Sorts inbox by Haversine distance from current position. **Ephemeral — not persisted.** |
| KPI cards | Aggregate queries on tickets | Open Tasks, Assigned to Me, Escalated, Resolved This Week |
| Zone completion | `zones.budget_consumed / zones.annual_road_budget` | Progress bar |

**Stitch corrections:**
- Stitch shows "SSR NIRMAN" branding → keep as "रोड NIRMAN"
- Stitch shows distance "0.8 km" → compute from browser geolocation (if granted)

**Boundary rule:** JE web is planning-only. NO geofence check-in, NO camera capture, NO measurement input, NO proof upload. Those are mobile-only.

---

### 6.2 AE Supervisor Dashboard

**Visual ref:** [AE/screen.png](file:///r:/Road%20Nirman/WebD%20UI/AE/screen.png)
**Theme:** Light | **Data scope:** Zone-scoped

**Layout:** 3-column — JE workloads (left) + supervision queue (center) + analytics (right)

| Section | Data Source | Notes |
|---------|------------|-------|
| JE Workload Cards | `profiles WHERE role='je' AND zone_id = user.zone_id` + ticket counts per JE | Show OPI score, open/fixing counts, load % |
| Rule 1 Breach Banner | `tickets WHERE status='open' AND created_at < NOW() - 4h AND zone_id = user.zone_id` | From escalation_rules rule_number=1 |
| Supervision Queue | `tickets WHERE zone_id = user.zone_id ORDER BY updated_at DESC` | Table with ticket_ref, road_name, JE assigned, status |
| Weekly Resolution Trend | Aggregate `tickets WHERE resolved_at BETWEEN ...` by day | Bar chart (Recharts) |
| Active Escalations | `tickets WHERE escalation_count > 0 AND zone_id = user.zone_id` | Rule 1 + Rule 2 cards |

**Stitch corrections:**
- Stitch shows Prabhag filter ("P11, P12, P13") → ✅ keep, query `prabhags WHERE zone_id = user.zone_id`
- Stitch shows "OPI" badges → ✅ correct, from `profiles.opi_score` / `profiles.opi_zone`

---

### 6.3 DE Technical Command Dashboard

**Visual ref:** [DE/screen.png](file:///r:/Road%20Nirman/WebD%20UI/DE/screen.png)
**Theme:** Light | **Data scope:** Zone-scoped

| Section | Data Source | Notes |
|---------|------------|-------|
| Rule 2 Breach KPI | `tickets WHERE status='open' AND created_at < NOW() - 48h` | From escalation_rules rule_number=2 |
| Overdue Verification | `tickets WHERE status='open' AND verified IS NULL AND ...` | Count |
| Chronic Locations | `chronic_locations WHERE zone_id = user.zone_id AND is_flagged = true` | Count + list |
| Slow Work Orders | `tickets WHERE status='assigned' AND ...` | Count + list |
| JE Performance Table | `profiles WHERE role='je' AND zone_id = user.zone_id` JOIN ticket aggregates | SLA breach %, assigned count, OPI |
| Overdue Inspections List | Tickets past SLA with road photos | Card list with images |

**Stitch corrections:**
- Stitch shows DE doing executor assignment → ❌ **REMOVE.** DE has no assignment UI. Assignment is done by JE (via mobile) and AE.
- Stitch labels it "Technical Command" → ✅ keep the title

---

### 6.4 EE Macro Performance Dashboard

**Visual ref:** [EE/screen.png](file:///r:/Road%20Nirman/WebD%20UI/EE/screen.png)
**Theme:** Light | **Data scope:** City-wide (all zones)

| Section | Data Source | Notes |
|---------|------------|-------|
| Zone Performance Table | `zones` JOIN ticket aggregates per zone | Columns: Zone, Open, Escalated, No Work Order, Avg Resolution Days, SSIM Pass Rate, Status badge |
| Engineering Bottleneck Map | Mapbox with chronic location pins + high-density clusters | `chronic_locations` + ticket density heatmap |
| Execution Performance Table | `contractor_metrics` + profiles for Mukadam/dept executors | Name, Type (CONTRACTOR/DEPT.WORK), Pass Rate, Quality stars |
| City Project Progress | `SUM(zones.budget_consumed) / SUM(zones.annual_road_budget)` | Single progress bar |
| View Scope Dropdown | "All Zones" / individual zone selection | Filter all widgets |

**Stitch corrections:**
- Stitch shows both Contractor and "DEPT. WORK" in execution table → ✅ correct — EE sees both executor types
- Stitch shows "Audit Review" button → ✅ keep; EE has UPDATE permissions

---

### 6.5 Assistant Commissioner Zone Control Dashboard

**Visual ref:** [Assistant Commissioner/screen.png](file:///r:/Road%20Nirman/WebD%20UI/Assistant%20Commissioner/screen.png)
**Theme:** Light | **Data scope:** Zone-scoped

| Section | Data Source | Notes |
|---------|------------|-------|
| KPI Strip | Zone Open, SLA Breached, Resolved Today, Citizen Confirmation Rate, Budget Consumed | 5 cards |
| Budget Consumed Card | `zones WHERE id = user.zone_id` → `budget_consumed / annual_road_budget` | ₹ amounts + % + progress bar |
| Ticket Master Table | `tickets WHERE zone_id = user.zone_id` | Columns: Ref, Road/Location/Prabhag, JE, AE/DE, Status, Days Open, SLA indicator |
| Officer Performance Scorecards | `profiles WHERE zone_id = user.zone_id AND role IN ('je','ae','de')` | OPI score per officer |
| Citizen Satisfaction Panel | `AVG(tickets.citizen_rating)` + `COUNT(citizen_confirmed=true) / COUNT(*)` | Star rating + SMS confirmation rate |
| Grievance Escalation Log | `ticket_events WHERE event_type = 'escalation'` for zone tickets | Timeline |

**Stitch corrections:**
- Stitch shows "Rule 6 Compliance" in sidebar → ✅ keep — Rule 6 is citizen SMS confirmation
- Stitch shows "Citizen Conf. Rate 88.4%" → ✅ derived from `citizen_confirmed` field

---

### 6.6 City Engineer Governance Dashboard

**Visual ref:** [City Engineer/screen.png](file:///r:/Road%20Nirman/WebD%20UI/City%20Engineer/screen.png)
**Theme:** Light | **Data scope:** City-wide

| Section | Data Source | Notes |
|---------|------------|-------|
| KPI Strip | City-wide Open Projects, Recurring Failures, Contractor Quality Index, Annual Road Budget Consumed | 4 cards |
| Rate Card Governance | `rate_cards WHERE is_active = true AND fiscal_year = current_fy` | Table: work_type, unit, rate_per_unit. **🔒 LOCKED** badge — CE approves cards, no inline editing |
| Contractor Ecosystem | `contractors` JOIN `contractor_metrics` | Table: Name, Zones, Defect Flags, SSIM Pass, Reopen %, Status (✅/⚠️/BLACKLISTED) |
| Chronic Failure Hotspots Map | Mapbox + `chronic_locations WHERE is_flagged = true` | Pins with Prabhag intensity labels |
| Work Type Trend | Aggregate tickets by `work_type` grouped by month | Stacked bar chart |
| Defect Liability Monitoring | `tickets WHERE warranty_expiry IS NOT NULL AND warranty_expiry > NOW()` | Table: Ref, Road, Contractor, Resolved Date, Warranty Expiry, Audit Status |

**Stitch corrections:**
- Stitch renders this as a governance screen → ✅ correct — this is NOT a commissioner-style war room
- Stitch shows "BLACKLISTED: 03" badge → ✅ derived from `contractors WHERE is_blacklisted = true`
- Stitch shows "Prepare Next FY Rate Card" button → ✅ keep — CE has INSERT/UPDATE on rate_cards

---

### 6.7 Commissioner War Room

**Visual ref:** [Commissioner Dashboard (War Room)/screen.png](file:///r:/Road%20Nirman/WebD%20UI/Commissioner%20Dashboard%20(War%20Room)/screen.png)
**Theme:** **Dark** (`bg-slate-950`) | **Data scope:** City-wide

| Section | Data Source | Notes |
|---------|------------|-------|
| Live Ticker | `ticket_events ORDER BY created_at DESC LIMIT 20` | Horizontal autoscroll |
| KPI Strip | Total Open, Critical (Action Req.), Resolved Today, SLA Breached | 4 cards, red highlight for Critical |
| Live Zone Map | Mapbox dark style + zone cluster pins | Color: Critical(red), Repairing(orange), Optimal(green) |
| Macro Lifecycle Workstream | Tickets grouped by status bucket | Kanban-style cards: Received(count), Verified(count), Fixing(count) |
| Contractor Quality Index | `contractor_metrics` | Table: Name, SSIM Pass %, Reopen %, Q-Index score |
| Budget Footer | `SUM(zones.budget_consumed)` / `SUM(zones.annual_road_budget)` | "₹42.8 Cr / ₹60.0 Cr Utilized" |
| Zone Health Bars | Per-zone completion percentages | Bottom strip |

> [!IMPORTANT]
> Commissioner has **NO mutation capabilities**. No UPDATE policies exist. The UI must be purely observational — no action buttons, no approve/reject, no assignment controls.

---

### 6.8 Accounts Billing Dashboard

**Visual ref:** [Accounts Dashboard/screen.png](file:///r:/Road%20Nirman/WebD%20UI/Accounts%20Dashboard/screen.png)
**Theme:** Light | **Data scope:** All contractor bills (globally — no zone scoping)

| Section | Data Source | Notes |
|---------|------------|-------|
| Header Banner | Static text | "Contractor work only. Departmental (Mukadam) execution excluded." |
| KPI Strip | Pending Review, Approved (MTD), Total Paid (FY), Rejected | 4 cards from `contractor_bills` aggregates |
| Bill Queue (left 40%) | `contractor_bills WHERE status IN ('submitted','accounts_review') ORDER BY submitted_at` | Clickable cards showing bill_ref, contractor name, zone, amount |
| Bill Detail (right 60%) | Selected bill → `bill_line_items WHERE bill_id = selected` | Table: ticket_ref, work details, area/rate, SSIM score, verification_hash (truncated SHA-256), line_amount |
| SSIM Inline | `bill_line_items.ssim_score` | Green ✅ if `ssim_pass=true`, Red ⚠️ if `ssim_pass=false` |
| Photo Proof | `bill_line_items.photo_before` + `bill_line_items.photo_after` | Thumbnail pairs per line item |
| Approve/Reject Actions | `UPDATE contractor_bills SET status = 'approved'|'rejected'` | Reject requires `rejection_reason` |
| Payout Summary | `contractor_bills WHERE status IN ('approved','paid')` | Table: Contractor, Zone, Bills Settled, Gross Paid, Payment Ref, Status |

> [!IMPORTANT]
> **XOR Billing Rule:** Accounts surfaces ONLY show contractor-executed work. The query must filter: `tickets.assigned_contractor IS NOT NULL`. Any ticket with `assigned_mukadam IS NOT NULL AND assigned_contractor IS NULL` is departmental work and MUST NOT appear in billing surfaces.

**Stitch accuracy check:**
- Stitch shows SSIM 0.92 (green) and 0.42 (red with ⚠️) → ✅ correct inverse SSIM display
- Stitch shows truncated SHA-256 hashes → ✅ from `verification_hash`
- Stitch shows before/after photo thumbnails → ✅ from `bill_line_items.photo_before/photo_after`

---

### 6.9 Standing Committee Read-Only Oversight

**Visual ref:** [Standing Committee/screen.png](file:///r:/Road%20Nirman/WebD%20UI/Standing%20Committee/screen.png)
**Theme:** Light | **Data scope:** City-wide, contractor-only

| Section | Data Source | Notes |
|---------|------------|-------|
| Header | "Financial Oversight — FY 2025-26" | "READ ONLY ACCESS" badge next to user profile |
| KPI Strip | Expenditure (FY), Pending Contractor Bills, Active Contracts, Zone SLA Compliance | 4 cards |
| Exclusion Notice | Static banner | "CONTRACTOR-EXECUTED WORK ONLY. MUKADAM/DEPARTMENTAL WORK IS EXPLICITLY EXCLUDED FROM THIS FINANCIAL VIEW." |
| Expenditure Summary by Zone | `contractor_bills` aggregated by zone | Table: Zone, Work Type, Contractor, Amount Paid, Audit Status |
| Contractor Performance Index | `contractor_metrics` ranked by quality_index | Top 3 with SSIM + Reopen % |
| Pending Approval Watch | Bills with high amounts awaiting approval | "HIGH VOLUME" flag for large bills |
| Chronic Location Financial Impact | `chronic_locations` JOIN cost aggregates | ₹ amount per hotspot |
| Zone Budget Bar Chart | `zones.budget_consumed` per zone | Bars with budget cap dashed line |
| Expenditure Trend | Monthly spend trend | Line chart |

> [!CAUTION]
> **ZERO mutation capabilities.** No approve, reject, assign, or update buttons of any kind. All surfaces are purely observational. The "Export Report" button generates a read-only download — no DB writes.

---

### 6.10 Super Admin Shell

**Visual ref:** [Super Admin/screen.png](file:///r:/Road%20Nirman/WebD%20UI/Super%20Admin/screen.png)
**Theme:** Light | **Data scope:** Full system access

| Section | Data Source | Notes |
|---------|------------|-------|
| Dashboard Switcher | 3×3 grid of all 9 role dashboards | Click → navigate to that role's route |
| User Management | `profiles` table | CRUD: name, role, zone, status. "Role changes take effect immediately via RLS" notice |
| System Config Panel | Hardcoded config display | SSIM Threshold (0.75), Geofence Radius (20m), AI Service status, Fiscal Lock Status |
| Recent System Events | `ticket_events` + profile changes | Live telemetry stream |
| Audit Logs | `ticket_events` with actor/role context | Searchable, filterable |

---

## 7. Stitch → Code Translation Rules

### What to TAKE from Stitch exports

✅ Page composition / layout hierarchy (sidebar + content + analytics panels)
✅ Card grouping and visual density per role
✅ Color palette: primary `#1E3A5F`, accent `#F97316`, surface `#F8FAFC`
✅ Typography: Manrope headings, Public Sans body
✅ AE workload cards structure
✅ Accounts left-queue / right-detail split
✅ Commissioner dark theme + live ticker
✅ JE planning map + ticket inbox composition

### What to REJECT from Stitch exports

❌ Any status label not in the `ticket_status` enum (e.g., "RE-WORK", "IN REVIEW")
❌ Any action button not backed by an RLS UPDATE policy for that role
❌ DE doing executor assignment (DE has no assignment UI)
❌ Standing Committee having any approve/reject controls
❌ Commissioner having mutation controls
❌ Any use of "ward" — always "prabhag"
❌ Any use of "division" — always "zone"
❌ Decorative analytics not derivable from the actual schema
❌ JE doing daily log submission or field actions on web
❌ Wrong SSIM interpretation (remember: **INVERSE** — score < 0.75 = PASS)

---

## 8. Build Phases

### Phase 1: Foundation (Days 1–3)

- [ ] Scaffold Next.js 14 project at `R:\Road Nirman\web-dashboard\`
- [ ] Configure Tailwind with design tokens from Stitch (colors, fonts, radii)
- [ ] Set up `@supabase/ssr` client + server utilities
- [ ] Build `DashboardShell` (sidebar, top bar, status bar)
- [ ] Implement middleware role-based route guard
- [ ] Build login page with Supabase email/password auth
- [ ] Create all shared components: KpiCard, StatusPill, SeverityBadge, etc.
- [ ] Define all TypeScript types and shared constants

### Phase 2: Operational Dashboards (Days 4–8)

- [ ] **JE** — ticket inbox, map, route optimizer, KPIs
- [ ] **AE** — JE workloads, Rule 1 breach banner, supervision queue, analytics
- [ ] **DE** — Rule 2 breaches, chronic hotspots, JE performance, technical queue

### Phase 3: Governance Dashboards (Days 9–12)

- [ ] **EE** — zone performance table, bottleneck map, execution performance
- [ ] **AC** — zone overview, SLA control, officer scorecards, budget, citizen satisfaction
- [ ] **City Engineer** — rate cards, contractor ecosystem, recurring failures, defect liability

### Phase 4: Executive & Financial Dashboards (Days 13–16)

- [ ] **Commissioner** — war room (dark theme), live map, ticker, vendor scorecard, budget
- [ ] **Accounts** — bill queue, detail panel, SSIM/hash verification, approve/reject, payout summary
- [ ] **Standing Committee** — expenditure overview (read-only), contractor performance, zone spending

### Phase 5: Admin + Polish (Days 17–19)

- [ ] **Super Admin** — dashboard switcher, user management, system config, audit logs
- [ ] Responsive polish (tablet breakpoints)
- [ ] Loading skeletons, error states, empty states
- [ ] Export functionality (CSV/PDF) for all dashboards
- [ ] End-to-end testing: role routing, RLS data scoping, mutation guards

---

## 9. Verification Plan

### Automated Checks

| Test | Method |
|------|--------|
| Route guard enforcement | Navigate to wrong dashboard as each role → expect redirect |
| Zone scoping | Login as Zone 4 JE → verify no Zone 1 tickets appear |
| Standing Committee read-only | Attempt bill UPDATE via Supabase client → expect RLS rejection |
| Commissioner read-only | Attempt ticket UPDATE → expect RLS rejection |
| Accounts ticket scope | Verify only `audit_pending` and `resolved` tickets are visible |
| Status labels | Verify every displayed label matches `STATUS_DISPLAY` map |
| Billing XOR | Verify Accounts/SC surfaces show ZERO Mukadam-assigned tickets |
| SSIM display | Verify score < 0.75 shows ✅ PASS, >= 0.75 shows ⚠️ FAIL |

### Visual Checks (Browser)

| Check | Method |
|-------|--------|
| JE layout matches Stitch composition | Side-by-side screenshot comparison |
| Commissioner dark theme | Verify `bg-slate-950` backgrounds throughout |
| All dashboards share consistent spacing/type | Walk through all 10 routes |
| Map renders with correct zone/prabhag overlays | Mapbox visual inspection |
| Responsive at 1280px, 1440px, 1920px | Browser resize |

### Data Integrity

| Check | Method |
|-------|--------|
| Terminology audit | `grep -r "ward" src/` must return 0 results |
| No hardcoded fake data | All displayed values must come from Supabase queries |
| Rate card immutability | Verify rate_per_unit on tickets cannot be edited in UI |
| SHA-256 hash display | Verify `verification_hash` is truncated but present in audit surfaces |

---

## Open Questions

> [!IMPORTANT]
> **Q1: Mapbox zone boundary data.** The `zones.boundary` and `prabhags.boundary` columns exist in the schema but were seeded as NULL in the hackathon migration. Do we have GeoJSON files for Solapur's 8 zones and 26 prabhags to load into Mapbox overlays? Without them, the map will show ticket pins but no boundary polygons.

> [!IMPORTANT]
> **Q2: Real-time subscriptions.** Should the Commissioner war room and AE supervision queue use Supabase Realtime subscriptions for live updates, or is polling with TanStack Query (30-second intervals) sufficient for v1?

> [!IMPORTANT]
> **Q3: JE data in Accounts.** The Accounts RLS policy restricts ticket visibility to `audit_pending` and `resolved` statuses only. This means the Accounts dashboard cannot show the full ticket lifecycle — only the tail end. Is this the intended behavior, or should Accounts also see `in_progress` tickets that are approaching audit?
