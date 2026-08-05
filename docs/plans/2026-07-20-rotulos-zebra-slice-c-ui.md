# Slice C (UI) — Pantalla de configuración de impresoras Zebra

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

> **Jira:** [KAN-251](https://exequielsantoro.atlassian.net/browse/KAN-251)
> **Spec:** `docs/superpowers/specs/2026-07-16-rotulos-zebra-design.md` (slice C)
> **Repo:** `F:\repos\tup\FRONTEND-LABORATORIO` — worktree `F:\repos\tup\FRONTEND-LABORATORIO-wt\printer-config`, branch `feat/printer-config` (base `origin/development`)

**Goal:** Una pantalla de back-office para que un ADMINISTRADOR dé de alta, liste y borre impresoras Zebra por sucursal — reemplazando el `INSERT` manual en la base. Al crear una impresora, su `printerToken` se muestra UNA sola vez para copiarlo (el agente lo usa para autenticarse).

**Architecture:** Angular 21 standalone + NgRx **clásico** (actions/reducer/selectors/effects/state — NO signalStore, aunque `@ngrx/signals` esté en deps). HttpClient directo con URLs relativas (`/api/v1/...`, el `proxy.conf.json` redirige a `:8080`). PrimeNG (p-table, p-dialog, p-confirmDialog, MessageService). Feature nueva bajo `src/app/features/analitica/preanalitica/printers/`.

## Global Constraints

- **NgRx clásico**, no signalStore. Patrón de referencia a clonar: `src/app/features/sucursales/` (service, store, y `pages/catalogo/components/areas-panel.component.ts` para la tabla+dialog+confirm).
- Componentes **standalone**, `ChangeDetectionStrategy.OnPush`, lectura con `store.selectSignal(...)`, escritura con `store.dispatch(...)`.
- URLs **relativas** `/api/v1/...` (nada de environment.ts — no existe; el proxy resuelve la base).
- Errores y éxitos de mutación se notifican **desde los effects** con PrimeNG `MessageService` (`p-toast`), como en `sucursales.effects.ts` y `agendas.effects.ts`. Loads con `switchMap`, mutaciones (add/delete) con `mergeMap`.
- Ruta con `canMatch: [roleGuard('ADMINISTRADOR')]` y `provideState`/`provideEffects` a nivel de ruta (patrón de `sucursales.routes.ts`).
- El `authTokenInterceptor` ya mete el JWT y `tenantIdInterceptor` el tenant — no hay que tocar nada de auth.
- Tests unit: `import { describe, it, expect } from 'vitest'`, `provideMockStore` de `@ngrx/store/testing`. Se corren con `npm test`.
- Commits: conventional commits en español, sin `Co-Authored-By`. Comandos desde el worktree `F:\repos\tup\FRONTEND-LABORATORIO-wt\printer-config` (`cd` en cada uno, el shell resetea el cwd). NUNCA push.

## Contrato del backend (verificado)

- `GET /api/v1/analitica/preanalitica/printers/` → `200` `[{ id, name, branchId, ipAddress, port }]` (SIN token).
- `POST /api/v1/analitica/preanalitica/printers/` (rol ADMINISTRADOR) body `{ name, branchId, ipAddress, port }` → `RegisterPrinterResponse` `{ id, name, branchId, ipAddress, port, printerToken }`. **El token viene SOLO acá, una vez.**
- `DELETE /api/v1/analitica/preanalitica/printers/{id}` (rol ADMINISTRADOR) → `204`.
- Sucursales para el dropdown: reusar `SucursalService.list()` (`src/app/features/sucursales/services/sucursal.service.ts`) → `PageResponse<Sucursal>` (`{ id, name, ... }`).

**Fuera de alcance** (necesitan backend que no existe): edición de impresora (no hay PATCH) y la vista de jobs `FAILED`/`EXHAUSTED` (no hay endpoint). Se dejan como follow-up.

## File Structure

```
src/app/features/analitica/preanalitica/printers/
  models/printer.model.ts
  services/printer.service.ts
  store/printer.state.ts
  store/printer.actions.ts
  store/printer.reducer.ts
  store/printer.selectors.ts
  store/printer.effects.ts
  pages/printers-list/printers-list.page.ts
  pages/printers-list/printers-list.page.html
  pages/printers-list/components/printer-token-dialog.component.ts
```
Más: registrar la ruta (en el `analitica.routes.ts` que corresponda) y, si hay un menú de navegación de admin, una entrada.

---

### Task 1: Data layer (model + service + store NgRx)

**Files (crear todos):**
- `models/printer.model.ts`
- `services/printer.service.ts`
- `store/printer.state.ts`, `printer.actions.ts`, `printer.reducer.ts`, `printer.selectors.ts`, `printer.effects.ts`
- Test: `store/printer.reducer.spec.ts`

**Interfaces (Produces):**
- `Printer { id, name, branchId, ipAddress, port }`, `PrinterCreateInput { name, branchId, ipAddress, port }`, `RegisteredPrinter extends Printer { printerToken }`.
- Actions: `loadPrinters`/`Success`/`Failure`, `addPrinter`/`Success`/`Failure`, `deletePrinter`/`Success`/`Failure`, `clearLastToken`.
- Selectors: `selectPrinters`, `selectPrintersLoading`, `selectLastRegisteredToken`.

- [ ] **Step 1: model**

`models/printer.model.ts`:
```ts
export interface Printer {
  id: number;
  name: string;
  branchId: number;
  ipAddress: string;
  port: number;
}

export interface PrinterCreateInput {
  name: string;
  branchId: number;
  ipAddress: string;
  port: number;
}

export interface RegisteredPrinter extends Printer {
  printerToken: string;
}
```

- [ ] **Step 2: service**

`services/printer.service.ts` (clon del estilo de `SucursalService`):
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Printer, PrinterCreateInput, RegisteredPrinter } from '../models/printer.model';

