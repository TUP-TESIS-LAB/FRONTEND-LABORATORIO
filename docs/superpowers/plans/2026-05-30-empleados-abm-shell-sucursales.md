# Empleados ABM + shell de Sucursales — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Jira:** [KAN-59](https://exequielsantoro.atlassian.net/browse/KAN-59)
> **Spec:** `docs/superpowers/specs/2026-05-30-abm-empleados-medicos-design.md`
> **Depende de:** Plan 1 (`2026-05-30-stepper-compartido-y-medicos.md`) — usa `ui-form-stepper-header` y el tipo `FormStep` de `@shared/ui`. Implementar Plan 1 primero.
> **⚠️ Coordinación KAN-47:** este plan modifica `sucursales.routes.ts` y `sidebar.nav.ts`, que también reescribe **KAN-47** ("[Frontend LAB] Back-office completo de sucursales", Mateo Pillado, rama `feat/sucursales-back-office`, *Por hacer*). KAN-47 elimina el modal legacy, el stub `pages/areas` y el store plural, y agrega su propio detalle con tabs + catálogo. Decisión del equipo: avanzar Empleados sobre la estructura **actual** de Sucursales (este plan) y reconciliar con KAN-47 cuando alguno de los dos mergee. **Antes de empezar este plan**, revisar si `feat/sucursales-back-office` ya avanzó para evitar retrabajo.

**Goal:** Construir el ABM de Empleados (lista + alta/edición como stepper Datos/Contactos/Resumen, con gestión de contactos) dentro de un nuevo shell de tabs en Sucursales ("Sucursales | Empleados").

**Architecture:** Angular 21 standalone + signals + NgRx clásico. Empleado es un catálogo aparte (sin vínculo a login). El backend ya existe en `/api/v1/sucursales/employees` (+ `/{id}/status`, `/{id}/contacts`). La orquestación de contactos vive en los effects: en alta se crea el empleado y luego sus contactos; en edición se reconcilian (altas/bajas/cambios). El shell de Sucursales replica el patrón de `EmpresaDashboardComponent`. Frontend-only; **sin** sucursal del empleado (diferida, §10 del spec).

**Tech Stack:** Angular 21, NgRx (store/effects clásico), PrimeNG (Table, Button, Select, InputText, ToggleSwitch, Tag, ConfirmDialog), Tailwind, Vitest, RxJS (`concat`, `last`, `switchMap`, `exhaustMap`).

**Convenciones del repo (igual que Plan 1):** aliases `@core/@shared/@features`; errores español sin leak vía `humanizeBackendError`; toasts vía `NotificationService` (`@core/services/notification.service`); tests Vitest globals; `npx vitest run <spec>` para uno, `npm test` para todos; commits convencionales `feat(sucursales): ...`.

**Contratos backend (confirmados):**
- `GET /api/v1/sucursales/employees` → `Employee[]` (lista plana).
- `GET /api/v1/sucursales/employees/{id}` → `Employee`.
- `POST /api/v1/sucursales/employees` body `{ firstName, lastName, document, isBiochemist, registration?, userId? }` → `Employee` (rol ADMINISTRADOR).
- `PUT /api/v1/sucursales/employees/{id}` mismo body → `Employee`.
- `PATCH /api/v1/sucursales/employees/{id}/status` **sin body** → `Employee` (toggle activo/inactivo).
- `EmployeeResponse` = `{ id, firstName, lastName, document, isBiochemist, registration, userId, active }` (**no incluye contactos**).
- Contactos: `GET/POST /api/v1/sucursales/employees/{employeeId}/contacts`, `PUT/DELETE …/contacts/{contactId}`. Body `{ contactType, value }`. `EmployeeContactResponse` = `{ id, employeeId, contactType, value }`.
- `ContactType` ∈ `PHONE | MOBILE | EMAIL | WHATSAPP | FAX | WEBSITE`.
- **No hay DELETE de empleado** (solo PATCH status).

---

## File Structure

**Crear:**
- `src/app/features/sucursales/models/employee.model.ts`
- `src/app/features/sucursales/services/employee.service.ts`
- `src/app/features/sucursales/store/employee.state.ts`
- `src/app/features/sucursales/store/employee.actions.ts`
- `src/app/features/sucursales/store/employee.reducer.ts` (+ `.spec.ts`)
- `src/app/features/sucursales/store/employee.selectors.ts` (+ `.spec.ts`)
- `src/app/features/sucursales/store/employee.effects.ts` (+ `.spec.ts`)
- `src/app/features/sucursales/pages/empleado-form/employee-form-steps.ts`
- `src/app/features/sucursales/pages/empleado-form/steps/datos-step/datos-step.component.ts`
- `src/app/features/sucursales/pages/empleado-form/steps/contactos-step/contactos-step.component.ts`
- `src/app/features/sucursales/pages/empleado-form/steps/resumen-step/resumen-step.component.ts`
- `src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts` (+ `.spec.ts`)
- `src/app/features/sucursales/pages/empleados-list/empleados-list.page.ts` (+ `.spec.ts`)
- `src/app/features/sucursales/sucursales-shell/sucursales-shell.component.ts`

**Modificar:**
- `src/app/features/sucursales/sucursales.routes.ts` — añadir shell de tabs + rutas de empleados + registro del store `employees`.
- `src/app/layout/sidebar/sidebar.nav.ts` — item "Sucursales" pasa a apuntar a `/sucursales`.

---

## Task 1: Modelo y service de Empleados (con contactos)

**Files:**
- Create: `src/app/features/sucursales/models/employee.model.ts`
- Create: `src/app/features/sucursales/services/employee.service.ts`

- [ ] **Step 1: Crear el modelo**

`src/app/features/sucursales/models/employee.model.ts`:
```ts
export type EmployeeContactType = 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration: string | null;
  userId: number | null;
  active: boolean;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  document: string;
  isBiochemist: boolean;
  registration?: string | null;
  // userId omitido a propósito: empleado es catálogo aparte (sin vínculo a login).
}

export type UpdateEmployeeRequest = CreateEmployeeRequest;

export interface EmployeeContact {
  id: number;
  employeeId: number;
  contactType: EmployeeContactType;
  value: string;
}

/** Payload para crear/editar un contacto (sin id ni employeeId). */
export interface EmployeeContactInput {
  contactType: EmployeeContactType;
  value: string;
}
```

- [ ] **Step 2: Crear el service**

