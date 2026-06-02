# Frontend — Roles y permisos (secciones por usuario) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-05-30-frontend-roles-permisos-design.md`
> **Rama:** `feat/roles-permisos` (worktree `.worktrees/roles-permisos`, desde `development`)
> **Jira:** [KAN-60](https://exequielsantoro.atlassian.net/browse/KAN-60)

**Goal:** Pantalla master-detail para que el `ADMINISTRADOR` asigne secciones por usuario (consume la API de KAN-57) + sidebar/guard dirigidos por `/me/access-sections`, de modo que cada empleado vea solo lo que tiene concedido.

**Architecture:** Dos slices NgRx clásicos: `core/access` (mis secciones efectivas, cargado al login, consumido por sidebar + guard vía un `AccessRegistry` que espeja `ModuleRegistry`) y `features/roles-permisos` (catálogo + secciones del usuario seleccionado + working set para la pantalla de admin). La pantalla reusa la lista de usuarios del feature `empresa`. Reemplaza la página read-only `/roles`.

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico (`createAction`/`createReducer`/`createEffect`/`createSelector`, sin `@ngrx/entity`), PrimeNG 21 + Tailwind, Vitest (globals on).

---

## Convenciones del repo (confirmadas — respetarlas)

- **Slice NgRx:** `*.state.ts` (interface + `initialXxxState` + `XXX_FEATURE_KEY`), `*.actions.ts` (`createAction`+`props`), `*.reducer.ts` (`createReducer`+`on`), `*.effects.ts` (`@Injectable()` sin `providedIn`, deps por `inject()`; reads `switchMap`, create/save `exhaustMap`, toggles `concatMap`), `*.selectors.ts` (`createFeatureSelector`+`createSelector`). Registrar con `provideState(KEY, reducer)` + `provideEffects(Effects)` en `src/app/app.config.ts`.
- **Componentes:** `ChangeDetectionStrategy.OnPush`. Smart pages: `inject(Store)`, `store.selectSignal(selector)` para leer, `store.dispatch(...)` para escribir, estado UI local con `signal()`. Dumb components del feature usuarios usan API legacy `@Input/@Output/EventEmitter` — **seguir ese estilo** en este feature por consistencia.
- **Toasts:** `NotificationService` (signal-based: `success`/`error`), disparados desde effects `{ dispatch: false }`. Un `globalFailureToast$` por feature toma todos los `*Failure` y muestra `error.error.message ?? error.message ?? 'Error inesperado'`. Errores en español, sin leak (regla #4).
- **Aliases:** `@core`, `@shared`, `@layout`, `@features` (resueltos en `vitest.config.ts` y `tsconfig`).
- **Tests (Vitest):** globals on (`describe/it/expect/vi` sin import). Reducer/selectors: llamados directos. Effects: `provideMockActions(() => actions$)` + `firstValueFrom(effects.x$)`. Pages: `provideMockStore({ initialState: { [KEY]: state } })`. Correr un spec: `npx vitest run <ruta-al-spec>` (o `-t "<nombre>"`). Full: `npm test`.
- **Tipos `AccessSection`/`SectionResponse` viven en `core/`** (no en el feature) para que `core/access` y `features/roles-permisos` los compartan sin que core dependa de un feature.

---

## File Structure

**Nuevos:**
- `src/app/core/access/access.model.ts` — `AccessSection`, `SectionResponse`.
- `src/app/core/access/access-api.service.ts` — `GET /me/access-sections`.
- `src/app/core/access/store/access.state.ts|actions.ts|reducer.ts|effects.ts|selectors.ts` — slice "mis secciones".
- `src/app/core/access/access-registry.ts` — `has(section)` (espeja `ModuleRegistry`).
- `src/app/core/guards/section.guard.ts` — `sectionGuard(section)`.
- `src/app/features/roles-permisos/models/access-section-groups.ts` — agrupación por área (presentación).
- `src/app/features/roles-permisos/services/roles-permisos-api.service.ts` — catálogo + GET/PUT por usuario.
- `src/app/features/roles-permisos/store/roles-permisos.state.ts|actions.ts|reducer.ts|effects.ts|selectors.ts`.
- `src/app/features/roles-permisos/pages/roles-permisos.page.ts` — master-detail.
- `src/app/features/roles-permisos/components/usuarios-picker.component.ts`.
- `src/app/features/roles-permisos/components/secciones-checklist.component.ts`.
- `src/app/features/roles-permisos/roles-permisos.routes.ts`.

**Modificados:**
- `src/app/app.config.ts` — registrar ambos slices + dispatch `loadMySections()` en el appInitializer.
- `src/app/core/tenant/tenant.resolver.ts` — dispatch `loadMySections()`.
- `src/app/core/auth/login/login.component.ts` — dispatch `loadMySections()` en el éxito.
- `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts` — dispatch `clearMySections()`.
- `src/app/layout/sidebar/sidebar.nav.ts` — `sectionKey` en items + hijos.
- `src/app/layout/sidebar/sidebar.component.ts` — `AccessRegistry` + filtrar por sección.
- `src/app/app.routes.ts` — `/roles` apunta al nuevo feature; `sectionGuard` en rutas; quitar import de `RolesPage`.
- `src/app/features/empresa/empresa.routes.ts` — quitar la child `roles`.
- `src/app/features/analitica/analitica.routes.ts` — `sectionGuard` por sub-ruta.
- Borrar `src/app/features/empresa/pages/roles/roles.page.ts`.

---

## Task 1: `core/access` — modelo + slice "mis secciones"

**Files:**
- Create: `src/app/core/access/access.model.ts`
- Create: `src/app/core/access/access-api.service.ts`
- Create: `src/app/core/access/store/access.state.ts`, `access.actions.ts`, `access.reducer.ts`, `access.effects.ts`, `access.selectors.ts`
- Test: `src/app/core/access/store/access.reducer.spec.ts`, `access.effects.spec.ts`

- [ ] **Step 1: Model**

`src/app/core/access/access.model.ts`:
```ts
export type AccessSection =
  | 'ATENCION'
  | 'EXTRACCIONES'
  | 'PREANALITICA'
  | 'ANALITICA'
  | 'POSTANALITICA'
  | 'PACIENTES'
  | 'TURNOS'
  | 'FINANCIERO'
  | 'OBRAS_SOCIALES'
  | 'STOCK'
  | 'PORTAL'
  | 'SUCURSALES';

export interface SectionResponse {
  code: AccessSection;
  label: string;
}
```

- [ ] **Step 2: API service**

`src/app/core/access/access-api.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SectionResponse } from './access.model';

@Injectable({ providedIn: 'root' })
export class AccessApiService {
  private readonly http = inject(HttpClient);

  getMySections(): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>('/api/v1/me/access-sections');
  }
}
```

- [ ] **Step 3: State**

`src/app/core/access/store/access.state.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection } from '../access.model';

export interface AccessState {
  sections: AccessSection[];
  loaded: boolean;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAccessState: AccessState = {
  sections: [],
  loaded: false,
  pending: false,
  error: null,
};

export const ACCESS_FEATURE_KEY = 'access';
```

- [ ] **Step 4: Actions**

`src/app/core/access/store/access.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection } from '../access.model';

export const loadMySections = createAction('[Access] Load My Sections');
export const loadMySectionsSuccess = createAction(
  '[Access API] Load My Sections Success',
  props<{ sections: AccessSection[] }>(),
);
export const loadMySectionsFailure = createAction(
  '[Access API] Load My Sections Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearMySections = createAction('[Access] Clear My Sections');
```

- [ ] **Step 5: Reducer**

`src/app/core/access/store/access.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { AccessState, initialAccessState } from './access.state';
import {
  loadMySections, loadMySectionsSuccess, loadMySectionsFailure, clearMySections,
} from './access.actions';

export const accessReducer = createReducer(
  initialAccessState,
  on(loadMySections, (state): AccessState => ({ ...state, pending: true, error: null })),
  on(loadMySectionsSuccess, (state, { sections }): AccessState => ({
    ...state, sections, loaded: true, pending: false, error: null,
  })),
  on(loadMySectionsFailure, (state, { error }): AccessState => ({
    ...state, loaded: true, pending: false, error,
  })),
  on(clearMySections, (): AccessState => ({ ...initialAccessState })),
);
```

- [ ] **Step 6: Effects**

`src/app/core/access/store/access.effects.ts`:
```ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, switchMap } from 'rxjs';
import { AccessApiService } from '../access-api.service';
import { loadMySections, loadMySectionsSuccess, loadMySectionsFailure } from './access.actions';

@Injectable()
export class AccessEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(AccessApiService);

  loadMySections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMySections),
      switchMap(() =>
        this.api.getMySections().pipe(
          map((sections) => loadMySectionsSuccess({ sections: sections.map((s) => s.code) })),
          catchError((error: HttpErrorResponse) => of(loadMySectionsFailure({ error }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 7: Selectors**

`src/app/core/access/store/access.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AccessState, ACCESS_FEATURE_KEY } from './access.state';

export const selectAccessState = createFeatureSelector<AccessState>(ACCESS_FEATURE_KEY);
export const selectMySections = createSelector(selectAccessState, (s) => s.sections);
export const selectAccessLoaded = createSelector(selectAccessState, (s) => s.loaded);
```

- [ ] **Step 8: Failing tests**

`src/app/core/access/store/access.reducer.spec.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { accessReducer } from './access.reducer';
import { initialAccessState } from './access.state';
import {
  loadMySections, loadMySectionsSuccess, loadMySectionsFailure, clearMySections,
} from './access.actions';

describe('accessReducer', () => {
  it('loadMySections marca pending', () => {
    const s = accessReducer(initialAccessState, loadMySections());
    expect(s.pending).toBe(true);
    expect(s.loaded).toBe(false);
  });

  it('loadMySectionsSuccess setea sections y loaded', () => {
    const s = accessReducer(
      { ...initialAccessState, pending: true },
      loadMySectionsSuccess({ sections: ['ATENCION', 'TURNOS'] }),
    );
    expect(s.sections).toEqual(['ATENCION', 'TURNOS']);
    expect(s.loaded).toBe(true);
    expect(s.pending).toBe(false);
  });

  it('loadMySectionsFailure marca loaded igual (para no colgar el guard)', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = accessReducer({ ...initialAccessState, pending: true }, loadMySectionsFailure({ error }));
    expect(s.loaded).toBe(true);
    expect(s.error).toBe(error);
  });

  it('clearMySections resetea al estado inicial', () => {
    const s = accessReducer(
      { sections: ['TURNOS'], loaded: true, pending: false, error: null },
      clearMySections(),
    );
    expect(s).toEqual(initialAccessState);
  });
});
```

`src/app/core/access/store/access.effects.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessEffects } from './access.effects';
import { AccessApiService } from '../access-api.service';
import { loadMySections, loadMySectionsSuccess, loadMySectionsFailure } from './access.actions';

