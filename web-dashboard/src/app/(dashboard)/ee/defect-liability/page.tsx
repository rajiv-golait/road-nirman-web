import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { getViewerContext } from '@/lib/dashboard/viewerContext';

export default async function EEDefectLiabilityPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data } = await supabase
    .from('tickets')
    .select('ticket_ref, road_name, warranty_expiry, resolved_at, status, assigned_contractor')
    .not('warranty_expiry', 'is', null)
    .order('warranty_expiry', { ascending: true })
    .limit(300);

  const contractorIds = Array.from(
    new Set((data || []).map((ticket) => ticket.assigned_contractor).filter(Boolean))
  );
  const { data: contractorProfiles } = contractorIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', contractorIds)
    : { data: [] as { id: string; full_name: string }[] };

  const contractorNameMap = new Map((contractorProfiles || []).map((profile) => [profile.id, profile.full_name]));

  const rows =
    data?.map((ticket) => ({
      ticket_ref: ticket.ticket_ref,
      road: ticket.road_name,
      warranty_expiry: ticket.warranty_expiry,
      resolved_at: ticket.resolved_at,
      status: ticket.status,
      contractor: contractorNameMap.get(ticket.assigned_contractor || '') || 'Unassigned',
    })) || [];

  return (
    <DataReportLayout
      title="Defect liability period"
      subtitle="Tickets with active warranty windows and the assigned contractor in scope."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'road', label: 'Road' },
        { key: 'warranty_expiry', label: 'Warranty ends', format: 'date' },
        { key: 'resolved_at', label: 'Resolved', format: 'date' },
        { key: 'status', label: 'Status' },
        { key: 'contractor', label: 'Assigned contractor' },
      ]}
      rows={rows}
    />
  );
}
