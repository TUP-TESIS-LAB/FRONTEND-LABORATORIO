import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FLUJO_METRICS_FEATURE_KEY, FlujoMetricsState } from './flujo-metrics.state';

export const selectFlujoMetricsState = createFeatureSelector<FlujoMetricsState>(FLUJO_METRICS_FEATURE_KEY);

// ── Histórico ────────────────────────────────────────────────────────────────
export const selectHistoricoSlice = createSelector(selectFlujoMetricsState, (s) => s.historico);

export const selectVolumenTurnos = createSelector(selectHistoricoSlice, (h) => h.volumenTurnos);
export const selectVolumenCola = createSelector(selectHistoricoSlice, (h) => h.volumenCola);
export const selectTasaCancelacion = createSelector(selectHistoricoSlice, (h) => h.tasaCancelacion);
export const selectOcupacionAgenda = createSelector(selectHistoricoSlice, (h) => h.ocupacionAgenda);
export const selectEsperaLlamado = createSelector(selectHistoricoSlice, (h) => h.esperaLlamado);
export const selectReLlamados = createSelector(selectHistoricoSlice, (h) => h.reLlamados);
export const selectCargaExtractor = createSelector(selectHistoricoSlice, (h) => h.cargaExtractor);
export const selectHistoricoLoading = createSelector(selectHistoricoSlice, (h) => h.loading);
export const selectHistoricoErrors = createSelector(selectHistoricoSlice, (h) => h.errors);

// ── En vivo ──────────────────────────────────────────────────────────────────
export const selectEnVivoSlice = createSelector(selectFlujoMetricsState, (s) => s.enVivo);

export const selectColaExtraccionVivo = createSelector(selectEnVivoSlice, (v) => v.colaExtraccionVivo);
export const selectOcupacionBoxesVivo = createSelector(selectEnVivoSlice, (v) => v.ocupacionBoxesVivo);
export const selectUrgentes = createSelector(selectEnVivoSlice, (v) => v.urgentes);
export const selectEnVivoLoading = createSelector(selectEnVivoSlice, (v) => v.loading);
export const selectEnVivoErrors = createSelector(selectEnVivoSlice, (v) => v.errors);
