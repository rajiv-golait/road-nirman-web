import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function AccountsReportsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('bill_ref, fiscal_year, zone_id, status, total_amount, submitted_at, reviewed_at')
    .order('submitted_at', { ascending: false })
    .limit(400);

  const rows =
    bills?.map((b) => ({
      bill_ref: b.bill_ref,
      fiscal_year: b.fiscal_year,
      zone_id: b.zone_id,
      status: b.status,
      total_amount: b.total_amount,
      submitted_at: b.submitted_at,
      reviewed_at: b.reviewed_at,
    })) || [];

  return (
    <DataReportLayout
      title="Accounts reports"
      subtitle="Bill register for analysis; export CSV or use Payout summary for payment-focused export."
      exportHref="/api/export/accounts-bills-register"
      exportLabel="Export CSV"
      columns={[
        { key: 'bill_ref', label: 'Bill' },
        { key: 'fiscal_year', label: 'FY' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'status', label: 'Status' },
        { key: 'total_amount', label: 'Amount', align: 'right', format: 'currency' },
        { key: 'submitted_at', label: 'Submitted', format: 'datetime' },
        { key: 'reviewed_at', label: 'Reviewed', format: 'datetime' },
      ]}
      rows={rows}
    />
  );
}
