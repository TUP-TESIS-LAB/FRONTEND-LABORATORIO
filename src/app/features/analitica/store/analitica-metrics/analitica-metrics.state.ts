// Import directo del submódulo, no del barrel `@shared/metrics` — ver nota en
// `analitica-metrics.model.ts` (evita traer Chart.js al bundle inicial vía este slice,
// que se registra eager en `app.config.ts`).
import { MetricBreakdown, MetricKpi, MetricSeries } from '@shared/metrics/models/metric-envelopes.model';
import { DemografiaMetricsResponse, VolumenMetricsResponse } from '../../models/analitica-metrics.model';

/**
 * Slice del dashboard de métricas de Analítica (KAN-204). Cada tab (Volumen / Preanalítica /
 * Postanalítica) pide VARIOS endpoints por poll-tick — a diferencia de un slice típico de
 * un solo recurso, acá se agrupan en UN `load*Tab` por tab (el effect hace `forkJoin` de
 * los N GETs y resuelve el 304 de cada uno contra el valor previo del state) para no
 * multiplicar acciones 1:1 por endpoint. Ver `analitica-metrics.effects.ts`.
 */
export interface VolumenTabData {
  volumen: VolumenMetricsResponse | null;
  volumenPorSeccion: MetricBreakdown | null;
  demografia: DemografiaMetricsResponse | null;
  subEstados: MetricBreakdown | null;
}

export interface PreanaliticaTabData {
  volumenTendencia: MetricSeries | null;
  rechazoResumen: MetricKpi | null;
  perdidasResumen: MetricKpi | null;
  rechazoPorSeccion: MetricBreakdown | null;
}

export interface PostanaliticaTabData {
  tatPromedio: MetricKpi | null;
  tatSerie: MetricSeries | null;
  estudiosTotal: MetricKpi | null;
  estudiosPorEstado: MetricBreakdown | null;
}

export interface AnaliticaMetricsState {
  volumen: VolumenTabData;
  volumenLoading: boolean;
  volumenError: string | null;

  preanalitica: PreanaliticaTabData;
  preanaliticaLoading: boolean;
  preanaliticaError: string | null;

  postanalitica: PostanaliticaTabData;
  postanaliticaLoading: boolean;
  postanaliticaError: string | null;
}

export const initialVolumenTabData: VolumenTabData = {
  volumen: null, volumenPorSeccion: null, demografia: null, subEstados: null,
};

export const initialPreanaliticaTabData: PreanaliticaTabData = {
  volumenTendencia: null, rechazoResumen: null, perdidasResumen: null, rechazoPorSeccion: null,
};

export const initialPostanaliticaTabData: PostanaliticaTabData = {
  tatPromedio: null, tatSerie: null, estudiosTotal: null, estudiosPorEstado: null,
};

export const initialAnaliticaMetricsState: AnaliticaMetricsState = {
  volumen: initialVolumenTabData,
  volumenLoading: false,
  volumenError: null,

  preanalitica: initialPreanaliticaTabData,
  preanaliticaLoading: false,
  preanaliticaError: null,

  postanalitica: initialPostanaliticaTabData,
  postanaliticaLoading: false,
  postanaliticaError: null,
};

export const ANALITICA_METRICS_FEATURE_KEY = 'analiticaMetrics';
