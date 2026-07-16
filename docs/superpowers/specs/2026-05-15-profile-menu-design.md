# Profile Menu (Topbar) Design Spec

**Status:** Approved (awaiting implementation plan)
**Date:** 2026-05-15
**Branch:** `feature/auth` (incluido en el PR de auth)
**Mockup reference:** `.superpowers/brainstorm/599-1778424925/content/full-mockup-v2.html` (líneas 277–340 CSS, 586–700 HTML, 2337–2400 JS)

## Goal

Reemplazar la ruta standalone `/profile/change-password` por un **menú de perfil** accesible desde el avatar del topbar. El menú es un popover dropdown con varios items; algunos abren drawers laterales derechos para acciones concretas (Cambiar contraseña), otros abren un modal de confirmación (Cerrar sesión), y los que no entran en esta iteración aparecen disabled con badge "Próximamente". Pattern copiado del mockup `full-mockup-v2.html`.

## Non-goals

- **Mi perfil drawer** con form de datos personales. Necesita `GET /api/v1/user/me` + `PUT /api/v1/user/{id}` en el backend; ninguno existe hoy. El item aparece disabled.
- **Switcher de sucursales.** Necesita endpoint de listado por tenant + cambio de contexto (probablemente reissue del JWT). Aparece como sucursal actual con check + hint "Más sucursales próximamente".
- **Configuración de empresa.** Cuando el módulo `empresa` tenga sus pantallas, el item navega ahí. Hoy disabled.
- **Invalidación server-side del JWT al cambiar password.** Hoy se cubre client-side con autologout. Para invalidación real (sesiones en otros browsers) hace falta token blacklist o versión de token en el backend.

## Architecture

### Componentes nuevos (3)

Todos standalone Angular, `ChangeDetectionStrategy.OnPush`, en `src/app/features/profile/components/`.

**`ProfileMenuComponent`** — contenido del popover.
- Selector: `ui-profile-menu`.
- Output: `(close)` — emitido al clickear cualquier item, para que la topbar cierre el `<p-popover>`.
- Inyecta `UserSessionService`, `TokenService`, `Store` (selectTenantConfig), `ProfileMenuService`.
- Render: header (avatar/nombre/rol/email) + tenant badge + lista de items (5 con divisores) según mockup.

**`ChangePasswordDrawerComponent`** — `<p-drawer position="right">` con el form.
- Selector: `ui-change-password-drawer`.
- Inyecta `ProfileMenuService` (binding visible), `TokenService`, `UserSessionService`, `ProfileApiService`, `Router`.
- Form: `currentPassword` (required), `newPassword` (required + minLength 8), `confirmPassword` (required + `passwordsMatch`).
- `effect()` que resetea el form cada vez que el drawer se abre.

**`LogoutConfirmComponent`** — `<p-dialog [modal]="true">` centrado, ~360px.
- Selector: `ui-logout-confirm`.
- Inyecta `ProfileMenuService`, `TokenService`, `UserSessionService`, `Router`.
- Botones: "Cancelar" (severity secondary) y "Cerrar sesión" (severity danger).

### Servicios nuevos (2)

Ambos en `src/app/features/profile/services/`, `providedIn: 'root'`.

**`ProfileMenuService`** — coordina visibilidad de los overlays.

```typescript
@Injectable({ providedIn: 'root' })
export class ProfileMenuService {
  readonly passwordDrawerOpen = signal(false);
  readonly logoutConfirmOpen  = signal(false);

  openPasswordDrawer():  void { this.passwordDrawerOpen.set(true); }
  closePasswordDrawer(): void { this.passwordDrawerOpen.set(false); }
  openLogoutConfirm():   void { this.logoutConfirmOpen.set(true); }
  closeLogoutConfirm():  void { this.logoutConfirmOpen.set(false); }
}
```

El servicio **no trackea el popover**. El popover se cierra desde la topbar vía `profilePopover.hide()` cuando `<ui-profile-menu>` emite `(close)`. Mantener el popover fuera del servicio evita acoplarlo a refs de PrimeNG.

**`UserSessionService`** — persiste el `UserResponse` del login.

```typescript
const STORAGE_KEY = 'labcore_user';

@Injectable({ providedIn: 'root' })
export class UserSessionService {
  readonly currentUser = signal<UserResponse | null>(this.loadFromStorage());

  set(user: UserResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  get(): UserResponse | null { return this.currentUser(); }

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

`UserResponse` ya existe en `src/app/features/auth/models/auth.models.ts`.

### Cambios en archivos existentes

**`src/app/layout/topbar/topbar.component.ts`** — reemplazar el avatar hardcodeado `"DP"` por iniciales derivadas de `UserSessionService.currentUser()` y agregar `<p-popover>` con `<ui-profile-menu>` adentro.

```html
<button
  #avatarBtn
  type="button"
  class="ui-topbar__avatar"
  aria-label="Menú de usuario"
  (click)="profilePopover.toggle($event)">
  {{ userInitials() }}