describe('AccessEffects', () => {
  let actions$: Observable<Action>;
  let api: { getMySections: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    api = { getMySections: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AccessEffects,
        provideMockActions(() => actions$),
        { provide: AccessApiService, useValue: api },
      ],
    });
  });

  it('mapea SectionResponse[] a codes en success', async () => {
    api.getMySections.mockReturnValue(of([{ code: 'ATENCION', label: 'Atención' }, { code: 'TURNOS', label: 'Turnos' }]));
    actions$ = of(loadMySections());
    const effects = TestBed.inject(AccessEffects);
    const action = await firstValueFrom(effects.loadMySections$);
    expect(action).toEqual(loadMySectionsSuccess({ sections: ['ATENCION', 'TURNOS'] }));
  });

  it('failure', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getMySections.mockReturnValue(throwError(() => error));
    actions$ = of(loadMySections());
    const effects = TestBed.inject(AccessEffects);
    const action = await firstValueFrom(effects.loadMySections$);
    expect(action).toEqual(loadMySectionsFailure({ error }));
  });
});
```

- [ ] **Step 9: Register in `app.config.ts`** — add imports and a `provideState`/`provideEffects` pair after the tenant block:
```ts
// imports (junto a los otros feature imports):
import { ACCESS_FEATURE_KEY } from '@core/access/store/access.state';
import { accessReducer } from '@core/access/store/access.reducer';
import { AccessEffects } from '@core/access/store/access.effects';
// ...
// dentro de providers, después de provideEffects(TenantEffects):
provideState(ACCESS_FEATURE_KEY, accessReducer),
provideEffects(AccessEffects),
```

- [ ] **Step 10: Run + commit**

Run: `npx vitest run src/app/core/access/store/access.reducer.spec.ts src/app/core/access/store/access.effects.spec.ts`
Expected: PASS.
```bash
git add src/app/core/access src/app/app.config.ts
git commit -m "feat(access): slice core/access (mis secciones via /me/access-sections)"
```

---

## Task 2: `AccessRegistry` + hooks de carga (login/resolver/logout)

**Files:**
- Create: `src/app/core/access/access-registry.ts`
- Modify: `src/app/core/tenant/tenant.resolver.ts`, `src/app/app.config.ts`, `src/app/core/auth/login/login.component.ts`, `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts`
- Test: `src/app/core/access/access-registry.spec.ts`

- [ ] **Step 1: AccessRegistry (espeja `ModuleRegistry`)**

`src/app/core/access/access-registry.ts`:
```ts
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { AccessSection } from './access.model';
import { selectMySections } from './store/access.selectors';

@Injectable({ providedIn: 'root' })
export class AccessRegistry {
  private readonly sections = inject(Store).selectSignal(selectMySections);

  has(section: AccessSection): boolean {
    return this.sections().includes(section);
  }
}
```

- [ ] **Step 2: Failing test**

`src/app/core/access/access-registry.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { AccessRegistry } from './access-registry';
import { ACCESS_FEATURE_KEY, initialAccessState } from './store/access.state';

describe('AccessRegistry', () => {
  function setup(sections: string[]) {
    TestBed.configureTestingModule({
      providers: [
        AccessRegistry,
        provideMockStore({ initialState: { [ACCESS_FEATURE_KEY]: { ...initialAccessState, sections } } }),
      ],
    });
    return TestBed.inject(AccessRegistry);
  }

  it('has() true si la seccion esta concedida', () => {
    const reg = setup(['ATENCION', 'TURNOS']);
    expect(reg.has('ATENCION')).toBe(true);
    expect(reg.has('FINANCIERO')).toBe(false);
  });
});
```

Run: `npx vitest run src/app/core/access/access-registry.spec.ts` → PASS.

- [ ] **Step 3: Dispatch `loadMySections()` en el resolver** — `src/app/core/tenant/tenant.resolver.ts`, agregar el import y el dispatch junto al de tenant:
```ts
import { loadMySections } from '@core/access/store/access.actions';
// ... dentro de tenantResolver, después de store.dispatch(loadTenantConfig());
  store.dispatch(loadMySections());
```

- [ ] **Step 4: Dispatch en el appInitializer** — `src/app/app.config.ts`, en `provideAppInitializer`, después del `store.dispatch(loadTenantConfig())`:
```ts
import { loadMySections } from '@core/access/store/access.actions';
// ...
    provideAppInitializer(() => {
      const tokens = inject(TokenService);
      const store = inject(Store);
      if (tokens.isTokenValid() && !tokens.getRoles().includes('SAAS_ADMIN')) {
        store.dispatch(loadTenantConfig());
        store.dispatch(loadMySections());
      }
    }),
```

- [ ] **Step 5: Dispatch en login success** — `src/app/core/auth/login/login.component.ts`, en la rama `if (response.token)`, después de `this.store.dispatch(loadTenantConfig());`:
```ts
import { loadMySections } from '@core/access/store/access.actions';
// ...
        this.store.dispatch(loadTenantConfig());
        this.store.dispatch(loadMySections());
```

- [ ] **Step 6: Clear en logout** — `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts`, inyectar `Store` y despachar `clearMySections()` en `confirm()`:
```ts
import { Store } from '@ngrx/store';
import { clearMySections } from '@core/access/store/access.actions';
// ... agregar al constructor/inject:
  private readonly store = inject(Store);
// ... en confirm(), antes de navigate:
    this.store.dispatch(clearMySections());
