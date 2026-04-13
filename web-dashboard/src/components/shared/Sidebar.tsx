'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/constants/roles';
import { ROLE_CAPABILITIES } from '@/lib/constants/roles';
import type { Profile, Zone } from '@/lib/types/database';
import { LogoutButton } from '@/components/shared/LogoutButton';

interface SidebarProps {
  navItems: NavItem[];
  profile: Profile | null;
  zone: Zone | null;
  roleSlug: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ navItems, profile, zone, roleSlug, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const capabilities = ROLE_CAPABILITIES[roleSlug];
  const isDark = capabilities?.isDarkTheme;

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose?.();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] shrink-0 flex-col transition-transform duration-300 ease-in-out md:sticky md:inset-y-auto md:left-auto md:top-0 md:z-20 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isDark ? 'bg-slate-950' : 'bg-[#0B1628]'
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-7 pb-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-600 flex items-center justify-center text-white shadow-lg shadow-accent/25">
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                  engineering
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-black uppercase text-white tracking-tight text-lg leading-none">
                  रोड NIRMAN
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-[0.2em] mt-0.5">
                  Solapur MC
                </span>
              </div>
            </div>

            {/* User Badge — premium glassmorphism */}
            <div className={cn(
              'p-3 rounded-xl flex items-center gap-3 w-full',
              'bg-white/[0.04] border border-white/[0.06] backdrop-blur-sm'
            )}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white font-headline font-black text-xs">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-xs truncate">
                  {profile?.full_name || 'Loading...'}
                </p>
                <p className="text-slate-500 text-[10px] truncate">
                  {zone ? zone.name : profile?.designation || ''}
                </p>
              </div>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="md:hidden mt-1 text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-md"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 mt-3 overflow-y-auto px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== `/${roleSlug}` && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'nav-item rounded-lg mx-0 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                  isActive && 'active'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'material-symbols-outlined transition-colors',
                    isActive ? 'text-accent' : ''
                  )}
                  style={{ fontSize: 20 }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.05] space-y-3">
          <LogoutButton variant="sidebar" />
          <div>
            <p className="text-[9px] text-slate-600 uppercase tracking-[0.15em] font-bold">
              {capabilities?.dashboardTitle}
            </p>
            <p className="text-[8px] text-slate-700 mt-0.5">
              v1.0.0 · Production
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
