# Atender desde Recepción Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cablear el botón "Atender" (cola + drawer) para navegar al wizard de atención (`/analitica/atencion/nueva`) pasando el DNI por query param, evitando que el operador tipee de nuevo un DNI que ya está en el turno o entrada de cola. Reusa el flujo existente de registro inline cuando el paciente no existe.

**Architecture:** Backend agrega `nationalId` al `AppointmentResponse` DTO (sumado al PR #36). Frontend lo mapea hasta el `DrawerAppointmentRow`. La action `callAppointmentForAttention` acepta `dni` y el effect `navigateAfterCall$` redirige a `/analitica/atencion/nueva?dni=X`. Desde la cola se navega directo (ya está en queue, no se crea uno nuevo). El `DatosGeneralesStepComponent` lee el query param con prioridad sobre el sessionStorage existente, preservando el flujo `/pacientes/nuevo` → vuelta al wizard.

**Tech Stack:** Angular 21 + standalone + signals + NgRx clásico + PrimeNG + Vitest. Backend Spring Boot Java 21.

**Spec:** `docs/superpowers/specs/2026-06-03-atender-desde-recepcion-design.md`
**Jira:** [KAN-73](https://exequielsantoro.atlassian.net/browse/KAN-73) (extiende scope con item 4)
**Branch frontend:** `feat/KAN-73-recepcion-branch-context` (misma del sub-proyecto A)
**Branch backend:** `feat/KAN-73-queue-entry-appointment-id-dto` (suma al PR #36 ya abierto)

---

## Task 0: Pre-flight check

**Files:** ninguno.

- [ ] **Step 1: Verificar branches**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO branch --show-current`
Expected: `feat/KAN-73-recepcion-branch-context`

Run: `git -C C:/Users/Mateo/Desktop/tesis/Backend branch -a | head -5`
Expected: ver `feat/KAN-73-queue-entry-appointment-id-dto` listado.

- [ ] **Step 2: Baseline test frontend**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/turnos/**/*.spec.ts'`
Expected: pasan los ~73 tests (baseline después de sub-proyecto A).

---

## Task 1: Backend — agregar `nationalId` al `AppointmentResponse` DTO

Sumar el campo al record + factory. Igual patrón que el commit `33794f9` (appointmentId) y `261f3a3` (createdAt) de la misma branch.

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/AppointmentResponse.java`

- [ ] **Step 1: Checkout branch backend**

Run: `git -C C:/Users/Mateo/Desktop/tesis/Backend checkout feat/KAN-73-queue-entry-appointment-id-dto`
Expected: switched to `feat/KAN-73-queue-entry-appointment-id-dto`.

- [ ] **Step 2: Modificar el record + factory**

Sobreescribir `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/AppointmentResponse.java` con:

```java
package lab.laboratorio.modules.turnos.presentation.dto;

import lab.laboratorio.modules.analitica.domain.model.Patient;
import lab.laboratorio.modules.turnos.domain.model.Appointment;
import lab.laboratorio.modules.turnos.domain.model.AppointmentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AppointmentResponse(
        Long id,
        Long patientId,
        String patientFirstName,
        String patientLastName,
        String nationalId,
        Long branchId,
        LocalDateTime scheduledAt,
        String confirmationNumber,
        AppointmentStatus status,
        String comments,
        String prescriptionFileUrl,
        List<DeterminationResponse> determinations
) {
    public record DeterminationResponse(Long determinationId, int orderNumber) {}

    public static AppointmentResponse from(Appointment a) {
        return from(a, null);
    }

    public static AppointmentResponse from(Appointment a, Patient p) {
        List<DeterminationResponse> dets = a.getDeterminations() == null ? List.of() :
                a.getDeterminations().stream()
                        .map(d -> new DeterminationResponse(d.determinationId(), d.orderNumber()))
                        .toList();
        return new AppointmentResponse(
                a.getId(),
                a.getPatientId(),
                p != null ? p.getFirstName() : null,
                p != null ? p.getLastName() : null,
                p != null ? p.getDni() : null,
                a.getBranchId(),
                a.getScheduledAt(),
                a.getConfirmationNumber(),
                a.getStatus(),
                a.getComments(),
                a.getPrescriptionFileUrl(),
                dets);
    }
}
```

- [ ] **Step 3: Verificar que el dominio Patient expone `getDni()`**

Run: `grep -n "getDni\|String dni" C:/Users/Mateo/Desktop/tesis/Backend/src/main/java/lab/laboratorio/modules/analitica/domain/model/Patient.java | head -5`
Expected: ver `getDni()` o el field `dni`. Si el método es distinto (ej. `getNationalId()` o `getDocumentNumber()`), ajustar la línea `p.getDni()` arriba. Reportar como BLOCKED si el campo no existe.

- [ ] **Step 4: Compilar**

Run: `cd C:/Users/Mateo/Desktop/tesis/Backend && ./mvnw.cmd -q -B compile`
Expected: succeed (warnings de Lombok son inocuos).

- [ ] **Step 5: Commit + push**

```bash
git -C C:/Users/Mateo/Desktop/tesis/Backend add src/main/java/lab/laboratorio/modules/turnos/presentation/dto/AppointmentResponse.java
git -C C:/Users/Mateo/Desktop/tesis/Backend commit -m "feat(turnos): expose nationalId en AppointmentResponse DTO (KAN-73)

El frontend lo necesita en cada fila del drawer de Recepcion para
poder pre-fillear el DNI al navegar a /analitica/atencion/nueva cuando
el operador clickea Atender. Patron igual a appointmentId y createdAt
en el mismo PR #36.

Refs KAN-73."
git -C C:/Users/Mateo/Desktop/tesis/Backend push
```

Expected: push exitoso, PR #36 actualizado automáticamente.

- [ ] **Step 6: Volver a la branch frontend**

Run: `git -C C:/Users/Mateo/Desktop/tesis/Backend checkout fix/KAN-72-dev-unblock` (o donde estaba antes; usar `git checkout -` si querés)
Expected: switched.

---

## Task 2: Frontend — `Appointment` model + service mapean `nationalId`

**Files:**
- Modify: `src/app/features/turnos/models/appointment.model.ts`
- Modify: `src/app/features/turnos/services/appointment.service.ts`

- [ ] **Step 1: Modificar el modelo**

Sobreescribir `src/app/features/turnos/models/appointment.model.ts`:

```typescript
export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  nationalId: string | null;       // DNI del paciente (backend lo expone en AppointmentResponse)
  appointmentTime: string;         // ISO
  branchId: number;
  status: string;
}
```

- [ ] **Step 2: Modificar el service para mapear el campo**

Modificar `src/app/features/turnos/services/appointment.service.ts`. Reemplazar el contenido completo con:

```typescript
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Appointment } from '../models/appointment.model';

// Shape real del backend (AppointmentResponse): patientId pero NO patientName,
// scheduledAt en vez de appointmentTime, nationalId (KAN-73 PR #36).
interface BackendAppointment {
  id: number;
  patientId: number;
  branchId: number;
  scheduledAt: string;
  confirmationNumber: string;
  status: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  nationalId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/appointments';

  listToday(branchId: number): Observable<Appointment[]> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const params = new HttpParams()
      .set('branchId', String(branchId))
      .set('date', today);
    return this.http.get<BackendAppointment[]>(this.base, { params }).pipe(
      map(rows => rows.map(r => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientFirstName && r.patientLastName
          ? `${r.patientFirstName} ${r.patientLastName}`
          : `Turno ${r.confirmationNumber}`,
        nationalId: r.nationalId ?? null,
        appointmentTime: r.scheduledAt,
        branchId: r.branchId,
        status: r.status,
      } satisfies Appointment))),
    );
  }
}
```

- [ ] **Step 3: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: OK. Si rompe en algún consumidor de `Appointment` que use destructuring estricto, ajustar y reportar.

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/models/appointment.model.ts src/app/features/turnos/services/appointment.service.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): mapear nationalId en Appointment model + service (KAN-73)

El backend (PR #36) expone nationalId en AppointmentResponse. El frontend
lo mapea hasta el modelo de dominio para usarlo aguas abajo en el drawer
de Recepcion y poder navegar a /analitica/atencion/nueva con el DNI
prellenado.

Refs KAN-73."
```

