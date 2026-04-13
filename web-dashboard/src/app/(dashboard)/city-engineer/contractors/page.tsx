import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CEContractorsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, company_name, is_blacklisted, defect_flags, contract_number')
    .order('company_name');
  const { data: metrics } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, ssim_pass_rate, reopen_rate');

  const metricsById = new Map((metrics || []).map((metric) => [metric.contractor_id, metric]));

  const rows =
    contractors?.map((contractor) => {
      const metric = metricsById.get(contractor.id);
      return {
        company: contractor.company_name,
        blacklisted: contractor.is_blacklisted,
        defect_flags: contractor.defect_flags,
        contract: contractor.contract_number,
        ssim: metric?.ssim_pass_rate,
        reopen: metric?.reopen_rate,
      };
    }) || [];

  return (
    <DataReportLayout
      title="Contractor registry"
      subtitle="City-wide contractor ecosystem with governance-safe quality indicators."
      columns={[
        { key: 'company', label: 'Company' },
        { key: 'blacklisted', label: 'Blacklisted' },
        { key: 'defect_flags', label: 'Flags', align: 'right' },
        { key: 'contract', label: 'Contract' },
        { key: 'ssim', label: 'SSIM %', align: 'right', format: 'percent' },
        { key: 'reopen', label: 'Reopen %', align: 'right', format: 'percent' },
      ]}
      rows={rows}
    />
  );
}
