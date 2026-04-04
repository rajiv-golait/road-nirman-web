import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Ticket } from '@/lib/types/database';
import { ProofReviewClient } from './ProofReviewClient';

export default async function ProofReviewPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, ticket_ref, status, road_name, address_text, photo_before, photo_after, ssim_score, ssim_pass, verification_hash, updated_at')
    .in('status', ['audit_pending', 'resolved'])
    .order('updated_at', { ascending: false })
    .limit(200);

  return <ProofReviewClient tickets={(tickets || []) as unknown as Ticket[]} />;
}
