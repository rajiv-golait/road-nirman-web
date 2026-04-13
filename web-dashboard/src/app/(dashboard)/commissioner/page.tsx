import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { CommissionerDashboardClient } from './CommissionerDashboardClient';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import { fetchCommissionerKpis } from '@/lib/dashboard/commissionerKpis';
import type { Zone, ContractorMetrics } from '@/lib/types/database';

export default async function CommissionerDashboardPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const [
    { data: rawTickets, error: rawTicketsError },
    mapZones,
    { data: fallbackZones, error: fallbackZonesError },
    { data: metrics, error: metricsError },
    { data: recentEvents, error: recentEventsError },
    initialKpis,
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select(
        'id, status, zone_id, severity_tier, sla_breach, created_at, latitude, longitude, road_name, address_text, ticket_ref, is_chronic_location, epdo_score'
      )
      .limit(2000),
    fetchZonesForMap(supabase, { scope: 'city' }),
    supabase
      .from('zones')
      .select('id, name, annual_road_budget, budget_consumed, key_areas, centroid_lat, centroid_lng')
      .order('id'),
    supabase
      .from('contractor_metrics')
      .select('contractor_id, ssim_pass_rate, reopen_rate, quality_index')
      .order('quality_index', { ascending: false }),
    supabase
      .from('ticket_events')
      .select('id, event_type, new_status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    fetchCommissionerKpis(supabase as unknown as Parameters<typeof fetchCommissionerKpis>[0]),
  ]);

  if (rawTicketsError) throw new Error(rawTicketsError.message);
  if (fallbackZonesError) throw new Error(fallbackZonesError.message);
  if (metricsError) throw new Error(metricsError.message);
  if (recentEventsError) throw new Error(recentEventsError.message);

  const tickets = (rawTickets || []) as unknown as import('@/lib/types/database').Ticket[];
  const zones = mapZones.length > 0 ? mapZones : fallbackZones || [];

  const totalBudget = zones?.reduce((s, z) => s + (z.annual_road_budget || 0), 0) || 0;
  const totalConsumed = zones?.reduce((s, z) => s + (z.budget_consumed || 0), 0) || 0;

  return (
    <CommissionerDashboardClient
      initialTickets={tickets || []}
      zones={(zones || []) as unknown as Zone[]}
      metrics={(metrics || []) as unknown as ContractorMetrics[]}
      recentEvents={recentEvents || []}
      initialKpis={initialKpis}
      totalBudget={totalBudget}
      totalConsumed={totalConsumed}
    />
  );
}
