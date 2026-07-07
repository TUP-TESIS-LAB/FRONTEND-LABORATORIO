// NOTA: se importa directo del submódulo (no del barrel `@shared/metrics`) a propósito.
// Este modelo lo consume el slice NgRx del dashboard, que está registrado globalmente
// (no lazy) en `app.config.ts`. El barrel re-exporta `ui-metric-chart`, que carga
// Chart.js con side-effects (`Chart.register(...)`) — no es tree-shakeable, así que
// cualquier import eager del barrel infla el bundle inicial (~337 kB). El barrel queda
// reservado para los componentes de tab, que solo se alcanzan vía la ruta lazy.
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';

/**
 * Envelopes específicos del dashboard de métricas de Analítica (KAN-204), espejo 1:1 de
 * los DTOs del backend (`AnaliticaMetricsController` / `metricas/presentation/dto`).
 * El kit compartido (`@shared/metrics`) solo define los tipos genéricos (`MetricKpi`,
 * `MetricSeries`, `MetricBreakdown`); estos envelopes combinan varios de esos tipos en
 * la forma exacta que devuelve cada endpoint.
 */

/** `GET /api/v1/analitica/metricas/volumen` (MTA-01). */
export interface VolumenMetricsResponse {
  kpi: MetricKpi;
  series: MetricSeries;
}

/** `GET /api/v1/analitica/metricas/demografia` (MTA-07). Solo se consume `porGenero` en el MVP del dashboard. */
export interface DemografiaMetricsResponse {
  porEdad: MetricBreakdown;
  porGenero: MetricBreakdown;
}
