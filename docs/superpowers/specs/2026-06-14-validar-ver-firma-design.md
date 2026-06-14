# Pantalla "Validar / Ver + Firmar" de postanalítica — diseño

> **Jira:** pendiente (crear al pasar a plan, salvo decisión explícita en contra).
> **Fecha:** 2026-06-14
> **Rama:** `feat/validacion-detalle-firma` (front) · `feat/validacion-detalle-firma-be` (back, a crear)
> **Pantalla:** detalle de un protocolo en el subtab Validación, ruta `/analitica/validacion/:protocolId`.
> **Repos:** front (`FRONTEND-LABORATORIO`) + back (`Backend`, módulo `analitica/postanalitica`).

## Contexto

El subtab **Validación** lista protocolos pendientes de firma (ya integrado al back, arco
anterior). Al entrar a un protocolo se abre el **detalle** donde el bioquímico:
1. revisa cada análisis y sus determinaciones (valor, unidad, rango, fuera de rango, outcome
   automático),
2. **valida** manualmente (PASS / WARNING / FAIL) por determinación o "todas" por análisis,
3. **firma** los resultados validados (parcial) y el estudio completo (total).

Hoy esa ruta carga `validar-protocolo.page` que es **100% mock** (`validacion-protocolos.mock.ts`,
en memoria, sin back). En paralelo existe una pantalla del Arco 4 (`validacion.page`, ruta
`/analitica/procesamiento/validacion/:id`) que **sí** pega al back pero es cruda (tabla
PASS/WARNING/FAIL, sin valores ni firma) y **no está cableada** desde el listado.

Este arco **unifica**: reconstruye `/analitica/validacion/:protocolId` con la UX del mock pero
**real**, y elimina la duplicación.

### Estado del backend (verificado)

La mayor parte del backend de validación y **toda la firma ya existen**:

- **Validación:** `ResultValidationController`:
  - `GET /api/v1/analitica/postanalitica/studies/{protocolId}/results/validation` →
    `ResultWithValidation[]` (result + `DeterminationValidation` con `aggregateOutcome` automático y
    `manualOutcome` manual + `ValidationRuleExecution[]` con mensajes de regla). **No** trae nombre,
    valor, unidad ni rango de la determinación → el front hoy hace **fan-out** (N+1) a
    `resultados/determinations/{id}` y al catálogo. Roles: `BIOQUIMICO`, `ADMINISTRADOR`, `TECNICO_LABORATORIO`.
  - `POST /results/{resultId}/validate` (una determinación: `{determinationId, outcome}`).
  - `POST /results/{resultId}/validate-all` (`{outcome}`).
- **Firma:** `SignatureController` (roles `BIOQUIMICO`, `ADMINISTRADOR`):
  - `POST /results/{resultId}/sign` — exige resultado en estado **VALIDATED**.
  - `POST /studies/{protocolId}/sign` — exige estudio en **READY_FOR_SIGNATURE**; genera PDF final
    (OpenPDF real) y si falla hace rollback; transiciona a **CLOSED**.
  - Request DTO: `{ signerRegistration: @NotBlank, token: @NotBlank }`.
  - `SignatureValidationPort` es un **stub**: **ignora el `token`** y solo exige que el empleado
    firmante (resuelto del claim `userId` del JWT) tenga `employees.signature` (PNG Base64) cargada;
    si no, rechaza con "El empleado no tiene firma electrónica registrada".
  - Persiste `ResultSignature`/`StudySignature` (signerEmployeeId, signerRegistration, token ref,
    integrityHash, signedAt). Recalcula progreso del estudio (`signed_results_count`, `StudyStatus`).
- **Estados:** `PostAnalyticalResultStatus`: PENDING→VALIDATING→VALIDATED→(REJECTED|SIGNED).
  `StudyStatus`: PENDING→PARTIALLY_SIGNED→READY_FOR_SIGNATURE→CLOSED.
