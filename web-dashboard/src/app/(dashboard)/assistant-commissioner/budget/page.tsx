import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';
import { formatINR } from '@/lib/utils';

export default async function ACBudgetPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const { data: zone } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .eq('id', profile.zone_id)
    .single();

  if (!zone) return <DashboardGuard reason="query_error" detail="Zone budget data could not be found." />;

  const annual = zone.annual_road_budget || 0;
  const consumed = zone.budget_consumed || 0;
  const remaining = annual - consumed;
  const utilization = annual > 0 ? Math.round((consumed / annual) * 100) : 0;
  
  const isWarning = utilization >= 80;
  const isCritical = utilization >= 95;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Budget tracking</h1>
        <p className="mt-1 text-sm text-slate-500">
          Financial consumption for {zone.name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Annual Road Budget"
          value={formatINR(annual)}
          icon="account_balance"
        />
        <KpiCard
          label="Budget Consumed"
          value={formatINR(consumed)}
          icon="payments"
        />
        <KpiCard
          label="Remaining Allocation"
          value={formatINR(remaining)}
          icon="savings"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-headline font-black text-primary">Fiscal Utilization</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
            isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            {utilization}% Consumed
          </span>
        </div>
        
        <div className="w-full h-8 bg-slate-100 rounded-full overflow-hidden mt-6 relative shadow-inner">
          <div 
            className={`h-full bg-gradient-to-r transition-all duration-1000 ${
              isCritical ? 'from-orange-500 to-red-600' : isWarning ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'
            }`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>{formatINR(0)}</span>
          <span className={isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500'}>
            Remaining: {formatINR(remaining)}
          </span>
          <span>{formatINR(annual)}</span>
        </div>
      </div>
    </div>
  );
}
