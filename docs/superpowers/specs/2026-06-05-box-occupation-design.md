# Ocupación de boxes por secretaria en recepción — diseño

> **Fecha:** 2026-06-05
> **Estado:** spec aprobado, pendiente plan de implementación
> **Scope:** UX recepción + persistencia backend + propagación a TV de atención. Solo tipo ATENCION; EXTRACCION queda para ticket siguiente.
> **Jira:** _pendiente (se crea al cerrar plan)_

---

## 1. Propósito

Cuando una secretaria entra a su pantalla de recepción al inicio del turno, debe elegir en qué box físico se sentó hoy (1..N donde N = `branch.atencionBoxesCount`). El sistema:

1. Persiste la ocupación a nivel organizativo (otras secretarias ven qué boxes ya están ocupados).
2. Bloquea recepción hasta que la secretaria elija un box (modal forzado).
3. Cuando esa secretaria llama a un paciente desde recepción, el TV de atención muestra "→ Box {N}" con el box real de la secretaria que llamó (no más derivado/mockeado).

Mismo patrón se replicará para extracción en otro ticket.

## 2. Contexto del proyecto

- KAN-79 agregó `branch.atencionBoxesCount` y `branch.extraccionBoxesCount` (min=1).
- La TV de atención ya consume `PublicQueueEntry.boxNumber` (campo opcional desde KAN-79) con fallback derivado `(e.id % 3) + 1` cuando viene null.
- El endpoint `POST /queue-entries/{id}/call` actualiza `last_called_at` pero no captura el box del operador.
- No existe modelo de "occupation" hoy.

## 3. Requerimientos funcionales

1. **Selector de box obligatorio**: al entrar a `/turnos/recepcion`, si la secretaria no tiene una occupation activa para el branch+ATENCION, se abre un modal bloqueante (no closable) que la fuerza a elegir un box libre.
2. **Visualización organizativa**: el modal muestra todos los boxes 1..N. Los ocupados por otras secretarias aparecen en gris con el nombre de quien lo ocupa. No clickeables. Los libres en verde y clickeables.
3. **Mini widget en header**: una vez elegido el box, el header de recepción muestra una pill "Box N" con menú "Cambiar box" / "Liberar box". Cambiar reabre el modal. Liberar dispara DELETE y reabre el modal bloqueante.
4. **Ciclo de vida**: la occupation se libera (a) cuando la secretaria hace logout o (b) cuando el cron diario a las 00:00 limpia las que quedaron.
5. **Propagación al TV**: cuando la secretaria llama un paciente desde recepción, el backend captura su box activo y lo guarda en `queue_entries.called_from_box`. El endpoint público de display ahora popula `PublicQueueEntry.boxNumber` desde esa columna.

## 4. Modelo de datos (backend)

### Tabla nueva: `branch_box_occupation`

```sql
CREATE TABLE branch_box_occupation (
  id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  branch_id       BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  box_type        VARCHAR(20) NOT NULL,           -- 'ATENCION' | 'EXTRACCION'
  box_number      INT NOT NULL,
  occupied_at     DATETIME(6) NOT NULL,
  released_at     DATETIME(6) NULL,
  active          TINYINT(1) NULL,                -- 1 = activa, NULL = liberada (NO 0)
  created_at      DATETIME(6) NOT NULL,
  updated_at      DATETIME(6) NOT NULL,
  created_by      VARCHAR(120) NOT NULL,
  updated_by      VARCHAR(120) NOT NULL,
  version         BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT fk_bbo_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT fk_bbo_user   FOREIGN KEY (user_id)   REFERENCES users(id),
  UNIQUE KEY uk_bbo_user_active (branch_id, box_type, user_id, active),
  UNIQUE KEY uk_bbo_box_active  (branch_id, box_type, box_number, active),
  INDEX idx_bbo_branch_active (branch_id, active),
  INDEX idx_bbo_tenant (tenant_id)
);
```

