// ============================================================
// SSR Web Dashboard — Safe Mapbox Map Component
// Production-hardened for real data ingestion from Flutter/mobile
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GeoJSON as GeoJSONValue } from 'geojson';
import type { Ticket, Zone } from '@/lib/types/database';
import type mapboxgl from 'mapbox-gl';

type MapboxDefault = typeof import('mapbox-gl').default;
import { isValidCoordinate, safeString } from '@/lib/validation';
import { cn } from '@/lib/utils';

// ============================================================
// Types & Interfaces
// ============================================================

interface SafeMapboxMapProps {
  tickets?: Ticket[];
  zones?: Zone[];
  chronicLocations?: Array<{ id: string; latitude: number; longitude: number; address_text?: string | null; complaint_count: number }>;
  darkMode?: boolean;
  height?: string;
  onTicketClick?: (ticket: Ticket) => void;
  onError?: (error: Error) => void;
  showLegend?: boolean;
  className?: string;
}

interface MapError {
  type: 'token' | 'initialization' | 'data' | 'runtime';
  message: string;
}

// ============================================================
// Constants
// ============================================================

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#16A34A',
  UNKNOWN: '#64748B',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#64748B',
  verified: '#3B82F6',
  assigned: '#6366F1',
  in_progress: '#F59E0B',
  audit_pending: '#EAB308',
  resolved: '#16A34A',
  rejected: '#EF4444',
  escalated: '#DC2626',
  cross_assigned: '#8B5CF6',
};

// Solapur city center (safe fallback)
const DEFAULT_CENTER: [number, number] = [75.9064, 17.6799];
const DEFAULT_ZOOM = 12;

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

// ============================================================
// Component
// ============================================================

