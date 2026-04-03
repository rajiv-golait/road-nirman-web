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
5. **Contractor Job Detail:** Must explicitly separate execution status from billing status. Includes payable amount and locked rate visibility as seen in `screen15`.
6. **Mukadam Work Orders:** No dedicated Stitch export yet; derive from Contractor Work Orders visual structure (`screen8`), removing commercial/billing cues and using departmental language.
7. **Mukadam Job Detail:** Must *not* show billing/payable amounts. Includes JE Work Instructions, measured area, priority, and the explicit context: "Executed by SMC work gang under Mukadam supervision".
8. **Shared Execution Proof Screen:** Single camera/overlay component reused by `mukadam` and `contractor`. Captured URL is pushed to `photo_after`. (`screen16`)

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
- **Mukadam Work Orders list**: Derived from the Contractor Work Orders layout (`screen8`), but with departmental language and all billing/total-cost cues removed.
- Mukadam Job Detail matching constraints defined in Section 3 (Instructions, area, priority, internal note).
- Utilizing the Shared Execution Proof camera.
- Transition state logic: `assigned` -> `in_progress` -> `audit_pending`.

### Phase 5: Contractor Execution Flow
- Contractor Work Orders list displaying commercial job orders and expected rates.
- Contractor Job Detail displaying separate steppers for execution vs billing, plus payable amounts and locked rates.
- Utilizing the identical Shared Execution Proof camera.
- Pushing to `audit_pending` and unlocking subsequent billing logic steps on the dashboard.

---

## Appendix: Screen Inventory Mapping
*Mapping UI designs in your repository `/Flutter UI` to their implementation tasks:*
- `screen11` -> Web Handoff
- `screen12` -> JE Ticket Detail
- `screen13` -> JE Executor Assignment
- `screen14` -> Mukadam Job Detail
- `screen15` -> Contractor Job Detail
- `screen16` -> Shared Execution Proof
- `Mukadam Work Orders` -> derive from `screen8` layout pattern until a dedicated export is added
