# Layout v2 Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the v2 admin shell (sidebar + topbar) to the Angular scaffolding with the exact v2 nav, derived dark chrome, placeholder pages for missing routes, and update the `laboratory-ui` skill with the drawer-vs-stepper rule.

**Architecture:** In-place rewrite of `admin-shell` / `sidebar` / `topbar` components. Sidebar driven by a typed `NAV_SECTIONS` config. Shell colors derived from `--brand-primary` via CSS `color-mix` — no DB or model changes. New placeholder feature folders (home, roles, obras-sociales) plus three existing analitica sub-pages reused. Missing top-level items (Pacientes, Atención) point to existing routes inside `features/analitica`. Each placeholder page renders the existing `<ui-empty-state>` component.

**Tech Stack:** Angular 17+ standalone components · PrimeNG · NgRx classic · SCSS (mobile-first) · CSS `color-mix()`.

**Spec reference:** `docs/superpowers/specs/2026-05-10-layout-v2-port-design.md`

---

## File Structure

**Modify:**
- `src/styles/tokens.scss` — add 4 derived shell tokens + `@supports` fallback.
- `src/app/app.routes.ts` — default redirect to `/home`, register 3 new feature routes.
- `src/app/layout/admin-shell/admin-shell.component.ts` — minor: confirm drawer wiring stays, remove obsolete styles touching shell bg.
- `src/app/layout/sidebar/sidebar.component.ts` — full rewrite driven by `NAV_SECTIONS`.
- `src/app/layout/topbar/topbar.component.ts` — full rewrite: logo box, tenant, visual search, action icons, avatar button.
- `.claude/skills/laboratory-ui/SKILL.md` — replace §"Formulario de creación o edición" with the new drawer-vs-stepper rule.

**Create:**
- `src/app/layout/sidebar/sidebar.nav.ts` — typed `NavItem`/`NavSection`/`NAV_SECTIONS`.
- `src/app/features/home/home.routes.ts`
- `src/app/features/home/pages/home/home.page.ts`
- `src/app/features/roles/roles.routes.ts`
- `src/app/features/roles/pages/roles/roles.page.ts`
- `src/app/features/obras-sociales/obras-sociales.routes.ts`
- `src/app/features/obras-sociales/pages/obras-sociales/obras-sociales.page.ts`

**Delete:**
- `src/app/layout/shell/shell.component.ts` — legacy unused (only `admin-shell` is referenced).

**Sidebar paths reuse existing routes** where they already exist:
- Pacientes → `/analitica/pacientes` (already in `analitica.routes.ts`)
- Atención → `/analitica/atencion`
- Pre / Analítica / Post → `/analitica/pre-analitica`, `/analitica/analitica`, `/analitica/post-analitica`

No new pages or routes are created inside `analitica`.

---

## Task 1: Add derived shell tokens to `tokens.scss`

**Files:**
- Modify: `src/styles/tokens.scss`

- [ ] **Step 1: Append the derived shell tokens block to `tokens.scss`**

Add this at the end of the file (after the existing PrimeNG overrides block):

```scss
// ─── Derivados de --brand-primary (chrome del shell) ───
// Recalculados automáticamente por el navegador al cambiar la primaria del tenant.
:root {
  --brand-shell-bg:    color-mix(in srgb, var(--brand-primary) 70%, black);
  --brand-shell-bg-2:  color-mix(in srgb, var(--brand-primary) 55%, black);
  --brand-tint:        color-mix(in srgb, var(--brand-primary) 12%, white);
  --brand-tint-strong: color-mix(in srgb, var(--brand-primary) 18%, white);
}

// Fallback para navegadores muy viejos sin color-mix.
@supports not (color: color-mix(in srgb, red, blue)) {
  :root {
    --brand-shell-bg:    #1e293b;
    --brand-shell-bg-2:  #0f172a;
    --brand-tint:        #eff6ff;
    --brand-tint-strong: #dbeafe;
  }
}
```