@Injectable({ providedIn: 'root' })
export class PrinterService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/preanalitica/printers';

  list(): Observable<Printer[]> {
    return this.http.get<Printer[]>(`${this.base}/`);
  }

  create(input: PrinterCreateInput): Observable<RegisteredPrinter> {
    return this.http.post<RegisteredPrinter>(`${this.base}/`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
```

- [ ] **Step 3: state + actions + selectors**

`store/printer.state.ts`:
```ts
import { Printer } from '../models/printer.model';

export const PRINTER_FEATURE_KEY = 'printers';

export interface PrinterState {
  items: Printer[];
  loading: boolean;
  lastRegisteredToken: string | null;
}

export const initialPrinterState: PrinterState = {
  items: [],
  loading: false,
  lastRegisteredToken: null,
};
```

`store/printer.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { Printer, PrinterCreateInput, RegisteredPrinter } from '../models/printer.model';

export const loadPrinters = createAction('[Printers] Load');
export const loadPrintersSuccess = createAction('[Printers] Load Success', props<{ items: Printer[] }>());
export const loadPrintersFailure = createAction('[Printers] Load Failure');

export const addPrinter = createAction('[Printers] Add', props<{ input: PrinterCreateInput }>());
export const addPrinterSuccess = createAction('[Printers] Add Success', props<{ printer: RegisteredPrinter }>());
export const addPrinterFailure = createAction('[Printers] Add Failure');

export const deletePrinter = createAction('[Printers] Delete', props<{ id: number }>());
export const deletePrinterSuccess = createAction('[Printers] Delete Success', props<{ id: number }>());
export const deletePrinterFailure = createAction('[Printers] Delete Failure');

export const clearLastToken = createAction('[Printers] Clear Last Token');
```

`store/printer.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PRINTER_FEATURE_KEY, PrinterState } from './printer.state';

const selectFeature = createFeatureSelector<PrinterState>(PRINTER_FEATURE_KEY);
export const selectPrinters = createSelector(selectFeature, s => s.items);
export const selectPrintersLoading = createSelector(selectFeature, s => s.loading);
export const selectLastRegisteredToken = createSelector(selectFeature, s => s.lastRegisteredToken);
```

- [ ] **Step 4: escribir el test del reducer (falla)**

`store/printer.reducer.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { printerReducer } from './printer.reducer';
import { initialPrinterState } from './printer.state';
import * as A from './printer.actions';
import { RegisteredPrinter } from '../models/printer.model';

describe('printerReducer', () => {
  it('stores items on load success', () => {
    const s = printerReducer(initialPrinterState,
      A.loadPrintersSuccess({ items: [{ id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 }] }));
    expect(s.items).toHaveLength(1);
    expect(s.loading).toBe(false);
  });

  it('keeps the token from add success so the dialog can show it once', () => {
    const printer: RegisteredPrinter = { id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100, printerToken: 'tok-abc' };
    const s = printerReducer(initialPrinterState, A.addPrinterSuccess({ printer }));
    expect(s.lastRegisteredToken).toBe('tok-abc');
    expect(s.items.map(p => p.id)).toContain(1);
  });

  it('clears the token so it cannot be shown again', () => {
    const withToken = { ...initialPrinterState, lastRegisteredToken: 'tok-abc' };
    const s = printerReducer(withToken, A.clearLastToken());
    expect(s.lastRegisteredToken).toBeNull();
  });

  it('removes a printer on delete success', () => {
    const withItem = { ...initialPrinterState, items: [{ id: 1, name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 }] };
    const s = printerReducer(withItem, A.deletePrinterSuccess({ id: 1 }));
    expect(s.items).toHaveLength(0);
  });
});
```

- [ ] **Step 5: correr y verificar que falla**

Run (desde el worktree): `npm test`
Expected: FAIL — `printerReducer` no existe.

- [ ] **Step 6: reducer**

`store/printer.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { initialPrinterState } from './printer.state';
import * as A from './printer.actions';

export const printerReducer = createReducer(
  initialPrinterState,
  on(A.loadPrinters, s => ({ ...s, loading: true })),
  on(A.loadPrintersSuccess, (s, { items }) => ({ ...s, items, loading: false })),
  on(A.loadPrintersFailure, s => ({ ...s, loading: false })),
  on(A.addPrinterSuccess, (s, { printer }) => ({
    ...s,
    items: [...s.items, { id: printer.id, name: printer.name, branchId: printer.branchId, ipAddress: printer.ipAddress, port: printer.port }],
    lastRegisteredToken: printer.printerToken,
  })),
  on(A.clearLastToken, s => ({ ...s, lastRegisteredToken: null })),
  on(A.deletePrinterSuccess, (s, { id }) => ({ ...s, items: s.items.filter(p => p.id !== id) })),
);
```

- [ ] **Step 7: effects**

`store/printer.effects.ts` (loads con `switchMap`, mutaciones con `mergeMap`; toasts de éxito/error como en `sucursales.effects.ts`):
```ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { catchError, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { PrinterService } from '../services/printer.service';
import * as A from './printer.actions';

@Injectable()
export class PrinterEffects {
  private actions$ = inject(Actions);
  private service = inject(PrinterService);
  private messages = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadPrinters),
    switchMap(() => this.service.list().pipe(
      map(items => A.loadPrintersSuccess({ items })),
      catchError(() => of(A.loadPrintersFailure())),
    )),
  ));

  add$ = createEffect(() => this.actions$.pipe(
    ofType(A.addPrinter),
    mergeMap(({ input }) => this.service.create(input).pipe(
      map(printer => A.addPrinterSuccess({ printer })),
      catchError(() => of(A.addPrinterFailure())),
    )),
  ));

  addSuccessToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.addPrinterSuccess),
    tap(() => this.messages.add({ severity: 'success', summary: 'Impresora registrada', detail: 'Copiá el token ahora: no se vuelve a mostrar.' })),
  ), { dispatch: false });

  delete$ = createEffect(() => this.actions$.pipe(
    ofType(A.deletePrinter),
    mergeMap(({ id }) => this.service.delete(id).pipe(
      map(() => A.deletePrinterSuccess({ id })),
      catchError(() => of(A.deletePrinterFailure())),
    )),
  ));

  deleteSuccessToast$ = createEffect(() => this.actions$.pipe(
    ofType(A.deletePrinterSuccess),
    tap(() => this.messages.add({ severity: 'success', summary: 'Impresora eliminada', detail: 'La impresora fue dada de baja.' })),
  ), { dispatch: false });

  showError$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadPrintersFailure, A.addPrinterFailure, A.deletePrinterFailure),
    tap(() => this.messages.add({ severity: 'error', summary: 'Error', detail: 'La operación sobre impresoras falló.' })),
  ), { dispatch: false });
}
```

- [ ] **Step 8: correr y verificar que pasa**

Run: `npm test`
Expected: PASS (los 4 tests del reducer). Confirmá que corrió (no 0 tests).

- [ ] **Step 9: commit**

```bash
cd F:/repos/tup/FRONTEND-LABORATORIO-wt/printer-config
git add src/app/features/analitica/preanalitica/printers/models src/app/features/analitica/preanalitica/printers/services src/app/features/analitica/preanalitica/printers/store
git -c user.name="DaronArg" -c user.email="darondevs013@gmail.com" commit -m "feat(printers): data layer del CRUD de impresoras (model, service, store NgRx)

