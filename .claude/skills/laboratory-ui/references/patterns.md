# Patrones reutilizables de Layout

Esta referencia documenta **patrones combinables**, no pantallas armadas. La skill provee los bloques de construcción; las pantallas concretas se diseñan en cada feature combinando estos bloques.

**Lo que SÍ está acá:**
- Shells de aplicación (admin y paciente) — son fundacionales del DS, no varían entre features.
- Patrones de composición: cómo combinar componentes para resolver casos comunes.
- Reglas de adaptación responsive.

**Lo que NO está acá:**
- Pantallas concretas con HTML completo y datos específicos (eso es del producto, no del DS).
- Decisiones de qué información mostrar en cada feature.

---

## Shell Administrativo

Layout fundacional para portales internos (secretaría, bioquímicos, etc.).

```typescript
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'ui-admin-shell',
  standalone: true,
  imports: [RouterOutlet, DrawerModule, /* sidebar, topbar */],
  template: `
    <div class="ui-admin-layout">
      <ui-sidebar class="ui-show-desktop" />

      <p-drawer [(visible)]="drawerOpen" position="left" styleClass="ui-drawer">
        <ng-template pTemplate="headless">
          <ui-sidebar (itemClick)="drawerOpen = false" />
        </ng-template>
      </p-drawer>

      <div class="ui-admin-layout__main">
        <ui-topbar (menuToggle)="drawerOpen = !drawerOpen" />
        <main class="ui-content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .ui-admin-layout {
      display: flex;
      min-height: 100vh;
    }
    .ui-admin-layout__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
  `]
})
export class AdminShellComponent {
  drawerOpen = false;
}
```

---

## Shell Paciente

Layout fundacional para portales orientados al usuario final.

```typescript
@Component({
  selector: 'ui-patient-shell',
  standalone: true,
  imports: [RouterOutlet, /* topbar, bottom-nav */],
  template: `
    <div class="ui-patient-layout">
      <ui-patient-topbar />
      <main class="ui-patient-content">
        <router-outlet />
      </main>
      <ui-bottom-nav class="ui-show-mobile" />
    </div>
  `,
  styles: [`
    .ui-patient-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class PatientShellComponent {}
```

---

## Patrón: Page header

Estructura común para el comienzo de cualquier pantalla.

```html
<div class="ui-page-header">
  <h1>{{ pageTitle }}</h1>
  <p>{{ pageSubtitle }}</p>
  <!-- Acciones primarias opcionales en desktop -->
  <p-button class="ui-show-desktop" label="..." severity="primary" />
</div>
```

Cuando hay navegación de "atrás" (vista de detalle, por ejemplo):

```html
<div class="ui-page-header">
  <p-button icon="pi pi-arrow-left" severity="text"
            label="{Sección padre}" routerLink="..." />
  <h1>{{ entityTitle }}</h1>
</div>
```

---

## Patrón: Grid de stat cards

Para resumir métricas al inicio de una pantalla. Útil en dashboards y vistas de overview.

```html
<div class="ui-stats-grid">
  <div class="ui-stat-card" style="border-left-color: var(--brand-secondary)">
    <div class="ui-stat-card__label">{Label}</div>
    <div class="ui-stat-card__value">{Value}</div>
    <div class="ui-stat-card__sub">{Sub-text opcional}</div>
  </div>
  <!-- ... más cards ... -->
</div>
```

**Reglas:**
- Mobile: 2 columnas. Desktop: 3 o 4 columnas.
- `border-left-color` puede ser `--brand-*` (identidad visual) o `--ds-*` (semántico, ej: success para "completados", warning para "pendientes").
- Mantener consistencia: si una card es semántica, todas las del grid lo son. No mezclar arbitrariamente.
- Limitar a máximo 4 stat cards por grid (más que eso satura).

---

## Patrón: Layout de 2 columnas (main + aside)

Para pantallas con contenido principal + información secundaria/contextual.

```html
<div class="ui-two-col-layout">
  <section class="ui-two-col-layout__main">
    <!-- contenido principal -->
  </section>
  <aside class="ui-two-col-layout__aside">
    <!-- info secundaria, alertas, accesos rápidos -->
  </aside>
