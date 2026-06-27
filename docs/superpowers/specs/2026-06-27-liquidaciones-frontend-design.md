# Liquidaciones (frontend) — Design / Spec

> **Jira:** [KAN-141](https://exequielsantoro.atlassian.net/browse/KAN-141)
> **Branch:** `feat/liquidaciones-frontend`
> **Fecha:** 2026-06-27
> **Brief:** `mockups/dispatch/04-liquidaciones-fe.md`

## Objetivo

Darle UI al apartado de **liquidaciones de obras sociales** del módulo FINANCIERO, cuyo
backend ya existe (PR #108 mergeada). Cubre listar, ver el detalle, generar y operar el
lifecycle de una `Settlement`. No reimplementa nada del financiero: solo consume el
contrato existente.

## Decisiones de scope (acordadas en brainstorming)

1. **Generar = solo SIMPLE** (UB × convenio vigente). Sin builder de reglas escalonadas
   (ESPECIAL queda fuera). `specialRules` se envía vacío y `excludedAnalysisIdsByPs` nulo.
2. **Tesorería fuera** de esta entrega (`treasury/summary` es otro concepto / otra iteración).
3. **Preview de pendientes sí**: antes de confirmar, se muestra el conteo de prestaciones
   pendientes de esa OS+período para dar contexto y evitar el 422 "sin servicios".
4. **"Facturar" (INFORMED → BILLED) diferido**: `PATCH /settlements/{id}/payment` exige un
   `paymentId` crudo y no hay endpoint para elegir ese pago por nombre → implementarlo ahora
   violaría la regla "sin IDs en formularios". v1 cubre **Informar + Anular**; Facturar es follow-up.

## Ubicación y gating

- Vive **dentro de `src/app/features/financiero/`** (hermano de `caja`/`cobros`). Reemplaza
  el placeholder `liquidaciones` (hoy `ModuloNoDisponibleComponent`).
- Gating heredado del padre en `app.routes.ts`:
  `moduleActiveGuard(ModuleKey.Financiero)` + `sectionGuard('FINANCIERO')`. **No se crea un
  ModuleKey nuevo.**
- Nuevo tab **"Liquidaciones"** en `financiero-shell` (icono `pi-chart-line`).
- Roles:
  - **Lecturas** (listado/detalle): `ADMINISTRADOR`, `SECRETARIA`, `RESPONSABLE_SECRETARIA`.
  - **Mutaciones** (generar/informar/anular): **solo `ADMINISTRADOR`** → botones gateados con
    la directiva `hasRole` / `HasRoleDirective`.

## Contrato del backend (verificado, no asumido)

Base: `/api/v1/financiero`.

| Acción | Verbo + path | Request | Respuesta (campos relevantes) | Roles |
|---|---|---|---|---|
| Listar | `GET /settlements?insurerId&from&to&status` (ETag/304) | — (`If-None-Match`) | `SettlementSummaryResponse[]`: `id, insurerId, settlementNumber, status, type, periodFrom, periodTo, createdAt` | ADMIN/SECRE/RESP |
| Detalle | `GET /settlements/{id}` | — | `SettlementResponse`: `id, insurerId, settlementNumber, status, type, periodFrom, periodTo, informedDate?, informedAmount?, paymentId?, plans[], createdAt`. `plans[]` → `{ planId, agreements[] }`; `agreements[]` → `{ agreementId, agreementSubtotal, providedServiceIds[], rules[] }` | ADMIN/SECRE/RESP |
| Generar | `POST /settlements` | `{ insurerId, period:{from,to}, specialRules:[], excludedAnalysisIdsByPs:null }` | `SettlementResponse` (201). 409 = duplicada, 422 = sin pendientes | ADMINISTRADOR |
| Informar | `PATCH /settlements/{id}/inform` | `{ informedDate, informedAmount, observations? }` | `SettlementResponse`. 422 = transición inválida | ADMINISTRADOR |
| Anular | `PATCH /settlements/{id}/cancel` | `{ cancellationReason }` | 200. 422 = no se puede anular BILLED | ADMINISTRADOR |
| Pendientes | `GET /provided-services/pending` (ETag/304, **sin filtros**) | — (`If-None-Match`) | `ProvidedServiceResponse[]`: `id, attentionId, planId, patientId, serviceDate, copaymentAmount, ivaPercentage, authorizationNumber?, settlementAgreementId?(null=pendiente), analysisIds[]` | ADMIN/SECRE/RESP |

Estados: `PENDING → INFORMED → BILLED`, con `CANCELLED` desde `PENDING`/`INFORMED`.
Errores: `ApiErrorResponse { status, message, error, path, timestamp }` con `message` en español.

### Resolución de IDs → nombres (regla "sin IDs")

- `insurerId → nombre OS`: se carga el listado de OS activas vía
  `ObraSocialService.search({ state:'ACTIVE', page:0, size: grande })` (devuelve
  `InsurerSummary { id, name, ... }`) y se arma un índice `Map<insurerId, name>`.
- **Preview de pendientes por OS+período** (el endpoint no filtra): se obtiene
  `ObraSocialService.getCompleteById(insurerId)` → `plans[].id` (los `planId` de esa OS) y
  se filtra la lista de pendientes por `planId ∈ planes(OS)` **y** `serviceDate ∈ [from,to]`.
- En el **detalle**, el contrato no expone nombres de paciente ni de plan por prestación →
  se muestran **conteos + montos** (no nombres por prestación). Es una limitación de contrato,
  documentada como tal.

## Pantallas

### 1. Listado — `/financiero/liquidaciones`

- `ui-table` v2 + `FilterBar` (search + panel + chips).
- **Filtros** (FilterBar): Estado (PENDING/INFORMED/BILLED/CANCELLED, con color), Obra Social
  (options del índice de OS), Rango de fechas. El search filtra por N° / nombre OS.
- **Columnas**: N° (`settlementNumber`), Obra Social (resuelta), Tipo (badge SIMPLE/ESPECIAL),
  Período (`periodFrom – periodTo`), Estado (badge por estado), Creada (`createdAt`). Acción: **ver**.
- **Polling ETag/304** cada 5s con `PollingService` + `withPolling()`; el effect distingue
  `isNotModified` y emite `*NotModified` (sin pisar la lista). Se pausa con pestaña oculta.
- Botón **"Generar liquidación"** arriba a la derecha (solo ADMIN) → navega al wizard.
- **Empty state** ("Todavía no hay liquidaciones…").

### 2. Detalle — `/financiero/liquidaciones/:id`

- **Header**: N° + nombre OS + período + badges (estado, tipo).
- **Resumen de montos**: total (suma de `agreementSubtotal`), `informedDate`/`informedAmount`
  si el estado ≥ INFORMED. Montos con pipe `currencyAr`.
- **Convenios incluidos**: por cada `plan → agreement`, subtotal (`agreementSubtotal`) +
  **cantidad de prestaciones** (`providedServiceIds.length`).
- **Acciones lifecycle** (solo ADMIN), gateadas por estado:
  - `PENDING` → **Informar** (dialog: fecha, monto informado, observaciones opcional) + **Anular** (dialog: motivo, requerido).
  - `INFORMED` → **Anular**.
  - `BILLED` / `CANCELLED` → solo lectura (sin acciones).
- 422 → toast en español ("No se pudo informar/anular la liquidación: …" mapeado, sin leak).

### 3. Generar — wizard `ui-wizard-shell`, 2 pasos (solo ADMIN)

- **Paso 1 — Datos**: Obra Social (typeahead por nombre, sin IDs visibles) + Período (from/to).
  Validación: OS elegida y `from ≤ to`.
- **Paso 2 — Revisar**: preview de pendientes (conteo de prestaciones de esa OS en el período +
  rango de fechas observado). Si el preview da **0** → aviso ("No hay prestaciones pendientes
  para esa obra social y período") y se bloquea Confirmar. Confirmar → `POST /settlements`.
  - Éxito (201) → toast "Liquidación generada" + navegar al detalle de la nueva liquidación.
  - 422 → toast "No hay prestaciones pendientes para esa obra social y período."
  - 409 → toast "Ya existe una liquidación para esa obra social y ese período."

## Store / capa de datos (NgRx clásico — skill `ngrx-backend-request`)

- **Nuevo** `services/liquidaciones-api.service.ts` (separado del ya-grande `financiero-api.service.ts`):
  `listSettlements(filters)` (withPolling), `getSettlement(id)`, `generateSettlement(body)`,
  `informSettlement(id, body)`, `cancelSettlement(id, body)`, `listPendingServices()` (withPolling).
- **Nuevo** `models/liquidaciones.model.ts`: tipos `SettlementSummary`, `SettlementDetail`,
  `SettlementPlan`, `SettlementAgreement`, `SettlementStatus`, `SettlementType`,
  `GenerateSettlementBody`, `InformSettlementBody`, `CancelSettlementBody`, `PendingService`,
  `PendingPreview`.
- **Extender** `FinancieroState` con un slice `liquidaciones`:
  ```
  liquidaciones: {
    list: SettlementSummary[]; listLoading: boolean; listError: string | null;
    selected: SettlementDetail | null; detailLoading: boolean; detailError: string | null;
    generate: { submitting: boolean; error: string | null };
    lifecycle: { inProgress: boolean; error: string | null };
    pending: { items: PendingService[]; loading: boolean; error: string | null };
    insurers: InsurerSummary[]; // índice id→nombre y options de filtro
  }
  ```
- Actions/reducer/effects/selectors siguiendo el patrón existente del feature (pessimistic
  mutations, `selectSignal` en componentes, sin `@ngrx/entity`). Polling con `isNotModified`.

## Mensajes de error (regla #4)

Todo `HttpErrorResponse` pasa por mapeo a español sin leak. Mapeos clave:
- 422 generar → "No hay prestaciones pendientes para esa obra social y período."
- 409 generar → "Ya existe una liquidación para esa obra social y ese período."
- 422 informar/anular → mensaje del backend si es limpio, si no genérico
  ("No se pudo completar la acción sobre la liquidación.").
- Genérico de carga → "No se pudieron cargar las liquidaciones. Probá de nuevo."

## Testing (Vitest / `ng test`)

- **Smoke** de páginas: listado (renderiza filas desde mock store + gating del botón generar),
  detalle (acciones visibles según estado + rol), wizard (validación de pasos + dispatch +
  bloqueo si preview vacío).
- **Unit**: reducer (transiciones del slice), effects (success/failure/notModified, 409/422),
  selectors, `liquidaciones-api.service` (params/paths/withPolling).
- Verificación final: `ng test` verde.

## Fuera de alcance (follow-ups)

- Generar ESPECIAL (builder de reglas escalonadas).
- "Facturar" (INFORMED → BILLED) — bloqueado por `paymentId` crudo sin picker por nombre.
- Resumen de tesorería (`treasury/summary`).
- Exclusión de análisis por prestación (`excludedAnalysisIdsByPs`).
- Nombres de paciente/plan por prestación en el detalle (no expuestos por el contrato).
