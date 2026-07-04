# NBU: preparación estructurada del paciente + activación del análisis

> **Estado:** diseño aprobado · **Fecha:** 2026-06-27
> **Branch:** `feat/nbu-preparacion-estructurada` (Backend + FRONTEND-LABORATORIO)
> **Flyway asignado:** V1030–V1039 (exclusivo). Esta tanda usa **V1030** únicamente.
> **Pre-requisito:** PR #113 (drawer NBU base, KAN-130) — MERGEADA en `development`.
> **Jira:** [KAN-142](https://exequielsantoro.atlassian.net/browse/KAN-142)

## Problema

La preparación previa del paciente hoy es **texto libre a nivel determinación**
(`preIndications` / `preObservations` en `DeterminationCatalog` y su override por tenant
`TenantDeterminationOverride`). En el drawer de NBU se edita como **un único textarea a nivel
análisis** que se replica a `preIndications` de todas las determinaciones.

Esto impide **computar la preparación de una orden** (p. ej. el máximo de ayuno entre todos los
análisis pedidos, o la unión de los tipos de preparación). El modelo viejo de turnos tenía algo
semi-estructurado (`TipoAnalisis { boolean ayuno, List<String> preparacion }`) que se perdió.

Además, la **activación/desactivación** de un análisis para el tenant (`tenant_analysis.active`)
existe a medias en BE: hay `DeactivateTenantAnalysisUseCase` (DELETE = soft-delete) pero **no hay
forma de reactivar ni de prender** desde la pantalla de NBU.

## Objetivo

Reemplazar el texto libre por un **modelo estructurado de preparación a nivel determinación**, con
**cómputo a nivel orden** (capacidad en BE), y sumar el **toggle de activación** del análisis en el
drawer de NBU. Cierra las dudas #1 (unidad) y #4 (activación) del brief.

### Alcance de esta tanda: SOLO modelar + configurar

Deja la **capacidad** (modelo + override por tenant + cómputo en BE + edición en el drawer). El
**dónde se muestra** la preparación computada (wizard / turno / portal / impresión) se **difiere**
a otro ciclo.

## Decisiones tomadas (no re-discutir)

1. **Unidad de medida → read-only del catálogo.** No se re-agrega como campo editable (decisión #1
   del brief: pedía un "ID"). En el drawer queda como contexto read-only por determinación.
2. **Tipos de preparación → enum fijo en BE**, expuesto vía endpoint que devuelve `{code, label}`
   en español. No es una tabla de catálogo configurable por tenant (evita "IDs en formularios" y
   scope que el brief no pidió). Ampliable por código.
3. **Storage → tabla hija nueva** `tenant_determination_preparation` (relacional), no columnas
   JSON/CSV en el override. El cómputo máx-ayuno / unión sale con queries simples.
4. **Migración del texto libre → NO auto-parsear.** `preIndications` / `preObservations` quedan
   intactos como "observaciones" libres. La preparación estructurada arranca vacía y se carga desde
   el drawer. Evita corromper datos clínicos parseando texto heterogéneo.
5. **Activación → endpoint idempotente** `PUT /activation {catalogId, active}` (crea / reactiva /
   desactiva), en vez de combinar DELETE + POST sueltos (resuelve el "todavía no hay id" del ON).

## Modelo de datos (BE)

### `PreparationType` (enum de dominio)

Vive en `analitica.resultados.domain.model`. Campos por valor: `code` (= name), `label` (español),
`requiresHours` (boolean). Set inicial:

| code                    | label                        | requiresHours |
| ----------------------- | ---------------------------- | ------------- |
| `AYUNO`                 | Ayuno                        | sí            |
| `NO_FUMAR`              | No fumar                     | —             |
| `SIN_ACTIVIDAD_FISICA`  | Sin actividad física         | —             |
| `ORINA_24H`             | Recolección de orina 24 hs   | —             |
| `SUSPENSION_MEDICACION` | Suspensión de medicación     | —             |
| `ABSTINENCIA_ALCOHOL`   | Abstinencia de alcohol       | —             |

### Tabla `tenant_determination_preparation` (Flyway V1030)

Extiende `BaseJpaEntity` (columnas `tenant_id`, `created_at/by`, `updated_at/by`, `deleted_at`,
`active`, `version`). `tenant_id` lo llena `TenantEntityListener` — **nunca** viene del body.

| columna                    | tipo         | notas                                         |
| -------------------------- | ------------ | --------------------------------------------- |
| `id`                       | BIGINT PK    |                                               |
| `tenant_id`                | BIGINT NOT NULL |                                            |
| `determination_catalog_id` | BIGINT NOT NULL | FK → `determination_catalog(id)`           |
| `preparation_type`         | VARCHAR(40) NOT NULL | nombre del enum                       |
| `fasting_hours`            | INT NULL     | solo para `AYUNO`                             |
| _(audit + version de `BaseJpaEntity`)_ |  |                                               |

- `UNIQUE (tenant_id, determination_catalog_id, preparation_type)`.
- Índice de lectura por `(tenant_id, determination_catalog_id)`.
- **Persistencia = delete-and-replace** del set por `(tenant, determinación)` dentro de la
  transacción del upsert. Es config simple: no se usa soft-delete para las filas (se borran y
  re-insertan); el `active`/`deleted_at` heredados de `BaseJpaEntity` quedan en su default.
- La migración debe ser válida tanto en H2 (tests) como en MySQL (boot). Sin `ADD COLUMN IF NOT
  EXISTS` ni construcciones que rompan MySQL; revisar también `db/migration-local` si aplica.

## API (BE)

Base existente del módulo: `/api/v1/analitica`. Roles según patrón actual (lectura
`isAuthenticated`, mutación `hasRole('ADMINISTRADOR')`).

### Preparación estructurada

- `GET /api/v1/analitica/preparation/types` → `[{ code, label, requiresHours }]`
  (lectura; labels en español; el FE nunca recibe IDs).
- `GET /api/v1/analitica/determinations/{id}/preparation` →
  `{ items: [{ type, label, fastingHours }] }` (set actual del tenant para la determinación).
- `PUT /api/v1/analitica/determinations/{id}/preparation` body
  `{ items: [{ type, fastingHours? }] }` → reemplaza el set (rol `ADMINISTRADOR`).
  - Validaciones: `type` debe ser un `PreparationType` válido (si no → 422 español, sin leak);
    `fastingHours` requerido y > 0 solo cuando `type = AYUNO`, ignorado/null para el resto;
    sin duplicados de `type`.

### Cómputo a nivel orden (capacidad — sin consumidor FE esta tanda)

- `POST /api/v1/analitica/preparation/compute` body `{ analysisCatalogIds: [...] }` →
  `{ fastingHours, types: [{ code, label }], observations: [...] }`.
  - Expande cada `analysisCatalogId` → determinaciones (`DeterminationCatalog`), junta la prep del
    tenant de esas determinaciones y computa: **`fastingHours` = máximo** de las horas de AYUNO
    (null si ninguna lo tiene); **`types` = unión** de los tipos presentes; **`observations` =**
    `preObservations` no vacíos, deduplicados.
  - POST (no polleable) → sin ETag/304.

### Activación del análisis

- `PUT /api/v1/tenant-analyses/activation` body `{ catalogId, active }` (rol `ADMINISTRADOR`).
  `SetTenantAnalysisActivationUseCase(catalogId, active, actor)` **idempotente**:
  - `active = true`: si no existe fila `tenant_analysis` para `(tenant, catalogId)` → la crea
    (`active = true`, reusando el patrón de `CreateTenantAnalysisUseCase`); si existe soft-deleted →
    reactiva (limpia `deleted_at`, `active = true`); si ya está activa → noop.
  - `active = false`: reusa el soft-delete de `DeactivateTenantAnalysisUseCase`.
  - Reusa puertos existentes (`TenantAnalysisRepositoryPort`); no cambia la tabla.

## Componentes (BE)

Paquete `analitica.resultados` (salvo activación, en `analitica`):

- **Dominio:** `PreparationType` (enum); `TenantDeterminationPreparation` (modelo con
  `determinationCatalogId`, `preparationType`, `fastingHours`); `OrderPreparation` (resultado del
  cómputo); `TenantDeterminationPreparationRepositoryPort`
  (`findByDeterminationCatalogIdAndTenantId`, `replaceSet`, `findByDeterminationIdsAndTenantId`).
- **Aplicación:** `GetTenantDeterminationPreparationUseCase`,
  `UpsertTenantDeterminationPreparationUseCase` (delete-and-replace + validación),
  `ComputeOrderPreparationUseCase`, `SetTenantAnalysisActivationUseCase`.
- **Infra:** `TenantDeterminationPreparationJpaEntity` (extiende `BaseJpaEntity`),
  `...JpaRepository`, `...RepositoryAdapter`.
- **Presentación:** endpoints en un controller de preparación
  (`PreparationController` / extensión de `DeterminationCatalogController`) + el de activación en
  `TenantAnalysisController`. DTOs request/response propios (no exponer entidades).

## Componentes (FE) — drawer `nbu-config-drawer`

- **Toggle de activación** (`p-toggleswitch` "Análisis activo") en la sección General; al cambiar
  llama `setActivation(catalogId, active)` y refleja el resultado. Reemplaza el texto read-only de
  estado.
- **Editor de preparación estructurada por determinación**, dentro de cada panel del acordeón
  (junto a valores de referencia):
  - chips/checkboxes de tipos (labels desde `getPreparationTypes()`),
  - input "Horas de ayuno" visible solo si `AYUNO` está seleccionado,
  - textarea "Observaciones" (→ `preObservations` del override existente).
  - **Se elimina** el textarea único analysis-level "Preparación previa".
- **Unidad:** se mantiene como contexto **read-only** por determinación (ya no es campo editable).
- `NbuConfigApiService`: agregar `getPreparationTypes()`, `getPreparation(detId)`,
  `upsertPreparation(detId, items)`, `setActivation(catalogId, active)`. (`compute` no se consume
  esta tanda.)
- Al guardar: el set de preparación se persiste por determinación con su `PUT .../preparation`,
  junto con los `forkJoin` ya existentes del drawer. Errores en español sin leak (toast).

## Out of scope (diferido)

- Mostrar la preparación computada en wizard / turno / portal / impresión.
- Edición de sección del análisis (otra pantalla).
- Unidad de medida configurable.
- Preparación a nivel catálogo global (default heredable) — esta tanda es solo override por tenant.

## Testing

- **BE:**
  - `ComputeOrderPreparationUseCase`: máximo de ayuno, unión de tipos, dedup de observaciones, set
    vacío.
  - `UpsertTenantDeterminationPreparationUseCase`: replace del set, validación de AYUNO/horas,
    rechazo de `type` inválido y duplicados.
  - `SetTenantAnalysisActivationUseCase`: crear, reactivar soft-deleted, noop, desactivar.
  - Controller: roles (`ADMINISTRADOR` en mutaciones), 422 en validación con mensaje español.
  - Migración V1030: suite verde en H2 **y** boot real contra MySQL.
- **FE:**
  - Spec del drawer: toggle de activación, editor estructurado (mostrar/ocultar horas de ayuno),
    guardado.
  - Spec del `NbuConfigApiService` para los métodos nuevos.

## Estándares aplicados

- Errores de UI/API en **español, user-friendly, sin leak** de internals (regla #4 de ambos
  CLAUDE.md).
- **Nunca IDs en formularios**: tipos por label, activación por `catalogId` derivado de la fila, no
  pedido al usuario.
- **Tenant isolation** vía `BaseJpaEntity` + `TenantEntityListener` en la tabla nueva.
- `/security-review`: solo se tocan endpoints de mutación ya gateados a `ADMINISTRADOR` y un cómputo
  de lectura; **no aplica** (confirmar al cerrar la rama).
