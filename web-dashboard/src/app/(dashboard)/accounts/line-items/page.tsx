import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { isContractorExecutedTicket, normalizeTicketJoin } from '@/lib/billing-queries';
import { formatINR } from '@/lib/utils';

type RawLineItem = {
  id: string;
  ticket_id: string;
  work_type: string;
  area_sqm: number | null;
  rate_per_unit: number | null;
  line_amount: number | null;
  ssim_score: number | null;
  ssim_pass: boolean | null;
  verification_hash: string | null;
  tickets: unknown;
};

export default async function AccountsLineItemsPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const { data: raw } = await supabase
    .from('bill_line_items')
    .select(
      `
      id,
      bill_id,
      ticket_id,
      work_type,
      area_sqm,
      rate_per_unit,
      line_amount,
      ssim_score,
      ssim_pass,
      verification_hash,
      tickets ( ticket_ref, assigned_contractor, assigned_mukadam )
    `
    )
    .order('created_at', { ascending: false })
    .limit(500);

  const lineItems = ((raw || []) as unknown as RawLineItem[]).filter((row) =>
    isContractorExecutedTicket(normalizeTicketJoin(row.tickets))
  );

  const totalItems = lineItems.length;
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.line_amount || 0), 0);
  const avgSsim =
    totalItems > 0
      ? lineItems.reduce((sum, item) => sum + (item.ssim_score || 0), 0) / totalItems
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Line Item Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scrutinize contractor-executed bill lines while keeping the XOR execution rule intact.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <KpiCard label="XOR-Compliant Rows" value={totalItems} icon="toc" />
        <KpiCard label="Cumulative Liability" value={formatINR(totalAmount)} icon="account_balance" />
        <KpiCard label="Average SSIM Score" value={`${(avgSsim * 100).toFixed(1)}%`} icon="memory" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-headline font-black text-primary">Granular Execution Verification</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Work Ref</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3 text-right">Area (m²)</th>
                <th className="px-4 py-3 text-right">Norm Rate</th>
                <th className="px-4 py-3 text-right">Liability</th>
                <th className="px-4 py-3 text-center">Visual Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {lineItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No compliant line items extracted.
                  </td>
                </tr>
              )}
              {lineItems.map((row) => {
                const ticket = normalizeTicketJoin(row.tickets);
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-medium text-primary">
                      {ticket?.ticket_ref || row.ticket_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.work_type}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">{row.area_sqm ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatINR(row.rate_per_unit || 0)}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-800">{formatINR(row.line_amount || 0)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`material-symbols-outlined ${
                            row.ssim_pass ? 'text-emerald-500' : 'text-red-500'
                          }`}
                          style={{ fontSize: 18 }}
                        >
                          {row.ssim_pass ? 'verified' : 'cancel'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400" title={row.verification_hash || ''}>
                          SSIM: {(row.ssim_score || 0).toFixed(3)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
