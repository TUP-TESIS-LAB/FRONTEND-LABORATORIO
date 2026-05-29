# Sucursales Back-Office — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-05-26-turnos-cierre-ux-y-sucursales-back-office-design.md` §4
> **Repo:** `FRONTEND-LABORATORIO`
> **Branch:** `feat/sucursales-back-office` (sale de `origin/development` HEAD `afa49d7`)
> **Jira:** [KAN-47](https://exequielsantoro.atlassian.net/browse/KAN-47) — relates to KAN-41 (cierre TURNOS anterior)

**Goal:** Reemplazar el form modal de 4 campos por un back-office completo de sucursales con stepper de alta, tabs de edición, y catálogo de Áreas/Secciones, cableado a todos los endpoints existentes del backend.

**Architecture:** Tres rutas nuevas (stepper alta, detalle con tabs, catálogo) sobre el feature existente `features/sucursales`. NgRx classic con el store `sucursal.*` extendido a los sub-recursos. Cada sub-recurso es su propio HTTP service con CRUD (`branch-schedule`, `branch-contact`, `branch-workspace`, `branch-totem-config`, `section`). Tests con vitest (reducers + effects). UI con PrimeNG (`p-stepper`, `p-tabView`, `p-table`).

**Tech Stack:** Angular 21, NgRx classic, signals, PrimeNG 21, RxJS, vitest, jsdom.

---

## Convenciones a respetar

- **NgRx classic**: `createAction` + `createReducer`. Pessimistic mutations. `selectSignal` en componentes.
- **Angular**: standalone components, OnPush, signals, `inject()`.
- **Files**: `features/<m>/{models,services,store,pages,components}`.
- **Commits**: convencional commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`). NO `--no-verify`.
- **TDD**: tests primero para reducers, effects, mappers. Componentes UI puede ser implementación primero (visual feedback).

---

## File Structure

### Files nuevos

**Models:**
- `src/app/features/sucursales/models/branch-schedule.model.ts`
- `src/app/features/sucursales/models/branch-contact.model.ts`
- `src/app/features/sucursales/models/branch-workspace.model.ts`
- `src/app/features/sucursales/models/section.model.ts`
- (Existente: `branch-totem-config.model.ts`)

**Services:**
- `src/app/features/sucursales/services/branch-schedule.service.ts`
- `src/app/features/sucursales/services/branch-contact.service.ts`
- `src/app/features/sucursales/services/branch-workspace.service.ts`
- `src/app/features/sucursales/services/branch-totem-config.service.ts` (extraer del actual `sucursales.service.ts`)
- `src/app/features/sucursales/services/section.service.ts`
- `src/app/features/sucursales/services/area.service.ts`

**Store extensiones** (sobre el feature `sucursal.*`):
- Acciones nuevas en `sucursal.actions.ts`
- Effects nuevos en `sucursal.effects.ts`
- Selectores en `sucursal.selectors.ts`
- Estado en `sucursal.state.ts`

**Pages nuevas:**
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/sucursal-detalle.page.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/datos-tab.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/horarios-tab.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/contactos-tab.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/workspaces-tab.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/totem-tab.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/catalogo/sucursales-catalogo.page.{ts,html,scss}`
- `src/app/features/sucursales/pages/catalogo/components/areas-panel.component.{ts,html,scss}`
- `src/app/features/sucursales/pages/catalogo/components/sections-panel.component.{ts,html,scss}`

### Files modificados

- `src/app/features/sucursales/sucursales.routes.ts` — agregar rutas `nueva`, `:id`, `catalogo`. Remover `areas`.
- `src/app/features/sucursales/pages/configuracion/sucursales-configuracion.component.ts` — click fila navega a `:id`. Botón "Nueva" navega a `nueva` (no abre modal).
- `src/app/features/sucursales/services/sucursales.service.ts` — agregar `getById`, `update`. Migrar a `/api/v1/sucursales/branches`. Mantener compat con código existente.
- `src/app/features/sucursales/models/sucursal.model.ts` — actualizar interface `Area` para reflejar backend (`name`, `areaType`, etc.). Renombrar el actual a `LegacyArea` o eliminar.
- `src/app/layout/sidebar/sidebar.nav.ts` — agregar item "Catálogo" bajo Sucursales.

### Files eliminados

- `src/app/features/sucursales/components/sucursal-form-modal.component.ts` (reemplazado por stepper)
- `src/app/features/sucursales/pages/areas/areas.component.ts` (mergeado en catálogo)
- Store legacy `sucursales.{actions,effects,reducer,selectors,state}.ts` (plural) si todavía existe sin uso.

---

# FASE 1 — Foundations (models + services)

## Task 1: Models de los sub-recursos

**Files:**
- Create: `src/app/features/sucursales/models/branch-schedule.model.ts`
- Create: `src/app/features/sucursales/models/branch-contact.model.ts`
- Create: `src/app/features/sucursales/models/branch-workspace.model.ts`
- Create: `src/app/features/sucursales/models/section.model.ts`
- Modify: `src/app/features/sucursales/models/sucursal.model.ts` (actualizar `Area`)

- [ ] **Step 1: Crear `branch-schedule.model.ts`**

```ts
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type ScheduleType = 'REGULAR' | 'EXTENDED' | 'EMERGENCY' | 'CUSTOM';
// Confirmar contra backend si los valores difieren — backend usa `ScheduleType` enum

export interface BranchSchedule {
  id: number;
  branchId: number;
  dayFrom: DayOfWeek;
  dayTo: DayOfWeek;
  fromTime: string;   // 'HH:mm'
  toTime: string;     // 'HH:mm'
  scheduleType: ScheduleType;
  active: boolean;
}

export interface BranchScheduleCreateInput {
  dayFrom: DayOfWeek;
  dayTo: DayOfWeek;
  fromTime: string;
  toTime: string;
  scheduleType: ScheduleType;
}
```

- [ ] **Step 2: Crear `branch-contact.model.ts`**

```ts
export type ContactType = 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';

export interface BranchContact {
  id: number;
  branchId: number;
  contactType: ContactType;
  value: string;
  active: boolean;
}

export interface BranchContactCreateInput {
  contactType: ContactType;
  value: string;
}
```

- [ ] **Step 3: Crear `branch-workspace.model.ts`**

```ts
export interface BranchWorkspace {
  id: number;
  branchId: number;
  areaId: number;
  sectionId: number;
}

export interface BranchWorkspaceCreateInput {
  areaId: number;
  sectionId: number;
}
```

- [ ] **Step 4: Crear `section.model.ts`**

```ts
export interface Section {
  id: number;
  name: string;
  areaId: number;
  active: boolean;
}

export interface SectionCreateInput {
  name: string;
  areaId: number;
}
```

- [ ] **Step 5: Actualizar `Area` en `sucursal.model.ts`**

Reemplazar la interface existente:

```ts
export type AreaType = 'INTERNO' | 'EXTERNO' | 'MIXTO';
// Confirmar valores contra `AreaType.java` en backend antes de implementar

export interface Area {
  id: number;
  name: string;
  areaType: AreaType;
  externalLabName: string | null;
  active: boolean;
}

export interface AreaCreateInput {
  name: string;
  areaType: AreaType;
  externalLabName?: string | null;
}
```

Si hay imports de la versión legacy (`id: string`, `nombre: string`, `sucursalId: string`) en otros archivos, actualizarlos o agregar TODO comment.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/sucursales/models/
git commit -m "feat(sucursales): add models for sub-recursos (schedule, contact, workspace, section, area)"
```

---

## Task 2: HTTP services de sub-recursos

**Files:**
- Create: `src/app/features/sucursales/services/branch-schedule.service.ts`
- Create: `src/app/features/sucursales/services/branch-contact.service.ts`
- Create: `src/app/features/sucursales/services/branch-workspace.service.ts`
- Create: `src/app/features/sucursales/services/branch-totem-config.service.ts`
- Create: `src/app/features/sucursales/services/section.service.ts`
- Create: `src/app/features/sucursales/services/area.service.ts`
- Test: `*.service.spec.ts` para cada uno (vitest)

- [ ] **Step 1: Crear `BranchScheduleService`**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchSchedule, BranchScheduleCreateInput } from '../models/branch-schedule.model';

@Injectable({ providedIn: 'root' })
export class BranchScheduleService {
  private readonly http = inject(HttpClient);
  private base(branchId: number) {
    return `/api/v1/sucursales/branches/${branchId}/schedules`;
  }

  list(branchId: number): Observable<BranchSchedule[]> {
    return this.http.get<BranchSchedule[]>(this.base(branchId));
  }

  create(branchId: number, input: BranchScheduleCreateInput): Observable<BranchSchedule> {
    return this.http.post<BranchSchedule>(this.base(branchId), input);
  }

  update(branchId: number, id: number, input: BranchScheduleCreateInput): Observable<BranchSchedule> {
    return this.http.put<BranchSchedule>(`${this.base(branchId)}/${id}`, input);
  }

  delete(branchId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(branchId)}/${id}`);
  }
}
```

- [ ] **Step 2: Test del service**

`branch-schedule.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BranchScheduleService } from './branch-schedule.service';

