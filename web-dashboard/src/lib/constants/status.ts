// ============================================================
// SSR Web Dashboard — Status Display Constants
// Single source of truth for all status labels, colors, and icons
// ============================================================

import type { TicketStatus, BillStatus, SeverityTier } from '@/lib/types/database';

// -- Ticket Status Display Labels --
// Maps DB enum values to user-facing labels
export const STATUS_DISPLAY: Record<TicketStatus, string> = {
  open:           'Received',
  verified:       'Verified',
  assigned:       'Repair Assigned',
  in_progress:    'Fixing',
  audit_pending:  'Quality Check',
  resolved:       'Resolved',
  rejected:       'Rejected',
  escalated:      'Escalated',
  cross_assigned: 'Cross-Assigned',
};

// -- Ticket Status Colors (Tailwind classes) --
export const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string }> = {
  open:           { bg: 'bg-slate-100',   text: 'text-slate-600' },
  verified:       { bg: 'bg-blue-100',    text: 'text-blue-700' },
  assigned:       { bg: 'bg-indigo-100',  text: 'text-indigo-700' },
  in_progress:    { bg: 'bg-amber-100',   text: 'text-amber-800' },
  audit_pending:  { bg: 'bg-yellow-100',  text: 'text-yellow-800' },
  resolved:       { bg: 'bg-green-100',   text: 'text-green-700' },
  rejected:       { bg: 'bg-red-100',     text: 'text-red-700' },
  escalated:      { bg: 'bg-red-200',     text: 'text-red-900' },
  cross_assigned: { bg: 'bg-purple-100',  text: 'text-purple-700' },
};

// -- Bill Status Display Labels --
export const BILL_STATUS_DISPLAY: Record<BillStatus, string> = {
  draft:           'Draft',
  submitted:       'Submitted',
  accounts_review: 'Accounts Review',
  approved:        'Approved',
  paid:            'Paid',
  rejected:        'Rejected',
};

export const BILL_STATUS_COLORS: Record<BillStatus, { bg: string; text: string }> = {
  draft:           { bg: 'bg-slate-100',   text: 'text-slate-500' },
  submitted:       { bg: 'bg-slate-100',   text: 'text-slate-600' },
  accounts_review: { bg: 'bg-orange-100',  text: 'text-orange-700' },
  approved:        { bg: 'bg-blue-100',    text: 'text-blue-700' },
  paid:            { bg: 'bg-green-100',   text: 'text-green-700' },
  rejected:        { bg: 'bg-red-100',     text: 'text-red-700' },
};

// -- Severity Colors --
export const SEVERITY_COLORS: Record<SeverityTier, { bg: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-100',    text: 'text-red-800' },
  HIGH:     { bg: 'bg-orange-100', text: 'text-orange-800' },
  MEDIUM:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  LOW:      { bg: 'bg-green-100',  text: 'text-green-700' },
};

export const SEVERITY_DISPLAY: Record<SeverityTier, string> = {
  CRITICAL: 'Critical Severity',
  HIGH:     'High Severity',
  MEDIUM:   'Medium Severity',
  LOW:      'Low Severity',
};

// -- Status Icons (Material Symbols names) --
export const STATUS_ICONS: Record<TicketStatus, string> = {
  open:           'inbox',
  verified:       'verified',
  assigned:       'assignment_ind',
  in_progress:    'construction',
  audit_pending:  'fact_check',
  resolved:       'check_circle',
  rejected:       'cancel',
  escalated:      'priority_high',
  cross_assigned: 'swap_horiz',
};
