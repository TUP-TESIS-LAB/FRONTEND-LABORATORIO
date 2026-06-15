# Genérico — Full-bleed centralizado en `ui-wizard-shell` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.
>
> **Jira:** [KAN-111](https://exequielsantoro.atlassian.net/browse/KAN-111)
>
> **Spec:** `docs/superpowers/specs/2026-06-14-wizard-shell-fullbleed-design.md`

**Goal:** Que todos los wizards full-page vayan full-bleed (sin gap respecto a sidebar/topbar), centralizando el full-bleed en `ui-wizard-shell` y eliminando los hacks duplicados de Sucursales y Agenda.

**Architecture:** CSS puro. Un cambio en el `:host` del shell compartido + remoción de 2 hacks duplicados. Las 4 páginas con gap lo heredan; las 2 full-bleed mantienen su aspecto.

**Tech Stack:** Angular 21 standalone, estilos de componente scoped.

**Worktree:** `feat/wizard-shell-fullbleed`. `npm ci` antes de testear.

---

### Task 1: Centralizar el full-bleed en `ui-wizard-shell`

**Files:**
- Modify: `src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts` (bloque `styles`, ~líneas 96-100)

- [ ] **Step 1: Reemplazar el `:host`**

Cambiar el `styles` del componente. De:
```ts
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    .wz-bar--top { border-bottom: 1px solid var(--ds-border); }
    .wz-bar--bottom { border-top: 1px solid var(--ds-border); }
  `],
```
A:
```ts
  styles: [`
    /* Full-bleed: negamos el padding que el AdminShell aplica sobre
       .ui-admin-shell__content (--space-6 desktop, --space-4 mobile ≤767px),
       para que el wizard llegue borde a borde. Centralizado acá para que TODOS
       los wizards (pacientes, médicos, empleados, obras sociales, sucursal,
       agenda, atención) sean idénticos — antes cada uno lo hackeaba aparte. */
    :host {
      display: block;
      min-height: 0;
      overflow: hidden;
      margin: calc(-1 * var(--space-6));
      height: calc(100% + var(--space-6) * 2);
    }
    @media (max-width: 767px) {
      :host {
        margin: calc(-1 * var(--space-4));
        height: calc(100% + var(--space-4) * 2);
      }
    }
    .wz-bar--top { border-bottom: 1px solid var(--ds-border); }
    .wz-bar--bottom { border-top: 1px solid var(--ds-border); }
  `],
```

- [ ] **Step 2: Build sanity**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores (cambio solo de string de estilos).

- [ ] **Step 3: Commit**

```bash
git add src/app/shared/ui/components/wizard-shell/wizard-shell.component.ts
git commit -m "feat(ui): full-bleed centralizado en ui-wizard-shell"
```

### Task 2: Eliminar el hack duplicado de Sucursales

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss`

- [ ] **Step 1: Vaciar el full-bleed propio**

El archivo hoy contiene SOLO el bloque `:host` full-bleed + su media query (más un comentario). Borrar el bloque `:host { margin: calc(...); height: calc(...); overflow: hidden; ... }` y la media query `@media (max-width: 767px) { :host {...} }`. El full-bleed ahora lo da el shell.

El archivo queda sin reglas. Dejarlo vacío es válido (Angular tolera un styleUrl vacío). Opcional: si preferís, quitar la entrada `styleUrls` del `sucursal-alta-stepper.page.ts` y borrar el `.scss` — pero la opción mínima y segura es dejar el `.scss` vacío.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(sucursales): quitar full-bleed propio (lo da el shell)"
```

### Task 3: Eliminar el hack duplicado de Agenda (conservando `.muted`)

**Files:**
- Modify: `src/app/features/turnos/pages/configuracion/agenda-wizard/agenda-wizard.page.scss`

- [ ] **Step 1: Borrar solo el full-bleed**

Borrar el bloque `:host { ... margin: calc(...); height: calc(...); overflow: hidden; }` y su media query `@media (max-width: 767px)`. **Conservar** la clase `.muted`:
```scss
.muted {
  color: var(--p-text-muted-color);
  padding: 1rem 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(turnos): quitar full-bleed propio de agenda-wizard (lo da el shell)"
```

### Task 4: Verificación visual (regresión de las 7 páginas)

- [ ] **Step 1: Tests**

Run: `ng test --include='**/wizard-shell.component.spec.ts' --include='**/patient-form/**' --include='**/sucursal-alta-stepper/**' --watch=false`
Expected: verde (cambio solo CSS; ajustar specs solo si asserteaban el `:host` viejo).

- [ ] **Step 2: Smoke visual (desktop)**

Levantar el worktree (`start-worktree.ps1`, schema dedicado). Abrir y confirmar **full-bleed sin gap** y scroll OK en:
1. Alta de paciente (`patient-form`)
2. Alta de médico (`medico-form`)
3. Alta de empleado (`empleado-form`)
4. Alta de obra social (`obra-social-form`)
5. Alta de sucursal (`sucursal-alta-stepper`) — debe verse IGUAL que antes
6. Wizard de agenda (`agenda-wizard`) — IGUAL que antes
7. (Si ya está la migración de Atención) wizard de atención — full-bleed

- [ ] **Step 3: Smoke visual (mobile ≤767px)**

Reducir el viewport a ≤767px y confirmar que el full-bleed usa `--space-4` y no rompe el layout en las mismas páginas.

- [ ] **Step 4: PR — 1 solo PR de FE** contra `development` (este tópico no toca backend), linkeando el Jira.

---

## Self-review

- Pedido (todos los steppers sin el padding del contenedor, como Sucursales) → Task 1 (shell) + Task 2/3 (quitar duplicados). ✅
- Sin placeholders: código exacto del `:host`. Breakpoint 767px alineado con el admin-shell. `.muted` de Agenda preservada explícitamente.
- Sin tocar el padding interno del `form-stepper-header` (fuera de scope, declarado en el spec).
