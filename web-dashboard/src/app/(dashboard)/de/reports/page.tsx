import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function DEReportsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, sla_breach, escalation_count, road_name, created_at')
    .order('created_at', { ascending: false })
    .limit(350);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      sla_breach: t.sla_breach,
      escalations: t.escalation_count,
      road: t.road_name,
      created_at: t.created_at,
    })) || [];

  return (
    <DataReportLayout
      title="Engineering reports"
      subtitle="Zone ticket activity and SLA signals."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'sla_breach', label: 'SLA breach' },
        { key: 'escalations', label: 'Escalations', align: 'right' },
        { key: 'road', label: 'Road' },
        { key: 'created_at', label: 'Opened' },
      ]}
      rows={rows}
    />
  );
}
