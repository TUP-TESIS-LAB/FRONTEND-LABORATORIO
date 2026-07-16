# Pacientes Feature Implementation Plan (v2 — aligned with project skills)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Pacientes feature in the Angular admin frontend, consuming the backend at `/api/v1/analitica/patients` (listing with filters and server-side pagination, alta/edición drawer with expandable sections, detail page with tabs, reusable search autocomplete, soft-delete toggle).

**Architecture:** Standalone feature at `src/app/features/pacientes/` with the project's monolithic layout (`models/`, `services/`, `store/`, `pages/`, `components/`). NgRx classic with global state registration via `provideState`/`provideEffects` in `app.config.ts`. PrimeNG + Tailwind for UI. Vitest for unit tests. Source code in **English 1:1 with backend** (firstName/lastName/dni/birthDate…); user-facing labels in Spanish.

**Tech Stack:** Angular 21 standalone + OnPush · NgRx Store + Effects · PrimeNG 21 · Tailwind 4 · Vitest 4 · TypeScript 5.9

**Spec:** [docs/superpowers/specs/2026-05-12-pacientes-feature-design.md](../specs/2026-05-12-pacientes-feature-design.md)

## Project skills that constrain every task

These are the project's `.claude/skills/` and they ALWAYS apply. Each subagent that touches code MUST respect them:

- **`ngrx-backend-request`** — every HTTP call goes through NgRx. State shape is `{ data..., pending: boolean, error: HttpErrorResponse | null }` with a SINGLE shared `pending` flag. Actions named `[Source] Event` with the triplet `loadX` / `loadXSuccess` / `loadXFailure` (or `addX` / `updateX` / `removeX` / `submitX`). Imports of actions are **named** (no `import * as`). Operators: `switchMap` for reads, `concatMap` for mutations (add/update/remove), `exhaustMap` for one-shot submits. `catchError` always inside the flattening operator. Components read via `selectSignal`, dispatch in `ngOnInit`, NOT in constructor. No `@ngrx/entity`, no `loaded` flag by default.
- **`angular-conventions`** — standalone + OnPush. Path aliases `@core`, `@shared`, `@layout`, `@features`. Reactive Forms exposed as signals via `toSignal(form.valueChanges)` + `toSignal(form.statusChanges)` + `computed()`. No methods in templates.
- **`laboratory-ui`** — `<p-button>` (not `<button pButton>`). Form to create/edit ONE atomic entity (Paciente) is a **`p-drawer position="left"` of ~50% width**, NOT a `p-dialog`. Mobile tables convert to card lists. Loading uses `p-skeleton`. Colors via CSS tokens `--brand-*` / `--ds-*`, never hardcoded hex or arbitrary Tailwind colors for branded surfaces.
- **Template control flow:** `@if` / `@for` / `@else` (Angular 17+). Never `*ngIf` / `*ngFor`.

**Backend folder note:** The backend lives in `../Backend/` (renamed from `laboratorio/`). This plan only touches the frontend; no backend changes required except a one-time seed for coverage planIds 1..7.

---

## Phase A — Models and service skeleton

### Task A1: Scaffold feature folder structure — ✅ DONE

(Commit `ddceb03` rolled this in with A2.)

### Task A2: Patient domain models — ✅ DONE

`src/app/features/pacientes/models/patient.model.ts` committed with `Patient`, `Contact`, `Address`, `Coverage`, `PatientStatus`, `Gender`, `SexAtBirth`, `ContactType`, `CreatePatientRequest`, `UpdatePatientRequest`.

---

### Task A3: Patient page request/result models

**Files:**
- Create: `src/app/features/pacientes/models/patient-page.model.ts`

- [ ] **Step 1: Write the file**

```ts
// src/app/features/pacientes/models/patient-page.model.ts
import { Patient, PatientStatus } from './patient.model';

export type PatientStateFilter = 'active' | 'inactive' | 'all';

export interface PatientPageRequest {
  q?: string;
  state: PatientStateFilter;
  status?: PatientStatus;
  page: number;
  size: number;
}

export interface PatientPageResult {
  content: Patient[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/models/patient-page.model.ts
git commit -m "feat(pacientes): add page request/result models"
```

---

### Task A4: Coverage plans local catalog stub

**Files:**
- Create: `src/app/features/pacientes/models/coverage-plans.catalog.ts`
- Create: `src/app/features/pacientes/models/coverage-plans.catalog.spec.ts`

- [ ] **Step 1: Write the catalog**

```ts
// src/app/features/pacientes/models/coverage-plans.catalog.ts
export interface CoveragePlanOption {
  planId: number;
  label: string;
}

/**
 * Local stub until the backend exposes a coverage-plans catalog endpoint.
 * Backend MUST have rows with these planIds seeded before alta with cobertura works.
 */
export const COVERAGE_PLAN_CATALOG: readonly CoveragePlanOption[] = [
  { planId: 1, label: 'Particular' },
  { planId: 2, label: 'OSDE 210' },
  { planId: 3, label: 'OSDE 310' },
  { planId: 4, label: 'Swiss Medical' },
  { planId: 5, label: 'PAMI' },
  { planId: 6, label: 'IOMA' },
  { planId: 7, label: 'Galeno' },
];

export const COVERAGE_PLAN_BY_ID: ReadonlyMap<number, CoveragePlanOption> = new Map(
  COVERAGE_PLAN_CATALOG.map((p) => [p.planId, p]),
);

export function getCoveragePlanLabel(planId: number | undefined | null): string {
  if (planId == null) return '—';
  return COVERAGE_PLAN_BY_ID.get(planId)?.label ?? `Plan #${planId}`;
}
```

- [ ] **Step 2: Write tests**

```ts
// src/app/features/pacientes/models/coverage-plans.catalog.spec.ts
import { COVERAGE_PLAN_CATALOG, getCoveragePlanLabel } from './coverage-plans.catalog';

