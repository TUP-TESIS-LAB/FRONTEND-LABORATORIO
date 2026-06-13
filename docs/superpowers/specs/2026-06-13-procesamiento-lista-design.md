# Procesamiento — Arco 1: Lista real de muestras en procesamiento

> **Jira:** [KAN-98](https://exequielsantoro.atlassian.net/browse/KAN-98)
> **Fecha:** 2026-06-13
> **Rama:** `feat/procesamiento-lista` (worktree `FRONTEND-LABORATORIO-procesamiento`, base `development`)

## Contexto

La pantalla `/analitica/procesamiento` hoy reusa `WorklistPage` con `screenKey: 'procesamiento'`,
pero corre **mock** (`MockSamplesService`): solo `recoleccion` y `descarte` están conectadas al
backend. Vamos a rediseñar todo el flujo de procesamiento siguiendo el mockup de referencia
(`procesamiento-angular`), que es grande (5 vistas × 4 módulos backend). Por eso se decompone en
sub-arcos; **este spec cubre solo el Arco 1**.

### Decomposición acordada (referencia)

- **Arco 1 (este):** Lista real de procesamiento conectada al backend.
- **Arco 2:** Planillas / hojas de trabajo (módulo `worksheets`).
- **Arco 3:** Cargar resultados — grid determinaciones × muestras (módulo `resultados`) + mark-ready + resumen.
- **Arco 4 (final):** Validación + firma (módulo `postanalitica`).

## Objetivo del Arco 1

`/analitica/procesamiento` deja de ser mock y muestra las muestras reales en estado `PROCESSING`,
usando la **misma lista unificada (`sample-table` / `Tube`)** que recolección, tránsito y descarte,
con polling ETag, scan y búsqueda. La lista es **read-only** en este arco: las acciones reales
(Planillas, Marcar completadas) llegan en arcos posteriores.

## Requisitos

1. La lista debe ser la misma `sample-table` con los mismos datos que el resto de las pantallas
   (agrupada por `Tube` vía `groupTubes`, badge de estado "En proceso").
2. Datos reales desde el backend: `GET /api/v1/analitica/preanalitica/labels/worklist?status=PROCESSING&branchId=…`
   (ya existe; soporta multi-status y sucursal efectiva `COALESCE(destination, origin)`).
3. Refresco en tiempo real con el estándar del repo: `PollingService` + ETag/304, intervalo 5s,
   pausa en pestaña oculta, dedup por `pending`.
4. Toolbar: scan + búsqueda funcionales, más los botones **Planillas** y **Marcar completadas**
   **visibles pero deshabilitados** ("próximamente"), anticipando la UI final del mockup.
5. Read-only: sin transiciones ni batch-menu de acciones (igual que descarte).
6. Mensajes de error en español, sin leak de internals (regla #4 del repo).

## Fuera de alcance (Arco 1)

- CRUD de planillas / hojas de trabajo.
- Carga de resultados / grid de determinaciones.
- Validación y firma.
- Cualquier cambio de backend (el endpoint ya existe).

## Diseño

Todo vive en el feature `muestras`, siguiendo el patrón ya establecido para `descarte`.

### Store — nuevo slice `procesamiento`

Replica el slice `descarte`:

- **Actions** (`muestras.actions.ts`):
  - `loadProcesamiento` `[Muestras Page] Load Procesamiento`
  - `loadProcesamientoSuccess` `{ items: LabelWorklistItem[] }`
  - `loadProcesamientoNotModified`
  - `loadProcesamientoFailure` `{ error: HttpErrorResponse }`
- **Reducer** (`muestras.reducer.ts` / `muestras.state.ts`): agregar `procesamientoItems: LabelWorklistItem[]`.
  `Success` reemplaza items; `NotModified` no toca; `Failure` setea `error` (reusa el campo de error compartido).
- **Selector** (`muestras.selectors.ts`): `selectProcesamientoItems`.
- **Effect** (`muestras.effects.ts`): `loadProcesamiento$` → `api.getWorklist('PROCESSING', branchId)`,
  mapea `NotModified` → `loadProcesamientoNotModified`, lista → `loadProcesamientoSuccess`, error → `loadProcesamientoFailure`.
  Toma `branchId` del estado (igual que recolección/descarte). Respeta dedup si el feature ya lo aplica.

### WorklistPage (`worklist.page.ts`)

- `isBackendScreen`: incluir `'procesamiento'`.
- `canTransition`: `false` para `'procesamiento'` (read-only, como descarte).
- `sourceRows`: para `screenKey === 'procesamiento'` → `groupTubes(procesamientoItems(), branchName())`.
- `total`: rama backend.
- Constructor: para `screenKey === 'procesamiento'` → `dispatch(initMuestras())`, arrancar
  `polling.startPolling({ key: 'muestras-procesamiento', intervalMs: 5000, poll: () => dispatch(loadProcesamiento()) })`,
  `destroyRef.onDestroy(stop)`, y el `effect` de error deduplicado por firma `status:message` (idéntico a descarte).
- Selector signal `procesamientoItems = store.selectSignal(selectProcesamientoItems)`.

### Toolbar (botones deshabilitados)

Los botones **Planillas** y **Marcar completadas** se muestran deshabilitados solo cuando
`screenKey === 'procesamiento'`. Texto/tooltip "Próximamente". No disparan ninguna acción.
(El resto de pantallas no los muestra.) Implementación dentro del template del worklist con un
flag derivado del `screenKey`, sin tocar el comportamiento de las demás pantallas.

### Sin cambios

- Route `/analitica/procesamiento` (ya existe, guard `ANALITICA`).
- `sample-table`, `scan-bar`, `PollingService`, `etagInterceptor`, `groupTubes`.
- Backend.

## Estados / mapeo

`PROCESSING` (BackendLabelStatus) → `processing` (SampleState) → badge "En proceso" (color amber).
Ya existe en `BACKEND_TO_SAMPLE_STATE` y en los maps de `sample-table`. Sin cambios.

## Testing

- **Reducer:** `loadProcesamientoSuccess` puebla `procesamientoItems`; `NotModified` lo deja igual;
  `Failure` setea `error`.
- **Effect:** `loadProcesamiento$` emite Success con items, `NotModified` con sentinel 304, `Failure` con HttpError.
- **Selector:** `selectProcesamientoItems` devuelve el slice.
- **Page (smoke):** con `screenKey: 'procesamiento'`, renderiza filas agrupadas por tubo en estado
  "En proceso"; botones Planillas/Marcar completadas presentes y deshabilitados; sin batch-menu de acciones.

## Riesgos / notas

- El endpoint `worklist?status=PROCESSING` depende de que haya labels en `PROCESSING` para el branch
  efectivo. Para el smoke local puede requerir seed (V948 ya deja muestras encaminadas; verificar que
  alguna quede en PROCESSING tras un dispatch).
- Los botones deshabilitados son deuda de UI intencional para anticipar la pantalla final del mockup;
  se activan en Arco 2/3.
