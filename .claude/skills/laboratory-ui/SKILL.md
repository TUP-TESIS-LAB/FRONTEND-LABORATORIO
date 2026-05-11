---
name: laboratory-ui
description: >
  Design system y guía de componentes UI white-label para una aplicación SaaS de portales
  de laboratorios clínicos (administrativo y de pacientes). Cada laboratorio cliente es un
  tenant con su propia identidad visual (paleta + logo). Usar SIEMPRE que se pida crear,
  modificar, revisar o generar cualquier componente, pantalla, layout o estilo visual del
  proyecto. Aplica para cualquier tarea de Angular/PrimeNG, aunque el usuario no lo mencione
  explícitamente: si hay contexto de "portal", "secretaría", "paciente", "turno", "análisis",
  "estudio", "PWA", "responsive", "mobile", "tenant", "white-label", o cualquier mención
  visual/UI, esta skill es obligatoria. La skill cubre ÚNICAMENTE diseño y componentes —
  autenticación, arquitectura, HTTP y manejo de estado quedan fuera de alcance. No generar
  código UI sin leer esta skill primero.
---

# Laboratory UI — Design System multi-tenant white-label

Stack: **Angular 17+ standalone + PrimeNG v17 + SCSS**.
Distribución: **PWA instalable**, una sola base de código que renderiza dos experiencias distintas según breakpoint:
mobile se siente como app nativa (bottom nav, full screen), desktop se ve como portal web clásico (sidebar).

**Contexto del producto:** SaaS para laboratorios clínicos. Cada laboratorio cliente (tenant) personaliza su instancia con su propia paleta de colores y logo, pero el comportamiento, layout y componentes son idénticos para garantizar consistencia y velocidad de evolución del producto.

**Alcance de esta skill:** únicamente diseño visual y componentes UI. Garantiza que toda la app tenga la misma apariencia y comportamiento de componentes en todos los tenants. Auth, arquitectura, servicios HTTP, guards, manejo de estado y errores **están fuera del alcance** y deben resolverse en otras skills/decisiones del equipo.

> **Datos en componentes UI.** Cualquier dato que venga del backend (listas de turnos, pacientes, estudios, etc.) llega al componente **siempre vía `store.selectSignal(...)` según `ngrx-backend-request`**. Esta skill describe cómo se ven y comportan los componentes; nunca cómo se traen los datos. Si un patrón visual de esta skill muestra una lista o un detalle, asumir que el array o el objeto entró al componente como signal del store, no como `Observable` ni vía `resource()`.

---

## 1. White-label — qué es configurable por tenant

El sistema soporta múltiples marcas (tenants) con personalización limitada y controlada.

**Configurable por tenant:**
- Tres colores de marca: `--brand-primary`, `--brand-secondary`, `--brand-accent`
- Logo (URL de imagen)

**Fijo para todos los tenants (no se toca):**
- Colores neutros (grises, fondos, texto)
- Colores de estado (success, danger, warning, info)
- Tipografía (Montserrat)
- Espaciado, radios, sombras, breakpoints
- Layout y comportamiento de componentes

Esto significa que el tenant puede tener su identidad visual reconocible (logo + 3 colores) pero la consistencia del producto, la legibilidad y la accesibilidad están garantizadas por las decisiones fijas del DS.

Detalle de implementación de theming en `references/tokens.md`.

---

## 2. Filosofía adaptativa (regla central)

**Mismo código, dos experiencias.** Toda pantalla tiene que funcionar tanto en celular como en desktop sin scroll horizontal, sin elementos cortados, y respetando la convención de cada plataforma.

| Rango          | Etiqueta  | Experiencia                                                       |
|----------------|-----------|-------------------------------------------------------------------|
| `< 768px`      | mobile    | App-like: bottom nav, drawer en lugar de sidebar, full-bleed      |
| `768–1023px`   | tablet    | Híbrido: top nav, contenido centrado, drawer opcional             |
| `≥ 1024px`     | desktop   | Portal: sidebar fija + topbar + content area                      |

