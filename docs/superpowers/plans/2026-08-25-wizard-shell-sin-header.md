# Sacar el header de `ui-wizard-shell` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-320](https://exequielsantoro.atlassian.net/browse/KAN-320)

**Goal:** Sacar la barra de header (título + breadcrumb + acciones) de `ui-wizard-shell`, el shell compartido de los 9 wizards full-page del portal administrativo, dejando la tira de pasos como lo primero que ve el usuario.

**Architecture:** Un solo componente compartido (`WizardShellComponent`) cambia de template + API pública (se sacan 2 inputs, se sacan 2 slots, se agregan 2 slots nuevos en el footer). Los 9 consumidores se actualizan en el mismo PR — Angular compila todos los templates del proyecto de punta a punta (AOT), así que el build queda roto hasta que el shell y los 9 consumidores estén todos migrados a la vez. Por eso la primera corrida de tests real (Task 6) es al final, no tarea por tarea.

**Tech Stack:** Angular 21 standalone components, signals, Tailwind, Vitest (`ng test`).

## Global Constraints

- Repo: `FRONTEND-LABORATORIO`. Base: `development`. Rama: `refactor/wizard-shell-sin-header` (ya creada).
- `npm test` (→ `ng test`) type-checkea el programa completo — no compila limpio en `development` por errores preexistentes y no relacionados en `financiero/metrics`, `saas-admin`, `ayuda/manual`, `muestras/cargar-resultados` (confirmado con `git stash` en la PR #178, ver `docs/superpowers/specs/2026-08-24-wizard-shell-sin-header-design.md`). Cualquier corrida de test en este plan compara contra esa lista de archivos — solo son errores nuevos si aparece un archivo que no está ahí.
- Mensajes de UI en español, sin leak de internals (CLAUDE.md regla #4) — no aplica en este plan (no se agregan mensajes de error nuevos).
- Commits convencionales (`refactor(wizard-shell): ...`).

---

### Task 1: `wizard-shell.component.ts` — sacar el header, footer de 3 zonas

**Files:**
- Modify: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts`

**Interfaces:**
- Consumes: nada de tareas anteriores (primera tarea).
- Produces: nueva API pública de `WizardShellComponent` que consumen las Tasks 2-3:
  - Se sacan los inputs `heading: string` (required) y `breadcrumb: string`.
  - Se sacan los slots proyectados `[headingBadge]` y `[headerActions]`.
  - Se agregan los slots proyectados `[wizardFooterLeft]` y `[wizardFooterCenter]`, ambos
    disponibles tanto si `[customFooter]="true"` como en el footer por defecto.
  - Se saca el `<span>` con el contador "Paso X de Y" del footer.
  - El resto de la API (`steps`, `currentIndex`, `visited`, `completed`, `clickable`,
    `maxWidth`, `bodyFill`, `customFooter`, `continueLabel/Disabled/Loading`,
    `finishLabel/Disabled/Loading`, `cancelLabel`, outputs `stepSelected/next/back/cancel/finish`)
    no cambia.

No hay test que correr al final de esta tarea — el build del proyecto completo queda roto
hasta la Task 5 (los 9 consumidores todavía pasan `heading`, que ya no existe como input).
Verificar solo que el archivo en sí no tiene errores de sintaxis con un vistazo.

- [x] **Step 1: Reemplazar el template completo**

Abrir `src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts` y reemplazar el
`template:` completo (desde el backtick de apertura hasta el de cierre, líneas ~23-118 del
archivo actual) por:

```typescript
  template: `
    <div class="flex flex-col h-full">
      <ui-form-stepper-header
        [steps]="steps()"
        [currentIndex]="currentIndex()"
        [visited]="visited()"
        [completed]="completed()"
        [clickable]="clickable()"
        (stepSelected)="stepSelected.emit($event)" />

      <!-- Banner opcional bajo el stepper (p.ej. read-only + descargar rótulos). -->
      <ng-content select="[wizardBanner]" />

      <!-- Body del paso. Por defecto scrollea el shell (comportamiento histórico, correcto
           para pasos tipo formulario que crecen en vertical). Con [bodyFill]=true el body
           NO scrollea: le da alto definido al contenido proyectado para que el paso pueda
           armar su propio scroll interno (p.ej. una ui-table con scrollHeight="flex").
           Sin el h-full de acá, el height:100% del step resuelve contra un contenedor de
           alto automático y toda la cadena flex-scroll se cae al scroll del shell. -->
      <div class="flex-1 px-8 py-6"
           [class.overflow-y-auto]="!bodyFill()"
           [class.overflow-hidden]="bodyFill()"
           [class.min-h-0]="bodyFill()">
        <div class="w-full mx-auto"
             [style.max-width]="maxWidth()"
             [class.h-full]="bodyFill()"
             [class.min-h-0]="bodyFill()">
          <ng-content />
        </div>
      </div>

      <footer class="wz-bar wz-bar--bottom flex items-center gap-3 px-8 py-4 bg-surface-0 sticky bottom-0">
        <!-- Zona izquierda: secundario/destructivo (p.ej. Volver al listado, Cancelar).
             Vacía y sin ocupar espacio visible en los wizards que no la usan. -->
        <div class="flex items-center gap-2">
          <ng-content select="[wizardFooterLeft]" />
        </div>

        <!-- Zona centro: badges (p.ej. URGENTE). flex-1 empuja la zona derecha al borde. -->
        <div class="flex-1 flex items-center justify-center gap-2">
          <ng-content select="[wizardFooterCenter]" />
        </div>

        @if (customFooter()) {
          <!--
            Footer proyectado: el wizard inyecta sus propios botones (p.ej. forms
            con <form>/submit/Ctrl+S o lógica alta-vs-edición). El shell solo
            aporta el layout; el contenido va a la derecha.
          -->
          <div class="flex items-center gap-3">
            <ng-content select="[wizardFooter]" />
          </div>
        } @else {
          <!--
            flex-row-reverse: el CTA primario queda primero en DOM order (mejor
            tab navigation desde el último campo del step), pero visualmente
            termina a la derecha: Cancelar | Atrás | Continuar/Finalizar.
          -->
          <div class="flex flex-row-reverse gap-2">
            @if (isLast()) {
              <p-button
                [label]="finishLabel()"
                type="button"
                severity="success"
                [loading]="finishLoading()"
                [disabled]="finishDisabled()"
                (onClick)="finish.emit()" />
            } @else {
              <p-button
                [label]="continueLabel()"
                type="button"
                [disabled]="continueDisabled()"
                [loading]="continueLoading()"
                (onClick)="next.emit()" />
            }
            @if (!isFirst()) {
              <p-button label="Atrás" [text]="true" type="button" (onClick)="back.emit()" />
            }
            <p-button
              [label]="cancelLabel()"
              severity="secondary"
              [outlined]="true"
              type="button"
              (onClick)="cancel.emit()" />
          </div>
        }
      </footer>
    </div>
  `,
```

- [x] **Step 2: Sacar los inputs `heading` y `breadcrumb`**

En la clase `WizardShellComponent`, borrar estas dos líneas (y su comentario):

```typescript
  /** Título de la página (h1). */
  readonly heading = input.required<string>();
  /** Migas opcionales a la derecha del header (texto plano). */
  readonly breadcrumb = input<string>('');

```

- [x] **Step 3: Actualizar el comentario de clase**

El comentario de la clase (líneas ~6-17) menciona "top bar" como parte del chrome
centralizado. Reemplazar el párrafo completo por:

```typescript
/**
 * Shell estándar de wizards full-page del portal administrativo.
 *
 * Centraliza el "chrome" que antes estaba copiado a mano en cada wizard
 * (ui-form-stepper-header + body scrollable + footer de navegación de 3 zonas).
 * Así todos los wizards comparten exactamente el mismo padding, jerarquía
 * tipográfica, estilo de botones y separadores — y nunca más se desincronizan
 * entre sí, igual que el propio `ui-form-stepper-header`.
 *
 * Sin barra de título: el título de cada wizard vive en el breadcrumb automático
 * del topbar (KAN-180), no acá — mostrarlo dos veces era redundante.
 *
 * El cuerpo de cada paso se proyecta con `<ng-content>`; la lógica de
 * navegación y validación sigue viviendo en la page (que cablea los outputs).
 */
```

- [x] **Step 4: Commit**

```bash
git add src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts
git commit -m "refactor(wizard-shell): sacar header, footer de 3 zonas

Se saca el <header> completo (titulo h1 + breadcrumb manual + acciones) de
ui-wizard-shell. La tira de pasos pasa a ser lo primero de la pantalla. El
footer pasa de un contador + un bloque a la derecha, a 3 zonas: izquierda
(wizardFooterLeft, secundario/destructivo), centro (wizardFooterCenter,
badges), derecha (igual que antes). Se saca el contador 'Paso X de Y' —
redundante con la tira de pasos.

Rompe el build hasta que los 9 consumidores se actualicen (siguientes
tareas) — el input heading era required."
```

---

### Task 2: `atencion-wizard.component.ts` — migrar el consumidor con contenido real

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`

**Interfaces:**
- Consumes: `[wizardFooterLeft]`, `[wizardFooterCenter]` de `WizardShellComponent` (Task 1).
- Produces: nada — último consumidor con lógica no trivial.

Este es el único de los 9 wizards con contenido real en `headerActions`/`headingBadge`. Hay
2 bloques `<ui-wizard-shell>` en el archivo: modo "creando" (línea ~100) y modo completo
(línea ~139).

- [x] **Step 1: Modo "creando" — sacar `heading`, mover "Volver al listado" al footer**

Reemplazar (línea ~100-120):

```typescript
      <ui-wizard-shell
        heading="Nueva atención"
        [steps]="stepperSteps()"
        [currentIndex]="0"
        [visited]="emptySet"
        [clickable]="false"
        [customFooter]="true"
        [maxWidth]="'1040px'">

        <div headerActions>
          <p-button label="Volver al listado" severity="secondary" [text]="true"
                    (onClick)="backToList()" />
        </div>

        <lab-datos-generales-step [atencionId]="null" [initialDni]="dni() ?? null" />

        <div wizardFooter>
          <p-button label="Confirmar y seguir" [disabled]="!datosCanConfirm()"
                    (onClick)="advanceCurrent()" />
        </div>
      </ui-wizard-shell>
```

por:

```typescript
      <ui-wizard-shell
        [steps]="stepperSteps()"
        [currentIndex]="0"
        [visited]="emptySet"
        [clickable]="false"
        [customFooter]="true"
        [maxWidth]="'1040px'">

        <lab-datos-generales-step [atencionId]="null" [initialDni]="dni() ?? null" />

        <div wizardFooterLeft>
          <p-button label="Volver al listado" severity="secondary" [text]="true"
                    (onClick)="backToList()" />
        </div>

        <div wizardFooter>
          <p-button label="Confirmar y seguir" [disabled]="!datosCanConfirm()"
                    (onClick)="advanceCurrent()" />
        </div>
      </ui-wizard-shell>
```

> ⚠️ **Regla de proyección de contenido (aplica a todo este plan):** `<ng-content
> select="[x]">` de Angular matchea **únicamente hijos directos** del componente. Los
> elementos marcados `wizardFooterLeft` / `wizardFooterCenter` / `wizardFooter` tienen que
> ser **hermanos entre sí**, hijos directos de `<ui-wizard-shell>`. Anidar
> `<div wizardFooterLeft>` adentro de `<div wizardFooter>` NO lo proyecta a la zona
> izquierda — queda renderizado dentro de la zona derecha, y el refactor no hace nada
> visible.

- [x] **Step 2: Modo completo — sacar `heading`, mover badge y acciones al footer**

Reemplazar (línea ~139-160, hasta el cierre del `<div headerActions>`):

```typescript
        <ui-wizard-shell
          [heading]="'Atención ' + headerTitle()"
          [steps]="stepperSteps()"
          [currentIndex]="activeIndex()"
          [visited]="completedSteps()"
          [clickable]="readOnly()"
          [customFooter]="true"
          [maxWidth]="'1040px'"
          [bodyFill]="bodyFill()"
          (stepSelected)="goToStep($event)">

          @if (detail()!.isUrgent) {
            <p-tag headingBadge value="URGENTE" severity="danger" />
          }

          <div headerActions class="flex items-center gap-2">
            <p-button label="Volver al listado" severity="secondary" [text]="true" size="small"
                      (onClick)="backToList()" />
            @if (canCancel()) {
              <p-button label="Cancelar atención" severity="danger" [text]="true" size="small" (onClick)="onCancel()" />
            }
          </div>
```

por:

```typescript
        <ui-wizard-shell
          [steps]="stepperSteps()"
          [currentIndex]="activeIndex()"
          [visited]="completedSteps()"
          [clickable]="readOnly()"
          [customFooter]="true"
          [maxWidth]="'1040px'"
          [bodyFill]="bodyFill()"
          (stepSelected)="goToStep($event)">
```

(el badge y las acciones se reubican en el footer en el Step 3 — no van más acá).

- [x] **Step 3: Modo completo — agregar badge y acciones al footer existente**

El footer de este modo ya arma un `<div wizardFooter class="flex items-center gap-2">` con
un `@switch` (línea ~229 del archivo original). Reemplazar la apertura de ese bloque:

```typescript
          @if (!readOnly()) {
            <div wizardFooter class="flex items-center gap-2">
              @if (canReturn()) {
```

por:

```typescript
          @if (!readOnly()) {
            <div wizardFooterLeft class="flex items-center gap-2">
              <p-button label="Volver al listado" severity="secondary" [text]="true" size="small"
                        (onClick)="backToList()" />
              @if (canCancel()) {
                <p-button label="Cancelar atención" severity="danger" [text]="true" size="small" (onClick)="onCancel()" />
              }
            </div>
          }
          @if (detail()!.isUrgent) {
            <p-tag wizardFooterCenter value="URGENTE" severity="danger" />
          }

          @if (!readOnly()) {
            <div wizardFooter class="flex items-center gap-2">
              @if (canReturn()) {
```

**Ojo con la estructura** (ver la regla de proyección más arriba): los 3 bloques
(`wizardFooterLeft`, `wizardFooterCenter`, `wizardFooter`) son **hermanos**, hijos directos
de `<ui-wizard-shell>` — ninguno anida dentro de otro. Por eso el `@if (!readOnly())`
aparece dos veces: una envolviendo la zona izquierda, otra envolviendo la derecha.

**Efecto secundario deliberado:** el badge URGENTE queda FUERA del `@if (!readOnly())`, así
que a diferencia de las acciones, **sí se sigue mostrando en modo solo-lectura** — igual que
antes del refactor, cuando vivía en el header. Esto resuelve el caso abierto que el design
doc dejaba marcado para confirmar con el usuario.

El resto del `@switch` no cambia.

**Caso "readOnly" — resuelto por la estructura de hermanos:** al quedar el
`wizardFooterCenter` fuera del `@if (!readOnly())`, el badge URGENTE se sigue mostrando en
modo solo-lectura, igual que antes del refactor (cuando vivía en el header). Solo las
acciones de la zona izquierda se ocultan en solo-lectura, que es el comportamiento correcto:
no se puede cancelar una atención terminal.

- [x] **Step 4: Sacar el computed `headerTitle()`, que queda sin consumidor**

Buscar y borrar (línea ~407 del archivo original):

```typescript
  protected readonly headerTitle = computed<string>(() => {
```

y todo el cuerpo del computed hasta su cierre `});`. Confirmar antes de borrar que no tiene
otro consumidor:

```bash
grep -n "headerTitle" src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
```

Debe devolver únicamente la línea de la declaración (ya no la del binding, sacado en el
Step 2). Si aparece en algún otro lado, no borrar sin revisar antes.

- [x] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "refactor(atencion-wizard): migrar al footer de 3 zonas de wizard-shell

- Se saca [heading] de los 2 bloques (creando + completo).
- 'Volver al listado' (+ 'Cancelar atención' condicional) pasan de
  headerActions a wizardFooterLeft.
- El tag URGENTE pasa de headingBadge a wizardFooterCenter.
- Se saca el computed headerTitle(), sin consumidor tras sacar el binding
  del titulo dinamico 'Atencion {code}' — esa info se pierde, decision
  explicita del usuario (no se reubica en ningun lado).

Los 3 slots son hermanos (hijos directos de ui-wizard-shell): ng-content
select solo matchea hijos directos, anidarlos no proyecta. El badge
URGENTE queda fuera del @if(!readOnly()), asi que se sigue viendo en
solo-lectura igual que antes."
```

---

### Task 3: Sacar `heading`/`breadcrumb` de los 8 wizards simples

**Files:**
- Modify: `src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts`
- Modify: `src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.ts`
- Modify: `src/app/features/medicos/pages/medico-form/medico-form.page.ts`
- Modify: `src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html`
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts`
- Modify: `src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts`
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.html`

**Interfaces:**
- Consumes: la nueva API de `WizardShellComponent` (Task 1) — ninguno de estos 8 usa los
  slots nuevos, solo dejan de pasar `heading`/`breadcrumb`.
- Produces: nada.

Cambio puramente mecánico: sacar el binding del template, y si el valor venía de un
`computed()` dedicado exclusivamente a alimentar ese binding (verificado con `grep` en cada
caso, ver Design doc sección 3.3), sacar también el computed. Ninguno de estos 8 tiene
`headerActions`/`headingBadge` hoy — no hay nada que mover al footer.

- [x] **Step 1: `nueva-visita.page.ts`**

Buscar (línea ~140-141):

```typescript
    <ui-wizard-shell
      heading="Nueva visita domiciliaria"
      [steps]="STEPS"
```

Reemplazar por:

```typescript
    <ui-wizard-shell
      [steps]="STEPS"
```

- [x] **Step 2: `generar-liquidacion.page.ts`**

Buscar (línea ~84-86):

```typescript
    <ui-wizard-shell
      heading="Generar liquidación"
      [steps]="steps()"
```

Reemplazar por:

```typescript
    <ui-wizard-shell
      [steps]="steps()"
```

- [x] **Step 3: `medico-form.page.ts`**

Buscar (línea ~42-46):

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [heading]="pageHeading()"
        [breadcrumb]="'Médicos › ' + (isEdit() ? 'Editar' : 'Nuevo')"
        [steps]="steps"
```

Reemplazar por:

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [steps]="steps"
```

Y borrar el computed que queda sin consumidor (línea ~123-128):

```typescript
  /** Título de la página (lo consume `ui-wizard-shell`); en edición sufija el nombre. */
  readonly pageHeading = computed(() => {
    if (!this.isEdit()) return 'Nuevo médico derivante';
    const d = this.doctor();
    return d ? `Editar médico · ${d.lastName}, ${d.firstName}` : 'Editar médico';
  });

```

- [x] **Step 4: `obra-social-form.page.ts`**

Buscar (línea ~39-41):

```typescript
      <ui-wizard-shell
        heading="Nueva obra social"
        breadcrumb="Obras Sociales › Nueva"
        [steps]="steps"
```

Reemplazar por:

```typescript
      <ui-wizard-shell
        [steps]="steps"
```

- [x] **Step 5: `patient-form.page.ts`**

Buscar (línea ~55-59):

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [heading]="pageHeading()"
        [breadcrumb]="'Pacientes › ' + (isEdit() ? 'Editar' : 'Nuevo')"
        [steps]="steps"
```

Reemplazar por:

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [steps]="steps"
```

Y borrar el computed que queda sin consumidor (línea ~166-171):

```typescript
  /** Título de la página (lo consume `ui-wizard-shell`); en edición sufija el nombre. */
  readonly pageHeading = computed(() => {
    if (!this.isEdit()) return 'Nuevo paciente';
    const p = this.patient();
    return p ? `Editar paciente · ${p.lastName}, ${p.firstName}` : 'Editar paciente';
  });

```

- [x] **Step 6: `sucursal-alta-stepper.page.html` + `.page.ts`**

En `sucursal-alta-stepper.page.html`, buscar (línea 1-3):

```html
<ui-wizard-shell
  [heading]="heading()"
  [breadcrumb]="breadcrumb()"
  [steps]="steps()"
```

Reemplazar por:

```html
<ui-wizard-shell
  [steps]="steps()"
```

En `sucursal-alta-stepper.page.ts`, buscar (línea ~66-71):

```typescript
  protected readonly heading = computed(() =>
    this.editMode() ? 'Editar sucursal' : 'Nueva sucursal',
  );
  protected readonly breadcrumb = computed(() =>
    this.editMode() ? 'Sucursales › Editar' : 'Sucursales › Nueva',
  );
```

Borrar esas 6 líneas enteras.

- [x] **Step 7: `empleado-form.page.ts`**

Buscar (línea ~50-53):

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [heading]="pageHeading()"
        [breadcrumb]="'Sucursales › Empleados › ' + (isEdit() ? 'Editar' : 'Nuevo')"
        [steps]="steps()"
```

Reemplazar por:

```typescript
      <ui-wizard-shell
        [customFooter]="true"
        [steps]="steps()"
```

Y borrar el computed que queda sin consumidor (línea ~153-158):

```typescript
  /** Título de la página (lo consume `ui-wizard-shell`); en edición sufija el nombre. */
  readonly pageHeading = computed(() => {
    if (!this.isEdit()) return 'Nuevo empleado';
    const e = this.employee();
    return e ? `Editar empleado · ${e.lastName}, ${e.firstName}` : 'Editar empleado';
  });

```

- [x] **Step 8: `agenda-wizard.page.html`**

Buscar (línea 1-3):

```html
<ui-wizard-shell
  [heading]="editingId() ? 'Editar agenda' : 'Nueva agenda'"
  [breadcrumb]="'Turnos › Agendas › ' + (editingId() ? 'Editar' : 'Nueva')"
  [steps]="steps"
```

Reemplazar por:

```html
<ui-wizard-shell
  [steps]="steps"
```

- [x] **Step 9: Commit**

```bash
git add src/app/features/domicilio/pages/nueva-visita/nueva-visita.page.ts \
        src/app/features/financiero/pages/liquidaciones/generar-liquidacion.page.ts \
        src/app/features/medicos/pages/medico-form/medico-form.page.ts \
        src/app/features/obras-sociales/pages/obra-social-form/obra-social-form.page.ts \
        src/app/features/pacientes/pages/patient-form/patient-form.page.ts \
        src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.html \
        src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.ts \
        src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts \
        src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.html
git commit -m "refactor(wizards): sacar heading/breadcrumb de los 8 wizards simples

Ninguno de estos 8 usaba headerActions/headingBadge — solo se saca el
binding al header que ya no existe (Task 1), y los computeds pageHeading/
heading/breadcrumb que quedaron sin consumidor en medico-form, patient-form,
empleado-form y sucursal-alta-stepper."
```

---

### Task 4: Reescribir `wizard-shell.component.spec.ts`

**Files:**
- Modify: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.spec.ts`

**Interfaces:**
- Consumes: la API nueva de `WizardShellComponent` (Task 1) — `[wizardFooterLeft]`,
  `[wizardFooterCenter]`, sin `heading`/`breadcrumb`/`headingBadge`/`headerActions`.
- Produces: nada.

- [x] **Step 1: Reemplazar el archivo completo**

```typescript
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { WizardShellComponent } from './wizard-shell.component';
import { FormStep } from '@shared/ui/models/form-step';

const STEPS: FormStep[] = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
];

@Component({
  standalone: true,
  imports: [WizardShellComponent],
  template: `
    <ui-wizard-shell
      [steps]="steps"
      [currentIndex]="0"
      [visited]="visited()"
      [customFooter]="true">
      <div wizardFooterLeft data-testid="footer-left">acciones</div>
      <span wizardFooterCenter data-testid="footer-center">URGENTE</span>
      <div wizardBanner data-testid="banner">banner</div>
      <p>contenido del paso</p>
      <div wizardFooter data-testid="footer">botones</div>
    </ui-wizard-shell>
  `,
})
class HostWithSlots {
  steps = STEPS;
  visited = signal<ReadonlySet<number>>(new Set([0]));
}

@Component({
  standalone: true,
  imports: [WizardShellComponent],
  template: `
    <ui-wizard-shell
      [steps]="steps"
      [currentIndex]="0"
      [visited]="visited()">
      <p>contenido</p>
    </ui-wizard-shell>
  `,
})
class HostPlain {
  steps = STEPS;
  visited = signal<ReadonlySet<number>>(new Set([0]));
}

describe('WizardShellComponent', () => {
  it('no renderiza ningún <header> ni <h1> — el shell arranca directo en la tira de pasos', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('header')).toBeNull();
    expect(el.querySelector('h1')).toBeNull();
  });

  it('proyecta los slots wizardFooterLeft, wizardFooterCenter y wizardBanner', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[data-testid="footer-left"]')?.textContent).toContain('acciones');
    expect(el.querySelector('[data-testid="footer-center"]')?.textContent).toContain('URGENTE');
    expect(el.querySelector('[data-testid="banner"]')?.textContent).toContain('banner');
    expect(el.textContent).toContain('contenido del paso');
  });

  it('wizardFooterLeft y wizardFooterCenter viven dentro del <footer>', () => {
    const fixture = TestBed.createComponent(HostWithSlots);
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('footer');
    expect(footer.querySelector('[data-testid="footer-left"]')).toBeTruthy();
    expect(footer.querySelector('[data-testid="footer-center"]')).toBeTruthy();
  });

  it('sin usar los slots nuevos, no rompe (quedan vacíos, sin agregar texto)', () => {
    const fixture = TestBed.createComponent(HostPlain);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="footer-left"]')).toBeFalsy();
    expect(el.querySelector('[data-testid="footer-center"]')).toBeFalsy();
  });
});
```

- [x] **Step 2: Commit**

```bash
git add src/app/shared/ui/components/wizard-shell/wizard-shell.component.spec.ts
git commit -m "test(wizard-shell): reescribir specs para el shell sin header

