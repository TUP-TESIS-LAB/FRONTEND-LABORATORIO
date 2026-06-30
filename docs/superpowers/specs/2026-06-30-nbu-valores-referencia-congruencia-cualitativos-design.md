# NBU: congruencia de valores de referencia + valores cualitativos / semicuantitativos

> **Estado:** diseño aprobado · **Fecha:** 2026-06-30
> **Branch:** `feat/nbu-valores-referencia` (Backend + FRONTEND-LABORATORIO), apilada sobre `feat/nbu-precio-particular` (KAN-154) → `feat/nbu-preparacion-estructurada` (KAN-142).
> **Flyway asignado:** lane NBU, libre desde **V1033** (V1030 KAN-142, V1031/V1032 KAN-154).
> **Jira:** _(pendiente — se completa al crear el ticket)_

## Problema

En la configuración de NBU (drawer "Configurar" de un análisis), cada determinación tiene una tabla de
**valores de referencia** por (sexo, edad). Hoy:

1. **No hay validación de congruencia.** Se pueden cargar dos filas cuyo segmento (sexo, edad) se
   solapa con valores distintos (ej. Hombre 1–30 años min 10/max 20, y otra Hombre 10–40 con
   min 5/max 9). Un paciente caería en dos rangos contradictorios. Ni el FE ni el BE lo impiden
   (el FE solo valida `min < max` dentro de una misma fila).
2. **Solo soporta valores numéricos.** Muchas determinaciones reales son **cualitativas** (Color de
   orina, Aspecto, Proteínas: NO CONTIENE/TRAZAS, serología Positivo/Negativo) o
   **semicuantitativas** (escalas ordinales: ESCASOS < ALGUNOS < ABUNDANTES; cruces NEG/+/++/+++).
   El modelo (`tenant_reference_values`) es puramente numérico (min/max/críticos).

Referencia real (informe Laboratorio Central, paciente de ejemplo): Creatinina y TSH tienen ~10
bandas etarias que no se deben pisar; Orina Completa tiene Color, Aspecto, Presencia y abundancias.

## Objetivo

1. **Congruencia:** impedir cargar valores de referencia con segmentos (sexo, edad) solapados en una
   misma determinación, con validación clara en FE (bloquea + marca) y BE (422 español).
2. **Cualitativo / semicuantitativo:** permitir que una determinación use valores **cualitativos**
   (un valor esperado de una **categoría**) o **semicuantitativos** (escala **ordinal** con un
   **tope** "normal hasta X"), además del numérico actual. Las categorías son conjuntos de valores
   reutilizables: **curadas globales** (semilla) **+ propias del tenant**.

### Fuera de alcance (diferido)

- El **conteo numérico por campo** del semicuantitativo ("ESCASOS (1–3 x campo)").
- Las **bandas interpretativas** tipo LDL (recomendado/moderado/alto): siguen como texto en
  `referenceTemplate`.
- **Usar** estos valores en la **carga de resultados** (módulo resultados) — esta tanda es solo
  configurar en NBU.
- Multi-valor esperado por segmento (ej. "amarillo **o** ámbar"): se modela como un único valor de
  la categoría; multi-valor real queda para otra tanda.

## Decisiones tomadas (no re-discutir)

1. **Congruencia = prohibir TODO solapamiento** de (sexo, edad) en una determinación. Cada paciente
   (sexo, edad) cae en **exactamente** un valor de referencia. Aplica a numérico, cualitativo y
   semicuantitativo.
2. **Tipo por determinación** (selector en el drawer, guardado en `analyticalType` del override
   `tenant_determination_override`, que ya tiene ese campo): **QUANTITATIVE / QUALITATIVE /
   SEMI_QUALITATIVE** (el enum `AnalyticalType` ya existe).
3. **Categorías** = conjunto nombrado de valores. **Curadas globales** (`tenant_id` NULL, semilla) +
   **propias del tenant** (`tenant_id` set). Flag **`ordinal`** (true para semicuantitativo).
4. **Referencia cualitativa/semicuant. = UN valor por segmento.** Nominal → valor esperado;
   ordinal → **tope** ("normal hasta X" según el `display_order` de la categoría).

## Reglas de congruencia (motor compartido)

Un **segmento** = (`gender`, [`ageMinMonths`, `ageMaxMonths`]). Para una determinación, dos filas
son **incongruentes** si sus segmentos se **solapan**:

- **Sexo:** `null` ("ambos") solapa con `MALE` y `FEMALE`. `MALE` no solapa con `FEMALE`. Igual sexo
  solapa con igual sexo.
- **Edad (en meses, inclusiva):** `ageMinMonths` null = 0; `ageMaxMonths` null = +∞. Dos intervalos
  `[a1,b1]` y `[a2,b2]` solapan si `a1 ≤ b2 ∧ a2 ≤ b1`. (Adyacentes sin pisarse, ej. `0–11` y
  `12–35`, **no** solapan.)
