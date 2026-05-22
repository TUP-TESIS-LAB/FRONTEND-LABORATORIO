# Atención Wizard CORE (deep) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic atención wizard mergeado en `development` por una versión que replique en profundidad el flujo del proyecto viejo, pero acotada a los módulos CORE (sin Financiero ni Médicos). Cubre 3 pasos (Datos generales, Análisis, Resumen), búsqueda de paciente por DNI con redirect a alta + retorno, input dual de análisis (shortCode + autocomplete por nombre), modal de detalle de análisis (familia, NBU, determinaciones), precio base pre-cableado para cuando exista NBU en backend, persistencia con sessionStorage y modal final de ticket.

**Architecture:** Angular 21 standalone + signals + OnPush, NgRx clásico solo para el slice ya existente de `atencion`. UI compuesta por 3 step components bajo `pages/atencion/atencion-wizard/steps/` y 4 componentes reusables bajo `features/analitica/components/` (no en `pages/` porque pueden ser consumidos desde otros features en el futuro). PrimeNG `Stepper` + `AutoComplete` + `Dialog` + `Table`. Persistencia: helper standalone con sessionStorage. Cobertura para módulos activables: `ModuleRegistry.isActive()` + condicionales en templates — el wizard ya tiene el patrón.

**Tech Stack:** Angular 21 standalone + OnPush · NgRx Store + Effects · PrimeNG 21 · Tailwind 4 · Vitest 4 · TypeScript 5.9

**Spec:** [docs/superpowers/specs/2026-05-21-atencion-wizard-deep-core-design.md](../specs/2026-05-21-atencion-wizard-deep-core-design.md)

