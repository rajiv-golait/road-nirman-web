import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/types/database';

export async function getViewerContext() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, zone_id, full_name')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    supabase,
    user,
    profile: {
      id: profile.id,
      role: profile.role as UserRole,
      zone_id: profile.zone_id as number | null,
      full_name: profile.full_name,
    },
  };
}
