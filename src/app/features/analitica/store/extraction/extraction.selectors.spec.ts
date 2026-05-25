import { AwaitingExtractionItem, InExtractionItem } from '../../models/extraction.model';
import { selectAwaiting, selectCanTakeMore, selectExtractionState } from './extraction.selectors';
import { EXTRACTION_FEATURE_KEY, ExtractionFeatureState, initialExtractionState } from './extraction.state';

function aw(over: Partial<AwaitingExtractionItem>): AwaitingExtractionItem {
  return {
    id: 1, patientId: 10, patientFullName: 'Ana', patientDni: '111',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', isUrgent: false, analysisCount: 1,
    insurancePlanLabel: null, createdAt: '', waitMinutes: 0,
    ...over,
  };
}
function mine(over: Partial<InExtractionItem>): InExtractionItem {
  return {
    ...aw({}),
    attentionBox: 1,
    extractionStartedAt: '',
    extractorId: 1,
    ...over,
  };
}

function stateWith(patch: Partial<ExtractionFeatureState>): { [EXTRACTION_FEATURE_KEY]: ExtractionFeatureState } {
  return { [EXTRACTION_FEATURE_KEY]: { ...initialExtractionState, ...patch } };
}

describe('extraction selectors', () => {
  it('selectExtractionState reads the feature slice', () => {
    const root = stateWith({ search: 'foo' });
    expect(selectExtractionState(root).search).toBe('foo');
  });

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
    // backend returns urgent first; we just keep the order.
    const items = [
      aw({ id: 1, isUrgent: true }),
      aw({ id: 2, isUrgent: false }),
      aw({ id: 3, isUrgent: false }),
    ];
    const root = stateWith({ awaiting: items });
    expect(selectAwaiting(root).map((i) => i.id)).toEqual([1, 2, 3]);
  });

  it('selectCanTakeMore is true when mine is empty', () => {
    const root = stateWith({ mine: [] });
    expect(selectCanTakeMore(root)).toBe(true);
  });

  it('selectCanTakeMore is false when mine has at least 1', () => {
    const root = stateWith({ mine: [mine({ id: 1 })] });
    expect(selectCanTakeMore(root)).toBe(false);
  });
});
