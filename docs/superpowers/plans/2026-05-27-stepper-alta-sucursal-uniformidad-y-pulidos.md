# Stepper Alta Sucursal — Uniformidad y Pulidos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el polish visual del wizard de alta de sucursal en `feat/sucursales-back-office`: header uniforme con CSS Grid, fix de un placeholder buggy, remoción del campo Status del form de alta, footer simétrico, micro-mejoras en cada step y migración de una utility duplicada.

**Architecture:** Cambios contenidos al feature `sucursales/pages/configuracion/sucursal-alta-stepper`. Sin nueva lógica de negocio salvo un `@Output() cancel` en step 1 cableado al `cancel()` ya existente del page padre. Todos los cambios son CSS/template; los specs existentes del store cubren la lógica del flujo de alta.

**Tech Stack:** Angular 21 + standalone components, PrimeNG 21 (Stepper, Tooltip, Button, ToggleSwitch), SCSS con utilities globales en `src/styles/utilities.scss`, vitest para unit tests.

**Spec:** `docs/superpowers/specs/2026-05-27-stepper-alta-sucursal-uniformidad-y-pulidos-design.md`

**Branch base:** `feat/sucursales-back-office` (LAB, 27 commits ahead de origin antes de empezar este plan).

**Jira:** N/A — spike sin ticket. El user invocó la excepción explícita de la regla #1 del CLAUDE.md ("es un spike, no hace falta") al cierre del planning (2026-05-27).

---

## Convenciones del plan

**Verificación rápida durante implementación:**
- **Dev server:** correr `npm start` una vez en una terminal aparte. Hot-reload de Angular CLI confirma syntax y type errors al guardar.
- **URL del wizard:** `http://localhost:4200/sucursales/configuracion/nueva`
- **Login dev:** `admin@test.com` / `password` (tenant `lab-demo`).
- **Type check final:** `npm run build` antes del PR (no por tarea, sería lento).

**Commits:** prefijo `fix(sucursales): ...` para polish, `refactor(sucursales): ...` para la migración de `.muted`. Mensaje en castellano, sin emojis ni firmas.

**Si una verificación visual falla:** parar, diagnosticar, fixear ANTES de avanzar al siguiente task. No acumular fallos.

---

## File Structure

Todos los paths son relativos a `FRONTEND-LABORATORIO/`. La feature vive en `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/`.

| Archivo | Responsabilidad | Tasks que lo tocan |
|---|---|---|
| `sucursal-alta-stepper.page.scss` | Estilos del shell + override visual del `p-stepper` de PrimeNG | T1 |
| `sucursal-alta-stepper.page.html` | Template del shell, hosts de los 6 step components | T2, T5 |
| `sucursal-alta-stepper.page.ts` | Coordina branchId, navegación y cancel global | T2 |
| `steps/datos-step.component.html` | Form de datos básicos (paso 1) | T3, T4, T5, T11 |
| `steps/datos-step.component.ts` | FormGroup + dispatch addSucursal | T4, T5 |
| `steps/datos-step.component.scss` | Layout del form de datos | T5, T11 |
| `steps/horarios-step.component.html` | Form + tabla de horarios | T6, T11 |
| `steps/horarios-step.component.scss` | Layout horarios | T11 |
| `steps/contactos-step.component.html` | Form + tabla de contactos | T7, T11 |
| `steps/contactos-step.component.scss` | Layout contactos | T11 |
| `steps/workspaces-step.component.html` | Empty state CTA + form + tabla workspaces | T8, T11 |
| `steps/workspaces-step.component.scss` | Layout workspaces | T11 |
| `steps/totem-step.component.html` | Toggle on/off del tótem | T9, T11 |
| `steps/totem-step.component.scss` | Layout totem | T9, T11 |
| `steps/confirmar-step.component.html` | Cards de resumen + finish | T10, T11 |
| `steps/confirmar-step.component.scss` | Layout grid 2x3 de cards | T10, T11 |

---

## Task 1: Header del stepper — Grid uniformidad + ellipsis

**Goal:** Migrar el header del stepper de Flex a CSS Grid de 6 columnas iguales para garantizar uniformidad geométrica, sin importar el ancho del título.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss:68-188`

- [ ] **Step 1.1: Aplicar el cambio SCSS**

En `sucursal-alta-stepper.page.scss`, dentro del bloque `.alta-stepper ::ng-deep { ... }`:

Reemplazar la regla `.p-steplist`:

```scss
// ANTES
.p-steplist {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0.5rem 0 1rem;
  list-style: none;
  margin: 0;
  gap: 0;
}

