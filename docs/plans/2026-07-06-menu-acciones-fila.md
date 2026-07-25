# Menú de acciones por fila (3 puntitos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Jira:** [KAN-208](https://exequielsantoro.atlassian.net/browse/KAN-208)
> **Design:** `docs/specs/2026-07-06-menu-acciones-fila-design.md`
> **Rama front:** `feat/procesamiento-filtro-derivados`
> **Depende del back:** rama `feat/analitica-worklist-y-specs` (rollback sano KAN-181) para Rollback en Traslado/Procesamiento. Rechazar/Perder no dependen de nada.

**Goal:** Agregar un menú de 3 puntitos (kebab) al final de cada fila en Recolección, Traslado y Procesamiento que dispara por-fila las transiciones de estado (Rechazar/Perder, +Rollback en Traslado/Procesamiento) que hoy solo se hacen por selección masiva.

**Architecture:** Un componente compartido nuevo `RowActionsMenuComponent` (standalone, `p-menu` popup) integrado en las 3 filas. La capa de negocio ya existe (`transitionLabels` action → `callTransition` effect → endpoints `reject`/`markLost`/`rollback`). El diálogo `TransitionDialogComponent` se reusa con `[samples]` de 1 elemento. Recolección ya tiene el andamiaje del diálogo; Procesamiento y Traslado hay que agregárselo. Traslado además necesita +2 transiciones (`rejected`, `lost`) en su config.

**Tech Stack:** Angular standalone + signals, NgRx classic, PrimeNG v21 (`p-menu`, `MenuModule`, `Menu`, `MenuItem`), Vitest orquestado por `@angular/build:unit-test`.

> **Runner de tests (CRÍTICO):** correr los tests SIEMPRE con `npx ng test --watch=false --include='<glob>'` (builder AOT), **NUNCA** `npx vitest run` directo. Vitest está como dependencia pero corrido a mano usa Angular en JIT y rompe los signal-inputs con `NG0303` en `setInput`. El builder de Angular (`ng test`) usa Vitest en AOT y registra bien los inputs. `--include` acepta globs tipo `**/archivo.spec.ts` o `dir/**`.

---

## File Structure

**Nuevo:**
- `src/app/shared/ui/components/row-actions-menu/row-actions-menu.component.ts` — componente kebab + p-menu popup, reusable en las 3 pantallas.
- `src/app/shared/ui/components/row-actions-menu/row-actions-menu.component.spec.ts` — tests del componente.

**Modificados:**
- `src/app/features/analitica/muestras/data/state-machine.config.ts` — agregar `rejectedTarget`/`lostTarget` a la screen `traslado`.
- `src/app/features/analitica/muestras/components/sample-table/sample-table.component.html` — `<td>` kebab + colspan 7→8.
- `src/app/features/analitica/muestras/components/sample-table/sample-table.component.ts` — output `rowAction`.
- `src/app/features/analitica/muestras/pages/worklist/worklist.page.ts` + `.html` — handler `onRowAction` (Recolección) + wiring `sample-table`.
- `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.html` + `.scss` + `.ts` — celda kebab + grid + andamiaje del diálogo.
- `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.ts` — botón kebab + output `rowAction`.
- `src/app/features/analitica/muestras/components/transito/lote-card/lote-card.component.ts` — re-emitir `rowAction`.
- `src/app/features/analitica/muestras/components/transito/recommended-group-card/recommended-group-card.component.ts` — re-emitir `rowAction`.
- `src/app/features/analitica/muestras/pages/transito/transito.page.ts` + `.html` — handler `onRowAction` + andamiaje del diálogo.

**Tipo compartido nuevo** (`RowActionKey`): se define en `row-actions-menu.component.ts` y se exporta; es un subconjunto de `TransitionKey`.

---

## Task 1: RowActionsMenuComponent (componente compartido)

