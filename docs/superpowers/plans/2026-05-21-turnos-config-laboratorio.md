# Configuración de Agendas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la pantalla `/turnos/configuracion` y el flujo de stepper alta/edición `/turnos/configuracion/{nueva,:id/editar}` en FRONTEND-LABORATORIO, consumiendo el backend `AgendaConfigController` ya implementado.

**Architecture:** Feature `turnos` con sub-feature `agendas` en el store NgRx clásico. Service HTTP wrapper, store con `configsByBranch: Record<number, AgendaConfig[]>`, pantalla principal con acordeón por sucursal, stepper de 4 pasos para alta/edición (Sucursal → Horario → Vigencia → Confirmar). Permisos espejo del backend; mismo PrimeNG + Tailwind que el resto del módulo turnos.

**Tech Stack:** Angular 21 (standalone components, OnPush, signals), NgRx classic (`@ngrx/store` + `@ngrx/effects`), PrimeNG 21 + tema, Tailwind 4. Build: `ng serve` / `ng build`. Test runner: Vitest (configurado, sin tests existentes — usar TDD en lógica testeable: mapper, reducer, guard, resolver, service).

**Spec:** `docs/superpowers/specs/2026-05-19-turnos-config-laboratorio-design.md`.

**Branch:** `feat/turnos-specs` (mismo branch que Spec B en el frontend; Spec B ya commiteado en HEAD `1e505d1`).

**Backend dependency:** `GET /api/v1/turnos/agenda-configs/{id}` implementado en backend `feat/turnos-specs` (commit `65a8497`). Pendiente PR/merge a backend `development`. El frontend puede desarrollarse en paralelo apuntando al backend feat-branch; smoke E2E final requiere ambos branches merged.

---

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/app/features/turnos/models/agenda-config.model.ts` | Crear | DTOs alineados 1:1 con backend |
| `src/app/features/turnos/services/agenda-config.service.ts` | Crear | HTTP wrapper (5 métodos: list/getById/create/update/delete) |
| `src/app/features/turnos/utils/agenda-error-mapper.ts` | Crear | `HttpErrorResponse` → `{ display, severity, message, returnToStep? }` |
| `src/app/features/turnos/store/agendas/agendas.state.ts` | Crear | Tipos del state + initial state |
| `src/app/features/turnos/store/agendas/agendas.actions.ts` | Crear | createAction para load/create/update/delete + success/failure |
| `src/app/features/turnos/store/agendas/agendas.reducer.ts` | Crear | createReducer puro |
| `src/app/features/turnos/store/agendas/agendas.effects.ts` | Crear | Effects que llaman al service y dispatch toast/reload |
| `src/app/features/turnos/store/agendas/agendas.selectors.ts` | Crear | createSelector + selectSignal-ready |
| `src/app/features/turnos/guards/agenda-write.guard.ts` | Crear | Functional guard: ADMIN o RESPONSABLE_SECRETARIA |
| `src/app/features/turnos/resolvers/agenda-config.resolver.ts` | Crear | Resolve para modo edit: `getById` antes de activar wizard |
| `src/app/features/turnos/components/agenda-branch-section.component.ts` | Crear | Sección colapsable por sucursal (header + tabla/cards + CTAs) |
| `src/app/features/turnos/pages/configuracion/configuracion-list.page.ts` | Crear | Pantalla principal: filtros + acordeón |
| `src/app/features/turnos/pages/configuracion/configuracion-list.page.html` | Crear | Template |
| `src/app/features/turnos/pages/configuracion/configuracion-list.page.scss` | Crear | Estilos page-level |
| `src/app/features/turnos/pages/configuracion/agenda-wizard.page.ts` | Crear | Pantalla stepper (4 pasos) |
| `src/app/features/turnos/pages/configuracion/agenda-wizard.page.html` | Crear | Template stepper |
| `src/app/features/turnos/pages/configuracion/agenda-wizard.page.scss` | Crear | Estilos stepper |
| `src/app/features/turnos/pages/configuracion/steps/step-sucursal.component.ts` | Crear | Paso 1 |
| `src/app/features/turnos/pages/configuracion/steps/step-horario.component.ts` | Crear | Paso 2 + preview de capacidad |
| `src/app/features/turnos/pages/configuracion/steps/step-vigencia.component.ts` | Crear | Paso 3 (recurrencia + fechas) |
| `src/app/features/turnos/pages/configuracion/steps/step-confirmar.component.ts` | Crear | Paso 4 (resumen + submit) |
| `src/app/features/turnos/pages/configuracion/configuracion.component.ts` | Eliminar | Placeholder de 11 líneas, reemplazado por `configuracion-list.page.ts` |
| `src/app/features/turnos/turnos.routes.ts` | Modificar | Registrar `agendasReducer` + `AgendasEffects` + sub-rutas |

---

## Test commands

- Run single spec: `npx vitest run src/app/features/turnos/utils/agenda-error-mapper.spec.ts`
- Run all turnos tests: `npx vitest run src/app/features/turnos`
- Watch mode: `npx vitest src/app/features/turnos/utils/agenda-error-mapper.spec.ts`
- Build typecheck: `npm run build`
- Dev server (manual smoke): `npm start` (default port 4200)

---

## Phase 1 — Data layer

### Task 1: Models

**Files:**
- Create: `src/app/features/turnos/models/agenda-config.model.ts`

- [ ] **Step 1: Crear el archivo de modelos**

```typescript
// Alineado 1:1 con backend AgendaConfigResponse / AgendaConfigRequest / UpdateAgendaConfigRequest
export interface AgendaConfig {
  id: number;
  branchId: number;
  tenantId: number;
  startTime: string;            // "HH:mm" o "HH:mm:ss"
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  appointmentsCount: number;
  isRecurring: boolean;
  validFromDate: string;        // ISO date "YYYY-MM-DD"
  validToDate: string | null;
  recurringDaysOfWeek: string | null; // "MONDAY,TUESDAY,..."
}

export interface CreateAgendaConfigRequest {
  branchId: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  isRecurring: boolean;
  validFromDate: string;
  validToDate?: string;
  recurringDaysOfWeek?: string;
}

export type UpdateAgendaConfigRequest = Omit<CreateAgendaConfigRequest, 'branchId'>;

export const WEEK_DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'] as const;
export type WeekDay = typeof WEEK_DAYS[number];

export const SLOT_DURATION_OPTIONS = [10, 15, 20, 30, 45, 60] as const;
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos relacionados a este archivo.

- [ ] **Step 3: Commit**

```
git add src/app/features/turnos/models/agenda-config.model.ts && git commit -m "feat(turnos): add agenda config DTOs and weekday constants"
```

---

### Task 2: Service HTTP wrapper

**Files:**
- Create: `src/app/features/turnos/services/agenda-config.service.ts`

- [ ] **Step 1: Crear el service**

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AgendaConfig,
  CreateAgendaConfigRequest,
  UpdateAgendaConfigRequest,
} from '../models/agenda-config.model';

