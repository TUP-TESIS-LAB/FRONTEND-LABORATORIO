# Procesamiento — Arco 2: Gestión de plantillas (Planillas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Spec:** `docs/superpowers/specs/2026-06-13-procesamiento-planillas-design.md`
> **Rama:** `feat/procesamiento-planillas` (worktree `FRONTEND-LABORATORIO-planillas`, base `development`)

**Goal:** Habilitar el botón Planillas del worklist de procesamiento para listar, crear y editar worksheet templates contra `/api/v1/analitica/worksheets/templates`, reusando `AnalysisService` para el buscador de análisis.

**Architecture:** Nueva feature NgRx clásica `worksheetTemplates` (state/actions/reducer/selectors/effects + API service), mutaciones pesimistas (success → reload). Dos componentes standalone con `p-dialog` (PrimeNG): `planillas-modal` (lista + acciones) y `worksheet-config-modal` (crear/editar con buscador + lista ordenable). El worklist de procesamiento orquesta la apertura vía signals locales. Cero cambios de backend.

**Tech Stack:** Angular 21 (standalone, signals, OnPush), NgRx clásico, PrimeNG (`p-dialog`, `p-button`), Vitest. Test runner: `npm test` (builder `@angular/build:unit-test`) — NO `vitest run` directo (rompe `templateUrl`/`input.required`). Acotar con `npm test -- --include='**/<archivo>.spec.ts'`.

---

## File Structure

Todo bajo `src/app/features/analitica/muestras/`:

- `models/worksheet-template.model.ts` — interfaces `WorksheetTemplate`, `WorksheetTemplateAnalysis`, `SaveWorksheetTemplateBody`.
- `services/worksheet-templates-api.service.ts` (+ `.spec.ts`) — list/create/update.
- `store/worksheet-templates/worksheet-templates.state.ts` — state + feature key.
- `store/worksheet-templates/worksheet-templates.actions.ts` — load/save actions.
- `store/worksheet-templates/worksheet-templates.reducer.ts` (+ `.spec.ts`).
- `store/worksheet-templates/worksheet-templates.selectors.ts`.
- `store/worksheet-templates/worksheet-templates.effects.ts` (+ `.spec.ts`).
- `components/planillas/planillas-modal.component.ts` (+ `.spec.ts`).
- `components/planillas/worksheet-config-modal.component.ts` (+ `.spec.ts`).
- `pages/worklist/worklist.page.ts` / `.html` / `.spec.ts` — wiring (solo procesamiento).
- `app.config.ts` — registrar `provideState`/`provideEffects`.

Reuso: `AnalysisService` (`@features/analitica/services/analysis.service`), modelo `Analysis` (`@features/analitica/models/atencion.model`), `humanizeBackendError` (`@shared/utils/error-messages`).

---

### Task 1: Modelo + API service

**Files:**
- Create: `src/app/features/analitica/muestras/models/worksheet-template.model.ts`
- Create: `src/app/features/analitica/muestras/services/worksheet-templates-api.service.ts`
- Test: `src/app/features/analitica/muestras/services/worksheet-templates-api.service.spec.ts`

- [ ] **Step 1: Modelo (sin test propio; lo ejercitan service/store)**

Crear `worksheet-template.model.ts`:

```typescript
export interface WorksheetTemplateAnalysis {
  analysisTypeId: number;
  displayOrder: number;
}

export interface WorksheetTemplate {
  id: number;
  name: string;
  analyses: WorksheetTemplateAnalysis[];
  active: boolean;
  version: number;
}

/** Body de create/update (POST/PUT /worksheets/templates). */
export interface SaveWorksheetTemplateBody {
  name: string;
  analyses: WorksheetTemplateAnalysis[];
}
```

- [ ] **Step 2: Escribir el service spec que falla**

Crear `worksheet-templates-api.service.spec.ts`:

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorksheetTemplatesApiService } from './worksheet-templates-api.service';
import type { WorksheetTemplate } from '../models/worksheet-template.model';

const BASE = '/api/v1/analitica/worksheets/templates';

const sample: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('WorksheetTemplatesApiService', () => {
  let service: WorksheetTemplatesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WorksheetTemplatesApiService],
    });
    service = TestBed.inject(WorksheetTemplatesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listTemplates hace GET al endpoint', () => {
    let result: WorksheetTemplate[] | undefined;
    service.listTemplates().subscribe(r => (result = r));
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([sample]);
    expect(result).toEqual([sample]);
  });

  it('createTemplate hace POST con el body', () => {
    const body = { name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] };
    service.createTemplate(body).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(sample);
  });

  it('updateTemplate hace PUT a /{id} con el body', () => {
    const body = { name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] };
    service.updateTemplate(1, body).subscribe();
    const req = http.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(sample);
  });
});
```

- [ ] **Step 3: Run, verify FAIL**

Run: `npm test -- --include='**/worksheet-templates-api.service.spec.ts'`
Expected: FAIL — el service no existe.

- [ ] **Step 4: Implementar el service**

Crear `worksheet-templates-api.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { WorksheetTemplate, SaveWorksheetTemplateBody } from '../models/worksheet-template.model';