</div>
```

```scss
.ui-two-col-layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;

  @include desktop-up {
    grid-template-columns: 1fr 320px;
    gap: var(--space-5);
  }
}
```

En mobile el aside cae debajo. Si el aside tiene info crítica, considerar que el usuario tendrá que scrollear para verlo.

---

## Patrón: Hero card destacada

Para resaltar un dato/acción crítica al inicio de una pantalla. Ideal para "próxima acción" o "estado importante".

```html
<div class="ui-hero-card">
  <span class="ui-hero-card__label">{Etiqueta corta}</span>
  <h3>{Título principal}</h3>
  <div class="ui-hero-card__details">
    <!-- información secundaria con íconos -->
  </div>
  <p-button label="{CTA}" severity="secondary" styleClass="mt-3" />
</div>
```

```scss
.ui-hero-card {
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: white;
  padding: var(--space-5);
  border-radius: var(--ds-radius-lg);
  margin-bottom: var(--space-6);

  &__label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.85;
  }

  h3 { margin: var(--space-2) 0; color: white; }

  &__details {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: 14px;
    opacity: 0.95;

    @include desktop-up {
      flex-direction: row;
      gap: var(--space-4);
    }

    i { margin-right: var(--space-1); }
  }
}
```

**Reglas:**
- Solo una hero card por pantalla — pierde fuerza si se usan varias.
- El gradient combina los dos colores principales del tenant (es uno de los lugares donde el white-label se hace visible).
- Si no hay datos para mostrar, no renderizar la card (no usarla con estado vacío).

---

## Patrón: Grid de nav cards

Para accesos rápidos a sub-secciones desde un home/landing.

```html
<div class="ui-nav-cards-grid">
  <a class="ui-nav-card" routerLink="...">
    <i class="pi pi-{icono}"></i>
    <h4>{Título}</h4>
    <p>{Descripción corta}</p>
  </a>
  <!-- ... más nav cards ... -->
</div>
```

```scss
.ui-nav-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);

  @include tablet-up {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
  }
}

.ui-nav-card {
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  padding: var(--space-5);
  text-decoration: none;
  color: var(--ds-text);
  box-shadow: var(--ds-shadow-sm);
  border: 2px solid transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  transition: all 0.2s;
  min-height: var(--ds-touch-target);

  i {
    font-size: 1.75rem;
    color: var(--brand-secondary);
  }

  h4 { margin: 0; font-size: 16px; }
  p  { margin: 0; color: var(--ds-text-muted); font-size: 13px; }

  &:hover {
    border-color: var(--brand-secondary);
    box-shadow: var(--ds-shadow-md);
    @include desktop-up { transform: translateY(-2px); }
  }

  &:active { transform: scale(0.98); }
}
```

**Reglas:**
- Limitar a 3-6 nav cards. Más que eso conviene categorizar.
- Cada card lleva al usuario a una sección, no ejecuta una acción.
- Texto descriptivo corto (1 línea idealmente).

---

## Patrón: Header de detalle de entidad

Para pantallas que muestran un ítem específico (paciente, turno, orden, etc.).

```html
<div class="ui-entity-header">
  <p-avatar [label]="entityInitials" shape="circle" size="xlarge" />
  <div class="ui-entity-header__info">
    <h2>{Título principal}</h2>
    <div class="ui-entity-header__meta">
      <span>{Metadata 1}</span>
      <span>{Metadata 2}</span>
      <span>{Metadata 3}</span>
    </div>
  </div>
  <p-button label="Editar" icon="pi pi-pencil" severity="secondary" />
</div>
```

```scss
.ui-entity-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-sm);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;

  &__info { flex: 1; min-width: 200px; }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    color: var(--ds-text-muted);
    font-size: 14px;

    @include mobile-only {
      flex-direction: column;
      gap: var(--space-1);
    }
  }
}
```

Generalmente se acompaña con `p-tabs` debajo para navegar entre secciones relacionadas.

---

## Patrón: Sección de datos clave-valor (`<dl>`)

Para mostrar información estructurada (perfil, datos de contacto, atributos de un ítem).

```html
<dl class="ui-data-list">
  <dt>{Label 1}</dt><dd>{Value 1}</dd>
  <dt>{Label 2}</dt><dd>{Value 2}</dd>
  <!-- ... -->
</dl>
```

```scss
.ui-data-list {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--space-2) var(--space-3);
  margin: 0;
  font-size: 14px;

  @include mobile-only {
    grid-template-columns: 1fr;
    gap: var(--space-3);

    dt {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ds-text-muted);
      margin-bottom: -4px;
    }
  }

  dt { color: var(--ds-text-muted); font-weight: 500; }
  dd { margin: 0; color: var(--ds-text); }
}
```

Usa `<dl>/<dt>/<dd>` por semántica HTML. El comportamiento responsive cambia el layout pero no la marca semántica.

---

## Patrón: Sección agrupable

Para dividir una pantalla en secciones con su propio header y acción.

```html
<section class="ui-section">
  <div class="ui-section__header">
    <h3>{Título de la sección}</h3>
    <p-button icon="pi pi-..." severity="text" label="..."
              (onClick)="..." />
  </div>
  <!-- contenido de la sección -->
