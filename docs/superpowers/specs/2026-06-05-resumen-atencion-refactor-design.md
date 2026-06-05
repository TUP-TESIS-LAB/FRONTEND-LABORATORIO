# Refactor de la pantalla "Resumen de la atención" (paso 3) — Diseño

> **Fecha:** 2026-06-05
> **Contexto:** Polish de la feature de Atención (KAN-77, en review). Solo **frontend** — sin cambios de backend.
> **Jira:** _(pendiente — se define en la transición a implementación)_
> **Rama:** _(a decidir: nueva desde `development`, o sobre `feat/atencion-recepcion`)_

## 1. Problema

La pantalla de Resumen (paso 3 del wizard, `resumen-step.component.ts`) hoy:
- Muestra el **ID** del paciente (`ID 20004`) en vez de sus datos.
- Lista los análisis como **`#id`** (`#3`, `#4`…) en vez de sus nombres.
- El botón **"Cancelar atención"** vive en la barra inferior y dispara un **`window.prompt`** nativo para el motivo (UX pobre, inconsistente con el resto).

## 2. Objetivos

1. Mostrar el paciente como **`Apellido, Nombre · DNI`**.
2. Listar los análisis con **nombre (+ shortCode)**.
3. **Mover "Cancelar atención"** al header, a la **izquierda** de "Volver al listado".
4. Reemplazar el `window.prompt` por un **modal de cancelación** (estilo cola de extracción: motivos rápidos + textarea).

## 3. No-objetivos (YAGNI)

- Cero cambios de backend (los datos se resuelven con endpoints que ya existen).
- Sin endpoint batch de análisis (se resuelve con `forkJoin` de `getById`).
- Sin tocar "Volver fase" (queda donde está).
- Género/edad del paciente: opcional (fácil de sumar luego); el requisito es nombre + DNI.

## 4. Datos (solo-frontend, vía store NgRx)

La atención (`AttentionResponse`) trae solo `patientId` y `analysisAuthorizations[].analysisId`. Se resuelven nombres en el cliente, por el store (convención `ngrx-backend-request`).

**Paciente** — se reusa el slice existente `resolvedPatient` del store `atencion`:
- Nueva acción `loadAttentionPatient({ patientId })` → effect → `PatientService.getById(id)` → `patientResolved({ patient })` (reusa el reducer/selector ya existentes). `switchMap` (read).
- El `resumen-step`, en `ngOnInit`, despacha `loadAttentionPatient` **solo si** `selectResolvedPatient()` es `null` o su `id` ≠ `atencion().patientId` (en el flujo feliz ya viene cargado del paso 1; esto cubre "retomar del listado").

**Análisis** — slice nuevo en el state `atencion`:
- Estado: `summaryAnalyses: Analysis[]` (+ `summaryAnalysesLoading`).
- Acciones: `loadAttentionAnalyses({ analysisIds })` / `attentionAnalysesLoaded({ analyses })` / `attentionAnalysesFailure({ error })`.
- Effect: `switchMap` → `forkJoin(analysisIds.map(id => analysisService.getById(id)))` → `attentionAnalysesLoaded`; `catchError` adentro → `attentionAnalysesFailure`. (Si `analysisIds` está vacío, no despacha.)
- Selector `selectSummaryAnalyses`. El `resumen-step` despacha `loadAttentionAnalyses` en `ngOnInit` con los ids de `atencion().analysisAuthorizations`.

## 5. `resumen-step.component.ts`

- Inyecta `Store`. Lee `selectResolvedPatient` y `selectSummaryAnalyses` con `selectSignal`.
- `ngOnInit`: despacha los dos loads (paciente si falta, análisis siempre con los ids).
- Template:
  - **Paciente:** `{{ p.lastName }}, {{ p.firstName }}` y `DNI {{ p.dni }}` (con `@if (resolvedPatient(); as p) { … } @else { ID {{ atencion().patientId }} }` como fallback).
  - **Análisis:** `@for` sobre `analysisAuthorizations`, buscando el `Analysis` por `analysisId` en `summaryAnalyses()`; muestra `{{ a.shortCode }} — {{ a.name }}`; fallback `#{{ id }}` mientras carga.
