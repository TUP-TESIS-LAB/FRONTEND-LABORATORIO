---
name: angular-conventions
description: >
  Convenciones personales para proyectos Angular: estructura de carpetas
  (core/shared/layout/features) y preferencia por signals (toSignal, resource)
  en lugar de Observables para traer y renderizar datos. Usar al crear o
  modificar proyectos Angular, decidir dónde poner archivos, o consumir datos
  asincrónicos en componentes. Complementa la skill oficial angular-developer
  del Angular Team — no duplica reglas del framework.
---

# Angular — Convenciones personales

Complementa la skill oficial `angular-developer`. La oficial cubre el framework; esta agrega solo dos decisiones de proyecto.

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
├── pages/              # Smart components ruteables
├── components/         # Dumb components específicos del feature
├── services/           # API clients y stores del feature
├── models/             # Tipos de dominio
└── <feature>.routes.ts
```

**Reglas que hacen que la estructura funcione:**

- `core/` no se importa desde `features/`. Solo desde `app.config.ts` y otros archivos de `core/`.
- `shared/` no contiene lógica de negocio. Si conoce un tipo de dominio (ej: `Turno`, `Paciente`), no va ahí.
- Una feature **no importa de otra feature**. Si tienen que compartir algo: si es genérico sube a `shared/`, si es servicio cross-cutting sube a `core/`.
- Servicios de feature van en `providers: []` de la ruta del feature, no en `providedIn: 'root'`.

Path aliases en `tsconfig.json`:
```json
"paths": {
  "@core/*": ["app/core/*"],
  "@shared/*": ["app/shared/*"],
  "@layout/*": ["app/layout/*"],
  "@features/*": ["app/features/*"]
}
```

## 2. Signals para renderizar datos asincrónicos

Cuando un componente trae datos para mostrar, **preferir signals** sobre Observables + `async` pipe. Evita problemas de re-render y múltiples suscripciones.

**`resource()` para fetch dependiente de un parámetro** (Angular 19+):
```typescript
readonly id = input.required<string>();

protected readonly userResource = resource({
  request: () => ({ id: this.id() }),
  loader: ({ request }) => firstValueFrom(this.api.getUser(request.id)),
});
```
```html
@if (userResource.isLoading()) { <spinner /> }
@else if (userResource.value(); as user) { <h1>{{ user.nombre }}</h1> }
```

**`toSignal()` para Observables existentes:**
```typescript
readonly users = toSignal(this.api.getUsers(), { initialValue: [] });
```

**Estado derivado con `computed()`, no con métodos en el template:**
```typescript
// ✅
readonly cantidad = computed(() => this.users().length);
// ❌
getCantidad() { return this.users().length; }  // se ejecuta en cada change detection
```

**`Observable` queda bien para:** streams reales (websockets, eventos del DOM, cosas que emiten múltiples veces). Para fetch de datos one-shot que se renderizan, signal.

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
