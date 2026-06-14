# Carga multi-muestra (Cargar resultados) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Spec:** `docs/superpowers/specs/2026-06-14-carga-multi-muestra-design.md`
> **Rama:** `feat/carga-multi-muestra` (worktree `FRONTEND-LABORATORIO-multimuestra`, base `development`)

**Goal:** Sacar el límite de "un tubo" en Cargar resultados: habilitar con ≥1 tubo, cargar la grilla con los resultados de todos los protocolos seleccionados (agrupada por análisis), con columnas rotuladas por paciente.

**Architecture:** Refactor de la feature 3b ya en development. El modelo `ResultGrid` pasa de un `protocolId` a `protocolIds[]` y suma `resultLabels` (resultId→nombre de paciente). El effect `loadGrid$` hace fan-out por protocolo + resuelve nombres de paciente (batch `/patients/by-ids`). La navegación pasa los protocolos por query param. La grilla ya agrupa por análisis, así que los resultados del mismo análisis de distintas muestras son columnas.

**Tech Stack:** Angular 21 (standalone, signals, OnPush), NgRx clásico, Vitest. Runner: **`npm test`** (builder @angular/build:unit-test). NO `npx vitest run`. Acotar: `npm test -- --include='**/<file>.spec.ts'`. Build: `npm run build`.

---

## File Structure

- `models/resultado.model.ts` — `ResultGrid.protocolId`→`protocolIds[]` + `resultLabels`; `buildResultGrid` gana `patientNameById`. (+ spec)
- `services/pacientes-api.service.ts` (NUEVO, + spec) — `getByIds`.
- `store/resultados/resultados.actions.ts` — `loadGrid({protocolIds})`.
- `store/resultados/resultados.effects.ts` — fan-out multi-protocolo + pacientes; reload con protocolIds. (+ spec)
- `store/resultados/resultados.reducer.spec.ts` — actualizar la llamada `loadGrid`.
- `components/result-grid/result-grid.component.ts` — header de columna usa `resultLabels`. (+ spec fixture)
- `pages/cargar-resultados/cargar-resultados.page.ts` — lee `?protocols`; `loadGrid({protocolIds})`; label de resumen con `resultLabels`. (+ spec)
- `pages/worklist/worklist.page.{ts,html,spec.ts}` — `selectedProtocolIds`, botón ≥1, navegar con query param.
- `analitica.routes.ts` — `procesamiento/cargar` (sin `:protocolId`).

> El cambio del modelo es **breaking**: model + actions + effect + reload + result-grid + page + route deben moverse juntos para que compile. Por eso van en **Task 2** (refactor cohesivo). Task 1 (service de pacientes) es independiente y va primero.

---

### Task 1: `PacientesApiService` + modelo `Patient`

**Files:** Create `src/app/features/analitica/muestras/services/pacientes-api.service.ts` (+ `.spec.ts`).

- [ ] **Step 1: Spec que falla** — crear `pacientes-api.service.spec.ts`:
```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PacientesApiService } from './pacientes-api.service';

describe('PacientesApiService', () => {
  let service: PacientesApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PacientesApiService] });
    service = TestBed.inject(PacientesApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getByIds → GET /patients/by-ids con ids repetidos', () => {
    let result: unknown;
    service.getByIds([20002, 20003]).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url === '/api/v1/analitica/patients/by-ids');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.getAll('ids')).toEqual(['20002', '20003']);
    req.flush([{ id: 20002, firstName: 'Ana', lastName: 'López' }]);
    expect(result).toEqual([{ id: 20002, firstName: 'Ana', lastName: 'López' }]);
  });

  it('getByIds con lista vacía no pega y devuelve []', () => {
    let result: unknown;
    service.getByIds([]).subscribe(r => (result = r));
    http.expectNone(r => r.url === '/api/v1/analitica/patients/by-ids');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/pacientes-api.service.spec.ts'`.

- [ ] **Step 3: Implementar** `pacientes-api.service.ts`:
```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Patient { id: number; firstName: string; lastName: string; }

@Injectable({ providedIn: 'root' })
export class PacientesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/patients';

  getByIds(ids: number[]): Observable<Patient[]> {
    if (!ids.length) return of([]);
    let params = new HttpParams();
    for (const id of ids) params = params.append('ids', id);
    return this.http.get<Patient[]>(`${this.base}/by-ids`, { params });
  }
}
```