`src/app/features/sucursales/services/employee.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, UpdateEmployeeRequest,
} from '../models/employee.model';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/sucursales/employees';

  list(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.baseUrl);
  }
  getById(id: number): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/${id}`);
  }
  create(req: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, req);
  }
  update(id: number, req: UpdateEmployeeRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/${id}`, req);
  }
  toggleStatus(id: number): Observable<Employee> {
    return this.http.patch<Employee>(`${this.baseUrl}/${id}/status`, {});
  }

  // --- Contactos ---
  listContacts(employeeId: number): Observable<EmployeeContact[]> {
    return this.http.get<EmployeeContact[]>(`${this.baseUrl}/${employeeId}/contacts`);
  }
  addContact(employeeId: number, input: EmployeeContactInput): Observable<EmployeeContact> {
    return this.http.post<EmployeeContact>(`${this.baseUrl}/${employeeId}/contacts`, input);
  }
  updateContact(employeeId: number, contactId: number, input: EmployeeContactInput): Observable<EmployeeContact> {
    return this.http.put<EmployeeContact>(`${this.baseUrl}/${employeeId}/contacts/${contactId}`, input);
  }
  removeContact(employeeId: number, contactId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${employeeId}/contacts/${contactId}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/sucursales/models/employee.model.ts src/app/features/sucursales/services/employee.service.ts
git commit -m "feat(sucursales): modelo Employee y EmployeeService con contactos"
```

---

## Task 2: Store de Empleados — state y actions

**Files:**
- Create: `src/app/features/sucursales/store/employee.state.ts`
- Create: `src/app/features/sucursales/store/employee.actions.ts`

- [ ] **Step 1: Crear el state**

`src/app/features/sucursales/store/employee.state.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { Employee, EmployeeContact } from '../models/employee.model';

export interface EmployeeState {
  items: Employee[];
  selected: Employee | null;
  selectedContacts: EmployeeContact[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialEmployeeState: EmployeeState = {
  items: [],
  selected: null,
  selectedContacts: [],
  pending: false,
  error: null,
};

export const EMPLOYEE_FEATURE_KEY = 'employees';
```

- [ ] **Step 2: Crear las actions**

`src/app/features/sucursales/store/employee.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, UpdateEmployeeRequest,
} from '../models/employee.model';

// List
export const loadEmployees = createAction('[Employees Page] Load Employees');
export const loadEmployeesSuccess = createAction(
  '[Employees API] Load Employees Success', props<{ employees: Employee[] }>());
export const loadEmployeesFailure = createAction(
  '[Employees API] Load Employees Failure', props<{ error: HttpErrorResponse }>());

// Detail (employee + contacts)
export const loadEmployee = createAction('[Employee Form] Load Employee', props<{ id: number }>());
export const loadEmployeeSuccess = createAction(
  '[Employees API] Load Employee Success', props<{ employee: Employee }>());
export const loadEmployeeFailure = createAction(
  '[Employees API] Load Employee Failure', props<{ error: HttpErrorResponse }>());

export const loadEmployeeContacts = createAction(
  '[Employee Form] Load Employee Contacts', props<{ employeeId: number }>());
export const loadEmployeeContactsSuccess = createAction(
  '[Employees API] Load Employee Contacts Success', props<{ contacts: EmployeeContact[] }>());
export const loadEmployeeContactsFailure = createAction(
  '[Employees API] Load Employee Contacts Failure', props<{ error: HttpErrorResponse }>());

export const clearSelectedEmployee = createAction('[Employee Form] Clear Selected');

// Add (employee + contactos en una orquestación)
export const addEmployee = createAction(
  '[Employee Form] Add Employee',
  props<{ req: CreateEmployeeRequest; contacts: EmployeeContactInput[] }>());
export const addEmployeeSuccess = createAction(
  '[Employees API] Add Employee Success', props<{ employee: Employee }>());
export const addEmployeeFailure = createAction(
  '[Employees API] Add Employee Failure', props<{ error: HttpErrorResponse }>());

// Update (employee + reconciliación de contactos)
export const updateEmployee = createAction(
  '[Employee Form] Update Employee',
  props<{
    id: number;
    req: UpdateEmployeeRequest;
    toCreate: EmployeeContactInput[];
    toUpdate: { contactId: number; input: EmployeeContactInput }[];
    toDelete: number[];
  }>());
export const updateEmployeeSuccess = createAction(
  '[Employees API] Update Employee Success', props<{ employee: Employee }>());
export const updateEmployeeFailure = createAction(
  '[Employees API] Update Employee Failure', props<{ error: HttpErrorResponse }>());

// Toggle status (PATCH devuelve el Employee actualizado)
export const toggleEmployeeStatus = createAction(
  '[Employee Row] Toggle Employee Status', props<{ id: number }>());
export const toggleEmployeeStatusSuccess = createAction(
  '[Employees API] Toggle Employee Status Success', props<{ employee: Employee }>());
export const toggleEmployeeStatusFailure = createAction(
  '[Employees API] Toggle Employee Status Failure', props<{ error: HttpErrorResponse }>());
```

- [ ] **Step 3: Commit**

```bash
git add src/app/features/sucursales/store/employee.state.ts src/app/features/sucursales/store/employee.actions.ts
git commit -m "feat(sucursales): store state y actions de Employee"
```

---

## Task 3: Reducer de Empleados (TDD)

**Files:**
- Create: `src/app/features/sucursales/store/employee.reducer.ts`
- Test: `src/app/features/sucursales/store/employee.reducer.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/sucursales/store/employee.reducer.spec.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import { employeeReducer } from './employee.reducer';
import { initialEmployeeState } from './employee.state';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployeeSuccess, loadEmployeeContactsSuccess, clearSelectedEmployee,
  addEmployee, addEmployeeSuccess,
  updateEmployeeSuccess, toggleEmployeeStatusSuccess,
} from './employee.actions';
import { Employee, EmployeeContact } from '../models/employee.model';

const mk = (id: number, active = true): Employee => ({
  id, firstName: `f${id}`, lastName: `l${id}`, document: `${id}`,
  isBiochemist: false, registration: null, userId: null, active,
});
const contact = (id: number): EmployeeContact => ({ id, employeeId: 1, contactType: 'EMAIL', value: `c${id}@x.com` });

describe('employeeReducer', () => {
  it('loadEmployees sets pending and clears error', () => {
    const next = employeeReducer({ ...initialEmployeeState, error: { status: 1 } as HttpErrorResponse }, loadEmployees());
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadEmployeesSuccess stores items, clears pending', () => {
    const next = employeeReducer({ ...initialEmployeeState, pending: true }, loadEmployeesSuccess({ employees: [mk(1)] }));
    expect(next.items.length).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadEmployeesFailure stores error', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = employeeReducer({ ...initialEmployeeState, pending: true }, loadEmployeesFailure({ error: err }));
    expect(next.error).toBe(err);
    expect(next.pending).toBe(false);
  });

  it('loadEmployeeSuccess stores selected', () => {
    const next = employeeReducer(initialEmployeeState, loadEmployeeSuccess({ employee: mk(9) }));
    expect(next.selected?.id).toBe(9);
  });

  it('loadEmployeeContactsSuccess stores selectedContacts', () => {
    const next = employeeReducer(initialEmployeeState, loadEmployeeContactsSuccess({ contacts: [contact(1)] }));
    expect(next.selectedContacts.length).toBe(1);
  });

  it('addEmployee sets pending; addEmployeeSuccess appends', () => {
    const after = employeeReducer(initialEmployeeState, addEmployee({
      req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false }, contacts: [],
    }));
    expect(after.pending).toBe(true);
    const final = employeeReducer({ ...after, items: [mk(2)] }, addEmployeeSuccess({ employee: mk(1) }));
    expect(final.items.map((e) => e.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('updateEmployeeSuccess replaces by id and updates selected', () => {
    const before = { ...initialEmployeeState, items: [mk(1), mk(2)], selected: mk(1) };
    const updated = { ...mk(1), firstName: 'changed' };
    const next = employeeReducer(before, updateEmployeeSuccess({ employee: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('toggleEmployeeStatusSuccess replaces the item with the returned employee', () => {
    const before = { ...initialEmployeeState, items: [mk(1, true)] };
    const next = employeeReducer(before, toggleEmployeeStatusSuccess({ employee: mk(1, false) }));
    expect(next.items[0].active).toBe(false);
  });

  it('clearSelectedEmployee resets selected and contacts', () => {
    const before = { ...initialEmployeeState, selected: mk(1), selectedContacts: [contact(1)] };
    const next = employeeReducer(before, clearSelectedEmployee());
    expect(next.selected).toBeNull();
    expect(next.selectedContacts).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.reducer.spec.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar el reducer**

`src/app/features/sucursales/store/employee.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { EmployeeState, initialEmployeeState } from './employee.state';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployee, loadEmployeeSuccess, loadEmployeeFailure,
  loadEmployeeContacts, loadEmployeeContactsSuccess, loadEmployeeContactsFailure,
  clearSelectedEmployee,
  addEmployee, addEmployeeSuccess, addEmployeeFailure,
  updateEmployee, updateEmployeeSuccess, updateEmployeeFailure,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess, toggleEmployeeStatusFailure,
} from './employee.actions';

