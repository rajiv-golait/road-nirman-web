// ============================================================
// SSR Web Dashboard — Database Types
// Derived directly from Supabase migrations 002–004
// ============================================================

// -- Enums (from 002_enums.sql) --

export type TicketStatus =
  | 'open'
  | 'verified'
  | 'assigned'
  | 'in_progress'
  | 'audit_pending'
  | 'resolved'
  | 'rejected'
  | 'escalated'
  | 'cross_assigned';

export type BillStatus =
  | 'draft'
  | 'submitted'
  | 'accounts_review'
  | 'approved'
  | 'paid'
  | 'rejected';

export type SeverityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type UserRole =
  | 'citizen'
  | 'je'
  | 'mukadam'
  | 'ae'
  | 'de'
  | 'ee'
  | 'assistant_commissioner'
  | 'city_engineer'
  | 'commissioner'
  | 'standing_committee'
  | 'contractor'
  | 'accounts'
  | 'super_admin';

export type ApprovalTier = 'minor' | 'moderate' | 'major';

export type DamageCause =
  | 'heavy_rainfall'
  | 'construction_excavation'
  | 'utility_water'
  | 'utility_drainage'
  | 'utility_electricity'
  | 'utility_telecom'
  | 'poor_construction'
  | 'heavy_vehicular_load'
  | 'general_wear';

export type DepartmentCode =
  | 'ROADS'
  | 'WATER_SUPPLY'
  | 'DRAINAGE'
  | 'MSEDCL'
  | 'TRAFFIC'
  | 'DISASTER_MGMT';

// -- Core Models (from 004_core_tables.sql) --

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: UserRole;
  zone_id: number | null;
  department_id: number;
  employee_id: string | null;
  designation: string | null;
  is_active: boolean;
  opi_score: number | null;
  opi_zone: 'green' | 'yellow' | 'red' | null;
  opi_last_computed: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketDimensions {
  length_m: number;
  width_m: number;
  depth_m: number;
  area_sqm: number;
}

export interface Ticket {
  id: string;
  ticket_ref: string;
  created_at: string;
  updated_at: string;
  // Reporter
  citizen_id: string | null;
  citizen_phone: string | null;
  citizen_name: string | null;
  source_channel: string;
  // Location
  latitude: number;
  longitude: number;
  address_text: string | null;
  nearest_landmark: string | null;
  road_name: string | null;
  prabhag_id: number | null;
  zone_id: number | null;
  // Classification
  damage_type: string | null;
  damage_cause: DamageCause | null;
  department_id: number;
  // AI Analysis
  ai_confidence: number | null;
  epdo_score: number | null;
  severity_tier: SeverityTier | null;
  total_potholes: number | null;
  // Evidence
  photo_before: string[];       // ARRAY — use first image as primary
  photo_after: string | null;   // single string
  photo_je_inspection: string | null;
  // Workflow
  status: TicketStatus;
  assigned_je: string | null;
  assigned_contractor: string | null;  // XOR with assigned_mukadam
  assigned_mukadam: string | null;     // XOR with assigned_contractor
  approval_tier: ApprovalTier | null;
  // JE Verification
  je_checkin_lat: number | null;
  je_checkin_lng: number | null;
  je_checkin_time: string | null;
  je_checkin_distance_m: number | null;
  dimensions: TicketDimensions | null;
  work_type: string | null;
  rate_card_id: string | null;
  rate_per_unit: number | null;
  estimated_cost: number | null;
  job_order_ref: string | null;
  // SSIM Verification
  ssim_score: number | null;
  ssim_pass: boolean | null;     // INVERSE: < 0.75 = PASS
  verification_hash: string | null;
  verified_at: string | null;
  // Billing
  bill_id: string | null;
  // Resolution
  resolved_at: string | null;
  resolved_in_hours: number | null;
  escalation_count: number;
  sla_breach: boolean;
  warranty_expiry: string | null;
  // Citizen Feedback
  citizen_confirmed: boolean | null;
  citizen_confirm_at: string | null;
  citizen_rating: number | null;
  // Flags
  is_duplicate: boolean;
  master_ticket_id: string | null;
  is_chronic_location: boolean;
  chronic_location_id: string | null;
  opi_breach_level: number;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  actor_role: UserRole | null;
  event_type: string;
  old_status: TicketStatus | null;
  new_status: TicketStatus | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ContractorBill {
  id: string;
  bill_ref: string;
  contractor_id: string;
  zone_id: number | null;
  fiscal_year: string;
  total_tickets: number;
  total_area_sqm: number;
  total_amount: number;
  pdf_url: string | null;
  status: BillStatus;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  payment_ref: string | null;
  payment_date: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface BillLineItem {
  id: string;
  bill_id: string;
  ticket_id: string;
  work_type: string;
  area_sqm: number;
  rate_per_unit: number;
  line_amount: number;
  ssim_score: number | null;
  ssim_pass: boolean | null;
  photo_before: string | null;
  photo_after: string | null;
  verification_hash: string | null;
  created_at: string;
}

export interface ContractorMetrics {
  contractor_id: string;
  zone_id: number | null;
  total_assigned: number;
  total_completed: number;
  total_ssim_pass: number;
  total_ssim_fail: number;
  total_reopen: number;
  total_defect_flags: number;
  avg_repair_hours: number | null;
  ssim_pass_rate: number | null;
  reopen_rate: number | null;
  quality_index: number | null;
  scorecard_rank: number | null;
  last_computed_at: string | null;
}

// -- Reference Models (from 003_master_tables.sql) --

export interface Zone {
  id: number;
  name: string;
  name_marathi: string;
  key_areas: string;
  annual_road_budget: number;
  budget_consumed: number;
  centroid_lat: number;
  centroid_lng: number;
}

export interface Prabhag {
  id: number;
  name: string;
  name_marathi: string | null;
  zone_id: number;
  is_split: boolean;
  seat_count: number;
}

export interface RateCard {
  id: string;
  fiscal_year: string;
  work_type: string;
  work_type_marathi: string | null;
  unit: string;
  rate_per_unit: number;
  zone_id: number | null;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

export interface SlaConfig {
  severity: SeverityTier;
  response_hours: number;
  resolution_hours: number;
  escalate_l1_hours: number;
  escalate_l2_hours: number;
  escalate_l3_hours: number;
}

export interface EscalationRule {
  id: number;
  rule_number: number;
  rule_name: string;
  description: string;
  trigger_hours: number;
  from_status: TicketStatus | null;
  escalate_to_role: UserRole | null;
  auto_reopen: boolean;
  is_active: boolean;
}

export interface ChronicLocation {
  id: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  zone_id: number | null;
  complaint_count: number;
  first_complaint: string | null;
  last_complaint: string | null;
  is_flagged: boolean;
  flagged_at: string | null;
}

export interface Contractor {
  id: string;
  company_name: string;
  company_name_marathi: string | null;
  gst_number: string | null;
  pan_number: string | null;
  zone_ids: number[];
  contract_number: string | null;
  contract_start: string | null;
  contract_end: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  defect_flags: number;
}

export interface Department {
  id: number;
  code: DepartmentCode;
  name: string;
  name_marathi: string;
  map_pin_color: string;
  is_active: boolean;
}
