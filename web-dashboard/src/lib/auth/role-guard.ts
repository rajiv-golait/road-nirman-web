// ============================================================
// SSR Web Dashboard — Role-Based Route Guard
// Section 5.2 implementation: enforce dashboard access by role
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { UserRole } from '@/lib/types/database';
import { ROLE_ROUTES, WEB_ROLES, MOBILE_ONLY_ROLES } from '@/lib/constants/roles';

// ============================================================
// Route Configuration
// ============================================================

// Route prefixes that each role can access
const ROLE_ROUTE_PREFIXES: Record<UserRole, string[]> = {
  je: ['/je'],
  ae: ['/ae'],
  de: ['/de'],
  ee: ['/ee'],
  assistant_commissioner: ['/assistant-commissioner'],
  city_engineer: ['/city-engineer'],
  commissioner: ['/commissioner'],
  accounts: ['/accounts'],
  standing_committee: ['/standing-committee'],
  super_admin: [
    '/je', '/ae', '/de', '/ee',
    '/assistant-commissioner', '/city-engineer', '/commissioner',
    '/accounts', '/standing-committee', '/admin'
  ],
  // Mobile-only roles cannot access web dashboards
  citizen: [],
  contractor: [],
  mukadam: [],
};

// Public routes that don't require role checks
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/not-authorized',
  '/api/auth',
];

// Static asset paths to ignore
const STATIC_PATHS = [
  '/_next',
  '/favicon',
  '/images',
  '/assets',
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check if a path is a static asset that should be ignored
 */
function isStaticPath(path: string): boolean {
  return STATIC_PATHS.some(prefix => path.startsWith(prefix));
}

/**
 * Check if a path is a public route that doesn't require auth
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + '/'));
}

/**
 * Check if a role can access a given path
 */
function canAccessRoute(role: UserRole, path: string): boolean {
  // Super admin can access all dashboard routes
  if (role === 'super_admin') {
    return true;
  }

  // Get allowed prefixes for this role
  const allowedPrefixes = ROLE_ROUTE_PREFIXES[role] || [];

  // Check if the path starts with any allowed prefix
  return allowedPrefixes.some(prefix => path.startsWith(prefix));
}

/**
 * Get the default dashboard route for a role
 */
function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_ROUTES[role] || '/not-authorized';
}

/**
 * Check if a role is mobile-only
 */
function isMobileOnlyRole(role: UserRole): boolean {
  return MOBILE_ONLY_ROLES.includes(role);
}

/**
 * Check if a role is web-accessible
 */
function isWebRole(role: UserRole): boolean {
  return WEB_ROLES.includes(role);
}

// ============================================================
// Main Role Guard Function
// ============================================================

export interface RoleGuardResult {
  allowed: boolean;
  redirect?: string;
  reason?: 'no_session' | 'mobile_only' | 'unauthorized' | 'invalid_role';
}

export async function checkRoleAccess(
  request: NextRequest
): Promise<RoleGuardResult> {
  const path = request.nextUrl.pathname;

  // Skip static paths
  if (isStaticPath(path)) {
    return { allowed: true };
  }

  // Allow public routes
  if (isPublicRoute(path)) {
    return { allowed: true };
  }

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op in middleware context
        },
      },
    }
  );

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      allowed: false,
      redirect: '/login',
      reason: 'no_session',
    };
  }

  // Fetch user profile to get role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[RoleGuard] Failed to fetch profile:', profileError);
    return {
      allowed: false,
      redirect: '/login',
      reason: 'invalid_role',
    };
  }

  // Check if account is active
  if (!profile.is_active) {
    return {
      allowed: false,
      redirect: '/not-authorized',
      reason: 'unauthorized',
    };
  }

  const role = profile.role as UserRole;

  // Check if mobile-only role
  if (isMobileOnlyRole(role)) {
    return {
      allowed: false,
      redirect: '/not-authorized',
      reason: 'mobile_only',
    };
  }

  // Check if valid web role
  if (!isWebRole(role)) {
    return {
      allowed: false,
      redirect: '/not-authorized',
      reason: 'invalid_role',
    };
  }

  // Check route access
  if (!canAccessRoute(role, path)) {
    // User is trying to access a route they shouldn't
    // Redirect them to their default dashboard
    const defaultRoute = getDefaultRouteForRole(role);

    // Avoid redirect loops - if they're already at their default route, allow it
    if (path === defaultRoute || path.startsWith(defaultRoute + '/')) {
      return { allowed: true };
    }

    return {
      allowed: false,
      redirect: defaultRoute,
      reason: 'unauthorized',
    };
  }

  return { allowed: true };
}

// ============================================================
// Middleware Integration
// ============================================================

export async function roleGuardMiddleware(request: NextRequest) {
  const result = await checkRoleAccess(request);

  if (!result.allowed && result.redirect) {
    const url = request.nextUrl.clone();
    url.pathname = result.redirect;

    // Add reason as query param for debugging (optional)
    if (result.reason && process.env.NODE_ENV === 'development') {
      url.searchParams.set('reason', result.reason);
    }

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ============================================================
// Server Component Helpers
// ============================================================

export interface AuthContext {
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  zoneId: number | null;
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // No-op in middleware context
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, zone_id')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    role: profile.role as UserRole,
    isSuperAdmin: profile.role === 'super_admin',
    zoneId: profile.zone_id,
  };
}

// ============================================================
// Permission Helpers
// ============================================================

export function hasPermission(
  role: UserRole,
  permission: 'mutate_tickets' | 'mutate_bills' | 'view_all_zones'
): boolean {
  const caps = {
    je: { mutate_tickets: false, mutate_bills: false, view_all_zones: false },
    ae: { mutate_tickets: true, mutate_bills: false, view_all_zones: false },
    de: { mutate_tickets: true, mutate_bills: false, view_all_zones: false },
    ee: { mutate_tickets: true, mutate_bills: true, view_all_zones: true },
    assistant_commissioner: { mutate_tickets: true, mutate_bills: false, view_all_zones: false },
    city_engineer: { mutate_tickets: true, mutate_bills: true, view_all_zones: true },
    commissioner: { mutate_tickets: false, mutate_bills: false, view_all_zones: true },
    accounts: { mutate_tickets: false, mutate_bills: true, view_all_zones: true },
    standing_committee: { mutate_tickets: false, mutate_bills: false, view_all_zones: true },
    super_admin: { mutate_tickets: true, mutate_bills: true, view_all_zones: true },
    citizen: { mutate_tickets: false, mutate_bills: false, view_all_zones: false },
    contractor: { mutate_tickets: false, mutate_bills: false, view_all_zones: false },
    mukadam: { mutate_tickets: false, mutate_bills: false, view_all_zones: false },
  };

  return caps[role]?.[permission] ?? false;
}
