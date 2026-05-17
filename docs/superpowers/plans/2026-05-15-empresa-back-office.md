# Empresa — Back-office del tenant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la pantalla `/empresa` con tabs Usuarios (ABM completo + invitación + toggle status), Roles (read-only), White-label (form + preview en vivo), Módulos (toggles), más placeholders para Fiscal y SMTP/Docs.

**Architecture:** Una única feature `empresa` con un único `EmpresaState` plano que contiene los 4 dominios (`usuarios`, `roles`, `whiteLabel`, `modulos`) más `pending` y `error` compartidos. NgRx clásico (createAction + createReducer). Componentes standalone con `OnPush` y signals. PrimeNG v17 para UI. Reactive Forms expuestos como signals via `toSignal`. Drawer (`p-drawer`) para crear/editar usuario; `p-dialog` para confirmaciones.

**Tech Stack:** Angular 21, NgRx 21, PrimeNG 21, Tailwind v4, RxJS 7, vitest 4.

**Convenciones aplicadas:**
- `ngrx-backend-request`: shape `{ data, pending, error }`, `pending` único, sin `@ngrx/entity`, sin `loaded`, mutations pessimistic, `catchError` dentro del operador.
- `angular-conventions`: estructura de carpetas, signals para UI local, `OnPush`, Reactive Forms con `toSignal`.
- `laboratory-ui`: PrimeNG, drawer `width: 50vw min 480px max 720px`, modal de confirm, control flow nuevo (`@if`/`@for`), tokens del DS.

**Spec de referencia:** `docs/superpowers/specs/2026-05-15-empresa-back-office-design.md`.

**Endpoint root del back:** definir el `tenantId` en runtime leyendo `selectTenantConfig` (asumimos que `TenantConfig.id` existe; si el campo se llama distinto, ajustar Task 6 y Task 8).

---

## File Structure

### Archivos a CREAR

```
features/empresa/
├── models/
│   ├── usuario.model.ts                            ← NEW
│   ├── rol.model.ts                                ← NEW
│   ├── white-label.model.ts                        ← NEW
│   ├── modulo.model.ts                             ← NEW
│   └── paginated.model.ts                          ← NEW (PaginatedResponse<T>)
├── services/
│   ├── usuarios-api.service.ts                     ← NEW
│   ├── roles-api.service.ts                        ← NEW
│   ├── auth-admin-api.service.ts                   ← NEW (resend, regenerate token)
│   ├── white-label-api.service.ts                  ← NEW
│   └── modulos-api.service.ts                      ← NEW
├── pages/
│   ├── usuarios/
│   │   ├── usuarios.page.ts                        ← NEW
│   │   ├── usuarios.page.html                      ← NEW
│   │   ├── usuarios.page.scss                      ← NEW
│   │   ├── components/
│   │   │   ├── usuarios-filtros.component.ts       ← NEW (+ html)
│   │   │   ├── usuarios-table.component.ts         ← NEW (+ html)
│   │   │   ├── usuario-form-drawer.component.ts    ← NEW (+ html)
│   │   │   └── toggle-status-dialog.component.ts   ← NEW (+ html)
│   ├── roles/
│   │   ├── roles.page.ts                           ← NEW (+ html)
│   ├── white-label/
│   │   ├── white-label.page.ts                     ← NEW (+ html + scss)
│   │   └── components/
│   │       └── white-label-preview.component.ts    ← NEW (+ html + scss)
│   ├── modulos/
│   │   ├── modulos.page.ts                         ← NEW (+ html + scss)
│   │   └── components/
│   │       └── modulo-card.component.ts            ← NEW (+ html)
│   ├── fiscal/
│   │   └── fiscal.page.ts                          ← NEW
│   └── smtp-docs/
│       └── smtp-docs.page.ts                       ← NEW
└── shared/
    └── empty-state-placeholder.component.ts        ← NEW (+ html + scss)
```

### Archivos a MODIFICAR

```
features/empresa/
├── empresa.routes.ts                               ← reemplazar paths a *.page.ts
├── empresa-dashboard/
│   └── empresa-dashboard.component.ts              ← layout con tabs (sin botón global)
├── store/
│   ├── empresa.state.ts                            ← agregar whiteLabel, modulos, paginación de usuarios
│   ├── empresa.actions.ts                          ← reemplazar todo el contenido
│   ├── empresa.reducer.ts                          ← reemplazar todo el contenido
│   ├── empresa.effects.ts                          ← reemplazar todo el contenido
│   └── empresa.selectors.ts                        ← reemplazar todo el contenido
└── services/
    └── empresa.service.ts                          ← borrar (reemplazado por los 5 services)
```

### Archivos a BORRAR

```
features/empresa/
├── models/empresa.model.ts                         ← reemplazado por modelos por dominio
└── services/empresa.service.ts                     ← reemplazado por 5 services finos
```

---

## Task 0: Preparación

**Goal:** branch nueva, dev server corriendo, baseline verde.

- [ ] **Step 0.1: Crear branch**

```bash
cd FRONTEND-LABORATORIO
git checkout -b feat/empresa-back-office
```

- [ ] **Step 0.2: Instalar deps si hace falta**

```bash
npm install
```

- [ ] **Step 0.3: Verificar baseline de tests pasa**

```bash
npx vitest run
```

Expected: tests existentes pasan. Si fallan tests no relacionados con empresa, abrir issue separado y NO continuar este plan hasta que el baseline esté verde.

- [ ] **Step 0.4: Verificar build pasa**

```bash
npm run build
```

Expected: build OK.

---

## Task 1: Modelos TypeScript

**Files:**
- Create: `src/app/features/empresa/models/usuario.model.ts`
- Create: `src/app/features/empresa/models/rol.model.ts`
- Create: `src/app/features/empresa/models/white-label.model.ts`
- Create: `src/app/features/empresa/models/modulo.model.ts`
- Create: `src/app/features/empresa/models/paginated.model.ts`

- [ ] **Step 1.1: Crear `paginated.model.ts`**

```ts
// src/app/features/empresa/models/paginated.model.ts
export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

- [ ] **Step 1.2: Crear `rol.model.ts`**

```ts
// src/app/features/empresa/models/rol.model.ts
export interface Rol {
  id: number;
  code: string;
  description: string;
  hierarchy: number;
}
```

- [ ] **Step 1.3: Crear `usuario.model.ts`**

```ts
// src/app/features/empresa/models/usuario.model.ts
import { Rol } from './rol.model';

export interface Usuario {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string | null;
  document: string;
  isEmailVerified: boolean;
  isExternal: boolean;
  branch: number | null;
  isFirstLogin: boolean;
  active: boolean;
  roles: Rol[];
}

export interface CrearUsuarioPayload {
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  username: string;
  roleIds: number[];
}

export interface ActualizarUsuarioPayload extends CrearUsuarioPayload {}

