# Cola del día y Sala de espera (TV) — Laboratorio

> Spec B de la trilogía TURNOS frontend. Sucede a Spec A
> (`2026-05-19-turnos-config-laboratorio-design.md`) y precede a Spec C
> (reserva por paciente externo, en `FRONTEND-PORTAL`).

## Contexto

El módulo TURNOS del backend ya tiene implementado el `QueueController`
(`POST /queue`, `GET /queue`, `PATCH /queue/{id}`, `POST /queue/reset`).
Detalle completo en `Backend/docs/turnos-backend-reference.md` §3.4.

El frontend tiene un placeholder vacío (`/turnos/colas`, 11 líneas).
Spec B implementa dos pantallas nuevas:

- **Pantalla de recepción** (interactiva, para secretaria/admin) que cambia
  de comportamiento según si la sucursal tiene tótem o no.
- **Pantalla de sala de espera** (TV pasiva, full-screen, pública) que muestra
  los próximos llamados a los pacientes en la sala.

Además, Spec B agrega un **flag de configuración por sucursal** (`tiene tótem`)
que controla el comportamiento de la pantalla de recepción y la disponibilidad
de la TV, y suma el **mecanismo de "llamar paciente por pantalla"** que hoy
no existe en backend.

## Alcance

### IN scope (Spec B)

**Backend:**
- Tabla + entidad + repo + endpoints para `branch_totem_config` (GET por branch + PUT).
- Campos `lastCalledAt` / `callCount` en `QueueEntry` + migración + endpoint
  `POST /queue/{id}/call`.
- Endpoint público `GET /public/display/{tenantSlug}/{branchId}/queue` sin auth.

**Frontend laboratorio:**
- Pantalla `/turnos/recepcion` con dos modos (con/sin tótem) según el flag.
- Pantalla `/display/{tenantSlug}/{branchId}` (TV) fuera del admin-shell.
- Toggle "Tiene tótem" inline en la lista de `/sucursales/lista` (columna nueva).
- Sidebar condicional (oculta "Sala de espera" si la sucursal no tiene tótem).
- Stores NgRx para `queue`, `appointments` y `branch-totem-config`.

### OUT of scope (otras specs / otra persona)

- Pantalla del tótem (`/turnos/totem`) — otra persona, Spec D futura.
- Módulo ATENCION (`/turnos/atencion-turno`) — otra persona. Spec B solo
  dispara la navegación.
- Asociación `User ↔ Branch` — prereq de otro módulo (usuarios). Spec B
  asume `currentUser.branchId` disponible; mientras no lo esté, trabaja con
  mock dev (`branchId = 1` con warning en consola).
- Auto-expiración diaria de `QueueEntry` (cron) — backend lo tiene resuelto.
- Spec A (configuración de agendas) y Spec C (reserva externa).
- CRUD completo de sucursales — cuando aparezca, el toggle inline se migra
  al form de edit.

### Dependencias entre Spec B y otros trabajos

- **Depende de:** asociación User↔Branch (no bloqueante — mock dev).
- **Habilita:** módulo ATENCION — Spec B dispara navegación a
  `/turnos/atencion-turno/{queueEntryId}` (con tótem) o
  `/turnos/atencion-turno?appointmentId=X` (sin tótem). Los dos estilos
  son intencionales: con tótem el ID viene de la cola (entidad `QueueEntry`,
  path param); sin tótem viene de la agenda (entidad `Appointment`, query
  param). Si la ruta de ATENCION termina aceptando un solo estilo, ajustar
  acá la convención cuando esa persona la defina.

## Decisiones

### Modelo de flujo

**Con tótem** (sucursal con `branch_totem_config.enabled = true`):
- Tótem (otra persona) llama `POST /queue` y crea `QueueEntry` con
  `hasAppointment` true/false.
- Pantalla recepción muestra **dos listados separados**: con turno
  (`hasAppointment=true`) y sin turno (`hasAppointment=false`).
- Cada fila ofrece acciones "Nueva atención" (→ ATENCION) y
  "Llamar por pantalla" (→ TV destaca al paciente).
- La TV (`/display/...`) está habilitada y refresca cada 3 seg.

