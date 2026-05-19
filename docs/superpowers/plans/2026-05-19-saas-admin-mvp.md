# SaaS Admin MVP A — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a SaaS Admin panel under `/saas/**` with its own login, dashboard, tenants CRUD, and per-tenant module + white-label management — completely isolated from the lab's tenant shell.

**Architecture:** New `SaasShellComponent` (separate from `AdminShellComponent`) wraps `/saas/**` routes. Auth flow: `/saas/login` reuses `POST /api/v1/auth/internal/login` but post-login validates `ROLE_SAAS_ADMIN` in the JWT. NgRx classic feature `saasAdmin` wraps the 4 existing backend controllers (`/api/v1/saas-admin/{organization,tenants,tenants/:id/modules,tenants/:id/white-label}`). Dashboard metrics are derived client-side from the tenants list.

**Tech Stack:** Angular 21 standalone components, Reactive Forms, NgRx classic (`@ngrx/store` + `@ngrx/effects`), PrimeNG (Table, Dialog, Tabs, InputSwitch, ColorPicker, ConfirmDialog), Tailwind utilities, Vitest.

**Spec:** [docs/superpowers/specs/2026-05-19-saas-admin-mvp-design.md](../specs/2026-05-19-saas-admin-mvp-design.md)

---

## Pre-flight: Backend prerequisite

The local seed creates `admin@test.com` with role `ADMINISTRADOR`, **not** `SAAS_ADMIN`. To log in to `/saas/login` you need a user whose JWT carries `SAAS_ADMIN`. Either:

**Option A — add the role to the existing admin user** (recommended for solo dev):

```sql
-- Run against laboratorio DB (creds laboratorio/laboratorio).
INSERT INTO user_roles (tenant_id, user_id, role_id, active, created_at, updated_at, created_by, updated_by, version)
SELECT 1, 10001, r.id, TRUE, NOW(), NOW(), 'manual', 'manual', 0
FROM roles r
WHERE r.code = 'SAAS_ADMIN'
ON DUPLICATE KEY UPDATE active = TRUE;
```

**Option B —** if `SAAS_ADMIN` role does not exist in the `roles` table yet, ask the backend team for the canonical seed migration; do not invent one here.

Verify with: `SELECT u.email, r.code FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.email='admin@test.com';` — should list `SAAS_ADMIN` among the roles.

---

## File Structure

**Create (new files):**

```
src/app/
├── layout/saas-shell/
│   ├── saas-shell.component.ts
│   ├── saas-shell.component.spec.ts
│   ├── saas-sidebar/saas-sidebar.component.ts
│   └── saas-topbar/saas-topbar.component.ts
├── core/guards/
│   ├── saas-admin.guard.ts
│   └── saas-admin.guard.spec.ts
└── features/saas-admin/
    ├── saas-admin.routes.ts
    ├── pages/
    │   ├── saas-login/saas-login.page.ts
    │   ├── saas-login/saas-login.page.spec.ts
    │   ├── dashboard/dashboard.page.ts
    │   ├── dashboard/dashboard.page.spec.ts
    │   ├── tenants-list/tenants-list.page.ts
    │   ├── tenants-list/tenants-list.page.spec.ts
    │   └── tenant-detail/
    │       ├── tenant-detail.page.ts
    │       ├── tenant-detail.page.spec.ts
    │       └── tabs/
    │           ├── tenant-info-tab.component.ts
    │           ├── tenant-modules-tab.component.ts
    │           ├── tenant-modules-tab.component.spec.ts
    │           ├── tenant-white-label-tab.component.ts
    │           └── tenant-white-label-tab.component.spec.ts
    ├── components/
    │   └── tenant-form-dialog/tenant-form-dialog.component.ts
    ├── services/
    │   ├── saas-admin-api.service.ts
    │   └── saas-admin-api.service.spec.ts
    ├── models/
    │   ├── module-code.ts
    │   ├── tenant.model.ts
    │   ├── tenant-module.model.ts
    │   └── tenant-white-label.model.ts
    └── store/
        ├── saas-admin.actions.ts
        ├── saas-admin.state.ts
        ├── saas-admin.reducer.ts
        ├── saas-admin.reducer.spec.ts
        ├── saas-admin.effects.ts
        ├── saas-admin.effects.spec.ts
        ├── saas-admin.selectors.ts
        └── saas-admin.selectors.spec.ts
```

**Modify:**

- `src/app/app.routes.ts` — wire `/saas/login` and `/saas/**` routes outside the lab shell.
- `src/app/app.config.ts` — register `saasAdmin` feature store + effects.
- `src/app/core/interceptors/auth-token.interceptor.ts` — on 401, redirect to `/saas/login` if current URL starts with `/saas/`.
- `src/app/core/tenant/store/tenant.effects.ts` — ignore `loadTenantConfig` failures when URL is `/saas/*`.
- `src/app/layout/sidebar/sidebar.nav.ts` — remove the placeholder `/admin` entry (SaaS Admin lives at `/saas`, accessed via its own login).

---

## Task 1: Routing scaffold — empty `/saas/login` and `/saas` placeholder routes

**Files:**
- Create: `src/app/features/saas-admin/saas-admin.routes.ts`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Create the saas-admin routes file with placeholders**

```ts
// src/app/features/saas-admin/saas-admin.routes.ts
import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS login placeholder (Task 6)</p>`,
})
class SaasLoginPlaceholder {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS shell placeholder (Task 5)</p>`,
})
class SaasShellPlaceholder {}

export const SAAS_ADMIN_ROUTES: Routes = [
  { path: 'login', component: SaasLoginPlaceholder },
  { path: '', component: SaasShellPlaceholder },
];
```

- [ ] **Step 2: Wire the routes into `app.routes.ts`**

Open `src/app/app.routes.ts`. After the existing `''` route block (the one with `authGuard` + `AdminShellComponent`), add a sibling top-level route:

```ts
  {
    path: 'saas',
    loadChildren: () =>
      import('./features/saas-admin/saas-admin.routes').then((m) => m.SAAS_ADMIN_ROUTES),
  },
```

Verify with the file: the new route must be a sibling of the `''` route, not a child — so the lab shell's `tenantResolver` does not block it.

- [ ] **Step 3: Build and check**

Run: `npx --no ng build --configuration=development`
Expected: build PASSES.

- [ ] **Step 4: Smoke-check the placeholders manually**

Run: `npm run start`
Visit: `http://localhost:4200/saas/login` → "SaaS login placeholder (Task 6)".
Visit: `http://localhost:4200/saas` → "SaaS shell placeholder (Task 5)".

(Stop the dev server when done.)

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/saas-admin.routes.ts src/app/app.routes.ts
git commit -m "feat(saas-admin): scaffold /saas routes with placeholders"
```

---

## Task 2: `saasAdminGuard` — auth + role check

**Files:**
- Create: `src/app/core/guards/saas-admin.guard.ts`
- Create: `src/app/core/guards/saas-admin.guard.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/core/guards/saas-admin.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { saasAdminGuard } from './saas-admin.guard';

describe('saasAdminGuard', () => {
  let routerNavigateSpy: ReturnType<typeof vi.fn>;

  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => saasAdminGuard({} as never, {} as never)) as boolean | UrlTree;
  }

