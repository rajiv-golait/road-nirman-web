import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { getViewerContext } from '@/lib/dashboard/viewerContext';

export default async function CommissionerLiveMapPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_ref, status, zone_id, severity_tier, latitude, longitude, road_name, address_text, created_at, damage_type, epdo_score')
    .order('updated_at', { ascending: false })
    .limit(2500);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-headline font-black text-slate-100">Live city map</h1>
      <p className="text-sm text-slate-400">City-wide ticket pins on the dark basemap.</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        darkMode
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
