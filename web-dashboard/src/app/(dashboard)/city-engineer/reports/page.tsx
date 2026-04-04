import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CEReportsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name')
    .order('id');
  const { data: tickets } = await supabase
    .from('tickets')
    .select('zone_id, status');

  const rows =
    zones?.map((zone) => {
      const zoneTickets = tickets?.filter((ticket) => ticket.zone_id === zone.id) || [];
      return {
        zone: zone.name,
        total: zoneTickets.length,
        resolved: zoneTickets.filter((ticket) => ticket.status === 'resolved').length,
        active_queue: zoneTickets.filter((ticket) => !['resolved', 'rejected'].includes(ticket.status)).length,
      };
    }) || [];

  return (
    <DataReportLayout
      title="Engineering reports"
      subtitle="Zone throughput snapshot from current ticket records."
      columns={[
        { key: 'zone', label: 'Zone' },
        { key: 'total', label: 'Tickets', align: 'right' },
        { key: 'active_queue', label: 'Active queue', align: 'right' },
        { key: 'resolved', label: 'Resolved', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
