# LabCore Scaffolding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el scaffolding completo del portal administrativo LabCore: infraestructura core (auth, tenant, interceptores, guards), sistema de estilos SCSS, layout shell, shared UI, y todos los feature modules con estructura funcional base.

**Architecture:** Feature-shell con lazy loading por módulo. El tenant se resuelve desde el JWT del usuario (claim `tenant_id`). Los módulos activables se montan condicionalmente via `canMatch` consultando `ModuleRegistry` que lee el `TenantStore` (NgRx Signal Store).

**Tech Stack:** Angular 21.2 · PrimeNG 21 · Tailwind CSS v4 · NgRx Signal Store · SCSS · Vitest

---

## Mapa de archivos

### Crear
```
src/app/core/models/module-key.enum.ts
src/app/core/models/tenant.model.ts
src/app/core/models/user.model.ts
src/app/core/models/role.model.ts
src/app/core/auth/token.service.ts
src/app/core/auth/token.service.spec.ts
src/app/core/auth/login/login.component.ts
src/app/core/tenant/tenant.store.ts
src/app/core/tenant/tenant.store.spec.ts
src/app/core/tenant/module-registry.ts
src/app/core/tenant/module-registry.spec.ts
src/app/core/tenant/tenant.resolver.ts
src/app/core/tenant/tenant-theme.service.ts
src/app/core/tenant/tenant-theme.service.spec.ts
src/app/core/interceptors/auth-token.interceptor.ts
src/app/core/interceptors/auth-token.interceptor.spec.ts
src/app/core/interceptors/tenant-id.interceptor.ts
src/app/core/interceptors/tenant-id.interceptor.spec.ts
src/app/core/guards/auth.guard.ts
src/app/core/guards/auth.guard.spec.ts
src/app/core/guards/role.guard.ts
src/app/core/guards/module-active.guard.ts
src/app/core/guards/module-active.guard.spec.ts
src/app/layout/admin-shell/admin-shell.component.ts
src/app/layout/topbar/topbar.component.ts
src/app/layout/sidebar/sidebar.component.ts
src/app/shared/ui/breakpoint.service.ts
src/app/shared/ui/components/stat-card/stat-card.component.ts
src/app/shared/ui/components/list-card/list-card.component.ts
src/app/shared/ui/components/empty-state/empty-state.component.ts
src/app/shared/ui/form/ui-field/ui-field.component.ts
src/app/shared/pipes/currency-ar.pipe.ts
src/app/shared/pipes/currency-ar.pipe.spec.ts
src/app/shared/pipes/date-es.pipe.ts
src/app/shared/pipes/safe-html.pipe.ts
src/app/shared/directives/has-role.directive.ts
src/app/shared/directives/has-module.directive.ts
src/app/shared/directives/autofocus.directive.ts
src/styles/tokens.scss
src/styles/breakpoints.scss
src/styles/globals.scss
src/styles/utilities.scss
-- features (cada una: pages/, components/, services/, models/, *.routes.ts) --
src/app/features/empresa/...
src/app/features/sucursales/...
src/app/features/analitica/...
src/app/features/turnos/...
src/app/features/financiero/...
src/app/features/medicos/medicos.routes.ts
src/app/features/stock/stock.routes.ts
src/app/features/saas-admin/admin.routes.ts
```

### Modificar
```
package.json               ← agregar @ngrx/signals
tsconfig.app.json          ← path aliases @core, @shared, @layout, @features
src/styles.css → .scss     ← convertir + @use de partials
angular.json               ← apuntar a styles.scss
src/app/app.config.ts      ← providers NgRx + interceptores
src/app/app.routes.ts      ← rutas completas con guards y lazy loading
src/app/app.ts             ← limpiar, RouterOutlet
src/app/app.html           ← <router-outlet />
```

---

## Task 1: Instalar NgRx Signals y configurar path aliases

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.app.json`

- [ ] **Instalar @ngrx/signals**

```bash
npm install @ngrx/signals
```

Salida esperada: `added 1 package` (o similar sin errores).

- [ ] **Agregar path aliases en tsconfig.app.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": [],
    "paths": {
      "@core/*":     ["src/app/core/*"],
      "@shared/*":   ["src/app/shared/*"],
      "@layout/*":   ["src/app/layout/*"],
      "@features/*": ["src/app/features/*"]
    },
    "baseUrl": "./"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.spec.ts"]
}
```

- [ ] **Verificar que el proyecto compila**

```bash
npx ng build --configuration development
```

Esperado: build exitoso sin errores.

- [ ] **Commit**

```bash
git add package.json package-lock.json tsconfig.app.json
git commit -m "feat: install @ngrx/signals and configure path aliases"
```

---

## Task 2: Sistema de estilos SCSS

**Files:**
- Create: `src/styles/tokens.scss`
- Create: `src/styles/breakpoints.scss`
- Create: `src/styles/globals.scss`
- Create: `src/styles/utilities.scss`
- Modify: `src/styles.css` → `src/styles.scss`
- Modify: `angular.json`

- [ ] **Crear src/styles/tokens.scss**

```scss
// ─── Tokens de marca (sobreescritos dinámicamente por TenantThemeService) ───
:root {
  --brand-primary:   #2563eb;
  --brand-secondary: #0ea5a4;
  --brand-accent:    #f97316;
}

// ─── Tokens fijos del Design System (NUNCA los toca el tenant) ───
:root {
  --ds-success:      #22c55e;
  --ds-danger:       #e23a47;
  --ds-warning:      #f59e0b;
  --ds-info:         #3b82f6;
  --ds-surface:      #eef0f4;
  --ds-bg:           #f7f8fa;
  --ds-text:         #1a1a2e;
  --ds-text-muted:   #6b7280;
  --ds-touch-target: 48px;
  --ds-sidebar-w:    260px;
  --ds-topbar-h:     64px;
  --ds-bottom-nav-h: 64px;
}

// ─── Escala de espaciado (múltiplos de 4px) ───
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
}

// ─── Overrides PrimeNG ───
:root {
  --p-primary-color: var(--brand-primary);
  --p-primary-contrast-color: #ffffff;
}
```

- [ ] **Crear src/styles/breakpoints.scss**

```scss
$bp-tablet:  768px;
$bp-desktop: 1024px;

@mixin mobile-only {
  @media (max-width: #{$bp-tablet - 1px}) { @content; }
}

@mixin tablet-up {
  @media (min-width: #{$bp-tablet}) { @content; }
}

@mixin desktop-up {
  @media (min-width: #{$bp-desktop}) { @content; }
}
```

- [ ] **Crear src/styles/globals.scss**

```scss
@use 'breakpoints' as bp;

@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  min-width: 0;
}

body {
  font-family: 'Montserrat', system-ui, sans-serif;
  font-size: 14px;
  background: var(--ds-bg);
  color: var(--ds-text);
  margin: 0;
  -webkit-font-smoothing: antialiased;
}

h1 { font-size: clamp(22px, 4vw, 28px); font-weight: 700; }
h2 { font-size: clamp(18px, 3vw, 22px); font-weight: 600; }
h3 { font-size: 18px; font-weight: 600; }
h4 { font-size: 16px; font-weight: 600; }

// Touch targets mínimos en mobile
@include bp.mobile-only {
  button, a, [role='button'] {
    min-height: var(--ds-touch-target);
    min-width: var(--ds-touch-target);
  }
}
```

- [ ] **Crear src/styles/utilities.scss**

```scss
// Display helpers
.ui-show-mobile  { display: none; }
.ui-show-desktop { display: block; }

@media (max-width: 767px) {
  .ui-show-mobile  { display: block; }
  .ui-show-desktop { display: none; }
}

// Flex utilities
.ui-flex         { display: flex; }
.ui-flex-center  { display: flex; align-items: center; justify-content: center; }
.ui-flex-between { display: flex; align-items: center; justify-content: space-between; }
.ui-flex-gap-2   { gap: var(--space-2); }
.ui-flex-gap-4   { gap: var(--space-4); }

// Text utilities
.ui-text-muted   { color: var(--ds-text-muted); }
.ui-text-sm      { font-size: 12px; }
.ui-text-label   { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
```

- [ ] **Renombrar src/styles.css a src/styles.scss y agregar @use**

Eliminar `src/styles.css` y crear `src/styles.scss`:

```scss
// Design System
@use 'styles/tokens';
@use 'styles/breakpoints';
@use 'styles/globals';
@use 'styles/utilities';

// Tailwind v4 + PrimeNG
@import "primeicons/primeicons.css";
@import "tailwindcss";
@plugin "tailwindcss-primeui";

@layer tailwind, primeng;
```

- [ ] **Actualizar angular.json: reemplazar styles.css por styles.scss**

