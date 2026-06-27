# Liquidaciones (frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Spec:** `docs/superpowers/specs/2026-06-27-liquidaciones-frontend-design.md`
> **Branch:** `feat/liquidaciones-frontend`

**Goal:** Darle UI al apartado de liquidaciones de obras sociales (listar, ver detalle, generar SIMPLE, informar/anular) consumiendo el módulo FINANCIERO existente.

**Architecture:** Feature dentro de `features/financiero/` (reemplaza el placeholder `liquidaciones`). NgRx clásico extendiendo el store financiero con un slice `liquidaciones`; API en un service nuevo `LiquidacionesApiService`; effects en una clase nueva `LiquidacionesEffects`. Pantallas: listado (ui-table + FilterBar + polling ETag/304), detalle (resumen + convenios + lifecycle dialogs), wizard de generación (2 pasos con preview de pendientes).

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico, PrimeNG, Vitest. Polling vía `PollingService` + `withPolling()` + `etagInterceptor`.

## Global Constraints

- Errores en UI: **español, user-friendly, sin leak de internals** (regla #4). Todo `HttpErrorResponse` pasa por un mapper.
- **Sin IDs en formularios**: OS por nombre (índice `insurerId→nombre`); nada de inputs de ID crudo.
- Refresco: **HTTP polling ETag/304**, intervalo **5s**, pausado con pestaña oculta — usar `PollingService` + `withPolling()` + `isNotModified()`. No `setInterval` propio.
- Gating: módulo `FINANCIERO` + `sectionGuard('FINANCIERO')` (heredado del padre). Mutaciones solo rol `ADMINISTRADOR`.
- Componentes: `OnPush`, `selectSignal` en componentes, NgRx clásico sin `@ngrx/entity`, mutations pessimistic.
- Reusar UI: `ui-table` (`DataTableComponent`), `ui-filter-bar` (`FilterBarComponent`), `ui-wizard-shell` (`WizardShellComponent`), `currencyAr` pipe, `NotificationService`, directiva `hasRole`.
- Base de endpoints: `/api/v1/financiero`. Estados settlement: `PENDING → INFORMED → BILLED`, `CANCELLED` desde PENDING/INFORMED.

---

### Task 1: Modelos + API service de liquidaciones

**Files:**
- Create: `src/app/features/financiero/models/liquidaciones.model.ts`
- Create: `src/app/features/financiero/services/liquidaciones-api.service.ts`
- Test: `src/app/features/financiero/services/liquidaciones-api.service.spec.ts`

**Interfaces:**
- Produces: tipos `SettlementStatus`, `SettlementType`, `SettlementSummary`, `SettlementDetail`, `SettlementPlan`, `SettlementAgreement`, `SettlementFilters`, `GenerateSettlementBody`, `InformSettlementBody`, `CancelSettlementBody`, `PendingService`; clase `LiquidacionesApiService` con métodos `listSettlements(f): Observable<SettlementSummary[] | NotModified>`, `getSettlement(id): Observable<SettlementDetail>`, `generateSettlement(body): Observable<SettlementDetail>`, `informSettlement(id, body): Observable<SettlementDetail>`, `cancelSettlement(id, body): Observable<void>`, `listPendingServices(): Observable<PendingService[] | NotModified>`.

- [ ] **Step 1: Crear el archivo de modelos**

Create `src/app/features/financiero/models/liquidaciones.model.ts`:

```typescript
// Tipos del módulo de liquidaciones (settlements) — contrato BE financiero (PR #108).

export type SettlementStatus = 'PENDING' | 'INFORMED' | 'BILLED' | 'CANCELLED';
export type SettlementType = 'SIMPLE' | 'ESPECIAL';

/** Fila del listado: GET /settlements. */
export interface SettlementSummary {
  id: number;
  insurerId: number;
  settlementNumber: number;
  status: SettlementStatus;
  type: SettlementType;
  periodFrom: string; // 'YYYY-MM-DD'
  periodTo: string;   // 'YYYY-MM-DD'
  createdAt: string;  // ISO datetime
}

export interface SettlementAgreement {
  agreementId: number;
  agreementSubtotal: number;
  providedServiceIds: number[];
  rules: unknown[];
}

export interface SettlementPlan {
  planId: number;
  agreements: SettlementAgreement[];
}

/** Detalle: GET /settlements/{id}. */
export interface SettlementDetail {
  id: number;
  insurerId: number;
  settlementNumber: number;
  status: SettlementStatus;
  type: SettlementType;
  periodFrom: string;
  periodTo: string;
  informedDate: string | null;
  informedAmount: number | null;
  paymentId: number | null;
  plans: SettlementPlan[];
  createdAt: string;
}

export interface SettlementFilters {
  insurerId?: number;
  from?: string; // 'YYYY-MM-DD'
  to?: string;   // 'YYYY-MM-DD'
  status?: SettlementStatus;
}

/** Body de POST /settlements (solo SIMPLE en v1). */
export interface GenerateSettlementBody {
  insurerId: number;
  period: { from: string; to: string };
  specialRules: [];
  excludedAnalysisIdsByPs: null;
}

export interface InformSettlementBody {
  informedDate: string; // 'YYYY-MM-DD'
  informedAmount: number;
  observations?: string;
}

export interface CancelSettlementBody {
  cancellationReason: string;
}

/** Prestación pendiente: GET /provided-services/pending. */
export interface PendingService {
  id: number;
  attentionId: number;
  planId: number;
  patientId: number;
  serviceDate: string; // 'YYYY-MM-DD'
  copaymentAmount: number;
  ivaPercentage: number;
  authorizationNumber: string | null;
  settlementAgreementId: number | null; // null = pendiente
  analysisIds: number[];
}

/** Etiquetas en español para los estados. */
export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: 'Pendiente',
  INFORMED: 'Informada',
  BILLED: 'Facturada',
  CANCELLED: 'Anulada',
};
```

- [ ] **Step 2: Escribir el spec del API service (falla primero)**

Create `src/app/features/financiero/services/liquidaciones-api.service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LiquidacionesApiService } from './liquidaciones-api.service';

describe('LiquidacionesApiService', () => {
  let api: LiquidacionesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LiquidacionesApiService],
    });
    api = TestBed.inject(LiquidacionesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('listSettlements arma los query params de los filtros presentes', () => {
    api.listSettlements({ insurerId: 7, status: 'PENDING', from: '2026-01-01' }).subscribe();
    const req = httpMock.expectOne(
      r => r.url === '/api/v1/financiero/settlements',
    );
    expect(req.request.params.get('insurerId')).toBe('7');
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBeNull();
    req.flush([]);
  });

  it('generateSettlement hace POST a /settlements con el body', () => {
    const body = { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [] as [], excludedAnalysisIdsByPs: null };
    api.generateSettlement(body).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('informSettlement hace PATCH a /settlements/{id}/inform', () => {
    api.informSettlement(5, { informedDate: '2026-02-01', informedAmount: 1000 }).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements/5/inform');
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('cancelSettlement hace PATCH a /settlements/{id}/cancel', () => {
    api.cancelSettlement(5, { cancellationReason: 'error de carga' }).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements/5/cancel');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cancellationReason: 'error de carga' });
    req.flush(null);
  });

  it('listPendingServices pega a /provided-services/pending', () => {
    api.listPendingServices().subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/provided-services/pending');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  afterEach(() => httpMock.verify());
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- --run liquidaciones-api.service`
Expected: FAIL ("Cannot find module './liquidaciones-api.service'").

- [ ] **Step 4: Implementar el API service**

Create `src/app/features/financiero/services/liquidaciones-api.service.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import {
  SettlementSummary, SettlementDetail, SettlementFilters,
  GenerateSettlementBody, InformSettlementBody, CancelSettlementBody, PendingService,
} from '../models/liquidaciones.model';

@Injectable({ providedIn: 'root' })
export class LiquidacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero';

  /** Listado polleable (ETag/304). */
  listSettlements(f: SettlementFilters): Observable<SettlementSummary[] | NotModified> {
    let params = new HttpParams();
    if (f.insurerId != null) params = params.set('insurerId', f.insurerId);
    if (f.from) params = params.set('from', f.from);
    if (f.to) params = params.set('to', f.to);
    if (f.status) params = params.set('status', f.status);
    return this.http.get<SettlementSummary[] | NotModified>(`${this.base}/settlements`, {
      params, context: withPolling(),
    });
  }

  getSettlement(id: number): Observable<SettlementDetail> {
    return this.http.get<SettlementDetail>(`${this.base}/settlements/${id}`);
  }

  generateSettlement(body: GenerateSettlementBody): Observable<SettlementDetail> {
    return this.http.post<SettlementDetail>(`${this.base}/settlements`, body);
  }

  informSettlement(id: number, body: InformSettlementBody): Observable<SettlementDetail> {
    return this.http.patch<SettlementDetail>(`${this.base}/settlements/${id}/inform`, body);
  }

  cancelSettlement(id: number, body: CancelSettlementBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/settlements/${id}/cancel`, body);
  }

  /** Prestaciones pendientes polleable (ETag/304, sin filtros). */
  listPendingServices(): Observable<PendingService[] | NotModified> {
    return this.http.get<PendingService[] | NotModified>(`${this.base}/provided-services/pending`, {
      context: withPolling(),
    });
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- --run liquidaciones-api.service`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/financiero/models/liquidaciones.model.ts src/app/features/financiero/services/liquidaciones-api.service.ts src/app/features/financiero/services/liquidaciones-api.service.spec.ts
git commit -m "feat(financiero): modelos + API service de liquidaciones"
```

---

### Task 2: Slice de store — state, actions, reducer, selectors

**Files:**
- Modify: `src/app/features/financiero/store/financiero.state.ts`
- Modify: `src/app/features/financiero/store/financiero.actions.ts`
- Modify: `src/app/features/financiero/store/financiero.reducer.ts`
- Modify: `src/app/features/financiero/store/financiero.selectors.ts`
- Test: `src/app/features/financiero/store/liquidaciones.reducer.spec.ts`
- Test: `src/app/features/financiero/store/liquidaciones.selectors.spec.ts`

**Interfaces:**
- Consumes: tipos de Task 1; `InsurerSummary` de `@features/obras-sociales/models/insurer.model`.
- Produces:
  - State slice `liquidaciones` dentro de `FinancieroState`.
  - Actions: `loadSettlements({ filters })`, `loadSettlementsSuccess({ items })`, `loadSettlementsNotModified()`, `loadSettlementsFailure({ error })`, `loadSettlement({ id })`, `loadSettlementSuccess({ settlement })`, `loadSettlementFailure({ error })`, `generateSettlement({ body })`, `generateSettlementSuccess({ settlement })`, `generateSettlementFailure({ error })`, `informSettlement({ id, body })`, `informSettlementSuccess({ settlement })`, `informSettlementFailure({ error })`, `cancelSettlement({ id, body })`, `cancelSettlementSuccess({ id })`, `cancelSettlementFailure({ error })`, `loadPendingServices()`, `loadPendingServicesSuccess({ items })`, `loadPendingServicesNotModified()`, `loadPendingServicesFailure({ error })`, `loadInsurersIndex()`, `loadInsurersIndexSuccess({ insurers })`, `loadInsurersIndexFailure({ error })`, `loadInsurerPlans({ insurerId })`, `loadInsurerPlansSuccess({ planIds })`, `loadInsurerPlansFailure({ error })`.
  - Selectors: `selectLiqList`, `selectLiqListLoading`, `selectLiqListError`, `selectLiqSelected`, `selectLiqDetailLoading`, `selectLiqDetailError`, `selectLiqGenerating`, `selectLiqGenerateError`, `selectLiqLifecycleInProgress`, `selectLiqLifecycleError`, `selectLiqPending`, `selectLiqPendingLoading`, `selectLiqInsurers`, `selectLiqInsurersIndex` (→ `Map<number,string>`), `selectLiqInsurerPlanIds`.

- [ ] **Step 1: Extender el state**

In `src/app/features/financiero/store/financiero.state.ts`, add the import and the slice. After the existing `RegisterPaymentResponse` import line, add:

```typescript
import { SettlementSummary, SettlementDetail, PendingService } from '../models/liquidaciones.model';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';
```

Add to the `FinancieroState` interface (new property after `config`):

```typescript
  liquidaciones: {
    list: SettlementSummary[]; listLoading: boolean; listError: string | null;
    selected: SettlementDetail | null; detailLoading: boolean; detailError: string | null;
    generating: boolean; generateError: string | null;
    lifecycleInProgress: boolean; lifecycleError: string | null;
    pending: PendingService[]; pendingLoading: boolean;
    insurers: InsurerSummary[];
    selectedInsurerPlanIds: number[];
  };
```

Add to `initialFinancieroState` (new property after `config`):

```typescript
  liquidaciones: {
    list: [], listLoading: false, listError: null,
    selected: null, detailLoading: false, detailError: null,
    generating: false, generateError: null,
    lifecycleInProgress: false, lifecycleError: null,
    pending: [], pendingLoading: false,
    insurers: [],
    selectedInsurerPlanIds: [],
  },
```

- [ ] **Step 2: Agregar las actions**

Append to `src/app/features/financiero/store/financiero.actions.ts`. First extend the model import at the top to also import the liquidaciones types (add a new import line):

```typescript
import {
  SettlementSummary, SettlementDetail, SettlementFilters, PendingService,
  GenerateSettlementBody, InformSettlementBody, CancelSettlementBody,
} from '../models/liquidaciones.model';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';
```

Then append the actions at the end of the file:

```typescript
// ── Liquidaciones: listar (polleable ETag/304) ───────────────────────────────
export const loadSettlements = createAction(
  '[Liquidaciones] Load Settlements', props<{ filters: SettlementFilters }>());
export const loadSettlementsSuccess = createAction(
  '[Liquidaciones API] Load Settlements Success', props<{ items: SettlementSummary[] }>());
export const loadSettlementsNotModified = createAction(
  '[Liquidaciones API] Load Settlements Not Modified');
export const loadSettlementsFailure = createAction(
  '[Liquidaciones API] Load Settlements Failure', props<{ error: string }>());

// ── Liquidaciones: detalle ───────────────────────────────────────────────────
export const loadSettlement = createAction(
  '[Liquidaciones] Load Settlement', props<{ id: number }>());
export const loadSettlementSuccess = createAction(
  '[Liquidaciones API] Load Settlement Success', props<{ settlement: SettlementDetail }>());
export const loadSettlementFailure = createAction(
  '[Liquidaciones API] Load Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: generar (SIMPLE) ──────────────────────────────────────────
export const generateSettlement = createAction(
  '[Liquidaciones] Generate Settlement', props<{ body: GenerateSettlementBody }>());
export const generateSettlementSuccess = createAction(
  '[Liquidaciones API] Generate Settlement Success', props<{ settlement: SettlementDetail }>());
export const generateSettlementFailure = createAction(
  '[Liquidaciones API] Generate Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: informar ──────────────────────────────────────────────────
export const informSettlement = createAction(
  '[Liquidaciones] Inform Settlement', props<{ id: number; body: InformSettlementBody }>());
export const informSettlementSuccess = createAction(
  '[Liquidaciones API] Inform Settlement Success', props<{ settlement: SettlementDetail }>());
export const informSettlementFailure = createAction(
  '[Liquidaciones API] Inform Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: anular ────────────────────────────────────────────────────
export const cancelSettlement = createAction(
  '[Liquidaciones] Cancel Settlement', props<{ id: number; body: CancelSettlementBody }>());
export const cancelSettlementSuccess = createAction(
  '[Liquidaciones API] Cancel Settlement Success', props<{ id: number }>());
export const cancelSettlementFailure = createAction(
  '[Liquidaciones API] Cancel Settlement Failure', props<{ error: string }>());

// ── Liquidaciones: prestaciones pendientes (polleable ETag/304) ──────────────
export const loadPendingServices = createAction('[Liquidaciones] Load Pending Services');
export const loadPendingServicesSuccess = createAction(
  '[Liquidaciones API] Load Pending Services Success', props<{ items: PendingService[] }>());
export const loadPendingServicesNotModified = createAction(
  '[Liquidaciones API] Load Pending Services Not Modified');
export const loadPendingServicesFailure = createAction(
  '[Liquidaciones API] Load Pending Services Failure', props<{ error: string }>());

// ── Liquidaciones: índice de OS (id→nombre) ──────────────────────────────────
export const loadInsurersIndex = createAction('[Liquidaciones] Load Insurers Index');
export const loadInsurersIndexSuccess = createAction(
  '[Liquidaciones API] Load Insurers Index Success', props<{ insurers: InsurerSummary[] }>());
export const loadInsurersIndexFailure = createAction(
  '[Liquidaciones API] Load Insurers Index Failure', props<{ error: string }>());

// ── Liquidaciones: planes de la OS elegida (para preview de pendientes) ───────
export const loadInsurerPlans = createAction(
  '[Liquidaciones] Load Insurer Plans', props<{ insurerId: number }>());
export const loadInsurerPlansSuccess = createAction(
  '[Liquidaciones API] Load Insurer Plans Success', props<{ planIds: number[] }>());
export const loadInsurerPlansFailure = createAction(
  '[Liquidaciones API] Load Insurer Plans Failure', props<{ error: string }>());
```

- [ ] **Step 3: Escribir el spec del reducer (falla primero)**

Create `src/app/features/financiero/store/liquidaciones.reducer.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { financieroReducer } from './financiero.reducer';
import { initialFinancieroState } from './financiero.state';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlementSuccess, generateSettlement, generateSettlementFailure,
  cancelSettlementSuccess, loadInsurerPlansSuccess,
} from './financiero.actions';
import { SettlementSummary, SettlementDetail } from '../models/liquidaciones.model';

const summary: SettlementSummary = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', createdAt: '2026-02-01T10:00:00',
};
const detail: SettlementDetail = {
  ...summary, informedDate: null, informedAmount: null, paymentId: null, plans: [],
};

describe('financieroReducer — slice liquidaciones', () => {
  it('loadSettlements prende listLoading y limpia error', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlements({ filters: {} }));
    expect(s.liquidaciones.listLoading).toBe(true);
    expect(s.liquidaciones.listError).toBeNull();
  });

  it('loadSettlementsSuccess guarda la lista y apaga loading', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementsSuccess({ items: [summary] }));
    expect(s.liquidaciones.list).toEqual([summary]);
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementsNotModified solo apaga loading sin tocar la lista', () => {
    const seeded = financieroReducer(initialFinancieroState, loadSettlementsSuccess({ items: [summary] }));
    const loading = financieroReducer(seeded, loadSettlements({ filters: {} }));
    const s = financieroReducer(loading, loadSettlementsNotModified());
    expect(s.liquidaciones.list).toEqual([summary]);
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementsFailure guarda el error', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementsFailure({ error: 'boom' }));
    expect(s.liquidaciones.listError).toBe('boom');
    expect(s.liquidaciones.listLoading).toBe(false);
  });

  it('loadSettlementSuccess guarda el detalle seleccionado', () => {
    const s = financieroReducer(initialFinancieroState, loadSettlementSuccess({ settlement: detail }));
    expect(s.liquidaciones.selected).toEqual(detail);
    expect(s.liquidaciones.detailLoading).toBe(false);
  });

  it('generateSettlement prende generating; failure lo apaga y guarda error', () => {
    const gen = financieroReducer(initialFinancieroState, generateSettlement({ body: { insurerId: 7, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    expect(gen.liquidaciones.generating).toBe(true);
    const fail = financieroReducer(gen, generateSettlementFailure({ error: 'sin pendientes' }));
    expect(fail.liquidaciones.generating).toBe(false);
    expect(fail.liquidaciones.generateError).toBe('sin pendientes');
  });

  it('cancelSettlementSuccess apaga lifecycleInProgress', () => {
    const s = financieroReducer(initialFinancieroState, cancelSettlementSuccess({ id: 1 }));
    expect(s.liquidaciones.lifecycleInProgress).toBe(false);
  });

  it('loadInsurerPlansSuccess guarda los planIds de la OS elegida', () => {
    const s = financieroReducer(initialFinancieroState, loadInsurerPlansSuccess({ planIds: [3, 4] }));
    expect(s.liquidaciones.selectedInsurerPlanIds).toEqual([3, 4]);
  });
});
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `npm test -- --run liquidaciones.reducer`
Expected: FAIL (el reducer todavía no maneja las nuevas actions → `selected`/`generating` indefinidos o sin cambios).

- [ ] **Step 5: Extender el reducer**

In `src/app/features/financiero/store/financiero.reducer.ts`, add to the actions import list (the big `from './financiero.actions'` block) all the new action names:

```typescript
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlement, loadSettlementSuccess, loadSettlementFailure,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
  informSettlement, informSettlementSuccess, informSettlementFailure,
  cancelSettlement, cancelSettlementSuccess, cancelSettlementFailure,
  loadPendingServices, loadPendingServicesSuccess, loadPendingServicesFailure,
  loadInsurersIndexSuccess, loadInsurerPlansSuccess,
```

Then add these `on(...)` handlers before the closing `);` of `createReducer`:

```typescript
  // ── liquidaciones: listar ──────────────────────────────────────────────────
  on(loadSettlements, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: true, listError: null },
  })),
  on(loadSettlementsSuccess, (state, { items }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, list: items, listLoading: false, listError: null },
  })),
  on(loadSettlementsNotModified, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: false },
  })),
  on(loadSettlementsFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, listLoading: false, listError: error },
  })),

  // ── liquidaciones: detalle ─────────────────────────────────────────────────
  on(loadSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, detailLoading: true, detailError: null },
  })),
  on(loadSettlementSuccess, (state, { settlement }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selected: settlement, detailLoading: false, detailError: null },
  })),
  on(loadSettlementFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, detailLoading: false, detailError: error },
  })),

  // ── liquidaciones: generar ─────────────────────────────────────────────────
  on(generateSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: true, generateError: null },
  })),
  on(generateSettlementSuccess, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: false, generateError: null },
  })),
  on(generateSettlementFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, generating: false, generateError: error },
  })),

  // ── liquidaciones: informar / anular (lifecycle) ───────────────────────────
  on(informSettlement, cancelSettlement, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: true, lifecycleError: null },
  })),
  on(informSettlementSuccess, (state, { settlement }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selected: settlement, lifecycleInProgress: false, lifecycleError: null },
  })),
  on(cancelSettlementSuccess, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: false, lifecycleError: null },
  })),
  on(informSettlementFailure, cancelSettlementFailure, (state, { error }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, lifecycleInProgress: false, lifecycleError: error },
  })),

  // ── liquidaciones: pendientes ──────────────────────────────────────────────
  on(loadPendingServices, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pendingLoading: true },
  })),
  on(loadPendingServicesSuccess, (state, { items }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pending: items, pendingLoading: false },
  })),
  on(loadPendingServicesFailure, (state): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, pendingLoading: false },
  })),

  // ── liquidaciones: índice de OS + planes de la OS elegida ──────────────────
  on(loadInsurersIndexSuccess, (state, { insurers }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, insurers },
  })),
  on(loadInsurerPlansSuccess, (state, { planIds }): FinancieroState => ({
    ...state, liquidaciones: { ...state.liquidaciones, selectedInsurerPlanIds: planIds },
  })),
