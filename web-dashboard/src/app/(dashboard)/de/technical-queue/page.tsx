import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export default async function DETechnicalQueuePage() {
  async function escalateFromQueue(formData: FormData) {
    'use server';
    const ticketId = formData.get('ticketId');
    if (typeof ticketId !== 'string' || !ticketId) return;
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('tickets')
      .update({ status: 'escalated' })
      .eq('id', ticketId)
      .neq('status', 'escalated');
    revalidatePath('/de/technical-queue');
  }

  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  let q = supabase
    .from('tickets')
    .select('id, ticket_ref, status, damage_type, epdo_score, severity_tier, road_name, updated_at')
    .in('status', ['open', 'verified'])
    .order('epdo_score', { ascending: false })
    .limit(200);
  if (profile.zone_id) q = q.eq('zone_id', profile.zone_id);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows =
    data?.map((t) => ({
      ticket_ref: t.ticket_ref,
      status: t.status,
      damage: t.damage_type,
      epdo: t.epdo_score,
      severity: t.severity_tier,
      road: t.road_name,
      updated_at: t.updated_at,
      action: (
        <form action={escalateFromQueue}>
          <input type="hidden" name="ticketId" value={String(t.id ?? '')} />
          <button
            type="submit"
            className="rounded-md bg-error px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
          >
            Escalate
          </button>
        </form>
      ),
    })) || [];

  return (
    <DataReportLayout
      title="Technical queue"
      subtitle="Open / verified tickets sorted by EPDO for DE review."
      columns={[
        { key: 'ticket_ref', label: 'Ticket' },
        { key: 'status', label: 'Status' },
        { key: 'damage', label: 'Damage' },
        { key: 'epdo', label: 'EPDO', align: 'right' },
        { key: 'severity', label: 'Tier' },
        { key: 'road', label: 'Road' },
        { key: 'updated_at', label: 'Updated' },
        { key: 'action', label: 'Action', align: 'center' },
      ]}
      rows={rows}
    />
  );
}
