'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { formatINR, cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  type CommissionerKpis,
  fetchCommissionerKpis,
} from '@/lib/dashboard/commissionerKpis';
import { BudgetGauge, MiniBudgetGauge } from '@/components/dashboard/BudgetGauge';
import { STATUS_DISPLAY } from '@/lib/constants/status';
import { KpiCard } from '@/components/shared/DataDisplay';
import type { Ticket, Zone, TicketStatus } from '@/lib/types/database';

const MapboxMap = dynamic(
  () => import('@/components/map/MapboxMap').then((m) => m.MapboxMap),
  { ssr: false, loading: () => <div className="h-[320px] bg-slate-800 rounded-xl animate-pulse" /> }
);

interface ContractorMetric {
  contractor_id: string;
  ssim_pass_rate: number | null;
  reopen_rate: number | null;
  quality_index: number | null;
}

interface TicketEvent {
  id: string;
  event_type: string;
  new_status: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface CommissionerClientProps {
  initialTickets: Ticket[];
  zones: Zone[];
  metrics: ContractorMetric[];
  recentEvents: TicketEvent[];
  initialKpis: CommissionerKpis;
  totalBudget: number;
  totalConsumed: number;
}

const STATUS_BUCKET_META: { status: TicketStatus; color: string }[] = [
  { status: 'open', color: 'bg-slate-400' },
  { status: 'verified', color: 'bg-blue-400' },
  { status: 'assigned', color: 'bg-indigo-400' },
  { status: 'in_progress', color: 'bg-amber-400' },
  { status: 'audit_pending', color: 'bg-yellow-400' },
  { status: 'resolved', color: 'bg-green-400' },
  { status: 'rejected', color: 'bg-red-400' },
  { status: 'escalated', color: 'bg-red-500' },
  { status: 'cross_assigned', color: 'bg-purple-400' },
];

const STATUS_BUCKETS = STATUS_BUCKET_META.map((bucket) => ({
  ...bucket,
  label: STATUS_DISPLAY[bucket.status],
}));

export function CommissionerDashboardClient({
  initialTickets,
  zones,
  metrics,
  recentEvents: initialEvents,
  initialKpis,
  totalBudget,
  totalConsumed,
}: CommissionerClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [recentEvents, setRecentEvents] = useState<TicketEvent[]>(initialEvents);
  const [kpis, setKpis] = useState<CommissionerKpis>(initialKpis);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    const refreshKpis = async () => {
      try {
        const nextKpis = await fetchCommissionerKpis(
          supabase as unknown as Parameters<typeof fetchCommissionerKpis>[0]
        );
        if (!disposed) {
          setKpis(nextKpis);
        }
      } catch {
        // Keep the last known values if a refresh fails.
      }
    };

    const ticketChannel = supabase
      .channel('commissioner-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
        if (payload.eventType === 'INSERT') {
          setTickets((prev) => [payload.new as Ticket, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setTickets((prev) =>
            prev.map((ticket) => (ticket.id === payload.new.id ? (payload.new as Ticket) : ticket))
          );
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as { id?: string }).id;
          if (deletedId) {
            setTickets((prev) => prev.filter((ticket) => ticket.id !== deletedId));
          }
        }
        void refreshKpis();
      })
      .subscribe();

    const eventsChannel = supabase
      .channel('commissioner-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_events' },
        (payload) => {
          setRecentEvents((prev) => [payload.new as TicketEvent, ...prev.slice(0, 19)]);
        }
      )
      .subscribe();

    return () => {
      disposed = true;
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, []);

  const budgetPct = totalBudget > 0 ? Math.round((totalConsumed / totalBudget) * 100) : 0;

