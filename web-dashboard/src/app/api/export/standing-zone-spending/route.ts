import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rowsToCsv } from '@/lib/export/csv';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const allowed = ['super_admin', 'standing_committee'];
  if (!profile?.role || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: zones } = await supabase.from('zones').select('id, name, annual_road_budget, budget_consumed').order('id');
  const { data: bills } = await supabase.from('contractor_bills').select('zone_id, status, total_amount').eq('status', 'paid');

  const rows =
    zones?.map((z) => {
      const paid = bills?.filter((b) => b.zone_id === z.id).reduce((s, b) => s + b.total_amount, 0) || 0;
      return {
        zone: z.name,
        annual_road_budget: z.annual_road_budget,
        budget_consumed: z.budget_consumed,
        contractor_paid: paid,
      };
    }) || [];

  const headers = ['zone', 'annual_road_budget', 'budget_consumed', 'contractor_paid'];
  const csv = rowsToCsv(rows as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="standing-committee-zone-spending.csv"',
    },
  });
}
