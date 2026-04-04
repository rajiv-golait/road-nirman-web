import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function ACSLABreachesPage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, sla_breach, escalation_count, road_name, created_at')
    .eq('sla_breach', true)
    .order('created_at', { ascending: false })
    .limit(300);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      escalations: t.escalation_count,
      road: t.road_name,
      created_at: t.created_at,
    })) || [];

  return (
    <DataReportLayout
      title="SLA breaches"
      subtitle="Tickets flagged with SLA breach in your zone."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'escalations', label: 'Escalations', align: 'right' },
        { key: 'road', label: 'Road' },
        { key: 'created_at', label: 'Opened' },
      ]}
      rows={rows}
    />
  );
}
