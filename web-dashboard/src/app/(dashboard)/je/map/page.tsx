import type { ChronicLocation, Ticket } from '@/lib/types/database';
import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { JEMapClient } from './JEMapClient';
import type { JEMapZone } from './jeMapZone';

export default async function JEMapPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const [{ data: zoneRow }, ticketsRes, chronicRes] = await Promise.all([
    supabase.from('zones').select('*').eq('id', profile.zone_id).single(),
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
      zone={(zoneRow as JEMapZone | null) ?? null}
    />
  );
}
