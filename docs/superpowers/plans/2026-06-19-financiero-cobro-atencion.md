# Cobro en la atención (Sub-proyecto 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-121](https://exequielsantoro.atlassian.net/browse/KAN-121)
> **Spec:** `docs/superpowers/specs/2026-06-19-financiero-cobro-atencion-design.md`
> **Branch:** `feat/financiero-cobro-atencion` (ya activa)

**Goal:** Construir el cobro del paciente dentro del flujo de atención — registrar el pago contra `POST /api/v1/financiero/payments`, mostrar el comprobante, y avanzar la atención (`endBilling`) — usable tanto en el wizard de atención (paso `facturación`) como en la ruta directa `/financiero/cobrar/:attentionId`.

**Architecture:** Un `CobroAtencionComponent` compartido (store-connected) es el corazón: lee `selectPricing`/`selectDetail` (store atención) y `selectIsCajaOpen` (store financiero), arma las líneas multi-método, valida suma=monto, dispara `registerPayment` (nuevo slice `cobro` del store financiero) y, tras el éxito, muestra el comprobante y dispara `endBilling`. Se monta embebido en el paso `facturación` del wizard y como página en la ruta directa. El paso `cobro` (liviano) es solo un resumen + el footer del wizard dispara `endCollection`.

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico (createAction/createReducer/createEffect/createSelector), PrimeNG, Tailwind, Vitest. Reusa el módulo financiero del Sub-2 (`features/financiero/**`) y el feature atención (`features/analitica/**`).

## Global Constraints

