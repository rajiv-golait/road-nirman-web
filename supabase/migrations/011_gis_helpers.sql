-- ============================================================
-- GIS helpers: zone boundaries as GeoJSON for Mapbox (web dashboard)
-- PostgREST cannot expose GEOGRAPHY as GeoJSON; RPC returns text JSON.
-- SECURITY INVOKER: subject to caller's RLS on underlying zones rows.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_zones_with_geojson(p_zone_id integer DEFAULT NULL)
RETURNS TABLE (
  id integer,
  name text,
  name_marathi text,
  key_areas text,
  centroid_lat double precision,
  centroid_lng double precision,
  boundary_geojson text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    z.id,
    z.name,
    z.name_marathi,
    z.key_areas,
    z.centroid_lat,
    z.centroid_lng,
    CASE
      WHEN z.boundary IS NOT NULL THEN ST_AsGeoJSON(z.boundary::geometry)
      ELSE NULL::text
    END AS boundary_geojson
  FROM public.zones z
  WHERE (p_zone_id IS NULL OR z.id = p_zone_id);
$$;

COMMENT ON FUNCTION public.get_zones_with_geojson(integer) IS
  'Returns zone metadata plus boundary as GeoJSON text for Mapbox GL. Pass p_zone_id to scope to one zone.';

GRANT EXECUTE ON FUNCTION public.get_zones_with_geojson(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_zones_with_geojson(integer) TO service_role;
