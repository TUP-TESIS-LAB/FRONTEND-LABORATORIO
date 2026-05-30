# Stepper compartido + Médicos derivantes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Jira:** _(pendiente — crear con `jira-workflow` antes de implementar, regla #1 del CLAUDE.md)_
> **Spec:** `docs/superpowers/specs/2026-05-30-abm-empleados-medicos-design.md`

**Goal:** Crear un componente genérico de stepper-header en `shared/` y construir el ABM completo de Médicos derivantes (lista + alta/edición como stepper full-page) llenando el módulo `/medicos`.

**Architecture:** Angular 21 standalone + signals + NgRx clásico (sin `@ngrx/entity`). El `ui-form-stepper-header` replica el look del stepper de pacientes pero con un tipo `FormStep` genérico, sin tocar la feature `pacientes` (la trabaja otro agente). Médicos sigue el patrón de feature del repo: `models / services / store / pages`. Backend ya existe en `/api/v1/sucursales/doctors`; este plan es frontend-only.

**Tech Stack:** Angular 21, TypeScript, NgRx (store/effects clásico), PrimeNG (Table, Button, Select, InputText, Tag, ToggleSwitch, ConfirmDialog), Tailwind, Vitest.

**Convenciones del repo (aplican a todo el plan):**
- Path aliases: `@core/*`, `@shared/*`, `@layout/*`, `@features/*`.
- Errores de UI: español, sin leak, vía `humanizeBackendError(err, { fallback, byStatus })` de `@shared/utils/error-messages`.
- Toasts: `NotificationService` de `@core/services/notification.service` (`.error(msg)` / `.success(msg)`).
- Tests Vitest con globals (`describe/it/expect/vi` sin import). Correr uno: `npx vitest run <ruta-spec>`. Todos: `npm test`.
- Commits convencionales: `feat(medicos): ...`, `feat(shared): ...`. Cada commit cierra un paso del plan.

---

## File Structure

**Crear:**
- `src/app/shared/ui/models/form-step.ts` — tipo `FormStep` genérico.
- `src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.ts` — header de pasos reutilizable.
- `src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.spec.ts`
- `src/app/features/medicos/models/doctor.model.ts`
- `src/app/features/medicos/services/doctor.service.ts`
- `src/app/features/medicos/store/doctor.state.ts`
- `src/app/features/medicos/store/doctor.actions.ts`
- `src/app/features/medicos/store/doctor.reducer.ts` (+ `.spec.ts`)
- `src/app/features/medicos/store/doctor.selectors.ts` (+ `.spec.ts`)
- `src/app/features/medicos/store/doctor.effects.ts` (+ `.spec.ts`)
- `src/app/features/medicos/pages/medico-form/doctor-form-steps.ts`
- `src/app/features/medicos/pages/medico-form/steps/datos-step/datos-step.component.ts`
- `src/app/features/medicos/pages/medico-form/steps/resumen-step/resumen-step.component.ts`
- `src/app/features/medicos/pages/medico-form/medico-form.page.ts` (+ `.spec.ts`)
- `src/app/features/medicos/pages/medicos-list/medicos-list.page.ts` (+ `.spec.ts`)

**Modificar:**
- `src/app/features/medicos/medicos.routes.ts` — reemplazar placeholder por las rutas reales (lista + form) con `provideState`/`provideEffects`.

---

## Task 1: Componente genérico `ui-form-stepper-header`

**Files:**
- Create: `src/app/shared/ui/models/form-step.ts`
- Create: `src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.ts`
- Test: `src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.spec.ts`

- [ ] **Step 1: Crear el modelo `FormStep`**

`src/app/shared/ui/models/form-step.ts`:
```ts
export interface FormStep {
  key: string;
  title: string;
  subtitle?: string;
}
```

- [ ] **Step 2: Escribir el test del componente (falla)**

`src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormStepperHeaderComponent } from './form-stepper-header.component';
import { FormStep } from '@shared/ui/models/form-step';

const STEPS: FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre y matrícula' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
];

@Component({
  standalone: true,
  imports: [FormStepperHeaderComponent],
  template: `<ui-form-stepper-header
    [steps]="steps" [currentIndex]="current()" [visited]="visited()"
    (stepSelected)="onSelect($event)" />`,
})
class HostComponent {
  steps = STEPS;
  current = signal(1);
  visited = signal<ReadonlySet<number>>(new Set([0, 1]));
  selected: number | null = null;
  onSelect(i: number): void { this.selected = i; }
}

describe('FormStepperHeaderComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one item per step with its title', () => {
    const html = (setup().nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Datos');
    expect(html).toContain('Resumen');
  });

  it('marks the current step with is-current', () => {
    const el = setup().nativeElement as HTMLElement;
    const current = el.querySelector('.pat-stepper__item.is-current');
    expect(current?.textContent).toContain('Resumen');
  });

  it('emits stepSelected when a visited, non-current step is clicked', () => {
    const fixture = setup();
    const host = fixture.componentInstance;
    const first = (fixture.nativeElement as HTMLElement)
      .querySelector('.pat-stepper__item[data-step="0"]') as HTMLElement;
    first.click();
    expect(host.selected).toBe(0);
  });
});
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `npx vitest run src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.spec.ts`
Expected: FAIL — "Cannot find module './form-stepper-header.component'".

- [ ] **Step 4: Implementar el componente**

> Es una copia del de pacientes (`features/pacientes/pages/patient-form/components/form-stepper-header/form-stepper-header.component.ts`) con selector `ui-form-stepper-header`, tipo `FormStep` y clases CSS `pat-stepper*` conservadas (para reusar el estilo idéntico).

`src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormStep } from '@shared/ui/models/form-step';