- **Mensajes de UI en español, sin leak de internals** (CLAUDE.md regla #4). Todo `HttpErrorResponse` pasa por un mapeo. Sin emojis Unicode — usar PrimeIcons (`<i class="pi pi-...">`).
- **NgRx clásico** (skill `ngrx-backend-request`): `createAction` + `props`, `createReducer`, `createEffect`, `createSelector`; mutations con `concatMap`; sin `@ngrx/entity`; `selectSignal`/`store.selectSignal` en componentes.
- **Componentes con template inline** (NO `templateUrl`) para que `vitest` los corra. Runner: `npx vitest run <pattern>`.
- **OnPush** por default; signals para estado local de UI (skill `angular-conventions`).
- **Reuso obligatorio** (spec §7): `CurrencyArPipe` (`@shared/pipes/currency-ar.pipe`), `NotificationService` (`@core/services/notification.service`), `fin-metodo-chip` (`MetodoChipComponent`), `fin-comprobante-card` (`ComprobanteCardComponent`), `METHOD_META`/`COMPROBANTE_META` y modelos de `features/financiero/models/financiero.model.ts`. No recrear.
- **Backend ya existe**: `POST /api/v1/financiero/payments` (KAN-119). No tocar backend.

### Contratos backend confirmados (fase de plan)

`POST /api/v1/financiero/payments` — `RegisterPaymentRequest`:
```
{ attentionId: Long, branchId: Long, totalAmount: BigDecimal, copaymentAmount: BigDecimal?,
  collections: [{ method: PaymentMethod, amount: BigDecimal, reference: String? }]  (NotEmpty),
  details: [{ analysisId: Long, coverageId: Long?, covered: boolean, chargedAmount: BigDecimal }]?,
  operatorOptedOutOfElectronic: boolean }
```
- **Única validación de monto del backend:** `totalAmount == Σ(collections.amount)`. `details[]` es opcional/informativo (solo se persiste).
- Respuesta `201` → `RegisterPaymentResponse = { payment: PaymentResponse, fiscalReference: FiscalInvoiceReferenceResponse }`. El campo JSON es **`fiscalReference`** (no `fiscalInvoiceReference`). `payment` tiene la misma forma que el modelo front `Payment`; `fiscalReference` = modelo front `FiscalInvoiceReference`.
- **Errores** (ambos `409 CONFLICT`, mensaje español seguro en `error.message`):
  - `NoOpenCashSessionException` → `"No hay caja abierta para la sucursal indicada"`.
  - `InvalidPaymentAmountException` → `"El monto total no coincide con la suma de los métodos de pago"`.
- El backend **linkea el pago a la atención internamente** (S13). El front NO dispara `addPayment` — solo `endBilling` después del éxito.

### Mapeo de datos (pricing/detail → request)

- `attentionId` = input del componente.
- `branchId` = `detail().branchId` ?? `OperatorBranchContextService.branchId()`.
- **"monto a cobrar"** (target de las líneas + validación suma) = `pricing.copayment` (lo que paga el paciente: copago si hay cobertura, total si particular).
- `totalAmount` = Σ(collections.amount) (debe igualar el monto a cobrar).
- `copaymentAmount` = `detail().copaymentAmount` ?? `pricing.copayment`.
- `details[]` = `pricing.items` → `{ analysisId: item.analysisId, coverageId: detail().insurancePlanId ?? null, covered: item.authorized, chargedAmount: item.precioPaciente }`.
- `operatorOptedOutOfElectronic` = estado del checkbox "No facturar electrónicamente (Factura X)".

### Archivos a crear / modificar

| Acción | Archivo | Responsabilidad |
|---|---|---|
| Modificar | `features/financiero/models/financiero.model.ts` | + `CreatePaymentRequest`, `CollectionItemInput`, `PaymentDetailItemInput`, `RegisterPaymentResponse` |
| Modificar | `features/financiero/services/financiero-api.service.ts` | + `createPayment(body)` → POST /payments |
| Modificar | `features/financiero/store/financiero.state.ts` | + sub-slice `cobro` |
| Modificar | `features/financiero/store/financiero.actions.ts` | + `registerPayment*`, `resetCobro` |
| Modificar | `features/financiero/store/financiero.reducer.ts` | + reducer del slice `cobro` |
| Modificar | `features/financiero/store/financiero.effects.ts` | + `registerPayment$` + `mapRegisterPaymentError` |
| Modificar | `features/financiero/store/financiero.selectors.ts` | + `selectCobroSubmitting/Result/Error` |
| Crear | `features/financiero/components/cobro-atencion/cobro-atencion.component.ts` | Componente de cobro compartido (form + éxito + comprobante) |
| Crear | `features/financiero/components/cobro-atencion/cobro-atencion.component.spec.ts` | Smoke tests |
| Modificar | `features/financiero/financiero.routes.ts` | + ruta `cobrar/:attentionId` |
| Crear | `features/analitica/pages/atencion/atencion-wizard/steps/cobro-step/cobro-step.component.ts` | Paso `cobro` liviano (resumen) |
| Modificar | `features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` | `@case` cobro/facturación, `advanceCurrent`, footer, `continueDisabled` |
| Modificar | `features/financiero/pages/caja/caja.page.ts` | botón "Cobrar atención" → `/turnos/recepcion` |
| Modificar | `features/financiero/pages/cobros/cobros.page.ts` | botones "Nuevo cobro"/"Cobrar una atención" → `/turnos/recepcion` |

---

## Task 1: Modelos + DTO + `createPayment` en el service

**Files:**
- Modify: `src/app/features/financiero/models/financiero.model.ts`
- Modify: `src/app/features/financiero/services/financiero-api.service.ts`
- Test: `src/app/features/financiero/services/financiero-api.service.spec.ts`

**Interfaces:**
- Produces: `CreatePaymentRequest`, `CollectionItemInput`, `PaymentDetailItemInput`, `RegisterPaymentResponse` (modelos); `FinancieroApiService.createPayment(body: CreatePaymentRequest): Observable<RegisterPaymentResponse>`.
- Consumes: `PaymentMethod`, `Payment`, `FiscalInvoiceReference` (ya existen en el modelo).

- [ ] **Step 1: Agregar los tipos al modelo**

En `financiero.model.ts`, al final del archivo (después de las interfaces existentes `Collection`/`PaymentDetail`/`FiscalInvoiceReference`):

```ts
/** Línea de método de pago para registrar un cobro (request al backend). */
export interface CollectionItemInput {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
}

/** Detalle por análisis del cobro (request). Informativo: el backend solo lo persiste. */
export interface PaymentDetailItemInput {
  analysisId: number;
  coverageId: number | null;
  covered: boolean;
  chargedAmount: number;
}

/** Body de POST /api/v1/financiero/payments — espejo de RegisterPaymentRequest. */
export interface CreatePaymentRequest {
  attentionId: number;
  branchId: number;
  totalAmount: number;
  copaymentAmount: number;
  collections: CollectionItemInput[];
  details: PaymentDetailItemInput[];
  operatorOptedOutOfElectronic: boolean;
}

/** Respuesta 201 de POST /payments. */
export interface RegisterPaymentResponse {
  payment: Payment;
  fiscalReference: FiscalInvoiceReference;
}
```

- [ ] **Step 2: Escribir el test del service (falla)**

En `financiero-api.service.spec.ts`, agregar dentro del `describe` existente (reusar el setup con `HttpTestingController` que ya tiene el archivo):

```ts
it('createPayment hace POST a /payments con el body y devuelve la respuesta', () => {
  const body = {
    attentionId: 7, branchId: 3, totalAmount: 1500, copaymentAmount: 1500,
    collections: [{ method: 'CASH' as const, amount: 1500, reference: null }],
    details: [{ analysisId: 10, coverageId: null, covered: false, chargedAmount: 1500 }],
    operatorOptedOutOfElectronic: false,
  };
  const resp = {
    payment: { id: 99, tenantId: 1, attentionId: 7, branchId: 3, totalAmount: 1500,
      copaymentAmount: 1500, status: 'CREATED', cashTransactionId: 1, cancelledAt: null,
      cancelReason: null, collections: [], details: [] },
    fiscalReference: { id: 1, paymentId: 99, provider: 'NONE', comprobanteTipo: 'FACTURA_X',
      internalReference: 'R-0001', externalInvoiceId: null, electronic: false, isVoid: false,
      emittedAt: '2026-06-19T10:00:00Z' },
  };

  let result: unknown;
  service.createPayment(body).subscribe(r => (result = r));

  const req = httpMock.expectOne('/api/v1/financiero/payments');
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(body);
  req.flush(resp);

  expect(result).toEqual(resp);
});
```

- [ ] **Step 3: Correr el test (falla)**

Run: `npx vitest run financiero-api.service`
Expected: FAIL — `service.createPayment is not a function`.

- [ ] **Step 4: Implementar `createPayment`**

En `financiero-api.service.ts`: ampliar el import del modelo con `CreatePaymentRequest, RegisterPaymentResponse` y agregar el método después de `cancelPayment`:

```ts
createPayment(body: CreatePaymentRequest): Observable<RegisterPaymentResponse> {
  return this.http.post<RegisterPaymentResponse>(`${this.base}/payments`, body);
}
```

- [ ] **Step 5: Correr el test (pasa)**

Run: `npx vitest run financiero-api.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/financiero/models/financiero.model.ts src/app/features/financiero/services/financiero-api.service.ts src/app/features/financiero/services/financiero-api.service.spec.ts
git commit -m "feat(financiero): createPayment en api service + DTOs de cobro"
```

---

## Task 2: Store — slice `cobro` (registrar pago)

**Files:**
- Modify: `src/app/features/financiero/store/financiero.state.ts`
- Modify: `src/app/features/financiero/store/financiero.actions.ts`
- Modify: `src/app/features/financiero/store/financiero.reducer.ts`
- Modify: `src/app/features/financiero/store/financiero.effects.ts`
- Modify: `src/app/features/financiero/store/financiero.selectors.ts`
- Test: `src/app/features/financiero/store/financiero.reducer.spec.ts`, `financiero.effects.spec.ts`, `financiero.selectors.spec.ts`

**Interfaces:**
- Consumes: `FinancieroApiService.createPayment` (Task 1), `CreatePaymentRequest`, `RegisterPaymentResponse`.
- Produces: actions `registerPayment({ body })`, `registerPaymentSuccess({ result })`, `registerPaymentFailure({ error })`, `resetCobro()`; selectors `selectCobroSubmitting`, `selectCobroResult`, `selectCobroError`. Estado: `state.cobro = { submitting, result, error }`.

- [ ] **Step 1: Ampliar el state**

En `financiero.state.ts`: importar `RegisterPaymentResponse` y agregar el slice `cobro`:

```ts
import { CashSession, SessionActivity, PaymentListItem, Payment, TenantFiscalConfig, RegisterPaymentResponse } from '../models/financiero.model';

export interface FinancieroState {
  caja:   { session: CashSession | null; activity: SessionActivity | null; loading: boolean; error: string | null };
  cobros: { list: PaymentListItem[]; selected: Payment | null; loading: boolean; error: string | null };
  cobro:  { submitting: boolean; result: RegisterPaymentResponse | null; error: string | null };
  config: { current: TenantFiscalConfig | null; saving: boolean; error: string | null };
}

export const initialFinancieroState: FinancieroState = {
  caja:   { session: null, activity: null, loading: false, error: null },
  cobros: { list: [], selected: null, loading: false, error: null },
  cobro:  { submitting: false, result: null, error: null },
  config: { current: null, saving: false, error: null },
};
```

- [ ] **Step 2: Agregar las actions**

En `financiero.actions.ts` (importar `CreatePaymentRequest, RegisterPaymentResponse` del modelo si hace falta), agregar:

```ts
// ── cobro: registrar pago de atención ──
export const registerPayment = createAction(
  '[Financiero Cobro] Register Payment', props<{ body: CreatePaymentRequest }>());
export const registerPaymentSuccess = createAction(
  '[Financiero Cobro] Register Payment Success', props<{ result: RegisterPaymentResponse }>());
export const registerPaymentFailure = createAction(
  '[Financiero Cobro] Register Payment Failure', props<{ error: string }>());
export const resetCobro = createAction('[Financiero Cobro] Reset');
```

- [ ] **Step 3: Escribir el test del reducer (falla)**

En `financiero.reducer.spec.ts`:

```ts
it('registerPayment marca submitting y limpia error', () => {
  const s = financieroReducer(initialFinancieroState, registerPayment({ body: {} as any }));
  expect(s.cobro.submitting).toBe(true);
  expect(s.cobro.error).toBeNull();
});

it('registerPaymentSuccess guarda result y baja submitting', () => {
  const result = { payment: { id: 1 } as any, fiscalReference: { id: 2 } as any };
  const s = financieroReducer(initialFinancieroState, registerPaymentSuccess({ result }));
  expect(s.cobro.submitting).toBe(false);
  expect(s.cobro.result).toEqual(result);
});

it('registerPaymentFailure guarda error y baja submitting', () => {
  const s = financieroReducer(initialFinancieroState, registerPaymentFailure({ error: 'X' }));
  expect(s.cobro.submitting).toBe(false);
  expect(s.cobro.error).toBe('X');
});

it('resetCobro vuelve el slice al inicial', () => {
  const dirty = financieroReducer(initialFinancieroState, registerPaymentFailure({ error: 'X' }));
  const s = financieroReducer(dirty, resetCobro());
  expect(s.cobro).toEqual(initialFinancieroState.cobro);
});
```

- [ ] **Step 4: Correr el test (falla)**

Run: `npx vitest run financiero.reducer`
Expected: FAIL — los handlers `registerPayment*` no existen en el reducer.

- [ ] **Step 5: Implementar los handlers del reducer**

En `financiero.reducer.ts`, agregar (importar las actions nuevas) dentro del `createReducer`:

```ts
on(registerPayment, (state) => ({
  ...state, cobro: { ...state.cobro, submitting: true, error: null },
})),
on(registerPaymentSuccess, (state, { result }) => ({
  ...state, cobro: { submitting: false, result, error: null },
})),
on(registerPaymentFailure, (state, { error }) => ({
  ...state, cobro: { ...state.cobro, submitting: false, error },
})),
on(resetCobro, (state) => ({
  ...state, cobro: { submitting: false, result: null, error: null },
})),
```

- [ ] **Step 6: Correr el test del reducer (pasa)**

Run: `npx vitest run financiero.reducer`
Expected: PASS.

- [ ] **Step 7: Agregar los selectors**

En `financiero.selectors.ts`:

```ts
export const selectCobroSlice = createSelector(selectFinancieroState, s => s.cobro);
export const selectCobroSubmitting = createSelector(selectCobroSlice, c => c.submitting);
export const selectCobroResult = createSelector(selectCobroSlice, c => c.result);
export const selectCobroError = createSelector(selectCobroSlice, c => c.error);
```

(Usar el mismo `selectFinancieroState` raíz que ya usan los demás selectors del archivo.)

- [ ] **Step 8: Test de selector (falla → pasa)**

En `financiero.selectors.spec.ts`:

```ts
it('selectCobroSubmitting / Result / Error leen el slice cobro', () => {
  const state: any = { [FINANCIERO_FEATURE_KEY]: { ...initialFinancieroState,
    cobro: { submitting: true, result: { payment: { id: 9 } } as any, error: 'E' } } };
  expect(selectCobroSubmitting.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toBe(true);
  expect(selectCobroResult.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toEqual({ payment: { id: 9 } });
  expect(selectCobroError.projector(state[FINANCIERO_FEATURE_KEY].cobro)).toBe('E');
});
```

Run: `npx vitest run financiero.selectors` → ajustar imports hasta PASS.

- [ ] **Step 9: Escribir el test del effect (falla)**

En `financiero.effects.spec.ts` (reusar el patrón `provideMockActions` + spy del `FinancieroApiService` + `NotificationService` que ya usa el archivo):

```ts
it('registerPayment$ éxito → registerPaymentSuccess con el result', async () => {
  const result = { payment: { id: 5 }, fiscalReference: { id: 1 } } as any;
  api.createPayment.mockReturnValue(of(result));
  actions$ = of(registerPayment({ body: {} as any }));
  const effects = TestBed.inject(FinancieroEffects);
  const action = await firstValueFrom(effects.registerPayment$);
  expect(api.createPayment).toHaveBeenCalled();
  expect(action).toEqual(registerPaymentSuccess({ result }));
});

it('registerPayment$ 409 "caja" → mensaje sin-caja + notif.error', async () => {
  api.createPayment.mockReturnValue(throwError(() => new HttpErrorResponse({
    status: 409, error: { message: 'No hay caja abierta para la sucursal indicada' } })));
  actions$ = of(registerPayment({ body: {} as any }));
  const effects = TestBed.inject(FinancieroEffects);
  const action = await firstValueFrom(effects.registerPayment$);
  expect((action as ReturnType<typeof registerPaymentFailure>).error)
    .toBe('No se puede cobrar: no hay una caja abierta.');
  expect(notif.error).toHaveBeenCalledWith('No se puede cobrar: no hay una caja abierta.');
});

it('registerPayment$ 409 "monto" → mensaje de montos', async () => {
  api.createPayment.mockReturnValue(throwError(() => new HttpErrorResponse({
    status: 409, error: { message: 'El monto total no coincide con la suma de los métodos de pago' } })));
  actions$ = of(registerPayment({ body: {} as any }));
  const effects = TestBed.inject(FinancieroEffects);
  const action = await firstValueFrom(effects.registerPayment$);
  expect((action as ReturnType<typeof registerPaymentFailure>).error)
    .toBe('La suma de los medios de pago no coincide con el total.');
});
```

Asegurarse de que el mock del api en el `beforeEach` incluya `createPayment: vi.fn()`.

- [ ] **Step 10: Correr el test del effect (falla)**

Run: `npx vitest run financiero.effects`
Expected: FAIL — `effects.registerPayment$` no existe.

- [ ] **Step 11: Implementar el effect + mapeo de error**

En `financiero.effects.ts`: importar las 3 actions nuevas; agregar el helper de mapeo arriba (junto a `mapCajaError`/`mapCobrosError`):

```ts
function mapRegisterPaymentError(e: HttpErrorResponse): string {
  const apiMsg = typeof e.error?.message === 'string' ? e.error.message : '';
  if (e.status === 409) {
    if (/caja/i.test(apiMsg)) return 'No se puede cobrar: no hay una caja abierta.';
    if (/monto|suma|importe/i.test(apiMsg)) return 'La suma de los medios de pago no coincide con el total.';
    return 'No se pudo registrar el cobro. Revisá la caja y los montos e intentá de nuevo.';
  }
  if (e.status === 422) return 'Los datos del cobro son inválidos.';
  return 'Ocurrió un error al registrar el cobro. Intentá de nuevo.';
}
```

Y el effect dentro de la clase:

```ts
registerPayment$ = createEffect(() =>
  this.actions$.pipe(
    ofType(registerPayment),
    concatMap(({ body }) =>
      this.api.createPayment(body).pipe(
        map(result => {
          this.notif.success('Cobro registrado correctamente.');
          return registerPaymentSuccess({ result });
        }),
        catchError((e: HttpErrorResponse) => {
          const error = mapRegisterPaymentError(e);
          this.notif.error(error);
          return of(registerPaymentFailure({ error }));
        }),
      ),
    ),
  ),
);
```

- [ ] **Step 12: Correr toda la suite del store (pasa)**

Run: `npx vitest run financiero.reducer financiero.effects financiero.selectors`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add src/app/features/financiero/store/
git commit -m "feat(financiero): slice cobro (registerPayment) + effect con mapeo de errores"
```

---

## Task 3: `CobroAtencionComponent` (componente compartido)

**Files:**
- Create: `src/app/features/financiero/components/cobro-atencion/cobro-atencion.component.ts`
- Test: `src/app/features/financiero/components/cobro-atencion/cobro-atencion.component.spec.ts`

**Interfaces:**
- Consumes: store financiero (`registerPayment`, `resetCobro`, `loadOpenSession`, `selectIsCajaOpen`, `selectCajaSession`, `selectCobroSubmitting`, `selectCobroResult`); store atención (`loadAtencion`, `loadPricing`, `endBilling`, `selectDetail`, `selectPricing`); `OperatorBranchContextService`; `MetodoChipComponent`, `ComprobanteCardComponent`, `CurrencyArPipe`, `METHOD_META`, `PaymentMethod`.
- Produces: `CobroAtencionComponent` con inputs `attentionId = input.required<number>()` y `embedded = input<boolean>(false)`. En `embedded=true` (wizard) el éxito muestra "Continuar" → `endBilling` (el wizard auto-avanza). En `embedded=false` (ruta) muestra "Volver a caja" / "Cobrar otra atención".

- [ ] **Step 1: Escribir el componente**

Crear `cobro-atencion.component.ts`. Template **inline**. Lógica:

```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
import { MetodoChipComponent } from '../metodo-chip.component';
import { ComprobanteCardComponent } from '../comprobante-card.component';
import { METHOD_META, PaymentMethod } from '../../models/financiero.model';
import {
  registerPayment, resetCobro, loadOpenSession,
} from '../../store/financiero.actions';
import {
  selectIsCajaOpen, selectCobroSubmitting, selectCobroResult,
} from '../../store/financiero.selectors';
import {
  loadAtencion, loadPricing, endBilling,
} from '@features/analitica/store/atencion/atencion.actions';
import {
  selectDetail, selectPricing,
} from '@features/analitica/store/atencion/atencion.selectors';

interface LineaCobro { id: number; method: PaymentMethod; amount: number; reference: string; }

@Component({
  selector: 'fin-cobro-atencion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CurrencyArPipe, MetodoChipComponent, ComprobanteCardComponent],
  template: `
    <div class="fin-cobro">
      <!-- ÉXITO -->
      @if (result(); as r) {
        <div class="fin-cobro__exito" data-testid="cobro-exito">
          <div class="fin-cobro__ring"><i class="pi pi-check"></i></div>
          <h2>Cobraste {{ r.payment.totalAmount | currencyAr }}</h2>
          <fin-comprobante-card [ref]="r.fiscalReference" />
          <div class="fin-cobro__exito-actions">
            <p-button label="Imprimir" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="imprimir()" />
            @if (embedded()) {
              <p-button label="Continuar" icon="pi pi-arrow-right" (onClick)="continuarTrasExito()" />
            } @else {
              <p-button label="Cobrar otra atención" severity="secondary" (onClick)="cobrarOtra()" />
              <p-button label="Volver a caja" (onClick)="continuarTrasExito()" />
            }
          </div>
        </div>
      } @else {
        <!-- BLOQUEO SIN CAJA -->
        @if (!cajaAbierta()) {
          <div class="fin-cobro__sin-caja" data-testid="cobro-sin-caja">
            <i class="pi pi-lock"></i>
            <p>No se puede cobrar: no hay una caja abierta.</p>
            <p-button label="Abrir caja" icon="pi pi-unlock" (onClick)="irACaja()" />
          </div>
        } @else {
          <!-- DESGLOSE -->
          <section class="fin-cobro__desglose">
            <div class="fin-cobro__row"><span>Total de estudios</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
            <div class="fin-cobro__row"><span>Cubierto por obra social</span><b>{{ cubierto() | currencyAr }}</b></div>
            <div class="fin-cobro__row fin-cobro__row--target">
              <span>A cobrar al paciente</span><b>{{ aCobrar() | currencyAr }}</b>
            </div>
          </section>

          <!-- LÍNEAS MULTI-MÉTODO -->
          <section class="fin-cobro__lineas">
            @for (l of lineas(); track l.id) {
              <div class="fin-cobro__linea">
                <select [value]="l.method" (change)="setMethod(l.id, $any($event.target).value)" data-testid="linea-metodo">
                  @for (m of metodos; track m) { <option [value]="m">{{ METHOD_META[m].label }}</option> }
                </select>
                <fin-metodo-chip [metodo]="l.method" />
                <input type="number" min="0" [value]="l.amount"
                       (input)="setAmount(l.id, $any($event.target).value)"
                       placeholder="Monto" data-testid="linea-monto" />
                <input type="text" [value]="l.reference"
                       (input)="setReference(l.id, $any($event.target).value)"
                       [placeholder]="METHOD_META[l.method].refLabel" />
                @if (lineas().length > 1) {
                  <button type="button" class="fin-cobro__quitar" (click)="quitarLinea(l.id)" aria-label="Quitar">
                    <i class="pi pi-times"></i>
                  </button>
                }
              </div>
            }
            <p-button label="Agregar medio de pago" icon="pi pi-plus" severity="secondary" [text]="true"
                      (onClick)="agregarLinea()" />
          </section>

          <!-- INDICADOR asignado / total / restante -->
          <section class="fin-cobro__resumen" data-testid="cobro-resumen">
            <div><span>Asignado</span><b>{{ asignado() | currencyAr }}</b></div>
            <div><span>A cobrar</span><b>{{ aCobrar() | currencyAr }}</b></div>
            <div [class.fin-cobro__restante--ok]="restante() === 0">
              <span>Restante</span><b>{{ restante() | currencyAr }}</b>
            </div>
          </section>

          <!-- FACTURA X -->
          <label class="fin-cobro__factura">
            <input type="checkbox" [checked]="optOutElectronic()"
                   (change)="optOutElectronic.set($any($event.target).checked)" />
            No facturar electrónicamente (emitir Factura X)
          </label>

          <!-- CONFIRMAR -->
          <div class="fin-cobro__confirmar">
            <p-button label="Confirmar cobro" icon="pi pi-check" [loading]="submitting()"
                      [disabled]="!puedeConfirmar()" (onClick)="confirmar()"
                      data-testid="cobro-confirmar" />
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .fin-cobro { display: flex; flex-direction: column; gap: 1rem; max-width: 640px; }
    .fin-cobro__row { display: flex; justify-content: space-between; padding: .35rem 0; }
    .fin-cobro__row--target { border-top: 1px solid #e5e7eb; font-size: 1.05rem; }
    .fin-cobro__linea { display: grid; grid-template-columns: 1fr auto 1fr 1fr auto; gap: .5rem; align-items: center; }
    .fin-cobro__linea input, .fin-cobro__linea select { border: 1px solid #d1d5db; border-radius: 6px; padding: .35rem .5rem; }
    .fin-cobro__quitar { border: none; background: transparent; color: #b91c1c; cursor: pointer; }
    .fin-cobro__resumen { display: flex; gap: 1.5rem; background: #f8fafc; border-radius: 8px; padding: .6rem .9rem; }
    .fin-cobro__resumen div { display: flex; flex-direction: column; }
    .fin-cobro__restante--ok b { color: #0f8a55; }
    .fin-cobro__sin-caja, .fin-cobro__exito { display: flex; flex-direction: column; align-items: center; gap: .8rem; padding: 1.5rem; text-align: center; }
    .fin-cobro__ring { width: 64px; height: 64px; border-radius: 999px; background: #e3f6ec; color: #0f8a55; display: grid; place-items: center; font-size: 1.6rem; }
    .fin-cobro__exito-actions { display: flex; gap: .5rem; flex-wrap: wrap; justify-content: center; }
    .fin-cobro__factura { display: flex; align-items: center; gap: .5rem; font-size: .9rem; }
  `],
})
export class CobroAtencionComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly branchCtx = inject(OperatorBranchContextService);

  readonly attentionId = input.required<number>();
  readonly embedded = input<boolean>(false);

  protected readonly METHOD_META = METHOD_META;
  protected readonly metodos = Object.keys(METHOD_META) as PaymentMethod[];

  protected readonly detail = this.store.selectSignal(selectDetail);
  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected readonly cajaAbierta = this.store.selectSignal(selectIsCajaOpen);
  protected readonly submitting = this.store.selectSignal(selectCobroSubmitting);
  protected readonly result = this.store.selectSignal(selectCobroResult);

  /** monto a cobrar al paciente = pricing.copayment (copago si hay cobertura; total si particular). */
  protected readonly aCobrar = computed(() => this.pricing()?.copayment ?? 0);
  protected readonly cubierto = computed(() => {
    const p = this.pricing();
    return p ? Math.max(0, p.total - p.copayment) : 0;
  });

  protected readonly branchId = computed(() => this.detail()?.branchId ?? this.branchCtx.branchId());

  private nextId = 1;
  protected readonly lineas = signal<LineaCobro[]>([
    { id: 0, method: 'CASH', amount: 0, reference: '' },
  ]);
  protected readonly optOutElectronic = signal(false);

  protected readonly asignado = computed(() =>
    this.lineas().reduce((sum, l) => sum + (Number(l.amount) || 0), 0));
  protected readonly restante = computed(() => round2(this.aCobrar() - this.asignado()));
  protected readonly puedeConfirmar = computed(() =>
    this.cajaAbierta() && this.aCobrar() > 0 && this.restante() === 0 && !this.submitting());

  constructor() {
    // Asegura detail + pricing + estado de caja para el attentionId dado (ruta directa o wizard).
    effect(() => {
      const id = this.attentionId();
      if (this.detail()?.id !== id) this.store.dispatch(loadAtencion({ id }));
      if (!this.pricing()) this.store.dispatch(loadPricing({ attentionId: id }));
    });
    effect(() => {
      const b = this.branchId();
      if (b != null) this.store.dispatch(loadOpenSession({ branchId: b }));
    });
    // Prefill: la primera línea arranca con el monto a cobrar (efectivo por default).
    effect(() => {
      const target = this.aCobrar();
      const ls = this.lineas();
      if (target > 0 && ls.length === 1 && ls[0].amount === 0) {
        this.lineas.set([{ ...ls[0], amount: target }]);
      }
    });
  }

  protected agregarLinea(): void {
    this.lineas.update(ls => [...ls, { id: this.nextId++, method: 'CASH', amount: 0, reference: '' }]);
  }
  protected quitarLinea(id: number): void {
    this.lineas.update(ls => ls.filter(l => l.id !== id));
  }
  protected setMethod(id: number, method: PaymentMethod): void {
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, method } : l));
  }
  protected setAmount(id: number, raw: string): void {
    const amount = Number(raw) || 0;
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, amount } : l));
  }
  protected setReference(id: number, reference: string): void {
    this.lineas.update(ls => ls.map(l => l.id === id ? { ...l, reference } : l));
  }

  protected confirmar(): void {
    const p = this.pricing();
    const d = this.detail();
    const branch = this.branchId();
    if (!p || branch == null) return;
    const collections = this.lineas().map(l => ({
      method: l.method, amount: Number(l.amount) || 0,
      reference: l.reference.trim() ? l.reference.trim() : null,
    }));
    const details = p.items.map(it => ({
      analysisId: it.analysisId,
      coverageId: d?.insurancePlanId ?? null,
      covered: it.authorized,
      chargedAmount: it.precioPaciente,
    }));
    this.store.dispatch(registerPayment({
      body: {
        attentionId: this.attentionId(),
        branchId: branch,
        totalAmount: round2(this.asignado()),
        copaymentAmount: d?.copaymentAmount ?? p.copayment,
        collections,
        details,
        operatorOptedOutOfElectronic: this.optOutElectronic(),
      },
    }));
  }

  /** Tras el éxito: avanzar la atención (endBilling) y navegar/cerrar según el contexto. */
  protected continuarTrasExito(): void {
    this.store.dispatch(endBilling({ id: this.attentionId() }));
    this.store.dispatch(resetCobro());
    if (!this.embedded()) this.router.navigate(['/financiero/caja']);
    // embedded: el wizard auto-avanza a 'confirmar' por el cambio de estado.
  }
  protected cobrarOtra(): void {
    this.store.dispatch(endBilling({ id: this.attentionId() }));
    this.store.dispatch(resetCobro());
    this.router.navigate(['/turnos/recepcion']);
  }
  protected irACaja(): void { this.router.navigate(['/financiero/caja']); }
  protected imprimir(): void { window.print(); }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
