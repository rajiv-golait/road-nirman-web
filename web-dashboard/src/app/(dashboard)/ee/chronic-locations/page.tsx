import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function EEChronicLocationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('chronic_locations')
    .select('address_text, zone_id, complaint_count, is_flagged, last_complaint')
    .order('complaint_count', { ascending: false })
    .limit(300);

  const rows =
    data?.map((c) => ({
      address: c.address_text,
      zone_id: c.zone_id,
      complaints: c.complaint_count,
      flagged: c.is_flagged,
      last: c.last_complaint,
    })) || [];

  return (
    <DataReportLayout
      title="Chronic locations"
      subtitle="City-wide chronic hotspots."
      columns={[
        { key: 'address', label: 'Location' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'complaints', label: 'Complaints', align: 'right' },
        { key: 'flagged', label: 'Flagged' },
        { key: 'last', label: 'Last' },
      ]}
      rows={rows}
    />
  );
}
