# Procesamiento — Arco 4: Validación postanalítica (sin firma) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-104](https://exequielsantoro.atlassian.net/browse/KAN-104)
> **Spec:** `docs/superpowers/specs/2026-06-14-procesamiento-validacion-design.md`
> **Rama:** `feat/procesamiento-validacion` (worktree `FRONTEND-LABORATORIO-validacion`, base `development`)

**Goal:** Pantalla per-protocolo de validación postanalítica: lista los resultados del estudio con sus determinaciones (outcome automático), permite validar cada determinación (PASS/WARNING/FAIL) o todas, y refleja el estado. Corta antes de firma (botones "Firmar" deshabilitados).

**Architecture:** Nueva feature NgRx `postanalitica` (service + store) con un effect `loadValidation$` que hace fan-out (study + results-validation + nombres de determinación reusando `ResultadosApiService` de Arco 3b) y delega el ensamblado en la función pura `buildValidationView`. Pantalla dedicada `validacion.page` (ruta `procesamiento/validacion/:protocolId`) + componente `validation-table`. Entrada desde el worklist de procesamiento (tubo seleccionado → protocolId). Firma deshabilitada (placeholder).

**Tech Stack:** Angular 21 (standalone, signals, OnPush), NgRx clásico, PrimeNG, Vitest. Runner: **`npm test`** (builder @angular/build:unit-test). NO `npx vitest run` directo (rompe input.required con NG0950). Acotar: `npm test -- --include='**/<file>.spec.ts'`.

---

## File Structure (todo bajo `src/app/features/analitica/muestras/`)

- `models/postanalitica.model.ts` (+ `.spec.ts`) — tipos + `buildValidationView` (pura).
- `services/postanalitica-api.service.ts` (+ `.spec.ts`).
- `store/postanalitica/postanalitica.{state,actions,reducer,selectors,effects}.ts` (+ reducer/effects spec).
- `components/validation-table/validation-table.component.ts` (+ `.spec.ts`).
- `pages/validacion/validacion.page.ts` (+ `.spec.ts`).
- `pages/worklist/worklist.page.{ts,html,spec.ts}` — botón Validación.
- `analitica.routes.ts` — ruta nueva.
- `app.config.ts` — registro.

Reuso: `ResultadosApiService` (`../services/resultados-api.service`) — `getDeterminations`, `getDeterminationCatalog`. `humanizeBackendError` (`@shared/utils/error-messages`).

---

### Task 1: Modelos + `buildValidationView`

**Files:** Create `models/postanalitica.model.ts` (+ `.spec.ts`).

- [ ] **Step 1: Spec que falla** — crear `postanalitica.model.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { buildValidationView } from './postanalitica.model';
import type { Study, ResultWithValidation } from './postanalitica.model';

const study: Study = { id: 7, protocolId: 9, patientId: 20002, currentStatus: 'PENDING', expectedResultsCount: 1, signedResultsCount: 0 };
const rwv: ResultWithValidation[] = [{
  result: { id: 1, studyId: 7, analyticResultId: 50, status: 'VALIDATING', sectionId: 80012 },
  validations: [
    { validation: { id: 100, resultId: 1, determinationId: 500, aggregateOutcome: 'PASS', manualOutcome: null } },
    { validation: { id: 101, resultId: 1, determinationId: 501, aggregateOutcome: 'WARNING', manualOutcome: 'PASS' } },
  ],
}];
const nameByDeterminationId = { 500: 'Colesterol Total', 501: 'Triglicéridos' };

describe('buildValidationView', () => {
  it('ensambla study + results + nombres', () => {
    const v = buildValidationView({ protocolId: 9, study, resultsWithValidation: rwv, nameByDeterminationId });
    expect(v.protocolId).toBe(9);
    expect(v.studyStatus).toBe('PENDING');
    expect(v.results).toHaveLength(1);
    expect(v.results[0].resultId).toBe(1);
    expect(v.results[0].status).toBe('VALIDATING');
    expect(v.results[0].rows[0]).toEqual({ determinationId: 500, name: 'Colesterol Total', aggregateOutcome: 'PASS', manualOutcome: null });
    expect(v.results[0].rows[1].manualOutcome).toBe('PASS');
  });

  it('study null → studyStatus null', () => {
    const v = buildValidationView({ protocolId: 9, study: null, resultsWithValidation: [], nameByDeterminationId: {} });
    expect(v.studyStatus).toBeNull();
    expect(v.results).toEqual([]);
  });

  it('nombre faltante → #id', () => {
    const v = buildValidationView({ protocolId: 9, study, resultsWithValidation: rwv, nameByDeterminationId: {} });
    expect(v.results[0].rows[0].name).toBe('#500');
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/postanalitica.model.spec.ts'`.