**Jira:** [KAN-36](https://exequielsantoro.atlassian.net/browse/KAN-36)

## Project skills that constrain every task

- **`ngrx-backend-request`** — HTTP atado al store: el slice `atencion` ya existe; cualquier endpoint nuevo (NBU, analysis lookup, patient by DNI) entra al store solo si va a ser **compartido** entre componentes. Para lookups one-shot dentro de un componente, fetch directo via service es aceptable (igual que `patient-search-autocomplete` ya existente).
- **`angular-conventions`** — standalone + OnPush, `input()`/`output()` signal-based APIs (NO `@Input`/`@Output` decorators), Reactive Forms expuestos como signals con `toSignal()`, `@if`/`@for` (nunca `*ngIf`/`*ngFor`). Aliases `@core`, `@shared`, `@layout`, `@features`.
- **`laboratory-ui`** — `<p-button>` (no `<button pButton>`), modales = `p-dialog`, colores via CSS tokens `--brand-*` / `--ds-*`, ningún hex hardcoded en branded surfaces. Etiquetas user-facing en español, código en inglés.
- **Project rule: nunca el enum `AttentionState` directo en UI** — usar `attentionStateLabel()` de `features/analitica/models/atencion-state-label.ts`.

## Convenciones de naming + paths usadas en este plan

- Branch: `feat/atencion-wizard-deep-core` (cortado desde `development` actualizado).
- Componentes reusables: prefijo `lab-` (matchea el resto del proyecto, ej. `lab-atencion-wizard`).
- Step components no exponen `selector` HTML (se montan via `@switch`); las clases sí se exportan.
- Servicios singleton: `providedIn: 'root'`.

---

## Phase A — Pre-work

### Task A1: Crear branch y verificar baseline

**Files:**
- Verify: `feat/atencion-module` is the current branch (PR #11 mergeado), `development` está al día.

- [ ] **Step 1: Asegurar que `development` está actualizada**

```bash
cd c:/Users/tobia/Desktop/TUP/TESIS/FRONTEND-LABORATORIO
git checkout development
git pull origin development
```

Expected: `Already up to date.` o un fast-forward.

- [ ] **Step 2: Crear branch nueva**

```bash
git checkout -b feat/atencion-wizard-deep-core
```

Expected: `Switched to a new branch 'feat/atencion-wizard-deep-core'`.

- [ ] **Step 3: Verificar baseline de tests pasa**

```bash
npx ng test --watch=false 2>&1 | tail -5
```

Expected: `Tests <N> passed (<N>)` con `Tests Files <M> passed`. Anotar el conteo como baseline.

- [ ] **Step 4: Commit baseline marker**

```bash
git commit --allow-empty -m "chore(atencion-wizard): baseline branch for deep-core wizard"
```

---

### Task A2: Auditar endpoints del backend

**Files:**
- Read-only: `src/app/features/pacientes/services/patient.service.ts`
- Read-only: `src/app/features/analitica/services/atencion-api.service.ts`
- Create: `docs/superpowers/plans/notes/2026-05-21-atencion-endpoint-audit.md`

- [ ] **Step 1: Listar endpoints requeridos vs existentes**

Revisar manualmente y registrar en el archivo de notas:

| Endpoint | Spec lo requiere para | Existe ya? | Notas |
|---|---|---|---|
| `GET /api/v1/analitica/patients/search?q={dni}&state=...` | Buscar paciente por DNI | sí (vía `PatientService.search`) | usar con `state='ACTIVE'`, `size=1`; filtrar el resultado con `dni === query` |
| `GET /api/v1/analitica/patients/exists?dni={dni}` | Saber si redirige al alta | sí | retorna `{ exists: boolean }` |
| `GET /api/v1/analitica/patients/{id}` | Render del paciente seleccionado | sí | |
| `GET /api/v1/analysis?shortCode={n}` | Lookup directo en paso 2 | **AUDITAR contra Backend** | si no existe, abrir ticket aparte en repo `Backend` |
| `GET /api/v1/analysis?nameLike={txt}&limit=10` | Autocomplete por nombre | **AUDITAR** | idem |
| `GET /api/v1/analysis/{id}` | Modal detalle | **AUDITAR** | el wizard antiguo lo usaba |
| `GET /api/v1/nbu/current` | Precio base | **NO existe** (confirmado por grep) | fallback graceful en frontend; ticket Backend separado |
| `PATCH /api/v1/attentions/{id}/assign/general-data` | Paso 1 commit | sí | |
| `PATCH /api/v1/attentions/{id}/add/analysis` | Paso 2 commit | sí | |
| `PATCH /api/v1/attentions/{id}/end-secretary-phase` | Paso 3 finish | sí | |

- [ ] **Step 2: Verificar endpoints de análisis con curl rápido**

```bash
# Iniciar backend (en otra terminal): cd c:/Users/tobia/Desktop/TUP/TESIS/Backend && ./start-backend.bat
# Login y obtener token desde Adminer o /api/v1/empresa/auth/login.
# Probar:
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/analysis?shortCode=1001"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/analysis?nameLike=hemo&limit=10"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/analysis/1"
```

Expected casos:
- Si responden con 200 y un payload de Analysis → marcar "OK" en la tabla.
- Si responden 404 → el endpoint no existe; documentarlo y crear ticket Backend (en este turno se sigue con `MockAnalysisService` que devuelve datos seed; la integración real cuando el backend exponga el endpoint).

- [ ] **Step 3: Commit el doc de auditoría**

```bash
git add docs/superpowers/plans/notes/2026-05-21-atencion-endpoint-audit.md
git commit -m "docs(atencion-wizard): endpoint audit for deep-core wizard"
```

---

### Task A3: Helper de persistencia con sessionStorage

**Files:**
- Create: `src/app/features/analitica/utils/atencion-session-store.ts`
- Create: `src/app/features/analitica/utils/atencion-session-store.spec.ts`

- [ ] **Step 1: Escribir el test**

```ts
// atencion-session-store.spec.ts
import {
  clearAtencionSession,
  readAtencionSession,
  writeAtencionSession,
  writePendingDni,
  readPendingDni,
  clearPendingDni,
} from './atencion-session-store';

describe('atencion-session-store', () => {
  beforeEach(() => sessionStorage.clear());

  it('writes and reads attention id', () => {
    writeAtencionSession({ atencionId: 42, uiStep: 'analisis' });
    expect(readAtencionSession()).toEqual({ atencionId: 42, uiStep: 'analisis' });
  });

  it('returns null when nothing stored', () => {
    expect(readAtencionSession()).toBeNull();
  });

  it('clearAtencionSession removes the entry', () => {
    writeAtencionSession({ atencionId: 1, uiStep: 'datos' });
    clearAtencionSession();
    expect(readAtencionSession()).toBeNull();
  });

  it('pending DNI is stored separately and survives clearAtencionSession', () => {
    writePendingDni('32456789');
    writeAtencionSession({ atencionId: 5, uiStep: 'datos' });
    clearAtencionSession();
    expect(readPendingDni()).toBe('32456789');
  });

  it('clearPendingDni removes only the DNI entry', () => {
    writeAtencionSession({ atencionId: 1, uiStep: 'datos' });
    writePendingDni('111');
    clearPendingDni();
    expect(readAtencionSession()).not.toBeNull();
    expect(readPendingDni()).toBeNull();
  });

  it('returns null on malformed JSON', () => {
    sessionStorage.setItem('atencion:current', '{not-valid}');
    expect(readAtencionSession()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx ng test --watch=false src/app/features/analitica/utils/atencion-session-store.spec.ts 2>&1 | tail -5
```

Expected: FAIL — `atencion-session-store.ts` no existe.

- [ ] **Step 3: Implementar el helper**

```ts
// atencion-session-store.ts
export type AtencionUiStep = 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';

export interface AtencionSession {
  atencionId: number;
  uiStep: AtencionUiStep;
}

const SESSION_KEY = 'atencion:current';
const PENDING_DNI_KEY = 'atencion:pendingDni';

export function writeAtencionSession(value: AtencionSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

export function readAtencionSession(): AtencionSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AtencionSession;
  } catch {
    return null;
  }
}

export function clearAtencionSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function writePendingDni(dni: string): void {
  sessionStorage.setItem(PENDING_DNI_KEY, dni);
}

export function readPendingDni(): string | null {
  return sessionStorage.getItem(PENDING_DNI_KEY);
}

export function clearPendingDni(): void {
  sessionStorage.removeItem(PENDING_DNI_KEY);
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx ng test --watch=false src/app/features/analitica/utils/atencion-session-store.spec.ts 2>&1 | tail -5
```

Expected: `Tests 6 passed (6)`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/utils/atencion-session-store.ts \
        src/app/features/analitica/utils/atencion-session-store.spec.ts
git commit -m "feat(atencion-wizard): add session-store helper for wizard persistence"
```

---

## Phase B — Reusable services and components

### Task B1: NbuService con fallback graceful

**Files:**
- Create: `src/app/features/analitica/services/nbu.service.ts`
- Create: `src/app/features/analitica/services/nbu.service.spec.ts`
- Create: `src/app/features/analitica/models/nbu.model.ts`

- [ ] **Step 1: Modelo NBU**

```ts
// nbu.model.ts
export interface NbuVersion {
  id: number;
  tenantId: number;
  effectiveDate: string; // ISO date
  ubValue: number;       // monetary value per UB
}
```

- [ ] **Step 2: Test**

```ts
// nbu.service.spec.ts
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { NbuService } from './nbu.service';

describe('NbuService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: NbuService;

  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        NbuService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(NbuService);
  });

  it('getCurrent returns the version on success', async () => {
    http.get.mockReturnValue(of({ id: 1, tenantId: 1, effectiveDate: '2026-05-01', ubValue: 350 }));
    const result = await firstValueFrom(service.getCurrent());
    expect(result?.ubValue).toBe(350);
  });

  it('getCurrent returns null on 404 (module not deployed yet)', async () => {
    http.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const result = await firstValueFrom(service.getCurrent());
    expect(result).toBeNull();
  });

  it('getCurrent returns null on any other http error (defensive)', async () => {
    http.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const result = await firstValueFrom(service.getCurrent());
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run test, expect failure**

```bash
npx ng test --watch=false src/app/features/analitica/services/nbu.service.spec.ts 2>&1 | tail -5
```

Expected: FAIL — service no existe.

- [ ] **Step 4: Implementar**

```ts
// nbu.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { NbuVersion } from '../models/nbu.model';

@Injectable({ providedIn: 'root' })
export class NbuService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/nbu';

  /**
   * Returns the current NBU version for the tenant. Returns null if the endpoint
   * doesn't exist yet (the NBU module isn't deployed in backend), so callers can
   * gracefully hide pricing UI without crashing.
   */
  getCurrent(): Observable<NbuVersion | null> {
    return this.http
      .get<NbuVersion>(`${this.baseUrl}/current`)
      .pipe(catchError(() => of(null)));
  }
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
npx ng test --watch=false src/app/features/analitica/services/nbu.service.spec.ts 2>&1 | tail -5
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/services/nbu.service.ts \
        src/app/features/analitica/services/nbu.service.spec.ts \
        src/app/features/analitica/models/nbu.model.ts
git commit -m "feat(atencion-wizard): NbuService with graceful 404 fallback"
```

---

### Task B2: Analysis service y modelos

**Files:**
- Create: `src/app/features/analitica/services/analysis.service.ts`
- Create: `src/app/features/analitica/services/analysis.service.spec.ts`
- Modify: `src/app/features/analitica/models/atencion.model.ts` (agregar `Analysis` y `AnalysisDetail`)

- [ ] **Step 1: Modelos**

Agregar al final de `src/app/features/analitica/models/atencion.model.ts`:

```ts
// Catalog model (CORE)
export interface Analysis {
  id: number;
  shortCode: number;
  name: string;
  familyName: string | null;
  ubCount: number | null; // unidades bioquímicas; null si no configurado
}

export interface AnalysisDetail extends Analysis {
  description: string | null;
  determinations: ReadonlyArray<{ id: number; name: string }>;
  processingTime: number | null;
  processingTimeUnit: string | null; // 'MINUTES' | 'HOURS' | 'DAYS' | ...
  nbuCode: string | null;
}
```

- [ ] **Step 2: Test**

```ts
// analysis.service.spec.ts
import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: AnalysisService;

  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AnalysisService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(AnalysisService);
  });

  it('findByShortCode calls /api/v1/analitica/analysis?shortCode=N', async () => {
    http.get.mockReturnValue(of({ id: 5, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3 }));
    const r = await firstValueFrom(service.findByShortCode(1001));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { shortCode: '1001' } });
    expect(r?.shortCode).toBe(1001);
  });

  it('searchByName calls /api/v1/analitica/analysis?nameLike=...&limit=10', async () => {
    http.get.mockReturnValue(of([
      { id: 5, shortCode: 1001, name: 'Hemograma', familyName: null, ubCount: 3 },
    ]));
    const r = await firstValueFrom(service.searchByName('hemo'));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { nameLike: 'hemo', limit: '10' } });
    expect(r).toHaveLength(1);
  });

  it('getById calls /api/v1/analitica/analysis/{id} and returns AnalysisDetail', async () => {
    http.get.mockReturnValue(of({
      id: 5, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3,
      description: 'Recuento celular', determinations: [], processingTime: 30, processingTimeUnit: 'MINUTES', nbuCode: 'NBU-123',
    }));
    const r = await firstValueFrom(service.getById(5));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis/5');
    expect(r.nbuCode).toBe('NBU-123');
  });
});
```

- [ ] **Step 3: Run test, expect failure**

```bash
npx ng test --watch=false src/app/features/analitica/services/analysis.service.spec.ts 2>&1 | tail -5
```

Expected: FAIL — service no existe.

- [ ] **Step 4: Implementar**

```ts
// analysis.service.ts
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Analysis, AnalysisDetail } from '../models/atencion.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis';

  findByShortCode(shortCode: number): Observable<Analysis | null> {
    return this.http.get<Analysis | null>(this.baseUrl, {
      params: { shortCode: String(shortCode) },
    });
  }

  searchByName(nameLike: string, limit = 10): Observable<Analysis[]> {
    return this.http.get<Analysis[]>(this.baseUrl, {
      params: { nameLike, limit: String(limit) },
    });
  }

  getById(id: number): Observable<AnalysisDetail> {
    return this.http.get<AnalysisDetail>(`${this.baseUrl}/${id}`);
  }
}
```

- [ ] **Step 5: Run test, expect pass**

```bash
npx ng test --watch=false src/app/features/analitica/services/analysis.service.spec.ts 2>&1 | tail -5
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/services/analysis.service.ts \
        src/app/features/analitica/services/analysis.service.spec.ts \
        src/app/features/analitica/models/atencion.model.ts
git commit -m "feat(atencion-wizard): AnalysisService (shortCode lookup, name search, detail)"
```

---

### Task B3: `<lab-patient-search>` component

**Files:**
- Create: `src/app/features/analitica/components/patient-search/patient-search.component.ts`
- Create: `src/app/features/analitica/components/patient-search/patient-search.component.spec.ts`

- [ ] **Step 1: Test**

```ts
// patient-search.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PatientSearchComponent } from './patient-search.component';
import { PatientService } from '@features/pacientes/services/patient.service';
import { Patient } from '@features/pacientes/models/patient.model';

const sample = (over: Partial<Patient> = {}): Patient => ({
  id: 1, dni: '32456789', firstName: 'Juan', lastName: 'Pérez',
  birthDate: '1985-05-12', gender: 'M', sexAtBirth: 'M',
  isVerified: true, isActive: true, hasGuardian: false,
  guardians: [], addresses: [], contacts: [], coverages: [],
  status: 'ACTIVE', ...over,
} as unknown as Patient);

describe('PatientSearchComponent', () => {
  let fixture: ComponentFixture<PatientSearchComponent>;
  let patientService: { search: ReturnType<typeof vi.fn>; existsByDni: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    patientService = { search: vi.fn(), existsByDni: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [PatientSearchComponent],
      providers: [{ provide: PatientService, useValue: patientService }],
    }).compileComponents();
    fixture = TestBed.createComponent(PatientSearchComponent);
    fixture.detectChanges();
  });

  it('searchByDni → emits patientSelected when found', () => {
    const p = sample();
    patientService.search.mockReturnValue(of({ items: [p], total: 1 }));
    const emitted: Patient[] = [];
    fixture.componentInstance.patientSelected.subscribe((v) => emitted.push(v));
    fixture.componentInstance.searchByDni('32456789');
    expect(emitted).toEqual([p]);
  });

  it('searchByDni → emits notFound when no match', () => {
    patientService.search.mockReturnValue(of({ items: [], total: 0 }));
    const emitted: string[] = [];
    fixture.componentInstance.notFound.subscribe((dni) => emitted.push(dni));
    fixture.componentInstance.searchByDni('99999999');
    expect(emitted).toEqual(['99999999']);
  });

  it('searchByDni → emits notFound when items returned but DNI does not match exactly', () => {
    patientService.search.mockReturnValue(of({ items: [sample({ dni: '00000000' })], total: 1 }));
    const emitted: string[] = [];
    fixture.componentInstance.notFound.subscribe((dni) => emitted.push(dni));
    fixture.componentInstance.searchByDni('99999999');
    expect(emitted).toEqual(['99999999']);
  });

  it('clear() resets the loaded patient signal', () => {
    fixture.componentInstance.setPatient(sample());
    expect(fixture.componentInstance.patient()).not.toBeNull();
    fixture.componentInstance.clear();
    expect(fixture.componentInstance.patient()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npx ng test --watch=false src/app/features/analitica/components/patient-search/patient-search.component.spec.ts 2>&1 | tail -5
```

Expected: FAIL.

- [ ] **Step 3: Implementar**

```ts
// patient-search.component.ts
import {
  ChangeDetectionStrategy, Component, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Patient } from '@features/pacientes/models/patient.model';
import { PatientService } from '@features/pacientes/services/patient.service';

@Component({
  selector: 'lab-patient-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule],
  template: `
    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">Buscar paciente por DNI</label>
      <div class="flex gap-2">
        <input pInputText
               type="text"
               inputmode="numeric"
               placeholder="32.456.789"
               [(ngModel)]="dniInput"
               (keyup.enter)="searchByDni(dniInput)"
               [disabled]="loading()" />
        <p-button label="Buscar"
                  (onClick)="searchByDni(dniInput)"
                  [loading]="loading()" />
      </div>

      @if (patient(); as p) {
        <div class="bg-[var(--ds-surface-2,#f8fafc)] rounded-md p-3">
          <div class="font-semibold">{{ p.lastName }}, {{ p.firstName }}</div>
          <div class="text-xs opacity-70">DNI {{ p.dni }} · Nac. {{ p.birthDate }} · {{ p.gender }}</div>
        </div>
      } @else if (error()) {
        <div class="text-sm text-[var(--color-danger,#ef4444)]">{{ error() }}</div>
      }
    </div>
  `,
})
export class PatientSearchComponent {
  private readonly patients = inject(PatientService);

  readonly initialDni = input<string | null>(null);
  readonly patientSelected = output<Patient>();
  readonly notFound = output<string>();

  protected dniInput = '';
  protected readonly patient = signal<Patient | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const dni = this.initialDni();
    if (dni) {
      this.dniInput = dni;
      this.searchByDni(dni);
    }
  }

  searchByDni(dni: string): void {
    const cleaned = (dni ?? '').replace(/\D/g, '');
    if (!cleaned) {
      this.error.set('Ingresá un DNI');
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.patients
      .search({ state: 'ACTIVE', page: 0, size: 1, q: cleaned })
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          const match = page.items.find((p) => String(p.dni) === cleaned);
          if (match) {
            this.patient.set(match);
            this.patientSelected.emit(match);
          } else {
            this.patient.set(null);
            this.notFound.emit(cleaned);
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Error al buscar el paciente');
        },
      });
  }

  setPatient(p: Patient): void {
    this.patient.set(p);
  }

  clear(): void {
    this.patient.set(null);
    this.dniInput = '';
    this.error.set(null);
  }
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx ng test --watch=false src/app/features/analitica/components/patient-search/patient-search.component.spec.ts 2>&1 | tail -5
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/components/patient-search
git commit -m "feat(atencion-wizard): <lab-patient-search> with DNI search + notFound emit"
```

---

### Task B4: `<lab-analysis-detail-modal>` component

**Files:**
- Create: `src/app/features/analitica/components/analysis-detail-modal/analysis-detail-modal.component.ts`
- Create: `src/app/features/analitica/components/analysis-detail-modal/analysis-detail-modal.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalysisDetailModalComponent } from './analysis-detail-modal.component';
import { AnalysisService } from '../../services/analysis.service';
import { AnalysisDetail } from '../../models/atencion.model';

const detail: AnalysisDetail = {
  id: 5, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3,
  description: 'Recuento celular', determinations: [{ id: 1, name: 'Globulos rojos' }],
  processingTime: 30, processingTimeUnit: 'MINUTES', nbuCode: 'NBU-123',
};

describe('AnalysisDetailModalComponent', () => {
  let fixture: ComponentFixture<AnalysisDetailModalComponent>;
  let api: { getById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { getById: vi.fn().mockReturnValue(of(detail)) };
    await TestBed.configureTestingModule({
      imports: [AnalysisDetailModalComponent],
      providers: [{ provide: AnalysisService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisDetailModalComponent);
  });

  it('does NOT fetch when visible is false', () => {
    fixture.componentRef.setInput('analysisId', 5);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(api.getById).not.toHaveBeenCalled();
  });

  it('fetches when visible turns true', () => {
    fixture.componentRef.setInput('analysisId', 5);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(api.getById).toHaveBeenCalledWith(5);
    expect(fixture.componentInstance.detail()?.nbuCode).toBe('NBU-123');
  });

  it('translates time unit MINUTES → minutos', () => {
    expect(fixture.componentInstance.translateUnit('MINUTES')).toBe('minutos');
    expect(fixture.componentInstance.translateUnit('HOURS')).toBe('horas');
    expect(fixture.componentInstance.translateUnit('DAYS')).toBe('días');
    expect(fixture.componentInstance.translateUnit('UNKNOWN')).toBe('UNKNOWN');
  });
});
```

- [ ] **Step 2: Run, expect failure.** `Tests` FAIL.

```bash
npx ng test --watch=false src/app/features/analitica/components/analysis-detail-modal/analysis-detail-modal.component.spec.ts 2>&1 | tail -5
```

- [ ] **Step 3: Implementar**

```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AnalysisDetail } from '../../models/atencion.model';
import { AnalysisService } from '../../services/analysis.service';

const TIME_UNIT_ES: Record<string, string> = {
  MINUTES: 'minutos', MINUTE: 'minuto',
  HOURS: 'horas', HOUR: 'hora',
  DAYS: 'días', DAY: 'día',
  WEEKS: 'semanas', WEEK: 'semana',
  MONTHS: 'meses', MONTH: 'mes',
};

@Component({
  selector: 'lab-analysis-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="closed.emit()" [modal]="true" [style]="{ width: '480px' }"
              header="Detalle del análisis">
      @if (loading()) {
        <div class="py-4 text-center text-sm opacity-70">Cargando...</div>
      } @else if (detail(); as d) {
        <div class="space-y-2 text-sm">
          <div><span class="opacity-60">Código corto:</span> <strong>{{ d.shortCode }}</strong></div>
          <div><span class="opacity-60">Práctica:</span> {{ d.name }}</div>
          <div><span class="opacity-60">Familia:</span> {{ d.familyName ?? '—' }}</div>
          <div><span class="opacity-60">NBU:</span> {{ d.nbuCode ?? '—' }}</div>
          <div><span class="opacity-60">Tiempo de procesamiento:</span>
            @if (d.processingTime != null) { {{ d.processingTime }} {{ translateUnit(d.processingTimeUnit ?? '') }} }
            @else { — }
          </div>
          @if (d.determinations.length) {
            <div>
              <div class="opacity-60 mt-2">Determinaciones</div>
              <ul class="list-disc list-inside">
                @for (det of d.determinations; track det.id) { <li>{{ det.name }}</li> }
              </ul>
            </div>
          }
          @if (d.description) {
            <div class="opacity-60 mt-2">Descripción</div>
            <div>{{ d.description }}</div>
          }
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Cerrar" severity="secondary" [text]="true" (onClick)="closed.emit()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AnalysisDetailModalComponent {
  private readonly api = inject(AnalysisService);

  readonly analysisId = input<number | null>(null);
  readonly visible    = input<boolean>(false);
  readonly closed     = output<void>();

  protected readonly detail  = signal<AnalysisDetail | null>(null);
  protected readonly loading = signal(false);

  constructor() {
    effect(() => {
      const id = this.analysisId();
      const open = this.visible();
      if (open && id != null) {
        this.detail.set(null);
        this.loading.set(true);
        this.api.getById(id).subscribe({
          next: (d) => { this.detail.set(d); this.loading.set(false); },
          error: () => { this.detail.set(null); this.loading.set(false); },
        });
      }
    });
  }

  translateUnit(unit: string): string {
    return TIME_UNIT_ES[unit?.toUpperCase?.() ?? ''] ?? unit;
  }
}
```

- [ ] **Step 4: Run test, expect pass.** `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/components/analysis-detail-modal
git commit -m "feat(atencion-wizard): <lab-analysis-detail-modal> with lazy fetch on open"
```

---

### Task B5: `<lab-analysis-picker>` component (input dual + tabla)

**Files:**
- Create: `src/app/features/analitica/components/analysis-picker/analysis-picker.component.ts`
- Create: `src/app/features/analitica/components/analysis-picker/analysis-picker.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalysisPickerComponent } from './analysis-picker.component';
import { AnalysisService } from '../../services/analysis.service';
import { Analysis } from '../../models/atencion.model';

const a = (over: Partial<Analysis>): Analysis => ({
  id: 1, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3, ...over,
});

describe('AnalysisPickerComponent', () => {
  let fixture: ComponentFixture<AnalysisPickerComponent>;
  let api: { findByShortCode: ReturnType<typeof vi.fn>; searchByName: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    api = { findByShortCode: vi.fn(), searchByName: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AnalysisPickerComponent],
      providers: [{ provide: AnalysisService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisPickerComponent);
    fixture.detectChanges();
  });

  it('detects numeric input as shortCode and uses findByShortCode', () => {
    api.findByShortCode.mockReturnValue(of(a({ id: 5, shortCode: 1001 })));
    fixture.componentInstance.handleEnter('1001');
    expect(api.findByShortCode).toHaveBeenCalledWith(1001);
    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  it('detects text input as name and uses searchByName for suggestions', () => {
    api.searchByName.mockReturnValue(of([a({ id: 5 }), a({ id: 6, shortCode: 1002, name: 'Glucemia' })]));
    fixture.componentInstance.onAutoCompleteSearch({ query: 'gluc' } as any);
    expect(api.searchByName).toHaveBeenCalledWith('gluc');
    expect(fixture.componentInstance.suggestions().length).toBe(2);
  });

  it('addAnalysis blocks duplicates by shortCode', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    expect(fixture.componentInstance.items().length).toBe(1);
    expect(fixture.componentInstance.errorText()).toContain('ya está');
  });

  it('removeAnalysis filters by id and emits analysisRemoved', () => {
    const emitted: number[] = [];
    fixture.componentInstance.analysisRemoved.subscribe((id) => emitted.push(id));
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.addAnalysis(a({ id: 2, shortCode: 1002, name: 'Glucemia' }));
    fixture.componentInstance.removeAnalysis(1);
    expect(fixture.componentInstance.items().map((x) => x.id)).toEqual([2]);
    expect(emitted).toEqual([1]);
  });

  it('clearAll resets the list', () => {
    fixture.componentInstance.addAnalysis(a({ id: 1, shortCode: 1001 }));
    fixture.componentInstance.clearAll();
    expect(fixture.componentInstance.items()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, expect failure.**

```bash
npx ng test --watch=false src/app/features/analitica/components/analysis-picker/analysis-picker.component.spec.ts 2>&1 | tail -5
```

- [ ] **Step 3: Implementar**

```ts
import {
  ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal, viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoCompleteCompleteEvent, AutoCompleteModule, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Analysis } from '../../models/atencion.model';
import { AnalysisService } from '../../services/analysis.service';

@Component({
  selector: 'lab-analysis-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, AutoCompleteModule, ButtonModule, TableModule],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex gap-2 items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium mb-1">Código o nombre del análisis</label>
          <p-autocomplete
            [(ngModel)]="autoModel"
            [suggestions]="suggestions()"
            (completeMethod)="onAutoCompleteSearch($event)"
            (onSelect)="onAutoCompleteSelect($event)"
            (onKeyUp)="onKeyup($event)"
            [delay]="250"
            [forceSelection]="false"
            placeholder="Tipeá un código o nombre, Enter para agregar"
            optionLabel="name"
            styleClass="w-full">
            <ng-template let-item pTemplate="item">
              <div class="text-sm">
                <span class="font-mono">{{ item.shortCode }}</span> — {{ item.name }}
                @if (item.familyName) { <span class="text-xs opacity-60"> · {{ item.familyName }}</span> }
              </div>
            </ng-template>
          </p-autocomplete>
        </div>
      </div>

      @if (errorText()) {
        <div class="text-sm text-[var(--color-danger,#ef4444)]">{{ errorText() }}</div>
      }

      <p-table [value]="items()" [rows]="20" styleClass="text-sm">
        <ng-template pTemplate="header">
          <tr>
            <th>Código</th>
            <th>Práctica</th>
            <th>Familia</th>
            @if (showBasePrice()) { <th class="text-right">Precio base</th> }
            <th class="w-24"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td class="font-mono">{{ row.shortCode }}</td>
            <td>{{ row.name }}</td>
            <td>{{ row.familyName ?? '—' }}</td>
            @if (showBasePrice()) {
              <td class="text-right">{{ rowPrice(row) }}</td>
            }
            <td class="text-right">
              <p-button icon="pi pi-eye" severity="secondary" [text]="true" size="small"
                        (onClick)="detailRequested.emit(row.id)" />
              <p-button icon="pi pi-trash" severity="danger" [text]="true" size="small"
                        (onClick)="removeAnalysis(row.id)" />
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="footer">
          @if (showBasePrice() && items().length) {
            <tr>
              <td colspan="3" class="text-right font-semibold">Total base</td>
              <td class="text-right font-semibold">{{ formatPrice(totalBase()) }} <span class="opacity-60">{{ hasUnpriced() ? '*' : '' }}</span></td>
              <td></td>
            </tr>
          }
        </ng-template>
      </p-table>
    </div>
  `,
})
export class AnalysisPickerComponent {
  private readonly api = inject(AnalysisService);

  readonly initialItems = input<Analysis[]>([]);
  readonly ubValue      = input<number | null>(null);  // del NbuService — null oculta la columna

  readonly analysisAdded   = output<Analysis>();
  readonly analysisRemoved = output<number>();
  readonly detailRequested = output<number>();

  protected autoModel: string | Analysis = '';
  protected readonly items       = signal<Analysis[]>([]);
  protected readonly suggestions = signal<Analysis[]>([]);
  protected readonly errorText   = signal<string | null>(null);

  protected readonly showBasePrice = computed(() => this.ubValue() != null);
  protected readonly totalBase     = computed(() => {
    const v = this.ubValue();
    if (v == null) return 0;
    return this.items().reduce((acc, x) => acc + (x.ubCount != null ? x.ubCount * v : 0), 0);
  });
  protected readonly hasUnpriced = computed(() => this.items().some((x) => x.ubCount == null));

  ngOnInit(): void {
    const initial = this.initialItems();
    if (initial?.length) this.items.set([...initial]);
  }

  onAutoCompleteSearch(e: AutoCompleteCompleteEvent): void {
    const q = (e.query ?? '').trim();
    if (!q) { this.suggestions.set([]); return; }
    this.api.searchByName(q).subscribe({
      next: (list) => this.suggestions.set(list ?? []),
      error: () => this.suggestions.set([]),
    });
  }

  onAutoCompleteSelect(e: AutoCompleteSelectEvent): void {
    const item = e.value as Analysis;
    this.addAnalysis(item);
    this.autoModel = '';
  }

  onKeyup(e: KeyboardEvent): void {
    if (e.key !== 'Enter') return;
    const raw = typeof this.autoModel === 'string' ? this.autoModel.trim() : '';
    if (raw) this.handleEnter(raw);
  }

  handleEnter(raw: string): void {
    if (/^\d+$/.test(raw)) {
      const code = Number(raw);
      this.api.findByShortCode(code).subscribe({
        next: (found) => {
          if (!found) {
            this.errorText.set(`No se encontró análisis con código ${code}`);
            return;
          }
          this.addAnalysis(found);
          this.autoModel = '';
        },
        error: () => this.errorText.set('Error al buscar el análisis'),
      });
    }
  }

  addAnalysis(a: Analysis): void {
    if (this.items().some((x) => x.shortCode === a.shortCode)) {
      this.errorText.set(`El código ${a.shortCode} ya está en la lista`);
      return;
    }
    this.errorText.set(null);
    this.items.update((arr) => [...arr, a]);
    this.analysisAdded.emit(a);
  }

  removeAnalysis(id: number): void {
    this.items.update((arr) => arr.filter((x) => x.id !== id));
    this.analysisRemoved.emit(id);
  }

  clearAll(): void {
    this.items.set([]);
    this.errorText.set(null);
  }

  rowPrice(row: Analysis): string {
    const v = this.ubValue();
    if (v == null || row.ubCount == null) return '—';
    return this.formatPrice(row.ubCount * v);
  }

  formatPrice(n: number): string {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  }
}
```

- [ ] **Step 4: Run test, expect pass**

```bash
npx ng test --watch=false src/app/features/analitica/components/analysis-picker/analysis-picker.component.spec.ts 2>&1 | tail -5
```

Expected: `Tests 5 passed (5)`.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/components/analysis-picker
git commit -m "feat(atencion-wizard): <lab-analysis-picker> with dual input + base-price column"
```

---

### Task B6: `<lab-attention-ticket-modal>` component

**Files:**
- Create: `src/app/features/analitica/components/attention-ticket-modal/attention-ticket-modal.component.ts`
- Create: `src/app/features/analitica/components/attention-ticket-modal/attention-ticket-modal.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttentionTicketModalComponent } from './attention-ticket-modal.component';

describe('AttentionTicketModalComponent', () => {
  let fixture: ComponentFixture<AttentionTicketModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AttentionTicketModalComponent] }).compileComponents();
    fixture = TestBed.createComponent(AttentionTicketModalComponent);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('confirmWithTicket emits confirmed=true', () => {
    let payload: boolean | undefined;
    fixture.componentInstance.confirmed.subscribe((v) => (payload = v));
    fixture.componentInstance.confirmWithTicket();
    expect(payload).toBe(true);
  });

  it('confirmWithoutTicket emits confirmed=false', () => {
    let payload: boolean | undefined;
    fixture.componentInstance.confirmed.subscribe((v) => (payload = v));
    fixture.componentInstance.confirmWithoutTicket();
    expect(payload).toBe(false);
  });

  it('onHide emits dismissed', () => {
    let dismissed = false;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed = true));
    fixture.componentInstance.onHide();
    expect(dismissed).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement**

```ts
import {
  ChangeDetectionStrategy, Component, input, output,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'lab-attention-ticket-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule],
  template: `
    <p-dialog [visible]="visible()" (onHide)="onHide()" [modal]="true" [style]="{ width: '420px' }"
              header="Finalizar atención">
      <p class="text-sm">¿Querés imprimir el ticket de la atención?</p>
      <ng-template pTemplate="footer">
        <p-button label="Sin ticket" severity="secondary" [text]="true" (onClick)="confirmWithoutTicket()" />
        <p-button label="Imprimir ticket" (onClick)="confirmWithTicket()" />
      </ng-template>
    </p-dialog>
  `,
})
export class AttentionTicketModalComponent {
  readonly visible   = input<boolean>(false);
  readonly confirmed = output<boolean>();
  readonly dismissed = output<void>();

  confirmWithTicket(): void { this.confirmed.emit(true); }
  confirmWithoutTicket(): void { this.confirmed.emit(false); }
  onHide(): void { this.dismissed.emit(); }
}
```

- [ ] **Step 4: Test passes.**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/components/attention-ticket-modal
git commit -m "feat(atencion-wizard): <lab-attention-ticket-modal>"
```

---

## Phase C — Step components

### Task C1: DatosGeneralesStep

**Files:**
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts`
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { Patient } from '@features/pacientes/models/patient.model';
import * as A from '../../../../../store/atencion/atencion.actions';
import { writeAtencionSession, writePendingDni, readPendingDni } from '../../../../../utils/atencion-session-store';

const samplePatient = (over: Partial<Patient> = {}): Patient => ({
  id: 1, dni: '32456789', firstName: 'Juan', lastName: 'Pérez',
  birthDate: '1985-05-12', gender: 'M', sexAtBirth: 'M', isVerified: true, isActive: true,
  hasGuardian: false, guardians: [], addresses: [], contacts: [], coverages: [], status: 'ACTIVE',
} as unknown as Patient);

describe('DatosGeneralesStepComponent', () => {
  let fixture: ComponentFixture<DatosGeneralesStepComponent>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let dispatched: any[];

  beforeEach(async () => {
    sessionStorage.clear();
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [
        provideMockStore({
          selectors: [],
        }),
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    dispatched = [];
    // @ts-expect-error access mock store
    fixture.componentInstance['store'].dispatch = vi.fn().mockImplementation((a) => dispatched.push(a));
  });

  it('onPatientNotFound writes pending DNI + session, then navigates to /pacientes/form', () => {
    fixture.componentInstance.onPatientNotFound('32456789');
    expect(readPendingDni()).toBe('32456789');
    expect(router.navigate).toHaveBeenCalledWith(['/pacientes/form'], {
      queryParams: { dni: '32456789', returnTo: '/analitica/atencion/42' },
    });
  });

  it('onContinue with patient dispatches assignGeneralData', () => {
    const p = samplePatient();
    fixture.componentInstance.onPatientSelected(p);
    fixture.componentInstance.form.indications = 'Ayuno 8hs';
    fixture.componentInstance.form.isUrgent = true;
    fixture.componentInstance.onContinue();
    const action = dispatched.find((a) => a.type === A.assignGeneralData.type);
    expect(action.id).toBe(42);
    expect(action.payload.patientId).toBe(1);
    expect(action.payload.indications).toBe('Ayuno 8hs');
  });

  it('onContinue without patient does NOT dispatch', () => {
    fixture.componentInstance.onContinue();
    expect(dispatched.find((a) => a.type === A.assignGeneralData.type)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implementar**

```ts
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { Patient } from '@features/pacientes/models/patient.model';
import { PatientSearchComponent } from '../../../../../components/patient-search/patient-search.component';
import { assignGeneralData } from '../../../../../store/atencion/atencion.actions';
import {
  clearPendingDni,
  readPendingDni,
  writeAtencionSession,
  writePendingDni,
} from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-datos-generales-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule, CheckboxModule, PatientSearchComponent],
  template: `
    <div class="space-y-4">
      <lab-patient-search
        [initialDni]="initialDni()"
        (patientSelected)="onPatientSelected($event)"
        (notFound)="onPatientNotFound($event)" />

      <div>
        <label class="block text-sm">Indicaciones</label>
        <input pInputText [(ngModel)]="form.indications" class="w-full" />
      </div>

      <label class="flex items-center gap-2 text-sm">
        <p-checkbox [(ngModel)]="form.isUrgent" [binary]="true" /> Urgente
      </label>

      <div class="flex justify-end">
        <p-button label="Continuar →" [disabled]="!canContinue()" (onClick)="onContinue()" />
      </div>
    </div>
  `,
})
export class DatosGeneralesStepComponent {
  private readonly store  = inject(Store);
  private readonly router = inject(Router);

  readonly atencionId = input.required<number>();

  protected readonly patient = signal<Patient | null>(null);
  protected form = { indications: '', isUrgent: false };

  protected initialDni(): string | null {
    const pending = readPendingDni();
    if (pending) clearPendingDni();
    return pending;
  }

  onPatientSelected(p: Patient): void {
    this.patient.set(p);
  }

  onPatientNotFound(dni: string): void {
    writeAtencionSession({ atencionId: this.atencionId(), uiStep: 'datos' });
    writePendingDni(dni);
    this.router.navigate(['/pacientes/form'], {
      queryParams: { dni, returnTo: `/analitica/atencion/${this.atencionId()}` },
    });
  }

  canContinue(): boolean {
    return this.patient() != null;
  }

  onContinue(): void {
    const p = this.patient();
    if (!p) return;
    this.store.dispatch(assignGeneralData({
      id: this.atencionId(),
      payload: {
        patientId: p.id,
        doctorId: null,
        insurancePlanId: null,
        indications: this.form.indications || null,
      },
    }));
  }
}
```

- [ ] **Step 4: Test pasa.**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step
git commit -m "feat(atencion-wizard): DatosGeneralesStep with patient search + redirect"
```

---

### Task C2: AnalisisStep

**Files:**
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/analisis-step/analisis-step.component.ts`
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/analisis-step/analisis-step.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { AnalisisStepComponent } from './analisis-step.component';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { NbuService } from '../../../../../services/nbu.service';
import * as A from '../../../../../store/atencion/atencion.actions';

describe('AnalisisStepComponent', () => {
  let fixture: ComponentFixture<AnalisisStepComponent>;
  let dispatched: any[];
  let registry: { isActive: ReturnType<typeof vi.fn> };
  let nbu: { getCurrent: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    registry = { isActive: vi.fn().mockReturnValue(false) };
    nbu = { getCurrent: vi.fn().mockReturnValue(of(null)) };
    await TestBed.configureTestingModule({
      imports: [AnalisisStepComponent],
      providers: [
        provideMockStore(),
        { provide: ModuleRegistry, useValue: registry },
        { provide: NbuService, useValue: nbu },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalisisStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    fixture.detectChanges();
    dispatched = [];
    // @ts-expect-error
    fixture.componentInstance['store'].dispatch = vi.fn().mockImplementation((x) => dispatched.push(x));
  });

  it('onContinue with empty list does NOT dispatch', () => {
    fixture.componentInstance.onContinue();
    expect(dispatched).toHaveLength(0);
  });

  it('onContinue with Financiero OFF dispatches addAnalysisList + endSecretaryPhase', () => {
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: 1001, name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    expect(dispatched[0].type).toBe(A.addAnalysisList.type);
    expect(dispatched[1].type).toBe(A.endSecretaryPhase.type);
  });

  it('onContinue with Financiero ON dispatches only addAnalysisList and emits stepAdvanced', () => {
    registry.isActive.mockReturnValue(true);
    let stepAdvanced = false;
    fixture.componentInstance.stepAdvanced.subscribe(() => (stepAdvanced = true));
    fixture.componentInstance.onAnalysisAdded({ id: 5, shortCode: 1001, name: 'X', familyName: null, ubCount: null });
    fixture.componentInstance.onContinue();
    expect(dispatched.find((a) => a.type === A.addAnalysisList.type)).toBeDefined();
    expect(dispatched.find((a) => a.type === A.endSecretaryPhase.type)).toBeUndefined();
    expect(stepAdvanced).toBe(true);
  });

  it('exposes the NBU ubValue when service returns a version', () => {
    nbu.getCurrent.mockReturnValue(of({ id: 1, tenantId: 1, effectiveDate: '2026-05-01', ubValue: 350 }));
    fixture = TestBed.createComponent(AnalisisStepComponent);
    fixture.componentRef.setInput('atencionId', 42);
    fixture.detectChanges();
    expect(fixture.componentInstance.ubValue()).toBe(350);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implementar**

```ts
import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { AnalysisDetailModalComponent } from '../../../../../components/analysis-detail-modal/analysis-detail-modal.component';
import { AnalysisPickerComponent } from '../../../../../components/analysis-picker/analysis-picker.component';
import { Analysis } from '../../../../../models/atencion.model';
import { NbuService } from '../../../../../services/nbu.service';
import { addAnalysisList, endSecretaryPhase } from '../../../../../store/atencion/atencion.actions';

@Component({
  selector: 'lab-analisis-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, AnalysisPickerComponent, AnalysisDetailModalComponent],
  template: `
    <div class="space-y-4">
      <lab-analysis-picker
        [initialItems]="[]"
        [ubValue]="ubValue()"
        (analysisAdded)="onAnalysisAdded($event)"
        (analysisRemoved)="onAnalysisRemoved($event)"
        (detailRequested)="onDetailRequested($event)" />

      @if (!financieroActive()) {
        <p class="text-xs opacity-70">
          El módulo Financiero no está activo. Al continuar, la atención pasa directamente a la cola de extracción.
        </p>
      }

      <div class="flex justify-end">
        <p-button [label]="continueLabel()"
                  [disabled]="items().length === 0"
                  (onClick)="onContinue()" />
      </div>

      <lab-analysis-detail-modal
        [analysisId]="detailId()"
        [visible]="detailOpen()"
        (closed)="closeDetail()" />
    </div>
  `,
})
export class AnalisisStepComponent {
  private readonly store    = inject(Store);
  private readonly registry = inject(ModuleRegistry);
  private readonly nbu      = inject(NbuService);

  readonly atencionId   = input.required<number>();
  readonly stepAdvanced = output<void>();

  protected readonly items     = signal<Analysis[]>([]);
  protected readonly detailId  = signal<number | null>(null);
  protected readonly detailOpen = signal(false);

  protected readonly financieroActive = computed(() => this.registry.isActive(ModuleKey.Financiero));
  protected readonly nbuCurrent       = toSignal(this.nbu.getCurrent(), { initialValue: null });
  protected readonly ubValue          = computed(() => this.nbuCurrent()?.ubValue ?? null);

  continueLabel(): string {
    return this.financieroActive() ? 'Continuar →' : 'Finalizar fase';
  }

  onAnalysisAdded(a: Analysis): void { this.items.update((arr) => [...arr, a]); }
  onAnalysisRemoved(id: number): void { this.items.update((arr) => arr.filter((x) => x.id !== id)); }
  onDetailRequested(id: number): void { this.detailId.set(id); this.detailOpen.set(true); }
  closeDetail(): void { this.detailOpen.set(false); }

  onContinue(): void {
    if (this.items().length === 0) return;
    const ids = this.items().map((x) => x.id);
    this.store.dispatch(addAnalysisList({
      id: this.atencionId(),
      payload: { analysisIds: ids, isUrgent: false, authorizationNumber: null },
    }));
    if (this.financieroActive()) {
      this.stepAdvanced.emit();
    } else {
      this.store.dispatch(endSecretaryPhase({ id: this.atencionId() }));
    }
  }
}
```

- [ ] **Step 4: Test pasa.**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/analisis-step
git commit -m "feat(atencion-wizard): AnalisisStep with dual input + NBU pricing pre-cabled"
```

---

### Task C3: ResumenStep

**Files:**
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.ts`
- Create: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step/resumen-step.component.spec.ts`

- [ ] **Step 1: Test**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ResumenStepComponent } from './resumen-step.component';
import * as A from '../../../../../store/atencion/atencion.actions';
import { AttentionState } from '../../../../../models/atencion.model';

describe('ResumenStepComponent', () => {
  let fixture: ComponentFixture<ResumenStepComponent>;
  let dispatched: any[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenStepComponent],
      providers: [provideMockStore()],
    }).compileComponents();
    fixture = TestBed.createComponent(ResumenStepComponent);
    fixture.componentRef.setInput('atencion', {
      id: 42, tenantId: 1, attentionNumber: 'A-042', patientId: 100,
      doctorId: null, branchId: 1, insurancePlanId: null, indications: 'Ayuno',
      paymentId: null, protocolId: null, extractorId: null, attentionBox: null,
      deskAttentionBox: null, prescriptionFileUrl: null, isUrgent: true,
      authorizationNumber: null, observations: null, cancellationReason: null,
      cancelledAtState: null, attentionState: AttentionState.AWAITING_CONFIRMATION,
      mostAdvancedState: AttentionState.AWAITING_CONFIRMATION, analysisAuthorizations: [],
    });
    fixture.detectChanges();
    dispatched = [];
    // @ts-expect-error
    fixture.componentInstance['store'].dispatch = vi.fn().mockImplementation((x) => dispatched.push(x));
  });

  it('onFinishWithTicket dispatches endSecretaryPhase', () => {
    fixture.componentInstance.onFinishWithTicket(false);
    expect(dispatched[0].type).toBe(A.endSecretaryPhase.type);
  });

  it('opens ticket modal when finalize button clicked', () => {
    expect(fixture.componentInstance.ticketModalOpen()).toBe(false);
    fixture.componentInstance.openFinalize();
    expect(fixture.componentInstance.ticketModalOpen()).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implementar**

```ts
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { AttentionResponse } from '../../../../../models/atencion.model';
import { AttentionTicketModalComponent } from '../../../../../components/attention-ticket-modal/attention-ticket-modal.component';
import { endSecretaryPhase } from '../../../../../store/atencion/atencion.actions';
import { clearAtencionSession } from '../../../../../utils/atencion-session-store';

@Component({
  selector: 'lab-resumen-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, TagModule, AttentionTicketModalComponent],
  template: `
    <div class="space-y-4">
      <header class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Resumen de la atención</h3>
        @if (atencion().isUrgent) {
          <p-tag value="URGENTE" severity="danger" />
        }
      </header>

      <section>
        <div class="text-sm opacity-60">Paciente</div>
        <div class="text-base">ID {{ atencion().patientId ?? '—' }}</div>
      </section>

      <section>
        <div class="text-sm opacity-60">Indicaciones</div>
        <div class="text-base">{{ atencion().indications || '—' }}</div>
      </section>

      <section>
        <div class="text-sm opacity-60">Análisis solicitados ({{ atencion().analysisAuthorizations.length }})</div>
        <ul class="list-disc list-inside text-sm">
          @for (a of atencion().analysisAuthorizations; track a.analysisId) {
            <li>#{{ a.analysisId }}</li>
          }
        </ul>
      </section>

      <div class="flex justify-end">
        <p-button label="Finalizar atención ✓" (onClick)="openFinalize()" />
      </div>

      <lab-attention-ticket-modal
        [visible]="ticketModalOpen()"
        (confirmed)="onFinishWithTicket($event)"
        (dismissed)="closeFinalize()" />
    </div>
  `,
})
export class ResumenStepComponent {
  private readonly store = inject(Store);

  readonly atencion = input.required<AttentionResponse>();
  readonly finished = output<void>();

  protected readonly ticketModalOpen = signal(false);

  openFinalize(): void { this.ticketModalOpen.set(true); }
  closeFinalize(): void { this.ticketModalOpen.set(false); }

  /**
   * Dispatch end-secretary-phase. Ticket printing is left as a future-only hook —
   * the modal records intent (printTicket boolean), but the actual ticket service
   * is out of scope for this iteration (no backend endpoint yet).
   */
  onFinishWithTicket(printTicket: boolean): void {
    this.ticketModalOpen.set(false);
    this.store.dispatch(endSecretaryPhase({ id: this.atencion().id }));
    clearAtencionSession();
    void printTicket; // reserved for future ticket-printing integration
    this.finished.emit();
  }
}
```

- [ ] **Step 4: Test pasa.**

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/resumen-step
git commit -m "feat(atencion-wizard): ResumenStep with ticket modal hook"
```

---

## Phase D — Wizard integration

### Task D1: Reemplazar el wizard por la versión step-based

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts`

- [ ] **Step 1: Leer el archivo actual**

```bash
cat src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts | head -20
```

- [ ] **Step 2: Reescribir el wizard usando los step components**

Reemplazar el contenido entero por:

```ts
import {
  ChangeDetectionStrategy, Component, computed, effect, inject, input, signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { AttentionState, isTerminal } from '../../../models/atencion.model';
import { attentionStateLabel, attentionStateSeverity } from '../../../models/atencion-state-label';
import {
  cancelAtencion, createPreFilledAtencion, loadAtencion, returnPhase,
} from '../../../store/atencion/atencion.actions';
import {
  selectDetail, selectDetailLoading, selectMutating,
} from '../../../store/atencion/atencion.selectors';
import {
  clearAtencionSession, readAtencionSession, writeAtencionSession,
} from '../../../utils/atencion-session-store';
import { DatosGeneralesStepComponent } from './steps/datos-generales-step/datos-generales-step.component';
import { AnalisisStepComponent } from './steps/analisis-step/analisis-step.component';
import { ResumenStepComponent } from './steps/resumen-step/resumen-step.component';

type StepKey = 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';
interface WizardStepDef {
  key: StepKey;
  label: string;
  requires?: ModuleKey;
  matchesStates: AttentionState[];
}

const ALL_STEPS: WizardStepDef[] = [
  { key: 'datos',       label: 'Datos generales', matchesStates: [AttentionState.REGISTERING_GENERAL_DATA] },
  { key: 'analisis',    label: 'Análisis',        matchesStates: [AttentionState.REGISTERING_ANALYSES] },
  { key: 'cobro',       label: 'Cobro',           requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_COLLECTION_PROCESS] },
  { key: 'facturacion', label: 'Facturación',     requires: ModuleKey.Financiero, matchesStates: [AttentionState.ON_BILLING_PROCESS] },
  { key: 'confirmar',   label: 'Confirmar',       matchesStates: [AttentionState.AWAITING_CONFIRMATION] },
];

@Component({
  selector: 'lab-atencion-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonModule, TagModule, EmptyStateComponent,
    DatosGeneralesStepComponent, AnalisisStepComponent, ResumenStepComponent,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto">
      @if (loading()) {
        <div class="text-center py-12 opacity-70">Cargando atención…</div>
      } @else if (!detail()) {
        <ui-empty-state heading="Atención no encontrada" icon="pi-exclamation-circle" />
      } @else {
        <header class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-semibold">Atención {{ detail()!.attentionNumber }}</h2>
            <div class="text-sm opacity-70 flex items-center gap-2">
              <span>Paciente {{ detail()!.patientId ?? '—' }} ·</span>
              <p-tag [value]="stateLabel(detail()!.attentionState)" [severity]="stateSeverity(detail()!.attentionState)" />
            </div>
          </div>
          <p-button label="Volver al listado" severity="secondary" [text]="true" (onClick)="back()" />
        </header>

        @if (isTerminal(detail()!.attentionState)) {
          <ui-empty-state heading="{{ terminalHeading() }}" icon="pi-check-circle" [description]="terminalDescription()" />
        } @else if (isPostSecretary()) {
          <ui-empty-state heading="Fase de secretaría completada" icon="pi-clock"
                          [description]="postSecretaryDescription()" />
        } @else {
          <div class="flex items-center mb-6 px-2">
            @for (step of visibleSteps(); track step.key; let i = $index, last = $last) {
              <div class="flex flex-col items-center text-xs flex-1">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-white"
                     [style.background]="dotColor(step)">
                  @if (isCompleted(step)) { ✓ } @else { {{ i + 1 }} }
                </div>
                <div class="mt-1">{{ step.label }}</div>
              </div>
              @if (!last) {
                <div class="h-px flex-[0.5] mx-1" [style.background]="i < activeIndex() ? '#10b981' : '#cbd5e1'"></div>
              }
            }
          </div>

          @switch (uiStep()?.key) {
            @case ('datos') {
              <lab-datos-generales-step [atencionId]="detail()!.id" />
            }
            @case ('analisis') {
              <lab-analisis-step [atencionId]="detail()!.id" (stepAdvanced)="onAnalysisAdvanced()" />
            }
            @case ('confirmar') {
              <lab-resumen-step [atencion]="detail()!" (finished)="onFinished()" />
            }
          }

          <div class="flex justify-between mt-4">
            <p-button label="Volver fase" severity="secondary" [outlined]="true"
                      [disabled]="mutating() || !canReturn()" (onClick)="onReturnPhase()" />
            <p-button label="Cancelar atención" severity="danger" [text]="true" (onClick)="onCancel()" />
          </div>
        }
      }
    </div>
  `,
})
export class AtencionWizardComponent {
  private readonly store    = inject(Store);
  private readonly router   = inject(Router);
  private readonly registry = inject(ModuleRegistry);

  readonly id            = input<string | undefined>(undefined);
  readonly appointmentId = input<string | undefined>(undefined);

  protected readonly detail   = this.store.selectSignal(selectDetail);
  protected readonly loading  = this.store.selectSignal(selectDetailLoading);
  protected readonly mutating = this.store.selectSignal(selectMutating);
  protected readonly stateLabel    = attentionStateLabel;
  protected readonly stateSeverity = attentionStateSeverity;
  protected readonly isTerminal    = isTerminal;

  protected readonly visibleSteps = computed<WizardStepDef[]>(() =>
    ALL_STEPS.filter((s) => !s.requires || this.registry.isActive(s.requires))
  );
  protected readonly stepFromState = computed<WizardStepDef | null>(() => {
    const d = this.detail();
    if (!d) return null;
    return this.visibleSteps().find((s) => s.matchesStates.includes(d.attentionState)) ?? null;
  });
  private readonly uiStepOverride = signal<StepKey | null>(null);
  protected readonly uiStep = computed<WizardStepDef | null>(() => {
    const o = this.uiStepOverride();
    return o ? this.visibleSteps().find((s) => s.key === o) ?? this.stepFromState() : this.stepFromState();
  });
  protected readonly activeIndex = computed(() => {
    const a = this.uiStep();
    return a ? this.visibleSteps().findIndex((s) => s.key === a.key) : -1;
  });

  constructor() {
    effect(() => {
      const idv = this.id();
      const apptId = this.appointmentId();
      this.uiStepOverride.set(null);
      if (idv) {
        this.store.dispatch(loadAtencion({ id: Number(idv) }));
        writeAtencionSession({ atencionId: Number(idv), uiStep: 'datos' });
      } else if (apptId) {
        this.store.dispatch(createPreFilledAtencion({
          payload: { appointmentId: Number(apptId), attentionNumber: `A-${Date.now().toString().slice(-6)}` },
        }));
      } else {
        const restored = readAtencionSession();
        if (restored) this.store.dispatch(loadAtencion({ id: restored.atencionId }));
      }
    });
  }

  isCompleted(step: WizardStepDef): boolean {
    const a = this.stepFromState();
    if (!a) return false;
    return this.visibleSteps().findIndex((s) => s.key === step.key) <
           this.visibleSteps().findIndex((s) => s.key === a.key);
  }
  dotColor(step: WizardStepDef): string {
    if (this.isCompleted(step)) return '#10b981';
    if (this.uiStep()?.key === step.key) return 'var(--brand-secondary, #3b82f6)';
    return '#94a3b8';
  }
  canReturn(): boolean {
    const s = this.detail()?.attentionState;
    return s != null && s !== AttentionState.REGISTERING_GENERAL_DATA && !isTerminal(s);
  }
  onReturnPhase(): void {
    const d = this.detail();
    if (!d) return;
    this.uiStepOverride.set(null);
    this.store.dispatch(returnPhase({ id: d.id }));
  }
  onCancel(): void {
    const d = this.detail();
    if (!d) return;
    const reason = window.prompt('Motivo de cancelación');
    if (!reason?.trim()) return;
    this.store.dispatch(cancelAtencion({ id: d.id, payload: { cancellationReason: reason } }));
    clearAtencionSession();
  }
  onAnalysisAdvanced(): void { this.uiStepOverride.set('cobro'); }
  onFinished(): void { this.router.navigate(['/analitica/atencion']); }
  back(): void { this.router.navigate(['/analitica/atencion']); }
  isPostSecretary(): boolean {
    const s = this.detail()?.attentionState;
    return s === AttentionState.AWAITING_EXTRACTION || s === AttentionState.IN_EXTRACTION;
  }
  postSecretaryDescription(): string {
    return this.detail()?.attentionState === AttentionState.AWAITING_EXTRACTION
      ? 'La atención está en la cola de extracción esperando que un extractor la tome.'
      : 'Un extractor está atendiendo a este paciente en este momento.';
  }
  terminalHeading(): string {
    const s = this.detail()?.attentionState;
    if (s === AttentionState.FINISHED) return 'Atención finalizada';
    if (s === AttentionState.CANCELED) return 'Atención cancelada';
    return 'Atención fallida';
  }
  terminalDescription(): string {
    const d = this.detail();
    if (d?.attentionState === AttentionState.CANCELED && d.cancellationReason) return `Motivo: ${d.cancellationReason}`;
    return 'Esta atención está en un estado terminal.';
  }
}
```

- [ ] **Step 3: Build inmediato**

```bash
npx ng build --configuration development 2>&1 | tail -10
```

Expected: `Application bundle generation complete.` sin errores rojos.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "refactor(atencion-wizard): wire step components into the wizard shell"
```

---

### Task D2: Suite completa de tests + smoke build

- [ ] **Step 1: Correr todos los tests**

```bash
npx ng test --watch=false 2>&1 | tail -5
```

Expected: `Tests <N> passed (<N>)` con conteo MAYOR que el baseline registrado en A1 (sumamos los tests de los componentes nuevos: 6 + 3 + 3 + 4 + 5 + 3 + 3 + 4 + 2 = al menos +33 nuevos tests respecto al baseline).

- [ ] **Step 2: Build final**

```bash
npx ng build --configuration development 2>&1 | tail -5
```

Expected: `Application bundle generation complete.`

- [ ] **Step 3: Manual smoke test contra backend local**

Asumiendo que `start-dev.bat` ya levantó back + front:

1. Login con `admin@test.com` / `password`.
2. Navegar a `/analitica/atencion`.
3. Si no hay atenciones: crear una via Adminer o via la cola de turnos (cuando esté). Para pruebas, usar el seed de `Backend/dev/seed-test-attentions.sql` que ya existe (atenciones A-T001…A-T010).
4. Abrir `/analitica/atencion/<id-de-A-T001>` (REGISTERING_GENERAL_DATA).
5. Verificar:
   - El header muestra "Atención A-T001" + tag "Datos generales" (no el enum en inglés).
   - El stepper muestra 3 pasos (Financiero está activo por default según seed → 5 pasos; para validar el CORE puro, ejecutar `UPDATE tenant_modules SET enabled = FALSE WHERE target_tenant_id = 1 AND module_code = 'FINANCIERO';` y relogin).
   - Búsqueda por DNI funciona con un paciente existente.
   - Búsqueda con DNI inexistente redirige a `/pacientes/form?dni=...&returnTo=/analitica/atencion/<id>`.
6. Repetir para `A-T002` (REGISTERING_ANALYSES) — debería renderizar `AnalisisStep`.
7. Tipear `1001` en el picker → debería intentar `findByShortCode`. Si el backend no expone el endpoint, devuelve null y la UI muestra "No se encontró análisis con código 1001" — comportamiento correcto.

- [ ] **Step 4: Commit final si hay ajustes de smoke**

```bash
git add -A
git status --short
git commit -m "fix(atencion-wizard): smoke-test adjustments" --allow-empty
```

---

### Task D3: PR draft

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/atencion-wizard-deep-core
```

- [ ] **Step 2: Crear PR draft**

```bash
gh pr create --base development --head feat/atencion-wizard-deep-core --draft \
  --title "feat(atencion): deep CORE wizard (3 steps + reusable components + NBU pre-cable)" \
  --body "$(cat <<'EOF'
## Summary
- Reemplaza el wizard básico por una versión profunda con 3 pasos CORE (Datos generales, Análisis, Resumen).
- 4 componentes reusables: `<lab-patient-search>`, `<lab-analysis-picker>`, `<lab-analysis-detail-modal>`, `<lab-attention-ticket-modal>`.
- `NbuService` pre-cableado con fallback graceful — la columna "Precio base" en la tabla de análisis se enciende sola cuando el backend exponga `GET /api/v1/analitica/nbu/current`.
- Persistencia con sessionStorage para sobrevivir refresh y el caso de redirect a `/pacientes/form` cuando el DNI no existe.

## Test plan
- [ ] `npx ng test --watch=false` pasa con +33 tests sobre el baseline.
- [ ] `npx ng build --configuration development` pasa.
- [ ] Smoke manual: dashboard → abrir atención A-T001 (REGISTERING_GENERAL_DATA) → buscar paciente → continuar → agregar análisis → finalizar.
- [ ] Toggle Financiero OFF (`UPDATE tenant_modules SET enabled = FALSE WHERE module_code = 'FINANCIERO'`) → wizard pasa a 3 pasos.

## Endpoints pendientes en backend
- `GET /api/v1/analitica/analysis?shortCode=X` — auditar/crear (ticket separado en Backend).
- `GET /api/v1/analitica/analysis?nameLike=X&limit=10` — auditar/crear.
- `GET /api/v1/analitica/nbu/current` — crear módulo NBU (ticket separado en Backend).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: URL del PR.

---

## Self-review (filling out — see Spec Coverage below)

**Spec coverage:**

| Sección del spec | Task que la implementa |
|---|---|
| Arquitectura del wizard CORE | D1 |
| Paso 1 — Datos generales (búsqueda DNI, redirect notFound) | C1 + B3 |
| Paso 2 — Análisis (input dual, tabla, modal detalle, NBU precio) | C2 + B5 + B4 + B1 |
| Paso 3 — Resumen (render + ticket modal) | C3 + B6 |
| Persistencia sessionStorage | A3 + D1 |
| Componentes reusables (4) | B3, B4, B5, B6 |
| Precio base CORE (NBU graceful fallback) | B1 + B5 |
| Endpoints requeridos del backend (auditoría) | A2 |
| Tests por componente | cada Task X1/X2 |
| Single PR replacing existing wizard | D1 |

**Placeholder scan:** ningún "TBD", "add appropriate handling", "similar to Task N". El ticket de impresión real queda explícitamente fuera de scope con comentario en C3 — no es un placeholder oculto, está marcado en sección "Fuera de scope" del spec.

**Type consistency:**
- `Analysis` definida en B2, usada en B5 y C2. Mismas keys: `id`, `shortCode`, `name`, `familyName`, `ubCount`.
- `AnalysisDetail` definida en B2, usada en B4.
- `NbuVersion` definida en B1, usada en C2 vía `NbuService.getCurrent()`.
- `AttentionUiStep` definida en A3, usada en C1, C2, D1.
- Actions importadas via `import * as A` solo en specs; en componentes son imports nombrados (cumple `ngrx-backend-request`).

Plan cubre el spec end-to-end. Si al ejecutar alguna task el subagent encuentra que un endpoint no existe (Task A2 lo detectaría), se documenta y se sigue con el componente apuntando al endpoint correcto cuando esté.
