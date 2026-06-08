# Sub-proyecto U — UI/UX (navegación, layout y fixes de atención) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la navegación (Atenciones → tab de Recepción), eliminar selectores de sucursal sin romper la resolución por contexto, arreglar los bugs de estado y layout del wizard de atención, y rehacer el chrome (breadcrumb, sidebar con logo, topbar limpio, sidebar colapsable).

**Architecture:** Angular standalone + OnPush + signals. Estado de atención en NgRx (acciones/reducer/selectors en `store/atencion/`). UI con PrimeNG + Tailwind. El wizard muestra pasos "adelantados" por UI vía `uiStepOverride` sin avanzar el backend; varios bugs vienen de ese desfasaje. Los selectores de sucursal se eliminan de la UI pero la sucursal sigue resolviéndose de `OperatorBranchContextService`.

**Tech Stack:** Angular, NgRx, PrimeNG, Tailwind, RxJS. Tests: `ng test` (component specs, AOT) y `npx vitest` (store). `npm ci` primero.

**Integración:** PR contra `development`. Nunca merge directo a la rama.

**Orden de fases:** D (selectores, aislado) → C (nav/tab) → B+A (wizard, mismos archivos) → E (chrome).

---

## Setup (una vez)

- [ ] **Step 0.1: Instalar dependencias**

Run: `npm ci`
Expected: instala sin errores (puede tardar).

- [ ] **Step 0.2: Baseline de tests verde**

Run: `npx vitest run src/app/features/analitica/store/atencion`
Expected: PASS (baseline del store de atención antes de tocar nada).

---

## Grupo D — Sacar selectores de sucursal

### Task D1: Quitar el FAB de sucursal de Recepción

**Files:**
- Modify: `src/app/features/turnos/pages/recepcion/recepcion.page.html` (línea 37)
- Modify: `src/app/features/turnos/pages/recepcion/recepcion.page.ts` (imports)

- [ ] **Step 1: Quitar el componente del template**

En `recepcion.page.html`, eliminar la última línea:
```html
<app-operator-branch-fab />
```

- [ ] **Step 2: Quitar el import del componente**

En `recepcion.page.ts`, eliminar la línea de import:
```typescript
import { OperatorBranchFabComponent } from '../../components/operator-branch-fab.component';
```
y removerlo del array `imports: [...]` del `@Component`.

- [ ] **Step 3: Verificar build/typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores de "OperatorBranchFabComponent" no usado / no encontrado.

> La resolución de sucursal de Recepción usa `branchContext.branchId()` (ya inyectado, no depende del FAB). No se toca. El componente FAB queda en el código para el dev FAB.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/turnos/pages/recepcion/recepcion.page.html src/app/features/turnos/pages/recepcion/recepcion.page.ts
git commit -m "feat(recepcion): quitar selector de sucursal (FAB), resolver del contexto (D2)"
```

### Task D2: Quitar el branch-selector-chip de Extracción y auto-inicializar la sucursal

**Files:**
- Modify: `src/app/features/analitica/pages/extraction-queue/extraction-queue.page.ts`

**Contexto:** hoy la cola se bloquea con "Elegí una sucursal arriba" mientras `selectedBranchId() == null`. Sin selector, hay que sembrar `selectedBranchId` desde `OperatorBranchContextService.branchId()` al montar.

- [ ] **Step 1: Leer el componente para ubicar el ngOnInit y el dispatch de setSelectedBranch**

Run: `grep -n "ngOnInit\|OperatorBranchContext\|operator-branch\|setSelectedBranch\|dispatchBranchChange\|boxService\|inject(" src/app/features/analitica/pages/extraction-queue/extraction-queue.page.ts`
Expected: ubica el `ngOnInit`, el servicio de contexto (si está inyectado) y `dispatchBranchChange`.

- [ ] **Step 2: Inyectar `OperatorBranchContextService` si no está**

En la clase del componente, agregar (si falta):
```typescript
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
// ...
private readonly operatorBranch = inject(OperatorBranchContextService);
```

- [ ] **Step 3: Sembrar la sucursal del contexto al montar**

En `ngOnInit` (o en un `effect` del constructor), tras cargar `branches`, si `selectedBranchId() == null` y el contexto tiene sucursal, despachar el cambio:
```typescript
// Auto-seleccionar la sucursal del operador (regla: 1 usuario = 1 sucursal).
// Reemplaza al selector eliminado de la UI.
const ctxBranchId = this.operatorBranch.branchId();
if (ctxBranchId != null && this.selectedBranchId() == null) {
  this.dispatchBranchChange(ctxBranchId);
}
```
> Si `dispatchBranchChange` es privado, usarlo igual (mismo componente). Si la lista de branches se carga async, hacer el seed dentro del mismo `effect`/subscribe donde hoy se resuelve `branches`/`selectedBranch` (ver Step 1).

- [ ] **Step 4: Quitar el chip del template**

Eliminar el bloque (líneas ~86-90):
```html
<app-branch-selector-chip
  [selected]="selectedBranch()"
  [options]="branches()"
  (selectBranch)="onBranchChange($event)"
