import { requireSuperAdmin } from '@/lib/admin/requireSuperAdmin';
import { DataReportLayout } from '@/components/dashboard/DataReportLayout';

export default async function AdminAuditLogsPage() {
  const { supabase } = await requireSuperAdmin();
  const { data: events } = await supabase
    .from('ticket_events')
    .select('id, ticket_id, event_type, old_status, new_status, actor_role, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(400);

  const rows = (events || []).map((e) => ({
    created_at: e.created_at,
    event_type: e.event_type,
    ticket_id: e.ticket_id,
    old_status: e.old_status,
    new_status: e.new_status,
    actor_role: e.actor_role,
    notes: e.notes,
  }));

  return (
    <DataReportLayout
      title="Audit logs"
      subtitle="Recent ticket_events stream (immutable trail)."
      columns={[
        { key: 'created_at', label: 'When' },
        { key: 'event_type', label: 'Event' },
        { key: 'ticket_id', label: 'Ticket' },
        { key: 'old_status', label: 'From' },
        { key: 'new_status', label: 'To' },
        { key: 'actor_role', label: 'Actor role' },
        { key: 'notes', label: 'Notes' },
      ]}
      rows={rows}
    />
  );
}
