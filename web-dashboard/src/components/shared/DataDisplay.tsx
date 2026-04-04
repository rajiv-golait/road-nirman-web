import { cn } from '@/lib/utils';
import type { TicketStatus, BillStatus, SeverityTier } from '@/lib/types/database';
import { STATUS_DISPLAY, STATUS_COLORS, STATUS_ICONS } from '@/lib/constants/status';
import { BILL_STATUS_DISPLAY, BILL_STATUS_COLORS, SEVERITY_COLORS } from '@/lib/constants/status';

// ============================================================
// KPI Card
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
    <div className={cn('kpi-card', className)}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', accentColor)} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-headline font-black text-primary">
              {value}
            </span>
            {trend && (
              <span className={cn(
                'text-xs font-bold',
                trend.positive ? 'text-success' : 'text-error'
              )}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <span className="material-symbols-outlined text-slate-300" style={{ fontSize: 28 }}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Status Pill
// ============================================================

interface StatusPillProps {
  status: TicketStatus;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const colors = STATUS_COLORS[status];
  return (
    <span className={cn('status-pill', colors.bg, colors.text, `border-${colors.text.replace('text-', '')}/20`, className)}>
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
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
      'px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded inline-flex items-center gap-1',
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
      'px-2 py-0.5 text-[9px] font-black uppercase rounded',
      colors.bg, colors.text, className
    )}>
      {BILL_STATUS_DISPLAY[status]}
    </span>
  );
}

// ============================================================
// Empty State
// ============================================================

interface EmptyStateProps {
  icon: string;
  message: string;
  className?: string;
}

export function EmptyState({ icon, message, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <span className="material-symbols-outlined text-slate-300 mb-3" style={{ fontSize: 48 }}>
        {icon}
      </span>
      <p className="text-sm text-slate-400 font-medium">{message}</p>
    </div>
  );
}

// ============================================================
// Loading Skeleton
// ============================================================

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-slate-200 rounded', className)} />
  );
}

export function KpiSkeleton() {
  return (
    <div className="kpi-card">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200" />
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

// ============================================================
// Export Button
// ============================================================

interface ExportButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function ExportButton({ label = 'Export CSV', onClick, className }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold rounded',
        'flex items-center gap-2 transition-colors active:scale-95',
        className
      )}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        download
      </span>
      {label}
    </button>
  );
}

// ============================================================
// Alert Banner (for escalation rules)
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
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border',
      variantStyles[variant],
      className
    )}>
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {icon || (variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'info')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{title}</p>
        <p className="text-[10px] opacity-80">{description}</p>
      </div>
      {count !== undefined && (
        <span className="text-lg font-headline font-black">{count}</span>
      )}
    </div>
  );
}
