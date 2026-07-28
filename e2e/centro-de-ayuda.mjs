// E2E KAN-262 — Centro de ayuda: manual de uso + asistente.
//
// Valida, contra dev real (BE :8080 + lab :4200, tenant 1, admin@test.com/password):
//   API  1) /asistente/manual responde el manual estructurado y filtrado por los módulos del tenant.
//   API  2) coverages y medicos vuelven en el corpus (regresión del bug: el loader filtraba por
//           isActivable() y esos módulos son CORE, así que su manual nunca se cargaba).
//   API  3) no se filtra plomería del RAG al contenido: ni "El usuario pregunta", ni comentarios
//           HTML, ni el marcador "acceso:".
//   API  4) cada sección declara accessSections, salvo las transversales conocidas.
//   UI   5) /ayuda rinde manual a la izquierda y asistente a la derecha (dos columnas en desktop).
//   UI   6) los temas quedan separados por <hr> y la negrita se resuelve (no quedan ** crudos).
//   UI   7) el buscador filtra sobre el contenido, no solo sobre los títulos.
//   UI   8) el botón de ayuda del topbar navega a /ayuda y no queda panel flotante de chat.
//
// El recorte por rol NO se puede probar acá: admin@test.com tiene todas las secciones, así que no
// se le esconde nada. Esa regla está cubierta por unit tests en
// src/app/features/ayuda/services/filtrar-por-acceso.spec.ts.
//
// Correr:  node e2e/centro-de-ayuda.mjs
import { chromium } from 'playwright';

const LAB = 'http://localhost:4200';
const API = 'http://localhost:8080/api/v1';

let fails = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + '  ' + msg); if (!cond) fails++; };

/** Secciones marcadas TODOS a propósito en el corpus. */
const TRANSVERSALES = new Set([
  'core-ingresar-y-moverse-por-el-sistema',
  'core-mi-perfil',
  'privacidad-tus-datos-dentro-del-sistema',
  'privacidad-cuidado-de-los-datos-de-los-pacientes',
  'privacidad-reglas-de-uso-del-sistema',
]);

