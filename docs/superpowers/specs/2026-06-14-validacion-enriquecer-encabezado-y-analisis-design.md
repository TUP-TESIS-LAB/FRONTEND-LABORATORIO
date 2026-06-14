# Validación postanalítica — listado de protocolos pendientes de firma

> **Jira:** sin ticket (decisión explícita del usuario).
> **Fecha:** 2026-06-14
> **Rama:** `feat/validacion-subtab`
> **Pantalla:** subtab **Validación** de Muestras (listado). Hoy con datos mock
> (`validacion-protocolos.mock.ts`). **NO** cubre la pantalla interna de validar/ver.
> **Backend:** módulo `postanalitica` (laboratorio monolito).

## Contexto

El subtab **Validación** (primera pantalla, `/analitica/validacion`) lista los
**protocolos con resultados cargados, pendientes de firma bioquímica**. Cada fila
muestra: código de protocolo, paciente (`Apellido, Nombre · M 54a`), cantidad de
análisis, cantidad de determinaciones, cuántos análisis están firmados, fecha/hora
y un badge de estado de firma (sin / parcial / total). Arriba, tres contadores
(sin firma · parcial · total) y filtros por ese estado.

Hoy esa pantalla usa **datos mock en memoria**
(`src/app/features/analitica/muestras/data/validacion-protocolos.mock.ts`). No pega
al backend.

El backend ya tiene el endpoint base que lista estudios postanalíticos:

- `GET /api/v1/analitica/postanalitica/studies` (paginado, filtro opcional por
  estado) → `Page<StudyResponse>`, vía `ListStudiesUseCase`.
- Pero `StudyResponse` devuelve **solo IDs y contadores de resultados**:
  `id, tenantId, protocolId, patientId, currentStatus, expectedResultsCount,
  signedResultsCount`. **No trae** nombre de paciente, sexo, edad, código legible
  de protocolo, fecha, ni los counts de análisis/determinaciones que la fila
  necesita.

Este cambio **enriquece el listado** (`StudyResponse` + use-case) para que la fila
del subtab se arme con **una sola llamada**, sin fan-out por fila.

> **Scope acotado con el usuario:** solo la **primera pantalla** (listado). La
> pantalla interna de validar/ver (detalle por protocolo, `/results/validation`,
> eliminación de fan-out de nombres de análisis, firma) **queda fuera de este spec**.

## Objetivo

Que `GET /studies` (paginado, filtrable por estado) devuelva, por estudio, todos
los campos que la fila del listado de Validación necesita, sin llamadas extra por
fila.

## Alcance — campos de la fila (verificados contra el esquema)

Acordado con el usuario. Orígenes confirmados leyendo las migraciones Flyway del
backend (`db/migration`).

### Campos a agregar a la respuesta del listado

| Campo nuevo | Tipo | Origen backend (verificado) | Nota |
|---|---|---|---|
| `protocolCode` | string | **derivado** de `protocols.created_at` + `protocols.id` | `protocols` NO tiene columna de código legible. El back arma el código, ver §"protocolCode". |
| `patientName` | string | `patients.last_name + ", " + first_name` | join por `patientId`, mismo tenant. |
| `patientSex` | string \| null | `patients.sex_at_birth` (fallback `gender`) | ambas columnas existen (`VARCHAR(50) NULL`). Para `M 54a`. |
| `patientBirthDate` | string (ISO date) \| null | `patients.birth_date` (`DATE NULL`) | el back manda la fecha; el front deriva la edad (no asumir "hoy" en el back). |
| `date` | string (ISO) | `post_analytical_studies.updated_at` (o `created_at`) | timestamp del estudio; exponer el existente. |
| `analysisCount` | number | `count(analysis_orders)` por `protocol_id` (tenant) | `analysis_orders(protocol_id, tenant_id)` ya indexado. |
| `determinationCount` | number | `count(determinations)` de los `analytical_results` del protocolo | count de cardinalidad baja por protocolo. |
| `signedAnalysisCount` | number | resultados firmados del estudio | mapea a "X de N firmados" de la fila. Ver §"counts de firma". |

