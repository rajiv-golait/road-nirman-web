/**
 * SSIM service integration contract (Sprint 1 groundwork).
 *
 * Flow: Flutter uploads before/after to Supabase Storage → enqueue job (Edge Function,
 * database webhook, or message queue) → Python SSIM worker reads signed URLs → writes
 * ssim_score, ssim_pass (inverse: score < 0.75), verification_hash on tickets / bill_line_items.
 *
 * Worker response shape (JSON):
 */
export interface SsimJobPayload {
  ticket_id: string;
  line_item_id?: string;
  before_storage_path: string;
  after_storage_path: string;
  correlation_id: string;
}

export interface SsimJobResult {
  correlation_id: string;
  ticket_id: string;
  line_item_id?: string;
  ssim_score: number;
  /** Inverse semantics — same as DB: true when score < SSIM_INVERSE_PASS_THRESHOLD */
  ssim_pass: boolean;
  verification_hash: string;
  error?: string;
}