- [ ] **Step 3: Implementar** `postanalitica.model.ts`:

```typescript
export type ValidationOutcome = 'PASS' | 'WARNING' | 'FAIL';
export type ResultStatus = 'PENDING' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'SIGNED';
export type StudyStatus = 'PENDING' | 'PARTIALLY_SIGNED' | 'READY_FOR_SIGNATURE' | 'CLOSED';

export interface Study {
  id: number; protocolId: number; patientId: number;
  currentStatus: StudyStatus; expectedResultsCount: number; signedResultsCount: number;
}
export interface PostResult { id: number; studyId: number; analyticResultId: number; status: ResultStatus; sectionId: number; }
export interface DetValidation {
  id: number; resultId: number; determinationId: number;
  aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null;
}
export interface ResultWithValidation { result: PostResult; validations: { validation: DetValidation }[]; }

export interface ValidationRow { determinationId: number; name: string; aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null; }
export interface ValidationResultVM { resultId: number; status: ResultStatus; rows: ValidationRow[]; }
export interface ValidationView { protocolId: number; studyStatus: StudyStatus | null; results: ValidationResultVM[]; }

export interface BuildValidationViewInput {
  protocolId: number;
  study: Study | null;
  resultsWithValidation: ResultWithValidation[];
  nameByDeterminationId: Record<number, string>;
}

export function buildValidationView(input: BuildValidationViewInput): ValidationView {
  const { protocolId, study, resultsWithValidation, nameByDeterminationId } = input;
  const results: ValidationResultVM[] = resultsWithValidation.map(rwv => ({
    resultId: rwv.result.id,
    status: rwv.result.status,
    rows: rwv.validations.map(v => ({
      determinationId: v.validation.determinationId,
      name: nameByDeterminationId[v.validation.determinationId] ?? `#${v.validation.determinationId}`,
      aggregateOutcome: v.validation.aggregateOutcome,
      manualOutcome: v.validation.manualOutcome,
    })),
  }));
  return { protocolId, studyStatus: study?.currentStatus ?? null, results };
}
```

- [ ] **Step 4: Run, verify PASS** (3 tests). **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/models/postanalitica.model.ts \
        src/app/features/analitica/muestras/models/postanalitica.model.spec.ts
git commit -m "feat(postanalitica): modelos + buildValidationView"
```

---

### Task 2: Service `PostanaliticaApiService`

**Files:** Create `services/postanalitica-api.service.ts` (+ `.spec.ts`).

