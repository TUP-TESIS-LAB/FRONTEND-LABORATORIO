# Rework del wizard de Nueva visita domiciliaria — Design

> **Fecha:** 2026-07-05
> **Repo:** FRONTEND-LABORATORIO
> **Base:** `development` (rama `fix/domicilio-route-redirect`, ya contiene los fixes de domicilio KAN-182/184 + extractor)
> **Jira:** _(pendiente — crear en jira-workflow antes de implementar)_

## 1. Objetivo

Reestructurar el alta de visita domiciliaria (`features/domicilio/pages/nueva-visita/nueva-visita.page.ts`), hoy un wizard de 2 pasos, en **4 pasos**, y sumar dos flujos que faltan: **alta de paciente desde el wizard** (redirect + volver preseleccionado) y **precarga de la dirección registrada del paciente** en el paso de domicilio, con un **banner** (no toast) que avisa que se está usando esa dirección.

### Decisiones cerradas (brainstorming 2026-07-05)

- **4 pasos:** P1 Paciente y horario · P2 Dirección y extractor · P3 Análisis y comentarios · P4 Confirmación/resumen.
- **Alta de paciente no registrado:** **redirect** a `/pacientes/nuevo` y al volver el paciente creado queda **preseleccionado** (no se persiste el resto del wizard: el paciente es el primer campo, no hay nada relevante que perder).
- **Precarga de dirección:** aplica a **cualquier** paciente seleccionado que tenga dirección primaria guardada (no solo el recién creado).
- **Banner:** arranca en estado *prefilled* ("usando la dirección registrada"); al editar cualquier campo de dirección pasa a *edited* ("modificaste la dirección registrada, se usa solo para esta visita"). Es un banner inline, **no un toast**.

## 2. Estado actual (punto de partida)

`nueva-visita.page.ts` es un componente standalone con `ui-wizard-shell`:
- `STEPS` (array de 2), `currentIndex` signal, `visited` signal, `formValue = toSignal(form.valueChanges)` (ya agregado — bridge de reactividad).
- Form reactivo: `scheduledAt`, `timeWindowStart/End`, `addressStreet/Number/City`, `addressReferences`, `comments`.
- `step0Valid` / `step1Valid` computeds (ya reactivos al `formValue()`).
- Paciente: `<pat-search-autocomplete (selected)="onPatientSelected($event)" />` → `selectedPatient` signal.
- Extractor: `p-autocomplete` con `optionLabel="displayName"` (fix `[object Object]` ya aplicado vía tipo `ExtractorOption`).
- Análisis: picker con tabla. Comentarios: textarea.
- `onFinish()` arma el payload y despacha el alta (`POST /api/v1/domicilio/visits`).

## 3. Diseño

### 3.1 Wizard de 4 pasos

`STEPS` pasa a 4 entradas:

| idx | key | Título | Contenido | Validez (para avanzar / finish) |
|---|---|---|---|---|
| 0 | `paciente` | Paciente y horario | paciente + fecha + ventana horaria | `step0Valid`: paciente + `scheduledAt` + `timeWindowStart` + `timeWindowEnd` |
| 1 | `direccion` | Dirección y extractor | calle*, número, ciudad*, referencias + extractor (opcional) | `step1Valid`: `addressStreet` + `addressCity` |
| 2 | `analisis` | Análisis y comentarios | análisis (opcional) + comentarios (opcional) | `step2Valid`: siempre `true` (todo opcional) |
| 3 | `resumen` | Confirmación | resumen read-only de P1–P3 | — (solo confirma) |

- El template se parte en 4 bloques `@if (currentIndex() === N)`. Se mueve el bloque de extractor a idx 1 (junto a dirección) y el de análisis + comentarios a idx 2.
- **Validez por paso** (computeds, todos leen `this.formValue()` para reactividad): se **conservan** los nombres existentes `step0Valid` (idx 0) y `step1Valid` (idx 1) — así NO se rompen los tests de KAN-184 que los referencian — y se **agrega** `step2Valid` (idx 2, = `true`). El wizard-shell usa `[continueDisabled]` según el paso actual (mapear currentIndex→validez de ese paso) y `[finishDisabled]="!(step0Valid() && step1Valid()) || pending()"`.
- **P4 resumen:** un bloque read-only que muestra paciente (apellido, nombre, DNI), fecha + ventana horaria, dirección (con indicación si es la registrada o modificada), extractor asignado (o "Sin asignar"), análisis seleccionados (o "Ninguno") y comentarios. El botón **"Agendar visita"** (finish del shell) queda visible en P4.
- Navegación: se mantiene `goTo` (saltar a pasos visitados), `next()`/`prev()`. `next()` valida el paso actual antes de avanzar.

### 3.2 Precarga de dirección del paciente

- Al seleccionar un paciente (`onPatientSelected`), se trae su **detalle completo** por id (servicio de pacientes que ya usa el `patient-form` para editar — devuelve `addresses: Address[]`).
- Se toma la dirección **primaria** (`isPrimary` o la primera activa). Si existe, se `patchValue` en P2:
  - `addressStreet ← street`
  - `addressNumber ← streetNumber`
  - `addressCity ← city`
  - `addressReferences ← ` (opcional: barrio/depto si están, formateado; si no, se deja vacío)
