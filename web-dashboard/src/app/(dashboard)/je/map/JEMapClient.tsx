'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { StatusPill, SeverityBadge } from '@/components/shared/DataDisplay';
import { timeAgo } from '@/lib/utils';
import type { Ticket } from '@/lib/types/database';
import type { JEMapZone } from './jeMapZone';

const MapboxMap = dynamic(
  () => import('@/components/map/MapboxMap').then((m) => m.MapboxMap),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-100 animate-pulse" /> }
);

interface ChronicLocation {
  id: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  complaint_count: number;
  is_flagged: boolean;
}

interface JEMapClientProps {
  tickets: Ticket[];
  chronicLocations: ChronicLocation[];
  zone: JEMapZone | null;
}

const SEVERITY_FILTERS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
type SeverityFilter = typeof SEVERITY_FILTERS[number];

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-green-500',
};

export function JEMapClient({ tickets, chronicLocations, zone }: JEMapClientProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showChronic, setShowChronic] = useState(true);

  const filteredTickets = tickets.filter(t => {
    if (severityFilter === 'ALL') return true;
    return t.severity_tier === severityFilter;
  });

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100/70 p-4 md:p-5">
      {/* Control Bar */}
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>map</span>
          <div>
            <p className="text-xs font-black text-primary">{zone?.name || 'Zone'} — Planning Map</p>
            <p className="text-[10px] text-slate-400">{filteredTickets.length} tickets plotted · {chronicLocations.length} hotspots</p>
          </div>
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-2">
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
                severityFilter === s ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {s !== 'ALL' && (
                <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[s]}`} />
              )}
              {s}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200" />
          <button
            onClick={() => setShowChronic(!showChronic)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
              showChronic ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
            Hotspots
          </button>
        </div>
      </div>

      {/* Map + Side Panel */}
      <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Map */}
        <div className="flex-1 relative">
          <MapboxMap
            tickets={filteredTickets}
            chronicLocations={showChronic ? chronicLocations : []}
            height="100%"
            onTicketClick={(t) => setSelectedTicket(t)}
          />

          {/* Chronic Location Overlay badges (shown on top of map) */}
          {showChronic && chronicLocations.length > 0 && (
            <div className="absolute top-3 left-3 bg-white/95 rounded-xl shadow-lg border border-slate-200 p-3 max-w-[200px]">
              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>warning</span>
                Chronic Hotspots ({chronicLocations.length})
              </p>
              <div className="space-y-1.5">
                {chronicLocations.slice(0, 5).map((loc) => (
                  <div key={loc.id} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                    <p className="text-[10px] text-slate-600 truncate">
                      {loc.address_text || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
                      <span className="text-red-500 font-bold ml-1">×{loc.complaint_count}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-10 right-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Severity</p>
            {Object.entries(SEVERITY_DOT).map(([tier, color]) => (
              <div key={tier} className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-[10px] font-bold text-slate-600">{tier}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side Panel — Ticket List */}
        <div className="hidden w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white xl:flex">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Ticket Queue — Click to highlight on map
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No tickets match the selected filter</div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                  type="button"
                  aria-pressed={selectedTicket?.id === ticket.id}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                    selectedTicket?.id === ticket.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-slate-50 border-l-2 border-transparent'
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-mono font-bold text-primary">{ticket.ticket_ref}</p>
                    {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
                  </div>
                  <p className="text-xs font-bold text-slate-700 truncate">{ticket.road_name || ticket.address_text || 'Unknown'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <StatusPill status={ticket.status} />
                    <span className="text-[10px] text-slate-400">{timeAgo(ticket.created_at)}</span>
                  </div>

                  {/* Expanded detail */}
                  {selectedTicket?.id === ticket.id && (
                    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase">Type</p>
                        <p className="text-[10px] font-bold text-slate-700">{ticket.damage_type || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase">EPDO</p>
                        <p className="text-[10px] font-bold text-slate-700">{ticket.epdo_score ?? '—'}</p>
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Stats footer */}
          <div className="border-t border-slate-200 px-4 py-3 grid grid-cols-2 gap-3 bg-slate-50/50">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((tier) => {
              const count = tickets.filter(t => t.severity_tier === tier).length;
              return (
                <div key={tier} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[tier]}`} />
                  <span className="text-[10px] font-bold text-slate-600">{tier}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
