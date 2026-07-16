# Procesamiento — Arco 1: Lista real de muestras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-98](https://exequielsantoro.atlassian.net/browse/KAN-98)
> **Spec:** `docs/superpowers/specs/2026-06-13-procesamiento-lista-design.md`
> **Rama:** `feat/procesamiento-lista` (worktree `FRONTEND-LABORATORIO-procesamiento`, base `development`)

**Goal:** Conectar `/analitica/procesamiento` al worklist real (labels en estado `PROCESSING`), reusando la lista unificada `sample-table`/`Tube` + polling ETag, read-only, con botones Planillas/Marcar completadas deshabilitados.

**Architecture:** Se agrega un slice `procesamiento` al store NgRx del feature `muestras`, replicando 1:1 el patrón ya existente de `descarte` (worklist polleada read-only). `WorklistPage` se extiende para tratar `procesamiento` como pantalla backend. La toolbar muestra dos botones deshabilitados (sólo en esta pantalla) anticipando arcos futuros. Cero cambios de backend: el endpoint `GET /labels/worklist?status=PROCESSING` ya existe.

**Tech Stack:** Angular 21 (standalone, signals), NgRx clásico, Vitest, `PollingService` + `etagInterceptor` (estándar de refresco del repo).

---

## File Structure

- `src/app/features/analitica/muestras/store/muestras.actions.ts` — +4 actions del slice `procesamiento`.
- `src/app/features/analitica/muestras/store/muestras.state.ts` — +1 campo `procesamiento`.
- `src/app/features/analitica/muestras/store/muestras.reducer.ts` — +3 `on(...)`.
- `src/app/features/analitica/muestras/store/muestras.selectors.ts` — +1 selector.
- `src/app/features/analitica/muestras/store/muestras.effects.ts` — +1 effect `loadProcesamiento$`.
- `src/app/features/analitica/muestras/pages/worklist/worklist.page.ts` — wiring de pantalla backend + `showWorksheetActions`.
- `src/app/features/analitica/muestras/pages/worklist/worklist.page.html` — botones deshabilitados.
- `src/app/features/analitica/muestras/pages/worklist/worklist.page.scss` — estilo mínimo de los botones.
- Specs: `muestras.reducer.spec.ts`, `muestras.selectors.spec.ts` (si existe; si no, dentro del reducer spec), `muestras.effects.spec.ts`, `worklist.page.spec.ts`.

**Comandos de test:** `npm test` corre la suite Vitest completa (vía `ng test`). Por la nota de `reference_lab_frontend_test_runner`, NO usar `npx vitest run` (rompe con componentes `templateUrl`). Para iterar más rápido se puede acotar con `npm test -- --include='**/<archivo>.spec.ts'`.

---

### Task 1: Slice `procesamiento` en el store (state + actions + reducer + selector)

**Files:**
- Modify: `src/app/features/analitica/muestras/store/muestras.actions.ts` (después del bloque Descarte, ~línea 68)
- Modify: `src/app/features/analitica/muestras/store/muestras.state.ts:19` y `:34`
- Modify: `src/app/features/analitica/muestras/store/muestras.reducer.ts` (imports + después del bloque descarte ~línea 40)
- Modify: `src/app/features/analitica/muestras/store/muestras.selectors.ts:18`
- Test: `src/app/features/analitica/muestras/store/muestras.reducer.spec.ts`

- [ ] **Step 1: Escribir los tests de reducer que fallan**

En `muestras.reducer.spec.ts`, agregar al bloque de imports de actions:

```typescript
  loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
```

Y agregar este bloque de tests dentro del `describe('muestrasReducer', ...)` (después del bloque Descarte):

```typescript
  // ── Procesamiento ───────────────────────────────────────────────────────────
  const procItem: LabelWorklistItem = {
    labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 50005, analysisName: 'Hemograma',
    patientName: 'Marta Gómez', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
  };

  it('loadProcesamientoSuccess reemplaza procesamiento items', () => {
    const s = muestrasReducer(initialMuestrasState, loadProcesamientoSuccess({ items: [procItem] }));
    expect(s.procesamiento).toEqual([procItem]);
    expect(s.error).toBeNull();
  });

  it('loadProcesamientoNotModified no muta procesamiento items', () => {
    const before = { ...initialMuestrasState, procesamiento: [procItem] };
    const s = muestrasReducer(before, loadProcesamientoNotModified());
    expect(s.procesamiento).toBe(before.procesamiento);
  });

  it('loadProcesamientoFailure setea error', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const s = muestrasReducer(initialMuestrasState, loadProcesamientoFailure({ error }));
    expect(s.error).toBe(error);
  });

  it('selectProcesamientoItems proyecta el slice procesamiento', () => {
    const state = { ...initialMuestrasState, procesamiento: [procItem] };
    expect(selectProcesamientoItems.projector(state)).toEqual([procItem]);
  });
```