- Se mantiene "Finalizar atención" + el `AttentionTicketModalComponent` tal cual.

## 6. Mover "Cancelar atención" al header (`atencion-wizard.component.ts`)

- En el header (donde está "Volver al listado"), agrupar a la derecha: `[Cancelar atención] [Volver al listado]` (flex con gap; Cancelar a la izquierda, `severity="danger" [text]="true"`).
- **Gate de visibilidad:** mostrar "Cancelar atención" solo en estados **cancelables** — `detail() && !isTerminal(state) && !isPostSecretary()` (mismo criterio que hoy tiene el botón en el bottom bar).
- **Quitar** "Cancelar atención" del bottom bar (queda solo "Volver fase").
- `onCancel()` deja de usar `window.prompt`: abre el modal (signal `cancelModalOpen.set(true)`).

## 7. Modal de cancelación — `CancelAttentionModalComponent` (nuevo)

Calcado del patrón de `AttentionTicketModalComponent` (`src/app/features/analitica/components/`): standalone, OnPush, `imports: [DialogModule, ButtonModule, FormsModule, ...]`, PrimeNG `p-dialog`.
- **Input:** `visible: boolean`. **Outputs:** `confirmed(reason: string)`, `dismissed()`.
- Contenido: header "Cancelar atención"; **motivos rápidos** como chips/botones ("Paciente no se presentó", "Error de carga", "Atención duplicada", "A pedido del paciente") que setean el textarea; **textarea** de motivo (requerido); nota corta de que la cancelación es irreversible.
- Footer: **Volver** (`dismissed`) · **Cancelar atención** (`confirmed(reason)`, deshabilitado si el motivo está vacío/sólo espacios).
- El wizard lo hostea: `(confirmed)="onCancelConfirmed($event)"` → `dispatch(cancelAtencion({ id, payload: { cancellationReason: reason } }))` + `clearAtencionSession()` + cerrar modal; `(dismissed)="cancelModalOpen.set(false)"`.

## 8. Manejo de errores (regla #4: español, sin leak)

- Falla de carga de paciente/análisis → fallback visible (ID / `#id`) sin romper la pantalla; el error no se renderiza crudo.
- Falla de cancelación → ya va por el `mutating`/`detailError` existente; mensaje en español.

## 9. Testing

- **Store**: effects `loadAttentionPatient$` (success→patientResolved) y `loadAttentionAnalyses$` (forkJoin→attentionAnalysesLoaded; vacío→no despacha; error→failure); reducer/selector de `summaryAnalyses`.
- **`resumen-step`**: con `resolvedPatient` y `summaryAnalyses` en el mock store, renderiza `Apellido, Nombre · DNI` y `shortCode — name`; despacha los loads en init.
- **`CancelAttentionModalComponent`**: el botón confirmar está deshabilitado sin motivo; un motivo rápido llena el textarea; confirmar emite `confirmed(reason)`.
- **`atencion-wizard`**: "Cancelar atención" aparece en el header solo en estados cancelables y no en el bottom; `onCancelConfirmed` despacha `cancelAtencion` con el motivo.

## 10. Archivos afectados

- `store/atencion/atencion.state.ts` · `atencion.actions.ts` · `atencion.effects.ts` · `atencion.reducer.ts` · `atencion.selectors.ts` (paciente + summaryAnalyses).
- `pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts` (datos reales).
- `pages/atencion/atencion-wizard/atencion-wizard.component.ts` (mover Cancelar al header + modal en vez de prompt).
- `components/cancel-attention-modal/cancel-attention-modal.component.ts` (**nuevo**).
- Specs de cada uno.
