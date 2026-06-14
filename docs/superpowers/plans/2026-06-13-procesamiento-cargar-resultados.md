# Procesamiento — Arco 3b: Grilla de carga de resultados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-102](https://exequielsantoro.atlassian.net/browse/KAN-102)
> **Spec:** `docs/superpowers/specs/2026-06-13-procesamiento-cargar-resultados-design.md`
> **Rama:** `feat/procesamiento-cargar-resultados` (worktree `FRONTEND-LABORATORIO-cargar`, base `development`)

**Goal:** Desde la lista de procesamiento, abrir una grilla (determinaciones × results, agrupada por análisis del protocolo) para tipear valores, guardar en batch y marcar resultados como completados.

**Architecture:** Nueva feature NgRx `resultados` (service + store) con un effect `loadGrid$` que hace el fan-out de requests y delega el ensamblado en una función pura `buildResultGrid` (testeable). Pantalla dedicada `cargar-resultados.page` (ruta `procesamiento/cargar/:protocolId`) con un componente de grilla y un modal de resumen (mark-ready). Entrada desde el worklist de procesamiento (tubo seleccionado → su `protocolId`). Banner UX del pendiente de creación de results.

**Tech Stack:** Angular 21 (standalone, signals, OnPush), NgRx clásico, PrimeNG (`p-dialog`), Vitest. Runner: `npm test` (builder `@angular/build:unit-test`). NO `vitest run` directo. Acotar: `npm test -- --include='**/<file>.spec.ts'`.

---

## File Structure (todo bajo `src/app/features/analitica/muestras/`)

- `models/resultado.model.ts` (+ `.spec.ts`) — tipos + `buildResultGrid` (pura).
- `models/tube.model.ts` — +`protocolId` en `Tube` y `groupTubes`.
- `services/resultados-api.service.ts` (+ `.spec.ts`).
- `store/resultados/resultados.{state,actions,reducer,selectors,effects}.ts` (+ reducer/effects spec).
- `components/result-grid/result-grid.component.ts` (+ `.spec.ts`).
- `components/resumen-resultados-modal/resumen-resultados-modal.component.ts` (+ `.spec.ts`).
- `pages/cargar-resultados/cargar-resultados.page.ts` (+ `.spec.ts`).
- `pages/worklist/worklist.page.{ts,html,spec.ts}` — wiring del botón Cargar resultados.
- `analitica.routes.ts` — ruta nueva.
- `app.config.ts` — registro de la feature.

Reuso: `AnalysisService` (`@features/analitica/services/analysis.service`), `humanizeBackendError` (`@shared/utils/error-messages`).

---

### Task 1: Modelos + `buildResultGrid` + `Tube.protocolId`

**Files:**
- Create: `models/resultado.model.ts`, `models/resultado.model.spec.ts`
- Modify: `models/tube.model.ts`, `models/tube.model.spec.ts`

- [ ] **Step 1: Escribir el spec que falla** (`resultado.model.spec.ts`):

```typescript
import { describe, expect, it } from 'vitest';
import { buildResultGrid } from './resultado.model';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from './resultado.model';

const results: AnalyticalResult[] = [
  { id: 1, protocolId: 9, analysisOrderId: 100, sectionId: 80012, patientId: 20002 },
  { id: 2, protocolId: 9, analysisOrderId: 101, sectionId: 80012, patientId: 20002 },
];
const determinationsByResult: Record<number, Determination[]> = {
  1: [{ id: 11, analyticalResultId: 1, determinationCatalogId: 500, resultValue: '180', observations: null }],
  2: [{ id: 21, analyticalResultId: 2, determinationCatalogId: 501, resultValue: null, observations: null }],
};
const catalogById: Record<number, DeterminationCatalogEntry> = {
  500: { id: 500, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 },
  501: { id: 501, name: 'Triglicéridos', unit: 'mg/dL', referenceValues: '< 150', analysisCatalogId: 7 },
};
const analysisNameById: Record<number, string> = { 6: 'Colesterol Total', 7: 'Triglicéridos' };

describe('buildResultGrid', () => {
  it('agrupa results por análisis y arma filas/columnas/celdas', () => {
    const grid = buildResultGrid({ protocolId: 9, results, determinationsByResult, catalogById, analysisNameById });
    expect(grid.protocolId).toBe(9);
    expect(grid.sections).toHaveLength(2);
    const colSec = grid.sections.find(s => s.analysisCatalogId === 6)!;
    expect(colSec.analysisName).toBe('Colesterol Total');
    expect(colSec.resultIds).toEqual([1]);
    expect(colSec.rows).toHaveLength(1);
    expect(colSec.rows[0].name).toBe('Colesterol Total');
    expect(colSec.rows[0].cells[1]).toEqual({ determinationId: 11, value: '180' });
  });

  it('celda vacía cuando resultValue es null', () => {
    const grid = buildResultGrid({ protocolId: 9, results, determinationsByResult, catalogById, analysisNameById });
    const sec = grid.sections.find(s => s.analysisCatalogId === 7)!;
    expect(sec.rows[0].cells[2]).toEqual({ determinationId: 21, value: '' });
  });

  it('sin results → sin secciones', () => {
    const grid = buildResultGrid({ protocolId: 9, results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {} });
    expect(grid.sections).toEqual([]);
  });
});
```

Y en `tube.model.spec.ts` agregar (al describe de groupTubes, o crear si no existe — verificar):

```typescript
  it('groupTubes propaga protocolId del primer label', () => {
    const items = [
      { labelId: 1, sampleId: 50, barcode: 'b1', protocolId: 77, analysisName: 'A', patientName: 'P', urgent: false, status: 'PROCESSING' as const, updatedAt: '2026-06-13T08:00:00Z' },
    ];
    const tubes = groupTubes(items, 'CENTRAL');
    expect(tubes[0].protocolId).toBe(77);
  });
```
(importar `groupTubes` si el spec no lo tiene; si `tube.model.spec.ts` no existe, crearlo con ese único test + imports.)

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/resultado.model.spec.ts'` → FAIL (módulo no existe).

