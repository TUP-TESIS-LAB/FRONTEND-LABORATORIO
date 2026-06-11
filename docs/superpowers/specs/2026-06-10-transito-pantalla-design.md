# Pantalla Tránsito — Lotes recomendados + temporales (mocks)

> **Fecha:** 2026-06-10
> **Repo:** FRONTEND-LABORATORIO
> **Módulo:** `features/analitica/muestras`
> **Ruta afectada:** `/analitica/traslado`
> **Status:** Design — pendiente plan + ticket Jira

## 1. Resumen

Reemplazar el mount actual de `/analitica/traslado` (hoy el `WorklistPage` genérico) por una pantalla dedicada **Tránsito**, basada en el handoff `design_handoff_traslado_angular`. La pantalla muestra:

- **Listas recomendadas** por la mochila (agrupadas por sucursal · área · sección).
- **Lotes temporales** armados a mano (tildando o escaneando), con destino editable, que se envían cuando el operador quiere.
- Acción **Enviar todo** (los groups, no los lotes) con modal de confirmación.

Las otras 3 pantallas del módulo (recolección, procesamiento, descarte) **siguen sobre `WorklistPage`** sin cambios.

**Alcance de esta iteración:** mocks puros (signals, sin backend). Toda la lógica de la mochila se simula con mapas estáticos en `catalogs.ts`. **El swap a backend real (apuntando al seed `V944__seed_local_dev_labels.sql` recién aplicado) es una iteración posterior** y queda fuera de este spec.

## 2. Modelo de datos

### Reusados (sin cambios)

`muestras/models/sample.model.ts` — `Sample` con `state: SampleState` y los campos del handoff (`barcode`, `study`, `branch`, `patient`, `date`, `time`, `urgent`).

### Nuevos — `muestras/models/transito.model.ts`

```ts
export interface RecommendedGroup {
  id: string;          // estable: `${branch}|${area}|${section}`
  branch: string;      // sucursal destino recomendada
  area: string;
  section: string;
  sampleIds: string[]; // referencias — NO copias de Sample
}

export interface TemporalLote {
  id: string;          // crypto.randomUUID() — estable, NO es el "Lote N" visible
  sampleIds: string[];
  branch: string;      // '' = sin asignar
  area: string;
  section: string;
  createdAt: number;   // epoch ms
}

export type SendOutcome = 'en-proceso' | 'en-transito';

export interface SendResult {
  enProceso: number;
  enTransito: number;
  detail: string;      // "SUCURSAL · Área · Sección [· Lote N]"
}

export interface TransitoDest {
  branch: string;
  area: string;
  section: string;
}
```

**Invariante de naming:** el número visible `"Lote N"` se calcula al renderizar con `index + 1` sobre el array `lotes`. **Nunca** se persiste ni se mete en el modelo. Borrar el Lote 2 de 3 hace que el Lote 3 pase a "Lote 2" gratis por el reorder.

### Extensión de `muestras/data/catalogs.ts`

Sumar (no romper lo existente):

```ts
export const SECTIONS: ReadonlyArray<string> = [
  'Autoanalizador A1', 'Autoanalizador A2', 'Mesada manual',
  'Citometría', 'Microscopía', 'Inmunoensayo', 'Cultivos',
  'Coagulómetro', 'Sedimento', 'PCR / NAT', 'Guardia / Urgencias',
];

export const STUDY_AREA: Readonly<Record<string, string>>;   // 16 mapeos del handoff + 12 actuales fusionados
export const AREA_SECTION: Readonly<Record<string, string>>; // 8 mapeos
export const AREA_BRANCH: Readonly<Record<string, string>>;  // 8 mapeos — clave del ruteo de la mochila
```

**`STUDIES` se fusiona** con los 16 del handoff (sumar los que no se solapen). Cada estudio en `STUDIES` debe existir en `STUDY_AREA`. Fallback defensivo: si un estudio no tiene mapeo, se rutea a `'Química clínica'`.

## 3. Arquitectura

### Estructura de archivos