- [ ] **Step 4: Run, verify PASS** (2 tests). **Step 5: Commit**
```bash
git add src/app/features/analitica/muestras/services/pacientes-api.service.ts \
        src/app/features/analitica/muestras/services/pacientes-api.service.spec.ts
git commit -m "feat(resultados): PacientesApiService.getByIds (nombres para columnas)"
```

---

### Task 2: Refactor core multi-protocolo (modelo + store + effect + grilla + page + ruta)

Cambio cohesivo y breaking — todo en una task para que compile. TDD por capa: primero los specs de lógica pura (modelo), luego el resto.

**Files:** Modify `models/resultado.model.ts` (+ `.spec.ts`), `store/resultados/resultados.actions.ts`, `store/resultados/resultados.effects.ts` (+ `.spec.ts`), `store/resultados/resultados.reducer.spec.ts`, `components/result-grid/result-grid.component.ts` (+ `.spec.ts`), `pages/cargar-resultados/cargar-resultados.page.ts` (+ `.spec.ts`), `analitica.routes.ts`.

- [ ] **Step 1: Actualizar el spec del modelo (falla).** En `resultado.model.spec.ts`, reemplazar los 3 tests de `buildResultGrid` por:
```typescript
import { describe, expect, it } from 'vitest';
import { buildResultGrid } from './resultado.model';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from './resultado.model';

const results: AnalyticalResult[] = [
  { id: 1, protocolId: 9, analysisOrderId: 100, sectionId: 80012, patientId: 20002 },
  { id: 2, protocolId: 10, analysisOrderId: 101, sectionId: 80012, patientId: 20003 },
];
const determinationsByResult: Record<number, Determination[]> = {
  1: [{ id: 11, analyticalResultId: 1, determinationCatalogId: 500, resultValue: '180', observations: null }],
  2: [{ id: 21, analyticalResultId: 2, determinationCatalogId: 500, resultValue: null, observations: null }],
};
const catalogById: Record<number, DeterminationCatalogEntry> = {
  500: { id: 500, name: 'Colesterol Total', unit: 'mg/dL', referenceValues: '< 200', analysisCatalogId: 6 },
};
const analysisNameById = { 6: 'Colesterol Total' };
const patientNameById = { 20002: 'Ana López', 20003: 'Juan Pérez' };

describe('buildResultGrid', () => {
  it('mergea results de distintos protocolos en una sección (columnas)', () => {
    const grid = buildResultGrid({ protocolIds: [9, 10], results, determinationsByResult, catalogById, analysisNameById, patientNameById });
    expect(grid.protocolIds).toEqual([9, 10]);
    expect(grid.sections).toHaveLength(1);
    const sec = grid.sections[0];
    expect(sec.analysisCatalogId).toBe(6);
    expect(sec.resultIds).toEqual([1, 2]);
    expect(sec.rows[0].cells[1]).toEqual({ determinationId: 11, value: '180' });
    expect(sec.rows[0].cells[2]).toEqual({ determinationId: 21, value: '' });
  });

  it('resultLabels usa nombre de paciente, con fallback #id', () => {
    const grid = buildResultGrid({ protocolIds: [9, 10], results, determinationsByResult, catalogById, analysisNameById, patientNameById: { 20002: 'Ana López' } });
    expect(grid.resultLabels[1]).toBe('Ana López');
    expect(grid.resultLabels[2]).toBe('#2');
  });

  it('sin results → sin secciones', () => {
    const grid = buildResultGrid({ protocolIds: [9], results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {}, patientNameById: {} });
    expect(grid.sections).toEqual([]);
    expect(grid.resultLabels).toEqual({});
  });
});
```

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/resultado.model.spec.ts'`.