@Injectable({ providedIn: 'root' })
export class AgendaConfigService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/agenda-configs';

  list(branchId: number): Observable<AgendaConfig[]> {
    return this.http.get<AgendaConfig[]>(this.base, { params: { branchId } });
  }

  getById(id: number): Observable<AgendaConfig> {
    return this.http.get<AgendaConfig>(`${this.base}/${id}`);
  }

  create(body: CreateAgendaConfigRequest): Observable<number> {
    return this.http.post<number>(this.base, body);
  }

  update(id: number, body: UpdateAgendaConfigRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```
git add src/app/features/turnos/services/agenda-config.service.ts && git commit -m "feat(turnos): add AgendaConfigService HTTP wrapper"
```

---

### Task 3: Error mapper utility (TDD)

**Files:**
- Create: `src/app/features/turnos/utils/agenda-error-mapper.ts`
- Create: `src/app/features/turnos/utils/agenda-error-mapper.spec.ts`

- [ ] **Step 1: Crear el test (RED)**

```typescript
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mapAgendaError } from './agenda-error-mapper';

function buildHttpError(status: number, body: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, url: '/api/v1/turnos/agenda-configs' });
}

describe('mapAgendaError', () => {
  it('maps AgendaConfigOverlapException (400) to toast + returnToStep 3', () => {
    const error = buildHttpError(400, {
      code: 'AGENDA_CONFIG_OVERLAP',
      message: 'Overlapping agenda',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'error',
      message: 'Overlapping agenda',
      returnToStep: 3,
    });
  });

  it('maps AgendaConfigNotFoundException (404) to info toast', () => {
    const error = buildHttpError(404, {
      code: 'AGENDA_CONFIG_NOT_FOUND',
      message: 'Not found',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'info',
      message: 'Not found',
    });
  });

  it('maps fieldErrors (400 generic) to inline display', () => {
    const error = buildHttpError(400, {
      message: 'Validation failed',
      fieldErrors: { startTime: 'must be before endTime' },
    });
    const result = mapAgendaError(error);
    expect(result.display).toBe('inline');
    expect(result.fieldErrors).toEqual({ startTime: 'must be before endTime' });
  });

  it('maps 403 (AuthorizationDenied) to permission toast', () => {
    const error = buildHttpError(403, { message: 'Access denied' });
    expect(mapAgendaError(error)).toEqual({
      display: 'toast',
      severity: 'warn',
      message: 'No tenés permiso para esta acción.',
    });
  });

  it('maps 403 ModuleDisabledException to module-disabled banner', () => {
    const error = buildHttpError(403, {
      code: 'MODULE_DISABLED',
      message: 'TURNOS disabled',
    });
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'warn',
      message: 'El módulo Turnos está desactivado para este laboratorio.',
      moduleDisabled: true,
    });
  });

  it('maps 5xx to retryable banner', () => {
    const error = buildHttpError(503, { message: 'Service unavailable' });
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'error',
      message: 'No pudimos comunicarnos con el servidor. Reintentá en unos segundos.',
      retryable: true,
    });
  });

  it('maps status 0 (network) to retryable banner', () => {
    const error = buildHttpError(0, null);
    expect(mapAgendaError(error)).toEqual({
      display: 'banner',
      severity: 'error',
      message: 'Sin conexión con el servidor. Verificá tu red y reintentá.',
      retryable: true,
    });
  });
});
```

- [ ] **Step 2: Verificar RED (test falla porque mapAgendaError no existe)**

Run: `npx vitest run src/app/features/turnos/utils/agenda-error-mapper.spec.ts`
Expected: errores de tipo `Cannot find module './agenda-error-mapper'` o equivalente.

- [ ] **Step 3: Implementar el mapper (GREEN)**

```typescript
import { HttpErrorResponse } from '@angular/common/http';

export type MapDisplay = 'toast' | 'banner' | 'inline';
export type MapSeverity = 'error' | 'warn' | 'info' | 'success';

export interface MappedAgendaError {
  display: MapDisplay;
  severity: MapSeverity;
  message: string;
  returnToStep?: number;
  fieldErrors?: Record<string, string>;
  moduleDisabled?: boolean;
  retryable?: boolean;
}

interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export function mapAgendaError(error: HttpErrorResponse): MappedAgendaError {
  const body = (error.error ?? {}) as ApiErrorBody;
  const code = body.code;
  const apiMessage = body.message;

  if (error.status === 0) {
    return {
      display: 'banner',
      severity: 'error',
      message: 'Sin conexión con el servidor. Verificá tu red y reintentá.',
      retryable: true,
    };
  }

  if (error.status >= 500) {
    return {
      display: 'banner',
      severity: 'error',
      message: 'No pudimos comunicarnos con el servidor. Reintentá en unos segundos.',
      retryable: true,
    };
  }

  if (error.status === 400 && code === 'AGENDA_CONFIG_OVERLAP') {
    return {
      display: 'toast',
      severity: 'error',
      message: apiMessage ?? 'La agenda se superpone con otra ya configurada.',
      returnToStep: 3,
    };
  }

  if (error.status === 400 && body.fieldErrors) {
    return {
      display: 'inline',
      severity: 'error',
      message: apiMessage ?? 'Revisá los campos marcados.',
      fieldErrors: body.fieldErrors,
    };
  }

  if (error.status === 404 && code === 'AGENDA_CONFIG_NOT_FOUND') {
    return {
      display: 'toast',
      severity: 'info',
      message: apiMessage ?? 'No encontramos la agenda solicitada.',
    };
  }

  if (error.status === 403 && code === 'MODULE_DISABLED') {
    return {
      display: 'banner',
      severity: 'warn',
      message: 'El módulo Turnos está desactivado para este laboratorio.',
      moduleDisabled: true,
    };
  }

  if (error.status === 403) {
    return {
      display: 'toast',
      severity: 'warn',
      message: 'No tenés permiso para esta acción.',
    };
  }

  return {
    display: 'toast',
    severity: 'error',
    message: apiMessage ?? 'Ocurrió un error inesperado.',
  };
}
```

- [ ] **Step 4: Verificar GREEN**

Run: `npx vitest run src/app/features/turnos/utils/agenda-error-mapper.spec.ts`
Expected: `Tests 7 passed`.

Si algún test falla por un mensaje exacto en español, ajustar el mapper para que devuelva el mensaje que el test espera, o ajustar el test si el mensaje del mapper es funcionalmente equivalente.

- [ ] **Step 5: Commit**

```
git add src/app/features/turnos/utils/agenda-error-mapper.ts src/app/features/turnos/utils/agenda-error-mapper.spec.ts && git commit -m "feat(turnos): add agenda error mapper with HTTP status routing"
```

---

### Task 4: Store — state + actions + reducer (TDD reducer)

**Files:**
- Create: `src/app/features/turnos/store/agendas/agendas.state.ts`
- Create: `src/app/features/turnos/store/agendas/agendas.actions.ts`
- Create: `src/app/features/turnos/store/agendas/agendas.reducer.ts`
- Create: `src/app/features/turnos/store/agendas/agendas.reducer.spec.ts`

- [ ] **Step 1: Crear state**

```typescript
// agendas.state.ts
import { AgendaConfig } from '../../models/agenda-config.model';

export interface AgendasState {
  configsByBranch: Record<number, AgendaConfig[]>;
  loadingBranch: number | null;
  pending: boolean;
  error: unknown | null;
}

export const initialAgendasState: AgendasState = {
  configsByBranch: {},
  loadingBranch: null,
  pending: false,
  error: null,
};
```

- [ ] **Step 2: Crear actions**

```typescript
// agendas.actions.ts
import { createAction, props } from '@ngrx/store';
import {
  AgendaConfig,
  CreateAgendaConfigRequest,
  UpdateAgendaConfigRequest,
} from '../../models/agenda-config.model';

export const loadAgendas = createAction(
  '[Agendas] Load',
  props<{ branchId: number }>()
);
export const loadAgendasSuccess = createAction(
  '[Agendas] Load Success',
  props<{ branchId: number; configs: AgendaConfig[] }>()
);
export const loadAgendasFailure = createAction(
  '[Agendas] Load Failure',
  props<{ branchId: number; error: unknown }>()
);

export const createAgenda = createAction(
  '[Agendas] Create',
  props<{ request: CreateAgendaConfigRequest }>()
);
export const createAgendaSuccess = createAction(
  '[Agendas] Create Success',
  props<{ branchId: number; id: number }>()
);
export const createAgendaFailure = createAction(
  '[Agendas] Create Failure',
  props<{ error: unknown }>()
);

export const updateAgenda = createAction(
  '[Agendas] Update',
  props<{ id: number; branchId: number; request: UpdateAgendaConfigRequest }>()
);
export const updateAgendaSuccess = createAction(
  '[Agendas] Update Success',
  props<{ id: number; branchId: number }>()
);
export const updateAgendaFailure = createAction(
  '[Agendas] Update Failure',
  props<{ error: unknown }>()
);

export const deleteAgenda = createAction(
  '[Agendas] Delete',
  props<{ id: number; branchId: number }>()
);
export const deleteAgendaSuccess = createAction(
  '[Agendas] Delete Success',
  props<{ id: number; branchId: number }>()
);
export const deleteAgendaFailure = createAction(
  '[Agendas] Delete Failure',
  props<{ error: unknown }>()
);
```

- [ ] **Step 3: Crear test del reducer (RED)**

```typescript
// agendas.reducer.spec.ts
import { describe, expect, it } from 'vitest';
import * as A from './agendas.actions';
import { agendasReducer } from './agendas.reducer';
import { initialAgendasState } from './agendas.state';
import { AgendaConfig } from '../../models/agenda-config.model';

const sampleAgenda: AgendaConfig = {
  id: 1,
  branchId: 7,
  tenantId: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationMinutes: 15,
  patientsPerSlot: 2,
  appointmentsCount: 0,
  isRecurring: true,
  validFromDate: '2026-06-01',
  validToDate: null,
  recurringDaysOfWeek: 'MONDAY,TUESDAY',
};

describe('agendasReducer', () => {
  it('loadAgendas marks pending + loadingBranch', () => {
    const next = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    expect(next.pending).toBe(true);
    expect(next.loadingBranch).toBe(7);
    expect(next.error).toBeNull();
  });

  it('loadAgendasSuccess stores configs under branchId', () => {
    const intermediate = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    const next = agendasReducer(
      intermediate,
      A.loadAgendasSuccess({ branchId: 7, configs: [sampleAgenda] })
    );
    expect(next.configsByBranch[7]).toEqual([sampleAgenda]);
    expect(next.pending).toBe(false);
    expect(next.loadingBranch).toBeNull();
  });

  it('loadAgendasFailure clears pending + stores error', () => {
    const intermediate = agendasReducer(initialAgendasState, A.loadAgendas({ branchId: 7 }));
    const next = agendasReducer(
      intermediate,
      A.loadAgendasFailure({ branchId: 7, error: { status: 503 } })
    );
    expect(next.pending).toBe(false);
    expect(next.loadingBranch).toBeNull();
    expect(next.error).toEqual({ status: 503 });
  });

  it('deleteAgendaSuccess removes the agenda from configsByBranch', () => {
    const stateWithData = agendasReducer(
      initialAgendasState,
      A.loadAgendasSuccess({ branchId: 7, configs: [sampleAgenda, { ...sampleAgenda, id: 2 }] })
    );
    const next = agendasReducer(stateWithData, A.deleteAgendaSuccess({ id: 1, branchId: 7 }));
    expect(next.configsByBranch[7]).toEqual([{ ...sampleAgenda, id: 2 }]);
  });

  it('createAgendaSuccess does not insert (effects trigger reload instead)', () => {
    const next = agendasReducer(
      initialAgendasState,
      A.createAgendaSuccess({ branchId: 7, id: 99 })
    );
    expect(next.configsByBranch[7]).toBeUndefined(); // reload effect handles the insertion
    expect(next.pending).toBe(false);
  });

  it('createAgenda / updateAgenda / deleteAgenda set pending=true', () => {
    expect(agendasReducer(initialAgendasState, A.createAgenda({ request: {} as any })).pending).toBe(true);
    expect(agendasReducer(initialAgendasState, A.updateAgenda({ id: 1, branchId: 7, request: {} as any })).pending).toBe(true);
    expect(agendasReducer(initialAgendasState, A.deleteAgenda({ id: 1, branchId: 7 })).pending).toBe(true);
  });
});
```

- [ ] **Step 4: Verificar RED**

Run: `npx vitest run src/app/features/turnos/store/agendas/agendas.reducer.spec.ts`
Expected: errores de import (reducer aún no existe).

- [ ] **Step 5: Implementar reducer (GREEN)**

```typescript
// agendas.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as A from './agendas.actions';
import { initialAgendasState } from './agendas.state';

export const agendasReducer = createReducer(
  initialAgendasState,

  on(A.loadAgendas, (s, { branchId }) => ({
    ...s, pending: true, loadingBranch: branchId, error: null,
  })),
  on(A.loadAgendasSuccess, (s, { branchId, configs }) => ({
    ...s,
    configsByBranch: { ...s.configsByBranch, [branchId]: configs },
    pending: false,
    loadingBranch: null,
    error: null,
  })),
  on(A.loadAgendasFailure, (s, { error }) => ({
    ...s, pending: false, loadingBranch: null, error,
  })),

  on(A.createAgenda, A.updateAgenda, A.deleteAgenda, (s) => ({
    ...s, pending: true, error: null,
  })),

  on(A.createAgendaSuccess, A.updateAgendaSuccess, (s) => ({
    ...s, pending: false, error: null,
  })),

  on(A.deleteAgendaSuccess, (s, { id, branchId }) => ({
    ...s,
    configsByBranch: {
      ...s.configsByBranch,
      [branchId]: (s.configsByBranch[branchId] ?? []).filter(a => a.id !== id),
    },
    pending: false,
    error: null,
  })),

  on(A.createAgendaFailure, A.updateAgendaFailure, A.deleteAgendaFailure, (s, { error }) => ({
    ...s, pending: false, error,
  })),
);
```

- [ ] **Step 6: Verificar GREEN**

Run: `npx vitest run src/app/features/turnos/store/agendas/agendas.reducer.spec.ts`
Expected: `Tests 6 passed`.

- [ ] **Step 7: Commit**

```
git add src/app/features/turnos/store/agendas && git commit -m "feat(turnos): add agendas store (state + actions + reducer + tests)"
```

---

### Task 5: Store — effects + selectors

**Files:**
- Create: `src/app/features/turnos/store/agendas/agendas.effects.ts`
- Create: `src/app/features/turnos/store/agendas/agendas.selectors.ts`

- [ ] **Step 1: Crear selectors**

```typescript
// agendas.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AgendasState } from './agendas.state';

export const selectAgendasState = createFeatureSelector<AgendasState>('agendas');

export const selectAgendasByBranch = (branchId: number) =>
  createSelector(selectAgendasState, (s) => s.configsByBranch[branchId] ?? []);

export const selectAllConfigsByBranch =
  createSelector(selectAgendasState, (s) => s.configsByBranch);

export const selectAgendasPending =
  createSelector(selectAgendasState, (s) => s.pending);

export const selectAgendasLoadingBranch =
  createSelector(selectAgendasState, (s) => s.loadingBranch);

export const selectAgendasError =
  createSelector(selectAgendasState, (s) => s.error);
```

- [ ] **Step 2: Crear effects**

```typescript
// agendas.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { AgendaConfigService } from '../../services/agenda-config.service';
import * as A from './agendas.actions';

@Injectable()
export class AgendasEffects {
  private actions$ = inject(Actions);
  private service = inject(AgendaConfigService);
  private messages = inject(MessageService);

  loadAgendas$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.loadAgendas),
      switchMap(({ branchId }) =>
        this.service.list(branchId).pipe(
          map((configs) => A.loadAgendasSuccess({ branchId, configs })),
          catchError((error) => of(A.loadAgendasFailure({ branchId, error })))
        )
      )
    )
  );

  createAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createAgenda),
      mergeMap(({ request }) =>
        this.service.create(request).pipe(
          map((id) => A.createAgendaSuccess({ branchId: request.branchId, id })),
          catchError((error) => of(A.createAgendaFailure({ error })))
        )
      )
    )
  );

  createAgendaSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.createAgendaSuccess),
      map(({ branchId }) => {
        this.messages.add({ severity: 'success', summary: 'Agenda creada', detail: 'La nueva agenda quedó activa.' });
        return A.loadAgendas({ branchId });
      })
    )
  );

  updateAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateAgenda),
      mergeMap(({ id, branchId, request }) =>
        this.service.update(id, request).pipe(
          map(() => A.updateAgendaSuccess({ id, branchId })),
          catchError((error) => of(A.updateAgendaFailure({ error })))
        )
      )
    )
  );

  updateAgendaSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.updateAgendaSuccess),
      map(({ branchId }) => {
        this.messages.add({ severity: 'success', summary: 'Agenda actualizada', detail: 'Los cambios se guardaron correctamente.' });
        return A.loadAgendas({ branchId });
      })
    )
  );

  deleteAgenda$ = createEffect(() =>
    this.actions$.pipe(
      ofType(A.deleteAgenda),
      mergeMap(({ id, branchId }) =>
        this.service.delete(id).pipe(
          map(() => A.deleteAgendaSuccess({ id, branchId })),
          catchError((error) => of(A.deleteAgendaFailure({ error })))
        )
      )
    )
  );

  deleteAgendaSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(A.deleteAgendaSuccess),
        map(() => this.messages.add({ severity: 'success', summary: 'Agenda eliminada' }))
      ),
    { dispatch: false }
  );
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 4: Commit**

```
git add src/app/features/turnos/store/agendas/agendas.effects.ts src/app/features/turnos/store/agendas/agendas.selectors.ts && git commit -m "feat(turnos): add agendas effects + selectors"
```

---

### Task 6: Registrar store en turnos.routes.ts

**Files:**
- Modify: `src/app/features/turnos/turnos.routes.ts`

- [ ] **Step 1: Agregar imports**

En el archivo existente, agregar después del bloque de imports de `branch-totem-config`:

```typescript
import { agendasReducer } from './store/agendas/agendas.reducer';
import { AgendasEffects } from './store/agendas/agendas.effects';
```

- [ ] **Step 2: Registrar el state y los effects**

Dentro del array `providers`, agregar después de `provideEffects([QueueEffects, AppointmentsEffects, BranchTotemConfigEffects])`:

```typescript
provideState('agendas', agendasReducer),
provideEffects([AgendasEffects]),
```

(O fusionar el provideEffects existente en un solo array de 4 elementos.)

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: BUILD SUCCESS (la app no rompe en `ng build`).

- [ ] **Step 4: Commit**

```
git add src/app/features/turnos/turnos.routes.ts && git commit -m "feat(turnos): register agendas store in turnos routes"
```

---

## Phase 2 — Routing, guard, resolver

### Task 7: Write guard (TDD)

**Files:**
- Create: `src/app/features/turnos/guards/agenda-write.guard.ts`
- Create: `src/app/features/turnos/guards/agenda-write.guard.spec.ts`

- [ ] **Step 1: Inspeccionar `recepcion-access.guard.ts`** (referencia para el patrón existente)

Run: `cat src/app/features/turnos/guards/recepcion-access.guard.ts` para entender cómo el proyecto invoca el `UserSessionService` o equivalente para chequear roles.

- [ ] **Step 2: Crear el test (RED)**

```typescript
// agenda-write.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { agendaWriteGuard } from './agenda-write.guard';

describe('agendaWriteGuard', () => {
  let userSession: { currentUser: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userSession = { currentUser: vi.fn() };
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: UserSessionService, useValue: userSession },
        { provide: Router, useValue: router },
      ],
    });
  });

  function runGuard(): boolean {
    return TestBed.runInInjectionContext(() => agendaWriteGuard()) as boolean;
  }

  it('returns true for ADMINISTRADOR', () => {
    userSession.currentUser.mockReturnValue({ role: 'ADMINISTRADOR' });
    expect(runGuard()).toBe(true);
  });

  it('returns true for RESPONSABLE_SECRETARIA', () => {
    userSession.currentUser.mockReturnValue({ role: 'RESPONSABLE_SECRETARIA' });
    expect(runGuard()).toBe(true);
  });

  it('returns false and navigates to /turnos/configuracion for SECRETARIA', () => {
    userSession.currentUser.mockReturnValue({ role: 'SECRETARIA' });
    expect(runGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/turnos/configuracion']);
  });

  it('returns false and navigates to /turnos/configuracion for unauthenticated', () => {
    userSession.currentUser.mockReturnValue(null);
    expect(runGuard()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/turnos/configuracion']);
  });
});
```

- [ ] **Step 3: Verificar RED**

Run: `npx vitest run src/app/features/turnos/guards/agenda-write.guard.spec.ts`
Expected: Cannot find module './agenda-write.guard'.

- [ ] **Step 4: Implementar guard (GREEN)**

```typescript
// agenda-write.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserSessionService } from '@features/profile/services/user-session.service';

