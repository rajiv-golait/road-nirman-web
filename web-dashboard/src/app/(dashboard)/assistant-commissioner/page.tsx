import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard, StatusPill, EmptyState } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';

export default async function ACDashboardPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .eq('id', profile.zone_id)
    .single();
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, ticket_ref, road_name, address_text, status, sla_breach, created_at, citizen_confirmed')
    .eq('zone_id', profile.zone_id)
    .order('updated_at', { ascending: false });
  const { data: officers, error: officersError } = await supabase
    .from('profiles')
    .select('id, full_name, role, opi_score, opi_zone')
    .eq('zone_id', profile.zone_id)
    .in('role', ['je', 'ae', 'de']);

  if (zoneError) throw new Error(zoneError.message);
  if (ticketsError) throw new Error(ticketsError.message);
  if (officersError) throw new Error(officersError.message);

  const openCount = tickets?.filter((t) => !['resolved', 'rejected'].includes(t.status)).length || 0;
  const slaBreach = tickets?.filter((t) => t.sla_breach).length || 0;
  const confirmedCount = tickets?.filter((t) => t.citizen_confirmed === true).length || 0;
  const resolvedCount = tickets?.filter((t) => t.status === 'resolved').length || 0;
  const receivedCount = tickets?.filter((t) => t.status === 'open').length || 0;
  const fixingCount = tickets?.filter((t) => t.status === 'in_progress').length || 0;
  const confirmRate = resolvedCount > 0 ? Math.round((confirmedCount / resolvedCount) * 100) : 0;
  const budgetPct =
    zone && zone.annual_road_budget > 0
      ? Math.round((zone.budget_consumed / zone.annual_road_budget) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Zone Control Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Administrative SLA oversight for zone queue health, officer performance, and citizen confirmation.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Active Queue" value={openCount} accentColor="bg-accent" icon="inbox" />
        <KpiCard label="SLA Breached" value={slaBreach} accentColor="bg-error" icon="timer_off" />
        <KpiCard label="Resolved" value={resolvedCount} accentColor="bg-success" icon="check_circle" />
        <KpiCard
          label="Citizen Confirmation"
          value={`${confirmRate}%`}
          accentColor="bg-blue-500"
          icon="sms"
        />
        <KpiCard label="Budget Used" value={`${budgetPct}%`} accentColor="bg-primary" icon="account_balance" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Received" value={receivedCount} accentColor="bg-slate-400" icon="mark_email_unread" />
        <KpiCard label="Fixing" value={fixingCount} accentColor="bg-amber-500" icon="construction" />
        <KpiCard label="Officers" value={officers?.length || 0} accentColor="bg-purple-500" icon="groups" />
        <KpiCard label="Zone" value={zone?.name || '-'} accentColor="bg-primary" icon="location_city" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Zone Budget</p>
          <p className="text-2xl font-headline font-black text-primary">
            {formatINR(zone?.budget_consumed || 0)}
          </p>
          <p className="text-xs text-slate-400">of {formatINR(zone?.annual_road_budget || 0)}</p>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              groups
            </span>
            Officer Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(officers || []).slice(0, 6).map((o) => {
              const opiColor =
                o.opi_zone === 'green'
                  ? 'text-success bg-green-50'
                  : o.opi_zone === 'red'
                    ? 'text-error bg-red-50'
                    : 'text-amber-600 bg-amber-50';
              return (
                <div
                  key={o.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${opiColor} shrink-0`}>
                    <span className="font-headline font-black text-sm">{o.opi_score ?? '-'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{o.full_name}</p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {o.role === 'je' ? 'JE' : o.role === 'ae' ? 'AE' : 'DE'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
            list_alt
          </span>
          Zone Lifecycle Queue
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Road / Location</th>
                <th>Status</th>
                <th className="text-center">SLA</th>
                <th>Age</th>
              </tr>
            </thead>
            <tbody>
              {(tickets || []).slice(0, 25).map((t) => (
                <tr key={t.id}>
                  <td className="font-mono font-bold text-xs text-primary">{t.ticket_ref}</td>
                  <td className="text-xs text-slate-700">{t.road_name || t.address_text || '-'}</td>
                  <td>
                    <StatusPill status={t.status} />
                  </td>
                  <td className="text-center">
                    {t.sla_breach ? (
                      <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>
                        warning
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-success" style={{ fontSize: 16 }}>
                        check
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-slate-400">
                    {Math.round((Date.now() - new Date(t.created_at).getTime()) / 86400000)}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!tickets || tickets.length === 0) && (
            <EmptyState icon="inbox" message="No tickets in the zone lifecycle queue" />
          )}
        </div>
      </div>
    </div>
  );
}
