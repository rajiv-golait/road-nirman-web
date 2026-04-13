import { NextResponse } from 'next/server';
import { rowsToCsv } from '@/lib/export/csv';
import { requireExportProfile } from '../_shared';

type ZoneJoin = { name?: string | null } | null;
type ContractorJoin = { company_name?: string | null } | null;

export async function GET() {
  const auth = await requireExportProfile(['super_admin', 'accounts']);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const { data: bills, error } = await supabase
    .from('contractor_bills')
    .select('bill_ref, fiscal_year, zone_id, status, total_amount, submitted_at, reviewed_at, zones(name), contractors(company_name)')
    .order('submitted_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (bills || []).map(b => ({
    bill_ref: b.bill_ref,
    fiscal_year: b.fiscal_year,
    zone_name: ((b.zones as ZoneJoin)?.name) || b.zone_id,
    contractor_name: ((b.contractors as ContractorJoin)?.company_name) || 'Unknown',
    status: b.status,
    total_amount: b.total_amount,
    submitted_at: b.submitted_at,
    reviewed_at: b.reviewed_at,
  }));

  const headers = ['bill_ref', 'fiscal_year', 'zone_name', 'contractor_name', 'status', 'total_amount', 'submitted_at', 'reviewed_at'];
  const csv = rowsToCsv(rows as Record<string, unknown>[], headers);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="accounts-bills-register.csv"',
    },
  });
}
