import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function ACOfficerPerformancePage() {
  const ctx = await getViewerContext();
  if (!ctx) return null;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('profiles')
    .select('full_name, role, opi_score, opi_zone, designation')
    .in('role', ['je', 'ae', 'de']);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data } = await q;

  const rows =
    data?.map((p) => ({
      name: p.full_name,
      role: p.role,
      opi: p.opi_score,
      opi_zone: p.opi_zone,
      designation: p.designation,
    })) || [];

  return (
    <DataReportLayout
      title="Officer performance"
      subtitle="OPI snapshot for JE / AE / DE in your zone."
      columns={[
        { key: 'name', label: 'Officer' },
        { key: 'role', label: 'Role' },
        { key: 'designation', label: 'Designation' },
        { key: 'opi', label: 'OPI', align: 'right' },
        { key: 'opi_zone', label: 'OPI band' },
      ]}
      rows={rows}
    />
  );
}