**Por qué `active` es nullable y se usa NULL para "liberada"**: MySQL UNIQUE permite múltiples filas con valor NULL pero no múltiples con el mismo valor no-NULL. Usar `active = NULL` para histórico mantiene los UNIQUE constraints sólo entre filas activas (active=1), garantizando a nivel DB que no hay race conditions de doble-ocupación.

### Modificación a `queue_entries`

```sql
ALTER TABLE queue_entries ADD COLUMN called_from_box INT NULL;
```

Nullable porque admitimos llamados sin occupation (caso degradado, ver §7).

## 5. Endpoints backend

### 5.1 Listar occupations activas de una sucursal

`GET /api/v1/branches/{branchId}/box-occupations?type=ATENCION`

Auth: `SECRETARIA`, `ADMINISTRADOR`.

```json
[
  { "boxNumber": 1, "userId": 10002, "userName": "Ana Rodríguez",   "occupiedAt": "2026-06-05T09:12:00Z", "boxType": "ATENCION" },
  { "boxNumber": 4, "userId": 10005, "userName": "Lucía Méndez",     "occupiedAt": "2026-06-05T09:30:00Z", "boxType": "ATENCION" }
]
```

### 5.2 Ocupar / cambiar box (mío)

`PUT /api/v1/branches/{branchId}/box-occupations/me`

```json
{ "boxType": "ATENCION", "boxNumber": 3 }
```

Auth: `SECRETARIA`, `ADMINISTRADOR`. Use case `OccupyBoxUseCase`:

1. Carga `Branch` por branchId + tenantId. Valida que `boxNumber ∈ [1, branch.atencionBoxesCount]` (o `extraccionBoxesCount` según `boxType`). 400 si fuera de rango.
2. Si el user ya tenía una occupation activa para ese branch+boxType → la libera (set `released_at = NOW`, `active = NULL`).
3. Inserta nueva fila con `active = 1`.
4. Si la inserción viola el UNIQUE `uk_bbo_box_active` (otro user tomó el mismo box concurrentemente) → 409 con mensaje "Ese box ya fue ocupado por otra secretaria. Refrescá y elegí otro.".

### 5.3 Liberar mi box

`DELETE /api/v1/branches/{branchId}/box-occupations/me?type=ATENCION`

Auth: `SECRETARIA`, `ADMINISTRADOR`. Use case `ReleaseBoxUseCase`:

1. Busca la occupation activa del user actual para branch+boxType.
2. Set `released_at = NOW`, `active = NULL`.
3. 204 si OK. 404 si no había nada que liberar (no es error grave; la UI lo trata como éxito silencioso).

### 5.4 Modificación al endpoint de call

`POST /api/v1/queue-entries/{id}/call` (existente).

Use case `CallQueueEntryUseCase` agrega un paso:
- Después de actualizar `last_called_at`, lee `branch_box_occupation` activa del user actor (`tenant_id, branch_id, box_type=ATENCION, user_id, active=1`).
- Si existe → set `queue_entry.called_from_box = occupation.box_number`.
- Si no existe → `called_from_box = NULL`. Log `WARN` "[call] user X called without active box occupation". El llamado igual procede.

### 5.5 Modificación al endpoint público de display

`GET /public/display/{tenantSlug}/{branchId}/queue` (existente).

El mapper que arma `PublicQueueEntry` ahora popula `boxNumber` desde `queue_entries.called_from_box` (sin transformación). Si es NULL, el campo viaja como `null` en el JSON. La TV ya tiene fallback derivado.

## 6. UX frontend

### 6.1 Estructura de módulos

Nuevo feature dentro de `turnos` (no `sucursales` porque los consumidores son recepción/atención):

```
src/app/features/turnos/box-occupation/
├── models/box-occupation.model.ts
├── services/box-occupation.service.ts
├── store/
│   ├── box-occupation.actions.ts
│   ├── box-occupation.effects.ts
│   ├── box-occupation.reducer.ts
│   ├── box-occupation.selectors.ts
│   └── box-occupation.state.ts
└── components/
    ├── box-selector-modal.component.{ts,html,scss}
    └── box-occupation-widget.component.{ts,html,scss}
```

