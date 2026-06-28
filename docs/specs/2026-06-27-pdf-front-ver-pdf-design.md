# Spec 4 — Front: botón "ver PDF" + fix NG0201 — Design

> **Jira:** [KAN-147](https://exequielsantoro.atlassian.net/browse/KAN-147)
> **Estado:** ✅ Implementado y verificado (smoke OK) — KAN-147, commit 46f0a1c.
> **Repo:** front `FRONTEND-LABORATORIO`.
> **Origen:** relevamiento forense de KAN-128 (hack temporal `abrirPdfAlFirmar$`).

## Reglas del repo a respetar (OBLIGATORIO)

- **`ngrx-backend-request` (OBLIGATORIO):** toda llamada al back va por NgRx clásico (createAction/createReducer, effects, selectSignal, mutations pessimistic). NADA de `this.api.*` directo desde un effect sin pasar por el ciclo de actions, ni `console.error`/`window.open` sueltos como manejo de resultado/errores.
- **Regla 4:** mensajes de error en español, user-friendly, sin leak. Toasts SIN emojis → PrimeIcons.
- **DI / toasts:** los toasts desde effects se muestran con `NotificationService` (providedIn root), NO con `MessageService` per-component (causa del NG0201).

## Reglas de ejecución para el implementador (OBLIGATORIO)

- **Ante un blocker, CONSULTAR — no decidir solo.** Ej: si el endpoint de descarga cambió de contrato (Spec 3 agrega validación de protocolo) y el front necesita coordinar, PARAR y reportar.
- **Antes de modificar, verificar consumidores.** Quitar el effect temporal `abrirPdfAlFirmar$` y el `MessageService` provider: verificar que nada más del componente dependa de ellos. Si `MessageService` se usa para otros toasts del componente, evaluar reemplazar TODOS por `NotificationService` o mantener compatibilidad — reportar la decisión.
- **Priorizar lo hecho en este repo** en cualquier merge.

## Problema

1. **Hack temporal `abrirPdfAlFirmar$`** ([validacion-detalle.effects.ts:78-95](../../src/app/features/analitica/muestras/store/validacion-detalle/validacion-detalle.effects.ts)): tras `firmarEstudio`, el effect llama directo `this.api.getStudyReports()` → `this.api.downloadReport()` → `window.open(url)` → `console.error(...)` en el catch. Viola `ngrx-backend-request` (llamadas directas, sin actions success/failure, sin toast de error real). Los métodos del service están marcados `// TEMPORAL: prueba de PDF al firmar — a remover` ([postanalitica-api.service.ts:40-49](../../src/app/features/analitica/muestras/services/postanalitica-api.service.ts)).
2. **NG0201** en la pantalla de validación: `providers: [MessageService]` en [validar-protocolo.page.ts:19](../../src/app/features/analitica/muestras/pages/validacion-protocolos/validar-protocolo/validar-protocolo.page.ts) crea un MessageService a nivel componente; un effect/servicio que resuelve en el root injector no encuentra el provider correcto → NullInjectorError / NG0201.

## Objetivo

Reemplazar el auto-open temporal por un **botón "Ver PDF" bajo demanda** (a la izquierda del botón "Firmar estudio", visible solo si el estudio ya tiene informe firmado), que dispara la descarga vía el ciclo NgRx correcto y abre el PDF; y eliminar la causa del NG0201 usando `NotificationService`.

## Diseño

### A. Botón "Ver PDF" (bajo demanda)
- En [validar-protocolo.page.html:38](../../src/app/features/analitica/muestras/pages/validacion-protocolos/validar-protocolo/validar-protocolo.page.html), a la IZQUIERDA del botón "Firmar estudio", agregar un botón "Ver PDF":
  - **Visible cuando el estudio ya está firmado** (el informe existe o se genera-si-falta en el back, Spec 3 — así que basta con que el estudio esté firmado para que el "Ver PDF" devuelva el documento). Usar la señal de estado-firmado que ya tenga el detalle; si no hay tal señal, VERIFICAR cómo el detalle expresa "firmado".
  - Antes de firmar (estudio sin firmar) NO se muestra.
  - Al click → dispara una action `verPdf` (no llamada directa).

### B. Ciclo NgRx correcto (reemplaza el effect temporal)
- Quitar `abrirPdfAlFirmar$` (el auto-open al firmar).
- Nuevas actions: `verPdf` / `verPdfSuccess` / `verPdfFailure` (+ las de listar reports si hace falta).
- Effect `verPdf$`: `getStudyReports` → elegir el último → `downloadReport` → en success, abrir el blob (`URL.createObjectURL` + open/anchor) y `verPdfSuccess`; en error → `verPdfFailure` con mensaje español.
  - Mutations pessimistic, manejo de loading/disabled del botón mientras descarga.
- Reducer/selectors: flag de loading de la descarga + (si aplica) la lista de reports.
- **Coordinación con Specs 2/3 (race resuelto en back):** el endpoint genera-si-falta el PDF (Spec 3.B-bis), así que el front SIEMPRE recibe el documento aunque el async aún no haya terminado — NO hay que pollear ni reintentar en el front por "todavía no existe". El front solo deshabilita el botón mientras descarga (UX). Los errores reales (403 módulo / 500 generación) se muestran como toast español.

### C. Fix NG0201
- Quitar `providers: [MessageService]` de [validar-protocolo.page.ts:19](../../src/app/features/analitica/muestras/pages/validacion-protocolos/validar-protocolo/validar-protocolo.page.ts).
- Los toasts (éxito/error de descarga y demás) se emiten desde el effect vía `NotificationService` (.success/.error), patrón ya usado en EmpresaEffects (`globalFailureToast$`).
- **VERIFICAR:** si el componente usaba `MessageService` directamente para otros toasts (no solo el del PDF). Si sí, migrar esos usos a `NotificationService` también, o dejar el `<p-toast>` global. Reportar qué se migró.

### D. Limpieza del service
- Quitar los comentarios `// TEMPORAL` de [postanalitica-api.service.ts:40-49](../../src/app/features/analitica/muestras/services/postanalitica-api.service.ts); los métodos `getStudyReports`/`downloadReport` pasan a ser parte estable del flujo "ver PDF" (ya no "prueba a remover").

## Análisis de impacto (a verificar por el implementador)

- **`abrirPdfAlFirmar$`:** solo lo consume el flujo de firma. Quitarlo no debe romper la firma (la firma sigue por su propio effect). VERIFICAR que ningún test/otro effect dependa de él.
- **`MessageService` provider:** grep en el componente y su template (`<p-toast>`). Si hay un `<p-toast>` local que dependía del provider per-component, decidir entre toast global o NotificationService. Reportar.
- **Imports muertos** tras quitar el effect (`window`, `console`, operadores rxjs que ya no se usan): limpiar.
- **El botón** no debe romper el layout existente del header de la pantalla.

## Testing

- Effect `verPdf$`: success (abre blob, emite success) y failure (emite failure + toast español). Usar `provideMockStore`/marble como el resto de effects del repo.
- El botón se muestra solo con informe presente (test del selector/template si el repo lo cubre).
- Smoke manual: firmar → aparece "Ver PDF" → click abre el PDF; sin NG0201 en consola.

## Fuera de alcance

- Visor de PDF embebido (se abre en pestaña/descarga, no inline en la app).
- Historial de versiones del informe en la UI (solo se abre el último).
- Back (Specs 1/2/3) — este spec asume el contrato del endpoint resultante.
