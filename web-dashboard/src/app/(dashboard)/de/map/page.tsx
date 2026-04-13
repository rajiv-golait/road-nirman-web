import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';

export default async function DEMapPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_ref, status, zone_id, severity_tier, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score')
    .eq('zone_id', profile.zone_id)
    .order('updated_at', { ascending: false })
    .limit(800);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-headline font-black text-primary">Zone technical map</h1>
      <p className="text-sm text-slate-500">GIS view of tickets in your zone (pins on the basemap).</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
