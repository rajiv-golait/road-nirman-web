const fs = require('fs');
const files = [
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/assistant-commissioner/budget/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/assistant-commissioner/sla-breaches/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/city-engineer/defect-liability/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/city-engineer/rate-cards/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/city-engineer/reports/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/commissioner/financial-nexus/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/standing-committee/audit-reports/page.tsx',
  'r:/Road Nirman/web-dashboard/src/app/(dashboard)/accounts/line-items/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\s*trend=\{.*?\}\s*/g, '\n        ');
    content = content.replace(/\s*trend=\".*?\"\s*/g, '\n        ');
    fs.writeFileSync(file, content);
  }
});
console.log('Done replacing trend props.');
