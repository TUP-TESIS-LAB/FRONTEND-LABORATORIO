# SaaS Admin — MVP A (gestión de tenants, módulos y white-label)

## Contexto

El backend ya expone bajo `/api/v1/saas-admin/**` los 4 controllers necesarios
para operar la plataforma a nivel SaaS (Organization, Tenant, TenantModule,
TenantWhiteLabel), todos protegidos por `ROLE_SAAS_ADMIN`. El frontend tiene
únicamente un placeholder en `/admin` dentro del shell del laboratorio
(`AdminShellComponent`).

Este spec define el **MVP A**: un panel de SaaS Admin **separado físicamente
del shell del laboratorio**, con login propio, dashboard, gestión completa de
tenants y configuración por tenant (módulos + white-label). No incluye
métricas reales (eso queda para el sub-proyecto B) ni seed/onboarding
automatizado (también B).

## Decisiones de alto nivel

- **Shell separado bajo `/saas/**`.** Nuevo `SaasShellComponent` con su propio
  topbar/sidebar y branding navy + dorado. No reusa `AdminShellComponent` ni
  aplica `tenantConfig` (es plataforma, no tenant).
- **Login propio en `/saas/login`** con branding de plataforma. Reusa
  `AuthApiService` (`POST /auth/login`), agrega validación de rol post-login:
  solo `ROLE_SAAS_ADMIN` puede entrar.
- **Scope MVP A**: login + dashboard + lista de tenants + detalle de tenant
  con tabs (Info / Módulos / White-label). NO incluye pantalla de
  Organization (singleton de plataforma).
- **Métricas client-side derivadas** desde `GET /tenants` para el dashboard.
  Cuando llegue el sub-proyecto B con endpoints agregados, se reemplazan sin
  tocar el shell.
- **Branding visual**: navy oscuro + acento dorado. Cards limpias con número
  grande + label, sin la barra lateral dorada al estilo "Claude card".

## Arquitectura

### Routing

```
/login                ← lab (existente, sin cambios)
/saas/login           ← nuevo, fuera del SaasShell (es la entrada)
/saas                 ← dashboard, dentro del SaasShell
/saas/tenants         ← lista
/saas/tenants/:id     ← detalle con tabs (info, modules, white-label)
```

Todas las rutas bajo `/saas/**` (salvo `/saas/login`) van enrolladas en
`SaasShellComponent` y protegidas por `authGuard` + `saasAdminGuard` (el
segundo exige `ROLE_SAAS_ADMIN` en el JWT).

### Estructura de archivos

```
src/app/
├── layout/saas-shell/
│   ├── saas-shell.component.ts          ← layout principal
│   ├── saas-sidebar/
│   │   └── saas-sidebar.component.ts
│   └── saas-topbar/
│       └── saas-topbar.component.ts
├── core/guards/
│   └── saas-admin.guard.ts              ← nuevo
└── features/saas-admin/
    ├── saas-admin.routes.ts
    ├── pages/
    │   ├── saas-login/saas-login.page.ts
    │   ├── dashboard/dashboard.page.ts
    │   ├── tenants-list/tenants-list.page.ts
    │   └── tenant-detail/
    │       ├── tenant-detail.page.ts
    │       └── tabs/
    │           ├── tenant-info-tab.component.ts
    │           ├── tenant-modules-tab.component.ts
    │           └── tenant-white-label-tab.component.ts
    ├── components/
    │   └── tenant-form-dialog/tenant-form-dialog.component.ts
    ├── services/
    │   └── saas-admin-api.service.ts
    ├── models/
    │   ├── organization.model.ts
    │   ├── tenant.model.ts
    │   ├── tenant-module.model.ts
    │   └── tenant-white-label.model.ts
    └── store/
        ├── saas-admin.actions.ts
        ├── saas-admin.effects.ts
        ├── saas-admin.reducer.ts
        ├── saas-admin.selectors.ts
        └── saas-admin.state.ts
```