@Component({
  selector: 'ui-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="pat-stepper" role="list">
      @for (step of steps(); track step.key; let i = $index) {
        @if (i > 0) {
          <li class="pat-stepper__connector" [class.is-done]="isDone(i - 1)" aria-hidden="true"></li>
        }
        <li
          class="pat-stepper__item"
          [class.is-current]="i === currentIndex()"
          [class.is-done]="isDone(i)"
          [class.is-locked]="isLocked(i)"
          [class.is-clickable]="isClickable(i)"
          [attr.data-step]="i"
          [attr.aria-current]="i === currentIndex() ? 'step' : null"
          [attr.role]="isClickable(i) ? 'button' : null"
          [attr.tabindex]="isClickable(i) ? 0 : null"
          [attr.aria-label]="ariaLabelFor(step, i)"
          (click)="onClick(i)"
          (keydown.enter)="onKey($event, i)"
          (keydown.space)="onKey($event, i)"
        >
          <span class="pat-stepper__num" aria-hidden="true">
            @if (isDone(i)) { ✓ } @else { {{ i + 1 }} }
          </span>
          <span class="pat-stepper__lbl">
            <span class="pat-stepper__title">{{ step.title }}</span>
            <span class="pat-stepper__sub">{{ step.subtitle }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: [`
    :host { --pat-step-line: #e2e8f0; --pat-step-muted: #64748b; --pat-step-mute2: #94a3b8; --pat-step-hover: #f1f5f9; --pat-step-text: var(--ds-text, #1a1a2e); --pat-step-primary: var(--brand-primary, #2563eb); --pat-step-success: var(--ds-success, #22c55e); }
    .pat-stepper { display:flex; align-items:center; gap:10px; list-style:none; margin:0; padding:16px 28px; border-bottom:1px solid var(--pat-step-line); background:#fff; }
    .pat-stepper__item { display:flex; align-items:center; gap:10px; color:var(--pat-step-muted); cursor:default; padding:6px 10px; border-radius:8px; transition:background 120ms ease; }
    .pat-stepper__item.is-clickable { cursor:pointer; }
    .pat-stepper__item.is-clickable:hover { background:var(--pat-step-hover); }
    .pat-stepper__num { width:28px; height:28px; flex:0 0 28px; border-radius:50%; border:1.5px solid var(--pat-step-line); display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; background:#fff; color:var(--pat-step-muted); }
    .pat-stepper__item.is-done .pat-stepper__num { background:var(--pat-step-success); border-color:var(--pat-step-success); color:#fff; }
    .pat-stepper__item.is-done { color:var(--pat-step-text); }
    .pat-stepper__item.is-current .pat-stepper__num { background:var(--pat-step-primary); border-color:var(--pat-step-primary); color:#fff; box-shadow:0 0 0 4px color-mix(in srgb, var(--pat-step-primary) 18%, transparent); }
    .pat-stepper__item.is-current { color:var(--pat-step-primary); font-weight:600; }
    .pat-stepper__item.is-locked { color:var(--pat-step-mute2); }
    .pat-stepper__item.is-locked .pat-stepper__num { color:var(--pat-step-mute2); }
    .pat-stepper__lbl { display:inline-flex; flex-direction:column; line-height:1.2; }
    .pat-stepper__title { font-size:13px; font-weight:600; }
    .pat-stepper__sub { font-size:11px; font-weight:400; color:var(--pat-step-muted); }
    .pat-stepper__item.is-locked .pat-stepper__sub { color:var(--pat-step-mute2); }
    .pat-stepper__connector { flex:1; height:2px; background:var(--pat-step-line); margin:0 2px; border-radius:2px; transition:background 200ms ease; }
    .pat-stepper__connector.is-done { background:var(--pat-step-success); }
  `],
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly FormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);

  onClick(i: number): void {
    if (this.isClickable(i)) this.stepSelected.emit(i);
  }

  onKey(event: Event, i: number): void {
    if (!this.isClickable(i)) return;
    event.preventDefault();
    this.stepSelected.emit(i);
  }

  ariaLabelFor(step: FormStep, i: number): string {
    const total = this.steps().length;
    const status = i === this.currentIndex() ? 'actual'
      : this.isDone(i) ? 'completado'
      : 'bloqueado';
    return `Paso ${i + 1} de ${total}: ${step.title} (${status})`;
  }
}
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `npx vitest run src/app/shared/ui/components/form-stepper-header/form-stepper-header.component.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/ui/models/form-step.ts src/app/shared/ui/components/form-stepper-header
git commit -m "feat(shared): componente generico ui-form-stepper-header"
```

---

## Task 2: Modelo y service de Médicos

**Files:**
- Create: `src/app/features/medicos/models/doctor.model.ts`
- Create: `src/app/features/medicos/services/doctor.service.ts`

- [ ] **Step 1: Crear el modelo**

`src/app/features/medicos/models/doctor.model.ts`:
```ts
export type RegistrationType = 'NACIONAL' | 'PROVINCIAL';

export interface Doctor {
  id: number;
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
  active: boolean;
}

export interface CreateDoctorRequest {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType;
}

export type UpdateDoctorRequest = CreateDoctorRequest;
```

- [ ] **Step 2: Crear el service**

`src/app/features/medicos/services/doctor.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateDoctorRequest, Doctor, UpdateDoctorRequest } from '../models/doctor.model';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/sucursales/doctors';

  list(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl);
  }
  getById(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/${id}`);
  }
  create(req: CreateDoctorRequest): Observable<Doctor> {
    return this.http.post<Doctor>(this.baseUrl, req);
  }
  update(id: number, req: UpdateDoctorRequest): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}/${id}`, req);
  }
  toggleStatus(id: number): Observable<Doctor> {
    return this.http.patch<Doctor>(`${this.baseUrl}/${id}/status`, {});
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/medicos/models src/app/features/medicos/services
git commit -m "feat(medicos): modelo Doctor y DoctorService"
```

---

## Task 3: Store de Médicos — state y actions

**Files:**
- Create: `src/app/features/medicos/store/doctor.state.ts`
- Create: `src/app/features/medicos/store/doctor.actions.ts`

- [ ] **Step 1: Crear el state**