</button>

<p-popover #profilePopover styleClass="ui-profile-popover" [showCloseIcon]="false">
  <ui-profile-menu (close)="profilePopover.hide()" />
</p-popover>
```

Imports nuevos: `Popover` de `primeng/popover`, `ProfileMenuComponent`, `UserSessionService`. CSS nueva `.ui-profile-popover` con `padding: 0`, `border-radius: 12px`, `box-shadow` profunda, ancho ~280px.

**`src/app/layout/admin-shell/admin-shell.component.ts`** — montar los dos overlays como hijos del contenedor raíz del shell:

```html
<div class="ui-admin-shell">
  <ui-sidebar ... />
  <p-drawer ... />   <!-- existing left drawer for mobile sidebar -->
  <div class="ui-admin-shell__main">
    <ui-topbar (menuToggle)="..." />
    <main class="ui-admin-shell__content">
      <router-outlet />
    </main>
  </div>

  <ui-change-password-drawer />
  <ui-logout-confirm />
</div>
```

**`src/app/core/auth/login/login.component.ts`** — persistir el `UserResponse` después del `setToken`:

```typescript
if (response.token) {
  this.tokens.setToken(response.token);
  this.userSession.set(response.user);          // NEW
  this.store.dispatch(loadTenantConfigSuccess({ config: DEV_TENANT }));
  await this.router.navigate(['/home']);
  return;
}
```

Inyecta `UserSessionService` arriba del componente.

**`src/app/core/interceptors/auth-token.interceptor.ts`** — limpiar también el user en el handler de 401:

```typescript
if (err instanceof HttpErrorResponse && err.status === 401) {
  tokens.removeToken();
  userSession.clear();                          // NEW
  router.navigate(['/login']);
}
```

Inyectar `UserSessionService` al lado de `TokenService`.

**`src/app/app.routes.ts`** — borrar el bloque hijo `profile/change-password`:

```typescript
// REMOVE:
{
  path: 'profile/change-password',
  loadComponent: () =>
    import('./features/profile/pages/change-password/change-password.component').then(
      (m) => m.ChangePasswordComponent,
    ),
},
```

**`src/app/app.config.ts`** — sin cambios. El `provideAppInitializer` ya sembrado del `DEV_TENANT` sigue funcionando. `UserSessionService` se auto-inicializa desde su constructor leyendo localStorage, así que no necesita un app initializer separado.

### Archivos a borrar

```
src/app/features/profile/pages/change-password/change-password.component.ts
src/app/features/profile/pages/change-password/change-password.component.spec.ts
src/app/features/profile/pages/                ← carpeta queda vacía
```

## Layout del popover (matching mockup)

| # | Elemento | Detalle | Estado en esta iteración |
|---|----------|---------|--------------------------|
| 1 | Header | Avatar 40px + nombre + rol (`var(--brand-primary)` uppercase) + email | Activo (datos de `userSession.currentUser()`) |
| 2 | Tenant badge | `<i pi-building>` + tenant name + role badge | Activo (tenant name de `selectTenantConfig`) |
| 3 | Divider | `1px` fondo `#f1f5f9` | — |
| 4 | Mi perfil | `pi-user` + label + badge "Próximamente" | **Disabled** |
| 5 | Cambiar contraseña | `pi-lock` + label | **Activo** → `profileMenu.openPasswordDrawer()` + `close.emit()` |
| 6 | Configuración empresa | `pi-cog` + label + badge "Próximamente" | **Disabled** |
| 7 | Divider | — | — |
| 8 | Section label | "Cambiar sucursal" | — |
| 9 | Sucursal actual | `pi-map-marker` + nombre + `pi-check` verde | **Disabled** (muestra solo la actual) |
| 10 | Hint | "Más sucursales próximamente" | — |
| 11 | Divider | — | — |
| 12 | Cerrar sesión | `pi-sign-out` + label, color `var(--ds-danger)` con hover rojo | **Activo** → `profileMenu.openLogoutConfirm()` + `close.emit()` |

CSS clases con prefijo `.ui-pm__*` siguiendo la convención del DS. Items disabled con `opacity: .5` y cursor `default`. Item danger con `:hover` background `#fef2f2`, color `#dc2626`.

## Datos derivados en `ProfileMenuComponent`

