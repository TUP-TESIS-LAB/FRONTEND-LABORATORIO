# Procesamiento — Carga multi-muestra (Cargar resultados)

> **Jira:** [KAN-105](https://exequielsantoro.atlassian.net/browse/KAN-105)
> **Fecha:** 2026-06-14
> **Rama:** `feat/carga-multi-muestra` (worktree `FRONTEND-LABORATORIO-multimuestra`, base `development`)
> **Modifica:** la feature de Arco 3b (KAN-102, ya en development).

## Contexto

La pantalla "Cargar resultados" (Arco 3b) hoy exige seleccionar **un único tubo** y navega *por protocolo* (`procesamiento/cargar/:protocolId`). Ese límite fue una **decisión de diseño del frontend**, NO una restricción del backend:
- Guardar es **por resultado** (`PATCH /resultados/{resultId}/determinations/batch`) — no le importa el protocolo.
- Sólo el GET de carga es por protocolo (`GET /resultados/protocol/{id}`), y eso se resuelve llamándolo N veces y mergeando.

Este fix saca el límite: permitir seleccionar **varios tubos** (de uno o varios protocolos) y cargar una grilla unificada. Como `buildResultGrid` ya agrupa **por análisis**, los resultados del mismo análisis de distintas muestras caen en la misma sección como **columnas** — la grilla multi-muestra real.

**Fuera de alcance:** la pantalla de **Validación** (Arco 4, PR #77) tiene el mismo límite, pero se decidió **sacarla por ahora** y rehacerla a futuro con una pantalla nueva. Este arco NO toca validación (que ni está en development).

## Objetivo

"Cargar resultados" se habilita con **≥1 tubo** seleccionado; abre una grilla con los resultados de **todos los protocolos** de la selección, agrupada por análisis, con **columnas rotuladas por paciente**.

## Requisitos

1. **Selección múltiple:** el botón "Cargar resultados" (worklist procesamiento) se habilita con **1 o más** tubos seleccionados (antes: exactamente 1). Navega con los **protocolIds distintos** de los tubos seleccionados.
2. **Navegación por query param:** ruta `procesamiento/cargar?protocols=50002,50003` (CSV de protocolIds distintos). La ruta deja de usar `:protocolId` en el path. *(Decisión: query param — sobrevive al refresh y es testeable; la longitud de 4-5 ids es trivial.)*
3. **Carga multi-protocolo:** `loadGrid({ protocolIds })` → `forkJoin(protocolIds.map(getResultsByProtocol))` → flatten de results → mismo fan-out existente (determinaciones + catálogo + nombres de análisis) → ensamblar grilla.
4. **Rótulo de columna = paciente:** cada columna (result) se rotula con el **nombre del paciente** (`firstName lastName`), no `#resultId`. Resolver vía `GET /api/v1/analitica/patients/by-ids?ids=...` (batch) con los `patientId` distintos de los results. Fallback `#resultId` si no se resuelve.
5. **Grilla:** agrupada por análisis (igual que hoy); los results del mismo análisis (aunque sean de distintos protocolos/muestras) son columnas de la misma sección.
6. **Guardar / resumen / mark-ready:** sin cambios (son por resultado). El reload tras guardar recarga **todos** los protocolos de la grilla.
7. Errores en español (`humanizeBackendError`), OnPush, signals. Sin cambios de backend.

## Diseño

### Modelo (`resultado.model.ts`)

- `ResultGrid`: `protocolId: number` → **`protocolIds: number[]`**; agregar **`resultLabels: Record<number, string>`** (resultId → rótulo de columna = nombre de paciente o `#id`).
- `buildResultGrid` (función pura): el input gana `patientNameById: Record<number, string>`. Construye `resultLabels[result.id] = patientNameById[result.patientId] ?? \`#${result.id}\``. El agrupado por análisis no cambia (ya mergea results de cualquier origen). `ResultGrid.protocolIds` viene del input.

### Service de pacientes (nuevo, mínimo)

- `PacientesApiService.getByIds(ids: number[]): Observable<Patient[]>` → `GET /api/v1/analitica/patients/by-ids` con `ids` repetido (`ids=1&ids=2`). Modelo `Patient { id: number; firstName: string; lastName: string }`. (Reusa `ResultadosApiService` para determinaciones/catálogo; este service nuevo solo para pacientes.)

### Store `resultados` (modificar)

- Action `loadGrid`: `{ protocolId }` → **`{ protocolIds: number[] }`**.
- `reloadAfterMutation$`: dispara `loadGrid({ protocolIds: grid.protocolIds })`.
- `saveResults`/`markReady` sin cambios.

### Effect `loadGrid$` (modificar)

`forkJoin(protocolIds.map(getResultsByProtocol))` → `results = flat()` → (si vacío → grid vacío) → fan-out determinaciones + catálogo + nombres análisis (igual) + **fan-out pacientes**: distinct `patientId` → `getByIds` → `patientNameById` (`firstName lastName`) → `buildResultGrid({ protocolIds, results, determinationsByResult, catalogById, analysisNameById, patientNameById })`.

### Pantalla `cargar-resultados.page` (modificar)

- Lee `route.snapshot.queryParamMap.get('protocols')` → `split(',').map(Number).filter(n => !Number.isNaN(n))` → `protocolIds`. `dispatch(loadGrid({ protocolIds }))`.
- `resumenItems` (computed) ya recorre `grid.sections` por result; sin cambio salvo que ahora puede haber más results. Usar el rótulo de paciente en el label del resumen también (`grid.resultLabels`).

### Componente `result-grid` (modificar)

- Header de columna: `{{ grid().resultLabels[rid] ?? ('#' + rid) }}` (antes `#{{ rid }}`). Lógica de edición/payload sin cambios.

### Wiring `worklist.page` (modificar)

- Reemplazar `selectedTubeProtocolId` (single) por **`selectedProtocolIds = computed<number[]>`** = `[...new Set(selectedSamples().map(s => (s as Tube).protocolId))]`.
- Botón "Cargar resultados": `[disabled]="selectedProtocolIds().length === 0"`.
- `cargarResultados()`: `router.navigate(['/analitica/procesamiento/cargar'], { queryParams: { protocols: this.selectedProtocolIds().join(',') } })`.

### Ruta (`analitica.routes.ts`)

- `procesamiento/cargar/:protocolId` → `procesamiento/cargar` (sin path param; usa query param). Guard `ANALITICA` igual.

## Testing

- **`buildResultGrid`:** protocolIds en el grid; resultLabels por paciente (+ fallback `#id`); merge de results de 2 protocolos con el mismo análisis → una sección con 2 columnas.
- **`PacientesApiService`:** `getByIds` pega a `/patients/by-ids` con `ids` repetidos.
- **Reducer:** `loadGrid({protocolIds})` (loading true) — actualizar el test existente.
- **Effect `loadGrid$`:** fan-out multi-protocolo (2 protocolos → results mergeados) + nombres de paciente; reload usa protocolIds.
- **Page (smoke):** lee `?protocols=50002,50003` → protocolIds = [50002,50003]; dispatch loadGrid.
- **`result-grid`:** header usa resultLabels.
- **`worklist`:** selectedProtocolIds distinct; botón habilitado con ≥1; navega con queryParams.

## Riesgos / notas

- Es un **cambio breaking** del modelo `ResultGrid` (protocolId→protocolIds) y de la action `loadGrid` → hay que actualizar todos los tests existentes de 3b que los usan.
- Fan-out de pacientes: una sola llamada batch (`by-ids`), barato.
- Columnas: con muchas muestras la grilla se ensancha (scroll horizontal ya existe en `result-grid`).
- Validación (#77) queda sin tocar y sin mergear; se rehará con pantalla nueva (arco futuro).
