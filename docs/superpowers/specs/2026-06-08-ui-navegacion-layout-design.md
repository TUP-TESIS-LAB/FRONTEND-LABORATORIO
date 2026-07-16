# Sub-proyecto U — UI/UX: navegación, layout y fixes de atención

**Fecha:** 2026-06-08
**Branch:** `feat/ui-navegacion-layout` (worktree `ui-navegacion`)
**Base:** `origin/development` FE `57fd560`
**Alcance:** FE-only. Sin cambios de backend.
**Integración:** PR contra `development`. Nunca merge directo.

## Contexto y objetivo

La secretaria vive en **Recepción**. El sistema hoy expone Atenciones como pantalla
de primer nivel en el sidebar, tiene selectores de sucursal que contradicen la regla
"un usuario = una sucursal", el wizard de atención tiene bugs de estado y de layout, y
el chrome (sidebar/topbar) no sigue el patrón de referencia (logo en topbar, sin
breadcrumb, sidebar no colapsable). Este sub-proyecto reordena la navegación, limpia
los selectores, arregla el wizard y rehace el chrome.

Los fixes se agrupan en cinco frentes (A–E). Cada uno es independiente salvo donde se
indique.

---

## Grupo A — Wizard de atención: layout y fixes visuales

Archivos: `atencion-wizard.component.ts`, `steps/resumen-step/resumen-step.component.ts`,
`steps/analisis-step/`, `steps/datos-generales-step/`.

### A1 — Eliminar "Volver al listado"
Hay dos instancias del botón `Volver al listado` (modo *creating* línea 72; modo *detail*
línea 95). Se eliminan ambas. La navegación de retorno queda cubierta por el breadcrumb
(Grupo E) y por el flujo natural (finalizar/cancelar vuelve a Recepción, ver B3/B4).

### A2 — Icono flecha en "Volver fase"
Agregar `icon="pi pi-arrow-left"` al botón "Volver fase" (línea 139).

### A3 — Footer unificado del wizard
**Problema:** "Finalizar atención" vive dentro de `ResumenStepComponent`
(`<div class="flex justify-end">`), mientras "Volver fase" vive en el wrapper del wizard
(`<div class="flex justify-between mt-4">`). Son contenedores distintos → no se alinean.

**Diseño:** el botón de acción principal del step (Continuar / Finalizar) se eleva al
**footer del wizard**, en la misma fila que "Volver fase":

```
[← Volver fase]                              [Continuar →] / [✓ Finalizar atención]
```

Cada step component deja de renderizar su propio botón de avance y en su lugar:
- expone el estado que el wizard necesita para el botón (label, habilitado, loading) y
- emite un `@Output() primaryAction` cuando el wizard dispara la acción.

El wizard renderiza un único footer `flex justify-between` con "Volver fase" a la izquierda
y el botón primario (cuyo label/acción depende del step activo) a la derecha. El step
sigue siendo dueño de la lógica; solo se invierte quién renderiza el botón.

> **Nota de alcance:** el step `analisis` hoy avanza con su propio botón interno y emite
> `stepAdvanced`. Se adapta al mismo patrón. El step `datos` (modo creating y detail)
> también. Esto toca los tres step components pero es mecánico.

### A4 — Ancho del input Copago
El `p-inputNumber` de copago (resumen-step línea 119) usa `styleClass="w-36"` pero la
clase no llega al `<input>` interno de PrimeNG. Se corrige envolviendo en un contenedor
de ancho fijo o usando `inputStyleClass`/`[inputStyle]` para que el input quede del mismo
ancho que el resto de los valores de la columna derecha (Subtotal/Total), alineado a la
grilla del resumen.

---

## Grupo B — Wizard de atención: bugs de estado

### B1 — "Volver fase" desde paso 3 cae al paso 1
**Root cause:** el wizard muestra "Confirmar" (paso 3) vía `uiStepOverride`, sin que el
backend haya avanzado de estado (el backend sigue en `REGISTERING_ANALYSES`). Al hacer
"Volver fase", `onReturnPhase()` (línea 246) limpia el override **y además** despacha
`returnPhase` al backend. Desde `REGISTERING_ANALYSES` el backend retrocede a
`REGISTERING_GENERAL_DATA` → la UI cae al paso 1.

**Fix:** si hay un `uiStepOverride` activo, "Volver fase" debe **solo limpiar el override**
(volver al paso real del backend) y **no** despachar `returnPhase`. Solo cuando no hay
override (la UI está mostrando el paso real del backend) se despacha `returnPhase`.

```
onReturnPhase():
  if uiStepOverride() != null:   # estábamos en un paso "adelantado" por UI
    uiStepOverride.set(null)     # volver al paso real, sin tocar el backend
    return
  # estamos en el paso real → retroceder de verdad
  dispatch(returnPhase({ id }))
```