```

- [ ] **Step 7: Compile check + commit**

Run: `npx vitest run src/app/core/access` (todos los specs de access verdes).
```bash
git add src/app/core/access/access-registry.ts src/app/core/access/access-registry.spec.ts src/app/core/tenant/tenant.resolver.ts src/app/app.config.ts src/app/core/auth/login/login.component.ts src/app/features/profile/components/logout-confirm/logout-confirm.component.ts
git commit -m "feat(access): AccessRegistry + carga de /me en login/resolver/bootstrap y clear en logout"
```

---

## Task 3: API service + agrupación del feature `roles-permisos`

**Files:**
- Create: `src/app/features/roles-permisos/services/roles-permisos-api.service.ts`
- Create: `src/app/features/roles-permisos/models/access-section-groups.ts`

- [ ] **Step 1: API service**

`src/app/features/roles-permisos/services/roles-permisos-api.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessSection, SectionResponse } from '@core/access/access.model';

@Injectable({ providedIn: 'root' })
export class RolesPermisosApiService {
  private readonly http = inject(HttpClient);

  getGrantable(): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>('/api/v1/access-sections');
  }

  getUserSections(userId: number): Observable<SectionResponse[]> {
    return this.http.get<SectionResponse[]>(`/api/v1/user/${userId}/access-sections`);
  }

  setUserSections(userId: number, sections: AccessSection[]): Observable<void> {
    return this.http.put<void>(`/api/v1/user/${userId}/access-sections`, { sections });
  }
}
```

- [ ] **Step 2: Agrupación por área (presentación)**

`src/app/features/roles-permisos/models/access-section-groups.ts`:
```ts
import { AccessSection } from '@core/access/access.model';

export interface SectionGroup {
  label: string;
  sections: AccessSection[];
}

/** Orden y agrupación visual del checklist. Solo presentación: el set que se manda es plano. */
export const SECTION_GROUPS: SectionGroup[] = [
  { label: 'Atención', sections: ['ATENCION', 'EXTRACCIONES'] },
  { label: 'Analítica', sections: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA'] },
  { label: 'Pacientes', sections: ['PACIENTES'] },
  { label: 'Turnos', sections: ['TURNOS'] },
  { label: 'Financiero', sections: ['FINANCIERO', 'OBRAS_SOCIALES'] },
  { label: 'Stock', sections: ['STOCK'] },
  { label: 'Portal', sections: ['PORTAL'] },
  { label: 'Sucursales', sections: ['SUCURSALES'] },
];
```

- [ ] **Step 3: Commit** (sin test propio; se ejercitan en Task 4/5)
```bash
git add src/app/features/roles-permisos/services src/app/features/roles-permisos/models
git commit -m "feat(roles-permisos): API service + agrupacion de secciones"
```

---

## Task 4: Slice `roles-permisos`

**Files:**
- Create: `src/app/features/roles-permisos/store/roles-permisos.state.ts`, `roles-permisos.actions.ts`, `roles-permisos.reducer.ts`, `roles-permisos.effects.ts`, `roles-permisos.selectors.ts`
- Modify: `src/app/app.config.ts`
- Test: `roles-permisos.reducer.spec.ts`, `roles-permisos.effects.spec.ts`, `roles-permisos.selectors.spec.ts`

- [ ] **Step 1: State**

`src/app/features/roles-permisos/store/roles-permisos.state.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection, SectionResponse } from '@core/access/access.model';

export interface RolesPermisosState {
  catalog: SectionResponse[];
  selectedUserId: number | null;
  grantedSet: AccessSection[];
  workingSet: AccessSection[];
  pending: boolean;
  saving: boolean;
  error: HttpErrorResponse | null;
}

export const initialRolesPermisosState: RolesPermisosState = {
  catalog: [],
  selectedUserId: null,
  grantedSet: [],
  workingSet: [],
  pending: false,
  saving: false,
  error: null,
};

export const ROLES_PERMISOS_FEATURE_KEY = 'rolesPermisos';
```

- [ ] **Step 2: Actions**

`src/app/features/roles-permisos/store/roles-permisos.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { AccessSection, SectionResponse } from '@core/access/access.model';

export const loadCatalog = createAction('[RP Page] Load Catalog');
export const loadCatalogSuccess = createAction('[RP API] Load Catalog Success', props<{ catalog: SectionResponse[] }>());
export const loadCatalogFailure = createAction('[RP API] Load Catalog Failure', props<{ error: HttpErrorResponse }>());

export const selectUser = createAction('[RP Page] Select User', props<{ userId: number }>());
export const loadUserSections = createAction('[RP] Load User Sections', props<{ userId: number }>());
export const loadUserSectionsSuccess = createAction('[RP API] Load User Sections Success', props<{ sections: AccessSection[] }>());
export const loadUserSectionsFailure = createAction('[RP API] Load User Sections Failure', props<{ error: HttpErrorResponse }>());

export const toggleSection = createAction('[RP Page] Toggle Section', props<{ code: AccessSection }>());

export const saveUserSections = createAction('[RP Page] Save User Sections');
export const saveUserSectionsSuccess = createAction('[RP API] Save User Sections Success', props<{ sections: AccessSection[] }>());
export const saveUserSectionsFailure = createAction('[RP API] Save User Sections Failure', props<{ error: HttpErrorResponse }>());
```

- [ ] **Step 3: Reducer**

`src/app/features/roles-permisos/store/roles-permisos.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { RolesPermisosState, initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalog, loadCatalogSuccess, loadCatalogFailure,
  selectUser, loadUserSectionsSuccess, loadUserSectionsFailure,
  toggleSection, saveUserSections, saveUserSectionsSuccess, saveUserSectionsFailure,
} from './roles-permisos.actions';

export const rolesPermisosReducer = createReducer(
  initialRolesPermisosState,

  on(loadCatalog, (s): RolesPermisosState => ({ ...s, pending: true, error: null })),
  on(loadCatalogSuccess, (s, { catalog }): RolesPermisosState => ({ ...s, catalog, pending: false })),
  on(loadCatalogFailure, (s, { error }): RolesPermisosState => ({ ...s, pending: false, error })),

  on(selectUser, (s, { userId }): RolesPermisosState => ({
    ...s, selectedUserId: userId, pending: true, error: null,
  })),
  on(loadUserSectionsSuccess, (s, { sections }): RolesPermisosState => ({
    ...s, grantedSet: sections, workingSet: sections, pending: false,
  })),
  on(loadUserSectionsFailure, (s, { error }): RolesPermisosState => ({ ...s, pending: false, error })),

  on(toggleSection, (s, { code }): RolesPermisosState => ({
    ...s,
    workingSet: s.workingSet.includes(code)
      ? s.workingSet.filter((c) => c !== code)
      : [...s.workingSet, code],
  })),

  on(saveUserSections, (s): RolesPermisosState => ({ ...s, saving: true, error: null })),
  on(saveUserSectionsSuccess, (s, { sections }): RolesPermisosState => ({
    ...s, grantedSet: sections, workingSet: sections, saving: false,
  })),
  on(saveUserSectionsFailure, (s, { error }): RolesPermisosState => ({ ...s, saving: false, error })),
);
```

- [ ] **Step 4: Effects**

`src/app/features/roles-permisos/store/roles-permisos.effects.ts`:
```ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, exhaustMap, map, of, switchMap, withLatestFrom, filter } from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { RolesPermisosApiService } from '../services/roles-permisos-api.service';
import {
  loadCatalog, loadCatalogSuccess, loadCatalogFailure,
  selectUser, loadUserSections, loadUserSectionsSuccess, loadUserSectionsFailure,
  saveUserSections, saveUserSectionsSuccess, saveUserSectionsFailure,
} from './roles-permisos.actions';
import { selectSelectedUserId, selectWorkingSet } from './roles-permisos.selectors';