export interface BuscarUsuariosParams {
  search?: string;
  isActive?: boolean;
  roleIds?: number[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface CrearUsuarioRespuesta {
  user: Usuario;
  firstLoginToken: string | null;
}

export interface CambiarEstadoPayload {
  isActive: boolean;
  reason: string;
}
```

- [ ] **Step 1.4: Crear `white-label.model.ts`**

```ts
// src/app/features/empresa/models/white-label.model.ts
export interface WhiteLabel {
  id: number | null;
  targetTenantId: number;
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  active: boolean;
}

export interface GuardarWhiteLabelPayload {
  systemName: string;
  primaryColor: string;
  secondaryColor: string;
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
}
```

- [ ] **Step 1.5: Crear `modulo.model.ts`**

```ts
// src/app/features/empresa/models/modulo.model.ts
export type ModuleCode = 'PORTAL' | 'TURNOS' | 'FINANCIERO' | 'MEDICOS' | 'STOCK';

export interface ModuloTenant {
  moduleCode: ModuleCode;
  enabled: boolean;
}

export interface ModuloMeta {
  code: ModuleCode;
  label: string;
  description: string;
  icon: string;          // class de PrimeIcons
}

export const MODULO_META: Record<ModuleCode, ModuloMeta> = {
  PORTAL: {
    code: 'PORTAL',
    label: 'Portal de pacientes',
    description: 'Acceso público para que los pacientes consulten estudios y reserven turnos.',
    icon: 'pi pi-globe',
  },
  TURNOS: {
    code: 'TURNOS',
    label: 'Turnos',
    description: 'Gestión de agenda, calendario y reserva de turnos.',
    icon: 'pi pi-calendar',
  },
  FINANCIERO: {
    code: 'FINANCIERO',
    label: 'Financiero',
    description: 'Facturación, cobros y obras sociales.',
    icon: 'pi pi-wallet',
  },
  MEDICOS: {
    code: 'MEDICOS',
    label: 'Médicos derivantes',
    description: 'ABM de médicos que derivan estudios.',
    icon: 'pi pi-id-card',
  },
  STOCK: {
    code: 'STOCK',
    label: 'Stock',
    description: 'Inventario de insumos y reactivos.',
    icon: 'pi pi-box',
  },
};
```

- [ ] **Step 1.6: Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 1.7: Commit**

```bash
git add src/app/features/empresa/models/
git commit -m "feat(empresa): add TS models for usuarios, roles, white-label, modulos"
```

---

## Task 2: Borrar service y modelo viejos

**Files:**
- Delete: `src/app/features/empresa/services/empresa.service.ts`
- Delete: `src/app/features/empresa/models/empresa.model.ts`

> Antes de borrar verificá que nada los importa fuera del propio store de empresa (los actions/reducer/effects/selectors actuales los importan, pero los reescribimos en Tasks 3-9).

- [ ] **Step 2.1: Buscar referencias externas**

```bash
npx grep -r "from.*empresa/services/empresa.service" src/app
npx grep -r "from.*empresa/models/empresa.model" src/app
```

Expected: solo aparece dentro de `src/app/features/empresa/store/`. Si aparece en otro lado, frenar y avisar.

- [ ] **Step 2.2: Borrar archivos**

```bash
rm src/app/features/empresa/services/empresa.service.ts
rm src/app/features/empresa/models/empresa.model.ts
```

> No hace falta commit acá; el siguiente task reemplaza los imports y mete todo en un commit consistente.

---

## Task 3: Reemplazar `empresa.state.ts`

**Files:**
- Modify: `src/app/features/empresa/store/empresa.state.ts`

- [ ] **Step 3.1: Reemplazar contenido del archivo**

```ts
// src/app/features/empresa/store/empresa.state.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Usuario, BuscarUsuariosParams } from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { WhiteLabel } from '../models/white-label.model';
import { ModuloTenant } from '../models/modulo.model';

export interface EmpresaState {
  // Usuarios
  usuarios: Usuario[];
  usuariosPage: number;
  usuariosSize: number;
  usuariosTotalElements: number;
  usuariosTotalPages: number;
  usuariosFilters: BuscarUsuariosParams;
  usuarioSelected: Usuario | null;

  // Roles
  roles: Rol[];

  // White label
  whiteLabel: WhiteLabel | null;

  // Modulos
  modulos: ModuloTenant[];

  // Compartidos
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialEmpresaState: EmpresaState = {
  usuarios: [],
  usuariosPage: 0,
  usuariosSize: 20,
  usuariosTotalElements: 0,
  usuariosTotalPages: 0,
  usuariosFilters: { page: 0, size: 20, isActive: undefined },
  usuarioSelected: null,

  roles: [],
  whiteLabel: null,
  modulos: [],

  pending: false,
  error: null,
};

export const EMPRESA_FEATURE_KEY = 'empresa';
```

- [ ] **Step 3.2: Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: errores SOLO en `empresa.actions.ts`, `empresa.reducer.ts`, `empresa.effects.ts`, `empresa.selectors.ts` (que aún importan tipos viejos). Esos se arreglan en los próximos tasks.

---

## Task 4: Reemplazar `empresa.actions.ts`

**Files:**
- Modify: `src/app/features/empresa/store/empresa.actions.ts`

- [ ] **Step 4.1: Reemplazar contenido completo del archivo**

```ts
// src/app/features/empresa/store/empresa.actions.ts
import { HttpErrorResponse } from '@angular/common/http';
import { createAction, props } from '@ngrx/store';
import {
  Usuario,
  BuscarUsuariosParams,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  CrearUsuarioRespuesta,
  CambiarEstadoPayload,
} from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { PaginatedResponse } from '../models/paginated.model';
import { WhiteLabel, GuardarWhiteLabelPayload } from '../models/white-label.model';
import { ModuloTenant, ModuleCode } from '../models/modulo.model';

// =========================
// Usuarios — search/list
// =========================
export const loadUsuarios = createAction(
  '[Empresa Usuarios Page] Load Usuarios',
  props<{ filters: BuscarUsuariosParams }>(),
);
export const loadUsuariosSuccess = createAction(
  '[Empresa API] Load Usuarios Success',
  props<{ result: PaginatedResponse<Usuario> }>(),
);
export const loadUsuariosFailure = createAction(
  '[Empresa API] Load Usuarios Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setUsuariosFilters = createAction(
  '[Empresa Usuarios Page] Set Filters',
  props<{ patch: Partial<BuscarUsuariosParams> }>(),
);

// =========================
// Usuarios — detalle
// =========================
export const loadUsuario = createAction(
  '[Empresa Usuarios Page] Load Usuario',
  props<{ id: number }>(),
);
export const loadUsuarioSuccess = createAction(
  '[Empresa API] Load Usuario Success',
  props<{ usuario: Usuario }>(),
);
export const loadUsuarioFailure = createAction(
  '[Empresa API] Load Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearUsuarioSelected = createAction(
  '[Empresa Usuarios Page] Clear Selected',
);

// =========================
// Usuarios — add (submit, exhaustMap)
// =========================
export const addUsuario = createAction(
  '[Empresa Usuario Form] Add Usuario',
  props<{ payload: CrearUsuarioPayload }>(),
);
export const addUsuarioSuccess = createAction(
  '[Empresa API] Add Usuario Success',
  props<{ result: CrearUsuarioRespuesta }>(),
);
export const addUsuarioFailure = createAction(
  '[Empresa API] Add Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — update (submit, exhaustMap)
// =========================
export const updateUsuario = createAction(
  '[Empresa Usuario Form] Update Usuario',
  props<{ id: number; payload: ActualizarUsuarioPayload }>(),
);
export const updateUsuarioSuccess = createAction(
  '[Empresa API] Update Usuario Success',
  props<{ usuario: Usuario }>(),
);
export const updateUsuarioFailure = createAction(
  '[Empresa API] Update Usuario Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — toggle status (concatMap)
// =========================
export const toggleUsuarioStatus = createAction(
  '[Empresa Toggle Status Dialog] Toggle Status',
  props<{ id: number; payload: CambiarEstadoPayload }>(),
);
export const toggleUsuarioStatusSuccess = createAction(
  '[Empresa API] Toggle Status Success',
  props<{ usuario: Usuario }>(),
);
export const toggleUsuarioStatusFailure = createAction(
  '[Empresa API] Toggle Status Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Usuarios — auth admin (concatMap)
// =========================
export const resendUsuarioInvite = createAction(
  '[Empresa Usuarios Page] Resend Invite',
  props<{ userId: number }>(),
);
export const resendUsuarioInviteSuccess = createAction(
  '[Empresa API] Resend Invite Success',
  props<{ userId: number }>(),
);
export const resendUsuarioInviteFailure = createAction(
  '[Empresa API] Resend Invite Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const regenerateFirstLoginToken = createAction(
  '[Empresa Usuarios Page] Regenerate First Login Token',
  props<{ userId: number }>(),
);
export const regenerateFirstLoginTokenSuccess = createAction(
  '[Empresa API] Regenerate First Login Token Success',
  props<{ userId: number; token: string }>(),
);
export const regenerateFirstLoginTokenFailure = createAction(
  '[Empresa API] Regenerate First Login Token Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Roles — load
// =========================
export const loadRoles = createAction('[Empresa Roles Page] Load Roles');
export const loadRolesSuccess = createAction(
  '[Empresa API] Load Roles Success',
  props<{ roles: Rol[] }>(),
);
export const loadRolesFailure = createAction(
  '[Empresa API] Load Roles Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// White label — load / save
// =========================
export const loadWhiteLabel = createAction('[Empresa WhiteLabel Page] Load WhiteLabel');
export const loadWhiteLabelSuccess = createAction(
  '[Empresa API] Load WhiteLabel Success',
  props<{ whiteLabel: WhiteLabel }>(),
);
export const loadWhiteLabelFailure = createAction(
  '[Empresa API] Load WhiteLabel Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const saveWhiteLabel = createAction(
  '[Empresa WhiteLabel Form] Save WhiteLabel',
  props<{ payload: GuardarWhiteLabelPayload }>(),
);
export const saveWhiteLabelSuccess = createAction(
  '[Empresa API] Save WhiteLabel Success',
  props<{ whiteLabel: WhiteLabel }>(),
);
export const saveWhiteLabelFailure = createAction(
  '[Empresa API] Save WhiteLabel Failure',
  props<{ error: HttpErrorResponse }>(),
);

// =========================
// Modulos — load / toggle
// =========================
export const loadModulos = createAction('[Empresa Modulos Page] Load Modulos');
export const loadModulosSuccess = createAction(
  '[Empresa API] Load Modulos Success',
  props<{ modulos: ModuloTenant[] }>(),
);
export const loadModulosFailure = createAction(
  '[Empresa API] Load Modulos Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const toggleModulo = createAction(
  '[Empresa Modulos Page] Toggle Modulo',
  props<{ code: ModuleCode; enable: boolean }>(),
);
export const toggleModuloSuccess = createAction(
  '[Empresa API] Toggle Modulo Success',
  props<{ code: ModuleCode; enable: boolean }>(),
);
export const toggleModuloFailure = createAction(
  '[Empresa API] Toggle Modulo Failure',
  props<{ error: HttpErrorResponse }>(),
);
```

---

## Task 5: Reemplazar `empresa.selectors.ts`

**Files:**
- Modify: `src/app/features/empresa/store/empresa.selectors.ts`

- [ ] **Step 5.1: Reemplazar contenido**

```ts
// src/app/features/empresa/store/empresa.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EmpresaState, EMPRESA_FEATURE_KEY } from './empresa.state';

export const selectEmpresaState =
  createFeatureSelector<EmpresaState>(EMPRESA_FEATURE_KEY);

export const selectEmpresaPending = createSelector(
  selectEmpresaState,
  (state) => state.pending,
);
export const selectEmpresaError = createSelector(
  selectEmpresaState,
  (state) => state.error,
);

// Usuarios
export const selectAllUsuarios = createSelector(
  selectEmpresaState,
  (state) => state.usuarios,
);
export const selectUsuariosFilters = createSelector(
  selectEmpresaState,
  (state) => state.usuariosFilters,
);
export const selectUsuariosTotalElements = createSelector(
  selectEmpresaState,
  (state) => state.usuariosTotalElements,
);
export const selectUsuariosTotalPages = createSelector(
  selectEmpresaState,
  (state) => state.usuariosTotalPages,
);
export const selectUsuariosPage = createSelector(
  selectEmpresaState,
  (state) => state.usuariosPage,
);
export const selectUsuariosSize = createSelector(
  selectEmpresaState,
  (state) => state.usuariosSize,
);
export const selectUsuarioSelected = createSelector(
  selectEmpresaState,
  (state) => state.usuarioSelected,
);

// Roles
export const selectAllRoles = createSelector(
  selectEmpresaState,
  (state) => state.roles,
);

// White label
export const selectWhiteLabel = createSelector(
  selectEmpresaState,
  (state) => state.whiteLabel,
);

// Modulos
export const selectAllModulos = createSelector(
  selectEmpresaState,
  (state) => state.modulos,
);
```

---

## Task 6: Crear los 5 servicios HTTP

**Files:**
- Create: `src/app/features/empresa/services/usuarios-api.service.ts`
- Create: `src/app/features/empresa/services/roles-api.service.ts`
- Create: `src/app/features/empresa/services/auth-admin-api.service.ts`
- Create: `src/app/features/empresa/services/white-label-api.service.ts`
- Create: `src/app/features/empresa/services/modulos-api.service.ts`

> **Decisión sobre `tenantId`:** los services de white-label y modulos lo leen del `tenant.store` (`selectTenantConfig`). Asumimos que `TenantConfig` tiene un campo `id: number`. Si el campo se llama distinto (ej `tenantId`), cambiar el `getTenantId()` interno.

- [ ] **Step 6.1: `usuarios-api.service.ts`**

```ts
// src/app/features/empresa/services/usuarios-api.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Usuario,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
  CrearUsuarioRespuesta,
  CambiarEstadoPayload,
  BuscarUsuariosParams,
} from '../models/usuario.model';
import { PaginatedResponse } from '../models/paginated.model';

@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/user';

  search(params: BuscarUsuariosParams): Observable<PaginatedResponse<Usuario>> {
    let httpParams = new HttpParams()
      .set('isExternal', 'false')
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive);
    if (params.roleIds && params.roleIds.length > 0) {
      for (const id of params.roleIds) httpParams = httpParams.append('roleIds', id);
    }
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);

    return this.http.get<PaginatedResponse<Usuario>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  getById(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.baseUrl}/${id}`);
  }

  create(payload: CrearUsuarioPayload): Observable<CrearUsuarioRespuesta> {
    return this.http.post<CrearUsuarioRespuesta>(`${this.baseUrl}/internal`, payload);
  }

  update(id: number, payload: ActualizarUsuarioPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.baseUrl}/${id}`, payload);
  }

  toggleStatus(id: number, payload: CambiarEstadoPayload): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.baseUrl}/${id}/status`, payload);
  }
}
```

- [ ] **Step 6.2: `roles-api.service.ts`**

```ts
// src/app/features/empresa/services/roles-api.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Rol } from '../models/rol.model';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/role';

  list(): Observable<Rol[]> {
    return this.http.get<Rol[]>(`${this.baseUrl}/`);
  }
}
```

- [ ] **Step 6.3: `auth-admin-api.service.ts`**

```ts
// src/app/features/empresa/services/auth-admin-api.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  resendEmailVerification(userId: number): Observable<void> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<void>(`${this.baseUrl}/email/resend`, null, { params });
  }

  generateFirstLoginToken(userId: number): Observable<string> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post(`${this.baseUrl}/first-login/generate-token`, null, {
      params,
      responseType: 'text',
    });
  }
}
```

- [ ] **Step 6.4: `white-label-api.service.ts`**

```ts
// src/app/features/empresa/services/white-label-api.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { GuardarWhiteLabelPayload, WhiteLabel } from '../models/white-label.model';

@Injectable({ providedIn: 'root' })
export class WhiteLabelApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  get(): Observable<WhiteLabel> {
    return this.withTenantId((id) =>
      this.http.get<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`),
    );
  }

  save(payload: GuardarWhiteLabelPayload): Observable<WhiteLabel> {
    return this.withTenantId((id) =>
      this.http.put<WhiteLabel>(`/api/v1/saas-admin/tenants/${id}/white-label`, payload),
    );
  }

  private withTenantId<T>(fn: (id: number) => Observable<T>): Observable<T> {
    return this.store.select(selectTenantConfig).pipe(
      take(1),
      switchMap((config) => {
        if (!config) throw new Error('Tenant context not loaded');
        return fn((config as unknown as { id: number }).id);
      }),
    );
  }
}
```

- [ ] **Step 6.5: `modulos-api.service.ts`**

```ts
// src/app/features/empresa/services/modulos-api.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, switchMap, take } from 'rxjs';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { ModuleCode, ModuloTenant } from '../models/modulo.model';

