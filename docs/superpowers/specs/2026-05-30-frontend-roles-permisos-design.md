# Frontend — Roles y permisos (secciones por usuario) — Diseño

> **Fecha:** 2026-05-30
> **Repo:** FRONTEND-LABORATORIO · **Rama:** `feat/roles-permisos` (worktree `.worktrees/roles-permisos`, desde `development`)
> **Estado:** Diseño aprobado en brainstorming. Pendiente: writing-plans → jira-workflow (regla #1) → tasks.
> **Jira:** [KAN-60](https://exequielsantoro.atlassian.net/browse/KAN-60)
> **Backend:** consume la API de KAN-57 (permisos modulares por usuario), ya implementada.

## 1. Contexto y problema

El backend (KAN-57) agregó acceso por **sección** (área del menú) por usuario, enforced por interceptor, y expone:

| Endpoint | Uso |
|---|---|
| `GET /api/v1/access-sections` | Catálogo de secciones concedibles del tenant (las de módulos activos). |
| `GET /api/v1/user/{id}/access-sections` | Secciones concedidas a un usuario. |
| `PUT /api/v1/user/{id}/access-sections` | Reemplaza el set; body `{ "sections": [...] }`. |
| `GET /api/v1/me/access-sections` | Secciones efectivas del usuario logueado (admin → todas las activas; si no → concedidas ∩ activas). |

Hoy el frontend **no consume nada de esto**: el sidebar (`layout/sidebar/sidebar.nav.ts` → `NAV_SECTIONS`) se gatea por `moduleKey` (módulos activos del tenant) y `roleKey` (roles del JWT), y existe una página read-only de roles en `/roles`.

**Objetivo:** (A) una pantalla para que el dueño (`ADMINISTRADOR`) asigne secciones por usuario (enmascarando los roles), y (B) que el sidebar/menú de cada empleado se arme con sus secciones efectivas (`/me/access-sections`), alineado con el enforcement del backend.

## 2. Alcance

**Incluye:**
- Feature `features/roles-permisos/`: pantalla **master-detail** (lista de usuarios + checklist de secciones) que consume `GET /access-sections`, `GET|PUT /user/{id}/access-sections`. Reemplaza la página read-only de `/roles`.
- `core/access/`: carga `/me/access-sections` una vez al login; expone `mySections` (signal).
- Sidebar dirigido por secciones (enfoque A): `sectionKey` por item + filtro por `mySections`.
- `sectionGuard` liviano en las rutas de feature gateadas.

**No incluye (fuera de alcance / follow-ups):**
- Cambiar el alta de usuario (pantalla **Usuarios**) para sacar el rol funcional. Hoy el alta asigna `roleIds` (el backend sigue necesitando un rol interno para los workflows). "Derivar el rol de las secciones / ocultar roles en el alta" es un follow-up aparte.
- Read-only / niveles de acceso (el modelo es binario, igual que el backend).
- Backfill de usuarios existentes (es un tema de backend/deploy).

## 3. Decisiones (resultado del brainstorming)

| # | Decisión | Elegido |
|---|----------|---------|
| 1 | Alcance | **Pantalla de asignación + rewire del menú** (las dos). |
| 2 | Dónde asigna el dueño | **Pantalla dedicada** que reemplaza `/roles` read-only. |
| 3 | Layout de la pantalla | **Master-detail**: lista de usuarios + checklist de secciones del usuario elegido. |
| 4 | Gateo del menú | **Enfoque A**: dirigido por `/me/access-sections` (`sectionKey` por item, única fuente de verdad). |
| 5 | Lista de usuarios | **Se reusa** la del feature `empresa` (`loadUsuarios` / `selectAllUsuarios`). |

## 4. Arquitectura general

```
features/roles-permisos/        # pantalla de admin (asignar secciones por usuario)
  store/                        # NgRx clasico: catalogo + usuario seleccionado + working set
  pages/roles-permisos.page.ts  # smart, master-detail
  components/
    usuarios-picker.component.ts     # dumb, lista buscable de usuarios -> select(userId)
    secciones-checklist.component.ts # dumb, checkboxes agrupados por area
  services/roles-permisos-api.service.ts
  models/access-section.model.ts
  roles-permisos.routes.ts

core/access/                    # "mis secciones efectivas" (consumido por sidebar + guard)
  access.store.ts (signals)     # carga /me/access-sections una vez
  access.model.ts

layout/sidebar/                 # + sectionKey en NAV_SECTIONS, filtro por mySections
core/guards/section.guard.ts    # sectionGuard(section) en rutas gateadas
```

Stack: Angular 21 standalone + signals, NgRx clásico (para el slice de la pantalla), PrimeNG + Tailwind, Vitest. Reusa interceptores de auth/tenant existentes y `NotificationService`.

## 5. Feature `roles-permisos`

### 5.1 Modelo (`models/access-section.model.ts`)
- `type AccessSection = 'ATENCION' | 'EXTRACCIONES' | 'PREANALITICA' | 'ANALITICA' | 'POSTANALITICA' | 'PACIENTES' | 'TURNOS' | 'FINANCIERO' | 'OBRAS_SOCIALES' | 'STOCK' | 'PORTAL' | 'SUCURSALES'`.
- `interface SectionResponse { code: AccessSection; label: string }`.
- Metadato de **agrupación por área** para el checklist (ej. `ANALITICA-pipeline`: PREANALITICA/ANALITICA/POSTANALITICA; `Atención`: ATENCION/EXTRACCIONES; etc.) — solo presentación; el set que se manda es plano.

### 5.2 API (`services/roles-permisos-api.service.ts`)
`@Injectable({providedIn:'root'})`, inyecta `HttpClient`, base `/api/v1`:
- `getGrantable(): Observable<SectionResponse[]>` → `GET /access-sections`.
- `getUserSections(userId: number): Observable<SectionResponse[]>` → `GET /user/{id}/access-sections`.
- `setUserSections(userId: number, sections: AccessSection[]): Observable<void>` → `PUT /user/{id}/access-sections`, body `{ sections }`.

(El token y el `X-Tenant-ID` los agregan los interceptores existentes.)

### 5.3 Estado (NgRx clásico, `store/`)
- **State:** `catalog: SectionResponse[]`, `selectedUserId: number | null`, `grantedSet: AccessSection[]` (lo persistido del usuario elegido), `workingSet: AccessSection[]` (lo editado con los checks), `pending`, `saving`, `error`.
- **Selectors:** `selectCatalog`, `selectSelectedUserId`, `selectWorkingSet`, `selectIsDirty` (workingSet ≠ grantedSet), `selectPending`, `selectSaving`.
- **Actions:** `loadCatalog`/`Success`/`Failure`; `selectUser({userId})` → `loadUserSections`/`Success`/`Failure` (setea `grantedSet` + `workingSet`); `toggleSection({code})` (muta `workingSet`); `saveUserSections` → `Success`/`Failure`.
- **Effects:** `loadCatalog$` (`switchMap` → `getGrantable`); `loadUserSections$` (`switchMap` → `getUserSections`); `saveUserSections$` (`exhaustMap` → `setUserSections`, on success recarga `grantedSet` y dispara toast). Side-effect effects para toasts de éxito/error (patrón existente).
- Registrar en `app.config.ts`: `provideState(ROLES_PERMISOS_FEATURE_KEY, rolesPermisosReducer)`, `provideEffects(RolesPermisosEffects)`.

### 5.4 Pantalla `pages/roles-permisos.page.ts` (smart, master-detail)
- Al entrar: dispatch `empresa.loadUsuarios()` + `loadCatalog()`.
- **Izquierda** `usuarios-picker.component.ts` (dumb): `@Input usuarios`, búsqueda local, `@Output select(userId)`. Reusa los usuarios del store `empresa` (`selectAllUsuarios`). Resalta el seleccionado.
- **Derecha** `secciones-checklist.component.ts` (dumb): `@Input catalog` (agrupado por área) + `@Input workingSet` + `@Input disabled` (sin usuario elegido); `@Output toggle(code)`. Renderiza checkboxes agrupados (`p-checkbox`). Muestra **solo las secciones concedibles** (las que devuelve `/access-sections`).
- Botón **Guardar** (deshabilitado si `!isDirty` o `saving`) → dispatch `saveUserSections`. Toast de éxito; en error, toast español mapeado.
- Empty state cuando no hay usuario elegido ("Elegí un usuario para ver y editar sus accesos").
- **Acceso:** ruta y nav gateados por `roleKey: 'ADMINISTRADOR'` (más `sectionGuard` no aplica acá — es admin-only por rol).

### 5.5 Rutas
- `roles-permisos.routes.ts` con la página, `canMatch: [roleGuard('ADMINISTRADOR')]`.
- En `app.routes.ts`: el item/route `/roles` apunta a la nueva feature (lazy). Se **retira** la página read-only `features/empresa/pages/roles/` (el dato/`RolesApiService` se mantiene: lo usa el alta de Usuarios para `roleIds`).

## 6. `core/access` — mis secciones efectivas

- `access.store.ts` (signals, `providedIn:'root'`): `mySections: Signal<ReadonlySet<AccessSection>>`, `loaded: Signal<boolean>`, método `load()` que llama `GET /me/access-sections` y guarda el set.
- **Cuándo carga:** en el resolver del `admin-shell` (junto al `tenantResolver`) o en un effect tras login-success, antes de pintar el shell. Si el token ya es válido al bootstrap, se carga igual.
- Admin: `/me` ya devuelve todas las secciones activas (bypass del backend) → sin caso especial en el front.
- Se limpia en logout.

## 7. Sidebar dirigido por secciones (enfoque A)

- `NavLink`/`NavChild` gana `sectionKey?: AccessSection`.
- **Mapeo en `sidebar.nav.ts`:**
  - Analítica (expandable) → hijos: `Pre-analítica`=`PREANALITICA`, `Analítica`=`ANALITICA`, `Post-analítica`=`POSTANALITICA`. El expandable se muestra si algún hijo es visible.
  - `Pacientes`=`PACIENTES` · `Turnos`=`TURNOS` · `Atención`=`ATENCION` · `Financiero`=`FINANCIERO` · `Obras Sociales`=`OBRAS_SOCIALES` · `Sucursales`=`SUCURSALES`.
  - `Inicio` → sin `sectionKey` (siempre). `Empresa`, `Roles y permisos` → sin `sectionKey`, `roleKey: 'ADMINISTRADOR'`.
  - (`Extracciones`, `Stock`, `Portal` → se mapean cuando esos items existan en el nav.)
- **`visibleSections()` (computed):** un item es visible si:
  - no tiene `sectionKey` → lógica actual (`moduleKey`/`roleKey`), **o**
  - tiene `sectionKey` → `mySections().has(sectionKey)`.
- Esto reemplaza el gateo por `moduleKey`-por-usuario en los items con sección, con la misma fuente que enforce el backend. (Los `moduleKey` puros sin sección, si quedara alguno, siguen funcionando.)

## 8. `sectionGuard` (capa por-usuario en rutas)

- `core/guards/section.guard.ts`: `sectionGuard(section: AccessSection): CanMatchFn` → pasa si `accessStore.mySections().has(section)`; si no, redirige a `/home`. Admin pasa (su set tiene todo lo activo).
- Se aplica en las rutas de feature gateadas (turnos, analitica/*, financiero, sucursales, etc.), **conviviendo** con el `moduleActiveGuard` (tenant) existente: el `sectionGuard` es la capa por-usuario; el `moduleActiveGuard` la de tenant.
- Evita que tipear la URL muestre una pantalla que el backend igual cortaría con 403.

## 9. Errores e i18n

- Todos los mensajes en **español, user-friendly, sin leak** (regla #4 del CLAUDE.md FE). El `PUT` puede devolver error de dominio (ej. "No se puede habilitar la sección X: el módulo no está activado") → se muestra tal cual si es español limpio, o genérico si trae marcadores de internals. Mapeo vía `NotificationService`/helper por código HTTP.
- Sin emojis Unicode — PrimeIcons (`pi pi-shield`, `pi pi-check`, etc.).
- UI 100% en español hardcodeado (no hay i18n).

## 10. Tests (Vitest, obligatorios)

- Slice: reducer (toggle, load, save, dirty), effects (load/save + toasts), selectors (`selectIsDirty`, `selectWorkingSet`).
- `core/access`: carga de `/me`, set resultante, limpieza en logout.
- `sectionGuard`: permite/redirige según `mySections` (admin pasa).
- Sidebar `visibleSections()`: item con sección concedida se ve; sin la sección no; items sin `sectionKey` mantienen su lógica.
- Page smoke test: render, selección de usuario, toggle, guardar (dispatch correcto).

## 11. Decisiones abiertas / follow-ups

- **Alta de Usuarios y roles**: la pantalla Usuarios sigue asignando `roleIds`. Ocultar/derivar el rol funcional en el alta es follow-up aparte (depende del backend, que hoy necesita un rol).
- **Carga de `/me`**: resolver del shell vs effect post-login — se fija en tasks según dónde encaje mejor con el `tenantResolver` actual.
- **Agrupación por área del checklist**: el mapeo exacto área→secciones se confirma con el diseño visual al implementar (presentación, no afecta el contrato).

## 12. Checklist de cierre

- [ ] Slice cubierto por tests (reducer/effects/selectors).
- [ ] `core/access` + `sectionGuard` con tests.
- [ ] Sidebar: `visibleSections()` con tests; items mapeados a `sectionKey`.
- [ ] Pantalla master-detail funcionando contra los 3 endpoints de admin.
- [ ] `/me/access-sections` carga al login y arma el menú.
- [ ] Página read-only de `/roles` retirada; nav repunta a la nueva.
- [ ] Errores en español, sin leak; sin emojis Unicode.
- [ ] PR contra `development` con su Jira linkeado.
