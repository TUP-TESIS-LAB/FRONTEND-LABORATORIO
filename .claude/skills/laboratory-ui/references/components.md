# Catálogo de Componentes

Stack: Angular 17+ standalone, PrimeNG v17, SCSS con tokens de `tokens.md`.
**Convención de prefijos:** clases `.ui-*`, variables fijas `--ds-*`, variables de marca `--brand-*`.
Todo componente debe ser adaptativo: funcionar en mobile y desktop sin cambios estructurales.

---

## Servicio de breakpoint (helper común)

```typescript
// breakpoint.service.ts
import { Injectable, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';

@Injectable({ providedIn: 'root' })
export class BreakpointService {
  isMobile = signal(false);
  isDesktop = signal(false);

  constructor(private bp: BreakpointObserver) {
    this.bp.observe(['(max-width: 767px)']).subscribe(r => this.isMobile.set(r.matches));
    this.bp.observe(['(min-width: 1024px)']).subscribe(r => this.isDesktop.set(r.matches));
  }
}
```

Uso en componente:
```typescript
constructor(public bp: BreakpointService) {}
// En template: @if (bp.isMobile()) { ... } @else { ... }
```

---

## Topbar Admin

```html
<header class="ui-topbar">
  <div class="ui-topbar__left">
    <p-button icon="pi pi-bars" [rounded]="true" severity="text"
              styleClass="ui-show-mobile-tablet"
              ariaLabel="Abrir menú"
              (onClick)="menuToggle.emit()" />
    <span class="ui-topbar__title">{{ pageTitle }}</span>
  </div>
  <div class="ui-topbar__right">
    <p-button icon="pi pi-bell" [rounded]="true" severity="text"
              [badge]="unreadCount > 0 ? unreadCount.toString() : null"
              ariaLabel="Notificaciones" />
    <p-avatar [label]="userInitials" shape="circle" />
    <p-menu #menu [model]="userMenuItems" [popup]="true" />
    <p-button icon="pi pi-chevron-down" severity="text"
              ariaLabel="Menú de usuario"
              (onClick)="menu.toggle($event)" />
  </div>
</header>
```

```scss
.ui-show-mobile-tablet {
  @include desktop-up { display: none; }
}
```

---

## Topbar Paciente (mobile-first)

```html
<header class="ui-topbar ui-topbar--patient">
  <div class="ui-topbar__left">
    <img class="ui-tenant-logo" alt="Logo" />
    <nav class="ui-show-desktop ui-topbar__nav">
      <a routerLink="/paciente" routerLinkActive="active">Inicio</a>
      <a routerLink="/paciente/turnos" routerLinkActive="active">Turnos</a>
      <a routerLink="/paciente/estudios" routerLinkActive="active">Estudios</a>
      <a routerLink="/paciente/perfil" routerLinkActive="active">Perfil</a>
    </nav>
  </div>
  <div class="ui-topbar__right">
    <p-avatar [label]="userInitials" shape="circle" />
  </div>
</header>
```

```scss
.ui-tenant-logo {
  // El logo se inyecta como background-image desde la variable de marca
  // para que sea reemplazable por tenant sin tocar HTML
  width: 120px;
  height: 32px;
  background-image: var(--brand-logo);
  background-repeat: no-repeat;
  background-size: contain;
  background-position: left center;
}

// Versión white para fondos oscuros (sidebar)
.ui-tenant-logo--white {
  background-image: var(--brand-logo-white);
}
```

**Nota:** alternativa con `<img [src]>` si se prefiere DOM accesible:
```html
<img class="ui-tenant-logo-img" [src]="brandLogoUrl" alt="Logo" />
```
Donde `brandLogoUrl` viene de un `BrandService` que lee la config del tenant.

---

## Sidebar (desktop admin)

```html
<nav class="ui-sidebar ui-show-desktop">
  <div class="ui-sidebar__logo">
    <span class="ui-tenant-logo ui-tenant-logo--white"></span>
  </div>
  <div class="ui-sidebar__nav">
    @for (item of navItems; track item.route) {
      <a class="ui-nav-item" [routerLink]="item.route" routerLinkActive="active">
        <i [class]="'pi ' + item.icon"></i>
        <span>{{ item.label }}</span>
      </a>
    }
  </div>
  <div class="ui-sidebar__footer">
    <a class="ui-nav-item" (click)="logout()">
      <i class="pi pi-sign-out"></i>
      <span>Cerrar sesión</span>
    </a>
  </div>
</nav>
```

---

## Drawer (mobile/tablet admin)

