# Liquidaciones — pulido UX (selección de planes, confirmación, bulk, i18n, post-generar)

> **Jira:** [KAN-174](https://exequielsantoro.atlassian.net/browse/KAN-174)
> **BE PR:** #117 (`feat/settlement-preview`) · **FE PR:** #125 (`feat/liquidaciones-frontend`)
> **Fecha:** 2026-07-03 · Continuación de KAN-172.

## Objetivo
Cerrar los gaps de UX/funcionales detectados al probar la pantalla de generar liquidación con datos
reales (500+ prestaciones por OS): poder elegir qué planes liquidar, un paso de confirmación, selección
masiva de prestaciones, dropdowns consistentes y en español, y un post-generar claro.

## Decisiones (cerradas con el usuario)
1. **Planes:** multiselect, todos tildados por defecto; se liquidan solo los planes elegidos.
2. **Post-generar:** volver al **listado** con toast de éxito (la nueva liquidación arriba).
3. **Alcance:** los 5 frentes en una sola tanda.

## Alcance

### 1. Selección de planes de la OS  (BE + FE)  — funcional
- **BE:** `planIds: List<Long>` opcional en `PreviewSettlementDetailRequest`/`Input` y
  `GenerateSettlementRequest`/`GenerateSettlementCommand`. Si viene no-vacío: validar con
  `validatePlansForInsurer(planIds, insurerId, tenantId)` y usar esos planes en lugar de
  `findPlanIdsByInsurer`. Si viene null/vacío → todos (compat).
- **FE:** al elegir OS, cargar sus planes (id + nombre + iva) y mostrar un multiselect (default todos).
  Pasar `planIds` al preview y al generate. OS de un solo plan (PAMI) muestra ese plan tildado.
- Endpoint de planes de la OS: reusar el existente de coberturas (nombre + iva por plan del insurer).

### 2. Paso "Confirmar"  (FE)
- Stepper pasa a 3 pasos: **Datos → Revisar → Confirmar**. "Confirmar" muestra resumen compacto
  (OS, período, planes, incluidas/excluidas, conteo por plan, neto/IVA/total) **sin** la tabla.
  El botón Generar vive en Confirmar.

### 3. Post-generar + 409 lifecycle  (FE)
- Al `generateSettlementSuccess`: navegar al **listado** (`/financiero/liquidaciones`) con toast de éxito
  (ya se emite `notif.success`). Quitar el salto seco al detalle.
- 409 "modificada por otra operación" = conflicto de versión en Informar/Anular (`mapLifecycleError`).
  Asegurar que el lifecycle use la versión fresca del detalle; en 409, recargar el detalle además del toast.

### 4. Consistencia + i18n de inputs  (FE)
- `providePrimeNG({ translation: <es> })`: meses/días en español, "Hoy/Limpiar", `firstDayOfWeek: 1`.
  Arregla el calendario (hoy en inglés) en toda la app.
- Modal Informar: reemplazar `<input type="date">`/`<input type="number">` nativos por `p-datePicker`
  + `p-inputNumber`, para verse igual que el paso 1.

### 5. Selección en bulk en Revisar  (FE)
- Extender `ui-table` con modo `selectable` (columna de checkbox + "seleccionar todo" + `selectionChange`)
  — reutilizable, respetando la skill `laboratory-ui-table`.
- En Revisar: barra de acción masiva **"Excluir seleccionadas / Incluir seleccionadas"** por plan y global.

## Fuera de alcance
- Desglose neto/IVA/total en el **detalle** (necesita persistir IVA en el settlement — follow-up).
- Eliminación total del insurer `Particular` / guard `SELF_PAY` (PR de NBU).

## Tests
- BE: preview/generate con `planIds` (scope correcto + validación de pertenencia).
- FE: multiselect de planes, paso Confirmar, bulk select (select-all + acción masiva), locale es,
  post-generar navega al listado.
