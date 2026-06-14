# Pantalla "Validar / Ver + Firmar" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-06-14-validar-ver-firma-design.md`

**Goal:** Reconstruir el detalle de un protocolo (`/analitica/validacion/:protocolId`) como pantalla real cableada al backend: cargar el detalle en una sola llamada (sin fan-out), validar determinaciones, y firmar resultado/estudio contra los endpoints de firma ya existentes; dejar el seed local en estado firmable.

**Architecture:** Backend (`Backend`, módulo `analitica/postanalitica`): (1) endpoint de detalle enriquecido vía proyección JPQL `StudyDetailRow` (join results+determinations+determination_catalog+determination_validations) → arma valor/unidad/rango/outcomes por determinación; (2) la firma deriva `signerRegistration` del empleado del token (matrícula automática) y relaja el `@NotBlank`; (3) seed que alinea un empleado firmable con el `userId` del login de prueba y le carga una `signature` Base64. Frontend (`FRONTEND-LABORATORIO`): reescribir `validar-protocolo.page` con store NgRx clásico (load/validate/sign), UX accordion del mock con datos reales, firma como confirm; eliminar la pantalla duplicada del Arco 4 y el mock.

**Tech Stack:** Java 21 / Spring Boot / Hibernate / JPA hexagonal, records DTO, Flyway. Angular standalone + NgRx clásico, Vitest+TestBed.

**Worktrees (crear en ejecución):**
- Front: ya existe `FRONTEND-LABORATORIO-validar-firma` (rama `feat/validacion-detalle-firma`, este plan/spec viven ahí).
- Back: crear `Backend-validar-firma` (rama `feat/validacion-detalle-firma-be`) desde `origin/development`.

**Comandos test:** Back `./mvnw.cmd test -Dtest=<Clase>` · Front `npm test` (NO `npx vitest run`).

---

## FASE A — BACKEND (`analitica/postanalitica`)

Base pkg: `lab.laboratorio.modules.analitica.postanalitica`.

### Task A0: Verificación previa (sin código de producción)

- [ ] **Step 1: ¿Qué contiene el claim `userId` del JWT, y a qué empleado mapea el firmante?**

El flujo de firma hace `employeeId = jwt.getClaim("userId")` y luego `getEmployeeByIdUseCase.execute(tenantId, employeeId)` (busca `employees.id == employeeId`). Necesitamos un login de prueba cuyo `userId` (claim) sea el `id` de un empleado **firmable** (rol BIOQUIMICO/ADMINISTRADOR) **con** `signature`.

Verificar:
- Cómo se genera el token: buscar dónde se setea el claim `userId` (grep `"userId"` en el módulo auth/security) y confirmar si vale `user.id` o `employee.id`.
- `admin@test.com` = user 10001 (ADMINISTRADOR), **sin** empleado. Si el claim = user.id, entonces firmar como admin requiere un `employees.id == 10001`.

Run: `grep -rn "\"userId\"\|claim(\"userId\")\|putClaim\|claims.put" Backend/src/main/java | grep -i userid`
Expected: identificar el valor del claim. **Anotar el id exacto que debe tener el empleado seedeado** (Task A3).

- [ ] **Step 2: Confirmar próxima versión Flyway local y datos firmables del seed**

Run: `ls Backend/src/main/resources/db/migration-local/ | sort | tail -5`
Expected: la más alta es `V960` → la nueva seed es **V961**. Confirmar (de V959) que existe un estudio en `READY_FOR_SIGNATURE` (protocolo 50015) y un resultado en `VALIDATED` (56011) para probar firma de estudio y de resultado.

- [ ] **Step 3: Crear worktree backend**

Run:
```
git -C Backend fetch origin -q
git -C Backend worktree add -b feat/validacion-detalle-firma-be ../Backend-validar-firma origin/development
```
Expected: worktree en `origin/development`. Todo el trabajo de Fase A ocurre ahí.

---

### Task A1: Endpoint de detalle enriquecido (proyección, sin fan-out)

**Files (en `Backend-validar-firma`):**
- Create: `domain/model/StudyDetailRow.java`
- Modify: `infrastructure/persistence/repository/PostAnalyticalResultJpaRepository.java`
- Modify: `domain/port/in/PostAnalyticalResultRepositoryPort.java`
- Modify: `infrastructure/persistence/adapter/PostAnalyticalResultRepositoryAdapter.java`
- Create: `application/usecase/GetStudyDetailUseCase.java`
- Create: `presentation/dto/response/StudyDetailResponse.java`
- Modify: `presentation/controller/ResultValidationController.java`
- Test: `src/test/.../postanalitica/presentation/ResultValidationControllerIT.java` (o el IT existente del módulo)

- [ ] **Step 1: Read-model `StudyDetailRow`**