```html
<p-drawer [(visible)]="drawerOpen" position="left" styleClass="ui-drawer">
  <ng-template pTemplate="headless">
    <div class="ui-sidebar">
      <div class="ui-sidebar__logo">
        <span class="ui-tenant-logo ui-tenant-logo--white"></span>
      </div>
      <div class="ui-sidebar__nav">
        @for (item of navItems; track item.route) {
          <a class="ui-nav-item" [routerLink]="item.route"
             routerLinkActive="active" (click)="drawerOpen = false">
            <i [class]="'pi ' + item.icon"></i>
            <span>{{ item.label }}</span>
          </a>
        }
      </div>
    </div>
  </ng-template>
</p-drawer>
```

---

## Bottom navigation (mobile, paciente)

```html
<nav class="ui-bottom-nav ui-show-mobile">
  <a class="ui-bottom-nav__item" routerLink="/paciente"
     routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
    <i class="pi pi-home"></i>
    <span>Inicio</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/turnos" routerLinkActive="active">
    <i class="pi pi-calendar"></i>
    <span>Turnos</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/estudios" routerLinkActive="active">
    <i class="pi pi-file-edit"></i>
    <span>Estudios</span>
  </a>
  <a class="ui-bottom-nav__item" routerLink="/paciente/perfil" routerLinkActive="active">
    <i class="pi pi-user"></i>
    <span>Perfil</span>
  </a>
</nav>
```

**Reglas:** máximo 4 ítems. Labels cortos (≤8 caracteres). Íconos PrimeIcons consistentes.

---

## Tabla adaptativa (patrón crítico)

Mismo data, dos vistas controladas por CSS. Es uno de los patrones más importantes del DS porque resuelve el caso "lista de entidades" que aparece en todos los features.

```html
<!-- Desktop: p-table -->
<div class="ui-table-desktop">
  <p-table [value]="items" [paginator]="true" [rows]="15"
           [stripedRows]="true" [loading]="loading" styleClass="p-datatable-sm">
    <ng-template pTemplate="header">
      <tr>
        <th pSortableColumn="{key1}">{Columna 1} <p-sortIcon field="{key1}" /></th>
        <th pSortableColumn="{key2}">{Columna 2} <p-sortIcon field="{key2}" /></th>
        <th>{Columna 3}</th>
        <th>Acciones</th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-item>
      <tr>
        <td>{{ item.field1 }}</td>
        <td>
          <div class="flex align-items-center gap-2">
            <p-avatar [label]="item.initials" shape="circle" size="small" />
            <span>{{ item.displayName }}</span>
          </div>
        </td>
        <td>{{ item.field3 }}</td>
        <td>
          <p-button icon="pi pi-eye" [rounded]="true" severity="text"
                    [routerLink]="['...', item.id]"
                    pTooltip="Ver detalle" ariaLabel="Ver detalle" />
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>

<!-- Mobile: lista de cards -->
<div class="ui-list-mobile">
  @for (item of items; track item.id) {
    <a class="ui-list-card" [routerLink]="['...', item.id]">
      <p-avatar [label]="item.initials" shape="circle" />
      <div class="ui-list-card__info">
        <strong>{{ item.displayName }}</strong>
        <span class="ui-text-muted">{{ item.subtitle }}</span>
      </div>
      <i class="pi pi-chevron-right"></i>
    </a>
  } @empty {
    <div class="ui-empty-state">
      <i class="pi pi-{icono-relevante}"></i>
      <h4>{Mensaje vacío}</h4>
      <p>{Contexto opcional}</p>
    </div>
  }

  @if (loading) {
    @for (i of [1,2,3,4]; track i) {
      <p-skeleton height="72px" styleClass="mb-2" />
    }
  }
</div>
```

```scss
.ui-list-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-2);
  text-decoration: none;
  color: var(--ds-text);
  box-shadow: var(--ds-shadow-sm);
  min-height: var(--ds-touch-target);
  transition: transform 0.15s, box-shadow 0.15s;

  &:active {
    transform: scale(0.98);
    box-shadow: var(--ds-shadow-md);
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    strong { font-size: 14px; }
    span { font-size: 12px; color: var(--ds-text-muted); }
  }

  > i { color: var(--ds-text-muted); }
}
```

---

## Filtros adaptativos (toolbar / drawer)

