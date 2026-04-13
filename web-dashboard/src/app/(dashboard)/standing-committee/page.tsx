import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { ExportButton, KpiCard } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';

export default async function StandingCommitteePage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('id, contractor_id, zone_id, status, total_amount, submitted_at')
    .order('submitted_at', { ascending: false });
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget')
    .order('id');
  const { data: metrics } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, ssim_pass_rate, reopen_rate, quality_index')
    .order('quality_index', { ascending: false });
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name');

  // Build contractor name map
  const contractorNames: Record<string, string> = {};
  for (const c of contractors || []) {
    contractorNames[c.id] = c.company_name;
  }

  const totalExpenditure =
    bills?.filter((bill) => bill.status === 'paid').reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0;
  const pendingBills =
    bills?.filter((bill) => !['paid', 'rejected', 'draft'].includes(bill.status)).length || 0;
  const activeContracts = new Set(bills?.map((bill) => bill.contractor_id)).size;
  const totalBudget = zones?.reduce((sum, zone) => sum + (zone.annual_road_budget || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2">
          <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 16 }}>visibility</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Read Only Access</span>
        </div>
        <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
          <p className="text-[10px] font-bold text-amber-800">
            CONTRACTOR-EXECUTED WORK ONLY. Mukadam and departmental work is explicitly excluded from this financial view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Expenditure (FY)" value={formatINR(totalExpenditure)} accentColor="bg-primary" icon="payments" />
        <KpiCard label="Pending Bills" value={pendingBills} accentColor="bg-accent" icon="pending_actions" />
        <KpiCard label="Active Contracts" value={activeContracts} accentColor="bg-purple-500" icon="description" />
        <KpiCard
          label="Budget Utilization"
          value={`${totalBudget > 0 ? Math.round((totalExpenditure / totalBudget) * 100) : 0}%`}
          accentColor="bg-success"
          icon="account_balance"
        />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-headline font-extrabold text-primary">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>payments</span>
            Expenditure Summary by Zone
          </h2>
          <ExportButton label="Export Report (CSV)" href="/api/export/standing-zone-spending" />
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th className="text-center">Bills Paid</th>
                <th className="text-right">Amount Paid</th>
                <th className="text-right">Budget</th>
                <th className="text-center">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {(zones || []).map((zone) => {
                const zoneBills = bills?.filter((bill) => bill.zone_id === zone.id && bill.status === 'paid') || [];
                const zonePaid = zoneBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
                const pct = zone.annual_road_budget > 0 ? Math.round((zonePaid / zone.annual_road_budget) * 100) : 0;
                return (
                  <tr key={zone.id}>
                    <td className="text-sm font-bold text-slate-800">{zone.name}</td>
                    <td className="text-center text-sm font-bold">{zoneBills.length}</td>
                    <td className="text-right text-sm font-black text-primary">{formatINR(zonePaid)}</td>
                    <td className="text-right text-xs text-slate-500">{formatINR(zone.annual_road_budget)}</td>
                    <td className="text-center">
                      <span className={`text-sm font-bold ${pct > 80 ? 'text-error' : pct > 60 ? 'text-amber-600' : 'text-success'}`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-headline font-extrabold text-primary">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>handyman</span>
          Contractor Performance Index
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(metrics || []).slice(0, 3).map((metric, index) => (
            <div key={metric.contractor_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-headline font-black text-white ${
                  index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-700'
                }`}>
                  #{index + 1}
                </span>
                <p className="truncate text-sm font-bold text-slate-800">{contractorNames[metric.contractor_id] || metric.contractor_id.slice(0, 12)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 py-2">
                  <p className="text-sm font-bold text-success">{metric.ssim_pass_rate ?? 0}%</p>
                  <p className="text-[8px] uppercase text-slate-400">SSIM Pass</p>
                </div>
                <div className="rounded-lg bg-slate-50 py-2">
                  <p className={`text-sm font-bold ${(metric.reopen_rate || 0) > 10 ? 'text-error' : 'text-slate-600'}`}>
                    {metric.reopen_rate ?? 0}%
                  </p>
                  <p className="text-[8px] uppercase text-slate-400">Reopen</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
        <p className="flex items-center justify-center gap-2 text-center text-[10px] text-slate-400">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
          Zero mutation access - all surfaces are strictly observational
        </p>
      </div>
    </div>
  );
}