```

- [ ] **Step 2: Escribir los smoke tests (fallan)**

Crear `cobro-atencion.component.spec.ts`. Usar `provideMockStore` con overrides de selectores. Patrón (ajustar imports a los del repo):

```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { CobroAtencionComponent } from './cobro-atencion.component';
import { selectIsCajaOpen, selectCobroSubmitting, selectCobroResult } from '../../store/financiero.selectors';
import { selectDetail, selectPricing } from '@features/analitica/store/atencion/atencion.selectors';
import { registerPayment } from '../../store/financiero.actions';

function setup(overrides: { cajaAbierta?: boolean; pricing?: any; detail?: any; result?: any } = {}) {
  TestBed.configureTestingModule({
    imports: [CobroAtencionComponent],
    providers: [provideMockStore({
      selectors: [
        { selector: selectIsCajaOpen, value: overrides.cajaAbierta ?? true },
        { selector: selectCobroSubmitting, value: false },
        { selector: selectCobroResult, value: overrides.result ?? null },
        { selector: selectDetail, value: overrides.detail ?? { id: 7, branchId: 3, insurancePlanId: null, copaymentAmount: null } },
        { selector: selectPricing, value: overrides.pricing ?? { items: [{ analysisId: 1, authorized: false, precioPaciente: 1500 }], subtotal: 1500, copayment: 1500, total: 1500 } },
      ],
    })],
  });
  const fixture = TestBed.createComponent(CobroAtencionComponent);
  fixture.componentRef.setInput('attentionId', 7);
  fixture.detectChanges();
  return fixture;
}

