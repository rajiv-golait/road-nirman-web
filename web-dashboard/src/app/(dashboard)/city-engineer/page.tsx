import { createServerSupabaseClient } from '@/lib/supabase/server';
import { KpiCard, EmptyState } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';

export default async function CityEngineerDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rateCards } = await supabase
    .from('rate_cards')
    .select('id, work_type, unit, rate_per_unit, fiscal_year')
    .eq('is_active', true)
    .order('work_type');
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name, zone_ids, is_blacklisted, defect_flags');
  const { data: contractorMetrics } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, ssim_pass_rate, quality_index')
    .order('quality_index', { ascending: false });
  const { data: chronicLocations } = await supabase
    .from('chronic_locations')
    .select('id')
    .eq('is_flagged', true);
  const { data: zones } = await supabase
    .from('zones')
    .select('id, annual_road_budget, budget_consumed');

  const blacklistedCount = contractors?.filter((c) => c.is_blacklisted).length || 0;
  const contractorWarnings =
    contractors?.filter((c) => !c.is_blacklisted && c.defect_flags >= 2).length || 0;
  const totalBudget = zones?.reduce((s, z) => s + (z.annual_road_budget || 0), 0) || 0;
  const totalConsumed = zones?.reduce((s, z) => s + (z.budget_consumed || 0), 0) || 0;
  const metricsByContractor = new Map((contractorMetrics || []).map((m) => [m.contractor_id, m]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Engineering Governance Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only city-wide visibility into active rate cards, recurring failures, contractor risk,
          and budget context.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Rate Cards" value={rateCards?.length || 0} accentColor="bg-primary" icon="receipt" />
        <KpiCard label="Recurring Failures" value={chronicLocations?.length || 0} accentColor="bg-error" icon="warning" />
        <KpiCard label="Blacklisted" value={blacklistedCount} accentColor="bg-red-600" icon="block" />
        <KpiCard label="Budget Utilization" value={`${Math.round((totalConsumed / totalBudget) * 100)}%`} accentColor="bg-accent" icon="account_balance" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Contractor Warnings" value={contractorWarnings} accentColor="bg-amber-500" icon="report_problem" />
        <KpiCard label="Contractors" value={contractors?.length || 0} accentColor="bg-blue-500" icon="handyman" />
        <KpiCard label="Budget Consumed" value={formatINR(totalConsumed)} accentColor="bg-primary" icon="payments" />
        <KpiCard label="Annual Budget" value={formatINR(totalBudget)} accentColor="bg-slate-400" icon="account_balance_wallet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              receipt
            </span>
            Rate Card Governance
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase rounded flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                lock
              </span>
              Read Only
            </span>
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Active fiscal-year rate cards are displayed for governance visibility only. Editing is not
            available here.
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Work Type</th>
                  <th>Unit</th>
                  <th className="text-right">Rate (INR)</th>
                  <th>FY</th>
                </tr>
              </thead>
              <tbody>
                {(rateCards || []).map((rc) => (
                  <tr key={rc.id}>
                    <td className="text-sm font-bold text-slate-800">{rc.work_type}</td>
                    <td className="text-xs text-slate-600">{rc.unit}</td>
                    <td className="text-right font-mono font-bold text-sm text-primary">
                      {formatINR(rc.rate_per_unit)}
                    </td>
                    <td className="text-xs text-slate-400">{rc.fiscal_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!rateCards || rateCards.length === 0) && (
              <EmptyState icon="receipt" message="No active rate cards" />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>
              handyman
            </span>
            Contractor Ecosystem
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th className="text-center">SSIM Pass</th>
                  <th className="text-center">Q-Index</th>
                  <th className="text-center">Defect Flags</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {(contractors || []).map((c) => {
                  const metric = metricsByContractor.get(c.id);
                  return (
                    <tr key={c.id}>
                      <td>
                        <p className="text-sm font-bold text-slate-800">{c.company_name}</p>
                        <p className="text-[10px] text-slate-400">Zones: {c.zone_ids?.join(', ') || '-'}</p>
                      </td>
                      <td className="text-center text-sm font-bold text-slate-700">
                        {metric?.ssim_pass_rate ?? '-'}
                        {metric?.ssim_pass_rate !== null && metric?.ssim_pass_rate !== undefined ? '%' : ''}
                      </td>
                      <td className="text-center text-sm font-bold text-primary">
                        {metric?.quality_index !== null && metric?.quality_index !== undefined
                          ? metric.quality_index.toFixed(1)
                          : '-'}
                      </td>
                      <td className="text-center">
                        <span
                          className={`text-sm font-bold ${
                            c.defect_flags >= 3
                              ? 'text-error'
                              : c.defect_flags >= 2
                                ? 'text-amber-600'
                                : 'text-slate-600'
                          }`}
                        >
                          {c.defect_flags}
                        </span>
                      </td>
                      <td className="text-center">
                        {c.is_blacklisted ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded">
                            Blacklisted
                          </span>
                        ) : c.defect_flags >= 2 ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded">
                            Warning
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded">
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!contractors || contractors.length === 0) && (
              <EmptyState icon="handyman" message="No contractors registered" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