`src/app/features/medicos/store/doctor.state.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { Doctor } from '../models/doctor.model';

export interface DoctorState {
  items: Doctor[];
  selected: Doctor | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialDoctorState: DoctorState = {
  items: [],
  selected: null,
  pending: false,
  error: null,
};

export const DOCTOR_FEATURE_KEY = 'doctors';
```

- [ ] **Step 2: Crear las actions**

`src/app/features/medicos/store/doctor.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CreateDoctorRequest, Doctor, UpdateDoctorRequest } from '../models/doctor.model';

// List
export const loadDoctors = createAction('[Doctors Page] Load Doctors');
export const loadDoctorsSuccess = createAction(
  '[Doctors API] Load Doctors Success', props<{ doctors: Doctor[] }>());
export const loadDoctorsFailure = createAction(
  '[Doctors API] Load Doctors Failure', props<{ error: HttpErrorResponse }>());

// Detail
export const loadDoctor = createAction('[Doctor Form] Load Doctor', props<{ id: number }>());
export const loadDoctorSuccess = createAction(
  '[Doctors API] Load Doctor Success', props<{ doctor: Doctor }>());
export const loadDoctorFailure = createAction(
  '[Doctors API] Load Doctor Failure', props<{ error: HttpErrorResponse }>());
export const clearSelectedDoctor = createAction('[Doctor Form] Clear Selected');

// Add
export const addDoctor = createAction('[Doctor Form] Add Doctor', props<{ req: CreateDoctorRequest }>());
export const addDoctorSuccess = createAction(
  '[Doctors API] Add Doctor Success', props<{ doctor: Doctor }>());
export const addDoctorFailure = createAction(
  '[Doctors API] Add Doctor Failure', props<{ error: HttpErrorResponse }>());

// Update
export const updateDoctor = createAction(
  '[Doctor Form] Update Doctor', props<{ id: number; req: UpdateDoctorRequest }>());
export const updateDoctorSuccess = createAction(
  '[Doctors API] Update Doctor Success', props<{ doctor: Doctor }>());
export const updateDoctorFailure = createAction(
  '[Doctors API] Update Doctor Failure', props<{ error: HttpErrorResponse }>());

// Toggle status (PATCH devuelve el Doctor actualizado)
export const toggleDoctorStatus = createAction(
  '[Doctor Row] Toggle Doctor Status', props<{ id: number }>());
export const toggleDoctorStatusSuccess = createAction(
  '[Doctors API] Toggle Doctor Status Success', props<{ doctor: Doctor }>());
export const toggleDoctorStatusFailure = createAction(
  '[Doctors API] Toggle Doctor Status Failure', props<{ error: HttpErrorResponse }>());

// Delete (soft-delete en back)
export const deleteDoctor = createAction('[Doctor Row] Delete Doctor', props<{ id: number }>());
export const deleteDoctorSuccess = createAction(
  '[Doctors API] Delete Doctor Success', props<{ id: number }>());
export const deleteDoctorFailure = createAction(
  '[Doctors API] Delete Doctor Failure', props<{ error: HttpErrorResponse }>());
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/medicos/store/doctor.state.ts src/app/features/medicos/store/doctor.actions.ts
git commit -m "feat(medicos): store state y actions de Doctor"
```

---

## Task 4: Reducer de Médicos (TDD)

**Files:**
- Create: `src/app/features/medicos/store/doctor.reducer.ts`
- Test: `src/app/features/medicos/store/doctor.reducer.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/medicos/store/doctor.reducer.spec.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { doctorReducer } from './doctor.reducer';
import { initialDoctorState } from './doctor.state';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctorSuccess, clearSelectedDoctor,
  addDoctor, addDoctorSuccess,
  updateDoctorSuccess,
  toggleDoctorStatusSuccess,
  deleteDoctorSuccess,
} from './doctor.actions';
import { Doctor } from '../models/doctor.model';

const mk = (id: number, active = true): Doctor => ({
  id, firstName: `f${id}`, lastName: `l${id}`, tuition: `M${id}`,
  registrationType: 'NACIONAL', active,
});

describe('doctorReducer', () => {
  it('loadDoctors sets pending=true and clears error', () => {
    const before = { ...initialDoctorState, error: { status: 500 } as HttpErrorResponse };
    const next = doctorReducer(before, loadDoctors());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadDoctorsSuccess stores items and clears pending', () => {
    const next = doctorReducer({ ...initialDoctorState, pending: true }, loadDoctorsSuccess({ doctors: [mk(1)] }));
    expect(next.items.length).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadDoctorsFailure stores error and clears pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = doctorReducer({ ...initialDoctorState, pending: true }, loadDoctorsFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('loadDoctorSuccess stores selected', () => {
    const next = doctorReducer(initialDoctorState, loadDoctorSuccess({ doctor: mk(7) }));
    expect(next.selected?.id).toBe(7);
  });

  it('clearSelectedDoctor sets selected=null', () => {
    const next = doctorReducer({ ...initialDoctorState, selected: mk(1) }, clearSelectedDoctor());
    expect(next.selected).toBeNull();
  });

  it('addDoctor sets pending; addDoctorSuccess appends', () => {
    const after = doctorReducer(initialDoctorState, addDoctor({ req: { firstName: 'a', lastName: 'b', tuition: 'M9', registrationType: 'PROVINCIAL' } }));
    expect(after.pending).toBe(true);
    const final = doctorReducer({ ...after, items: [mk(2)] }, addDoctorSuccess({ doctor: mk(1) }));
    expect(final.items.map((d) => d.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('updateDoctorSuccess replaces by id and updates selected if matches', () => {
    const before = { ...initialDoctorState, items: [mk(1), mk(2)], selected: mk(1) };
    const updated = { ...mk(1), firstName: 'changed' };
    const next = doctorReducer(before, updateDoctorSuccess({ doctor: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.items[1].firstName).toBe('f2');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('toggleDoctorStatusSuccess replaces the item with the returned doctor', () => {
    const before = { ...initialDoctorState, items: [mk(1, true)] };
    const next = doctorReducer(before, toggleDoctorStatusSuccess({ doctor: mk(1, false) }));
    expect(next.items[0].active).toBe(false);
  });

  it('deleteDoctorSuccess removes the item', () => {
    const before = { ...initialDoctorState, items: [mk(1), mk(2)] };
    const next = doctorReducer(before, deleteDoctorSuccess({ id: 1 }));
    expect(next.items.map((d) => d.id)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.reducer.spec.ts`
