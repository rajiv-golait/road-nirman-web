import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { formatINR } from '@/lib/utils';

type BillWithContractor = {
  id: string;
  bill_ref: string;
  contractor_id: string;
  zone_id: number | null;
  total_tickets: number;
  total_amount: number;
  status: 'approved' | 'paid';
  payment_ref: string | null;
  contractors: { company_name?: string } | { company_name?: string }[] | null;
};

function contractorName(row: BillWithContractor): string {
  const embedded = Array.isArray(row.contractors) ? row.contractors[0] : row.contractors;
  return embedded?.company_name || `${row.contractor_id.slice(0, 8)}...`;
}

export default async function AccountsPayoutSummaryPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('id, bill_ref, contractor_id, zone_id, total_tickets, total_amount, status, payment_ref, contractors(company_name)')
    .in('status', ['approved', 'paid'])
    .order('reviewed_at', { ascending: false });

  const all = ((bills || []) as unknown as BillWithContractor[]).filter(
    (bill): bill is BillWithContractor => bill.status === 'approved' || bill.status === 'paid'
  );
  const paid = all.filter((bill) => bill.status === 'paid');
  const approved = all.filter((bill) => bill.status === 'approved');
  const totalPaid = paid.reduce((sum, bill) => sum + bill.total_amount, 0);
  const totalPending = approved.reduce((sum, bill) => sum + bill.total_amount, 0);

  const contractorMap: Record<string, { name: string; bills: number; total: number; paid: number }> = {};
  for (const bill of all) {
    const id = bill.contractor_id;
    if (!contractorMap[id]) {
      contractorMap[id] = { name: contractorName(bill), bills: 0, total: 0, paid: 0 };
    }
    contractorMap[id].bills += 1;
    contractorMap[id].total += bill.total_amount;
    if (bill.status === 'paid') contractorMap[id].paid += bill.total_amount;
  }

  const contractorEntries = Object.entries(contractorMap).sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-black text-primary">Payout Summary</h1>
          <p className="mt-1 text-sm text-slate-500">Approved and paid contractor bills - FY 2025-26</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/payout-summary"
            className="flex items-center gap-2 rounded bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
            download
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              download
            </span>
            Export CSV
          </a>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5">
            <p className="text-[10px] font-bold text-blue-700">CONTRACTOR WORK ONLY</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Paid (FY)', value: formatINR(totalPaid), color: 'bg-success' },
          { label: 'Awaiting Payment', value: formatINR(totalPending), color: 'bg-accent' },
          { label: 'Bills Settled', value: paid.length, color: 'bg-primary' },
          { label: 'Bills Approved', value: approved.length, color: 'bg-blue-500' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`absolute bottom-0 left-0 top-0 w-1 ${kpi.color}`} />
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{kpi.label}</p>
            <p className="text-xl font-headline font-black text-primary">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-headline font-extrabold text-primary">By Contractor</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {contractorEntries.map(([id, summary]) => (
                <div key={id} className="px-5 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{summary.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {summary.bills} bill{summary.bills !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{formatINR(summary.total)}</p>
                      <p className="text-[10px] font-bold text-green-600">{formatINR(summary.paid)} paid</p>
                    </div>
                  </div>
                </div>
              ))}
              {contractorEntries.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">No approved bills yet</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-headline font-extrabold text-primary">Bill Register</h2>
            </div>
            {all.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>
                  payments
                </span>
                <p>No paid or approved bills yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Bill Ref</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Contractor</th>
                      <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">Zone</th>
                      <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">Tickets</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">Amount</th>
                      <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Payment Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {all.map((bill) => (
                      <tr key={bill.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-bold text-primary">{bill.bill_ref}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">{contractorName(bill)}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-600">Zone {bill.zone_id ?? '-'}</td>
                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-700">{bill.total_tickets}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-black text-primary">{formatINR(bill.total_amount)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                              bill.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{bill.payment_ref || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
