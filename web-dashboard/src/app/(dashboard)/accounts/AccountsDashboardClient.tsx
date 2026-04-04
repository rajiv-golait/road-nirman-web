'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BillStatusPill, EmptyState, KpiCard } from '@/components/shared/DataDisplay';
import { SsimIndicator } from '@/components/shared/SsimIndicator';
import { isContractorExecutedTicket } from '@/lib/billing-queries';
import { createClient } from '@/lib/supabase/client';
import type { BillLineItem, ContractorBill } from '@/lib/types/database';
import { cn, formatINR, truncate } from '@/lib/utils';

type AccountsKpis = {
  pendingCount: number;
  approvedMTD: number;
  totalPaidFY: number;
  rejectedCount: number;
};

export type AccountsDashboardPayload = {
  pendingBills: ContractorBill[];
  kpis: AccountsKpis;
};

interface AccountsDashboardClientProps {
  initialDashboard: AccountsDashboardPayload;
}

type LineWithTicket = BillLineItem & {
  tickets: unknown;
};

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

function computeKpis(allBills: ContractorBill[], pendingBills: ContractorBill[]): AccountsKpis {
  return {
    pendingCount: pendingBills.length,
    approvedMTD: allBills.filter((bill) => bill.status === 'approved').length,
    totalPaidFY: allBills.filter((bill) => bill.status === 'paid').reduce((sum, bill) => sum + (bill.total_amount || 0), 0),
    rejectedCount: allBills.filter((bill) => bill.status === 'rejected').length,
  };
}

async function fetchAccountsDashboard(): Promise<AccountsDashboardPayload> {
  const supabase = createClient();
  const [pendingRes, allRes] = await Promise.all([
    supabase
      .from('contractor_bills')
      .select(BILL_FIELDS)
      .in('status', ['submitted', 'accounts_review'])
      .order('submitted_at', { ascending: false }),
    supabase.from('contractor_bills').select(BILL_FIELDS),
  ]);

  if (pendingRes.error) throw new Error(pendingRes.error.message);
  if (allRes.error) throw new Error(allRes.error.message);

  const pendingBills = (pendingRes.data || []) as unknown as ContractorBill[];
  const allBills = (allRes.data || []) as unknown as ContractorBill[];

  return {
    pendingBills,
    kpis: computeKpis(allBills, pendingBills),
  };
}