- [ ] **Step 2: Verify build still compiles**

Run: `npm run build`
Expected: build succeeds, no SCSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.scss
git commit -m "feat(styles): add derived shell color tokens (brand-shell-bg, brand-tint)"
```

---

## Task 2: Scaffold `features/home` placeholder

**Files:**
- Create: `src/app/features/home/home.routes.ts`
- Create: `src/app/features/home/pages/home/home.page.ts`

- [ ] **Step 1: Create the `HomePage` component**

Write `src/app/features/home/pages/home/home.page.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-home"
      heading="Inicio"
      description="El dashboard de la página de inicio se construye en una próxima iteración." />
  `,
})
export class HomePage {}
```

- [ ] **Step 2: Create the routes file**

Write `src/app/features/home/home.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const HOME_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/home
git commit -m "feat(home): scaffold placeholder feature"
```

---

## Task 3: Scaffold `features/roles` placeholder

**Files:**
- Create: `src/app/features/roles/roles.routes.ts`
- Create: `src/app/features/roles/pages/roles/roles.page.ts`

- [ ] **Step 1: Create the `RolesPage` component**

Write `src/app/features/roles/pages/roles/roles.page.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-shield"
      heading="Roles y permisos"
      description="La gestión de roles y permisos se construye en una próxima iteración." />
  `,
})
export class RolesPage {}
```

- [ ] **Step 2: Create the routes file**

Write `src/app/features/roles/roles.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage),
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/roles
git commit -m "feat(roles): scaffold placeholder feature"
```

---

## Task 4: Scaffold `features/obras-sociales` placeholder

**Files:**
- Create: `src/app/features/obras-sociales/obras-sociales.routes.ts`
- Create: `src/app/features/obras-sociales/pages/obras-sociales/obras-sociales.page.ts`

- [ ] **Step 1: Create the `ObrasSocialesPage` component**

Write `src/app/features/obras-sociales/pages/obras-sociales/obras-sociales.page.ts`:

```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-obras-sociales-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <ui-empty-state
      icon="pi-id-card"
      heading="Obras Sociales"
      description="La gestión de obras sociales y coberturas se construye en una próxima iteración." />
  `,
})
export class ObrasSocialesPage {}
```

- [ ] **Step 2: Create the routes file**

Write `src/app/features/obras-sociales/obras-sociales.routes.ts`:

```ts
import { Routes } from '@angular/router';

export const OBRAS_SOCIALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/obras-sociales/obras-sociales.page').then(m => m.ObrasSocialesPage),
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/obras-sociales
git commit -m "feat(obras-sociales): scaffold placeholder feature"
```

---

## Task 5: Register new routes in `app.routes.ts` and switch default redirect

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Read the current file to confirm exact content**

Run: open `src/app/app.routes.ts` and confirm the current default redirect (`redirectTo: 'empresa'`) and the structure of `children:`.

- [ ] **Step 2: Add three new child routes inside the shell children array**

Inside the shell's `children:` array (the one with `empresa`, `sucursales`, `analitica`, …), insert these three routes **before** the final `{ path: '', redirectTo: ..., pathMatch: 'full' }` entry:

```ts
{
  path: 'home',
  loadChildren: () =>
    import('./features/home/home.routes').then((m) => m.HOME_ROUTES),
},
{
  path: 'roles',
  loadChildren: () =>
    import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
},
{
  path: 'obras-sociales',
  loadChildren: () =>
    import('./features/obras-sociales/obras-sociales.routes').then((m) => m.OBRAS_SOCIALES_ROUTES),
},
```

- [ ] **Step 3: Change the default redirect from `empresa` to `home`**

Replace:

```ts
{ path: '', redirectTo: 'empresa', pathMatch: 'full' },
```

with:

```ts
{ path: '', redirectTo: 'home', pathMatch: 'full' },
```