Ya disponibles (no se tocan): `currentStatus`, `expectedResultsCount`,
`signedResultsCount`, `protocolId`, `patientId`.

### Estado de firma de la fila

El mock deriva `'sin' | 'parcial' | 'total'`. Mapea directo a `StudyStatus` que el
back **ya** expone en `currentStatus`:

| Mock (`estadoProt`) | `StudyStatus` backend | Badge |
|---|---|---|
| `sin` (0 análisis firmados) | `PENDING` | "Sin firma" |
| `parcial` (algunos) | `PARTIALLY_SIGNED` | "Firma parcial" |
| `total` (todos) | `READY_FOR_SIGNATURE` **o** `CLOSED` | "Firma total" |

El front mapea `currentStatus` → badge/filtro. **No hace falta** un campo nuevo de
estado: se reutiliza `currentStatus`. Los **filtros** del listado (Todos / Sin firma
/ Firma parcial / Firma total) se traducen al parámetro `status` que `GET /studies`
ya acepta (o se filtran client-side sobre la página traída — decisión del front, ver
§Frontend).

### Explícitamente FUERA de este listado

- **`urgente` / badge URGENTE**: no existe el concepto en el esquema (ni `protocols`
  ni `analysis_orders` tienen prioridad). Se **omite** de la fila por ahora; el front
  no renderiza el badge hasta que exista el dato.
- Obra social / cobertura, sección, NBU.
- Todo lo de la pantalla de detalle (validar/ver): determinaciones individuales,
  nombres de análisis por resultado, flag H/L, firma. **Otro spec.**

## Diseño backend (laboratorio)

> Repos separados: este spec vive en el front, pero el cambio de contrato se
> implementa en el backend (`/home/leon/Escritorio/TTL/laboratorio`). Acá se define
> **qué** debe devolver; la implementación sigue el flujo SDD del back (incluido
> Jira del backend si corresponde a sus reglas).

### 1. Enriquecer `StudyResponse` (listado)

Record actual:
`StudyResponse(id, tenantId, protocolId, patientId, currentStatus, expectedResultsCount, signedResultsCount)`

Agregar: `protocolCode, patientName, patientSex, patientBirthDate, date,
analysisCount, determinationCount, signedAnalysisCount`.

- El use-case que arma la página (`ListStudiesUseCase` + su mapper a DTO) debe:
  - joinear `patients` por `patientId` (mismo tenant) → nombre/sexo/fecha nac.
  - resolver `protocolCode` desde el protocolo (`created_at` + `id`).
  - resolver `analysisCount` (count de `analysis_orders` del protocolo) y
    `determinationCount` (count de `determinations` de los `analytical_results` del
    protocolo).
- Mantener todos los campos existentes; solo se **agregan** (cambio aditivo).
- Evitar N+1 server-side: resolver los counts y el join de paciente con una query
  por página (join/group-by), no una query por fila.

### 2. `protocolCode` (derivado, sin migración)

`protocols` solo tiene `id` numérico. El back arma un código legible **determinístico**
a partir de datos que ya existen, sin columna nueva ni Flyway:

- Formato sugerido: `P-{yyMM de created_at}-{id en 4 dígitos, zero-padded}`
  (ej. protocolo id 41 creado en jun-2026 → `P-2606-0041`).
- Implementarlo en un único helper del dominio/aplicación del back (no en el front)
  para que el código sea consistente en cualquier pantalla que lo use a futuro.
- Es **presentacional**: no se persiste, no es clave de negocio. La clave sigue
  siendo `protocolId`.

### 3. Counts de firma de la fila

La fila muestra "`signedAnalysisCount` de `analysisCount` firmados". Definir en el
back, contra el modelo postanalítico, qué cuenta como "análisis firmado":

- `signedResultsCount` del estudio ya cuenta resultados firmados → si la relación
  análisis↔resultado es 1:1 (lo es: `analytical_results` 1:1 con `analysis_orders`),
  `signedAnalysisCount` = `signedResultsCount`. Confirmar en implementación.

### Coste

