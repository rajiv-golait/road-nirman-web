# SSR Flutter App Master Plan

## Summary
Build a new Flutter mobile app from scratch in [R:\Road Nirman](R:\Road Nirman) using [implementation_plan.md](R:\Road Nirman\implementation_plan.md) as the source of truth and the Stitch exports in [R:\Road Nirman\Flutter UI](R:\Road Nirman\Flutter UI) as visual references only.

The app supports **4 mobile roles**:
- `citizen`
- `je`
- `mukadam`
- `contractor`

All other roles route to a **Web Handoff** screen:
- `ae`, `de`, `ee`, `assistant_commissioner`, `city_engineer`, `commissioner`, `standing_committee`, `accounts`, `super_admin`

The implementation should be optimized for:
- field usability
- strict backend/state-machine alignment
- modular Flutter code with clean service separation
- shared execution components between Mukadam and Contractor

## App Architecture
### Project setup
Create a standard Flutter app with:
- `flutter_riverpod` for state management
- `supabase_flutter` for auth/data/storage
- `go_router` for routing
- `geolocator` for GPS
- `flutter_map` + `latlong2` for maps
- `camera` for capture flows
- `image_picker` only if gallery fallback is explicitly needed later
- `freezed` + `json_serializable` optional, but recommended for models

### Folder structure
Use this structure:
- `lib/app/`
  - `app.dart`
  - `router.dart`
  - `theme.dart`
- `lib/core/`
  - `constants/`
  - `extensions/`
  - `utils/`
  - `widgets/`
- `lib/features/auth/`
- `lib/features/citizen/`
- `lib/features/je/`
- `lib/features/mukadam/`
- `lib/features/contractor/`
- `lib/features/handoff/`
- `lib/services/`
  - `auth_service.dart`
  - `ticket_service.dart`
  - `storage_service.dart`
  - `location_service.dart`
  - `rate_card_service.dart`
- `lib/models/`
  - `profile.dart`
  - `ticket.dart`
  - `ticket_dimensions.dart`
  - `job_order.dart`
- `lib/providers/`
- `lib/routes/`

### Routing
Define one central router with:
- splash / bootstrap
- login
- OTP verification
- role router
- citizen routes
- JE routes
- Mukadam routes
- Contractor routes
- web handoff route

Route mapping:
- `citizen` -> citizen stack
- `je` -> JE stack
- `mukadam` -> Mukadam stack
- `contractor` -> contractor stack
- all non-mobile roles -> `WebHandoffScreen`

## Data Contract & Backend Rules
### Ticket fields used by mobile
Flutter models should explicitly support:
- `id`
- `ticket_ref`
- `location_description`
- `latitude`
- `longitude`
- `zone_id`
- `prabhag_id`
- `damage_type`
- `severity_tier`
- `status`
- `photo_before` as `List<String>` in model, with UI using `photo_before.firstOrNull`
- `photo_je_inspection`
- `photo_after`
- `assigned_je`
- `assigned_contractor`
- `assigned_mukadam`
- `work_type`
- `estimated_cost`
- `rate_card_id`
- `rate_per_unit`
- `job_order_ref`
- `ssim_score`
- `ssim_pass`
- `verification_hash`
- `dimensions` with at least:
  - `length_m`
  - `width_m`
  - `area_sqm`

### Status mapping
Use this exact human mapping everywhere:
- `open` -> `Received`
- `verified` -> `Verified`
- `assigned` -> `Repair Assigned`
- `in_progress` -> `Fixing`
- `audit_pending` -> `Quality Check`
- `resolved` -> `Resolved`

Do not invent alternate labels in the app.

### Critical behavior rules
- `photo_after` is a single string URL
- `photo_before` is an array in backend; mobile uses the first item as the primary image
- JE assignment must enforce:
  - exactly one of `assigned_contractor` or `assigned_mukadam`
- Mukadam and Contractor may only move:
  - `assigned -> in_progress`
  - `in_progress -> audit_pending`
- Mukadam screens must never show:
  - payable amount
  - billing status
  - rate card values
- Contractor detail must separate:
  - execution status
  - billing status

## Screen Plan
### Existing Stitch screen mapping
Use these exports as reference:
- `screen1` -> OTP Login
- `screen2` -> Citizen Home
- `screen3` -> Citizen Report Damage
- `screen4` -> Complaint Status
- `screen5` -> JE Task List
- `screen6` -> JE Site Check-In
- `screen7` -> JE Measure & Estimate
- `screen8` -> Contractor Work Orders
- `screen9` -> Legacy align screen reference only
- `screen10` -> Commissioner dashboard reference only, not mobile
- `screen11` -> Web Handoff
- `screen12` -> JE Ticket Detail
- `screen13` -> JE Executor Assignment
- `screen14` -> Mukadam Job Detail
- `screen15` -> Contractor Job Detail
- `screen16` -> Shared Execution Proof

### Screens to build
#### Auth
- Splash / bootstrap
- Login
- OTP Verification
- Role Router
- Web Handoff

