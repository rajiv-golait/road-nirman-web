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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-headline font-black text-primary">Role assignment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Map officers to roles and zones. Changes apply immediately under RLS.
        </p>
      </header>
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
