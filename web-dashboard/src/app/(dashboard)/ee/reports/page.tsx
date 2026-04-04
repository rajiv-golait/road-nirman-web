import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function EEReportsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, zone_id, total_completed, ssim_pass_rate, reopen_rate, quality_index')
    .order('quality_index', { ascending: false });

  const rows =
    data?.map((metric) => ({
      contractor_id: metric.contractor_id,
      zone_id: metric.zone_id,
      completed: metric.total_completed,
      ssim_pass_rate: metric.ssim_pass_rate,
      reopen_rate: metric.reopen_rate,
      quality_index: metric.quality_index,
    })) || [];

  return (
    <DataReportLayout
      title="Engineering reports"
      subtitle="Contractor metrics snapshot for city-wide technical oversight."
      columns={[
        { key: 'contractor_id', label: 'Contractor' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'completed', label: 'Completed', align: 'right' },
        { key: 'ssim_pass_rate', label: 'SSIM %', align: 'right' },
        { key: 'reopen_rate', label: 'Reopen %', align: 'right' },
        { key: 'quality_index', label: 'Quality', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
