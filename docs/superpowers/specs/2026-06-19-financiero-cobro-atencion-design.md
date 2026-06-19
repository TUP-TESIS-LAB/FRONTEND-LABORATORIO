# Diseño: Cobro en la atención (Sub-proyecto 3)

> **Fecha:** 2026-06-19
> **Estado:** Aprobado (brainstorming) — implementación diferida a otra sesión
> **Repo:** `FRONTEND-LABORATORIO` (+ pequeña adición al store financiero ya existente)
> **Parte de:** arco "Conexión FINANCIERO al front". Sub-1 (backend KAN-119) y Sub-2 (front módulo KAN-120) MERGED. Este es el Sub-proyecto 3 (último).
> **Diseño hi-fi:** `tesis/design_handoff_financiero_angular/` — README §"2. COBRAR ATENCIÓN" + `prototype/js/fin-cobrar.jsx`.
> **Spec del arco:** `Backend/docs/superpowers/specs/2026-06-19-financiero-conexion-front-design.md` (§8).

---

## 1. Objetivo

Construir el componente de **cobro de la atención** (multi-método, copago, comprobante) y engancharlo al flujo real: el wizard de atención de `analitica` y la ruta directa `/financiero/cobrar/:attentionId`. Es la última pieza que conecta el cobro del paciente con el backend (`POST /api/v1/financiero/payments`) dentro del flujo de atención.

## 2. Decisión de diseño (brainstorming): mapeo a los 2 pasos del wizard

El wizard (`features/analitica/pages/atencion/atencion-wizard/`) ya define dos pasos financieros (gateados por `ModuleKey.Financiero`), hoy **vacíos**:

| Paso | Estado de atención | Contenido (este sub-proyecto) |
|---|---|---|
| `cobro` | `ON_COLLECTION_PROCESS` | Pantalla **liviana** de confirmación: muestra el desglose (total / cubierto / copago desde `pricing`) y un botón "Continuar al cobro" → dispatch `endCollection` → la atención pasa a `ON_BILLING_PROCESS` y el wizard avanza al paso `facturación`. |
| `facturación` | `ON_BILLING_PROCESS` | El **componente de cobro completo** (mockup `fin-cobrar.jsx`): líneas multi-método, desglose cobertura/copago, checkbox Factura-X, validación, comprobante. |

**Razón:** el backend exige `ON_BILLING_PROCESS` para `POST /payments` (financiero spec S08), y ese endpoint ya linkea el pago a la atención internamente (S13). Por eso el registro del pago vive en `facturación`, no en `cobro`.

## 3. Componente compartido y dos entradas

Un único **`CobroAtencionComponent`** (presentacional + store-connected) se usa:
1. **En el wizard** como contenido del paso `facturación` (`@case ('facturacion')` en el template del wizard + caso en `advanceCurrent()`).
2. **En la ruta** `/financiero/cobrar/:attentionId` (entrada desde el botón "Cobrar atención" de la pantalla Caja del Sub-proyecto 2).

Dado `attentionId`, el componente es autosuficiente: asegura `detail` cargado (`selectDetail`) y dispara `loadPricing({attentionId})` → lee `selectPricing`. `branchId` sale de `detail().branchId` (o `OperatorBranchContextService.branchId()` en la entrada por ruta).

## 4. Gaps a construir

### 4.1 Store financiero — registrar pago (NO existe hoy)
- `FinancieroApiService.createPayment(body): Observable<RegisterPaymentResponse>` → `POST /api/v1/financiero/payments`. El endpoint backend YA existe (KAN-119 lo reusa del módulo financiero original).
- Acción/effect/reducer `registerPayment` en el slice (nuevo sub-slice `cobro` o dentro de `cobros`): `registerPayment({body})` → effect `concatMap` → `api.createPayment` → `registerPaymentSuccess({result})` (guarda `payment` + `fiscalReference` para la pantalla de éxito) / `registerPaymentFailure`. Mapeo de errores en español (422 sin caja → "No se puede cobrar: no hay una caja abierta."; 422 montos → "La suma de los medios de pago no coincide con el total.").

### 4.2 DTO `CreatePaymentRequest` (espejo del backend `RegisterPaymentRequest`)
```ts
interface CreatePaymentRequest {
  attentionId: number;
  branchId: number;
  totalAmount: number;          // = suma de collections = monto cobrado al paciente
  copaymentAmount: number;      // copago (= pricing.copayment cuando hay cobertura)
  collections: { method: PaymentMethod; amount: number; reference?: string | null }[];
  details: { analysisId: number; coverageId: number | null; covered: boolean; chargedAmount: number }[];
  operatorOptedOutOfElectronic: boolean;
}
```
**Mapeo desde `AttentionPricing` + `detail`:**
- "monto a cobrar" (target de las líneas, validación suma=monto) = `pricing.copayment` (lo que paga el paciente: copago si hay cobertura, total si particular).
- `totalAmount` = suma de `collections` (debe igualar el monto a cobrar).
- `copaymentAmount` = `detail().copaymentAmount` ?? `pricing.copayment`.
- `details[]` = `pricing.items` → `{ analysisId, coverageId: detail.insurancePlanId ?? null, covered: item.authorized, chargedAmount: item.precioPaciente }` (confirmar la semántica exacta de `covered`/`coverageId` contra el backend en la fase de plan).
- `RegisterPaymentResponse` = `{ payment: {...}, fiscalReference: { comprobanteTipo, internalReference, externalInvoiceId, electronic, isVoid, emittedAt } }` (modelos ya definidos en `features/financiero/models/financiero.model.ts` del Sub-2).