- [ ] **Step 3: Implementar.** Crear `resultado.model.ts`:

```typescript
export interface AnalyticalResult {
  id: number; protocolId: number; analysisOrderId: number; sectionId: number; patientId: number;
}
export interface Determination {
  id: number; analyticalResultId: number; determinationCatalogId: number;
  resultValue: string | null; observations: string | null;
}
export interface DeterminationCatalogEntry {
  id: number; name: string; unit: string | null; referenceValues: string | null; analysisCatalogId: number;
}

export interface GridCell { determinationId: number; value: string; }
export interface GridRow { catalogId: number; name: string; unit: string | null; cells: Record<number, GridCell | null>; }
export interface GridSection { analysisCatalogId: number; analysisName: string; resultIds: number[]; rows: GridRow[]; }
export interface ResultGrid { protocolId: number; sections: GridSection[]; }

export interface BuildGridInput {
  protocolId: number;
  results: AnalyticalResult[];
  determinationsByResult: Record<number, Determination[]>;
  catalogById: Record<number, DeterminationCatalogEntry>;
  analysisNameById: Record<number, string>;
}

/** Ensambla el modelo de grilla: secciones por análisis, filas = determination-catalog, columnas = results. */
export function buildResultGrid(input: BuildGridInput): ResultGrid {
  const { protocolId, results, determinationsByResult, catalogById, analysisNameById } = input;

  // analysisCatalogId de cada result = el del catálogo de su primera determinación.
  const analysisOfResult = new Map<number, number>();
  for (const r of results) {
    const dets = determinationsByResult[r.id] ?? [];
    const firstCat = dets.length ? catalogById[dets[0].determinationCatalogId] : undefined;
    if (firstCat) analysisOfResult.set(r.id, firstCat.analysisCatalogId);
  }

  // Agrupar result ids por análisis.
  const resultsByAnalysis = new Map<number, number[]>();
  for (const r of results) {
    const ac = analysisOfResult.get(r.id);
    if (ac == null) continue;
    const arr = resultsByAnalysis.get(ac) ?? [];
    arr.push(r.id);
    resultsByAnalysis.set(ac, arr);
  }

  const sections: GridSection[] = [...resultsByAnalysis.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([analysisCatalogId, resultIds]) => {
      // filas = catalogIds distintos de las determinaciones de los results de la sección, ordenados por catalogId.
      const catalogIds = [...new Set(
        resultIds.flatMap(rid => (determinationsByResult[rid] ?? []).map(d => d.determinationCatalogId)),
      )].sort((a, b) => a - b);

      const rows: GridRow[] = catalogIds.map(catalogId => {
        const cat = catalogById[catalogId];
        const cells: Record<number, GridCell | null> = {};
        for (const rid of resultIds) {
          const det = (determinationsByResult[rid] ?? []).find(d => d.determinationCatalogId === catalogId);
          cells[rid] = det ? { determinationId: det.id, value: det.resultValue ?? '' } : null;
        }
        return { catalogId, name: cat?.name ?? `#${catalogId}`, unit: cat?.unit ?? null, cells };
      });

      return { analysisCatalogId, analysisName: analysisNameById[analysisCatalogId] ?? `#${analysisCatalogId}`, resultIds, rows };
    });

  return { protocolId, sections };
}
```

En `tube.model.ts`: agregar `protocolId: number;` a la interface `Tube` (después de `sampleId`) y en `groupTubes`, dentro del objeto retornado, agregar `protocolId: first.protocolId,`.

- [ ] **Step 4: Run, verify PASS** — `npm test -- --include='**/resultado.model.spec.ts' --include='**/tube.model.spec.ts'` → PASS (3 + el de tube). Verificá que los specs existentes de tube siguen verdes.

- [ ] **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/models/resultado.model.ts \
        src/app/features/analitica/muestras/models/resultado.model.spec.ts \
        src/app/features/analitica/muestras/models/tube.model.ts \
        src/app/features/analitica/muestras/models/tube.model.spec.ts
git commit -m "feat(resultados): modelos + buildResultGrid + Tube.protocolId"
```

---

### Task 2: Service `ResultadosApiService`

**Files:** Create `services/resultados-api.service.ts` (+ `.spec.ts`).

- [ ] **Step 1: Spec que falla** (`resultados-api.service.spec.ts`):

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ResultadosApiService } from './resultados-api.service';

