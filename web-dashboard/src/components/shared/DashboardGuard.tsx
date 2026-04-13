import Link from 'next/link';

export type GuardReason = 'no_session' | 'no_profile' | 'no_zone' | 'forbidden' | 'query_error';

const GUARD_CONFIG: Record<
  GuardReason,
  { icon: string; title: string; description: string; action?: { label: string; href: string } }
> = {
  no_session: {
    icon: 'lock',
    title: 'Session Expired',
    description: 'Your session has expired or could not be verified. Please sign in again to continue.',
    action: { label: 'Go to Login', href: '/login' },
  },
  no_profile: {
    icon: 'person_off',
    title: 'Profile Not Found',
    description: 'We could not find a profile linked to your account. Please contact your system administrator.',
    action: { label: 'Go to Login', href: '/login' },
  },
  no_zone: {
    icon: 'location_off',
    title: 'No Zone Assigned',
    description:
      'Your profile does not have a zone assignment. This dashboard requires zone-level data scoping. Contact your administrator to assign a zone.',
  },
  forbidden: {
    icon: 'block',
    title: 'Access Denied',
    description: 'You do not have the required permissions to view this dashboard.',
    action: { label: 'Return to Login', href: '/login' },
  },
  query_error: {
    icon: 'cloud_off',
    title: 'Unable to Load Data',
    description:
      'An error occurred while loading this page. This may be a temporary issue - please try refreshing.',
  },
};

interface DashboardGuardProps {
  reason: GuardReason;
  /** Optional override for the description text. */
  detail?: string;
}

export function DashboardGuard({ reason, detail }: DashboardGuardProps) {
  const config = GUARD_CONFIG[reason];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 32 }}>
            {config.icon}
          </span>
        </div>

        <div>
          <h2 className="text-lg font-headline font-black text-primary">{config.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{detail || config.description}</p>
        </div>

        {config.action && (
          <Link
            href={config.action.href}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary/90"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              arrow_back
            </span>
            {config.action.label}
          </Link>
        )}
      </div>
    </div>
  );
}