- [ ] **Step 4: Verify the app builds and `/` redirects to `/home`**

Run: `npm run build`
Expected: build succeeds.

Run: `npm start`, visit `http://localhost:4200/`.
Expected: URL becomes `/home`, page shows the "Inicio" empty state.

- [ ] **Step 5: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(routes): register home/roles/obras-sociales and switch default to /home"
```

---

## Task 6: Create the typed sidebar nav config

**Files:**
- Create: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Write the nav config file**

Write `src/app/layout/sidebar/sidebar.nav.ts`:

```ts
import { ModuleKey } from '@core/models/module-key.enum';

export interface NavBadge {
  text: string;
  tone: 'red' | 'green';
}

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;        // PrimeIcons class, e.g. 'pi pi-home'
      path: string;        // absolute, starts with '/'
      badge?: NavBadge;
      chip?: string;       // small uppercase chip text, e.g. 'Beta', 'Root'
      moduleKey?: ModuleKey;
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
          { label: 'Pre-analítica',  path: '/analitica/pre-analitica' },
          { label: 'Analítica',      path: '/analitica/analitica' },
          { label: 'Post-analítica', path: '/analitica/post-analitica' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/analitica/pacientes' },
      {
        kind: 'link',
        label: 'Turnos',
        icon: 'pi pi-calendar',
        path: '/turnos',
        moduleKey: ModuleKey.Turnos,
        badge: { text: '4', tone: 'red' },
      },
      {
        kind: 'link',
        label: 'Atención',
        icon: 'pi pi-users',
        path: '/analitica/atencion',
        badge: { text: '3', tone: 'green' },
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building',    path: '/empresa' },
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',      path: '/roles' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-map-marker',  path: '/sucursales' },
      {
        kind: 'link',
        label: 'Financiero',
        icon: 'pi pi-wallet',
        path: '/financiero',
        moduleKey: ModuleKey.Financiero,
      },
      { kind: 'link', label: 'Obras Sociales',   icon: 'pi pi-id-card',     path: '/obras-sociales' },
    ],
  },
  {
    label: 'Servicios clínicos',
    items: [
      {
        kind: 'link',
        label: 'Médicos derivantes',
        icon: 'pi pi-heart',
        path: '/medicos',
        moduleKey: ModuleKey.Medicos,
        chip: 'Beta',
      },
      {
        kind: 'link',
        label: 'Stock e insumos',
        icon: 'pi pi-box',
        path: '/stock',
        moduleKey: ModuleKey.Stock,
        chip: 'Beta',
      },
      {
        kind: 'link',
        label: 'Portal paciente',
        icon: 'pi pi-globe',
        path: '/portal',
        moduleKey: ModuleKey.Portal,
      },
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

- [ ] **Step 2: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(layout): add typed NAV_SECTIONS config"
```

---

## Task 7: Rewrite `sidebar.component.ts` to match v2 visual + drive from `NAV_SECTIONS`

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.component.ts`

- [ ] **Step 1: Replace the file with the new implementation**

Overwrite `src/app/layout/sidebar/sidebar.component.ts` with:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NAV_SECTIONS, NavItem, NavSection } from './sidebar.nav';

@Component({
  selector: 'ui-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, RouterLinkActive],
  template: `
    <nav class="ui-sidebar" aria-label="Navegación principal">
      @for (section of visibleSections(); track section.label; let last = $last) {
        <div class="ui-sidebar__section">
          <div class="ui-sidebar__section-label">{{ section.label }}</div>
          @for (item of section.items; track item.label) {
            @if (item.kind === 'link') {
              <a
                [routerLink]="item.path"
                routerLinkActive="ui-sidebar__item--active"
                class="ui-sidebar__item"
                (click)="itemClick.emit()">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                <span class="ui-sidebar__label">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="ui-sidebar__badge"
                        [ngClass]="'ui-sidebar__badge--' + item.badge.tone">
                    {{ item.badge.text }}
                  </span>
                }
                @if (item.chip) {
                  <span class="ui-sidebar__chip">{{ item.chip }}</span>
                }
              </a>
            } @else {
              <button
                type="button"
                class="ui-sidebar__item ui-sidebar__item--expandable"
                [class.ui-sidebar__item--active]="isGroupActive(item)"
                [class.ui-sidebar__item--expanded]="isExpanded(item.label)"
                (click)="toggleExpanded(item.label)">
                <span class="ui-sidebar__icon"><i [class]="item.icon"></i></span>
                <span class="ui-sidebar__label">{{ item.label }}</span>
                <i class="pi pi-chevron-down ui-sidebar__chevron"></i>
              </button>
              <div class="ui-sidebar__sub" [class.ui-sidebar__sub--open]="isExpanded(item.label)">
                @for (child of item.children; track child.path) {
                  <a
                    [routerLink]="child.path"
                    routerLinkActive="ui-sidebar__subitem--active"
                    class="ui-sidebar__subitem"
                    (click)="itemClick.emit()">
                    <span class="ui-sidebar__dot"></span>
                    <span class="ui-sidebar__label">{{ child.label }}</span>
                  </a>
                }
              </div>
            }
          }
        </div>
        @if (!last) {
          <div class="ui-sidebar__divider"></div>
        }
      }
    </nav>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .ui-sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--brand-shell-bg);
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--space-2) 0;
    }
    .ui-sidebar::-webkit-scrollbar { width: 4px; }
    .ui-sidebar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,.2);
      border-radius: 2px;
    }

    .ui-sidebar__section { padding: var(--space-2) 0 0; }
    .ui-sidebar__section-label {
      padding: 0 var(--space-3) var(--space-1);
      font-size: 9px;
      font-weight: 700;
      letter-spacing: .08em;
      color: rgba(255,255,255,.4);
      text-transform: uppercase;
    }

    .ui-sidebar__divider {
      height: 1px;
      background: rgba(255,255,255,.1);
      margin: var(--space-2) var(--space-3);
    }

    .ui-sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 8px 10px;
      margin: 1px 6px;
      border-radius: 6px;
      color: rgba(255,255,255,.65);
      font-size: 12.5px;
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      position: relative;
      transition: background .12s, color .12s;
      background: transparent;
      border: none;
      width: calc(100% - 12px);
      text-align: left;
      min-height: var(--ds-touch-target);
    }
    .ui-sidebar__item:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }
    .ui-sidebar__item--active {
      background: rgba(255,255,255,.18);
      color: #fff;
      font-weight: 600;
    }
    .ui-sidebar__item--active::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 4px;
      bottom: 4px;
      width: 3px;
      background: #fff;
      border-radius: 0 2px 2px 0;
    }

    .ui-sidebar__icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .ui-sidebar__label {
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ui-sidebar__badge {
      margin-left: auto;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 8px;
      color: #fff;
    }
    .ui-sidebar__badge--red   { background: var(--ds-danger); }
    .ui-sidebar__badge--green { background: var(--ds-success); }

    .ui-sidebar__chip {
      margin-left: auto;
      font-size: 8px;
      background: rgba(255,255,255,.15);
      color: rgba(255,255,255,.6);
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: .04em;
      text-transform: uppercase;
    }

    .ui-sidebar__chevron {
      margin-left: auto;
      font-size: 10px;
      color: rgba(255,255,255,.4);
      transition: transform .2s;
    }
    .ui-sidebar__item--expanded .ui-sidebar__chevron { transform: rotate(180deg); }

    .ui-sidebar__sub {
      overflow: hidden;
      max-height: 0;
      transition: max-height .25s ease;
    }
    .ui-sidebar__sub--open { max-height: 240px; }

    .ui-sidebar__subitem {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 6px 10px 6px 34px;
      margin: 1px 6px;
      border-radius: 6px;
      color: rgba(255,255,255,.55);
      font-size: 12px;
      text-decoration: none;
      cursor: pointer;
      transition: background .12s, color .12s;
      min-height: var(--ds-touch-target);
    }
    .ui-sidebar__subitem:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }
    .ui-sidebar__subitem--active {
      background: rgba(255,255,255,.15);
      color: #fff;
      font-weight: 600;
    }
    .ui-sidebar__subitem--active .ui-sidebar__dot { background: #fff; }
    .ui-sidebar__dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(255,255,255,.4);
      flex-shrink: 0;
    }
  `],
})
export class SidebarComponent {
  readonly itemClick = output<void>();

