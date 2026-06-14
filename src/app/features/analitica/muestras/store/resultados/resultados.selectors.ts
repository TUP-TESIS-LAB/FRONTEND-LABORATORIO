import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ResultadosState, RESULTADOS_FEATURE_KEY } from './resultados.state';

export const selectResultadosState = createFeatureSelector<ResultadosState>(RESULTADOS_FEATURE_KEY);
export const selectGrid = createSelector(selectResultadosState, s => s.grid);
export const selectResultadosLoading = createSelector(selectResultadosState, s => s.loading);
export const selectResultadosSaving = createSelector(selectResultadosState, s => s.saving);
export const selectResultadosError = createSelector(selectResultadosState, s => s.error);
