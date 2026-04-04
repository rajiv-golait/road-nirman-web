# Dashboard smoke checklist (manual)

Run after substantive changes. Automated: `npm run verify:dashboard` (terminology + light static heuristics).

## Auth and roles

- [ ] Mobile-only roles (`citizen`, `contractor`, `mukadam`) cannot open `/je` or other dashboard prefixes (redirect / not authorized).
- [ ] Wrong-role URL redirects (e.g. JE user opening `/commissioner`).
- [ ] `super_admin` can open dashboard prefixes per `role-guard`.

## Read-only roles

- [ ] Commissioner: no ticket/bill approve or assign controls; strategic observation only.
- [ ] Standing Committee: tables only; no mutations on tickets.

## Data scoping

- [ ] JE History audit feed only shows events for closed tickets in the JE’s zone (same working set as the table).
- [ ] DE work-orders subtitle states JE-only executor assignment; page is read-only.

## Maps

- [ ] Zone boundaries visible on JE map, AE map, DE map, Commissioner live map, EE city map (when `get_zones_with_geojson` is deployed and zones have `boundary` data).

## Build

- [ ] `npm run verify:dashboard` passes.
- [ ] `npm run build` passes.
