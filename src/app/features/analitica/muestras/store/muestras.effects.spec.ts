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
} from './muestras.actions';
import { selectMuestrasBranchId } from './muestras.selectors';
import { NOT_MODIFIED } from '@core/refresh/polling-context';
import type { LabelWorklistItem } from '../models/label-worklist.model';

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
  };

  beforeEach(() => {
    api = {
      getMyBranches: vi.fn(), getWorklist: vi.fn(), updateStatus: vi.fn(),
      reject: vi.fn(), markLost: vi.fn(), rollback: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        MuestrasEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: selectMuestrasBranchId, value: 1001 }] }),
        { provide: MuestrasApiService, useValue: api },
      ],
    });
  });

  it('init resuelve la primera sucursal', async () => {
    api.getMyBranches.mockReturnValue(of([
      { id: 1001, code: 'CENTRAL', name: 'Sede Central' },
      { id: 1002, code: 'NORTE', name: 'Belgrano' },
    ]));
    actions$ = of(initMuestras());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.init$);
    expect(action).toEqual(initMuestrasSuccess({ branchId: 1001, branchName: 'Sede Central' }));
  });

  it('init sin sucursales mapea failure', async () => {
    api.getMyBranches.mockReturnValue(of([]));
    actions$ = of(initMuestras());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.init$);
    expect(action.type).toBe('[Muestras API] Init Failure');
  });

  it('initSuccess dispara loadRecoleccion', async () => {
    actions$ = of(initMuestrasSuccess({ branchId: 1001, branchName: 'Sede Central' }));
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
});