```
src/app/features/analitica/muestras/
  pages/
    worklist/                       (sin cambios — sigue sirviendo recolección/procesamiento/descarte)
    transito/                       NUEVO
      transito.page.ts / .html / .scss / .spec.ts
      _tokens.scss                  paleta privada del handoff
  components/
    scan-bar/  sample-table/  batch-menu/  transition-dialog/   (sin cambios)
    transito/                       NUEVO sub-grupo
      transito-scan-bar/
      bulk-actions-bar/
      lote-card/
      recommended-group-card/
      sample-row/
      confirm-send-all-dialog/
  services/
    mock-samples.service.ts         (sin cambios)
    transito-lotes.service.ts       NUEVO — signals + invariantes + localStorage
    transito-lotes.service.spec.ts  NUEVO
  models/
    sample.model.ts  transition.model.ts                       (sin cambios)
    transito.model.ts               NUEVO
  data/
    catalogs.ts                     EXTENDIDO
```

### Routing

En `analitica.routes.ts`, el path `traslado` deja de cargar `WorklistPage`:

```ts
{
  path: 'traslado',
  canMatch: [sectionGuard('PREANALITICA')],
  loadComponent: () => import('./muestras/pages/transito/transito.page').then(m => m.TransitoPage),
  title: 'Tránsito',
},
```

(el guard de sección y el title se mantienen).

### Boundary contra futuro backend

`TransitoLotesService` consume samples desde `MockSamplesService.byState('transito')()`. El día que se conecte al backend, se introduce un `TransitoSourcePort` con dos adapters (`MockSampleAdapter` / `HttpSampleAdapter`). **No se introduce el port en esta iteración** — solo se mantiene la dependencia bien aislada (una única call, no esparcida por componentes).

## 4. `TransitoLotesService` — contrato e invariantes

### Estado interno (signals privados)

```ts
private readonly _lotes        = signal<TemporalLote[]>([]);
private readonly _activeLoteId = signal<string | null>(null);
private readonly _sel          = signal<ReadonlySet<string>>(new Set());
private readonly _editing      = signal<ReadonlySet<string>>(new Set());
private readonly _leaving      = signal<ReadonlySet<string>>(new Set());
```

### Derivados (`computed`)

- `lotedIds` — set de IDs que están en algún lote.
- `groups: RecommendedGroup[]` — toma `samples - lotedIds`, agrupa por `(AREA_BRANCH[area], area, AREA_SECTION[area])` donde `area = STUDY_AREA[study]`. Aplica `_groupOverrides` (ver abajo) si el operador editó el destino. Orden: primero `CURRENT_BRANCH` (procesa acá), después las otras.
- `stats: { total, groups, lotes }` — para los stat-chips del header.

### Estado adicional — overrides de groups

```ts
private readonly _groupOverrides = signal<Map<string, TransitoDest>>(new Map());
```

Cuando el operador edita el destino de un group recomendado con `updateDest`, el patch se guarda en `_groupOverrides[groupId]`. El `computed` de `groups` lo aplica al armar la lista (override pisa la recomendación de la mochila para esa key). Estos overrides **NO se persisten** en localStorage — son transient para esta sesión de página. Si las muestras subyacentes cambian y el group desaparece, el override queda huérfano y se garbage-collecta (limpieza barata: al enviar el group, se borra su entry; al recargar, el map arranca vacío).

### API pública

```ts
// queries (signals)
groups: Signal<RecommendedGroup[]>;
lotes: Signal<TemporalLote[]>;
activeLoteId: Signal<string | null>;
sel: Signal<ReadonlySet<string>>;
editing: Signal<ReadonlySet<string>>;
leaving: Signal<ReadonlySet<string>>;
stats: Signal<{ total: number; groups: number; lotes: number }>;

// commands
toggleSel(id: string): void;
toggleSelMany(ids: string[], on: boolean): void;
clearSel(): void;
createLote(ids: string[]): string;                                                       // returns new loteId
addToLote(loteId: string, ids: string[]): void;
dissolveLote(loteId: string): void;
setActiveLote(loteId: string | null): void;
toggleEditing(targetId: string): void;
updateDest(target: { kind: 'group' | 'lote'; id: string }, patch: Partial<TransitoDest>): void;
send(targetId: string, kind: 'group' | 'lote'): SendResult | null;
sendAll(): { enProceso: number; enTransito: number };
scan(code: string): { matchedId: string | null; outcome: 'added' | 'duplicate' | 'no-match' };
```

