import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function ACTicketLifecyclePage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, assigned_je, road_name, created_at, updated_at, resolved_at')
    .order('updated_at', { ascending: false })
    .limit(400);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      je: t.assigned_je,
      road: t.road_name,
      created_at: t.created_at,
      updated_at: t.updated_at,
      resolved_at: t.resolved_at,
    })) || [];

  return (
    <DataReportLayout
      title="Ticket lifecycle"
      subtitle="Lifecycle positions for tickets in your zone."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'je', label: 'JE' },
        { key: 'road', label: 'Road' },
        { key: 'created_at', label: 'Opened' },
        { key: 'updated_at', label: 'Updated' },
        { key: 'resolved_at', label: 'Resolved' },
      ]}
      rows={rows}
    />
  );
}
