'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { KpiCard, StatusPill, SeverityBadge, EmptyState } from '@/components/shared/DataDisplay';
import { STATUS_DISPLAY } from '@/lib/constants/status';
import { formatINR, timeAgo, haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Ticket, Zone, Prabhag, TicketStatus } from '@/lib/types/database';
import type { MapZone } from '@/lib/maps/fetchMapZones';

// Dynamic import for Mapbox (client-only, no SSR)
const MapboxMap = dynamic(
  () => import('@/components/map/MapboxMap').then((m) => m.MapboxMap),
  { ssr: false, loading: () => <div className="h-[280px] bg-slate-100 rounded-xl animate-pulse" /> }
);

interface JEDashboardClientProps {
  tickets: Ticket[];
  zone: Zone | null;
  mapZones: MapZone[];
  /** Reserved for prabhag filter UI; passed from server for future use. */
  prabhags: Prabhag[];
  kpis: {
    openCount: number;
    assignedToMe: number;
    escalatedCount: number;
    resolvedThisWeek: number;
    budgetConsumed: number;
    annualBudget: number;
  };
}

const FILTER_STATUSES: TicketStatus[] = ['open', 'verified', 'assigned', 'in_progress', 'audit_pending'];

export function JEDashboardClient({
  tickets: initialTickets,
  zone,
  mapZones,
  prabhags,
  kpis,
}: JEDashboardClientProps) {
  void prabhags;
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [activeFilter, setActiveFilter] = useState<TicketStatus | 'all'>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(false);

  // ── Supabase Realtime subscription ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('je-tickets-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: zone ? `zone_id=eq.${zone.id}` : undefined,
        },
        (payload) => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 2000);

          if (payload.eventType === 'INSERT') {
            setTickets((prev) => [payload.new as Ticket, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Ticket) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [zone]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (activeFilter !== 'all') {
      result = result.filter(t => t.status === activeFilter);
    }
    if (sortByDistance && userLocation) {
      result = [...result].sort((a, b) => {
        const distA = haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
    return result;
  }, [tickets, activeFilter, sortByDistance, userLocation]);

  function handleRouteOptimize() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
      },
      () => { /* Permission denied */ }
    );
  }

  const budgetPercent = kpis.annualBudget > 0
    ? Math.round((kpis.budgetConsumed / kpis.annualBudget) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Received" value={kpis.openCount} accentColor="bg-accent" icon="inbox" />
        <KpiCard label="Assigned to Me" value={kpis.assignedToMe} accentColor="bg-primary" icon="assignment_ind" />
        <KpiCard label="Escalated" value={kpis.escalatedCount} accentColor="bg-error" icon="priority_high" />
        <KpiCard label="Resolved (Week)" value={kpis.resolvedThisWeek} accentColor="bg-success" icon="check_circle" />
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Ticket Inbox (60%) */}
        <section className="lg:w-[60%] flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setActiveFilter('all'); setSortByDistance(false); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  activeFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                All ({tickets.length})
              </button>
              {FILTER_STATUSES.map((status) => {
                const count = tickets.filter(t => t.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                      activeFilter === status ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {STATUS_DISPLAY[status]} ({count})
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-bold transition-all',
                realtimePulse ? 'text-green-600' : 'text-slate-300'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', realtimePulse ? 'bg-green-500 animate-ping' : 'bg-slate-300')} />
                LIVE
              </span>
              <button
                onClick={handleRouteOptimize}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                  sortByDistance ? 'bg-accent text-white shadow-sm' : 'bg-accent/10 text-accent hover:bg-accent/20'
                )}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>route</span>
                {sortByDistance ? 'Sorted by Distance' : 'Optimize Route'}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <EmptyState icon="inbox" message="No tickets match the current filter" />
            ) : (
              filteredTickets.map((ticket) => {
                const distance = userLocation
                  ? haversineDistance(userLocation.lat, userLocation.lng, ticket.latitude, ticket.longitude)
                  : null;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={cn(
                      'bg-white p-4 rounded-xl border cursor-pointer transition-all',
                      selectedTicket?.id === ticket.id
                        ? 'border-primary shadow-md ring-4 ring-primary/5'
                        : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <p className="text-primary font-bold text-xs font-mono">{ticket.ticket_ref}</p>
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {ticket.road_name || ticket.address_text || 'Unknown Location'}
                        </h3>
                      </div>
                      <StatusPill status={ticket.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
                        {ticket.damage_type && <span className="text-[10px] text-slate-500">{ticket.damage_type}</span>}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        {distance !== null && (
                          <span className="flex items-center gap-0.5 text-accent font-bold">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>near_me</span>
                            {distance.toFixed(1)} km
                          </span>
                        )}
                        <span>{timeAgo(ticket.created_at)}</span>
                      </div>
                    </div>
                    {ticket.photo_before && ticket.photo_before.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {ticket.photo_before.slice(0, 3).map((url, i) => (
                          <div key={i} className="w-10 h-10 rounded bg-slate-100 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* RIGHT: Map + Zone Progress + Detail (40%) */}
        <section className="lg:w-[40%] flex flex-col gap-4">
          {/* Zone Budget */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {zone?.name || 'Zone'} — Budget Utilization
              </p>
              <span className={cn(
                'text-xs font-bold',
                budgetPercent >= 90 ? 'text-error' : budgetPercent >= 70 ? 'text-amber-600' : 'text-primary'
              )}>{budgetPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  budgetPercent >= 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-primary to-accent'
                )}
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-400">{formatINR(kpis.budgetConsumed)} consumed</span>
              <span className="text-[10px] text-slate-400">/ {formatINR(kpis.annualBudget)}</span>
            </div>
          </div>

          {/* Live Mapbox Map */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>map</span>
                Zone Map — Ticket Pins
              </p>
              <span className="text-[9px] text-slate-400">{tickets.filter(t => t.latitude).length} plotted</span>
            </div>
            <MapboxMap
              tickets={filteredTickets}
              zones={mapZones.filter((z) => z.boundary_geojson)}
              height="280px"
              onTicketClick={(t) => setSelectedTicket(t)}
            />
          </div>

          {/* Selected Ticket Detail */}
          {selectedTicket && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] font-black text-accent uppercase tracking-[0.15em]">Ticket Detail</p>
                  <h3 className="text-lg font-headline font-black text-primary">{selectedTicket.ticket_ref}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={selectedTicket.status} />
                  <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Location</p>
                  <p className="text-xs font-bold text-slate-700">{selectedTicket.road_name || selectedTicket.address_text || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Damage Type</p>
                  <p className="text-xs font-bold text-slate-700">{selectedTicket.damage_type || '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">EPDO Score</p>
                  <p className="text-xs font-bold text-slate-700">{selectedTicket.epdo_score ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Est. Cost</p>
                  <p className="text-xs font-bold text-slate-700">
                    {selectedTicket.estimated_cost ? formatINR(selectedTicket.estimated_cost) : '—'}
                  </p>
                </div>
                {selectedTicket.total_potholes != null && (
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Potholes (AI)</p>
                    <p className="text-xs font-bold text-slate-700">{selectedTicket.total_potholes}</p>
                  </div>
                )}
                {selectedTicket.ai_confidence != null && (
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">AI Confidence</p>
                    <p className="text-xs font-bold text-slate-700">{(selectedTicket.ai_confidence * 100).toFixed(0)}%</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">
                  Reported {timeAgo(selectedTicket.created_at)}
                  {selectedTicket.citizen_name && ` by ${selectedTicket.citizen_name}`}
                </p>
              </div>
            </div>
          )}

          {/* JE Web Boundary Notice */}
          <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-[10px] text-blue-700 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
              <span><strong>Planning view only.</strong> Field actions (check-in, camera, measurements) are available in the mobile app.</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
