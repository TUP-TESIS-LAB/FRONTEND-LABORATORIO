# Stepper de alta de sucursal — uniformidad y pulidos

**Fecha:** 2026-05-27
**Branch base:** `feat/sucursales-back-office`
**Tipo:** UX polish (CSS + template, lógica nueva mínima: 1 output `cancel` en step 1)
**Jira:** TBD (crear al pasar a plan)

---

## Contexto

El stepper de alta de sucursal (`/sucursales/configuracion/nueva`) tuvo ~10 commits de iteración visual hoy (2026-05-27). El último arregló las líneas separadoras pero los pasos siguen sin distribuirse uniformemente: como cada `.p-stepitem` usa `flex: 1 1 0` con títulos `white-space: nowrap`, los títulos largos ("Workspaces", "Contactos", "Confirmar") empujan sus columnas y rompen la uniformidad. Como las líneas se calculan en `%` del item, también quedan desparejas.

Aprovechando que estamos repasando el header, hacemos un barrido visual completo de los 6 step components para cerrar los pulidos pendientes antes del PR de `feat/sucursales-back-office`.

## Objetivo

Cerrar el polish visual del flujo de alta de sucursal en un solo PR, dejando:
- Header del stepper con columnas matemáticamente uniformes.
- Cada step con copy, layout y micro-interacciones consistentes entre sí.
- Una clase utilitaria local repetida (`.muted`) migrada a la utility global existente; el resto de la deduplicación SCSS queda como deferred (necesita diseño primero a nivel sistema).

## No-objetivos

Los siguientes quedan fuera de este spec (ya documentados como deferred del refactor original):
- Refactor del legacy `SucursalesPageComponent` (plural store `sucursales.*`).
- Specs component-level para los 18 step/tab/panel/page nuevos.
- Reorganización de constants `DAY/CONTACT/SCHEDULE` duplicadas entre step y tab components.

## Cambios

### Header del stepper · `sucursal-alta-stepper.page.{html,scss}`

1. **Uniformidad geométrica.** Reemplazar el flex de `.p-steplist` por `display: grid; grid-template-columns: repeat(6, minmax(0, 1fr))`. Eliminar `justify-content: space-between` y `flex: 1 1 0` del stepitem (innecesarios en grid). El `min-width: 0` se preserva implícitamente por `minmax(0, 1fr)`.
2. **Ellipsis en títulos.** Aplicar `overflow: hidden; text-overflow: ellipsis; max-width: 100%` al `.p-step-title` para garantizar que no rompa la grilla aún si el contenido excede.
3. **Tooltips en pasos disabled.** Cuando `branchId() == null`, los pasos 2-6 quedan grisados. Agregar `pTooltip="Guardá los datos básicos primero"` con `tooltipPosition="bottom"` a los `p-step` con `[disabled]="branchId() == null"`. Importar `TooltipModule` en el componente page si no está ya.
4. **Mobile.** Mantener `@media (max-width: 540px) { .p-step-title { display: none; } }`. No requiere cambios.

### Step 1 — Datos básicos · `datos-step.component.{html,ts,scss}`

1. **Bug: placeholder confuso.** En el input `description`, cambiar `placeholder="Nombre de la sucursal"` por `placeholder="Ej: Sucursal central de zona norte"`. Quedó del refactor "Código → Nombre" del commit `c97d3e6`.
2. **Eliminar campo `status` del form.** Quien crea una sucursal nueva la quiere activa por default; toggleo posterior se hace desde el detalle (tab Configuración, ya existente). Acciones:
   - Quitar el `<div class="form-field">` del select Status del template.
   - En el FormGroup, eliminar el control `status` o defaultearlo a `'ACTIVE'` sin exponerlo en la UI.
   - Eliminar `statusOptions` del componente.
