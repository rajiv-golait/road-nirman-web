import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function DEWorkOrdersPage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, road_name, assigned_contractor, assigned_mukadam, job_order_ref, updated_at')
    .in('status', ['assigned', 'in_progress'])
    .order('updated_at', { ascending: false })
    .limit(300);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      road: t.road_name,
      contractor: t.assigned_contractor,
      mukadam: t.assigned_mukadam,
      job_order: t.job_order_ref,
      updated_at: t.updated_at,
    })) || [];

  return (
    <DataReportLayout
      title="Work orders"
      subtitle="Read-only view of active repair assignments in your zone. Contractor and mukadam assignment is performed by JE (field / mobile workflow); DE does not assign executors."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'road', label: 'Road' },
        { key: 'contractor', label: 'Contractor ID' },
        { key: 'mukadam', label: 'Mukadam ID' },
        { key: 'job_order', label: 'JO ref' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      rows={rows}
    />
  );
}