export function AccountsDashboardClient({ initialDashboard }: AccountsDashboardClientProps) {
  const [selectedBill, setSelectedBill] = useState<ContractorBill | null>(initialDashboard.pendingBills[0] || null);
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  const { data: dashboard = initialDashboard } = useQuery({
    queryKey: ['accounts', 'dashboard'],
    queryFn: fetchAccountsDashboard,
    initialData: initialDashboard,
  });

  const { pendingBills, kpis } = dashboard;

  useEffect(() => {
    setSelectedBill((previous) => {
      if (pendingBills.length === 0) return null;
      if (!previous) return pendingBills[0];
      if (pendingBills.some((bill) => bill.id === previous.id)) return previous;
      return pendingBills[0];
    });
  }, [pendingBills]);

  const billId = selectedBill?.id ?? null;

  const { data: lineItems = [], isLoading: lineItemsLoading } = useQuery({
    queryKey: ['accounts', 'bill-line-items', billId],
    enabled: !!billId,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bill_line_items')
        .select(`
          id,
          bill_id,
          ticket_id,
          work_type,
          area_sqm,
          rate_per_unit,
          line_amount,
          ssim_score,
          ssim_pass,
          photo_before,
          photo_after,
          verification_hash,
          created_at,
          tickets ( ticket_ref, assigned_contractor, assigned_mukadam )
        `)
        .eq('bill_id', billId!);

      if (error) throw new Error(error.message);
      const rows = (data || []) as unknown as LineWithTicket[];
      return rows
        .filter((row) => {
          const ticket = Array.isArray(row.tickets) ? row.tickets[0] : row.tickets;
          return isContractorExecutedTicket(
            ticket as { assigned_contractor: string | null; assigned_mukadam: string | null; ticket_ref: string } | null
          );
        })
        .map((row) => {
          const { tickets: _unused, ...line } = row;
          void _unused;
          return line as BillLineItem;
        });
    },
  });

  const billActionMutation = useMutation({
    mutationFn: async (vars: { action: 'approved' | 'rejected'; billId: string; reason?: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('contractor_bills')
        .update({
          status: vars.action,
          ...(vars.action === 'rejected' ? { rejection_reason: vars.reason ?? '' } : {}),
        })
        .eq('id', vars.billId);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  function handleAction(action: 'approved' | 'rejected') {
    if (!selectedBill) return;
    if (action === 'rejected' && !rejectionReason.trim()) return;
    billActionMutation.mutate(
      {
        action,
        billId: selectedBill.id,
        ...(action === 'rejected' ? { reason: rejectionReason.trim() } : {}),
      },
      {
        onSuccess: () => {
          setRejectionReason('');
        },
      }
    );
  }

  const processing = billActionMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2">
        <p className="text-[10px] italic text-blue-700">
          Contractor work only. Departmental (Mukadam) execution is excluded from line items.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pending Review" value={kpis.pendingCount} accentColor="bg-accent" icon="pending_actions" />
        <KpiCard label="Approved (MTD)" value={kpis.approvedMTD} accentColor="bg-success" icon="check_circle" />
        <KpiCard label="Total Paid (FY)" value={formatINR(kpis.totalPaidFY)} accentColor="bg-primary" icon="payments" />
        <KpiCard label="Rejected" value={kpis.rejectedCount} accentColor="bg-error" icon="cancel" />
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <section className="space-y-3 lg:w-[40%]">
          <h2 className="flex items-center gap-2 text-lg font-headline font-extrabold text-primary">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>assignment</span>
            Awaiting Review
          </h2>
          <div className="max-h-[calc(100vh-360px)] space-y-3 overflow-y-auto pr-1">
            {pendingBills.length === 0 ? (
              <EmptyState icon="check_circle" message="No bills pending review" />
            ) : (
              pendingBills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBill(bill)}
                  className={cn(
                    'cursor-pointer rounded-xl border bg-white p-4 transition-all',
                    selectedBill?.id === bill.id
                      ? 'border-primary shadow-md ring-4 ring-primary/5'
                      : 'border-slate-200 shadow-sm hover:border-slate-300'
                  )}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary">{bill.bill_ref}</p>
                      <h3 className="text-sm font-bold text-slate-900">{bill.contractor_id.slice(0, 12)}...</h3>
                    </div>
                    <BillStatusPill status={bill.status} />
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Zone</p>
                      <p className="text-xs font-bold text-slate-600">Zone {bill.zone_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Amount</p>
                      <p className="text-base font-black text-primary">{formatINR(bill.total_amount)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-auto flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg lg:w-[60%]">
          {selectedBill ? (
            <>
              <div className="border-b border-slate-100 bg-slate-50/50 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-accent">Audit Summary</p>
                    <h2 className="text-2xl font-headline font-black text-primary">{selectedBill.bill_ref}</h2>
                  </div>
                  <BillStatusPill status={selectedBill.status} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Zone</p>
                    <p className="text-sm font-bold text-slate-800">Zone {selectedBill.zone_id}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Tickets</p>
                    <p className="text-sm font-bold text-slate-800">{selectedBill.total_tickets}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Area</p>
                    <p className="text-sm font-bold text-slate-800">{selectedBill.total_area_sqm} sqm</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                {lineItemsLoading ? (
                  <p className="p-6 text-sm text-slate-500">Loading line items...</p>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">Ticket</th>
                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">Work</th>
                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">Area / Rate</th>
                        <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-wider text-slate-500">SSIM</th>
                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">Hash</th>
                        <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-wider text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((lineItem) => (
                        <tr key={lineItem.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="text-xs font-black text-primary">{lineItem.ticket_id.slice(0, 8)}...</p>
                            {lineItem.photo_before && lineItem.photo_after && (
                              <div className="mt-1 flex gap-1">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={lineItem.photo_before} alt="Before" className="h-6 w-6 rounded bg-slate-200 object-cover" />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={lineItem.photo_after} alt="After" className="h-6 w-6 rounded bg-slate-200 object-cover" />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-800">{lineItem.work_type}</td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-slate-700">{lineItem.area_sqm} sqm</p>
                            <p className="text-[9px] text-slate-400">@ {formatINR(lineItem.rate_per_unit)} / sqm</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <SsimIndicator score={lineItem.ssim_score} pass={lineItem.ssim_pass} />
                          </td>
                          <td className="px-4 py-3">
                            <p className="w-16 truncate font-mono text-[9px] text-slate-400">
                              {truncate(lineItem.verification_hash || '', 8)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-black text-primary">
                            {formatINR(lineItem.line_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td colSpan={5} className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Bill Total
                        </td>
                        <td className="px-4 py-4 text-right">
                          <p className="text-xl font-headline font-black text-primary">{formatINR(selectedBill.total_amount)}</p>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="mt-auto border-t border-slate-200 bg-slate-50 p-6">
                {billActionMutation.isError && (
                  <p className="mb-2 text-xs text-red-600">{billActionMutation.error.message}</p>
                )}
                <div className="mb-3">
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Rejection reason (required if rejecting)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm transition-all placeholder:text-slate-300 focus:border-primary focus:ring-0"
                    placeholder="Specify line item or documentation discrepancies..."
                    rows={2}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleAction('approved')}
                    disabled={processing}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success py-3 font-bold text-white shadow-sm transition-all hover:bg-green-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">check_circle</span>
                    Approve Full Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('rejected')}
                    disabled={processing || !rejectionReason.trim()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error py-3 font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">cancel</span>
                    Reject Bill
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon="receipt_long" message="Select a bill from the queue to review" className="flex-1" />
          )}
        </section>
      </div>
    </div>
  );
}
