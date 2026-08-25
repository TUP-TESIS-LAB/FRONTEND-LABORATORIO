# Sacar el header de `ui-wizard-shell` — Design

> **Fecha:** 2026-08-24
> **Repo:** FRONTEND-LABORATORIO
> **Base:** `development` (rama a crear aparte de `fix/mantenimiento-tier2-cosmeticos`)
> **Jira:** _(pendiente — crear en jira-workflow antes de implementar)_

## 1. Objetivo

Sacar la barra de header (título `<h1>` gigante + breadcrumb manual + acciones) de
`ui-wizard-shell`, el shell compartido de wizards full-page del portal administrativo. La
tira de pasos pasa a ser lo primero que ve el usuario al entrar a cualquier wizard. Detectado
por el usuario revisando "Nueva atención": el título duplica información que ya está en el
breadcrumb automático del topbar (KAN-180) y le come alto de pantalla sin aportar nada que
los propios pasos no digan ya.

### Decisiones cerradas (brainstorming 2026-08-24)

- Se saca el título **por completo** en las 9 pantallas que usan el shell, no solo se achica.
- El breadcrumb manual (`[breadcrumb]`, texto tipo "Sucursales › Nueva") también se saca —
  es redundante con el breadcrumb automático por ruta que ya existe en el topbar (KAN-180).