### 6.2 `BoxSelectorModalComponent` (grid A aprobado)

- `<p-dialog>` modal, `[closable]="canClose"` (false si user no tiene occupation, true si está en modo "cambiar").
- Body: grid 3 columnas (`grid-template-columns: repeat(3, 1fr)`). Una celda por box 1..N.
- Estados visuales:
  - **Libre** (no aparece en `occupations`): borde verde `#059669`, background `#ecfdf5`, `cursor:pointer`. Click dispatcha `occupyBox`.
  - **Ocupado por otra**: borde gris, background `#f1f5f9`, color `#94a3b8`. `cursor:not-allowed`. Muestra `Box N` + nombre.
  - **Mi box actual**: borde verde 3px + ícono check `pi-check`. No clickeable (ya es mío).
- Footer: si `canClose`, botón "Cerrar". Sino, sólo título "Elegí tu box para empezar tu turno".
- All occupied edge case: si no hay ninguna celda libre + el user no tiene occupation actual → muestra alerta inline "Todos los boxes están ocupados. Pedile a alguien que libere o aumentá la cantidad de boxes en Configuración de sucursal. (Cerrar)". Botón cierra el modal pero la recepción queda inutilizable.

### 6.3 `BoxOccupationWidgetComponent`

Pill chico para el header de recepción:

```
[ ● Box 3 ▾ ]
   └── menú:
       - Cambiar box   (abre modal en modo "cambiar")
       - Liberar box   (dispatcha releaseBox + abre modal bloqueante)
```

- Si el user todavía no tiene occupation (estado inicial post-load) → muestra "Sin box" en gris.
- `p-menu` de PrimeNG para el dropdown.

### 6.4 Wire-up en recepción

En `pages/recepcion/recepcion.page.ts` (y los subcomponentes `recepcion-con-totem` / `recepcion-sin-totem`):

- `ngOnInit`: dispatch `loadBoxOccupations({ branchId, boxType: 'ATENCION' })` para pintar el listado.
- `effect`: cuando `myOccupation()` esté loaded y sea `null`, abrir `BoxSelectorModalComponent` con `canClose=false`.
- Header del componente: agregar `<app-box-occupation-widget [branchId]="..." [boxType]="'ATENCION'" />` al lado de "Turnos del día" / "Nueva atención".

### 6.5 NgRx store

State:
```ts
interface BoxOccupationState {
  occupations: BoxOccupation[];   // todas las activas de la sucursal
  myOccupation: BoxOccupation | null;  // derivada cliente-side de occupations + currentUserId
  loading: boolean;
  error: string | null;
}
```

Actions (clásicas, según convención del proyecto):
- `loadBoxOccupations({ branchId, boxType })` / `Success({ occupations })` / `Failure({ error })`
- `occupyBox({ branchId, boxType, boxNumber })` / `Success({ occupation })` / `Failure({ error })`
- `releaseBox({ branchId, boxType })` / `Success()` / `Failure({ error })`

Effects:
- Cada éxito refresca la lista (re-dispatch `loadBoxOccupations`) — pessimistic, sin optimistic update; el costo es 1 round-trip extra pero garantiza consistencia con otras secretarias que están viendo el mismo modal.

Selectors:
- `selectMyBoxOccupation`: filtra `occupations` por `userId === currentUserId`.
- `selectOccupationsByBox`: dictionary `{ [boxNumber]: occupation | null }` para pintar el grid.

## 7. Ciclo de vida y edge cases

