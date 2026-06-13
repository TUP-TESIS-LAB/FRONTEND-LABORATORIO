import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { muestrasReducer } from './muestras.reducer';
import { initialMuestrasState } from './muestras.state';
import {
  initMuestrasSuccess,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified, loadRecoleccionFailure,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
  loadTransitoSuccess, loadTransitoNotModified, loadTransitoFailure,
  loadDescarteSuccess, loadDescarteNotModified, loadDescarteFailure,
  resolveRoutingSuccess, resolveRoutingFailure,
  loadWorkspacesSuccess, loadWorkspacesFailure,
  dispatchTubes, dispatchTubesSuccess, dispatchTubesFailure,
  deriveTubes, deriveTubesSuccess, deriveTubesFailure,
  loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
} from './muestras.actions';
import { selectProcesamientoItems } from './muestras.selectors';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

const item: LabelWorklistItem = {
  labelId: 60005, sampleId: null, barcode: '60005', protocolId: 50001, analysisName: 'Hemograma',
  patientName: 'Ana López', urgent: false, status: 'COLLECTED', updatedAt: '2026-06-11T10:00:00Z',
};

describe('muestrasReducer', () => {
  it('initMuestrasSuccess setea sucursal y lista de sucursales', () => {
    const branches = [
      { id: 1001, code: 'CENTRAL', name: 'CENTRAL' },
      { id: 1002, code: 'NORTE', name: 'NORTE' },
    ];
    const s = muestrasReducer(initialMuestrasState, initMuestrasSuccess({ branchId: 1001, branchName: 'CENTRAL', branches }));
    expect(s.branchId).toBe(1001);
    expect(s.branchName).toBe('CENTRAL');
    expect(s.branches).toEqual(branches);
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

  // ── Tránsito ──────────────────────────────────────────────────────────────

  const transitoItem: LabelWorklistItem = {
    labelId: 70001, sampleId: 80001, barcode: '70001', protocolId: 50002, analysisName: 'Glucemia',
    patientName: 'Pedro García', urgent: false, status: 'IN_TRANSIT', updatedAt: '2026-06-12T08:00:00Z',
  };

  it('loadTransitoSuccess reemplaza transito items', () => {
    const s = muestrasReducer(initialMuestrasState, loadTransitoSuccess({ items: [transitoItem] }));
    expect(s.transito).toEqual([transitoItem]);
  });

  it('loadTransitoNotModified no muta transito items', () => {
    const before = { ...initialMuestrasState, transito: [transitoItem] };
    const s = muestrasReducer(before, loadTransitoNotModified());
    expect(s.transito).toBe(before.transito);
  });

  it('loadTransitoFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(initialMuestrasState, loadTransitoFailure({ error }));
    expect(s.error).toBe(error);
  });

  // ── Descarte ──────────────────────────────────────────────────────────────

  const descarteItem: LabelWorklistItem = {
    labelId: 90001, sampleId: 80002, barcode: '90001', protocolId: 50003, analysisName: 'Cultivo',
    patientName: 'Carlos Ruiz', urgent: false, status: 'REJECTED', updatedAt: '2026-06-12T09:00:00Z',
    rejectionReason: 'Hemólisis severa',
  };

  it('loadDescarteSuccess reemplaza descarte items', () => {
    const s = muestrasReducer(initialMuestrasState, loadDescarteSuccess({ items: [descarteItem] }));
    expect(s.descarte).toEqual([descarteItem]);
  });

  it('loadDescarteNotModified no muta descarte items', () => {
    const before = { ...initialMuestrasState, descarte: [descarteItem] };
    const s = muestrasReducer(before, loadDescarteNotModified());
    expect(s.descarte).toBe(before.descarte);
  });

  it('loadDescarteFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(initialMuestrasState, loadDescarteFailure({ error }));
    expect(s.error).toBe(error);
  });

  // ── Routing ───────────────────────────────────────────────────────────────

  const routing: RoutingResolveResponse = {
    groups: [],
    unresolvable: [],
  };

  it('resolveRoutingSuccess setea routing', () => {
    const s = muestrasReducer(initialMuestrasState, resolveRoutingSuccess({ routing }));
    expect(s.routing).toBe(routing);
  });

  it('resolveRoutingFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 422 });
    const s = muestrasReducer(initialMuestrasState, resolveRoutingFailure({ error }));
    expect(s.error).toBe(error);
  });

  // ── Workspaces ────────────────────────────────────────────────────────────

  const workspace: BranchWorkspace = { id: 1, branchId: 1001, areaId: 2, sectionId: 3 };

  it('loadWorkspacesSuccess setea workspaces', () => {
    const s = muestrasReducer(initialMuestrasState, loadWorkspacesSuccess({ workspaces: [workspace] }));
    expect(s.workspaces).toEqual([workspace]);
  });

  it('loadWorkspacesFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(initialMuestrasState, loadWorkspacesFailure({ error }));
    expect(s.error).toBe(error);
  });

  // ── dispatchPending lifecycle ─────────────────────────────────────────────

  it('dispatchTubes marca dispatchPending y limpia error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(
      { ...initialMuestrasState, error },
      dispatchTubes({ checkIns: [{ sampleId: 80001, sectionId: 3 }] }),
    );
    expect(s.dispatchPending).toBe(true);
    expect(s.error).toBeNull();
  });

  it('dispatchTubesSuccess limpia dispatchPending', () => {
    const s = muestrasReducer(
      { ...initialMuestrasState, dispatchPending: true },
      dispatchTubesSuccess({ count: 1 }),
    );
    expect(s.dispatchPending).toBe(false);
  });

  it('dispatchTubesFailure limpia dispatchPending y setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(
      { ...initialMuestrasState, dispatchPending: true },
      dispatchTubesFailure({ error }),
    );
    expect(s.dispatchPending).toBe(false);
    expect(s.error).toBe(error);
  });

  it('deriveTubes marca dispatchPending y limpia error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(
      { ...initialMuestrasState, error },
      deriveTubes({ labelIds: [70001], destinationBranchId: 1002, tubeCount: 1 }),
    );
    expect(s.dispatchPending).toBe(true);
    expect(s.error).toBeNull();
  });

  it('deriveTubesSuccess limpia dispatchPending', () => {
    const s = muestrasReducer(
      { ...initialMuestrasState, dispatchPending: true },
      deriveTubesSuccess({ count: 1 }),
    );
    expect(s.dispatchPending).toBe(false);
  });

  it('deriveTubesFailure limpia dispatchPending y setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(
      { ...initialMuestrasState, dispatchPending: true },
      deriveTubesFailure({ error }),
    );
    expect(s.dispatchPending).toBe(false);
    expect(s.error).toBe(error);
  });

  // ── Procesamiento ───────────────────────────────────────────────────────────
  const procItem: LabelWorklistItem = {
    labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 50005, analysisName: 'Hemograma',
    patientName: 'Marta Gómez', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
  };

  it('loadProcesamientoSuccess reemplaza procesamiento items', () => {
    const s = muestrasReducer(initialMuestrasState, loadProcesamientoSuccess({ items: [procItem] }));
    expect(s.procesamiento).toEqual([procItem]);
    expect(s.error).toBeNull();
  });

  it('loadProcesamientoNotModified no muta procesamiento items', () => {
    const before = { ...initialMuestrasState, procesamiento: [procItem] };
    const s = muestrasReducer(before, loadProcesamientoNotModified());
    expect(s.procesamiento).toBe(before.procesamiento);
  });

  it('loadProcesamientoFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(initialMuestrasState, loadProcesamientoFailure({ error }));
    expect(s.error).toBe(error);
  });

  it('selectProcesamientoItems proyecta el slice procesamiento', () => {
    const state = { ...initialMuestrasState, procesamiento: [procItem] };
    expect(selectProcesamientoItems.projector(state)).toEqual([procItem]);
  });
});