// DESPUÉS
.p-steplist {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  padding: 0.5rem 0 1rem;
  list-style: none;
  margin: 0;
}
```

Reemplazar la regla `.p-stepitem` (la PRIMERA — hay dos definiciones, la primera de layout y la segunda solo agrega `position: relative` para el `::after`; consolidar ambas):

```scss
// ANTES (dos bloques separados)
.p-stepitem {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
}

// ... más reglas ...

.p-stepitem {
  position: relative;
}

// DESPUÉS (un solo bloque)
.p-stepitem {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  position: relative;
}
```

Reemplazar la regla `.p-step-title` para agregar ellipsis:

```scss
// ANTES
.p-step-title {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  text-align: center;
}

// DESPUÉS
.p-step-title {
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}
```

El resto del bloque (`.p-step`, `.p-step-number`, los `::after` de las líneas, `.p-stepper-separator`, `.p-step-panels`, el `@media (max-width: 540px)`) se deja exactamente como está.

- [ ] **Step 1.2: Verificar visualmente**

Con `npm start` corriendo, abrir `http://localhost:4200/sucursales/configuracion/nueva`. Verificar:
- Los 6 títulos están perfectamente equidistantes.
- Las líneas entre círculos son del mismo largo.
- "Workspaces" / "Confirmar" no empujan más ancho que "Datos" / "Tótem".
- Si el viewport es muy chico y algún título se corta, aparece "…" en vez de empujar columna.
- Activar el step 1, ver que el círculo activo se pinta (no debe romper el layout).

- [ ] **Step 1.3: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss
git commit -m "fix(sucursales): stepper header con grid 6-col para uniformidad geometrica"
```

---

## Task 2: Header — Tooltips en pasos disabled

**Goal:** Cuando `branchId() == null`, los pasos 2-6 están grisados. Agregar tooltip que explique por qué.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts:1-23` (imports)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html:14-19` (los 5 `p-step` disabled)

- [ ] **Step 2.1: Agregar TooltipModule al componente**

En `sucursal-alta-stepper.page.ts`, agregar import y registrarlo en `imports` del decorator:

```typescript
// arriba, con los otros imports de primeng
import { TooltipModule } from 'primeng/tooltip';

// en el @Component decorator, agregar TooltipModule al array imports:
imports: [StepperModule, TooltipModule, ButtonModule, ToastModule, DatosStepComponent, HorariosStepComponent, ContactosStepComponent, WorkspacesStepComponent, TotemStepComponent, ConfirmarStepComponent],
```

- [ ] **Step 2.2: Aplicar pTooltip en los 5 steps disabled**

En `sucursal-alta-stepper.page.html`, líneas 14-19 actuales:

```html
<p-step [value]="1">Datos</p-step>
<p-step [value]="2" [disabled]="branchId() == null">Horarios</p-step>
<p-step [value]="3" [disabled]="branchId() == null">Contactos</p-step>
<p-step [value]="4" [disabled]="branchId() == null">Workspaces</p-step>
<p-step [value]="5" [disabled]="branchId() == null">Tótem</p-step>
<p-step [value]="6" [disabled]="branchId() == null">Confirmar</p-step>
```

Reemplazar por:

```html
<p-step [value]="1">Datos</p-step>
<p-step [value]="2" [disabled]="branchId() == null"
        [pTooltip]="branchId() == null ? 'Guardá los datos básicos primero' : ''"
        tooltipPosition="bottom">Horarios</p-step>
<p-step [value]="3" [disabled]="branchId() == null"
        [pTooltip]="branchId() == null ? 'Guardá los datos básicos primero' : ''"
        tooltipPosition="bottom">Contactos</p-step>
<p-step [value]="4" [disabled]="branchId() == null"
        [pTooltip]="branchId() == null ? 'Guardá los datos básicos primero' : ''"
        tooltipPosition="bottom">Workspaces</p-step>
<p-step [value]="5" [disabled]="branchId() == null"
        [pTooltip]="branchId() == null ? 'Guardá los datos básicos primero' : ''"
        tooltipPosition="bottom">Tótem</p-step>
<p-step [value]="6" [disabled]="branchId() == null"
        [pTooltip]="branchId() == null ? 'Guardá los datos básicos primero' : ''"
        tooltipPosition="bottom">Confirmar</p-step>
