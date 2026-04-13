import { NextResponse } from 'next/server';
import { rowsToCsv } from '@/lib/export/csv';
import { requireExportProfile } from '../_shared';

type ZoneJoin = { name?: string | null } | null;
type ContractorJoin = { company_name?: string | null } | null;

export async function GET() {
  const auth = await requireExportProfile([
    'super_admin',
    'commissioner',
    'accounts',
    'standing_committee',
  ]);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: bills, error } = await supabase
    .from('contractor_bills')
    .select('bill_ref, contractor_id, zone_id, fiscal_year, total_amount, status, payment_ref, payment_date, submitted_at, zones(name), contractors(company_name)')
    .order('submitted_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (bills || []).map(b => ({
    bill_ref: b.bill_ref,
    contractor_name: ((b.contractors as ContractorJoin)?.company_name) || 'Unknown',
    zone_name: ((b.zones as ZoneJoin)?.name) || b.zone_id,
    fiscal_year: b.fiscal_year,
    total_amount: b.total_amount,
    status: b.status,
    payment_ref: b.payment_ref,
    payment_date: b.payment_date,
    submitted_at: b.submitted_at,
  }));

  const headers = [
    'bill_ref',
    'contractor_name',
    'zone_name',
    'fiscal_year',
    'total_amount',
    'status',
    'payment_ref',
    'payment_date',
    'submitted_at',
  ];

  const csv = rowsToCsv(rows as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="payout-summary.csv"',
    },
  });
}
