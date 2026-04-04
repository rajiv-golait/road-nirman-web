'use client';

import { formatSsimScore, resolveSsimPass } from '@/lib/ssim';
import { cn } from '@/lib/utils';

interface SsimIndicatorProps {
  score: number | null | undefined;
  pass: boolean | null | undefined;
  compact?: boolean;
  className?: string;
}

export function SsimIndicator({ score, pass, compact, className }: SsimIndicatorProps) {
  const resolved = resolveSsimPass(pass, score);
  const label =
    resolved === null ? 'Pending' : resolved ? 'Pass' : 'Fail';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold',
        resolved === true && 'text-green-600',
        resolved === false && 'text-red-600',
        resolved === null && 'text-slate-400',
        className
      )}
      title="SSIM: inverse rule — score &lt; 0.75 = pass (repair changed surface)"
    >
      <span className="text-xs">{formatSsimScore(score)}</span>
      {!compact && (
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {resolved === true ? 'verified' : resolved === false ? 'warning' : 'help'}
        </span>
      )}
      {!compact && <span className="text-[9px] uppercase tracking-tight">{label}</span>}
    </span>
  );
}