/>
```
y el import de `BranchSelectorChipComponent` + su entrada en `imports: [...]`.

- [ ] **Step 5: Ajustar el empty-state**

El bloque `@if (selectedBranchId() == null)` con "Elegí una sucursal arriba" deja de aplicar para el caso normal. Conservar **solo** la rama de "no tenés sucursales asignadas" (`branches().length === 0`). Si `selectedBranchId()` sigue null pero hay branches (caso transitorio de carga), mostrar el skeleton/loading existente en vez del cartel de "elegí una sucursal".

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

- [ ] **Step 7: Verificación manual (con la app local corriendo)**

Loguear como operador con sucursal asignada, ir a la cola de extracción. Esperado: la cola carga filtrada por la sucursal del usuario **sin** pedir seleccionar sucursal, y sin el chip arriba a la derecha.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/analitica/pages/extraction-queue/extraction-queue.page.ts
git commit -m "feat(extraccion): quitar selector de sucursal, auto-init desde contexto del operador (D1)"
```

> **Coordinación con sub-proyecto C:** mencionar en el PR que se tocó `extraction-queue.page` (cola operativa). C trabaja en `tv-extraccion.page` (cola pública), archivo distinto.

---

## Grupo C — Atenciones como tab dentro de Recepción

### Task C1: Sacar "Atención" del sidebar

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts` (líneas 101-108)

- [ ] **Step 1: Eliminar el item de navegación**

Borrar el objeto del item "Atención":
```typescript
{
  kind: 'link',
  label: 'Atención',
  icon: 'pi pi-users',
  path: '/analitica/atencion',
  sectionKey: 'ATENCION',
  badge: { text: '3', tone: 'green' },
},
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores. La ruta `/analitica/atencion` y el wizard siguen existiendo (solo se sacó del menú).

- [ ] **Step 3: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(nav): sacar Atención del sidebar (C1)"
```

### Task C2: Agregar `embedded` al dashboard de atenciones

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.ts`
- Test: `src/app/features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.spec.ts`

- [ ] **Step 1: Escribir el test que falla (embedded oculta header + KPIs)**

En el spec, agregar:
```typescript
it('embedded=true oculta el header (título + Nueva atención) y las KPI cards', async () => {
  const fixture = TestBed.createComponent(AtencionDashboardComponent);
  fixture.componentRef.setInput('embedded', true);
  fixture.detectChanges();
  const html: string = fixture.nativeElement.textContent;
  expect(html).not.toContain('+ Nueva atención');
  expect(fixture.nativeElement.querySelector('ui-stat-card')).toBeNull();
});

it('embedded=false (default) muestra header y KPIs', () => {
  const fixture = TestBed.createComponent(AtencionDashboardComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Nueva atención');
});
```
> Si el spec ya tiene setup de TestBed con el store mockeado, reutilizarlo. Si no, copiar el patrón de un spec vecino que mockee `provideMockStore`.

- [ ] **Step 2: Correr el test → debe fallar**

Run: `ng test --include='**/atencion-dashboard.component.spec.ts' --watch=false`
Expected: FAIL (todavía no existe el input `embedded`).

- [ ] **Step 3: Agregar el input `embedded`**

En la clase:
```typescript
readonly embedded = input<boolean>(false);
```
(Asegurar que `input` esté importado de `@angular/core`.)

- [ ] **Step 4: Condicionar header y KPIs en el template**

Envolver el `<header>` (título + "Nueva atención") y la `<section class="grid grid-cols-5 ...">` (KPIs) en `@if (!embedded()) { ... }`:
```html
@if (!embedded()) {
  <header class="flex items-center justify-between mb-4">
    ...título + botón "+ Nueva atención"...
  </header>
  <section class="grid grid-cols-5 gap-3 mb-5">
    @for (k of kpiTiles(); track k.label) { <ui-stat-card ... /> }
  </section>
}
```
Dejar el buscador + filtros + tabla siempre visibles.

- [ ] **Step 5: Correr el test → debe pasar**

Run: `ng test --include='**/atencion-dashboard.component.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.ts src/app/features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component.spec.ts
git commit -m "feat(atenciones): input embedded oculta header+KPIs para uso como tab (C2)"
```

### Task C3: Montar el tabview en Recepción