Los 3 tests viejos asumian header()/h1()/headingBadge()/headerActions().
Se reemplazan por 4 tests: confirma que header/h1 no existen, que
wizardFooterLeft/wizardFooterCenter proyectan y viven dentro del footer,
y que quedan vacios sin uso (no rompen wizards que no los usan)."
```

---

### Task 5: Podar `atencion-wizard.component.spec.ts`

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.spec.ts`

**Interfaces:**
- Consumes: el DOM que produce `atencion-wizard.component.ts` tras la Task 2 (URGENTE en
  `[wizardFooterCenter]`, sin `<h1>` ni `<header>`).
- Produces: nada.

- [x] **Step 1: Borrar el bloque C6 completo (3 tests)**

Buscar y borrar, desde el comentario hasta el cierre del tercer `it()` (línea ~193-220 del
archivo original):

```typescript
  // ── C6: título grande = publicCode con fallback a attentionNumber ──────────
  it('C6: el título grande muestra "Atención {publicCode}" cuando hay publicCode', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), publicCode: 'ST-001' } as any);
    store.refreshState();
    fixture.detectChanges();
    // El heading vive ahora en el <h1> del ui-wizard-shell.
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent).toContain('Atención ST-001');
    expect((fixture.componentInstance as any).headerTitle()).toBe('ST-001');
  });

  it('C6: si publicCode es null el título cae al attentionNumber', () => {
    setup(AttentionState.REGISTERING_ANALYSES); // makeDetail → publicCode: null, attentionNumber: 'A-001'
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1.textContent).toContain('Atención A-001');
    expect((fixture.componentInstance as any).headerTitle()).toBe('A-001');
  });

  it('C6: publicCode en blanco (string vacío) también cae al attentionNumber', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), publicCode: '   ' } as any);
    store.refreshState();
    fixture.detectChanges();
    expect((fixture.componentInstance as any).headerTitle()).toBe('A-001');
  });

```