describe('getCoveragePlanLabel', () => {
  it('returns label for known planId', () => {
    expect(getCoveragePlanLabel(2)).toBe('OSDE 210');
  });
  it('returns fallback for unknown planId', () => {
    expect(getCoveragePlanLabel(999)).toBe('Plan #999');
  });
  it('returns em-dash for null/undefined', () => {
    expect(getCoveragePlanLabel(null)).toBe('—');
    expect(getCoveragePlanLabel(undefined)).toBe('—');
  });
  it('catalog is non-empty', () => {
    expect(COVERAGE_PLAN_CATALOG.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests — expect 4 passed**

Run: `npx ng test --no-watch --include='**/coverage-plans.catalog.spec.ts'`

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/models/
git commit -m "feat(pacientes): add coverage plans catalog stub"
```

---

### Task A5: PatientService — HTTP layer

**Files:**
- Create: `src/app/features/pacientes/services/patient.service.ts`
- Create: `src/app/features/pacientes/services/patient.service.spec.ts`

Backend contract base path: `/api/v1/analitica/patients`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/features/pacientes/services/patient.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PatientService } from './patient.service';
import { Patient, CreatePatientRequest } from '../models/patient.model';

const mockPatient: Patient = {
  id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
  birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'COMPLETE', contacts: [], addresses: [], coverages: [], active: true,
};

describe('PatientService', () => {
  let service: PatientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PatientService],
    });
    service = TestBed.inject(PatientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('search builds query params including q', () => {
    service.search({ q: 'gar', state: 'active', page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/v1/analitica/patients/search' &&
        r.params.get('state') === 'active' &&
        r.params.get('page') === '0' &&
        r.params.get('size') === '20' &&
        r.params.get('q') === 'gar',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  });

  it('search omits q when undefined', () => {
    service.search({ state: 'active', page: 0, size: 20 }).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/patients/search');
    expect(req.request.params.has('q')).toBe(false);
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 });
  });

  it('getById hits /{id}', () => {
    service.getById(1).subscribe((p) => expect(p).toEqual(mockPatient));
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockPatient);
  });

  it('existsByDni unwraps { exists }', () => {
    let result: boolean | undefined;
    service.existsByDni('32456789').subscribe((r) => (result = r));
    const req = httpMock.expectOne(
      (r) => r.url === '/api/v1/analitica/patients/exists' && r.params.get('dni') === '32456789',
    );
    req.flush({ exists: true });
    expect(result).toBe(true);
  });

  it('create POSTs body', () => {
    const body: CreatePatientRequest = {
      dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      contacts: [], addresses: [], coverages: [],
    };
    service.create(body).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockPatient);
  });

  it('update PUTs to /{id}', () => {
    service.update(1, {
      firstName: 'María', lastName: 'García', birthDate: '1991-03-15',
      gender: 'FEMALE', sexAtBirth: 'FEMALE', contacts: [], addresses: [], coverages: [],
    }).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('PUT');
    req.flush(mockPatient);
  });

  it('toggleActive PATCHes { deleted } to /{id}', () => {
    service.toggleActive(1, true).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/patients/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ deleted: true });
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx ng test --no-watch --include='**/patient.service.spec.ts'`

- [ ] **Step 3: Implement the service**

```ts
// src/app/features/pacientes/services/patient.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/patients';

  search(req: PatientPageRequest): Observable<PatientPageResult> {
    let params = new HttpParams()
      .set('state', req.state)
      .set('page', req.page)
      .set('size', req.size);
    if (req.q) params = params.set('q', req.q);
    if (req.status) params = params.set('status', req.status);
    return this.http.get<PatientPageResult>(`${this.baseUrl}/search`, { params });
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`);
  }

  existsByDni(dni: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.baseUrl}/exists`, { params: { dni } })
      .pipe(map((r) => r.exists));
  }

  create(req: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, req);
  }

  update(id: number, req: UpdatePatientRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${id}`, req);
  }

  toggleActive(id: number, deleted: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}`, { deleted });
  }
}
```

- [ ] **Step 4: Run — expect 7 passed**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/services/
git commit -m "feat(pacientes): add PatientService"
```

---

## Phase B — Pipes (DNI and Age)

### Task B1: DniPipe

**Files:**
- Create: `src/app/shared/pipes/dni.pipe.ts`
- Create: `src/app/shared/pipes/dni.pipe.spec.ts`
- Modify: `src/app/shared/pipes/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/app/shared/pipes/dni.pipe.spec.ts
import { DniPipe } from './dni.pipe';

describe('DniPipe', () => {
  const pipe = new DniPipe();
  it('formats 8 digits as ##.###.###', () => { expect(pipe.transform('32456789')).toBe('32.456.789'); });
  it('formats 7 digits as #.###.###', () => { expect(pipe.transform('1234567')).toBe('1.234.567'); });
  it('strips non-digits before formatting', () => {
    expect(pipe.transform('32.456.789')).toBe('32.456.789');
    expect(pipe.transform('32-456-789')).toBe('32.456.789');
  });
  it('returns empty string for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });
  it('returns raw input when length < 7', () => { expect(pipe.transform('123')).toBe('123'); });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx ng test --no-watch --include='**/dni.pipe.spec.ts'`

- [ ] **Step 3: Implement**

```ts
// src/app/shared/pipes/dni.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dni', standalone: true })
export class DniPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '');
    if (digits.length < 7) return value;
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
```

- [ ] **Step 4: Run — expect 5 passed**

- [ ] **Step 5: Export from barrel**

Open `src/app/shared/pipes/index.ts` and add:

```ts
export * from './dni.pipe';
```

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/pipes/dni.pipe.ts src/app/shared/pipes/dni.pipe.spec.ts src/app/shared/pipes/index.ts
git commit -m "feat(shared): add DniPipe"
```

---

### Task B2: AgePipe

**Files:**
- Create: `src/app/shared/pipes/age.pipe.ts`
- Create: `src/app/shared/pipes/age.pipe.spec.ts`
- Modify: `src/app/shared/pipes/index.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/app/shared/pipes/age.pipe.spec.ts
import { AgePipe } from './age.pipe';

describe('AgePipe', () => {
  const pipe = new AgePipe();
  const today = new Date('2026-05-12T00:00:00Z');
  it('returns full years when birthday already passed this year', () => {
    expect(pipe.transform('1991-03-15', today)).toBe(35);
  });
  it('subtracts one year when birthday has not happened yet', () => {
    expect(pipe.transform('1991-08-15', today)).toBe(34);
  });
  it('handles birthday today', () => { expect(pipe.transform('2000-05-12', today)).toBe(26); });
  it('returns null for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });
  it('returns null for invalid date', () => { expect(pipe.transform('not-a-date')).toBeNull(); });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/app/shared/pipes/age.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'age', standalone: true })
export class AgePipe implements PipeTransform {
  transform(birthDate: string | null | undefined, now: Date = new Date()): number | null {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return null;
    let age = now.getFullYear() - d.getFullYear();
    const monthDiff = now.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
    return age;
  }
}
```

- [ ] **Step 4: Run — expect 5 passed**

- [ ] **Step 5: Export from barrel** — add `export * from './age.pipe';` to `src/app/shared/pipes/index.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/pipes/age.pipe.ts src/app/shared/pipes/age.pipe.spec.ts src/app/shared/pipes/index.ts
git commit -m "feat(shared): add AgePipe"
```

---

## Phase C — NgRx store (aligned to `ngrx-backend-request`)

### Task C1: PatientState

**Files:**
- Create: `src/app/features/pacientes/store/patient.state.ts`

Single `pending` and single `error`. `items` and `selected` are both "data" coexisting in the state.

- [ ] **Step 1: Write file**

```ts
// src/app/features/pacientes/store/patient.state.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Patient } from '../models/patient.model';
import { PatientPageRequest } from '../models/patient-page.model';

export interface PatientState {
  items: Patient[];
  totalElements: number;
  totalPages: number;
  pageRequest: PatientPageRequest;
  selected: Patient | null;
  dniCheck: { dni: string; exists: boolean } | null;
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialPatientState: PatientState = {
  items: [],
  totalElements: 0,
  totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  selected: null,
  dniCheck: null,
  pending: false,
  error: null,
};

export const PATIENT_FEATURE_KEY = 'patients';
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit -p tsconfig.app.json`

```bash
git add src/app/features/pacientes/store/patient.state.ts
git commit -m "feat(pacientes): add patient store state"
```

---

### Task C2: Patient actions

**Files:**
- Create: `src/app/features/pacientes/store/patient.actions.ts`

Use the project convention from `ngrx-backend-request`: `loadX` / `loadXSuccess` / `loadXFailure` for reads, `addX/updateX/removeX` for mutations, `submitX` for one-shot submits, source in brackets.

- [ ] **Step 1: Write file**

```ts
// src/app/features/pacientes/store/patient.actions.ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

// --- List (read) ---
export const loadPatients = createAction(
  '[Patients Page] Load Patients',
  props<{ req: PatientPageRequest }>(),
);
export const loadPatientsSuccess = createAction(
  '[Patients API] Load Patients Success',
  props<{ result: PatientPageResult }>(),
);
export const loadPatientsFailure = createAction(
  '[Patients API] Load Patients Failure',
  props<{ error: HttpErrorResponse }>(),
);

export const setPatientPageRequest = createAction(
  '[Patients Page] Set Page Request',
  props<{ patch: Partial<PatientPageRequest> }>(),
);

// --- Detail (read) ---
export const loadPatient = createAction(
  '[Patient Detail] Load Patient',
  props<{ id: number }>(),
);
export const loadPatientSuccess = createAction(
  '[Patients API] Load Patient Success',
  props<{ patient: Patient }>(),
);
export const loadPatientFailure = createAction(
  '[Patients API] Load Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);
export const clearSelectedPatient = createAction('[Patient Detail] Clear Selected');

// --- Add (submit, exhaustMap) ---
export const addPatient = createAction(
  '[Patient Form] Add Patient',
  props<{ req: CreatePatientRequest }>(),
);
export const addPatientSuccess = createAction(
  '[Patients API] Add Patient Success',
  props<{ patient: Patient }>(),
);
export const addPatientFailure = createAction(
  '[Patients API] Add Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Update (submit, exhaustMap) ---
export const updatePatient = createAction(
  '[Patient Form] Update Patient',
  props<{ id: number; req: UpdatePatientRequest }>(),
);
export const updatePatientSuccess = createAction(
  '[Patients API] Update Patient Success',
  props<{ patient: Patient }>(),
);
export const updatePatientFailure = createAction(
  '[Patients API] Update Patient Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- DNI check (read with debounce in effect) ---
export const checkPatientDni = createAction(
  '[Patient Form] Check Patient Dni',
  props<{ dni: string }>(),
);
export const checkPatientDniSuccess = createAction(
  '[Patients API] Check Patient Dni Success',
  props<{ dni: string; exists: boolean }>(),
);
export const checkPatientDniFailure = createAction(
  '[Patients API] Check Patient Dni Failure',
  props<{ error: HttpErrorResponse }>(),
);

// --- Toggle active (mutation, concatMap) ---
export const togglePatientActive = createAction(
  '[Patient Row] Toggle Patient Active',
  props<{ id: number; deleted: boolean }>(),
);
export const togglePatientActiveSuccess = createAction(
  '[Patients API] Toggle Patient Active Success',
  props<{ id: number; deleted: boolean }>(),
);
export const togglePatientActiveFailure = createAction(
  '[Patients API] Toggle Patient Active Failure',
  props<{ error: HttpErrorResponse }>(),
);
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/store/patient.actions.ts
git commit -m "feat(pacientes): add patient actions"
```

---

### Task C3: Patient reducer + tests

**Files:**
- Create: `src/app/features/pacientes/store/patient.reducer.ts`
- Create: `src/app/features/pacientes/store/patient.reducer.spec.ts`

Single shared `pending` and `error`. Every intent action sets `pending: true` and clears `error`. Success/Failure clear `pending` and set the new state.

- [ ] **Step 1: Write failing tests**

```ts
// src/app/features/pacientes/store/patient.reducer.spec.ts
import { HttpErrorResponse } from '@angular/common/http';
import { patientReducer } from './patient.reducer';
import { initialPatientState } from './patient.state';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, clearSelectedPatient,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess,
  togglePatientActive, togglePatientActiveSuccess,
  checkPatientDniSuccess,
} from './patient.actions';
import { Patient } from '../models/patient.model';

const mkPatient = (id: number, active = true): Patient => ({
  id, dni: `${id}`, firstName: `f${id}`, lastName: `l${id}`,
  birthDate: '1990-01-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'MIN', contacts: [], addresses: [], coverages: [], active,
});

describe('patientReducer', () => {
  it('loadPatients sets pending=true and clears error', () => {
    const before = { ...initialPatientState, error: { status: 500 } as HttpErrorResponse };
    const next = patientReducer(before, loadPatients({ req: initialPatientState.pageRequest }));
    expect(next.pending).toBe(true);
    expect(next.error).toBeNull();
  });

  it('loadPatientsSuccess replaces items and totals, clears pending', () => {
    const result = { content: [mkPatient(1)], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientsSuccess({ result }));
    expect(next.items.length).toBe(1);
    expect(next.totalElements).toBe(1);
    expect(next.pending).toBe(false);
  });

  it('loadPatientsFailure stores error and clears pending', () => {
    const err = { status: 500 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientsFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('setPatientPageRequest merges patch', () => {
    const next = patientReducer(initialPatientState, setPatientPageRequest({ patch: { q: 'gar', page: 2 } }));
    expect(next.pageRequest).toEqual({ ...initialPatientState.pageRequest, q: 'gar', page: 2 });
  });

  it('loadPatient sets pending=true', () => {
    const next = patientReducer(initialPatientState, loadPatient({ id: 5 }));
    expect(next.pending).toBe(true);
  });

  it('loadPatientSuccess stores selected and clears pending', () => {
    const next = patientReducer({ ...initialPatientState, pending: true }, loadPatientSuccess({ patient: mkPatient(5) }));
    expect(next.selected?.id).toBe(5);
    expect(next.pending).toBe(false);
  });

  it('clearSelectedPatient sets selected=null', () => {
    const next = patientReducer({ ...initialPatientState, selected: mkPatient(1) }, clearSelectedPatient());
    expect(next.selected).toBeNull();
  });

  it('addPatient and addPatientSuccess (pessimistic — appends without reload)', () => {
    const after = patientReducer(initialPatientState, addPatient({ req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] } }));
    expect(after.pending).toBe(true);
    const final = patientReducer({ ...after, items: [mkPatient(2)] }, addPatientSuccess({ patient: mkPatient(1) }));
    expect(final.items.map((p) => p.id)).toEqual([2, 1]);
    expect(final.pending).toBe(false);
  });

  it('addPatientFailure stores error and clears pending', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, pending: true }, addPatientFailure({ error: err }));
    expect(next.pending).toBe(false);
    expect(next.error).toBe(err);
  });

  it('updatePatientSuccess replaces item by id and updates selected if matches', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], selected: mkPatient(1) };
    const updated = { ...mkPatient(1), firstName: 'changed' };
    const next = patientReducer(before, updatePatientSuccess({ patient: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.items[1].firstName).toBe('f2');
    expect(next.selected?.firstName).toBe('changed');
  });

  it('togglePatientActiveSuccess flips active on the targeted item only', () => {
    const before = { ...initialPatientState, items: [mkPatient(1, true), mkPatient(2, true)] };
    const next = patientReducer(before, togglePatientActiveSuccess({ id: 1, deleted: true }));
    expect(next.items[0].active).toBe(false);
    expect(next.items[1].active).toBe(true);
  });

  it('togglePatientActive sets pending', () => {
    const next = patientReducer(initialPatientState, togglePatientActive({ id: 1, deleted: true }));
    expect(next.pending).toBe(true);
  });

  it('checkPatientDniSuccess stores last check', () => {
    const next = patientReducer(initialPatientState, checkPatientDniSuccess({ dni: '32456789', exists: true }));
    expect(next.dniCheck).toEqual({ dni: '32456789', exists: true });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement the reducer**

```ts
// src/app/features/pacientes/store/patient.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { PatientState, initialPatientState } from './patient.state';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, loadPatientFailure, clearSelectedPatient,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess, updatePatientFailure,
  checkPatientDni, checkPatientDniSuccess, checkPatientDniFailure,
  togglePatientActive, togglePatientActiveSuccess, togglePatientActiveFailure,
} from './patient.actions';

export const patientReducer = createReducer(
  initialPatientState,

  // Intent actions: pending=true, clear error
  on(loadPatients, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(loadPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(addPatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(updatePatient, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(togglePatientActive, (state): PatientState => ({ ...state, pending: true, error: null })),
  on(checkPatientDni, (state): PatientState => ({ ...state, pending: true, error: null })),

  // Success / data updates
  on(loadPatientsSuccess, (state, { result }): PatientState => ({
    ...state,
    items: result.content,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    pending: false,
    error: null,
  })),
  on(loadPatientSuccess, (state, { patient }): PatientState => ({
    ...state, selected: patient, pending: false, error: null,
  })),
  on(addPatientSuccess, (state, { patient }): PatientState => ({
    ...state,
    items: [...state.items, patient],
    pending: false,
    error: null,
  })),
  on(updatePatientSuccess, (state, { patient }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === patient.id ? patient : p)),
    selected: state.selected?.id === patient.id ? patient : state.selected,
    pending: false,
    error: null,
  })),
  on(togglePatientActiveSuccess, (state, { id, deleted }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === id ? { ...p, active: !deleted } : p)),
    selected: state.selected?.id === id ? { ...state.selected, active: !deleted } : state.selected,
    pending: false,
    error: null,
  })),
  on(checkPatientDniSuccess, (state, { dni, exists }): PatientState => ({
    ...state, dniCheck: { dni, exists }, pending: false, error: null,
  })),

  // Failures
  on(loadPatientsFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(loadPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(addPatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(updatePatientFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(togglePatientActiveFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),
  on(checkPatientDniFailure, (state, { error }): PatientState => ({ ...state, pending: false, error })),

  // Misc UI state
  on(setPatientPageRequest, (state, { patch }): PatientState => ({
    ...state, pageRequest: { ...state.pageRequest, ...patch },
  })),
  on(clearSelectedPatient, (state): PatientState => ({ ...state, selected: null })),
);
```

- [ ] **Step 4: Run — expect 13 passed**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/store/patient.reducer.ts src/app/features/pacientes/store/patient.reducer.spec.ts
git commit -m "feat(pacientes): add patient reducer with tests"
```

---

### Task C4: Patient selectors

**Files:**
- Create: `src/app/features/pacientes/store/patient.selectors.ts`
- Create: `src/app/features/pacientes/store/patient.selectors.spec.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/app/features/pacientes/store/patient.selectors.spec.ts
import {
  selectAllPatients, selectSelectedPatient, selectPatientPending, selectPatientError,
  selectPatientDniCheck,
} from './patient.selectors';
import { PATIENT_FEATURE_KEY, initialPatientState } from './patient.state';

describe('patient selectors', () => {
  const baseState = {
    [PATIENT_FEATURE_KEY]: {
      ...initialPatientState,
      items: [{ id: 1 } as never],
      dniCheck: { dni: '32456789', exists: true },
      pending: true,
      error: null,
    },
  } as never;

  it('selectAllPatients returns items', () => {
    expect(selectAllPatients(baseState)).toEqual([{ id: 1 }]);
  });
  it('selectPatientPending returns pending flag', () => {
    expect(selectPatientPending(baseState)).toBe(true);
  });
  it('selectPatientError returns error', () => {
    expect(selectPatientError(baseState)).toBeNull();
  });
  it('selectSelectedPatient returns null when no selected', () => {
    expect(selectSelectedPatient(baseState)).toBeNull();
  });
  it('selectPatientDniCheck returns true when dni matches and exists', () => {
    expect(selectPatientDniCheck('32456789')(baseState)).toBe(true);
  });
  it('selectPatientDniCheck returns null when dni does not match cached check', () => {
    expect(selectPatientDniCheck('other')(baseState)).toBeNull();
  });
  it('selectPatientDniCheck returns null when no check has run', () => {
    const s = { [PATIENT_FEATURE_KEY]: { ...initialPatientState, dniCheck: null } } as never;
    expect(selectPatientDniCheck('111')(s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/app/features/pacientes/store/patient.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PATIENT_FEATURE_KEY, PatientState } from './patient.state';

export const selectPatientState = createFeatureSelector<PatientState>(PATIENT_FEATURE_KEY);

export const selectAllPatients = createSelector(selectPatientState, (s) => s.items);
export const selectPatientTotalElements = createSelector(selectPatientState, (s) => s.totalElements);
export const selectPatientTotalPages = createSelector(selectPatientState, (s) => s.totalPages);
export const selectPatientPageRequest = createSelector(selectPatientState, (s) => s.pageRequest);
export const selectSelectedPatient = createSelector(selectPatientState, (s) => s.selected);
export const selectPatientPending = createSelector(selectPatientState, (s) => s.pending);
export const selectPatientError = createSelector(selectPatientState, (s) => s.error);

/**
 * Factory selector for DNI duplicate check.
 * Returns true/false when the cached check matches the given dni, null otherwise.
 * Used by the form async validator.
 */
export const selectPatientDniCheck = (dni: string) =>
  createSelector(selectPatientState, (s) => {
    if (!s.dniCheck) return null;
    return s.dniCheck.dni === dni ? s.dniCheck.exists : null;
  });
```

- [ ] **Step 4: Run — expect 7 passed**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/store/patient.selectors.ts src/app/features/pacientes/store/patient.selectors.spec.ts
git commit -m "feat(pacientes): add patient selectors"
```

---

### Task C5: Patient effects

**Files:**
- Create: `src/app/features/pacientes/store/patient.effects.ts`
- Create: `src/app/features/pacientes/store/patient.effects.spec.ts`

Operators per project convention:
- `loadPatients$`, `loadPatient$`, `checkPatientDni$` → reads → `switchMap`
- `togglePatientActive$` → mutation → `concatMap`
- `addPatient$`, `updatePatient$` → one-shot submits → `exhaustMap`
- `setPatientPageRequestPropagation$` → maps `setPatientPageRequest` to `loadPatients` with merged request

- [ ] **Step 1: Write failing tests**

```ts
// src/app/features/pacientes/store/patient.effects.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { PatientEffects } from './patient.effects';
import { PatientService } from '../services/patient.service';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  addPatient, addPatientSuccess,
  togglePatientActive, togglePatientActiveSuccess,
} from './patient.actions';
import { initialPatientState, PATIENT_FEATURE_KEY } from './patient.state';
import { Patient } from '../models/patient.model';

const patient: Patient = {
  id: 1, dni: '32456789', firstName: 'a', lastName: 'b', birthDate: null,
  gender: null, sexAtBirth: null, status: 'MIN',
  contacts: [], addresses: [], coverages: [], active: true,
};

describe('PatientEffects', () => {
  let actions$: Observable<Action>;
  let svc: { search: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; toggleActive: ReturnType<typeof vi.fn>; existsByDni: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    svc = { search: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), toggleActive: vi.fn(), existsByDni: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        PatientEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        { provide: PatientService, useValue: svc },
      ],
    });
  });

  it('loadPatients$ maps to loadPatientsSuccess', (done) => {
    svc.search.mockReturnValue(of({ content: [patient], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
    actions$ = of(loadPatients({ req: initialPatientState.pageRequest }));
    TestBed.inject(PatientEffects).loadPatients$.subscribe((a) => {
      expect(a.type).toBe(loadPatientsSuccess.type);
      done();
    });
  });

  it('loadPatients$ maps errors to loadPatientsFailure', (done) => {
    svc.search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(loadPatients({ req: initialPatientState.pageRequest }));
    TestBed.inject(PatientEffects).loadPatients$.subscribe((a) => {
      expect(a.type).toBe(loadPatientsFailure.type);
      done();
    });
  });

  it('addPatient$ maps success to addPatientSuccess', (done) => {
    svc.create.mockReturnValue(of(patient));
    actions$ = of(addPatient({ req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] } }));
    TestBed.inject(PatientEffects).addPatient$.subscribe((a) => {
      expect(a.type).toBe(addPatientSuccess.type);
      done();
    });
  });

  it('togglePatientActive$ maps to togglePatientActiveSuccess with id and deleted', (done) => {
    svc.toggleActive.mockReturnValue(of(undefined));
    actions$ = of(togglePatientActive({ id: 1, deleted: true }));
    TestBed.inject(PatientEffects).togglePatientActive$.subscribe((a) => {
      expect(a).toEqual(togglePatientActiveSuccess({ id: 1, deleted: true }));
      done();
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
// src/app/features/pacientes/store/patient.effects.ts
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import {
  catchError, concatMap, debounceTime, distinctUntilChanged, exhaustMap, filter,
  map, of, switchMap, withLatestFrom,
} from 'rxjs';
import { PatientService } from '../services/patient.service';
import {
  loadPatients, loadPatientsSuccess, loadPatientsFailure,
  setPatientPageRequest,
  loadPatient, loadPatientSuccess, loadPatientFailure,
  addPatient, addPatientSuccess, addPatientFailure,
  updatePatient, updatePatientSuccess, updatePatientFailure,
  checkPatientDni, checkPatientDniSuccess, checkPatientDniFailure,
  togglePatientActive, togglePatientActiveSuccess, togglePatientActiveFailure,
} from './patient.actions';
import { selectPatientPageRequest } from './patient.selectors';

@Injectable()
export class PatientEffects {
  private readonly actions$ = inject(Actions);
  private readonly patientService = inject(PatientService);
  private readonly store = inject(Store);

  loadPatients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPatients),
      switchMap(({ req }) =>
        this.patientService.search(req).pipe(
          map((result) => loadPatientsSuccess({ result })),
          catchError((error: HttpErrorResponse) => of(loadPatientsFailure({ error }))),
        ),
      ),
    ),
  );

  /** When the user changes filters/page, refetch with the merged page request from the store. */
  setPatientPageRequestPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(setPatientPageRequest),
      withLatestFrom(this.store.select(selectPatientPageRequest)),
      map(([, req]) => loadPatients({ req })),
    ),
  );

  loadPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPatient),
      switchMap(({ id }) =>
        this.patientService.getById(id).pipe(
          map((patient) => loadPatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(loadPatientFailure({ error }))),
        ),
      ),
    ),
  );

  addPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addPatient),
      exhaustMap(({ req }) =>
        this.patientService.create(req).pipe(
          map((patient) => addPatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(addPatientFailure({ error }))),
        ),
      ),
    ),
  );

  updatePatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updatePatient),
      exhaustMap(({ id, req }) =>
        this.patientService.update(id, req).pipe(
          map((patient) => updatePatientSuccess({ patient })),
          catchError((error: HttpErrorResponse) => of(updatePatientFailure({ error }))),
        ),
      ),
    ),
  );

  togglePatientActive$ = createEffect(() =>
    this.actions$.pipe(
      ofType(togglePatientActive),
      concatMap(({ id, deleted }) =>
        this.patientService.toggleActive(id, deleted).pipe(
          map(() => togglePatientActiveSuccess({ id, deleted })),
          catchError((error: HttpErrorResponse) => of(togglePatientActiveFailure({ error }))),
        ),
      ),
    ),
  );

  checkPatientDni$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkPatientDni),
      debounceTime(400),
      distinctUntilChanged((a, b) => a.dni === b.dni),
      filter(({ dni }) => /^\d{7,}$/.test(dni)),
      switchMap(({ dni }) =>
        this.patientService.existsByDni(dni).pipe(
          map((exists) => checkPatientDniSuccess({ dni, exists })),
          catchError((error: HttpErrorResponse) => of(checkPatientDniFailure({ error }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Run — expect 4 passed**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/store/patient.effects.ts src/app/features/pacientes/store/patient.effects.spec.ts
git commit -m "feat(pacientes): add patient effects"
```

---

### Task C6: Register store globally in `app.config.ts`

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Add imports**

Near the other feature store imports:

```ts
import { PATIENT_FEATURE_KEY } from '@features/pacientes/store/patient.state';
import { patientReducer } from '@features/pacientes/store/patient.reducer';
import { PatientEffects } from '@features/pacientes/store/patient.effects';
```

- [ ] **Step 2: Add provider lines**

Inside the `providers` array, after `provideEffects(FinancieroEffects)`:

```ts
    provideState(PATIENT_FEATURE_KEY, patientReducer),
    provideEffects(PatientEffects),
```

- [ ] **Step 3: Typecheck + commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(pacientes): register patient state and effects globally"
```

---

## Phase D — Form drawer + section components

### Task D1: ContactSection (dumb component receiving FormArray)

**Files:**
- Create: `src/app/features/pacientes/components/contact-section/contact-section.component.ts`

Dumb component. Receives a `FormArray<FormGroup>` input, exposes add/remove/setPrimary. Uses `@if`/`@for` + `<p-button>`. Provides a static helper to build a FormGroup from a `Contact`.

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/contact-section/contact-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Contact, ContactType } from '../../models/patient.model';

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'PHONE', label: 'Teléfono fijo' },
  { value: 'MOBILE', label: 'Celular' },
  { value: 'EMAIL', label: 'Email' },
];

@Component({
  selector: 'pat-contact-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="grid grid-cols-12 gap-2 items-end border border-surface-200 rounded p-2">
          <div class="col-span-3">
            <label class="block text-xs text-surface-500 mb-1">Tipo</label>
            <p-select formControlName="contactType" [options]="typeOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
          <div class="col-span-5">
            <label class="block text-xs text-surface-500 mb-1">Valor</label>
            <input pInputText formControlName="contactValue" class="w-full" />
          </div>
          <div class="col-span-2 text-center">
            <label class="block text-xs text-surface-500 mb-1">Primario</label>
            <p-radioButton name="contact-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Activo</label>
            <p-toggleSwitch formControlName="active" />
          </div>
          <div class="col-span-1 text-right">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="remove(i)" ariaLabel="Eliminar contacto" />
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar contacto" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class ContactSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  readonly typeOptions = TYPE_OPTIONS;

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null],
      contactValue: ['', Validators.required],
      contactType: ['PHONE' as ContactType, Validators.required],
      isPrimary: [isPrimary],
      active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) this.array().at(0).patchValue({ isPrimary: true });
  }

  setPrimary(index: number): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: i === index }));
  }

  static toFormGroup(fb: FormBuilder, c: Contact): FormGroup {
    return fb.group({
      id: [c.id ?? null],
      contactValue: [c.contactValue, Validators.required],
      contactType: [c.contactType, Validators.required],
      isPrimary: [c.isPrimary],
      active: [c.active],
    });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/components/contact-section/
git commit -m "feat(pacientes): add ContactSection component"
```

---

### Task D2: AddressSection

**Files:**
- Create: `src/app/features/pacientes/components/address-section/address-section.component.ts`

Same shape as ContactSection but for addresses. All fields optional. Implementation mirrors D1, replacing fields.

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/address-section/address-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Address } from '../../models/patient.model';

@Component({
  selector: 'pat-address-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="grid grid-cols-12 gap-2 border border-surface-200 rounded p-2">
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Calle</label><input pInputText formControlName="street" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Número</label><input pInputText formControlName="streetNumber" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Depto</label><input pInputText formControlName="apartment" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">CP</label><input pInputText formControlName="zipCode" class="w-full"></div>
          <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Barrio</label><input pInputText formControlName="neighborhood" class="w-full"></div>
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Ciudad</label><input pInputText formControlName="city" class="w-full"></div>
          <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Provincia</label><input pInputText formControlName="province" class="w-full"></div>
          <div class="col-span-2 text-center">
            <label class="block text-xs text-surface-500 mb-1">Primario</label>
            <p-radioButton name="address-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Activo</label>
            <p-toggleSwitch formControlName="active" />
          </div>
          <div class="col-span-1 text-right">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="remove(i)" ariaLabel="Eliminar dirección" />
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar dirección" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class AddressSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null], city: [''], province: [''], street: [''], streetNumber: [''],
      apartment: [''], neighborhood: [''], zipCode: [''],
      isPrimary: [isPrimary], active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) this.array().at(0).patchValue({ isPrimary: true });
  }

  setPrimary(index: number): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: i === index }));
  }

  static toFormGroup(fb: FormBuilder, a: Address): FormGroup {
    return fb.group({
      id: [a.id ?? null],
      city: [a.city ?? ''], province: [a.province ?? ''], street: [a.street ?? ''],
      streetNumber: [a.streetNumber ?? ''], apartment: [a.apartment ?? ''],
      neighborhood: [a.neighborhood ?? ''], zipCode: [a.zipCode ?? ''],
      isPrimary: [a.isPrimary], active: [a.active],
    });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/components/address-section/
git commit -m "feat(pacientes): add AddressSection component"
```

---

### Task D3: CoverageSection

**Files:**
- Create: `src/app/features/pacientes/components/coverage-section/coverage-section.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/coverage-section/coverage-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { Coverage } from '../../models/patient.model';
import { COVERAGE_PLAN_CATALOG } from '../../models/coverage-plans.catalog';

@Component({
  selector: 'pat-coverage-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      @for (group of array().controls; track group; let i = $index) {
        <div [formGroup]="$any(group)" class="grid grid-cols-12 gap-2 items-end border border-surface-200 rounded p-2">
          <div class="col-span-5">
            <label class="block text-xs text-surface-500 mb-1">Obra social / Plan</label>
            <p-select formControlName="planId" [options]="planOptions" optionLabel="label" optionValue="planId" placeholder="Seleccionar plan" class="w-full" />
          </div>
          <div class="col-span-4">
            <label class="block text-xs text-surface-500 mb-1">N° afiliado</label>
            <input pInputText formControlName="memberNumber" class="w-full">
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Primario</label>
            <p-radioButton name="coverage-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="setPrimary(i)" [ngModelOptions]="{ standalone: true }" />
          </div>
          <div class="col-span-1 text-center">
            <label class="block text-xs text-surface-500 mb-1">Activo</label>
            <p-toggleSwitch formControlName="active" />
          </div>
          <div class="col-span-1 text-right">
            <p-button icon="pi pi-trash" severity="danger" [text]="true" (onClick)="remove(i)" ariaLabel="Eliminar cobertura" />
          </div>
        </div>
      }
      <p-button icon="pi pi-plus" label="Agregar cobertura" severity="secondary" [outlined]="true" (onClick)="add()" />
    </div>
  `,
})
export class CoverageSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  readonly planOptions = COVERAGE_PLAN_CATALOG;

  primaryIndex(): number { return this.array().controls.findIndex((c) => c.value.isPrimary === true); }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null],
      planId: [null, Validators.required],
      memberNumber: ['', Validators.required],
      isPrimary: [isPrimary], active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) this.array().at(0).patchValue({ isPrimary: true });
  }

  setPrimary(index: number): void {
    this.array().controls.forEach((ctrl, i) => ctrl.patchValue({ isPrimary: i === index }));
  }

  static toFormGroup(fb: FormBuilder, c: Coverage): FormGroup {
    return fb.group({
      id: [c.id ?? null],
      planId: [c.planId, Validators.required],
      memberNumber: [c.memberNumber, Validators.required],
      isPrimary: [c.isPrimary], active: [c.active],
    });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/components/coverage-section/
git commit -m "feat(pacientes): add CoverageSection component"
```

---

### Task D4: PatientFormDrawer (replaces the original modal idea — drawer per `laboratory-ui`)

**Files:**
- Create: `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.ts`

Uses `<p-drawer position="left">` with `styleClass="ui-drawer-half"` (per `laboratory-ui`). Reactive Form exposed as signals via `toSignal(form.valueChanges)` + `toSignal(form.statusChanges)` + `computed()`. Accordion with 4 sections. DNI async validation reads from the store selector factory.

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import {
  addPatient, updatePatient, checkPatientDni,
} from '../../store/patient.actions';
import {
  selectPatientPending, selectPatientError, selectPatientState,
} from '../../store/patient.selectors';
import { ContactSectionComponent } from '../contact-section/contact-section.component';
import { AddressSectionComponent } from '../address-section/address-section.component';
import { CoverageSectionComponent } from '../coverage-section/coverage-section.component';

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'NOT_SPECIFIED', label: 'No especificado' },
];
const SEX_OPTS: { value: SexAtBirth; label: string }[] = [
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'INTERSEX', label: 'Intersex' },
];

function isoFromDate(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

@Component({
  selector: 'pat-form-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule,
    AccordionModule, TagModule, DatePickerModule,
    ContactSectionComponent, AddressSectionComponent, CoverageSectionComponent,
  ],
  template: `
    <p-drawer
      [visible]="open()"
      (visibleChange)="onVisibleChange($event)"
      position="left"
      [modal]="true"
      [dismissable]="true"
      styleClass="ui-drawer-half"
      [header]="isEdit() ? 'Editar paciente' : 'Nuevo paciente'">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="flex-1 overflow-y-auto pr-2">
          @if (saveError(); as err) {
            <div class="mb-3 p-2 rounded text-sm" style="background:#fee2e2;border:1px solid var(--ds-danger);color:var(--ds-danger);">
              {{ saveErrorMessage(err) }}
            </div>
          }
          <p-accordion [multiple]="true" [value]="['general','contacts']">
            <p-accordion-panel value="general">
              <p-accordion-header>
                Datos generales
                <p-tag [value]="statusEstimate()" severity="info" class="ml-2" />
              </p-accordion-header>
              <p-accordion-content>
                <div class="grid grid-cols-2 gap-3" formGroupName="general">
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Apellido*</label>
                    <input pInputText formControlName="lastName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Nombre*</label>
                    <input pInputText formControlName="firstName" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">DNI*</label>
                    <input pInputText formControlName="dni" class="w-full" />
                    @if (dniDuplicate()) {
                      <p class="text-xs mt-1" style="color:var(--ds-danger)" role="alert">
                        Ya existe un paciente con ese DNI
                      </p>
                    }
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Fecha de nacimiento*</label>
                    <p-datepicker formControlName="birthDate" dateFormat="dd/mm/yy" appendTo="body" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Género</label>
                    <p-select formControlName="gender" [options]="genderOpts" optionLabel="label" optionValue="value" placeholder="—" class="w-full" />
                  </div>
                  <div>
                    <label class="block text-xs text-surface-500 mb-1">Sexo registral</label>
                    <p-select formControlName="sexAtBirth" [options]="sexOpts" optionLabel="label" optionValue="value" placeholder="—" class="w-full" />
                  </div>
                </div>
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="contacts">
              <p-accordion-header>Contactos</p-accordion-header>
              <p-accordion-content>
                <pat-contact-section [array]="contactsArray" />
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="addresses">
              <p-accordion-header>Direcciones</p-accordion-header>
              <p-accordion-content>
                <pat-address-section [array]="addressesArray" />
              </p-accordion-content>
            </p-accordion-panel>

            <p-accordion-panel value="coverages">
              <p-accordion-header>Coberturas</p-accordion-header>
              <p-accordion-content>
                <pat-coverage-section [array]="coveragesArray" />
              </p-accordion-content>
            </p-accordion-panel>
          </p-accordion>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-surface-200">
          <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="onCancel()" />
          <p-button
            [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
            type="submit"
            [disabled]="!canSubmit()" />
        </div>
      </form>
    </p-drawer>
  `,
})
export class PatientFormDrawerComponent {
  readonly open = input.required<boolean>();
  readonly patient = input<Patient | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;

  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly saveError = this.store.selectSignal(selectPatientError);
  private readonly state = this.store.selectSignal(selectPatientState);

  readonly form: FormGroup = this.fb.group({
    general: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,}$/)]],
      birthDate: [null, Validators.required],
      gender: [null],
      sexAtBirth: [null],
    }),
    contacts: this.fb.array<FormGroup>([]),
    addresses: this.fb.array<FormGroup>([]),
    coverages: this.fb.array<FormGroup>([]),
  });

  // Form state mirrored as signals (per angular-conventions)
  readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  readonly isEdit = computed(() => this.patient() != null);
  readonly invalid = computed(() => this.status() === 'INVALID');

  readonly dniDuplicate = computed(() => {
    if (this.isEdit()) return false;
    const dni = (this.value() as { general?: { dni?: string } } | undefined)?.general?.dni ?? '';
    const clean = dni.toString().replace(/\D/g, '');
    const check = this.state().dniCheck;
    if (!check) return false;
    return check.dni === clean && check.exists === true;
  });

  readonly canSubmit = computed(() => !this.invalid() && !this.dniDuplicate() && !this.pending());

  readonly statusEstimate = computed<'MIN' | 'COMPLETE'>(() => {
    const v = this.value() as {
      general: { firstName?: string; lastName?: string; dni?: string; birthDate?: unknown; gender?: string | null; sexAtBirth?: string | null };
      contacts: { active?: boolean }[];
      coverages: { active?: boolean }[];
    };
    const hasContact = v.contacts.some((c) => c.active);
    const hasCoverage = v.coverages.some((c) => c.active);
    const ok = !!v.general.firstName && !!v.general.lastName && !!v.general.dni
      && !!v.general.birthDate && !!v.general.gender && !!v.general.sexAtBirth
      && hasContact && hasCoverage;
    return ok ? 'COMPLETE' : 'MIN';
  });

  get contactsArray(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addressesArray(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coveragesArray(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  constructor() {
    // Hydrate / reset based on inputs
    effect(() => {
      const p = this.patient();
      const opened = this.open();
      if (!opened) return;
      if (p) {
        this.hydrate(p);
        this.form.get('general.dni')?.disable({ emitEvent: false });
      } else {
        this.resetForCreate();
        this.form.get('general.dni')?.enable({ emitEvent: false });
      }
    });

    // Dispatch DNI check on user typing in create mode
    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      if (this.isEdit()) return;
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      if (/^\d{7,}$/.test(clean)) this.store.dispatch(checkPatientDni({ dni: clean }));
    });
  }

  private resetForCreate(): void {
    this.form.reset({ general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null } });
    this.contactsArray.clear();
    this.addressesArray.clear();
    this.coveragesArray.clear();
  }

  private hydrate(p: Patient): void {
    this.form.patchValue({
      general: {
        firstName: p.firstName, lastName: p.lastName, dni: p.dni,
        birthDate: p.birthDate ? new Date(p.birthDate) : null,
        gender: p.gender, sexAtBirth: p.sexAtBirth,
      },
    });
    this.contactsArray.clear();
    p.contacts.forEach((c) => this.contactsArray.push(ContactSectionComponent.toFormGroup(this.fb, c)));
    this.addressesArray.clear();
    p.addresses.forEach((a) => this.addressesArray.push(AddressSectionComponent.toFormGroup(this.fb, a)));
    this.coveragesArray.clear();
    p.coverages.forEach((c) => this.coveragesArray.push(CoverageSectionComponent.toFormGroup(this.fb, c)));
  }

  saveErrorMessage(err: { status?: number; error?: { message?: string } }): string {
    if (err.status === 409) return 'Ya existe un paciente con ese DNI.';
    return err.error?.message ?? 'No se pudo guardar el paciente.';
  }

  onSubmit(): void {
    if (!this.canSubmit()) return;
    const raw = this.form.getRawValue() as {
      general: { firstName: string; lastName: string; dni: string; birthDate: Date | string | null; gender: Gender | null; sexAtBirth: SexAtBirth | null };
      contacts: never[]; addresses: never[]; coverages: never[];
    };
    const common = {
      firstName: raw.general.firstName, lastName: raw.general.lastName,
      birthDate: isoFromDate(raw.general.birthDate),
      gender: raw.general.gender, sexAtBirth: raw.general.sexAtBirth,
      contacts: raw.contacts, addresses: raw.addresses, coverages: raw.coverages,
    };
    const current = this.patient();
    if (current) {
      const req: UpdatePatientRequest = common;
      this.store.dispatch(updatePatient({ id: current.id, req }));
    } else {
      const req: CreatePatientRequest = { ...common, dni: raw.general.dni };
      this.store.dispatch(addPatient({ req }));
    }
  }

  onCancel(): void { this.closed.emit(); }
  onVisibleChange(v: boolean): void { if (!v) this.closed.emit(); }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/components/patient-form-drawer/
git commit -m "feat(pacientes): add PatientFormDrawer (drawer + form-as-signals)"
```

---

## Phase E — List page

### Task E1: PatientListPage

**Files:**
- Create: `src/app/features/pacientes/pages/patient-list/patient-list.page.ts`

Smart component. Dispatches `loadPatients` in `ngOnInit`. Reads with `selectSignal`. `@if`/`@for`, `<p-button>`, `p-skeleton` while pending, `p-confirmDialog` before toggle. PrimeNG `p-table` desktop; mobile responsiveness handled via CSS class `ui-show-desktop` / `ui-show-mobile` and a `ui-list-card` rendering for mobile.

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/pages/patient-list/patient-list.page.ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, debounceTime } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { Patient, PatientStatus } from '../../models/patient.model';
import { PatientStateFilter } from '../../models/patient-page.model';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import {
  loadPatients, setPatientPageRequest, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectAllPatients, selectPatientPending, selectPatientPageRequest, selectPatientTotalElements,
} from '../../store/patient.selectors';
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';

@Component({
  selector: 'pat-patient-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, TableModule, ButtonModule, InputTextModule, TagModule, TooltipModule,
    ConfirmDialogModule, SkeletonModule, DatePipe, DniPipe, AgePipe,
    EmptyStateComponent, PatientFormDrawerComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Core clínico</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-address-book"></i> Pacientes</h1>
        </div>
        <div class="flex items-center gap-2">
          <p-button label="Exportar" icon="pi pi-file-export" severity="secondary" [outlined]="true" [disabled]="true" pTooltip="Próximamente" />
          <p-button label="Nuevo paciente" icon="pi pi-plus" (onClick)="openCreate()" />
        </div>
      </header>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText placeholder="Buscar por nombre o DNI…" (input)="onSearch($any($event.target).value)" />
        </span>
        @for (opt of stateOptions; track opt.value) {
          <p-button
            [label]="opt.label"
            size="small"
            [severity]="pageRequest().state === opt.value ? 'primary' : 'secondary'"
            [outlined]="pageRequest().state !== opt.value"
            (onClick)="setState(opt.value)" />
        }
        <p-button
          label="Sólo completos"
          icon="pi pi-filter"
          size="small"
          [severity]="pageRequest().status === 'COMPLETE' ? 'primary' : 'secondary'"
          [outlined]="pageRequest().status !== 'COMPLETE'"
          (onClick)="toggleCompleteFilter()" />
      </div>

      @if (pending() && items().length === 0) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="3rem" />
          }
        </div>
      } @else {
        <p-table
          [value]="items()"
          [lazy]="true"
          [paginator]="true"
          [rows]="pageRequest().size"
          [totalRecords]="total()"
          [first]="pageRequest().page * pageRequest().size"
          [loading]="pending()"
          (onLazyLoad)="onPage($event)"
          dataKey="id">
          <ng-template pTemplate="header">
            <tr>
              <th>Paciente</th><th>DNI</th><th>Fecha nac.</th><th>Obra social</th>
              <th>Teléfono</th><th>Estado</th><th class="text-right" style="width:180px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-p>
            <tr>
              <td>
                <div class="font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
                <div class="text-xs text-surface-500">{{ p.gender }} · {{ p.birthDate | age }} años</div>
              </td>
              <td>{{ p.dni | dni }}</td>
              <td>{{ p.birthDate | date:'dd/MM/yyyy' }}</td>
              <td>{{ primaryCoverageLabel(p) }}</td>
              <td>{{ primaryPhone(p) }}</td>
              <td>
                <p-tag [severity]="statusSeverity(p.status)" [value]="p.status" />
                @if (!p.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
              </td>
              <td class="text-right">
                <a [routerLink]="['/pacientes', p.id]">
                  <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
                </a>
                <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" (onClick)="openEdit(p)" />
                <p-button [text]="true" icon="pi pi-times-circle" pTooltip="Activar/Desactivar" ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(p)" />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7">
                <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" (ctaClick)="openCreate()" />
              </td>
            </tr>
          </ng-template>
        </p-table>
      }

      <p-confirmDialog />
      <pat-form-drawer [open]="drawerOpen()" [patient]="editing()" (closed)="onDrawerClosed()" />
    </div>
  `,
})
export class PatientListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly search$ = new Subject<string>();

  readonly items = this.store.selectSignal(selectAllPatients);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly total = this.store.selectSignal(selectPatientTotalElements);
  readonly pageRequest = this.store.selectSignal(selectPatientPageRequest);

  readonly drawerOpen = signal(false);
  readonly editing = signal<Patient | null>(null);

  readonly stateOptions: { value: PatientStateFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
  ];

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) =>
      this.store.dispatch(setPatientPageRequest({ patch: { q, page: 0 } })),
    );
    this.store.dispatch(loadPatients({ req: this.pageRequest() }));
  }

  onSearch(q: string): void { this.search$.next(q); }
  setState(state: PatientStateFilter): void {
    this.store.dispatch(setPatientPageRequest({ patch: { state, page: 0 } }));
  }
  toggleCompleteFilter(): void {
    const next: PatientStatus | undefined = this.pageRequest().status === 'COMPLETE' ? undefined : 'COMPLETE';
    this.store.dispatch(setPatientPageRequest({ patch: { status: next, page: 0 } }));
  }
  onPage(e: TableLazyLoadEvent): void {
    const rows = e.rows ?? this.pageRequest().size;
    const page = Math.floor((e.first ?? 0) / rows);
    this.store.dispatch(setPatientPageRequest({ patch: { page, size: rows } }));
  }

  openCreate(): void { this.editing.set(null); this.drawerOpen.set(true); }
  openEdit(p: Patient): void { this.editing.set(p); this.drawerOpen.set(true); }
  onDrawerClosed(): void { this.drawerOpen.set(false); this.editing.set(null); }

  confirmToggle(p: Patient): void {
    const deleted = p.active;
    const verb = deleted ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} paciente?`,
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }

  statusSeverity(status: PatientStatus): 'info' | 'success' | 'warn' {
    return status === 'COMPLETE' ? 'success' : status === 'VERIFIED' ? 'info' : 'warn';
  }

  primaryCoverageLabel(p: Patient): string {
    const c = p.coverages.find((x) => x.isPrimary && x.active) ?? p.coverages.find((x) => x.active);
    return c ? getCoveragePlanLabel(c.planId) : 'Particular';
  }

  primaryPhone(p: Patient): string {
    const c = p.contacts.find((x) => (x.contactType === 'PHONE' || x.contactType === 'MOBILE') && x.active);
    return c?.contactValue ?? '—';
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/pages/patient-list/
git commit -m "feat(pacientes): add PatientListPage"
```

---

## Phase F — Detail page

### Task F1: PatientDetailPage

**Files:**
- Create: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import {
  loadPatient, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
import {
  selectSelectedPatient, selectPatientPending,
} from '../../store/patient.selectors';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import { PatientFormDrawerComponent } from '../../components/patient-form-drawer/patient-form-drawer.component';

@Component({
  selector: 'pat-patient-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink, ButtonModule, TabsModule, TagModule, ConfirmDialogModule,
    DatePipe, DniPipe, AgePipe, EmptyStateComponent, PatientFormDrawerComponent,
  ],
  template: `
    @if (patient(); as p) {
      <div class="p-6">
        <a routerLink="/pacientes" class="inline-block mb-3">
          <p-button [text]="true" icon="pi pi-arrow-left" label="Volver a Pacientes" />
        </a>
        <header class="flex items-center justify-between mb-3">
          <h1 class="text-2xl font-semibold">
            {{ p.lastName }}, {{ p.firstName }}
            <p-tag [value]="p.status" severity="info" class="ml-2" />
            @if (!p.active) { <p-tag value="Inactivo" severity="danger" class="ml-1" /> }
          </h1>
          <div class="flex gap-2">
            <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" (onClick)="drawerOpen.set(true)" />
            <p-button
              severity="danger"
              [outlined]="true"
              [icon]="p.active ? 'pi pi-times-circle' : 'pi pi-refresh'"
              [label]="p.active ? 'Desactivar' : 'Reactivar'"
              (onClick)="confirmToggle()" />
          </div>
        </header>

        <div class="grid grid-cols-4 gap-3 mb-4">
          <div><div class="text-xs text-surface-500">DNI</div><div>{{ p.dni | dni }}</div></div>
          <div><div class="text-xs text-surface-500">Fecha nac.</div><div>{{ p.birthDate | date:'dd/MM/yyyy' }}</div></div>
          <div><div class="text-xs text-surface-500">Edad</div><div>{{ p.birthDate | age }} años</div></div>
          <div><div class="text-xs text-surface-500">Género · Sexo</div><div>{{ p.gender }} · {{ p.sexAtBirth }}</div></div>
        </div>

        <p-tabs value="data">
          <p-tablist>
            <p-tab value="data">Datos generales</p-tab>
            <p-tab value="contacts">Contactos</p-tab>
            <p-tab value="addresses">Direcciones</p-tab>
            <p-tab value="coverages">Coberturas</p-tab>
            <p-tab value="history">Historial</p-tab>
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="data">
              <p>Datos completos visibles arriba. Para editar usá el botón "Editar".</p>
            </p-tabpanel>
            <p-tabpanel value="contacts">
              @if (p.contacts.length === 0) {
                <ui-empty-state heading="Sin contactos" icon="pi-phone" />
              } @else {
                <ul class="space-y-1">
                  @for (c of p.contacts; track c.id ?? c.contactValue) {
                    <li class="flex gap-2 items-center">
                      <p-tag [value]="c.contactType" />
                      <span>{{ c.contactValue }}</span>
                      @if (c.isPrimary) { <p-tag severity="success" value="Primario" /> }
                      @if (!c.active) { <p-tag severity="danger" value="Inactivo" /> }
                    </li>
                  }
                </ul>
              }
            </p-tabpanel>
            <p-tabpanel value="addresses">
              @if (p.addresses.length === 0) {
                <ui-empty-state heading="Sin direcciones" icon="pi-map-marker" />
              } @else {
                <ul class="space-y-1">
                  @for (a of p.addresses; track a.id) {
                    <li>
                      {{ a.street }} {{ a.streetNumber }} {{ a.apartment ? '· ' + a.apartment : '' }} — {{ a.city }} / {{ a.province }}
                      @if (a.isPrimary) { <p-tag severity="success" value="Primario" class="ml-1" /> }
                      @if (!a.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
                    </li>
                  }
                </ul>
              }
            </p-tabpanel>
            <p-tabpanel value="coverages">
              @if (p.coverages.length === 0) {
                <ui-empty-state heading="Sin coberturas" icon="pi-id-card" />
              } @else {
                <ul class="space-y-1">
                  @for (c of p.coverages; track c.id) {
                    <li>
                      {{ planLabel(c.planId) }} — N° {{ c.memberNumber }}
                      @if (c.isPrimary) { <p-tag severity="success" value="Primario" class="ml-1" /> }
                      @if (!c.active) { <p-tag severity="danger" value="Inactivo" class="ml-1" /> }
                    </li>
                  }
                </ul>
              }
            </p-tabpanel>
            <p-tabpanel value="history">
              <ui-empty-state
                heading="Historial no disponible"
                icon="pi-history"
                hint="Se habilitará cuando se activen los módulos de turnos y estudios." />
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

        <p-confirmDialog />
        <pat-form-drawer [open]="drawerOpen()" [patient]="p" (closed)="drawerOpen.set(false)" />
      </div>
    } @else {
      <div class="p-6">{{ pending() ? 'Cargando…' : 'Paciente no encontrado.' }}</div>
    }
  `,
})
export class PatientDetailPage implements OnInit, OnDestroy {
  /** Comes from the routed param via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly pending = this.store.selectSignal(selectPatientPending);
  readonly drawerOpen = signal(false);

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.store.dispatch(loadPatient({ id: numericId }));
  }

  ngOnDestroy(): void { this.store.dispatch(clearSelectedPatient()); }

  planLabel(planId: number): string { return getCoveragePlanLabel(planId); }

  confirmToggle(): void {
    const p = this.patient();
    if (!p) return;
    const deleted = p.active;
    this.confirm.confirm({
      header: deleted ? '¿Desactivar paciente?' : '¿Reactivar paciente?',
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(togglePatientActive({ id: p.id, deleted })),
    });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/pages/patient-detail/
git commit -m "feat(pacientes): add PatientDetailPage"
```

---

## Phase G — Autocomplete

### Task G1: PatientSearchAutocomplete

**Files:**
- Create: `src/app/features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component.ts
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';

@Component({
  selector: 'pat-search-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoCompleteModule, DniPipe, AgePipe],
  template: `
    <p-autocomplete
      [suggestions]="suggestions()"
      (completeMethod)="onComplete($event)"
      (onSelect)="onSelect($event)"
      [delay]="300"
      placeholder="Buscar por nombre o DNI…"
      optionLabel="lastName"
      [forceSelection]="true">
      <ng-template let-p pTemplate="item">
        <div class="flex flex-col py-1">
          <div class="font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
          <div class="text-xs text-surface-500">
            DNI {{ p.dni | dni }} · {{ p.gender }} · {{ (p.birthDate | age) ?? '?' }} años
          </div>
        </div>
      </ng-template>
    </p-autocomplete>
  `,
})
export class PatientSearchAutocompleteComponent {
  readonly selected = output<Patient>();
  private readonly svc = inject(PatientService);
  readonly suggestions = signal<Patient[]>([]);

  onComplete(e: AutoCompleteCompleteEvent): void {
    const q = e.query?.trim();
    if (!q) { this.suggestions.set([]); return; }
    this.svc.search({ q, state: 'active', page: 0, size: 10 }).subscribe((res) => {
      this.suggestions.set(res.content);
    });
  }

  onSelect(e: AutoCompleteSelectEvent): void {
    this.selected.emit(e.value as Patient);
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/features/pacientes/components/patient-search-autocomplete/
git commit -m "feat(pacientes): add PatientSearchAutocomplete"
```

---

## Phase H — Routing and shell wiring

### Task H1: pacientes.routes.ts

**Files:**
- Create: `src/app/features/pacientes/pacientes.routes.ts`

- [ ] **Step 1: Write**

```ts
// src/app/features/pacientes/pacientes.routes.ts
import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/patient-list/patient-list.page').then((m) => m.PatientListPage),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage),
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/app/features/pacientes/pacientes.routes.ts
git commit -m "feat(pacientes): add feature routes"
```

---

### Task H2: Register `/pacientes` in app.routes.ts

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Edit**

Inside the shell route's `children` array, right after the `analitica` entry, add:

```ts
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./features/pacientes/pacientes.routes').then((m) => m.PACIENTES_ROUTES),
      },
```

- [ ] **Step 2: Typecheck + commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(pacientes): register /pacientes route"
```

---

### Task H3: Update sidebar nav

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Change path**

Replace the line:

```ts
{ kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/analitica/pacientes' },
```

with:

```ts
{ kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes' },
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout/sidebar/sidebar.nav.ts
git commit -m "feat(pacientes): point sidebar to /pacientes"
```

---

## Phase I — Cleanup of old paciente code

### Task I1: Remove old paciente page + analitica route

**Files:**
- Delete: `src/app/features/analitica/pages/pacientes/`
- Modify: `src/app/features/analitica/analitica.routes.ts`

- [ ] **Step 1: Delete folder**

Run (PowerShell): `Remove-Item -Recurse -Force src/app/features/analitica/pages/pacientes`

- [ ] **Step 2: Edit `analitica.routes.ts`**

Remove the line `{ path: 'pacientes', loadComponent: ... PacientesComponent },` and update the default redirect to `atencion`:

```ts
{ path: '', redirectTo: 'atencion', pathMatch: 'full' },
```

- [ ] **Step 3: Typecheck + commit**

```bash
git add src/app/features/analitica/
git commit -m "chore(analitica): remove old paciente page (moved to features/pacientes)"
```

---

### Task I2: Remove Paciente from analitica model, store, service

**Files:**
- Modify: `src/app/features/analitica/models/analitica.model.ts` — delete `Paciente` interface
- Modify: `src/app/features/analitica/store/analitica.state.ts` — drop `pacientes` from state + initial
- Modify: `src/app/features/analitica/store/analitica.actions.ts` — delete `loadPacientes`, `loadPacientesSuccess`, `loadPacientesFailure`
- Modify: `src/app/features/analitica/store/analitica.reducer.ts` — drop the three `on(loadPacientes…)` blocks + imports
- Modify: `src/app/features/analitica/store/analitica.selectors.ts` — delete `selectAllPacientes`
- Modify: `src/app/features/analitica/store/analitica.effects.ts` — drop `loadPacientes$` effect + imports
- Modify: `src/app/features/analitica/services/analitica.service.ts` — delete `getPacientes()` + Paciente import

- [ ] **Step 1: Apply all edits above**

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`

If anything else in the codebase still imports `Paciente` from `@features/analitica/...` or references `selectAllPacientes`/`loadPacientes`, switch each to use `Patient` from `@features/pacientes/models/patient.model` and the new store/selectors. Re-run typecheck until clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/
git commit -m "chore(analitica): remove Paciente type, actions, effects, selectors, service method"
```

---

### Task I3: Permissions service + gate buttons

**Files:**
- Create: `src/app/features/pacientes/services/patient-permissions.service.ts`
- Modify: `src/app/features/pacientes/pages/patient-list/patient-list.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Implement service**

```ts
// src/app/features/pacientes/services/patient-permissions.service.ts
import { Injectable, computed, inject } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

// Backend authorises mutations for ADMINISTRADOR / SECRETARIA.
// Frontend Role enum uses lowercase ids: 'admin', 'administrativo', 'recepcionista'.
const MUTATING_ROLES = new Set([
  'admin', 'administrativo', 'recepcionista',
  'ADMINISTRADOR', 'SECRETARIA',
]);

@Injectable({ providedIn: 'root' })
export class PatientPermissionsService {
  private readonly tokens = inject(TokenService);
  readonly canMutate = computed(() =>
    this.tokens.getRoles().some((r) => MUTATING_ROLES.has(r)),
  );
}
```

- [ ] **Step 2: Gate buttons in list page**

In `PatientListPage`:

```ts
import { PatientPermissionsService } from '../../services/patient-permissions.service';
// inside class:
private readonly perms = inject(PatientPermissionsService);
readonly canMutate = this.perms.canMutate;
```

Wrap each mutation control in the template:

```html
@if (canMutate()) {
  <p-button label="Nuevo paciente" icon="pi pi-plus" (onClick)="openCreate()" />
}
```

And inside the row actions:

```html
<a [routerLink]="['/pacientes', p.id]">
  <p-button [text]="true" icon="pi pi-eye" pTooltip="Ver detalle" ariaLabel="Ver detalle" />
</a>
@if (canMutate()) {
  <p-button [text]="true" icon="pi pi-pencil" pTooltip="Editar" ariaLabel="Editar" (onClick)="openEdit(p)" />
  <p-button [text]="true" icon="pi pi-times-circle" pTooltip="Activar/Desactivar" ariaLabel="Activar/Desactivar" (onClick)="confirmToggle(p)" />
}
```

Empty state CTA also gated:

```html
@if (canMutate()) {
  <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" (ctaClick)="openCreate()" />
} @else {
  <ui-empty-state heading="Sin pacientes" icon="pi-users" />
}
```

- [ ] **Step 3: Gate buttons in detail page**

Same injection. In the header actions:

```html
@if (canMutate()) {
  <div class="flex gap-2">
    <p-button severity="secondary" [outlined]="true" icon="pi pi-pencil" label="Editar" (onClick)="drawerOpen.set(true)" />
    <p-button severity="danger" [outlined]="true" [icon]="p.active ? 'pi pi-times-circle' : 'pi pi-refresh'" [label]="p.active ? 'Desactivar' : 'Reactivar'" (onClick)="confirmToggle()" />
  </div>
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
git add src/app/features/pacientes/
git commit -m "feat(pacientes): gate mutation actions by user role"
```

---

### Task I4: Notification toasts + 404 redirect

**Files:**
- Modify: `src/app/features/pacientes/store/patient.effects.ts`
- Modify: `src/app/features/pacientes/store/patient.effects.spec.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Inject `NotificationService` in effects**

Add to `patient.effects.ts`:

```ts
import { NotificationService } from '@core/services/notification.service';
// inside class:
private readonly notifications = inject(NotificationService);
```

Update specific `catchError` blocks to also trigger a toast for non-form errors:

```ts
// In loadPatients$:
catchError((error: HttpErrorResponse) => {
  this.notifications.error('No se pudieron cargar los pacientes');
  return of(loadPatientsFailure({ error }));
}),
// In loadPatient$:
catchError((error: HttpErrorResponse) => {
  this.notifications.error('No se pudo cargar el paciente');
  return of(loadPatientFailure({ error }));
}),
// In togglePatientActive$:
catchError((error: HttpErrorResponse) => {
  this.notifications.error('No se pudo actualizar el paciente');
  return of(togglePatientActiveFailure({ error }));
}),
```

Form errors (`addPatientFailure`, `updatePatientFailure`) stay silent — the drawer already shows an inline banner.

- [ ] **Step 2: Update effects spec**

Add a `NotificationService` mock in the spec providers:

```ts
import { NotificationService } from '@core/services/notification.service';
const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() };
// inside providers:
{ provide: NotificationService, useValue: notify },
```

Re-run effects spec: `npx ng test --no-watch --include='**/patient.effects.spec.ts'` — expect 4 passed.

- [ ] **Step 3: 404 redirect in detail page**

In `PatientDetailPage`:

```ts
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { loadPatientFailure } from '../../store/patient.actions';

// inside class:
private readonly actions$ = inject(Actions);

constructor() {
  this.actions$
    .pipe(ofType(loadPatientFailure), takeUntilDestroyed())
    .subscribe(() => this.router.navigate(['/pacientes']));
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
git add src/app/features/pacientes/
git commit -m "feat(pacientes): toast load/toggle errors, redirect on 404 detail"
```

---

### Task I5: Component smoke tests

**Files:**
- Create: `src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts`
- Create: `src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.spec.ts`

- [ ] **Step 1: List page spec**

```ts
// src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PatientListPage } from './patient-list.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { loadPatients, setPatientPageRequest } from '../../store/patient.actions';

describe('PatientListPage (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientListPage],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('dispatches loadPatients on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(loadPatients({ req: initialPatientState.pageRequest }));
  });

  it('setState dispatches setPatientPageRequest with state and page=0', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.setState('inactive');
    expect(spy).toHaveBeenCalledWith(setPatientPageRequest({ patch: { state: 'inactive', page: 0 } }));
  });

  it('onPage maps first/rows to page/size', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onPage({ first: 40, rows: 20 });
    expect(spy).toHaveBeenCalledWith(setPatientPageRequest({ patch: { page: 2, size: 20 } }));
  });
});
```

- [ ] **Step 2: Form drawer spec**

```ts
// src/app/features/pacientes/components/patient-form-drawer/patient-form-drawer.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PatientFormDrawerComponent } from './patient-form-drawer.component';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import { checkPatientDni } from '../../store/patient.actions';