const WRITE_ROLES = ['ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'] as const;

export const agendaWriteGuard: CanActivateFn = () => {
  const session = inject(UserSessionService);
  const router = inject(Router);

  const role = session.currentUser()?.role;
  if (role && (WRITE_ROLES as readonly string[]).includes(role)) {
    return true;
  }
  router.navigate(['/turnos/configuracion']);
  return false;
};
```

Nota: si la API del `UserSessionService` difiere (e.g., el campo se llama `roles` y es un array, o vive en `roles[0]`), ajustar `role = session.currentUser()?.role` al shape real visto en Step 1.

- [ ] **Step 5: Verificar GREEN**

Run: `npx vitest run src/app/features/turnos/guards/agenda-write.guard.spec.ts`
Expected: `Tests 4 passed`. Si el shape de `currentUser()` difiere, ajustar guard y test consistentemente.

- [ ] **Step 6: Commit**

```
git add src/app/features/turnos/guards/agenda-write.guard.ts src/app/features/turnos/guards/agenda-write.guard.spec.ts && git commit -m "feat(turnos): add agendaWriteGuard for wizard routes"
```

---

### Task 8: Resolver

**Files:**
- Create: `src/app/features/turnos/resolvers/agenda-config.resolver.ts`

- [ ] **Step 1: Crear resolver**

```typescript
import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AgendaConfigService } from '../services/agenda-config.service';
import { AgendaConfig } from '../models/agenda-config.model';