- [ ] **Step 1: Spec que falla** — crear `postanalitica-api.service.spec.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PostanaliticaApiService } from './postanalitica-api.service';

const BASE = '/api/v1/analitica/postanalitica';

describe('PostanaliticaApiService', () => {
  let service: PostanaliticaApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PostanaliticaApiService] });
    service = TestBed.inject(PostanaliticaApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getStudy → GET /studies/{protocolId}', () => {
    service.getStudy(9).subscribe();
    const req = http.expectOne(`${BASE}/studies/9`);
    expect(req.request.method).toBe('GET'); req.flush({});
  });
  it('getResultsValidation → GET /studies/{protocolId}/results/validation', () => {
    service.getResultsValidation(9).subscribe();
    const req = http.expectOne(`${BASE}/studies/9/results/validation`);
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('validateDetermination → POST /results/{id}/validate con {determinationId, outcome}', () => {
    service.validateDetermination(1, 500, 'PASS').subscribe();
    const req = http.expectOne(`${BASE}/results/1/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ determinationId: 500, outcome: 'PASS' }); req.flush({});
  });
  it('validateAll → POST /results/{id}/validate-all con {outcome}', () => {
    service.validateAll(1, 'PASS').subscribe();
    const req = http.expectOne(`${BASE}/results/1/validate-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ outcome: 'PASS' }); req.flush({});
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `postanalitica-api.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Study, ResultWithValidation, DetValidation, PostResult, ValidationOutcome } from '../models/postanalitica.model';

@Injectable({ providedIn: 'root' })
export class PostanaliticaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/postanalitica';

  getStudy(protocolId: number): Observable<Study> {
    return this.http.get<Study>(`${this.base}/studies/${protocolId}`);
  }
  getResultsValidation(protocolId: number): Observable<ResultWithValidation[]> {
    return this.http.get<ResultWithValidation[]>(`${this.base}/studies/${protocolId}/results/validation`);
  }
  validateDetermination(resultId: number, determinationId: number, outcome: ValidationOutcome): Observable<DetValidation> {
    return this.http.post<DetValidation>(`${this.base}/results/${resultId}/validate`, { determinationId, outcome });
  }
  validateAll(resultId: number, outcome: ValidationOutcome): Observable<PostResult> {
    return this.http.post<PostResult>(`${this.base}/results/${resultId}/validate-all`, { outcome });
  }
}
```

- [ ] **Step 4: Run, verify PASS** (4 tests). **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/services/postanalitica-api.service.ts \
        src/app/features/analitica/muestras/services/postanalitica-api.service.spec.ts
git commit -m "feat(postanalitica): PostanaliticaApiService"
```

---

### Task 3: Store `postanalitica` (state/actions/reducer/selectors)

**Files:** Create `store/postanalitica/postanalitica.{state,actions,reducer,selectors}.ts` + `postanalitica.reducer.spec.ts`.

- [ ] **Step 1: Reducer/selector spec que falla** — crear `postanalitica.reducer.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { postanaliticaReducer } from './postanalitica.reducer';
import { initialPostanaliticaState } from './postanalitica.state';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaSaving, selectPostanaliticaError } from './postanalitica.selectors';
import type { ValidationView } from '../../models/postanalitica.model';

const view: ValidationView = { protocolId: 9, studyStatus: 'PENDING', results: [] };

describe('postanaliticaReducer', () => {
  it('loadValidation → loading=true', () => {
    expect(postanaliticaReducer(initialPostanaliticaState, loadValidation({ protocolId: 9 })).loading).toBe(true);
  });
  it('loadValidationSuccess → view + loading false', () => {
    const s = postanaliticaReducer(initialPostanaliticaState, loadValidationSuccess({ view }));
    expect(s.view).toBe(view); expect(s.loading).toBe(false); expect(s.error).toBeNull();
  });
  it('loadValidationFailure → loading false + error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = postanaliticaReducer({ ...initialPostanaliticaState, loading: true }, loadValidationFailure({ error }));
    expect(s.loading).toBe(false); expect(s.error).toBe(error);
  });
  it('validateDet/validateAll → saving=true; success → false; failure → error', () => {
    expect(postanaliticaReducer(initialPostanaliticaState, validateDet({ resultId: 1, determinationId: 500, outcome: 'PASS' })).saving).toBe(true);
    expect(postanaliticaReducer({ ...initialPostanaliticaState, saving: true }, validateDetSuccess()).saving).toBe(false);
    expect(postanaliticaReducer(initialPostanaliticaState, validateAll({ resultId: 1, outcome: 'PASS' })).saving).toBe(true);
    expect(postanaliticaReducer({ ...initialPostanaliticaState, saving: true }, validateAllSuccess()).saving).toBe(false);
    const error = new HttpErrorResponse({ status: 422 });
    expect(postanaliticaReducer(initialPostanaliticaState, validateDetFailure({ error })).error).toBe(error);
    expect(postanaliticaReducer(initialPostanaliticaState, validateAllFailure({ error })).error).toBe(error);
  });
  it('selectores proyectan', () => {
    const state = { ...initialPostanaliticaState, view, loading: true, saving: true };
    expect(selectValidationView.projector(state)).toBe(view);
    expect(selectPostanaliticaLoading.projector(state)).toBe(true);
    expect(selectPostanaliticaSaving.projector(state)).toBe(true);
    expect(selectPostanaliticaError.projector(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar.**

`postanalitica.state.ts`:
```typescript
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationView } from '../../models/postanalitica.model';

export interface PostanaliticaState { view: ValidationView | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null; }
export const initialPostanaliticaState: PostanaliticaState = { view: null, loading: false, saving: false, error: null };
export const POSTANALITICA_FEATURE_KEY = 'postanalitica';
```

`postanalitica.actions.ts`:
```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationView, ValidationOutcome } from '../../models/postanalitica.model';