**Sin tótem:**
- La cola backend **no se usa**. `POST /queue` no se llama desde acá.
- Pantalla recepción muestra **una sola lista**: los appointments del día
  para la sucursal del usuario.
- Cada fila tiene botón "Atender" → ATENCION.
- Botón global "Atención nueva (walk-in)" → ATENCION sin appointmentId.
- TV no aplica (la route redirige silenciosa a recepción si alguien la abre).

**Matching CON tótem:** el frontend confía en el flag `hasAppointment` que
el backend ya marca al registrar la llegada. No se hace intersección
client-side con appointments del día.

### Rutas

```typescript
// turnos.routes.ts (cambios)
{ path: 'recepcion',
  canActivate: [recepcionAccessGuard], // SECRETARIA | ADMINISTRADOR
  loadComponent: () => import('./pages/recepcion/recepcion.page')
    .then(m => m.RecepcionPage) },

// /turnos/colas se elimina (placeholder vacío)
// /turnos/sala-espera se descarta — la TV vive fuera de admin-shell

// app.routes.ts (nueva ruta top-level, fuera de admin-shell)
{ path: 'display/:tenantSlug/:branchId',
  loadComponent: () => import('./features/turnos/pages/sala-espera/sala-espera.page')
    .then(m => m.SalaEsperaPage) }
// sin authGuard, sin tenantResolver, sin admin-shell
```

Sidebar: el link "Sala de espera" aparece **solo si** la sucursal del usuario
tiene tótem y construye la URL dinámica con `currentUser.tenantSlug + currentUser.branchId`.

### Auth de la TV

Endpoint público sin JWT (`GET /public/display/{tenantSlug}/{branchId}/queue`).
Razón: la TV se abre en un monitor de sala de espera 24/7 y cualquier
solución con login interactivo eventualmente se rompe (timeout, browser cierra,
license usage). La info expuesta es solo `publicCode` (no PII), riesgo bajo.
Si después se necesita endurecer, se migra a token de display sin romper la
URL pública.

### Permisos

| Acción | Rol requerido |
|---|---|
| `GET /sucursales/branches/{id}/totem-config` | `SECRETARIA` o `ADMINISTRADOR` |
| `PUT /sucursales/branches/{id}/totem-config` | `ADMINISTRADOR` |
| `POST /turnos/queue/{id}/call` | `SECRETARIA` o `ADMINISTRADOR` |
| `GET /public/display/{slug}/{branch}/queue` | sin auth |
| Acceso a `/turnos/recepcion` | `SECRETARIA` o `ADMINISTRADOR` (guard nuevo) |
| Acceso a `/display/{slug}/{branch}` | sin auth |
| Toggle "Tiene tótem" en `/sucursales/lista` | `ADMINISTRADOR` (deshabilitado para otros) |

### TV — Decisiones de UX

- **Solo `publicCode`** en pantalla (sin nombres) → privacidad + layout
  consistente entre `CT-XXXX` (con turno, paciente conocido) y `ST-XXXX`
  (sin turno, paciente puede no figurar).
- **Layout "Destacado + próximos"** (destacado grande arriba, lista de
  próximos abajo). El destacado dura 15 seg desde `lastCalledAt`; si la
  secretaria re-llama, se resetea.
- **Polling cada 3 seg** (sin WebSocket — no existe en backend).
- **Beep simple** (`assets/audio/beep.mp3`) cuando cambia el destacado.
- **Estados:**
  - Cola vacía → "Esperando pacientes" + hora + nombre de sucursal.
  - Fuera de horario (calculado por backend con min/max de AgendaConfigs
    activas hoy para la branch) → "CERRADO" + horario de reapertura.
  - Sin conexión (≥15s sin polling exitoso) → banner pequeño
    "Reconectando..." sobre el último snapshot conocido.

### Recepción — Decisiones de UX

- **Polling cada 5 seg** en ambos modos (queue o appointments).
- **Sin botón "Cancelar/Expirar"** en recepción. La transición a `COMPLETED`
  la dispara ATENCION al cerrar la atención. La expiración del día la maneja
  el cron de backend.
- **Botón "Atención nueva (walk-in)"** solo visible en modo sin-tótem
  (en con-tótem los walk-ins entran por el tótem).