### Invariantes (encapsulados — los componentes no pueden romperlos)

1. **Una muestra existe en UN solo lugar.** Toda mutación (`createLote`, `addToLote`, `scan`) llama `removeFromAllLotes(id)` antes de insertar. Los groups son derivados, no se mutan: la muestra "sale" del group automáticamente cuando entra a un lote.
2. **Las listas pre-calculadas son recomendaciones.** El usuario puede editar destino de un group con `updateDest` — eso cambia los selects, no muta los samples crudas.
3. **Número visible por posición.** El service NO expone "Lote N"; los componentes hacen `index + 1`. Al borrar Lote 2 de 3, el reorder lo resuelve.
4. **Descartar lote** (`dissolveLote`): elimina el lote. Las muestras vuelven solas al group correspondiente porque `lotedIds` cambia → `groups` se recomputa con la regla de la mochila.
5. **Envío parcial.** `send(targetId, kind)`:
   - Si hay tildes EN ese container → envía solo las tildadas.
   - Si no hay tildes → envía todo el container.
6. **Lote sin destino → no se puede enviar.** `send` valida `branch && area && section`; si falta, retorna `null`. El botón está disabled en UI (defensivo en ambos lados).
7. **Outcome del envío.** `branch === CURRENT_BRANCH` → `'en-proceso'` (verde); otra → `'en-transito'` (azul). Se anticipa en el badge de la card.
8. **`sendAll`** envía TODAS las muestras de TODOS los groups a su destino calculado. **No toca lotes**. Deshabilitado si no hay groups.
9. **`scan(code)`:**
   - Match exacto por barcode, fallback `String.includes` solo si el exacto falla.
   - Si el match está en el lote activo → outcome `'duplicate'`, no muta. El page muestra toast warn "Ya está en Lote N".
   - Si el match no está en ningún lote → `removeFromAllLotes` + add al lote activo. Si no hay lote activo, crea uno (vacío de destino) y lo activa. El page hace flash amarillo ~1.1s en la fila agregada.
   - Sin match → outcome `'no-match'`, `matchedId: null`. El page **no muestra toast** por default (silencio intencional: scanners reales emiten códigos parciales mientras leen). Si futuro UX lo pide, se agrega ahí, no en el service.

### Persistencia localStorage

- **Clave:** `analitica.traslado.lotes`
- **Valor:** `TemporalLote[]` serializado (solo `id`, `sampleIds`, `branch`, `area`, `section`, `createdAt`).
- **Escritura:** `effect()` que serializa `_lotes()` en cada cambio.
- **Eliminación de la entrada:** cuando el lote se envía o se descarta, sale del array → effect persiste el array sin él.
- **Rehidratación** (en `constructor`):
  1. Parsear storage (try/catch — si está roto, descartar y arrancar vacío).
  2. Filtrar `sampleIds` que ya no estén en `state === 'transito'`.
  3. Eliminar lotes que queden vacíos post-filtro.
  4. Setear `_lotes` con el resultado.
- **El número visible NUNCA se persiste** (invariante 3).

## 5. Componentes presentacionales

Todos `standalone`, `ChangeDetectionStrategy.OnPush`, inputs vía `input()`, outputs vía `output()` cuando hace falta delegar al page.

### `TransitoPage`

Orquesta. Inyecta `TransitoLotesService` + `MessageService`. Renderiza:
1. Header (h1 "Muestras en tránsito" + subtítulo + 3 stat-chips desde `service.stats()`).
2. `<div class="sticky">` con `<app-transito-scan-bar>` + `<app-bulk-actions-bar>`.
3. Header de columnas estático.
4. `@for (lote of service.lotes(); track lote.id; let i = $index)` → `<app-lote-card [lote]="lote" [number]="i+1">`.
5. `@for (group of service.groups(); track group.id)` → `<app-recommended-group-card [group]="group">`.
6. Empty state si ambos vacíos.
7. `<p-toast>` + `<app-confirm-send-all-dialog>`.

### `TransitoScanBarComponent`

