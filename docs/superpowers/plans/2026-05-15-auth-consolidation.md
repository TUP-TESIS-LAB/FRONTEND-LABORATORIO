# Auth Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing dev-bypass login at `@core/auth/login` to the real backend, add the missing auth pages (first-login, forgot-password, reset-password, change-password), and add 401 handling to the existing interceptor — reusing `TokenService`, `authTokenInterceptor`, `tenantIdInterceptor`, and the `@core/guards/` family without duplicating them.

**Architecture:** Single source of truth for token state remains `TokenService` (extended with `getUserId()` to surface the JWT `sub` claim as a number). One HTTP service `AuthApiService` (`providedIn: 'root'`) wraps all `/api/v1/auth/*` calls. One `ProfileApiService` wraps `PUT /api/v1/user/{id}/password`. New pages live under `src/app/features/auth/pages/*` and `src/app/features/profile/pages/*`, registered as top-level routes in `app.routes.ts`. Existing `LoginComponent` is modified in place (template + onSubmit) — its DEV `buildDevToken` helper is removed; the existing `dispatch(loadTenantConfigSuccess(DEV_TENANT))` call stays as a DEV-fallback (with explicit comment) until `GET /api/tenant/config` exists in the backend. The DEV-ONLY `provideAppInitializer` that clears the token in `app.config.ts` is removed.

**Tech Stack:** Angular 17+ standalone components · Reactive Forms · Signals · PrimeNG (Button, Password, FloatLabel, Message, InputText) · NgRx classic (existing tenant store, no new stores) · RxJS · Karma/Jasmine.

**Spec reference:** This plan is self-contained — no separate spec document. Design decisions are in the per-task "Why" notes.

**Pre-flight context (run once before starting any task):**
- Active branch must be `feature/auth` based on `origin/development`. Verify with `git status` → should print `On branch feature/auth ... Your branch is up to date with 'origin/development'`.
- Reference implementations live in `archive/auth-old-attempt`. To consult: `git show archive/auth-old-attempt:<path>`.
- Tag `backup/pre-auth-move-20260515` is a safety net pointing at the original `522dad5`.
- Run baseline tests once: `npm test -- --watch=false --browsers=ChromeHeadless` → expect green. If not green, stop and investigate before starting.

---

## File Structure

**Modify:**
- `src/app/core/auth/token.service.ts` — add `getUserId(): number | null` method.
- `src/app/core/auth/token.service.spec.ts` — add test for `getUserId`.
- `src/app/core/interceptors/auth-token.interceptor.ts` — handle 401 by clearing token + redirecting to `/login`.
- `src/app/core/interceptors/auth-token.interceptor.spec.ts` — add 401 path test.
- `src/app/core/auth/login/login.component.ts` — replace `buildDevToken` with real `AuthApiService.loginInternal` call, add error UI, add "¿Olvidaste tu contraseña?" link, clear seeded form values, remove `buildDevToken` + `base64url` helpers.
- `src/app/app.config.ts` — remove the DEV-ONLY `provideAppInitializer` block (lines 47-51 in current file).
- `src/app/app.routes.ts` — register 4 new top-level routes (`first-login`, `forgot-password`, `reset-password`) and 1 child route under `''` (`profile/change-password`).

**Create:**
- `src/app/features/auth/models/auth.models.ts` — request/response interfaces (`LoginResponse`, `UserResponse`, `RoleResponse`, plus 4 request DTOs).
- `src/app/features/auth/services/auth-api.service.ts` — HTTP wrapper for `/api/v1/auth/*`.
- `src/app/features/auth/services/auth-api.service.spec.ts` — service spec.
- `src/app/features/auth/pages/forgot-password/forgot-password.component.ts`
- `src/app/features/auth/pages/forgot-password/forgot-password.component.spec.ts`
- `src/app/features/auth/pages/reset-password/reset-password.component.ts`
- `src/app/features/auth/pages/reset-password/reset-password.component.spec.ts`
- `src/app/features/auth/pages/first-login/first-login.component.ts`
- `src/app/features/auth/pages/first-login/first-login.component.spec.ts`
- `src/app/features/profile/services/profile-api.service.ts`
- `src/app/features/profile/services/profile-api.service.spec.ts`
- `src/app/features/profile/pages/change-password/change-password.component.ts`
- `src/app/features/profile/pages/change-password/change-password.component.spec.ts`
- `src/app/core/guards/guest.guard.ts` — redirects authenticated users away from auth pages.
- `src/app/core/guards/guest.guard.spec.ts`
- `src/app/shared/validators/passwords-match.validator.ts` — extracted DRY helper used by 3 components.
- `src/app/shared/validators/passwords-match.validator.spec.ts`

**Delete:**
- Nothing. The archive branch is untouched (referenced only).

**Notes on naming and reuse:**
- The new `AuthApiService` is intentionally named the same as the archive's, but it lives in `src/app/features/auth/services/` and is annotated `@Injectable({ providedIn: 'root' })` — no route-level providers needed.
- `LoginResponse.user.id` is a `number` (per backend `UserResponse`). The JWT `sub` claim carries the same id as a string, so `TokenService.getUserId()` parses `Number(payload.sub)` and returns `null` on `NaN`.
- All new components use PrimeNG (`Button`, `Password`, `FloatLabel`, `Message`, `InputText`) and Tailwind utility classes — matching what the archive used and what the project already imports.

---

## Task 1: Add `getUserId` to TokenService