@Injectable({ providedIn: 'root' })
export class WorksheetTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/worksheets/templates';

  listTemplates(): Observable<WorksheetTemplate[]> {
    return this.http.get<WorksheetTemplate[]>(this.base);
  }

  createTemplate(body: SaveWorksheetTemplateBody): Observable<WorksheetTemplate> {
    return this.http.post<WorksheetTemplate>(this.base, body);
  }

  updateTemplate(id: number, body: SaveWorksheetTemplateBody): Observable<WorksheetTemplate> {
    return this.http.put<WorksheetTemplate>(`${this.base}/${id}`, body);
  }
}
```

- [ ] **Step 5: Run, verify PASS**

Run: `npm test -- --include='**/worksheet-templates-api.service.spec.ts'`
Expected: PASS (3 tests verdes).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/muestras/models/worksheet-template.model.ts \
        src/app/features/analitica/muestras/services/worksheet-templates-api.service.ts \
        src/app/features/analitica/muestras/services/worksheet-templates-api.service.spec.ts
git commit -m "feat(planillas): modelo + API service de worksheet templates"
```

---

### Task 2: Store — state + actions + reducer + selectors

**Files:**
- Create: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.state.ts`
- Create: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.actions.ts`
- Create: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.reducer.ts`
- Create: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.selectors.ts`
- Test: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.reducer.spec.ts`

- [ ] **Step 1: Escribir el reducer/selector spec que falla**

Crear `worksheet-templates.reducer.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { worksheetTemplatesReducer } from './worksheet-templates.reducer';
import { initialWorksheetTemplatesState } from './worksheet-templates.state';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';
import { selectTemplates, selectTemplatesPending, selectTemplatesSaving, selectTemplatesError } from './worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('worksheetTemplatesReducer', () => {
  it('loadTemplates pone pending=true', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, loadTemplates());
    expect(s.pending).toBe(true);
  });

  it('loadTemplatesSuccess puebla templates y baja pending', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, loadTemplatesSuccess({ templates: [tpl] }));
    expect(s.templates).toEqual([tpl]);
    expect(s.pending).toBe(false);
    expect(s.error).toBeNull();
  });

  it('loadTemplatesFailure setea error y baja pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, pending: true }, loadTemplatesFailure({ error }));
    expect(s.pending).toBe(false);
    expect(s.error).toBe(error);
  });

  it('saveTemplate pone saving=true', () => {
    const s = worksheetTemplatesReducer(initialWorksheetTemplatesState, saveTemplate({ id: null, name: 'X', analyses: [] }));
    expect(s.saving).toBe(true);
    expect(s.error).toBeNull();
  });

  it('saveTemplateSuccess baja saving', () => {
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, saving: true }, saveTemplateSuccess());
    expect(s.saving).toBe(false);
  });

  it('saveTemplateFailure baja saving y setea error', () => {
    const error = new HttpErrorResponse({ status: 400 });
    const s = worksheetTemplatesReducer({ ...initialWorksheetTemplatesState, saving: true }, saveTemplateFailure({ error }));
    expect(s.saving).toBe(false);
    expect(s.error).toBe(error);
  });

  it('selectores proyectan su slice', () => {
    const state = { ...initialWorksheetTemplatesState, templates: [tpl], pending: true, saving: true };
    expect(selectTemplates.projector(state)).toEqual([tpl]);
    expect(selectTemplatesPending.projector(state)).toBe(true);
    expect(selectTemplatesSaving.projector(state)).toBe(true);
    expect(selectTemplatesError.projector(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- --include='**/worksheet-templates.reducer.spec.ts'`
Expected: FAIL — módulos no existen.

- [ ] **Step 3: Implementar state, actions, reducer, selectors**

`worksheet-templates.state.ts`:

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

export interface WorksheetTemplatesState {
  templates: WorksheetTemplate[];
  pending: boolean;
  saving: boolean;
  error: HttpErrorResponse | null;
}

export const initialWorksheetTemplatesState: WorksheetTemplatesState = {
  templates: [],
  pending: false,
  saving: false,
  error: null,
};

export const WORKSHEET_TEMPLATES_FEATURE_KEY = 'worksheetTemplates';
```

`worksheet-templates.actions.ts`:

```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { WorksheetTemplate, WorksheetTemplateAnalysis } from '../../models/worksheet-template.model';

export const loadTemplates = createAction('[Planillas Page] Load Templates');
export const loadTemplatesSuccess = createAction(
  '[Worksheet Templates API] Load Templates Success',
  props<{ templates: WorksheetTemplate[] }>()
);
export const loadTemplatesFailure = createAction(
  '[Worksheet Templates API] Load Templates Failure',
  props<{ error: HttpErrorResponse }>()
);

/** id null = create; id presente = update. */
export const saveTemplate = createAction(
  '[Planillas Modal] Save Template',
  props<{ id: number | null; name: string; analyses: WorksheetTemplateAnalysis[] }>()
);
export const saveTemplateSuccess = createAction('[Worksheet Templates API] Save Template Success');
export const saveTemplateFailure = createAction(
  '[Worksheet Templates API] Save Template Failure',
  props<{ error: HttpErrorResponse }>()
);
```

`worksheet-templates.reducer.ts`:

```typescript
import { createReducer, on } from '@ngrx/store';
import { initialWorksheetTemplatesState, WorksheetTemplatesState } from './worksheet-templates.state';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';

export const worksheetTemplatesReducer = createReducer(
  initialWorksheetTemplatesState,
  on(loadTemplates, (state): WorksheetTemplatesState => ({ ...state, pending: true })),
  on(loadTemplatesSuccess, (state, { templates }): WorksheetTemplatesState => ({
    ...state, templates, pending: false, error: null,
  })),
  on(loadTemplatesFailure, (state, { error }): WorksheetTemplatesState => ({ ...state, pending: false, error })),
  on(saveTemplate, (state): WorksheetTemplatesState => ({ ...state, saving: true, error: null })),
  on(saveTemplateSuccess, (state): WorksheetTemplatesState => ({ ...state, saving: false })),
  on(saveTemplateFailure, (state, { error }): WorksheetTemplatesState => ({ ...state, saving: false, error })),
);
```

`worksheet-templates.selectors.ts`:

```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorksheetTemplatesState, WORKSHEET_TEMPLATES_FEATURE_KEY } from './worksheet-templates.state';

export const selectWorksheetTemplatesState =
  createFeatureSelector<WorksheetTemplatesState>(WORKSHEET_TEMPLATES_FEATURE_KEY);

export const selectTemplates = createSelector(selectWorksheetTemplatesState, s => s.templates);
export const selectTemplatesPending = createSelector(selectWorksheetTemplatesState, s => s.pending);
export const selectTemplatesSaving = createSelector(selectWorksheetTemplatesState, s => s.saving);
export const selectTemplatesError = createSelector(selectWorksheetTemplatesState, s => s.error);
```

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- --include='**/worksheet-templates.reducer.spec.ts'`
Expected: PASS (7 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/store/worksheet-templates/
git commit -m "feat(planillas): store worksheetTemplates (state/actions/reducer/selectors)"
```

---

### Task 3: Effects + registro de la feature

**Files:**
- Create: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects.ts`
- Test: `src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects.spec.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Escribir el effects spec que falla**

Crear `worksheet-templates.effects.spec.ts`:

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { WorksheetTemplatesEffects } from './worksheet-templates.effects';
import { WorksheetTemplatesApiService } from '../../services/worksheet-templates-api.service';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('WorksheetTemplatesEffects', () => {
  let actions$: Observable<Action>;
  let api: {
    listTemplates: ReturnType<typeof vi.fn>;
    createTemplate: ReturnType<typeof vi.fn>;
    updateTemplate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = { listTemplates: vi.fn(), createTemplate: vi.fn(), updateTemplate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        WorksheetTemplatesEffects,
        provideMockActions(() => actions$),
        { provide: WorksheetTemplatesApiService, useValue: api },
      ],
    });
  });

  it('loadTemplates$ mapea success', async () => {
    api.listTemplates.mockReturnValue(of([tpl]));
    actions$ = of(loadTemplates());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.loadTemplates$);
    expect(action).toEqual(loadTemplatesSuccess({ templates: [tpl] }));
  });

  it('loadTemplates$ mapea failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.listTemplates.mockReturnValue(throwError(() => error));
    actions$ = of(loadTemplates());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.loadTemplates$);
    expect(action).toEqual(loadTemplatesFailure({ error }));
  });

  it('saveTemplate$ llama createTemplate cuando id es null', async () => {
    api.createTemplate.mockReturnValue(of(tpl));
    actions$ = of(saveTemplate({ id: null, name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(api.createTemplate).toHaveBeenCalledWith({ name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] });
    expect(api.updateTemplate).not.toHaveBeenCalled();
    expect(action).toEqual(saveTemplateSuccess());
  });

  it('saveTemplate$ llama updateTemplate cuando hay id', async () => {
    api.updateTemplate.mockReturnValue(of(tpl));
    actions$ = of(saveTemplate({ id: 1, name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(api.updateTemplate).toHaveBeenCalledWith(1, { name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] });
    expect(action).toEqual(saveTemplateSuccess());
  });

  it('saveTemplate$ mapea failure', async () => {
    const error = new HttpErrorResponse({ status: 400 });
    api.createTemplate.mockReturnValue(throwError(() => error));
    actions$ = of(saveTemplate({ id: null, name: 'X', analyses: [] }));
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.saveTemplate$);
    expect(action).toEqual(saveTemplateFailure({ error }));
  });

  it('reloadAfterSave$ emite loadTemplates tras success', async () => {
    actions$ = of(saveTemplateSuccess());
    const effects = TestBed.inject(WorksheetTemplatesEffects);
    const action = await firstValueFrom(effects.reloadAfterSave$);
    expect(action).toEqual(loadTemplates());
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- --include='**/worksheet-templates.effects.spec.ts'`
Expected: FAIL — effects no existe.

- [ ] **Step 3: Implementar los effects**

Crear `worksheet-templates.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { WorksheetTemplatesApiService } from '../../services/worksheet-templates-api.service';
import {
  loadTemplates, loadTemplatesSuccess, loadTemplatesFailure,
  saveTemplate, saveTemplateSuccess, saveTemplateFailure,
} from './worksheet-templates.actions';

@Injectable()
export class WorksheetTemplatesEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(WorksheetTemplatesApiService);

  loadTemplates$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTemplates),
      switchMap(() =>
        this.api.listTemplates().pipe(
          map(templates => loadTemplatesSuccess({ templates })),
          catchError((error: HttpErrorResponse) => of(loadTemplatesFailure({ error }))),
        ),
      ),
    ),
  );

  saveTemplate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTemplate),
      concatMap(({ id, name, analyses }) => {
        const body = { name, analyses };
        const call$ = id == null ? this.api.createTemplate(body) : this.api.updateTemplate(id, body);
        return call$.pipe(
          map(() => saveTemplateSuccess()),
          catchError((error: HttpErrorResponse) => of(saveTemplateFailure({ error }))),
        );
      }),
    ),
  );

  reloadAfterSave$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveTemplateSuccess),
      map(() => loadTemplates()),
    ),
  );
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- --include='**/worksheet-templates.effects.spec.ts'`
Expected: PASS (6 tests verdes).

- [ ] **Step 5: Registrar la feature en `app.config.ts`**

En `src/app/app.config.ts`, agregar imports junto a los de muestras (línea ~77-78):

```typescript
import { WORKSHEET_TEMPLATES_FEATURE_KEY } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.state';
import { worksheetTemplatesReducer } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.reducer';
import { WorksheetTemplatesEffects } from '@features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects';
```

y en el array de providers, justo después de las líneas de muestras (`provideState(MUESTRAS_FEATURE_KEY, muestrasReducer); provideEffects(MuestrasEffects);`):

```typescript
    provideState(WORKSHEET_TEMPLATES_FEATURE_KEY, worksheetTemplatesReducer),
    provideEffects(WorksheetTemplatesEffects),
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build limpio (registro válido, sin errores TS).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects.ts \
        src/app/features/analitica/muestras/store/worksheet-templates/worksheet-templates.effects.spec.ts \
        src/app/app.config.ts
