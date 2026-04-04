// ============================================================
// SSIM display rules (implementation_plan_web_dashboard.md §6.8)
// INVERSE semantics: structural similarity score < threshold ⇒ surface PASS
// (greater dissimilarity between before/after ⇒ repair actually happened)
// ============================================================

export const SSIM_INVERSE_PASS_THRESHOLD = 0.75;

/** Derive UI pass flag from numeric SSIM score when DB boolean is null. */
export function ssimPassFromScore(score: number | null | undefined): boolean | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  return score < SSIM_INVERSE_PASS_THRESHOLD;
}

/** Prefer stored ssim_pass; fall back to score-derived pass. */
export function resolveSsimPass(
  ssimPass: boolean | null | undefined,
  ssimScore: number | null | undefined
): boolean | null {
  if (ssimPass !== null && ssimPass !== undefined) return ssimPass;
  return ssimPassFromScore(ssimScore ?? null);
}

export function formatSsimScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return '—';
  return score.toFixed(2);
}