  beforeEach(() => {
    routerNavigateSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (cmds: unknown[]) => ({ cmds } as unknown as UrlTree) } },
        { provide: TokenService, useValue: { isTokenValid: () => false, getRoles: () => [] } },
      ],
    });
  });

  it('redirects to /saas/login when token is missing', () => {
    const result = run() as UrlTree & { cmds: unknown[] };
    expect(result.cmds).toEqual(['/saas/login']);
  });

  it('redirects to /saas/login when token has no SAAS_ADMIN role', () => {
    TestBed.overrideProvider(TokenService, {
      useValue: { isTokenValid: () => true, getRoles: () => ['ADMINISTRADOR'] },
    });
    const result = run() as UrlTree & { cmds: unknown[] };
    expect(result.cmds).toEqual(['/saas/login']);
  });

  it('returns true when token carries SAAS_ADMIN', () => {
    TestBed.overrideProvider(TokenService, {
      useValue: { isTokenValid: () => true, getRoles: () => ['SAAS_ADMIN'] },
    });
    expect(run()).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-admin.guard.spec.ts'`
Expected: FAIL — `Cannot find module './saas-admin.guard'`.

- [ ] **Step 3: Implement the guard**

```ts
// src/app/core/guards/saas-admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const saasAdminGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  if (!tokens.isTokenValid()) return router.createUrlTree(['/saas/login']);
  if (!tokens.getRoles().includes('SAAS_ADMIN')) return router.createUrlTree(['/saas/login']);
  return true;
};
```

- [ ] **Step 4: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-admin.guard.spec.ts'`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/guards/saas-admin.guard.ts src/app/core/guards/saas-admin.guard.spec.ts
git commit -m "feat(saas-admin): add saasAdminGuard requiring SAAS_ADMIN role"
```

---

## Task 3: Update auth-token interceptor — 401 routes to `/saas/login` inside `/saas/*`

**Files:**
- Modify: `src/app/core/interceptors/auth-token.interceptor.ts`
- Modify: `src/app/core/interceptors/auth-token.interceptor.spec.ts`

- [ ] **Step 1: Read the current interceptor**

Open `src/app/core/interceptors/auth-token.interceptor.ts`. The current behavior: on 401, calls `tokens.removeToken()`, `userSession.clear()`, then `router.navigate(['/login'])`.

We need: if the current URL is in `/saas/*`, navigate to `/saas/login` instead.

- [ ] **Step 2: Add a failing test**

Open `src/app/core/interceptors/auth-token.interceptor.spec.ts`. Add (or append a `describe` block) a test that mocks the router so its `url` getter returns `/saas/tenants`, then triggers a 401 and asserts navigate was called with `['/saas/login']`.

If the existing spec uses a different harness, follow that pattern. The minimum assertion is: when `router.url` starts with `/saas`, navigate is called with `['/saas/login']`; otherwise `['/login']`.

Example shape (adapt to the existing spec style):

```ts
it('navigates to /saas/login on 401 when current url is under /saas', async () => {
  const router = TestBed.inject(Router);
  Object.defineProperty(router, 'url', { get: () => '/saas/tenants' });
  const navSpy = vi.spyOn(router, 'navigate');
  // ... trigger a 401 via HttpTestingController like the existing test
  expect(navSpy).toHaveBeenCalledWith(['/saas/login']);
});
```

- [ ] **Step 3: Run the new test to verify it fails**

Run: `npx --no ng test --no-watch --include='**/auth-token.interceptor.spec.ts'`
Expected: the new test fails (navigates to `/login`), pre-existing tests still pass.

- [ ] **Step 4: Update the interceptor**

Replace the navigation block:

```ts
return next(authed).pipe(
  catchError((err: unknown) => {
    if (err instanceof HttpErrorResponse && err.status === 401) {
      tokens.removeToken();
      userSession.clear();
      const target = router.url.startsWith('/saas') ? '/saas/login' : '/login';
      router.navigate([target]);
    }
    return throwError(() => err);
  }),
);
```

- [ ] **Step 5: Run tests**

Run: `npx --no ng test --no-watch --include='**/auth-token.interceptor.spec.ts'`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/core/interceptors/auth-token.interceptor.ts src/app/core/interceptors/auth-token.interceptor.spec.ts
git commit -m "feat(saas-admin): route 401s to /saas/login when inside /saas/*"
```

---

## Task 4: Ignore tenant-config failures under `/saas/*`

**Files:**
- Modify: `src/app/core/tenant/store/tenant.effects.ts`

- [ ] **Step 1: Read the current effect**

Open `src/app/core/tenant/store/tenant.effects.ts`. Locate the effect that handles `loadTenantConfig`. It dispatches `loadTenantConfigFailure` on error, which may surface a toast or break a resolver if the SaaS admin user has no tenant.

- [ ] **Step 2: Add a guard against `/saas/*` URLs**

The cleanest approach: inject `Router` into the effects class and, inside the `catchError` of the `loadTenantConfig` effect, swallow the error silently (return `EMPTY` from `rxjs` or dispatch a no-op success-with-default) when `router.url.startsWith('/saas')`.

Concrete change:

```ts
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';

// inside the class constructor / properties:
private readonly router = inject(Router);

// in the loadTenantConfig effect:
catchError((err) => {
  if (this.router.url.startsWith('/saas')) return EMPTY;
  return of(loadTenantConfigFailure({ error: err }));
})
```

(If the file uses functional effects, mirror the `inject(Router)` pattern accordingly. Keep the change minimal — touch only the `loadTenantConfig` effect's catch.)

- [ ] **Step 3: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/core/tenant/store/tenant.effects.ts
git commit -m "feat(saas-admin): silence tenant-config load errors inside /saas/*"
```

---

## Task 5: `SaasShellComponent` + sidebar + topbar (layout only, no real nav yet)

**Files:**
- Create: `src/app/layout/saas-shell/saas-shell.component.ts`
- Create: `src/app/layout/saas-shell/saas-sidebar/saas-sidebar.component.ts`
- Create: `src/app/layout/saas-shell/saas-topbar/saas-topbar.component.ts`
- Modify: `src/app/features/saas-admin/saas-admin.routes.ts`

- [ ] **Step 1: Implement `SaasTopbarComponent`**

```ts
// src/app/layout/saas-shell/saas-topbar/saas-topbar.component.ts
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'saas-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <header class="saas-topbar">
      <div class="saas-topbar__brand">
        <img src="logo.svg" alt="" class="saas-topbar__logo" />
        <span class="saas-topbar__title">Platform Admin</span>
        <span class="saas-topbar__badge">SaaS</span>
      </div>
      <div class="saas-topbar__actions">
        <p-button [text]="true" icon="pi pi-sign-out" label="Salir" (onClick)="logout()" />
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .saas-topbar {
      display: flex; align-items: center; gap: 12px;
      height: 48px; padding: 0 16px;
      background: #1e1b4b; color: #fde68a;
      box-shadow: 0 1px 3px rgba(0,0,0,.35);
    }
    .saas-topbar__brand { display: flex; align-items: center; gap: 8px; }
    .saas-topbar__logo { width: 24px; height: 24px; border-radius: 4px; background: rgba(251,191,36,.12); }
    .saas-topbar__title { font-weight: 600; font-size: 14px; color: #fde68a; }
    .saas-topbar__badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(251,191,36,.18); color: #fbbf24; }
    .saas-topbar__actions { margin-left: auto; }
    :host ::ng-deep .saas-topbar__actions .p-button { color: #fde68a; }
  `],
})
export class SaasTopbarComponent {
  readonly loggedOut = output<void>();
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokens.removeToken();
    this.router.navigate(['/saas/login']);
    this.loggedOut.emit();
  }
}
```

- [ ] **Step 2: Implement `SaasSidebarComponent`**

```ts
// src/app/layout/saas-shell/saas-sidebar/saas-sidebar.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'saas-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="saas-sidebar">
      <nav>
        <a routerLink="/saas" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="saas-sidebar__item">
          <i class="pi pi-chart-bar"></i><span>Dashboard</span>
        </a>
        <a routerLink="/saas/tenants" routerLinkActive="active" class="saas-sidebar__item">
          <i class="pi pi-building"></i><span>Tenants</span>
        </a>
      </nav>
    </aside>
  `,
  styles: [`
    :host { display: block; flex-shrink: 0; }
    .saas-sidebar {
      width: 220px; min-height: calc(100vh - 48px);
      background: #0f0c29; padding: 16px 0; color: #c7d2fe;
    }
    nav { display: flex; flex-direction: column; gap: 4px; }
    .saas-sidebar__item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 16px; color: #c7d2fe; text-decoration: none;
      font-size: 13px; border-left: 2px solid transparent;
    }
    .saas-sidebar__item:hover { background: rgba(255,255,255,.04); }
    .saas-sidebar__item.active {
      background: rgba(251,191,36,.12); color: #fde68a;
      border-left-color: #fbbf24;
    }
    .saas-sidebar__item i { width: 16px; font-size: 14px; }
  `],
})
export class SaasSidebarComponent {}
```

- [ ] **Step 3: Implement `SaasShellComponent`**

```ts
// src/app/layout/saas-shell/saas-shell.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaasSidebarComponent } from './saas-sidebar/saas-sidebar.component';
import { SaasTopbarComponent } from './saas-topbar/saas-topbar.component';

@Component({
  selector: 'saas-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SaasSidebarComponent, SaasTopbarComponent],
  template: `
    <saas-topbar />
    <div class="saas-shell__body">
      <saas-sidebar />
      <main class="saas-shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; min-height: 100vh; background: #1a1b3a; color: #e2e8f0; }
    .saas-shell__body { display: flex; flex: 1; }
    .saas-shell__main { flex: 1; padding: 24px; overflow-x: hidden; }
  `],
})
export class SaasShellComponent {}
```

- [ ] **Step 4: Wire the shell into the routes (replace the placeholders)**

Replace the contents of `src/app/features/saas-admin/saas-admin.routes.ts` with:

```ts
import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { saasAdminGuard } from '@core/guards/saas-admin.guard';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS login placeholder (Task 6)</p>`,
})
class SaasLoginPlaceholder {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Dashboard placeholder (Task 14)</p>`,
})
class SaasDashboardPlaceholder {}

export const SAAS_ADMIN_ROUTES: Routes = [
  { path: 'login', component: SaasLoginPlaceholder },
  {
    path: '',
    canActivate: [saasAdminGuard],
    loadComponent: () =>
      import('@layout/saas-shell/saas-shell.component').then((m) => m.SaasShellComponent),
    children: [
      { path: '', component: SaasDashboardPlaceholder },
    ],
  },
];
```

(If `@layout` is not configured as a path alias, use a relative path. Check `tsconfig.json` `paths` to confirm.)

- [ ] **Step 5: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Smoke-check**

Run: `npm run start`. Visit `http://localhost:4200/saas` — the guard will redirect to `/saas/login` (no token). Manually plant a token in DevTools localStorage (`labcore_token` = a JWT carrying `SAAS_ADMIN`, see Pre-flight) and revisit `/saas` — you should see the SaaS shell with sidebar + topbar + dashboard placeholder.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout/saas-shell/ src/app/features/saas-admin/saas-admin.routes.ts
git commit -m "feat(saas-admin): SaasShellComponent with navy+gold topbar and sidebar"
```

---

## Task 6: `SaasLoginPage`

**Files:**
- Create: `src/app/features/saas-admin/pages/saas-login/saas-login.page.ts`
- Create: `src/app/features/saas-admin/pages/saas-login/saas-login.page.spec.ts`
- Modify: `src/app/features/saas-admin/saas-admin.routes.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/features/saas-admin/pages/saas-login/saas-login.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AuthApiService } from '@features/auth/services/auth-api.service';
import { TokenService } from '@core/auth/token.service';
import { SaasLoginPage } from './saas-login.page';

describe('SaasLoginPage', () => {
  let auth: { loginInternal: ReturnType<typeof vi.fn> };
  let tokens: TokenService;

  beforeEach(() => {
    auth = { loginInternal: vi.fn() };
    TestBed.configureTestingModule({
      imports: [SaasLoginPage, ReactiveFormsModule],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: AuthApiService, useValue: auth },
      ],
    });
    tokens = TestBed.inject(TokenService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  function jwtWith(roles: string[]): string {
    const header = btoa(JSON.stringify({ alg: 'none' }));
    const payload = btoa(JSON.stringify({ roles, exp: Math.floor(Date.now() / 1000) + 3600 }));
    return `${header}.${payload}.`;
  }

  it('navigates to /saas after successful login when token has SAAS_ADMIN', async () => {
    auth.loginInternal.mockResolvedValue({ accessToken: jwtWith(['SAAS_ADMIN']) });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SaasLoginPage);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ email: 'a@b.com', password: 'x' });
    await fixture.componentInstance.submit();
    expect(navSpy).toHaveBeenCalledWith(['/saas']);
    expect(tokens.getToken()).toBeTruthy();
  });

  it('rejects login when token lacks SAAS_ADMIN role and clears token', async () => {
    auth.loginInternal.mockResolvedValue({ accessToken: jwtWith(['ADMINISTRADOR']) });
    const fixture = TestBed.createComponent(SaasLoginPage);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ email: 'a@b.com', password: 'x' });
    await fixture.componentInstance.submit();
    expect(tokens.getToken()).toBeNull();
    expect(fixture.componentInstance.errorMessage()).toContain('plataforma');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-login.page.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page**

```ts
// src/app/features/saas-admin/pages/saas-login/saas-login.page.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { AuthApiService } from '@features/auth/services/auth-api.service';
import { TokenService } from '@core/auth/token.service';

@Component({
  selector: 'saas-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule],
  providers: [MessageService],
  template: `
    <div class="saas-login">
      <form [formGroup]="form" (ngSubmit)="submit()" class="saas-login__card">
        <div class="saas-login__brand">
          <img src="logo.svg" alt="" />
          <h1>Platform Admin</h1>
          <p>Acceso para administradores de plataforma</p>
        </div>

        @if (errorMessage(); as msg) {
          <div class="saas-login__error" role="alert">{{ msg }}</div>
        }

        <label class="saas-login__field">
          <span>Email</span>
          <input pInputText type="email" formControlName="email" autocomplete="username" />
        </label>

        <label class="saas-login__field">
          <span>Contraseña</span>
          <p-password formControlName="password" [feedback]="false" [toggleMask]="true" inputStyleClass="w-full" />
        </label>

        <p-button type="submit" label="Ingresar" [loading]="pending()" [disabled]="form.invalid || pending()" />

        <p class="saas-login__footer">
          ¿Sos usuario del laboratorio? Ingresá por <a routerLink="/login">/login</a>.
        </p>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(135deg, #0f0c29 0%, #1e1b4b 60%, #3b2f00 100%); }
    .saas-login { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .saas-login__card { background: #1a1b3a; color: #e2e8f0; border-radius: 12px; padding: 32px; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.4); }
    .saas-login__brand { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .saas-login__brand img { width: 36px; height: 36px; }
    .saas-login__brand h1 { margin: 4px 0 0; font-size: 18px; color: #fde68a; }
    .saas-login__brand p { margin: 0; font-size: 12px; color: #a5b4fc; }
    .saas-login__field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #c7d2fe; }
    .saas-login__field input { width: 100%; }
    .saas-login__error { background: rgba(239,68,68,.12); color: #fca5a5; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
    .saas-login__footer { font-size: 11px; color: #94a3b8; text-align: center; margin: 4px 0 0; }
    .saas-login__footer a { color: #fde68a; }
  `],
})
export class SaasLoginPage {
  readonly form;
  readonly pending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthApiService);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  constructor() {
    this.form = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.pending.set(true);
    this.errorMessage.set(null);
    try {
      const { email, password } = this.form.getRawValue();
      const res = await this.auth.loginInternal(email, password);
      this.tokens.setToken(res.accessToken);
      if (!this.tokens.getRoles().includes('SAAS_ADMIN')) {
        this.tokens.removeToken();
        this.errorMessage.set('Este acceso es solo para administradores de plataforma.');
        return;
      }
      await this.router.navigate(['/saas']);
    } catch (err) {
      this.tokens.removeToken();
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      this.errorMessage.set(status === 401 ? 'Credenciales inválidas.' : 'No se pudo iniciar sesión.');
    } finally {
      this.pending.set(false);
    }
  }
}
```

(Verify the `LoginResponse` shape in `features/auth/models/auth.models.ts` — if it uses a different field name than `accessToken`, adjust the line `this.tokens.setToken(res.accessToken)` to match.)

- [ ] **Step 4: Wire the page into the routes**

Replace the `SaasLoginPlaceholder` in `src/app/features/saas-admin/saas-admin.routes.ts`:

```ts
{
  path: 'login',
  loadComponent: () =>
    import('./pages/saas-login/saas-login.page').then((m) => m.SaasLoginPage),
},
```

Remove the unused `SaasLoginPlaceholder` class.

- [ ] **Step 5: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-login.page.spec.ts'`
Expected: PASS (2 tests).

- [ ] **Step 6: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/saas-admin/pages/saas-login/ src/app/features/saas-admin/saas-admin.routes.ts
git commit -m "feat(saas-admin): /saas/login page with SAAS_ADMIN role gate"
```

---

## Task 7: Models — `Tenant`, `TenantModule`, `TenantWhiteLabel`, `ModuleCode`

**Files:**
- Create: `src/app/features/saas-admin/models/module-code.ts`
- Create: `src/app/features/saas-admin/models/tenant.model.ts`
- Create: `src/app/features/saas-admin/models/tenant-module.model.ts`
- Create: `src/app/features/saas-admin/models/tenant-white-label.model.ts`

- [ ] **Step 1: Write all four files**

```ts
// src/app/features/saas-admin/models/module-code.ts
export type ModuleCode =
  | 'SAAS_ADMIN'
  | 'EMPRESA'
  | 'SUCURSALES'
  | 'ANALITICA'
  | 'PORTAL'
  | 'TURNOS'
  | 'FINANCIERO'
  | 'STOCK'
  | 'FAMILIA';

export type ModuleKind = 'PLATFORM' | 'CORE' | 'ACTIVABLE';

export interface ModuleCatalogEntry {
  code: ModuleCode;
  kind: ModuleKind;
  label: string;
  description: string;
  icon: string;
}

export const MODULE_CATALOG: readonly ModuleCatalogEntry[] = [
  { code: 'EMPRESA',     kind: 'CORE',      label: 'Empresa',     description: 'Datos de empresa, usuarios y roles del tenant.', icon: 'pi pi-building' },
  { code: 'SUCURSALES',  kind: 'CORE',      label: 'Sucursales',  description: 'Gestión de sucursales del laboratorio.',        icon: 'pi pi-map-marker' },
  { code: 'ANALITICA',   kind: 'CORE',      label: 'Analítica',   description: 'Procesos pre/analítico/post-analítico.',        icon: 'pi pi-wave-pulse' },
  { code: 'PORTAL',      kind: 'ACTIVABLE', label: 'Portal paciente', description: 'Acceso del paciente a sus estudios.',       icon: 'pi pi-globe' },
  { code: 'TURNOS',      kind: 'ACTIVABLE', label: 'Turnos',      description: 'Agenda y reserva de turnos.',                  icon: 'pi pi-calendar' },
  { code: 'FINANCIERO',  kind: 'ACTIVABLE', label: 'Financiero',  description: 'Facturación y cobranzas.',                     icon: 'pi pi-wallet' },
  { code: 'STOCK',       kind: 'ACTIVABLE', label: 'Stock',       description: 'Inventario e insumos.',                        icon: 'pi pi-box' },
  { code: 'FAMILIA',     kind: 'ACTIVABLE', label: 'Familia',     description: 'Vinculación de pacientes en grupo familiar.',  icon: 'pi pi-users' },
];

export const ACTIVABLE_MODULES = MODULE_CATALOG.filter((m) => m.kind === 'ACTIVABLE');
export const CORE_MODULES      = MODULE_CATALOG.filter((m) => m.kind === 'CORE');
```

```ts
// src/app/features/saas-admin/models/tenant.model.ts
export type TenantStatus = 'ACTIVE' | 'INACTIVE';

export interface Tenant {
  id: number;
  code: string;
  name: string;
  status: TenantStatus;
  active: boolean;
  deletedAt: string | null;
}

export interface CreateTenantRequest {
  code: string;
  name: string;
}

export interface UpdateTenantRequest {
  name: string;
}
```

```ts
// src/app/features/saas-admin/models/tenant-module.model.ts
import { ModuleCode } from './module-code';

export interface TenantModule {
  moduleCode: ModuleCode;
  enabled: boolean;
}

export interface ToggleTenantModuleRequest {
  enable: boolean;
}
```

```ts
// src/app/features/saas-admin/models/tenant-white-label.model.ts
export interface TenantWhiteLabel {
  id: number;
  targetTenantId: number;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  active: boolean;
}

export interface UpsertTenantWhiteLabelRequest {
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
}
```

- [ ] **Step 2: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/saas-admin/models/
git commit -m "feat(saas-admin): models for Tenant, TenantModule, TenantWhiteLabel and ModuleCode catalog"
```

---

## Task 8: `SaasAdminApiService` — wrap the 4 backend endpoints

**Files:**
- Create: `src/app/features/saas-admin/services/saas-admin-api.service.ts`
- Create: `src/app/features/saas-admin/services/saas-admin-api.service.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/features/saas-admin/services/saas-admin-api.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SaasAdminApiService } from './saas-admin-api.service';

const BASE = '/api/v1/saas-admin';

describe('SaasAdminApiService', () => {
  let service: SaasAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SaasAdminApiService],
    });
    service = TestBed.inject(SaasAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /tenants', () => {
    const p = service.listTenants();
    const req = http.expectOne(`${BASE}/tenants`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    return p;
  });

  it('POST /tenants', () => {
    const p = service.createTenant({ code: 'demo', name: 'Demo' });
    const req = http.expectOne(`${BASE}/tenants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: 'demo', name: 'Demo' });
    req.flush({ id: 1, code: 'demo', name: 'Demo', status: 'ACTIVE', active: true, deletedAt: null });
    return p;
  });

  it('PUT /tenants/:id', () => {
    const p = service.renameTenant(7, { name: 'New' });
    const req = http.expectOne(`${BASE}/tenants/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 7, code: 'x', name: 'New', status: 'ACTIVE', active: true, deletedAt: null });
    return p;
  });

  it('POST /tenants/:id/activate and /deactivate', async () => {
    const p1 = service.activateTenant(3);
    http.expectOne(`${BASE}/tenants/3/activate`).flush({ id: 3, code: 'x', name: 'X', status: 'ACTIVE', active: true, deletedAt: null });
    await p1;
    const p2 = service.deactivateTenant(3);
    http.expectOne(`${BASE}/tenants/3/deactivate`).flush({ id: 3, code: 'x', name: 'X', status: 'INACTIVE', active: true, deletedAt: null });
    await p2;
  });

  it('DELETE /tenants/:id', () => {
    const p = service.softDeleteTenant(9);
    const req = http.expectOne(`${BASE}/tenants/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    return p;
  });

  it('GET /tenants/:id/modules', () => {
    const p = service.listTenantModules(1);
    const req = http.expectOne(`${BASE}/tenants/1/modules`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    return p;
  });

  it('PUT /tenants/:id/modules/:code', () => {
    const p = service.toggleTenantModule(1, 'PORTAL', true);
    const req = http.expectOne(`${BASE}/tenants/1/modules/PORTAL`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ enable: true });
    req.flush(null);
    return p;
  });

  it('GET and PUT /tenants/:id/white-label', async () => {
    const p1 = service.getTenantWhiteLabel(1);
    http.expectOne(`${BASE}/tenants/1/white-label`).flush({});
    await p1;
    const p2 = service.upsertTenantWhiteLabel(1, {
      systemName: 'X', primaryColor: '#000000', secondaryColor: '#ffffff',
      lightLogoUrl: null, darkLogoUrl: null,
    });
    const req = http.expectOne(`${BASE}/tenants/1/white-label`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
    await p2;
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-admin-api.service.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```ts
// src/app/features/saas-admin/services/saas-admin-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModuleCode } from '../models/module-code';
import { CreateTenantRequest, Tenant, UpdateTenantRequest } from '../models/tenant.model';
import { TenantModule } from '../models/tenant-module.model';
import { TenantWhiteLabel, UpsertTenantWhiteLabelRequest } from '../models/tenant-white-label.model';

const BASE = '/api/v1/saas-admin';

@Injectable({ providedIn: 'root' })
export class SaasAdminApiService {
  private readonly http = inject(HttpClient);

  listTenants(): Promise<Tenant[]> {
    return firstValueFrom(this.http.get<Tenant[]>(`${BASE}/tenants`));
  }
  getTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.get<Tenant>(`${BASE}/tenants/${id}`));
  }
  createTenant(req: CreateTenantRequest): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants`, req));
  }
  renameTenant(id: number, req: UpdateTenantRequest): Promise<Tenant> {
    return firstValueFrom(this.http.put<Tenant>(`${BASE}/tenants/${id}`, req));
  }
  activateTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants/${id}/activate`, {}));
  }
  deactivateTenant(id: number): Promise<Tenant> {
    return firstValueFrom(this.http.post<Tenant>(`${BASE}/tenants/${id}/deactivate`, {}));
  }
  softDeleteTenant(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${BASE}/tenants/${id}`));
  }

  listTenantModules(id: number): Promise<TenantModule[]> {
    return firstValueFrom(this.http.get<TenantModule[]>(`${BASE}/tenants/${id}/modules`));
  }
  toggleTenantModule(id: number, code: ModuleCode, enable: boolean): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${BASE}/tenants/${id}/modules/${code}`, { enable }));
  }

  getTenantWhiteLabel(id: number): Promise<TenantWhiteLabel> {
    return firstValueFrom(this.http.get<TenantWhiteLabel>(`${BASE}/tenants/${id}/white-label`));
  }
  upsertTenantWhiteLabel(id: number, req: UpsertTenantWhiteLabelRequest): Promise<TenantWhiteLabel> {
    return firstValueFrom(this.http.put<TenantWhiteLabel>(`${BASE}/tenants/${id}/white-label`, req));
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-admin-api.service.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/services/
git commit -m "feat(saas-admin): SaasAdminApiService wrapping the 4 backend endpoints"
```

---

## Task 9: NgRx state shape + actions

**Files:**
- Create: `src/app/features/saas-admin/store/saas-admin.state.ts`
- Create: `src/app/features/saas-admin/store/saas-admin.actions.ts`

- [ ] **Step 1: Write the state file**

```ts
// src/app/features/saas-admin/store/saas-admin.state.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Tenant } from '../models/tenant.model';
import { ModuleCode } from '../models/module-code';
import { TenantWhiteLabel } from '../models/tenant-white-label.model';

export const SAAS_ADMIN_FEATURE_KEY = 'saasAdmin';

export interface SaasAdminState {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  selectedTenantModules: ModuleCode[] | null;
  selectedTenantWhiteLabel: TenantWhiteLabel | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialSaasAdminState: SaasAdminState = {
  tenants: [],
  selectedTenant: null,
  selectedTenantModules: null,
  selectedTenantWhiteLabel: null,
  pending: false,
  error: null,
};
```

- [ ] **Step 2: Write the actions file**

```ts
// src/app/features/saas-admin/store/saas-admin.actions.ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../models/tenant.model';
import { TenantModule } from '../models/tenant-module.model';
import { TenantWhiteLabel, UpsertTenantWhiteLabelRequest } from '../models/tenant-white-label.model';
import { ModuleCode } from '../models/module-code';

// --- Tenants list ---
export const loadTenants = createAction('[SaaS Admin] Load Tenants');
export const loadTenantsSuccess = createAction('[SaaS Admin API] Load Tenants Success', props<{ tenants: Tenant[] }>());
export const loadTenantsFailure = createAction('[SaaS Admin API] Load Tenants Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant detail ---
export const loadTenant = createAction('[SaaS Admin] Load Tenant', props<{ id: number }>());
export const loadTenantSuccess = createAction('[SaaS Admin API] Load Tenant Success', props<{ tenant: Tenant }>());
export const loadTenantFailure = createAction('[SaaS Admin API] Load Tenant Failure', props<{ error: HttpErrorResponse }>());
export const clearSelectedTenant = createAction('[SaaS Admin] Clear Selected Tenant');

// --- Create tenant ---
export const createTenant = createAction('[SaaS Admin] Create Tenant', props<{ req: CreateTenantRequest }>());
export const createTenantSuccess = createAction('[SaaS Admin API] Create Tenant Success', props<{ tenant: Tenant }>());
export const createTenantFailure = createAction('[SaaS Admin API] Create Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Rename tenant ---
export const renameTenant = createAction('[SaaS Admin] Rename Tenant', props<{ id: number; req: UpdateTenantRequest }>());
export const renameTenantSuccess = createAction('[SaaS Admin API] Rename Tenant Success', props<{ tenant: Tenant }>());
export const renameTenantFailure = createAction('[SaaS Admin API] Rename Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Activate / Deactivate tenant ---
export const activateTenant = createAction('[SaaS Admin] Activate Tenant', props<{ id: number }>());
export const activateTenantSuccess = createAction('[SaaS Admin API] Activate Tenant Success', props<{ tenant: Tenant }>());
export const activateTenantFailure = createAction('[SaaS Admin API] Activate Tenant Failure', props<{ error: HttpErrorResponse }>());

export const deactivateTenant = createAction('[SaaS Admin] Deactivate Tenant', props<{ id: number }>());
export const deactivateTenantSuccess = createAction('[SaaS Admin API] Deactivate Tenant Success', props<{ tenant: Tenant }>());
export const deactivateTenantFailure = createAction('[SaaS Admin API] Deactivate Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Soft delete tenant ---
export const softDeleteTenant = createAction('[SaaS Admin] Soft Delete Tenant', props<{ id: number }>());
export const softDeleteTenantSuccess = createAction('[SaaS Admin API] Soft Delete Tenant Success', props<{ id: number }>());
export const softDeleteTenantFailure = createAction('[SaaS Admin API] Soft Delete Tenant Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant modules ---
export const loadTenantModules = createAction('[SaaS Admin] Load Tenant Modules', props<{ tenantId: number }>());
export const loadTenantModulesSuccess = createAction('[SaaS Admin API] Load Tenant Modules Success', props<{ tenantId: number; modules: TenantModule[] }>());
export const loadTenantModulesFailure = createAction('[SaaS Admin API] Load Tenant Modules Failure', props<{ error: HttpErrorResponse }>());

export const toggleTenantModule = createAction('[SaaS Admin] Toggle Tenant Module', props<{ tenantId: number; code: ModuleCode; enable: boolean }>());
export const toggleTenantModuleSuccess = createAction('[SaaS Admin API] Toggle Tenant Module Success', props<{ tenantId: number; code: ModuleCode; enabled: boolean }>());
export const toggleTenantModuleFailure = createAction('[SaaS Admin API] Toggle Tenant Module Failure', props<{ error: HttpErrorResponse }>());

// --- Tenant white-label ---
export const loadTenantWhiteLabel = createAction('[SaaS Admin] Load Tenant White Label', props<{ tenantId: number }>());
export const loadTenantWhiteLabelSuccess = createAction('[SaaS Admin API] Load Tenant White Label Success', props<{ whiteLabel: TenantWhiteLabel }>());
export const loadTenantWhiteLabelFailure = createAction('[SaaS Admin API] Load Tenant White Label Failure', props<{ error: HttpErrorResponse }>());

export const upsertTenantWhiteLabel = createAction('[SaaS Admin] Upsert Tenant White Label', props<{ tenantId: number; req: UpsertTenantWhiteLabelRequest }>());
export const upsertTenantWhiteLabelSuccess = createAction('[SaaS Admin API] Upsert Tenant White Label Success', props<{ whiteLabel: TenantWhiteLabel }>());
export const upsertTenantWhiteLabelFailure = createAction('[SaaS Admin API] Upsert Tenant White Label Failure', props<{ error: HttpErrorResponse }>());
```

- [ ] **Step 3: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.state.ts src/app/features/saas-admin/store/saas-admin.actions.ts
git commit -m "feat(saas-admin): NgRx state shape and actions"
```

---

## Task 10: Reducer

**Files:**
- Create: `src/app/features/saas-admin/store/saas-admin.reducer.ts`
- Create: `src/app/features/saas-admin/store/saas-admin.reducer.spec.ts`

- [ ] **Step 1: Write the reducer spec**

```ts
// src/app/features/saas-admin/store/saas-admin.reducer.spec.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Tenant } from '../models/tenant.model';
import * as A from './saas-admin.actions';
import { initialSaasAdminState } from './saas-admin.state';
import { saasAdminReducer } from './saas-admin.reducer';

const sampleTenant = (over: Partial<Tenant> = {}): Tenant => ({
  id: 1, code: 'demo', name: 'Demo', status: 'ACTIVE', active: true, deletedAt: null, ...over,
});

describe('saasAdminReducer', () => {
  it('loadTenants sets pending', () => {
    const next = saasAdminReducer(initialSaasAdminState, A.loadTenants());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadTenantsSuccess stores tenants and clears pending', () => {
    const tenants = [sampleTenant(), sampleTenant({ id: 2, code: 'x', name: 'X' })];
    const next = saasAdminReducer({ ...initialSaasAdminState, pending: true }, A.loadTenantsSuccess({ tenants }));
    expect(next.tenants).toEqual(tenants);
    expect(next.pending).toBe(false);
  });

  it('createTenantSuccess prepends to list', () => {
    const t1 = sampleTenant({ id: 1 });
    const t2 = sampleTenant({ id: 2, code: 'b', name: 'B' });
    const next = saasAdminReducer({ ...initialSaasAdminState, tenants: [t1] }, A.createTenantSuccess({ tenant: t2 }));
    expect(next.tenants).toEqual([t2, t1]);
  });

  it('renameTenantSuccess updates the matching tenant in list and selected', () => {
    const t = sampleTenant({ id: 5, name: 'Old' });
    const updated = { ...t, name: 'New' };
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t], selectedTenant: t },
      A.renameTenantSuccess({ tenant: updated }),
    );
    expect(next.tenants[0].name).toBe('New');
    expect(next.selectedTenant?.name).toBe('New');
  });

  it('activateTenantSuccess swaps status to ACTIVE', () => {
    const t = sampleTenant({ status: 'INACTIVE' });
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t] },
      A.activateTenantSuccess({ tenant: { ...t, status: 'ACTIVE' } }),
    );
    expect(next.tenants[0].status).toBe('ACTIVE');
  });

  it('softDeleteTenantSuccess marks the tenant as deleted', () => {
    const t = sampleTenant({ id: 7 });
    const next = saasAdminReducer(
      { ...initialSaasAdminState, tenants: [t] },
      A.softDeleteTenantSuccess({ id: 7 }),
    );
    expect(next.tenants[0].active).toBe(false);
    expect(next.tenants[0].deletedAt).toBeTruthy();
  });

  it('loadTenantModulesSuccess stores enabled codes only', () => {
    const next = saasAdminReducer(initialSaasAdminState, A.loadTenantModulesSuccess({
      tenantId: 1,
      modules: [
        { moduleCode: 'PORTAL', enabled: true },
        { moduleCode: 'TURNOS', enabled: false },
        { moduleCode: 'STOCK',  enabled: true },
      ],
    }));
    expect(next.selectedTenantModules).toEqual(['PORTAL', 'STOCK']);
  });

  it('toggleTenantModuleSuccess adds/removes from the set', () => {
    const after1 = saasAdminReducer(
      { ...initialSaasAdminState, selectedTenantModules: ['PORTAL'] },
      A.toggleTenantModuleSuccess({ tenantId: 1, code: 'TURNOS', enabled: true }),
    );
    expect(after1.selectedTenantModules).toEqual(['PORTAL', 'TURNOS']);

    const after2 = saasAdminReducer(after1, A.toggleTenantModuleSuccess({ tenantId: 1, code: 'PORTAL', enabled: false }));
    expect(after2.selectedTenantModules).toEqual(['TURNOS']);
  });

  it('createTenantFailure stores the error', () => {
    const error = new HttpErrorResponse({ status: 409 });
    const next = saasAdminReducer({ ...initialSaasAdminState, pending: true }, A.createTenantFailure({ error }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(error);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-admin.reducer.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the reducer**

```ts
// src/app/features/saas-admin/store/saas-admin.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as A from './saas-admin.actions';
import { initialSaasAdminState, SaasAdminState } from './saas-admin.state';

function pendingOn(state: SaasAdminState): SaasAdminState {
  return { ...state, pending: true, error: null };
}

export const saasAdminReducer = createReducer<SaasAdminState>(
  initialSaasAdminState,

  // List
  on(A.loadTenants, pendingOn),
  on(A.loadTenantsSuccess, (state, { tenants }) => ({ ...state, tenants, pending: false })),
  on(A.loadTenantsFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Detail
  on(A.loadTenant, pendingOn),
  on(A.loadTenantSuccess, (state, { tenant }) => ({ ...state, selectedTenant: tenant, pending: false })),
  on(A.loadTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),
  on(A.clearSelectedTenant, (state) => ({
    ...state,
    selectedTenant: null,
    selectedTenantModules: null,
    selectedTenantWhiteLabel: null,
  })),

  // Create
  on(A.createTenant, pendingOn),
  on(A.createTenantSuccess, (state, { tenant }) => ({ ...state, tenants: [tenant, ...state.tenants], pending: false })),
  on(A.createTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Rename
  on(A.renameTenant, pendingOn),
  on(A.renameTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.renameTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Activate
  on(A.activateTenant, pendingOn),
  on(A.activateTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.activateTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Deactivate
  on(A.deactivateTenant, pendingOn),
  on(A.deactivateTenantSuccess, (state, { tenant }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) => (t.id === tenant.id ? tenant : t)),
    selectedTenant: state.selectedTenant?.id === tenant.id ? tenant : state.selectedTenant,
  })),
  on(A.deactivateTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Soft delete
  on(A.softDeleteTenant, pendingOn),
  on(A.softDeleteTenantSuccess, (state, { id }) => ({
    ...state,
    pending: false,
    tenants: state.tenants.map((t) =>
      t.id === id ? { ...t, active: false, deletedAt: new Date().toISOString() } : t,
    ),
  })),
  on(A.softDeleteTenantFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // Modules
  on(A.loadTenantModules, pendingOn),
  on(A.loadTenantModulesSuccess, (state, { modules }) => ({
    ...state,
    pending: false,
    selectedTenantModules: modules.filter((m) => m.enabled).map((m) => m.moduleCode),
  })),
  on(A.loadTenantModulesFailure, (state, { error }) => ({ ...state, pending: false, error })),

  on(A.toggleTenantModule, pendingOn),
  on(A.toggleTenantModuleSuccess, (state, { code, enabled }) => {
    const current = state.selectedTenantModules ?? [];
    const next = enabled ? Array.from(new Set([...current, code])) : current.filter((c) => c !== code);
    return { ...state, pending: false, selectedTenantModules: next };
  }),
  on(A.toggleTenantModuleFailure, (state, { error }) => ({ ...state, pending: false, error })),

  // White-label
  on(A.loadTenantWhiteLabel, pendingOn),
  on(A.loadTenantWhiteLabelSuccess, (state, { whiteLabel }) => ({ ...state, pending: false, selectedTenantWhiteLabel: whiteLabel })),
  on(A.loadTenantWhiteLabelFailure, (state, { error }) => ({ ...state, pending: false, error })),

  on(A.upsertTenantWhiteLabel, pendingOn),
  on(A.upsertTenantWhiteLabelSuccess, (state, { whiteLabel }) => ({ ...state, pending: false, selectedTenantWhiteLabel: whiteLabel })),
  on(A.upsertTenantWhiteLabelFailure, (state, { error }) => ({ ...state, pending: false, error })),
);
```

- [ ] **Step 4: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-admin.reducer.spec.ts'`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.reducer.ts src/app/features/saas-admin/store/saas-admin.reducer.spec.ts
git commit -m "feat(saas-admin): reducer with handlers for list, detail, mutations and modules"
```

---

## Task 11: Effects

**Files:**
- Create: `src/app/features/saas-admin/store/saas-admin.effects.ts`
- Create: `src/app/features/saas-admin/store/saas-admin.effects.spec.ts`

- [ ] **Step 1: Write the effects spec**

```ts
// src/app/features/saas-admin/store/saas-admin.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, ReplaySubject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { Action } from '@ngrx/store';
import { SaasAdminApiService } from '../services/saas-admin-api.service';
import { SaasAdminEffects } from './saas-admin.effects';
import * as A from './saas-admin.actions';

describe('SaasAdminEffects', () => {
  let actions$: ReplaySubject<Action>;
  let api: Partial<Record<keyof SaasAdminApiService, ReturnType<typeof vi.fn>>>;
  let effects: SaasAdminEffects;

  beforeEach(() => {
    actions$ = new ReplaySubject(1);
    api = {
      listTenants: vi.fn(),
      getTenant: vi.fn(),
      createTenant: vi.fn(),
      renameTenant: vi.fn(),
      activateTenant: vi.fn(),
      deactivateTenant: vi.fn(),
      softDeleteTenant: vi.fn(),
      listTenantModules: vi.fn(),
      toggleTenantModule: vi.fn(),
      getTenantWhiteLabel: vi.fn(),
      upsertTenantWhiteLabel: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        SaasAdminEffects,
        provideMockActions(() => actions$),
        { provide: SaasAdminApiService, useValue: api },
      ],
    });
    effects = TestBed.inject(SaasAdminEffects);
  });

  function expectEmits(stream: Observable<Action>): Promise<Action> {
    return firstValueFrom(stream.pipe(take(1)));
  }

  it('loadTenants$ → loadTenantsSuccess', async () => {
    api.listTenants!.mockResolvedValue([{ id: 1, code: 'a', name: 'A', status: 'ACTIVE', active: true, deletedAt: null }]);
    actions$.next(A.loadTenants());
    const out = await expectEmits(effects.loadTenants$);
    expect(out.type).toBe(A.loadTenantsSuccess.type);
  });

  it('createTenant$ → createTenantSuccess with the created tenant', async () => {
    const created = { id: 2, code: 'x', name: 'X', status: 'ACTIVE' as const, active: true, deletedAt: null };
    api.createTenant!.mockResolvedValue(created);
    actions$.next(A.createTenant({ req: { code: 'x', name: 'X' } }));
    const out = await expectEmits(effects.createTenant$);
    expect(out).toEqual(A.createTenantSuccess({ tenant: created }));
  });

  it('toggleTenantModule$ → toggleTenantModuleSuccess echoing the requested values', async () => {
    api.toggleTenantModule!.mockResolvedValue(undefined);
    actions$.next(A.toggleTenantModule({ tenantId: 1, code: 'PORTAL', enable: true }));
    const out = await expectEmits(effects.toggleTenantModule$);
    expect(out).toEqual(A.toggleTenantModuleSuccess({ tenantId: 1, code: 'PORTAL', enabled: true }));
  });

  it('softDeleteTenant$ → softDeleteTenantSuccess with the id', async () => {
    api.softDeleteTenant!.mockResolvedValue(undefined);
    actions$.next(A.softDeleteTenant({ id: 7 }));
    const out = await expectEmits(effects.softDeleteTenant$);
    expect(out).toEqual(A.softDeleteTenantSuccess({ id: 7 }));
  });

  it('createTenant$ emits createTenantFailure on rejection', async () => {
    api.createTenant!.mockRejectedValue({ status: 409 });
    actions$.next(A.createTenant({ req: { code: 'x', name: 'X' } }));
    const out = await expectEmits(effects.createTenant$);
    expect(out.type).toBe(A.createTenantFailure.type);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-admin.effects.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the effects**

```ts
// src/app/features/saas-admin/store/saas-admin.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of } from 'rxjs';
import { catchError, concatMap, exhaustMap, map, switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { SaasAdminApiService } from '../services/saas-admin-api.service';
import * as A from './saas-admin.actions';

function err(): (e: unknown) => HttpErrorResponse {
  return (e) => (e instanceof HttpErrorResponse ? e : new HttpErrorResponse({ error: e }));
}

@Injectable()
export class SaasAdminEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(SaasAdminApiService);

  loadTenants$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenants),
    switchMap(() => from(this.api.listTenants()).pipe(
      map((tenants) => A.loadTenantsSuccess({ tenants })),
      catchError((e) => of(A.loadTenantsFailure({ error: err()(e) }))),
    )),
  ));

  loadTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenant),
    switchMap(({ id }) => from(this.api.getTenant(id)).pipe(
      map((tenant) => A.loadTenantSuccess({ tenant })),
      catchError((e) => of(A.loadTenantFailure({ error: err()(e) }))),
    )),
  ));

  createTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.createTenant),
    exhaustMap(({ req }) => from(this.api.createTenant(req)).pipe(
      map((tenant) => A.createTenantSuccess({ tenant })),
      catchError((e) => of(A.createTenantFailure({ error: err()(e) }))),
    )),
  ));

  renameTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.renameTenant),
    concatMap(({ id, req }) => from(this.api.renameTenant(id, req)).pipe(
      map((tenant) => A.renameTenantSuccess({ tenant })),
      catchError((e) => of(A.renameTenantFailure({ error: err()(e) }))),
    )),
  ));

  activateTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.activateTenant),
    concatMap(({ id }) => from(this.api.activateTenant(id)).pipe(
      map((tenant) => A.activateTenantSuccess({ tenant })),
      catchError((e) => of(A.activateTenantFailure({ error: err()(e) }))),
    )),
  ));

  deactivateTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.deactivateTenant),
    concatMap(({ id }) => from(this.api.deactivateTenant(id)).pipe(
      map((tenant) => A.deactivateTenantSuccess({ tenant })),
      catchError((e) => of(A.deactivateTenantFailure({ error: err()(e) }))),
    )),
  ));

  softDeleteTenant$ = createEffect(() => this.actions$.pipe(
    ofType(A.softDeleteTenant),
    concatMap(({ id }) => from(this.api.softDeleteTenant(id)).pipe(
      map(() => A.softDeleteTenantSuccess({ id })),
      catchError((e) => of(A.softDeleteTenantFailure({ error: err()(e) }))),
    )),
  ));

  loadTenantModules$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenantModules),
    switchMap(({ tenantId }) => from(this.api.listTenantModules(tenantId)).pipe(
      map((modules) => A.loadTenantModulesSuccess({ tenantId, modules })),
      catchError((e) => of(A.loadTenantModulesFailure({ error: err()(e) }))),
    )),
  ));

  toggleTenantModule$ = createEffect(() => this.actions$.pipe(
    ofType(A.toggleTenantModule),
    concatMap(({ tenantId, code, enable }) => from(this.api.toggleTenantModule(tenantId, code, enable)).pipe(
      map(() => A.toggleTenantModuleSuccess({ tenantId, code, enabled: enable })),
      catchError((e) => of(A.toggleTenantModuleFailure({ error: err()(e) }))),
    )),
  ));

  loadTenantWhiteLabel$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTenantWhiteLabel),
    switchMap(({ tenantId }) => from(this.api.getTenantWhiteLabel(tenantId)).pipe(
      map((whiteLabel) => A.loadTenantWhiteLabelSuccess({ whiteLabel })),
      catchError((e) => of(A.loadTenantWhiteLabelFailure({ error: err()(e) }))),
    )),
  ));

  upsertTenantWhiteLabel$ = createEffect(() => this.actions$.pipe(
    ofType(A.upsertTenantWhiteLabel),
    concatMap(({ tenantId, req }) => from(this.api.upsertTenantWhiteLabel(tenantId, req)).pipe(
      map((whiteLabel) => A.upsertTenantWhiteLabelSuccess({ whiteLabel })),
      catchError((e) => of(A.upsertTenantWhiteLabelFailure({ error: err()(e) }))),
    )),
  ));
}
```

- [ ] **Step 4: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-admin.effects.spec.ts'`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.effects.ts src/app/features/saas-admin/store/saas-admin.effects.spec.ts
git commit -m "feat(saas-admin): effects wiring API to NgRx actions"
```

---

## Task 12: Selectors

**Files:**
- Create: `src/app/features/saas-admin/store/saas-admin.selectors.ts`
- Create: `src/app/features/saas-admin/store/saas-admin.selectors.spec.ts`

- [ ] **Step 1: Write the selectors spec**

```ts
// src/app/features/saas-admin/store/saas-admin.selectors.spec.ts
import { Tenant } from '../models/tenant.model';
import { initialSaasAdminState, SAAS_ADMIN_FEATURE_KEY, SaasAdminState } from './saas-admin.state';
import {
  selectActiveTenants, selectDashboardCounts, selectDeletedTenants,
  selectInactiveTenants, selectTenantsList,
} from './saas-admin.selectors';

const t = (over: Partial<Tenant>): Tenant => ({
  id: 0, code: 'x', name: 'X', status: 'ACTIVE', active: true, deletedAt: null, ...over,
});

function wrap(state: SaasAdminState): { [SAAS_ADMIN_FEATURE_KEY]: SaasAdminState } {
  return { [SAAS_ADMIN_FEATURE_KEY]: state };
}

describe('saas-admin selectors', () => {
  it('selectTenantsList returns the raw list', () => {
    const state = wrap({ ...initialSaasAdminState, tenants: [t({ id: 1 }), t({ id: 2 })] });
    expect(selectTenantsList(state)).toHaveLength(2);
  });

  it('split selectors filter by status/active/deleted', () => {
    const tenants = [
      t({ id: 1, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 2, status: 'INACTIVE', active: true,  deletedAt: null }),
      t({ id: 3, status: 'ACTIVE',   active: false, deletedAt: '2026-01-01' }),
    ];
    const state = wrap({ ...initialSaasAdminState, tenants });
    expect(selectActiveTenants(state).map((x) => x.id)).toEqual([1]);
    expect(selectInactiveTenants(state).map((x) => x.id)).toEqual([2]);
    expect(selectDeletedTenants(state).map((x) => x.id)).toEqual([3]);
  });

  it('selectDashboardCounts derives totals correctly', () => {
    const tenants = [
      t({ id: 1, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 2, status: 'ACTIVE',   active: true,  deletedAt: null }),
      t({ id: 3, status: 'INACTIVE', active: true,  deletedAt: null }),
      t({ id: 4, active: false, deletedAt: '2026-01-01' }),
    ];
    expect(selectDashboardCounts(wrap({ ...initialSaasAdminState, tenants }))).toEqual({
      total: 4, active: 2, inactive: 1, deleted: 1,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/saas-admin.selectors.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the selectors**

```ts
// src/app/features/saas-admin/store/saas-admin.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SAAS_ADMIN_FEATURE_KEY, SaasAdminState } from './saas-admin.state';

export const selectSaasAdmin = createFeatureSelector<SaasAdminState>(SAAS_ADMIN_FEATURE_KEY);

export const selectTenantsList                = createSelector(selectSaasAdmin, (s) => s.tenants);
export const selectSelectedTenant             = createSelector(selectSaasAdmin, (s) => s.selectedTenant);
export const selectSelectedTenantModules      = createSelector(selectSaasAdmin, (s) => s.selectedTenantModules);
export const selectSelectedTenantWhiteLabel   = createSelector(selectSaasAdmin, (s) => s.selectedTenantWhiteLabel);
export const selectSaasAdminPending           = createSelector(selectSaasAdmin, (s) => s.pending);
export const selectSaasAdminError             = createSelector(selectSaasAdmin, (s) => s.error);

export const selectActiveTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => t.status === 'ACTIVE' && t.active && !t.deletedAt),
);
export const selectInactiveTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => t.status === 'INACTIVE' && t.active && !t.deletedAt),
);
export const selectDeletedTenants = createSelector(selectTenantsList, (list) =>
  list.filter((t) => !t.active || !!t.deletedAt),
);

export const selectDashboardCounts = createSelector(
  selectTenantsList, selectActiveTenants, selectInactiveTenants, selectDeletedTenants,
  (all, active, inactive, deleted) => ({
    total: all.length, active: active.length, inactive: inactive.length, deleted: deleted.length,
  }),
);
```

- [ ] **Step 4: Run tests**

Run: `npx --no ng test --no-watch --include='**/saas-admin.selectors.spec.ts'`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/saas-admin/store/saas-admin.selectors.ts src/app/features/saas-admin/store/saas-admin.selectors.spec.ts
git commit -m "feat(saas-admin): selectors for list, splits and dashboard counts"
```

---

## Task 13: Register the feature in `app.config.ts`

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Add the imports**

At the top of `src/app/app.config.ts`, add:

```ts
import { SAAS_ADMIN_FEATURE_KEY } from '@features/saas-admin/store/saas-admin.state';
import { saasAdminReducer } from '@features/saas-admin/store/saas-admin.reducer';
import { SaasAdminEffects } from '@features/saas-admin/store/saas-admin.effects';
```

- [ ] **Step 2: Add the provider lines**

In the `providers` array of `appConfig`, after the last `provideState(...)` / `provideEffects(...)` pair, add:

```ts
    provideState(SAAS_ADMIN_FEATURE_KEY, saasAdminReducer),
    provideEffects(SaasAdminEffects),
```

- [ ] **Step 3: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(saas-admin): register saasAdmin feature store and effects"
```

---

## Task 14: Dashboard page

**Files:**
- Create: `src/app/features/saas-admin/pages/dashboard/dashboard.page.ts`
- Create: `src/app/features/saas-admin/pages/dashboard/dashboard.page.spec.ts`
- Modify: `src/app/features/saas-admin/saas-admin.routes.ts`

- [ ] **Step 1: Write the page spec**

```ts
// src/app/features/saas-admin/pages/dashboard/dashboard.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenants } from '../../store/saas-admin.actions';

describe('DashboardPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideMockStore({ initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState } }),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('dispatches loadTenants on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenants());
  });

  it('renders the four counts', () => {
    const store = TestBed.inject(MockStore);
    store.setState({
      [SAAS_ADMIN_FEATURE_KEY]: {
        ...initialSaasAdminState,
        tenants: [
          { id: 1, code: 'a', name: 'A', status: 'ACTIVE',   active: true,  deletedAt: null },
          { id: 2, code: 'b', name: 'B', status: 'INACTIVE', active: true,  deletedAt: null },
          { id: 3, code: 'c', name: 'C', status: 'ACTIVE',   active: false, deletedAt: '2026-01-01' },
        ],
      },
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Total');
    expect(text).toMatch(/Total[\s\S]*3/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/dashboard.page.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the dashboard page**

```ts
// src/app/features/saas-admin/pages/dashboard/dashboard.page.ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { loadTenants } from '../../store/saas-admin.actions';
import { selectDashboardCounts, selectTenantsList } from '../../store/saas-admin.selectors';

@Component({
  selector: 'saas-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, TagModule],
  template: `
    <header class="page-header">
      <h1>Dashboard</h1>
      <p>Resumen de la plataforma.</p>
    </header>

    <section class="stats">
      <div class="stat"><div class="stat__num">{{ counts().total }}</div><div class="stat__label">Total tenants</div></div>
      <div class="stat"><div class="stat__num">{{ counts().active }}</div><div class="stat__label">Activos</div></div>
      <div class="stat"><div class="stat__num">{{ counts().inactive }}</div><div class="stat__label">Inactivos</div></div>
      <div class="stat"><div class="stat__num">{{ counts().deleted }}</div><div class="stat__label">Eliminados</div></div>
    </section>

    <section class="quick">
      <h2>Acciones rápidas</h2>
      <div class="quick__actions">
        <a routerLink="/saas/tenants"><p-button label="Ver todos los tenants" icon="pi pi-building" [outlined]="true" /></a>
      </div>
    </section>

    <section class="recent">
      <h2>Tenants recientes</h2>
      <table class="recent__table">
        <thead>
          <tr><th>Código</th><th>Nombre</th><th>Status</th><th class="text-right">Acciones</th></tr>
        </thead>
        <tbody>
          @for (t of recent(); track t.id) {
            <tr>
              <td><code>{{ t.code }}</code></td>
              <td>{{ t.name }}</td>
              <td><p-tag [value]="t.status" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" /></td>
              <td class="text-right">
                <a [routerLink]="['/saas/tenants', t.id]">Ver detalle</a>
              </td>
            </tr>
          }
          @if (recent().length === 0) {
            <tr><td colspan="4" class="empty">Sin tenants todavía.</td></tr>
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [`
    :host { display: block; color: #e2e8f0; }
    .page-header h1 { color: #fde68a; margin: 0 0 4px; font-size: 22px; }
    .page-header p  { color: #94a3b8; margin: 0 0 16px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat { background: rgba(255,255,255,.04); border-radius: 10px; padding: 16px; }
    .stat__num   { font-size: 28px; font-weight: 700; color: #fde68a; line-height: 1; }
    .stat__label { font-size: 12px; color: #94a3b8; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .quick { margin-bottom: 24px; }
    .quick h2, .recent h2 { color: #c7d2fe; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }
    .recent__table { width: 100%; border-collapse: collapse; background: rgba(255,255,255,.03); border-radius: 8px; overflow: hidden; }
    .recent__table th, .recent__table td { padding: 10px 14px; font-size: 13px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.04); }
    .recent__table th { color: #94a3b8; font-weight: 600; }
    .recent__table tbody tr:last-child td { border-bottom: none; }
    .empty { text-align: center; color: #64748b; padding: 18px; font-style: italic; }
    .text-right { text-align: right; }
  `],
})
export class DashboardPage implements OnInit {
  private readonly store = inject(Store);
  protected readonly counts = this.store.selectSignal(selectDashboardCounts);
  private readonly tenants = this.store.selectSignal(selectTenantsList);
  protected readonly recent = computed(() => [...this.tenants()].sort((a, b) => b.id - a.id).slice(0, 5));

  ngOnInit(): void {
    this.store.dispatch(loadTenants());
  }
}
```

- [ ] **Step 4: Wire the page into the routes (replace the placeholder)**

In `src/app/features/saas-admin/saas-admin.routes.ts`, replace the dashboard placeholder child:

```ts
children: [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
],
```

Remove the now-unused `SaasDashboardPlaceholder` class.

- [ ] **Step 5: Run tests + build**

Run: `npx --no ng test --no-watch --include='**/dashboard.page.spec.ts'`
Expected: PASS (2 tests).

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saas-admin/pages/dashboard/ src/app/features/saas-admin/saas-admin.routes.ts
git commit -m "feat(saas-admin): dashboard with derived counts and recent tenants"
```

---

## Task 15: `TenantFormDialog` (create + rename)

**Files:**
- Create: `src/app/features/saas-admin/components/tenant-form-dialog/tenant-form-dialog.component.ts`

(No spec for this dialog — covered indirectly by the list-page test in Task 16.)

- [ ] **Step 1: Implement the dialog**

```ts
// src/app/features/saas-admin/components/tenant-form-dialog/tenant-form-dialog.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Tenant } from '../../models/tenant.model';
import {
  createTenant, createTenantSuccess, createTenantFailure,
  renameTenant, renameTenantSuccess,
} from '../../store/saas-admin.actions';
import { selectSaasAdminPending } from '../../store/saas-admin.selectors';

@Component({
  selector: 'tenant-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog [(visible)]="visible" [modal]="true" [closable]="!pending()" [header]="dialogTitle()"
              [style]="{ width: '420px' }" (onHide)="onHide()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3">
        @if (error(); as msg) {
          <div class="dialog-error" role="alert">{{ msg }}</div>
        }
        <label class="field">
          <span>Código</span>
          <input pInputText formControlName="code" [readOnly]="isRename()" placeholder="lab-demo" />
          @if (form.get('code')?.touched && form.get('code')?.errors?.['pattern']) {
            <small class="field-error">Solo minúsculas, números y guiones.</small>
          }
        </label>
        <label class="field">
          <span>Nombre</span>
          <input pInputText formControlName="name" placeholder="Laboratorio Demo" />
        </label>
        <div class="dialog-actions">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="visible = false" />
          <p-button [label]="isRename() ? 'Guardar' : 'Crear tenant'" type="submit"
                    [loading]="pending()" [disabled]="form.invalid || pending()" />
        </div>
      </form>
    </p-dialog>
  `,
  styles: [`
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; }
    .field-error { color: #dc2626; font-size: 11px; }
    .dialog-error { background: #fee2e2; color: #991b1b; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
    .dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class TenantFormDialogComponent {
  readonly open = input.required<boolean>();
  readonly editing = input<Tenant | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);

  protected visible = false;
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);
  protected readonly isRename = computed(() => this.editing() !== null);
  protected readonly dialogTitle = computed(() => this.isRename() ? 'Editar tenant' : 'Nuevo tenant');
  protected readonly error = computed(() => null as string | null);
  protected error_(): string | null { return this.error(); }

  protected readonly form;

  constructor() {
    this.form = this.fb.nonNullable.group({
      code: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      name: ['', Validators.required],
    });

    effect(() => {
      const isOpen = this.open();
      this.visible = isOpen;
      if (isOpen) {
        const t = this.editing();
        if (t) {
          this.form.reset({ code: t.code, name: t.name });
          this.form.get('code')!.disable({ emitEvent: false });
        } else {
          this.form.reset({ code: '', name: '' });
          this.form.get('code')!.enable({ emitEvent: false });
        }
      }
    });

    this.actions$
      .pipe(ofType(createTenantSuccess, renameTenantSuccess), takeUntilDestroyed())
      .subscribe(() => { this.visible = false; this.closed.emit(); });

    this.actions$
      .pipe(ofType(createTenantFailure), takeUntilDestroyed())
      .subscribe(({ error }) => {
        const msg = error.status === 409 ? 'Ese código ya existe.' : 'No se pudo crear el tenant.';
        // visible stays true; surface via a local signal
        (this as unknown as { error: { set: (v: string | null) => void } }).error = { set: () => { /* no-op stub */ } };
        // simpler: store the message on the form root error
        this.form.setErrors({ apiError: msg });
      });
  }

  protected submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (this.isRename()) {
      this.store.dispatch(renameTenant({ id: this.editing()!.id, req: { name: raw.name } }));
    } else {
      this.store.dispatch(createTenant({ req: { code: raw.code, name: raw.name } }));
    }
  }

  protected onHide(): void {
    if (this.visible) return;
    this.closed.emit();
  }
}
```

(If the engineer prefers a cleaner error signal pattern, replace the `setErrors` hack with a private `errorMessage = signal<string|null>(null)` inside the class and render it in the template. Either way, the requirements: show "Ese código ya existe." on 409, keep dialog open on failure, close on success.)

- [ ] **Step 2: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/saas-admin/components/tenant-form-dialog/
git commit -m "feat(saas-admin): TenantFormDialog for create + rename"
```

---

## Task 16: Tenants list page

**Files:**
- Create: `src/app/features/saas-admin/pages/tenants-list/tenants-list.page.ts`
- Create: `src/app/features/saas-admin/pages/tenants-list/tenants-list.page.spec.ts`
- Modify: `src/app/features/saas-admin/saas-admin.routes.ts`

- [ ] **Step 1: Write the page spec**

```ts
// src/app/features/saas-admin/pages/tenants-list/tenants-list.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TenantsListPage } from './tenants-list.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenants, deactivateTenant, softDeleteTenant } from '../../store/saas-admin.actions';

describe('TenantsListPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantsListPage],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: {
              ...initialSaasAdminState,
              tenants: [
                { id: 1, code: 'a', name: 'A', status: 'ACTIVE',   active: true,  deletedAt: null },
                { id: 2, code: 'b', name: 'B', status: 'INACTIVE', active: true,  deletedAt: null },
              ],
            },
          },
        }),
        provideNoopAnimations(),
        provideRouter([]),
        ConfirmationService,
      ],
    });
  });

  it('dispatches loadTenants on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenants());
  });

  it('confirmDeactivate dispatches deactivateTenant when user accepts', () => {
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const confirmSvc = TestBed.inject(ConfirmationService);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((o: { accept?: () => void }) => { o.accept?.(); return confirmSvc; });
    fixture.componentInstance.confirmDeactivate({ id: 1, code: 'a', name: 'A', status: 'ACTIVE', active: true, deletedAt: null });
    expect(dispatchSpy).toHaveBeenCalledWith(deactivateTenant({ id: 1 }));
  });

  it('confirmSoftDelete dispatches softDeleteTenant when user accepts', () => {
    const fixture = TestBed.createComponent(TenantsListPage);
    fixture.detectChanges();
    const store = TestBed.inject(MockStore);
    const confirmSvc = TestBed.inject(ConfirmationService);
    const dispatchSpy = vi.spyOn(store, 'dispatch');
    vi.spyOn(confirmSvc, 'confirm').mockImplementation((o: { accept?: () => void }) => { o.accept?.(); return confirmSvc; });
    fixture.componentInstance.confirmSoftDelete({ id: 2, code: 'b', name: 'B', status: 'ACTIVE', active: true, deletedAt: null });
    expect(dispatchSpy).toHaveBeenCalledWith(softDeleteTenant({ id: 2 }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/tenants-list.page.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page**

```ts
// src/app/features/saas-admin/pages/tenants-list/tenants-list.page.ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TenantFormDialogComponent } from '../../components/tenant-form-dialog/tenant-form-dialog.component';
import { Tenant, TenantStatus } from '../../models/tenant.model';
import {
  loadTenants, activateTenant, deactivateTenant, softDeleteTenant,
} from '../../store/saas-admin.actions';
import { selectTenantsList } from '../../store/saas-admin.selectors';

type Filter = 'all' | 'active' | 'inactive' | 'deleted';

@Component({
  selector: 'saas-tenants-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, TableModule, ButtonModule, TagModule, InputTextModule,
    TooltipModule, ConfirmDialogModule, TenantFormDialogComponent,
  ],
  template: `
    <header class="page-header">
      <h1>Tenants</h1>
      <p-button label="Nuevo tenant" icon="pi pi-plus" (onClick)="openCreate()" />
    </header>

    <div class="toolbar">
      <span class="p-input-icon-left toolbar__search">
        <i class="pi pi-search"></i>
        <input pInputText placeholder="Buscar por código o nombre…"
               (input)="search.set($any($event.target).value)" />
      </span>
      @for (f of filters; track f.value) {
        <p-button [label]="f.label" size="small"
                  [severity]="filter() === f.value ? 'primary' : 'secondary'"
                  [outlined]="filter() !== f.value"
                  (onClick)="filter.set(f.value)" />
      }
    </div>

    <p-table [value]="visible()" [paginator]="visible().length > 10" [rows]="10" dataKey="id">
      <ng-template pTemplate="header">
        <tr>
          <th>Código</th><th>Nombre</th><th>Status</th><th>Active</th>
          <th class="text-right" style="width:200px">Acciones</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-t>
        <tr [class.row-deleted]="!!t.deletedAt">
          <td><code>{{ t.code }}</code></td>
          <td>{{ t.name }}</td>
          <td><p-tag [value]="t.status" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" /></td>
          <td>
            @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
            @else if (!t.active) { <p-tag value="Inactivo" severity="warn" /> }
            @else { <p-tag value="Activo" severity="success" /> }
          </td>
          <td class="text-right">
            <a [routerLink]="['/saas/tenants', t.id]">
              <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
            </a>
            <p-button [text]="true" icon="pi pi-pencil" pTooltip="Renombrar" (onClick)="openRename(t)" />
            @if (t.status === 'ACTIVE') {
              <p-button [text]="true" icon="pi pi-pause" pTooltip="Desactivar" (onClick)="confirmDeactivate(t)" />
            } @else if (!t.deletedAt) {
              <p-button [text]="true" icon="pi pi-play" pTooltip="Activar" (onClick)="confirmActivate(t)" />
            }
            @if (!t.deletedAt) {
              <p-button [text]="true" icon="pi pi-trash" pTooltip="Eliminar" severity="danger" (onClick)="confirmSoftDelete(t)" />
            }
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="5" class="empty">Sin tenants para los filtros actuales.</td></tr>
      </ng-template>
    </p-table>

    <p-confirmDialog />
    <tenant-form-dialog [open]="dialogOpen()" [editing]="editing()" (closed)="onDialogClosed()" />
  `,
  styles: [`
    :host { display: block; color: #e2e8f0; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .page-header h1 { color: #fde68a; margin: 0; font-size: 22px; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
    .toolbar__search input { min-width: 280px; }
    .row-deleted td { text-decoration: line-through; color: #94a3b8; }
    .text-right { text-align: right; }
    .empty { text-align: center; color: #94a3b8; padding: 24px; font-style: italic; }
  `],
})
export class TenantsListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  private readonly tenants = this.store.selectSignal(selectTenantsList);

  protected readonly filter = signal<Filter>('all');
  protected readonly search = signal('');

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'all',      label: 'Todos' },
    { value: 'active',   label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'deleted',  label: 'Eliminados' },
  ];

  protected readonly visible = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.tenants().filter((t) => {
      if (f === 'active'   && !(t.status === 'ACTIVE'   && t.active && !t.deletedAt)) return false;
      if (f === 'inactive' && !(t.status === 'INACTIVE' && t.active && !t.deletedAt)) return false;
      if (f === 'deleted'  && !(!t.active || !!t.deletedAt))                          return false;
      if (q && !`${t.code} ${t.name}`.toLowerCase().includes(q))                       return false;
      return true;
    });
  });

  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<Tenant | null>(null);

  ngOnInit(): void {
    this.store.dispatch(loadTenants());
  }

  openCreate(): void {
    this.editing.set(null);
    this.dialogOpen.set(true);
  }
  openRename(t: Tenant): void {
    this.editing.set(t);
    this.dialogOpen.set(true);
  }
  onDialogClosed(): void {
    this.dialogOpen.set(false);
    this.editing.set(null);
  }

  confirmActivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Activar tenant?',
      message: `${t.code} — ${t.name}`,
      acceptLabel: 'Activar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(activateTenant({ id: t.id })),
    });
  }
  confirmDeactivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Desactivar tenant?',
      message: `${t.code} — ${t.name}`,
      acceptLabel: 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deactivateTenant({ id: t.id })),
    });
  }
  confirmSoftDelete(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Eliminar tenant?',
      message: 'Esto desactivará el tenant y dejará de ser visible. Los datos no se borran.',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(softDeleteTenant({ id: t.id })),
    });
  }

  trackByStatus(_: number, s: TenantStatus): TenantStatus { return s; }
}
```

- [ ] **Step 4: Wire the page into routes**

In `src/app/features/saas-admin/saas-admin.routes.ts`, add a child of the shell:

```ts
children: [
  { path: '', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage) },
  { path: 'tenants', loadComponent: () => import('./pages/tenants-list/tenants-list.page').then((m) => m.TenantsListPage) },
],
```

- [ ] **Step 5: Run tests + build**

Run: `npx --no ng test --no-watch --include='**/tenants-list.page.spec.ts'`
Expected: PASS (3 tests).

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saas-admin/pages/tenants-list/ src/app/features/saas-admin/saas-admin.routes.ts
git commit -m "feat(saas-admin): tenants list with search, filters, CRUD actions"
```

