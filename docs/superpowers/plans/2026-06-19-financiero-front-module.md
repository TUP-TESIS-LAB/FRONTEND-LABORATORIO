# Módulo Financiero en el frontend (Sub-proyecto 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-120](https://exequielsantoro.atlassian.net/browse/KAN-120)
> **Spec:** `docs/superpowers/specs/2026-06-19-financiero-front-module-design.md`

**Goal:** Reemplazar el scaffold mock de `features/financiero/` por las pantallas reales (Caja, Cobros, Config fiscal, placeholders) conectadas a los endpoints reales del backend.

**Architecture:** Angular 21 standalone + signals + NgRx clásico + PrimeNG + Tailwind. Capa de datos (modelos espejo del backend, `FinancieroApiService` sobre `/api/v1/financiero/*`, store por slice) primero; luego routing/shell; luego pantallas reusando el design system. Caja con polling ETag/304.

**Tech Stack:** Angular 21, NgRx classic, RxJS, PrimeNG, Tailwind, Vitest.

## Global Constraints

- HTTP: base `/api/v1/financiero`; auth y `X-Tenant-ID` los agregan interceptores globales — NO setearlos a mano. Polling: marcar requests polleables con `withPolling()` (de `core/refresh`).
- Effects: `switchMap` para loads (GET), `concatMap` para mutaciones (POST/PATCH/DELETE). Errores → failure action con `catchError((e: HttpErrorResponse) => of(failure({error: e})))`.
- Componentes: `standalone`, `ChangeDetectionStrategy.OnPush`, `inject()`, `store.selectSignal(...)`, `computed()` para derivados.
- Roles del JWT son uppercase: `ADMINISTRADOR`, `SECRETARIA`, `SAAS_ADMIN`. Gating: `*hasRole="'ADMINISTRADOR'"` (de `shared/directives/has-role.directive.ts`), `saasAdminGuard` (de `core/guards/saas-admin.guard.ts`).
- branchId: `inject(OperatorBranchContextService).branchId()` (`features/turnos/services/operator-branch.context.ts`), `Signal<number|null>`.
- Texto en español rioplatense. Errores en UI sin leaks (clase/SQL/stacktrace); mapear por código. Mensajes fijos: 409 abrir caja → "Ya hay una caja abierta para esta sucursal."; 422 sin caja → "No se puede cobrar: no hay una caja abierta."; 422 montos → "La suma de los medios de pago no coincide con el total."
- Iconos PrimeIcons (`pi pi-*`), nunca emojis. Montos con `CurrencyArPipe` (`currencyAr`).
- Toasts: `NotificationService` (`notif.success(...)`, `notif.error(...)`).
- Tests: Vitest vía `npm test` / `ng test` (NO `npx vitest run` directo — rompe con `templateUrl`). Cuidado con `input.required()` + `setInput()` (usar `@Input()` o `overrideTemplate` si hace falta).
- Reusar design system: `ui-page-header`, `ui-table` (+ `UiCellDirective`), `ui-stat-card`, `ui-empty-state`, `ui-refresh-indicator`, `ui-filter-bar`. NO recrear.
- Fidelidad visual: seguir `tesis/design_handoff_financiero_angular/` (README + prototipos `js/fin-*.jsx`) para layout, estados y copy.

---

## File Structure

```
features/financiero/
  models/financiero.model.ts            # T2: enums + interfaces + METHOD_META/COMPROBANTE_META/PROVIDER_META
  services/financiero-api.service.ts     # T3
  store/financiero.{state,actions,reducer,selectors,effects}.ts   # T4 (caja), T5 (cobros), T6 (config)
  financiero.routes.ts                   # T7
  financiero-shell/financiero-shell.component.ts                  # T7
  pages/caja/caja.page.ts (+ .spec)      # T8
  pages/caja/components/{abrir-caja,movimiento,arqueo}-modal.component.ts  # T8
  pages/cobros/cobros.page.ts (+ .spec)  # T9
  pages/cobros/cobro-detalle.page.ts + components/cancelar-pago-modal.component.ts  # T9
  pages/config-fiscal/config-fiscal.page.ts  # T10
  pages/placeholder/modulo-no-disponible.component.ts  # T10
  components/{metodo-chip,estado-caja-pill,estado-pago-pill,comprobante-card}.component.ts  # T8/T9 as needed
```

Files DELETED in T1: `models/financiero.model.ts` (old), `services/financiero.service.ts`, `store/*` (old), `pages/{pagos,movimientos,coberturas,liquidaciones,cajas}/*`, `financiero-dashboard/*`. (New files reuse some paths.)

---

## Task 1: Remove mock scaffold + register feature state

**Files:**
- Delete: `services/financiero.service.ts`, old `store/financiero.{actions,reducer,selectors,effects,state}.ts`, `pages/pagos/*`, `pages/movimientos/*`, `pages/coberturas/*`, `pages/liquidaciones/*`, `pages/cajas/*`, `financiero-dashboard/*`, old `models/financiero.model.ts`.
- Check: `app.config.ts` / wherever `provideState('financiero', ...)` or feature effects are registered — note it; the store will be re-registered in T4–T6.