```

Uso `[pTooltip]` con expresión condicional (vacío cuando ya hay branchId) para que no muestre tooltip una vez creada la sucursal.

- [ ] **Step 2.3: Verificar visualmente**

Refrescar `/sucursales/configuracion/nueva` (con sucursal sin crear todavía):
- Hover sobre el círculo "2 Horarios" → aparece tooltip "Guardá los datos básicos primero".
- Idem para 3, 4, 5, 6.
- Llenar y guardar Datos → los pasos se habilitan → ya no aparece tooltip al hover.

**Riesgo conocido:** si PrimeNG no propaga el tooltip al elemento disabled, considerar wrap del contenido del step en un `<span>` que reciba el tooltip. Confirmar empíricamente; si falla, ajustar en este mismo task antes de commitear.

- [ ] **Step 2.4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts
git commit -m "fix(sucursales): stepper - tooltip en pasos disabled explica el bloqueo"
```

---

## Task 3: Step 1 (Datos) — Fix placeholder buggy

**Goal:** El input `description` tiene placeholder "Nombre de la sucursal" — confuso porque ya hay un campo "Nombre" arriba. Cambiar a un ejemplo descriptivo.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html:23`

- [ ] **Step 3.1: Cambiar el placeholder**

En `datos-step.component.html`, línea 23 actual:

```html
<input id="description" pInputText formControlName="description" placeholder="Nombre de la sucursal" />
```

Cambiar por:

```html
<input id="description" pInputText formControlName="description" placeholder="Ej: Sucursal central de zona norte" />
```

- [ ] **Step 3.2: Verificar visualmente**

En step 1 del wizard, ver que el input "Descripción" muestra el nuevo placeholder cuando está vacío.

- [ ] **Step 3.3: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html
git commit -m "fix(sucursales): step datos - placeholder description correcto (era 'Nombre de la sucursal')"
```

---

## Task 4: Step 1 (Datos) — Quitar select Status del form

**Goal:** Crear una sucursal y poder marcarla inactiva en el mismo formulario es contradictorio. Default a ACTIVE; el toggle de estado vive en el detalle.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html:14-18` (el campo status)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html:6-19` (el form-row queda con un solo campo, ajustar grid)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts:12,17-21,27,40,46` (imports + STATUS_OPTIONS + form group + statusOptions)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.scss:19-23` (form-row grid 2fr/1fr → 1fr)

- [ ] **Step 4.1: Sacar el `<div class="form-field">` del status en el HTML**

En `datos-step.component.html`, el bloque actual de las líneas 6-19:

```html
<div class="form-row">
  <div class="form-field">
    <label for="code">Nombre *</label>
    <input id="code" pInputText formControlName="code" placeholder="Ej: Sucursal Centro" />
    @if (form.controls.code.invalid && form.controls.code.touched) {
      <small class="form-error">El nombre es requerido (máx 30 caracteres).</small>
    }
  </div>
  <div class="form-field">
    <label for="status">Estado *</label>
    <p-select id="status" formControlName="status" [options]="statusOptions"
              optionLabel="label" optionValue="value" appendTo="body" />
  </div>
</div>
```

Reemplazar por (quitando el form-row wrapper porque queda un solo campo):

```html
<div class="form-field">
  <label for="code">Nombre *</label>
  <input id="code" pInputText formControlName="code" placeholder="Ej: Sucursal Centro" />
  @if (form.controls.code.invalid && form.controls.code.touched) {
    <small class="form-error">El nombre es requerido (máx 30 caracteres).</small>
  }
</div>
```

- [ ] **Step 4.2: Quitar el control `status` del FormGroup, dejar dispatch con default**

En `datos-step.component.ts`:

1. Eliminar la constante `STATUS_OPTIONS` (líneas 18-21) y el import si queda huérfano. **Mantener** el import de `SucursalStatus` (lo usamos en el cast del default).
2. Eliminar el campo `protected readonly statusOptions = STATUS_OPTIONS;` (línea 40).
3. Eliminar `SelectModule` del array `imports` del decorator (línea 27) y de los imports del top del archivo (línea 12) — el `p-select` ya no se usa en este componente.
4. Sacar el control `status` del FormGroup. El form queda:

```typescript
protected readonly form = this.fb.nonNullable.group({
  code: ['', [Validators.required, Validators.maxLength(30)]],
  description: ['', [Validators.required, Validators.maxLength(120)]],
  address: this.fb.group({
    street: [''],
    streetNumber: [''],
  }),
});
```

5. En `submit()`, reemplazar el armado del input para hardcodear el status. Línea actual:

```typescript
const input: SucursalCreateInput = {
  code: raw.code.trim(),
  description: raw.description.trim(),
  status: raw.status,
  ...(hasAddress ? { address: { street, streetNumber } } : {}),
};
```

