import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { MuestrasEffects } from './muestras.effects';
import { MuestrasApiService } from '../services/muestras-api.service';
import {
  initMuestras, initMuestrasSuccess,
  loadRecoleccion, loadRecoleccionSuccess, loadRecoleccionNotModified,
  transitionLabels, transitionLabelsSuccess, transitionLabelsFailure,
  loadTransito, loadTransitoSuccess, loadTransitoNotModified, loadTransitoFailure,
  resolveRouting, resolveRoutingSuccess, resolveRoutingFailure,
  loadWorkspaces, loadWorkspacesSuccess, loadWorkspacesFailure,
  dispatchTubes, dispatchTubesSuccess, dispatchTubesFailure,
  deriveTubes, deriveTubesSuccess, deriveTubesFailure,
} from './muestras.actions';
import { selectMuestrasBranchId, selectTransitoItems } from './muestras.selectors';
import { NOT_MODIFIED } from '@core/refresh/polling-context';
import type { LabelWorklistItem } from '../models/label-worklist.model';
import type { BranchWorkspace, RoutingResolveResponse } from '../models/routing.model';

const item: LabelWorklistItem = {
  labelId: 60005, sampleId: null, barcode: '60005', protocolId: 50001, analysisName: 'Hemograma',
  patientName: 'Ana López', urgent: false, status: 'COLLECTED', updatedAt: '2026-06-11T10:00:00Z',
};

