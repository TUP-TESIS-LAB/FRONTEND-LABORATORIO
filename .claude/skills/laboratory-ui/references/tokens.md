# Design Tokens — Multi-tenant white-label

## Estrategia de theming

El sistema separa los tokens en dos capas:

1. **Layer fija (`--ds-*`):** valores del design system que no cambian entre tenants. Definidos en `styles/tokens.scss`, cargados una sola vez.
2. **Layer de marca (`--brand-*`):** valores configurables por tenant. Inyectados en runtime, sobrescriben en cascada.

```
:root (base) → --ds-* (fijos) + --brand-* (defaults neutros placeholder)
[data-tenant="acme"] → solo --brand-* (overrides del tenant Acme)
[data-tenant="lcc"]  → solo --brand-* (overrides del tenant LCC)
```

---

## Configuración PrimeNG

```typescript
// app.config.ts
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { darkModeSelector: false }
      }
    })
  ]
};
```

---

## `styles/tokens.scss` — variables base (todos los tenants)

```scss
@import 'primeng/resources/primeng.min.css';
@import 'primeicons/primeicons.css';
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

:root {
  // ═══════════════════════════════════════════════════════
  // BRAND TOKENS — defaults placeholder (neutros)
  // SIEMPRE deben sobrescribirse por el tenant activo, ya
  // sea en build-time con [data-tenant="x"] o en runtime
  // con ThemeService. Los defaults solo evitan que la app
  // se vea rota si arranca sin un tenant configurado.
  // ═══════════════════════════════════════════════════════
  --brand-primary:        #2563EB;  // azul genérico
  --brand-primary-dark:   #1D4ED8;
  --brand-primary-light:  #DBEAFE;

  --brand-secondary:      #0EA5A4;  // teal genérico
  --brand-secondary-dark: #0F766E;
  --brand-secondary-light:#CCFBF1;

  --brand-accent:         #F97316;  // naranja genérico
  --brand-accent-dark:    #C2410C;
  --brand-accent-light:   #FFEDD5;

  // Logo del tenant — se sobrescribe por tenant
  --brand-logo:           url('/assets/tenants/default/logo.svg');
  --brand-logo-white:     url('/assets/tenants/default/logo-white.svg');

  // ═══════════════════════════════════════════════════════
  // DESIGN SYSTEM TOKENS — fijos para todos los tenants
  // No deben sobrescribirse nunca por tenant.
  // ═══════════════════════════════════════════════════════

  // ─── Estados (semánticos, no de marca) ──────────
  --ds-success:        #22C55E;
  --ds-success-light:  #DCFCE7;
  --ds-warning:        #F59E0B;
  --ds-warning-light:  #FEF3C7;
  --ds-danger:         #e23a47;
  --ds-danger-light:   #FDE8EA;
  --ds-info:           #3B82F6;
  --ds-info-light:     #DBEAFE;

  // ─── Neutros ────────────────────────────────────
  --ds-surface:        #EEF0F4;
  --ds-surface-dark:   #D8DCE4;
  --ds-bg:             #F7F8FA;
  --ds-white:          #FFFFFF;

  --ds-text:           #1A1A2E;
  --ds-text-muted:     #6B7280;
  --ds-text-disabled:  #9CA3AF;

  // ─── Typography ─────────────────────────────────
  --ds-font:           'Montserrat', sans-serif;

  // ─── Spacing scale ──────────────────────────────
  --space-1:  4px;  --space-2:  8px;
  --space-3:  12px; --space-4:  16px;
  --space-5:  20px; --space-6:  24px;
  --space-8:  32px; --space-10: 40px;
  --space-12: 48px;

  // ─── Borders ────────────────────────────────────
  --ds-radius-sm:  6px;
  --ds-radius-md:  10px;
  --ds-radius-lg:  16px;
  --ds-radius-xl:  24px;

  // ─── Shadows ────────────────────────────────────
  --ds-shadow-sm:  0 1px 3px rgba(0,0,0,0.08);
  --ds-shadow-md:  0 4px 12px rgba(0,0,0,0.08);
  --ds-shadow-lg:  0 8px 24px rgba(0,0,0,0.12);
  --ds-shadow-bottom-nav: 0 -2px 8px rgba(0,0,0,0.08);

  // ─── Layout ─────────────────────────────────────
  --ds-sidebar-w:        260px;
  --ds-topbar-h:         64px;
  --ds-bottom-nav-h:     64px;
  --ds-content-max:      1200px;
  --ds-touch-target:     48px;

  // ─── Safe areas (PWA / iOS notch) ───────────────
  --ds-safe-top:    env(safe-area-inset-top, 0px);
  --ds-safe-right:  env(safe-area-inset-right, 0px);
  --ds-safe-bottom: env(safe-area-inset-bottom, 0px);
  --ds-safe-left:   env(safe-area-inset-left, 0px);

  // ─── Z-index scale ──────────────────────────────
  --z-content:      1;
  --z-sticky:       100;
  --z-topbar:       200;
  --z-drawer:       300;
  --z-bottom-nav:   400;
  --z-fab:          500;
  --z-dialog:       1000;
  --z-toast:        2000;

  // ═══════════════════════════════════════════════════════
  // PrimeNG overrides — usan los tokens de marca
  // ═══════════════════════════════════════════════════════
  --p-primary-color:          var(--brand-primary);
  --p-primary-contrast-color: var(--ds-white);
  --p-surface-100:            var(--ds-surface);
  --p-surface-200:            var(--ds-surface-dark);
  --p-focus-ring-color:       var(--brand-secondary);
  --p-font-family:            var(--ds-font);
}
```