```html
<!-- Desktop -->
<p-toolbar styleClass="ui-show-desktop mb-4">
  <ng-template pTemplate="left">
    <p-iconField iconPosition="left">
      <p-inputIcon styleClass="pi pi-search" />
      <!-- ngModel OK: filtro de UI sin submit al backend -->
      <input pInputText type="text" [(ngModel)]="searchTerm"
             placeholder="Buscar..." />
    </p-iconField>
  </ng-template>
  <ng-template pTemplate="right">
    <!-- ngModel OK: filtro de UI sin validación -->
    <p-dropdown [options]="filterOptions" [(ngModel)]="selectedFilter"
                placeholder="{Filtro}" [showClear]="true" />
    <p-button label="{Acción primaria}" icon="pi pi-plus" severity="primary" class="ml-2" />
  </ng-template>
</p-toolbar>

<!-- Mobile -->
<div class="ui-mobile-filters ui-show-mobile">
  <p-iconField iconPosition="left" styleClass="ui-search-input">
    <p-inputIcon styleClass="pi pi-search" />
    <input pInputText type="text" [(ngModel)]="searchTerm" placeholder="Buscar..." />
  </p-iconField>
  <p-button icon="pi pi-filter" [rounded]="true" severity="text"
            (onClick)="filtersDrawer = true" ariaLabel="Filtros"
            [badge]="activeFiltersCount > 0 ? activeFiltersCount.toString() : null" />
</div>

<p-drawer [(visible)]="filtersDrawer" position="bottom" styleClass="ui-drawer-bottom">
  <ng-template pTemplate="headless">
    <div class="ui-filter-sheet">
      <h3>Filtros</h3>
      <p-floatlabel>
        <p-dropdown id="filter1" [options]="filterOptions" [(ngModel)]="selectedFilter"
                    [showClear]="true" styleClass="w-full" />
        <label for="filter1">{Etiqueta filtro}</label>
      </p-floatlabel>
      <!-- más filtros según el feature -->
      <p-button label="Aplicar" severity="primary" styleClass="w-full mt-3"
                (onClick)="filtersDrawer = false" />
    </div>
  </ng-template>
</p-drawer>
```

```scss
.ui-mobile-filters {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  position: sticky;
  top: var(--ds-topbar-h);
  z-index: var(--z-sticky);
  background: var(--ds-bg);
  padding: var(--space-3) 0;

  .ui-search-input { flex: 1; }
}

.ui-filter-sheet {
  padding: var(--space-5) var(--space-4)
           calc(var(--space-5) + var(--ds-safe-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  h3 { margin: 0 0 var(--space-2); }
}
```

---

## Dialog adaptativo

```html
<p-dialog [(visible)]="showDialog"
          [header]="dialogTitle"
          [modal]="true"
          [draggable]="false"
          [resizable]="false"
          [style]="{ width: '520px' }"
          [breakpoints]="{ '768px': '100vw' }"
          styleClass="ui-dialog-fullscreen-mobile">

  <ng-template pTemplate="content">
    <!-- contenido -->
  </ng-template>

  <ng-template pTemplate="footer">
    <p-button label="Cancelar" severity="text" (onClick)="showDialog = false" />
    <p-button label="Guardar" severity="primary" (onClick)="onSave()" [loading]="saving" />
  </ng-template>
</p-dialog>
```

**Reglas:**
- Desktop ancho estándar: 520px (form simple), 720px (form extenso), 900px (con tabla).
- Mobile siempre full-screen vía `ui-dialog-fullscreen-mobile`.
- Footer: cancelar a la izquierda (`severity="text"`), acción principal a la derecha.

---

## Formularios (Reactive Forms)

**Todos los formularios usan Reactive Forms.** `ngModel` solo se acepta en filtros de UI sin submit.

### Setup del componente

```typescript
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, FloatLabelModule,
            DatePickerModule, DropdownModule, ButtonModule],
  template: `...`
})
export class EntityFormComponent {
  private fb = inject(FormBuilder);

  // Estructura genérica del form. Los nombres y validators concretos
  // los define cada feature según su dominio.
  form = this.fb.group({
    nombre:    ['', [Validators.required, Validators.minLength(2)]],
    email:     ['', [Validators.email]],
    telefono:  ['', []],
    fecha:     [null as Date | null, [Validators.required]],
    categoria: [null as number | null, []],
  });

  get f() { return this.form.controls; }

  hasError(field: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.get(field as string);
    return !!(ctrl?.invalid && (ctrl?.dirty || ctrl?.touched));
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // emit / call service con this.form.getRawValue()
  }
}
```