  private readonly registry = inject(ModuleRegistry);
  private readonly router   = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly expandedSet = signal<Set<string>>(new Set());

  readonly visibleSections = computed<NavSection[]>(() =>
    NAV_SECTIONS
      .map(section => ({
        ...section,
        items: section.items.filter(item => this.isItemVisible(item)),
      }))
      .filter(section => section.items.length > 0),
  );

  // Auto-open the expandable group whose child matches the current URL.
  // Computed read inside the template would mutate state; instead derive via constructor effect.
  constructor() {
    // Initial sync + on URL changes.
    const sync = () => {
      const url = this.url();
      for (const section of NAV_SECTIONS) {
        for (const item of section.items) {
          if (item.kind === 'expandable' && item.children.some(c => url.startsWith(c.path))) {
            const next = new Set(this.expandedSet());
            next.add(item.label);
            this.expandedSet.set(next);
          }
        }
      }
    };
    // Run once on construction.
    sync();
    // Re-run whenever url changes — toSignal triggers CD, but we also want side-effect.
    // Using a microtask poll via effect would be cleaner; we keep it simple with a subscription.
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(sync);
  }

  protected isItemVisible(item: NavItem): boolean {
    if (item.kind === 'expandable') return true;
    return !item.moduleKey || this.registry.isActive(item.moduleKey);
  }

