# Procesamiento — Arco 3b: Grilla de carga de resultados

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Fecha:** 2026-06-13
> **Rama:** `feat/procesamiento-cargar-resultados` (worktree `FRONTEND-LABORATORIO-cargar`, base `development`)
> **Backend:** Arco 3a (KAN-101, PR #71 merged) — endpoint `GET /resultados/{id}/determinations` + seed.

## Contexto

Tercer arco del rediseño de Procesamiento (mockup `procesamiento-angular`, `worksheet-view` + `resumen-modal`). Implementa la **carga de resultados**: una grilla determinaciones × results agrupada por análisis, editable, que guarda en batch y marca resultados como listos.

El backend (módulo `resultados`) modela los resultados **por orden de análisis** (`AnalyticalResult`), cargables **por protocolo**. Decisión de diseño (aprobada): la entrada es **por protocolo/muestra** — desde la lista de procesamiento se selecciona un tubo y se abre la grilla del protocolo de esa muestra. No por plantilla (el backend no liga plantilla→protocolos).

⚠️ **Pendiente conocido:** la creación de `AnalyticalResult` al pasar una muestra a PROCESSING NO existe en producción (Arco 3a usó **solo seed**). La grilla muestra un **aviso UX** al respecto.

## Objetivo

Desde el worklist de procesamiento, seleccionar un tubo y abrir una pantalla de carga: grilla por análisis del protocolo, tipear valores de determinaciones, guardar (batch atómico por result), y marcar como completados los results cuyas determinaciones estén todas cargadas.

## Requisitos

1. **Entrada:** en el worklist de procesamiento (read-only), al seleccionar **exactamente un** tubo se habilita el botón **"Cargar resultados"** → navega a `procesamiento/cargar/:protocolId` (el `protocolId` sale del tubo). Si hay 0 ó >1 seleccionados, el botón está deshabilitado.
2. **Carga de la grilla** (`protocolId`):
   - `GET /api/v1/analitica/resultados/protocol/{protocolId}` → `AnalyticalResultResponse[]` (results = columnas).
   - por result: `GET /api/v1/analitica/resultados/{id}/determinations` → `DeterminationResponse[]` (celdas: `determinationCatalogId` + `resultValue`).
   - filas/unidades: `GET /api/v1/analitica/determination-catalog/{id}` por cada `determinationCatalogId` distinto → nombre + unidad + `analysisCatalogId`.
   - nombre del análisis (header de sección): reusar `AnalysisService.getById(analysisCatalogId)`.
   - Ensamblar un modelo de grilla agrupado por análisis (sección): cada sección tiene sus filas (determination-catalog) y columnas (results de ese análisis); celda = `Determination` (id + value).
3. **Editar:** copia local editable de los valores (signals). Marca celdas modificadas (dirty).
4. **Guardar ("Guardar y revisar"):** por cada result con celdas modificadas, `PATCH /resultados/{id}/determinations/batch` con `items: [{ determinationId, resultValue, observations }]` (solo las modificadas con valor no vacío; atómico). Mutación pesimista (success → recargar la grilla). Al terminar, abrir **resumen-modal**.
5. **Resumen-modal:** por result, `filled/total` determinaciones + estado (`completa` = todas cargadas, `parcial` = algunas, `sin` = ninguna). "Marcar completadas" **solo habilita** los results en estado `completa`; parciales/sin quedan deshabilitados con su motivo (evita el 422 del backend).
6. **Marcar completadas:** `POST /resultados/{id}/mark-ready` por cada result seleccionado (completo). Mutación pesimista.
7. **Aviso UX:** banner visible en la pantalla de grilla: *"Datos de demo: la creación automática de resultados al pasar a PROCESSING está pendiente."*
8. Errores en español (`humanizeBackendError` + toast), sin leak. `p-dialog`/PrimeIcons, OnPush, signals.

## Fuera de alcance (3b)

- Validación/firma (postanalítica) — Arco 4.
- Carga por plantilla / cruce de protocolos (se eligió por-protocolo).
- Delta Check / historial de determinaciones (`GET /{id}/history/...`).
- Observaciones por celda (se manda `observations` null/omitido salvo que el grid lo soporte; YAGNI: sin UI de observaciones en este arco).
- Crear `AnalyticalResult` desde el front (solo seed; pendiente backend).

## Diseño

### Service `ResultadosApiService` (en `muestras/services/`)

- `getResultsByProtocol(protocolId): Observable<AnalyticalResult[]>` → `GET .../resultados/protocol/{protocolId}`.
- `getDeterminations(resultId): Observable<Determination[]>` → `GET .../resultados/{id}/determinations`.
- `getDeterminationCatalog(catalogId): Observable<DeterminationCatalogEntry>` → `GET .../determination-catalog/{id}`.
- `batchUpdate(resultId, items): Observable<Determination[]>` → `PATCH .../resultados/{id}/determinations/batch` body `{ items }`.
- `markReady(resultId): Observable<AnalyticalResult>` → `POST .../resultados/{id}/mark-ready`.

### Modelos (en `muestras/models/resultado.model.ts`)

```ts
interface AnalyticalResult { id: number; protocolId: number; analysisOrderId: number; sectionId: number; patientId: number; }
interface Determination { id: number; analyticalResultId: number; determinationCatalogId: number; resultValue: string | null; observations: string | null; }
interface DeterminationCatalogEntry { id: number; name: string; unit: string | null; referenceValues: string | null; analysisCatalogId: number; }
// Modelo de grilla ensamblado:
interface GridCell { determinationId: number; value: string; }              // value = '' si null
interface GridRow { catalogId: number; name: string; unit: string | null; cells: Record<number /*resultId*/, GridCell | null>; }
interface GridSection { analysisCatalogId: number; analysisName: string; resultIds: number[]; rows: GridRow[]; }
interface ResultGrid { protocolId: number; sections: GridSection[]; resultMeta: Record<number, { patientId: number }>; }
```

### Store nuevo `resultados` (NgRx clásico)

- **State:** `{ grid: ResultGrid | null; loading: boolean; saving: boolean; error: HttpErrorResponse | null }`.
- **Actions:** `loadGrid({protocolId})` / `loadGridSuccess({grid})` / `loadGridFailure({error})`; `saveResults({results: {resultId, items}[]})` / `saveResultsSuccess` / `saveResultsFailure({error})`; `markReady({resultIds})` / `markReadySuccess` / `markReadyFailure({error})`.
- **Effects:**
  - `loadGrid$`: `getResultsByProtocol` → `switchMap` → `forkJoin` de (por result: `getDeterminations`) → recolectar catalogIds distintos → `forkJoin` de `getDeterminationCatalog` + `AnalysisService.getById` (analysis distintos) → ensamblar `ResultGrid` → Success. (toda la complejidad de fan-out en un solo effect).
  - `saveResults$`: `concatMap` por result → `batchUpdate` (forkJoin de los results modificados, o secuencial) → Success → `reloadAfterSave` (`loadGrid` del protocolo actual).
  - `markReady$`: `forkJoin`/`concat` de `markReady(resultId)` por cada uno → Success → reload.
- **Selectors:** `selectGrid`, `selectResultadosLoading`, `selectResultadosSaving`, `selectResultadosError`.
- **Registro:** `provideState('resultados', resultadosReducer)` + `provideEffects(ResultadosEffects)` en `app.config.ts` (junto a muestras/worksheetTemplates).

### Componentes (en `muestras/`)

- **`pages/cargar-resultados/cargar-resultados.page`** (ruta `procesamiento/cargar/:protocolId`, guard `ANALITICA`): lee `protocolId` de la ruta, `dispatch(loadGrid)`, banner UX, host de la grilla y del resumen, toast de error deduplicado. Botón "← Volver" a procesamiento.
- **`components/result-grid/result-grid.component`**: input `grid: ResultGrid`; copia local editable (signals) de los valores; secciones por análisis; inputs por celda; emite `save` con el payload de modificados. "Guardar y revisar".
- **`components/resumen-resultados-modal/resumen-resultados-modal.component`** (`p-dialog`): input `items` (por result: filled/total/status); selección (solo `completa` habilitada); emite `markCompleted(resultIds)`.

### Wiring en `worklist.page` (procesamiento)

- `selectedTubeProtocolId` computed: si hay exactamente 1 tubo seleccionado → su `protocolId`, si no → null.
- Botón "Cargar resultados" (nuevo, solo procesamiento): `[disabled]="selectedTubeProtocolId() == null"`; click → `router.navigate(['procesamiento/cargar', protocolId])`.
- (El botón "Marcar completadas" del Arco 1 sigue deshabilitado / o se retira si "Cargar resultados" lo reemplaza — decidir en el plan; preferencia: reemplazar "Marcar completadas" por "Cargar resultados".)

## Testing

- **Service:** cada método pega a la URL correcta (HttpTestingController).
- **Reducer:** load/save/markReady success/failure mutan loading/saving/error/grid.
- **Effects:** `loadGrid$` ensambla el grid (mock service con results+determinations+catalog+analysis); `saveResults$` llama batchUpdate por result modificado y recarga; `markReady$` llama markReady por id y recarga; failures mapeadas.
- **`result-grid` (smoke):** renderiza secciones/filas/columnas; editar marca dirty; `save` emite solo las celdas modificadas con `determinationId`+value.
- **`resumen-resultados-modal` (smoke):** estado completa/parcial/sin; solo `completa` seleccionable; `markCompleted` emite los resultIds completos.
- **`cargar-resultados.page` (smoke):** lee protocolId de la ruta, dispatch loadGrid, muestra el banner UX.
- **`worklist.page`:** `selectedTubeProtocolId` y habilitación del botón Cargar resultados.

## Riesgos / notas

- Fan-out de requests en `loadGrid$`: para N results × M determinaciones puede ser varias llamadas; en el seed (≤4 results, 1 det c/u) es trivial. Cachear catálogo/análisis por id dentro del effect para no repetir.
- El `Tube` debe exponer `protocolId` (verificar `tube.model.ts`; `LabelWorklistItem` lo tiene). Si el tubo agrupa labels de distintos protocolos (no debería: un sample = un protocolo), tomar el del primer label y documentarlo.
- `AnalyticalResultResponse` no expone `analysisCatalogId`: el análisis de un result se deriva del `analysisCatalogId` de su determination-catalog (vía las determinaciones). Documentado.
- Banner UX = recordatorio del pendiente de creación de results en producción.
