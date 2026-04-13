'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KpiCard, AlertBanner, StatusPill, EmptyState } from '@/components/shared/DataDisplay';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils';
import type { Profile, Ticket } from '@/lib/types/database';

interface AEDashboardClientProps {
  jes: Profile[];
  initialMetricsTickets: Ticket[];
  initialQueueTickets: Ticket[];
  zoneId: number;
  rule1Hours: number;
  initialRule1BreachCount: number;
}

export function AEDashboardClient({
  jes,
  initialMetricsTickets,
  initialQueueTickets,
  zoneId,
  rule1Hours,
  initialRule1BreachCount,
}: AEDashboardClientProps) {
  const [metricsTickets, setMetricsTickets] = useState<Ticket[]>(initialMetricsTickets);
  const [queueTickets, setQueueTickets] = useState<Ticket[]>(initialQueueTickets);
  const queryClient = useQueryClient();

  useEffect(() => {
    setMetricsTickets(initialMetricsTickets);
  }, [initialMetricsTickets]);

  useEffect(() => {
    setQueueTickets(initialQueueTickets);
  }, [initialQueueTickets]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('ae-tickets-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `zone_id=eq.${zoneId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Ticket;
            if (row.zone_id === zoneId) {
              setMetricsTickets((prev) => {
                if (prev.some((t) => t.id === row.id)) return prev;
                return [row, ...prev];
              });
              setQueueTickets((prev) =>
                [row, ...prev.filter((t) => t.id !== row.id)]
                  .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                  .slice(0, 20)
              );
              void queryClient.invalidateQueries({ queryKey: ['ae', 'rule1-breaches', zoneId] });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Ticket;
            setMetricsTickets((prev) => {
              if (updated.zone_id !== zoneId) {
                return prev.filter((t) => t.id !== updated.id);
              }
              const idx = prev.findIndex((t) => t.id === updated.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updated;
                return next;
              }
              return [updated, ...prev];
            });
            setQueueTickets((prev) => {
              if (updated.zone_id !== zoneId) {
                return prev.filter((t) => t.id !== updated.id);
              }
              return [updated, ...prev.filter((t) => t.id !== updated.id)]
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .slice(0, 20);
            });
            void queryClient.invalidateQueries({ queryKey: ['ae', 'rule1-breaches', zoneId] });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setMetricsTickets((prev) => prev.filter((t) => t.id !== deletedId));
            setQueueTickets((prev) => prev.filter((t) => t.id !== deletedId));
            void queryClient.invalidateQueries({ queryKey: ['ae', 'rule1-breaches', zoneId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, zoneId]);

  const { data: rule1BreachCount = initialRule1BreachCount } = useQuery({
    queryKey: ['ae', 'rule1-breaches', zoneId],
    queryFn: async () => {
      const supabase = createClient();
      const threshold = new Date(Date.now() - rule1Hours * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('zone_id', zoneId)
        .eq('status', 'open')
        .lt('created_at', threshold);

      if (error) throw error;
      return count ?? 0;
    },
    initialData: initialRule1BreachCount,
    refetchInterval: 30000,
  });

  const escalatedCount = useMemo(
    () => metricsTickets.filter((t) => t.status === 'escalated').length,
    [metricsTickets]
  );
  const receivedCount = useMemo(
    () => metricsTickets.filter((t) => t.status === 'open').length,
    [metricsTickets]
  );
  const verifiedCount = useMemo(
    () => metricsTickets.filter((t) => t.status === 'verified').length,
    [metricsTickets]
  );
  const inProgressCount = useMemo(
    () => metricsTickets.filter((t) => t.status === 'in_progress').length,
    [metricsTickets]
  );
  const resolvedCount = useMemo(
    () => metricsTickets.filter((t) => t.status === 'resolved').length,
    [metricsTickets]
  );

  return (
    <div className="space-y-6">
      {rule1BreachCount > 0 && (
        <AlertBanner
          variant="error"
          icon="timer_off"
          title="Rule 1 SLA Breach"
          description={`${rule1BreachCount} ticket(s) are still in 'Received' status beyond the Rule 1 acknowledgement window without JE action.`}
          count={rule1BreachCount}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active JEs" value={jes.length} accentColor="bg-primary" icon="groups" />
        <KpiCard label="Received" value={receivedCount} accentColor="bg-slate-400" icon="inbox" />
        <KpiCard label="Verified" value={verifiedCount} accentColor="bg-blue-500" icon="verified" />
        <KpiCard label="In Progress" value={inProgressCount} accentColor="bg-amber-500" icon="construction" />
        <KpiCard label="Escalated" value={escalatedCount} accentColor="bg-error" icon="priority_high" className="lg:col-span-2" />
        <KpiCard label="Resolved" value={resolvedCount} accentColor="bg-success" icon="check_circle" className="lg:col-span-2" />
      </div>

      <div>
        <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>groups</span>
          JE Workload Distribution
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jes.map((je) => {
            const jeTickets = metricsTickets.filter((t) => t.assigned_je === je.id);
            const activeJeTickets = jeTickets.filter(
              (t) => t.status !== 'resolved' && t.status !== 'rejected'
            );
            const receivedCountByJe = jeTickets.filter((t) => t.status === 'open').length;
            const verifiedCountByJe = jeTickets.filter((t) => t.status === 'verified').length;
            const fixingCount = jeTickets.filter((t) => t.status === 'in_progress').length;
            const opiColor =
              je.opi_zone === 'green' ? 'text-success' : je.opi_zone === 'red' ? 'text-error' : 'text-amber-500';

            return (
              <div
                key={je.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>person</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{je.full_name}</p>
                    <p className="text-[10px] text-slate-400">{je.designation || 'Junior Engineer'}</p>
                  </div>
                  {je.opi_score !== null && (
                    <div className="text-right">
                      <p className={`text-lg font-headline font-black ${opiColor}`}>{je.opi_score}</p>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest">OPI</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-800">{jeTickets.length}</p>
                    <p className="text-[8px] text-slate-400 uppercase tracking-widest">Assigned</p>
                    <p className="text-[7px] text-slate-400 mt-0.5">{activeJeTickets.length} active</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-slate-700">{receivedCountByJe}</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest">Received</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-blue-700">{verifiedCountByJe}</p>
                    <p className="text-[8px] text-blue-500 uppercase tracking-widest">Verified</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg py-2">
                    <p className="text-lg font-bold text-amber-700">{fixingCount}</p>
                    <p className="text-[8px] text-amber-500 uppercase tracking-widest">Fixing</p>
                  </div>
                </div>
              </div>
            );
          })}
          {jes.length === 0 && (
            <EmptyState icon="groups" message="No JEs found in this zone" className="col-span-full" />
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>checklist</span>
          Supervision Queue
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket Ref</th>
                <th>Road / Location</th>
                <th>Assigned JE</th>
                <th>Status</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {queueTickets.map((ticket) => {
                const je = jes.find((j) => j.id === ticket.assigned_je);
                return (
                  <tr key={ticket.id}>
                    <td className="font-mono font-bold text-xs text-primary">{ticket.ticket_ref}</td>
                    <td className="text-xs text-slate-700">{ticket.road_name || ticket.address_text || '—'}</td>
                    <td className="text-xs text-slate-600">{je?.full_name || 'Unassigned'}</td>
                    <td>
                      <StatusPill status={ticket.status} />
                    </td>
                    <td className="text-xs text-slate-400">{timeAgo(ticket.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {queueTickets.length === 0 && (
            <EmptyState icon="inbox" message="No tickets in the supervision queue" />
          )}
        </div>
      </div>
    </div>
  );
}