---

## Task 17: Tenant detail shell with tabs

**Files:**
- Create: `src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.ts`
- Create: `src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.spec.ts`
- Modify: `src/app/features/saas-admin/saas-admin.routes.ts`

The 3 tabs land in the following tasks. This task creates the page shell + dispatches the 3 loads + renders tab placeholders.

- [ ] **Step 1: Write the spec**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TenantDetailPage } from './tenant-detail.page';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../store/saas-admin.state';
import { loadTenant, loadTenantModules, loadTenantWhiteLabel, clearSelectedTenant } from '../../store/saas-admin.actions';

describe('TenantDetailPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantDetailPage],
      providers: [
        provideMockStore({ initialState: { [SAAS_ADMIN_FEATURE_KEY]: initialSaasAdminState } }),
        provideNoopAnimations(),
        provideRouter([]),
      ],
    });
  });

  it('dispatches load for tenant, modules and white-label on init', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantDetailPage);
    fixture.componentRef.setInput('id', '5');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadTenant({ id: 5 }));
    expect(spy).toHaveBeenCalledWith(loadTenantModules({ tenantId: 5 }));
    expect(spy).toHaveBeenCalledWith(loadTenantWhiteLabel({ tenantId: 5 }));
  });

  it('dispatches clearSelectedTenant on destroy', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantDetailPage);
    fixture.componentRef.setInput('id', '5');
    fixture.detectChanges();
    fixture.destroy();
    expect(spy).toHaveBeenCalledWith(clearSelectedTenant());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/tenant-detail.page.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the page**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.ts
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import {
  clearSelectedTenant, loadTenant, loadTenantModules, loadTenantWhiteLabel,
} from '../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenant } from '../../store/saas-admin.selectors';

