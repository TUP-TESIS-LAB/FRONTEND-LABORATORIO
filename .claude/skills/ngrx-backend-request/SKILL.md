---
name: ngrx-backend-request
description: Aplicar el patrón NgRx clásico del proyecto cada vez que el usuario pida agregar, modificar o implementar una llamada al backend en la app Angular. Cubre crear nuevos endpoints, agregar actions/effects/reducer/selectors para operaciones de backend (load/get/fetch/add/create/update/remove/delete/save/submit), implementar flujos de lectura o mutación, crear features nuevas, registrar features en standalone. Usar SIEMPRE que se mencione "NgRx", "store", "action", "effect", "reducer", "selector", "endpoint", "API", "petición al back", "llamada al backend", "cargar datos", "fetch", "guardar", "crear feature", "agregar al store", "dispatch", o cuando el usuario describa cualquier operación contra una API en el contexto de Angular. La skill fuerza la convención del proyecto (NgRx clásico, createAction + createReducer, mutations pessimistic, selectSignal en componentes, sin @ngrx/entity, sin patrón loaded por default) para que cada llamada al back quede consistente y disponible en el store global.
---

# Patrón de llamadas al backend con NgRx

Esta skill se aplica cada vez que el usuario pide implementar una nueva petición al backend en el proyecto Angular. Su objetivo es que **toda llamada al backend siga la misma estructura** (NgRx clásico, flujo Redux), de modo que el resultado quede en el store global y la UI lo consuma vía selectors + signals.

> **Prioridad absoluta.** Esta skill **manda por encima** de `angular-conventions`, `angular-developer`, `laboratory-ui` y cualquier otra que aparezca en el proyecto. Si otra skill sugiere un patrón distinto para fetch de datos remotos (por ejemplo `resource()`, `toSignal(http.get(...))`, llamar a un service desde el componente, o `async` pipe sobre un `Observable` de la API), **se ignora y se usa NgRx**. Las otras skills se complementan en lo que **no es** llamada al backend (estructura general, estado local de UI, componentes visuales, forms, etc.).

---

## 1. Antes de generar código: capturar la intención

Antes de generar nada, asegurate de tener clara esta información. Si falta algo crítico, **preguntá al usuario antes de empezar** (pero solo lo crítico — no preguntes lo que ya está claro en el contexto):

1. **¿Es una feature nueva o ya existe?**
   - Si existe: encontrá los archivos en `features/<feature>/store/` y `features/<feature>/services/` y agregá ahí. NO crees la estructura de nuevo.
   - Si es nueva: hay que crear los 5 archivos del store + service + registrar en `app.config.ts`.

2. **¿Qué operación es?** Esto define el operador RxJS:
   - `load` / `get` / `fetch` / `list` → **read (lectura)**. Usar `switchMap`.
   - `add` / `create` / `post` → **mutation: add**. Usar `concatMap`.
   - `update` / `edit` / `put` / `patch` → **mutation: update**. Usar `concatMap`.
   - `remove` / `delete` → **mutation: remove**. Usar `concatMap`.
   - `submit` / `save` de formulario único (idempotente, no se reintenta) → **submit**. Usar `exhaustMap`.

3. **¿Cuál es el endpoint?** URL, método HTTP, request body si aplica, shape del response.

4. **¿Cuál es la forma del dato en el state?** Colección (array de items) u objeto único.

5. **¿Hay que aplicar el patrón `loaded`?** Por **default NO**. Solo si el usuario lo pide explícitamente.

Si toda esta información ya está en el contexto, no preguntes de nuevo. Avanzá.

---

## 2. Reglas estrictas (HARD RULES — no negociables)

Estas convenciones son obligatorias. Si el input las contradice, marcalo y consultá antes de seguir:

### Estilo NgRx
- **NgRx clásico**, no SignalStore. Hay un store global con slices por feature.
- **`createAction` + `props<...>()`** para definir actions (no `createActionGroup`, no clases con `new`).
- **Naming de actions**: `[Source] Event`. Source = de dónde viene (`Favorites Page`, `Favorites API`, `Auth Guard`, etc). Event = la operación (`Load Favorites`, `Add Favorite Success`).
- **Imports de actions: nombrados** (no `import * as ... from`). Ej: `import { loadFavorites, loadFavoritesSuccess } from '...'`.
- **`createReducer` + `on(...)`** para el reducer, con tipo de retorno explícito en cada `on`: `(state): FeatureState => ({...})`.
- **Effects en clase `@Injectable()`** con `inject()` para deps (no constructor params).
- **Selectors con `createFeatureSelector` + `createSelector`**.