```

> Nota: `loadPendingServicesNotModified`, `informSettlementSuccess` reload, etc. se manejan en effects (Task 3); el reducer no necesita `NotModified` para pending porque el preview se recalcula sobre `pending` ya cargado.

- [ ] **Step 6: Correr el test del reducer y verificar que pasa**

Run: `npm test -- --run liquidaciones.reducer`
Expected: PASS (8 tests).

- [ ] **Step 7: Escribir el spec de selectors (falla primero)**

Create `src/app/features/financiero/store/liquidaciones.selectors.spec.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { initialFinancieroState } from './financiero.state';
import { FINANCIERO_FEATURE_KEY } from './financiero.state';
import {
  selectLiqList, selectLiqInsurersIndex, selectLiqInsurerPlanIds,
} from './financiero.selectors';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

const insurer: InsurerSummary = {
  id: 7, code: 'OS7', acronym: 'OS', name: 'IOMA', insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true,
};

function root(partial: Partial<typeof initialFinancieroState.liquidaciones>) {
  return { [FINANCIERO_FEATURE_KEY]: { ...initialFinancieroState, liquidaciones: { ...initialFinancieroState.liquidaciones, ...partial } } };
}

describe('selectors de liquidaciones', () => {
  it('selectLiqList devuelve la lista', () => {
    expect(selectLiqList(root({ list: [] }))).toEqual([]);
  });

  it('selectLiqInsurersIndex arma un Map id→nombre', () => {
    const map = selectLiqInsurersIndex(root({ insurers: [insurer] }));
    expect(map.get(7)).toBe('IOMA');
  });

  it('selectLiqInsurerPlanIds devuelve los planIds de la OS elegida', () => {
    expect(selectLiqInsurerPlanIds(root({ selectedInsurerPlanIds: [3, 4] }))).toEqual([3, 4]);
  });
});
```

- [ ] **Step 8: Correr el test y verificar que falla**

Run: `npm test -- --run liquidaciones.selectors`
Expected: FAIL ("selectLiqList is not exported").

- [ ] **Step 9: Agregar los selectors**

Append to `src/app/features/financiero/store/financiero.selectors.ts`:

```typescript
// ── Liquidaciones ─────────────────────────────────────────────────────────────
export const selectLiqSlice = createSelector(selectFinancieroState, s => s.liquidaciones);

