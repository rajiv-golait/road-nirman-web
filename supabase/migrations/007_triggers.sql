-- ============================================================
-- SSR SYSTEM — MIGRATION 007: TRIGGERS
-- ============================================================

-- 7A: Auto-assign Zone + Prabhag on ticket INSERT
CREATE TRIGGER trg_assign_zone
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_assign_zone_and_prabhag();

-- 7B: Auto-generate ticket reference on INSERT
CREATE TRIGGER trg_ticket_ref
BEFORE INSERT ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_generate_ticket_ref();

-- 7C: Auto-log audit event on status UPDATE
CREATE TRIGGER trg_audit_status
AFTER UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_log_status_change();

-- 7D: Auto-compute approval tier, warranty, SLA breach on UPDATE
CREATE TRIGGER trg_computed_fields
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_ticket_computed_fields();

-- 7E: Auto-set updated_at timestamp
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- 7F: Bill line item validation + server-side derivation trigger
-- 1. Validates contractor/zone/status ownership
-- 2. OVERWRITES caller-supplied financial/evidence fields with locked ticket values
--    so contractors cannot inflate amounts or substitute evidence
CREATE OR REPLACE FUNCTION fn_validate_bill_line_item()
RETURNS TRIGGER AS $$
DECLARE
  v_bill_contractor UUID;
  v_bill_zone INT;
  v_ticket tickets%ROWTYPE;
BEGIN
  -- Get bill header's contractor and zone
  SELECT contractor_id, zone_id INTO v_bill_contractor, v_bill_zone
  FROM contractor_bills WHERE id = NEW.bill_id;

  -- Get the full ticket record
  SELECT * INTO v_ticket FROM tickets WHERE id = NEW.ticket_id;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket % does not exist', NEW.ticket_id;
  END IF;

  -- Validate: ticket must be assigned to the bill's contractor
  IF v_ticket.assigned_contractor IS DISTINCT FROM v_bill_contractor THEN
    RAISE EXCEPTION 'Ticket % is not assigned to this contractor', NEW.ticket_id;
  END IF;

  -- Validate: ticket must be in the same zone as the bill
  IF v_ticket.zone_id IS DISTINCT FROM v_bill_zone THEN
    RAISE EXCEPTION 'Ticket % is in zone %, but bill is for zone %',
      NEW.ticket_id, v_ticket.zone_id, v_bill_zone;
  END IF;

  -- Validate: ticket must be in a billable state
  IF v_ticket.status NOT IN ('audit_pending', 'resolved') THEN
    RAISE EXCEPTION 'Ticket % is in status %; must be audit_pending or resolved to bill',
      NEW.ticket_id, v_ticket.status;
  END IF;

  -- STRICT DERIVATION: fail closed if locked billing fields are missing
  -- Never fall back to caller-supplied values — that reintroduces overbilling risk
  IF v_ticket.rate_per_unit IS NULL THEN
    RAISE EXCEPTION 'Ticket % is missing locked rate_per_unit — cannot bill', NEW.ticket_id;
  END IF;
  IF v_ticket.dimensions IS NULL OR v_ticket.dimensions->>'area_sqm' IS NULL THEN
    RAISE EXCEPTION 'Ticket % is missing locked dimensions.area_sqm — cannot bill', NEW.ticket_id;
  END IF;
  IF v_ticket.work_type IS NULL THEN
    RAISE EXCEPTION 'Ticket % is missing locked work_type — cannot bill', NEW.ticket_id;
  END IF;

  -- Derive ALL financial/evidence fields from the immutable ticket record
  NEW.work_type         := v_ticket.work_type;
  NEW.area_sqm          := (v_ticket.dimensions->>'area_sqm')::NUMERIC;
  NEW.rate_per_unit     := v_ticket.rate_per_unit;
  NEW.line_amount       := NEW.area_sqm * NEW.rate_per_unit;
  NEW.ssim_score        := v_ticket.ssim_score;
  NEW.ssim_pass         := v_ticket.ssim_pass;
  NEW.photo_before      := CASE WHEN v_ticket.photo_before IS NOT NULL
                             THEN v_ticket.photo_before[1] ELSE NULL END;
  NEW.photo_after       := v_ticket.photo_after;
  NEW.verification_hash := v_ticket.verification_hash;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_line_item
