# Cola de Extracción v2 — Spec

> **Estado:** Ready — planes y tickets creados
> **Jira:** [KAN-65](https://exequielsantoro.atlassian.net/browse/KAN-65) (backend) · [KAN-66](https://exequielsantoro.atlassian.net/browse/KAN-66) (frontend)
> **Fecha:** 2026-05-25
> **Rama:** `feat/cola-extraccion` (continuación de KAN-43 / KAN-44)
> **Mockup:** [2026-05-25-cola-extraccion-v2-boxes-mockup.html](./2026-05-25-cola-extraccion-v2-boxes-mockup.html)
> **Depende de:** KAN-43 (backend cola) y KAN-44 (frontend cola) ya en el branch.

---

## 1. Contexto

KAN-43/44 dejaron operativa la pantalla `/analitica/extraccion` con:
- Cola filtrada por tenant + estándar polling/ETag.
- "Mis extracciones" en tabla, regla MAX 1 simultánea.
- FAB de box bottom-right que guarda en `localStorage`.
- Cancelar / Finalizar con confirm dialog.

Esta v2 corrige las brechas de la v1 al uso real:
- La cola **no se filtra por sucursal** — todos los extractores ven todo el tenant.
- El extractor **no sabe** qué box está ocupando otro compañero.
- La validación de "box ocupado" solo existe en el frontend; el backend acepta cualquier box.
- Cancelar **no exige motivo** — queda sin trazabilidad.
- "Mis extracciones" como tabla de 1 fila es ruido visual.

## 2. Objetivos

1. **Filtro por sucursal**: el extractor elige una sucursal de las que tiene asignadas, la cola y "mis extracciones" se filtran por esa sucursal.
2. **Visibilidad de boxes**: el FAB top-right abre un dropdown con todos los boxes ocupados de la sucursal (con nombre del extractor) + los libres conocidos.
3. **Validación de box ocupado**: backend rechaza si el box pedido está siendo usado por otro extractor activo en la misma sucursal.
4. **No tomar sin box**: UI bloquea + backend valida (ya valida, se refuerza).
5. **Cancelar exige motivo**: textarea obligatoria, mínimo 5 caracteres, persistido en `cancellation_reason`.
6. **Auditoría en cancel**: NO se nullean `extractor_id` ni `attention_box` al cancelar — quedan para trazabilidad.
7. **"Mis extracciones" → card** grande en lugar de tabla. **Solo muestra datos disponibles hoy** (sin inventar campos).

## 3. Decisiones cerradas

| Punto | Decisión |
|---|---|
| Sucursales del extractor | Asignación por backend (nueva tabla `user_branches`). Endpoint `GET /me/branches`. |
| Selector sucursal en UI | Chip a la izquierda del FAB de box. Dropdown con la lista. Persistido en `localStorage`. |
| Visibilidad de boxes | FAB top-right abre dropdown con lista; mi box destacado, otros muestran nombre del extractor + estado (En ext / Libre). |
| Validación box ocupado | Backend valida en `assignExtractor`: si otro extractor activo está en el mismo box de la misma sucursal → 409 "Box ocupado por <nombre>". |
| Box requerido para tomar | UI deshabilita "Tomar" si `localStorage['extractor.box']` está vacío. Backend ya valida `attentionBox` obligatorio. |
| Cancelar | Endpoint acepta body `{ reason: string }`, validación `>= 5 chars`. UI con dialog + textarea. |
| Cancel preserva auditoría | `Attention.cancelExtraction(reason)` NO nullea `extractor_id` ni `attention_box`. Solo cambia estado y guarda motivo. |
| Atajos teclado | `1`–`9` con el dropdown abierto → selecciona box (si está libre). `Esc` cierra. |
| Card paciente en curso | **Solo campos disponibles hoy** — ver §6.5. Sin edad, gender, insurance label, ni nombres de análisis. |

## 4. Scope

### IN
- Backend:
  - Migración Flyway: tabla `user_branches`.
  - Dominio + puerto: `UserBranchAccessPort` con `findActiveBranchIdsForUser(userId, tenantId)`.
  - Endpoint `GET /api/v1/me/branches` → lista de sucursales asignadas al usuario.
  - Query param `branchId` en los 3 endpoints existentes (`awaiting-extraction`, `in-extraction`, `extraction-stats`). Filtrado obligatorio.
  - Endpoint nuevo `GET /api/v1/branches/{branchId}/extraction-boxes/occupancy` → lista de boxes en uso ahora con `{ box, extractorId, extractorFullName, attentionId, attentionNumber }`. ETag.
  - `AssignExtractorUseCase`: validar que el `attentionBox` no esté siendo usado por otro extractor activo en la misma sucursal → `BoxAlreadyOccupiedException` (409 español).
  - `CancelExtractionUseCase`: aceptar `reason` como input (no opcional, no vacío, `>= 5`); persistir en `cancellation_reason`; **NO** nullear `extractor_id` ni `attention_box`. `Attention.cancelExtraction()` se modifica para no limpiar los campos.
  - DTOs actualizados para `branchId` y `reason`.
  - ETag keys incluyen `branchId` cuando aplica.
  - Invalidación de cache: el `AttentionEtagInvalidator` ahora también invalida `box-occupancy:${tenantId}:${branchId}` en mutaciones.
- Frontend:
  - Modelos: `BranchOption`, `BoxOccupancyItem`.
  - Service: 2 métodos nuevos (`getMyBranches`, `getBoxOccupancy(branchId)`) + actualizar firmas existentes con `branchId`.
  - Store: extender state con `branches`, `selectedBranchId`, `boxOccupancy`. Acciones y selectores nuevos. Effects con polling de occupancy.
  - Componentes:
    - `BranchSelectorChipComponent` (header).
    - `BoxFabComponent` (refactor del actual): muestra "Box N · TÚ" en top-right del header de página + dropdown alineado a la derecha + atajos `1`–`9` / `Esc`.
    - `InProgressExtractionCardComponent` (nuevo, reemplaza la tabla de mine en la page).
    - `CancelExtractionDialogComponent` (textarea + validación + botón disabled hasta llegar a 5 chars).
  - Page `extraction-queue.page.ts`: refactor profundo según el mockup. Sacar el FAB bottom-right.
  - `ExtractorBoxService`: agregar `selectedBranchId` y validaciones cruzadas.
  - Borrar el demo local (`DEMO_MINE_SEED`).

### OUT (queda para otra iteración)
- Catálogo formal de boxes por sucursal en backend (hoy son enteros libres).
- Stats por sucursal/extractor más allá de "Hoy finalizadas por mí".
- Drag & drop, asignación automática, notificaciones push.
- Avatar real del extractor (usa iniciales por ahora).
- Edad, gender, OS label, nombres de análisis en el card del paciente.
- Vista "Mis extracciones anteriores" / historial.

## 5. Modelo de datos

### 5.1. Migración Flyway — `user_branches`

```sql
CREATE TABLE user_branches (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id        BIGINT       NOT NULL,
    user_id          BIGINT       NOT NULL,
    branch_id        BIGINT       NOT NULL,
    active           TINYINT(1)   NOT NULL DEFAULT 1,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by       VARCHAR(64)  NOT NULL,
    updated_by       VARCHAR(64)  NOT NULL,
    version          BIGINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uq_user_branches (tenant_id, user_id, branch_id),
    KEY idx_user_branches_user (tenant_id, user_id, active),
    KEY idx_user_branches_branch (tenant_id, branch_id, active),
    CONSTRAINT fk_user_branches_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_branches_branch FOREIGN KEY (branch_id) REFERENCES branches (id)
);
```

**Migración seed local-dev:** asignar el usuario `extractor` (10003) y el `admin` (1 o el que aplique) a todas las sucursales activas del tenant 1. Documentar idempotente.

### 5.2. Migración Flyway — agregar columna `extraction_cancellation_reason`

```sql
ALTER TABLE attentions
ADD COLUMN extraction_cancellation_reason VARCHAR(500) NULL AFTER cancellation_reason;
```

Columna nullable. `cancellation_reason` queda como está (uso exclusivo de `CancelAttentionUseCase`).

### 5.3. Campos a agregar en el dominio
- `Attention.cancelExtraction(String reason)` reemplaza al actual sin parámetros. El método:
  - Setea `this.extractionCancellationReason = reason` (campo nuevo).
  - `revertState(AWAITING_EXTRACTION)`.
  - **NO** toca `extractorId` ni `attentionBox` (auditoría).
  - Valida `reason` no nulo / no vacío / `length >= 5`; sino `InvalidArgumentException` con mensaje en español.
- Field nuevo `extractionCancellationReason: String` en `Attention` (lombok-managed via builder).
- JPA mapper copia el campo en ambos sentidos.

## 6. Cambios — Backend

### 6.1. `UserBranchAccessPort` (nuevo, módulo empresa)
```java
public interface UserBranchAccessPort {
    List<Long> findActiveBranchIdsForUser(Long userId, Long tenantId);
    boolean hasAccess(Long userId, Long tenantId, Long branchId);
}
```
Adapter JPA en `modules/empresa/infrastructure/persistence/adapter/UserBranchAccessAdapter`.

### 6.2. Endpoint `GET /api/v1/me/branches`
- Controller: `MeBranchesController` en `modules/empresa/presentation` o reusar `MeController` si existe.
- Devuelve `List<BranchOption>` con `{ id, code, name }` solo de las branches asignadas al user actual del tenant.
- Si el user es ADMINISTRADOR sin asignaciones explícitas, fallback a "todas las branches activas del tenant". (Decisión a confirmar: ¿admins ven todo siempre o respetan el filtro?)
- ETag opcional, cache key `me-branches:${tenantId}:${userId}`. Si la lista cambia rara vez, vale el redondeo.

### 6.3. Filtrado por sucursal en endpoints existentes
- `GET /awaiting-extraction?branchId=N` (obligatorio).
- `GET /in-extraction?branchId=N` (obligatorio).
- `GET /extraction-stats?branchId=N` (obligatorio).

Repositorios y use cases reciben `branchId` adicional. Queries: `... AND a.branchId = :branchId ...`.

**Validación**: si el `branchId` no pertenece a las branches del usuario, 403 con mensaje en español "No tenés acceso a esta sucursal."

**ETag keys actualizados**:
- `awaiting:${tenantId}:${branchId}`
- `in-extraction:${tenantId}:${userId}:${branchId}`
- `extraction-stats:${tenantId}:${userId}:${branchId}`

### 6.4. Endpoint `GET /api/v1/branches/{branchId}/extraction-boxes/occupancy`
- Devuelve `List<BoxOccupancyResponse>`:
  ```json
  [
    { "box": 1, "extractorId": 10003, "extractorFullName": "Juan Pérez", "attentionId": 42, "attentionNumber": "A-FX0008" },
    { "box": 2, "extractorId": 10004, "extractorFullName": "Sofía Díaz", "attentionId": 43, "attentionNumber": "A-FX0009" }
  ]
  ```
- Cálculo: todas las atenciones `IN_EXTRACTION` activas del tenant + branch, joineadas con users por `extractor_id` para el nombre.
- ETag cache key: `box-occupancy:${tenantId}:${branchId}`.
- **No incluye boxes libres** — el frontend infiere "libre" cuando le configurás un box que no aparece en la lista. La pantalla del usuario muestra "Box N libre" solo si está usando ese N o si lo elige en el dropdown — no hay catálogo de boxes.
- `@PreAuthorize` igual al resto del controller.

### 6.5. `AssignExtractorUseCase` — validar box no ocupado
```java
// dentro de execute(...), antes de assignExtractor:
List<Attention> activeInBranch = attentionRepo.findInExtractionByBranch(tenantId, branchId);
boolean boxOccupied = activeInBranch.stream()
    .anyMatch(other -> Objects.equals(other.getAttentionBox(), input.attentionBox())
                    && !Objects.equals(other.getExtractorId(), input.extractorId()));
if (boxOccupied) {
    throw new BoxAlreadyOccupiedException(input.attentionBox());
}
```
- Nueva `BoxAlreadyOccupiedException` extends `DomainException` con mensaje en español: "El box <N> está ocupado por otro extractor. Cambiá de box o esperá a que se libere."
- Mapeado a 409 en `GlobalExceptionHandler`.

### 6.6. `CancelExtractionUseCase` — aceptar motivo
- `Input` agrega `reason: String`.
- Controller: `PATCH /cancel-extraction` body `{ reason: string }`. Validación `@NotBlank @Size(min = 5)`.
- `Attention.cancelExtraction(reason)` modificado (ver §5.2).
- Tests:
  - Reason válido → estado AWAITING_EXTRACTION + reason guardado + extractor_id/box mantenidos.
  - Reason `null` o `< 5 chars` → 400 español.

### 6.7. Enrich N/A en este PR
**Explícitamente NO se agrega en esta v2** (por pedido "no inventar"):
- `patientBirthDate`, `patientGender` en `PatientProjection`.
- `insurancePlanLabel` en respuestas.
- Nombres de análisis por atención.

Si después se quiere mostrar esa info en el card, se abre ticket aparte con su propio scope.

### 6.8. Tests backend
- Migración aplica limpio + seed local agrega usuarios a sucursales.
- `UserBranchAccessAdapter` repo tests.
- `MeBranchesController` test: usuario con N branches → 200, sin asignaciones → fallback (o vacío).
- Cada endpoint de extracción con `branchId` mal: 400 si falta, 403 si no pertenece.
- `AssignExtractorUseCase` con box ocupado por otro: 409 español sin FQCN.
- `CancelExtractionUseCase` con reason `<5`: 400 español.
- `CancelExtractionUseCase` happy path: extractor_id y attention_box preservados.
- ETag cache key incluye `branchId`.
- BoxOccupancy endpoint: 1 atención IN_EXTRACTION → 1 row con nombre del extractor.

## 7. Cambios — Frontend

### 7.1. Modelos
```ts
// features/analitica/models/extraction.model.ts
export interface BranchOption { id: number; code: string; name: string; }
export interface BoxOccupancyItem {
  box: number;
  extractorId: number;
  extractorFullName: string;
  attentionId: number;
  attentionNumber: string;
}
```

`InExtractionItem` no cambia. El card solo renderiza los campos disponibles (ver §7.6).

### 7.2. Service `ExtractorAttentionService`
- `getMyBranches(): Observable<BranchOption[] | NotModified>` con `withPolling()`.
- `getBoxOccupancy(branchId): Observable<BoxOccupancyItem[] | NotModified>` con `withPolling()`.
- Las firmas existentes agregan `branchId`:
  - `getAwaiting(branchId)`, `getMine(branchId)`, `getStats(branchId)`.
- `cancelExtraction(id, reason)` ahora manda body.

### 7.3. Store `extraction`
- State extendido:
  ```ts
  {
    awaiting, mine, stats, search, pending, error, lastRefreshAt,  // ya existe
    branches: BranchOption[],
    selectedBranchId: number | null,
    boxOccupancy: BoxOccupancyItem[],
  }
  ```
- Actions nuevas: `loadBranches`/Success/Failure, `setSelectedBranch(id)`, `loadOccupancy`/Success/Failure/NotModified.
- Selectors: `selectBranches`, `selectSelectedBranchId`, `selectBoxOccupancy`, `selectMyBox` (del service), `selectBoxIsAvailable(boxNumber)`.
- Effects:
  - Al cambiar `selectedBranchId` → dispatch `refreshAll()` (que ya existía) + `loadOccupancy()`.
  - `assignExtractorSuccess` / `cancelSuccess` / `endSuccess` también disparan `loadOccupancy`.

### 7.4. `BranchSelectorChipComponent`
- Standalone, OnPush, en `shared/ui/` o `features/analitica/components/`.
- Inputs: `selected: BranchOption | null`, `options: BranchOption[]`.
- Output: `(select) EventEmitter<BranchOption>`.
- Render: pill blanco con ícono `pi pi-map-marker` rojo + nombre + `pi pi-chevron-down`.
- Click → `p-menu` o popover con la lista de opciones.
- Si `options.length <= 1` → no es clickeable (cursor default, sin caret).

### 7.5. `BoxFabComponent` (refactor)
- Mover de `bottom-right` a estar dentro del header de la page (top-right).
- Estados visuales:
  - Sin box: pill blanco "Configurar box" (icono `pi-cog`).
  - Con box: pill primario verde "Box N · TÚ" (icono `pi-box`).
- Click abre dropdown alineado a la derecha (320px ancho).
- Dropdown:
  - Header: "Boxes de <nombre sucursal>" + close.
  - Lista ordenada: tu box primero (con borde primario), resto en orden numérico.
  - Cada fila: `<n cuadrado>` + nombre extractor (o "Sin asignar" italic) + sub "Tomando paciente" (o vacío) + pill estado (TÚ / En ext. / Libre).
  - Footer: botón "Cambiar mi box" → abre sub-dialog para elegir entre boxes libres + input numérico.
- Atajos: `1`–`9` mientras el dropdown está abierto → si está libre, lo asigna; sino notifica "Box ocupado".
- `Esc` cierra.

### 7.6. `InProgressExtractionCardComponent` (nuevo)
Reemplaza la tabla de "mis extracciones" en la page. Standalone, OnPush.

**Inputs:**
- `patient: InExtractionItem | null`
- `mutating: boolean`

**Outputs:**
- `(cancel) EventEmitter<void>` (la page maneja abrir el dialog y dispatch)
- `(end) EventEmitter<void>`

**Render (solo campos disponibles hoy):**
- Avatar con iniciales de `patientFullName` (helper `initialsOf`).
- Nombre grande + pill URGENTE si `isUrgent`.
- Meta: `DNI <patientDni>` · `Orden <attentionNumber>` · `<analysisCount> análisis`.
- Sin pills de nombres de análisis (no hay datos).
- Sin edad/gender/insurance (no hay datos).
- Timer: "en curso desde HH:MM" con minutos transcurridos calculados desde `extractionStartedAt`. Cuenta cada minuto.
- Box destacado.
- Botones Cancelar (rojo outline) + Finalizar (verde sólido), tamaño normal.

**Estado vacío:** dashed border + icono `pi-inbox` + heading "Sin extracción en curso" + descripción.

### 7.7. `CancelExtractionDialogComponent` (nuevo)
- `p-dialog` modal centrado.
- Header: "Cancelar extracción de <patientFullName>".
- Body:
  - Texto info: "Vas a cancelar la extracción. Indicá el motivo — queda registrado para auditoría."
  - `<textarea pInputTextarea>` con `[(ngModel)]="reason"`, `rows=4`, `placeholder="Ej: paciente no se presentó al box"`, `maxlength=500`.
  - Contador "X/500".
  - Validación visual: si `reason.length < 5` → error rojo "Mínimo 5 caracteres".
- Footer:
  - Botón "Volver" (text).
  - Botón "Cancelar extracción" (rojo, disabled hasta `reason.length >= 5`).
- Al confirmar emit `(cancelConfirmed)<{ reason: string }>`.

### 7.8. Refactor `extraction-queue.page.ts`
- **Sacar** del template el bloque viejo de "Mis extracciones" con tabla.
- **Sacar** el `<app-extractor-box-fab />` del final (era el FAB bottom-right).
- Header de la page agrega `<app-branch-selector-chip>` y `<app-box-fab>`.
- Reemplazar la tabla de mine por `<app-in-progress-extraction-card>`.
- `onCancel(item)` ahora abre `CancelExtractionDialogComponent`; al confirmar, dispatch `cancelExtraction({id, reason})`.
- Sacar `DEMO_MINE_SEED` + `localMine` + `localHiddenAwaitingIds` + handlers de demo.
- Si `selectedBranchId() == null` mostrar empty state grande "Elegí una sucursal para empezar" + el chip arriba.
- Pasar `branchId` a `loadAwaiting / loadMine / loadStats / loadOccupancy` en todos los dispatch.

### 7.9. `ExtractorBoxService` (extensión)
- Agregar persistencia de `selectedBranchId` en `localStorage['extractor.branchId']`.
- Signal `selectedBranch` consultable desde el chip y el FAB.
- Método `canTake(): boolean` ahora valida `box != null && selectedBranch != null`.

### 7.10. Tests frontend
- `branch-selector-chip.component.spec.ts`.
- `box-fab.component.spec.ts` — open/close, key shortcuts, click en box libre/ocupado.
- `in-progress-extraction-card.component.spec.ts` — empty state, urgent flag, timer ticking.
- `cancel-extraction-dialog.component.spec.ts` — validación min 5.
- `extraction.reducer.spec.ts` — actions nuevas (branches, occupancy).
- `extraction.selectors.spec.ts` — `selectBoxIsAvailable`.
- `extractor-attention.service.spec.ts` — nuevas firmas con `branchId`, nuevos endpoints.
- `extraction-queue.page.spec.ts` — smoke + integración con sucursal seleccionada.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El campo `cancellation_reason` puede chocar con el flujo de cancelación de atención completa. | El plan debe explorar `CancelAttentionUseCase` y `Attention.cancel()` y confirmar que la semántica no colisiona. Si lo hace, separar en columna nueva. |
| Admin sin asignaciones explícitas en `user_branches` queda bloqueado. | Decidir en plan: fallback a "todas las branches del tenant" para roles ADMINISTRADOR, o seed inicial los asigna explícito. |
| Race entre dos extractores asignándose el mismo box simultáneo. | Defense in depth: la query de validación + el optimistic lock de la atención (segunda escritura falla). UI muestra mensaje de race y dispara refresh. |
| El dropdown de boxes muestra solo ocupados → no hay catálogo de "boxes válidos". | Aceptado en MVP — los boxes son enteros libres. El user elige el número. El servidor solo valida que no esté tomado. |
| Polling de occupancy suma carga. | Reusar el polling de 5s — el endpoint nuevo es uno más en cada tick, con ETag. Si se nota cargado, subir a 10s solo para occupancy. |
| Migración rompe seeds de dev. | Migración `user_branches` no toca datos existentes; el seed local-dev específico de la migración asigna usuarios. |

## 9. Criterios de aceptación

- [ ] Migración `user_branches` aplica en limpio y en DB con seeds previos. Seed asigna `extractor` y `admin` a todas las branches del tenant 1.
- [ ] `GET /me/branches` devuelve las branches asignadas al usuario.
- [ ] Los 3 endpoints de extracción rechazan request sin `branchId` (400) y request con `branchId` no asignado al user (403, español).
- [ ] `GET /branches/{branchId}/extraction-boxes/occupancy` devuelve filas correctas con nombre del extractor, soporta ETag 304.
- [ ] Tomar paciente con box ya ocupado por otro extractor → 409 "El box X está ocupado por <nombre>".
- [ ] Cancelar extracción sin reason → 400 español. Con reason válido → 200 + `cancellation_reason` guardado + `extractor_id` y `attention_box` preservados.
- [ ] Frontend: chip de sucursal arriba, dropdown elige entre las del user, persiste en localStorage.
- [ ] Frontend: FAB top-right, dropdown muestra todos los boxes con nombre, mi box destacado.
- [ ] Frontend: card de paciente en curso con avatar, nombre, DNI, attention number, count, urgent, timer, box. SIN edad / gender / insurance label / nombres de análisis.
- [ ] Frontend: cancelar abre dialog con textarea, botón disabled hasta `>= 5 chars`.
- [ ] Mensajes de error en español, sin FQCN.
- [ ] Tests verdes en ambos repos.
- [ ] Demo local (DEMO_MINE_SEED) removido del page.

## 10. Decisiones cerradas (cierres de open questions)

1. **Roles que ven todo:** `ADMINISTRADOR` (y `RESPONSABLE_*` si aplica) sin filas en `user_branches` → fallback a "todas las branches activas del tenant". El endpoint `/me/branches` detecta el rol y aplica el fallback. Los demás roles solo ven sus asignaciones explícitas (lista vacía = pantalla bloqueada con mensaje "Pedile al administrador que te asigne una sucursal").
2. **Campo cancellation_reason:** se crea **columna nueva** `extraction_cancellation_reason` en `attentions`. La existente `cancellation_reason` queda exclusiva para `CancelAttentionUseCase` (atención entera). Migración Flyway suma la columna como nullable.
3. **Endpoint `/me/branches`:** vive en el **módulo empresa** — natural con la arquitectura (empresa gestiona identidad y permisos). Controller nuevo `MeBranchesController` o agregar a un `MeController` existente si está.
4. **Catálogo de boxes:** **deuda explícita** documentada acá. NO entra en este PR. Hoy los boxes siguen siendo enteros libres validados por occupancy. Cuando se necesite, abrir ticket nuevo para tabla `branch_boxes` con CRUD admin.

## 11. Follow-ups documentados (no en este PR)

- **Tabla `branch_boxes`** con catálogo de boxes válidos por sucursal (numéricos + label opcional + activo/inactivo). Hoy: cualquier entero >= 1 es aceptado.
- **Campos del paciente en la card**: edad (de `patientBirthDate`), gender, `insurancePlanLabel`, nombres de análisis. Requiere extender `PatientProjection`, agregar `InsurancePlanLookupPort`, y `AnalysisLookupPort` con batch por atención.
- **Historial de extracciones canceladas** con motivo, vista de auditoría para admin.
- **Avatar real del usuario** (foto) cuando se implemente upload de imágenes de perfil.
