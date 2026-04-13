import type { UserRole } from '@/lib/types/database';
import type { GuardReason } from '@/components/shared/DashboardGuard';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

import { getCachedDashboardSession } from '@/lib/dashboard/cachedSession';

export interface ViewerProfile {
  id: string;
  role: UserRole;
  zone_id: number | null;
  full_name: string;
}

export type ViewerContext =
  | { ok: true; supabase: SupabaseClient; user: User; profile: ViewerProfile }
  | { ok: false; reason: GuardReason };

/**
 * Fetches the current viewer's auth session and profile in one call.
 * Returns a discriminated union so callers can render DashboardGuard on failure
 * instead of silently returning null.
 */
export async function getViewerContext(): Promise<ViewerContext> {
  const session = await getCachedDashboardSession();
  if (!session.user) return { ok: false, reason: 'no_session' };
  if (!session.profile) return { ok: false, reason: 'no_profile' };

  const { supabase, user, profile } = session;

  return {
    ok: true,
    supabase,
    user,
    profile: {
      id: profile.id,
      role: profile.role as UserRole,
      zone_id: profile.zone_id as number | null,
      full_name: profile.full_name ?? '',
    },
  };
}

/**
 * Convenience wrapper that also checks for zone assignment.
 * Use for zone-scoped dashboards (JE, AE, DE, AC).
 */
export async function getZoneScopedContext(): Promise<
  | { ok: true; supabase: SupabaseClient; user: User; profile: ViewerProfile & { zone_id: number } }
  | { ok: false; reason: GuardReason }
> {
  const ctx = await getViewerContext();
  if (!ctx.ok) return ctx;
  if (!ctx.profile.zone_id) return { ok: false, reason: 'no_zone' };
  return {
    ...ctx,
    profile: { ...ctx.profile, zone_id: ctx.profile.zone_id },
  };
}