describe('MuestrasEffects', () => {
  let actions$: Observable<Action>;
  let api: {
    getMyBranches: ReturnType<typeof vi.fn>;
    getWorklist: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
    markLost: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
    resolveRouting: ReturnType<typeof vi.fn>;
    dispatch: ReturnType<typeof vi.fn>;
    sendToBranch: ReturnType<typeof vi.fn>;
    getBranchWorkspaces: ReturnType<typeof vi.fn>;
  };

  const transitoItem: LabelWorklistItem = {
    labelId: 70001, sampleId: 80001, barcode: '70001', protocolId: 50002, analysisName: 'Glucemia',
    patientName: 'Pedro García', urgent: false, status: 'IN_TRANSIT', updatedAt: '2026-06-12T08:00:00Z',
  };

  beforeEach(() => {
    api = {
      getMyBranches: vi.fn(), getWorklist: vi.fn(), updateStatus: vi.fn(),
      reject: vi.fn(), markLost: vi.fn(), rollback: vi.fn(),
      resolveRouting: vi.fn(), dispatch: vi.fn(), sendToBranch: vi.fn(), getBranchWorkspaces: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        MuestrasEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectMuestrasBranchId, value: 1001 },
            { selector: selectTransitoItems, value: [transitoItem] },
          ],
        }),
        { provide: MuestrasApiService, useValue: api },
      ],
    });
  });

  it('init resuelve la primera sucursal y guarda todas las sucursales', async () => {
    const branches = [
      { id: 1001, code: 'CENTRAL', name: 'Sede Central' },
      { id: 1002, code: 'NORTE', name: 'Belgrano' },
    ];
    api.getMyBranches.mockReturnValue(of(branches));
    actions$ = of(initMuestras());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.init$);
    expect(action).toEqual(initMuestrasSuccess({ branchId: 1001, branchName: 'Sede Central', branches }));
  });

  it('init sin sucursales mapea failure', async () => {
    api.getMyBranches.mockReturnValue(of([]));
    actions$ = of(initMuestras());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.init$);
    expect(action.type).toBe('[Muestras API] Init Failure');
  });

  it('initSuccess dispara loadRecoleccion', async () => {
    actions$ = of(initMuestrasSuccess({ branchId: 1001, branchName: 'Sede Central', branches: [] }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadAfterInit$);
    expect(action).toEqual(loadRecoleccion());
  });

  it('loadRecoleccion pide COLLECTED de la sucursal y mapea success', async () => {
    api.getWorklist.mockReturnValue(of([item]));
    actions$ = of(loadRecoleccion());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadRecoleccion$);
    expect(api.getWorklist).toHaveBeenCalledWith('COLLECTED', 1001);
    expect(action).toEqual(loadRecoleccionSuccess({ items: [item] }));
  });

  it('304 mapea a notModified', async () => {
    api.getWorklist.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadRecoleccion());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadRecoleccion$);
    expect(action).toEqual(loadRecoleccionNotModified());
  });

  it('transition transito llama updateStatus IN_TRANSIT', async () => {
    api.updateStatus.mockReturnValue(of({}));
    actions$ = of(transitionLabels({ labelIds: [60005, 60006], transitionKey: 'transito' }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.transition$);
    expect(api.updateStatus).toHaveBeenCalledWith([60005, 60006], 'IN_TRANSIT');
    expect(action).toEqual(transitionLabelsSuccess({ labelIds: [60005, 60006], transitionKey: 'transito' }));
  });

  it('transition rejected llama reject con motivo', async () => {
    api.reject.mockReturnValue(of({}));
    actions$ = of(transitionLabels({ labelIds: [60005], transitionKey: 'rejected', reason: 'hemólisis' }));
    const effects = TestBed.inject(MuestrasEffects);
    await firstValueFrom(effects.transition$);
    expect(api.reject).toHaveBeenCalledWith([60005], 'hemólisis');
  });

  it('transition lost llama markLost por cada id', async () => {
    api.markLost.mockReturnValue(of({}));
    actions$ = of(transitionLabels({ labelIds: [60005, 60006], transitionKey: 'lost' }));
    const effects = TestBed.inject(MuestrasEffects);
    await firstValueFrom(effects.transition$);
    expect(api.markLost).toHaveBeenCalledWith(60005);
    expect(api.markLost).toHaveBeenCalledWith(60006);
  });

  it('transition rollback llama rollback', async () => {
    api.rollback.mockReturnValue(of({}));
    actions$ = of(transitionLabels({ labelIds: [60005], transitionKey: 'rollback' }));
    const effects = TestBed.inject(MuestrasEffects);
    await firstValueFrom(effects.transition$);
    expect(api.rollback).toHaveBeenCalledWith([60005]);
  });

  it('transition failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 409 });
    api.updateStatus.mockReturnValue(throwError(() => error));
    actions$ = of(transitionLabels({ labelIds: [60005], transitionKey: 'transito' }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.transition$);
    expect(action).toEqual(transitionLabelsFailure({ error }));
  });

  it('transitionSuccess re-dispara loadRecoleccion', async () => {
    actions$ = of(transitionLabelsSuccess({ labelIds: [60005], transitionKey: 'transito' }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.reloadAfterTransition$);
    expect(action).toEqual(loadRecoleccion());
  });

  // ── loadTransito ──────────────────────────────────────────────────────────

  it('loadTransito pide IN_TRANSIT de la sucursal y mapea success', async () => {
    api.getWorklist.mockReturnValue(of([transitoItem]));
    actions$ = of(loadTransito());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadTransito$);
    expect(api.getWorklist).toHaveBeenCalledWith('IN_TRANSIT', 1001);
    expect(action).toEqual(loadTransitoSuccess({ items: [transitoItem] }));
  });

  it('loadTransito 304 mapea a notModified', async () => {
    api.getWorklist.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadTransito());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadTransito$);
    expect(action).toEqual(loadTransitoNotModified());
  });

  // ── resolveRouting ────────────────────────────────────────────────────────

  it('resolveRouting deduplica protocolIds y mapea success', async () => {
    const dupItem: LabelWorklistItem = { ...transitoItem, labelId: 70002, protocolId: 50002 };
    // Reinicializar con dos items que tienen el mismo protocolId para probar la deduplicación real
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        MuestrasEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectMuestrasBranchId, value: 1001 },
            { selector: selectTransitoItems, value: [transitoItem, dupItem] },
          ],
        }),
        { provide: MuestrasApiService, useValue: api },
      ],
    });
    const routing: RoutingResolveResponse = { groups: [], unresolvable: [] };
    api.resolveRouting.mockReturnValue(of(routing));
    actions$ = of(resolveRouting());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.resolveRouting$);
    // Dos items con protocolId 50002 → solo un id único enviado
    expect(api.resolveRouting).toHaveBeenCalledWith([50002], 1001);
    expect(action).toEqual(resolveRoutingSuccess({ routing }));
  });

  it('loadTransitoSuccess dispara resolveRouting', async () => {
    const transitoItems: LabelWorklistItem[] = [transitoItem];
    actions$ = of(loadTransitoSuccess({ items: transitoItems }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.resolveAfterTransitoLoad$);
    expect(action).toEqual(resolveRouting());
  });

  it('resolveRouting failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    api.resolveRouting.mockReturnValue(throwError(() => error));
    actions$ = of(resolveRouting());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.resolveRouting$);
    expect(action).toEqual(resolveRoutingFailure({ error }));
  });

  // ── loadWorkspaces ────────────────────────────────────────────────────────

  it('loadWorkspaces pide workspaces de la sucursal y mapea success', async () => {
    const workspace: BranchWorkspace = { id: 1, branchId: 1001, areaId: 2, sectionId: 3 };
    api.getBranchWorkspaces.mockReturnValue(of([workspace]));
    actions$ = of(loadWorkspaces());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadWorkspaces$);
    expect(api.getBranchWorkspaces).toHaveBeenCalledWith(1001);
    expect(action).toEqual(loadWorkspacesSuccess({ workspaces: [workspace] }));
  });

  it('loadWorkspaces failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getBranchWorkspaces.mockReturnValue(throwError(() => error));
    actions$ = of(loadWorkspaces());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadWorkspaces$);
    expect(action).toEqual(loadWorkspacesFailure({ error }));
  });

  // ── dispatchTubes ─────────────────────────────────────────────────────────

  it('dispatchTubes llama api.dispatch y mapea success con count', async () => {
    const checkIns = [{ sampleId: 80001, sectionId: 3 }, { sampleId: 80002, sectionId: 3 }];
    api.dispatch.mockReturnValue(of({}));
    actions$ = of(dispatchTubes({ checkIns }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.dispatchTubes$);
    expect(api.dispatch).toHaveBeenCalledWith(checkIns);
    expect(action).toEqual(dispatchTubesSuccess({ count: 2 }));
  });

  it('dispatchTubes failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.dispatch.mockReturnValue(throwError(() => error));
    actions$ = of(dispatchTubes({ checkIns: [{ sampleId: 80001, sectionId: 3 }] }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.dispatchTubes$);
    expect(action).toEqual(dispatchTubesFailure({ error }));
  });

  // ── deriveTubes ───────────────────────────────────────────────────────────

  it('deriveTubes llama api.sendToBranch y mapea success con tubeCount (no labelIds.length)', async () => {
    api.sendToBranch.mockReturnValue(of({}));
    // 2 labels pero solo 1 tubo → el count debe ser 1 (tubeCount), no 2 (labelIds.length)
    actions$ = of(deriveTubes({ labelIds: [70001, 70002], destinationBranchId: 1002, tubeCount: 1, observation: 'test' }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.deriveTubes$);
    expect(api.sendToBranch).toHaveBeenCalledWith([70001, 70002], 1002, 'test');
    expect(action).toEqual(deriveTubesSuccess({ count: 1 }));
  });

  it('deriveTubes failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    api.sendToBranch.mockReturnValue(throwError(() => error));
    actions$ = of(deriveTubes({ labelIds: [70001], destinationBranchId: 1002, tubeCount: 1 }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.deriveTubes$);
    expect(action).toEqual(deriveTubesFailure({ error }));
  });

  // ── reloadAfterDispatch ───────────────────────────────────────────────────

  it('dispatchTubesSuccess emite loadTransito (routing se encadena via resolveAfterTransitoLoad$)', async () => {
    actions$ = of(dispatchTubesSuccess({ count: 1 }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.reloadAfterDispatch$);
    expect(action).toEqual(loadTransito());
  });

  it('deriveTubesSuccess emite loadTransito (routing se encadena via resolveAfterTransitoLoad$)', async () => {
    actions$ = of(deriveTubesSuccess({ count: 1 }));
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.reloadAfterDispatch$);
    expect(action).toEqual(loadTransito());
  });
});