export const agendaConfigResolver: ResolveFn<AgendaConfig | null> = (route) => {
  const service = inject(AgendaConfigService);
  const router = inject(Router);
  const idParam = route.paramMap.get('id');
  const id = idParam ? Number(idParam) : NaN;

  if (!idParam || Number.isNaN(id)) {
    router.navigate(['/turnos/configuracion']);
    return of(null);
  }

  return service.getById(id).pipe(
    catchError(() => {
      router.navigate(['/turnos/configuracion']);
      return of(null);
    })
  );
};
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 3: Commit**

```
git add src/app/features/turnos/resolvers/agenda-config.resolver.ts && git commit -m "feat(turnos): add agenda-config resolver for edit mode"
```

---

### Task 9: Sub-routes de `/configuracion`

**Files:**
- Modify: `src/app/features/turnos/turnos.routes.ts`

- [ ] **Step 1: Reemplazar la ruta plana `configuracion` por children**

En `turnos.routes.ts`, reemplazar el item:

```typescript
{ path: 'configuracion',  loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
```

por:

```typescript
{
  path: 'configuracion',
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./pages/configuracion/configuracion-list.page').then(m => m.ConfiguracionListPage),
    },
    {
      path: 'nueva',
      canActivate: [agendaWriteGuard],
      loadComponent: () =>
        import('./pages/configuracion/agenda-wizard.page').then(m => m.AgendaWizardPage),
    },
    {
      path: ':id/editar',
      canActivate: [agendaWriteGuard],
      resolve: { agenda: agendaConfigResolver },
      loadComponent: () =>
        import('./pages/configuracion/agenda-wizard.page').then(m => m.AgendaWizardPage),
    },
  ],
},
```

Agregar imports al header:

```typescript
import { agendaWriteGuard } from './guards/agenda-write.guard';
import { agendaConfigResolver } from './resolvers/agenda-config.resolver';
```

- [ ] **Step 2: No commit todavía** — esta task deja imports rotos hasta que existan las pages (Task 10 y 13). El commit se hace al final de Task 10 o como combo después de Task 13.

- [ ] **Step 3: Verificar que el cambio se aplicó pero NO buildear todavía** (build fallará hasta que existan las páginas).

---

## Phase 3 — Pantalla principal (list page)

### Task 10: List page scaffold

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/configuracion-list.page.ts`
- Create: `src/app/features/turnos/pages/configuracion/configuracion-list.page.html`
- Create: `src/app/features/turnos/pages/configuracion/configuracion-list.page.scss`
- Delete (al final del task): `src/app/features/turnos/pages/configuracion/configuracion.component.ts`

- [ ] **Step 1: Crear el componente TypeScript**

```typescript
// configuracion-list.page.ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { AccordionModule } from 'primeng/accordion';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { loadAgendas, deleteAgenda } from '../../store/agendas/agendas.actions';
import {
  selectAgendasPending,
  selectAllConfigsByBranch,
  selectAgendasError,
} from '../../store/agendas/agendas.selectors';
import { AgendaBranchSectionComponent } from '../../components/agenda-branch-section.component';