**Reglas no negociables que aplican siempre:**
- Mobile-first en SCSS: estilos base son mobile, `@media` agregan desktop.
- Touch targets mínimos `48px × 48px` en cualquier elemento clickeable visible en mobile.
- Respetar safe areas con `env(safe-area-inset-*)` en headers y bottom nav.
- En mobile, los modales (`p-dialog`) ocupan pantalla completa; en desktop son centrados con ancho fijo.
- Ninguna tabla densa (`p-table` clásica) se renderiza tal cual en mobile: se transforma en lista de cards.
- El sidebar del admin se reemplaza por un `p-drawer` (off-canvas) en mobile.

---

## 3. Tokens (resumen)

Detalle completo en `references/tokens.md`.

### Variables de marca (configurables por tenant)
| Token                | Default placeholder | Uso                                       |
|----------------------|--------------------|-------------------------------------------|
| `--brand-primary`    | `#2563EB` (azul)   | Navbar, headers, botones primarios        |
| `--brand-secondary`  | `#0EA5A4` (teal)   | Acentos, badges activos, links            |
| `--brand-accent`     | `#F97316` (naranja)| CTAs secundarios, hover states            |

Los valores default son neutros y solo existen para que la app no se rompa si arranca sin un tenant configurado. **Toda instancia productiva debe inyectar la paleta del tenant correspondiente.**

### Variables fijas (no se cambian entre tenants)
| Token                  | Valor        | Uso                                      |
|------------------------|-------------|------------------------------------------|
| `--ds-success`         | `#22C55E`   | Estados de éxito                          |
| `--ds-danger`          | `#e23a47`   | Errores, alertas críticas                 |
| `--ds-warning`         | `#F59E0B`   | Advertencias                              |
| `--ds-info`            | `#3B82F6`   | Información                               |
| `--ds-surface`         | `#EEF0F4`   | Fondos de cards, filas alternas          |
| `--ds-bg`              | `#F7F8FA`   | Fondo general de página                  |
| `--ds-text`            | `#1A1A2E`   | Texto principal                           |
| `--ds-text-muted`      | `#6B7280`   | Labels, texto secundario                  |
| Font family            | `Montserrat` | Todos los textos                         |
| `--ds-touch-target`    | `48px`      | Tamaño mínimo de elementos clickeables    |
| `--ds-bottom-nav-h`    | `64px`      | Altura de bottom nav en mobile            |
| `--ds-sidebar-w`       | `260px`     | Ancho de sidebar desktop                  |
| `--ds-topbar-h`        | `64px`      | Altura de topbar                          |

### Convención de prefijos
- `--brand-*` → variables configurables por tenant.
- `--ds-*` → variables fijas del design system (colores neutros, estados, tipografía, dimensiones, sombras).
- `--space-*` y `--z-*` → escalas universales sin prefijo (excepción por legibilidad y convención de mercado).
- `--p-*` → overrides directos de PrimeNG.
- `.ui-*` → clases CSS de componentes y utilidades del design system.

**Las clases CSS nunca llevan referencia a un tenant específico.** Una clase como `.acme-card` o `.tenant-button` rompería el white-label: se usa siempre `.ui-card`.

---

## 4. Arquitectura visual de portales

### Portal Administrativo (secretaría)
- Módulos típicos: Pacientes, Turnos, Órdenes/Análisis, Resultados, Reportes
- Layout desktop: sidebar fija + topbar + content area
- Layout mobile: topbar con hamburguesa que abre `p-drawer` lateral + content full

### Portal Paciente
- Módulos típicos: Inicio, Mis Turnos, Mis Estudios, Mi Perfil
- Layout desktop: topbar + content centrado (max-width 1200px) + nav horizontal en topbar
- Layout mobile: topbar mínimo + content full + **bottom navigation bar** con 4 ítems

---

## 5. PWA — convenciones visuales

La skill no cubre el setup técnico de PWA (eso es decisión arquitectónica), pero sí las convenciones visuales que toda app PWA del proyecto debe respetar:

- `<meta name="theme-color" content="var(--brand-primary)">` se inyecta dinámicamente según el tenant.
- Splash screen con color de fondo `--brand-primary` y logo del tenant centrado.
- Ningún elemento crítico se posiciona en los primeros 24px superiores ni los últimos 34px inferiores en mobile (notch / home indicator).
- Safe areas obligatorias en topbar (top) y bottom nav (bottom) con `env(safe-area-inset-*)`.

---

## 6. Layout base — componentes shell

