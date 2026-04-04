import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function EEDefectLiabilityPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('tickets')
    .select('ticket_ref, road_name, warranty_expiry, resolved_at, status, assigned_contractor')
    .not('warranty_expiry', 'is', null)
    .order('warranty_expiry', { ascending: true })
    .limit(300);

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      road: t.road_name,
      warranty_expiry: t.warranty_expiry,
      resolved_at: t.resolved_at,
      status: t.status,
      contractor: t.assigned_contractor,
    })) || [];

  return (
    <DataReportLayout
      title="Defect liability period"
      subtitle="Tickets with active warranty window."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'road', label: 'Road' },
        { key: 'warranty_expiry', label: 'Warranty ends' },
        { key: 'resolved_at', label: 'Resolved' },
        { key: 'status', label: 'Status' },
        { key: 'contractor', label: 'Contractor' },
      ]}
      rows={rows}
    />
  );
}
