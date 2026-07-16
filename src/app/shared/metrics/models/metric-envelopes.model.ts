/**
 * Espejo 1:1 de los envelopes de métricas del backend (56 endpoints, PR #125).
 * `value`/`values` nullable significa "sin datos" — NUNCA se interpreta como 0.
 */

/** Variación respecto del período anterior. `changePct`/`previousValue` null = sin dato comparable. */
export interface MetricDelta {
  previousValue: number | null;
  changePct: number | null;
}

/** KPI puntual (alimenta `ui-stat-card` vía `metric-kpi.util`). */
export interface MetricKpi {
  key: string;
  label: string;
  value: number | null;
  unit: string;
  delta?: MetricDelta;
}

/** Una serie de datos dentro de un `MetricSeries` (un dataset por línea/barra). */
export interface MetricDataset {
  key: string;
  label: string;
  values: number[];
}

/** Serie temporal (line/bar) — `labels` son los buckets del eje X según la granularidad pedida. */
export interface MetricSeries {
  labels: string[];
  datasets: MetricDataset[];
}

/** Un segmento de un breakdown (pie/doughnut). */
export interface MetricSlice {
  key: string;
  label: string;
  value: number;
}

/** Distribución por dimensión (ej. método de pago, sucursal). */
export interface MetricBreakdown {
  dimension: string;
  slices: MetricSlice[];
}
