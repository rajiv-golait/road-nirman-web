'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type LogoutButtonProps = {
  variant: 'sidebar' | 'topbar';
  /** War-room / dark top bar */
  isDark?: boolean;
};

export function LogoutButton({ variant, isDark }: LogoutButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: 'global' });
    } catch {
      // Still navigate — session may be cleared server-side or user expects to leave
    } finally {
      window.location.href = '/login';
    }
  }

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors',
          'border border-white/[0.08] text-slate-300 hover:bg-white/[0.06] hover:text-white',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
        aria-busy={pending}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          logout
        </span>
        {pending ? 'Signing out…' : 'Log out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isDark
          ? 'text-slate-500 hover:text-white hover:bg-white/5'
          : 'text-slate-400 hover:text-primary hover:bg-primary-50',
        'disabled:opacity-50 disabled:pointer-events-none'
      )}
      aria-label={pending ? 'Signing out' : 'Log out'}
      aria-busy={pending}
      title="Log out"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        logout
      </span>
    </button>
  );
}