```java
package lab.laboratorio.modules.analitica.postanalitica.domain.model;

/** Fila plana de la proyección del detalle (una por determinación de un resultado). */
public record StudyDetailRow(
        Long resultId,
        PostAnalyticalResultStatus resultStatus,
        Long sectionId,
        Long determinationId,
        String name,
        String value,
        String unit,
        String referenceRange,
        ValidationOutcome aggregateOutcome,
        ValidationOutcome manualOutcome
) {}
```

- [ ] **Step 2: `@Query` de proyección en el JPA repo**

Agregar a `PostAnalyticalResultJpaRepository` (LEFT JOIN a la validación porque puede no existir; join cruzando módulos resultados, válido en el mismo persistence unit):

```java
@Query("""
        SELECT new lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyDetailRow(
            r.id, r.status, r.sectionId,
            d.id, c.name, d.resultValue, c.unit, c.referenceValues,
            v.aggregateOutcome, v.manualOutcome
        )
        FROM PostAnalyticalResultJpaEntity r
        JOIN DeterminationJpaEntity d
            ON d.analyticalResultId = r.analyticResultId AND d.tenantId = r.tenantId AND d.active = true
        JOIN DeterminationCatalogJpaEntity c ON c.id = d.determinationCatalogId
        LEFT JOIN DeterminationValidationJpaEntity v
            ON v.resultId = r.id AND v.determinationId = d.id AND v.tenantId = r.tenantId AND v.active = true
        WHERE r.tenantId = :tenantId AND r.studyId = :studyId AND r.active = true
        ORDER BY r.id, d.id
        """)
List<StudyDetailRow> findStudyDetailRows(@Param("tenantId") Long tenantId, @Param("studyId") Long studyId);
```
Imports: `StudyDetailRow`, `List`, `Query`, `Param`.

- [ ] **Step 3: Puerto + adapter**

En `PostAnalyticalResultRepositoryPort` agregar:
```java
List<StudyDetailRow> findStudyDetailRows(Long tenantId, Long studyId);
```
En `PostAnalyticalResultRepositoryAdapter` (usar el nombre real del JPA repo inyectado):
```java
@Override
public List<StudyDetailRow> findStudyDetailRows(Long tenantId, Long studyId) {
    return jpaRepository.findStudyDetailRows(tenantId, studyId);
}
```
Imports `StudyDetailRow`.

- [ ] **Step 4: Use case `GetStudyDetailUseCase`**

```java
package lab.laboratorio.modules.analitica.postanalitica.application.usecase;

import lab.laboratorio.modules.analitica.postanalitica.domain.exception.StudyNotFoundException;
import lab.laboratorio.modules.analitica.postanalitica.domain.model.PostAnalyticalStudy;
import lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyDetailRow;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PostAnalyticalResultRepositoryPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PostAnalyticalStudyRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetStudyDetailUseCase {

    private final PostAnalyticalStudyRepositoryPort studyRepo;
    private final PostAnalyticalResultRepositoryPort resultRepo;

    public record Input(Long tenantId, Long protocolId) {}

    public record Result(PostAnalyticalStudy study, List<StudyDetailRow> rows) {}

    public Result execute(Input input) {
        PostAnalyticalStudy study = studyRepo.findByProtocolId(input.tenantId(), input.protocolId())
                .orElseThrow(() -> new StudyNotFoundException(input.tenantId(), input.protocolId()));
        List<StudyDetailRow> rows = resultRepo.findStudyDetailRows(input.tenantId(), study.getId());
        return new Result(study, rows);
    }
}
```

- [ ] **Step 5: Response DTO `StudyDetailResponse`** (agrupa filas por resultado)

