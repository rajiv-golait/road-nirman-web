import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { getViewerContext } from '@/lib/dashboard/viewerContext';

export default async function SCAuditReportsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data } = await supabase
    .from('contractor_bills')
    .select('bill_ref, zone_id, fiscal_year, total_amount, status, reviewed_at, approved_at')
    .order('reviewed_at', { ascending: false })
    .limit(400);

  const rows =
    data?.map((bill) => ({
      bill_ref: bill.bill_ref,
      zone_id: bill.zone_id,
      fy: bill.fiscal_year,
      amount: bill.total_amount,
      status: bill.status,
      reviewed_at: bill.reviewed_at,
      approved_at: bill.approved_at,
    })) || [];

  return (
    <DataReportLayout
      title="Audit reports"
      subtitle="Bill register for committee review - no actions."
      columns={[
        { key: 'bill_ref', label: 'Bill' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'fy', label: 'FY' },
        { key: 'amount', label: 'Amount', align: 'right', format: 'currency' },
        { key: 'status', label: 'Status' },
        { key: 'reviewed_at', label: 'Reviewed', format: 'datetime' },
        { key: 'approved_at', label: 'Approved', format: 'datetime' },
      ]}
      rows={rows}
    />
  );
}
