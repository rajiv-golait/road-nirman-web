import { JEDashboardClient } from './JEDashboardClient';
import { fetchZonesForMap } from '@/lib/maps/fetchMapZones';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Prabhag, Ticket, Zone } from '@/lib/types/database';

export default async function JEDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('zone_id')
    .eq('id', user.id)
    .single();

  if (!profile?.zone_id) return null;

  const ticketFields = [
    'id',
    'ticket_ref',
    'created_at',
    'status',
    'latitude',
    'longitude',
    'road_name',
    'address_text',
    'severity_tier',
    'damage_type',
    'photo_before',
    'epdo_score',
    'estimated_cost',
    'total_potholes',
    'ai_confidence',
    'citizen_name',
  ].join(', ');

  const [ticketsRes, mapZones, zoneRes, prabhagsRes, allZoneTicketsRes] = await Promise.all([
    supabase
      .from('tickets')
      .select(ticketFields)
      .eq('zone_id', profile.zone_id)
      .not('status', 'in', '("resolved","rejected")')
      .order('created_at', { ascending: false }),
    fetchZonesForMap(supabase, { scope: 'zone', zoneId: profile.zone_id }),
    supabase
      .from('zones')
      .select('id, name, name_marathi, key_areas, annual_road_budget, budget_consumed, centroid_lat, centroid_lng')
      .eq('id', profile.zone_id)
      .single(),
    supabase
      .from('prabhags')
      .select('id, name, name_marathi, zone_id, is_split, seat_count')
      .eq('zone_id', profile.zone_id),
    supabase
      .from('tickets')
      .select('id, status, assigned_je, resolved_at')
      .eq('zone_id', profile.zone_id),
  ]);

  const allZoneTickets = allZoneTicketsRes.data || [];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <JEDashboardClient
      tickets={(ticketsRes.data || []) as unknown as Ticket[]}
      zone={(zoneRes.data || null) as Zone | null}
      mapZones={mapZones}
      prabhags={(prabhagsRes.data || []) as unknown as Prabhag[]}
      kpis={{
        openCount: allZoneTickets.filter((ticket) => ticket.status === 'open').length,
        assignedToMe: allZoneTickets.filter((ticket) => ticket.assigned_je === user.id).length,
        escalatedCount: allZoneTickets.filter((ticket) => ticket.status === 'escalated').length,
        resolvedThisWeek: allZoneTickets.filter((ticket) => {
          if (ticket.status !== 'resolved' || !ticket.resolved_at) return false;
          return new Date(ticket.resolved_at) >= weekAgo;
        }).length,
        budgetConsumed: zoneRes.data?.budget_consumed || 0,
        annualBudget: zoneRes.data?.annual_road_budget || 0,
      }}
    />
  );
}