```java
package lab.laboratorio.modules.analitica.postanalitica.presentation.dto.response;

import lab.laboratorio.modules.analitica.postanalitica.application.usecase.GetStudyDetailUseCase;
import lab.laboratorio.modules.analitica.postanalitica.domain.model.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record StudyDetailResponse(
        StudyHeader study,
        List<ResultDetail> results
) {
    public record StudyHeader(Long protocolId, StudyStatus currentStatus,
                              int expectedResultsCount, int signedResultsCount, Long patientId) {}

    public record ResultDetail(Long resultId, PostAnalyticalResultStatus status, Long sectionId,
                               List<DeterminationDetail> determinations) {}

    public record DeterminationDetail(Long determinationId, String name, String value, String unit,
                                      String referenceRange, ValidationOutcome aggregateOutcome,
                                      ValidationOutcome manualOutcome, boolean outOfRange) {}

    public static StudyDetailResponse from(GetStudyDetailUseCase.Result r) {
        PostAnalyticalStudy s = r.study();
        Map<Long, List<StudyDetailRow>> byResult = new LinkedHashMap<>();
        Map<Long, StudyDetailRow> firstRowByResult = new LinkedHashMap<>();
        for (StudyDetailRow row : r.rows()) {
            byResult.computeIfAbsent(row.resultId(), k -> new ArrayList<>()).add(row);
            firstRowByResult.putIfAbsent(row.resultId(), row);
        }
        List<ResultDetail> results = new ArrayList<>();
        for (var e : byResult.entrySet()) {
            StudyDetailRow head = firstRowByResult.get(e.getKey());
            List<DeterminationDetail> dets = e.getValue().stream().map(row -> new DeterminationDetail(
                    row.determinationId(), row.name(), row.value(), row.unit(), row.referenceRange(),
                    row.aggregateOutcome(), row.manualOutcome(),
                    row.aggregateOutcome() == ValidationOutcome.WARNING)).toList();
            results.add(new ResultDetail(head.resultId(), head.resultStatus(), head.sectionId(), dets));
        }
        return new StudyDetailResponse(
                new StudyHeader(s.getProtocolId(), s.getCurrentStatus(),
                        s.getExpectedResultsCount(), s.getSignedResultsCount(), s.getPatientId()),
                results);
    }
}
```
> Si `PostAnalyticalStudy` no expone `getExpectedResultsCount()/getSignedResultsCount()/getPatientId()`, ajustar a los getters reales (verificar en el dominio). Header de paciente nombre/sexo/fecha: el front lo deriva del listado por navegación (ver Fase B); acá basta `patientId`.

- [ ] **Step 6: Endpoint en el controller**

En `ResultValidationController` agregar (inyectar `GetStudyDetailUseCase getStudyDetailUseCase` al constructor vía `@RequiredArgsConstructor`):
```java
@GetMapping("/studies/{protocolId}/results/detail")
@Operation(summary = "Detalle enriquecido del estudio (determinaciones con valor/unidad/rango + outcomes)")
public ResponseEntity<StudyDetailResponse> getDetail(@PathVariable Long protocolId) {
    Long tenantId = TenantContext.requireTenantId();
    return ResponseEntity.ok(StudyDetailResponse.from(
            getStudyDetailUseCase.execute(new GetStudyDetailUseCase.Input(tenantId, protocolId))));
}
```
Imports del use case + DTO.

- [ ] **Step 7: Compilar + IT del shape**

Run: `./mvnw.cmd -q -DskipTests compile` → BUILD SUCCESS.
Agregar/extender un IT (`@SpringBootTest` + `@ActiveProfiles("test")`, H2+Flyway, igual que `PostAnalyticalStudyRepositoryAdapterIT`) que, sobre datos sembrados de un protocolo con un resultado y ≥1 determinación con catálogo + validación, llame `GET /studies/{protocolId}/results/detail` (o el use case directo) y asserte: `results[0].determinations[0]` trae `name`, `value`, `unit`, `referenceRange`, `aggregateOutcome`, `manualOutcome`, y `outOfRange == (aggregateOutcome==WARNING)`.

Run: `./mvnw.cmd test -Dtest=ResultValidationControllerIT` (o el IT donde lo agregues) → PASS.

- [ ] **Step 8: Commit**
```
git add -A && git commit -m "feat(postanalitica): endpoint /results/detail enriquecido (proyección StudyDetailRow)"
```

---

### Task A2: Firma — derivar `signerRegistration` del empleado (matrícula automática)

**Files:**
- Modify: `presentation/dto/request/SignResultRequest.java`, `SignStudyRequest.java`
- Modify: `application/usecase/SignResultUseCase.java`, `SignStudyUseCase.java`
- Test: el IT de firma del módulo (o uno nuevo).

- [ ] **Step 1: Relajar `@NotBlank signerRegistration`**

`SignResultRequest.java` y `SignStudyRequest.java`:
```java
public record SignResultRequest(String signerRegistration, @NotBlank String token) {}
```
```java
public record SignStudyRequest(String signerRegistration, @NotBlank String token) {}
```
(Quitar `@NotBlank` de `signerRegistration`; `token` sigue requerido — el front manda `"ui-confirm"`.)

- [ ] **Step 2: Derivar la matrícula del empleado en los use cases**

En `SignResultUseCase.execute`, el empleado ya se resuelve para el PDF (`var emp = getEmployeeByIdUseCase.execute(tenantId, employeeId)`). Mover esa resolución **antes** de crear la firma y usar `emp.getRegistration()` como matrícula efectiva (con fallback al valor del request si el empleado no tuviera matrícula):

```java
// resolver empleado una vez, temprano:
var emp = getEmployeeByIdUseCase.execute(input.tenantId(), input.employeeId());
String effectiveRegistration = (emp.getRegistration() != null && !emp.getRegistration().isBlank())
        ? emp.getRegistration()
        : input.signerRegistration();
```
Reemplazar los dos usos de `input.signerRegistration()` (creación de `ResultSignature.create(...)` y `buildPartialReportData(...)`) por `effectiveRegistration`, y reusar `emp` para `signerName`/`signerSignatureBase64` (eliminar el segundo lookup best-effort, o dejarlo). Misma transformación en `SignStudyUseCase`.