it('sin caja abierta muestra el bloqueo y NO el formulario', () => {
  const fixture = setup({ cajaAbierta: false });
  const el = fixture.nativeElement as HTMLElement;
  expect(el.querySelector('[data-testid="cobro-sin-caja"]')).toBeTruthy();
  expect(el.querySelector('[data-testid="cobro-confirmar"]')).toBeFalsy();
});

it('confirmar deshabilitado si la suma no coincide con el monto', () => {
  const fixture = setup({ pricing: { items: [], copayment: 2000, total: 2000, subtotal: 2000 } });
  const cmp = fixture.componentInstance as any;
  cmp.lineas.set([{ id: 0, method: 'CASH', amount: 500, reference: '' }]);
  fixture.detectChanges();
  expect(cmp.puedeConfirmar()).toBe(false);
});

it('confirmar con suma = monto dispara registerPayment', () => {
  const fixture = setup();
  const store = TestBed.inject(MockStore);
  const spy = vi.spyOn(store, 'dispatch');
  const cmp = fixture.componentInstance as any;
  cmp.lineas.set([{ id: 0, method: 'CASH', amount: 1500, reference: '' }]);
  fixture.detectChanges();
  cmp.confirmar();
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: registerPayment.type }));
});

it('con result muestra la pantalla de éxito', () => {
  const fixture = setup({ result: { payment: { totalAmount: 1500 }, fiscalReference: { comprobanteTipo: 'FACTURA_X' } } });
  expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="cobro-exito"]')).toBeTruthy();
});
```

> **Nota vitest (memoria del repo):** si `input.required()` + `setInput` falla en este runner, aplicar el workaround conocido del worktree muestras (Vite plugin del `vitest.config.ts`) o degradar a `@Input()` clásico para `attentionId`/`embedded`. Verificar primero con `setInput` (suele andar con template inline).

- [ ] **Step 3: Correr los tests (fallan → pasan)**

Run: `npx vitest run cobro-atencion.component`
Expected primero FAIL (componente sin crear / ajustes), luego PASS tras corregir imports.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/financiero/components/cobro-atencion/
git commit -m "feat(financiero): CobroAtencionComponent (cobro multi-metodo + comprobante)"
```

