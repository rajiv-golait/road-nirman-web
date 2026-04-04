const { chromium } = require('playwright');

const TARGET_URL = 'http://localhost:3002';
const EMAIL = 'ae.zone4@ssr.demo';
const PASSWORD = 'Demo@SSR2025';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });

  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(15000);

  const bodyText = await page.locator('body').innerText();
  console.log(JSON.stringify({
    url: page.url(),
    snippet: bodyText.replace(/\s+/g, ' ').slice(0, 1000),
  }));

  await browser.close();
})();