export const selectLiqList = createSelector(selectLiqSlice, l => l.list);
export const selectLiqListLoading = createSelector(selectLiqSlice, l => l.listLoading);
export const selectLiqListError = createSelector(selectLiqSlice, l => l.listError);

export const selectLiqSelected = createSelector(selectLiqSlice, l => l.selected);
export const selectLiqDetailLoading = createSelector(selectLiqSlice, l => l.detailLoading);
export const selectLiqDetailError = createSelector(selectLiqSlice, l => l.detailError);

export const selectLiqGenerating = createSelector(selectLiqSlice, l => l.generating);
export const selectLiqGenerateError = createSelector(selectLiqSlice, l => l.generateError);

export const selectLiqLifecycleInProgress = createSelector(selectLiqSlice, l => l.lifecycleInProgress);
export const selectLiqLifecycleError = createSelector(selectLiqSlice, l => l.lifecycleError);

export const selectLiqPending = createSelector(selectLiqSlice, l => l.pending);
export const selectLiqPendingLoading = createSelector(selectLiqSlice, l => l.pendingLoading);

export const selectLiqInsurers = createSelector(selectLiqSlice, l => l.insurers);

/** Map insurerId → nombre, para resolver nombres sin exponer IDs. */
export const selectLiqInsurersIndex = createSelector(
  selectLiqInsurers,
  insurers => new Map<number, string>(insurers.map(i => [i.id, i.name])),
);

export const selectLiqInsurerPlanIds = createSelector(selectLiqSlice, l => l.selectedInsurerPlanIds);
```

- [ ] **Step 10: Correr los tests del slice y verificar que pasan**

Run: `npm test -- --run liquidaciones.selectors liquidaciones.reducer`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/app/features/financiero/store/
git commit -m "feat(financiero): slice de store para liquidaciones (state/actions/reducer/selectors)"
```

---

### Task 3: Effects de liquidaciones

**Files:**
- Create: `src/app/features/financiero/store/liquidaciones.effects.ts`
- Modify: `src/app/app.config.ts` (registrar `LiquidacionesEffects`)
- Test: `src/app/features/financiero/store/liquidaciones.effects.spec.ts`

**Interfaces:**
- Consumes: `LiquidacionesApiService` (Task 1), actions/selectors (Task 2), `ObraSocialService` de `@features/obras-sociales/services/obra-social.service`, `NotificationService`, `isNotModified` de `@core/refresh`.
- Produces: clase `LiquidacionesEffects` y su registro en `app.config.ts`.

- [ ] **Step 1: Escribir el spec de effects (falla primero)**