git commit -m "feat(planillas): effects worksheetTemplates + registro de la feature"
```

---

### Task 4: `worksheet-config-modal` (crear/editar plantilla)

**Files:**
- Create: `src/app/features/analitica/muestras/components/planillas/worksheet-config-modal.component.ts`
- Test: `src/app/features/analitica/muestras/components/planillas/worksheet-config-modal.component.spec.ts`

Lógica clave: buscador (`AnalysisService.searchByName`), lista ordenable `ordered: { analysisTypeId, name }[]`, `valid` = nombre + ≥1 análisis, Guardar → `dispatch(saveTemplate(...))` con `displayOrder` = índice. Al abrir con `templateId`, toma el template del store (`selectTemplates`) y resuelve nombres con `AnalysisService.getById` (forkJoin).

- [ ] **Step 1: Escribir el component spec que falla**

Crear `worksheet-config-modal.component.spec.ts`:

```typescript
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { WorksheetConfigModalComponent } from './worksheet-config-modal.component';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { selectTemplates } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { saveTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';
import type { Analysis } from '@features/analitica/models/atencion.model';

function analysis(id: number, name: string): Analysis {
  return { id, shortCode: String(id), name, familyName: null, ubCount: null };
}

function setup(templateId: number | null = null): { fx: ComponentFixture<WorksheetConfigModalComponent>; store: MockStore; analysisSvc: { searchByName: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn> } } {
  const analysisSvc = { searchByName: vi.fn().mockReturnValue(of([])), getById: vi.fn() };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [WorksheetConfigModalComponent],
    providers: [
      provideNoopAnimations(),
      { provide: AnalysisService, useValue: analysisSvc },
      provideMockStore({
        selectors: [{ selector: selectTemplates, value: [
          { id: 5, name: 'Coag', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1 },
        ] }],
      }),
    ],
  });
  const fx = TestBed.createComponent(WorksheetConfigModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.componentRef.setInput('templateId', templateId);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store, analysisSvc };
}

