---
name: angular-conventions
description: >
  Convenciones personales para proyectos Angular: estructura de carpetas
  (core/shared/layout/features con store + pages + components + services + models),
  uso de signals para estado local de UI y derivados con computed, OnPush por
  default. Usar al crear o modificar proyectos Angular, decidir dónde poner
  archivos, o consumir datos en componentes. Complementa la skill oficial
  angular-developer del Angular Team. NO cubre llamadas al backend ni fetch HTTP
  — esa responsabilidad es exclusiva de la skill `ngrx-backend-request`.
---

# Angular — Convenciones personales

Complementa la skill oficial `angular-developer`. La oficial cubre el framework; esta agrega decisiones de proyecto.

> **Prioridad de skills.** Para cualquier llamada al backend, fetch de datos remotos, o flujo contra una API HTTP, **la skill `ngrx-backend-request` manda por encima de esta y de cualquier otra**. Esta skill cubre solo estructura, estado local del componente y reglas de change detection — nunca fetch HTTP.

## 1. Estructura de carpetas

```
src/app/
├── core/         # Singletons globales: auth, guards, interceptors, servicios providedIn root
├── shared/       # UI dumb + utils sin lógica de negocio (componentes, pipes, directivas, validators)
├── layout/       # Shells de la app (admin-shell, public-shell, etc.)
├── features/     # Dominios de negocio, cada uno aislado
└── app.config.ts
```

Cada feature por dentro:

```
features/<feature>/
├── store/              # NgRx slice del feature: state, actions, effects, reducer, selectors
├── pages/              # Smart components ruteables (consumen el store con selectSignal)
├── components/         # Dumb components específicos del feature
├── services/           # API clients llamados solo desde effects (HTTP fino, sin transformaciones)
├── models/             # Tipos de dominio re-exportables (también pueden vivir en store/<feature>.state.ts)
└── <feature>.routes.ts
```

> El layout y los nombres exactos de los archivos dentro de `store/` los define `ngrx-backend-request`. Esta skill solo enumera las carpetas.

**Reglas que hacen que la estructura funcione:**

- `core/` no se importa desde `features/`. Solo desde `app.config.ts` y otros archivos de `core/`.
- `shared/` no contiene lógica de negocio. Si conoce un tipo de dominio (ej: `Turno`, `Paciente`), no va ahí.
- Una feature **no importa de otra feature**. Si tienen que compartir algo: si es genérico sube a `shared/`, si es servicio cross-cutting sube a `core/`.
- Los servicios HTTP del feature usan `@Injectable({ providedIn: 'root' })` (lo exige `ngrx-backend-request`). Para servicios stateful sin HTTP que sí están acotados al feature, usar `providers: []` de la ruta.

Path aliases en `tsconfig.json`:
```json
"paths": {
  "@core/*": ["app/core/*"],
  "@shared/*": ["app/shared/*"],
  "@layout/*": ["app/layout/*"],
  "@features/*": ["app/features/*"]
}
```

## 2. Signals para estado de UI (no para fetch HTTP)

Esta skill cubre el uso de signals para **estado local del componente y derivados**. El fetch de datos remotos NO va por acá: cualquier llamada al backend pasa obligatoriamente por NgRx según `ngrx-backend-request`, y los componentes leen ese estado con `store.selectSignal(...)`.

**Para qué sí usar signals locales:**

- Estado UI del componente que no vive en el store global: paneles abiertos/cerrados, tab activo, modo edición, valor de un filtro de UI, selección actual.
- Derivados puros sobre signals existentes (incluidos los que vienen del store) con `computed()`.
- Inputs reactivos con `input()` / `input.required()`.

**Reglas:**

```typescript
// ✅ Estado local de UI
readonly drawerOpen = signal(false);
readonly activeTab = signal<'datos' | 'historial'>('datos');

// ✅ Derivado sobre el signal del store, en el componente
readonly turnos = this.store.selectSignal(selectAllTurnos);
readonly cantidad = computed(() => this.turnos().length);

// ❌ Métodos en template — se ejecutan en cada change detection
getCantidad() { return this.turnos().length; }
```

**Lo que NO se hace en esta skill:**

- ❌ Usar `resource()` o `toSignal(http.get(...))` para hidratar datos remotos. Va por NgRx.
- ❌ Llamar a un service HTTP desde el componente. Solo desde un effect.
- ❌ Usar `select(...) | async` en templates. Usar `selectSignal`.

**`Observable` sigue siendo la herramienta correcta para:** streams reales (websockets, eventos del DOM, cosas que emiten múltiples veces) que no representen el estado remoto del dominio. Si lo que querés es traer datos de la API y mostrarlos, va por NgRx.

## 3. Change detection: `OnPush` por default

Todos los componentes usan `changeDetection: ChangeDetectionStrategy.OnPush`. Con signals no agrega complejidad — Angular trackea automáticamente qué signal lee qué componente y solo re-chequea lo que cambió.

```typescript
@Component({
  selector: 'app-user-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class UserCard { }
```

## 4. Reactive Forms expuestos como signals

El proyecto usa **Reactive Forms** (`FormBuilder` + `formControlName`) — esa decisión está fijada en `laboratory-ui`. Como el resto del componente lee estado vía signals (selectors del store, estado UI local con `signal()`/`computed()`), el form también se expone como signals para que componga con `OnPush` sin saltos manuales de change detection.

**Patrón base** (al lado de la definición del `FormGroup`):

```typescript
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-entity-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entity-form.component.html',
})
export class EntityFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email:  ['', [Validators.email]],
  });

  // Reflejo del form como signals — listos para usar en el template y en computed.
  readonly value  = toSignal(this.form.valueChanges,  { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly invalid = computed(() => this.status() === 'INVALID');
  readonly canSubmit = computed(() => this.status() === 'VALID');
}
```

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input pInputText formControlName="nombre" />
  <input pInputText formControlName="email" />

  <p-button
    label="Guardar"
    severity="primary"
    type="submit"
    [disabled]="!canSubmit()" />
</form>
```

**Reglas:**

- Los flags reactivos del form que se lean en el template (`invalid`, `valid`, `canSubmit`, `value`, `errors` derivados) se exponen como `signal` o `computed`, no como getters que leen `form.invalid` directo. Eso evita que con `OnPush` el botón quede desincronizado al cambiar el estado del form programáticamente.
- Para casos puntuales donde solo necesitás leer un control en un evento del usuario (`onSubmit`, click handler), usar `form.get(...)` o `form.invalid` directo está bien — el evento ya dispara CD por sí mismo.
- **No** usar `signal forms` (`@angular/forms/signals`). El proyecto se queda con Reactive Forms; signals son el envoltorio para consumir su estado.

**Por qué esta convención:** mantiene un solo modelo mental — todo lo que el template lee es signal — y permite componer el estado del form con selectors de NgRx en `computed()` (por ejemplo: deshabilitar Guardar mientras un selector indica `pending: true` en el store).