export const employeeReducer = createReducer(
  initialEmployeeState,

  // Intent → pending
  on(loadEmployees, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(loadEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(addEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(updateEmployee, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  on(toggleEmployeeStatus, (s): EmployeeState => ({ ...s, pending: true, error: null })),
  // loadEmployeeContacts NO toca pending (carga secundaria del form de edición).
  on(loadEmployeeContacts, (s): EmployeeState => ({ ...s, error: null })),

  // Success
  on(loadEmployeesSuccess, (s, { employees }): EmployeeState => ({ ...s, items: employees, pending: false, error: null })),
  on(loadEmployeeSuccess, (s, { employee }): EmployeeState => ({ ...s, selected: employee, pending: false, error: null })),
  on(loadEmployeeContactsSuccess, (s, { contacts }): EmployeeState => ({ ...s, selectedContacts: contacts, error: null })),
  on(addEmployeeSuccess, (s, { employee }): EmployeeState => ({ ...s, items: [...s.items, employee], pending: false, error: null })),
  on(updateEmployeeSuccess, (s, { employee }): EmployeeState => ({
    ...s,
    items: s.items.map((e) => (e.id === employee.id ? employee : e)),
    selected: s.selected?.id === employee.id ? employee : s.selected,
    pending: false, error: null,
  })),
  on(toggleEmployeeStatusSuccess, (s, { employee }): EmployeeState => ({
    ...s, items: s.items.map((e) => (e.id === employee.id ? employee : e)), pending: false, error: null,
  })),

  // Failure
  on(loadEmployeesFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(loadEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(loadEmployeeContactsFailure, (s, { error }): EmployeeState => ({ ...s, error })),
  on(addEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(updateEmployeeFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),
  on(toggleEmployeeStatusFailure, (s, { error }): EmployeeState => ({ ...s, pending: false, error })),

  on(clearSelectedEmployee, (s): EmployeeState => ({ ...s, selected: null, selectedContacts: [] })),
);
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.reducer.spec.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/store/employee.reducer.ts src/app/features/sucursales/store/employee.reducer.spec.ts
git commit -m "feat(sucursales): reducer de Employee con tests"
```

---

## Task 4: Selectors de Empleados (TDD)

**Files:**
- Create: `src/app/features/sucursales/store/employee.selectors.ts`
- Test: `src/app/features/sucursales/store/employee.selectors.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/sucursales/store/employee.selectors.spec.ts`:
```ts
import {
  selectAllEmployees, selectSelectedEmployee, selectSelectedEmployeeContacts,
  selectEmployeePending, selectEmployeeError,
} from './employee.selectors';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from './employee.state';

describe('employee selectors', () => {
  const state = {
    [EMPLOYEE_FEATURE_KEY]: {
      ...initialEmployeeState,
      items: [{ id: 1 } as never],
      selectedContacts: [{ id: 9 } as never],
      pending: true,
    },
  } as never;

  it('selectAllEmployees returns items', () => {
    expect(selectAllEmployees(state)).toEqual([{ id: 1 }]);
  });
  it('selectSelectedEmployeeContacts returns contacts', () => {
    expect(selectSelectedEmployeeContacts(state)).toEqual([{ id: 9 }]);
  });
  it('selectEmployeePending returns pending', () => {
    expect(selectEmployeePending(state)).toBe(true);
  });
  it('selectEmployeeError returns error', () => {
    expect(selectEmployeeError(state)).toBeNull();
  });
  it('selectSelectedEmployee returns null when none', () => {
    expect(selectSelectedEmployee(state)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.selectors.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar selectors**

`src/app/features/sucursales/store/employee.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EMPLOYEE_FEATURE_KEY, EmployeeState } from './employee.state';

export const selectEmployeeState = createFeatureSelector<EmployeeState>(EMPLOYEE_FEATURE_KEY);

export const selectAllEmployees = createSelector(selectEmployeeState, (s) => s.items);
export const selectSelectedEmployee = createSelector(selectEmployeeState, (s) => s.selected);
export const selectSelectedEmployeeContacts = createSelector(selectEmployeeState, (s) => s.selectedContacts);
export const selectEmployeePending = createSelector(selectEmployeeState, (s) => s.pending);
export const selectEmployeeError = createSelector(selectEmployeeState, (s) => s.error);
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.selectors.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/store/employee.selectors.ts src/app/features/sucursales/store/employee.selectors.spec.ts
git commit -m "feat(sucursales): selectors de Employee con tests"
```

---

## Task 5: Effects de Empleados con orquestación de contactos (TDD)

**Files:**
- Create: `src/app/features/sucursales/store/employee.effects.ts`
- Test: `src/app/features/sucursales/store/employee.effects.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`src/app/features/sucursales/store/employee.effects.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { EmployeeEffects } from './employee.effects';
import { EmployeeService } from '../services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadEmployees, loadEmployeesSuccess,
  addEmployee, addEmployeeSuccess,
  updateEmployee, updateEmployeeSuccess,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess,
} from './employee.actions';
import { Employee } from '../models/employee.model';

const emp: Employee = { id: 1, firstName: 'a', lastName: 'b', document: '1', isBiochemist: false, registration: null, userId: null, active: true };

describe('EmployeeEffects', () => {
  let actions$: Observable<Action>;
  let svc: Record<string, ReturnType<typeof vi.fn>>;
  const notify = { error: vi.fn(), success: vi.fn() };

  beforeEach(() => {
    svc = {
      list: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleStatus: vi.fn(),
      listContacts: vi.fn(), addContact: vi.fn(), updateContact: vi.fn(), removeContact: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        EmployeeEffects,
        provideMockActions(() => actions$),
        { provide: EmployeeService, useValue: svc },
        { provide: NotificationService, useValue: notify },
      ],
    });
  });

  it('loadEmployees$ maps to loadEmployeesSuccess', () =>
    new Promise<void>((resolve) => {
      svc.list.mockReturnValue(of([emp]));
      actions$ = of(loadEmployees());
      TestBed.inject(EmployeeEffects).loadEmployees$.subscribe((a) => {
        expect(a).toEqual(loadEmployeesSuccess({ employees: [emp] }));
        resolve();
      });
    }));

  it('addEmployee$ creates employee then its contacts and emits addEmployeeSuccess', () =>
    new Promise<void>((resolve) => {
      svc.create.mockReturnValue(of(emp));
      svc.addContact.mockReturnValue(of({ id: 7, employeeId: 1, contactType: 'EMAIL', value: 'x@x.com' }));
      actions$ = of(addEmployee({
        req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false },
        contacts: [{ contactType: 'EMAIL', value: 'x@x.com' }],
      }));
      TestBed.inject(EmployeeEffects).addEmployee$.subscribe((a) => {
        expect(a).toEqual(addEmployeeSuccess({ employee: emp }));
        expect(svc.addContact).toHaveBeenCalledWith(1, { contactType: 'EMAIL', value: 'x@x.com' });
        resolve();
      });
    }));

  it('addEmployee$ with no contacts still emits success without calling addContact', () =>
    new Promise<void>((resolve) => {
      svc.create.mockReturnValue(of(emp));
      actions$ = of(addEmployee({ req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: false }, contacts: [] }));
      TestBed.inject(EmployeeEffects).addEmployee$.subscribe((a) => {
        expect(a).toEqual(addEmployeeSuccess({ employee: emp }));
        expect(svc.addContact).not.toHaveBeenCalled();
        resolve();
      });
    }));

  it('updateEmployee$ updates then reconciles contacts (delete/update/create) and emits success', () =>
    new Promise<void>((resolve) => {
      svc.update.mockReturnValue(of(emp));
      svc.removeContact.mockReturnValue(of(undefined));
      svc.updateContact.mockReturnValue(of({ id: 2, employeeId: 1, contactType: 'PHONE', value: '11' }));
      svc.addContact.mockReturnValue(of({ id: 3, employeeId: 1, contactType: 'EMAIL', value: 'n@x.com' }));
      actions$ = of(updateEmployee({
        id: 1,
        req: { firstName: 'a', lastName: 'b', document: '1', isBiochemist: true },
        toCreate: [{ contactType: 'EMAIL', value: 'n@x.com' }],
        toUpdate: [{ contactId: 2, input: { contactType: 'PHONE', value: '11' } }],
        toDelete: [9],
      }));
      TestBed.inject(EmployeeEffects).updateEmployee$.subscribe((a) => {
        expect(a).toEqual(updateEmployeeSuccess({ employee: emp }));
        expect(svc.removeContact).toHaveBeenCalledWith(1, 9);
        expect(svc.updateContact).toHaveBeenCalledWith(1, 2, { contactType: 'PHONE', value: '11' });
        expect(svc.addContact).toHaveBeenCalledWith(1, { contactType: 'EMAIL', value: 'n@x.com' });
        resolve();
      });
    }));

  it('toggleEmployeeStatus$ maps to success with returned employee', () =>
    new Promise<void>((resolve) => {
      svc.toggleStatus.mockReturnValue(of({ ...emp, active: false }));
      actions$ = of(toggleEmployeeStatus({ id: 1 }));
      TestBed.inject(EmployeeEffects).toggleEmployeeStatus$.subscribe((a) => {
        expect(a).toEqual(toggleEmployeeStatusSuccess({ employee: { ...emp, active: false } }));
        resolve();
      });
    }));
});
```

- [ ] **Step 2: Correr (debe fallar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.effects.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar effects**

`src/app/features/sucursales/store/employee.effects.ts`:
```ts
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, concat, concatMap, exhaustMap, last, map, Observable, of, switchMap } from 'rxjs';
import { EmployeeService } from '../services/employee.service';
import { NotificationService } from '@core/services/notification.service';
import {
  loadEmployees, loadEmployeesSuccess, loadEmployeesFailure,
  loadEmployee, loadEmployeeSuccess, loadEmployeeFailure,
  loadEmployeeContacts, loadEmployeeContactsSuccess, loadEmployeeContactsFailure,
  addEmployee, addEmployeeSuccess, addEmployeeFailure,
  updateEmployee, updateEmployeeSuccess, updateEmployeeFailure,
  toggleEmployeeStatus, toggleEmployeeStatusSuccess, toggleEmployeeStatusFailure,
} from './employee.actions';

@Injectable()
export class EmployeeEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(EmployeeService);
  private readonly notifications = inject(NotificationService);

  /** Corre operaciones HTTP en serie; emite una vez al terminar todas (o inmediato si no hay). */
  private runOps(ops: Observable<unknown>[]): Observable<unknown> {
    return ops.length ? concat(...ops).pipe(last()) : of(null);
  }

  loadEmployees$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployees),
      switchMap(() =>
        this.service.list().pipe(
          map((employees) => loadEmployeesSuccess({ employees })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudieron cargar los empleados.');
            return of(loadEmployeesFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployee),
      switchMap(({ id }) =>
        this.service.getById(id).pipe(
          map((employee) => loadEmployeeSuccess({ employee })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cargar el empleado.');
            return of(loadEmployeeFailure({ error }));
          }),
        ),
      ),
    ),
  );

  loadEmployeeContacts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadEmployeeContacts),
      switchMap(({ employeeId }) =>
        this.service.listContacts(employeeId).pipe(
          map((contacts) => loadEmployeeContactsSuccess({ contacts })),
          catchError((error: HttpErrorResponse) => of(loadEmployeeContactsFailure({ error }))),
        ),
      ),
    ),
  );

  addEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addEmployee),
      exhaustMap(({ req, contacts }) =>
        this.service.create(req).pipe(
          switchMap((employee) =>
            this.runOps(contacts.map((c) => this.service.addContact(employee.id, c))).pipe(
              map(() => addEmployeeSuccess({ employee })),
              catchError(() => {
                this.notifications.error('El empleado se creó, pero algunos contactos no se guardaron.');
                return of(addEmployeeSuccess({ employee }));
              }),
            ),
          ),
          catchError((error: HttpErrorResponse) => of(addEmployeeFailure({ error }))),
        ),
      ),
    ),
  );

  updateEmployee$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateEmployee),
      exhaustMap(({ id, req, toCreate, toUpdate, toDelete }) =>
        this.service.update(id, req).pipe(
          switchMap((employee) => {
            const ops: Observable<unknown>[] = [
              ...toDelete.map((cid) => this.service.removeContact(id, cid)),
              ...toUpdate.map((u) => this.service.updateContact(id, u.contactId, u.input)),
              ...toCreate.map((c) => this.service.addContact(id, c)),
            ];
            return this.runOps(ops).pipe(
              map(() => updateEmployeeSuccess({ employee })),
              catchError(() => {
                this.notifications.error('Los datos se guardaron, pero algunos contactos no.');
                return of(updateEmployeeSuccess({ employee }));
              }),
            );
          }),
          catchError((error: HttpErrorResponse) => of(updateEmployeeFailure({ error }))),
        ),
      ),
    ),
  );

  toggleEmployeeStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(toggleEmployeeStatus),
      concatMap(({ id }) =>
        this.service.toggleStatus(id).pipe(
          map((employee) => toggleEmployeeStatusSuccess({ employee })),
          catchError((error: HttpErrorResponse) => {
            this.notifications.error('No se pudo cambiar el estado del empleado.');
            return of(toggleEmployeeStatusFailure({ error }));
          }),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Correr (debe pasar)**

Run: `npx vitest run src/app/features/sucursales/store/employee.effects.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/store/employee.effects.ts src/app/features/sucursales/store/employee.effects.spec.ts
git commit -m "feat(sucursales): effects de Employee con orquestacion de contactos y tests"
```

---

## Task 6: Pasos del stepper de Empleado (Datos, Contactos, Resumen)

**Files:**
- Create: `src/app/features/sucursales/pages/empleado-form/employee-form-steps.ts`
- Create: `src/app/features/sucursales/pages/empleado-form/steps/datos-step/datos-step.component.ts`
- Create: `src/app/features/sucursales/pages/empleado-form/steps/contactos-step/contactos-step.component.ts`
- Create: `src/app/features/sucursales/pages/empleado-form/steps/resumen-step/resumen-step.component.ts`

- [ ] **Step 1: Definir los pasos**

`src/app/features/sucursales/pages/empleado-form/employee-form-steps.ts`:
```ts
import { FormStep } from '@shared/ui/models/form-step';

export const EMPLOYEE_FORM_STEPS: readonly FormStep[] = [
  { key: 'datos', title: 'Datos', subtitle: 'Nombre, documento y matrícula' },
  { key: 'contactos', title: 'Contactos', subtitle: 'Email, teléfono (opcional)' },
  { key: 'resumen', title: 'Resumen', subtitle: 'Revisá y confirmá' },
] as const;
```

- [ ] **Step 2: Paso Datos**

`src/app/features/sucursales/pages/empleado-form/steps/datos-step/datos-step.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitch } from 'primeng/toggleswitch';

@Component({
  selector: 'emp-datos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputTextModule, ToggleSwitch],
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
        <span class="text-sm font-medium">Documento *</span>
        <input pInputText formControlName="document" autocomplete="off" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">Matrícula</span>
        <input pInputText formControlName="registration" autocomplete="off" />
      </label>
      <label class="flex items-center gap-2 md:col-span-2">
        <p-toggleswitch formControlName="isBiochemist" />
        <span class="text-sm font-medium">Es bioquímico (puede firmar resultados)</span>
      </label>
    </div>
  `,
})
export class DatosStepComponent {
  readonly group = input.required<FormGroup>();
}
```

- [ ] **Step 3: Paso Contactos (FormArray editable)**

`src/app/features/sucursales/pages/empleado-form/steps/contactos-step/contactos-step.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { EmployeeContactType } from '../../../../models/employee.model';