Create `src/app/features/financiero/store/liquidaciones.effects.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { LiquidacionesEffects } from './liquidaciones.effects';
import { LiquidacionesApiService } from '../services/liquidaciones-api.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
} from './financiero.actions';
import { NOT_MODIFIED } from '@core/refresh';

describe('LiquidacionesEffects', () => {
  let actions$: Observable<unknown>;
  let api: { listSettlements: ReturnType<typeof vi.fn>; generateSettlement: ReturnType<typeof vi.fn> };
  let notif: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  function make(action: unknown) {
    actions$ = of(action);
    TestBed.configureTestingModule({
      providers: [
        LiquidacionesEffects,
        provideMockActions(() => actions$),
        { provide: LiquidacionesApiService, useValue: api },
        { provide: ObraSocialService, useValue: { search: vi.fn(), getCompleteById: vi.fn() } },
        { provide: NotificationService, useValue: notif },
      ],
    });
    return TestBed.inject(LiquidacionesEffects);
  }

  beforeEach(() => {
    api = { listSettlements: vi.fn(), generateSettlement: vi.fn() };
    notif = { success: vi.fn(), error: vi.fn() };
  });

  it('loadSettlements$ emite Success con los items', async () => {
    api.listSettlements.mockReturnValue(of([{ id: 1 }]));
    const eff = make(loadSettlements({ filters: {} }));
    const out = await new Promise(r => eff.loadSettlements$.subscribe(r));
    expect(out).toEqual(loadSettlementsSuccess({ items: [{ id: 1 } as never] }));
  });

  it('loadSettlements$ emite NotModified cuando vuelve 304', async () => {
    api.listSettlements.mockReturnValue(of(NOT_MODIFIED));
    const eff = make(loadSettlements({ filters: {} }));
    const out = await new Promise(r => eff.loadSettlements$.subscribe(r));
    expect(out).toEqual(loadSettlementsNotModified());
  });

  it('generateSettlement$ con 422 emite Failure con mensaje en español y toast', async () => {
    api.generateSettlement.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422 })));
    const eff = make(generateSettlement({ body: { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    const out = await new Promise(r => eff.generateSettlement$.subscribe(r)) as ReturnType<typeof generateSettlementFailure>;
    expect(out.type).toBe(generateSettlementFailure.type);
    expect(out.error).toContain('No hay prestaciones pendientes');
    expect(notif.error).toHaveBeenCalled();
  });

  it('generateSettlement$ con éxito emite Success y toast', async () => {
    api.generateSettlement.mockReturnValue(of({ id: 9 }));
    const eff = make(generateSettlement({ body: { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [], excludedAnalysisIdsByPs: null } }));
    const out = await new Promise(r => eff.generateSettlement$.subscribe(r));
    expect(out).toEqual(generateSettlementSuccess({ settlement: { id: 9 } as never }));
    expect(notif.success).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run liquidaciones.effects`
Expected: FAIL ("Cannot find module './liquidaciones.effects'").

- [ ] **Step 3: Implementar los effects**

Create `src/app/features/financiero/store/liquidaciones.effects.ts`:

```typescript
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, concatMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { isNotModified } from '@core/refresh';
import { NotificationService } from '@core/services/notification.service';
import { LiquidacionesApiService } from '../services/liquidaciones-api.service';
import { ObraSocialService } from '@features/obras-sociales/services/obra-social.service';
import {
  loadSettlements, loadSettlementsSuccess, loadSettlementsNotModified, loadSettlementsFailure,
  loadSettlement, loadSettlementSuccess, loadSettlementFailure,
  generateSettlement, generateSettlementSuccess, generateSettlementFailure,
  informSettlement, informSettlementSuccess, informSettlementFailure,
  cancelSettlement, cancelSettlementSuccess, cancelSettlementFailure,
  loadPendingServices, loadPendingServicesSuccess, loadPendingServicesNotModified, loadPendingServicesFailure,
  loadInsurersIndex, loadInsurersIndexSuccess, loadInsurersIndexFailure,
  loadInsurerPlans, loadInsurerPlansSuccess, loadInsurerPlansFailure,
} from './financiero.actions';

function mapLoadError(): string {
  return 'No se pudieron cargar las liquidaciones. Probá de nuevo.';
}

function mapGenerateError(e: HttpErrorResponse): string {
  if (e.status === 422) return 'No hay prestaciones pendientes para esa obra social y período.';
  if (e.status === 409) return 'Ya existe una liquidación para esa obra social y ese período.';
  return 'No se pudo generar la liquidación. Probá de nuevo.';
}

function mapLifecycleError(e: HttpErrorResponse, accion: 'informar' | 'anular'): string {
  if (e.status === 404) return 'La liquidación no existe.';
  if (e.status === 422) {
    return accion === 'informar'
      ? 'No se puede informar la liquidación en su estado actual.'
      : 'No se puede anular la liquidación en su estado actual.';
  }
  return 'No se pudo completar la acción sobre la liquidación. Probá de nuevo.';
}

@Injectable()
export class LiquidacionesEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(LiquidacionesApiService);
  private readonly os = inject(ObraSocialService);
  private readonly notif = inject(NotificationService);

  loadSettlements$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSettlements),
      switchMap(({ filters }) =>
        this.api.listSettlements(filters).pipe(
          map(res => isNotModified(res)
            ? loadSettlementsNotModified()
            : loadSettlementsSuccess({ items: res })),
          catchError(() => of(loadSettlementsFailure({ error: mapLoadError() }))),
        ),
      ),
    ),
  );

  loadSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadSettlement),
      switchMap(({ id }) =>
        this.api.getSettlement(id).pipe(
          map(settlement => loadSettlementSuccess({ settlement })),
          catchError((e: HttpErrorResponse) => of(loadSettlementFailure({
            error: e.status === 404 ? 'La liquidación no existe.' : 'No se pudo cargar la liquidación.',
          }))),
        ),
      ),
    ),
  );

  generateSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(generateSettlement),
      concatMap(({ body }) =>
        this.api.generateSettlement(body).pipe(
          map(settlement => {
            this.notif.success('Liquidación generada.');
            return generateSettlementSuccess({ settlement });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapGenerateError(e);
            this.notif.error(error);
            return of(generateSettlementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  informSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(informSettlement),
      concatMap(({ id, body }) =>
        this.api.informSettlement(id, body).pipe(
          map(settlement => {
            this.notif.success('Liquidación informada.');
            return informSettlementSuccess({ settlement });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapLifecycleError(e, 'informar');
            this.notif.error(error);
            return of(informSettlementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  cancelSettlement$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cancelSettlement),
      concatMap(({ id, body }) =>
        this.api.cancelSettlement(id, body).pipe(
          map(() => {
            this.notif.success('Liquidación anulada.');
            return cancelSettlementSuccess({ id });
          }),
          catchError((e: HttpErrorResponse) => {
            const error = mapLifecycleError(e, 'anular');
            this.notif.error(error);
            return of(cancelSettlementFailure({ error }));
          }),
        ),
      ),
    ),
  );

  /** Tras informar o anular, recargamos el detalle para reflejar el nuevo estado. */
  reloadAfterLifecycle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(informSettlementSuccess, cancelSettlementSuccess),
      map(action => 'settlement' in action
        ? loadSettlement({ id: action.settlement.id })
        : loadSettlement({ id: action.id })),
    ),
  );

  loadPendingServices$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPendingServices),
      switchMap(() =>
        this.api.listPendingServices().pipe(
          map(res => isNotModified(res)
            ? loadPendingServicesNotModified()
            : loadPendingServicesSuccess({ items: res })),
          catchError(() => of(loadPendingServicesFailure({ error: 'No se pudieron cargar las prestaciones pendientes.' }))),
        ),
      ),
    ),
  );

  loadInsurersIndex$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsurersIndex),
      switchMap(() =>
        this.os.search({ state: 'active', page: 0, size: 500 }).pipe(
          map(res => loadInsurersIndexSuccess({ insurers: res.content })),
          catchError(() => of(loadInsurersIndexFailure({ error: 'No se pudieron cargar las obras sociales.' }))),
        ),
      ),
    ),
  );

  loadInsurerPlans$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadInsurerPlans),
      switchMap(({ insurerId }) =>
        this.os.getCompleteById(insurerId).pipe(
          map(complete => loadInsurerPlansSuccess({ planIds: complete.plans.map(p => p.id) })),
          catchError(() => of(loadInsurerPlansFailure({ error: 'No se pudieron cargar los planes de la obra social.' }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Registrar el effect en app.config.ts**

In `src/app/app.config.ts`, add the import near the other financiero imports (after line 55):

```typescript
import { LiquidacionesEffects } from '@features/financiero/store/liquidaciones.effects';
```

And add the registration right after `provideEffects(FinancieroEffects),` (line 137):

```typescript
    provideEffects(LiquidacionesEffects),
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- --run liquidaciones.effects`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/financiero/store/liquidaciones.effects.ts src/app/features/financiero/store/liquidaciones.effects.spec.ts src/app/app.config.ts
git commit -m "feat(financiero): effects de liquidaciones + registro en app.config"
```

---

### Task 4: Rutas + tab en el shell

**Files:**
- Modify: `src/app/features/financiero/financiero.routes.ts`
- Modify: `src/app/features/financiero/financiero-shell/financiero-shell.component.ts`

**Interfaces:**
- Consumes: las pages de Tasks 5-7 (rutas a `LiquidacionesListPage`, `LiquidacionDetallePage`, `GenerarLiquidacionPage`).
- Produces: rutas `liquidaciones`, `liquidaciones/nueva`, `liquidaciones/:id`; tab "Liquidaciones" en el shell.

> Nota: esta task se implementa **después** de tener las pages (5-7), o se deja el import apuntando a archivos que se crean en esas tasks. En subagent-driven, ejecutar Task 4 al final. Para mantener el plan lineal, las rutas se agregan acá pero el `npm run build` recién cierra al terminar Task 7.

