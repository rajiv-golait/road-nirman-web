import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CEDefectLiabilityPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('tickets')
    .select('ticket_ref, road_name, warranty_expiry, assigned_contractor, resolved_at, status')
    .not('warranty_expiry', 'is', null)
    .order('warranty_expiry', { ascending: true })
    .limit(350);

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      road: t.road_name,
      contractor: t.assigned_contractor,
      warranty_expiry: t.warranty_expiry,
      resolved_at: t.resolved_at,
      status: t.status,
    })) || [];

  return (
    <DataReportLayout
      title="Defect liability monitoring"
      subtitle="Warranty windows across the city."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'road', label: 'Road' },
        { key: 'contractor', label: 'Contractor' },
        { key: 'warranty_expiry', label: 'Warranty' },
        { key: 'resolved_at', label: 'Resolved' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
    />
  );
}