describe('PatientFormDrawerComponent (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientFormDrawerComponent],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders without errors when open=false', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('patient', null);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('dispatches checkPatientDni when a valid dni is typed (create mode)', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('patient', null);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.form.get('general.dni')?.setValue('32456789');
    expect(spy).toHaveBeenCalledWith(checkPatientDni({ dni: '32456789' }));
  });

  it('hydrates form from patient input when in edit mode', () => {
    const fixture = TestBed.createComponent(PatientFormDrawerComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('patient', {
      id: 1, dni: '32456789', firstName: 'María', lastName: 'García',
      birthDate: '1991-03-15', gender: 'FEMALE', sexAtBirth: 'FEMALE',
      status: 'COMPLETE', contacts: [], addresses: [], coverages: [], active: true,
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.form.get('general.firstName')?.value).toBe('María');
    expect(fixture.componentInstance.form.get('general.dni')?.disabled).toBe(true);
  });
});
```

- [ ] **Step 3: Run — expect green**

Run: `npx ng test --no-watch --include='**/patient-list.page.spec.ts' --include='**/patient-form-drawer.component.spec.ts'`

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/
git commit -m "test(pacientes): add list page and form drawer smoke tests"
```

---

## Phase J — Final QA

### Task J1: Full unit-test run