### Template

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()" class="ui-form-grid">

  <!-- Patrón: input de texto con validación required + minLength -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText id="nombre" formControlName="nombre"
             autocomplete="given-name"
             [class.ng-invalid]="hasError('nombre')"
             [class.ng-dirty]="f.nombre.dirty" />
      <label for="nombre">Nombre *</label>
    </p-floatlabel>
    @if (hasError('nombre')) {
      <small class="p-error">
        @if (f.nombre.errors?.['required']) { El nombre es requerido. }
        @if (f.nombre.errors?.['minlength']) { Mínimo 2 caracteres. }
      </small>
    }
  </div>

  <!-- Patrón: input numérico (con inputmode correcto y pattern) -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText id="codigo" formControlName="codigo"
             inputmode="numeric" autocomplete="off"
             [class.ng-invalid]="hasError('codigo')" />
      <label for="codigo">Código *</label>
    </p-floatlabel>
    @if (hasError('codigo')) {
      <small class="p-error">
        @if (f.codigo.errors?.['required']) { Campo requerido. }
        @if (f.codigo.errors?.['pattern']) { Formato inválido. }
      </small>
    }
  </div>

  <!-- Patrón: input de email con validator built-in -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText type="email" id="email" formControlName="email"
             inputmode="email" autocomplete="email"
             [class.ng-invalid]="hasError('email')" />
      <label for="email">Email</label>
    </p-floatlabel>
    @if (hasError('email')) {
      <small class="p-error">Email inválido.</small>
    }
  </div>

  <!-- Patrón: input de teléfono -->
  <div class="ui-field">
    <p-floatlabel>
      <input pInputText type="tel" id="tel" formControlName="telefono"
             inputmode="tel" autocomplete="tel" />
      <label for="tel">Teléfono</label>
    </p-floatlabel>
  </div>

  <!-- Patrón: date picker con validación -->
  <div class="ui-field">
    <p-floatlabel>
      <p-datePicker id="fecha" formControlName="fecha"
                    dateFormat="dd/mm/yy" [showIcon]="true"
                    styleClass="w-full"
                    [class.ng-invalid]="hasError('fecha')" />
      <label for="fecha">Fecha *</label>
    </p-floatlabel>
    @if (hasError('fecha')) {
      <small class="p-error">La fecha es requerida.</small>
    }
  </div>

  <!-- Patrón: dropdown ocupando ancho completo -->
  <div class="ui-field ui-form-full">
    <p-floatlabel>
      <p-dropdown id="categoria" formControlName="categoria"
                  [options]="opciones" optionLabel="nombre" optionValue="id"
                  [showClear]="true" styleClass="w-full"
                  placeholder=" " />
      <label for="categoria">Categoría</label>
    </p-floatlabel>
  </div>

  <!-- Patrón: footer con cancelar (text) + acción primaria (loading state) -->
  <div class="ui-form-actions ui-form-full">
    <p-button label="Cancelar" severity="text" type="button" (onClick)="cerrar()" />
    <p-button label="Guardar" severity="primary" type="submit"
              [loading]="saving" [disabled]="form.invalid && form.touched" />
  </div>
</form>
```

### Validación cruzada y validators custom

```typescript
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function fechaFuturaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return control.value >= hoy ? null : { fechaPasada: true };
  };
}

export function horaDisponibleValidator(ctrl: AbstractControl): ValidationErrors | null {
  const fecha = ctrl.get('fecha')?.value;
  const hora = ctrl.get('hora')?.value;
  if (!fecha || !hora) return null;
  // lógica cross-field
  return null;
}

// Uso
form = this.fb.group({
  fecha: [null, [Validators.required, fechaFuturaValidator()]],
  hora:  [null, [Validators.required]],
}, { validators: horaDisponibleValidator });
```

### Wizard de pasos con FormGroups anidados

```typescript
// Estructura: un FormGroup por paso, validables independientemente.
form = this.fb.group({
  paso1: this.fb.group({
    campoA: [null, Validators.required],
    campoB: [[], [Validators.required, Validators.minLength(1)]],
  }),
  paso2: this.fb.group({
    campoC: [null, Validators.required],
    fecha:  [null, [Validators.required, fechaFuturaValidator()]],
    hora:   [null, Validators.required],
  }),
});

get paso1() { return this.form.get('paso1') as FormGroup; }
get paso2() { return this.form.get('paso2') as FormGroup; }

canProceed(): boolean {
  const pasoActual = this.currentStep === 1 ? this.paso1 : this.paso2;
  return pasoActual.valid;
}

nextStep() {
  const pasoActual = this.currentStep === 1 ? this.paso1 : this.paso2;
  if (pasoActual.invalid) {
    pasoActual.markAllAsTouched();
    return;
  }
  this.currentStep++;
}
```

### Edición de entidad existente

Para editar, hacer `patchValue` con los datos cargados:

```typescript
@Input() set entity(value: TEntity | null) {
  if (value) {
    this.form.patchValue({
      // mapear cada campo de la entidad al control correspondiente
      nombre:    value.nombre,
      email:     value.email,
      telefono:  value.telefono,
      // Para fechas que vienen como string del backend:
      fecha:     value.fecha ? new Date(value.fecha) : null,
      categoria: value.categoriaId,
    });
  } else {
    this.form.reset();
  }
}
```

```scss
.ui-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);

  @include tablet-up {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-4) var(--space-5);
  }

  .ui-form-full { grid-column: 1 / -1; }
}

