import type { SupabaseClient } from '@supabase/supabase-js';
import type { Zone } from '@/lib/types/database';

/** Zone row with GeoJSON boundary string from `get_zones_with_geojson` RPC (Supabase canonical v1). */
export type MapZone = Zone & { boundary_geojson?: string | null };

type RpcRow = {
  id: number;
  name: string;
  name_marathi: string | null;
  key_areas: string | null;
  centroid_lat: number | null;
  centroid_lng: number | null;
  boundary_geojson: string | null;
};

/**
 * Load zone polygons for Mapbox from PostGIS via RPC.
 * Merges budget fields from `zones` table (not returned by RPC).
 */
export async function fetchZonesForMap(
  supabase: SupabaseClient,
  opts: { scope: 'city' } | { scope: 'zone'; zoneId: number }
): Promise<MapZone[]> {
  const p_zone_id = opts.scope === 'city' ? null : opts.zoneId;
  const { data, error } = await supabase.rpc('get_zones_with_geojson', { p_zone_id });
  if (error) {
    console.warn('[fetchZonesForMap]', error.message);
    return [];
  }
  const rows = (data || []) as RpcRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: zoneRows } = await supabase.from('zones').select('*').in('id', ids);
  const byId = new Map((zoneRows || []).map((z) => [z.id, z]));

  return rows.map((row) => {
    const base = byId.get(row.id);
    return {
      id: row.id,
      name: row.name,
      name_marathi: (base?.name_marathi as string) ?? row.name_marathi ?? '',
      key_areas: (base?.key_areas as string) ?? row.key_areas ?? '',
      annual_road_budget: Number(base?.annual_road_budget ?? 0),
      budget_consumed: Number(base?.budget_consumed ?? 0),
      centroid_lat: Number(row.centroid_lat ?? base?.centroid_lat ?? 0),
      centroid_lng: Number(row.centroid_lng ?? base?.centroid_lng ?? 0),
      boundary_geojson: row.boundary_geojson,
    };
  });
}
