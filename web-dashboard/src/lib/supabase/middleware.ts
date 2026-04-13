// ============================================================
// SSR Web Dashboard — Supabase Middleware Client
// Refreshes auth session on every request
// ============================================================

import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

export type SessionRefreshResult =
  | {
      kind: 'continue';
      response: NextResponse;
      supabase: SupabaseClient;
      user: User | null;
    }
  | {
      kind: 'redirect';
      response: NextResponse;
    };

/**
 * Single Supabase client + getUser per request (refreshes session cookies on `response`).
 * Use with {@link checkRoleAccessWithUser} so middleware does not call getUser twice.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<SessionRefreshResult> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith('/login');
  const isPublicRoute = path === '/' || path === '/not-authorized';

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return { kind: 'redirect', response: NextResponse.redirect(url) };
  }

  return {
    kind: 'continue',
    response: supabaseResponse,
    supabase,
    user,
  };
}

/** @deprecated Prefer refreshSupabaseSession + shared role check (avoids duplicate getUser). */
export async function updateSession(request: NextRequest) {
  const result = await refreshSupabaseSession(request);
  if (result.kind === 'redirect') return result.response;
  return result.response;
}
