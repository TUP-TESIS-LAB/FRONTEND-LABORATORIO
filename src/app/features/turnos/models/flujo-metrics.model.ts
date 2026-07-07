import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics';

/**
 * Espejo 1:1 de los envelopes de `/api/v1/turnos/metricas/**` y
 * `/api/v1/atencion/metricas/**` (FOP-01..10, PR #125) — ver
 * `docs/superpowers/specs/2026-07-06-metricas-dashboards-design.md`.
 */

/** FOP-01. `breakdown` es `null` cuando se filtra por una sucursal específica. */
export interface VolumenTurnosResponse {
  total: MetricKpi;
  series: MetricSeries;
  breakdown: MetricBreakdown | null;
}

/** FOP-02. `breakdown` es `null` cuando se filtra por una sucursal específica. */
export interface VolumenColaResponse {
  total: MetricKpi;
  series: MetricSeries;
  breakdown: MetricBreakdown | null;
}

/** FOP-04. `series` trae 2 datasets: `reservado` y `capacidad`. */
export interface OcupacionAgendaResponse {
  ocupacion: MetricKpi;
  series: MetricSeries;
}

/** FOP-05. Los 3 KPI tienen `value === null` cuando no hay llamados en el rango. */
export interface EsperaLlamadoResponse {
  avg: MetricKpi;
  p50: MetricKpi;
  p90: MetricKpi;
}

/** FOP-06. `breakdown` trae los buckets 0/1/2/3+, reconciliados con el total del rango. */
export interface ReLlamadosResponse {
  promedio: MetricKpi;
  breakdown: MetricBreakdown;
}