**Files:**
- Modify: `src/app/features/turnos/pages/recepcion/recepcion.page.ts`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion.page.html`

- [ ] **Step 1: Importar TabView y el dashboard en el componente**

En `recepcion.page.ts`:
```typescript
import { TabViewModule } from 'primeng/tabview';
import { AtencionDashboardComponent } from '@features/analitica/pages/atencion/atencion-dashboard/atencion-dashboard.component';
```
Agregarlos a `imports: [...]`.

- [ ] **Step 2: Envolver el contenido de Recepción en un p-tabview**

En `recepcion.page.html`, dentro de la rama `@else if (enabled()...)` / `@else` (donde hoy se renderiza `recepcion-con-totem` / `recepcion-sin-totem`), envolver en tabs. Mantener el guard `branchId == null` por fuera del tabview (no cambia):
```html
<p-tabView>
  <p-tabPanel header="Recepción">
    @if (enabled() === true) {
      <app-recepcion-con-totem ... />
    } @else {
      <app-recepcion-sin-totem ... />
    }
  </p-tabPanel>
  <p-tabPanel header="Atenciones">
    <lab-atencion-dashboard [embedded]="true" />
  </p-tabPanel>
</p-tabView>
```
> Reusar exactamente los mismos bindings de `recepcion-con-totem`/`recepcion-sin-totem` que ya existen (no cambiarlos). El `selector` del dashboard es `lab-atencion-dashboard` (verificar con `grep "selector:" atencion-dashboard.component.ts`).

- [ ] **Step 3: Verificar typecheck + spec de recepción**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.
Run: `ng test --include='**/recepcion.page.spec.ts' --watch=false` (si existe; si no, omitir).

- [ ] **Step 4: Verificación manual**

Recepción muestra dos tabs: "Recepción" (contenido actual) y "Atenciones" (lista sin KPIs ni "Nueva atención"). La tab Atenciones permite abrir/retomar una atención existente.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/turnos/pages/recepcion/recepcion.page.ts src/app/features/turnos/pages/recepcion/recepcion.page.html
git commit -m "feat(recepcion): tab Recepción + tab Atenciones (dashboard embebido) (C2)"
```

---

## Grupo B — Wizard: bugs de estado

### Task B1: "Volver fase" desde un paso adelantado no debe retroceder el backend

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` (`onReturnPhase`, línea 246)

**Root cause:** con `uiStepOverride` activo (paso mostrado por UI, p.ej. "confirmar"), "Volver fase" limpia el override **y** despacha `returnPhase`, retrocediendo el backend de más → cae al paso 1.

- [ ] **Step 1: Implementar el guard del override en `onReturnPhase`**

Reemplazar el método:
```typescript
onReturnPhase(): void {
  const d = this.detail();
  if (!d) return;
  // Si estamos mostrando un paso "adelantado" sólo por UI (override),
  // volver al paso real del backend SIN retroceder de estado.
  if (this.uiStepOverride() != null) {
    this.uiStepOverride.set(null);
    return;
  }
  // Estamos en el paso real → retroceder de verdad en el backend.
  this.store.dispatch(returnPhase({ id: d.id }));
}
```

- [ ] **Step 2: Verificación manual del flujo (con app local)**

Crear/abrir una atención, avanzar hasta el paso "Confirmar" (override), tocar "← Volver fase". Esperado: vuelve al paso **Análisis** (paso 2), no al paso 1, y los análisis siguen cargados.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "fix(wizard): Volver fase desde paso adelantado limpia override sin retroceder backend (B1/B3)"
```

### Task B2: Resumen refresca el detail para mostrar los análisis cargados

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts` (`ngOnInit`, línea 190)

**Root cause:** el resumen lee `atencion().analysisAuthorizations` del detail, que puede estar viejo cuando se llegó a "confirmar" por override → muestra "(0)".

- [ ] **Step 1: Determinar la fuente real de los análisis**

Verificación con app local: avanzar al resumen y observar `Análisis solicitados (N)`. Inspeccionar la respuesta de `GET /attentions/{id}` (detail) en la pestaña Network: ¿trae `analysisAuthorizations` poblado?
- **Si SÍ lo trae** → basta re-despachar `loadAtencion` al entrar al resumen (Step 2a).
- **Si NO lo trae** (o llega vacío) → listar desde `selectSummaryAnalyses` (`loadAttentionAnalyses` ya se dispara en `ngOnInit`) en vez de `analysisAuthorizations` (Step 2b).

- [ ] **Step 2a: Refrescar el detail al entrar al resumen**

En `ngOnInit` de `resumen-step`, agregar al inicio:
```typescript
// Refrescar el detail para que analysisAuthorizations refleje lo cargado en el paso 2.
this.store.dispatch(loadAtencion({ id: this.atencion().id }));
```
(Importar `loadAtencion` de `../../../../../store/atencion/atencion.actions`.)

- [ ] **Step 2b (alternativa, sólo si el detail no trae los análisis): listar desde summaryAnalyses**

Cambiar el `@for` del template para iterar `analyses()` (de `selectSummaryAnalyses`) y el contador `({{ analyses().length }})` en vez de `atencion().analysisAuthorizations`. Mantener el join con `pricingById()` por `analysisId`/`id`.

- [ ] **Step 3: Verificación manual**

En el resumen, "Análisis solicitados (N)" muestra N correcto y lista los análisis con precio.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts
git commit -m "fix(wizard): resumen muestra los análisis cargados (refresca detail) (B2)"
```

