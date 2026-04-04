'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Noto_Sans_Devanagari } from 'next/font/google';
import { createClient } from '@/lib/supabase/client';
import { ROLE_ROUTES } from '@/lib/constants/roles';
import type { UserRole } from '@/lib/types/database';
import { cn } from '@/lib/utils';

const notoDevanagari = Noto_Sans_Devanagari({
  weight: ['700'],
  subsets: ['devanagari'],
  display: 'swap',
});

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Fetch user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      setError('Could not load user profile. Please contact admin.');
      setLoading(false);
      return;
    }

    const route = ROLE_ROUTES[profile.role as UserRole];
    router.push(route);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-800 via-primary to-primary-600 px-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center shadow-xl shadow-accent/30">
              <span className="material-symbols-outlined text-white" style={{ fontSize: 30 }}>
                engineering
              </span>
            </div>
          </div>
          <h1
            className={cn(
              'text-3xl text-white tracking-tight',
              notoDevanagari.className
            )}
            lang="mr"
          >
            रोड NIRMAN
          </h1>
          <p className="text-primary-200 text-sm mt-1">
            Solapur Smart Roads — Dashboard Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="font-headline font-bold text-lg text-primary mb-6">
            Sign in to your dashboard
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@solapurmc.gov.in"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                  transition-all placeholder:text-slate-300"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <span className="material-symbols-outlined text-error" style={{ fontSize: 16 }}>
                  error
                </span>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-600 text-white rounded-lg font-bold
                flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>
                  progress_activity
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    login
                  </span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">
              Access is restricted to authorized Solapur MC officials only.
              <br />
              Contact IT dept for credentials.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-primary-300 mt-6">
          Solapur Municipal Corporation © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