Refs KAN-251"
```

---

### Task 2: La pantalla (tabla + alta + baja + diálogo del token) y la ruta

**Files:**
- Create: `pages/printers-list/printers-list.page.ts` + `.html`
- Create: `pages/printers-list/components/printer-token-dialog.component.ts`
- Modify: el `analitica.routes.ts` (o el archivo de rutas de analitica que corresponda — buscalo) para registrar la ruta con guard + provideState/provideEffects
- Test: `pages/printers-list/printers-list.page.spec.ts`

**Interfaces (Consumes):** los actions/selectors de Task 1; `SucursalService.list()` para el dropdown; `printer-token-dialog` recibe `token` por `@Input` y emite `close`.

- [ ] **Step 1: el diálogo del token (clon de first-login-link-dialog)**

`components/printer-token-dialog.component.ts` — clon EXACTO del patrón de `src/app/features/empresa/pages/usuarios/components/first-login-link-dialog.component.ts` (input readonly + botón copiar + `navigator.clipboard.writeText`, controlado por un signal que se limpia al cerrar). Adaptado al token:
```ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-printer-token-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule, InputTextModule],
  template: `
    <p-dialog [visible]="!!currentToken()" (visibleChange)="onVisibleChange($event)" [modal]="true"
              [dismissableMask]="false" [closable]="true" header="Token de la impresora"
              [style]="{ width: '34rem', maxWidth: '92vw' }">
      <p>Copiá este token ahora. <strong>No se vuelve a mostrar.</strong> El agente de impresión lo usa para autenticarse.</p>
      <div style="display: flex; gap: var(--space-2); align-items: center;">
        <input pInputText type="text" readonly [value]="currentToken() ?? ''" style="flex: 1;" />
        <p-button label="Copiar" icon="pi pi-copy" (onClick)="copy()" />
      </div>
    </p-dialog>`,
})
export class PrinterTokenDialogComponent {
  private readonly messages = inject(MessageService);
  private readonly _token = signal<string | null>(null);
  @Input() set token(value: string | null) { this._token.set(value ?? null); }
  @Output() close = new EventEmitter<void>();
  protected readonly currentToken = this._token.asReadonly();

