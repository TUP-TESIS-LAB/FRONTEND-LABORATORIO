# Turnos UX LAB — Deep review & polish — Design

> **Branch:** `feat/turnos-ux-lab` (LAB)
> **Origen:** revisión profunda equivalente a la que se hizo sobre el stepper de alta sucursal en `feat/sucursales-back-office`.
> **Spec maestro relacionado:** `tesis/docs/superpowers/specs/2026-05-26-turnos-cierre-ux-y-sucursales-back-office-design.md` §5 (KAN-48).
> **Plan original:** `docs/superpowers/plans/2026-05-26-turnos-ux-lab.md`.

## 1. Goal

Pulir todas las superficies UX cerradas por el plan KAN-48 (wizard de agendas, sala-espera/TV display, tótem con numpad, lista de agendas) que NO recibieron iteración visual en browser, dejando el branch listo para que el usuario haga el smoke final con cambios mínimos.

## 2. Contexto

El plan KAN-48 terminó con todas las tasks implementadas y push a origin. El stepper de alta-sucursal recibió 17+ commits de pulido visual iterativo en browser durante 2026-05-27/28 — esta misma calidad de revisión NO fue aplicada a `feat/turnos-ux-lab`. Reutilizamos los aprendizajes documentados en la skill `laboratory-ui` (especialmente la tabla de reemplazo de tokens legacy de PrimeNG 21).

## 3. Scope

13 fixes agrupados en tres niveles, todos sobre LAB branch `feat/turnos-ux-lab`. **NO se tocan** sala-espera (correcto para TV display fuera del shell), `agenda-branch-section`, ni los componentes de tótem que ya usan tokens DS correctos (`totem-branch-selector`, `totem-confirmation`).

### 3.1 Bugs visuales — tokens PrimeNG 21 rotos (🔴)

Identificados con `grep` exhaustivo en `features/turnos`. Solo 3 archivos afectados. Mismo patrón que `7a69117` aplicó al day-chip de alta-sucursal.

| ID | Archivo | Líneas | Tokens rotos |
|---|---|---|---|
| TK-1 | `pages/configuracion/agenda-wizard/steps/step-periodo.component.scss` | 62-85 | `--surface-border`, `--surface-card`, `--surface-hover`, `--primary-color`, `--primary-color-text` |
| TK-2 | `pages/totem/components/totem-numpad.component.ts` (inline styles) | 34-60 | `--surface-card`, `--surface-border`, `--surface-hover`, `--primary-color`, `--primary-color-text`, `--surface-200`, `--surface-400` |
| TK-3 | `pages/totem/components/totem-input-dni.component.scss` | 22-23 | `--surface-card`, `--surface-border` |

**Tabla de reemplazo** (confirmada con `src/styles/tokens.scss`):

| Legacy (roto) | Reemplazo |
|---|---|
| `var(--surface-card)` | `#ffffff` (o `var(--ds-surface)` cuando el contexto pide fondo de panel claro, no botón) |
| `var(--surface-border)` | `#d1d5db` (gray-300, mismo que usó stepper sucursales) |
| `var(--surface-hover)` | `#f3f4f6` (gray-100) |
| `var(--surface-200)` | `#e5e7eb` (gray-200) |
| `var(--surface-400)` | `#9ca3af` (gray-400) |
| `var(--primary-color)` | `var(--brand-primary)` |
| `var(--primary-color-text)` | `var(--p-primary-contrast-color)` (= `#ffffff`) |

### 3.2 Bugs UX (🟡 funciona pero confunde)

| ID | Archivo | Síntoma | Fix |
|---|---|---|---|
| UX-1 | `steps/step-confirmar.component.html:19` | "Días: 1, 2, 3, 4, 5" en summary | Mapear array `daysOfWeek` a labels usando la constante `DAYS` (movida a shared) → "Lun, Mar, Mié, Jue, Vie" |
| UX-2 | `agenda-wizard.page.ts:133` | Modo edit muestra "Sucursal #5" | Cargar nombre real con `sucursalesService.listBranchesForSelector()` cuando hay `editingId` y matcheo del `branchId` |
| UX-3 | `configuracion-list.page.ts:71-74` | Filtro dropdown y headers del accordion muestran "Sucursal 1, 2, 3..." (IDs) | Usar `SucursalesService.listBranchesForSelector()` como fuente de nombres, joinear con el map de agendas por branchId |
| UX-4 | `configuracion-list.page.ts:87-94` | `ngOnInit` solo carga agendas de la branch del user (o id=1 hardcoded) → accordion vacío para otras sucursales | Iterar branches accesibles y dispatch `loadAgendas` por cada una |
| UX-5 | `configuracion-list.page.ts:98` → wizard | Botón "Agregar" del accordion pasa `?branchId=X` pero el wizard ignora queryParams → arranca limpio | Leer `route.snapshot.queryParamMap.get('branchId')` en wizard `ngOnInit` y pre-seleccionar |

### 3.3 Polish (🟡 mejora notable, no rompe)

