import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function EEZonesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .order('id');
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, zone_id, status, sla_breach');

  const rows =
    zones?.map((zone) => {
      const zoneTickets = tickets?.filter((ticket) => ticket.zone_id === zone.id) || [];
      return {
        zone: zone.name,
        open: zoneTickets.filter((ticket) => !['resolved', 'rejected'].includes(ticket.status)).length,
        breach: zoneTickets.filter((ticket) => ticket.sla_breach).length,
        budget: zone.annual_road_budget,
        consumed: zone.budget_consumed,
      };
    }) || [];

  return (
    <DataReportLayout
      title="All zones"
      subtitle="City-wide zone comparison using current ticket and budget records."
      columns={[
        { key: 'zone', label: 'Zone' },
        { key: 'open', label: 'Open pipeline', align: 'right' },
        { key: 'breach', label: 'SLA breaches', align: 'right' },
        { key: 'budget', label: 'Annual budget', align: 'right' },
        { key: 'consumed', label: 'Consumed', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
