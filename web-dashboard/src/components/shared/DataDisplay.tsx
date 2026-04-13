import { cn } from '@/lib/utils';
import type { TicketStatus, BillStatus, SeverityTier } from '@/lib/types/database';
import { STATUS_DISPLAY, STATUS_COLORS, STATUS_ICONS } from '@/lib/constants/status';
import { BILL_STATUS_DISPLAY, BILL_STATUS_COLORS, SEVERITY_COLORS } from '@/lib/constants/status';

// ============================================================
// KPI Card — premium card with accent bar + hover micro-animation
// ============================================================

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
  icon?: string;
  className?: string;
}

export function KpiCard({ label, value, trend, accentColor = 'bg-accent', icon, className }: KpiCardProps) {
  return (
    <div className={cn('kpi-card group', className)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-r-full', accentColor)} />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 tracking-[0.08em] uppercase mb-1.5">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-headline font-black text-primary tracking-tight">
              {value}
            </span>
            {trend && (
              <span className={cn(
                'text-[11px] font-bold flex items-center gap-0.5',
                trend.positive ? 'text-success' : 'text-error'
              )}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {trend.positive ? 'trending_up' : 'trending_down'}
                </span>
                {trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-400 transition-colors" style={{ fontSize: 22 }}>
              {icon}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Status Pill — compact, accessible
// ============================================================

interface StatusPillProps {
  status: TicketStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const colors = STATUS_COLORS[status];
  return (
    <span className={cn('status-pill', colors.bg, colors.text, className)}
      style={{ borderColor: 'currentColor', borderWidth: 1, borderStyle: 'solid', opacity: 0.9 }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
        {STATUS_ICONS[status]}
      </span>
      {STATUS_DISPLAY[status]}
    </span>
  );
}

// ============================================================
// Severity Badge
// ============================================================

interface SeverityBadgeProps {
  tier: SeverityTier;
  showLabel?: boolean;
  className?: string;
}

export function SeverityBadge({ tier, showLabel = true, className }: SeverityBadgeProps) {
  const colors = SEVERITY_COLORS[tier];
  return (
    <span className={cn(
      'px-2.5 py-1 text-[9px] font-black uppercase tracking-tight rounded-md inline-flex items-center gap-1',
      colors.bg, colors.text, className
    )}>
      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
        {tier === 'CRITICAL' ? 'error' : tier === 'HIGH' ? 'warning' : 'info'}
      </span>
      {showLabel ? tier : null}
    </span>
  );
}

// ============================================================
// Bill Status Pill
// ============================================================

interface BillStatusPillProps {
  status: BillStatus;
  className?: string;
}

export function BillStatusPill({ status, className }: BillStatusPillProps) {
  const colors = BILL_STATUS_COLORS[status];
  return (
    <span className={cn(
      'px-2.5 py-1 text-[9px] font-black uppercase rounded-md',
      colors.bg, colors.text, className
    )}>
      {BILL_STATUS_DISPLAY[status]}
    </span>
  );
}

// ============================================================
// Empty State — refined with subtle illustration feel
// ============================================================

interface EmptyStateProps {
  icon: string;
  message: string;
  className?: string;
}

export function EmptyState({ icon, message, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 32 }}>
          {icon}
        </span>
      </div>
      <p className="text-sm text-slate-400 font-medium max-w-xs">{message}</p>
    </div>
  );
}

// ============================================================
// Loading Skeleton — smooth shimmer effect
// ============================================================

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('shimmer rounded', className)} />
  );
}

export function KpiSkeleton() {
  return (
    <div className="kpi-card">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 rounded-r-full" />
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

// ============================================================
// Export Button — refined with hover state
// ============================================================

interface ExportButtonProps {
  label?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function ExportButton({ label = 'Export CSV', onClick, href, className }: ExportButtonProps) {
  const classes = cn(
    'px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg',
    'flex items-center gap-2 transition-all duration-200 active:scale-[0.97] border border-slate-200/80',
    'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
    className
  );

  if (href) {
    return (
      <a href={href} download className={classes}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          download
        </span>
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        download
      </span>
      {label}
    </button>
  );
}

// ============================================================
// Alert Banner — refined with icon background
// ============================================================

interface AlertBannerProps {
  variant: 'warning' | 'error' | 'info';
  icon?: string;
  title: string;
  description: string;
  count?: number;
  className?: string;
}

export function AlertBanner({ variant, icon, title, description, count, className }: AlertBannerProps) {
  const variantStyles = {
    warning: 'bg-amber-50 border-amber-200/80 text-amber-800',
    error: 'bg-red-50 border-red-200/80 text-red-800',
    info: 'bg-blue-50 border-blue-200/80 text-blue-800',
  };
  const iconBg = {
    warning: 'bg-amber-100',
    error: 'bg-red-100',
    info: 'bg-blue-100',
  };

  return (
    <div className={cn(
      'flex items-center gap-4 px-5 py-4 rounded-xl border',
      variantStyles[variant],
      className
    )}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', iconBg[variant])}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          {icon || (variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'info')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] opacity-80 mt-0.5">{description}</p>
      </div>
      {count !== undefined && (
        <span className="text-xl font-headline font-black">{count}</span>
      )}
    </div>
  );
}