describe('BranchScheduleService', () => {
  let service: BranchScheduleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BranchScheduleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('list calls GET on branches/{id}/schedules', () => {
    service.list(7).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('create posts the input body', () => {
    const input = { dayFrom: 'MONDAY', dayTo: 'FRIDAY', fromTime: '09:00', toTime: '17:00', scheduleType: 'REGULAR' } as const;
    service.create(7, input).subscribe();
    const req = httpMock.expectOne('/api/v1/sucursales/branches/7/schedules');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({ id: 1, branchId: 7, ...input, active: true });
  });
});
```

- [ ] **Step 3: Run test** → `npx vitest run branch-schedule.service.spec` → debe pasar.

- [ ] **Step 4: Repetir patrón para los otros services**

Crear `BranchContactService`, `BranchWorkspaceService`, `BranchTotemConfigService`, `SectionService`, `AreaService` con la misma estructura. Endpoints:

| Service | Base path |
|---|---|
| `BranchScheduleService` | `/api/v1/sucursales/branches/{id}/schedules` |
| `BranchContactService` | `/api/v1/sucursales/branches/{id}/contacts` |
| `BranchWorkspaceService` | `/api/v1/sucursales/branches/{id}/workspaces` |
| `BranchTotemConfigService` | `/api/v1/sucursales/branches/{id}/totem-config` (GET + PUT, sin POST/DELETE — es upsert) |
| `SectionService` | `/api/v1/sucursales/sections` (CRUD; filtrable por areaId) |
| `AreaService` | `/api/v1/sucursales/areas` (CRUD) |

Test mínimo por cada uno: 1 GET + 1 POST verificando URL y body.

- [ ] **Step 5: Migrar `getTotemConfig` y `updateTotemConfig` fuera de `SucursalesService`**

En `sucursales.service.ts` actual hay `getTotemConfig` y `updateTotemConfig`. Moverlas a `BranchTotemConfigService`. Hacer grep + actualizar imports.

```bash
# verificar callers actuales
grep -rn "getTotemConfig\|updateTotemConfig" src/
```

Actualizar imports en `recepcion.page.ts` y store `branch-totem-config/branch-totem-config.effects.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/sucursales/services/
git commit -m "feat(sucursales): add HTTP services for sub-recursos + extract totem-config service"
```

---

## Task 3: Extender el store NgRx `sucursal.*`

**Files:**
- Modify: `src/app/features/sucursales/store/sucursal.state.ts`
- Modify: `src/app/features/sucursales/store/sucursal.actions.ts`
- Modify: `src/app/features/sucursales/store/sucursal.reducer.ts`
- Modify: `src/app/features/sucursales/store/sucursal.effects.ts`
- Modify: `src/app/features/sucursales/store/sucursal.selectors.ts`
- Test: `sucursal.reducer.spec.ts`, `sucursal.effects.spec.ts` (extender existentes o crear)

- [ ] **Step 1: Extender el state**

```ts
// sucursal.state.ts
import { Sucursal, Area } from '../models/sucursal.model';
import { BranchSchedule } from '../models/branch-schedule.model';
import { BranchContact } from '../models/branch-contact.model';
import { BranchWorkspace } from '../models/branch-workspace.model';
import { BranchTotemConfig } from '../models/branch-totem-config.model';
import { Section } from '../models/section.model';

export const SUCURSAL_FEATURE_KEY = 'sucursal';

export interface SucursalState {
  list: Sucursal[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  // NEW — detalle
  current: Sucursal | null;
  loadingDetail: boolean;
  schedules: BranchSchedule[];
  contacts: BranchContact[];
  workspaces: BranchWorkspace[];
  totemConfig: BranchTotemConfig | null;

  // NEW — catálogo
  areas: Area[];
  sections: Section[];
  loadingCatalog: boolean;
}

export const initialSucursalState: SucursalState = {
  list: [],
  loading: false,
  saving: false,
  error: null,
  current: null,
  loadingDetail: false,
  schedules: [],
  contacts: [],
  workspaces: [],
  totemConfig: null,
  areas: [],
  sections: [],
  loadingCatalog: false,
};
```

- [ ] **Step 2: Agregar acciones**

```ts
// sucursal.actions.ts — agregar al final

// === Detail ===
export const loadDetail = createAction('[Sucursal] Load Detail', props<{ branchId: number }>());
export const loadDetailSuccess = createAction(
  '[Sucursal] Load Detail Success',
  props<{
    branch: Sucursal;
    schedules: BranchSchedule[];
    contacts: BranchContact[];
    workspaces: BranchWorkspace[];
    totemConfig: BranchTotemConfig | null;
  }>(),
);
export const loadDetailFailure = createAction('[Sucursal] Load Detail Failure', props<{ error: string }>());

// === Schedules ===
export const addSchedule = createAction('[Sucursal] Add Schedule', props<{ branchId: number; input: BranchScheduleCreateInput }>());
export const addScheduleSuccess = createAction('[Sucursal] Add Schedule Success', props<{ schedule: BranchSchedule }>());
export const addScheduleFailure = createAction('[Sucursal] Add Schedule Failure', props<{ error: string }>());

export const updateSchedule = createAction('[Sucursal] Update Schedule', props<{ branchId: number; id: number; input: BranchScheduleCreateInput }>());
export const updateScheduleSuccess = createAction('[Sucursal] Update Schedule Success', props<{ schedule: BranchSchedule }>());
export const updateScheduleFailure = createAction('[Sucursal] Update Schedule Failure', props<{ error: string }>());

export const deleteSchedule = createAction('[Sucursal] Delete Schedule', props<{ branchId: number; id: number }>());
export const deleteScheduleSuccess = createAction('[Sucursal] Delete Schedule Success', props<{ id: number }>());
export const deleteScheduleFailure = createAction('[Sucursal] Delete Schedule Failure', props<{ error: string }>());

// === Contacts === (mismo patrón add/update/delete)
// === Workspaces === (mismo patrón)
// === Tótem config === (upsertTotemConfig + Success/Failure)
// === Areas catálogo === (load + add + update + delete con Success/Failure)
// === Sections catálogo === (mismo patrón, filtrado por areaId)
```

(Repetir el patrón triada `Action / Success / Failure` para cada sub-recurso. ~30 acciones nuevas en total.)

- [ ] **Step 3: Extender el reducer (pessimistic mutations)**

```ts
// sucursal.reducer.ts — agregar handlers
on(loadDetail, (state) => ({ ...state, loadingDetail: true, error: null })),
on(loadDetailSuccess, (state, { branch, schedules, contacts, workspaces, totemConfig }) => ({
  ...state,
  loadingDetail: false,
  current: branch,
  schedules,
  contacts,
  workspaces,
  totemConfig,
})),
on(loadDetailFailure, (state, { error }) => ({ ...state, loadingDetail: false, error })),

on(addScheduleSuccess, (state, { schedule }) => ({ ...state, schedules: [...state.schedules, schedule] })),
on(updateScheduleSuccess, (state, { schedule }) => ({
  ...state,
  schedules: state.schedules.map(s => s.id === schedule.id ? schedule : s),
})),
on(deleteScheduleSuccess, (state, { id }) => ({
  ...state,
  schedules: state.schedules.filter(s => s.id !== id),
})),
// ... idem para contacts, workspaces, areas, sections, totemConfig
```

- [ ] **Step 4: Extender effects**

```ts
// sucursal.effects.ts — agregar
loadDetail$ = createEffect(() => this.actions$.pipe(
  ofType(loadDetail),
  switchMap(({ branchId }) => forkJoin({
    branch: this.sucursalesService.getById(branchId),
    schedules: this.scheduleService.list(branchId),
    contacts: this.contactService.list(branchId),
    workspaces: this.workspaceService.list(branchId),
    totemConfig: this.totemService.get(branchId).pipe(catchError(() => of(null))),
  }).pipe(
    map(result => loadDetailSuccess(result)),
    catchError(err => of(loadDetailFailure({ error: this.errorMessage(err) }))),
  )),
));

addSchedule$ = createEffect(() => this.actions$.pipe(
  ofType(addSchedule),
  mergeMap(({ branchId, input }) => this.scheduleService.create(branchId, input).pipe(
    map(schedule => addScheduleSuccess({ schedule })),
    catchError(err => of(addScheduleFailure({ error: this.errorMessage(err) }))),
  )),
));
// ... idem para update/delete y los otros sub-recursos
```

- [ ] **Step 5: Selectores**

```ts
// sucursal.selectors.ts — agregar
export const selectCurrentSucursal = createSelector(selectSucursalFeature, s => s.current);
export const selectSchedules = createSelector(selectSucursalFeature, s => s.schedules);
export const selectContacts = createSelector(selectSucursalFeature, s => s.contacts);
export const selectWorkspaces = createSelector(selectSucursalFeature, s => s.workspaces);
export const selectTotemConfig = createSelector(selectSucursalFeature, s => s.totemConfig);
export const selectAreas = createSelector(selectSucursalFeature, s => s.areas);
export const selectSections = createSelector(selectSucursalFeature, s => s.sections);
export const selectSectionsByArea = (areaId: number) => createSelector(
  selectSections,
  sections => sections.filter(sc => sc.areaId === areaId),
);
```

- [ ] **Step 6: Tests del reducer**

`sucursal.reducer.spec.ts` — agregar tests por cada nueva acción:

```ts
describe('addScheduleSuccess', () => {
  it('appends the schedule to state.schedules', () => {
    const initial = { ...initialSucursalState, schedules: [] };
    const schedule: BranchSchedule = { id: 1, branchId: 7, dayFrom: 'MONDAY', dayTo: 'FRIDAY', fromTime: '09:00', toTime: '17:00', scheduleType: 'REGULAR', active: true };
    const state = sucursalReducer(initial, addScheduleSuccess({ schedule }));
    expect(state.schedules).toEqual([schedule]);
  });
});

describe('deleteScheduleSuccess', () => {
  it('removes the schedule by id', () => {
    const s1 = { id: 1 } as BranchSchedule;
    const s2 = { id: 2 } as BranchSchedule;
    const initial = { ...initialSucursalState, schedules: [s1, s2] };
    const state = sucursalReducer(initial, deleteScheduleSuccess({ id: 1 }));
    expect(state.schedules).toEqual([s2]);
  });
});
```

- [ ] **Step 7: Run tests + Commit**

```bash
npx vitest run sucursal.reducer.spec
git add src/app/features/sucursales/store/
git commit -m "feat(sucursales): extend sucursal store with sub-recursos and catálogo"
```

---

# FASE 2 — Catálogo de Áreas y Secciones

## Task 4: SucursalesCatalogoPage shell

**Files:**
- Create: `src/app/features/sucursales/pages/catalogo/sucursales-catalogo.page.{ts,html,scss}`
- Modify: `src/app/features/sucursales/sucursales.routes.ts`

- [ ] **Step 1: Component shell**

```ts
// sucursales-catalogo.page.ts
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { AreasPanelComponent } from './components/areas-panel.component';
import { SectionsPanelComponent } from './components/sections-panel.component';
import { loadAreas } from '../../store/sucursal.actions';

@Component({
  selector: 'app-sucursales-catalogo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardModule, ButtonModule, AreasPanelComponent, SectionsPanelComponent],
  templateUrl: './sucursales-catalogo.page.html',
  styleUrl: './sucursales-catalogo.page.scss',
})
export class SucursalesCatalogoPage implements OnInit {
  private store = inject(Store);

  ngOnInit() {
    this.store.dispatch(loadAreas());
  }
}
```

- [ ] **Step 2: Template grid 2-paneles**

```html
<!-- sucursales-catalogo.page.html -->
<div class="catalogo-page">
  <header>
    <h1>Catálogo de Áreas y Secciones</h1>
    <p class="muted">Configurá las áreas y secciones del tenant. Cada sucursal podrá vincular sus workspaces a estas entradas.</p>
  </header>

  <div class="grid-2">
    <app-areas-panel />
    <app-sections-panel />
  </div>
</div>
```

```scss
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Agregar ruta**

```ts
// sucursales.routes.ts
{
  path: 'catalogo',
  canMatch: [roleGuard('ADMINISTRADOR')],
  loadComponent: () => import('./pages/catalogo/sucursales-catalogo.page').then(m => m.SucursalesCatalogoPage),
  providers: [
    provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
    provideEffects([SucursalEffects]),
    MessageService,
    ConfirmationService,
  ],
},
```

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/catalogo/sucursales-catalogo.page.* src/app/features/sucursales/sucursales.routes.ts
git commit -m "feat(sucursales): catálogo page shell with 2-panel grid"
```

---

## Task 5: AreasPanelComponent (CRUD áreas)

**Files:**
- Create: `src/app/features/sucursales/pages/catalogo/components/areas-panel.component.{ts,html,scss}`

- [ ] **Step 1: Component con lista + alta + edit + delete**

```ts
import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { selectAreas } from '../../../store/sucursal.selectors';
import { addArea, updateArea, deleteArea, selectAreaForSections } from '../../../store/sucursal.actions';
import { Area, AreaType } from '../../../models/sucursal.model';

const AREA_TYPE_OPTIONS = [
  { label: 'Interno', value: 'INTERNO' },
  { label: 'Externo', value: 'EXTERNO' },
  { label: 'Mixto', value: 'MIXTO' },
];

@Component({
  selector: 'app-areas-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableModule, ButtonModule, DialogModule, InputTextModule, SelectModule, ReactiveFormsModule, ConfirmDialogModule],
  templateUrl: './areas-panel.component.html',
  styleUrl: './areas-panel.component.scss',
})
export class AreasPanelComponent {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);

  protected readonly areas = this.store.selectSignal(selectAreas);
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Area | null>(null);
  protected readonly typeOptions = AREA_TYPE_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    areaType: ['INTERNO' as AreaType, Validators.required],
    externalLabName: [''],
  });

  openNew() {
    this.editing.set(null);
    this.form.reset({ name: '', areaType: 'INTERNO', externalLabName: '' });
    this.dialogVisible.set(true);
  }

  openEdit(area: Area) {
    this.editing.set(area);
    this.form.patchValue({ name: area.name, areaType: area.areaType, externalLabName: area.externalLabName ?? '' });
    this.dialogVisible.set(true);
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const input = {
      name: raw.name.trim(),
      areaType: raw.areaType,
      externalLabName: raw.areaType === 'EXTERNO' ? raw.externalLabName.trim() : null,
    };
    const e = this.editing();
    if (e) this.store.dispatch(updateArea({ id: e.id, input }));
    else this.store.dispatch(addArea({ input }));
    this.dialogVisible.set(false);
  }

  remove(area: Area) {
    this.confirm.confirm({
      message: `¿Eliminar el área "${area.name}"? Se conservará el histórico (soft-delete).`,
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.store.dispatch(deleteArea({ id: area.id })),
    });
  }

  selectForSections(area: Area) {
    this.store.dispatch(selectAreaForSections({ areaId: area.id }));
  }
}
```

- [ ] **Step 2: Template**

```html
<div class="panel">
  <div class="panel-header">
    <h2>Áreas</h2>
    <p-button label="Nueva área" icon="pi pi-plus" (click)="openNew()" />
  </div>

  <p-table [value]="areas()" dataKey="id" [scrollable]="true" scrollHeight="500px">
    <ng-template pTemplate="header">
      <tr><th>Nombre</th><th>Tipo</th><th style="width:8rem"></th></tr>
    </ng-template>
    <ng-template pTemplate="body" let-area>
      <tr (click)="selectForSections(area)" class="row-selectable">
        <td>{{ area.name }}</td>
        <td>{{ area.areaType }}</td>
        <td>
          <p-button icon="pi pi-pencil" [text]="true" (click)="$event.stopPropagation(); openEdit(area)" />
          <p-button icon="pi pi-trash" [text]="true" severity="danger" (click)="$event.stopPropagation(); remove(area)" />
        </td>
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr><td colspan="3" class="muted">Sin áreas cargadas. Creá la primera para empezar.</td></tr>
    </ng-template>
  </p-table>

  <p-dialog [(visible)]="dialogVisible" [modal]="true" [header]="editing() ? 'Editar área' : 'Nueva área'">
    <form [formGroup]="form" (ngSubmit)="submit()" class="dialog-form">
      <div class="form-field">
        <label>Nombre *</label>
        <input pInputText formControlName="name" placeholder="Ej: Hematología" />
      </div>
      <div class="form-field">
        <label>Tipo *</label>
        <p-select formControlName="areaType" [options]="typeOptions" optionLabel="label" optionValue="value" />
      </div>
      @if (form.value.areaType === 'EXTERNO') {
        <div class="form-field">
          <label>Lab externo *</label>
          <input pInputText formControlName="externalLabName" placeholder="Nombre del laboratorio externo" />
        </div>
      }
      <div class="dialog-actions">
        <p-button label="Cancelar" severity="secondary" (click)="dialogVisible.set(false)" />
        <p-button label="Guardar" type="submit" [disabled]="form.invalid" />
      </div>
    </form>
  </p-dialog>

  <p-confirmDialog />