- [ ] **Step 3: Refactor `resultado.model.ts`.** Cambiar `ResultGrid` y `BuildGridInput`, y `buildResultGrid` para sumar `resultLabels`:
```typescript
export interface ResultGrid { protocolIds: number[]; sections: GridSection[]; resultLabels: Record<number, string>; }

export interface BuildGridInput {
  protocolIds: number[];
  results: AnalyticalResult[];
  determinationsByResult: Record<number, Determination[]>;
  catalogById: Record<number, DeterminationCatalogEntry>;
  analysisNameById: Record<number, string>;
  patientNameById: Record<number, string>;
}

export function buildResultGrid(input: BuildGridInput): ResultGrid {
  const { protocolIds, results, determinationsByResult, catalogById, analysisNameById, patientNameById } = input;

  const analysisOfResult = new Map<number, number>();
  for (const r of results) {
    const dets = determinationsByResult[r.id] ?? [];
    const firstCat = dets.length ? catalogById[dets[0].determinationCatalogId] : undefined;
    if (firstCat) analysisOfResult.set(r.id, firstCat.analysisCatalogId);
  }

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

  const resultLabels: Record<number, string> = {};
  for (const r of results) resultLabels[r.id] = patientNameById[r.patientId] ?? `#${r.id}`;

  return { protocolIds, sections, resultLabels };
}
```

- [ ] **Step 4: Verify model spec PASS** — `npm test -- --include='**/resultado.model.spec.ts'`.

- [ ] **Step 5: Actualizar action `loadGrid`.** En `resultados.actions.ts`:
```typescript
export const loadGrid = createAction('[Cargar Resultados] Load Grid', props<{ protocolIds: number[] }>());
```
(las demás actions sin cambios.)

- [ ] **Step 6: Actualizar el reducer spec.** En `resultados.reducer.spec.ts`, cambiar la llamada de `loadGrid`:
```typescript
  it('loadGrid → loading=true', () => {
    expect(resultadosReducer(initialResultadosState, loadGrid({ protocolIds: [9] })).loading).toBe(true);
  });
