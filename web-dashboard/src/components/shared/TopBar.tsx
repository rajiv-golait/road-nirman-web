'use client';

import { cn } from '@/lib/utils';
import { ROLE_CAPABILITIES } from '@/lib/constants/roles';
import { LogoutButton } from '@/components/shared/LogoutButton';

interface TopBarProps {
  title: string;
  subtitle?: string;
  roleSlug: string;
  onMenuClick?: () => void;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, roleSlug, onMenuClick, children }: TopBarProps) {
  const capabilities = ROLE_CAPABILITIES[roleSlug];
  const isDark = capabilities?.isDarkTheme;

  return (
    <header
      className={cn(
        'w-full h-16 px-4 md:px-8 flex justify-between items-center border-b sticky top-0 z-10',
        isDark
          ? 'bg-warroom-surface/95 border-warroom-border backdrop-blur-md'
          : 'bg-white/95 border-slate-200/80 backdrop-blur-md'
      )}
    >
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={onMenuClick}
          className={cn(
            'md:hidden p-2 -ml-2 rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
          )}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-col">
          <h1 className={cn(
            'font-headline font-extrabold text-lg tracking-tight',
            isDark ? 'text-white' : 'text-primary'
          )}>
            {title}
          </h1>
        {subtitle && (
          <p className={cn(
            'text-[10px]',
            isDark ? 'text-slate-500' : 'text-slate-400'
          )}>
            {subtitle}
          </p>
        )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {children}

        {/* Live indicator */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider',
          isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
        )}>
          <span className="relative flex h-2 w-2">
            <span className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              isDark ? 'bg-emerald-400' : 'bg-emerald-500'
            )} />
            <span className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              isDark ? 'bg-emerald-400' : 'bg-emerald-500'
            )} />
          </span>
          Live
        </div>

        {/* Date chip */}
        <div className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium',
          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
        )}>
          {new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {/* Notifications */}
        <button
          type="button"
          className={cn(
          'relative w-9 h-9 rounded-lg flex items-center justify-center transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isDark
            ? 'text-slate-500 hover:text-white hover:bg-white/5'
            : 'text-slate-400 hover:text-primary hover:bg-primary-50'
        )}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            notifications
          </span>
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full border-2 border-white" />
        </button>

        <LogoutButton variant="topbar" isDark={isDark} />
      </div>
    </header>
  );
}
