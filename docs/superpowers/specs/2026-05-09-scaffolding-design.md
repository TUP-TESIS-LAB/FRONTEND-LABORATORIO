# Scaffolding Design — LabCore Frontend Administrativo

**Fecha:** 2026-05-09
**Rama:** development
**Stack:** Angular 17+ · PrimeNG · Tailwind CSS · NgRx Signal Store · SCSS

---

## 1. Contexto y Alcance

Sistema SaaS multi-tenant para gestión administrativa de laboratorios clínicos. Esta especificación cubre **exclusivamente el portal administrativo**. El Portal del Paciente queda fuera del alcance de este scaffolding.

**Decisiones clave acordadas:**
- Standalone components (Angular 17+), sin NgModules
- Lazy loading por feature con `loadChildren`
- Multi-tenant vía subdominio (`acme.labcore.com` → `X-Tenant-ID: acme`)
- White-label dinámico: CSS Variables inyectadas desde el backend vía TypeScript, sin archivos SCSS estáticos por tenant
- Estado global: NgRx Signal Store
- UI: PrimeNG + Tailwind CSS
- Estilos: SCSS con convención de tokens `--brand-*` / `--ds-*`
- `ChangeDetectionStrategy.OnPush` en todos los componentes
- `resource()` y `toSignal()` para datos asincrónicos en componentes

---

## 2. Arquitectura General

```
main.ts
  └── app.config.ts          ← providers globales (HttpClient, PrimeNG, NgRx)
        └── app.routes.ts    ← rutas raíz
              ├── /login     ← auth pública
              ├── /admin     ← saas-admin (placeholder)
              └── / (shell)  ← authGuard + tenantResolver
                    ├── /empresa, /sucursales, /analitica   (CORE — siempre)
                    └── /turnos, /financiero, /medicos      (ACTIVABLE · canMatch)
```

**Flujo de arranque:**
1. `main.ts` bootstrapea la app
2. `TenantInterceptor` lee el subdominio → añade `X-Tenant-ID` en cada request
3. Al entrar al shell, `TenantResolver` llama al backend y carga la config del tenant
4. `TenantStore` (NgRx Signal Store) almacena la config en memoria
5. `TenantThemeService` inyecta los CSS vars al `:root` con validación de zonas seguras
6. `ModuleRegistry` expone `isActive(key)` y `activeRoutes()` al sidebar y las rutas
7. Rutas ACTIVABLES usan `canMatch: [moduleActiveGuard(key)]`

---

## 3. Estructura de Carpetas

