// NOTA: import directo del modelo (no del barrel `@shared/metrics`) — este archivo se
// registra eager en app.config.ts, y el barrel re-exporta `ui-metric-chart`
// (`export * from './components/metric-chart/...'`), que arrastra chart.js al bundle
// inicial aunque acá solo se usen los tipos. Ver financiero-metrics-api.service.ts.
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';

export const FINANCIERO_METRICS_FEATURE_KEY = 'financieroMetrics';

/** Slice genérico de un endpoint de métricas: dato crudo del backend + loading/error propios. */
export interface MetricResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function empty<T>(): MetricResourceState<T> {
  return { data: null, loading: false, error: null };
}

export interface FinancieroMetricsState {
  // ── Recaudación (MFI-01) ──
  recaudacionKpis: MetricResourceState<MetricKpi[]>;
  recaudacionSerie: MetricResourceState<MetricSeries>;
  recaudacionPorMetodo: MetricResourceState<MetricBreakdown>;
  recaudacionPorSucursal: MetricResourceState<MetricBreakdown>;
  // ── Facturación (MFI-02) ──
  facturacionKpis: MetricResourceState<MetricKpi[]>;
  facturacionPorCobertura: MetricResourceState<MetricBreakdown>;
  // ── Liquidaciones (MFI-03) ──
  liquidacionesKpis: MetricResourceState<MetricKpi[]>;
  liquidacionesPorObraSocial: MetricResourceState<MetricBreakdown>;
  // ── Caja (MFI-04) ──
  cajaKpis: MetricResourceState<MetricKpi[]>;
  cajaPorSucursal: MetricResourceState<MetricBreakdown>;
  // ── Conciliación (MFI-05) ──
  conciliacionKpis: MetricResourceState<MetricKpi[]>;
  conciliacionPorMetodo: MetricResourceState<MetricBreakdown>;
  // ── Tesorería (MFI-06) ──
  tesoreriaKpis: MetricResourceState<MetricKpi[]>;
  tesoreriaPorOrigen: MetricResourceState<MetricBreakdown>;
}

export const initialFinancieroMetricsState: FinancieroMetricsState = {
  recaudacionKpis: empty(),
  recaudacionSerie: empty(),
  recaudacionPorMetodo: empty(),
  recaudacionPorSucursal: empty(),
  facturacionKpis: empty(),
  facturacionPorCobertura: empty(),
  liquidacionesKpis: empty(),
  liquidacionesPorObraSocial: empty(),
  cajaKpis: empty(),
  cajaPorSucursal: empty(),
  conciliacionKpis: empty(),
  conciliacionPorMetodo: empty(),
  tesoreriaKpis: empty(),
  tesoreriaPorOrigen: empty(),
};
