// ============================================================
// SSR Web Dashboard — Role Configuration
// Navigation manifests, route mapping, and capability config
// ============================================================

import type { UserRole } from '@/lib/types/database';

// -- Web-accessible roles (mobile-only roles redirect to /not-authorized) --
export const WEB_ROLES: UserRole[] = [
  'je', 'ae', 'de', 'ee',
  'assistant_commissioner', 'city_engineer', 'commissioner',
  'accounts', 'standing_committee', 'super_admin',
];

export const MOBILE_ONLY_ROLES: UserRole[] = [
  'citizen', 'contractor', 'mukadam',
];

// -- Role → Route mapping --
export const ROLE_ROUTES: Record<UserRole, string> = {
  je: '/je',
  ae: '/ae',
  de: '/de',
  ee: '/ee',
  assistant_commissioner: '/assistant-commissioner',
  city_engineer: '/city-engineer',
  commissioner: '/commissioner',
  accounts: '/accounts',
  standing_committee: '/standing-committee',
  super_admin: '/admin',
  // Mobile-only roles → not-authorized
  citizen: '/not-authorized',
  contractor: '/not-authorized',
  mukadam: '/not-authorized',
};

// -- Role Display Names --
export const ROLE_DISPLAY: Record<UserRole, string> = {
  citizen: 'Citizen',
  je: 'Junior Engineer',
  mukadam: 'Mukadam (Site Supervisor)',
  ae: 'Assistant Engineer',
  de: 'Deputy Engineer',
  ee: 'Executive Engineer',
  assistant_commissioner: 'Assistant Commissioner',
  city_engineer: 'City Engineer',
  commissioner: 'Commissioner',
  standing_committee: 'Standing Committee',
  contractor: 'Contractor',
  accounts: 'Accounts Officer',
  super_admin: 'Super Admin',
};

// -- Role Short Labels (for badges) --
export const ROLE_SHORT: Record<UserRole, string> = {
  citizen: 'CIT',
  je: 'JE',
  mukadam: 'MKD',
  ae: 'AE',
  de: 'DE',
  ee: 'EE',
  assistant_commissioner: 'AC',
  city_engineer: 'CE',
  commissioner: 'COMM',
  standing_committee: 'SC',
  contractor: 'CON',
  accounts: 'AO',
  super_admin: 'SA',
};

// -- Navigation Manifests --
export interface NavItem {
  label: string;
  icon: string;  // Material Symbols name
  href: string;
}