- Las acciones que hoy viven en el header (solo el wizard de Atención las usa: "Volver al
  listado" y, condicional, "Cancelar atención") bajan al footer, en un **grupo nuevo a la
  izquierda**, separado del grupo de acciones primarias que ya existe a la derecha
  (Volver fase / Continuar / Finalizar / etc.) — patrón estándar: secundario/destructivo a
  la izquierda, acción primaria a la derecha.
- El badge "URGENTE" (también solo en Atención) se muestra al lado de la tira de pasos, en
  un slot nuevo — así sigue visible todo el tiempo sin afectar a los otros 8 wizards, que no
  lo usan.

## 2. Estado actual (punto de partida)

`wizard-shell.component.ts` (`src/app/shared/ui/components/wizard-shell/`) renderiza, en
este orden: `<header>` (título `h1` + slot `[headingBadge]` a la izquierda; breadcrumb +
slot `[headerActions]` a la derecha) → `ui-form-stepper-header` → slot `[wizardBanner]` →
body proyectado → `<footer>` (contador "Paso X de Y" + botones, por defecto a la derecha, o
el slot `[wizardFooter]` completo si `[customFooter]="true"`).

**9 consumidores** (`grep -rl "<ui-wizard-shell"`):

| Archivo | `heading` | `[breadcrumb]` | `[headingBadge]` / `[headerActions]` |
|---|---|---|---|
| `analitica/.../atencion-wizard.component.ts` (2 usos: creando + completo) | sí | no | **sí, único que los usa** |
| `domicilio/.../nueva-visita.page.ts` | sí | no | no |
| `financiero/.../generar-liquidacion.page.ts` | sí | no | no |
| `medicos/.../medico-form.page.ts` | sí | sí | no |
| `obras-sociales/.../obra-social-form.page.ts` | sí | sí | no |
| `pacientes/.../patient-form.page.ts` | sí | sí | no |
| `sucursales/.../sucursal-alta-stepper.page.html` | sí | sí | no |
| `sucursales/.../empleado-form.page.ts` | sí | sí | no |
| `turnos/.../agenda-wizard.page.html` | sí | sí | no |

Los 8 wizards "simples" ya resuelven su cancelación con el botón "Cancelar" del footer por
defecto del shell (no usan `[customFooter]`, o si lo usan no tienen nada en `headerActions`
hoy) — no hay contenido que reubicar en ellos, solo bindings que sacar.

## 3. Diseño

### 3.1 `wizard-shell.component.ts`

- Se saca el `<header class="wz-bar wz-bar--top ...">` completo del template.
- Se sacan los inputs `heading` (`input.required<string>()`) y `breadcrumb` (`input<string>()`).
- La tira `ui-form-stepper-header` pasa a ser el primer elemento dentro de
  `<div class="flex flex-col h-full">`. Se le agrega un slot nuevo al lado, proyectado con
  `<ng-content select="[stepperBadge]" />`, envuelto en un contenedor flex
  (`display:flex; align-items:center; gap` entre la tira de pasos y el badge) para que no
  rompa el layout de `ui-form-stepper-header` en los 8 wizards que no lo usan.
- El slot `[headingBadge]` desaparece (se reemplaza por `[stepperBadge]`); `[headerActions]`
  desaparece (se reemplaza por el nuevo `[wizardFooterLeft]` del footer, ver 3.2).
- `[wizardBanner]` y el body proyectado **no cambian**.

### 3.2 Footer con grupo izquierdo

Tanto la rama `customFooter` como la rama por defecto pasan de un solo `<div class="ml-auto
flex ...">` a dos grupos:

```html
<footer class="wz-bar wz-bar--bottom flex items-center gap-3 px-8 py-4 bg-surface-0 sticky bottom-0">
  <span class="text-xs font-medium text-surface-500">Paso {{ currentIndex() + 1 }} de {{ steps().length }}</span>

  <!-- Grupo izquierdo nuevo: secundario/destructivo. Vacío en 8 de los 9 wizards. -->
  <div class="flex items-center gap-2">
    <ng-content select="[wizardFooterLeft]" />
  </div>

  @if (customFooter()) {
    <div class="ml-auto flex items-center gap-3">
      <ng-content select="[wizardFooter]" />
    </div>
  } @else {
    <div class="ml-auto flex flex-row-reverse gap-2"> <!-- igual que hoy --> </div>
  }
</footer>
```

El grupo izquierdo va vacío (sin contenido proyectado) en los 8 wizards que no usan
`[wizardFooterLeft]` — no ocupa espacio visible si `<ng-content>` no proyecta nada.

### 3.3 Consumidores

- **Los 8 simples:** se les saca `heading="..."` y `[breadcrumb]="..."` (o el binding fijo)
  de su `<ui-wizard-shell>`. Ningún otro cambio.
- **`atencion-wizard.component.ts`** (2 bloques — modo "creando" y modo completo):
  - Modo "creando" (línea ~100-120): se saca `heading="Nueva atención"`; el bloque
    `<div headerActions><p-button label="Volver al listado" .../></div>` pasa a
    `<div wizardFooterLeft>` dentro del `[wizardFooter]` existente.
  - Modo completo (línea ~139-160): se saca `[heading]="'Atención ' + headerTitle()"`; el
    `<p-tag headingBadge value="URGENTE" .../>` pasa a `[stepperBadge]`; el bloque
    `<div headerActions>` (Volver al listado + Cancelar atención condicional) pasa a
    `<div wizardFooterLeft>` dentro del `[wizardFooter]` existente, junto con el resto de
    los botones de footer que ya arma ese `@switch (uiStep()?.key)`.

## 4. Testing

- `wizard-shell.component.spec.ts`: los tests que cubren `headingBadge`/`headerActions` (y
  cualquiera que asuma la existencia del `<header>`) se reescriben para los slots nuevos
  (`stepperBadge`, `wizardFooterLeft`) y para confirmar que el `<header>` ya no se renderiza.
- `atencion-wizard.component.spec.ts`: el test que busca el botón "Cancelar atención" por
  texto (`find(b => b.textContent?.includes('Cancelar atención'))`) no debería necesitar
  cambios — no depende de dónde vive el botón en el DOM, solo de su texto.
- Los specs de los otros 8 wizards (`empleado-form.page.spec.ts`,
  `generar-liquidacion.page.spec.ts`, `nueva-visita.page.spec.ts`) no deberían verse
  afectados — ninguno testea el `heading`/`breadcrumb` que se saca.
- Verificación visual con Playwright (como el resto de este PR): las 9 pantallas, antes/después
  — confirmar que el stepper queda arriba de todo, que el footer izquierdo de Atención se ve
  bien con y sin "Cancelar atención" visible, y que el badge URGENTE se ve al lado de la tira
  de pasos.

## 5. Fuera de alcance

- No se toca el contenido de `[wizardBanner]` (banners de pendientes / solo-lectura de
  Atención) — sigue exactamente donde está, debajo del stepper.
- No se rediseña la tira de pasos (`ui-form-stepper-header`) en sí misma.
- No se re-evalúa el `[maxWidth]` ni el resto de los inputs del shell.