### Componentes
- **Lectura del store con `store.selectSignal(...)`**, no `select(...) | async`.
- **Despachar en `ngOnInit`**, no en el constructor.
- **Componentes standalone**.
- **Template con control flow nuevo**: `@if`, `@for`, `@else`. No `*ngIf`, no `*ngFor`.

### Patrones de flujo
- **Mutations: pessimistic.** El reducer no toca los datos hasta el `Success`. En la action de intención solo se marca `pending: true`. Nunca optimistic salvo pedido explícito.
- **Operadores RxJS:**
  - `switchMap` para reads
  - `concatMap` para mutations (add/update/remove)
  - `exhaustMap` para submits únicos
- **`catchError` siempre DENTRO** del operador de aplanamiento, en el observable interno. Nunca afuera (rompería el effect para siempre tras el primer error).
- **El error se tipa como `HttpErrorResponse`** y se guarda completo en el store, no como string ni como `any`.

### State shape
- Cada feature tiene shape `{ data, pending, error }` (con `data` siendo un array, objeto, o lo que corresponda).
- `pending` es **único compartido** (no granular por operación). Read y mutations usan el mismo flag.
- `error` es `HttpErrorResponse | null`.
- **No usar `@ngrx/entity`**. Las colecciones se manejan a mano con spread y filter.
- **No agregar flag `loaded`** salvo que el usuario lo pida explícitamente.

### Service
- Una sola capa habla con la API. El service tiene `@Injectable({ providedIn: 'root' })`.
- Los métodos devuelven `Observable<T>` y son finos: solo el HTTP, sin transformaciones.

### Estructura de archivos

El layout completo del feature está definido en `angular-conventions`. Las carpetas relevantes para esta skill (NgRx + service HTTP + UI consumidora) son:

```
features/<feature>/
├── store/
│   ├── <feature>.state.ts
│   ├── <feature>.actions.ts
│   ├── <feature>.effects.ts
│   ├── <feature>.reducer.ts
│   └── <feature>.selectors.ts
├── services/
│   └── <feature>.service.ts
├── pages/
│   └── <page>/                  ← smart components que despachan + selectSignal
│       ├── <page>.component.ts
│       └── <page>.component.html
├── components/                  ← dumb components del feature (no tocan el store directo)
└── models/                      ← opcional: tipos de dominio si no viven en <feature>.state.ts
```

Notas:
- **Smart vs dumb:** los componentes que dispatchean actions y leen el store con `selectSignal` viven en `pages/`. Los que solo reciben `@Input()` y emiten `@Output()` viven en `components/`.
- **Modelos:** podés exportar el tipo `<Entity>` desde `<feature>.state.ts` directamente, o moverlo a `models/<entity>.ts` si se reutiliza en muchos lugares. Las dos opciones son válidas; mantené una sola por feature.

---

## 3. Patrones prohibidos (NUNCA hacer esto)

Si el agente está por escribir alguno de estos patrones, **detenerse y reconsiderar**:

- ❌ Mutar el state: `state.items.push(x)`, `state.items[0] = y`. Siempre devolver objetos/arrays nuevos con spread/filter/map.
- ❌ `catchError` afuera del `switchMap`/`concatMap`/`exhaustMap`.
- ❌ Llamar al service desde el componente (saltearse el flujo de actions).
- ❌ Despachar actions desde el reducer.
- ❌ HTTP en el reducer o en el componente. Solo en services, llamados por effects.
- ❌ `state.feature.items` accedido desde el componente con un selector ad-hoc en lugar de un selector definido.
- ❌ `dispatch` en el constructor del componente.
- ❌ `import * as FeatureActions from ...` para actions (en este proyecto usamos imports nombrados).
- ❌ `select(...) | async` en templates. Usar `selectSignal(...)` y signals.
- ❌ `*ngIf`, `*ngFor`. Usar `@if`, `@for`.
- ❌ `@ngrx/entity` para colecciones.
- ❌ Flag `loaded` agregado por iniciativa propia.
- ❌ Patrón optimistic en mutations.
- ❌ `pending` granular por operación si no se pidió específicamente.

