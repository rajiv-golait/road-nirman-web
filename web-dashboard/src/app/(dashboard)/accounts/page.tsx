import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
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
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const [pendingRes, allRes, contractorsRes] = await Promise.all([
    supabase
      .from('contractor_bills')
      .select(BILL_FIELDS)
      .in('status', ['submitted', 'accounts_review'])
      .order('submitted_at', { ascending: false }),
    supabase.from('contractor_bills').select(BILL_FIELDS),
    supabase.from('contractors').select('id, company_name'),
  ]);

  const pending = (pendingRes.data || []) as unknown as ContractorBill[];
  const all = (allRes.data || []) as unknown as ContractorBill[];

  // Build contractor name map for display
  const contractorNames: Record<string, string> = {};
  for (const c of contractorsRes.data || []) {
    contractorNames[c.id] = c.company_name;
  }

  return (
    <AccountsDashboardClient
      initialDashboard={{
        pendingBills: pending,
        kpis: computeKpis(all, pending),
        contractorNames,
      }}
    />
  );
}
