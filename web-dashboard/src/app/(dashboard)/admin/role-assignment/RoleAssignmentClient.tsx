'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/lib/types/database';
import { EmptyState } from '@/components/shared/DataDisplay';

const ROLES: UserRole[] = [
  'je',
  'ae',
  'de',
  'ee',
  'assistant_commissioner',
  'city_engineer',
  'commissioner',
  'accounts',
  'standing_committee',
  'super_admin',
  'citizen',
  'contractor',
  'mukadam',
];

interface RoleAssignmentClientProps {
  profiles: Profile[];
}

export function RoleAssignmentClient({ profiles: initial }: RoleAssignmentClientProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initial);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('je');
  const [inviteZone, setInviteZone] = useState('');
  const [inviteEmployeeId, setInviteEmployeeId] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('');

  async function saveRow(p: Profile, patch: Partial<Pick<Profile, 'role' | 'zone_id' | 'is_active'>>) {
    setSavingId(p.id);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({ ...patch }).eq('id', p.id);

    setSavingId(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    router.refresh();
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviteBusy(true);
    setInviteMsg(null);
    setInviteError(false);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          full_name: inviteName.trim(),
          phone: invitePhone.trim() || null,
          role: inviteRole,
          zone_id: inviteZone === '' ? null : Number(inviteZone),
          employee_id: inviteEmployeeId.trim() || null,
          designation: inviteDesignation.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string; ok?: boolean };
      if (!res.ok) {
        setInviteError(true);
        setInviteMsg(data.error ?? 'Invite failed');
        return;
      }
      setInviteError(false);
      setInviteMsg(data.message ?? 'User invited successfully.');
      setInviteEmail('');
      setInviteName('');
      setInvitePhone('');
      setInviteZone('');
      setInviteEmployeeId('');
      setInviteDesignation('');
      router.refresh();
    } catch {
      setInviteError(true);
      setInviteMsg('Network error — try again.');
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-headline font-black text-primary">Role assignment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Invite new staff by email, then assign role and zone. Existing users: edit the row below.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Create user (email invite)</h2>
        <p className="text-xs text-slate-500">
          Sends a Supabase invite so they can set a password. Requires{' '}
          <code className="rounded bg-slate-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> on the server
          and email delivery configured in Supabase.
        </p>
        <form onSubmit={inviteUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Work email *
            <input
              required
              type="email"
              autoComplete="email"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Full name *
            <input
              required
              type="text"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Phone
            <input
              type="tel"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Role *
            <select
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              disabled={inviteBusy}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Zone (1–8)
            <input
              type="number"
              min={1}
              max={8}
              placeholder="Optional"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={inviteZone}
              onChange={(e) => setInviteZone(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Employee ID
            <input
              type="text"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
              value={inviteEmployeeId}
              onChange={(e) => setInviteEmployeeId(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <label className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Designation
            <input
              type="text"
              placeholder="e.g. Junior Engineer"
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal max-w-md"
              value={inviteDesignation}
              onChange={(e) => setInviteDesignation(e.target.value)}
              disabled={inviteBusy}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={inviteBusy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {inviteBusy ? 'Sending…' : 'Send invite & assign role'}
            </button>
          </div>
        </form>
        {inviteMsg && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              inviteError
                ? 'bg-red-50 text-red-700 border border-red-100'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
            }`}
          >
            {inviteMsg}
          </p>
        )}
      </section>

      {message && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{message}</p>}
      {profiles.length === 0 ? (
        <EmptyState icon="groups" message="No profiles returned — check RLS and auth." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="data-table w-full text-left min-w-[800px]">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Zone ID</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <RoleRow
                  key={p.id}
                  profile={p}
                  disabled={savingId === p.id}
                  onSave={(patch) => saveRow(p, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoleRow({
  profile,
  disabled,
  onSave,
}: {
  profile: Profile;
  disabled: boolean;
  onSave: (patch: Partial<Pick<Profile, 'role' | 'zone_id' | 'is_active'>>) => void;
}) {
  const [role, setRole] = useState<UserRole>(profile.role);
  const [zoneId, setZoneId] = useState<string>(profile.zone_id != null ? String(profile.zone_id) : '');
  const [active, setActive] = useState(profile.is_active);

  const dirty =
    role !== profile.role ||
    (zoneId === '' ? null : Number(zoneId)) !== profile.zone_id ||
    active !== profile.is_active;

  return (
    <tr>
      <td className="font-bold text-slate-800">{profile.full_name}</td>
      <td className="text-xs text-slate-600">{profile.phone || '—'}</td>
      <td>
        <select
          className="text-xs border border-slate-200 rounded-lg px-2 py-1"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={disabled}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          min={1}
          max={8}
          className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          placeholder="—"
          disabled={disabled}
        />
      </td>
      <td>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={disabled} />
      </td>
      <td>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() =>
            onSave({
              role,
              zone_id: zoneId === '' ? null : Number(zoneId),
              is_active: active,
            })
          }
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white disabled:opacity-40"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
