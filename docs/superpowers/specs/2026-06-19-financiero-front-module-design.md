# Diseño: Módulo Financiero en el frontend (Sub-proyecto 2)

> **Fecha:** 2026-06-19
> **Estado:** Aprobado (brainstorming)
> **Repo:** `FRONTEND-LABORATORIO`
> **Parte de:** arco "Conexión FINANCIERO al front". Sub-proyecto 1 (backend, KAN-119) MERGED. Este es el Sub-proyecto 2.
> **Diseño hi-fi de referencia:** `tesis/design_handoff_financiero_angular/` (README normativo + prototipos).
> **Spec del arco:** `Backend/docs/superpowers/specs/2026-06-19-financiero-conexion-front-design.md` (§7).

---

## 1. Objetivo

Reemplazar el scaffold mock de `src/app/features/financiero/` (placeholders con datos inventados y rutas `/api/financiero/*` inexistentes) por las pantallas reales del módulo Financiero, conectadas a los endpoints reales del backend. Cobertura: **Caja** (home), **Cobros** (lista + detalle + cancelar), **Config fiscal** (SAAS_ADMIN), y placeholders **Coberturas/Liquidaciones**.

**Fuera de alcance (Sub-proyecto 3):** la pantalla "Cobrar atención" (componente de cobro). En este sub-proyecto el botón "Cobrar atención" de la Caja rutea a `/financiero/cobrar/:attentionId`, que se construye en el Sub-proyecto 3.

## 2. Stack y convenciones (del repo)

