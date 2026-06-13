# Procesamiento — Arco 2: Gestión de plantillas (Planillas)

> **Jira:** _(pendiente — se completa al crear el ticket)_
> **Fecha:** 2026-06-13
> **Rama:** `feat/procesamiento-planillas` (worktree `FRONTEND-LABORATORIO-planillas`, base `development`)
> **Arco previo:** Arco 1 (KAN-98, PR #72 merged) — lista real de procesamiento.

## Contexto

Segundo arco del rediseño de Procesamiento (mockup `procesamiento-angular`). El Arco 1 dejó la lista real con el botón **Planillas** visible pero **deshabilitado**. Arco 2 lo habilita: gestión de **plantillas de hoja de trabajo** (worksheet templates) — listar, crear y editar.

El mockup mezcla en "hoja de trabajo" tres cosas: plantilla (nombre + análisis), contenedor de muestras, y carga de resultados. El backend las separa: **`worksheet templates`** (nombre + análisis) vs **`worksheets`** instances (template + sección + estado) vs **`resultados`** (carga de valores). **Arco 2 cubre solo las plantillas (templates).** La generación de instances + "Cargar resultados" + muestras-en-hoja caen en Arco 3.

## Objetivo

Habilitar el botón Planillas del worklist de procesamiento para abrir una modal que **lista, crea y edita** worksheet templates contra el backend real, reusando el catálogo de análisis existente. Operaciones no soportadas por el backend o que pertenecen a arcos futuros quedan **deshabilitadas ("próximamente")**.

## Requisitos

1. El botón **Planillas** (hoy `disabled`, solo en `procesamiento`) abre la modal de planillas.
2. **Listar** plantillas: `GET /api/v1/analitica/worksheets/templates` → nombre + "N análisis".
3. **Crear** plantilla: `POST /api/v1/analitica/worksheets/templates` con `{ name, analyses: [{ analysisTypeId, displayOrder }] }`.
4. **Editar** plantilla: `PUT /api/v1/analitica/worksheets/templates/{id}` (mismo body). Al editar, resolver los nombres de los análisis (el response solo trae ids) vía el catálogo.
5. **Buscador de análisis**: `GET /api/v1/analitica/analysis?nameLike=` (reusar `AnalysisService.searchByName`), agregar a una lista ordenable (subir/bajar/quitar).
6. **Deshabilitados ("próximamente")**: "Cargar resultados" (Arco 3), "Eliminar" (sin endpoint backend), "Ver detalle" (Arco 3).
7. Refresco: la lista se recarga tras crear/editar (mutación pesimista). No requiere polling (no es una cola en vivo).
8. Errores en español sin leak (`humanizeBackendError` + toast). Mutaciones pesimistas.
9. UI con el design system del repo: PrimeNG `p-dialog` (no overlays custom), PrimeIcons.

## Fuera de alcance (Arco 2)

- Generar worksheet-instance (`POST /worksheets`), estado GENERATED→IN_ANALYSIS→COMPLETED, PDF.
- Carga de resultados / grid de determinaciones / "Cargar resultados".
- Muestras asignadas a una hoja / contador de muestras por hoja.
- Eliminar/desactivar plantilla (no hay endpoint; botón deshabilitado).
- Mostrar determinaciones de cada análisis en el buscador (YAGNI para este arco; nombre + shortCode alcanza).
- Cambios de backend.

## Diseño

### Store nuevo — feature `worksheetTemplates`

NgRx clásico, mutaciones pesimistas (success → reload). Vive en `src/app/features/analitica/muestras/store/worksheet-templates/` (o `muestras/store/` junto a muestras; ver File Structure en el plan).

- **Modelo** `WorksheetTemplate`:
  ```ts
  interface WorksheetTemplateAnalysis { analysisTypeId: number; displayOrder: number; }
  interface WorksheetTemplate { id: number; name: string; analyses: WorksheetTemplateAnalysis[]; active: boolean; version: number; }
  ```
  Request body de create/update: `{ name: string; analyses: { analysisTypeId: number; displayOrder: number }[] }`.
- **State**: `{ templates: WorksheetTemplate[]; pending: boolean; saving: boolean; error: HttpErrorResponse | null }`.
- **Actions**:
  - `loadTemplates` / `loadTemplatesSuccess({ templates })` / `loadTemplatesFailure({ error })`
  - `saveTemplate({ id: number | null, name, analyses })` / `saveTemplateSuccess` / `saveTemplateFailure({ error })`
  - (sin delete)
- **Selectors**: `selectTemplates`, `selectTemplatesPending`, `selectTemplatesSaving`, `selectTemplatesError`.
- **Effects**:
  - `loadTemplates$` → `api.listTemplates()` → Success/Failure.
  - `saveTemplate$` → `id == null ? api.createTemplate(body) : api.updateTemplate(id, body)` → Success/Failure (pesimista).
  - `reloadAfterSave$` → `saveTemplateSuccess` ⇒ `loadTemplates()`.
- **Service** `WorksheetTemplatesApiService`:
  - `listTemplates(): Observable<WorksheetTemplate[]>` → `GET /api/v1/analitica/worksheets/templates`
  - `createTemplate(body): Observable<WorksheetTemplate>` → `POST .../templates`
  - `updateTemplate(id, body): Observable<WorksheetTemplate>` → `PUT .../templates/{id}`

### Componentes (en `features/analitica/muestras/components/planillas/`)

- **`planillas-modal.component`** (`<app-planillas-modal>`): `p-dialog`. Inputs: `visible`. Outputs: `closed`, `newSheet`, `editSheet(id)`. Lista `selectTemplates()`: por fila nombre + "{{ n }} análisis"; botón "Cargar resultados" `disabled` (title "Próximamente"); kebab con Editar (emite `editSheet`), "Ver detalle" disabled, "Eliminar" disabled. Footer: "Nueva hoja" (emite `newSheet`). Estado vacío y `pending` contemplados.
- **`worksheet-config-modal.component`** (`<app-worksheet-config-modal>`): `p-dialog`. Inputs: `visible`, `templateId: number | null`. Outputs: `closed`, `saved`. Campos: `name` (ngModel) + buscador (`AnalysisService.searchByName`, debounce) que agrega a `ordered: { analysisTypeId, name }[]`; lista ordenable (subir/bajar/quitar). Al abrir con `templateId`, carga el template (`selectTemplates()` o getById) y resuelve nombres con `forkJoin(ids.map(id => analysis.getById(id)))`. Guardar (válido = name no vacío + ≥1 análisis) → `dispatch(saveTemplate({ id: templateId, name, analyses: ordered.map((a,i) => ({ analysisTypeId: a.analysisTypeId, displayOrder: i })) }))`. Toast de éxito al confirmar backend.

### Wiring en `worklist.page`

Solo para `screenKey === 'procesamiento'`:
- Reemplazar el botón Planillas `disabled` por uno activo que setea `planillasOpen.set(true)`.
- Signals locales: `planillasOpen`, `configOpen`, `editingTemplateId: number | null`.
- `dispatch(loadTemplates())` al entrar a procesamiento (junto al init existente).
- Hosts `@if (planillasOpen())` → `<app-planillas-modal>`; `@if (configOpen())` → `<app-worksheet-config-modal>`.
- "Nueva hoja" → `editingTemplateId=null; configOpen=true; planillasOpen=false`. "Editar(id)" → `editingTemplateId=id; configOpen=true`. `saved`/`closed` cierran y reabren planillas según corresponda.

### Registro

`provideState('worksheetTemplates', worksheetTemplatesReducer)` + `provideEffects(WorksheetTemplatesEffects)` en el lugar donde se registran los providers de la feature analitica/muestras (mismo patrón que muestras).

## Mensajes / estados

- Roles backend: BIOQUIMICO/ADMINISTRADOR. Si el usuario no tiene rol → 403 → toast en español genérico (sin leak).
- "Cargar resultados", "Eliminar", "Ver detalle": `disabled` + `title="Próximamente"`.

## Testing

- **Reducer**: `loadTemplatesSuccess` puebla `templates` + `pending=false`; `saveTemplate` setea `saving=true`; `saveTemplateSuccess` `saving=false`; `*Failure` setea `error`.
- **Effects**: `loadTemplates$` (success/failure); `saveTemplate$` llama create cuando `id==null` y update cuando `id` presente; `reloadAfterSave$` emite `loadTemplates`.
- **Selectors**: cada selector proyecta su slice.
- **Service**: métodos pegan a las URLs correctas (HttpTestingController).
- **`worksheet-config-modal` (smoke)**: agregar/quitar/ordenar análisis; `valid` requiere nombre + ≥1 análisis; Guardar emite `saveTemplate` con `displayOrder` = índice; al editar resuelve nombres.
- **`planillas-modal` (smoke)**: renderiza N plantillas; "Cargar resultados"/"Eliminar"/"Ver detalle" disabled; "Nueva hoja"/"Editar" emiten sus outputs.

## Riesgos / notas

- El endpoint `/templates/{id}/form` NO enriquece `analysisName` (siempre null), por eso al editar resolvemos nombres vía `AnalysisService.getById`. Para N grande sería N requests; en la práctica una plantilla tiene pocos análisis (aceptable). Si crece, evaluar endpoint batch (follow-up).
- `version` (optimistic locking) viene en el response; el update no lo exige en el body según el contrato actual — no lo enviamos salvo que el backend lo pida.
- No reusamos `analysis-picker` (acoplado a semántica de atención + sin ordenamiento); sí reusamos `AnalysisService`.