Por:

```typescript
const input: SucursalCreateInput = {
  code: raw.code.trim(),
  description: raw.description.trim(),
  status: 'ACTIVE' as SucursalStatus,
  ...(hasAddress ? { address: { street, streetNumber } } : {}),
};
```

- [ ] **Step 4.3: Verificar tipos**

```bash
npx tsc --noEmit -p tsconfig.app.json
```

Expected: sin errores. Si aparece "STATUS_OPTIONS unused" u otros warnings de imports huérfanos, limpiarlos hasta dejar el archivo sin errores ni warnings de TS.

- [ ] **Step 4.4: Verificar visualmente**

Refrescar el wizard. En step 1:
- Sólo se ve "Nombre *" arriba (sin Estado al lado).
- Descripción debajo, dirección abajo. Layout sin huecos raros.
- Llenar Nombre + Descripción, click Siguiente → la sucursal se crea como ACTIVE (verificable en el detalle o en la tabla `/sucursales/configuracion`).

- [ ] **Step 4.5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts
git commit -m "fix(sucursales): step datos - quitar select Estado (default ACTIVE, toggleo en detalle)"
```

---

## Task 5: Step 1 (Datos) — Footer simétrico con botón Cancelar

**Goal:** Hoy el footer del step 1 muestra sólo "Siguiente" alineado a la derecha. Los pasos 2-5 muestran "Volver" izquierda + "Siguiente" derecha. Esta asimetría hace que el footer "salte" visualmente al avanzar. Agregar "Cancelar" en step 1 cableado al método `cancel()` que ya existe en el page padre.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.ts:31-32` (agregar Output)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html:43-45` (footer con 2 botones)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.scss:67-71` (justify-content space-between)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html:26` (wire output)

- [ ] **Step 5.1: Agregar `@Output() cancel` en datos-step.ts**

En `datos-step.component.ts`, en la clase `DatosStepComponent`, debajo del Output `completed`:

```typescript
@Output() completed = new EventEmitter<number>();
@Output() cancel = new EventEmitter<void>();
```

- [ ] **Step 5.2: Agregar botón Cancelar al footer del template**

En `datos-step.component.html`, líneas 43-45 actuales:

```html
<footer class="step-footer">
  <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" type="submit" [disabled]="form.invalid || saving()" [loading]="saving()" />
</footer>
```

Reemplazar por:

```html
<footer class="step-footer">
  <p-button label="Cancelar" severity="secondary" type="button" (click)="cancel.emit()" />
  <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" type="submit" [disabled]="form.invalid || saving()" [loading]="saving()" />
</footer>
```

`type="button"` en Cancelar evita que el browser lo trate como submit del form.

- [ ] **Step 5.3: Cambiar el SCSS del .step-footer a space-between**

En `datos-step.component.scss`, líneas 67-71:

```scss
// ANTES
.step-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

// DESPUÉS
.step-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}
```

- [ ] **Step 5.4: Conectar el output en el page padre**

En `sucursal-alta-stepper.page.html`, línea 26 actual:

```html
<app-datos-step (completed)="onDatosCompleted($event)" />
```

Reemplazar por:

```html
<app-datos-step (completed)="onDatosCompleted($event)" (cancel)="cancel()" />
```

(El método `cancel()` ya existe en el page, líneas 72-74 de `sucursal-alta-stepper.page.ts`, navega a `/sucursales/configuracion`.)

- [ ] **Step 5.5: Verificar visualmente**

En step 1 del wizard:
- El footer ahora tiene "Cancelar" a la izquierda y "Siguiente" a la derecha.
- Click "Cancelar" → navega a la lista `/sucursales/configuracion` sin guardar.
- Avanzar al step 2 → el footer mantiene la simetría (Volver izquierda, Siguiente derecha), no hay salto visual.

- [ ] **Step 5.6: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.{html,ts,scss} src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html
git commit -m "fix(sucursales): step datos - footer simetrico con boton Cancelar"
```

---

## Task 6: Step 2 (Horarios) — Quitar scroll interno + tooltip en Tipo

**Goal:** La `p-table` tiene `scrollHeight="16rem"` fijo que duplica scroll en pantallas chicas. El scroll natural del `.step-content` (que ya tiene `overflow-y: auto`) lo maneja mejor. Adicionalmente, agregar tooltip al select Tipo con explicación de cada valor.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.html:37,47` (select + p-table)
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.ts` (import TooltipModule)