Buscar en `angular.json` todas las referencias a `"src/styles.css"` y reemplazarlas por `"src/styles.scss"`.

```bash
# Verificar las líneas afectadas antes de editar:
grep -n "styles.css" angular.json
```

Cambiar cada `"src/styles.css"` por `"src/styles.scss"` en angular.json.

- [ ] **Verificar build**

```bash
npx ng build --configuration development
```

Esperado: build exitoso. Si hay error de SCSS `@use` con rutas, asegurarse de que la ruta sea relativa desde `src/` (sin el prefijo `src/`).

- [ ] **Commit**

```bash
git add src/styles.scss src/styles/ angular.json
git rm src/styles.css
git commit -m "feat: setup SCSS design system tokens, breakpoints, globals, utilities"
```

---

## Task 3: Modelos core

**Files:**
- Create: `src/app/core/models/module-key.enum.ts`
- Create: `src/app/core/models/tenant.model.ts`
- Create: `src/app/core/models/user.model.ts`
- Create: `src/app/core/models/role.model.ts`

- [ ] **Crear module-key.enum.ts**

```typescript
export enum ModuleKey {
  Turnos     = 'turnos',
  Financiero = 'financiero',
  Medicos    = 'medicos',
  Stock      = 'stock',
}
```

- [ ] **Crear tenant.model.ts**

```typescript
import { ModuleKey } from './module-key.enum';

export interface TenantConfig {
  id: string;
  name: string;
  logoUrl: string;
  brandPrimary: string;
  brandSecondary: string;
  brandAccent: string;
  modules: ModuleKey[];
}

export interface TenantState {
  config: TenantConfig | null;
  loading: boolean;
  error: string | null;
}
```

- [ ] **Crear user.model.ts**

```typescript
export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  email: string;
  name: string;
  roles: string[];
  exp: number;
  iat: number;
}
```

- [ ] **Crear role.model.ts**

```typescript
export enum Role {
  Admin       = 'admin',
  Supervisor  = 'supervisor',
  Bioquimico  = 'bioquimico',
  Administrativo = 'administrativo',
  Recepcionista  = 'recepcionista',
}
```

- [ ] **Commit**

```bash
git add src/app/core/models/
git commit -m "feat: add core domain models (ModuleKey, TenantConfig, User, Role)"
```

---

## Task 4: TokenService

**Files:**
- Create: `src/app/core/auth/token.service.ts`
- Create: `src/app/core/auth/token.service.spec.ts`

- [ ] **Escribir el test primero**

```typescript
// src/app/core/auth/token.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

// JWT con payload { sub: '1', tenant_id: 'lab1', email: 'a@b.com', name: 'Ana', roles: ['admin'], exp: 9999999999, iat: 1 }
const MOCK_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MX0',
  'signature',
].join('.');

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  it('should store and retrieve a token', () => {
    service.setToken(MOCK_JWT);
    expect(service.getToken()).toBe(MOCK_JWT);
  });

  it('should decode tenant_id from JWT payload', () => {
    service.setToken(MOCK_JWT);
    expect(service.getTenantId()).toBe('lab1');
  });

  it('should return null for tenant_id when no token', () => {
    expect(service.getTenantId()).toBeNull();
  });

  it('should detect expired token', () => {
    // exp = 1 (pasado)
    const expiredJwt = [
      'eyJhbGciOiJIUzI1NiJ9',
      'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjEsImlhdCI6MX0',
      'sig',
    ].join('.');
    service.setToken(expiredJwt);
    expect(service.isTokenValid()).toBe(false);
  });

  it('should clear token on removeToken', () => {
    service.setToken(MOCK_JWT);
    service.removeToken();
    expect(service.getToken()).toBeNull();
  });
});
```

- [ ] **Ejecutar test — debe fallar**

```bash
npm test
```

Esperado: FAIL — `TokenService` no existe.

- [ ] **Implementar TokenService**

```typescript
// src/app/core/auth/token.service.ts
import { Injectable } from '@angular/core';
import { JwtPayload } from '@core/models/user.model';

const TOKEN_KEY = 'labcore_token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  getPayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64)) as JwtPayload;
    } catch {
      return null;
    }
  }

  getTenantId(): string | null {
    return this.getPayload()?.tenant_id ?? null;
  }

  isTokenValid(): boolean {
    const payload = this.getPayload();
    if (!payload) return false;
    return payload.exp * 1000 > Date.now();
  }
}
```

- [ ] **Ejecutar tests — deben pasar**

```bash
npm test
```

Esperado: 5 tests PASS en `token.service.spec.ts`.

- [ ] **Commit**

```bash
git add src/app/core/auth/
git commit -m "feat: add TokenService with JWT decode and tenant_id extraction"
```

---

## Task 5: TenantStore (NgRx Signal Store)

**Files:**
- Create: `src/app/core/tenant/tenant.store.ts`
- Create: `src/app/core/tenant/tenant.store.spec.ts`

- [ ] **Escribir test**

```typescript
// src/app/core/tenant/tenant.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TenantStore } from './tenant.store';
import { ModuleKey } from '@core/models/module-key.enum';
import { TenantConfig } from '@core/models/tenant.model';

const MOCK_CONFIG: TenantConfig = {
  id: 'lab1',
  name: 'Laboratorio Central',
  logoUrl: '/logo.png',
  brandPrimary: '#2563eb',
  brandSecondary: '#0ea5a4',
  brandAccent: '#f97316',
  modules: [ModuleKey.Turnos, ModuleKey.Financiero],
};

describe('TenantStore', () => {
  let store: InstanceType<typeof TenantStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TenantStore, provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(TenantStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should start with null config', () => {
    expect(store.config()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('should load config and expose it', () => {
    store.loadConfig();
    expect(store.loading()).toBe(true);

    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);

    expect(store.config()).toEqual(MOCK_CONFIG);
    expect(store.loading()).toBe(false);
  });

  it('isActive returns true for active module', () => {
    store.loadConfig();
    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);
    expect(store.isActive(ModuleKey.Turnos)).toBe(true);
  });

  it('isActive returns false for inactive module', () => {
    store.loadConfig();
    http.expectOne('/api/tenant/config').flush(MOCK_CONFIG);
    expect(store.isActive(ModuleKey.Medicos)).toBe(false);
  });
});
```

- [ ] **Ejecutar test — debe fallar**

```bash
npm test
```

- [ ] **Implementar TenantStore**

```typescript
// src/app/core/tenant/tenant.store.ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { TenantConfig, TenantState } from '@core/models/tenant.model';
import { ModuleKey } from '@core/models/module-key.enum';

const initialState: TenantState = {
  config: null,
  loading: false,
  error: null,
};

export const TenantStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, http = inject(HttpClient)) => ({
    loadConfig: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          http.get<TenantConfig>('/api/tenant/config').pipe(
            tapResponse({
              next: (config) => patchState(store, { config, loading: false }),
              error: (err: { message: string }) =>
                patchState(store, { error: err.message, loading: false }),
            }),
          ),
        ),
      ),
    ),
    isActive(key: ModuleKey): boolean {
      return store.config()?.modules.includes(key) ?? false;
    },
  })),
);
```

- [ ] **Ejecutar tests — deben pasar**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/core/tenant/tenant.store.ts src/app/core/tenant/tenant.store.spec.ts
git commit -m "feat: add TenantStore NgRx Signal Store with loadConfig and isActive"
```

---

## Task 6: ModuleRegistry y TenantResolver

**Files:**
- Create: `src/app/core/tenant/module-registry.ts`
- Create: `src/app/core/tenant/module-registry.spec.ts`
- Create: `src/app/core/tenant/tenant.resolver.ts`

- [ ] **Escribir test de ModuleRegistry**

```typescript
// src/app/core/tenant/module-registry.spec.ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ModuleRegistry } from './module-registry';
import { TenantStore } from './tenant.store';
import { ModuleKey } from '@core/models/module-key.enum';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    const fakeStore = {
      isActive: (key: ModuleKey) => key === ModuleKey.Turnos,
    };
    TestBed.configureTestingModule({
      providers: [
        ModuleRegistry,
        { provide: TenantStore, useValue: fakeStore },
      ],
    });
    registry = TestBed.inject(ModuleRegistry);
  });

  it('isActive delegates to store', () => {
    expect(registry.isActive(ModuleKey.Turnos)).toBe(true);
    expect(registry.isActive(ModuleKey.Financiero)).toBe(false);
  });
});
```

- [ ] **Ejecutar test — debe fallar**

```bash
npm test
```

- [ ] **Implementar ModuleRegistry**

```typescript
// src/app/core/tenant/module-registry.ts
import { inject, Injectable } from '@angular/core';
import { TenantStore } from './tenant.store';
import { ModuleKey } from '@core/models/module-key.enum';

