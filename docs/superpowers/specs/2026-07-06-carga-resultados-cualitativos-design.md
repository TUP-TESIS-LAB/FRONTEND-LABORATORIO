# Carga de resultados según tipo (cuantitativo / cualitativo / semicuantitativo) — Design

> Follow-up de KAN-158 (valores cualitativos/semicuant, mergeado). Wire de esos valores en la **carga real de resultados**. Ticket: _pendiente (jira-workflow)_.

## Problema

En la pantalla de **cargar resultados** (`analitica/muestras/pages/cargar-resultados`, componente `planilla-grid`), cada determinación se carga con un **`<input>` numérico libre**, sin importar cómo esté configurada. KAN-158 agregó el tipo analítico (`QUANTITATIVE` / `QUALITATIVE` / `SEMI_QUALITATIVE`) y las categorías cualitativas (valores permitidos) por determinación, pero **no se usan en la carga**: una determinación cualitativa (ej. "Positivo/Negativo") o semicuant (ej. "Neg/+/++/+++") igual muestra un input numérico. El técnico puede escribir cualquier cosa.

## Objetivos

- En la planilla de carga, cada celda muestra el **input correcto según el tipo efectivo** de la determinación:
  - **Cuantitativo** → input numérico (como hoy).
  - **Cualitativo** → **dropdown** con los valores de la categoría (ej. Positivo / Negativo / Indeterminado).
  - **Semicuantitativo** → **dropdown ordinal** con los valores ordenados de la categoría (ej. Negativo / + / ++ / +++). Mismo widget que cualitativo, respetando el orden.
- El backend **valida** al guardar: un valor cualitativo/semicuant debe ser uno de los valores permitidos; un cuantitativo debe ser numérico.

## No-objetivos

- No modelar "bandas numéricas" para semicuant (número→categoría). El semicuant se carga eligiendo la categoría ordinal (decisión del usuario).
- No cambiar la **configuración** de tipos/categorías (ya existe de KAN-158: `TenantDeterminationOverride.analyticalType` + `qualitativeCategoryId`, `QualitativeCategory`/`QualitativeCategoryValue`).
- No tocar la validación post-analítica ni el informe PDF (esos consumen el valor ya cargado).

## Diseño — Backend (`modules/analitica/resultados`)

### 1. El grid expone el tipo efectivo + valores permitidos

`DeterminationCatalogController` (`GET /api/v1/analitica/determinations`) devuelve `DeterminationCatalogEntry` (filas del grid). Sumar por determinación:
- `analyticalType`: el tipo **efectivo** = `TenantDeterminationOverride.analyticalType` del tenant para esa determinación; si no hay override o es null → **`QUANTITATIVE`** (default backward-compatible).
- `qualitativeValues: List<QualitativeValueDto{ id, label, order }>`: cuando el tipo es `QUALITATIVE`/`SEMI_QUALITATIVE`, los valores de la `QualitativeCategory` linkeada (vía `override.qualitativeCategoryId`), **ordenados por `displayOrder`**. Vacío para cuantitativo o si no hay categoría configurada.

El use case detrás del controller resuelve override + categoría por determinación (batch para todas las filas del análisis, evitando N+1: cargar overrides del tenant y categorías en una pasada).

### 2. Validación al guardar

`AnalyticalResultController` (`PATCH /{id}/determinations/batch`) → `BatchUpdateDeterminationsUseCase`. Al persistir cada item:
- Si la determinación es `QUALITATIVE`/`SEMI_QUALITATIVE`: el `value` (no vacío) debe ser **uno de los labels** de la categoría configurada. Si no, `InvalidQualitativeCategoryException`/`InvalidQualitativeReferenceException` (ya existen) → **422 español** ("El valor no corresponde a los valores permitidos de la determinación."). Sin leak.
- Si es `QUANTITATIVE`: numérico (comportamiento actual).
- `value` vacío/blank siempre permitido (determinación no cargada aún).

### 3. Qué se persiste

El `value` del resultado sigue siendo un **string** = el **label** elegido (ej. "Positivo"). (Decisión del usuario: guardar el label, no el id — el label es el contrato de display y ya es lo que consume el informe.) Sin migración, sin cambio de columna.

## Diseño — Frontend (`analitica/muestras`)

### Modelo

`DeterminationCatalog` / la fila del grid (`GridRow`/`PlanillaRow`) suma:
- `analyticalType: 'QUANTITATIVE' | 'QUALITATIVE' | 'SEMI_QUALITATIVE'`.
- `qualitativeValues: string[]` (labels ordenados; vacío si cuantitativo).

El `planilla-grid-builder.service` propaga estos campos desde el `DeterminationCatalogEntry` a cada `row`.

### Celda del grid (`planilla-grid.component`, y `result-grid` si está en uso)

La celda ramifica:
- `QUANTITATIVE` → `<input inputmode="decimal">` (igual que hoy).
- `QUALITATIVE` / `SEMI_QUALITATIVE` → **`p-select`** (o dropdown del design system) con `qualitativeValues`, placeholder "—", limpiable. Emite el label seleccionado como el `value` de la celda (mismo `setValue`).
- Si es cualit/semi pero `qualitativeValues` está vacío (categoría no configurada) → fallback a input numérico + (opcional) aviso "sin valores configurados"; no bloquea.

El resto no cambia: el contador "X de Y cargadas" ya cuenta por celda con valor; el save batch manda el mismo `value` string.

## Data flow

1. `GET /api/v1/analitica/determinations` → filas con `analyticalType` + `qualitativeValues`.
2. El grid rinde input numérico o dropdown por celda según el tipo.
3. `PATCH /{id}/determinations/batch` con los `value` (número o label) → BE valida cualitativo → persiste.

## Manejo de errores

- Valor cualitativo inválido → 422 español (Regla #4), toast en el FE. El dropdown por diseño no deja ingresar valores fuera de la lista, así que el 422 es defensa en profundidad.

## Testing

- **BE:** unit del use case del catálogo (expone `analyticalType` efectivo + `qualitativeValues` ordenados; default QUANTITATIVE sin override; batch sin N+1); unit de `BatchUpdateDeterminationsUseCase` (valor cualitativo válido persiste; inválido → 422 no-leak; cuantitativo numérico; vacío permitido).
- **FE:** lógica pura del builder (mapea type+values a la row); render de la celda (dropdown para cualit/semi con los valores en orden; input numérico para cuant; fallback si sin valores). `ng test` para render de la celda si el runner lo permite, si no lógica pura + build (límite vitest signal-inputs conocido).

## Riesgos / decisiones abiertas (para el plan)

- **`result-grid` vs `planilla-grid`:** confirmar cuál está en uso real en `cargar-resultados` (screenshot = `planilla-grid`). Aplicar a la usada; alinear la otra si también se muestra, o dejarla marcada.
- **Resolución del tipo efectivo:** confirmar el use case/port existente para leer `TenantDeterminationOverride` por determinación (KAN-158) y reusarlo en el catálogo; batch para evitar N+1 en planillas grandes.
- **Semicuant ordinal:** el orden viene de `QualitativeCategoryValue.displayOrder`; el dropdown respeta ese orden.
- Cross-repo: BE (`analitica/resultados`) + FE (`analitica/muestras`). Un ticket, dos PRs contra development.
