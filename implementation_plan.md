# Solapur Smart Roads (SSR) — Flutter App Implementation Plan

We are building the mobile frontend using the updated 13-role backend hierarchy. The mobile app strictly limits active interfaces to field operators, safely redirecting oversight and administrative roles back to the web dashboard.

## 1. Role-Based Access Model & Role Router Logic

### Mobile Users (Native App Flows)
The system's login flow evaluates `profiles.role` and dispatches paths explicitly:
- `citizen` -> `CitizenHome`
- `je` -> `JeHome`
- `mukadam` -> `MukadamHome`
- `contractor` -> `ContractorHome`

### Web/Dashboard Users (Web Handoff Screen)
- `ae`, `de`, `ee`, `assistant_commissioner`, `city_engineer`, `commissioner`, `standing_committee`, `accounts`, `super_admin` -> `WebHandoffScreen`

**Web Handoff UX Requirements:**
If any of these non-mobile roles log into the mobile app, they will be locked out and routed to the Web Handoff screen.
- Show the detected role and zone (if available).
- Primary CTA: Open the SSR Web Dashboard.
- Secondary CTA: Sign out and switch account.
- Keep the screen completely free of policy/footer clutter.

## 2. Updated Ticket Schema Alignment
The app integrates directly with the live Supabase schema, capturing the full mobile data contract:
- `id` and `ticket_ref`
- `location_description`, `latitude`, `longitude`
- `zone_id` and `prabhag_id` (Mobile consumes this zonal context, optionally pulling display names from joins)
- `damage_type`, `severity_tier`, `status`
- `photo_before` (Stored as an array in the backend; mobile uses the first image as the primary reported photo)
- `assigned_je`
- `assigned_contractor`
- `assigned_mukadam`
- `photo_je_inspection` (single string URL, not array)
- `photo_after` (single string URL, not array)
- `work_type`
- `estimated_cost`
- `rate_card_id`
- `rate_per_unit`
- `job_order_ref`
- `ssim_score`
- `ssim_pass`
- `verification_hash`

**`dimensions` Note:** The UI will capture and push `length_m` and `width_m`. Currently `depth_m` is omitted from v1 UI (especially on Mukadam screens), but the backend `dimensions` jsonb column accepts it freely.

## 3. Required Mobile Screens

The minimal viable build must include:
1. **OTP Verification**
2. **Web Handoff / Unsupported Mobile Role**
3. **JE Ticket Detail:** Explicitly do *not* show transient AI confidence/detection counts in v1 mobile. Do *not* include a "Change Department" action unless backed by real cross-assignment backend plumbing.
4. **JE Executor Assignment:** A strict dynamic picker enforcing XOR executor selection (see below).
5. **Contractor Job Detail:** Must explicitly separate execution status from billing status. The ticket workflow stepper must only show execution phases (`Repair Assigned`, `Fixing`, `Quality Check`). Billing status should be shown on a secondary isolated info pill card.
6. **Mukadam Work Orders**
7. **Mukadam Job Detail:** Must *not* show billing/payable amounts. Must *not* expose depth. It should explicitly present JE Work Instructions, the before photo, measured area, location, and status actions.
8. **Shared Execution Proof Screen:** Same camera/overlay component reused by `mukadam` and `contractor`. The title and copy should vary slightly by role context. Action captures the URL as `photo_after` and successfully submitting transitions the status strictly to `audit_pending`.

*Note on Navigation:* Bottom Nav bars should only be present on root/home screens, avoiding focused detail/task/action view screens.

## 4. Implementation Phases

### Phase 1: Foundation & Auth
- Setting up Supabase connection state.
- Phone number login & OTP Verification.
- Role Router & Web Handoff screen implementation.

### Phase 2: Citizen Flow
- Home Dashboard (Map UI).
- Report Damage (Camera, location GPS coordinates, form).
- Complaint Tracker list.

### Phase 3: JE Verification & Executor Assignment Flow
- Zonal Complaint Inbox view.
- Ticket Detail (`status = open`) & Geofence Check-in logic.
- Measure & Estimate Form UI (`length`, `width`, `estimated_cost`).
- **Executor Assignment Screen**: Must use dynamic pickers. If `Department Work Gang` is selected, show the **Mukadam Picker**. If `Private Contractor` is selected, show the **Contractor Picker**. Never show both selectors at once, and rigorously enforce exactly one executor before enabling the final assignment CTA.

### Phase 4: Mukadam Execution Flow
- Mukadam Work Orders list.
- Mukadam Job Detail matching constraints defined in Section 3.
- Utilizing the Shared Execution Proof camera.
- Transition state logic: `assigned` -> `in_progress` -> `audit_pending`.

### Phase 5: Contractor Execution Flow
- Contractor Work Orders list displaying commercial job orders and expected rates.
- Contractor Job Detail maintaining separate steppers for execution vs billing.
- Utilizing the identical Shared Execution Proof camera.
- Pushing to `audit_pending` and unlocking subsequent billing logic steps on the dashboard.

---

## Appendix: Screen Inventory Mapping
*Mapping UI designs in your repository `/Flutter UI` to their implementation tasks:*
- `screen11` -> Web Handoff
- `screen12` -> JE Ticket Detail
- `screen13` -> JE Executor Assignment
- `screen14` -> Mukadam Work Orders
- `screen15` -> Mukadam Job Detail
- `screen16` -> Mukadam Execution Proof
- `screen17` -> Contractor Job Detail