- **Acción "Llamar por pantalla"** dispara `POST /queue/{id}/call`, muestra
  toast "Llamado registrado" y refresca la lista.

## Prerequisitos backend

### Backend B1 — `branch_totem_config` (módulo `sucursales`)

Sigue patrón de `TenantSmtpConfigJpaEntity`.

**Migración V55** (`V55__create_branch_totem_config.sql`):

```sql
CREATE TABLE branch_totem_config (
    id BIGINT NOT NULL AUTO_INCREMENT,
    target_branch_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP(6) NOT NULL,
    updated_at TIMESTAMP(6) NOT NULL,
    created_by VARCHAR(120) NOT NULL,
    updated_by VARCHAR(120) NOT NULL,
    deleted_at TIMESTAMP(6),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT pk_branch_totem_config PRIMARY KEY (id),
    CONSTRAINT uk_branch_totem_config_branch UNIQUE (target_branch_id),
    CONSTRAINT fk_branch_totem_config_branch FOREIGN KEY (target_branch_id) REFERENCES branch(id)
);
CREATE INDEX idx_branch_totem_config_tenant ON branch_totem_config(tenant_id);
```

> Estilo SQL alineado con `V54__create_queue_sequences.sql` (MySQL/H2):
> `BIGINT AUTO_INCREMENT` en vez de `BIGSERIAL`, `created_by/updated_by` como
> `VARCHAR(120)` (username), `TIMESTAMP(6)` para precisión.

**Archivos nuevos** (en `modules/sucursales/`):

- `domain/model/BranchTotemConfig.java`
- `domain/port/BranchTotemConfigRepository.java`
- `infrastructure/persistence/entity/BranchTotemConfigJpaEntity.java`
  (extiende `BaseJpaEntity`)
- `infrastructure/persistence/repository/BranchTotemConfigJpaRepository.java`
- `infrastructure/persistence/mapper/BranchTotemConfigJpaMapper.java`
- `application/usecase/GetBranchTotemConfigUseCase.java`
- `application/usecase/UpsertBranchTotemConfigUseCase.java`
- `presentation/controller/BranchTotemConfigController.java`
- `presentation/dto/BranchTotemConfigResponse.java` (record)
- `presentation/dto/UpsertBranchTotemConfigRequest.java` (record con
  `Boolean enabled`)

**Endpoints:**

```
GET  /api/v1/sucursales/branches/{branchId}/totem-config
     → BranchTotemConfigResponse { branchId, enabled, active }
     → rol SECRETARIA | ADMINISTRADOR (read)
     → 404 si no existe registro → frontend interpreta como enabled=false

PUT  /api/v1/sucursales/branches/{branchId}/totem-config
     → UpsertBranchTotemConfigRequest { enabled }
     → rol ADMINISTRADOR
     → upsert: si no existe crea; si existe actualiza
```

### Backend B2 — `QueueEntry` call tracking + endpoint (módulo `turnos`)

**Migración V56** (`V56__add_call_tracking_to_queue_entries.sql`):

```sql
ALTER TABLE queue_entries
    ADD COLUMN last_called_at TIMESTAMP(6) NULL,
    ADD COLUMN call_count INT NOT NULL DEFAULT 0;
```

**Cambios en archivos existentes:**

- `QueueEntryJpaEntity.java` → agregar `Instant lastCalledAt` (nullable) y
  `int callCount` (default 0).
- `QueueEntry.java` (domain model) → mismos campos.
- Mappers → propagar campos.
- `QueueEntryResponse` (DTO) → exponer `lastCalledAt` y `callCount`.

**Archivos nuevos:**

- `application/usecase/CallQueueEntryUseCase.java` → setea
  `lastCalledAt = Instant.now()`, incrementa `callCount`.
- `presentation/dto/CallQueueEntryResponse.java` (record).

**Endpoint nuevo en `QueueController`:**

```
POST /api/v1/turnos/queue/{id}/call
     → sin body
     → CallQueueEntryResponse { id, lastCalledAt, callCount, status }
     → rol SECRETARIA | ADMINISTRADOR
     → 404 si no existe
     → 409 si status != PENDING
```

### Backend B3 — Endpoint público de display TV (módulo `turnos`)

**Archivos nuevos** (subcarpeta `presentation/public/`):

