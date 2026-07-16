import { HttpErrorResponse } from '@angular/common/http';
import { AttentionState } from '../../models/atencion.model';
import { UrgentInProgressItem } from '../../models/urgent-in-progress.model';
import * as A from './urgent-in-progress.actions';
import { urgentInProgressReducer } from './urgent-in-progress.reducer';
import { initialUrgentInProgressState } from './urgent-in-progress.state';

function item(over: Partial<UrgentInProgressItem> = {}): UrgentInProgressItem {
  return {
    attentionId: 1,
    attentionNumber: 'A-001',
    patientFullName: 'Juan Perez',
    patientDni: '30111222',
    attentionState: AttentionState.AWAITING_EXTRACTION,
    urgentSince: '2026-07-01T10:00:00Z',
    ...over,
  };
}

describe('urgentInProgressReducer', () => {

  it('loadUrgentInProgress sets loading=true and clears error', () => {
    const start = { ...initialUrgentInProgressState, error: new HttpErrorResponse({ status: 500 }) };
    const next = urgentInProgressReducer(start, A.loadUrgentInProgress());
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadUrgentInProgressSuccess setea board', () => {
    const s = urgentInProgressReducer(
      { ...initialUrgentInProgressState, loading: true },
      A.loadUrgentInProgressSuccess({ board: { slaTargetMinutes: 60, items: [item()] } }),
    );
    expect(s.board?.items.length).toBe(1);
    expect(s.board?.slaTargetMinutes).toBe(60);
    expect(s.loading).toBe(false);
  });

  it('loadUrgentInProgressNotModified es no-op (mantiene board)', () => {
    const board = { slaTargetMinutes: 60, items: [item()] };
    const base = { ...initialUrgentInProgressState, board, loading: true };
    const s = urgentInProgressReducer(base, A.loadUrgentInProgressNotModified());
    expect(s.board?.items.length).toBe(1);
    expect(s.board).toBe(board); // same reference
    expect(s.loading).toBe(false);
  });

  it('loadUrgentInProgressFailure stores error and clears loading', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = urgentInProgressReducer(
      { ...initialUrgentInProgressState, loading: true },
      A.loadUrgentInProgressFailure({ error }),
    );
    expect(s.error).toBe(error);
    expect(s.loading).toBe(false);
  });
});
