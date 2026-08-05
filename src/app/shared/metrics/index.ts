/**
 * Kit compartido de métricas (Fase 0). Contrato congelado que heredan los 3 dashboards
 * de métricas (Financiero, Analítica, Flujo operativo) — ver
 * `docs/superpowers/specs/2026-07-06-metricas-dashboards-design.md`.
 *
 * Convención de consumo para cada dashboard-feature:
 * 1. Un `*-metrics-api.service.ts` (`@Injectable({ providedIn: 'root' })`) que arma la
 *    URL del endpoint de métricas y llama `buildMetricParams(filter)` para los query
 *    params, agregando `context: withPolling()` (de `@core/refresh`) para que el
 *    `etagInterceptor` sume `If-None-Match` y el effect distinga `NotModified`.
 * 2. Un slice NgRx clásico del feature (`actions/effects/reducer/selectors`) — el
 *    effect llama al service, resuelve `isNotModified(res)` → `*NotModified` o
 *    `*Success`, y mapea errores HTTP a español sin leak (Regla #4 del proyecto).
 * 3. La page del dashboard consume el store con `store.selectSignal(...)`, pasa
 *    `MetricKpi` por `formatKpiValue`/`kpiDeltaMeta` a `ui-stat-card` (existente — NO se
 *    crea una KPI card nueva), y `MetricSeries`/`MetricBreakdown` directo a
 *    `ui-metric-chart`. El filtro de UI se arma con `ui-metric-filter-bar`, cuyo
 *    `filterChange` dispara la action que carga los datos.
 *
 * Nada de este kit reimplementa polling — reusa `PollingService`/`withPolling()` tal
 * cual. Chart.js está encapsulado 100% en `ui-metric-chart`; ningún otro archivo del
 * proyecto debe importarlo directamente.
 */

// ── Tipos ────────────────────────────────────────────────────────────────────
export * from './models/metric-filter.model';
export * from './models/metric-envelopes.model';

// ── Utils ────────────────────────────────────────────────────────────────────
export * from './util/build-metric-params';
export * from './util/metric-kpi.util';
export * from './util/metric-label.util';
export * from './util/metric-format.util';

// ── Componentes ──────────────────────────────────────────────────────────────
export * from './components/metric-chart/metric-chart.component';
export * from './components/metric-chart-card/metric-chart-card.component';
export * from './components/metric-filter-bar/metric-filter-bar.component';