### Task B3: Verificar que al volver al paso 2 los análisis persisten

> B3 comparte root cause con B1 (resuelto). Esta task es **sólo verificación** — no se toca código salvo que la verificación falle.

- [ ] **Step 1: Verificación manual**

Cargar análisis en el paso 2 → avanzar a confirmar → "← Volver fase". Esperado: el paso 2 muestra los análisis ya cargados (`AnalisisStep` los recarga vía `loadAttentionAnalyses`).

- [ ] **Step 2: Si fallara**

Usar `superpowers:systematic-debugging`: confirmar si `AnalisisStep.ngOnInit` re-dispara un clear o si `loadAttentionAnalyses` no se invoca al re-montar. Documentar y arreglar puntualmente. Si pasa, marcar B3 como cubierto por B1 y seguir.

### Task B4: Logout intermitente al cancelar — investigación + navegación post-cancel

**Files (investigación):** `src/app/core/interceptors/auth-token.interceptor.ts`, `src/app/features/analitica/store/atencion/atencion.effects.ts` (`cancel$`)
**Files (fix navegación):** `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`

- [ ] **Step 1: Investigar el root cause con `superpowers:systematic-debugging`**

Hipótesis de partida (documentada en el spec): `authTokenInterceptor` desloguea ante **401**; el interceptor corre antes del `catchError` del effect, así que un 401 en `PATCH /attentions/{id}/cancel` desloguea. Como es intermitente y el interceptor sólo actúa en 401 (no 403), el disparador probable es **token JWT vencido**.

Repro con app local: dejar la atención abierta hasta que el token venza (o forzar un token vencido), cancelar, e inspeccionar en Network el status real de la response de cancel y el `exp` del JWT.

- [ ] **Step 2: Decidir el fix según el hallazgo**

- **Token vencido (401):** el logout es comportamiento correcto del interceptor → **no se toca el interceptor**. Documentar en el commit/PR. El único cambio de este punto es la navegación (Step 3).
- **403 / race / otra causa específica de cancelar:** atacar esa causa puntual (p.ej. evitar doble dispatch de `cancelAtencion`, o status mal mapeado). Documentar.

Escribir el hallazgo en `docs/superpowers/specs/2026-06-08-ui-navegacion-layout-design.md` (sección B4) o en el cuerpo del PR.

- [ ] **Step 3: Navegación post-cancel a Recepción**

En `atencion-wizard.component.ts`, cambiar el destino tras cancelar (y tras finalizar, ver B5) de `/analitica/atencion` a `/turnos/recepcion`. En `onCancelConfirmed`, tras el éxito de la mutación:
```typescript
onCancelConfirmed(reason: string): void {
  const d = this.detail();
  if (!d) return;
  this.cancelModalOpen.set(false);
  this.store.dispatch(cancelAtencion({ id: d.id, payload: { cancellationReason: reason } }));
  this.waitForMutation((ok) => {
    if (ok) {
      clearAtencionSession();
      this.router.navigate(['/turnos/recepcion']);
    }
  });
}
```
> Mantener la pantalla de cancelación actual si el flujo la muestra antes de navegar; sólo cambia el destino final del listado.

- [ ] **Step 4: Verificación manual**

Cancelar una atención → se muestra la confirmación → vuelve a **Recepción** (no a Atenciones). Con token válido no desloguea.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts docs/superpowers/specs/2026-06-08-ui-navegacion-layout-design.md
git commit -m "fix(wizard): cancelar vuelve a Recepción + documentar root cause logout (B4)"
```

### Task B5: Finalizar/cancelar limpian el estado del wizard

**Files:**
- Modify: `src/app/features/analitica/store/atencion/atencion.actions.ts`
- Modify: `src/app/features/analitica/store/atencion/atencion.reducer.ts`
- Test: `src/app/features/analitica/store/atencion/atencion.reducer.spec.ts`
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` (`onFinished`)

**Root cause:** `datos-generales-step` lee `selectResolvedPatient` del store; tras finalizar, `resolvedPatient` queda y la "Nueva atención" lo muestra. `onFinished` no limpia ni sesión ni store.

- [ ] **Step 1: Test del reducer que falla (resetAtencionWizard limpia detail + resolvedPatient)**

