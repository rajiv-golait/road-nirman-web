import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function ACRule6Page() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, citizen_confirmed, citizen_rating, citizen_confirm_at, resolved_at, road_name')
    .not('resolved_at', 'is', null)
    .order('resolved_at', { ascending: false })
    .limit(300);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      confirmed: t.citizen_confirmed,
      rating: t.citizen_rating,
      confirm_at: t.citizen_confirm_at,
      resolved_at: t.resolved_at,
      road: t.road_name,
    })) || [];

  return (
    <DataReportLayout
      title="Rule 6 compliance"
      subtitle="Citizen confirmation and satisfaction after resolution."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'confirmed', label: 'Citizen confirmed' },
        { key: 'rating', label: 'Rating', align: 'right' },
        { key: 'confirm_at', label: 'Confirmed at' },
        { key: 'resolved_at', label: 'Resolved' },
        { key: 'road', label: 'Road' },
      ]}
      rows={rows}
    />
  );
}
