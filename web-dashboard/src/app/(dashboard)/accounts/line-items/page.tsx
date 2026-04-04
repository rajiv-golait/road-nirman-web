import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { isContractorExecutedTicket } from '@/lib/billing-queries';

export default async function AccountsLineItemsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

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

  const ticketRow = (r: { tickets: unknown }) => {
    const t = r.tickets;
    const one = Array.isArray(t) ? t[0] : t;
    return one as { ticket_ref?: string; assigned_contractor: string | null; assigned_mukadam: string | null } | null;
  };

  const rows =
    raw
      ?.filter((r) => isContractorExecutedTicket(ticketRow(r)))
      .map((r) => ({
        ticket_ref: ticketRow(r)?.ticket_ref || r.ticket_id,
        work_type: r.work_type,
        area_sqm: r.area_sqm,
        rate_per_unit: r.rate_per_unit,
        line_amount: r.line_amount,
        ssim_score: r.ssim_score,
        ssim_pass: r.ssim_pass,
        hash: r.verification_hash,
      })) || [];

  return (
    <DataReportLayout
      title="Line item review"
      subtitle="Contractor-executed bill lines only (XOR rule)."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'work_type', label: 'Work' },
        { key: 'area_sqm', label: 'Area (sqm)', align: 'right' },
        { key: 'rate_per_unit', label: 'Rate', align: 'right' },
        { key: 'line_amount', label: 'Amount', align: 'right' },
        { key: 'ssim_score', label: 'SSIM', align: 'right' },
        { key: 'ssim_pass', label: 'Pass', align: 'center' },
        { key: 'hash', label: 'Hash' },
      ]}
      rows={rows}
    />
  );
}
