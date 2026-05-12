# Pacientes Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Pacientes feature in the Angular admin frontend, consuming the backend at `/api/v1/analitica/patients` (listing with filters and server-side pagination, alta/edición modal with expandable sections, detail page with tabs, reusable search autocomplete, soft-delete toggle).

**Architecture:** Standalone feature at `src/app/features/pacientes/` with the project's monolithic layout (`models/`, `services/`, `store/`, `pages/`, `components/`). NgRx classic with global state registration via `provideState`/`provideEffects` in `app.config.ts` (mirrors every other feature in the project). PrimeNG + Tailwind for UI. Vitest for unit tests. Source code in **English 1:1 with backend** (firstName/lastName/dni/birthDate…); user-facing labels in Spanish.

**Tech Stack:** Angular 21 standalone + OnPush · NgRx Store + Effects · PrimeNG 21 · Tailwind 4 · Vitest 4 · TypeScript 5.9

**Spec:** [docs/superpowers/specs/2026-05-12-pacientes-feature-design.md](../specs/2026-05-12-pacientes-feature-design.md)

**Conventions adopted from project (override two minor spec details):**
- State is registered globally in `app.config.ts`, not via route providers
- Actions use `createAction` individually (not `createActionGroup`), mirroring `analitica`/`empresa`/`turnos`

**Backend folder note:** The backend lives in `../Backend/` (renamed from `laboratorio/`). This plan only touches the frontend; no backend changes required except a one-time data seed for coverage planIds 1..7.

---

## Phase A — Models and service skeleton

### Task A1: Create feature folder skeleton

**Files:**
- Create directories under `src/app/features/pacientes/`:
  - `models/`, `services/`, `store/`, `pages/patient-list/`, `pages/patient-detail/`, `components/patient-form-modal/`, `components/patient-search-autocomplete/`, `components/contact-section/`, `components/address-section/`, `components/coverage-section/`

- [ ] **Step 1: Create the folder tree**

Run (PowerShell, from project root):

```powershell
$base = "src/app/features/pacientes"
$dirs = @("models","services","store",
  "pages/patient-list","pages/patient-detail",
  "components/patient-form-modal","components/patient-search-autocomplete",
  "components/contact-section","components/address-section","components/coverage-section")
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path "$base/$_" | Out-Null }
```

Expected: no output (folders created silently).

- [ ] **Step 2: Verify with `ls`**

Run: `ls src/app/features/pacientes`
Expected: shows `components`, `models`, `pages`, `services`, `store`.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes
git commit -m "chore(pacientes): scaffold feature folder structure"
```

> Note: Git ignores empty directories. The commit will only land once a file lives in any subfolder; treat this step as informational and roll its commit into Task A2.

---

### Task A2: Patient domain models

**Files:**
- Create: `src/app/features/pacientes/models/patient.model.ts`

- [ ] **Step 1: Write the model file**

```ts
// src/app/features/pacientes/models/patient.model.ts
export type PatientStatus = 'MIN' | 'COMPLETE' | 'VERIFIED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
export type SexAtBirth = 'MALE' | 'FEMALE' | 'INTERSEX';
export type ContactType = 'EMAIL' | 'PHONE' | 'MOBILE';

export interface Contact {
  id?: number;
  contactValue: string;
  contactType: ContactType;
  isPrimary: boolean;
  active: boolean;
}