</div>
```

- [ ] **Step 3: Estilos básicos**

```scss
.panel { padding: 1rem; background: var(--surface-card); border-radius: 8px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.row-selectable { cursor: pointer; }
.row-selectable:hover { background: var(--surface-hover); }
.dialog-form { display: flex; flex-direction: column; gap: 1rem; min-width: 24rem; }
.form-field { display: flex; flex-direction: column; gap: 0.25rem; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.muted { color: var(--text-color-secondary); }
```

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/catalogo/components/areas-panel.component.*
git commit -m "feat(sucursales): areas panel with CRUD via dialog form"
```

---

## Task 6: SectionsPanelComponent (CRUD secciones de área seleccionada)

**Files:**
- Create: `src/app/features/sucursales/pages/catalogo/components/sections-panel.component.{ts,html,scss}`

- [ ] **Step 1: Component que lee `selectedAreaId` del store**

Sigue el mismo patrón que `AreasPanelComponent` pero:
- Selecciona `selectedAreaId` del store (acción `selectAreaForSections` lo seteó).
- Las sections se filtran por ese areaId via `selectSectionsByArea`.
- El form tiene solo `name` (areaId viene del area seleccionada).
- Si no hay area seleccionada, muestra estado vacío "Seleccioná un área en el panel izquierdo".

```ts
@Component({
  selector: 'app-sections-panel',
  // ... imports y boilerplate similares a areas-panel
})
export class SectionsPanelComponent {
  private store = inject(Store);
  private fb = inject(FormBuilder);
  private confirm = inject(ConfirmationService);

  protected readonly selectedAreaId = this.store.selectSignal(selectSelectedAreaId);
  protected readonly sections = computed(() => {
    const areaId = this.selectedAreaId();
    return areaId ? this.allSections().filter(s => s.areaId === areaId) : [];
  });
  protected readonly allSections = this.store.selectSignal(selectSections);
  protected readonly dialogVisible = signal(false);
  protected readonly editing = signal<Section | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
  });

  // ... openNew, openEdit, submit, remove
}
```

- [ ] **Step 2: Agregar selector `selectSelectedAreaId` al store**

```ts
// sucursal.state.ts
selectedAreaId: number | null;

// sucursal.selectors.ts
export const selectSelectedAreaId = createSelector(selectSucursalFeature, s => s.selectedAreaId);

// sucursal.reducer.ts
on(selectAreaForSections, (state, { areaId }) => ({ ...state, selectedAreaId: areaId })),

// sucursal.actions.ts
export const selectAreaForSections = createAction('[Sucursal] Select Area For Sections', props<{ areaId: number }>());
```

- [ ] **Step 3: Template + estado vacío**

```html
<div class="panel">
  <div class="panel-header">
    <h2>Secciones {{ selectedAreaId() ? '(área seleccionada)' : '' }}</h2>
    <p-button label="Nueva sección" icon="pi pi-plus" (click)="openNew()" [disabled]="!selectedAreaId()" />
  </div>

  @if (!selectedAreaId()) {
    <div class="empty-state">
      <p class="muted">Seleccioná un área en el panel izquierdo para ver y editar sus secciones.</p>
    </div>
  } @else {
    <p-table [value]="sections()">
      <!-- columnas nombre + acciones -->
    </p-table>
  }

  <p-dialog [(visible)]="dialogVisible">
    <!-- form solo con name -->
  </p-dialog>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/catalogo/components/sections-panel.component.* src/app/features/sucursales/store/
git commit -m "feat(sucursales): sections panel filtered by selected area"
```

---

# FASE 3 — Stepper de alta de sucursal

## Task 7: SucursalAltaStepperPage shell

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.{ts,html,scss}`
- Modify: `src/app/features/sucursales/sucursales.routes.ts`

- [ ] **Step 1: Component shell con step state**

```ts
@Component({
  selector: 'app-sucursal-alta-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StepperModule, ButtonModule,
    DatosStepComponent, HorariosStepComponent, ContactosStepComponent,
    WorkspacesStepComponent, TotemStepComponent, ConfirmarStepComponent,
    ToastModule,
  ],
  templateUrl: './sucursal-alta-stepper.page.html',
  styleUrl: './sucursal-alta-stepper.page.scss',
  providers: [MessageService],
})
export class SucursalAltaStepperPage {
  private router = inject(Router);
  private store = inject(Store);

  protected readonly currentStep = signal(1);
  protected readonly branchId = signal<number | null>(null);  // se setea tras step 1

  protected readonly STEPS = [
    { key: 'datos', label: 'Datos' },
    { key: 'horarios', label: 'Horarios' },
    { key: 'contactos', label: 'Contactos' },
    { key: 'workspaces', label: 'Workspaces' },
    { key: 'totem', label: 'Tótem' },
    { key: 'confirmar', label: 'Confirmar' },
  ];

  onDatosCompleted(branchId: number) {
    this.branchId.set(branchId);
    this.currentStep.set(2);
  }

  goToStep(step: number) {
    // Solo permite avanzar si branchId existe (steps >= 2)
    if (step > 1 && this.branchId() == null) return;
    this.currentStep.set(step);
  }

  finish() {
    const id = this.branchId();
    if (id != null) this.router.navigate(['/sucursales/configuracion', id]);
  }
}
```

- [ ] **Step 2: Template con PrimeNG stepper**

```html
<div class="alta-page">
  <header>
    <h1>Nueva sucursal</h1>
  </header>

  <p-stepper [(activeStep)]="currentStep" [linear]="false">
    @for (s of STEPS; track s.key; let i = $index) {
      <p-stepperPanel [header]="s.label">
        @switch (s.key) {
          @case ('datos') {
            <app-datos-step (completed)="onDatosCompleted($event)" />
          }
          @case ('horarios') {
            <app-horarios-step [branchId]="branchId()!" (next)="goToStep(3)" (back)="goToStep(1)" />
          }
          @case ('contactos') {
            <app-contactos-step [branchId]="branchId()!" (next)="goToStep(4)" (back)="goToStep(2)" />
          }
          @case ('workspaces') {
            <app-workspaces-step [branchId]="branchId()!" (next)="goToStep(5)" (back)="goToStep(3)" />
          }
          @case ('totem') {
            <app-totem-step [branchId]="branchId()!" (next)="goToStep(6)" (back)="goToStep(4)" />
          }
          @case ('confirmar') {
            <app-confirmar-step [branchId]="branchId()!" (finish)="finish()" (back)="goToStep(5)" />
          }
        }
      </p-stepperPanel>
    }
  </p-stepper>

  <p-toast />
</div>
```

- [ ] **Step 3: Agregar ruta**

```ts
// sucursales.routes.ts
{
  path: 'configuracion/nueva',
  canMatch: [roleGuard('ADMINISTRADOR')],
  loadComponent: () => import('./pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page').then(m => m.SucursalAltaStepperPage),
  providers: [provideState(SUCURSAL_FEATURE_KEY, sucursalReducer), provideEffects([SucursalEffects]), MessageService],
},
```

- [ ] **Step 4: Commit (sin steps todavía — están en tasks 8-13)**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/ src/app/features/sucursales/sucursales.routes.ts
git commit -m "feat(sucursales): alta stepper page shell with 6 steps"
```

---

## Task 8: Step 1 — Datos

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.{ts,html,scss}`

- [ ] **Step 1: Component con form base + emit branchId**

```ts
@Component({
  selector: 'app-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, ButtonModule, SelectModule],
  template: `...`,
  styleUrl: './datos-step.component.scss',
})
export class DatosStepComponent {
  private fb = inject(FormBuilder);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  @Output() completed = new EventEmitter<number>();

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    description: ['', [Validators.required, Validators.maxLength(120)]],
    status: ['ACTIVE' as SucursalStatus, Validators.required],
    address: this.fb.group({
      street: [''], streetNumber: [''], city: [''], province: [''], postalCode: [''],
    }),
  });

  submit() {
    if (this.form.invalid) return;
    const input = this.form.getRawValue() as SucursalCreateInput;
    this.store.dispatch(addSucursal({ input }));

    // Wait for success → emit branchId
    this.actions$.pipe(
      ofType(addSucursalSuccess),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ sucursal }) => {
      this.messageService.add({ severity: 'success', summary: 'Sucursal creada', detail: sucursal.code });
      this.completed.emit(sucursal.id);
    });
  }
}
```

- [ ] **Step 2: Template** — form con campos code/description/status + sub-form address + botón "Siguiente" que llama `submit()`.

- [ ] **Step 3: Validar que `addSucursal` action y `addSucursalSuccess` existan en el store**

Si no existen (porque el store legacy `sucursales.actions.ts` los tiene pero el nuevo `sucursal.actions.ts` no), agregarlos al `sucursal.actions.ts` y al reducer + effects.

```ts
// sucursal.actions.ts
export const addSucursal = createAction('[Sucursal] Add', props<{ input: SucursalCreateInput }>());
export const addSucursalSuccess = createAction('[Sucursal] Add Success', props<{ sucursal: Sucursal }>());
export const addSucursalFailure = createAction('[Sucursal] Add Failure', props<{ error: string }>());

