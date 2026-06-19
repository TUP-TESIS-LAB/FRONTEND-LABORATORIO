# Nomenclador NBU (Clínico) con precio particular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

> **Jira:** [KAN-118](https://exequielsantoro.atlassian.net/browse/KAN-118)
> **Spec:** `docs/superpowers/specs/2026-06-19-nomenclador-nbu-clinico-design.md`
> **Mockup (markup de referencia, aprobado):** `mockups/nbu-clinico-v3.html`
> **Rama/worktree:** `feat/nomenclador-nbu-clinico` en `.worktrees/nomenclador-nbu-clinico` (desde `development` d372c92)

**Goal:** Pantalla "Nomenclador NBU" en el grupo Clínico, con catálogo de análisis (reales) + determinaciones (reales) y una pestaña de precio particular (mock), construida sobre el `NbuComponent` y el store `analitica` existentes.

**Architecture:** Un `NomencladorService` aísla TODO el límite mock/real: el catálogo y las determinaciones se consumen REALES del `AnalysisService` existente (`/api/v1/analitica/analysis`), mientras versiones NBU, cantidad U.B. por versión y precio particular son MOCK con comentarios `// MOCK — PR #97`. El store `analitica` se extiende con slices de nomenclador (NgRx clásico). La fórmula de precio vive en un selector. Al integrar #97 se cambian solo los cuerpos del servicio.

**Tech Stack:** Angular 21 standalone + signals + OnPush, NgRx clásico, PrimeNG/Tailwind. Tests: store/servicio con Vitest; componentes con `ng test`.

## Global Constraints

- Worktree nuevo: correr `npm ci` antes de testear/buildear.
- NgRx clásico del proyecto: `createAction`+`createReducer`, mutations pessimistic, `selectSignal` en componentes, sin `@ngrx/entity`. (skill `ngrx-backend-request`)
- Componentes standalone, `OnPush`, signals para estado local. (skill `angular-conventions`)
- Tablas: usar el genérico `ui-table` salvo excepción documentada (skill `laboratory-ui-table`).
- UI 100% en español; sin emojis Unicode (usar PrimeIcons); errores sin leak de internals.
- Precios formateados con `CurrencyArPipe` (`@shared/pipes/currency-ar.pipe`).
- Todo lo MOCK debe llevar comentario `// MOCK — PR #97: <cómo conectar>` o `// MOCK — coverages`.
- Import alias: `@shared/*`, `@core/*`.
- Runners: unit puro → `npx vitest run <archivo>`; componentes → `ng test`.

---

### Task 1: Modelos + `NomencladorService` (real + mock aislados)

**Files:**
- Create: `src/app/features/analitica/models/nomenclador.model.ts`
- Create: `src/app/features/analitica/services/nomenclador.service.ts`
- Modify: `src/app/features/analitica/services/analysis.service.ts` (agregar `list(limit)`)
- Test (Create): `src/app/features/analitica/services/nomenclador.service.spec.ts`

**Interfaces:**
- Produces:
  - `NbuVersion { id: string; label: string; vigente: boolean }`
  - `CatalogRow { id: number; shortCode: string; name: string; familyName: string | null; nbuCode: string | null; cantidadUb: number | null }`
  - `Determination { id: number; name: string }`
  - `ParticularPricing { valorUb: number; overrides: Record<number, number> }`
  - `NomencladorService.getVersions(): Observable<NbuVersion[]>` (MOCK)
  - `NomencladorService.getCatalog(): Observable<CatalogRow[]>` (REAL: vía AnalysisService.list)
  - `NomencladorService.getDeterminations(analysisId: number): Observable<Determination[]>` (REAL: vía AnalysisService.getById)
  - `NomencladorService.getParticularPricing(): Observable<ParticularPricing>` (MOCK)
  - `NomencladorService.saveValorUb(valor: number): Observable<number>` (MOCK; devuelve el valor)
  - `NomencladorService.setOverride(analysisId: number, precio: number | null): Observable<{ analysisId: number; precio: number | null }>` (MOCK)
  - `NomencladorService.cantidadUbForVersion(base: number | null, versionId: string): number | null` (MOCK: factor por versión)
  - `AnalysisService.list(limit?: number): Observable<Analysis[]>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/features/analitica/services/nomenclador.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { NomencladorService } from './nomenclador.service';
import { AnalysisService } from './analysis.service';

describe('NomencladorService', () => {
  let svc: NomencladorService;
  const analysisStub = {
    list: () => of([{ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14 }]),
    getById: () => of({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14,
      determinations: [{ id: 9, name: 'Hemoglobina' }], nbuCode: '475' }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NomencladorService, { provide: AnalysisService, useValue: analysisStub }] });
    svc = TestBed.inject(NomencladorService);
  });

  it('getCatalog mapea análisis REALES a CatalogRow', async () => {
    const rows = await firstValueFrom(svc.getCatalog());
    expect(rows[0]).toEqual({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', nbuCode: null, cantidadUb: 14 });
  });

  it('getDeterminations devuelve las determinaciones REALES del detalle', async () => {
    const dets = await firstValueFrom(svc.getDeterminations(1));
    expect(dets).toEqual([{ id: 9, name: 'Hemoglobina' }]);
  });

  it('getVersions (MOCK) devuelve al menos la versión vigente', async () => {
    const vs = await firstValueFrom(svc.getVersions());
    expect(vs.some(v => v.vigente)).toBe(true);
  });

  it('getParticularPricing (MOCK) trae valorUb y overrides', async () => {
    const p = await firstValueFrom(svc.getParticularPricing());
    expect(p.valorUb).toBeGreaterThan(0);
    expect(typeof p.overrides).toBe('object');
  });

  it('cantidadUbForVersion (MOCK) ajusta la base por versión', () => {
    expect(svc.cantidadUbForVersion(10, 'v2024')).toBe(10);
    expect(svc.cantidadUbForVersion(10, 'v2018')).toBeLessThan(10);
    expect(svc.cantidadUbForVersion(null, 'v2024')).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/analitica/services/nomenclador.service.spec.ts`
Expected: FAIL — `NomencladorService`/`AnalysisService.list` no existen.

- [ ] **Step 3: Agregar `list` a `AnalysisService`**

En `src/app/features/analitica/services/analysis.service.ts`, agregar el método (deja documentado que es lo disponible hoy; con #97 se cambia a `/api/v1/analitica/catalog`):

```ts
  /**
   * Lista análisis del catálogo. HOY usa el endpoint de búsqueda con un límite alto.
   * MOCK-CONNECT — PR #97: reemplazar por GET /api/v1/analitica/catalog (paginado real).
   */
  list(limit = 200): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, { params: { limit: String(limit) } });
  }
```

- [ ] **Step 4: Crear los modelos**

Crear `src/app/features/analitica/models/nomenclador.model.ts`:

```ts
/** Versión del nomenclador NBU. MOCK — PR #97 expone NbuVersion/NbuVersionDetail reales. */
export interface NbuVersion {
  id: string;
  label: string;
  vigente: boolean;
}

/** Fila del catálogo de análisis. Campos reales (AnalysisService) + cantidadUb (real hoy, por-versión con #97). */
export interface CatalogRow {
  id: number;
  shortCode: string;
  name: string;
  familyName: string | null;
  nbuCode: string | null;
  cantidadUb: number | null;
}

/** Determinación de un análisis. Real (AnalysisDetail.determinations: id + name). */
export interface Determination {
  id: number;
  name: string;
}

/** Config de precio particular del laboratorio. MOCK — coverages (no en PR #97). */
export interface ParticularPricing {
  valorUb: number;
  overrides: Record<number, number>; // analysisId -> precio manual
}
```

- [ ] **Step 5: Crear `NomencladorService`**

Crear `src/app/features/analitica/services/nomenclador.service.ts`:

```ts
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnalysisService } from './analysis.service';
import { NbuVersion, CatalogRow, Determination, ParticularPricing } from '../models/nomenclador.model';

/**
 * Fachada del Nomenclador NBU. Aísla el límite REAL/MOCK:
 *  - REAL hoy: catálogo de análisis y determinaciones (AnalysisService → /api/v1/analitica/analysis).
 *  - MOCK: versiones NBU + cantidad U.B. por versión (PR #97) y precio particular (coverages).
 * Para conectar: reemplazar los cuerpos `of(...)` / el factor por versión por las llamadas reales.
 * Las firmas no cambian.
 */
@Injectable({ providedIn: 'root' })
export class NomencladorService {
  private readonly analysis = inject(AnalysisService);

  // ── MOCK — PR #97: GET /api/v1/analitica/nbu-versions ─────────────────────
  private readonly mockVersions: NbuVersion[] = [
    { id: 'v2024', label: 'NBU 2024 — vigente', vigente: true },
    { id: 'v2021', label: 'NBU 2021', vigente: false },
    { id: 'v2018', label: 'NBU 2018', vigente: false },
  ];
  // factor mock para simular que la cantidad de U.B. cambia entre versiones
  private readonly mockVersionFactor: Record<string, number> = { v2024: 1, v2021: 0.85, v2018: 0.7 };

  // ── MOCK — coverages: valor U.B. particular + overrides por estudio ───────
  private mockPricing: ParticularPricing = { valorUb: 350, overrides: { } };

  /** REAL: análisis del catálogo de hoy mapeados a CatalogRow. */
  getCatalog(): Observable<CatalogRow[]> {
    return this.analysis.list(200).pipe(
      map(list => list.map(a => ({
        id: a.id, shortCode: a.shortCode, name: a.name, familyName: a.familyName,
        nbuCode: null,            // el list no trae nbuCode; se completa al expandir (getDeterminations) o con #97
        cantidadUb: a.ubCount,    // real hoy (puede ser null si no configurado)
      }))),
    );
  }

  /** REAL: determinaciones (y nbuCode) del detalle del análisis. */
  getDeterminations(analysisId: number): Observable<Determination[]> {
    return this.analysis.getById(analysisId).pipe(
      map(detail => detail.determinations.map(d => ({ id: d.id, name: d.name }))),
    );
  }

  getVersions(): Observable<NbuVersion[]> {
    return of(this.mockVersions.map(v => ({ ...v }))); // MOCK — PR #97
  }

  /** MOCK — PR #97: la cantidad U.B. correcta saldrá de NbuVersionDetail por (práctica, versión). */
  cantidadUbForVersion(base: number | null, versionId: string): number | null {
    if (base == null) return null;
    const f = this.mockVersionFactor[versionId] ?? 1;
    return Math.round(base * f * 100) / 100;
  }

  getParticularPricing(): Observable<ParticularPricing> {
    return of({ valorUb: this.mockPricing.valorUb, overrides: { ...this.mockPricing.overrides } }); // MOCK — coverages
  }

  saveValorUb(valor: number): Observable<number> {
    this.mockPricing = { ...this.mockPricing, valorUb: valor }; // MOCK — coverages (persiste en sesión)
    return of(valor);
  }

  setOverride(analysisId: number, precio: number | null): Observable<{ analysisId: number; precio: number | null }> {
    const overrides = { ...this.mockPricing.overrides };
    if (precio == null) delete overrides[analysisId]; else overrides[analysisId] = precio;
    this.mockPricing = { ...this.mockPricing, overrides }; // MOCK — coverages
    return of({ analysisId, precio });
  }
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx vitest run src/app/features/analitica/services/nomenclador.service.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/models/nomenclador.model.ts src/app/features/analitica/services/nomenclador.service.ts src/app/features/analitica/services/analysis.service.ts src/app/features/analitica/services/nomenclador.service.spec.ts
git commit -m "feat(analitica): NomencladorService (catálogo+determinaciones reales, versiones/pricing mock)"
```

---

### Task 2: Extender el store `analitica` con slices de nomenclador

Se agregan slices al store existente (ya registrado). Se retira el stub `Nbu`/`loadNbus` (solo lo usa el viejo `NbuComponent`, que se reescribe en Task 4).

**Files:**
- Modify: `src/app/features/analitica/store/analitica.state.ts`
- Modify: `src/app/features/analitica/store/analitica.actions.ts`
- Modify: `src/app/features/analitica/store/analitica.reducer.ts`
- Modify: `src/app/features/analitica/store/analitica.selectors.ts`
- Modify: `src/app/features/analitica/store/analitica.effects.ts`
- Modify: `src/app/features/analitica/models/analitica.model.ts` (quitar `Nbu`)
- Test (Create): `src/app/features/analitica/store/nomenclador.selectors.spec.ts`

**Interfaces:**
- Consumes (Task 1): `NomencladorService`, `NbuVersion`, `CatalogRow`, `Determination`, `ParticularPricing`.
- Produces:
  - Actions: `loadNomenclador`, `loadNomencladorSuccess({versions, catalog, pricing})`, `loadNomencladorFailure({error})`, `selectNbuVersion({versionId})`, `loadDeterminations({analysisId})`, `loadDeterminationsSuccess({analysisId, determinations})`, `saveValorUb({valor})`, `saveValorUbSuccess({valor})`, `setOverride({analysisId, precio})`, `setOverrideSuccess({analysisId, precio})`.
  - Selectors: `selectNbuVersions`, `selectSelectedVersionId`, `selectCatalogRows` (cantidadUb resuelta por versión), `selectDeterminations(analysisId)`, `selectValorUb`, `selectParticularRows` (con `precio`, `esManual`), `selectNomencladorPending`.

- [ ] **Step 1: Escribir el test que falla (selectores derivados)**

Crear `src/app/features/analitica/store/nomenclador.selectors.spec.ts`:

```ts
import { selectCatalogRows, selectParticularRows } from './analitica.selectors';
import { AnaliticaState } from './analitica.state';
import { NomencladorService } from '../services/nomenclador.service';

function baseState(over: Partial<AnaliticaState>): AnaliticaState {
  return {
    protocolos: [], pending: false, error: null,
    nbuVersions: [{ id: 'v2024', label: 'NBU 2024', vigente: true }, { id: 'v2018', label: 'NBU 2018', vigente: false }],
    selectedVersionId: 'v2024',
    catalog: [{ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', nbuCode: '475', cantidadUb: 10 }],
    particular: { valorUb: 350, overrides: {} },
    determinationsByAnalysis: {},
    ...over,
  };
}

describe('selectores nomenclador', () => {
  const svc = new NomencladorService();

  it('selectParticularRows: precio = cantidadUb(versión) × valorUb cuando no hay override', () => {
    const rows = selectParticularRows.projector(baseState({}), svc);
    expect(rows[0].cantidadUb).toBe(10);            // v2024 factor 1
    expect(rows[0].precio).toBe(3500);              // 10 × 350
    expect(rows[0].esManual).toBe(false);
  });

  it('selectParticularRows: override pisa la fórmula y marca esManual', () => {
    const rows = selectParticularRows.projector(baseState({ particular: { valorUb: 350, overrides: { 1: 9999 } } }), svc);
    expect(rows[0].precio).toBe(9999);
    expect(rows[0].esManual).toBe(true);
  });

  it('selectCatalogRows: cambiar de versión recalcula cantidadUb (mock factor)', () => {
    const rows = selectCatalogRows.projector(baseState({ selectedVersionId: 'v2018' }), svc);
    expect(rows[0].cantidadUb).toBeLessThan(10);    // v2018 factor < 1
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/analitica/store/nomenclador.selectors.spec.ts`
Expected: FAIL — selectores/estado nuevos no existen.

- [ ] **Step 3: Extender el estado**

En `analitica.state.ts`: quitar `nbus` y su import `Nbu`, agregar los slices nuevos:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { Protocolo } from '../models/analitica.model';
import { NbuVersion, CatalogRow, Determination, ParticularPricing } from '../models/nomenclador.model';

export interface AnaliticaState {
  protocolos: Protocolo[];
  pending: boolean;
  error: HttpErrorResponse | null;
  nbuVersions: NbuVersion[];
  selectedVersionId: string | null;
  catalog: CatalogRow[];
  particular: ParticularPricing;
  determinationsByAnalysis: Record<number, Determination[]>;
}

export const initialAnaliticaState: AnaliticaState = {
  protocolos: [],
  pending: false,
  error: null,
  nbuVersions: [],
  selectedVersionId: null,
  catalog: [],
  particular: { valorUb: 0, overrides: {} },
  determinationsByAnalysis: {},
};

export const ANALITICA_FEATURE_KEY = 'analitica';
```

- [ ] **Step 4: Reemplazar las actions de Nbu por las de nomenclador**

En `analitica.actions.ts`: quitar el bloque `loadNbus*` y el import `Nbu`; agregar:

```ts
import { NbuVersion, CatalogRow, Determination, ParticularPricing } from '../models/nomenclador.model';

export const loadNomenclador = createAction('[Nomenclador] Load');
export const loadNomencladorSuccess = createAction('[Nomenclador API] Load Success',
  props<{ versions: NbuVersion[]; catalog: CatalogRow[]; pricing: ParticularPricing }>());
export const loadNomencladorFailure = createAction('[Nomenclador API] Load Failure',
  props<{ error: HttpErrorResponse }>());

export const selectNbuVersion = createAction('[Nomenclador] Select Version', props<{ versionId: string }>());

export const loadDeterminations = createAction('[Nomenclador] Load Determinations', props<{ analysisId: number }>());
export const loadDeterminationsSuccess = createAction('[Nomenclador API] Load Determinations Success',
  props<{ analysisId: number; determinations: Determination[] }>());

export const saveValorUb = createAction('[Nomenclador] Save Valor UB', props<{ valor: number }>());
export const saveValorUbSuccess = createAction('[Nomenclador API] Save Valor UB Success', props<{ valor: number }>());

export const setOverride = createAction('[Nomenclador] Set Override', props<{ analysisId: number; precio: number | null }>());
export const setOverrideSuccess = createAction('[Nomenclador API] Set Override Success', props<{ analysisId: number; precio: number | null }>());
```

- [ ] **Step 5: Reemplazar las `on(...)` de Nbu por las de nomenclador en el reducer**

En `analitica.reducer.ts`, quitar el bloque Nbu e importar/manejar las nuevas:

```ts
  on(loadNomenclador, (state): AnaliticaState => ({ ...state, pending: true, error: null })),
  on(loadNomencladorSuccess, (state, { versions, catalog, pricing }): AnaliticaState => ({
    ...state, pending: false, error: null,
    nbuVersions: versions, catalog, particular: pricing,
    selectedVersionId: state.selectedVersionId ?? (versions.find(v => v.vigente)?.id ?? versions[0]?.id ?? null),
  })),
  on(loadNomencladorFailure, (state, { error }): AnaliticaState => ({ ...state, pending: false, error })),
  on(selectNbuVersion, (state, { versionId }): AnaliticaState => ({ ...state, selectedVersionId: versionId })),
  on(loadDeterminationsSuccess, (state, { analysisId, determinations }): AnaliticaState => ({
    ...state, determinationsByAnalysis: { ...state.determinationsByAnalysis, [analysisId]: determinations },
  })),
  on(saveValorUbSuccess, (state, { valor }): AnaliticaState => ({
    ...state, particular: { ...state.particular, valorUb: valor },
  })),
  on(setOverrideSuccess, (state, { analysisId, precio }): AnaliticaState => {
    const overrides = { ...state.particular.overrides };
    if (precio == null) delete overrides[analysisId]; else overrides[analysisId] = precio;
    return { ...state, particular: { ...state.particular, overrides } };
  }),
```

- [ ] **Step 6: Reemplazar selectores Nbu por los de nomenclador**

En `analitica.selectors.ts`, quitar `selectAllNbus` y agregar (inyectan el `NomencladorService` para la fórmula por versión — se pasa como segundo arg del projector):

```ts
import { inject } from '@angular/core';
import { NomencladorService } from '../services/nomenclador.service';

export const selectNbuVersions = createSelector(selectAnaliticaState, s => s.nbuVersions);
export const selectSelectedVersionId = createSelector(selectAnaliticaState, s => s.selectedVersionId);
export const selectValorUb = createSelector(selectAnaliticaState, s => s.particular.valorUb);
export const selectNomencladorPending = createSelector(selectAnaliticaState, s => s.pending);

export const selectCatalogRows = createSelector(
  selectAnaliticaState,
  () => inject(NomencladorService),
  (s, svc) => s.catalog.map(r => ({ ...r, cantidadUb: svc.cantidadUbForVersion(r.cantidadUb, s.selectedVersionId ?? 'v2024') })),
);

export const selectDeterminations = (analysisId: number) =>
  createSelector(selectAnaliticaState, s => s.determinationsByAnalysis[analysisId] ?? null);

export const selectParticularRows = createSelector(
  selectAnaliticaState,
  () => inject(NomencladorService),
  (s, svc) => s.catalog.map(r => {
    const cant = svc.cantidadUbForVersion(r.cantidadUb, s.selectedVersionId ?? 'v2024');
    const override = s.particular.overrides[r.id];
    const auto = cant == null ? null : Math.round(cant * s.particular.valorUb * 100) / 100;
    return { ...r, cantidadUb: cant, auto, precio: override ?? auto, esManual: override != null };
  }),
);
```

> Nota: `createSelector` con `inject(...)` como input-selector funciona porque los selectores se evalúan dentro del contexto de inyección de `selectSignal` en el componente. Si la versión de NgRx del repo no lo soporta, el plan-fallback es exponer `cantidadUbForVersion` como función pura standalone importada (sin DI) y usarla directo en el projector. Verificar en Step 8 al correr el test.

- [ ] **Step 7: Reemplazar el effect `loadNbus$` por los de nomenclador**

En `analitica.effects.ts`, quitar `loadNbus$` y `getNbus`; agregar (usa `NomencladorService`):

```ts
import { forkJoin } from 'rxjs';
import { NomencladorService } from '../services/nomenclador.service';
// ... en la clase: private readonly nomenclador = inject(NomencladorService);

  loadNomenclador$ = createEffect(() => this.actions$.pipe(
    ofType(loadNomenclador),
    switchMap(() => forkJoin({
      versions: this.nomenclador.getVersions(),
      catalog: this.nomenclador.getCatalog(),
      pricing: this.nomenclador.getParticularPricing(),
    }).pipe(
      map(({ versions, catalog, pricing }) => loadNomencladorSuccess({ versions, catalog, pricing })),
      catchError((error) => of(loadNomencladorFailure({ error }))),
    )),
  ));

  loadDeterminations$ = createEffect(() => this.actions$.pipe(
    ofType(loadDeterminations),
    mergeMap(({ analysisId }) => this.nomenclador.getDeterminations(analysisId).pipe(
      map((determinations) => loadDeterminationsSuccess({ analysisId, determinations })),
      catchError(() => of(loadDeterminationsSuccess({ analysisId, determinations: [] }))),
    )),
  ));

  saveValorUb$ = createEffect(() => this.actions$.pipe(
    ofType(saveValorUb),
    switchMap(({ valor }) => this.nomenclador.saveValorUb(valor).pipe(map((v) => saveValorUbSuccess({ valor: v })))),
  ));

  setOverride$ = createEffect(() => this.actions$.pipe(
    ofType(setOverride),
    mergeMap(({ analysisId, precio }) => this.nomenclador.setOverride(analysisId, precio).pipe(
      map((r) => setOverrideSuccess(r)))),
  ));
```

Agregar `mergeMap` al import de `rxjs/operators`.

- [ ] **Step 8: Quitar `Nbu` del modelo y correr el test**

En `analitica.model.ts` borrar la interface `Nbu`. Verificar con grep que nada más use `Nbu`/`loadNbus`/`selectAllNbus`/`getNbus` (solo el viejo NbuComponent, que se reescribe en Task 4 — si todavía referencia, se ajusta en Task 4).

Run: `npx vitest run src/app/features/analitica/store/nomenclador.selectors.spec.ts`
Expected: PASS (3 tests). Si falla por el `inject` en el selector, aplicar el fallback de la nota del Step 6 (función pura) y re-correr.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/analitica/store src/app/features/analitica/models/analitica.model.ts
git commit -m "feat(analitica): store nomenclador (versiones, catálogo, determinaciones, precio particular)"
```

---

### Task 3: Ítem de sidebar en grupo Clínico

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts` (grupo 'Clínico')

- [ ] **Step 1: Agregar el ítem**

En `sidebar.nav.ts`, dentro del grupo `{ label: 'Clínico', items: [...] }`, agregar como último item:

```ts
      { kind: 'link', label: 'Nomenclador NBU', icon: 'pi pi-book', path: '/analitica/nbu', sectionKey: 'ANALITICA' },
```

- [ ] **Step 2: Verificar build (la nav es data; no hay test unitario dedicado)**

Run: `npm run build`
Expected: compila. (La ruta `/analitica/nbu` ya existe en `analitica.routes.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(nav): ítem Nomenclador NBU en grupo Clínico"
```

---

### Task 4: `NbuComponent` — shell (header + selector de versión + tabs)

Reescribe el `NbuComponent` stub. Markup según `mockups/nbu-clinico-v3.html` (header con eyebrow "Clínico" + título, selector de versión arriba a la derecha, tabs "Catálogo de análisis" / "Precio particular", filtros search + familia).

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu.component.ts`
- Test (Create/Modify): `src/app/features/analitica/pages/nbu/nbu.component.spec.ts`

**Interfaces:**
- Consumes: `loadNomenclador`, `selectNbuVersion`, selectores `selectNbuVersions`, `selectSelectedVersionId`, `selectNomencladorPending`. Componentes hijos `NbuCatalogoTabComponent` (Task 5) y `NbuParticularTabComponent` (Task 6).
- Produces: una signal `tab: 'catalogo' | 'particular'` local; pasa `version`/filtros a los tabs vía inputs o store.

- [ ] **Step 1: Escribir el smoke test que falla**

`nbu.component.spec.ts` (ng test): provee un `MockStore`, monta el componente, verifica que despacha `loadNomenclador` en init y que togglear el tab cambia la signal/render. (Patrón de los page-spec existentes del repo; usar `provideMockStore` con los selectores seteados.)

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { NbuComponent } from './nbu.component';
import { loadNomenclador } from '../../store/analitica.actions';
import { selectNbuVersions, selectSelectedVersionId, selectNomencladorPending } from '../../store/analitica.selectors';

describe('NbuComponent', () => {
  let fixture: ComponentFixture<NbuComponent>; let store: MockStore;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NbuComponent],
      providers: [provideMockStore({ selectors: [
        { selector: selectNbuVersions, value: [{ id: 'v2024', label: 'NBU 2024', vigente: true }] },
        { selector: selectSelectedVersionId, value: 'v2024' },
        { selector: selectNomencladorPending, value: false },
      ] })],
    }).compileComponents();
    store = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(NbuComponent); fixture.detectChanges();
  });

  it('despacha loadNomenclador en init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.ngOnInit();
    expect(spy).toHaveBeenCalledWith(loadNomenclador());
  });

  it('arranca en el tab catálogo y permite cambiar a particular', () => {
    expect(fixture.componentInstance.tab()).toBe('catalogo');
    fixture.componentInstance.setTab('particular');
    expect(fixture.componentInstance.tab()).toBe('particular');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `ng test --watch=false --include='**/nbu/nbu.component.spec.ts'`
Expected: FAIL (componente aún es el stub / API distinta).

- [ ] **Step 3: Reescribir `NbuComponent`**

Reescribir `nbu.component.ts`: standalone, OnPush, imports `[NbuCatalogoTabComponent, NbuParticularTabComponent]` (+ módulos PrimeNG necesarios para el select). Template según el mockup (header, `<select>` de versión enlazado a `selectNbuVersion`, tabs con `tab()` signal, render condicional del tab). Lógica:

```ts
readonly versions = this.store.selectSignal(selectNbuVersions);
readonly selectedVersionId = this.store.selectSignal(selectSelectedVersionId);
readonly pending = this.store.selectSignal(selectNomencladorPending);
readonly tab = signal<'catalogo' | 'particular'>('catalogo');
setTab(t: 'catalogo' | 'particular') { this.tab.set(t); }
onVersion(id: string) { this.store.dispatch(selectNbuVersion({ versionId: id })); }
ngOnInit() { this.store.dispatch(loadNomenclador()); }
```

(Los tabs hijos leen del store por su cuenta; el shell solo orquesta versión + tab activo.)

- [ ] **Step 4: Correr y verificar que pasa**

Run: `ng test --watch=false --include='**/nbu/nbu.component.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/nbu
git commit -m "feat(analitica): NbuComponent shell (versión + tabs)"
```

---

### Task 5: Tab Catálogo (tabla + determinaciones reales al expandir)

**Files:**
- Create: `src/app/features/analitica/pages/nbu/nbu-catalogo-tab.component.ts`
- Test (Create): `src/app/features/analitica/pages/nbu/nbu-catalogo-tab.component.spec.ts`

**Interfaces:**
- Consumes: `selectCatalogRows`, `selectDeterminations(id)`, `loadDeterminations`. Filtros search/familia (signals locales o inputs del shell).
- Produces: tabla con fila expandible.

- [ ] **Step 1: Smoke test que falla**

`nbu-catalogo-tab.component.spec.ts`: con `provideMockStore` (selectCatalogRows con 1 fila), monta y verifica que renderiza el nombre del análisis y que al expandir despacha `loadDeterminations({analysisId})`.

```ts
it('expande y pide determinaciones reales', () => {
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.toggle(1);
  expect(spy).toHaveBeenCalledWith(loadDeterminations({ analysisId: 1 }));
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `ng test --watch=false --include='**/nbu-catalogo-tab.component.spec.ts'`
Expected: FAIL (no existe).

- [ ] **Step 3: Implementar el tab**

Crear el componente standalone OnPush. Markup de la tabla y la fila expandible según `mockups/nbu-clinico-v3.html` (columnas: Código, Análisis, Familia, Cód. NBU, Cantidad U.B., Determinaciones; fila expandible con las determinaciones reales). Lógica:

```ts
readonly rows = this.store.selectSignal(selectCatalogRows);
readonly expanded = signal<Set<number>>(new Set());
toggle(id: number) {
  const s = new Set(this.expanded());
  if (s.has(id)) s.delete(id); else { s.add(id); this.store.dispatch(loadDeterminations({ analysisId: id })); }
  this.expanded.set(s);
}
dets(id: number) { return this.store.selectSignal(selectDeterminations(id))(); }
```

Búsqueda/familia: filtrar `rows()` con un `computed` sobre signals locales (`search`, `family`). Determinaciones se muestran reales (id+name); si todavía no cargaron, mostrar "Cargando…".

- [ ] **Step 4: Correr y verificar que pasa**

Run: `ng test --watch=false --include='**/nbu-catalogo-tab.component.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/nbu/nbu-catalogo-tab.component.ts src/app/features/analitica/pages/nbu/nbu-catalogo-tab.component.spec.ts
git commit -m "feat(analitica): tab Catálogo con determinaciones reales al expandir"
```

---

### Task 6: Tab Precio particular (valor U.B. + precio derivado + override)

**Files:**
- Create: `src/app/features/analitica/pages/nbu/nbu-particular-tab.component.ts`
- Test (Create): `src/app/features/analitica/pages/nbu/nbu-particular-tab.component.spec.ts`

**Interfaces:**
- Consumes: `selectParticularRows`, `selectValorUb`, `saveValorUb`, `setOverride`. `CurrencyArPipe`.
- Produces: card valor U.B. + tabla de precios con override inline.

- [ ] **Step 1: Smoke test que falla**

`nbu-particular-tab.component.spec.ts`: con `provideMockStore` (selectParticularRows con una fila auto y selectValorUb=350), verifica que guardar valor despacha `saveValorUb({valor})` y que confirmar un override despacha `setOverride({analysisId, precio})`, y revertir despacha `setOverride({analysisId, precio:null})`.

```ts
it('guarda valor U.B.', () => {
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.guardarValor(400);
  expect(spy).toHaveBeenCalledWith(saveValorUb({ valor: 400 }));
});
it('fija y revierte override', () => {
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.confirmarOverride(1, 9999);
  expect(spy).toHaveBeenCalledWith(setOverride({ analysisId: 1, precio: 9999 }));
  fixture.componentInstance.limpiarOverride(1);
  expect(spy).toHaveBeenCalledWith(setOverride({ analysisId: 1, precio: null }));
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `ng test --watch=false --include='**/nbu-particular-tab.component.spec.ts'`
Expected: FAIL (no existe).

- [ ] **Step 3: Implementar el tab**

Crear standalone OnPush. Markup según `mockups/nbu-clinico-v3.html` tab "Precio particular" (card valor U.B. editable + Guardar; tabla Código/Análisis/Familia/Cant. U.B./Precio particular/Origen/acción; estados "Manual" y "Sin U.B."; edición inline del override). Lógica:

```ts
readonly rows = this.store.selectSignal(selectParticularRows);
readonly valorUb = this.store.selectSignal(selectValorUb);
readonly editing = signal<number | null>(null);
guardarValor(v: number) { this.store.dispatch(saveValorUb({ valor: v })); }
confirmarOverride(id: number, precio: number) { this.store.dispatch(setOverride({ analysisId: id, precio })); this.editing.set(null); }
limpiarOverride(id: number) { this.store.dispatch(setOverride({ analysisId: id, precio: null })); }
```

Precios con `| currencyAr`. La nota/callout del mockup ("se configura en el lab, no en Obras Sociales") va en el template. Comentario en el componente: `// MOCK — el precio particular se persistirá vía coverages; hoy NomencladorService lo guarda en memoria.`

- [ ] **Step 4: Correr y verificar que pasa**

Run: `ng test --watch=false --include='**/nbu-particular-tab.component.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Build + commit**

```bash
npm run build
git add src/app/features/analitica/pages/nbu/nbu-particular-tab.component.ts src/app/features/analitica/pages/nbu/nbu-particular-tab.component.spec.ts
git commit -m "feat(analitica): tab Precio particular (valor U.B. + override, mock conectable)"
```

---

## Verificación final

- [ ] `npx vitest run` sobre `nomenclador.service.spec.ts` + `nomenclador.selectors.spec.ts` → verde.
- [ ] `ng test --watch=false` (specs de nbu) → verde.
- [ ] `npm run build` → exit 0.
- [ ] Revisión visual: ítem en Clínico → pantalla con tabs; catálogo muestra análisis REALES y al expandir trae determinaciones REALES; precio particular recalcula con valor U.B. y versión; override Manual / Sin U.B. funcionan.
- [ ] Grep de comentarios `MOCK` presentes en `nomenclador.service.ts` indicando cómo conectar #97/coverages.

## Self-Review (cobertura del spec)

- Pantalla en Clínico (ítem sidebar, gateado ANALITICA) → Task 3. ✅
- Opción B: catálogo + tab precio particular → Tasks 4-6. ✅
- Catálogo + determinaciones REALES (AnalysisService) → Task 1 (service) + Task 5 (expand). ✅
- Versiones NBU + cantidad_ub por versión + valor_ub + overrides MOCK comentado → Task 1 (service, comentarios `MOCK — PR #97`/`coverages`). ✅
- Fácil de integrar con #97: todo el límite mock/real aislado en `NomencladorService`; swap de cuerpos sin tocar store/componentes → Task 1. ✅
- Selector de versión compartido recalcula ambos tabs → Task 2 (selectores) + Task 4 (shell). ✅
- Precio derivado en selector (única fuente de la fórmula) → Task 2. ✅
- Construye sobre NbuComponent + store analitica existentes → Tasks 2,4. ✅
- Tests store/servicio (vitest) + componente (ng test) → cada task. ✅
- Fuera de alcance respetado (sin HTTP real, sin CRUD versiones, sin edición catálogo, sin ETag) → ✅.
- Consistencia de tipos: `CatalogRow`/`NbuVersion`/`ParticularPricing`/`Determination` y firmas del service usadas igual en store y componentes. ✅
