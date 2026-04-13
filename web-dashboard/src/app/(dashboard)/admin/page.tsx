import Link from 'next/link';
import { ROLE_DISPLAY, ROLE_NAV } from '@/lib/constants/roles';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { KpiCard } from '@/components/shared/DataDisplay';

const DASHBOARD_CARDS = [
  { slug: 'je', icon: 'assignment', color: 'bg-blue-500' },
  { slug: 'ae', icon: 'groups', color: 'bg-indigo-500' },
  { slug: 'de', icon: 'engineering', color: 'bg-cyan-600' },
  { slug: 'ee', icon: 'location_city', color: 'bg-purple-600' },
  { slug: 'assistant-commissioner', icon: 'shield', color: 'bg-teal-600' },
  { slug: 'city-engineer', icon: 'architecture', color: 'bg-emerald-600' },
  { slug: 'commissioner', icon: 'stars', color: 'bg-slate-800' },
  { slug: 'accounts', icon: 'payments', color: 'bg-amber-600' },
  { slug: 'standing-committee', icon: 'gavel', color: 'bg-rose-600' },
];

const SLUG_TO_ROLE: Record<string, string> = {
  je: 'je',
  ae: 'ae',
  de: 'de',
  ee: 'ee',
  'assistant-commissioner': 'assistant_commissioner',
  'city-engineer': 'city_engineer',
  commissioner: 'commissioner',
  accounts: 'accounts',
  'standing-committee': 'standing_committee',
};

export default async function AdminDashboardPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase, profile } = ctx;

  // Defense-in-depth: verify super_admin role server-side
  if (profile?.role !== 'super_admin') return <DashboardGuard reason="forbidden" />;

  const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  const { count: totalTickets } = await supabase.from('tickets').select('id', { count: 'exact', head: true });
  const { data: recentEvents } = await supabase
    .from('ticket_events')
    .select('id, event_type, actor_role, old_status, new_status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Users" value={totalUsers ?? 0} accentColor="bg-primary" icon="group" />
        <KpiCard label="Total Tickets" value={totalTickets ?? 0} accentColor="bg-accent" icon="confirmation_number" />
        <KpiCard label="SSIM Threshold" value="0.75" accentColor="bg-blue-500" icon="tune" />
      </div>

      <div>
        <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>dashboard</span>
          Dashboard Switcher
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DASHBOARD_CARDS.map((card) => {
            const roleKey = SLUG_TO_ROLE[card.slug] || card.slug;
            const displayName = ROLE_DISPLAY[roleKey as keyof typeof ROLE_DISPLAY] || card.slug;
            const navCount = ROLE_NAV[card.slug]?.length || 0;

            return (
              <Link
                key={card.slug}
                href={`/${card.slug}`}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center shadow-lg`}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>{card.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{displayName}</p>
                    <p className="text-[10px] text-slate-400">{navCount} screens</p>
                  </div>
                </div>
                <div className="flex items-center text-accent text-xs font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open Dashboard
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-headline font-extrabold text-primary flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-accent" style={{ fontSize: 20 }}>history</span>
          Recent System Events
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Transition</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(recentEvents || []).map((event) => (
                <tr key={event.id}>
                  <td className="text-xs font-bold text-slate-700">{event.event_type}</td>
                  <td className="text-xs text-slate-500">{event.actor_role || '-'}</td>
                  <td className="text-xs">
                    {event.old_status && <span className="text-slate-400">{event.old_status}</span>}
                    {event.old_status && event.new_status && <span className="text-slate-300 mx-1">-&gt;</span>}
                    {event.new_status && <span className="text-primary font-bold">{event.new_status}</span>}
                  </td>
                  <td className="text-xs text-slate-400">
                    {new Date(event.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