- **Seed (V959/V909):** hay datos firmables (estudio protocolo 50015 en READY_FOR_SIGNATURE, resultado
  56011 en VALIDATED) **pero ningún empleado tiene `signature`** → firmar fallaría hoy.

## Objetivo

Una sola pantalla real en `/analitica/validacion/:protocolId` que, en una sola llamada de carga
(sin fan-out), muestre el detalle del protocolo y permita validar y firmar contra el backend
existente; y dejar el seed local en un estado donde la firma funcione end-to-end.

## Decisiones (acordadas con el usuario)

- **UX final:** la del mock (`validar-protocolo`): header de paciente/protocolo + **accordion por
  análisis** con tabla de determinaciones.
- **Firma:** por resultado individual (cuando VALIDATED = *firma parcial*) **y** por estudio completo
  (cuando READY_FOR_SIGNATURE = *firma total*). Es exactamente lo que exponen los endpoints.
- **Matrícula del firmante:** **automática**. El login no expone `registration`; en vez de mandarla
  desde el cliente, **el backend la deriva del empleado del token** al firmar (más seguro). La UX de
  firma es un **confirm** (sin pedir matrícula).
- **Firma simple (opción a):** firmar = estado SIGNED/CLOSED + bioquímico (del token) + timestamp +
  PDF (ya existente). Sin captura de imagen de firma en la UI (la imagen vive en el empleado).

## Diseño backend (`analitica/postanalitica`)

### 1. Endpoint de detalle enriquecido (mata el fan-out)

Nuevo endpoint de lectura que arma, **en una sola query por protocolo**, lo que la pantalla necesita:

`GET /api/v1/analitica/postanalitica/studies/{protocolId}/results/detail`

Respuesta (paralela a `ResultWithValidation`, pero con datos de la determinación incluidos):

```
StudyDetailResponse {
  study: { protocolId, currentStatus, expectedResultsCount, signedResultsCount }
  results: [
    {
      resultId, status,                       // PostAnalyticalResultStatus
      sectionId,
      determinations: [
        {
          determinationId,
          name,            // determination_catalog.name
          value,           // determination.result_value (String)
          unit,            // determination_catalog.unit
          referenceRange,  // determination_catalog.reference_values
          aggregateOutcome,// PASS|WARNING|null (automático)
          manualOutcome,   // PASS|WARNING|FAIL|null (manual)
          outOfRange       // boolean derivado (aggregateOutcome == WARNING por REFERENCE_RANGE)
        }
      ]
    }
  ]
}
```

- Use-case + DTO nuevos (no se toca el endpoint `results/validation` existente; este se **agrega**).
- Resolver con joins `post_analytical_results` → `determinations` → `determination_catalog`
  (catálogo es global, sin tenant) y las `determination_validations` por determinación. Evitar N+1
  server-side (joins por página/estudio, no una query por fila).
- `outOfRange`: derivado de `aggregateOutcome == WARNING` (regla REFERENCE_RANGE). No se persiste flag.
- Mismos roles que el resto del detalle (`BIOQUIMICO`, `ADMINISTRADOR`, `TECNICO_LABORATORIO`).

> El header de **paciente** (nombre/sexo/edad) lo puede traer este endpoint o reutilizar el dato que
> ya trae el listado (la fila navega con esos datos). Decisión de implementación: si es barato,
> incluir `patientName/patientSex/patientBirthDate` en `study` para que el detalle sea autosuficiente
> (mismo patrón que el listado). Si no, el front los pasa por navegación/estado.

### 2. Firma: derivar `signerRegistration` server-side

`SignResultRequest`/`SignStudyRequest` hoy exigen `signerRegistration` y `token` (`@NotBlank`). Para
la UX "automática":

- El backend **deriva `signerRegistration` del empleado del token** (`employeeId` → `Employee.registration`)
  en `SignResultUseCase`/`SignStudyUseCase`, **ignorando/sobreescribiendo** el valor del request.
