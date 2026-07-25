# Tab Derivados en Procesamiento — Plan FRONT

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

> **Jira:** [KAN-193](https://exequielsantoro.atlassian.net/browse/KAN-193)
> **Spec:** `laboratorio/docs/superpowers/specs/2026-07-06-worklist-derivados-sucursal-design.md` (en el repo back)
> **Rama:** `feat/procesamiento-filtro-derivados` (desde `origin/development`, sobre la PR de pdf-firmas ya mergeada).
> **Depende de:** el back de KAN-193 (que el endpoint sirva `status=DERIVED` con el filtro por sucursal-que-derivó). Ya implementado en `laboratorio` rama `feat/worklist-derivados-sucursal`.

**Goal:** Agregar en la pantalla de Procesamiento dos botones (Todos / Derivados) al lado del input del escáner (achicándolo), replicando el patrón de filtros de Validación. "Todos" = PROCESSING (como hoy). "Derivados" = DERIVED. Vistas exclusivas, recarga server-side por status.

**Architecture:** El filtro es server-side (no client-side como Validación): PROCESSING y DERIVED son dos queries distintas al back. La action `loadProcesamiento` se parametriza con el status; el effect deja de hardcodear `'PROCESSING'`; el polling pollea el status del tab activo.

**Tech Stack:** Angular standalone, NgRx clásico (createAction/createReducer), signals, PrimeNG. Tests con Vitest.

**Build discipline:** `npm start` para serve, `npm run build` (`ng build`) para verificar compilación. No hay `ng test` script configurado por default en package.json — los `.spec.ts` corren con el runner del repo (verificar con `npx vitest run <archivo>` si aplica). El build (`ng build`) es la red de seguridad principal de tipos/templates.

---

## File Structure

- `store/muestras.actions.ts` — MODIFY: `loadProcesamiento` pasa a llevar `{ status }`.
- `store/muestras.effects.ts` — MODIFY: el effect usa el status del payload en vez de `'PROCESSING'` hardcodeado.
- `pages/procesamiento/procesamiento.page.ts` — MODIFY: signal `filtro` + `setFiltro()`, dispatch con status, polling del status activo.
- `pages/procesamiento/procesamiento.page.html` — MODIFY: achicar `.scan-input` (clase) + grupo `.seg` de 2 botones.
- `pages/procesamiento/procesamiento.page.scss` — MODIFY: `.scan-input` flex + copiar `.seg`/`.seg-btn` de Validación.

---

## Task 1: Parametrizar la action loadProcesamiento con el status

**Files:**
- Modify: `src/app/features/analitica/muestras/store/muestras.actions.ts`
- Modify: `src/app/features/analitica/muestras/store/muestras.effects.ts`

- [ ] **Step 1: Cambiar la action para que lleve el status**

En `muestras.actions.ts`, la action actual (línea ~83):
```ts
export const loadProcesamiento = createAction('[Muestras Page] Load Procesamiento');
```
Reemplazar por (con payload de status, tipado a los 2 valores válidos):
```ts
export const loadProcesamiento = createAction(
  '[Muestras Page] Load Procesamiento',
  props<{ status: 'PROCESSING' | 'DERIVED' }>(),
);
```
Verificá que `props` esté importado de `@ngrx/store` en el archivo (otras actions con payload ya lo usan; si no, agregalo al import existente).

- [ ] **Step 2: Usar el status en el effect**

En `muestras.effects.ts`, el effect actual:
```ts
  loadProcesamiento$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProcesamiento),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist('PROCESSING', branchId).pipe(
          map(res => isNotModified(res) ? loadProcesamientoNotModified() : loadProcesamientoSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadProcesamientoFailure({ error }))),
        );
```
Cambiar la desestructuración para capturar la action (el status) y pasarlo a `getWorklist`:
```ts
  loadProcesamiento$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProcesamiento),
      withLatestFrom(this.store.select(selectMuestrasBranchId)),
      switchMap(([{ status }, branchId]) => {
        if (branchId == null) return EMPTY;
        return this.api.getWorklist(status, branchId).pipe(
          map(res => isNotModified(res) ? loadProcesamientoNotModified() : loadProcesamientoSuccess({ items: res })),
          catchError((error: HttpErrorResponse) => of(loadProcesamientoFailure({ error }))),
        );
```
(Solo cambian 2 líneas: `[{ status }, branchId]` y `getWorklist(status, branchId)`.)

- [ ] **Step 3: Buscar TODOS los dispatch de loadProcesamiento y actualizarlos**

`loadProcesamiento` ahora exige `{ status }`. Buscá todos los llamadores:
Run: `grep -rn "loadProcesamiento(" src/app/features/analitica/muestras/`
Cada `dispatch(loadProcesamiento())` sin argumento ahora rompe la compilación. Los que estén FUERA de `procesamiento.page.ts` (ej. algún otro componente o el reducer/otro effect que lo re-dispatche) deben pasar `{ status: 'PROCESSING' }` (comportamiento default = lo de hoy). Los de `procesamiento.page.ts` se manejan en la Task 3. Actualizá acá solo los llamadores ajenos a la page (si los hay); si el único llamador es la page, no hay nada más que tocar en este paso.

- [ ] **Step 4: Compilar**

Run: `npm run build`
Expected: puede fallar SOLO en `procesamiento.page.ts` (dispatch sin status) — eso se arregla en Task 3. Si falla en OTRO archivo, volvé al Step 3 y actualizá ese dispatch. Anotá cuáles llamadores había.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/store/muestras.actions.ts \
        src/app/features/analitica/muestras/store/muestras.effects.ts
git commit -m "feat(procesamiento): loadProcesamiento parametrizado con status (KAN-193)"
```
(Si otros llamadores ajenos se tocaron, incluilos en el add.)

---

## Task 2: SCSS — achicar el input + estilos del grupo de filtros

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.scss`

- [ ] **Step 1: Achicar el `.scan-input`**

En `procesamiento.page.scss`, la regla actual empieza con `.scan-input {` y tiene `flex: 1; min-width: 260px;`. Cambiar SOLO el `flex`:
```scss
.scan-input {
  flex: 1 1 320px; min-width: 260px; display: flex; align-items: center; gap: 10px; background: var(--bg);
```
(De `flex: 1` a `flex: 1 1 320px` — mismo valor que Validación; deja espacio para los botones. El resto de la regla queda igual.)

- [ ] **Step 2: Agregar los estilos `.seg` / `.seg-btn` (copiados de Validación)**

Agregar al final del SCSS (o cerca de `.scanbar`), idénticos a los de `validacion-protocolos.page.scss`:
```scss
.seg {
  display: flex; gap: 4px; background: var(--bg); border: 1px solid var(--line);
  border-radius: 11px; padding: 4px; height: 46px; align-items: center;
}
.seg-btn {
  height: 38px; padding: 0 15px; border-radius: 8px; border: none; background: transparent;
  color: var(--ink-2); font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;

  &:hover { color: var(--ink); }
  &.is-on { background: #fff; color: var(--accent); box-shadow: 0 1px 3px #0b132a14; }
}
```
Verificá que las variables CSS (`--bg`, `--line`, `--ink-2`, `--ink`, `--accent`) estén disponibles en este SCSS (Validación las usa en el mismo módulo, así que deberían estar; si el SCSS de procesamiento ya usa `var(--bg)` etc. en `.scan-input`, están).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.scss
git commit -m "style(procesamiento): achicar input + estilos .seg para el filtro de tabs (KAN-193)"
```

---

## Task 3: La page — signal filtro, botones, polling por status

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.ts`
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.html`

- [ ] **Step 1: Agregar la const FILTROS + signal + setter en la clase**

En `procesamiento.page.ts`, agregar la const arriba de la clase (después de los imports), al estilo Validación:
```ts
const FILTROS: ReadonlyArray<{ id: 'todos' | 'derivados'; label: string; status: 'PROCESSING' | 'DERIVED' }> = [
  { id: 'todos', label: 'Todos', status: 'PROCESSING' },
  { id: 'derivados', label: 'Derivados', status: 'DERIVED' },
];
```
Dentro de la clase, junto a los otros signals (cerca de `readonly query = signal('')`, línea ~55):
```ts
  readonly FILTROS = FILTROS;
  readonly filtro = signal<'todos' | 'derivados'>('todos');
```
Y un método setter (cerca de `setQuery`, línea ~126). Al cambiar de tab, dispatchea la recarga con el status del nuevo filtro:
```ts
  setFiltro(id: 'todos' | 'derivados'): void {
    if (this.filtro() === id) return;
    this.filtro.set(id);
    this.store.dispatch(loadProcesamiento({ status: this.currentStatus() }));
  }

  private currentStatus(): 'PROCESSING' | 'DERIVED' {
    return this.filtro() === 'derivados' ? 'DERIVED' : 'PROCESSING';
  }
```

- [ ] **Step 2: Actualizar el ngOnInit + polling para usar el status activo**

En `procesamiento.page.ts`, el `ngOnInit` actual dispatchea `loadProcesamiento()` sin status (rompe tras Task 1). Cambiar el poll y el dispatch inicial para usar el status del tab activo:
```ts
  ngOnInit(): void {
    this.store.dispatch(initMuestras());
    const handle = this.polling.startPolling({
      key: 'procesamiento-page',
      intervalMs: 5000,
      poll: () => { this.store.dispatch(loadProcesamiento({ status: this.currentStatus() })); return of(null); },
    });
    this.destroyRef.onDestroy(() => handle.stop());
  }
```
(El poll ahora lee `this.currentStatus()` en cada tick → cuando el usuario cambia de tab, el siguiente poll ya trae el status correcto, y el `setFiltro` dispara una recarga inmediata sin esperar el tick.)

- [ ] **Step 3: Agregar el grupo `.seg` en el template**

En `procesamiento.page.html`, dentro del `<div class="scanbar">`, INMEDIATAMENTE después del `</div>` que cierra el `.scan-input` (línea ~18, antes del botón "Limpiar"), insertar:
```html
    <div class="seg">
      @for (f of FILTROS; track f.id) {
        <button type="button" class="seg-btn" [class.is-on]="filtro() === f.id" (click)="setFiltro(f.id)">
          {{ f.label }}
        </button>
      }
    </div>
```

- [ ] **Step 4: Compilar**

Run: `npm run build`
Expected: BUILD SUCCESS. Ya no hay dispatch sin status (Task 1 pedía status, acá se pasa). Si falla por tipos, revisar que `setFiltro`/`currentStatus` estén bien tipados a los literales.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.ts \
        src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.html
git commit -m "feat(procesamiento): tab Todos/Derivados con recarga por status (KAN-193)"
```

---

## Task 4: Verificación de tests existentes + build final

**Files:** ninguno nuevo.

- [ ] **Step 1: Correr los tests del store/effects que puedan haberse afectado**

La action `loadProcesamiento` cambió de firma → el test del effect puede necesitar el `{ status }`. Buscar y correr:
Run: `grep -rln "loadProcesamiento" src/app/features/analitica/muestras/**/*.spec.ts`
Para cada spec que aparezca, correrlo (el runner del repo; probá `npx vitest run <ruta>`). Si un test dispatchea `loadProcesamiento()` sin status o mockea `getWorklist('PROCESSING', ...)` esperando el hardcode, **ajustarlo** a la nueva firma (`loadProcesamiento({ status: 'PROCESSING' })`) preservando la intención del test. Si el test verificaba que el effect llama `getWorklist('PROCESSING', ...)`, ahora debe verificar que llama con el status del payload.

- [ ] **Step 2: Build final**

Run: `npm run build`
Expected: BUILD SUCCESS, sin errores de tipos/templates.

- [ ] **Step 3: Commit (si hubo ajuste de tests)**

```bash
git add src/app/features/analitica/muestras/**/*.spec.ts
git commit -m "test(procesamiento): ajustar specs a la nueva firma de loadProcesamiento (KAN-193)"
```

---

## Self-Review (checklist del autor)

**Spec coverage:**
- Achicar input (spec front #1): Task 2 Step 1. ✓
- Grupo 2 botones .seg (spec #2): Task 2 Step 2 (CSS) + Task 3 Step 3 (markup). ✓
- Signal filtro + setFiltro (spec #3): Task 3 Step 1. ✓
- Recarga server-side por status, parametrizar action (spec #4 + store): Task 1 + Task 3 Step 2 (polling). ✓
- Todos=PROCESSING, Derivados=DERIVED, exclusivas: FILTROS map (Task 3 Step 1). ✓

**Placeholder scan:** el único punto de investigación es Task 1 Step 3 y Task 4 Step 1 ("buscá los llamadores/specs y ajustalos") — necesario porque no puedo enumerar a ciegas todos los dispatch/specs sin ver el estado actual; tienen comando `grep` concreto y criterio de ajuste. El resto es código exacto.

**Type consistency:** `loadProcesamiento({ status })` con `status: 'PROCESSING' | 'DERIVED'` — consistente entre action (Task 1), effect (Task 1), setFiltro/currentStatus/ngOnInit (Task 3). `FILTROS` usa `id: 'todos'|'derivados'` + `status: 'PROCESSING'|'DERIVED'`. El `filtro` signal es `'todos'|'derivados'`, y `currentStatus()` mapea a `'PROCESSING'|'DERIVED'`.

**Riesgo residual:** el polling lee `currentStatus()` en cada tick — al cambiar de tab, `setFiltro` dispara una recarga inmediata Y el próximo tick ya usa el status nuevo. Correcto, sin doble-fetch problemático (a lo sumo un fetch extra al cambiar, aceptable). El estado del store (`procesamiento`) se sobreescribe con el nuevo set (PROCESSING o DERIVED) — no se mezclan; al volver a "Todos" se recarga PROCESSING. Correcto para vistas exclusivas.
