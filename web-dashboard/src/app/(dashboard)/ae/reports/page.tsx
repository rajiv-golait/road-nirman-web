import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function AEReportsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, severity_tier, road_name, created_at, resolved_at')
    .order('created_at', { ascending: false })
    .limit(400);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);

  const { data: tickets } = await q;
  const rows =
    tickets?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      severity: t.severity_tier,
      road: t.road_name,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
    })) || [];

  return (
    <DataReportLayout
      title="Zone reports"
      subtitle="Recent tickets in your zone for weekly / monthly reporting."
      columns={[
        { key: 'ticket_ref', label: 'Ref' },
        { key: 'status', label: 'Status' },
        { key: 'severity', label: 'Severity' },
        { key: 'road', label: 'Road' },
        { key: 'created_at', label: 'Opened' },
        { key: 'resolved_at', label: 'Resolved' },
      ]}
      rows={rows}
    />
  );
}
