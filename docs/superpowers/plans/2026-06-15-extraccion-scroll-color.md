# Extracción — Scroll interno + color del tenant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development o superpowers:executing-plans. Steps con checkbox (`- [ ]`).
>
> **Jira:** [KAN-112](https://exequielsantoro.atlassian.net/browse/KAN-112)
>
> **Spec:** `docs/superpowers/specs/2026-06-15-extraccion-scroll-color-design.md`

**Goal:** Scroll interno en las dos tablas de la cola de extracción y llamados de la TV de extracción con el color primary del tenant.

**Architecture:** Frontend puro. Atributos `scrollable scrollHeight="flex"` en las p-table + ajustes CSS flex; reemplazo de `$extraccion-green` por `var(--brand-primary, #059669)` en los llamados de la TV (patrón de `sala-espera`).

**PRs (regla del usuario): 1 solo PR de FE** (no toca backend).

**Worktree:** `feat/extraccion-scroll-color`. `npm ci` antes de testear.

---

### Task 1: Scroll interno en la tabla "Cola" (extraction-queue)

**Files:**
- Modify: `src/app/features/analitica/pages/extraction-queue/extraction-queue.page.ts` (p-table línea ~116 + estilos)

- [ ] **Step 1: Hacer la p-table scrollable**

En el template, la p-table de la cola:
```html
<p-table [value]="awaiting()" styleClass="p-datatable-sm" scrollable scrollHeight="flex">
```

- [ ] **Step 2: CSS para que llene el flex del `.block`**

En los `styles` del componente, asegurar que la p-table de la cola ocupa el alto disponible y scrollea:
```css
.block > p-table { flex: 1; min-height: 0; display: block; }
:host ::ng-deep .block .p-datatable { height: 100%; display: flex; flex-direction: column; }
:host ::ng-deep .block .p-datatable-table-container { flex: 1; min-height: 0; overflow: auto; }
```
(Ajustar selectores al markup real; el objetivo es: header sticky + body scrolleable dentro del `.block`.)

- [ ] **Step 3: Verificar** — Run: `ng test --include='**/extraction-queue.page.spec.ts' --watch=false` → PASS. Smoke: con muchas filas, la tabla scrollea internamente.

- [ ] **Step 4: Commit** — `git commit -m "feat(extraccion): scroll interno en la tabla de cola"`

### Task 2: Scroll interno en "En curso" (in-progress-list)

**Files:**
- Modify: `src/app/features/analitica/components/in-progress-list/in-progress-list.component.ts` (p-table línea ~36 + `:host` styles)

- [ ] **Step 1: p-table scrollable**

```html
<p-table [value]="items()" styleClass="p-datatable-sm" scrollable scrollHeight="flex">
```

- [ ] **Step 2: CSS**

El `:host` ya es `flex; flex-direction:column; height:100%; min-height:0`. Agregar:
```css
:host > p-table { flex: 1; min-height: 0; display: block; }
:host ::ng-deep .p-datatable { height: 100%; display: flex; flex-direction: column; }
:host ::ng-deep .p-datatable-table-container { flex: 1; min-height: 0; overflow: auto; }
```

- [ ] **Step 3: Verificar** — Run: `ng test --include='**/in-progress-list.component.spec.ts' --watch=false` → PASS. Smoke: scroll interno con muchas filas.

- [ ] **Step 4: Commit** — `git commit -m "feat(extraccion): scroll interno en lista en-curso"`

### Task 3: Llamados de la TV con el color del tenant

**Files:**
- Modify: `src/app/features/turnos/pages/tv-extraccion/tv-extraccion.page.scss`

- [ ] **Step 1: Reemplazar `$extraccion-green` en los llamados**

Cambiar los usos de `$extraccion-green` que estilan el llamado por `var(--brand-primary, #059669)` (mismo patrón que `sala-espera.page.scss`):
- `.code` (línea ~239): `color: var(--brand-primary, #059669);`
- `.box` (línea ~247): `color: var(--brand-primary, #059669);`
- Acentos del card del llamado (líneas ~60, ~115, ~121: background/border/color del bloque del llamado): `var(--brand-primary, #059669)`.

Dejar `$extraccion-green` como fallback en el `var(...)`; no tocar `$extraccion-bg` (fondo blanco) ni estilos no relacionados al llamado. Si `$extraccion-green` queda sin uso, se puede borrar la variable.

- [ ] **Step 2: Verificar** — Run: `ng test --include='**/tv-extraccion.page.spec.ts' --watch=false` → PASS. Smoke: con un tenant de `primaryColor` no-verde, el código/box del llamado salen en ese color; sin tema cargado, fallback verde.

- [ ] **Step 3: Commit** — `git commit -m "feat(extraccion): llamados de la TV con el color primary del tenant"`

### Task 4: Verificación + PR

- [ ] **Step 1: Suite** — `ng test --watch=false` → verde.
- [ ] **Step 2: Smoke visual** — cola de extracción (scroll interno en ambas columnas, header sticky, layout 2 columnas fijo) + TV de extracción (color del tenant en los llamados).
- [ ] **Step 3: PR — 1 solo PR de FE** contra `development`, linkeando el Jira.

---

## Self-review
- Item 1 (scroll interno tablas) → Task 1 (cola) + Task 2 (en curso). ✅
- Item 2 (color tenant en llamados) → Task 3. ✅
- 1 solo PR de FE, sin backend. Sin placeholders: atributos + CSS + reemplazo de color concretos, patrón espejado de `sala-espera`.