@Component({
  selector: 'app-configuracion-list-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ButtonModule, AccordionModule, SelectModule, InputTextModule,
    ConfirmDialogModule, ToastModule, SkeletonModule,
    AgendaBranchSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-list.page.html',
  styleUrl: './configuracion-list.page.scss',
  providers: [ConfirmationService, MessageService],
})
export class ConfiguracionListPage implements OnInit {
  private store = inject(Store);
  private router = inject(Router);
  private confirm = inject(ConfirmationService);
  private session = inject(UserSessionService);

  protected pending = this.store.selectSignal(selectAgendasPending);
  protected error = this.store.selectSignal(selectAgendasError);
  protected configsByBranch = this.store.selectSignal(selectAllConfigsByBranch);

  protected filterBranchId = signal<number | null>(null);
  protected searchTerm = signal<string>('');

  // Pendiente: cuando exista store de sucursales accesibles, reemplazar esta derivación.
  // De momento, asumimos que las branches con keys en configsByBranch son las visibles.
  protected branches = computed(() => {
    const map = this.configsByBranch();
    return Object.keys(map).map(id => ({ id: Number(id), name: `Sucursal ${id}` }));
  });

  protected visibleBranches = computed(() => {
    const filter = this.filterBranchId();
    return filter == null ? this.branches() : this.branches().filter(b => b.id === filter);
  });

  protected canWrite = computed(() => {
    const role = this.session.currentUser()?.role;
    return role === 'ADMINISTRADOR' || role === 'RESPONSABLE_SECRETARIA';
  });

  ngOnInit(): void {
    // Si el usuario es responsable de una sola sucursal, cargar solo esa.
    const branch = this.session.currentUser()?.branch;
    if (branch != null) {
      this.store.dispatch(loadAgendas({ branchId: branch }));
      this.filterBranchId.set(branch);
    } else {
      // Admin sin branch fija: cargar todas las que vea. De momento branchId=1 como bootstrap.
      // Pendiente: iterar sobre branches visibles del usuario cuando exista el store de sucursales.
      this.store.dispatch(loadAgendas({ branchId: 1 }));
    }
  }

  protected onAgregarPara(branchId: number): void {
    this.router.navigate(['/turnos/configuracion/nueva'], { queryParams: { branchId } });
  }

  protected onEditar(id: number): void {
    this.router.navigate(['/turnos/configuracion', id, 'editar']);
  }

  protected onEliminar(id: number, branchId: number): void {
    this.confirm.confirm({
      header: 'Eliminar agenda',
      message: 'Los turnos ya reservados con esta agenda no se afectarán. ¿Confirmás eliminar la configuración?',
      acceptLabel: 'Eliminar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(deleteAgenda({ id, branchId })),
    });
  }
}
```

- [ ] **Step 2: Crear el template HTML**

```html
<!-- configuracion-list.page.html -->
<p-toast />
<p-confirmDialog />

<div class="config-page">
  <header class="config-page__header">
    <div>
      <h1>Configuración de turnos</h1>
      <p>Definí horarios y capacidad por sucursal.</p>
    </div>
    @if (canWrite()) {
      <p-button
        label="Nueva agenda"
        icon="pi pi-plus"
        severity="primary"
        (onClick)="router.navigate(['/turnos/configuracion/nueva'])"
      />
    }
  </header>

  <section class="config-page__toolbar">
    <p-select
      [options]="branches()"
      optionLabel="name"
      optionValue="id"
      placeholder="Todas las sucursales"
      [(ngModel)]="filterBranchId"
      [showClear]="true"
    />
    <input
      pInputText
      type="text"
      placeholder="Buscar agenda..."
      [(ngModel)]="searchTerm"
    />
  </section>

  @if (error(); as err) {
    <div class="config-page__banner config-page__banner--error">
      <span>No pudimos cargar las agendas.</span>
      <p-button label="Reintentar" severity="secondary" (onClick)="ngOnInit()" />
    </div>
  }

  @if (pending()) {
    <p-skeleton height="6rem" />
    <p-skeleton height="6rem" />
  } @else {
    @if (visibleBranches().length === 0) {
      <div class="config-page__empty">
        <i class="pi pi-calendar"></i>
        <p>No hay sucursales para mostrar.</p>
      </div>
    } @else {
      <p-accordion [multiple]="true" [activeIndex]="[0]">
        @for (branch of visibleBranches(); track branch.id) {
          <app-agenda-branch-section
            [branch]="branch"
            [agendas]="(configsByBranch()[branch.id] ?? [])"
            [searchTerm]="searchTerm()"
            [canWrite]="canWrite()"
            (agregar)="onAgregarPara(branch.id)"
            (editar)="onEditar($event)"
            (eliminar)="onEliminar($event.id, branch.id)"
          />
        }
      </p-accordion>
    }
  }
</div>
```

- [ ] **Step 3: Crear el SCSS**

```scss
// configuracion-list.page.scss
:host { display: block; padding: 1.5rem; }

.config-page {
  display: flex; flex-direction: column; gap: 1.5rem;

  &__header {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    p { margin: .25rem 0 0; color: var(--p-text-muted-color); }
  }

  &__toolbar {
    display: flex; gap: .75rem; flex-wrap: wrap;
    > * { min-width: 12rem; }
  }

  &__banner {
    display: flex; align-items: center; justify-content: space-between;
    padding: .75rem 1rem; border-radius: 6px;
    &--error { background: var(--p-red-50); color: var(--p-red-700); border: 1px solid var(--p-red-200); }
  }

  &__empty {
    text-align: center; padding: 2rem; color: var(--p-text-muted-color);
    i { font-size: 2.5rem; margin-bottom: .5rem; }
  }
}
```

- [ ] **Step 4: Eliminar el placeholder antiguo**

```
rm src/app/features/turnos/pages/configuracion/configuracion.component.ts
# verificar que no haya otros archivos del placeholder antiguo (.html, .scss)
ls src/app/features/turnos/pages/configuracion/
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: BUILD SUCCESS. Si falla por `agenda-branch-section.component` aún no existe, **OK** — eso se cubre en la próxima task. En ese caso saltar al commit y continuar.

- [ ] **Step 6: Commit**

```
git add src/app/features/turnos/pages/configuracion src/app/features/turnos/turnos.routes.ts && git rm src/app/features/turnos/pages/configuracion/configuracion.component.ts 2>/dev/null && git commit -m "feat(turnos): configuracion-list page + sub-routes (wizard pendiente)"
```

---

### Task 11: AgendaBranchSection component

**Files:**
- Create: `src/app/features/turnos/components/agenda-branch-section.component.ts`
- Create: `src/app/features/turnos/components/agenda-branch-section.component.html`
- Create: `src/app/features/turnos/components/agenda-branch-section.component.scss`

- [ ] **Step 1: Crear el componente**

```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { AccordionModule } from 'primeng/accordion';
import { AgendaConfig } from '../models/agenda-config.model';

@Component({
  selector: 'app-agenda-branch-section',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, AccordionModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-branch-section.component.html',
  styleUrl: './agenda-branch-section.component.scss',
})
export class AgendaBranchSectionComponent {
  @Input({ required: true }) branch!: { id: number; name: string };
  @Input() agendas: AgendaConfig[] = [];
  @Input() searchTerm = '';
  @Input() canWrite = false;

  @Output() agregar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<number>();
  @Output() eliminar = new EventEmitter<{ id: number }>();

  protected filtered = computed(() => {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.agendas;
    return this.agendas.filter(a =>
      `${a.startTime}-${a.endTime}`.includes(q) ||
      (a.recurringDaysOfWeek?.toLowerCase().includes(q) ?? false)
    );
  });

  protected formatDays(daysCSV: string | null): string {
    if (!daysCSV) return '—';
    const SHORT: Record<string, string> = {
      MONDAY: 'L', TUESDAY: 'M', WEDNESDAY: 'X', THURSDAY: 'J',
      FRIDAY: 'V', SATURDAY: 'S', SUNDAY: 'D',
    };
    return daysCSV.split(',').map(d => SHORT[d] ?? d).join(' ');
  }

  protected formatRange(a: AgendaConfig): string {
    return `${a.startTime.slice(0,5)}–${a.endTime.slice(0,5)}`;
  }

  protected formatVigencia(a: AgendaConfig): string {
    const from = a.validFromDate;
    if (!a.validToDate) return `desde ${from}`;
    return `${from} → ${a.validToDate}`;
  }
}
```

- [ ] **Step 2: Crear template**

