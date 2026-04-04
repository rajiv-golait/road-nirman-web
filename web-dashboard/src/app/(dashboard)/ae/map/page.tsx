import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AEMapClientWrapper } from './AEMapClientWrapper';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';

export default async function AEMapPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('zone_id').eq('id', user.id).single();
  if (!profile?.zone_id) return null;

  const [{ data: tickets }, mapZones, { data: jes }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, severity_tier, zone_id, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score, sla_breach, assigned_je')
      .eq('zone_id', profile.zone_id)
      .not('latitude', 'is', null),
    fetchZonesForMap(supabase, { scope: 'zone', zoneId: profile.zone_id }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('zone_id', profile.zone_id)
      .eq('role', 'je'),
  ]);

  return (
    <AEMapClientWrapper
      tickets={(tickets || []) as unknown as import('@/lib/types/database').Ticket[]}
      mapZones={mapZones}
      jes={jes || []}
    />
  );
}
