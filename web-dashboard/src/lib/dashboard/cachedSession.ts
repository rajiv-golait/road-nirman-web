import { cache } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/** Full profile row used by dashboard layout (keep in sync with layout select). */
export type CachedDashboardProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  zone_id: number | null;
  department_id: number | null;
  employee_id: string | null;
  designation: string | null;
  is_active: boolean | null;
  opi_score: number | null;
  opi_zone: string | null;
  opi_last_computed: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CachedSessionResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>; user: User; profile: CachedDashboardProfile }
  | {
      ok: false;
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
      user: User | null;
      profile: null;
    };

/**
 * One Supabase auth + profile round-trip per HTTP request (layout + getViewerContext + pages).
 * Without this, Next.js runs layout and each page as separate trees and repeats identical queries.
 */
export const getCachedDashboardSession = cache(async (): Promise<CachedSessionResult> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, supabase, user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'id, full_name, phone, email, role, zone_id, department_id, employee_id, designation, is_active, opi_score, opi_zone, opi_last_computed, created_at, updated_at'
    )
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return { ok: false, supabase, user, profile: null };
  }

  return {
    ok: true,
    supabase,
    user,
    profile: profile as CachedDashboardProfile,
  };
});