---

## Task 4: Ruta directa + integración en el wizard

**Files:**
- Modify: `src/app/features/financiero/financiero.routes.ts`
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/cobro-step/cobro-step.component.ts`
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`

**Interfaces:**
- Consumes: `CobroAtencionComponent` (Task 3), `selectPricing`, `loadPricing`, `endCollection`.
- Produces: ruta `cobrar/:attentionId`; `CobroStepComponent`; wizard con `@case('cobro')`/`@case('facturacion')`, `advanceCurrent` case `cobro`, footer oculto en `facturacion`.

- [ ] **Step 1: Agregar la ruta directa**

En `financiero.routes.ts`, dentro de `children` del shell (después de `cobros/:id`):

```ts
{
  path: 'cobrar/:attentionId',
  loadComponent: () => import('./components/cobro-atencion/cobro-atencion.component').then(m => m.CobroAtencionComponent),
  data: { fromInput: 'attentionId' },
},
```

> **Atención:** `CobroAtencionComponent` toma `attentionId` como `input.required<number>()`. Para que el router lo inyecte desde el path param, el repo usa `withComponentInputBinding()` (verificar que esté en `app.config.ts`; el wizard ya recibe `id` por input binding, así que está). El param de ruta llega como **string** → el componente debe coercer: cambiar el input a `input.required<number, string | number>({ transform: (v) => Number(v) })` o aceptar `string | number` y `Number(...)` donde se use. Implementar el transform:
>
> ```ts
> readonly attentionId = input.required<number, string | number>({ transform: (v) => Number(v) });
> ```

