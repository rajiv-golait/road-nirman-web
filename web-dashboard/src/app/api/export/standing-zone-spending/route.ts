import { NextResponse } from 'next/server';
import { rowsToCsv } from '@/lib/export/csv';
import { requireExportProfile } from '../_shared';

export async function GET() {
  const auth = await requireExportProfile(['super_admin', 'standing_committee']);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .order('id');
  const { data: bills, error: billsError } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .eq('status', 'paid');
  if (zonesError) return NextResponse.json({ error: zonesError.message }, { status: 500 });
  if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });

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
