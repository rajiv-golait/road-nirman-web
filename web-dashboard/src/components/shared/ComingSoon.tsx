interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: string;
}

export function ComingSoon({ title, description, icon = 'construction' }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 40 }}>{icon}</span>
      </div>
      <h1 className="text-2xl font-headline font-black text-primary mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-md">
        {description || 'This module is under development and will be available in the next release.'}
      </p>
      <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
        <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 14 }}>info</span>
        <p className="text-[10px] text-blue-700 font-bold">Phase 3 — Scheduled for next sprint</p>
      </div>
    </div>
  );
}
