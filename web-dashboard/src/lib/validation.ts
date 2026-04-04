// ============================================================
// SSR Web Dashboard — Data Validation & Safety Utilities
// Strict validation for real data ingestion from Flutter/mobile
// ============================================================

import type { Ticket, Profile, ContractorBill } from './types/database';

// ============================================================
// Type Guards
// ============================================================

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidSolapurCoordinate(lat: number, lng: number): boolean {
  // Solapur approximate bounds: lat 17.5-17.9, lng 75.7-76.1
  return lat >= 17.5 && lat <= 17.9 && lng >= 75.7 && lng <= 76.1;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value) && value >= 0;
}

export function isValidUUID(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidTicketRef(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // Format: SSR-Z{zone}-P{prabhag}-{year}-{sequence}
  return /^SSR-Z\d+-P\d+-\d{4}-\d+$/i.test(value);
}

export function isValidPhone(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // Indian mobile: 10 digits, optionally with +91 prefix
  return /^(\+91)?[6-9]\d{9}$/.test(value.replace(/\s/g, ''));
}

// ============================================================
// Safe Accessors — never throw, always return predictable types
// ============================================================

export function safeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return [];
}

export function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return fallback;
  return String(value);
}

export function safeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value) && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

export function safeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === 'true' || value === 'yes') return true;
  if (value === 0 || value === 'false' || value === 'no') return false;
  return fallback;
}

export function safeDate(value: unknown, fallback?: Date): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

// ============================================================
// Ticket Validation
// ============================================================

export interface TicketValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: Partial<Ticket>;
}