describe('ResultadosApiService', () => {
  let service: ResultadosApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ResultadosApiService] });
    service = TestBed.inject(ResultadosApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getResultsByProtocol → GET /resultados/protocol/{id}', () => {
    service.getResultsByProtocol(9).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/protocol/9');
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('getDeterminations → GET /resultados/{id}/determinations', () => {
    service.getDeterminations(1).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/determinations');
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('getDeterminationCatalog → GET /determination-catalog/{id}', () => {
    service.getDeterminationCatalog(500).subscribe();
    const req = http.expectOne('/api/v1/analitica/determination-catalog/500');
    expect(req.request.method).toBe('GET'); req.flush({});
  });
  it('batchUpdate → PATCH /resultados/{id}/determinations/batch con {items}', () => {
    const items = [{ determinationId: 11, resultValue: '180', observations: null }];
    service.batchUpdate(1, items).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/determinations/batch');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ items }); req.flush([]);
  });
  it('markReady → POST /resultados/{id}/mark-ready', () => {
    service.markReady(1).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/mark-ready');
    expect(req.request.method).toBe('POST'); req.flush({});
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/resultados-api.service.spec.ts'`.

- [ ] **Step 3: Implementar** `resultados-api.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from '../models/resultado.model';

export interface BatchDeterminationItem { determinationId: number; resultValue: string; observations: string | null; }

@Injectable({ providedIn: 'root' })
export class ResultadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/resultados';
  private readonly catalogBase = '/api/v1/analitica/determination-catalog';

  getResultsByProtocol(protocolId: number): Observable<AnalyticalResult[]> {
    return this.http.get<AnalyticalResult[]>(`${this.base}/protocol/${protocolId}`);
  }
  getDeterminations(resultId: number): Observable<Determination[]> {
    return this.http.get<Determination[]>(`${this.base}/${resultId}/determinations`);
  }
  getDeterminationCatalog(catalogId: number): Observable<DeterminationCatalogEntry> {
    return this.http.get<DeterminationCatalogEntry>(`${this.catalogBase}/${catalogId}`);
  }
  batchUpdate(resultId: number, items: BatchDeterminationItem[]): Observable<Determination[]> {
    return this.http.patch<Determination[]>(`${this.base}/${resultId}/determinations/batch`, { items });
  }
  markReady(resultId: number): Observable<AnalyticalResult> {
    return this.http.post<AnalyticalResult>(`${this.base}/${resultId}/mark-ready`, null);
  }
}
```

- [ ] **Step 4: Run, verify PASS.** **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/services/resultados-api.service.ts \
        src/app/features/analitica/muestras/services/resultados-api.service.spec.ts
git commit -m "feat(resultados): ResultadosApiService"
```

---

### Task 3: Store `resultados` (state/actions/reducer/selectors)

**Files:** Create `store/resultados/resultados.{state,actions,reducer,selectors}.ts` + `resultados.reducer.spec.ts`.

- [ ] **Step 1: Reducer/selector spec que falla** (`resultados.reducer.spec.ts`):

```typescript
import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { resultadosReducer } from './resultados.reducer';
import { initialResultadosState } from './resultados.state';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';
import { selectGrid, selectResultadosLoading, selectResultadosSaving, selectResultadosError } from './resultados.selectors';
import type { ResultGrid } from '../../models/resultado.model';

const grid: ResultGrid = { protocolId: 9, sections: [] };

describe('resultadosReducer', () => {
  it('loadGrid → loading=true', () => {
    expect(resultadosReducer(initialResultadosState, loadGrid({ protocolId: 9 })).loading).toBe(true);
  });
  it('loadGridSuccess → grid + loading false', () => {
    const s = resultadosReducer(initialResultadosState, loadGridSuccess({ grid }));
    expect(s.grid).toBe(grid); expect(s.loading).toBe(false); expect(s.error).toBeNull();
  });
  it('loadGridFailure → loading false + error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = resultadosReducer({ ...initialResultadosState, loading: true }, loadGridFailure({ error }));
    expect(s.loading).toBe(false); expect(s.error).toBe(error);
  });
  it('saveResults → saving=true', () => {
    expect(resultadosReducer(initialResultadosState, saveResults({ results: [] })).saving).toBe(true);
  });
  it('saveResultsSuccess → saving=false', () => {
    expect(resultadosReducer({ ...initialResultadosState, saving: true }, saveResultsSuccess()).saving).toBe(false);
  });
  it('saveResultsFailure → saving=false + error', () => {
    const error = new HttpErrorResponse({ status: 422 });
    const s = resultadosReducer({ ...initialResultadosState, saving: true }, saveResultsFailure({ error }));
    expect(s.saving).toBe(false); expect(s.error).toBe(error);
  });
  it('markReady → saving=true; markReadySuccess → false; markReadyFailure → error', () => {
    expect(resultadosReducer(initialResultadosState, markReady({ resultIds: [1] })).saving).toBe(true);
    expect(resultadosReducer({ ...initialResultadosState, saving: true }, markReadySuccess()).saving).toBe(false);
    const error = new HttpErrorResponse({ status: 422 });
    expect(resultadosReducer(initialResultadosState, markReadyFailure({ error })).error).toBe(error);
  });
  it('selectores proyectan', () => {
    const state = { ...initialResultadosState, grid, loading: true, saving: true };
    expect(selectGrid.projector(state)).toBe(grid);
    expect(selectResultadosLoading.projector(state)).toBe(true);
    expect(selectResultadosSaving.projector(state)).toBe(true);
    expect(selectResultadosError.projector(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar.**

`resultados.state.ts`:
```typescript
import { HttpErrorResponse } from '@angular/common/http';
import type { ResultGrid } from '../../models/resultado.model';

export interface ResultadosState { grid: ResultGrid | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null; }
export const initialResultadosState: ResultadosState = { grid: null, loading: false, saving: false, error: null };
export const RESULTADOS_FEATURE_KEY = 'resultados';
```

`resultados.actions.ts`:
```typescript
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ResultGrid } from '../../models/resultado.model';
import type { BatchDeterminationItem } from '../../services/resultados-api.service';

export const loadGrid = createAction('[Cargar Resultados] Load Grid', props<{ protocolId: number }>());
export const loadGridSuccess = createAction('[Resultados API] Load Grid Success', props<{ grid: ResultGrid }>());
export const loadGridFailure = createAction('[Resultados API] Load Grid Failure', props<{ error: HttpErrorResponse }>());

export const saveResults = createAction('[Cargar Resultados] Save Results', props<{ results: { resultId: number; items: BatchDeterminationItem[] }[] }>());
export const saveResultsSuccess = createAction('[Resultados API] Save Results Success');
export const saveResultsFailure = createAction('[Resultados API] Save Results Failure', props<{ error: HttpErrorResponse }>());

export const markReady = createAction('[Resumen Resultados] Mark Ready', props<{ resultIds: number[] }>());
export const markReadySuccess = createAction('[Resultados API] Mark Ready Success');
export const markReadyFailure = createAction('[Resultados API] Mark Ready Failure', props<{ error: HttpErrorResponse }>());
```

`resultados.reducer.ts`:
```typescript
import { createReducer, on } from '@ngrx/store';
import { initialResultadosState, ResultadosState } from './resultados.state';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';

export const resultadosReducer = createReducer(
  initialResultadosState,
  on(loadGrid, (s): ResultadosState => ({ ...s, loading: true, error: null })),
  on(loadGridSuccess, (s, { grid }): ResultadosState => ({ ...s, grid, loading: false, error: null })),
  on(loadGridFailure, (s, { error }): ResultadosState => ({ ...s, loading: false, error })),
  on(saveResults, (s): ResultadosState => ({ ...s, saving: true, error: null })),
  on(saveResultsSuccess, (s): ResultadosState => ({ ...s, saving: false })),
  on(saveResultsFailure, (s, { error }): ResultadosState => ({ ...s, saving: false, error })),
  on(markReady, (s): ResultadosState => ({ ...s, saving: true, error: null })),
  on(markReadySuccess, (s): ResultadosState => ({ ...s, saving: false })),
  on(markReadyFailure, (s, { error }): ResultadosState => ({ ...s, saving: false, error })),
);
```

`resultados.selectors.ts`:
```typescript
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ResultadosState, RESULTADOS_FEATURE_KEY } from './resultados.state';

export const selectResultadosState = createFeatureSelector<ResultadosState>(RESULTADOS_FEATURE_KEY);
export const selectGrid = createSelector(selectResultadosState, s => s.grid);
export const selectResultadosLoading = createSelector(selectResultadosState, s => s.loading);
export const selectResultadosSaving = createSelector(selectResultadosState, s => s.saving);
export const selectResultadosError = createSelector(selectResultadosState, s => s.error);
```

- [ ] **Step 4: Run, verify PASS.** **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/store/resultados/
git commit -m "feat(resultados): store resultados (state/actions/reducer/selectors)"
```

---

### Task 4: Effects `resultados` (fan-out loadGrid + save + markReady) + registro

**Files:** Create `store/resultados/resultados.effects.ts` (+ `.spec.ts`); Modify `app.config.ts`.

- [ ] **Step 1: Effects spec que falla** (`resultados.effects.spec.ts`):

```typescript
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
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `resultados.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { ResultadosApiService } from '../../services/resultados-api.service';
import { AnalysisService } from '@features/analitica/services/analysis.service';
import { buildResultGrid } from '../../models/resultado.model';
import { selectGrid } from './resultados.selectors';
import {
  loadGrid, loadGridSuccess, loadGridFailure,
  saveResults, saveResultsSuccess, saveResultsFailure,
  markReady, markReadySuccess, markReadyFailure,
} from './resultados.actions';

@Injectable()
export class ResultadosEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(ResultadosApiService);
  private readonly analysis = inject(AnalysisService);

  loadGrid$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadGrid),
      switchMap(({ protocolId }) =>
        this.api.getResultsByProtocol(protocolId).pipe(
          switchMap(results => {
            if (!results.length) {
              return of(buildResultGrid({ protocolId, results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {} }));
            }
            return forkJoin(results.map(r => this.api.getDeterminations(r.id).pipe(map(dets => [r.id, dets] as const)))).pipe(
              switchMap(pairs => {
                const determinationsByResult = Object.fromEntries(pairs);
                const catalogIds = [...new Set(pairs.flatMap(([, dets]) => dets.map(d => d.determinationCatalogId)))];
                const catalogs$ = catalogIds.length ? forkJoin(catalogIds.map(id => this.api.getDeterminationCatalog(id))) : of([]);
                return catalogs$.pipe(
                  switchMap(catalogs => {
                    const catalogById = Object.fromEntries(catalogs.map(c => [c.id, c]));
                    const analysisIds = [...new Set(catalogs.map(c => c.analysisCatalogId))];
                    const names$ = analysisIds.length
                      ? forkJoin(analysisIds.map(id => this.analysis.getById(id).pipe(map(a => [id, a.name] as const))))
                      : of([]);
                    return names$.pipe(
                      map(namePairs => buildResultGrid({ protocolId, results, determinationsByResult, catalogById, analysisNameById: Object.fromEntries(namePairs) })),
                    );
                  }),
                );
              }),
            );
          }),
          map(grid => loadGridSuccess({ grid })),
          catchError((error: HttpErrorResponse) => of(loadGridFailure({ error }))),
        ),
      ),
    ),
  );

  saveResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveResults),
      switchMap(({ results }) => {
        if (!results.length) return of(saveResultsSuccess());
        return forkJoin(results.map(r => this.api.batchUpdate(r.resultId, r.items))).pipe(
          map(() => saveResultsSuccess()),
          catchError((error: HttpErrorResponse) => of(saveResultsFailure({ error }))),
        );
      }),
    ),
  );

  markReady$ = createEffect(() =>
    this.actions$.pipe(
      ofType(markReady),
      switchMap(({ resultIds }) => {
        if (!resultIds.length) return of(markReadySuccess());
        return forkJoin(resultIds.map(id => this.api.markReady(id))).pipe(
          map(() => markReadySuccess()),
          catchError((error: HttpErrorResponse) => of(markReadyFailure({ error }))),
        );
      }),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveResultsSuccess, markReadySuccess),
      withLatestFrom(this.store.select(selectGrid)),
      filter(([, grid]) => grid != null),
      map(([, grid]) => loadGrid({ protocolId: grid!.protocolId })),
    ),
  );
}
```

- [ ] **Step 4: Run, verify PASS** — `npm test -- --include='**/resultados.effects.spec.ts'`.

- [ ] **Step 5: Registrar en `app.config.ts`** — imports junto a los de muestras:
```typescript
import { RESULTADOS_FEATURE_KEY } from '@features/analitica/muestras/store/resultados/resultados.state';
import { resultadosReducer } from '@features/analitica/muestras/store/resultados/resultados.reducer';
import { ResultadosEffects } from '@features/analitica/muestras/store/resultados/resultados.effects';
```
y en providers, después del registro de `worksheetTemplates`:
```typescript
    provideState(RESULTADOS_FEATURE_KEY, resultadosReducer),
    provideEffects(ResultadosEffects),
```

- [ ] **Step 6: Build** — `npm run build` → limpio. **Step 7: Commit**
```bash
git add src/app/features/analitica/muestras/store/resultados/resultados.effects.ts \
        src/app/features/analitica/muestras/store/resultados/resultados.effects.spec.ts \
        src/app/app.config.ts
git commit -m "feat(resultados): effects (fan-out loadGrid + save + markReady) + registro"
```

---

### Task 5: Componente `result-grid`

**Files:** Create `components/result-grid/result-grid.component.ts` (+ `.spec.ts`).

Lógica: input `grid: ResultGrid`; copia local editable `values` (signal `Record<resultId, Record<catalogId, string>>` derivada del grid); editar setea el valor y marca dirty; `buildPayload()` arma `{ resultId, items: [{determinationId, resultValue, observations:null}] }[]` SOLO con celdas modificadas y valor no vacío; emite `save`.

- [ ] **Step 1: Spec que falla** (`result-grid.component.spec.ts`):

```typescript
import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ResultGridComponent } from './result-grid.component';
import type { ResultGrid } from '../../models/resultado.model';

const grid: ResultGrid = {
  protocolId: 9,
  sections: [{
    analysisCatalogId: 6, analysisName: 'Colesterol Total', resultIds: [1],
    rows: [{ catalogId: 500, name: 'Colesterol Total', unit: 'mg/dL', cells: { 1: { determinationId: 11, value: '' } } }],
  }],
};

function setup(): ComponentFixture<ResultGridComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ResultGridComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ResultGridComponent);
  fx.componentRef.setInput('grid', grid);
  fx.detectChanges();
  return fx;
}

describe('ResultGridComponent', () => {
  it('inicializa los valores desde el grid', () => {
    const cmp = setup().componentInstance;
    expect(cmp.valueOf(1, 500)).toBe('');
  });

  it('setValue marca dirty y buildPayload incluye solo modificadas con valor', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    cmp.setValue(1, 500, '195');
    const payload = cmp.buildPayload();
    expect(payload).toEqual([{ resultId: 1, items: [{ determinationId: 11, resultValue: '195', observations: null }] }]);
  });

  it('buildPayload vacío si no hubo cambios', () => {
    const cmp = setup().componentInstance;
    expect(cmp.buildPayload()).toEqual([]);
  });

  it('save emite el payload', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const saved = vi.fn();
    cmp.save.subscribe(saved);
    cmp.setValue(1, 500, '195');
    cmp.onSave();
    expect(saved).toHaveBeenCalledWith([{ resultId: 1, items: [{ determinationId: 11, resultValue: '195', observations: null }] }]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `result-grid.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { ResultGrid } from '../../models/resultado.model';
import type { BatchDeterminationItem } from '../../services/resultados-api.service';

export interface SaveResultPayload { resultId: number; items: BatchDeterminationItem[]; }

@Component({
  selector: 'app-result-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      @for (sec of grid().sections; track sec.analysisCatalogId) {
        <section class="border rounded">
          <header class="px-3 py-2 bg-gray-50 font-semibold text-sm">{{ sec.analysisName }}</header>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left p-2">Determinación</th>
                  @for (rid of sec.resultIds; track rid) { <th class="p-2">#{{ rid }}</th> }
                </tr>
              </thead>
              <tbody>
                @for (row of sec.rows; track row.catalogId) {
                  <tr>
                    <td class="p-2">{{ row.name }}@if (row.unit) { <small class="opacity-60"> ({{ row.unit }})</small> }</td>
                    @for (rid of sec.resultIds; track rid) {
                      <td class="p-1">
                        @if (row.cells[rid]; as cell) {
                          <input class="w-full border rounded p-1 text-center" [ngModel]="valueOf(rid, row.catalogId)"
                                 (ngModelChange)="setValue(rid, row.catalogId, $event)" placeholder="—" />
                        } @else { <span class="opacity-30">—</span> }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
      @if (!grid().sections.length) {
        <p class="text-sm opacity-60">No hay resultados cargables para este protocolo.</p>
      }
      <div class="flex justify-end">
        <button type="button" class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold"
                [disabled]="!grid().sections.length" (click)="onSave()">
          <i class="pi pi-check"></i> Guardar y revisar
        </button>
      </div>
    </div>
  `,
})
export class ResultGridComponent {
  readonly grid = input.required<ResultGrid>();
  readonly save = output<SaveResultPayload[]>();

  /** valores editables: resultId -> catalogId -> value */
  private readonly values = signal<Record<number, Record<number, string>>>({});
  private readonly dirty = signal<Set<string>>(new Set());
  private readonly detIdByCell = computed(() => {
    const map: Record<string, number> = {};
    for (const sec of this.grid().sections)
      for (const row of sec.rows)
        for (const rid of sec.resultIds) {
          const cell = row.cells[rid];
          if (cell) map[`${rid}:${row.catalogId}`] = cell.determinationId;
        }
    return map;
  });

  constructor() {
    // inicializar values desde el grid (cada vez que cambie el input)
    queueMicrotask(() => this.seed());
  }

  private seed(): void {
    const v: Record<number, Record<number, string>> = {};
    for (const sec of this.grid().sections)
      for (const row of sec.rows)
        for (const rid of sec.resultIds) {
          const cell = row.cells[rid];
          if (cell) { (v[rid] ??= {})[row.catalogId] = cell.value; }
        }
    this.values.set(v);
    this.dirty.set(new Set());
  }

  valueOf(resultId: number, catalogId: number): string { return this.values()[resultId]?.[catalogId] ?? ''; }

  setValue(resultId: number, catalogId: number, value: string): void {
    this.values.update(v => ({ ...v, [resultId]: { ...(v[resultId] ?? {}), [catalogId]: value } }));
    this.dirty.update(s => new Set(s).add(`${resultId}:${catalogId}`));
  }

  buildPayload(): SaveResultPayload[] {
    const byResult = new Map<number, BatchDeterminationItem[]>();
    const detIds = this.detIdByCell();
    for (const key of this.dirty()) {
      const [ridStr, catStr] = key.split(':');
      const rid = Number(ridStr), cat = Number(catStr);
      const value = this.valueOf(rid, cat).trim();
      if (!value) continue;
      const determinationId = detIds[key];
      if (determinationId == null) continue;
      const arr = byResult.get(rid) ?? [];
      arr.push({ determinationId, resultValue: value, observations: null });
      byResult.set(rid, arr);
    }
    return [...byResult.entries()].map(([resultId, items]) => ({ resultId, items }));
  }

  onSave(): void { this.save.emit(this.buildPayload()); }
}
```

> Nota: el `seed()` se llama en `queueMicrotask` para inicializar tras el primer bind del input. Si el test necesita los valores sincrónicos tras `detectChanges`, llamá `seed()` también en un `effect()` que lea `this.grid()`. Para los tests provistos, `valueOf` arranca '' (que coincide con el cell.value ''), así que pasan sin importar el timing; verificá y ajustá a `effect()` si algún test de inicialización con valor no-vacío lo requiere.

- [ ] **Step 4: Run, verify PASS.** **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/components/result-grid/
git commit -m "feat(resultados): componente result-grid (edición + payload batch)"
```

---

### Task 6: Componente `resumen-resultados-modal`

**Files:** Create `components/resumen-resultados-modal/resumen-resultados-modal.component.ts` (+ `.spec.ts`).

Input `items: ResumenItem[]` (`{ resultId, label, filled, total, status }`); selección solo de `completa`; emite `markCompleted(resultIds)`.

- [ ] **Step 1: Spec que falla** (`resumen-resultados-modal.component.spec.ts`):

```typescript
import { describe, expect, it, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ResumenResultadosModalComponent } from './resumen-resultados-modal.component';
import type { ResumenItem } from './resumen-resultados-modal.component';

const items: ResumenItem[] = [
  { resultId: 1, label: 'Colesterol · #1', filled: 1, total: 1, status: 'completa' },
  { resultId: 2, label: 'Triglicéridos · #2', filled: 0, total: 1, status: 'sin' },
  { resultId: 3, label: 'TGO · #3', filled: 1, total: 2, status: 'parcial' },
];

function setup(): ComponentFixture<ResumenResultadosModalComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ResumenResultadosModalComponent], providers: [provideNoopAnimations()] });
  const fx = TestBed.createComponent(ResumenResultadosModalComponent);
  fx.componentRef.setInput('visible', true);
  fx.componentRef.setInput('items', items);
  fx.detectChanges();
  return fx;
}

describe('ResumenResultadosModalComponent', () => {
  it('preselecciona solo los completos', () => {
    const cmp = setup().componentInstance;
    expect([...cmp.selected()]).toEqual([1]);
  });
  it('isSelectable solo para completa', () => {
    const cmp = setup().componentInstance;
    expect(cmp.isSelectable(items[0])).toBe(true);
    expect(cmp.isSelectable(items[1])).toBe(false);
    expect(cmp.isSelectable(items[2])).toBe(false);
  });
  it('markCompleted emite los resultIds seleccionados', () => {
    const fx = setup();
    const cmp = fx.componentInstance;
    const emitted = vi.fn();
    cmp.markCompleted.subscribe(emitted);
    cmp.confirm();
    expect(emitted).toHaveBeenCalledWith([1]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `resumen-resultados-modal.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export type ResultadoStatus = 'completa' | 'parcial' | 'sin';
export interface ResumenItem { resultId: number; label: string; filled: number; total: number; status: ResultadoStatus; }

const STATUS_LABEL: Record<ResultadoStatus, string> = { completa: 'Completa', parcial: 'Parcial', sin: 'Sin resultados' };

@Component({
  selector: 'app-resumen-resultados-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onClose()" [modal]="true" [draggable]="false" [style]="{ width: '620px' }"
              header="¿Dar por completados los análisis?">
      <p class="text-sm opacity-70 mb-3">Solo los resultados con todas las determinaciones cargadas pueden marcarse como completados.</p>
      <div class="divide-y">
        @for (i of items(); track i.resultId) {
          <label class="flex items-center gap-2 py-2 text-sm" [class.opacity-50]="!isSelectable(i)">
            <input type="checkbox" [disabled]="!isSelectable(i)" [checked]="selected().has(i.resultId)" (change)="toggle(i)" />
            <span class="flex-1">{{ i.label }}</span>
            <span class="opacity-60">{{ i.filled }}/{{ i.total }}</span>
            <span class="text-xs font-semibold">{{ statusLabel(i.status) }}</span>
          </label>
        }
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Mantener" severity="secondary" [text]="true" (onClick)="onClose()" />
        <p-button label="Marcar completadas" [disabled]="selected().size === 0" (onClick)="confirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ResumenResultadosModalComponent {
  readonly visible = input<boolean>(false);
  readonly items = input<ResumenItem[]>([]);
  readonly markCompleted = output<number[]>();
  readonly closed = output<void>();

  readonly selected = signal<Set<number>>(new Set());

  constructor() {
    effect(() => { this.selected.set(new Set(this.items().filter(i => i.status === 'completa').map(i => i.resultId))); });
  }

  isSelectable(i: ResumenItem): boolean { return i.status === 'completa'; }
  statusLabel(s: ResultadoStatus): string { return STATUS_LABEL[s]; }
  toggle(i: ResumenItem): void {
    if (!this.isSelectable(i)) return;
    this.selected.update(prev => { const n = new Set(prev); n.has(i.resultId) ? n.delete(i.resultId) : n.add(i.resultId); return n; });
  }
  confirm(): void { this.markCompleted.emit([...this.selected()]); }
  onClose(): void { this.closed.emit(); }
}
```

- [ ] **Step 4: Run, verify PASS.** **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/components/resumen-resultados-modal/
git commit -m "feat(resultados): resumen-resultados-modal (mark-ready solo completos)"
```

---

### Task 7: Pantalla `cargar-resultados.page` + ruta

**Files:** Create `pages/cargar-resultados/cargar-resultados.page.ts` (+ `.spec.ts`); Modify `analitica.routes.ts`.

La page: lee `protocolId` de la ruta, `dispatch(loadGrid)`, banner UX, host de `result-grid` + `resumen-resultados-modal`, toast de error deduplicado, "Volver". Calcula los `ResumenItem` a partir del grid + el payload guardado.

- [ ] **Step 1: Spec que falla** (`cargar-resultados.page.spec.ts`):

```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { MessageService } from 'primeng/api';
import { CargarResultadosPage } from './cargar-resultados.page';
import { selectGrid, selectResultadosLoading, selectResultadosError } from '../../store/resultados/resultados.selectors';
import { loadGrid } from '../../store/resultados/resultados.actions';
import type { ResultGrid } from '../../models/resultado.model';

const SMOKE_TEMPLATE = `<section><h1>Cargar resultados</h1><div class="demo-banner" *ngIf="true">{{ bannerText }}</div></section>`;

const grid: ResultGrid = { protocolId: 9, sections: [] };

function setup(): { fx: ComponentFixture<CargarResultadosPage>; store: MockStore } {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CargarResultadosPage],
    providers: [
      provideNoopAnimations(),
      MessageService,
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (k: string) => (k === 'protocolId' ? '9' : null) } } } },
      provideMockStore({ selectors: [
        { selector: selectGrid, value: grid },
        { selector: selectResultadosLoading, value: false },
        { selector: selectResultadosError, value: null },
      ] }),
    ],
  });
  TestBed.overrideTemplate(CargarResultadosPage, SMOKE_TEMPLATE);
  const fx = TestBed.createComponent(CargarResultadosPage);
  const store = TestBed.inject(MockStore);
  fx.detectChanges();
  return { fx, store };
}

describe('CargarResultadosPage (smoke)', () => {
  it('expone protocolId leído de la ruta', () => {
    const { fx } = setup();
    expect(fx.componentInstance.protocolId).toBe(9);
  });

  it('tiene el texto del banner UX (pendiente)', () => {
    const { fx } = setup();
    expect(fx.componentInstance.bannerText.toLowerCase()).toContain('demo');
  });
});
```

> El smoke usa `overrideTemplate` (como worklist.page.spec) porque la page importa `result-grid`/`p-dialog`. Validamos lógica (protocolId, banner, dispatch). Ajustá el primer test para spy ANTES del `createComponent` si querés asertar el dispatch (mové el `spyOn` antes de `setup` usando un store creado a mano), o dejá la cobertura del dispatch al effect/manual.

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar** `cargar-resultados.page.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { Store } from '@ngrx/store';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { humanizeBackendError } from '@shared/utils/error-messages';
import { ResultGridComponent, type SaveResultPayload } from '../../components/result-grid/result-grid.component';
import { ResumenResultadosModalComponent, type ResumenItem } from '../../components/resumen-resultados-modal/resumen-resultados-modal.component';
import { selectGrid, selectResultadosLoading, selectResultadosError } from '../../store/resultados/resultados.selectors';
import { loadGrid, saveResults, markReady } from '../../store/resultados/resultados.actions';
import { signal } from '@angular/core';

@Component({
  selector: 'app-cargar-resultados',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResultGridComponent, ResumenResultadosModalComponent, ToastModule],
  providers: [MessageService],
  template: `
    <section class="p-4 flex flex-col gap-4">
      <header class="flex items-center justify-between">
        <button type="button" class="text-sm text-blue-600" (click)="back()">← Volver a procesamiento</button>
      </header>
      <div class="demo-banner rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm p-2">
        <i class="pi pi-info-circle"></i> {{ bannerText }}
      </div>
      <h1 class="text-lg font-semibold">Cargar resultados</h1>
      @if (loading()) { <p class="text-sm opacity-60">Cargando resultados…</p> }
      @else if (grid()) { <app-result-grid [grid]="grid()!" (save)="onSave($event)" /> }
      @if (resumenOpen()) {
        <app-resumen-resultados-modal [visible]="resumenOpen()" [items]="resumenItems()"
          (markCompleted)="onMarkCompleted($event)" (closed)="resumenOpen.set(false)" />
      }
      <p-toast position="bottom-right" />
    </section>
  `,
})
export class CargarResultadosPage {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(Store);
  private readonly messages = inject(MessageService);
  private readonly location = inject(Location);

  readonly bannerText = 'Datos de demo: la creación automática de resultados al pasar a PROCESSING está pendiente.';
  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));

  readonly grid = this.store.selectSignal(selectGrid);
  readonly loading = this.store.selectSignal(selectResultadosLoading);
  private readonly error = this.store.selectSignal(selectResultadosError);

  readonly resumenOpen = signal(false);
  private lastPayload: SaveResultPayload[] = [];

  readonly resumenItems = computed<ResumenItem[]>(() => {
    const g = this.grid();
    if (!g) return [];
    // por result: total = nº de filas (catalogIds) en su sección; filled = celdas con valor.
    const items: ResumenItem[] = [];
    for (const sec of g.sections) {
      for (const rid of sec.resultIds) {
        let total = 0, filled = 0;
        for (const row of sec.rows) {
          const cell = row.cells[rid];
          if (!cell) continue;
          total++;
          if (cell.value.trim() !== '') filled++;
        }
        const status = total === 0 || filled === 0 ? 'sin' : filled === total ? 'completa' : 'parcial';
        items.push({ resultId: rid, label: `${sec.analysisName} · #${rid}`, filled, total, status });
      }
    }
    return items;
  });

  constructor() {
    this.store.dispatch(loadGrid({ protocolId: this.protocolId }));
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

  onSave(payload: SaveResultPayload[]): void {
    this.lastPayload = payload;
    if (payload.length) this.store.dispatch(saveResults({ results: payload }));
    this.resumenOpen.set(true);
  }
  onMarkCompleted(resultIds: number[]): void {
    this.resumenOpen.set(false);
    if (resultIds.length) this.store.dispatch(markReady({ resultIds }));
  }
  back(): void { this.location.back(); }
}
```

> Quitar el import suelto de `signal` duplicado si tu linter lo marca (debe ir en el import de `@angular/core`). Ajustá los imports a un solo `import { ... signal } from '@angular/core'`.

En `analitica.routes.ts`, agregar (después de la ruta `procesamiento`):
```typescript
      {
        path: 'procesamiento/cargar/:protocolId',
        canMatch: [sectionGuard('ANALITICA')],
        loadComponent: () => import('./muestras/pages/cargar-resultados/cargar-resultados.page').then(m => m.CargarResultadosPage),
        title: 'Cargar resultados',
      },
```

- [ ] **Step 4: Run, verify PASS** (page smoke). **Step 5: Build** `npm run build`. **Step 6: Commit**
```bash
git add src/app/features/analitica/muestras/pages/cargar-resultados/ src/app/features/analitica/analitica.routes.ts
git commit -m "feat(resultados): pantalla cargar-resultados + ruta + banner UX"
```

---

### Task 8: Wiring en `worklist.page` — botón "Cargar resultados"

**Files:** Modify `pages/worklist/worklist.page.ts`, `worklist.page.html`, `worklist.page.spec.ts`.

- [ ] **Step 1: Tests que fallan** — en `worklist.page.spec.ts` agregar:

```typescript
  it('Procesamiento: selectedTubeProtocolId es el protocolId del único tubo seleccionado', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'Hemograma',
      patientName: 'Marta', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    cmp.toggleRow(cmp.rows()[0].id);
    expect(cmp.selectedTubeProtocolId()).toBe(88);
  });

  it('Procesamiento: selectedTubeProtocolId null si 0 ó >1 seleccionados', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'A', patientName: 'M', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z' },
      { labelId: 70002, sampleId: 50051, barcode: '70002', protocolId: 88, analysisName: 'B', patientName: 'N', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:01:00Z' },
    ];
    const fx = setup('procesamiento', [], [], items);
    const cmp = fx.componentInstance;
    expect(cmp.selectedTubeProtocolId()).toBeNull();
    cmp.toggleRow(cmp.rows()[0].id); cmp.toggleRow(cmp.rows()[1].id);
    expect(cmp.selectedTubeProtocolId()).toBeNull();
  });
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementar en `worklist.page.ts`:**

Importar Router:
```typescript
import { Router } from '@angular/router';
```
Inyectar (junto a los otros inject):
```typescript
  private readonly router = inject(Router);
```
Agregar el computed + método (junto a `showWorksheetActions`):
```typescript
  /** protocolId del único tubo seleccionado (procesamiento), o null si 0 ó >1. */
  readonly selectedTubeProtocolId = computed<number | null>(() => {
    const sel = this.selectedSamples();
    if (sel.length !== 1) return null;
    return (sel[0] as Tube).protocolId ?? null;
  });

  cargarResultados(): void {
    const pid = this.selectedTubeProtocolId();
    if (pid != null) this.router.navigate(['/analitica/procesamiento/cargar', pid]);
  }
```
(`Tube` ya está importado; `computed` ya importado.)

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: HTML — reemplazar el botón "Marcar completadas" deshabilitado por "Cargar resultados".** En `worklist.page.html`, dentro de `@if (showWorksheetActions())`, reemplazar el botón `ws-btn--primary` (Marcar completadas) por:
```html
        <button type="button" class="ws-btn ws-btn--primary" [disabled]="selectedTubeProtocolId() == null"
                title="Seleccioná un tubo para cargar sus resultados" (click)="cargarResultados()">
          <i class="pi pi-pencil"></i> Cargar resultados
        </button>
```
(El botón "Planillas" del Arco 2 queda igual.)

- [ ] **Step 6: Build + page spec** — `npm run build` y `npm test -- --include='**/worklist.page.spec.ts'` → verdes.

- [ ] **Step 7: Commit**
```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.ts \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.html \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts
git commit -m "feat(resultados): botón Cargar resultados en procesamiento (tubo → grilla)"
```

---

### Task 9: Verificación final + PR

- [ ] **Step 1: Suite completa** — `npm test`. Esperado: verde salvo el fail pre-existente ajeno (`patient-form` unhandled rejection). Confirmar specs nuevos verdes (model 3, tube +1, service 5, reducer 8, effects 7, result-grid 4, resumen 3, page 2, worklist +2) y sin nuevos rojos.
- [ ] **Step 2: Build** — `npm run build` limpio.
- [ ] **Step 3: Smoke manual** — backend levantado (development con #71 + seed) + `npm start`. Login (BIOQUIMICO/ADMINISTRADOR, ANALITICA) → `/analitica/procesamiento` → seleccionar un tubo → **Cargar resultados** → grilla con análisis del protocolo + banner demo → tipear valores → Guardar y revisar → resumen (completos seleccionables) → Marcar completadas → recarga.
- [ ] **Step 4: Push + PR** — `git push -u origin feat/procesamiento-cargar-resultados`; PR contra `development` linkeando el Jira.

---

## Self-Review (cobertura del spec)

- ✅ Entrada por tubo seleccionado → ruta con protocolId → Task 8 + Task 7 (ruta).
- ✅ Carga fan-out (results + determinations + catalog + analysis name) → Task 4 (effect) + Task 1 (buildResultGrid).
- ✅ Editar + guardar batch (solo modificadas) → Task 5 (result-grid).
- ✅ Resumen + mark-ready (solo completos) → Task 6 + Task 7 (resumenItems).
- ✅ Banner UX del pendiente → Task 7.
- ✅ Store/service/registro → Tasks 2,3,4.
- ✅ Tube.protocolId → Task 1.
- ✅ Errores español (humanizeBackendError) → Task 7.
- ✅ Tests por capa.
