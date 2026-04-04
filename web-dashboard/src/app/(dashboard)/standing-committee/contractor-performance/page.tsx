import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function SCContractorPerformancePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, zone_id, ssim_pass_rate, reopen_rate, quality_index')
    .order('quality_index', { ascending: false });

  const rows =
    data?.map((metric) => ({
      contractor: metric.contractor_id,
      zone: metric.zone_id,
      ssim: metric.ssim_pass_rate,
      reopen: metric.reopen_rate,
      quality: metric.quality_index,
    })) || [];

  return (
    <DataReportLayout
      title="Contractor performance"
      subtitle="Read-only financial oversight for contractor-executed quality metrics."
      columns={[
        { key: 'contractor', label: 'Contractor' },
        { key: 'zone', label: 'Zone' },
        { key: 'ssim', label: 'SSIM %', align: 'right' },
        { key: 'reopen', label: 'Reopen %', align: 'right' },
        { key: 'quality', label: 'Quality', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
