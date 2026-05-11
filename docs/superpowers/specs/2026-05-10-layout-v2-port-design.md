# Layout v2 Port — Design

**Fecha:** 2026-05-10
**Rama:** feature/sidebard-topbar
**Base:** scaffolding existente (ver `2026-05-09-scaffolding-design.md`)
**Mockup fuente:** `.superpowers/brainstorm/599-1778424925/content/full-mockup-v2.html`
**Stack:** Angular 17+ standalone · PrimeNG · NgRx clásico · SCSS

---

## 1. Objetivo

Portar el layout administrativo del mockup v2 al scaffolding existente, manteniendo la separación en componentes (`admin-shell`, `sidebar`, `topbar`) pero unificándolos visualmente. Además, actualizar la skill `laboratory-ui` con la regla de **drawer vs full-page+stepper** para operaciones de creación/edición.

**Esta iteración cubre exclusivamente la capa shell.** Las features del mockup (tablas, formularios de pacientes, agendas, pipeline analítica, etc.) quedan fuera; cada feature se implementará después con su propia spec.

---

## 2. Fuera del alcance

- Profile dropdown menu (avatar click → tarjeta con info de usuario / switch sucursal / logout).
- Side panels: "Mi perfil" y "Cambiar contraseña".
- Logout confirm modal.
- Búsqueda global funcional (en el topbar es visual-only).
- Bottom navigation mobile (esto es admin, no portal paciente).
- Cambios en la tabla `tenants` del backend (no se agregan columnas de color).
- Wiring de notificaciones, ayuda, foto de perfil.
- Componentes de feature (cards de stat, tablas adaptativas, pipeline, agenda) — vienen en specs posteriores.

---

## 3. Decisiones acordadas en brainstorming

| Pregunta | Decisión |
|----------|----------|
| Alcance del primer deliverable | Shell + sidebar + topbar solamente |
| Nav del sidebar | Usar la nav del mockup v2 exactamente |
| Rutas faltantes | Crear rutas placeholder con páginas "Coming soon" |
| Topbar search | Placeholder visual, sin comportamiento |
| Origen del color oscuro de la chrome | Derivar de `--brand-primary` con `color-mix` en CSS |
| Regla drawer vs stepper | Domain-driven (intención, no conteo de campos) |

---

## 4. Arquitectura de componentes

```
layout/
├── admin-shell/
│   └── admin-shell.component.ts   ← compone sidebar + topbar + router-outlet (existente, ajustes menores)
├── sidebar/
│   ├── sidebar.component.ts        ← reescrito: secciones, expandable, badges
│   └── sidebar.nav.ts              ← NUEVO: config tipada de NAV_SECTIONS
└── topbar/
    └── topbar.component.ts         ← reescrito: logo+tenant, search visual, action icons, avatar button
```

**Sin componentes nuevos en este shell.** Los sub-elementos (logo box, search field, nav item, nav badge) se renderizan inline dentro de `sidebar`/`topbar` — si más adelante se reutilizan en otra parte, se extraen.

El componente legacy `layout/shell/shell.component.ts` queda obsoleto (lo reemplaza `admin-shell`). Se elimina en esta iteración para no dejar código muerto.

---

## 5. Sidebar — modelo de datos

`layout/sidebar/sidebar.nav.ts`:

