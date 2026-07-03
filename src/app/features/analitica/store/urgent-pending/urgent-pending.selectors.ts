import { createFeatureSelector, createSelector } from '@ngrx/store';
import { URGENT_PENDING_FEATURE_KEY, UrgentPendingState } from './urgent-pending.state';

export const selectUrgentPendingState = createFeatureSelector<UrgentPendingState>(URGENT_PENDING_FEATURE_KEY);

export const selectUrgentPending  = createSelector(selectUrgentPendingState, s => s.items);
export const selectUrgentPendingLoading = createSelector(selectUrgentPendingState, s => s.loading);
export const selectUrgentPendingError   = createSelector(selectUrgentPendingState, s => s.error);
export const selectUrgentPendingResolving = createSelector(selectUrgentPendingState, s => s.resolving);
