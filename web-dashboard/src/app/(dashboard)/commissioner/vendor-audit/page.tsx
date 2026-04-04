import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CommissionerVendorAuditPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, zone_id, ssim_pass_rate, reopen_rate, quality_index, scorecard_rank')
    .order('quality_index', { ascending: false });

  const rows =
    data?.map((metric) => ({
      contractor: metric.contractor_id,
      zone: metric.zone_id,
      pass_rate: metric.ssim_pass_rate,
      reopen: metric.reopen_rate,
      quality: metric.quality_index,
      rank: metric.scorecard_rank,
    })) || [];

  return (
    <DataReportLayout
      title="Vendor audit"
      subtitle="Contractor quality scorecards for city-wide executive oversight."
      columns={[
        { key: 'contractor', label: 'Contractor' },
        { key: 'zone', label: 'Zone' },
        { key: 'pass_rate', label: 'SSIM pass %', align: 'right' },
        { key: 'reopen', label: 'Reopen %', align: 'right' },
        { key: 'quality', label: 'Quality', align: 'right' },
        { key: 'rank', label: 'Rank', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
