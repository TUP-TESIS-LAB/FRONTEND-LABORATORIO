# Plan — Cola de Extracción v2 (Frontend)

> **Jira:** [KAN-66](https://exequielsantoro.atlassian.net/browse/KAN-66) (depende de [KAN-65](https://exequielsantoro.atlassian.net/browse/KAN-65))
> **Spec:** [2026-05-25-cola-extraccion-v2-spec.md](../specs/2026-05-25-cola-extraccion-v2-spec.md)
> **Mockup:** [2026-05-25-cola-extraccion-v2-boxes-mockup.html](../specs/2026-05-25-cola-extraccion-v2-boxes-mockup.html)
> **Plan backend par:** [`Backend/docs/plans/2026-05-25-cola-extraccion-v2-backend.md`](../../../../Backend/docs/plans/2026-05-25-cola-extraccion-v2-backend.md)
> **Rama:** `feat/cola-extraccion` (continuación de KAN-44)
> **Estimación:** ~6h
> **Depende de:** plan backend v2 mergeado (necesita endpoints `/me/branches`, `branchId` en los 3 GET, occupancy, cancel con body).

## Objetivo

Refactor profundo de `/analitica/extraccion` según el mockup v2:
1. **Chip de sucursal** + **FAB de box con dropdown** en el header de la página.
2. **Card grande** para el paciente en curso (reemplaza la tabla, solo campos disponibles hoy).
3. **Dialog con motivo obligatorio** al cancelar una extracción.
4. **Validaciones**: no tomar sin box, no usar box ocupado (UI + backend).
5. **Eliminar el demo local** (`DEMO_MINE_SEED`).
6. **Eliminar el FAB bottom-right** (reemplazado por el del header).

## Pasos

### 1. Modelos

#### 1.1. Extender `features/analitica/models/extraction.model.ts`
```ts
export interface BranchOption {
  id: number;
  code: string;
  name: string;
}

export interface BoxOccupancyItem {
  box: number;
  extractorId: number;
  extractorFullName: string;
  attentionId: number;
  attentionNumber: string;
}
```

#### 1.2. NO cambiar `InExtractionItem`
El card consume solo los campos disponibles. Los que faltan (edad, gender, OS label, nombres de análisis) quedan documentados como follow-up.

### 2. Service

#### 2.1. `ExtractorAttentionService` agregar:
```ts
getMyBranches(): Observable<BranchOption[] | NotModified> {
  return this.http.get<BranchOption[]>(`${API}/me/branches`, { context: withPolling() });
}

getBoxOccupancy(branchId: number): Observable<BoxOccupancyItem[] | NotModified> {
  return this.http.get<BoxOccupancyItem[]>(`${API}/branches/${branchId}/extraction-boxes/occupancy`,
    { context: withPolling() });
}
```

#### 2.2. Modificar firmas existentes:
- `getAwaiting(branchId: number)` → query param `?branchId=N`.
- `getMine(branchId: number)` → query param `?branchId=N`.
- `getStats(branchId: number)` → query param `?branchId=N`.

#### 2.3. Modificar `cancelExtraction(id: number, reason: string)` → body `{ reason }`.

#### 2.4. `assignExtractor(id, box, branchId)` → body `{ attentionBox: box, branchId }`.

### 3. Store `extraction`

#### 3.1. State extendido
```ts
{
  // existentes
  awaiting, mine, stats, search, pending, error, lastRefreshAt,
  // nuevos
  branches: BranchOption[];
  selectedBranchId: number | null;
  boxOccupancy: BoxOccupancyItem[];
}
```

#### 3.2. Actions nuevas
- `loadBranches` / `loadBranchesSuccess(items)` / `loadBranchesFailure(error)` / `loadBranchesNotModified()`.
- `setSelectedBranch({ branchId })`.
- `loadOccupancy({ branchId })` / `loadOccupancySuccess(items)` / `loadOccupancyFailure(error)` / `loadOccupancyNotModified()`.
- Modificar `cancelExtraction({ id, reason })` para incluir reason.

#### 3.3. Reducer
- `setSelectedBranch` → reset `awaiting`, `mine`, `stats`, `occupancy` a empty / null. La page va a re-disparar todos los loads cuando cambia.
- `loadOccupancySuccess` → reemplaza `boxOccupancy`.
- `loadOccupancyNotModified` → solo actualiza `lastRefreshAt`.

#### 3.4. Selectors nuevos
- `selectBranches`, `selectSelectedBranchId`, `selectSelectedBranch` (objeto entero, derivado).
- `selectBoxOccupancy`.
- `selectMyBoxOccupancy` (la fila donde extractorId = me).
- `selectBoxIsOccupied(box: number)` — factory selector.

#### 3.5. Effects
- `loadBranches$` mapea contra el service.
- `loadOccupancy$` mapea contra el service.
- `setSelectedBranch` triggerea `refreshAll` (que ahora incluye `loadOccupancy`).
- `refreshAll` se modifica: si `selectedBranchId` es null, no hace nada; sino dispatch los 4 loads con el branchId.
- Mutation effects (`assignSuccess`, `cancelSuccess`, `endSuccess`) también disparan `loadOccupancy`.

#### 3.6. Tests
- Reducer: actions nuevas.
- Selectors: `selectMyBoxOccupancy`, `selectBoxIsOccupied`.
- Effects: cambio de branch → reset state + dispatch refreshAll.

### 4. `ExtractorBoxService` (extensión)

#### 4.1. Agregar persistencia de `selectedBranchId`
```ts
private readonly branchKey = 'extractor.branchId';
private readonly _selectedBranchId = signal<number | null>(this.readBranchFromStorage());
readonly selectedBranchId = this._selectedBranchId.asReadonly();

setSelectedBranch(id: number | null) { ... }
```

#### 4.2. Helper `canTake()` (signal computed)
- `box() != null && selectedBranchId() != null`.

#### 4.3. Test
- Persistencia branchId en localStorage.
- `canTake` reactivo.

### 5. Componentes nuevos

#### 5.1. `BranchSelectorChipComponent`
**Path:** `features/analitica/components/branch-selector-chip/`

```ts
@Component({
  selector: 'app-branch-selector-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MenuModule],
  template: `
    <button class="branch-chip" (click)="menu.toggle($event)" [class.single]="(options() ?? []).length <= 1">
      <i class="pi pi-map-marker pin"></i>
      <span>{{ selectedLabel() }}</span>
      @if ((options() ?? []).length > 1) {
        <i class="pi pi-chevron-down caret"></i>
      }
    </button>
    <p-menu #menu [model]="menuItems()" [popup]="true" appendTo="body" />
  `
})
```
- Inputs: `selected: BranchOption | null`, `options: BranchOption[]`.
- Output: `(select) EventEmitter<BranchOption>`.
- `menuItems()` computed: arma items para `p-menu` que al click emiten `select`.
- Styles según mockup (pill blanco con icono rojo pin, sombra suave).

#### 5.2. `BoxFabComponent` (reemplaza al existente `ExtractorBoxFabComponent`)
**Path:** `features/analitica/components/box-fab/`

- Standalone, OnPush.
- Inputs:
  - `occupancy: BoxOccupancyItem[]`
  - `myBox: number | null`
  - `myUserId: number | null` (para destacar "yo")
  - `mutating: boolean`
- Output: `(boxSelected) EventEmitter<number>` (cuando el user elige un nuevo box).
- Template:
  - Trigger: pill primario "Box N · TÚ" o pill blanco "Configurar box".
  - Click → `p-popover` o `p-overlay` con la lista de boxes:
    - Tu fila (si tenés box) primero, con borde primario.
    - Resto ordenado por número.
    - Si un box no aparece en `occupancy` y NO es el tuyo → no se muestra (no tenemos catálogo).
    - Si el usuario quiere configurar un box que no aparece, footer "Cambiar mi box" abre un sub-dialog con input numérico.
- Atajos teclado:
  - `1`–`9` con popover abierto → si está libre, emit `boxSelected(n)`. Si está ocupado, notificar "Box N ocupado".
  - `Esc` cierra.
- Sub-dialog "Cambiar mi box": input numérico + Aceptar/Cancelar. Valida que no esté en `occupancy` con extractor ≠ yo.
- Reemplaza el viejo FAB bottom-right; sale del DOM completamente.

#### 5.3. `InProgressExtractionCardComponent`
**Path:** `features/analitica/components/in-progress-extraction-card/`

- Standalone, OnPush.
- Inputs:
  - `patient: InExtractionItem | null`
  - `mutating: boolean`
- Outputs:
  - `(cancelClicked) EventEmitter<void>`
  - `(endClicked) EventEmitter<void>`
- Template (estado con paciente):
  - Avatar con iniciales (`initialsOf(patient.patientFullName)`).
  - Nombre + pill URGENTE si aplica.
  - Meta línea: `DNI {patient.patientDni} · Orden {patient.attentionNumber} · {patient.analysisCount} análisis`.
  - Timer: helper que dado `extractionStartedAt` muestra "en curso desde HH:MM (X min)". Se actualiza con `signal` + `interval(60_000)` interno.
  - Box destacado.
  - Botones Cancelar (danger outline) + Finalizar (success).
- Template (estado vacío):
  - Dashed border + icono `pi-inbox` + heading "Sin extracción en curso" + descripción.
- Helper `initialsOf(name)` → primeras letras del apellido + nombre (asume "Apellido, Nombre").

#### 5.4. `CancelExtractionDialogComponent`
**Path:** `features/analitica/components/cancel-extraction-dialog/`

- Standalone, OnPush.
- Inputs:
  - `[(visible)]: boolean` (two-way)
  - `patient: InExtractionItem | null`
  - `saving: boolean`
- Output: `(cancelConfirmed) EventEmitter<{ reason: string }>`
- Template:
  - `p-dialog` modal con header dinámico.
  - Textarea `[(ngModel)]="reason"`, `rows=4`, `maxlength=500`, `pInputTextarea`.
  - Contador "X/500".
  - Validación: `reason.trim().length >= 5` para habilitar Confirmar.
  - Botones "Volver" (text) + "Cancelar extracción" (danger).
- Al hacer Confirmar emit `cancelConfirmed`, page hace el dispatch.

### 6. Refactor de `extraction-queue.page.ts`

#### 6.1. Imports + signals
- Importar los 4 componentes nuevos + remover `ExtractorBoxFabComponent` y `TakePatientDrawerComponent` (este sigue, no se quita en este PR).
- Signals nuevos:
  - `selectedBranchId = store.selectSignal(selectSelectedBranchId)`.
  - `branches = store.selectSignal(selectBranches)`.
  - `selectedBranch = store.selectSignal(selectSelectedBranch)`.
  - `occupancy = store.selectSignal(selectBoxOccupancy)`.

#### 6.2. Header de la page
- Sustituir header actual:
```html
<header class="page-head">
  <div>
    <h1>Cola de extracción</h1>
    <p class="muted">Pacientes esperando ser atendidos por extracción.</p>
  </div>
  <div class="head-right">
    <app-branch-selector-chip
      [selected]="selectedBranch()"
      [options]="branches()"
      (select)="onBranchChange($event)" />
    <app-box-fab
      [occupancy]="occupancy()"
      [myBox]="boxService.box()"
      [myUserId]="currentUserId()"
      [mutating]="mutating()"
      (boxSelected)="onBoxChange($event)" />
  </div>
</header>
```

#### 6.3. Reemplazar la tabla de "Mis extracciones" por el card
```html
<app-in-progress-extraction-card
  [patient]="mine()[0] ?? null"
  [mutating]="mutating()"
  (cancelClicked)="onCancelRequest(mine()[0])"
  (endClicked)="onEndRequest(mine()[0])" />
```

#### 6.4. Drawer "Tomar paciente"
- Se mantiene como está, pero la confirmación ahora valida que `canTake()` (box + branch) esté OK; sino abre toast warn.
- En `onConfirmTake({ id, box })`: dispatch `assignExtractor({ id, box, branchId })`.

#### 6.5. Cancel dialog
- Signals locales `cancelDialogOpen` + `cancelTarget`.
- Render `<app-cancel-extraction-dialog>` que escucha `cancelConfirmed` → dispatch `cancelExtraction({ id, reason })`.

#### 6.6. Eliminar
- `DEMO_MINE_SEED`, `localMine`, `localHiddenAwaitingIds`, `isLocalMine`, `removeFromLocalMine` y toda la lógica de demo.
- `<app-extractor-box-fab />` del fondo de la página.
- `ExtractorBoxFabComponent` puede mantenerse el archivo si lo va a usar otro lado, sino eliminarlo.

#### 6.7. Empty state si no hay branch seleccionada
- Si `selectedBranchId() == null && branches().length > 0` → mostrar un mensaje grande "Elegí una sucursal arriba para empezar" con un botón que abra el chip.
- Si `branches().length === 0` → "Pedile al administrador que te asigne una sucursal. Pantalla no disponible hasta entonces."

#### 6.8. Polling
- El handle de polling no cambia. `refreshAll` ahora incluye `loadOccupancy`.
- Cuando `selectedBranchId` cambia, el effect existente se mantiene; el dispatch de `setSelectedBranch` triggerea `refreshAll` automáticamente.

#### 6.9. Inicialización
- `ngOnInit`:
  - dispatch `loadBranches`.
  - Una vez `branches` está disponible, si `selectedBranchId` es null pero hay branches: setear la primera de la lista (o el último del localStorage si está dentro de la lista).
- Effect que sincroniza `boxService.selectedBranchId` con el state del store.

### 7. Routing

Sin cambios. Sigue con `hasRoleGuard(['EXTRACTOR', 'ADMINISTRADOR'])`. La pantalla ahora respeta el filtro por sucursal pero la ruta no cambia.

### 8. Manejo de errores

- 403 al cambiar de branch (acceso denegado) → toast con el mensaje del backend + reset `selectedBranchId` a null.
- 409 en `assignExtractor` por box ocupado → toast con mensaje del backend + dispatch `loadOccupancy` para refrescar.
- 400 en cancel sin reason → no debería pasar porque la UI valida, pero defense in depth con toast.

### 9. Tests

#### 9.1. Componentes
- `branch-selector-chip.component.spec.ts` — render, click abre menú, select emite event, single hide caret.
- `box-fab.component.spec.ts` — open/close, atajos `1-9` y `Esc`, click en libre emite, click en ocupado no emite.
- `in-progress-extraction-card.component.spec.ts` — empty state, urgent badge, timer incrementa, iniciales.
- `cancel-extraction-dialog.component.spec.ts` — validación min 5, contador, emit con reason.

#### 9.2. Service
- `extractor-attention.service.spec.ts` — nuevas firmas (`?branchId=N`, body de cancel).

#### 9.3. Store
- `extraction.reducer.spec.ts` — actions de branches y occupancy (incl. NotModified).
- `extraction.selectors.spec.ts` — `selectBoxIsOccupied`, `selectMyBoxOccupancy`.
- `extraction.effects.spec.ts` — setSelectedBranch dispara refreshAll; mutation triggers loadOccupancy.

#### 9.4. Page
- `extraction-queue.page.spec.ts` — smoke + integración con sucursal seleccionada + empty state sin branches.

### 10. Verificación manual

- Login como EXTRACTOR con 2 sucursales asignadas → chip arriba, dropdown lista las dos.
- Cambiar de sucursal → la cola, mis extracciones y occupancy se vuelven a cargar.
- FAB top-right muestra "Configurar box" inicialmente; click abre dropdown con los ocupados (otros extractores).
- Configurar box que NO está en occupancy → guarda en localStorage, el pill cambia a "Box N · TÚ".
- Intentar configurar un box ocupado por otro → tooltip / dialog "Box N ocupado por <nombre>".
- Tomar paciente → drawer se abre con box autocompletado, confirmar → card aparece con el paciente.
- Cancelar → dialog con textarea, escribir <5 chars → botón disabled, escribir >=5 → habilita. Confirmar → vuelve a la cola, el FAB sigue marcando mi box (no se nullea).
- Finalizar → desaparece de mine, contador "Hoy finalizadas" sube en stats.
- Probar con 2 navegadores logueados como distintos extractores: cada uno ve solo su box destacado, ve al otro como ocupado.

### 11. Build + commit

- `npm test -- --run` verde.
- `npm run build` verde.
- Commit convencional: `feat(analitica): cola de extracción v2 — sucursal, occupancy de boxes, card del paciente`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El `selectedBranchId` persistido en localStorage queda inválido si el admin saca al user de esa sucursal | Al cargar branches, validar que el persistido esté en la lista; sino reset a la primera disponible. |
| Box que tipea el user en "Cambiar mi box" colisiona con el de otro extractor justo después | La UI valida contra `occupancy` (cached), pero el backend siempre re-valida en assign. Refrescar `occupancy` después de mutar. |
| Timer del card actualiza cada minuto → se ve estático los primeros 60s | Aceptable. Alternativa: refresca con polling de mine también. |
| El `DEMO_MINE_SEED` quedó en el branch pero el subagente puede no removerlo | Listado explícito en §6.6. |
| `MenuModule` vs `PopoverModule` de PrimeNG: confirmar cuál usar para el dropdown del chip y del FAB | Investigar al implementar; PrimeNG 21 expone `Popover`/`Menu`/`OverlayPanel`. Optar por el más liviano. |
