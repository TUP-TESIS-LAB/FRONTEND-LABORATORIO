# Procesamiento — Arco 4: Validación postanalítica (sin firma)

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Fecha:** 2026-06-14
> **Rama:** `feat/procesamiento-validacion` (worktree `FRONTEND-LABORATORIO-validacion`, base `development`)
> **Backend:** módulo `postanalitica` ya en development (endpoints validate/validate-all/sign).

## Contexto

Cuarto y último arco funcional del rediseño de Procesamiento. Implementa la **validación postanalítica**: el bioquímico revisa las determinaciones de cada resultado (cada una con un `aggregateOutcome` calculado por reglas automáticas) y setea su validación manual (PASS/WARNING/FAIL). El resultado transiciona a VALIDATED (o REJECTED si alguna determinación es FAIL).

**No tiene mockup** (el mockup `procesamiento-angular` termina en carga de resultados); se diseña desde el contrato del backend.

### Decisión de alcance: media implementación, corta ANTES de la firma

La UX de **firma** todavía no está definida. Este arco avanza **hasta** la firma pero **no la implementa**: en cada resultado VALIDATED se muestra un botón **"Firmar" deshabilitado ("próximamente")** marcando el lugar, y al pie un **"Firmar estudio" deshabilitado**. La firma (habilitar esos botones + `POST /sign` + seed de firma del empleado) queda para un arco futuro cuando se defina su UX.

### Dependencia de datos

El `PostAnalyticalStudy` + sus `PostAnalyticalResult` + validaciones se crean automáticamente cuando se hace **mark-ready** en el Arco 3b (evento interno `results/ready`). Para la demo: usar primero la carga de resultados (3b) y marcar completadas; recién ahí hay un estudio para validar.

## Objetivo

Desde procesamiento, abrir una pantalla per-protocolo que liste los resultados del estudio postanalítico con sus determinaciones (outcome automático), permita validar cada determinación (o todas) y refleje el estado del resultado. Corta antes de firmar.

## Requisitos

1. **Entrada:** en el worklist de procesamiento, al seleccionar **un** tubo se habilita un botón **"Validación"** → navega a `procesamiento/validacion/:protocolId` (protocolId del tubo). (Junto a "Planillas" y "Cargar resultados".)
2. **Carga de la vista** (`protocolId`):
   - `GET /api/v1/analitica/postanalitica/studies/{protocolId}` → estudio (status, expected/signed counts). Si 404 (no hay estudio aún) → estado vacío con mensaje "Todavía no hay estudio: cargá y marcá resultados primero".
   - `GET /api/v1/analitica/postanalitica/studies/{protocolId}/results/validation` → `ResultWithValidation[]`: por resultado, su status + por determinación `{ determinationId, aggregateOutcome, manualOutcome }`.
   - **Nombres de determinaciones**: reusar `ResultadosApiService` (de Arco 3b) — por cada result, `GET /resultados/{analyticResultId}/determinations` (id→`determinationCatalogId`) + `GET /determination-catalog/{id}` para el nombre. Ensamblar una vista con nombres.
   - Ensamblar `ValidationView` (función pura, testeable).
3. **Validar una determinación:** control PASS/WARNING/FAIL por determinación → `POST /results/{resultId}/validate` body `{ determinationId, outcome }`. Mutación pesimista (recarga la vista).
4. **Validar todas:** botón "Validar todas como…" por resultado → `POST /results/{resultId}/validate-all` body `{ outcome }`. Pesimista.
5. **Estados:** badge por resultado (PENDING/VALIDATING/VALIDATED/REJECTED/SIGNED) y por determinación (aggregate auto + manual). Badge del estudio (PENDING/PARTIALLY_SIGNED/READY_FOR_SIGNATURE/CLOSED).
6. **Placeholder de firma:** por resultado VALIDATED, botón **"Firmar" deshabilitado** (title "Próximamente"). Al pie, **"Firmar estudio" deshabilitado**. Sin acción.
7. Errores en español (`humanizeBackendError` + toast), sin leak. `p-dialog`/PrimeIcons si aplica, OnPush, signals.

## Fuera de alcance (Arco 4)

- **Firma** (sign result / sign study) — arco futuro (UX sin definir) + seed de firma del empleado.
- Crear/editar el estudio o las reglas de validación.
- Reportes/PDF, trazabilidad, delta check.
- Mostrar los valores numéricos de las determinaciones (ya están en la pantalla de 3b); acá el foco es el outcome.

## Diseño

### Service `PostanaliticaApiService` (en `muestras/services/`)

- `getStudy(protocolId): Observable<Study>` → `GET .../postanalitica/studies/{protocolId}`.
- `getResultsValidation(protocolId): Observable<ResultWithValidation[]>` → `GET .../postanalitica/studies/{protocolId}/results/validation`.
- `validateDetermination(resultId, body): Observable<DeterminationValidation>` → `POST .../postanalitica/results/{resultId}/validate` `{ determinationId, outcome }`.
- `validateAll(resultId, outcome): Observable<Result>` → `POST .../postanalitica/results/{resultId}/validate-all` `{ outcome }`.