  protected isExpanded(label: string): boolean {
    return this.expandedSet().has(label);
  }

  protected toggleExpanded(label: string): void {
    const next = new Set(this.expandedSet());
    if (next.has(label)) next.delete(label);
    else next.add(label);
    this.expandedSet.set(next);
  }

  protected isGroupActive(item: NavItem): boolean {
    if (item.kind !== 'expandable') return false;
    const url = this.url();
    return item.children.some(c => url.startsWith(c.path));
  }
}
```

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 3: Manual smoke**

Run: `npm start`, visit `/`.
Expected:
- Sidebar shows 5 sections with the v2 labels.
- "Analítica" is collapsed by default; clicking expands it.
- Navigating to `/analitica/pre-analitica` auto-expands "Analítica" and marks the sub-item active.
- Active item has a 3px white left bar.
- Items for inactive modules (e.g. Stock/Médicos when not active for tenant) are hidden.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/sidebar/sidebar.component.ts
git commit -m "feat(layout): rewrite sidebar to v2 visual + section/expandable model"
```

---

## Task 8: Rewrite `topbar.component.ts` to match v2 visual

**Files:**
- Modify: `src/app/layout/topbar/topbar.component.ts`

- [ ] **Step 1: Replace the file with the new implementation**

Overwrite `src/app/layout/topbar/topbar.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';

@Component({
  selector: 'ui-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ui-topbar">
      <button
        type="button"
        class="ui-topbar__hamburger ui-show-mobile"
        (click)="menuToggle.emit()"
        aria-label="Abrir menú">
        <i class="pi pi-bars"></i>
      </button>

      <div class="ui-topbar__brand">
        <div class="ui-topbar__logo-box" aria-hidden="true">{{ tenantInitials() }}</div>
        <span class="ui-topbar__tenant-name">{{ tenantName() }}</span>
        <span class="ui-topbar__tenant-badge">Admin</span>
      </div>

      <!-- TODO: implementar búsqueda global -->
      <div class="ui-topbar__search ui-show-desktop" role="search" aria-disabled="true">
        <i class="pi pi-search"></i>
        <span>Buscar pacientes, turnos, estudios…</span>
      </div>

      <div class="ui-topbar__actions">
        <!-- TODO: badge dinámico de notificaciones -->
        <button
          type="button"
          class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
          aria-label="Notificaciones">
          <i class="pi pi-bell"></i>
        </button>
        <button type="button" class="ui-topbar__icon-btn" aria-label="Ayuda">
          <i class="pi pi-question-circle"></i>
        </button>
        <!-- TODO: dropdown del menú de usuario -->
        <button type="button" class="ui-topbar__avatar" aria-label="Menú de usuario">
          DP
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }

    .ui-topbar {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: var(--ds-topbar-h);
      padding: 0 var(--space-4);
      background: var(--brand-shell-bg);
      color: #f1f5f9;
      box-shadow: 0 1px 3px rgba(0,0,0,.35);
    }

    .ui-topbar__hamburger {
      width: var(--ds-touch-target);
      height: var(--ds-touch-target);
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: rgba(255,255,255,.85);
      cursor: pointer;
      font-size: 18px;
    }
    .ui-topbar__hamburger:hover { color: #fff; }

    .ui-topbar__brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .ui-topbar__logo-box {
      width: 28px;
      height: 28px;
      background: var(--brand-primary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
      flex-shrink: 0;
      letter-spacing: -.5px;
    }
    .ui-topbar__tenant-name {
      color: #f1f5f9;
      font-weight: 600;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ui-topbar__tenant-badge {
      font-size: 9px;
      background: var(--brand-primary);
      color: #fff;
      padding: 1px 6px;
      border-radius: 8px;
      letter-spacing: .04em;
    }

    .ui-topbar__search {
      flex: 1;
      max-width: 420px;
      margin: 0 var(--space-3);
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 6px;
      padding: 7px 10px;
      color: rgba(255,255,255,.6);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: var(--space-1);
      cursor: text;
      user-select: none;
    }

    .ui-topbar__actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--space-1);
    }

    .ui-topbar__icon-btn {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255,255,255,.7);
      font-size: 14px;
      transition: background .15s, color .15s;
      position: relative;
    }
    .ui-topbar__icon-btn:hover {
      background: rgba(255,255,255,.16);
      color: #fff;
    }
    .ui-topbar__icon-btn--notif::after {
      content: '3';
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--ds-danger);
      color: #fff;
      font-size: 9px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .ui-topbar__avatar {
      width: 32px;
      height: 32px;
      background: var(--brand-primary);
      border: 2px solid transparent;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: border-color .15s;
    }
    .ui-topbar__avatar:hover { border-color: rgba(255,255,255,.4); }

    /* Mobile sizing for action buttons — meet 48x48 touch target */
    @media (max-width: 767px) {
      .ui-topbar { padding: 0 var(--space-3); }
      .ui-topbar__icon-btn,
      .ui-topbar__avatar {
        width: var(--ds-touch-target);
        height: var(--ds-touch-target);
      }
    }
  `],
})
export class TopbarComponent {
  readonly menuToggle = output<void>();