> Si `getEmployeeByIdUseCase` lanza cuando no hay empleado, eso ya es el comportamiento deseado (sin empleado firmable no se puede firmar). El mensaje de error debe quedar en español y sin leak (ver A0/seed para que admin tenga empleado).

- [ ] **Step 3: Test**

Extender el IT de firma: con un empleado que tiene `registration` y `signature` (ver seed A3), firmar un resultado VALIDATED **sin** mandar `signerRegistration` en el request (solo `token`) responde OK y la `ResultSignature` persiste `signerRegistration == emp.registration`. Firmar sin `signature` en el empleado → rechazo (mensaje español).

Run: `./mvnw.cmd test -Dtest=*Sign*` → PASS.

- [ ] **Step 4: Commit**
```
git add -A && git commit -m "feat(postanalitica): firma deriva signerRegistration del empleado (matrícula automática)"
```

---

### Task A3: Seed — empleado firmable con firma (local)

**Files:**
- Create: `src/main/resources/db/migration-local/V961__seed_local_dev_signer.sql`

- [ ] **Step 1: Seed alineado al firmante de prueba**

Según A0/Step 1 (el id que debe tener el empleado = valor del claim `userId` del login firmable). Caso esperado (admin = user 10001, ADMINISTRADOR, claim userId=10001): insertar un `employees` con `id = 10001`, bioquímico, matrícula y firma Base64; e idempotente.

```sql
-- V961: empleado firmable para el login de prueba + firma Base64 (local dev).
-- Alinea employees.id con el claim userId del firmante (admin=10001) para que el
-- flujo de firma (getEmployeeById(userId)) resuelva un empleado con signature+registration.
INSERT INTO employees (id, tenant_id, first_name, last_name, document, is_biochemist,
                       registration, user_id, active,
                       created_at, updated_at, created_by, updated_by, version, signature)
VALUES (10001, 1, 'Admin', 'Bioquímico', '99999999', TRUE, 'BQ-ADMIN', 10001, TRUE,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'local-seed', 'local-seed', 0,
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
ON DUPLICATE KEY UPDATE signature = VALUES(signature), is_biochemist = TRUE, registration = 'BQ-ADMIN';
-- Por las dudas, también dotar de firma al bioquímico 65001:
UPDATE employees SET signature =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
WHERE id = 65001 AND tenant_id = 1;
```
> Ajustar `id`/`user_id` al valor real confirmado en A0. El Base64 es un PNG 1×1 transparente (placeholder presentacional para el PDF). `ON DUPLICATE KEY UPDATE` lo hace idempotente.

- [ ] **Step 2: Verificación manual (smoke firma backend)**

Con el back local levantado (MySQL 3307 en esta sesión) y token de `admin@test.com`:
```
# firmar el resultado VALIDATED (56011) — protocolo de estudio 55011
curl -X POST http://localhost:8080/api/v1/analitica/postanalitica/results/56011/sign \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"token":"ui-confirm"}'
# firmar el estudio READY_FOR_SIGNATURE (protocolo 50015)
curl -X POST http://localhost:8080/api/v1/analitica/postanalitica/studies/50015/sign \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"token":"ui-confirm"}'
```
Expected: 200; el resultado pasa a SIGNED y el estudio a CLOSED. Sin `signature` daría rechazo en español.

- [ ] **Step 3: Commit**
```
git add -A && git commit -m "seed(local): empleado firmable con signature Base64 (V961) para probar firma"
```

---

## FASE B — FRONTEND (`FRONTEND-LABORATORIO-validar-firma`)

Patrón NgRx clásico (skill `ngrx-backend-request`). Base: `src/app/features/analitica/muestras`.

### Task B1: Modelos del detalle

**Files:** Modify `models/postanalitica.model.ts`

- [ ] **Step 1: Agregar tipos del detalle** (al final del archivo)

```ts
export interface DetalleDeterminacion {
  determinationId: number; name: string; value: string;
  unit: string; referenceRange: string;
  aggregateOutcome: ValidationOutcome | null;
  manualOutcome: ValidationOutcome | null;
  outOfRange: boolean;
}
export interface DetalleResultado {
  resultId: number; status: ResultStatus; sectionId: number | null;
  determinations: DetalleDeterminacion[];
}
export interface DetalleEstudioHeader {
  protocolId: number; currentStatus: StudyStatus;
  expectedResultsCount: number; signedResultsCount: number; patientId: number;
}
export interface DetalleEstudioResponse { study: DetalleEstudioHeader; results: DetalleResultado[]; }

/** VM del detalle en el store (incluye datos de paciente para el header, opcionales). */
export interface DetalleEstudio extends DetalleEstudioResponse {
  patientName?: string; patientSex?: string | null; patientBirthDate?: string | null;
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run build` → sin errores nuevos.
```
git add -A && git commit -m "feat(validacion): modelos del detalle (DetalleEstudio + determinaciones)"
```

