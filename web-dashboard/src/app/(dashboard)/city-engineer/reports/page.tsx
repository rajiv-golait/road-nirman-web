import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';

export default async function CEReportsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: zones } = await supabase
    .from('zones')
    .select('id, name')
    .order('id');
  const { data: tickets } = await supabase
    .from('tickets')
    .select('zone_id, status');

  const zoneStats =
    zones?.map((zone) => {
      const zoneTickets = tickets?.filter((ticket) => ticket.zone_id === zone.id) || [];
      return {
        zone: zone.name,
        total: zoneTickets.length,
        resolved: zoneTickets.filter((ticket) => ticket.status === 'resolved').length,
        active_queue: zoneTickets.filter((ticket) => !['resolved', 'rejected'].includes(ticket.status)).length,
      };
    }) || [];

  const overallTotal = zoneStats.reduce((sum, z) => sum + z.total, 0);
  const overallActive = zoneStats.reduce((sum, z) => sum + z.active_queue, 0);
  const overallResolved = zoneStats.reduce((sum, z) => sum + z.resolved, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Engineering Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Zone throughput snapshot representing current operation scale.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          label="Total Tickets Distributed"
          value={overallTotal}
          icon="confirmation_number"
        />
        <KpiCard
          label="Active Repair Queue"
          value={overallActive}
          icon="construction"
        />
        <KpiCard
          label="Successfully Resolved"
          value={overallResolved}
          icon="check_circle"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-headline font-black text-primary">Zone Throughput Analytics</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Zone Location</th>
                <th className="px-4 py-3 text-right">Total Assigned</th>
                <th className="px-4 py-3 text-right">Active Queue</th>
                <th className="px-4 py-3 text-right">Resolved Output</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {zoneStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No zone data available.
                  </td>
                </tr>
              )}
              {zoneStats.map((z, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700">{z.zone}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">{z.total}</td>
                  <td className="px-4 py-3 text-right font-black text-amber-600">{z.active_queue}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-600">{z.resolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
