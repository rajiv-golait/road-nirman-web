'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import {
  fetchEETechnicalReviewQueue,
  type TechnicalReviewTicket,
  type WarrantyWatchTicket,
} from '@/lib/dashboard/eeTechnicalReview';
import { KpiCard } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';
import type { Ticket, Zone } from '@/lib/types/database';

interface ContractorMetrics {
  contractor_id: string;
  total_completed: number;
  ssim_pass_rate: number | null;
  reopen_rate: number | null;
  quality_index: number | null;
}

interface EEDashboardClientProps {
  zones: Zone[];
  initialTickets: Ticket[];
  contractors: ContractorMetrics[];
  initialQueue: TechnicalReviewTicket[];
  initialWarrantyWatch: WarrantyWatchTicket[];
}

export function EEDashboardClient({
  zones,
  initialTickets,
  contractors,
  initialQueue,
  initialWarrantyWatch,
}: EEDashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('ee-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        queryClient.invalidateQueries({ queryKey: ['ee', 'technical-review-queue'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const { data: queue, isLoading: queueLoading } = useQuery({
    queryKey: ['ee', 'technical-review-queue'],
    queryFn: () =>
      fetchEETechnicalReviewQueue(
        supabase as unknown as Parameters<typeof fetchEETechnicalReviewQueue>[0]
      ),
    initialData: initialQueue,
    refetchInterval: 30000,
  });

  const escalateMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { data: existing, error: loadError } = await supabase
        .from('tickets')
        .select('status, escalation_count')
        .eq('id', ticketId)
        .single();
      if (loadError) throw new Error(loadError.message);
      if (!existing || existing.status === 'escalated') return;
      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'escalated',
          escalation_count: (existing.escalation_count ?? 0) + 1,
        })
        .eq('id', ticketId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ee', 'technical-review-queue'] });
    },
  });

  const zoneChartData = zones.map((z) => {
    const zoneTickets = initialTickets.filter((t) => t.zone_id === z.id);
    const open = zoneTickets.filter((t) => !['resolved', 'rejected'].includes(t.status)).length;
    const escalated = zoneTickets.filter((t) => t.status === 'escalated').length;
    const breaches = zoneTickets.filter((t) => t.sla_breach).length;
    const breachPct = zoneTickets.length > 0 ? Math.round((breaches / zoneTickets.length) * 100) : 0;
    return {
      name: z.name,
      open,
      escalated,
      breachPct,
      fill: breachPct > 30 ? '#DC2626' : breachPct > 15 ? '#D97706' : '#16A34A',
    };
  });

  const totalOpen = initialTickets.filter((t) => !['resolved', 'rejected'].includes(t.status)).length;
  const totalEscalated = initialTickets.filter((t) => t.status === 'escalated').length;
  const totalBudget = zones.reduce((sum, z) => sum + (z.annual_road_budget || 0), 0) || 0;
  const totalConsumed = zones.reduce((sum, z) => sum + (z.budget_consumed || 0), 0) || 0;

  /** Enough row height for long zone names (e.g. "Zone 1 — Fort Area") + paired bars */
  const zoneWorkloadChartHeight = Math.max(320, zones.length * 52 + 56);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="City-wide Open" value={totalOpen} accentColor="bg-accent" icon="inbox" />
        <KpiCard label="Escalated" value={totalEscalated} accentColor="bg-red-500" icon="priority_high" />
        <KpiCard
          label="Budget Utilized"
          value={`${Math.round((totalConsumed / totalBudget) * 100)}%`}
          accentColor="bg-blue-500"
          icon="account_balance"
        />
        <KpiCard label="Technical Review Queue" value={queue?.length || 0} accentColor="bg-amber-500" icon="engineering" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-headline font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 18 }}>engineering</span>
            Technical Review Queue
          </h2>
          <span className="text-[10px] text-slate-500">
            Rule 3 overdue verified tickets without a job order, plus escalated review items
          </span>
        </div>

        {queueLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (queue || []).length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No tickets currently require EE technical review
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(queue || []).map((ticket) => (
              <div key={ticket.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{ticket.ticket_ref}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        ticket.approval_tier === 'major' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {ticket.approval_tier}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        ticket.status === 'escalated' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {ticket.road_name || 'Unknown location'} · Zone {ticket.zone_id ?? '—'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Estimated cost: {ticket.estimated_cost !== null ? formatINR(ticket.estimated_cost) : '—'} · Rule 3 overdue review · Job order:{' '}
                    {ticket.job_order_ref || 'Not generated'}
                  </p>
                </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      disabled={ticket.status === 'escalated' || escalateMutation.isPending}
                      onClick={() => escalateMutation.mutate(ticket.id)}
                      className="rounded-md bg-error px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
                    >
                      Escalate
                    </button>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-headline font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 18 }}>shield</span>
            Defect Liability Watch
          </h2>
          <span className="text-[10px] text-slate-500">Tickets with warranty expiry in the next 30 days</span>
        </div>

        {initialWarrantyWatch.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No warranty expiry alerts in the next 30 days
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {initialWarrantyWatch.map((ticket) => (
              <div key={ticket.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{ticket.ticket_ref}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-700">
                      Warranty Watch
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {ticket.road_name || 'Unknown location'} · Zone {ticket.zone_id ?? '—'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Contractor: {ticket.assigned_contractor ? `${ticket.assigned_contractor.slice(0, 8)}...` : 'Unassigned'} · Expiry:{' '}
                    {ticket.warranty_expiry ? new Date(ticket.warranty_expiry).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h2 className="text-sm font-headline font-extrabold text-slate-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>bar_chart</span>
            Zonal Workload Distribution
          </h2>
          <div className="w-full" style={{ height: zoneWorkloadChartHeight }}>
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={zoneChartData}
                  layout="vertical"
                  margin={{ left: 4, right: 12, top: 8, bottom: 8 }}
                  barCategoryGap="18%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={188}
                    interval={0}
                    tick={{ fontSize: 10, fill: '#475569' }}
                    tickMargin={6}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={(value: any, name: any) => {
                      const v = typeof value === 'number' ? value : 0;
                      if (name === 'open') return [`${v} open tickets`, 'Open'];
                      if (name === 'escalated') return [`${v} escalated`, 'Escalated'];
                      return [v, name];
                    }}
                  />
                  <Bar dataKey="open" radius={[0, 4, 4, 0]} barSize={16}>
                    {zoneChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Bar dataKey="escalated" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-headline font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>location_city</span>
            Zone Performance
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Zone</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Open</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">SLA %</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((z) => {
                  const zoneTickets = initialTickets.filter((t) => t.zone_id === z.id);
                  const open = zoneTickets.filter((t) => !['resolved', 'rejected'].includes(t.status)).length;
                  const breaches = zoneTickets.filter((t) => t.sla_breach).length;
                  const breachPct = zoneTickets.length > 0 ? Math.round((breaches / zoneTickets.length) * 100) : 0;
                  const statusColor =
                    breachPct > 30
                      ? 'bg-red-100 text-red-700'
                      : breachPct > 15
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700';
                  const statusLabel = breachPct > 30 ? 'At Risk' : breachPct > 15 ? 'Watch' : 'Normal';

                  return (
                    <tr key={z.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-bold text-slate-700">{z.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{z.key_areas}</p>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-700">{open}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold ${breachPct > 20 ? 'text-red-600' : 'text-green-600'}`}>
                          {breachPct}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {contractors.length > 0 && (
        <div>
          <h2 className="text-sm font-headline font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>handyman</span>
            Contractor Performance
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Contractor</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Completed</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">SSIM Pass</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Reopen Rate</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.slice(0, 6).map((c) => (
                  <tr key={c.contractor_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-slate-700">{c.contractor_id.slice(0, 8)}...</td>
                    <td className="px-3 py-2 text-center font-bold">{c.total_completed}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold ${(c.ssim_pass_rate || 0) < 70 ? 'text-red-600' : 'text-green-600'}`}>
                        {c.ssim_pass_rate ?? 0}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold ${(c.reopen_rate || 0) > 10 ? 'text-red-600' : 'text-slate-600'}`}>
                        {c.reopen_rate ?? 0}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center font-headline font-black text-accent">
                      {c.quality_index?.toFixed(1) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