### Shell Administrativo

```html
<ui-admin-shell>
  <ui-sidebar class="ui-show-desktop" />

  <p-drawer [(visible)]="drawerOpen" position="left">
    <ui-sidebar (itemClick)="drawerOpen = false" />
  </p-drawer>

  <main class="ui-content">
    <ui-topbar (menuToggle)="drawerOpen = !drawerOpen" />
    <router-outlet />
  </main>
</ui-admin-shell>
```

### Shell Paciente

```html
<ui-patient-shell>
  <ui-patient-topbar />
  <main class="ui-patient-content">
    <router-outlet />
  </main>
  <ui-bottom-nav class="ui-show-mobile" />
</ui-patient-shell>
```

---

## 7. Componentes PrimeNG — convenciones de uso

Catálogo completo en `references/components.md`.

### Reglas generales
- **Formularios:** siempre **Reactive Forms** (`FormBuilder`, `FormGroup`, `formControlName`). `ngModel` solo se permite en filtros de UI sin validación ni submit (búsquedas, selectores de vista).
- **Botones:** `p-button` con `severity` mapeado a tokens. Nunca botones HTML planos. Tamaño mínimo `48×48` en mobile.
- **Tablas:** `p-table` con `stripedRows`, `[paginator]="true"`, `[rows]="15"`. **En mobile se reemplaza por lista de cards** (patrón "tabla adaptativa").
- **Inputs:** `p-floatlabel` + componente PrimeNG. Inputs de mínimo 48px de alto en mobile, con `inputmode` y `autocomplete` correctos.
- **Modales:** `p-dialog` con `[modal]="true"`, `[draggable]="false"`. **En mobile usar `[breakpoints]="{ '768px': '100vw' }"` y `styleClass="ui-dialog-fullscreen-mobile"`**.
- **Notificaciones:** `p-toast` con posición `top-right` en desktop, `top-center` en mobile.
- **Confirmaciones destructivas:** `p-confirmDialog` obligatorio antes de eliminar/cancelar.
- **Loading states:** `p-skeleton` para listas/tablas; `p-progressSpinner` para acciones puntuales.
- **Bottom navigation (mobile, paciente):** componente custom, fixed bottom, máximo 4 ítems, íconos PrimeIcons + label corto.
- **FAB:** botón circular `p-button [rounded]="true"` posicionado en esquina inferior derecha en mobile, respetando safe area + altura del bottom nav.

### Severities de botón mapeadas
```scss
// p-button:
// primary   → --brand-primary
// secondary → --brand-secondary
// warning   → --brand-accent (no es warning de estado, es CTA secundario destacado)
// danger    → --ds-danger
// text      → sin fondo, color --brand-primary
```

**Importante:** la severity `warning` del botón usa el color de marca (`--brand-accent`), no el `--ds-warning` (que es para tags de estado). Los colores de estado son para señalización informativa, no para acciones.

---

## 8. Tipografía y espaciado

```scss
// Headings (fluidos)
h1: Montserrat clamp(22px, 4vw, 28px) 700
h2: Montserrat clamp(18px, 3vw, 22px) 600
h3: Montserrat 18px 600
h4: Montserrat 16px 600

// Body
body:  Montserrat 14px 400
small: Montserrat 12px 400
label: Montserrat 12px 500 uppercase letter-spacing: 0.5px

// Spacing scale (múltiplos de 4)
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
--space-5: 20px; --space-6: 24px; --space-8: 32px;  --space-10: 40px;
--space-12: 48px;

// Padding de content adaptativo
// Mobile: var(--space-4) — 16px laterales
// Desktop: var(--space-6) — 24px laterales
```

---

## 9. Patrones reutilizables (sin sesgo de dominio)

Estos son los patrones genéricos que el design system soporta. **No son pantallas armadas**, son combinaciones recurrentes de componentes que pueden aplicarse a cualquier feature. La decisión de qué patrón usar y cómo armarlo es del producto, no de la skill.

### Listado de entidades
Para cualquier vista que muestre una colección (pacientes, turnos, órdenes, sedes, etc.):
- **Desktop:** `p-table` con columnas relevantes + acciones inline en la última columna.
- **Mobile:** lista de cards (`ui-list-card`) con la información esencial + chevron.
- Búsqueda: `p-iconField` arriba (sticky en mobile).
- Filtros: `p-toolbar` en desktop / `p-drawer` lateral en mobile.