- `signerRegistration` en el request pasa a **opcional** (se relaja `@NotBlank`); `token` se mantiene
  (el front manda un placeholder, p.ej. `"ui-confirm"`; el stub lo ignora).
- Mensajes de error en español sin leak (regla del proyecto): el rechazo por "sin firma registrada"
  ya viene en español; mapear cualquier 4xx/5xx a copy de dominio en el front.

> Alternativa descartada: exponer `registration` en el payload de login/`/me` y mandarla desde el
> cliente. Derivar server-side es más seguro (el cliente no afirma su propia matrícula) y evita tocar
> el contrato de auth.

### 3. Seed de firma del empleado (local)

Migración en `db/migration-local` que **carga una `signature` (PNG Base64) en el empleado bioquímico**
usado para probar firma localmente, de modo que la firma funcione end-to-end con el seed.

- Verificar en el plan **qué empleado corresponde al login de prueba** (`admin@test.com`): si `admin`
  no tiene `Employee` con rol firmante, seedear/asociar uno (o documentar que la firma se prueba con
  el bioquímico `BQ-9001`, empleado 65001, y asegurar credenciales de login para ese usuario).
- La imagen puede ser un PNG mínimo (un trazo) en Base64 — es presentacional para el PDF.

## Diseño frontend (`FRONTEND-LABORATORIO`)

Patrón: **NgRx clásico** (skill `ngrx-backend-request`). Pantalla en
`features/analitica/muestras/pages/validacion-protocolos/validar-protocolo/` (reescribir el componente
mock existente; misma ruta `/analitica/validacion/:protocolId`).

### Modelos (`muestras/models/postanalitica.model.ts`)

```ts
interface DetalleDeterminacion {
  determinationId: number; name: string; value: string;
  unit: string; referenceRange: string;
  aggregateOutcome: ValidationOutcome | null;
  manualOutcome: ValidationOutcome | null;
  outOfRange: boolean;
}
interface DetalleResultado {
  resultId: number; status: ResultStatus; sectionId: number;
  determinations: DetalleDeterminacion[];
}
interface DetalleEstudio {
  protocolId: number; currentStatus: StudyStatus;
  expectedResultsCount: number; signedResultsCount: number;
  // header de paciente si el back lo expone:
  patientName?: string; patientSex?: string | null; patientBirthDate?: string | null;
  results: DetalleResultado[];
}
```

### Service (`PostanaliticaApiService`)

- `getDetalle(protocolId): Observable<DetalleEstudio>` → nuevo endpoint `/results/detail`.
- `validateDet(resultId, determinationId, outcome)` y `validateAll(resultId, outcome)` → ya existen
  como métodos; reutilizar.
- `signResult(resultId): Observable<…>` → `POST /results/{id}/sign` con body `{ token: 'ui-confirm' }`
  (sin `signerRegistration`; el back la deriva).
- `signStudy(protocolId): Observable<…>` → `POST /studies/{id}/sign` con body `{ token: 'ui-confirm' }`.

### Store (slice del detalle)

Estado `{ detalle: DetalleEstudio | null, pending, saving, error }`. Acciones:
- `loadDetalle({ protocolId })` / success / failure (read → `switchMap`).
- `validateDet` / `validateAll` (mutation → `concatMap`), `reload` del detalle tras éxito.
- `signResult({ resultId })` / `signStudy({ protocolId })` (mutation → `concatMap`/`exhaustMap`),
  `reload` tras éxito (refresca estados y contadores).
- `catchError` dentro del operador; error `HttpErrorResponse`.

> Puede ser un slice nuevo (`store/validacion-detalle/`) o extender `store/postanalitica/`. Decisión
> en el plan; preferir un slice enfocado por responsabilidad.

### UI (reescritura de `validar-protocolo.page`)

- **Header:** paciente (`Apellido, Nombre · {sexo} {edad}a`, edad derivada con `calcularEdad`), código
  de protocolo, badge de estado de firma del estudio (`currentStatus`).