| Caso | Comportamiento |
|---|---|
| Logout | Antes del clear-token-y-redirect, hacer `DELETE /box-occupations/me?type=ATENCION` (effect en el feature de auth). Best-effort: si el delete falla por red, igual seguimos con el logout — el cron diario limpia. |
| Sesión muerta sin logout (token expirado, cierre de browser) | Occupation queda activa. Otra secretaria la ve. El cron del día siguiente la limpia. UX se banca el ruido. |
| Cron diario | `@Scheduled(cron = "0 0 0 * * *")` en backend. Bulk update: `UPDATE branch_box_occupation SET released_at = NOW(), active = NULL WHERE active = 1`. Una sola query, no recorre filas en Java. |
| All boxes occupied | Ver §6.2 — modal muestra alerta. |
| Branch con `atencionBoxesCount = 1` | El modal igual aparece. Para una secretaria sola es 1 click. Para 2+ secretarias en simultáneo, la segunda se queda fuera. |
| Branch con `atencionBoxesCount` cambiado a la baja después de que hay occupations en boxes > nuevo límite | No invalidamos automáticamente. Esas occupations siguen activas hasta release/cron. Validación de rango sólo aplica a nuevas occupations. |
| Call sin occupation (caso degradado) | El llamado procede. `queue_entries.called_from_box = NULL`. TV cae al fallback derivado `(id % 3) + 1`. Log WARN en backend. |
| Admin (rol ADMINISTRADOR) usando recepción | Misma UX: debe elegir box. Su nombre aparece en el modal de otras. |
| Doble click en un box libre (race local) | Effect ignora si ya hay un `loading` pendiente. NgRx state.loading actúa como mutex de UI. |
| Race de 2 secretarias eligiendo el mismo box | Backend devuelve 409. Frontend muestra toast "Ese box ya fue ocupado, refrescá" y dispatcha `loadBoxOccupations` para repintar. |

## 8. Testing

### Backend
- Unit `OccupyBoxUseCase`:
  - rango válido OK
  - rango fuera (0, N+1) → exception 400
  - user ya con occupation previa → la libera y crea nueva
  - 409 cuando UNIQUE colisión
- Unit `ReleaseBoxUseCase`:
  - libera OK
  - sin nada que liberar → no error (idempotente)
- Integration `CallQueueEntryUseCase`:
  - con occupation → `called_from_box` igual al box
  - sin occupation → `called_from_box = NULL`
- Cron job test: bulk update marca todas las active=1 a NULL.
- Controller test: 403 para usuario sin rol válido.

### Frontend
- Reducer + selectors smoke (estado vacío, post-success, post-failure).
- Spec del modal: render N slots, click libre dispatcha, ocupado no dispatcha, all-occupied muestra alerta.
- Spec del widget: muestra box actual, abre modal al click "Cambiar".
- Spec de `RecepcionPage`: cuando `myOccupation` es null → modal se abre; cuando hay box → modal no se abre.

### Smoke manual
1. Login como secretaria → /turnos/recepcion → ver modal con 6 boxes (asumiendo `atencionBoxesCount = 6`) todos libres.
2. Elegir Box 3 → modal cierra, header muestra "Box 3".
3. En otra ventana, login como admin (también con sections) → mismo /recepcion → ver modal con Box 3 gris ocupado por "Ana Rodríguez", elegir Box 1.
4. Volver a la primera ventana → en widget hacer click "Liberar" → modal se reabre y Box 3 está disponible. Elegir Box 5.
5. Hacer "Atender" en una entry de cola → la TV de atención muestra "→ Box 5".
6. Logout → reabrir login → verificar via SQL que mi occupation tiene `active = NULL` y `released_at` populado.

## 9. Entrega

- **Rama backend**: nueva `feat/KAN-XX-box-occupation` desde `development`. PR única hacia development.
- **Rama frontend**: piggyback en `feat/KAN-73-recepcion-branch-context` (bundle del cierre).
- **Jira**: ticket nuevo "Ocupación de boxes en recepción (ATENCION)" creado al cerrar el plan via `jira-workflow`.

## 10. Out of scope (no entra acá)

- Boxes de extracción (mismo patrón, ticket siguiente).
- Histórico/audit panel en UI ("ver quién estuvo en cada box hoy").
- Auto-release por idle/timeout (>N horas sin actividad).
- Admin UI para forzar release de cualquier box ajeno.
- Móvil/responsive del modal (recepción siempre se usa en desktop).
- Reasignación automática de box cuando `atencionBoxesCount` baja por debajo de boxes ocupados (queda como tarea futura si se vuelve un problema).
