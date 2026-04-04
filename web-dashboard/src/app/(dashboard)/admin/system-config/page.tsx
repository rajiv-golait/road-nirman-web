import { SSIM_INVERSE_PASS_THRESHOLD } from '@/lib/ssim';

export default function AdminSystemConfigPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-headline font-black text-primary">System configuration</h1>
      <p className="text-sm text-slate-500">
        Operational thresholds referenced by the web app. Authoritative SLA timers and RLS remain in Supabase migrations.
      </p>
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-sm font-bold text-slate-700">SSIM inverse pass threshold</span>
          <span className="font-mono text-sm">{SSIM_INVERSE_PASS_THRESHOLD}</span>
        </div>
        <p className="text-xs text-slate-500">
          Display rule: scores strictly below this value are treated as pass (surface changed). Align Python SSIM service output with this constant.
        </p>
      </div>
    </div>
  );
}
