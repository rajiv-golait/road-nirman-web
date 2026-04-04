import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function SCOversightQueuePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('tickets')
    .select('ticket_ref, status, severity_tier, zone_id, road_name, total_potholes, updated_at')
    .in('status', ['escalated', 'audit_pending', 'resolved'])
    .order('updated_at', { ascending: false })
    .limit(350);

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      severity: t.severity_tier,
      zone_id: t.zone_id,
      road: t.road_name,
      potholes: t.total_potholes,
      updated_at: t.updated_at,
    })) || [];

  return (
    <DataReportLayout
      title="Oversight queue"
      subtitle="Read-only visibility into escalated and audit-stage work."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'severity', label: 'Severity' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'road', label: 'Road' },
        { key: 'potholes', label: 'Potholes', align: 'right' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      rows={rows}
    />
  );
}