  protected async copy(): Promise<void> {
    const t = this.currentToken();
    if (!t) return;
    await navigator.clipboard.writeText(t);
    this.messages.add({ severity: 'info', summary: 'Copiado', detail: 'Token copiado al portapapeles.' });
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) this.close.emit();
  }
}
```

- [ ] **Step 2: la página**

`pages/printers-list/printers-list.page.ts` — clon de la estructura de `areas-panel.component.ts` (tabla + dialog de alta con form reactivo + confirm de borrado), más el dropdown de sucursal y el token-dialog. El dropdown de sucursales se carga con `SucursalService.list()` en `ngOnInit` a un signal local (no hace falta store para eso). Al `addPrinterSuccess`, el store deja el token en `selectLastRegisteredToken`, que alimenta el `printer-token-dialog`; al cerrarlo se despacha `clearLastToken`.

```ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { PrinterTokenDialogComponent } from './components/printer-token-dialog.component';
import { Printer } from '../../models/printer.model';
import * as A from '../../store/printer.actions';
import { selectPrinters, selectPrintersLoading, selectLastRegisteredToken } from '../../store/printer.selectors';

@Component({
  selector: 'app-printers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, TableModule, ButtonModule, DialogModule, InputTextModule, InputNumberModule,
    SelectModule, ConfirmDialogModule, ToastModule, TooltipModule, PageHeaderComponent, PrinterTokenDialogComponent,
  ],
  templateUrl: './printers-list.page.html',
})
export class PrintersListPage implements OnInit {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);
  private sucursalService = inject(SucursalService);

  protected readonly printers = this.store.selectSignal(selectPrinters);
  protected readonly loading = this.store.selectSignal(selectPrintersLoading);
  protected readonly lastToken = this.store.selectSignal(selectLastRegisteredToken);
  protected readonly branches = signal<{ id: number; name: string }[]>([]);
  protected readonly dialogVisible = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    branchId: [null as number | null, Validators.required],
    ipAddress: ['', [Validators.required, Validators.pattern(/^\d{1,3}(\.\d{1,3}){3}$/)]],
    port: [9100, [Validators.required, Validators.min(1), Validators.max(65535)]],
  });

  ngOnInit(): void {
    this.store.dispatch(A.loadPrinters());
    this.sucursalService.list().subscribe(page =>
      this.branches.set((page.content ?? []).map(b => ({ id: b.id, name: b.name }))));
  }

  openNew(): void {
    this.form.reset({ name: '', branchId: null, ipAddress: '', port: 9100 });
    this.dialogVisible.set(true);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.store.dispatch(A.addPrinter({ input: { name: v.name, branchId: v.branchId!, ipAddress: v.ipAddress, port: v.port } }));
    this.dialogVisible.set(false);
  }

  remove(printer: Printer): void {
    this.confirm.confirm({
      message: `¿Eliminar la impresora "${printer.name}"?`,
      header: 'Confirmar eliminación', icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar', acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(A.deletePrinter({ id: printer.id })),
    });
  }

  branchName(id: number): string {
    return this.branches().find(b => b.id === id)?.name ?? String(id);
  }

  onTokenDialogClose(): void {
    this.store.dispatch(A.clearLastToken());
  }
}
```

`pages/printers-list/printers-list.page.html` — seguí la estructura del template de `areas-panel.component.html` (header con botón "Nueva impresora", `<p-table [value]="printers()">` con columnas nombre / sucursal (via `branchName(p.branchId)`) / IP / puerto y un botón trash por fila con `pTooltip` que llama `remove(p)`; un `<p-dialog [(visible)]="dialogVisible">` con el form reactivo (name, dropdown de `branches()`, ipAddress, port como `p-inputNumber`); `<p-confirmDialog [draggable]="false" />` y `<p-toast />` una vez). Al final, el token-dialog:
```html
<app-printer-token-dialog [token]="lastToken()" (close)="onTokenDialogClose()" />
```

- [ ] **Step 3: registrar la ruta**

Buscá el archivo de rutas de analitica (`fd -e ts 'analitica.routes'` o similar) y agregá la ruta siguiendo el patrón de `sucursales.routes.ts`:
```ts
{
  path: 'preanalitica/impresoras',
  canMatch: [roleGuard('ADMINISTRADOR')],
  data: { breadcrumb: 'Impresoras' },
  loadComponent: () => import('./preanalitica/printers/pages/printers-list/printers-list.page').then(m => m.PrintersListPage),
  providers: [
    provideState(PRINTER_FEATURE_KEY, printerReducer),
    provideEffects([PrinterEffects]),
    MessageService,
    ConfirmationService,
  ],
},
```
Ajustá los imports (`roleGuard`, `provideState`, `provideEffects`, `MessageService`, `ConfirmationService`, `PRINTER_FEATURE_KEY`, `printerReducer`, `PrinterEffects`) y la ruta base según dónde esté el routes de analitica. Si hay un menú de navegación admin, agregá la entrada "Impresoras" apuntando a esta ruta (buscá cómo sucursales agrega su ítem de menú).

- [ ] **Step 4: test de la página (falla primero)**

`pages/printers-list/printers-list.page.spec.ts` con `provideMockStore`. Verificá lo que importa: que `submit()` con el form válido despacha `addPrinter` con el input correcto, y que `onTokenDialogClose()` despacha `clearLastToken`. Ejemplo:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { PrintersListPage } from './printers-list.page';
import { SucursalService } from '@features/sucursales/services/sucursal.service';
import { selectPrinters, selectPrintersLoading, selectLastRegisteredToken } from '../../store/printer.selectors';
import * as A from '../../store/printer.actions';

describe('PrintersListPage', () => {
  let store: MockStore;
  let component: PrintersListPage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PrintersListPage],
      providers: [
        provideMockStore({ selectors: [
          { selector: selectPrinters, value: [] },
          { selector: selectPrintersLoading, value: false },
          { selector: selectLastRegisteredToken, value: null },
        ] }),
        { provide: SucursalService, useValue: { list: () => of({ content: [] }) } },
      ],
    });
    store = TestBed.inject(MockStore);
    component = TestBed.createComponent(PrintersListPage).componentInstance;
    vi.spyOn(store, 'dispatch');
  });

  it('dispatches addPrinter with the form values on submit', () => {
    component['form'].setValue({ name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 });
    component.submit();
    expect(store.dispatch).toHaveBeenCalledWith(A.addPrinter({ input: { name: 'Z1', branchId: 2, ipAddress: '10.0.0.1', port: 9100 } }));
  });

  it('does not dispatch when the form is invalid', () => {
    component['form'].setValue({ name: '', branchId: null, ipAddress: 'nope', port: 9100 });
    component.submit();
    expect(store.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: A.addPrinter.type }));
  });

  it('clears the token when the token dialog closes', () => {
    component.onTokenDialogClose();
    expect(store.dispatch).toHaveBeenCalledWith(A.clearLastToken());
  });
});
```