> Para el test del selector, agregar también el import al inicio del spec:
> ```typescript
> import { selectProcesamientoItems } from './muestras.selectors';
> ```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- --include='**/muestras.reducer.spec.ts'`
Expected: FAIL — `loadProcesamientoSuccess` no existe (error de import/compilación).

- [ ] **Step 3: Implementar actions, state, reducer y selector**

En `muestras.actions.ts`, después del bloque Descarte (línea ~68):

```typescript
// Worklist Procesamiento (PROCESSING) — polleada, solo lectura (Arco 1)
export const loadProcesamiento = createAction('[Muestras Page] Load Procesamiento');
export const loadProcesamientoSuccess = createAction(
  '[Muestras API] Load Procesamiento Success',
  props<{ items: LabelWorklistItem[] }>()
);
export const loadProcesamientoNotModified = createAction('[Muestras API] Load Procesamiento Not Modified');
export const loadProcesamientoFailure = createAction(
  '[Muestras API] Load Procesamiento Failure',
  props<{ error: HttpErrorResponse }>()
);
```

En `muestras.state.ts`: agregar el campo a la interface (después de `descarte: LabelWorklistItem[];`):

```typescript
  procesamiento: LabelWorklistItem[];
```

y al estado inicial (después de `descarte: [],`):

```typescript
  procesamiento: [],
```

En `muestras.reducer.ts`: agregar al import de actions:

```typescript
  loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
```

y los `on(...)` después del bloque descarte (línea ~40):

```typescript
  on(loadProcesamientoSuccess, (state, { items }): MuestrasState => ({ ...state, procesamiento: items, error: null })),
  on(loadProcesamientoNotModified, (state): MuestrasState => ({ ...state })),
  on(loadProcesamientoFailure, (state, { error }): MuestrasState => ({ ...state, error })),
```

En `muestras.selectors.ts`, después de `selectDescarteItems` (línea 18):

```typescript
export const selectProcesamientoItems = createSelector(selectMuestrasState, s => s.procesamiento);
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- --include='**/muestras.reducer.spec.ts'`
Expected: PASS (los 3 tests nuevos verdes, sin romper los existentes).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/store/muestras.actions.ts \
        src/app/features/analitica/muestras/store/muestras.state.ts \
        src/app/features/analitica/muestras/store/muestras.reducer.ts \
        src/app/features/analitica/muestras/store/muestras.selectors.ts \
        src/app/features/analitica/muestras/store/muestras.reducer.spec.ts
git commit -m "feat(procesamiento): slice procesamiento en el store de muestras"
```

---

### Task 2: Effect `loadProcesamiento$`

**Files:**
- Modify: `src/app/features/analitica/muestras/store/muestras.effects.ts` (imports + nuevo effect después de `loadDescarte$` ~línea 119)
- Test: `src/app/features/analitica/muestras/store/muestras.effects.spec.ts`

- [ ] **Step 1: Escribir los tests de effect que fallan**

En `muestras.effects.spec.ts`, agregar al import de actions:

```typescript
  loadProcesamiento, loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
```

y agregar este bloque al final del `describe(...)` (antes del cierre):

```typescript
  // ── loadProcesamiento ───────────────────────────────────────────────────────
  const procItem: LabelWorklistItem = {
    labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 50005, analysisName: 'Hemograma',
    patientName: 'Marta Gómez', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
  };

  it('loadProcesamiento pide PROCESSING de la sucursal y mapea success', async () => {
    api.getWorklist.mockReturnValue(of([procItem]));
    actions$ = of(loadProcesamiento());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadProcesamiento$);
    expect(api.getWorklist).toHaveBeenCalledWith('PROCESSING', 1001);
    expect(action).toEqual(loadProcesamientoSuccess({ items: [procItem] }));
  });

  it('loadProcesamiento 304 mapea a notModified', async () => {
    api.getWorklist.mockReturnValue(of(NOT_MODIFIED));
    actions$ = of(loadProcesamiento());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadProcesamiento$);
    expect(action).toEqual(loadProcesamientoNotModified());
  });

  it('loadProcesamiento failure mapea error', async () => {
    const error = new HttpErrorResponse({ status: 500 });
    api.getWorklist.mockReturnValue(throwError(() => error));
    actions$ = of(loadProcesamiento());
    const effects = TestBed.inject(MuestrasEffects);
    const action = await firstValueFrom(effects.loadProcesamiento$);
    expect(action).toEqual(loadProcesamientoFailure({ error }));
  });
```