---

## Theming por tenant — opciones de implementación

### Opción A: tenants conocidos en build-time (`[data-tenant]`)

Cada tenant tiene su archivo SCSS con su paleta. Se importan todos en el bundle y se activa uno con un atributo HTML.

```scss
// styles/tenants/_lcc.scss
[data-tenant="lcc"] {
  --brand-primary:        #00435D;
  --brand-primary-dark:   #002E42;
  --brand-primary-light:  #E8F4F8;

  --brand-secondary:      #00B9B6;
  --brand-secondary-dark: #008C8A;
  --brand-secondary-light:#E0F7F7;

  --brand-accent:         #EC703D;
  --brand-accent-dark:    #C4541F;
  --brand-accent-light:   #FDF0EA;

  --brand-logo:           url('/assets/tenants/lcc/logo.svg');
  --brand-logo-white:     url('/assets/tenants/lcc/logo-white.svg');
}

// styles/tenants/_acme.scss
[data-tenant="acme"] {
  --brand-primary:        #2C3E50;
  --brand-primary-dark:   #1A252F;
  --brand-primary-light:  #ECF0F1;

  --brand-secondary:      #E74C3C;
  --brand-secondary-dark: #C0392B;
  --brand-secondary-light:#FADBD8;

  --brand-accent:         #F39C12;
  --brand-accent-dark:    #D68910;
  --brand-accent-light:   #FCF3CF;

  --brand-logo:           url('/assets/tenants/acme/logo.svg');
  --brand-logo-white:     url('/assets/tenants/acme/logo-white.svg');
}
```

En el componente raíz se setea el atributo según el tenant detectado:
```html
<html [attr.data-tenant]="tenantId">
```

### Opción B: tenants dinámicos (inyección en runtime)

Para casos donde la paleta viene de un endpoint del backend:

```typescript
// theme.service.ts
@Injectable({ providedIn: 'root' })
export class ThemeService {
  applyTenant(theme: TenantTheme): void {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary',         theme.primary);
    root.style.setProperty('--brand-primary-dark',    theme.primaryDark);
    root.style.setProperty('--brand-primary-light',   theme.primaryLight);
    root.style.setProperty('--brand-secondary',       theme.secondary);
    root.style.setProperty('--brand-secondary-dark',  theme.secondaryDark);
    root.style.setProperty('--brand-secondary-light', theme.secondaryLight);
    root.style.setProperty('--brand-accent',          theme.accent);
    root.style.setProperty('--brand-accent-dark',     theme.accentDark);
    root.style.setProperty('--brand-accent-light',    theme.accentLight);
    root.style.setProperty('--brand-logo',            `url('${theme.logoUrl}')`);
    root.style.setProperty('--brand-logo-white',      `url('${theme.logoWhiteUrl}')`);
  }
}

interface TenantTheme {
  primary: string;       primaryDark: string;       primaryLight: string;
  secondary: string;     secondaryDark: string;     secondaryLight: string;
  accent: string;        accentDark: string;        accentLight: string;
  logoUrl: string;       logoWhiteUrl: string;
}
```

### Opción C: derivación automática de tonos

Si el backend solo provee 3 colores base (sin las variantes dark/light), generarlas en runtime con utility:

```typescript
// color-utils.ts
export function deriveTones(hex: string): { dark: string; light: string } {
  // Implementar con biblioteca como `color` de npm o función propia
  // dark = oscurecer 15-20%, light = aclarar a 92-95% lightness
  // Ejemplo simplificado:
  return { dark: shade(hex, -0.2), light: shade(hex, 0.92) };
}
```

Esta es la opción más flexible para white-label dinámico real.

---

## Reglas de uso de tokens

✅ **DO**
```scss
.my-button {
  background: var(--brand-primary);          // marca
  color: var(--ds-white);                    // fijo
  border-radius: var(--ds-radius-md);        // fijo
}

.error-message {
  color: var(--ds-danger);                   // estado, fijo
}
```

❌ **DON'T**
```scss
.my-button {
  background: #00435D;                       // hardcodear color de marca
  background: var(--ds-primary);             // mezclar prefijos
}

.success-banner {
  background: var(--brand-secondary);        // usar marca para estado
}
```

**Regla de oro:** colores de marca para identidad visual (botones primarios, headers, acentos). Colores de estado para feedback semántico (éxito, error, alerta). Nunca mezclar.

---

## Breakpoints (SCSS)

`styles/_breakpoints.scss`:

```scss
$bp-mobile:  767px;
$bp-tablet:  1023px;
$bp-desktop: 1024px;

@mixin mobile-only  { @media (max-width: #{$bp-mobile}) { @content; } }
@mixin tablet-up    { @media (min-width: 768px) { @content; } }
@mixin desktop-up   { @media (min-width: #{$bp-desktop}) { @content; } }
@mixin tablet-only  { @media (min-width: 768px) and (max-width: #{$bp-tablet}) { @content; } }
```

Uso:
```scss
@use 'breakpoints' as *;

.mi-componente {
  padding: var(--space-4);
  @include desktop-up { padding: var(--space-6); }
}
```

---

## Utilidades de visibilidad

```scss
.ui-show-mobile  { display: block; }
.ui-show-desktop { display: none; }

@include desktop-up {
  .ui-show-mobile  { display: none; }
  .ui-show-desktop { display: block; }
}

.ui-flex-mobile  { display: flex; }
.ui-flex-desktop { display: none; }
@include desktop-up {
  .ui-flex-mobile  { display: none; }
  .ui-flex-desktop { display: flex; }
}
```

---

## Estilos base globales

