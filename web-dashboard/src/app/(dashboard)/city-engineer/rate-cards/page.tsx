import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CERateCardsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('rate_cards')
    .select('fiscal_year, work_type, unit, rate_per_unit, zone_id, is_active, effective_from')
    .eq('is_active', true)
    .order('work_type');

  const rows =
    data?.map((r) => ({
      fy: r.fiscal_year,
      work_type: r.work_type,
      unit: r.unit,
      rate: r.rate_per_unit,
      zone_id: r.zone_id,
      effective_from: r.effective_from,
    })) || [];

  return (
    <DataReportLayout
      title="Rate cards"
      subtitle="Active schedule of rates (read-only governance view)."
      columns={[
        { key: 'fy', label: 'FY' },
        { key: 'work_type', label: 'Work type' },
        { key: 'unit', label: 'Unit' },
        { key: 'rate', label: 'Rate', align: 'right' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'effective_from', label: 'Effective' },
      ]}
      rows={rows}
    />
  );
}