---

## Task 3: Frontend — `DrawerAppointmentRow` incluye `dni`

Agregar `dni` al proyectado del drawer + actualizar tests.

**Files:**
- Modify: `src/app/features/turnos/store/appointments/appointments.derived.selectors.ts`
- Modify: `src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts`

- [ ] **Step 1: Modificar el spec primero (TDD)**

Sobreescribir `src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts`:

```typescript
import { selectScheduledAppointmentsForDrawer } from './appointments.derived.selectors';
import { Appointment } from '../../models/appointment.model';
import { QueueEntry } from '../../models/queue-entry.model';
import { QueueStatus } from '../../models/queue-status.enum';

function apt(over: Partial<Appointment>): Appointment {
  return {
    id: 0,
    patientId: 1,
    patientName: 'X',
    nationalId: null,
    appointmentTime: '2026-06-02T09:00:00Z',
    branchId: 1,
    status: 'SCHEDULED',
    ...over,
  };
}

function queueEntry(appointmentId: number | null): QueueEntry {
  return {
    id: 999,
    publicCode: 'CT-0001',
    nationalId: '',
    patientId: null,
    branchId: 1,
    appointmentId,
    hasAppointment: appointmentId != null,
    status: QueueStatus.PENDING,
    lastCalledAt: null,
    callCount: 0,
    createdAt: '2026-06-02T09:00:00Z',
  };
}

describe('selectScheduledAppointmentsForDrawer', () => {
  it('marca como Cancelado los appointments con status CANCELLED', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, status: 'CANCELLED', patientName: 'Juan', nationalId: '12345678', appointmentTime: '2026-06-02T09:00:00Z' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result).toEqual([
      { id: 1, hora: '09:00', paciente: 'Juan', dni: '12345678', estado: 'Cancelado' },
    ]);
  });

  it('marca como Llego los appointments con QueueEntry en la cola actual', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 5, patientName: 'Ana', nationalId: '30111222', appointmentTime: '2026-06-02T10:30:00Z' })],
      { entries: [queueEntry(5)], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Llego');
    expect(result[0].dni).toBe('30111222');
  });

  it('marca como Pendiente el resto y propaga dni null cuando falta', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 2, patientName: 'Pepe', nationalId: null, appointmentTime: '2026-06-02T11:00:00Z' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Pendiente');
    expect(result[0].dni).toBeNull();
  });

  it('ordena por hora ascendente y pone los cancelados al final', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [
        apt({ id: 1, appointmentTime: '2026-06-02T11:00:00Z', patientName: 'A' }),
        apt({ id: 2, status: 'CANCELLED', appointmentTime: '2026-06-02T09:00:00Z', patientName: 'B' }),
        apt({ id: 3, appointmentTime: '2026-06-02T10:00:00Z', patientName: 'C' }),
      ],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result.map(r => r.id)).toEqual([3, 1, 2]);
  });

  it('extrae hora HH:MM del ISO timestamp', () => {
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 1, appointmentTime: '2026-06-02T14:25:00Z', patientName: 'X' })],
      { entries: [], loading: false, callingId: null, error: null },
    );
    expect(result[0].hora).toBe('14:25');
  });

  it('tolera entries sin appointmentId (defensivo)', () => {
    const noAptIdEntry = { ...queueEntry(null), appointmentId: undefined as any };
    const result = selectScheduledAppointmentsForDrawer.projector(
      [apt({ id: 5, patientName: 'Ana', appointmentTime: '2026-06-02T10:30:00Z' })],
      { entries: [noAptIdEntry], loading: false, callingId: null, error: null },
    );
    expect(result[0].estado).toBe('Pendiente');
  });
});
```

