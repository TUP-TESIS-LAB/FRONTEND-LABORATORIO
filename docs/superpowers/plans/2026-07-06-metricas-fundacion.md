# Kit de métricas (Fase 0) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Construir el kit compartido `shared/metrics` que los 3 dashboards de métricas heredan (tipos, wrapper de gráfico, filter-bar, helpers), sin lógica de un dashboard puntual.

**Architecture:** Componentes standalone + OnPush + signals bajo `src/app/shared/metrics/`. Charting vía `p-chart` (Chart.js) encapsulado en un único wrapper. Consumo de datos reusa `core/refresh` (polling + ETag/304) — el kit no lo reimplementa.

**Tech Stack:** Angular 21, PrimeNG 21 (`p-chart`, `p-datepicker`, `p-multiSelect`, `p-select`), Tailwind v4, Chart.js (nuevo), Vitest.

**Jira:** [KAN-201](https://exequielsantoro.atlassian.net/browse/KAN-201)

## Global Constraints

- Componentes standalone, `changeDetection: OnPush`, signals API (`input()`/`output()`/`model()`), control flow `@if/@for`. Prefijo de selector `ui-`.
- Español en toda UI, sin leak de internals, **sin emojis** — usar PrimeIcons.
- Colores SIEMPRE desde tokens (`var(--brand-*)`, `var(--ds-*)`) o el preset Aura — nunca hex hardcodeado.
- Charting encapsulado 100% en `ui-metric-chart`; ningún otro archivo importa Chart.js.
- Alias de import: `@shared/*`, `@core/*`.

---

## File Structure

- `src/app/shared/metrics/models/metric-filter.model.ts` — `MetricFilter`, `MetricGranularity`.
- `src/app/shared/metrics/models/metric-envelopes.model.ts` — `MetricKpi`, `MetricDelta`, `MetricSeries`, `MetricDataset`, `MetricBreakdown`, `MetricSlice`.
- `src/app/shared/metrics/util/build-metric-params.ts` — `buildMetricParams(filter): HttpParams`.
- `src/app/shared/metrics/util/metric-kpi.util.ts` — `formatKpiValue`, `kpiDeltaMeta` (para alimentar `ui-stat-card`).
- `src/app/shared/metrics/components/metric-chart/metric-chart.component.ts` — `ui-metric-chart`.
- `src/app/shared/metrics/components/metric-filter-bar/metric-filter-bar.component.ts` — `ui-metric-filter-bar`.
- `src/app/shared/metrics/index.ts` — barril de export.
- Tests co-ubicados `*.spec.ts` por archivo con lógica.

---

## Task 1: Dependencia de charting

**Files:** `package.json`

- [x] Instalar Chart.js: `npm i chart.js` (PrimeNG `p-chart` lo requiere como peer). Verificar que `primeng/chart` (`ChartModule`) resuelve. Registrar en el commit el número de versión resuelto. → resuelto en `chart.js@4.5.1`.
- [x] `npm run build` para confirmar que el árbol sigue compilando.
- [x] Commit: `chore(metricas): agregar chart.js para p-chart`.

## Task 2: Tipos del contrato (espejo del backend)

**Files:** `models/metric-filter.model.ts`, `models/metric-envelopes.model.ts`

**Produces:**
```ts
export type MetricGranularity = 'DAY' | 'WEEK' | 'MONTH';
export interface MetricFilter { dateFrom: string; dateTo: string; branchId?: number; granularity: MetricGranularity; }
export interface MetricDelta { previousValue: number | null; changePct: number | null; }
export interface MetricKpi { key: string; label: string; value: number | null; unit: string; delta?: MetricDelta; }
export interface MetricDataset { key: string; label: string; values: number[]; }
export interface MetricSeries { labels: string[]; datasets: MetricDataset[]; }
export interface MetricSlice { key: string; label: string; value: number; }
export interface MetricBreakdown { dimension: string; slices: MetricSlice[]; }
```
- [x] Crear ambos archivos con esas interfaces (matchean el JSON del backend: `value` nullable = sin datos ≠ 0).
- [x] Commit: `feat(metricas): tipos de contrato de métricas`.

## Task 3: `buildMetricParams`

**Files:** `util/build-metric-params.ts` + `.spec.ts`

**Produces:** `buildMetricParams(filter: MetricFilter): HttpParams`

- [x] Test (Vitest): con `{dateFrom:'2026-01-01', dateTo:'2026-06-30', granularity:'MONTH'}` → params tiene `dateFrom`, `dateTo`, `granularity=MONTH`, y NO tiene `branchId`. Con `branchId:5` → params incluye `branchId=5`.
- [x] Implementar: construir `HttpParams` seteando `dateFrom`/`dateTo`/`granularity` siempre y `branchId` solo si está definido.
- [x] Correr test → pasa. Commit: `feat(metricas): helper buildMetricParams`.

## Task 4: `metric-kpi.util`

**Files:** `util/metric-kpi.util.ts` + `.spec.ts`

**Produces:** `formatKpiValue(kpi: MetricKpi): string`, `kpiDeltaMeta(delta?: MetricDelta): { icon: string; cssVar: string } | null`

- [x] Test: `formatKpiValue` con `value:null` → `'—'`; con valor → número formateado (locale es-AR) + unidad. `kpiDeltaMeta` con `changePct:null` → `null`; con `changePct>0` → icon `pi pi-arrow-up` + `var(--ds-success)`; `<0` → `pi pi-arrow-down` + `var(--ds-danger)`. (Extra: `changePct===0` → `pi pi-minus` + `var(--ds-text-muted)`, no especificado en el spec pero necesario para no dejar el caso sin cubrir.)
- [x] Implementar (PrimeIcons, tokens DS, sin emojis).
- [x] Test pasa. Commit: `feat(metricas): helpers de formato de KPI`.

## Task 5: `ui-metric-chart`

**Files:** `components/metric-chart/metric-chart.component.ts` + `.spec.ts`

**Consumes:** `MetricSeries`, `MetricBreakdown`. **Produces:** selector `ui-metric-chart`.

Inputs: `type: 'line'|'bar'|'pie'|'doughnut'` (input.required), `series?: MetricSeries`, `breakdown?: MetricBreakdown`, `loading = input(false)`, `height = input('320px')`.

- [x] Test: dado un `MetricSeries` con `labels:['ene','feb']` y 1 dataset `values:[10,20]`, un `computed` `chartData()` produce `{ labels:['ene','feb'], datasets:[{ label, data:[10,20], ...color }] }`. Dado un `MetricBreakdown` con 2 slices y `type:'pie'`, `chartData()` produce labels=slice.label, data=slice.value.
  - **Desvío:** el mapeo se extrajo a funciones puras en `chart-data.mapper.ts` (`mapMetricSeriesToChartData`/`mapMetricBreakdownToChartData`), testeadas directo sin `TestBed`. Motivo: este entorno de vitest tiene un bug reproducible donde `TestBed.createComponent(...) + setInput()` (y hasta bindings estáticos en un host de test) no propagan `input()`/`input.required()` de forma confiable — el mismo problema ya documentado en `cobro-atencion.component.ts` para `input.required()+setInput()`, pero más amplio (afecta también `input()` sin default y bindings estáticos de otros componentes ya existentes como `ui-empty-state`). El `computed() chartData()` del componente delega 1:1 a estas funciones puras, así que el contrato del plan queda cubierto igual.
- [x] Implementar: `p-chart` con `[type]`, `[data]="chartData()"`, `[options]="chartOptions()"`. Resolver paleta desde CSS vars (`--brand-primary`, `--ds-*`) vía `getComputedStyle(document.documentElement)`. Empty-state (`ui-empty-state` o mensaje) cuando no hay datos. Skeleton cuando `loading()`.
  - **Desvío:** `type` quedó como `@Input({ required: true })` clásico (no `input.required()`) por el mismo bug de vitest — ver NOTE en el componente. No cambia el contrato público (sigue siendo required desde el punto de vista del template consumidor).
- [x] Test pasa. Commit: `feat(metricas): ui-metric-chart (wrapper p-chart)`.

## Task 6: `ui-metric-filter-bar`

**Files:** `components/metric-filter-bar/metric-filter-bar.component.ts` + `.spec.ts`

**Consumes:** `MetricFilter`, lista de sucursales accesibles. **Produces:** selector `ui-metric-filter-bar`, output `filterChange: MetricFilter`.

Inputs: `branches = input<{ id: number; name: string }[]>([])`, `initial?: Partial<MetricFilter>`. Output/model: `filterChange`.

- [x] Test: al cambiar el rango de fechas o la granularidad, emite un `MetricFilter` válido (dateFrom ≤ dateTo). Sin sucursal seleccionada → `branchId` undefined (todas).
- [x] Implementar: `p-datepicker` (rango con `[maxDate]`/`[minDate]` cruzados), `p-select` de sucursal alimentado por `branches()`, `p-select` de granularidad (DAY/WEEK/MONTH, default MONTH). Molde: filtros de `financiero/pages/sucursales/sucursales-resumen.page.ts`. `appendTo="body"`, `styleClass="w-full"`.
  - **Desvío:** sucursal quedó como `p-select` (single-select) en vez de `p-multiSelect`. El contrato `MetricFilter.branchId` (Task 2) es `number` singular, no un array — un multiSelect no encaja con ese tipo. `p-select` con `[showClear]="true"` cubre "Todas" = sin selección.
- [x] Test pasa. Commit: `feat(metricas): ui-metric-filter-bar`.

## Task 7: Barril + verificación

**Files:** `src/app/shared/metrics/index.ts`

- [x] Exportar todos los tipos, utils y componentes públicos.
- [x] `npm run build` (compila) + tests de `shared/metrics` → verde.
  - **Desvío:** se corrió `npx vitest run src/app/shared/metrics` en vez de `npm run test -- shared/metrics`. `npm run test` (`ng test`, builder `@angular/build:unit-test`) compila TODO el proyecto con TypeScript estricto antes de ejecutar cualquier test, y falla por errores de tipos preexistentes y ajenos a este cambio en `empresa/` y `sucursales/` (`EligibleUser`, `Employee.hasSignature` faltante) — confirmado con `git status` que esos archivos no fueron tocados en este trabajo. `npx vitest run` corre directo contra `vitest.config.ts` sin ese paso de compilación global y da la señal real del kit: 5 archivos, 20 tests, todos verdes. `npm run build` (producción) también compila limpio.
- [x] Documentar en un comentario del barril la convención de consumo (buildMetricParams + withPolling + slice NgRx clásico + ui-stat-card/ui-metric-chart).
- [x] Commit: `feat(metricas): barril del kit de métricas`.

## Self-review (cierre)
- [x] Cobertura del spec: tipos, chart, filter-bar, kpi util, params — todos cubiertos (20 tests).
- [x] Sin hex hardcodeado en el flujo real; los únicos hex del kit son fallbacks de paleta en `ui-metric-chart` para cuando `document`/CSS vars no están disponibles (Canvas no resuelve `var()`), documentados como espejo exacto de los defaults de `tokens.scss` — nunca se usan si el token existe.
- [x] Chart.js solo en `ui-metric-chart` (`grep -rn "primeng/chart" src/app` → único hit).
- [x] Nombres consistentes entre tasks.

## Nota de entorno (aplica a Tasks 5 y 6)
Este workspace de vitest tiene un bug reproducible: `TestBed.createComponent(...)` seguido de `setInput()` (o incluso un binding **estático** en un host de test) no propaga de forma confiable valores a componentes que usan `input()`/`input.required()` sin ver el signal ya resuelto — se reprodujo tanto con `input.required()` como con `input()` sin default, y hasta con `ui-empty-state` (componente preexistente, no tocado en este cambio). Ya estaba documentado parcialmente en `cobro-atencion.component.ts`. Workaround aplicado en este kit:
- `ui-metric-chart`: `type` pasó a `@Input({ required: true })` clásico; el mapeo real se extrajo a funciones puras en `chart-data.mapper.ts`, testeadas sin pasar por TestBed.
- `ui-metric-filter-bar`: se testea invocando los métodos `protected` del componente directamente (no vía binding), aprovechando que `output()` sí funciona sin problemas en este entorno.
No se tocó ningún componente fuera de este kit para "arreglar" el bug — queda fuera de alcance de la Fase 0.
