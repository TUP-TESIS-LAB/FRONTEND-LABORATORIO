// E2E KAN-207 — Carga de resultados según tipo (cuant / cualit / semicuant).
//
// Valida, contra dev real (BE :8080 + lab :4200, tenant 1, admin@test.com/password):
//   API   1) /loadable expone tipo efectivo + valores cualitativos + analysisCatalogId (fix del review).
//   API   2) el guardado batch rechaza (422 español, sin leak) un valor cualitativo inválido y acepta el válido.
//   UI    3) la celda de la planilla rinde un dropdown para determinaciones cualit/semicuant y un input numérico
//            para las cuantitativas; elegir en el dropdown y Guardar persiste el label (round-trip real).
//
// Data seed usada: analysis 1 (Hemoglobina 90001, Hematocrito 90002, Leucocitos 90003, Plaquetas 90004),
// result 53010 (protocolo 50013), worksheet template 1. La config cualitativa se crea vía API y se limpia
// con e2e/carga-resultados-cualitativos.cleanup.sql.
//
// Correr:  node e2e/carga-resultados-cualitativos.mjs
import { chromium } from 'playwright';

const LAB = 'http://localhost:4200';
const API = 'http://localhost:8080/api/v1';

const ANALYSIS = 1, RESULT = 53010, PROTOCOL = 50013, TEMPLATE = 1;
const DET = { hemoglobina: 90001, hematocrito: 90002, leucocitos: 90003, plaquetas: 90004 };

let fails = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + msg); if (!cond) fails++; };
const eqArr = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);

