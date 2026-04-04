'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/shared/DataDisplay';
import { timeAgo } from '@/lib/utils';
import type { Ticket } from '@/lib/types/database';
import type { MapZone } from '@/lib/maps/fetchMapZones';

const MapboxMap = dynamic(
  () => import('@/components/map/MapboxMap').then((m) => m.MapboxMap),
  { ssr: false, loading: () => <div className="flex-1 bg-slate-100 animate-pulse min-h-[400px]" /> }
);

interface JEProfile { id: string; full_name: string; }

interface AEMapClientWrapperProps {
  tickets: Ticket[];
  mapZones: MapZone[];
  jes: JEProfile[];
}

export function AEMapClientWrapper({ tickets, mapZones, jes }: AEMapClientWrapperProps) {
  const zoneLabel = mapZones[0]?.name ?? 'Zone';
  const [jeFilter, setJeFilter] = useState<string>('all');
  const [slaOnly, setSlaOnly] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const filtered = tickets.filter(t => {
    if (jeFilter !== 'all' && t.assigned_je !== jeFilter) return false;
    if (slaOnly && !t.sla_breach) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mx-6 -mt-6">
      {/* Control Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>map</span>
          <div>
            <p className="text-xs font-black text-primary">{zoneLabel} — Supervision Map</p>
            <p className="text-[10px] text-slate-400">{filtered.length} tickets shown · {jes.length} JEs in zone</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* JE Filter */}
          <select
            value={jeFilter}
            onChange={e => setJeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="all">All JEs</option>
            {jes.map(je => (
              <option key={je.id} value={je.id}>{je.full_name}</option>
            ))}
          </select>
          {/* SLA Toggle */}
          <button
            onClick={() => setSlaOnly(!slaOnly)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
              slaOnly ? 'bg-error text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>warning</span>
            SLA Breaches Only
          </button>
        </div>
      </div>

      {/* Map + List */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <MapboxMap
            tickets={filtered}
            zones={mapZones.filter((z) => z.boundary_geojson)}
            height="100%"
            onTicketClick={setSelectedTicket}
          />
        </div>

        {/* Side List */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zone Tickets</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                className={cn(
                  'px-4 py-3 cursor-pointer transition-all',
                  selectedTicket?.id === ticket.id
                    ? 'bg-primary/5 border-l-2 border-primary'
                    : 'hover:bg-slate-50 border-l-2 border-transparent',
                  ticket.sla_breach && 'border-l-2 border-error'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-[10px] font-mono font-bold text-primary">{ticket.ticket_ref}</p>
                  {ticket.sla_breach && (
                    <span className="text-[9px] font-black text-error uppercase bg-red-50 px-1.5 py-0.5 rounded">SLA!</span>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-700 truncate">{ticket.road_name || ticket.address_text || 'Unknown'}</p>
                <div className="flex items-center justify-between mt-1">
                  <StatusPill status={ticket.status} />
                  <span className="text-[10px] text-slate-400">{timeAgo(ticket.created_at)}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-slate-400 text-sm">No tickets match the filter</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
