import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function AccountsPaymentStatusPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('bill_ref, contractor_id, zone_id, total_amount, status, payment_ref, payment_date, approved_at')
    .in('status', ['approved', 'paid'])
    .order('approved_at', { ascending: false })
    .limit(300);

  const rows =
    bills?.map((b) => ({
      bill_ref: b.bill_ref,
      contractor_id: b.contractor_id,
      zone_id: b.zone_id,
      total_amount: b.total_amount,
      status: b.status,
      payment_ref: b.payment_ref,
      payment_date: b.payment_date,
      approved_at: b.approved_at,
    })) || [];

  return (
    <DataReportLayout
      title="Payment status"
      subtitle="Approved and paid bills — disbursement references."
      columns={[
        { key: 'bill_ref', label: 'Bill' },
        { key: 'contractor_id', label: 'Contractor' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'total_amount', label: 'Amount', align: 'right' },
        { key: 'status', label: 'Status' },
        { key: 'payment_ref', label: 'Payment ref' },
        { key: 'payment_date', label: 'Paid on' },
        { key: 'approved_at', label: 'Approved' },
      ]}
      rows={rows}
    />
  );
}