### Store (NgRx clásico)

Feature key: `saasAdmin`. Shape:

```ts
interface SaasAdminState {
  tenants: Tenant[];                                 // lista completa (BE no pagina)
  selectedTenant: Tenant | null;
  selectedTenantModules: ModuleCode[] | null;        // módulos habilitados del tenant abierto
  selectedTenantWhiteLabel: TenantWhiteLabel | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}
```

Patrón clásico del repo: `loadX` para reads (`switchMap`), `addX` / `updateX`
/ `removeX` para mutations (`concatMap`/`exhaustMap`), todas con sus
`*Success`/`*Failure`. Pessimistic updates (no optimistic).

**Actions:**

- Reads: `loadTenants`, `loadTenant`, `loadTenantModules`, `loadTenantWhiteLabel`
- Mutations: `createTenant`, `renameTenant`, `activateTenant`,
  `deactivateTenant`, `softDeleteTenant`, `toggleTenantModule`,
  `upsertTenantWhiteLabel`

**Selectors expuestos como `selectSignal`:**

- `selectTenantsList`, `selectActiveTenants`, `selectInactiveTenants`,
  `selectDeletedTenants`
- `selectDashboardCounts` (computed: total / active / inactive / deleted)
- `selectSelectedTenant`, `selectSelectedTenantModules`,
  `selectSelectedTenantWhiteLabel`
- `selectSaasAdminPending`, `selectSaasAdminError`

### Auth flow

1. Usuario abre `/saas/login`.
2. Submit → `AuthApiService.login()` → token llega con claim `roles`.
3. FE valida si `roles` incluye `SAAS_ADMIN`.
4. ✅ → `router.navigate(['/saas'])`.
5. ❌ → toast danger "Este acceso es solo para administradores de
   plataforma." + `tokens.clear()` + queda en `/saas/login`.

`saasAdminGuard` se aplica a `/saas/**` (salvo `/saas/login`): si no hay
token o no hay rol, redirige a `/saas/login`.

Logout desde el shell SaaS limpia el token y vuelve a `/saas/login` (no a
`/login` del lab).

El interceptor existente que captura 401 → `/login` se actualiza para
detectar si la URL actual empieza con `/saas/` y redirigir a `/saas/login`
en ese caso.

El effect de `loadTenantConfig` (que dispara en bootstrap si hay token)
ignora silenciosamente el error cuando el path actual está en `/saas/**` —
el SaaS admin no opera contra un tenant.

## Pantallas

### `/saas/login`

Layout centrado vertical, fondo navy oscuro con degradado sutil al dorado.
Card central con:

- Logo de plataforma (reusar `public/logo.svg`).
- Título "Platform Admin · Acceso".
- Form: email, password.
- Botón "Ingresar".
- Footer: "¿Sos usuario del laboratorio? Ingresá por `/login`."

No muestra link de "Olvidé contraseña" ni "Crear cuenta" — no aplican para
SaaS admin.

### `/saas` (Dashboard)

```
┌─ Topbar saas ────────────────────────────────────────┐
├─ Sidebar ──┬─ Page content ────────────────────────┤
│            │  H1: Dashboard                         │
│            │                                        │
│            │  [Total 12] [Activos 10] [Inactivos 2] [Eliminados 1]
│            │                                        │
│            │  ── Acciones rápidas ──                │
│            │  [+ Nuevo tenant] [Ver todos los tenants]
│            │                                        │
│            │  ── Tenants recientes (top 5) ──       │
│            │  Tabla pelada: código · nombre · status · acciones
└────────────┴────────────────────────────────────────┘
```

- 4 cards con número grande + label. Fondo navy levemente más claro que el
  body, **sin** la barra lateral dorada del mockup C. Acento dorado se
  reserva para hovers, focus rings y el ícono del logo.
- "Tenants recientes" = los últimos 5 de la lista, ordenados por `id`
  descendente (BE no expone `createdAt` en `TenantResponse`).

