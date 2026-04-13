import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { getViewerContext } from '@/lib/dashboard/viewerContext';

export default async function CEDefectLiabilityPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data } = await supabase
    .from('tickets')
    .select('ticket_ref, road_name, warranty_expiry, assigned_contractor, resolved_at, status')
    .not('warranty_expiry', 'is', null)
    .order('warranty_expiry', { ascending: true })
    .limit(350);

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
      contractor: contractorNameMap.get(ticket.assigned_contractor || '') || 'Unassigned',
      warranty_expiry: ticket.warranty_expiry,
      resolved_at: ticket.resolved_at,
      status: ticket.status,
    })) || [];

  return (
    <DataReportLayout
      title="Defect liability monitoring"
      subtitle="Warranty windows across the city with assigned contractor visibility."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'road', label: 'Road' },
        { key: 'contractor', label: 'Assigned contractor' },
        { key: 'warranty_expiry', label: 'Warranty', format: 'date' },
        { key: 'resolved_at', label: 'Resolved', format: 'date' },
        { key: 'status', label: 'Status' },
      ]}
      rows={rows}
    />
  );
}