```ts
import { ModuleKey } from '@core/models/module-key.enum';

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;
      path: string;
      badge?: { text: string; tone: 'red' | 'green' };
      chip?: string;          // 'Beta', 'Root'
      moduleKey?: ModuleKey;  // si está, se filtra por ModuleRegistry.isActive()
    }
  | {
      kind: 'expandable';
      label: string;
      icon: string;
      children: { label: string; path: string }[];
    };

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [
      { kind: 'link', label: 'Inicio', icon: 'pi pi-home', path: '/home' },
    ],
  },
  {
    label: 'Core clínico',
    items: [
      {
        kind: 'expandable',
        label: 'Analítica',
        icon: 'pi pi-wave-pulse',
        children: [
          { label: 'Pre-analítica',  path: '/analitica/pre' },
          { label: 'Analítica',      path: '/analitica/analitica' },
          { label: 'Post-analítica', path: '/analitica/post' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes' },
      { kind: 'link', label: 'Turnos',    icon: 'pi pi-calendar', path: '/turnos',
        moduleKey: ModuleKey.Turnos, badge: { text: '4', tone: 'red' } },
      { kind: 'link', label: 'Atención',  icon: 'pi pi-users', path: '/atencion',
        badge: { text: '3', tone: 'green' } },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',         icon: 'pi pi-building',     path: '/empresa' },
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',      path: '/roles' },
      { kind: 'link', label: 'Sucursales',      icon: 'pi pi-map-marker',   path: '/sucursales' },
      { kind: 'link', label: 'Financiero',      icon: 'pi pi-wallet',       path: '/financiero',
        moduleKey: ModuleKey.Financiero },
      { kind: 'link', label: 'Obras Sociales',  icon: 'pi pi-id-card',      path: '/obras-sociales' },
    ],
  },
  {
    label: 'Servicios clínicos',
    items: [
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos',
        moduleKey: ModuleKey.Medicos, chip: 'Beta' },
      { kind: 'link', label: 'Stock e insumos',    icon: 'pi pi-box',   path: '/stock',
        moduleKey: ModuleKey.Stock, chip: 'Beta' },
      { kind: 'link', label: 'Portal paciente',    icon: 'pi pi-globe', path: '/portal',
        moduleKey: ModuleKey.Portal },
    ],
  },
  {
    label: 'Administración',
    items: [
      { kind: 'link', label: 'SaaS Admin', icon: 'pi pi-cog', path: '/admin', chip: 'Root' },
    ],
  },
];
```

**Filtrado por módulo activo:** los items con `moduleKey` se ocultan completamente si `ModuleRegistry.isActive(key)` devuelve `false` (consistente con el comportamiento actual del scaffolding).

**Estado de expansión:** un `signal<Set<string>>` interno al componente, keyed por label del expandable. Al inicializarse y en cada `NavigationEnd`, si la ruta activa pertenece a un expandable, ese label se agrega al set automáticamente (no se cierra cuando el usuario navega a un hijo).

**Active states:**
- `link`: `routerLinkActive="ui-sidebar__item--active"`.
- `expandable` parent: clase `ui-sidebar__item--active` si alguna de las child paths matchea con `startsWith` el `router.url`.
- `expandable` child (sub-item): `routerLinkActive` directo.

---

## 6. Topbar — estructura

```html
<header class="ui-topbar">
  <!-- Hamburger (mobile only) -->
  <button class="ui-topbar__hamburger ui-show-mobile"
          (click)="menuToggle.emit()" aria-label="Abrir menú">
    <i class="pi pi-bars"></i>
  </button>

  <!-- Logo + tenant -->
  <div class="ui-topbar__brand">
    <div class="ui-topbar__logo-box">{{ tenantInitials() }}</div>
    <span class="ui-topbar__tenant-name">{{ tenantConfig()?.name ?? 'LabCore' }}</span>
    <span class="ui-topbar__tenant-badge">Admin</span>
  </div>

  <!-- Search (visual only, hidden on mobile) -->
  <div class="ui-topbar__search ui-show-desktop" role="search" aria-disabled="true">
    <i class="pi pi-search"></i>
    <span>Buscar pacientes, turnos, estudios…</span>
    <!-- TODO: implementar búsqueda global -->
  </div>

  <!-- Right cluster -->
  <div class="ui-topbar__actions">
    <button class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
            aria-label="Notificaciones">
      <i class="pi pi-bell"></i>
      <!-- TODO: badge dinámico -->
    </button>
    <button class="ui-topbar__icon-btn" aria-label="Ayuda">
      <i class="pi pi-question-circle"></i>
    </button>
    <button class="ui-topbar__avatar" aria-label="Menú de usuario">
      {{ userInitials() }}
      <!-- TODO: dropdown menu (siguiente iteración) -->
    </button>
  </div>
</header>
```

