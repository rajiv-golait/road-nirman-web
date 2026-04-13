import { SeverityBadge, StatusPill } from '@/components/shared/DataDisplay';
import { getZoneScopedContext } from '@/lib/dashboard/viewerContext';
import { timeAgo } from '@/lib/utils';
import { DashboardGuard } from '@/components/shared/DashboardGuard';

export default async function JEHistoryPage() {
  const ctx = await getZoneScopedContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_ref, road_name, address_text, severity_tier, status, ssim_pass, updated_at')
    .eq('zone_id', profile.zone_id)
    .in('status', ['resolved', 'rejected', 'cross_assigned'])
    .order('updated_at', { ascending: false })
    .limit(100);

  const closedTickets = tickets || [];
  const closedIds = closedTickets.map((ticket) => ticket.id);

  const { data: eventsData } =
    closedIds.length > 0
      ? await supabase
          .from('ticket_events')
          .select('id, event_type, old_status, new_status, notes, created_at')
          .in('ticket_id', closedIds)
          .order('created_at', { ascending: false })
          .limit(100)
      : { data: [] as never[] };

  const events = eventsData ?? [];
  const resolved = closedTickets.filter((ticket) => ticket.status === 'resolved').length;
  const rejected = closedTickets.filter((ticket) => ticket.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-headline font-black text-primary">History Log</h1>
          <p className="mt-1 text-sm text-slate-500">Closed and resolved tickets from your zone</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 font-bold text-green-600">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {resolved} Resolved
          </span>
          <span className="flex items-center gap-1.5 font-bold text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {rejected} Rejected
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>history</span>
              <h2 className="text-sm font-headline font-extrabold text-primary">Closed Tickets</h2>
            </div>
            {closedTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>history</span>
                <p className="text-sm">No closed tickets yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Ref</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Location</th>
                      <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Severity</th>
                      <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">Status</th>
                      <th className="px-4 py-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500">SSIM</th>
                      <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">Closed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closedTickets.map((ticket) => (
                      <tr key={ticket.id} className="group transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <a href={`/je/history/${ticket.id}`} className="flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline">
                            {ticket.ticket_ref}
                            <span className="material-symbols-outlined text-slate-400 opacity-0 group-hover:opacity-100" style={{ fontSize: 14 }}>
                              open_in_new
                            </span>
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/je/history/${ticket.id}`} className="max-w-[160px] truncate text-xs font-bold text-slate-800 transition-colors hover:text-primary">
                            {ticket.road_name || ticket.address_text || '-'}
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <StatusPill status={ticket.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {ticket.ssim_pass !== null ? (
                            <span className={`material-symbols-outlined text-sm ${ticket.ssim_pass ? 'text-green-600' : 'text-red-500'}`}>
                              {ticket.ssim_pass ? 'verified' : 'cancel'}
                            </span>
                          ) : <span className="text-xs text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[10px] font-medium text-slate-400">
                          {timeAgo(ticket.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>event_note</span>
                <h2 className="text-sm font-headline font-extrabold text-primary">Audit Trail</h2>
              </div>
              <p className="mt-1 pl-7 text-[10px] text-slate-400">Events for the closed tickets in this list (zone-scoped working set).</p>
            </div>
            <div className="max-h-[600px] divide-y divide-slate-100 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-accent" style={{ fontSize: 16 }}>
                      {event.event_type === 'status_change' ? 'swap_horiz' : event.event_type === 'escalation' ? 'priority_high' : event.event_type === 'assignment' ? 'assignment_ind' : 'event'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold capitalize text-slate-800">{event.event_type?.replace(/_/g, ' ')}</p>
                      {event.old_status && event.new_status && (
                        <p className="text-[10px] text-slate-500">
                          {event.old_status} -&gt; <span className="font-bold text-primary">{event.new_status}</span>
                        </p>
                      )}
                      {event.notes && <p className="mt-0.5 truncate text-[10px] text-slate-400">{event.notes}</p>}
                      <p className="mt-1 text-[9px] text-slate-400">{timeAgo(event.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="p-6 text-center text-sm text-slate-400">No events logged yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