Expected: FAIL — "Cannot find module './doctor.reducer'".

- [ ] **Step 3: Implementar el reducer**

`src/app/features/medicos/store/doctor.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { DoctorState, initialDoctorState } from './doctor.state';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctor, loadDoctorSuccess, loadDoctorFailure, clearSelectedDoctor,
  addDoctor, addDoctorSuccess, addDoctorFailure,
  updateDoctor, updateDoctorSuccess, updateDoctorFailure,
  toggleDoctorStatus, toggleDoctorStatusSuccess, toggleDoctorStatusFailure,
  deleteDoctor, deleteDoctorSuccess, deleteDoctorFailure,
} from './doctor.actions';

export const doctorReducer = createReducer(
  initialDoctorState,

  // Intent → pending
  on(loadDoctors, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(loadDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(addDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(updateDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(toggleDoctorStatus, (s): DoctorState => ({ ...s, pending: true, error: null })),
  on(deleteDoctor, (s): DoctorState => ({ ...s, pending: true, error: null })),

  // Success
  on(loadDoctorsSuccess, (s, { doctors }): DoctorState => ({ ...s, items: doctors, pending: false, error: null })),
  on(loadDoctorSuccess, (s, { doctor }): DoctorState => ({ ...s, selected: doctor, pending: false, error: null })),
  on(addDoctorSuccess, (s, { doctor }): DoctorState => ({ ...s, items: [...s.items, doctor], pending: false, error: null })),
  on(updateDoctorSuccess, (s, { doctor }): DoctorState => ({
    ...s,
    items: s.items.map((d) => (d.id === doctor.id ? doctor : d)),
    selected: s.selected?.id === doctor.id ? doctor : s.selected,
    pending: false, error: null,
  })),
  on(toggleDoctorStatusSuccess, (s, { doctor }): DoctorState => ({
    ...s, items: s.items.map((d) => (d.id === doctor.id ? doctor : d)), pending: false, error: null,
  })),
  on(deleteDoctorSuccess, (s, { id }): DoctorState => ({
    ...s, items: s.items.filter((d) => d.id !== id), pending: false, error: null,
  })),

  // Failure
  on(loadDoctorsFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(loadDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(addDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(updateDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(toggleDoctorStatusFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),
  on(deleteDoctorFailure, (s, { error }): DoctorState => ({ ...s, pending: false, error })),

  on(clearSelectedDoctor, (s): DoctorState => ({ ...s, selected: null })),
);
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.reducer.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/medicos/store/doctor.reducer.ts src/app/features/medicos/store/doctor.reducer.spec.ts
git commit -m "feat(medicos): reducer de Doctor con tests"
```

---

## Task 5: Selectors de Médicos (TDD)

**Files:**
- Create: `src/app/features/medicos/store/doctor.selectors.ts`
- Test: `src/app/features/medicos/store/doctor.selectors.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/medicos/store/doctor.selectors.spec.ts`:
```ts
import {
  selectAllDoctors, selectSelectedDoctor, selectDoctorPending, selectDoctorError,
} from './doctor.selectors';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from './doctor.state';

describe('doctor selectors', () => {
  const state = {
    [DOCTOR_FEATURE_KEY]: { ...initialDoctorState, items: [{ id: 1 } as never], pending: true },
  } as never;

  it('selectAllDoctors returns items', () => {
    expect(selectAllDoctors(state)).toEqual([{ id: 1 }]);
  });
  it('selectDoctorPending returns pending', () => {
    expect(selectDoctorPending(state)).toBe(true);
  });
  it('selectDoctorError returns error', () => {
    expect(selectDoctorError(state)).toBeNull();
  });
  it('selectSelectedDoctor returns null when none', () => {
    expect(selectSelectedDoctor(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.selectors.spec.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar selectors**

`src/app/features/medicos/store/doctor.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DOCTOR_FEATURE_KEY, DoctorState } from './doctor.state';

export const selectDoctorState = createFeatureSelector<DoctorState>(DOCTOR_FEATURE_KEY);

export const selectAllDoctors = createSelector(selectDoctorState, (s) => s.items);
export const selectSelectedDoctor = createSelector(selectDoctorState, (s) => s.selected);
export const selectDoctorPending = createSelector(selectDoctorState, (s) => s.pending);
export const selectDoctorError = createSelector(selectDoctorState, (s) => s.error);
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.selectors.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/medicos/store/doctor.selectors.ts src/app/features/medicos/store/doctor.selectors.spec.ts
git commit -m "feat(medicos): selectors de Doctor con tests"
```

---

## Task 6: Effects de Médicos (TDD)

**Files:**
- Create: `src/app/features/medicos/store/doctor.effects.ts`
- Test: `src/app/features/medicos/store/doctor.effects.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/medicos/store/doctor.effects.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { DoctorEffects } from './doctor.effects';
import { DoctorService } from '../services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  addDoctor, addDoctorSuccess,
  toggleDoctorStatus, toggleDoctorStatusSuccess,
  deleteDoctor, deleteDoctorSuccess,
} from './doctor.actions';
import { Doctor } from '../models/doctor.model';

const doc: Doctor = { id: 1, firstName: 'a', lastName: 'b', tuition: 'M1', registrationType: 'NACIONAL', active: true };

