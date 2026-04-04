# SSR Dashboard Program Plan

## Summary
Build a **separate desktop-first web app** for SSR dashboards, using Stitch-generated web screens as visual references and the Supabase backend as the source of truth. The dashboard suite will cover **all core non-citizen operations**, including a **light companion dashboard for JE**.

The guiding split is:
- **Flutter mobile app** for field execution:
  - `citizen`
  - `je`
  - `mukadam`
  - `contractor`
- **Web dashboard app** for planning, oversight, approvals, finance, and executive monitoring:
  - `je` companion dashboard
  - `ae`
  - `de`
  - `ee`
  - `assistant_commissioner`
  - `city_engineer`
  - `commissioner`
  - `standing_committee`
  - `accounts`
  - `super_admin`

## Dashboard Role Model
### JE Web Dashboard
JE gets a **light companion dashboard**, not a replacement for mobile.
Use it for:
- assigned/open zonal ticket inbox
- route planning and map overview
- ticket history
- workload view
- work-order status visibility
- escalated ticket visibility
- search/filter/export of JE’s own working set

Do **not** put these on JE web:
- geofence check-in
- camera capture
- measurement capture
- executor proof upload
- field-only actions that rely on live GPS/camera

### AE Dashboard
AE is zone-scoped and acts as the immediate JE supervisor.
Use it for:
- tickets needing supervisory attention
- JE backlog
- escalation rule 1 visibility
- zone-level technical review
- bottleneck monitoring
- filtered ticket inspection and override of workflow status where permitted

### DE Dashboard
DE is the **zonal technical head**.
Use it for:
- escalated/no-inspection tickets
- higher-level technical review within the zone
- zone engineering queue health
- chronic-zone trouble spots
- pending inspections and slow-moving work orders

### EE Dashboard
EE is multi-zone / macro engineering oversight.
Use it for:
- cross-zone technical bottlenecks
- no-work-order escalations
- chronic location review
- contractor and mukadam execution performance
- city-wide technical review queues

### Assistant Commissioner Dashboard
Zone-level administrative dashboard.
Use it for:
- SLA breach monitoring in the zone
- unresolved assigned/in-progress/audit-pending tickets
- JE/AE/DE operational performance
- public grievance redressal health
- zone summary metrics

### City Engineer Dashboard
City-wide engineering governance.
Use it for:
- rate card governance visibility
- contractor ecosystem oversight
- city-wide repair load
- recurring failure patterns
- work type and cost trends
- high-level technical performance

### Commissioner Dashboard
Strategic executive command center.
Use it for:
- city-wide KPIs
- critical complaints
- SLA breaches
- zone performance ranking
- daily/weekly resolution progress
- public-facing governance visibility

### Accounts Dashboard
Billing and audit operations.
Use it for:
- `audit_pending` / bill-ready contractor work
- `contractor_bills`
- `bill_line_items`
- proof review
- bill approval/rejection/payment state
- vendor payout summaries

### Standing Committee Dashboard
Read-only finance oversight.
Use it for:
- expenditure summaries
- contractor performance
- pending approvals/reports
- zone-wise spending visibility
- no operational workflow mutations

## Web App Scope
### Core product areas
Build the web app around these shared dashboard modules:
- authentication and role router
- dashboard shell (sidebar/topbar/filter/search)
- ticket inbox and detail
- maps and zone heat views
- analytics/KPI widgets
- billing/review views
- audit/event timeline panels
- reporting/export surfaces

### Shared web patterns
Every dashboard should reuse:
- role-aware sidebar navigation
- global filters:
  - zone
  - prabhag
  - severity
  - status
  - date range
  - executor type (`mukadam` vs `contractor`)
- ticket detail drawer / page
- map panel
- event/audit timeline panel
- responsive desktop/tablet layout

## Stitch Design Program
### Stitch-first design order
Generate dashboards in this order:

1. **JE Companion Dashboard**
- inbox + zonal map + today’s route planning + history
- light operational tone
- not a war room

