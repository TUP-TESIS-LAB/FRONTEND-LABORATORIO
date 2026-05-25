import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AwaitingExtractionItem } from '../../models/extraction.model';
import { EXTRACTION_FEATURE_KEY, ExtractionFeatureState } from './extraction.state';

export const selectExtractionState =
  createFeatureSelector<ExtractionFeatureState>(EXTRACTION_FEATURE_KEY);

const rawAwaiting = createSelector(selectExtractionState, (s) => s.awaiting);

export const selectMine = createSelector(selectExtractionState, (s) => s.mine);
export const selectStats = createSelector(selectExtractionState, (s) => s.stats);
export const selectSearch = createSelector(selectExtractionState, (s) => s.search);
export const selectPending = createSelector(selectExtractionState, (s) => s.pending);
export const selectMutating = createSelector(selectExtractionState, (s) => s.pending.mutation);
export const selectError = createSelector(selectExtractionState, (s) => s.error);
export const selectLastRefreshAt = createSelector(
  selectExtractionState,
  (s) => (s.lastRefreshAt ? new Date(s.lastRefreshAt) : null),
);

/**
 * Filtra `awaiting` por DNI o nombre (case insensitive). NO reordena: el
 * backend ya devuelve la lista ordenada por `is_urgent DESC, created_at ASC`.
 */
export const selectAwaiting = createSelector(
  rawAwaiting,
  selectSearch,
  (items, search): AwaitingExtractionItem[] => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.patientFullName.toLowerCase().includes(q) ||
      item.patientDni.toLowerCase().includes(q),
    );
  },
);

/** MAX 1 extracción simultánea — regla cerrada del spec. */
export const selectCanTakeMore = createSelector(
  selectMine,
  (mine) => mine.length === 0,
);
