# Cola de Extracción v3 — Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Spec:** `docs/superpowers/specs/2026-06-03-cola-extraccion-v3-rediseno-design.md`
> **Depende de:** plan backend `Backend/docs/plans/2026-06-03-cola-extraccion-v3-backend.md` (endpoints nuevos). Se puede desarrollar el FE en paralelo mockeando los services, pero la integración real necesita el BE.
> **Jira:** _(pendiente — crear con jira-workflow antes de implementar)_

**Goal:** Rediseñar `/analitica/extraccion` al modelo "operador único": barra de config box→extractor, dos listas en paralelo (cola | en curso múltiple), modal de "Tomar" con muestras + teclas F + deshacer 5s, y finalizar/cancelar desde la lista.

**Architecture:** Angular 21 standalone + OnPush + signals para UI local, NgRx clásico para el back (regla del repo). Polling/ETag con `core/refresh` (regla #5). Sin SSE.

**Tech Stack:** Angular 21, PrimeNG, Tailwind, NgRx clásico, Vitest (store) + `ng test` (componentes con signal inputs). `npm ci` si es worktree nuevo.

**Convenciones (CLAUDE.md):** mensajes UI en español sin leak (regla #4) — mapear `HttpErrorResponse` por toast service; PrimeIcons (no emojis Unicode); tests obligatorios de reducer/effects/selectors + smoke de page.

---

## Task 1: Modelos + métodos de service

**Files:**
- Modify: `src/app/features/analitica/models/extraction.model.ts`
- Modify: `src/app/features/analitica/services/extractor-attention.service.ts`
- Test: `src/app/features/analitica/services/extractor-attention.service.spec.ts`

- [ ] **Step 1: Agregar modelos**

```ts
export interface BoxAssignment { boxNumber: number; extractorId: number | null; extractorFullName: string | null; }
export interface BranchExtractor { id: number; fullName: string; }
export interface SampleSummary { sampleType: string; count: number; }
// AwaitingExtractionItem: agregar `samples: SampleSummary[]`
// InExtractionItem: confirmar que ya trae attentionBox + extractorId; agregar extractorFullName
```

- [ ] **Step 2: Test de las firmas nuevas del service** (HttpTestingController): verifica método + URL + `withPolling()` en los GET polleables.

- [ ] **Step 3: Agregar/ajustar métodos**

```ts
getBranchExtractors(branchId: number) // GET /api/v1/branches/{branchId}/extractors  (withPolling)
getBoxAssignments(branchId: number)   // GET /api/v1/branches/{branchId}/box-assignments (withPolling)
saveBoxAssignments(branchId, boxes: {boxNumber:number; extractorUserId:number|null}[]) // PUT
assignExtractor(id, boxNumber, branchId) // PATCH /attentions/{id}/assign/extractor  body {branchId, boxNumber}
unassignExtraction(id)                   // PATCH /attentions/{id}/unassign
getInExtraction(branchId)                // ya existe; quitar dependencia de extractorId
```

- [ ] **Step 4: Tests** — `npx vitest run extractor-attention.service`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(analitica): modelos + service para cola v3`

---

## Task 2: Store extraction (state / actions / reducer / effects / selectors)

**Files:**
- Modify: `store/extraction/extraction.state.ts`, `extraction.actions.ts`, `extraction.reducer.ts`, `extraction.effects.ts`, `extraction.selectors.ts`
- Tests: `extraction.reducer.spec.ts`, `extraction.effects.spec.ts`, `extraction.selectors.spec.ts`

- [ ] **Step 1: State** — agregar `boxAssignments: BoxAssignment[]`, `branchExtractors: BranchExtractor[]`, cambiar `mine` → `inProgress: InExtractionItem[]` (lista por sucursal), `pending` suma flags `boxAssignments`/`extractors`.

- [ ] **Step 2: Actions** (createAction, patrón clásico) — `loadBoxAssignments`/Success/NotModified/Failure, `saveBoxAssignments`/Success/Failure, `loadBranchExtractors`/Success/NotModified/Failure, `loadInProgress`(reemplaza loadMine), `assignExtractor({id,boxNumber})`/Success/Failure, `unassignExtraction({id})`/Success/Failure.

- [ ] **Step 3: Reducer + test** — escribir tests primero: cada action setea su slice. `assignExtractorSuccess` no toca la lista directamente (el refresh la trae); guarda `lastAssigned: {attentionId, boxNumber, extractorFullName}` para el toast de undo.

- [ ] **Step 4: Effects + test** — `loadBoxAssignments$`, `loadBranchExtractors$`, `loadInProgress$` (GET por sucursal, ETag, `mapLoad`); mutaciones con `exhaustMap`; `mutationRefresh$` re-dispara `refreshAll`; `assignExtractorSuccess$` → side-effect que arma el toast de undo (la lógica del timer de 5s vive en la page, ver Task 7). `refreshAll$` ahora incluye `loadBoxAssignments` + `loadInProgress` + `loadAwaiting`.

- [ ] **Step 5: Selectors + test** — `selectBoxAssignments`, `selectInProgress`, `selectBranchExtractors`, `selectAwaiting` (con `samples`), `selectBoxFor(boxNumber)`.

- [ ] **Step 6: Tests** — `npx vitest run extraction`. Expected: PASS.
- [ ] **Step 7: Commit** — `feat(analitica): store v3 (boxAssignments, inProgress por sucursal, undo)`

---

## Task 3: `box-config-bar` component

**Files:**
- Create: `components/box-config-bar/box-config-bar.component.ts` (+ `.spec.ts`)

- [ ] **Step 1: Spec (ng test)** — renderiza N boxes con extractor; emite `(assign)={boxNumber, extractorId}` al elegir del dropdown; emite `(addBox)`.
- [ ] **Step 2: Componente** — standalone, OnPush, signal inputs `assignments: BoxAssignment[]`, `extractors: BranchExtractor[]`; cada box con `p-select`/menu de extractores de la sucursal (PrimeIcons, español). Botón "Agregar box".
- [ ] **Step 3: Test** PASS (`ng test --include ...box-config-bar...`).
- [ ] **Step 4: Commit** — `feat(analitica): box-config-bar`

---

## Task 4: `take-patient-modal` component (reemplaza take-patient-drawer)

**Files:**
- Create: `components/take-patient-modal/take-patient-modal.component.ts` (+ `.spec.ts`)
- Delete (al final, en Task 7): `components/take-patient-drawer/*`

- [ ] **Step 1: Spec** — dado `patient` + `boxes`, muestra muestras (chips por `sampleType` con count); apretar `F1` emite `(assign)=1` si el box 1 está disponible; `F2` con box ocupado/sin-asignar NO emite y muestra estado; `Esc` cierra.
- [ ] **Step 2: Componente** — `p-dialog`, OnPush. Inputs: `visible` (model), `patient: AwaitingExtractionItem | null`, `boxes: BoxAssignment[]`, `inProgressExtractorIds: number[]` (para marcar "ocupado"). Header con datos del paciente; sección muestras (chips por tipo); fila de boxes `F1..Fn` con estados (libre/ocupado/sin-asignar). `@HostListener('document:keydown', ...)` mapea `F1..Fn` → emite `(assign)=boxNumber`. Footer con nota de undo.
- [ ] **Step 3: Test** PASS.
- [ ] **Step 4: Commit** — `feat(analitica): take-patient-modal con muestras + teclas F`

---

## Task 5: `in-progress-list` component (reemplaza in-progress-extraction-card)

**Files:**
- Create: `components/in-progress-list/in-progress-list.component.ts` (+ `.spec.ts`)
- Delete (Task 7): `components/in-progress-extraction-card/*`

- [ ] **Step 1: Spec** — renderiza N filas (box, extractor, paciente, timer); empty state si vacío; emite `(cancel)=item` y `(end)=item` por fila; el timer cuenta desde `extractionStartedAt`.
- [ ] **Step 2: Componente** — `p-table` (o lista), OnPush, signal input `items: InExtractionItem[]`, `mutating`. Timer con signal local `now` cada 60s. Botones Cancelar (rojo outline) / Finalizar (verde) por fila.
- [ ] **Step 3: Test** PASS.
- [ ] **Step 4: Commit** — `feat(analitica): in-progress-list (en curso por sucursal)`

---

## Task 6: `cancel-extraction-dialog` — 3 motivos rápidos

**Files:**
- Modify: `components/cancel-extraction-dialog/cancel-extraction-dialog.component.ts` (+ `.spec.ts`)

- [ ] **Step 1: Spec** — 3 botones (`No se presentó`, `Vía difícil`, `Descompensado`); clickear uno setea el textarea con el texto correspondiente; el botón confirmar sigue deshabilitado si `<5` chars; emite `(cancelConfirmed)={reason}`.
- [ ] **Step 2: Componente** — agregar fila de 3 `p-button` (outlined) arriba del textarea; al click `reason.set('Paciente no se presentó al box' | 'No se pudo canalizar (vía difícil)' | 'Paciente descompensado')`. Mantener validación ≥5 + contador.
- [ ] **Step 3: Test** PASS.
- [ ] **Step 4: Commit** — `feat(analitica): motivos rapidos en cancel-extraction-dialog`

---

## Task 7: Refactor de la page + undo de 5s

**Files:**
- Modify: `pages/extraction-queue/extraction-queue.page.ts` (+ `.spec.ts`)
- Delete: `take-patient-drawer/*`, `in-progress-extraction-card/*` (reemplazados)

- [ ] **Step 1: Smoke spec** — con sucursal seleccionada, renderiza `box-config-bar` + dos columnas (cola / en curso); `onTake(patient)` abre el modal; el modal `(assign)=box` dispara `assignExtractor`.
- [ ] **Step 2: Layout** — header (branch chip + refresh indicator) + `app-box-config-bar` + grid de 2 columnas: izquierda `awaiting` (tabla + search + Tomar), derecha `app-in-progress-list`. Sacar la stats-strip vieja (o reducir a 1 línea). Sacar `take-patient-drawer` e `in-progress-extraction-card`.
- [ ] **Step 3: Undo 5s** — en `assignExtractorSuccess` (vía store `lastAssigned` o un effect que emita al page), mostrar toast con "Asignado a Box N · <extractor> — Deshacer" usando `MessageService` con `life: 5000` y un botón/acción que dispara `unassignExtraction(attentionId)`. Implementar con un signal `pendingUndo` + `setTimeout(5000)` que se limpia si deshace. Pausar el polling mientras el modal está abierto (ya existe el patrón `paused`).
- [ ] **Step 4: Wiring de config** — `box-config-bar (assign)` → `saveBoxAssignments`; `(addBox)` agrega un box vacío. Cargar `loadBranchExtractors` + `loadBoxAssignments` al elegir sucursal.
- [ ] **Step 5: Tests** — `ng test` (page + componentes) + `npx vitest run extraction` (store). Expected: PASS.
- [ ] **Step 6: Build** — `npm run build`. Expected: OK.
- [ ] **Step 7: Commit** — `feat(analitica): rediseno page cola de extraccion v3 (operador unico)`

---

## Task 8: Limpieza + verificación final

- [ ] **Step 1:** Borrar código muerto (drawer/card viejos, selectores `selectCanTakeMore`/`mine` ya no usados, `DEMO_*` si quedara).
- [ ] **Step 2:** `ng test` + `npx vitest run` + `npm run build` todo verde.
- [ ] **Step 3: Commit** — `chore(analitica): limpieza post-rediseno cola v3`

---

## Self-review (cobertura vs spec)
- §7 modelos/service → Task 1 ✓ · store → Task 2 ✓ · box-config-bar → Task 3 ✓ · take-modal (F-keys+muestras) → Task 4 ✓ · in-progress-list → Task 5 ✓ · cancel 3 motivos → Task 6 ✓ · page + undo 5s → Task 7 ✓.
- Polling/ETag estándar reusado (regla #5). Mensajes español sin leak (regla #4). Tests de reducer/effects/selectors/componentes (convención del repo).
- OUT respetado: sin catálogo formal de boxes, sin nombres de análisis en el modal.
```