Joins de cardinalidad baja (1 paciente por estudio; counts por protocolo). Reemplazan
el mock por una query por página. Las FKs usadas (`analysis_orders.protocol_id`,
`patient_id`) ya están indexadas. Sin índices nuevos.

## Diseño frontend (este repo)

> El front HOY usa mock. Este spec define el contrato del back; la integración real
> del front (reemplazar el mock por el store) se hace cuando el back emita los campos.
> Patrón de consumo: **ngrx clásico** (ver skill `ngrx-backend-request`), igual que
> `store/postanalitica`.

### Modelo (`muestras/models/postanalitica.model.ts` o nuevo modelo de listado)

```ts
export interface ValidationListRow {
  studyId: number;
  protocolId: number;
  protocolCode: string;
  patientName: string;          // "Apellido, Nombre"
  patientSex: string | null;    // "M" | "F" | null
  patientBirthDate: string | null; // ISO date; el front deriva la edad
  date: string;                 // ISO
  currentStatus: StudyStatus;   // PENDING | PARTIALLY_SIGNED | READY_FOR_SIGNATURE | CLOSED
  analysisCount: number;
  determinationCount: number;
  signedAnalysisCount: number;
}
```

### UI

- **Stats** (sin firma / parcial / total): contar filas por `currentStatus`
  (o usar los counts del back si se exponen agregados).
- **Filtros** (Todos / Sin firma / Firma parcial / Firma total): mapear al
  `StudyStatus` y filtrar (client-side sobre la página, o vía `?status=` del endpoint).
- **Búsqueda** por paciente + `protocolCode` (client-side sobre lo traído).
- **Fila**: `protocolCode`, `patientName · {sex} {edad}a` (edad derivada de
  `patientBirthDate`), `analysisCount análisis`, `determinationCount determinaciones`,
  `signedAnalysisCount de analysisCount firmados`, `date` formateada, badge por
  `currentStatus`. **Sin** badge URGENTE.
- El botón Validar/Ver navega a `/analitica/validacion/{protocolId}` (pantalla de
  detalle, fuera de este spec).

## Fuera de alcance

- Pantalla interna de validar/ver (detalle): determinaciones, flag H/L, firma
  parcial/total, eliminación de fan-out de nombres de análisis. → spec aparte.
- `urgente` / badge URGENTE (no hay dato).
- Obra social, sección, NBU.
- Migraciones de esquema (este cambio no agrega columnas).

## Testing

**Backend (laboratorio):**
- `GET /studies` devuelve, por estudio, `protocolCode`, `patientName`, `patientSex`,
  `patientBirthDate`, `date`, `analysisCount`, `determinationCount`,
  `signedAnalysisCount` con los valores del paciente/protocolo/órdenes seedeados.
- `protocolCode` con el formato `P-{yyMM}-{id}` para datos conocidos del seed V959.
- El filtro `?status=` sigue funcionando y los nuevos campos viajan en cada elemento
  de la página.
- Sin N+1: una query por página (verificar en log SQL o test de repos).
- Mensajes de error en español, sin leak de internals (regla del proyecto).

**Frontend (este repo):**
- Cuando se integre: el service tipa `ValidationListRow`; el listado deriva edad de
  `patientBirthDate`, mapea `currentStatus` a badge/filtro, y arma stats por estado.
- Smoke de la page: stats, filtros y búsqueda operan sobre los datos del store.

## Riesgos / notas

- Cambio **aditivo** de contrato: el back agrega campos; ninguno existente cambia de
  tipo ni se elimina. El front tolera los campos nuevos (hoy usa mock; migra cuando
  el back los emita).
- **Edad**: el back manda `patientBirthDate` (no `age`) para no asumir "hoy"
  server-side; el front deriva la edad con un helper.
- **`protocolCode` derivado**: si a futuro se decide persistir un código de negocio,
  reemplaza al derivado sin cambiar el contrato (sigue siendo `protocolCode: string`).
- El seed local (V959) ya tiene estudios con paciente, protocolo y órdenes enlazados
  (estados PENDING / PARTIALLY_SIGNED / READY_FOR_SIGNATURE / CLOSED) — alcanza para
  verificar el listado end-to-end y los tres estados del filtro.
```