let TOKEN;
async function login() {
  const r = await fetch(`${API}/auth/internal/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'password' }),
  });
  if (!r.ok) throw new Error(`login -> ${r.status}`);
  TOKEN = (await r.json()).token;
}
const auth = () => ({ Authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' });
const apiGet = async (p) => { const r = await fetch(`${API}${p}`, { headers: auth() }); return { status: r.status, body: await r.json().catch(() => null) }; };

async function createCategory(name, ordinal, values) {
  // get-or-create: los nombres de categoría son únicos por tenant → re-ejecutable.
  const r = await fetch(`${API}/analitica/qualitative-categories`, {
    method: 'POST', headers: auth(), body: JSON.stringify({ name, ordinal, values }),
  });
  if (r.status === 201) return r.json();
  if (r.status === 422) {
    const { body } = await apiGet('/analitica/qualitative-categories');
    const existing = (body ?? []).find(c => c.name === name);
    if (existing) return existing;
  }
  throw new Error(`create category "${name}" -> ${r.status} ${await r.text()}`);
}
async function setOverride(determinationId, analyticalType, qualitativeCategoryId) {
  // El request es posicional por nombre; sólo seteamos tipo + categoría, el resto null.
  const body = {
    percentageVariationTolerated: null, preIndications: null, preObservations: null,
    analyticalType, canBringSample: null, measurementUnitId: null, isPrintable: null,
    printOrder: null, printGroup: null, specialPrintName: null, loadingResultOrder: null,
    requiresLoadValue: null, requiresApproval: null, canSelfApprove: null,
    handlingTimeValue: null, handlingTimeUnit: null, qualitativeCategoryId,
  };
  const r = await fetch(`${API}/analitica/determinations/${determinationId}/override`, {
    method: 'PUT', headers: auth(), body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`override ${determinationId} -> ${r.status} ${await r.text()}`);
  return r.json();
}
async function batch(resultId, items) {
  const r = await fetch(`${API}/analitica/resultados/${resultId}/determinations/batch`, {
    method: 'PATCH', headers: auth(), body: JSON.stringify({ items }),
  });
  return { status: r.status, text: await r.text() };
}
const detValue = async (resultId, catalogId) => {
  const { body } = await apiGet(`/analitica/resultados/${resultId}/determinations`);
  const d = (body ?? []).find(x => x.determinationCatalogId === catalogId);
  return d ? { id: d.id, value: d.resultValue } : null;
};

const browser = await chromium.launch({ headless: true });
try {
  await login();

  // ─────────────────────────────── SETUP (config cualitativa vía API) ───────────────────────────────
  const catCualit = await createCategory('E2E Cualitativo', false, ['Reactivo', 'No reactivo']);
  const catSemi = await createCategory('E2E Semicuant', true, ['Negativo', '+', '++', '+++']);
  await setOverride(DET.plaquetas, 'QUALITATIVE', catCualit.id);
  await setOverride(DET.leucocitos, 'SEMI_QUALITATIVE', catSemi.id);
  console.log(`\n[setup] categorías ${catCualit.id}/${catSemi.id}, overrides Plaquetas=QUALITATIVE Leucocitos=SEMI_QUALITATIVE\n`);

  // ─────────────────────────────── PARTE 1 — contrato /loadable ───────────────────────────────
  const { status: lStatus, body: loadable } = await apiGet(`/analitica/determinations/loadable?analysisId=${ANALYSIS}`);
  check(lStatus === 200, `GET /loadable responde 200 (fue ${lStatus})`);
  const byId = Object.fromEntries((loadable ?? []).map(d => [d.id, d]));

  const plaq = byId[DET.plaquetas], leu = byId[DET.leucocitos], hb = byId[DET.hemoglobina];
  check(plaq?.analyticalType === 'QUALITATIVE', `Plaquetas resuelve QUALITATIVE (fue ${plaq?.analyticalType})`);
  check(eqArr(plaq?.qualitativeValues, ['Reactivo', 'No reactivo']), `Plaquetas trae los valores cualitativos [Reactivo, No reactivo] (fue ${JSON.stringify(plaq?.qualitativeValues)})`);
  check(leu?.analyticalType === 'SEMI_QUALITATIVE', `Leucocitos resuelve SEMI_QUALITATIVE (fue ${leu?.analyticalType})`);
  check(eqArr(leu?.qualitativeValues, ['Negativo', '+', '++', '+++']), `Leucocitos trae los valores semicuant ORDENADOS [Negativo,+,++,+++] (fue ${JSON.stringify(leu?.qualitativeValues)})`);
  check(hb?.analyticalType === 'QUANTITATIVE', `Hemoglobina sin override resuelve QUANTITATIVE (fue ${hb?.analyticalType})`);
  check(Array.isArray(hb?.qualitativeValues) && hb.qualitativeValues.length === 0, `Hemoglobina no trae valores cualitativos (fue ${JSON.stringify(hb?.qualitativeValues)})`);
  // Fix del review final: TODA entry expone analysisCatalogId (si falta, la planilla FE no persiste).
  check((loadable ?? []).length > 0 && loadable.every(d => d.analysisCatalogId === ANALYSIS),
    `cada determinación expone analysisCatalogId=${ANALYSIS} (fix del review)`);

  // ─────────────────────────────── PARTE 2 — validación en el guardado ───────────────────────────────
  const plaqDet = await detValue(RESULT, DET.plaquetas); // id 54013
  check(plaqDet != null, `existe la determinación de Plaquetas en el result ${RESULT}`);

  const bad = await batch(RESULT, [{ determinationId: plaqDet.id, resultValue: 'VALOR_INEXISTENTE', observations: null }]);
  check(bad.status === 422, `guardar un valor cualitativo inválido devuelve 422 (fue ${bad.status})`);
  check(/valor|permitidos|determinaci/i.test(bad.text), `el error 422 está en español y es de dominio (${bad.text.slice(0, 120)})`);
  check(!/lab\.laboratorio|Exception|No enum constant|SQL|org\.springframework/i.test(bad.text), `el error 422 no filtra internals`);
  const stillOriginal = await detValue(RESULT, DET.plaquetas);
  check(stillOriginal.value === plaqDet.value, `el rechazo fue atómico: la determinación conserva su valor previo (${stillOriginal.value})`);

  // Pre-seteo un valor válido distinto para probar el round-trip por UI después.
  const okApi = await batch(RESULT, [{ determinationId: plaqDet.id, resultValue: 'Reactivo', observations: null }]);
  check(okApi.status === 200, `guardar un valor cualitativo válido ("Reactivo") devuelve 200 (fue ${okApi.status})`);
  const afterApi = await detValue(RESULT, DET.plaquetas);
  check(afterApi.value === 'Reactivo', `el valor cualitativo válido persistió (fue ${afterApi.value})`);

  const hbDet = await detValue(RESULT, DET.hemoglobina);
  const okNum = await batch(RESULT, [{ determinationId: hbDet.id, resultValue: '13.9', observations: null }]);
  check(okNum.status === 200, `una determinación cuantitativa sigue aceptando un valor numérico (fue ${okNum.status})`);

  // ─────────────────────────────── PARTE 3 — UI: dropdown en la planilla ───────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(`${LAB}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-email', { timeout: 20000 });
  await page.locator('#login-email').fill('admin@test.com');
  await page.locator('#login-pass').fill('password');
  await page.click('.auth-btn');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });

  await page.goto(`${LAB}/analitica/procesamiento/cargar?templateId=${TEMPLATE}&protocols=${PROTOCOL}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.ws-grid, .ui-empty-state', { timeout: 25000 });
  check(page.url().includes('/analitica/procesamiento/cargar'), `la ruta de carga NO redirige (acceso ANALITICA ok) — url=${page.url().replace(LAB, '')}`);
  await page.waitForTimeout(1200);

  const selCount = await page.locator('.ws-grid p-select').count();
  const inputCount = await page.locator('.ws-grid input.ws-input').count();
  check(selCount === 2, `la planilla rinde 2 dropdowns (Plaquetas + Leucocitos) (fue ${selCount})`);
  check(inputCount === 2, `la planilla rinde 2 inputs numéricos (Hemoglobina + Hematocrito) (fue ${inputCount})`);

  const plaqCellSelect = page.locator('.ws-det:has-text("Plaquetas") ~ .ws-cell').first().locator('p-select');
  check(await plaqCellSelect.count() > 0, `la celda de Plaquetas (cualitativa) es un dropdown`);
  const hbCellInput = page.locator('.ws-det:has-text("Hemoglobina") ~ .ws-cell').first().locator('input.ws-input');
  check(await hbCellInput.count() > 0, `la celda de Hemoglobina (cuantitativa) es un input numérico`);

  // Abrir el dropdown de Plaquetas y verificar sus opciones. El área clickeable de PrimeNG
  // Select es el `<span role="combobox" class="p-select-label">` dentro del host `<p-select>`.
  const OPTS = '[role="option"], .p-select-option';
  await plaqCellSelect.locator('.p-select-label, [role="combobox"]').first().click();
  await page.waitForSelector(OPTS, { timeout: 8000 });
  const optTexts = (await page.locator(OPTS).allInnerTexts()).map(t => t.trim()).filter(Boolean);
  check(optTexts.includes('Reactivo') && optTexts.includes('No reactivo'),
    `el dropdown de Plaquetas ofrece [Reactivo, No reactivo] (fue ${JSON.stringify(optTexts)})`);

  // Elegir "No reactivo" (distinto del "Reactivo" seteado por API) y guardar → round-trip real.
  await page.locator(OPTS).filter({ hasText: /^No reactivo$/ }).first().click();
  await page.waitForTimeout(400);
  await page.locator('.ws-footer p-button, .ws-footer button', { hasText: /Guardar/i }).first().click().catch(async () => {
    await page.getByRole('button', { name: /Guardar/i }).first().click();
  });
  await page.waitForTimeout(2500);

  const afterUi = await detValue(RESULT, DET.plaquetas);
  check(afterUi.value === 'No reactivo', `elegir "No reactivo" en el dropdown y Guardar persistió el label (fue ${afterUi.value})`);

  await page.screenshot({ path: 'e2e/carga-resultados-cualitativos.png', fullPage: true });
  await ctx.close();
} catch (e) {
  console.log('ERROR  ' + (e.stack || e.message));
  fails++;
} finally {
  await browser.close();
}

console.log(fails === 0 ? '\n✓ TODOS OK — carga de resultados por tipo validada (API + UI)' : `\n✗ FALLARON ${fails} checks`);
process.exit(fails === 0 ? 0 : 1);
