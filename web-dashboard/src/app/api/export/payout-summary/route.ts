import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function toCsv(rows: Record<string, unknown>[], headers: string[]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h])).join(','));
  }
  return lines.join('\n');
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowed = ['super_admin', 'commissioner', 'accounts', 'standing_committee'];
  if (!profile?.role || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: bills, error } = await supabase
    .from('contractor_bills')
    .select('bill_ref, contractor_id, zone_id, fiscal_year, total_amount, status, payment_ref, payment_date, submitted_at')
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    'bill_ref',
    'contractor_id',
    'zone_id',
    'fiscal_year',
    'total_amount',
    'status',
    'payment_ref',
    'payment_date',
    'submitted_at',
  ];

  const csv = toCsv((bills || []) as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="payout-summary.csv"',
    },
  });
}
