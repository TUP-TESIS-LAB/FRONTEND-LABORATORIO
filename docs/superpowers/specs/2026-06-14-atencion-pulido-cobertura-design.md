# Atención — Pulido del wizard + cobertura y autorización

> **Estado:** Diseño aprobado (decisiones cerradas con el usuario el 2026-06-14).
> **Rama:** `feat/atencion-pulido-cobertura` (worktree `.worktrees/atencion-pulido`, off `development`).
> **Alcance:** Cross-stack (Frontend Angular + Backend Spring + migración Flyway).
> **PRs (regla del usuario): exactamente 1 PR de BE + 1 PR de FE.** Backend (tipo String + migración + endpoint) en un único PR de BE; todo el resto en un único PR de FE.
> **Jira:** [KAN-109](https://exequielsantoro.atlassian.net/browse/KAN-109)

## Contexto

El wizard de registro de atención (`atencion-wizard`) recibió varias mejoras de UX que conviven en un mismo PR porque tocan los mismos archivos. Todo se especifica **sobre la rama `development`** (no sobre `feat/cola-extraccion`, que está atrasada). Sobre `development` el wizard YA usa el stepper genérico compartido y YA tiene selector de cobertura por chips en el paso 1 — varias cosas que parecían faltantes ya existen; este spec corrige lo que realmente falta.

### Archivos núcleo (rutas reales en `development`)

- Wizard contenedor: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`
- Paso 1 (datos + selector cobertura): `.../steps/datos-generales-step/datos-generales-step.component.ts`
- Paso 2 (análisis): `.../steps/analisis-step/analisis-step.component.ts`
- Picker de análisis: `.../steps/analisis-step/analysis-picker.component.ts`
- Paso final (resumen/confirmar): `.../steps/resumen-step/resumen-step.component.ts`
- Shell de wizards: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts`
- Stepper header: `src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.ts`
- Store: `src/app/features/analitica/store/atencion/atencion.{actions,effects,reducer,selectors}.ts`
- API service FE: `src/app/features/analitica/services/atencion-api.service.ts`
- Modelos FE: `src/app/features/analitica/models/atencion.model.ts`
- BE atención: `Backend/.../modules/analitica/atencion/` (domain `Attention.java`, `presentation/SecretaryAttentionController.java`, `application/usecase/`, `infrastructure/persistence/`)

## Fuente de verdad de la cobertura

`detail().insurancePlanId` (lo setea el selector de chips del paso 1; `null` ⇒ **Particular**, valor ⇒ **Obra Social**). Está disponible en el `detail()` de la atención, por lo tanto los pasos 2 y final lo leen sin props nuevas.

---

## Item 1 + 5 — Migración a `ui-wizard-shell` (con URGENTE al lado del título)

**Decisión del usuario:** migración **completa** a `ui-wizard-shell` (no la alineación visual liviana). El item 5 (mover URGENTE al lado del título) se resuelve dentro de esta migración.

### Estado actual
- `atencion-wizard.component.ts` NO usa `ui-wizard-shell`. Arma:
  - Header propio `h2` con `Atención {{ headerTitle() }}` + botones "Volver al listado" / "Cancelar atención" (`atencion-wizard.component.ts:110-126`).
  - Badge URGENTE en un `<div class="mt-1">` **debajo** del `h2` (`:113-117`).
  - Stepper envuelto en `<div class="mb-6 rounded-lg border border-surface-200 overflow-hidden">` (`:143-150`) → recuadro con borde que NO matchea el resto.
  - Banner read-only + botón "Descargar rótulos" (`:128-141`).
  - Cada paso (datos/análisis/resumen) pinta su **propio footer** (ej. resumen: "Volver fase" / "Finalizar atención", `resumen-step.component.ts:173-181`).
- `ui-wizard-shell` hoy solo soporta `heading` (string) + `breadcrumb` (string) + footer estándar o `customFooter`. NO tiene slot para badge ni para acciones de header.

### Target
1. **Extender `ui-wizard-shell`** (cambios aditivos, no rompen pacientes/empleados/médicos/sucursal/agenda):
   - Slot proyectado al lado del `heading` para contenido inline (badge URGENTE). Sugerencia: `<ng-content select="[headingBadge]" />` dentro del `<header>`, después del `h1`, con `flex items-center gap-2`.
   - Slot proyectado de **acciones de header** alineado a la derecha del top bar: `<ng-content select="[headerActions]" />` (para "Volver al listado" / "Cancelar atención"). Sustituye al `breadcrumb` cuando se usa.
   - Soportar un **banner** opcional bajo el stepper (read-only / descargar rótulos), vía `<ng-content select="[wizardBanner]" />` o un input. Preferible slot proyectado para no acoplar el shell al dominio atención.
2. **Migrar `atencion-wizard`** a usar `ui-wizard-shell` con `customFooter: true`:
   - `heading` = `Atención {{ headerTitle() }}`. URGENTE va en `[headingBadge]` (esto cumple el item 5: queda inline al lado del documento/N° ticket).
   - Botones "Volver al listado" / "Cancelar atención" → `[headerActions]`.
   - Banner read-only + "Descargar rótulos" → `[wizardBanner]`.
   - Footer: subir los botones de navegación de cada paso al slot `[wizardFooter]` del shell. Los botones dependen del paso actual y de la máquina de estados; mantener la lógica (dispatch de acciones, `canReturn()`, `mutating()`) pero renderizar los botones en el wizard contenedor según `uiStep()?.key`, NO dentro de cada step component.
     - `datos`: el botón "Continuar" (lógica de `datos-generales-step`).
     - `analisis`: "Volver fase" + "Continuar" (habilitado solo con ≥1 análisis).
     - `confirmar`: "Volver fase" + "Finalizar atención" (abre modal de finalización).
   - **Refactor de los step components:** quitar sus footers internos y exponer outputs/inputs para que el wizard dispare las acciones (`returnPhase`, `continue`, `finish`, flags `disabled`/`loading`). Mantener tests verdes.
   - `maxWidth`: el contenido de atención tiene tablas anchas; usar un `maxWidth` mayor al default 720px (ej. `'960px'` o `'1100px'`) — validar visualmente. Pasarlo como input del shell.

### Riesgos / notas
- Es el item más grande. La máquina de estados de atención (no navegación libre) sigue intacta: el stepper usa `[clickable]="readOnly()"` y la navegación real la maneja el backend; el footer customFooter solo dispara las transiciones existentes.
- No cambiar el comportamiento de read-only ni de cancelación; solo reubicar su UI dentro del shell.
- Specs a actualizar: `atencion-wizard.component.spec.ts`, specs de cada step que pierda su footer.

---

## Item 2 — Ocultar "autorizado" si la cobertura es Particular

### Estado actual
- Paso 2 (`analysis-picker.component.ts:69-77`): checkbox `isAuthorized` por fila, **siempre visible**.
- Paso final (`resumen-step.component.ts`): columna "Autorizado" con `<p-tag>` `Autorizado` (success) / `Particular` (warn), **siempre visible**.

### Target
- Cuando `detail().insurancePlanId === null` (Particular):
  - Paso 2: **ocultar** la columna del checkbox "Autorizado" del picker.
  - Paso final: **ocultar** la columna del tag "Autorizado/Particular".
- Cuando es OS (`insurancePlanId != null`): se muestran (comportamiento de items 3).
- Implementación: pasar la cobertura/flag `isParticular` (derivado de `insurancePlanId`) a `analysis-picker` y a `resumen-step` (o computarlo desde el `detail()` que ya tienen). Gating con `@if` en el template de la columna.

---

## Item 3 — Auto-autorizar cuando hay Obra Social (editable por análisis)

**Decisión del usuario:** default autorizado, **editable por análisis** (el operador puede destildar puntuales).

### Estado actual
- Al agregar un análisis, `isAuthorized` arranca según la lógica actual del picker (no deriva de la cobertura).

### Target
- Al agregar un análisis con cobertura OS (`insurancePlanId != null`): default `isAuthorized = true`.
- El checkbox por fila se mantiene visible y editable (el operador puede pasar a `false` los que la OS no cubre).
- Con cobertura Particular: el concepto no aplica (columna oculta, item 2); enviar `isAuthorized: false` consistente en el payload.
- Si el operador cambia la cobertura en el paso 1 después de haber cargado análisis, definir comportamiento: **re-derivar el default solo para nuevos análisis** (no pisar ediciones manuales ya hechas). Documentar este límite en el código.

---

## Item 4 — Nro de autorización (uno por atención, en el paso final)

**Decisiones del usuario:** uno **por atención**; persistir vía **endpoint dedicado** `PATCH /{id}/authorization-number`.

### Estado actual
- `Attention.authorizationNumber` existe (BE) pero se setea solo como parte de `AddAnalysisListRequest`; el FE lo manda **hardcodeado a `null`** (`analisis-step.component.ts:203`).
- El copago ya tiene su endpoint dedicado `PATCH /api/v1/attentions/{id}/copayment` + acción `setCopayment` (`atencion-api.service.ts:84`, `atencion.actions.ts:82-83`, `resumen-step.component.ts:381`). **Este es el patrón a espejar.**

### Target — Backend
- Nuevo endpoint `PATCH /api/v1/attentions/{id}/authorization-number` en `SecretaryAttentionController`.
  - Request DTO: `{ authorizationNumber: String | null }`.
  - Nuevo `SetAuthorizationNumberUseCase` que carga la atención, valida tenant + estado editable, setea `authorizationNumber`, persiste, devuelve `AttentionResponse`.
  - Validación de estado: permitir solo en estados de carga (no en finalizada/cancelada), análogo a `setCopayment`.
- `AddAnalysisListRequest`: mantener el campo `authorizationNumber` opcional para preservarlo en re-submits (el `removeAnalysisFromResumen` reenvía la lista con `authorizationNumber: attn.authorizationNumber`, `resumen-step.component.ts:370`). El **writer canónico** pasa a ser el endpoint dedicado; addAnalysisList NO debe pisarlo con `null`.

### Target — Frontend
- Acción `setAuthorizationNumber({ attentionId, authorizationNumber })` + `...Success` (espejo de `setCopayment`), effect que pega al nuevo endpoint, método en `atencion-api.service.ts`.
- En el **paso final** (`resumen-step`): input "Nro de autorización" (texto), **visible solo si OS** (`insurancePlanId != null`), dispara `setAuthorizationNumber` en blur (dedup como `onCopaymentBlur`).
- Quitar el `authorizationNumber: null` hardcodeado de `analisis-step.component.ts:203` (dejar de mandarlo o mandar el actual de la atención para no pisarlo).

---

## Item 3-tipo — `authorizationNumber` pasa a String (alfanumérico)

**Decisión del usuario:** alfanumérico (las OS pueden usar códigos con letras/guiones, ej. `AUTH-1`).

### Cambios Backend
- `Attention.authorizationNumber`: `Long` → `String`.
- `AttentionJpaEntity` + `AttentionJpaMapper`: columna/campo a `String`.
- DTOs: `AddAnalysisListRequest`, `AttentionResponse`, `AttentionPresentationMapper`, request del nuevo endpoint (item 4).
- **Migración Flyway `V959__alter_attentions_authorization_number_to_varchar.sql`** (próxima versión libre confirmada: último es V958):
  - Cambiar `attentions.authorization_number` de `BIGINT` a `VARCHAR(64)` (longitud a confirmar).
  - **H2 vs MySQL:** escribir sintaxis compatible con ambos (tests corren H2, boot corre MySQL). Revisar `db/migration` y `db/migration-local` — replicar/ajustar en `migration-local` si aplica. Validar boot contra el MySQL real del docker (ver memorias `migrations-h2-vs-mysql` y `mysql-boot-verification`).
  - **Colisión de versión:** confirmar que ningún PR abierto ya usa V959 antes de mergear (ver memoria `flyway-version-collision-on-merge`).
  - Datos existentes: si hay valores numéricos cargados (demo), el cast BIGINT→VARCHAR es directo; verificar que la migración convierte sin pérdida.

### Cambios Frontend
- `atencion.model.ts`: `authorizationNumber: number | null` → `string | null` (2 ocurrencias: líneas ~67 y ~119).
- Input del paso final como texto.
- Actualizar specs que usan `authorizationNumber` (varios en `store/atencion/*.spec.ts`, `resumen-step.component.spec.ts`, `atencion-wizard.component.spec.ts`). Nota: `resumen-step.component.spec.ts` ya usa `'AUTH-1'` como string en algunos casos — alinear todos a string.

---

## Item 6 — Empty state del paso 2

### Estado actual
- El picker del paso 2 no muestra nada cuando `items().length === 0`.

### Target
- Mostrar el mensaje **"Ingrese análisis para continuar"** cuando no hay análisis cargados (texto exacto pedido por el usuario).
- Ubicación: dentro del paso 2, debajo/dentro del área de la tabla del picker. Reusar `ui-empty-state` si encaja, o un texto inline discreto.
- El botón "Continuar" ya está deshabilitado con 0 análisis (sin cambio).

---

## Item 7 — Subtotal/copago/total en una fila compacta

### Estado actual
- `resumen-step.component.ts:138-171`: 3 filas verticales apiladas (Subtotal / Copago[input] / Total), cada una `flex justify-between`.

### Target
- Remaquetar a **una sola fila horizontal** debajo de la tabla de análisis: `Subtotal · Copago[input] · Total` en línea, para ahorrar espacio vertical.
- Copago sigue editable (`p-inputNumber`, dispara `setCopayment` en blur). Total sigue siendo `subtotal + copago` en vivo (`liveTotal()`).
- Mantener `currencyAr` y el formato. Responsive: en pantallas chicas puede colapsar a columna, pero el default es fila.

---

## Plan de testing

- **FE:** `ng test` (AOT, renderiza signal inputs) para los componentes de paso y el wizard; `npx vitest` para reducers/effects/selectors del store. `npm ci` en el worktree nuevo antes de testear.
  - Casos clave nuevos: columna autorizado oculta en Particular; default autorizado=true en OS y destildable; input nro autorización visible solo en OS y dispara `setAuthorizationNumber`; empty state paso 2; fila de precios compacta; URGENTE inline en el shell.
- **BE:** suite + boot MySQL real (perfil `local`, schema fresco) para validar la migración V959. Endpoint nuevo con test de usecase + controller. Verificar que la suite H2 sigue verde tras el cambio de tipo.
- **E2E manual (smoke):** flujo completo de atención OS (auto-autoriza, carga nro, finaliza) y flujo Particular (sin columna autorizado).

## Orden sugerido de implementación

1. BE: tipo String + migración V959 + endpoint `authorization-number` + tests (base para el FE).
2. FE store/service: modelos a string, acción/effect `setAuthorizationNumber`.
3. FE shell: extender `ui-wizard-shell` (slots badge/headerActions/banner) sin tocar atención todavía; verificar que los otros wizards siguen iguales.
4. FE wizard: migrar `atencion-wizard` al shell + subir footers por paso.
5. FE pasos: items 2, 3, 6, 7 (gating cobertura, auto-autorizar, empty state, fila precios) + input nro autorización en paso final.
6. Tests + smoke.

## Fuera de scope (otros sub-proyectos)

Genérico (padding stepper), Sucursales, Médicos/Empleados, Obras Sociales/Liquidaciones, Extracción — cada uno su propio spec/PR.
