# Pantalla Nomenclador NBU (Clínico) con precio particular — Design

> **Jira:** [KAN-118](https://exequielsantoro.atlassian.net/browse/KAN-118)
> **Fecha:** 2026-06-19 · **Rama:** `feat/nomenclador-nbu-clinico` (desde `development` d372c92)
> **Mockup de referencia:** `mockups/nbu-clinico-v3.html` (interactivo)

## Problema / objetivo

Construir en la app real la pantalla del **Nomenclador NBU** dentro del grupo **Clínico** del sidebar, como **mock conectable**: datos mock ahora, con modelos/servicio que espejan el contrato del backend futuro (catálogo de análisis + versiones NBU de la PR #95, y precio particular de coverages), de modo que conectar al backend sea cambiar el cuerpo del servicio (`of(MOCK)` → `http.*`), no el contrato.

Hoy existe un stub: ruta `/analitica/nbu` → `NbuComponent` (lista `{{codigo}} — {{descripcion}}`) alimentada por el store `analitica` (`loadNbus` → `AnaliticaService.getNbus()`), con un `Nbu` model mínimo (`id, codigo, descripcion, precio`). Se construye **sobre** ese scaffold, enriqueciéndolo.

## Alcance (decidido en brainstorming)

- **Identidad (opción B):** la pantalla es el **catálogo de análisis clínico**, con el **precio particular como pestaña** adentro — no un link suelto de precios. Vive en Clínico, al lado de Muestras.
- **Override "Manual" por estudio:** INCLUIDO (es FE puro; define el contrato del mock).
- **Versiones NBU:** selector de versión **read-only** compartido (la gestión/CRUD de versiones llega con la PR #95). No hay tab de gestión de versiones en este alcance.
- **Mock conectable:** sí. Sin llamadas HTTP reales todavía.

## Arquitectura

Feature `analitica`, pantalla en `pages/nbu/`. NgRx clásico del proyecto (extendiendo el store `analitica`), signals + `OnPush`, PrimeNG/Tailwind. Servicio mock con la misma firma que tendrá el real.

### Navegación
- Nuevo ítem en `sidebar.nav.ts`, grupo **Clínico**: `{ kind: 'link', label: 'Nomenclador NBU', icon: 'pi pi-book', path: '/analitica/nbu', sectionKey: 'ANALITICA' }` (gateado por la sección ANALITICA, que ya es del grupo Clínico).
- La ruta `/analitica/nbu` ya existe; se mantiene.

### Modelos (mock-conectables, espejan el backend futuro)
- `NbuVersion { id: string; label: string; vigente: boolean }` — para el selector.
- `CatalogAnalysis { id; shortCode; name; family; nbuCode; cantidadUbByVersion: Record<versionId, number>; determinations: { name; unit }[]; sampleType; processingTime }`.
  - `cantidadUb` depende de la versión elegida → por eso es un map por versión (espeja el `nbu_version_practice` futuro).
- `ParticularPricing { valorUb: number; overrides: Record<analysisId, number> }` — config a nivel laboratorio.
- Estos reemplazan/extienden el `Nbu` actual (que es demasiado plano). El `Nbu` viejo y `getNbus()` se retiran o se reusan si encajan; el plan lo resuelve.

### Servicio mock
- `NomencladorService` (o extensión de `AnaliticaService`) con métodos que devuelven `of(MOCK)`:
  - `getVersions(): Observable<NbuVersion[]>`
  - `getCatalog(): Observable<CatalogAnalysis[]>`
  - `getParticularPricing(): Observable<ParticularPricing>`
  - `saveValorUb(valor: number): Observable<void>` / `setOverride(analysisId, precio | null): Observable<void>` (mutación mock en memoria, persiste en la sesión — patrón del `ObraSocialService` mock).
- Header del servicio documenta: "MOCK — reemplazar cada `of(...)` por `this.http.*` para enchufar el backend (coverages/NBU). Las firmas no cambian." (igual que `obra-social.service.ts`).

### Store (NgRx clásico, extiende `analitica`)
- Actions: `loadNomenclador` (carga versiones + catálogo + pricing), `*Success`, `*Failure`; `setNbuVersion(versionId)` (UI/local, puede ser signal en el componente en vez de store); `saveValorUb(valor)` + success; `setParticularOverride({analysisId, precio|null})` + success (mutations pessimistic, como manda la convención).
- State: `versions`, selectedVersionId, `catalog`, `particular { valorUb, overrides }`, pending/error.
- Selectors: `selectVersions`, `selectSelectedVersion`, `selectCatalogRows` (con cantidadUb resuelta por versión), `selectParticularRows` (precio = override ?? cantidadUb×valorUb), `selectPending`.
- El precio derivado se calcula en un **selector** (no en el template), única fuente de la fórmula.

### Componentes
- `NbuComponent` (page) → header + selector de versión (compartido) + tabs.
- `nbu-catalogo-tab` → tabla del catálogo con fila expandible de determinaciones (reusar el patrón de fila expandible de muestras).
- `nbu-particular-tab` → card de valor U.B. (editable) + tabla de precios derivados con override inline + estados "Manual"/"Sin U.B.".
- Tabla: reusar el componente genérico `ui-table` del proyecto (regla `laboratory-ui-table`: nunca `p-table` inline) si soporta la fila expandible; si no, documentar la excepción en el plan.
- Precios formateados con `CurrencyArPipe` (ya existe).

## Interacción
- Cambiar **versión** → recalcula `cantidadUb` en ambos tabs (vía selector).
- Editar **valor U.B.** → recalcula la columna de precio particular (salvo overrides).
- **Override por estudio**: editar inline → fija precio manual (badge "Manual", precio automático tachado); revertir → vuelve a U.B.×valor.
- **Sin U.B.** (cantidad 0): no calcula automático; permite fijar manual.
- Buscar (nombre/código/NBU) y filtrar por familia — client-side sobre el mock (server-side queda para cuando se conecte el back).

## Manejo de errores
- Fallo de carga del mock → estado de error con mensaje en español (no leak), patrón del proyecto. (En mock es improbable, pero el effect lo contempla para que al conectar el back ya esté.)

## Testing
- Store: reducer + selectors (precio derivado, override, cambio de versión) + effects (vitest).
- Componente: smoke de los tabs y la fila expandible (`ng test`).
- Servicio mock: que `getCatalog/getVersions/getParticularPricing` devuelvan datos y que las mutaciones (`saveValorUb`, `setOverride`) reflejen en memoria.

## Fuera de alcance
- Llamadas HTTP reales (se conectan después; el contrato queda listo).
- CRUD/gestión de versiones NBU (llega con PR #95).
- Edición del catálogo (alta/baja de análisis, determinaciones) — solo lectura del catálogo + edición de precio particular.
- ETag/polling (catálogo casi estático; no es pantalla de cola).
- Cambios de backend (este frente es 100% FE).

## Criterios de aceptación
1. Ítem "Nomenclador NBU" visible en el grupo Clínico del sidebar (gateado por ANALITICA), navega a la pantalla.
2. Tab Catálogo: lista de análisis con código, familia, cód. NBU y cantidad U.B. (según versión), determinaciones expandibles.
3. Tab Precio particular: valor U.B. editable que recalcula la columna; override "Manual" por estudio con revertir; estado "Sin U.B.".
4. Selector de versión compartido recalcula cantidades/precios en ambos tabs.
5. Todo sobre datos mock vía un servicio cuyas firmas no cambian al conectar el backend (`of` → `http`).
6. `ng test` verde (store + componente + servicio mock).
