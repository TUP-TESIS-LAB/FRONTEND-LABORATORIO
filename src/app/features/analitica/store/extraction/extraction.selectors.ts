import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AwaitingExtractionItem, BoxAssignment, BranchOption } from '../../models/extraction.model';
import { EXTRACTION_FEATURE_KEY, ExtractionFeatureState } from './extraction.state';

export const selectExtractionState =
  createFeatureSelector<ExtractionFeatureState>(EXTRACTION_FEATURE_KEY);

const rawAwaiting = createSelector(selectExtractionState, (s) => s.awaiting);

export const selectInProgress = createSelector(selectExtractionState, (s) => s.inProgress);
export const selectStats = createSelector(selectExtractionState, (s) => s.stats);
export const selectSearch = createSelector(selectExtractionState, (s) => s.search);
export const selectPending = createSelector(selectExtractionState, (s) => s.pending);
export const selectMutating = createSelector(selectExtractionState, (s) => s.pending.mutation);
export const selectError = createSelector(selectExtractionState, (s) => s.error);
export const selectLastRefreshAt = createSelector(
  selectExtractionState,
  (s) => (s.lastRefreshAt ? new Date(s.lastRefreshAt) : null),
);
export const selectLastAssigned = createSelector(
  selectExtractionState,
  (s) => s.lastAssigned,
);

export const selectBranches = createSelector(selectExtractionState, (s) => s.branches);
export const selectSelectedBranchId = createSelector(
  selectExtractionState,
  (s) => s.selectedBranchId,
);
export const selectSelectedBranch = createSelector(
  selectBranches,
  selectSelectedBranchId,
  (branches, id): BranchOption | null => {
    if (id == null) return null;
    return branches.find((b) => b.id === id) ?? null;
  },
);

export const selectBoxOccupancy = createSelector(
  selectExtractionState,
  (s) => s.boxOccupancy,
);

export const selectBoxAssignments = createSelector(
  selectExtractionState,
  (s) => s.boxAssignments,
);

export const selectBranchExtractors = createSelector(
  selectExtractionState,
  (s) => s.branchExtractors,
);

/**
 * Factory selector: devuelve la asignación de un box específico.
 * Útil para mostrar qué extractor está asignado a un box dado.
 */
export const selectBoxFor = (boxNumber: number) =>
  createSelector(
    selectBoxAssignments,
    (assignments): BoxAssignment | null =>
      assignments.find((a) => a.boxNumber === boxNumber) ?? null,
  );

/**
 * Devuelve la fila de occupancy del usuario actual (si está ocupando un box
 * en la sucursal actual). Útil para destacar "mi box".
 */
export const selectMyBoxOccupancy = (myUserId: number | null) =>
  createSelector(selectBoxOccupancy, (rows) => {
    if (myUserId == null) return null;
    return rows.find((r) => r.extractorId === myUserId) ?? null;
  });

/**
 * Factory selector: ¿está ocupado el box N por OTRO extractor que no sea el
 * usuario actual? (Si lo ocupa el propio usuario, devuelve `false`).
 */
export const selectBoxIsOccupied = (box: number, myUserId: number | null) =>
  createSelector(selectBoxOccupancy, (rows) =>
    rows.some((r) => r.box === box && (myUserId == null || r.extractorId !== myUserId)),
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
