import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function EEContractorsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name, zone_ids, is_blacklisted, defect_flags')
    .order('company_name');
  const { data: metrics } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, ssim_pass_rate, quality_index');

  const metricsById = new Map((metrics || []).map((metric) => [metric.contractor_id, metric]));

  const rows =
    contractors?.map((contractor) => {
      const metric = metricsById.get(contractor.id);
      return {
        company: contractor.company_name,
        blacklisted: contractor.is_blacklisted,
        defect_flags: contractor.defect_flags,
        zones: Array.isArray(contractor.zone_ids) ? contractor.zone_ids.join(', ') : '',
        ssim_pass_rate: metric?.ssim_pass_rate,
        quality_index: metric?.quality_index,
      };
    }) || [];

  return (
    <DataReportLayout
      title="Contractor directory"
      subtitle="Empaneled contractors with the latest technical quality snapshot."
      columns={[
        { key: 'company', label: 'Company' },
        { key: 'blacklisted', label: 'Blacklisted' },
        { key: 'defect_flags', label: 'Defect flags', align: 'right' },
        { key: 'zones', label: 'Zones' },
        { key: 'ssim_pass_rate', label: 'SSIM pass %', align: 'right' },
        { key: 'quality_index', label: 'Q-index', align: 'right' },
      ]}
      rows={rows}
    />
  );
}