- **Validación adicional por fila:** `ageMinMonths ≤ ageMaxMonths` (cuando ambos presentes).
- Si dos filas solapan → error con mensaje en español que **nombra el segmento en conflicto**
  (ej. "Hay rangos de edad superpuestos para el sexo Masculino"). Sin leak de internals.

> Nota: la congruencia valida los **segmentos**, sin importar si el valor es numérico, cualitativo u
> ordinal. El valor en sí (min/max o `qualitative_value_id`) no entra en la regla de solapamiento.

## Modelo de datos (BE) — módulo `analitica.resultados`

### Categorías cualitativas (nuevas)

- **`qualitative_category`** (V1033): conjunto nombrado de valores reutilizable.
  - `id` PK, `tenant_id BIGINT NULL` (**NULL = curada global**; set = propia del tenant),
    `name VARCHAR(120) NOT NULL`, `ordinal BOOLEAN NOT NULL DEFAULT FALSE`,
    `active BOOLEAN NOT NULL DEFAULT TRUE`, + audit mínima (`created_at/by`, `updated_at/by`).
  - **No** extiende `BaseJpaEntity` (necesita `tenant_id` nullable para las globales); patrón
    "global + tenant" (lectura = `tenant_id IS NULL OR tenant_id = :tenant`; escritura = tenant).
  - `UNIQUE` lógico por `(tenant_id, name)` (las globales con `tenant_id` NULL).
- **`qualitative_category_value`** (V1033): valores de cada categoría.
  - `id` PK, `category_id BIGINT NOT NULL` (FK → `qualitative_category`),
    `label VARCHAR(80) NOT NULL`, `display_order INT NOT NULL`, `active BOOLEAN NOT NULL DEFAULT TRUE`.
  - `UNIQUE (category_id, label)`.
- **Seed global (V1033 o V1034 seed):** categorías curadas iniciales:
  - `Presencia` (no ordinal): NO CONTIENE, TRAZAS, CONTIENE.
  - `Serología` (no ordinal): POSITIVO, NEGATIVO.
  - `Reactividad` (no ordinal): REACTIVO, NO REACTIVO.
  - `Aspecto` (no ordinal): LÍMPIDA, LIGERAMENTE TURBIA, TURBIA.
  - `Abundancia` (**ordinal**): NO SE OBSERVAN, ESCASOS, ALGUNOS, ABUNDANTES.
  - `Cruces` (**ordinal**): NEGATIVO, +, ++, +++, ++++.
  - (El tenant agrega las suyas, ej. "Color de orina".)

### Asignación de tipo + categoría a la determinación

- **`tenant_determination_override`** (V1034 ALTER): + `qualitative_category_id BIGINT NULL`
  (FK → `qualitative_category`). El `analyticalType` ya existe en esa entidad: el drawer lo setea a
  QUANTITATIVE / QUALITATIVE / SEMI_QUALITATIVE; cuando es cuali/semicuant, `qualitative_category_id`
  apunta a la categoría elegida.

### Valor de referencia cualitativo

- **`tenant_reference_values`** (V1035 ALTER): + `qualitative_value_id BIGINT NULL`
  (FK → `qualitative_category_value`). Es el valor **esperado** (nominal) o el **tope** (ordinal,
  "normal hasta") para ese segmento. Lo numérico (`min/max/critical*`, `unit`) y `referenceTemplate`
  quedan igual. Sigue siendo tabla de hard-delete / replace-all (no `BaseJpaEntity`).

> Compatibilidad de migraciones: cada ALTER agrega **una sola** columna (H2 + MySQL), sin generated
> columns. Revisar `db/migration-local` (en este repo son solo seeds → probablemente no replicar).

## API (BE)

### Categorías
- `GET /api/v1/analitica/qualitative-categories` → globales + propias del tenant, cada una con sus
  valores `[{ id?, label, ordinal, values: [{ label, displayOrder }] }]` (lectura `isAuthenticated`).
- `POST /api/v1/analitica/qualitative-categories` body `{ name, ordinal, values: [labels…] }` → crea
  categoría **propia del tenant** (rol `ADMINISTRADOR`). Validación: nombre no vacío, ≥ 2 valores,
  labels no vacíos/únicos; 422 español sin leak.
- (El FE nunca pide IDs: elige por label; el id se deriva de la selección.)

### Reference values + override (extendidos)
- `PUT /api/v1/analitica/determinations/{id}/reference-values/override` — el body de cada item suma
  `qualitativeValue` (label o id de la selección; el BE resuelve a `qualitative_value_id`). El use
  case **valida congruencia** (solapamiento) antes de persistir → `ReferenceValueRangeConflictException`
  (nuevo, 422). Si la determinación es cuali/semicuant, valida que cada `qualitativeValue` pertenezca
  a la categoría asignada (`InvalidQualitativeReferenceException`, 422).