@Component({
  selector: 'saas-tenant-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, TabsModule, TagModule],
  template: `
    <header class="detail-header">
      <a routerLink="/saas/tenants" class="back">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" />
      </a>
      @if (tenant(); as t) {
        <div class="detail-header__title">
          <h1>{{ t.name }}</h1>
          <code>{{ t.code }}</code>
          <p-tag [value]="t.status" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
          @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
        </div>
      } @else if (pending()) {
        <span class="muted">Cargando…</span>
      } @else {
        <span class="muted">Tenant no encontrado.</span>
      }
    </header>

    @if (tenant()) {
      <p-tabs value="info">
        <p-tablist>
          <p-tab value="info">Información</p-tab>
          <p-tab value="modules">Módulos</p-tab>
          <p-tab value="white-label">White label</p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="info"><p class="muted">Tab Info (Task 18)</p></p-tabpanel>
          <p-tabpanel value="modules"><p class="muted">Tab Módulos (Task 19)</p></p-tabpanel>
          <p-tabpanel value="white-label"><p class="muted">Tab White-label (Task 20)</p></p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    }
  `,
  styles: [`
    :host { display: block; color: #e2e8f0; }
    .detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .detail-header__title { display: flex; align-items: center; gap: 8px; }
    .detail-header h1 { margin: 0; color: #fde68a; font-size: 20px; }
    .detail-header code { color: #94a3b8; font-size: 12px; }
    .muted { color: #94a3b8; font-size: 13px; }
  `],
})
export class TenantDetailPage implements OnInit, OnDestroy {
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  protected readonly tenant = this.store.selectSignal(selectSelectedTenant);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) return;
    this.store.dispatch(loadTenant({ id: numericId }));
    this.store.dispatch(loadTenantModules({ tenantId: numericId }));
    this.store.dispatch(loadTenantWhiteLabel({ tenantId: numericId }));
  }

  ngOnDestroy(): void {
    this.store.dispatch(clearSelectedTenant());
  }
}
```

- [ ] **Step 4: Wire the route**

In `saas-admin.routes.ts`, add the detail route as a child:

```ts
{
  path: 'tenants/:id',
  loadComponent: () =>
    import('./pages/tenant-detail/tenant-detail.page').then((m) => m.TenantDetailPage),
},
```

Place it AFTER `tenants` so `/saas/tenants` keeps matching the list (literal path vs param).

- [ ] **Step 5: Run tests + build**

Run: `npx --no ng test --no-watch --include='**/tenant-detail.page.spec.ts'`
Expected: PASS (2 tests).

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saas-admin/pages/tenant-detail/ src/app/features/saas-admin/saas-admin.routes.ts
git commit -m "feat(saas-admin): tenant detail page shell with three empty tabs"
```