```
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── auth.guard.ts
│   │   │   ├── root.guard.ts
│   │   │   └── token.service.ts
│   │   ├── tenant/
│   │   │   ├── tenant.store.ts            ← NgRx Signal Store
│   │   │   ├── tenant.resolver.ts
│   │   │   ├── module-registry.ts
│   │   │   └── tenant-theme.service.ts
│   │   ├── interceptors/
│   │   │   ├── auth-token.interceptor.ts
│   │   │   └── tenant-id.interceptor.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── role.guard.ts
│   │   │   └── module-active.guard.ts
│   │   └── models/
│   │       ├── user.model.ts
│   │       ├── tenant.model.ts
│   │       ├── role.model.ts
│   │       └── module-key.enum.ts
│   │
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── shell/                     ← admin-shell, sidebar, topbar
│   │   │   ├── components/                ← stat-card, list-card, entity-card, empty-state
│   │   │   ├── form/                      ← ui-field, form-actions
│   │   │   └── breakpoint.service.ts
│   │   ├── pipes/
│   │   │   ├── currency-ar.pipe.ts
│   │   │   ├── date-es.pipe.ts
│   │   │   └── safe-html.pipe.ts
│   │   ├── directives/
│   │   │   ├── has-role.directive.ts
│   │   │   ├── has-module.directive.ts
│   │   │   └── autofocus.directive.ts
│   │   └── validators/
│   │
│   ├── layout/
│   │   ├── admin-shell/
│   │   │   └── admin-shell.component.ts   ← sidebar desktop + p-drawer mobile
│   │   ├── topbar/
│   │   │   └── topbar.component.ts
│   │   └── sidebar/
│   │       └── sidebar.component.ts       ← menú dinámico desde ModuleRegistry
│   │
│   ├── features/
│   │   │
│   │   ├── empresa/                       ← CORE
│   │   │   ├── pages/
│   │   │   │   ├── usuarios/
│   │   │   │   ├── roles/
│   │   │   │   ├── white-label/
│   │   │   │   ├── fiscal/
│   │   │   │   ├── smtp-docs/
│   │   │   │   └── modulos/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── empresa.routes.ts
│   │   │
│   │   ├── sucursales/                    ← CORE
│   │   │   ├── pages/
│   │   │   │   ├── sucursales/
│   │   │   │   └── areas/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── sucursales.routes.ts
│   │   │
│   │   ├── analitica/                     ← CORE
│   │   │   ├── pages/
│   │   │   │   ├── pacientes/
│   │   │   │   ├── atencion/              ← clínica · urgencia · domicilio
│   │   │   │   ├── protocolos/
│   │   │   │   ├── rotulos/
│   │   │   │   ├── pre-analitica/
│   │   │   │   ├── analitica/
│   │   │   │   ├── post-analitica/
│   │   │   │   └── nbu/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── analitica.routes.ts
│   │   │
│   │   ├── turnos/                        ← ACTIVABLE
│   │   │   ├── pages/
│   │   │   │   ├── agenda/
│   │   │   │   ├── configuracion/
│   │   │   │   ├── totem/
│   │   │   │   ├── colas/
│   │   │   │   └── atencion-turno/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── turnos.routes.ts
│   │   │
│   │   ├── financiero/                    ← ACTIVABLE
│   │   │   ├── pages/
│   │   │   │   ├── pagos/
│   │   │   │   ├── cajas/
│   │   │   │   ├── movimientos/
│   │   │   │   ├── coberturas/
│   │   │   │   └── liquidaciones/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── financiero.routes.ts
│   │   │
│   │   ├── medicos/                       ← ACTIVABLE (placeholder)
│   │   │   └── medicos.routes.ts
│   │   │
│   │   ├── stock/                         ← ACTIVABLE (placeholder)
│   │   │   └── stock.routes.ts
│   │   │
│   │   └── saas-admin/                    ← placeholder
│   │       └── admin.routes.ts
│   │
│   ├── app.component.ts
│   ├── app.routes.ts
│   └── app.config.ts
│
├── styles/
│   ├── tokens.scss        ← --brand-* (placeholders), --ds-* (fijos), --p-* (PrimeNG)
│   ├── breakpoints.scss   ← mixins mobile-only(), tablet-up(), desktop-up()
│   ├── globals.scss       ← Montserrat, touch targets (48px), safe areas
│   └── utilities.scss     ← .ui-show-*, .ui-text-*, .ui-flex-*
│
├── assets/
│   └── i18n/
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles.scss            ← @use de todos los archivos en styles/
```

**Path aliases (`tsconfig.json`):**
```json
"paths": {
  "@core/*":     ["src/app/core/*"],
  "@shared/*":   ["src/app/shared/*"],
  "@layout/*":   ["src/app/layout/*"],
  "@features/*": ["src/app/features/*"]
}
```

---

## 4. Infraestructura Core — Contratos

### `module-key.enum.ts`
```typescript
export enum ModuleKey {
  Turnos     = 'turnos',
  Financiero = 'financiero',
  Medicos    = 'medicos',
  Stock      = 'stock',
}
```

### `tenant.model.ts`
```typescript
export interface TenantConfig {
  name: string;
  logoUrl: string;
  brandPrimary: string;   // hex
  brandSecondary: string; // hex
  brandAccent: string;    // hex
  modules: ModuleKey[];
}
```

### `tenant.store.ts` (NgRx Signal Store)
```typescript
// Estado: { config: TenantConfig | null, loading: boolean, error: string | null }
// Métodos: loadConfig(), isActive(key: ModuleKey): boolean
```