describe('WorksheetConfigModalComponent', () => {
  it('agregar y quitar análisis actualiza la lista ordenada', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'Hemograma'));
    cmp.add(analysis(11, 'Glucosa'));
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([10, 11]);
    cmp.removeAt(10);
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([11]);
  });

  it('no agrega duplicados', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'Hemograma'));
    cmp.add(analysis(10, 'Hemograma'));
    expect(cmp.ordered().length).toBe(1);
  });

  it('moveItem reordena', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    cmp.add(analysis(10, 'A'));
    cmp.add(analysis(11, 'B'));
    cmp.moveItem(0, 1);
    expect(cmp.ordered().map(a => a.analysisTypeId)).toEqual([11, 10]);
  });

  it('valid requiere nombre y al menos un análisis', () => {
    const { fx } = setup();
    const cmp = fx.componentInstance;
    expect(cmp.valid()).toBe(false);
    cmp.name.set('Coagulación');
    expect(cmp.valid()).toBe(false);
    cmp.add(analysis(10, 'A'));
    expect(cmp.valid()).toBe(true);
  });

  it('save dispara saveTemplate con displayOrder por índice y emite saved', () => {
    const { fx, store } = setup();
    const cmp = fx.componentInstance;
    const dispatch = vi.spyOn(store, 'dispatch');
    const saved = vi.fn();
    cmp.saved.subscribe(saved);
    cmp.name.set('Coagulación');
    cmp.add(analysis(10, 'A'));
    cmp.add(analysis(11, 'B'));
    cmp.save();
    expect(dispatch).toHaveBeenCalledWith(saveTemplate({
      id: null, name: 'Coagulación',
      analyses: [{ analysisTypeId: 10, displayOrder: 0 }, { analysisTypeId: 11, displayOrder: 1 }],
    }));
    expect(saved).toHaveBeenCalled();
  });

  it('al editar resuelve nombres del template vía getById', () => {
    const { analysisSvc } = (() => {
      const s = setup(5);
      s.analysisSvc.getById.mockReturnValue(of({ id: 10, shortCode: '10', name: 'Hemograma', familyName: null, ubCount: null, description: null, determinations: [], processingTime: null, processingTimeUnit: null, nbuCode: null }));
      return s;
    })();
    // getById se invoca para el análisis 10 del template 5
    expect(analysisSvc.getById).toHaveBeenCalledWith(10);
  });
});
```

> Nota: el último test re-llama `setup(5)` y luego configura el mock — para que la resolución de nombres ocurra al abrir en modo edición, el componente debe disparar `getById` en un `effect`/`constructor` que lea `templateId()`. Si el orden de mock/lectura te complica, ajustá el test para setear el mock ANTES de `detectChanges()` (mové la config del mock dentro de `setup` cuando `templateId != null`). Mantené la intención: editar resuelve nombres vía `getById`.

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- --include='**/worksheet-config-modal.component.spec.ts'`
Expected: FAIL — componente no existe.

