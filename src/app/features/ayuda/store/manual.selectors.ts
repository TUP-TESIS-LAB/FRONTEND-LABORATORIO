import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MANUAL_FEATURE_KEY, ManualState } from './manual.state';

export const selectManualState = createFeatureSelector<ManualState>(MANUAL_FEATURE_KEY);

export const selectManual        = createSelector(selectManualState, (s) => s.manual);
export const selectManualLoading = createSelector(selectManualState, (s) => s.loading);
export const selectManualError   = createSelector(selectManualState, (s) => s.error);

export const selectManualChapters = createSelector(selectManual, (m) => m?.chapters ?? []);