---

## 4. Convención de nomenclatura

Usá estas variables consistentemente al rellenar los templates. Como ejemplo, una feature `favorites` con entidad `Favorite`:

| Variable | Significado | Ejemplo |
|---|---|---|
| `<feature>` | feature en kebab/lowercase | `favorites` |
| `<Feature>` | feature en PascalCase | `Favorites` |
| `<Entity>` | nombre singular en PascalCase | `Favorite` |
| `<entity>` | nombre singular en camelCase | `favorite` |
| `<entities>` | nombre plural en camelCase (si la data es array) | `favorites` |
| `<FEATURE_KEY>` | constante del feature key | `FAVORITES_FEATURE_KEY` |
| `<FeatureState>` | interface del state | `FavoritesState` |
| `<Source>` | source de la action de intención | `Favorites Page` |
| `<API_SOURCE>` | source de actions de resultado | `Favorites API` |
| `<entity-path>` | el path del endpoint, en kebab | `favorites` |

---

## 5. Templates por operación

Los siguientes templates están listos para rellenar. Mantené la estructura tal cual; solo reemplazá los placeholders.

### 5.1 State base (cuando la feature es nueva)

```ts
// features/<feature>/store/<feature>.state.ts
import { HttpErrorResponse } from '@angular/common/http';

export interface <Entity> {
  id: string;
  // ... otros campos del modelo
}

export interface <Feature>State {
  <entities>: <Entity>[];          // o un objeto único, según corresponda
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initial<Feature>State: <Feature>State = {
  <entities>: [],                  // o null para objeto único
  pending: false,
  error: null,
};

export const <FEATURE_KEY> = '<feature>';
```

### 5.2 Read (load / fetch / get)

**Action:**
```ts
// features/<feature>/store/<feature>.actions.ts
export const load<Entities> = createAction(
  '[<Source>] Load <Entities>'
);
export const load<Entities>Success = createAction(
  '[<API_SOURCE>] Load <Entities> Success',
  props<{ <entities>: <Entity>[] }>()
);
export const load<Entities>Failure = createAction(
  '[<API_SOURCE>] Load <Entities> Failure',
  props<{ error: HttpErrorResponse }>()
);
```

**Service:**
```ts
get<Entities>(): Observable<<Entity>[]> {
  return this.http.get<<Entity>[]>(this.baseUrl);
}
```

**Reducer:**
```ts
on(load<Entities>, (state): <Feature>State => ({
  ...state,
  pending: true,
  error: null,
})),
on(load<Entities>Success, (state, { <entities> }): <Feature>State => ({
  ...state,
  <entities>,
  pending: false,
  error: null,
})),
on(load<Entities>Failure, (state, { error }): <Feature>State => ({
  ...state,
  pending: false,
  error,
})),
```

**Effect:**
```ts
load<Entities>$ = createEffect(() =>
  this.actions$.pipe(
    ofType(load<Entities>),
    switchMap(() =>
      this.<feature>Service.get<Entities>().pipe(
        map(<entities> => load<Entities>Success({ <entities> })),
        catchError((error: HttpErrorResponse) =>
          of(load<Entities>Failure({ error })),
        ),
      ),
    ),
  ),
);
```

### 5.3 Mutation: Add (create / post)

**Action:**
```ts
export const add<Entity> = createAction(
  '[<Source>] Add <Entity>',
  props<{ /* payload necesario para crear, ej: */ name: string }>()
);
export const add<Entity>Success = createAction(
  '[<API_SOURCE>] Add <Entity> Success',
  props<{ <entity>: <Entity> }>()
);
export const add<Entity>Failure = createAction(
  '[<API_SOURCE>] Add <Entity> Failure',
  props<{ error: HttpErrorResponse }>()
);
```

**Service:**
```ts
add<Entity>(payload: { /* mismo shape que el body */ }): Observable<<Entity>> {
  return this.http.post<<Entity>>(this.baseUrl, payload);
}
```