2. **Assistant Commissioner Dashboard**
- zone control room
- SLA + pending execution + escalations
- action-oriented

3. **DE Dashboard**
- zone technical command view
- escalations + chronic hotspots + JE queue quality

4. **EE Dashboard**
- cross-zone technical oversight
- engineering bottlenecks + chronic location analysis

5. **City Engineer Dashboard**
- city-wide engineering governance
- rate cards, contractors, repeated failures, trends

6. **Commissioner Command Center**
- strategic war room
- KPIs, heat map, breaches, rankings, daily progress

7. **Accounts Dashboard**
- queue-oriented financial review
- line items, bills, proof review, payout states

8. **Standing Committee Dashboard**
- read-only financial and contractor oversight
- summary/report-heavy

### Stitch design rule
Do not make all dashboards look identical.
Use a shared visual language, but vary emphasis:
- JE: operational and practical
- AC/DE: zone command
- EE/City Engineer: technical oversight
- Commissioner: war room
- Accounts: review/table-heavy
- Standing Committee: read-only reports

## Web App Implementation Plan
### Suggested architecture
Build a **separate web frontend** in a new app folder under the repo.
Recommended stack:
- React + TypeScript
- Vite or Next.js
- Supabase JS client
- TanStack Query
- component system matching Stitch output
- MapLibre GL or Leaflet for maps
- charting library for KPIs
- role-based route guards

### Core routes
Use role-aware route groups:
- `/login`
- `/handoff` only if needed
- `/je`
- `/ae`
- `/de`
- `/ee`
- `/assistant-commissioner`
- `/city-engineer`
- `/commissioner`
- `/accounts`
- `/standing-committee`

### Shared backend bindings
The dashboards should bind to:
- `profiles`
- `tickets`
- `ticket_events`
- `contractors`
- `contractor_bills`
- `bill_line_items`
- `rate_cards`
- `escalation_rules`
- zone/prabhag master data

### Important UX boundaries
- JE web stays companion-only
- mobile remains the source of truth for:
  - geofence check-in
  - field camera
  - measurement
  - proof upload
- contractor billing creation/review should remain primarily web-aware after execution
- `standing_committee` remains strictly read-only

## Delivery Order
### Phase A: Design
- create Stitch dashboard screens for all listed roles
- lock screen inventory and role-to-screen mapping
- define shared desktop design system

### Phase B: Web foundation
- scaffold web app
- auth + role router
- shared layout shell
- theme and reusable components

### Phase C: Operational dashboards
- JE
- Assistant Commissioner
- DE
- EE

### Phase D: Strategic dashboards
- City Engineer
- Commissioner

### Phase E: Finance dashboards
- Accounts
- Standing Committee

### Phase F: Integration hardening
- filters
- audit timelines
- exports
- error/loading states
- permission checks
- role-specific nav and guards

## Test Plan
### Access and routing
- each role lands on the correct dashboard
- unauthorized routes are blocked
- JE web cannot access admin/finance surfaces
- Standing Committee cannot mutate any record

### Data correctness
- zone-scoped roles only see their zone data
- EE sees global/multi-zone data as intended
- Accounts sees bill-related queues only
- JE dashboard does not expose unsupported field actions

### Workflow integrity
- JE dashboard does not offer mobile-only field actions
- AE/DE/AC dashboards reflect escalation and status queues correctly
- Contractor-executed and Mukadam-executed tickets are visually distinguishable
- contractor billing views exclude Mukadam departmental work
- audit/event panels match `ticket_events`

### UI quality
- dense desktop layouts remain readable at laptop widths
- filters/search persist sensibly
- maps and table states handle empty/loading/error cases

## Assumptions
- Web dashboards will be built in a **new dedicated web app**, not Flutter web
- Stitch will be used first to generate dashboard UI references
- JE web is intentionally companion-only
- Mobile remains required for GPS/camera/field verification flows
- No new backend role changes are needed to start dashboard design