- [ ] **Step 1: Inventory references**

Run: `git grep -n "features/financiero" src/ ; git grep -n "financiero.service\|financiero.actions\|FinancieroService" src/`
Expected: shows `financiero.routes.ts`, `app.routes.ts` (lazy route), `sidebar.nav.ts`, and the old internal imports. Record them.

- [ ] **Step 2: Delete the mock files**

Delete the files listed above. Leave `financiero.routes.ts` (rewritten in T7) and keep the folder.

- [ ] **Step 3: Verify build breaks only where expected**

Run: `npm run build` (or `ng build`)
Expected: FAIL — unresolved imports in `financiero.routes.ts` (and any old store registration). That is the surface T2–T7 must replace. Record the exact errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(financiero): remover scaffold mock (modelos/servicio/store/pages placeholder)"
```

---

## Task 2: Domain models + UI metadata

**Files:**
- Create: `features/financiero/models/financiero.model.ts`
- Test: `features/financiero/models/financiero.model.spec.ts`

**Interfaces (Produces):** enums `PaymentMethod`, `PaymentStatus`, `TransactionType`, `CashSessionStatus`, `FiscalProvider`, `ComprobanteTipo`; interfaces `CashSession`, `SessionActivity`/`SessionActivityRow`, `PaymentListItem`, `PaymentDetail`, `Collection`, `Payment`, `FiscalInvoiceReference`, `TenantFiscalConfig`; const maps `METHOD_META`, `COMPROBANTE_META`, `PROVIDER_META`.

- [ ] **Step 1: Write the failing test**

```ts
import { METHOD_META, PaymentMethod } from './financiero.model';

describe('financiero metadata', () => {
  it('marca solo CASH como efectivo arqueable', () => {
    expect(METHOD_META['CASH'].esEfectivo).toBe(true);
    (['QR','POSNET','TRANSFER','CREDIT_CARD','DEBIT_CARD'] as PaymentMethod[])
      .forEach(m => expect(METHOD_META[m].esEfectivo).toBe(false));
  });
  it('tiene label e icono por método', () => {
    expect(METHOD_META['CASH'].label).toBe('Efectivo');
    expect(METHOD_META['CASH'].icon).toBe('pi-money-bill');
  });
});
```

- [ ] **Step 2: Run it (fails — module missing)**

Run: `npm test -- financiero.model`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement the model**

```ts
export type PaymentMethod = 'CASH' | 'QR' | 'POSNET' | 'TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD';
export type PaymentStatus = 'CREATED' | 'PROCESSED' | 'CANCELLED';
export type TransactionType = 'INGRESS' | 'EGRESS';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type FiscalProvider = 'ARCA' | 'COLPPY' | 'NONE';
export type ComprobanteTipo = 'FACTURA_X' | 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';

export interface CashSession {
  id: number; tenantId: number; cashRegisterId: number; openedByUserId: number;
  openedAt: string; closedAt: string | null; status: CashSessionStatus;
  openingAmount: number; expectedAmount: number | null; declaredAmount: number | null;
  difference: number | null; saldoActual: number | null;
}
export interface SessionActivityRow {
  type: TransactionType; method: PaymentMethod; amount: number;
  description: string | null; reference: string | null; occurredAt: string;
  esEfectivo: boolean; paymentId: number | null;
}
export interface SessionActivity { rows: SessionActivityRow[]; otrosMediosTotal: number; cobrosCount: number; }
export interface Collection { id: number; method: PaymentMethod; amount: number; reference: string | null; }
export interface PaymentDetail { id: number; analysisId: number; coverageId: number | null; covered: boolean; chargedAmount: number; }
export interface FiscalInvoiceReference {
  id: number; paymentId: number; provider: FiscalProvider; comprobanteTipo: ComprobanteTipo;
  internalReference: string | null; externalInvoiceId: string | null; electronic: boolean; isVoid: boolean; emittedAt: string;
}
export interface Payment {
  id: number; tenantId: number; attentionId: number; branchId: number;
  totalAmount: number; copaymentAmount: number; status: PaymentStatus;
  cashTransactionId: number | null; cancelledAt: string | null; cancelReason: string | null;
  collections: Collection[]; details: PaymentDetail[];
}
export interface PaymentListItem {
  id: number; attentionId: number; branchId: number; totalAmount: number; copaymentAmount: number;
  status: PaymentStatus; createdAt: string; collections: Collection[];
}
export interface TenantFiscalConfig { id: number; targetTenantId: number; provider: FiscalProvider; invoicePointOfSale: string | null; active: boolean; }