```typescript
private readonly user        = inject(UserSessionService).currentUser;
private readonly tokens      = inject(TokenService);
private readonly tenantCfg   = inject(Store).selectSignal(selectTenantConfig);

protected readonly initials = computed(() => {
  const u = this.user();
  if (u?.firstName && u?.lastName) {
    return (u.firstName[0] + u.lastName[0]).toUpperCase();
  }
  const sub = this.tokens.getPayload()?.sub ?? '';
  return sub.slice(0, 2).toUpperCase() || '?';
});

protected readonly fullName = computed(() => {
  const u = this.user();
  if (u) return `${u.firstName} ${u.lastName}`.trim();
  return this.tokens.getPayload()?.sub ?? '';
});

protected readonly email = computed(() => this.user()?.email ?? null);

protected readonly primaryRole = computed(() => {
  const u = this.user();
  if (u?.roles?.length) return u.roles[0].description;
  return this.tokens.getRoles()[0] ?? '';
});

protected readonly tenantName = computed(() => this.tenantCfg()?.name ?? '');
```

Email no renderiza si es null (sin placeholder). Iniciales caen al primer 2 chars del username del JWT si no hay user blob (fallback razonable para sesiones recién booteadas antes de que el initializer del LoginComponent haga `set(user)` — caso teórico, en práctica la persistencia cubre los reloads).

## Data flow

### 1. Apertura del popover

```
User clicks avatar button (#avatarBtn)
  → topbar template: profilePopover.toggle($event)
  → <p-popover> renderiza el <ui-profile-menu> en su contenido
  → ProfileMenuComponent lee userSession.currentUser() + selectTenantConfig
  → render del header + items disabled/activos
```

### 2. Cambiar contraseña (camino feliz)

```
User clicks "Cambiar contraseña" en el popover
  → ProfileMenuComponent.onChangePasswordClick():
      profileMenu.openPasswordDrawer()       // signal flips a true
      close.emit()                            // topbar hace profilePopover.hide()

  → ChangePasswordDrawerComponent observa la signal:
      <p-drawer [visible]="profileMenu.passwordDrawerOpen()"> abre desde la derecha
      effect() resetea el form

  → User llena form → submit
  → profileApi.changePassword(userId, current, new) → 200
  → success.set(true), banner verde "Contraseña actualizada. Cerrando tu sesión..."
  → setTimeout 2s:
      tokens.removeToken()
      userSession.clear()
      router.navigate(['/login'])

  → El shell se desmonta (authGuard rechaza al no haber token)
  → User aterriza en /login para re-loguearse con la nueva password
```

### 3. Cerrar sesión

```
User clicks "Cerrar sesión" en el popover
  → ProfileMenuComponent.onLogoutClick():
      profileMenu.openLogoutConfirm()
      close.emit()                            // popover.hide()

  → LogoutConfirmComponent observa logoutConfirmOpen
      <p-dialog> aparece centrado

  → User clickea "Cerrar sesión" (severity danger):
      tokens.removeToken()
      userSession.clear()
      profileMenu.closeLogoutConfirm()
      router.navigate(['/login'])

  → User clickea "Cancelar" en su lugar:
      profileMenu.closeLogoutConfirm()
      ← se queda en la pantalla actual
```

### 4. 401 desde cualquier API

```
Un request HTTP recibe 401
  → authTokenInterceptor.catchError:
      tokens.removeToken()
      userSession.clear()                     // NEW
      router.navigate(['/login'])
  → el error se re-throw al caller para que UI maneje el error si quiere
```

## Error handling

| Caso | Comportamiento |
|------|----------------|
| `localStorage` con JSON corrupto al boot | `UserSessionService.loadFromStorage()` cachea el error, devuelve `null` y borra la clave |
| Submit de change-password con pwd actual incorrecta | Backend devuelve 400 o 401; drawer muestra "La contraseña actual es incorrecta." (banner rojo) |
| Submit con error desconocido | Drawer muestra "Ocurrió un error. Intentá de nuevo más tarde." |
| Click rápido en avatar (doble click) | `<p-popover>` maneja el toggle correctamente, sin races |
| Logout durante un request en vuelo | El request termina y dispatcha el 401 handler (que ya hace lo mismo: limpiar + redirect) |

## Testing

### Specs nuevos

**`profile-menu.service.spec.ts`** — 4 tests mínimos:
- Inicial: ambos signals false.
- `openPasswordDrawer()` flip a true, `closePasswordDrawer()` flip a false.
- Mismo para logout.
- Drawer y logout son independientes (abrir uno no toca al otro).