@Injectable({ providedIn: 'root' })
export class ModuleRegistry {
  private readonly store = inject(TenantStore);

  isActive(key: ModuleKey): boolean {
    return this.store.isActive(key);
  }
}
```

- [ ] **Implementar TenantResolver**

```typescript
// src/app/core/tenant/tenant.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { TenantStore } from './tenant.store';
import { TenantThemeService } from './tenant-theme.service';
import { filter, take, toObservable } from 'rxjs';
import { toObservable as signalToObservable } from '@angular/core/rxjs-interop';

export const tenantResolver: ResolveFn<void> = () => {
  const store = inject(TenantStore);
  const themeService = inject(TenantThemeService);

  store.loadConfig();

  return signalToObservable(store.config).pipe(
    filter((config) => config !== null),
    take(1),
    // Aplica el tema una vez que la config está lista
    tap((config) => themeService.applyTheme(config!)),
  );
};
```

> Nota: importar `tap` desde `rxjs`.

- [ ] **Ejecutar tests**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/core/tenant/module-registry.ts src/app/core/tenant/module-registry.spec.ts src/app/core/tenant/tenant.resolver.ts
git commit -m "feat: add ModuleRegistry and TenantResolver"
```

---

## Task 7: TenantThemeService

**Files:**
- Create: `src/app/core/tenant/tenant-theme.service.ts`
- Create: `src/app/core/tenant/tenant-theme.service.spec.ts`

- [ ] **Escribir tests**

```typescript
// src/app/core/tenant/tenant-theme.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { TenantThemeService } from './tenant-theme.service';
import { TenantConfig } from '@core/models/tenant.model';
import { ModuleKey } from '@core/models/module-key.enum';

const baseConfig: TenantConfig = {
  id: 'lab1', name: 'Lab', logoUrl: '', modules: [],
  brandPrimary: '#2563eb',
  brandSecondary: '#0ea5a4',
  brandAccent: '#f97316',
};

describe('TenantThemeService', () => {
  let service: TenantThemeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TenantThemeService);
  });

  it('should set --brand-primary CSS variable', () => {
    service.applyTheme(baseConfig);
    const val = document.documentElement.style.getPropertyValue('--brand-primary');
    expect(val).toBeTruthy();
  });

  it('should NOT modify --ds-danger', () => {
    document.documentElement.style.setProperty('--ds-danger', '#e23a47');
    service.applyTheme({ ...baseConfig, brandPrimary: '#e23a47' });
    expect(document.documentElement.style.getPropertyValue('--ds-danger')).toBe('#e23a47');
  });

  it('isRedHue returns true for hue in danger range', () => {
    // Acceder al método protegido para testear la lógica de colisión
    expect((service as any).isRedHue('#e23a47')).toBe(true);
    expect((service as any).isRedHue('#2563eb')).toBe(false);
  });
});
```

- [ ] **Ejecutar test — debe fallar**

```bash
npm test
```

- [ ] **Implementar TenantThemeService**

```typescript
// src/app/core/tenant/tenant-theme.service.ts
import { Injectable } from '@angular/core';
import { TenantConfig } from '@core/models/tenant.model';

@Injectable({ providedIn: 'root' })
export class TenantThemeService {
  applyTheme(config: TenantConfig): void {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary',   this.safeColor(config.brandPrimary));
    root.style.setProperty('--brand-secondary', config.brandSecondary);
    root.style.setProperty('--brand-accent',    config.brandAccent);
    root.style.setProperty('--p-primary-color', this.safeColor(config.brandPrimary));
  }

  // Si el color de marca colisiona con rojo (hue 0-20 o 340-360),
  // desatura levemente para diferenciarlo del --ds-danger
  private safeColor(hex: string): string {
    if (this.isRedHue(hex)) {
      return this.desaturate(hex, 0.4);
    }
    return hex;
  }

  protected isRedHue(hex: string): boolean {
    const hue = this.hexToHsl(hex).h;
    return hue <= 20 || hue >= 340;
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
    return { h: Math.round(h * 360), s, l };
  }

  private desaturate(hex: string, amount: number): string {
    const { h, s, l } = this.hexToHsl(hex);
    const newS = Math.max(0, s - amount);
    return this.hslToHex(h, newS, l);
  }

  private hslToHex(h: number, s: number, l: number): string {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hN = h / 360;
    const r = Math.round(hue2rgb(p, q, hN + 1 / 3) * 255);
    const g = Math.round(hue2rgb(p, q, hN) * 255);
    const b = Math.round(hue2rgb(p, q, hN - 1 / 3) * 255);
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
  }
}
```

- [ ] **Ejecutar tests — deben pasar**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/core/tenant/tenant-theme.service.ts src/app/core/tenant/tenant-theme.service.spec.ts
git commit -m "feat: add TenantThemeService with red-hue safety check"
```

---

## Task 8: Interceptores

**Files:**
- Create: `src/app/core/interceptors/auth-token.interceptor.ts`
- Create: `src/app/core/interceptors/auth-token.interceptor.spec.ts`
- Create: `src/app/core/interceptors/tenant-id.interceptor.ts`
- Create: `src/app/core/interceptors/tenant-id.interceptor.spec.ts`

- [ ] **Escribir tests de interceptores**

```typescript
// src/app/core/interceptors/auth-token.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { authTokenInterceptor } from './auth-token.interceptor';
import { TokenService } from '@core/auth/token.service';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => httpMock.verify());

  it('should add Authorization header when token exists', () => {
    tokenService.setToken('my.jwt.token');
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my.jwt.token');
    req.flush({});
  });

  it('should NOT add Authorization header when no token', () => {
    localStorage.clear();
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });
});
```

```typescript
// src/app/core/interceptors/tenant-id.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { tenantIdInterceptor } from './tenant-id.interceptor';
import { TokenService } from '@core/auth/token.service';

const MOCK_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MX0',
  'sig',
].join('.');

describe('tenantIdInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => httpMock.verify());

  it('should add X-Tenant-ID header when token has tenant_id', () => {
    tokenService.setToken(MOCK_JWT);
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-Tenant-ID')).toBe('lab1');
    req.flush({});
  });
});
```

- [ ] **Ejecutar tests — deben fallar**

```bash
npm test
```

- [ ] **Implementar interceptores**

```typescript
// src/app/core/interceptors/auth-token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).getToken();
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

```typescript
// src/app/core/interceptors/tenant-id.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

export const tenantIdInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantId = inject(TokenService).getTenantId();
  if (!tenantId) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant-ID': tenantId } }));
};
```

- [ ] **Ejecutar tests — deben pasar**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/core/interceptors/
git commit -m "feat: add auth-token and tenant-id HTTP interceptors"
```

---

## Task 9: Guards

**Files:**
- Create: `src/app/core/guards/auth.guard.ts`
- Create: `src/app/core/guards/auth.guard.spec.ts`
- Create: `src/app/core/guards/role.guard.ts`
- Create: `src/app/core/guards/module-active.guard.ts`
- Create: `src/app/core/guards/module-active.guard.spec.ts`

- [ ] **Escribir tests de guards**

```typescript
// src/app/core/guards/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { TokenService } from '@core/auth/token.service';

describe('authGuard', () => {
  let tokenService: TokenService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: (c: any[]) => c, navigate: vi.fn() } }],
    });
    tokenService = TestBed.inject(TokenService);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  it('should allow access when token is valid', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any),
    );
    expect(result).toBe(true);
  });

  it('should redirect to /login when token is invalid', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any),
    );
    expect(result).toEqual(['/login']);
  });
});
```

```typescript
// src/app/core/guards/module-active.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { moduleActiveGuard } from './module-active.guard';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

describe('moduleActiveGuard', () => {
  let registry: jasmine.SpyObj<ModuleRegistry>;

  beforeEach(() => {
    const spy = { isActive: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: ModuleRegistry, useValue: spy }],
    });
    registry = TestBed.inject(ModuleRegistry) as any;
  });

  it('should allow when module is active', () => {
    registry.isActive.mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)({} as any, {} as any),
    );
    expect(result).toBe(true);
  });

  it('should redirect to / when module is inactive', () => {
    registry.isActive.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      moduleActiveGuard(ModuleKey.Turnos)({} as any, {} as any),
    );
    expect(result).toEqual(['/']);
  });
});
```

- [ ] **Ejecutar tests — deben fallar**

```bash
npm test
```

- [ ] **Implementar guards**

```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const authGuard: CanActivateFn = () => {
  return inject(TokenService).isTokenValid() ? true : ['/login'];
};
```

```typescript
// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TokenService } from '@core/auth/token.service';

