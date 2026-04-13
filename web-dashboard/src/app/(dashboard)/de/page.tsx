import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { AlertBanner, EmptyState, KpiCard, StatusPill } from '@/components/shared/DataDisplay';

export default async function DEDashboardPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString();
  const [
    { data: tickets, error: ticketsError },
    { data: jes, error: jesError },
    { data: chronicLocations, error: chronicLocationsError },
    { data: rule2Breaches, error: rule2BreachesError },
    slowWorkOrdersResult,
  ] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, assigned_je, sla_breach, created_at, updated_at, road_name, address_text, severity_tier')
      .eq('zone_id', profile.zone_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, opi_score, opi_zone')
      .eq('role', 'je')
      .eq('zone_id', profile.zone_id),
    supabase
      .from('chronic_locations')
      .select('id, address_text, complaint_count')
      .eq('zone_id', profile.zone_id)
      .eq('is_flagged', true),
    supabase
      .from('tickets')
      .select('id, ticket_ref, status, created_at, road_name, address_text, severity_tier')
      .eq('zone_id', profile.zone_id)
      .eq('status', 'open')
      .lt('created_at', fortyEightHoursAgo)
      .order('created_at', { ascending: true }),
    supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('zone_id', profile.zone_id)
      .eq('status', 'assigned')
      .lt('updated_at', fiveDaysAgo),
  ]);

  if (ticketsError) throw new Error(ticketsError.message);
  if (jesError) throw new Error(jesError.message);
  if (chronicLocationsError) throw new Error(chronicLocationsError.message);
  if (rule2BreachesError) throw new Error(rule2BreachesError.message);
  if (slowWorkOrdersResult.error) throw new Error(slowWorkOrdersResult.error.message);

  const zoneTickets = tickets || [];
  const zoneJEs = jes || [];
  const hotspots = chronicLocations || [];
  const rule2Overdue = rule2Breaches || [];
  const slowWorkOrdersCount = slowWorkOrdersResult.count ?? 0;

  return (
    <div className="space-y-6">
      {rule2Overdue.length > 0 && (
        <AlertBanner
          variant="error"
          icon="timer_off"
          title="Rule 2 - Overdue Verification (48h)"
          description={`${rule2Overdue.length} ticket(s) remain in Received beyond 48 hours without JE action.`}
          count={rule2Overdue.length}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Overdue (48h)" value={rule2Overdue.length} accentColor="bg-error" icon="timer_off" />
        <KpiCard label="Escalated" value={zoneTickets.filter((ticket) => ticket.status === 'escalated').length} accentColor="bg-amber-500" icon="priority_high" />
        <KpiCard label="Chronic Hotspots" value={hotspots.length} accentColor="bg-purple-500" icon="warning" />
        <KpiCard label="Slow Work Orders" value={slowWorkOrdersCount} accentColor="bg-primary" icon="pending_actions" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-headline font-extrabold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>emoji_events</span>
            JE Performance Leaderboard
          </h2>
          <span className="text-[10px] text-slate-500">Ranked by OPI Score</span>
        </div>

        {zoneJEs.length > 0 && (
          <div className="p-4 bg-slate-50">
            <div className="flex items-end justify-center gap-4">
              {zoneJEs
                .slice()
                .sort((a, b) => (b.opi_score || 0) - (a.opi_score || 0))
                .slice(0, 3)
                .map((je, idx) => {
                  const rank = idx + 1;
                  const heightClass = rank === 1 ? 'h-32' : rank === 2 ? 'h-24' : 'h-20';
                  const podiumColor = rank === 1 ? 'bg-amber-400' : rank === 2 ? 'bg-slate-400' : 'bg-amber-700';
                  const textColor = rank === 1 ? 'text-amber-600' : rank === 2 ? 'text-slate-600' : 'text-amber-800';

                  return (
                    <div key={je.id} className="flex flex-col items-center">
                      <div className={`w-16 ${heightClass} ${podiumColor} rounded-t-lg flex items-center justify-center relative`}>
                        <span className="text-2xl font-black text-white">{rank}</span>
                        {rank === 1 && (
                          <span className="material-symbols-outlined absolute -top-6 text-amber-400" style={{ fontSize: 28 }}>
                            emoji_events
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs font-bold text-slate-800 max-w-20 truncate">{je.full_name}</p>
                        <p className={`text-sm font-headline font-black ${textColor}`}>{je.opi_score ?? '-'}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">Rank</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase">JE Name</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Assigned</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">SLA Breach</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">OPI Score</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Zone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {zoneJEs
              .slice()
              .sort((a, b) => (b.opi_score || 0) - (a.opi_score || 0))
              .map((je, idx) => {
                const jeTickets = zoneTickets.filter((ticket) => ticket.assigned_je === je.id);
                const breaches = jeTickets.filter((ticket) => ticket.sla_breach).length;
                const breachPct = jeTickets.length > 0 ? Math.round((breaches / jeTickets.length) * 100) : 0;
                const rank = idx + 1;
                const isTop3 = rank <= 3;

                return (
                  <tr key={je.id} className={`hover:bg-slate-50 ${isTop3 ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          rank === 1
                            ? 'bg-amber-100 text-amber-700'
                            : rank === 2
                            ? 'bg-slate-100 text-slate-700'
                            : rank === 3
                            ? 'bg-amber-700/20 text-amber-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isTop3 && (
                          <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 16 }}>
                            star
                          </span>
                        )}
                        <span className={`font-bold ${isTop3 ? 'text-slate-800' : 'text-slate-700'}`}>{je.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{jeTickets.length}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold ${breachPct > 20 ? 'text-red-600' : 'text-green-600'}`}>
                        {breachPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-headline font-black ${
                          je.opi_zone === 'green'
                            ? 'text-green-600'
                            : je.opi_zone === 'red'
                            ? 'text-red-600'
                            : 'text-amber-500'
                        }`}
                      >
                        {je.opi_score ?? '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          je.opi_zone === 'green'
                            ? 'bg-green-100 text-green-700'
                            : je.opi_zone === 'red'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {je.opi_zone || '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {zoneJEs.length === 0 && <EmptyState icon="groups" message="No JEs in this zone" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>warning</span>
            Chronic Hotspots
          </h2>
          <div className="space-y-3">
            {hotspots.slice(0, 8).map((location) => (
              <div key={location.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>location_on</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{location.address_text || 'Unknown'}</p>
                  <p className="text-[10px] text-slate-400">{location.complaint_count} complaints</p>
                </div>
                <span className="text-lg font-headline font-black text-error">{location.complaint_count}</span>
              </div>
            ))}
            {hotspots.length === 0 && (
              <EmptyState icon="check_circle" message="No chronic hotspots flagged in this zone" />
            )}
          </div>
        </div>
      </div>

      {rule2Overdue.length > 0 && (
        <div>
          <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 20 }}>schedule</span>
            Overdue Inspections (&gt;48h)
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket Ref</th>
                  <th>Road / Location</th>
                  <th>Severity</th>
                  <th>Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rule2Overdue.slice(0, 10).map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="font-mono font-bold text-xs text-primary">{ticket.ticket_ref}</td>
                    <td className="text-xs text-slate-700">{ticket.road_name || ticket.address_text || '-'}</td>
                    <td>{ticket.severity_tier && <span className={`text-xs font-bold ${ticket.severity_tier === 'CRITICAL' ? 'text-error' : 'text-amber-600'}`}>{ticket.severity_tier}</span>}</td>
                    <td className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td><StatusPill status={ticket.status} /></td>
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