export interface MethodMeta { label: string; icon: string; color: string; esEfectivo: boolean; refLabel: string; }
export const METHOD_META: Record<PaymentMethod, MethodMeta> = {
  CASH:        { label: 'Efectivo',           icon: 'pi-money-bill',             color: 'green',  esEfectivo: true,  refLabel: 'N° de recibo' },
  QR:          { label: 'QR',                 icon: 'pi-qrcode',                 color: 'purple', esEfectivo: false, refLabel: 'ID de operación' },
  POSNET:      { label: 'Posnet',             icon: 'pi-credit-card',            color: 'blue',   esEfectivo: false, refLabel: 'N° de lote / cupón' },
  TRANSFER:    { label: 'Transferencia',      icon: 'pi-arrow-right-arrow-left', color: 'teal',   esEfectivo: false, refLabel: 'CBU / comprobante' },
  CREDIT_CARD: { label: 'Tarjeta de crédito', icon: 'pi-credit-card',            color: 'amber',  esEfectivo: false, refLabel: 'N° de cupón' },
  DEBIT_CARD:  { label: 'Tarjeta de débito',  icon: 'pi-credit-card',            color: 'slate',  esEfectivo: false, refLabel: 'N° de cupón' },
};
export const COMPROBANTE_META: Record<ComprobanteTipo, { label: string; sub: string }> = {
  FACTURA_X: { label: 'Factura X', sub: 'Recibo interno · no fiscal' },
  FACTURA_A: { label: 'Factura A', sub: 'Responsable inscripto' },
  FACTURA_B: { label: 'Factura B', sub: 'Consumidor final' },
  FACTURA_C: { label: 'Factura C', sub: 'Monotributo' },
};
export const PROVIDER_META: Record<FiscalProvider, { label: string; sub: string; icon: string }> = {
  ARCA:   { label: 'ARCA',          sub: 'Facturación electrónica AFIP/ARCA', icon: 'pi-verified' },
  COLPPY: { label: 'Colppy',        sub: 'Integración contable Colppy',       icon: 'pi-sync' },
  NONE:   { label: 'Sin proveedor', sub: 'Solo Factura X (recibos internos)', icon: 'pi-ban' },
};
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- financiero.model`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add features/financiero/models/financiero.model.ts features/financiero/models/financiero.model.spec.ts
git commit -m "feat(financiero): modelos espejo del backend + metadatos de UI"
```

---

## Task 3: FinancieroApiService

**Files:**
- Create: `features/financiero/services/financiero-api.service.ts`
- Test: `features/financiero/services/financiero-api.service.spec.ts`

**Interfaces (Produces):** methods —
`getOpenSession(branchId): Observable<CashSession | null>` (204 → null),
`getSession(id): Observable<CashSession>`,
`getActivity(id): Observable<SessionActivity | NotModified>` (con `withPolling()`),
`openSession(branchId, openingAmount): Observable<CashSession>`,
`closeSession(id, declaredAmount): Observable<CashSession>`,
`registerTransaction(id, body: {branchId, type, amount, description}): Observable<unknown>`,
`listPayments(filters: {branchId?, status?}): Observable<PaymentListItem[]>`,
`getPayment(id): Observable<Payment & {fiscalReference?: FiscalInvoiceReference}>`,
`cancelPayment(id, reason): Observable<Payment>`,
`getFiscalConfig(tenantId): Observable<TenantFiscalConfig>`,
`saveFiscalConfig(body): Observable<TenantFiscalConfig>`.

- [ ] **Step 1: Write the failing test (HttpTestingController)**

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinancieroApiService } from './financiero-api.service';