@Injectable({ providedIn: 'root' })
export class ModulosApiService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(Store);

  list(): Observable<ModuloTenant[]> {
    return this.withTenantId((id) =>
      this.http.get<ModuloTenant[]>(`/api/v1/saas-admin/tenants/${id}/modules`),
    );
  }

  toggle(code: ModuleCode, enable: boolean): Observable<void> {
    return this.withTenantId((id) =>
      this.http.put<void>(`/api/v1/saas-admin/tenants/${id}/modules/${code}`, { enable }),
    );
  }

  private withTenantId<T>(fn: (id: number) => Observable<T>): Observable<T> {
    return this.store.select(selectTenantConfig).pipe(
      take(1),
      switchMap((config) => {
        if (!config) throw new Error('Tenant context not loaded');
        return fn((config as unknown as { id: number }).id);
      }),
    );
  }
}
```

- [ ] **Step 6.6: Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: errores aún solo en reducer/effects (los arreglamos a continuación).

---

## Task 7: Reemplazar `empresa.reducer.ts`

**Files:**
- Modify: `src/app/features/empresa/store/empresa.reducer.ts`

- [ ] **Step 7.1: Reemplazar contenido completo**

```ts
// src/app/features/empresa/store/empresa.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { EmpresaState, initialEmpresaState } from './empresa.state';
import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  loadUsuario, loadUsuarioSuccess, loadUsuarioFailure, clearUsuarioSelected,
  addUsuario, addUsuarioSuccess, addUsuarioFailure,
  updateUsuario, updateUsuarioSuccess, updateUsuarioFailure,
  toggleUsuarioStatus, toggleUsuarioStatusSuccess, toggleUsuarioStatusFailure,
  resendUsuarioInvite, resendUsuarioInviteSuccess, resendUsuarioInviteFailure,
  regenerateFirstLoginToken, regenerateFirstLoginTokenSuccess, regenerateFirstLoginTokenFailure,
  loadRoles, loadRolesSuccess, loadRolesFailure,
  loadWhiteLabel, loadWhiteLabelSuccess, loadWhiteLabelFailure,
  saveWhiteLabel, saveWhiteLabelSuccess, saveWhiteLabelFailure,
  loadModulos, loadModulosSuccess, loadModulosFailure,
  toggleModulo, toggleModuloSuccess, toggleModuloFailure,
} from './empresa.actions';

const setPending = (state: EmpresaState): EmpresaState => ({
  ...state,
  pending: true,
  error: null,
});
const setFailure = (state: EmpresaState, error: EmpresaState['error']): EmpresaState => ({
  ...state,
  pending: false,
  error,
});

export const empresaReducer = createReducer(
  initialEmpresaState,

  // ---- intent → pending ----
  on(loadUsuarios, setPending),
  on(loadUsuario, setPending),
  on(addUsuario, setPending),
  on(updateUsuario, setPending),
  on(toggleUsuarioStatus, setPending),
  on(resendUsuarioInvite, setPending),
  on(regenerateFirstLoginToken, setPending),
  on(loadRoles, setPending),
  on(loadWhiteLabel, setPending),
  on(saveWhiteLabel, setPending),
  on(loadModulos, setPending),
  on(toggleModulo, setPending),

  // ---- usuarios success ----
  on(loadUsuariosSuccess, (state, { result }): EmpresaState => ({
    ...state,
    usuarios: result.content,
    usuariosPage: result.page,
    usuariosSize: result.size,
    usuariosTotalElements: result.totalElements,
    usuariosTotalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(setUsuariosFilters, (state, { patch }): EmpresaState => ({
    ...state,
    usuariosFilters: { ...state.usuariosFilters, ...patch },
  })),
  on(loadUsuarioSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarioSelected: usuario,
    pending: false,
    error: null,
  })),
  on(clearUsuarioSelected, (state): EmpresaState => ({
    ...state,
    usuarioSelected: null,
  })),
  on(addUsuarioSuccess, (state, { result }): EmpresaState => ({
    ...state,
    usuarios: [result.user, ...state.usuarios],
    usuariosTotalElements: state.usuariosTotalElements + 1,
    pending: false,
    error: null,
  })),
  on(updateUsuarioSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarios: state.usuarios.map((u) => (u.id === usuario.id ? usuario : u)),
    usuarioSelected: state.usuarioSelected?.id === usuario.id ? usuario : state.usuarioSelected,
    pending: false,
    error: null,
  })),
  on(toggleUsuarioStatusSuccess, (state, { usuario }): EmpresaState => ({
    ...state,
    usuarios: state.usuarios.map((u) => (u.id === usuario.id ? usuario : u)),
    usuarioSelected: state.usuarioSelected?.id === usuario.id ? usuario : state.usuarioSelected,
    pending: false,
    error: null,
  })),
  on(resendUsuarioInviteSuccess, (state): EmpresaState => ({
    ...state, pending: false, error: null,
  })),
  on(regenerateFirstLoginTokenSuccess, (state): EmpresaState => ({
    ...state, pending: false, error: null,
  })),

  // ---- roles success ----
  on(loadRolesSuccess, (state, { roles }): EmpresaState => ({
    ...state,
    roles,
    pending: false,
    error: null,
  })),

  // ---- white label success ----
  on(loadWhiteLabelSuccess, (state, { whiteLabel }): EmpresaState => ({
    ...state, whiteLabel, pending: false, error: null,
  })),
  on(saveWhiteLabelSuccess, (state, { whiteLabel }): EmpresaState => ({
    ...state, whiteLabel, pending: false, error: null,
  })),

  // ---- modulos success ----
  on(loadModulosSuccess, (state, { modulos }): EmpresaState => ({
    ...state, modulos, pending: false, error: null,
  })),
  on(toggleModuloSuccess, (state, { code, enable }): EmpresaState => ({
    ...state,
    modulos: state.modulos.map((m) =>
      m.moduleCode === code ? { ...m, enabled: enable } : m,
    ),
    pending: false,
    error: null,
  })),

  // ---- failures ----
  on(loadUsuariosFailure, (s, { error }) => setFailure(s, error)),
  on(loadUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(addUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(updateUsuarioFailure, (s, { error }) => setFailure(s, error)),
  on(toggleUsuarioStatusFailure, (s, { error }) => setFailure(s, error)),
  on(resendUsuarioInviteFailure, (s, { error }) => setFailure(s, error)),
  on(regenerateFirstLoginTokenFailure, (s, { error }) => setFailure(s, error)),
  on(loadRolesFailure, (s, { error }) => setFailure(s, error)),
  on(loadWhiteLabelFailure, (s, { error }) => setFailure(s, error)),
  on(saveWhiteLabelFailure, (s, { error }) => setFailure(s, error)),
  on(loadModulosFailure, (s, { error }) => setFailure(s, error)),
  on(toggleModuloFailure, (s, { error }) => setFailure(s, error)),
);
```

- [ ] **Step 7.2: Verificar compilación**

```bash
npx tsc --noEmit
```

---

## Task 8: Reemplazar `empresa.effects.ts`

**Files:**
- Modify: `src/app/features/empresa/store/empresa.effects.ts`

- [ ] **Step 8.1: Reemplazar contenido completo**

```ts
// src/app/features/empresa/store/empresa.effects.ts
import { inject, Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  catchError, concatMap, exhaustMap, map, of, switchMap, withLatestFrom,
} from 'rxjs';

import { NotificationService } from '@core/services/notification.service';
import { TenantThemeService } from '@core/tenant/tenant-theme.service';
import { selectTenantConfig } from '@core/tenant/store/tenant.selectors';
import { selectUsuariosFilters } from './empresa.selectors';

import { UsuariosApiService } from '../services/usuarios-api.service';
import { RolesApiService } from '../services/roles-api.service';
import { AuthAdminApiService } from '../services/auth-admin-api.service';
import { WhiteLabelApiService } from '../services/white-label-api.service';
import { ModulosApiService } from '../services/modulos-api.service';

import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  loadUsuario, loadUsuarioSuccess, loadUsuarioFailure,
  addUsuario, addUsuarioSuccess, addUsuarioFailure,
  updateUsuario, updateUsuarioSuccess, updateUsuarioFailure,
  toggleUsuarioStatus, toggleUsuarioStatusSuccess, toggleUsuarioStatusFailure,
  resendUsuarioInvite, resendUsuarioInviteSuccess, resendUsuarioInviteFailure,
  regenerateFirstLoginToken, regenerateFirstLoginTokenSuccess, regenerateFirstLoginTokenFailure,
  loadRoles, loadRolesSuccess, loadRolesFailure,
  loadWhiteLabel, loadWhiteLabelSuccess, loadWhiteLabelFailure,
  saveWhiteLabel, saveWhiteLabelSuccess, saveWhiteLabelFailure,
  loadModulos, loadModulosSuccess, loadModulosFailure,
  toggleModulo, toggleModuloSuccess, toggleModuloFailure,
} from './empresa.actions';