export const roleGuard = (requiredRole: string): CanActivateFn =>
  () => {
    const roles = inject(TokenService).getPayload()?.roles ?? [];
    return roles.includes(requiredRole) ? true : ['/'];
  };
```

```typescript
// src/app/core/guards/module-active.guard.ts
import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

export const moduleActiveGuard = (key: ModuleKey): CanMatchFn =>
  () => {
    return inject(ModuleRegistry).isActive(key) ? true : ['/'];
  };
```

```typescript
// src/app/core/guards/root.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { Role } from '@core/models/role.model';

export const rootGuard: CanActivateFn = () => {
  const roles = inject(TokenService).getPayload()?.roles ?? [];
  return roles.includes(Role.Admin) ? true : ['/'];
};
```

- [ ] **Ejecutar tests — deben pasar**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/core/guards/
git commit -m "feat: add auth, role, module-active and root guards"
```

---

## Task 10: Login component

**Files:**
- Create: `src/app/core/auth/login/login.component.ts`

- [ ] **Implementar Login component**

```typescript
// src/app/core/auth/login/login.component.ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TokenService } from '@core/auth/token.service';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { FloatLabel } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';

interface LoginResponse { access_token: string; }

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, InputText, Password, FloatLabel, MessageModule],
  template: `
    <div class="min-h-screen flex items-center justify-center" style="background: var(--ds-bg)">
      <div class="w-full max-w-sm p-8 rounded-2xl shadow-md" style="background: white">
        <h2 class="mb-6 text-center" style="color: var(--brand-primary)">Iniciar sesión</h2>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">
          <p-floatlabel>
            <input pInputText id="email" formControlName="email" type="email"
                   inputmode="email" autocomplete="email" class="w-full" />
            <label for="email">Email</label>
          </p-floatlabel>

          <p-floatlabel>
            <p-password id="password" formControlName="password"
                        [feedback]="false" [toggleMask]="true" styleClass="w-full" />
            <label for="password">Contraseña</label>
          </p-floatlabel>

          @if (error()) {
            <p-message severity="error" [text]="error()!" />
          }

          <p-button type="submit" label="Ingresar" severity="primary"
                    [loading]="loading()" [disabled]="form.invalid" styleClass="w-full" />
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb     = inject(FormBuilder);
  private readonly http   = inject(HttpClient);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  readonly form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.http.post<LoginResponse>('/api/auth/login', this.form.value).subscribe({
      next: ({ access_token }) => {
        this.tokens.setToken(access_token);
        this.router.navigate(['/']);
      },
      error: () => {
        this.error.set('Credenciales incorrectas.');
        this.loading.set(false);
      },
    });
  }
}
```

- [ ] **Commit**

```bash
git add src/app/core/auth/login/
git commit -m "feat: add login component with reactive form"
```

---

## Task 11: App config y rutas completas

**Files:**
- Modify: `src/app/app.config.ts`
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.html`

- [ ] **Actualizar app.config.ts**

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { routes } from './app.routes';
import { authTokenInterceptor } from '@core/interceptors/auth-token.interceptor';
import { tenantIdInterceptor } from '@core/interceptors/tenant-id.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authTokenInterceptor, tenantIdInterceptor]),
    ),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          cssLayer: { name: 'primeng', order: 'tailwind, primeng' },
        },
      },
    }),
  ],
};
```

- [ ] **Actualizar app.routes.ts**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { rootGuard } from '@core/guards/root.guard';
import { moduleActiveGuard } from '@core/guards/module-active.guard';
import { tenantResolver } from '@core/tenant/tenant.resolver';
import { ModuleKey } from '@core/models/module-key.enum';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@core/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    resolve: { tenant: tenantResolver },
    loadComponent: () => import('@layout/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: '', redirectTo: 'empresa', pathMatch: 'full' },
      // CORE
      { path: 'empresa',    loadChildren: () => import('@features/empresa/empresa.routes').then(m => m.EMPRESA_ROUTES) },
      { path: 'sucursales', loadChildren: () => import('@features/sucursales/sucursales.routes').then(m => m.SUCURSALES_ROUTES) },
      { path: 'analitica',  loadChildren: () => import('@features/analitica/analitica.routes').then(m => m.ANALITICA_ROUTES) },
      // ACTIVABLES
      {
        path: 'turnos',
        canMatch: [moduleActiveGuard(ModuleKey.Turnos)],
        loadChildren: () => import('@features/turnos/turnos.routes').then(m => m.TURNOS_ROUTES),
      },
      {
        path: 'financiero',
        canMatch: [moduleActiveGuard(ModuleKey.Financiero)],
        loadChildren: () => import('@features/financiero/financiero.routes').then(m => m.FINANCIERO_ROUTES),
      },
      {
        path: 'medicos',
        canMatch: [moduleActiveGuard(ModuleKey.Medicos)],
        loadChildren: () => import('@features/medicos/medicos.routes').then(m => m.MEDICOS_ROUTES),
      },
      {
        path: 'stock',
        canMatch: [moduleActiveGuard(ModuleKey.Stock)],
        loadChildren: () => import('@features/stock/stock.routes').then(m => m.STOCK_ROUTES),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [rootGuard],
    loadChildren: () => import('@features/saas-admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Limpiar app.ts y app.html**

```typescript
// src/app/app.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
```

Eliminar contenido de `src/app/app.html` (ya no se usa, la template está inline).

- [ ] **Verificar que compila (las rutas referencian módulos que aún no existen — se esperan errores de import)**

```bash
npx ng build --configuration development 2>&1 | head -30
```

Los errores en este punto son de módulos faltantes (features). Es esperado. Continuamos creando los layouts y features.

- [ ] **Commit**

```bash
git add src/app/app.config.ts src/app/app.routes.ts src/app/app.ts src/app/app.html
git commit -m "feat: wire app.config with interceptors and full lazy route tree"
```

---

## Task 12: Layout Admin Shell

**Files:**
- Create: `src/app/layout/admin-shell/admin-shell.component.ts`
- Create: `src/app/layout/topbar/topbar.component.ts`
- Create: `src/app/layout/sidebar/sidebar.component.ts`

- [ ] **Crear admin-shell.component.ts**

```typescript
// src/app/layout/admin-shell/admin-shell.component.ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { TopbarComponent } from '@layout/topbar/topbar.component';
import { SidebarComponent } from '@layout/sidebar/sidebar.component';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, DrawerModule, TopbarComponent, SidebarComponent],
  template: `
    <div class="admin-shell">
      <!-- Sidebar desktop -->
      <app-sidebar class="ui-show-desktop admin-shell__sidebar" />

      <!-- Drawer mobile -->
      <p-drawer [(visible)]="drawerOpen" position="left" [modal]="true">
        <app-sidebar (itemClick)="drawerOpen.set(false)" />
      </p-drawer>

      <!-- Main content -->
      <div class="admin-shell__main">
        <app-topbar (menuToggle)="drawerOpen.set(!drawerOpen())" />
        <main class="admin-shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .admin-shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }
    .admin-shell__sidebar {
      width: var(--ds-sidebar-w);
      flex-shrink: 0;
      border-right: 1px solid var(--ds-surface);
    }
    .admin-shell__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .admin-shell__content {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-6);
      background: var(--ds-bg);
    }
    @media (max-width: 767px) {
      .admin-shell__content { padding: var(--space-4); }
    }
  `],
})
export class AdminShellComponent {
  readonly drawerOpen = signal(false);
}
```

- [ ] **Crear topbar.component.ts**

```typescript
// src/app/layout/topbar/topbar.component.ts
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { TokenService } from '@core/auth/token.service';
import { TenantStore } from '@core/tenant/tenant.store';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <header class="topbar">
      <p-button icon="pi pi-bars" [text]="true" severity="secondary"
                (onClick)="menuToggle.emit()" ariaLabel="Abrir menú"
                styleClass="ui-show-mobile" />

      <span class="topbar__title">{{ tenantStore.config()?.name ?? 'LabCore' }}</span>

      <div class="ui-flex-gap-2" style="margin-left: auto">
        <p-button icon="pi pi-sign-out" [text]="true" severity="secondary"
                  (onClick)="logout()" ariaLabel="Cerrar sesión" />
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: var(--ds-topbar-h);
      padding: 0 var(--space-6);
      background: white;
      border-bottom: 1px solid var(--ds-surface);
      flex-shrink: 0;
    }
    .topbar__title {
      font-weight: 600;
      font-size: 16px;
      color: var(--brand-primary);
    }
    @media (max-width: 767px) {
      .topbar { padding: 0 var(--space-4); }
    }
  `],
})
export class TopbarComponent {
  readonly menuToggle = output<void>();
  protected readonly tenantStore = inject(TenantStore);
  private readonly tokens = inject(TokenService);
  private readonly router = inject(Router);

  logout(): void {
    this.tokens.removeToken();
    this.router.navigate(['/login']);
  }
}
```