- [ ] **Step 2: Crear el `CobroStepComponent` (paso liviano)**

Crear `cobro-step.component.ts` con template inline — resumen del desglose; el avance lo hace el footer del wizard (`endCollection`).

```ts
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Store } from '@ngrx/store';
import { CurrencyArPipe } from '@shared/pipes/currency-ar.pipe';
import { loadPricing } from '../../../../../store/atencion/atencion.actions';
import { selectPricing } from '../../../../../store/atencion/atencion.selectors';

@Component({
  selector: 'lab-cobro-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyArPipe],
  template: `
    <div class="aw-step p-2">
      <h3 class="text-lg font-semibold mb-3">Cobro</h3>
      <p class="text-sm opacity-70 mb-4">Revisá el desglose. Al continuar, pasás a la facturación y el registro del cobro.</p>
      <div class="max-w-md flex flex-col gap-1">
        <div class="flex justify-between py-1"><span>Total de estudios</span><b>{{ pricing()?.total ?? 0 | currencyAr }}</b></div>
        <div class="flex justify-between py-1"><span>Cubierto por obra social</span><b>{{ cubierto() | currencyAr }}</b></div>
        <div class="flex justify-between py-1 border-t border-gray-200 text-base"><span>A cobrar al paciente</span><b>{{ pricing()?.copayment ?? 0 | currencyAr }}</b></div>
      </div>
    </div>
  `,
})
export class CobroStepComponent {
  private readonly store = inject(Store);
  readonly atencionId = input.required<number>();
  protected readonly pricing = this.store.selectSignal(selectPricing);
  protected cubierto(): number {
    const p = this.pricing();
    return p ? Math.max(0, p.total - p.copayment) : 0;
  }
  constructor() {
    effect(() => {
      const id = this.atencionId();
      if (!this.pricing()) this.store.dispatch(loadPricing({ attentionId: id }));
    });
  }
}
```