- `presentation/public/PublicDisplayQueueController.java`
- `presentation/public/dto/PublicQueueEntryResponse.java` (record con solo
  `publicCode`, `status`, `lastCalledAt`, `callCount`, `createdAt` — **sin**
  `patientId`, `nationalId` ni nombre).
- `presentation/public/dto/DisplaySnapshotResponse.java` (record con
  metadata + entries).

**Endpoint nuevo:**

```
GET /public/display/{tenantSlug}/{branchId}/queue
     → sin auth
     → resuelve tenant via tenantSlug (lookup en tabla tenant)
     → valida que branch pertenece al tenant
     → response:
       {
         tenantName: string,
         branchName: string,
         serverTime: string,           // "HH:mm"
         openWindow: { startTime, endTime } | null,
         entries: PublicQueueEntryResponse[]   // status=PENDING, ordenadas createdAt ASC
       }
     → response body NO incluye PII
     → 404 si tenantSlug o branchId no existen
     → caché HTTP 0
```

**`openWindow`** lo calcula el backend como `min(startTime)` y `max(endTime)`
entre las `AgendaConfig` activas hoy para la branch (filtrando por
`recurringDaysOfWeek` o `validFromDate/validToDate`). Si no hay agendas
válidas → `null`.

**Config de seguridad:** agregar `/public/**` a la lista de paths permitidos
sin auth en `SecurityConfig`. El `TenantContextFilter` se saltea este path
(no requiere JWT); el tenant se resuelve desde el path slug en el controller.

### Prerequisitos a verificar al implementar

1. **Campo `tenantSlug` en la tabla `tenant`** — si no existe, agregar
   migración V57 (`V57__add_slug_to_tenant.sql`) con backfill desde el nombre.
2. **`GET /api/v1/turnos/appointments?branchId=X&date=YYYY-MM-DD`** — si no
   existe, agregarlo (filtro trivial sobre la tabla appointments).
3. **`currentUser.tenantSlug` disponible en el frontend** — la sidebar
   construye `/display/{tenantSlug}/{branchId}` dinámicamente. Verificar
   que el `AuthService` / `/me` endpoint exponga el slug del tenant del
   usuario actual. Si no, sumar el campo a la response de `/me`.

## Frontend

### Rutas

Ver sección de Decisiones → Rutas arriba. Cambios concretos:

- `turnos.routes.ts`: reemplaza el placeholder `colas` por `recepcion`.
- `app.routes.ts`: agrega `display/:tenantSlug/:branchId` top-level fuera
  del admin-shell.

### Componentes nuevos

```
features/turnos/
├── pages/
│   ├── recepcion/
│   │   ├── recepcion.page.ts                    ← contenedor; decide modo según flag
│   │   ├── recepcion.page.scss
│   │   ├── recepcion-con-totem.component.ts     ← 2 listados queue
│   │   └── recepcion-sin-totem.component.ts     ← 1 listado appointments
│   └── sala-espera/
│       ├── sala-espera.page.ts                  ← layout full-screen TV
│       ├── sala-espera.page.scss
│       ├── empty-state.component.ts             ← "Esperando pacientes"
│       └── closed-state.component.ts            ← "CERRADO" + reapertura
├── components/
│   └── queue-row-actions.component.ts           ← menú 3 puntitos reutilizable
├── services/
│   ├── queue.service.ts                         ← list, call
│   ├── branch-totem-config.service.ts           ← getConfig
│   ├── appointment.service.ts                   ← listToday
│   └── public-display.service.ts                ← fetchSnapshot (sin auth)
├── store/queue/
│   ├── queue.state.ts
│   ├── queue.actions.ts
│   ├── queue.reducer.ts
│   ├── queue.effects.ts
│   └── queue.selectors.ts
├── store/appointments/
│   └── (mismos 5 archivos)
├── store/branch-totem-config/
│   └── (mismos 5 archivos)
├── guards/
│   └── recepcion-access.guard.ts                ← SECRETARIA | ADMINISTRADOR
├── assets/
│   └── audio/beep.mp3                           ← ~1 seg
└── models/
    ├── queue-entry.model.ts
    ├── queue-status.enum.ts
    ├── branch-totem-config.model.ts
    ├── appointment.model.ts
    └── public-display.model.ts
```

