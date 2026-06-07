import { HttpErrorResponse } from '@angular/common/http';
import {
  AwaitingExtractionItem,
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  ExtractionStats,
  InExtractionItem,
} from '../../models/extraction.model';
import * as A from './extraction.actions';
import { extractionReducer } from './extraction.reducer';
import { initialExtractionState } from './extraction.state';

function awaitingItem(over: Partial<AwaitingExtractionItem> = {}): AwaitingExtractionItem {
  return {
    id: 1, patientId: 10, patientFullName: 'Ana', patientDni: '111',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', publicCode: null, isUrgent: false, analysisCount: 2,
    insurancePlanLabel: null, createdAt: '2026-01-01T00:00:00Z', waitMinutes: 5,
    samples: [],
    ...over,
  };
}
function inProgressItem(over: Partial<InExtractionItem> = {}): InExtractionItem {
  return {
    ...awaitingItem(),
    attentionBox: 1,
    extractionStartedAt: '2026-01-01T00:05:00Z',
    extractorId: 99,
    extractorFullName: 'Juan Pérez',
    ...over,
  };
}
function branch(over: Partial<BranchOption> = {}): BranchOption {
  return { id: 1, code: 'NORTE', name: 'Sucursal Norte', ...over };
}
function occItem(over: Partial<BoxOccupancyItem> = {}): BoxOccupancyItem {
  return {
    box: 1,
    extractorId: 99,
    extractorFullName: 'Juan Pérez',
    attentionId: 42,
    attentionNumber: 'A-FX0008',
    ...over,
  };
}
function boxAssignment(over: Partial<BoxAssignment> = {}): BoxAssignment {
  return { boxNumber: 1, extractorId: null, extractorFullName: null, ...over };
}
function branchExtractor(over: Partial<BranchExtractor> = {}): BranchExtractor {
  return { id: 99, fullName: 'Juan Pérez', ...over };
}

