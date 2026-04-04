import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AccountsDashboardClient } from './AccountsDashboardClient';
import type { ContractorBill } from '@/lib/types/database';

const BILL_FIELDS = [
  'id',
  'bill_ref',
  'contractor_id',
  'zone_id',
  'fiscal_year',
  'total_tickets',
  'total_area_sqm',
  'total_amount',
  'status',
  'submitted_at',
  'reviewed_by',
  'reviewed_at',
  'approved_by',
  'approved_at',
  'payment_ref',
  'payment_date',
  'rejection_reason',
  'created_at',
].join(', ');

function computeKpis(allBills: ContractorBill[], pendingBills: ContractorBill[]) {
  return {
    pendingCount: pendingBills.length,
    approvedMTD: allBills.filter((bill) => bill.status === 'approved').length,
    totalPaidFY: allBills
      .filter((bill) => bill.status === 'paid')
      .reduce((sum, bill) => sum + (bill.total_amount || 0), 0),
    rejectedCount: allBills.filter((bill) => bill.status === 'rejected').length,
  };
}

export default async function AccountsDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pendingBills } = await supabase
    .from('contractor_bills')
    .select(BILL_FIELDS)
    .in('status', ['submitted', 'accounts_review'])
    .order('submitted_at', { ascending: false });

  const { data: allBills } = await supabase
    .from('contractor_bills')
    .select(BILL_FIELDS);

  const pending = (pendingBills || []) as unknown as ContractorBill[];
  const all = (allBills || []) as unknown as ContractorBill[];

  return (
    <AccountsDashboardClient
      initialDashboard={{
        pendingBills: pending,
        kpis: computeKpis(all, pending),
      }}
    />
  );
}
