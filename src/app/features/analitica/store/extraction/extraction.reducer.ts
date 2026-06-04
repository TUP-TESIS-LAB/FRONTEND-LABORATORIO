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

  // --- Branches ----------------------------------------------------------
  on(A.loadBranches, (s): ExtractionFeatureState => setPending(s, { branches: true })),
  on(A.loadBranchesSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { branches: false }),
    branches: items,
    error: null,
  })),
  on(A.loadBranchesNotModified, (s): ExtractionFeatureState => setPending(s, { branches: false })),
  on(A.loadBranchesFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { branches: false }),
    error: extractErrorText(error),
  })),

  on(A.setSelectedBranch, (s, { branchId }): ExtractionFeatureState => {
    if (s.selectedBranchId === branchId) return s;
    // Cambiar de sucursal invalida el contenido específico de la anterior.
    return {
      ...s,
      selectedBranchId: branchId,
      awaiting: [],
      inProgress: [],
      stats: null,
      boxOccupancy: [],
      boxAssignments: [],
      branchExtractors: [],
      error: null,
    };
  }),

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

  // --- InProgress --------------------------------------------------------
  on(A.loadInProgress, (s): ExtractionFeatureState => setPending(s, { inProgress: true })),
  on(A.loadInProgressSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { inProgress: false }),
    inProgress: items,
    lastRefreshAt: Date.now(),
    error: null,
  })),
  on(A.loadInProgressNotModified, (s): ExtractionFeatureState => ({
    ...setPending(s, { inProgress: false }),
    lastRefreshAt: Date.now(),
  })),
  on(A.loadInProgressFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { inProgress: false }),
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

  // --- Box occupancy -----------------------------------------------------
  on(A.loadOccupancy, (s): ExtractionFeatureState => setPending(s, { occupancy: true })),
  on(A.loadOccupancySuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { occupancy: false }),
    boxOccupancy: items,
    lastRefreshAt: Date.now(),
    error: null,
  })),
  on(A.loadOccupancyNotModified, (s): ExtractionFeatureState => ({
    ...setPending(s, { occupancy: false }),
    lastRefreshAt: Date.now(),
  })),
  on(A.loadOccupancyFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { occupancy: false }),
    error: extractErrorText(error),
  })),

  // --- Box assignments ---------------------------------------------------
  on(A.loadBoxAssignments, (s): ExtractionFeatureState => setPending(s, { boxAssignments: true })),
  on(A.loadBoxAssignmentsSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { boxAssignments: false }),
    boxAssignments: items,
    error: null,
  })),
  on(A.loadBoxAssignmentsNotModified, (s): ExtractionFeatureState =>
    setPending(s, { boxAssignments: false }),
  ),
  on(A.loadBoxAssignmentsFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { boxAssignments: false }),
    error: extractErrorText(error),
  })),

  on(A.saveBoxAssignments, (s): ExtractionFeatureState => setPending(s, { mutation: true })),
  on(A.saveBoxAssignmentsSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { mutation: false }),
    boxAssignments: items,
    error: null,
  })),
  on(A.saveBoxAssignmentsFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { mutation: false }),
    error: extractErrorText(error),
  })),

  // --- Branch extractors -------------------------------------------------
  on(A.loadBranchExtractors, (s): ExtractionFeatureState =>
    setPending(s, { branchExtractors: true }),
  ),
  on(A.loadBranchExtractorsSuccess, (s, { items }): ExtractionFeatureState => ({
    ...setPending(s, { branchExtractors: false }),
    branchExtractors: items,
    error: null,
  })),
  on(A.loadBranchExtractorsNotModified, (s): ExtractionFeatureState =>
    setPending(s, { branchExtractors: false }),
  ),
  on(A.loadBranchExtractorsFailure, (s, { error }): ExtractionFeatureState => ({
    ...setPending(s, { branchExtractors: false }),
    error: extractErrorText(error),
  })),

  // --- UI ----------------------------------------------------------------
  on(A.setSearch, (s, { search }): ExtractionFeatureState => ({ ...s, search })),

  // --- Mutations ---------------------------------------------------------
  on(
    A.assignExtractor, A.cancelExtraction, A.endExtraction, A.unassignExtraction,
    (s): ExtractionFeatureState => setPending(s, { mutation: true }),
  ),

  /**
   * assignExtractorSuccess: guarda lastAssigned para que la page (Task 7) arme
   * el toast de undo. NO toca inProgress directamente; el refresh posterior lo trae.
   */
  on(A.assignExtractorSuccess, (s, { attentionId, boxNumber, extractorFullName }): ExtractionFeatureState => ({
    ...setPending(s, { mutation: false }),
    lastAssigned: { attentionId, boxNumber, extractorFullName },
    error: null,
  })),

  /** unassignExtractionSuccess: limpia lastAssigned. */
  on(A.unassignExtractionSuccess, (s): ExtractionFeatureState => ({
    ...setPending(s, { mutation: false }),
    lastAssigned: null,
    error: null,
  })),

  on(
    A.cancelExtractionSuccess, A.endExtractionSuccess,
    (s): ExtractionFeatureState => setPending(s, { mutation: false }),
  ),
  on(
    A.assignExtractorFailure, A.cancelExtractionFailure, A.endExtractionFailure,
    A.unassignExtractionFailure,
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
