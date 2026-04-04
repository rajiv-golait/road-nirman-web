import { requireSuperAdmin } from '@/lib/admin/requireSuperAdmin';
import type { Profile } from '@/lib/types/database';
import { RoleAssignmentClient } from './RoleAssignmentClient';

export default async function RoleAssignmentPage() {
  const { supabase } = await requireSuperAdmin();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, zone_id, is_active')
    .order('full_name', { ascending: true });

  return <RoleAssignmentClient profiles={(profiles || []) as unknown as Profile[]} />;
}