@Component({
  selector: 'emp-contactos-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, Select],
  template: `
    <div class="max-w-3xl flex flex-col gap-3">
      @if (array().length === 0) {
        <p class="text-surface-500 text-sm">Sin contactos. Podés agregar email, teléfono, etc. (opcional).</p>
      }
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="group" class="flex items-end gap-2">
          <label class="flex flex-col gap-1 w-48">
            <span class="text-sm font-medium">Tipo</span>
            <p-select formControlName="contactType" [options]="typeOptions" optionLabel="label" optionValue="value" />
          </label>
          <label class="flex flex-col gap-1 flex-1">
            <span class="text-sm font-medium">Valor</span>
            <input pInputText formControlName="value" autocomplete="off" />
          </label>
          <p-button type="button" [text]="true" severity="danger" icon="pi pi-trash"
                    ariaLabel="Quitar contacto" (onClick)="remove(i)" />
        </div>
      }
      <div>
        <p-button type="button" label="Agregar contacto" icon="pi pi-plus" [text]="true" (onClick)="add()" />
      </div>
    </div>
  `,
})
export class ContactosStepComponent {
  private readonly fb = inject(FormBuilder);
  readonly array = input.required<FormArray<FormGroup>>();

  readonly typeOptions: { label: string; value: EmployeeContactType }[] = [
    { label: 'Email', value: 'EMAIL' },
    { label: 'Teléfono', value: 'PHONE' },
    { label: 'Celular', value: 'MOBILE' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Fax', value: 'FAX' },
    { label: 'Sitio web', value: 'WEBSITE' },
  ];

  add(): void {
    this.array().push(this.fb.group({
      id: [null as number | null],
      contactType: ['EMAIL' as EmployeeContactType, Validators.required],
      value: ['', Validators.required],
    }));
  }
  remove(i: number): void { this.array().removeAt(i); }
}
```

- [ ] **Step 4: Paso Resumen**

`src/app/features/sucursales/pages/empleado-form/steps/resumen-step/resumen-step.component.ts`:
```ts
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { EmployeeContactInput } from '../../../../models/employee.model';

export interface EmployeeSummaryView {
  firstName: string;
  lastName: string;
  document: string;
  registration: string | null;
  isBiochemist: boolean;
  contacts: EmployeeContactInput[];
}

@Component({
  selector: 'emp-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule],
  template: `
    <div class="max-w-2xl flex flex-col gap-5">
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold m-0">Datos del empleado</h3>
          <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(0)" />
        </div>
        <dl class="grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-surface-500">Nombre</dt><dd>{{ data().firstName }} {{ data().lastName }}</dd>
          <dt class="text-surface-500">Documento</dt><dd>{{ data().document }}</dd>
          <dt class="text-surface-500">Matrícula</dt><dd>{{ data().registration || '—' }}</dd>
          <dt class="text-surface-500">Bioquímico</dt><dd>{{ data().isBiochemist ? 'Sí' : 'No' }}</dd>
        </dl>
      </section>
      <section>
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold m-0">Contactos</h3>
          <p-button label="Editar" icon="pi pi-pencil" [text]="true" (onClick)="editStep.emit(1)" />
        </div>
        @if (data().contacts.length === 0) {
          <p class="text-surface-500 text-sm">Sin contactos.</p>
        } @else {
          <ul class="text-sm list-disc pl-5">
            @for (c of data().contacts; track $index) {
              <li>{{ typeLabel(c.contactType) }}: {{ c.value }}</li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class ResumenStepComponent {
  readonly data = input.required<EmployeeSummaryView>();
  readonly editStep = output<number>();

  typeLabel(t: string): string {
    const map: Record<string, string> = {
      EMAIL: 'Email', PHONE: 'Teléfono', MOBILE: 'Celular', WHATSAPP: 'WhatsApp', FAX: 'Fax', WEBSITE: 'Sitio web',
    };
    return map[t] ?? t;
  }
}
```

- [ ] **Step 5: Verificar build de tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores nuevos en los archivos creados.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/sucursales/pages/empleado-form/employee-form-steps.ts src/app/features/sucursales/pages/empleado-form/steps
git commit -m "feat(sucursales): pasos Datos, Contactos y Resumen del stepper de empleado"
```

---

## Task 7: Página stepper de Empleado (alta/edición con reconciliación de contactos)

**Files:**
- Create: `src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts`
- Test: `src/app/features/sucursales/pages/empleado-form/empleado-form.page.spec.ts`

- [ ] **Step 1: Implementar la página stepper**

`src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts`:
```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, HostListener, inject, input, OnDestroy, signal,
} from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { FormStepperHeaderComponent } from '@shared/ui/components/form-stepper-header/form-stepper-header.component';
import { humanizeBackendError } from '@shared/utils/error-messages';
import {
  addEmployee, addEmployeeSuccess, updateEmployee, updateEmployeeSuccess,
  loadEmployee, loadEmployeeContacts, clearSelectedEmployee,
} from '../../store/employee.actions';
import {
  selectEmployeePending, selectEmployeeError, selectSelectedEmployee, selectSelectedEmployeeContacts,
} from '../../store/employee.selectors';
import {
  CreateEmployeeRequest, Employee, EmployeeContact, EmployeeContactInput, EmployeeContactType,
} from '../../models/employee.model';
import { EMPLOYEE_FORM_STEPS } from './employee-form-steps';
import { DatosStepComponent } from './steps/datos-step/datos-step.component';
import { ContactosStepComponent } from './steps/contactos-step/contactos-step.component';
import { ResumenStepComponent, EmployeeSummaryView } from './steps/resumen-step/resumen-step.component';

interface ContactRow { id: number | null; contactType: EmployeeContactType; value: string; }

@Component({
  selector: 'emp-empleado-form-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, ButtonModule, ConfirmDialogModule,
    FormStepperHeaderComponent, DatosStepComponent, ContactosStepComponent, ResumenStepComponent,
  ],
  providers: [ConfirmationService],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
      <header class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-b sticky top-0 z-10">
        <p-button [text]="true" icon="pi pi-arrow-left" label="Volver" type="button" (onClick)="onBack()" />
        <h1 class="text-base font-semibold m-0">
          {{ isEdit() ? 'Editar empleado' : 'Nuevo empleado' }}
          @if (isEdit() && employee(); as e) {
            <span class="text-surface-500 font-normal ml-2">· {{ e.lastName }}, {{ e.firstName }}</span>
          }
        </h1>
        <nav class="ml-auto text-xs text-surface-500">Sucursales › Empleados › {{ isEdit() ? 'Editar' : 'Nuevo' }}</nav>
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
          @case (0) { <emp-datos-step [group]="datosGroup" /> }
          @case (1) { <emp-contactos-step [array]="contactosArray" /> }
          @case (2) { <emp-resumen-step [data]="summaryView()" (editStep)="goToStep($event)" /> }
        }
      </div>

      <footer class="flex items-center gap-3 px-6 py-3 bg-surface-0 border-t sticky bottom-0">
        <span class="text-xs text-surface-500">{{ formStatusLabel() }}</span>
        <span class="text-xs text-surface-400 ml-2">Paso {{ currentStep() + 1 }} de {{ steps.length }}</span>
        <div class="ml-auto flex flex-row-reverse gap-2">
          @if (showSubmitButton()) {
            <p-button [label]="isEdit() ? 'Guardar cambios' : 'Registrar empleado'" type="submit"
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
export class EmpleadoFormPage implements OnDestroy {
  readonly id = input<string | undefined>(undefined);

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly actions$ = inject(Actions);
  private readonly confirm = inject(ConfirmationService);

  readonly steps = EMPLOYEE_FORM_STEPS;

  readonly pending = this.store.selectSignal(selectEmployeePending);
  readonly saveError = this.store.selectSignal(selectEmployeeError);
  readonly employee = this.store.selectSignal(selectSelectedEmployee);
  private readonly contacts = this.store.selectSignal(selectSelectedEmployeeContacts);

  /** Snapshot de los contactos originales (para reconciliar en edición). */
  private originalContacts: EmployeeContact[] = [];

  readonly form: FormGroup = this.fb.group({
    datos: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      document: ['', Validators.required],
      registration: [''],
      isBiochemist: [false],
    }),
    contactos: this.fb.array<FormGroup>([]),
  });

  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => { const v = this.id(); return v != null && v !== ''; });
  readonly datosValid = computed(() => { void this.value(); void this.status(); return this.datosGroup.valid; });
  readonly contactosValid = computed(() => { void this.value(); void this.status(); return this.contactosArray.valid; });

