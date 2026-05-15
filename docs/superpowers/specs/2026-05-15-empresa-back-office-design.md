# Empresa — Back-office del tenant (Usuarios + Roles + White-label + Módulos)

**Fecha:** 2026-05-15
**Repo:** FRONTEND-LABORATORIO (Angular 17+, NgRx)
**Backend de referencia:** TESIS/Backend (Spring Boot, Clean Architecture, multi-tenant)

## 1. Objetivo

Implementar la pantalla `/empresa` del back-office para que un administrador de un tenant pueda:

1. Gestionar usuarios internos del tenant (ABM + búsqueda + cambio de estado + reenvío de invitación).
2. Consultar la lista de roles del sistema (read-only).
3. Editar la identidad visual del tenant (white-label).
4. Activar/desactivar módulos opcionales del tenant.

Las pestañas Fiscal y SMTP/Docs quedan visibles pero como placeholder, porque el backend no expone aún esos recursos.

## 2. Alcance

### Dentro del scope
- Tab **Usuarios**: lista paginada con filtros, crear, editar, activar/desactivar con motivo, reenviar email de verificación, regenerar token de primer login.
- Tab **Roles**: listado readonly de roles del sistema.
- Tab **White-label**: edición de `systemName`, `primaryColor`, `secondaryColor`, `lightLogoUrl`, `darkLogoUrl` con preview en vivo. Sin upload de archivos (solo URLs).
- Tab **Módulos**: lista de módulos activables con toggle ON/OFF y confirm modal.
- Tabs **Fiscal** y **SMTP/Docs**: placeholder "Próximamente".

### Fuera del scope
- CRUD de roles (el back solo expone listar).
- Upload real de logo (no hay endpoint).
- Edición de "Datos de la empresa" (Razón social, CUIT) — no hay endpoint para que el tenant edite sus propios datos.
- Modal "Preview Login" (queda para después).
- Asignación de sucursal a usuarios (los DTOs de create/update no aceptan `branch`). La columna sucursal aparece en el listado readonly.

## 3. Backend de referencia

| Recurso | Endpoint | Notas |
|---|---|---|
| Listar/buscar usuarios | `GET /api/v1/user/search` | Paginado, filtros: `search`, `isActive`, `isExternal`, `roleIds`, `sortBy`, `sortDirection`, `page`, `size`. UI fija `isExternal=false`. |
| Detalle usuario | `GET /api/v1/user/{id}` | |
| Crear usuario interno | `POST /api/v1/user/internal` | Requiere ROL `ADMINISTRADOR`. Devuelve `{ user, firstLoginToken }`. **Asunción:** el back envía email de invitación; el `firstLoginToken` no se muestra en la UI. |
| Actualizar usuario | `PUT /api/v1/user/{id}` | Requiere ROL `ADMINISTRADOR`. |
| Cambiar estado | `PATCH /api/v1/user/{id}/status` | Body `{ isActive, reason }`. UI obliga `reason` al desactivar. |
| Listar roles | `GET /api/v1/role/` | Lista corta del sistema. Cacheada en el slice `empresa.roles`. |
| Reenviar verificación email | `POST /api/v1/auth/email/resend?userId=` | Requiere ADMIN. |
| Regenerar token primer login | `POST /api/v1/auth/first-login/generate-token?userId=` | Requiere ADMIN. Acción secundaria en menú "..." de la fila. |
| Get white-label | `GET /api/v1/saas-admin/tenants/{tenantId}/white-label` | `tenantId` se obtiene del `tenant.store` (JWT). |
| Save white-label | `PUT /api/v1/saas-admin/tenants/{tenantId}/white-label` | Body: `systemName`, `primaryColor` (hex), `secondaryColor` (hex), `lightLogoUrl`, `darkLogoUrl`. |
| Listar módulos del tenant | `GET /api/v1/saas-admin/tenants/{tenantId}/modules` | |
| Toggle módulo | `PUT /api/v1/saas-admin/tenants/{tenantId}/modules/{moduleCode}` | Body `{ enable: boolean }`. |

### Asunción a validar
El backend envía un email de invitación al crear un usuario interno. La UI muestra "Invitación enviada al email del usuario" sin exponer el `firstLoginToken`. Si en runtime se confirma que no se envía, se cambia a un modal con link copiable en una iteración posterior.

## 4. Estructura de archivos

