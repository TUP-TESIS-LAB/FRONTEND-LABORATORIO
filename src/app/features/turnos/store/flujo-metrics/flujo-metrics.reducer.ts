import { createReducer, on } from '@ngrx/store';
import { EnVivoState, FlujoMetricsState, HistoricoState, initialFlujoMetricsState } from './flujo-metrics.state';
import {
  loadFlujoEnVivo,
  loadFlujoEnVivoSuccess,
  loadFlujoHistorico,
  loadFlujoHistoricoSuccess,
} from './flujo-metrics.actions';
import { FetchResult } from './flujo-metrics-fetch.util';

export const initialState = initialFlujoMetricsState;

/**
 * Aplica un `FetchResult` sobre el dato/error existentes sin pisar datos buenos:
 * `notModified` deja `data`/`error` como estaban; `error` conserva el último
 * `data` bueno (mejor mostrar datos viejos que un hueco vacío) y solo actualiza
 * el mensaje de error.
 */
function applyResult<T>(
  previousData: T | null,
  previousError: string | null,
  result: FetchResult<T>,
): { data: T | null; error: string | null } {
  if (result.kind === 'success') return { data: result.data, error: null };
  if (result.kind === 'notModified') return { data: previousData, error: previousError };
  return { data: previousData, error: result.message };
}

export const flujoMetricsReducer = createReducer(
  initialState,

  // ── Histórico (FOP-01..07) ────────────────────────────────────────────────
  on(loadFlujoHistorico, (state): FlujoMetricsState => ({
    ...state,
    historico: { ...state.historico, loading: state.historico.volumenTurnos === null },
  })),
  on(loadFlujoHistoricoSuccess, (state, { results }): FlujoMetricsState => {
    const h = state.historico;
    const volumenTurnos = applyResult(h.volumenTurnos, h.errors['volumenTurnos'] ?? null, results.volumenTurnos);
    const volumenCola = applyResult(h.volumenCola, h.errors['volumenCola'] ?? null, results.volumenCola);
    const tasaCancelacion = applyResult(h.tasaCancelacion, h.errors['tasaCancelacion'] ?? null, results.tasaCancelacion);
    const ocupacionAgenda = applyResult(h.ocupacionAgenda, h.errors['ocupacionAgenda'] ?? null, results.ocupacionAgenda);
    const esperaLlamado = applyResult(h.esperaLlamado, h.errors['esperaLlamado'] ?? null, results.esperaLlamado);
    const reLlamados = applyResult(h.reLlamados, h.errors['reLlamados'] ?? null, results.reLlamados);
    const cargaExtractor = applyResult(h.cargaExtractor, h.errors['cargaExtractor'] ?? null, results.cargaExtractor);

    const next: HistoricoState = {
      loading: false,
      volumenTurnos: volumenTurnos.data,
      volumenCola: volumenCola.data,
      tasaCancelacion: tasaCancelacion.data,
      ocupacionAgenda: ocupacionAgenda.data,
      esperaLlamado: esperaLlamado.data,
      reLlamados: reLlamados.data,
      cargaExtractor: cargaExtractor.data,
      errors: {
        volumenTurnos: volumenTurnos.error,
        volumenCola: volumenCola.error,
        tasaCancelacion: tasaCancelacion.error,
        ocupacionAgenda: ocupacionAgenda.error,
        esperaLlamado: esperaLlamado.error,
        reLlamados: reLlamados.error,
        cargaExtractor: cargaExtractor.error,
      },
    };
    return { ...state, historico: next };
  }),

  // ── En vivo (FOP-08..10) ──────────────────────────────────────────────────
  on(loadFlujoEnVivo, (state): FlujoMetricsState => ({
    ...state,
    enVivo: {
      ...state.enVivo,
      loading: state.enVivo.colaExtraccionVivo === null && state.enVivo.urgentes === null,
    },
  })),
  on(loadFlujoEnVivoSuccess, (state, { results }): FlujoMetricsState => {
    const v = state.enVivo;
    const colaExtraccionVivo = applyResult(v.colaExtraccionVivo, v.errors['colaExtraccionVivo'] ?? null, results.colaExtraccionVivo);
    const ocupacionBoxesVivo = applyResult(v.ocupacionBoxesVivo, v.errors['ocupacionBoxesVivo'] ?? null, results.ocupacionBoxesVivo);
    const urgentes = applyResult(v.urgentes, v.errors['urgentes'] ?? null, results.urgentes);

    const next: EnVivoState = {
      loading: false,
      colaExtraccionVivo: colaExtraccionVivo.data,
      ocupacionBoxesVivo: ocupacionBoxesVivo.data,
      urgentes: urgentes.data,
      errors: {
        colaExtraccionVivo: colaExtraccionVivo.error,
        ocupacionBoxesVivo: ocupacionBoxesVivo.error,
        urgentes: urgentes.error,
      },
    };
    return { ...state, enVivo: next };
  }),
);