### Formulario de creación o edición

El patrón depende del **dominio de la operación**, no del conteo de campos.

**Drawer lateral de ~50% (`p-drawer position="left"`)** — para crear o editar UNA entidad atómica con campos directamente suyos. Ejemplos: Paciente, Sucursal, Área, Usuario, Rol, Médico derivante, Obra Social, Insumo, configuración del tenant, plantilla de notificación. El payload del backend es un objeto plano (o con un par de IDs de relación). El usuario está editando una "ficha".

**Full-page con stepper (`/feature/nuevo`)** — para componer una TRANSACCIÓN que ata múltiples entidades en un solo evento de negocio. Ejemplos: Registrar llegada (paciente + turno + estudios + cobro), Nuevo turno (paciente + horario + estudios + médico derivante), Carga de protocolo (muestra + estudios + área), Cierre de caja, Facturación. El payload es un aggregate (root + colecciones anidadas). El usuario está armando un caso, no editando una ficha.

**Regla práctica:** si el endpoint termina en `POST /<entidad>` con un body simple → drawer. Si arma `POST /<evento>` con arrays anidados, o si requiere lookup/creación inline de entidades relacionadas (ej: crear un paciente en el medio del alta de un turno) → stepper full-page.

#### Drawer — mecánicas obligatorias

- `p-drawer position="left"`, `[modal]="true"`, `[dismissable]="true"`.
- Ancho: `styleClass="ui-drawer-half"` → en desktop `width: 50vw; min-width: 480px; max-width: 720px`; en mobile `width: 100vw`.
- Header sticky con título + botón cerrar (X).
- Footer sticky abajo con `Cancelar` (secondary) + `Guardar`/`Crear` (primary). Submit por `Enter` cuando aplique.
- `Esc` cierra (PrimeNG lo provee; no override).
- Reactive Forms siempre. Validación on blur + on submit.
- Skeleton mientras se cargan datos en edición.

#### Stepper full-page — mecánicas obligatorias

- Ruta dedicada (`/feature/nuevo`, `/feature/:id/editar` si la edición también es compleja).
- Header con botón "Atrás" + título "Paso N de M".
- `p-progressBar` o stepper visual arriba.
- Body scrolleable, `max-width: 720px`, centrado.
- Footer sticky con `Volver` + `Continuar` (o `Confirmar` en el último paso).
- Validar solo el step actual antes de avanzar.
- El estado del wizard se mantiene en memoria mientras dure la navegación; perderlo al salir es aceptable.
- Confirmación si el usuario intenta salir con cambios sin guardar.

### Card expandible (acordeón)
Para listas de items con detalle opcional:
- Header con título + metadata + estado + chevron.
- Body se muestra solo si está expandido.
- Útil cuando hay muchos items y solo algunos requieren ver detalle.

### Hero card destacada
Para resaltar un dato/acción crítica al inicio de una pantalla:
- Fondo con gradient `linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))`.
- Texto blanco, bordes redondeados grandes.
- Solo una hero card por pantalla — pierde fuerza si se usan varias.

### Grid de stat cards
Para mostrar métricas resumen:
- Mobile: 2 columnas. Desktop: 3-4 columnas.
- Cada card con `border-left` de color (puede usar `--brand-*` o `--ds-*` según semántica).
- Componente: `ui-stat-card` con `__label` `__value` `__sub`.

### Sección de datos en formato `<dl>`
Para mostrar datos clave-valor (perfil, info de contacto, metadata):
- Desktop: 2 columnas con `grid-template-columns: 120px 1fr`.
- Mobile: stack vertical con label arriba en mayúsculas pequeñas + value abajo.

### Layout de detalle (master-detail)
Para pantallas que muestran una entidad y sus relaciones:
- Header con identidad de la entidad (avatar/título/metadata + botón editar).
- Tabs (`p-tabs`) para separar secciones relacionadas.

### Tags de estado
- `p-tag` con `styleClass="ui-tag-{estado}"`.
- Los colores de estado vienen de `--ds-*` (success, warning, danger, info), nunca de `--brand-*`.
- Convención de nombres en kebab-case en inglés o español según el proyecto, consistente.