- [ ] **Crear sidebar.component.ts**

```typescript
// src/app/layout/sidebar/sidebar.component.ts
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  moduleKey?: ModuleKey;
}

const CORE_ITEMS: NavItem[] = [
  { label: 'Empresa',    icon: 'pi pi-building',  path: '/empresa' },
  { label: 'Sucursales', icon: 'pi pi-map-marker', path: '/sucursales' },
  { label: 'Analítica',  icon: 'pi pi-flask',      path: '/analitica' },
];

const ACTIVABLE_ITEMS: NavItem[] = [
  { label: 'Turnos',     icon: 'pi pi-calendar',  path: '/turnos',     moduleKey: ModuleKey.Turnos },
  { label: 'Financiero', icon: 'pi pi-wallet',     path: '/financiero', moduleKey: ModuleKey.Financiero },
  { label: 'Médicos',    icon: 'pi pi-user-plus',  path: '/medicos',    moduleKey: ModuleKey.Medicos },
  { label: 'Stock',      icon: 'pi pi-box',         path: '/stock',      moduleKey: ModuleKey.Stock },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="sidebar">
      <div class="sidebar__logo">
        <i class="pi pi-flask" style="font-size: 24px; color: var(--brand-primary)"></i>
        <span class="sidebar__brand">LabCore</span>
      </div>

      <ul class="sidebar__menu">
        @for (item of coreItems; track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="sidebar__item--active"
               class="sidebar__item" (click)="itemClick.emit()">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }

        @if (activableItems().length > 0) {
          <li class="sidebar__separator"><span>Módulos</span></li>
        }

        @for (item of activableItems(); track item.path) {
          <li>
            <a [routerLink]="item.path" routerLinkActive="sidebar__item--active"
               class="sidebar__item" (click)="itemClick.emit()">
              <i [class]="item.icon"></i>
              <span>{{ item.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: white;
      overflow-y: auto;
    }
    .sidebar__logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--ds-surface);
    }
    .sidebar__brand { font-weight: 700; font-size: 16px; color: var(--ds-text); }
    .sidebar__menu { list-style: none; margin: 0; padding: var(--space-3) 0; }
    .sidebar__menu li { padding: 0 var(--space-2); }
    .sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: 8px;
      color: var(--ds-text-muted);
      text-decoration: none;
      font-size: 14px;
      transition: background 150ms, color 150ms;
      min-height: var(--ds-touch-target);
    }
    .sidebar__item:hover { background: var(--ds-surface); color: var(--ds-text); }
    .sidebar__item--active { background: color-mix(in srgb, var(--brand-primary) 10%, transparent); color: var(--brand-primary); font-weight: 600; }
    .sidebar__separator {
      padding: var(--space-4) var(--space-5) var(--space-2);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ds-text-muted);
    }
  `],
})
export class SidebarComponent {
  readonly itemClick = output<void>();
  private readonly registry = inject(ModuleRegistry);

  protected readonly coreItems = CORE_ITEMS;
  protected readonly activableItems = () =>
    ACTIVABLE_ITEMS.filter(i => !i.moduleKey || this.registry.isActive(i.moduleKey));
}
```

- [ ] **Commit**

```bash
git add src/app/layout/
git commit -m "feat: add admin-shell, topbar and dynamic sidebar layout components"
```

---

## Task 13: Shared UI components y servicios

**Files:**
- Create: `src/app/shared/ui/breakpoint.service.ts`
- Create: `src/app/shared/ui/components/stat-card/stat-card.component.ts`
- Create: `src/app/shared/ui/components/list-card/list-card.component.ts`
- Create: `src/app/shared/ui/components/empty-state/empty-state.component.ts`
- Create: `src/app/shared/ui/form/ui-field/ui-field.component.ts`

- [ ] **Crear breakpoint.service.ts**

```typescript
// src/app/shared/ui/breakpoint.service.ts
import { Injectable, signal } from '@angular/core';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  readonly current = signal<Breakpoint>(this.detect());

  constructor() {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const mqTablet = window.matchMedia('(min-width: 768px)');
    const update = () => this.current.set(this.detect());
    mq.addEventListener('change', update);
    mqTablet.addEventListener('change', update);
  }

  private detect(): Breakpoint {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth >= 1024) return 'desktop';
    if (window.innerWidth >= 768) return 'tablet';
    return 'mobile';
  }

  isMobile(): boolean { return this.current() === 'mobile'; }
  isDesktop(): boolean { return this.current() === 'desktop'; }
}
```

- [ ] **Crear stat-card.component.ts**

```typescript
// src/app/shared/ui/components/stat-card/stat-card.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-stat-card" [style.border-left-color]="accentColor()">
      <div class="ui-stat-card__label">{{ label() }}</div>
      <div class="ui-stat-card__value">{{ value() }}</div>
      @if (sub()) {
        <div class="ui-stat-card__sub">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [`
    .ui-stat-card {
      background: white;
      border-radius: 10px;
      padding: var(--space-4) var(--space-5);
      border-left: 4px solid var(--brand-secondary);
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .ui-stat-card__label { font-size: 12px; color: var(--ds-text-muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: var(--space-1); }
    .ui-stat-card__value { font-size: 28px; font-weight: 700; color: var(--ds-text); }
    .ui-stat-card__sub   { font-size: 12px; color: var(--ds-text-muted); margin-top: var(--space-1); }
  `],
})
export class StatCardComponent {
  readonly label      = input.required<string>();
  readonly value      = input.required<string | number>();
  readonly sub        = input<string | null>(null);
  readonly accentColor = input<string>('var(--brand-secondary)');
}
```

- [ ] **Crear empty-state.component.ts**

```typescript
// src/app/shared/ui/components/empty-state/empty-state.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from 'primeng/button';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <div class="ui-empty-state">
      <i [class]="'pi ' + icon()" class="ui-empty-state__icon"></i>
      <h4>{{ heading() }}</h4>
      @if (description()) {
        <p>{{ description() }}</p>
      }
      @if (ctaLabel()) {
        <p-button [label]="ctaLabel()!" severity="primary" (onClick)="ctaClick.emit()" />
      }
    </div>
  `,
  styles: [`
    .ui-empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: var(--space-3); padding: var(--space-12) var(--space-6);
      text-align: center;
    }
    .ui-empty-state__icon { font-size: 48px; color: var(--ds-text-muted); }
    h4 { margin: 0; color: var(--ds-text); }
    p  { margin: 0; color: var(--ds-text-muted); max-width: 320px; font-size: 14px; }
  `],
})
export class EmptyStateComponent {
  readonly icon        = input<string>('pi-inbox');
  readonly heading     = input.required<string>();
  readonly description = input<string | null>(null);
  readonly ctaLabel    = input<string | null>(null);
  readonly ctaClick    = output<void>();
}
```

- [ ] **Crear list-card.component.ts**

```typescript
// src/app/shared/ui/components/list-card/list-card.component.ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ui-list-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-list-card" (click)="cardClick.emit()" [class.ui-list-card--clickable]="cardClick.observed">
      <div class="ui-list-card__body">
        <ng-content />
      </div>
      @if (cardClick.observed) {
        <i class="pi pi-chevron-right ui-list-card__chevron"></i>
      }
    </div>
  `,
  styles: [`
    .ui-list-card {
      display: flex; align-items: center;
      background: white; border-radius: 10px;
      padding: var(--space-4); border: 1px solid var(--ds-surface);
      gap: var(--space-3);
    }
    .ui-list-card--clickable { cursor: pointer; transition: box-shadow 150ms; }
    .ui-list-card--clickable:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .ui-list-card--clickable:active { transform: scale(0.98); }
    .ui-list-card__body { flex: 1; min-width: 0; }
    .ui-list-card__chevron { color: var(--ds-text-muted); flex-shrink: 0; }
  `],
})
export class ListCardComponent {
  readonly cardClick = output<void>();
}
```

- [ ] **Crear ui-field.component.ts**

```typescript
// src/app/shared/ui/form/ui-field/ui-field.component.ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';

