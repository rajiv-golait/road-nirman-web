import { MapEmbed } from '@/components/dashboard/MapEmbed';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';

export default async function EEMapPage() {
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
      <h1 className="text-xl font-headline font-black text-primary">City-wide map</h1>
      <p className="text-sm text-slate-500">All zones — ticket pins on the city basemap.</p>
      <MapEmbed
        tickets={(tickets || []) as import('@/lib/types/database').Ticket[]}
        height="calc(100vh - 200px)"
      />
    </div>
  );
}
