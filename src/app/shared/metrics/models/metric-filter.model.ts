/** Granularidad de agregación temporal de una métrica. */
export type MetricGranularity = 'DAY' | 'WEEK' | 'MONTH';

/**
 * Filtro común a todos los endpoints de métricas (query params `dateFrom/dateTo/branchId/granularity`).
 * `branchId` ausente = todas las sucursales accesibles del usuario.
 */
export interface MetricFilter {
  /** ISO date (yyyy-MM-dd), inicio del rango. */
  dateFrom: string;
  /** ISO date (yyyy-MM-dd), fin del rango. */
  dateTo: string;
  branchId?: number;
  granularity: MetricGranularity;
}