// sucursal.effects.ts
addSucursal$ = createEffect(() => this.actions$.pipe(
  ofType(addSucursal),
  mergeMap(({ input }) => this.sucursalesService.create(input).pipe(
    map(sucursal => addSucursalSuccess({ sucursal })),
    catchError(err => of(addSucursalFailure({ error: this.errorMessage(err) }))),
  )),
));
```

- [ ] **Step 4: Test del effect**

```ts
it('addSucursal$ dispatches addSucursalSuccess on HTTP success', () => {
  const input = { code: 'SUC-01', description: 'Test', status: 'ACTIVE' } as SucursalCreateInput;
  const sucursal = { id: 7, ...input } as Sucursal;
  service.create = vi.fn().mockReturnValue(of(sucursal));
  actions$ = of(addSucursal({ input }));
  effects.addSucursal$.subscribe(action => {
    expect(action).toEqual(addSucursalSuccess({ sucursal }));
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/datos-step.component.* src/app/features/sucursales/store/
git commit -m "feat(sucursales): alta stepper step 1 - datos with branch create"
```

---

## Task 9: Step 2 — Horarios

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.{ts,html,scss}`

- [ ] **Step 1: Component con lista + alta inline + delete**

```ts
@Component({
  selector: 'app-horarios-step',
  // ...
})
export class HorariosStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);
  private fb = inject(FormBuilder);

  protected readonly schedules = this.store.selectSignal(selectSchedules);
  protected readonly dayOptions = [
    { label: 'Lunes', value: 'MONDAY' }, { label: 'Martes', value: 'TUESDAY' },
    { label: 'Miércoles', value: 'WEDNESDAY' }, { label: 'Jueves', value: 'THURSDAY' },
    { label: 'Viernes', value: 'FRIDAY' }, { label: 'Sábado', value: 'SATURDAY' },
    { label: 'Domingo', value: 'SUNDAY' },
  ];
  protected readonly typeOptions = [
    { label: 'Regular', value: 'REGULAR' }, { label: 'Extendido', value: 'EXTENDED' },
    { label: 'Emergencia', value: 'EMERGENCY' }, { label: 'Personalizado', value: 'CUSTOM' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    dayFrom: ['MONDAY' as DayOfWeek, Validators.required],
    dayTo: ['FRIDAY' as DayOfWeek, Validators.required],
    fromTime: ['09:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    toTime: ['17:00', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
    scheduleType: ['REGULAR' as ScheduleType, Validators.required],
  });

  ngOnInit() {
    this.store.dispatch(loadSchedules({ branchId: this.branchId }));
  }

  add() {
    if (this.form.invalid) return;
    this.store.dispatch(addSchedule({ branchId: this.branchId, input: this.form.getRawValue() }));
    this.form.reset({ dayFrom: 'MONDAY', dayTo: 'FRIDAY', fromTime: '09:00', toTime: '17:00', scheduleType: 'REGULAR' });
  }

  remove(id: number) {
    this.store.dispatch(deleteSchedule({ branchId: this.branchId, id }));
  }
}
```

- [ ] **Step 2: Template con form inline + tabla**

```html
<div class="step">
  <h2>Horarios de atención</h2>
  <p class="muted">Configurá los horarios de la sucursal. Podés agregar varios bloques.</p>

  <form [formGroup]="form" (ngSubmit)="add()" class="inline-form">
    <p-select formControlName="dayFrom" [options]="dayOptions" placeholder="Día desde" />
    <p-select formControlName="dayTo" [options]="dayOptions" placeholder="Día hasta" />
    <input pInputText type="time" formControlName="fromTime" />
    <input pInputText type="time" formControlName="toTime" />
    <p-select formControlName="scheduleType" [options]="typeOptions" placeholder="Tipo" />
    <p-button icon="pi pi-plus" type="submit" [disabled]="form.invalid" />
  </form>

  <p-table [value]="schedules()">
    <ng-template pTemplate="header">
      <tr><th>Días</th><th>Horario</th><th>Tipo</th><th></th></tr>
    </ng-template>
    <ng-template pTemplate="body" let-s>
      <tr>
        <td>{{ s.dayFrom }} – {{ s.dayTo }}</td>
        <td>{{ s.fromTime }} – {{ s.toTime }}</td>
        <td>{{ s.scheduleType }}</td>
        <td><p-button icon="pi pi-trash" [text]="true" severity="danger" (click)="remove(s.id)" /></td>
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr><td colspan="4" class="muted">Sin horarios. Agregá al menos uno (opcional pero recomendado).</td></tr>
    </ng-template>
  </p-table>

  <footer class="step-footer">
    <p-button label="Volver" severity="secondary" (click)="back.emit()" />
    <p-button label="Siguiente" (click)="next.emit()" />
  </footer>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/horarios-step.component.*
git commit -m "feat(sucursales): alta stepper step 2 - horarios"
```

---

## Task 10: Step 3 — Contactos

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/contactos-step.component.{ts,html,scss}`

- [ ] **Step 1: Mismo patrón que horarios** — form inline (contactType + value) + tabla + delete.

Tipos visibles: PHONE, MOBILE, EMAIL, WHATSAPP, FAX, WEBSITE.

Validación de `value`:
- EMAIL → `Validators.email`
- WEBSITE → `Validators.pattern(/^https?:\/\/.+/)`
- PHONE/MOBILE/WHATSAPP/FAX → regex numérico básico
- Mostrar mensaje según el tipo.

- [ ] **Step 2: Commit**

```bash
git add ...
git commit -m "feat(sucursales): alta stepper step 3 - contactos"
```

---

## Task 11: Step 4 — Workspaces

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.{ts,html,scss}`

- [ ] **Step 1: Component con dos selects (área + sección) + tabla + delete**

Carga áreas y secciones del store. Si no hay áreas: CTA "Primero crea áreas y secciones en el catálogo" con `routerLink` a `/sucursales/catalogo`.

```ts
protected readonly areas = this.store.selectSignal(selectAreas);
protected readonly sections = computed(() => {
  const areaId = this.form.controls.areaId.value;
  return areaId ? this.allSections().filter(s => s.areaId === areaId) : [];
});

ngOnInit() {
  this.store.dispatch(loadAreas());
  this.store.dispatch(loadSections());  // carga todas, filtra client-side
  this.store.dispatch(loadWorkspaces({ branchId: this.branchId }));
}
```

- [ ] **Step 2: Template con estado vacío**

```html
@if (areas().length === 0) {
  <div class="empty-state-cta">
    <p class="muted">No hay áreas cargadas. Necesitás crear áreas en el catálogo antes de configurar workspaces.</p>
    <p-button label="Ir al catálogo" icon="pi pi-external-link" routerLink="/sucursales/catalogo" />
    <p-button label="Saltar este paso" severity="secondary" (click)="next.emit()" />
  </div>
} @else {
  <form ...>
  <p-table ...>
}
```

- [ ] **Step 3: Commit**

```bash
git add ...
git commit -m "feat(sucursales): alta stepper step 4 - workspaces with empty-state CTA"
```

---

## Task 12: Step 5 — Tótem

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/totem-step.component.{ts,html,scss}`

- [ ] **Step 1: Component con switch único cableado al store**

```ts
@Component({
  selector: 'app-totem-step',
  // ...
  imports: [ToggleSwitchModule, ButtonModule, FormsModule],
})
export class TotemStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() next = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);
  protected enabled = signal(false);

  ngOnInit() {
    this.store.dispatch(loadTotemConfig({ branchId: this.branchId }));
  }

  onToggle(value: boolean) {
    this.enabled.set(value);
    this.store.dispatch(upsertTotemConfig({ branchId: this.branchId, enabled: value }));
  }
}
```

- [ ] **Step 2: Template**

```html
<div class="step">
  <h2>Tótem</h2>
  <p class="muted">Habilitá el tótem físico para que esta sucursal acepte walk-ins (pacientes sin turno previo). Si está deshabilitado, la pantalla de recepción muestra solo la lista de turnos pendientes.</p>

  <div class="big-switch">
    <p-toggleSwitch [(ngModel)]="enabled" (onChange)="onToggle($event.checked)" />
    <span class="switch-label">{{ enabled() ? 'Tótem habilitado' : 'Tótem deshabilitado' }}</span>
  </div>

  <footer class="step-footer">
    <p-button label="Volver" severity="secondary" (click)="back.emit()" />
    <p-button label="Siguiente" (click)="next.emit()" />
  </footer>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add ...
git commit -m "feat(sucursales): alta stepper step 5 - tótem toggle"
```

---

## Task 13: Step 6 — Confirmar

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/confirmar-step.component.{ts,html,scss}`

- [ ] **Step 1: Component read-only mostrando resumen**

```ts
@Component({
  selector: 'app-confirmar-step',
  // ...
})
export class ConfirmarStepComponent implements OnInit {
  @Input({ required: true }) branchId!: number;
  @Output() finish = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private store = inject(Store);

  protected current = this.store.selectSignal(selectCurrentSucursal);
  protected schedules = this.store.selectSignal(selectSchedules);
  protected contacts = this.store.selectSignal(selectContacts);
  protected workspaces = this.store.selectSignal(selectWorkspaces);
  protected totemConfig = this.store.selectSignal(selectTotemConfig);

  ngOnInit() {
    // Refresh para tener todos los sub-recursos sincronizados
    this.store.dispatch(loadDetail({ branchId: this.branchId }));
  }
}
```

- [ ] **Step 2: Template con cards de resumen**

Secciones colapsables (PrimeNG `p-accordion` o cards) mostrando datos base + horarios + contactos + workspaces + estado del tótem.

- [ ] **Step 3: Botón "Finalizar"** → emite `finish` → la página padre navega a `/sucursales/configuracion/:id`.

- [ ] **Step 4: Commit**

```bash
git add ...
git commit -m "feat(sucursales): alta stepper step 6 - confirmar with summary"
```

---

# FASE 4 — Detalle con tabs

## Task 14: SucursalDetallePage shell

**Files:**
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-detalle/sucursal-detalle.page.{ts,html,scss}`
- Modify: `src/app/features/sucursales/sucursales.routes.ts`

- [ ] **Step 1: Component con `p-tabView` y `:id` del route param**

```ts
@Component({
  selector: 'app-sucursal-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabViewModule, ButtonModule, DatosTabComponent, HorariosTabComponent, ContactosTabComponent, WorkspacesTabComponent, TotemTabComponent, ToastModule],
  templateUrl: './sucursal-detalle.page.html',
  styleUrl: './sucursal-detalle.page.scss',
  providers: [MessageService],
})
export class SucursalDetallePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);

  protected readonly branchId = signal<number | null>(null);
  protected readonly current = this.store.selectSignal(selectCurrentSucursal);
  protected readonly loading = this.store.selectSignal(selectLoadingDetail);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id) || id <= 0) {
      this.router.navigate(['/sucursales/configuracion']);
      return;
    }
    this.branchId.set(id);
    this.store.dispatch(loadDetail({ branchId: id }));
  }
}
```

- [ ] **Step 2: Template con tabs**

```html
<div class="detalle-page">
  <header>
    <p-button icon="pi pi-arrow-left" [text]="true" routerLink="/sucursales/configuracion" />
    <h1>{{ current()?.code }} — {{ current()?.description }}</h1>
  </header>

  @if (loading() && !current()) {
    <p>Cargando...</p>
  } @else if (branchId() != null) {
    <p-tabView>
      <p-tabPanel header="Datos">       <app-datos-tab [branchId]="branchId()!" /> </p-tabPanel>
      <p-tabPanel header="Horarios">    <app-horarios-tab [branchId]="branchId()!" /> </p-tabPanel>
      <p-tabPanel header="Contactos">   <app-contactos-tab [branchId]="branchId()!" /> </p-tabPanel>
      <p-tabPanel header="Workspaces">  <app-workspaces-tab [branchId]="branchId()!" /> </p-tabPanel>
      <p-tabPanel header="Tótem">       <app-totem-tab [branchId]="branchId()!" /> </p-tabPanel>
    </p-tabView>
  }

  <p-toast />