.ui-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  .p-error {
    font-size: 12px;
    padding-left: var(--space-1);
  }
}

.ui-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px solid var(--ds-surface-dark);

  @include mobile-only {
    flex-direction: column-reverse;
    .p-button { width: 100%; }
  }
}
```

### Cuándo usar `ngModel` (única excepción)

```html
<!-- ✅ OK: filtro rápido de búsqueda -->
<input pInputText [(ngModel)]="searchTerm" placeholder="Buscar..." />

<!-- ✅ OK: selector de vista -->
<p-selectButton [options]="personas" [(ngModel)]="personaSeleccionada" />

<!-- ❌ MAL: campo dentro de un formulario que se envía -->
<input pInputText [(ngModel)]="form.nombre" />
```

---

## Card expandible (acordeón)

Patrón para cards que muestran un resumen siempre visible y un detalle expandible. Útil cuando hay listas largas donde solo algunos items requieren ver detalle (resultados de análisis, órdenes, transacciones, etc.).

```html
<div class="ui-collapsible-card" [class.expanded]="expanded">
  <button class="ui-collapsible-card__header" (click)="expanded = !expanded">
    <div>
      <h4>{{ item.title }}</h4>
      <span class="ui-text-muted text-sm">{{ item.subtitle }}</span>
    </div>
    <div class="flex align-items-center gap-2">
      <!-- Tag de estado opcional -->
      <p-tag [value]="item.statusLabel" [styleClass]="'ui-tag-' + item.statusKey" />
      <i class="pi" [class.pi-chevron-down]="!expanded" [class.pi-chevron-up]="expanded"></i>
    </div>
  </button>

  @if (expanded) {
    <div class="ui-collapsible-card__body">
      <!-- contenido detallado del item -->
      <ng-content />

      <!-- Acciones opcionales al final del body -->
      <div class="ui-collapsible-card__actions">
        <p-button label="..." icon="pi pi-..." severity="text" (onClick)="..." />
      </div>
    </div>
  }
</div>
```

```scss
.ui-collapsible-card {
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-3);
  overflow: hidden;
  box-shadow: var(--ds-shadow-sm);

  &__header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    min-height: var(--ds-touch-target);

    h4 { margin: 0; font-size: 15px; }
  }

  &__body {
    padding: 0 var(--space-4) var(--space-4);
    border-top: 1px solid var(--ds-surface);
  }

  &__actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
}
```

---

## Patrón: Lista de filas con valor + rango

Para mostrar pares parámetro/valor con un rango/referencia opcional y posibilidad de marcar filas como "fuera de rango" (resultados clínicos, métricas con threshold, etc.).

```html
<div class="ui-data-row" [class.ui-data-row--alert]="item.outOfRange">
  <span class="ui-data-row__label">{{ item.label }}</span>
  <span class="ui-data-row__value">
    {{ item.value }} {{ item.unit }}
    @if (item.outOfRange) {
      <i class="pi pi-exclamation-triangle"></i>
    }
  </span>
  <span class="ui-data-row__reference">{{ item.referenceRange }}</span>
</div>
```

```scss
.ui-data-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  font-size: 14px;
  align-items: center;

  &__label     { font-weight: 500; }
  &__value     { font-weight: 600; color: var(--ds-text); }
  &__reference { font-size: 12px; color: var(--ds-text-muted); }

  &--alert {
    .ui-data-row__value {
      color: var(--ds-danger);
      i { margin-left: var(--space-1); }
    }
  }
}
```

---

## Card con date-stamp (event card)

Patrón para cards que representan eventos con fecha (turnos, citas, recordatorios). El stamp visual de fecha al inicio facilita el escaneo rápido en listas.

```html
<div class="ui-event-card" [class.ui-event-card--urgent]="event.urgent">
  <div class="ui-event-card__date-stamp">
    <span class="ui-event-card__day">{{ event.date | date:'dd' }}</span>
    <span class="ui-event-card__month">{{ event.date | date:'MMM' | uppercase }}</span>
  </div>
  <div class="ui-event-card__info">
    <h4>{{ event.title }}</h4>
    <p><i class="pi pi-clock mr-1"></i>{{ event.time }}</p>
    <p><i class="pi pi-map-marker mr-1"></i>{{ event.location }}</p>
  </div>
  <div class="ui-event-card__status">
    <p-tag [value]="event.statusLabel" [styleClass]="'ui-tag-' + event.statusKey" />
    <!-- Acción contextual opcional según el estado -->
  </div>