export const loadValidation = createAction('[Validacion Page] Load Validation', props<{ protocolId: number }>());
export const loadValidationSuccess = createAction('[Postanalitica API] Load Validation Success', props<{ view: ValidationView }>());
export const loadValidationFailure = createAction('[Postanalitica API] Load Validation Failure', props<{ error: HttpErrorResponse }>());

export const validateDet = createAction('[Validacion Page] Validate Det', props<{ resultId: number; determinationId: number; outcome: ValidationOutcome }>());
export const validateDetSuccess = createAction('[Postanalitica API] Validate Det Success');
export const validateDetFailure = createAction('[Postanalitica API] Validate Det Failure', props<{ error: HttpErrorResponse }>());

export const validateAll = createAction('[Validacion Page] Validate All', props<{ resultId: number; outcome: ValidationOutcome }>());
export const validateAllSuccess = createAction('[Postanalitica API] Validate All Success');
export const validateAllFailure = createAction('[Postanalitica API] Validate All Failure', props<{ error: HttpErrorResponse }>());
```

`postanalitica.reducer.ts`:
```typescript
import { createReducer, on } from '@ngrx/store';
import { initialPostanaliticaState, PostanaliticaState } from './postanalitica.state';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';

export const postanaliticaReducer = createReducer(
  initialPostanaliticaState,
  on(loadValidation, (s): PostanaliticaState => ({ ...s, loading: true, error: null })),
  on(loadValidationSuccess, (s, { view }): PostanaliticaState => ({ ...s, view, loading: false, error: null })),
  on(loadValidationFailure, (s, { error }): PostanaliticaState => ({ ...s, loading: false, error })),
  on(validateDet, (s): PostanaliticaState => ({ ...s, saving: true, error: null })),
  on(validateDetSuccess, (s): PostanaliticaState => ({ ...s, saving: false })),
  on(validateDetFailure, (s, { error }): PostanaliticaState => ({ ...s, saving: false, error })),
  on(validateAll, (s): PostanaliticaState => ({ ...s, saving: true, error: null })),
  on(validateAllSuccess, (s): PostanaliticaState => ({ ...s, saving: false })),
  on(validateAllFailure, (s, { error }): PostanaliticaState => ({ ...s, saving: false, error })),
);
```

`postanalitica.selectors.ts`:
```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PostanaliticaState, POSTANALITICA_FEATURE_KEY } from './postanalitica.state';

export const selectPostanaliticaState = createFeatureSelector<PostanaliticaState>(POSTANALITICA_FEATURE_KEY);
export const selectValidationView = createSelector(selectPostanaliticaState, s => s.view);
export const selectPostanaliticaLoading = createSelector(selectPostanaliticaState, s => s.loading);
export const selectPostanaliticaSaving = createSelector(selectPostanaliticaState, s => s.saving);
export const selectPostanaliticaError = createSelector(selectPostanaliticaState, s => s.error);
```

- [ ] **Step 4: Run, verify PASS.** **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/store/postanalitica/
git commit -m "feat(postanalitica): store postanalitica (state/actions/reducer/selectors)"
```

---

### Task 4: Effects `postanalitica` (fan-out load + validate + reload) + registro

**Files:** Create `store/postanalitica/postanalitica.effects.ts` (+ `.spec.ts`); Modify `app.config.ts`.

- [ ] **Step 1: Effects spec que falla** — crear `postanalitica.effects.spec.ts`:

```typescript
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
  loadValidation, loadValidationSuccess, loadValidationFailure,
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
    // El catchError(of([])) de getResultsValidation absorbe el error → vista vacía, no failure.
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
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `postanalitica.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { buildValidationView } from '../../models/postanalitica.model';
import type { Study, ResultWithValidation } from '../../models/postanalitica.model';
import { selectValidationView } from './postanalitica.selectors';
import {
  loadValidation, loadValidationSuccess, loadValidationFailure,
  validateDet, validateDetSuccess, validateDetFailure,
  validateAll, validateAllSuccess, validateAllFailure,
} from './postanalitica.actions';

