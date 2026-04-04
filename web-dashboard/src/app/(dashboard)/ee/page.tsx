import type { ContractorMetrics, Ticket, Zone } from '@/lib/types/database';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EEDashboardClient } from './EEDashboardClient';

interface TechnicalReviewTicket {
  id: string;
  ticket_ref: string;
  road_name: string | null;
  zone_id: number | null;
  approval_tier: 'moderate' | 'major';
  estimated_cost: number | null;
  status: Ticket['status'];
  job_order_ref: string | null;
  created_at: string;
  updated_at: string;
}

export default async function EEDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, name_marathi, key_areas, annual_road_budget, budget_consumed, centroid_lat, centroid_lng')
    .order('id');
  const { data: rawTickets } = await supabase
    .from('tickets')
    .select('id, status, zone_id, sla_breach, ssim_pass, severity_tier, assigned_contractor');
  const { data: contractors } = await supabase
    .from('contractor_metrics')
    .select('contractor_id, total_completed, ssim_pass_rate, reopen_rate, quality_index')
    .order('quality_index', { ascending: false });

  const technicalQueueFields =
    'id, ticket_ref, road_name, zone_id, approval_tier, estimated_cost, status, job_order_ref, created_at, updated_at';

  const [{ data: verifiedNeedsReview }, { data: escalatedNeedsReview }] = await Promise.all([
    supabase
      .from('tickets')
      .select(technicalQueueFields)
      .in('approval_tier', ['moderate', 'major'])
      .eq('status', 'verified')
      .is('job_order_ref', null)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('tickets')
      .select(technicalQueueFields)
      .in('approval_tier', ['moderate', 'major'])
      .eq('status', 'escalated')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const queueMap = new Map<string, TechnicalReviewTicket>();
  for (const row of [...(verifiedNeedsReview || []), ...(escalatedNeedsReview || [])]) {
    queueMap.set(row.id, row as TechnicalReviewTicket);
  }

  return (
    <EEDashboardClient
      zones={(zones || []) as Zone[]}
      initialTickets={(rawTickets || []) as Ticket[]}
      contractors={(contractors || []) as ContractorMetrics[]}
      initialQueue={Array.from(queueMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )}
    />
  );
}
