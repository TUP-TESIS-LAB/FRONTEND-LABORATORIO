import { createFeatureSelector, createSelector } from '@ngrx/store';
import { URGENT_IN_PROGRESS_FEATURE_KEY, UrgentInProgressState } from './urgent-in-progress.state';

export const selectUrgentInProgressState = createFeatureSelector<UrgentInProgressState>(URGENT_IN_PROGRESS_FEATURE_KEY);

export const selectUrgentInProgressBoard   = createSelector(selectUrgentInProgressState, s => s.board);
export const selectUrgentInProgressLoading = createSelector(selectUrgentInProgressState, s => s.loading);
export const selectUrgentInProgressError   = createSelector(selectUrgentInProgressState, s => s.error);
