import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SeverityBadge, StatusPill } from '@/components/shared/DataDisplay';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils';
import JEHistoryDetailClient from './JEHistoryDetailClient';

export default async function JEHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('zone_id')
    .eq('id', user.id)
    .single();
  if (!profile?.zone_id) return null;

  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      id,
      ticket_ref,
      status,
      severity_tier,
      road_name,
      address_text,
      created_at,
      damage_type,
      work_type,
      dimensions,
      photo_before,
      photo_after,
      ssim_score,
      ssim_pass,
      verification_hash,
      zone:zone_id (name)
    `)
    .eq('id', id)
    .eq('zone_id', profile.zone_id)
    .single();

  if (!ticket) notFound();

  const { data: events } = await supabase
    .from('ticket_events')
    .select('id, event_type, old_status, new_status, notes, created_at, actor_id')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  const { data: billingLineItems } = await supabase
    .from('bill_line_items')
    .select('id')
    .eq('ticket_id', id);

  const zoneRecord = Array.isArray(ticket.zone) ? ticket.zone[0] : ticket.zone;
  const billingCount = billingLineItems?.length || 0;
  const billingSummary = billingCount > 0 ? `${billingCount} line item${billingCount > 1 ? 's' : ''}` : 'Not billed';
  const photos = [
    ...(Array.isArray(ticket.photo_before)
      ? ticket.photo_before
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .map((storagePath, index) => ({
            id: `${ticket.id}-before-${index + 1}`,
            photo_type: 'before' as const,
            storage_path: storagePath,
            created_at: ticket.created_at,
            metadata: {
              source: 'ticket.photo_before',
            },
          }))
      : []),
    ...(ticket.photo_after
      ? [
          {
            id: `${ticket.id}-after-1`,
            photo_type: 'after' as const,
            storage_path: ticket.photo_after,
            created_at: ticket.created_at,
            metadata: {
              source: 'ticket.photo_after',
            },
          },
        ]
      : []),
  ];
  const ssimResults =
    typeof ticket.ssim_score === 'number'
      ? {
          id: `${ticket.id}-ssim`,
          score: ticket.ssim_score,
          result: ticket.ssim_pass ? ('pass' as const) : ('fail' as const),
          details: {
            verification_hash: ticket.verification_hash || 'Unavailable',
            source: 'ticket fields',
          },
          created_at: ticket.created_at,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/je/history" className="flex items-center gap-1 hover:text-primary">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          History
        </Link>
        <span>/</span>
        <span className="font-mono text-slate-700">{ticket.ticket_ref}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="text-lg font-bold font-mono text-primary">{ticket.ticket_ref}</span>
              <StatusPill status={ticket.status} />
              {ticket.severity_tier && <SeverityBadge tier={ticket.severity_tier} />}
            </div>
            <h1 className="text-xl font-headline font-extrabold text-slate-800">
              {ticket.road_name || ticket.address_text || 'Unknown Location'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Zone: {zoneRecord?.name || '-'} | Created {timeAgo(ticket.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {ticket.ssim_pass !== null && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-2 ${ticket.ssim_pass ? 'bg-green-50' : 'bg-red-50'}`}>
                <span
                  className={`material-symbols-outlined ${ticket.ssim_pass ? 'text-green-600' : 'text-red-500'}`}
                  style={{ fontSize: 24 }}
                >
                  {ticket.ssim_pass ? 'verified' : 'cancel'}
                </span>
                <div>
                  <p className={`text-xs font-bold uppercase ${ticket.ssim_pass ? 'text-green-700' : 'text-red-700'}`}>
                    SSIM {ticket.ssim_pass ? 'Passed' : 'Failed'}
                  </p>
                  {ssimResults?.score && (
                    <p className="text-sm font-headline font-black text-slate-700">
                      Score: {(ssimResults.score * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 md:grid-cols-4">
          <QuickStat label="Damage Type" value={ticket.damage_type || '-'} icon="category" />
          <QuickStat label="Work Type" value={ticket.work_type || '-'} icon="construction" />
          <QuickStat
            label="Area"
            value={ticket.dimensions?.area_sqm ? `${ticket.dimensions.area_sqm} sqm` : '-'}
            icon="straighten"
          />
          <QuickStat label="Billing" value={billingSummary} icon="payments" />
        </div>
      </div>

      <JEHistoryDetailClient
        ticket={ticket}
        events={(events || []).map((event) => ({
          ...event,
          performed_by: event.actor_id,
        }))}
        photos={photos || []}
        ssimResults={ssimResults || null}
      />
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 20 }}>
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