- [ ] **Step 1: Reemplazar el placeholder por las rutas reales**

In `src/app/features/financiero/financiero.routes.ts`, replace the `liquidaciones` placeholder route block:

```typescript
      {
        path: 'liquidaciones',
        loadComponent: () =>
          import('./pages/placeholder/modulo-no-disponible.component').then(
            (m) => m.ModuloNoDisponibleComponent,
          ),
        data: { kind: 'liquidaciones' },
      },
```

with:

```typescript
      {
        path: 'liquidaciones',
        loadComponent: () =>
          import('./pages/liquidaciones/liquidaciones-list.page').then(
            (m) => m.LiquidacionesListPage,
          ),
      },
      {
        path: 'liquidaciones/nueva',
        loadComponent: () =>
          import('./pages/liquidaciones/generar-liquidacion.page').then(
            (m) => m.GenerarLiquidacionPage,
          ),
      },
      {
        path: 'liquidaciones/:id',
        loadComponent: () =>
          import('./pages/liquidaciones/liquidacion-detalle.page').then(
            (m) => m.LiquidacionDetallePage,
          ),
      },
```

- [ ] **Step 2: Agregar el tab en el shell**

In `src/app/features/financiero/financiero-shell/financiero-shell.component.ts`, add a nav link after the "Cobros" link (before the `<ng-template hasRole="SAAS_ADMIN">` block):

```html
      <a routerLink="liquidaciones" routerLinkActive="is-active" role="tab">
        <i class="pi pi-chart-line"></i> Liquidaciones
      </a>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/financiero/financiero.routes.ts src/app/features/financiero/financiero-shell/financiero-shell.component.ts
git commit -m "feat(financiero): rutas y tab de liquidaciones (reemplaza placeholder)"
```

---

### Task 5: Pantalla Listado

**Files:**
- Create: `src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.ts`
- Create: `src/app/features/financiero/components/estado-liquidacion-pill.component.ts`
- Test: `src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.spec.ts`

**Interfaces:**
- Consumes: selectors `selectLiqList`, `selectLiqListLoading`, `selectLiqListError`, `selectLiqInsurersIndex`; actions `loadSettlements`, `loadInsurersIndex`; `PollingService`; `TokenService`; `DataTableComponent`, `FilterBarComponent`, `CurrencyArPipe`, `EstadoLiquidacionPillComponent`.
- Produces: `LiquidacionesListPage`, `EstadoLiquidacionPillComponent`.

- [ ] **Step 1: Crear el pill de estado**

Create `src/app/features/financiero/components/estado-liquidacion-pill.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SettlementStatus, SETTLEMENT_STATUS_LABELS } from '../models/liquidaciones.model';

@Component({
  selector: 'fin-estado-liquidacion-pill',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="liq-pill" [class]="'liq-pill--' + status()">{{ label() }}</span>`,
  styles: [`
    .liq-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .liq-pill--PENDING   { background: #fcf1dd; color: #b5740c; }
    .liq-pill--INFORMED  { background: #e0effe; color: #1d4ed8; }
    .liq-pill--BILLED    { background: #e3f6ec; color: #0f8a55; }
    .liq-pill--CANCELLED { background: #f1f5f9; color: #64748b; }
  `],
})
export class EstadoLiquidacionPillComponent {
  readonly status = input.required<SettlementStatus>();
  protected readonly label = computed(() => SETTLEMENT_STATUS_LABELS[this.status()]);
}
```

- [ ] **Step 2: Escribir el smoke spec (falla primero)**

Create `src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LiquidacionesListPage } from './liquidaciones-list.page';
import {
  selectLiqList, selectLiqListLoading, selectLiqListError, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { PollingService } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';

describe('LiquidacionesListPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiquidacionesListPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({
          selectors: [
            { selector: selectLiqList, value: [
              { id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE', periodFrom: '2026-01-01', periodTo: '2026-01-31', createdAt: '2026-02-01T10:00:00' },
            ] },
            { selector: selectLiqListLoading, value: false },
            { selector: selectLiqListError, value: null },
            { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
          ],
        }),
        { provide: PollingService, useValue: { startPolling: () => ({ stop: vi.fn(), pokeNow: vi.fn(), setActive: vi.fn() }) } },
        { provide: TokenService, useValue: { getRoles: () => ['ADMINISTRADOR'] } },
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('renderiza una fila por liquidación', () => {
    const fixture = TestBed.createComponent(LiquidacionesListPage);
    fixture.detectChanges();
    const rows = fixture.debugElement.queryAll(By.css('[data-testid^="row-"]'));
    expect(rows.length).toBe(1);
  });

  it('muestra el botón Generar cuando el rol es ADMINISTRADOR', () => {
    const fixture = TestBed.createComponent(LiquidacionesListPage);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('[data-testid="btn-generar"]'));
    expect(btn).toBeTruthy();
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npm test -- --run liquidaciones-list.page`
Expected: FAIL ("Cannot find module './liquidaciones-list.page'").

- [ ] **Step 4: Implementar la page del listado**

Create `src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.ts`:

```typescript
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { DataTableComponent } from '@shared/ui/components/data-table/data-table.component';
import { UiCellDirective } from '@shared/ui/components/data-table/ui-cell.directive';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import {
  FilterBarComponent, FilterBarConfig, FilterBarValue,
} from '@shared/ui/components/filter-bar/filter-bar.component';
import { TableColumn } from '@shared/ui/models/table-column.model';
import { PollingService, PollingHandle } from '@core/refresh';
import { TokenService } from '@core/auth/token.service';

import {
  selectLiqList, selectLiqListLoading, selectLiqListError, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { loadSettlements, loadInsurersIndex } from '../../store/financiero.actions';
import { SettlementSummary, SettlementStatus } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';

@Component({
  selector: 'fin-liquidaciones-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, PageHeaderComponent, DataTableComponent, UiCellDirective,
    EmptyStateComponent, FilterBarComponent, EstadoLiquidacionPillComponent,
  ],
  template: `
    <div class="fin-liq-list">
      <ui-page-header
        heading="Liquidaciones"
        subtitle="Liquidaciones de prestaciones a obras sociales.">
        @if (isAdmin()) {
          <button class="fin-btn fin-btn--primary" type="button" data-testid="btn-generar" (click)="irAGenerar()">
            <i class="pi pi-plus"></i> Generar liquidación
          </button>
        }
      </ui-page-header>

      <ui-filter-bar [config]="filterConfig()" (valueChange)="onFilter($event)" />

      @if (error()) {
        <ui-empty-state
          icon="pi-exclamation-circle"
          heading="No se pudieron cargar las liquidaciones"
          [description]="error()!"
          ctaLabel="Reintentar"
          (ctaClick)="recargar()" />
      } @else {
        <ui-table
          [value]="filtered()"
          [columns]="columns"
          [loading]="loading()"
          [showView]="true"
          emptyHeading="Todavía no hay liquidaciones"
          emptyIcon="pi-chart-line"
          emptyDescription="Cuando generes una liquidación para una obra social, va a aparecer acá con su estado."
          (view)="verDetalle($any($event))">

          <ng-template uiCell="settlementNumber" let-row>
            <span class="liq-num">N° {{ row.settlementNumber }}</span>
          </ng-template>

          <ng-template uiCell="insurerId" let-row>
            {{ insurers().get(row.insurerId) ?? 'Obra social' }}
          </ng-template>

          <ng-template uiCell="type" let-row>
            <span class="liq-type">{{ row.type === 'SIMPLE' ? 'Simple' : 'Especial' }}</span>
          </ng-template>

          <ng-template uiCell="periodFrom" let-row>
            {{ row.periodFrom | date:'dd/MM/yy' }} – {{ row.periodTo | date:'dd/MM/yy' }}
          </ng-template>

          <ng-template uiCell="status" let-row>
            <fin-estado-liquidacion-pill [status]="row.status" />
          </ng-template>

          <ng-template uiCell="createdAt" let-row>
            {{ row.createdAt | date:'dd/MM/yy HH:mm' }}
          </ng-template>
        </ui-table>
      }
    </div>
  `,
  styles: [`
    .fin-liq-list { display: flex; flex-direction: column; gap: 14px; }
    .fin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 7px; font-size: 13.5px; font-weight: 500; cursor: pointer; border: none; }
    .fin-btn--primary { background: var(--p-primary-color, #4f46e5); color: #fff; }
    .fin-btn--primary:hover { filter: brightness(0.92); }
    .liq-num { font-weight: 600; }
    .liq-type { font-size: 12.5px; color: #64748b; }
  `],
})
export class LiquidacionesListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly polling = inject(PollingService);
  private readonly destroy = inject(DestroyRef);
  private readonly tokens = inject(TokenService);

  readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));

  protected readonly list = this.store.selectSignal(selectLiqList);
  protected readonly loading = this.store.selectSignal(selectLiqListLoading);
  protected readonly error = this.store.selectSignal(selectLiqListError);
  protected readonly insurers = this.store.selectSignal(selectLiqInsurersIndex);

  protected readonly filterValue = signal<FilterBarValue>({ search: '' });

  protected readonly columns: readonly TableColumn[] = [
    { field: 'settlementNumber', header: 'N°' },
    { field: 'insurerId', header: 'Obra Social' },
    { field: 'type', header: 'Tipo' },
    { field: 'periodFrom', header: 'Período' },
    { field: 'status', header: 'Estado' },
    { field: 'createdAt', header: 'Creada', align: 'right' },
  ];

  protected readonly filterConfig = computed<FilterBarConfig>(() => ({
    searchPlaceholder: 'Buscar por N° u obra social…',
    selects: [
      {
        key: 'status', label: 'Estado',
        options: [
          { value: 'PENDING', label: 'Pendiente', color: '#b5740c' },
          { value: 'INFORMED', label: 'Informada', color: '#1d4ed8' },
          { value: 'BILLED', label: 'Facturada', color: '#0f8a55' },
          { value: 'CANCELLED', label: 'Anulada', color: '#64748b' },
        ],
      },
    ],
  }));

  /** Filtrado client-side sobre la lista ya cargada (search + estados). */
  protected readonly filtered = computed<SettlementSummary[]>(() => {
    const fv = this.filterValue();
    const idx = this.insurers();
    let items = this.list();
    const q = (fv.search ?? '').trim().toLowerCase();
    if (q) {
      items = items.filter(s =>
        String(s.settlementNumber).includes(q) ||
        (idx.get(s.insurerId) ?? '').toLowerCase().includes(q));
    }
    const statuses = (fv['status'] as SettlementStatus[] | undefined) ?? [];
    if (statuses.length) items = items.filter(s => statuses.includes(s.status));
    return items;
  });

  private handle: PollingHandle | null = null;

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.recargar();
    this.handle = this.polling.startPolling({
      key: 'financiero-liquidaciones',
      intervalMs: 5000,
      poll: () => {
        this.store.dispatch(loadSettlements({ filters: {} }));
        return of(null);
      },
    });
    this.destroy.onDestroy(() => this.handle?.stop());
  }

  protected recargar(): void {
    this.store.dispatch(loadSettlements({ filters: {} }));
  }

  protected onFilter(value: FilterBarValue): void {
    this.filterValue.set(value);
  }

  protected verDetalle(row: SettlementSummary): void {
    this.router.navigate(['/financiero/liquidaciones', row.id]);
  }

  protected irAGenerar(): void {
    this.router.navigate(['/financiero/liquidaciones/nueva']);
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm test -- --run liquidaciones-list.page`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.ts src/app/features/financiero/pages/liquidaciones/liquidaciones-list.page.spec.ts src/app/features/financiero/components/estado-liquidacion-pill.component.ts
git commit -m "feat(financiero): pantalla listado de liquidaciones (ui-table + filterbar + polling)"
```

---

### Task 6: Pantalla Detalle + acciones lifecycle

**Files:**
- Create: `src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.ts`
- Create: `src/app/features/financiero/pages/liquidaciones/components/informar-liquidacion-modal.component.ts`
- Create: `src/app/features/financiero/pages/liquidaciones/components/anular-liquidacion-modal.component.ts`
- Test: `src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.spec.ts`

**Interfaces:**
- Consumes: selectors `selectLiqSelected`, `selectLiqDetailLoading`, `selectLiqDetailError`, `selectLiqLifecycleInProgress`, `selectLiqInsurersIndex`; actions `loadSettlement`, `informSettlement`, `cancelSettlement`; `ActivatedRoute`, `TokenService`, `CurrencyArPipe`, `EstadoLiquidacionPillComponent`.
- Produces: `LiquidacionDetallePage`, `InformarLiquidacionModalComponent` (output `confirm: { informedDate, informedAmount, observations? }`, `closed`), `AnularLiquidacionModalComponent` (output `confirm: { cancellationReason }`, `closed`).

- [ ] **Step 1: Crear el modal de Informar**

Create `src/app/features/financiero/pages/liquidaciones/components/informar-liquidacion-modal.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InformSettlementBody } from '../../../models/liquidaciones.model';

@Component({
  selector: 'fin-informar-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Informar liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <div class="liq-form">
        <label class="liq-field">
          <span>Fecha informada <i class="liq-req">*</i></span>
          <input type="date" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" data-testid="inp-fecha" />
        </label>
        <label class="liq-field">
          <span>Monto informado <i class="liq-req">*</i></span>
          <input type="number" min="0" step="0.01" [ngModel]="monto()" (ngModelChange)="monto.set($event)" data-testid="inp-monto" />
        </label>
        <label class="liq-field">
          <span>Observaciones</span>
          <textarea rows="2" [ngModel]="obs()" (ngModelChange)="obs.set($event)"></textarea>
        </label>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
        <p-button label="Informar" severity="success" [disabled]="!valido()" [loading]="loading()" data-testid="btn-confirmar" (onClick)="emitir()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .liq-form { display: flex; flex-direction: column; gap: 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .liq-field input, .liq-field textarea { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
    .liq-req { color: #d83a3a; font-style: normal; }
  `],
})
export class InformarLiquidacionModalComponent {
  readonly loading = signal(false);
  readonly confirm = output<InformSettlementBody>();
  readonly closed = output<void>();