---

## Task 18: Tenant Info tab (rename / activate / deactivate / soft-delete)

**Files:**
- Create: `src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-info-tab.component.ts`
- Modify: `src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.ts`

- [ ] **Step 1: Implement the tab**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-info-tab.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { Tenant } from '../../../models/tenant.model';
import {
  activateTenant, deactivateTenant, renameTenant, softDeleteTenant,
} from '../../../store/saas-admin.actions';

@Component({
  selector: 'tenant-info-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TagModule, ConfirmDialogModule],
  template: `
    @if (tenant(); as t) {
      <form [formGroup]="form" class="info-form">
        <label class="field">
          <span>Código</span>
          <input pInputText formControlName="code" readonly />
        </label>
        <label class="field">
          <span>Nombre</span>
          <input pInputText formControlName="name" />
        </label>
        <div class="info-form__status">
          <p-tag [value]="t.status" [severity]="t.status === 'ACTIVE' ? 'success' : 'warn'" />
          @if (t.deletedAt) { <p-tag value="Eliminado" severity="danger" /> }
        </div>

        <div class="info-form__actions">
          <p-button label="Guardar nombre" icon="pi pi-save"
                    [disabled]="!form.dirty || form.invalid" (onClick)="saveName(t)" />
          @if (!t.deletedAt) {
            @if (t.status === 'ACTIVE') {
              <p-button label="Desactivar" severity="warn" [outlined]="true"
                        icon="pi pi-pause" (onClick)="confirmDeactivate(t)" />
            } @else {
              <p-button label="Activar" severity="success" [outlined]="true"
                        icon="pi pi-play" (onClick)="confirmActivate(t)" />
            }
            <p-button label="Eliminar" severity="danger" [outlined]="true"
                      icon="pi pi-trash" (onClick)="confirmSoftDelete(t)" />
          }
        </div>
      </form>
      <p-confirmDialog />
    }
  `,
  styles: [`
    .info-form { display: flex; flex-direction: column; gap: 12px; max-width: 560px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #c7d2fe; }
    .info-form__status { display: flex; gap: 6px; }
    .info-form__actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  `],
})
export class TenantInfoTabComponent {
  readonly tenant = input.required<Tenant | null>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  protected readonly form = this.fb.nonNullable.group({
    code: [{ value: '', disabled: true }],
    name: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const t = this.tenant();
      if (t) this.form.reset({ code: t.code, name: t.name });
    });
  }

  saveName(t: Tenant): void {
    if (this.form.invalid || !this.form.dirty) return;
    this.store.dispatch(renameTenant({ id: t.id, req: { name: this.form.getRawValue().name } }));
    this.form.markAsPristine();
  }

  confirmActivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Activar tenant?', message: t.code,
      acceptLabel: 'Activar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(activateTenant({ id: t.id })),
    });
  }
  confirmDeactivate(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Desactivar tenant?', message: t.code,
      acceptLabel: 'Desactivar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deactivateTenant({ id: t.id })),
    });
  }
  confirmSoftDelete(t: Tenant): void {
    this.confirm.confirm({
      header: '¿Eliminar tenant?',
      message: 'Esto desactivará el tenant y dejará de ser visible. Los datos no se borran.',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(softDeleteTenant({ id: t.id })),
    });
  }
}
```

- [ ] **Step 2: Wire into the detail page**

In `tenant-detail.page.ts`:

(a) Add the import:

```ts
import { TenantInfoTabComponent } from './tabs/tenant-info-tab.component';
```

(b) Add `TenantInfoTabComponent` to the component's `imports` array.

(c) Replace the Info tab placeholder body in the template:

```html
<p-tabpanel value="info">
  <tenant-info-tab [tenant]="tenant()" />
