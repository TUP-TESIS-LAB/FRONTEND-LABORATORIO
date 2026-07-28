import { createReducer, on } from '@ngrx/store';
import { loadManual, loadManualFailure, loadManualSuccess } from './manual.actions';
import { initialManualState } from './manual.state';

export const manualReducer = createReducer(
  initialManualState,

  on(loadManual, (state) => ({ ...state, loading: true, error: null })),

  on(loadManualSuccess, (state, { manual }) => ({
    ...state,
    manual,
    loading: false,
    error: null,
  })),

  on(loadManualFailure, (state, { error }) => ({ ...state, loading: false, error })),
);