let TOKEN;
async function login() {
  const r = await fetch(`${API}/auth/internal/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'password' }),
  });
  if (!r.ok) throw new Error(`login -> ${r.status}`);
  TOKEN = (await r.json()).token;
}

async function apiManual() {
  const r = await fetch(`${API}/asistente/manual`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

const secciones = (m) => m.chapters.flatMap((c) => c.sections);
const temas = (m) => secciones(m).flatMap((s) => s.topics);
const textoDe = (b) => (b.text != null ? b.text : (b.items || []).join(' '));
const bloques = (m) => temas(m).flatMap((t) => t.blocks);

async function pruebasApi() {
  const { status, body: manual } = await apiManual();
  check(status === 200, `GET /asistente/manual -> 200 (fue ${status})`);
  if (status !== 200) return null;

  check(manual.chapters.length > 0, `devuelve capítulos (${manual.chapters.length})`);
  check(
    secciones(manual).every((s) => s.topics.length > 0),
    'toda sección trae al menos un tema',
  );
  check(
    temas(manual).every((t) => t.blocks.length > 0),
    'todo tema trae al menos un bloque',
  );

  const ids = manual.chapters.map((c) => c.id);
  check(ids.includes('coverages'), 'incluye el capítulo coverages (módulo CORE, antes nunca se cargaba)');
  check(ids.includes('medicos'), 'incluye el capítulo medicos (módulo CORE, antes nunca se cargaba)');
  check(ids.includes('privacidad'), 'incluye el capítulo de protección de datos');

  const todos = bloques(manual).map(textoDe).join('\n');
  check(!todos.includes('El usuario pregunta'), 'no filtra las frases de búsqueda del RAG');
  check(!todos.includes('<!--'), 'no filtra comentarios de edición');
  check(!todos.includes('acceso:'), 'no filtra el marcador de acceso');

  const sinAcceso = secciones(manual)
    .filter((s) => (s.accessSections || []).length === 0)
    .map((s) => s.id)
    .filter((id) => !TRANSVERSALES.has(id));
  check(sinAcceso.length === 0, `toda sección declara su acceso (sin marcador: ${sinAcceso.join(', ') || 'ninguna'})`);

  const idsUnicos = new Set(temas(manual).map((t) => t.id));
  check(idsUnicos.size === temas(manual).length, 'los ids de tema son únicos');

  const legal = bloques(manual).map(textoDe).join(' ');
  check(legal.includes('Ley 26.529'), 'el capítulo de privacidad cita la Ley 26.529');
  check(
    legal.includes('firma electrónica') && legal.includes('firma digital'),
    'distingue firma electrónica de firma digital (Ley 25.506)',
  );

  return manual;
}

async function pruebasUi(manual) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 950 } });

  try {
    await page.goto(`${LAB}/login`);
    await page.fill('input[type=email]', 'admin@test.com');
    await page.fill('input[type=password]', 'password');
    await page.click('button[type=submit]');
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

    await page.goto(`${LAB}/ayuda`);
    await page.waitForSelector('.ayuda__capitulo-titulo', { timeout: 20000 });

    const titulo = await page.textContent('.ui-page-header__title');
    check(titulo?.trim() === 'Centro de ayuda', `el header dice "Centro de ayuda" (dijo "${titulo?.trim()}")`);

    const capitulosUi = await page.$$eval('.ayuda__capitulo-titulo', (els) => els.length);
    check(
      capitulosUi === manual.chapters.length,
      `rinde los ${manual.chapters.length} capítulos del endpoint (rindió ${capitulosUi})`,
    );

    // Dos columnas: el asistente arranca a la derecha de donde termina el manual.
    const layout = await page.evaluate(() => {
      const m = document.querySelector('.ayuda__manual').getBoundingClientRect();
      const a = document.querySelector('.ayuda__asistente').getBoundingClientRect();
      return {
        dosColumnas: a.left >= m.right - 5,
        sticky: getComputedStyle(document.querySelector('.ayuda__asistente')).position === 'sticky',
        chat: !!document.querySelector('.ayuda__asistente .aa-panel .aa-input'),
        overflowH: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    check(layout.dosColumnas, 'el asistente queda a la derecha del manual');
    check(layout.sticky, 'el asistente queda fijo al scrollear');
    check(layout.chat, 'el chat está embebido y usable en la columna');
    check(!layout.overflowH, 'la pantalla no scrollea en horizontal');

    // Expandir un capítulo: separadores + negrita resuelta.
    await page.click('.ayuda__capitulo-titulo');
    await page.waitForSelector('.ayuda__tema', { timeout: 10000 });

    const contenido = await page.evaluate(() => {
      const secciones = [...document.querySelectorAll('.ayuda__seccion')];
      return {
        temas: document.querySelectorAll('.ayuda__tema').length,
        hrs: document.querySelectorAll('.ayuda__separador').length,
        secciones: secciones.length,
        negritas: document.querySelectorAll('.ayuda__tema strong').length,
        asteriscosCrudos: document.querySelector('.ayuda__manual').textContent.includes('**'),
      };
    });
    // Un <hr> entre temas consecutivos, ninguno colgando al final de cada sección.
    check(
      contenido.hrs === contenido.temas - contenido.secciones,
      `un separador entre temas consecutivos (${contenido.hrs} hr para ${contenido.temas} temas en ${contenido.secciones} secciones)`,
    );
    check(contenido.negritas > 0, `la negrita del corpus se rinde como <strong> (${contenido.negritas})`);
    check(!contenido.asteriscosCrudos, 'no quedan ** crudos en pantalla');

    // El buscador mira el contenido, no solo los títulos: "ayuno" no está en ningún título.
    await page.fill('.ayuda__buscador-input', 'ayuno');
    await page.waitForTimeout(400);
    const busqueda = await page.evaluate(() => ({
      temas: [...document.querySelectorAll('.ayuda__tema-titulo')].map((h) => h.textContent.trim()),
      contador: document.querySelector('.ayuda__contador')?.textContent?.trim() ?? null,
    }));
    check(busqueda.temas.length > 0, `"ayuno" encuentra temas (${busqueda.temas.length})`);
    check(
      busqueda.temas.every((t) => !t.toLowerCase().includes('ayuno')),
      'los encuentra por contenido, no por título',
    );
    check(busqueda.contador !== null, `muestra el contador de resultados ("${busqueda.contador}")`);

    // El botón del topbar lleva al centro de ayuda, y no hay panel flotante suelto.
    await page.goto(`${LAB}/home`);
    await page.waitForSelector('.ui-topbar__icon-btn[aria-label="Centro de ayuda"]', { timeout: 15000 });
    const flotante = await page.$$eval('app-asistente-ayuda', (els) => els.length);
    check(flotante === 0, `fuera de /ayuda no queda panel de chat montado (encontró ${flotante})`);

    await page.click('.ui-topbar__icon-btn[aria-label="Centro de ayuda"]');
    await page.waitForURL(/\/ayuda$/, { timeout: 10000 });
    check(true, 'el botón de ayuda del topbar navega a /ayuda');
  } finally {
    await browser.close();
  }
}

(async () => {
  await login();
  const manual = await pruebasApi();
  if (manual) await pruebasUi(manual);

  console.log(`\n${fails === 0 ? 'TODO OK' : fails + ' FALLARON'}`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error('ERROR', e); process.exit(1); });