Y en módulo `sucursales`:

- `features/sucursales/pages/sucursales/sucursales.component.ts` → agrega
  columna "Tótem" con `p-inputSwitch` por fila.
- `features/sucursales/services/sucursales.service.ts` → método
  `updateTotemConfig(branchId, enabled)`.
- `features/sucursales/models/branch-totem-config.model.ts`.

### Modelos (DTOs alineados al backend)

```ts
// queue-entry.model.ts
export interface QueueEntry {
  id: number;
  publicCode: string;            // "CT-0023" | "ST-0007"
  nationalId: string;
  patientId: number | null;
  branchId: number;
  hasAppointment: boolean;
  status: QueueStatus;
  lastCalledAt: string | null;   // ISO
  callCount: number;
  createdAt: string;
}

export enum QueueStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}

// branch-totem-config.model.ts
export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
  active: boolean;
}

// public-display.model.ts
export interface DisplaySnapshot {
  tenantName: string;
  branchName: string;
  serverTime: string;
  openWindow: { startTime: string; endTime: string } | null;
  entries: PublicQueueEntry[];
}

export interface PublicQueueEntry {
  id: number;
  publicCode: string;
  status: QueueStatus;
  lastCalledAt: string | null;
  callCount: number;
  createdAt: string;
}

// appointment.model.ts (subset que necesitamos en SIN tótem)
export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  appointmentTime: string;       // ISO
  status: string;
}
```

### Data flow por escenario

**Escenario A — Admin entra a `/turnos/recepcion`:**

```
ngOnInit
  → dispatch loadBranchTotemConfig({ branchId: currentUser.branchId })
selector branchTotemEnabled (signal)
  ├─ true   → render <recepcion-con-totem>
  ├─ false  → render <recepcion-sin-totem>
  └─ loading → skeleton
```

**Escenario B — Recepción CON tótem (polling):**

```
mounted
  → dispatch loadQueue({ branchId })
  → interval 5000ms → dispatch loadQueue
click "Llamar por pantalla"
  → dispatch callQueueEntry({ id })
    effect → service.call → success → dispatch loadQueue + toast
click "Nueva atención"
  → router.navigate(['/turnos/atencion-turno', entry.id])
```

**Escenario C — Recepción SIN tótem (polling):**

```
mounted
  → dispatch loadTodayAppointments({ branchId })
  → interval 5000ms → dispatch loadTodayAppointments
click "Atender"
  → router.navigate(['/turnos/atencion-turno'], { queryParams: { appointmentId } })
click "Atención nueva (walk-in)"
  → router.navigate(['/turnos/atencion-turno'])
```

**Escenario D — TV (`/display/{slug}/{branch}`):**

```
ngOnInit
  → publicDisplayService.fetchSnapshot(slug, branch) → snapshot signal
  → interval 3000ms → fetchSnapshot
computed calledEntry / upcomingEntries / viewMode
effect(beep on calledEntry.id change)
NO store global — todo en signals locales
```

**Escenario E — Admin togglea tótem en `/sucursales/lista`:**

```
toggle change
  → service.updateTotemConfig(branchId, enabled) → toast
  → refresca lista local (signal)
NO store — mutación directa
```

### Store NgRx — slices nuevos

Tres slices nuevos en `features/turnos/store/`, todos con patrón NgRx clásico
(actions / reducer / effects / selectors), pesimista, sin `@ngrx/entity`,
sin patrón "loaded" por default. Selectors expuestos como `Signal<T>` vía
`selectSignal`.

**`store/queue/`:**

```ts
interface QueueState {
  entries: QueueEntry[];
  loading: boolean;
  callingId: number | null;
  error: ApiErrorResponse | null;
}
```

Actions: `loadQueue`/`Success`/`Failure`, `callQueueEntry`/`Success`/`Failure`.
Selectors clave: `selectQueueEntriesWithAppointment`,
`selectQueueEntriesWalkIn` (filtran `status=PENDING` + flag `hasAppointment`).
Effects: `callQueueEntry$` redispatches `loadQueue` en success.

**`store/appointments/`:**

```ts
interface AppointmentsState {
  todayByBranch: Appointment[];
  loading: boolean;
  error: ApiErrorResponse | null;
}
```