**Iniciales del tenant:** `computed(() => initials(tenantConfig()?.name))` — toma las dos primeras letras del nombre, uppercase.
**Iniciales del usuario:** `computed(() => initials(currentUser()?.fullName))`. Si no hay usuario, devuelve `'?'`.

Los tres botones de la derecha son `<button>` HTML simples con clases `ui-*`, **no `<p-button>`** — la chrome del shell tiene un look denso/dark que no encaja con el botón estándar de PrimeNG. Cumplen `48×48` touch target en mobile.

---

## 7. Theming — chrome dark derivada

`src/styles/tokens.scss` agrega:

```scss
:root {
  /* derivadas de --brand-primary, recalculadas automáticamente al cambiar el tenant */
  --brand-shell-bg:   color-mix(in srgb, var(--brand-primary) 70%, black);
  --brand-shell-bg-2: color-mix(in srgb, var(--brand-primary) 55%, black); /* topbar levemente más oscuro */
  --brand-tint:       color-mix(in srgb, var(--brand-primary) 12%, white);
  --brand-tint-strong: color-mix(in srgb, var(--brand-primary) 18%, white);
}

@supports not (color: color-mix(in srgb, red, blue)) {
  :root {
    --brand-shell-bg:    #1e293b;
    --brand-shell-bg-2:  #0f172a;
    --brand-tint:        #eff6ff;
    --brand-tint-strong: #dbeafe;
  }
}
```

**Uso:**
- `--brand-shell-bg` → fondo del sidebar y topbar.
- `--brand-shell-bg-2` → variante leve para hovers internos en sidebar.
- `--brand-tint` → hover sutil de items, fondos de avatares pequeños en mockup.
- `--brand-tint-strong` → active state de nav items dentro del content area (no del sidebar).

**Texto sobre shell-bg:** siempre blanco con opacidades graduales — `rgba(255,255,255,.65)` para items, `rgba(255,255,255,.4)` para section labels, `#fff` para item activo.

`TenantThemeService` no requiere cambios: sigue seteando solo `--brand-primary/secondary/accent`. Las variables derivadas se recalculan automáticamente porque son CSS puro.

---

## 8. Rutas placeholder

### 8.1 Nuevas features (cada una mínima: `*.routes.ts` + una page)

```
features/
├── home/
│   ├── home.routes.ts
│   └── pages/home/home.page.ts
├── pacientes/
│   ├── pacientes.routes.ts
│   └── pages/pacientes/pacientes.page.ts
├── atencion/
│   ├── atencion.routes.ts
│   └── pages/atencion/atencion.page.ts
├── roles/
│   ├── roles.routes.ts
│   └── pages/roles/roles.page.ts
└── obras-sociales/
    ├── obras-sociales.routes.ts
    └── pages/obras-sociales/obras-sociales.page.ts
```

Cada page renderiza `<ui-coming-soon label="..." icon="pi pi-..."/>`. Sin servicios, sin store, sin modelos — placeholder puro.

**Decisión sobre `roles`:** el scaffolding tenía `features/empresa/pages/roles/` previsto. Ese sub-page se deja como está (puede ser una vista interna detallada en el futuro). El sidebar apunta a `/roles` (feature top-level) según el mockup v2. Si más adelante se decide unificar, la spec correspondiente lo hará.

### 8.2 Rutas hijas en `analitica`

`features/analitica/analitica.routes.ts` se extiende con tres children:

```ts
export const ANALITICA_ROUTES: Routes = [
  { path: 'pre',       loadComponent: () => import('./pages/pre/pre.page').then(m => m.PrePage) },
  { path: 'analitica', loadComponent: () => import('./pages/analitica/analitica.page').then(m => m.AnaliticaPage) },
  { path: 'post',      loadComponent: () => import('./pages/post/post.page').then(m => m.PostPage) },
  { path: '', redirectTo: 'pre', pathMatch: 'full' },
];
```

Cada page = `<ui-coming-soon>`.

### 8.3 Cambios en `app.routes.ts`

- Default redirect: de `redirectTo: 'empresa'` → `redirectTo: 'home'`.
- Agregar las cinco features nuevas como children del shell, mismo patrón `loadChildren` que las existentes.

---

## 9. `<ui-coming-soon>` — componente compartido

`shared/ui/components/coming-soon/coming-soon.component.ts`:

```ts
@Component({
  selector: 'ui-coming-soon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-coming-soon">
      <i [class]="icon" class="ui-coming-soon__icon"></i>
      <h2>{{ label }}</h2>
      <p>Esta sección está en construcción.</p>
    </div>
  `,
  styles: [`/* ... centered empty-state, --ds-text-muted, ícono 48px ... */`],
})
export class ComingSoonComponent {
  readonly label = input.required<string>();
  readonly icon  = input<string>('pi pi-clock');
}
```

Se exporta desde `shared/index.ts` para que cualquier feature pueda usarlo.

---

## 10. AdminShellComponent — ajustes mínimos

El shell existente ya está bien estructurado. Cambios:

1. Eliminar `padding: var(--space-6)` del `__content` cuando es la chrome del v2 (las pages tendrán su propio `page-header` blanco + `page-body` con padding). Mover el padding a un wrapper `ui-page` opcional. **Decisión:** dejar el padding por ahora; las pages placeholder lo necesitan. Cuando se implementen las pages reales con `page-header` propio, se quita.
2. El drawer mobile usa el mismo `<ui-sidebar>`. Pasar `(itemClick)="drawerOpen.set(false)"` ya está hecho.
3. Sin cambios en `signal` ni en el output `menuToggle`.

---

## 11. Estilos del sidebar (referencia visual)

Aplicar las reglas del mockup v2 manteniendo los tokens del design system:

- `width: var(--ds-sidebar-w)` (260px — ya definido).
- `background: var(--brand-shell-bg)`.
- Section label: `font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.4)`.
- Nav item: `padding: 8px 10px; margin: 1px 6px; border-radius: 6px; color: rgba(255,255,255,.65); font-size: 12.5px; min-height: var(--ds-touch-target)` en mobile.
- Hover: `background: rgba(255,255,255,.1); color: #fff`.
- Active: `background: rgba(255,255,255,.18); color: #fff; font-weight: 600`; pseudo-element `::before` de 3px blanco como left-bar accent.
- Badge: `pill rojo/verde, font-size: 9px, padding: 1px 5px`.
- Chip: `font-size: 8px, opacity baja, padding: 1px 4px`.
- Sub-nav: `max-height` animado en transición; sub-items con `padding-left: 34px` y un dot de 5px.
- Scrollbar: 4px, thumb `rgba(255,255,255,.2)`.

---

## 12. Estilos del topbar (referencia visual)

- `height: var(--ds-topbar-h)` (64px — el mockup usa 52px pero mantenemos el token actual para coherencia con el shell ya scaffoldeado).
- `background: var(--brand-shell-bg)`.
- Logo box: 28px square, `background: var(--brand-primary)`, `border-radius: 6px`, contenido blanco bold.
- Tenant name: `color: #f1f5f9, font-weight: 600, font-size: 13px`.
- Tenant badge: `font-size: 9px, background: var(--brand-primary), padding: 1px 6px, border-radius: 8px`.
- Search field: `flex: 1, background: rgba(255,255,255,.08), border: 1px solid rgba(255,255,255,.12), border-radius: 6px, padding: 7px 10px, color: #94a3b8` — placeholder estático, no input real (un `<div>` o `<span>`).
- Action buttons: 32×32 en desktop, 48×48 en mobile, `background: rgba(255,255,255,.08), border: 1px solid rgba(255,255,255,.1), color: #94a3b8`. Hover `background: rgba(255,255,255,.16)`.
- Notif dot: `::after` con texto fijo (placeholder), background `--ds-danger`.
- Avatar button: 32×32 circle, `background: var(--brand-primary)`, blanco bold.

