# Profile Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone `/profile/change-password` route with a topbar profile popover that includes a header (user info from JWT + persisted user blob), a "Cambiar contraseña" item that opens a right-side `<p-drawer>` with the password form, a "Cerrar sesión" item that opens a centered `<p-dialog>` confirm modal, and three disabled items ("Próximamente") for Mi perfil, Empresa, and Sucursal switcher.

**Architecture:** Two singleton services (`UserSessionService` for persisting `UserResponse` in localStorage, `ProfileMenuService` for signal-based open/close state of overlays) coordinate three standalone components (`ProfileMenuComponent` inside `<p-popover>` mounted in the topbar; `ChangePasswordDrawerComponent` and `LogoutConfirmComponent` mounted at admin-shell level for proper z-index layering). Token and user blob are cleared together in 3 places: logout confirm, post-password-change autologout, and the existing 401 interceptor.

**Tech Stack:** Angular 21 standalone components, signals, PrimeNG 21 (`<p-popover>`, `<p-drawer>`, `<p-dialog>`, `<p-button>`, `<p-password>`), Reactive Forms, Vitest with fake timers, SCSS with design system tokens.

**Spec reference:** `docs/superpowers/specs/2026-05-15-profile-menu-design.md`

**Mockup reference:** `.superpowers/brainstorm/599-1778424925/content/full-mockup-v2.html` lines 277-340 (CSS), 586-700 (HTML), 2337-2400 (JS)

**Pre-flight context (run once before starting any task):**
- Active branch must be `feature/auth`. Verify with `git branch --show-current`.
- The standalone change-password component still exists at `src/app/features/profile/pages/change-password/`. It will be deleted in Task 11.
- The `UserResponse` type is in `src/app/features/auth/models/auth.models.ts` and is already exported.
- The `ProfileApiService.changePassword(userId, current, new)` already exists at `src/app/features/profile/services/profile-api.service.ts` and is reused.
- The `passwordsMatch` validator already exists at `src/app/shared/validators/passwords-match.validator.ts`.
- `TokenService` exists at `src/app/core/auth/token.service.ts` with `setToken`, `getToken`, `removeToken`, `getPayload`, `getTenantId`, `getUserId`, `getRoles`, `isTokenValid`.
- Run baseline tests once: `npm test -- --watch=false`. Expect 53/53 green.

---

## File Structure

**Create:**
- `src/app/features/profile/services/user-session.service.ts`
- `src/app/features/profile/services/user-session.service.spec.ts`
- `src/app/features/profile/services/profile-menu.service.ts`
- `src/app/features/profile/services/profile-menu.service.spec.ts`
- `src/app/features/profile/components/profile-menu/profile-menu.component.ts`
- `src/app/features/profile/components/profile-menu/profile-menu.component.spec.ts`
- `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.ts`
- `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.spec.ts`
- `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts`
- `src/app/features/profile/components/logout-confirm/logout-confirm.component.spec.ts`

**Modify:**
- `src/app/core/auth/login/login.component.ts` — inject `UserSessionService`, call `userSession.set(response.user)` after `setToken`.
- `src/app/core/interceptors/auth-token.interceptor.ts` — also call `userSession.clear()` in the 401 handler.
- `src/app/core/interceptors/auth-token.interceptor.spec.ts` — add `clearSpy` and assertion.
- `src/app/layout/topbar/topbar.component.ts` — replace hardcoded `"DP"` with computed `userInitials()` from `UserSessionService`; wrap avatar in a click handler that toggles a `<p-popover>` containing `<ui-profile-menu>`.
- `src/app/layout/admin-shell/admin-shell.component.ts` — mount `<ui-change-password-drawer />` and `<ui-logout-confirm />` as siblings of the existing layout content.
- `src/app/app.routes.ts` — remove the `profile/change-password` child route block.

**Delete:**
- `src/app/features/profile/pages/change-password/change-password.component.ts`
- `src/app/features/profile/pages/change-password/change-password.component.spec.ts`
- The empty `src/app/features/profile/pages/change-password/` directory.
- The empty `src/app/features/profile/pages/` directory (if no other children remain).

---

## Task 1: `UserSessionService`

**Files:**
- Create: `src/app/features/profile/services/user-session.service.ts`
- Create: `src/app/features/profile/services/user-session.service.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/profile/services/user-session.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { UserSessionService } from './user-session.service';
import { UserResponse } from '@features/auth/models/auth.models';

const STORAGE_KEY = 'labcore_user';

const mockUser: UserResponse = {
  id: 1,
  firstName: 'Ana',
  lastName: 'Pérez',
  username: 'ana',
  email: 'a@b.com',
  phone: null,
  document: null,
  isEmailVerified: true,
  isExternal: false,
  branch: null,
  isFirstLogin: false,
  active: true,
  roles: [{ id: 1, code: 'ADMINISTRADOR', description: 'Administrador', hierarchy: 0 }],
};

describe('UserSessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('returns null when localStorage is empty', () => {
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toBeNull();
    expect(service.get()).toBeNull();
  });

  it('persists user to localStorage and updates the signal on set', () => {
    const service = TestBed.inject(UserSessionService);
    service.set(mockUser);
    expect(service.currentUser()).toEqual(mockUser);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(mockUser);
  });

  it('removes from localStorage and nulls the signal on clear', () => {
    const service = TestBed.inject(UserSessionService);
    service.set(mockUser);
    service.clear();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('seeds the signal from localStorage on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser));
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('returns null and clears the key when localStorage has corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const service = TestBed.inject(UserSessionService);
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/user-session.service.spec.ts'`

Expected: FAIL — cannot resolve `./user-session.service`.

- [ ] **Step 3: Implement the service**

Create `src/app/features/profile/services/user-session.service.ts` with EXACTLY:

```typescript
import { Injectable, signal } from '@angular/core';
import { UserResponse } from '@features/auth/models/auth.models';

const STORAGE_KEY = 'labcore_user';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  readonly currentUser = signal<UserResponse | null>(this.loadFromStorage());

  set(user: UserResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  get(): UserResponse | null {
    return this.currentUser();
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
  }

  private loadFromStorage(): UserResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as UserResponse) : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/user-session.service.spec.ts'`

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/services/user-session.service.ts src/app/features/profile/services/user-session.service.spec.ts
git commit -m "feat(profile): add UserSessionService for persisting login user blob"
```

---

## Task 2: `ProfileMenuService`

**Files:**
- Create: `src/app/features/profile/services/profile-menu.service.ts`
- Create: `src/app/features/profile/services/profile-menu.service.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/profile/services/profile-menu.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { ProfileMenuService } from './profile-menu.service';

describe('ProfileMenuService', () => {
  let service: ProfileMenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProfileMenuService);
  });

  it('starts with both overlays closed', () => {
    expect(service.passwordDrawerOpen()).toBe(false);
    expect(service.logoutConfirmOpen()).toBe(false);
  });

  it('opens and closes the password drawer', () => {
    service.openPasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(true);
    service.closePasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(false);
  });

  it('opens and closes the logout confirm', () => {
    service.openLogoutConfirm();
    expect(service.logoutConfirmOpen()).toBe(true);
    service.closeLogoutConfirm();
    expect(service.logoutConfirmOpen()).toBe(false);
  });

  it('keeps the two overlays independent', () => {
    service.openPasswordDrawer();
    service.openLogoutConfirm();
    expect(service.passwordDrawerOpen()).toBe(true);
    expect(service.logoutConfirmOpen()).toBe(true);
    service.closePasswordDrawer();
    expect(service.passwordDrawerOpen()).toBe(false);
    expect(service.logoutConfirmOpen()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/profile-menu.service.spec.ts'`

Expected: FAIL — cannot resolve `./profile-menu.service`.

- [ ] **Step 3: Implement the service**

Create `src/app/features/profile/services/profile-menu.service.ts` with EXACTLY:

```typescript
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProfileMenuService {
  readonly passwordDrawerOpen = signal(false);
  readonly logoutConfirmOpen = signal(false);

  openPasswordDrawer(): void {
    this.passwordDrawerOpen.set(true);
  }

  closePasswordDrawer(): void {
    this.passwordDrawerOpen.set(false);
  }

  openLogoutConfirm(): void {
    this.logoutConfirmOpen.set(true);
  }

  closeLogoutConfirm(): void {
    this.logoutConfirmOpen.set(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/profile-menu.service.spec.ts'`

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/services/profile-menu.service.ts src/app/features/profile/services/profile-menu.service.spec.ts
git commit -m "feat(profile): add ProfileMenuService for overlay state coordination"
```

---

## Task 3: Persist user blob on login

**Files:**
- Modify: `src/app/core/auth/login/login.component.ts`

LoginComponent has no spec (decision carried over from the auth consolidation plan — large component templates have low test ROI). The change is one method call after `setToken`, surface verified by the existing `UserSessionService.set` spec.

- [ ] **Step 1: Add UserSessionService import**

Open `src/app/core/auth/login/login.component.ts`. At the top of the file, after the existing `TokenService` import, add:

```typescript
import { UserSessionService } from '@features/profile/services/user-session.service';
```

- [ ] **Step 2: Inject the service in the class**

Find the existing injections in the `LoginComponent` class body:

```typescript
  private readonly fb       = inject(FormBuilder);
  private readonly router   = inject(Router);
  private readonly tokens   = inject(TokenService);
  private readonly store    = inject(Store);
  private readonly authApi  = inject(AuthApiService);
```

Add a new line after `authApi`:

```typescript
  private readonly userSession = inject(UserSessionService);
```

- [ ] **Step 3: Persist the user blob after a successful login**

Find the `onSubmit` block:

```typescript
      if (response.token) {
        this.tokens.setToken(response.token);
        // DEV fallback (see comment near DEV_TENANT). Remove once tenant config endpoint exists.
        this.store.dispatch(loadTenantConfigSuccess({ config: DEV_TENANT }));
        await this.router.navigate(['/home']);
        return;
      }
```

Replace with:

```typescript
      if (response.token) {
        this.tokens.setToken(response.token);
        this.userSession.set(response.user);
        // DEV fallback (see comment near DEV_TENANT). Remove once tenant config endpoint exists.
        this.store.dispatch(loadTenantConfigSuccess({ config: DEV_TENANT }));
        await this.router.navigate(['/home']);
        return;
      }
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no errors.

- [ ] **Step 5: Verify the full test suite still passes**

Run: `npm test -- --watch=false`

Expected: all green (no regressions in other specs).

- [ ] **Step 6: Commit**

```bash
git add src/app/core/auth/login/login.component.ts
git commit -m "feat(auth): persist user blob via UserSessionService on login success"
```

---

## Task 4: 401 interceptor also clears the user blob

**Files:**
- Modify: `src/app/core/interceptors/auth-token.interceptor.ts`
- Modify: `src/app/core/interceptors/auth-token.interceptor.spec.ts`

- [ ] **Step 1: Update the spec to expect `userSession.clear()`**

Open `src/app/core/interceptors/auth-token.interceptor.spec.ts`. Inside the `it('clears token and redirects to /login on 401', ...)` test, after the existing `removeSpy` line, add a new spy and after the existing `removeSpy` assertion, add a new assertion.

The current test contains something like:

```typescript
const removeSpy = vi.spyOn(tokenService, 'removeToken');
const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
vi.spyOn(tokenService, 'getToken').mockReturnValue('some.jwt.token');
```

Add right after the `removeSpy` line:

```typescript
const userSession = TestBed.inject(UserSessionService);
const clearSpy = vi.spyOn(userSession, 'clear');
```

And below the existing `expect(removeSpy).toHaveBeenCalled();` assertion, add:

```typescript
expect(clearSpy).toHaveBeenCalled();
```

Also add the import at the top:

```typescript
import { UserSessionService } from '@features/profile/services/user-session.service';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/auth-token.interceptor.spec.ts'`

Expected: the 401 test fails — `clearSpy` was not called (because the interceptor doesn't call it yet).

- [ ] **Step 3: Update the interceptor**

Replace the contents of `src/app/core/interceptors/auth-token.interceptor.ts` with EXACTLY:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const userSession = inject(UserSessionService);
  const router = inject(Router);
  const token = tokens.getToken();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        tokens.removeToken();
        userSession.clear();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/auth-token.interceptor.spec.ts'`

Expected: all PASS (including the new `clearSpy` assertion).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/interceptors/auth-token.interceptor.ts src/app/core/interceptors/auth-token.interceptor.spec.ts
git commit -m "fix(auth): clear user session alongside token on 401"
```

---

## Task 5: `ProfileMenuComponent`

**Files:**
- Create: `src/app/features/profile/components/profile-menu/profile-menu.component.ts`
- Create: `src/app/features/profile/components/profile-menu/profile-menu.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/profile/components/profile-menu/profile-menu.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { TENANT_FEATURE_KEY } from '@core/tenant/store/tenant.state';
import { TokenService } from '@core/auth/token.service';
import { UserResponse } from '@features/auth/models/auth.models';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ProfileMenuComponent } from './profile-menu.component';

const mockUser: UserResponse = {
  id: 1, firstName: 'Ana', lastName: 'Pérez', username: 'ana', email: 'a@b.com',
  phone: null, document: null, isEmailVerified: true, isExternal: false,
  branch: null, isFirstLogin: false, active: true,
  roles: [{ id: 1, code: 'ADMINISTRADOR', description: 'Administrador', hierarchy: 0 }],
};

describe('ProfileMenuComponent', () => {
  let fixture: ComponentFixture<ProfileMenuComponent>;
  let userSession: UserSessionService;
  let profileMenu: ProfileMenuService;

  function configure(initialUser: UserResponse | null, tenantName: string | null) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProfileMenuComponent],
      providers: [
        provideMockStore({
          initialState: {
            [TENANT_FEATURE_KEY]: {
              config: tenantName
                ? { id: 'lab1', name: tenantName, logoUrl: '', brandPrimary: '#000', brandSecondary: '#000', brandAccent: '#000', modules: [] }
                : null,
              pending: false,
              error: null,
            },
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(ProfileMenuComponent);
    userSession = TestBed.inject(UserSessionService);
    profileMenu = TestBed.inject(ProfileMenuService);
    if (initialUser) userSession.set(initialUser);
    fixture.detectChanges();
  }

  afterEach(() => {
    localStorage.clear();
  });

  it('renders user info from UserSessionService', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Ana Pérez');
    expect(root.textContent).toContain('a@b.com');
    expect(root.textContent).toContain('Administrador');
  });

  it('renders tenant name from the store', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Lab Central');
  });

  it('falls back to the JWT sub when no user blob is set', () => {
    const tokens = TestBed.inject(TokenService);
    vi.spyOn(tokens, 'getPayload').mockReturnValue({
      sub: 'admin',
      tenantId: 1,
      userId: 1,
      roles: ['ADMINISTRADOR'],
      isExternal: false,
      exp: 9999999999,
      iat: 1,
    });
    configure(null, null);
    const comp = fixture.componentInstance as any;
    expect(comp.fullName()).toBe('admin');
    expect(comp.initials()).toBe('AD');
  });

  it('opens the password drawer and emits close on "Cambiar contraseña" click', () => {
    configure(mockUser, 'Lab Central');
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.fn();
    comp.close.subscribe(closeSpy);
    comp.onChangePasswordClick();
    expect(profileMenu.passwordDrawerOpen()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('opens the logout confirm and emits close on "Cerrar sesión" click', () => {
    configure(mockUser, 'Lab Central');
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.fn();
    comp.close.subscribe(closeSpy);
    comp.onLogoutClick();
    expect(profileMenu.logoutConfirmOpen()).toBe(true);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('disabled items do not trigger any service action', () => {
    configure(mockUser, 'Lab Central');
    const root = fixture.nativeElement as HTMLElement;
    const disabledButtons = Array.from(root.querySelectorAll('button[disabled]'));
    expect(disabledButtons.length).toBeGreaterThanOrEqual(3);
    disabledButtons.forEach(btn => (btn as HTMLButtonElement).click());
    expect(profileMenu.passwordDrawerOpen()).toBe(false);
    expect(profileMenu.logoutConfirmOpen()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/profile-menu.component.spec.ts'`

Expected: FAIL — cannot resolve `./profile-menu.component`.

- [ ] **Step 3: Implement the component**

Create `src/app/features/profile/components/profile-menu/profile-menu.component.ts` with EXACTLY:

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { TokenService } from '@core/auth/token.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';

@Component({
  selector: 'ui-profile-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-pm">
      <div class="ui-pm__header">
        <div class="ui-pm__avatar">{{ initials() }}</div>
        <div class="ui-pm__identity">
          <div class="ui-pm__name">{{ fullName() }}</div>
          @if (primaryRole()) {
            <div class="ui-pm__role">{{ primaryRole() }}</div>
          }
          @if (email()) {
            <div class="ui-pm__email">{{ email() }}</div>
          }
        </div>
      </div>

      @if (tenantName()) {
        <div class="ui-pm__tenant">
          <i class="pi pi-building"></i>
          <span>{{ tenantName() }}</span>
          @if (primaryRole()) {
            <span class="ui-pm__badge">{{ primaryRole() }}</span>
          }
        </div>
      }

      <div class="ui-pm__divider"></div>

      <button type="button" class="ui-pm__item" disabled>
        <i class="pi pi-user"></i>
        <span>Mi perfil</span>
        <span class="ui-pm__coming">Próximamente</span>
      </button>

      <button type="button" class="ui-pm__item" (click)="onChangePasswordClick()">
        <i class="pi pi-lock"></i>
        <span>Cambiar contraseña</span>
      </button>

      <button type="button" class="ui-pm__item" disabled>
        <i class="pi pi-cog"></i>
        <span>Configuración de empresa</span>
        <span class="ui-pm__coming">Próximamente</span>
      </button>

      <div class="ui-pm__divider"></div>

      <div class="ui-pm__section-label">Cambiar sucursal</div>
      <button type="button" class="ui-pm__item ui-pm__item--branch" disabled>
        <i class="pi pi-map-marker"></i>
        <span>{{ tenantName() || 'Sucursal principal' }}</span>
        <i class="pi pi-check ui-pm__check"></i>
      </button>
      <div class="ui-pm__hint">Más sucursales próximamente</div>

      <div class="ui-pm__divider"></div>

      <button type="button" class="ui-pm__item ui-pm__item--danger" (click)="onLogoutClick()">
        <i class="pi pi-sign-out"></i>
        <span>Cerrar sesión</span>
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ui-pm {
      width: 280px;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      font-family: inherit;
    }

    .ui-pm__header {
      padding: 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .ui-pm__avatar {
      width: 40px;
      height: 40px;
      background: var(--brand-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .ui-pm__identity { min-width: 0; }
    .ui-pm__name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ds-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ui-pm__role {
      font-size: 10px;
      font-weight: 600;
      color: var(--brand-primary);
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-top: 1px;
    }
    .ui-pm__email {
      font-size: 10px;
      color: var(--ds-text-muted);
      margin-top: 1px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ui-pm__tenant {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 14px;
      font-size: 11px;
      color: #475569;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    }
    .ui-pm__tenant .pi { color: #64748b; font-size: 12px; }
    .ui-pm__badge {
      margin-left: auto;
      font-size: 9px;
      background: var(--brand-primary);
      color: #fff;
      padding: 1px 6px;
      border-radius: 8px;
      letter-spacing: .04em;
    }

    .ui-pm__divider { height: 1px; background: #f1f5f9; margin: 3px 0; }

    .ui-pm__section-label {
      padding: 4px 14px 2px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .07em;
      color: #94a3b8;
    }

    .ui-pm__item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 9px 14px;
      font-size: 12px;
      color: #374151;
      width: 100%;
      background: transparent;
      border: 0;
      cursor: pointer;
      transition: background .12s, color .12s;
      text-align: left;
      font-family: inherit;
    }
    .ui-pm__item .pi { font-size: 13px; color: #64748b; width: 16px; text-align: center; }
    .ui-pm__item:hover:not(:disabled) { background: #f8fafc; color: var(--ds-text); }
    .ui-pm__item:hover:not(:disabled) .pi { color: var(--brand-primary); }
    .ui-pm__item:disabled { opacity: .55; cursor: default; }

    .ui-pm__coming {
      margin-left: auto;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .06em;
      color: #94a3b8;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .ui-pm__item--branch .ui-pm__check { margin-left: auto; color: #10b981; }

    .ui-pm__hint {
      padding: 2px 14px 8px;
      font-size: 10px;
      color: #94a3b8;
      font-style: italic;
    }

    .ui-pm__item--danger { color: #dc2626; }
    .ui-pm__item--danger .pi { color: #dc2626; }
    .ui-pm__item--danger:hover:not(:disabled) {
      background: #fef2f2;
      color: #dc2626;
    }
    .ui-pm__item--danger:hover:not(:disabled) .pi { color: #dc2626; }
  `],
})
export class ProfileMenuComponent {
  readonly close = output<void>();

  private readonly userSession = inject(UserSessionService);
  private readonly tokens = inject(TokenService);
  private readonly tenantCfg = inject(Store).selectSignal(selectTenantConfig);
  private readonly profileMenu = inject(ProfileMenuService);

  protected readonly initials = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.firstName && u?.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    const sub = this.tokens.getPayload()?.sub ?? '';
    return sub.slice(0, 2).toUpperCase() || '?';
  });

  protected readonly fullName = computed(() => {
    const u = this.userSession.currentUser();
    if (u) return `${u.firstName} ${u.lastName}`.trim();
    return this.tokens.getPayload()?.sub ?? '';
  });

  protected readonly email = computed(() => this.userSession.currentUser()?.email ?? null);

  protected readonly primaryRole = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.roles?.length) return u.roles[0].description;
    return this.tokens.getRoles()[0] ?? '';
  });

  protected readonly tenantName = computed(() => this.tenantCfg()?.name ?? '');

  protected onChangePasswordClick(): void {
    this.profileMenu.openPasswordDrawer();
    this.close.emit();
  }

  protected onLogoutClick(): void {
    this.profileMenu.openLogoutConfirm();
    this.close.emit();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/profile-menu.component.spec.ts'`

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/components/profile-menu/
git commit -m "feat(profile): add ProfileMenuComponent for topbar popover content"
```

---

## Task 6: `ChangePasswordDrawerComponent`

**Files:**
- Create: `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.ts`
- Create: `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ChangePasswordDrawerComponent } from './change-password-drawer.component';

describe('ChangePasswordDrawerComponent', () => {
  let fixture: ComponentFixture<ChangePasswordDrawerComponent>;
  let http: HttpTestingController;
  let profileMenu: ProfileMenuService;

  const tokenStub = {
    getUserId: () => 42 as number | null,
    removeToken: () => {},
  };
  const userSessionStub = {
    clear: () => {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ChangePasswordDrawerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenService, useValue: tokenStub },
        { provide: UserSessionService, useValue: userSessionStub },
      ],
    });
    fixture = TestBed.createComponent(ChangePasswordDrawerComponent);
    http = TestBed.inject(HttpTestingController);
    profileMenu = TestBed.inject(ProfileMenuService);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reflects passwordDrawerOpen signal as the drawer visibility', () => {
    const comp = fixture.componentInstance as any;
    expect(comp.visible()).toBe(false);
    profileMenu.openPasswordDrawer();
    expect(comp.visible()).toBe(true);
  });

  it('calls closePasswordDrawer when the drawer visibility flips to false', () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.spyOn(profileMenu, 'closePasswordDrawer');
    comp.onVisibleChange(false);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('blocks submit when the form is invalid', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    await comp.onSubmit();
    http.expectNone('/api/v1/user/42/password');
  });

  it('submits and shows success on 200', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await submit;
    expect(comp.success()).toBe(true);
  });

  it('triggers session clear and navigates after the autologout timeout', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    const router = TestBed.inject(Router);
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    http.expectOne('/api/v1/user/42/password').flush(null);
    await submit;

    expect(removeSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows specific error message on 401', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'wrong1234', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    http.expectOne('/api/v1/user/42/password').flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await submit;
    expect(comp.error()).toBe('La contraseña actual es incorrecta.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/change-password-drawer.component.spec.ts'`

Expected: FAIL — cannot resolve `./change-password-drawer.component`.

- [ ] **Step 3: Implement the component**

Create `src/app/features/profile/components/change-password-drawer/change-password-drawer.component.ts` with EXACTLY:

```typescript
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ProfileApiService } from '@features/profile/services/profile-api.service';

const LOGOUT_DELAY_MS = 2000;

@Component({
  selector: 'ui-change-password-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Drawer, Button, Password],
  template: `
    <p-drawer
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-cp-drawer"
      [modal]="true"
      [dismissable]="true">
      <ng-template pTemplate="headless">
        <div class="ui-cp-drawer__header">
          <span>Cambiar contraseña</span>
          <button type="button" class="ui-cp-drawer__close" (click)="close()" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <div class="ui-cp-drawer__body">
          @if (success()) {
            <div class="ui-alert ui-alert--success" role="status">
              <i class="pi pi-check-circle"></i>
              <span>Contraseña actualizada. Cerrando tu sesión para que ingreses con la nueva…</span>
            </div>
          }
          @if (error()) {
            <div class="ui-alert ui-alert--error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-cp-drawer__form">
            <div class="ui-field">
              <label for="cp-current">Contraseña actual</label>
              <p-password
                inputId="cp-current"
                formControlName="currentPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Tu contraseña actual"
                autocomplete="current-password" />
            </div>

            <div class="ui-field">
              <label for="cp-new">Nueva contraseña</label>
              <p-password
                inputId="cp-new"
                formControlName="newPassword"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password" />
              @if (form.get('newPassword')?.touched && form.get('newPassword')?.errors?.['minlength']) {
                <small class="ui-field__error">Mínimo 8 caracteres.</small>
              }
            </div>

            <div class="ui-field">
              <label for="cp-confirm">Confirmar nueva contraseña</label>
              <p-password
                inputId="cp-confirm"
                formControlName="confirmPassword"
                [feedback]="false"
                [toggleMask]="true"
                [fluid]="true"
                placeholder="Repetí la nueva contraseña"
                autocomplete="new-password" />
              @if (form.get('confirmPassword')?.dirty && form.get('confirmPassword')?.errors?.['mismatch']) {
                <small class="ui-field__error">Las contraseñas no coinciden.</small>
              }
            </div>

            <div class="ui-cp-drawer__actions">
              <p-button
                type="submit"
                label="Actualizar contraseña"
                severity="primary"
                [loading]="loading()"
                [disabled]="form.invalid || loading()" />
            </div>
          </form>
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
    :host { display: contents; }

    :host ::ng-deep .ui-cp-drawer {
      width: 100% !important;
      max-width: 420px;
    }
    @media (max-width: 480px) {
      :host ::ng-deep .ui-cp-drawer { max-width: 100%; }
    }

    .ui-cp-drawer__header {
      height: 52px;
      background: var(--brand-shell-bg);
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }
    .ui-cp-drawer__close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background .15s, color .15s;
    }
    .ui-cp-drawer__close:hover {
      background: rgba(255,255,255,.1);
      color: #fff;
    }

    .ui-cp-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
    }

    .ui-cp-drawer__form {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .ui-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .ui-field label {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      letter-spacing: .2px;
    }
    .ui-field__error {
      font-size: 12px;
      color: var(--ds-danger);
      padding-left: var(--space-1);
    }

    .ui-cp-drawer__actions {
      display: flex;
      justify-content: flex-end;
      padding-top: var(--space-4);
      margin-top: var(--space-2);
      border-top: 1px solid #f1f5f9;
    }
    @media (max-width: 480px) {
      .ui-cp-drawer__actions { justify-content: stretch; }
      :host ::ng-deep .ui-cp-drawer__actions .p-button { width: 100%; }
    }

    .ui-alert {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 12px 14px;
      margin-bottom: var(--space-4);
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
    }
    .ui-alert .pi { font-size: 16px; flex-shrink: 0; }
    .ui-alert--success {
      background: color-mix(in srgb, var(--ds-success) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-success) 35%, transparent);
      color: #15803d;
    }
    .ui-alert--error {
      background: color-mix(in srgb, var(--ds-danger) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--ds-danger) 30%, transparent);
      color: #b91c1c;
    }

    :host ::ng-deep .ui-cp-drawer__body p-password { display: block; }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password { width: 100%; display: block; }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password-input,
    :host ::ng-deep .ui-cp-drawer__body p-password input.p-inputtext {
      width: 100%;
      min-height: 44px;
      padding: 10px 40px 10px 14px;
      font-size: 14px;
      line-height: 1.4;
      background: #fff;
      color: var(--ds-text);
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      transition: border-color .15s, box-shadow .15s;
    }
    :host ::ng-deep .ui-cp-drawer__body p-password .p-password-input:focus,
    :host ::ng-deep .ui-cp-drawer__body p-password input.p-inputtext:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-primary) 18%, transparent);
    }
  `],
})
export class ChangePasswordDrawerComponent {
  private readonly profileMenu = inject(ProfileMenuService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly tokens = inject(TokenService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  protected readonly visible = this.profileMenu.passwordDrawerOpen;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly form = new FormGroup({
    currentPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.form.reset();
        this.error.set(null);
        this.success.set(false);
      }
    });
  }

  protected close(): void {
    this.profileMenu.closePasswordDrawer();
  }

  protected onVisibleChange(open: boolean): void {
    if (!open) this.profileMenu.closePasswordDrawer();
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    const userId = this.tokens.getUserId();
    if (userId === null) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);
    try {
      const { currentPassword, newPassword } = this.form.getRawValue();
      await this.profileApi.changePassword(userId, currentPassword, newPassword);
      this.success.set(true);
      this.form.reset();
      setTimeout(() => {
        this.tokens.removeToken();
        this.userSession.clear();
        this.router.navigate(['/login']);
      }, LOGOUT_DELAY_MS);
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 401)) {
        this.error.set('La contraseña actual es incorrecta.');
      } else {
        this.error.set('Ocurrió un error. Intentá de nuevo más tarde.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/change-password-drawer.component.spec.ts'`

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/components/change-password-drawer/
git commit -m "feat(profile): add ChangePasswordDrawerComponent (replaces standalone page)"
```

---

## Task 7: `LogoutConfirmComponent`

**Files:**
- Create: `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts`
- Create: `src/app/features/profile/components/logout-confirm/logout-confirm.component.spec.ts`

- [ ] **Step 1: Write the failing spec**

Create `src/app/features/profile/components/logout-confirm/logout-confirm.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { LogoutConfirmComponent } from './logout-confirm.component';

describe('LogoutConfirmComponent', () => {
  let fixture: ComponentFixture<LogoutConfirmComponent>;
  let profileMenu: ProfileMenuService;

  const tokenStub = { removeToken: () => {} };
  const userSessionStub = { clear: () => {} };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LogoutConfirmComponent],
      providers: [
        provideRouter([]),
        { provide: TokenService, useValue: tokenStub },
        { provide: UserSessionService, useValue: userSessionStub },
      ],
    });
    fixture = TestBed.createComponent(LogoutConfirmComponent);
    profileMenu = TestBed.inject(ProfileMenuService);
    fixture.detectChanges();
  });

  it('reflects logoutConfirmOpen signal as the dialog visibility', () => {
    const comp = fixture.componentInstance as any;
    expect(comp.visible()).toBe(false);
    profileMenu.openLogoutConfirm();
    expect(comp.visible()).toBe(true);
  });

  it('cancel only closes the dialog, never touching token/session/router', () => {
    profileMenu.openLogoutConfirm();
    const comp = fixture.componentInstance as any;
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    comp.cancel();

    expect(profileMenu.logoutConfirmOpen()).toBe(false);
    expect(removeSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('confirm clears token + user, closes dialog, and navigates to /login', async () => {
    profileMenu.openLogoutConfirm();
    const comp = fixture.componentInstance as any;
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await comp.confirm();

    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
    expect(profileMenu.logoutConfirmOpen()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --include='**/logout-confirm.component.spec.ts'`

Expected: FAIL — cannot resolve `./logout-confirm.component`.

- [ ] **Step 3: Implement the component**

Create `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts` with EXACTLY:

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';

@Component({
  selector: 'ui-logout-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Dialog, Button],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="false"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      styleClass="ui-logout-dialog"
      [style]="{ width: '360px' }">
      <div class="ui-logout">
        <div class="ui-logout__icon"><i class="pi pi-sign-out"></i></div>
        <h3 class="ui-logout__title">¿Cerrar sesión?</h3>
        <p class="ui-logout__text">
          Tu sesión actual se cerrará y tendrás que volver a ingresar tu contraseña.
        </p>
        <div class="ui-logout__actions">
          <p-button
            label="Cancelar"
            severity="secondary"
            (onClick)="cancel()" />
          <p-button
            label="Cerrar sesión"
            severity="danger"
            (onClick)="confirm()" />
        </div>
      </div>
    </p-dialog>
  `,
  styles: [`
    :host { display: contents; }

    .ui-logout {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-4) var(--space-2) 0;
    }
    .ui-logout__icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #fef2f2;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-3);
    }
    .ui-logout__icon .pi {
      font-size: 22px;
      color: #dc2626;
    }
    .ui-logout__title {
      font-size: 16px;
      font-weight: 700;
      color: var(--ds-text);
      margin: 0 0 var(--space-2);
    }
    .ui-logout__text {
      font-size: 12px;
      color: var(--ds-text-muted);
      line-height: 1.5;
      margin: 0 0 var(--space-5);
    }
    .ui-logout__actions {
      display: flex;
      gap: var(--space-2);
      justify-content: center;
      width: 100%;
    }
  `],
})
export class LogoutConfirmComponent {
  private readonly profileMenu = inject(ProfileMenuService);
  private readonly tokens = inject(TokenService);
  private readonly userSession = inject(UserSessionService);
  private readonly router = inject(Router);

  protected readonly visible = this.profileMenu.logoutConfirmOpen;

  protected onVisibleChange(open: boolean): void {
    if (!open) this.profileMenu.closeLogoutConfirm();
  }

  protected cancel(): void {
    this.profileMenu.closeLogoutConfirm();
  }

  protected async confirm(): Promise<void> {
    this.tokens.removeToken();
    this.userSession.clear();
    this.profileMenu.closeLogoutConfirm();
    await this.router.navigate(['/login']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --include='**/logout-confirm.component.spec.ts'`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/components/logout-confirm/
git commit -m "feat(profile): add LogoutConfirmComponent modal"
```

---

## Task 8: Wire popover + dynamic avatar into the topbar

**Files:**
- Modify: `src/app/layout/topbar/topbar.component.ts`

- [ ] **Step 1: Replace the imports block at the top**

Open `src/app/layout/topbar/topbar.component.ts`. Replace lines 1-7 (the existing imports) with:

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Popover } from 'primeng/popover';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuComponent } from '@features/profile/components/profile-menu/profile-menu.component';
```

- [ ] **Step 2: Update the `@Component` `imports` and `selector`**

Find the `@Component` decorator. It currently has no `imports` array (the topbar uses no other standalone components). Add one after the `changeDetection` line:

```typescript
  imports: [Popover, ProfileMenuComponent],
```

So the decorator opens with:

```typescript
@Component({
  selector: 'ui-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Popover, ProfileMenuComponent],
  template: `
```

- [ ] **Step 3: Update the avatar button and add the popover**

Find the avatar button in the template:

```html
        <!-- TODO: dropdown del menú de usuario -->
        <button type="button" class="ui-topbar__avatar" aria-label="Menú de usuario">
          DP
        </button>
```

Replace with:

```html
        <button
          type="button"
          class="ui-topbar__avatar"
          aria-label="Menú de usuario"
          (click)="profilePopover.toggle($event)">
          {{ userInitials() }}
        </button>

        <p-popover #profilePopover styleClass="ui-profile-popover">
          <ui-profile-menu (close)="profilePopover.hide()" />
        </p-popover>
```

- [ ] **Step 4: Add the new computed signal and inject the new services**

Find the class body:

```typescript
export class TopbarComponent {
  readonly menuToggle = output<void>();

  private readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);

  protected readonly tenantName     = computed(() => this.tenantConfig()?.name ?? 'LabCore');
  protected readonly tenantInitials = computed(() => initials(this.tenantName()));
}
```

Replace with:

```typescript
export class TopbarComponent {
  readonly menuToggle = output<void>();

  private readonly tenantConfig = inject(Store).selectSignal(selectTenantConfig);
  private readonly userSession = inject(UserSessionService);
  private readonly tokens = inject(TokenService);

  protected readonly tenantName     = computed(() => this.tenantConfig()?.name ?? 'LabCore');
  protected readonly tenantInitials = computed(() => initials(this.tenantName()));

  protected readonly userInitials = computed(() => {
    const u = this.userSession.currentUser();
    if (u?.firstName && u?.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    const sub = this.tokens.getPayload()?.sub ?? '';
    return sub.slice(0, 2).toUpperCase() || '?';
  });
}
```

- [ ] **Step 5: Add styling for the popover wrapper**

In the same file's `styles:` template literal, find the closing `\`` of the styles array. Just before the final `\` ]),` insert this new block (so it sits at the end of the existing styles):

```css

    :host ::ng-deep .ui-profile-popover {
      padding: 0 !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 30px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1) !important;
      border: 1px solid #e2e8f0 !important;
      overflow: hidden;
    }
    :host ::ng-deep .ui-profile-popover .p-popover-content {
      padding: 0 !important;
    }
```

- [ ] **Step 6: Verify the file compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no TS errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout/topbar/topbar.component.ts
git commit -m "feat(layout): wire profile popover and dynamic avatar initials into topbar"
```

---

## Task 9: Mount drawer + modal at admin-shell level

**Files:**
- Modify: `src/app/layout/admin-shell/admin-shell.component.ts`

- [ ] **Step 1: Add imports for the two new components**

Open `src/app/layout/admin-shell/admin-shell.component.ts`. Find the existing imports block:

```typescript
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';
```

Add these two lines right after:

```typescript
import { ChangePasswordDrawerComponent } from '@features/profile/components/change-password-drawer/change-password-drawer.component';
import { LogoutConfirmComponent } from '@features/profile/components/logout-confirm/logout-confirm.component';
```

- [ ] **Step 2: Add both components to the `@Component` imports array**

Find:

```typescript
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent],
```

Replace with:

```typescript
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent, ChangePasswordDrawerComponent, LogoutConfirmComponent],
```

- [ ] **Step 3: Mount the two components in the template**

In the same component's template, find the closing `</div>` of `.ui-admin-shell` (the outermost wrapper). The template currently ends with:

```html
      <div class="ui-admin-shell__main">
        <ui-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="ui-admin-shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
```

Insert the two components AFTER the closing `</div>` of `__main` but BEFORE the closing `</div>` of `.ui-admin-shell`, so the new closing block reads:

```html
      <div class="ui-admin-shell__main">
        <ui-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="ui-admin-shell__content">
          <router-outlet />
        </main>
      </div>

      <ui-change-password-drawer />
      <ui-logout-confirm />
    </div>
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no TS errors.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npm test -- --watch=false`

Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout/admin-shell/admin-shell.component.ts
git commit -m "feat(layout): mount profile drawer and logout modal in admin shell"
```

---

## Task 10: Remove the old standalone change-password route

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Remove the route block**

Open `src/app/app.routes.ts`. Find this block (currently inside the `children` of the authed `''` route):

```typescript
      {
        path: 'profile/change-password',
        loadComponent: () =>
          import('./features/profile/pages/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
```

Delete it entirely (and the blank line above/below it if any).

- [ ] **Step 2: Verify the file still compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no TS errors. (The route no longer references the component, but the component file still exists — TS doesn't complain about unused files.)

- [ ] **Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "chore(profile): remove standalone /profile/change-password route"
```

---

## Task 11: Delete the standalone change-password page files

**Files:**
- Delete: `src/app/features/profile/pages/change-password/change-password.component.ts`
- Delete: `src/app/features/profile/pages/change-password/change-password.component.spec.ts`
- Delete: empty parent directories.

- [ ] **Step 1: Delete the files**

Run (from `C:\Users\Mateo\Desktop\tesis\FRONTEND-LABORATORIO`):

```bash
rm src/app/features/profile/pages/change-password/change-password.component.ts
rm src/app/features/profile/pages/change-password/change-password.component.spec.ts
rmdir src/app/features/profile/pages/change-password
rmdir src/app/features/profile/pages
```

The two `rmdir` calls will succeed only if those directories are empty. If `pages/` still has other children (none expected per current state), leave it alone — just delete `change-password/`.

- [ ] **Step 2: Verify the file still compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no TS errors.

- [ ] **Step 3: Run the full test suite to confirm no regressions**

Run: `npm test -- --watch=false`

Expected: all green. The 3 tests that lived in the deleted spec file are no longer in the count, but no other spec referenced the deleted component.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/features/profile/pages/
git commit -m "chore(profile): delete obsolete standalone change-password page"
```

The `-A` is needed so git picks up the deletions.

---

## Task 12: Full test suite + manual smoke test

**Files:** none (verification step).

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --watch=false`

Expected: ALL specs green. The total count should be the previous 53 minus 3 (deleted change-password spec) plus 24 new tests (5 UserSession + 4 ProfileMenu service + 6 ProfileMenu component + 6 ChangePasswordDrawer + 3 LogoutConfirm) plus 1 new assertion in the interceptor spec = **74 tests** (count may differ by 1-2 depending on how the spec counted previously).

- [ ] **Step 2: TypeScript clean check**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the backend (`cd ../Backend && ./mvnw spring-boot:run`) and frontend (`npm start`). Verify in the browser:

| # | Step | Expected |
|---|------|----------|
| 1 | Login with `admin@lab.test` / `password` | Lands on `/home`; topbar avatar shows real initials (e.g. `AD`), not `DP` |
| 2 | Click avatar | Popover slides down below the avatar |
| 3 | Inspect header | Shows `Admin Dev` (or whatever the seeded user is), email, role badge, tenant name |
| 4 | Inspect items | `Mi perfil`, `Configuración de empresa`, `Cambiar sucursal` row are visibly disabled with "Próximamente" badges; click does nothing |
| 5 | Click "Cambiar contraseña" | Popover closes; drawer slides in from the right with the form empty |
| 6 | Submit with wrong current password | Red banner "La contraseña actual es incorrecta." |
| 7 | Submit with valid values (e.g. current `password`, new `nueva1234`) | Green banner "Contraseña actualizada. Cerrando tu sesión..." appears for 2s, then redirect to `/login` |
| 8 | Re-login with new password | Success |
| 9 | Open popover again → "Cerrar sesión" | Popover closes; modal "¿Cerrar sesión?" appears centered |
| 10 | Click "Cancelar" | Modal closes, still logged in |
| 11 | Open modal again, click "Cerrar sesión" | Token + user blob cleared, redirect to `/login`; check `localStorage` to confirm `labcore_token` and `labcore_user` are gone |
| 12 | F5 on `/home` while logged in | Stays logged in; avatar still shows real initials (user blob persisted) |
| 13 | While logged in, edit `localStorage.labcore_token` to garbage, navigate anywhere | Some request hits the 401 path → token + user cleared, redirect to `/login` |

- [ ] **Step 4: If any flow breaks, debug and fix**

For UI issues (popover position, drawer width, disabled item appearance), tune the CSS in the relevant component file and commit fixes as separate small commits.

- [ ] **Step 5: Final commit (only if smoke fixes were needed)**

If you needed any fixes during the smoke:

```bash
git add <files>
git commit -m "fix(profile): smoke-test corrections"
```

---

## Done criteria

- All 11 implementation tasks committed (Task 12 is verification, may add at most one fix commit).
- `npm test -- --watch=false` is green.
- `npx tsc --noEmit -p tsconfig.app.json` clean.
- The 13 manual smoke checks all pass in the browser.
- `git log --oneline origin/development..HEAD` includes the 11 task commits scoped one concern per commit.
- No file under `src/app/features/profile/pages/` exists.
- The PR description for `feature/auth` mentions both the auth work and the new profile menu (or a follow-up PR explicitly extending it).

When all of the above hold, the branch is ready for PR review.

---

## Out of scope (intentional)

- **Mi perfil drawer** with profile data form. Needs `GET /api/v1/user/me` + `PUT /api/v1/user/{id}` backend endpoints; neither exists today. Item appears disabled.
- **Sucursal switcher.** Needs branch listing per tenant + context switch flow (likely a JWT reissue). Item shows current branch with check + hint.
- **Configuración de empresa.** When the `empresa` feature has its own screens, this item navigates there. Today disabled.
- **Server-side JWT invalidation on password change.** Today we cover it client-side with the 2-second autologout. Real invalidation (for concurrent sessions in other browsers) needs a token blacklist or token versioning on the backend.
- **Real tenant config endpoint** `GET /api/tenant/config`. Still uses the `DEV_TENANT` fallback (out of scope for both the auth and the profile menu PRs).
