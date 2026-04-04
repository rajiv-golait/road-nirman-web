import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function EEMapPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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
      <h1 className="text-xl font-headline font-black text-primary">City-wide map</h1>
      <p className="text-sm text-slate-500">All zones - ticket pins and zone boundaries.</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        zones={mapZones}
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
