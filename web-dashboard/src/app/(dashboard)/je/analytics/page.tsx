import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function JEAnalyticsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('zone_id').eq('id', user.id).single();
  if (!profile?.zone_id) return null;

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, status, severity_tier, resolved_in_hours, sla_breach, damage_type, ssim_pass')
    .eq('zone_id', profile.zone_id);

  const { data: zone } = await supabase.from('zones').select('id, name').eq('id', profile.zone_id).single();

  const all = tickets || [];
  const total = all.length;
  const resolved = all.filter((ticket) => ticket.status === 'resolved').length;
  const breached = all.filter((ticket) => ticket.sla_breach).length;
  const ssimPassed = all.filter((ticket) => ticket.ssim_pass === true).length;
  const avgHours = all.filter((ticket) => ticket.resolved_in_hours).reduce((sum, ticket) => sum + (ticket.resolved_in_hours || 0), 0) / (resolved || 1);

  const damageMap: Record<string, number> = {};
  all.forEach((ticket) => { if (ticket.damage_type) damageMap[ticket.damage_type] = (damageMap[ticket.damage_type] || 0) + 1; });
  const damageBreakdown = Object.entries(damageMap).sort((a, b) => b[1] - a[1]);

  const sevMap: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  all.forEach((ticket) => { if (ticket.severity_tier) sevMap[ticket.severity_tier] = (sevMap[ticket.severity_tier] || 0) + 1; });

  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-red-500',
    HIGH: 'bg-orange-500',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-green-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">{zone?.name} - Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Performance metrics and trends for your zone</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Tickets', value: total, color: 'bg-primary' },
          { label: 'Resolved', value: resolved, color: 'bg-success' },
          { label: 'Resolution Rate', value: `${total > 0 ? Math.round((resolved / total) * 100) : 0}%`, color: 'bg-blue-500' },
          { label: 'SLA Breaches', value: breached, color: 'bg-error' },
          { label: 'Avg. Resolution', value: `${avgHours.toFixed(1)}h`, color: 'bg-accent' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${kpi.color}`} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-2xl font-headline font-black text-primary">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-headline font-extrabold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>donut_large</span>
            Severity Distribution
          </h2>
          <div className="space-y-3">
            {Object.entries(sevMap).map(([tier, count]) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={tier}>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${severityColors[tier]}`} />
                      {tier}
                    </span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${severityColors[tier]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-headline font-extrabold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>category</span>
            Damage Type Breakdown
          </h2>
          {damageBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No damage type data yet</p>
          ) : (
            <div className="space-y-3">
              {damageBreakdown.slice(0, 6).map(([type, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>{type}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-headline font-extrabold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>verified</span>
            Quality Verification (SSIM)
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="3"
                  strokeDasharray={`${resolved > 0 ? (ssimPassed / resolved) * 100 : 0} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-lg font-black text-primary">
                  {resolved > 0 ? Math.round((ssimPassed / resolved) * 100) : 0}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-600 font-bold">SSIM Pass: <span className="text-primary">{ssimPassed}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-slate-600 font-bold">SSIM Fail: <span className="text-primary">{resolved - ssimPassed}</span></span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Score &lt; 0.75 = PASS (surface changed)</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-headline font-extrabold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>timeline</span>
            Ticket Pipeline
          </h2>
          <div className="space-y-2">
            {[
              { status: 'open', label: 'Received', color: 'bg-slate-400' },
              { status: 'verified', label: 'Verified', color: 'bg-blue-400' },
              { status: 'assigned', label: 'Repair Assigned', color: 'bg-indigo-400' },
              { status: 'in_progress', label: 'Fixing', color: 'bg-amber-400' },
              { status: 'audit_pending', label: 'Quality Check', color: 'bg-yellow-400' },
              { status: 'resolved', label: 'Resolved', color: 'bg-green-500' },
            ].map(({ status, label, color }) => {
              const count = all.filter((ticket) => ticket.status === status).length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                  <span className="text-xs text-slate-600 w-24">{label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
