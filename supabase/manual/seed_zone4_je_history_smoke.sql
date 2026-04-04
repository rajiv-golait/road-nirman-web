-- ============================================================
-- SSR WEB APP: JE HISTORY SMOKE DATA (ZONE 4)
-- Purpose:
--   Create one resolved Zone 4 ticket with media + audit events
--   so /je/history and /je/history/[id] can be smoke-tested end-to-end.
--
-- Safe to run multiple times:
--   - Upserts the same ticket by ticket_ref
--   - Replaces its audit trail on each run
--   - Does not alter schema
-- ============================================================

DO $$
DECLARE
  v_je_id UUID;
  v_contractor_id UUID;
  v_ticket_id UUID;
  v_now TIMESTAMPTZ := now();
  v_before_1 TEXT := $img1$data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23dbeafe'/><text x='400' y='300' text-anchor='middle' dominant-baseline='middle' fill='%231e3a8a' font-size='42'>Zone 4 Before 1</text></svg>$img1$;
  v_before_2 TEXT := $img2$data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23fee2e2'/><text x='400' y='300' text-anchor='middle' dominant-baseline='middle' fill='%23991b1b' font-size='42'>Zone 4 Before 2</text></svg>$img2$;
  v_after TEXT := $img3$data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'><rect width='800' height='600' fill='%23dcfce7'/><text x='400' y='300' text-anchor='middle' dominant-baseline='middle' fill='%23166534' font-size='42'>Zone 4 After Repair</text></svg>$img3$;
