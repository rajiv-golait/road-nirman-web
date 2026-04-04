import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function CommissionerLiveMapPage() {
  const supabase = await createServerSupabaseClient();
  const [{ data: tickets }, mapZones] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, zone_id, severity_tier, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score')
      .order('updated_at', { ascending: false })
      .limit(2500),
    fetchZonesForMap(supabase, { scope: 'city' }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-headline font-black text-slate-100">Live city map</h1>
      <p className="text-sm text-slate-400">City-wide ticket pins and zone boundaries - dark basemap.</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        zones={mapZones}
        darkMode
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