| ID | Archivo | Polish |
|---|---|---|
| PL-1 | `steps/step-periodo.component.ts` | Cross-field validator: `validFrom < validTo`. Sin esto el backend rechaza con "Período inválido" tras submit. |
| PL-2 | `steps/step-horario.component.ts` | Cross-field validator: `fromTime < toTime`. Idem. |
| PL-3 | `agenda-wizard.page.ts:161-246` | El `confirm()` hace dispatch + dos `subscribe` paralelos (success / failure) sin cleanup mutuo. Si user reintenta rápido tras un error, doble toast. Reemplazar por `race(success$, failure$)` con `take(1)` único. |
| PL-4 | `agenda-wizard.page.scss:3` | `:host { padding: 1.5rem }` — verificar que el admin shell ya da 24px (mismo caso que `alta-page` resolvió en commit `c8d9ad7`). Si sí, sacar `:host` padding. |
| PL-5 | `configuracion-list.page.html:40` | Botón "Reintentar" llama `(onClick)="ngOnInit()"` (hack). Reemplazar por método explícito que dispatchee `loadAgendas` por branch. |

### 3.4 Out of scope

- Sala-espera (`pages/sala-espera/*`): colores hardcoded son correctos para TV display fuera del shell admin. Audio overlay con `sessionStorage` es UX correcta.
- Numpad styles inline en `.ts` vs files separados (desvío del plan pero funcional, sin valor de refactor).
- `agenda-branch-section.component`: ya usa tokens correctos, layout responsive con `[responsiveLayout]="'stack'"` OK.
- E2E automatizado, mobile viewport check (<540px) del wizard de agendas, smoke con browser real → el usuario los hará después.
- Cambiar el comportamiento de `audio-overlay` o agregar haptic feedback al numpad.

## 4. Acceptance criteria

1. `grep -rn 'var(--surface-\(card\|border\|hover\|200\|400\)\|--primary-color\|--primary-color-text)' src/app/features/turnos/` devuelve 0 matches.
2. `npx tsc --noEmit` pasa sin errores.
3. `npx vitest run` mantiene el mismo número de tests passing (4 tests del numpad + tests del error-mapper + cualquier test nuevo que agreguemos para los validators cross-field).
4. Branch `feat/turnos-ux-lab` queda con N commits adicionales sobre el HEAD actual `7747288`, working tree limpio.
5. NO cambios de scope: el plan KAN-48 sigue siendo la fuente de verdad de features; este spec solo cubre polish.
6. Cada fix UX o Polish va en commit separado con mensaje convencional (`fix(turnos): ...` o `feat(turnos): ...` según corresponda).

## 5. Plan de ejecución (orden)

Tres olas de commits, ejecutadas en este orden para minimizar conflictos y mantener el branch siempre verde:

1. **Ola 1 — Tokens** (TK-1, TK-2, TK-3): 1-3 commits.
2. **Ola 2 — UX bugs** (UX-1 a UX-5): 5 commits, uno por fix.
3. **Ola 3 — Polish** (PL-1 a PL-5): 5 commits, uno por fix.

Después de cada ola: `npx tsc --noEmit` + `npx vitest run`. Si rompe algo, fix antes de pasar a la siguiente ola.

## 6. Riesgos identificados

- **R1**: UX-3 / UX-4 requieren el `SucursalesService` que en step-sucursal funciona via `listBranchesForSelector()`. Si el endpoint subyacente no devuelve todas las branches accesibles al usuario actual (filtra por permisos), el accordion seguiría parcial. **Mitigación**: verificar el comportamiento del service antes de tocar; si filtra, mantener fallback al map actual y solo enriquecer nombres.
- **R2**: PL-3 (race con take(1) único) cambia el flujo de error handling. **Mitigación**: tests unitarios del wizard antes/después; manual smoke posterior del user lo confirma.
- **R3**: PL-4 (sacar `:host` padding) podría dejar el wizard pegado a los bordes si el shell de turnos NO da padding. **Mitigación**: chequear primero el shell — si no da padding, NO sacar.

## 7. No-design decisions (locked-in)

- Mantenemos el patrón full-stepper (`<p-step-item>`) del wizard de agendas. No migramos al simplified pattern usado en alta-sucursal — son 2 wizards distintos en repos/módulos distintos y la consistencia interna del módulo turnos importa más que la consistencia cross-módulo.
- Mantenemos los styles inline del numpad — funcional, no es bug.
- NO agregamos mobile viewport CSS específico al wizard de agendas: el wizard se usa en desktop admin (no mobile), confirmado por el sidebar item con `roleKey: 'ADMINISTRADOR'`.

## 8. Next steps

1. Invocar `superpowers:writing-plans` con este spec → escribe plan implementable.
2. Per regla 1 de `CLAUDE.md` del repo LAB, invocar `jira-workflow` para crear o vincular ticket (sugerido: subtarea/related de KAN-48).
3. Ejecutar plan task-by-task con `superpowers:subagent-driven-development` o directo (cada fix es localizado y testeable independientemente).
4. Push delta a `origin/feat/turnos-ux-lab`. NO abrir PR nuevo — el branch ya está pusheado, los commits delta se agregan al PR existente cuando el user lo abra.