- [ ] **Step 2: Correr tests y verificar que fallan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/appointments.derived.selectors.spec.ts'`
Expected: FAIL — `dni` no existe en `DrawerAppointmentRow`.

- [ ] **Step 3: Modificar el selector**

Sobreescribir `src/app/features/turnos/store/appointments/appointments.derived.selectors.ts`:

```typescript
import { createSelector } from '@ngrx/store';
import { selectTodayAppointments } from './appointments.selectors';
import { selectQueueState } from '../queue/queue.selectors';
import { Appointment } from '../../models/appointment.model';

export type DrawerEstado = 'Pendiente' | 'Llego' | 'Cancelado';

export interface DrawerAppointmentRow {
  id: number;
  hora: string;       // HH:MM
  paciente: string;
  dni: string | null;
  estado: DrawerEstado;
}

/**
 * Proyecta los appointments del dia con el estado UI derivado del cruce
 * con la cola actual. Reglas:
 *   - status=CANCELLED -> 'Cancelado'
 *   - existe QueueEntry con appointmentId == apt.id -> 'Llego'
 *   - resto -> 'Pendiente'
 *
 * Orden: hora asc, con cancelados al final (independiente de la hora).
 *
 * `dni` se pasa desde el backend para que el boton Atender pueda navegar
 * directo a /analitica/atencion/nueva?dni=X sin lookup extra (KAN-73 B).
 */
export const selectScheduledAppointmentsForDrawer = createSelector(
  selectTodayAppointments,
  selectQueueState,
  (appointments: Appointment[], queueState): DrawerAppointmentRow[] => {
    const arrivedIds = new Set(
      queueState.entries
        .map(e => e.appointmentId)
        .filter((id): id is number => typeof id === 'number'),
    );

    const rows: DrawerAppointmentRow[] = appointments.map(a => ({
      id: a.id,
      hora: a.appointmentTime.slice(11, 16),  // HH:MM del ISO 2026-06-02T09:00:00Z
      paciente: a.patientName,
      dni: a.nationalId ?? null,
      estado: deriveEstado(a, arrivedIds),
    }));

    return rows.sort((a, b) => {
      if (a.estado === 'Cancelado' && b.estado !== 'Cancelado') return 1;
      if (a.estado !== 'Cancelado' && b.estado === 'Cancelado') return -1;
      return a.hora.localeCompare(b.hora);
    });
  },
);

function deriveEstado(a: Appointment, arrivedIds: Set<number>): DrawerEstado {
  if (a.status === 'CANCELLED') return 'Cancelado';
  if (arrivedIds.has(a.id)) return 'Llego';
  return 'Pendiente';
}
```

