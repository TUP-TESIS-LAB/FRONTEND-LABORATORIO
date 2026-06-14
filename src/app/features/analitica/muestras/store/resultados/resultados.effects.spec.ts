import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { ResultadosEffects } from './resultados.effects';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { selectGrid } from './resultados.selectors';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess,
} from './resultados.actions';

describe('ResultadosEffects', () => {
  let actions$: Observable<Action>;
  let api: any;
  let analysis: any;

  beforeEach(() => {
    api = {
      getResultsByProtocol: vi.fn(), getDeterminations: vi.fn(),
      getDeterminationCatalog: vi.fn(), batchUpdate: vi.fn(), markReady: vi.fn(),
    };
    analysis = { getById: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        ResultadosEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: selectGrid, value: { protocolId: 9, sections: [] } }] }),
        { provide: ResultadosApiService, useValue: api },
        { provide: AnalysisService, useValue: analysis },
      ],
    });
  });

  it('loadGrid$ ensambla el grid (fan-out) y emite success', async () => {
    api.getResultsByProtocol.mockReturnValue(of([{ id: 1, protocolId: 9, analysisOrderId: 100, sectionId: 80012, patientId: 20002 }]));
    api.getDeterminations.mockReturnValue(of([{ id: 11, analyticalResultId: 1, determinationCatalogId: 500, resultValue: '180', observations: null }]));
    api.getDeterminationCatalog.mockReturnValue(of({ id: 500, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 }));
    analysis.getById.mockReturnValue(of({ id: 6, shortCode: '6', name: 'Colesterol Total', familyName: null, ubCount: null }));
    actions$ = of(loadGrid({ protocolId: 9 }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.loadGrid$);
    expect(action.type).toBe('[Resultados API] Load Grid Success');
    expect((action as any).grid.sections).toHaveLength(1);
    expect((action as any).grid.sections[0].rows[0].cells[1]).toEqual({ determinationId: 11, value: '180' });
  });

  it('loadGrid$ sin results → success con grid vacío', async () => {
    api.getResultsByProtocol.mockReturnValue(of([]));
    actions$ = of(loadGrid({ protocolId: 9 }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.loadGrid$);
    expect((action as any).grid.sections).toEqual([]);
  });

  it('loadGrid$ failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getResultsByProtocol.mockReturnValue(throwError(() => error));
    actions$ = of(loadGrid({ protocolId: 9 }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.loadGrid$);
    expect(action).toEqual(loadGridFailure({ error }));
  });

  it('saveResults$ llama batchUpdate por result y emite success', async () => {
    api.batchUpdate.mockReturnValue(of([]));
    const items = [{ determinationId: 11, resultValue: '180', observations: null }];
    actions$ = of(saveResults({ results: [{ resultId: 1, items }] }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.saveResults$);
    expect(api.batchUpdate).toHaveBeenCalledWith(1, items);
    expect(action).toEqual(saveResultsSuccess());
  });

  it('saveResults$ failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    api.batchUpdate.mockReturnValue(throwError(() => error));
    actions$ = of(saveResults({ results: [{ resultId: 1, items: [] }] }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.saveResults$);
    expect(action).toEqual(saveResultsFailure({ error }));
  });

  it('markReady$ llama markReady por id y emite success', async () => {
    api.markReady.mockReturnValue(of({}));
    actions$ = of(markReady({ resultIds: [1, 2] }));
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.markReady$);
    expect(api.markReady).toHaveBeenCalledWith(1);
    expect(api.markReady).toHaveBeenCalledWith(2);
    expect(action).toEqual(markReadySuccess());
  });

  it('reloadAfterMutation$ re-dispara loadGrid con el protocolId del grid', async () => {
    actions$ = of(saveResultsSuccess());
    const effects = TestBed.inject(ResultadosEffects);
    const action = await firstValueFrom(effects.reloadAfterMutation$);
    expect(action).toEqual(loadGrid({ protocolId: 9 }));
  });
});