export function validateTicket(data: unknown): TicketValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<Ticket> = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid ticket data structure'], sanitized: {} };
  }

  const ticket = data as Record<string, unknown>;

  // Required fields
  if (!isNonEmptyString(ticket.id) || !isValidUUID(ticket.id)) {
    errors.push('Invalid or missing ticket ID');
  } else {
    sanitized.id = ticket.id;
  }

  if (!isNonEmptyString(ticket.ticket_ref) || !isValidTicketRef(ticket.ticket_ref)) {
    errors.push('Invalid or missing ticket reference');
  } else {
    sanitized.ticket_ref = ticket.ticket_ref;
  }

  // Coordinates (critical for Mapbox)
  const lat = ticket.latitude;
  const lng = ticket.longitude;
  if (!isValidCoordinate(lat, lng)) {
    errors.push(`Invalid coordinates: lat=${lat}, lng=${lng}`);
  } else {
    sanitized.latitude = lat as number;
    sanitized.longitude = lng as number;

    // Warn if outside Solapur (don't block, just warn)
    if (!isValidSolapurCoordinate(lat as number, lng as number)) {
      // Not an error, but noteworthy for data quality
    }
  }

  // Status
  const validStatuses = ['open', 'verified', 'assigned', 'in_progress', 'audit_pending', 'resolved', 'rejected', 'escalated', 'cross_assigned'];
  if (!validStatuses.includes(ticket.status as string)) {
    errors.push(`Invalid status: ${ticket.status}`);
  } else {
    sanitized.status = ticket.status as Ticket['status'];
  }

  // Optional fields with sanitization
  if (ticket.citizen_phone !== undefined && ticket.citizen_phone !== null) {
    if (!isValidPhone(ticket.citizen_phone)) {
      errors.push(`Invalid citizen phone: ${ticket.citizen_phone}`);
    } else {
      sanitized.citizen_phone = ticket.citizen_phone as string;
    }
  }

  sanitized.citizen_name =
    typeof ticket.citizen_name === 'string' && ticket.citizen_name.trim() ? ticket.citizen_name.trim() : null;
  sanitized.address_text =
    typeof ticket.address_text === 'string' && ticket.address_text.trim() ? ticket.address_text.trim() : null;
  sanitized.road_name =
    typeof ticket.road_name === 'string' && ticket.road_name.trim() ? ticket.road_name.trim() : null;
  sanitized.nearest_landmark =
    typeof ticket.nearest_landmark === 'string' && ticket.nearest_landmark.trim()
      ? ticket.nearest_landmark.trim()
      : null;

  // Zone/Prabhag IDs
  if (ticket.zone_id !== undefined && ticket.zone_id !== null) {
    const zoneId = safeNumber(ticket.zone_id);
    if (zoneId > 0 && zoneId <= 8) {
      sanitized.zone_id = zoneId;
    } else {
      errors.push(`Invalid zone_id: ${ticket.zone_id} (must be 1-8)`);
    }
  }

  if (ticket.prabhag_id !== undefined && ticket.prabhag_id !== null) {
    const prabhagId = safeNumber(ticket.prabhag_id);
    if (prabhagId > 0 && prabhagId <= 26) {
      sanitized.prabhag_id = prabhagId;
    } else {
      errors.push(`Invalid prabhag_id: ${ticket.prabhag_id} (must be 1-26)`);
    }
  }

  // AI/ML fields
  if (ticket.epdo_score !== undefined && ticket.epdo_score !== null) {
    const score = safeNumber(ticket.epdo_score);
    if (score >= 0 && score <= 100) {
      sanitized.epdo_score = score;
    }
  }

  if (ticket.ai_confidence !== undefined && ticket.ai_confidence !== null) {
    const confidence = safeNumber(ticket.ai_confidence);
    if (confidence >= 0 && confidence <= 1) {
      sanitized.ai_confidence = confidence;
    }
  }

  if (ticket.total_potholes !== undefined && ticket.total_potholes !== null) {
    const potholes = safeNumber(ticket.total_potholes);
    if (potholes >= 0 && potholes <= 1000) {
      sanitized.total_potholes = potholes;
    }
  }

  // Severity
  const validTiers = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  if (validTiers.includes(ticket.severity_tier as string)) {
    sanitized.severity_tier = ticket.severity_tier as Ticket['severity_tier'];
  }

  // Photos (arrays)
  sanitized.photo_before = safeArray<string>(ticket.photo_before).filter(isNonEmptyString);
  sanitized.photo_after =
    typeof ticket.photo_after === 'string' && ticket.photo_after.trim() ? ticket.photo_after.trim() : null;
  sanitized.photo_je_inspection =
    typeof ticket.photo_je_inspection === 'string' && ticket.photo_je_inspection.trim()
      ? ticket.photo_je_inspection.trim()
      : null;

  // SSIM (inverse: < 0.75 = PASS)
  if (ticket.ssim_score !== undefined && ticket.ssim_score !== null) {
    const ssim = safeNumber(ticket.ssim_score);
    if (ssim >= 0 && ssim <= 1) {
      sanitized.ssim_score = ssim;
      sanitized.ssim_pass = ssim < 0.75; // INVERSE logic
    }
  }

  sanitized.verification_hash =
    typeof ticket.verification_hash === 'string' && ticket.verification_hash.trim()
      ? ticket.verification_hash.trim()
      : null;

  // Workflow fields
  sanitized.assigned_je =
    typeof ticket.assigned_je === 'string' && ticket.assigned_je.trim() ? ticket.assigned_je.trim() : null;
  sanitized.assigned_contractor =
    typeof ticket.assigned_contractor === 'string' && ticket.assigned_contractor.trim()
      ? ticket.assigned_contractor.trim()
      : null;
  sanitized.assigned_mukadam =
    typeof ticket.assigned_mukadam === 'string' && ticket.assigned_mukadam.trim()
      ? ticket.assigned_mukadam.trim()
      : null;

  // Dimensions
  if (ticket.dimensions && typeof ticket.dimensions === 'object') {
    const dims = ticket.dimensions as Record<string, unknown>;
    const lengthM = safeNumber(dims.length_m);
    const widthM = safeNumber(dims.width_m);
    const depthM = safeNumber(dims.depth_m);
    const areaSqm = safeNumber(dims.area_sqm);

    if (lengthM >= 0 && widthM >= 0 && depthM >= 0 && areaSqm >= 0) {
      sanitized.dimensions = { length_m: lengthM, width_m: widthM, depth_m: depthM, area_sqm: areaSqm };
    }
  }

  // Dates
  const createdAt = safeDate(ticket.created_at);
  if (createdAt) {
    sanitized.created_at = createdAt.toISOString();
  } else {
    errors.push('Invalid created_at date');
  }

  const updatedAt = safeDate(ticket.updated_at) || createdAt;
  if (updatedAt) {
    sanitized.updated_at = updatedAt.toISOString();
  }

  sanitized.resolved_at = safeDate(ticket.resolved_at)?.toISOString() || null;
  sanitized.warranty_expiry = safeDate(ticket.warranty_expiry)?.toISOString() || null;
  sanitized.verified_at = safeDate(ticket.verified_at)?.toISOString() || null;

  // Flags
  sanitized.is_duplicate = safeBoolean(ticket.is_duplicate);
  sanitized.is_chronic_location = safeBoolean(ticket.is_chronic_location);
  sanitized.sla_breach = safeBoolean(ticket.sla_breach);

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