@Injectable()
export class PostanaliticaEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);
  private readonly resultados = inject(ResultadosApiService);

  loadValidation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadValidation),
      switchMap(({ protocolId }) =>
        forkJoin({
          study: this.api.getStudy(protocolId).pipe(catchError(() => of(null as Study | null))),
          rwv: this.api.getResultsValidation(protocolId).pipe(catchError(() => of([] as ResultWithValidation[]))),
        }).pipe(
          switchMap(({ study, rwv }) => {
            if (!rwv.length) {
              return of(buildValidationView({ protocolId, study, resultsWithValidation: [], nameByDeterminationId: {} }));
            }
            return forkJoin(rwv.map(r => this.resultados.getDeterminations(r.result.analyticResultId))).pipe(
              switchMap(detsPerResult => {
                const detIdToCatalog: Record<number, number> = {};
                for (const dets of detsPerResult) for (const d of dets) detIdToCatalog[d.id] = d.determinationCatalogId;
                const catalogIds = [...new Set(Object.values(detIdToCatalog))];
                const catalogs$ = catalogIds.length ? forkJoin(catalogIds.map(id => this.resultados.getDeterminationCatalog(id))) : of([]);
                return catalogs$.pipe(
                  map(catalogs => {
                    const nameByCatalog = Object.fromEntries(catalogs.map(c => [c.id, c.name]));
                    const nameByDeterminationId: Record<number, string> = {};
                    for (const [detId, catId] of Object.entries(detIdToCatalog)) {
                      nameByDeterminationId[Number(detId)] = nameByCatalog[catId] ?? `#${detId}`;
                    }
                    return buildValidationView({ protocolId, study, resultsWithValidation: rwv, nameByDeterminationId });
                  }),
                );
              }),
            );
          }),
          map(view => loadValidationSuccess({ view })),
          catchError((error: HttpErrorResponse) => of(loadValidationFailure({ error }))),
        ),
      ),
    ),
  );

  validateDet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateDet),
      switchMap(({ resultId, determinationId, outcome }) =>
        this.api.validateDetermination(resultId, determinationId, outcome).pipe(
          map(() => validateDetSuccess()),
          catchError((error: HttpErrorResponse) => of(validateDetFailure({ error }))),
        ),
      ),
    ),
  );

  validateAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateAll),
      switchMap(({ resultId, outcome }) =>
        this.api.validateAll(resultId, outcome).pipe(
          map(() => validateAllSuccess()),
          catchError((error: HttpErrorResponse) => of(validateAllFailure({ error }))),
        ),
      ),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(validateDetSuccess, validateAllSuccess),
      withLatestFrom(this.store.select(selectValidationView)),
      filter(([, view]) => view != null),
      map(([, view]) => loadValidation({ protocolId: view!.protocolId })),
    ),
  );
}
```

- [ ] **Step 4: Run, verify PASS** (7 tests).

- [ ] **Step 5: Registrar en `app.config.ts`** — READ el archivo. Imports junto a los de resultados:
```typescript
import { POSTANALITICA_FEATURE_KEY } from '@features/analitica/muestras/store/postanalitica/postanalitica.state';
import { postanaliticaReducer } from '@features/analitica/muestras/store/postanalitica/postanalitica.reducer';
import { PostanaliticaEffects } from '@features/analitica/muestras/store/postanalitica/postanalitica.effects';
```
y en providers, después del registro de `resultados`:
```typescript
    provideState(POSTANALITICA_FEATURE_KEY, postanaliticaReducer),
    provideEffects(PostanaliticaEffects),
```

- [ ] **Step 6: Build** — `npm run build` limpio. **Step 7: Commit**
```bash
git add src/app/features/analitica/muestras/store/postanalitica/postanalitica.effects.ts \
        src/app/features/analitica/muestras/store/postanalitica/postanalitica.effects.spec.ts \
        src/app/app.config.ts
git commit -m "feat(postanalitica): effects (fan-out loadValidation + validate + reload) + registro"
```

---

### Task 5: Componente `validation-table`

**Files:** Create `components/validation-table/validation-table.component.ts` (+ `.spec.ts`).

- [ ] **Step 1: Spec que falla** — crear `validation-table.component.spec.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ValidationTableComponent } from './validation-table.component';
import type { ValidationResultVM } from '../../models/postanalitica.model';

const results: ValidationResultVM[] = [{
  resultId: 1, status: 'VALIDATING',
  rows: [{ determinationId: 500, name: 'Colesterol Total', aggregateOutcome: 'PASS', manualOutcome: null }],
}];

function setup(rs: ValidationResultVM[] = results): ComponentFixture<ValidationTableComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ValidationTableComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ValidationTableComponent);
  fx.componentRef.setInput('results', rs);
  fx.detectChanges();
  return fx;
}