**`user-session.service.spec.ts`** — 5 tests:
- Sin localStorage → `currentUser()` null.
- `set(user)` persiste en localStorage + actualiza signal.
- `clear()` borra de localStorage + nulea signal.
- Constructor con JSON corrupto → null + auto-limpia la clave.
- Constructor con JSON válido → seed correcto del signal.

**`profile-menu.component.spec.ts`** — 6 tests:
- Render del header con `userSession.currentUser()` mockeado (firstName/lastName/email visibles).
- Fallback al `sub` del JWT cuando user es null (iniciales y nombre).
- Tenant name viene del NgRx store.
- Click "Cambiar contraseña" → `profileMenu.openPasswordDrawer()` llamado + `(close)` emitido.
- Click "Cerrar sesión" → `profileMenu.openLogoutConfirm()` llamado + `(close)` emitido.
- Items disabled (Mi perfil, Empresa, Sucursal) tienen `disabled` attribute y no llaman al service al clickearlos.

**`change-password-drawer.component.spec.ts`** — 6 tests (Vitest fake timers para el setTimeout):
- Drawer visible cuando `passwordDrawerOpen()` true.
- `(visibleChange)` con false llama `closePasswordDrawer()`.
- Form invalid bloquea submit.
- Submit válido → PUT `/api/v1/user/42/password` con body correcto.
- Success → `vi.advanceTimersByTime(2000)` → `tokens.removeToken`, `userSession.clear`, `router.navigate(['/login'])` llamados.
- 401 → banner error con copy "La contraseña actual es incorrecta.".

**`logout-confirm.component.spec.ts`** — 3 tests:
- Visible cuando `logoutConfirmOpen()` true.
- Cancelar llama `closeLogoutConfirm()`, no toca token.
- Confirmar llama `tokens.removeToken`, `userSession.clear`, `router.navigate(['/login'])`.

### Specs modificados

**`auth-token.interceptor.spec.ts`** — el test del 401 ya verifica `removeToken` + `navigate(['/login'])`. Agregar:
- `vi.spyOn(userSession, 'clear')` en el setup.
- `expect(clearSpy).toHaveBeenCalled()` en el assert.

**LoginComponent** sigue sin spec (decisión heredada del plan anterior — los component specs de pages grandes tenían bajo ROI). El cambio de `userSession.set(response.user)` queda cubierto indirectamente por el spec de `UserSessionService`.

### Smoke manual checklist

| # | Verificación |
|---|--------------|
| 1 | Login → avatar muestra iniciales reales (ej. "AD" para Admin Dev), no "DP" hardcoded |
| 2 | Click avatar → popover aparece debajo con animación fadeDown |
| 3 | Header muestra nombre + email + rol + tenant reales |
| 4 | Mi perfil + Empresa + Sucursal aparecen disabled con badge "Próximamente" |
| 5 | Click "Cambiar contraseña" → popover cierra + drawer entra desde la derecha |
| 6 | Submit válido → banner verde 2s → redirect `/login` → re-login con nueva password OK |
| 7 | Submit con pwd actual incorrecta → banner rojo "La contraseña actual es incorrecta." |
| 8 | Cerrar drawer + reabrir → form vacío (reset funcionó) |
| 9 | Click "Cerrar sesión" → popover cierra + modal centrado |
| 10 | Cancelar → modal cierra, sigo logueado |
| 11 | Confirmar → token + user limpiados → `/login` |
| 12 | F5 estando logueado → avatar sigue mostrando iniciales reales (persistencia OK) |
| 13 | Trigger 401 (token alterado manualmente en localStorage) → interceptor limpia ambos + redirect |

## Stack & convenciones

- Angular 21 standalone components, `ChangeDetectionStrategy.OnPush`, signals.
- PrimeNG 21: `<p-popover>`, `<p-drawer>`, `<p-dialog>`, `<p-button>`.
- NgRx classic para tenant (lectura solamente, sin nuevos reducers para esta feature).
- Vitest para tests, con `vi.useFakeTimers()` en el spec del drawer para controlar el `setTimeout` del autologout.
- Convención de clases CSS: prefijo `.ui-*`, tokens `--brand-*` (configurables por tenant) y `--ds-*` (fijos). Sin Tailwind utility classes — usar tokens directos para consistencia con el patrón establecido en `auth-layout.component.ts` y la skill `laboratory-ui`.

## Done criteria

- 5 specs nuevos + 1 modificado verde en `npm test`.
- TypeScript clean (`npx tsc --noEmit -p tsconfig.app.json`).
- 13 verificaciones del smoke checklist pasan en browser.
- Rama `feature/auth` con commits scoped (1 por concern): servicios primero, componentes después, integración por último, cleanup al final.
- `git log --oneline` muestra un commit explícito de eliminación de los archivos viejos.