- Input: `activeLoteNumber: number | null` (el page lo calcula con `findIndex`).
- Markup: card blanca, input mono 48px alto con `<i class="pi pi-barcode">`, botón "Enviar todo" (lila suave, `<i class="pi pi-truck">`).
- Placeholder dinámico vía `computed()`: "Escaneá para agregar a Lote N…" o "Escaneá una muestra para crear un lote temporal…".
- Outputs: `enter(code: string)`, `sendAllClick()`.

### `BulkActionsBarComponent`

- Lee `service.sel()`, `service.lotes()`.
- 2 estados (`@if(sel().size === 0)`):
  - **Reposo:** card outline dashed, texto muted, botón outline disabled.
  - **Activa:** gradient marca, chips translúcidos `→ Lote N · count` por cada lote, botón "+ Crear lote temporal", chip "✕ Limpiar".
- Outputs: `createLote()`, `addToLote(loteId: string)`, `clear()`.

### `LoteCardComponent`

- Inputs: `lote: TemporalLote`, `number: number`.
- Lee del service: `sel()`, `editing()`, `activeLoteId()`, `leaving()`, samples resueltas de `sampleIds`.
- Computeds locales: `hasDest`, `selectedInLote`, `outcome`, `selectAllChecked` (todas / algunas / ninguna — para checkbox del header).
- Markup: header (checkbox lote + icono `pi-objects-column` + título "Lote N" + tag `TEMPORAL` + subtítulo destino o warning ámbar `⚠ Sin destino — asignalo para poder enviar` + badge outcome si hay destino + contador + botón "Escanear acá" toggle + botón ✕) + form de destino SIEMPRE visible (selects + botón Enviar) + filas `<app-sample-row>`.
- Outputs: `toggleAll()`, `dissolve()`, `setActive()`, `destChange(patch)`, `send()`.
- Estado visual: borde 2px marca + sombra elevada; sin destino → borde y header ámbar.

### `RecommendedGroupCardComponent`

- Input: `group: RecommendedGroup`.
- Mismo patrón que `LoteCardComponent` con diferencias:
  - Form de destino oculto por default — toggle vía botón "Editar destino" (controlado por `service.editing()`).
  - Sin "Escanear acá" ni botón ✕.
  - Icono header: `pi-inbox` verde si `outcome === 'en-proceso'` / `pi-truck` azul si `'en-transito'`.
  - El form de destino, cuando se abre, NO tiene botón Enviar (se envía con el botón del header).
- Outputs: `toggleAll()`, `toggleEditing()`, `destChange(patch)`, `send()`.

### `SampleRowComponent`

- Inputs: `sample: Sample`, `selected: boolean`, `flashing: boolean`, `leaving: boolean`.
- Markup: checkbox 20px (azul marca + barra izq 3px + fondo `#eef0ff` al tildar) + barcode mono 14px (+ tag URGENTE rojo si `sample.urgent`) + paciente 11.5px muted debajo / estudio / origen con `pi-map-marker` / fecha+hora / badge "En tránsito" teal.
- Click en toda la fila → output `toggle()`.
- Clases CSS condicionales: `is-selected`, `is-flashing`, `is-leaving`.

### `ConfirmSendAllDialogComponent`

- Basado en `p-dialog` (PrimeNG — design system del proyecto).
- Inputs: `open: boolean`, `breakdown: { enProceso: number; enTransito: number; groupsCount: number }` (total = enProceso + enTransito, calculado en template).
- Markup según handoff: icono `pi-truck` en pastilla verde + título "Enviar todo según la recomendación" + texto con totales bold + filas de outcome verde/azul + nota ⚠ + footer Cancelar (ghost) / Enviar N (verde `#0f8a55`).
- Outputs: `cancel()`, `confirm()`. Click en overlay → cancela (default de `p-dialog`).

### Animaciones

- `@keyframes gx-flash` — amarillo `#fef3c7` con opacidad cayendo en 1.1s (al entrar por scan).
- `@keyframes gx-leaving` — `translateX(24px)` + `opacity: 0` en 360ms ease-in (al enviar).
- Wrapped en `@media (prefers-reduced-motion: no-preference) { ... }`. Con `reduce`: fade 100ms sin movimiento.
- Service: al enviar, agrega IDs a `_leaving`, espera 360ms, llama mutación real del mock, limpia `_leaving`.
- Page: maneja flash setting `flashId` signal + `setTimeout` (igual que worklist hoy).