@Injectable()
export class RolesPermisosEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(RolesPermisosApiService);
  private readonly notifications = inject(NotificationService);

  loadCatalog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCatalog),
      switchMap(() =>
        this.api.getGrantable().pipe(
          map((catalog) => loadCatalogSuccess({ catalog })),
          catchError((error: HttpErrorResponse) => of(loadCatalogFailure({ error }))),
        ),
      ),
    ),
  );

  selectUserLoad$ = createEffect(() =>
    this.actions$.pipe(
      ofType(selectUser),
      map(({ userId }) => loadUserSections({ userId })),
    ),
  );

  loadUserSections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUserSections),
      switchMap(({ userId }) =>
        this.api.getUserSections(userId).pipe(
          map((sections) => loadUserSectionsSuccess({ sections: sections.map((s) => s.code) })),
          catchError((error: HttpErrorResponse) => of(loadUserSectionsFailure({ error }))),
        ),
      ),
    ),
  );

  saveUserSections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveUserSections),
      withLatestFrom(this.store.select(selectSelectedUserId), this.store.select(selectWorkingSet)),
      filter(([, userId]) => userId !== null),
      exhaustMap(([, userId, workingSet]) =>
        this.api.setUserSections(userId as number, workingSet).pipe(
          map(() => saveUserSectionsSuccess({ sections: workingSet })),
          catchError((error: HttpErrorResponse) => of(saveUserSectionsFailure({ error }))),
        ),
      ),
    ),
  );

  saveSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveUserSectionsSuccess),
        map(() => this.notifications.success('Accesos actualizados')),
      ),
    { dispatch: false },
  );

  globalFailureToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loadCatalogFailure, loadUserSectionsFailure, saveUserSectionsFailure),
        map(({ error }) => {
          const detail =
            (error?.error as { message?: string })?.message ?? error?.message ?? 'Error inesperado';
          this.notifications.error('Operación fallida', detail);
        }),
      ),
    { dispatch: false },
  );
}
```

- [ ] **Step 5: Selectors**

`src/app/features/roles-permisos/store/roles-permisos.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RolesPermisosState, ROLES_PERMISOS_FEATURE_KEY } from './roles-permisos.state';

export const selectRpState = createFeatureSelector<RolesPermisosState>(ROLES_PERMISOS_FEATURE_KEY);

export const selectCatalog = createSelector(selectRpState, (s) => s.catalog);
export const selectSelectedUserId = createSelector(selectRpState, (s) => s.selectedUserId);
export const selectWorkingSet = createSelector(selectRpState, (s) => s.workingSet);
export const selectGrantedSet = createSelector(selectRpState, (s) => s.grantedSet);
export const selectRpPending = createSelector(selectRpState, (s) => s.pending);
export const selectRpSaving = createSelector(selectRpState, (s) => s.saving);

export const selectIsDirty = createSelector(selectRpState, (s) => {
  if (s.workingSet.length !== s.grantedSet.length) return true;
  const granted = new Set(s.grantedSet);
  return s.workingSet.some((c) => !granted.has(c));
});
```

- [ ] **Step 6: Failing tests**

`src/app/features/roles-permisos/store/roles-permisos.reducer.spec.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { rolesPermisosReducer } from './roles-permisos.reducer';
import { initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalogSuccess, selectUser, loadUserSectionsSuccess, toggleSection,
  saveUserSections, saveUserSectionsSuccess,
} from './roles-permisos.actions';

describe('rolesPermisosReducer', () => {
  it('loadCatalogSuccess setea el catalogo', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadCatalogSuccess({ catalog: [{ code: 'TURNOS', label: 'Turnos' }] }));
    expect(s.catalog).toHaveLength(1);
    expect(s.pending).toBe(false);
  });

  it('selectUser marca pending y el userId', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, selectUser({ userId: 7 }));
    expect(s.selectedUserId).toBe(7);
    expect(s.pending).toBe(true);
  });

  it('loadUserSectionsSuccess setea granted=working', () => {
    const s = rolesPermisosReducer(initialRolesPermisosState, loadUserSectionsSuccess({ sections: ['ATENCION'] }));
    expect(s.grantedSet).toEqual(['ATENCION']);
    expect(s.workingSet).toEqual(['ATENCION']);
  });

  it('toggleSection agrega y saca del workingSet', () => {
    let s = rolesPermisosReducer({ ...initialRolesPermisosState, workingSet: [] }, toggleSection({ code: 'TURNOS' }));
    expect(s.workingSet).toEqual(['TURNOS']);
    s = rolesPermisosReducer(s, toggleSection({ code: 'TURNOS' }));
    expect(s.workingSet).toEqual([]);
  });

  it('saveUserSections marca saving; success setea granted=working', () => {
    const saving = rolesPermisosReducer(initialRolesPermisosState, saveUserSections());
    expect(saving.saving).toBe(true);
    const done = rolesPermisosReducer(
      { ...initialRolesPermisosState, workingSet: ['ATENCION'], saving: true },
      saveUserSectionsSuccess({ sections: ['ATENCION'] }),
    );
    expect(done.grantedSet).toEqual(['ATENCION']);
    expect(done.saving).toBe(false);
  });
});
```

`src/app/features/roles-permisos/store/roles-permisos.selectors.spec.ts`:
```ts
import { ROLES_PERMISOS_FEATURE_KEY, RolesPermisosState, initialRolesPermisosState } from './roles-permisos.state';
import { selectIsDirty, selectWorkingSet } from './roles-permisos.selectors';

function wrap(state: RolesPermisosState) { return { [ROLES_PERMISOS_FEATURE_KEY]: state }; }

describe('roles-permisos selectors', () => {
  it('selectIsDirty false cuando working == granted', () => {
    const st = wrap({ ...initialRolesPermisosState, grantedSet: ['ATENCION', 'TURNOS'], workingSet: ['TURNOS', 'ATENCION'] });
    expect(selectIsDirty(st)).toBe(false);
  });
  it('selectIsDirty true cuando difieren', () => {
    const st = wrap({ ...initialRolesPermisosState, grantedSet: ['ATENCION'], workingSet: ['ATENCION', 'TURNOS'] });
    expect(selectIsDirty(st)).toBe(true);
  });
  it('selectWorkingSet devuelve el working', () => {
    const st = wrap({ ...initialRolesPermisosState, workingSet: ['STOCK'] });
    expect(selectWorkingSet(st)).toEqual(['STOCK']);
  });
});
```

`src/app/features/roles-permisos/store/roles-permisos.effects.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError, firstValueFrom } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';

import { RolesPermisosEffects } from './roles-permisos.effects';
import { RolesPermisosApiService } from '../services/roles-permisos-api.service';
import { NotificationService } from '@core/services/notification.service';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from './roles-permisos.state';
import {
  loadCatalog, loadCatalogSuccess, loadUserSections, loadUserSectionsSuccess,
  saveUserSections, saveUserSectionsSuccess,
} from './roles-permisos.actions';

