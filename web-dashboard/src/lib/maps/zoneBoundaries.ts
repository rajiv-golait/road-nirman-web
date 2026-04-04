/**
 * Optional static GeoJSON fallback for local/dev import only.
 * Production maps use Supabase `get_zones_with_geojson` via `fetchZonesForMap` (see fetchMapZones.ts).
 */
export interface FeatureCollectionLike {
  type: 'FeatureCollection';
  features: unknown[];
}

export async function fetchZonesGeoJson(): Promise<FeatureCollectionLike | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/geojson/zones.geojson', { cache: 'force-cache' });
    if (!res.ok) return null;
    const data = (await res.json()) as FeatureCollectionLike;
    if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) return data;
    return null;
  } catch {
    return null;
  }
}