```
(el `grid` fixture en ese spec, si tiene `protocolId`, cambiarlo a `protocolIds: [9]` y agregar `resultLabels: {}` — buscar `const grid` y ajustar al nuevo shape `{ protocolIds: [9], sections: [], resultLabels: {} }`.)

- [ ] **Step 7: Refactor `resultados.effects.ts`.** Inyectar el service de pacientes y reescribir `loadGrid$` + `reloadAfterMutation$`:
```typescript
import { PacientesApiService } from '../../services/pacientes-api.service';
// ...
  private readonly pacientes = inject(PacientesApiService);

  loadGrid$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadGrid),
      switchMap(({ protocolIds }) =>
        (protocolIds.length ? forkJoin(protocolIds.map(pid => this.api.getResultsByProtocol(pid))) : of([])).pipe(
          map(lists => lists.flat()),
          switchMap(results => {
            if (!results.length) {
              return of(buildResultGrid({ protocolIds, results: [], determinationsByResult: {}, catalogById: {}, analysisNameById: {}, patientNameById: {} }));
            }
            return forkJoin(results.map(r => this.api.getDeterminations(r.id).pipe(map(dets => [r.id, dets] as const)))).pipe(
              switchMap(pairs => {
                const determinationsByResult = Object.fromEntries(pairs);
                const catalogIds = [...new Set(pairs.flatMap(([, dets]) => dets.map(d => d.determinationCatalogId)))];
                const catalogs$ = catalogIds.length ? forkJoin(catalogIds.map(id => this.api.getDeterminationCatalog(id))) : of([]);
                const patientIds = [...new Set(results.map(r => r.patientId))];
                return forkJoin({ catalogs: catalogs$, patients: this.pacientes.getByIds(patientIds) }).pipe(
                  switchMap(({ catalogs, patients }) => {
                    const catalogById = Object.fromEntries(catalogs.map(c => [c.id, c]));
                    const patientNameById = Object.fromEntries(patients.map(p => [p.id, `${p.firstName} ${p.lastName}`.trim()]));
                    const analysisIds = [...new Set(catalogs.map(c => c.analysisCatalogId))];
                    const names$ = analysisIds.length
                      ? forkJoin(analysisIds.map(id => this.analysis.getById(id).pipe(map(a => [id, a.name] as const))))
                      : of([]);
                    return names$.pipe(
                      map(namePairs => buildResultGrid({ protocolIds, results, determinationsByResult, catalogById, analysisNameById: Object.fromEntries(namePairs), patientNameById })),
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
```
Y `reloadAfterMutation$`: cambiar `loadGrid({ protocolId: grid!.protocolId })` por `loadGrid({ protocolIds: grid!.protocolIds })`.

- [ ] **Step 8: Actualizar el effect spec.** En `resultados.effects.spec.ts`:
  - Importar y proveer `PacientesApiService`: agregar al `api` mock NO; crear `pacientes = { getByIds: vi.fn() }` y `{ provide: PacientesApiService, useValue: pacientes }` en providers. Importar `PacientesApiService`.
  - En el test de fan-out (`loadGrid$ ensambla el grid`): cambiar `loadGrid({ protocolId: 9 })` → `loadGrid({ protocolIds: [9] })`; `api.getResultsByProtocol.mockReturnValue(of([{...}]))` queda; agregar `pacientes.getByIds.mockReturnValue(of([{ id: 20002, firstName: 'Ana', lastName: 'López' }]))`; el result fixture debe tener `patientId: 20002`; assert `(action as any).grid.resultLabels[1]).toBe('Ana López')` y `grid.protocolIds` = [9].
  - El test de "sin results": `loadGrid({ protocolIds: [9] })`, `api.getResultsByProtocol.mockReturnValue(of([]))` → `(action as any).grid.sections).toEqual([])`.
  - El test de failure: `loadGrid({ protocolIds: [9] })`, `api.getResultsByProtocol.mockReturnValue(throwError(...))` → `loadGridFailure`.
  - El test de `reloadAfterMutation$`: el `selectGrid` mock value debe ser `{ protocolIds: [9], sections: [], resultLabels: {} }`; assert `loadGrid({ protocolIds: [9] })`.
  - (saveResults/markReady specs sin cambios.)

- [ ] **Step 9: Actualizar `result-grid.component.ts`.** En el template, header de columna: cambiar `<th class="p-2">#{{ rid }}</th>` por:
```html
                  @for (rid of sec.resultIds; track rid) { <th class="p-2">{{ grid().resultLabels[rid] ?? ('#' + rid) }}</th> }
```
En `result-grid.component.spec.ts`, el `grid` fixture: agregar `protocolIds: [9]` (en vez de `protocolId`), `resultLabels: { 1: 'Ana López' }`, manteniendo `sections`. (No hay test de header DOM; el cambio es de template y lo cubre el build + smoke.)

- [ ] **Step 10: Actualizar `cargar-resultados.page.ts`.** Reemplazar la lectura de `protocolId` y el dispatch:
```typescript
  readonly protocolIds = (this.route.snapshot.queryParamMap.get('protocols') ?? '')
    .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n > 0);
```
(quitar `readonly protocolId = Number(...)`.) En el constructor: `this.store.dispatch(loadGrid({ protocolIds: this.protocolIds }));`.
En `resumenItems`, el label usa el rótulo de paciente:
```typescript
        items.push({ resultId: rid, label: `${sec.analysisName} · ${g.resultLabels[rid] ?? ('#' + rid)}`, filled, total, status });
```
En `cargar-resultados.page.spec.ts`: cambiar el mock de `ActivatedRoute` a `{ snapshot: { queryParamMap: { get: (k: string) => (k === 'protocols' ? '50002,50003' : null) } } }`; el test de protocolId pasa a:
```typescript
  it('lee protocolIds del query param', () => {
    expect(setup().fx.componentInstance.protocolIds).toEqual([50002, 50003]);
  });
```
(el SMOKE_TEMPLATE y los demás tests quedan; si alguno referenciaba `protocolId`, ajustarlo.)

- [ ] **Step 11: Actualizar la ruta.** En `analitica.routes.ts`, cambiar el path:
```typescript
        path: 'procesamiento/cargar',
```
(de `procesamiento/cargar/:protocolId`. El resto del bloque igual.)

- [ ] **Step 12: Run specs + build** — `npm test -- --include='**/resultado.model.spec.ts' --include='**/resultados.reducer.spec.ts' --include='**/resultados.effects.spec.ts' --include='**/result-grid.component.spec.ts' --include='**/cargar-resultados.page.spec.ts'` → todos verdes. Luego `npm run build` → limpio.

- [ ] **Step 13: Commit**
```bash
git add src/app/features/analitica/muestras/models/resultado.model.ts \
        src/app/features/analitica/muestras/models/resultado.model.spec.ts \
        src/app/features/analitica/muestras/store/resultados/ \
        src/app/features/analitica/muestras/components/result-grid/ \
        src/app/features/analitica/muestras/pages/cargar-resultados/ \
        src/app/features/analitica/analitica.routes.ts
git commit -m "feat(resultados): carga multi-protocolo + columnas por paciente + query param"
```

---

### Task 3: Wiring `worklist.page` — selección múltiple

**Files:** Modify `pages/worklist/worklist.page.ts`, `worklist.page.html`, `worklist.page.spec.ts`.

- [ ] **Step 1: Actualizar/agregar tests (fallan).** En `worklist.page.spec.ts`, reemplazar los tests de `selectedTubeProtocolId` por:
```typescript
  it('Procesamiento: selectedProtocolIds = protocolIds distintos de los tubos seleccionados', () => {
    const items: LabelWorklistItem[] = [
      { labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'A', patientName: 'M', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z' },
      { labelId: 70002, sampleId: 50051, barcode: '70002', protocolId: 99, analysisName: 'B', patientName: 'N', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:01:00Z' },
    ];
    const fx = setup('procesamiento', [], [], items);
    const cmp = fx.componentInstance;
    expect(cmp.selectedProtocolIds()).toEqual([]);
    cmp.toggleRow(cmp.rows()[0].id); cmp.toggleRow(cmp.rows()[1].id);
    expect(cmp.selectedProtocolIds().sort()).toEqual([88, 99]);
  });

  it('Procesamiento: cargarResultados navega con query param protocols', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 88, analysisName: 'A', patientName: 'M', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z' };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cmp.toggleRow(cmp.rows()[0].id);
    cmp.cargarResultados();
    expect(nav).toHaveBeenCalledWith(['/analitica/procesamiento/cargar'], { queryParams: { protocols: '88' } });
  });
```
(borrar el test viejo `selectedTubeProtocolId null si 0 ó >1` y el de navegación con `['/analitica/procesamiento/cargar', 88]`.)

- [ ] **Step 2: Run, verify FAIL** — `npm test -- --include='**/worklist.page.spec.ts'`.

- [ ] **Step 3: Implementar.** En `worklist.page.ts`, reemplazar `selectedTubeProtocolId` + `cargarResultados`:
```typescript
  /** protocolIds distintos de los tubos seleccionados (procesamiento). */
  readonly selectedProtocolIds = computed<number[]>(() =>
    [...new Set(this.selectedSamples().map(s => (s as Tube).protocolId).filter((p): p is number => p != null))],
  );

  cargarResultados(): void {
    const ids = this.selectedProtocolIds();
    if (ids.length) this.router.navigate(['/analitica/procesamiento/cargar'], { queryParams: { protocols: ids.join(',') } });
  }
```

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: HTML.** En `worklist.page.html`, el botón "Cargar resultados":
```html
        <button type="button" class="ws-btn ws-btn--primary" [disabled]="selectedProtocolIds().length === 0"
                title="Seleccioná uno o más tubos para cargar sus resultados" (click)="cargarResultados()">
          Cargar resultados
        </button>
```

- [ ] **Step 6: Build + page spec** — `npm run build` y `npm test -- --include='**/worklist.page.spec.ts'` verdes.

- [ ] **Step 7: Commit**
```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.ts \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.html \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts
git commit -m "feat(resultados): selección múltiple de tubos → Cargar resultados (query param)"
```

---

### Task 4: Verificación final + PR

- [ ] **Step 1: Suite completa** — `npm test`. Esperado: verde salvo el fail pre-existente ajeno (`patient-form` unhandled rejection). Sin nuevos rojos.
- [ ] **Step 2: Build** — `npm run build` limpio.
- [ ] **Step 3: Smoke manual** — backend+front corriendo. `/analitica/procesamiento` → seleccionar **2 tubos** (sample 50003 y 50004) → **Cargar resultados** → grilla con análisis de ambos protocolos, columnas rotuladas por paciente (Ana / Juan) → tipear → Guardar → recarga. Verificar que con 1 tubo también funciona, y que con 0 el botón está deshabilitado.
- [ ] **Step 4: Push + PR** — `git push -u origin feat/carga-multi-muestra`; PR contra `development` linkeando el Jira.

---

## Self-Review (cobertura del spec)

- ✅ Botón habilitado con ≥1 tubo + navegar con protocolIds → Task 3.
- ✅ Query param `?protocols=CSV` → Task 2 (page) + Task 3 (worklist).
- ✅ Carga multi-protocolo (forkJoin por protocolo + flatten) → Task 2 (effect).
- ✅ Columnas rotuladas por paciente (`/patients/by-ids`, fallback #id) → Task 1 (service) + Task 2 (effect + buildResultGrid resultLabels + result-grid header).
- ✅ Modelo breaking (protocolId→protocolIds) + tests 3b actualizados → Task 2.
- ✅ reload usa protocolIds → Task 2.
- ✅ Cero backend; validación no se toca.
- ✅ Tests por capa.