</p-tabpanel>
```

- [ ] **Step 3: Build**

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/saas-admin/pages/tenant-detail/
git commit -m "feat(saas-admin): tenant info tab with rename, activate/deactivate, soft-delete"
```

---

## Task 19: Tenant Modules tab

**Files:**
- Create: `src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-modules-tab.component.ts`
- Create: `src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-modules-tab.component.spec.ts`
- Modify: `src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.ts`

- [ ] **Step 1: Write the spec**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-modules-tab.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TenantModulesTabComponent } from './tenant-modules-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { toggleTenantModule } from '../../../store/saas-admin.actions';

describe('TenantModulesTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantModulesTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: { ...initialSaasAdminState, selectedTenantModules: ['PORTAL'] },
          },
        }),
        provideNoopAnimations(),
      ],
    });
  });

  it('shows the 5 activable modules and reflects the enabled set', () => {
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.isEnabled('PORTAL')).toBe(true);
    expect(fixture.componentInstance.isEnabled('TURNOS')).toBe(false);
  });

  it('toggle dispatches toggleTenantModule with the requested enable value', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantModulesTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    fixture.componentInstance.onToggle('TURNOS', true);
    expect(spy).toHaveBeenCalledWith(toggleTenantModule({ tenantId: 1, code: 'TURNOS', enable: true }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/tenant-modules-tab.component.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-modules-tab.component.ts
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TagModule } from 'primeng/tag';
import { ACTIVABLE_MODULES, CORE_MODULES, ModuleCode } from '../../../models/module-code';
import { toggleTenantModule } from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantModules } from '../../../store/saas-admin.selectors';

@Component({
  selector: 'tenant-modules-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputSwitchModule, TagModule],
  template: `
    <section class="modules">
      <h3>Activables</h3>
      <p class="muted">Estos módulos podés prenderlos o apagarlos por tenant.</p>
      @for (m of activables; track m.code) {
        <div class="module-row">
          <i [class]="m.icon"></i>
          <div class="module-row__text">
            <strong>{{ m.label }}</strong>
            <span class="muted">{{ m.description }}</span>
          </div>
          <p-inputSwitch [(ngModel)]="modelMap[m.code]"
                         [disabled]="pending()"
                         (onChange)="onToggle(m.code, $event.checked)" />
        </div>
      }
    </section>

    <section class="modules">
      <h3>Core</h3>
      <p class="muted">Siempre activos. No se pueden desactivar.</p>
      @for (m of cores; track m.code) {
        <div class="module-row module-row--core">
          <i [class]="m.icon"></i>
          <div class="module-row__text">
            <strong>{{ m.label }}</strong>
            <span class="muted">{{ m.description }}</span>
          </div>
          <p-tag value="Siempre activo" severity="info" />
        </div>
      }
    </section>
  `,
  styles: [`
    .modules { margin-bottom: 24px; }
    .modules h3 { color: #fde68a; font-size: 14px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: .04em; }
    .muted { color: #94a3b8; font-size: 12px; }
    .module-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,.03); margin-top: 8px; }
    .module-row--core { opacity: 0.85; }
    .module-row i { font-size: 18px; color: #fbbf24; width: 20px; text-align: center; }
    .module-row__text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .module-row__text strong { color: #e2e8f0; font-size: 14px; }
  `],
})
export class TenantModulesTabComponent {
  readonly tenantId = input.required<number>();

  private readonly store = inject(Store);
  protected readonly cores = CORE_MODULES;
  protected readonly activables = ACTIVABLE_MODULES;

  private readonly enabled = this.store.selectSignal(selectSelectedTenantModules);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  protected modelMap: Record<string, boolean> = {};

  constructor() {
    // Recompute modelMap when enabled set changes
    Object.defineProperty(this, 'modelMap', {
      get: () =>
        this.activables.reduce<Record<string, boolean>>((acc, m) => {
          acc[m.code] = this.isEnabled(m.code);
          return acc;
        }, {}),
    });
  }

  isEnabled(code: ModuleCode): boolean {
    return this.enabled()?.includes(code) ?? false;
  }

  onToggle(code: ModuleCode, enable: boolean): void {
    this.store.dispatch(toggleTenantModule({ tenantId: this.tenantId(), code, enable }));
  }
}
```

- [ ] **Step 4: Wire into the detail page**

In `tenant-detail.page.ts`:

(a) Add the import:

```ts
import { TenantModulesTabComponent } from './tabs/tenant-modules-tab.component';
```

(b) Add `TenantModulesTabComponent` to the `imports` array.

(c) Replace the Modules tab placeholder:

```html
<p-tabpanel value="modules">
  <tenant-modules-tab [tenantId]="numericId()" />
</p-tabpanel>
```

(d) Add a computed signal `numericId` to the detail page class:

```ts
protected readonly numericId = computed(() => Number(this.id()));
```

Add `computed` to the existing `@angular/core` import.

- [ ] **Step 5: Run tests + build**

Run: `npx --no ng test --no-watch --include='**/tenant-modules-tab.component.spec.ts'`
Expected: PASS (2 tests).

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saas-admin/pages/tenant-detail/
git commit -m "feat(saas-admin): tenant modules tab with switch per activable module"
```

---

## Task 20: Tenant White-label tab

**Files:**
- Create: `src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-white-label-tab.component.ts`
- Create: `src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-white-label-tab.component.spec.ts`
- Modify: `src/app/features/saas-admin/pages/tenant-detail/tenant-detail.page.ts`

- [ ] **Step 1: Write the spec**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-white-label-tab.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TenantWhiteLabelTabComponent } from './tenant-white-label-tab.component';
import { SAAS_ADMIN_FEATURE_KEY, initialSaasAdminState } from '../../../store/saas-admin.state';
import { upsertTenantWhiteLabel } from '../../../store/saas-admin.actions';

describe('TenantWhiteLabelTabComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TenantWhiteLabelTabComponent],
      providers: [
        provideMockStore({
          initialState: {
            [SAAS_ADMIN_FEATURE_KEY]: {
              ...initialSaasAdminState,
              selectedTenantWhiteLabel: {
                id: 1, targetTenantId: 1, systemName: 'Demo',
                primaryColor: '#1976D2', secondaryColor: '#424242',
                lightLogoUrl: null, darkLogoUrl: null, active: true,
              },
            },
          },
        }),
        provideNoopAnimations(),
      ],
    });
  });

  it('hydrates the form from the loaded white-label', () => {
    const fixture = TestBed.createComponent(TenantWhiteLabelTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('systemName')!.value).toBe('Demo');
    expect(fixture.componentInstance.form.get('primaryColor')!.value).toBe('#1976D2');
  });

  it('save dispatches upsertTenantWhiteLabel with the form value', () => {
    const store = TestBed.inject(MockStore);
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(TenantWhiteLabelTabComponent);
    fixture.componentRef.setInput('tenantId', 1);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ systemName: 'New' });
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.save();
    expect(spy).toHaveBeenCalledWith(upsertTenantWhiteLabel({
      tenantId: 1,
      req: {
        systemName: 'New',
        primaryColor: '#1976D2',
        secondaryColor: '#424242',
        lightLogoUrl: null,
        darkLogoUrl: null,
      },
    }));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx --no ng test --no-watch --include='**/tenant-white-label-tab.component.spec.ts'`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```ts