En `atencion.reducer.spec.ts`:
```typescript
it('resetAtencionWizard limpia detail, resolvedPatient y patientNotFoundDni', () => {
  const populated = {
    ...initialState,
    detail: { id: 1 } as any,
    resolvedPatient: { id: 9 } as any,
    patientNotFoundDni: '123',
    summaryAnalyses: [{ id: 1 } as any],
  };
  const state = atencionReducer(populated, resetAtencionWizard());
  expect(state.detail).toBeNull();
  expect(state.resolvedPatient).toBeNull();
  expect(state.patientNotFoundDni).toBeNull();
  expect(state.summaryAnalyses).toEqual([]);
});
```
> Ajustar `initialState`/nombre del reducer (`atencionReducer`) a los reales del archivo (verificar con `grep "export const" atencion.reducer.ts`).

- [ ] **Step 2: Correr → debe fallar**

Run: `npx vitest run src/app/features/analitica/store/atencion/atencion.reducer.spec.ts`
Expected: FAIL (`resetAtencionWizard` no existe).

- [ ] **Step 3: Crear la acción**

En `atencion.actions.ts`:
```typescript
export const resetAtencionWizard = createAction('[Atencion Wizard] Reset Wizard State');
```

- [ ] **Step 4: Manejar la acción en el reducer**

En `atencion.reducer.ts`, agregar el `on`:
```typescript
on(resetAtencionWizard, (s): AtencionFeatureState => ({
  ...s,
  detail: null,
  detailError: null,
  resolvedPatient: null,
  patientNotFoundDni: null,
  summaryAnalyses: [],
  pricing: null,
})),
```
(Importar `resetAtencionWizard`. Ajustar nombres de campos a los reales del state.)

- [ ] **Step 5: Correr → debe pasar**

Run: `npx vitest run src/app/features/analitica/store/atencion/atencion.reducer.spec.ts`
Expected: PASS.

- [ ] **Step 6: Limpiar en `onFinished` (y verificar `onCancelConfirmed`)**

En `atencion-wizard.component.ts`:
```typescript
onFinished(): void {
  clearAtencionSession();
  this.store.dispatch(resetAtencionWizard());
  this.router.navigate(['/turnos/recepcion']);
}
```
(Importar `resetAtencionWizard`.) En `onCancelConfirmed` (B4 Step 3), agregar también `this.store.dispatch(resetAtencionWizard());` junto a `clearAtencionSession()`.

- [ ] **Step 7: Verificación manual**

Finalizar una atención → ir a "Nueva atención" (desde la tab Atenciones / flujo de recepción): el paso 1 arranca **en blanco**, sin el paciente anterior. Ídem tras cancelar.

- [ ] **Step 8: Commit**

```bash
git add src/app/features/analitica/store/atencion/atencion.actions.ts src/app/features/analitica/store/atencion/atencion.reducer.ts src/app/features/analitica/store/atencion/atencion.reducer.spec.ts src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "fix(wizard): finalizar/cancelar resetean estado, Nueva atención arranca en blanco (B5)"
```

---

## Grupo A — Wizard: layout y fixes visuales