### Wizard de pasos
- Header con botón atrás + título "Paso N de M".
- `p-progressBar` arriba.
- Contenido scrolleable.
- Footer con botón continuar/confirmar full-width en mobile.
- Validar solo el step actual antes de avanzar.

### Empty state
Cuando una lista o sección no tiene contenido:
- Ícono PrimeIcons grande (`--ds-text-muted`).
- Heading corto descriptivo.
- Texto explicativo (1-2 líneas, máx 320px de ancho).
- Botón CTA si hay acción posible.

---

## 10. Estados vacíos

Siempre mostrar empty state con:
- Ícono PrimeIcons grande, color `--ds-text-muted`
- Heading descriptivo: qué no hay
- Texto secundario: contexto + acción sugerida (1-2 líneas)
- Botón CTA si aplica

Estructura:
```html
<div class="ui-empty-state">
  <i class="pi pi-{icono-relevante}"></i>
  <h4>{Mensaje principal corto}</h4>
  <p>{Explicación opcional}</p>
  <p-button label="{Acción sugerida}" severity="primary" />
</div>
```

El ícono, el copy y el CTA dependen del contexto del feature. La skill solo define la estructura y los estilos.

---

## 11. Accesibilidad y UX táctil

- Todo `p-button` de icono solo debe tener `ariaLabel`.
- Tablas con `caption` descriptivo (visualmente oculto si es necesario).
- Formularios: cada campo con `htmlFor` ↔ `id` correctamente vinculados.
- Contraste: texto sobre `--brand-primary` siempre blanco.
- Touch target mínimo 48×48px.
- Inputs con `inputmode` correcto (`tel`, `email`, `numeric`).
- Evitar hover-only interactions.
- Scroll containers con `-webkit-overflow-scrolling: touch` y `overscroll-behavior: contain`.

---

## 12. Transiciones y feedback táctil

En mobile, las transiciones son importantes para que se sienta app:
- Cambio de tab del bottom nav: fade rápido (150ms).
- Apertura de drawer/dialog mobile: slide-in (250ms ease-out).
- Tap feedback: `:active` con `transform: scale(0.97)` y `opacity: 0.9` en cards y botones.

En desktop, las transiciones son sutiles y se basan en hover.

---

## 13. Lo que NO está en el alcance de esta skill

Para evitar generar código fuera de scope:
- ❌ Pantalla de login y flujo de auth
- ❌ Interceptors HTTP (JWT, error handling)
- ❌ Guards de rutas
- ❌ Servicios de comunicación con backend
- ❌ Estructura de carpetas del proyecto
- ❌ Configuración técnica de PWA (service worker, manifest)
- ❌ Manejo de estado global

Si el usuario pide algo de esta lista, mencionarlo brevemente y enfocarse en la parte de UI que sí corresponde (ej: "puedo ayudarte con el diseño visual de la pantalla de login, pero la lógica de autenticación queda a tu criterio").

---

## 14. Estructura mínima del propio Design System

Aunque la arquitectura general del proyecto está fuera de alcance, el DS sí impone una estructura mínima para sus propios archivos. Esta es la única manera de garantizar que dos developers (o la IA) ubiquen el código en lugares predecibles.

```
src/
├── styles/
│   ├── tokens.scss         ← variables --brand-* y --ds-*
│   ├── breakpoints.scss    ← mixins mobile-only / tablet-up / desktop-up
│   ├── globals.scss        ← reglas base (body, h1-h4, touch targets)
│   ├── utilities.scss      ← .ui-show-*, .ui-text-*, .ui-flex-*
│   └── tenants/            ← un archivo SCSS por tenant
│       ├── _lcc.scss
│       └── _acme.scss
└── shared/ui/              ← componentes del Design System
    ├── shell/              ← admin-shell, patient-shell, sidebar, topbar, bottom-nav
    ├── components/         ← stat-card, list-card, entity-card, event-card, empty-state
    ├── form/               ← componentes de form (field, form-actions)
    └── breakpoint.service.ts
```

**Reglas:**
- Todo lo que sea reutilizable y aplique a cualquier feature va en `shared/ui/`.
- Los componentes específicos de un feature (un form de paciente, una pantalla de turnos) NO van acá — van en su propio módulo de feature.
- Los archivos en `styles/` se importan una sola vez en `styles.scss` raíz.