describe('ValidationTableComponent', () => {
  it('renderiza results y filas', () => {
    const cmp = setup().componentInstance;
    expect(cmp.results().length).toBe(1);
  });
  it('onValidate emite {resultId, determinationId, outcome}', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const spy = vi.fn();
    cmp.validate.subscribe(spy);
    cmp.onValidate(1, 500, 'FAIL');
    expect(spy).toHaveBeenCalledWith({ resultId: 1, determinationId: 500, outcome: 'FAIL' });
  });
  it('onValidateAll emite {resultId, outcome}', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const spy = vi.fn();
    cmp.validateAll.subscribe(spy);
    cmp.onValidateAll(1, 'PASS');
    expect(spy).toHaveBeenCalledWith({ resultId: 1, outcome: 'PASS' });
  });
  it('canSign true solo si VALIDATED', () => {
    const cmp = setup([{ ...results[0], status: 'VALIDATED' }]).componentInstance;
    expect(cmp.canSign({ ...results[0], status: 'VALIDATED' })).toBe(true);
    expect(cmp.canSign(results[0])).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `validation-table.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ValidationResultVM, ValidationOutcome } from '../../models/postanalitica.model';

export interface ValidatePayload { resultId: number; determinationId: number; outcome: ValidationOutcome; }
export interface ValidateAllPayload { resultId: number; outcome: ValidationOutcome; }

const OUTCOMES: ValidationOutcome[] = ['PASS', 'WARNING', 'FAIL'];

@Component({
  selector: 'app-validation-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="flex flex-col gap-4">
      @for (res of results(); track res.resultId) {
        <section class="border rounded">
          <header class="px-3 py-2 bg-gray-50 flex items-center justify-between">
            <span class="text-sm font-semibold">Resultado #{{ res.resultId }}</span>
            <span class="text-xs font-semibold uppercase">{{ res.status }}</span>
          </header>
          <table class="w-full text-sm">
            <thead>
              <tr><th class="text-left p-2">Determinación</th><th class="p-2">Automático</th><th class="p-2">Validación</th></tr>
            </thead>
            <tbody>
              @for (row of res.rows; track row.determinationId) {
                <tr>
                  <td class="p-2">{{ row.name }}</td>
                  <td class="p-2 text-center">{{ row.aggregateOutcome ?? '—' }}</td>
                  <td class="p-2 text-center">
                    @for (o of outcomes; track o) {
                      <button type="button" class="px-2 py-1 mx-0.5 rounded border text-xs"
                              [class.font-bold]="row.manualOutcome === o"
                              [attr.aria-label]="'Validar ' + row.name + ' como ' + o"
                              (click)="onValidate(res.resultId, row.determinationId, o)">{{ o }}</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="px-3 py-2 flex items-center justify-end gap-2 border-t">
            <button type="button" class="px-2 py-1 rounded border text-xs" (click)="onValidateAll(res.resultId, 'PASS')">
              Validar todas como PASS
            </button>
            <button type="button" class="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold"
                    [disabled]="!canSign(res)" title="Próximamente">
              Firmar
            </button>
          </div>
        </section>
      }
      @if (!results().length) {
        <p class="text-sm opacity-60">Todavía no hay estudio para este protocolo. Cargá y marcá resultados primero.</p>
      }
    </div>
  `,
})
export class ValidationTableComponent {
  readonly results = input.required<ValidationResultVM[]>();
  readonly validate = output<ValidatePayload>();
  readonly validateAll = output<ValidateAllPayload>();

  readonly outcomes = OUTCOMES;

  onValidate(resultId: number, determinationId: number, outcome: ValidationOutcome): void {
    this.validate.emit({ resultId, determinationId, outcome });
  }
  onValidateAll(resultId: number, outcome: ValidationOutcome): void {
    this.validateAll.emit({ resultId, outcome });
  }
  canSign(res: ValidationResultVM): boolean { return res.status === 'VALIDATED'; }
}
```

- [ ] **Step 4: Run, verify PASS** (4 tests). **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/components/validation-table/
git commit -m "feat(postanalitica): componente validation-table (validar + firma placeholder)"
```

---

### Task 6: Pantalla `validacion.page` + ruta

**Files:** Create `pages/validacion/validacion.page.ts` (+ `.spec.ts`); Modify `analitica.routes.ts`.

