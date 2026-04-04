'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GeoJSON as GeoJSONValue } from 'geojson';
import type { Ticket, Zone } from '@/lib/types/database';
import type mapboxgl from 'mapbox-gl';

type MapboxDefault = typeof import('mapbox-gl').default;

export interface MapChronicLocation {
  id: string;
  latitude: number;
  longitude: number;
  address_text?: string | null;
  complaint_count: number;
}

interface MapboxMapProps {
  tickets?: Ticket[];
  zones?: Zone[];
  chronicLocations?: MapChronicLocation[];
  darkMode?: boolean;
  height?: string;
  onTicketClick?: (ticket: Ticket) => void;
  heatmapMode?: boolean;
  heatmapWeightFn?: (ticket: Ticket) => number;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#16A34A',
};

const SOLAPUR_CENTER: [number, number] = [75.9064, 17.6799];

function parseBoundaryGeoJSON(raw: unknown): object | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return raw as object;
  }
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as object) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function MapboxMap({
  tickets = [],
  zones = [],
  chronicLocations = [],
  darkMode = false,
  height = '400px',
  onTicketClick,
  heatmapMode = false,
  heatmapWeightFn,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const heatmapSourceRef = useRef<string | null>(null);

  const syncMapLayers = useCallback(
    (map: mapboxgl.Map, M: MapboxDefault) => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      let style = map.getStyle();
      if (style?.layers) {
        for (const layer of style.layers) {
          if (/^zone-\d+-(fill|line)$/.test(layer.id) && map.getLayer(layer.id)) {
            map.removeLayer(layer.id);
          }
        }
      }
      style = map.getStyle();
      if (style?.sources) {
        for (const sid of Object.keys(style.sources)) {
          if (/^zone-\d+$/.test(sid) && map.getSource(sid)) {
            map.removeSource(sid);
          }
        }
      }

      // Heatmap source and layer (for Commissioner view)
      const hasValidTickets = tickets.some((t) => t.latitude && t.longitude);
      if (heatmapMode && hasValidTickets) {
        const heatSourceId = 'ticket-heatmap';
        heatmapSourceRef.current = heatSourceId;

        // Remove old heatmap if exists
        if (map.getLayer(`${heatSourceId}-layer`)) map.removeLayer(`${heatSourceId}-layer`);
        if (map.getSource(heatSourceId)) map.removeSource(heatSourceId);

        const severityWeight: Record<string, number> = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 };

        const features = tickets
          .filter((t) => t.latitude && t.longitude)
          .map((t) => {
            const baseWeight = severityWeight[t.severity_tier || 'LOW'] || 1;
            const customWeight = heatmapWeightFn ? heatmapWeightFn(t) : baseWeight;
            return {
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [t.longitude!, t.latitude!],
              },
              properties: {
                weight: customWeight,
                severity: t.severity_tier || 'LOW',
                ticket_ref: t.ticket_ref,
              },
            };
          });

        const heatGeoJSON: GeoJSONValue = {
          type: 'FeatureCollection',
          features,
        } as GeoJSONValue;

        map.addSource(heatSourceId, {
          type: 'geojson',
          data: heatGeoJSON,
        });

        map.addLayer({
          id: `${heatSourceId}-layer`,
          type: 'heatmap',
          source: heatSourceId,
          maxzoom: 15,
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0, 'rgba(33,102,172,0)',
              0.2, 'rgb(103,169,207)',
              0.4, 'rgb(209,229,240)',
              0.6, 'rgb(253,219,199)',
              0.8, 'rgb(239,138,98)',
              1, 'rgb(178,24,43)',
            ],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
            'heatmap-opacity': 0.8,
          },
        });

        // Add point layer for zoomed-in view
        map.addLayer({
          id: `${heatSourceId}-points`,
          type: 'circle',
          source: heatSourceId,
          minzoom: 14,
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'severity'],
              'CRITICAL', '#DC2626',
              'HIGH', '#EA580C',
              'MEDIUM', '#D97706',
              'LOW', '#16A34A',
              '#64748B',
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
          },
        });
      }

      zones.forEach((zone: Zone) => {
        const zoneWithBoundary = zone as Zone & { boundary_geojson?: unknown };
        const geojson = parseBoundaryGeoJSON(zoneWithBoundary.boundary_geojson);
        if (!geojson) return;

        const sourceId = `zone-${zone.id}`;
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson as GeoJSONValue,
        });

        map.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#1E3A5F',
            'fill-opacity': darkMode ? 0.06 : 0.04,
          },
        });

        map.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': darkMode ? '#F97316' : '#1E3A5F',
            'line-width': 1.5,
            'line-opacity': 0.5,
          },
        });
      });

      tickets.forEach((ticket) => {
        if (!ticket.latitude || !ticket.longitude) return;

        const color = SEVERITY_COLORS[ticket.severity_tier || 'LOW'];

        const el = document.createElement('div');
        el.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 0 0 2px ${color}40;
          cursor: pointer; transition: transform 0.15s;
        `;
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.6)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
        });

        const marker = new M.Marker({ element: el })
          .setLngLat([ticket.longitude, ticket.latitude])
          .setPopup(
            new M.Popup({ offset: 12, closeButton: false }).setHTML(`
                <div style="font-family: system-ui; font-size: 12px; min-width: 160px;">
                  <p style="font-weight: 800; color: #1E3A5F; margin: 0 0 4px">${ticket.ticket_ref}</p>
                  <p style="margin: 0 0 2px; color: #64748B">${ticket.road_name || ticket.address_text || 'Unknown location'}</p>
                  <span style="display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 700;
                    background: ${color}20; color: ${color};">
                    ${ticket.severity_tier || 'LOW'}
                  </span>
                </div>
              `)
          )
          .addTo(map);

        el.addEventListener('click', () => {
          if (onTicketClick) onTicketClick(ticket);
        });

        markersRef.current.push(marker);
      });

      chronicLocations.forEach((loc) => {
        if (loc.latitude == null || loc.longitude == null) return;

        const el = document.createElement('div');
        el.style.cssText = `
          width: 18px; height: 18px; border-radius: 50%;
          background: #DC262620; border: 2px solid #DC2626;
          box-shadow: 0 0 0 3px #DC262620;
          cursor: pointer;
        `;

        const label = loc.address_text || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
        const marker = new M.Marker({ element: el })
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(
            new M.Popup({ offset: 12, closeButton: false }).setHTML(`
              <div style="font-family: system-ui; font-size: 12px; min-width: 160px;">
                <p style="font-weight: 800; color: #DC2626; margin: 0 0 4px">Chronic hotspot</p>
                <p style="margin: 0; color: #64748B; font-size: 11px;">${label}</p>
                <p style="margin: 6px 0 0 0; font-size: 10px; color: #DC2626; font-weight: 700;">×${loc.complaint_count} complaints</p>
              </div>
            `)
          )
          .addTo(map);

        markersRef.current.push(marker);
      });
    },
    [tickets, zones, chronicLocations, darkMode, onTicketClick, heatmapMode, heatmapWeightFn]
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'your-mapbox-token-here') {
      console.warn('Mapbox token not set');
      return;
    }

    let cancelled = false;

    import('mapbox-gl').then((mapboxgl) => {
      if (cancelled || !mapContainer.current) return;

      mapboxgl.default.accessToken = token;

      const map = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: darkMode
          ? 'mapbox://styles/mapbox/dark-v11'
          : 'mapbox://styles/mapbox/light-v11',
        center: SOLAPUR_CENTER,
        zoom: 12,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.default.NavigationControl({ showCompass: false }), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        if (!cancelled) setMapReady(true);
      });
    });

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, [darkMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    import('mapbox-gl').then((mapboxgl) => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      syncMapLayers(map, mapboxgl.default);
    });
  }, [mapReady, syncMapLayers]);

  return (
    <div style={{ position: 'relative', height, borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      <div
        className={`absolute bottom-3 left-3 rounded-lg px-3 py-2 flex gap-3 text-[10px] font-bold
        ${darkMode ? 'bg-slate-800/90 text-slate-300' : 'bg-white/90 text-slate-600'} shadow-lg backdrop-blur-sm`}
      >
        {Object.entries(SEVERITY_COLORS).map(([tier, color]) => (
          <span key={tier} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
            {tier}
          </span>
        ))}
      </div>
    </div>
  );
}
