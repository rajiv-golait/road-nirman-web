import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/utils';

export default async function AccountsPayoutSummaryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: bills } = await supabase
    .from('contractor_bills')
    .select('*, contractors(*)')
    .in('status', ['approved', 'paid'])
    .order('reviewed_at', { ascending: false });

  const all = bills || [];
  const paid = all.filter(b => b.status === 'paid');
  const approved = all.filter(b => b.status === 'approved');
  const totalPaid = paid.reduce((s, b) => s + b.total_amount, 0);
  const totalPending = approved.reduce((s, b) => s + b.total_amount, 0);

  // Group by contractor
  const contractorMap: Record<string, { name: string; bills: number; total: number; paid: number }> = {};
  all.forEach(b => {
    const id = b.contractor_id;
    const name = (b.contractors as Record<string, string>)?.company_name || id.slice(0, 8) + '...';
    if (!contractorMap[id]) contractorMap[id] = { name, bills: 0, total: 0, paid: 0 };
    contractorMap[id].bills++;
    contractorMap[id].total += b.total_amount;
    if (b.status === 'paid') contractorMap[id].paid += b.total_amount;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-black text-primary">Payout Summary</h1>
          <p className="text-sm text-slate-500 mt-1">Approved and paid contractor bills — FY 2025-26</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/api/export/payout-summary"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded flex items-center gap-2"
            download
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
            Export CSV
          </a>
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[10px] text-blue-700 font-bold">CONTRACTOR WORK ONLY</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid (FY)',     value: formatINR(totalPaid),    color: 'bg-success' },
          { label: 'Awaiting Payment',    value: formatINR(totalPending), color: 'bg-accent' },
          { label: 'Bills Settled',       value: paid.length,             color: 'bg-primary' },
          { label: 'Bills Approved',      value: approved.length,         color: 'bg-blue-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${k.color}`} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{k.label}</p>
            <p className="text-xl font-headline font-black text-primary">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contractor Summary */}
        <div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-headline font-extrabold text-primary">By Contractor</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {Object.entries(contractorMap).map(([id, c]) => (
                <div key={id} className="px-5 py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.bills} bill{c.bills !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{formatINR(c.total)}</p>
                      <p className="text-[10px] text-green-600 font-bold">{formatINR(c.paid)} paid</p>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(contractorMap).length === 0 && (
                <div className="p-6 text-center text-slate-400 text-sm">No approved bills yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Bill Detail Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-headline font-extrabold text-primary">Bill Register</h2>
            </div>
            {all.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>payments</span>
                <p>No paid or approved bills yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Bill Ref</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Contractor</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Zone</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Tickets</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Payment Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {all.map(bill => (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-mono font-bold text-primary">{bill.bill_ref}</p>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-700">
                          {(bill.contractors as Record<string, string>)?.company_name || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-600">Zone {bill.zone_id}</td>
                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-700">{bill.total_tickets}</td>
                        <td className="px-4 py-3 text-right">
                          <p className="text-sm font-black text-primary">{formatINR(bill.total_amount)}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {bill.payment_ref || '—'}
                        </td>
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