### Task A1+A2: Sacar "Volver al listado" y agregar flecha a "Volver fase"

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts` (template)

- [ ] **Step 1: Eliminar ambos "Volver al listado"**

Borrar el botón en modo *creating* (línea 72):
```html
<p-button label="Volver al listado" severity="secondary" [text]="true" (onClick)="back()" />
```
y en modo *detail* (línea 95) el mismo botón dentro del `<div class="flex items-center gap-2">`. Si tras quitarlo el `<div>` de acciones queda sólo con "Cancelar atención", dejarlo; si queda vacío en modo creating, quitar el `<div>` contenedor.

- [ ] **Step 2: Agregar icono de flecha a "Volver fase"**

En el footer (línea 139):
```html
<p-button label="Volver fase" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
          [disabled]="mutating() || !canReturn()" (onClick)="onReturnPhase()" />
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores. Si `back()` queda sin uso, dejarlo (lo usa onFinished/otros) o quitarlo si el linter se queja.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "feat(wizard): sacar Volver al listado, flecha en Volver fase (A1/A2)"
```

### Task A3: Footer unificado — botón de acción del step en la misma fila que "Volver fase"

**Files:**
- Modify: `steps/resumen-step/resumen-step.component.ts`
- Modify: `steps/analisis-step/analisis-step.component.ts`
- Modify: `atencion-wizard.component.ts`

**Diseño:** cada step deja de renderizar su botón de avance y emite el estado + un output que el wizard dispara desde un footer único `flex justify-between`.

- [ ] **Step 1: Resumen — exponer label/estado y output, quitar el botón interno**

En `resumen-step.component.ts`:
- Quitar del template el bloque `<div class="flex justify-end"><p-button label="Finalizar atención" .../></div>` (líneas 145-151).
- Mantener el método `openFinalize()` y el modal de ticket.
- Agregar outputs/estado que el wizard consume:
```typescript
readonly primaryDisabled = this.mutating;          // signal ya existente
readonly primaryLoading  = this.mutating;
// el wizard llama a este método al click del footer:
triggerPrimary(): void { this.openFinalize(); }
```
> Como el wizard necesita invocar `triggerPrimary()` del step, se obtiene la instancia con `@ViewChild(ResumenStepComponent)`. Alternativa más simple si `@ViewChild` complica el OnPush: dejar que el step emita su botón pero el **wizard** lo posicione — ver Step 4.

- [ ] **Step 2: Análisis — mismo patrón**

En `analisis-step.component.ts`, el botón "Continuar →" (líneas 46-47) hoy llama a su lógica y emite `stepAdvanced`. Exponer un `triggerPrimary()` que ejecute esa misma lógica de continuar, y `continueLabel()` ya existe para el label.

- [ ] **Step 3: Datos generales — mismo patrón**

`datos-generales-step` tiene su propio botón "Guardar/Continuar". Exponer `triggerPrimary()` con la lógica de guardar+avanzar y un label.

- [ ] **Step 4: Wizard — footer único con el botón primario según el step**

En `atencion-wizard.component.ts`, reemplazar el footer (líneas 138-141) por una fila con ambos botones. Usar `@ViewChild` por cada step activo o, más simple, un método del wizard que delega al step activo vía template reference variables:
```html
<div class="flex justify-between items-center mt-4">
  <p-button label="Volver fase" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
            [disabled]="mutating() || !canReturn()" (onClick)="onReturnPhase()" />
  @switch (uiStep()?.key) {
    @case ('datos')     { <lab-datos-generales-step #datosRef [atencionId]="detail()!.id" [initialDni]="dni() ?? null" /> }
    @case ('analisis')  { <!-- botón primario del step --> }
    @case ('confirmar') { <!-- botón primario del step --> }
  }
</div>
```
> **Decisión de implementación (elige la más limpia al ver el código):**
> **(a)** Mover los step components al footer no es viable (renderizan su contenido completo). En su lugar, dejar el contenido del step donde está (líneas 126-136) y agregar en el footer un único `<p-button>` cuyo `label`/`(onClick)` provienen de un `@ViewChild` del step activo: el wizard expone `activeStepPrimaryLabel()` y `onPrimary()` que delegan al `@ViewChild` correspondiente.
> **(b)** Si `@ViewChild` con `@switch` resulta frágil, mantener cada botón dentro de su step pero **mover el "Volver fase" dentro de cada step** para que ambos vivan en el mismo `flex justify-between` del step. Esto logra la alineación pedida con menos acoplamiento.
>
> **Recomendación:** opción (b) — menos acoplamiento, alineación garantizada (ambos botones en el mismo contenedor del step), y el wizard pasa `canReturn()`/`onReturnPhase` como input/output al step. Documentar la elección en el commit.

- [ ] **Step 5: Verificación manual**

En cada paso, "← Volver fase" (izquierda) y el botón de acción (Continuar/Finalizar, derecha) están en la **misma fila**, alineados.

- [ ] **Step 6: Correr specs de los steps**

Run: `ng test --include='**/steps/**/*.spec.ts' --watch=false`
Expected: PASS (ajustar specs que esperaban el botón en su ubicación previa).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/
git commit -m "feat(wizard): footer único, acción del step alineada con Volver fase (A3)"
```

### Task A4: Ancho del input Copago

**Files:**
- Modify: `steps/resumen-step/resumen-step.component.ts` (líneas 117-133)

- [ ] **Step 1: Fijar el ancho del input al de la columna de valores**

El `styleClass="w-36"` no llega al `<input>` interno. Usar `inputStyleClass` y/o envolver:
```html
<p-inputNumber
  inputId="copago-input"
  [ngModel]="copaymentValue()"
  (ngModelChange)="copaymentValue.set($event)"
  (onBlur)="onCopaymentBlur()"
  mode="decimal" [minFractionDigits]="2" [maxFractionDigits]="2" [min]="0"
  [disabled]="copaymentMutating()"
  styleClass="w-40"
  inputStyleClass="w-40 text-right"
  placeholder="0,00" />
```
> Ajustar `w-40` para que coincida con el ancho visual de Subtotal/Total (la columna derecha del resumen). Verificar en pantalla que el input no ocupe todo el ancho.

- [ ] **Step 2: Verificación manual**

El input de Copago queda alineado/del mismo ancho que los valores de Subtotal y Total, no a ancho completo.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts
git commit -m "fix(wizard): input Copago al ancho de la grilla del resumen (A4)"
```

---

## Grupo E — Chrome / layout

### Task E1: Breadcrumb component

**Files:**
- Create: `src/app/shared/ui/components/breadcrumb/breadcrumb.component.ts`
- Test: `src/app/shared/ui/components/breadcrumb/breadcrumb.component.spec.ts`
- Modify: rutas relevantes para agregar `data.breadcrumb` (`analitica.routes.ts`, rutas de turnos)
- Modify: `src/app/layout/admin-shell/admin-shell.component.ts` (montar el breadcrumb)

- [ ] **Step 1: Test que falla — deriva migas de las rutas activas**

```typescript
it('arma las migas desde data.breadcrumb de las rutas activas', () => {
  // Configurar RouterTestingModule con rutas que tengan data.breadcrumb,
  // navegar a una ruta hija y verificar que el componente renderiza
  // "Recepción" > "Atención".
  // (usar Router + ActivatedRoute reales del testing module)
});
```
> Modelar el test sobre el patrón de testing de routing que ya use el repo (buscar un spec que use `RouterTestingModule`/`provideRouter`).

- [ ] **Step 2: Correr → debe fallar**

Run: `ng test --include='**/breadcrumb.component.spec.ts' --watch=false`
Expected: FAIL (no existe el componente).

- [ ] **Step 3: Crear el BreadcrumbComponent**

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface Crumb { label: string; url: string; }

@Component({
  selector: 'ui-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="ui-breadcrumb" aria-label="Migas de navegación">
      @for (c of crumbs(); track c.url; let last = $last) {
        <span class="ui-breadcrumb__item" [class.ui-breadcrumb__item--current]="last">{{ c.label }}</span>
        @if (!last) { <i class="pi pi-angle-right ui-breadcrumb__sep"></i> }
      }
    </nav>
  `,
  styles: [`
    .ui-breadcrumb { display:flex; align-items:center; gap:.4rem; font-size:.85rem; color: var(--ds-text-muted); }
    .ui-breadcrumb__item--current { color: var(--ds-text); font-weight:600; }
    .ui-breadcrumb__sep { font-size:.7rem; opacity:.6; }
  `],
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  readonly crumbs = signal<Crumb[]>([]);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.crumbs.set(this.build()));
    this.crumbs.set(this.build());
  }

  private build(): Crumb[] {
    const out: Crumb[] = [];
    let r: ActivatedRoute | null = this.route.root;
    let url = '';
    while (r) {
      const seg = r.snapshot.url.map(s => s.path).join('/');
      if (seg) url += `/${seg}`;
      const label = r.snapshot.data?.['breadcrumb'];
      if (label) out.push({ label, url });
      r = r.firstChild;
    }
    return out;
  }
}
```

- [ ] **Step 4: Agregar `data.breadcrumb` a las rutas tocadas**

En `analitica.routes.ts` (atención) y las rutas de turnos (recepción), agregar `data: { breadcrumb: 'Atención' }` / `data: { breadcrumb: 'Recepción' }` etc. Para extracción: `data: { breadcrumb: 'Extracción' }`.

- [ ] **Step 5: Montar el breadcrumb en el shell**

En `admin-shell.component.ts`, importar `BreadcrumbComponent`, agregarlo a `imports`, y renderizarlo arriba-izquierda del área de contenido (encima del `<router-outlet>` o en la franja izquierda del topbar):
```html
<main class="ui-admin-shell__content">
  <ui-breadcrumb />
  <router-outlet />