  readonly currentStep = signal(0);
  readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep = computed(() => this.currentStep() === this.steps.length - 1);

  readonly canContinue = computed(() => {
    if (this.currentStep() === 0) return this.datosValid();
    if (this.currentStep() === 1) return this.contactosValid();
    return true;
  });
  readonly canSubmit = computed(() =>
    this.datosValid() && this.contactosValid() && !this.pending() && (this.isEdit() || this.isLastStep()));
  readonly showContinueButton = computed(() => !this.isLastStep() && !this.isEdit());
  readonly showSubmitButton = computed(() => this.isEdit() || this.isLastStep());

  readonly formStatusLabel = computed(() => {
    if (this.pending()) return 'Guardando…';
    void this.value();
    return this.form.dirty ? '● Cambios sin guardar' : 'Sin cambios';
  });

  readonly summaryView = computed<EmployeeSummaryView>(() => {
    void this.value();
    const d = this.datosGroup.getRawValue() as {
      firstName: string; lastName: string; document: string; registration: string; isBiochemist: boolean;
    };
    return {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      registration: d.registration || null, isBiochemist: d.isBiochemist,
      contacts: this.filledContacts().map((c) => ({ contactType: c.contactType, value: c.value })),
    };
  });

  get datosGroup(): FormGroup { return this.form.get('datos') as FormGroup; }
  get contactosArray(): FormArray<FormGroup> { return this.form.get('contactos') as FormArray<FormGroup>; }