Mobile:
- Hamburger reemplaza el logo block (logo+tenant ocultos detrás de `.ui-show-desktop`). Decisión alternativa: dejar logo siempre visible y poner hamburger antes. **Elegido: logo siempre visible**, hamburger antes del logo en mobile. Más reconocible para el usuario.
- Search oculto.

---

## 13. Actualización de la skill `laboratory-ui`

Archivo: `.claude/skills/laboratory-ui/SKILL.md` (o donde resida la skill — verificar en implementación; si está en `superpowers` repo, hacer fork local).

**Acción 1:** Agregar nueva sección **§9.X — Drawer vs full-page+stepper** dentro de "Patrones reutilizables", entre el patrón actual "Formulario de creación o edición" y el siguiente.

Contenido literal a agregar:

```markdown
### Drawer vs full-page con stepper — cuándo usar cada uno

El criterio es **el dominio de la operación**, no el conteo de campos.

**Drawer lateral de ~50% (`p-drawer position="left"`)** — para crear o editar UNA entidad atómica con campos directamente suyos. Ejemplos: Paciente, Sucursal, Área, Usuario, Rol, Médico derivante, Obra Social, Insumo, configuración del tenant, plantilla de notificación. El payload del backend es un objeto plano (o con un par de IDs de relación). El usuario está editando una "ficha".

**Full-page con stepper (`/feature/nuevo`)** — para componer una TRANSACCIÓN que ata múltiples entidades en un solo evento de negocio. Ejemplos: Registrar llegada (paciente + turno + estudios + cobro), Nuevo turno (paciente + horario + estudios + médico derivante), Carga de protocolo (muestra + estudios + área), Cierre de caja, Facturación. El payload es un aggregate (root + colecciones anidadas). El usuario está armando un caso, no editando una ficha.

**Regla práctica:** si el endpoint termina en `POST /<entidad>` con un body simple → drawer. Si arma `POST /<evento>` con arrays anidados, o si requiere lookup/creación inline de entidades relacionadas (ej: crear un paciente en el medio de un alta de turno) → stepper full-page.

#### Drawer — mecánicas obligatorias

- `p-drawer position="left"`, `[modal]="true"`, `[dismissable]="true"`.
- Ancho: `styleClass="ui-drawer-half"` → en desktop `width: 50vw; min-width: 480px; max-width: 720px`; en mobile `width: 100vw`.
- Header sticky con título + botón cerrar (X).
- Footer sticky abajo con `Cancelar` (secondary) + `Guardar`/`Crear` (primary). Submit por `Enter` cuando aplique.
- `Esc` cierra (PrimeNG lo provee; no override).
- Reactive Forms siempre. Validación on blur + on submit.
- Skeleton mientras se cargan datos en edición.

#### Stepper full-page — mecánicas obligatorias

- Ruta dedicada (`/feature/nuevo`, `/feature/:id/editar` si edición compleja).
- Header con botón "Atrás" + título "Paso N de M".
- `p-progressBar` o stepper visual arriba.
- Body scrolleable, `max-width: 720px`, centrado.
- Footer sticky con `Volver` + `Continuar` (o `Confirmar` en último paso).
- Validar solo el step actual antes de avanzar.
- Persistir el estado del wizard en memoria mientras dure la navegación; perder al salir es aceptable.
- Confirmación si el usuario intenta salir con cambios sin guardar.
```

