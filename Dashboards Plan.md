# Road Nirman — Web Dashboard Spec (Corrected Final)

> **Status:** Ready for Stitch / implementation handoff
> **Repo root:** `R:\Road Nirman\web-dashboard\`
> **Stack:** Next.js (App Router, SSR) · Supabase (`@supabase/ssr`) · Mapbox GL JS · Tailwind CSS

---

## 1. Dashboard Count & Role Map

**9 dashboards** plus super_admin access through a shared admin shell.

| # | Dashboard | Primary Role(s) |
|---|-----------|-----------------|
| 1 | JE (Junior Engineer) | `je` |
| 2 | AE (Assistant Engineer) | `ae` |
| 3 | DE (Divisional Engineer) | `de` |
| 4 | EE (Executive Engineer) | `ee` |
| 5 | Assistant Commissioner | `assistant_commissioner` |
| 6 | City Engineer | `city_engineer` |
| 7 | Commissioner | `commissioner` |
| 8 | Accounts | `accounts` |
| 9 | Standing Committee | `standing_committee` |

**`super_admin`** does not get a separate dashboard. It reuses a shared admin shell with access to all 9 dashboards.

---

## 2. Architecture

### Authentication & Authorization

- User-facing dashboards authenticate via **Supabase SSR session cookies** (`@supabase/ssr`).
- All data reads/writes go through the **anon key + RLS policies**. The frontend never bypasses ticket or workflow constraints enforced in Supabase.
- **`SUPABASE_SERVICE_ROLE_KEY` is not used by standard user dashboard sessions.** It is reserved exclusively for:
  - Isolated server-only admin jobs
  - Private report generation workers
  - Internal maintenance endpoints

### Environment Variables

```env
# Used by the dashboard app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=

# Server-only — NOT used by standard user dashboard sessions
# SUPABASE_SERVICE_ROLE_KEY=
```

### Repo Structure

```
R:\Road Nirman\web-dashboard\
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── je/
│   │   ├── ae/
│   │   ├── de/
│   │   ├── ee/
│   │   ├── assistant-commissioner/
│   │   ├── city-engineer/
│   │   ├── commissioner/
│   │   ├── accounts/
│   │   ├── standing-committee/
│   │   └── admin/              ← shared admin shell (super_admin)
│   └── layout.tsx
├── components/
│   ├── shared/
│   ├── maps/
│   └── tables/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils/
├── middleware.ts                ← role-based route guard
├── .env.local
└── package.json
```

---

## 3. Dashboard Feature Specs

### 3.1 JE (Junior Engineer)

- Ticket inbox: assigned tickets with status, priority, location
- Map view: tickets plotted on Mapbox with zone and prabhag boundaries
- **Route optimizer button** — with browser geolocation permission, sorts tickets by distance from **current browser location** (ephemeral, not persisted in v1)
- Ticket detail view: photos, notes, status history
- Status update actions: only transitions permitted by backend workflow rules
- Daily workload summary

### 3.2 AE (Assistant Engineer)

- Tickets overview for assigned JEs
- Approval / rejection queue for JE submissions
- **Backend-permitted status actions** — the frontend must not bypass ticket transition constraints enforced in Supabase
- Escalation view
- Summary analytics: tickets by status, ward, JE

### 3.3 DE (Divisional Engineer)

- Division-level ticket overview across AEs
- **Backend-permitted status actions** for escalated or flagged tickets
- Executor assignment visibility
- Work-order tracking
- Division analytics and reporting

### 3.4 EE (Executive Engineer)

- Cross-division ticket view
- **Backend-permitted status actions** for high-priority or escalated items
- Budget and expenditure summary
- Contractor performance metrics
- Report generation

### 3.5 Assistant Commissioner

- Zone-level and prabhag-level oversight
- **Backend-permitted status actions** — limited to transitions already allowed by the database state machine and trigger guards
- Escalation tracking
- Citizen complaint correlation
- Summary dashboards with filters by zone, prabhag, date, priority

### 3.6 City Engineer

- City-wide operational overview
- Infrastructure and road condition summaries
- Cross-department coordination view
- High-level analytics and trend charts

### 3.7 Commissioner

- Executive summary dashboard
- Key metrics: open tickets, resolution rate, budget utilization
- Department performance comparisons
- Escalation and SLA breach alerts

### 3.8 Accounts

- **Contractor billing only:** billing tables, payout summaries, bill queues, and payment reports display only contractor-executed work
- **Mukadam / departmental work is excluded from all contractor billing surfaces**
- Mukadam-executed tickets may appear in operational analytics but never in billing queues
- Bill approval workflow
- Payment status tracking
- Budget vs. actual expenditure reports

### 3.9 Standing Committee

- **Contractor billing only:** bill tables, payout summaries, and payment reports display only contractor-executed work
- **Mukadam work is excluded from contractor billing surfaces**
- Tender and contract overview
- High-value bill oversight queue
- Expenditure audit view
- Zone-wise and contractor-wise spending breakdowns

---

## 4. Shared Admin Shell (super_admin)

- Accessible at `/admin`
- Provides a dashboard switcher to view any of the 9 role dashboards
- User management and role assignment
- System configuration
- Audit logs

---

## 5. Corrections Applied (from review)

For traceability, the following corrections were applied to the original plan:

1. **Dashboard count** — changed from "8 dashboards" to **9 dashboards**; added `super_admin → shared admin shell`
2. **Repo path** — changed from `samved/web-dashboard/` to `R:\Road Nirman\web-dashboard\`
3. **Service role key** — removed from normal dashboard app contract; marked server-only, not used by standard sessions; dashboard access governed by Supabase RLS
4. **JE route optimizer** — changed from "last location" to **current browser geolocation (ephemeral, not persisted)**
5. **Override wording** — replaced all instances of "override capability" with **backend-permitted status actions**; frontend must not bypass transition constraints
6. **Billing surface separation** — Accounts and Standing Committee specs now explicitly state that billing queues, bill tables, payout summaries, and payment reports are **contractor-only**; Mukadam work excluded from billing surfaces
