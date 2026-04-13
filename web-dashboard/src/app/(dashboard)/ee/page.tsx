import type { ContractorMetrics, Ticket, Zone } from '@/lib/types/database';
import { getViewerContext } from '@/lib/dashboard/viewerContext';
import { DashboardGuard } from '@/components/shared/DashboardGuard';
import { EEDashboardClient } from './EEDashboardClient';
import {
  fetchEETechnicalReviewQueue,
  fetchWarrantyWatchTickets,
} from '@/lib/dashboard/eeTechnicalReview';

export default async function EEDashboardPage() {
  const ctx = await getViewerContext();
  if (!ctx.ok) return <DashboardGuard reason={ctx.reason} />;
  const { supabase } = ctx;

  const [
    { data: zones, error: zonesError },
    { data: rawTickets, error: rawTicketsError },
    { data: contractors, error: contractorsError },
    initialQueue,
    initialWarrantyWatch,
  ] =
    await Promise.all([
      supabase
        .from('zones')
        .select('id, name, name_marathi, key_areas, annual_road_budget, budget_consumed, centroid_lat, centroid_lng')
        .order('id'),
      supabase
        .from('tickets')
        .select('id, status, zone_id, sla_breach, ssim_pass, severity_tier, assigned_contractor'),
      supabase
        .from('contractor_metrics')
        .select('contractor_id, total_completed, ssim_pass_rate, reopen_rate, quality_index')
        .order('quality_index', { ascending: false }),
      fetchEETechnicalReviewQueue(
        supabase as unknown as Parameters<typeof fetchEETechnicalReviewQueue>[0]
      ),
      fetchWarrantyWatchTickets(
        supabase as unknown as Parameters<typeof fetchWarrantyWatchTickets>[0]
      ),
    ]);

  if (zonesError) throw new Error(zonesError.message);
  if (rawTicketsError) throw new Error(rawTicketsError.message);
  if (contractorsError) throw new Error(contractorsError.message);

  return (
    <EEDashboardClient
      zones={(zones || []) as Zone[]}
      initialTickets={(rawTickets || []) as Ticket[]}
      contractors={(contractors || []) as ContractorMetrics[]}
      initialQueue={initialQueue}
      initialWarrantyWatch={initialWarrantyWatch}
    />
  );
}