**Files:**
- Modify: `src/app/core/auth/token.service.ts`
- Test: `src/app/core/auth/token.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Append this test inside the existing `describe('TokenService', ...)` block in `src/app/core/auth/token.service.spec.ts`, immediately after the existing `it('should clear token on removeToken', ...)`:

```typescript
  it('should decode userId from JWT sub claim', () => {
    service.setToken(MOCK_JWT);
    expect(service.getUserId()).toBe(1);
  });

  it('should return null for userId when no token', () => {
    expect(service.getUserId()).toBeNull();
  });

  it('should return null for userId when sub is not numeric', () => {
    const nonNumericSubJwt = [
      'eyJhbGciOiJIUzI1NiJ9',
      // payload: { sub: 'abc', tenant_id: 'lab1', ..., exp: 9999999999, iat: 1 }
      'eyJzdWIiOiJhYmMiLCJ0ZW5hbnRfaWQiOiJsYWIxIiwiZW1haWwiOiJhQGIuY29tIiwibmFtZSI6IkFuYSIsInJvbGVzIjpbImFkbWluIl0sImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxfQ',
      'sig',
    ].join('.');
    service.setToken(nonNumericSubJwt);
    expect(service.getUserId()).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/token.service.spec.ts'`

Expected: 3 FAIL — `service.getUserId is not a function`.

- [ ] **Step 3: Implement `getUserId`**

In `src/app/core/auth/token.service.ts`, add this method immediately after the existing `getTenantId(): string | null` method (and before `getRoles`):

```typescript
  getUserId(): number | null {
    const sub = this.getPayload()?.sub;
    if (sub == null) return null;
    const id = Number(sub);
    return Number.isFinite(id) ? id : null;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/token.service.spec.ts'`

Expected: all green (existing + 3 new tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/token.service.ts src/app/core/auth/token.service.spec.ts
git commit -m "feat(auth): add getUserId to TokenService"
```

---

## Task 2: Extract `passwordsMatch` cross-field validator

**Why:** The validator is needed by 3 components (`first-login`, `reset-password`, `change-password`). Extracting once avoids duplication.

**Files:**
- Create: `src/app/shared/validators/passwords-match.validator.ts`
- Create: `src/app/shared/validators/passwords-match.validator.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/shared/validators/passwords-match.validator.spec.ts`:

```typescript
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { passwordsMatch } from './passwords-match.validator';

describe('passwordsMatch', () => {
  function buildGroup(newPw: string, confirmPw: string): FormGroup {
    return new FormGroup({
      newPassword: new FormControl(newPw, { nonNullable: true, validators: [Validators.required] }),
      confirmPassword: new FormControl(confirmPw, { nonNullable: true, validators: [Validators.required, passwordsMatch] }),
    });
  }

  it('returns null when passwords match', () => {
    const group = buildGroup('abc12345', 'abc12345');
    expect(group.get('confirmPassword')?.errors).toBeNull();
  });

  it('returns { mismatch: true } when passwords differ', () => {
    const group = buildGroup('abc12345', 'xyz12345');
    expect(group.get('confirmPassword')?.errors).toEqual({ mismatch: true });
  });

  it('returns null when control has no parent yet', () => {
    const orphan = new FormControl('anything', { nonNullable: true, validators: [passwordsMatch] });
    expect(passwordsMatch(orphan)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/passwords-match.validator.spec.ts'`

Expected: FAIL — cannot resolve module.

- [ ] **Step 3: Implement the validator**

Create `src/app/shared/validators/passwords-match.validator.ts`:

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const parent = control.parent;
  if (!parent) return null;
  return parent.get('newPassword')?.value === control.value ? null : { mismatch: true };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/passwords-match.validator.spec.ts'`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/validators/passwords-match.validator.ts src/app/shared/validators/passwords-match.validator.spec.ts
git commit -m "feat(shared): add passwordsMatch cross-field validator"
```

---

## Task 3: Create auth models

**Files:**
- Create: `src/app/features/auth/models/auth.models.ts`

No tests — pure type declarations.

- [ ] **Step 1: Create the file**

Create `src/app/features/auth/models/auth.models.ts`:

```typescript
export interface RoleResponse {
  id: number;
  code: string;
  description: string;
  hierarchy: number;
}

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string | null;
  document: string | null;
  isEmailVerified: boolean;
  isExternal: boolean;
  branch: number | null;
  isFirstLogin: boolean;
  active: boolean;
  roles: RoleResponse[];
}

export interface LoginResponse {
  token: string | null;
  firstLoginToken: string | null;
  user: UserResponse;
  isFirstLogin: boolean;
}

export interface SetFirstLoginPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build -- --configuration development` (or `ng build`).

Expected: no TS errors related to the new file. The file exports types only, nothing should reference them yet, so compile must succeed.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/auth/models/auth.models.ts
git commit -m "feat(auth): add auth request/response models"
```

---

## Task 4: Create `AuthApiService`

**Files:**
- Create: `src/app/features/auth/services/auth-api.service.ts`
- Create: `src/app/features/auth/services/auth-api.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/auth/services/auth-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthApiService } from './auth-api.service';
import { LoginResponse, UserResponse } from '../models/auth.models';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthApiService],
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loginInternal posts credentials and returns LoginResponse', async () => {
    const mockUser: UserResponse = {
      id: 1, firstName: 'Ana', lastName: 'Perez', username: 'ana', email: 'a@b.com',
      phone: null, document: null, isEmailVerified: true, isExternal: false,
      branch: null, isFirstLogin: false, active: true, roles: [],
    };
    const mockResp: LoginResponse = { token: 'jwt', firstLoginToken: null, user: mockUser, isFirstLogin: false };

    const promise = service.loginInternal('a@b.com', 'pw12345678');
    const req = http.expectOne('/api/v1/auth/internal/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'pw12345678' });
    req.flush(mockResp);

    expect(await promise).toEqual(mockResp);
  });

  it('internalForgotPassword posts email', async () => {
    const promise = service.internalForgotPassword('a@b.com');
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com' });
    req.flush(null);
    await promise;
  });

  it('validateResetToken posts token with X-Tenant-Id header', async () => {
    const promise = service.validateResetToken('tok12345', 'lab1');
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345' });
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await promise;
  });

  it('resetPassword posts token + newPassword with X-Tenant-Id header', async () => {
    const promise = service.resetPassword('tok12345', 'newpw1234', 'lab1');
    const req = http.expectOne('/api/v1/auth/password/reset');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await promise;
  });

  it('setFirstLoginPassword posts token + newPassword', async () => {
    const promise = service.setFirstLoginPassword('tok12345', 'newpw1234');
    const req = http.expectOne('/api/v1/auth/first-login/set-password-with-token');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    req.flush(null);
    await promise;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/auth-api.service.spec.ts'`

Expected: FAIL — cannot resolve `./auth-api.service`.

- [ ] **Step 3: Implement the service**

Create `src/app/features/auth/services/auth-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  LoginResponse,
  ResetPasswordRequest,
  ValidateTokenRequest,
} from '../models/auth.models';

const BASE = '/api/v1/auth';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  loginInternal(email: string, password: string): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${BASE}/internal/login`, { email, password }),
    );
  }

  internalForgotPassword(email: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${BASE}/internal/password/forgot`, { email }),
    );
  }

  validateResetToken(token: string, tenantId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${BASE}/password/validate-token`,
        { token } satisfies ValidateTokenRequest,
        { headers: new HttpHeaders({ 'X-Tenant-Id': tenantId }) },
      ),
    );
  }

  resetPassword(token: string, newPassword: string, tenantId: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${BASE}/password/reset`,
        { token, newPassword } satisfies ResetPasswordRequest,
        { headers: new HttpHeaders({ 'X-Tenant-Id': tenantId }) },
      ),
    );
  }

  setFirstLoginPassword(token: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${BASE}/first-login/set-password-with-token`, { token, newPassword }),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/auth-api.service.spec.ts'`

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/models/auth.models.ts src/app/features/auth/services/
git commit -m "feat(auth): add AuthApiService and request/response models"
```

(Note: this re-stages the models file too if it wasn't committed yet. If the previous commit already includes it, only the new files will be staged.)

---

## Task 5: Create `guestGuard`

**Files:**
- Create: `src/app/core/guards/guest.guard.ts`
- Create: `src/app/core/guards/guest.guard.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/core/guards/guest.guard.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { guestGuard } from './guest.guard';
import { TokenService } from '@core/auth/token.service';

describe('guestGuard', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['isTokenValid']);
    router = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
    TestBed.configureTestingModule({
      providers: [
        { provide: TokenService, useValue: tokenService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('returns true when no valid token', () => {
    tokenService.isTokenValid.and.returnValue(false);
    expect(run()).toBe(true);
  });

  it('redirects to / when valid token present', () => {
    tokenService.isTokenValid.and.returnValue(true);
    const fakeTree = {} as UrlTree;
    router.createUrlTree.and.returnValue(fakeTree);
    expect(run()).toBe(fakeTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/guest.guard.spec.ts'`

Expected: FAIL — cannot resolve `./guest.guard`.

- [ ] **Step 3: Implement the guard**

Create `src/app/core/guards/guest.guard.ts`:

```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  if (!tokens.isTokenValid()) return true;
  return router.createUrlTree(['/']);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/guest.guard.spec.ts'`

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/core/guards/guest.guard.ts src/app/core/guards/guest.guard.spec.ts
git commit -m "feat(auth): add guestGuard for auth pages"
```

---

## Task 6: 401 handling in `authTokenInterceptor`

**Why:** When the backend returns 401 (token expired or invalid mid-session), the interceptor must clear the token and redirect to `/login` so the user re-authenticates instead of seeing a broken page.

**Files:**
- Modify: `src/app/core/interceptors/auth-token.interceptor.ts`
- Modify: `src/app/core/interceptors/auth-token.interceptor.spec.ts` (existing file)

- [ ] **Step 1: Inspect existing spec to extend it correctly**

Open `src/app/core/interceptors/auth-token.interceptor.spec.ts` to see the existing test setup. Read it fully before adding new tests.

- [ ] **Step 2: Add the failing 401 test**

Append to the existing `describe` block in `src/app/core/interceptors/auth-token.interceptor.spec.ts`:

```typescript
  it('clears token and redirects to /login on 401', async () => {
    const tokenService = TestBed.inject(TokenService);
    const router = TestBed.inject(Router);
    const removeSpy = spyOn(tokenService, 'removeToken');
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    spyOn(tokenService, 'getToken').and.returnValue('some.jwt.token');

    const http = TestBed.inject(HttpClient);
    const httpTest = TestBed.inject(HttpTestingController);

    const errorPromise = firstValueFrom(http.get('/api/v1/anything')).catch(e => e);

    const req = httpTest.expectOne('/api/v1/anything');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const err = await errorPromise;
    expect(err.status).toBe(401);
    expect(removeSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
```

Make sure the file imports at the top include (add if missing):

```typescript
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { HttpTestingController } from '@angular/common/http/testing';
import { TokenService } from '@core/auth/token.service';
```

And the `TestBed.configureTestingModule` providers list must include `Router` (real or stub). If the existing setup uses `provideRouter([])`, that is enough. If not, add `provideRouter([])` from `@angular/router` to the providers array.

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/auth-token.interceptor.spec.ts'`

Expected: the new test FAILS — `removeSpy` not called and/or `navigateSpy` not called.

- [ ] **Step 4: Implement 401 handling**

Replace the contents of `src/app/core/interceptors/auth-token.interceptor.ts` with:

```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { TokenService } from '@core/auth/token.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const router = inject(Router);
  const token = tokens.getToken();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        tokens.removeToken();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/auth-token.interceptor.spec.ts'`

Expected: all PASS (existing + new 401 test).

- [ ] **Step 6: Commit**

```bash
git add src/app/core/interceptors/auth-token.interceptor.ts src/app/core/interceptors/auth-token.interceptor.spec.ts
git commit -m "feat(auth): handle 401 by clearing token and redirecting to login"
```

---

## Task 7: Wire LoginComponent to real backend

**Why:** The current `LoginComponent` fabricates a JWT via `buildDevToken`. Replace that with `AuthApiService.loginInternal`. Keep the existing template + styles. Add an error message slot, a "¿Olvidaste tu contraseña?" routerLink, and remove placeholder form values.

**Files:**
- Modify: `src/app/core/auth/login/login.component.ts`

No new spec — the existing dev-bypass had no spec, and component specs for fully-templated pages have low ROI; the service spec covers HTTP behavior. (If a spec is desired later, it can be added in a follow-up.)

- [ ] **Step 1: Replace imports block at the top**

Open `src/app/core/auth/login/login.component.ts` and replace lines 1-25 (everything from the first `import` through the closing `};` of `DEV_TENANT`) with:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { TokenService } from '@core/auth/token.service';
import { TenantConfig } from '@core/models/tenant.model';
import { ModuleKey } from '@core/models/module-key.enum';
import { loadTenantConfigSuccess } from '@core/tenant/store/tenant.actions';
import { AuthApiService } from '@features/auth/services/auth-api.service';

// DEV fallback: backend has no `GET /api/tenant/config` endpoint yet. After a
// successful login we seed the tenant store with this config so the tenant
// resolver at `/` doesn't hang. Remove once the endpoint is implemented.
const DEV_TENANT: TenantConfig = {
  id: 'dev-tenant',
  name: 'LaboratoApp',
  logoUrl: '',
  brandPrimary:   '#1d4ed8',
  brandSecondary: '#0ea5a4',
  brandAccent:    '#f97316',
  modules: [
    ModuleKey.Turnos,
    ModuleKey.Financiero,
    ModuleKey.Medicos,
    ModuleKey.Stock,
    ModuleKey.Portal,
  ],
};
```

- [ ] **Step 2: Update `imports` array in the `@Component` decorator**

Find the line `imports: [ReactiveFormsModule],` and change it to:

```typescript
  imports: [ReactiveFormsModule, RouterLink],
```

- [ ] **Step 3: Replace the "¿Olvidaste tu contraseña?" placeholder span**

Find the line:

```html
            <span class="auth-link" aria-disabled="true">¿Olvidaste tu contraseña?</span>
```

Replace it with:

```html
            <a class="auth-link" routerLink="/forgot-password">¿Olvidaste tu contraseña?</a>
```

- [ ] **Step 4: Add error message slot in the template**

Find the existing block that contains the submit button:

```html
          <button type="submit" class="auth-btn" [disabled]="submitting()">
            @if (submitting()) {
              <i class="pi pi-spin pi-spinner"></i> Ingresando…
            } @else {
              <i class="pi pi-sign-in"></i> Iniciar sesión
            }
          </button>
```

Immediately ABOVE that `<button>` (still inside `auth-card__body`), insert:

```html
          @if (error()) {
            <div class="auth-error" role="alert">
              <i class="pi pi-exclamation-circle"></i>
              <span>{{ error() }}</span>
            </div>
          }

```

- [ ] **Step 5: Add `.auth-error` styles**

Find the `.auth-helper` block in the `styles:` template literal:

```css
    .auth-helper {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin: var(--space-3) 0 0;
    }
```

Immediately BEFORE that block, insert:

```css
    .auth-error {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      padding: 10px 12px;
      margin-bottom: var(--space-3);
      background: color-mix(in srgb, #ef4444 8%, transparent);
      border: 1px solid color-mix(in srgb, #ef4444 30%, transparent);
      border-radius: 8px;
      color: #b91c1c;
      font-size: 12px;
    }
    .auth-error .pi { font-size: 14px; }

```

- [ ] **Step 6: Replace the component class body**

Find the class declaration:

```typescript
export class LoginComponent {
```

Replace the entire class body (from the opening `{` of `LoginComponent` down to and including the final `}` of the class, but NOT including the file-level `buildDevToken` and `base64url` functions below) with:

```typescript
export class LoginComponent {
  private readonly fb       = inject(FormBuilder);
  private readonly router   = inject(Router);
  private readonly tokens   = inject(TokenService);
  private readonly store    = inject(Store);
  private readonly authApi  = inject(AuthApiService);

  protected readonly passVisible = signal(false);
  protected readonly submitting  = signal(false);
  protected readonly error       = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  protected togglePassVisible(): void {
    this.passVisible.update(v => !v);
  }

  protected async onSubmit(): Promise<void> {
    if (this.submitting() || this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    try {
      const { email, password } = this.form.getRawValue();
      const response = await this.authApi.loginInternal(email, password);

      if (response.isFirstLogin && response.firstLoginToken) {
        await this.router.navigate(['/first-login'], {
          state: { firstLoginToken: response.firstLoginToken },
        });
        return;
      }

      if (response.token) {
        this.tokens.setToken(response.token);
        // DEV fallback (see comment near DEV_TENANT). Remove once tenant config endpoint exists.
        this.store.dispatch(loadTenantConfigSuccess({ config: DEV_TENANT }));
        await this.router.navigate(['/home']);
        return;
      }

      this.error.set('No se pudo iniciar sesión. Intentá de nuevo.');
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 401)) {
        this.error.set('Email o contraseña incorrectos.');
      } else {
        this.error.set('Ocurrió un error. Intentá de nuevo más tarde.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}
```

- [ ] **Step 7: Remove the file-level helpers**

After the class, delete the two functions:

```typescript
function buildDevToken(email: string): string { ... }
function base64url(input: string): string { ... }
```

The file should end with the closing `}` of `LoginComponent`.

- [ ] **Step 8: Verify the file compiles**

Run: `npm run build -- --configuration development`

Expected: no TS errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/core/auth/login/login.component.ts
git commit -m "feat(auth): wire LoginComponent to real backend (replace dev-bypass)"
```

---

## Task 8: Create `ForgotPasswordComponent`

**Files:**
- Create: `src/app/features/auth/pages/forgot-password/forgot-password.component.ts`
- Create: `src/app/features/auth/pages/forgot-password/forgot-password.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/auth/pages/forgot-password/forgot-password.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('disables submit while email invalid', () => {
    const comp = fixture.componentInstance;
    expect(comp['form'].invalid).toBeTrue();
    comp['form'].patchValue({ email: 'not-email' });
    expect(comp['form'].invalid).toBeTrue();
    comp['form'].patchValue({ email: 'a@b.com' });
    expect(comp['form'].valid).toBeTrue();
  });

  it('shows success state after API call resolves', async () => {
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ email: 'a@b.com' });
    const submit = comp['onSubmit']();
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    expect(req.request.body).toEqual({ email: 'a@b.com' });
    req.flush(null);
    await submit;
    expect(comp['sent']()).toBeTrue();
    expect(comp['error']()).toBeNull();
  });

  it('shows error on failed API call', async () => {
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ email: 'a@b.com' });
    const submit = comp['onSubmit']();
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    req.flush(null, { status: 500, statusText: 'Server Error' });
    await submit;
    expect(comp['sent']()).toBeFalse();
    expect(comp['error']()).toBe('Ocurrió un error. Intentá de nuevo más tarde.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/forgot-password.component.spec.ts'`

Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/app/features/auth/pages/forgot-password/forgot-password.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, InputText, FloatLabel, Message, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-2 text-center">Olvidé mi contraseña</h1>
        <p class="text-sm text-[var(--ds-text-muted)] text-center mb-8">
          Ingresá tu email y te enviaremos un link para restablecer tu contraseña.
        </p>

        @if (sent()) {
          <p-message
            severity="success"
            text="Si el email existe en el sistema, recibirás un link para restablecer tu contraseña."
            styleClass="w-full mb-6"
          />
          <a routerLink="/login" class="block text-center text-sm text-[var(--brand-primary)] hover:underline">
            Volver al login
          </a>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <p-floatlabel>
              <input
                pInputText
                id="email"
                formControlName="email"
                inputmode="email"
                autocomplete="email"
                class="w-full"
              />
              <label for="email">Email</label>
            </p-floatlabel>

            @if (error()) {
              <p-message severity="error" [text]="error()!" styleClass="w-full" />
            }

            <p-button
              type="submit"
              label="Enviar link"
              [loading]="loading()"
              [disabled]="form.invalid || loading()"
              styleClass="w-full"
            />

            <a routerLink="/login" class="text-center text-sm text-[var(--brand-primary)] hover:underline">
              Volver al login
            </a>
          </form>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly authApi = inject(AuthApiService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sent = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', { validators: [Validators.required, Validators.email], nonNullable: true }),
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.internalForgotPassword(this.form.getRawValue().email);
      this.sent.set(true);
    } catch {
      this.error.set('Ocurrió un error. Intentá de nuevo más tarde.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/forgot-password.component.spec.ts'`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/pages/forgot-password/
git commit -m "feat(auth): add ForgotPasswordComponent"
```

---

## Task 9: Create `ResetPasswordComponent`

**Files:**
- Create: `src/app/features/auth/pages/reset-password/reset-password.component.ts`
- Create: `src/app/features/auth/pages/reset-password/reset-password.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/auth/pages/reset-password/reset-password.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let http: HttpTestingController;

  function configure(token: string, tenantId: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token, tenantId }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http?.verify());

  it('marks tokenInvalid when token query param missing', () => {
    configure('', '');
    fixture.detectChanges();
    expect(fixture.componentInstance['tokenInvalid']()).toBeTrue();
  });

  it('validates token on init and stays valid when API resolves', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await fixture.whenStable();
    expect(fixture.componentInstance['tokenInvalid']()).toBeFalse();
  });

  it('marks tokenInvalid when validate API errors', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    req.flush(null, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(fixture.componentInstance['tokenInvalid']()).toBeTrue();
  });

  it('submits reset and shows success', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    http.expectOne('/api/v1/auth/password/validate-token').flush(null);
    await fixture.whenStable();
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ newPassword: 'newpw1234', confirmPassword: 'newpw1234' });
    const submit = comp['onSubmit']();
    const resetReq = http.expectOne('/api/v1/auth/password/reset');
    expect(resetReq.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    resetReq.flush(null);
    await submit;
    expect(comp['success']()).toBeTrue();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/reset-password.component.spec.ts'`

Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/app/features/auth/pages/reset-password/reset-password.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-8 text-center">Nueva contraseña</h1>

        @if (tokenInvalid()) {
          <div class="flex flex-col items-center gap-4">
            <p-message severity="error" text="El link expiró o ya fue utilizado." styleClass="w-full" />
            <a routerLink="/forgot-password" class="text-sm text-[var(--brand-primary)] hover:underline">
              Solicitar nuevo link
            </a>
          </div>
        } @else if (success()) {
          <div class="flex flex-col items-center gap-4">
            <p-message severity="success" text="Contraseña actualizada. Ya podés ingresar con tu nueva contraseña." styleClass="w-full" />
            <a routerLink="/login" class="text-sm text-[var(--brand-primary)] hover:underline">Ir al login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <p-floatlabel>
              <p-password formControlName="newPassword" [toggleMask]="true" inputId="newPassword"
                styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="newPassword">Nueva contraseña</label>
            </p-floatlabel>

            <p-floatlabel>
              <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
                inputId="confirmPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="confirmPassword">Confirmar contraseña</label>
            </p-floatlabel>

            @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
              <p-message severity="error" text="Las contraseñas no coinciden." styleClass="w-full" />
            }

            @if (error()) { <p-message severity="error" [text]="error()!" styleClass="w-full" /> }

            <p-button type="submit" label="Guardar contraseña" [loading]="loading()"
              [disabled]="form.invalid || loading()" styleClass="w-full" />
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly tokenInvalid = signal(false);
  protected readonly success = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  private resetToken = '';
  private tenantId = '';

  protected readonly form = new FormGroup({
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    this.resetToken = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? '';

    if (!this.resetToken || !this.tenantId) {
      this.tokenInvalid.set(true);
      return;
    }

    try {
      await this.authApi.validateResetToken(this.resetToken, this.tenantId);
    } catch {
      this.tokenInvalid.set(true);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.resetPassword(
        this.resetToken,
        this.form.getRawValue().newPassword,
        this.tenantId,
      );
      this.success.set(true);
    } catch {
      this.error.set('No se pudo actualizar la contraseña. El link puede haber expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Verify path alias `@shared` resolves**

Open `tsconfig.json` and confirm `paths` includes a `@shared/*` mapping. If it does NOT, replace the import `from '@shared/validators/passwords-match.validator'` with a relative path: `from '../../../../shared/validators/passwords-match.validator'`. Same applies to the `first-login` and `change-password` components in later tasks.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/reset-password.component.spec.ts'`

Expected: 4 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/auth/pages/reset-password/
git commit -m "feat(auth): add ResetPasswordComponent"
```

---

## Task 10: Create `FirstLoginComponent`

**Files:**
- Create: `src/app/features/auth/pages/first-login/first-login.component.ts`
- Create: `src/app/features/auth/pages/first-login/first-login.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/auth/pages/first-login/first-login.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { FirstLoginComponent } from './first-login.component';

describe('FirstLoginComponent', () => {
  let fixture: ComponentFixture<FirstLoginComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FirstLoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(FirstLoginComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows error placeholder when no firstLoginToken in navigation state', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance['token']()).toBeNull();
  });

  it('submits set-password with token from navigation state', async () => {
    const router = TestBed.inject(Router);
    spyOn(router, 'getCurrentNavigation').and.returnValue({
      extras: { state: { firstLoginToken: 'tok12345' } },
    } as ReturnType<Router['getCurrentNavigation']>);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.detectChanges();
    const comp = fixture.componentInstance;
    expect(comp['token']()).toBe('tok12345');

    comp['form'].patchValue({ newPassword: 'newpw1234', confirmPassword: 'newpw1234' });
    const submit = comp['onSubmit']();
    const req = http.expectOne('/api/v1/auth/first-login/set-password-with-token');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    req.flush(null);
    await submit;
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/first-login.component.spec.ts'`

Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/app/features/auth/pages/first-login/first-login.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { AuthApiService } from '../../services/auth-api.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-first-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--ds-bg)] px-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1 class="text-2xl font-bold text-[var(--ds-text)] mb-2 text-center">Primer acceso</h1>
        <p class="text-sm text-[var(--ds-text-muted)] text-center mb-8">
          Configurá tu contraseña para continuar.
        </p>

        @if (!token()) {
          <p-message severity="error"
            text="El link de primer acceso no es válido. Solicitá uno nuevo al administrador."
            styleClass="w-full" />
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
            <p-floatlabel>
              <p-password formControlName="newPassword" [toggleMask]="true" inputId="newPassword"
                styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="newPassword">Nueva contraseña</label>
            </p-floatlabel>

            <p-floatlabel>
              <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
                inputId="confirmPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
              <label for="confirmPassword">Confirmar contraseña</label>
            </p-floatlabel>

            @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
              <p-message severity="error" text="Las contraseñas no coinciden." styleClass="w-full" />
            }
            @if (error()) { <p-message severity="error" [text]="error()!" styleClass="w-full" /> }

            <p-button type="submit" label="Guardar contraseña" [loading]="loading()"
              [disabled]="form.invalid || loading()" styleClass="w-full" />
          </form>
        }
      </div>
    </div>
  `,
})
export class FirstLoginComponent implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = new FormGroup({
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { firstLoginToken?: string } | undefined;
    this.token.set(state?.firstLoginToken ?? null);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading() || !this.token()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authApi.setFirstLoginPassword(this.token()!, this.form.getRawValue().newPassword);
      await this.router.navigate(['/login']);
    } catch {
      this.error.set('No se pudo guardar la contraseña. El link puede haber expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/first-login.component.spec.ts'`

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/pages/first-login/
git commit -m "feat(auth): add FirstLoginComponent"
```

---

## Task 11: Create `ProfileApiService`

**Files:**
- Create: `src/app/features/profile/services/profile-api.service.ts`
- Create: `src/app/features/profile/services/profile-api.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/profile/services/profile-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ProfileApiService } from './profile-api.service';

describe('ProfileApiService', () => {
  let service: ProfileApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProfileApiService],
    });
    service = TestBed.inject(ProfileApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('changePassword PUTs to /api/v1/user/{id}/password with credentials', async () => {
    const promise = service.changePassword(42, 'old12345', 'new12345');
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await promise;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/profile-api.service.spec.ts'`

Expected: FAIL — cannot resolve service.

- [ ] **Step 3: Implement the service**

Create `src/app/features/profile/services/profile-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(`/api/v1/user/${userId}/password`, { currentPassword, newPassword }),
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/profile-api.service.spec.ts'`

Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/services/
git commit -m "feat(profile): add ProfileApiService for change password"
```

---

## Task 12: Create `ChangePasswordComponent`

**Files:**
- Create: `src/app/features/profile/pages/change-password/change-password.component.ts`
- Create: `src/app/features/profile/pages/change-password/change-password.component.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/features/profile/pages/change-password/change-password.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let http: HttpTestingController;
  let tokens: jasmine.SpyObj<TokenService>;

  beforeEach(() => {
    tokens = jasmine.createSpyObj<TokenService>('TokenService', ['getUserId']);
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenService, useValue: tokens },
      ],
    });
    fixture = TestBed.createComponent(ChangePasswordComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('does nothing when no userId', async () => {
    tokens.getUserId.and.returnValue(null);
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    await comp['onSubmit']();
    http.expectNone('/api/v1/user/42/password');
    expect(comp['success']()).toBeFalse();
  });

  it('submits and shows success', async () => {
    tokens.getUserId.and.returnValue(42);
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    const submit = comp['onSubmit']();
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await submit;
    expect(comp['success']()).toBeTrue();
  });

  it('shows specific error on 401', async () => {
    tokens.getUserId.and.returnValue(42);
    const comp = fixture.componentInstance;
    comp['form'].patchValue({ currentPassword: 'wrong1234', newPassword: 'new12345', confirmPassword: 'new12345' });
    const submit = comp['onSubmit']();
    const req = http.expectOne('/api/v1/user/42/password');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await submit;
    expect(comp['error']()).toBe('La contraseña actual es incorrecta.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/change-password.component.spec.ts'`

Expected: FAIL — cannot resolve component.

- [ ] **Step 3: Implement the component**

Create `src/app/features/profile/pages/change-password/change-password.component.ts`:

```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { ProfileApiService } from '../../services/profile-api.service';
import { TokenService } from '@core/auth/token.service';
import { passwordsMatch } from '@shared/validators/passwords-match.validator';

@Component({
  selector: 'app-change-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Password, FloatLabel, Message],
  template: `
    <div class="max-w-sm mx-auto bg-white rounded-2xl shadow-md p-8 mt-8">
      <h2 class="text-xl font-semibold text-[var(--ds-text)] mb-6">Cambiar contraseña</h2>

      @if (success()) {
        <p-message severity="success" text="Contraseña actualizada correctamente." styleClass="w-full mb-4" />
      }

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
        <p-floatlabel>
          <p-password formControlName="currentPassword" [feedback]="false" [toggleMask]="true"
            inputId="currentPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="current-password" />
          <label for="currentPassword">Contraseña actual</label>
        </p-floatlabel>

        <p-floatlabel>
          <p-password formControlName="newPassword" [toggleMask]="true" inputId="newPassword"
            styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
          <label for="newPassword">Nueva contraseña</label>
        </p-floatlabel>

        <p-floatlabel>
          <p-password formControlName="confirmPassword" [feedback]="false" [toggleMask]="true"
            inputId="confirmPassword" styleClass="w-full" inputStyleClass="w-full" autocomplete="new-password" />
          <label for="confirmPassword">Confirmar nueva contraseña</label>
        </p-floatlabel>

        @if (form.get('confirmPassword')?.invalid && form.get('confirmPassword')?.dirty) {
          <p-message severity="error" text="Las contraseñas no coinciden." styleClass="w-full" />
        }
        @if (error()) { <p-message severity="error" [text]="error()!" styleClass="w-full" /> }

        <p-button type="submit" label="Actualizar contraseña" [loading]="loading()"
          [disabled]="form.invalid || loading()" styleClass="w-full" />
      </form>
    </div>
  `,
})
export class ChangePasswordComponent {
  private readonly profileApi = inject(ProfileApiService);
  private readonly tokens = inject(TokenService);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly form = new FormGroup({
    currentPassword: new FormControl('', { validators: [Validators.required], nonNullable: true }),
    newPassword: new FormControl('', { validators: [Validators.required, Validators.minLength(8)], nonNullable: true }),
    confirmPassword: new FormControl('', { validators: [Validators.required, passwordsMatch], nonNullable: true }),
  });

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

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include='**/change-password.component.spec.ts'`

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/profile/pages/change-password/
git commit -m "feat(profile): add ChangePasswordComponent"
```

---

## Task 13: Register new routes in `app.routes.ts`

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Add child route for change-password inside the authed `''` block**

Open `src/app/app.routes.ts`. Find the `children:` array inside the route at `path: ''` (currently around lines 15-82). Locate the existing entry:

```typescript
      { path: '', redirectTo: 'home', pathMatch: 'full' },
```

Immediately BEFORE that line, add:

```typescript
      {
        path: 'profile/change-password',
        loadComponent: () =>
          import('./features/profile/pages/change-password/change-password.component').then(
            (m) => m.ChangePasswordComponent,
          ),
      },
```

- [ ] **Step 2: Add 3 new top-level public auth routes**

Find the existing top-level `login` route (around lines 86-90):

```typescript
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },
```

Immediately AFTER that route block, insert:

```typescript

  {
    path: 'first-login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/first-login/first-login.component').then(
        (m) => m.FirstLoginComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
```

- [ ] **Step 3: Add the `guestGuard` import**

At the top of the file, find the existing imports block:

```typescript
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { rootGuard } from '@core/guards/root.guard';
import { moduleActiveGuard } from '@core/guards/module-active.guard';
import { tenantResolver } from '@core/tenant/tenant.resolver';
import { ModuleKey } from '@core/models/module-key.enum';
```

Add this line after the `moduleActiveGuard` import:

```typescript
import { guestGuard } from '@core/guards/guest.guard';
```

- [ ] **Step 4: Also gate the existing `/login` with `guestGuard`**

For consistency, find the login route block (now with the 3 new routes after it) and add `canActivate: [guestGuard]` so authenticated users land on `/` instead of the login screen:

Replace:

```typescript
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },
```

with:

```typescript
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/auth/login/login.component').then((m) => m.LoginComponent),
  },
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npm run build -- --configuration development`

Expected: no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(auth): register auth and profile routes"
```

---

## Task 14: Remove DEV-ONLY app initializer that clears the token on load

**Why:** The initializer in `app.config.ts` wipes the token on every page load, so the user is always sent to `/login`. With real auth, sessions must persist across reloads.

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Remove the initializer block and its imports**

Open `src/app/app.config.ts`. Find this block (around lines 47-51):

```typescript
    provideBrowserGlobalErrorListeners(),
    // DEV-ONLY: clear any persisted token on each app load so the user always
    // lands on the login screen. Remove once real auth is wired.
    provideAppInitializer(() => {
      inject(TokenService).removeToken();
    }),
    provideRouter(routes, withComponentInputBinding()),
```

Replace with:

```typescript
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
```

- [ ] **Step 2: Clean up now-unused imports**

At the top of the file, the imports currently include:

```typescript
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
```

Replace with:

```typescript
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
```

Also remove the now-unused import line:

```typescript
import { TokenService } from '@core/auth/token.service';
```

(Verify it's not referenced anywhere else in the file first. If it's still used, leave it.)

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build -- --configuration development`

Expected: no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/app.config.ts
git commit -m "chore(auth): remove DEV-ONLY token-clear app initializer"
```

---

## Task 15: Full test suite + manual smoke test

**Files:** none (verification step)

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`

Expected: ALL specs green. If anything fails, fix before continuing.

- [ ] **Step 2: Start backend + frontend for manual smoke**

In one terminal, from `Backend/`:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\mvnw.cmd spring-boot:run
```

In another terminal, from `FRONTEND-LABORATORIO/`:

```powershell
npm start
```

- [ ] **Step 3: Smoke test the flows**

In the browser at `http://localhost:4200`:

- Navigate to `/login`. Form should start empty (no `aperez@laboratorioapp.com` seeded). The "¿Olvidaste tu contraseña?" link should be an active link (not greyed out).
- Submit invalid credentials. Should see "Email o contraseña incorrectos." error inside the card.
- Click "¿Olvidaste tu contraseña?". Should navigate to `/forgot-password`.
- Enter an email, submit. Should see the green success message.
- Navigate manually to `/reset-password?token=anything&tenantId=lab1`. Should show "El link expiró o ya fue utilizado." (because the token is bogus).
- Navigate manually to `/first-login` (without state). Should show the "link no es válido" message.
- Log in successfully (you may need a seeded backend user). Page should navigate to `/home`. Reload `/home` — should stay logged in (NOT bounce to login). This verifies Task 14.
- While authenticated, navigate to `/profile/change-password`. Submit with wrong current password → "La contraseña actual es incorrecta." Submit with correct values → green success.
- While authenticated, navigate to `/login` → should redirect to `/`. This verifies `guestGuard`.

- [ ] **Step 4: If any flow breaks, debug and fix**

For backend-not-yet-implemented endpoints, document the gap (e.g., if `internal/password/forgot` is not yet wired), but the frontend should still degrade gracefully (show generic error message — not crash).

- [ ] **Step 5: Commit any smoke-test fixes**

If you needed any small fixes:

```bash
git add <files>
git commit -m "fix(auth): smoke-test corrections"
```

---

## Done criteria

- All 14 implementation tasks committed.
- `npm test -- --watch=false --browsers=ChromeHeadless` is green.
- The 8 manual smoke checks in Task 15 Step 3 pass.
- `git log --oneline origin/development..HEAD` shows ~14 commits, each scoped to one concern.
- No file from `archive/auth-old-attempt` was checked in (the branch is referenced only).

When all of the above hold, the branch is ready for PR against `development`. Use `superpowers:finishing-a-development-branch` to decide push/PR strategy.

---

## Out of scope (intentional)

- Tenant config loading from backend (`GET /api/tenant/config`). The plan keeps the existing hardcoded `DEV_TENANT` dispatch in login as a fallback with explicit comment. A separate plan will replace this once the endpoint exists.
- External user registration / external login flows. The backend exposes them but they are not part of the internal auth flow this plan consolidates.
- Email verification UI (`/api/v1/auth/email/verify`). Backend exists; UI deferred.
- Persisting full `UserResponse` (firstName, lastName, etc.) across reloads. Currently `TokenService` exposes what JWT carries (`name`, `email`, `roles`, `tenant_id`, `sub`). If a future requirement needs `firstName`/`lastName` after reload, add a `GET /me` endpoint and a session store.
- Storybook entries / Playwright e2e — Karma unit specs only for this plan.
