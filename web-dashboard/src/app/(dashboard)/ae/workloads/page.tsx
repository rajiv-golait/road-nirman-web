import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';

export default async function AEWorkloadsPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const { data: jes } = await supabase
    .from('profiles')
    .select('id, full_name, employee_id, email, opi_score, opi_zone')
    .eq('zone_id', profile.zone_id)
    .eq('role', 'je');

  // Include resolved/rejected so JE totals match the AE Overview "JE Workload Distribution"
  // (that view uses all zone tickets). Active pipeline counts still use status filters only.
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, status, assigned_je, sla_breach, severity_tier')
    .eq('zone_id', profile.zone_id);

  const all = tickets || [];

  const OPI_COLORS: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">JE Workload Assessment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Per-JE counts match the overview: assigned includes resolved tickets; pipeline columns count by status; load bar uses{' '}
          <strong>active</strong> tickets only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(jes || []).map((je) => {
          const jeTickets = all.filter((ticket) => ticket.assigned_je === je.id);
          const activeTickets = jeTickets.filter(
            (ticket) => ticket.status !== 'resolved' && ticket.status !== 'rejected'
          );
          const receivedCount = jeTickets.filter((ticket) => ticket.status === 'open').length;
          const verifiedCount = jeTickets.filter((ticket) => ticket.status === 'verified').length;
          const fixingCount = jeTickets.filter((ticket) => ticket.status === 'in_progress').length;
          const resolvedCount = jeTickets.filter((ticket) => ticket.status === 'resolved').length;
          const breachCount = jeTickets.filter((ticket) => ticket.sla_breach).length;
          const criticalCount = activeTickets.filter((ticket) => ticket.severity_tier === 'CRITICAL').length;

          return (
            <div key={je.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>person</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{je.full_name}</p>
                    <p className="text-[10px] text-slate-400">{je.employee_id || je.email || 'JE'}</p>
                  </div>
                </div>
                {je.opi_zone && (
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${OPI_COLORS[je.opi_zone] || 'bg-slate-100 text-slate-500'}`}>
                    OPI: {je.opi_score?.toFixed(0) || '-'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                <div className="bg-slate-50 rounded-lg p-2.5 text-center col-span-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Assigned</p>
                  <p className="text-lg font-black text-primary">{jeTickets.length}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">{activeTickets.length} active</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-emerald-600 font-bold uppercase">Resolved</p>
                  <p className="text-lg font-black text-emerald-700">{resolvedCount}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Received</p>
                  <p className="text-lg font-black text-slate-700">{receivedCount}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-blue-500 font-bold uppercase">Verified</p>
                  <p className="text-lg font-black text-blue-700">{verifiedCount}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5 text-center">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Fixing</p>
                  <p className="text-lg font-black text-amber-700">{fixingCount}</p>
                </div>
                <div className={`rounded-lg p-2.5 text-center ${breachCount > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">SLA Breach</p>
                  <p className={`text-lg font-black ${breachCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{breachCount}</p>
                </div>
              </div>

              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-bold bg-red-50 px-2 py-1 rounded">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>priority_high</span>
                  {criticalCount} CRITICAL ticket{criticalCount > 1 ? 's' : ''}
                </div>
              )}

              <div className="mt-3">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      activeTickets.length > 15 ? 'bg-red-500' : activeTickets.length > 8 ? 'bg-amber-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${Math.min((activeTickets.length / 20) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Active load:{' '}
                  {activeTickets.length > 15 ? 'Overloaded' : activeTickets.length > 8 ? 'High' : 'Normal'}
                </p>
              </div>
            </div>
          );
        })}

        {(!jes || jes.length === 0) && (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>groups</span>
            <p>No Junior Engineers assigned to this zone</p>
          </div>
        )}
      </div>
    </div>
  );
}