  const heatmapWeightFn = useMemo(
    () => (ticket: Ticket) => {
      const severityWeight: Record<string, number> = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 };
      const base = severityWeight[ticket.severity_tier || 'LOW'] || 1;
      const chronicMultiplier = ticket.is_chronic_location ? 2 : 1;
      const epdoBoost = (ticket.epdo_score || 0) > 0.5 ? 1.5 : 1;
      return base * chronicMultiplier * epdoBoost;
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="bg-warroom-surface border border-warroom-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 flex items-center gap-2 border-b border-warroom-border">
          <span
            className={`w-2 h-2 rounded-full ${
              pulse ? 'bg-green-400 animate-ping' : 'bg-red-500 animate-pulse'
            }`}
          />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {pulse ? 'New Realtime Event' : 'Live Activity Feed'}
          </span>
        </div>
        <div className="overflow-hidden h-10 flex items-center">
          <div className="animate-ticker whitespace-nowrap flex items-center gap-8 px-4">
            {recentEvents.length === 0 ? (
              <span className="text-slate-600 text-xs">No recent events</span>
            ) : (
              recentEvents.map((event, index) => (
                <span key={index} className="text-xs text-slate-400">
                  <span className="text-accent font-bold">{event.event_type}</span>
                  {event.new_status && (
                    <>
                      {' -> '}
                      <span className="text-white font-medium">{event.new_status}</span>
                    </>
                  )}
                  <span className="text-slate-600 ml-2">
                    {new Date(event.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Open', value: kpis.totalOpen, accent: 'bg-accent' },
            { label: 'Critical', value: kpis.criticalOpen, accent: 'bg-red-500' },
            { label: 'Chronic', value: kpis.chronicCount, accent: 'bg-purple-500' },
            { label: 'Resolved Today', value: kpis.resolvedToday, accent: 'bg-green-500' },
            { label: 'SLA Breached', value: kpis.slaBreach, accent: 'bg-amber-500' },
          ].map((kpi) => (
            <KpiCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              accentColor={kpi.accent}
            />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-warroom-surface border border-warroom-border rounded-xl overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-warroom-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-accent" style={{ fontSize: 14 }}>
                  map
                </span>
                City-Wide Heatmap
              </p>
              <span className="text-[9px] text-slate-600">
                {tickets.filter((ticket) => ticket.latitude).length} tickets | {kpis.chronicCount} chronic
              </span>
            </div>
          </div>
          <MapboxMap
            tickets={tickets}
            darkMode={true}
            height="320px"
            heatmapMode={true}
            heatmapWeightFn={heatmapWeightFn}
          />
        </div>

        <div>
          <h2 className="text-lg font-headline font-extrabold text-white flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              timeline
            </span>
            Macro Lifecycle
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STATUS_BUCKETS.map((bucket) => {
              const count = tickets.filter((ticket) => ticket.status === bucket.status).length;
              return (
                <div
                  key={bucket.status}
                  className="bg-warroom-surface border border-warroom-border rounded-xl p-4 text-center"
                >
                  <div className={`w-3 h-3 rounded-full ${bucket.color} mx-auto mb-2`} />
                  <p className="text-2xl font-headline font-black text-white">{count}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                    {bucket.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-headline font-extrabold text-white flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              handyman
            </span>
            Contractor Quality Index
          </h2>
          <div className="bg-warroom-surface border border-warroom-border rounded-xl overflow-hidden">
            {metrics.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-sm">No contractor data yet</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-warroom-border">
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Contractor
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">
                      SSIM %
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">
                      Reopen %
                    </th>
                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">
                      Q-Index
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 5).map((metric) => (
                    <tr key={metric.contractor_id} className="border-b border-warroom-border/50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-300">
                        {metric.contractor_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-bold ${
                            (metric.ssim_pass_rate || 0) >= 80 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {metric.ssim_pass_rate ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-bold ${
                            (metric.reopen_rate || 0) > 10 ? 'text-red-400' : 'text-slate-400'
                          }`}
                        >
                          {metric.reopen_rate ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-headline font-black text-accent">
                        {metric.quality_index?.toFixed(1) ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-headline font-extrabold text-white flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              location_city
            </span>
            Zone Health
          </h2>
          <div className="space-y-3">
            {zones.map((zone) => {
              const pct =
                zone.annual_road_budget > 0
                  ? Math.round((zone.budget_consumed / zone.annual_road_budget) * 100)
                  : 0;
              const zoneOpen = tickets.filter(
                (ticket) => ticket.zone_id === zone.id && !['resolved', 'rejected'].includes(ticket.status)
              ).length;
              return (
                <div
                  key={zone.id}
                  className="bg-warroom-surface border border-warroom-border rounded-lg px-4 py-3"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300 font-bold">{zone.name}</span>
                    <span className="text-xs text-slate-500">{zoneOpen} open | {pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-warroom-surface border border-warroom-border rounded-xl p-6 flex items-center gap-6">
          <BudgetGauge label="City Budget" consumed={totalConsumed} total={totalBudget} size="md" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Consumed</span>
              <span className="font-bold text-white">{formatINR(totalConsumed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Budget</span>
              <span className="font-bold text-white">{formatINR(totalBudget)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Remaining</span>
              <span
                className={cn(
                  'font-bold',
                  totalBudget - totalConsumed < 0 ? 'text-red-400' : 'text-green-400'
                )}
              >
                {formatINR(Math.max(0, totalBudget - totalConsumed))}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-warroom-surface border border-warroom-border rounded-xl p-6">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Zone Budget Utilization
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <MiniBudgetGauge
                key={zone.id}
                label={zone.name}
                consumed={zone.budget_consumed || 0}
                total={zone.annual_road_budget || 1}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-warroom-surface border border-warroom-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">
            Total City Budget Utilization
          </p>
          <p className="text-xl font-headline font-black text-white">
            {formatINR(totalConsumed)}{' '}
            <span className="text-slate-500 font-normal">/ {formatINR(totalBudget)}</span>
          </p>
        </div>
        <p className="text-3xl font-headline font-black text-accent">{budgetPct}%</p>
      </div>

      <div className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
        <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            visibility
          </span>
          Strategic observation mode only - no actions are available from this dashboard
        </p>
      </div>
    </div>
  );
}