@Component({
  selector: 'ui-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FloatLabel, Message],
  template: `
    <div class="ui-field">
      <p-floatlabel [variant]="variant()">
        <ng-content />
      </p-floatlabel>
      @if (error()) {
        <p-message severity="error" size="small" [text]="error()!" />
      }
    </div>
  `,
  styles: [`
    .ui-field { display: flex; flex-direction: column; gap: var(--space-1); }
  `],
})
export class UiFieldComponent {
  readonly error   = input<string | null>(null);
  readonly variant = input<'on' | 'in' | 'over'>('on');
}
```

- [ ] **Commit**

```bash
git add src/app/shared/
git commit -m "feat: add shared UI components (stat-card, list-card, empty-state, ui-field, breakpoint service)"
```

---

## Task 14: Shared pipes y directives

**Files:**
- Create: `src/app/shared/pipes/currency-ar.pipe.ts`
- Create: `src/app/shared/pipes/currency-ar.pipe.spec.ts`
- Create: `src/app/shared/pipes/date-es.pipe.ts`
- Create: `src/app/shared/pipes/safe-html.pipe.ts`
- Create: `src/app/shared/directives/has-role.directive.ts`
- Create: `src/app/shared/directives/has-module.directive.ts`
- Create: `src/app/shared/directives/autofocus.directive.ts`

- [ ] **Escribir test de currency-ar pipe**

```typescript
// src/app/shared/pipes/currency-ar.pipe.spec.ts
import { CurrencyArPipe } from './currency-ar.pipe';

describe('CurrencyArPipe', () => {
  const pipe = new CurrencyArPipe();

  it('formats number as ARS', () => {
    expect(pipe.transform(1500)).toBe('$ 1.500,00');
  });

  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
```

- [ ] **Ejecutar test — debe fallar**

```bash
npm test
```

- [ ] **Implementar pipes**

```typescript
// src/app/shared/pipes/currency-ar.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyAr', standalone: true })
export class CurrencyArPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2,
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '';
    return this.formatter.format(value);
  }
}
```

```typescript
// src/app/shared/pipes/date-es.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateEs', standalone: true })
export class DateEsPipe implements PipeTransform {
  private readonly formatter = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';
    return this.formatter.format(new Date(value));
  }
}
```

```typescript
// src/app/shared/pipes/safe-html.pipe.ts
import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}
```

- [ ] **Implementar directives**

```typescript
// src/app/shared/directives/has-role.directive.ts
import { Directive, inject, input, TemplateRef, ViewContainerRef, effect } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  readonly hasRole = input.required<string | string[]>();
  private readonly tokens  = inject(TokenService);
  private readonly template = inject(TemplateRef);
  private readonly vcr     = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const required = Array.isArray(this.hasRole()) ? this.hasRole() as string[] : [this.hasRole() as string];
      const userRoles = this.tokens.getPayload()?.roles ?? [];
      const hasAny = required.some(r => userRoles.includes(r));
      this.vcr.clear();
      if (hasAny) this.vcr.createEmbeddedView(this.template);
    });
  }
}
```

```typescript
// src/app/shared/directives/has-module.directive.ts
import { Directive, inject, input, TemplateRef, ViewContainerRef, effect } from '@angular/core';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

@Directive({ selector: '[hasModule]', standalone: true })
export class HasModuleDirective {
  readonly hasModule = input.required<ModuleKey>();
  private readonly registry = inject(ModuleRegistry);
  private readonly template = inject(TemplateRef);
  private readonly vcr     = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.registry.isActive(this.hasModule())) {
        this.vcr.createEmbeddedView(this.template);
      }
    });
  }
}
```

```typescript
// src/app/shared/directives/autofocus.directive.ts
import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef);
  ngAfterViewInit(): void {
    this.el.nativeElement.focus();
  }
}
```

- [ ] **Ejecutar tests**

```bash
npm test
```

- [ ] **Commit**

```bash
git add src/app/shared/pipes/ src/app/shared/directives/
git commit -m "feat: add shared pipes (currency-ar, date-es, safe-html) and directives (hasRole, hasModule, autofocus)"
```

---

## Task 15: Feature empresa (CORE)

**Files:**
- Create: `src/app/features/empresa/empresa.routes.ts`
- Create: `src/app/features/empresa/models/empresa.model.ts`
- Create: `src/app/features/empresa/services/empresa.service.ts`
- Create: `src/app/features/empresa/pages/usuarios/usuarios.component.ts`
- Create: `src/app/features/empresa/pages/roles/roles.component.ts`
- Create: `src/app/features/empresa/pages/white-label/white-label.component.ts`
- Create: `src/app/features/empresa/pages/fiscal/fiscal.component.ts`
- Create: `src/app/features/empresa/pages/smtp-docs/smtp-docs.component.ts`
- Create: `src/app/features/empresa/pages/modulos/modulos.component.ts`

- [ ] **Crear empresa.model.ts**

```typescript
// src/app/features/empresa/models/empresa.model.ts
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  roles: string[];
  activo: boolean;
}

export interface Rol {
  id: string;
  nombre: string;
  permisos: string[];
}
```

- [ ] **Crear empresa.service.ts**

```typescript
// src/app/features/empresa/services/empresa.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Usuario, Rol } from '../models/empresa.model';

@Injectable()
export class EmpresaService {
  private readonly http = inject(HttpClient);

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>('/api/empresa/usuarios');
  }

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>('/api/empresa/roles');
  }
}
```

- [ ] **Crear páginas de empresa**

Patrón base para cada página (repetir para cada una cambiando selector, título e ícono):

```typescript
// src/app/features/empresa/pages/usuarios/usuarios.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { resource } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="page-header">
      <h2>Usuarios</h2>
    </div>
    @if (usuariosResource.isLoading()) {
      <p>Cargando...</p>
    } @else if (usuariosResource.value()?.length === 0) {
      <ui-empty-state heading="Sin usuarios" icon="pi-users"
                      description="Aún no hay usuarios registrados en el sistema."
                      ctaLabel="Agregar usuario" />
    }
  `,
  styles: [`.page-header { margin-bottom: var(--space-6); }`],
})
export class UsuariosComponent {
  private readonly service = inject(EmpresaService);
  protected readonly usuariosResource = resource({
    loader: () => this.service.getUsuarios().toPromise(),
  });
}
```

Crear los demás con template mínimo (heading + empty-state placeholder):

```typescript
// src/app/features/empresa/pages/roles/roles.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Roles</h2>
    <ui-empty-state heading="Sin roles configurados" icon="pi-shield" />
  `,
})
export class RolesComponent {}
```

```typescript
// src/app/features/empresa/pages/white-label/white-label.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-white-label',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>White Label</h2><p style="color:var(--ds-text-muted)">Configuración de identidad visual del tenant.</p>`,
})
export class WhiteLabelComponent {}
```

```typescript
// src/app/features/empresa/pages/fiscal/fiscal.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-fiscal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Configuración Fiscal (ARCA)</h2><p style="color:var(--ds-text-muted)">Pendiente de implementación.</p>`,
})
export class FiscalComponent {}
```

```typescript
// src/app/features/empresa/pages/smtp-docs/smtp-docs.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-smtp-docs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>SMTP y Documentos</h2><p style="color:var(--ds-text-muted)">Pendiente de implementación.</p>`,
})
export class SmtpDocsComponent {}
```

```typescript
// src/app/features/empresa/pages/modulos/modulos.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TenantStore } from '@core/tenant/tenant.store';

