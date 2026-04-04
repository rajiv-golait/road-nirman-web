import { redirect } from 'next/navigation';
import type { Profile, UserRole } from '@/lib/types/database';
import { MOBILE_ONLY_ROLES, WEB_ROLES } from '@/lib/constants/roles';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DashboardShellClient } from './DashboardShellClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role, zone_id, department_id, employee_id, designation, is_active, opi_score, opi_zone, opi_last_computed, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  const roleRaw = profile.role as string;
  if (!roleRaw) redirect('/not-authorized');

  const isMobileRole = (MOBILE_ONLY_ROLES as readonly string[]).includes(roleRaw);
  const isWebRole = (WEB_ROLES as readonly string[]).includes(roleRaw);
  if (isMobileRole || !isWebRole) redirect('/not-authorized');

  const role = roleRaw as UserRole;
  const profileForShell: Profile = {
    ...profile,
    role,
    full_name: profile.full_name || 'Officer',
    is_active: !!profile.is_active,
    department_id: profile.department_id || 1,
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: profile.updated_at || new Date().toISOString(),
  } as Profile;

  let zone = null;
  if (profile.zone_id) {
    const { data: zoneData } = await supabase
      .from('zones')
      .select('id, name, name_marathi, key_areas, annual_road_budget, budget_consumed, centroid_lat, centroid_lng')
      .eq('id', profile.zone_id)
      .single();
    zone = zoneData;
  }

  return (
    <DashboardShellClient profile={profileForShell} zone={zone}>
      {children}
    </DashboardShellClient>
  );
}
