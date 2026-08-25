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
- El footer pasa a tener **3 zonas**: izquierda (nueva, secundario/destructivo), **centro**
  (nueva, para el badge "URGENTE" — solo Atención lo usa), derecha (la que ya existe).
- El texto "Paso X de Y" que hoy vive a la izquierda del footer **se saca** — es redundante
  con la tira de pasos, que ya marca visualmente en qué paso está el usuario.
- El badge "URGENTE" (solo Atención) se muestra **centrado en el footer**, no al lado de la
  tira de pasos.
- El código del paciente (`"Atención ST-001"` / `"Atención A-001"`, hoy parte del título
  dinámico de Atención) **se pierde por completo** — no se reubica en ningún lado. El
  computed `headerTitle()` que lo arma queda sin ningún consumidor y se saca junto con el
  binding, junto con los 3 tests que lo cubren directamente (ver sección 4).

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
  `<div class="flex flex-col h-full">`, sin nada al lado.
- Los slots `[headingBadge]` y `[headerActions]` desaparecen del header (que ya no existe).
  Se reemplazan por los slots nuevos del footer (ver 3.2): `[wizardFooterLeft]` y
  `[wizardFooterCenter]`.
- `[wizardBanner]` y el body proyectado **no cambian**.

### 3.2 Footer de 3 zonas, sin el contador de paso

Tanto la rama `customFooter` como la rama por defecto pasan del layout actual (contador +
un solo `<div class="ml-auto ...">`) a 3 zonas — izquierda, centro, derecha — sin contador:

```html
<footer class="wz-bar wz-bar--bottom flex items-center gap-3 px-8 py-4 bg-surface-0 sticky bottom-0">
  <!-- Zona izquierda: secundario/destructivo. Vacía en 8 de los 9 wizards. -->
  <div class="flex items-center gap-2">
    <ng-content select="[wizardFooterLeft]" />
  </div>

  <!-- Zona centro: badges (URGENTE). Vacía en 8 de los 9 wizards. -->
  <div class="flex-1 flex items-center justify-center gap-2">
    <ng-content select="[wizardFooterCenter]" />
  </div>

  @if (customFooter()) {
    <div class="flex items-center gap-3">
      <ng-content select="[wizardFooter]" />
    </div>
  } @else {
    <div class="flex flex-row-reverse gap-2"> <!-- igual que hoy --> </div>
  }
</footer>
```

El `flex-1` de la zona centro empuja la zona derecha al borde (reemplaza al `ml-auto` que
tenía antes esa zona). Las zonas izquierda y centro van vacías (sin ocupar espacio visible)
en los 8 wizards que no proyectan nada en esos slots.

### 3.3 Consumidores

- **Los 8 simples:** se les saca `heading="..."` y `[breadcrumb]="..."` (o el binding fijo)
  de su `<ui-wizard-shell>`. Ningún otro cambio.
- **`atencion-wizard.component.ts`** (2 bloques — modo "creando" y modo completo):
  - Modo "creando" (línea ~100-120): se saca `heading="Nueva atención"`; el bloque
    `<div headerActions><p-button label="Volver al listado" .../></div>` pasa a
    `<div wizardFooterLeft>` dentro del `[wizardFooter]` existente.
  - Modo completo (línea ~139-160): se saca `[heading]="'Atención ' + headerTitle()"` (y el
    computed `headerTitle()` en sí, que queda sin consumidor); el
    `<p-tag headingBadge value="URGENTE" .../>` pasa a `<p-tag wizardFooterCenter value="URGENTE" .../>`;
    el bloque `<div headerActions>` (Volver al listado + Cancelar atención condicional) pasa
    a `<div wizardFooterLeft>` dentro del `[wizardFooter]` existente, junto con el resto de
    los botones de footer que ya arma ese `@switch (uiStep()?.key)`.

## 4. Testing

- `wizard-shell.component.spec.ts`: los 3 tests existentes asumen `<header>`/`h1` y los
  slots viejos — se reescriben para los slots nuevos (`wizardFooterLeft`,
  `wizardFooterCenter`) y para confirmar que `<header>` y `h1` ya no existen en el DOM.
- `atencion-wizard.component.spec.ts`, cambios puntuales:
  - **C6** (3 tests: título con publicCode, fallback a attentionNumber, publicCode en
    blanco) — se **borran**: testean `headerTitle()` y el `<h1>`, ninguno de los dos existe
    más.
  - **C2** (2 tests: "con isUrgent el header muestra URGENTE" / "sin isUrgent no lo
    muestra") — se reescriben para no depender de `querySelector('header')` (ya no existe);
    en su lugar buscan el tag por `data-testid` o por texto en todo `fixture.nativeElement`.
  - **C3** ("el header NO muestra el subtítulo...") — se **borra**: ya no hay `<header>`
    que revisar, y el subtítulo que negaba tampoco existe en ningún lado nuevo.
  - **NEW-D** ("el botón 'Volver al listado' se renderiza en el header") — el nombre del
    `it()` queda desactualizado (ya no vive "en el header") pero el assert en sí
    (`querySelectorAll('button')` sobre todo el fixture) sigue siendo válido tal cual —
    se renombra el `it()` a "...se renderiza en el footer" sin tocar el cuerpo.
  - El test de "Cancelar atención" (línea ~268) no necesita cambios — mismo criterio.
- Los specs de los otros 8 wizards (`empleado-form.page.spec.ts`,
  `generar-liquidacion.page.spec.ts`, `nueva-visita.page.spec.ts`) no deberían verse
  afectados — ninguno testea el `heading`/`breadcrumb` que se saca.
- Verificación visual con Playwright (como el resto de este PR): las 9 pantallas,
  antes/después — confirmar que el stepper queda arriba de todo, que el footer de Atención
  se ve bien con sus 3 zonas (con y sin "Cancelar atención" / "URGENTE" visibles), y que no
  quedó ningún resto del `<header>` ni del contador "Paso X de Y" en ninguna pantalla.

## 5. Fuera de alcance

- No se toca el contenido de `[wizardBanner]` (banners de pendientes / solo-lectura de
  Atención) — sigue exactamente donde está, debajo del stepper.
- No se rediseña la tira de pasos (`ui-form-stepper-header`) en sí misma.
- No se re-evalúa el `[maxWidth]` ni el resto de los inputs del shell.