</div>
```

```scss
.ui-event-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  margin-bottom: var(--space-3);
  box-shadow: var(--ds-shadow-sm);

  &__date-stamp {
    flex-shrink: 0;
    width: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-2);
    background: var(--brand-primary-light);
    border-radius: var(--ds-radius-sm);
    color: var(--brand-primary);
  }

  &__day { font-size: 22px; font-weight: 700; line-height: 1; }
  &__month { font-size: 11px; font-weight: 600; letter-spacing: 0.5px; }

  &__info {
    flex: 1;
    min-width: 0;

    h4 { margin: 0 0 var(--space-1); font-size: 15px; }
    p {
      margin: 0;
      font-size: 13px;
      color: var(--ds-text-muted);
      display: flex;
      align-items: center;
    }
  }

  &__status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1);
  }

  &--urgent {
    border-left: 4px solid var(--brand-accent);
  }
}
```

---

## FAB para acción primaria mobile

```html
<p-button class="ui-fab ui-show-mobile"
          icon="pi pi-plus"
          [rounded]="true"
          severity="primary"
          ariaLabel="Reservar turno"
          (onClick)="reservarTurno()" />

<p-button class="ui-show-desktop" label="Reservar turno"
          icon="pi pi-plus" severity="primary"
          (onClick)="reservarTurno()" />
```

---

## Confirmación destructiva

```html
<p-confirmDialog />
```

```typescript
constructor(private confirm: ConfirmationService, private toast: MessageService) {}

cancelarTurno(turno: Turno) {
  this.confirm.confirm({
    message: `¿Cancelar el turno del ${turno.fecha}?`,
    header: 'Confirmar cancelación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, cancelar',
    rejectLabel: 'No',
    acceptButtonStyleClass: 'p-button-danger',
    accept: () => { /* lógica de cancelación */ }
  });
}
```

---

## Toast / notificaciones

```html
<p-toast [position]="bp.isMobile() ? 'top-center' : 'top-right'" />
```

```typescript
this.messageService.add({
  severity: 'success',
  summary: 'Turno creado',
  detail: 'El turno fue registrado correctamente',
  life: 4000
});
```

---

## Skeleton / loading

```html
@if (loading) {
  @for (i of [1,2,3,4,5]; track i) {
    <p-skeleton height="72px" styleClass="mb-2" />
  }
} @else {
  <!-- contenido real -->
}
```

---

## Card horizontal con avatar y acciones

Patrón genérico para mostrar una entidad con identidad visual (avatar/iniciales) + datos resumen + acciones contextuales. Aplica a personas (pacientes, contactos, miembros de familia), pero también a cualquier entidad con un identificador visual.

```html
<div class="ui-entity-card">
  <p-avatar [label]="entity.initials" shape="circle" size="large"
            [style]="{ background: 'var(--brand-secondary)', color: 'white' }" />
  <div class="ui-entity-card__info">
    <h4>{{ entity.title }}</h4>
    <p>{{ entity.subtitle }}</p>
    <p>{{ entity.metadata }}</p>
  </div>
  <div class="ui-entity-card__actions">
    <p-button icon="pi pi-..." severity="text"
              ariaLabel="..." pTooltip="..." (onClick)="..." />
    <!-- ... más acciones ... -->
  </div>
</div>
```

```scss
.ui-entity-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--ds-white);
  border-radius: var(--ds-radius-md);
  box-shadow: var(--ds-shadow-sm);

  &__info {
    flex: 1;
    min-width: 0;
    h4 { margin: 0 0 var(--space-1); font-size: 15px; }
    p { margin: 0; font-size: 13px; color: var(--ds-text-muted); }
  }

  &__actions {
    display: flex;
    gap: var(--space-1);

    // En mobile, dejar visible solo la acción primaria
    // y mover las demás a un menú overflow
    @include mobile-only {
      .p-button:not(:first-child) { display: none; }
    }
  }
}
```

**Diferencia con `ui-list-card`:**
- `ui-list-card`: lista densa, item entero clickeable (navega), sin acciones inline.
- `ui-entity-card`: card más espaciosa, con acciones inline, no navega como un todo.

---

## Stepper (PrimeNG 21) — wizard horizontal de N pasos

Patrón usado para flujos de alta multi-paso (sucursales, agendas, etc.). PrimeNG 21 tiene dos patrones; **siempre usar el simplificado** (más limpio, menos elementos).

### Patrón simplificado (recomendado)

```html
<p-stepper [(value)]="currentStep" [linear]="false" class="alta-stepper">

  <p-step-list>
    <p-step [value]="1">Datos</p-step>
    <p-step [value]="2" [disabled]="entityId() == null"
            [pTooltip]="entityId() == null ? 'Guardá los datos básicos primero' : ''"
            tooltipPosition="bottom">Horarios</p-step>
    <p-step [value]="3" [disabled]="entityId() == null"
            [pTooltip]="entityId() == null ? 'Guardá los datos básicos primero' : ''"
            tooltipPosition="bottom">Contactos</p-step>
    <!-- ... -->
  </p-step-list>

  <p-step-panels>
    <p-step-panel [value]="1">
      <ng-template #content>
        <div class="step-content">
          <app-datos-step (completed)="onDatosCompleted($event)" (cancel)="cancel()" />
        </div>
      </ng-template>
    </p-step-panel>
    <!-- ... -->
  </p-step-panels>

