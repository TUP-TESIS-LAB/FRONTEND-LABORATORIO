import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PostanaliticaState, POSTANALITICA_FEATURE_KEY } from './postanalitica.state';

export const selectPostanaliticaState = createFeatureSelector<PostanaliticaState>(POSTANALITICA_FEATURE_KEY);
export const selectValidationView = createSelector(selectPostanaliticaState, s => s.view);
export const selectPostanaliticaLoading = createSelector(selectPostanaliticaState, s => s.loading);
export const selectPostanaliticaSaving = createSelector(selectPostanaliticaState, s => s.saving);
export const selectPostanaliticaError = createSelector(selectPostanaliticaState, s => s.error);