- [ ] **Step 4: Correr tests y verificar que pasan**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/appointments.derived.selectors.spec.ts'`
Expected: PASS — 6 tests verdes.

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/appointments/appointments.derived.selectors.ts src/app/features/turnos/store/appointments/appointments.derived.selectors.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): DrawerAppointmentRow expone dni desde appointment (KAN-73)

Suma el dni (nationalId del paciente) a cada row del drawer. Necesario
para que el boton Atender pueda navegar al wizard con el DNI prellenado
sin hacer lookup extra. Backend lo provee desde PR #36.

Tests actualizados con assertions sobre el dni.

Refs KAN-73."
```

---

## Task 4: Frontend — `callAppointmentForAttention` action acepta `dni`

**Files:**
- Modify: `src/app/features/turnos/store/queue/queue.actions.ts`

- [ ] **Step 1: Modificar actions**

Reemplazar las 3 actions de `callAppointmentForAttention*` en `src/app/features/turnos/store/queue/queue.actions.ts`. Buscar:

```typescript
export const callAppointmentForAttention = createAction(
  '[Queue] Call Appointment For Attention',
  props<{ appointmentId: number }>()
);
export const callAppointmentForAttentionSuccess = createAction(
  '[Queue] Call Appointment For Attention Success',
  props<{ appointmentId: number }>()
);
export const callAppointmentForAttentionFailure = createAction(
  '[Queue] Call Appointment For Attention Failure',
  props<{ error: unknown }>()
);
```

Reemplazar por:

```typescript
export const callAppointmentForAttention = createAction(
  '[Queue] Call Appointment For Attention',
  props<{ appointmentId: number; dni: string | null }>()
);
export const callAppointmentForAttentionSuccess = createAction(
  '[Queue] Call Appointment For Attention Success',
  props<{ appointmentId: number; dni: string | null }>()
);
export const callAppointmentForAttentionFailure = createAction(
  '[Queue] Call Appointment For Attention Failure',
  props<{ error: unknown }>()
);
```

- [ ] **Step 2: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: FAIL — los consumidores actuales (`scheduled-appointments-drawer.component.ts`) dispatchan sin `dni`. Eso se arregla en Task 6.

Esperado de TS: `Property 'dni' is missing in type '{ appointmentId: number; }'`.

- [ ] **Step 3: Commit (sin build verde — Task 6 lo termina)**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/queue/queue.actions.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "refactor(turnos): callAppointmentForAttention acepta dni (KAN-73)

dni pasa a ser required en el payload de la action (puede ser null si
el appointment no tiene paciente con DNI cargado). El effect lo usa
para navegar a /analitica/atencion/nueva?dni=X.

Build queda roja temporal: Tasks 5 y 6 actualizan callers.

Refs KAN-73."
```

