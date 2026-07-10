import { MetricBreakdown, MetricKpi } from '@shared/metrics';
import {
  EsperaLlamadoResponse,
  OcupacionAgendaResponse,
  ReLlamadosResponse,
  VolumenColaResponse,
  VolumenTurnosResponse,
} from '../../models/flujo-metrics.model';

export const FLUJO_METRICS_FEATURE_KEY = 'flujoMetricas';

export interface HistoricoState {
  volumenTurnos: VolumenTurnosResponse | null;
  volumenCola: VolumenColaResponse | null;
  tasaCancelacion: MetricKpi | null;
  ocupacionAgenda: OcupacionAgendaResponse | null;
  esperaLlamado: EsperaLlamadoResponse | null;
  reLlamados: ReLlamadosResponse | null;
  cargaExtractor: MetricBreakdown | null;
  /** Solo `true` en la carga inicial (aún sin datos) — evita parpadeo en cada tick de polling. */
  loading: boolean;
  /** Un error por métrica: una falla puntual (ej. 403 por sucursal) no tira abajo el resto. */
  errors: Record<string, string | null>;
}

export interface EnVivoState {
  colaExtraccionVivo: MetricKpi | null;
  ocupacionBoxesVivo: MetricKpi | null;
  urgentes: MetricBreakdown | null;
  loading: boolean;
  errors: Record<string, string | null>;
}

export interface FlujoMetricsState {
  historico: HistoricoState;
  enVivo: EnVivoState;
}

export const initialFlujoMetricsState: FlujoMetricsState = {
  historico: {
    volumenTurnos: null,
    volumenCola: null,
    tasaCancelacion: null,
    ocupacionAgenda: null,
    esperaLlamado: null,
    reLlamados: null,
    cargaExtractor: null,
    loading: false,
    errors: {},
  },
  enVivo: {
    colaExtraccionVivo: null,
    ocupacionBoxesVivo: null,
    urgentes: null,
    loading: false,
    errors: {},
  },
};