@Injectable()
export class EmpresaEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly notifications = inject(NotificationService);
  private readonly tenantTheme = inject(TenantThemeService);

  private readonly usuariosApi = inject(UsuariosApiService);
  private readonly rolesApi = inject(RolesApiService);
  private readonly authAdminApi = inject(AuthAdminApiService);
  private readonly whiteLabelApi = inject(WhiteLabelApiService);
  private readonly modulosApi = inject(ModulosApiService);

  // ---- Usuarios ----
  loadUsuarios$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsuarios),
      switchMap(({ filters }) =>
        this.usuariosApi.search(filters).pipe(
          map((result) => loadUsuariosSuccess({ result })),
          catchError((error: HttpErrorResponse) => of(loadUsuariosFailure({ error }))),
        ),
      ),
    ),
  );

  /** Re-fetch when filters change. */
  setFiltersPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setUsuariosFilters),
      withLatestFrom(this.store.select(selectUsuariosFilters)),
      map(([, filters]) => loadUsuarios({ filters })),
    ),
  );

  loadUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUsuario),
      switchMap(({ id }) =>
        this.usuariosApi.getById(id).pipe(
          map((usuario) => loadUsuarioSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(loadUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  addUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addUsuario),
      exhaustMap(({ payload }) =>
        this.usuariosApi.create(payload).pipe(
          map((result) => addUsuarioSuccess({ result })),
          catchError((error: HttpErrorResponse) => of(addUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  addUsuarioSuccessToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(addUsuarioSuccess),
        map(() => this.notifications.success('Invitación enviada al email del usuario')),
      ),
    { dispatch: false },
  );

  updateUsuario$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateUsuario),
      exhaustMap(({ id, payload }) =>
        this.usuariosApi.update(id, payload).pipe(
          map((usuario) => updateUsuarioSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(updateUsuarioFailure({ error }))),
        ),
      ),
    ),
  );

  toggleUsuarioStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleUsuarioStatus),
      concatMap(({ id, payload }) =>
        this.usuariosApi.toggleStatus(id, payload).pipe(
          map((usuario) => toggleUsuarioStatusSuccess({ usuario })),
          catchError((error: HttpErrorResponse) => of(toggleUsuarioStatusFailure({ error }))),
        ),
      ),
    ),
  );

  resendInvite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(resendUsuarioInvite),
      concatMap(({ userId }) =>
        this.authAdminApi.resendEmailVerification(userId).pipe(
          map(() => resendUsuarioInviteSuccess({ userId })),
          catchError((error: HttpErrorResponse) => of(resendUsuarioInviteFailure({ error }))),
        ),
      ),
    ),
  );

  resendInviteToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(resendUsuarioInviteSuccess),
        map(() => this.notifications.success('Email de verificación reenviado')),
      ),
    { dispatch: false },
  );

  regenerateToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(regenerateFirstLoginToken),
      concatMap(({ userId }) =>
        this.authAdminApi.generateFirstLoginToken(userId).pipe(
          map((token) => regenerateFirstLoginTokenSuccess({ userId, token })),
          catchError((error: HttpErrorResponse) =>
            of(regenerateFirstLoginTokenFailure({ error })),
          ),
        ),
      ),
    ),
  );

  regenerateTokenToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(regenerateFirstLoginTokenSuccess),
        map(() =>
          this.notifications.success('Nuevo token de primer login generado'),
        ),
      ),
    { dispatch: false },
  );

  // ---- Roles ----
  loadRoles$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadRoles),
      switchMap(() =>
        this.rolesApi.list().pipe(
          map((roles) => loadRolesSuccess({ roles })),
          catchError((error: HttpErrorResponse) => of(loadRolesFailure({ error }))),
        ),
      ),
    ),
  );

  // ---- White label ----
  loadWhiteLabel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadWhiteLabel),
      switchMap(() =>
        this.whiteLabelApi.get().pipe(
          map((whiteLabel) => loadWhiteLabelSuccess({ whiteLabel })),
          catchError((error: HttpErrorResponse) => of(loadWhiteLabelFailure({ error }))),
        ),
      ),
    ),
  );

  saveWhiteLabel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(saveWhiteLabel),
      exhaustMap(({ payload }) =>
        this.whiteLabelApi.save(payload).pipe(
          map((whiteLabel) => saveWhiteLabelSuccess({ whiteLabel })),
          catchError((error: HttpErrorResponse) => of(saveWhiteLabelFailure({ error }))),
        ),
      ),
    ),
  );

  /** After save, reapply theme so sidebar/topbar refresh without reload. */
  applyThemeAfterSave$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveWhiteLabelSuccess),
        withLatestFrom(this.store.select(selectTenantConfig)),
        map(([{ whiteLabel }, tenantCfg]) => {
          if (!tenantCfg) return;
          this.tenantTheme.applyTheme({
            ...tenantCfg,
            brandPrimary: whiteLabel.primaryColor,
            brandSecondary: whiteLabel.secondaryColor,
          });
        }),
      ),
    { dispatch: false },
  );

  saveWhiteLabelToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveWhiteLabelSuccess),
        map(() => this.notifications.success('Identidad visual actualizada')),
      ),
    { dispatch: false },
  );

  // ---- Modulos ----
  loadModulos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadModulos),
      switchMap(() =>
        this.modulosApi.list().pipe(
          map((modulos) => loadModulosSuccess({ modulos })),
          catchError((error: HttpErrorResponse) => of(loadModulosFailure({ error }))),
        ),
      ),
    ),
  );

  toggleModulo$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleModulo),
      concatMap(({ code, enable }) =>
        this.modulosApi.toggle(code, enable).pipe(
          map(() => toggleModuloSuccess({ code, enable })),
          catchError((error: HttpErrorResponse) => of(toggleModuloFailure({ error }))),
        ),
      ),
    ),
  );

  // ---- Global error toast ----
  /** Cualquier *Failure del feature dispara un toast con el mensaje del back. */
  globalFailureToast$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          loadUsuariosFailure, loadUsuarioFailure,
          addUsuarioFailure, updateUsuarioFailure, toggleUsuarioStatusFailure,
          resendUsuarioInviteFailure, regenerateFirstLoginTokenFailure,
          loadRolesFailure,
          loadWhiteLabelFailure, saveWhiteLabelFailure,
          loadModulosFailure, toggleModuloFailure,
        ),
        map(({ error }) => {
          const detail =
            (error?.error as { message?: string })?.message ??
            error?.message ??
            'Error inesperado';
          this.notifications.error('Operación fallida', detail);
        }),
      ),
    { dispatch: false },
  );
}
```

- [ ] **Step 8.2: Verificar compilación**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

> **Nota sobre `loadWhiteLabelFailure` y 404:** el tab White-label trata el 404 en el `*.page.ts` (sección Task 16) y NO lo escala como toast — para evitar mostrar "Operación fallida" cuando el tenant nunca configuró su white-label. El plan deja el toast genérico activo; si en QA se nota falso positivo, ajustar el effect `globalFailureToast$` para excluir `loadWhiteLabelFailure` cuando el status es 404.

---

## Task 9: Tests del store de empresa

**Files:**
- Create: `src/app/features/empresa/store/empresa.reducer.spec.ts`
- Create: `src/app/features/empresa/store/empresa.effects.spec.ts`

> Patrón: vitest + `provideMockActions`. No hace falta mockear notifications/theme — pueden ser stubs.

- [ ] **Step 9.1: Tests del reducer**

```ts
// src/app/features/empresa/store/empresa.reducer.spec.ts
import { describe, expect, it } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { empresaReducer } from './empresa.reducer';
import { initialEmpresaState } from './empresa.state';
import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  setUsuariosFilters,
  addUsuarioSuccess,
  updateUsuarioSuccess,
  toggleUsuarioStatusSuccess,
  loadRolesSuccess,
  loadWhiteLabelSuccess,
  saveWhiteLabelSuccess,
  loadModulosSuccess,
  toggleModuloSuccess,
} from './empresa.actions';
import { Usuario } from '../models/usuario.model';
import { Rol } from '../models/rol.model';
import { WhiteLabel } from '../models/white-label.model';
import { ModuloTenant } from '../models/modulo.model';

const usuario = (over: Partial<Usuario> = {}): Usuario => ({
  id: 1, firstName: 'Ana', lastName: 'Lopez', username: 'alopez',
  email: 'a@l.com', phone: null, document: '123', isEmailVerified: true,
  isExternal: false, branch: null, isFirstLogin: false, active: true,
  roles: [], ...over,
});

describe('empresaReducer — usuarios', () => {
  it('loadUsuarios marca pending', () => {
    const s = empresaReducer(initialEmpresaState, loadUsuarios({ filters: {} }));
    expect(s.pending).toBe(true);
    expect(s.error).toBeNull();
  });

  it('loadUsuariosSuccess llena la lista y resetea pending', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, pending: true },
      loadUsuariosSuccess({
        result: { content: [usuario()], page: 0, size: 20, totalElements: 1, totalPages: 1 },
      }),
    );
    expect(s.usuarios).toHaveLength(1);
    expect(s.usuariosTotalElements).toBe(1);
    expect(s.pending).toBe(false);
  });

  it('loadUsuariosFailure guarda el error y desmarca pending', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = empresaReducer({ ...initialEmpresaState, pending: true }, loadUsuariosFailure({ error }));
    expect(s.pending).toBe(false);
    expect(s.error).toBe(error);
  });

  it('setUsuariosFilters mergea sin pisar', () => {
    const s = empresaReducer(initialEmpresaState, setUsuariosFilters({ patch: { search: 'ana' } }));
    expect(s.usuariosFilters.search).toBe('ana');
    expect(s.usuariosFilters.size).toBe(20);
  });

  it('addUsuarioSuccess prepende en la lista y suma al total', () => {
    const u = usuario({ id: 99 });
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: [usuario({ id: 1 })], usuariosTotalElements: 1 },
      addUsuarioSuccess({ result: { user: u, firstLoginToken: 'tok' } }),
    );
    expect(s.usuarios[0].id).toBe(99);
    expect(s.usuariosTotalElements).toBe(2);
  });

  it('updateUsuarioSuccess reemplaza por id', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: [usuario({ id: 1, firstName: 'Old' })] },
      updateUsuarioSuccess({ usuario: usuario({ id: 1, firstName: 'New' }) }),
    );
    expect(s.usuarios[0].firstName).toBe('New');
  });

  it('toggleUsuarioStatusSuccess refleja active', () => {
    const s = empresaReducer(
      { ...initialEmpresaState, usuarios: [usuario({ id: 1, active: true })] },
      toggleUsuarioStatusSuccess({ usuario: usuario({ id: 1, active: false }) }),
    );
    expect(s.usuarios[0].active).toBe(false);
  });
});

describe('empresaReducer — roles / white-label / modulos', () => {
  it('loadRolesSuccess setea roles', () => {
    const r: Rol = { id: 1, code: 'ADMIN', description: 'Admin', hierarchy: 1 };
    const s = empresaReducer(initialEmpresaState, loadRolesSuccess({ roles: [r] }));
    expect(s.roles).toEqual([r]);
  });

  it('loadWhiteLabelSuccess y saveWhiteLabelSuccess setean whiteLabel', () => {
    const wl: WhiteLabel = {
      id: 1, targetTenantId: 1, systemName: 'X',
      primaryColor: '#000000', secondaryColor: '#ffffff',
      lightLogoUrl: null, darkLogoUrl: null, active: true,
    };
    const s1 = empresaReducer(initialEmpresaState, loadWhiteLabelSuccess({ whiteLabel: wl }));
    expect(s1.whiteLabel).toBe(wl);
    const s2 = empresaReducer(initialEmpresaState, saveWhiteLabelSuccess({ whiteLabel: wl }));
    expect(s2.whiteLabel).toBe(wl);
  });

  it('loadModulosSuccess y toggleModuloSuccess actualizan la lista', () => {
    const mods: ModuloTenant[] = [
      { moduleCode: 'PORTAL', enabled: false },
      { moduleCode: 'TURNOS', enabled: true },
    ];
    const s1 = empresaReducer(initialEmpresaState, loadModulosSuccess({ modulos: mods }));
    expect(s1.modulos).toEqual(mods);
    const s2 = empresaReducer(s1, toggleModuloSuccess({ code: 'PORTAL', enable: true }));
    expect(s2.modulos.find((m) => m.moduleCode === 'PORTAL')!.enabled).toBe(true);
  });
});
```

- [ ] **Step 9.2: Correr tests del reducer**

```bash
npx vitest run src/app/features/empresa/store/empresa.reducer.spec.ts
```

Expected: todos pasan.

- [ ] **Step 9.3: Tests de effects (smoke)**

```ts
// src/app/features/empresa/store/empresa.effects.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Action } from '@ngrx/store';

import { EmpresaEffects } from './empresa.effects';
import { UsuariosApiService } from '../services/usuarios-api.service';
import { RolesApiService } from '../services/roles-api.service';
import { AuthAdminApiService } from '../services/auth-admin-api.service';
import { WhiteLabelApiService } from '../services/white-label-api.service';
import { ModulosApiService } from '../services/modulos-api.service';
import { NotificationService } from '@core/services/notification.service';
import { TenantThemeService } from '@core/tenant/tenant-theme.service';

import {
  loadUsuarios, loadUsuariosSuccess, loadUsuariosFailure,
  loadRoles, loadRolesSuccess,
  toggleModulo, toggleModuloSuccess,
} from './empresa.actions';
import { initialEmpresaState } from './empresa.state';

