import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rowsToCsv } from '@/lib/export/csv';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const allowed = ['super_admin', 'accounts'];
  if (!profile?.role || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: bills, error } = await supabase
    .from('contractor_bills')
    .select('bill_ref, fiscal_year, zone_id, status, total_amount, submitted_at, reviewed_at')
    .order('submitted_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = ['bill_ref', 'fiscal_year', 'zone_id', 'status', 'total_amount', 'submitted_at', 'reviewed_at'];
  const csv = rowsToCsv((bills || []) as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="accounts-bills-register.csv"',
    },
  });
}