  private readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);

  protected readonly tenantName     = computed(() => this.tenantConfig()?.name ?? 'LabCore');
  protected readonly tenantInitials = computed(() => initials(this.tenantName()));
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
```

Notes:
- The previous `logout()` action and `TokenService`/`Router` imports are intentionally removed. Logout will be re-introduced when the profile dropdown is built (next iteration). The user can still log out via `/login` flows if needed; no production user has access to the shell without logout being available at the route level.
- The avatar shows fixed initials `DP` for now — wiring to the actual logged-in user comes with the profile dropdown task.

- [ ] **Step 2: Build the project**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke**

Run: `npm start`.
Expected:
- Topbar has dark chrome.
- Logo box shows tenant initials (e.g. "LA" if tenant name is "LaboratoApp", default "LC" for "LabCore").
- Tenant name and "Admin" badge visible.
- Search field is visually styled, **does nothing** on click.
- Notif/help/avatar buttons render; bell has a red "3" dot.
- On mobile width, hamburger appears and search disappears.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout/topbar/topbar.component.ts
git commit -m "feat(layout): rewrite topbar to v2 visual (logo, search placeholder, action icons)"
```

---

## Task 9: Adjust `admin-shell.component.ts` for the new chrome

**Files:**
- Modify: `src/app/layout/admin-shell/admin-shell.component.ts`