**Reducer:**
```ts
on(add<Entity>, (state): <Feature>State => ({
  ...state,
  pending: true,
  error: null,
})),
on(add<Entity>Success, (state, { <entity> }): <Feature>State => ({
  ...state,
  <entities>: [...state.<entities>, <entity>],
  pending: false,
  error: null,
})),
on(add<Entity>Failure, (state, { error }): <Feature>State => ({
  ...state,
  pending: false,
  error,
})),
```

**Effect:**
```ts
add<Entity>$ = createEffect(() =>
  this.actions$.pipe(
    ofType(add<Entity>),
    concatMap(({ /* destructurar payload */ }) =>
      this.<feature>Service.add<Entity>({ /* pasar payload */ }).pipe(
        map(<entity> => add<Entity>Success({ <entity> })),
        catchError((error: HttpErrorResponse) =>
          of(add<Entity>Failure({ error })),
        ),
      ),
    ),
  ),
);
```

### 5.4 Mutation: Update (put / patch)

**Action:**
```ts
export const update<Entity> = createAction(
  '[<Source>] Update <Entity>',
  props<{ <entity>Id: string; changes: Partial<<Entity>> }>()
);
export const update<Entity>Success = createAction(
  '[<API_SOURCE>] Update <Entity> Success',
  props<{ <entity>: <Entity> }>()
);
export const update<Entity>Failure = createAction(
  '[<API_SOURCE>] Update <Entity> Failure',
  props<{ error: HttpErrorResponse }>()
);
```

**Service:**
```ts
update<Entity>(id: string, changes: Partial<<Entity>>): Observable<<Entity>> {
  return this.http.patch<<Entity>>(`${this.baseUrl}/${id}`, changes);
}
```

**Reducer:**
```ts
on(update<Entity>, (state): <Feature>State => ({
  ...state,
  pending: true,
  error: null,
})),
on(update<Entity>Success, (state, { <entity> }): <Feature>State => ({
  ...state,
  <entities>: state.<entities>.map(e => e.id === <entity>.id ? <entity> : e),
  pending: false,
  error: null,
})),
on(update<Entity>Failure, (state, { error }): <Feature>State => ({
  ...state,
  pending: false,
  error,
})),
```

**Effect:**
```ts
update<Entity>$ = createEffect(() =>
  this.actions$.pipe(
    ofType(update<Entity>),
    concatMap(({ <entity>Id, changes }) =>
      this.<feature>Service.update<Entity>(<entity>Id, changes).pipe(
        map(<entity> => update<Entity>Success({ <entity> })),
        catchError((error: HttpErrorResponse) =>
          of(update<Entity>Failure({ error })),
        ),
      ),
    ),
  ),
);
```

### 5.5 Mutation: Remove (delete)

**Action:**
```ts
export const remove<Entity> = createAction(
  '[<Source>] Remove <Entity>',
  props<{ <entity>Id: string }>()
);
export const remove<Entity>Success = createAction(
  '[<API_SOURCE>] Remove <Entity> Success',
  props<{ <entity>Id: string }>()
);
export const remove<Entity>Failure = createAction(
  '[<API_SOURCE>] Remove <Entity> Failure',
  props<{ error: HttpErrorResponse }>()
);
```

**Service:**
```ts
remove<Entity>(id: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${id}`);
}
```

**Reducer:**
```ts
on(remove<Entity>, (state): <Feature>State => ({
  ...state,
  pending: true,
  error: null,
})),
on(remove<Entity>Success, (state, { <entity>Id }): <Feature>State => ({
  ...state,
  <entities>: state.<entities>.filter(e => e.id !== <entity>Id),
  pending: false,
  error: null,
})),
on(remove<Entity>Failure, (state, { error }): <Feature>State => ({
  ...state,
  pending: false,
  error,
})),
```

**Effect:**
```ts
remove<Entity>$ = createEffect(() =>
  this.actions$.pipe(
    ofType(remove<Entity>),
    concatMap(({ <entity>Id }) =>
      this.<feature>Service.remove<Entity>(<entity>Id).pipe(
        map(() => remove<Entity>Success({ <entity>Id })),
        catchError((error: HttpErrorResponse) =>
          of(remove<Entity>Failure({ error })),
        ),
      ),
    ),
  ),
);
```

### 5.6 Submit único (formulario que se manda una sola vez)

Igual que `add`, pero el effect usa `exhaustMap` en lugar de `concatMap`. Eso hace que si el usuario hace doble-clic en el botón de submit, el segundo se ignora mientras el primero está en curso.

```ts
submit<Entity>$ = createEffect(() =>
  this.actions$.pipe(
    ofType(submit<Entity>),
    exhaustMap(({ payload }) =>
      this.<feature>Service.submit<Entity>(payload).pipe(
        map(<entity> => submit<Entity>Success({ <entity> })),
        catchError((error: HttpErrorResponse) =>
          of(submit<Entity>Failure({ error })),
        ),
      ),
    ),
  ),
);
```

### 5.7 Selectors básicos (cuando la feature es nueva)

```ts
// features/<feature>/store/<feature>.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { <Feature>State, <FEATURE_KEY> } from './<feature>.state';