@Component({
  selector: 'app-modulos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Módulos activos</h2>
    <ul>
      @for (mod of tenantStore.config()?.modules ?? []; track mod) {
        <li>{{ mod }}</li>
      }
    </ul>
  `,
})
export class ModulosComponent {
  protected readonly tenantStore = inject(TenantStore);
}
```

- [ ] **Crear empresa.routes.ts**

```typescript
// src/app/features/empresa/empresa.routes.ts
import { Routes } from '@angular/router';
import { EmpresaService } from './services/empresa.service';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    providers: [EmpresaService],
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent) },
      { path: 'roles',       loadComponent: () => import('./pages/roles/roles.component').then(m => m.RolesComponent) },
      { path: 'white-label', loadComponent: () => import('./pages/white-label/white-label.component').then(m => m.WhiteLabelComponent) },
      { path: 'fiscal',      loadComponent: () => import('./pages/fiscal/fiscal.component').then(m => m.FiscalComponent) },
      { path: 'smtp-docs',   loadComponent: () => import('./pages/smtp-docs/smtp-docs.component').then(m => m.SmtpDocsComponent) },
      { path: 'modulos',     loadComponent: () => import('./pages/modulos/modulos.component').then(m => m.ModulosComponent) },
    ],
  },
];
```

- [ ] **Commit**

```bash
git add src/app/features/empresa/
git commit -m "feat: scaffold empresa feature (usuarios, roles, white-label, fiscal, smtp-docs, modulos)"
```

---

## Task 16: Feature sucursales (CORE)

**Files:**
- Create: `src/app/features/sucursales/sucursales.routes.ts`
- Create: `src/app/features/sucursales/models/sucursal.model.ts`
- Create: `src/app/features/sucursales/services/sucursales.service.ts`
- Create: `src/app/features/sucursales/pages/sucursales/sucursales.component.ts`
- Create: `src/app/features/sucursales/pages/areas/areas.component.ts`

- [ ] **Crear modelo**

```typescript
// src/app/features/sucursales/models/sucursal.model.ts
export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  activa: boolean;
}

export interface Area {
  id: string;
  nombre: string;
  sucursalId: string;
}
```

- [ ] **Crear servicio**

```typescript
// src/app/features/sucursales/services/sucursales.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sucursal, Area } from '../models/sucursal.model';

@Injectable()
export class SucursalesService {
  private readonly http = inject(HttpClient);
  getSucursales(): Observable<Sucursal[]> { return this.http.get<Sucursal[]>('/api/sucursales'); }
  getAreas(sucursalId: string): Observable<Area[]> { return this.http.get<Area[]>(`/api/sucursales/${sucursalId}/areas`); }
}
```

- [ ] **Crear páginas**

```typescript
// src/app/features/sucursales/pages/sucursales/sucursales.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Sucursales</h2>
    <ui-empty-state heading="Sin sucursales" icon="pi-map-marker"
                    description="Agregá la primera sucursal para empezar." ctaLabel="Nueva sucursal" />
  `,
})
export class SucursalesPageComponent {}
```

```typescript
// src/app/features/sucursales/pages/areas/areas.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-areas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <h2>Áreas</h2>
    <ui-empty-state heading="Sin áreas" icon="pi-th-large"
                    description="Configurá las áreas de trabajo de cada sucursal." ctaLabel="Nueva área" />
  `,
})
export class AreasComponent {}
```

- [ ] **Crear rutas**

```typescript
// src/app/features/sucursales/sucursales.routes.ts
import { Routes } from '@angular/router';
import { SucursalesService } from './services/sucursales.service';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    providers: [SucursalesService],
    children: [
      { path: '', redirectTo: 'lista', pathMatch: 'full' },
      { path: 'lista', loadComponent: () => import('./pages/sucursales/sucursales.component').then(m => m.SucursalesPageComponent) },
      { path: 'areas', loadComponent: () => import('./pages/areas/areas.component').then(m => m.AreasComponent) },
    ],
  },
];
```

- [ ] **Commit**

```bash
git add src/app/features/sucursales/
git commit -m "feat: scaffold sucursales feature (lista, areas)"
```

---

## Task 17: Feature analítica (CORE)

**Files:**
- Create: `src/app/features/analitica/analitica.routes.ts`
- Create: `src/app/features/analitica/models/analitica.model.ts`
- Create: `src/app/features/analitica/services/analitica.service.ts`
- Create: páginas para: pacientes, atencion, protocolos, rotulos, pre-analitica, analitica, post-analitica, nbu

- [ ] **Crear modelo**

```typescript
// src/app/features/analitica/models/analitica.model.ts
export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  email?: string;
  telefono?: string;
}

export interface Protocolo {
  id: string;
  numero: string;
  pacienteId: string;
  fecha: string;
  estado: 'pendiente' | 'en_proceso' | 'finalizado';
}

export interface Nbu {
  id: string;
  codigo: string;
  descripcion: string;
  precio: number;
}
```

- [ ] **Crear servicio**

```typescript
// src/app/features/analitica/services/analitica.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paciente, Protocolo, Nbu } from '../models/analitica.model';

@Injectable()
export class AnaliticaService {
  private readonly http = inject(HttpClient);
  getPacientes(): Observable<Paciente[]>   { return this.http.get<Paciente[]>('/api/analitica/pacientes'); }
  getProtocolos(): Observable<Protocolo[]> { return this.http.get<Protocolo[]>('/api/analitica/protocolos'); }
  getNbus(): Observable<Nbu[]>             { return this.http.get<Nbu[]>('/api/analitica/nbu'); }
}
```

- [ ] **Crear páginas (8 páginas con empty-state)**

```typescript
// src/app/features/analitica/pages/pacientes/pacientes.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Pacientes</h2><ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" />`,
})
export class PacientesComponent {}
```

Crear de la misma manera (heading y icon diferente por página):

| Archivo | selector | heading | icon |
|---------|----------|---------|------|
| `atencion/atencion.component.ts` | `app-atencion` | `Sin atenciones registradas` | `pi-heart` |
| `protocolos/protocolos.component.ts` | `app-protocolos` | `Sin protocolos` | `pi-file` |
| `rotulos/rotulos.component.ts` | `app-rotulos` | `Sin rótulos` | `pi-tag` |
| `pre-analitica/pre-analitica.component.ts` | `app-pre-analitica` | `Sin muestras en pre-analítica` | `pi-inbox` |
| `analitica/analitica-work.component.ts` | `app-analitica-work` | `Sin trabajo analítico` | `pi-cog` |
| `post-analitica/post-analitica.component.ts` | `app-post-analitica` | `Sin resultados en post-analítica` | `pi-check-circle` |
| `nbu/nbu.component.ts` | `app-nbu` | `Sin NBU configurados` | `pi-list` |

- [ ] **Crear analitica.routes.ts**

```typescript
// src/app/features/analitica/analitica.routes.ts
import { Routes } from '@angular/router';
import { AnaliticaService } from './services/analitica.service';

export const ANALITICA_ROUTES: Routes = [
  {
    path: '',
    providers: [AnaliticaService],
    children: [
      { path: '', redirectTo: 'pacientes', pathMatch: 'full' },
      { path: 'pacientes',     loadComponent: () => import('./pages/pacientes/pacientes.component').then(m => m.PacientesComponent) },
      { path: 'atencion',      loadComponent: () => import('./pages/atencion/atencion.component').then(m => m.AtencionComponent) },
      { path: 'protocolos',    loadComponent: () => import('./pages/protocolos/protocolos.component').then(m => m.ProtocolosComponent) },
      { path: 'rotulos',       loadComponent: () => import('./pages/rotulos/rotulos.component').then(m => m.RotulosComponent) },
      { path: 'pre-analitica', loadComponent: () => import('./pages/pre-analitica/pre-analitica.component').then(m => m.PreAnaliticaComponent) },
      { path: 'analitica',     loadComponent: () => import('./pages/analitica/analitica-work.component').then(m => m.AnaliticaWorkComponent) },
      { path: 'post-analitica',loadComponent: () => import('./pages/post-analitica/post-analitica.component').then(m => m.PostAnaliticaComponent) },
      { path: 'nbu',           loadComponent: () => import('./pages/nbu/nbu.component').then(m => m.NbuComponent) },
    ],
  },
];
```

- [ ] **Commit**

```bash
git add src/app/features/analitica/
git commit -m "feat: scaffold analitica feature (pacientes, atencion, protocolos, rotulos, pre/post analitica, nbu)"
```

---

## Task 18: Feature turnos (ACTIVABLE)

**Files:**
- Create: `src/app/features/turnos/turnos.routes.ts`
- Create: `src/app/features/turnos/models/turno.model.ts`
- Create: `src/app/features/turnos/services/turnos.service.ts`
- Create: páginas agenda, configuracion, totem, colas, atencion-turno

- [ ] **Crear modelo**

```typescript
// src/app/features/turnos/models/turno.model.ts
export interface Turno {
  id: string;
  pacienteId: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'presente' | 'llamado' | 'atendido' | 'ausente';
  sucursalId: string;
}
```

- [ ] **Crear servicio**

```typescript
// src/app/features/turnos/services/turnos.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Turno } from '../models/turno.model';

@Injectable()
export class TurnosService {
  private readonly http = inject(HttpClient);
  getTurnos(fecha: string): Observable<Turno[]> {
    return this.http.get<Turno[]>(`/api/turnos?fecha=${fecha}`);
  }
}
```

- [ ] **Crear páginas**

```typescript
// src/app/features/turnos/pages/agenda/agenda.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Agenda de Turnos</h2><ui-empty-state heading="Sin turnos para hoy" icon="pi-calendar" ctaLabel="Nuevo turno" />`,
})
export class AgendaComponent {}
```

Crear con template mínimo:

| Archivo | heading | icon |
|---------|---------|------|
| `configuracion/configuracion.component.ts` | `Configuración de Turnos` | `pi-sliders-h` |
| `totem/totem.component.ts` | `Tótem` | `pi-desktop` |
| `colas/colas.component.ts` | `Gestión de Colas` | `pi-list` |
| `atencion-turno/atencion-turno.component.ts` | `Atención de Turno` | `pi-user-edit` |

- [ ] **Crear turnos.routes.ts**

```typescript
// src/app/features/turnos/turnos.routes.ts
import { Routes } from '@angular/router';
import { TurnosService } from './services/turnos.service';

