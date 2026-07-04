# Notificaciones in-app + configuración por admin — Design

> **Fecha:** 2026-07-03
> **Repos:** Backend (`lab.laboratorio`) + FRONTEND-LABORATORIO
> **Base:** `development` (worktree nuevo; contiene urgencias, domicilio, financiero/liquidación, coverages/NBU ya mergeados)
> **Jira:** [KAN-176](https://exequielsantoro.atlassian.net/browse/KAN-176)

## 1. Objetivo

Dar vida a la campana del navbar (hoy con badge hardcodeado y TODOs en
`topbar.component.ts`) con notificaciones **in-app persistentes por usuario**, y
una pantalla de administración —**una tab nueva dentro de Empresa**— donde el
admin configura, para un catálogo de eventos preset que definimos nosotros,
**qué eventos están activos y quiénes los reciben** (usuarios puntuales y/o
roles). Cuando ocurre el evento de dominio, la notificación se dispara y le
llega solo a los destinatarios elegibles.

### Decisiones de alcance (cerradas en brainstorming)

- **Canal:** solo in-app (campana). Email/push quedan como follow-up.
- **Destinatarios:** mixto — por evento el admin puede tildar **usuarios
  puntuales y/o roles**.
- **Modelo de pertenencia:** la notificación **siempre está atada a un usuario**
  (`user_notifications.user_id`). La sucursal **no** es dueña de nada.
- **Filtro por sucursal:** aplica **solo** a la resolución del targeting por
  **rol** → un recipient de tipo ROL recibe únicamente si tiene ese rol **en la
  sucursal donde ocurrió el evento**. Los usuarios puntuales reciben siempre
  (la sucursal es redundante: el usuario "es" su sucursal).
- **Click en la notificación:** muestra un mensaje descriptivo con datos del
  evento y **navega al registro** (deep-link). Se marca leída al clickear.
- **Validación de acceso:** un destinatario solo es elegible si **puede navegar**
  a la sección destino del evento. Si no tiene acceso, no le llega (se filtra en
  el fan-out y se advierte en la UI de config).
- **Generación:** Modelo A — **fan-out en el momento del evento** (una fila
  `user_notifications` por usuario elegible).

## 2. Catálogo de eventos preset (v1)

Enum en código `NotificationEventType`. Cada valor lleva metadata: título /
plantilla de mensaje, patrón de ruta destino (deep-link) y **sección/módulo
requerido** para validar acceso.

| Evento | `NotificationEventType` | Origen del disparo | Estado del origen |
|---|---|---|---|
| Turno a domicilio asignado | `HOME_VISIT_ASSIGNED` | `HomeVisitAssignedEvent` (módulo `domicilio`) | ⚠️ **INERTE**: el módulo `domicilio` no está en `development` (PR #110 draft). Se declara en el catálogo pero sin trigger; se cablea al mergear domicilio |
| Liquidación informada | `SETTLEMENT_REPORTED` | `SettlementMutatedEvent` (módulo `financiero`) | ✅ ya se publica |
| Plan/convenio creado o modificado | `INSURER_PLAN_CHANGED` | `CreatePlanUseCase` / `CreateAgreementUseCase` + updates (módulo `coverages`) | ⚠️ **hay que agregar el punto de publicación** (hoy no emiten evento) |
| SLA de urgencia por vencer/vencido | `URGENT_SLA_AT_RISK` / `URGENT_SLA_BREACHED` | **job programado** (no es una mutación) | ⚠️ **nuevo `@Scheduled`** que escanea urgentes en curso |
| Cierre de caja del día | `CASH_BOX_CLOSED` | módulo caja | ⚠️ **la funcionalidad de caja NO existe hoy** → se declara en el catálogo pero queda **inerte** (sin disparo) hasta que exista |

### Notas de origen

- **SLA** es por tiempo, no una mutación discreta. Se resuelve con un job
  `@Scheduled` (cada ~1-2 min) que reusa el reloj `urgent_since` +
  `tenant_sla_config` (ya existentes, KAN-169). Emite `URGENT_SLA_AT_RISK` al
  cruzar **~80%** del SLA y `URGENT_SLA_BREACHED` al **100%**. El **dedup** del
  fan-out (ver §5) evita repetir en cada corrida del job.
  _Decisión a validar con el usuario: umbral 80% + vencido; se puede reducir a
  solo "vencido"._
- **Cierre de caja** y **plan/convenio** requieren agregar el punto de
  publicación (o esperar a que exista la feature de caja). El resto del sistema
  (dispatcher, fan-out, config, campana) es agnóstico al origen: sumar un evento
  nuevo = registrar un mapeo, sin tocar el core.

## 3. Modelo de datos (Backend, por tenant)

Tres tablas nuevas (Flyway; número exacto en el rango libre que corresponda al
mergear contra `development`, por las colisiones históricas de versión):

### `notification_event_settings`
Toggle on/off por evento del catálogo.
- `id` PK
- `tenant_id` (scoping por `TenantEntityListener`)
- `event_type` (enum, string)
- `enabled` (boolean, default false)
- unique `(tenant_id, event_type)`

### `notification_recipients`
Destinatarios configurados por evento (mezcla usuarios + roles).
- `id` PK
- `tenant_id`
- `event_type` (enum, string)
- `recipient_type` (`USER` | `ROLE`)
- `recipient_ref` (id de usuario, o código de rol)
- FK a `notification_event_settings` por `(tenant_id, event_type)` conceptual
- unique `(tenant_id, event_type, recipient_type, recipient_ref)`

### `user_notifications`
La bandeja real. Una fila por usuario elegible.
- `id` PK
- `tenant_id`
- `user_id` (destinatario)
- `event_type` (enum, string)
- `title` (texto, español)
- `message` (texto descriptivo con datos del evento, español)
- `target_route` (deep-link resuelto, ej. `/atenciones/123`)
- `target_entity_id` (para dedup y trazabilidad)
- `branch_id` (contexto del evento; informativo)
- `read_at` (nullable)
- `created_at`
- índices: `(tenant_id, user_id, read_at)`, `(tenant_id, user_id, event_type, target_entity_id)` para dedup

El **catálogo** de eventos vive en código (enum), no en tabla: metadata estática
(ruta, sección requerida, plantillas) no la administra el usuario.

## 4. Backend — módulo `notificaciones`

Nuevo módulo `modules/notificaciones` (hexagonal, como el resto), **siempre
activo** (no gateado por `ModuleCode`: es plataforma, no negocio togglable).

### 4.1 Dispatcher (traducción evento de dominio → catálogo)

`NotificationDispatcher` con `@EventListener` por cada evento de dominio
soportado (+ el job `@Scheduled` para SLA). Cada handler arma un
`NotificationContext { eventType, branchId, targetEntityId, targetRoute, title,
message }` y delega en el fan-out.

- Corre **después del commit** del evento de negocio
  (`@TransactionalEventListener(phase = AFTER_COMMIT)`) para no acoplar la
  transacción de negocio ni romperla si el fan-out falla.
- Si el fan-out lanza, se **loguea y se traga** (nunca tira el flujo original).

### 4.2 Fan-out

`NotificationFanoutService.dispatch(NotificationContext ctx)`:
1. **¿`enabled`?** Lee `notification_event_settings` para `(tenant, eventType)`.
   Si está off, corta.
2. **Resuelve destinatarios** desde `notification_recipients`:
   - `USER` → el usuario tal cual.
   - `ROLE` → todos los usuarios con ese rol **en `ctx.branchId`**
     (via `UserBranchAccessPort` / consulta de roles por sucursal).
   - Unión, deduplicada por `user_id`.
3. **Filtra por acceso:** descarta usuarios sin acceso a la sección/módulo
   requerido por `eventType` (misma fuente que usa el guard de navegación:
   `user_access_sections` / `UserBranchAccessPort`).
4. **Dedup** por `(user_id, event_type, target_entity_id)`: si ya existe una fila
   (leída o no) para esa terna, no inserta otra. Clave para que el job de SLA no
   duplique en cada corrida.
5. **Inserta** una fila `user_notifications` por usuario resultante.

### 4.3 Endpoints

Bandeja (usuario actual):
- `GET /api/notifications?unreadOnly={bool}` → `{ items: [...], unreadCount }`.
  Soporta **ETag/304** y se consume con `withPolling` desde el FE.
- `POST /api/notifications/{id}/read` → marca leída (solo dueño).
- `POST /api/notifications/read-all` → marca todas leídas del usuario.

Config (admin):
- `GET /api/notification-configs` → catálogo completo: por cada `eventType`,
  `{ enabled, recipients: { users: [...], roles: [...] } }`.
- `PUT /api/notification-configs/{eventType}` → set `enabled` + recipients
  (reemplaza el set). Valida que los recipients tengan acceso a la sección
  destino (rechaza o marca los inválidos).
- `GET /api/notification-configs/{eventType}/eligible` → usuarios y roles con
  acceso a la sección destino del evento (para poblar/validar el picker en la UI).

Seguridad: los endpoints de config requieren rol admin; la bandeja es del
usuario autenticado (nunca ve la de otro).

## 5. Frontend

### 5.1 Campana (`NotificationBellComponent`)

Reemplaza el badge hardcodeado y los TODOs en `topbar.component.ts`
(`ui-topbar__actions`). Feature NgRx clásico + `PollingService` (estándar del
proyecto, intervalo 5s, pausa en pestaña oculta, ETag/304 vía `withPolling`).

- **Badge** = `unreadCount` (oculto si 0).
- **Popover** (PrimeNG, como el de perfil) con la lista: no leídas resaltadas,
  cada ítem muestra `title` + `message` descriptivo + tiempo relativo.
- **Click** en un ítem → `POST read` + `router.navigate(target_route)` + cierra.
- Acción "Marcar todas como leídas".
- Estado vacío ("No tenés notificaciones").

Store: `notifications.reducer/effects/selectors` con polling (patrón
`withPolling` + `isNotModified`, sin `*Success` en 304).

### 5.2 Tab de configuración (Empresa → Notificaciones)

Nueva tab en `empresa-dashboard.component.ts` (junto a Usuarios / White-label /
Módulos / Fiscal / Email) y ruta `notificaciones` en `empresa.routes.ts`.

`NotificacionesConfigPage`: una fila/card por evento del catálogo, cada una con:
- Nombre + descripción del evento.
- **Toggle enable/disable**.
- **Editor de destinatarios**: multi-select de **usuarios** + multi-select de
  **roles**. Los que no tienen acceso a la sección destino se marcan con warning
  (icono PrimeIcons + tooltip en español) y no se pueden agregar (o se agregan
  deshabilitados, según decisión de UI en el plan).
- Eventos "inertes" (ej. cierre de caja sin feature de caja) se muestran con una
  nota de "próximamente / sin origen aún" y el toggle deshabilitado.

Feature NgRx `empresa/notificaciones-config` (reducer/effects/selectors).

## 6. Errores, i18n y no-leak

- Todos los mensajes de UI en **español**, user-friendly, **sin leak** de
  internals (regla #4 del CLAUDE.md). Íconos vía **PrimeIcons**, no emojis.
- El fan-out **nunca** rompe el flujo de negocio: error → log, no excepción
  propagada.
- Contenido de `title`/`message` se arma en el backend con plantillas en
  español y datos del evento (nombre de paciente, N° de turno, etc. según
  corresponda), evitando PII innecesaria.

## 7. Testing

- **Backend:** fan-out (resolución rol→usuarios por sucursal, unión con usuarios
  puntuales, filtro de acceso, dedup), dispatcher (mapeo evento→contexto),
  endpoints (bandeja del usuario correcto, seguridad admin en config, ETag/304),
  boot MySQL con las migraciones nuevas.
- **Frontend:** reducers/effects/selectors de la campana y de la config, smoke
  de las páginas, guard/seguridad de la tab admin.

## 8. Fuera de alcance (follow-ups)

- Email / push del navegador.
- Preferencias de "mute" por usuario final (hoy lo controla el admin vía
  recipients).
- Origen real de **cierre de caja** (depende de que exista la feature de caja).
- Retención/archivado automático de notificaciones viejas (se puede sumar como
  job de limpieza después).
- Agrupación/colapso de notificaciones repetidas más allá del dedup por entidad.

## 9. Decisiones cerradas (confirmadas 2026-07-03)

1. **SLA:** avisa **al 80%** (`URGENT_SLA_AT_RISK`, "por vencer") **y al 100%**
   (`URGENT_SLA_BREACHED`, "vencido").
2. **Cierre de caja:** se declara `CASH_BOX_CLOSED` en el catálogo pero queda
   **inerte** (sin origen de disparo) hasta que exista la feature de caja.
3. **Recipients sin acceso:** se **bloquean en el picker** de la UI (no se pueden
   agregar) **y** se filtran en el fan-out del backend como red de seguridad.