  private hydratedForId: string | undefined = undefined;

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) {
        if (this.hydratedForId !== undefined) { this.resetForCreate(); this.hydratedForId = undefined; }
        return;
      }
      const numericId = Number(id);
      if (Number.isNaN(numericId)) { this.router.navigate(['/sucursales/empleados']); return; }
      if (this.hydratedForId !== id) {
        this.store.dispatch(loadEmployee({ id: numericId }));
        this.store.dispatch(loadEmployeeContacts({ employeeId: numericId }));
        this.hydratedForId = id;
      }
    });

    effect(() => {
      const e = this.employee();
      if (this.isEdit() && e && String(e.id) === this.id()) {
        this.hydrateDatos(e);
        this.visited.set(new Set([0, 1, 2]));
      }
    });

    effect(() => {
      const list = this.contacts();
      if (this.isEdit() && this.hydratedForId === this.id()) {
        this.hydrateContacts(list);
      }
    });

    this.actions$.pipe(ofType(addEmployeeSuccess, updateEmployeeSuccess), takeUntilDestroyed())
      .subscribe(() => this.router.navigateByUrl('/sucursales/empleados'));
  }

  goNext(): void {
    if (!this.canContinue()) {
      (this.currentStep() === 0 ? this.datosGroup : this.contactosArray).markAllAsTouched();
      return;
    }
    const next = Math.min(this.currentStep() + 1, this.steps.length - 1);
    this.currentStep.set(next);
    this.visited.update((s) => new Set(s).add(next));
  }
  goBack(): void { this.currentStep.set(Math.max(this.currentStep() - 1, 0)); }
  goToStep(i: number): void { if (this.visited().has(i)) this.currentStep.set(i); }

  private contactGroup(row: Partial<ContactRow>): FormGroup {
    return this.fb.group({
      id: [row.id ?? null],
      contactType: [(row.contactType ?? 'EMAIL') as EmployeeContactType, Validators.required],
      value: [row.value ?? '', Validators.required],
    });
  }

  private filledContacts(): ContactRow[] {
    return (this.contactosArray.getRawValue() as ContactRow[]).filter((c) => c.value?.trim());
  }

  private resetForCreate(): void {
    this.form.reset({ datos: { firstName: '', lastName: '', document: '', registration: '', isBiochemist: false } });
    this.contactosArray.clear();
    this.originalContacts = [];
    this.currentStep.set(0);
    this.visited.set(new Set([0]));
  }

  private hydrateDatos(e: Employee): void {
    this.datosGroup.patchValue({
      firstName: e.firstName, lastName: e.lastName, document: e.document,
      registration: e.registration ?? '', isBiochemist: e.isBiochemist,
    });
    this.form.markAsPristine();
  }

  private hydrateContacts(list: EmployeeContact[]): void {
    this.originalContacts = list;
    this.contactosArray.clear();
    for (const c of list) {
      this.contactosArray.push(this.contactGroup({ id: c.id, contactType: c.contactType, value: c.value }));
    }
    this.form.markAsPristine();
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    return humanizeBackendError(err, {
      fallback: 'No se pudo guardar el empleado.',
      byStatus: {
        409: 'Ya existe un empleado con ese documento.',
        400: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
        422: 'Algunos datos del empleado no son válidos. Revisalos e intentá de nuevo.',
        500: 'No se pudo guardar el empleado. Intentá de nuevo en unos minutos.',
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
    const d = this.datosGroup.getRawValue() as {
      firstName: string; lastName: string; document: string; registration: string; isBiochemist: boolean;
    };
    const req: CreateEmployeeRequest = {
      firstName: d.firstName, lastName: d.lastName, document: d.document,
      isBiochemist: d.isBiochemist, registration: d.registration?.trim() ? d.registration.trim() : null,
    };
    const rows = this.filledContacts();
    const editId = this.id();

    if (!editId) {
      const contacts: EmployeeContactInput[] = rows.map((r) => ({ contactType: r.contactType, value: r.value.trim() }));
      this.store.dispatch(addEmployee({ req, contacts }));
      return;
    }

    // Edición: reconciliar contactos contra el snapshot original.
    const toCreate: EmployeeContactInput[] = rows
      .filter((r) => r.id == null)
      .map((r) => ({ contactType: r.contactType, value: r.value.trim() }));
    const toUpdate = rows
      .filter((r) => r.id != null)
      .filter((r) => {
        const orig = this.originalContacts.find((o) => o.id === r.id);
        return orig && (orig.contactType !== r.contactType || orig.value !== r.value.trim());
      })
      .map((r) => ({ contactId: r.id as number, input: { contactType: r.contactType, value: r.value.trim() } }));
    const currentIds = new Set(rows.filter((r) => r.id != null).map((r) => r.id as number));
    const toDelete = this.originalContacts.filter((o) => !currentIds.has(o.id)).map((o) => o.id);

    this.store.dispatch(updateEmployee({ id: Number(editId), req, toCreate, toUpdate, toDelete }));
  }

  onBack(): void {
    if (!this.form.dirty) { this.router.navigate(['/sucursales/empleados']); return; }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar', rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/sucursales/empleados']),
    });
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedEmployee()); }
}
```

- [ ] **Step 2: Escribir el smoke test**

`src/app/features/sucursales/pages/empleado-form/empleado-form.page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EmpleadoFormPage } from './empleado-form.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { addEmployee } from '../../store/employee.actions';