</main>
```

- [ ] **Step 6: Correr → debe pasar**

Run: `ng test --include='**/breadcrumb.component.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/ui/components/breadcrumb/ src/app/layout/admin-shell/admin-shell.component.ts src/app/features/analitica/analitica.routes.ts
git commit -m "feat(layout): breadcrumb arriba-izquierda derivado de las rutas (E1)"
```

### Task E2: Logo + nombre del tenant al sidebar

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.component.ts`

- [ ] **Step 1: Agregar el branding al tope del sidebar**

En `sidebar.component.ts`, inyectar el tenant config (reusar `selectTenantConfig`, el mismo que el topbar) y agregar al inicio del `<nav>` un header de marca:
```typescript
import { selectTenantConfig } from '...'; // mismo selector que usa topbar
// en la clase:
private readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);
protected readonly tenantName = computed(() => this.tenantConfig()?.name ?? 'LabCore');
protected readonly logoSrc = computed(() => this.tenantConfig()?.logoUrl || 'logo.svg');
```
Template, antes del primer `@for (section ...)`:
```html
<div class="ui-sidebar__brand">
  <img class="ui-sidebar__logo" [src]="logoSrc()" [alt]="tenantName()" />
  <span class="ui-sidebar__brand-name">{{ tenantName() }}</span>
</div>
```
Agregar estilos coherentes con el design system (`var(--brand-shell-bg)`, etc.). El branding queda **encima** de la sección "PRINCIPAL".