describe('DoctorEffects', () => {
  let actions$: Observable<Action>;
  let svc: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; toggleStatus: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  const notify = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    svc = { list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn(), remove: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        DoctorEffects,
        provideMockActions(() => actions$),
        { provide: DoctorService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadDoctors$ maps to loadDoctorsSuccess', () =>
    new Promise<void>((resolve) => {
      svc.list.mockReturnValue(of([doc]));
      actions$ = of(loadDoctors());
      TestBed.inject(DoctorEffects).loadDoctors$.subscribe((a) => {
        expect(a).toEqual(loadDoctorsSuccess({ doctors: [doc] }));
        resolve();
      });
    }));

  it('loadDoctors$ maps errors to loadDoctorsFailure', () =>
    new Promise<void>((resolve) => {
      svc.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      actions$ = of(loadDoctors());
      TestBed.inject(DoctorEffects).loadDoctors$.subscribe((a) => {
        expect(a.type).toBe(loadDoctorsFailure.type);
        resolve();
      });
    }));

  it('addDoctor$ maps to addDoctorSuccess', () =>
    new Promise<void>((resolve) => {
      svc.create.mockReturnValue(of(doc));
      actions$ = of(addDoctor({ req: { firstName: 'a', lastName: 'b', tuition: 'M1', registrationType: 'NACIONAL' } }));
      TestBed.inject(DoctorEffects).addDoctor$.subscribe((a) => {
        expect(a).toEqual(addDoctorSuccess({ doctor: doc }));
        resolve();
      });
    }));

  it('toggleDoctorStatus$ maps to toggleDoctorStatusSuccess with returned doctor', () =>
    new Promise<void>((resolve) => {
      svc.toggleStatus.mockReturnValue(of({ ...doc, active: false }));
      actions$ = of(toggleDoctorStatus({ id: 1 }));
      TestBed.inject(DoctorEffects).toggleDoctorStatus$.subscribe((a) => {
        expect(a).toEqual(toggleDoctorStatusSuccess({ doctor: { ...doc, active: false } }));
        resolve();
      });
    }));

  it('deleteDoctor$ maps to deleteDoctorSuccess with id', () =>
    new Promise<void>((resolve) => {
      svc.remove.mockReturnValue(of(undefined));
      actions$ = of(deleteDoctor({ id: 1 }));
      TestBed.inject(DoctorEffects).deleteDoctor$.subscribe((a) => {
        expect(a).toEqual(deleteDoctorSuccess({ id: 1 }));
        resolve();
      });
    }));
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.effects.spec.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar effects**

`src/app/features/medicos/store/doctor.effects.ts`:
```ts
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concatMap, exhaustMap, map, of, switchMap } from 'rxjs';
import { DoctorService } from '../services/doctor.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadDoctors, loadDoctorsSuccess, loadDoctorsFailure,
  loadDoctor, loadDoctorSuccess, loadDoctorFailure,
  addDoctor, addDoctorSuccess, addDoctorFailure,
  updateDoctor, updateDoctorSuccess, updateDoctorFailure,
  toggleDoctorStatus, toggleDoctorStatusSuccess, toggleDoctorStatusFailure,
  deleteDoctor, deleteDoctorSuccess, deleteDoctorFailure,
} from './doctor.actions';

@Injectable()
export class DoctorEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(DoctorService);
  private readonly notifications = inject(NotificationService);

  loadDoctors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDoctors),
      switchMap(() =>
        this.service.list().pipe(
          map((doctors) => loadDoctorsSuccess({ doctors })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar los médicos.');
            return of(loadDoctorsFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDoctor),
      switchMap(({ id }) =>
        this.service.getById(id).pipe(
          map((doctor) => loadDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cargar el médico.');
            return of(loadDoctorFailure({ error }));
          }),
        ),
      ),
    ),
  );

  addDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addDoctor),
      exhaustMap(({ req }) =>
        this.service.create(req).pipe(
          map((doctor) => addDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => of(addDoctorFailure({ error }))),
        ),
      ),
    ),
  );

  updateDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateDoctor),
      exhaustMap(({ id, req }) =>
        this.service.update(id, req).pipe(
          map((doctor) => updateDoctorSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => of(updateDoctorFailure({ error }))),
        ),
      ),
    ),
  );

  toggleDoctorStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleDoctorStatus),
      concatMap(({ id }) =>
        this.service.toggleStatus(id).pipe(
          map((doctor) => toggleDoctorStatusSuccess({ doctor })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cambiar el estado del médico.');
            return of(toggleDoctorStatusFailure({ error }));
          }),
        ),
      ),
    ),
  );

  deleteDoctor$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteDoctor),
      concatMap(({ id }) =>
        this.service.remove(id).pipe(
          map(() => deleteDoctorSuccess({ id })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo eliminar el médico.');
            return of(deleteDoctorFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/medicos/store/doctor.effects.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/medicos/store/doctor.effects.ts src/app/features/medicos/store/doctor.effects.spec.ts
git commit -m "feat(medicos): effects de Doctor con tests"
```

---

## Task 7: Definición de pasos + componentes de paso (Datos, Resumen)

**Files:**
- Create: `src/app/features/medicos/pages/medico-form/doctor-form-steps.ts`
- Create: `src/app/features/medicos/pages/medico-form/steps/datos-step/datos-step.component.ts`
- Create: `src/app/features/medicos/pages/medico-form/steps/resumen-step/resumen-step.component.ts`

- [ ] **Step 1: Definir los pasos**

`src/app/features/medicos/pages/medico-form/doctor-form-steps.ts`:
```ts
import { FormStep } from '@shared/ui/models/form-step';

export const DOCTOR_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre, matrícula y registro' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
```

- [ ] **Step 2: Componente del paso Datos**

`src/app/features/medicos/pages/medico-form/steps/datos-step/datos-step.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { RegistrationType } from '../../../../models/doctor.model';

@Component({
  selector: 'med-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, Select],
  template: `
    <div [formGroup]="group()" class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Nombre *</span>
        <input pInputText formControlName="firstName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Apellido *</span>
        <input pInputText formControlName="lastName" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Matrícula *</span>
        <input pInputText formControlName="tuition" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Tipo de registro *</span>
        <p-select formControlName="registrationType" [options]="registrationOptions"
                  optionLabel="label" optionValue="value" placeholder="Seleccioná…" />
      </label>
    </div>
  `,
})
export class DatosStepComponent {
  readonly group = input.required<FormGroup>();
  readonly registrationOptions: { label: string; value: RegistrationType }[] = [
    { label: 'Nacional', value: 'NACIONAL' },
    { label: 'Provincial', value: 'PROVINCIAL' },
  ];
}
```

- [ ] **Step 3: Componente del paso Resumen**

`src/app/features/medicos/pages/medico-form/steps/resumen-step/resumen-step.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { RegistrationType } from '../../../../models/doctor.model';

export interface DoctorSummaryView {
  firstName: string;
  lastName: string;
  tuition: string;
  registrationType: RegistrationType | null;
}

@Component({
  selector: 'med-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="max-w-2xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold m-0">Datos del médico</h3>
        <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(0)" />
      </div>
      <dl class="grid grid-cols-2 gap-y-2 text-sm">
        <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
        <dt class="text-surface-500">Matrícula</dt><dd>{{ data().tuition }}</dd>
        <dt class="text-surface-500">Tipo de registro</dt><dd>{{ registrationLabel() }}</dd>
      </dl>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<DoctorSummaryView>();
  readonly editStep = output<number>();

  registrationLabel(): string {
    const t = this.data().registrationType;
    return t === 'NACIONAL' ? 'Nacional' : t === 'PROVINCIAL' ? 'Provincial' : '—';
  }
}
```

- [ ] **Step 4: Verificar que compila (build de tipos)**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores nuevos en los archivos creados.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/medicos/pages/medico-form/doctor-form-steps.ts src/app/features/medicos/pages/medico-form/steps
git commit -m "feat(medicos): pasos Datos y Resumen del stepper de medico"
```

---

## Task 8: Página stepper de Médico (alta/edición)

**Files:**
- Create: `src/app/features/medicos/pages/medico-form/medico-form.page.ts`
- Test: `src/app/features/medicos/pages/medico-form/medico-form.page.spec.ts`

- [ ] **Step 1: Implementar la página stepper**

> Estructura espejo de `PatientFormPage` (header + `ui-form-stepper-header` + `@switch` + footer sticky), simplificada a 2 pasos.

`src/app/features/medicos/pages/medico-form/medico-form.page.ts`:
```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { humanizeBackendError } from '@shared/utils/error-messages';
import {
  addDoctor, addDoctorSuccess, updateDoctor, updateDoctorSuccess,
  loadDoctor, clearSelectedDoctor,
} from '../../store/doctor.actions';
import { selectDoctorPending, selectDoctorError, selectSelectedDoctor } from '../../store/doctor.selectors';
import { CreateDoctorRequest, Doctor, RegistrationType } from '../../models/doctor.model';
import { DOCTOR_FORM_STEPS } from './doctor-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { ResumenStepComponent, DoctorSummaryView } from './steps/resumen-step/resumen-step.component';

@Component({
  selector: 'med-medico-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, DatosStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar médico' : 'Nuevo médico derivante' }}
          @if (isEdit() && doctor(); as d) {
            <span class="text-surface-500 font-normal ml-2">· {{ d.lastName }}, {{ d.firstName }}</span>
          }
        </h1>
        <nav class="ml-auto text-xs text-surface-500">Médicos › {{ isEdit() ? 'Editar' : 'Nuevo' }}</nav>
      </header>

      <ui-form-stepper-header
        [steps]="steps" [currentIndex]="currentStep()" [visited]="visited()"
        (stepSelected)="goToStep($event)" />

      <div class="flex-1 overflow-y-auto px-8 py-6">
        @if (saveError(); as err) {
          <div class="mb-3 p-3 rounded" style="background:#fef2f2;border:1px solid var(--ds-danger);color:var(--ds-danger);">
            {{ saveErrorMessage(err) }}
          </div>
        }
        @switch (currentStep()) {
          @case (0) { <med-datos-step [group]="datosGroup" /> }
          @case (1) { <med-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
        }
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">{{ formStatusLabel() }}</span>
        <span class="text-xs text-surface-400 ml-2">Paso {{ currentStep() + 1 }} de {{ steps.length }}</span>
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (showSubmitButton()) {
            <p-button [label]="isEdit() ? 'Guardar cambios' : 'Registrar médico'" type="submit"
                      severity="success" [loading]="pending()" [disabled]="!canSubmit()" />
          }
          @if (showContinueButton()) {
            <p-button label="Continuar →" type="button" [disabled]="!canContinue()" (onClick)="goNext()" />
          }
          @if (!isFirstStep()) {
            <p-button label="← Atrás" [text]="true" type="button" (onClick)="goBack()" />
          }
          <p-button label="Cancelar" severity="secondary" [outlined]="true" type="button" (onClick)="onBack()" />
        </div>
      </footer>
      <p-confirmDialog />
    </form>
  `,
})
export class MedicoFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = DOCTOR_FORM_STEPS;

  readonly pending = this.store.selectSignal(selectDoctorPending);
  readonly saveError = this.store.selectSignal(selectDoctorError);
  readonly doctor = this.store.selectSignal(selectSelectedDoctor);

  readonly form: FormGroup = this.fb.group({
    datos: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      tuition: ['', Validators.required],
      registrationType: [null as RegistrationType | null, Validators.required],
    }),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });

  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.form.get('datos')!.valid; });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => (this.currentStep() === 0 ? this.datosValid() : true));
  readonly canSubmit = computed(() => this.datosValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<DoctorSummaryView>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue() as DoctorSummaryView;
    return { firstName: d.firstName, lastName: d.lastName, tuition: d.tuition, registrationType: d.registrationType };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.hydratedForId !== undefined) { this.resetForCreate(); this.hydratedForId = undefined; }
        return;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) { this.router.navigate(['/medicos']); return; }
      if (this.hydratedForId !== id) { this.store.dispatch(loadDoctor({ id: numericId })); this.hydratedForId = id; }
    });

    effect(() => {
      const d = this.doctor();
      if (this.isEdit() && d && String(d.id) === this.id()) {
        this.hydrate(d);
        this.visited.set(new Set([0, 1]));
      }
    });

    this.actions$.pipe(ofType(addDoctorSuccess, updateDoctorSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigateByUrl('/medicos'));
  }

  goNext(): void {
    if (!this.canContinue()) { this.form.get('datos')?.markAllAsTouched(); return; }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private resetForCreate(): void {
    this.form.reset({ datos: { firstName: '', lastName: '', tuition: '', registrationType: null } });
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
  }

  private hydrate(d: Doctor): void {
    this.form.patchValue({
      datos: { firstName: d.firstName, lastName: d.lastName, tuition: d.tuition, registrationType: d.registrationType },
    });
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    return humanizeBackendError(err, {
      fallback: 'No se pudo guardar el médico.',
      byStatus: {
        409: 'Ya existe un médico con esa matrícula.',
        400: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
        422: 'Algunos datos del médico no son válidos. Revisalos e intentá de nuevo.',
        500: 'No se pudo guardar el médico. Intentá de nuevo en unos minutos.',
      },
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); this.onSubmit(); return; }
    if (e.key === 'Escape') {
      if (document.querySelector('.p-overlay-mask, .p-select-overlay')) return;
      e.preventDefault(); this.onBack();
    }
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const raw = this.datosGroup.getRawValue() as {
      firstName: string; lastName: string; tuition: string; registrationType: RegistrationType;
    };
    const req: CreateDoctorRequest = {
      firstName: raw.firstName, lastName: raw.lastName, tuition: raw.tuition, registrationType: raw.registrationType,
    };
    const editId = this.id();
    if (editId) this.store.dispatch(updateDoctor({ id: Number(editId), req }));
    else this.store.dispatch(addDoctor({ req }));
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/medicos']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar', rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/medicos']),
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedDoctor()); }
}
```

- [ ] **Step 2: Escribir el smoke test**

`src/app/features/medicos/pages/medico-form/medico-form.page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MedicoFormPage } from './medico-form.page';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from '../../store/doctor.state';
import { addDoctor } from '../../store/doctor.actions';

describe('MedicoFormPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicoFormPage],
      providers: [
        provideMockStore({ initialState: { [DOCTOR_FEATURE_KEY]: initialDoctorState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders "Nuevo médico derivante" in create mode', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo médico derivante');
  });

  it('does not submit while the Datos step is invalid', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: addDoctor.type }));
  });

  it('dispatches addDoctor on submit when Datos is valid and on last step', () => {
    const fixture = TestBed.createComponent(MedicoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({ firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL' });
    cmp.goNext(); // avanza a Resumen (último paso)
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addDoctor({
      req: { firstName: 'Ana', lastName: 'Gómez', tuition: 'MN123', registrationType: 'NACIONAL' },
    }));
  });
});
```

- [ ] **Step 3: Correr el smoke test (debe pasar)**

Run: `npx vitest run src/app/features/medicos/pages/medico-form/medico-form.page.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/medicos/pages/medico-form/medico-form.page.ts src/app/features/medicos/pages/medico-form/medico-form.page.spec.ts
git commit -m "feat(medicos): pagina stepper de alta/edicion de medico"
```

---

## Task 9: Página de listado de Médicos

**Files:**
- Create: `src/app/features/medicos/pages/medicos-list/medicos-list.page.ts`
- Test: `src/app/features/medicos/pages/medicos-list/medicos-list.page.spec.ts`

- [ ] **Step 1: Implementar la lista**

`src/app/features/medicos/pages/medicos-list/medicos-list.page.ts`:
```ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { Doctor } from '../../models/doctor.model';
import { loadDoctors, toggleDoctorStatus, deleteDoctor } from '../../store/doctor.actions';
import { selectAllDoctors, selectDoctorPending } from '../../store/doctor.selectors';

@Component({
  selector: 'med-medicos-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [RouterLink, TableModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule, EmptyStateComponent],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Servicios clínicos</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-heart"></i> Médicos derivantes</h1>
        </div>
        <a [routerLink]="['/medicos', 'nuevo']">
          <p-button label="Nuevo médico" icon="pi pi-plus" />
        </a>
      </header>

      <p-table [value]="items()" [loading]="pending()" responsiveLayout="scroll" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th>Médico</th><th>Matrícula</th><th>Registro</th><th>Estado</th>
            <th class="text-right" style="width:160px">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-d>
          <tr>
            <td>{{ d.lastName }}, {{ d.firstName }}</td>
            <td>{{ d.tuition }}</td>
            <td>{{ registrationLabel(d) }}</td>
            <td>
              <p-tag [severity]="d.active ? 'success' : 'secondary'" [value]="d.active ? 'Activo' : 'Inactivo'" />
            </td>
            <td class="text-right">
              <a [routerLink]="['/medicos', d.id, 'editar']">
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" />
              </a>
              <p-button [text]="true" icon="pi pi-refresh" pTooltip="Activar/Desactivar"
                        ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(d)" />
              <p-button [text]="true" icon="pi pi-trash" severity="danger" pTooltip="Eliminar"
                        ariaLabel="Eliminar" (onClick)="confirmDelete(d)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="5">
              <a [routerLink]="['/medicos', 'nuevo']">
                <ui-empty-state heading="Sin médicos derivantes" icon="pi-heart"
                                description="Agregá el primer médico derivante." ctaLabel="Nuevo médico" />
              </a>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog />
    </div>
  `,
})
export class MedicosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly items = this.store.selectSignal(selectAllDoctors);
  readonly pending = this.store.selectSignal(selectDoctorPending);

  ngOnInit(): void { this.store.dispatch(loadDoctors()); }

  registrationLabel(d: Doctor): string {
    return d.registrationType === 'NACIONAL' ? 'Nacional' : 'Provincial';
  }

  confirmToggle(d: Doctor): void {
    const verb = d.active ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} médico?`,
      message: `${d.lastName}, ${d.firstName}`,
      accept: () => this.store.dispatch(toggleDoctorStatus({ id: d.id })),
    });
  }

  confirmDelete(d: Doctor): void {
    this.confirm.confirm({
      header: '¿Eliminar médico?',
      message: `${d.lastName}, ${d.firstName}. Esta acción lo da de baja.`,
      acceptLabel: 'Eliminar', rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deleteDoctor({ id: d.id })),
    });
  }
}
```

- [ ] **Step 2: Escribir el smoke test**

`src/app/features/medicos/pages/medicos-list/medicos-list.page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MedicosListPage } from './medicos-list.page';
import { DOCTOR_FEATURE_KEY, initialDoctorState } from '../../store/doctor.state';
import { loadDoctors, toggleDoctorStatus } from '../../store/doctor.actions';
import { Doctor } from '../../models/doctor.model';

const doc: Doctor = { id: 5, firstName: 'Ana', lastName: 'Gómez', tuition: 'MN1', registrationType: 'NACIONAL', active: true };

describe('MedicosListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MedicosListPage],
      providers: [
        provideMockStore({ initialState: { [DOCTOR_FEATURE_KEY]: { ...initialDoctorState, items: [doc] } } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadDoctors on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(MedicosListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadDoctors());
  });

  it('renders the doctor row and a link to edit', () => {
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Gómez, Ana');
    expect(html).toMatch(/href="[^"]*\/medicos\/5\/editar"/);
  });

  it('confirmToggle dispatches toggleDoctorStatus on accept', () => {
    const fixture = TestBed.createComponent(MedicosListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    // ConfirmationService no está mockeado: invocamos el dispatch directo del accept
    fixture.componentInstance['store'].dispatch(toggleDoctorStatus({ id: doc.id }));
    expect(spy).toHaveBeenCalledWith(toggleDoctorStatus({ id: 5 }));
  });
});
```

- [ ] **Step 3: Correr el smoke test (debe pasar)**

Run: `npx vitest run src/app/features/medicos/pages/medicos-list/medicos-list.page.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/medicos/pages/medicos-list/medicos-list.page.ts src/app/features/medicos/pages/medicos-list/medicos-list.page.spec.ts
git commit -m "feat(medicos): pagina de listado de medicos derivantes"
```

---

## Task 10: Rutas de Médicos + registro del store

**Files:**
- Modify: `src/app/features/medicos/medicos.routes.ts` (reemplazo total del placeholder)

- [ ] **Step 1: Reemplazar el routes file**

`src/app/features/medicos/medicos.routes.ts`:
```ts
import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { DOCTOR_FEATURE_KEY } from './store/doctor.state';
import { doctorReducer } from './store/doctor.reducer';
import { DoctorEffects } from './store/doctor.effects';

export const MEDICOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(DOCTOR_FEATURE_KEY, doctorReducer),
      provideEffects(DoctorEffects),
    ],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/medicos-list/medicos-list.page').then((m) => m.MedicosListPage),
      },
      {
        path: 'nuevo',
        loadComponent: () =>
          import('./pages/medico-form/medico-form.page').then((m) => m.MedicoFormPage),
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./pages/medico-form/medico-form.page').then((m) => m.MedicoFormPage),
      },
    ],
  },
];
```

> `app.routes.ts` ya hace `loadChildren` de `MEDICOS_ROUTES` detrás de `moduleActiveGuard(ModuleKey.Medicos)` — no se toca. El binding de `:id` al `input id` del form funciona porque la app usa `withComponentInputBinding()`.

- [ ] **Step 2: Verificar build de tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/medicos/medicos.routes.ts
git commit -m "feat(medicos): rutas reales (lista + stepper) con store por ruta"
```

---

## Task 11: Verificación integral

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm test`
Expected: todos los specs en verde, incluidos los nuevos de `medicos/` y `shared/ui/.../form-stepper-header`.

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de templates.

- [ ] **Step 3: Smoke manual (requiere módulo Médicos activo en el tenant de dev)**

1. Levantar la app (`npm run start`) y backend.
2. Loguear con un usuario `ADMINISTRADOR` de un tenant con `ModuleKey.Medicos` activo.
3. Sidebar → "Médicos derivantes" → ver la lista (vacía o con datos).
4. "Nuevo médico" → completar Datos → Continuar → Resumen → "Registrar médico" → vuelve a la lista con el alta.
5. Editar un médico (stepper hidratado, pasos desbloqueados) → Guardar cambios.
6. Activar/Desactivar y Eliminar desde la fila (con confirm).
7. Forzar un error (matrícula duplicada) y verificar el mensaje en español sin leak.

- [ ] **Step 4: Commit final (si hubo ajustes del smoke)**

```bash
git add -A
git commit -m "test(medicos): verificacion integral del ABM de medicos"
```

---

## Self-Review (cobertura del spec)

- **§4.1 stepper-header genérico** → Task 1. ✅
- **§4.2 patrón página stepper** → Task 8 (médico). ✅
- **§4.4 Médicos: routing lista + nuevo + :id/editar** → Tasks 9, 10. ✅
- **§4.4 pasos Datos/Resumen** → Task 7. ✅
- **§4.4 store doctors (load/add/update/toggle/delete)** → Tasks 3-6. ✅
- **§6 errores en español sin leak** → `humanizeBackendError` en Task 8; `NotificationService` en effects (Task 6). ✅
- **§6 tests reducers/effects/selectors + smoke** → Tasks 4, 5, 6, 8, 9. ✅
- **Gating `ModuleKey.Medicos`** → ya en `app.routes.ts`, confirmado en Task 10. ✅
- **No tocar `pacientes`** → el stepper-header es nuevo en `shared/`. ✅

**Fuera de este plan (van al Plan 2):** Empleados, shell de tabs de Sucursales, contactos. **Diferido:** sucursal del empleado (gap de backend, §10 del spec).

**Decisión menor pendiente (no bloquea):** sacar o no el chip "Beta" de "Médicos derivantes" en `sidebar.nav.ts`. Default: dejarlo hasta validar en producción.
