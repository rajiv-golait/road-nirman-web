// ============================================================
// Contractor billing — XOR rule (spec §6.8 / §6.9)
// Line items must reference tickets with contractor execution only:
//   assigned_contractor IS NOT NULL
//   AND assigned_mukadam IS NULL
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillLineItem, Ticket } from '@/lib/types/database';

type LineWithTicket = BillLineItem & {
  tickets: Pick<Ticket, 'assigned_contractor' | 'assigned_mukadam' | 'ticket_ref'> | null;
};

export function isContractorExecutedTicket(t: Pick<Ticket, 'assigned_contractor' | 'assigned_mukadam'> | null): boolean {
  if (!t) return false;
  return t.assigned_contractor != null && t.assigned_mukadam == null;
}

/** PostgREST may return a single object or a one-element array for FK embeds. */
export function normalizeTicketJoin(
  tickets: unknown
): Pick<Ticket, 'assigned_contractor' | 'assigned_mukadam' | 'ticket_ref'> | null {
  if (tickets == null) return null;
  if (Array.isArray(tickets)) {
    const row = tickets[0];
    return row && typeof row === 'object'
      ? (row as Pick<Ticket, 'assigned_contractor' | 'assigned_mukadam' | 'ticket_ref'>)
      : null;
  }
  if (typeof tickets === 'object') {
    return tickets as Pick<Ticket, 'assigned_contractor' | 'assigned_mukadam' | 'ticket_ref'>;
  }
  return null;
}

export async function fetchContractorBillLineItems(
  supabase: SupabaseClient,
  billId: string
): Promise<{ data: BillLineItem[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('bill_line_items')
    .select(
      `
      *,
      tickets (
        ticket_ref,
        assigned_contractor,
        assigned_mukadam
      )
    `
    )
    .eq('bill_id', billId);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data || []) as unknown as LineWithTicket[];
  const filtered = rows.filter((row) => isContractorExecutedTicket(normalizeTicketJoin(row.tickets)));
  const stripped: BillLineItem[] = filtered.map((row) => {
    const { tickets: _unused, ...line } = row;
    void _unused;
    return line as BillLineItem;
  });
  return { data: stripped, error: null };
}