- [ ] **Step 3: Implementar el componente**

Crear `worksheet-config-modal.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import type { Analysis } from '@features/analitica/models/atencion.model';
import { selectTemplates } from '../../store/worksheet-templates/worksheet-templates.selectors';
import { saveTemplate } from '../../store/worksheet-templates/worksheet-templates.actions';

interface OrderedAnalysis { analysisTypeId: number; name: string; }

@Component({
  selector: 'app-worksheet-config-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="close()" [modal]="true" [draggable]="false" [style]="{ width: '720px' }"
              [header]="templateId() ? 'Modificar hoja de trabajo' : 'Nueva hoja de trabajo'">
      <div class="flex flex-col gap-3">
        <label class="text-xs font-semibold opacity-70">NOMBRE DE LA HOJA</label>
        <input class="w-full border rounded p-2 text-sm" [ngModel]="name()" (ngModelChange)="name.set($event)"
               placeholder="Ej.: Coagulación · Planilla B" />

        <label class="text-xs font-semibold opacity-70">BUSCAR ANÁLISIS</label>
        <input class="w-full border rounded p-2 text-sm" [ngModel]="query()" (ngModelChange)="onQuery($event)"
               placeholder="Buscar análisis…" />
        @if (results().length) {
          <div class="border rounded divide-y">
            @for (a of results(); track a.id) {
              <button type="button" class="w-full text-left p-2 text-sm hover:bg-gray-50 flex justify-between"
                      (click)="add(a)"><span>{{ a.name }}</span><i class="pi pi-plus"></i></button>
            }
          </div>
        }

        <label class="text-xs font-semibold opacity-70">ORDEN EN LA PLANILLA{{ ordered().length ? ' · ' + ordered().length : '' }}</label>
        <div class="flex flex-col gap-1">
          @for (a of ordered(); track a.analysisTypeId; let i = $index) {
            <div class="flex items-center gap-2 border rounded p-2 text-sm">
              <span class="opacity-50 w-6">{{ i + 1 }}</span>
              <span class="flex-1">{{ a.name }}</span>
              <button type="button" class="pi pi-chevron-up" [disabled]="i === 0" (click)="moveItem(i, -1)"></button>
              <button type="button" class="pi pi-chevron-down" [disabled]="i === ordered().length - 1" (click)="moveItem(i, 1)"></button>
              <button type="button" class="pi pi-times" (click)="removeAt(a.analysisTypeId)"></button>
            </div>
          }
          @if (!ordered().length) {
            <p class="text-sm opacity-60">Buscá y elegí análisis: definen qué aparece en la planilla.</p>
          }
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="close()" />
        <p-button label="Guardar hoja" [disabled]="!valid()" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class WorksheetConfigModalComponent {
  private readonly store = inject(Store);
  private readonly analysis = inject(AnalysisService);

  readonly visible = input<boolean>(false);
  readonly templateId = input<number | null>(null);
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly name = signal('');
  readonly query = signal('');
  readonly results = signal<Analysis[]>([]);
  readonly ordered = signal<OrderedAnalysis[]>([]);

  private readonly templates = this.store.selectSignal(selectTemplates);
  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q.trim() ? this.analysis.searchByName(q.trim()) : of([])),
      takeUntilDestroyed(),
    ).subscribe(list => this.results.set(list));

    // Al abrir en modo edición, precargar nombre + análisis (resolviendo nombres vía catálogo).
    effect(() => {
      const id = this.templateId();
      if (!this.visible() || id == null) return;
      const tpl = this.templates().find(t => t.id === id);
      if (!tpl) return;
      this.name.set(tpl.name);
      const sorted = [...tpl.analyses].sort((a, b) => a.displayOrder - b.displayOrder);
      forkJoin(sorted.map(a => this.analysis.getById(a.analysisTypeId)))
        .subscribe(details => this.ordered.set(details.map(d => ({ analysisTypeId: d.id, name: d.name }))));
    });
  }

  readonly valid = computed(() => this.name().trim() !== '' && this.ordered().length > 0);

  onQuery(q: string): void { this.query.set(q); this.query$.next(q); }

  add(a: Analysis): void {
    if (this.ordered().some(x => x.analysisTypeId === a.id)) return;
    this.ordered.update(list => [...list, { analysisTypeId: a.id, name: a.name }]);
    this.query.set(''); this.results.set([]);
  }
  removeAt(id: number): void { this.ordered.update(list => list.filter(x => x.analysisTypeId !== id)); }
  moveItem(i: number, d: number): void {
    const j = i + d;
    const arr = [...this.ordered()];
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.ordered.set(arr);
  }

  save(): void {
    if (!this.valid()) return;
    this.store.dispatch(saveTemplate({
      id: this.templateId(),
      name: this.name().trim(),
      analyses: this.ordered().map((a, i) => ({ analysisTypeId: a.analysisTypeId, displayOrder: i })),
    }));
    this.reset();
    this.saved.emit();
  }
  close(): void { this.reset(); this.closed.emit(); }
  private reset(): void { this.name.set(''); this.query.set(''); this.results.set([]); this.ordered.set([]); }
}
```