describe('EmpleadoFormPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadoFormPage],
      providers: [
        provideMockStore({ initialState: { [EMPLOYEE_FEATURE_KEY]: initialEmployeeState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders "Nuevo empleado" in create mode', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).innerHTML).toContain('Nuevo empleado');
  });

  it('dispatches addEmployee with datos and contacts on submit (last step, valid)', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const cmp = fixture.componentInstance;
    cmp.datosGroup.setValue({ firstName: 'Eva', lastName: 'Ruiz', document: '30111222', registration: 'B-1', isBiochemist: true });
    cmp.goNext(); // → Contactos
    cmp.contactosArray.push(
      (cmp as unknown as { contactGroup: (r: unknown) => unknown })['contactGroup']({ contactType: 'EMAIL', value: 'eva@x.com' }) as never,
    );
    cmp.goNext(); // → Resumen (último)
    const spy = vi.spyOn(store, 'dispatch');
    cmp.onSubmit();
    expect(spy).toHaveBeenCalledWith(addEmployee({
      req: { firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: 'B-1' },
      contacts: [{ contactType: 'EMAIL', value: 'eva@x.com' }],
    }));
  });

  it('does not submit while Datos is invalid', () => {
    const fixture = TestBed.createComponent(EmpleadoFormPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onSubmit();
    expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ type: addEmployee.type }));
  });
});
```

- [ ] **Step 3: Correr el smoke test (debe pasar)**

Run: `npx vitest run src/app/features/sucursales/pages/empleado-form/empleado-form.page.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts src/app/features/sucursales/pages/empleado-form/empleado-form.page.spec.ts
git commit -m "feat(sucursales): stepper de alta/edicion de empleado con reconciliacion de contactos"
```

---

## Task 8: Página de listado de Empleados

**Files:**
- Create: `src/app/features/sucursales/pages/empleados-list/empleados-list.page.ts`
- Test: `src/app/features/sucursales/pages/empleados-list/empleados-list.page.spec.ts`

- [ ] **Step 1: Implementar la lista**

`src/app/features/sucursales/pages/empleados-list/empleados-list.page.ts`:
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
import { Employee } from '../../models/employee.model';
import { loadEmployees, toggleEmployeeStatus } from '../../store/employee.actions';
import { selectAllEmployees, selectEmployeePending } from '../../store/employee.selectors';

@Component({
  selector: 'emp-empleados-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [RouterLink, TableModule, ButtonModule, TagModule, TooltipModule, ConfirmDialogModule, EmptyStateComponent],
  template: `
    <div class="py-2">
      <header class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold m-0">Empleados</h2>
        <a [routerLink]="['/sucursales', 'empleados', 'nuevo']">
          <p-button label="Nuevo empleado" icon="pi pi-plus" />
        </a>
      </header>

      <p-table [value]="items()" [loading]="pending()" responsiveLayout="scroll" dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th>Empleado</th><th>Documento</th><th>Matrícula</th><th>Bioquímico</th><th>Estado</th>
            <th class="text-right" style="width:140px">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-e>
          <tr>
            <td>{{ e.lastName }}, {{ e.firstName }}</td>
            <td>{{ e.document }}</td>
            <td>{{ e.registration || '—' }}</td>
            <td>
              @if (e.isBiochemist) { <p-tag severity="info" value="Sí" /> } @else { <span class="text-surface-400">No</span> }
            </td>
            <td><p-tag [severity]="e.active ? 'success' : 'secondary'" [value]="e.active ? 'Activo' : 'Inactivo'" /></td>
            <td class="text-right">
              <a [routerLink]="['/sucursales', 'empleados', e.id, 'editar']">
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" />
              </a>
              <p-button [text]="true" icon="pi pi-refresh" pTooltip="Activar/Desactivar"
                        ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(e)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr>
            <td colspan="6">
              <a [routerLink]="['/sucursales', 'empleados', 'nuevo']">
                <ui-empty-state heading="Sin empleados" icon="pi-users"
                                description="Agregá el primer empleado del laboratorio." ctaLabel="Nuevo empleado" />
              </a>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <p-confirmDialog />
    </div>
  `,
})
export class EmpleadosListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly items = this.store.selectSignal(selectAllEmployees);
  readonly pending = this.store.selectSignal(selectEmployeePending);

  ngOnInit(): void { this.store.dispatch(loadEmployees()); }

  confirmToggle(e: Employee): void {
    const verb = e.active ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} empleado?`,
      message: `${e.lastName}, ${e.firstName}`,
      accept: () => this.store.dispatch(toggleEmployeeStatus({ id: e.id })),
    });
  }
}
```

- [ ] **Step 2: Escribir el smoke test**

`src/app/features/sucursales/pages/empleados-list/empleados-list.page.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { EmpleadosListPage } from './empleados-list.page';
import { EMPLOYEE_FEATURE_KEY, initialEmployeeState } from '../../store/employee.state';
import { loadEmployees } from '../../store/employee.actions';
import { Employee } from '../../models/employee.model';

const emp: Employee = { id: 8, firstName: 'Eva', lastName: 'Ruiz', document: '30111222', isBiochemist: true, registration: 'B-1', userId: null, active: true };

describe('EmpleadosListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpleadosListPage],
      providers: [
        provideMockStore({ initialState: { [EMPLOYEE_FEATURE_KEY]: { ...initialEmployeeState, items: [emp] } } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadEmployees on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    TestBed.createComponent(EmpleadosListPage).detectChanges();
    expect(spy).toHaveBeenCalledWith(loadEmployees());
  });

  it('renders the employee row and a link to edit', () => {
    const fixture = TestBed.createComponent(EmpleadosListPage);
    fixture.detectChanges();
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).toContain('Ruiz, Eva');
    expect(html).toMatch(/href="[^"]*\/sucursales\/empleados\/8\/editar"/);
  });
});
```

- [ ] **Step 3: Correr el smoke test (debe pasar)**

Run: `npx vitest run src/app/features/sucursales/pages/empleados-list/empleados-list.page.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 4: Commit**

```bash
git add src/app/features/sucursales/pages/empleados-list/empleados-list.page.ts src/app/features/sucursales/pages/empleados-list/empleados-list.page.spec.ts
git commit -m "feat(sucursales): pagina de listado de empleados"
```

---

## Task 9: Shell de tabs de Sucursales + rutas + sidebar

**Files:**
- Create: `src/app/features/sucursales/sucursales-shell/sucursales-shell.component.ts`
- Modify: `src/app/features/sucursales/sucursales.routes.ts`
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Crear el shell de tabs**

> Réplica del patrón de `EmpresaDashboardComponent` (header + nav de tabs + `<router-outlet>`).