---

## 15. Componentes reutilizables vs HTML inline

Cuando la skill muestra ejemplos de patrones (event card, list card, stat card, empty state), el código HTML+SCSS es la **especificación visual**. Pero al implementarlo en el proyecto, debe convertirse en un **componente Angular standalone reutilizable**, no copiarse inline cada vez.

```typescript
// ✅ Bien: componente reutilizable con Inputs
@Component({
  selector: 'ui-stat-card',
  standalone: true,
  template: `
    <div class="ui-stat-card" [style.border-left-color]="accentColor">
      <div class="ui-stat-card__label">{{ label }}</div>
      <div class="ui-stat-card__value">{{ value }}</div>
      @if (sub) {
        <div class="ui-stat-card__sub">{{ sub }}</div>
      }
    </div>
  `
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() sub?: string;
  @Input() accentColor = 'var(--brand-secondary)';
}
```

```html
<!-- ❌ Mal: copiar el HTML del DS en cada feature -->
<div class="ui-stat-card" style="border-left-color: var(--brand-secondary)">
  <div class="ui-stat-card__label">Turnos hoy</div>
  ...
</div>

<!-- ✅ Bien: usar el componente -->
<ui-stat-card label="Turnos hoy" [value]="stats.turnos" sub="3 pendientes" />
```

**Regla práctica:** si un patrón de la skill aparece más de una vez en el proyecto, debe ser un componente Angular en `shared/ui/components/`. La skill describe el qué (el HTML + SCSS de referencia); el equipo decide cómo lo encapsula.

---

## 16. Anti-patrones (lo que NUNCA se hace)

Reglas estrictas que evitan inconsistencia y rompen el DS si se ignoran:

**Colores y estilos**
- ❌ Hardcodear hex de colores (`#00435D`, `#FFF`) → ✅ usar tokens (`var(--brand-primary)`, `var(--ds-white)`)
- ❌ Usar `font-size` en valores arbitrarios → ✅ respetar la escala tipográfica de `tokens.md`
- ❌ Inventar variantes de colores fuera de los tokens → ✅ si necesitás un tono nuevo, agregarlo a `--ds-*` o derivar de `--brand-*`
- ❌ Usar `--brand-*` para estados semánticos (success/error) → ✅ los estados van con `--ds-success`, `--ds-danger`, `--ds-warning`

**Layout y responsive**
- ❌ `width: 100vw` sin considerar safe areas → ✅ `width: 100%` o `100dvw`
- ❌ Hardcodear `padding: 16px` → ✅ usar `var(--space-4)`
- ❌ Usar `display: none` para ocultar en mobile sin clase semántica → ✅ `.ui-show-desktop` / `.ui-show-mobile`
- ❌ Olvidarse de `min-width: 0` en flex children con texto → ✅ siempre que haya texto truncable

**Componentes**
- ❌ Usar `<button>` HTML plano → ✅ `<p-button>` con severity
- ❌ Usar `ngModel` en formularios con submit → ✅ Reactive Forms (`formControlName`)
- ❌ Crear modales propios → ✅ usar `p-dialog` con `ui-dialog-fullscreen-mobile`
- ❌ Renderizar tablas tal cual en mobile → ✅ patrón "tabla adaptativa" (cards en mobile)
- ❌ Usar prefijos de tenant en clases (`.lcc-card`) → ✅ siempre `.ui-*`

**Accesibilidad**
- ❌ `p-button` con solo ícono sin `ariaLabel` → ✅ siempre con label accesible
- ❌ Touch targets menores a 48×48 en mobile → ✅ usar `var(--ds-touch-target)`
- ❌ Solo color para indicar estado → ✅ color + ícono (ej: `pi-exclamation-triangle` en valores fuera de rango)

---

## 17. Archivos de referencia

| Archivo                       | Contenido                                                            |
|-------------------------------|----------------------------------------------------------------------|
| `references/tokens.md`        | Variables SCSS, theming multi-tenant, breakpoints, mixins            |
| `references/components.md`    | Catálogo de componentes con código Angular adaptativo                |
| `references/patterns.md`      | Shells de aplicación y patrones combinables sin sesgo de dominio     |
