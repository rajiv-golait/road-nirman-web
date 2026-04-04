import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function DEChronicHotspotsPage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('chronic_locations')
    .select('id, address_text, latitude, longitude, complaint_count, is_flagged, last_complaint')
    .eq('is_flagged', true)
    .order('complaint_count', { ascending: false })
    .limit(200);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((c) => ({
      address: c.address_text,
      lat: c.latitude,
      lng: c.longitude,
      complaints: c.complaint_count,
      flagged: c.is_flagged,
      last: c.last_complaint,
    })) || [];

  return (
    <DataReportLayout
      title="Chronic hotspots"
      subtitle="Flagged chronic locations in your zone."
      columns={[
        { key: 'address', label: 'Location' },
        { key: 'lat', label: 'Lat', align: 'right' },
        { key: 'lng', label: 'Lng', align: 'right' },
        { key: 'complaints', label: 'Count', align: 'right' },
        { key: 'flagged', label: 'Flagged' },
        { key: 'last', label: 'Last complaint' },
      ]}
      rows={rows}
    />
  );
}
