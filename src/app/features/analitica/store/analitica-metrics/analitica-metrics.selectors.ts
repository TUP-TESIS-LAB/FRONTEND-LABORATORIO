import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ANALITICA_METRICS_FEATURE_KEY, AnaliticaMetricsState } from './analitica-metrics.state';

export const selectAnaliticaMetricsState = createFeatureSelector<AnaliticaMetricsState>(ANALITICA_METRICS_FEATURE_KEY);

export const selectVolumenTabData    = createSelector(selectAnaliticaMetricsState, s => s.volumen);
export const selectVolumenTabLoading = createSelector(selectAnaliticaMetricsState, s => s.volumenLoading);
export const selectVolumenTabError   = createSelector(selectAnaliticaMetricsState, s => s.volumenError);

export const selectPreanaliticaTabData    = createSelector(selectAnaliticaMetricsState, s => s.preanalitica);
export const selectPreanaliticaTabLoading = createSelector(selectAnaliticaMetricsState, s => s.preanaliticaLoading);
export const selectPreanaliticaTabError   = createSelector(selectAnaliticaMetricsState, s => s.preanaliticaError);

export const selectPostanaliticaTabData    = createSelector(selectAnaliticaMetricsState, s => s.postanalitica);
export const selectPostanaliticaTabLoading = createSelector(selectAnaliticaMetricsState, s => s.postanaliticaLoading);
export const selectPostanaliticaTabError   = createSelector(selectAnaliticaMetricsState, s => s.postanaliticaError);