```scss
* { box-sizing: border-box; }

html, body {
  margin: 0;
  font-family: var(--ds-font);
  color: var(--ds-text);
  background: var(--ds-bg);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

body {
  overscroll-behavior-y: contain;
}

// Tipografía fluida
h1 { font-size: clamp(22px, 4vw, 28px); font-weight: 700; margin: 0 0 var(--space-3); }
h2 { font-size: clamp(18px, 3vw, 22px); font-weight: 600; margin: 0 0 var(--space-3); }
h3 { font-size: 18px; font-weight: 600; margin: 0 0 var(--space-2); }
h4 { font-size: 16px; font-weight: 600; margin: 0 0 var(--space-2); }

// Touch targets en mobile
@include mobile-only {
  button,
  .p-button,
  a[role="button"],
  .ui-clickable {
    min-height: var(--ds-touch-target);
    min-width: var(--ds-touch-target);
  }
}

.ui-scroll-y {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

---

## Componentes shell — estilos

### Topbar

```scss
.ui-topbar {
  height: calc(var(--ds-topbar-h) + var(--ds-safe-top));
  padding-top: var(--ds-safe-top);
  padding-left: max(var(--space-4), var(--ds-safe-left));
  padding-right: max(var(--space-4), var(--ds-safe-right));
  background: var(--ds-white);
  border-bottom: 1px solid var(--ds-surface-dark);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--ds-shadow-sm);
  position: sticky;
  top: 0;
  z-index: var(--z-topbar);

  @include desktop-up {
    padding-left: var(--space-6);
    padding-right: var(--space-6);
  }
}
```

### Sidebar (desktop, admin)

```scss
.ui-sidebar {
  width: var(--ds-sidebar-w);
  background: var(--brand-primary);
  color: white;
  min-height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;

  &__logo {
    padding: var(--space-6);
    border-bottom: 1px solid rgba(255,255,255,0.1);

    // Si se usa la variable de logo del tenant:
    img { content: var(--brand-logo-white); }
  }

  &__nav {
    flex: 1;
    padding: var(--space-4) 0;
    overflow-y: auto;
  }

  .ui-nav-item {
    padding: var(--space-3) var(--space-6);
    display: flex;
    align-items: center;
    gap: var(--space-3);
    cursor: pointer;
    color: rgba(255,255,255,0.8);
    font-size: 14px;
    font-weight: 500;
    border-left: 3px solid transparent;
    transition: all 0.2s;
    text-decoration: none;
    min-height: var(--ds-touch-target);

    &:hover, &.active {
      background: rgba(255,255,255,0.08);
      color: white;
      border-left-color: var(--brand-secondary);
    }

    i { font-size: 16px; }
  }
}
```

### Bottom nav (mobile, paciente)

```scss
.ui-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(var(--ds-bottom-nav-h) + var(--ds-safe-bottom));
  padding-bottom: var(--ds-safe-bottom);
  background: var(--ds-white);
  border-top: 1px solid var(--ds-surface-dark);
  box-shadow: var(--ds-shadow-bottom-nav);
  display: flex;
  z-index: var(--z-bottom-nav);

  &__item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-decoration: none;
    color: var(--ds-text-muted);
    font-size: 11px;
    font-weight: 500;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;

    i { font-size: 22px; }

    &.active {
      color: var(--brand-primary);
      i { color: var(--brand-secondary); }
    }

    &:active { transform: scale(0.95); }
  }
}
```

### Content areas

```scss
.ui-content {
  padding: var(--space-4);
  background: var(--ds-bg);
  min-height: calc(100vh - var(--ds-topbar-h));

  @include desktop-up { padding: var(--space-6); }
}

.ui-patient-content {
  padding: var(--space-4);
  padding-bottom: calc(var(--ds-bottom-nav-h) + var(--space-4) + var(--ds-safe-bottom));
  background: var(--ds-bg);
  min-height: 100vh;

  @include desktop-up {
    max-width: var(--ds-content-max);
    margin: 0 auto;
    padding: var(--space-6);
  }
}

.ui-page-header {
  margin-bottom: var(--space-5);

  h1 { margin: 0 0 var(--space-1); }
  p  { margin: 0; color: var(--ds-text-muted); font-size: 14px; }
}
```

---

## Stat cards

```scss
.ui-stats-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: var(--space-5);

  @include desktop-up {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
  }
}