---

## Task 5: Frontend — `navigateAfterCall$` navega a `/analitica/atencion/nueva?dni=X`

**Files:**
- Modify: `src/app/features/turnos/store/queue/queue.effects.ts`
- Modify: `src/app/features/turnos/store/queue/queue.effects.spec.ts`

- [ ] **Step 1: Modificar el effect**

En `src/app/features/turnos/store/queue/queue.effects.ts`, buscar el effect `callAppointmentForAttention$`:

```typescript
  callAppointmentForAttention$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttention),
    switchMap(({ appointmentId }) =>
      this.service.callByAppointment(appointmentId).pipe(
        map(() => A.callAppointmentForAttentionSuccess({ appointmentId })),
        catchError(error => of(A.callAppointmentForAttentionFailure({ error }))),
      )
    ),
  ));
```

Reemplazar por:

```typescript
  callAppointmentForAttention$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttention),
    switchMap(({ appointmentId, dni }) =>
      this.service.callByAppointment(appointmentId).pipe(
        map(() => A.callAppointmentForAttentionSuccess({ appointmentId, dni })),
        catchError(error => of(A.callAppointmentForAttentionFailure({ error }))),
      )
    ),
  ));
```

Y el `navigateAfterCall$`:

```typescript
  navigateAfterCall$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionSuccess),
    tap(({ appointmentId }) =>
      this.router.navigate(['/turnos/atencion-turno'], { queryParams: { appointmentId } })
    ),
  ), { dispatch: false });
```

Reemplazar por:

```typescript
  navigateAfterCall$ = createEffect(() => this.actions$.pipe(
    ofType(A.callAppointmentForAttentionSuccess),
    tap(({ dni }) => {
      const queryParams = dni ? { dni } : {};
      this.router.navigate(['/analitica/atencion/nueva'], { queryParams });
    }),
  ), { dispatch: false });
```

- [ ] **Step 2: Actualizar tests existentes**

Modificar `src/app/features/turnos/store/queue/queue.effects.spec.ts`. Buscar los tests del describe `'QueueEffects — callAppointmentForAttention'`. Reemplazar los 3 tests existentes por estos (mantener el `beforeEach` y los providers):

```typescript
  it('on success: dispatches callAppointmentForAttentionSuccess con dni', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(of({ queueEntryId: 50 }));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action).toEqual(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678' }));
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navigates to /analitica/atencion/nueva con dni en queryParams', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: { dni: '12345678' } }
        );
        resolve();
      });
    });
  });

  it('navigateAfterCall$: navega sin dni en queryParams si dni es null', () => {
    return new Promise<void>((resolve) => {
      actions$ = of(callAppointmentForAttentionSuccess({ appointmentId: 100, dni: null }));

      TestBed.inject(QueueEffects).navigateAfterCall$.subscribe(() => {
        expect(router.navigate).toHaveBeenCalledWith(
          ['/analitica/atencion/nueva'],
          { queryParams: {} }
        );
        resolve();
      });
    });
  });

  it('on failure: dispatches callAppointmentForAttentionFailure and does not navigate', () => {
    return new Promise<void>((resolve) => {
      queueService.callByAppointment.mockReturnValue(throwError(() => new Error('500')));
      actions$ = of(callAppointmentForAttention({ appointmentId: 100, dni: '12345678' }));

      TestBed.inject(QueueEffects).callAppointmentForAttention$.subscribe((action) => {
        expect(action.type).toBe(callAppointmentForAttentionFailure.type);
        expect(router.navigate).not.toHaveBeenCalled();
        resolve();
      });
    });
  });
```