- [ ] **Step 6.1: Agregar TooltipModule al componente**

Leer primero la lista actual de imports del decorator de `horarios-step.component.ts`. Agregar `TooltipModule` desde `primeng/tooltip` tanto en el import statement como en el array `imports` del `@Component`.

- [ ] **Step 6.2: Quitar `[scrollable]` y `scrollHeight` de la p-table**

En `horarios-step.component.html`, línea 47:

```html
<!-- ANTES -->
<p-table [value]="schedules()" dataKey="id" [scrollable]="true" scrollHeight="16rem" class="schedules-table">

<!-- DESPUÉS -->
<p-table [value]="schedules()" dataKey="id" class="schedules-table">
```

- [ ] **Step 6.3: Agregar tooltip al select Tipo**

En `horarios-step.component.html`, línea 37 actual:

```html
<p-select formControlName="scheduleType" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body" />
```

Reemplazar por:

```html
<p-select formControlName="scheduleType" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body"
          pTooltip="Jornada completa, solo mañana, solo tarde o turno noche" tooltipPosition="top" />
```

- [ ] **Step 6.4: Verificar visualmente**

En step 2 del wizard (con la sucursal ya creada):
- Cargar 1-2 horarios. La tabla crece naturalmente sin scroll interno.
- Cargar 15+ horarios → el contenedor del step scrollea, no la tabla.
- Hover sobre el select Tipo → tooltip aparece.

- [ ] **Step 6.5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.{html,ts}
git commit -m "fix(sucursales): step horarios - quitar scroll interno tabla + tooltip en Tipo"
```

---

## Task 7: Step 3 (Contactos) — Quitar scroll interno + label Agregar

**Goal:** Mismo fix de scroll interno que Horarios, más label "Agregar" al botón "+" para consistencia.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html:17-19,24` (botón + tabla)

- [ ] **Step 7.1: Quitar `[scrollable]` y `scrollHeight` de la p-table**

En `contactos-step.component.html`, línea 24:

```html
<!-- ANTES -->
<p-table [value]="contacts()" dataKey="id" [scrollable]="true" scrollHeight="20rem" class="contacts-table">

<!-- DESPUÉS -->
<p-table [value]="contacts()" dataKey="id" class="contacts-table">
```

- [ ] **Step 7.2: Agregar label "Agregar" al botón**

En `contactos-step.component.html`, líneas 17-19 actuales:

```html
<div class="form-action">
  <p-button icon="pi pi-plus" type="submit" [disabled]="form.invalid" />
</div>
```

Reemplazar por:

```html
<div class="form-action">
  <p-button icon="pi pi-plus" label="Agregar" type="submit" [disabled]="form.invalid" />
</div>
```

- [ ] **Step 7.3: Verificar visualmente**

En step 3 del wizard:
- El botón al lado del campo Valor dice "+ Agregar" (no solo ícono).
- Cargar varios contactos, verificar que no hay doble scroll en la tabla.

- [ ] **Step 7.4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html
git commit -m "fix(sucursales): step contactos - quitar scroll interno + label Agregar en boton"
```

---

## Task 8: Step 4 (Workspaces) — Saltar como text + label Agregar

**Goal:** En el empty state CTA, "Saltar este paso" tiene el mismo peso visual que "Ir al catálogo". Bajarle jerarquía a text-button. Adicionalmente, label "Agregar" en el "+".

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.html:11-13,26-27` (CTA + botón)

- [ ] **Step 8.1: Cambiar "Saltar este paso" a text-button**

En `workspaces-step.component.html`, líneas 11-13:

```html
<!-- ANTES -->
<p-button label="Ir al catálogo" icon="pi pi-external-link" routerLink="/sucursales/catalogo" />
<p-button label="Saltar este paso" severity="secondary" (click)="next.emit()" />

<!-- DESPUÉS -->
<p-button label="Ir al catálogo" icon="pi pi-external-link" routerLink="/sucursales/catalogo" />
<p-button label="Saltar este paso" severity="secondary" [text]="true" (click)="next.emit()" />
```

- [ ] **Step 8.2: Agregar label "Agregar" al botón**

En `workspaces-step.component.html`, líneas 26-27:

```html
<!-- ANTES -->
<div class="form-action">
  <p-button icon="pi pi-plus" type="submit" [disabled]="form.invalid" />
</div>

<!-- DESPUÉS -->
<div class="form-action">
  <p-button icon="pi pi-plus" label="Agregar" type="submit" [disabled]="form.invalid" />
</div>
```

- [ ] **Step 8.3: Verificar visualmente**