BEFORE INSERT OR UPDATE ON bill_line_items
FOR EACH ROW EXECUTE FUNCTION fn_validate_bill_line_item();


-- 7G: Bill header protection trigger
-- Blocks changes to contractor_id and zone_id once line items exist.
-- Totals are managed by trg_sync_bill_totals on the line-item side.
CREATE OR REPLACE FUNCTION fn_protect_bill_header()
RETURNS TRIGGER AS $$
DECLARE
  v_has_items BOOLEAN;
BEGIN
  -- Check if bill has any line items
  SELECT EXISTS(SELECT 1 FROM bill_line_items WHERE bill_id = NEW.id)
  INTO v_has_items;

  -- Block identity changes if line items exist
  IF v_has_items THEN
    IF OLD.contractor_id IS DISTINCT FROM NEW.contractor_id THEN
      RAISE EXCEPTION 'Cannot change contractor_id on bill % — it has line items', NEW.bill_ref;
    END IF;
    IF OLD.zone_id IS DISTINCT FROM NEW.zone_id THEN
      RAISE EXCEPTION 'Cannot change zone_id on bill % — it has line items', NEW.bill_ref;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_bill_header
BEFORE UPDATE ON contractor_bills
FOR EACH ROW EXECUTE FUNCTION fn_protect_bill_header();


-- 7H: Auto-sync bill totals when line items change
-- Fires AFTER INSERT/UPDATE/DELETE on bill_line_items.
-- Recomputes total_tickets, total_area_sqm, total_amount on the parent bill.
CREATE OR REPLACE FUNCTION fn_sync_bill_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_bill_id UUID;
BEGIN
  -- Determine which bill was affected
  v_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);

  UPDATE contractor_bills SET
    total_tickets  = sub.cnt,
    total_area_sqm = sub.area,
    total_amount   = sub.amt
  FROM (
    SELECT
      COUNT(*)                       AS cnt,
      COALESCE(SUM(area_sqm), 0)     AS area,
      COALESCE(SUM(line_amount), 0)  AS amt
    FROM bill_line_items
    WHERE bill_id = v_bill_id
  ) sub
  WHERE contractor_bills.id = v_bill_id;

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_bill_totals
AFTER INSERT OR UPDATE OR DELETE ON bill_line_items
FOR EACH ROW EXECUTE FUNCTION fn_sync_bill_totals();


-- ================================================================
-- 7I: PROFILE COLUMN GUARD (P0 FIX)
-- Prevents privilege escalation by blocking non-admin users from
-- changing their own role, zone, department, or system-computed fields.
-- Users may only edit: full_name, phone, email, fcm_token.
-- ================================================================

CREATE OR REPLACE FUNCTION fn_guard_profile_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Super admin can change anything
  IF v_caller_role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  -- Block privileged column changes for all other users
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Cannot change role — requires super_admin';
  END IF;
  IF OLD.zone_id IS DISTINCT FROM NEW.zone_id THEN
    RAISE EXCEPTION 'Cannot change zone_id — requires super_admin';
  END IF;
  IF OLD.department_id IS DISTINCT FROM NEW.department_id THEN
    RAISE EXCEPTION 'Cannot change department_id — requires super_admin';
  END IF;
  IF OLD.employee_id IS DISTINCT FROM NEW.employee_id THEN
    RAISE EXCEPTION 'Cannot change employee_id — requires super_admin';
  END IF;
  IF OLD.designation IS DISTINCT FROM NEW.designation THEN
    RAISE EXCEPTION 'Cannot change designation — requires super_admin';
  END IF;
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    RAISE EXCEPTION 'Cannot change is_active — requires super_admin';
  END IF;
  IF OLD.opi_score IS DISTINCT FROM NEW.opi_score THEN
    RAISE EXCEPTION 'Cannot change opi_score — system-computed';
  END IF;
  IF OLD.opi_zone IS DISTINCT FROM NEW.opi_zone THEN
    RAISE EXCEPTION 'Cannot change opi_zone — system-computed';
  END IF;
  IF OLD.opi_last_computed IS DISTINCT FROM NEW.opi_last_computed THEN
    RAISE EXCEPTION 'Cannot change opi_last_computed — system-computed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_guard_profile_columns
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION fn_guard_profile_columns();