export const select<Feature>State =
  createFeatureSelector<<Feature>State>(<FEATURE_KEY>);

export const selectAll<Entities> = createSelector(
  select<Feature>State,
  state => state.<entities>,
);

export const select<Feature>Pending = createSelector(
  select<Feature>State,
  state => state.pending,
);

export const select<Feature>Error = createSelector(
  select<Feature>State,
  state => state.error,
);
```

Si la UI necesita derivados (count, filtered, etc), agregalos componiendo sobre `selectAll<Entities>`. **No los hagas en el componente.**

### 5.8 Service (cuando la feature es nueva)

```ts
// features/<feature>/services/<feature>.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { <Entity> } from '../store/<feature>.state';

@Injectable({ providedIn: 'root' })
export class <Feature>Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/<entity-path>';

  // Métodos por operación, según se necesiten:
  // get<Entities>, add<Entity>, update<Entity>, remove<Entity>, ...
}
```

### 5.9 Reducer (estructura completa cuando la feature es nueva)

```ts
// features/<feature>/store/<feature>.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { <Feature>State, initial<Feature>State } from './<feature>.state';
import {
  // importar todas las actions usadas, nombradas
} from './<feature>.actions';

export const <feature>Reducer = createReducer(
  initial<Feature>State,

  // Insertar acá los `on(...)` de cada operación, en orden:
  // load, add, update, remove, ...
);
```

### 5.10 Effects (estructura completa cuando la feature es nueva)

```ts
// features/<feature>/store/<feature>.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, exhaustMap, map, of, switchMap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { <Feature>Service } from '../services/<feature>.service';
import {
  // importar todas las actions usadas, nombradas
} from './<feature>.actions';

@Injectable()
export class <Feature>Effects {
  private readonly actions$ = inject(Actions);
  private readonly <feature>Service = inject(<Feature>Service);

  // Insertar acá los `createEffect(...)` por operación
}
```

### 5.11 Componente que consume (ejemplo de uso desde la UI)

```ts
import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  selectAll<Entities>,
  select<Feature>Pending,
  select<Feature>Error,
} from '../../store/<feature>.selectors';
import {
  load<Entities>,
  // ... otras actions necesarias
} from '../../store/<feature>.actions';

@Component({
  selector: 'app-<feature>-page',
  standalone: true,
  templateUrl: './<feature>-page.component.html',
})
export class <Feature>PageComponent implements OnInit {
  private readonly store = inject(Store);

  readonly <entities> = this.store.selectSignal(selectAll<Entities>);
  readonly pending = this.store.selectSignal(select<Feature>Pending);
  readonly error = this.store.selectSignal(select<Feature>Error);

  ngOnInit(): void {
    this.store.dispatch(load<Entities>());
  }
}
```

```html
@if (pending()) {
  <p>Cargando...</p>
}
@if (error(); as err) {
  <p class="error">{{ err.message }}</p>
}
@for (item of <entities>(); track item.id) {
  <!-- render -->
}
```

### 5.12 Registro en app.config.ts (cuando la feature es nueva)

Agregar al array de providers:

```ts
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { <FEATURE_KEY> } from './features/<feature>/store/<feature>.state';
import { <feature>Reducer } from './features/<feature>/store/<feature>.reducer';
import { <Feature>Effects } from './features/<feature>/store/<feature>.effects';