Reuso de `ResultadosApiService` (Arco 3b) para `getDeterminations` + `getDeterminationCatalog` (nombres).

### Modelos (en `muestras/models/postanalitica.model.ts`)

```ts
type ValidationOutcome = 'PASS' | 'WARNING' | 'FAIL';
type ResultStatus = 'PENDING' | 'VALIDATING' | 'VALIDATED' | 'REJECTED' | 'SIGNED';
type StudyStatus = 'PENDING' | 'PARTIALLY_SIGNED' | 'READY_FOR_SIGNATURE' | 'CLOSED';

interface Study { id: number; protocolId: number; patientId: number; currentStatus: StudyStatus; expectedResultsCount: number; signedResultsCount: number; }
interface PostResult { id: number; studyId: number; analyticResultId: number; status: ResultStatus; sectionId: number; }
interface DetValidation { id: number; resultId: number; determinationId: number; aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null; }
interface ResultWithValidation { result: PostResult; validations: { validation: DetValidation }[]; }

// Vista ensamblada (con nombres):
interface ValidationRow { determinationId: number; name: string; aggregateOutcome: ValidationOutcome | null; manualOutcome: ValidationOutcome | null; }
interface ValidationResultVM { resultId: number; status: ResultStatus; rows: ValidationRow[]; }
interface ValidationView { protocolId: number; studyStatus: StudyStatus | null; results: ValidationResultVM[]; }
```

Función pura `buildValidationView({ protocolId, study, resultsWithValidation, nameByDeterminationId }): ValidationView`.

### Store nuevo `postanalitica` (NgRx clásico)

- **State:** `{ view: ValidationView | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null }`.
- **Actions:** `loadValidation({protocolId})`/`...Success({view})`/`...Failure({error})`; `validateDet({resultId, determinationId, outcome})`/`validateDetSuccess`/`validateDetFailure({error})`; `validateAll({resultId, outcome})`/`validateAllSuccess`/`validateAllFailure({error})`.
- **Effects:** `loadValidation$` (fan-out: study + results-validation + nombres → buildValidationView; el 404 de study se trata como `studyStatus: null` + sin results); `validateDet$` y `validateAll$` (pesimistas) → success → `reloadAfterMutation$` (re-loadValidation del protocolo actual).
- **Selectors:** `selectValidationView`, `selectPostanaliticaLoading`, `selectPostanaliticaSaving`, `selectPostanaliticaError`.
- Registro en `app.config.ts` (junto a resultados/worksheetTemplates).

### Componentes (en `muestras/`)

- **`pages/validacion/validacion.page`** (ruta `procesamiento/validacion/:protocolId`, guard `ANALITICA`): lee protocolId, `dispatch(loadValidation)`, host de la tabla de validación, toast de error, "← Volver". Botón "Firmar estudio" deshabilitado al pie.
- **`components/validation-table/validation-table.component`**: input `results: ValidationResultVM[]`; por result: badge de estado + filas de determinación con badge `aggregateOutcome` y un control de `manualOutcome` (3 botones PASS/WARNING/FAIL); botón "Validar todas"; botón "Firmar" deshabilitado en results VALIDATED. Emite `validate({resultId, determinationId, outcome})` y `validateAll({resultId, outcome})`.

### Wiring en `worklist.page` (procesamiento)

- Reusar `selectedTubeProtocolId` (ya existe de Arco 3b).
- Agregar botón **"Validación"** (solo procesamiento, `showWorksheetActions`): `[disabled]="selectedTubeProtocolId() == null"` → `router.navigate(['/analitica/procesamiento/validacion', pid])`.

## Mapeo de estados / badges

- Determinación: `aggregateOutcome` (auto, read-only) + `manualOutcome` (editable).
- Result: PENDING/VALIDATING/VALIDATED/REJECTED/SIGNED (color: amber/blue/green/red/slate).
- Study: PENDING/PARTIALLY_SIGNED/READY_FOR_SIGNATURE/CLOSED.

## Testing

- **Service:** cada método pega a la URL/método/body correctos (HttpTestingController).
- **`buildValidationView`:** ensambla results + nombres; maneja study null (404).
- **Reducer/Effects:** load (fan-out + 404 study), validateDet, validateAll, reload; failures mapeadas.
- **`validation-table` (smoke):** renderiza results/filas; setear manualOutcome emite `validate`; "Validar todas" emite `validateAll`; "Firmar" disabled en VALIDATED.
- **`validacion.page` (smoke):** lee protocolId, dispatch loadValidation, "Firmar estudio" disabled.
- **`worklist.page`:** botón Validación habilitado con 1 tubo.

## Riesgos / notas

- Fan-out de nombres (results × determinaciones × catálogo) reusa `ResultadosApiService`; con el seed (≤4 results) es trivial.
- 404 de `GET /studies/{protocolId}` cuando no hubo mark-ready → estado vacío claro, no error.
- La firma deshabilitada es deuda intencional hasta definir su UX (arco futuro: seed firma empleado + `POST /sign`).
- `aggregateOutcome`/`manualOutcome` pueden venir null (determinación sin regla / sin validar) — la vista los maneja.