describe('EmpresaEffects', () => {
  let actions$: Observable<Action>;
  let usuariosApi: { search: ReturnType<typeof vi.fn> };
  let rolesApi: { list: ReturnType<typeof vi.fn> };
  let modulosApi: { toggle: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    usuariosApi = { search: vi.fn() };
    rolesApi = { list: vi.fn() };
    modulosApi = { toggle: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        EmpresaEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { empresa: initialEmpresaState, tenant: { config: null } } }),
        { provide: UsuariosApiService, useValue: usuariosApi },
        { provide: RolesApiService, useValue: rolesApi },
        { provide: AuthAdminApiService, useValue: { resendEmailVerification: vi.fn(), generateFirstLoginToken: vi.fn() } },
        { provide: WhiteLabelApiService, useValue: { get: vi.fn(), save: vi.fn() } },
        { provide: ModulosApiService, useValue: modulosApi },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: TenantThemeService, useValue: { applyTheme: vi.fn() } },
      ],
    });
  });

  it('loadUsuarios success', (done) => {
    const result = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };
    usuariosApi.search.mockReturnValue(of(result));
    actions$ = of(loadUsuarios({ filters: {} }));
    const effects = TestBed.inject(EmpresaEffects);

    effects.loadUsuarios$.subscribe((action) => {
      expect(action).toEqual(loadUsuariosSuccess({ result }));
      done();
    });
  });

  it('loadUsuarios failure', (done) => {
    const error = new HttpErrorResponse({ status: 500 });
    usuariosApi.search.mockReturnValue(throwError(() => error));
    actions$ = of(loadUsuarios({ filters: {} }));
    const effects = TestBed.inject(EmpresaEffects);

    effects.loadUsuarios$.subscribe((action) => {
      expect(action).toEqual(loadUsuariosFailure({ error }));
      done();
    });
  });

  it('loadRoles success', (done) => {
    const roles = [{ id: 1, code: 'ADMIN', description: 'd', hierarchy: 1 }];
    rolesApi.list.mockReturnValue(of(roles));
    actions$ = of(loadRoles());
    const effects = TestBed.inject(EmpresaEffects);

    effects.loadRoles$.subscribe((action) => {
      expect(action).toEqual(loadRolesSuccess({ roles }));
      done();
    });
  });

  it('toggleModulo success', (done) => {
    modulosApi.toggle.mockReturnValue(of(undefined));
    actions$ = of(toggleModulo({ code: 'PORTAL', enable: true }));
    const effects = TestBed.inject(EmpresaEffects);

    effects.toggleModulo$.subscribe((action) => {
      expect(action).toEqual(toggleModuloSuccess({ code: 'PORTAL', enable: true }));
      done();
    });
  });
});
```

- [ ] **Step 9.4: Correr tests de effects**

```bash
npx vitest run src/app/features/empresa/store/empresa.effects.spec.ts
```

Expected: todos pasan.

- [ ] **Step 9.5: Tests del service HTTP `UsuariosApiService`**

```ts
// src/app/features/empresa/services/usuarios-api.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuariosApiService } from './usuarios-api.service';

describe('UsuariosApiService', () => {
  let service: UsuariosApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UsuariosApiService],
    });
    service = TestBed.inject(UsuariosApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('search arma query con isExternal=false fijo', () => {
    service.search({ page: 1, size: 10, search: 'ana' }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/user/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('isExternal')).toBe('false');
    expect(req.request.params.get('search')).toBe('ana');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('create POST a /internal', () => {
    const payload = {
      firstName: 'A', lastName: 'B', email: 'a@b.com',
      document: '1', username: 'ab', roleIds: [1],
    };
    service.create(payload).subscribe();
    const req = http.expectOne('/api/v1/user/internal');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ user: {}, firstLoginToken: null });
  });

  it('toggleStatus PATCH a /{id}/status', () => {
    service.toggleStatus(7, { isActive: false, reason: 'baja' }).subscribe();
    const req = http.expectOne('/api/v1/user/7/status');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false, reason: 'baja' });
    req.flush({});
  });
});
```

```bash
npx vitest run src/app/features/empresa/services/usuarios-api.service.spec.ts
```

Expected: todos pasan.

- [ ] **Step 9.6: Tests del service HTTP `RolesApiService` y `AuthAdminApiService`** (smoke)

```ts
// src/app/features/empresa/services/roles-api.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RolesApiService } from './roles-api.service';

describe('RolesApiService', () => {
  let service: RolesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), RolesApiService],
    });
    service = TestBed.inject(RolesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list GET /api/v1/role/', () => {
    service.list().subscribe();
    const req = http.expectOne('/api/v1/role/');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

```ts
// src/app/features/empresa/services/auth-admin-api.service.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthAdminApiService } from './auth-admin-api.service';

describe('AuthAdminApiService', () => {
  let service: AuthAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthAdminApiService],
    });
    service = TestBed.inject(AuthAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('resendEmailVerification POST con userId', () => {
    service.resendEmailVerification(42).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/auth/email/resend');
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('userId')).toBe('42');
    req.flush(null);
  });

  it('generateFirstLoginToken POST y devuelve text', () => {
    service.generateFirstLoginToken(42).subscribe((token) => {
      expect(token).toBe('xyz');
    });
    const req = http.expectOne((r) => r.url === '/api/v1/auth/first-login/generate-token');
    req.flush('xyz');
  });
});
```

```bash
npx vitest run src/app/features/empresa/services/
```

Expected: todos pasan.

> Los tests de `WhiteLabelApiService` y `ModulosApiService` requieren mockear el store (porque leen el `tenantId`). Si querés cubrirlos, replicar el patrón de los effects (`provideMockStore` con `tenant.config.id` poblado). Por defecto los dejo fuera para no inflar el plan; agregalos si en revisión los pedís.

- [ ] **Step 9.7: Commit**

```bash
git add src/app/features/empresa/
git commit -m "feat(empresa): rewrite store + services for usuarios/roles/white-label/modulos"
```

---

## Task 10: Componente reusable `EmptyStatePlaceholderComponent`

**Files:**
- Create: `src/app/features/empresa/shared/empty-state-placeholder.component.ts`

- [ ] **Step 10.1: Componente**

```ts
// src/app/features/empresa/shared/empty-state-placeholder.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'emp-empty-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-empty-state">
      <i [class]="icon"></i>
      <h4>{{ title }}</h4>
      <p>{{ description }}</p>
    </div>
  `,
  styles: [`
    .ui-empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: var(--space-3); padding: var(--space-12) var(--space-4);
      color: var(--ds-text-muted); text-align: center;
    }
    .ui-empty-state i { font-size: 56px; color: var(--ds-text-muted); }
    .ui-empty-state h4 { margin: 0; color: var(--ds-text); }
    .ui-empty-state p { max-width: 360px; margin: 0; }
  `],
})
export class EmptyStatePlaceholderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) description!: string;
  @Input() icon = 'pi pi-clock';
}
```

---

## Task 11: Páginas placeholder Fiscal y SMTP/Docs

**Files:**
- Create: `src/app/features/empresa/pages/fiscal/fiscal.page.ts`
- Create: `src/app/features/empresa/pages/smtp-docs/smtp-docs.page.ts`

- [ ] **Step 11.1: `fiscal.page.ts`**

```ts
// src/app/features/empresa/pages/fiscal/fiscal.page.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStatePlaceholderComponent } from '../../shared/empty-state-placeholder.component';