export const ROLE_NAV: Record<string, NavItem[]> = {
  je: [
    { label: 'Planning View', icon: 'assignment',  href: '/je' },
    { label: 'Zone Map',      icon: 'map',         href: '/je/map' },
    { label: 'Analytics',     icon: 'analytics',   href: '/je/analytics' },
    { label: 'History Log',   icon: 'history',     href: '/je/history' },
  ],
  ae: [
    { label: 'Overview',      icon: 'dashboard',       href: '/ae' },
    { label: 'JE Workloads',  icon: 'groups',          href: '/ae/workloads' },
    { label: 'Escalations',   icon: 'priority_high',   href: '/ae/escalations' },
    { label: 'Zone Map',      icon: 'map',             href: '/ae/map' },
    { label: 'Reports',       icon: 'bar_chart',       href: '/ae/reports' },
  ],
  de: [
    { label: 'Command Center',   icon: 'dashboard',       href: '/de' },
    { label: 'Work Orders',      icon: 'checklist',       href: '/de/work-orders' },
    { label: 'Chronic Hotspots', icon: 'warning',         href: '/de/chronic-hotspots' },
    { label: 'Technical Queue',  icon: 'engineering',     href: '/de/technical-queue' },
    { label: 'Zone Map',         icon: 'map',             href: '/de/map' },
    { label: 'Reports',          icon: 'bar_chart',       href: '/de/reports' },
  ],
  ee: [
    { label: 'Overview',           icon: 'dashboard',     href: '/ee' },
    { label: 'City map',           icon: 'map',           href: '/ee/map' },
    { label: 'All Zones',          icon: 'location_city', href: '/ee/zones' },
    { label: 'Chronic Locations',  icon: 'warning',       href: '/ee/chronic-locations' },
    { label: 'Defect Liability',   icon: 'shield',        href: '/ee/defect-liability' },
    { label: 'Contractors',        icon: 'handyman',      href: '/ee/contractors' },
    { label: 'Reports',            icon: 'bar_chart',     href: '/ee/reports' },
  ],
  'assistant-commissioner': [
    { label: 'Zone Overview',        icon: 'dashboard',       href: '/assistant-commissioner' },
    { label: 'SLA Breaches',         icon: 'warning',         href: '/assistant-commissioner/sla-breaches' },
    { label: 'Ticket Lifecycle',     icon: 'timeline',        href: '/assistant-commissioner/ticket-lifecycle' },
    { label: 'Officer Performance',  icon: 'groups',          href: '/assistant-commissioner/officer-performance' },
    { label: 'Budget Tracking',      icon: 'account_balance', href: '/assistant-commissioner/budget' },
    { label: 'Rule 6 Compliance',    icon: 'rule',            href: '/assistant-commissioner/rule-6' },
  ],
  'city-engineer': [
    { label: 'Overview',             icon: 'dashboard',   href: '/city-engineer' },
    { label: 'Rate Cards',           icon: 'receipt',     href: '/city-engineer/rate-cards' },
    { label: 'Contractors',          icon: 'handyman',    href: '/city-engineer/contractors' },
    { label: 'Recurring Failures',   icon: 'warning',     href: '/city-engineer/recurring-failures' },
    { label: 'Defect Liability',     icon: 'shield',      href: '/city-engineer/defect-liability' },
    { label: 'Reports',              icon: 'bar_chart',   href: '/city-engineer/reports' },
  ],
  commissioner: [
    { label: 'Strategic Overview', icon: 'dashboard',    href: '/commissioner' },
    { label: 'Live Zone Map',      icon: 'satellite',    href: '/commissioner/live-map' },
    { label: 'Incident Feed',      icon: 'warning',      href: '/commissioner/incident-feed' },
    { label: 'Vendor Audit',       icon: 'handyman',     href: '/commissioner/vendor-audit' },
    { label: 'Financial Nexus',    icon: 'payments',     href: '/commissioner/financial-nexus' },
  ],
  accounts: [
    { label: 'Bill Queue',      icon: 'pending_actions',        href: '/accounts' },
    { label: 'Line Items',      icon: 'list_alt',               href: '/accounts/line-items' },
    { label: 'Proof Review',    icon: 'receipt_long',            href: '/accounts/proof-review' },
    { label: 'Payment Status',  icon: 'account_balance_wallet', href: '/accounts/payment-status' },
    { label: 'Payout Summary',  icon: 'payments',               href: '/accounts/payout-summary' },
    { label: 'Reports',         icon: 'analytics',              href: '/accounts/reports' },
  ],
  'standing-committee': [
    { label: 'Expenditure',             icon: 'payments',  href: '/standing-committee' },
    { label: 'Contractor Performance',  icon: 'handyman',  href: '/standing-committee/contractor-performance' },
    { label: 'Oversight Queue',         icon: 'visibility', href: '/standing-committee/oversight-queue' },
    { label: 'Zone Spending',           icon: 'payments',  href: '/standing-committee/zone-spending' },
    { label: 'Audit Reports',           icon: 'bar_chart', href: '/standing-committee/audit-reports' },
  ],
  admin: [
    { label: 'Dashboard Switcher', icon: 'dashboard',     href: '/admin' },
    { label: 'User Management',    icon: 'manage_accounts', href: '/admin/users' },
    { label: 'System Config',      icon: 'settings',      href: '/admin/system-config' },
    { label: 'Audit Logs',         icon: 'history',       href: '/admin/audit-logs' },
    { label: 'Role Assignment',    icon: 'assignment_ind', href: '/admin/role-assignment' },
  ],
};

// -- Role Capabilities (what the UI should expose) --
export interface RoleCapability {
  canMutateTickets: boolean;
  canMutateBills: boolean;
  isZoneScoped: boolean;
  isDarkTheme: boolean;
  dashboardTitle: string;
}

export const ROLE_CAPABILITIES: Record<string, RoleCapability> = {
  je:                       { canMutateTickets: false, canMutateBills: false, isZoneScoped: true,  isDarkTheme: false, dashboardTitle: 'Planning Companion' },
  ae:                       { canMutateTickets: true,  canMutateBills: false, isZoneScoped: true,  isDarkTheme: false, dashboardTitle: 'Supervisor Dashboard' },
  de:                       { canMutateTickets: true,  canMutateBills: false, isZoneScoped: true,  isDarkTheme: false, dashboardTitle: 'Zone Technical Command' },
  ee:                       { canMutateTickets: true,  canMutateBills: true,  isZoneScoped: false, isDarkTheme: false, dashboardTitle: 'Engineering Oversight' },
  'assistant-commissioner': { canMutateTickets: true,  canMutateBills: false, isZoneScoped: true,  isDarkTheme: false, dashboardTitle: 'Zone Control Room' },
  'city-engineer':          { canMutateTickets: true,  canMutateBills: true,  isZoneScoped: false, isDarkTheme: false, dashboardTitle: 'Engineering Governance' },
  commissioner:             { canMutateTickets: false, canMutateBills: false, isZoneScoped: false, isDarkTheme: true,  dashboardTitle: 'Strategic Command Center' },
  accounts:                 { canMutateTickets: false, canMutateBills: true,  isZoneScoped: false, isDarkTheme: false, dashboardTitle: 'Contractor Bill Review' },
  'standing-committee':     { canMutateTickets: false, canMutateBills: false, isZoneScoped: false, isDarkTheme: false, dashboardTitle: 'Financial Oversight' },
  admin:                    { canMutateTickets: true,  canMutateBills: true,  isZoneScoped: false, isDarkTheme: false, dashboardTitle: 'System Administration' },
};

// JE web is planning-only — no field actions
// canMutateTickets is false for JE web because field actions (geofence, camera, measurements) are mobile-only