```
features/empresa/
├── empresa.routes.ts                 (ya existe — actualizar con placeholders)
├── empresa-dashboard/
│   └── empresa-dashboard.component.ts (layout con tabs, sin botón global "Guardar")
├── models/
│   ├── usuario.model.ts              (UsuarioDto, CrearUsuarioDto, ActualizarUsuarioDto, BuscarUsuariosParams, PaginatedUsuarios)
│   ├── rol.model.ts                  (RolDto)
│   ├── white-label.model.ts          (WhiteLabelDto, GuardarWhiteLabelDto)
│   └── modulo.model.ts               (ModuloTenantDto, ModuleCode)
├── services/
│   ├── usuarios-api.service.ts
│   ├── roles-api.service.ts
│   ├── auth-admin-api.service.ts
│   ├── white-label-api.service.ts
│   └── modulos-api.service.ts
├── store/
│   ├── empresa.state.ts              (root state que combina slices)
│   ├── usuarios/
│   │   ├── usuarios.actions.ts
│   │   ├── usuarios.reducer.ts
│   │   ├── usuarios.selectors.ts
│   │   └── usuarios.effects.ts
│   ├── roles/    (mismos archivos)
│   ├── white-label/    (mismos archivos)
│   └── modulos/    (mismos archivos)
├── pages/
│   ├── usuarios/
│   │   ├── usuarios.component.ts     (página)
│   │   ├── usuarios-table.component.ts
│   │   ├── usuarios-filtros.component.ts
│   │   ├── usuario-form-dialog.component.ts
│   │   └── toggle-status-dialog.component.ts
│   ├── roles/
│   │   └── roles.component.ts
│   ├── white-label/
│   │   ├── white-label.component.ts
│   │   └── white-label-preview.component.ts
│   ├── modulos/
│   │   ├── modulos.component.ts
│   │   └── modulo-toggle-confirm.component.ts
│   ├── fiscal/
│   │   └── fiscal.component.ts       (usa EmptyStatePlaceholder)
│   └── smtp-docs/
│       └── smtp-docs.component.ts    (usa EmptyStatePlaceholder)
└── shared/
    └── empty-state-placeholder.component.ts
```

`empresa.service.ts` y `models/empresa.model.ts` actuales se reemplazan/borran. El scaffolding de store flat (`empresa.actions.ts` etc.) se reemplaza por la estructura por slice.

## 5. Diseño por tab

### 5.1 Tab Usuarios

**Layout:** ancho completo (sin card derecho). Filtros arriba, tabla abajo, botón "+ Invitar" arriba a la derecha.

**Tabla — columnas:**
- Avatar (iniciales coloreadas según hash del nombre)
- Usuario (nombre completo + email debajo en gris)
- Rol(es) (chips, uno por rol)
- Sucursal (texto, **readonly**, viene de `branch` del DTO)
- Estado (chip Activo verde / Inactivo amarillo)
- Acciones: ✏️ editar · toggle status · menú "..." con "Reenviar verificación" y "Regenerar invitación"

**Filtros:**
- Search box (busca en nombre, email, document, username)
- Multiselect de roles
- Select estado: Todos / Activo / Inactivo

**Modal crear/editar (`UsuarioFormDialogComponent`):**
- Campos: firstName, lastName, email, document, username, roleIds (multiselect cargado desde `empresa.roles`)
- En edit los mismos campos editables (incluye email y username)
- Validaciones: requeridos, email formato, document único (validado por back, error mapeado al control)

**Modal toggle status (`ToggleStatusDialogComponent`):**
- Al **desactivar**: textarea "Motivo" obligatorio + confirm
- Al **activar**: confirm simple sin textarea (motivo se envía vacío o "Reactivación")

**Permisos UI:** botones "+ Invitar", editar, toggle, menú "..." se ocultan si el user logueado no tiene rol `ADMINISTRADOR`. Se chequea contra el `auth.store` o el token decodificado (verificar qué expone el FE).

**Filtro fijo:** todos los queries usan `isExternal=false` — esta pantalla solo lista usuarios internos del tenant.

**Paginación:** servidor (page/size). Tamaño default 20.

### 5.2 Tab Roles

`RolesComponent` solo renderiza una tabla readonly con `code`, `description`, `hierarchy`. Cartelito informativo: *"Los roles los gestiona el administrador de la plataforma. Para asignarlos a un usuario, andá a la pestaña Usuarios."*