- [ ] **Step 5: correr y verificar que pasa**

Run: `npm test`
Expected: PASS (reducer + page). Confirmá que corrió > 0 tests.

- [ ] **Step 6: build**

Run: `npm run build`
Expected: build OK, sin errores de TS. (Confirma que los imports de PrimeNG, el routing y el guard enganchan.)

- [ ] **Step 7: commit**

```bash
cd F:/repos/tup/FRONTEND-LABORATORIO-wt/printer-config
git add -A
git -c user.name="DaronArg" -c user.email="darondevs013@gmail.com" commit -m "feat(printers): pantalla de alta/listado/baja de impresoras + token una sola vez

Tabla de impresoras por sucursal con alta en diálogo (nombre, IP, puerto,
sucursal) y baja con confirmación. Al registrar, muestra el printerToken una
única vez para copiarlo — el listado nunca lo re-expone (contrato del backend).
Ruta gateada a ADMINISTRADOR.

Refs KAN-251"
```

---

## Definition of done — Slice C

- [ ] La pantalla lista las impresoras del tenant, permite dar de alta (nombre, IP, puerto, sucursal) y borrar con confirmación.
- [ ] Al crear, el `printerToken` se muestra una sola vez con botón de copiar; al cerrar el diálogo no se puede volver a ver.
- [ ] La ruta está gateada a `ADMINISTRADOR`.
- [ ] `npm test` verde (reducer + página), `npm run build` OK.
- [ ] QA manual: crear una impresora contra el backend y confirmar que aparece en la tabla y que el token se muestra (parte de la QA de cierre de la slice).

**Fuera de este plan (follow-ups que necesitan backend):** edición de impresora (falta `PATCH`), y la vista de jobs `FAILED`/`EXHAUSTED` (falta endpoint que los liste).
