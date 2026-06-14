import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PostanaliticaEffects } from './postanalitica.effects';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { selectValidationView } from './postanalitica.selectors';
import {
  loadValidation, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess,
} from './postanalitica.actions';

describe('PostanaliticaEffects', () => {
  let actions$: Observable<Action>;
  let api: any;
  let resultados: any;

  beforeEach(() => {
    api = { getStudy: vi.fn(), getResultsValidation: vi.fn(), validateDetermination: vi.fn(), validateAll: vi.fn() };
    resultados = { getDeterminations: vi.fn(), getDeterminationCatalog: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        PostanaliticaEffects,
        provideMockActions(() => actions$),
        provideMockStore({ selectors: [{ selector: selectValidationView, value: { protocolId: 9, studyStatus: 'PENDING', results: [] } }] }),
        { provide: PostanaliticaApiService, useValue: api },
        { provide: ResultadosApiService, useValue: resultados },
      ],
    });
  });

  it('loadValidation$ ensambla la vista (fan-out con nombres)', async () => {
    api.getStudy.mockReturnValue(of({ id: 7, protocolId: 9, patientId: 20002, currentStatus: 'PENDING', expectedResultsCount: 1, signedResultsCount: 0 }));
    api.getResultsValidation.mockReturnValue(of([{
      result: { id: 1, studyId: 7, analyticResultId: 50, status: 'VALIDATING', sectionId: 80012 },
      validations: [{ validation: { id: 100, resultId: 1, determinationId: 500, aggregateOutcome: 'PASS', manualOutcome: null } }],
    }]));
    resultados.getDeterminations.mockReturnValue(of([{ id: 500, analyticalResultId: 50, determinationCatalogId: 9000, resultValue: '180', observations: null }]));
    resultados.getDeterminationCatalog.mockReturnValue(of({ id: 9000, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 }));
    actions$ = of(loadValidation({ protocolId: 9 }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.loadValidation$);
    expect(action.type).toBe('[Postanalitica API] Load Validation Success');
    expect((action as any).view.results[0].rows[0]).toEqual({ determinationId: 500, name: 'Colesterol Total', aggregateOutcome: 'PASS', manualOutcome: null });
  });

  it('loadValidation$ study 404 + sin results → success con vista vacía', async () => {
    api.getStudy.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    api.getResultsValidation.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    actions$ = of(loadValidation({ protocolId: 9 }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.loadValidation$);
    expect(action.type).toBe('[Postanalitica API] Load Validation Success');
    expect((action as any).view.studyStatus).toBeNull();
    expect((action as any).view.results).toEqual([]);
  });

  it('loadValidation$ absorbe error de results (catch→[]) → success con vista vacía', async () => {
    api.getStudy.mockReturnValue(of(null));
    api.getResultsValidation.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadValidation({ protocolId: 9 }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.loadValidation$);
    expect(action.type).toBe('[Postanalitica API] Load Validation Success');
    expect((action as any).view.results).toEqual([]);
  });

  it('loadValidation$ error en resolución de nombres → failure', async () => {
    api.getStudy.mockReturnValue(of(null));
    api.getResultsValidation.mockReturnValue(of([{
      result: { id: 1, studyId: 7, analyticResultId: 50, status: 'VALIDATING', sectionId: 80012 },
      validations: [{ validation: { id: 100, resultId: 1, determinationId: 500, aggregateOutcome: 'PASS', manualOutcome: null } }],
    }]));
    resultados.getDeterminations.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadValidation({ protocolId: 9 }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.loadValidation$);
    expect(action.type).toBe('[Postanalitica API] Load Validation Failure');
  });

  it('validateDet$ llama validateDetermination y emite success', async () => {
    api.validateDetermination.mockReturnValue(of({}));
    actions$ = of(validateDet({ resultId: 1, determinationId: 500, outcome: 'PASS' }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.validateDet$);
    expect(api.validateDetermination).toHaveBeenCalledWith(1, 500, 'PASS');
    expect(action).toEqual(validateDetSuccess());
  });

  it('validateDet$ failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 422 });
    api.validateDetermination.mockReturnValue(throwError(() => error));
    actions$ = of(validateDet({ resultId: 1, determinationId: 500, outcome: 'FAIL' }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.validateDet$);
    expect(action).toEqual(validateDetFailure({ error }));
  });

  it('validateAll$ llama validateAll y emite success', async () => {
    api.validateAll.mockReturnValue(of({}));
    actions$ = of(validateAll({ resultId: 1, outcome: 'PASS' }));
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.validateAll$);
    expect(api.validateAll).toHaveBeenCalledWith(1, 'PASS');
    expect(action).toEqual(validateAllSuccess());
  });

  it('reloadAfterMutation$ re-dispara loadValidation con el protocolId de la vista', async () => {
    actions$ = of(validateDetSuccess());
    const effects = TestBed.inject(PostanaliticaEffects);
    const action = await firstValueFrom(effects.reloadAfterMutation$);
    expect(action).toEqual(loadValidation({ protocolId: 9 }));
  });
});