- [ ] **Step 1:** Run: `npm test` (or `npx ng test --no-watch`)
Expected: all green.

- [ ] **Step 2:** If any failure, diagnose and fix in place. No skip-workarounds.

---

### Task J2: Production build

- [ ] **Step 1:** Run: `npm run build`
Expected: exits 0.

- [ ] **Step 2:** Fix any errors (most likely: PrimeNG module imports — confirm names against `node_modules/primeng/<component>/index.d.ts` — Tailwind class typos, or strict template binding issues).

---

### Task J3: Smoke test in dev server (manual)

- [ ] **Step 1:** Run `npm start`. Open `http://localhost:4200`.

- [ ] **Step 2:** Verify these 10 flows:

1. Login (dev bypass) → land in `/home`
2. Sidebar shows **Pacientes** under "Core clínico" pointing to `/pacientes`
3. `/pacientes` renders the list page (empty state if backend has no data)
4. "Nuevo paciente" opens the drawer; accordion shows 4 sections
5. Type a fake DNI (8 digits) → no JS error in console; if backend reports duplicate the inline message appears
6. Cancel closes the drawer
7. Edit on an existing row opens the drawer in edit mode with DNI disabled
8. Click "Ver detalle" → navigates to `/pacientes/:id` with tabs
9. Back link returns to `/pacientes`
10. Sidebar **Pacientes** is highlighted active when on the route

- [ ] **Step 3:** Commit any fixes:

```bash
git add -A
git commit -m "fix(pacientes): smoke-test corrections"
```

(Skip if no fixes needed.)

---

### Task J4: Backend seeding coordination note

- [ ] **Step 1:** Append to `docs/superpowers/specs/2026-05-12-pacientes-feature-design.md` or open an issue:

> The frontend `COVERAGE_PLAN_CATALOG` exposes planIds 1..7 to users. Before this feature is enabled in any environment with real users, the backend MUST seed rows in the `coverage_plans` table (or equivalent) with these exact ids. Without the seed, alta with cobertura will fail validation.

- [ ] **Step 2:** Commit

```bash
git add docs/
git commit -m "docs(pacientes): note backend coverage-plan seeding requirement"
```

---

## Definition of Done

- [ ] All tasks above completed and committed
- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] Manual smoke test (J3) passes all 10 flows
- [ ] Backend coverage-plans seeding documented (J4)
- [ ] No remaining references to the old `Paciente` type / `loadPacientes` action / `getPacientes()` method
