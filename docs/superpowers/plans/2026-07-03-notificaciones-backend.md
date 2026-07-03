# Notificaciones in-app — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Spec:** `docs/superpowers/specs/2026-07-03-notificaciones-in-app-design.md`
> **Jira:** [KAN-176](https://exequielsantoro.atlassian.net/browse/KAN-176)

**Goal:** Backend del sistema de notificaciones in-app: catálogo de eventos, config por admin (enabled + destinatarios usuarios/roles), fan-out por evento de dominio hacia una bandeja por usuario, y endpoints polleables para la campana.

**Architecture:** Nuevo módulo hexagonal `modules/notificaciones` (siempre activo). Eventos-trigger dedicados se publican en el momento exacto del negocio (`@TransactionalEventListener(AFTER_COMMIT)`); un `NotificationFanoutService` resuelve destinatarios (usuarios puntuales + roles→usuarios en la sucursal del evento), filtra por acceso a la sección destino, deduplica e inserta una fila `user_notifications` por usuario. La bandeja y la config se exponen por REST con ETag/304 (regla #5).

**Tech Stack:** Spring Boot, JPA/Hibernate, Flyway, Caffeine (EtagCache/EtagSupport), JUnit + Mockito, MySQL (boot) / H2 (tests). Java 21.

## Global Constraints

- **Base:** worktree nuevo off `development` (contiene urgencias/domicilio/financiero/coverages).
- **Arquitectura por capas:** `domain` sin Spring/JPA; `application` casos de uso; `infrastructure` JPA/adapters/Flyway; `presentation` controllers/DTOs. Un módulo no toca entidades/repos de otro módulo — el cruce es por **puerto**.
- **Tenancy:** entidades de negocio extienden `BaseJpaEntity` (auto-setea `tenantId` vía `TenantEntityListener` — **no** setear `tenantId` a mano). Soft-delete con `deletedAt` + `active`.
- **Errores (regla #4):** todo mensaje client-facing en español, user-friendly, sin leak de internals. Handlers nuevos con test no-leak.
- **Tiempo real (regla #5):** endpoints polleables soportan `If-None-Match`/`304`, ETag cacheado en `EtagCache`, invalidado al mutar. Nada de SSE/WebSocket.
- **Flyway:** usar el próximo rango libre coordinando con `development` (número exacto al mergear, por colisiones históricas). En este plan se usan placeholders `Vxxx` — **fijar el número real como primer paso de la Task 1**.
- **Roles** son filas en tabla `roles` (columna `code`), NO enum Java. Valores: `ADMINISTRADOR, SECRETARIA, RESPONSABLE_SECRETARIA, FACTURISTA, TECNICO_LABORATORIO, BIOQUIMICO, MANAGER_STOCK, EXTRACTOR, EXTERNO, SAAS_ADMIN`.
- **Secciones de acceso:** enum `lab.laboratorio.shared.access.AccessSection` (`RECEPCION, PACIENTES, AGENDAS, MEDICOS, PREANALITICA, ANALITICA, POSTANALITICA, EXTRACCIONES, EMPRESA, SUCURSALES, OBRAS_SOCIALES, FINANCIERO, STOCK, DOMICILIO, DOMICILIO_RUTA`).

## File Structure

Nuevo paquete raíz `lab.laboratorio.modules.notificaciones`:

```
domain/
  model/NotificationEventType.java        # enum catálogo + metadata (sección, ruta, títulos)
  model/RecipientType.java                # USER | ROLE
  model/UserNotification.java             # modelo de una notificación
  model/NotificationEventSetting.java     # enabled por evento
  model/NotificationRecipient.java        # (eventType, type, ref)
  model/NotificationContext.java          # payload que arma el dispatcher
  port/UserNotificationRepositoryPort.java
  port/NotificationConfigRepositoryPort.java
  event/HomeVisitAssignedEvent.java       # evento-trigger dedicado
  event/SettlementReportedEvent.java
  event/InsurerPlanChangedEvent.java
application/
  RecipientResolver.java                  # roles→usuarios en sucursal + unión + filtro acceso
  NotificationFanoutService.java          # enabled? resolve, dedup, insert
  NotificationDispatcher.java             # @TransactionalEventListener → arma contexto → fanout
  UrgentSlaNotificationScheduler.java     # @Scheduled SLA
  usecase/ListMyNotificationsUseCase.java
  usecase/MarkNotificationReadUseCase.java
  usecase/MarkAllNotificationsReadUseCase.java
  usecase/GetNotificationConfigUseCase.java
  usecase/UpdateNotificationConfigUseCase.java
  usecase/ListEligibleRecipientsUseCase.java
infrastructure/
  persistence/entity/{UserNotificationJpaEntity,NotificationEventSettingJpaEntity,NotificationRecipientJpaEntity}.java
  persistence/repository/{...JpaRepository}.java
  persistence/adapter/{UserNotificationJpaAdapter,NotificationConfigJpaAdapter}.java
  cache/NotificationEtagKeys.java         # keys + invalidación
presentation/
  NotificationController.java             # bandeja del usuario
  NotificationConfigController.java       # admin
  dto/{...}.java
```

Puertos que se agregan/extienden en `modules/empresa` (dueño de users/roles/branches):
- `UserRepositoryPort.findActiveByRoleCodeAndBranch(...)` / `findActiveByRoleCode(...)` (ya existen en `UserJpaRepository`; exponerlos por puerto si falta).
- `UserAccessSectionRepositoryPort.findSectionsByUser(tenantId, userId)` (ya existe).

---

### Task 1: Migraciones Flyway (3 tablas)

**Files:**
- Create: `src/main/resources/db/migration/Vxxx__notifications_tables.sql`
- Create (si el proyecto separa MySQL/H2): `src/main/resources/db/migration-local/Vxxx__notifications_tables.sql` (ver `reference_migrations-h2-vs-mysql`)

**Interfaces:**
- Produces: tablas `notification_event_settings`, `notification_recipients`, `user_notifications`.

- [ ] **Step 1: Fijar el número de versión.** El worktree ya está sobre `origin/development` (última migración `V1067`). **Usar `V1068`.** Reemplazar `Vxxx` → `V1068` en los nombres de archivo. (Re-verificar con `ls src/main/resources/db/migration | sort -V | tail -3` por si entró algo nuevo antes de arrancar.)

- [ ] **Step 2: Escribir la migración.**

```sql
-- Vxxx__notifications_tables.sql
CREATE TABLE notification_event_settings (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id    BIGINT       NOT NULL,
    event_type   VARCHAR(64)  NOT NULL,
    enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NULL,
    updated_at   TIMESTAMP    NULL,
    created_by   VARCHAR(255) NULL,
    updated_by   VARCHAR(255) NULL,
    deleted_at   TIMESTAMP    NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    version      BIGINT       NULL,
    CONSTRAINT uq_notif_setting UNIQUE (tenant_id, event_type)
);

CREATE TABLE notification_recipients (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id      BIGINT       NOT NULL,
    event_type     VARCHAR(64)  NOT NULL,
    recipient_type VARCHAR(8)   NOT NULL,   -- USER | ROLE
    recipient_ref  VARCHAR(64)  NOT NULL,   -- userId (num) o role code
    created_at   TIMESTAMP    NULL,
    updated_at   TIMESTAMP    NULL,
    created_by   VARCHAR(255) NULL,
    updated_by   VARCHAR(255) NULL,
    deleted_at   TIMESTAMP    NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    version      BIGINT       NULL,
    CONSTRAINT uq_notif_recipient UNIQUE (tenant_id, event_type, recipient_type, recipient_ref)
);

CREATE TABLE user_notifications (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id        BIGINT       NOT NULL,
    user_id          BIGINT       NOT NULL,
    event_type       VARCHAR(64)  NOT NULL,
    title            VARCHAR(160) NOT NULL,
    message          VARCHAR(500) NOT NULL,
    target_route     VARCHAR(300) NULL,
    target_entity_id BIGINT       NULL,
    branch_id        BIGINT       NULL,
    read_at          TIMESTAMP    NULL,
    created_at   TIMESTAMP    NULL,
    updated_at   TIMESTAMP    NULL,
    created_by   VARCHAR(255) NULL,
    updated_by   VARCHAR(255) NULL,
    deleted_at   TIMESTAMP    NULL,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    version      BIGINT       NULL,
    INDEX idx_user_notif_inbox (tenant_id, user_id, read_at),
    INDEX idx_user_notif_dedup (tenant_id, user_id, event_type, target_entity_id)
);
```

- [ ] **Step 3: Verificar boot MySQL.** Seguir `reference_mysql-boot-verification`: levantar perfil `local` contra un schema fresco y confirmar que Flyway aplica sin error. Esperado: log `Successfully applied 1 migration` y la app bootea.

- [ ] **Step 4: Commit.**

```bash
git add src/main/resources/db/migration/Vxxx__notifications_tables.sql
git commit -m "feat(notificaciones): tablas de config y bandeja de notificaciones"
```

---

### Task 2: Enum catálogo `NotificationEventType`

**Files:**
- Create: `.../notificaciones/domain/model/NotificationEventType.java`
- Test: `src/test/java/.../notificaciones/domain/model/NotificationEventTypeTest.java`

**Interfaces:**
- Produces:
  - `enum NotificationEventType`
  - `AccessSection requiredSection()`
  - `String routeTemplate()` — con `{id}` para interpolar la entidad
  - `String defaultTitle()`
  - `boolean hasTrigger()` — false para `CASH_BOX_CLOSED` (inerte)

- [ ] **Step 1: Test del catálogo.**

```java
class NotificationEventTypeTest {
    @Test void everyEventHasSectionTitleAndRoute() {
        for (var t : NotificationEventType.values()) {
            assertThat(t.requiredSection()).isNotNull();
            assertThat(t.defaultTitle()).isNotBlank();
            assertThat(t.routeTemplate()).isNotBlank();
        }
    }
    @Test void cashBoxIsInert() {
        assertThat(NotificationEventType.CASH_BOX_CLOSED.hasTrigger()).isFalse();
    }
    @Test void homeVisitTargetsDomicilioRoute() {
        assertThat(NotificationEventType.HOME_VISIT_ASSIGNED.requiredSection())
            .isEqualTo(AccessSection.DOMICILIO_RUTA);
    }
}
```

- [ ] **Step 2: Run test → FAIL** (`NotificationEventType` no existe). `./mvnw -Dtest=NotificationEventTypeTest test`

- [ ] **Step 3: Implementar el enum.**

```java
package lab.laboratorio.modules.notificaciones.domain.model;

import lab.laboratorio.shared.access.AccessSection;

public enum NotificationEventType {
    HOME_VISIT_ASSIGNED (AccessSection.DOMICILIO_RUTA, "/domicilio/mi-ruta",           "Nuevo turno a domicilio asignado", false), // INERTE: el módulo domicilio no está en development (PR #110 draft). Poner hasTrigger=true + wire del publish point cuando domicilio se mergee.
    URGENT_SLA_AT_RISK  (AccessSection.EXTRACCIONES,   "/atencion/urgentes-en-curso",  "Urgencia por vencer su tiempo",    true),
    URGENT_SLA_BREACHED (AccessSection.EXTRACCIONES,   "/atencion/urgentes-en-curso",  "Urgencia vencida",                 true),
    SETTLEMENT_REPORTED (AccessSection.FINANCIERO,     "/financiero/liquidaciones/{id}","Se informó una liquidación",      true),
    INSURER_PLAN_CHANGED(AccessSection.OBRAS_SOCIALES, "/obras-sociales",              "Cambió un plan/convenio",          true),
    CASH_BOX_CLOSED     (AccessSection.FINANCIERO,     "/financiero/caja",             "Se cerró la caja del día",         false);

    private final AccessSection requiredSection;
    private final String routeTemplate;
    private final String defaultTitle;
    private final boolean hasTrigger;

    NotificationEventType(AccessSection s, String route, String title, boolean hasTrigger) {
        this.requiredSection = s; this.routeTemplate = route; this.defaultTitle = title; this.hasTrigger = hasTrigger;
    }
    public AccessSection requiredSection() { return requiredSection; }
    public String routeTemplate() { return routeTemplate; }
    public String defaultTitle()  { return defaultTitle; }
    public boolean hasTrigger()   { return hasTrigger; }
}
```

> **Nota de verificación:** las rutas (`routeTemplate`) deben coincidir con rutas reales del router del frontend. Confirmar contra el `*.routes.ts` correspondiente al construir el FE (plan frontend). Si una ruta aún no existe (p. ej. urgentes-en-curso), ajustar acá.

- [ ] **Step 4: Run test → PASS.**

- [ ] **Step 5: Commit.** `git commit -m "feat(notificaciones): catálogo NotificationEventType con sección y ruta destino"`

---

### Task 3: Modelos de dominio + puertos

**Files:**
- Create: `domain/model/RecipientType.java`, `UserNotification.java`, `NotificationEventSetting.java`, `NotificationRecipient.java`, `NotificationContext.java`
- Create: `domain/port/UserNotificationRepositoryPort.java`, `NotificationConfigRepositoryPort.java`

**Interfaces:**
- Produces (records inmutables + puertos):

```java
public enum RecipientType { USER, ROLE }

// Una notificación materializada.
public record UserNotification(
    Long id, Long userId, NotificationEventType eventType,
    String title, String message, String targetRoute, Long targetEntityId,
    Long branchId, java.time.Instant readAt, java.time.Instant createdAt) {}

public record NotificationEventSetting(NotificationEventType eventType, boolean enabled) {}

public record NotificationRecipient(NotificationEventType eventType, RecipientType type, String ref) {}

// Lo que arma el dispatcher para disparar el fan-out.
public record NotificationContext(
    NotificationEventType eventType, Long branchId, Long targetEntityId,
    String title, String message) {}
```

```java
public interface UserNotificationRepositoryPort {
    java.util.List<UserNotification> findInbox(Long tenantId, Long userId, boolean unreadOnly);
    long countUnread(Long tenantId, Long userId);
    boolean existsForDedup(Long tenantId, Long userId, NotificationEventType type, Long targetEntityId);
    void saveAll(Long tenantId, java.util.List<UserNotification> notifications);
    boolean markRead(Long tenantId, Long userId, Long notificationId);   // false si no es del usuario
    int markAllRead(Long tenantId, Long userId);
}

public interface NotificationConfigRepositoryPort {
    boolean isEnabled(Long tenantId, NotificationEventType type);
    java.util.List<NotificationRecipient> findRecipients(Long tenantId, NotificationEventType type);
    java.util.Map<NotificationEventType, Boolean> findAllSettings(Long tenantId);
    java.util.List<NotificationRecipient> findAllRecipients(Long tenantId);
    void upsertSetting(Long tenantId, NotificationEventType type, boolean enabled);
    void replaceRecipients(Long tenantId, NotificationEventType type, java.util.List<NotificationRecipient> recipients);
}
```

- [ ] **Step 1: Escribir los records + interfaces** (código completo arriba). No requieren test propio (son estructuras); se cubren vía los tests de fanout/adapter.

- [ ] **Step 2: Compilar.** `./mvnw compile` → PASS.

- [ ] **Step 3: Commit.** `git commit -m "feat(notificaciones): modelos de dominio y puertos"`

---

### Task 4: Persistencia JPA (entidades + repos + adapters)

**Files:**
- Create: `infrastructure/persistence/entity/{UserNotificationJpaEntity,NotificationEventSettingJpaEntity,NotificationRecipientJpaEntity}.java`
- Create: `infrastructure/persistence/repository/{UserNotificationJpaRepository,NotificationEventSettingJpaRepository,NotificationRecipientJpaRepository}.java`
- Create: `infrastructure/persistence/adapter/{UserNotificationJpaAdapter,NotificationConfigJpaAdapter}.java`
- Test: `src/test/java/.../notificaciones/infrastructure/persistence/UserNotificationJpaAdapterTest.java` (@DataJpaTest, H2)

**Interfaces:**
- Consumes: `BaseJpaEntity` (campos id/tenantId/active/deletedAt/version auto). Modelar entidades siguiendo `UserBranchJpaEntity` como patrón (extends `BaseJpaEntity`, `@SuperBuilder`, `@Table`).
- Produces: implementaciones de `UserNotificationRepositoryPort` y `NotificationConfigRepositoryPort`.

- [ ] **Step 1: Entidades JPA.** Cada una extiende `BaseJpaEntity`. Ejemplo (repetir el patrón para las 3):

```java
@Entity @Table(name = "user_notifications")
@Getter @Setter @SuperBuilder @NoArgsConstructor @AllArgsConstructor
public class UserNotificationJpaEntity extends BaseJpaEntity {
    @Column(nullable = false) private Long userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 64)
    private NotificationEventType eventType;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 500) private String message;
    @Column(length = 300) private String targetRoute;
    private Long targetEntityId;
    private Long branchId;
    private java.time.Instant readAt;
}
```
`NotificationEventSettingJpaEntity`: `eventType` (enum string), `boolean enabled`.
`NotificationRecipientJpaEntity`: `eventType` (enum string), `@Enumerated(STRING) RecipientType recipientType`, `String recipientRef`.

- [ ] **Step 2: Repositorios Spring Data.**

```java
public interface UserNotificationJpaRepository extends JpaRepository<UserNotificationJpaEntity, Long> {
    List<UserNotificationJpaEntity> findByTenantIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(Long tenantId, Long userId);
    List<UserNotificationJpaEntity> findByTenantIdAndUserIdAndReadAtIsNullAndActiveTrueOrderByCreatedAtDesc(Long tenantId, Long userId);
    long countByTenantIdAndUserIdAndReadAtIsNullAndActiveTrue(Long tenantId, Long userId);
    boolean existsByTenantIdAndUserIdAndEventTypeAndTargetEntityIdAndActiveTrue(Long tenantId, Long userId, NotificationEventType t, Long targetEntityId);
    Optional<UserNotificationJpaEntity> findByIdAndTenantIdAndUserId(Long id, Long tenantId, Long userId);
    @Modifying @Query("update UserNotificationJpaEntity n set n.readAt = :now where n.tenantId=:t and n.userId=:u and n.readAt is null and n.active=true")
    int markAllRead(Long t, Long u, java.time.Instant now);
}
```
`NotificationEventSettingJpaRepository`: `Optional<...> findByTenantIdAndEventType(...)`, `List<...> findByTenantIdAndActiveTrue(...)`.
`NotificationRecipientJpaRepository`: `List<...> findByTenantIdAndEventTypeAndActiveTrue(...)`, `List<...> findByTenantIdAndActiveTrue(...)`, `@Modifying` soft-delete por `(tenant,eventType)`.

- [ ] **Step 3: Adapters** (mapean entity↔record; `markRead` valida ownership vía `findByIdAndTenantIdAndUserId`). `existsForDedup` delega en el `existsBy...` del repo. `saveAll` construye entidades sin setear `tenantId` (lo pone `TenantEntityListener`).

- [ ] **Step 4: Test @DataJpaTest** del adapter de bandeja:

```java
@DataJpaTest
class UserNotificationJpaAdapterTest {
    // given: inserto 2 notificaciones para user 7 (una leída, una no) en tenant 1
    // when: findInbox(1, 7, unreadOnly=true)
    // then: devuelve 1; countUnread == 1
    // when: markRead de la no-leída; then: countUnread == 0
    // markRead de una notificación de OTRO usuario devuelve false y no cambia nada
}
```
(Setear `TenantContext.setTenantId(1L)` en `@BeforeEach`; ver cómo lo hacen otros `@DataJpaTest` del repo.)

- [ ] **Step 5: Run tests → PASS.** `./mvnw -Dtest=UserNotificationJpaAdapterTest test`

- [ ] **Step 6: Commit.** `git commit -m "feat(notificaciones): persistencia JPA de config y bandeja"`

---

### Task 5: Resolución de destinatarios (`RecipientResolver`)

**Files:**
- Create: `application/RecipientResolver.java`
- Modify: `modules/empresa/domain/port/UserRepositoryPort.java` — asegurar que expone `findActiveByRoleCodeAndBranch(Long tenantId, String roleCode, Long branchId)` y `findActiveByRoleCode(Long tenantId, String roleCode)` (los métodos ya existen en `UserJpaRepository`; agregarlos al puerto + adapter si falta). Devuelven `List<Long>` (ids) o modelo `User` con `id()`.
- Test: `src/test/java/.../notificaciones/application/RecipientResolverTest.java`

**Interfaces:**
- Consumes: `UserRepositoryPort` (users por rol/sucursal), `UserAccessSectionRepositoryPort.findSectionsByUser(tenantId, userId)`, `NotificationConfigRepositoryPort.findRecipients(...)`.
- Produces: `Set<Long> resolveEligibleUserIds(Long tenantId, NotificationEventType type, Long branchId, List<NotificationRecipient> recipients)`.

**Reglas:**
1. `USER` recipient → el userId tal cual.
2. `ROLE` recipient → si `branchId != null`, `findActiveByRoleCodeAndBranch(tenant, role, branchId)`; si `branchId == null` (evento tenant-wide, p.ej. plan/convenio), `findActiveByRoleCode(tenant, role)`.
3. Unión, dedup por userId.
4. Filtrar: conservar solo usuarios cuyo `findSectionsByUser(tenant, userId)` contiene `type.requiredSection()`.

- [ ] **Step 1: Test.**

```java
class RecipientResolverTest {
    // mocks: userRepo, accessSectionRepo
    @Test void unionOfUsersAndRoleInBranch_filteredByAccess() {
        var type = NotificationEventType.HOME_VISIT_ASSIGNED; // requiere DOMICILIO_RUTA
        // recipients: USER 10, ROLE EXTRACTOR
        // userRepo.findActiveByRoleCodeAndBranch(1,"EXTRACTOR",5) -> [20, 21]
        // access: 10->{DOMICILIO_RUTA}, 20->{DOMICILIO_RUTA}, 21->{FINANCIERO}
        // expected: {10, 20}  (21 se cae por no tener la sección)
    }
    @Test void roleWithNullBranch_usesTenantWideQuery() {
        // type INSURER_PLAN_CHANGED, branchId null, ROLE FACTURISTA
        // verifica que llama findActiveByRoleCode (sin branch)
    }
}
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementar `RecipientResolver`** (constructor con los 2 puertos):

```java
public Set<Long> resolveEligibleUserIds(Long tenantId, NotificationEventType type,
                                        Long branchId, List<NotificationRecipient> recipients) {
    Set<Long> candidates = new HashSet<>();
    for (var r : recipients) {
        if (r.type() == RecipientType.USER) {
            candidates.add(Long.valueOf(r.ref()));
        } else { // ROLE
            var users = (branchId != null)
                ? userRepo.findActiveByRoleCodeAndBranch(tenantId, r.ref(), branchId)
                : userRepo.findActiveByRoleCode(tenantId, r.ref());
            users.forEach(u -> candidates.add(u.id()));
        }
    }
    return candidates.stream()
        .filter(uid -> accessSectionRepo.findSectionsByUser(tenantId, uid).contains(type.requiredSection()))
        .collect(Collectors.toSet());
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit.** `git commit -m "feat(notificaciones): resolución de destinatarios (rol→sucursal + filtro de acceso)"`

---

### Task 6: `NotificationFanoutService` (core)

**Files:**
- Create: `application/NotificationFanoutService.java`
- Create: `infrastructure/cache/NotificationEtagKeys.java` (keys de bandeja por usuario)
- Test: `src/test/java/.../notificaciones/application/NotificationFanoutServiceTest.java`

**Interfaces:**
- Consumes: `NotificationConfigRepositoryPort`, `RecipientResolver`, `UserNotificationRepositoryPort`, `EtagCache`.
- Produces: `void dispatch(Long tenantId, NotificationContext ctx)`.

**Flujo:** enabled? → resolver → por cada userId, `existsForDedup` (skip si ya existe) → construir `UserNotification` (interpolar `routeTemplate` con `targetEntityId`) → `saveAll` → invalidar ETag de bandeja de esos usuarios.

- [ ] **Step 1: Test.**

```java
class NotificationFanoutServiceTest {
    @Test void disabledEvent_insertsNothing() { /* isEnabled=false -> saveAll nunca se llama */ }
    @Test void insertsOnePerEligibleUser_interpolatingRoute() {
        // enabled=true; resolver -> {10,20}; dedup=false para ambos
        // ctx: SETTLEMENT_REPORTED, targetEntityId=99
        // expected saveAll con 2 filas, targetRoute "/financiero/liquidaciones/99"
    }
    @Test void dedup_skipsExisting() {
        // resolver -> {10}; existsForDedup(...,10,...)=true -> saveAll con lista vacía o no llamado
    }
    @Test void fanoutNeverThrows_onRepoError() {
        // saveAll lanza -> dispatch traga la excepción (verifica que NO propaga)
    }
}
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementar.**

```java
@Service @RequiredArgsConstructor @Slf4j
public class NotificationFanoutService {
    private final NotificationConfigRepositoryPort configPort;
    private final RecipientResolver recipientResolver;
    private final UserNotificationRepositoryPort inboxPort;
    private final EtagCache etagCache;

    public void dispatch(Long tenantId, NotificationContext ctx) {
        try {
            var type = ctx.eventType();
            if (!configPort.isEnabled(tenantId, type)) return;
            var recipients = configPort.findRecipients(tenantId, type);
            if (recipients.isEmpty()) return;
            var userIds = recipientResolver.resolveEligibleUserIds(tenantId, type, ctx.branchId(), recipients);

            var toInsert = new ArrayList<UserNotification>();
            for (Long uid : userIds) {
                if (inboxPort.existsForDedup(tenantId, uid, type, ctx.targetEntityId())) continue;
                String route = ctx.targetEntityId() == null ? type.routeTemplate()
                    : type.routeTemplate().replace("{id}", String.valueOf(ctx.targetEntityId()));
                toInsert.add(new UserNotification(null, uid, type, ctx.title(), ctx.message(),
                        route, ctx.targetEntityId(), ctx.branchId(), null, null));
            }
            if (toInsert.isEmpty()) return;
            inboxPort.saveAll(tenantId, toInsert);
            toInsert.forEach(n -> etagCache.invalidate(NotificationEtagKeys.inbox(tenantId, n.userId())));
        } catch (Exception e) {
            log.error("[notificaciones] fan-out falló para evento {} (tenant {}): {}",
                    ctx.eventType(), tenantId, e.getMessage(), e);
            // Nunca propaga: el fan-out no puede romper el flujo de negocio.
        }
    }
}
```

```java
public final class NotificationEtagKeys {
    private NotificationEtagKeys() {}
    public static String inbox(Long tenantId, Long userId) { return "notif-inbox:" + tenantId + ":" + userId; }
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit.** `git commit -m "feat(notificaciones): fan-out service con dedup e invalidación de ETag"`

---

### Task 7: Eventos-trigger + dispatcher + puntos de publicación

**Files:**
- Create: `domain/event/HomeVisitAssignedEvent.java`, `SettlementReportedEvent.java`, `InsurerPlanChangedEvent.java`
- Create: `application/NotificationDispatcher.java`
- Modify (agregar `applicationEventPublisher.publishEvent(...)`):
  - Caso de uso **Informar liquidación** (buscar en `modules/financiero/application/usecase/` — el que hoy publica `SettlementMutatedEvent` en la acción "inform"; publicar además `SettlementReportedEvent`).
  - Casos de uso **CreatePlan/CreateAgreement** (y sus updates si existen) en `modules/coverages/application/usecase/plan` y `.../agreement`.
  - **DIFERIDO — domicilio:** el punto de publicación de `HomeVisitAssignedEvent` NO se cablea en esta implementación porque el módulo `domicilio` no está en `development`. El record `HomeVisitAssignedEvent` y su listener quedan creados (self-contained en `notificaciones`), pero nunca se publican hasta que domicilio se mergee. Al mergear domicilio: setear `HOME_VISIT_ASSIGNED.hasTrigger=true` y agregar `eventPublisher.publishEvent(new HomeVisitAssignedEvent(...))` en el use case de asignación.
- Test: `src/test/java/.../notificaciones/application/NotificationDispatcherTest.java`

**Interfaces:**
- Consumes: los 3 eventos-trigger; `NotificationFanoutService.dispatch(...)`.
- Produces: `NotificationDispatcher` con un `@TransactionalEventListener(AFTER_COMMIT)` por evento, cada uno arma un `NotificationContext` y llama `dispatch`.

```java
public record HomeVisitAssignedEvent(Long tenantId, Long branchId, Long assignedExtractorId, Long visitId) {}
public record SettlementReportedEvent(Long tenantId, Long branchId, Long settlementId) {}
public record InsurerPlanChangedEvent(Long tenantId, Long planId, String planName, boolean created) {}
```

- [ ] **Step 1: Crear los 3 records de evento** (arriba).

- [ ] **Step 2: Test del dispatcher.**

```java
class NotificationDispatcherTest {
    @Test void homeVisitAssigned_buildsContextAndDispatches() {
        var ev = new HomeVisitAssignedEvent(1L, 5L, 20L, 99L);
        dispatcher.onHomeVisitAssigned(ev);
        // verify fanout.dispatch(1L, ctx) con eventType HOME_VISIT_ASSIGNED, branchId 5, targetEntityId 99
        // y message no-vacío en español
    }
    @Test void insurerPlanChanged_nullBranch() {
        var ev = new InsurerPlanChangedEvent(1L, 7L, "IOMA", true);
        dispatcher.onInsurerPlanChanged(ev);
        // verify dispatch con branchId null, targetEntityId 7
    }
}
```

- [ ] **Step 3: Run → FAIL.**

- [ ] **Step 4: Implementar `NotificationDispatcher`.**

```java
@Component @RequiredArgsConstructor
public class NotificationDispatcher {
    private final NotificationFanoutService fanout;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onHomeVisitAssigned(HomeVisitAssignedEvent e) {
        fanout.dispatch(e.tenantId(), new NotificationContext(
            NotificationEventType.HOME_VISIT_ASSIGNED, e.branchId(), e.visitId(),
            NotificationEventType.HOME_VISIT_ASSIGNED.defaultTitle(),
            "Se te asignó un nuevo turno a domicilio."));
    }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onSettlementReported(SettlementReportedEvent e) {
        fanout.dispatch(e.tenantId(), new NotificationContext(
            NotificationEventType.SETTLEMENT_REPORTED, e.branchId(), e.settlementId(),
            NotificationEventType.SETTLEMENT_REPORTED.defaultTitle(),
            "Se informó una liquidación para revisar."));
    }
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInsurerPlanChanged(InsurerPlanChangedEvent e) {
        String verbo = e.created() ? "creó" : "modificó";
        fanout.dispatch(e.tenantId(), new NotificationContext(
            NotificationEventType.INSURER_PLAN_CHANGED, null, e.planId(),
            NotificationEventType.INSURER_PLAN_CHANGED.defaultTitle(),
            "Se " + verbo + " el plan/convenio: " + e.planName() + "."));
    }
}
```

- [ ] **Step 5: Run → PASS.**

- [ ] **Step 6: Agregar puntos de publicación** en los casos de uso reales (solo liquidación y plan/convenio; domicilio DIFERIDO). Inyectar `ApplicationEventPublisher` (patrón ya usado en el repo) y publicar el evento-trigger AFTER de completar la operación, BEFORE de retornar. Ejemplo para Informar-liquidación:

```java
// en el use case de Informar liquidación, tras persistir:
eventPublisher.publishEvent(new SettlementReportedEvent(tenantId, settlement.branchId(), settlement.id()));
```
Repetir para create plan + create agreement (`InsurerPlanChangedEvent`, `created=true`; y en los updates si existen, `created=false`). **No** tocar la firma pública de esos use cases. `HomeVisitAssignedEvent` no se publica (domicilio no está en development).

- [ ] **Step 7: Verificar que compila + suite de esos módulos verde.** `./mvnw -Dtest='*Settlement*,*Plan*,*Agreement*' test`

- [ ] **Step 8: Commit.** `git commit -m "feat(notificaciones): eventos-trigger, dispatcher y puntos de publicación"`

---

### Task 8: Scheduler SLA de urgencias

**Files:**
- Create: `application/UrgentSlaNotificationScheduler.java`
- Create (si hace falta) un puerto de lectura de urgentes en curso: reusar el use case/port de KAN-169 que lista urgentes en curso con `urgent_since` + SLA. Buscar en `modules/analitica/atencion/` (`urgent-in-progress`). Si expone el % de SLA o el `urgentSince` + `slaMinutes`, calcular en el scheduler.
- Test: `src/test/java/.../notificaciones/application/UrgentSlaNotificationSchedulerTest.java`

**Interfaces:**
- Consumes: lectura de urgentes en curso (por tenant/sucursal, con `urgentSince`, `slaMinutes`, `attentionId`, `branchId`), `NotificationFanoutService`, un `Clock` inyectable (para test).
- Produces: `void scan()` `@Scheduled(fixedDelayString = "PT2M")` — recorre urgentes en curso; al cruzar 80% dispara `URGENT_SLA_AT_RISK`, al cruzar 100% `URGENT_SLA_BREACHED`. El **dedup por `(user, type, attentionId)`** del fan-out evita repetir en cada corrida.

- [ ] **Step 1: Test con Clock fijo.**

```java
class UrgentSlaNotificationSchedulerTest {
    // urgente attentionId=99, branch=5, urgentSince=now-48min, slaMinutes=60 -> 80% (48min) alcanzado, 100% no
    @Test void atEightyPercent_dispatchesAtRisk() {
        scheduler.scan();
        // verify fanout.dispatch(tenant, ctx con URGENT_SLA_AT_RISK, targetEntityId 99)
        // y NO dispatch de BREACHED
    }
    // urgentSince=now-65min -> BREACHED
    @Test void pastSla_dispatchesBreached() { /* verify URGENT_SLA_BREACHED */ }
    // urgentSince=now-10min -> nada
    @Test void wellWithinSla_dispatchesNothing() { /* verify no dispatch */ }
}
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementar.**

```java
@Component @RequiredArgsConstructor @Slf4j
public class UrgentSlaNotificationScheduler {
    private final UrgentInProgressReadPort urgentReadPort; // lista urgentes en curso de TODOS los tenants
    private final NotificationFanoutService fanout;
    private final Clock clock;

    @Scheduled(fixedDelayString = "PT2M")
    public void scan() {
        var now = clock.instant();
        for (var u : urgentReadPort.findAllInProgress()) {
            long elapsed = Duration.between(u.urgentSince(), now).toMinutes();
            double pct = (double) elapsed / u.slaMinutes();
            if (pct >= 1.0) {
                dispatch(u, NotificationEventType.URGENT_SLA_BREACHED,
                    "La urgencia N° " + u.publicCode() + " venció su tiempo de SLA.");
            } else if (pct >= 0.8) {
                dispatch(u, NotificationEventType.URGENT_SLA_AT_RISK,
                    "La urgencia N° " + u.publicCode() + " está por vencer su tiempo de SLA.");
            }
        }
    }
    private void dispatch(UrgentInProgressRow u, NotificationEventType type, String msg) {
        fanout.dispatch(u.tenantId(), new NotificationContext(type, u.branchId(), u.attentionId(), type.defaultTitle(), msg));
    }
}
```

> **Dedup entre AT_RISK y BREACHED:** ambos comparten `targetEntityId=attentionId` pero distinto `eventType`, así que el dedup los trata por separado (un aviso "por vencer" y luego uno "vencido"). Dentro de cada tipo, el dedup evita repetir en cada corrida de 2 min. Registrar el `Clock` bean si no existe (`@Bean Clock clock(){ return Clock.systemUTC(); }`).

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Habilitar scheduling** si el proyecto no lo tiene: verificar `@EnableScheduling` (ya presente por `BoxOccupationCleanupScheduler`). No duplicar.

- [ ] **Step 6: Commit.** `git commit -m "feat(notificaciones): scheduler de SLA de urgencias (por vencer + vencido)"`

---

### Task 9: Endpoints de bandeja (usuario)

**Files:**
- Create: `application/usecase/{ListMyNotificationsUseCase,MarkNotificationReadUseCase,MarkAllNotificationsReadUseCase}.java`
- Create: `presentation/NotificationController.java`
- Create: `presentation/dto/{NotificationResponse,NotificationInboxResponse}.java`
- Test: `src/test/java/.../notificaciones/presentation/NotificationControllerTest.java` (@WebMvcTest o slice de integración según patrón del repo)

**Interfaces:**
- Consumes: `UserNotificationRepositoryPort`, `CurrentUserProvider.requireUserId()`, `TenantContext.requireTenantId()`, `EtagCache`, `EtagSupport`, `NotificationEtagKeys`.
- Produces: `GET /api/v1/notifications?unreadOnly={bool}` (ETag/304), `POST /api/v1/notifications/{id}/read`, `POST /api/v1/notifications/read-all`.

DTOs:
```java
public record NotificationResponse(Long id, String eventType, String title, String message,
    String targetRoute, boolean read, java.time.Instant createdAt) {}
public record NotificationInboxResponse(List<NotificationResponse> items, long unreadCount) {}
```

- [ ] **Step 1: Test del controller.**

```java
class NotificationControllerTest {
    @Test void getInbox_returnsItemsAndUnreadCount_withEtag() {
        // stub inbox del user actual -> 2 items (1 unread); GET -> 200, body.unreadCount==1, header ETag presente
    }
    @Test void getInbox_sameEtag_returns304() {
        // segundo GET con If-None-Match = etag anterior -> 304, sin body
    }
    @Test void markRead_notOwner_returns404() {
        // markRead de id ajeno -> port.markRead=false -> 404 con mensaje español sin leak
    }
}
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementar el controller** (patrón ETag de `ExtractorAttentionController`):

```java
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final ListMyNotificationsUseCase listUseCase;
    private final MarkNotificationReadUseCase markReadUseCase;
    private final MarkAllNotificationsReadUseCase markAllUseCase;
    private final EtagCache etagCache;
    private final EtagSupport etagSupport;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    public ResponseEntity<NotificationInboxResponse> inbox(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
        Long tenantId = TenantContext.requireTenantId();
        Long userId = currentUserProvider.requireUserId();
        String key = NotificationEtagKeys.inbox(tenantId, userId);
        String cached = etagCache.get(key);
        if (cached != null && cached.equals(ifNoneMatch)) {
            return etagSupport.respondWith(cached, ifNoneMatch, () -> null);
        }
        var inbox = listUseCase.execute(tenantId, userId, unreadOnly); // NotificationInboxResponse
        String etag = etagSupport.compute(tenantId, userId, inbox.items().size(), inbox.unreadCount());
        etagCache.put(key, etag);
        return etagSupport.respondWith(etag, ifNoneMatch, () -> inbox);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> read(@PathVariable Long id) {
        markReadUseCase.execute(TenantContext.requireTenantId(), currentUserProvider.requireUserId(), id);
        return ResponseEntity.noContent().build();
    }
    @PostMapping("/read-all")
    public ResponseEntity<Void> readAll() {
        markAllUseCase.execute(TenantContext.requireTenantId(), currentUserProvider.requireUserId());
        return ResponseEntity.noContent().build();
    }
}
```
`MarkNotificationReadUseCase`: si `port.markRead(...)` devuelve false, lanzar `NotificationNotFoundException` (DomainException con mensaje español "No encontramos la notificación."). Ambos mark invalidan `NotificationEtagKeys.inbox(...)`.

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Test no-leak** del handler de `NotificationNotFoundException` (regla #4): assert mensaje no contiene `lab.laboratorio.`, `java.`, `No enum constant`.

- [ ] **Step 6: Commit.** `git commit -m "feat(notificaciones): endpoints de bandeja con ETag/304"`

---

### Task 10: Endpoints de configuración (admin)

**Files:**
- Create: `application/usecase/{GetNotificationConfigUseCase,UpdateNotificationConfigUseCase,ListEligibleRecipientsUseCase}.java`
- Create: `presentation/NotificationConfigController.java`
- Create: `presentation/dto/{NotificationConfigResponse,UpdateNotificationConfigRequest,EligibleRecipientsResponse,RecipientDto}.java`
- Test: `src/test/java/.../notificaciones/presentation/NotificationConfigControllerTest.java`

**Interfaces:**
- Consumes: `NotificationConfigRepositoryPort`, `UserRepositoryPort` (usuarios del tenant), `RoleRepositoryPort` (roles del tenant), `UserAccessSectionRepositoryPort` (para marcar elegibles).
- Produces:
  - `GET /api/v1/notification-configs` → lista de `{ eventType, enabled, recipients:{users:[ids], roles:[codes]} }` para todo el catálogo.
  - `PUT /api/v1/notification-configs/{eventType}` → set enabled + recipients (reemplaza). Valida que cada recipient tenga acceso a `requiredSection()`; si no, `422` con mensaje español listando los inválidos.
  - `GET /api/v1/notification-configs/{eventType}/eligible` → `{ users:[{id,nombre,tieneAcceso}], roles:[{code,label}] }` para poblar el picker.

DTOs:
```java
public record RecipientDto(String type, String ref) {}        // "USER"|"ROLE"
public record NotificationConfigResponse(String eventType, String title, boolean enabled,
    boolean hasTrigger, List<RecipientDto> recipients) {}
public record UpdateNotificationConfigRequest(boolean enabled, List<RecipientDto> recipients) {}
public record EligibleUserDto(Long id, String nombre, boolean tieneAcceso) {}
public record EligibleRecipientsResponse(List<EligibleUserDto> users, List<RecipientDto> roles) {}
```

- [ ] **Step 1: Test.**

```java
class NotificationConfigControllerTest {
    @Test void getConfigs_returnsWholeCatalog() { /* 6 eventos, cada uno con enabled + recipients */ }
    @Test void put_rejectsRecipientWithoutAccess_422() {
        // PUT HOME_VISIT_ASSIGNED con USER 30 que NO tiene DOMICILIO_RUTA -> 422, mensaje español, sin leak
    }
    @Test void put_persistsEnabledAndRecipients() { /* enabled=true + 1 user + 1 role -> repos llamados */ }
    @Test void endpoints_requireAdminRole() { /* sin ROLE_ADMINISTRADOR -> 403 */ }
}
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implementar el controller** (seguridad admin a nivel clase):

```java
@RestController
@RequestMapping("/api/v1/notification-configs")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@RequiredArgsConstructor
public class NotificationConfigController {
    private final GetNotificationConfigUseCase getUseCase;
    private final UpdateNotificationConfigUseCase updateUseCase;
    private final ListEligibleRecipientsUseCase eligibleUseCase;

    @GetMapping
    public List<NotificationConfigResponse> all() {
        return getUseCase.execute(TenantContext.requireTenantId());
    }
    @PutMapping("/{eventType}")
    public ResponseEntity<Void> update(@PathVariable NotificationEventType eventType,
                                       @RequestBody @Valid UpdateNotificationConfigRequest req) {
        updateUseCase.execute(TenantContext.requireTenantId(), eventType, req);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/{eventType}/eligible")
    public EligibleRecipientsResponse eligible(@PathVariable NotificationEventType eventType) {
        return eligibleUseCase.execute(TenantContext.requireTenantId(), eventType);
    }
}
```
`UpdateNotificationConfigUseCase`: valida acceso de cada `USER` recipient (via `findSectionsByUser`) y de cada `ROLE` (que exista y ≥1 usuario con acceso, o al menos que el rol exista); si hay inválidos lanza `RecipientWithoutAccessException` (DomainException, 422, mensaje: "Estos destinatarios no tienen acceso a la pantalla del evento: …"). Luego `upsertSetting` + `replaceRecipients`.
`@PathVariable NotificationEventType` inválido → 400 mapeado en `GlobalExceptionHandler` a mensaje español sin `No enum constant` (regla #4 — agregar handler/verificar el existente).

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Security review.** Correr `/security-review` (endpoints nuevos + rol admin). Resolver críticos.

- [ ] **Step 6: Commit.** `git commit -m "feat(notificaciones): endpoints de configuración admin (enabled + destinatarios + elegibles)"`

---

### Task 11: Verificación integral backend

- [ ] **Step 1: Suite completa.** `JAVA_HOME=C:\Program Files\Java\jdk-21 ./mvnw test` (E2E excluidos). Esperado: verde. Si hay rojos pre-existentes en `development` (ver `reference_v1060-authorized-h2-boolean`), aislarlos y documentarlos, no arreglarlos acá.

- [ ] **Step 2: Boot MySQL fresco** (`reference_mysql-boot-verification`): schema nuevo, perfil `local`, confirmar Flyway + arranque. Smoke manual: login admin, `GET /api/v1/notification-configs` → 200 con catálogo; `GET /api/v1/notifications` → 200 `unreadCount:0`.

- [ ] **Step 3: Commit** de cualquier ajuste. Abrir PR contra `development` (regla PR-workflow), linkeando el Jira.

## Self-Review (completado)

- **Spec coverage:** catálogo (Task 2), 3 tablas (Task 1), fan-out + dedup + acceso + rol/sucursal (Tasks 5-6), triggers + puntos de publicación (Task 7), SLA scheduler (Task 8), bandeja ETag/304 (Task 9), config admin + validación de acceso + eligibles (Task 10). Cierre de caja: declarado inerte en el enum (Task 2), sin trigger — cubre la decisión §9.2. ✔
- **Placeholders:** `Vxxx` es intencional (número Flyway se fija en Task 1 Step 1, documentado). Los "buscar el use case en modules/X" traen la instrucción exacta + el código a insertar. ✔
- **Type consistency:** `NotificationContext`, `UserNotification`, puertos y firmas de `dispatch(tenantId, ctx)` consistentes entre Tasks 6/7/8. `NotificationEtagKeys.inbox` usado igual en Tasks 6 y 9. ✔
