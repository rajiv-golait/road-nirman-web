'use client';

import { useState } from 'react';
import { SsimIndicator } from '@/components/shared/SsimIndicator';
import { EmptyState } from '@/components/shared/DataDisplay';
import { truncate } from '@/lib/utils';
import type { Ticket } from '@/lib/types/database';

interface ProofReviewClientProps {
  tickets: Ticket[];
}

export function ProofReviewClient({ tickets }: ProofReviewClientProps) {
  const [selected, setSelected] = useState<Ticket | null>(tickets[0] || null);

  const primaryBefore = (t: Ticket) => (t.photo_before?.length ? t.photo_before[0] : null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-headline font-black text-primary">Proof Review</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Compare before/after evidence and SSIM output for contractor repairs (inverse rule: score &lt; 0.75 = pass).
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-72 space-y-2 max-h-[70vh] overflow-y-auto">
          {tickets.length === 0 ? (
            <EmptyState icon="photo_library" message="No tickets in audit_pending or resolved scope for your role." />
          ) : (
            tickets.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setSelected(t)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selected?.id === t.id ? 'border-primary ring-2 ring-primary/10 bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-[10px] font-mono font-bold text-primary">{t.ticket_ref}</p>
                <p className="text-xs font-bold text-slate-700 truncate">{t.road_name || t.address_text || '—'}</p>
                <p className="text-[9px] text-slate-400 mt-1 uppercase">{t.status.replace('_', ' ')}</p>
              </button>
            ))
          )}
        </aside>

        {selected && (
          <section className="flex-1 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex flex-wrap gap-6 justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</p>
                <p className="text-lg font-headline font-black text-primary">{selected.ticket_ref}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SSIM</p>
                <SsimIndicator score={selected.ssim_score} pass={selected.ssim_pass} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verification hash</p>
              <p className="text-xs font-mono text-slate-600 break-all">{selected.verification_hash || '—'}</p>
              {selected.verification_hash && (
                <p className="text-[9px] text-slate-400 mt-1">Truncated: {truncate(selected.verification_hash, 12)}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Before</p>
                <div className="aspect-video rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                  {primaryBefore(selected) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryBefore(selected)!} alt="Before" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400">No image</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2">After</p>
                <div className="aspect-video rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                  {selected.photo_after ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.photo_after} alt="After" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400">No image</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