</div>
```

- [ ] **Step 3: Ruta**

```ts
{
  path: 'configuracion/:id',
  canMatch: [roleGuard('ADMINISTRADOR')],
  loadComponent: () => import('./pages/configuracion/sucursal-detalle/sucursal-detalle.page').then(m => m.SucursalDetallePage),
  providers: [provideState(SUCURSAL_FEATURE_KEY, sucursalReducer), provideEffects([SucursalEffects]), MessageService, ConfirmationService],
},
```

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursal-detalle/sucursal-detalle.page.* src/app/features/sucursales/sucursales.routes.ts
git commit -m "feat(sucursales): detalle page with tabs shell"
```

---

## Task 15-19: Tabs de detalle (Datos, Horarios, Contactos, Workspaces, Tótem)

**Cada tab reutiliza la estructura del step correspondiente (formularios + listas)** pero:
- Sin botones "Volver" / "Siguiente" (edición libre).
- En el caso de "Datos": form pre-llenado con `current` del store + botón "Guardar" que dispara `updateSucursal`.

Para cada tab, el procedimiento es el mismo:

### Task 15 (Datos), 16 (Horarios), 17 (Contactos), 18 (Workspaces), 19 (Tótem)

**Files** (por cada tab):
- Create: `src/app/features/sucursales/pages/configuracion/sucursal-detalle/tabs/<nombre>-tab.component.{ts,html,scss}`