```html
<p-accordionTab>
  <ng-template pTemplate="header">
    <div class="branch-section__header">
      <strong>{{ branch.name }}</strong>
      <span class="branch-section__count">
        {{ agendas.length }} agenda{{ agendas.length === 1 ? '' : 's' }}
      </span>
      @if (canWrite) {
        <p-button
          label="Agregar agenda"
          icon="pi pi-plus"
          severity="secondary"
          size="small"
          (onClick)="$event.stopPropagation(); agregar.emit()"
        />
      }
    </div>
  </ng-template>

  @if (filtered().length === 0) {
    <div class="branch-section__empty">
      @if (agendas.length === 0) {
        Sin agendas configuradas.
        @if (canWrite) {
          <p-button label="Crear primera agenda" severity="secondary" size="small" (onClick)="agregar.emit()" />
        }
      } @else {
        Ninguna agenda coincide con tu búsqueda.
      }
    </div>
  } @else {
    <p-table [value]="filtered()" [responsiveLayout]="'stack'" [breakpoint]="'768px'">
      <ng-template pTemplate="header">
        <tr>
          <th>Horario</th>
          <th>Días</th>
          <th>Slot</th>
          <th>Cap.</th>
          <th>Vigencia</th>
          @if (canWrite) { <th>Acciones</th> }
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-a>
        <tr>
          <td>{{ formatRange(a) }}</td>
          <td>{{ formatDays(a.recurringDaysOfWeek) }}</td>
          <td>{{ a.slotDurationMinutes }} min</td>
          <td>{{ a.patientsPerSlot }}</td>
          <td>{{ formatVigencia(a) }}</td>
          @if (canWrite) {
            <td>
              <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editar.emit(a.id)" />
              <p-button icon="pi pi-trash" severity="danger" size="small" rounded text (onClick)="eliminar.emit({ id: a.id })" />
            </td>
          }
        </tr>
      </ng-template>
    </p-table>
  }
</p-accordionTab>
```

- [ ] **Step 3: Crear SCSS**

```scss
:host { display: block; }

.branch-section {
  &__header {
    display: flex; align-items: center; gap: 1rem; width: 100%;
    > strong { font-size: 1rem; }
  }
  &__count { color: var(--p-text-muted-color); font-size: .9rem; }
  &__empty {
    padding: 1rem; text-align: center; color: var(--p-text-muted-color);
    display: flex; flex-direction: column; align-items: center; gap: .5rem;
  }
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: BUILD SUCCESS. Si falla porque `AgendaWizardPage` no existe (la ruta lo importa), **OK** — saltar a commit y completar en Task 13.

Si falla por uso incorrecto de `p-accordionTab` en PrimeNG 21 (la API puede haber cambiado a `p-accordionPanel`), reemplazar consistentemente. Verificar en `node_modules/primeng/accordion/index.d.ts` o usar el patrón ya visto en el proyecto.

- [ ] **Step 5: Commit**

```
git add src/app/features/turnos/components/agenda-branch-section.component.* && git commit -m "feat(turnos): add AgendaBranchSectionComponent (collapsable per-branch table)"
```

---

## Phase 4 — Wizard

### Task 12: Wizard scaffold + state local

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard.page.ts`
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard.page.html`
- Create: `src/app/features/turnos/pages/configuracion/agenda-wizard.page.scss`

- [ ] **Step 1: Crear el componente con formGroup, step state y dispatch al submit**

```typescript
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Actions, ofType } from '@ngrx/effects';
import { AgendaConfig, CreateAgendaConfigRequest, UpdateAgendaConfigRequest } from '../../models/agenda-config.model';
import * as AgendasActions from '../../store/agendas/agendas.actions';
import { selectAgendasPending } from '../../store/agendas/agendas.selectors';
import { mapAgendaError } from '../../utils/agenda-error-mapper';
import { StepSucursalComponent } from './steps/step-sucursal.component';
import { StepHorarioComponent } from './steps/step-horario.component';
import { StepVigenciaComponent } from './steps/step-vigencia.component';
import { StepConfirmarComponent } from './steps/step-confirmar.component';

@Component({
  selector: 'app-agenda-wizard-page',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    ButtonModule, StepperModule, ToastModule,
    StepSucursalComponent, StepHorarioComponent, StepVigenciaComponent, StepConfirmarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agenda-wizard.page.html',
  styleUrl: './agenda-wizard.page.scss',
  providers: [MessageService],
})
export class AgendaWizardPage implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private messages = inject(MessageService);

  protected form: FormGroup = this.fb.group({
    branchId: [null, Validators.required],
    startTime: ['08:00', Validators.required],
    endTime: ['12:00', Validators.required],
    slotDurationMinutes: [15, [Validators.required, Validators.min(1)]],
    patientsPerSlot: [1, [Validators.required, Validators.min(1)]],
    isRecurring: [true],
    validFromDate: [this.todayISO(), Validators.required],
    validToDate: [null],
    recurringDaysOfWeek: [[] as string[]],
  });

  protected stepIndex = signal<number>(0);
  protected submitted = signal<boolean>(false);
  protected pending = this.store.selectSignal(selectAgendasPending);

  protected editAgenda = signal<AgendaConfig | null>(null);
  protected isEdit = computed(() => this.editAgenda() != null);

  ngOnInit(): void {
    const agenda = this.route.snapshot.data['agenda'] as AgendaConfig | null;
    if (agenda) {
      this.editAgenda.set(agenda);
      this.form.patchValue({
        branchId: agenda.branchId,
        startTime: agenda.startTime.slice(0,5),
        endTime: agenda.endTime.slice(0,5),
        slotDurationMinutes: agenda.slotDurationMinutes,
        patientsPerSlot: agenda.patientsPerSlot,
        isRecurring: agenda.isRecurring,
        validFromDate: agenda.validFromDate,
        validToDate: agenda.validToDate,
        recurringDaysOfWeek: agenda.recurringDaysOfWeek?.split(',') ?? [],
      });
      this.form.get('branchId')?.disable();
    } else {
      const presetBranch = this.route.snapshot.queryParamMap.get('branchId');
      if (presetBranch) {
        this.form.patchValue({ branchId: Number(presetBranch) });
        this.stepIndex.set(1); // skip step 1
      }
    }

    this.actions$.pipe(ofType(AgendasActions.createAgendaFailure, AgendasActions.updateAgendaFailure)).subscribe(({ error }) => {
      const mapped = mapAgendaError(error as any);
      this.messages.add({ severity: mapped.severity, summary: 'Error', detail: mapped.message });
      if (mapped.returnToStep) this.stepIndex.set(mapped.returnToStep - 1);
      this.submitted.set(false);
    });

    this.actions$.pipe(ofType(AgendasActions.createAgendaSuccess, AgendasActions.updateAgendaSuccess)).subscribe(() => {
      this.router.navigate(['/turnos/configuracion']);
    });
  }

  protected next(): void {
    this.stepIndex.update(i => Math.min(i + 1, 3));
  }
  protected back(): void {
    this.stepIndex.update(i => Math.max(i - 1, 0));
  }

  protected submit(): void {
    this.submitted.set(true);
    const value = this.form.getRawValue();
    const days: string[] = value.recurringDaysOfWeek ?? [];
    const recurringDaysOfWeek = value.isRecurring && days.length > 0 ? days.join(',') : undefined;

    if (this.isEdit()) {
      const id = this.editAgenda()!.id;
      const branchId = this.editAgenda()!.branchId;
      const request: UpdateAgendaConfigRequest = {
        startTime: value.startTime,
        endTime: value.endTime,
        slotDurationMinutes: value.slotDurationMinutes,
        patientsPerSlot: value.patientsPerSlot,
        isRecurring: value.isRecurring,
        validFromDate: value.validFromDate,
        validToDate: value.validToDate ?? undefined,
        recurringDaysOfWeek,
      };
      this.store.dispatch(AgendasActions.updateAgenda({ id, branchId, request }));
    } else {
      const request: CreateAgendaConfigRequest = {
        branchId: value.branchId,
        startTime: value.startTime,
        endTime: value.endTime,
        slotDurationMinutes: value.slotDurationMinutes,
        patientsPerSlot: value.patientsPerSlot,
        isRecurring: value.isRecurring,
        validFromDate: value.validFromDate,
        validToDate: value.validToDate ?? undefined,
        recurringDaysOfWeek,
      };
      this.store.dispatch(AgendasActions.createAgenda({ request }));
    }
  }

  private todayISO(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
```

- [ ] **Step 2: Template del wizard**

```html
<p-toast />

<div class="wizard">
  <header class="wizard__header">
    <p-button icon="pi pi-arrow-left" severity="secondary" text routerLink="/turnos/configuracion" />
    <h2>{{ isEdit() ? 'Editar agenda' : 'Nueva agenda' }} · Paso {{ stepIndex() + 1 }} de 4</h2>
  </header>

  <ol class="wizard__steps">
    <li [class.wizard__step--active]="stepIndex() === 0">Sucursal</li>
    <li [class.wizard__step--active]="stepIndex() === 1">Horario</li>
    <li [class.wizard__step--active]="stepIndex() === 2">Vigencia</li>
    <li [class.wizard__step--active]="stepIndex() === 3">Confirmar</li>
  </ol>

  <form [formGroup]="form" class="wizard__body">
    @switch (stepIndex()) {
      @case (0) { <app-step-sucursal [form]="form" /> }
      @case (1) { <app-step-horario [form]="form" /> }
      @case (2) { <app-step-vigencia [form]="form" /> }
      @case (3) { <app-step-confirmar [form]="form" [isEdit]="isEdit()" (editStep)="stepIndex.set($event)" /> }
    }
  </form>

  <footer class="wizard__footer">
    <p-button label="Volver" severity="secondary" (onClick)="back()" [disabled]="stepIndex() === 0" />
    @if (stepIndex() < 3) {
      <p-button label="Continuar" (onClick)="next()" />
    } @else {
      <p-button
        [label]="isEdit() ? 'Guardar cambios' : 'Crear agenda'"
        severity="primary"
        [loading]="pending()"
        (onClick)="submit()"
      />
    }
  </footer>
</div>
```

- [ ] **Step 3: SCSS**

```scss
:host { display: block; padding: 1.5rem; }
.wizard {
  max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;
  &__header { display: flex; align-items: center; gap: .5rem; h2 { margin: 0; font-size: 1.25rem; } }
  &__steps {
    display: flex; gap: 1rem; list-style: none; padding: 0; margin: 0; color: var(--p-text-muted-color);
    li { padding: .25rem .5rem; border-bottom: 2px solid transparent; }
    &__step--active, li.wizard__step--active { color: var(--p-primary-color); border-bottom-color: var(--p-primary-color); }
  }
  &__body { display: block; padding: 1rem 0; }
  &__footer { display: flex; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--p-content-border-color); }
}
```

- [ ] **Step 4: NO commitear todavía** — build seguirá fallando porque los 4 step components aún no existen. Commit al final de Task 16.

---

### Task 13: Step 1 — Sucursal

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/steps/step-sucursal.component.ts`