- Se setea `addressSource` signal a `'prefilled'` y se guarda `prefillPatientName` para el texto del banner.
- Si el paciente no tiene dirección primaria: no se precarga, `addressSource = 'none'`.
- La precarga **no pisa** una dirección que el usuario ya haya tocado manualmente en la sesión actual del wizard (si cambia de paciente, se re-precarga y el banner vuelve a `prefilled`).

### 3.3 Banner de dirección (P2)

- Signal `addressSource: 'none' | 'prefilled' | 'edited'`.
- Transición a `'edited'`: cuando `addressSource === 'prefilled'` y el usuario modifica cualquiera de los campos de dirección (calle/número/ciudad/referencias). Se detecta suscribiéndose a los `valueChanges` de esos controles (o comparando contra la dirección precargada) y flipeando el signal una vez.
- Render (inline, no toast; componente/markup con estilo laboratory-ui, PrimeIcons):
  - `prefilled` → info: "Estás usando la dirección registrada de **{prefillPatientName}**. Podés modificarla para esta visita."
  - `edited` → warn: "Modificaste la dirección registrada — se usará solo para esta visita."
  - `none` → sin banner.
- El resumen (P4) refleja el mismo estado ("Dirección registrada del paciente" / "Dirección modificada para esta visita" / "Dirección cargada manualmente").

### 3.4 Flujo "paciente no registrado" (redirect + preseleccionar)

1. En P1, junto al buscador de paciente: link **"¿No está registrado? Darlo de alta"** → `router.navigate(['/pacientes/nuevo'], { queryParams: { returnTo: '/domicilio/nueva' } })`.
2. **Cambio en `patient-form.page`** (feature pacientes): al crear con éxito, si hay query param `returnTo`, en vez de la navegación normal post-alta, navega a `returnTo` con el id del paciente creado como query: `/domicilio/nueva?patientId=<id>`. (Cambio acotado: leer `returnTo`, y en el success del alta, si está, redirigir ahí con `patientId`.)
3. **`nueva-visita.page` en `ngOnInit`:** lee `patientId` del query; si viene, trae ese paciente por id y lo **preselecciona** (`onPatientSelected`) — lo que dispara la precarga de dirección (3.2). El wizard arranca en P1 con el paciente puesto y su dirección precargada.
4. Si el usuario cancela el alta y vuelve manualmente, no pasa nada especial (sin `patientId`, wizard normal).

## 4. Componentes / archivos

- **Modificar** `features/domicilio/pages/nueva-visita/nueva-visita.page.ts`:
  - `STEPS` (4), template en 4 bloques, computeds de validez renombrados/agregados, resumen P4.
  - `onPatientSelected` → fetch detalle + precarga + `addressSource`.
  - lógica del banner (`addressSource`, detección de edición).
  - `ngOnInit` → leer `patientId` query y preseleccionar.
  - link "Darlo de alta" en P1.
- **Modificar** `features/pacientes/pages/patient-form/patient-form.page.ts`: honrar `returnTo` en el success del alta (redirigir con `patientId`).
- **Reusar** el servicio de pacientes (detalle por id con `addresses`) — el que ya consume `patient-form` para el modo editar. Confirmar el nombre exacto del método al implementar.
- **Banner:** reusar un componente de alerta/inline-banner del design system si existe; si no, markup propio con tokens laboratory-ui.

## 5. Errores, i18n, no-leak

- Todo el texto en español, user-friendly, sin leak (regla #4). Banner **inline, no toast**. Íconos PrimeIcons (no emojis). Errores HTTP (traer paciente / crear visita) → toast español genérico vía el helper del proyecto, sin volcar el `HttpErrorResponse`.

## 6. Testing

Page-level (vitest + harness AOT donde haga falta por signal inputs):
- Navegación entre los 4 pasos (avanzar solo con el paso válido; finish disabled hasta P1+P2 válidos).
- Precarga: al seleccionar un paciente con dirección primaria, se cargan calle/número/ciudad y `addressSource === 'prefilled'`.
- Banner: `prefilled → edited` al modificar un campo de dirección.
- Retorno con `patientId`: `ngOnInit` con `patientId` en query preselecciona el paciente (mock del servicio) y precarga la dirección.
- Alta: el payload final incluye la dirección efectiva (precargada o modificada) + extractor + análisis + comentarios (se mantiene el `onFinish` actual).
- Regresión ya cubierta: reactividad de validez por paso (test de KAN-184) y extractor `displayName`.

## 7. Fuera de alcance (follow-ups)

- Persistir TODO el wizard al redirigir al alta (se eligió no hacerlo: el paciente es el primer campo).
- Editar/gestionar múltiples direcciones del paciente desde el wizard (solo se usa la primaria).
- Cambios de backend (el alta de visita ya acepta la dirección estructurada; no se toca el contrato).

## 8. Puntos a confirmar al implementar (no bloquean el diseño)

1. Nombre exacto del servicio/método de **detalle de paciente** (con `addresses`) que reusa `patient-form`.
2. Cómo hace hoy `patient-form` la navegación post-alta (para insertar el branch `returnTo` sin romper el flujo normal).
3. Si existe un componente **banner/alert** reusable en el design system; si no, markup propio.