### 4.3 Ruta
Agregar a `FINANCIERO_ROUTES` (`features/financiero/financiero.routes.ts`): `{ path: 'cobrar/:attentionId', loadComponent: () => CobroAtencionComponent }`. Hoy `/financiero/cobrar/...` está referenciada (botones de Caja/Cobros) pero NO definida.

### 4.4 Wizard
- Paso `cobro`: nuevo `CobroStepComponent` (liviano) → `@case ('cobro')` + caso `advanceCurrent()` que dispara `endCollection`.
- Paso `facturación`: monta el `CobroAtencionComponent` → `@case ('facturacion')`. El avance lo maneja el propio componente (al confirmar el pago), no el footer genérico del wizard — o el footer delega en el componente como hacen los otros pasos (`datosRef()?.onConfirm()` etc.). Definir en el plan si "Confirmar cobro" es el botón del componente o el footer del wizard.

### 4.5 Cadena de dispatch al confirmar el cobro
`registerPayment({body})` → `registerPaymentSuccess` → mostrar pantalla de éxito + comprobante → al cerrar/continuar, dispatch `endBilling({id: attentionId})` → la atención pasa a `AWAITING_CONFIRMATION` y el wizard avanza a `confirmar`. **No** dispatchar `addPayment` por separado: el backend ya linkea el pago en `POST /payments` (S13).

## 5. Reglas de negocio en UI (del handoff, normativas)

1. **Bloqueo sin caja abierta:** si `selectIsCajaOpen` (store financiero del Sub-2) es false → banner "No se puede cobrar: no hay una caja abierta." + CTA "Abrir caja" (puede reusar el modal de apertura del Sub-2 o navegar a `/financiero/caja`). Formulario inhabilitado.
2. **Multi-método:** líneas (`collections`) con método + monto + referencia opcional; "Agregar medio de pago"; indicador en vivo **asignado / total / restante**; "Confirmar" bloqueado si suma ≠ monto a cobrar.
3. **Solo CASH** se marca como efectivo (informativo); el backend decide el arqueo.
4. **Copago/cobertura:** desglose total de estudios / cubierto por OS / copago a cargo del paciente. Monto a cobrar = copago (cobertura) o total (particular).
5. **Comprobante automático:** checkbox "No facturar electrónicamente (emitir Factura X)" → `operatorOptedOutOfElectronic`. Si `NONE`, nota de que igual se emite Factura X.
6. **Pantalla de éxito:** ring verde, "Cobraste $X", tarjeta de comprobante (`fiscalReference`: tipo, `Recibo N°`/número, electrónico sí/no, líneas, total, cuánto fue a caja), acciones Imprimir/Descargar/Ver ticket + "Cobrar otra"/"Volver a caja" (entrada por ruta) o avanzar el wizard (entrada por wizard).

Mensajes de error en español, sin leaks (reusar el patrón de mapeo del Sub-2).

## 6. Module gating

El cobro solo aplica con FINANCIERO activo. El wizard ya filtra los pasos `cobro`/`facturación` por `registry.isActive(ModuleKey.Financiero)` y, con el módulo inactivo, `end-collection` saltea directo a `AWAITING_CONFIRMATION` (el front ya lo refleja: `onAnalysisAdvanced()` salta a `confirmar`). Este sub-proyecto NO cambia ese comportamiento — solo llena los pasos cuando el módulo está activo.

## 7. Reuso

- Modelos/enums + `METHOD_META`/`COMPROBANTE_META` del Sub-2 (`features/financiero/models/financiero.model.ts`).
- `selectIsCajaOpen`/`selectCajaSession` del store financiero (Sub-2) para el bloqueo.
- `CurrencyArPipe`, `NotificationService`, `ui-page-header`, componentes presentacionales del Sub-2 (`fin-metodo-chip`, `fin-comprobante-card`) — reusar, no recrear.
- `selectPricing`/`selectDetail` + `AtencionApiService.getPricing/endCollection/endBilling` (ya existen) del feature atención.

## 8. Testing (convención del repo)

- Store: reducer/effects/selectors del nuevo `registerPayment` (incl. mapeo 422 sin-caja y 422 montos).
- `CobroAtencionComponent`: smoke — bloqueo sin caja (banner + CTA), validación suma≠monto (botón disabled), confirmar dispara `registerPayment`. Templates inline (no `templateUrl`) para vitest. Cuidado con `input.required()` + `overrideTemplate` (patrón del repo).
- Wizard: el paso `facturación` monta el componente; `endBilling` se dispara tras el éxito.

## 9. Notas / riesgos

- Confirmar contra el backend la semántica exacta de `details[]` (`covered`/`coverageId`) en la fase de plan — el front tiene `pricing.items` con `authorized` y `detail.insurancePlanId`.
- "Descargar PDF"/"Imprimir" pueden quedar como placeholder (`window.print()`) igual que en el Sub-2 (follow-up).
- Follow-ups del Sub-2 (patientFullName, createdAt en PaymentResponse) son independientes; no bloquean este sub-proyecto.

## 10. Alcance de la implementación (para el plan de la próxima sesión)

Tareas estimadas (TDD, subagent-driven): (1) `createPayment` en service + store slice `registerPayment` + tests; (2) ruta `/financiero/cobrar/:attentionId`; (3) `CobroAtencionComponent` (desglose, líneas multi-método, factura-X, bloqueo sin caja, validación); (4) pantalla de éxito + comprobante; (5) integración wizard (paso `cobro` liviano + paso `facturación` + `advanceCurrent` + `endCollection`/`endBilling`); (6) verificación (suite + build + smoke). Plan + ticket Jira propios antes de implementar (regla inviolable del repo).
