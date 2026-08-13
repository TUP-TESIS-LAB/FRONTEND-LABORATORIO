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
  /**
   * Format-kind ∈ `count|currency|percent|hours|minutes|seconds|decimal` (ver
   * `metric-format.util.ts`). Opcional para no romper a los ~19 importadores existentes
   * que construían el envelope antes de que el backend emitiera `unit` — `undefined` cae
   * a `count` en `unitFormat()`. Distinto de `MetricKpi.unit`, que es un noun de dominio
   * libre para mostrar ("turnos"), no un format-kind para renderizar un eje.
   */
  unit?: string;
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
  /** Format-kind, ver `MetricSeries.unit`. Opcional por la misma razón. */
  unit?: string;
  dimension: string;
  slices: MetricSlice[];
}