</section>
```

```scss
.ui-section {
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
  box-shadow: var(--ds-shadow-sm);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-3);

    h3 { margin: 0; }
  }
}
```

---

## Patrón: Wizard de pasos (mobile)

Para procesos multi-step que en mobile se navegan secuencialmente.

```html
<div class="ui-wizard">
  <header class="ui-wizard__header">
    @if (currentStep > 1) {
      <p-button icon="pi pi-arrow-left" severity="text"
                (onClick)="prevStep()" ariaLabel="Atrás" />
    } @else {
      <p-button icon="pi pi-times" severity="text"
                (onClick)="cerrar()" ariaLabel="Cerrar" />
    }
    <h2>{Título del proceso}</h2>
  </header>

  <p-progressBar [value]="(currentStep / totalSteps) * 100" [showValue]="false" />

  <div class="ui-wizard__content">
    <!-- contenido del paso actual -->
  </div>

  <footer class="ui-wizard__footer">
    <p-button [label]="isLastStep ? 'Confirmar' : 'Continuar'"
              severity="primary" styleClass="w-full"
              [disabled]="!canProceed()"
              (onClick)="nextStep()" />
  </footer>
</div>
```

```scss
.ui-wizard {
  position: fixed;
  inset: 0;
  background: var(--ds-bg);
  z-index: var(--z-dialog);
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: calc(var(--space-3) + var(--ds-safe-top)) var(--space-4) var(--space-3);
    background: var(--ds-white);
    border-bottom: 1px solid var(--ds-surface-dark);

    h2 { margin: 0; font-size: 18px; }
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: var(--space-5) var(--space-4);

    h3 { margin-top: var(--space-5); }
    h3:first-child { margin-top: 0; }
  }

  &__footer {
    padding: var(--space-3) var(--space-4) calc(var(--space-3) + var(--ds-safe-bottom));
    background: var(--ds-white);
    border-top: 1px solid var(--ds-surface-dark);
  }
}
```

**Cuándo usar wizard vs form único:**
- 3+ secciones lógicas distintas → wizard en mobile, form único en desktop.
- Decisiones que dependen de pasos previos → wizard (la respuesta al paso 1 cambia las opciones del paso 2).
- Form simple de pocos campos → siempre dialog único.

---

## Patrón: Lista agrupada por categoría

Para listas largas que ganan al ser segmentadas (por fecha, por tipo, por estado).

```html
@for (grupo of items; track grupo.label) {
  <h3 class="ui-grupo-titulo">{{ grupo.label }}</h3>
  @for (item of grupo.items; track item.id) {
    <!-- card del item según el tipo -->
  }
}
```

La clase `.ui-grupo-titulo` ya está definida en `tokens.md`: caps pequeñas, color muted, separador entre grupos.

---

## Reglas finales de adaptación

1. **Siempre testear en 360px de ancho** (mínimo viable mobile, ej: iPhone SE).
2. **Nada de `width: 100vw`** sin considerar safe areas — usar `100%` o `100dvw`.
3. **Imágenes y media:** `max-width: 100%; height: auto`.
4. **Texto dinámico:** `text-overflow: ellipsis` + `min-width: 0` en flex children para que no rompan layouts.
5. **Pruebas en orientación landscape:** los formularios largos deben seguir scrolleando bien.
6. **Cuando hay duda entre mostrar algo en mobile o no:** primero pensar si ese dato es esencial; si no lo es, ocultarlo en mobile.
7. **Decidir el patrón antes que el código:** ante un nuevo requerimiento de pantalla, elegir qué patrones de los anteriores aplican y combinar; no inventar layouts ad-hoc.

---

## Nomenclatura BEM

```
.ui-[bloque]
.ui-[bloque]__[elemento]
.ui-[bloque]--[modificador]
```

Las clases nunca llevan referencia a un tenant específico. Para que el sistema sea white-label real, se prohíbe `.lcc-card`, `.acme-button`, `.tenant-foo`, etc. Toda clase del design system arranca con `.ui-`.

Las clases del feature (no del DS) pueden usar otro prefijo a discreción del proyecto, pero deben mantenerse separadas de las del DS para evitar contaminación.

Utilities de PrimeFlex (`flex`, `align-items-center`, `gap-2`, etc.) están permitidas para alineaciones rápidas inline.