export function SafeMapboxMap({
  tickets = [],
  zones = [],
  chronicLocations = [],
  darkMode = false,
  height = '400px',
  onTicketClick,
  onError,
  showLegend = true,
  className,
}: SafeMapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<MapError | null>(null);
  const [validTicketCount, setValidTicketCount] = useState(0);
  const [invalidTicketCount, setInvalidTicketCount] = useState(0);

  // Validate and filter tickets
  const validatedTickets = useCallback(() => {
    let valid = 0;
    let invalid = 0;

    const filtered = tickets.filter((ticket) => {
      // Strict validation: require all critical fields
      if (!ticket?.id) {
        invalid++;
        return false;
      }

      if (!isValidCoordinate(ticket.latitude, ticket.longitude)) {
        invalid++;
        console.warn(`[SafeMapboxMap] Invalid coordinates for ticket ${ticket.id}: lat=${ticket.latitude}, lng=${ticket.longitude}`);
        return false;
      }

      valid++;
      return true;
    });

    setValidTicketCount(valid);
    setInvalidTicketCount(invalid);
    return filtered;
  }, [tickets]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || token === 'your-mapbox-token-here' || token.length < 10) {
      const err: MapError = {
        type: 'token',
        message: 'Mapbox token not configured. Please set NEXT_PUBLIC_MAPBOX_TOKEN.',
      };
      setError(err);
      setIsLoading(false);
      onError?.(new Error(err.message));
      return;
    }

    import('mapbox-gl')
      .then((mapboxglModule) => {
        try {
          mapboxglModule.default.accessToken = token;

          // Calculate center from valid tickets if available
          const validTickets = validatedTickets();
          let center = DEFAULT_CENTER;
          let zoom = DEFAULT_ZOOM;

          if (validTickets.length > 0) {
            // Use first valid ticket's coordinates as center
            const firstTicket = validTickets[0];
            if (isValidCoordinate(firstTicket.latitude, firstTicket.longitude)) {
              center = [firstTicket.longitude, firstTicket.latitude];
              zoom = 14; // Closer zoom when we have data
            }
          }

          const map = new mapboxglModule.default.Map({
            container: mapContainer.current!,
            style: darkMode
              ? 'mapbox://styles/mapbox/dark-v11'
              : 'mapbox://styles/mapbox/light-v11',
            center,
            zoom,
            attributionControl: false,
          });

          map.addControl(new mapboxglModule.default.NavigationControl({ showCompass: false }), 'top-right');
          map.addControl(new mapboxglModule.default.AttributionControl({ compact: true }), 'bottom-right');

          mapRef.current = map;

          map.on('load', () => {
            setIsLoading(false);
            renderMarkers(map, mapboxglModule.default, validTickets);
            renderChronicLocations(map, mapboxglModule.default);
            renderZoneBoundaries(map);
          });

          map.on('error', (e) => {
            console.error('[SafeMapboxMap] Map error:', e);
            const err: MapError = {
              type: 'runtime',
              message: safeString(e.error?.message, 'Map runtime error'),
            };
            setError(err);
            onError?.(new Error(err.message));
          });
        } catch (err) {
          console.error('[SafeMapboxMap] Initialization error:', err);
          const mapErr: MapError = {
            type: 'initialization',
            message: err instanceof Error ? err.message : 'Failed to initialize map',
          };
          setError(mapErr);
          setIsLoading(false);
          onError?.(new Error(mapErr.message));
        }
      })
      .catch((err) => {
        console.error('[SafeMapboxMap] Failed to load mapbox-gl:', err);
        const mapErr: MapError = {
          type: 'initialization',
          message: 'Failed to load Mapbox GL library',
        };
        setError(mapErr);
        setIsLoading(false);
        onError?.(new Error(mapErr.message));
      });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]); // Only re-initialize on darkMode change

  // Render markers helper
  const renderMarkers = useCallback((
    map: mapboxgl.Map,
    M: MapboxDefault,
    validTickets: Ticket[]
  ) => {
    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    validTickets.forEach((ticket) => {
      if (!isValidCoordinate(ticket.latitude, ticket.longitude)) return;

      const severity = safeString(ticket.severity_tier, 'UNKNOWN');
      const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.UNKNOWN;
      const statusColor = STATUS_COLORS[ticket.status] || '#64748B';

      const el = document.createElement('div');
      el.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 0 0 2px ${color}80, 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.5)';
        el.style.zIndex = '1000';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      });

      const popupContent = `
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 12px;
          min-width: 180px;
          padding: 4px;
        ">
          <p style="
            font-weight: 800;
            color: #1E3A5F;
            margin: 0 0 6px 0;
            font-size: 13px;
          ">${safeString(ticket.ticket_ref, 'Unknown')}</p>
          <p style="
            margin: 0 0 4px 0;
            color: #64748B;
            font-size: 11px;
            line-height: 1.4;
          ">${safeString(ticket.road_name || ticket.address_text, 'Unknown location')}</p>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 700;
              background: ${color}20;
              color: ${color};
              text-transform: uppercase;
            ">${severity}</span>
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 600;
              background: ${statusColor}15;
              color: ${statusColor};
            ">${ticket.status.replace('_', ' ')}</span>
          </div>
          ${ticket.epdo_score !== null && ticket.epdo_score !== undefined
            ? `<p style="margin: 6px 0 0 0; font-size: 10px; color: #94A3B8;">EPDO: ${ticket.epdo_score.toFixed(1)}</p>`
            : ''}
        </div>
      `;

      const popup = new M.Popup({
        offset: 12,
        closeButton: false,
        maxWidth: '240px',
      }).setHTML(popupContent);

      const marker = new M.Marker({ element: el })
        .setLngLat([ticket.longitude, ticket.latitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        if (onTicketClick) onTicketClick(ticket);
      });

      markersRef.current.push(marker);
    });
  }, [onTicketClick]);

  // Render chronic locations
  const renderChronicLocations = useCallback((map: mapboxgl.Map, mb: MapboxDefault) => {
    if (!chronicLocations?.length) return;

    chronicLocations.forEach((loc) => {
      if (!isValidCoordinate(loc.latitude, loc.longitude)) return;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #DC262620;
        border: 2px solid #DC2626;
        box-shadow: 0 0 0 4px #DC262620, 0 0 0 8px #DC262610;
        cursor: pointer;
        animation: pulse-ring 2s ease-out infinite;
      `;

      // Add pulse animation keyframes if not present
      if (!document.getElementById('map-pulse-style')) {
        const style = document.createElement('style');
        style.id = 'map-pulse-style';
        style.textContent = `
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 #DC262640, 0 0 0 0 #DC262620; }
            50% { box-shadow: 0 0 0 8px #DC262620, 0 0 0 16px #DC262610; }
            100% { box-shadow: 0 0 0 16px #DC262600, 0 0 0 32px #DC262600; }
          }
        `;
        document.head.appendChild(style);
      }

      const popup = new mb.Popup({
        offset: 12,
        closeButton: false,
      }).setHTML(`
        <div style="font-family: system-ui; font-size: 12px; min-width: 160px;">
          <p style="font-weight: 800; color: #DC2626; margin: 0 0 4px">Chronic Hotspot</p>
          <p style="margin: 0 0 2px; color: #64748B; font-size: 11px;">
            ${safeString(loc.address_text, `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`)}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #DC2626; font-weight: 700;">
            ${loc.complaint_count} complaints
          </p>
        </div>
      `);

      const chronicMarker = new mb.Marker({ element: el })
        .setLngLat([loc.longitude, loc.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(chronicMarker);
    });
  }, [chronicLocations]);

  // Render zone boundaries
  const renderZoneBoundaries = useCallback((map: mapboxgl.Map) => {
    if (!zones?.length) return;

    zones.forEach((zone) => {
      const zoneWithBoundary = zone as Zone & { boundary_geojson?: unknown };
      if (!zoneWithBoundary.boundary_geojson) return;

      try {
        const geojson = parseBoundaryGeoJSON(zoneWithBoundary.boundary_geojson);
        if (!geojson) return;

        const sourceId = `zone-${zone.id}`;
        if (map.getSource(sourceId)) return;

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
      } catch (err) {
        console.warn(`[SafeMapboxMap] Failed to render zone ${zone.id} boundary:`, err);
      }
    });
  }, [zones, darkMode]);

  // Update markers when tickets or chronic locations change (without full map re-init)
  useEffect(() => {
    if (!mapRef.current) return;
    const validTickets = validatedTickets();
    import('mapbox-gl').then((mapboxgl) => {
      const map = mapRef.current!;
      const M = mapboxgl.default;
      renderMarkers(map, M, validTickets);
      renderChronicLocations(map, M);
    });
  }, [tickets, chronicLocations, validatedTickets, renderMarkers, renderChronicLocations]);

  // ============================================================
  // Render
  // ============================================================

  if (error) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8',
          className
        )}
        style={{ height }}
      >
        <span className="material-symbols-outlined text-slate-300 mb-2" style={{ fontSize: 48 }}>
          {error.type === 'token' ? 'key_off' : 'map_off'}
        </span>
        <p className="text-sm font-medium text-slate-500 text-center max-w-xs">
          {error.message}
        </p>
        {error.type === 'token' && (
          <p className="text-xs text-slate-400 mt-2 text-center">
            Please configure your Mapbox token in environment variables
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-xl overflow-hidden border border-slate-200', className)}
      style={{ height }}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading map...</p>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Data Quality Indicator */}
      {!isLoading && (validTicketCount > 0 || invalidTicketCount > 0) && (
        <div className={cn(
          'absolute top-3 right-3 z-10 rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-sm',
          darkMode ? 'bg-slate-800/90 text-slate-300' : 'bg-white/95 text-slate-600'
        )}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium">{validTicketCount} plotted</span>
          </div>
          {invalidTicketCount > 0 && (
            <div className="flex items-center gap-2 mt-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-medium">{invalidTicketCount} invalid coords</span>
            </div>
          )}
        </div>
      )}

      {/* Empty State Overlay */}
      {!isLoading && validTicketCount === 0 && (
        <div className={cn(
          'absolute inset-0 z-5 flex flex-col items-center justify-center pointer-events-none',
          darkMode ? 'bg-slate-900/50' : 'bg-slate-50/80'
        )}>
          <span className="material-symbols-outlined text-slate-300 mb-2" style={{ fontSize: 48 }}>
            location_off
          </span>
          <p className="text-sm font-medium text-slate-500">
            No valid ticket locations to display
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Data will appear when field reports are submitted
          </p>
        </div>
      )}

      {/* Legend */}
      {showLegend && !isLoading && validTicketCount > 0 && (
        <div className={cn(
          'absolute bottom-3 left-3 z-10 rounded-lg px-3 py-2 flex flex-col gap-2 text-[10px] font-bold shadow-lg backdrop-blur-sm',
          darkMode ? 'bg-slate-800/90 text-slate-300' : 'bg-white/95 text-slate-600'
        )}>
          <p className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">Severity</p>
          {Object.entries(SEVERITY_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([tier, color]) => (
            <span key={tier} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
              {tier}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
