import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function ACBudgetPage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  if (!profile.zone_id) {
    return (
      <DataReportLayout
        title="Budget tracking"
        subtitle="No zone assigned to this profile."
        columns={[]}
        rows={[]}
      />
    );
  }

  const { data: zone } = await supabase
    .from('zones')
    .select('id, name, annual_road_budget, budget_consumed')
    .eq('id', profile.zone_id)
    .single();

  const rows = zone
    ? [
        {
          zone: zone.name,
          annual: zone.annual_road_budget,
          consumed: zone.budget_consumed,
          pct:
            zone.annual_road_budget > 0
              ? `${Math.round((zone.budget_consumed / zone.annual_road_budget) * 100)}%`
              : '-',
        },
      ]
    : [];

  return (
    <DataReportLayout
      title="Budget tracking"
      subtitle="Zone budget utilization from the zones master."
      columns={[
        { key: 'zone', label: 'Zone' },
        { key: 'annual', label: 'Annual budget', align: 'right' },
        { key: 'consumed', label: 'Consumed', align: 'right' },
        { key: 'pct', label: 'Utilization' },
      ]}
      rows={rows}
    />
  );
}