Angular 21 standalone + signals + NgRx clásico + PrimeNG + Tailwind, Vitest. `ChangeDetectionStrategy.OnPush`. Texto en español rioplatense; errores mapeados sin leaks (regla #4). Refresco en vivo con `PollingService` + ETag/304 (regla #5). Iconos PrimeIcons.

## 3. Hechos del codebase (verificados)

- **Scaffold actual a borrar:** `features/financiero/` → `models/financiero.model.ts` (stubs `Pago/Cobertura/Movimiento`), `services/financiero.service.ts` (rutas `/api/financiero/*`), `store/*` (loadPagos/Coberturas/Movimientos con `pending` único), `pages/{pagos,cajas,movimientos,coberturas,liquidaciones}`, `financiero-dashboard`, `financiero.routes.ts`.
- **branchId:** `OperatorBranchContextService` (`features/turnos/services/operator-branch.context.ts`) expone `branchId(): Signal<number|null>`, hidratado desde localStorage en el bootstrap. Fuente para Caja/Cobros.
- **Roles:** el JWT trae los códigos uppercase del backend (`ADMINISTRADOR`, `SECRETARIA`, `SAAS_ADMIN`). `TokenService.getRoles()` los devuelve. Gating: `HasRoleDirective` (`*hasRole="'ADMINISTRADOR'"`), `roleGuard('ADMINISTRADOR')` (factory, usado en `sucursales.routes`), `saasAdminGuard` (`core/guards/saas-admin.guard.ts`).
- **Sección:** `FINANCIERO` ya existe en `AccessSection`; el sidebar la gatea (`sectionKey: 'FINANCIERO'` + `ModuleKey.Financiero`).
- **Patrón NgRx:** servicio con `private readonly base = '/api/v1/...'` + `HttpClient` (auth y tenant los agregan interceptores globales); effects `switchMap` para loads, `concatMap` para mutaciones; `catchError` → failure action. Componentes con `store.selectSignal(...)`.
- **Polling:** `core/refresh/` → `PollingService.startPolling({key,intervalMs,poll})`, `withPolling()` (marca request polleable), `etagInterceptor` (304 → `NOT_MODIFIED`/`isNotModified()`). `ui-refresh-indicator` para el pill "Actualizado hace Xs".
- **Design system reusable (`shared/`):** `CurrencyArPipe` (`currencyAr`, ARS), `ui-empty-state`, `ui-table` (wrap `p-table`), `ui-page-header`, `ui-stat-card`, `ui-filter-bar`, `ui-refresh-indicator`, `NotificationService` (`notif.success/error`), `HasRoleDirective`. Modales con PrimeNG `p-dialog`/`ConfirmationService`.

## 4. Contratos de API (del Sub-proyecto 1, ya en development)

```
GET    /api/v1/financiero/cash-sessions/open?branchId=   -> 200 CashSessionResponse | 204
POST   /api/v1/financiero/cash-sessions                  -> 201 { branchId, openingAmount }  (409 si ya abierta)
PATCH  /api/v1/financiero/cash-sessions/{id}/close        -> { declaredAmount } (solo ADMINISTRADOR)
POST   /api/v1/financiero/cash-sessions/{id}/transactions -> 201 { branchId, type, amount, description }
GET    /api/v1/financiero/cash-sessions/{id}             -> CashSessionResponse (saldoActual)
GET    /api/v1/financiero/cash-sessions/{id}/activity    -> SessionActivityResponse { rows[], otrosMediosTotal, cobrosCount }
GET    /api/v1/financiero/payments?branchId=&status=     -> PaymentListItemResponse[]
GET    /api/v1/financiero/payments/{id}                  -> PaymentResponse
DELETE /api/v1/financiero/payments/{id}                  -> { reason }  (cancelar)
GET|POST /api/v1/financiero/tenant/fiscal-config[/{tenantId}]  (SAAS_ADMIN)
```

Enums TS (espejo del backend): `PaymentMethod = 'CASH'|'QR'|'POSNET'|'TRANSFER'|'CREDIT_CARD'|'DEBIT_CARD'`; `PaymentStatus = 'CREATED'|'PROCESSED'|'CANCELLED'`; `TransactionType = 'INGRESS'|'EGRESS'`; `CashSessionStatus = 'OPEN'|'CLOSED'`; `FiscalProvider = 'ARCA'|'COLPPY'|'NONE'`; `ComprobanteTipo = 'FACTURA_X'|'FACTURA_A'|'FACTURA_B'|'FACTURA_C'`.

`SessionActivityResponse.rows[]` = `{ type, method, amount, description, reference, occurredAt, esEfectivo, paymentId }`.
`PaymentListItemResponse` = `{ id, attentionId, branchId, totalAmount, copaymentAmount, status, createdAt, collections[] }`.

## 5. Estructura de archivos (nueva)

```
features/financiero/
  models/financiero.model.ts          # enums + interfaces espejo del backend + metadatos UI (label/icon/color/esEfectivo por método)
  services/financiero-api.service.ts   # /api/v1/financiero/*, withPolling() en open+activity
  store/
    financiero.actions.ts | reducer.ts | selectors.ts | effects.ts | state.ts   # slices: caja, cobros, configFiscal
  financiero.routes.ts                 # shell + rutas internas + guards
  financiero-shell/financiero-shell.component.ts   # layout con sub-nav (Caja/Cobros/Config)
  pages/
    caja/caja.page.ts                  # home: estado, KPIs, feed, modales
    caja/components/{abrir,movimiento,arqueo}-modal.component.ts
    cobros/cobros.page.ts              # lista
    cobros/cobro-detalle.page.ts       # detalle/ticket + cancelar-modal
    config-fiscal/config-fiscal.page.ts
    placeholder/modulo-no-disponible.component.ts   # coberturas/liquidaciones
  components/                          # presentacionales: metodo-chip, estado-caja-pill, estado-pago-pill, comprobante-card, desglose...
```

## 6. Pantallas (estados: con datos / cargando / vacío / error)

### 6.1 Caja (`/financiero/caja`, default)
- Resuelve la caja activa con `GET /cash-sessions/open?branchId=` usando `OperatorBranchContextService.branchId()`. 204 → estado **CERRADA** (empty-state + CTA "Abrir caja").
- **ABIERTA:** barra de estado (hora apertura, quién, monto) + acciones ["Registrar movimiento", "Cobrar atención" (→ `/financiero/cobrar`), "Cerrar caja" (solo `ADMINISTRADOR` vía `*hasRole`)]. 3 KPIs (efectivo arqueable hero = `saldoActual`, otros medios = `otrosMediosTotal`, cobros del turno = `cobrosCount`). Feed de actividad (`/activity`) en `ui-table` con chip de método + flag efectivo/otro medio.
- **Polling** 5s + ETag sobre `/activity` (y `/cash-sessions/{id}` para saldo) con `PollingService` + `withPolling()`; `ui-refresh-indicator`. Pausar en pestaña oculta (default del service).
- Modales: **Abrir** (`POST /cash-sessions`, 409 → "Ya hay una caja abierta para esta sucursal."), **Movimiento** (`POST .../transactions`, INGRESS/EGRESS + monto + descripción), **Arqueo** (`PATCH .../close`, esperado vs declarado vs diferencia con color; no bloquea; solo ADMIN).

### 6.2 Cobros (`/financiero/cobros`)
- Lista `GET /payments?branchId=` en `ui-table`: id, hora (`createdAt`), tipo de comprobante, paciente (resuelto desde `attentionId`), chips de métodos, monto cobrado, estado (PROCESSED/CANCELLED, cancelado tachado). Botón "Nuevo cobro" → `/financiero/cobrar`. Click fila → detalle.
- **Resolución de paciente:** desde `attentionId` con el API de atención existente (batch si es posible; si genera N+1 aceptable para el volumen del turno — documentar). Si no resuelve, mostrar `attentionId`.
- Detalle/ticket (`/financiero/cobros/:id`, `GET /payments/{id}`): datos del pago, líneas de cobro (efectivo/otro medio), comprobante card, acciones Imprimir/Descargar + **Cancelar pago** (solo si PROCESSED) → modal con motivo obligatorio → `DELETE /payments/{id}`. Banner rojo si CANCELLED.

### 6.3 Config fiscal (`/financiero/config-fiscal`, `saasAdminGuard`)
- Si no SAAS_ADMIN → el guard redirige; además empty-state "Acceso restringido" como fallback defensivo.
- Picker de proveedor (ARCA/COLPPY/NONE) + credenciales dinámicas (`configJson`): ARCA (punto de venta, CUIT, certificado, ambiente), COLPPY (punto de venta, API key, usuario), NONE (banner "solo Factura X"). Guardar → `POST /tenant/fiscal-config`.

### 6.4 Placeholders Coberturas/Liquidaciones
- `ModuloNoDisponibleComponent` reutilizable: empty-state "Próximamente / Módulo no disponible". Sin lógica.

## 7. Navegación

Una sola entrada "Financiero" en el sidebar (ya existe, gateada por `ModuleKey.Financiero` + sección `FINANCIERO`). Abre `financiero-shell` con **sub-navegación interna** (Caja / Cobros / Config fiscal; placeholders accesibles). `/financiero` redirige a `caja`. Ruta `config-fiscal` protegida con `saasAdminGuard`.

## 8. Reglas de negocio en UI (del handoff, normativas)

No cobrar sin caja abierta; suma de medios = total exacto (validación del cobro vive en sub-3); solo CASH arquea; copago/cobertura; comprobante automático; arqueo (diferencia no bloquea, solo ADMIN cierra); cancelar = reversa + anula comprobante + motivo. Mensajes de error: 409 "Ya hay una caja abierta para esta sucursal." · 422 sin caja "No se puede cobrar: no hay una caja abierta." · 422 montos "La suma de los medios de pago no coincide con el total."

## 9. Testing (convención del repo)

Obligatorio: reducers, effects, selectors, guards. Page-level: smoke al menos. Tests con Vitest (`ng test`/`npm test` — NO `npx vitest run` directo en componentes con `templateUrl`). Cuidado con `input.required()` + `setInput()` (usar workarounds conocidos del repo).

## 10. Riesgos / notas

- Resolución de nombre de paciente en la lista de Cobros (cross-feature a atención): preferir batch; documentar si queda N+1.
- "% cobertura" no viene explícito; cuando aplique, derivar (lo usa sub-3 más que sub-2).
- "Cobrar atención" depende del Sub-proyecto 3; en sub-2 el botón solo rutea.
- Un ticket Jira + un PR para todo el módulo (arco cohesivo), implementado en tareas TDD por pantalla.