### `/saas/tenants` (Lista)

`p-table` con paginación client-side (BE no pagina).

**Columnas:** Código · Nombre · Status (tag ACTIVE/INACTIVE) · Active /
Eliminado (tag) · Acciones.

**Toolbar:**

- Input de búsqueda (filtra por código o nombre — client-side).
- Filtros rápidos: `[Todos] [Activos] [Inactivos] [Eliminados]`.
- Botón `[+ Nuevo tenant]` → abre `TenantFormDialog`.

**Acciones por fila** (íconos directos, no 3-dot menu):

- 👁️ Ver detalle → `/saas/tenants/:id`.
- ✏️ Renombrar → `TenantFormDialog` en modo edit.
- ⏯ Activar/Desactivar → `p-confirmDialog` → dispatch.
- 🗑️ Eliminar (soft) → `p-confirmDialog` con texto:
  "Esto desactivará el tenant y dejará de ser visible. Los datos no se
  borran." → dispatch.

Tenants soft-deleted aparecen tachados / con tag rojo "Eliminado". No hay
acción de restaurar (BE no la expone).

### `TenantFormDialog`

PrimeNG Dialog modal con `ReactiveFormsModule`.

- **Modo create**: campos `code` (required, pattern `^[a-z0-9-]+$`) +
  `name` (required). Si BE responde 409, error inline "Ese código ya
  existe".
- **Modo rename**: solo `name`; `code` disabled.

Submit dispara `createTenant` o `renameTenant`. El dialog escucha
`Actions.pipe(ofType(...Success))` para cerrarse en éxito.

### `/saas/tenants/:id` (Detalle con tabs)

Header sticky con back button + título dinámico (`tenant.name`) + tags de
status. Debajo, `p-tabs` con 3 tabs.

`ngOnInit` dispatchea en paralelo `loadTenant`, `loadTenantModules`,
`loadTenantWhiteLabel`. Skeleton mientras alguno esté `pending`.

#### Tab 1 — Info general

Form con:

- `code` (read-only).
- `name` (editable). Botón `[Guardar nombre]` aparece solo si `dirty`.
- Tags de status, `active`, `deletedAt` si aplica.
- Botones: `[Activar]` / `[Desactivar]` (según estado), `[Eliminar]`
  (soft, con confirm).

#### Tab 2 — Módulos

Dos secciones:

**Módulos del core (siempre activos):**

- 3 cards read-only con `EMPRESA`, `SUCURSALES`, `ANALITICA` + tag "Core".

**Módulos activables:**

- 5 filas con `PORTAL`, `TURNOS`, `FINANCIERO`, `STOCK`, `FAMILIA`.
- Cada fila: ícono + nombre + descripción corta + `p-inputSwitch`.
- Estado inicial: cruzar `selectedTenantModules` (set habilitados) con la
  lista hardcoded.
- Toggle dispara `toggleTenantModule(tenantId, code, enable)` inmediato
  (sin "guardar"). Switch queda disabled hasta que vuelve la respuesta;
  los otros 4 switches siguen operativos.

La lista hardcoded del FE de los 5 ACTIVABLES vive en `models/module-key`
(ya existe).

#### Tab 3 — White-label

Form reactivo con:

- `systemName` (text, required).
- `primaryColor` (color picker + input hex, pattern `^#[0-9A-Fa-f]{6}$`).
- `secondaryColor` (idem).
- `lightLogoUrl` / `darkLogoUrl` (URL inputs, nullable).

Panel "Preview" al costado:

- Chip con `systemName`.
- Dos cuadrados con los colores.
- Dos `<img>` con los logos (light + dark backgrounds).

Sticky footer con botón `[Guardar]` que dispara `upsertTenantWhiteLabel`.
Disabled cuando el form es pristine o inválido.

## Errores y edge cases