> Si el test de "editar resuelve nombres" exige el mock seteado antes de `detectChanges`, ajustá `setup()` para inyectar el `getById` mock con valor por defecto desde el inicio (el `effect` corre en el primer `detectChanges`).

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- --include='**/worksheet-config-modal.component.spec.ts'`
Expected: PASS. (Si el test de resolución de nombres falla por timing del mock, mové la config del mock dentro de `setup` antes de `detectChanges` como indica la nota — la intención del test no cambia.)

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/components/planillas/worksheet-config-modal.component.ts \
        src/app/features/analitica/muestras/components/planillas/worksheet-config-modal.component.spec.ts
git commit -m "feat(planillas): worksheet-config-modal (crear/editar plantilla con buscador)"
```

---

### Task 5: `planillas-modal` (lista de plantillas)

**Files:**
- Create: `src/app/features/analitica/muestras/components/planillas/planillas-modal.component.ts`
- Test: `src/app/features/analitica/muestras/components/planillas/planillas-modal.component.spec.ts`

- [ ] **Step 1: Escribir el component spec que falla**

Crear `planillas-modal.component.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore } from '@ngrx/store/testing';
import { PlanillasModalComponent } from './planillas-modal.component';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

const tpl: WorksheetTemplate = {
  id: 5, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }, { analysisTypeId: 11, displayOrder: 1 }],
  active: true, version: 1,
};

function setup(templates: WorksheetTemplate[] = []): ComponentFixture<PlanillasModalComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PlanillasModalComponent],
    providers: [
      provideNoopAnimations(),
      provideMockStore({ selectors: [
        { selector: selectTemplates, value: templates },
        { selector: selectTemplatesPending, value: false },
      ] }),
    ],
  });
  const fx = TestBed.createComponent(PlanillasModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.detectChanges();
  return fx;
}

describe('PlanillasModalComponent', () => {
  it('expone las plantillas del store y su conteo de análisis', () => {
    const fx = setup([tpl]);
    expect(fx.componentInstance.templates().length).toBe(1);
    expect(fx.componentInstance.analysisCount(tpl)).toBe(2);
  });

  it('newSheet emite el output', () => {
    const fx = setup([tpl]);
    let emitted = false;
    fx.componentInstance.newSheet.subscribe(() => (emitted = true));
    fx.componentInstance.onNewSheet();
    expect(emitted).toBe(true);
  });

  it('editSheet emite el id', () => {
    const fx = setup([tpl]);
    let id: number | undefined;
    fx.componentInstance.editSheet.subscribe(v => (id = v));
    fx.componentInstance.onEdit(5);
    expect(id).toBe(5);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- --include='**/planillas-modal.component.spec.ts'`
Expected: FAIL — componente no existe.

- [ ] **Step 3: Implementar el componente**

Crear `planillas-modal.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { selectTemplates, selectTemplatesPending } from '../../store/worksheet-templates/worksheet-templates.selectors';
import type { WorksheetTemplate } from '../../models/worksheet-template.model';

@Component({
  selector: 'app-planillas-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onClose()" [modal]="true" [draggable]="false" [style]="{ width: '640px' }"
              header="Planillas">
      <p class="text-sm opacity-70 mb-3">Gestioná las hojas de trabajo: creá o editá cada planilla.</p>
      @if (pending()) {
        <p class="text-sm opacity-60">Cargando planillas…</p>
      } @else if (!templates().length) {
        <p class="text-sm opacity-60">Todavía no hay planillas configuradas. Creá una nueva.</p>
      } @else {
        <div class="divide-y">
          @for (ws of templates(); track ws.id) {
            <div class="flex items-center justify-between py-2">
              <div class="flex items-center gap-2">
                <i class="pi pi-table"></i>
                <div>
                  <b class="block text-sm">{{ ws.name }}</b>
                  <span class="text-xs opacity-60">{{ analysisCount(ws) }} análisis</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <p-button label="Cargar resultados" size="small" severity="secondary" [outlined]="true"
                          [disabled]="true" pTooltip="Próximamente" />
                <button type="button" class="pi pi-pencil p-2" title="Editar" (click)="onEdit(ws.id)"></button>
                <button type="button" class="pi pi-eye p-2 opacity-40" title="Próximamente" disabled></button>
                <button type="button" class="pi pi-trash p-2 opacity-40" title="Próximamente" disabled></button>
              </div>
            </div>
          }
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Nueva hoja" icon="pi pi-plus" (onClick)="onNewSheet()" />
      </ng-template>
    </p-dialog>
  `,
})
export class PlanillasModalComponent {
  private readonly store = inject(Store);

  readonly visible = input<boolean>(false);
  readonly closed = output<void>();
  readonly newSheet = output<void>();
  readonly editSheet = output<number>();