Actions: `loadTodayAppointments`/`Success`/`Failure`.

**`store/branch-totem-config/`:**

```ts
interface BranchTotemConfigState {
  branchId: number | null;
  enabled: boolean | null;
  loading: boolean;
  error: ApiErrorResponse | null;
}
```

Actions: `loadBranchTotemConfig`/`Success`/`Failure`. NO hay update action
en este store (el update vive en módulo sucursales con signal local).
Effects: en `404` dispatcha `Success({ branchId, enabled: false })`
silenciosamente.

### TV — Lógica de signals

```ts
snapshot = signal<DisplaySnapshot | null>(null);
lastSuccessfulFetch = signal<number>(0);
previousCalledId = signal<number | null>(null);

connectionLost = computed(() => Date.now() - lastSuccessfulFetch() > 15000);

calledEntry = computed(() => {
  const entries = snapshot()?.entries ?? [];
  const pending = entries.filter(e => e.status === 'PENDING' && e.lastCalledAt);
  if (!pending.length) return null;
  const mostRecent = pending.reduce((a, b) =>
    new Date(a.lastCalledAt!) > new Date(b.lastCalledAt!) ? a : b
  );
  const ageSeconds = (Date.now() - new Date(mostRecent.lastCalledAt!).getTime()) / 1000;
  return ageSeconds < 15 ? mostRecent : null;
});

upcomingEntries = computed(() => {
  const entries = snapshot()?.entries ?? [];
  const called = calledEntry();
  return entries
    .filter(e => e.status === 'PENDING' && e.id !== called?.id && !e.lastCalledAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 5);
});

viewMode = computed(() => {
  const snap = snapshot();
  if (!snap) return 'loading';
  if (isOutsideOpenWindow(snap)) return 'closed';
  if (snap.entries.filter(e => e.status === 'PENDING').length === 0) return 'empty';
  return 'queue';
});

// Beep effect
effect(() => {
  const current = calledEntry();
  if (current && current.id !== previousCalledId()) {
    playBeep();
    previousCalledId.set(current.id);
  }
});
```

Cancela polling con `takeUntilDestroyed` en `ngOnInit`.

### Layout de la TV

**Modo `queue` (con destacado):**

```
┌──────────────────────────────────────┐
│           LLAMANDO AHORA             │
│                                      │
│           CT-0023                    │
│      → acercate al mostrador         │
│                                      │
├──────────────────────────────────────┤
│ Próximos turnos:                     │
│   CT-0024                            │
│   CT-0025                            │
│   ST-0007                            │
│   ST-0008                            │
│                                      │
│ 10:42 hs   LAB ÁLAMOS — Centro       │
└──────────────────────────────────────┘
```

**Modo `empty`:** "Esperando pacientes" + hora + nombre de sucursal.
**Modo `closed`:** "CERRADO" + "Reabrimos a las HH:mm".
**Modo `loading`:** spinner centrado.

Cuando `connectionLost`, banner pequeño "⚠ Reconectando..." superpuesto al
layout actual (no bloqueante, sigue mostrando último snapshot).

## Manejo de errores

| Endpoint | Caso de error | Manejo frontend |
|---|---|---|
| `GET /sucursales/branches/{id}/totem-config` | 404 | **Silencioso**: success con `enabled=false` |
| ídem | 500/network | Toast + retry tras 5s, skeleton mientras tanto |
| `GET /turnos/queue?branchId` | 500/network | Polling silencioso reintenta; 3 fallos seguidos → banner "Sin conexión" |
| `POST /turnos/queue/{id}/call` | 409 (status != PENDING) | Toast "El turno ya fue completado o cancelado". Refresca queue. |
| ídem | 500/network | Toast. No reintenta. |
| `GET /turnos/appointments?branchId&date` | 500/network | Polling reintenta |
| `PUT /sucursales/branches/{id}/totem-config` | 403 | Toast "Sin permisos". Toggle vuelve al estado anterior. |
| ídem | 500/network | Toast. Toggle vuelve al estado anterior. |
| `GET /public/display/{slug}/{branch}/queue` | 404 | Pantalla full "URL inválida — verificar configuración" |
| ídem | 500/network | Banner discreto "Reconectando..." sobre último snapshot |

