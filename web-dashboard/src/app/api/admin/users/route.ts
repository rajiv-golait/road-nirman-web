import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/database';

const ASSIGNABLE_ROLES: UserRole[] = [
  'citizen',
  'je',
  'mukadam',
  'ae',
  'de',
  'ee',
  'assistant_commissioner',
  'city_engineer',
  'commissioner',
  'standing_committee',
  'contractor',
  'accounts',
  'super_admin',
];

function siteOrigin(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return 'http://localhost:3000';
  }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin' || profile.is_active === false) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_SERVICE_ROLE_KEY is not set on the server. Add it to .env.local to enable inviting users.',
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone =
    typeof body.phone === 'string' && body.phone.trim() !== '' ? body.phone.trim() : null;
  const role = body.role as UserRole;
  const zoneRaw = body.zone_id;
  const zone_id =
    zoneRaw === null || zoneRaw === undefined || zoneRaw === ''
      ? null
      : Number(zoneRaw);
  const employee_id =
    typeof body.employee_id === 'string' && body.employee_id.trim() !== ''
      ? body.employee_id.trim()
      : null;
  const designation =
    typeof body.designation === 'string' && body.designation.trim() !== ''
      ? body.designation.trim()
      : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }
  if (!full_name) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }
  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid or unsupported role' }, { status: 400 });
  }
  if (zone_id != null && (Number.isNaN(zone_id) || zone_id < 1 || zone_id > 8)) {
    return NextResponse.json({ error: 'Zone must be between 1 and 8, or left empty' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const origin = siteOrigin(request);

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: `${origin}/login`,
  });

  if (inviteErr || !invited?.user?.id) {
    return NextResponse.json(
      { error: inviteErr?.message ?? 'Could not create auth user' },
      { status: 400 }
    );
  }

  const newUserId = invited.user.id;

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      full_name,
      phone,
      email,
      role,
      zone_id,
      employee_id,
      designation,
      is_active: true,
    })
    .eq('id', newUserId);

  if (updErr) {
    return NextResponse.json(
      {
        error: updErr.message,
        detail:
          'Auth user was created but profile could not be updated. Fix the issue and assign the role from Role assignment.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    userId: newUserId,
    message: 'Invitation sent. The user will appear after they accept the email invite.',
  });
}