3. **Footer simétrico.** Agregar botón "Cancelar" a la izquierda del footer en step 1 (`severity="secondary"`, sin ícono). Cablearlo vía un nuevo `@Output() cancel` que el page padre conecta a su método `cancel()` ya existente (`sucursal-alta-stepper.page.ts:72-74`, navega a `/sucursales/configuracion`). El back del header del page (flecha izquierda arriba) se conserva — hace exactamente lo mismo. El footer del step 1 queda `<Cancelar> ... <Siguiente>` consistente con steps 2-5.
4. **Copy.** No tocar el "(opcional)" del fieldset Dirección — está bien diferenciar required vs opcional con esa marca.

### Step 2 — Horarios · `horarios-step.component.{html,scss}`

1. **Tabla sin scroll interno.** Eliminar `[scrollable]="true"` y `scrollHeight="16rem"` de la `p-table`. El scroll lo maneja `.step-content` del page (que ya tiene `overflow-y: auto`). Esto elimina el doble scroll en viewports chicos.
2. **Tooltip en Tipo.** Agregar `pTooltip` al select Tipo con: "FULL_DAY: jornada completa. MORNING: solo mañana. AFTERNOON: solo tarde. NIGHT: turno noche."
3. **Day chips:** sin cambio (2.5rem está bien, ningún feedback negativo).

### Step 3 — Contactos · `contactos-step.component.{html,scss}`

1. **Tabla sin scroll interno.** Eliminar `[scrollable]="true"` y `scrollHeight="20rem"`. Igual que Horarios.
2. **Botón Agregar.** Agregar `label="Agregar"` al `<p-button icon="pi pi-plus">` para consistencia con Horarios.

### Step 4 — Workspaces · `workspaces-step.component.html`

1. **Jerarquía empty state CTA.** El botón "Saltar este paso" pasa a `[text]="true"` (queda como link plano), dejando "Ir al catálogo" como acción primaria visualmente.
2. **Botón Agregar.** Agregar `label="Agregar"` al `<p-button icon="pi pi-plus">`.

### Step 5 — Tótem · `totem-step.component.{html,scss}`

1. **Centrado vertical.** Wrappear `.big-switch` en un contenedor `.totem-content-center` con `display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; min-height: 12rem` para que el switch quede centrado en el espacio del step en vez de pegado arriba.
2. **Copy más conciso.** Reemplazar las dos oraciones largas por: "Habilitá el tótem para aceptar walk-ins (pacientes sin turno previo). Sin él, recepción muestra solo turnos agendados."
3. **Helper text en estado deshabilitado.** Cuando `enabled() === false`, mostrar debajo del switch un `<p class="helper-text">Podés activarlo más tarde desde la configuración de la sucursal.</p>` con `font-size: 0.8125rem; color: var(--text-color-secondary)`.

### Step 6 — Confirmar · `confirmar-step.component.{html,scss}`

1. **Card Tótem inline.** Reemplazar el layout actual (`<p>` + `<p-button>` stacked) por una sola línea: `<div class="totem-summary">` con ícono + texto + botón "Editar" (text, severity secondary, size small) alineados horizontalmente. Mismo footprint que las otras cards.
2. **Empty states con aire.** Aumentar `.empty-section { gap: 0.5rem }` → `gap: 1rem` para mejor respiración entre el texto "Sin X cargados" y el botón "Ir a X".
3. **Label Código → Nombre.** En el data-list de Datos básicos, cambiar `<dt>Código</dt>` por `<dt>Nombre</dt>` para coincidir con el label del input en step 1.

### Transversal · usar utilities globales existentes

El repo ya tiene utilities globales en `src/styles/utilities.scss` (prefijo `ui-*` + BEM `pat-form__*`). Hay una utility que mapea 1:1 a una clase local repetida en los 6 steps:

- `.muted` (definida en los 6 step.scss) → reemplazar el `class="muted"` del template por `class="ui-text-muted"` y eliminar la definición local de `.muted`.

Para `.form-field`, `.form-error`, `.step-footer`: las definiciones locales tienen variaciones por step (`gap` distinto, `margin-top` distinto, `font-size` distinto). El patrón global `pat-form__*` existe pero está pensado para formularios anidados en cards (tiene padding/border/sticky footer que acá no aplican). Migrarlas implicaría:
- O agregar overrides locales que destruyen el valor de la utility.
- O crear una utility nueva más genérica (cambio de scope al sistema de estilos, fuera de este PR).