> Nota: `NOT_MODIFIED`, `api`, `actions$`, `firstValueFrom`, `of`, `throwError` ya están definidos/importados en el spec (se usan en el bloque descarte). Reusar los mismos; no redefinirlos. El `branchId` mockeado del spec es `1001` (mismo valor que usa el bloque descarte con `selectMuestrasBranchId`).

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- --include='**/muestras.effects.spec.ts'`
Expected: FAIL — `effects.loadProcesamiento$` no existe.

- [ ] **Step 3: Implementar el effect**

En `muestras.effects.ts`, agregar al import de actions:

```typescript
  loadProcesamiento, loadProcesamientoSuccess, loadProcesamientoNotModified, loadProcesamientoFailure,
```

y agregar el effect después de `loadDescarte$` (línea ~119):

```typescript
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
      }),
    ),
  );
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- --include='**/muestras.effects.spec.ts'`
Expected: PASS (3 tests nuevos verdes).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/store/muestras.effects.ts \
        src/app/features/analitica/muestras/store/muestras.effects.spec.ts
git commit -m "feat(procesamiento): effect loadProcesamiento\$ (worklist PROCESSING polleada)"
```

---

### Task 3: WorklistPage — tratar `procesamiento` como pantalla backend + flag de acciones

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.ts`
- Test: `src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts`

Contexto: hoy `procesamiento` corre mock (`MockSamplesService.byState('processing')`), por eso los tests existentes esperan `total()===9` y usan `rows()[0]` sobre datos mock. Al pasar a backend, sin items seedeados `total()===0`. Hay que **actualizar** el helper `setup()` y esos tests.

- [ ] **Step 1: Actualizar el spec — helper + tests existentes + nuevos (fallan)**

En `worklist.page.spec.ts`:

(a) Importar el selector nuevo:

```typescript
import { selectRecoleccionItems, selectDescarteItems, selectProcesamientoItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
```

(b) Extender la firma de `setup()` con un cuarto parámetro y registrar el selector en el mock store:

```typescript
function setup(
  screenKey: 'recoleccion' | 'traslado' | 'procesamiento' | 'descarte',
  recoleccionItems: LabelWorklistItem[] = [],
  descarteItems: LabelWorklistItem[] = [],
  procesamientoItems: LabelWorklistItem[] = [],
): ComponentFixture<WorklistPage> {
```

y dentro de `selectors: [...]` agregar:

```typescript
          { selector: selectProcesamientoItems, value: procesamientoItems },
```

(c) Reemplazar el test existente `renderiza Procesamiento con título correcto` (esperaba `total()===9` mock) por:

```typescript
  it('renderiza Procesamiento con título correcto (backend, vacío)', () => {
    const fx = setup('procesamiento');
    const el = fx.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Procesamiento');
    expect(fx.componentInstance.total()).toBe(0);
  });

  it('Procesamiento mapea items PROCESSING del store al view-model agrupado', () => {
    const item: LabelWorklistItem = {
      labelId: 70001, sampleId: 50050, barcode: '70001', protocolId: 50005, analysisName: 'Hemograma',
      patientName: 'Marta Gómez', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:00:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    expect(cmp.total()).toBe(1);
    expect(cmp.rows()[0].study).toBe('Hemograma');
  });

  it('Procesamiento es read-only: canTransition = false', () => {
    const fx = setup('procesamiento');
    expect(fx.componentInstance.canTransition()).toBe(false);
  });

  it('Procesamiento muestra acciones de planilla (showWorksheetActions = true)', () => {
    const fx = setup('procesamiento');
    expect(fx.componentInstance.showWorksheetActions()).toBe(true);
  });

  it('Recolección NO muestra acciones de planilla', () => {
    const fx = setup('recoleccion');
    expect(fx.componentInstance.showWorksheetActions()).toBe(false);
  });
```

(d) Reemplazar los dos tests existentes que usan `setup('procesamiento')` con datos mock (`toggleRow selecciona y deselecciona` y `query filtra rows en vivo`) para que seedeen items vía el cuarto parámetro:

```typescript
  it('toggleRow selecciona y deselecciona', () => {
    const item: LabelWorklistItem = {
      labelId: 70010, sampleId: 50060, barcode: '70010', protocolId: 50005, analysisName: 'Glucosa',
      patientName: 'Luis Soto', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:05:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    const firstId = cmp.rows()[0].id;
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(1);
    cmp.toggleRow(firstId);
    expect(cmp.selectedCount()).toBe(0);
  });

  it('query filtra rows en vivo', () => {
    const item: LabelWorklistItem = {
      labelId: 70011, sampleId: 50061, barcode: '70011', protocolId: 50005, analysisName: 'Urea',
      patientName: 'Rosa Vera', urgent: false, status: 'PROCESSING', updatedAt: '2026-06-13T08:06:00Z',
    };
    const fx = setup('procesamiento', [], [], [item]);
    const cmp = fx.componentInstance;
    cmp.setQuery('70011');
    expect(cmp.rows().length).toBe(1);
    expect(cmp.rows()[0].barcode).toBe('70011');
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: FAIL — `showWorksheetActions` no existe en el componente, y `total()` de procesamiento aún devuelve 9 (mock) en vez de 0/seeded.

- [ ] **Step 3: Implementar el wiring en `worklist.page.ts`**

(a) Importar selector y action nueva (en los bloques de import existentes):

```typescript
import { initMuestras, loadRecoleccion, loadDescarte, loadProcesamiento, transitionLabels, transitionLabelsSuccess } from '../../store/muestras.actions';
import { selectRecoleccionItems, selectDescarteItems, selectProcesamientoItems, selectMuestrasBranchName, selectMuestrasError } from '../../store/muestras.selectors';
```

(b) Incluir `procesamiento` en `isBackendScreen` (línea ~53):

```typescript
  readonly isBackendScreen = computed(() =>
    this.config().key === 'recoleccion'
    || this.config().key === 'descarte'
    || this.config().key === 'procesamiento',
  );
```

(c) Agregar el signal del selector (junto a `descarteItems`, línea ~63):

```typescript
  private readonly procesamientoItems = this.store.selectSignal(selectProcesamientoItems);
```

(d) Agregar la rama en `sourceRows` (dentro del `computed`, línea ~67):

```typescript
    if (key === 'procesamiento') return groupTubes(this.procesamientoItems(), this.branchName());
```

(e) Agregar el computed `showWorksheetActions` (junto a los otros computed, p.ej. después de `canTransition`):

```typescript
  /** Botones Planillas/Marcar completadas (deshabilitados en Arco 1, solo en procesamiento). */
  readonly showWorksheetActions = computed(() => this.config().key === 'procesamiento');
```

(f) En el constructor, agregar el bloque de procesamiento (después del bloque `if (screenKey === 'descarte')`), replicando el patrón de descarte:

```typescript
    if (screenKey === 'procesamiento') {
      this.store.dispatch(initMuestras());
      const handle = this.polling.startPolling({
        key: 'muestras-procesamiento',
        intervalMs: 5000,
        poll: () => {
          this.store.dispatch(loadProcesamiento());
          return of(null);
        },
      });
      this.destroyRef.onDestroy(() => handle.stop());

      let lastSig: string | null = null;
      effect(() => {
        const err = this.backendError();
        const sig = err ? `${(err as { status?: unknown }).status}:${(err as { message?: unknown }).message}` : null;
        if (sig && sig !== lastSig) {
          lastSig = sig;
          this.messages.add({
            severity: 'error',
            summary: 'Error',
            detail: humanizeBackendError(err, {
              fallback: 'No pudimos completar la operación. Probá de nuevo.',
            }),
            life: 5000,
          });
        }
      });
    }
```

> `canTransition` no requiere cambios: con `procesamiento` ahora dentro de `isBackendScreen` y siendo `key !== 'recoleccion'`, ya devuelve `false` (read-only). El `loadAfterInit$` del effect dispara `loadRecoleccion()` tras el init; en procesamiento el polling dispara `loadProcesamiento()` cada 5s y la carga inicial llega por el primer tick inmediato del `PollingService` (pokeNow al arrancar). No hace falta encadenar `loadProcesamiento` al `initMuestrasSuccess`.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: PASS (tests de procesamiento actualizados + nuevos verdes; recolección/tránsito/descarte intactos).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.ts \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.spec.ts
git commit -m "feat(procesamiento): WorklistPage conecta procesamiento al backend (read-only)"
```

---

### Task 4: Toolbar — botones Planillas / Marcar completadas deshabilitados

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.html` (dentro de `.toolbar-wrap`)
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.scss`

> No hay test unitario para este paso: el smoke spec usa `TestBed.overrideTemplate` con un template mínimo (solo header), así que el DOM real de la toolbar no se renderiza en Vitest. La lógica (`showWorksheetActions`) ya quedó cubierta en Task 3; el render visual se valida en el smoke manual (Task 5).

- [ ] **Step 1: Agregar los botones deshabilitados al template**

En `worklist.page.html`, dentro de `<div class="toolbar-wrap">`, después del bloque `@if (canTransition()) { <app-muestras-batch-menu ... /> }` (línea ~34), agregar:

```html
    @if (showWorksheetActions()) {
      <div class="worksheet-actions">
        <button type="button" class="ws-btn ws-btn--ghost" disabled title="Próximamente">
          <i class="pi pi-table"></i> Planillas
        </button>
        <button type="button" class="ws-btn ws-btn--primary" disabled title="Próximamente">
          <i class="pi pi-check"></i> Marcar completadas
        </button>
      </div>
    }
```

- [ ] **Step 2: Agregar estilos mínimos**

En `worklist.page.scss`, agregar al final:

```scss
.worksheet-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;

  .ws-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: 1px solid var(--surface-border, #d1d5db);
    background: var(--surface-card, #fff);
    color: var(--text-color, #374151);
    cursor: not-allowed;
    opacity: 0.55;

    &--primary {
      background: var(--primary-color, #2563eb);
      border-color: var(--primary-color, #2563eb);
      color: var(--primary-color-text, #fff);
    }
  }
}
```

- [ ] **Step 3: Verificar que compila y la suite sigue verde**

Run: `npm test -- --include='**/worklist.page.spec.ts'`
Expected: PASS (sin cambios respecto a Task 3 — el template override ignora la toolbar).

Run: `npm run build`
Expected: build dev limpio (sin errores de template ni TS).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/muestras/pages/worklist/worklist.page.html \
        src/app/features/analitica/muestras/pages/worklist/worklist.page.scss
git commit -m "feat(procesamiento): botones Planillas/Marcar completadas deshabilitados (proximamente)"
```

---

### Task 5: Verificación final + smoke manual

**Files:** ninguno (verificación).

- [ ] **Step 1: Correr la suite completa**

Run: `npm test`
Expected: suite verde. Baseline conocido: el `unhandled rejection` pre-existente de `patient-form.page.spec` puede dar exit 1 sin ser fallo de tests (ver memoria). Confirmar que NO hay specs nuevos en rojo y que el conteo de tests sube respecto al baseline.

- [ ] **Step 2: Build de producción/dev**

Run: `npm run build`
Expected: build limpio.

- [ ] **Step 3: Smoke manual (browser)**

Levantar backend (worktree `Backend-mochila` o development) + `npm start`. Login como bioquímico/usuario con sección ANALITICA. Navegar a `/analitica/procesamiento`. Verificar:
- La lista muestra muestras reales en estado "En proceso" (mismas columnas/tubo que recolección).
- Polling activo: la lista se actualiza sola (200 → 304 en la pestaña Network).
- Scan/búsqueda filtran filas.
- Botones **Planillas** y **Marcar completadas** visibles pero deshabilitados.
- Sin menú de acciones de transición (read-only).

> Si no hay muestras en PROCESSING: hacer un dispatch desde Tránsito (Arco mochila) o ajustar seed local para dejar algún tubo en PROCESSING.

- [ ] **Step 4: Push y PR**

```bash
git push -u origin feat/procesamiento-lista
```
Abrir PR contra `development` linkeando el Jira en el body (ver Task de cierre del flujo).

---

## Self-Review (cobertura del spec)

- ✅ Lista = `sample-table`/`Tube` con `groupTubes` → Task 3 (sourceRows).
- ✅ Datos reales `worklist?status=PROCESSING` → Task 2 (effect).
- ✅ Polling ETag/304, 5s, pausa hidden, dedup → Task 3 (constructor + PollingService) / Task 2 (isNotModified).
- ✅ Toolbar scan+búsqueda + botones deshabilitados → reuso de scan-bar + Task 4.
- ✅ Read-only (canTransition false, sin batch-menu) → Task 3.
- ✅ Errores en español sin leak → `humanizeBackendError` reusado en Task 3.
- ✅ Sin cambios backend → ninguna task toca backend.
- ✅ Tests: reducer (Task 1), effect (Task 2), selector (Task 1), page smoke (Task 3).