La lista se cachea en `empresa.roles` y la consume también el form de Usuarios.

La ruta top-level `/roles` queda como **alias** que renderiza `RolesComponent`.

### 5.3 Tab White-label

**Layout:** dos columnas.

**Columna izquierda — form reactivo:**
- `systemName` (text, requerido)
- `primaryColor` (color picker + input hex, requerido, regex `#[0-9A-Fa-f]{6}`)
- `secondaryColor` (idem)
- `lightLogoUrl` (input URL, opcional, con preview de imagen al lado)
- `darkLogoUrl` (idem)
- Cartelito: *"Próximamente vas a poder subir el logo directamente."*

**Columna derecha — preview en vivo:**
Card con un sidebar mock + topbar mock que se actualiza con cada cambio del form (sin guardar). Sirve para ver cómo quedan los colores y el logo antes de aplicar.

**Sección informativa readonly:** *"La identidad visual aplica a las zonas de gestión y portal del tenant. Las zonas clínicas mantienen una paleta fija."*

**Botones:** "Guardar cambios" deshabilitado mientras el form esté `pristine` o `invalid`.

**Side effect post-save:** disparar refresh del `tenant-theme.service` (ya existe en `core/tenant/`) para que sidebar/topbar de la app reflejen los nuevos colores sin recargar.

### 5.4 Tab Módulos

**Layout:** lista vertical de cards (uno por módulo) — Portal, Turnos, Financiero, Médicos, Stock (los del enum `ModuleKey` del FE).

Cada card:
- Icono + nombre del módulo + descripción corta (hardcodeados en un mapa `ModuleKey → { label, desc, icon }` en el FE; el back solo manda `moduleCode`)
- Toggle ON/OFF a la derecha
- Chip "Activo" / "Inactivo"

**Confirm modal al togglear:** *"¿Activar/Desactivar el módulo X? Los usuarios perderán/ganarán acceso a esa sección."*

**Side effect post-toggle:** invalidar `module-registry` (ya existe en `core/tenant/`) para que el `moduleActiveGuard` y la sidebar reflejen el cambio sin recargar.

### 5.5 Tabs placeholder (Fiscal, SMTP/Docs)

Cada uno es un `*Component` mínimo que renderiza el mismo `EmptyStatePlaceholderComponent` reusable:
- Icono grande
- Título "Próximamente"
- Texto: *"Esta sección requiere endpoints que aún no están disponibles en el backend."*
- Sin acciones

Las rutas siguen registradas — la pestaña aparece siempre.

## 6. Estado (NgRx)

Patrón consistente con `features/pacientes`. La feature `empresa` registra un root state que combina cuatro slices.

### 6.1 Slice `usuarios`

```ts
interface UsuariosState {
  list: UsuarioDto[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  filters: BuscarUsuariosParams;
  loading: boolean;
  mutating: boolean;       // create/update/toggle/resend en curso
  error: HttpErrorResponse | null;
  selected: UsuarioDto | null;  // para edit modal
}
```

Actions (cada una con `*Success` y `*Failure`):
- `loadUsersPage({ page, size })`
- `searchUsers({ filters })`
- `loadUserDetail({ id })`
- `createUser({ payload })` → success dispara toast "Invitación enviada"
- `updateUser({ id, payload })`
- `toggleStatus({ id, isActive, reason })`
- `resendInvite({ userId })`
- `regenerateFirstLoginToken({ userId })`

### 6.2 Slice `roles`

```ts
interface RolesState {
  list: RolDto[];
  loading: boolean;
  loaded: boolean;        // evita recargar si ya está
  error: HttpErrorResponse | null;
}
```

Actions: `loadRoles`, `loadRolesSuccess`, `loadRolesFailure`.

### 6.3 Slice `whiteLabel`

```ts
interface WhiteLabelState {
  data: WhiteLabelDto | null;
  loading: boolean;
  saving: boolean;
  error: HttpErrorResponse | null;
}
```

Actions: `loadWhiteLabel`, `saveWhiteLabel({ payload })` + success/failure. `saveWhiteLabelSuccess` además dispara refresh del `tenant-theme.service`.

### 6.4 Slice `modulos`