  readonly templates = this.store.selectSignal(selectTemplates);
  readonly pending = this.store.selectSignal(selectTemplatesPending);

  analysisCount(ws: WorksheetTemplate): number { return ws.analyses.length; }
  onClose(): void { this.closed.emit(); }
  onNewSheet(): void { this.newSheet.emit(); }
  onEdit(id: number): void { this.editSheet.emit(id); }
}
```

> `pTooltip` requiere `TooltipModule`. Si preferís no sumar el import, reemplazá `pTooltip="Próximamente"` por `title="Próximamente"` en el `p-button` (atributo HTML nativo). Para el plan, usá `title` y NO importes TooltipModule (YAGNI).

Ajuste: quitar `pTooltip` y dejar el `p-button` con `[disabled]="true"` (el title del botón disabled no es crítico). El resto de botones nativos ya usan `title`.

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- --include='**/planillas-modal.component.spec.ts'`
Expected: PASS (3 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/components/planillas/planillas-modal.component.ts \
        src/app/features/analitica/muestras/components/planillas/planillas-modal.component.spec.ts
git commit -m "feat(planillas): planillas-modal (lista de plantillas)"
```

---

### Task 6: Wiring en `worklist.page` (habilitar Planillas en procesamiento)

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.ts`
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.html`
- Test: `src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts`

- [ ] **Step 1: Escribir/ajustar el page spec (falla)**

En `worklist.page.spec.ts`, agregar dentro del `describe`:

```typescript
  it('Procesamiento: openPlanillas/closePlanillas alterna el flag', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    expect(cmp.planillasOpen()).toBe(false);
    cmp.openPlanillas();
    expect(cmp.planillasOpen()).toBe(true);
    cmp.closePlanillas();
    expect(cmp.planillasOpen()).toBe(false);
  });

  it('Procesamiento: newSheet abre config en modo creación y cierra planillas', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    cmp.openPlanillas();
    cmp.onNewSheet();
    expect(cmp.editingTemplateId()).toBeNull();
    expect(cmp.configOpen()).toBe(true);
    expect(cmp.planillasOpen()).toBe(false);
  });

  it('Procesamiento: editSheet abre config con el id', () => {
    const fx = setup('procesamiento');
    const cmp = fx.componentInstance;
    cmp.onEditSheet(5);
    expect(cmp.editingTemplateId()).toBe(5);
    expect(cmp.configOpen()).toBe(true);
  });
```

> El `setup()` del page spec usa `provideMockStore` con selectores específicos; agregar (si el componente los lee) los selectores de worksheetTemplates no es necesario porque el page no los consume directamente (los consumen los modales, que en el SMOKE_TEMPLATE override NO se renderizan). Sólo se testea la lógica de signals de la page.

- [ ] **Step 2: Run, verify FAIL**

Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: FAIL — `planillasOpen`/`openPlanillas`/etc. no existen.

- [ ] **Step 3: Implementar el wiring en `worklist.page.ts`**

Agregar imports:

```typescript
import { loadTemplates } from '../../store/worksheet-templates/worksheet-templates.actions';
import { PlanillasModalComponent } from '../../components/planillas/planillas-modal.component';
import { WorksheetConfigModalComponent } from '../../components/planillas/worksheet-config-modal.component';
```

Agregar los componentes a `imports: [...]` del `@Component`:

```typescript
  imports: [ScanBarComponent, BatchMenuComponent, SampleTableComponent, TransitionDialogComponent, ToastModule,
            PlanillasModalComponent, WorksheetConfigModalComponent],
```

Agregar signals + métodos (junto a los otros signals de la clase):

```typescript
  readonly planillasOpen = signal(false);
  readonly configOpen = signal(false);
  readonly editingTemplateId = signal<number | null>(null);

  openPlanillas(): void { this.store.dispatch(loadTemplates()); this.planillasOpen.set(true); }
  closePlanillas(): void { this.planillasOpen.set(false); }
  onNewSheet(): void { this.editingTemplateId.set(null); this.planillasOpen.set(false); this.configOpen.set(true); }
  onEditSheet(id: number): void { this.editingTemplateId.set(id); this.planillasOpen.set(false); this.configOpen.set(true); }
  closeConfig(): void { this.configOpen.set(false); }
  onConfigSaved(): void { this.configOpen.set(false); this.planillasOpen.set(true); }
```

(`signal` ya está importado en el archivo.)

Además, agregar un toast de error en español para los fallos de planillas (regla #4), reusando el patrón de error deduplicado ya presente. Importar el selector:

```typescript
import { selectTemplatesError } from '../../store/worksheet-templates/worksheet-templates.selectors';
```

agregar el signal (junto a los otros selectSignal de la clase):

```typescript
  private readonly templatesError = this.store.selectSignal(selectTemplatesError);
```

y dentro del bloque `if (screenKey === 'procesamiento') { ... }` del constructor (después del effect de error existente), agregar un segundo effect deduplicado para los errores de plantillas:

```typescript
      let lastTplSig: string | null = null;
      effect(() => {
        const err = this.templatesError();
        const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
        if (sig && sig !== lastTplSig) {
          lastTplSig = sig;
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: humanizeBackendError(err, { fallback: 'No pudimos guardar la planilla. Probá de nuevo.' }),
            life: 5000,
          });
        }
      });
