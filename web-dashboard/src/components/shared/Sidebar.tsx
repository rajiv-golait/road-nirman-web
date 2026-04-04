'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/constants/roles';
import { ROLE_CAPABILITIES } from '@/lib/constants/roles';
import type { Profile, Zone } from '@/lib/types/database';

interface SidebarProps {
  navItems: NavItem[];
  profile: Profile | null;
  zone: Zone | null;
  roleSlug: string;
}

export function Sidebar({ navItems, profile, zone, roleSlug }: SidebarProps) {
  const pathname = usePathname();
  const capabilities = ROLE_CAPABILITIES[roleSlug];
  const isDark = capabilities?.isDarkTheme;

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen w-64 shrink-0 transition-all duration-200 ease-in-out',
        isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-900 text-slate-300'
      )}
    >
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              engineering
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-black uppercase text-white tracking-tight text-lg leading-none">
              रोड NIRMAN
            </span>
            <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">
              Solapur MC
            </span>
          </div>
        </div>

        {/* User Badge */}
        <div className={cn(
          'p-3 rounded-xl flex items-center gap-3 border',
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-800/50 border-slate-700/50'
        )}>
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 18 }}>
              person
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs truncate">
              {profile?.full_name || 'Loading...'}
            </p>
            <p className="text-slate-500 text-[10px]">
              {zone ? zone.name : profile?.designation || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 mt-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== `/${roleSlug}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('nav-item', isActive && 'active')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-800">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">
          {capabilities?.dashboardTitle}
        </p>
      </div>
    </aside>
  );
}