BEGIN
  SELECT id INTO v_je_id
  FROM auth.users
  WHERE email = 'je.zone4@ssr.demo';

  SELECT id INTO v_contractor_id
  FROM auth.users
  WHERE email = 'contractor.z4@ssr.demo';

  IF v_je_id IS NULL THEN
    RAISE EXCEPTION 'Missing auth user for je.zone4@ssr.demo';
  END IF;

  IF v_contractor_id IS NULL THEN
    RAISE EXCEPTION 'Missing auth user for contractor.z4@ssr.demo';
  END IF;

  INSERT INTO public.tickets (
    ticket_ref,
    created_at,
    updated_at,
    source_channel,
    location,
    latitude,
    longitude,
    address_text,
    nearest_landmark,
    road_name,
    prabhag_id,
    zone_id,
    damage_type,
    ai_confidence,
    epdo_score,
    severity_tier,
    total_potholes,
    photo_before,
    photo_after,
    status,
    assigned_je,
    assigned_contractor,
    approval_tier,
    dimensions,
    work_type,
    rate_per_unit,
    estimated_cost,
    job_order_ref,
    ssim_score,
    ssim_pass,
    verification_hash,
    verified_at,
    resolved_at,
    resolved_in_hours,
    citizen_confirmed,
    citizen_confirm_at,
    citizen_rating,
    is_duplicate,
    is_chronic_location
  )
  VALUES (
    'SSR-Z4-P12-2026-SMOKE-0001',
    v_now - interval '6 days',
    v_now - interval '1 day',
    'portal',
    ST_SetSRID(ST_MakePoint(75.93, 17.672), 4326)::geography,
    17.672,
    75.93,
    'Majrewadi corridor near Solapur-Bijapur Road',
    'Majrewadi Naka',
    'Solapur-Bijapur Road',
    12,
    4,
    'pothole',
    0.94,
    8.6,
    'HIGH',
    1,
    ARRAY[v_before_1, v_before_2],
    v_after,
    'resolved',
    v_je_id,
    v_contractor_id,
    'minor',
    jsonb_build_object(
      'length_m', 2.4,
      'width_m', 1.8,
      'depth_m', 0.11,
      'area_sqm', 4.32
    ),
    'Hot Mix Patching',
    1250.00,
    5400.00,
    'JO-Z4-P12-2026-SMOKE-0001',
    0.42,
    true,
    'smoke-zone4-history-verified-hash',
    v_now - interval '2 days',
    v_now - interval '1 day',
    120.0,
    true,
    v_now - interval '18 hours',
    5,
    false,
    false
  )
  ON CONFLICT (ticket_ref)
  DO UPDATE SET
    updated_at = EXCLUDED.updated_at,
    location = EXCLUDED.location,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address_text = EXCLUDED.address_text,
    nearest_landmark = EXCLUDED.nearest_landmark,
    road_name = EXCLUDED.road_name,
    prabhag_id = EXCLUDED.prabhag_id,
    zone_id = EXCLUDED.zone_id,
    damage_type = EXCLUDED.damage_type,
    ai_confidence = EXCLUDED.ai_confidence,
    epdo_score = EXCLUDED.epdo_score,
    severity_tier = EXCLUDED.severity_tier,
    total_potholes = EXCLUDED.total_potholes,
    photo_before = EXCLUDED.photo_before,
    photo_after = EXCLUDED.photo_after,
    status = EXCLUDED.status,
    assigned_je = EXCLUDED.assigned_je,
    assigned_contractor = EXCLUDED.assigned_contractor,
    approval_tier = EXCLUDED.approval_tier,
    dimensions = EXCLUDED.dimensions,
    work_type = EXCLUDED.work_type,
    rate_per_unit = EXCLUDED.rate_per_unit,
    estimated_cost = EXCLUDED.estimated_cost,
    job_order_ref = EXCLUDED.job_order_ref,
    ssim_score = EXCLUDED.ssim_score,
    ssim_pass = EXCLUDED.ssim_pass,
    verification_hash = EXCLUDED.verification_hash,
    verified_at = EXCLUDED.verified_at,
    resolved_at = EXCLUDED.resolved_at,
    resolved_in_hours = EXCLUDED.resolved_in_hours,
    citizen_confirmed = EXCLUDED.citizen_confirmed,
    citizen_confirm_at = EXCLUDED.citizen_confirm_at,
    citizen_rating = EXCLUDED.citizen_rating
  RETURNING id INTO v_ticket_id;

  DELETE FROM public.ticket_events
  WHERE ticket_id = v_ticket_id;

  INSERT INTO public.ticket_events (
    ticket_id,
    actor_id,
    actor_role,
    event_type,
    old_status,
    new_status,
    notes,
    metadata,
    created_at
  )
  VALUES
    (
      v_ticket_id,
      v_je_id,
      'je',
      'status_change',
      'open',
      'verified',
      'JE verified dimensions and locked the rate.',
      jsonb_build_object('area_sqm', 4.32, 'work_type', 'Hot Mix Patching'),
      v_now - interval '4 days'
    ),
    (
      v_ticket_id,
      v_je_id,
      'je',
      'assignment',
      NULL,
      NULL,
      'Assigned to contractor.z4 for repair execution.',
      jsonb_build_object('assigned_contractor', v_contractor_id),
      v_now - interval '3 days 20 hours'
    ),
    (
      v_ticket_id,
      v_contractor_id,
      'contractor',
      'status_change',
      'assigned',
      'in_progress',
      'Repair work started on site.',
      jsonb_build_object('crew', 'AMC Zone 4'),
      v_now - interval '3 days'
    ),
    (
      v_ticket_id,
      v_contractor_id,
      'contractor',
      'status_change',
      'in_progress',
      'audit_pending',
      'After photo submitted for SSIM verification.',
      jsonb_build_object('after_photo', true),
      v_now - interval '2 days'
    ),
    (
      v_ticket_id,
      v_je_id,
      'je',
      'ssim_result',
      NULL,
      NULL,
      'SSIM verified. Surface change accepted.',
      jsonb_build_object('score', 0.42, 'pass', true),
      v_now - interval '30 hours'
    ),
    (
      v_ticket_id,
      v_je_id,
      'je',
      'status_change',
      'audit_pending',
      'resolved',
      'Ticket resolved after quality verification.',
      jsonb_build_object('verification_hash', 'smoke-zone4-history-verified-hash'),
      v_now - interval '1 day'
    ),
    (
      v_ticket_id,
      NULL,
      'citizen',
      'citizen_feedback',
      NULL,
      NULL,
      'Citizen confirmed the repair via follow-up.',
      jsonb_build_object('confirmed', true, 'rating', 5),
      v_now - interval '18 hours'
    );

  RAISE NOTICE 'Seeded Zone 4 JE history smoke ticket: %', v_ticket_id;
END $$;

SELECT id, ticket_ref, status, zone_id, road_name, resolved_at
FROM public.tickets
WHERE ticket_ref = 'SSR-Z4-P12-2026-SMOKE-0001';