- [ ] **Step 1: Crear el componente**

```typescript
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-step-sucursal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <label for="branchId">Sucursal</label>
      <p-select
        inputId="branchId"
        [options]="branches"
        optionLabel="name"
        optionValue="id"
        placeholder="Seleccioná una sucursal"
        [formControl]="$any(form.get('branchId'))"
      />
      @if (form.get('branchId')?.touched && form.get('branchId')?.invalid) {
        <small class="step__error">Seleccioná una sucursal para continuar.</small>
      }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .5rem; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepSucursalComponent {
  @Input({ required: true }) form!: FormGroup;
  // TODO Phase: cuando exista store de sucursales reemplazar este array hardcoded
  // Pendiente: cuando exista store de sucursales, inyectar el selector real
  protected branches = [
    { id: 1, name: 'CENTRAL — Sede Principal' },
    { id: 2, name: 'NORTE — Palermo' },
    { id: 3, name: 'SUR — Lomas' },
  ];
}
```

- [ ] **Step 2: NO commitear todavía**, continúa Task 14.

---

### Task 14: Step 2 — Horario y capacidad (con preview)

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/steps/step-horario.component.ts`

- [ ] **Step 1: Crear el componente con preview computado**

```typescript
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { SLOT_DURATION_OPTIONS } from '../../../models/agenda-config.model';

@Component({
  selector: 'app-step-horario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule, SelectModule, InputNumberModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <div class="step__row">
        <label>Inicio
          <input type="time" [formControl]="$any(form.get('startTime'))" />
        </label>
        <label>Fin
          <input type="time" [formControl]="$any(form.get('endTime'))" />
        </label>
      </div>

      <label>Duración del slot
        <p-select [options]="slotOptions" optionLabel="label" optionValue="value"
                  [formControl]="$any(form.get('slotDurationMinutes'))" />
      </label>

      <label>Pacientes por slot
        <p-inputNumber [min]="1" [formControl]="$any(form.get('patientsPerSlot'))" />
      </label>

      <div class="step__preview">
        <strong>{{ previewCapacity() }}</strong> pacientes/día estimados.
      </div>

      @if (timeError()) {
        <small class="step__error">{{ timeError() }}</small>
      }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .75rem; }
            .step__row { display: flex; gap: 1rem; }
            .step__preview { padding: .75rem; background: var(--p-primary-50); border-radius: 6px; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepHorarioComponent {
  @Input({ required: true }) form!: FormGroup;

  protected slotOptions = SLOT_DURATION_OPTIONS.map(v => ({ label: `${v} min`, value: v }));

  protected previewCapacity = computed(() => {
    const v = this.form.value;
    const start = this.parseMinutes(v.startTime);
    const end = this.parseMinutes(v.endTime);
    const slot = v.slotDurationMinutes ?? 0;
    const cap = v.patientsPerSlot ?? 0;
    if (start == null || end == null || slot <= 0 || cap <= 0 || end <= start) return 0;
    return Math.floor((end - start) / slot) * cap;
  });

  protected timeError = computed(() => {
    const v = this.form.value;
    const start = this.parseMinutes(v.startTime);
    const end = this.parseMinutes(v.endTime);
    if (start == null || end == null) return '';
    if (end <= start) return 'La hora de fin debe ser posterior a la de inicio.';
    return '';
  });

  private parseMinutes(hhmm: string | null | undefined): number | null {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
}
```

Nota sobre el `computed` con `form.value`: Angular Forms no es reactivo por defecto en signals. Si el preview no se actualiza al cambiar inputs, agregar un signal interno actualizado con `form.valueChanges.subscribe(...)` en `ngOnInit`. Verificar en smoke manual y ajustar.

- [ ] **Step 2: NO commitear todavía**, continúa Task 15.

---

### Task 15: Step 3 — Vigencia y recurrencia

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/steps/step-vigencia.component.ts`

- [ ] **Step 1: Crear componente**

```typescript
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { WEEK_DAYS } from '../../../models/agenda-config.model';

@Component({
  selector: 'app-step-vigencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule, SelectButtonModule, ToggleSwitchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <label class="step__inline">
        <p-toggleSwitch [formControl]="$any(form.get('isRecurring'))" />
        Recurrente (se repite todos los días seleccionados)
      </label>

      @if (form.get('isRecurring')?.value) {
        <label>Días de la semana
          <p-selectButton
            [options]="dayOptions"
            optionLabel="label"
            optionValue="value"
            [multiple]="true"
            [formControl]="$any(form.get('recurringDaysOfWeek'))"
          />
        </label>
        @if ((form.get('recurringDaysOfWeek')?.value?.length ?? 0) === 0) {
          <small class="step__error">Seleccioná al menos un día.</small>
        }
      }

      <label>Vigente desde
        <input type="date" [formControl]="$any(form.get('validFromDate'))" />
      </label>

      <label>Vigente hasta (opcional)
        <input type="date" [formControl]="$any(form.get('validToDate'))" />
      </label>

      @if (rangeError()) { <small class="step__error">{{ rangeError() }}</small> }
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: .75rem; }
            .step__inline { display: flex; align-items: center; gap: .5rem; }
            .step__error { color: var(--p-red-600); }`],
})
export class StepVigenciaComponent {
  @Input({ required: true }) form!: FormGroup;

