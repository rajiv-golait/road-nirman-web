import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function SCZoneSpendingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: zones } = await supabase.from('zones').select('id, name, annual_road_budget, budget_consumed').order('id');
  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .eq('status', 'paid');

  const rows =
    zones?.map((z) => {
      const paid = bills?.filter((b) => b.zone_id === z.id).reduce((s, b) => s + b.total_amount, 0) || 0;
      return {
        zone: z.name,
        annual: z.annual_road_budget,
        consumed: z.budget_consumed,
        contractor_paid: paid,
      };
    }) || [];

  return (
    <DataReportLayout
      title="Zone spending"
      subtitle="Budget consumption and paid contractor bills by zone (read-only)."
      exportHref="/api/export/standing-zone-spending"
      exportLabel="Export CSV"
      columns={[
        { key: 'zone', label: 'Zone' },
        { key: 'annual', label: 'Annual budget', align: 'right' },
        { key: 'consumed', label: 'Consumed', align: 'right' },
        { key: 'contractor_paid', label: 'Paid (bills)', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
