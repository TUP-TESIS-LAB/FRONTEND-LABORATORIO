import {
  AwaitingExtractionItem,
  BoxAssignment,
  BoxOccupancyItem,
  BranchExtractor,
  BranchOption,
  InExtractionItem,
} from '../../models/extraction.model';
import {
  selectAwaiting,
  selectAwaitingToday,
  selectBoxAssignments,
  selectBoxIsOccupied,
  selectBranchExtractors,
  selectBranches,
  selectExtractionState,
  selectInProgress,
  selectInProgressToday,
  selectLastAssigned,
  selectMyBoxOccupancy,
  selectSelectedBranch,
} from './extraction.selectors';

/** ISO local (sin Z) a las 10:00 del día de `d`. */
function localIsoAt10(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T10:00:00`;
}
import { EXTRACTION_FEATURE_KEY, ExtractionFeatureState, initialExtractionState } from './extraction.state';

function aw(over: Partial<AwaitingExtractionItem>): AwaitingExtractionItem {
  return {
    id: 1, patientId: 10, patientFullName: 'Ana', patientDni: '111',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', publicCode: null, isUrgent: false, analysisCount: 1,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0,
    samples: [],
    ...over,
  };
}
function ip(over: Partial<InExtractionItem>): InExtractionItem {
  return {
    ...aw({}),
    attentionBox: 1,
    extractionStartedAt: '',
    extractorId: 1,
    extractorFullName: 'Juan',
    ...over,
  };
}
function br(over: Partial<BranchOption> = {}): BranchOption {
  return { id: 1, code: 'NORTE', name: 'Sucursal Norte', ...over };
}
function occ(over: Partial<BoxOccupancyItem> = {}): BoxOccupancyItem {
  return {
    box: 1, extractorId: 100, extractorFullName: 'Otro',
    attentionId: 11, attentionNumber: 'A-1', ...over,
  };
}
function boxAsgn(over: Partial<BoxAssignment> = {}): BoxAssignment {
  return { boxNumber: 1, extractorId: null, extractorFullName: null, ...over };
}
function brExtractor(over: Partial<BranchExtractor> = {}): BranchExtractor {
  return { id: 1, fullName: 'Juan Pérez', ...over };
}

function stateWith(patch: Partial<ExtractionFeatureState>): { [EXTRACTION_FEATURE_KEY]: ExtractionFeatureState } {
  return { [EXTRACTION_FEATURE_KEY]: { ...initialExtractionState, ...patch } };
}

describe('extraction selectors', () => {
  it('selectExtractionState reads the feature slice', () => {
    const root = stateWith({ search: 'foo' });
    expect(selectExtractionState(root).search).toBe('foo');
  });

  // --- selectAwaiting -----------------------------------------------------
  it('selectAwaiting returns unfiltered items when search is empty', () => {
    const items = [aw({ id: 1 }), aw({ id: 2 })];
    const root = stateWith({ awaiting: items });
    expect(selectAwaiting(root)).toEqual(items);
  });

  it('selectAwaiting filters by full name (case insensitive)', () => {
    const items = [
      aw({ id: 1, patientFullName: 'Maria LOPEZ' }),
      aw({ id: 2, patientFullName: 'Carlos Perez' }),
    ];
    const root = stateWith({ awaiting: items, search: 'lopez' });
    const out = selectAwaiting(root);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(1);
  });

  it('selectAwaiting filters by DNI substring', () => {
    const items = [
      aw({ id: 1, patientDni: '30111222' }),
      aw({ id: 2, patientDni: '12345678' }),
    ];
    const root = stateWith({ awaiting: items, search: '1112' });
    expect(selectAwaiting(root).map((i) => i.id)).toEqual([1]);
  });

  it('selectAwaiting does NOT reorder — preserves backend order', () => {
    const items = [
      aw({ id: 1, isUrgent: true }),
      aw({ id: 2, isUrgent: false }),
      aw({ id: 3, isUrgent: false }),
    ];
    const root = stateWith({ awaiting: items });
    expect(selectAwaiting(root).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  // --- selectAwaitingToday / selectInProgressToday ------------------------
  it('selectAwaitingToday solo deja las atenciones creadas HOY', () => {
    const now = new Date();
    const ayer = new Date(now); ayer.setDate(now.getDate() - 1);
    const items = [
      aw({ id: 1, createdAt: localIsoAt10(now) }),
      aw({ id: 2, createdAt: localIsoAt10(ayer) }),
      aw({ id: 3, createdAt: '' }),
    ];
    const root = stateWith({ awaiting: items });
    expect(selectAwaitingToday(root).map((i) => i.id)).toEqual([1]);
  });

  it('selectInProgressToday solo deja las extracciones cuya atención es de HOY', () => {
    const now = new Date();
    const ayer = new Date(now); ayer.setDate(now.getDate() - 1);
    const list = [
      ip({ id: 1, createdAt: localIsoAt10(now) }),
      ip({ id: 2, createdAt: localIsoAt10(ayer) }),
    ];
    const root = stateWith({ inProgress: list });
    expect(selectInProgressToday(root).map((i) => i.id)).toEqual([1]);
  });

  // --- selectInProgress ---------------------------------------------------
  it('selectInProgress returns inProgress slice', () => {
    const list = [ip({ id: 1 }), ip({ id: 2 })];
    const root = stateWith({ inProgress: list });
    expect(selectInProgress(root)).toBe(list);
  });

  it('selectInProgress is empty in initial state', () => {
    const root = stateWith({});
    expect(selectInProgress(root)).toEqual([]);
  });

  // --- selectBranchExtractors ---------------------------------------------
  it('selectBranchExtractors returns the branchExtractors slice', () => {
    const list = [brExtractor({ id: 1 }), brExtractor({ id: 2, fullName: 'María García' })];
    const root = stateWith({ branchExtractors: list });
    expect(selectBranchExtractors(root)).toBe(list);
  });

  // --- selectBoxAssignments -----------------------------------------------
  it('selectBoxAssignments returns the boxAssignments slice', () => {
    const list = [boxAsgn({ boxNumber: 1 }), boxAsgn({ boxNumber: 2, extractorId: 5, extractorFullName: 'Ana' })];
    const root = stateWith({ boxAssignments: list });
    expect(selectBoxAssignments(root)).toBe(list);
  });

  // --- selectLastAssigned -------------------------------------------------
  it('selectLastAssigned returns null in initial state', () => {
    expect(selectLastAssigned(stateWith({}))).toBeNull();
  });

  it('selectLastAssigned returns the stored lastAssigned value', () => {
    const lastAssigned = { attentionId: 10, boxNumber: 2, extractorFullName: 'María García' };
    const root = stateWith({ lastAssigned });
    expect(selectLastAssigned(root)).toEqual(lastAssigned);
  });

  // --- selectBranches / selectSelectedBranch ------------------------------
  it('selectBranches returns the branches slice', () => {
    const list = [br({ id: 1 }), br({ id: 2, name: 'Sucursal Sur' })];
    const root = stateWith({ branches: list });
    expect(selectBranches(root)).toBe(list);
  });

  it('selectSelectedBranch derives the BranchOption from id', () => {
    const list = [br({ id: 1 }), br({ id: 2, name: 'Sucursal Sur' })];
    const root = stateWith({ branches: list, selectedBranchId: 2 });
    expect(selectSelectedBranch(root)?.name).toBe('Sucursal Sur');
  });

  it('selectSelectedBranch is null when no id selected', () => {
    const root = stateWith({ branches: [br()], selectedBranchId: null });
    expect(selectSelectedBranch(root)).toBeNull();
  });

  // --- selectMyBoxOccupancy / selectBoxIsOccupied -------------------------
  it('selectMyBoxOccupancy returns the row where extractorId matches', () => {
    const rows = [occ({ box: 1, extractorId: 100 }), occ({ box: 3, extractorId: 50 })];
    const root = stateWith({ boxOccupancy: rows });
    expect(selectMyBoxOccupancy(50)(root)?.box).toBe(3);
  });

  it('selectMyBoxOccupancy returns null when no match', () => {
    const rows = [occ({ box: 1, extractorId: 100 })];
    const root = stateWith({ boxOccupancy: rows });
    expect(selectMyBoxOccupancy(999)(root)).toBeNull();
  });

  it('selectBoxIsOccupied is true when another extractor is on that box', () => {
    const rows = [occ({ box: 5, extractorId: 200 })];
    const root = stateWith({ boxOccupancy: rows });
    expect(selectBoxIsOccupied(5, 50)(root)).toBe(true);
  });

  it('selectBoxIsOccupied is false when the box is mine', () => {
    const rows = [occ({ box: 5, extractorId: 50 })];
    const root = stateWith({ boxOccupancy: rows });
    expect(selectBoxIsOccupied(5, 50)(root)).toBe(false);
  });

  it('selectBoxIsOccupied is false when no row matches', () => {
    const root = stateWith({ boxOccupancy: [occ({ box: 1, extractorId: 200 })] });
    expect(selectBoxIsOccupied(99, 50)(root)).toBe(false);
  });
});