---

### Task B2: Métodos de service

**Files:** Modify `services/postanalitica-api.service.ts`

- [ ] **Step 1: Agregar métodos**

```ts
getDetalle(protocolId: number): Observable<DetalleEstudioResponse> {
  return this.http.get<DetalleEstudioResponse>(`${this.base}/studies/${protocolId}/results/detail`);
}
signResult(resultId: number): Observable<unknown> {
  return this.http.post(`${this.base}/results/${resultId}/sign`, { token: 'ui-confirm' });
}
signStudy(protocolId: number): Observable<unknown> {
  return this.http.post(`${this.base}/studies/${protocolId}/sign`, { token: 'ui-confirm' });
}
```
Agregar `DetalleEstudioResponse` al import de modelos. Reusar `validateDetermination`/`validateAll` existentes.

- [ ] **Step 2: Typecheck + commit**
```
npm run build
git add -A && git commit -m "feat(validacion): service detalle + signResult/signStudy"
```

---

### Task B3: Store slice `validacion-detalle`

**Files:** Create 5 archivos en `store/validacion-detalle/`

- [ ] **Step 1: state**
```ts
import { HttpErrorResponse } from '@angular/common/http';
import type { DetalleEstudio } from '../../models/postanalitica.model';
export interface ValidacionDetalleState { detalle: DetalleEstudio | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null; }
export const initialValidacionDetalleState: ValidacionDetalleState = { detalle: null, loading: false, saving: false, error: null };
export const VALIDACION_DETALLE_FEATURE_KEY = 'validacionDetalle';
```

- [ ] **Step 2: actions**
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { DetalleEstudio, ValidationOutcome } from '../../models/postanalitica.model';

export const loadDetalle = createAction('[Validar Protocolo Page] Load Detalle', props<{ protocolId: number; patientName?: string; patientSex?: string | null; patientBirthDate?: string | null }>());
export const loadDetalleSuccess = createAction('[Postanalitica API] Load Detalle Success', props<{ detalle: DetalleEstudio }>());
export const loadDetalleFailure = createAction('[Postanalitica API] Load Detalle Failure', props<{ error: HttpErrorResponse }>());

export const validarDet = createAction('[Validar Protocolo Page] Validar Det', props<{ resultId: number; determinationId: number; outcome: ValidationOutcome }>());
export const validarTodo = createAction('[Validar Protocolo Page] Validar Todo', props<{ resultId: number; outcome: ValidationOutcome }>());
export const mutarOk = createAction('[Postanalitica API] Mutacion Ok');
export const mutarFail = createAction('[Postanalitica API] Mutacion Fail', props<{ error: HttpErrorResponse }>());

export const firmarResultado = createAction('[Validar Protocolo Page] Firmar Resultado', props<{ resultId: number }>());
export const firmarEstudio = createAction('[Validar Protocolo Page] Firmar Estudio', props<{ protocolId: number }>());
```

- [ ] **Step 3: reducer**
```ts
import { createReducer, on } from '@ngrx/store';
import { initialValidacionDetalleState, ValidacionDetalleState } from './validacion-detalle.state';
import { loadDetalle, loadDetalleSuccess, loadDetalleFailure, validarDet, validarTodo, mutarOk, mutarFail, firmarResultado, firmarEstudio } from './validacion-detalle.actions';

export const validacionDetalleReducer = createReducer(
  initialValidacionDetalleState,
  on(loadDetalle, (s): ValidacionDetalleState => ({ ...s, loading: true, error: null })),
  on(loadDetalleSuccess, (s, { detalle }): ValidacionDetalleState => ({ ...s, detalle, loading: false, error: null })),
  on(loadDetalleFailure, (s, { error }): ValidacionDetalleState => ({ ...s, loading: false, error })),
  on(validarDet, validarTodo, firmarResultado, firmarEstudio, (s): ValidacionDetalleState => ({ ...s, saving: true, error: null })),
  on(mutarOk, (s): ValidacionDetalleState => ({ ...s, saving: false })),
  on(mutarFail, (s, { error }): ValidacionDetalleState => ({ ...s, saving: false, error })),
);
```

- [ ] **Step 4: selectors**
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ValidacionDetalleState, VALIDACION_DETALLE_FEATURE_KEY } from './validacion-detalle.state';
export const selectVDState = createFeatureSelector<ValidacionDetalleState>(VALIDACION_DETALLE_FEATURE_KEY);
export const selectDetalle = createSelector(selectVDState, s => s.detalle);
export const selectDetalleLoading = createSelector(selectVDState, s => s.loading);
export const selectDetalleSaving = createSelector(selectVDState, s => s.saving);
export const selectDetalleError = createSelector(selectVDState, s => s.error);
```