@Component({
  selector: 'emp-fiscal-page',
  standalone: true,
  imports: [EmptyStatePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <emp-empty-placeholder
      icon="pi pi-file"
      title="Próximamente"
      description="Esta sección requiere endpoints que aún no están disponibles en el backend." />
  `,
})
export class FiscalPage {}
```

- [ ] **Step 11.2: `smtp-docs.page.ts`**

```ts
// src/app/features/empresa/pages/smtp-docs/smtp-docs.page.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStatePlaceholderComponent } from '../../shared/empty-state-placeholder.component';

@Component({
  selector: 'emp-smtp-docs-page',
  standalone: true,
  imports: [EmptyStatePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <emp-empty-placeholder
      icon="pi pi-envelope"
      title="Próximamente"
      description="Esta sección requiere endpoints que aún no están disponibles en el backend." />
  `,
})
export class SmtpDocsPage {}
```

---

## Task 12: Página `RolesPage` (read-only)

**Files:**
- Create: `src/app/features/empresa/pages/roles/roles.page.ts`

- [ ] **Step 12.1: `roles.page.ts`**

```ts
// src/app/features/empresa/pages/roles/roles.page.ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';

import { loadRoles } from '../../store/empresa.actions';
import {
  selectAllRoles,
  selectEmpresaPending,
  selectEmpresaError,
} from '../../store/empresa.selectors';

@Component({
  selector: 'emp-roles-page',
  standalone: true,
  imports: [TableModule, SkeletonModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-message
      severity="info"
      text="Los roles los gestiona el administrador de la plataforma. Para asignarlos a un usuario, andá a la pestaña Usuarios."
      class="ui-mb-3" />

    @if (pending() && roles().length === 0) {
      <p-skeleton width="100%" height="2rem" />
      <p-skeleton width="100%" height="2rem" styleClass="ui-mt-2" />
      <p-skeleton width="100%" height="2rem" styleClass="ui-mt-2" />
    } @else {
      <p-table [value]="roles()" stripedRows>
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th style="width: 8rem">Jerarquía</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>{{ r.code }}</td>
            <td>{{ r.description }}</td>
            <td>{{ r.hierarchy }}</td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
})
export class RolesPage implements OnInit {
  private readonly store = inject(Store);

  readonly roles = this.store.selectSignal(selectAllRoles);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly error = this.store.selectSignal(selectEmpresaError);

  ngOnInit(): void {
    this.store.dispatch(loadRoles());
  }
}
```

---

## Task 13: Página `ModulosPage`

**Files:**
- Create: `src/app/features/empresa/pages/modulos/modulos.page.ts`
- Create: `src/app/features/empresa/pages/modulos/components/modulo-card.component.ts`

- [ ] **Step 13.1: `modulo-card.component.ts`**

```ts
// src/app/features/empresa/pages/modulos/components/modulo-card.component.ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TagModule } from 'primeng/tag';
import { ModuloMeta } from '../../../models/modulo.model';

@Component({
  selector: 'emp-modulo-card',
  standalone: true,
  imports: [ToggleSwitchModule, TagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-card emp-modulo-card">
      <div class="emp-modulo-card__icon"><i [class]="meta.icon"></i></div>
      <div class="emp-modulo-card__body">
        <div class="emp-modulo-card__title">
          <h4>{{ meta.label }}</h4>
          <p-tag
            [value]="enabled ? 'Activo' : 'Inactivo'"
            [severity]="enabled ? 'success' : 'secondary'" />
        </div>
        <p>{{ meta.description }}</p>
      </div>
      <p-toggleswitch
        [ngModel]="enabled"
        [disabled]="disabled"
        (onChange)="toggle.emit(!enabled)" />
    </div>
  `,
  styles: [`
    .emp-modulo-card {
      display: flex; align-items: center; gap: var(--space-4);
      padding: var(--space-4); margin-bottom: var(--space-3);
      background: var(--ds-surface); border-radius: 8px;
    }
    .emp-modulo-card__icon i { font-size: 28px; color: var(--brand-primary); }
    .emp-modulo-card__body { flex: 1; min-width: 0; }
    .emp-modulo-card__body p { margin: var(--space-1) 0 0; color: var(--ds-text-muted); }
    .emp-modulo-card__title { display: flex; align-items: center; gap: var(--space-2); }
    .emp-modulo-card__title h4 { margin: 0; }
  `],
})
export class ModuloCardComponent {
  @Input({ required: true }) meta!: ModuloMeta;
  @Input({ required: true }) enabled!: boolean;
  @Input() disabled = false;
  @Output() toggle = new EventEmitter<boolean>();
}
```

> **Nota:** `p-toggleswitch` con `[ngModel]` requiere `FormsModule` en consumers o `ReactiveFormsModule`. Si tu versión de PrimeNG difiere, usar `<p-inputSwitch>` y respetar el componente correcto. Verificar al implementar.

- [ ] **Step 13.2: `modulos.page.ts`**

```ts
// src/app/features/empresa/pages/modulos/modulos.page.ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { loadModulos, toggleModulo } from '../../store/empresa.actions';
import { selectAllModulos, selectEmpresaPending } from '../../store/empresa.selectors';
import { MODULO_META, ModuleCode, ModuloMeta } from '../../models/modulo.model';
import { ModuloCardComponent } from './components/modulo-card.component';

@Component({
  selector: 'emp-modulos-page',
  standalone: true,
  imports: [FormsModule, ConfirmDialogModule, ModuloCardComponent],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-confirmDialog />
    @for (m of modulos(); track m.moduleCode) {
      <emp-modulo-card
        [meta]="metaFor(m.moduleCode)"
        [enabled]="m.enabled"
        [disabled]="pending()"
        (toggle)="askToggle(m.moduleCode, $event)" />
    }
  `,
})
export class ModulosPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly modulos = this.store.selectSignal(selectAllModulos);
  readonly pending = this.store.selectSignal(selectEmpresaPending);

  ngOnInit(): void {
    this.store.dispatch(loadModulos());
  }

  metaFor(code: ModuleCode): ModuloMeta {
    return MODULO_META[code];
  }

  askToggle(code: ModuleCode, enable: boolean): void {
    const meta = this.metaFor(code);
    this.confirm.confirm({
      header: enable ? `¿Activar ${meta.label}?` : `¿Desactivar ${meta.label}?`,
      message: enable
        ? `Los usuarios ganarán acceso a la sección ${meta.label}.`
        : `Los usuarios perderán acceso a la sección ${meta.label}.`,
      acceptLabel: enable ? 'Activar' : 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(toggleModulo({ code, enable })),
    });
  }
}
```

---

## Task 14: Tab Usuarios — `UsuariosPage` + componentes

> Esta es la página más grande. La parto en 4 sub-archivos (filtros, tabla, drawer form, dialog toggle) cada uno con su propio `Component`. La page actúa de orquestador (despacha actions, pasa data).

**Files:**
- Create: `src/app/features/empresa/pages/usuarios/components/usuarios-filtros.component.ts`
- Create: `src/app/features/empresa/pages/usuarios/components/usuarios-table.component.ts`
- Create: `src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.ts`
- Create: `src/app/features/empresa/pages/usuarios/components/toggle-status-dialog.component.ts`
- Create: `src/app/features/empresa/pages/usuarios/usuarios.page.ts`

### Sub-task 14.1: Filtros

- [ ] **Step 14.1.1: `usuarios-filtros.component.ts`**

```ts
// src/app/features/empresa/pages/usuarios/components/usuarios-filtros.component.ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { Rol } from '../../../models/rol.model';
import { BuscarUsuariosParams } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuarios-filtros',
  standalone: true,
  imports: [FormsModule, InputTextModule, IconFieldModule, InputIconModule, MultiSelectModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-filtros">
      <p-iconField iconPosition="left">
        <p-inputIcon><i class="pi pi-search"></i></p-inputIcon>
        <input pInputText
          placeholder="Buscar por nombre, email, documento..."
          [ngModel]="filters.search"
          (ngModelChange)="patch.emit({ search: $event || undefined, page: 0 })" />
      </p-iconField>

      <p-multiSelect
        [options]="roles" optionLabel="description" optionValue="id"
        placeholder="Filtrar por rol"
        [ngModel]="filters.roleIds"
        (ngModelChange)="patch.emit({ roleIds: $event?.length ? $event : undefined, page: 0 })" />

      <p-select
        [options]="estados" optionLabel="label" optionValue="value"
        placeholder="Estado"
        [ngModel]="estadoValor()"
        (ngModelChange)="patch.emit({ isActive: $event, page: 0 })" />
    </div>
  `,
  styles: [`
    .emp-filtros {
      display: grid; grid-template-columns: 1fr 220px 160px;
      gap: var(--space-3); margin-bottom: var(--space-4);
    }
    @media (max-width: 768px) {
      .emp-filtros { grid-template-columns: 1fr; }
    }
  `],
})
export class UsuariosFiltrosComponent {
  @Input({ required: true }) filters!: BuscarUsuariosParams;
  @Input({ required: true }) roles!: Rol[];
  @Output() patch = new EventEmitter<Partial<BuscarUsuariosParams>>();

  readonly estados = [
    { label: 'Todos', value: undefined },
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false },
  ];

  estadoValor(): boolean | undefined {
    return this.filters.isActive;
  }
}
```

### Sub-task 14.2: Tabla

- [ ] **Step 14.2.1: `usuarios-table.component.ts`**

```ts
// src/app/features/empresa/pages/usuarios/components/usuarios-table.component.ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TableModule, TablePageEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuItem } from 'primeng/api';
import { Usuario } from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuarios-table',
  standalone: true,
  imports: [TableModule, ButtonModule, TagModule, MenuModule, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-table
      [value]="usuarios"
      [lazy]="true"
      [paginator]="true"
      [rows]="size"
      [first]="page * size"
      [totalRecords]="totalElements"
      [loading]="loading"
      stripedRows
      (onPage)="onPage($event)">
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 4rem"></th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Sucursal</th>
          <th>Estado</th>
          <th style="width: 12rem; text-align: right">Acciones</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-u>
        <tr>
          <td>
            <div class="emp-avatar">{{ initials(u) }}</div>
          </td>
          <td>
            <div class="ui-stack">
              <strong>{{ u.firstName }} {{ u.lastName }}</strong>
              <small class="ui-text-muted">{{ u.email }}</small>
            </div>
          </td>
          <td>{{ rolesLabel(u) }}</td>
          <td>{{ u.branch ?? '—' }}</td>
          <td>
            <p-tag [value]="u.active ? 'Activo' : 'Inactivo'"
                   [severity]="u.active ? 'success' : 'warning'" />
          </td>
          <td style="text-align: right">
            <p-button icon="pi pi-pencil" severity="secondary" text rounded
                      ariaLabel="Editar"
                      (onClick)="edit.emit(u)" />
            <p-button [icon]="u.active ? 'pi pi-ban' : 'pi pi-check'"
                      [severity]="u.active ? 'warning' : 'success'" text rounded
                      [ariaLabel]="u.active ? 'Desactivar' : 'Activar'"
                      (onClick)="toggleStatus.emit(u)" />
            <p-button icon="pi pi-ellipsis-v" severity="secondary" text rounded
                      ariaLabel="Más acciones"
                      (onClick)="moreMenu.toggle($event); active = u" />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="6">
          <div class="ui-empty-state">
            <i class="pi pi-users"></i>
            <h4>Sin resultados</h4>
            <p>No hay usuarios que coincidan con los filtros.</p>
          </div>
        </td></tr>
      </ng-template>
    </p-table>

    <p-menu #moreMenu [popup]="true" [model]="moreActions()" />
  `,
  styles: [`
    .emp-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: var(--brand-secondary); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600;
    }
    .ui-stack { display: flex; flex-direction: column; }
    .ui-text-muted { color: var(--ds-text-muted); }
    .ui-empty-state { padding: var(--space-8); text-align: center; }
    .ui-empty-state i { font-size: 40px; color: var(--ds-text-muted); }
  `],
})
export class UsuariosTableComponent {
  @Input({ required: true }) usuarios!: Usuario[];
  @Input({ required: true }) page!: number;
  @Input({ required: true }) size!: number;
  @Input({ required: true }) totalElements!: number;
  @Input() loading = false;

  @Output() edit = new EventEmitter<Usuario>();
  @Output() toggleStatus = new EventEmitter<Usuario>();
  @Output() resendInvite = new EventEmitter<Usuario>();
  @Output() regenerateToken = new EventEmitter<Usuario>();
  @Output() pageChange = new EventEmitter<{ page: number; size: number }>();

  active: Usuario | null = null;

  initials(u: Usuario): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase();
  }

  rolesLabel(u: Usuario): string {
    return u.roles.map((r) => r.description).join(', ') || '—';
  }

  onPage(e: TablePageEvent): void {
    this.pageChange.emit({ page: Math.floor(e.first / e.rows), size: e.rows });
  }

  moreActions(): MenuItem[] {
    return [
      {
        label: 'Reenviar verificación',
        icon: 'pi pi-envelope',
        command: () => this.active && this.resendInvite.emit(this.active),
      },
      {
        label: 'Regenerar invitación',
        icon: 'pi pi-refresh',
        command: () => this.active && this.regenerateToken.emit(this.active),
      },
    ];
  }
}
```

### Sub-task 14.3: Drawer de form (crear/editar)

- [ ] **Step 14.3.1: `usuario-form-drawer.component.ts`**

```ts
// src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.ts
import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Rol } from '../../../models/rol.model';
import {
  ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario,
} from '../../../models/usuario.model';