// dentro de providers: [...]
provideState(<FEATURE_KEY>, <feature>Reducer),
provideEffects(<Feature>Effects),
```

Si la feature ya estaba registrada, **no duplicar el registro**.

---

## 6. Orden de generación

Cuando agregás una operación nueva, seguí este orden estricto. Si la feature ya existe, saltá los pasos donde diga "(solo si feature nueva)".

1. **State** (solo si feature nueva): definir interface `<Entity>`, `<Feature>State`, initial, FEATURE_KEY.
2. **Actions**: agregar las 3 actions (intención + Success + Failure) al archivo de actions.
3. **Service**: agregar el método HTTP correspondiente (o crear el service si feature nueva).
4. **Reducer**: agregar los 3 `on(...)` (intent → pending; success → data; failure → error).
5. **Effect**: agregar el `createEffect` con el operador correcto y `catchError` adentro.
6. **Selectors** (solo si feature nueva, o si falta alguno básico): exponer `selectAll<Entities>`, `select<Feature>Pending`, `select<Feature>Error`.
7. **Componente**: si el usuario lo pidió, agregar `selectSignal` para los selectors necesarios y `dispatch` en `ngOnInit`.
8. **Registro** (solo si feature nueva): agregar `provideState` + `provideEffects` en `app.config.ts`.

---

## 7. Self-check antes de entregar

Antes de dar la respuesta final, verificá mentalmente:

- [ ] Todos los `on(...)` del reducer tienen `: <Feature>State` como tipo de retorno explícito.
- [ ] El error está tipado como `HttpErrorResponse` en el `catchError`, no `any`.
- [ ] El `catchError` está **dentro** del `switchMap`/`concatMap`/`exhaustMap`, en el observable interno.
- [ ] Las actions siguen el naming `[Source] Event` con corchetes.
- [ ] El componente usa `selectSignal`, no `select(...) | async`.
- [ ] El componente despacha en `ngOnInit`, no en el constructor.
- [ ] No se está usando `@ngrx/entity`.
- [ ] No se agregó flag `loaded` salvo pedido explícito.
- [ ] No hay mutaciones del state (`push`, `splice`, asignaciones directas).
- [ ] Los imports de actions son nombrados (no `* as`).
- [ ] El reducer tiene los 3 `on(...)` (intent, success, failure) por operación.
- [ ] El service tiene `@Injectable({ providedIn: 'root' })`.
- [ ] El `@Injectable()` del Effects no tiene `providedIn` (los effects se registran con `provideEffects`).
- [ ] Si es feature nueva, está registrada con `provideState` + `provideEffects` en `app.config.ts`.
- [ ] El operador RxJS coincide con el tipo de operación (read=switchMap, mutation=concatMap, submit=exhaustMap).

Si alguno falla, corregilo antes de entregar.

---

## 8. Casos especiales

### 8.1 Patrón `loaded` (solo a pedido explícito)

Si el usuario pide cachear y evitar re-fetch:

1. Agregar `loaded: boolean` al state e inicializarlo en `false`.
2. En `loadXSuccess` del reducer, marcar `loaded: true`.
3. Agregar selector `select<Feature>Loaded`.
4. En el effect, filtrar:
   ```ts
   import { concatLatestFrom } from '@ngrx/operators';
   import { filter } from 'rxjs';

   load<Entities>$ = createEffect(() =>
     this.actions$.pipe(
       ofType(load<Entities>),
       concatLatestFrom(() => this.store.select(select<Feature>Loaded)),
       filter(([_, loaded]) => !loaded),
       switchMap(() => /* ... */),
     ),
   );
   ```
5. Agregar action `invalidate<Entities>` que vuelve `loaded: false` para forzar refetch tras mutaciones que cambien la lista.

**Recordatorio: por default no se aplica.**

### 8.2 Mutación que invalida cache de otra feature

Si una mutación en feature A invalida datos de feature B (ej: borrar un usuario invalida la lista de comentarios), el reducer de feature B puede escuchar la action `Success` de feature A:

```ts
// en el reducer de feature B
on(removeUserFromAFeatureSuccess, (state): BFeatureState => ({
  ...state,
  loaded: false,  // si usa patrón loaded
  // o limpiar la data: items: []
})),
```

No despachar otra action desde el effect: dejá que el reducer de B reaccione directo.

### 8.3 Operación con paginación / filtros

El payload de la action de intención lleva los parámetros de paginación/filtro:
```ts
export const load<Entities> = createAction(
  '[<Source>] Load <Entities>',
  props<{ page: number; pageSize: number; filter?: string }>()
);
```

El service los pasa como query params. El state debería incluir los parámetros actuales para poder volver a fetchear con la misma config:
```ts
interface <Feature>State {
  <entities>: <Entity>[];
  page: number;
  pageSize: number;
  total: number;
  pending: boolean;
  error: HttpErrorResponse | null;
}
```

### 8.4 Múltiples operaciones encadenadas

Si tras un `Success` de A hay que disparar B automáticamente, **no hacerlo desde el componente**. El effect orquesta:

```ts
afterAddTriggerLoad$ = createEffect(() =>
  this.actions$.pipe(
    ofType(add<Entity>Success),
    map(() => load<Entities>()),
  ),
);
```

Eso emite la action `load<Entities>` que dispara su propio effect.

### 8.5 Carga de datos disparada por navegación (router-store)

El proyecto usa `@ngrx/router-store`, que despacha actions automáticamente en cada navegación (`@ngrx/router-store/request`, `/navigation`, `/navigated`, etc.).

Si la carga de una lista o detalle se justifica únicamente cuando el usuario entra a cierta ruta, considerá disparar la action de intención **desde un effect que escuche `routerNavigatedAction`** en lugar de hacerlo desde `ngOnInit` del componente:

```ts
import { routerNavigatedAction } from '@ngrx/router-store';
import { filter } from 'rxjs';

