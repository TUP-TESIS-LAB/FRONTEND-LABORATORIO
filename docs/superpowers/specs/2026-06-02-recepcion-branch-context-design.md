# Recepción + Contexto de Sucursal — Design

> **Jira:** [KAN-73](https://exequielsantoro.atlassian.net/browse/KAN-73)
> **Repo:** FRONTEND-LABORATORIO
> **Scope:** Sub-proyecto A del backlog del 2026-06-02 (items 1+2+3)
> **Estado:** Diseño aprobado, listo para plan de implementación

---

## 1. Contexto

La pantalla de Recepción (`recepcion-con-totem.component`) hoy muestra dos tablas separadas — "Con turno" y "Sin turno" — y no expone visualmente cuál sucursal está mirando el operador. El backend ya soporta el filtrado por sucursal y la diferenciación CT/ST en el `publicCode` (prefijo "CT-" o "ST-" generado en `RegisterQueueEntryUseCase`), pero el frontend no aprovecha ninguna de las dos cosas.

Este diseño consolida la cola en una sola tabla con diferenciador visual sutil, agrega un drawer lateral con los turnos programados del día, y expone la sucursal activa del operador como badge read-only en el topbar.

**No requiere cambios de backend.** Se reutilizan endpoints existentes:
- `GET /api/v1/turnos/queue?branchId=X` (`GetQueueByBranchUseCase`)
- `GET /api/v1/turnos/appointments?branchId=X&date=YYYY-MM-DD` (`ListAppointmentsUseCase`)
- `GET /api/v1/sucursales/public` (público, sin auth)

---

## 2. Decisiones de producto

| # | Decisión | Razón |
|---|----------|-------|
| 1 | Una sola tabla combinada en lugar de dos cards | La secretaria atiende por orden de llegada real; tener dos tablas obliga a saltar entre ellas. |
| 2 | Distinguidor visual: prefijo del code (CT-/ST-) + color de fila sutil para ST-* | El prefijo ya existe en el dato; el color sutil refuerza la lectura sin agregar columna. |
| 3 | Drawer togglable sin persistencia | Consulta ocasional; persistir preferencia es over-engineering. |
| 4 | Drawer carga snapshot al abrir + botón "refrescar" | Polling automático no se justifica (turnos no cambian seguido); refresh manual cubre el caso de cancelaciones. |
| 5 | Cancelados visibles en drawer con badge atenuado | La secretaria debe saber que un turno agendado no vendrá. |
| 6 | Click en fila del drawer = no-op | El anuncio se hace por tótem o por acción manual existente; no duplicamos flows. |
| 7 | Badge sucursal read-only + tooltip "pedile al admin" | Regla de negocio: el staff no cambia su propia sucursal. |
| 8 | Fallback temporal: primera sucursal del tenant si no hay asignada | El backend que asigna sucursal por usuario lo está desarrollando otro dev en paralelo; este fallback permite avanzar sin bloquearse. Se elimina cuando ese backend esté. |

---

## 3. Arquitectura

### 3.1 Componentes nuevos

| Archivo | Responsabilidad |
|---------|----------------|
| `core/branch/branch-bootstrap.service.ts` | Al boot, si `OperatorBranchContextService.branchId()` es null, llama `GET /api/v1/sucursales/public` y setea la primera. |
| `layout/topbar/branch-badge.component.ts` | Chip PrimeNG en topbar arriba-derecha, lee `branchName` del context, tooltip on-hover. |
| `features/turnos/components/scheduled-appointments-drawer.component.ts` | `p-drawer` position="right", lista filas Hora + Paciente + Estado, botón "Refrescar". |
| `features/turnos/store/scheduled-appointments/` | Feature NgRx: actions / reducer / effects / selectors. |
| `features/turnos/services/scheduled-appointments.service.ts` | HTTP service contra `ListAppointmentsUseCase`. |

### 3.2 Componentes modificados

| Archivo | Cambio |
|---------|--------|
| `features/turnos/services/operator-branch.context.ts` | Agregar señal `branchName`. Persistir `{id, name}` como JSON en localStorage key `turnos.operatorBranch`. |
| `features/turnos/store/queue/queue.selectors.ts` | Crear `selectQueueEntriesAll` que combine los dos selectors existentes ordenados por timestamp de arribo. Los selectors viejos quedan disponibles pero deprecados. |
| `features/turnos/store/queue/queue.effects.ts` | `loadQueue$` lee `branchId` del context si la action no lo trae. Si el context lo da null, no dispatcha (log warn). |
| `features/turnos/pages/recepcion/recepcion-con-totem.component.ts` | Reemplazar `withAppointment()` + `walkIn()` por `all()`. Quitar `@Input branchId` (ahora viene del context). Agregar estado `drawerOpen` + toggle. |
| `features/turnos/pages/recepcion/recepcion-con-totem.component.html` | Una `<p-card>` con tabla única. `[styleClass]` condicional por fila (`row.publicCode.startsWith('ST') ? 'row-st' : ''`). Botón toggle del drawer + integración del component. |
| `features/turnos/pages/recepcion/recepcion-con-totem.component.scss` | `.row-st { background-color: rgba(255, 165, 0, 0.05); }`. |
| `app.config.ts` o equivalente | Registrar `BranchBootstrapService` en `APP_INITIALIZER`. |

### 3.3 Componentes que no se tocan

- `operator-branch-fab.component.ts` — queda como dev tool.
- `recepcion-sin-totem.component.ts` — fuera de scope.
- Backend entero.

---

## 4. Data flow

### 4.1 Bootstrap

1. `APP_INITIALIZER` dispara `BranchBootstrapService.init()`.
2. Si `context.branchId()` es no-null, resolve inmediato.
3. Si es null, `GET /api/v1/sucursales/public` → toma `branches[0]` → `context.setBranch(id, name)` → resolve.
4. Si la llamada falla o devuelve `[]`, log error, context queda null, las pantallas dependientes muestran fallback.

### 4.2 Lista de turnos

1. `RecepcionConTotemComponent.ngOnInit()` lee `branchId` del context.
2. Si null → no dispatcha; UI muestra mensaje "Sin sucursal asignada".
3. Si presente → `dispatch(loadQueue({ branchId }))` + `interval(5s)` para refresh.
4. `queue.effects.loadQueue$` → `GET /api/v1/turnos/queue?branchId=X` → `loadQueueSuccess(entries[])`.
5. `selectQueueEntriesAll` combina los dos arrays internos del state y ordena por arrival timestamp.
6. Component renderiza con `[styleClass]` por fila según prefijo del code.

### 4.3 Drawer

1. Click en botón "Turnos del día" → `drawerOpen.set(true)`.
2. Si primera apertura del día → `dispatch(loadScheduledAppointments({ branchId, date: today }))`.
3. Si reapertura mismo día → usa el state cacheado.
4. Botón "Refrescar" en el drawer → fuerza re-dispatch con la misma action.
5. `scheduled-appointments.effects` → `GET /api/v1/turnos/appointments?branchId=X&date=Y` → `loadScheduledAppointmentsSuccess(appointments[])`.
6. Selector con projection produce `{hora, fullName, estado}` por fila.

### 4.4 Estado derivado de cada cita en drawer

El backend devuelve `Appointment` + `Patient`. El estado de UI se deriva en el selector:

| Estado UI | Regla |
|-----------|-------|
| **Cancelado** | `appointment.status === CANCELED` |
| **Llegó** | existe `QueueEntry` en el state actual con `appointmentId === appointment.id` |
| **Pendiente** | resto |

Esto requiere que el selector tenga acceso al state de queue. Se hace con `createSelector` combinando ambas feature slices.

### 4.5 Badge sucursal

`BranchBadgeComponent` lee `context.branchName()` como signal. Cualquier cambio (bootstrap, FAB de dev) re-renderiza automáticamente. Si null → chip "Sin sucursal" con severity warn.

---

## 5. Manejo de errores

| Caso | UX |
|------|-----|
| `GET /sucursales/public` falla en bootstrap | Toast error genérico. Context queda null. Badge muestra "Sin sucursal". Pantallas con fallback. |
| `GET /turnos/queue` falla | Toast error. Tabla muestra `emptymessage` con "Error al cargar la cola". Polling sigue activo (puede recuperar). |
| `GET /turnos/appointments` falla | Toast error en el drawer. Drawer muestra "Error al cargar turnos. [Reintentar]" con botón. |
| `branchId === null` permanente | Tabla y drawer no dispatchan. Mensajes claros en cada pantalla. |
| `Date` cambia mientras drawer está abierto (medianoche) | Out of scope para esta iteración. Refresh manual lo cubre. |

Todos los toasts usan el `NotificationService` existente del repo. Mensajes en español, sin leak de internals.

---

## 6. Testing

Nivel: smoke + unit donde hay lógica.

| Tipo | Qué cubre |
|------|-----------|
| Unit selector | `selectQueueEntriesAll` — merge correcto, orden por timestamp, casos vacíos en ambos arrays. |
| Unit selector | Selector de estado derivado del drawer — proyecta correctamente Pendiente/Llegó/Cancelado. |
| Unit effect | `BranchBootstrapService.init()` — happy path, lista vacía, error HTTP. |
| Unit effect | `queue.effects.loadQueue$` — usa branchId del context cuando la action no lo trae, no dispatcha si null. |
| Unit effect | `scheduled-appointments.effects` — happy path, error HTTP. |
| Smoke | `BranchBadgeComponent` — renderiza nombre, muestra fallback si null, tooltip presente. |
| Smoke | `ScheduledAppointmentsDrawerComponent` — abre/cierra, refresh dispara dispatch. |
| Smoke | `RecepcionConTotemComponent` — tabla renderiza fila CT/ST con clases correctas. |

No se hacen tests de integración ni e2e en esta iteración.

---

## 7. Mockup final

```
DRAWER CERRADO:
┌─ Topbar ──────────────────────────────────────────[ 📍 Central ]─┐
│ Recepción                          [📅 Turnos del día] ← toggle  │
├──────────────────────────────────────────────────────────────────┤
│ ┌─ Cola de espera ─────────────────────────────────────────────┐ │
│ │ Código   | DNI       | Llamadas | Acciones                  │ │
│ │ CT-0001  | 12345678  |          | [Llamar] [Atender]        │ │
│ │ ST-0001  |           | 1        | [Llamar] [Atender]  ← gris│ │
│ │ CT-0002  | 11223344  |          | [Llamar] [Atender]        │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

DRAWER ABIERTO:
┌─ Topbar ──────────────────────────────────────────[ 📍 Central ]─┐
│ Recepción                          [📅 Turnos del día]           │
├──────────────────────────────────────────────┬───────────────────┤
│ ┌─ Cola de espera ─────────────────────────┐ │ Turnos hoy   [↻] │
│ │ Código   | DNI       | Llamadas | ...    │ │ ───────────────  │
│ │ CT-0001  | 12345678  |          | ...    │ │ 09:00 Juan P.    │
│ │ ST-0001  |           | 1        | ...    │ │   [Llegó]        │
│ │ CT-0002  | 11223344  |          | ...    │ │ 09:30 María L.   │
│ └──────────────────────────────────────────┘ │   [Pendiente]    │
│                                              │ 10:00 Carlos D.  │
│                                              │   [Cancelado]    │
└──────────────────────────────────────────────┴───────────────────┘
```

---

## 8. Lo que queda fuera

- Asignación de sucursal por usuario en backend (otro dev en paralelo). Cuando esté, se reemplaza `BranchBootstrapService` y `OperatorBranchContextService` por lectura del user session.
- `recepcion-sin-totem.component` — usa el mismo modelo de listas separadas pero no se toca esta iteración.
- Filtros adicionales sobre la tabla (búsqueda por DNI, ordenamiento manual) — no pedidos.
- Marcar manualmente un turno como "llegado" desde el drawer — decisión explícita: no.
- Polling automático del drawer — decisión explícita: no.

---

## 9. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| El backend del compañero llega y rompe el `OperatorBranchContextService` | El cambio será chico (1 archivo, 1 línea). Coordinar el handoff antes del merge de su PR. |
| `selectQueueEntriesAll` puede tener race conditions si las dos slices se actualizan en orden distinto | `createSelector` con memoization correcto + tests del selector. |
| El user con la tabla abierta cuando cambia el día no ve el refresh del drawer | Aceptado — refresh manual lo cubre y el caso es marginal. |

---

## 10. Definición de hecho

- [ ] Una sola tabla en recepción muestra CT + ST con prefijo y color sutil
- [ ] Filas ST tienen `background-color` apenas distinto al hover y default
- [ ] Drawer abre/cierra desde botón en el header de la página
- [ ] Drawer muestra turnos del día con estado derivado correcto
- [ ] Botón "Refrescar" dentro del drawer dispara re-dispatch
- [ ] Badge sucursal en topbar visible siempre que hay branch seteado
- [ ] Badge muestra "Sin sucursal" + tooltip explicativo si no hay branch
- [ ] Bootstrap setea primera sucursal si no hay una asignada
- [ ] Tests unitarios de los 2 selectors nuevos y los 3 effects
- [ ] Tests smoke de los 3 componentes nuevos
- [ ] Sin cambios de backend
