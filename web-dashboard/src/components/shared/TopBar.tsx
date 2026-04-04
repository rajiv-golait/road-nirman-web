'use client';

import { cn } from '@/lib/utils';
import { ROLE_CAPABILITIES } from '@/lib/constants/roles';

interface TopBarProps {
  title: string;
  subtitle?: string;
  roleSlug: string;
  children?: React.ReactNode;
}

export function TopBar({ title, subtitle, roleSlug, children }: TopBarProps) {
  const capabilities = ROLE_CAPABILITIES[roleSlug];
  const isDark = capabilities?.isDarkTheme;

  return (
    <header
      className={cn(
        'w-full h-16 px-8 flex justify-between items-center border-b sticky top-0 z-10',
        isDark
          ? 'bg-warroom-surface border-warroom-border'
          : 'bg-white border-slate-200'
      )}
    >
      <div className="flex flex-col">
        <h1 className={cn(
          'font-headline font-bold text-lg',
          isDark ? 'text-white' : 'text-primary'
        )}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn(
            'text-[10px] italic',
            isDark ? 'text-slate-500' : 'text-slate-500'
          )}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {children}

        {/* Date chip */}
        <div className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium',
          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
        )}>
          {new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {/* Notifications */}
        <button className={cn(
          'material-symbols-outlined transition-colors',
          isDark
            ? 'text-slate-500 hover:text-white'
            : 'text-slate-500 hover:text-primary'
        )}>
          notifications
        </button>
      </div>
    </header>
  );
}