- [ ] **Step 1: Spec que falla** — crear `validacion.page.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { ValidacionPage } from './validacion.page';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaError } from '../../store/postanalitica/postanalitica.selectors';
import type { ValidationView } from '../../models/postanalitica.model';

const SMOKE_TEMPLATE = `<section><h1>Validación</h1><span>{{ studyStatusLabel() }}</span></section>`;
const view: ValidationView = { protocolId: 9, studyStatus: 'PENDING', results: [] };

function setup(): { fx: ComponentFixture<ValidacionPage>; store: MockStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ValidacionPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'protocolId' ? '9' : null) } } } },
      provideMockStore({ selectors: [
        { selector: selectValidationView, value: view },
        { selector: selectPostanaliticaLoading, value: false },
        { selector: selectPostanaliticaError, value: null },
      ] }),
    ],
  });
  TestBed.overrideTemplate(ValidacionPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(ValidacionPage);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store };
}

describe('ValidacionPage (smoke)', () => {
  it('expone protocolId de la ruta', () => {
    expect(setup().fx.componentInstance.protocolId).toBe(9);
  });
  it('studyStatusLabel refleja la vista', () => {
    expect(setup().fx.componentInstance.studyStatusLabel()).toContain('PENDING');
  });
  it('canSignStudy false si el estudio no está READY_FOR_SIGNATURE', () => {
    expect(setup().fx.componentInstance.canSignStudy()).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `validacion.page.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ValidationTableComponent, type ValidatePayload, type ValidateAllPayload } from '../../components/validation-table/validation-table.component';
import { selectValidationView, selectPostanaliticaLoading, selectPostanaliticaError } from '../../store/postanalitica/postanalitica.selectors';
import { loadValidation, validateDet, validateAll } from '../../store/postanalitica/postanalitica.actions';

@Component({
  selector: 'app-validacion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ValidationTableComponent, ToastModule],
  providers: [MessageService],
  template: `
    <section class="p-4 flex flex-col gap-4">
      <header class="flex items-center justify-between">
        <button type="button" class="text-sm text-blue-600" (click)="back()">← Volver a procesamiento</button>
        <span class="text-xs font-semibold uppercase opacity-70">Estudio: {{ studyStatusLabel() }}</span>
      </header>
      <h1 class="text-lg font-semibold">Validación de resultados</h1>
      @if (loading()) { <p class="text-sm opacity-60">Cargando validación…</p> }
      @else { <app-validation-table [results]="view()?.results ?? []" (validate)="onValidate($event)" (validateAll)="onValidateAll($event)" /> }
      <div class="flex justify-end">
        <button type="button" class="px-3 py-1 rounded bg-green-700 text-white text-sm font-semibold"
                [disabled]="!canSignStudy()" title="Próximamente">
          Firmar estudio
        </button>
      </div>
      <p-toast position="bottom-right" />
    </section>
  `,
})
export class ValidacionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly messages = inject(MessageService);
  private readonly location = inject(Location);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));

  readonly view = this.store.selectSignal(selectValidationView);
  readonly loading = this.store.selectSignal(selectPostanaliticaLoading);
  private readonly error = this.store.selectSignal(selectPostanaliticaError);

  readonly studyStatusLabel = computed(() => this.view()?.studyStatus ?? 'sin estudio');
  readonly canSignStudy = computed(() => this.view()?.studyStatus === 'READY_FOR_SIGNATURE');

  constructor() {
    this.store.dispatch(loadValidation({ protocolId: this.protocolId }));
    let lastSig: string | null = null;
    effect(() => {
      const err = this.error();
      const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
      if (sig && sig !== lastSig) {
        lastSig = sig;
        this.messages.add({ severity: 'error', summary: 'Error', detail: humanizeBackendError(err, { fallback: 'No pudimos completar la operación. Probá de nuevo.' }), life: 5000 });
      }
    });
  }

  onValidate(p: ValidatePayload): void { this.store.dispatch(validateDet(p)); }
  onValidateAll(p: ValidateAllPayload): void { this.store.dispatch(validateAll(p)); }
  back(): void { this.location.back(); }
}
```

> `canSignStudy()` siempre devuelve false en este arco salvo que el estudio esté READY (no pasa sin firmar resultados); el botón queda deshabilitado igual (placeholder).

En `analitica.routes.ts` (READ primero), agregar después de la ruta `procesamiento/cargar/:protocolId`:
```typescript
      {
        path: 'procesamiento/validacion/:protocolId',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/validacion/validacion.page').then(m => m.ValidacionPage),
        title: 'Validación',
      },
