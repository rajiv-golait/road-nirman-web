import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CommissionerFinancialNexusPage() {
  const supabase = await createServerSupabaseClient();
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .order('id');
  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .in('status', ['submitted', 'accounts_review', 'approved', 'paid']);

  const rows =
    zones?.map((zone) => {
      const zoneBills = bills?.filter((bill) => bill.zone_id === zone.id) || [];
      const pending = zoneBills
        .filter((bill) => ['submitted', 'accounts_review'].includes(bill.status))
        .reduce((sum, bill) => sum + bill.total_amount, 0);
      const settled = zoneBills
        .filter((bill) => ['approved', 'paid'].includes(bill.status))
        .reduce((sum, bill) => sum + bill.total_amount, 0);
      return {
        zone: zone.name,
        annual: zone.annual_road_budget,
        consumed: zone.budget_consumed,
        bills_pending: pending,
        bills_settled: settled,
      };
    }) || [];

  return (
    <DataReportLayout
      title="Financial nexus"
      subtitle="Zone budget and contractor bill pipeline summary for executive observation."
      exportHref="/api/export/commissioner-financial-nexus"
      exportLabel="Export CSV"
      columns={[
        { key: 'zone', label: 'Zone' },
        { key: 'annual', label: 'Annual budget', align: 'right' },
        { key: 'consumed', label: 'Consumed', align: 'right' },
        { key: 'bills_pending', label: 'Bills pipeline', align: 'right' },
        { key: 'bills_settled', label: 'Bills settled', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
