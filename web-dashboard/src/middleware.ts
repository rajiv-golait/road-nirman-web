// ============================================================
// SSR Web Dashboard — Next.js Middleware
// Session refresh + Role-based route guard (Section 5.2)
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRoleAccess } from '@/lib/auth/role-guard';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip static assets and public files immediately
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/images') ||
    path.startsWith('/assets') ||
    path.startsWith('/api') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$/.test(path)
  ) {
    return NextResponse.next();
  }

  // Step 1: Refresh/validate session (from supabase middleware)
  const sessionResponse = await updateSession(request);

  // If session middleware returned a redirect (unauthenticated), use that
  if (sessionResponse.status === 302 || sessionResponse.status === 307) {
    return sessionResponse;
  }

  // Step 2: Check role-based access for dashboard routes
  // Skip public routes
  const publicRoutes = ['/', '/login', '/not-authorized'];
  if (publicRoutes.includes(path)) {
    return sessionResponse;
  }

  // Only check role access for dashboard routes (under /(dashboard) paths)
  if (
    path.startsWith('/je') ||
    path.startsWith('/ae') ||
    path.startsWith('/de') ||
    path.startsWith('/ee') ||
    path.startsWith('/assistant-commissioner') ||
    path.startsWith('/city-engineer') ||
    path.startsWith('/commissioner') ||
    path.startsWith('/accounts') ||
    path.startsWith('/standing-committee') ||
    path.startsWith('/admin')
  ) {
    const roleCheck = await checkRoleAccess(request);

    if (!roleCheck.allowed && roleCheck.redirect) {
      const url = request.nextUrl.clone();
      url.pathname = roleCheck.redirect;

      // Add reason query param in development for debugging
      if (roleCheck.reason && process.env.NODE_ENV === 'development') {
        url.searchParams.set('guard_reason', roleCheck.reason);
      }

      return NextResponse.redirect(url);
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static files with extensions
     */
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
