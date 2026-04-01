-- ============================================================
-- SSR SYSTEM — MIGRATION 005: PERFORMANCE INDEXES
-- ============================================================

-- GIS INDEXES (Spatial routing)
CREATE INDEX idx_zones_boundary ON zones USING GIST (boundary);
CREATE INDEX idx_prabhags_boundary ON prabhags USING GIST (boundary);
CREATE INDEX idx_tickets_location ON tickets USING GIST (location);
CREATE INDEX idx_chronic_locations ON chronic_locations USING GIST (location);

-- TICKET QUERY INDEXES
CREATE INDEX idx_tickets_zone ON tickets (zone_id);
CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_je ON tickets (assigned_je);
CREATE INDEX idx_tickets_contractor ON tickets (assigned_contractor);
CREATE INDEX idx_tickets_severity ON tickets (severity_tier);
CREATE INDEX idx_tickets_created ON tickets (created_at DESC);
CREATE INDEX idx_tickets_department ON tickets (department_id);
CREATE INDEX idx_tickets_sla_breach ON tickets (sla_breach) WHERE sla_breach = true;
CREATE INDEX idx_tickets_active ON tickets (zone_id, status) WHERE status NOT IN ('resolved', 'rejected');
CREATE INDEX idx_tickets_warranty ON tickets (warranty_expiry) WHERE warranty_expiry IS NOT NULL;
CREATE INDEX idx_tickets_citizen ON tickets (citizen_id);
CREATE INDEX idx_tickets_master ON tickets (master_ticket_id) WHERE master_ticket_id IS NOT NULL;

-- AUDIT TRAIL INDEXES
CREATE INDEX idx_ticket_events_ticket ON ticket_events (ticket_id, created_at);
CREATE INDEX idx_ticket_events_actor ON ticket_events (actor_id, created_at DESC);
CREATE INDEX idx_ticket_events_type ON ticket_events (event_type);

-- BILLING INDEXES
CREATE INDEX idx_bills_contractor ON contractor_bills (contractor_id);
CREATE INDEX idx_bills_zone ON contractor_bills (zone_id);
CREATE INDEX idx_bills_status ON contractor_bills (status);

-- PROFILE INDEXES
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_zone_role ON profiles (zone_id, role) WHERE is_active = true;
CREATE INDEX idx_profiles_phone ON profiles (phone);

-- TEXT SEARCH INDEXES
CREATE INDEX idx_tickets_address_trgm ON tickets USING GIN (address_text gin_trgm_ops);
CREATE INDEX idx_tickets_landmark_trgm ON tickets USING GIN (nearest_landmark gin_trgm_ops);

-- NOTIFICATION INDEXES
CREATE INDEX idx_notifications_ticket ON notifications (ticket_id);
CREATE INDEX idx_notifications_status ON notifications (status) WHERE status = 'pending';
