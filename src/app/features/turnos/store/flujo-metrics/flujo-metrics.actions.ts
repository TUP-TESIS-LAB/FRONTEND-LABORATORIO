import { createAction, props } from '@ngrx/store';
import { MetricBreakdown, MetricFilter, MetricKpi } from '@shared/metrics';
import {
  EsperaLlamadoResponse,
  OcupacionAgendaResponse,
  ReLlamadosResponse,
  VolumenColaResponse,
  VolumenTurnosResponse,
} from '../../models/flujo-metrics.model';
import { FetchResult } from './flujo-metrics-fetch.util';

/**
 * Un `load*` por sección dispara las N llamadas HTTP en paralelo (`forkJoin` en el
 * effect); el `*Success` trae un `FetchResult` por métrica para que el reducer
 * pueda mergear success/notModified/error sin pisar datos buenos de otras métricas.
 */

// ── Sección histórica (FOP-01..07) ──────────────────────────────────────────
export const loadFlujoHistorico = createAction(
  '[Flujo Metrics] Load Historico',
  props<{ filter: MetricFilter }>(),
);
export interface FlujoHistoricoResults {
  volumenTurnos: FetchResult<VolumenTurnosResponse>;
  volumenCola: FetchResult<VolumenColaResponse>;
  tasaCancelacion: FetchResult<MetricKpi>;
  ocupacionAgenda: FetchResult<OcupacionAgendaResponse>;
  esperaLlamado: FetchResult<EsperaLlamadoResponse>;
  reLlamados: FetchResult<ReLlamadosResponse>;
  cargaExtractor: FetchResult<MetricBreakdown>;
}
export const loadFlujoHistoricoSuccess = createAction(
  '[Flujo Metrics API] Load Historico Success',
  props<{ results: FlujoHistoricoResults }>(),
);

// ── Sección en vivo (FOP-08..10) ────────────────────────────────────────────
export const loadFlujoEnVivo = createAction(
  '[Flujo Metrics] Load En Vivo',
  props<{ branchId?: number }>(),
);
export interface FlujoEnVivoResults {
  colaExtraccionVivo: FetchResult<MetricKpi>;
  ocupacionBoxesVivo: FetchResult<MetricKpi>;
  urgentes: FetchResult<MetricBreakdown>;
}
export const loadFlujoEnVivoSuccess = createAction(
  '[Flujo Metrics API] Load En Vivo Success',
  props<{ results: FlujoEnVivoResults }>(),
);