```ts
interface ModulosState {
  list: ModuloTenantDto[];
  loading: boolean;
  toggling: Set<ModuleCode>;  // toggles individuales en curso
  error: HttpErrorResponse | null;
}
```

Actions: `loadModulos`, `toggleModulo({ code, enable })` + success/failure. `toggleModuloSuccess` además invalida `module-registry`.

### 6.5 Effect global de errores

En `empresa.effects.ts` un effect escucha cualquier `*Failure` del feature y dispara:
```ts
notification.error(err.error?.message ?? err.message ?? 'Error inesperado')
```

Si el form modal está abierto y la respuesta es 400 con `errors[]`, un helper `applyServerErrors(form, error)` mapea los errores a los controles en lugar de un toast.

## 7. Servicios HTTP

Un service por dominio, pegado al controller del back. Cada uno inyecta `HttpClient` y un base URL config-driven.

Los services de white-label y modulos leen el `tenantId` del `tenant.store` y arman el path — los componentes no lo pasan.

Sin retry automático, sin caching propio (el cache está en NgRx).

## 8. Modelos TS

Mapeo 1:1 con DTOs del back. El back manda `camelCase`, no hay conversión.

```ts
// usuario.model.ts
export interface UsuarioDto {
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
  roles: RolDto[];
}

export interface CrearUsuarioDto {
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  username: string;
  roleIds: number[];
}

export interface ActualizarUsuarioDto extends CrearUsuarioDto {}

export interface BuscarUsuariosParams {
  search?: string;
  isActive?: boolean;
  roleIds?: number[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

Análogos para `RolDto`, `WhiteLabelDto`, `GuardarWhiteLabelDto`, `ModuloTenantDto`, `ModuleCode` (enum string-based).

## 9. Estados de carga, errores, empty states

**Carga:**
- Tabla de usuarios: skeleton de 5 filas mientras `loading`
- Forms de white-label/módulos: spinner overlay en el botón "Guardar" mientras `saving`
- Toggle de módulo: el toggle queda en estado loading (visible) hasta que vuelve la respuesta — usa el `Set<ModuleCode>` `toggling`
- Roles: skeleton corto

**Empty states:**
- Sin usuarios que matchean filtros → ilustración + "No hay usuarios con esos filtros" + botón "Limpiar filtros"
- White-label nunca configurado (404 del back) → form vacío con valores default visibles, sin error toast

**Errores:** ver sección 6.5.

**Accesibilidad:** roles ARIA en tabs, toggles, modals. Foco visible. Cierre de modal con Esc. Labels asociados.

## 10. Testing

Patrón mínimo viable, alineado con `features/pacientes`:

- Unit tests de **reducers** (estado puro) — un spec por slice
- Unit tests de **selectors**
- Unit tests de **effects** con `provideMockActions` y mock de los API services — happy path + un failure por acción
- Unit tests de **services HTTP** con `HttpTestingController` — verifican URL, verbo y body
- Sin tests de componentes en este sprint

## 11. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Botón global "Guardar cambios" del mockup | Eliminado. Cada tab tiene su propio botón. |
| Pestañas Fiscal/SMTP/Docs | Visibles con placeholder "Próximamente". |
| firstLoginToken al crear usuario | Asumimos que el back envía email; no se muestra en UI. |
| Logo upload | Solo input de URL en este sprint. |
| Sucursal en form de usuario | No incluida (DTO del back no la acepta). Readonly en el listado. |
| Motivo al desactivar | Obligatorio (textarea en modal). Al reactivar es opcional. |
| Modal "Preview Login" del mockup | Fuera del scope. |
| Estado | NgRx con un slice por dominio (usuarios/roles/white-label/modulos), igual que pacientes. |
| Servicios HTTP | Uno por recurso (5 services), no un service monolítico. |
| Ruta `/roles` top-level | Alias del mismo `RolesComponent` del tab. |

## 12. Fuera de scope (futuras iteraciones)

- Endpoint de upload de archivos para logos
- Endpoint para que el tenant edite sus datos fiscales (Razón social, CUIT, dirección)
- Configuración SMTP del tenant
- Plantillas de documentos
- Modal "Preview Login"
- Permitir asignar sucursal al crear/editar usuarios (cuando el back lo soporte)
- Confirmar/cambiar el flujo de invitación si el back NO envía email
- Modal con link copiable de primer login (si email no llega)
- Tests de componentes (si la feature crece)