(Ajustar la profundidad de los imports relativos `../../../../../store/...` a la real desde `steps/cobro-step/`; alternativamente usar el alias `@features/analitica/store/...`.)

- [ ] **Step 3: Importar los dos componentes en el wizard**

En `atencion-wizard.component.ts`, agregar a los imports del decorador y a las importaciones del archivo:

```ts
import { CobroStepComponent } from './steps/cobro-step/cobro-step.component';
import { CobroAtencionComponent } from '@features/financiero/components/cobro-atencion/cobro-atencion.component';
// ... y en imports: [...] del @Component agregar: CobroStepComponent, CobroAtencionComponent
```

Agregar `endCollection` a la lista de actions importadas desde `atencion.actions`.

- [ ] **Step 4: Agregar los `@case` del cuerpo del paso**

En el template del wizard, dentro del `@switch (uiStep()?.key)` del cuerpo (después de `@case ('analisis')` y antes de `@case ('confirmar')`):

```html
@case ('cobro') {
  <lab-cobro-step [atencionId]="detail()!.id" />
}
@case ('facturacion') {
  <fin-cobro-atencion [attentionId]="detail()!.id" [embedded]="true" />
}
```

- [ ] **Step 5: Ocultar el footer en `facturacion` y manejar `cobro` en el footer**

En el `@switch (uiStep()?.key)` del **footer** (`wizardFooter`), agregar un `@case ('facturacion')` vacío (sin botón, porque "Confirmar cobro" vive dentro del componente):

