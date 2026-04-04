import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function SCAuditReportsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('contractor_bills')
    .select('bill_ref, zone_id, fiscal_year, total_amount, status, reviewed_at, approved_at')
    .order('reviewed_at', { ascending: false })
    .limit(400);

  const rows =
    data?.map((b) => ({
      bill_ref: b.bill_ref,
      zone_id: b.zone_id,
      fy: b.fiscal_year,
      amount: b.total_amount,
      status: b.status,
      reviewed_at: b.reviewed_at,
      approved_at: b.approved_at,
    })) || [];

  return (
    <DataReportLayout
      title="Audit reports"
      subtitle="Bill register for committee review — no actions."
      columns={[
        { key: 'bill_ref', label: 'Bill' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'fy', label: 'FY' },
        { key: 'amount', label: 'Amount', align: 'right' },
        { key: 'status', label: 'Status' },
        { key: 'reviewed_at', label: 'Reviewed' },
        { key: 'approved_at', label: 'Approved' },
      ]}
      rows={rows}
    />
  );
}
