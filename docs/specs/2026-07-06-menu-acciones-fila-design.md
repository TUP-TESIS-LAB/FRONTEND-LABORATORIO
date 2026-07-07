# Menú de acciones por fila (3 puntitos) en Recolección, Traslado y Procesamiento

> **Jira:** [KAN-208](https://exequielsantoro.atlassian.net/browse/KAN-208)
> **Fecha:** 2026-07-06 (revisado 2026-07-07 tras judgment-day)
> **Rama front:** `feat/procesamiento-filtro-derivados`.
> **Depende del back:** rama `feat/analitica-worklist-y-specs` (laboratorio) — unifica las 3 specs (KAN-178/181/183)
> + worklist (KAN-193). Aporta el **rollback sano** (KAN-181: el sync ramificado de `onLabelRolledBack` que evita
> el split-brain en IN_TRANSIT→COLLECTED). El rollback del menú se apoya en ese back.
> **Contexto:** menú de 3 puntitos al final de cada fila en Recolección, Traslado y Procesamiento (Todos+Derivados),
> con acciones Rollback/Rechazar/Perder. Dispara por-fila lo que hoy solo se hace por selección masiva.

## Problema

Hoy las acciones de transición de estado (rechazar, perder, revertir) solo se disparan por **selección masiva**
(tildar filas → batch-menu → transition-dialog). Falta un disparador **por fila**: un menú de 3 puntitos con esas
acciones directas sobre la muestra de esa fila.

## Alcance — hallazgos de judgment-day que corrigen el diseño inicial

El menú por fila **no existe hoy en ningún lugar del módulo muestras** — es un patrón nuevo. Y las 3 pantallas
**NO comparten componente** (contra la suposición inicial de "reusar en las 3"):

| Pantalla | Ruta | Componente (page) | Fila | Modelo |
|---|---|---|---|---|
| Recolección | `recoleccion` | `worklist.page` (screenKey) | `sample-table.component.html` (`<tr>`) | filas planas + `selectedIds` |
| Traslado | `traslado` | `transito.page` (propio) | `transito/sample-row.component.html` (anidado en cards) | **lotes/mochila** (`TransitoLotesService`) |
| Procesamiento | `procesamiento` | `procesamiento.page` (propio) | fila inline en `procesamiento.page.html` (grid `.proc-grid`) | filas planas + `selectedIds` |

**Solo Recolección** (`worklist.page`) tiene hoy el andamiaje del `transition-dialog` (`activeTransition`,
`confirmDialog`, el import). Traslado y Procesamiento **NO lo tienen** → hay que agregarlo (no es "reuso literal"
del dialog, es reimplementar el andamiaje reusando el componente `TransitionDialogComponent`).

**Acciones — menú UNIFORME (Rollback, Rechazar, Perder) en las 3 pantallas.** La máquina de estados del back lo
soporta:
- FORWARD de Label permite `IN_TRANSIT → REJECTED` y `IN_TRANSIT → LOST` (`Label.java:49`) → rechazar/perder en
  tránsito es válido (una muestra puede perderse en el camino o llegar rechazable).
- El mapa ROLLBACK permite `IN_TRANSIT → COLLECTED` y `PROCESSING → IN_TRANSIT` (`Label.java:59-60`).
- Recolección NO tiene rollback (es estado inicial, no hay a dónde volver) → su menú es **Rechazar, Perder**.

Resumen de acciones por pantalla (según lo que la máquina de estados permite):
| Pantalla | Menú |
|---|---|
| Recolección | Rechazar, Perder |
| Procesamiento | Rollback, Rechazar, Perder |
| Traslado | Rollback, Rechazar, Perder |

**Config a tocar:** Traslado hoy solo tiene `rollback` en su `state-machine.config`. Hay que **agregar `rejected` y
`lost`** a la screen `traslado` (targets ya válidos en el back). Recolección y Procesamiento ya tienen las suyas.

**FUERA de alcance (explícito):**
- **Derivar a terciarizado:** el concepto NO existe en el back (sin entidad/tabla/endpoint; la derivación `DERIVED`
  es ciega). Feature de dominio nueva con su ciclo SDD. NO se incluye.
- **Endpoint batch de LOST:** `POST /lost/{labelId}` es de-a-una (front hace `forkJoin`). Rechazar/Rollback ya son
  batch. Arreglar LOST a `{ labelIds }` atómico es feature aparte (follow-up). El menú opera 1 fila (impacto mínimo).

## Arquitectura

**Un componente compartido nuevo** `RowActionsMenuComponent` (standalone) + integración en las 3 filas. Casi toda
la capa de negocio ya existe; se agrega el disparador por-fila + el andamiaje del diálogo en 2 pantallas + 2
transiciones en la config de Traslado.

Maquinaria existente reusada:
- `muestras-api.service.ts`: `reject(labelIds, reason)`, `markLost(labelId)`, `rollback(labelIds)`.
- `muestras.effects.ts` `callTransition(labelIds, key, reason)`: mapea `'rejected'`/`'lost'`/`'rollback'` a los
  endpoints.
- `muestras.actions.ts` `transitionLabels({ labelIds, transitionKey, reason })`.
- `transition-dialog.component`: `@Input transition`, `@Input samples: Sample[]`, `@Output confirm/cancel`. Funciona
  con `[samples]` de 1 elemento (verificado: itera `@for (s of samples)`, no lee selección global). Para las 3
  acciones (rollback/rejected/lost) los targets tienen `fields: []` → el diálogo NO pide sucursal/área/lab, así que
  reusarlo en Procesamiento/Traslado no exige branches/areas/labs.
- `TransitionKey` ya incluye `'rejected' | 'lost' | 'rollback'`.

**Flujo:**
```
clic 3 puntitos (stopPropagation → no selecciona la fila)
  → p-menu popup con las acciones de esa pantalla
  → elegir una → (accion) emite la key
  → page: onRowAction(key, tube) → resuelve la Transition de la config del screen, setea activeTransition + [samples]=[tube]
  → transition-dialog: usuario confirma (motivo para Rechazar)
  → dispatch transitionLabels({ labelIds: tube.labelIds, transitionKey: key, reason }) → effect → endpoint
```

## Componente: `RowActionsMenuComponent`

Ubicación: `src/app/shared/ui/components/row-actions-menu/`. Sigue el patrón de `data-table.component.ts`
(`p-menu [popup]` + botón + `.toggle(event)`, líneas 144-153/211/482-488).

- **Template:** `<button class="ut-ibtn" (click)="$event.stopPropagation(); menu.toggle($event)"><i class="pi pi-ellipsis-v"></i></button>` + `<p-menu #menu [popup]="true" [model]="items()" />`.
- **Input `actions`:** `ReadonlyArray<{ key: RowActionKey; label: string; icon: string }>`. `RowActionKey = 'rollback' | 'rejected' | 'lost'`. Cada pantalla pasa las suyas.
- **Output `accion`:** `output<RowActionKey>()`.
- **`items()`:** computed que mapea `actions` a `MenuItem[]` de PrimeNG, `command` emite `accion`.
- **PrimeNG:** importa `MenuModule` (v21, ya en el proyecto). Una instancia de `p-menu` por fila.

## Integración por pantalla

### Recolección (filas planas — el más simple)
`sample-table.component.html`: nueva `<td>` al final del `<tr>` con el menú (+ subir `colspan` de la fila
expandible 7→8). `sample-table` recibe `Tube[]` en runtime (tipo `Sample[]`); castear/tipar para acceder a
`labelIds`. La page (`worklist.page`) YA tiene el `transition-dialog` + `activeTransition` + `confirmDialog` →
solo agregar el handler `onRowAction`.

### Procesamiento (filas planas — falta el andamiaje del diálogo)
`procesamiento.page.html`: nueva celda al final del `.proc-row` (+ ajustar `.proc-grid` `grid-template-columns` y
el header `.thead-card`). `procesamiento.page.ts`: **agregar** el `transition-dialog` (import + `activeTransition`
signal + `confirmDialog`/`cancelDialog` handlers + el bloque `@if` en el HTML), siguiendo el patrón de
`worklist.page`. Las filas ya son `Tube` (`selectedTubes`), `labelIds` disponible.

### Traslado (lotes — complejidad media, 3 saltos de propagación)
El row (`sample-row.component`) está anidado en `lote-card` y `recommended-group-card`. NO choca con el modelo de
lotes: la selección de Traslado YA es por fila (`_sel` signal en `TransitoLotesService`); lo "por lote" son las
acciones de envío, que no se tocan.
1. `sample-row.component`: agregar botón kebab + `@Output rowAction = output<RowActionKey>()` (hoy solo emite
   `toggle`). El row NO expone `labelIds` — emite su `id` string; la page resuelve labelIds.
2. `lote-card.component` y `recommended-group-card.component`: re-emitir `rowAction` (patrón idéntico al `toggle`
   que ya re-emiten).
3. `transito.page`: handler que recibe `rowAction({ id, key })`, resuelve `tube = service.tubesById()[id]` y sus
   `labelIds` (patrón que ya usa `sendGroup`: `tubes.flatMap(t => t.labelIds)`), y abre el diálogo. **Agregar** el
   andamiaje del `transition-dialog` (Traslado no lo tiene hoy — su confirmación es `ConfirmSendAllDialog`, ajena).
4. **Config:** agregar `rejected` + `lost` a la screen `traslado` en `state-machine.config.ts` (con su `toState`,
   `label`, `reason` para rejected — mismo shape que en recoleccion/procesamiento).

**Detalle de layout (riesgo a cuidar):** meter la celda del kebab en los 3 grids/tablas distintos sin romper la
alineación. Cada uno tiene su propio `grid-template-columns`/`colspan`.

**Clic:** `$event.stopPropagation()` en el botón para no disparar `toggleRow`/`toggle` de la fila.

## Dependencia del back (rollback)

El rollback del menú (Traslado: IN_TRANSIT→COLLECTED; Procesamiento: PROCESSING→IN_TRANSIT) requiere el **sync
ramificado de KAN-181** para que la Sample acompañe (sin split-brain). Ese fix está en la rama unificada
`feat/analitica-worklist-y-specs`, NO en development. **El front del menú y el back del rollback se integran cuando
ambas ramas lleguen a development.** Rechazar/Perder no dependen de nada (endpoints en development).

## Testing (Vitest)
- `RowActionsMenuComponent`: renderiza el botón; al abrir muestra las `actions`; elegir una emite `accion` con la
  `key` correcta.
- Por pantalla: `onRowAction(key, tube)` abre el diálogo con `[samples]=[tube]` y la transición correcta; al
  confirmar despacha `transitionLabels` con `tube.labelIds` y la `transitionKey`.
- Traslado: el `rowAction` se propaga row→card→page y resuelve los `labelIds` correctos vía `tubesById`.
- Config: la screen `traslado` expone `rejected`/`lost`/`rollback`.
- No-regresión: `toggleRow`/`toggle` (selección) sigue andando; el clic en el menú NO la dispara. El flujo masivo
  (batch-menu) y el de lotes/mochila (envío) intactos.

## Qué NO se rompe
- La capa de negocio (api/actions/effects) no se toca — solo se agrega un disparador por-fila.
- El flujo de lotes/mochila de Traslado (envío por lote) intacto — el menú es canal paralelo.
- El flujo de selección masiva intacto.
- El `transition-dialog` se reusa; recibir `[samples]` de 1 ya está soportado.

## Flujo SDD
brainstorming (hecho) → este design → jira-workflow (ticket hecho: KAN-208) → judgment-day (hecho) → tasks → apply
→ simplify → verify → integrar. Front (1 repo, 1 PR). Depende del back unificado para el rollback sano.