- [ ] **Step 1: Copiar la estructura del step equivalente, removiendo navegación entre steps.**

Importar componentes/lógica de `*-step.component.ts` cuando aplique — extraer a helpers compartidos si hay duplicación de templates significativa (DRY).

- [ ] **Step 2: Para `DatosTab` específicamente**, agregar `updateSucursal` action al store.

```ts
// sucursal.actions.ts
export const updateSucursal = createAction('[Sucursal] Update', props<{ id: number; input: SucursalUpdateInput }>());
export const updateSucursalSuccess = createAction('[Sucursal] Update Success', props<{ sucursal: Sucursal }>());
export const updateSucursalFailure = createAction('[Sucursal] Update Failure', props<{ error: string }>());
```

- [ ] **Step 3: Commit por cada tab**

```bash
git add ...
git commit -m "feat(sucursales): detalle tab N"
```

(5 commits, uno por tab)

---

# FASE 5 — Wiring + cleanup

## Task 20: Lista navega a detalle

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursales-configuracion.component.ts`

- [ ] **Step 1: Reemplazar el modal por navegación**

```ts
openNew() {
  this.router.navigate(['/sucursales/configuracion/nueva']);
}

openDetail(sucursal: Sucursal) {
  this.router.navigate(['/sucursales/configuracion', sucursal.id]);
}
```

Click fila → `openDetail(s)`. Botón "Nueva sucursal" → `openNew()`.

Remover los métodos del modal (`openCreate`, `openEdit`) si existen.

- [ ] **Step 2: Commit**

```bash
git add src/app/features/sucursales/pages/configuracion/sucursales-configuracion.component.ts
git commit -m "feat(sucursales): list navigates to detail page instead of modal"
```

---

## Task 21: Sidebar item "Catálogo"

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Agregar item bajo el grupo Sucursales**

```ts
{
  label: 'Catálogo',
  icon: 'pi pi-th-large',
  routerLink: '/sucursales/catalogo',
  roleKey: 'ADMINISTRADOR',
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(sucursales): sidebar item for catálogo"
```

---

## Task 22: Cleanup — eliminar legacy

**Files:**
- Delete: `src/app/features/sucursales/components/sucursal-form-modal.component.ts`
- Delete: `src/app/features/sucursales/pages/areas/areas.component.ts`
- Delete: `src/app/features/sucursales/store/sucursales.{actions,effects,reducer,selectors,state}.ts` (los plural legacy, si están sin uso)

- [ ] **Step 1: Verificar usos antes de borrar**

```bash
grep -rn "sucursal-form-modal" src/
grep -rn "AreasComponent" src/
grep -rn "from.*sucursales\.\(actions\|effects\|reducer\|selectors\|state\)" src/
```

Si hay imports: o se eliminan junto al modal, o se queda el código (no borrar a la fuerza).

- [ ] **Step 2: Eliminar archivos sin imports**

```bash
rm src/app/features/sucursales/components/sucursal-form-modal.component.ts
rm src/app/features/sucursales/pages/areas/areas.component.ts
# legacy store sólo si grep no encontró imports activos
```

- [ ] **Step 3: Eliminar ruta `areas` en sucursales.routes.ts**

```ts
// remover:
{ path: 'areas', loadComponent: () => import('./pages/areas/areas.component').then(m => m.AreasComponent) },
```

- [ ] **Step 4: Run vitest + tsc**

```bash
npx vitest run
npx tsc --noEmit
```

Esperado: ambos pasan.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/features/sucursales/
git commit -m "refactor(sucursales): remove legacy form modal, areas page, and unused store"
```

---

## Task 23: Smoke manual + push

- [ ] **Step 1: Run dev server**

```bash
npm start
```

- [ ] **Step 2: Smoke según §11.1 del spec**

1. Login admin@test.com / password.
2. Navegar a `/sucursales/configuracion` desde sidebar.
3. Catálogo → crear área "Hematología" → crear sección "Hemograma" dentro.
4. "Nueva sucursal" → completar 6 steps → Finalizar.
5. En lista, click sucursal nueva → ver tabs.
6. Editar horario → guardar → reload → cambio persiste.
7. Toggle Tótem en tab Tótem → la pantalla `/turnos/recepcion` cambia de layout sin reload.
8. Eliminar un contacto en tab Contactos → soft-delete.

- [ ] **Step 3: Anotar bugs encontrados como TODO o fix inline**

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin feat/sucursales-back-office
gh pr create --title "feat(sucursales): back-office completo con stepper y tabs" --body "..."
```

PR body: link al spec + checklist del smoke + screenshots de pantallas clave.

---

## Estado final esperado

- 23 tasks completadas.
- Branch `feat/sucursales-back-office` con ~25-30 commits.
- PR abierto con smoke checklist completo.
- Develop sin tocar.