export interface Address {
  id?: number;
  city?: string;
  province?: string;
  street?: string;
  streetNumber?: string;
  apartment?: string;
  neighborhood?: string;
  zipCode?: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Coverage {
  id?: number;
  planId: number;
  memberNumber: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Patient {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null; // ISO yyyy-MM-dd
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  status: PatientStatus;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
  active: boolean;
}

export interface CreatePatientRequest {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
}

export type UpdatePatientRequest = Omit<CreatePatientRequest, 'dni'>;
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0 (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/models/patient.model.ts
git commit -m "feat(pacientes): add patient domain models"
```

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

- [ ] **Step 1: Write the catalog**

```ts
// src/app/features/pacientes/models/coverage-plans.catalog.ts
export interface CoveragePlanOption {
  planId: number;
  label: string;
}

/**
 * Local stub until the backend exposes a coverage-plans catalog endpoint.
 * Backend MUST have rows with these exact planIds seeded before alta with cobertura
 * works in production.
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

- [ ] **Step 2: Test the helper**

Create `src/app/features/pacientes/models/coverage-plans.catalog.spec.ts`:

```ts
import { getCoveragePlanLabel, COVERAGE_PLAN_CATALOG } from './coverage-plans.catalog';

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

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/app/features/pacientes/models/coverage-plans.catalog.spec.ts`
Expected: 4 passed.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/models/
git commit -m "feat(pacientes): add coverage plans catalog stub"
```

---

### Task A5: PatientService — HTTP capa

**Files:**
- Create: `src/app/features/pacientes/services/patient.service.ts`
- Create: `src/app/features/pacientes/services/patient.service.spec.ts`

- [ ] **Step 1: Write the failing test**

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

  it('search builds query params correctly', () => {
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

  it('getByIds repeats ids param', () => {
    service.getByIds([1, 2, 3]).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/analitica/patients/by-ids');
    expect(req.request.params.getAll('ids')).toEqual(['1', '2', '3']);
    req.flush([]);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/app/features/pacientes/services/patient.service.spec.ts`
Expected: FAIL — `PatientService` not found.

- [ ] **Step 3: Implement the service**

```ts
// src/app/features/pacientes/services/patient.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
} from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/patients';

  search(req: PatientPageRequest): Observable<PatientPageResult> {
    let params = new HttpParams()
      .set('state', req.state)
      .set('page', req.page)
      .set('size', req.size);
    if (req.q) params = params.set('q', req.q);
    if (req.status) params = params.set('status', req.status);
    return this.http.get<PatientPageResult>(`${this.base}/search`, { params });
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/${id}`);
  }

  getByIds(ids: number[]): Observable<Patient[]> {
    const params = new HttpParams({ fromObject: { ids: ids.map(String) } });
    return this.http.get<Patient[]>(`${this.base}/by-ids`, { params });
  }

  existsByDni(dni: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.base}/exists`, { params: { dni } })
      .pipe(map((r) => r.exists));
  }

  create(req: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.base, req);
  }

  update(id: number, req: UpdatePatientRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.base}/${id}`, req);
  }

  toggleActive(id: number, deleted: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { deleted });
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/app/features/pacientes/services/patient.service.spec.ts`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/services/
git commit -m "feat(pacientes): add PatientService with full HTTP API"
```

---

## Phase B — Pipes (DNI and Age) in shared

### Task B1: DniPipe

**Files:**
- Create: `src/app/shared/pipes/dni.pipe.ts`
- Create: `src/app/shared/pipes/dni.pipe.spec.ts`
- Modify: `src/app/shared/pipes/index.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/app/shared/pipes/dni.pipe.spec.ts
import { DniPipe } from './dni.pipe';

describe('DniPipe', () => {
  const pipe = new DniPipe();

  it('formats 8 digits as ##.###.###', () => {
    expect(pipe.transform('32456789')).toBe('32.456.789');
  });

  it('formats 7 digits as #.###.###', () => {
    expect(pipe.transform('1234567')).toBe('1.234.567');
  });

  it('strips non-digits before formatting', () => {
    expect(pipe.transform('32.456.789')).toBe('32.456.789');
    expect(pipe.transform('32-456-789')).toBe('32.456.789');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('returns raw input when length is < 7 (assume invalid, do not format)', () => {
    expect(pipe.transform('123')).toBe('123');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app/shared/pipes/dni.pipe.spec.ts`
Expected: FAIL — `DniPipe` not found.

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
    // Insert thousand separators from the right
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/app/shared/pipes/dni.pipe.spec.ts`
Expected: 5 passed.

- [ ] **Step 5: Export from barrel**

Open `src/app/shared/pipes/index.ts` and add the line:

```ts
export * from './dni.pipe';
```

(Keep the existing exports intact.)

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/pipes/dni.pipe.ts src/app/shared/pipes/dni.pipe.spec.ts src/app/shared/pipes/index.ts
git commit -m "feat(shared): add DniPipe for AR DNI formatting"
```

---

### Task B2: AgePipe

**Files:**
- Create: `src/app/shared/pipes/age.pipe.ts`
- Create: `src/app/shared/pipes/age.pipe.spec.ts`
- Modify: `src/app/shared/pipes/index.ts`

- [ ] **Step 1: Write the failing test**

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

  it('handles birthday today', () => {
    expect(pipe.transform('2000-05-12', today)).toBe(26);
  });

  it('returns null for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(pipe.transform('not-a-date')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app/shared/pipes/age.pipe.spec.ts`
Expected: FAIL.

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
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    return age;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/app/shared/pipes/age.pipe.spec.ts`
Expected: 5 passed.

- [ ] **Step 5: Export from barrel**

Add to `src/app/shared/pipes/index.ts`:

```ts
export * from './age.pipe';
```

- [ ] **Step 6: Commit**

```bash
git add src/app/shared/pipes/age.pipe.ts src/app/shared/pipes/age.pipe.spec.ts src/app/shared/pipes/index.ts
git commit -m "feat(shared): add AgePipe (years from birthDate)"
```

---

## Phase C — NgRx store (state, actions, reducer, selectors, effects)

### Task C1: PatientState + feature key

**Files:**
- Create: `src/app/features/pacientes/store/patient.state.ts`

- [ ] **Step 1: Write the file**

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
  loading: boolean;
  error: HttpErrorResponse | null;

  selected: Patient | null;
  selectedLoading: boolean;

  saving: boolean;
  saveError: HttpErrorResponse | null;
  dniCheck: { dni: string; exists: boolean } | null;
}

export const initialPatientState: PatientState = {
  items: [],
  totalElements: 0,
  totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  loading: false,
  error: null,
  selected: null,
  selectedLoading: false,
  saving: false,
  saveError: null,
  dniCheck: null,
};

export const PATIENT_FEATURE_KEY = 'patients';
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/store/patient.state.ts
git commit -m "feat(pacientes): add patient store state shape"
```

---

### Task C2: Patient actions

**Files:**
- Create: `src/app/features/pacientes/store/patient.actions.ts`

- [ ] **Step 1: Write the actions**

```ts
// src/app/features/pacientes/store/patient.actions.ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import {
  CreatePatientRequest,
  Patient,
  UpdatePatientRequest,
} from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

// List
export const searchRequested = createAction(
  '[Patient Page] Search Requested',
  props<{ req: PatientPageRequest }>(),
);
export const searchSucceeded = createAction(
  '[Patient API] Search Succeeded',
  props<{ result: PatientPageResult }>(),
);
export const searchFailed = createAction(
  '[Patient API] Search Failed',
  props<{ error: HttpErrorResponse }>(),
);
export const pageRequestChanged = createAction(
  '[Patient Page] Page Request Changed',
  props<{ patch: Partial<PatientPageRequest> }>(),
);

// Detail
export const loadRequested = createAction(
  '[Patient Page] Load Requested',
  props<{ id: number }>(),
);
export const loadSucceeded = createAction(
  '[Patient API] Load Succeeded',
  props<{ patient: Patient }>(),
);
export const loadFailed = createAction(
  '[Patient API] Load Failed',
  props<{ error: HttpErrorResponse }>(),
);
export const cleared = createAction('[Patient Page] Cleared');

// Form (create + update share saving state)
export const createRequested = createAction(
  '[Patient Form] Create Requested',
  props<{ req: CreatePatientRequest }>(),
);
export const createSucceeded = createAction(
  '[Patient API] Create Succeeded',
  props<{ patient: Patient }>(),
);
export const updateRequested = createAction(
  '[Patient Form] Update Requested',
  props<{ id: number; req: UpdatePatientRequest }>(),
);
export const updateSucceeded = createAction(
  '[Patient API] Update Succeeded',
  props<{ patient: Patient }>(),
);
export const saveFailed = createAction(
  '[Patient API] Save Failed',
  props<{ error: HttpErrorResponse }>(),
);
export const formReset = createAction('[Patient Form] Reset');

// DNI async validator
export const checkDniRequested = createAction(
  '[Patient Form] Check Dni Requested',
  props<{ dni: string }>(),
);
export const checkDniSucceeded = createAction(
  '[Patient API] Check Dni Succeeded',
  props<{ dni: string; exists: boolean }>(),
);
export const checkDniFailed = createAction(
  '[Patient API] Check Dni Failed',
  props<{ error: HttpErrorResponse }>(),
);

// Toggle soft delete
export const toggleRequested = createAction(
  '[Patient Row] Toggle Requested',
  props<{ id: number; deleted: boolean }>(),
);
export const toggleSucceeded = createAction(
  '[Patient API] Toggle Succeeded',
  props<{ id: number; deleted: boolean }>(),
);
export const toggleFailed = createAction(
  '[Patient API] Toggle Failed',
  props<{ error: HttpErrorResponse }>(),
);
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/store/patient.actions.ts
git commit -m "feat(pacientes): add patient actions"
```

---

### Task C3: Patient reducer + tests

**Files:**
- Create: `src/app/features/pacientes/store/patient.reducer.ts`
- Create: `src/app/features/pacientes/store/patient.reducer.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/features/pacientes/store/patient.reducer.spec.ts
import { HttpErrorResponse } from '@angular/common/http';
import { patientReducer } from './patient.reducer';
import { initialPatientState } from './patient.state';
import * as A from './patient.actions';
import { Patient } from '../models/patient.model';

const mkPatient = (id: number, active = true): Patient => ({
  id, dni: `${id}`, firstName: `f${id}`, lastName: `l${id}`,
  birthDate: '1990-01-01', gender: 'FEMALE', sexAtBirth: 'FEMALE',
  status: 'MIN', contacts: [], addresses: [], coverages: [], active,
});

describe('patientReducer', () => {
  it('searchRequested sets loading=true and clears error', () => {
    const before = { ...initialPatientState, error: { status: 500 } as HttpErrorResponse };
    const next = patientReducer(before, A.searchRequested({ req: initialPatientState.pageRequest }));
    expect(next.loading).toBe(true);
    expect(next.error).toBeNull();
  });

  it('searchSucceeded replaces items, totals, and clears loading', () => {
    const result = { content: [mkPatient(1)], totalElements: 1, totalPages: 1, page: 0, size: 20 };
    const next = patientReducer({ ...initialPatientState, loading: true }, A.searchSucceeded({ result }));
    expect(next.items.length).toBe(1);
    expect(next.totalElements).toBe(1);
    expect(next.totalPages).toBe(1);
    expect(next.loading).toBe(false);
  });

  it('pageRequestChanged merges patch into pageRequest', () => {
    const next = patientReducer(initialPatientState, A.pageRequestChanged({ patch: { q: 'gar', page: 2 } }));
    expect(next.pageRequest).toEqual({ ...initialPatientState.pageRequest, q: 'gar', page: 2 });
  });

  it('updateSucceeded replaces the matching item in items by id', () => {
    const before = { ...initialPatientState, items: [mkPatient(1), mkPatient(2)], saving: true };
    const updated = { ...mkPatient(1), firstName: 'changed' };
    const next = patientReducer(before, A.updateSucceeded({ patient: updated }));
    expect(next.items[0].firstName).toBe('changed');
    expect(next.items[1].firstName).toBe('f2');
    expect(next.saving).toBe(false);
    expect(next.saveError).toBeNull();
  });

  it('updateSucceeded keeps items untouched if id is not present', () => {
    const before = { ...initialPatientState, items: [mkPatient(1)] };
    const next = patientReducer(before, A.updateSucceeded({ patient: mkPatient(999) }));
    expect(next.items).toEqual(before.items);
  });

  it('toggleSucceeded flips active flag of the targeted item only', () => {
    const before = { ...initialPatientState, items: [mkPatient(1, true), mkPatient(2, true)] };
    const next = patientReducer(before, A.toggleSucceeded({ id: 1, deleted: true }));
    expect(next.items[0].active).toBe(false);
    expect(next.items[1].active).toBe(true);
  });

  it('loadSucceeded sets selected and clears selectedLoading', () => {
    const next = patientReducer({ ...initialPatientState, selectedLoading: true }, A.loadSucceeded({ patient: mkPatient(5) }));
    expect(next.selected?.id).toBe(5);
    expect(next.selectedLoading).toBe(false);
  });

  it('cleared resets selected and selectedLoading', () => {
    const before = { ...initialPatientState, selected: mkPatient(5), selectedLoading: true };
    const next = patientReducer(before, A.cleared());
    expect(next.selected).toBeNull();
    expect(next.selectedLoading).toBe(false);
  });

  it('checkDniSucceeded stores last check', () => {
    const next = patientReducer(initialPatientState, A.checkDniSucceeded({ dni: '32456789', exists: true }));
    expect(next.dniCheck).toEqual({ dni: '32456789', exists: true });
  });

  it('createRequested sets saving=true and clears saveError', () => {
    const before = { ...initialPatientState, saveError: { status: 400 } as HttpErrorResponse };
    const next = patientReducer(before, A.createRequested({
      req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] },
    }));
    expect(next.saving).toBe(true);
    expect(next.saveError).toBeNull();
  });

  it('saveFailed sets saving=false and saveError', () => {
    const err = { status: 409 } as HttpErrorResponse;
    const next = patientReducer({ ...initialPatientState, saving: true }, A.saveFailed({ error: err }));
    expect(next.saving).toBe(false);
    expect(next.saveError).toBe(err);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app/features/pacientes/store/patient.reducer.spec.ts`
Expected: FAIL — `patientReducer` not found.

- [ ] **Step 3: Implement the reducer**

```ts
// src/app/features/pacientes/store/patient.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { PatientState, initialPatientState } from './patient.state';
import * as A from './patient.actions';

export const patientReducer = createReducer(
  initialPatientState,

  // List
  on(A.searchRequested, (state): PatientState => ({ ...state, loading: true, error: null })),
  on(A.searchSucceeded, (state, { result }): PatientState => ({
    ...state,
    items: result.content,
    totalElements: result.totalElements,
    totalPages: result.totalPages,
    loading: false,
    error: null,
  })),
  on(A.searchFailed, (state, { error }): PatientState => ({ ...state, loading: false, error })),
  on(A.pageRequestChanged, (state, { patch }): PatientState => ({
    ...state,
    pageRequest: { ...state.pageRequest, ...patch },
  })),

  // Detail
  on(A.loadRequested, (state): PatientState => ({ ...state, selectedLoading: true })),
  on(A.loadSucceeded, (state, { patient }): PatientState => ({
    ...state,
    selected: patient,
    selectedLoading: false,
  })),
  on(A.loadFailed, (state): PatientState => ({ ...state, selectedLoading: false })),
  on(A.cleared, (state): PatientState => ({ ...state, selected: null, selectedLoading: false })),

  // Form
  on(A.createRequested, (state): PatientState => ({ ...state, saving: true, saveError: null })),
  on(A.updateRequested, (state): PatientState => ({ ...state, saving: true, saveError: null })),
  on(A.createSucceeded, (state): PatientState => ({ ...state, saving: false, saveError: null })),
  on(A.updateSucceeded, (state, { patient }): PatientState => ({
    ...state,
    saving: false,
    saveError: null,
    items: state.items.map((p) => (p.id === patient.id ? patient : p)),
    selected: state.selected?.id === patient.id ? patient : state.selected,
  })),
  on(A.saveFailed, (state, { error }): PatientState => ({ ...state, saving: false, saveError: error })),
  on(A.formReset, (state): PatientState => ({ ...state, saving: false, saveError: null })),

  // Dni
  on(A.checkDniSucceeded, (state, { dni, exists }): PatientState => ({
    ...state,
    dniCheck: { dni, exists },
  })),

  // Toggle
  on(A.toggleSucceeded, (state, { id, deleted }): PatientState => ({
    ...state,
    items: state.items.map((p) => (p.id === id ? { ...p, active: !deleted } : p)),
    selected: state.selected?.id === id ? { ...state.selected, active: !deleted } : state.selected,
  })),
);
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/app/features/pacientes/store/patient.reducer.spec.ts`
Expected: 11 passed.

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

- [ ] **Step 1: Write the failing test**

```ts
// src/app/features/pacientes/store/patient.selectors.spec.ts
import { selectDniCheck, selectPatientItems } from './patient.selectors';
import { PATIENT_FEATURE_KEY, initialPatientState } from './patient.state';

describe('patient selectors', () => {
  const state = {
    [PATIENT_FEATURE_KEY]: {
      ...initialPatientState,
      items: [{ id: 1 } as never],
      dniCheck: { dni: '32456789', exists: true },
    },
  } as never;

  it('selectPatientItems returns items slice', () => {
    expect(selectPatientItems(state)).toEqual([{ id: 1 }]);
  });

  it('selectDniCheck factory returns true when dni matches and exists', () => {
    expect(selectDniCheck('32456789')(state)).toBe(true);
  });

  it('selectDniCheck factory returns false when dni matches but exists=false', () => {
    const s = {
      [PATIENT_FEATURE_KEY]: { ...initialPatientState, dniCheck: { dni: '111', exists: false } },
    } as never;
    expect(selectDniCheck('111')(s)).toBe(false);
  });

  it('selectDniCheck factory returns null when dni does not match the cached check', () => {
    expect(selectDniCheck('different')(state)).toBeNull();
  });

  it('selectDniCheck factory returns null when no check has run', () => {
    const s = { [PATIENT_FEATURE_KEY]: { ...initialPatientState, dniCheck: null } } as never;
    expect(selectDniCheck('111')(s)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app/features/pacientes/store/patient.selectors.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/app/features/pacientes/store/patient.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PATIENT_FEATURE_KEY, PatientState } from './patient.state';

export const selectPatientFeature = createFeatureSelector<PatientState>(PATIENT_FEATURE_KEY);

export const selectPatientItems = createSelector(selectPatientFeature, (s) => s.items);
export const selectPatientTotalElements = createSelector(selectPatientFeature, (s) => s.totalElements);
export const selectPatientTotalPages = createSelector(selectPatientFeature, (s) => s.totalPages);
export const selectPatientPageRequest = createSelector(selectPatientFeature, (s) => s.pageRequest);
export const selectPatientLoading = createSelector(selectPatientFeature, (s) => s.loading);
export const selectPatientError = createSelector(selectPatientFeature, (s) => s.error);

export const selectSelectedPatient = createSelector(selectPatientFeature, (s) => s.selected);
export const selectSelectedLoading = createSelector(selectPatientFeature, (s) => s.selectedLoading);

export const selectPatientSaving = createSelector(selectPatientFeature, (s) => s.saving);
export const selectPatientSaveError = createSelector(selectPatientFeature, (s) => s.saveError);

/**
 * Factory selector.
 * Returns:
 *   - true/false  if the cached dni check matches the given dni
 *   - null        if no check has been run for this dni (validator should remain pending)
 */
export const selectDniCheck = (dni: string) =>
  createSelector(selectPatientFeature, (s) => {
    if (!s.dniCheck) return null;
    return s.dniCheck.dni === dni ? s.dniCheck.exists : null;
  });
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/app/features/pacientes/store/patient.selectors.spec.ts`
Expected: 5 passed.

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

- [ ] **Step 1: Write the failing test**

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
import * as A from './patient.actions';
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
    svc = {
      search: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      toggleActive: vi.fn(),
      existsByDni: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        PatientEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        { provide: PatientService, useValue: svc },
      ],
    });
  });

  it('search$ maps to searchSucceeded', (done) => {
    svc.search.mockReturnValue(of({ content: [patient], totalElements: 1, totalPages: 1, page: 0, size: 20 }));
    actions$ = of(A.searchRequested({ req: initialPatientState.pageRequest }));
    const effects = TestBed.inject(PatientEffects);
    effects.search$.subscribe((action) => {
      expect(action.type).toBe(A.searchSucceeded.type);
      done();
    });
  });

  it('search$ maps errors to searchFailed', (done) => {
    svc.search.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    actions$ = of(A.searchRequested({ req: initialPatientState.pageRequest }));
    TestBed.inject(PatientEffects).search$.subscribe((action) => {
      expect(action.type).toBe(A.searchFailed.type);
      done();
    });
  });

  it('create$ on success dispatches createSucceeded then searchRequested', (done) => {
    svc.create.mockReturnValue(of(patient));
    actions$ = of(A.createRequested({
      req: { dni: '1', firstName: 'a', lastName: 'b', birthDate: null, gender: null, sexAtBirth: null, contacts: [], addresses: [], coverages: [] },
    }));
    const emitted: Action[] = [];
    TestBed.inject(PatientEffects).create$.subscribe({
      next: (a) => emitted.push(a),
      complete: () => {
        expect(emitted.map((a) => a.type)).toEqual([A.createSucceeded.type, A.searchRequested.type]);
        done();
      },
    });
  });

  it('toggle$ maps to toggleSucceeded with id and deleted', (done) => {
    svc.toggleActive.mockReturnValue(of(undefined));
    actions$ = of(A.toggleRequested({ id: 1, deleted: true }));
    TestBed.inject(PatientEffects).toggle$.subscribe((a) => {
      expect(a).toEqual(A.toggleSucceeded({ id: 1, deleted: true }));
      done();
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/app/features/pacientes/store/patient.effects.spec.ts`
Expected: FAIL — effects not implemented.

- [ ] **Step 3: Implement effects**

```ts
// src/app/features/pacientes/store/patient.effects.ts
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, concatMap, debounceTime, distinctUntilChanged, exhaustMap, filter, map, mergeMap, of, switchMap, withLatestFrom } from 'rxjs';

import { PatientService } from '../services/patient.service';
import * as A from './patient.actions';
import { selectPatientPageRequest } from './patient.selectors';

@Injectable()
export class PatientEffects {
  private readonly actions$ = inject(Actions);
  private readonly svc = inject(PatientService);
  private readonly store = inject(Store);

  search$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.searchRequested),
      debounceTime(300),
      switchMap(({ req }) =>
        this.svc.search(req).pipe(
          map((result) => A.searchSucceeded({ result })),
          catchError((error) => of(A.searchFailed({ error }))),
        ),
      ),
    ),
  );

  // pageRequestChanged → searchRequested with merged page request from store
  pageRequestPropagation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.pageRequestChanged),
      withLatestFrom(this.store.select(selectPatientPageRequest)),
      map(([, req]) => A.searchRequested({ req })),
    ),
  );

  loadDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadRequested),
      switchMap(({ id }) =>
        this.svc.getById(id).pipe(
          map((patient) => A.loadSucceeded({ patient })),
          catchError((error) => of(A.loadFailed({ error }))),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createRequested),
      exhaustMap(({ req }) =>
        this.svc.create(req).pipe(
          withLatestFrom(this.store.select(selectPatientPageRequest)),
          concatMap(([patient, pageReq]) => [
            A.createSucceeded({ patient }),
            A.searchRequested({ req: pageReq }),
          ]),
          catchError((error) => of(A.saveFailed({ error }))),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateRequested),
      exhaustMap(({ id, req }) =>
        this.svc.update(id, req).pipe(
          map((patient) => A.updateSucceeded({ patient })),
          catchError((error) => of(A.saveFailed({ error }))),
        ),
      ),
    ),
  );

  toggle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.toggleRequested),
      mergeMap(({ id, deleted }) =>
        this.svc.toggleActive(id, deleted).pipe(
          map(() => A.toggleSucceeded({ id, deleted })),
          catchError((error) => of(A.toggleFailed({ error }))),
        ),
      ),
    ),
  );

  checkDni$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.checkDniRequested),
      debounceTime(400),
      distinctUntilChanged((a, b) => a.dni === b.dni),
      filter(({ dni }) => /^\d{7,}$/.test(dni)),
      switchMap(({ dni }) =>
        this.svc.existsByDni(dni).pipe(
          map((exists) => A.checkDniSucceeded({ dni, exists })),
          catchError((error) => of(A.checkDniFailed({ error }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/app/features/pacientes/store/patient.effects.spec.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/store/patient.effects.ts src/app/features/pacientes/store/patient.effects.spec.ts
git commit -m "feat(pacientes): add patient effects with tests"
```

---

### Task C6: Register store globally in app.config.ts

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Edit app.config.ts**

Add imports near the other feature store imports:

```ts
import { PATIENT_FEATURE_KEY } from '@features/pacientes/store/patient.state';
import { patientReducer } from '@features/pacientes/store/patient.reducer';
import { PatientEffects } from '@features/pacientes/store/patient.effects';
```

Add inside the `providers` array, alongside the other `provideState`/`provideEffects` pairs (after `FinancieroEffects`):

```ts
    provideState(PATIENT_FEATURE_KEY, patientReducer),
    provideEffects(PatientEffects),
```

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(pacientes): register patient state and effects globally"
```

---

## Phase D — Form sections + form modal

### Task D1: ContactSection component

**Files:**
- Create: `src/app/features/pacientes/components/contact-section/contact-section.component.ts`

- [ ] **Step 1: Implement the component**

```ts
// src/app/features/pacientes/components/contact-section/contact-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [
    CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule,
    SelectModule, ToggleSwitchModule, RadioButtonModule,
  ],
  template: `
    <div class="space-y-3">
      <div *ngFor="let group of array().controls; let i = index" [formGroup]="$any(group)"
           class="grid grid-cols-12 gap-2 items-end border border-surface-200 rounded p-2">
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
          <p-radioButton name="contact-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="onPrimaryChange(i)" [ngModelOptions]="{ standalone: true }" />
        </div>
        <div class="col-span-1 text-center">
          <label class="block text-xs text-surface-500 mb-1">Activo</label>
          <p-toggleSwitch formControlName="active" />
        </div>
        <div class="col-span-1 text-right">
          <button pButton type="button" icon="pi pi-trash" severity="danger" text (click)="remove(i)" aria-label="Eliminar contacto"></button>
        </div>
      </div>
      <button pButton type="button" icon="pi pi-plus" label="Agregar contacto" severity="secondary" outlined (click)="add()"></button>
    </div>
  `,
})
export class ContactSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  readonly typeOptions = TYPE_OPTIONS;

  primaryIndex(): number {
    return this.array().controls.findIndex((c) => c.value.isPrimary === true);
  }

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
    if (wasPrimary && this.array().length > 0) {
      this.array().at(0).patchValue({ isPrimary: true });
    }
  }

  onPrimaryChange(index: number): void {
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/components/contact-section/
git commit -m "feat(pacientes): add ContactSection component"
```

---

### Task D2: AddressSection component

**Files:**
- Create: `src/app/features/pacientes/components/address-section/address-section.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/address-section/address-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      <div *ngFor="let group of array().controls; let i = index" [formGroup]="$any(group)"
           class="grid grid-cols-12 gap-2 border border-surface-200 rounded p-2">
        <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Calle</label><input pInputText formControlName="street" class="w-full"></div>
        <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Número</label><input pInputText formControlName="streetNumber" class="w-full"></div>
        <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Depto</label><input pInputText formControlName="apartment" class="w-full"></div>
        <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">CP</label><input pInputText formControlName="zipCode" class="w-full"></div>
        <div class="col-span-2"><label class="block text-xs text-surface-500 mb-1">Barrio</label><input pInputText formControlName="neighborhood" class="w-full"></div>
        <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Ciudad</label><input pInputText formControlName="city" class="w-full"></div>
        <div class="col-span-4"><label class="block text-xs text-surface-500 mb-1">Provincia</label><input pInputText formControlName="province" class="w-full"></div>
        <div class="col-span-2 text-center">
          <label class="block text-xs text-surface-500 mb-1">Primario</label>
          <p-radioButton name="address-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="onPrimaryChange(i)" [ngModelOptions]="{ standalone: true }" />
        </div>
        <div class="col-span-1 text-center">
          <label class="block text-xs text-surface-500 mb-1">Activo</label>
          <p-toggleSwitch formControlName="active" />
        </div>
        <div class="col-span-1 text-right">
          <button pButton type="button" icon="pi pi-trash" severity="danger" text (click)="remove(i)" aria-label="Eliminar dirección"></button>
        </div>
      </div>
      <button pButton type="button" icon="pi pi-plus" label="Agregar dirección" severity="secondary" outlined (click)="add()"></button>
    </div>
  `,
})
export class AddressSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);

  primaryIndex(): number {
    return this.array().controls.findIndex((c) => c.value.isPrimary === true);
  }

  add(): void {
    const isPrimary = this.array().length === 0;
    this.array().push(this.fb.group({
      id: [null],
      city: [''], province: [''], street: [''], streetNumber: [''],
      apartment: [''], neighborhood: [''], zipCode: [''],
      isPrimary: [isPrimary], active: [true],
    }));
  }

  remove(index: number): void {
    const wasPrimary = this.array().at(index).value.isPrimary;
    this.array().removeAt(index);
    if (wasPrimary && this.array().length > 0) {
      this.array().at(0).patchValue({ isPrimary: true });
    }
  }

  onPrimaryChange(index: number): void {
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

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

```bash
git add src/app/features/pacientes/components/address-section/
git commit -m "feat(pacientes): add AddressSection component"
```

---

### Task D3: CoverageSection component

**Files:**
- Create: `src/app/features/pacientes/components/coverage-section/coverage-section.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/coverage-section/coverage-section.component.ts
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, ToggleSwitchModule, RadioButtonModule],
  template: `
    <div class="space-y-3">
      <div *ngFor="let group of array().controls; let i = index" [formGroup]="$any(group)"
           class="grid grid-cols-12 gap-2 items-end border border-surface-200 rounded p-2">
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
          <p-radioButton name="coverage-primary" [value]="i" [ngModel]="primaryIndex()" (ngModelChange)="onPrimaryChange(i)" [ngModelOptions]="{ standalone: true }" />
        </div>
        <div class="col-span-1 text-center">
          <label class="block text-xs text-surface-500 mb-1">Activo</label>
          <p-toggleSwitch formControlName="active" />
        </div>
        <div class="col-span-1 text-right">
          <button pButton type="button" icon="pi pi-trash" severity="danger" text (click)="remove(i)" aria-label="Eliminar cobertura"></button>
        </div>
      </div>
      <button pButton type="button" icon="pi pi-plus" label="Agregar cobertura" severity="secondary" outlined (click)="add()"></button>
    </div>
  `,
})
export class CoverageSectionComponent {
  readonly array = input.required<FormArray<FormGroup>>();
  private readonly fb = inject(FormBuilder);
  readonly planOptions = COVERAGE_PLAN_CATALOG;