  protected dayOptions = WEEK_DAYS.map(d => ({
    label: { MONDAY:'L', TUESDAY:'M', WEDNESDAY:'X', THURSDAY:'J', FRIDAY:'V', SATURDAY:'S', SUNDAY:'D' }[d],
    value: d,
  }));

  protected rangeError(): string {
    const from = this.form.get('validFromDate')?.value;
    const to = this.form.get('validToDate')?.value;
    if (from && to && to < from) return 'La fecha hasta no puede ser anterior a la de desde.';
    return '';
  }
}
```

- [ ] **Step 2: NO commitear todavía**, continúa Task 16.

---

### Task 16: Step 4 — Confirmar + commit del wizard completo

**Files:**
- Create: `src/app/features/turnos/pages/configuracion/steps/step-confirmar.component.ts`

- [ ] **Step 1: Crear componente**

```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-step-confirmar',
  standalone: true,
  imports: [CommonModule, ButtonModule, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step">
      <div class="step__summary">
        <div class="step__card">
          <header><span>Sucursal</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(0)" />
          </header>
          <p>{{ form.get('branchId')?.value ?? '—' }}</p>
        </div>

        <div class="step__card">
          <header><span>Horario y capacidad</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(1)" />
          </header>
          <p>{{ form.get('startTime')?.value }}–{{ form.get('endTime')?.value }} · {{ form.get('slotDurationMinutes')?.value }} min · {{ form.get('patientsPerSlot')?.value }} pacientes/slot</p>
        </div>

        <div class="step__card">
          <header><span>Vigencia</span>
            <p-button icon="pi pi-pencil" severity="secondary" size="small" rounded text (onClick)="editStep.emit(2)" />
          </header>
          <p>{{ vigenciaSummary() }}</p>
        </div>
      </div>

      <div class="step__banner">
        Si los horarios se solapan con otra agenda activa, el backend rechazará el cambio y volverás al paso de vigencia.
      </div>
    </div>
  `,
  styles: [`.step { display: flex; flex-direction: column; gap: 1rem; }
            .step__summary { display: flex; flex-direction: column; gap: .75rem; }
            .step__card { border: 1px solid var(--p-content-border-color); border-radius: 6px; padding: 1rem; }
            .step__card > header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .25rem; color: var(--p-text-muted-color); font-size: .85rem; }
            .step__banner { padding: .75rem; background: var(--p-blue-50); border-radius: 6px; font-size: .9rem; }`],
})
export class StepConfirmarComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() isEdit = false;
  @Output() editStep = new EventEmitter<number>();

  protected vigenciaSummary(): string {
    const days = (this.form.get('recurringDaysOfWeek')?.value as string[]) ?? [];
    const recurring = this.form.get('isRecurring')?.value;
    const from = this.form.get('validFromDate')?.value;
    const to = this.form.get('validToDate')?.value;
    const range = to ? `${from} → ${to}` : `desde ${from}`;
    return recurring && days.length ? `${days.join('/')} · ${range}` : range;
  }
}
```

- [ ] **Step 2: Build completo**

Run: `npm run build`
Expected: BUILD SUCCESS. Si falla por algún import faltante o tipos, corregir antes de seguir.

- [ ] **Step 3: Commit del wizard entero**

```
git add src/app/features/turnos/pages/configuracion/agenda-wizard.page.* src/app/features/turnos/pages/configuracion/steps && git commit -m "feat(turnos): add 4-step agenda wizard (alta + edicion)"
```

---

## Phase 5 — Verificación + smoke manual

### Task 17: Mobile + responsive sweep

**Files:**
- Modify: `configuracion-list.page.html` y `agenda-branch-section.component.html` si los `p-table responsiveLayout='stack'` no se ven bien.

- [ ] **Step 1: Levantar dev server**

```
npm start
```

- [ ] **Step 2: Abrir http://localhost:4200/turnos/configuracion en Chrome DevTools con device toolbar (mobile)**

- [ ] **Step 3: Validar que:**

  - Acordeón se muestra con header expandido por default si ≤3 sucursales.
  - Tabla colapsa a stack layout debajo de 768px.
  - CTAs primary visibles en mobile.
  - Toolbar (select + search) wrap a 2 filas.

Si algo está roto, ajustar el SCSS / template. No commitear sin verificación visual real. Si todo OK, no hay commit (todavía no cambiaste código).

---

### Task 18: Smoke manual end-to-end

Pre-requisitos:
- Backend levantado en `localhost:8080` (rama `feat/turnos-specs` con el endpoint `GET /{id}` o esa rama mergeada a development).
- Frontend levantado en `localhost:4200`.
- Usuario ADMIN seedeado (`admin@test.com` / `password` por memoria).
- Al menos una sucursal en el backend (de lo contrario, crear una desde `/sucursales`).

- [ ] **Step 1: Login + navegar a /turnos/configuracion**
  - Esperado: lista cargando → o estado vacío "Sin agendas configuradas" para la sucursal del seed.

- [ ] **Step 2: Crear una agenda**
  - Click en "Nueva agenda".
  - Paso 1: Sucursal CENTRAL (id=1).
  - Paso 2: 08:00 – 12:00, slot 15min, capacidad 2. Verificar preview ~32 pacientes/día.
  - Paso 3: Recurrente, L M X J V, desde hoy, sin hasta.
  - Paso 4: Confirmar → "Crear agenda".
  - Esperado: toast success + navegación a la lista + nueva fila visible.

- [ ] **Step 3: Editar la agenda creada**
  - Click en lápiz en la fila → wizard precarga datos.
  - Cambiar capacidad a 3 → Continuar → Confirmar.
  - Esperado: toast success + lista refrescada con cap=3.

- [ ] **Step 4: Crear otra agenda solapada → ver el manejo del overlap**
  - Mismo horario que la anterior. Click "Crear agenda".
  - Esperado: toast error rojo + el wizard vuelve al paso 3.

- [ ] **Step 5: Eliminar la agenda original**
  - Click en tacho → ConfirmDialog → Eliminar.
  - Esperado: toast success + fila desaparece de la lista.

- [ ] **Step 6: Deep-link a edición de una agenda inexistente**
  - Manualmente navegar a `/turnos/configuracion/999999/editar`.
  - Esperado: resolver intercepta, navega a `/turnos/configuracion`, sin crashear.

- [ ] **Step 7: Login como SECRETARIA (rol read-only)**
  - Esperado: pantalla principal sin botones "Nueva agenda" / "Agregar agenda" / lápiz / tacho.
  - Intentar navegar manualmente a `/turnos/configuracion/nueva` → guard redirige.

- [ ] **Step 8: Cualquier hallazgo se documenta como issue / fix follow-up**.

---

### Task 19: Typecheck + lint sweep final

- [ ] **Step 1: Typecheck completo**

Run: `npm run build`
Expected: BUILD SUCCESS sin warnings nuevos relacionados a los archivos creados.

- [ ] **Step 2: Vitest run completo del módulo turnos**

Run: `npx vitest run src/app/features/turnos`
Expected: todos los specs nuevos pasan (mapper + reducer + guard).

- [ ] **Step 3: No commit aquí** (verificación, no cambio de código).

---

### Task 20: Decisión de push y PR

**Files:**
- (Sin cambios de código.)

- [ ] **Step 1: Revisar el log del feature**

```
git log --oneline 1e505d1..HEAD
```

Deberían verse ~13 commits (uno por task que commitea + el de simplify si aplica).

- [ ] **Step 2: Discutir con el user**:
  - Push de `feat/turnos-specs` a remote.
  - PR aislada (cubre solo Spec A) vs PR consolidada con Spec B.

Memoria del proyecto (`project_turnos_specs_state.md`) ya marca el push de Spec B como pendiente. Si el push del frontend Spec B no se hizo, este push lo cubre todo.

- [ ] **Step 3: Si se aprueba el push:**

```
git push -u origin feat/turnos-specs
```

- [ ] **Step 4: Actualizar memoria del proyecto** marcando Spec A frontend como IMPLEMENTADO con SHA del HEAD.

---

## Done

Cuando todas las tasks tengan check, la pantalla `/turnos/configuracion` está viva, el wizard funciona alta/edición, y los 3 specs del módulo TURNOS están terminados (A frontend + A backend + B frontend + B backend). Próximo paso (fuera de este plan): Spec C (Reserva por paciente externo, portal) — su brainstorming aún no arrancó.
