import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard, StatusPill } from '@/components/shared/DataDisplay';
import { timeAgo } from '@/lib/utils';
import Link from 'next/link';

export default async function ACSLABreachesPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('ticket_ref, status, sla_breach, escalation_count, road_name, created_at')
    .eq('sla_breach', true)
    .order('created_at', { ascending: false })
    .limit(300);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const tickets = data || [];
  const totalBreaches = tickets.length;
  const multipleEscalations = tickets.filter(t => (t.escalation_count || 0) > 1).length;
  const activeBreaches = tickets.filter(t => !['resolved', 'rejected'].includes(t.status || '')).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">SLA Breaches</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tickets flagged with SLA breach requiring immediate attention.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Total Breached Tickets"
          value={totalBreaches}
          icon="warning"
        />
        <KpiCard
          label="Active Pending Breaches"
          value={activeBreaches}
          icon="pending_actions"
        />
        <KpiCard
          label="Repeat Escalations (>1)"
          value={multipleEscalations}
          icon="crisis_alert"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
          <h2 className="text-sm font-headline font-black text-primary">Breach Register</h2>
          <span className="text-xs font-bold text-slate-500">{totalBreaches} records found</span>
        </div>
        
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 32 }}>check_circle</span>
            <p>No SLA breaches found in your zone. Great job!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full text-left text-sm">
              <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ticket Ref</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Escalations</th>
                  <th className="px-4 py-3">Road Location</th>
                  <th className="px-4 py-3">Opened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.map((t) => (
                  <tr key={t.ticket_ref} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-primary">
                      <Link href={`/assistant-commissioner/ticket-lifecycle`} className="hover:underline">
                        {t.ticket_ref}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={t.escalation_count && t.escalation_count > 1 ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded' : 'text-slate-700'}>
                        {t.escalation_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{t.road_name || 'Unknown Location'}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{timeAgo(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