@Component({
  selector: 'emp-usuario-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, MultiSelectModule, FloatLabelModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [(visible)]="visibleInternal"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      (onHide)="cancel.emit()">
      <ng-template pTemplate="header">
        <h3>{{ editing() ? 'Editar usuario' : 'Invitar usuario' }}</h3>
      </ng-template>

      <form [formGroup]="form" class="emp-form" (ngSubmit)="onSubmit()">
        <p-floatlabel>
          <input pInputText id="firstName" formControlName="firstName" />
          <label for="firstName">Nombre</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="lastName" formControlName="lastName" />
          <label for="lastName">Apellido</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="email" type="email" formControlName="email" />
          <label for="email">Email</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="document" formControlName="document" />
          <label for="document">Documento</label>
        </p-floatlabel>
        <p-floatlabel>
          <input pInputText id="username" formControlName="username" />
          <label for="username">Usuario</label>
        </p-floatlabel>
        <p-floatlabel>
          <p-multiSelect
            id="roleIds"
            [options]="roles" optionLabel="description" optionValue="id"
            formControlName="roleIds"
            display="chip" />
          <label for="roleIds">Roles</label>
        </p-floatlabel>
      </form>

      <ng-template pTemplate="footer">
        <div class="emp-form__footer">
          <p-button label="Cancelar" severity="secondary" text (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar' : 'Invitar'"
            severity="primary"
            [disabled]="!canSubmit() || saving"
            [loading]="saving"
            (onClick)="onSubmit()" />
        </div>
      </ng-template>
    </p-drawer>
  `,
  styles: [`
    .emp-form { display: flex; flex-direction: column; gap: var(--space-5); padding-top: var(--space-3); }
    .emp-form__footer { display: flex; justify-content: flex-end; gap: var(--space-3); }
  `],
})
export class UsuarioFormDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input({ required: true }) roles!: Rol[];
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() create = new EventEmitter<CrearUsuarioPayload>();
  @Output() update = new EventEmitter<{ id: number; payload: ActualizarUsuarioPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    document: ['', [Validators.required]],
    username: ['', [Validators.required]],
    roleIds: [[] as number[], [Validators.required]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');
  readonly editing = computed(() => !!this.usuario);

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
    }
    if ('usuario' in changes) {
      if (this.usuario) {
        this.form.reset({
          firstName: this.usuario.firstName,
          lastName: this.usuario.lastName,
          email: this.usuario.email,
          document: this.usuario.document,
          username: this.usuario.username,
          roleIds: this.usuario.roles.map((r) => r.id),
        });
      } else {
        this.form.reset({ firstName: '', lastName: '', email: '', document: '', username: '', roleIds: [] });
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const payload = this.form.getRawValue() as CrearUsuarioPayload;
    if (this.usuario) {
      this.update.emit({ id: this.usuario.id, payload });
    } else {
      this.create.emit(payload);
    }
  }
}
```

> **Nota:** verificar el nombre exacto del componente Drawer en la versión instalada de PrimeNG (v21). Si es `Sidebar` en lugar de `Drawer`, ajustar imports.

### Sub-task 14.4: Dialog toggle status

- [ ] **Step 14.4.1: `toggle-status-dialog.component.ts`**

```ts
// src/app/features/empresa/pages/usuarios/components/toggle-status-dialog.component.ts
import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Usuario, CambiarEstadoPayload } from '../../../models/usuario.model';

@Component({
  selector: 'emp-toggle-status-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visibleInternal"
      [modal]="true"
      [draggable]="false"
      [style]="{ width: '32rem' }"
      [header]="usuario?.active ? 'Desactivar usuario' : 'Activar usuario'"
      (onHide)="cancel.emit()">
      <p>{{ usuario?.firstName }} {{ usuario?.lastName }} ({{ usuario?.email }})</p>

      @if (usuario?.active) {
        <form [formGroup]="form">
          <label for="reason">Motivo (obligatorio)</label>
          <textarea pInputTextarea id="reason" rows="4" formControlName="reason"
                    placeholder="Indicá el motivo de la desactivación"></textarea>
        </form>
      } @else {
        <p class="ui-text-muted">Confirmá para reactivar al usuario.</p>
      }

      <ng-template pTemplate="footer">
        <p-button label="Cancelar" severity="secondary" text (onClick)="cancel.emit()" />
        <p-button
          [label]="usuario?.active ? 'Desactivar' : 'Activar'"
          [severity]="usuario?.active ? 'warning' : 'success'"
          [disabled]="!canSubmit() || saving"
          [loading]="saving"
          (onClick)="onConfirm()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ToggleStatusDialogComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() confirm = new EventEmitter<{ id: number; payload: CambiarEstadoPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;
  form = this.fb.group({
    reason: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => {
    if (!this.usuario) return false;
    if (!this.usuario.active) return true;
    return this.status() === 'VALID';
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) this.visibleInternal = this.visible;
    if ('usuario' in changes) this.form.reset({ reason: '' });
  }

  onConfirm(): void {
    if (!this.usuario) return;
    const isActive = !this.usuario.active; // queremos invertir
    const reason = isActive ? 'Reactivación' : (this.form.value.reason as string);
    this.confirm.emit({ id: this.usuario.id, payload: { isActive, reason } });
  }
}
```

> **Nota:** en PrimeNG 21 puede que `InputTextareaModule` se llame distinto (`InputTextarea` standalone). Verificar al implementar.

### Sub-task 14.5: Página orquestadora `UsuariosPage`

- [ ] **Step 14.5.1: `usuarios.page.ts`**

```ts
// src/app/features/empresa/pages/usuarios/usuarios.page.ts
import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';

import {
  loadUsuarios, setUsuariosFilters, loadRoles,
  addUsuario, updateUsuario,
  toggleUsuarioStatus,
  resendUsuarioInvite, regenerateFirstLoginToken,
} from '../../store/empresa.actions';
import {
  selectAllUsuarios, selectAllRoles,
  selectEmpresaPending, selectUsuariosFilters,
  selectUsuariosPage, selectUsuariosSize, selectUsuariosTotalElements,
} from '../../store/empresa.selectors';
import {
  ActualizarUsuarioPayload, CambiarEstadoPayload, CrearUsuarioPayload, Usuario,
} from '../../models/usuario.model';

import { UsuariosFiltrosComponent } from './components/usuarios-filtros.component';
import { UsuariosTableComponent } from './components/usuarios-table.component';
import { UsuarioFormDrawerComponent } from './components/usuario-form-drawer.component';
import { ToggleStatusDialogComponent } from './components/toggle-status-dialog.component';

@Component({
  selector: 'emp-usuarios-page',
  standalone: true,
  imports: [
    ButtonModule,
    UsuariosFiltrosComponent, UsuariosTableComponent,
    UsuarioFormDrawerComponent, ToggleStatusDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-usuarios__header">
      <div>
        <h2 class="emp-usuarios__title">Usuarios</h2>
        <small class="ui-text-muted">{{ totalElements() }} usuarios en total</small>
      </div>
      <p-button label="Invitar" icon="pi pi-plus" severity="primary" (onClick)="openCreate()" />
    </div>

    <emp-usuarios-filtros
      [filters]="filters()"
      [roles]="roles()"
      (patch)="onFiltersPatch($event)" />

    <emp-usuarios-table
      [usuarios]="usuarios()"
      [page]="page()"
      [size]="size()"
      [totalElements]="totalElements()"
      [loading]="pending()"
      (edit)="openEdit($event)"
      (toggleStatus)="openToggle($event)"
      (resendInvite)="onResend($event)"
      (regenerateToken)="onRegenerate($event)"
      (pageChange)="onPageChange($event)" />

    <emp-usuario-form-drawer
      [visible]="formOpen()"
      [usuario]="editingUser()"
      [roles]="roles()"
      [saving]="pending()"
      (create)="onCreate($event)"
      (update)="onUpdate($event)"
      (cancel)="closeForm()" />

    <emp-toggle-status-dialog
      [visible]="toggleOpen()"
      [usuario]="togglingUser()"
      [saving]="pending()"
      (confirm)="onConfirmToggle($event)"
      (cancel)="closeToggle()" />
  `,
  styles: [`
    .emp-usuarios__header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: var(--space-4);
    }
    .emp-usuarios__title { margin: 0; }
  `],
})
export class UsuariosPage implements OnInit {
  private readonly store = inject(Store);

  readonly usuarios = this.store.selectSignal(selectAllUsuarios);
  readonly roles = this.store.selectSignal(selectAllRoles);
  readonly filters = this.store.selectSignal(selectUsuariosFilters);
  readonly pending = this.store.selectSignal(selectEmpresaPending);
  readonly page = this.store.selectSignal(selectUsuariosPage);
  readonly size = this.store.selectSignal(selectUsuariosSize);
  readonly totalElements = this.store.selectSignal(selectUsuariosTotalElements);

  readonly formOpen = signal(false);
  readonly editingUser = signal<Usuario | null>(null);

  readonly toggleOpen = signal(false);
  readonly togglingUser = signal<Usuario | null>(null);

  ngOnInit(): void {
    this.store.dispatch(loadRoles());
    this.store.dispatch(loadUsuarios({ filters: this.filters() }));
  }

  onFiltersPatch(patch: Partial<{ search?: string; isActive?: boolean; roleIds?: number[]; page?: number }>): void {
    this.store.dispatch(setUsuariosFilters({ patch }));
  }

  onPageChange({ page, size }: { page: number; size: number }): void {
    this.store.dispatch(setUsuariosFilters({ patch: { page, size } }));
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.formOpen.set(true);
  }

  openEdit(u: Usuario): void {
    this.editingUser.set(u);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingUser.set(null);
  }

  onCreate(payload: CrearUsuarioPayload): void {
    this.store.dispatch(addUsuario({ payload }));
    this.closeForm();
  }

  onUpdate({ id, payload }: { id: number; payload: ActualizarUsuarioPayload }): void {
    this.store.dispatch(updateUsuario({ id, payload }));
    this.closeForm();
  }

  openToggle(u: Usuario): void {
    this.togglingUser.set(u);
    this.toggleOpen.set(true);
  }

  closeToggle(): void {
    this.toggleOpen.set(false);
    this.togglingUser.set(null);
  }

  onConfirmToggle({ id, payload }: { id: number; payload: CambiarEstadoPayload }): void {
    this.store.dispatch(toggleUsuarioStatus({ id, payload }));
    this.closeToggle();
  }

  onResend(u: Usuario): void {
    this.store.dispatch(resendUsuarioInvite({ userId: u.id }));
  }

  onRegenerate(u: Usuario): void {
    this.store.dispatch(regenerateFirstLoginToken({ userId: u.id }));
  }
}
```

---

## Task 15: Tab White-label — `WhiteLabelPage`

**Files:**
- Create: `src/app/features/empresa/pages/white-label/components/white-label-preview.component.ts`
- Create: `src/app/features/empresa/pages/white-label/white-label.page.ts`

- [ ] **Step 15.1: `white-label-preview.component.ts`**

```ts
// src/app/features/empresa/pages/white-label/components/white-label-preview.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'emp-wl-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-wl-preview"
         [style.--p-primary]="primaryColor"
         [style.--p-secondary]="secondaryColor">
      <aside class="emp-wl-preview__sidebar">
        @if (lightLogoUrl) { <img [src]="lightLogoUrl" alt="logo" /> }
        @else { <div class="emp-wl-preview__logo-fallback">{{ initials() }}</div> }
        <span>{{ systemName }}</span>
      </aside>
      <div class="emp-wl-preview__main">
        <div class="emp-wl-preview__topbar"></div>
        <div class="emp-wl-preview__content">
          <div class="emp-wl-preview__btn">Botón primario</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .emp-wl-preview {
      display: grid; grid-template-columns: 200px 1fr;
      height: 320px; border-radius: 8px; overflow: hidden;
      border: 1px solid var(--ds-surface);
    }
    .emp-wl-preview__sidebar {
      background: var(--p-primary, #2563eb); color: #fff;
      padding: var(--space-4);
      display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
    }
    .emp-wl-preview__sidebar img { max-width: 120px; max-height: 48px; }
    .emp-wl-preview__logo-fallback {
      width: 48px; height: 48px; border-radius: 8px;
      background: rgba(255,255,255,0.18); display: flex;
      align-items: center; justify-content: center; font-weight: 700;
    }
    .emp-wl-preview__main { background: var(--ds-bg); display: flex; flex-direction: column; }
    .emp-wl-preview__topbar {
      height: 48px; background: var(--p-primary, #2563eb); opacity: 0.92;
    }
    .emp-wl-preview__content {
      padding: var(--space-6); flex: 1; display: flex; align-items: center; justify-content: center;
    }
    .emp-wl-preview__btn {
      padding: var(--space-3) var(--space-5);
      background: var(--p-secondary, #0EA5A4); color: #fff; border-radius: 6px; font-weight: 600;
    }
  `],
})
export class WhiteLabelPreviewComponent {
  @Input({ required: true }) systemName!: string;
  @Input({ required: true }) primaryColor!: string;
  @Input({ required: true }) secondaryColor!: string;
  @Input() lightLogoUrl: string | null = null;

  initials(): string {
    return (this.systemName || '?')
      .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }
}
```

- [ ] **Step 15.2: `white-label.page.ts`**

```ts
// src/app/features/empresa/pages/white-label/white-label.page.ts
import {
  ChangeDetectionStrategy, Component, OnInit, computed, effect, inject,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ColorPickerModule } from 'primeng/colorpicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';

import { loadWhiteLabel, saveWhiteLabel } from '../../store/empresa.actions';
import { selectWhiteLabel, selectEmpresaPending } from '../../store/empresa.selectors';
import { WhiteLabelPreviewComponent } from './components/white-label-preview.component';

const HEX = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'emp-white-label-page',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonModule, InputTextModule, ColorPickerModule,
    FloatLabelModule, MessageModule, SkeletonModule, WhiteLabelPreviewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="emp-wl">
      <form [formGroup]="form" class="emp-wl__form" (ngSubmit)="save()">
        <p-floatlabel>
          <input pInputText id="systemName" formControlName="systemName" />
          <label for="systemName">Nombre del sistema</label>
        </p-floatlabel>

        <div class="emp-wl__row">
          <p-floatlabel>
            <input pInputText id="primary" formControlName="primaryColor" />
            <label for="primary">Color principal (#RRGGBB)</label>
          </p-floatlabel>
          <p-colorPicker formControlName="primaryColor" />
        </div>

        <div class="emp-wl__row">
          <p-floatlabel>
            <input pInputText id="secondary" formControlName="secondaryColor" />
            <label for="secondary">Color de acento (#RRGGBB)</label>
          </p-floatlabel>
          <p-colorPicker formControlName="secondaryColor" />
        </div>

        <p-floatlabel>
          <input pInputText id="lightLogo" formControlName="lightLogoUrl" />
          <label for="lightLogo">URL logo claro</label>
        </p-floatlabel>

        <p-floatlabel>
          <input pInputText id="darkLogo" formControlName="darkLogoUrl" />
          <label for="darkLogo">URL logo oscuro</label>
        </p-floatlabel>

        <p-message severity="info"
          text="Próximamente vas a poder subir el logo directamente en lugar de pegar la URL." />

        <div class="emp-wl__actions">
          <p-button
            type="submit" label="Guardar cambios" severity="primary"
            [disabled]="!canSave() || pending()"
            [loading]="pending()" />
        </div>
      </form>

      <aside class="emp-wl__preview">
        <h4>Vista previa</h4>
        <emp-wl-preview
          [systemName]="formValue().systemName || 'Sistema'"
          [primaryColor]="formValue().primaryColor || '#2563EB'"
          [secondaryColor]="formValue().secondaryColor || '#0EA5A4'"
          [lightLogoUrl]="formValue().lightLogoUrl || null" />
        <p class="ui-text-muted ui-mt-3">
          La identidad visual aplica a las zonas de gestión y portal del tenant.
          Las zonas clínicas mantienen una paleta fija.
        </p>
      </aside>
    </div>
  `,
  styles: [`
    .emp-wl {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: var(--space-6);
    }
    @media (max-width: 1024px) { .emp-wl { grid-template-columns: 1fr; } }
    .emp-wl__form { display: flex; flex-direction: column; gap: var(--space-5); }
    .emp-wl__row { display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); align-items: end; }
    .emp-wl__actions { display: flex; justify-content: flex-end; }
    .emp-wl__preview h4 { margin: 0 0 var(--space-3); }
  `],
})
export class WhiteLabelPage implements OnInit {
  private readonly store = inject(Store);
  private readonly fb = inject(FormBuilder);

  readonly whiteLabel = this.store.selectSignal(selectWhiteLabel);
  readonly pending = this.store.selectSignal(selectEmpresaPending);

  form = this.fb.group({
    systemName: ['', [Validators.required]],
    primaryColor: ['#2563EB', [Validators.required, Validators.pattern(HEX)]],
    secondaryColor: ['#0EA5A4', [Validators.required, Validators.pattern(HEX)]],
    lightLogoUrl: [''],
    darkLogoUrl: [''],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly canSave = computed(() => this.status() === 'VALID' && this.form.dirty);

  constructor() {
    // Hidratar el form cuando llega data del store.
    effect(() => {
      const wl = this.whiteLabel();
      if (wl) {
        this.form.reset({
          systemName: wl.systemName,
          primaryColor: wl.primaryColor,
          secondaryColor: wl.secondaryColor,
          lightLogoUrl: wl.lightLogoUrl ?? '',
          darkLogoUrl: wl.darkLogoUrl ?? '',
        });
      }
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadWhiteLabel());
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.store.dispatch(
      saveWhiteLabel({
        payload: {
          systemName: v.systemName!,
          primaryColor: v.primaryColor!,
          secondaryColor: v.secondaryColor!,
          lightLogoUrl: v.lightLogoUrl || null,
          darkLogoUrl: v.darkLogoUrl || null,
        },
      }),
    );
  }
}
```

---

## Task 16: `EmpresaDashboardComponent` (layout con tabs)

**Files:**
- Modify: `src/app/features/empresa/empresa-dashboard/empresa-dashboard.component.ts`

> Reemplazar contenido — el dashboard solo es el shell con tabs y router-outlet.

- [ ] **Step 16.1: Reemplazar contenido**

```ts
// src/app/features/empresa/empresa-dashboard/empresa-dashboard.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'emp-empresa-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="emp-dashboard__header">
      <small class="ui-text-muted">Gestión</small>
      <h1><i class="pi pi-building"></i> Empresa</h1>
    </header>

    <nav class="emp-dashboard__tabs" role="tablist">
      <a routerLink="usuarios" routerLinkActive="is-active" role="tab">Usuarios</a>
      <a routerLink="roles" routerLinkActive="is-active" role="tab">Roles</a>
      <a routerLink="white-label" routerLinkActive="is-active" role="tab">White-label</a>
      <a routerLink="modulos" routerLinkActive="is-active" role="tab">Módulos</a>
      <a routerLink="fiscal" routerLinkActive="is-active" role="tab">Fiscal</a>
      <a routerLink="smtp-docs" routerLinkActive="is-active" role="tab">SMTP / Docs</a>
    </nav>

    <section class="emp-dashboard__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    .emp-dashboard__header { padding: var(--space-6) var(--space-6) 0; }
    .emp-dashboard__header h1 { margin: var(--space-1) 0 var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
    .emp-dashboard__tabs {
      display: flex; gap: var(--space-2); padding: 0 var(--space-6);
      border-bottom: 1px solid var(--ds-surface);
      overflow-x: auto;
    }
    .emp-dashboard__tabs a {
      padding: var(--space-3) var(--space-4); color: var(--ds-text-muted);
      text-decoration: none; border-bottom: 2px solid transparent;
      white-space: nowrap;
    }
    .emp-dashboard__tabs a.is-active {
      color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600;
    }
    .emp-dashboard__body { padding: var(--space-6); }
  `],
})
export class EmpresaDashboardComponent {}
```

---

## Task 17: Actualizar `empresa.routes.ts`

**Files:**
- Modify: `src/app/features/empresa/empresa.routes.ts`

- [ ] **Step 17.1: Reemplazar contenido**

```ts
// src/app/features/empresa/empresa.routes.ts
import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-dashboard/empresa-dashboard.component').then(m => m.EmpresaDashboardComponent),
    children: [
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
      { path: 'usuarios',    loadComponent: () => import('./pages/usuarios/usuarios.page').then(m => m.UsuariosPage) },
      { path: 'roles',       loadComponent: () => import('./pages/roles/roles.page').then(m => m.RolesPage) },
      { path: 'white-label', loadComponent: () => import('./pages/white-label/white-label.page').then(m => m.WhiteLabelPage) },
      { path: 'modulos',     loadComponent: () => import('./pages/modulos/modulos.page').then(m => m.ModulosPage) },
      { path: 'fiscal',      loadComponent: () => import('./pages/fiscal/fiscal.page').then(m => m.FiscalPage) },
      { path: 'smtp-docs',   loadComponent: () => import('./pages/smtp-docs/smtp-docs.page').then(m => m.SmtpDocsPage) },
    ],
  },
];
```

> **Nota:** los componentes/páginas que estaban antes en `pages/{usuarios, roles, white-label, fiscal, smtp-docs, modulos}/*.component.ts` quedan obsoletos y los borramos en Task 19. Si alguno tiene contenido que querés conservar, copialo antes de borrar.

- [ ] **Step 17.2: Hacer alias de `/roles` top-level (opcional)**

Editar `src/app/app.routes.ts`:

```ts
// reemplazar el bloque de /roles existente por:
{
  path: 'roles',
  loadComponent: () =>
    import('./features/empresa/pages/roles/roles.page').then((m) => m.RolesPage),
},
```

Borrar el archivo `src/app/features/roles/` completo (no se usa más).

```bash
rm -rf src/app/features/roles
```

---

## Task 18: Verificación de integración

- [ ] **Step 18.1: Verificar compilación completa**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Si hay imports rotos en `pages/*/component.ts` viejos, borrarlos en Task 19.

- [ ] **Step 18.2: Correr todos los tests**

```bash
npx vitest run
```

Expected: tests existentes + nuevos pasan.

- [ ] **Step 18.3: Build de producción**

```bash
npm run build
```

Expected: build OK.

- [ ] **Step 18.4: Levantar dev server y smoke test manual**

```bash
npm start
```

Navegar a `http://localhost:4200/empresa` (login mediante) y verificar:
- Las 6 tabs aparecen.
- Tab Usuarios: lista carga, filtros responden, abre drawer al "Invitar", abre dialog al togglear status.
- Tab Roles: lista de roles aparece con info-banner.
- Tab White-label: form se hidrata si hay datos, preview se actualiza al tipear, botón Guardar deshabilitado cuando pristine.
- Tab Módulos: lista de cards aparece, toggle abre confirm dialog.
- Tab Fiscal y SMTP/Docs: muestran placeholder.

Si algo falla en runtime, abrir devtools, capturar el error y resolverlo (suele ser nombre de módulo de PrimeNG diferente al previsto).

---

## Task 19: Limpieza de archivos viejos

**Files:**
- Delete: `src/app/features/empresa/pages/usuarios/usuarios.component.ts` (si existe)
- Delete: `src/app/features/empresa/pages/roles/roles.component.ts` (si existe)
- Delete: `src/app/features/empresa/pages/white-label/white-label.component.ts` (si existe)
- Delete: `src/app/features/empresa/pages/fiscal/fiscal.component.ts` (si existe)
- Delete: `src/app/features/empresa/pages/smtp-docs/smtp-docs.component.ts` (si existe)
- Delete: `src/app/features/empresa/pages/modulos/modulos.component.ts` (si existe)
- Delete: `src/app/features/roles/` (si existe)

- [ ] **Step 19.1: Listar archivos viejos**

```bash
ls src/app/features/empresa/pages/usuarios src/app/features/empresa/pages/roles src/app/features/empresa/pages/white-label src/app/features/empresa/pages/fiscal src/app/features/empresa/pages/smtp-docs src/app/features/empresa/pages/modulos 2>/dev/null
```

- [ ] **Step 19.2: Borrar todos los `*.component.ts` viejos** (los reemplazamos por `*.page.ts`)

```bash
find src/app/features/empresa/pages -name "*.component.ts" -delete
find src/app/features/empresa/pages -name "*.component.html" -delete
find src/app/features/empresa/pages -name "*.component.scss" -delete
```

- [ ] **Step 19.3: Verificar que sigue compilando**

```bash
npx tsc --noEmit && npx vitest run
```

- [ ] **Step 19.4: Commit final**

```bash
git add -A
git commit -m "feat(empresa): implement back-office UI (usuarios/roles/white-label/modulos)"
```

---

## Verificación final del feature

Checklist antes de dar la feature por terminada:

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npx vitest run` → all green
- [ ] `npm run build` → build OK
- [ ] Smoke manual de las 6 tabs (Task 18.4)
- [ ] Console del browser sin errores ni warnings nuevos al navegar entre tabs
- [ ] Toast de éxito aparece al crear usuario, guardar white-label, togglear módulo
- [ ] Toast de error aparece y describe el problema cuando el back devuelve 4xx/5xx
- [ ] Sidebar/topbar reflejan los nuevos colores tras guardar white-label sin recargar (Task 8 effect `applyThemeAfterSave$`)
- [ ] La navegación a `/empresa` redirige a `/empresa/usuarios`

---

## Riesgos conocidos / asunciones a validar

1. **PrimeNG component names en v21:** algunos pueden haber cambiado (`InputSwitch` → `ToggleSwitch`, `Sidebar` → `Drawer`, `InputTextarea` standalone). Si un import falla, buscar el nombre correcto en docs de PrimeNG v21 y ajustar.
2. **`TenantConfig.id`:** se asume que existe ese campo. Si no, ajustar el `getTenantId()` en `white-label-api.service.ts` y `modulos-api.service.ts`.
3. **Backend envía email al crear usuario:** asunción del spec (sección 3). Si en QA no llega el email, abrir issue para implementar el modal de "link copiable" como fallback.
4. **`loadWhiteLabelFailure` con 404:** el toast genérico puede dispararse cuando el tenant nunca configuró su white-label. Si pasa, excluir 404 del effect `globalFailureToast$`.
5. **Permisos UI por rol:** el plan no oculta el botón "Invitar" según el rol del usuario logueado. El back valida con `@PreAuthorize('hasRole(ADMINISTRADOR)')`, así que un no-admin verá el botón pero recibirá 403. Mejora futura: leer rol del `auth.store` y ocultar.
6. **Sucursal del usuario:** la columna se muestra como número crudo (`u.branch`) porque el back devuelve `branch: Long` sin nombre. Si hay catálogo de sucursales, joinear visualmente en una iteración futura.
7. **Search sin debounce:** `UsuariosFiltrosComponent` dispara `setUsuariosFilters` (que a su vez dispara `loadUsuarios` vía `setFiltersPropagation$`) en cada `ngModelChange`. Esto hace una request por tecla. Mitigación rápida: agregar `debounceTime(300)` al effect `setFiltersPropagation$` envolviendo solo cuando el patch incluye `search`. Mejor solución: convertir el input search en un `FormControl` y usar `valueChanges.pipe(debounceTime(300))` en el componente. Si en QA es problema, aplicar antes de mergear.
