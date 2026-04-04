import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CommissionerDashboardClient } from './CommissionerDashboardClient';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import type { Zone, ContractorMetrics } from '@/lib/types/database';

export default async function CommissionerDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rawTickets } = await supabase
    .from('tickets')
    .select(
      'id, status, zone_id, severity_tier, sla_breach, created_at, latitude, longitude, road_name, address_text, ticket_ref, is_chronic_location, epdo_score'
    )
    .limit(2000);

  const tickets = (rawTickets || []) as unknown as import('@/lib/types/database').Ticket[];

  const mapZones = await fetchZonesForMap(supabase, { scope: 'city' });
  const zones =
    mapZones.length > 0
      ? mapZones
      : (await supabase
          .from('zones')
          .select('id, name, annual_road_budget, budget_consumed, key_areas, centroid_lat, centroid_lng')
          .order('id')).data || [];
  const { data: metrics } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, ssim_pass_rate, reopen_rate, quality_index')
    .order('quality_index', { ascending: false });
  const { data: recentEvents } = await supabase
    .from('ticket_events')
    .select('id, event_type, new_status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const totalBudget = zones?.reduce((s, z) => s + (z.annual_road_budget || 0), 0) || 0;
  const totalConsumed = zones?.reduce((s, z) => s + (z.budget_consumed || 0), 0) || 0;

  return (
    <CommissionerDashboardClient
      initialTickets={tickets || []}
      zones={(zones || []) as unknown as Zone[]}
      metrics={(metrics || []) as unknown as ContractorMetrics[]}
      recentEvents={recentEvents || []}
      totalBudget={totalBudget}
      totalConsumed={totalConsumed}
    />
  );
}