**Estado frontend:**

- `currentUser.branchId` no resuelto → mock dev hardcode `branchId=1` con
  warning en consola. Producción: redirige a `/profile` con toast.
- TV con URL incompleta → pantalla "URL inválida — falta tenantSlug/branchId".
- Beep bloqueado por autoplay del browser → try/catch en `audio.play()`,
  log warning, no rompe UI.

Reutiliza `MessageService` de PrimeNG. Para mapeo de errores backend, usa
un util compartido `api-error-mapper` en `core/` o `shared/`. Si Spec A
todavía no se mergeó cuando arranca Spec B, crearlo acá (es el mismo util
que Spec A define como `agenda-error-mapper` — coordinar para evitar
duplicación o renombrarlo si ya existe).

## UI admin del toggle "Tiene tótem"

**Decisión:** columna inline en `/sucursales/lista` con `p-inputSwitch`.

Razón: el módulo `sucursales` hoy no tiene form de edit/create (solo lista
placeholder). Esperar al CRUD completo bloquea la UX. La columna inline es
solución temporal — cuando aparezca el form de edit, el toggle se migra
allí y se borra de la lista.

**Comportamiento:**

- Toggle deshabilitado para roles distintos de `ADMINISTRADOR`.
- Cambio dispara `PUT /api/v1/sucursales/branches/{id}/totem-config` directo.
- En success: toast. En error: toggle vuelve al estado anterior + toast error.
- Sin store NgRx — estado local con signal en `sucursales.component`.

## Testing

> **Nota:** la implementación de tests es **delegable**. El plan que se
> escriba después de este spec marcará los bloques de testing como
> tareas separadas que se pueden asignar a otro miembro del equipo o
> diferir como follow-up post-merge.

Cobertura objetivo: **80%** en reducer, mapper y service (alineado con Spec A).
Component tests opcionales (smoke).

### Backend

| Archivo | Qué se testea |
|---|---|
| `BranchTotemConfigJpaMapperTest` | mapper bidireccional |
| `GetBranchTotemConfigUseCaseTest` | happy path + 404 cuando no existe |
| `UpsertBranchTotemConfigUseCaseTest` | create + update |
| `BranchTotemConfigControllerTest` | 200, 403, 404 |
| `CallQueueEntryUseCaseTest` | incrementa `callCount`, setea `lastCalledAt`, 409 si status != PENDING |
| `QueueControllerTest` | `POST /queue/{id}/call` → 200/409/404 |
| `PublicDisplayQueueControllerTest` | resuelve por tenantSlug, aísla por branch, **NO incluye PII en response**, 404 si slug/branch inválido |
| Migración V55 / V56 | smoke con `H2`/`@Sql`: tabla creada, columnas agregadas, FK válida |

### Frontend (NgRx)

| Archivo | Qué se testea |
|---|---|
| `queue.reducer.spec.ts` | cada action muta state correctamente |
| `queue.effects.spec.ts` | `loadQueue$` invoca service, `callQueueEntry$` redispatches `loadQueue` en success |
| `queue.selectors.spec.ts` | `entriesWithAppointment` y `entriesWalkIn` filtran correctamente |
| `appointments.reducer.spec.ts` + `effects.spec.ts` | ídem |
| `branch-totem-config.reducer.spec.ts` | success setea enabled, failure setea error |
| `branch-totem-config.effects.spec.ts` | **404 backend → dispatch Success con `enabled=false`** (caso crítico) |

### Frontend (servicios — smoke)

| Archivo | Qué se testea |
|---|---|
| `queue.service.spec.ts` | `list()` arma URL con `branchId`, `call()` POST a `/queue/{id}/call` |
| `branch-totem-config.service.spec.ts` | `getConfig()` GET correcto, `updateConfig()` PUT con body `{enabled}` |
| `public-display.service.spec.ts` | `fetchSnapshot()` arma URL correcta, **sin auth header** |
| `appointment.service.spec.ts` | `listToday()` con `branchId` + `date=YYYY-MM-DD` |

### Frontend (componentes — smoke selectivo)