export const TURNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [TurnosService],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda',         loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      { path: 'configuracion',  loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
      { path: 'totem',          loadComponent: () => import('./pages/totem/totem.component').then(m => m.TotemComponent) },
      { path: 'colas',          loadComponent: () => import('./pages/colas/colas.component').then(m => m.ColasComponent) },
      { path: 'atencion-turno', loadComponent: () => import('./pages/atencion-turno/atencion-turno.component').then(m => m.AtencionTurnoComponent) },
    ],
  },
];
```

- [ ] **Commit**

```bash
git add src/app/features/turnos/
git commit -m "feat: scaffold turnos feature (agenda, configuracion, totem, colas, atencion-turno)"
```

---

## Task 19: Feature financiero (ACTIVABLE)

**Files:**
- Create: `src/app/features/financiero/financiero.routes.ts`
- Create: `src/app/features/financiero/models/financiero.model.ts`
- Create: `src/app/features/financiero/services/financiero.service.ts`
- Create: páginas pagos, cajas, movimientos, coberturas, liquidaciones

- [ ] **Crear modelo**

```typescript
// src/app/features/financiero/models/financiero.model.ts
export interface Pago {
  id: string;
  monto: number;
  fecha: string;
  metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'cobertura';
  protocoloId: string;
}

export interface Cobertura {
  id: string;
  nombre: string;
  planes: Plan[];
}

export interface Plan {
  id: string;
  nombre: string;
  coberturaId: string;
}

export interface Movimiento {
  id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  fecha: string;
  sucursalId: string;
}
```

- [ ] **Crear servicio**

```typescript
// src/app/features/financiero/services/financiero.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pago, Cobertura, Movimiento } from '../models/financiero.model';

@Injectable()
export class FinancieroService {
  private readonly http = inject(HttpClient);
  getPagos(): Observable<Pago[]>             { return this.http.get<Pago[]>('/api/financiero/pagos'); }
  getCoberturas(): Observable<Cobertura[]>   { return this.http.get<Cobertura[]>('/api/financiero/coberturas'); }
  getMovimientos(): Observable<Movimiento[]> { return this.http.get<Movimiento[]>('/api/financiero/movimientos'); }
}
```

- [ ] **Crear páginas**

```typescript
// src/app/features/financiero/pages/pagos/pagos.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

@Component({
  selector: 'app-pagos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `<h2>Pagos</h2><ui-empty-state heading="Sin pagos registrados" icon="pi-credit-card" ctaLabel="Registrar pago" />`,
})
export class PagosComponent {}
```

Crear con template mínimo:

| Archivo | heading | icon |
|---------|---------|------|
| `cajas/cajas.component.ts` | `Cajas` | `pi-wallet` |
| `movimientos/movimientos.component.ts` | `Ingresos y Egresos` | `pi-arrows-h` |
| `coberturas/coberturas.component.ts` | `Coberturas` | `pi-shield` |
| `liquidaciones/liquidaciones.component.ts` | `Liquidaciones` | `pi-file-pdf` |

- [ ] **Crear financiero.routes.ts**

```typescript
// src/app/features/financiero/financiero.routes.ts
import { Routes } from '@angular/router';
import { FinancieroService } from './services/financiero.service';

export const FINANCIERO_ROUTES: Routes = [
  {
    path: '',
    providers: [FinancieroService],
    children: [
      { path: '', redirectTo: 'pagos', pathMatch: 'full' },
      { path: 'pagos',          loadComponent: () => import('./pages/pagos/pagos.component').then(m => m.PagosComponent) },
      { path: 'cajas',          loadComponent: () => import('./pages/cajas/cajas.component').then(m => m.CajasComponent) },
      { path: 'movimientos',    loadComponent: () => import('./pages/movimientos/movimientos.component').then(m => m.MovimientosComponent) },
      { path: 'coberturas',     loadComponent: () => import('./pages/coberturas/coberturas.component').then(m => m.CoberturasComponent) },
      { path: 'liquidaciones',  loadComponent: () => import('./pages/liquidaciones/liquidaciones.component').then(m => m.LiquidacionesComponent) },
    ],
  },
];
```

- [ ] **Commit**

```bash
git add src/app/features/financiero/
git commit -m "feat: scaffold financiero feature (pagos, cajas, movimientos, coberturas, liquidaciones)"
```

---

## Task 20: Placeholders (medicos, stock, saas-admin)

**Files:**
- Create: `src/app/features/medicos/medicos.routes.ts`
- Create: `src/app/features/stock/stock.routes.ts`
- Create: `src/app/features/saas-admin/admin.routes.ts`

- [ ] **Crear medicos.routes.ts**

```typescript
// src/app/features/medicos/medicos.routes.ts
import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Médicos</h2><p style="color:var(--ds-text-muted)">Módulo en desarrollo.</p>`,
})
class MedicosPlaceholderComponent {}

export const MEDICOS_ROUTES: Routes = [
  { path: '', component: MedicosPlaceholderComponent },
];
```

- [ ] **Crear stock.routes.ts**

```typescript
// src/app/features/stock/stock.routes.ts
import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Stock</h2><p style="color:var(--ds-text-muted)">Módulo en desarrollo.</p>`,
})
class StockPlaceholderComponent {}

export const STOCK_ROUTES: Routes = [
  { path: '', component: StockPlaceholderComponent },
];
```

- [ ] **Crear admin.routes.ts**

```typescript
// src/app/features/saas-admin/admin.routes.ts
import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>SaaS Admin</h2><p style="color:var(--ds-text-muted)">Panel de administración global.</p>`,
})
class AdminPlaceholderComponent {}

export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminPlaceholderComponent },
];
```

- [ ] **Commit**

```bash
git add src/app/features/medicos/ src/app/features/stock/ src/app/features/saas-admin/
git commit -m "feat: add placeholder routes for medicos, stock and saas-admin"
```

---

## Task 21: Build final y verificación

**Files:** Ninguno nuevo — solo verificación.

- [ ] **Build de producción**

```bash
npx ng build
```

Esperado: build exitoso sin errores. Si hay errores de tipo, corregirlos antes de continuar.

- [ ] **Build de desarrollo**

```bash
npx ng build --configuration development
```

- [ ] **Ejecutar todos los tests**

```bash
npm test
```

Esperado: todos los tests de `token.service`, `tenant.store`, `module-registry`, `tenant-theme.service`, interceptores, guards y pipes pasan.

- [ ] **Levantar dev server y verificar navegación**

```bash
npm start
```

Navegar a `http://localhost:4200`. Debe redirigir a `/login`. El formulario de login debe renderizar correctamente con PrimeNG y Tailwind.

- [ ] **Commit final**

```bash
git add .
git commit -m "chore: verify full build and test suite passes for scaffolding"
```

---

## Checklist de cobertura de spec

| Requisito de spec | Task que lo cubre |
|---|---|
| Multi-tenant via JWT claim | Task 4 (TokenService), Task 8 (tenantIdInterceptor) |
| TenantStore NgRx Signal Store | Task 5 |
| ModuleRegistry + isActive | Task 6 |
| TenantResolver | Task 6 |
| TenantThemeService + zonas seguras | Task 7 |
| authGuard, roleGuard, moduleActiveGuard | Task 9 |
| Login component | Task 10 |
| app.config + interceptores | Task 11 |
| app.routes lazy + canMatch | Task 11 |
| Admin shell (desktop sidebar + mobile drawer) | Task 12 |
| Topbar dinámico | Task 12 |
| Sidebar dinámico desde ModuleRegistry | Task 12 |
| Path aliases @core/@shared/@layout/@features | Task 1 |
| SCSS tokens --brand-* y --ds-* | Task 2 |
| SCSS breakpoints mixins | Task 2 |
| SCSS globals (Montserrat, touch targets) | Task 2 |
| SCSS utilities (.ui-show-*) | Task 2 |
| Shared UI (stat-card, list-card, empty-state, ui-field) | Task 13 |
| BreakpointService | Task 13 |
| Pipes (currency-ar, date-es, safe-html) | Task 14 |
| Directives (hasRole, hasModule, autofocus) | Task 14 |
| Feature empresa (6 páginas) | Task 15 |
| Feature sucursales (2 páginas) | Task 16 |
| Feature analítica (8 páginas) | Task 17 |
| Feature turnos ACTIVABLE (5 páginas) | Task 18 |
| Feature financiero ACTIVABLE (5 páginas) | Task 19 |
| Placeholders medicos, stock, saas-admin | Task 20 |
| OnPush en todos los componentes | Todas las tasks |
| resource() para fetch async | Task 15 (UsuariosComponent) |
