# Replanteo del flujo de Atención (recepción por DNI) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-06-04-atencion-recepcion-design.md`
> **Jira:** [KAN-77](https://exequielsantoro.atlassian.net/browse/KAN-77)
> **Worktrees:** `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion` y `Backend/.worktrees/atencion-recepcion` (rama `feat/atencion-recepcion`, base `origin/development`).

**Goal:** Que la atención entre por `…/atencion/nueva?dni=<dni>`, resuelva el paciente (verificar o alta mínima inline) antes de crear la atención, cargue análisis del catálogo real, y al terminar genere el protocolo e imprima los rótulos antes de mandar a la cola de extracción.

**Architecture:** Enfoque A — evolucionar el `AtencionWizardComponent` existente. El paso 1 resuelve el paciente vía NgRx (acciones nuevas en el store `atencion`). El paso 3 ya crea el protocolo en `EndSecretaryPhaseUseCase`; el único cambio de backend es disparar la creación de rótulos ahí (y quitarla de `EndExtractionUseCase`).

**Tech Stack:** Angular 21 (standalone, signals, NgRx clásico, PrimeNG, Tailwind, Vitest) + Spring Boot / Java 21 (Clean Architecture, JUnit 5 + Mockito + AssertJ, Flyway).

## Decisiones y supuestos (declarados)

- **Resolución de paciente vive en el store `atencion`** (estado transitorio del wizard), no en una feature `pacientes` aparte: no existe hoy un store de pacientes y la resolución alimenta directo la creación de la atención. Se agregan campos dedicados (`resolvedPatient`, `patientResolving`, `patientNotFoundDni`, `patientResolutionError`) para no pisar `mutating`/`detailError`.
- **`userId` para rótulos = `null`**, igual que hace hoy `ExtractorAttentionController` en `end-extraction` (los impl de `LabelCreationPort` aceptan null). Se agrega `userId` al `Input` de `EndSecretaryPhaseUseCase` por consistencia con `EndExtractionUseCase.Input`.
- **Rótulos transaccionales**: el `triggerLabelCreation` corre dentro del `@Transactional` de `EndSecretaryPhaseUseCase`; si falla, aborta el "terminar".
- **Solo se cablea el trigger de rótulos en la rama `canSkipFinanciero`** (la única que corre hoy, sin Financiero). Queda un comentario para cablearlo también en la rama `AWAITING_CONFIRMATION` cuando Financiero se implemente (esa rama necesitará `findByIdWithAnalyses`).
- **`branchId` y `attentionNumber`** se generan como hoy (`branchId: 1`, `attentionNumber: A-${Date.now().slice(-6)}`). El contexto de sucursal real se resuelve en otra rama (KAN-73 recepción/branch-context), fuera de alcance.

## Comandos de test

- **Backend** (desde `Backend/.worktrees/atencion-recepcion`, PowerShell):
  ```powershell
  $env:JAVA_HOME='C:\Program Files\Java\jdk-21'   # o la ruta del JDK 21 instalado
  .\mvnw.cmd test -Dtest=EndSecretaryPhaseUseCaseTest
  .\mvnw.cmd test -Dtest=EndExtractionUseCaseTest
  ```
- **Frontend** (desde `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion`):
  - Specs de store/servicio (sin render): `npx vitest run <ruta-spec>`
  - Specs de componente que renderizan signal inputs: `npm run test` (config `ng test`, AOT). Ver memoria del proyecto.

---

## Task B1: Disparar rótulos al cerrar la fase de secretaría

**Files:**
- Modify: `Backend/.worktrees/atencion-recepcion/src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/EndSecretaryPhaseUseCase.java`
- Modify: `Backend/.worktrees/atencion-recepcion/src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionController.java`
- Test: `Backend/.worktrees/atencion-recepcion/src/test/java/lab/laboratorio/modules/analitica/atencion/application/EndSecretaryPhaseUseCaseTest.java`

- [ ] **Step 1: Actualizar las construcciones existentes de `Input` en el test y agregar el mock del nuevo puerto**

En `EndSecretaryPhaseUseCaseTest.java`, agregar el campo mock junto a los otros `@Mock`:

```java
@Mock LabelCreationPort labelCreationPort;
```

Agregar el import:

```java
import lab.laboratorio.modules.analitica.atencion.domain.port.LabelCreationPort;
```

Y en TODAS las construcciones `new EndSecretaryPhaseUseCase.Input(...)` existentes, agregar el tercer argumento `null` (userId). Ej:

```java
useCase.execute(new EndSecretaryPhaseUseCase.Input(1L, 1L, null));
```

- [ ] **Step 2: Escribir el test que falla**

Agregar al test un helper para autorizaciones autorizadas+activas y el caso nuevo:

```java
private AnalysisAuthorization authorizedActiveAuth(Long analysisId) {
    return AnalysisAuthorization.builder()
            .analysisId(analysisId).authorized(true).active(true).build();
}

@Test
void endSecretaryPhase_skipFinanciero_creaProtocoloYDisparaRotulos() {
    Attention attention = Attention.builder()
            .id(1L).tenantId(7L).patientId(2L).branchId(3L)
            .attentionState(AttentionState.REGISTERING_ANALYSES)
            .mostAdvancedState(AttentionState.REGISTERING_ANALYSES)
            .active(true)
            .analysisAuthorizations(new ArrayList<>(List.of(
                    authorizedActiveAuth(10L), authorizedActiveAuth(11L))))
            .build();

    when(attentionRepo.findById(1L, 7L)).thenReturn(Optional.of(attention));
    when(tenantModuleProvider.isEnabled(7L, ModuleCode.FINANCIERO)).thenReturn(false);
    when(attentionRepo.findByIdWithAnalyses(1L, 7L)).thenReturn(Optional.of(attention));
    when(protocolCreationPort.createProtocol(1L, 2L, List.of(10L, 11L)))
            .thenReturn(Optional.of(99L));
    when(attentionRepo.save(any(Attention.class))).thenAnswer(inv -> inv.getArgument(0));

    useCase.execute(new EndSecretaryPhaseUseCase.Input(1L, 7L, null));

    verify(labelCreationPort).triggerLabelCreation(
            99L, 1L, List.of(10L, 11L), 7L, 3L, null);
}
```

- [ ] **Step 3: Correr el test y verificar que NO compila / falla**

Run: `.\mvnw.cmd test -Dtest=EndSecretaryPhaseUseCaseTest`
Expected: FALLA de compilación (`labelCreationPort` no es campo del use case; `Input` no acepta 3 args).

- [ ] **Step 4: Implementar el cambio en `EndSecretaryPhaseUseCase.java`**

Agregar el import:

```java
import lab.laboratorio.modules.analitica.atencion.domain.port.LabelCreationPort;
```

Agregar la dependencia (junto a las otras `private final`):

```java
private final LabelCreationPort labelCreationPort;
```

Cambiar el record `Input` para sumar `userId`:

```java
public record Input(Long id, Long tenantId, Long userId) {}
```

En `execute(...)`, dentro del bloque `if (canSkipFinanciero) { ... }`, después de `ensureProtocolCreated(attention);` agregar la llamada:

```java
if (canSkipFinanciero) {
    attention = attentionRepo.findByIdWithAnalyses(input.id(), input.tenantId())
            .orElseThrow(() -> new AttentionNotFoundException(input.id()));
    ensureProtocolCreated(attention);
    triggerLabels(attention, input.userId());
}
```

Agregar el método privado (debajo de `ensureProtocolCreated`):

```java
/**
 * Crea los rótulos al cerrar la fase de secretaría (para que el paciente los lleve
 * al extractor). Transaccional: si falla, aborta el cierre. Solo se invoca en la rama
 * sin FINANCIERO. Cuando FINANCIERO se implemente, cablear lo mismo en la rama
 * AWAITING_CONFIRMATION (que primero deberá hacer findByIdWithAnalyses).
 */
private void triggerLabels(Attention attention, Long userId) {
    List<Long> analysisIds = attention.getAnalysisAuthorizations().stream()
            .filter(a -> a.isAuthorized() && a.isActive())
            .map(AnalysisAuthorization::getAnalysisId)
            .toList();
    labelCreationPort.triggerLabelCreation(
            attention.getProtocolId(),
            attention.getId(),
            analysisIds,
            attention.getTenantId(),
            attention.getBranchId(),
            userId);
}
```

- [ ] **Step 5: Pasar el `userId` desde el controller**

En `SecretaryAttentionController.java`, en el handler `endSecretaryPhase`, agregar el tercer argumento `null` al `Input` (mismo patrón que `ExtractorAttentionController`):

```java
@PatchMapping("/{id}/end-secretary-phase")
public ResponseEntity<AttentionResponse> endSecretaryPhase(@PathVariable Long id) {
    Long tenantId = TenantContext.requireTenantId();
    Attention attention = endSecretaryPhaseUseCase.execute(
            new EndSecretaryPhaseUseCase.Input(id, tenantId, null));
    return ResponseEntity.ok(mapper.toResponse(attention));
}
```

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `.\mvnw.cmd test -Dtest=EndSecretaryPhaseUseCaseTest`
Expected: PASS (incluye los tests viejos + el nuevo).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/EndSecretaryPhaseUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionController.java \
        src/test/java/lab/laboratorio/modules/analitica/atencion/application/EndSecretaryPhaseUseCaseTest.java
git commit -m "feat(atencion): generar rotulos al cerrar la fase de secretaria"
```

---

## Task B2: Quitar la creación de rótulos de la extracción

**Files:**
- Modify: `Backend/.worktrees/atencion-recepcion/src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/EndExtractionUseCase.java`
- Test: `Backend/.worktrees/atencion-recepcion/src/test/java/lab/laboratorio/modules/analitica/atencion/application/EndExtractionUseCaseTest.java`

- [ ] **Step 1: Escribir/ajustar el test que falla**

En `EndExtractionUseCaseTest.java`, asegurar el mock `@Mock LabelCreationPort labelCreationPort;` (ya debería existir) e importar `verifyNoInteractions`:

```java
import static org.mockito.Mockito.verifyNoInteractions;
```

Agregar el test que afirma que la extracción ya NO crea rótulos:

```java
@Test
void endExtraction_noDisparaRotulos() {
    Attention attention = Attention.builder()
            .id(1L).tenantId(7L).protocolId(99L).branchId(3L)
            .attentionState(AttentionState.IN_EXTRACTION)
            .mostAdvancedState(AttentionState.IN_EXTRACTION)
            .active(true)
            .analysisAuthorizations(new ArrayList<>(List.of(
                    AnalysisAuthorization.builder().analysisId(10L).authorized(true).active(true).build())))
            .build();
    when(attentionRepo.findById(1L, 7L)).thenReturn(Optional.of(attention));
    when(attentionRepo.save(any(Attention.class))).thenAnswer(inv -> inv.getArgument(0));

    useCase.execute(new EndExtractionUseCase.Input(1L, 7L, null));

    verifyNoInteractions(labelCreationPort);
    verify(protocolSampleUpdatePort).notifySampleCollected(99L, 7L);
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `.\mvnw.cmd test -Dtest=EndExtractionUseCaseTest`
Expected: FALLA — hoy `EndExtractionUseCase` sí llama `labelCreationPort.triggerLabelCreation(...)`.

- [ ] **Step 3: Implementar — quitar el bloque de rótulos**

En `EndExtractionUseCase.java`:
- Borrar el campo `private final LabelCreationPort labelCreationPort;`.
- Borrar el import `import lab.laboratorio.modules.analitica.atencion.domain.port.LabelCreationPort;`.
- Borrar el bloque que dispara los rótulos (el `if (attention.getProtocolId() != null) { ... labelCreationPort.triggerLabelCreation(...) ... } else { log.warn(...) }` correspondiente a los rótulos). Conservar el bloque previo de `protocolSampleUpdatePort.notifySampleCollected(...)`.

El `execute(...)` queda:

```java
public Attention execute(Input input) {
    Attention attention = attentionRepo.findById(input.id(), input.tenantId())
            .orElseThrow(() -> new AttentionNotFoundException(input.id()));

    if (attention.getAttentionState() != AttentionState.IN_EXTRACTION) {
        throw new InvalidAttentionStateException("La atención no está en proceso de extracción");
    }

    if (attention.getProtocolId() != null) {
        protocolSampleUpdatePort.notifySampleCollected(attention.getProtocolId(), attention.getTenantId());
    } else {
        log.warn("[EndExtraction] No protocolId set — skipping ProtocolSampleUpdatePort. attentionId={}",
                 attention.getId());
    }

    attention.advanceState(AttentionState.FINISHED);
    return attentionRepo.save(attention);
}
```

(El `Input` record se mantiene con `userId` por compatibilidad del controller.)

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `.\mvnw.cmd test -Dtest=EndExtractionUseCaseTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/EndExtractionUseCase.java \
        src/test/java/lab/laboratorio/modules/analitica/atencion/application/EndExtractionUseCaseTest.java
git commit -m "refactor(atencion): la extraccion ya no crea rotulos (se crean al cerrar secretaria)"
```

---

## Task F1: `getByDni` en PatientService

**Files:**
- Modify: `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion/src/app/features/pacientes/services/patient.service.ts`
- Test: `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion/src/app/features/pacientes/services/patient.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

Agregar al spec (usa `HttpClientTestingModule` / `HttpTestingController`):

```ts
it('getByDni → GET /api/v1/analitica/patients/dni/{dni}', () => {
  const patient = { id: 5, dni: '18901234', firstName: 'Juan', lastName: 'Pérez' } as Patient;
  let result: Patient | undefined;
  service.getByDni('18901234').subscribe((p) => (result = p));
  const req = httpMock.expectOne('/api/v1/analitica/patients/dni/18901234');
  expect(req.request.method).toBe('GET');
  req.flush(patient);
  expect(result).toEqual(patient);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/pacientes/services/patient.service.spec.ts`
Expected: FALLA — `service.getByDni` no existe.

- [ ] **Step 3: Implementar `getByDni`**

En `patient.service.ts`, agregar el método:

```ts
getByDni(dni: string): Observable<Patient> {
  return this.http.get<Patient>(`${this.baseUrl}/dni/${dni}`);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/app/features/pacientes/services/patient.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/pacientes/services/patient.service.ts src/app/features/pacientes/services/patient.service.spec.ts
git commit -m "feat(pacientes): getByDni en PatientService"
```

---

## Task F2: Resolución de paciente + orquestación en el store `atencion`

**Files:**
- Modify: `.../features/analitica/store/atencion/atencion.state.ts`
- Modify: `.../features/analitica/store/atencion/atencion.actions.ts`
- Modify: `.../features/analitica/store/atencion/atencion.reducer.ts`
- Modify: `.../features/analitica/store/atencion/atencion.effects.ts`
- Modify: `.../features/analitica/store/atencion/atencion.selectors.ts`
- Test: `.../features/analitica/store/atencion/atencion.effects.spec.ts`

- [ ] **Step 1: Extender el state**

En `atencion.state.ts`, agregar al `AtencionFeatureState` (después de `mutating`):

```ts
  resolvedPatient: Patient | null;
  patientResolving: boolean;
  patientNotFoundDni: string | null;
  patientResolutionError: HttpErrorResponse | null;
```

Importar el tipo: `import { Patient, CreatePatientRequest, UpdatePatientRequest } from '@features/pacientes/models/patient.model';` (ajustar el path al alias real del repo; si no hay alias, usar el relativo `../../../../pacientes/models/patient.model`).

Y en `initialAtencionState`:

```ts
  resolvedPatient: null,
  patientResolving: false,
  patientNotFoundDni: null,
  patientResolutionError: null,
```

- [ ] **Step 2: Agregar las actions**

En `atencion.actions.ts`:

```ts
// Patient resolution (paso 1)
export const resolvePatientByDni    = createAction('[Atencion Wizard] Resolve Patient By Dni', props<{ dni: string }>());
export const patientResolved        = createAction('[Atencion API] Patient Resolved',          props<{ patient: Patient }>());
export const patientNotFound        = createAction('[Atencion API] Patient Not Found',         props<{ dni: string }>());
export const patientResolutionFailure = createAction('[Atencion API] Patient Resolution Failure', props<{ error: HttpErrorResponse }>());

export const createPatientInline = createAction('[Atencion Wizard] Create Patient Inline', props<{ payload: CreatePatientRequest }>());
export const updatePatientInline = createAction('[Atencion Wizard] Update Patient Inline', props<{ id: number; payload: UpdatePatientRequest }>());

// Orquestación: crear atención para un paciente ya resuelto
export const startAttentionForPatient = createAction('[Atencion Wizard] Start For Patient', props<{ patientId: number; indications: string | null }>());
```

Importar los tipos `Patient, CreatePatientRequest, UpdatePatientRequest` desde el modelo de pacientes.

- [ ] **Step 3: Agregar los handlers del reducer**

En `atencion.reducer.ts`:

```ts
on(resolvePatientByDni, (s): AtencionFeatureState => ({
  ...s, patientResolving: true, patientResolutionError: null,
  resolvedPatient: null, patientNotFoundDni: null,
})),
on(patientResolved, (s, { patient }): AtencionFeatureState => ({
  ...s, patientResolving: false, resolvedPatient: patient, patientNotFoundDni: null,
})),
on(patientNotFound, (s, { dni }): AtencionFeatureState => ({
  ...s, patientResolving: false, resolvedPatient: null, patientNotFoundDni: dni,
})),
on(patientResolutionFailure, (s, { error }): AtencionFeatureState => ({
  ...s, patientResolving: false, patientResolutionError: error,
})),
on(createPatientInline, updatePatientInline, (s): AtencionFeatureState => ({
  ...s, patientResolving: true, patientResolutionError: null,
})),
on(startAttentionForPatient, (s): AtencionFeatureState => ({
  ...s, mutating: true, detailError: null,
})),
```

- [ ] **Step 4: Agregar los selectors**

En `atencion.selectors.ts`:

```ts
export const selectResolvedPatient        = createSelector(selectAtencionState, s => s.resolvedPatient);
export const selectPatientResolving       = createSelector(selectAtencionState, s => s.patientResolving);
export const selectPatientNotFoundDni     = createSelector(selectAtencionState, s => s.patientNotFoundDni);
export const selectPatientResolutionError = createSelector(selectAtencionState, s => s.patientResolutionError);
```

- [ ] **Step 5: Escribir los tests de effects que fallan**

En `atencion.effects.spec.ts`, agregar al objeto `api` el stub `PatientService` y los tests. Primero, en el `beforeEach`, proveer el mock:

```ts
const patients = {
  existsByDni: vi.fn(), getByDni: vi.fn(), create: vi.fn(), update: vi.fn(),
};
// ...en providers:
{ provide: PatientService, useValue: patients },
```

Tests:

```ts
it('resolvePatientByDni$ → existe → patientResolved', async () => {
  const patient = { id: 5, dni: '18901234' } as Patient;
  (patients.existsByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(true));
  (patients.getByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(patient));
  actions$.next(A.resolvePatientByDni({ dni: '18901234' }));
  const out = await firstValueFrom(effects.resolvePatient$.pipe(take(1)));
  expect(out).toEqual(A.patientResolved({ patient }));
});

it('resolvePatientByDni$ → no existe → patientNotFound', async () => {
  (patients.existsByDni as ReturnType<typeof vi.fn>).mockReturnValue(of(false));
  actions$.next(A.resolvePatientByDni({ dni: '18901234' }));
  const out = await firstValueFrom(effects.resolvePatient$.pipe(take(1)));
  expect(out).toEqual(A.patientNotFound({ dni: '18901234' }));
});
```

- [ ] **Step 6: Correr los tests y verificar que fallan**

Run: `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts`
Expected: FALLA — `effects.resolvePatient$` no existe.

- [ ] **Step 7: Implementar los effects**

En `atencion.effects.ts`, inyectar el servicio de pacientes y agregar los effects. Agregar a los imports de rxjs lo que falte (`switchMap`, `concatMap`, `exhaustMap`, `of`, `map`, `catchError`, `tap`):

```ts
private readonly patients = inject(PatientService);

resolvePatient$ = createEffect(() =>
  this.actions$.pipe(
    ofType(resolvePatientByDni),
    switchMap(({ dni }) =>
      this.patients.existsByDni(dni).pipe(
        switchMap(exists =>
          exists
            ? this.patients.getByDni(dni).pipe(map(patient => patientResolved({ patient })))
            : of(patientNotFound({ dni }))
        ),
        catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
      )
    )
  )
);

createPatientInline$ = createEffect(() =>
  this.actions$.pipe(
    ofType(createPatientInline),
    concatMap(({ payload }) =>
      this.patients.create(payload).pipe(
        map(patient => patientResolved({ patient })),
        catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
      )
    )
  )
);

updatePatientInline$ = createEffect(() =>
  this.actions$.pipe(
    ofType(updatePatientInline),
    concatMap(({ id, payload }) =>
      this.patients.update(id, payload).pipe(
        map(patient => patientResolved({ patient })),
        catchError((error: HttpErrorResponse) => of(patientResolutionFailure({ error }))),
      )
    )
  )
);

startAttentionForPatient$ = createEffect(() =>
  this.actions$.pipe(
    ofType(startAttentionForPatient),
    exhaustMap(({ patientId, indications }) =>
      this.api.createBlank({
        branchId: 1,
        patientId,
        attentionNumber: `A-${Date.now().toString().slice(-6)}`,
        deskAttentionBox: null,
      }).pipe(
        concatMap(created =>
          this.api.assignGeneralData(created.id, {
            patientId, doctorId: null, insurancePlanId: null, indications,
          }).pipe(
            tap(item => this.router.navigate(['/analitica/atencion', item.id])),
            map(item => atencionMutationSuccess({ item })),
          )
        ),
        catchError((error: HttpErrorResponse) => of(atencionMutationFailure({ error }))),
      )
    )
  )
);
```

Agregar los imports nombrados de las actions nuevas y `import { PatientService } from '@features/pacientes/services/patient.service';` (ajustar al path/alias real).

- [ ] **Step 8: Correr los tests y verificar que pasan**

Run: `npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/features/analitica/store/atencion/
git commit -m "feat(atencion): resolucion de paciente y orquestacion crear+asignar en el store"
```

---

## Task F3: Rediseñar el paso 1 (verificar / alta mínima inline)

**Files:**
- Modify: `.../pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts`
- Test: `.../pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.spec.ts` (crear si no existe)

- [ ] **Step 1: Escribir el test que falla**

Crear/editar el spec (render con `ng test`; usa `provideMockStore`):

```ts
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DatosGeneralesStepComponent } from './datos-generales-step.component';
import { initialAtencionState, ATENCION_FEATURE_KEY } from '../../../../../store/atencion/atencion.state';
import { resolvePatientByDni, startAttentionForPatient } from '../../../../../store/atencion/atencion.actions';

describe('DatosGeneralesStepComponent', () => {
  let store: MockStore;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosGeneralesStepComponent],
      providers: [provideMockStore({ initialState: { [ATENCION_FEATURE_KEY]: initialAtencionState } })],
    }).compileComponents();
    store = TestBed.inject(MockStore);
  });

  it('con initialDni despacha resolvePatientByDni al iniciar', () => {
    const spy = vi.spyOn(store, 'dispatch');
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.componentRef.setInput('initialDni', '18901234');
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(resolvePatientByDni({ dni: '18901234' }));
  });

  it('confirmar con paciente resuelto y sin atencionId despacha startAttentionForPatient', () => {
    const fixture = TestBed.createComponent(DatosGeneralesStepComponent);
    fixture.componentRef.setInput('atencionId', null);
    fixture.detectChanges();
    store.setState({ [ATENCION_FEATURE_KEY]: { ...initialAtencionState, resolvedPatient: { id: 5 } as any } });
    store.refreshState();
    fixture.detectChanges();
    const spy = vi.spyOn(store, 'dispatch');
    fixture.componentInstance.onConfirm();
    expect(spy).toHaveBeenCalledWith(startAttentionForPatient({ patientId: 5, indications: null }));
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npm run test -- datos-generales-step`
Expected: FALLA — el componente todavía es el viejo (usa `lab-patient-search`, `onContinue`, redirect).

- [ ] **Step 3: Reescribir el componente**

Reemplazar `datos-generales-step.component.ts` por (smart component que lee el store y despacha; sin redirect ni sessionStorage):

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Patient, Gender, SexAtBirth } from '@features/pacientes/models/patient.model';
import {
  resolvePatientByDni, createPatientInline, updatePatientInline,
  startAttentionForPatient, assignGeneralData,
} from '../../../../../store/atencion/atencion.actions';
import {
  selectResolvedPatient, selectPatientResolving, selectPatientNotFoundDni,
} from '../../../../../store/atencion/atencion.selectors';

@Component({
  selector: 'lab-datos-generales-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './datos-generales-step.component.html',
})
export class DatosGeneralesStepComponent implements OnInit {
  private readonly store = inject(Store);

  readonly atencionId = input<number | null>(null);
  readonly initialDni = input<string | null>(null);

  protected readonly resolved   = this.store.selectSignal(selectResolvedPatient);
  protected readonly resolving   = this.store.selectSignal(selectPatientResolving);
  protected readonly notFoundDni = this.store.selectSignal(selectPatientNotFoundDni);

  protected readonly editing = signal(false);
  protected dniInput = '';
  protected indications = '';
  protected form = {
    dni: '', firstName: '', lastName: '', birthDate: '',
    gender: null as Gender | null, sexAtBirth: null as SexAtBirth | null,
  };

  // Cuando aparece "no existe", prellenar el DNI del alta
  private readonly _syncAlta = effect(() => {
    const dni = this.notFoundDni();
    if (dni && !this.form.dni) this.form.dni = dni;
  });

  ngOnInit(): void {
    const dni = this.initialDni();
    if (dni) { this.dniInput = dni; this.store.dispatch(resolvePatientByDni({ dni })); }
  }

  protected readonly canConfirm = computed(() => this.resolved() != null);

  buscar(): void {
    const dni = this.dniInput.trim();
    if (dni) this.store.dispatch(resolvePatientByDni({ dni }));
  }

  startEdit(): void {
    const p = this.resolved();
    if (!p) return;
    this.form = {
      dni: p.dni, firstName: p.firstName, lastName: p.lastName,
      birthDate: p.birthDate ?? '', gender: p.gender, sexAtBirth: p.sexAtBirth,
    };
    this.editing.set(true);
  }

  saveEdit(): void {
    const p = this.resolved();
    if (!p) return;
    this.store.dispatch(updatePatientInline({
      id: p.id,
      payload: {
        firstName: this.form.firstName, lastName: this.form.lastName,
        birthDate: this.form.birthDate || null, gender: this.form.gender, sexAtBirth: this.form.sexAtBirth,
        contacts: p.contacts, addresses: p.addresses, coverages: p.coverages,
      },
    }));
    this.editing.set(false);
  }

  altaValida(): boolean {
    const f = this.form;
    return !!(f.dni && f.firstName && f.lastName && f.birthDate && f.gender && f.sexAtBirth);
  }

  crearPaciente(): void {
    if (!this.altaValida()) return;
    const f = this.form;
    this.store.dispatch(createPatientInline({
      payload: {
        dni: f.dni, firstName: f.firstName, lastName: f.lastName,
        birthDate: f.birthDate, gender: f.gender, sexAtBirth: f.sexAtBirth,
        contacts: [], addresses: [], coverages: [],
      },
    }));
  }

  onConfirm(): void {
    const p = this.resolved();
    if (!p) return;
    const id = this.atencionId();
    if (id == null) {
      this.store.dispatch(startAttentionForPatient({ patientId: p.id, indications: this.indications || null }));
      return;
    }
    this.store.dispatch(assignGeneralData({
      id, payload: { patientId: p.id, doctorId: null, insurancePlanId: null, indications: this.indications || null },
    }));
  }
}
```

- [ ] **Step 4: Crear el template `datos-generales-step.component.html`**

```html
<div class="space-y-4">
  <!-- Búsqueda / re-búsqueda por DNI -->
  <div class="flex gap-2 items-end">
    <div class="flex-1">
      <label class="block text-sm">DNI del paciente</label>
      <input pInputText [(ngModel)]="dniInput" class="w-full" placeholder="Sin puntos" />
    </div>
    <p-button label="Buscar" [loading]="resolving()" (onClick)="buscar()" />
  </div>

  @if (resolving()) {
    <div class="opacity-70 text-sm">Verificando paciente…</div>
  }

  <!-- Caso A: existe -->
  @if (resolved(); as p) {
    @if (!editing()) {
      <div class="rounded border p-4 space-y-1">
        <div class="font-semibold">{{ p.firstName }} {{ p.lastName }}</div>
        <div class="text-sm">DNI {{ p.dni }}</div>
        <div class="text-sm opacity-70">Estado ficha: {{ p.status }}</div>
        <div class="pt-2 flex gap-2">
          <p-button label="Corregir datos" severity="secondary" [outlined]="true" (onClick)="startEdit()" />
        </div>
      </div>
    } @else {
      <div class="rounded border p-4 grid grid-cols-2 gap-3">
        <div><label class="block text-sm">Nombre</label><input pInputText [(ngModel)]="form.firstName" class="w-full" /></div>
        <div><label class="block text-sm">Apellido</label><input pInputText [(ngModel)]="form.lastName" class="w-full" /></div>
        <div><label class="block text-sm">Fecha nac.</label><input pInputText type="date" [(ngModel)]="form.birthDate" class="w-full" /></div>
        <div><label class="block text-sm">Género</label><input pInputText [(ngModel)]="form.gender" class="w-full" /></div>
        <div><label class="block text-sm">Sexo al nacer</label><input pInputText [(ngModel)]="form.sexAtBirth" class="w-full" /></div>
        <div class="col-span-2 flex justify-end"><p-button label="Guardar cambios" (onClick)="saveEdit()" /></div>
      </div>
    }
  }

  <!-- Caso B: no existe → alta mínima -->
  @if (notFoundDni() && !resolved()) {
    <div class="rounded border p-4 space-y-3">
      <div class="text-sm">No encontramos un paciente con DNI <b>{{ notFoundDni() }}</b>. Cargá los datos:</div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-sm">DNI</label><input pInputText [(ngModel)]="form.dni" class="w-full" /></div>
        <div><label class="block text-sm">Nombre</label><input pInputText [(ngModel)]="form.firstName" class="w-full" /></div>
        <div><label class="block text-sm">Apellido</label><input pInputText [(ngModel)]="form.lastName" class="w-full" /></div>
        <div><label class="block text-sm">Fecha nac.</label><input pInputText type="date" [(ngModel)]="form.birthDate" class="w-full" /></div>
        <div><label class="block text-sm">Género</label><input pInputText [(ngModel)]="form.gender" class="w-full" /></div>
        <div><label class="block text-sm">Sexo al nacer</label><input pInputText [(ngModel)]="form.sexAtBirth" class="w-full" /></div>
      </div>
      <div class="flex justify-end"><p-button label="Crear paciente" [disabled]="!altaValida()" (onClick)="crearPaciente()" /></div>
    </div>
  }

  <!-- Indicaciones + continuar -->
  <div>
    <label class="block text-sm">Indicaciones</label>
    <input pInputText [(ngModel)]="indications" class="w-full" />
  </div>
  <div class="flex justify-end">
    <p-button label="Confirmar y seguir" [disabled]="!canConfirm()" (onClick)="onConfirm()" />
  </div>
</div>
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npm run test -- datos-generales-step`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/
git commit -m "feat(atencion): paso 1 con verificacion y alta minima inline por DNI"
```

---

## Task F4: Bindear `?dni` en el wizard

**Files:**
- Modify: `.../pages/atencion/atencion-wizard/atencion-wizard.component.ts`

- [ ] **Step 1: Agregar el input `dni` y pasarlo al paso 1**

En `atencion-wizard.component.ts`, agregar el input (junto a `id` y `appointmentId`):

```ts
readonly dni = input<string | undefined>(undefined);
```

En el template, pasar `initialDni` a las dos instancias de `lab-datos-generales-step`:

```html
<!-- modo creating -->
<lab-datos-generales-step [atencionId]="null" [initialDni]="dni() ?? null" />
```
```html
<!-- @case ('datos') -->
<lab-datos-generales-step [atencionId]="detail()!.id" [initialDni]="dni() ?? null" />
```

(La ruta ya usa `withComponentInputBinding`, así que `?dni` se bindea solo. No hace falta tocar `analitica.routes.ts`.)

- [ ] **Step 2: Verificar build/typecheck**

Run: `npm run build`
Expected: compila sin errores de template/inputs.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/pages/atencion/atencion-wizard/atencion-wizard.component.ts
git commit -m "feat(atencion): el wizard bindea ?dni y lo pasa al paso 1"
```

---

## Task F5: Paso 2 con catálogo real (quitar el demo/mock)

**Files:**
- Modify: `.../features/analitica/services/analysis.service.ts`
- Delete: `.../features/analitica/services/analysis-demo-catalog.ts`
- Modify: `.../features/analitica/services/analysis.service.spec.ts`

- [ ] **Step 1: Buscar usos del demo mode**

Run: `grep -rn "demoMode\|analysis:demoMode\|ANALYSIS_DEMO" src/app`
Expected: ubica `analysis.service.ts`, `analysis-demo-catalog.ts` y cualquier toggle. Anotar los call sites de `setDemoMode(...)` para limpiarlos.

- [ ] **Step 2: Ajustar el spec (test que falla)**

En `analysis.service.spec.ts`, eliminar los tests que ejercitan el demo mode y dejar/añadir uno que afirme que SIEMPRE pega al backend:

```ts
it('searchByName siempre pega al backend (sin demo)', () => {
  let result: Analysis[] = [];
  service.searchByName('glu', 5).subscribe((r) => (result = r));
  const req = httpMock.expectOne('/api/v1/analitica/analysis?nameLike=glu&limit=5');
  expect(req.request.method).toBe('GET');
  req.flush([{ id: 1, shortCode: 1001, name: 'Glucosa', familyName: null, ubCount: 2 }]);
  expect(result).toHaveLength(1);
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npx vitest run src/app/features/analitica/services/analysis.service.spec.ts`
Expected: FALLA si el demo mode estuviera activable; o falla de compilación al haber removido tests que referencian símbolos que vamos a borrar. (Si pasa por casualidad, igual seguimos para borrar el demo.)

- [ ] **Step 4: Reescribir `analysis.service.ts` sin demo**

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Analysis, AnalysisDetail } from '../models/atencion.model';

@Injectable({ providedIn: 'root' })
export class AnalysisService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/analysis';

  findByShortCode(shortCode: number): Observable<Analysis | null> {
    const params = new HttpParams().set('shortCode', shortCode);
    return this.http.get<Analysis[]>(this.baseUrl, { params }).pipe(map(list => list[0] ?? null));
  }
  searchByShortCodePrefix(prefix: string, limit = 10): Observable<Analysis[]> {
    const params = new HttpParams().set('shortCodePrefix', prefix).set('limit', limit);
    return this.http.get<Analysis[]>(this.baseUrl, { params });
  }
  searchByName(nameLike: string, limit = 10): Observable<Analysis[]> {
    const params = new HttpParams().set('nameLike', nameLike).set('limit', limit);
    return this.http.get<Analysis[]>(this.baseUrl, { params });
  }
  getById(id: number): Observable<AnalysisDetail> {
    return this.http.get<AnalysisDetail>(`${this.baseUrl}/${id}`);
  }
}
```

(Si `findByShortCode` hoy pega a `?shortCode=` y devuelve un objeto único en vez de lista, mantener la forma actual del response — ajustar el `.pipe(map(...))` según corresponda. Verificar contra el código previo antes de cambiar la forma.)

- [ ] **Step 5: Borrar el catálogo demo y limpiar call sites**

```bash
git rm src/app/features/analitica/services/analysis-demo-catalog.ts
```
Eliminar cualquier `setDemoMode(...)` / referencia a `demoMode` encontrada en el Step 1 (ej. un botón de dev o un guard de entorno).

- [ ] **Step 6: Correr el test y verificar que pasa**

Run: `npx vitest run src/app/features/analitica/services/analysis.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/services/
git commit -m "refactor(atencion): paso 2 usa el catalogo real (sin demo/mock)"
```

---

## Task F6: Verificación integral del flujo (build + suites)

**Files:** ninguno (verificación).

- [ ] **Step 1: Backend — suite de atención**

Run (desde `Backend/.worktrees/atencion-recepcion`): `.\mvnw.cmd test -Dtest=EndSecretaryPhaseUseCaseTest,EndExtractionUseCaseTest`
Expected: PASS.

- [ ] **Step 2: Frontend — build + specs tocados**

Run (desde `FRONTEND-LABORATORIO/.worktrees/atencion-recepcion`):
```bash
npm run build
npx vitest run src/app/features/analitica/store/atencion/atencion.effects.spec.ts src/app/features/pacientes/services/patient.service.spec.ts src/app/features/analitica/services/analysis.service.spec.ts
npm run test -- datos-generales-step
```
Expected: build OK, specs PASS.

- [ ] **Step 3: Smoke manual (opcional, con app levantada)**

Levantar BE+FE del worktree con `start-worktree.ps1` y navegar a `/analitica/atencion/nueva?dni=<dni-existente>` (verificar) y `?dni=<dni-inexistente>` (alta inline) → cargar análisis → terminar → confirmar en logs/DB que se creó el protocolo y se encolaron rótulos (PrintJob/labels PENDING) y la atención quedó en `AWAITING_EXTRACTION`.

---

## Self-Review (cobertura del spec)

- **Spec §6 Paso 1 (verificar/alta inline, sin redirect):** Tasks F2 (resolución store) + F3 (componente) + F4 (?dni). ✔
- **Spec §7 Paso 2 (catálogo real):** Task F5. ✔
- **Spec §8 Paso 3 (protocolo ya existente + rótulos nuevos, transaccional):** Task B1; quitar de extracción → Task B2. ✔
- **Spec §9 Errores (español, sin leak):** los effects guardan `HttpErrorResponse` en el store; el render de errores debe pasar por el toast/helper del proyecto (regla #4 FE). Cubierto a nivel de captura; el mapeo a mensaje en español se aplica en el componente al leer `patientResolutionError`/`detailError` con el helper existente.
- **Spec §10 Testing:** tests en B1, B2, F1, F2, F3, F5 + verificación F6. ✔
- **getByDni faltante:** Task F1. ✔
- **Type consistency:** `Input(id, tenantId, userId)` usado igual en use case, test y controller (B1); `startAttentionForPatient({patientId, indications})`, `createPatientInline({payload})`, `updatePatientInline({id, payload})`, `resolvePatientByDni({dni})` consistentes entre actions/effects/reducer/componente. `CreatePatientRequest`/`UpdatePatientRequest` según `patient.model.ts`. ✔
- **Placeholders:** sin TODO/TBD; los dos `(verificar contra el código previo...)` en F5 son chequeos de forma de response, no placeholders de implementación.

---

## Addendum — Paso 2 backend: endpoint de búsqueda de análisis (KAN-77)

> Surgido del review final: la spec asumió que `/api/v1/analitica/analysis` (búsqueda) y `/api/v1/analitica/nbu/current` existían. **No existen.** Demo los tapaba; F5 los destapó. Decisiones del usuario (2026-06-04): la lista del paso 2 sale de **`TenantAnalysis`** (por tenant); **se construye la búsqueda ahora, el precio NBU (ubCount + valor UB) queda como follow-up** (el front oculta el precio cuando no hay valor NBU).

**Datos existentes** (verificado): `analysis_catalog` GLOBAL `{id, name, family_name, code, nbu_code, unit, sample_type, active}` (sin shortCode numérico, sin ubCount). `tenant_analysis` por tenant `{id, tenant_id, catalog_id, short_code(String), custom_name, active, deleted_at}`. `determination_catalog {id, name, unit, reference_values, analysis_catalog_id}`. NO existe valor NBU/UB en ninguna tabla. Flyway máx = V82 (no se necesita migración: no agregamos columnas).

**Contrato a servir** (el front ya consume estas URLs):
- `GET /api/v1/analitica/analysis?shortCode={s}` → `Analysis` o vacío.
- `GET /api/v1/analitica/analysis?shortCodePrefix={s}&limit={n}` → `Analysis[]`.
- `GET /api/v1/analitica/analysis?nameLike={s}&limit={n}` → `Analysis[]`.
- `GET /api/v1/analitica/analysis/{id}` → `AnalysisDetail`.
Donde `Analysis = { id, shortCode(String), name, familyName, ubCount: null }` y `AnalysisDetail = Analysis & { description: null, determinations: {id,name}[], processingTime: null, processingTimeUnit: null, nbuCode }`.

**Regla de mapeo (load-bearing):** `id = catalog_id` (la atención guarda analysisId = id del catálogo global; el protocolo resuelve por `AnalysisLookupPort` sobre `analysis_catalog`). `shortCode = tenant_analysis.short_code`. `name = COALESCE(tenant_analysis.custom_name, analysis_catalog.name)`. `familyName = analysis_catalog.family_name`. `nbuCode = analysis_catalog.nbu_code`. `ubCount = null` (precio diferido). Búsqueda SIEMPRE filtrada por `tenant_id` (del JWT) + `active`.

### Task P2-BE-1: Read port + queries (tenant_analysis ⨝ analysis_catalog)
- Puerto de lectura nuevo (p.ej. `TenantAnalysisSearchPort`) + proyección `{catalogId, shortCode, name, familyName, nbuCode}`.
- Adapter JPA con queries: por `short_code` exacto, por prefijo de `short_code` (limit), por `custom_name`/`analysis_catalog.name` LIKE (limit), y getById (catalogId → catálogo + sus determinaciones), todo tenant-scoped + active.
- Use case(s) `SearchTenantAnalysisUseCase` (byShortCode / byPrefix / byName) + `GetTenantAnalysisDetailUseCase`.
- Tests unitarios de los use cases (mock del puerto).

### Task P2-BE-2: Controller `/api/v1/analitica/analysis` + DTOs
- `AnalysisQueryController` con los 4 GET; tenantId via `TenantContext.requireTenantId()`; `@PreAuthorize` autenticado (SECRETARIA/ADMIN).
- DTOs `AnalysisResponse {id, shortCode, name, familyName, ubCount}` (ubCount null), `AnalysisDetailResponse {..., description, determinations[], processingTime, processingTimeUnit, nbuCode}` (description/processingTime null).
- Errores en español sin leak (regla #4).

### Task P2-FE-1: Reconciliar el modelo FE con el contrato real
- `Analysis.shortCode: number → string` (es String en el dominio). Ajustar `AnalysisService.findByShortCode(shortCode: string)` y el `AnalysisPickerComponent` (handleEnter pasa el string crudo, sin `Number()`). Actualizar specs. `npm run build` + specs verdes.

### Follow-up (NUEVO ticket, fuera de KAN-77): precio NBU
- Modelar valor UB (entidad + tabla + `/api/v1/analitica/nbu/current`) y `ubCount` por práctica (columna en catálogo + seed). Definir quién carga el valor de la UB y el origen de los ubCount.