describe('extractionReducer', () => {
  // --- Awaiting -----------------------------------------------------------
  it('loadAwaiting sets pending.awaiting=true', () => {
    const out = extractionReducer(initialExtractionState, A.loadAwaiting());
    expect(out.pending.awaiting).toBe(true);
  });

  it('loadAwaitingSuccess stores items, clears pending, sets lastRefreshAt', () => {
    const items = [awaitingItem({ id: 1 }), awaitingItem({ id: 2 })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, awaiting: true } };
    const out = extractionReducer(start, A.loadAwaitingSuccess({ items }));
    expect(out.awaiting).toBe(items);
    expect(out.pending.awaiting).toBe(false);
    expect(out.lastRefreshAt).not.toBeNull();
  });

  it('loadAwaitingNotModified bumps lastRefreshAt but keeps existing items', () => {
    const items = [awaitingItem({ id: 7 })];
    const start = { ...initialExtractionState, awaiting: items };
    const out = extractionReducer(start, A.loadAwaitingNotModified());
    expect(out.awaiting).toBe(items);
    expect(out.lastRefreshAt).not.toBeNull();
  });

  it('loadAwaitingFailure stores error and clears pending', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'X' });
    const out = extractionReducer(initialExtractionState, A.loadAwaitingFailure({ error }));
    expect(out.error).not.toBeNull();
    expect(out.pending.awaiting).toBe(false);
  });

  // --- InProgress ---------------------------------------------------------
  it('loadInProgress sets pending.inProgress=true', () => {
    const out = extractionReducer(initialExtractionState, A.loadInProgress());
    expect(out.pending.inProgress).toBe(true);
  });

  it('loadInProgressSuccess stores items, clears pending, sets lastRefreshAt', () => {
    const items = [inProgressItem({ id: 3 })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, inProgress: true } };
    const out = extractionReducer(start, A.loadInProgressSuccess({ items }));
    expect(out.inProgress).toBe(items);
    expect(out.pending.inProgress).toBe(false);
    expect(out.lastRefreshAt).not.toBeNull();
  });

  it('loadInProgressNotModified keeps existing inProgress list and bumps lastRefreshAt', () => {
    const items = [inProgressItem({ id: 5 })];
    const start = { ...initialExtractionState, inProgress: items };
    const out = extractionReducer(start, A.loadInProgressNotModified());
    expect(out.inProgress).toBe(items);
    expect(out.lastRefreshAt).not.toBeNull();
  });

  it('loadInProgressFailure stores error and clears pending', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'X' });
    const out = extractionReducer(initialExtractionState, A.loadInProgressFailure({ error }));
    expect(out.error).not.toBeNull();
    expect(out.pending.inProgress).toBe(false);
  });

  // --- Stats --------------------------------------------------------------
  it('loadStatsSuccess stores stats', () => {
    const stats: ExtractionStats = { queueSize: 4, averageWaitMinutes: 10, finishedTodayByMe: 2 };
    const out = extractionReducer(initialExtractionState, A.loadStatsSuccess({ stats }));
    expect(out.stats).toEqual(stats);
  });

  // --- BoxAssignments -----------------------------------------------------
  it('loadBoxAssignments sets pending.boxAssignments=true', () => {
    const out = extractionReducer(initialExtractionState, A.loadBoxAssignments());
    expect(out.pending.boxAssignments).toBe(true);
  });

  it('loadBoxAssignmentsSuccess stores items and clears pending', () => {
    const items = [boxAssignment({ boxNumber: 1 }), boxAssignment({ boxNumber: 2, extractorId: 99, extractorFullName: 'Juan' })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, boxAssignments: true } };
    const out = extractionReducer(start, A.loadBoxAssignmentsSuccess({ items }));
    expect(out.boxAssignments).toBe(items);
    expect(out.pending.boxAssignments).toBe(false);
  });

  it('loadBoxAssignmentsNotModified clears pending', () => {
    const items = [boxAssignment()];
    const start = { ...initialExtractionState, boxAssignments: items, pending: { ...initialExtractionState.pending, boxAssignments: true } };
    const out = extractionReducer(start, A.loadBoxAssignmentsNotModified());
    expect(out.boxAssignments).toBe(items);
    expect(out.pending.boxAssignments).toBe(false);
  });

  it('loadBoxAssignmentsFailure stores error and clears pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const out = extractionReducer(initialExtractionState, A.loadBoxAssignmentsFailure({ error }));
    expect(out.error).not.toBeNull();
    expect(out.pending.boxAssignments).toBe(false);
  });

  it('saveBoxAssignmentsSuccess updates boxAssignments and clears mutation pending', () => {
    const items = [boxAssignment({ boxNumber: 1, extractorId: 99, extractorFullName: 'Juan' })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, mutation: true } };
    const out = extractionReducer(start, A.saveBoxAssignmentsSuccess({ items }));
    expect(out.boxAssignments).toBe(items);
    expect(out.pending.mutation).toBe(false);
  });

  it('saveBoxAssignments (request) aplica actualización optimista de boxAssignments resolviendo nombre desde branchExtractors', () => {
    const start = {
      ...initialExtractionState,
      branchExtractors: [
        branchExtractor({ id: 10, fullName: 'María García' }),
        branchExtractor({ id: 20, fullName: 'Pedro Ruiz' }),
      ],
      boxAssignments: [
        boxAssignment({ boxNumber: 1, extractorId: null, extractorFullName: null }),
        boxAssignment({ boxNumber: 2, extractorId: null, extractorFullName: null }),
      ],
    };

    const out = extractionReducer(start, A.saveBoxAssignments({
      boxes: [
        { boxNumber: 1, extractorUserId: 10 },
        { boxNumber: 2, extractorUserId: null },
      ],
    }));

    expect(out.pending.mutation).toBe(true);
    expect(out.boxAssignments).toEqual([
      { boxNumber: 1, extractorId: 10, extractorFullName: 'María García' },
      { boxNumber: 2, extractorId: null, extractorFullName: null },
    ]);
  });

  it('saveBoxAssignments (request) deja extractorFullName null si el extractor no se encuentra en branchExtractors', () => {
    const start = {
      ...initialExtractionState,
      branchExtractors: [branchExtractor({ id: 10, fullName: 'María García' })],
    };

    const out = extractionReducer(start, A.saveBoxAssignments({
      boxes: [{ boxNumber: 3, extractorUserId: 99 }],
    }));

    expect(out.boxAssignments).toEqual([
      { boxNumber: 3, extractorId: 99, extractorFullName: null },
    ]);
  });

  // --- BranchExtractors ---------------------------------------------------
  it('loadBranchExtractors sets pending.branchExtractors=true', () => {
    const out = extractionReducer(initialExtractionState, A.loadBranchExtractors());
    expect(out.pending.branchExtractors).toBe(true);
  });

  it('loadBranchExtractorsSuccess stores items and clears pending', () => {
    const items = [branchExtractor({ id: 1 }), branchExtractor({ id: 2, fullName: 'María García' })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, branchExtractors: true } };
    const out = extractionReducer(start, A.loadBranchExtractorsSuccess({ items }));
    expect(out.branchExtractors).toBe(items);
    expect(out.pending.branchExtractors).toBe(false);
  });

  it('loadBranchExtractorsNotModified clears pending', () => {
    const items = [branchExtractor()];
    const start = { ...initialExtractionState, branchExtractors: items, pending: { ...initialExtractionState.pending, branchExtractors: true } };
    const out = extractionReducer(start, A.loadBranchExtractorsNotModified());
    expect(out.branchExtractors).toBe(items);
    expect(out.pending.branchExtractors).toBe(false);
  });

  it('loadBranchExtractorsFailure stores error and clears pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const out = extractionReducer(initialExtractionState, A.loadBranchExtractorsFailure({ error }));
    expect(out.error).not.toBeNull();
    expect(out.pending.branchExtractors).toBe(false);
  });

  // --- UI -----------------------------------------------------------------
  it('setSearch updates search', () => {
    const out = extractionReducer(initialExtractionState, A.setSearch({ search: 'lopez' }));
    expect(out.search).toBe('lopez');
  });

  // --- Mutations ----------------------------------------------------------
  it('assignExtractor sets mutation pending', () => {
    const s1 = extractionReducer(initialExtractionState, A.assignExtractor({ id: 1, boxNumber: 2, branchId: 7 }));
    expect(s1.pending.mutation).toBe(true);
  });

  it('assignExtractorSuccess saves lastAssigned and clears mutation pending (does NOT touch inProgress)', () => {
    const withPending = { ...initialExtractionState, pending: { ...initialExtractionState.pending, mutation: true } };
    const items = [inProgressItem({ id: 10 })];
    const withItems = { ...withPending, inProgress: items };
    const out = extractionReducer(withItems, A.assignExtractorSuccess({
      attentionId: 10,
      boxNumber: 2,
      extractorFullName: 'María García',
    }));
    expect(out.pending.mutation).toBe(false);
    expect(out.lastAssigned).toEqual({ attentionId: 10, boxNumber: 2, extractorFullName: 'María García' });
    // inProgress queda intacto; el refresh posterior lo actualiza
    expect(out.inProgress).toBe(items);
  });

  it('unassignExtractionSuccess clears lastAssigned and mutation pending', () => {
    const start = {
      ...initialExtractionState,
      pending: { ...initialExtractionState.pending, mutation: true },
      lastAssigned: { attentionId: 5, boxNumber: 1, extractorFullName: 'Juan' },
    };
    const out = extractionReducer(start, A.unassignExtractionSuccess({ id: 5 }));
    expect(out.lastAssigned).toBeNull();
    expect(out.pending.mutation).toBe(false);
  });

  it('cancel + end mutations toggle pending', () => {
    const s1 = extractionReducer(initialExtractionState, A.cancelExtraction({ id: 1, reason: 'no se presentó' }));
    expect(s1.pending.mutation).toBe(true);
    const s2 = extractionReducer(s1, A.cancelExtractionSuccess({ id: 1 }));
    expect(s2.pending.mutation).toBe(false);

    const s3 = extractionReducer(s2, A.endExtraction({ id: 1 }));
    expect(s3.pending.mutation).toBe(true);
    const s4 = extractionReducer(s3, A.endExtractionSuccess({ id: 1 }));
    expect(s4.pending.mutation).toBe(false);
  });

  it('unassignExtraction sets mutation pending', () => {
    const out = extractionReducer(initialExtractionState, A.unassignExtraction({ id: 5 }));
    expect(out.pending.mutation).toBe(true);
  });

  // --- Branches -----------------------------------------------------------
  it('loadBranchesSuccess stores branches and clears pending', () => {
    const items = [branch({ id: 1 }), branch({ id: 2, code: 'SUR', name: 'Sucursal Sur' })];
    const start = { ...initialExtractionState, pending: { ...initialExtractionState.pending, branches: true } };
    const out = extractionReducer(start, A.loadBranchesSuccess({ items }));
    expect(out.branches).toBe(items);
    expect(out.pending.branches).toBe(false);
  });

  it('setSelectedBranch resets data slices to allow refetch', () => {
    const start = {
      ...initialExtractionState,
      awaiting: [awaitingItem({ id: 9 })],
      inProgress: [inProgressItem({ id: 10 })],
      stats: { queueSize: 5, averageWaitMinutes: 3, finishedTodayByMe: 1 },
      boxOccupancy: [occItem()],
      boxAssignments: [boxAssignment()],
      branchExtractors: [branchExtractor()],
      selectedBranchId: 1,
    };
    const out = extractionReducer(start, A.setSelectedBranch({ branchId: 2 }));
    expect(out.selectedBranchId).toBe(2);
    expect(out.awaiting).toEqual([]);
    expect(out.inProgress).toEqual([]);
    expect(out.stats).toBeNull();
    expect(out.boxOccupancy).toEqual([]);
    expect(out.boxAssignments).toEqual([]);
    expect(out.branchExtractors).toEqual([]);
  });

  it('setSelectedBranch with same id is a no-op', () => {
    const start = { ...initialExtractionState, selectedBranchId: 3, awaiting: [awaitingItem({ id: 1 })] };
    const out = extractionReducer(start, A.setSelectedBranch({ branchId: 3 }));
    expect(out).toBe(start);
  });

  it('loadOccupancySuccess replaces boxOccupancy', () => {
    const items = [occItem({ box: 1 }), occItem({ box: 2, extractorId: 100 })];
    const out = extractionReducer(initialExtractionState, A.loadOccupancySuccess({ items }));
    expect(out.boxOccupancy).toBe(items);
    expect(out.pending.occupancy).toBe(false);
  });

  it('loadOccupancyNotModified keeps the existing occupancy list', () => {
    const items = [occItem()];
    const start = { ...initialExtractionState, boxOccupancy: items };
    const out = extractionReducer(start, A.loadOccupancyNotModified());
    expect(out.boxOccupancy).toBe(items);
    expect(out.lastRefreshAt).not.toBeNull();
  });
});