.ui-stat-card {
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  padding: var(--space-4);
  box-shadow: var(--ds-shadow-sm);
  border-left: 4px solid var(--brand-secondary);

  @include desktop-up { padding: var(--space-5); }

  &__label {
    font-size: 11px;
    font-weight: 500;
    color: var(--ds-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  &__value {
    font-size: clamp(20px, 5vw, 28px);
    font-weight: 700;
    color: var(--brand-primary);
    margin: var(--space-1) 0;
  }
  &__sub { font-size: 12px; color: var(--ds-text-muted); }
}
```

---

## Empty state

```scss
.ui-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
  color: var(--ds-text-muted);
  text-align: center;
  min-height: 280px;

  i { font-size: 3rem; color: var(--ds-text-muted); margin-bottom: var(--space-2); }
  h4 { color: var(--ds-text); margin: 0; }
  p { margin: 0 0 var(--space-3); font-size: 14px; max-width: 320px; }
}
```

---

## Tags de estado (semánticos, no de marca)

```scss
.ui-tag-pendiente   { background: var(--ds-warning-light); color: var(--ds-warning); }
.ui-tag-confirmado  { background: var(--ds-success-light); color: var(--ds-success); }
.ui-tag-cancelado   { background: var(--ds-danger-light);  color: var(--ds-danger);  }
.ui-tag-completado  { background: var(--brand-primary-light); color: var(--brand-primary); }
.ui-tag-info        { background: var(--ds-info-light);    color: var(--ds-info);    }

.p-tag {
  font-weight: 600;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: var(--ds-radius-sm);
}
```

---

## Utilidades de texto

```scss
.ui-text-muted    { color: var(--ds-text-muted); }
.ui-text-primary  { color: var(--brand-primary); }
.ui-text-danger   { color: var(--ds-danger); }
.ui-text-success  { color: var(--ds-success); }
.ui-text-center   { text-align: center; }
.ui-text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ui-grupo-titulo {
  font-size: 13px;
  font-weight: 600;
  color: var(--ds-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: var(--space-5) 0 var(--space-2);
  padding: 0 var(--space-1);

  &:first-child { margin-top: 0; }
}
```

---

## Tabla — overrides responsive

```scss
.p-datatable {
  .p-datatable-thead > tr > th {
    background: var(--ds-surface);
    color: var(--ds-text-muted);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

@include mobile-only {
  .ui-table-desktop { display: none; }
}

@include tablet-up {
  .ui-list-mobile { display: none; }
}
```

---

## Dialog full-screen mobile

```scss
.ui-dialog-fullscreen-mobile {
  @include mobile-only {
    .p-dialog {
      width: 100vw !important;
      max-width: 100vw !important;
      height: 100vh !important;
      max-height: 100vh !important;
      margin: 0 !important;
      border-radius: 0 !important;

      .p-dialog-header {
        padding-top: calc(var(--space-4) + var(--ds-safe-top));
      }
      .p-dialog-content {
        padding-bottom: calc(var(--space-4) + var(--ds-safe-bottom));
      }
    }
  }
}
```

---

## FAB (Floating Action Button)

```scss
.ui-fab {
  position: fixed;
  right: var(--space-4);
  bottom: calc(var(--ds-bottom-nav-h) + var(--space-4) + var(--ds-safe-bottom));
  z-index: var(--z-fab);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: var(--ds-shadow-lg);

  @include desktop-up {
    bottom: var(--space-6);
    right: var(--space-6);
  }
}
```

---

## Iconografía

Usar exclusivamente **PrimeIcons** (`pi-*`).

Íconos comunes:
- Usuario: `pi-user`, `pi-users`, `pi-user-plus`
- Calendario: `pi-calendar`, `pi-calendar-plus`, `pi-clock`
- Documento: `pi-file-edit`, `pi-file-pdf`, `pi-download`
- Estado: `pi-check-circle`, `pi-exclamation-triangle`, `pi-info-circle`
- Acción: `pi-pencil`, `pi-trash`, `pi-plus`, `pi-search`, `pi-filter`
- Navegación: `pi-bars`, `pi-chevron-right`, `pi-arrow-left`, `pi-times`
- Compartir: `pi-share-alt`