// ============================================================
// Profile Validation
// ============================================================

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: Partial<Profile>;
}

export function validateProfile(data: unknown): ProfileValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<Profile> = {};

  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid profile data'], sanitized: {} };
  }

  const profile = data as Record<string, unknown>;

  if (!isNonEmptyString(profile.id) || !isValidUUID(profile.id)) {
    errors.push('Invalid profile ID');
  } else {
    sanitized.id = profile.id;
  }

  if (!isNonEmptyString(profile.full_name)) {
    errors.push('Full name is required');
  } else {
    sanitized.full_name = profile.full_name.trim();
  }

  const validRoles = ['citizen', 'je', 'mukadam', 'ae', 'de', 'ee', 'assistant_commissioner', 'city_engineer', 'commissioner', 'standing_committee', 'contractor', 'accounts', 'super_admin'];
  if (!validRoles.includes(profile.role as string)) {
    errors.push(`Invalid role: ${profile.role}`);
  } else {
    sanitized.role = profile.role as Profile['role'];
  }

  if (profile.phone !== undefined && profile.phone !== null) {
    if (!isValidPhone(profile.phone)) {
      errors.push(`Invalid phone: ${profile.phone}`);
    } else {
      sanitized.phone = profile.phone as string;
    }
  }

  if (profile.email !== undefined && profile.email !== null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email as string)) {
      errors.push(`Invalid email: ${profile.email}`);
    } else {
      sanitized.email = profile.email as string;
    }
  }

  if (profile.zone_id !== undefined && profile.zone_id !== null) {
    const zoneId = safeNumber(profile.zone_id);
    if (zoneId >= 1 && zoneId <= 8) {
      sanitized.zone_id = zoneId;
    } else {
      errors.push(`Invalid zone_id: ${profile.zone_id}`);
    }
  }

  sanitized.department_id = safeNumber(profile.department_id, 1);
  sanitized.employee_id =
    typeof profile.employee_id === 'string' && profile.employee_id.trim() ? profile.employee_id.trim() : null;
  sanitized.designation =
    typeof profile.designation === 'string' && profile.designation.trim() ? profile.designation.trim() : null;
  sanitized.is_active = safeBoolean(profile.is_active, true);

  if (profile.opi_score !== undefined && profile.opi_score !== null) {
    const opi = safeNumber(profile.opi_score);
    if (opi >= 0 && opi <= 100) {
      sanitized.opi_score = opi;
    }
  }

  const validOPIZones = ['green', 'yellow', 'red'];
  if (validOPIZones.includes(profile.opi_zone as string)) {
    sanitized.opi_zone = profile.opi_zone as Profile['opi_zone'];
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
}

// ============================================================
// Bill Validation
// ============================================================

export interface BillValidationResult {
  isValid: boolean;
  errors: string[];
  isContractorWork: boolean; // XOR check result
  sanitized: Partial<ContractorBill>;
}

