'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/DataDisplay';
import { SsimIndicator } from '@/components/shared/SsimIndicator';
import { truncate } from '@/lib/utils';
import type { Ticket } from '@/lib/types/database';

interface ProofReviewClientProps {
  tickets: Ticket[];
}

export function ProofReviewClient({ tickets }: ProofReviewClientProps) {
  const [selected, setSelected] = useState<Ticket | null>(tickets[0] || null);

  const primaryBefore = (ticket: Ticket) => (ticket.photo_before?.length ? ticket.photo_before[0] : null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-headline font-black text-primary">Proof Review</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Compare before and after evidence alongside SSIM output for contractor repairs. The inverse rule still
          applies: scores below 0.75 are treated as pass.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="max-h-[70vh] space-y-2 overflow-y-auto lg:w-72">
          {tickets.length === 0 ? (
            <EmptyState icon="photo_library" message="No tickets in audit_pending or resolved scope for your role." />
          ) : (
            tickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setSelected(ticket)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  selected?.id === ticket.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="text-[10px] font-mono font-bold text-primary">{ticket.ticket_ref}</p>
                <p className="truncate text-xs font-bold text-slate-700">{ticket.road_name || ticket.address_text || '-'}</p>
                <p className="mt-1 text-[9px] uppercase text-slate-400">{ticket.status.replace('_', ' ')}</p>
              </button>
            ))
          )}
        </aside>

        {selected && (
          <section className="flex-1 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap justify-between gap-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ticket</p>
                <p className="text-lg font-headline font-black text-primary">{selected.ticket_ref}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">SSIM</p>
                <SsimIndicator score={selected.ssim_score} pass={selected.ssim_pass} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Verification hash</p>
              <p className="break-all font-mono text-xs text-slate-600">{selected.verification_hash || '-'}</p>
              {selected.verification_hash && (
                <p className="mt-1 text-[9px] text-slate-400">Truncated: {truncate(selected.verification_hash, 12)}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase text-slate-500">Before</p>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {primaryBefore(selected) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryBefore(selected)!} alt="Before" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-slate-400">No image</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase text-slate-500">After</p>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {selected.photo_after ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.photo_after} alt="After" className="h-full w-full object-cover" />
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