- [ ] **Step 3: Correr tests**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/queue.effects.spec.ts'`
Expected: 7 tests verdes (3 del describe `load$` + 4 del describe `callAppointmentForAttention`).

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/store/queue/queue.effects.ts src/app/features/turnos/store/queue/queue.effects.spec.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): navigateAfterCall a /analitica/atencion/nueva con dni (KAN-73)

El effect ahora navega al wizard de atencion (modulo analitica) con el
DNI como queryParam, en lugar de /turnos/atencion-turno (pantalla vacia).
El wizard lo lee y pre-fillea el input del DatosGeneralesStep.

Si el dni es null (paciente sin DNI cargado, edge case), navega sin
queryParam y el input queda vacio para que el operador tipee manual.

Tests actualizados: 3 escenarios de navigate (success con dni, success
sin dni, failure no navega).

Refs KAN-73."
```

---

## Task 6: Frontend — drawer `onAtender` pasa `dni`

**Files:**
- Modify: `src/app/features/turnos/components/scheduled-appointments-drawer.component.ts`

- [ ] **Step 1: Cambiar el handler para aceptar dni**

En `src/app/features/turnos/components/scheduled-appointments-drawer.component.ts`, buscar:

```typescript
  protected onAtender(appointmentId: number): void {
    this.store.dispatch(callAppointmentForAttention({ appointmentId }));
  }
```

Reemplazar por:

```typescript
  protected onAtender(appointmentId: number, dni: string | null): void {
    this.store.dispatch(callAppointmentForAttention({ appointmentId, dni }));
  }
```

- [ ] **Step 2: Actualizar el template para pasar el dni**

En el mismo archivo, buscar en el template:

```html
                <button
                  type="button"
                  class="row-atender-btn"
                  title="Atender"
                  (click)="onAtender(row.id)"
                  [attr.aria-label]="'Atender turno ' + row.id">
                  <i class="pi pi-arrow-right"></i>
                </button>
```

Reemplazar por:

```html
                <button
                  type="button"
                  class="row-atender-btn"
                  title="Atender"
                  (click)="onAtender(row.id, row.dni)"
                  [attr.aria-label]="'Atender turno ' + row.id">
                  <i class="pi pi-arrow-right"></i>
                </button>
```

- [ ] **Step 3: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: OK ahora (Task 4 + 5 + 6 resuelven el tipo de la action).

- [ ] **Step 4: Smoke test del drawer**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/scheduled-appointments-drawer.component.spec.ts'`
Expected: 3 tests verdes (los tests existentes siguen funcionando porque solo testean dispatch, no asertan el shape exacto del payload — verificar).

Si algún test asserta el payload exacto sin `dni`, ajustar la assertion para incluir `dni: null` (el mock state no tiene appointments cargados, así que no se dispara onAtender en los tests actuales).

- [ ] **Step 5: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/components/scheduled-appointments-drawer.component.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): drawer onAtender pasa dni al dispatch (KAN-73)

El boton Atender de cada fila del drawer ahora pasa row.dni al
dispatch de callAppointmentForAttention. El effect lo usa para navegar
a /analitica/atencion/nueva?dni=X.

Refs KAN-73."
```

---

## Task 7: Frontend — botón Atender de la cola navega directo al wizard

Desde la cola NO disparamos `callAppointmentForAttention` (ya está en queue, no hay que crear otro entry). Navegamos directo a `/analitica/atencion/nueva?dni=X`.

**Files:**
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`

- [ ] **Step 1: Cambiar `onNuevaAtencion`**

En `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`, buscar:

```typescript
  protected onNuevaAtencion(id: number): void {
    this.router.navigate(['/turnos/atencion-turno', id]);
  }
```

Reemplazar por:

```typescript
  protected onNuevaAtencion(id: number): void {
    // Buscar el entry para extraer el dni (nationalId).
    const entry = this.entries().find(e => e.id === id);
    const dni = entry?.nationalId ?? null;
    const queryParams = dni ? { dni } : {};
    this.router.navigate(['/analitica/atencion/nueva'], { queryParams });
  }
```

- [ ] **Step 2: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: OK.

- [ ] **Step 3: Smoke test del componente**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/recepcion-con-totem.component.spec.ts'`
Expected: 2 tests verdes (no testean este handler).

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(turnos): boton Atender de la cola navega a /analitica/atencion/nueva con dni (KAN-73)

Cuando el operador clickea Atender en una fila de la cola, navegamos
directo al wizard con el DNI prellenado. NO dispatchamos
callAppointmentForAttention porque la entrada ya esta en queue (lo
duplicaria). El boton 'Llamar por pantalla' (separado) sigue manejando
el llamado.

Refs KAN-73."
```

---

## Task 8: Frontend — `DatosGeneralesStepComponent` lee `dni` del queryParam

**Files:**
- Modify: `src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts`

- [ ] **Step 1: Modificar `initialDni`**

En `src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts`, agregar al inicio el import:

```typescript
import { ActivatedRoute } from '@angular/router';
```

Y en la clase, agregar el inject (después de `private readonly router`):

```typescript
  private readonly route  = inject(ActivatedRoute);
```

Reemplazar `initialDni()`:

```typescript
  initialDni(): string | null {
    const pending = readPendingDni();
    if (pending) clearPendingDni();
    return pending;
  }
```

Por:

```typescript
  /**
   * Prioridad:
   *   1) queryParam `dni` del URL (botón Atender en Recepción → KAN-73).
   *   2) sessionStorage `readPendingDni()` (flujo `/pacientes/nuevo` →
   *      vuelta al wizard preservando el DNI tipeado).
   *
   * clearPendingDni solo si vino de sessionStorage — el queryParam no
   * se limpia para que un reload de la pantalla mantenga el DNI.
   */
  initialDni(): string | null {
    const fromQuery = this.route.snapshot.queryParamMap.get('dni');
    if (fromQuery) return fromQuery;
    const pending = readPendingDni();
    if (pending) clearPendingDni();
    return pending;
  }
```

- [ ] **Step 2: Build check**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: OK.

- [ ] **Step 3: Smoke test del step (si existe)**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false --include='**/datos-generales-step.component.spec.ts'`
Expected: si existe el spec, debe pasar (TestBed sin route → snapshot.queryParamMap es vacío, mismo comportamiento que antes). Si rompe por falta del `ActivatedRoute` mock, agregar al `providers` del TestBed: `provideRouter([])`.

Si no existe el spec, está OK (smoke manual lo cubre en Task 9).

- [ ] **Step 4: Commit**

```bash
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO add src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts
git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO commit -m "feat(analitica): DatosGeneralesStep lee dni del queryParam con prioridad (KAN-73)

Prioridad de fuentes:
  1. queryParam ?dni=X (boton Atender desde Recepcion).
  2. sessionStorage readPendingDni() (flujo /pacientes/nuevo → wizard).

clearPendingDni solo cuando viene del sessionStorage — el queryParam
no se limpia (reload preserva el DNI). El PatientSearchComponent
auto-search ya esta implementado, asi que al recibir initialDni
busca el paciente automaticamente.

Refs KAN-73."
```

---

## Task 9: Smoke final + verificación

**Files:** ninguno.

- [ ] **Step 1: Suite completa**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng test --watch=false`
Expected: todos los tests pasan (debería ser ~575+).

- [ ] **Step 2: Build prod**

Run: `cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO && npx ng build`
Expected: OK.

- [ ] **Step 3: Verificar log de commits**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO log --oneline development..HEAD | head -30`
Expected: lista de todos los commits de KAN-73 (sub-proyecto A + sub-proyecto B).

- [ ] **Step 4: Smoke manual end-to-end**

a) **Pre-condición** — Backend con PR #36 mergeado en development (o re-arrancado con la branch del DTO). Si todavía no mergea, el campo `nationalId` viene null y la columna DNI del drawer / queryParam vendrá vacía (defensive null handling cubre).

