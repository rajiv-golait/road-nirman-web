import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';

export default async function DEMapPage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;
  if (!profile.zone_id) return null;

  const [{ data: tickets }, mapZones] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, zone_id, severity_tier, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score')
      .eq('zone_id', profile.zone_id)
      .order('updated_at', { ascending: false })
      .limit(800),
    fetchZonesForMap(supabase, { scope: 'zone', zoneId: profile.zone_id }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-headline font-black text-primary">Zone technical map</h1>
      <p className="text-sm text-slate-500">GIS view of tickets in your zone with zone boundary overlay.</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        zones={mapZones}
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
