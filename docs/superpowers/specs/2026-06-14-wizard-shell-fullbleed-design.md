# Genérico — Full-bleed centralizado en `ui-wizard-shell`

> **Estado:** Diseño aprobado (2026-06-14).
> **Rama:** `feat/wizard-shell-fullbleed` (worktree `.worktrees/wizard-fullbleed`, off `development`).
> **Alcance:** Frontend puro (CSS). Sin backend, sin lógica.
> **Jira:** _(pendiente — `jira-workflow`)_

## Problema

El admin-shell aplica `padding: var(--space-6)` (`--space-4` en mobile ≤767px) sobre `.ui-admin-shell__content` ([admin-shell.component.ts:66-74](FRONTEND-LABORATORIO/.worktrees/wizard-fullbleed/src/app/layout/admin-shell/admin-shell.component.ts#L66)). Los wizards full-page (que gestionan su propio chrome: header sticky + body scrollable + footer sticky) quedan con un gap alrededor respecto al sidebar/topbar.

Hoy **solo Sucursales y Agenda** van full-bleed, cada uno con un **hack de margin negativo duplicado** en su propio `:host` (`sucursal-alta-stepper.page.scss`, `agenda-wizard.page.scss`). Las otras páginas que usan `ui-wizard-shell` (Pacientes, Médicos, Empleados, Obras Sociales) **heredan el padding** → tienen el gap. Resultado: inconsistencia visual.

Objetivo del usuario: que **ningún** stepper de la app tenga ese padding — todos full-bleed como Sucursales.

## Consumidores de `ui-wizard-shell` (7 páginas)

- `pacientes/.../patient-form.page.ts` — hoy CON gap
- `medicos/.../medico-form.page.ts` — hoy CON gap
- `sucursales/.../empleado-form.page.ts` — hoy CON gap
- `obras-sociales/.../obra-social-form.page.ts` — hoy CON gap
- `sucursales/.../sucursal-alta-stepper.page` — full-bleed (hack propio)
- `turnos/.../agenda-wizard.page` — full-bleed (hack propio)
- `analitica/.../atencion-wizard.component` — migrará al shell por el plan de Atención; heredará el full-bleed automáticamente.

## Diseño (DRY)

Centralizar el full-bleed en el `:host` del componente compartido `ui-wizard-shell` y eliminar los hacks duplicados.

1. **`shared/ui/components/wizard-shell/wizard-shell.component.ts`** — cambiar el bloque `styles` del `:host`:
   - De: `:host { display: block; height: 100%; min-height: 0; }`
   - A: margin negativo `calc(-1 * var(--space-6))`, `height: calc(100% + var(--space-6) * 2)`, `overflow: hidden`, `min-height: 0`; con media query `max-width: 767px` usando `--space-4` (mismo breakpoint que el admin-shell).
2. **`sucursal-alta-stepper.page.scss`** — eliminar el bloque `:host` + su media query (el full-bleed ahora lo da el shell). Mantener el resto si hubiera (no hay).
3. **`agenda-wizard.page.scss`** — eliminar el bloque `:host` + su media query. **Mantener** la clase `.muted` (es estilo de contenido, no del layout).

Las 4 páginas con gap quedan full-bleed sin tocarlas (lo hereda el shell). Sucursales y Agenda mantienen el mismo aspecto (el shell hace lo que antes hacía su hack).

## Riesgo / verificación

El margin negativo asume que el `ui-wizard-shell` es el elemento raíz de la página dentro de `.ui-admin-shell__content` (lo es en las 7). La cadena de `height` ya estaba establecida (hoy el shell usa `height: 100%` y funciona). Verificación **visual obligatoria** de las 7 páginas: que ninguna tenga gap y que ninguna quede con doble-negación (margen excesivo) o scroll roto.

## Testing

- `ng test` — los specs de los componentes de wizard siguen verdes (cambio solo CSS).
- Smoke visual: abrir las 7 páginas y confirmar full-bleed uniforme (desktop y mobile ≤767px).

## Fuera de scope

El padding **interno** del `form-stepper-header` (18px 28px) NO se toca — el pedido era el gap del contenedor, no el espaciado interno de los dots.