**Files:**
- Create: `src/app/shared/ui/components/row-actions-menu/row-actions-menu.component.ts`
- Test: `src/app/shared/ui/components/row-actions-menu/row-actions-menu.component.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// row-actions-menu.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { RowActionsMenuComponent, type RowAction } from './row-actions-menu.component';

describe('RowActionsMenuComponent', () => {
  const actions: RowAction[] = [
    { key: 'rejected', label: 'Rechazar', icon: 'pi-ban' },
    { key: 'lost', label: 'Perder', icon: 'pi-exclamation-triangle' },
  ];

  function setup() {
    TestBed.configureTestingModule({ imports: [RowActionsMenuComponent] });
    const fixture = TestBed.createComponent(RowActionsMenuComponent);
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();
    return fixture;
  }

  it('renderiza el botón kebab', () => {
    const fixture = setup();
    const btn = fixture.nativeElement.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn.querySelector('i.pi-ellipsis-v')).toBeTruthy();
  });

  it('mapea actions a MenuItem[] con command que emite accion', () => {
    const fixture = setup();
    const cmp = fixture.componentInstance;
    const emitted: string[] = [];
    cmp.accion.subscribe((k) => emitted.push(k));

    const items = cmp.items();
    expect(items.length).toBe(2);
    expect(items[0].label).toBe('Rechazar');

    items[0].command!({} as never);
    items[1].command!({} as never);
    expect(emitted).toEqual(['rejected', 'lost']);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/row-actions-menu.component.spec.ts'`
Expected: FAIL — `Cannot find module './row-actions-menu.component'`.

- [ ] **Step 3: Implementar el componente**