En step 4 del wizard:
- **Con áreas vacías** (forzable borrando todas las áreas del catálogo, o probando en tenant sin catálogo): empty state CTA muestra "Ir al catálogo" como botón sólido y "Saltar este paso" como link plano subordinado.
- **Con áreas pobladas**: el botón de agregar workspace dice "+ Agregar".

- [ ] **Step 8.4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.html
git commit -m "fix(sucursales): step workspaces - 'Saltar este paso' como text + label en boton Agregar"
```

---

## Task 9: Step 5 (Tótem) — Centrado vertical + copy + helper text

**Goal:** El step Tótem hoy queda raro: copy largo arriba, switch flotando, mucho espacio vacío abajo. Centrar el switch verticalmente, recortar el copy y agregar un helper text cuando el tótem está deshabilitado.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.html:1-17`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.scss:1-30`

- [ ] **Step 9.1: Actualizar template con wrapper centrador + copy + helper text**

Reemplazar el contenido completo de `totem-step.component.html` por:

```html
<div class="totem-step">
  <h2>Tótem</h2>
  <p class="muted">
    Habilitá el tótem para aceptar walk-ins (pacientes sin turno previo).
    Sin él, recepción muestra solo turnos agendados.
  </p>

  <div class="totem-content-center">
    <div class="big-switch">
      <p-toggleswitch [ngModel]="enabled()" (ngModelChange)="onToggle($event)" />
      <span class="switch-label">{{ enabled() ? 'Tótem habilitado' : 'Tótem deshabilitado' }}</span>
    </div>
    @if (!enabled()) {
      <p class="helper-text">Podés activarlo más tarde desde la configuración de la sucursal.</p>
    }
  </div>

  <footer class="step-footer">
    <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (click)="back.emit()" />
    <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" (click)="next.emit()" />
  </footer>
</div>
```

- [ ] **Step 9.2: Actualizar SCSS con wrapper centrador + helper text**

Reemplazar el contenido completo de `totem-step.component.scss` por:

```scss
.totem-step {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.totem-step h2 {
  margin: 0 0 0.5rem;
}

.muted {
  color: var(--text-color-secondary);
  margin-bottom: 1.5rem;
  max-width: 40rem;
}

.totem-content-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 12rem;
}

.big-switch {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
}

.switch-label {
  font-size: 1.125rem;
  font-weight: 500;
}

.helper-text {
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
  margin: 0;
}

.step-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
```

Nota: el `.totem-step` ahora usa `display: flex; flex-direction: column; height: 100%` para que el `flex: 1` del wrapper funcione y empuje el footer al fondo.

- [ ] **Step 9.3: Verificar visualmente**

En step 5 del wizard:
- Copy arriba en 2 líneas (más corto que antes).
- Switch centrado vertical y horizontalmente en el espacio del medio.
- Con tótem deshabilitado: helper text "Podés activarlo más tarde desde la configuración de la sucursal." aparece debajo del switch.
- Toggle ON → helper text desaparece, switch label cambia a "Tótem habilitado".
- Footer pegado al borde inferior del contenido del step.

- [ ] **Step 9.4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.{html,scss}
git commit -m "fix(sucursales): step totem - centrado vertical + copy conciso + helper text en disabled"
```

---

## Task 10: Step 6 (Confirmar) — Card Tótem inline + gap empty + Nombre

**Goal:** Tres pulidos al confirmar: card Tótem en una línea (no stacked), empty states con más aire, y label "Código" → "Nombre" en datos básicos.

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.html:9,69-75`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.scss:41-45`

- [ ] **Step 10.1: Cambiar label "Código" → "Nombre" en data-list**

En `confirmar-step.component.html`, línea 9:

```html
<!-- ANTES -->
<dt>Código</dt><dd>{{ branch.code }}</dd>

<!-- DESPUÉS -->
<dt>Nombre</dt><dd>{{ branch.code }}</dd>
```

- [ ] **Step 10.2: Reescribir el card Tótem inline**

En `confirmar-step.component.html`, líneas 69-75 actuales:

```html
<p-card header="Tótem">
  <p>
    <i [class]="(totemConfig()?.enabled) ? 'pi pi-check-circle text-green' : 'pi pi-times-circle text-muted'"></i>
    {{ (totemConfig()?.enabled) ? 'Tótem habilitado' : 'Tótem deshabilitado' }}
  </p>
  <p-button label="Ir a Tótem" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(5)" />
</p-card>
```

Reemplazar por:

```html
<p-card header="Tótem">
  <div class="totem-summary">
    <span class="totem-status">
      <i [class]="(totemConfig()?.enabled) ? 'pi pi-check-circle text-green' : 'pi pi-times-circle text-muted'"></i>
      {{ (totemConfig()?.enabled) ? 'Tótem habilitado' : 'Tótem deshabilitado' }}
    </span>
    <p-button label="Ir a Tótem" icon="pi pi-arrow-left" [text]="true" severity="secondary" size="small" (click)="goToStep.emit(5)" />
  </div>
</p-card>
```

- [ ] **Step 10.3: Agregar estilos de `.totem-summary` y aumentar gap en `.empty-section`**

En `confirmar-step.component.scss`:

1. Cambiar el `gap` del `.empty-section` actual (línea 41-45):

```scss
// ANTES
.empty-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

// DESPUÉS
.empty-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
```

2. Agregar al final del archivo (después de `.text-muted`):

```scss
.totem-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.totem-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
```

- [ ] **Step 10.4: Verificar visualmente**

En step 6 del wizard:
- Card "Datos básicos" muestra "Nombre" en vez de "Código".
- Card "Tótem": estado + botón "Ir a Tótem" en una sola línea, alineados (estado izquierda, botón derecha).
- Cards Horarios/Contactos/Workspaces sin cargas: el texto "Sin X cargados" y el botón "Ir a X" tienen más aire entre sí (gap 1rem).

- [ ] **Step 10.5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.{html,scss}
git commit -m "fix(sucursales): step confirmar - card Totem inline + gap empty states + Nombre en datos"
```

---

## Task 11: Transversal — Migrar `.muted` a `.ui-text-muted`

**Goal:** La clase `.muted` está duplicada en los 6 step components. Existe `.ui-text-muted` global en `src/styles/utilities.scss`. Reemplazar el uso y limpiar las definiciones locales.

**Files (cada uno con `class="muted"` en template y `.muted { ... }` en scss):**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.html:3` + `.scss:7-11`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.html:3,45,67` + `.scss:2`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.html:3,22,36` + `.scss:2`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.html:3,30,44` + `.scss:2`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.html:3` + `.scss:7-11`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.html:3,32,78` + `.scss:2`

**Riesgo:** `.muted` local usa `var(--text-color-secondary)`, `.ui-text-muted` global usa `var(--ds-text-muted)`. Antes de borrar las locales, verificar que el tono es indistinguible. Si difiere, **ajustar el token global o el override** antes de borrar locales — no romper el contraste visual del wizard.

- [ ] **Step 11.1: Antes de migrar, comparar colores en la app**

Abrir el wizard `/sucursales/configuracion/nueva`. En el step 1, el subtítulo "Información general de la sucursal..." usa `.muted` actual. Inspeccionar en DevTools el valor computado de `color` (debería resolver a `--text-color-secondary` de PrimeNG, típicamente `#64748b` o similar).

Aplicar temporalmente `class="ui-text-muted muted"` a ese mismo `<p>` y refrescar; comparar visualmente si el color cambia. Si **no cambia** o el cambio es imperceptible, seguir con el migration. Si **cambia notoriamente**, no migrar — registrar el hallazgo como nota en el commit final y dejar `.muted` local intacto.

Quitar el cambio temporal.

- [ ] **Step 11.2: Si los colores son equivalentes, ejecutar migración global**

Reemplazar en los 6 `*.html` todos los `class="muted"` por `class="ui-text-muted"`. Cuando aparece combinada (ej. `class="counter muted"`), reemplazar por `class="counter ui-text-muted"`.

Usar grep para identificar todas las apariciones primero:

```bash
grep -n 'class=".*muted' src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/*.html
```

Hacer los reemplazos exactos archivo por archivo.

En cada `.scss`, eliminar la regla `.muted { ... }` (1-5 líneas según el caso). Mantener cualquier otra regla intacta. En `totem-step.component.scss` que ya tocamos en Task 9, el `.muted` está en líneas 7-11 — eliminarlas también.

- [ ] **Step 11.3: Verificar visualmente cada step**

Recorrer los 6 steps del wizard. Confirmar que el texto subtítulo (h2 + p) se sigue viendo con el mismo gris atenuado en cada uno.

- [ ] **Step 11.4: Verificar tipos y build**

```bash
npm run build
```

Expected: build exitoso. Si hay warning de regla SCSS huérfana, limpiarla.

