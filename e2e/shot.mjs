import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4200';
const target = process.argv[2] || '/analitica/extraccion';
const out = process.argv[3] || 'e2e/shot.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.locator('#login-email').fill('admin@test.com');
await page.locator('#login-pass').fill('password');
await page.getByRole('button', { name: 'Iniciar sesión' }).click();
await page.waitForURL(/\/home/, { timeout: 15000 });

await page.goto(`${BASE}${target}`);
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });

console.log('screenshot ->', out);
await browser.close();