describe('RolesPermisosEffects', () => {
  let actions$: Observable<Action>;
  let api: { getGrantable: ReturnType<typeof vi.fn>; getUserSections: ReturnType<typeof vi.fn>; setUserSections: ReturnType<typeof vi.fn> };

  function configure(state = initialRolesPermisosState) {
    api = { getGrantable: vi.fn(), getUserSections: vi.fn(), setUserSections: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        RolesPermisosEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [ROLES_PERMISOS_FEATURE_KEY]: state } }),
        { provide: RolesPermisosApiService, useValue: api },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  }

  it('loadCatalog success', async () => {
    configure();
    api.getGrantable.mockReturnValue(of([{ code: 'TURNOS', label: 'Turnos' }]));
    actions$ = of(loadCatalog());
    const effects = TestBed.inject(RolesPermisosEffects);
    expect(await firstValueFrom(effects.loadCatalog$)).toEqual(loadCatalogSuccess({ catalog: [{ code: 'TURNOS', label: 'Turnos' }] }));
  });

  it('loadUserSections mapea a codes', async () => {
    configure();
    api.getUserSections.mockReturnValue(of([{ code: 'ATENCION', label: 'Atención' }]));
    actions$ = of(loadUserSections({ userId: 7 }));
    const effects = TestBed.inject(RolesPermisosEffects);
    expect(await firstValueFrom(effects.loadUserSections$)).toEqual(loadUserSectionsSuccess({ sections: ['ATENCION'] }));
  });

  it('saveUserSections usa selectedUserId+workingSet del store', async () => {
    configure({ ...initialRolesPermisosState, selectedUserId: 7, workingSet: ['ATENCION', 'TURNOS'] });
    api.setUserSections.mockReturnValue(of(undefined));
    actions$ = of(saveUserSections());
    const effects = TestBed.inject(RolesPermisosEffects);
    const action = await firstValueFrom(effects.saveUserSections$);
    expect(api.setUserSections).toHaveBeenCalledWith(7, ['ATENCION', 'TURNOS']);
    expect(action).toEqual(saveUserSectionsSuccess({ sections: ['ATENCION', 'TURNOS'] }));
  });
});
```

- [ ] **Step 7: Register in `app.config.ts`** (imports + provideState/provideEffects pair):
```ts
import { ROLES_PERMISOS_FEATURE_KEY } from '@features/roles-permisos/store/roles-permisos.state';
import { rolesPermisosReducer } from '@features/roles-permisos/store/roles-permisos.reducer';
import { RolesPermisosEffects } from '@features/roles-permisos/store/roles-permisos.effects';
// ... en providers:
provideState(ROLES_PERMISOS_FEATURE_KEY, rolesPermisosReducer),
provideEffects(RolesPermisosEffects),
```

- [ ] **Step 8: Run + commit**

Run: `npx vitest run src/app/features/roles-permisos/store` → PASS.
```bash
git add src/app/features/roles-permisos/store src/app/app.config.ts
git commit -m "feat(roles-permisos): slice NgRx (catalogo + secciones por usuario + working set)"
```

---

## Task 5: Componente `secciones-checklist` (dumb)

**Files:**
- Create: `src/app/features/roles-permisos/components/secciones-checklist.component.ts`
- Test: `src/app/features/roles-permisos/components/secciones-checklist.component.spec.ts`

- [ ] **Step 1: Componente** (checkboxes binarios agrupados; muestra solo secciones del catálogo)

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { AccessSection, SectionResponse } from '@core/access/access.model';
import { SECTION_GROUPS } from '../models/access-section-groups';

interface RenderRow { code: AccessSection; label: string; }
interface RenderGroup { label: string; rows: RenderRow[]; }

@Component({
  selector: 'rp-secciones-checklist',
  standalone: true,
  imports: [FormsModule, CheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groups().length === 0) {
      <div class="ui-empty-state">
        <i class="pi pi-shield"></i>
        <h4>Sin secciones disponibles</h4>
        <p>Este tenant no tiene módulos activos para conceder.</p>
      </div>
    } @else {
      @for (g of groups(); track g.label) {
        <section class="rp-group">
          <h4 class="rp-group__title">{{ g.label }}</h4>
          <div class="rp-group__items">
            @for (row of g.rows; track row.code) {
              <label class="rp-check">
                <p-checkbox
                  [binary]="true"
                  [disabled]="disabled"
                  [ngModel]="isChecked(row.code)"
                  (ngModelChange)="toggle.emit(row.code)" />
                <span>{{ row.label }}</span>
              </label>
            }
          </div>
        </section>
      }
    }
  `,
  styles: [`
    .rp-group { margin-bottom: var(--space-4); }
    .rp-group__title { margin: 0 0 var(--space-2); font-size: 13px; color: var(--ds-text-muted); }
    .rp-group__items { display: flex; flex-direction: column; gap: var(--space-2); }
    .rp-check { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .ui-empty-state { padding: var(--space-8); text-align: center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class SeccionesChecklistComponent {
  private readonly _catalog = signal<SectionResponse[]>([]);
  private readonly _working = signal<AccessSection[]>([]);

  @Input({ required: true }) set catalog(value: SectionResponse[]) { this._catalog.set(value ?? []); }
  @Input({ required: true }) set workingSet(value: AccessSection[]) { this._working.set(value ?? []); }
  @Input() disabled = false;

  @Output() toggle = new EventEmitter<AccessSection>();

  readonly groups = computed<RenderGroup[]>(() => {
    const byCode = new Map(this._catalog().map((s) => [s.code, s.label]));
    return SECTION_GROUPS
      .map((g) => ({
        label: g.label,
        rows: g.sections.filter((c) => byCode.has(c)).map((c) => ({ code: c, label: byCode.get(c)! })),
      }))
      .filter((g) => g.rows.length > 0);
  });

  isChecked(code: AccessSection): boolean {
    return this._working().includes(code);
  }
}
```

- [ ] **Step 2: Failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SeccionesChecklistComponent } from './secciones-checklist.component';

describe('SeccionesChecklistComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SeccionesChecklistComponent], providers: [provideNoopAnimations()] });
  });

  it('agrupa el catalogo y marca lo del workingSet', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    fixture.componentInstance.catalog = [
      { code: 'ATENCION', label: 'Atención' },
      { code: 'TURNOS', label: 'Turnos' },
    ];
    fixture.componentInstance.workingSet = ['TURNOS'];
    fixture.detectChanges();
    expect(fixture.componentInstance.groups().length).toBe(2); // Atención + Turnos
    expect(fixture.componentInstance.isChecked('TURNOS')).toBe(true);
    expect(fixture.componentInstance.isChecked('ATENCION')).toBe(false);
  });

  it('emite toggle con el code', () => {
    const fixture = TestBed.createComponent(SeccionesChecklistComponent);
    fixture.componentInstance.catalog = [{ code: 'TURNOS', label: 'Turnos' }];
    fixture.componentInstance.workingSet = [];
    let emitted: string | undefined;
    fixture.componentInstance.toggle.subscribe((c) => (emitted = c));
    fixture.componentInstance.toggle.emit('TURNOS');
    expect(emitted).toBe('TURNOS');
  });
});
```

Run: `npx vitest run src/app/features/roles-permisos/components/secciones-checklist.component.spec.ts` → PASS.

- [ ] **Step 3: Commit**
```bash
git add src/app/features/roles-permisos/components/secciones-checklist.component.ts src/app/features/roles-permisos/components/secciones-checklist.component.spec.ts
git commit -m "feat(roles-permisos): componente checklist de secciones"
```

---

## Task 6: Componente `usuarios-picker` (dumb, buscable)

**Files:**
- Create: `src/app/features/roles-permisos/components/usuarios-picker.component.ts`
- Test: `src/app/features/roles-permisos/components/usuarios-picker.component.spec.ts`

- [ ] **Step 1: Componente** (input de búsqueda local + lista; resalta el seleccionado; emite `select`)

```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Usuario } from '@features/empresa/models/usuario.model';