**Decisión:** dejar `.form-field`, `.form-error`, `.step-footer` como están (duplicadas) y anotarlo como deferred en el spec. Mover solo `.muted` a la utility global.

### Deferred (no en este PR)

- Refactor de `.form-field`, `.form-error`, `.step-footer` a utility global compartida — requiere primero diseñar la utility genérica en `src/styles/utilities.scss` y migrar también los consumidores actuales (`pat-form__*`, `empresa`, etc.) para mantener consistencia.

## Cómo probar

Smoke manual end-to-end del wizard, en este orden y verificando cada punto:

1. Abrir `/sucursales/configuracion/nueva` con la sucursal sin crear todavía.
2. Verificar: header con 6 columnas iguales, líneas de igual largo, pasos 2-6 grisados con tooltip al hover "Guardá los datos básicos primero".
3. Step 1: confirmar que `status` no aparece, placeholder de descripción es nuevo, footer tiene `Cancelar` izquierda y `Siguiente` derecha.
4. Avanzar a step 2 → verificar tabla sin doble scroll, tooltip en Tipo al hover.
5. Step 3 → tabla sin doble scroll, botón con label "Agregar".
6. Step 4 (con áreas vacías) → "Saltar este paso" como link plano; (con áreas) → botón con label.
7. Step 5 → switch centrado vertical, copy nuevo, helper text aparece al deshabilitar.
8. Step 6 → card Tótem en una línea, label "Nombre" en datos básicos, empty states con aire.
9. Redimensionar a `<540px` → títulos del header desaparecen, solo números. Resto del layout se acomoda.

Sin tests automatizados nuevos: cambios son CSS/template sin lógica, los specs existentes de componente cubren la lógica del form que sí se mantiene.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.scss` | Grid header + ellipsis título |
| `pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.{html,ts}` | Tooltips disabled, import TooltipModule, output cancel propagado a step 1 |
| `steps/datos-step.component.{html,ts,scss}` | Placeholder, quitar status, footer Cancelar |
| `steps/horarios-step.component.{html,scss}` | Quitar scroll interno, tooltip Tipo |
| `steps/contactos-step.component.{html,scss}` | Quitar scroll interno, label Agregar |
| `steps/workspaces-step.component.html` | Saltar como text button, label Agregar |
| `steps/totem-step.component.{html,scss}` | Centrar vertical, copy, helper text |
| `steps/confirmar-step.component.{html,scss}` | Card Tótem inline, gap empty, "Nombre" |
| Todos los `steps/*-step.component.{html,scss}` | Reemplazar `class="muted"` por `class="ui-text-muted"` en templates; eliminar `.muted` local de los 6 .scss |

## Riesgos y mitigaciones

- **PrimeNG 21 grid + pseudo-elements:** las líneas se siguen dibujando con `::after` posicionado absoluto sobre el `.p-stepitem`. Con grid las columnas tienen ancho fijo (1fr cada una), así que los cálculos `left: calc(50% + 1.5rem)` + `width: calc(100% - 3rem)` siguen siendo válidos. **Mitigación:** smoke visual antes de mergear.
- **Quitar `[scrollable]` de las p-tables:** si el contenedor padre `.step-content` no scrollea correctamente en tablets con muchos horarios cargados, podríamos perder usabilidad. **Mitigación:** probar con ≥15 horarios cargados en viewport tablet; si falla, conservar scrollHeight pero con valor `max-height: clamp(12rem, 40vh, 24rem)` en vez de fijo.
- **Output `cancel` nuevo en datos-step:** el page padre ya tiene `cancel()` definido (`sucursal-alta-stepper.page.ts:72`). Cablear el nuevo output al método existente, no duplicar lógica de navegación.
- **`.ui-text-muted` puede tener color distinto a `.muted` local:** `.muted` local usa `var(--text-color-secondary)`, `.ui-text-muted` usa `var(--ds-text-muted)`. Si visualmente difieren, ajustar el token global antes de migrar (probable que sean equivalentes, pero verificar smoke).
