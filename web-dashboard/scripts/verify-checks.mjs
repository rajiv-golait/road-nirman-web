#!/usr/bin/env node
/**
 * Dashboard source-code guard: terminology (no "ward"; avoid "division" except subdivision).
 * Not a substitute for RLS tests — run role smoke checks manually (see docs/SMOKE_CHECKLIST.md).
 * Run: npm run verify:dashboard  (from web-dashboard directory)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(__dirname, '..', 'src');

const walk = (dir, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory() && name.name !== 'node_modules' && name.name !== '.next') walk(p, acc);
    else if (name.isFile() && /\.(tsx?|jsx?)$/.test(name.name)) acc.push(p);
  }
  return acc;
};

const files = walk(srcRoot);
let bad = 0;

// Heuristic: read-only role folders should not call .update( on tickets in same file.
const readOnlyTicketUpdate = (content, relPath) => {
  const u = relPath.replace(/\\/g, '/');
  if (!u.includes('commissioner/') && !u.includes('standing-committee/')) return false;
  if (!/from\(['"]tickets['"]\)/.test(content)) return false;
  return /\.update\s*\(/.test(content);
};

const invalidContractorBillFieldUsage = (content) => {
  const matches = content.matchAll(/from\(['"]contractor_bills['"]\)\s*\.select\(([\s\S]*?)\)/g);
  const invalidFields = new Set(['approval_tier', 'ticket_id', 'amount']);
  const offenders = new Set();

  for (const match of matches) {
    const selectArg = match[1] || '';
    for (const field of invalidFields) {
      const fieldPattern = new RegExp(`\\b${field}\\b`);
      if (fieldPattern.test(selectArg)) offenders.add(field);
    }
  }

  return Array.from(offenders);
};

const invalidContractorBillPatterns = (content) => {
  const offenders = [];
  if (/from\(['"]contractor_bills['"]\)[\s\S]*?\.eq\(['"]ticket_id['"]/.test(content)) {
    offenders.push("eq('ticket_id')");
  }
  if (/\bbill\??\.amount\b/.test(content)) {
    offenders.push('bill.amount');
  }
  return offenders;
};

const invalidTicketFieldUsage = (content) => {
  const invalidFields = ['category', 'surface_type', 'length_meters'];
  return invalidFields.filter((field) => new RegExp(`\\bticket\\??\\.${field}\\b`).test(content));
};

const invalidLegacyTableUsage = (content) => {
  const offenders = [];
  if (/from\(['"]ticket_photos['"]\)/.test(content)) offenders.push('ticket_photos');
  if (/from\(['"]ssim_results['"]\)/.test(content)) offenders.push('ssim_results');
  return offenders;
};

for (const f of files) {
  const t = readFileSync(f, 'utf8');
  const rel = f.replace(srcRoot + join.sep, '').replace(/\\/g, '/');
  if (/\bward\b/i.test(t)) {
    console.error('Forbidden term "ward" (use prabhag):', f);
    bad++;
  }
  if (/\bdivision\b/i.test(t) && !/subdivision/i.test(t)) {
    console.error('Avoid "division" (use zone):', f);
    bad++;
  }
  if (readOnlyTicketUpdate(t, rel)) {
    console.error('Suspicious: tickets update in read-only area:', f);
    bad++;
  }
  const invalidBillFields = invalidContractorBillFieldUsage(t);
  if (invalidBillFields.length > 0) {
    console.error(
      `Schema drift: contractor_bills select references nonexistent field(s) [${invalidBillFields.join(', ')}]:`,
      f
    );
    bad++;
  }
  const invalidBillPatterns = invalidContractorBillPatterns(t);
  if (invalidBillPatterns.length > 0) {
    console.error(
      `Schema drift: contractor_bills usage references invalid dashboard assumption(s) [${invalidBillPatterns.join(', ')}]:`,
      f
    );
    bad++;
  }
  const invalidTicketFields = invalidTicketFieldUsage(t);
  if (invalidTicketFields.length > 0) {
    console.error(
      `Schema drift: ticket view references invalid field(s) [${invalidTicketFields.join(', ')}]:`,
      f
    );
    bad++;
  }
  const invalidLegacyTables = invalidLegacyTableUsage(t);
  if (invalidLegacyTables.length > 0) {
    console.error(
      `Schema drift: dashboard references table(s) outside the trusted schema [${invalidLegacyTables.join(', ')}]:`,
      f
    );
    bad++;
  }
}
if (bad) {
  console.error(`Failed: ${bad} file(s)`);
  process.exit(1);
}
console.log('Dashboard verify: OK (', files.length, 'files checked)');