  protected readonly fecha = signal<string>('');
  protected readonly monto = signal<number | null>(null);
  protected readonly obs = signal<string>('');

  protected readonly valido = computed(() => !!this.fecha() && this.monto() != null && (this.monto() ?? 0) >= 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    const body: InformSettlementBody = {
      informedDate: this.fecha(),
      informedAmount: this.monto() as number,
    };
    const obs = this.obs().trim();
    if (obs) body.observations = obs;
    this.confirm.emit(body);
  }
}
```

- [ ] **Step 2: Crear el modal de Anular**

Create `src/app/features/financiero/pages/liquidaciones/components/anular-liquidacion-modal.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CancelSettlementBody } from '../../../models/liquidaciones.model';

@Component({
  selector: 'fin-anular-liquidacion-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [draggable]="false" [resizable]="false"
              header="Anular liquidación" [style]="{ width: '420px' }" (onHide)="closed.emit()">
      <p class="liq-warn">Esta acción no se puede deshacer. Las prestaciones vuelven a quedar pendientes.</p>
      <label class="liq-field">
        <span>Motivo de la anulación <i class="liq-req">*</i></span>
        <textarea rows="3" [ngModel]="motivo()" (ngModelChange)="motivo.set($event)" data-testid="inp-motivo"></textarea>
      </label>
      <ng-template pTemplate="footer">
        <p-button label="Volver" severity="secondary" [outlined]="true" (onClick)="closed.emit()" />
        <p-button label="Anular liquidación" severity="danger" [disabled]="!valido()" [loading]="loading()" data-testid="btn-confirmar" (onClick)="emitir()" />
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .liq-warn { font-size: 13px; color: #b5740c; background: #fcf1dd; padding: 8px 12px; border-radius: 7px; margin: 0 0 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .liq-field textarea { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
    .liq-req { color: #d83a3a; font-style: normal; }
  `],
})
export class AnularLiquidacionModalComponent {
  readonly loading = signal(false);
  readonly confirm = output<CancelSettlementBody>();
  readonly closed = output<void>();

  protected readonly motivo = signal<string>('');
  protected readonly valido = computed(() => this.motivo().trim().length > 0);

  protected emitir(): void {
    if (!this.valido()) return;
    this.loading.set(true);
    this.confirm.emit({ cancellationReason: this.motivo().trim() });
  }
}
```

- [ ] **Step 3: Escribir el smoke spec del detalle (falla primero)**

Create `src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { LiquidacionDetallePage } from './liquidacion-detalle.page';
import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { TokenService } from '@core/auth/token.service';
import { SettlementDetail } from '../../models/liquidaciones.model';

const detail: SettlementDetail = {
  id: 1, insurerId: 7, settlementNumber: 100, status: 'PENDING', type: 'SIMPLE',
  periodFrom: '2026-01-01', periodTo: '2026-01-31', informedDate: null, informedAmount: null,
  paymentId: null, createdAt: '2026-02-01T10:00:00',
  plans: [{ planId: 3, agreements: [{ agreementId: 9, agreementSubtotal: 1500, providedServiceIds: [1, 2], rules: [] }] }],
};

function setup(status: SettlementDetail['status'], roles: string[]) {
  return TestBed.configureTestingModule({
    imports: [LiquidacionDetallePage],
    providers: [
      provideNoopAnimations(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } },
      { provide: TokenService, useValue: { getRoles: () => roles } },
      provideMockStore({
        selectors: [
          { selector: selectLiqSelected, value: { ...detail, status } },
          { selector: selectLiqDetailLoading, value: false },
          { selector: selectLiqDetailError, value: null },
          { selector: selectLiqLifecycleInProgress, value: false },
          { selector: selectLiqInsurersIndex, value: new Map([[7, 'IOMA']]) },
        ],
      }),
    ],
  }).compileComponents();
}

describe('LiquidacionDetallePage — smoke', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('muestra acciones Informar y Anular en estado PENDING para ADMIN', async () => {
    await setup('PENDING', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeTruthy();
  });

  it('no muestra acciones de mutación si el rol no es ADMIN', async () => {
    await setup('PENDING', ['SECRETARIA']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeNull();
  });

  it('en estado BILLED no muestra acciones de lifecycle', async () => {
    await setup('BILLED', ['ADMINISTRADOR']);
    const fixture = TestBed.createComponent(LiquidacionDetallePage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-informar"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="btn-anular"]'))).toBeNull();
  });
});
```

- [ ] **Step 4: Correr el test y verificar que falla**

Run: `npm test -- --run liquidacion-detalle.page`
Expected: FAIL ("Cannot find module './liquidacion-detalle.page'").

- [ ] **Step 5: Implementar la page de detalle**

Create `src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.ts`:

```typescript
import {
  ChangeDetectionStrategy, Component, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { TokenService } from '@core/auth/token.service';

import {
  selectLiqSelected, selectLiqDetailLoading, selectLiqDetailError,
  selectLiqLifecycleInProgress, selectLiqInsurersIndex,
} from '../../store/financiero.selectors';
import { loadSettlement, informSettlement, cancelSettlement } from '../../store/financiero.actions';
import { InformSettlementBody, CancelSettlementBody } from '../../models/liquidaciones.model';
import { EstadoLiquidacionPillComponent } from '../../components/estado-liquidacion-pill.component';
import { InformarLiquidacionModalComponent } from './components/informar-liquidacion-modal.component';
import { AnularLiquidacionModalComponent } from './components/anular-liquidacion-modal.component';

type Modal = 'informar' | 'anular' | null;

@Component({
  selector: 'fin-liquidacion-detalle-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, PageHeaderComponent, EmptyStateComponent, CurrencyArPipe,
    EstadoLiquidacionPillComponent, InformarLiquidacionModalComponent, AnularLiquidacionModalComponent,
  ],
  template: `
    <div class="fin-liq-det">
      <ui-page-header heading="Detalle de liquidación">
        <button class="fin-btn fin-btn--ghost" type="button" (click)="volver()">
          <i class="pi pi-arrow-left"></i> Volver
        </button>
      </ui-page-header>

      @if (detailError()) {
        <ui-empty-state icon="pi-exclamation-circle" heading="No se pudo cargar la liquidación"
          [description]="detailError()!" ctaLabel="Reintentar" (ctaClick)="recargar()" />
      } @else if (liq(); as l) {
        <div class="fin-card liq-head">
          <div class="liq-head__main">
            <h2>N° {{ l.settlementNumber }}</h2>
            <fin-estado-liquidacion-pill [status]="l.status" />
            <span class="liq-type">{{ l.type === 'SIMPLE' ? 'Simple' : 'Especial' }}</span>
          </div>
          <div class="liq-head__meta">
            <span><b>Obra Social:</b> {{ insurers().get(l.insurerId) ?? 'Obra social' }}</span>
            <span><b>Período:</b> {{ l.periodFrom | date:'dd/MM/yyyy' }} – {{ l.periodTo | date:'dd/MM/yyyy' }}</span>
            @if (l.informedDate) {
              <span><b>Informada:</b> {{ l.informedDate | date:'dd/MM/yyyy' }} · {{ l.informedAmount | currencyAr }}</span>
            }
          </div>
        </div>

        <div class="fin-card liq-total">
          <span class="liq-total__label">Total liquidado</span>
          <span class="liq-total__value">{{ total() | currencyAr }}</span>
          <span class="liq-total__sub">{{ prestacionesCount() }} prestación{{ prestacionesCount() === 1 ? '' : 'es' }} en {{ l.plans.length }} convenio{{ l.plans.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="fin-card liq-convenios">
          <h3>Convenios incluidos</h3>
          @for (plan of l.plans; track plan.planId) {
            @for (ag of plan.agreements; track ag.agreementId) {
              <div class="liq-conv-row">
                <span class="liq-conv-name">Convenio del plan</span>
                <span class="liq-conv-count">{{ ag.providedServiceIds.length }} prestación{{ ag.providedServiceIds.length === 1 ? '' : 'es' }}</span>
                <span class="liq-conv-subtotal">{{ ag.agreementSubtotal | currencyAr }}</span>
              </div>
            }
          } @empty {
            <p class="liq-muted">Esta liquidación no tiene convenios cargados.</p>
          }
        </div>

        @if (isAdmin() && l.status === 'PENDING') {
          <div class="liq-actions">
            <button class="fin-btn fin-btn--success" type="button" data-testid="btn-informar" (click)="modal.set('informar')">
              <i class="pi pi-check"></i> Informar
            </button>
            <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" (click)="modal.set('anular')">
              <i class="pi pi-times"></i> Anular
            </button>
          </div>
        } @else if (isAdmin() && l.status === 'INFORMED') {
          <div class="liq-actions">
            <button class="fin-btn fin-btn--danger" type="button" data-testid="btn-anular" (click)="modal.set('anular')">
              <i class="pi pi-times"></i> Anular
            </button>
          </div>
        }
      } @else {
        <div class="fin-card liq-loading">Cargando…</div>
      }

      @if (modal() === 'informar') {
        <fin-informar-liquidacion-modal (confirm)="onInformar($event)" (closed)="modal.set(null)" />
      }
      @if (modal() === 'anular') {
        <fin-anular-liquidacion-modal (confirm)="onAnular($event)" (closed)="modal.set(null)" />
      }
    </div>
  `,
  styles: [`
    .fin-liq-det { display: flex; flex-direction: column; gap: 14px; }
    .fin-card { background: #fff; border: 1px solid #e8e9f0; border-radius: 12px; padding: 18px 20px; }
    .liq-head__main { display: flex; align-items: center; gap: 12px; }
    .liq-head__main h2 { margin: 0; font-size: 20px; }
    .liq-type { font-size: 12.5px; color: #64748b; }
    .liq-head__meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; font-size: 13px; color: #4a4d63; }
    .liq-total { display: flex; flex-direction: column; gap: 2px; }
    .liq-total__label { font-size: 12px; color: #7c8092; }
    .liq-total__value { font-size: 28px; font-weight: 700; color: #22243a; }
    .liq-total__sub { font-size: 12.5px; color: #7c8092; }
    .liq-convenios h3 { margin: 0 0 10px; font-size: 15px; }
    .liq-conv-row { display: grid; grid-template-columns: 1fr auto auto; gap: 16px; padding: 8px 0; border-top: 1px solid #f1f5f9; align-items: center; }
    .liq-conv-count { font-size: 12.5px; color: #64748b; }
    .liq-conv-subtotal { font-weight: 600; }
    .liq-muted { color: #7c8092; font-size: 13px; }
    .liq-actions { display: flex; gap: 8px; }
    .fin-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; border: none; font-size: 13.5px; font-weight: 500; cursor: pointer; }
    .fin-btn--ghost { background: #fff; color: #4a4d63; border: 1.5px solid #e8e9f0; }
    .fin-btn--success { background: #0f8a55; color: #fff; }
    .fin-btn--danger { background: #d83a3a; color: #fff; }
    .liq-loading { color: #7c8092; }
  `],
})
export class LiquidacionDetallePage implements OnInit {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenService);

  readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));
  protected readonly modal = signal<Modal>(null);

  protected readonly liq = this.store.selectSignal(selectLiqSelected);
  protected readonly detailLoading = this.store.selectSignal(selectLiqDetailLoading);
  protected readonly detailError = this.store.selectSignal(selectLiqDetailError);
  protected readonly lifecycleInProgress = this.store.selectSignal(selectLiqLifecycleInProgress);
  protected readonly insurers = this.store.selectSignal(selectLiqInsurersIndex);

  protected readonly total = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((sum, a) => sum + a.agreementSubtotal, 0));
  protected readonly prestacionesCount = computed(() =>
    (this.liq()?.plans ?? []).flatMap(p => p.agreements).reduce((n, a) => n + a.providedServiceIds.length, 0));

  private get id(): number {
    return Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.recargar();
  }

  protected recargar(): void {
    this.store.dispatch(loadSettlement({ id: this.id }));
  }

  protected onInformar(body: InformSettlementBody): void {
    this.store.dispatch(informSettlement({ id: this.id, body }));
    this.modal.set(null);
  }

  protected onAnular(body: CancelSettlementBody): void {
    this.store.dispatch(cancelSettlement({ id: this.id, body }));
    this.modal.set(null);
  }

  protected volver(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npm test -- --run liquidacion-detalle.page`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.ts src/app/features/financiero/pages/liquidaciones/liquidacion-detalle.page.spec.ts src/app/features/financiero/pages/liquidaciones/components/
git commit -m "feat(financiero): pantalla detalle de liquidación + modales informar/anular"
```

---

### Task 7: Wizard Generar liquidación

**Files:**
- Create: `src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.ts`
- Test: `src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.spec.ts`

**Interfaces:**
- Consumes: selectors `selectLiqInsurers`, `selectLiqPending`, `selectLiqInsurerPlanIds`, `selectLiqGenerating`; actions `loadInsurersIndex`, `loadPendingServices`, `loadInsurerPlans`, `generateSettlement`; `WizardShellComponent`, `FormStep`, PrimeNG `SelectModule`, `TokenService`, `Actions` (para navegar al éxito), `CurrencyArPipe`.
- Produces: `GenerarLiquidacionPage`.

- [ ] **Step 1: Escribir el smoke spec (falla primero)**

Create `src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.spec.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideMockActions } from '@ngrx/effects/testing';
import { EMPTY } from 'rxjs';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { GenerarLiquidacionPage } from './generar-liquidacion.page';
import {
  selectLiqInsurers, selectLiqPending, selectLiqInsurerPlanIds, selectLiqGenerating,
} from '../../store/financiero.selectors';

describe('GenerarLiquidacionPage — smoke', () => {
  let store: MockStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerarLiquidacionPage],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockActions(() => EMPTY),
        provideMockStore({
          selectors: [
            { selector: selectLiqInsurers, value: [{ id: 7, code: 'OS7', acronym: 'OS', name: 'IOMA', insurerType: 'SOCIAL', insurerTypeName: 'Obra Social', active: true }] },
            { selector: selectLiqPending, value: [] },
            { selector: selectLiqInsurerPlanIds, value: [] },
            { selector: selectLiqGenerating, value: false },
          ],
        }),
      ],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('arranca en el paso 1 (Datos) con el wizard shell', () => {
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('ui-wizard-shell'))).toBeTruthy();
  });

  it('el paso 1 no permite continuar sin OS ni período', () => {
    const fixture = TestBed.createComponent(GenerarLiquidacionPage);
    const cmp = fixture.componentInstance as unknown as { paso1Valido: () => boolean };
    fixture.detectChanges();
    expect(cmp.paso1Valido()).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm test -- --run generar-liquidacion.page`
Expected: FAIL ("Cannot find module './generar-liquidacion.page'").

- [ ] **Step 3: Implementar el wizard**

Create `src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.ts`:

```typescript
import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SelectModule } from 'primeng/select';

import { WizardShellComponent } from '@shared/ui/components/wizard-shell/wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';

import {
  selectLiqInsurers, selectLiqPending, selectLiqInsurerPlanIds, selectLiqGenerating,
} from '../../store/financiero.selectors';
import {
  loadInsurersIndex, loadPendingServices, loadInsurerPlans,
  generateSettlement, generateSettlementSuccess,
} from '../../store/financiero.actions';
import { InsurerSummary } from '@features/obras-sociales/models/insurer.model';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Obra social y período', required: true },
  { key: 'revisar', title: 'Revisar', subtitle: 'Prestaciones pendientes' },
];

@Component({
  selector: 'fin-generar-liquidacion-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, SelectModule, WizardShellComponent],
  template: `
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps"
      [currentIndex]="step()"
      [visited]="visited()"
      [continueDisabled]="!paso1Valido()"
      finishLabel="Generar"
      [finishDisabled]="!preview().length"
      [finishLoading]="generating()"
      (next)="next()"
      (back)="back()"
      (cancel)="cancelar()"
      (finish)="generar()">

      @if (step() === 0) {
        <div class="liq-step">
          <label class="liq-field">
            <span>Obra Social <i class="liq-req">*</i></span>
            <p-select [options]="insurers()" optionLabel="name" [filter]="true"
                      placeholder="Elegí una obra social" [(ngModel)]="os"
                      (onChange)="onOsChange()" data-testid="sel-os" />
          </label>
          <div class="liq-row">
            <label class="liq-field">
              <span>Desde <i class="liq-req">*</i></span>
              <input type="date" [ngModel]="from()" (ngModelChange)="from.set($event)" data-testid="inp-from" />
            </label>
            <label class="liq-field">
              <span>Hasta <i class="liq-req">*</i></span>
              <input type="date" [ngModel]="to()" (ngModelChange)="to.set($event)" data-testid="inp-to" />
            </label>
          </div>
          @if (rangoInvalido()) {
            <p class="liq-error">La fecha "Desde" no puede ser posterior a "Hasta".</p>
          }
        </div>
      } @else {
        <div class="liq-step">
          <h3>Revisar antes de generar</h3>
          <div class="liq-review">
            <span class="liq-review__os">{{ os()?.name }}</span>
            <span class="liq-review__period">{{ from() | date:'dd/MM/yyyy' }} – {{ to() | date:'dd/MM/yyyy' }}</span>
          </div>
          @if (preview().length) {
            <div class="liq-preview liq-preview--ok">
              <i class="pi pi-check-circle"></i>
              <span><b>{{ preview().length }}</b> prestación{{ preview().length === 1 ? '' : 'es' }} pendiente{{ preview().length === 1 ? '' : 's' }} para liquidar.</span>
            </div>
          } @else {
            <div class="liq-preview liq-preview--empty">
              <i class="pi pi-info-circle"></i>
              <span>No hay prestaciones pendientes para esa obra social y período. No se puede generar la liquidación.</span>
            </div>
          }
        </div>
      }
    </ui-wizard-shell>
  `,
  styles: [`
    .liq-step { display: flex; flex-direction: column; gap: 14px; }
    .liq-row { display: flex; gap: 12px; }
    .liq-field { display: flex; flex-direction: column; gap: 4px; font-size: 13px; flex: 1; }
    .liq-field input { padding: 8px 10px; border: 1px solid #e8edf3; border-radius: 7px; font-size: 14px; }
    .liq-req { color: #d83a3a; font-style: normal; }
    .liq-error { color: #d83a3a; font-size: 12.5px; margin: 0; }
    .liq-review { display: flex; flex-direction: column; gap: 2px; margin-bottom: 12px; }
    .liq-review__os { font-weight: 600; font-size: 15px; }
    .liq-review__period { font-size: 13px; color: #64748b; }
    .liq-preview { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-radius: 9px; font-size: 13.5px; }
    .liq-preview--ok { background: #e3f6ec; color: #0f6b44; }
    .liq-preview--empty { background: #fcf1dd; color: #b5740c; }
  `],
})
export class GenerarLiquidacionPage implements OnInit {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly destroy = inject(DestroyRef);

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  // form state
  os = signal<InsurerSummary | null>(null);
  protected readonly from = signal<string>('');
  protected readonly to = signal<string>('');

  protected readonly insurers = this.store.selectSignal(selectLiqInsurers);
  protected readonly pending = this.store.selectSignal(selectLiqPending);
  protected readonly planIds = this.store.selectSignal(selectLiqInsurerPlanIds);
  protected readonly generating = this.store.selectSignal(selectLiqGenerating);

  protected readonly rangoInvalido = computed(() => {
    const f = this.from(); const t = this.to();
    return !!f && !!t && f > t;
  });

  protected readonly paso1Valido = computed(() =>
    !!this.os() && !!this.from() && !!this.to() && !this.rangoInvalido());

  /** Preview: pendientes de la OS elegida (por planId) dentro del período. */
  protected readonly preview = computed(() => {
    const ids = new Set(this.planIds());
    const f = this.from(); const t = this.to();
    if (!ids.size || !f || !t) return [];
    return this.pending().filter(p =>
      ids.has(p.planId) && p.serviceDate >= f && p.serviceDate <= t);
  });

  ngOnInit(): void {
    this.store.dispatch(loadInsurersIndex());
    this.store.dispatch(loadPendingServices());

    // Al generarse con éxito, navegar al detalle de la nueva liquidación.
    this.actions$.pipe(ofType(generateSettlementSuccess), takeUntilDestroyed(this.destroy)).subscribe(({ settlement }) => {
      this.router.navigate(['/financiero/liquidaciones', settlement.id]);
    });
  }

  protected onOsChange(): void {
    const insurer = this.os();
    if (insurer) this.store.dispatch(loadInsurerPlans({ insurerId: insurer.id }));
  }

  protected next(): void {
    if (!this.paso1Valido()) return;
    this.step.set(1);
    this.visited.update(s => new Set(s).add(1));
  }

  protected back(): void {
    this.step.set(0);
  }

  protected generar(): void {
    const insurer = this.os();
    if (!insurer || !this.preview().length) return;
    this.store.dispatch(generateSettlement({
      body: {
        insurerId: insurer.id,
        period: { from: this.from(), to: this.to() },
        specialRules: [],
        excludedAnalysisIdsByPs: null,
      },
    }));
  }

  protected cancelar(): void {
    this.router.navigate(['/financiero/liquidaciones']);
  }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npm test -- --run generar-liquidacion.page`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.ts src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.spec.ts
git commit -m "feat(financiero): wizard generar liquidación (2 pasos + preview de pendientes)"
```

---

### Task 8: Verificación final (build + suite)

**Files:** ninguno nuevo.

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm test -- --run financiero`
Expected: PASS — todos los specs de financiero (incluidos los nuevos de liquidaciones) en verde.

- [ ] **Step 2: Correr el build para verificar que compila (rutas + lazy imports)**

Run: `npm run build`
Expected: build exitoso (sin errores de TS ni de imports que no resuelven — confirma que las rutas de Task 4 cargan las pages reales).

- [ ] **Step 3: Commit (si hubo ajustes de compilación)**

```bash
git add -A
git commit -m "chore(financiero): cierre de liquidaciones — suite y build en verde"
```

---

## Self-Review

**Spec coverage:**
- Ubicación dentro de financiero + reemplazo placeholder → Task 4. ✓
- Gating módulo+rol → heredado del padre (router) + `isAdmin`/`hasRole` en pages (Tasks 5-7). ✓
- Listado ui-table + FilterBar + polling ETag/304 → Task 5. ✓
- Detalle (resumen, convenios por conteo+monto, lifecycle por estado) → Task 6. ✓
- Generar wizard SIMPLE 2 pasos + preview pendientes (filtrado por planIds de la OS + período) → Task 7. ✓
- Lifecycle informar/anular con 422 en español; facturar diferido → Tasks 3/6. ✓
- Resolución insurerId→nombre vía ObraSocialService → Tasks 2/3 (`loadInsurersIndex`, `selectLiqInsurersIndex`). ✓
- Mensajes de error español sin leak → mappers en Task 3. ✓
- Store NgRx clásico (state/actions/reducer/effects/selectors) → Tasks 2/3. ✓
- Tests (api, reducer, selectors, effects, smoke de 3 pages) → cada task. ✓

**Placeholder scan:** sin TBD/TODO; todo el código está completo. ✓

**Type consistency:** nombres de actions/selectors/métodos consistentes entre tasks (`selectLiq*`, `loadSettlements`, `generateSettlement`, `LiquidacionesApiService.*`, `InformSettlementBody`/`CancelSettlementBody`). Pages referencian solo selectors/actions definidos en Task 2. ✓

## Fuera de alcance (follow-ups, ver spec)

Generar ESPECIAL, "Facturar" (BILLED), tesorería, exclusión de análisis, nombres de paciente/plan por prestación.