describe('FinancieroApiService', () => {
  let svc: FinancieroApiService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(FinancieroApiService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getOpenSession mapea 204 a null', () => {
    let result: unknown = 'unset';
    svc.getOpenSession(5).subscribe(r => (result = r));
    const req = http.expectOne('/api/v1/financiero/cash-sessions/open?branchId=5');
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toBeNull();
  });

  it('listPayments arma query con branchId y status', () => {
    svc.listPayments({ branchId: 5, status: 'PROCESSED' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/payments');
    expect(req.request.params.get('branchId')).toBe('5');
    expect(req.request.params.get('status')).toBe('PROCESSED');
    req.flush([]);
  });

  it('cancelPayment hace DELETE con body { reason }', () => {
    svc.cancelPayment(9, 'cobro duplicado').subscribe();
    const req = http.expectOne('/api/v1/financiero/payments/9');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ reason: 'cobro duplicado' });
    req.flush({});
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- financiero-api.service`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the service**

```ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { withPolling } from '@core/refresh';        // verificar el path real de export de core/refresh
import { NotModified } from '@core/refresh';         // tipo del sentinel 304 (ajustar al export real)
import {
  CashSession, SessionActivity, PaymentListItem, Payment, PaymentStatus,
  TransactionType, TenantFiscalConfig, FiscalProvider, FiscalInvoiceReference,
} from '../models/financiero.model';

@Injectable({ providedIn: 'root' })
export class FinancieroApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero';

  getOpenSession(branchId: number): Observable<CashSession | null> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/open`, {
      params: new HttpParams().set('branchId', branchId),
    }).pipe(map(s => s ?? null));   // 204 → cuerpo vacío → null
  }
  getSession(id: number): Observable<CashSession> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/${id}`, { context: withPolling() });
  }
  getActivity(id: number): Observable<SessionActivity | NotModified> {
    return this.http.get<SessionActivity>(`${this.base}/cash-sessions/${id}/activity`, { context: withPolling() });
  }
  openSession(branchId: number, openingAmount: number): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.base}/cash-sessions`, { branchId, openingAmount });
  }
  closeSession(id: number, declaredAmount: number): Observable<CashSession> {
    return this.http.patch<CashSession>(`${this.base}/cash-sessions/${id}/close`, { declaredAmount });
  }
  registerTransaction(id: number, body: { branchId: number; type: TransactionType; amount: number; description: string }): Observable<unknown> {
    return this.http.post(`${this.base}/cash-sessions/${id}/transactions`, body);
  }
  listPayments(filters: { branchId?: number; status?: PaymentStatus }): Observable<PaymentListItem[]> {
    let params = new HttpParams();
    if (filters.branchId != null) params = params.set('branchId', filters.branchId);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<PaymentListItem[]>(`${this.base}/payments`, { params });
  }
  getPayment(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.base}/payments/${id}`);
  }
  cancelPayment(id: number, reason: string): Observable<Payment> {
    return this.http.request<Payment>('delete', `${this.base}/payments/${id}`, { body: { reason } });
  }
  getFiscalConfig(tenantId: number): Observable<TenantFiscalConfig> {
    return this.http.get<TenantFiscalConfig>(`${this.base}/tenant/fiscal-config/${tenantId}`);
  }
  saveFiscalConfig(body: { targetTenantId: number; provider: FiscalProvider; invoicePointOfSale?: string; configJson?: string }): Observable<TenantFiscalConfig> {
    return this.http.post<TenantFiscalConfig>(`${this.base}/tenant/fiscal-config`, body);
  }
}
```

> **Verificación del implementer:** confirmar los exports reales de `core/refresh` (`withPolling`, tipo del sentinel 304 e `isNotModified`). Si el nombre del tipo no es `NotModified`, ajustar el import y la firma de `getActivity`. Mirar `features/analitica/muestras/services/muestras-api.service.ts` como referencia de uso de `withPolling()`.

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- financiero-api.service`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add features/financiero/services/financiero-api.service.ts features/financiero/services/financiero-api.service.spec.ts
git commit -m "feat(financiero): FinancieroApiService contra /api/v1/financiero"
```

---

## Task 4: Store — slice Caja

**Files:**
- Create: `features/financiero/store/financiero.state.ts`, `financiero.actions.ts`, `financiero.reducer.ts`, `financiero.selectors.ts`, `financiero.effects.ts`
- Modify: registro del feature state/effects donde se registran los otros features (ver T1 Step 1 — probablemente `app.config.ts` con `provideState(FINANCIERO_FEATURE_KEY, reducer)` + `provideEffects(FinancieroEffects)`).
- Test: `financiero.reducer.spec.ts`, `financiero.effects.spec.ts`, `financiero.selectors.spec.ts`

**Interfaces (Produces):** `FINANCIERO_FEATURE_KEY='financiero'`; state slice `caja: { session: CashSession|null; activity: SessionActivity|null; loading: boolean; error: string|null }`; actions `loadOpenSession({branchId})`/Success/Failure/`sessionNotFound`, `loadActivity({sessionId})`/Success/NotModified/Failure, `openSession({branchId, openingAmount})`/Success/Failure, `closeSession({id, declaredAmount})`/Success/Failure, `registerTransaction({id, body})`/Success/Failure; selectors `selectCajaSession`, `selectCajaActivity`, `selectCajaLoading`, `selectCajaSaldo` (derivado), `selectIsCajaOpen`.

- [ ] **Step 1: Write the failing reducer test**

```ts
import { financieroReducer, initialState } from './financiero.reducer';
import * as A from './financiero.actions';

const session = { id: 100, status: 'OPEN', openingAmount: 15000, saldoActual: 18680 } as any;