### B2 — "Análisis solicitados (0)" en el resumen
**Root cause:** el resumen lee `atencion().analysisAuthorizations` desde el `input`, que
proviene de `selectDetail`. El detail puede estar desactualizado respecto de los análisis
recién cargados en el paso 2 (el avance UI a "confirmar" via override no refresca el
detail). Por eso el resumen muestra 0.

**Fix:** al entrar a `ResumenStepComponent` (o al activarse el paso `confirmar`),
re-despachar `loadAtencion({ id })` para refrescar el detail antes de renderizar el
resumen. Confirmar que la respuesta del backend incluye `analysisAuthorizations`
poblado; si el endpoint de detail no los trae, usar `selectSummaryAnalyses`
(`loadAttentionAnalyses`) como fuente del listado en vez de `analysisAuthorizations`.
Se decide durante la implementación según lo que devuelva el detail real (verificación
contra el backend del entorno local).

### B3 — Al volver al paso 2 los análisis no aparecen
**Root cause:** mismo mismatch FE/BE que B1. Cuando "Volver fase" hacía retroceder el
backend de más, el paso 2 se montaba sobre un estado inconsistente. Resuelto B1, el
override se limpia sin tocar el backend y el paso 2 conserva su estado real.
`AnalisisStep` ya carga sus análisis vía `loadAttentionAnalyses`; se verifica que al
volver no se pierdan (no re-disparar un clear). **No se toca código adicional salvo que
la verificación post-B1 muestre que falta un refetch.**

### B4 — Logout intermitente al cancelar
**Root cause (hipótesis fuerte, a confirmar con repro):** el `authTokenInterceptor`
desloguea ante **401** (`tokens.removeToken()` + `userSession.clear()` + navigate a
`/login`). El interceptor corre en la capa HTTP, **antes** del `catchError` del effect
`cancel$`, así que un 401 en `PATCH /attentions/{id}/cancel` desloguea aunque el effect
lo capture. Como el bug es intermitente y el interceptor **solo** actúa sobre 401 (no
403), el disparador más probable es **token JWT vencido**: tras un rato en el wizard, el
token expira y la primera request que se haga (cancelar, en este caso) devuelve 401.

**Investigación (primer paso de implementación, con `systematic-debugging`):**
reproducir con la app corriendo, inspeccionar el status real de la response de cancel y
el `exp` del token. Confirmar 401-por-expiración vs. otra causa (403 cacheado de
access-sections, race de doble dispatch).

**Decisión de fix según hallazgo:**
- Si es **token vencido** → el logout es comportamiento correcto del interceptor (no se
  toca). No hay "bug de cancelar" per se; se documenta y se cierra. El fix real de este
  punto pasa a ser B4-nav (abajo).
- Si es **403/race u otra causa específica de cancelar** → se ataca esa causa puntual
  (p. ej. evitar doble dispatch, o no deslogueae ante 403 que ya no lo hace).

**B4-nav — destino post-cancelación:** independientemente del root cause del logout, al
cancelar exitosamente la atención el flujo debe mostrar la pantalla de cancelación actual
y luego volver al **listado de Recepción** (`/turnos/recepcion`), no al listado de
atenciones. Hoy `onFinished`/`back` navegan a `/analitica/atencion`. Recepción es el
destino por defecto de la secretaria.

### B5 — "Nueva atención" arrastra datos del paciente anterior
**Root cause:** `onFinished()` (wizard línea 278) navega a `/analitica/atencion` sin
llamar `clearAtencionSession()`. La sesión persistida en `localStorage`
(`atencion-session-store`) sobrevive y se restaura al montar el wizard en modo "nueva",
trayendo el paciente anterior. (Cancelar **sí** limpia, vía `onCancelConfirmed` →
`clearAtencionSession()`.)

**Fix:** `onFinished()` debe llamar `clearAtencionSession()` y limpiar el detail del
store (despachar el clear correspondiente) antes de navegar. Auditar que tanto
**finalizar** como **cancelar** dejen el estado limpio (sesión + store) para que la
próxima "Nueva atención" arranque en blanco.

---

## Grupo C — Navegación: Atenciones como tab de Recepción

### C1 — Sacar "Atención" del sidebar
Eliminar el item `Atención` de `layout/sidebar/sidebar.nav.ts` (líneas 101-108). La ruta
`/analitica/atencion` y el wizard `/analitica/atencion/:id` **se conservan** (siguen
siendo navegables y el wizard se abre desde Recepción).