```html
@switch (uiStep()?.key) {
  @case ('confirmar') {
    <p-button label="Finalizar atención" [loading]="mutating()" [disabled]="mutating()"
              (onClick)="advanceCurrent()" />
  }
  @case ('facturacion') {
    <!-- El botón "Confirmar cobro" lo provee fin-cobro-atencion. Sin botón en el footer. -->
  }
  @default {
    <p-button label="Continuar" [loading]="mutating()" [disabled]="continueDisabled()"
              (onClick)="advanceCurrent()" />
  }
}
```

(El paso `cobro` usa el `@default` → botón "Continuar".)

- [ ] **Step 6: `advanceCurrent` y `continueDisabled` para `cobro`**

En `advanceCurrent()`, agregar el case `cobro`:

```ts
protected advanceCurrent(): void {
  switch (this.uiStep()?.key) {
    case 'datos':     this.datosRef()?.onConfirm(); break;
    case 'analisis':  this.analisisRef()?.onContinue(); break;
    case 'cobro':     { const d = this.detail(); if (d) this.store.dispatch(endCollection({ id: d.id })); break; }
    case 'confirmar': this.resumenRef()?.openFinalize(); break;
  }
}
```

`continueDisabled()` ya cae al `default: return this.mutating();` para `cobro`, lo que es correcto. No cambia.

- [ ] **Step 7: Verificar el build de typecheck**

Run: `npm run build`
Expected: compila sin errores de tipo. (Si `withComponentInputBinding` no estuviera en `app.config.ts`, el `attentionId` de la ruta no se inyecta — agregarlo: `provideRouter(routes, withComponentInputBinding())`.)

- [ ] **Step 8: Commit**

```bash
git add src/app/features/financiero/financiero.routes.ts src/app/features/analitica/pages/atencion/atencion-wizard/
git commit -m "feat(financiero): ruta cobrar/:attentionId + pasos cobro/facturacion del wizard"
```

---

## Task 5: Re-apuntar botones de Caja/Cobros + verificación final

**Files:**
- Modify: `src/app/features/financiero/pages/caja/caja.page.ts`
- Modify: `src/app/features/financiero/pages/cobros/cobros.page.ts`

**Interfaces:**
- Consumes: nada nuevo. Cambia solo destino de navegación.

- [ ] **Step 1: Caja → listado de atenciones**

En `caja.page.ts`, `cobrarAtencion()`:

```ts
protected cobrarAtencion(): void {
  this.router.navigate(['/turnos/recepcion']);
}
```

- [ ] **Step 2: Cobros → listado de atenciones**

En `cobros.page.ts`, `irACobrar()`:

```ts
protected irACobrar(): void {
  this.router.navigate(['/turnos/recepcion']);
}
```

> **Decisión (fase de plan, confirmada con el usuario):** el cobro vive en el ciclo de la atención. Los botones de Caja/Cobros (sin `attentionId`) llevan al listado de atenciones (`/turnos/recepcion`), donde el operador retoma una atención y cae en el wizard en el paso de cobro. La ruta `cobrar/:attentionId` queda para deep-link con id conocido. No se construye picker nuevo.

- [ ] **Step 3: Correr la suite del feature financiero**

Run: `npx vitest run financiero`
Expected: PASS (incluye service, store, componente). Si algún spec de caja/cobros asertaba la ruta `/financiero/cobrar`, actualizarlo a `/turnos/recepcion`.

- [ ] **Step 4: Build de producción**

Run: `npm run build`
Expected: build OK sin errores.

- [ ] **Step 5: Verificación con `superpowers:verification-before-completion`**

Correr la suite completa relevante y el build, y confirmar el output antes de declarar terminado:

Run: `npx vitest run financiero atencion-wizard` y `npm run build`
Expected: ambos verdes. Documentar el conteo de tests.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/financiero/pages/caja/caja.page.ts src/app/features/financiero/pages/cobros/cobros.page.ts
git commit -m "feat(financiero): botones de cobro al listado de atenciones"
```

---

## Cierre (post-implementación)

1. **Smoke visual** (usuario / `verify`): caja abierta → wizard hasta facturación → cobro efectivo → comprobante → endBilling → confirmar. Y ruta directa `/financiero/cobrar/:id`. Y bloqueo con caja cerrada.
2. **`superpowers:finishing-a-development-branch`**: push + PR contra `development` (body con el link KAN) + merge (camino formal como Sub-1/Sub-2).
3. **Jira**: transicionar el ticket a Finalizado.
4. **Memoria**: actualizar `project_financiero_conexion_front.md` (Sub-3 cerrado).

---

## Self-Review

**Spec coverage:**
- §2 mapeo 2 pasos del wizard → Task 4 (cobro liviano + facturación con componente). ✓
- §3 componente compartido + 2 entradas → Task 3 (componente) + Task 4 (ruta + wizard). ✓
- §4.1 store `registerPayment` → Task 2. ✓ §4.2 DTO + mapeo → Task 1 + Task 3 (`confirmar`). ✓
- §4.3 ruta `cobrar/:attentionId` → Task 4 Step 1. ✓
- §4.4 paso cobro/facturación + `@case` + `advanceCurrent` → Task 4. ✓
- §4.5 cadena `registerPayment`→éxito→`endBilling` (sin `addPayment`) → Task 3 (`continuarTrasExito`). ✓
- §5 reglas de negocio (bloqueo sin caja, multi-método, asignado/total/restante, factura-X, comprobante, pantalla de éxito) → Task 3 template. ✓
- §6 module gating → ya existente en el wizard (`requires: ModuleKey.Financiero`); no se toca. ✓
- §7 reuso → Task 3 imports (`MetodoChipComponent`, `ComprobanteCardComponent`, `CurrencyArPipe`, selectores sub-2). ✓
- §8 testing → tests en Tasks 1, 2, 3. ✓
- §9 riesgo `details[]` → resuelto en "Contratos backend confirmados" (details informativo; mapeo fijado). ✓

**Type consistency:** `CreatePaymentRequest`/`RegisterPaymentResponse` (Task 1) usados idénticos en service, store y componente. `registerPayment({body})`/`registerPaymentSuccess({result})` consistentes entre actions, reducer, effects, componente. `attentionId`/`embedded` inputs consistentes entre Task 3 y Task 4. Campo JSON `fiscalReference` consistente con backend.

**Placeholder scan:** sin TBD/TODO; todo step con código concreto.
