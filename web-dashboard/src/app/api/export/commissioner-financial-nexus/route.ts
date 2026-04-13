import { NextResponse } from 'next/server';
import { rowsToCsv } from '@/lib/export/csv';
import { requireExportProfile } from '../_shared';

export async function GET() {
  const auth = await requireExportProfile(['super_admin', 'commissioner']);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .order('id');
  const { data: bills, error: billsError } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .in('status', ['submitted', 'accounts_review', 'approved', 'paid']);
  if (zonesError) return NextResponse.json({ error: zonesError.message }, { status: 500 });
  if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });

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