</p-stepper>

<p-toast />
```

**Imports del page:** `StepperModule, TooltipModule, ButtonModule, ToastModule, ...stepComponents`.

### Estructura DOM real (importante para el SCSS)

PrimeNG 21 renderiza el patrón simplificado así (clases reales aplicadas):

```
<p-stepper class="p-stepper alta-stepper">
  <p-step-list class="p-steplist">
    <p-step class="p-step" data-p-active="..." data-p-disabled="...">  ← wrapper de cada paso
      <button>...</button>
      <p-stepper-separator class="p-stepper-separator" />  ← se oculta
    </p-step>
    ...
  </p-step-list>
  <p-step-panels class="p-steppanels">              ← SIN GUION
    <p-step-panel class="p-steppanel">              ← SIN GUION
      <div class="p-steppanel-content-wrapper">     ← wrapper interno
        <div class="p-steppanel-content">           ← envuelve el ng-template
          ...contenido del step...
        </div>
      </div>
    </p-step-panel>
    ...
  </p-step-panels>
</p-stepper>
```

**Gotcha crítico — el wrapper de cada paso es `.p-step`, NO `.p-stepitem`.** La clase `.p-stepitem` solo existe si usás el patrón completo con `<p-step-item>` wrapper, que no usamos. Todo selector apuntando a `.p-stepitem` en el patrón simplificado falla silenciosamente (no hay error, simplemente no matchea).

**Gotcha 2 — inconsistencia con/sin guión.** Los selectores HTML llevan guión (`<p-step-panels>`, `<p-step-panel>`) pero las **clases CSS emitidas no** (`.p-steppanels`, `.p-steppanel`). Mismo patrón: `<p-step-list>` → `.p-steplist`. Si en SCSS escribís `.p-step-panels` (con guión), no matchea nada. Síntoma: el scroll que esperabas dentro del step queda atrapado en el stepper entero porque la cadena `flex: 1` se rompe en el panels container.

### Layout uniforme con CSS Grid

Para distribuir los pasos en columnas matemáticamente iguales (sin que títulos largos como "Workspaces" empujen su columna), usar **CSS Grid de N columnas `minmax(0, 1fr)`** en el `.p-steplist`. Flex con `flex: 1 1 0` falla porque `white-space: nowrap` del título lo sobrepasa.

### SCSS completo para un stepper de N pasos

Reemplazar `repeat(6, ...)` por el número real de pasos.

```scss
.alta-page {
  /* NO usar height: 100dvh aca — el shell ya descuenta topbar via flex:1. */
  padding: 0;                    /* el shell content ya aporta var(--space-6) */
  max-width: 64rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.alta-stepper {
  background: #ffffff;            /* NO usar var(--surface-card) — undefined en PrimeNG 21 */
  border-radius: 8px;
  padding: 1rem 1.25rem;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.step-content {
  padding: 1rem 0 0;
  flex: 1 1 auto;
  overflow-y: auto;
}

/* === PrimeNG 21 stepper overrides ===
   Patron simplificado: el wrapper real de cada paso es .p-step (NO .p-stepitem).
   Grid de N columnas iguales para uniformidad geometrica.
   Lineas entre pasos via .p-step::after.
   El separator nativo .p-stepper-separator queda dentro del template del <p-step>
   abajo del titulo; lo escondemos y dibujamos lineas manualmente.  */
.alta-stepper ::ng-deep {
  .p-steplist {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));  /* N = cantidad de pasos */
    padding: 0.5rem 0 1rem;
    list-style: none;
    margin: 0;
  }

  .p-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--ds-text-muted);   /* NO usar --text-color-secondary (undefined) */
    font: inherit;
    position: relative;
    min-width: 0;
    z-index: 1;
  }

  .p-step[data-p-disabled='true'] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .p-step-number {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #ffffff;            /* NO usar --surface-card (undefined) */
    color: var(--ds-text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.875rem;
    flex: 0 0 auto;
    border: 2px solid #e5e7eb;     /* NO usar --surface-200 (undefined) */
    transition: all 0.2s;
  }

  .p-step[data-p-active='true'] .p-step-number {
    background: var(--brand-primary);
    color: var(--p-primary-contrast-color);
    border-color: var(--brand-primary);
  }

  .p-step-title {
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    text-align: center;
  }

  .p-step[data-p-active='true'] .p-step-title {
    color: var(--ds-text);
    font-weight: 600;
  }

  /* Linea entre pasos. Cada .p-step (excepto el ultimo) dibuja un segmento
     a su derecha que va al circulo del siguiente paso.
       top   = 1rem - 1px (centro del circulo desde el top del p-step,
                            asumiendo circulo de 2rem alto como primer child)
       left  = 50% + 1.25rem (centro circulo + radio 1rem + gap 0.25rem)
       width = 100% - 2.5rem (analogo del otro lado) */
  .p-step:not(:last-child)::after {
    content: '';
    position: absolute;
    top: calc(1rem - 1px);
    left: calc(50% + 1.25rem);
    width: calc(100% - 2.5rem);
    height: 2px;
    background: #9ca3af;             /* gray-400; sube de #d1d5db si te queda muy sutil */
    pointer-events: none;
    z-index: 0;
  }

  .p-stepper-separator {
    display: none;
  }

  /* Cadena de wrappers de panels — clases SIN GUION en CSS aunque los
     selectores HTML lleven guion. Cada nivel necesita flex:1 + min-height:0
     para que el scroll termine adentro del .step-content y no escale al
     stepper entero. */
  .p-steppanels {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .p-steppanel {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .p-steppanel-content-wrapper,
  .p-steppanel-content {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

@media (max-width: 540px) {
  .alta-stepper ::ng-deep .p-step-title { display: none; }
}
```

### Checklist al crear un stepper nuevo

- [ ] Usar patrón simplificado: `<p-step-list>` con `<p-step>` directos, sin `<p-step-item>`.
- [ ] Imports del page: `StepperModule, TooltipModule` (sí o sí — el `pTooltip` en `<p-step>` lo necesita).
- [ ] Cambiar `repeat(N, ...)` por la cantidad real de pasos en `.p-steplist`.
- [ ] **No usar selectores con `.p-stepitem`** — no existen en este patrón.
- [ ] **Clases sin guión: `.p-steppanels`, `.p-steppanel` (no `.p-step-panels` ni `.p-step-panel`).** Inconsistencia de PrimeNG 21 vs los selectores HTML. Si escribís el SCSS con guión, no aplica nada y el scroll queda atrapado en el stepper.
- [ ] Si el step tiene scroll interno (resúmenes largos, tablas), agregar la **cadena flex completa** en panels/panel/content-wrapper/content (ver SCSS completo arriba). Sin esa cadena el `.step-content` no recibe altura definida.
- [ ] **No usar vars `--primary-color`, `--surface-card`, `--surface-border`, `--text-color-secondary`** — undefined en PrimeNG 21. Ver `tokens.md` sección "Tokens legacy PrimeNG".
- [ ] Cada step component (`<app-X-step>`) emite outputs `next`/`back` y opcionalmente `cancel`. El page los cablea a `goToStep()` / `cancel()`.
- [ ] Step 1 emite `(completed)="onCompleted($event)"` con el id de la entidad creada; el page habilita los pasos 2..N cuando ese id está seteado.
- [ ] Pasos 2..N usan `[disabled]="entityId() == null"` + `pTooltip` condicional para explicar el bloqueo.
- [ ] Footer del step 1: simétrico con `<Cancelar>` izquierda + `<Siguiente>` derecha (evita "salto visual" al avanzar).

### Anatomía de un step component

Cada step es un standalone component con su propio FormGroup (si hay form), Output `next` / `back` (excepto el primero y el último), y `(completed)` solo en el primer step si dispara la creación.

```typescript
@Component({
  selector: 'app-horarios-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* ReactiveFormsModule, etc. */],
  templateUrl: './horarios-step.component.html',
  styleUrl: './horarios-step.component.scss',
})
export class HorariosStepComponent {
  @Input({ required: true }) entityId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
  // ...
}
```

Footer estándar de cada step (consistencia visual):

```html
<footer class="step-footer">
  <p-button label="Volver" icon="pi pi-arrow-left" severity="secondary" (click)="back.emit()" />
  <p-button label="Siguiente" icon="pi pi-arrow-right" iconPos="right" (click)="next.emit()" />
</footer>
```

```scss
.step-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 1rem;
}
```