  primaryIndex(): number {
    return this.array().controls.findIndex((c) => c.value.isPrimary === true);
  }

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
    if (wasPrimary && this.array().length > 0) {
      this.array().at(0).patchValue({ isPrimary: true });
    }
  }

  onPrimaryChange(index: number): void {
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

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

```bash
git add src/app/features/pacientes/components/coverage-section/
git commit -m "feat(pacientes): add CoverageSection component"
```

---

### Task D4: PatientFormModal component

**Files:**
- Create: `src/app/features/pacientes/components/patient-form-modal/patient-form-modal.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/patient-form-modal/patient-form-modal.component.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';

import {
  CreatePatientRequest, Gender, Patient, SexAtBirth, UpdatePatientRequest,
} from '../../models/patient.model';
import * as A from '../../store/patient.actions';
import {
  selectPatientFeature, selectPatientSaveError, selectPatientSaving,
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
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

@Component({
  selector: 'pat-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule,
    SelectModule, AccordionModule, TagModule, DatePickerModule,
    ContactSectionComponent, AddressSectionComponent, CoverageSectionComponent,
  ],
  template: `
    <p-dialog [visible]="open()" (visibleChange)="onVisibleChange($event)" [modal]="true" [style]="{ width: '760px' }"
      [header]="isEdit() ? 'Editar paciente' : 'Nuevo paciente'" [closable]="!(saving())">
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <div *ngIf="saveError()" class="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {{ saveErrorMessage() }}
        </div>
        <p-accordion [multiple]="true" [value]="['general','contacts']">
          <p-accordion-panel value="general">
            <p-accordion-header>Datos generales — <p-tag [value]="statusEstimate()" severity="info" /></p-accordion-header>
            <p-accordion-content>
              <div class="grid grid-cols-2 gap-3" formGroupName="general">
                <div>
                  <label class="block text-xs text-surface-500 mb-1">Apellido*</label>
                  <input pInputText formControlName="lastName" class="w-full">
                </div>
                <div>
                  <label class="block text-xs text-surface-500 mb-1">Nombre*</label>
                  <input pInputText formControlName="firstName" class="w-full">
                </div>
                <div>
                  <label class="block text-xs text-surface-500 mb-1">DNI*</label>
                  <input pInputText formControlName="dni" class="w-full">
                  <p *ngIf="dniDuplicate()" class="text-red-600 text-xs mt-1" role="alert">
                    Ya existe un paciente con ese DNI
                  </p>
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
              <pat-contact-section [array]="contacts" />
            </p-accordion-content>
          </p-accordion-panel>

          <p-accordion-panel value="addresses">
            <p-accordion-header>Direcciones</p-accordion-header>
            <p-accordion-content>
              <pat-address-section [array]="addresses" />
            </p-accordion-content>
          </p-accordion-panel>

          <p-accordion-panel value="coverages">
            <p-accordion-header>Coberturas</p-accordion-header>
            <p-accordion-content>
              <pat-coverage-section [array]="coverages" />
            </p-accordion-content>
          </p-accordion-panel>
        </p-accordion>

        <div class="flex justify-end gap-2 mt-4">
          <button pButton type="button" label="Cancelar" severity="secondary" outlined (click)="onCancel()"></button>
          <button pButton type="submit" [label]="isEdit() ? 'Guardar cambios' : 'Registrar paciente'"
                  [disabled]="form.invalid || saving() || dniDuplicate()"></button>
        </div>
      </form>
    </p-dialog>
  `,
})
export class PatientFormModalComponent {
  readonly open = input.required<boolean>();
  readonly patient = input<Patient | null>(null);
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  readonly genderOpts = GENDER_OPTS;
  readonly sexOpts = SEX_OPTS;
  readonly saving = this.store.selectSignal(selectPatientSaving);
  readonly saveError = this.store.selectSignal(selectPatientSaveError);

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

  get contacts(): FormArray<FormGroup> { return this.form.get('contacts') as FormArray<FormGroup>; }
  get addresses(): FormArray<FormGroup> { return this.form.get('addresses') as FormArray<FormGroup>; }
  get coverages(): FormArray<FormGroup> { return this.form.get('coverages') as FormArray<FormGroup>; }

  readonly isEdit = computed(() => this.patient() != null);

  private readonly featureState = this.store.selectSignal(selectPatientFeature);
  private readonly dniSignal = signal<string>('');
  readonly dniDuplicate = computed(() => {
    if (this.isEdit()) return false;
    const check = this.featureState().dniCheck;
    if (!check) return false;
    return check.dni === this.dniSignal() && check.exists === true;
  });

  readonly statusEstimate = computed<'MIN' | 'COMPLETE'>(() => {
    const g = this.form.getRawValue();
    const hasContact = (this.contacts.value as { contactType: string; active: boolean }[]).some((c) => c.active);
    const hasCoverage = (this.coverages.value as { active: boolean }[]).some((c) => c.active);
    const ok = !!g.general.firstName && !!g.general.lastName && !!g.general.dni
      && !!g.general.birthDate && !!g.general.gender && !!g.general.sexAtBirth
      && hasContact && hasCoverage;
    return ok ? 'COMPLETE' : 'MIN';
  });

  constructor() {
    effect(() => {
      const p = this.patient();
      if (p) {
        this.hydrate(p);
        this.form.get('general.dni')?.disable({ emitEvent: false });
      } else if (this.open()) {
        this.resetForCreate();
        this.form.get('general.dni')?.enable({ emitEvent: false });
      }
    });

    this.form.get('general.dni')?.valueChanges.subscribe((dni: string) => {
      const clean = (dni ?? '').toString().replace(/\D/g, '');
      this.dniSignal.set(clean);
      if (!this.isEdit() && /^\d{7,}$/.test(clean)) {
        this.store.dispatch(A.checkDniRequested({ dni: clean }));
      }
    });
  }

  private resetForCreate(): void {
    this.form.reset({ general: { firstName: '', lastName: '', dni: '', birthDate: null, gender: null, sexAtBirth: null } });
    this.contacts.clear();
    this.addresses.clear();
    this.coverages.clear();
    this.store.dispatch(A.formReset());
  }

  private hydrate(p: Patient): void {
    this.form.patchValue({
      general: {
        firstName: p.firstName, lastName: p.lastName, dni: p.dni,
        birthDate: p.birthDate ? new Date(p.birthDate) : null,
        gender: p.gender, sexAtBirth: p.sexAtBirth,
      },
    });
    this.contacts.clear();
    p.contacts.forEach((c) => this.contacts.push(ContactSectionComponent.toFormGroup(this.fb, c)));
    this.addresses.clear();
    p.addresses.forEach((a) => this.addresses.push(AddressSectionComponent.toFormGroup(this.fb, a)));
    this.coverages.clear();
    p.coverages.forEach((c) => this.coverages.push(CoverageSectionComponent.toFormGroup(this.fb, c)));
  }

  saveErrorMessage(): string {
    const err = this.saveError();
    if (!err) return '';
    if (err.status === 409) return 'Ya existe un paciente con ese DNI.';
    return err.error?.message ?? 'No se pudo guardar el paciente.';
  }

  onSubmit(): void {
    if (this.form.invalid || this.dniDuplicate()) return;
    const raw = this.form.getRawValue();
    const general = raw.general as { firstName: string; lastName: string; dni: string; birthDate: Date | string | null; gender: Gender | null; sexAtBirth: SexAtBirth | null };
    const common = {
      firstName: general.firstName, lastName: general.lastName,
      birthDate: isoFromDate(general.birthDate),
      gender: general.gender, sexAtBirth: general.sexAtBirth,
      contacts: raw.contacts, addresses: raw.addresses, coverages: raw.coverages,
    };
    const current = this.patient();
    if (current) {
      const req: UpdatePatientRequest = common;
      this.store.dispatch(A.updateRequested({ id: current.id, req }));
    } else {
      const req: CreatePatientRequest = { ...common, dni: general.dni };
      this.store.dispatch(A.createRequested({ req }));
    }
    // Close once saving finishes without error
    this.store.select(selectPatientSaving).pipe(take(1)).subscribe();
  }

  onCancel(): void { this.closed.emit(); }
  onVisibleChange(v: boolean): void { if (!v) this.closed.emit(); }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/components/patient-form-modal/
git commit -m "feat(pacientes): add PatientFormModal with accordion sections"
```

---

## Phase E — List page

### Task E1: PatientListPage

**Files:**
- Create: `src/app/features/pacientes/pages/patient-list/patient-list.page.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/pages/patient-list/patient-list.page.ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, debounceTime } from 'rxjs';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

import { Patient, PatientStatus } from '../../models/patient.model';
import { PatientStateFilter } from '../../models/patient-page.model';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import * as A from '../../store/patient.actions';
import {
  selectPatientItems, selectPatientLoading, selectPatientPageRequest,
  selectPatientTotalElements,
} from '../../store/patient.selectors';
import { PatientFormModalComponent } from '../../components/patient-form-modal/patient-form-modal.component';

@Component({
  selector: 'pat-patient-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    CommonModule, RouterLink, TableModule, ButtonModule, InputTextModule,
    TagModule, TooltipModule, ConfirmDialogModule, DniPipe, AgePipe,
    EmptyStateComponent, PatientFormModalComponent,
  ],
  template: `
    <div class="p-6">
      <header class="flex items-center justify-between mb-4">
        <div>
          <div class="text-xs text-surface-500">Core clínico</div>
          <h1 class="text-2xl font-semibold flex items-center gap-2"><i class="pi pi-address-book"></i> Pacientes</h1>
        </div>
        <div class="flex items-center gap-2">
          <button pButton severity="secondary" outlined label="Exportar" icon="pi pi-file-export" disabled pTooltip="Próximamente"></button>
          <button pButton label="Nuevo paciente" icon="pi pi-plus" (click)="openCreate()"></button>
        </div>
      </header>

      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span class="p-input-icon-left">
          <i class="pi pi-search"></i>
          <input pInputText placeholder="Buscar por nombre o DNI…" (input)="onSearch($any($event.target).value)" />
        </span>
        <ng-container *ngFor="let opt of stateOptions">
          <button pButton [label]="opt.label" size="small"
                  [severity]="pageRequest()?.state === opt.value ? 'primary' : 'secondary'"
                  [outlined]="pageRequest()?.state !== opt.value"
                  (click)="setState(opt.value)"></button>
        </ng-container>
        <button pButton label="Sólo completos" size="small" icon="pi pi-filter"
                [severity]="pageRequest()?.status === 'COMPLETE' ? 'primary' : 'secondary'"
                [outlined]="pageRequest()?.status !== 'COMPLETE'"
                (click)="toggleCompleteFilter()"></button>
      </div>

      <p-table
        [value]="items()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageRequest()?.size ?? 20"
        [totalRecords]="total()"
        [first]="(pageRequest()?.page ?? 0) * (pageRequest()?.size ?? 20)"
        [loading]="loading()"
        (onLazyLoad)="onPage($event)"
        dataKey="id">
        <ng-template pTemplate="header">
          <tr>
            <th>Paciente</th><th>DNI</th><th>Fecha nac.</th><th>Obra social</th>
            <th>Teléfono</th><th>Estado</th><th style="width:160px;text-align:right">Acciones</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-p>
          <tr>
            <td>
              <div class="font-medium">{{ p.lastName }}, {{ p.firstName }}</div>
              <div class="text-xs text-surface-500">
                {{ p.gender }} · {{ (p.birthDate | age) }} años
              </div>
            </td>
            <td>{{ p.dni | dni }}</td>
            <td>{{ p.birthDate | date:'dd/MM/yyyy' }}</td>
            <td>{{ primaryCoverageLabel(p) }}</td>
            <td>{{ primaryPhone(p) }}</td>
            <td>
              <p-tag [severity]="statusSeverity(p.status)" [value]="p.status" />
              <p-tag *ngIf="!p.active" severity="danger" value="Inactivo" class="ml-1" />
            </td>
            <td class="text-right">
              <a [routerLink]="['/pacientes', p.id]" pButton text icon="pi pi-eye" pTooltip="Ver detalle"></a>
              <button pButton text icon="pi pi-pencil" pTooltip="Editar" (click)="openEdit(p)"></button>
              <button pButton text icon="pi pi-times-circle" pTooltip="Activar/Desactivar" (click)="confirmToggle(p)"></button>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="emptymessage">
          <tr><td colspan="7">
            <ui-empty-state heading="Sin pacientes" icon="pi-users" ctaLabel="Nuevo paciente" (ctaClick)="openCreate()" />
          </td></tr>
        </ng-template>
      </p-table>

      <p-confirmDialog />
      <pat-form-modal [open]="modalOpen()" [patient]="editing()" (closed)="onModalClosed()" />
    </div>
  `,
})
export class PatientListPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);
  private readonly search$ = new Subject<string>();

  readonly items = this.store.selectSignal(selectPatientItems);
  readonly loading = this.store.selectSignal(selectPatientLoading);
  readonly total = this.store.selectSignal(selectPatientTotalElements);
  readonly pageRequest = this.store.selectSignal(selectPatientPageRequest);

  readonly modalOpen = signal(false);
  readonly editing = signal<Patient | null>(null);

  readonly stateOptions: { value: PatientStateFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
  ];

  ngOnInit(): void {
    this.search$.pipe(debounceTime(300)).subscribe((q) =>
      this.store.dispatch(A.pageRequestChanged({ patch: { q, page: 0 } })),
    );
    // Initial fetch with the current pageRequest
    this.store.dispatch(A.searchRequested({ req: this.pageRequest()! }));
  }

  onSearch(q: string): void { this.search$.next(q); }
  setState(state: PatientStateFilter): void {
    this.store.dispatch(A.pageRequestChanged({ patch: { state, page: 0 } }));
  }
  toggleCompleteFilter(): void {
    const cur = this.pageRequest()?.status;
    const next: PatientStatus | undefined = cur === 'COMPLETE' ? undefined : 'COMPLETE';
    this.store.dispatch(A.pageRequestChanged({ patch: { status: next, page: 0 } }));
  }
  onPage(e: { first: number; rows: number }): void {
    const page = Math.floor(e.first / e.rows);
    this.store.dispatch(A.pageRequestChanged({ patch: { page, size: e.rows } }));
  }

  openCreate(): void { this.editing.set(null); this.modalOpen.set(true); }
  openEdit(p: Patient): void { this.editing.set(p); this.modalOpen.set(true); }
  onModalClosed(): void { this.modalOpen.set(false); this.editing.set(null); }

  confirmToggle(p: Patient): void {
    const deleted = p.active;
    const verb = deleted ? 'desactivar' : 'reactivar';
    this.confirm.confirm({
      header: `¿${verb[0].toUpperCase()}${verb.slice(1)} paciente?`,
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(A.toggleRequested({ id: p.id, deleted })),
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

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

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
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';

import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';

import * as A from '../../store/patient.actions';
import { selectSelectedPatient, selectSelectedLoading } from '../../store/patient.selectors';
import { getCoveragePlanLabel } from '../../models/coverage-plans.catalog';
import { PatientFormModalComponent } from '../../components/patient-form-modal/patient-form-modal.component';

@Component({
  selector: 'pat-patient-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    CommonModule, RouterLink, ButtonModule, TabsModule, TagModule,
    ConfirmDialogModule, DniPipe, AgePipe, EmptyStateComponent, PatientFormModalComponent,
  ],
  template: `
    <div class="p-6" *ngIf="patient() as p; else loadingTpl">
      <a routerLink="/pacientes" pButton text icon="pi pi-arrow-left" label="Volver a Pacientes" class="mb-3"></a>
      <header class="flex items-center justify-between mb-3">
        <h1 class="text-2xl font-semibold">{{ p.lastName }}, {{ p.firstName }}
          <p-tag [value]="p.status" severity="info" class="ml-2" />
          <p-tag *ngIf="!p.active" value="Inactivo" severity="danger" class="ml-1" />
        </h1>
        <div class="flex gap-2">
          <button pButton severity="secondary" outlined icon="pi pi-pencil" label="Editar" (click)="modalOpen.set(true)"></button>
          <button pButton severity="danger" outlined [icon]="p.active ? 'pi pi-times-circle' : 'pi pi-refresh'"
                  [label]="p.active ? 'Desactivar' : 'Reactivar'" (click)="confirmToggle()"></button>
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
            <ul class="space-y-1">
              <li *ngFor="let c of p.contacts" class="flex gap-2 items-center">
                <p-tag [value]="c.contactType" />
                <span>{{ c.contactValue }}</span>
                <p-tag *ngIf="c.isPrimary" severity="success" value="Primario" />
                <p-tag *ngIf="!c.active" severity="danger" value="Inactivo" />
              </li>
            </ul>
            <ui-empty-state *ngIf="p.contacts.length === 0" heading="Sin contactos" icon="pi-phone" />
          </p-tabpanel>
          <p-tabpanel value="addresses">
            <ul class="space-y-1">
              <li *ngFor="let a of p.addresses">
                {{ a.street }} {{ a.streetNumber }} {{ a.apartment ? '· ' + a.apartment : '' }} — {{ a.city }} / {{ a.province }}
                <p-tag *ngIf="a.isPrimary" severity="success" value="Primario" class="ml-1" />
                <p-tag *ngIf="!a.active" severity="danger" value="Inactivo" class="ml-1" />
              </li>
            </ul>
            <ui-empty-state *ngIf="p.addresses.length === 0" heading="Sin direcciones" icon="pi-map-marker" />
          </p-tabpanel>
          <p-tabpanel value="coverages">
            <ul class="space-y-1">
              <li *ngFor="let c of p.coverages">
                {{ planLabel(c.planId) }} — N° {{ c.memberNumber }}
                <p-tag *ngIf="c.isPrimary" severity="success" value="Primario" class="ml-1" />
                <p-tag *ngIf="!c.active" severity="danger" value="Inactivo" class="ml-1" />
              </li>
            </ul>
            <ui-empty-state *ngIf="p.coverages.length === 0" heading="Sin coberturas" icon="pi-id-card" />
          </p-tabpanel>
          <p-tabpanel value="history">
            <ui-empty-state heading="Historial no disponible"
              icon="pi-history"
              hint="Se habilitará cuando se activen los módulos de turnos y estudios." />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>

      <p-confirmDialog />
      <pat-form-modal [open]="modalOpen()" [patient]="p" (closed)="modalOpen.set(false)" />
    </div>

    <ng-template #loadingTpl>
      <div class="p-6">{{ loading() ? 'Cargando…' : 'Paciente no encontrado.' }}</div>
    </ng-template>
  `,
})
export class PatientDetailPage implements OnInit, OnDestroy {
  readonly id = input.required<string>(); // from routed param via withComponentInputBinding
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);

  readonly patient = this.store.selectSignal(selectSelectedPatient);
  readonly loading = this.store.selectSignal(selectSelectedLoading);
  readonly modalOpen = signal(false);

  ngOnInit(): void {
    const numericId = Number(this.id());
    if (Number.isNaN(numericId)) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.store.dispatch(A.loadRequested({ id: numericId }));
  }

  ngOnDestroy(): void { this.store.dispatch(A.cleared()); }

  planLabel(planId: number): string { return getCoveragePlanLabel(planId); }

  confirmToggle(): void {
    const p = this.patient(); if (!p) return;
    const deleted = p.active;
    this.confirm.confirm({
      header: deleted ? 'Desactivar paciente?' : 'Reactivar paciente?',
      message: `${p.lastName}, ${p.firstName}`,
      accept: () => this.store.dispatch(A.toggleRequested({ id: p.id, deleted })),
    });
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/pages/patient-detail/
git commit -m "feat(pacientes): add PatientDetailPage with tabs"
```

---

## Phase G — Autocomplete component

### Task G1: PatientSearchAutocomplete

**Files:**
- Create: `src/app/features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/features/pacientes/components/patient-search-autocomplete/patient-search-autocomplete.component.ts
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';

import { Patient } from '../../models/patient.model';
import { PatientService } from '../../services/patient.service';
import { DniPipe } from '@shared/pipes/dni.pipe';
import { AgePipe } from '@shared/pipes/age.pipe';

@Component({
  selector: 'pat-search-autocomplete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AutoCompleteModule, DniPipe, AgePipe],
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

  onSelect(e: { value: Patient }): void { this.selected.emit(e.value); }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/pacientes/components/patient-search-autocomplete/
git commit -m "feat(pacientes): add PatientSearchAutocomplete (reusable)"
```

---

## Phase H — Routing and shell wiring

### Task H1: pacientes.routes.ts

**Files:**
- Create: `src/app/features/pacientes/pacientes.routes.ts`

- [ ] **Step 1: Write the routes**

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

### Task H2: Register /pacientes in app.routes.ts

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Edit app.routes.ts**

Inside the `children` array of the shell route (the empty-path route with `canActivate: [authGuard]`), insert this entry. Place it right after the `analitica` route to keep CORE features grouped:

```ts
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./features/pacientes/pacientes.routes').then((m) => m.PACIENTES_ROUTES),
      },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(pacientes): register /pacientes route"
```

---

### Task H3: Update sidebar nav

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts`

- [ ] **Step 1: Edit the file**

Find this line:

```ts
{ kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/analitica/pacientes' },
```

Replace its `path` value:

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

### Task I1: Remove old paciente page

**Files:**
- Delete: `src/app/features/analitica/pages/pacientes/`

- [ ] **Step 1: Delete the folder**

Run (PowerShell):

```powershell
Remove-Item -Recurse -Force src/app/features/analitica/pages/pacientes
```

- [ ] **Step 2: Update analitica.routes.ts**

In `src/app/features/analitica/analitica.routes.ts`:

1. Remove the line containing `{ path: 'pacientes', ...PacientesComponent }`.
2. Change the redirect default to `atencion`:

```ts
{ path: '', redirectTo: 'atencion', pathMatch: 'full' },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/
git commit -m "chore(analitica): remove old paciente page (moved to features/pacientes)"
```

---

### Task I2: Remove Paciente from analitica model + store + service

**Files:**
- Modify: `src/app/features/analitica/models/analitica.model.ts`
- Modify: `src/app/features/analitica/store/analitica.state.ts`
- Modify: `src/app/features/analitica/store/analitica.actions.ts`
- Modify: `src/app/features/analitica/store/analitica.reducer.ts`
- Modify: `src/app/features/analitica/store/analitica.selectors.ts`
- Modify: `src/app/features/analitica/store/analitica.effects.ts`
- Modify: `src/app/features/analitica/services/analitica.service.ts`

- [ ] **Step 1: Remove `Paciente` from `analitica.model.ts`**

Delete the `Paciente` interface (lines 1-9). Keep `Protocolo` and `Nbu`.

- [ ] **Step 2: Remove pacientes from state**

In `analitica.state.ts`, drop `pacientes` from the interface and `initialAnaliticaState`:

```ts
export interface AnaliticaState {
  protocolos: Protocolo[];
  nbus: Nbu[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialAnaliticaState: AnaliticaState = {
  protocolos: [],
  nbus: [],
  pending: false,
  error: null,
};
```

(Update the import line to drop `Paciente`.)

- [ ] **Step 3: Remove paciente actions**

In `analitica.actions.ts`, delete `loadPacientes`, `loadPacientesSuccess`, `loadPacientesFailure` and remove `Paciente` from the import.

- [ ] **Step 4: Remove paciente reducer branches**

In `analitica.reducer.ts`, remove the three `on(loadPacientes…)` blocks and drop the imports.

- [ ] **Step 5: Remove paciente selector**

In `analitica.selectors.ts`, delete `selectAllPacientes`. Add a new selector replacement for `selectAnaliticaPending` if it doesn't exist — but it does (it returns `state.pending`), so just drop pacientes-specific ones.

- [ ] **Step 6: Remove paciente effect**

In `analitica.effects.ts`, delete the `loadPacientes$` effect and its imports.

- [ ] **Step 7: Remove `getPacientes()` from service**

In `analitica.service.ts`, delete the `getPacientes()` method and the `Paciente` import.

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

> If anything else in the codebase still imports `Paciente` from `@features/analitica/...` or references `selectAllPacientes`/`loadPacientes`, those will surface as type errors. Fix each import to use the new `Patient` from `@features/pacientes/models/patient.model` (and the new store) as appropriate, then re-run the typecheck until clean.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/analitica/
git commit -m "chore(analitica): remove Paciente type, actions, effects, selectors, service method"
```

---

## Phase I.5 — Permisos, notificaciones y smoke tests

### Task I3: canMutatePatients service + hide mutation buttons

**Files:**
- Create: `src/app/features/pacientes/services/patient-permissions.service.ts`
- Modify: `src/app/features/pacientes/pages/patient-list/patient-list.page.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Implement the permissions service**

```ts
// src/app/features/pacientes/services/patient-permissions.service.ts
import { inject, Injectable, computed } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

// The backend authorises mutations only for ADMINISTRADOR / SECRETARIA.
// The frontend Role enum uses lowercase ids: 'admin', 'administrativo', 'recepcionista'.
// We accept any of these (covering both naming conventions while the auth contract stabilises).
const MUTATING_ROLES = new Set([
  'admin', 'administrativo', 'recepcionista',
  'ADMINISTRADOR', 'SECRETARIA',
]);

@Injectable({ providedIn: 'root' })
export class PatientPermissionsService {
  private readonly tokens = inject(TokenService);

  /** True if the current user can create/edit/toggle patients. */
  readonly canMutate = computed(() =>
    this.tokens.getRoles().some((r) => MUTATING_ROLES.has(r)),
  );
}
```

- [ ] **Step 2: Use it in the list page**

In `PatientListPage`, inject the service and gate the buttons. Add:

```ts
import { PatientPermissionsService } from '../../services/patient-permissions.service';
// inside the class:
private readonly perms = inject(PatientPermissionsService);
readonly canMutate = this.perms.canMutate;
```

Wrap the "Nuevo paciente" button:

```html
<button *ngIf="canMutate()" pButton label="Nuevo paciente" icon="pi pi-plus" (click)="openCreate()"></button>
```

Wrap the row action buttons (Editar + Toggle), keeping the "Ver detalle" link always visible:

```html
<a [routerLink]="['/pacientes', p.id]" pButton text icon="pi pi-eye" pTooltip="Ver detalle"></a>
<ng-container *ngIf="canMutate()">
  <button pButton text icon="pi pi-pencil" pTooltip="Editar" (click)="openEdit(p)"></button>
  <button pButton text icon="pi pi-times-circle" pTooltip="Activar/Desactivar" (click)="confirmToggle(p)"></button>
</ng-container>
```

Wrap the empty-state CTA:

```html
<ui-empty-state heading="Sin pacientes" icon="pi-users"
  [ctaLabel]="canMutate() ? 'Nuevo paciente' : null"
  (ctaClick)="openCreate()" />
```

(If `EmptyStateComponent` does not support `null` as ctaLabel — verify by reading the component — use `*ngIf` to conditionally render the CTA.)

- [ ] **Step 3: Use it in the detail page**

In `PatientDetailPage`, inject the service the same way and gate the header actions:

```html
<div class="flex gap-2" *ngIf="canMutate()">
  <button pButton severity="secondary" outlined icon="pi pi-pencil" label="Editar" (click)="modalOpen.set(true)"></button>
  <button pButton severity="danger" outlined ... (click)="confirmToggle()"></button>
</div>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/
git commit -m "feat(pacientes): gate mutation actions by user role"
```

---

### Task I4: Wire NotificationService toasts for non-form errors

**Files:**
- Modify: `src/app/features/pacientes/store/patient.effects.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

- [ ] **Step 1: Show toast on toggle failure**

In `patient.effects.ts`:

Add the import at the top:

```ts
import { NotificationService } from '@core/services/notification.service';
import { tap } from 'rxjs';
```

Inject inside the class:

```ts
private readonly notifications = inject(NotificationService);
```

Update `toggle$` to surface the failure as a toast (after the `catchError` it already has):

```ts
  toggle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.toggleRequested),
      mergeMap(({ id, deleted }) =>
        this.svc.toggleActive(id, deleted).pipe(
          map(() => A.toggleSucceeded({ id, deleted })),
          catchError((error) => {
            this.notifications.error('No se pudo actualizar el paciente');
            return of(A.toggleFailed({ error }));
          }),
        ),
      ),
    ),
  );
```

Apply the same pattern in `search$` and `loadDetail$` `catchError` blocks: prefix `this.notifications.error('No se pudieron cargar los pacientes')` for `searchFailed`, and `this.notifications.error('No se pudo cargar el paciente')` for `loadFailed`. Keep `saveFailed` silent here — the modal already renders a banner for it.

- [ ] **Step 2: Redirect on 404 at detail**

In `PatientDetailPage`, subscribe to `loadFailed` once via the actions stream OR detect via the selector. The simplest reliable approach: listen to actions through `inject(Actions)` and `ofType(A.loadFailed)`.

Add imports:

```ts
import { Actions, ofType } from '@ngrx/effects';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
```

Inside the class:

```ts
private readonly actions$ = inject(Actions);

constructor() {
  this.actions$
    .pipe(ofType(A.loadFailed), takeUntilDestroyed())
    .subscribe(() => this.router.navigate(['/pacientes']));
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: exits 0.

- [ ] **Step 4: Update effects spec for toast**

In `patient.effects.spec.ts`, register the `NotificationService` mock in the providers and stub `error()`:

```ts
const notify = { error: vi.fn(), success: vi.fn(), info: vi.fn(), warn: vi.fn() };
// ...inside providers:
{ provide: NotificationService, useValue: notify },
```

Add an import: `import { NotificationService } from '@core/services/notification.service';`

Re-run: `npx vitest run src/app/features/pacientes/store/patient.effects.spec.ts`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/
git commit -m "feat(pacientes): surface load/toggle errors via NotificationService, 404 redirects"
```

---

### Task I5: Component smoke tests for list page and form modal

**Files:**
- Create: `src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts`
- Create: `src/app/features/pacientes/components/patient-form-modal/patient-form-modal.component.spec.ts`

- [ ] **Step 1: Write list page smoke test**

```ts
// src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { PatientListPage } from './patient-list.page';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import * as A from '../../store/patient.actions';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

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

  it('dispatches searchRequested on init', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(A.searchRequested({ req: initialPatientState.pageRequest }));
  });

  it('setState dispatches pageRequestChanged with state and page=0', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.setState('inactive');
    expect(spy).toHaveBeenCalledWith(A.pageRequestChanged({ patch: { state: 'inactive', page: 0 } }));
  });

  it('onPage maps first/rows to page/size', () => {
    const fixture = TestBed.createComponent(PatientListPage);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onPage({ first: 40, rows: 20 });
    expect(spy).toHaveBeenCalledWith(A.pageRequestChanged({ patch: { page: 2, size: 20 } }));
  });
});
```

- [ ] **Step 2: Write form modal smoke test**

```ts
// src/app/features/pacientes/components/patient-form-modal/patient-form-modal.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PatientFormModalComponent } from './patient-form-modal.component';
import { PATIENT_FEATURE_KEY, initialPatientState } from '../../store/patient.state';
import * as A from '../../store/patient.actions';

describe('PatientFormModalComponent (smoke)', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PatientFormModalComponent],
      providers: [
        provideMockStore({ initialState: { [PATIENT_FEATURE_KEY]: initialPatientState } }),
        provideNoopAnimations(),
      ],
    });
    store = TestBed.inject(MockStore);
  });

  it('renders without errors when open=false', () => {
    const fixture = TestBed.createComponent(PatientFormModalComponent);
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('patient', null);
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('dispatches checkDniRequested when a valid dni is typed (create mode)', () => {
    const fixture = TestBed.createComponent(PatientFormModalComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('patient', null);
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.form.get('general.dni')?.setValue('32456789');
    expect(spy).toHaveBeenCalledWith(A.checkDniRequested({ dni: '32456789' }));
  });

  it('hydrates form from patient input when in edit mode', () => {
    const fixture = TestBed.createComponent(PatientFormModalComponent);
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

- [ ] **Step 3: Run**

Run: `npx vitest run src/app/features/pacientes/pages/patient-list src/app/features/pacientes/components/patient-form-modal`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/pages/patient-list/patient-list.page.spec.ts src/app/features/pacientes/components/patient-form-modal/patient-form-modal.component.spec.ts
git commit -m "test(pacientes): add list page and form modal smoke tests"
```

---

## Phase J — Final QA

### Task J1: Full unit-test run

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all suites green. Total includes new pipe, model, service, reducer, selectors, effects specs.

- [ ] **Step 2: If any failure**

Diagnose and fix in place. Do not commit a green-by-skip workaround.

---

### Task J2: Production build

- [ ] **Step 1: Run the build**

Run: `npm run build`
Expected: exits 0, no compiler errors, no missing template references.

- [ ] **Step 2: If failure**

Most common issues:
- PrimeNG imports — confirm component module names against `node_modules/primeng/<component>/index.d.ts`
- Tailwind class typos
- Strict template binding errors — fix types in templates

Fix and re-run until green.

---

### Task J3: Smoke test in dev server (manual)

- [ ] **Step 1: Start the dev server**

Run: `npm start`
Wait for "compiled successfully" on `http://localhost:4200`.

- [ ] **Step 2: Verify the following flows**

Open the browser and check:

1. Login (dev bypass) → land in `/home`
2. Sidebar shows **Pacientes** under "Core clínico" pointing to `/pacientes`
3. `/pacientes` renders the list page (empty state if backend has no data)
4. "Nuevo paciente" opens the modal; accordion shows 4 sections
5. Type a fake DNI (8 digits) → after blur/debounce, no JS error in console; if backend reports duplicate the inline message appears
6. Cancel closes the modal
7. Edit on an existing row opens the modal in edit mode with DNI disabled
8. Click on a row's "Ver detalle" → navigates to `/pacientes/:id` with tabs
9. Back link returns to `/pacientes`
10. Sidebar **Pacientes** is highlighted active when on the route

If any flow fails, fix and re-test. The result of this manual smoke test is the gate for marking the feature done.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(pacientes): smoke-test corrections"
```

(Skip this commit if no fixes were needed.)

---

### Task J4: Backend seeding coordination note

- [ ] **Step 1: Add a note for backend pre-launch**

Append a section to the spec file (`docs/superpowers/specs/2026-05-12-pacientes-feature-design.md`) or open an issue in the backend repo describing:

> The frontend `COVERAGE_PLAN_CATALOG` exposes planIds 1..7 to users. Before this feature is enabled in any environment with real users, the backend MUST seed rows in the `coverage_plans` table (or equivalent) with these exact ids. Without the seed, alta with cobertura will fail validation in the backend.

- [ ] **Step 2: Commit**

```bash
git add docs/
git commit -m "docs(pacientes): note backend coverage-plan seeding requirement"
```

---

## Definition of Done

- [ ] All tasks above completed and committed
- [ ] `npx vitest run` green
- [ ] `npm run build` green
- [ ] Manual smoke test (Task J3) passes all 10 flows
- [ ] Backend coverage-plans seeding documented (Task J4)
- [ ] No remaining references to the old `Paciente` type / `loadPacientes` action / `getPacientes()` method outside this plan