- [ ] **Step 11.5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/
git commit -m "refactor(sucursales): migrar .muted local a utility global .ui-text-muted (6 steps)"
```

**Si en Step 11.1 los colores difieren** y se decide no migrar: skipear Steps 11.2-11.5 y agregar nota al commit final del PR explicando el deferral. Documentar también en el spec si aparece nuevo aprendizaje.

---

## Task 12: Smoke E2E + verificación final

**Goal:** Recorrer el wizard completo verificando cada punto del spec antes de finalizar el PR.

**Files:** ninguno (verificación pura).

- [ ] **Step 12.1: Build limpio**

```bash
npm run build
```

Expected: build exitoso sin errores ni warnings nuevos.

- [ ] **Step 12.2: Smoke desktop end-to-end**

Con `npm start` corriendo, abrir `http://localhost:4200/sucursales/configuracion/nueva` (login con `admin@test.com` / `password`, tenant `lab-demo`).

Checklist (cada uno marca un item del spec):

1. **Header (Task 1):** 6 columnas equidistantes, líneas de igual largo.
2. **Tooltips disabled (Task 2):** hover sobre steps 2-6 antes de guardar datos → "Guardá los datos básicos primero".
3. **Step 1 placeholder (Task 3):** descripción muestra "Ej: Sucursal central de zona norte".
4. **Step 1 sin Estado (Task 4):** no hay select Status, sólo Nombre arriba.
5. **Step 1 Cancelar (Task 5):** footer con Cancelar izquierda + Siguiente derecha. Click Cancelar → vuelve a la lista.
6. **Step 2 sin doble scroll (Task 6):** tabla crece sin scroll interno.
7. **Step 2 tooltip Tipo (Task 6):** hover sobre select Tipo → tooltip.
8. **Step 3 sin doble scroll + label Agregar (Task 7):** tabla natural, botón con label.
9. **Step 4 Saltar text + label Agregar (Task 8):** botón "+" con label "Agregar".
10. **Step 5 Tótem centrado (Task 9):** switch centrado, helper text en disabled, copy corto.
11. **Step 6 Confirmar (Task 10):** label "Nombre", card Tótem inline, empty states con aire.
12. **Muted migrado (Task 11):** textos atenuados siguen viéndose iguales (si se ejecutó).
13. **Crear sucursal end-to-end:** llenar todo, finalizar → toast success, navega al detalle, la sucursal aparece en la lista con estado Activa.

- [ ] **Step 12.3: Smoke mobile**

Redimensionar el browser a `<540px` (DevTools responsive, viewport ej. 375x812):
- Header: títulos desaparecen, sólo se ven los números.
- Layout de cada step se acomoda sin desbordes horizontales.

- [ ] **Step 12.4: Si todo OK, anunciar al user que la rama está lista para PR**

Reportar al user:
- Total de commits sumados al branch.
- Que `feat/sucursales-back-office` está listo para push + PR.
- **No** pushear ni abrir PR sin confirmación explícita (el user prefirió hacerlo manual la última vez, ver memoria del arco 2026-05-26).

---

## Out of Scope (deferred — no en este plan)

Documentados en el spec, no se implementan acá:
- Refactor de `.form-field`, `.form-error`, `.step-footer` a utility global (requiere diseño a nivel sistema primero).
- Specs component-level para los 6 step components (pre-existente, alcance de un PR de testing).
- Refactor del legacy `SucursalesPageComponent` (plural store).
- Reorganización de constants DAY/CONTACT/SCHEDULE labels.

---

## Resumen de commits esperados

12 commits, uno por task (excepto Task 12 que es verificación pura):

1. `fix(sucursales): stepper header con grid 6-col para uniformidad geometrica`
2. `fix(sucursales): stepper - tooltip en pasos disabled explica el bloqueo`
3. `fix(sucursales): step datos - placeholder description correcto (era 'Nombre de la sucursal')`
4. `fix(sucursales): step datos - quitar select Estado (default ACTIVE, toggleo en detalle)`
5. `fix(sucursales): step datos - footer simetrico con boton Cancelar`
6. `fix(sucursales): step horarios - quitar scroll interno tabla + tooltip en Tipo`
7. `fix(sucursales): step contactos - quitar scroll interno + label Agregar en boton`
8. `fix(sucursales): step workspaces - 'Saltar este paso' como text + label en boton Agregar`
9. `fix(sucursales): step totem - centrado vertical + copy conciso + helper text en disabled`
10. `fix(sucursales): step confirmar - card Totem inline + gap empty states + Nombre en datos`
11. `refactor(sucursales): migrar .muted local a utility global .ui-text-muted (6 steps)`

(Task 12 no genera commit nuevo — sólo verifica.)