| Caso | Tratamiento |
|---|---|
| 401 en `/saas/**` | Interceptor existente, modificado para que en `/saas/*` redirija a `/saas/login` en lugar de `/login`. Limpia token. |
| 403 (sin `ROLE_SAAS_ADMIN`) | Toast danger + redirect a `/saas/login`. El `saasAdminGuard` también captura esto antes de entrar. |
| 409 al crear tenant | Effect emite `createTenantFailure`; el dialog lo escucha y muestra error inline, no cierra. |
| Network / 5xx | Toast genérico "No se pudo conectar con la plataforma". Reducer guarda el error. |
| `loadTenantConfig` falla en `/saas/**` | Effect ignora el error si la URL actual empieza con `/saas/`. |
| Refresh en `/saas/tenants/:id` | Tres dispatches en `ngOnInit`, skeletons mientras tanto. Si `loadTenant` da 404 → redirect a `/saas/tenants` con toast "Tenant no encontrado". |
| Toggle de módulo mientras está pending | Solo ese switch queda disabled. Los otros 4 siguen operativos. |
| Tenant `code` con caracteres inválidos | Pattern client-side `^[a-z0-9-]+$`. BE acepta más pero forzamos consistencia. |

## Testing

**Unit tests (Vitest):**

- `saas-admin.reducer.spec.ts` — un test por handler relevante.
- `saas-admin.effects.spec.ts` — un test por effect (`HttpTestingController`
  para validar URL/payload).
- `saas-admin.selectors.spec.ts` — `selectDashboardCounts` con varios
  estados de la lista.
- `saas-admin-api.service.spec.ts` — verifica paths contra
  `/api/v1/saas-admin/...`.

**Component tests:**

- `saas-login.page.spec.ts` — submit con rol válido navega; sin rol limpia
  token y muestra toast.
- `tenants-list.page.spec.ts` — filtros, búsqueda, "Nuevo tenant" abre
  dialog.
- `tenant-detail.page.spec.ts` — los 3 effects de carga se dispatchean en
  `ngOnInit`; tabs renderizan.
- `tenant-modules-tab.spec.ts` — combina set habilitado con lista
  hardcoded; toggle dispatchea con el código correcto.
- `tenant-white-label-tab.spec.ts` — submit dispara
  `upsertTenantWhiteLabel`; preview refleja el form.

**Guard:**

- `saas-admin.guard.spec.ts` — token con `ROLE_SAAS_ADMIN` permite; sin
  token redirige; con token sin rol redirige.

**Smoke manual:**

- Login lab (`/login` con `admin@test.com / password`) sigue funcionando.
- Login SaaS (`/saas/login` con un user que tenga `ROLE_SAAS_ADMIN`).
- Crear / renombrar / activar / desactivar / eliminar tenant.
- Toggle de módulo verificable con `curl` contra el BE.
- Editar white-label y ver preview reflejado.

## Riesgos y notas para implementación

- **El seed local no trae un usuario con `ROLE_SAAS_ADMIN`.** El plan de
  implementación tiene que documentar cómo crear ese usuario manualmente
  (UPDATE en `user_roles` o agregar una migración local complementaria),
  porque sin eso no se puede probar el login del SaaS.
- **`tenantConfig` en bootstrap puede fallar para SaaS admin.** El `effect`
  actual de `loadTenantConfigFailure` no debería romper la app si el usuario
  está logueando como saas admin. Ya hay que ajustar el effect para que
  ignore el error si la ruta está en `/saas/**`.
- **Lista hardcoded de módulos en FE vs BE**: si el BE agrega un nuevo
  ACTIVABLE, el FE no lo va a mostrar hasta actualizar la lista. Aceptable
  en MVP. Sub-proyecto B podría agregar un `GET /saas-admin/modules/registry`
  para que el FE descubra dinámicamente.
- **Branding visual queda en segunda prioridad.** El usuario indicó que la
  funcionalidad pesa más que la estética. El equipo puede iterar el CSS
  durante implementación sin requerir nuevo spec.