`src/app/features/sucursales/sucursales-shell/sucursales-shell.component.ts`:
```ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'suc-sucursales-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="suc-shell__header">
      <small class="ui-text-muted">Gestión</small>
      <h1><i class="pi pi-building"></i> Sucursales</h1>
    </header>

    <nav class="suc-shell__tabs" role="tablist">
      <a routerLink="configuracion" routerLinkActive="is-active" role="tab">Sucursales</a>
      <a routerLink="empleados" routerLinkActive="is-active" role="tab">Empleados</a>
    </nav>

    <section class="suc-shell__body">
      <router-outlet />
    </section>
  `,
  styles: [`
    .suc-shell__header { padding: var(--space-6) var(--space-6) 0; }
    .suc-shell__header h1 { margin: var(--space-1) 0 var(--space-4); display: flex; align-items: center; gap: var(--space-2); }
    .suc-shell__tabs { display: flex; gap: var(--space-2); padding: 0 var(--space-6); border-bottom: 1px solid var(--ds-surface); overflow-x: auto; }
    .suc-shell__tabs a { padding: var(--space-3) var(--space-4); color: var(--ds-text-muted); text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; }
    .suc-shell__tabs a.is-active { color: var(--brand-primary); border-bottom-color: var(--brand-primary); font-weight: 600; }
    .suc-shell__body { padding: var(--space-6); }
  `],
})
export class SucursalesShellComponent {}
```

- [ ] **Step 2: Reescribir las rutas de sucursales**

> Mantiene la pantalla de sedes actual (`SucursalesConfiguracionComponent`) como tab "Sucursales" en `configuracion` (la URL `/sucursales/configuracion` sigue funcionando). Agrega la tab "Empleados" y las rutas full-page del stepper (fuera del shell). Registra el store `employees` en el padre para que lo compartan lista y stepper. Las rutas `lista` y `areas` preexistentes se conservan intactas como hermanas.

`src/app/features/sucursales/sucursales.routes.ts`:
```ts
import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { ConfirmationService, MessageService } from 'primeng/api';

import { roleGuard } from '@core/guards/role.guard';
import { sucursalReducer } from './store/sucursal.reducer';
import { SucursalEffects } from './store/sucursal.effects';
import { SUCURSAL_FEATURE_KEY } from './store/sucursal.state';
import { EMPLOYEE_FEATURE_KEY } from './store/employee.state';
import { employeeReducer } from './store/employee.reducer';
import { EmployeeEffects } from './store/employee.effects';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState(EMPLOYEE_FEATURE_KEY, employeeReducer),
      provideEffects(EmployeeEffects),
    ],
    children: [
      // Stepper full-page (fuera del shell, sin tabs). Va antes que el shell ('') para
      // que '/sucursales/empleados/nuevo' matchee acá y no contra el tab 'empleados'.
      {
        path: 'empleados/nuevo',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },
      {
        path: 'empleados/:id/editar',
        canMatch: [roleGuard('ADMINISTRADOR')],
        loadComponent: () =>
          import('./pages/empleado-form/empleado-form.page').then((m) => m.EmpleadoFormPage),
      },

      // Rutas preexistentes conservadas (no linkeadas en el sidebar, intactas).
      {
        path: 'lista',
        loadComponent: () => import('./pages/sucursales/sucursales.component').then((m) => m.SucursalesPageComponent),
      },
      {
        path: 'areas',
        loadComponent: () => import('./pages/areas/areas.component').then((m) => m.AreasComponent),
      },

      // Shell con tabs.
      {
        path: '',
        loadComponent: () =>
          import('./sucursales-shell/sucursales-shell.component').then((m) => m.SucursalesShellComponent),
        children: [
          { path: '', redirectTo: 'configuracion', pathMatch: 'full' },
          {
            path: 'configuracion',
            canMatch: [roleGuard('ADMINISTRADOR')],
            loadComponent: () =>
              import('./pages/configuracion/sucursales-configuracion.component')
                .then((m) => m.SucursalesConfiguracionComponent),
            providers: [
              provideState(SUCURSAL_FEATURE_KEY, sucursalReducer),
              provideEffects([SucursalEffects]),
              MessageService,
              ConfirmationService,
            ],
          },
          {
            path: 'empleados',
            canMatch: [roleGuard('ADMINISTRADOR')],
            loadComponent: () =>
              import('./pages/empleados-list/empleados-list.page').then((m) => m.EmpleadosListPage),
          },
        ],
      },
    ],
  },
];
```

- [ ] **Step 3: Actualizar el sidebar (item Sucursales → `/sucursales`)**

En `src/app/layout/sidebar/sidebar.nav.ts`, reemplazar la línea del item "Sucursales":
```ts
{ kind: 'link', label: 'Sucursales', icon: 'pi pi-building', path: '/sucursales/configuracion', roleKey: 'ADMINISTRADOR' },
```
por:
```ts
{ kind: 'link', label: 'Sucursales', icon: 'pi pi-building', path: '/sucursales', roleKey: 'ADMINISTRADOR' },
```

- [ ] **Step 4: Verificar build de tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/sucursales/sucursales-shell src/app/features/sucursales/sucursales.routes.ts src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(sucursales): shell de tabs (Sucursales | Empleados) y wire-up del store"
```

---

## Task 10: Verificación integral

- [ ] **Step 1: Correr toda la suite de tests**

Run: `npm test`
Expected: todos los specs en verde (incluidos los nuevos de `sucursales/store` y páginas de empleados, y los del Plan 1).

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni templates.

- [ ] **Step 3: Smoke manual**

1. Levantar app + backend; loguear como `ADMINISTRADOR`.
2. Sidebar → "Sucursales" → ver el shell con tabs **Sucursales | Empleados**. La tab "Sucursales" muestra la pantalla de sedes de siempre.
3. Tab "Empleados" → lista (vacía o con datos).
4. "Nuevo empleado" → Datos → Continuar → Contactos (agregar 1-2) → Continuar → Resumen → "Registrar empleado". Vuelve a la lista; verificar el alta y que los contactos quedaron guardados (reabrir en edición).
5. Editar un empleado: cambiar datos, agregar un contacto, borrar otro, editar un tercero → "Guardar cambios". Verificar que la reconciliación impactó (reabrir).
6. Activar/Desactivar desde la fila (con confirm).
7. Forzar error (documento duplicado) → mensaje en español sin leak.

- [ ] **Step 4: Commit final (si hubo ajustes del smoke)**

```bash
git add -A
git commit -m "test(sucursales): verificacion integral del ABM de empleados"
```

---

## Self-Review (cobertura del spec)

- **§4.3 Empleados como tab en shell de Sucursales** → Task 9. ✅
- **§4.3 stepper Datos/Contactos/Resumen** → Tasks 6, 7. ✅
- **§4.3 ABM + contactos (sub-CRUD)** → service (Task 1), orquestación en effects (Task 5), reconciliación en submit (Task 7). ✅
- **§4.3 store employees (load/add/update/toggle + contactos)** → Tasks 2-5. ✅
- **§4.3 catálogo aparte (sin userId)** → `CreateEmployeeRequest` sin userId (Task 1). ✅
- **§4.2 patrón página stepper + `ui-form-stepper-header`** → Task 7 (usa el genérico del Plan 1). ✅
- **§6 errores español sin leak** → `humanizeBackendError` (Task 7) + `NotificationService` (Task 5). ✅
- **§6 tests reducers/effects/selectors + smoke** → Tasks 3, 4, 5, 7, 8. ✅
- **§4.3 listado SIN sucursal (diferida §10)** → la tabla de empleados no tiene columna/filtro de sucursal (Task 8). ✅
- **Gating ADMINISTRADOR** → `roleGuard('ADMINISTRADOR')` en rutas de empleados (Task 9). ✅
- **No tocar `pacientes`; no refactorizar dual-store de sucursales** → se reusa `SucursalesConfiguracionComponent`; `lista`/`areas` intactas (Task 9). ✅

**Type consistency check:** `EMPLOYEE_FEATURE_KEY='employees'`, acciones `add/update/toggle/loadEmployee(s)/loadEmployeeContacts`, selectors `selectAllEmployees/selectSelectedEmployee/selectSelectedEmployeeContacts/selectEmployeePending/selectEmployeeError`, service `list/getById/create/update/toggleStatus/listContacts/addContact/updateContact/removeContact` — usados consistentes en store, effects, páginas y specs. ✅

**Decisión menor:** la pantalla de sedes queda en la tab `configuracion` (URL `/sucursales/configuracion` preservada). Si se prefiere el path `/sucursales/sucursales`, es un cambio de 2 líneas en el shell + rutas.
