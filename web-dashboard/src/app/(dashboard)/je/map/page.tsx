import type { ChronicLocation, Ticket } from '@/lib/types/database';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { JEMapClient } from './JEMapClient';

export default async function JEMapPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('zone_id')
    .eq('id', user.id)
    .single();

  if (!profile?.zone_id) return null;

  const [mapZones, ticketsRes, chronicRes] = await Promise.all([
    fetchZonesForMap(supabase, { scope: 'zone', zoneId: profile.zone_id }),
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, zone_id, severity_tier, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score')
      .eq('zone_id', profile.zone_id)
      .not('status', 'in', '("resolved","rejected")')
      .not('latitude', 'is', null),
    supabase
      .from('chronic_locations')
      .select('id, latitude, longitude, address_text, zone_id, complaint_count, is_flagged')
      .eq('zone_id', profile.zone_id)
      .eq('is_flagged', true),
  ]);

  return (
    <JEMapClient
      tickets={(ticketsRes.data || []) as Ticket[]}
      chronicLocations={(chronicRes.data as ChronicLocation[]) || []}
      zone={mapZones[0] ?? null}
    />
  );
}