| Archivo | Qué se testea |
|---|---|
| `recepcion.page.spec.ts` | renderiza sub-componente correcto según flag |
| `sala-espera.page.spec.ts` | `calledEntry`, `upcomingEntries`, `viewMode` con snapshots fixture |
| `recepcion-con-totem.component.spec.ts` | click "Llamar" dispatcha action |
| `recepcion-sin-totem.component.spec.ts` | botón walk-in navega sin params |

### E2E (Playwright)

Recomendado pero **NO obligatorio en Spec B**. Test sugerido para follow-up:
flujo CON tótem end-to-end (tótem registra → secretaria llama → TV destaca).

### Smoke manual obligatorio en PR

Checklist a firmar en la descripción del PR:

- [ ] Sucursal con tótem → recepción muestra 2 listados, "Llamar" funciona,
      TV destaca en ≤3 seg.
- [ ] Sucursal sin tótem → recepción muestra lista de appointments, botón
      walk-in navega a ATENCION sin params.
- [ ] Toggle en `/sucursales/lista` cambia el comportamiento sin reload.
- [ ] TV pierde conexión → banner aparece, sigue mostrando último snapshot,
      recupera solo.
- [ ] TV en sucursal sin tótem → URL `/turnos/sala-espera` (sidebar) no
      aparece; URL pública responde 404 o vacío según se decida.

## Dependencias y orden de implementación

### Mapa de dependencias

```
Backend B1 (branch_totem_config)  ─┐
Backend B2 (queue call tracking)   ├── Frontend services + stores
Backend B3 (public display)       ─┤
[opt] GET appointments? ───────────┘
   │
   ▼
Frontend: toggle inline (B1)
Frontend: pantalla recepción (B1+B2 [+appointments])
Frontend: pantalla TV (B3)
   │
   ▼
Smoke manual + PR
```

### Orden recomendado

**Fase 1 — Backend (paralelo entre sí):**

1. Migración V55 + módulo `branch_totem_config` completo.
2. Migración V56 + cambios en `QueueEntry` + endpoint `POST /queue/{id}/call`.
3. Verificación `tenantSlug` en `tenant` (agregar V57 si falta).
4. Verificación `GET /turnos/appointments` (agregar si falta).
5. Endpoint público `GET /public/display/{slug}/{branch}/queue` + config
   de SecurityFilterChain.

**Fase 2 — Frontend infraestructura:**

6. Modelos TypeScript.
7. Services HTTP.
8. Stores NgRx (los 3 slices nuevos).

**Fase 3 — Frontend pantallas:**

9. Toggle inline en `/sucursales/lista` (desbloquea testing manual).
10. Pantalla `/turnos/recepcion` (contenedor + 2 sub-componentes).
11. Pantalla `/display/{slug}/{branch}` (TV) + beep audio asset.
12. Sidebar update (link "Sala de espera" condicional).

**Fase 4 — Validación:**

13. Tests (delegable).
14. Smoke manual checklist del PR.
15. Crear ticket Jira via skill `jira-workflow` y abrir PR contra
    `feat/turnos-specs`.

### Paralelización (si hay segundo dev)

- **Vos:** backend (1-5) → frontend recepción (9-10) → smoke.
- **Compañero:** frontend TV (11) en paralelo a recepción, una vez que el
  endpoint público (5) esté listo.
- **Tests (13):** delegables a quien tenga ancho de banda.

### Definition of done

- Las 3 migraciones (V55, V56, V57 si fue necesaria) aplicadas en dev sin error.
- Toggle en `/sucursales/lista` funcional para roles permitidos.
- Sucursal con `enabled=true` → recepción muestra 2 listados; TV refresca
  destacado en ≤3s tras click "Llamar".
- Sucursal con `enabled=false` → recepción muestra lista de appointments;
  botón walk-in navega a ATENCION.
- TV en `/display/{slug}/{branch}` carga sin auth, sobrevive pérdida de
  conexión, recupera sola.
- Smoke checklist del PR firmado.
- (Opcional) Cobertura ≥80% en reducer/mapper/service de archivos nuevos.

## Branches

- **Frontend laboratorio:** `feat/turnos-specs` (existente).
- **Backend:** `feat/turnos-specs` (creado el 2026-05-20 desde `development`).

## Próximo paso

Invocar `superpowers:writing-plans` para descomponer este spec en un plan
de implementación con tareas chicas.
