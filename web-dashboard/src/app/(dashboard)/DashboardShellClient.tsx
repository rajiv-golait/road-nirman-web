'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/shared/Sidebar';
import { TopBar } from '@/components/shared/TopBar';
import { ROLE_NAV, ROLE_CAPABILITIES } from '@/lib/constants/roles';
import { cn } from '@/lib/utils';
import type { Profile, Zone } from '@/lib/types/database';

// Map role DB values to URL slugs
function roleToSlug(role: string): string {
  const map: Record<string, string> = {
    je: 'je',
    ae: 'ae',
    de: 'de',
    ee: 'ee',
    assistant_commissioner: 'assistant-commissioner',
    city_engineer: 'city-engineer',
    commissioner: 'commissioner',
    accounts: 'accounts',
    standing_committee: 'standing-committee',
    super_admin: 'admin',
  };
  return map[role] || role;
}

// Get role slug from current URL
function slugFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  // Handle multi-segment slugs like "assistant-commissioner"
  if (segments[0] === 'assistant-commissioner') return 'assistant-commissioner';
  if (segments[0] === 'city-engineer') return 'city-engineer';
  if (segments[0] === 'standing-committee') return 'standing-committee';
  return segments[0] || '';
}

interface DashboardShellClientProps {
  profile: Profile;
  zone: Zone | null;
  children: React.ReactNode;
}

export function DashboardShellClient({ profile, zone, children }: DashboardShellClientProps) {
  const pathname = usePathname();
  const currentSlug = slugFromPath(pathname);
  const roleSlug = roleToSlug(profile.role);

  // For super_admin, use the current page's slug for nav; otherwise use their role slug
  const activeSlug = profile.role === 'super_admin' ? currentSlug : roleSlug;
  const navItems = ROLE_NAV[activeSlug] || ROLE_NAV[roleSlug] || [];
  const capabilities = ROLE_CAPABILITIES[activeSlug] || ROLE_CAPABILITIES[roleSlug];

  return (
    <div className={cn(
      'flex min-h-screen overflow-hidden',
      capabilities?.isDarkTheme && 'war-room'
    )}>
      <Sidebar
        navItems={navItems}
        profile={profile}
        zone={zone}
        roleSlug={activeSlug}
      />

      <div className={cn(
        'flex-1 flex flex-col overflow-y-auto',
        capabilities?.isDarkTheme ? 'bg-warroom-bg' : 'bg-surface'
      )}>
        <TopBar
          title={capabilities?.dashboardTitle || 'Dashboard'}
          roleSlug={activeSlug}
        />

        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
