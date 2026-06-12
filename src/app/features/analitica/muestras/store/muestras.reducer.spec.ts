import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { muestrasReducer } from './muestras.reducer';
import { initialMuestrasState } from './muestras.state';
import {
  initMuestrasSuccess,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
} from './muestras.actions';
import type { LabelWorklistItem } from '../models/label-worklist.model';

const item: LabelWorklistItem = {
  labelId: 60005, barcode: '60005', protocolId: 50001, analysisName: 'Hemograma',
  patientName: 'Ana López', urgent: false, status: 'COLLECTED', updatedAt: '2026-06-11T10:00:00Z',
};

describe('muestrasReducer', () => {
  it('initMuestrasSuccess setea sucursal', () => {
    const s = muestrasReducer(initialMuestrasState, initMuestrasSuccess({ branchId: 1001, branchName: 'CENTRAL' }));
    expect(s.branchId).toBe(1001);
    expect(s.branchName).toBe('CENTRAL');
  });

  it('loadRecoleccion marca pending', () => {
    const s = muestrasReducer(initialMuestrasState, loadRecoleccion());
    expect(s.pending).toBe(true);
  });

  it('success reemplaza items y limpia pending', () => {
    const s = muestrasReducer(
      { ...initialMuestrasState, pending: true, recoleccion: [] },
      loadRecoleccionSuccess({ items: [item] }),
    );
    expect(s.recoleccion).toEqual([item]);
    expect(s.pending).toBe(false);
  });

  it('notModified no muta items', () => {
    const before = { ...initialMuestrasState, recoleccion: [item], pending: true };
    const s = muestrasReducer(before, loadRecoleccionNotModified());
    expect(s.recoleccion).toBe(before.recoleccion);
    expect(s.pending).toBe(false);
  });

  it('failure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer({ ...initialMuestrasState, pending: true }, loadRecoleccionFailure({ error }));
    expect(s.error).toBe(error);
    expect(s.pending).toBe(false);
  });

  it('transition marca transitionPending y success lo limpia', () => {
    let s = muestrasReducer(initialMuestrasState, transitionLabels({ labelIds: [60005], transitionKey: 'transito' }));
    expect(s.transitionPending).toBe(true);
    s = muestrasReducer(s, transitionLabelsSuccess({ labelIds: [60005], transitionKey: 'transito' }));
    expect(s.transitionPending).toBe(false);
  });

  it('transition failure limpia transitionPending y setea error', () => {
    const error = new HttpErrorResponse({ status: 409 });
    let s = muestrasReducer(initialMuestrasState, transitionLabels({ labelIds: [60005], transitionKey: 'transito' }));
    s = muestrasReducer(s, transitionLabelsFailure({ error }));
    expect(s.transitionPending).toBe(false);
    expect(s.error).toBe(error);
  });
});
