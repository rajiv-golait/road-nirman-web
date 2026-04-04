import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StatusPill, SeverityBadge } from '@/components/shared/DataDisplay';
import { timeAgo } from '@/lib/utils';

export default async function AEEscalationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('zone_id').eq('id', user.id).single();
  if (!profile?.zone_id) return null;

  const { data: rules } = await supabase
    .from('escalation_rules')
    .select('rule_number, rule_name, trigger_hours, escalate_to_role')
    .order('rule_number');

  const { data: zoneTickets } = await supabase
    .from('tickets')
    .select('id, ticket_ref, road_name, address_text, status, severity_tier, created_at, escalation_count, job_order_ref, sla_breach')
    .eq('zone_id', profile.zone_id)
    .not('status', 'in', '("resolved","rejected")')
    .order('created_at', { ascending: true });

  const all = zoneTickets || [];
  const ruleByNumber = new Map((rules || []).map((rule) => [rule.rule_number, rule]));
  const rule1Hours = ruleByNumber.get(1)?.trigger_hours ?? 4;
  const rule2Hours = ruleByNumber.get(2)?.trigger_hours ?? 48;
  const rule3Hours = ruleByNumber.get(3)?.trigger_hours ?? 120;

  const rule1Threshold = new Date(Date.now() - rule1Hours * 60 * 60 * 1000);
  const rule2Threshold = new Date(Date.now() - rule2Hours * 60 * 60 * 1000);
  const rule3Threshold = new Date(Date.now() - rule3Hours * 60 * 60 * 1000);

  const rule1Candidates = all.filter((ticket) => ticket.status === 'open' && new Date(ticket.created_at) < rule1Threshold);
  const rule2Visible = all.filter((ticket) => ticket.status === 'open' && new Date(ticket.created_at) < rule2Threshold);
  const rule3Visible = all.filter((ticket) => ticket.status === 'verified' && !ticket.job_order_ref && new Date(ticket.created_at) < rule3Threshold);
  const alreadyEscalated = all.filter((ticket) => ticket.status === 'escalated');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-black text-primary">Active Escalations</h1>
        <p className="text-sm text-slate-500 mt-1">AE-owned Rule 1 supervision plus visibility into higher-rule escalation pressure in your zone</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${rule1Candidates.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined ${rule1Candidates.length > 0 ? 'text-red-600' : 'text-green-600'}`} style={{ fontSize: 20 }}>
              {rule1Candidates.length > 0 ? 'error' : 'check_circle'}
            </span>
            <div>
              <p className="text-xs font-black text-slate-800">Rule 1 - AE-owned ({rule1Hours}h)</p>
              <p className="text-[10px] text-slate-500">Tickets still in Received beyond the JE acknowledgement window</p>
            </div>
          </div>
          <p className={`text-2xl font-headline font-black ${rule1Candidates.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {rule1Candidates.length} {rule1Candidates.length === 1 ? 'candidate' : 'candidates'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${rule2Visible.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined ${rule2Visible.length > 0 ? 'text-amber-600' : 'text-slate-500'}`} style={{ fontSize: 20 }}>
              {rule2Visible.length > 0 ? 'visibility' : 'check_circle'}
            </span>
            <div>
              <p className="text-xs font-black text-slate-800">Rule 2 - DE visibility ({rule2Hours}h)</p>
              <p className="text-[10px] text-slate-500">Open tickets that are now in the Deputy Engineer escalation window</p>
            </div>
          </div>
          <p className={`text-2xl font-headline font-black ${rule2Visible.length > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
            {rule2Visible.length} visible
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${rule3Visible.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`material-symbols-outlined ${rule3Visible.length > 0 ? 'text-amber-600' : 'text-slate-500'}`} style={{ fontSize: 20 }}>
              {rule3Visible.length > 0 ? 'visibility' : 'check_circle'}
            </span>
            <div>
              <p className="text-xs font-black text-slate-800">Rule 3 - EE visibility ({rule3Hours}h)</p>
              <p className="text-[10px] text-slate-500">Verified tickets without a work order in the Executive Engineer window</p>
            </div>
          </div>
          <p className={`text-2xl font-headline font-black ${rule3Visible.length > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
            {rule3Visible.length} visible
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>rule</span>
          <h2 className="text-sm font-headline font-extrabold text-primary">Zone Escalation Rules Reference</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Rule</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Trigger</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Hours</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-500">Escalates To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(rules || []).map((rule) => (
              <tr key={rule.rule_number} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs font-black text-primary">Rule {rule.rule_number}</td>
                <td className="px-4 py-3 text-xs font-bold text-slate-700">{rule.rule_name}</td>
                <td className="px-4 py-3 text-center text-xs font-mono font-bold text-accent">{rule.trigger_hours}h</td>
                <td className="px-4 py-3 text-xs text-slate-600">{rule.escalate_to_role || 'Auto'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-headline font-extrabold text-primary">Rule 1 Candidates ({rule1Candidates.length})</h2>
        </div>
        {rule1Candidates.length === 0 ? (
          <div className="p-8 text-center text-green-600">
            <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>verified</span>
            <p className="text-sm font-bold">All clear - No Rule 1 candidates in your zone</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rule1Candidates.map((ticket) => (
              <div key={ticket.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-mono font-bold text-primary">{ticket.ticket_ref}</p>
                    <p className="text-xs text-slate-600">{ticket.road_name || ticket.address_text || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
                  <StatusPill status={ticket.status} />
                  <span className="text-[10px] text-slate-400">{timeAgo(ticket.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-headline font-extrabold text-primary">Already Escalated Tickets ({alreadyEscalated.length})</h2>
        </div>
        {alreadyEscalated.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <span className="material-symbols-outlined mb-2 block" style={{ fontSize: 40 }}>priority_high</span>
            <p className="text-sm font-bold">No tickets are currently in escalated status</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alreadyEscalated.map((ticket) => (
              <div key={ticket.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-mono font-bold text-primary">{ticket.ticket_ref}</p>
                    <p className="text-xs text-slate-600">{ticket.road_name || ticket.address_text || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
                  <StatusPill status={ticket.status} />
                  <span className="text-[10px] text-slate-400">{timeAgo(ticket.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
