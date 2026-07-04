import { createReducer, on } from '@ngrx/store';
import {
  loadUrgentInProgress,
  loadUrgentInProgressFailure,
  loadUrgentInProgressNotModified,
  loadUrgentInProgressSuccess,
} from './urgent-in-progress.actions';
import { initialUrgentInProgressState, UrgentInProgressState } from './urgent-in-progress.state';

export const urgentInProgressReducer = createReducer(
  initialUrgentInProgressState,

  on(loadUrgentInProgress, (s): UrgentInProgressState => ({ ...s, loading: true, error: null })),

  on(loadUrgentInProgressSuccess, (s, { board }): UrgentInProgressState => ({
    ...s,
    loading: false,
    board,
  })),

  on(loadUrgentInProgressNotModified, (s): UrgentInProgressState => ({ ...s, loading: false })),

  on(loadUrgentInProgressFailure, (s, { error }): UrgentInProgressState => ({
    ...s,
    loading: false,
    error,
  })),
);