- [ ] **Step 5: effects** (read `switchMap`; mutaciones `concatMap`; `catchError` dentro; reload tras éxito)
```ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, concatMap, filter, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { selectDetalle } from './validacion-detalle.selectors';
import {
  loadDetalle, loadDetalleSuccess, loadDetalleFailure,
  validarDet, validarTodo, mutarOk, mutarFail, firmarResultado, firmarEstudio,
} from './validacion-detalle.actions';

@Injectable()
export class ValidacionDetalleEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(PostanaliticaApiService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(loadDetalle),
    switchMap(({ protocolId, patientName, patientSex, patientBirthDate }) =>
      this.api.getDetalle(protocolId).pipe(
        map(res => loadDetalleSuccess({ detalle: { ...res, patientName, patientSex, patientBirthDate } })),
        catchError((error: HttpErrorResponse) => of(loadDetalleFailure({ error }))),
      )),
  ));

  validarDet$ = createEffect(() => this.actions$.pipe(
    ofType(validarDet),
    concatMap(({ resultId, determinationId, outcome }) =>
      this.api.validateDetermination(resultId, determinationId, outcome).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  validarTodo$ = createEffect(() => this.actions$.pipe(
    ofType(validarTodo),
    concatMap(({ resultId, outcome }) =>
      this.api.validateAll(resultId, outcome).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  firmarResultado$ = createEffect(() => this.actions$.pipe(
    ofType(firmarResultado),
    concatMap(({ resultId }) =>
      this.api.signResult(resultId).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  firmarEstudio$ = createEffect(() => this.actions$.pipe(
    ofType(firmarEstudio),
    concatMap(({ protocolId }) =>
      this.api.signStudy(protocolId).pipe(
        map(() => mutarOk()), catchError((error: HttpErrorResponse) => of(mutarFail({ error }))))),
  ));

  reload$ = createEffect(() => this.actions$.pipe(
    ofType(mutarOk),
    withLatestFrom(this.store.select(selectDetalle)),
    filter(([, d]) => d != null),
    map(([, d]) => loadDetalle({ protocolId: d!.study.protocolId,
      patientName: d!.patientName, patientSex: d!.patientSex, patientBirthDate: d!.patientBirthDate })),
  ));
}
```

- [ ] **Step 6: Typecheck + commit**
```
npm run build
git add src/app/features/analitica/muestras/store/validacion-detalle
git commit -m "feat(validacion): store validacion-detalle (load/validate/sign + reload)"
```

---

### Task B4: Registrar el store

**Files:** Modify `app.config.ts`

- [ ] **Step 1: provideState + provideEffects** (junto a postanalitica)
```ts
import { VALIDACION_DETALLE_FEATURE_KEY } from '@features/analitica/muestras/store/validacion-detalle/validacion-detalle.state';
import { validacionDetalleReducer } from '@features/analitica/muestras/store/validacion-detalle/validacion-detalle.reducer';
import { ValidacionDetalleEffects } from '@features/analitica/muestras/store/validacion-detalle/validacion-detalle.effects';
// dentro de providers:
provideState(VALIDACION_DETALLE_FEATURE_KEY, validacionDetalleReducer),
provideEffects(ValidacionDetalleEffects),
```

- [ ] **Step 2: Typecheck + commit**
```
npm run build
git add src/app/app.config.ts && git commit -m "feat(validacion): registrar store validacion-detalle"
```

---

### Task B5: Reescribir `validar-protocolo.page.ts` (consumir store)

**Files:** Modify `pages/validacion-protocolos/validar-protocolo/validar-protocolo.page.ts`

- [ ] **Step 1: Reemplazar el componente** (consume store; firma confirm; sin mock)

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { calcularEdad } from '@shared/utils/calcular-edad';
import { estadoFirmaDe, badgeFirma } from '../../../models/postanalitica.model';
import type { DetalleResultado, DetalleDeterminacion } from '../../../models/postanalitica.model';
import { loadDetalle, validarTodo, firmarResultado, firmarEstudio } from '../../../store/validacion-detalle/validacion-detalle.actions';
import { selectDetalle, selectDetalleLoading, selectDetalleSaving } from '../../../store/validacion-detalle/validacion-detalle.selectors';

