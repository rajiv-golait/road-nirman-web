const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3002';
const PASSWORD = 'Demo@SSR2025';

const TESTS = [
  {
    role: 'ae',
    email: 'ae.zone4@ssr.demo',
    pages: [
      { path: '/ae', text: 'Supervisor Dashboard' },
      { path: '/ae/workloads', text: 'JE Workload Assessment' },
      { path: '/ae/escalations', text: 'Active Escalations' },
      { path: '/ae/map', text: 'Zone map' },
    ],
  },
  {
    role: 'de',
    email: 'de.zone4@ssr.demo',
    pages: [
      { path: '/de', text: 'JE Performance Leaderboard' },
      { path: '/de/map', text: 'Zone technical map' },
      { path: '/de/work-orders', text: 'Work Order Visibility' },
    ],
  },
  {
    role: 'assistant-commissioner',
    email: 'zo.zone4@ssr.demo',
    pages: [
      { path: '/assistant-commissioner', text: 'Zone Control Dashboard' },
      { path: '/assistant-commissioner/budget', text: 'Budget tracking' },
      { path: '/assistant-commissioner/ticket-lifecycle', text: 'Ticket lifecycle' },
      { path: '/assistant-commissioner/sla-breaches', text: 'SLA breaches' },
    ],
  },
  {
    role: 'super-admin',
    email: 'superadmin@ssr.demo',
    pages: [
      { path: '/admin', text: 'Dashboard Switcher' },
      { path: '/admin/users', text: 'User management' },
      { path: '/admin/role-assignment', text: 'Save' },
    ],
  },
];

async function login(page, email) {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 40 });
  const results = [];

  for (const test of TESTS) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    await login(page, test.email);

    for (const check of test.pages) {
      let ok = false;
      let note = '';
      try {
        await page.goto(`${TARGET_URL}${check.path}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector(`text=${check.text}`, { timeout: 12000 });
        ok = true;
        note = 'passed';
      } catch (error) {
        note = error && error.message ? error.message.split('\n')[0] : String(error);
      }
      const result = { role: test.role, path: check.path, ok, note };
      results.push(result);
      console.log(JSON.stringify(result));
    }

    await context.close();
  }

  console.log('SUBPAGE_RESULTS_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('SUBPAGE_RESULTS_END');
  await browser.close();
})();
