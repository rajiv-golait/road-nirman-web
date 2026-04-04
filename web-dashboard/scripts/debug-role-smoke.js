const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3002';
const PASSWORD = 'Demo@SSR2025';

const ROLES = [
  { key: 'je', email: 'je.zone4@ssr.demo' },
  { key: 'ae', email: 'ae.zone4@ssr.demo' },
  { key: 'ee', email: 'ee@ssr.demo' },
  { key: 'city-engineer', email: 'cityengineer@ssr.demo' },
  { key: 'commissioner', email: 'commissioner@ssr.demo' },
  { key: 'accounts', email: 'accounts@ssr.demo' },
  { key: 'standing-committee', email: 'standing.comm@ssr.demo' },
];

async function login(page, email) {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });

  for (const role of ROLES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const page = await context.newPage();
    console.log(`DEBUG ${role.key} (${role.email})`);
    try {
      await login(page, role.email);
      const url = page.url();
      const title = await page.title();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      console.log(JSON.stringify({
        role: role.key,
        url,
        title,
        hasInvalidLogin: /invalid|incorrect|error/i.test(bodyText),
        snippet: bodyText.replace(/\s+/g, ' ').slice(0, 500),
      }));
    } catch (error) {
      console.log(JSON.stringify({
        role: role.key,
        error: error && error.message ? error.message.split('\n')[0] : String(error),
      }));
    }
    await context.close();
  }

  await browser.close();
})();