**Acción 2:** Ajustar §9 "Formulario de creación o edición" para que apunte a la nueva subsección:

> "Para creación/edición la decisión entre drawer y full-page+stepper sigue la regla domain-driven descripta más abajo en §9.X."

**Acción 3:** Actualizar el `description` del frontmatter de la skill para mencionar la nueva regla, manteniendo el resto intacto. Algo como: *"...cubre además la regla de cuándo usar drawer vs full-page+stepper para operaciones de creación/edición..."*.

---

## 14. Tests / verificación

Esta iteración es visual + estructural. Verificación manual:

- [ ] `npm start` arranca sin errores de TypeScript.
- [ ] `/` redirige a `/home` y muestra "Coming soon · Inicio".
- [ ] Sidebar renderiza las 5 secciones con sus items.
- [ ] Click en cada item navega y marca el item como activo (left-bar accent + texto blanco).
- [ ] Click en "Analítica" expande/colapsa los sub-items con transición.
- [ ] Si el tenant tiene `modules: [ModuleKey.Turnos]`, "Financiero" y "Stock" no aparecen.
- [ ] En mobile (≤768px) el sidebar se oculta y aparece el hamburger; tap abre el drawer con el mismo sidebar adentro; tap en un item lo cierra.
- [ ] Topbar muestra logo + iniciales del tenant + badge "Admin" + search placeholder + 3 botones de la derecha.
- [ ] Search field no es focusable / no acepta input.
- [ ] Cambiar `--brand-primary` en DevTools recalcula la chrome dark automáticamente.

No se agregan unit tests en esta iteración. Cuando se construyan las pages reales con lógica, cada feature aporta sus `*.spec.ts`.

---

## 15. Plan de archivos (resumen)

**Modificar:**
- `src/styles/tokens.scss` (nuevas variables derivadas).
- `src/app/app.routes.ts` (default redirect + 5 rutas nuevas).
- `src/app/layout/admin-shell/admin-shell.component.ts` (verificar drawer mobile).
- `src/app/layout/sidebar/sidebar.component.ts` (reescribir según §5 + §11).
- `src/app/layout/topbar/topbar.component.ts` (reescribir según §6 + §12).
- `src/app/features/analitica/analitica.routes.ts` (3 children).
- `.claude/skills/laboratory-ui/SKILL.md` (sección §9.X + ajustes).

**Crear:**
- `src/app/layout/sidebar/sidebar.nav.ts`.
- `src/app/shared/ui/components/coming-soon/coming-soon.component.ts`.
- `src/app/features/home/{home.routes.ts, pages/home/home.page.ts}`.
- `src/app/features/pacientes/{pacientes.routes.ts, pages/pacientes/pacientes.page.ts}`.
- `src/app/features/atencion/{atencion.routes.ts, pages/atencion/atencion.page.ts}`.
- `src/app/features/roles/{roles.routes.ts, pages/roles/roles.page.ts}`.
- `src/app/features/obras-sociales/{obras-sociales.routes.ts, pages/obras-sociales/obras-sociales.page.ts}`.
- `src/app/features/analitica/pages/{pre,analitica,post}/*.page.ts`.

**Eliminar:**
- `src/app/layout/shell/shell.component.ts` (obsoleto, reemplazado por `admin-shell`).

---

## 16. Siguiente iteración (no en esta spec)

Lo que sigue, en orden sugerido:
1. Profile dropdown menu en el topbar.
2. Side panels: "Mi perfil" y "Cambiar contraseña".
3. Logout confirm modal.
4. Componentes compartidos derivados del mockup: `ui-stat-card`, `ui-page-header`, `ui-pipeline`, `ui-list-card` (tabla adaptativa).
5. Implementación real de las pages — empezando por **Inicio** (dashboard con stat-cards + actividad semanal + módulos activos) que da una vista funcional inmediatamente.