- **Accordion por análisis (resultado):** título del análisis + estado del resultado
  (VALIDATING/VALIDATED/SIGNED/REJECTED) + botón **"Validar todo"** (PASS) y, cuando VALIDATED, botón
  **"Firmar"** (firma parcial del resultado).
  - **Tabla de determinaciones:** `nombre | valor (+marca H/L si outOfRange) | unidad | referencia |
    automático (badge aggregateOutcome) | validación manual (PASS/WARNING/FAIL)`.
- **Footer del estudio:** botón **"Firmar estudio"** habilitado solo cuando
  `currentStatus === READY_FOR_SIGNATURE`. Al firmar el estudio, pasa a CLOSED (read-only).
- **Firma = confirm:** al apretar Firmar/Firmar estudio, un confirm corto ("¿Firmar como
  bioquímico?") y se dispara la acción (sin pedir matrícula).
- **Errores en español** (incluida la firma sin imagen registrada): mapear `HttpErrorResponse` a copy
  de dominio; nada de leaks.
- Sin badge URGENTE; sin obra social/sección/NBU (igual que el listado).

### Limpieza (parte del arco)

- Borrar el mock `validacion-protocolos.mock.ts` (ya nadie lo usará tras reescribir `validar-protocolo`).
- Eliminar la pantalla duplicada del Arco 4: componente `pages/validacion/validacion.page.ts` + su ruta
  `/analitica/procesamiento/validacion/:protocolId` (y revisar si algo la enlaza; el botón "Validación"
  de procesamiento debe apuntar a la ruta unificada o quedar consistente).
- Registrar el nuevo store en `app.config.ts`.

## Fuera de alcance

- Captura/edición de la **imagen de firma** del empleado desde la UI (la imagen vive en el empleado;
  acá solo se usa para el PDF). Si se quiere subir/editar firma, es otro arco.
- Edición de resultados ya firmados (`PUT …/determinations/{id}` existe pero no se expone acá).
- Validación criptográfica real del token (el port es stub a propósito).
- Reportes/descarga de PDF en la UI (el PDF se genera y guarda en el back; mostrarlo/descargarlo es
  otro arco).
- `urgente`, obra social, sección, NBU.

## Testing

**Backend:**
- El endpoint `/results/detail` devuelve, por determinación, `name/value/unit/referenceRange/
  aggregateOutcome/manualOutcome/outOfRange` con los valores del seed; una query por estudio (sin N+1).
- Firma: con un empleado **con** `signature` seedeada, `sign result` (sobre un VALIDATED) y `sign
  study` (sobre un READY_FOR_SIGNATURE) responden OK y transicionan estados; sin `signature` →
  rechazo en español. `signerRegistration` se deriva del empleado (request sin matrícula funciona).
- Roles: validar permite TECNICO; firmar solo BIOQUIMICO/ADMINISTRADOR.

**Frontend:**
- Service tipa los modelos; el detalle se arma con **una** llamada (sin fan-out).
- Store: reducers/effects de load/validate/sign (pessimistic, reload tras éxito, error tipado).
- Page: smoke de accordion, validación manual, y habilitación de "Firmar"/"Firmar estudio" según
  estado; confirm dispara la acción; errores en español.
- Smoke visual end-to-end con back + seed (firma funcional).

## Riesgos / notas

- **Firma local depende del seed:** sin `employees.signature` la firma falla. El seed de firma es
  parte de este arco; verificar el mapeo `admin@test.com` ↔ empleado firmante en el plan.
- **Relajar `@NotBlank signerRegistration`** es un cambio de contrato aditivo/compatible (sigue
  aceptando el campo; ya no lo exige). Documentar.
- **Eliminar la pantalla del Arco 4** debe verificar que ninguna otra ruta/menú dependa de
  `/analitica/procesamiento/validacion/:id`.
- El header de paciente en el detalle: si el back no lo incluye, el front lo pasa por estado de
  navegación desde la fila del listado (que ya tiene esos datos).
```
