import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function CommissionerIncidentFeedPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('ticket_events')
    .select('created_at, event_type, ticket_id, old_status, new_status, actor_role, notes')
    .order('created_at', { ascending: false })
    .limit(400);

  const rows =
    data?.map((e) => ({
      at: e.created_at,
      type: e.event_type,
      ticket: e.ticket_id,
      from: e.old_status,
      to: e.new_status,
      role: e.actor_role,
      notes: e.notes,
    })) || [];

  return (
    <DataReportLayout
      title="Incident feed"
      subtitle="Read-only event stream (no actions — Commissioner is observational)."
      columns={[
        { key: 'at', label: 'When' },
        { key: 'type', label: 'Type' },
        { key: 'ticket', label: 'Ticket' },
        { key: 'from', label: 'From' },
        { key: 'to', label: 'To' },
        { key: 'role', label: 'Actor' },
        { key: 'notes', label: 'Notes' },
      ]}
      rows={rows}
    />
  );
}