### `tenant-theme.service.ts`
```typescript
// applyTheme(config: TenantConfig): void
//   1. Recibe los hex de marca del backend
//   2. Para cada color: detecta si el hue cae en rango rojo (0-20 / 340-360)
//      Si colisiona → ajusta luminosidad/saturación para diferenciarlo de --ds-danger
//   3. Inyecta en :root:
//      document.documentElement.style.setProperty('--brand-primary', safeHex)
//   4. NUNCA modifica --ds-danger, --ds-success, --ds-warning
```

### `tenant-id.interceptor.ts`
```typescript
// Lee window.location.hostname
// Extrae subdominio: "acme.labcore.com" → "acme"
// Añade header X-Tenant-ID en cada HttpRequest
```

### `module-active.guard.ts`
```typescript
// canMatch: [moduleActiveGuard(ModuleKey.Turnos)]
// Consulta ModuleRegistry.isActive(key)
// Si false → redirige a 403 o dashboard
```

---

## 5. Sistema de Tokens SCSS

### Familias de variables

| Prefijo      | Modificable por tenant | Propósito                                   |
|--------------|------------------------|---------------------------------------------|
| `--brand-*`  | Sí                     | Identidad visual: navbar, botones, headers  |
| `--ds-*`     | No                     | Colores semánticos, tipografía, dimensiones |
| `--p-*`      | No                     | Overrides de PrimeNG                        |

### Tokens `--brand-*` (placeholder — el tenant los sobreescribe vía JS)
```scss
:root {
  --brand-primary:   #2563EB;
  --brand-secondary: #0EA5A4;
  --brand-accent:    #F97316;
}
```

### Tokens `--ds-*` (fijos — nunca los toca el tenant)
```scss
:root {
  --ds-success:      #22C55E;
  --ds-danger:       #E23A47;
  --ds-warning:      #F59E0B;
  --ds-info:         #3B82F6;
  --ds-surface:      #EEF0F4;
  --ds-bg:           #F7F8FA;
  --ds-text:         #1A1A2E;
  --ds-text-muted:   #6B7280;
  --ds-touch-target: 48px;
  --ds-sidebar-w:    260px;
  --ds-topbar-h:     64px;
}
```

---

## 6. Convenciones

- **Carpetas:** `kebab-case`
- **Archivos:** `feature.component.ts`, `feature.service.ts`, `feature.routes.ts`
- **Selectores:** prefijo `app-` para features, `ui-` para componentes de shared/ui
- **Change detection:** `OnPush` en todos los componentes
- **Datos asincrónicos:** `resource()` (fetch ligado a parámetro) o `toSignal()` (observable existente)
- **Estado derivado:** `computed()`, nunca métodos en el template
- **Formularios:** Reactive Forms (`FormBuilder`, `formControlName`). `ngModel` solo en filtros sin submit
- **Features aisladas:** una feature no importa de otra. Lo compartido sube a `shared/` o `core/`
- **Servicios de feature:** en `providers` de la ruta, no en `providedIn: 'root'`
- **Clases CSS:** siempre `.ui-*`, nunca prefijos de tenant (`.acme-card` está prohibido)
- **Tests:** `*.spec.ts` al lado del archivo. E2E con Playwright en `e2e/`

---

## 7. Shell Administrativo

Layout desktop: sidebar fija (260px) + topbar (64px) + content area.
Layout mobile: topbar con hamburguesa → `p-drawer` lateral + content full.

```html
<div class="admin-shell">
  <app-sidebar class="ui-show-desktop" />
  <p-drawer [(visible)]="drawerOpen" position="left">
    <app-sidebar (itemClick)="drawerOpen = false" />
  </p-drawer>
  <main class="admin-shell__content">
    <app-topbar (menuToggle)="drawerOpen = !drawerOpen" />
    <router-outlet />
  </main>
</div>
```

---

## 8. Fuera del Alcance

- Portal del Paciente (ninguna referencia en código administrativo)
- Configuración técnica de PWA
- Lógica de backend / API
- Despliegue / CI-CD
