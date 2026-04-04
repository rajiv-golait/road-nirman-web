'use client';

import { cn } from '@/lib/utils';

interface BudgetGaugeProps {
  label: string;
  consumed: number;
  total: number;
  formatValue?: (n: number) => string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BudgetGauge({
  label,
  consumed,
  total,
  formatValue = (n) => `₹${(n / 100000).toFixed(1)}L`,
  size = 'md',
  className,
}: BudgetGaugeProps) {
  const pct = total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0;
  const radius = size === 'sm' ? 36 : size === 'md' ? 48 : 64;
  const stroke = size === 'sm' ? 8 : size === 'md' ? 10 : 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const colorClass =
    pct > 80 ? 'text-red-500' : pct > 60 ? 'text-amber-500' : 'text-green-500';

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-44 h-44',
  };

  const valueSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        <svg className="transform -rotate-90 w-full h-full" viewBox={`0 0 ${radius * 2 + stroke * 2} ${radius * 2 + stroke * 2}`}>
          {/* Background circle */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn('transition-all duration-500', colorClass)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-headline font-black', valueSize[size])}>{pct}%</span>
          <span className="text-[9px] text-slate-500">{formatValue(consumed)}</span>
        </div>
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">{label}</p>
    </div>
  );
}

interface MiniBudgetGaugeProps {
  label: string;
  consumed: number;
  total: number;
  className?: string;
}

export function MiniBudgetGauge({ label, consumed, total, className }: MiniBudgetGaugeProps) {
  const pct = total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0;
  const colorClass =
    pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <span className="text-[10px] font-medium text-slate-500">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
