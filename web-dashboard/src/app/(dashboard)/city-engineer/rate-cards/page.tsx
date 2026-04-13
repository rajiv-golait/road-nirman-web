import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';

export default async function CERateCardsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: cards } = await supabase
    .from('rate_cards')
    .select('fiscal_year, work_type, unit, rate_per_unit, zone_id, is_active, effective_from')
    .eq('is_active', true)
    .order('work_type');

  const rateCards = cards || [];
  const totalCards = rateCards.length;
  const uniqueTypes = new Set(rateCards.map(r => r.work_type)).size;
  const avgRate = totalCards > 0 ? rateCards.reduce((acc, r) => acc + (r.rate_per_unit || 0), 0) / totalCards : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Schedule of Rates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Active rate cards (governance view) for billing validation across all zones.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Active Rate Cards"
          value={totalCards}
          icon="receipt_long"
        />
        <KpiCard
          label="Unique Work Types"
          value={uniqueTypes}
          icon="build_circle"
        />
        <KpiCard
          label="Average Median Rate"
          value={formatINR(avgRate)}
          icon="currency_rupee"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
          <h2 className="text-sm font-headline font-black text-primary">Active Rate Registry</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Work Type</th>
                <th className="px-4 py-3">Fiscal Year</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Rate / Unit</th>
                <th className="px-4 py-3">Effective Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rateCards.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No active rate cards found.
                  </td>
                </tr>
              )}
              {rateCards.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.work_type}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{r.fiscal_year}</td>
                  <td className="px-4 py-3 text-slate-500">{r.unit}</td>
                  <td className="px-4 py-3 text-right font-black text-primary">{formatINR(r.rate_per_unit || 0)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {r.zone_id ? `Zone: ${r.zone_id}` : 'City-wide'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