- [ ] **Step 2: Verificación manual + typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores. En pantalla: logo + nombre arriba del sidebar, "PRINCIPAL" debajo.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout/sidebar/sidebar.component.ts
git commit -m "feat(layout): logo + nombre del lab en el sidebar (E2)"
```

### Task E3: Topbar sin branding (blanco)

**Files:**
- Modify: `src/app/layout/topbar/topbar.component.ts`

- [ ] **Step 1: Quitar el bloque de marca del topbar**

Eliminar `.ui-topbar__brand` (logo + nombre + badge "Admin", líneas ~23-31) del template. Limpiar el CSS/estado asociado que quede sin uso (`logoSrc`/`tenantName`/`onLogoError` si ya no se usan en el topbar — ojo: el sidebar ahora los usa, pero son del sidebar; en el topbar quitarlos si quedan huérfanos).

- [ ] **Step 2: Ajustar el fondo del topbar a blanco/limpio**

En los estilos del topbar, asegurar fondo blanco (`background: var(--ds-surface, #fff)`) y sin el branding ocupando espacio. La hamburguesa, buscador y acciones (branch badge, notif, ayuda, avatar) se mantienen.

- [ ] **Step 3: Verificación manual + typecheck**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores. Topbar limpio, sin logo/nombre, fondo blanco; `ui-branch-badge` sigue presente.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/topbar/topbar.component.ts
git commit -m "feat(layout): topbar sin branding, fondo blanco (E3)"
```

### Task E4: Sidebar colapsable con hamburguesa (desktop)

**Files:**
- Modify: `src/app/layout/admin-shell/admin-shell.component.ts`
- Modify: `src/app/layout/sidebar/sidebar.component.ts` (estado colapsado)

- [ ] **Step 1: Estado `collapsed` en el shell + comportamiento responsive de la hamburguesa**

En `admin-shell.component.ts`:
```typescript
readonly drawerOpen = signal(false);
readonly collapsed  = signal(false);

onMenuToggle(): void {
  // En desktop colapsa el sidebar; en mobile abre el drawer.
  if (window.matchMedia('(max-width: 767px)').matches) {
    this.drawerOpen.update(v => !v);
  } else {
    this.collapsed.update(v => !v);
  }
}
```
Conectar el output del topbar: `<ui-topbar (menuToggle)="onMenuToggle()" />`.

- [ ] **Step 2: Aplicar el colapso al sidebar**

Pasar `collapsed` al sidebar y/o al contenedor. Reducir el ancho vía CSS:
```html
<ui-sidebar class="ui-admin-shell__sidebar" [class.ui-admin-shell__sidebar--collapsed]="collapsed()" [collapsed]="collapsed()" />
```
```css
.ui-admin-shell__sidebar { width: var(--ds-sidebar-w); flex-shrink: 0; transition: width .2s ease; }
.ui-admin-shell__sidebar--collapsed { width: var(--ds-sidebar-w-collapsed, 64px); }
```
En `sidebar.component.ts` agregar `readonly collapsed = input<boolean>(false)` y, cuando esté colapsado, ocultar labels/brand-name y dejar sólo iconos (con `@if (!collapsed())` en los `<span>` de texto). El item activo sigue resaltado.

- [ ] **Step 3: Verificación manual**

Click en la hamburguesa (desktop): el sidebar colapsa a iconos y se expande de nuevo, con transición. En mobile la hamburguesa sigue abriendo el drawer.

- [ ] **Step 4: Typecheck + specs de layout**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.
Run: `ng test --include='**/sidebar.component.spec.ts' --watch=false` (si existe).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout/admin-shell/admin-shell.component.ts src/app/layout/sidebar/sidebar.component.ts
git commit -m "feat(layout): sidebar colapsable con hamburguesa en desktop (E4)"
```

---

## Cierre

- [ ] **Step F.1: Suite completa de tests**

Run: `ng test --watch=false`
Run: `npx vitest run`
Expected: PASS ambas.

- [ ] **Step F.2: Build de producción**

Run: `npm run build`
Expected: build sin errores.

- [ ] **Step F.3: Verificación final (superpowers:verification-before-completion)**

Recorrer el "Done =" del spec punto por punto con la app corriendo. Confirmar cada ítem con evidencia.

- [ ] **Step F.4: PR contra development**

Crear PR `feat/ui-navegacion-layout` → `development`. En el cuerpo: listar A–E, documentar el root cause de B4, y avisar que se tocó `extraction-queue.page` (coordinación con sub-proyecto C). **No** merge directo.

---

## Notas de cobertura (self-review)

- **A1/A2** → Task A1+A2. **A3** → Task A3. **A4** → Task A4.
- **B1** → Task B1. **B2** → Task B2. **B3** → Task B3 (verificación, cubierto por B1). **B4** → Task B4. **B5** → Task B5.
- **C1** → Task C1. **C2** → Tasks C2 + C3.
- **D1 (extracción)** → Task D2. **D2 (recepción FAB)** → Task D1.
- **E1** → Task E1. **E2** → Task E2. **E3** → Task E3. **E4** → Task E4.

> Nomenclatura: en el spec D1=extracción y D2=recepción; en el plan las tasks quedaron Task D1=recepción y Task D2=extracción por orden de riesgo. El mapeo está explícito arriba.