### C2 — Tab "Atenciones" dentro de Recepción
En `recepcion.page` envolver el contenido en un `p-tabview` con dos tabs:
- **Tab "Recepción"** — el contenido actual de la página (turnos con/sin tótem, etc.).
- **Tab "Atenciones"** — embebe el componente de lista `atencion-dashboard` **reutilizado**
  (no duplicado), con un nuevo `@Input() embedded = false`:
  - `embedded === true` oculta el `<header>` (título "Atenciones" + botón "+ Nueva
    atención") y la sección de **KPI cards** (`grid grid-cols-5`).
  - El resto (buscador, filtros, tabla, acción "retomar/abrir atención" por fila) se
    mantiene intacto.

Sin cambio de URL (decisión confirmada: `p-tabview` local, sin child routes). El deep-link
a la tab secundaria no es requisito; la secretaria opera desde Recepción.

> **Coordinación:** `recepcion.page` ya inyecta `OperatorBranchContextService` y valida
> `branchId`. El tabview se monta dentro de la rama `branchId != null` para no romper el
> guard de "sin sucursal asignada".

---

## Grupo D — Sacar selectores de sucursal

Regla del proyecto: un usuario opera en UNA sucursal, resuelta del **contexto**
(`OperatorBranchContextService` + `BranchBootstrapService`), no de un selector. Se
elimina la **UI** del selector sin romper la **resolución**.

### D1 — Extracción (`extraction-queue.page`)
Quitar `<app-branch-selector-chip>` (líneas 86-90). Hoy la pantalla queda bloqueada con
"Elegí una sucursal arriba" hasta que se selecciona una (`selectedBranchId() == null`).
Sin selector, hay que **inicializar `selectedBranchId` automáticamente** desde el contexto
del operador (`OperatorBranchContextService.branchId()`), despachando el
`setSelectedBranch` correspondiente al montar. El empty-state "elegí una sucursal" deja de
tener sentido para el caso normal; se conserva solo el caso "no tenés sucursales asignadas"
(branch list vacía). Verificar que las queries branch-scoped de la cola sigan filtrando
por la sucursal del usuario.

> **Coordinación con sub-proyecto C (activo):** C trabaja en `tv-extraccion.page` +
> endpoint público (cola pública), no en `extraction-queue.page`. Misma zona, archivos
> distintos. Se avisa en el PR que se tocó la cola operativa.

### D2 — Recepción (`OperatorBranchFabComponent`)
Quitar `<app-operator-branch-fab />` de `recepcion.page.html` (línea 37). El FAB era un
selector flotante para cambiar de sucursal (escribe en `OperatorBranchContextService`).
Sin él, la sucursal queda fija a la del contexto del usuario (correcto por regla). El
componente FAB y su servicio quedan en el código (puede seguir usándose en dev FAB), solo
se quita del template de Recepción. Verificar que Recepción siga resolviendo `branchId`
desde el contexto (ya lo hace; el FAB no es necesario para eso).

---

## Grupo E — Chrome / layout

Archivos: `layout/admin-shell/`, `layout/sidebar/`, `layout/topbar/`, nuevo
`shared/ui/components/breadcrumb/`.

### E1 — Breadcrumb (arriba-izquierda)
Nuevo `BreadcrumbComponent` standalone OnPush que deriva la ruta de migas del router
activo. Fuente de datos: `Route.data.breadcrumb` en las definiciones de ruta
(string o función). El componente escucha `NavigationEnd`, recorre el árbol de rutas
activas y arma la lista de migas (ej. `Recepción > Atención A-322454`). Se ubica en la
zona superior-izquierda del área de contenido (dentro de `admin-shell`, sobre el
`router-outlet`, o en la franja del topbar lado izquierdo). Render con PrimeIcons como
separador (`pi pi-angle-right`), sin emojis. Las rutas relevantes reciben su `data.breadcrumb`.

> **Alcance del breadcrumb:** se cablean las rutas de las pantallas principales tocadas
> en este sub-proyecto (Recepción, Atención, Extracción) y el patrón queda listo para
> extender. No se cablea exhaustivamente toda la app en esta iteración.

### E2 — Logo + nombre del lab al sidebar
Mover el branding (logo + nombre del tenant) a la **parte superior del sidebar**, encima
de la sección "PRINCIPAL". El sidebar pasa a tener un header de marca. Fuente del logo y
nombre: la misma config de tenant que hoy usa el topbar (`tenantName()`, `logoSrc()`).

### E3 — Topbar sin branding
Quitar `.ui-topbar__brand` (logo + nombre + badge "Admin") del topbar (líneas 23-31). El
topbar queda limpio: hamburguesa (izq), buscador (placeholder), acciones (branch badge,
notificaciones, ayuda, avatar). Fondo blanco/limpio.

> El `ui-branch-badge` del topbar (read-only, "Sucursal: X") **se conserva** — informa la
> sucursal del usuario sin permitir cambiarla, lo cual es coherente con D1/D2.

### E4 — Sidebar colapsable (hamburguesa, desktop)
Hoy la hamburguesa del topbar abre el drawer mobile (`admin-shell` línea 31). Se agrega
**colapso en desktop**: una señal `collapsed` en `admin-shell` (o un servicio de layout)
que alterna entre sidebar expandido y colapsado (solo iconos / ancho reducido) con
transición CSS sobre `--sidebar-w`. La hamburguesa del topbar:
- en desktop → alterna `collapsed`;
- en mobile → abre el drawer (comportamiento actual).
Persistir la preferencia en `localStorage` es deseable pero opcional (YAGNI: solo si es
trivial). El sidebar colapsado debe seguir mostrando los iconos y resaltar el item activo.

---

## Qué NO entra
- **Cobro/Facturación en el wizard.** Esos pasos aparecen porque el tenant tiene
  FINANCIERO activado (config/seed del perfil `local`), no por un bug del FE — el wizard
  ya los filtra por módulo. Fuera de este sub-proyecto (el usuario lo resuelve aparte).
- **TV pública de extracción** (`tv-extraccion.page`) — es del sub-proyecto C.
- Refactors no relacionados al alcance.

## Testing
- Specs de componente con `ng test` (AOT, renderiza signal inputs).
- Store con `npx vitest`. `npm ci` primero en el worktree.
- TDD donde aplique (lógica de `onReturnPhase`, `embedded` del dashboard, derivación del
  breadcrumb, init de sucursal en extracción).
- Verificación manual del bug de logout (B4) contra el entorno local antes de cerrar.

## Done =
- **A:** Continuar/Finalizar alineado con "← Volver fase" en un footer único; sin "Volver
  al listado"; input Copago al ancho de la grilla.
- **B:** "Volver fase" desde paso 3 vuelve al paso 2 con los análisis intactos; resumen
  muestra los análisis cargados; finalizar y cancelar limpian sesión + store (Nueva
  atención arranca en blanco); causa del logout documentada y, si aplica, arreglada; al
  cancelar se vuelve a Recepción.
- **C:** Atenciones embebida como tab "Atenciones" dentro de Recepción (sin KPIs, sin
  "Nueva atención"), fuera del sidebar; wizard sigue siendo componente individual reusado.
- **D:** Sin selector de sucursal en Recepción ni Extracción; filtrado por sucursal del
  usuario sigue funcionando (resuelto del contexto).
- **E:** Breadcrumb arriba-izquierda; logo+nombre en sidebar; topbar blanco sin branding;
  sidebar colapsable con hamburguesa.
- Build verde, specs verdes, PR contra `development`.

## B4 — Hallazgo (root cause logout)

**Investigación (análisis estático):**

- `core/interceptors/auth-token.interceptor.ts` desloguea **solo** ante `HttpErrorResponse`
  con `err.status === 401` (línea: `if (err instanceof HttpErrorResponse && err.status === 401)`).
  En ese caso hace `tokens.removeToken()` + `userSession.clear()` + `router.navigate([target])`
  (`/login`, o `/saas/login` si la URL actual es del contexto SaaS). **NO actúa ante 403**
  ni ante ningún otro status — confirmado, la hipótesis se sostiene.

- `store/atencion/atencion.effects.ts` `cancel$` mapea el error con
  `catchError((error) => of(atencionMutationFailure({ error })))`. Pero ese `catchError`
  corre en el pipe RxJS del **effect**, que está aguas abajo del interceptor en la cadena
  HTTP: el interceptor envuelve la respuesta con su propio `catchError` (capa
  `HttpClient`/`next`) y ve el `401` crudo **primero**. Para cuando el error llega al
  effect, el interceptor ya ejecutó `removeToken + clear + navigate`. Por eso mapear el
  error a `atencionMutationFailure` no evita el logout: no es una cuestión de orden de
  `catchError` dentro del effect, sino de capas (interceptor HTTP vs effect de NgRx).

**Conclusión:** el logout intermitente al cancelar no es un bug de la lógica de cancelar.
El disparador más probable es un **token JWT vencido**: la request de cancelación devuelve
`401`, y el interceptor —correctamente— cierra la sesión y redirige a `/login`. Es
comportamiento esperado del interceptor; cualquier request que tope con un token vencido
produce lo mismo, cancelar solo lo hace visible por ser una acción puntual. **No se toca el
interceptor.** El único cambio accionable en el FE es de navegación post-cancel: al éxito de
la mutación, además de limpiar sesión + store, navegar a `/turnos/recepcion` (Recepción) en
vez de quedarse en el listado de atenciones.