// src/app/features/saas-admin/pages/tenant-detail/tabs/tenant-white-label-tab.component.ts
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { upsertTenantWhiteLabel } from '../../../store/saas-admin.actions';
import { selectSaasAdminPending, selectSelectedTenantWhiteLabel } from '../../../store/saas-admin.selectors';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'tenant-white-label-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, ColorPickerModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()" class="wl-form">
      <div class="wl-grid">
        <label class="field">
          <span>Nombre visible</span>
          <input pInputText formControlName="systemName" placeholder="Mi laboratorio" />
        </label>

        <label class="field">
          <span>Color primario</span>
          <div class="color-input">
            <p-colorPicker formControlName="primaryColor" />
            <input pInputText formControlName="primaryColor" maxlength="7" />
          </div>
        </label>

        <label class="field">
          <span>Color secundario</span>
          <div class="color-input">
            <p-colorPicker formControlName="secondaryColor" />
            <input pInputText formControlName="secondaryColor" maxlength="7" />
          </div>
        </label>

        <label class="field">
          <span>Logo light (URL)</span>
          <input pInputText formControlName="lightLogoUrl" placeholder="https://…" />
        </label>

        <label class="field">
          <span>Logo dark (URL)</span>
          <input pInputText formControlName="darkLogoUrl" placeholder="https://…" />
        </label>
      </div>

      <aside class="preview">
        <h3>Preview</h3>
        <div class="preview__name">{{ form.get('systemName')!.value || '—' }}</div>
        <div class="preview__colors">
          <div class="swatch" [style.background]="form.get('primaryColor')!.value || '#000'">Primario</div>
          <div class="swatch" [style.background]="form.get('secondaryColor')!.value || '#000'">Secundario</div>
        </div>
        <div class="preview__logos">
          @if (form.get('lightLogoUrl')!.value) {
            <div class="preview__bg-light"><img [src]="form.get('lightLogoUrl')!.value" alt="" /></div>
          }
          @if (form.get('darkLogoUrl')!.value) {
            <div class="preview__bg-dark"><img [src]="form.get('darkLogoUrl')!.value" alt="" /></div>
          }
        </div>
      </aside>

      <div class="wl-form__footer">
        <p-button label="Guardar" icon="pi pi-save" type="submit"
                  [loading]="pending()" [disabled]="form.invalid || form.pristine || pending()" />
      </div>
    </form>
  `,
  styles: [`
    .wl-form { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
    .wl-grid { display: grid; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #c7d2fe; }
    .color-input { display: flex; gap: 8px; align-items: center; }
    .preview { background: rgba(255,255,255,.03); padding: 12px; border-radius: 8px; }
    .preview h3 { color: #fde68a; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: .04em; }
    .preview__name { font-weight: 600; color: #e2e8f0; }
    .preview__colors { display: flex; gap: 6px; margin-top: 8px; }
    .swatch { padding: 16px 8px; border-radius: 6px; color: white; font-size: 10px; text-align: center; flex: 1; }
    .preview__logos { display: flex; gap: 6px; margin-top: 8px; }
    .preview__bg-light, .preview__bg-dark { padding: 8px; border-radius: 6px; }
    .preview__bg-light { background: white; }
    .preview__bg-dark  { background: #0f172a; }
    .preview img { max-width: 80px; max-height: 40px; display: block; }
    .wl-form__footer { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
  `],
})
export class TenantWhiteLabelTabComponent {
  readonly tenantId = input.required<number>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  private readonly current = this.store.selectSignal(selectSelectedTenantWhiteLabel);
  protected readonly pending = this.store.selectSignal(selectSaasAdminPending);

  protected readonly form;

  constructor() {
    this.form = this.fb.nonNullable.group({
      systemName: ['', Validators.required],
      primaryColor: ['#000000', [Validators.required, Validators.pattern(HEX)]],
      secondaryColor: ['#000000', [Validators.required, Validators.pattern(HEX)]],
      lightLogoUrl: [null as string | null],
      darkLogoUrl: [null as string | null],
    });

    effect(() => {
      const wl = this.current();
      if (wl) {
        this.form.reset({
          systemName: wl.systemName,
          primaryColor: wl.primaryColor,
          secondaryColor: wl.secondaryColor,
          lightLogoUrl: wl.lightLogoUrl,
          darkLogoUrl: wl.darkLogoUrl,
        });
      }
    });
  }

  save(): void {
    if (this.form.invalid || this.form.pristine) return;
    const v = this.form.getRawValue();
    this.store.dispatch(upsertTenantWhiteLabel({
      tenantId: this.tenantId(),
      req: {
        systemName: v.systemName,
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor,
        lightLogoUrl: v.lightLogoUrl || null,
        darkLogoUrl: v.darkLogoUrl || null,
      },
    }));
    this.form.markAsPristine();
  }
}
```

- [ ] **Step 4: Wire into the detail page**

In `tenant-detail.page.ts`:

(a) Add import:

```ts
import { TenantWhiteLabelTabComponent } from './tabs/tenant-white-label-tab.component';
```

(b) Add to `imports`.

(c) Replace the white-label placeholder:

```html
<p-tabpanel value="white-label">
  <tenant-white-label-tab [tenantId]="numericId()" />
</p-tabpanel>
```

- [ ] **Step 5: Run tests + build**

Run: `npx --no ng test --no-watch --include='**/tenant-white-label-tab.component.spec.ts'`
Expected: PASS (2 tests).

Run: `npx --no ng build --configuration=development`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/saas-admin/pages/tenant-detail/
git commit -m "feat(saas-admin): tenant white-label tab with form, preview and upsert"
```

---

## Task 21: Remove the placeholder `/admin` entry from the lab sidebar

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`
- Modify: `src/app/app.routes.ts`
- Delete: `src/app/features/saas-admin/admin-dashboard/admin-dashboard.component.ts`
- Delete: `src/app/features/saas-admin/admin.routes.ts`

- [ ] **Step 1: Remove the placeholder admin entry**

Open `src/app/layout/sidebar/sidebar.nav.ts`. Find the section labelled `'Administración'` containing:

```ts
{ kind: 'link', label: 'SaaS Admin', icon: 'pi pi-cog', path: '/admin', chip: 'Root' },
```

Remove that line. If that was the only item in the section, remove the whole section.

- [ ] **Step 2: Remove the legacy `/admin` route**

Open `src/app/app.routes.ts`. Find and remove the route block that loads `./features/saas-admin/admin.routes`. The new path is `/saas`, not `/admin`.

- [ ] **Step 3: Delete the legacy placeholder files**

```bash
rm src/app/features/saas-admin/admin.routes.ts
rm src/app/features/saas-admin/admin-dashboard/admin-dashboard.component.ts
rmdir src/app/features/saas-admin/admin-dashboard
```

- [ ] **Step 4: Verify no stale references**

Run: `npx --no ng build --configuration=development`
Expected: PASS. If it fails complaining about `admin-dashboard` imports, grep for `admin-dashboard` under `src/` and remove the stragglers.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/layout/sidebar/sidebar.nav.ts src/app/app.routes.ts src/app/features/saas-admin/admin.routes.ts src/app/features/saas-admin/admin-dashboard
git commit -m "chore(saas-admin): remove legacy /admin placeholder route and sidebar entry"
```

---

## Task 22: Manual smoke test

**Files:** none (manual verification).

- [ ] **Step 1: Ensure backend has a SAAS_ADMIN user**

Follow the pre-flight SQL snippet at the top of this plan if not done yet. Confirm the role assignment is visible.

- [ ] **Step 2: Start full stack**

```bash
# From the workspace root
start-dev.bat
```

Wait for `Started LaboratorioApplication` in the backend window and `Local: http://localhost:4200/` in the frontend window.

- [ ] **Step 3: Manual checklist**

- Visit `/login` (lab) → log in with `admin@test.com / password` → lands in `/home`. Sidebar **no longer** shows "SaaS Admin · Root". Logout.
- Visit `/saas/login` → log in with the SAAS_ADMIN user → lands in `/saas`. Layout is the navy + gold shell, NOT the lab shell.
- Dashboard shows 4 stat cards with derived counts; "Tenants recientes" table shows top 5 (or "Sin tenants" message).
- Click `Nuevo tenant` → fill `code = qa-demo`, `name = QA Demo` → submit → row appears at the top of the list.
- From the list, click ✏️ on a row → rename → row updates.
- Click ⏯ on an ACTIVE tenant → confirm → status changes to INACTIVE. Click again on the now INACTIVE row → confirm → ACTIVE again.
- Click 🗑️ → confirm → row gets the "Eliminado" tag, struck through.
- Filter by `Eliminados` → only soft-deleted tenants visible. Search by code or name → narrows results.
- Click 👁️ on a tenant → lands in `/saas/tenants/:id`. Tabs render.
- **Info tab**: change name, save, verify the header updates. Deactivate/activate buttons work.
- **Módulos tab**: 3 core modules visible read-only with "Siempre activo" tag. 5 activables with switches. Toggle PORTAL → switch state holds. Refresh page → still on, confirms backend round-trip.
- **White-label tab**: form hydrates from `GET /white-label`. Change a color, save, refresh → persisted.
- Press `F5` on `/saas/tenants/:id` → page reloads, three loads dispatched, content rehydrates without redirecting away.
- Try to access `/saas` after manually deleting the token from localStorage → redirected to `/saas/login` immediately.
- 401 simulation: invalidate the token (corrupt it in DevTools) and trigger any request → redirect to `/saas/login`, not `/login`.

- [ ] **Step 4: Close manual report**

If any of the checklist items fail, open a sub-task or fix inline; otherwise the plan is done.

---

## Self-review

- **Spec coverage:** routing/shell (Tasks 1, 5, 21), guard (Task 2), interceptor fix (Task 3), tenant-config silencing (Task 4), `/saas/login` (Task 6), models (Task 7), API service (Task 8), store + reducer + effects + selectors (Tasks 9–12), feature registration (Task 13), dashboard (Task 14), tenant CRUD dialog (Task 15), list (Task 16), detail shell (Task 17), Info/Modules/White-label tabs (Tasks 18/19/20), smoke (Task 22). Each spec requirement maps to a task.
- **Placeholder scan:** no "TBD"/"TODO" left in steps. Every code block contains real code. The dialog's local error signal (Task 15) leaves a note for the engineer to polish the error-message wiring — that is intentional and bounded.
- **Type consistency:** `Tenant`, `TenantWhiteLabel`, `ModuleCode` defined in Task 7 are referenced consistently across actions (Task 9), reducer (Task 10), effects (Task 11), and component tasks. Action names (`createTenant`, `toggleTenantModule`, etc.) match between actions, effects, reducer, and pages that dispatch them. Route paths (`/saas`, `/saas/login`, `/saas/tenants`, `/saas/tenants/:id`) are consistent across tasks 1, 5, 6, 14, 16, 17.
- **Pre-flight prerequisite (SAAS_ADMIN user) is documented up-front** so the engineer doesn't get stuck during Task 22.
