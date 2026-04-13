// ============================================================
// SSR Web Dashboard — Next.js Middleware
// Session refresh + Role-based route guard (Section 5.2)
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { refreshSupabaseSession } from '@/lib/supabase/middleware';
import { checkRoleAccessWithUser } from '@/lib/auth/role-guard';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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

  const session = await refreshSupabaseSession(request);
  if (session.kind === 'redirect') {
    return session.response;
  }

  const { response, supabase, user } = session;

  const publicRoutes = ['/', '/login', '/not-authorized'];
  if (publicRoutes.includes(path)) {
    return response;
  }

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
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    const roleCheck = await checkRoleAccessWithUser(supabase, user, path);

    if (!roleCheck.allowed && roleCheck.redirect) {
      const url = request.nextUrl.clone();
      url.pathname = roleCheck.redirect;

      if (roleCheck.reason && process.env.NODE_ENV === 'development') {
        url.searchParams.set('guard_reason', roleCheck.reason);
      }

      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
