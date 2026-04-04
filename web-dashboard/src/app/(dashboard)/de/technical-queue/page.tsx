import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function DETechnicalQueuePage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, damage_type, epdo_score, severity_tier, road_name, updated_at')
    .in('status', ['open', 'verified'])
    .order('epdo_score', { ascending: false })
    .limit(200);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      damage: t.damage_type,
      epdo: t.epdo_score,
      severity: t.severity_tier,
      road: t.road_name,
      updated_at: t.updated_at,
    })) || [];

  return (
    <DataReportLayout
      title="Technical queue"
      subtitle="Open / verified tickets sorted by EPDO for DE review."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'damage', label: 'Damage' },
        { key: 'epdo', label: 'EPDO', align: 'right' },
        { key: 'severity', label: 'Tier' },
        { key: 'road', label: 'Road' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      rows={rows}
    />
  );
}