```

- [ ] **Step 4: Run, verify PASS** (3 tests). **Step 5: Build** `npm run build`. **Step 6: Commit**
```bash
git add src/app/features/analitica/muestras/pages/validacion/ src/app/features/analitica/analitica.routes.ts
git commit -m "feat(postanalitica): pantalla validacion + ruta"
```

---

### Task 7: Wiring en `worklist.page` — botón "Validación"

**Files:** Modify `pages/worklist/worklist.page.ts`, `worklist.page.html`, `worklist.page.spec.ts`.

> `selectedTubeProtocolId` y `router` YA existen (Arco 3b). Solo se agrega el método + botón.

- [ ] **Step 1: Test que falla** — en `worklist.page.spec.ts` agregar:

```typescript
  it('Procesamiento: validarResultados navega a la ruta de validación del protocolo', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'Hemograma',
      patientName: 'Marta', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cmp.toggleRow(cmp.rows()[0].id);
    cmp.validarResultados();
    expect(nav).toHaveBeenCalledWith(['/analitica/procesamiento/validacion', 88]);
  });
```
> Importá `Router` de `@angular/router` y `vi` (probablemente ya están). `provideRouter([])` ya está en el setup (Arco 3b).

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** en `worklist.page.ts` (junto a `cargarResultados`):
```typescript
  validarResultados(): void {
    const pid = this.selectedTubeProtocolId();
    if (pid != null) this.router.navigate(['/analitica/procesamiento/validacion', pid]);
  }
```

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: HTML** — en `worklist.page.html`, dentro de `@if (showWorksheetActions())`, DESPUÉS del botón "Cargar resultados", agregar:
```html
        <button type="button" class="ws-btn ws-btn--ghost" [disabled]="selectedTubeProtocolId() == null"
                title="Seleccioná un tubo para validar sus resultados" (click)="validarResultados()">
          Validación
        </button>
```

- [ ] **Step 6: Build + page spec** — `npm run build` y `npm test -- --include='**/worklist.page.spec.ts'` verdes.

- [ ] **Step 7: Commit**
```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.ts \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.html \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts
git commit -m "feat(postanalitica): botón Validación en procesamiento (tubo → validación)"
```

---

### Task 8: Verificación final + PR

- [ ] **Step 1: Suite completa** — `npm test`. Esperado: verde salvo el fail pre-existente ajeno (`patient-form` unhandled rejection). Specs nuevos verdes (model 3, service 4, reducer 5, effects 8, validation-table 4, page 3, worklist +1) y sin nuevos rojos.
- [ ] **Step 2: Build** — `npm run build` limpio.
- [ ] **Step 3: Smoke manual** — backend (development) + `npm start`. Login (BIOQUIMICO, ANALITICA). Primero usar Cargar resultados (3b) + marcar completadas para crear el estudio. Luego: seleccionar el tubo → **Validación** → ver results + determinaciones con outcome automático → validar (PASS/WARNING/FAIL) o "Validar todas" → el result pasa a VALIDATED/REJECTED → botón "Firmar" deshabilitado. Si no hubo mark-ready: estado vacío "Todavía no hay estudio…".
- [ ] **Step 4: Push + PR** — `git push -u origin feat/procesamiento-validacion`; PR contra `development` linkeando el Jira; aclarar en el body que la firma queda para un arco futuro (placeholder deshabilitado).

---

## Self-Review (cobertura del spec)

- ✅ Entrada por tubo → botón Validación → ruta → Task 7 + Task 6.
- ✅ Carga fan-out (study + results-validation + nombres) con 404 de study → Task 4 (effect) + Task 1 (buildValidationView).
- ✅ Validar determinación / validate-all → Task 5 (componente) + Task 4 (effects) + Task 2 (service).
- ✅ Estados/badges (result/study) → Task 5 + Task 6.
- ✅ Placeholder de firma (deshabilitado) → Task 5 (Firmar resultado) + Task 6 (Firmar estudio).
- ✅ Errores español (humanizeBackendError) → Task 6.
- ✅ Store/service/registro → Tasks 2,3,4.
- ✅ Tests por capa.
