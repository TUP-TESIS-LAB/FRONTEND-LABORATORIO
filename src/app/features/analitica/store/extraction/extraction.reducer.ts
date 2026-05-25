import { createReducer, on } from '@ngrx/store';
import * as A from './extraction.actions';
import {
  ExtractionFeatureState,
  initialExtractionState,
} from './extraction.state';

function setPending(
  s: ExtractionFeatureState,
  patch: Partial<ExtractionFeatureState['pending']>,
): ExtractionFeatureState {
  return { ...s, pending: { ...s.pending, ...patch } };
}

export const extractionReducer = createReducer(
  initialExtractionState,

  // --- Awaiting ----------------------------------------------------------
  on(A.loadAwaiting, (s): ExtractionFeatureState => setPending(s, { awaiting: true })),
  on(A.loadAwaitingSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { awaiting: false }),
    awaiting: items,
    lastRefreshAt: Date.now(),
    error: null,
  })),
  on(A.loadAwaitingNotModified, (s): ExtractionFeatureState => ({
    ...setPending(s, { awaiting: false }),
    lastRefreshAt: Date.now(),
  })),
  on(A.loadAwaitingFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { awaiting: false }),
    error: extractErrorText(error),
  })),

  // --- Mine --------------------------------------------------------------
  on(A.loadMine, (s): ExtractionFeatureState => setPending(s, { mine: true })),
  on(A.loadMineSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { mine: false }),
    mine: items,
    lastRefreshAt: Date.now(),
    error: null,
  })),
  on(A.loadMineNotModified, (s): ExtractionFeatureState => ({
    ...setPending(s, { mine: false }),
    lastRefreshAt: Date.now(),
  })),
  on(A.loadMineFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { mine: false }),
    error: extractErrorText(error),
  })),

  // --- Stats -------------------------------------------------------------
  on(A.loadStats, (s): ExtractionFeatureState => setPending(s, { stats: true })),
  on(A.loadStatsSuccess, (s, { stats }): ExtractionFeatureState => ({
    ...setPending(s, { stats: false }),
    stats,
    lastRefreshAt: Date.now(),
    error: null,
  })),
  on(A.loadStatsNotModified, (s): ExtractionFeatureState => ({
    ...setPending(s, { stats: false }),
    lastRefreshAt: Date.now(),
  })),
  on(A.loadStatsFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { stats: false }),
    error: extractErrorText(error),
  })),

  // --- UI ----------------------------------------------------------------
  on(A.setSearch, (s, { search }): ExtractionFeatureState => ({ ...s, search })),

  // --- Mutations ---------------------------------------------------------
  on(
    A.assignExtractor, A.cancelExtraction, A.endExtraction,
    (s): ExtractionFeatureState => setPending(s, { mutation: true }),
  ),
  on(
    A.assignExtractorSuccess, A.cancelExtractionSuccess, A.endExtractionSuccess,
    (s): ExtractionFeatureState => setPending(s, { mutation: false }),
  ),
  on(
    A.assignExtractorFailure, A.cancelExtractionFailure, A.endExtractionFailure,
    (s, { error }): ExtractionFeatureState => ({
      ...setPending(s, { mutation: false }),
      error: extractErrorText(error),
    }),
  ),
);

function extractErrorText(err: { status?: number; message?: string } | null): string | null {
  if (!err) return null;
  return err.message ?? `HTTP ${err.status ?? '?'}`;
}