#### Citizen
- Citizen Home
- Report Damage
- Complaint Status / Tracker

#### JE
- JE Home / Task List
- JE Ticket Detail
- JE Site Check-In
- JE Measure & Estimate
- JE Executor Assignment

#### Mukadam
- Mukadam Work Orders
  - derived from `screen8` layout
  - no billing language
- Mukadam Job Detail
- Shared Execution Proof

#### Contractor
- Contractor Work Orders
- Contractor Job Detail
- Shared Execution Proof

### Screen-specific implementation rules
#### Web Handoff
- show detected role
- show zone if present
- CTA: open web dashboard
- CTA: sign out and switch account
- no policy/footer clutter

#### JE Ticket Detail
- show before photo, ticket ref, severity, location, zone/prabhag, citizen info
- do not show transient AI confidence or pothole counts
- do not include “Change Department” unless backed by real backend flow

#### JE Executor Assignment
- dynamic executor type selector:
  - Department Work Gang
  - Private Contractor
- Department Work Gang -> show Mukadam picker only
- Private Contractor -> show Contractor picker only
- disable final CTA until exactly one executor is selected
- generate `job_order_ref` via backend-aligned flow

#### Mukadam Job Detail
- show JE work instructions
- show measured area
- show before photo
- show site location
- show internal departmental execution note
- no billing/payable widgets

#### Contractor Job Detail
- show execution stepper
- show separate billing status card
- show payable amount
- show locked rate
- show before photo and site details

#### Shared Execution Proof
- one reusable component for Mukadam and Contractor
- role-specific title/copy
- load `photo_before.first`
- capture one after photo
- upload to storage
- set `photo_after`
- move status to `audit_pending`
- no sci-fi language; use practical field language

## Implementation Phases
### Phase 1: Foundation
- Initialize Flutter project
- configure packages
- setup theme, typography, color tokens, spacing system
- create base router and auth bootstrap
- setup Supabase client and env loading
- define models and service interfaces

### Phase 2: Auth + Routing
- login screen
- OTP verification
- session restore
- fetch `profiles.role`
- route users into the correct stack or web handoff

### Phase 3: Citizen Flow
- citizen ticket list
- report damage camera flow
- GPS acquisition
- upload before photo
- insert ticket
- complaint tracker with strict status mapping

### Phase 4: JE Flow
- zonal open-ticket list with real `flutter_map`
- ticket detail
- 20m geofence check-in
- measure & estimate
- JE assignment flow with XOR executor enforcement

### Phase 5: Mukadam Flow
- work-order list derived from contractor work-order layout
- job detail
- start work -> `in_progress`
- shared execution proof -> `audit_pending`

### Phase 6: Contractor Flow
- work-order list
- contractor detail
- start work -> `in_progress`
- shared execution proof -> `audit_pending`
- billing UI stays informational only on mobile

### Phase 7: Stabilization
- empty states
- loading/error states
- permission handling
- offline/poor-network messaging
- polish and consistency pass across all root screens and detail flows

## Service Interfaces
### `AuthService`
- request OTP by phone
- verify OTP
- get current session
- sign out
- fetch current profile

### `TicketService`
- fetch citizen tickets
- fetch JE zonal tickets
- fetch Mukadam assigned tickets
- fetch Contractor assigned tickets
- fetch ticket by id
- create citizen ticket
- update JE verification fields
- assign executor
- update execution status
- submit completion proof

### `StorageService`
- upload before photo
- upload JE inspection photo
- upload after photo

### `LocationService`
- request permissions
- get current location
- compute geofence distance

### `RateCardService`
- fetch active rate card by work type / fiscal context needed by JE estimate flow

## Test Plan
### Functional
- OTP login works and routes by role
- non-mobile roles always hit Web Handoff
- citizen can create ticket with GPS + photo
- citizen tracker shows correct mapped labels
- JE sees only zonal open tickets
- JE cannot proceed if outside 20m
- JE estimate calculates area and cost correctly
- JE cannot assign both Mukadam and Contractor
- Mukadam sees only assigned tickets
- Mukadam can mark in progress and submit proof
- Contractor sees only assigned tickets
- Contractor can mark in progress and submit proof
- proof submission updates `photo_after` and `status = audit_pending`

### UI/UX
- bottom nav only on root screens
- detail/task screens have no root-tab clutter
- daylight readability is acceptable
- map and camera flows handle permissions failures gracefully

### Error / edge cases
- no GPS permission
- no camera permission
- missing `photo_before`
- session exists but profile missing
- role not recognized
- executor assignment attempt without selection
- upload failure / Supabase storage error
- geofence check fails due to location timeout

## Assumptions
- A new Flutter app will be created; no existing Flutter codebase is present in the repo yet
- Web dashboards are out of scope for the mobile app build
- Mukadam Work Orders will reuse the `screen8` layout until a dedicated design exists
- `depth_m` remains unsupported in v1 mobile UI
- Mobile uses the first `photo_before` image only
- Shared execution proof is the single camera implementation for both Mukadam and Contractor
