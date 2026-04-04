import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { requireSuperAdmin } from '@/lib/admin/requireSuperAdmin';

export default async function AdminUsersPage() {
  const { supabase } = await requireSuperAdmin();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('full_name, phone, email, role, zone_id, is_active, employee_id')
    .order('full_name');

  return (
    <DataReportLayout
      title="User management"
      subtitle="All profiles visible to super admin. Use Role assignment to change roles and zones."
      columns={[
        { key: 'full_name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'zone_id', label: 'Zone' },
        { key: 'is_active', label: 'Active' },
        { key: 'employee_id', label: 'Employee ID' },
      ]}
      rows={profiles || []}
    />
  );
}