@Component({
  selector: 'rp-usuarios-picker',
  standalone: true,
  imports: [FormsModule, InputTextModule, IconFieldModule, InputIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-iconField iconPosition="left" class="w-full">
      <p-inputIcon><i class="pi pi-search"></i></p-inputIcon>
      <input pInputText class="w-full" placeholder="Buscar usuario..."
        [ngModel]="query()" (ngModelChange)="query.set($event)" />
    </p-iconField>

    <ul class="rp-users">
      @for (u of filtered(); track u.id) {
        <li class="rp-users__item" [class.rp-users__item--active]="u.id === selectedId"
            (click)="select.emit(u.id)">
          <div class="rp-users__avatar">{{ initials(u) }}</div>
          <div class="rp-users__meta">
            <strong>{{ u.firstName }} {{ u.lastName }}</strong>
            <small class="ui-text-muted">{{ u.email }}</small>
          </div>
        </li>
      } @empty {
        <li class="rp-users__empty">Sin usuarios.</li>
      }
    </ul>
  `,
  styles: [`
    .rp-users { list-style: none; margin: var(--space-3) 0 0; padding: 0; max-height: 60vh; overflow-y: auto; }
    .rp-users__item { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
    .rp-users__item:hover { background: var(--surface-100, #f1f5f9); }
    .rp-users__item--active { background: var(--surface-200, #e2e8f0); }
    .rp-users__avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--brand-secondary); color:#fff; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; }
    .rp-users__meta { display: flex; flex-direction: column; }
    .rp-users__empty { padding: var(--space-4); color: var(--ds-text-muted); }
    .ui-text-muted { color: var(--ds-text-muted); }
  `],
})
export class UsuariosPickerComponent {
  private readonly _usuarios = signal<Usuario[]>([]);
  readonly query = signal('');

  @Input({ required: true }) set usuarios(value: Usuario[]) { this._usuarios.set(value ?? []); }
  @Input() selectedId: number | null = null;

  @Output() select = new EventEmitter<number>();

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this._usuarios();
    if (!q) return list;
    return list.filter((u) =>
      `${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase().includes(q),
    );
  });

  initials(u: Usuario): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  }
}
```

- [ ] **Step 2: Failing test**

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuariosPickerComponent } from './usuarios-picker.component';
import { Usuario } from '@features/empresa/models/usuario.model';

const u = (over: Partial<Usuario>): Usuario => ({
  id: 1, firstName: 'Ana', lastName: 'Lopez', username: 'alopez', email: 'a@l.com',
  phone: null, document: '1', isEmailVerified: true, isExternal: false, branch: null,
  isFirstLogin: false, active: true, roles: [], ...over,
});

describe('UsuariosPickerComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UsuariosPickerComponent], providers: [provideNoopAnimations()] });
  });

  it('filtra por texto', () => {
    const fixture = TestBed.createComponent(UsuariosPickerComponent);
    fixture.componentInstance.usuarios = [u({ id: 1, firstName: 'Ana' }), u({ id: 2, firstName: 'Beto', email: 'beto@x.com' })];
    fixture.detectChanges();
    fixture.componentInstance.query.set('beto');
    expect(fixture.componentInstance.filtered().map((x) => x.id)).toEqual([2]);
  });

  it('emite select con el id', () => {
    const fixture = TestBed.createComponent(UsuariosPickerComponent);
    let emitted: number | undefined;
    fixture.componentInstance.select.subscribe((id) => (emitted = id));
    fixture.componentInstance.select.emit(5);
    expect(emitted).toBe(5);
  });
});
```

Run: `npx vitest run src/app/features/roles-permisos/components/usuarios-picker.component.spec.ts` → PASS.

- [ ] **Step 3: Commit**
```bash
git add src/app/features/roles-permisos/components/usuarios-picker.component.ts src/app/features/roles-permisos/components/usuarios-picker.component.spec.ts
git commit -m "feat(roles-permisos): componente picker de usuarios"
```

---

## Task 7: Página master-detail + rutas + retiro de la página read-only

**Files:**
- Create: `src/app/features/roles-permisos/pages/roles-permisos.page.ts`
- Create: `src/app/features/roles-permisos/roles-permisos.routes.ts`
- Modify: `src/app/app.routes.ts` (repunta `/roles`, quita import de `RolesPage`)
- Modify: `src/app/features/empresa/empresa.routes.ts` (quita child `roles`)
- Delete: `src/app/features/empresa/pages/roles/roles.page.ts`
- Test: `src/app/features/roles-permisos/pages/roles-permisos.page.spec.ts`

- [ ] **Step 1: Página (smart, master-detail)**

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';

import { loadUsuarios } from '@features/empresa/store/empresa.actions';
import { selectAllUsuarios } from '@features/empresa/store/empresa.selectors';

import { UsuariosPickerComponent } from '../components/usuarios-picker.component';
import { SeccionesChecklistComponent } from '../components/secciones-checklist.component';
import { loadCatalog, selectUser, toggleSection, saveUserSections } from '../store/roles-permisos.actions';
import {
  selectCatalog, selectSelectedUserId, selectWorkingSet, selectIsDirty, selectRpSaving,
} from '../store/roles-permisos.selectors';
import { AccessSection } from '@core/access/access.model';

@Component({
  selector: 'rp-page',
  standalone: true,
  imports: [ButtonModule, UsuariosPickerComponent, SeccionesChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rp-header">
      <div>
        <h2 class="rp-title">Roles y permisos</h2>
        <small class="ui-text-muted">Elegí un usuario y marcá a qué secciones tiene acceso.</small>
      </div>
      <p-button label="Guardar" icon="pi pi-check" severity="primary"
        [disabled]="!isDirty() || selectedUserId() === null || saving()"
        [loading]="saving()"
        (onClick)="save()" />
    </div>

    <div class="rp-grid">
      <aside class="rp-grid__master">
        <rp-usuarios-picker [usuarios]="usuarios()" [selectedId]="selectedUserId()" (select)="onSelect($event)" />
      </aside>
      <section class="rp-grid__detail">
        @if (selectedUserId() === null) {
          <div class="ui-empty-state">
            <i class="pi pi-user"></i>
            <h4>Elegí un usuario</h4>
            <p>Seleccioná un usuario de la izquierda para ver y editar sus accesos.</p>
          </div>
        } @else {
          <rp-secciones-checklist [catalog]="catalog()" [workingSet]="workingSet()" (toggle)="onToggle($event)" />
        }
      </section>
    </div>
  `,
  styles: [`
    .rp-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
    .rp-title { margin: 0; }
    .rp-grid { display: grid; grid-template-columns: 320px 1fr; gap: var(--space-4); }
    @media (max-width: 768px) { .rp-grid { grid-template-columns: 1fr; } }
    .rp-grid__master, .rp-grid__detail { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding: var(--space-4); }
    .ui-text-muted { color: var(--ds-text-muted); }
    .ui-empty-state { padding: var(--space-8); text-align:center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class RolesPermisosPage implements OnInit {
  private readonly store = inject(Store);

  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly catalog = this.store.selectSignal(selectCatalog);
  readonly selectedUserId = this.store.selectSignal(selectSelectedUserId);
  readonly workingSet = this.store.selectSignal(selectWorkingSet);
  readonly isDirty = this.store.selectSignal(selectIsDirty);
  readonly saving = this.store.selectSignal(selectRpSaving);

  ngOnInit(): void {
    this.store.dispatch(loadUsuarios({ filters: { page: 0, size: 200, isActive: true } }));
    this.store.dispatch(loadCatalog());
  }

  onSelect(userId: number): void { this.store.dispatch(selectUser({ userId })); }
  onToggle(code: AccessSection): void { this.store.dispatch(toggleSection({ code })); }
  save(): void { this.store.dispatch(saveUserSections()); }
}
```

> Nota: la lista de usuarios se trae con `size: 200, isActive: true` (sin paginar para el picker). Si un tenant tiene >200 empleados, paginar/buscar server-side queda como mejora.

- [ ] **Step 2: Rutas del feature**

`src/app/features/roles-permisos/roles-permisos.routes.ts`:
```ts
import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

export const ROLES_PERMISOS_ROUTES: Routes = [
  {
    path: '',
    canMatch: [roleGuard('ADMINISTRADOR')],
    loadComponent: () =>
      import('./pages/roles-permisos.page').then((m) => m.RolesPermisosPage),
  },
];
```

- [ ] **Step 3: Repuntar `/roles` en `app.routes.ts`** — reemplazar el bloque actual de `roles` (que hace `loadComponent ... RolesPage`) por lazy del nuevo feature, y quitar cualquier import de `RolesPage` si existiera:
```ts
      {
        path: 'roles',
        loadChildren: () =>
          import('./features/roles-permisos/roles-permisos.routes').then((m) => m.ROLES_PERMISOS_ROUTES),
      },
```

- [ ] **Step 4: Quitar la child `roles` de `empresa.routes.ts`** — borrar la línea:
```ts
      { path: 'roles',       loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage) },
```

- [ ] **Step 5: Borrar la página read-only**

Run: `git rm src/app/features/empresa/pages/roles/roles.page.ts`
(Si hubiera un `roles.page.spec.ts`, borrarlo también.)

> El `RolesApiService` y las actions/selectors de roles del store `empresa` **se mantienen** (los usa el alta de Usuarios para `roleIds`). Solo se retira la página.

- [ ] **Step 6: Failing page smoke test**

`src/app/features/roles-permisos/pages/roles-permisos.page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { RolesPermisosPage } from './roles-permisos.page';
import { ROLES_PERMISOS_FEATURE_KEY, initialRolesPermisosState } from '../store/roles-permisos.state';
import { EMPRESA_FEATURE_KEY, initialEmpresaState } from '@features/empresa/store/empresa.state';
import { loadCatalog, selectUser, toggleSection, saveUserSections } from '../store/roles-permisos.actions';
import { loadUsuarios } from '@features/empresa/store/empresa.actions';

describe('RolesPermisosPage', () => {
  function setup(rp = initialRolesPermisosState) {
    TestBed.configureTestingModule({
      imports: [RolesPermisosPage],
      providers: [
        provideNoopAnimations(),
        provideMockStore({
          initialState: {
            [ROLES_PERMISOS_FEATURE_KEY]: rp,
            [EMPRESA_FEATURE_KEY]: initialEmpresaState,
          },
        }),
      ],
    });
    const fixture = TestBed.createComponent(RolesPermisosPage);
    const store = TestBed.inject(MockStore);
    return { fixture, store };
  }

  it('en init dispara loadUsuarios + loadCatalog', () => {
    const { fixture, store } = setup();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadCatalog());
    expect(spy).toHaveBeenCalledWith(loadUsuarios({ filters: { page: 0, size: 200, isActive: true } }));
  });

  it('onSelect/onToggle/save despachan las actions', () => {
    const { fixture, store } = setup();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSelect(7);
    fixture.componentInstance.onToggle('TURNOS');
    fixture.componentInstance.save();
    expect(spy).toHaveBeenCalledWith(selectUser({ userId: 7 }));
    expect(spy).toHaveBeenCalledWith(toggleSection({ code: 'TURNOS' }));
    expect(spy).toHaveBeenCalledWith(saveUserSections());
  });
});
```

Run: `npx vitest run src/app/features/roles-permisos/pages/roles-permisos.page.spec.ts` → PASS.

- [ ] **Step 7: Commit**
```bash
git add src/app/features/roles-permisos/pages src/app/features/roles-permisos/roles-permisos.routes.ts src/app/app.routes.ts src/app/features/empresa/empresa.routes.ts
git add -A   # incluye el git rm de roles.page.ts
git commit -m "feat(roles-permisos): pantalla master-detail; retira la pagina read-only de /roles"
```

---

## Task 8: Sidebar dirigido por secciones

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts` (tipos + `sectionKey`)
- Modify: `src/app/layout/sidebar/sidebar.component.ts` (`AccessRegistry` + filtro)
- Test: `src/app/layout/sidebar/sidebar.component.spec.ts`

- [ ] **Step 1: Tipos + mapeo en `sidebar.nav.ts`**

Agregar `sectionKey?: AccessSection` a la variante `link` y a los hijos del `expandable`, y mapear los items. Reemplazar el archivo por:
```ts
import { ModuleKey } from '@core/models/module-key.enum';
import { AccessSection } from '@core/access/access.model';

export interface NavBadge { text: string; tone: 'red' | 'green'; }

export type NavItem =
  | {
      kind: 'link';
      label: string;
      icon: string;
      path: string;
      badge?: NavBadge;
      chip?: string;
      moduleKey?: ModuleKey;
      roleKey?: string;
      sectionKey?: AccessSection;
    }
  | {
      kind: 'expandable';
      label: string;
      icon: string;
      children: { label: string; path: string; sectionKey?: AccessSection }[];
    };

export interface NavSection { label: string; items: NavItem[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Principal',
    items: [{ kind: 'link', label: 'Inicio', icon: 'pi pi-home', path: '/home' }],
  },
  {
    label: 'Core clínico',
    items: [
      {
        kind: 'expandable', label: 'Analítica', icon: 'pi pi-wave-pulse',
        children: [
          { label: 'Pre-analítica',  path: '/analitica/pre-analitica',  sectionKey: 'PREANALITICA' },
          { label: 'Analítica',      path: '/analitica/analitica',      sectionKey: 'ANALITICA' },
          { label: 'Post-analítica', path: '/analitica/post-analitica', sectionKey: 'POSTANALITICA' },
        ],
      },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      { kind: 'link', label: 'Turnos', icon: 'pi pi-calendar', path: '/turnos', moduleKey: ModuleKey.Turnos, sectionKey: 'TURNOS', badge: { text: '4', tone: 'red' } },
      { kind: 'link', label: 'Atención', icon: 'pi pi-users', path: '/analitica/atencion', sectionKey: 'ATENCION', badge: { text: '3', tone: 'green' } },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',          icon: 'pi pi-building', path: '/empresa', roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',   path: '/roles',   roleKey: 'ADMINISTRADOR' },
      { kind: 'link', label: 'Sucursales',       icon: 'pi pi-building', path: '/sucursales/configuracion', sectionKey: 'SUCURSALES' },
      { kind: 'link', label: 'Financiero',       icon: 'pi pi-wallet',   path: '/financiero', moduleKey: ModuleKey.Financiero, sectionKey: 'FINANCIERO' },
      { kind: 'link', label: 'Obras Sociales',   icon: 'pi pi-id-card',  path: '/obras-sociales', sectionKey: 'OBRAS_SOCIALES' },
    ],
  },
  {
    label: 'Servicios clínicos',
    items: [
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos', moduleKey: ModuleKey.Medicos, chip: 'Beta' },
      { kind: 'link', label: 'Stock e insumos',    icon: 'pi pi-box',   path: '/stock',   moduleKey: ModuleKey.Stock, sectionKey: 'STOCK', chip: 'Beta' },
      { kind: 'link', label: 'Portal paciente',    icon: 'pi pi-globe', path: '/portal',  moduleKey: ModuleKey.Portal, sectionKey: 'PORTAL' },
    ],
  },
];
```

> `Empresa` y `Roles y permisos` pasan a `roleKey: 'ADMINISTRADOR'` (gestión, solo admin). `Médicos derivantes` no tiene sección backend → queda solo con `moduleKey` (no se gatea por sección).

- [ ] **Step 2: Filtro en `sidebar.component.ts`**

Inyectar `AccessRegistry` y extender la visibilidad: los `expandable` ahora filtran sus hijos por `sectionKey`, y un item `link` con `sectionKey` se muestra si la sección está concedida. Reemplazar el import del nav + el bloque de visibilidad:
```ts
// agregar import:
import { AccessRegistry } from '@core/access/access-registry';
// ...
  private readonly access = inject(AccessRegistry);

  readonly visibleSections = computed<NavSection[]>(() =>
    NAV_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => this.applyChildVisibility(item))
          .filter((item) => this.isItemVisible(item)),
      }))
      .filter((section) => section.items.length > 0),
  );

  /** Para expandables: filtra hijos por sectionKey. Para links: devuelve el item igual. */
  private applyChildVisibility(item: NavItem): NavItem {
    if (item.kind !== 'expandable') return item;
    return {
      ...item,
      children: item.children.filter((c) => !c.sectionKey || this.access.has(c.sectionKey)),
    };
  }

  protected isItemVisible(item: NavItem): boolean {
    if (item.kind === 'expandable') return item.children.length > 0;
    if (item.moduleKey && !this.registry.isActive(item.moduleKey)) return false;
    if (item.roleKey && !this.token.getRoles().includes(item.roleKey)) return false;
    if (item.sectionKey && !this.access.has(item.sectionKey)) return false;
    return true;
  }
```

> Para `link` con `moduleKey` **y** `sectionKey` (Turnos, Financiero, Stock, Portal): se exige ambos. Como `/me` ya devuelve solo secciones de módulos activos, en la práctica `sectionKey` ya implica módulo activo para el usuario; el `moduleKey` queda como check redundante de tenant y no molesta.

- [ ] **Step 3: Failing test**

`src/app/layout/sidebar/sidebar.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { SidebarComponent } from './sidebar.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { AccessRegistry } from '@core/access/access-registry';
import { TokenService } from '@core/auth/token.service';

describe('SidebarComponent visibility', () => {
  function setup(sections: string[], roles: string[]) {
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideMockStore({ initialState: {} }),
        { provide: ModuleRegistry, useValue: { isActive: () => true } },
        { provide: AccessRegistry, useValue: { has: (s: string) => sections.includes(s) } },
        { provide: TokenService, useValue: { getRoles: () => roles } },
      ],
    });
    return TestBed.createComponent(SidebarComponent).componentInstance;
  }

  it('muestra Turnos solo si la seccion TURNOS esta concedida', () => {
    const withTurnos = setup(['TURNOS'], []);
    const sects = withTurnos.visibleSections();
    const core = sects.find((s) => s.label === 'Core clínico');
    expect(core?.items.some((i) => i.label === 'Turnos')).toBe(true);

    const withoutTurnos = setup([], []);
    const core2 = withoutTurnos.visibleSections().find((s) => s.label === 'Core clínico');
    expect(core2?.items.some((i) => i.label === 'Turnos') ?? false).toBe(false);
  });

  it('Roles y permisos visible solo para ADMINISTRADOR', () => {
    const admin = setup([], ['ADMINISTRADOR']);
    expect(admin.visibleSections().some((s) => s.items.some((i) => i.label === 'Roles y permisos'))).toBe(true);
    const noAdmin = setup([], []);
    expect(noAdmin.visibleSections().some((s) => s.items.some((i) => i.label === 'Roles y permisos'))).toBe(false);
  });

  it('Analítica filtra sus hijos por seccion', () => {
    const onlyPre = setup(['PREANALITICA'], []);
    const core = onlyPre.visibleSections().find((s) => s.label === 'Core clínico');
    const analitica = core?.items.find((i) => i.label === 'Analítica');
    expect(analitica?.kind).toBe('expandable');
    if (analitica?.kind === 'expandable') {
      expect(analitica.children.map((c) => c.label)).toEqual(['Pre-analítica']);
    }
  });
});
```

Run: `npx vitest run src/app/layout/sidebar/sidebar.component.spec.ts` → PASS.

- [ ] **Step 4: Commit**
```bash
git add src/app/layout/sidebar
git commit -m "feat(sidebar): visibilidad dirigida por secciones (/me/access-sections)"
```

---

## Task 9: `sectionGuard` + aplicación en rutas

**Files:**
- Create: `src/app/core/guards/section.guard.ts`
- Modify: `src/app/app.routes.ts` (turnos, financiero, sucursales)
- Modify: `src/app/features/analitica/analitica.routes.ts` (sub-rutas)
- Test: `src/app/core/guards/section.guard.spec.ts`

- [ ] **Step 1: Guard** (espeja `moduleActiveGuard`: espera a que access esté `loaded`, luego chequea)

```ts
import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs/operators';
import { AccessSection } from '@core/access/access.model';
import { selectAccessState } from '@core/access/store/access.selectors';

export const sectionGuard = (section: AccessSection): CanMatchFn =>
  () => {
    const store = inject(Store);
    const router = inject(Router);

    return store.select(selectAccessState).pipe(
      filter((s) => s.loaded),
      take(1),
      map((s) => (s.sections.includes(section) ? true : router.createUrlTree(['/home']))),
    );
  };
```

- [ ] **Step 2: Failing test**

`src/app/core/guards/section.guard.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { sectionGuard } from './section.guard';
import { ACCESS_FEATURE_KEY, initialAccessState } from '@core/access/store/access.state';

describe('sectionGuard', () => {
  function run(section: string, state: Partial<typeof initialAccessState>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { [ACCESS_FEATURE_KEY]: { ...initialAccessState, ...state } } }),
      ],
    });
    return TestBed.runInInjectionContext(() => sectionGuard(section as any)([] as any, [] as any));
  }

  it('permite si la seccion esta concedida y access loaded', async () => {
    const result = run('TURNOS', { loaded: true, sections: ['TURNOS'] as any });
    const value = isObservable(result) ? await firstValueFrom(result) : result;
    expect(value).toBe(true);
  });

  it('redirige a /home si falta la seccion', async () => {
    const result = run('TURNOS', { loaded: true, sections: [] as any });
    const value = isObservable(result) ? await firstValueFrom(result) : result;
    expect(value instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(value as UrlTree)).toBe('/home');
  });
});
```

Run: `npx vitest run src/app/core/guards/section.guard.spec.ts` → PASS.

- [ ] **Step 3: Aplicar en `app.routes.ts`** — agregar `sectionGuard` al `canMatch` de las rutas con sección 1:1 (combinando con el `moduleActiveGuard` existente donde aplique):
```ts
import { sectionGuard } from '@core/guards/section.guard';
// ...
      {
        path: 'turnos',
        canMatch: [moduleActiveGuard(ModuleKey.Turnos), sectionGuard('TURNOS')],
        loadChildren: () => import('./features/turnos/turnos.routes').then((m) => m.TURNOS_ROUTES),
      },
      {
        path: 'financiero',
        canMatch: [moduleActiveGuard(ModuleKey.Financiero), sectionGuard('FINANCIERO')],
        loadChildren: () => import('./features/financiero/financiero.routes').then((m) => m.FINANCIERO_ROUTES),
      },
      {
        path: 'sucursales',
        canMatch: [sectionGuard('SUCURSALES')],
        loadChildren: () => import('./features/sucursales/sucursales.routes').then((m) => m.SUCURSALES_ROUTES),
      },
```

- [ ] **Step 4: Aplicar en `analitica.routes.ts`** — agregar `canMatch: [sectionGuard(...)]` a las sub-rutas: `pre-analitica`→`PREANALITICA`, `analitica`→`ANALITICA`, `post-analitica`→`POSTANALITICA`, `atencion`→`ATENCION`. (Leer el archivo y mapear cada child a su `sectionGuard`; importar `sectionGuard` arriba.) Pacientes: agregar `canMatch: [sectionGuard('PACIENTES')]` a la ruta `pacientes` en `app.routes.ts`.

> No gatear con `sectionGuard` rutas que no son secciones (home, empresa, roles, obras-sociales si no tiene su propio módulo). Empresa/Roles ya están protegidos por `roleGuard('ADMINISTRADOR')` en sus propias rutas/nav.

- [ ] **Step 5: Commit**
```bash
git add src/app/core/guards/section.guard.ts src/app/core/guards/section.guard.spec.ts src/app/app.routes.ts src/app/features/analitica/analitica.routes.ts
git commit -m "feat(access): sectionGuard por-usuario en rutas gateadas"
```

---

## Task 10: Verificación final

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos los specs verdes (incluye los nuevos de access, roles-permisos, sidebar, guard).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: BUILD OK, sin errores de tipos (verifica que el retiro de `RolesPage` no dejó imports colgados y que `AccessSection` resuelve por `@core/access/access.model`).

- [ ] **Step 3: Smoke manual (opcional, con backend levantado)**

Levantar BE+FE con el launcher (`start-worktree.ps1`, BE `permisos`, FE `roles-permisos`). Loguear como ADMINISTRADOR → `/roles` muestra la pantalla nueva; elegir un usuario, marcar secciones, Guardar (toast). Loguear como el empleado → el sidebar muestra solo sus secciones.

- [ ] **Step 4: Commit final (si hubo ajustes)**
```bash
git add -A
git commit -m "chore(roles-permisos): verificacion final frontend"
```

---

## Self-Review (cobertura del spec)

| Requisito del spec | Task |
|---|---|
| §5.1 modelo `AccessSection`/`SectionResponse` | Task 1 (en `core/access`) |
| §5.2 API service (3 endpoints admin) | Task 3 |
| §5.3 slice NgRx (catálogo + working set + dirty) | Task 4 |
| §5.4 pantalla master-detail | Task 7 (+ componentes Task 5/6) |
| §5.5 rutas + retiro read-only | Task 7 |
| §6 `core/access` (carga `/me` al login) | Task 1 + 2 |
| §7 sidebar por `sectionKey` | Task 8 |
| §8 `sectionGuard` | Task 9 |
| §9 errores español/no-leak (toasts) | Task 4 (globalFailureToast$) |
| §10 tests (reducer/effects/selectors/guard/sidebar/page) | Tasks 1,2,4,5,6,7,8,9 |

**Notas de consistencia:** `AccessSection`/`SectionResponse` se definen una sola vez en `@core/access/access.model` y se importan desde el feature (dirección feature→core). El catálogo viaja como `SectionResponse[]`; los sets de usuario/working/me se guardan como `AccessSection[]` (codes) — los effects mapean `.map(s => s.code)` en `loadUserSections`/`loadMySections`. La pantalla trae usuarios con `size: 200` (sin paginar) — paginación server-side del picker queda como follow-up si un tenant supera ~200 empleados.