```ts
// row-actions-menu.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';

/** Subconjunto de TransitionKey que el menú por-fila puede disparar. */
export type RowActionKey = 'rollback' | 'rejected' | 'lost';

export interface RowAction {
  key: RowActionKey;
  label: string;
  /** PrimeIcons name, ej. 'pi-ban'. */
  icon: string;
}

@Component({
  selector: 'app-row-actions-menu',
  standalone: true,
  imports: [MenuModule],
  template: `
    <button
      type="button"
      class="row-kebab"
      aria-label="Acciones de la fila"
      (click)="$event.stopPropagation(); menu.toggle($event)"
    >
      <i class="pi pi-ellipsis-v"></i>
    </button>
    <p-menu #menu [popup]="true" [model]="items()" appendTo="body" />
  `,
  styles: [`
    .row-kebab {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border: none; background: transparent;
      border-radius: 6px; cursor: pointer; color: var(--text-color-secondary, #64748b);
    }
    .row-kebab:hover { background: rgba(100, 116, 139, 0.12); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionsMenuComponent {
  readonly actions = input.required<ReadonlyArray<RowAction>>();
  readonly accion = output<RowActionKey>();

  readonly items = computed<MenuItem[]>(() =>
    this.actions().map((a) => ({
      label: a.label,
      icon: 'pi ' + a.icon,
      command: () => this.accion.emit(a.key),
    })),
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/row-actions-menu.component.spec.ts'`
Expected: PASS — 2 tests verdes.

- [ ] **Step 5: Commit**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add src/app/shared/ui/components/row-actions-menu/
git commit -m "feat(muestras): RowActionsMenuComponent — kebab por-fila (KAN-208)"
```

---

## Task 2: Config Traslado — agregar rejected + lost

**Files:**
- Modify: `src/app/features/analitica/muestras/data/state-machine.config.ts` (const `TRASLADO`, targets array)
- Test: `src/app/features/analitica/muestras/data/state-machine.config.spec.ts`

**Contexto:** `rejectedTarget` y `lostTarget` ya existen como constantes en el archivo (líneas 10-24) y se usan en `recoleccion`/`procesamiento`. Traslado hoy solo tiene `area`, `reroute`, `derived`, `rollback`. Hay que sumar `rejectedTarget` y `lostTarget` a su array `targets`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// state-machine.config.spec.ts
import { SCREENS } from './state-machine.config';

describe('state-machine.config — screen traslado', () => {
  it('expone rejected, lost y rollback', () => {
    const keys = SCREENS.traslado.targets.map((t) => t.key);
    expect(keys).toContain('rejected');
    expect(keys).toContain('lost');
    expect(keys).toContain('rollback');
  });

  it('rejected/lost apuntan a los estados correctos', () => {
    const byKey = new Map(SCREENS.traslado.targets.map((t) => [t.key, t]));
    expect(byKey.get('rejected')!.toState).toBe('rejected');
    expect(byKey.get('lost')!.toState).toBe('lost');
  });
});
```

Nota: si el archivo `state-machine.config.spec.ts` ya existe, agregar este `describe` en vez de sobrescribir.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/state-machine.config.spec.ts'`
Expected: FAIL — `expected [ 'area', 'reroute', 'derived', 'rollback' ] to contain 'rejected'`.

- [ ] **Step 3: Agregar los targets a la config**

En `state-machine.config.ts`, dentro de `const TRASLADO: ScreenConfig = { ... targets: [ ... ] }`, agregar `rejectedTarget` y `lostTarget` a la lista. Debe quedar (respetando el orden: acciones felices primero, rechazar/perder, y rollback al final con su `sep: true`):

```ts
  targets: [
    {
      key: 'area', label: 'Asignar a área (esta sucursal)', toLabel: 'En proceso', toState: 'processing',
      color: 'green', icon: 'pi-inbox',
      desc: 'Recepción y asignación a un área de esta sucursal.',
      reco: 'RECEPCIÓN',
      fields: ['areaFixed'],
    },
    {
      key: 'reroute', label: 'Trasladar a otra sucursal', toLabel: 'En tránsito', toState: 'transito',
      color: 'blue', icon: 'pi-truck',
      desc: 'Cambiar el destino a otra sucursal de la red.',
      fields: ['sucursal', 'area'],
    },
    {
      key: 'derived', label: 'Derivar a laboratorio externo', toLabel: 'Derivada', toState: 'derived',
      color: 'purple', icon: 'pi-building',
      desc: 'Enviar al laboratorio de referencia.',
      fields: ['lab'],
    },
    rejectedTarget,
    lostTarget,
    {
      key: 'rollback', label: 'Volver a estado anterior', toLabel: 'Recolectada', toState: 'collected',
      color: 'slate', icon: 'pi-undo',
      desc: 'Volver a Recolectada por carga errónea.',
      sep: true,
      fields: [],
      reason: 'Motivo del rollback',
    },
  ],
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/state-machine.config.spec.ts'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add src/app/features/analitica/muestras/data/state-machine.config.ts src/app/features/analitica/muestras/data/state-machine.config.spec.ts
git commit -m "feat(muestras): agregar rejected+lost a screen traslado (KAN-208)"
```

---

## Task 3: Recolección — integrar el menú (la más simple)

**Files:**
- Modify: `src/app/features/analitica/muestras/components/sample-table/sample-table.component.ts` (imports + output `rowAction`)
- Modify: `src/app/features/analitica/muestras/components/sample-table/sample-table.component.html` (`<th>` + `<td>` kebab + colspan 7→8)
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.ts` (handler `onRowAction`)
- Modify: `src/app/features/analitica/muestras/pages/worklist/worklist.page.html` (wiring `(rowAction)`)

**Contexto:** `worklist.page` ya tiene `activeTransition` signal, `selectTransition`, `confirmDialog`, `cancelDialog` y el bloque `@if (activeTransition())` en el HTML. Solo falta: (a) el kebab en `sample-table`, (b) el handler `onRowAction` que resuelve la Transition de la config y abre el diálogo con 1 sample. Recolección NO tiene rollback → menú = {Rechazar, Perder}.

- [ ] **Step 1: Escribir el test que falla (handler de la page)**

Test que verifica que `onRowAction('rejected', tube)` deja `activeTransition` seteada con la transición correcta y `rowMenuSamples` con el tube. Agregar a `worklist.page.spec.ts` (si no existe, crearlo con el harness mínimo de TestBed que ya usan las otras pages del módulo — copiar el bloque `beforeEach` de `procesamiento.page.spec.ts` o `transito.page.spec.ts` si existen; si no, providers `provideMockStore`, `provideRouter([])`, `MessageService`).

```ts
// dentro de worklist.page.spec.ts
it('onRowAction abre el diálogo con la transición y el sample de la fila', () => {
  // component = fixture.componentInstance ya inicializado en beforeEach
  const tube = { id: 't1', labelIds: [10, 11], state: 'collected' } as unknown as Tube;
  component.onRowAction('rejected', tube);

  expect(component.activeTransition()?.key).toBe('rejected');
  expect(component.rowMenuSamples()).toEqual([tube]);
});
```

Import en el spec: `import type { Tube } from '../../models/tube.model';`.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/worklist.page.spec.ts'`
Expected: FAIL — `component.onRowAction is not a function` (o `rowMenuSamples is not a function`).

- [ ] **Step 3a: Agregar output al sample-table**

En `sample-table.component.ts`: importar `RowActionsMenuComponent` y `RowActionKey`, agregarlo a `imports`, declarar el output.

```ts
// imports arriba
import { RowActionsMenuComponent, type RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
```
```ts
// en @Component imports: [...existentes, RowActionsMenuComponent]
```
```ts
// en la clase, junto a los otros outputs (toggleRow, etc.)
readonly rowAction = output<{ key: RowActionKey; row: Sample }>();
```

- [ ] **Step 3b: Agregar el `<th>` y el `<td>` kebab, subir colspan**

En `sample-table.component.html`:
1. En el `<thead>` (después del último `<th>` de "Estado"), agregar `<th class="actions-col" aria-label="Acciones"></th>`.
2. Antes del `</tr>` de datos (línea 78, después del `<td>` de Estado), agregar:

```html
    <td class="actions-col" (click)="$event.stopPropagation()">
      <app-row-actions-menu
        [actions]="rowMenuActions"
        (accion)="rowAction.emit({ key: $event, row })"
      />
    </td>
```

3. Cambiar `colspan="7"` → `colspan="8"` en los 3 lugares: la fila de expansión, el header vacío y el `@empty`.

Y en `sample-table.component.ts`, exponer las acciones (Recolección = Rechazar, Perder):

```ts
import type { RowAction } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
// ...
readonly rowMenuActions: ReadonlyArray<RowAction> = [
  { key: 'rejected', label: 'Rechazar', icon: 'pi-ban' },
  { key: 'lost', label: 'Perder', icon: 'pi-exclamation-triangle' },
];
```

- [ ] **Step 3c: Handler + estado en la page**

En `worklist.page.ts`, agregar el signal para el sample de la fila (independiente de la selección masiva) y el handler:

```ts
// junto a activeTransition (línea 307)
readonly rowMenuSamples = signal<Sample[]>([]);
```
```ts
// nuevo método
onRowAction(key: RowActionKey, row: Sample): void {
  const t = this.config().targets.find((tt) => tt.key === key);
  if (!t) return;
  this.rowMenuSamples.set([row]);
  this.activeTransition.set(t);
}
```

Import: `import type { RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';`.

Nota: `this.config()` es el `computed<ScreenConfig>` del screen activo (`worklist.page.ts:53-56`), fuente de `targets`.

En `confirmDialog`, la resolución de `labelIds` hoy usa `this.selectedSamples()`. Para que funcione tanto con selección masiva como con el menú por-fila, `confirmDialog` debe usar los samples del menú cuando estén presentes:

```ts
// al inicio de confirmDialog, después de const t = this.activeTransition();
const rowSamples = this.rowMenuSamples();
const usingRowMenu = rowSamples.length > 0;
```

En la rama `isBackendScreen()`, reemplazar `const tubes = this.selectedSamples() as Tube[];` por:

```ts
const tubes = (usingRowMenu ? rowSamples : this.selectedSamples()) as Tube[];
```

Y al final del método (en ambas ramas, antes de salir) limpiar el estado del menú:

```ts
this.rowMenuSamples.set([]);
```

En `cancelDialog`, agregar también `this.rowMenuSamples.set([]);`.

- [ ] **Step 3d: Wiring en el HTML de la page**

En `worklist.page.html`, en el `<app-sample-table ...>`, conectar el output:

```html
  (rowAction)="onRowAction($event.key, $event.row)"
```

Y en el bloque `@if (activeTransition(); as t)`, cambiar `[samples]="selectedSamples()"` por:

```html
    [samples]="rowMenuSamples().length ? rowMenuSamples() : selectedSamples()"
```

- [ ] **Step 4: Correr los tests y build**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/worklist.page.spec.ts' --include='src/app/features/analitica/muestras/components/sample-table/**'`
Expected: PASS.

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng build --configuration development`
Expected: build exitoso (sin errores de template/tipos).

- [ ] **Step 5: Commit**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add src/app/features/analitica/muestras/components/sample-table/ src/app/features/analitica/muestras/pages/worklist/
git commit -m "feat(muestras): menú por-fila en Recolección — Rechazar/Perder (KAN-208)"
```

---

## Task 4: Procesamiento — celda kebab + andamiaje del diálogo

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.html` (celda + header)
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.scss` (`--grid-proc` +1 columna)
- Modify: `src/app/features/analitica/muestras/pages/procesamiento/procesamiento.page.ts` (imports + andamiaje diálogo + handler)

**Contexto:** Procesamiento NO tiene el `transition-dialog` hoy — hay que agregarlo copiando el patrón de `worklist.page`. Menú = {Rollback, Rechazar, Perder}. Las filas ya son `Tube` (`selectedTubes`), `labelIds` disponible. `procesamiento.page` dispara sus transiciones vía `transitionLabels` (verificar con Grep en el `.ts`; si hoy usa otro mecanismo para el batch, el menú por-fila igual dispara `transitionLabels` directo).

- [ ] **Step 1: Escribir el test que falla**

```ts
// dentro de procesamiento.page.spec.ts (crear si no existe, con el harness de las otras pages)
it('onRowAction abre el diálogo con la transición y el tube de la fila', () => {
  const tube = { id: 'p1', labelIds: [20], state: 'processing' } as unknown as Tube;
  component.onRowAction('rejected', tube);
  expect(component.activeTransition()?.key).toBe('rejected');
  expect(component.rowMenuSamples()).toEqual([tube]);
});

it('confirmDialog despacha transitionLabels con los labelIds del tube', () => {
  const dispatch = vi.spyOn(store, 'dispatch');
  const tube = { id: 'p1', labelIds: [20, 21], state: 'processing' } as unknown as Tube;
  component.onRowAction('rollback', tube);
  component.confirmDialog({ dest: {}, note: '' });
  expect(dispatch).toHaveBeenCalledWith(
    expect.objectContaining({ labelIds: [20, 21], transitionKey: 'rollback' }),
  );
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/procesamiento.page.spec.ts'`
Expected: FAIL — `component.onRowAction is not a function`.

- [ ] **Step 3a: Andamiaje del diálogo en el .ts**

En `procesamiento.page.ts`:

```ts
// imports
import { TransitionDialogComponent } from '../../components/transition-dialog/transition-dialog.component';
import { RowActionsMenuComponent, type RowAction, type RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
import type { Transition, TransitionDest } from '../../models/transition.model';
import { transitionLabels } from '../../store/muestras.actions';
import { SCREENS } from '../../data/state-machine.config';
import { signal } from '@angular/core'; // si no está importado
```
```ts
// en @Component imports: [...existentes, TransitionDialogComponent, RowActionsMenuComponent]
```
```ts
// en la clase
readonly activeTransition = signal<Transition | null>(null);
readonly rowMenuSamples = signal<Tube[]>([]);

readonly rowMenuActions: ReadonlyArray<RowAction> = [
  { key: 'rollback', label: 'Volver a estado anterior', icon: 'pi-undo' },
  { key: 'rejected', label: 'Rechazar', icon: 'pi-ban' },
  { key: 'lost', label: 'Perder', icon: 'pi-exclamation-triangle' },
];

onRowAction(key: RowActionKey, row: Tube): void {
  const t = SCREENS.procesamiento.targets.find((tt) => tt.key === key);
  if (!t) return;
  this.rowMenuSamples.set([row]);
  this.activeTransition.set(t);
}

cancelDialog(): void {
  this.activeTransition.set(null);
  this.rowMenuSamples.set([]);
}

confirmDialog(_payload: { dest: TransitionDest; note: string }): void {
  const t = this.activeTransition();
  const tubes = this.rowMenuSamples();
  this.activeTransition.set(null);
  this.rowMenuSamples.set([]);
  if (!t || tubes.length === 0) return;
  const labelIds = tubes.flatMap((tube) => tube.labelIds ?? []);
  if (labelIds.length === 0) return;
  this.store.dispatch(transitionLabels({
    labelIds,
    transitionKey: t.key,
    reason: _payload.note || undefined,
  }));
}
```

Nota: `this.store` debe estar inyectado (verificar; si no, `private readonly store = inject(Store);`). `Tube` se importa de `../../models/tube.model`.

- [ ] **Step 3b: Grid SCSS — sumar la columna del kebab**

En `procesamiento.page.scss` línea 11, agregar `40px` al final de `--grid-proc`:

```scss
--grid-proc: 44px minmax(200px, 1.5fr) minmax(150px, 1fr) minmax(160px, 1fr) 104px 130px 40px;
```

- [ ] **Step 3c: HTML — celda kebab en header y fila**

En `procesamiento.page.html`, en el `.thead-card proc-grid`, agregar un `<span></span>` vacío al final (columna del kebab):

```html
  <span>MUESTRA</span><span>ESTUDIO</span><span>SUCURSAL/SEDE</span><span>TOMA</span><span>ESTADO</span><span></span>
```

Al final del `.proc-row` (antes del `</div>` de cierre de la fila), agregar:

```html
  <div class="cell-actions" (click)="$event.stopPropagation()">
    <app-row-actions-menu
      [actions]="rowMenuActions"
      (accion)="onRowAction($event, t)"
    />
  </div>
```

Y al final del template, agregar el bloque del diálogo (copia del de worklist):

```html
@if (activeTransition(); as t) {
  <app-muestras-transition-dialog
    [transition]="t"
    [samples]="rowMenuSamples()"
    (confirm)="confirmDialog($event)"
    (cancel)="cancelDialog()"
  />
}
```

Nota: para rollback/rejected/lost los `fields` son `[]` → el diálogo no pide sucursal/área/lab, así que NO hace falta pasar `[currentBranch]`/`[branches]`/`[areas]`/`[labs]`.

- [ ] **Step 4: Correr los tests y build**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/procesamiento.page.spec.ts'`
Expected: PASS.

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng build --configuration development`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add src/app/features/analitica/muestras/pages/procesamiento/
git commit -m "feat(muestras): menú por-fila en Procesamiento — Rollback/Rechazar/Perder (KAN-208)"
```

---

## Task 5: Traslado — kebab en sample-row + propagación + andamiaje

**Files:**
- Modify: `src/app/features/analitica/muestras/components/transito/sample-row/sample-row.component.ts` (botón kebab + output `rowAction`)
- Modify: `src/app/features/analitica/muestras/components/transito/lote-card/lote-card.component.ts` (re-emitir)
- Modify: `src/app/features/analitica/muestras/components/transito/recommended-group-card/recommended-group-card.component.ts` (re-emitir)
- Modify: `src/app/features/analitica/muestras/pages/transito/transito.page.ts` (handler + andamiaje diálogo)
- Modify: `src/app/features/analitica/muestras/pages/transito/transito.page.html` (wiring + bloque diálogo)

**Contexto:** El row está anidado en `lote-card` y `recommended-group-card`, que a su vez viven en `transito.page`. El row emite su `id` (string); la page resuelve el `Tube` y sus `labelIds`. Menú = {Rollback, Rechazar, Perder}. Traslado NO tiene el `transition-dialog` (su confirmación es `ConfirmSendAllDialog`, ajena) → agregarlo. `TransitoLotesService` es `protected` en la page (usable desde template y métodos).

- [ ] **Step 1: Escribir el test que falla (propagación + resolución de labelIds)**

```ts
// dentro de sample-row.component.spec.ts (crear si no existe)
import { TestBed } from '@angular/core/testing';
import { SampleRowComponent } from './sample-row.component';
import type { Sample } from '../../../models/sample.model';

describe('SampleRowComponent — rowAction', () => {
  it('emite rowAction con la key al elegir una acción del menú', () => {
    TestBed.configureTestingModule({ imports: [SampleRowComponent] });
    const fixture = TestBed.createComponent(SampleRowComponent);
    const sample = { id: 's1', state: 'transito' } as unknown as Sample;
    fixture.componentRef.setInput('sample', sample);
    fixture.componentRef.setInput('selected', false);
    fixture.componentRef.setInput('flashing', false);
    fixture.componentRef.setInput('leaving', false);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentInstance.rowAction.subscribe((k) => emitted.push(k));
    fixture.componentInstance.onRowAction('rollback' as never);
    expect(emitted).toEqual(['rollback']);
  });
});
```

Y en `transito.page.spec.ts` (harness existente), un test del handler:

```ts
it('onRowAction resuelve labelIds del tube y abre el diálogo', () => {
  // asumiendo que el service tiene un tube con id 's1' y labelIds [30,31] en el fixture
  component.onRowAction('rejected', 's1');
  expect(component.activeTransition()?.key).toBe('rejected');
  // rowMenuSamples contiene el tube resuelto
  expect(component.rowMenuSamples()[0]?.labelIds).toEqual([30, 31]);
});
```

Nota: si armar el fixture del service con un tube concreto es costoso, dejar solo el primer test (row emite) en el spec del row y verificar la resolución de labelIds en la sección de verificación manual (Task 6). Documentar la decisión en el commit.

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='src/app/features/analitica/muestras/components/transito/sample-row/**'`
Expected: FAIL — `onRowAction is not a function` / `rowAction` no existe.

- [ ] **Step 3a: Kebab + output en sample-row**

En `sample-row.component.ts`:

```ts
// imports
import { RowActionsMenuComponent, type RowAction, type RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
```
```ts
// en @Component imports: [DateEsPipe, RowActionsMenuComponent]
```

En el template, agregar la celda del menú al final del `.row` (después de `col-state`):

```html
  <div class="col-actions" (click)="$event.stopPropagation()">
    <app-row-actions-menu [actions]="rowMenuActions" (accion)="onRowAction($event)" />
  </div>
```

En la clase:

```ts
readonly rowAction = output<RowActionKey>();

readonly rowMenuActions: ReadonlyArray<RowAction> = [
  { key: 'rollback', label: 'Volver a estado anterior', icon: 'pi-undo' },
  { key: 'rejected', label: 'Rechazar', icon: 'pi-ban' },
  { key: 'lost', label: 'Perder', icon: 'pi-exclamation-triangle' },
];

onRowAction(key: RowActionKey): void {
  this.rowAction.emit(key);
}
```

En el SCSS `sample-row.component.scss`, si `.row` es grid, agregar la columna; si es flex, la celda `.col-actions` se acomoda con `margin-left: auto`. Verificar el layout real y ajustar mínimamente para que el kebab quede al final sin romper alineación.

- [ ] **Step 3b: Re-emitir en las cards**

En `lote-card.component.ts`, junto a `toggleSample`:

```ts
import type { RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
// ...
readonly rowAction = output<{ id: string; key: RowActionKey }>();
```

Y en el `<app-sample-row ...>` del template, agregar:

```html
      (rowAction)="rowAction.emit({ id: s.id, key: $event })"
```

Idéntico en `recommended-group-card.component.ts` (mismo output + mismo binding en su `<app-sample-row>`).

- [ ] **Step 3c: Handler + andamiaje del diálogo en transito.page**

En `transito.page.ts`:

```ts
// imports
import { TransitionDialogComponent } from '../../components/transition-dialog/transition-dialog.component';
import type { RowActionKey } from '@shared/ui/components/row-actions-menu/row-actions-menu.component';
import type { Transition, TransitionDest } from '../../models/transition.model';
import { transitionLabels } from '../../store/muestras.actions';
import { SCREENS } from '../../data/state-machine.config';
```
```ts
// en @Component imports: [...existentes, TransitionDialogComponent]
```
```ts
// en la clase
readonly activeTransition = signal<Transition | null>(null);
readonly rowMenuSamples = signal<Tube[]>([]);

onRowAction(key: RowActionKey, id: string): void {
  const t = SCREENS.traslado.targets.find((tt) => tt.key === key);
  if (!t) return;
  const tube = this.samplesOf([id])[0] as Tube | undefined;
  if (!tube) return;
  this.rowMenuSamples.set([tube]);
  this.activeTransition.set(t);
}

cancelDialog(): void {
  this.activeTransition.set(null);
  this.rowMenuSamples.set([]);
}

confirmDialog(payload: { dest: TransitionDest; note: string }): void {
  const t = this.activeTransition();
  const tubes = this.rowMenuSamples();
  this.activeTransition.set(null);
  this.rowMenuSamples.set([]);
  if (!t || tubes.length === 0) return;
  const labelIds = tubes.flatMap((tube) => tube.labelIds ?? []);
  if (labelIds.length === 0) return;
  this.store.dispatch(transitionLabels({
    labelIds,
    transitionKey: t.key,
    reason: payload.note || undefined,
  }));
}
```

Nota: `samplesOf(ids)` ya existe en `transito.page.ts` (líneas 194-198) y devuelve `Sample[]`; el cast a `Tube` es seguro porque en tránsito las muestras son tubes con `labelIds`. Verificar que `store` esté inyectado (`private readonly store = inject(Store);`). `Tube` de `../../models/tube.model`.

- [ ] **Step 3d: Wiring en transito.page.html**

En los `<app-lote-card ...>` y `<app-recommended-group-card ...>`, conectar el output:

```html
      (rowAction)="onRowAction($event.key, $event.id)"
```

Y al final del template, el bloque del diálogo:

```html
@if (activeTransition(); as t) {
  <app-muestras-transition-dialog
    [transition]="t"
    [samples]="rowMenuSamples()"
    (confirm)="confirmDialog($event)"
    (cancel)="cancelDialog()"
  />
}
```

- [ ] **Step 4: Correr los tests y build**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='src/app/features/analitica/muestras/components/transito/**' --include='src/app/features/analitica/muestras/pages/transito/**'`
Expected: PASS.

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng build --configuration development`
Expected: build exitoso.

- [ ] **Step 5: Commit**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add src/app/features/analitica/muestras/components/transito/ src/app/features/analitica/muestras/pages/transito/
git commit -m "feat(muestras): menú por-fila en Traslado — Rollback/Rechazar/Perder (KAN-208)"
```

---

## Task 6: Verificación integral

**Files:** ninguno nuevo — build + suite + smoke manual.

- [ ] **Step 1: Suite completa del módulo muestras**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng test --watch=false --include='src/app/features/analitica/muestras/**' --include='src/app/shared/ui/components/row-actions-menu/**'`
Expected: todo verde. Si algún test preexistente rompe por el colspan/grid nuevo, arreglar el test (no el prod salvo bug real).

- [ ] **Step 2: Build de producción**

Run: `cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO && npx ng build`
Expected: build exitoso, sin errores de template ni tipos.

- [ ] **Step 3: Smoke manual (contra back local con la rama `feat/analitica-worklist-y-specs`)**

Levantar el stack (ver memoria "Levantar stack local"). Verificar en cada pantalla:
- [ ] Recolección: clic kebab → menú {Rechazar, Perder}; el clic NO tilda la fila; Rechazar abre diálogo pidiendo motivo; confirmar → la muestra desaparece de Recolectada.
- [ ] Procesamiento: menú {Rollback, Rechazar, Perder}; Rollback → vuelve a En tránsito (verificar que la Sample acompaña, no split-brain — depende del back unificado).
- [ ] Traslado (tab Todos y Derivados): menú {Rollback, Rechazar, Perder}; Rollback → vuelve a Recolectada y colapsa la cadena de tránsito (`destinationBranchId` limpio); Rechazar/Perder funcionan.
- [ ] No-regresión: selección masiva (batch-menu) intacta; envío por lote/mochila en Traslado intacto.

- [ ] **Step 4: Commit final si hubo ajustes de verificación**

```bash
cd /home/leon/Escritorio/TTL/FRONTEND-LABORATORIO
git add -A
git commit -m "test(muestras): ajustes de verificación menú por-fila (KAN-208)"
```

---

## Notas de implementación (discrepancias detectadas en exploración)

1. **`Transition.fields` es obligatorio** (`fields: DestField[]`, no `fields?`). Todo target nuevo lo declara; rollback/rejected/lost usan `fields: []`.
2. **El método que abre el diálogo en worklist es `selectTransition(t)`**, no `openTransition`. El menú por-fila usa un handler nuevo `onRowAction` que setea `activeTransition` + `rowMenuSamples` directamente (no reusa `selectTransition` porque ese limpia `menuOpen` del batch-menu).
3. **`tubesById` es `private` en `TransitoLotesService`** — la page NO lo usa directo. Resolvemos el tube vía `samplesOf([id])` (helper existente de la page, líneas 194-198) y casteamos a `Tube`.
4. **Ninguna de las 3 filas usa `DataTableComponent`** — sample-table es `<table>` nativo (colspan), procesamiento es CSS grid (`--grid-proc`), tránsito es `app-sample-row` en cards. El `p-menu` se replica en `RowActionsMenuComponent`, no se reusa el del data-table.
5. **`rowMenuSamples` separado de la selección masiva:** el menú por-fila NO toca `selectedIds`/`_sel`. Cada page mantiene un signal `rowMenuSamples` con el/los tube(s) de la acción por-fila, y el diálogo prioriza ese signal cuando está poblado.
6. **`appendTo="body"` en el p-menu** evita que el popup quede clippeado por el `overflow` de las cards/tabla.
