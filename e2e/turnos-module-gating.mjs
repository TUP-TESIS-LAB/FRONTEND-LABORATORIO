// E2E: gating del módulo TURNOS en el sidebar.
//
// Verifica que al DESACTIVAR el módulo TURNOS del tenant, las pestañas del
// sidebar gateadas por `moduleKey: ModuleKey.Turnos` desaparecen, y vuelven a
// aparecer al reactivarlo. Toggle vía el endpoint de SaaS Admin.
//
// Requisitos: backend en :8080 (datasource 3307) y lab en :4200, seed local
// (admin@test.com / password, saas-admin@platform.test / password, tenant 1).
//
// Correr:  node e2e/turnos-module-gating.mjs
import { chromium } from 'playwright';

const LAB = 'http://127.0.0.1:4200';
const API = 'http://localhost:8080/api/v1';
const TENANT_ID = 1;

// Pestañas del sidebar gateadas por moduleKey: ModuleKey.Turnos.
const TURNOS_TABS = ['Sacar turno', 'Configuración de agendas'];

let failures = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + msg); if (!cond) failures++; };

async function apiLogin(email, password) {
  const r = await fetch(`${API}/auth/internal/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(`login ${email} -> ${r.status}`);
  return (await r.json()).token;
}

async function setTurnos(saasToken, enable) {
  const r = await fetch(`${API}/saas-admin/tenants/${TENANT_ID}/modules/TURNOS`, {
    method: 'PUT', headers: { 'content-type': 'application/json', Authorization: `Bearer ${saasToken}` },
    body: JSON.stringify({ enable }),
  });
  if (!r.ok) throw new Error(`toggle TURNOS=${enable} -> ${r.status}`);
}

async function uiLogin(page) {
  await page.goto(`${LAB}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.locator('#login-email').fill('admin@test.com');
  await page.locator('#login-pass').fill('password');
  await page.click('.auth-btn');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await page.waitForSelector('.ui-sidebar__item', { timeout: 20000 });
  await page.waitForTimeout(800);
}

const tabVisible = async (page, label) =>
  (await page.locator('a.ui-sidebar__item', { hasText: label }).count()) > 0;

const browser = await chromium.launch({ headless: true });
let saasToken;
try {
  saasToken = await apiLogin('saas-admin@platform.test', 'password');

  // ── 1) TURNOS ACTIVO: las pestañas están ───────────────────────────
  await setTurnos(saasToken, true);
  const ctxOn = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const pageOn = await ctxOn.newPage();
  await uiLogin(pageOn);
  for (const tab of TURNOS_TABS) {
    check(await tabVisible(pageOn, tab), `con TURNOS activo, la pestaña "${tab}" está visible`);
  }
  await pageOn.screenshot({ path: 'e2e/turnos-gating-on.png', fullPage: true });
  await ctxOn.close();

  // ── 2) TURNOS INACTIVO: las pestañas desaparecen ───────────────────
  await setTurnos(saasToken, false);
  const ctxOff = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const pageOff = await ctxOff.newPage();
  await uiLogin(pageOff);
  for (const tab of TURNOS_TABS) {
    check(!(await tabVisible(pageOff, tab)), `con TURNOS inactivo, la pestaña "${tab}" desaparece`);
  }
  // El acceso directo por URL también queda bloqueado (moduleActiveGuard redirige).
  await pageOff.goto(`${LAB}/turnos/sacar`, { waitUntil: 'domcontentloaded' });
  await pageOff.waitForTimeout(1500);
  check(!pageOff.url().includes('/turnos/sacar'),
    `con TURNOS inactivo, navegar a /turnos/sacar redirige (url=${pageOff.url().replace(LAB, '')})`);
  await pageOff.screenshot({ path: 'e2e/turnos-gating-off.png', fullPage: true });
  await ctxOff.close();
} catch (e) {
  console.log('ERROR  ' + e.message);
  failures++;
} finally {
  // Cleanup: dejar TURNOS activo (estado del seed).
  if (saasToken) { try { await setTurnos(saasToken, true); console.log('cleanup: TURNOS reactivado'); } catch {} }
  await browser.close();
}

console.log(failures === 0 ? '\n✓ TEST OK — gating de TURNOS correcto' : `\n✗ TEST FALLÓ (${failures})`);
process.exit(failures === 0 ? 0 : 1);