@Component({
  selector: 'app-validar-protocolo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe],
  templateUrl: './validar-protocolo.page.html',
  styleUrl: './validar-protocolo.page.scss',
})
export class ValidarProtocoloPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  readonly badgeFirma = badgeFirma;
  readonly estadoFirmaDe = estadoFirmaDe;

  readonly detalle = this.store.selectSignal(selectDetalle);
  readonly loading = this.store.selectSignal(selectDetalleLoading);
  readonly saving = this.store.selectSignal(selectDetalleSaving);

  readonly protocolId = Number(this.route.snapshot.paramMap.get('protocolId'));
  readonly expanded = signal<ReadonlySet<number>>(new Set());

  readonly results = computed<DetalleResultado[]>(() => this.detalle()?.results ?? []);
  readonly studyStatus = computed(() => this.detalle()?.study.currentStatus ?? 'PENDING');
  readonly canSignStudy = computed(() => this.studyStatus() === 'READY_FOR_SIGNATURE');
  readonly edad = computed(() => calcularEdad(this.detalle()?.patientBirthDate ?? null));

  ngOnInit(): void {
    const st = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as
      { patientName?: string; patientSex?: string | null; patientBirthDate?: string | null };
    this.store.dispatch(loadDetalle({
      protocolId: this.protocolId,
      patientName: st?.patientName, patientSex: st?.patientSex, patientBirthDate: st?.patientBirthDate,
    }));
    this.expanded.set(new Set(this.results().map(r => r.resultId)));
  }

  isOpen(id: number): boolean { return this.expanded().has(id); }
  toggle(id: number): void {
    this.expanded.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  canSignResult(r: DetalleResultado): boolean { return r.status === 'VALIDATED'; }
  outOf(d: DetalleDeterminacion): boolean { return d.outOfRange; }

  validarTodo(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    this.store.dispatch(validarTodo({ resultId: r.resultId, outcome: 'PASS' }));
  }
  firmarResultado(r: DetalleResultado, ev?: Event): void {
    ev?.stopPropagation();
    if (confirm('¿Firmar este resultado como bioquímico?')) this.store.dispatch(firmarResultado({ resultId: r.resultId }));
  }
  firmarEstudio(): void {
    if (confirm('¿Firmar el estudio completo? Esta acción lo cierra.')) this.store.dispatch(firmarEstudio({ protocolId: this.protocolId }));
  }
}
```
> El header de paciente (nombre/sexo/edad) llega por `state` de navegación desde la fila del listado (ver B7/ajuste del listado para pasar ese state). Si no llega, el header muestra solo el protocolo.

- [ ] **Step 2: Typecheck** (fallará hasta reescribir el HTML — B6). No commitear aún.

---

### Task B6: Template + SCSS reales

**Files:** Modify `validar-protocolo.page.html` y `.scss`

- [ ] **Step 1: Reescribir el HTML** (adaptar el markup del mock a datos reales del store; columnas de determinación; firma por resultado + estudio)

Reemplazar el `<section class="validar-page">…</section>` para que itere `results()` y, por resultado, un accordion con la tabla de `determinations` (`name | value(+flag outOfRange) | unit | referenceRange | manual(aggregate/manual outcome)`), un botón "Validar todo" y, si `canSignResult(r)`, "Firmar"; y en el header un "Firmar estudio" habilitado solo si `canSignStudy()`. Mantener las clases del `.scss` del mock (`psum`, `anx`, `vt-grid`, `badge-st`, etc.). Reutilizar el `.scss` existente; quitar lo que dependa de campos del mock que ya no existen (`urgente`, `firma parcial/total` de estado local → ahora `badgeFirma(studyStatus())`).

> Markup completo: partir del HTML actual del mock (está en el repo) y sustituir `p.analisis`→`results()`, `a.dets`→`r.determinations`, `x.v/x.u/x.ref/x.flag`→`d.value/d.unit/d.referenceRange/outOf(d)`, los botones de firma por `firmarResultado(r)`/`firmarEstudio()`, y el estado por `badgeFirma(studyStatus())`. Fecha con `DatePipe` si el header trae fecha; si no, omitir.

- [ ] **Step 2: Typecheck + commit** (TS+HTML+SCSS juntos)
```
npm run build
git add src/app/features/analitica/muestras/pages/validacion-protocolos/validar-protocolo
git commit -m "feat(validacion): detalle validar/ver real (store) con firma por resultado y estudio"
```

---

### Task B7: Limpieza — eliminar duplicado Arco 4 + mock + ajustar navegación

**Files:**
- Delete: `pages/validacion/validacion.page.ts`, `components/validation-table/validation-table.component.ts` (+ su spec)
- Modify: `analitica.routes.ts` (quitar ruta `procesamiento/validacion/:protocolId`)
- Modify: `pages/worklist/worklist.page.ts` (cambiar navegación a `/analitica/validacion`) + su spec
- Modify: `pages/validacion-protocolos/validacion-protocolos.page.ts` (pasar `state` de paciente al navegar)
- Delete: `data/validacion-protocolos.mock.ts` (si ya nadie lo importa)

- [ ] **Step 1: Confirmar callers del Arco 4 y del mock**
```
grep -rn "procesamiento/validacion\|ValidacionPage\|validation-table\|validacion-protocolos.mock" src/app
```
Expected: callers = `analitica.routes.ts` (ruta), `worklist.page.ts` (nav), y el mock solo en `validar-protocolo` (ya migrado). Si aparece otro, migrarlo antes de borrar.

- [ ] **Step 2: Pasar state de paciente desde el listado** (`validacion-protocolos.page.ts` `validar()`):
```ts
validar(r: ValidationListRow, ev: Event): void {
  ev.stopPropagation();
  this.router.navigate(['/analitica/validacion', r.protocolId], {
    state: { patientName: r.patientName, patientSex: r.patientSex, patientBirthDate: r.patientBirthDate },
  });
}
```

- [ ] **Step 3: Worklist → ruta unificada** (`worklist.page.ts`):
```ts
if (pid != null) this.router.navigate(['/analitica/validacion', pid]);
```
Actualizar el assert del spec (`worklist.page.spec.ts`) a `/analitica/validacion`.

- [ ] **Step 4: Quitar ruta del Arco 4** en `analitica.routes.ts` (bloque `procesamiento/validacion/:protocolId`).

- [ ] **Step 5: Borrar archivos del Arco 4 + mock**
```
rm src/app/features/analitica/muestras/pages/validacion/validacion.page.ts
rm src/app/features/analitica/muestras/components/validation-table/validation-table.component.ts
rm src/app/features/analitica/muestras/components/validation-table/validation-table.component.spec.ts
rm src/app/features/analitica/muestras/data/validacion-protocolos.mock.ts
```
(Si `buildValidationView`/`ValidationView`/`ValidationResultVM` del modelo quedan sin uso tras borrar el Arco 4 store, evaluar quitarlos; si el store `postanalitica` viejo queda huérfano, removerlo también — verificar con grep antes.)

- [ ] **Step 6: Typecheck + commit**
```
npm run build
git add -A && git commit -m "chore(validacion): unificar detalle, eliminar pantalla Arco 4 + mock, ruta y nav"
```

---

### Task B8: Tests + smoke

**Files:** Create `validar-protocolo.page.spec.ts`

- [ ] **Step 1: Smoke con provideMockStore**

Spec que provee `selectDetalle`/`selectDetalleLoading`/`selectDetalleSaving` con un `DetalleEstudio` fixture (un resultado VALIDATED con 2 determinaciones, una `outOfRange`) y verifica: `results()` mapea, `canSignResult` true para VALIDATED, `canSignStudy` según `study.currentStatus`, y que `firmarEstudio()` (con confirm mockeado `vi.spyOn(window,'confirm').mockReturnValue(true)`) despacha `firmarEstudio`.

- [ ] **Step 2: Correr specs del feature**
Run: `npm test -- validar-protocolo` (o suite completa) → PASS (baseline conocido: `patient-form`/`profile-menu` ajenos).

- [ ] **Step 3: Smoke visual end-to-end**
Con back (seed V961, MySQL 3307) + front: entrar al listado → "Validar/Ver" → ver determinaciones con valor/unidad/rango, validar todo, firmar resultado (VALIDATED) y firmar estudio (READY_FOR_SIGNATURE); confirmar transición de estados y errores en español.

- [ ] **Step 4: Commit**
```
git add -A && git commit -m "test(validacion): smoke de la pantalla de detalle validar/ver + firma"
```

---

## Self-Review (cobertura del spec)

- Endpoint de detalle enriquecido (name/value/unit/referenceRange/outcomes/outOfRange, sin fan-out) → A1. ✔
- Firma matrícula automática (deriva del empleado, request sin matrícula) → A2. ✔
- Seed de firma del empleado (firma local funcional) → A3 (+ A0 resuelve el mapeo userId↔empleado). ✔
- Front: modelos, service (detalle+sign), store (load/validate/sign + reload), page real con accordion + firma confirm → B1–B6. ✔
- Firma por resultado (VALIDATED) + estudio (READY_FOR_SIGNATURE) → B5/B6 (canSignResult/canSignStudy). ✔
- Limpieza (eliminar Arco 4 + mock, unificar ruta, ajustar worklist) → B7. ✔
- Errores en español sin leak → reusar `humanizeBackendError` en la page (toast) — incluir en B6 si se agrega toast; al menos el confirm + estado saving. ✔ (nota: si se quiere toast de error, reusar el patrón de `validacion.page` antes de borrarlo).
- Fuera de alcance (subir imagen de firma, cripto del token, mostrar PDF) → no se tocan. ✔

> Riesgo principal (A0): el mapeo claim `userId` ↔ `employees.id`. Si el claim no es el id del empleado, ajustar el seed (id alineado) o resolver por `findByUserId` — decisión en A0/A3 durante ejecución.