- [x] **Step 2: Borrar el test C3 (subtítulo del header)**

Buscar y borrar (línea ~222-227 del archivo original):

```typescript
  // ── C3: el header ya no muestra el subtítulo "Paciente {id} · {estado}" ────
  it('C3: el header NO muestra el subtítulo "Paciente … · estado"', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.textContent).not.toContain('Paciente 100');
  });

```

- [x] **Step 3: Reescribir los 2 tests C2 (badge URGENTE) sin `querySelector('header')`**

Buscar (línea ~229-244 del archivo original):

```typescript
  // ── C2: el tag URGENTE vive en el header del wizard, debajo del número ─────
  it('C2: con isUrgent el header muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), isUrgent: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.textContent).toContain('URGENTE');
  });

  it('C2: sin isUrgent el header NO muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES); // makeDetail → isUrgent: false
    const header = fixture.nativeElement.querySelector('header') as HTMLElement;
    expect(header.textContent).not.toContain('URGENTE');
  });
```

Reemplazar por:

```typescript
  // ── C2: el tag URGENTE vive centrado en el footer del wizard ────────────────
  it('C2: con isUrgent el footer muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES);
    const store = TestBed.inject(MockStore);
    store.overrideSelector(selectDetail, { ...makeDetail(AttentionState.REGISTERING_ANALYSES), isUrgent: true } as any);
    store.refreshState();
    fixture.detectChanges();
    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.textContent).toContain('URGENTE');
  });

  it('C2: sin isUrgent el footer NO muestra el tag URGENTE', () => {
    setup(AttentionState.REGISTERING_ANALYSES); // makeDetail → isUrgent: false
    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.textContent).not.toContain('URGENTE');
  });
```