- [ ] **Step 1: Replace the shell styles to remove the old surface border and align with v2 chrome**

Overwrite `src/app/layout/admin-shell/admin-shell.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';

@Component({
  selector: 'ui-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent],
  template: `
    <div class="ui-admin-shell">
      <ui-sidebar class="ui-show-desktop ui-admin-shell__sidebar" />

      <p-drawer
        [(visible)]="drawerOpen"
        position="left"
        [modal]="true"
        styleClass="ui-admin-shell__mobile-drawer">
        <ui-sidebar (itemClick)="drawerOpen.set(false)" />
      </p-drawer>

      <div class="ui-admin-shell__main">
        <ui-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="ui-admin-shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .ui-admin-shell {
      display: flex;
      height: 100dvh;
      overflow: hidden;
      background: var(--ds-bg);
    }
    .ui-admin-shell__sidebar {
      width: var(--ds-sidebar-w);
      flex-shrink: 0;
    }
    .ui-admin-shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .ui-admin-shell__content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
      background: var(--ds-bg);
    }
    @media (max-width: 767px) {
      .ui-admin-shell__content { padding: var(--space-4); }
    }

    :host ::ng-deep .ui-admin-shell__mobile-drawer .p-drawer-content {
      padding: 0;
      background: var(--brand-shell-bg);
    }
    :host ::ng-deep .ui-admin-shell__mobile-drawer {
      width: 280px;
    }
  `],
})
export class AdminShellComponent {
  readonly drawerOpen = signal(false);
}
```

Changes vs the previous version:
- Removed the `border-right: 1px solid var(--ds-surface)` on the sidebar slot — the sidebar now has its own dark chrome with no border.
- Use `100dvh` instead of `100vh` (better mobile address-bar handling).
- Add `min-width: 0` on `__main` to allow flex children with text to shrink.
- Drawer styled via `::ng-deep` to remove default padding and apply the shell bg.

- [ ] **Step 2: Build and smoke test**

Run: `npm run build` then `npm start`.
Expected:
- Desktop: sidebar visible on the left, content on the right, topbar on top of content. No seam between sidebar and topbar (both share the dark chrome).
- Mobile: sidebar hidden, hamburger in topbar opens a left drawer with the same sidebar inside; clicking any item closes the drawer.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout/admin-shell/admin-shell.component.ts
git commit -m "feat(layout): align admin-shell with v2 chrome (remove border, dvh, drawer styling)"
```

---

## Task 10: Delete the legacy `shell.component.ts`

**Files:**
- Delete: `src/app/layout/shell/shell.component.ts`

- [ ] **Step 1: Confirm no references remain**

Run (Bash):
```
grep -rn "ShellComponent\|layout/shell" src/ --include='*.ts'
```
Expected: only matches to `AdminShellComponent` / `layout/admin-shell`. If anything points to `layout/shell/shell.component`, fix it before deleting.

- [ ] **Step 2: Delete the file (and the now-empty folder)**

Run:
```
rm src/app/layout/shell/shell.component.ts
rmdir src/app/layout/shell
```

- [ ] **Step 3: Build to confirm**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/layout/shell
git commit -m "chore(layout): remove legacy ShellComponent (replaced by admin-shell)"
```

