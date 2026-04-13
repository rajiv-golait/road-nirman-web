'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logDashboardError } from '@/lib/monitoring/logError';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    logDashboardError(error, {
      scope: 'dashboard-segment',
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-error" style={{ fontSize: 32 }}>
            error
          </span>
        </div>

        {/* Text */}
        <div>
          <h2 className="text-lg font-headline font-black text-primary">Something Went Wrong</h2>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            An error occurred while rendering this dashboard page. Your navigation and session are intact — you can try again or switch to a different page.
          </p>
        </div>

        {/* Error detail (dev-friendly) */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Error</p>
          <p className="mt-1 text-sm font-bold text-red-900 break-words">
            {error.message || 'An unexpected error occurred.'}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[9px] text-red-400">Digest: {error.digest}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all"
          >
            Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}