b) **Drawer → Atender → wizard con DNI**:
   - Loguear como `secretaria@lab-demo.test`.
   - Ir a `/turnos/recepcion`.
   - Abrir drawer "Turnos del día".
   - Click en `→` de una fila no cancelada con DNI.
   - Verificar: URL pasa a `/analitica/atencion/nueva?dni=<DNI>`.
   - El input "Buscar paciente por DNI" muestra el DNI y auto-busca.
   - Si encuentra paciente, se muestra debajo. Si no, redirige a `/pacientes/nuevo`.

c) **Cola → Atender → wizard con DNI**:
   - En la misma pantalla, click en `→ Atender` de una fila CT (con turno).
   - Verificar: URL pasa a `/analitica/atencion/nueva?dni=<DNI>`.
   - Mismo comportamiento que (b).

d) **Cola ST → Atender → wizard con DNI**:
   - Click en `→ Atender` de una fila ST (sin turno).
   - El nationalId viene del tipeado en tótem.
   - Verificar mismo flujo.

e) **DNI no existe → registro inline**:
   - Modificar manualmente la URL a `/analitica/atencion/nueva?dni=99999999` (DNI inexistente).
   - El auto-search no encuentra paciente.
   - Tipear el DNI manualmente en el input + click "Buscar" → `notFound` → redirige a `/pacientes/nuevo?dni=99999999&returnTo=/analitica/atencion/nueva`.

- [ ] **Step 5: Push branch**

Run: `git -C C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO push`
Expected: actualiza la branch en origin (ya pusheada antes; este push agrega los nuevos commits).

---

## Self-review (post-write)

**Spec coverage:**
- ✅ Backend `nationalId` en `AppointmentResponse` → Task 1.
- ✅ Frontend `Appointment` + service mapean → Task 2.
- ✅ `DrawerAppointmentRow` incluye `dni` → Task 3.
- ✅ Action acepta `dni` → Task 4.
- ✅ `navigateAfterCall$` a `/analitica/atencion/nueva` → Task 5.
- ✅ Drawer `onAtender` pasa dni → Task 6.
- ✅ Cola navega directo con dni → Task 7.
- ✅ Wizard lee queryParam con prioridad → Task 8.
- ✅ Smoke manual end-to-end → Task 9.

**Placeholders:** ningún TBD. La Task 1 Step 3 verifica que `getDni()` existe — si no, escalar. Task 6 Step 4 anticipa que algún test pueda romper y dice cómo ajustar (no es placeholder, es contingencia).

**Type consistency:**
- `dni: string | null` consistente en `Appointment`, `DrawerAppointmentRow`, action payload, effect handler, route queryParam.
- `nationalId` (backend) → `nationalId` (Appointment model) → `dni` (DrawerAppointmentRow + action). Cambio de nombre intencional en la frontera "modelo de dominio" → "modelo de UI", documentado en el comentario del selector.

**Dependencias entre tasks:**
- Task 1 (backend) — independiente.
- Task 2 depende de Task 1 mergeado/disponible para el field nuevo (pero compila sin él gracias al `?:` opcional).
- Task 3 depende de Task 2 (modelo expone `nationalId`).
- Task 4 — independiente.
- Task 5 depende de Task 4.
- Task 6 depende de Task 3 + Task 4 (row.dni + action acepta dni).
- Task 7 depende de Task 4 (refs al modelo `entries[].nationalId` solo).
- Task 8 — independiente.
- Task 9 — depende de todas.

Orden propuesto (1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9) respeta dependencias.

**Coordinación backend:** Task 1 push a `feat/KAN-73-queue-entry-appointment-id-dto` que suma al PR #36 ya abierto. Si esa PR ya mergeo entre tanto, hay que rebasear. El frontend funciona con o sin el field (null defensivo).

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-06-03-atender-desde-recepcion.md`. Dos opciones de ejecución:

**1. Subagent-Driven (recomendado)** — Dispatch un subagent fresco por task, review entre tasks, iteración rápida.

**2. Inline Execution** — Ejecutar tasks en esta sesión con executing-plans, batch con checkpoints.

¿Cuál preferís?
