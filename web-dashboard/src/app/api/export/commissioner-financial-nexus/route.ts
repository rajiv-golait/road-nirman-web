import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rowsToCsv } from '@/lib/export/csv';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const allowed = ['super_admin', 'commissioner'];
  if (!profile?.role || !allowed.includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: zones } = await supabase.from('zones').select('id, name, annual_road_budget, budget_consumed').order('id');
  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .in('status', ['submitted', 'accounts_review', 'approved', 'paid']);

  const rows =
    zones?.map((z) => {
      const subset = bills?.filter((b) => b.zone_id === z.id) || [];
      const pending = subset.filter((b) => ['submitted', 'accounts_review'].includes(b.status)).reduce((s, b) => s + b.total_amount, 0);
      const settled = subset.filter((b) => ['approved', 'paid'].includes(b.status)).reduce((s, b) => s + b.total_amount, 0);
      return {
        zone: z.name,
        annual_road_budget: z.annual_road_budget,
        budget_consumed: z.budget_consumed,
        bills_pipeline: pending,
        bills_settled: settled,
      };
    }) || [];

  const headers = ['zone', 'annual_road_budget', 'budget_consumed', 'bills_pipeline', 'bills_settled'];
  const csv = rowsToCsv(rows as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="commissioner-financial-nexus.csv"',
    },
  });
}
