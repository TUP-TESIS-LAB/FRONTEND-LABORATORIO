import { HttpErrorResponse } from '@angular/common/http';
import { AwaitingExtractionItem, ExtractionStats, InExtractionItem } from '../../models/extraction.model';
import * as A from './extraction.actions';
import { extractionReducer } from './extraction.reducer';
import { initialExtractionState } from './extraction.state';

function awaitingItem(over: Partial<AwaitingExtractionItem> = {}): AwaitingExtractionItem {
  return {
    id: 1, patientId: 10, patientFullName: 'Ana', patientDni: '111',
    patientBirthDate: null, patientGender: null,
    attentionNumber: 'A-1', isUrgent: false, analysisCount: 2,
    insurancePlanLabel: null, createdAt: '2026-01-01T00:00:00Z', waitMinutes: 5,
    ...over,
  };
}
function mineItem(over: Partial<InExtractionItem> = {}): InExtractionItem {
  return {
    ...awaitingItem(),
    attentionBox: 1,
    extractionStartedAt: '2026-01-01T00:05:00Z',
    extractorId: 99,
    ...over,
  };
}

describe('extractionReducer', () => {
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

  it('loadMineSuccess + loadMineNotModified handle mine list', () => {
    const items = [mineItem({ id: 3 })];
    const s1 = extractionReducer(initialExtractionState, A.loadMineSuccess({ items }));
    expect(s1.mine).toBe(items);
    const s2 = extractionReducer(s1, A.loadMineNotModified());
    expect(s2.mine).toBe(items);
  });

  it('loadStatsSuccess stores stats', () => {
    const stats: ExtractionStats = { queueSize: 4, averageWaitMinutes: 10, finishedTodayByMe: 2 };
    const out = extractionReducer(initialExtractionState, A.loadStatsSuccess({ stats }));
    expect(out.stats).toEqual(stats);
  });

  it('setSearch updates search', () => {
    const out = extractionReducer(initialExtractionState, A.setSearch({ search: 'lopez' }));
    expect(out.search).toBe('lopez');
  });

  it('assignExtractor sets mutation pending, success clears it', () => {
    const s1 = extractionReducer(initialExtractionState, A.assignExtractor({ id: 1, box: 2 }));
    expect(s1.pending.mutation).toBe(true);
    const s2 = extractionReducer(s1, A.assignExtractorSuccess({ id: 1 }));
    expect(s2.pending.mutation).toBe(false);
  });

  it('cancel + end mutations toggle pending', () => {
    const s1 = extractionReducer(initialExtractionState, A.cancelExtraction({ id: 1 }));
    expect(s1.pending.mutation).toBe(true);
    const s2 = extractionReducer(s1, A.cancelExtractionSuccess({ id: 1 }));
    expect(s2.pending.mutation).toBe(false);

    const s3 = extractionReducer(s2, A.endExtraction({ id: 1 }));
    expect(s3.pending.mutation).toBe(true);
    const s4 = extractionReducer(s3, A.endExtractionSuccess({ id: 1 }));
    expect(s4.pending.mutation).toBe(false);
  });
});
