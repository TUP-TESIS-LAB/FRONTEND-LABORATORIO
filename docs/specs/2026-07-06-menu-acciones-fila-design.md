# Menú de acciones por fila (3 puntitos) en Recolección, Traslado y Procesamiento

> **Jira:** _(pendiente — se crea con jira-workflow tras la review del spec)_
> **Fecha:** 2026-07-06
> **Rama:** `feat/procesamiento-filtro-derivados` (front; misma rama donde se acumula el trabajo de Procesamiento
> sobre la PR de pdf-firmas ya mergeada).
> **Contexto:** agregar un menú de acciones por fila (botón de 3 puntitos al final de cada fila) en las pantallas
> de muestras Recolección, Traslado y Procesamiento (los dos tabs: Todos y Derivados). Las acciones —Rollback,
> Rechazar, Perder— disparan por-fila lo que hoy solo se dispara por selección masiva. **Feature de front puro:
> toda la capa de negocio (endpoints, actions, effects, transition-dialog) ya existe.**

## Problema

Hoy las acciones de transición de estado de una muestra (rechazar, perder, revertir) solo se disparan por
**selección masiva**: el usuario tilda filas, abre el `batch-menu` y confirma en el `transition-dialog`. Falta un
disparador **por fila** — un menú de 3 puntitos al final de cada fila con esas acciones directas sobre esa muestra.

## Alcance

**Pantallas (3, con filas distintas):**
| Pantalla | Ruta | Componente | Fila |
|---|---|---|---|
| Recolección | `recoleccion` | `worklist.page` (screenKey) | `sample-table.component.html` (`<tr>`) |
| Traslado | `traslado` | `transito.page` | `transito/sample-row/sample-row.component.html` (`<div class="row">`) |
| Procesamiento | `procesamiento` | `procesamiento.page` | fila inline en `procesamiento.page.html` (grid `.proc-grid`) |

**Acciones del menú (las 3 conectables hoy):** Rollback, Rechazar, Perder. En las 3 pantallas. En Procesamiento
aplica a ambos tabs (Todos y Derivados) — es la misma fila/tabla.

**FUERA de alcance (explícito):**
- **Derivar a terciarizado:** el concepto de "laboratorio terciarizado/externo" NO existe en el back (no hay
  entidad, tabla ni endpoint; la derivación actual `DERIVED` es ciega). Es una feature de dominio nueva con su
  propio ciclo SDD (spec + ticket + entidad + migración + endpoint). NO se incluye en este menú.
- **Endpoint batch de LOST:** hoy `POST /lost/{labelId}` es de-a-una; el front hace `forkJoin(N peticiones)`.
  Rechazar y Rollback ya son batch nativo. Arreglar LOST para que acepte `{ labelIds }` en una sola petición
  atómica es un cambio de back → **feature aparte** (follow-up). El menú por-fila opera 1 fila a la vez, donde el
  impacto es mínimo (un tubo raramente agrupa muchos labels); el `forkJoin` de la capa existente se reusa tal cual.

## Arquitectura

**Un componente compartido nuevo** `RowActionsMenuComponent` (standalone) + integración en las 3 filas. **Cero back
nuevo, cero lógica de negocio nueva** — solo se agrega el disparador por-fila.

Toda la maquinaria ya existe y se reusa:
- `muestras-api.service.ts`: `reject(labelIds, reason)`, `markLost(labelId)`, `rollback(labelIds)`.
- `muestras.effects.ts` `callTransition(labelIds, key, reason)`: mapea `'rejected'`/`'lost'`/`'rollback'` a los
  endpoints (LOST vía `forkJoin`).
- `muestras.actions.ts` `transitionLabels({ labelIds, transitionKey, reason })`.
- `transition-dialog.component`: `@Input() transition`, `@Input() samples: Sample[]`, `@Output() confirm` /
  `cancel`. Reusable con N muestras (incluida 1).
- `TransitionKey` ya incluye `'rejected' | 'lost' | 'rollback'`.

**Flujo:**
```
clic 3 puntitos (stopPropagation → no selecciona la fila)
   → p-menu popup con Rollback / Rechazar / Perder
   → elegir una → (accion) emite la key
   → page: onRowAction(key, tube) → abre el transition-dialog con [samples]=[tube], [transition]=<la elegida>
   → usuario confirma (motivo para Rechazar)
   → dispatch transitionLabels({ labelIds: tube.labelIds, transitionKey: key, reason })
   → effect callTransition → endpoint existente
```

## Componente: `RowActionsMenuComponent`

Ubicación: `src/app/shared/ui/components/row-actions-menu/`. Sigue el patrón oficial de `data-table.component.ts`
(el `p-menu [popup]` + botón + `.toggle(event)`, líneas 144-153/211/482-488).

