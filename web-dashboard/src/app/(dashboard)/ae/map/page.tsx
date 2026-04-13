import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { AEMapClientWrapper } from './AEMapClientWrapper';
import type { MapZone } from '@/lib/maps/fetchMapZones';

export default async function AEMapPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const [{ data: tickets }, { data: zoneRow }, { data: jes }] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, severity_tier, zone_id, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score, sla_breach, assigned_je')
      .eq('zone_id', profile.zone_id)
      .not('latitude', 'is', null),
    supabase.from('zones').select('*').eq('id', profile.zone_id).single(),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('zone_id', profile.zone_id)
      .eq('role', 'je'),
  ]);

  const mapZones: MapZone[] = zoneRow ? [zoneRow as MapZone] : [];

  return (
    <AEMapClientWrapper
      tickets={(tickets || []) as unknown as import('@/lib/types/database').Ticket[]}
      mapZones={mapZones}
      jes={jes || []}
    />
  );
}
