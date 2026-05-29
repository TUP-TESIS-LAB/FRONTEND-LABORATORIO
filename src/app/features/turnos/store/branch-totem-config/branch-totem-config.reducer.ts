import { createReducer, on } from '@ngrx/store';
import * as A from './branch-totem-config.actions';
import { initialBranchTotemConfigState } from './branch-totem-config.state';

export const branchTotemConfigReducer = createReducer(
  initialBranchTotemConfigState,
  on(A.loadBranchTotemConfig, (s, { branchId }) => ({
    ...s, branchId, loading: true, error: null,
  })),
  on(A.loadBranchTotemConfigSuccess, (s, { branchId, enabled }) => ({
    ...s, branchId, enabled, loading: false, error: null,
  })),
  on(A.loadBranchTotemConfigFailure, (s, { error }) => ({
    ...s, loading: false, error,
  })),
);