---

## Task 11: Update the `laboratory-ui` skill — replace §"Formulario de creación o edición"

**Files:**
- Modify: `.claude/skills/laboratory-ui/SKILL.md`

- [ ] **Step 1: Locate the existing section**

The current section starts at line 237 of `.claude/skills/laboratory-ui/SKILL.md`:

```markdown
### Formulario de creación o edición
- **Desktop:** `p-dialog` (520px form simple, 720px extenso, 900px con tabla embebida).
- **Mobile:** dialog full-screen, o pantalla completa con header propio si el formulario tiene 3+ secciones.
- **Wizard de pasos** en mobile cuando el formulario es muy largo; el mismo formulario en desktop se ve completo.
```

- [ ] **Step 2: Replace it with the new drawer-vs-stepper rule**

Replace the entire `### Formulario de creación o edición` block (the four lines shown above) with the following:

```markdown
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
```

Use the Edit tool with `old_string` matching the exact original 4 lines (including the `### Formulario de creación o edición` heading), and `new_string` being the replacement block above.

- [ ] **Step 3: Verify the file still parses as valid markdown**

Run (Bash):
```
head -5 .claude/skills/laboratory-ui/SKILL.md
grep -n '^### ' .claude/skills/laboratory-ui/SKILL.md | head -20
```
Expected: front-matter intact (`---` opening on line 1), the new `### Formulario de creación o edición` section appears in the list, no stray heading anomalies.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/laboratory-ui/SKILL.md
git commit -m "docs(skill): add drawer-vs-stepper rule to laboratory-ui"
```

---

## Task 12: Final verification

**Files:** none (manual check)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 2: Dev server + visual checklist**

Run: `npm start`. Visit `http://localhost:4200/`.

Walk through this checklist:
- [ ] `/` redirects to `/home` and renders the "Inicio" empty state.
- [ ] Sidebar has 5 sections: Principal · Core clínico · Gestión · Servicios clínicos · Administración.
- [ ] Section labels are uppercase, tiny, semi-transparent.
- [ ] Items between sections are separated by thin horizontal dividers.
- [ ] Clicking "Analítica" expands its three sub-items with a chevron rotation.
- [ ] Visiting `/analitica/pre-analitica` auto-expands "Analítica" and marks the sub-item active.
- [ ] "Turnos" shows a red badge "4", "Atención" shows a green badge "3".
- [ ] "Médicos derivantes" and "Stock e insumos" show a "Beta" chip; "SaaS Admin" shows a "Root" chip.
- [ ] Items for inactive modules are hidden (test by clearing the tenant config or with a tenant whose `modules` array omits them).
- [ ] The active item has a 3px white left-bar accent.
- [ ] Topbar dark chrome matches sidebar — no visible seam.
- [ ] Logo box shows tenant initials, tenant name, and "Admin" badge.
- [ ] Search field is styled but does nothing on click/focus.
- [ ] Notification bell shows a red "3" dot, help and avatar buttons render.
- [ ] At width ≤ 768px: sidebar hides, hamburger appears in topbar, tapping it opens a 280px left drawer with the same sidebar; tapping any item closes it.
- [ ] In DevTools, changing `--brand-primary` on `:root` updates the sidebar/topbar shade and the active-item accent live.

- [ ] **Step 3: Make a final tidy commit if any small fixes were needed during verification**

If you applied any small visual tweak during the checklist, commit it:

```bash
git add -A
git commit -m "fix(layout): visual tweaks from v2 port verification"
```

If no fixes were needed, skip this step.

- [ ] **Step 4: Done**

Branch is ready for review. The shell, sidebar, topbar, and skill are all updated. Profile dropdown, side panels, and logout modal are tracked for the next iteration (see spec §16).