Nota: el `<footer>` sigue existiendo (es del shell, no se sacó — solo se sacó el
`<header>`), así que `querySelector('footer')` sigue siendo válido acá.

- [x] **Step 4: Renombrar el test NEW-D (sin tocar su cuerpo)**

Buscar (línea ~255):

```typescript
  it('NEW-D: el botón "Volver al listado" se renderiza en el header', () => {
```

Reemplazar solo el string del nombre por:

```typescript
  it('NEW-D: el botón "Volver al listado" se renderiza en el footer', () => {
```

El cuerpo del test (`querySelectorAll('button')` sobre todo el fixture) no cambia.

- [x] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.spec.ts
git commit -m "test(atencion-wizard): podar specs del titulo/header que ya no existen

- Se borran los 3 tests C6 (titulo grande con publicCode/fallback):
  testeaban headerTitle() y el <h1>, ninguno de los dos existe mas.
- Se borra el test C3 (subtitulo del header): no hay header que revisar.
- Los 2 tests C2 (badge URGENTE) se reescriben sobre <footer> en vez de
  <header> — el shell sigue teniendo footer, solo se saco el header.
- NEW-D se renombra ('...en el footer'); el assert no cambia, ya buscaba
  el boton por texto en todo el fixture, no por ubicacion."
```

---

### Task 6: Verificación final — build + tests + visual Playwright

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: el estado completo del repo tras las Tasks 1-5.
- Produces: confirmación de que el refactor no rompió nada, y evidencia visual de las 9
  pantallas.

- [x] **Step 1: Correr el build completo**

```bash
cd FRONTEND-LABORATORIO
npm test > /tmp/wizard-shell-test.log 2>&1; echo "EXIT:$?"
grep -n "^    src/" /tmp/wizard-shell-test.log | sed -E 's/^[0-9]+:\s*(src\/[^:]+):.*/\1/' | sort -u
```

Expected: la lista de archivos con diagnósticos debe ser **exactamente** la misma lista de
errores preexistentes documentada en `Global Constraints` (financiero/metrics, saas-admin,
ayuda/manual, muestras/cargar-resultados, más `data-table.expandable.spec.ts` que es un
warning, no error). Si aparece cualquier archivo de los tocados en este plan (wizard-shell,
atencion-wizard, o cualquiera de los 8 wizards simples), **no está listo** — volver a la
tarea correspondiente y corregir antes de seguir.

- [x] **Step 2: Levantar el entorno local**

```bash
docker start laboratorio_mysql laboratorio_adminer
```

Backend, desde `Backend/` (NO usar `start-backend.bat`, apunta al puerto equivocado):

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3307/laboratorio?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC'
./mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Esperar a que responda `{"status":"UP"}`:

```bash
curl http://localhost:8080/actuator/health
```

Frontend: levantar el server `frontend-laboratorio` definido en `.claude/launch.json` (puerto
4200). Login `admin@test.com` / `password`.

- [x] **Step 3: Verificar visualmente las 9 pantallas**

Para cada una, confirmar que: (a) no hay `<header>` con título arriba de la tira de pasos,
(b) la tira de pasos es lo primero que se ve, (c) no queda el texto "Paso X de Y" en el
footer.

| # | Pantalla | Ruta (confirmada en `*.routes.ts`) |
|---|---|---|
| 1 | Nueva atención | `/analitica/atencion/nueva` |
| 2 | Atención existente (con `isUrgent=true` si hay alguna) | `/analitica/atencion/:id` |
| 3 | Nuevo empleado | `/sucursales/empleados/nuevo` |
| 4 | Nuevo paciente | `/pacientes/nuevo` |
| 5 | Nueva obra social | `/obras-sociales/nueva` |
| 6 | Nuevo médico | `/medicos/nuevo` |
| 7 | Generar liquidación | `/financiero/liquidaciones/nueva` |
| 8 | Nueva visita a domicilio | `/domicilio/nueva` |
| 9 | Alta de sucursal | `/sucursales/configuracion/nueva` |
| 10 | Nueva agenda | `/turnos/configuracion/nueva` |

`sacar-turno.page.ts` **no** usa `ui-wizard-shell` (solo lo menciona en un comentario como
inspiración de diseño — implementa su propio shell a mano) — confirmado, no forma parte de
este refactor, no hace falta verificarlo.

Para la pantalla de Atención (#2), verificar específicamente:
- El footer tiene 3 zonas: "Volver al listado" (+ "Cancelar atención" si no es terminal) a
  la izquierda, nada o URGENTE al centro, el botón de acción principal a la derecha.
- Si la atención es urgente, el tag "URGENTE" se ve centrado en el footer.
- **Caso solo-lectura**: abrir una atención urgente en estado terminal (FINISHED) y
  confirmar que el badge URGENTE **sí** se sigue viendo centrado en el footer (queda fuera
  del `@if (!readOnly())`), mientras que "Volver al listado" / "Cancelar atención"
  correctamente no aparecen.
- **Verificar que la proyección realmente funciona**: las 3 zonas tienen que verse en
  posiciones distintas (izquierda / centro / derecha). Si "Volver al listado" aparece pegado
  a la derecha junto al botón principal, los slots quedaron anidados en vez de hermanos y la
  proyección no se aplicó — ver la regla de proyección en la Task 2.

- [x] **Step 4: Reportar y esperar OK antes de mergear**

No mergear a `development` sin la confirmación explícita del usuario — mismo criterio que
el resto de las PRs de esta sesión.

## Resultado de la verificación (2026-08-25)

- `npm test`: mismo set de errores preexistentes que el baseline documentado en Global
  Constraints — ningún archivo tocado por este plan aparece en la lista. Confirmado dos
  veces (antes y después de reparar un `node_modules` dañado por un manejo incorrecto de
  worktree/junction durante la ejecución — sin relación con el código de este plan).
- Las 10 pantallas (9 componentes) verificadas en el navegador contra el entorno local real:
  ninguna tiene `<header>`, `<h1>` ni el contador "Paso X de Y".
- Atención: confirmado el footer de 3 zonas hijas directas del `<footer>`:
  `[Volver al listado, Cancelar atención]` (izquierda) — `[URGENTE]` (centro, `flex-1
  justify-center`, solo si `isUrgent`) — `[Volver fase, acción principal]` (derecha).
  Probado con una atención normal y con una urgente creada a propósito (DNI 40555666,
  toggle "Atención urgente" activado antes de confirmar el paso 1) — el tag "URGENTE"
  apareció centrado en el footer como se esperaba.
- **Caso abierto sin confirmar**: no se probó el caso urgente + solo-lectura (estado
  terminal) señalado en la Task 2 — sigue pendiente de decisión del usuario si el badge
  URGENTE debería seguir visible ahí.
