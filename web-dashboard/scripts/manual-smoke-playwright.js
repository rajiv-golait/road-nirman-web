const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3002';
const PASSWORD = 'Demo@SSR2025';

const ROLES = [
  {
    key: 'je',
    email: 'je.zone4@ssr.demo',
    expectedPath: '/je',
    expectedText: 'Planning view only.',
  },
  {
    key: 'ae',
    email: 'ae.zone4@ssr.demo',
    expectedPath: '/ae',
    expectedText: 'Rule 1',
  },
  {
    key: 'de',
    email: 'de.zone4@ssr.demo',
    expectedPath: '/de',
    expectedText: 'Chronic Hotspots',
  },
  {
    key: 'ee',
    email: 'ee@ssr.demo',
    expectedPath: '/ee',
    expectedText: 'Technical Review Queue',
  },
  {
    key: 'assistant-commissioner',
    email: 'zo.zone4@ssr.demo',
    expectedPath: '/assistant-commissioner',
    expectedText: 'Zone Control Dashboard',
  },
  {
    key: 'city-engineer',
    email: 'cityengineer@ssr.demo',
    expectedPath: '/city-engineer',
    expectedText: 'Engineering Governance Dashboard',
  },
  {
    key: 'commissioner',
    email: 'commissioner@ssr.demo',
    expectedPath: '/commissioner',
    expectedText: 'Strategic observation mode only',
  },
  {
    key: 'accounts',
    email: 'accounts@ssr.demo',
    expectedPath: '/accounts',
    expectedText: 'Contractor work only.',
  },
  {
    key: 'standing-committee',
    email: 'standing.comm@ssr.demo',
    expectedPath: '/standing-committee',
    expectedText: 'Read Only Access',
  },
  {
    key: 'super-admin',
    email: 'superadmin@ssr.demo',
    expectedPath: '/admin',
    expectedText: 'Dashboard Switcher',
  },
];

async function login(page, email) {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
}

async function smokeRole(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  const result = {
    role: role.key,
    email: role.email,
    ok: false,
    path: '',
    note: '',
  };

  try {
    await login(page, role.email);
    await page.waitForURL(`**${role.expectedPath}**`, { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    result.path = new URL(page.url()).pathname;

    if (!result.path.startsWith(role.expectedPath)) {
      result.note = `redirected to ${result.path}`;
      await context.close();
      return result;
    }

    if (role.expectedText) {
      await page.waitForSelector(`text=${role.expectedText}`, { timeout: 15000 });
    }

    if (role.key === 'je') {
      await page.click('a[href="/je/history"]').catch(() => {});
      await page.waitForURL('**/je/history', { timeout: 10000 });
      await page.waitForSelector('text=Closed Tickets', { timeout: 10000 });
    }

    if (role.key === 'accounts') {
      const approveVisible = await page.locator('text=Approve Full Bill').count();
      if (approveVisible < 1) {
        result.note = 'accounts queue loaded but no review action visible';
        await context.close();
        return result;
      }
    }

    if (role.key === 'standing-committee') {
      const mutateButtons = await page.locator('text=/Approve|Reject|Assign/i').count();
      if (mutateButtons > 0) {
        result.note = 'read-only role exposed mutation controls';
        await context.close();
        return result;
      }
    }

    if (role.key === 'commissioner') {
      const mutateButtons = await page.locator('text=/Approve|Reject|Assign/i').count();
      if (mutateButtons > 0) {
        result.note = 'commissioner exposed mutation controls';
        await context.close();
        return result;
      }
    }

    result.ok = true;
    result.note = 'passed';
  } catch (error) {
    result.note = error && error.message ? error.message.split('\n')[0] : String(error);
  }

  await context.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 75 });
  const results = [];

  for (const role of ROLES) {
    console.log(`TESTING ${role.key} (${role.email})`);
    const outcome = await smokeRole(browser, role);
    results.push(outcome);
    console.log(JSON.stringify(outcome));
  }

  console.log('SMOKE_RESULTS_START');
  console.log(JSON.stringify(results, null, 2));
  console.log('SMOKE_RESULTS_END');
  await browser.close();
})();
