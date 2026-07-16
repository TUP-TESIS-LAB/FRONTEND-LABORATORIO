# Diseño — Dashboards de métricas (integración frontend)

> **Fecha:** 2026-07-06
> **Repo:** FRONTEND-LABORATORIO (Angular 21 + NgRx clásico + PrimeNG 21 + Tailwind v4)
> **Backend:** 56 endpoints de métricas ya entregados (PR #125), polleables con ETag/304.
> **Jira:** [KAN-201](https://exequielsantoro.atlassian.net/browse/KAN-201)

## Intención

Integrar los dashboards de métricas de las 5 áreas del backend (financiero, analítica, preanalítica, postanalítica, flujo operativo) al front, **por reuso** de sus componentes, convenciones y gating existentes. Respetar: design system (preset Aura + tokens de marca multi-tenant), gating por módulo activable + sección + rol, polling ETag/304, NgRx clásico, y las reglas del proyecto (español sin leak, PrimeIcons, sin emojis).

## Enfoque (espejo del backend)

**Fase 0 — Kit compartido de métricas (bloqueante) → Fases 1-3 — un dashboard por feature (agent teams en paralelo).**

Se agrupan las 5 áreas del backend en **3 dashboards del front**, alineados a la estructura real de features:
- **Financiero** (módulo activable `Financiero`).
- **Analítica** con tabs internas **Volumen / Preanalítica / Postanalítica** (feature CORE; cada tab gateada por su `AccessSection`).
- **Flujo operativo** (módulo activable `Turnos` + sección de atención/extracciones).

---

## Fase 0 — Kit compartido: `src/app/shared/metrics/`

Contrato congelado que los 3 dashboards heredan. Solo piezas reusables, sin lógica de negocio de un dashboard puntual.

### Tipos (matchean el JSON del backend 1:1)
- `models/metric-filter.model.ts` — `MetricFilter { dateFrom: string /*ISO date*/; dateTo: string; branchId?: number; granularity: MetricGranularity }`, `MetricGranularity = 'DAY' | 'WEEK' | 'MONTH'`. Helper `buildMetricParams(filter): HttpParams` (query params `dateFrom/dateTo/branchId/granularity`).
- `models/metric-envelopes.model.ts` — espejo de los envelopes del backend:
  - `MetricKpi { key: string; label: string; value: number | null; unit: string; delta?: MetricDelta }`, `MetricDelta { previousValue: number | null; changePct: number | null }`. **`value` nullable = sin datos (≠ 0).**
  - `MetricSeries { labels: string[]; datasets: MetricDataset[] }`, `MetricDataset { key: string; label: string; values: number[] }`.
  - `MetricBreakdown { dimension: string; slices: MetricSlice[] }`, `MetricSlice { key: string; label: string; value: number }`.

### Componentes reusables (standalone, OnPush, signals, prefijo `ui-`)
- **`ui-metric-chart`** (`components/metric-chart/`) — wrapper de `p-chart` (única pieza que toca Chart.js). Inputs: `type` (`'line' | 'bar' | 'pie' | 'doughnut'`), `series?: MetricSeries`, `breakdown?: MetricBreakdown`, `loading?`. Mapea al formato de Chart.js resolviendo colores desde el preset Aura + tokens de marca (`var(--brand-*)`, `var(--ds-*)`) leídos vía `getComputedStyle`/CSS vars, para respetar el theming multi-tenant. Empty-state cuando no hay datos.
- **`ui-metric-filter-bar`** (`components/metric-filter-bar/`) — `p-datepicker` (rango, con `[maxDate]`/`[minDate]` cruzados), `p-multiSelect` de sucursal (alimentado SOLO con las sucursales que el usuario puede ver), `p-select` de granularidad. Emite un `MetricFilter` vía `model()`/`output()`. Reusa el patrón de filtros de `sucursales-resumen.page.ts`.
- **`util/metric-kpi.util.ts`** — helpers de formato para alimentar el **`ui-stat-card` existente** desde un `MetricKpi`: `value === null → "—"`, formateo de unidad, flecha/color del delta (`changePct` null → sin flecha). NO se crea una KPI card nueva; se reusa `ui-stat-card`.

### Datos / polling (reusa `core/refresh` tal cual)
- El kit NO reimplementa polling. Documenta el patrón: cada dashboard-feature tiene su `*-metrics-api.service.ts` (HttpClient + `buildMetricParams` + `withPolling()`), su slice NgRx clásico (`actions/effects/reducer/selectors`), y el effect distingue `isNotModified(res)` → `*NotModified`. Intervalo 5s, pausa en `document.hidden` — todo lo da `PollingService`.

### Charting — dependencia nueva
Agregar `chart.js` + usar `p-chart` de `primeng/chart`. Es la **única dependencia nueva**. Elegida por ser la integración nativa de PrimeNG (hereda Aura, respeta el theming del tenant sin CSS aparte). Encapsulada 100% dentro de `ui-metric-chart` — ningún dashboard importa Chart.js directo.

---

## Fases 1-3 — Dashboards (un agent team por dashboard, en paralelo tras la Fase 0)

Cada dashboard llena su stub/ruta existente y compone: `ui-page-header` + grid de `ui-stat-card` (KPIs) + `ui-metric-chart` (series/breakdowns) + `ui-table` (detalle) + `ui-refresh-indicator`. Estructura por feature: `pages/dashboard/` + `services/*-metrics-api.service.ts` + `store/metrics/*`.

### Gating (respeta módulo + sección + rol, espejando el `@PreAuthorize` del backend)

| Dashboard | Módulo (`moduleActiveGuard`) | Sección (`sectionGuard`) | Roles (`hasRoleGuard`) |
|---|---|---|---|
| Financiero | `ModuleKey.Financiero` | `FINANCIERO` | `ADMINISTRADOR` |
| Analítica (tabs) | — (CORE, siempre) | por tab: `ANALITICA` / `PREANALITICA` / `POSTANALITICA` | `BIOQUIMICO`, `ADMINISTRADOR` |
| Flujo operativo | `ModuleKey.Turnos` | `RECEPCION` / `EXTRACCIONES` | `ADMINISTRADOR`, `RESPONSABLE_SECRETARIA` |

- Ruta nueva en `<feature>.routes.ts` con los `canMatch` que correspondan; registrar en `app.routes.ts`; agregar el ítem a `NAV_SECTIONS` (`sidebar.nav.ts`) con `moduleKey`/`sectionKey`/`roleKey`. El menú se filtra solo.
- Si el tenant tiene Financiero/Turnos apagado, el dashboard desaparece de ruta y menú automáticamente.
- La sucursal del filtro se limita a las accesibles del usuario (consistente con el control de acceso por sucursal del backend, que devuelve 403 ante una sucursal ajena).

### Contenido por dashboard (de lo computable hoy en el backend)
- **Financiero**: recaudación (KPI + serie + breakdown por método/sucursal), particular vs obra social, liquidaciones pendientes/vencidas, arqueo, conciliación, tesorería.
- **Analítica** (tabs): Volumen por NBU/determinación/sección + productividad + atenciones + demografía · Preanalítica (rechazo, TAT, volumen) · Postanalítica (TAT firma, autoverificación, reglas, versiones, estados).
- **Flujo operativo**: volumen turnos/cola, cancelación, ocupación de agenda, espera de llamado, carga por extractor, y las 3 métricas "en vivo" (cola/boxes/urgentes) con `ui-refresh-indicator`.

---

## Flujo de datos

`ui-metric-filter-bar` emite `MetricFilter` → action NgRx → effect llama `*-metrics-api.service` con `buildMetricParams` + `withPolling()` → `etagInterceptor` agrega `If-None-Match`, cachea ETag, 304 → sentinel → effect despacha `*Success` o `*NotModified` → selector expone KPIs/series/breakdowns vía `selectSignal` → el componente los pasa a `ui-stat-card` / `ui-metric-chart`. Errores → `mapXError` (español) → `NotificationService`.

## Manejo de errores
Regla #4: todo `HttpErrorResponse` mapeado a español user-friendly en el effect, sin leak. Estados vacíos (KPI `value === null`, serie sin buckets) se muestran como "—"/empty-state, NO como error ni como 0.

## Testing
Vitest. Por el kit: tests de `buildMetricParams`, del mapeo `MetricSeries/Breakdown → datos de p-chart` en `ui-metric-chart`, y del formato de `metric-kpi.util`. Por dashboard: test del effect (success/NotModified/error) y render del componente con datos mock.

## Decomposición y orden
1. **Fase 0 — kit** (bloqueante, 1 unidad de trabajo, sin agent teams).
2. **Financiero** (piloto — valida el kit end-to-end contra el back real).
3. **Analítica** y **Flujo operativo** (agent teams en paralelo tras validar el piloto).

Cada dashboard = su propio ciclo con ticket de Jira.

## Fuera de alcance
- Las features bloqueadas del backend (congresos/epidemiología, cuellos de botella histórico) — no tienen endpoints todavía.
- Unificar `ModuleKey` (core) con `ModuleCode`/catálogo saas-admin — solo haría falta si "dashboards" fuera un módulo activable propio; no lo es (montan sobre módulos existentes).
- Un cuarto envelope tipo pivot/matriz — YAGNI, igual que en el backend.