```

(`effect`, `humanizeBackendError`, `this.messages` ya están importados/inyectados.)

- [ ] **Step 4: Run, verify PASS**

Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: PASS (3 tests nuevos + los existentes intactos).

- [ ] **Step 5: Habilitar el botón Planillas + hosts de modales en el HTML**

En `worklist.page.html`, reemplazar el bloque de botones deshabilitados de Arco 1:

```html
    @if (showWorksheetActions()) {
      <div class="worksheet-actions">
        <button type="button" class="ws-btn ws-btn--ghost" disabled title="Próximamente">
          <i class="pi pi-table"></i> Planillas
        </button>
        <button type="button" class="ws-btn ws-btn--primary" disabled title="Próximamente">
          <i class="pi pi-check"></i> Marcar completadas
        </button>
      </div>
    }
```

por (Planillas ahora activo; Marcar completadas sigue deshabilitado hasta Arco 3):

```html
    @if (showWorksheetActions()) {
      <div class="worksheet-actions">
        <button type="button" class="ws-btn ws-btn--ghost" (click)="openPlanillas()">
          <i class="pi pi-table"></i> Planillas
        </button>
        <button type="button" class="ws-btn ws-btn--primary" disabled title="Próximamente">
          <i class="pi pi-check"></i> Marcar completadas
        </button>
      </div>
    }
```

Y antes de `<p-toast .../>` (o al final del `.worklist-page`), agregar los hosts de modales:

```html
  @if (planillasOpen()) {
    <app-planillas-modal [visible]="planillasOpen()"
      (closed)="closePlanillas()" (newSheet)="onNewSheet()" (editSheet)="onEditSheet($event)" />
  }
  @if (configOpen()) {
    <app-worksheet-config-modal [visible]="configOpen()" [templateId]="editingTemplateId()"
      (closed)="closeConfig()" (saved)="onConfigSaved()" />
  }
```

Quitar el `:not-allowed` visual del botón ghost cuando está activo: en `worklist.page.scss`, ajustar `.ws-btn--ghost` para que cuando NO esté `[disabled]` use `cursor: pointer; opacity: 1`. Añadir:

```scss
.worksheet-actions .ws-btn:not(:disabled) { cursor: pointer; opacity: 1; }
```

- [ ] **Step 6: Verify build + page spec**

Run: `npm run build`
Expected: build limpio.
Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.ts \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.html \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.scss \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts
git commit -m "feat(planillas): habilitar boton Planillas + hosts de modales en procesamiento"
```

---

### Task 7: Verificación final + smoke manual + PR

**Files:** ninguno.

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: suite verde salvo los 2 fallos pre-existentes ajenos (`profile-menu`, unhandled rejection `patient-form`). Confirmar que los specs nuevos (service 3, reducer 7, effects 6, config-modal 6, planillas-modal 3, page +3) están verdes y NO hay nuevos rojos.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build limpio.

- [ ] **Step 3: Smoke manual (browser)**

Backend levantado + `npm start`. Login (BIOQUIMICO/ADMINISTRADOR, sección ANALITICA) → `/analitica/procesamiento`:
- Click **Planillas** → abre modal, lista plantillas reales (o vacío).
- **Nueva hoja** → buscar análisis, agregar, ordenar, Guardar → toast OK, la lista se recarga con la nueva plantilla.
- **Editar** una → precarga nombre + análisis (nombres resueltos) → modificar → Guardar → recarga.
- "Cargar resultados", "Eliminar", "Ver detalle" deshabilitados.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/procesamiento-planillas
```
Abrir PR contra `development` linkeando el Jira.

---

## Self-Review (cobertura del spec)

- ✅ Botón Planillas abre modal → Task 6.
- ✅ Listar templates → Task 1 (service) + Task 5 (modal).
- ✅ Crear/Editar → Task 1 + Task 3 (effect create vs update) + Task 4 (config modal).
- ✅ Buscador análisis (`AnalysisService.searchByName`) → Task 4.
- ✅ Resolver nombres al editar (`getById`) → Task 4.
- ✅ Deshabilitados (Cargar resultados/Eliminar/Ver) → Task 5 + Task 6 (Marcar completadas sigue disabled).
- ✅ Reload tras save (pesimista) → Task 3 (`reloadAfterSave$`).
- ✅ Errores español sin leak → usar `humanizeBackendError` en el toast de error de la page/efecto (la page ya tiene el patrón de toast de error por `selectMuestrasError`; para worksheetTemplates el error se puede sur‑facear con un effect/toast — ver nota abajo).
- ✅ p-dialog + PrimeIcons → Tasks 4, 5.
- ✅ Store separado `worksheetTemplates` + registro → Tasks 2, 3.
- ✅ Tests reducer/effects/selectors/service/componentes/page.

> Nota error-handling: el spec pide toasts en español sin leak. Los modales disparan acciones; el error queda en `selectTemplatesError`. Para mostrarlo, en Task 6 se puede añadir (si se desea cobertura completa de UX de error en este arco) un `effect` en la page que observe `selectTemplatesError` y muestre toast con `humanizeBackendError`, deduplicado por firma — idéntico al patrón ya existente para `selectMuestrasError`. Si se considera fuera del mínimo de Arco 2, dejar el error en el store y agregar el toast en un follow-up; el plan lo marca como opcional para no inflar el arco. **Decisión:** incluirlo es barato y cumple la regla #4 del repo → añadir el effect de toast en Task 6 Step 3 reusando el patrón de error de descarte/procesamiento (observar `selectTemplatesError`).
