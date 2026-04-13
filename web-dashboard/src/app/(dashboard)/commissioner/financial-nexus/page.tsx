import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';
import Link from 'next/link';

export default async function CommissionerFinancialNexusPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .order('id');
  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('zone_id, status, total_amount')
    .in('status', ['submitted', 'accounts_review', 'approved', 'paid']);

  const nexusData =
    zones?.map((zone) => {
      const zoneBills = bills?.filter((bill) => bill.zone_id === zone.id) || [];
      const pending = zoneBills
        .filter((bill) => ['submitted', 'accounts_review'].includes(bill.status))
        .reduce((sum, bill) => sum + bill.total_amount, 0);
      const settled = zoneBills
        .filter((bill) => ['approved', 'paid'].includes(bill.status))
        .reduce((sum, bill) => sum + bill.total_amount, 0);
      return {
        zone: zone.name,
        annual: zone.annual_road_budget || 0,
        consumed: zone.budget_consumed || 0,
        bills_pending: pending,
        bills_settled: settled,
      };
    }) || [];

  const totalBudget = nexusData.reduce((sum, z) => sum + z.annual, 0);
  const totalConsumed = nexusData.reduce((sum, z) => sum + z.consumed, 0);
  const totalPending = nexusData.reduce((sum, z) => sum + z.bills_pending, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-headline font-black text-primary">Financial Nexus</h1>
            <p className="mt-1 text-sm text-slate-500">
              High-level synchronization between zone budgets and execution pipelines.
            </p>
          </div>
          <Link
            href="/api/export/commissioner-financial-nexus"
            className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            Export CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Aggregated Budget"
          value={formatINR(totalBudget)}
          icon="account_balance"
        />
        <KpiCard
          label="Combined Consumption"
          value={formatINR(totalConsumed)}
          icon="insights"
        />
        <KpiCard
          label="Budget Discrepancy"
          value={formatINR(totalConsumed - nexusData.reduce((sum, z) => sum + z.bills_settled, 0))}
          icon="balance"
        />
        <KpiCard
          label="Pending Validations"
          value={formatINR(totalPending)}
          icon="pending_actions"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-headline font-black text-primary">Execution vs Appropriation</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Administrative Zone</th>
                <th className="px-4 py-3 text-right">Annual Target</th>
                <th className="px-4 py-3 text-right">Consumed</th>
                <th className="px-4 py-3 text-right">Liability Pipeline</th>
                <th className="px-4 py-3 text-right">Settled Assets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {nexusData.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No financial data active.
                  </td>
                </tr>
              )}
              {nexusData.map((z, i) => {
                const consumptionPct = z.annual > 0 ? (z.consumed / z.annual) * 100 : 0;
                
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-700">{z.zone}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">{formatINR(z.annual)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-black text-slate-800">{formatINR(z.consumed)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(consumptionPct, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">{Math.round(consumptionPct)}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-600">{formatINR(z.bills_pending)}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">{formatINR(z.bills_settled)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
