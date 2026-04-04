import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ROLE_ROUTES } from '@/lib/constants/roles';
import type { UserRole } from '@/lib/types/database';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user profile to get role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role) {
    redirect(ROLE_ROUTES[profile.role as UserRole]);
  }

  redirect('/login');
}
