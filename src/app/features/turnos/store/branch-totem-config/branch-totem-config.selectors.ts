import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BranchTotemConfigState } from './branch-totem-config.state';

export const selectBranchTotemConfigState =
  createFeatureSelector<BranchTotemConfigState>('branchTotemConfig');

export const selectBranchTotemEnabled = createSelector(
  selectBranchTotemConfigState,
  (s) => s.enabled,
);

export const selectBranchTotemLoading = createSelector(
  selectBranchTotemConfigState,
  (s) => s.loading,
);