-- ================================================================
-- 7J: TICKET COLUMN GUARD (P1 FIX)
-- Per-role write restrictions on ticket fields.
-- Named trg_aa_ so it fires BEFORE trg_computed_fields alphabetically.
-- This trigger sees raw user input, not trigger-modified computed fields.
--
-- Role permissions:
--   citizen    → citizen_confirmed, citizen_rating, citizen_confirm_at ONLY
--   contractor → photo_after ONLY
--   je         → verification + workflow fields, NOT ssim/billing/feedback
--   de/ac      → status (approvals) ONLY, NOT financial/verification fields
--   accounts   → bill_id ONLY
--   admin      → unrestricted (city_engineer, commissioner, super_admin)
-- ================================================================

CREATE OR REPLACE FUNCTION fn_guard_ticket_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
  v_old_rest tickets%ROWTYPE;
  v_new_rest tickets%ROWTYPE;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  -- Admin roles: unrestricted
  IF v_caller_role IN ('city_engineer', 'commissioner', 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- 1. System-managed immutable columns (NO ONE can touch these via UPDATE)
  IF OLD.ticket_ref IS DISTINCT FROM NEW.ticket_ref THEN
    RAISE EXCEPTION 'ticket_ref is system-generated and immutable';
  END IF;
  IF OLD.zone_id IS DISTINCT FROM NEW.zone_id THEN
    RAISE EXCEPTION 'zone_id is system-routed and immutable';
  END IF;
  IF OLD.prabhag_id IS DISTINCT FROM NEW.prabhag_id THEN
    RAISE EXCEPTION 'prabhag_id is system-routed and immutable';
  END IF;
  IF OLD.assigned_je IS DISTINCT FROM NEW.assigned_je THEN
    RAISE EXCEPTION 'assigned_je is system-assigned and immutable';
  END IF;
  -- Location is immutable after intake
  IF OLD.location IS DISTINCT FROM NEW.location 
     OR OLD.latitude IS DISTINCT FROM NEW.latitude 
     OR OLD.longitude IS DISTINCT FROM NEW.longitude THEN
    RAISE EXCEPTION 'Ticket location data is immutable after creation';
  END IF;

  -- Setup record comparison for strict ALLOW-LIST checking
  v_old_rest := OLD;
  v_new_rest := NEW;

  -- Always ignore auto-touch fields for the comparison
  v_old_rest.updated_at := NULL; v_new_rest.updated_at := NULL;

  -- ── CITIZEN allowlist: feedback only ──
  IF v_caller_role = 'citizen' THEN
    v_old_rest.citizen_confirmed := NULL; v_new_rest.citizen_confirmed := NULL;
    v_old_rest.citizen_rating := NULL;    v_new_rest.citizen_rating := NULL;
    v_old_rest.citizen_confirm_at := NULL;v_new_rest.citizen_confirm_at := NULL;
    
    IF v_old_rest IS DISTINCT FROM v_new_rest THEN
      RAISE EXCEPTION 'Citizens can only update feedback fields (citizen_confirmed, citizen_rating)';
    END IF;
    RETURN NEW;
  END IF;

  -- ── CONTRACTOR allowlist: work execution ──
  IF v_caller_role = 'contractor' THEN
    v_old_rest.photo_after := NULL; v_new_rest.photo_after := NULL;
    v_old_rest.status := NULL;      v_new_rest.status := NULL; -- Needed to push to audit_pending
    
    IF v_old_rest IS DISTINCT FROM v_new_rest THEN
      RAISE EXCEPTION 'Contractors can only update photo_after and status (to audit_pending)';
    END IF;
    RETURN NEW;
  END IF;

  -- ── JE allowlist: triage, verify, assign ──
  IF v_caller_role = 'je' THEN
    v_old_rest.status := NULL;              v_new_rest.status := NULL;
    v_old_rest.photo_je_inspection := NULL; v_new_rest.photo_je_inspection := NULL;
    v_old_rest.department_note := NULL;     v_new_rest.department_note := NULL;
    v_old_rest.damage_cause := NULL;        v_new_rest.damage_cause := NULL;
    
    -- Economic fields are strictly immutable once the ticket leaves 'open' or 'verified'
    IF OLD.status NOT IN ('open', 'verified') AND (
         OLD.work_type IS DISTINCT FROM NEW.work_type OR
         OLD.dimensions IS DISTINCT FROM NEW.dimensions OR
         OLD.rate_per_unit IS DISTINCT FROM NEW.rate_per_unit OR
         OLD.estimated_cost IS DISTINCT FROM NEW.estimated_cost OR
         OLD.rate_card_id IS DISTINCT FROM NEW.rate_card_id OR
         OLD.assigned_contractor IS DISTINCT FROM NEW.assigned_contractor
       ) THEN
      RAISE EXCEPTION 'Economic details and contractor assignment are locked after the ticket leaves the verification phase';
    END IF;

    -- If we are in 'open' or 'verified', allow editing them
    v_old_rest.work_type := NULL;           v_new_rest.work_type := NULL;
    v_old_rest.dimensions := NULL;          v_new_rest.dimensions := NULL;
    v_old_rest.rate_per_unit := NULL;       v_new_rest.rate_per_unit := NULL;
    v_old_rest.estimated_cost := NULL;      v_new_rest.estimated_cost := NULL;
    v_old_rest.assigned_contractor := NULL; v_new_rest.assigned_contractor := NULL;
    v_old_rest.rate_card_id := NULL;        v_new_rest.rate_card_id := NULL;
    -- Note: SSIM, billing, and resolution fields remain untouched
    
    IF v_old_rest IS DISTINCT FROM v_new_rest THEN
      RAISE EXCEPTION 'JE can only update workflow state, verify dimensions/cost, and assign contractors';
    END IF;
    RETURN NEW;
  END IF;

  -- ── DE / ASSISTANT COMMISSIONER allowlist: status tracking ──
  IF v_caller_role IN ('de', 'assistant_commissioner') THEN
    v_old_rest.status := NULL; v_new_rest.status := NULL;
    IF v_old_rest IS DISTINCT FROM v_new_rest THEN
      RAISE EXCEPTION 'Zone officers can only update ticket status';
    END IF;
    RETURN NEW;
  END IF;

  -- ── ACCOUNTS allowlist: billing integration ──
  IF v_caller_role = 'accounts' THEN
    v_old_rest.bill_id := NULL; v_new_rest.bill_id := NULL;
    v_old_rest.status := NULL;  v_new_rest.status := NULL;
    IF v_old_rest IS DISTINCT FROM v_new_rest THEN
      RAISE EXCEPTION 'Accounts can only update bill_id and billing status';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Named trg_aa_ so it fires BEFORE trg_computed_fields alphabetically
CREATE TRIGGER trg_aa_guard_ticket_columns
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_guard_ticket_columns();


-- ================================================================
-- 7K: TICKET STATE MACHINE GUARD (P1 FIX)
-- Enforces legal workflow transitions and prevents bypassing verification steps.
-- Fires BEFORE UPDATE OF status ON tickets.
-- ================================================================

CREATE OR REPLACE FUNCTION fn_validate_ticket_transitions()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role user_role;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    
    -- System/Admin bypass
    IF v_caller_role IN ('city_engineer', 'commissioner', 'super_admin') THEN
      RETURN NEW;
    END IF;

    -- Strict State Machine
    CASE OLD.status
      WHEN 'open' THEN
        IF NEW.status NOT IN ('verified', 'rejected', 'cross_assigned', 'escalated') THEN
          RAISE EXCEPTION 'From open, ticket can only move to verified, rejected, cross_assigned, or escalated';
        END IF;
        IF NEW.status = 'verified' AND (NEW.dimensions IS NULL OR NEW.rate_per_unit IS NULL) THEN
          RAISE EXCEPTION 'Ticket must have verified dimensions and rate to move to verified';
        END IF;
        IF NEW.status = 'escalated'
           AND v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can escalate an open ticket';
        END IF;

      WHEN 'verified' THEN
        IF NEW.status NOT IN ('assigned', 'escalated') THEN
          RAISE EXCEPTION 'From verified, ticket can only move to assigned or escalated';
        END IF;
        IF NEW.status = 'assigned' AND NEW.assigned_contractor IS NULL THEN
          RAISE EXCEPTION 'Ticket must have an assigned contractor to be marked assigned';
        END IF;
        IF NEW.status = 'escalated'
           AND v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can escalate a verified ticket';
        END IF;

      WHEN 'assigned' THEN
        IF NEW.status NOT IN ('in_progress', 'escalated') THEN
          RAISE EXCEPTION 'From assigned, ticket can only move to in_progress or escalated';
        END IF;
        IF NEW.status = 'escalated'
           AND v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can escalate an assigned ticket';
        END IF;

      WHEN 'in_progress' THEN
        IF NEW.status NOT IN ('audit_pending', 'escalated') THEN
          RAISE EXCEPTION 'From in_progress, ticket can only move to audit_pending or escalated';
        END IF;
        IF NEW.status = 'audit_pending' AND NEW.photo_after IS NULL THEN
          RAISE EXCEPTION 'Cannot submit for audit without an after-photo';
        END IF;
        IF NEW.status = 'escalated'
           AND v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can escalate an in-progress ticket';
        END IF;

      WHEN 'audit_pending' THEN
        IF NEW.status NOT IN ('resolved', 'in_progress', 'escalated') THEN
          RAISE EXCEPTION 'From audit_pending, ticket can only move to resolved, back to in_progress, or escalated';
        END IF;
        IF NEW.status = 'resolved' AND NEW.ssim_pass IS NOT TRUE AND NEW.citizen_confirmed IS NOT TRUE THEN
          RAISE EXCEPTION 'Ticket cannot be resolved without passing SSIM verification or citizen confirmation';
        END IF;
        IF NEW.status = 'escalated'
           AND v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can escalate an audit-pending ticket';
        END IF;

      WHEN 'resolved' THEN
        RAISE EXCEPTION 'Ticket is resolved and cannot change state';
        
      WHEN 'rejected' THEN
        RAISE EXCEPTION 'Ticket is rejected and cannot change state';

      WHEN 'cross_assigned' THEN
        RAISE EXCEPTION 'Ticket is cross-assigned and cannot change state';
        
      WHEN 'escalated' THEN
        IF v_caller_role NOT IN ('de', 'assistant_commissioner') THEN
          RAISE EXCEPTION 'Only DE or Assistant Commissioner can move an escalated ticket back into workflow';
        END IF;
        IF NEW.status NOT IN ('verified', 'assigned', 'in_progress', 'audit_pending', 'resolved') THEN
          RAISE EXCEPTION 'From escalated, ticket can only move to verified, assigned, in_progress, audit_pending, or resolved';
        END IF;
        IF NEW.status IN ('verified', 'assigned')
           AND (NEW.dimensions IS NULL OR NEW.rate_per_unit IS NULL) THEN
          RAISE EXCEPTION 'Escalated ticket needs verified dimensions and rate before re-entering workflow';
        END IF;
        IF NEW.status = 'assigned' AND NEW.assigned_contractor IS NULL THEN
          RAISE EXCEPTION 'Escalated ticket needs an assigned contractor before moving to assigned';
        END IF;
        IF NEW.status IN ('in_progress', 'audit_pending', 'resolved')
           AND NEW.assigned_contractor IS NULL THEN
          RAISE EXCEPTION 'Escalated ticket needs an assigned contractor before resuming execution';
        END IF;
        IF NEW.status IN ('audit_pending', 'resolved') AND NEW.photo_after IS NULL THEN
          RAISE EXCEPTION 'Escalated ticket needs an after-photo before audit or resolution';
        END IF;
        IF NEW.status = 'resolved'
           AND NEW.ssim_pass IS NOT TRUE
           AND NEW.citizen_confirmed IS NOT TRUE THEN
          RAISE EXCEPTION 'Escalated ticket cannot be resolved without passing SSIM verification or citizen confirmation';
        END IF;

      ELSE
        RAISE EXCEPTION 'Unknown status origin: %', OLD.status;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ticket_state_machine
BEFORE UPDATE OF status ON tickets
FOR EACH ROW EXECUTE FUNCTION fn_validate_ticket_transitions();
