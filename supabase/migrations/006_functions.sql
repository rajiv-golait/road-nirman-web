-- ============================================================
-- SSR SYSTEM — MIGRATION 006: FUNCTIONS
-- ============================================================

-- 6A: Auto-assign Zone + Prabhag + JE from GPS (The routing trigger)
-- Now also calls fn_assign_je so tickets are never left unowned.
CREATE OR REPLACE FUNCTION fn_assign_zone_and_prabhag()
RETURNS TRIGGER AS $$
BEGIN
  -- Step 1: Find Prabhag from GPS point
  SELECT id INTO NEW.prabhag_id
  FROM prabhags
  WHERE boundary IS NOT NULL
    AND ST_Covers(boundary::geometry, NEW.location::geometry)
  LIMIT 1;

  -- Step 2: Get Zone from Prabhag
  IF NEW.prabhag_id IS NOT NULL THEN
    SELECT zone_id INTO NEW.zone_id
    FROM prabhags
    WHERE id = NEW.prabhag_id;
  ELSE
    -- Fallback: Direct zone lookup (if prabhag boundaries missing)
    SELECT id INTO NEW.zone_id
    FROM zones
    WHERE boundary IS NOT NULL
      AND ST_Covers(boundary::geometry, NEW.location::geometry)
    LIMIT 1;
  END IF;

  -- Fallback 2: Nearest zone centroid (for demo when polygons not loaded)
  IF NEW.zone_id IS NULL THEN
    SELECT id INTO NEW.zone_id
    FROM zones
    WHERE centroid_lat IS NOT NULL AND centroid_lng IS NOT NULL
    ORDER BY ST_Distance(
      ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
      NEW.location
    )
    LIMIT 1;
  END IF;

  -- Step 3: Auto-assign JE (load-balanced) — never leave ticket unowned
  IF NEW.zone_id IS NOT NULL AND NEW.assigned_je IS NULL THEN
    NEW.assigned_je := fn_assign_je(NEW.zone_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6B: Auto-assign JE (load balanced — fewest open tickets in zone)
-- Uses FOR UPDATE (blocking) so concurrent inserts wait rather than
-- producing NULL when a zone has only one active JE.
CREATE OR REPLACE FUNCTION fn_assign_je(p_zone_id INT)
RETURNS UUID AS $$
DECLARE
  v_je_id UUID;
BEGIN
  SELECT p.id INTO v_je_id
  FROM profiles p
  WHERE p.role = 'je'
    AND p.zone_id = p_zone_id
    AND p.is_active = true
  ORDER BY (
    SELECT COUNT(*) FROM tickets t
    WHERE t.assigned_je = p.id
      AND t.status NOT IN ('resolved', 'rejected')
  ) ASC
  LIMIT 1
  FOR UPDATE;

  RETURN v_je_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6C: Ticket ref sequence counter table + race-safe generator
-- Uses a per-zone-year counter with SELECT FOR UPDATE to guarantee uniqueness.
CREATE TABLE IF NOT EXISTS ticket_ref_counters (
  zone_id   INT NOT NULL,
  ref_year  INT NOT NULL,
  next_seq  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (zone_id, ref_year)
);

CREATE OR REPLACE FUNCTION fn_generate_ticket_ref()
RETURNS TRIGGER AS $$
DECLARE
  v_zone_num INT;
  v_prabhag_num INT;
  v_year INT;
  v_seq INT;
BEGIN
  v_zone_num := COALESCE(NEW.zone_id, 0);
  v_prabhag_num := COALESCE(NEW.prabhag_id, 0);
  v_year := EXTRACT(YEAR FROM NOW())::INT;

  -- Atomic increment: lock the counter row for this zone+year
  INSERT INTO ticket_ref_counters (zone_id, ref_year, next_seq)
  VALUES (v_zone_num, v_year, 1)
  ON CONFLICT (zone_id, ref_year)
  DO UPDATE SET next_seq = ticket_ref_counters.next_seq + 1
  RETURNING next_seq INTO v_seq;

  NEW.ticket_ref := FORMAT(
    'SSR-Z%s-P%s-%s-%s',
    v_zone_num::TEXT,
    LPAD(v_prabhag_num::TEXT, 2, '0'),
    v_year::TEXT,
    LPAD(v_seq::TEXT, 4, '0')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 6D: Trusted audit event insertion (SECURITY DEFINER)
-- Actor identity is ALWAYS derived server-side from auth.uid() + profiles.
-- Caller-supplied actor fields are ignored — forgery is impossible.
-- EXECUTE is revoked from client roles; only service_role / triggers can call.
CREATE OR REPLACE FUNCTION fn_log_audit_event(
  p_ticket_id UUID,
  p_event_type TEXT,
  p_old_status ticket_status DEFAULT NULL,
  p_new_status ticket_status DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_actor_id UUID;
  v_actor_role user_role;
BEGIN
  -- Derive actor identity server-side — never trust the caller
  v_actor_id := auth.uid();
  SELECT role INTO v_actor_role FROM profiles WHERE id = v_actor_id;

  INSERT INTO ticket_events (
    ticket_id, actor_id, actor_role, event_type,
    old_status, new_status, notes, metadata
  ) VALUES (
    p_ticket_id, v_actor_id, v_actor_role, p_event_type,
    p_old_status, p_new_status, p_notes, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke EXECUTE from all client roles — only service_role and triggers can call
REVOKE EXECUTE ON FUNCTION fn_log_audit_event(UUID, TEXT, ticket_status, ticket_status, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fn_log_audit_event(UUID, TEXT, ticket_status, ticket_status, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION fn_log_audit_event(UUID, TEXT, ticket_status, ticket_status, TEXT, JSONB) FROM authenticated;


-- 6E: Auto-log audit event on status change (trigger version)
-- Uses SECURITY DEFINER so the trigger can write to ticket_events
-- even though direct user inserts are blocked.
CREATE OR REPLACE FUNCTION fn_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_events (
      ticket_id, event_type, old_status, new_status,
      actor_id, metadata
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object(
        'updated_at', NOW(),
        'ticket_ref', NEW.ticket_ref,
        'zone_id', NEW.zone_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6F: Calculate EPDO score (IRC formula)
CREATE OR REPLACE FUNCTION fn_calculate_epdo(
  p_sai FLOAT,
  p_road_class TEXT,
  p_rainfall_risk FLOAT,
  p_proximity FLOAT
) RETURNS FLOAT AS $$
DECLARE
  v_tosm FLOAT;
  v_score FLOAT;
BEGIN
  v_tosm := CASE p_road_class
    WHEN 'national_highway' THEN 1.0
    WHEN 'state_highway'    THEN 0.85
    WHEN 'arterial'         THEN 0.75
    WHEN 'collector'        THEN 0.60
    ELSE 0.40
  END;

  v_score := (p_sai * 0.40)
           + (v_tosm * 0.30)
           + (COALESCE(p_rainfall_risk, 0.3) * 0.15)
           + (COALESCE(p_proximity, 0.5) * 0.15);

  RETURN ROUND((v_score * 10)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 6G: Compute approval tier from estimated cost
CREATE OR REPLACE FUNCTION fn_compute_approval_tier(p_cost NUMERIC)
RETURNS approval_tier AS $$
BEGIN
  IF p_cost < 50000 THEN
    RETURN 'minor';
  ELSIF p_cost <= 500000 THEN
    RETURN 'moderate';
  ELSE
    RETURN 'major';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 6H: Set approval tier + warranty on ticket update
CREATE OR REPLACE FUNCTION fn_ticket_computed_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-compute approval tier when cost is set
  IF NEW.estimated_cost IS NOT NULL AND NEW.estimated_cost > 0 THEN
    NEW.approval_tier := fn_compute_approval_tier(NEW.estimated_cost);
  END IF;

  -- Set warranty expiry when ticket resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    -- Defense-in-depth: never materialize resolution metadata unless
    -- the ticket reached resolution through the audited path.
    IF OLD.status IS DISTINCT FROM 'audit_pending' THEN
      RAISE EXCEPTION 'Ticket cannot be resolved from %; it must come from audit_pending', OLD.status;
    END IF;
    IF NEW.ssim_pass IS NOT TRUE AND NEW.citizen_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Ticket cannot be resolved without SSIM pass or citizen confirmation';
    END IF;

    NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
    NEW.resolved_in_hours := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600.0;
    NEW.warranty_expiry := (NOW() + INTERVAL '6 months')::DATE;
  END IF;

  -- Check SLA breach
  IF NEW.status NOT IN ('resolved', 'rejected') THEN
    DECLARE
      v_sla_hours INT;
    BEGIN
      SELECT resolution_hours INTO v_sla_hours
      FROM sla_config WHERE severity = NEW.severity_tier;

      IF v_sla_hours IS NOT NULL THEN
        NEW.sla_breach := EXTRACT(EPOCH FROM (NOW() - NEW.created_at)) / 3600.0 > v_sla_hours;
      END IF;
    END;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 6I: 50m spatial deduplication check
CREATE OR REPLACE FUNCTION fn_check_spatial_duplicate(
  p_lng FLOAT,
  p_lat FLOAT
) RETURNS TABLE(
  ticket_id UUID,
  ticket_ref TEXT,
  distance_m FLOAT,
  status ticket_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.ticket_ref,
    ST_Distance(
      t.location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) AS distance_m,
    t.status
  FROM tickets t
  WHERE ST_DWithin(
    t.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    50
  )
  AND t.status NOT IN ('resolved', 'rejected')
  AND t.is_duplicate = false
  ORDER BY distance_m ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;


-- 6J: Chronic location detection (Rule 7)
CREATE OR REPLACE FUNCTION fn_check_chronic_location(
  p_lng FLOAT,
  p_lat FLOAT,
  p_zone_id INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM tickets t
  WHERE ST_DWithin(
    t.location,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    50
  )
  AND t.created_at > NOW() - INTERVAL '90 days'
  AND t.status NOT IN ('rejected');

  RETURN v_count >= 3;
END;
$$ LANGUAGE plpgsql;


-- 6K: Zone budget consumption calculator
CREATE OR REPLACE FUNCTION fn_zone_budget_consumed(p_zone_id INT)
RETURNS NUMERIC AS $$
DECLARE
  v_consumed NUMERIC;
BEGIN
  SELECT COALESCE(SUM(estimated_cost), 0) INTO v_consumed
  FROM tickets
  WHERE zone_id = p_zone_id
    AND status IN ('assigned', 'in_progress', 'audit_pending', 'resolved')
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN v_consumed;
END;
$$ LANGUAGE plpgsql;