export function validateContractorBill(bill: unknown): BillValidationResult {
  const errors: string[] = [];
  const sanitized: Partial<ContractorBill> = {};

  if (!bill || typeof bill !== 'object') {
    return { isValid: false, errors: ['Invalid bill data'], isContractorWork: false, sanitized: {} };
  }

  const b = bill as Record<string, unknown>;

  if (!isNonEmptyString(b.id) || !isValidUUID(b.id)) {
    errors.push('Invalid bill ID');
  } else {
    sanitized.id = b.id;
  }

  if (!isNonEmptyString(b.bill_ref)) {
    errors.push('Invalid bill reference');
  } else {
    sanitized.bill_ref = b.bill_ref;
  }

  if (!isNonEmptyString(b.contractor_id) || !isValidUUID(b.contractor_id)) {
    errors.push('Invalid contractor ID');
  } else {
    sanitized.contractor_id = b.contractor_id;
  }

  // XOR validation: must have contractor_id to be billable work
  const isContractorWork = isNonEmptyString(b.contractor_id);

  sanitized.total_amount = Math.max(0, safeNumber(b.total_amount));
  sanitized.total_tickets = Math.max(0, safeNumber(b.total_tickets));
  sanitized.total_area_sqm = Math.max(0, safeNumber(b.total_area_sqm));

  const validStatuses = ['draft', 'submitted', 'accounts_review', 'approved', 'paid', 'rejected'];
  if (!validStatuses.includes(b.status as string)) {
    errors.push(`Invalid bill status: ${b.status}`);
  } else {
    sanitized.status = b.status as ContractorBill['status'];
  }

  sanitized.fiscal_year = isNonEmptyString(b.fiscal_year) ? (b.fiscal_year as string) : new Date().getFullYear().toString();
  if (b.zone_id === null || b.zone_id === undefined) {
    sanitized.zone_id = null;
  } else {
    const z = Number(b.zone_id);
    sanitized.zone_id = Number.isFinite(z) && z > 0 ? z : null;
  }
  sanitized.pdf_url = typeof b.pdf_url === 'string' && b.pdf_url.trim() ? b.pdf_url.trim() : null;
  sanitized.rejection_reason =
    typeof b.rejection_reason === 'string' && b.rejection_reason.trim() ? b.rejection_reason.trim() : null;
  sanitized.payment_ref =
    typeof b.payment_ref === 'string' && b.payment_ref.trim() ? b.payment_ref.trim() : null;

  sanitized.submitted_at = safeDate(b.submitted_at)?.toISOString() || null;
  sanitized.reviewed_at = safeDate(b.reviewed_at)?.toISOString() || null;
  sanitized.approved_at = safeDate(b.approved_at)?.toISOString() || null;
  sanitized.payment_date = safeDate(b.payment_date)?.toISOString() || null;
  sanitized.created_at = safeDate(b.created_at)?.toISOString() || new Date().toISOString();

  return {
    isValid: errors.length === 0,
    errors,
    isContractorWork,
    sanitized,
  };
}

// ============================================================
// Data Quality Helpers
// ============================================================

export interface DataQualityReport {
  total: number;
  valid: number;
  invalid: number;
  errors: Array<{ index: number; item: unknown; errors: string[] }>;
}

export function validateTicketBatch(tickets: unknown[]): DataQualityReport {
  const report: DataQualityReport = { total: tickets.length, valid: 0, invalid: 0, errors: [] };

  tickets.forEach((ticket, index) => {
    const result = validateTicket(ticket);
    if (result.isValid) {
      report.valid++;
    } else {
      report.invalid++;
      report.errors.push({ index, item: ticket, errors: result.errors });
    }
  });

  return report;
}

// ============================================================
// Safe Mapbox Data Preparation
// ============================================================

export interface MapboxTicketFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    ticket_ref: string;
    severity_tier: string;
    status: string;
    road_name: string | null;
    address_text: string | null;
  };
}

export function ticketToMapboxFeature(ticket: Partial<Ticket>): MapboxTicketFeature | null {
  // Strict validation for map display - never show invalid coordinates
  if (!isValidCoordinate(ticket.latitude, ticket.longitude)) {
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [ticket.longitude!, ticket.latitude!], // [lng, lat] for GeoJSON
    },
    properties: {
      id: ticket.id || 'unknown',
      ticket_ref: ticket.ticket_ref || 'UNKNOWN',
      severity_tier: ticket.severity_tier || 'LOW',
      status: ticket.status || 'open',
      road_name: ticket.road_name || null,
      address_text: ticket.address_text || null,
    },
  };
}

export function prepareTicketsForMapbox(tickets: Partial<Ticket>[]): MapboxTicketFeature[] {
  return tickets
    .map(ticketToMapboxFeature)
    .filter((f): f is MapboxTicketFeature => f !== null);
}

// ============================================================
// Empty State Detection
// ============================================================

export function isRealEmptyData(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  if (typeof data === 'object' && Object.keys(data).length === 0) return true;
  return false;
}

export function isPartialTicket(ticket: Partial<Ticket>): ticket is Pick<Ticket, 'id' | 'latitude' | 'longitude' | 'status'> {
  // Minimum fields needed to display on map
  return !!(
    ticket.id &&
    typeof ticket.latitude === 'number' &&
    typeof ticket.longitude === 'number' &&
    ticket.status
  );
}