load<Entities>OnNavigate$ = createEffect(() =>
  this.actions$.pipe(
    ofType(routerNavigatedAction),
    filter(({ payload }) =>
      payload.routerState.url.startsWith('/<route>'),
    ),
    map(() => load<Entities>()),
  ),
);
```

Ventaja: la lógica "cuando entrás a esta ruta se cargan estos datos" queda en un único lugar y el componente no necesita despachar nada.

**Cuándo aplicarlo:** solo si tiene sentido obvio (página de listado o detalle típica). Si el usuario no lo pidió y la situación no lo justifica claramente, **seguí con `ngOnInit`** que es lo más directo. No imponer este patrón por iniciativa propia.

**Cuándo NO aplicarlo:**
- La carga depende de un `@Input` del componente, no de la URL.
- El componente se monta varias veces en distintas ubicaciones.
- Es un componente compartido reutilizable.

---

## 9. Cuando preguntar y cuando no

**No preguntes** lo que está en el contexto:
- Si el usuario ya dijo "agregá un endpoint para listar X de la feature Y", la operación es `load`, la feature es Y, la entidad es X.
- Si en el codebase ya existe `features/foo/store/`, la feature foo ya existe.
- Si el usuario pegó la URL del endpoint, no la pidas de nuevo.

**Preguntá** solo lo crítico que falte:
- URL del endpoint (si no se mencionó).
- Shape del request body / response (si no es obvio).
- Si la feature es nueva o existe (cuando es ambiguo).
- Si quiere aplicar el patrón `loaded` (solo si tenés sospecha de que el caso lo requiere — si no, simplemente no lo apliques).

---

## 10. Estilo de respuesta

Cuando entregues el código generado:

1. Mostrá en qué archivo va cada bloque (con el path completo desde `features/`).
2. Si modificás un archivo existente, mostrá qué se agrega y dónde (no repitas el archivo entero).
3. Si la feature es nueva, mostrá los 5 archivos del store + service + el snippet de `app.config.ts`.
4. Después del código, listá las verificaciones del self-check (sección 7) que aplicaste.
5. Si encontraste alguna ambigüedad o tomaste una decisión por default (ej: campos de un modelo que el usuario no definió), declaralo explícitamente al final: "Asumí que `<Entity>` tiene los campos X, Y, Z. Si son distintos, ajustá el state."

No expliques NgRx en cada respuesta. La skill ya está cargada; el usuario sabe el patrón. Tu trabajo es generar código consistente, no enseñar el modelo cada vez.
