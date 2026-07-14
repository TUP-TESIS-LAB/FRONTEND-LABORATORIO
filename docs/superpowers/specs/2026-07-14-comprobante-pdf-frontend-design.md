# Comprobante PDF — integración frontend (KAN-233)

> **Jira:** [KAN-242](https://exequielsantoro.atlassian.net/browse/KAN-242)
> **Backend:** PR [#140](https://github.com/TUP-TESIS-LAB/Backend/pull/140) · contrato en `docs/financiero/comprobante-pdf-api.md` del repo Backend
> **Branch:** `feat/comprobante-pdf` (desde `development`)

## Problema

El backend ya emite el comprobante fiscal (Factura X) de un pago y expone su PDF, además de los endpoints para que el SaaS Admin cargue la identidad fiscal del emisor que sale impresa en ese PDF. El frontend no consume ninguno de los dos:

- El detalle del cobro tiene un botón "Descargar PDF" cuyo handler es un stub que llama a `window.print()`.
- No existe pantalla donde el SaaS Admin cargue razón social, CUIT, IIBB, domicilio comercial, condición IVA e inicio de actividades de cada laboratorio. Sin eso, el PDF sale con la razón social igual al nombre del tenant y `-` en el resto.

Las dos piezas son independientes: la Factura X **nunca falla** por falta de identidad fiscal.

## Alcance

1. Descarga real del comprobante PDF desde el detalle del cobro.
2. Tab "Identidad fiscal" en el detalle del tenant del SaaS Admin.

Fuera de alcance: integración ARCA (PR aparte), selector de tenants en `/financiero/config-fiscal`, abstracción de base URL.

## Endpoints consumidos

| Método | Endpoint | Rol | Notas |
|--------|----------|-----|-------|
| `GET` | `/api/v1/financiero/payments/{id}/comprobante/pdf` | `SECRETARIA`, `RESPONSABLE_SECRETARIA`, `ADMINISTRADOR` | `application/pdf`, `Content-Disposition: attachment` |
| `GET` | `/api/v1/financiero/tenant/fiscal-config/{tenantId}` | `SAAS_ADMIN` | Devuelve config default si nunca se configuró |
| `POST` | `/api/v1/financiero/tenant/fiscal-config` | `SAAS_ADMIN` | `targetTenantId` viaja **en el body** |

### Por qué `targetTenantId` va en el body

Es la única excepción del contrato: el resto de los endpoints resuelve el tenant desde el JWT. La tabla `tenant_fiscal_config` usa `target_tenant_id` deliberadamente **fuera** del filtro automático de tenant (`TenantEntityListener`), porque el que llama es un admin de plataforma operando **sobre otro tenant**. Tomar ese id del JWT del propio SaaS Admin apunta al tenant equivocado.

Esto descarta extender `/financiero/config-fiscal`, que hoy hace exactamente eso (`targetTenantId = tokenService.getTenantId()`). Esa pantalla no rompe nada hoy porque no manda los campos de identidad — ver la semántica de merge más abajo — pero agregárselos la volvería destructiva contra el tenant incorrecto.

## Unidad 1 — Descarga del comprobante (feature `financiero`)

Réplica de la cadena `exportSettlement` ya existente en `liquidaciones.effects.ts`, que resuelve el mismo problema (blob + `Content-Disposition`) para el Excel de liquidaciones.

**Componentes**

- `services/financiero-api.service.ts` → `getComprobantePdf(paymentId): Observable<HttpResponse<Blob>>` con `responseType: 'blob'`, `observe: 'response'`. Se observa la respuesta completa porque el filename viene en el header, no en el body.
- `store/financiero.actions.ts` → tripleta `downloadComprobante({ paymentId })` / `downloadComprobanteSuccess()` / `downloadComprobanteFailure({ error })`.
- `store/financiero.effects.ts` → `concatMap` (es una mutación de vista, no un read cacheable), `catchError` **dentro** del flattening operator.
- `store/financiero.reducer.ts` → flag `downloadingComprobante: boolean`, selector `selectDownloadingComprobante`.
- `pages/cobros/cobro-detalle.page.ts` → `descargar()` despacha la acción; el botón bindea `[loading]`.

**Helper compartido.** `triggerDownload` + `filenameFromDisposition` viven hoy privados en `liquidaciones.effects.ts`. Este es el segundo consumidor, así que suben a `@shared/utils/blob-download.ts`. `liquidaciones.effects.ts` pasa a usarlo (su spec existente cubre la regresión).

**Errores** (mapeados a español dentro del effect, toast vía `NotificationService`):

| HTTP | Mensaje |
|------|---------|
| `404` | "No existe un comprobante emitido para este pago." |
| `409` | "La configuración fiscal del emisor está incompleta. Contactá al administrador." (defensivo — inalcanzable con Factura X) |
| otro | "No se pudo descargar el comprobante. Probá de nuevo." |

**Pago cancelado:** el botón NO se oculta. El endpoint devuelve `200` con watermark ANULADO impreso.

**Limpieza incluida:** `cobro-detalle.page.ts` lee `fiscalReference` con un cast `as any` porque el modelo `Payment` no lo declara. Se declara `fiscalReference?: FiscalInvoiceReference` en el modelo y se saca el cast.

## Unidad 2 — Tab "Identidad fiscal" (feature `saas-admin`)

Cuarta tab en `/saas/tenants/:id`, junto a Información · Módulos · White label. Calcada de `tenant-white-label-tab.component.ts`, que ya resuelve el ciclo cargar → prefill → submit contra un tenant de la ruta.

El `tenantId` llega como `input.required<number>()` desde `tenant-detail.page.ts`, que lo deriva de la ruta. **Ese es el `targetTenantId`.**

**Componentes**

- `services/saas-admin-api.service.ts` → `getTenantFiscalConfig(tenantId)` y `upsertTenantFiscalConfig(req)`. Pegan a la URL de financiero; la URL es de financiero, el código no.
- `models/tenant-fiscal-config.model.ts` → tipo propio de la feature. Se duplica el DTO en vez de importarlo de `@features/financiero`, porque la convención prohíbe imports entre features y el tipo no es lo bastante genérico para subir a `@shared`.
- Store `saas-admin`: tripletas `loadTenantFiscalConfig` / `upsertTenantFiscalConfig`, `switchMap` para el load y `concatMap` para el write, `selectedTenantFiscalConfig` en el state.
- **Toast de éxito**: `SaasAdminEffects` hoy no dispara ninguno en sus writes. Se agrega para este (`"Identidad fiscal guardada"`), sin retocar los demás.
- `pages/tenant-detail/tabs/tenant-fiscal-tab.component.ts` → form reactivo, prefill vía `effect()`.
- `tenant-detail.page.ts` → `<p-tab value="fiscal">` + panel, y dispatch del load en `ngOnInit`.

**Semántica de merge — el único punto donde se puede romper.** Los 6 campos de identidad (`razonSocial`, `cuit`, `ingresosBrutos`, `domicilioComercial`, `condicionIva`, `inicioActividades`) son un **bloque**:

- Los 6 ausentes/`null` → el backend **preserva** la identidad guardada.
- Al menos uno presente → los 6 se **reemplazan**; los que falten quedan `null`.

Por lo tanto el submit **siempre manda los 6 campos**, con `null` explícito en los vacíos. Nunca un parcial. Queda comentado en el código.

**Validación** (espejo del backend, mensajes en español):

| Campo | Control |
|-------|---------|
| `cuit` | `Validators.pattern(/^\d{2}-?\d{8}-?\d$/)` — mismo regex que el backend |
| `condicionIva` | `p-select`: `RESPONSABLE_INSCRIPTO` \| `RESPONSABLE_MONOTRIBUTO` \| `EXENTO` |
| `inicioActividades` | `p-datepicker`, serializado a `YYYY-MM-DD` |
| `provider` | Fijo en `NONE` (el backend rechaza `ARCA`/`COLPPY` con 400 hasta que existan las integraciones) |

## Testing

Vitest, specs co-locados.

- `financiero.effects.spec.ts` — descarga OK (filename del `Content-Disposition`, anchor clickeado) y 404 (toast en español). Se copia el patrón del spec de `exportSettlement`, que ya stubea `URL.createObjectURL` y `document.createElement`.
- `financiero.reducer.spec.ts` — flag `downloadingComprobante`.
- `blob-download.spec.ts` — el helper compartido.
- `tenant-fiscal-tab.component.spec.ts` — submit manda los 6 campos aun con vacíos; CUIT inválido no despacha.
- `saas-admin.effects.spec.ts` — load/upsert + toast.

## Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Mover `triggerDownload` a `@shared` rompe la descarga de liquidaciones | El spec existente de `exportSettlement` cubre la regresión; corre en verde antes de mergear |
| El PDF sale con `-` en los campos fiscales | Es el comportamiento esperado del backend cuando el tenant no está configurado; la Unidad 2 lo resuelve |
| La PR supera el presupuesto de 400 líneas del review | Commits por unidad de trabajo, cada uno reviewable de forma independiente |