describe('financiero reducer — caja', () => {
  it('loadOpenSessionSuccess guarda la sesión', () => {
    const s = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    expect(s.caja.session?.id).toBe(100);
    expect(s.caja.loading).toBe(false);
  });
  it('sessionNotFound limpia la sesión (caja cerrada)', () => {
    const open = financieroReducer(initialState, A.loadOpenSessionSuccess({ session }));
    const s = financieroReducer(open, A.sessionNotFound());
    expect(s.caja.session).toBeNull();
  });
  it('loadActivitySuccess guarda el feed', () => {
    const s = financieroReducer(initialState, A.loadActivitySuccess({ activity: { rows: [], otrosMediosTotal: 0, cobrosCount: 0 } }));
    expect(s.caja.activity?.cobrosCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- financiero.reducer`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement state + actions + reducer**

```ts
// financiero.state.ts
import { CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig } from '../models/financiero.model';
export const FINANCIERO_FEATURE_KEY = 'financiero';
export interface FinancieroState {
  caja:    { session: CashSession | null; activity: SessionActivity | null; loading: boolean; error: string | null };
  cobros:  { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  config:  { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
}
export const initialFinancieroState: FinancieroState = {
  caja:   { session: null, activity: null, loading: false, error: null },
  cobros: { list: [], selected: null, loading: false, error: null },
  config: { current: null, saving: false, error: null },
};
```

```ts
// financiero.actions.ts (caja slice — los slices cobros/config se agregan en T5/T6)
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { CashSession, SessionActivity, TransactionType } from '../models/financiero.model';
export const FinancieroCajaActions = createActionGroup({
  source: 'Financiero Caja',
  events: {
    'Load Open Session': props<{ branchId: number }>(),
    'Load Open Session Success': props<{ session: CashSession }>(),
    'Session Not Found': emptyProps(),
    'Load Open Session Failure': props<{ error: string }>(),
    'Load Activity': props<{ sessionId: number }>(),
    'Load Activity Success': props<{ activity: SessionActivity }>(),
    'Load Activity Not Modified': emptyProps(),
    'Load Activity Failure': props<{ error: string }>(),
    'Open Session': props<{ branchId: number; openingAmount: number }>(),
    'Open Session Success': props<{ session: CashSession }>(),
    'Open Session Failure': props<{ error: string }>(),
    'Close Session': props<{ id: number; declaredAmount: number }>(),
    'Close Session Success': props<{ session: CashSession }>(),
    'Close Session Failure': props<{ error: string }>(),
    'Register Transaction': props<{ id: number; body: { branchId: number; type: TransactionType; amount: number; description: string } }>(),
    'Register Transaction Success': emptyProps(),
    'Register Transaction Failure': props<{ error: string }>(),
  },
});
// Re-export individuales usados en los specs/tests:
export const {
  loadOpenSession, loadOpenSessionSuccess, sessionNotFound, loadOpenSessionFailure,
  loadActivity, loadActivitySuccess, loadActivityNotModified, loadActivityFailure,
  openSession, openSessionSuccess, openSessionFailure,
  closeSession, closeSessionSuccess, closeSessionFailure,
  registerTransaction, registerTransactionSuccess, registerTransactionFailure,
} = FinancieroCajaActions;
```

```ts
// financiero.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { initialFinancieroState } from './financiero.state';
import * as Caja from './financiero.actions';
export const initialState = initialFinancieroState;
export const financieroReducer = createReducer(
  initialState,
  on(Caja.loadOpenSession, s => ({ ...s, caja: { ...s.caja, loading: true, error: null } })),
  on(Caja.loadOpenSessionSuccess, (s, { session }) => ({ ...s, caja: { ...s.caja, session, loading: false } })),
  on(Caja.sessionNotFound, s => ({ ...s, caja: { ...s.caja, session: null, activity: null, loading: false } })),
  on(Caja.loadOpenSessionFailure, (s, { error }) => ({ ...s, caja: { ...s.caja, loading: false, error } })),
  on(Caja.loadActivitySuccess, (s, { activity }) => ({ ...s, caja: { ...s.caja, activity } })),
  on(Caja.openSessionSuccess, (s, { session }) => ({ ...s, caja: { ...s.caja, session } })),
  on(Caja.closeSessionSuccess, (s, { session }) => ({ ...s, caja: { ...s.caja, session } })),
);
```

- [ ] **Step 4: Run reducer test (passes)**

Run: `npm test -- financiero.reducer`
Expected: PASS.

- [ ] **Step 5: Write effects + selectors with tests**

`financiero.selectors.ts`: `createFeatureSelector<FinancieroState>(FINANCIERO_FEATURE_KEY)` + `selectCajaSession`, `selectCajaActivity`, `selectCajaLoading`, `selectIsCajaOpen = session?.status==='OPEN'`, `selectCajaSaldo = session?.saldoActual ?? session?.openingAmount ?? 0`.

`financiero.effects.ts` (caja): `loadOpenSession$` → `api.getOpenSession(branchId)` con `switchMap` → si `null` `sessionNotFound()` si no `loadOpenSessionSuccess`; `loadActivity$` → `api.getActivity` con `switchMap`, `isNotModified(res)` → `loadActivityNotModified()` si no Success; `openSession$`/`closeSession$`/`registerTransaction$` con `concatMap`, en éxito re-disparan `loadOpenSession`/`loadActivity` y `notif.success(...)`, en error mapean 409 (`"Ya hay una caja abierta para esta sucursal."`) y muestran `notif.error(...)`.

Effects test (ejemplo, con `provideMockActions`):

```ts
it('loadOpenSession$ emite sessionNotFound cuando el backend devuelve null', () => {
  actions$ = of(loadOpenSession({ branchId: 5 }));
  api.getOpenSession.mockReturnValue(of(null));
  effects.loadOpenSession$.subscribe(a => expect(a).toEqual(sessionNotFound()));
});
it('openSession$ ante 409 mapea el mensaje en español', () => {
  actions$ = of(openSession({ branchId: 5, openingAmount: 1000 }));
  api.openSession.mockReturnValue(throwError(() => ({ status: 409 })));
  effects.openSession$.subscribe(a =>
    expect((a as any).error).toBe('Ya hay una caja abierta para esta sucursal.'));
});
```

- [ ] **Step 6: Run store tests (pass)**

Run: `npm test -- financiero.reducer financiero.effects financiero.selectors`
Expected: PASS.

- [ ] **Step 7: Register the feature store**

En el lugar que registra los features (ver T1 Step 1): `provideState(FINANCIERO_FEATURE_KEY, financieroReducer)` y `provideEffects(FinancieroEffects)`. Verificar que la app compila: `npm run build` → debe avanzar más allá del error de store (los de routing/pages siguen hasta T7+).

- [ ] **Step 8: Commit**

```bash
git add features/financiero/store/ <archivo-registro-state>
git commit -m "feat(financiero): store NgRx slice Caja (sesión + actividad + mutaciones)"
```

---

## Task 5: Store — slice Cobros

**Files:** Modify `store/financiero.{actions,reducer,selectors,effects}.ts` (agregar grupo Cobros). Test: extender los specs.

**Interfaces (Produces):** actions `loadPayments({branchId?, status?})`/Success/Failure, `loadPayment({id})`/Success/Failure, `cancelPayment({id, reason})`/Success/Failure. Selectors `selectCobrosList`, `selectCobrosLoading`, `selectCobroSelected`.

- [ ] **Step 1: Failing reducer test**

```ts
it('loadPaymentsSuccess guarda la lista', () => {
  const s = financieroReducer(initialState, A.loadPaymentsSuccess({ items: [{ id: 1 } as any] }));
  expect(s.cobros.list.length).toBe(1);
});
it('cancelPaymentSuccess actualiza el seleccionado a CANCELLED', () => {
  const sel = financieroReducer(initialState, A.loadPaymentSuccess({ payment: { id: 9, status: 'PROCESSED' } as any }));
  const s = financieroReducer(sel, A.cancelPaymentSuccess({ payment: { id: 9, status: 'CANCELLED' } as any }));
  expect(s.cobros.selected?.status).toBe('CANCELLED');
});
```

- [ ] **Step 2: Run (fails)** — `npm test -- financiero.reducer` → FAIL.
- [ ] **Step 3: Add actions group `FinancieroCobrosActions`, reducer `on(...)` handlers, selectors.**
- [ ] **Step 4: Add effects** `loadPayments$` (switchMap → `api.listPayments`), `loadPayment$` (switchMap), `cancelPayment$` (concatMap → `api.cancelPayment`, éxito → re-load detalle + `notif.success('Pago cancelado · reversa en caja')`). Effects test for cancel re-load.
- [ ] **Step 5: Run** `npm test -- financiero.reducer financiero.effects financiero.selectors` → PASS.
- [ ] **Step 6: Commit** `feat(financiero): store NgRx slice Cobros (lista + detalle + cancelar)`.

---

## Task 6: Store — slice Config fiscal

**Files:** Modify store. **Interfaces:** actions `loadFiscalConfig({tenantId})`/Success/Failure, `saveFiscalConfig({body})`/Success/Failure. Selectors `selectFiscalConfig`, `selectFiscalSaving`.

- [ ] **Step 1: Failing reducer test** (`saveFiscalConfigSuccess` guarda `config.current`, `saving:false`).
- [ ] **Step 2: Run (fails).**
- [ ] **Step 3: Actions group `FinancieroConfigActions` + reducer + selectors.**
- [ ] **Step 4: Effects** `loadFiscalConfig$` (switchMap), `saveFiscalConfig$` (concatMap → `api.saveFiscalConfig`, éxito → `notif.success('Configuración fiscal guardada')`). Effects test.
- [ ] **Step 5: Run store tests → PASS.**
- [ ] **Step 6: Commit** `feat(financiero): store NgRx slice Config fiscal`.

---

## Task 7: Routing + shell + sidebar

**Files:**
- Rewrite: `features/financiero/financiero.routes.ts`
- Create: `features/financiero/financiero-shell/financiero-shell.component.ts`
- Verify: `app.routes.ts` (la ruta lazy `financiero` ya existe → debe seguir apuntando a `FINANCIERO_ROUTES`).
- Possibly modify: `layout/sidebar/sidebar.nav.ts` (mantener una sola entrada Financiero; sin sub-items — la nav es interna).

**Interfaces (Produces):** `FINANCIERO_ROUTES` con shell + children `caja` (default), `cobros`, `cobros/:id`, `config-fiscal` (`saasAdminGuard`), `coberturas`, `liquidaciones`.

- [ ] **Step 1: Implement the shell**

`financiero-shell.component.ts`: standalone, OnPush, `<router-outlet>` dentro de un layout con **sub-nav interna** (links a Caja / Cobros / Config fiscal). Config fiscal solo visible para SAAS_ADMIN (`*hasRole="'SAAS_ADMIN'"`). Usar `routerLink` + `routerLinkActive`. Seguir el look del shell existente (mismo de Muestras).

- [ ] **Step 2: Rewrite routes**

```ts
import { Routes } from '@angular/router';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';   // verificar path/nombre real del export
export const FINANCIERO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./financiero-shell/financiero-shell.component').then(m => m.FinancieroShellComponent),
    children: [
      { path: '', redirectTo: 'caja', pathMatch: 'full' },
      { path: 'caja',          loadComponent: () => import('./pages/caja/caja.page').then(m => m.CajaPage) },
      { path: 'cobros',        loadComponent: () => import('./pages/cobros/cobros.page').then(m => m.CobrosPage) },
      { path: 'cobros/:id',    loadComponent: () => import('./pages/cobros/cobro-detalle.page').then(m => m.CobroDetallePage) },
      { path: 'config-fiscal', canMatch: [saasAdminGuard], loadComponent: () => import('./pages/config-fiscal/config-fiscal.page').then(m => m.ConfigFiscalPage) },
      { path: 'coberturas',    loadComponent: () => import('./pages/placeholder/modulo-no-disponible.component').then(m => m.ModuloNoDisponibleComponent), data: { kind: 'coberturas' } },
      { path: 'liquidaciones', loadComponent: () => import('./pages/placeholder/modulo-no-disponible.component').then(m => m.ModuloNoDisponibleComponent), data: { kind: 'liquidaciones' } },
    ],
  },
];
```

> Crear stubs mínimos de las pages (`export class CajaPage {}` etc.) para que el build compile; T8–T10 las implementan. Verificar el nombre/forma real de `saasAdminGuard` (puede ser `CanActivateFn` en vez de `CanMatchFn` — ajustar a `canActivate` si corresponde).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: BUILD SUCCESS (con pages stub). Si el sidebar referenciaba rutas viejas (pagos/movimientos), corregir.

- [ ] **Step 4: Commit** `feat(financiero): shell con nav interna + routing + guard SAAS_ADMIN`.

---

## Task 8: Pantalla Caja + modales

**Files:** `pages/caja/caja.page.ts` (+ `.spec.ts`), `pages/caja/components/{abrir-caja,movimiento,arqueo}-modal.component.ts`, presentacionales `components/metodo-chip.component.ts`, `components/estado-caja-pill.component.ts`. **Referencia visual:** `design_handoff.../js/fin-caja.jsx` + README §"1. CAJA".

**Comportamiento:** on init, lee `branchId()` de `OperatorBranchContextService` y dispatch `loadOpenSession({branchId})`. Si `selectIsCajaOpen` → arranca `PollingService.startPolling({key:'financiero-caja', intervalMs:5000, poll: () => { dispatch(loadActivity({sessionId})); dispatch(loadOpenSession...) ; return of(null) }})`, `destroyRef.onDestroy(stop)`. KPIs con `selectCajaSaldo` (hero), `activity.otrosMediosTotal`, `activity.cobrosCount`. Feed en `ui-table` con `metodo-chip` + flag efectivo. Acciones: "Registrar movimiento" (abre modal), "Cobrar atención" → `router.navigate(['/financiero/cobrar'])` (sub-3), "Cerrar caja" envuelto en `*hasRole="'ADMINISTRADOR'"`. Estados cargando/vacío/error/cerrada con `ui-empty-state`. Montos con `currencyAr`. `ui-refresh-indicator`.

Modales (PrimeNG `p-dialog`): **AbrirCaja** (monto → `dispatch(openSession)`), **Movimiento** (segmented INGRESS/EGRESS + monto + descripción → `dispatch(registerTransaction)`), **Arqueo** (esperado read-only vs declarado input vs diferencia computada con color: 0 ok / ≤500 ámbar / >500 rojo; → `dispatch(closeSession)`).

- [ ] **Step 1: Failing smoke test** — render `CajaPage` con store mock en estado "cerrada" y assert que muestra el empty-state "La caja está cerrada" + CTA "Abrir caja". (Usar `provideMockStore` con `selectIsCajaOpen=false`.)
- [ ] **Step 2: Run (fails).**
- [ ] **Step 3: Implement `metodo-chip`, `estado-caja-pill` presentacionales** (input método/estado → label+icono+color de `METHOD_META`).
- [ ] **Step 4: Implement `CajaPage`** (estados, KPIs, feed, acciones, polling, role gating) recreando el handoff con el design system.
- [ ] **Step 5: Implement los 3 modales** con su lógica de validación (montos > 0, descripción obligatoria, diferencia en vivo).
- [ ] **Step 6: Run smoke test (passes)** + `npm run build`.
- [ ] **Step 7: Commit** `feat(financiero): pantalla Caja (estado, KPIs, feed, modales abrir/movimiento/arqueo)`.

---

## Task 9: Cobros (lista + detalle + cancelar)

**Files:** `pages/cobros/cobros.page.ts` (+ `.spec.ts`), `pages/cobros/cobro-detalle.page.ts`, `pages/cobros/components/cancelar-pago-modal.component.ts`, presentacionales `components/estado-pago-pill.component.ts`, `components/comprobante-card.component.ts`. **Referencia:** `js/fin-pago.jsx` + README §"3. COBROS".

**Comportamiento:** lista on init → `loadPayments({branchId})`; `ui-table` con columnas id, hora (`createdAt` con date pipe), comprobante, paciente, chips métodos, monto (`currencyAr`, tachado si CANCELLED), `estado-pago-pill`. **Paciente:** resolver desde `attentionId` con el API de atención existente — preferir una resolución batch (un request por la página con los ids); si el API no lo soporta, mostrar `attentionId` y documentar el N+1. Click fila → `router.navigate(['/financiero/cobros', id])`. Detalle → `loadPayment({id})`: datos, líneas con flag efectivo, `comprobante-card`, acciones; "Cancelar pago" (solo PROCESSED) → modal motivo obligatorio → `cancelPayment({id, reason})`. Banner si CANCELLED.

- [ ] **Step 1: Failing smoke test** — `CobrosPage` con lista mock de 2 pagos renderiza 2 filas y el pago CANCELLED aparece con clase tachada.
- [ ] **Step 2: Run (fails).**
- [ ] **Step 3: Implement `estado-pago-pill`, `comprobante-card` presentacionales.**
- [ ] **Step 4: Implement `CobrosPage`** (lista, resolución de paciente, navegación).
- [ ] **Step 5: Implement `CobroDetallePage` + `cancelar-pago-modal`.**
- [ ] **Step 6: Run smoke test + build.**
- [ ] **Step 7: Commit** `feat(financiero): Cobros lista + detalle/ticket + cancelar pago`.

---

## Task 10: Config fiscal + placeholders

**Files:** `pages/config-fiscal/config-fiscal.page.ts`, `pages/placeholder/modulo-no-disponible.component.ts`. **Referencia:** `js/fin-config.jsx` + README §"4" y §placeholders.

**Comportamiento:** Config fiscal (la ruta ya está gateada por `saasAdminGuard`; fallback empty-state "Acceso restringido" si igual se renderiza sin rol): picker de proveedor (ARCA/COLPPY/NONE de `PROVIDER_META`), credenciales dinámicas por proveedor (`configJson`), guardar → `saveFiscalConfig`. Placeholder: `ModuloNoDisponibleComponent` lee `route.data.kind` ('coberturas'|'liquidaciones') y muestra el empty-state "Próximamente".

- [ ] **Step 1: Failing smoke test** — `ModuloNoDisponibleComponent` con `kind='coberturas'` muestra "Coberturas" + "Módulo no disponible".
- [ ] **Step 2: Run (fails).**
- [ ] **Step 3: Implement `ModuloNoDisponibleComponent`.**
- [ ] **Step 4: Implement `ConfigFiscalPage`** (picker + credenciales dinámicas + guardar).
- [ ] **Step 5: Run smoke test + build.**
- [ ] **Step 6: Commit** `feat(financiero): config fiscal (SAAS_ADMIN) + placeholders coberturas/liquidaciones`.

---

## Task 11: Verificación de cierre

- [ ] **Step 1: Suite completa del feature**

Run: `npm test -- financiero`
Expected: todos los specs del feature PASS.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: BUILD SUCCESS, sin referencias colgantes al scaffold viejo.

- [ ] **Step 3: `simplify` sobre el diff** (reuso/duplicación/altura).

- [ ] **Step 4: Smoke visual manual** (perfil dev, DB 3307): login como SECRETARIA → `/financiero` → Caja cerrada → abrir → registrar movimiento → ver feed/KPIs; login ADMINISTRADOR → cerrar caja (arqueo); Cobros lista/detalle/cancelar; SAAS_ADMIN → config fiscal. Verificar mensajes de error en español (409/422).

---

## Self-Review (cobertura vs. spec)

- §1/§5 borrar scaffold + estructura → T1, T2–T10 crean los archivos nuevos. ✔
- §4 contratos API → T3 (todos los endpoints). ✔
- §6.1 Caja (estados, KPIs, feed, polling, modales, arqueo solo ADMIN) → T4 (store) + T8 (UI). ✔
- §6.2 Cobros (lista, detalle, cancelar, paciente desde attentionId) → T5 (store) + T9 (UI). ✔
- §6.3 Config fiscal (SAAS_ADMIN) → T6 (store) + T10 (UI) + T7 (guard). ✔
- §6.4 placeholders → T10. ✔
- §7 navegación interna + shell → T7. ✔
- §8 reglas/mensajes de error → T4/T5 effects (mapeo) + T8/T9 UI. ✔
- §9 testing (reducers/effects/selectors/guards + smoke pages) → tests en cada task + T11. ✔
- §10 riesgos (paciente N+1, cobro = sub-3) → T9 (documentar N+1), T8 (botón rutea a sub-3). ✔

### Notas para el implementador
- Verificar exports reales de `core/refresh` (`withPolling`, sentinel 304, `isNotModified`) y de `saasAdminGuard` (CanMatch vs CanActivate) — ajustar imports/firmas.
- Confirmar dónde se registran `provideState`/`provideEffects` de los features (T1 Step 1) y replicar el patrón.
- Recrear la fidelidad visual del handoff con el design system del repo; NO portar el CSS/JSX del prototipo literal.