### Toasts (PrimeNG `MessageService`)

| Acción | severity | summary | detail |
|---|---|---|---|
| `createLote` | success | `Lote N temporal creado · X muestras` | `Asignale destino y envialo cuando quieras` |
| `addToLote` | info | `X muestras → Lote N` | — |
| `scan` duplicate | warn | `Ya está en Lote N` | — |
| `dissolveLote` | secondary | `Lote N descartado` | `X muestras volvieron a su workspace recomendado` |
| `send` | success | `X muestras → En proceso/En tránsito` | `SUCURSAL · Área · Sección [· Lote N]` |
| `sendAll` | success | `N muestras enviadas según la recomendación` | `X en proceso · Y en tránsito` |

## 6. Estilos y tokens

**Tokens privados** en `muestras/pages/transito/_tokens.scss`. Cada SCSS de los componentes de tránsito hace `@use './tokens' as *;` con path relativo. Tokens (del handoff):

| Token | Valor |
|---|---|
| `--gx-brand` | `#4b4ddb` (hover `#3a3cc0`) |
| `--gx-bg` | `#f5f6f9` |
| `--gx-ink` | `#22243a` · `--gx-ink-2` `#4a4d63` · `--gx-muted` `#7c8092` |
| `--gx-border` | `#e8e9f0` (suave `#eef0f5`) |
| `--gx-sel-bg` | `#eef0ff` · `--gx-sel-border` `#c7caf6` |
| `--gx-green` | `#0f8a55` bg `#e3f6ec` |
| `--gx-blue` | `#2563eb` bg `#e8f0ff` |
| `--gx-teal` | `#0f8a7d` bg `#e3f6f2` |
| `--gx-amber` | `#b5740c` bg `#fcf1dd` |
| `--gx-red` | `#d83a3a` bg `#fdebeb` |
| `--gx-slate` | `#5b6170` bg `#eceef3` |

Radios: card 14px / inputs/botones 10-11px / modal 16-18px. Sombras: `0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04)` (card) / `0 24px 60px rgba(28,30,55,.22)` (modal).

**No abrir el refactor del theme global del proyecto en esta iteración** — cuando se conecte al backend y madure el design system general, se mueven los tokens al theme.

**Tipografía:** Poppins (400/500/600/700) + Roboto Mono. **Cambio fuera del módulo `muestras/`:** si no están cargadas, sumar `<link>` a Google Fonts en `src/index.html` (item explícito del plan de implementación porque toca un archivo compartido) + declarar en `_tokens.scss`. Fallback: `system-ui` + `ui-monospace`. Aplicación scopeada a `.transito-page` (no toca el resto de la app).

**Layout sticky (gotcha Chromium):** el contenedor de scroll tiene `padding-top: 0` (mover el espacio al header interno). La barra sticky usa `position: sticky; top: 0; z-index: 50;` + full-bleed via `margin-inline: -30px; padding-inline: 30px;` para cubrir el padding lateral.

**Grid de columnas único:** `46px 1.4fr 1.5fr 1.3fr 1fr 150px; gap: 14px` — `@mixin gx-row-grid` en `_tokens.scss`, reusado en `sample-row.scss` y en el header de columnas del page.

**Accesibilidad:**
- `role="checkbox"` + `aria-checked` en la fila completa (toda la fila es clickable).
- `aria-pressed` en "Escanear acá" cuando el lote está activo.
- `:focus-visible` con `outline: 2px solid var(--gx-brand)`.
- `p-dialog` da `role="dialog"`, `aria-modal`, focus trap y Escape gratis.
- Mensajes en español, sin leak técnico (regla 4 de CLAUDE.md).

## 7. Testing

### `transito-lotes.service.spec.ts` (Vitest)

Cubre las invariantes — donde está el riesgo real:

- `createLote(ids)` → la muestra desaparece del group correspondiente (inv. 1).
- Mover muestra entre lotes → no queda duplicada (inv. 1).
- `dissolveLote` → muestras vuelven al group correcto recalculado por la mochila (inv. 4).
- Orden de `lotes()` post-delete del medio: `[loteA, loteC]` (sin gaps) — habilita el render de "Lote 2" en el siguiente (inv. 3 testeado por consecuencia).
- `send` con tildes parciales → solo se van las tildadas; sin tildes → se van todas (inv. 5).
- `updateDest` sobre un group → `groups()` lo refleja en el siguiente render; `send(groupId)` usa el override; al enviar el group, el override se borra del map.
- `send` a lote sin destino → retorna `null`, no muta estado (inv. 6).
- `outcome`: `branch === CURRENT_BRANCH` → `'en-proceso'`; otra → `'en-transito'` (inv. 7).
- `sendAll` no toca lotes (inv. 8).
- `scan`: exacto / `includes` / sin match / duplicado en lote activo (3 outcomes) (inv. 9).
- localStorage round-trip: setear lotes → serializar → reinstanciar service → mismos lotes.
- Rehidratación con muestras que ya no están en tránsito → se descartan; lote vacío post-filtro → eliminado.

### `transito.page.spec.ts` (smoke — patrón del worklist)

- Monta el page con service stubeado y verifica que renderiza header, sticky, ≥1 group y ≥1 lote dado un seed mock.
- Click en "Escanear acá" → llama `setActiveLote` en el service.
- Click en fila → llama `toggleSel` en el service.
- Modal "Enviar todo" se abre con el botón del scan-bar y se cierra con Cancelar.

### Fuera de scope de tests

- Animaciones (ruido alto, valor bajo).
- Cada combinación de detail del toast (un caso por outcome alcanza).
- E2E con Playwright (se hace cuando conectemos al backend).

### Cómo correr

`npm test` / `ng test` — NO `npx vitest run` (rompe con `templateUrl`).

## 8. Fuera de scope (esta iteración)

- **Backend real.** El swap a Spring Boot detrás de un `TransitoSourcePort` queda para la próxima iteración, cuando esté el endpoint sobre el seed `V944__seed_local_dev_labels.sql` (rama `label-machine-refactor`). El service y los componentes están diseñados para minimizar el blast radius del swap (un solo punto de consumo de samples).
- **Refactor del theme global.** Los tokens del handoff viven privados de la pantalla; cuando madure el design system del proyecto se promueven a theme global.
- **Migrar las otras 3 pantallas** (recolección, procesamiento, descarte) a este patrón. Siguen sobre `WorklistPage` con su lógica actual.
- **SSE / WebSockets.** Si en algún momento se requiere refresco en vivo del listado de tránsito, va sobre el estándar de polling + ETag del proyecto (sección 5 de CLAUDE.md) — no es necesario en esta iteración (datos manipulados solo por el operador local).

## 9. Definition of Done

- [ ] `npm test` verde en FRONTEND-LABORATORIO (con los specs nuevos).
- [ ] `npm run build` sin errores ni warnings nuevos.
- [ ] `/analitica/traslado` renderiza la nueva pantalla con groups + lotes mock.
- [ ] Las 9 invariantes del service cubiertas por tests unitarios.
- [ ] Smoke test del page pasa.
- [ ] Las otras 3 pantallas (`/analitica/recoleccion`, `/procesamiento`, `/descarte`) siguen funcionando idénticas a hoy.
- [ ] Verificación manual del operador: tildar varias muestras, crear lote, asignar destino, escanear, enviar parcial, enviar todo, descartar lote, recargar la página y comprobar persistencia.
- [ ] No hay leak de internals en mensajes (regla 4 CLAUDE.md).

## 10. Referencias

- Handoff: `C:\Users\Mateo\Desktop\tesis\design_handoff_traslado_angular\README.md` + `prototype/`.
- Mochila simulada en el prototipo: `prototype/js/shared.jsx` (mapas `STUDY_AREA`, `AREA_BRANCH`, `AREA_SECTION`).
- Lógica de vista pre-calculada: `prototype/js/traslado-grouped.jsx`.
- CLAUDE.md del repo: reglas de testing, errores en español, polling, NgRx (no aplica acá — usamos signals service).