- **Template:** `<button class="ut-ibtn" (click)="$event.stopPropagation(); menu.toggle($event)"><i class="pi pi-ellipsis-v"></i></button>` + `<p-menu #menu [popup]="true" [model]="items()" />`.
- **Input `actions`:** `ReadonlyArray<{ key: RowActionKey; label: string; icon: string }>` — cada pantalla pasa las
  suyas. `RowActionKey = 'rollback' | 'rejected' | 'lost'`.
- **Output `accion`:** `output<RowActionKey>()`.
- **`items()`:** computed que mapea `actions` a `MenuItem[]` de PrimeNG, con `command` que emite `accion`.
- **PrimeNG:** importa `MenuModule` (v21, ya en el proyecto). Una instancia de `p-menu` por fila (el popup solo
  vive en el DOM al abrirse; PrimeNG lo maneja bien).

**Por qué un componente y no copiar el `p-menu` en cada fila:** las 3 filas son distintas; el componente evita
triplicar el popup + la lógica de toggle y centraliza el estilo del botón de 3 puntitos.

## Integración por pantalla

Mismo patrón en las 3 (3 lugares distintos):
1. **Insertar `<app-row-actions-menu [actions]="ROW_ACTIONS" (accion)="onRowAction($event, tube)" />`** al final de
   cada fila:
   - Recolección: nueva `<td>` al final del `<tr>` en `sample-table.component.html` + subir el `colspan` de la
     fila expandible de 7→8. `sample-table` recibe `Tube[]` en runtime (tipar/castear para acceder a `labelIds`).
   - Traslado: nuevo `<div>` al final del `.row` en `sample-row.component.html` + ajustar `grid-template-columns`
     en `sample-row.component.scss`.
   - Procesamiento: nueva celda al final del `.proc-row` en `procesamiento.page.html` + ajustar `grid-template-columns`
     (`.proc-grid`) y el header (`.thead-card`) en el SCSS.
2. **Const `ROW_ACTIONS`** por página (las 3 con las mismas 3 acciones): `[{ key:'rollback', label:'Revertir estado',
   icon:'pi pi-undo' }, { key:'rejected', label:'Rechazar', icon:'pi pi-times-circle' }, { key:'lost', label:'Marcar
   perdida', icon:'pi pi-question-circle' }]` (íconos/labels a afinar en implementación).
3. **Handler `onRowAction(key, tube)`** en cada page: resuelve la `Transition` correspondiente a la `key` (de la
   config de transiciones del screen), setea el signal `activeTransition` + las muestras del diálogo a `[tube]`. El
   `transition-dialog` (ya presente o importado) se abre; al confirmar, despacha
   `transitionLabels({ labelIds: tube.labelIds, transitionKey: key, reason })`.
4. **`transition-dialog`:** Recolección ya lo usa. Traslado y Procesamiento lo importan si no lo tienen. Recibe
   `[samples]=[tube]` (una sola muestra — caso ya soportado).

**Clic:** el botón de 3 puntitos está dentro de una fila con `(click)="toggleRow()"`. `$event.stopPropagation()` en
el botón evita que abrir el menú seleccione la fila.

## IDs disponibles en la fila (modelo `Tube`)

`Tube extends Sample` tiene `labelIds: number[]` (los IDs que `reject`/`markLost`/`rollback` esperan), `sampleId`,
`protocolId`. El `id` string del view-model (`t{sampleId}`/`l{labelId}`) es solo track, NO el ID backend — usar
`labelIds`.

## Testing (Vitest)

- `RowActionsMenuComponent`: renderiza el botón; al abrir muestra las `actions` pasadas; elegir una emite `(accion)`
  con la `key` correcta.
- Por pantalla: `onRowAction(key, tube)` abre el diálogo con `[samples]=[tube]` y la transición correcta; al
  confirmar, despacha `transitionLabels` con `tube.labelIds` y la `transitionKey`.
- No-regresión: `toggleRow` (selección de fila) sigue andando; el clic en el menú NO la dispara (`stopPropagation`).
- No-regresión: el flujo masivo (batch-menu + transition-dialog) intacto.

## Qué NO se rompe
- La capa de negocio (api/actions/effects) no se toca — solo se agrega un disparador por-fila.
- El `transition-dialog` se reusa tal cual (recibir `[samples]` de 1 elemento ya está soportado).
- Las 3 tablas: solo una celda/columna al final + ajuste de grid/colspan; el resto del layout intacto.
- El flujo de selección masiva sigue igual.

## Flujo SDD
brainstorming (hecho) → este design → jira-workflow (crear ticket) → judgment-day → tasks → apply → simplify →
verify → integrar. Feature de front puro (1 repo, 1 PR). Sin security-review dedicado (no toca auth/tenant; los
endpoints reusados ya tienen su `@PreAuthorize`).
