-- ============================================================
-- SSR SYSTEM — MIGRATION 008: ROW LEVEL SECURITY
-- ============================================================
-- RLS ensures every role sees ONLY what they're authorized to.
-- This is the Permission Pyramid enforced at DB level.
-- ============================================================

-- Enable RLS on all sensitive tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (important for Supabase)
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_events FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE contractor_bills FORCE ROW LEVEL SECURITY;
ALTER TABLE contractors FORCE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;


-- ================================================================
-- PROFILES POLICIES
-- ================================================================

-- Everyone can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Officials can read profiles in their zone
CREATE POLICY profiles_select_zone ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('je', 'de', 'assistant_commissioner')
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

-- Admin roles can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('city_engineer', 'commissioner', 'super_admin')
  );

-- Users can update their own profile (limited fields)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admin can manage all profiles
CREATE POLICY profiles_admin ON profiles
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );


-- ================================================================
-- TICKETS POLICIES
-- ================================================================

-- Citizens see only their own tickets
CREATE POLICY tickets_citizen_select ON tickets
  FOR SELECT USING (citizen_id = auth.uid());

-- Citizens (and only citizens) can insert tickets
CREATE POLICY tickets_citizen_insert ON tickets
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'citizen'
  );

-- JE: see and update tickets in their zone
CREATE POLICY tickets_je_select ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'je'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY tickets_je_update ON tickets
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'je'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

-- DE: see zone tickets
CREATE POLICY tickets_de_select ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'de'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

-- Asst Commissioner: read and update zone tickets, but NEVER delete
CREATE POLICY tickets_ac_select ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'assistant_commissioner'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY tickets_ac_update ON tickets
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'assistant_commissioner'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'assistant_commissioner'
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

-- Contractor: see only assigned tickets
CREATE POLICY tickets_contractor_select ON tickets
  FOR SELECT USING (
    assigned_contractor = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'contractor'
  );

-- Contractor: update only their assigned tickets (photo upload)
CREATE POLICY tickets_contractor_update ON tickets
  FOR UPDATE USING (
    assigned_contractor = auth.uid()
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'contractor'
  );

-- Accounts: read-only on audit_pending + resolved tickets
CREATE POLICY tickets_accounts_select ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'accounts'
    AND status IN ('audit_pending', 'resolved')
  );

-- Commissioner / City Engineer / Super Admin: full read on all
CREATE POLICY tickets_admin_select ON tickets
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('commissioner', 'city_engineer', 'super_admin')
  );

-- City Engineer / Super Admin: insert + update, but NEVER delete
CREATE POLICY tickets_admin_insert ON tickets
  FOR INSERT WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('city_engineer', 'super_admin')
  );

CREATE POLICY tickets_admin_update ON tickets
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('city_engineer', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('city_engineer', 'super_admin')
  );


-- ================================================================
-- TICKET EVENTS POLICIES — IMMUTABLE, UNFORGEABLE AUDIT TRAIL
-- ================================================================
-- Direct INSERT by any user is BLOCKED.
-- Only SECURITY DEFINER functions (fn_log_status_change,
-- fn_log_audit_event) can write to this table.
-- This prevents citizens/contractors from fabricating events.

-- NO INSERT policy for regular users — only SECURITY DEFINER functions bypass RLS

-- Read events for tickets you can see (inherits ticket visibility)
CREATE POLICY events_select ON ticket_events
  FOR SELECT USING (
    ticket_id IN (SELECT id FROM tickets)
  );

-- NO UPDATE or DELETE policies — audit trail is immutable


-- ================================================================
-- BILL LINE ITEMS POLICIES
-- ================================================================

ALTER TABLE bill_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_line_items FORCE ROW LEVEL SECURITY;

-- Contractor can read own line items (via bill ownership)
CREATE POLICY line_items_contractor_select ON bill_line_items
  FOR SELECT USING (
    bill_id IN (SELECT id FROM contractor_bills WHERE contractor_id = auth.uid())
  );

-- Contractor can insert line items for own bills in draft status
CREATE POLICY line_items_contractor_insert ON bill_line_items
  FOR INSERT WITH CHECK (
    bill_id IN (SELECT id FROM contractor_bills WHERE contractor_id = auth.uid() AND status = 'draft')
  );

-- Accounts / admin can read and update line items, but NEVER delete them
CREATE POLICY line_items_admin_select ON bill_line_items
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  );

CREATE POLICY line_items_admin_update ON bill_line_items
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  );

-- Zone officers can read ONLY their own zone's line items (scoped through parent bill)
CREATE POLICY line_items_zone_read ON bill_line_items
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('assistant_commissioner', 'de')
    AND bill_id IN (
      SELECT id FROM contractor_bills
      WHERE zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Commissioner: cross-zone read access (strategic oversight)
CREATE POLICY line_items_commissioner_read ON bill_line_items
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'commissioner'
  );


-- ================================================================
-- CONTRACTOR BILLS POLICIES
-- ================================================================

-- Contractor sees own bills
CREATE POLICY bills_contractor_select ON contractor_bills
  FOR SELECT USING (contractor_id = auth.uid());

-- Contractor can insert/update draft bills
CREATE POLICY bills_contractor_write ON contractor_bills
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

CREATE POLICY bills_contractor_update ON contractor_bills
  FOR UPDATE USING (
    contractor_id = auth.uid() AND status = 'draft'
  );

-- Accounts / admin can read and update bills, but NEVER delete them
CREATE POLICY bills_accounts_select ON contractor_bills
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  );

CREATE POLICY bills_accounts_update ON contractor_bills
  FOR UPDATE USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('accounts', 'city_engineer', 'super_admin')
  );

-- Zone officers can read zone bills
CREATE POLICY bills_zone_select ON contractor_bills
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('assistant_commissioner', 'de')
    AND zone_id = (SELECT zone_id FROM profiles WHERE id = auth.uid())
  );

-- Commissioner: read all bills
CREATE POLICY bills_commissioner ON contractor_bills
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'commissioner'
  );


-- ================================================================
-- CONTRACTORS TABLE POLICIES
-- ================================================================

CREATE POLICY contractors_own ON contractors
  FOR SELECT USING (id = auth.uid());

CREATE POLICY contractors_admin ON contractors
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('city_engineer', 'super_admin')
  );

CREATE POLICY contractors_zone_read ON contractors
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('assistant_commissioner', 'de', 'commissioner')
  );


-- ================================================================
-- NOTIFICATIONS POLICIES
-- ================================================================

CREATE POLICY notifications_own ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY notifications_admin ON notifications
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN
      ('super_admin', 'city_engineer')
  );


-- ================================================================
-- PUBLIC READ TABLES (no RLS needed — public reference data)
-- ================================================================
-- departments, zones, prabhags, rate_cards, sla_config,
-- escalation_rules are readable by all authenticated users.
-- They don't need RLS — just grant SELECT.

GRANT SELECT ON departments TO authenticated;
GRANT SELECT ON zones TO authenticated;
GRANT SELECT ON prabhags TO authenticated;
GRANT SELECT ON rate_cards TO authenticated;
GRANT SELECT ON sla_config TO authenticated;
GRANT SELECT ON escalation_rules TO authenticated;
GRANT SELECT ON chronic_locations TO authenticated;
GRANT SELECT ON prabhag_zone_mapping TO authenticated;
GRANT SELECT ON contractor_metrics TO authenticated;