- `PUT /api/v1/analitica/determinations/{id}/override` — ya existe; el drawer le manda
  `analyticalType` y (nuevo) `qualitativeCategoryId`.
- `GET .../reference-values/override` y `GET .../override` devuelven los campos nuevos.

### Excepciones nuevas (dominio → 422 en `GlobalExceptionHandler`)
- `ReferenceValueRangeConflictException` ("Hay rangos superpuestos para el sexo …").
- `InvalidQualitativeReferenceException` ("El valor de referencia no pertenece a la categoría …").
- `InvalidQualitativeCategoryException` (validación de creación de categoría).

## Componentes (BE)
- **Dominio:** `QualitativeCategory`, `QualitativeCategoryValue`, puertos
  `QualitativeCategoryRepositoryPort`; un **`ReferenceValueCongruenceValidator`** (servicio de dominio
  puro, sin Spring/JPA) que dado un set de segmentos detecta solapamientos — **el núcleo testeable**.
- **Aplicación:** `ListQualitativeCategoriesUseCase`, `CreateQualitativeCategoryUseCase`; extender
  `UpsertTenantReferenceValueOverrideUseCase` (invoca el validador + valida pertenencia cualitativa)
  y el upsert del override (categoría).
- **Infra:** entidades/repos/adapters de categorías; ALTERs en override y reference_values;
  migraciones V1033–V1035 (+ seed).
- **Presentación:** `QualitativeCategoryController` + DTOs; extensión de
  `TenantDeterminationOverrideController` (campos nuevos).

## Componentes (FE) — drawer `nbu-config-drawer`
- Por determinación, **selector "Tipo de valores": Numérico / Cualitativo / Semicuantitativo**
  (escribe `analyticalType` + `qualitativeCategoryId` al override).
- **Numérico:** la tabla actual (min/max/críticos/sexo/edad) + **validación de congruencia cross-fila**
  (no solo `min<max`): detecta segmentos solapados, marca las filas en conflicto y bloquea guardar
  con mensaje claro.
- **Cualitativo / Semicuantitativo:** elegir **categoría** (lista global+propias, con "+ nueva
  categoría" → crea propia) y por cada fila (sexo, edad) el **valor esperado** (nominal) o **tope**
  (ordinal) desde los valores de la categoría. Misma validación de congruencia de segmentos.
- Service `NbuConfigApiService`: + `getQualitativeCategories()`, `createQualitativeCategory(...)`;
  `ReferenceValueItem` suma `qualitativeValue`; el override suma `qualitativeCategoryId`.
- Errores en español, sin leak, sin emojis Unicode; nunca IDs en formularios.

## Testing (TDD primero — pedido explícito)

**Núcleo: `ReferenceValueCongruenceValidator` (BE, unit puro) — matriz exhaustiva:**
- Sin solape: rangos de edad adyacentes (0–11 / 12–35) → OK.
- Solape total / parcial / contenido → conflicto.
- Mismo sexo solapa; `MALE` vs `FEMALE` no; `null` (ambos) solapa con `MALE` y con `FEMALE`.
- Edad abierta arriba (`ageMax` null = ∞) y abajo (`ageMin` null = 0).
- Identidad (misma fila duplicada) → conflicto.
- `ageMin > ageMax` en una fila → error de fila.
- Set vacío / una sola fila → OK.
- Aplica igual con valores numéricos, cualitativos y ordinales (el validador ignora el valor).

**Otros BE (Mockito/unit):**
- `UpsertTenantReferenceValueOverrideUseCase`: rechaza set incongruente (422); acepta set válido;
  valida pertenencia del `qualitativeValue` a la categoría (422 si no).
- `CreateQualitativeCategoryUseCase`: nombre vacío / < 2 valores / labels duplicados → 422; crea OK
  como tenant-scoped.
- `ListQualitativeCategoriesUseCase`: devuelve globales + propias.
- Migraciones V1033–V1035 verdes en H2 **y** boot MySQL real.

**FE (vitest):**
- Validación de congruencia en el drawer (numérico y cualitativo): bloquea guardar + marca filas +
  mensaje claro.
- Editor cualitativo: elegir categoría + valor esperado; crear categoría nueva.
- `NbuConfigApiService`: nuevos métodos (URL/method/body).

## Estándares
- Errores 422 español sin leak (`DomainException`); nunca IDs en formularios; tenant isolation
  (categorías propias por `tenant_id`; globales `tenant_id` NULL de solo-lectura para el tenant).
- `/security-review`: endpoints nuevos (ADMINISTRADOR) → evaluar al cerrar.
- Lane Flyway NBU (V1033–V1035), sin colisión con urgente/domicilio/liquidaciones (V1040+).

## Branch / dependencia
Apilada sobre `feat/nbu-precio-particular` (KAN-154, PRs BE#113/FE#122) porque edita el drawer y los
reference-values de NBU. PRs basadas en esa rama hasta que la cadena KAN-142 → KAN-154 mergee a
`development`; re-targetear en orden.
