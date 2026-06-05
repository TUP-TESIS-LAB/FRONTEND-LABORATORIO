# Box Occupation (ATENCION) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cada secretaria elija/cambie su box de atención al entrar a recepción, ver organizativamente qué boxes están ocupados por otras, y propagar ese box al TV cuando llama un paciente.

**Architecture:** Tabla `branch_box_occupation` con `active=NULL` para histórico y UNIQUE constraints que evitan double-occupy. Use cases CRUD en módulo `sucursales`. Modificación de `CallQueueEntryUseCase` para capturar el box del operador y persistirlo en `queue_entries.box_number` (campo dead existente, re-purposeado a INT). Frontend: nuevo feature `turnos/box-occupation` con modal grid 3 cols + widget pill en header de recepción.

**Tech Stack:** Spring Boot 4 + Java 24 + Flyway + JPA, Angular 21 + signals + NgRx clásico + PrimeNG, Vitest + jsdom.

**Spec base:** `docs/superpowers/specs/2026-06-05-box-occupation-design.md`

---

## File Structure

### Backend (módulo `sucursales` + módulo `turnos`)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/main/resources/db/migration/V84__create_branch_box_occupation_and_repurpose_queue_box.sql` | Crear | DDL tabla + ALTER queue_entries.box_number VARCHAR(10) → INT |
| `src/main/java/lab/laboratorio/modules/sucursales/domain/model/BranchBoxOccupation.java` | Crear | Modelo de dominio |
| `src/main/java/lab/laboratorio/modules/sucursales/domain/model/BoxType.java` | Crear | Enum ATENCION/EXTRACCION |
| `src/main/java/lab/laboratorio/modules/sucursales/domain/port/BranchBoxOccupationRepositoryPort.java` | Crear | Port |
| `src/main/java/lab/laboratorio/modules/sucursales/domain/exception/BoxAlreadyOccupiedException.java` | Crear | Exception 409 |
| `src/main/java/lab/laboratorio/modules/sucursales/domain/exception/InvalidBoxNumberException.java` | Crear | Exception 400 |
| `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/entity/BranchBoxOccupationJpaEntity.java` | Crear | JPA entity |
| `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/repository/BranchBoxOccupationJpaRepository.java` | Crear | Spring Data interface |
| `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/adapter/BranchBoxOccupationRepositoryAdapter.java` | Crear | Adapter implementando el port |
| `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/mapper/BranchBoxOccupationJpaMapper.java` | Crear | jpa <-> domain |
| `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/OccupyBoxUseCase.java` | Crear | Use case |
| `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ReleaseBoxUseCase.java` | Crear | Use case |
| `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ListBranchBoxOccupationsUseCase.java` | Crear | Use case |
| `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ReleaseAllBoxOccupationsForBranchUseCase.java` | Crear | Use case interno usado por el cron |
| `src/main/java/lab/laboratorio/modules/sucursales/presentation/controller/BranchBoxOccupationController.java` | Crear | REST controller |
| `src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/request/OccupyBoxRequest.java` | Crear | Request body |
| `src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/response/BranchBoxOccupationResponse.java` | Crear | Response |
| `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/scheduling/BoxOccupationCleanupScheduler.java` | Crear | @Scheduled cron diario |
| `src/main/java/lab/laboratorio/infrastructure/config/SchedulingConfig.java` | Crear si no existe | @EnableScheduling |
| `src/main/java/lab/laboratorio/modules/turnos/domain/model/QueueEntry.java` | Modificar | boxNumber String → Integer; recordCall acepta fromBox |
| `src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/QueueEntryJpaEntity.java` | Modificar | boxNumber String → Integer; @Column type |
| `src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/QueueEntryJpaMapper.java` | Modificar | mapear Integer |
| `src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java` | Modificar | boxNumber Integer |
| `src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/PublicQueueEntryResponse.java` | Modificar | Agregar `Integer boxNumber` field |
| `src/main/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCase.java` | Modificar | Leer occupation del operador y pasarla a `recordCall` |
| `src/main/resources/application.yml` (o profile-specific) | Modificar si necesario | Cron expression configurable opcional |

### Frontend (`turnos/box-occupation`)

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/app/features/turnos/box-occupation/models/box-occupation.model.ts` | Crear | Tipos TS |
| `src/app/features/turnos/box-occupation/services/box-occupation.service.ts` | Crear | HTTP (GET/PUT/DELETE) |
| `src/app/features/turnos/box-occupation/store/box-occupation.state.ts` | Crear | State + initialState |
| `src/app/features/turnos/box-occupation/store/box-occupation.actions.ts` | Crear | Actions clásicas |
| `src/app/features/turnos/box-occupation/store/box-occupation.reducer.ts` | Crear | Reducer |
| `src/app/features/turnos/box-occupation/store/box-occupation.effects.ts` | Crear | Effects (load, occupy, release) |
| `src/app/features/turnos/box-occupation/store/box-occupation.selectors.ts` | Crear | Selectors |
| `src/app/features/turnos/box-occupation/store/box-occupation.reducer.spec.ts` | Crear | Smoke spec del reducer |
| `src/app/features/turnos/box-occupation/components/box-selector-modal.component.{ts,html,scss}` | Crear | Modal grid 3 cols |
| `src/app/features/turnos/box-occupation/components/box-selector-modal.component.spec.ts` | Crear | Smoke spec |
| `src/app/features/turnos/box-occupation/components/box-occupation-widget.component.{ts,html,scss}` | Crear | Pill en header |
| `src/app/features/turnos/turnos.routes.ts` | Modificar | Registrar feature state + effects |
| `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.{ts,html}` | Modificar | Modal trigger + widget en header |
| `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.{ts,html}` | Modificar | Idem |
| `src/app/features/turnos/services/operator-branch.context.ts` (o el equivalente) | Leer | Tomar branchId actual |
| `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts` | Modificar | Dispatch releaseBox antes de clearToken |

---

## Convención de commits

Todos los commits llevan `(KAN-XX)` placeholder hasta que se cree el ticket. Reemplazar con `sed` al final, o dejar como está si se confirma el ticket antes del primer commit. El usuario suele crear el ticket vía `jira-workflow` antes de la implementación, en cuyo caso poner directamente el número real.

---

## Task 1: Migration V84 — tabla + repurposing de queue_entries.box_number

**Files:**
- Create: `src/main/resources/db/migration/V84__create_branch_box_occupation_and_repurpose_queue_box.sql`

- [ ] **Step 1: Crear la migration**

```sql
-- V84: ocupación de boxes por secretaria + repurposing de queue_entries.box_number

-- Tabla nueva: branch_box_occupation
CREATE TABLE branch_box_occupation (
  id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  tenant_id       BIGINT NOT NULL,
  branch_id       BIGINT NOT NULL,
  user_id         BIGINT NOT NULL,
  box_type        VARCHAR(20) NOT NULL,
  box_number      INT NOT NULL,
  occupied_at     DATETIME(6) NOT NULL,
  released_at     DATETIME(6) NULL,
  active          TINYINT(1) NULL,
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

-- Repurposing del campo box_number en queue_entries: VARCHAR(10) -> INT.
-- El campo existía desde V53 pero nunca se setea desde código (verificable
-- vía grep "setBoxNumber|with.*Box" en src/main/java). Cambiarlo a INT es
-- seguro porque todas las filas tienen NULL.
ALTER TABLE queue_entries MODIFY COLUMN box_number INT NULL;
```

- [ ] **Step 2: Verificar localmente — backend tiene que poder migrar limpio**

Run desde otra terminal (mantener el backend actual abajo):
```
cd "C:/Users/Mateo/Desktop/tesis/Backend"
docker exec laboratorio_mysql mysql -ulaboratorio -plaboratorio laboratorio -e "DESCRIBE queue_entries;" | grep box_number
```
Expected (antes de migrar): `box_number  varchar(10)  YES`

- [ ] **Step 3: Commit**

```
cd "C:/Users/Mateo/Desktop/tesis/Backend"
git add src/main/resources/db/migration/V84__create_branch_box_occupation_and_repurpose_queue_box.sql
git commit -m "feat(sucursales): tabla branch_box_occupation + queue_entries.box_number INT (KAN-XX)"
```

---

## Task 2: Domain layer — modelo + enum + port + exceptions

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/sucursales/domain/model/BoxType.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/domain/model/BranchBoxOccupation.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/domain/port/BranchBoxOccupationRepositoryPort.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/domain/exception/InvalidBoxNumberException.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/domain/exception/BoxAlreadyOccupiedException.java`

- [ ] **Step 1: BoxType enum**

```java
package lab.laboratorio.modules.sucursales.domain.model;

public enum BoxType {
    ATENCION,
    EXTRACCION,
}
```

- [ ] **Step 2: BranchBoxOccupation domain model**

```java
package lab.laboratorio.modules.sucursales.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchBoxOccupation {

    private Long id;
    private Long tenantId;
    private Long branchId;
    private Long userId;
    private BoxType boxType;
    private int boxNumber;
    private Instant occupiedAt;
    private Instant releasedAt;
    /** true = activa, null = liberada (NUNCA false). Ver §4 del spec. */
    private Boolean active;
    private Long version;

    public static BranchBoxOccupation occupy(Long tenantId, Long branchId, Long userId, BoxType boxType, int boxNumber) {
        BranchBoxOccupation o = new BranchBoxOccupation();
        o.tenantId = tenantId;
        o.branchId = branchId;
        o.userId = userId;
        o.boxType = boxType;
        o.boxNumber = boxNumber;
        o.occupiedAt = Instant.now();
        o.active = Boolean.TRUE;
        return o;
    }

    /** Marca esta ocupación como liberada (mutación in-place). */
    public void release() {
        this.releasedAt = Instant.now();
        this.active = null;
    }
}
```

- [ ] **Step 3: Repository port**

```java
package lab.laboratorio.modules.sucursales.domain.port;

import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;

import java.util.List;
import java.util.Optional;

public interface BranchBoxOccupationRepositoryPort {

    /** Lista todas las occupations activas de una sucursal y tipo. */
    List<BranchBoxOccupation> findActiveByBranchAndType(Long branchId, BoxType boxType, Long tenantId);

    /** Devuelve la occupation activa del user para el branch+type, si existe. */
    Optional<BranchBoxOccupation> findActiveByUser(Long branchId, BoxType boxType, Long userId, Long tenantId);

    /** Devuelve la occupation activa que ocupa el box indicado, si la hay. */
    Optional<BranchBoxOccupation> findActiveByBox(Long branchId, BoxType boxType, int boxNumber, Long tenantId);

    /** Persiste (insert/update). Devuelve la entidad con id seteado. */
    BranchBoxOccupation save(BranchBoxOccupation occupation, Long tenantId);

    /** Bulk: marca released_at=NOW + active=null para todas las activas. Usado por el cron. */
    int releaseAllActive();
}
```

- [ ] **Step 4: Exceptions**

```java
package lab.laboratorio.modules.sucursales.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class InvalidBoxNumberException extends DomainException {
    public InvalidBoxNumberException(int boxNumber, int maxBoxes) {
        super("El número de box %d no es válido. La sucursal tiene %d boxes.".formatted(boxNumber, maxBoxes));
    }
}
```

```java
package lab.laboratorio.modules.sucursales.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class BoxAlreadyOccupiedException extends DomainException {
    public BoxAlreadyOccupiedException(int boxNumber) {
        super("El box %d ya fue ocupado por otra secretaria. Refrescá y elegí otro.".formatted(boxNumber));
    }
}
```

> Si `DomainException` no existe en ese paquete, buscar la base usada por otras exceptions del módulo (ej. `BranchNotFoundException`) y reusar.

- [ ] **Step 5: Build OK**

```
cd "C:/Users/Mateo/Desktop/tesis/Backend"
./mvnw.cmd -q compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```
git add src/main/java/lab/laboratorio/modules/sucursales/domain/model/BoxType.java \
        src/main/java/lab/laboratorio/modules/sucursales/domain/model/BranchBoxOccupation.java \
        src/main/java/lab/laboratorio/modules/sucursales/domain/port/BranchBoxOccupationRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/sucursales/domain/exception/InvalidBoxNumberException.java \
        src/main/java/lab/laboratorio/modules/sucursales/domain/exception/BoxAlreadyOccupiedException.java
git commit -m "feat(sucursales): dominio BranchBoxOccupation + BoxType + port + exceptions (KAN-XX)"
```

---

## Task 3: Persistence layer — JPA entity + mapper + repository + adapter

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/entity/BranchBoxOccupationJpaEntity.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/mapper/BranchBoxOccupationJpaMapper.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/repository/BranchBoxOccupationJpaRepository.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/adapter/BranchBoxOccupationRepositoryAdapter.java`

- [ ] **Step 1: JPA Entity**

```java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lab.laboratorio.infrastructure.persistence.BaseJpaEntity;
import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "branch_box_occupation")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchBoxOccupationJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "box_type", nullable = false, length = 20)
    private BoxType boxType;

    @Column(name = "box_number", nullable = false)
    private int boxNumber;

    @Column(name = "occupied_at", nullable = false)
    private Instant occupiedAt;

    @Column(name = "released_at")
    private Instant releasedAt;

    @Column(name = "active")
    private Boolean active;
}
```

> Si `BaseJpaEntity` ya incluye `tenant_id, created_at, updated_at, created_by, updated_by, version`, no duplicar esos fields. Confirmar leyendo `BaseJpaEntity.java`. Si no incluye `tenant_id`, agregarlo acá.

- [ ] **Step 2: Mapper**

```java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.mapper;

import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.entity.BranchBoxOccupationJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class BranchBoxOccupationJpaMapper {

    public BranchBoxOccupationJpaEntity toJpa(BranchBoxOccupation o, Long tenantId) {
        BranchBoxOccupationJpaEntity e = BranchBoxOccupationJpaEntity.builder()
                .id(o.getId())
                .branchId(o.getBranchId())
                .userId(o.getUserId())
                .boxType(o.getBoxType())
                .boxNumber(o.getBoxNumber())
                .occupiedAt(o.getOccupiedAt())
                .releasedAt(o.getReleasedAt())
                .active(o.getActive())
                .build();
        e.setTenantId(tenantId);
        return e;
    }

    public BranchBoxOccupation toDomain(BranchBoxOccupationJpaEntity e) {
        return BranchBoxOccupation.builder()
                .id(e.getId())
                .tenantId(e.getTenantId())
                .branchId(e.getBranchId())
                .userId(e.getUserId())
                .boxType(e.getBoxType())
                .boxNumber(e.getBoxNumber())
                .occupiedAt(e.getOccupiedAt())
                .releasedAt(e.getReleasedAt())
                .active(e.getActive())
                .version(e.getVersion())
                .build();
    }
}
```

- [ ] **Step 3: JpaRepository**

```java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.repository;

import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.entity.BranchBoxOccupationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchBoxOccupationJpaRepository extends JpaRepository<BranchBoxOccupationJpaEntity, Long> {

    @Query("SELECT o FROM BranchBoxOccupationJpaEntity o " +
           "WHERE o.branchId = :branchId AND o.boxType = :boxType AND o.tenantId = :tenantId AND o.active = true")
    List<BranchBoxOccupationJpaEntity> findActiveByBranchAndType(Long branchId, BoxType boxType, Long tenantId);

    @Query("SELECT o FROM BranchBoxOccupationJpaEntity o " +
           "WHERE o.branchId = :branchId AND o.boxType = :boxType AND o.userId = :userId AND o.tenantId = :tenantId AND o.active = true")
    Optional<BranchBoxOccupationJpaEntity> findActiveByUser(Long branchId, BoxType boxType, Long userId, Long tenantId);

    @Query("SELECT o FROM BranchBoxOccupationJpaEntity o " +
           "WHERE o.branchId = :branchId AND o.boxType = :boxType AND o.boxNumber = :boxNumber AND o.tenantId = :tenantId AND o.active = true")
    Optional<BranchBoxOccupationJpaEntity> findActiveByBox(Long branchId, BoxType boxType, int boxNumber, Long tenantId);

    @Modifying
    @Query("UPDATE BranchBoxOccupationJpaEntity o SET o.releasedAt = CURRENT_TIMESTAMP, o.active = null WHERE o.active = true")
    int bulkReleaseAllActive();
}
```

- [ ] **Step 4: Adapter**

```java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.adapter;

import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.mapper.BranchBoxOccupationJpaMapper;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.repository.BranchBoxOccupationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BranchBoxOccupationRepositoryAdapter implements BranchBoxOccupationRepositoryPort {

    private final BranchBoxOccupationJpaRepository jpa;
    private final BranchBoxOccupationJpaMapper mapper;

    @Override
    public List<BranchBoxOccupation> findActiveByBranchAndType(Long branchId, BoxType boxType, Long tenantId) {
        return jpa.findActiveByBranchAndType(branchId, boxType, tenantId).stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    public Optional<BranchBoxOccupation> findActiveByUser(Long branchId, BoxType boxType, Long userId, Long tenantId) {
        return jpa.findActiveByUser(branchId, boxType, userId, tenantId).map(mapper::toDomain);
    }

    @Override
    public Optional<BranchBoxOccupation> findActiveByBox(Long branchId, BoxType boxType, int boxNumber, Long tenantId) {
        return jpa.findActiveByBox(branchId, boxType, boxNumber, tenantId).map(mapper::toDomain);
    }

    @Override
    public BranchBoxOccupation save(BranchBoxOccupation o, Long tenantId) {
        var entity = mapper.toJpa(o, tenantId);
        return mapper.toDomain(jpa.save(entity));
    }

    @Override
    @Transactional
    public int releaseAllActive() {
        return jpa.bulkReleaseAllActive();
    }
}
```

- [ ] **Step 5: Build OK**

```
./mvnw.cmd -q compile
```

- [ ] **Step 6: Commit**

```
git add src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/
git commit -m "feat(sucursales): persistence layer de branch_box_occupation (KAN-XX)"
```

---

## Task 4: Use cases — Occupy + Release + List + tests

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/OccupyBoxUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ReleaseBoxUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ListBranchBoxOccupationsUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/application/usecase/ReleaseAllBoxOccupationsUseCase.java`
- Test: `src/test/java/lab/laboratorio/modules/sucursales/application/usecase/OccupyBoxUseCaseTest.java`
- Test: `src/test/java/lab/laboratorio/modules/sucursales/application/usecase/ReleaseBoxUseCaseTest.java`

- [ ] **Step 1: Tests primero (TDD) — OccupyBoxUseCase**

Buscar tests del módulo sucursales para copiar el estilo (`CreateBranchUseCaseTest.java` o equivalente). Si usan Mockito + JUnit5, replicar.

```java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.modules.sucursales.domain.exception.BoxAlreadyOccupiedException;
import lab.laboratorio.modules.sucursales.domain.exception.InvalidBoxNumberException;
import lab.laboratorio.modules.sucursales.domain.model.*;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lab.laboratorio.modules.sucursales.domain.port.BranchRepositoryPort;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OccupyBoxUseCaseTest {

    private BranchBoxOccupationRepositoryPort occupationRepo;
    private BranchRepositoryPort branchRepo;
    private TenantProvider tenantProvider;
    private CurrentUserProvider currentUser;
    private OccupyBoxUseCase useCase;

    @BeforeEach
    void setup() {
        occupationRepo = mock(BranchBoxOccupationRepositoryPort.class);
        branchRepo = mock(BranchRepositoryPort.class);
        tenantProvider = mock(TenantProvider.class);
        currentUser = mock(CurrentUserProvider.class);
        useCase = new OccupyBoxUseCase(occupationRepo, branchRepo, tenantProvider, currentUser);

        when(tenantProvider.requireTenantId()).thenReturn(1L);
        when(currentUser.requireUserId()).thenReturn(10002L);
        when(branchRepo.findById(eq(1001L), eq(1L))).thenReturn(Optional.of(
            Branch.builder().id(1001L).atencionBoxesCount(6).extraccionBoxesCount(3).build()
        ));
    }

    @Test
    void occupy_succeeds_when_box_in_range_and_free() {
        when(occupationRepo.findActiveByUser(1001L, BoxType.ATENCION, 10002L, 1L)).thenReturn(Optional.empty());
        when(occupationRepo.findActiveByBox(1001L, BoxType.ATENCION, 3, 1L)).thenReturn(Optional.empty());
        when(occupationRepo.save(any(), eq(1L))).thenAnswer(inv -> {
            var o = (BranchBoxOccupation) inv.getArgument(0);
            o.setId(99L);
            return o;
        });

        var result = useCase.execute(new OccupyBoxUseCase.Input(1001L, BoxType.ATENCION, 3));

        assertThat(result.getBoxNumber()).isEqualTo(3);
        assertThat(result.getActive()).isTrue();
        assertThat(result.getId()).isEqualTo(99L);
    }

    @Test
    void occupy_throws_when_box_out_of_range() {
        assertThatThrownBy(() -> useCase.execute(new OccupyBoxUseCase.Input(1001L, BoxType.ATENCION, 99)))
            .isInstanceOf(InvalidBoxNumberException.class);
    }

    @Test
    void occupy_throws_when_box_zero_or_negative() {
        assertThatThrownBy(() -> useCase.execute(new OccupyBoxUseCase.Input(1001L, BoxType.ATENCION, 0)))
            .isInstanceOf(InvalidBoxNumberException.class);
    }

    @Test
    void occupy_releases_previous_user_occupation() {
        var previous = BranchBoxOccupation.builder().id(50L).branchId(1001L).boxType(BoxType.ATENCION)
                .boxNumber(2).userId(10002L).active(true).build();
        when(occupationRepo.findActiveByUser(1001L, BoxType.ATENCION, 10002L, 1L)).thenReturn(Optional.of(previous));
        when(occupationRepo.findActiveByBox(1001L, BoxType.ATENCION, 5, 1L)).thenReturn(Optional.empty());
        when(occupationRepo.save(any(), eq(1L))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(new OccupyBoxUseCase.Input(1001L, BoxType.ATENCION, 5));

        // verify save called twice: once for previous (release), once for new occupy
        verify(occupationRepo, times(2)).save(any(), eq(1L));
        ArgumentCaptor<BranchBoxOccupation> captor = ArgumentCaptor.forClass(BranchBoxOccupation.class);
        verify(occupationRepo, times(2)).save(captor.capture(), eq(1L));
        var released = captor.getAllValues().get(0);
        assertThat(released.getActive()).isNull();
        assertThat(released.getReleasedAt()).isNotNull();
    }

    @Test
    void occupy_throws_when_box_taken_by_another() {
        when(occupationRepo.findActiveByUser(1001L, BoxType.ATENCION, 10002L, 1L)).thenReturn(Optional.empty());
        var other = BranchBoxOccupation.builder().userId(99999L).boxNumber(3).active(true).build();
        when(occupationRepo.findActiveByBox(1001L, BoxType.ATENCION, 3, 1L)).thenReturn(Optional.of(other));

        assertThatThrownBy(() -> useCase.execute(new OccupyBoxUseCase.Input(1001L, BoxType.ATENCION, 3)))
            .isInstanceOf(BoxAlreadyOccupiedException.class);
    }
}
```

- [ ] **Step 2: Implementación OccupyBoxUseCase**

```java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.application.usecase.UseCase;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.sucursales.domain.exception.BoxAlreadyOccupiedException;
import lab.laboratorio.modules.sucursales.domain.exception.BranchNotFoundException;
import lab.laboratorio.modules.sucursales.domain.exception.InvalidBoxNumberException;
import lab.laboratorio.modules.sucursales.domain.model.*;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lab.laboratorio.modules.sucursales.domain.port.BranchRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OccupyBoxUseCase implements UseCase<OccupyBoxUseCase.Input, BranchBoxOccupation> {

    private final BranchBoxOccupationRepositoryPort occupationRepo;
    private final BranchRepositoryPort branchRepo;
    private final TenantProvider tenantProvider;
    private final CurrentUserProvider currentUser;

    @Override
    @Transactional
    public BranchBoxOccupation execute(Input input) {
        Long tenantId = tenantProvider.requireTenantId();
        Long userId = currentUser.requireUserId();

        Branch branch = branchRepo.findById(input.branchId(), tenantId)
                .orElseThrow(() -> new BranchNotFoundException(input.branchId()));

        int max = switch (input.boxType()) {
            case ATENCION -> branch.getAtencionBoxesCount();
            case EXTRACCION -> branch.getExtraccionBoxesCount();
        };
        if (input.boxNumber() < 1 || input.boxNumber() > max) {
            throw new InvalidBoxNumberException(input.boxNumber(), max);
        }

        // Liberar occupation previa del user (si la hay)
        occupationRepo.findActiveByUser(input.branchId(), input.boxType(), userId, tenantId)
                .ifPresent(prev -> {
                    prev.release();
                    occupationRepo.save(prev, tenantId);
                });

        // Validar que el box no está tomado por otro user
        occupationRepo.findActiveByBox(input.branchId(), input.boxType(), input.boxNumber(), tenantId)
                .filter(o -> !o.getUserId().equals(userId))
                .ifPresent(taken -> { throw new BoxAlreadyOccupiedException(taken.getBoxNumber()); });

        BranchBoxOccupation newOccupation = BranchBoxOccupation.occupy(
                tenantId, input.branchId(), userId, input.boxType(), input.boxNumber());
        return occupationRepo.save(newOccupation, tenantId);
    }

    public record Input(Long branchId, BoxType boxType, int boxNumber) {}
}
```

- [ ] **Step 3: ReleaseBoxUseCase + spec**

```java
// Test:
package lab.laboratorio.modules.sucursales.application.usecase;
// imports, setup similar al de OccupyBoxUseCaseTest

class ReleaseBoxUseCaseTest {
    // ... mocks
    @Test
    void release_marks_occupation_released_and_inactive() {
        var active = BranchBoxOccupation.builder().id(50L).active(true).build();
        when(occupationRepo.findActiveByUser(1001L, BoxType.ATENCION, 10002L, 1L)).thenReturn(Optional.of(active));
        when(occupationRepo.save(any(), eq(1L))).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(new ReleaseBoxUseCase.Input(1001L, BoxType.ATENCION));

        assertThat(active.getActive()).isNull();
        assertThat(active.getReleasedAt()).isNotNull();
        verify(occupationRepo).save(active, 1L);
    }

    @Test
    void release_is_noop_when_no_active_occupation() {
        when(occupationRepo.findActiveByUser(1001L, BoxType.ATENCION, 10002L, 1L)).thenReturn(Optional.empty());
        useCase.execute(new ReleaseBoxUseCase.Input(1001L, BoxType.ATENCION));
        verify(occupationRepo, never()).save(any(), anyLong());
    }
}
```

```java
// Implementación:
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.application.usecase.UseCase;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReleaseBoxUseCase implements UseCase<ReleaseBoxUseCase.Input, Void> {

    private final BranchBoxOccupationRepositoryPort occupationRepo;
    private final TenantProvider tenantProvider;
    private final CurrentUserProvider currentUser;

    @Override
    @Transactional
    public Void execute(Input input) {
        Long tenantId = tenantProvider.requireTenantId();
        Long userId = currentUser.requireUserId();
        occupationRepo.findActiveByUser(input.branchId(), input.boxType(), userId, tenantId)
                .ifPresent(o -> {
                    o.release();
                    occupationRepo.save(o, tenantId);
                });
        return null;
    }

    public record Input(Long branchId, BoxType boxType) {}
}
```

- [ ] **Step 4: ListBranchBoxOccupationsUseCase**

```java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.application.usecase.UseCase;
import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListBranchBoxOccupationsUseCase implements UseCase<ListBranchBoxOccupationsUseCase.Input, List<BranchBoxOccupation>> {

    private final BranchBoxOccupationRepositoryPort occupationRepo;
    private final TenantProvider tenantProvider;

    @Override
    @Transactional(readOnly = true)
    public List<BranchBoxOccupation> execute(Input input) {
        Long tenantId = tenantProvider.requireTenantId();
        return occupationRepo.findActiveByBranchAndType(input.branchId(), input.boxType(), tenantId);
    }

    public record Input(Long branchId, BoxType boxType) {}
}
```

- [ ] **Step 5: ReleaseAllBoxOccupationsUseCase (cron)**

```java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ReleaseAllBoxOccupationsUseCase {

    private final BranchBoxOccupationRepositoryPort occupationRepo;

    /**
     * Marca released_at=NOW, active=null para TODAS las occupations activas.
     * Diseñado para correr a las 00:00 vía cron. Sin tenant scope: bulk global.
     */
    public int execute() {
        return occupationRepo.releaseAllActive();
    }
}
```

- [ ] **Step 6: Build + tests verde**

```
./mvnw.cmd test -Dtest='*BoxUseCase*'
```
Expected: tests pass.

- [ ] **Step 7: Commit**

```
git add src/main/java/lab/laboratorio/modules/sucursales/application/usecase/*Box* \
        src/test/java/lab/laboratorio/modules/sucursales/application/usecase/*Box*
git commit -m "feat(sucursales): use cases Occupy/Release/List/ReleaseAll BoxOccupation (KAN-XX)"
```

---

## Task 5: Controller + DTOs

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/request/OccupyBoxRequest.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/response/BranchBoxOccupationResponse.java`
- Create: `src/main/java/lab/laboratorio/modules/sucursales/presentation/controller/BranchBoxOccupationController.java`

- [ ] **Step 1: DTOs**

```java
package lab.laboratorio.modules.sucursales.presentation.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lab.laboratorio.modules.sucursales.domain.model.BoxType;

public record OccupyBoxRequest(
        @NotNull BoxType boxType,
        @NotNull @Min(1) Integer boxNumber
) {}
```

```java
package lab.laboratorio.modules.sucursales.presentation.dto.response;

import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;

import java.time.Instant;

public record BranchBoxOccupationResponse(
        Long id,
        Long branchId,
        Long userId,
        String userName,        // first_name + last_name del user, lookup en controller
        BoxType boxType,
        int boxNumber,
        Instant occupiedAt
) {
    public static BranchBoxOccupationResponse from(BranchBoxOccupation o, String userName) {
        return new BranchBoxOccupationResponse(
                o.getId(), o.getBranchId(), o.getUserId(), userName,
                o.getBoxType(), o.getBoxNumber(), o.getOccupiedAt());
    }
}
```

- [ ] **Step 2: Controller**

Buscar el patrón de otros controllers del módulo (`BranchTotemConfigController.java`) para autorizaciones (`@PreAuthorize`) y manejo de exceptions.

```java
package lab.laboratorio.modules.sucursales.presentation.controller;

import jakarta.validation.Valid;
import lab.laboratorio.modules.empresa.application.usecase.GetUserByIdUseCase;
import lab.laboratorio.modules.sucursales.application.usecase.*;
import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.presentation.dto.request.OccupyBoxRequest;
import lab.laboratorio.modules.sucursales.presentation.dto.response.BranchBoxOccupationResponse;
import lab.laboratorio.shared.api.ApiPaths;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/branches/{branchId}/box-occupations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SECRETARIA','ADMINISTRADOR')")
public class BranchBoxOccupationController {

    private final OccupyBoxUseCase occupyUseCase;
    private final ReleaseBoxUseCase releaseUseCase;
    private final ListBranchBoxOccupationsUseCase listUseCase;
    private final GetUserByIdUseCase getUserUseCase;  // resolver para userName

    @GetMapping
    public List<BranchBoxOccupationResponse> list(
            @PathVariable Long branchId,
            @RequestParam("type") BoxType boxType) {
        return listUseCase.execute(new ListBranchBoxOccupationsUseCase.Input(branchId, boxType))
                .stream()
                .map(o -> {
                    var user = getUserUseCase.execute(new GetUserByIdUseCase.Input(o.getUserId()));
                    var name = "%s %s".formatted(user.getFirstName(), user.getLastName());
                    return BranchBoxOccupationResponse.from(o, name);
                })
                .collect(Collectors.toList());
    }

    @PutMapping("/me")
    public BranchBoxOccupationResponse occupy(
            @PathVariable Long branchId,
            @Valid @RequestBody OccupyBoxRequest req) {
        var occupation = occupyUseCase.execute(new OccupyBoxUseCase.Input(branchId, req.boxType(), req.boxNumber()));
        var user = getUserUseCase.execute(new GetUserByIdUseCase.Input(occupation.getUserId()));
        var name = "%s %s".formatted(user.getFirstName(), user.getLastName());
        return BranchBoxOccupationResponse.from(occupation, name);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> release(
            @PathVariable Long branchId,
            @RequestParam("type") BoxType boxType) {
        releaseUseCase.execute(new ReleaseBoxUseCase.Input(branchId, boxType));
        return ResponseEntity.noContent().build();
    }
}
```

> Si `GetUserByIdUseCase` no existe en `empresa`, buscar el equivalente que ya use otro controller para resolver datos de usuarios. Si no hay, agregarlo como un sub-task (o resolver inline con `UserJpaRepository`).

- [ ] **Step 3: Mapear las exceptions a HTTP status** en `GlobalExceptionHandler`:

Buscar `GlobalExceptionHandler.java` y agregar handlers:
- `InvalidBoxNumberException` → 400
- `BoxAlreadyOccupiedException` → 409

```java
@ExceptionHandler(InvalidBoxNumberException.class)
ResponseEntity<ApiError> handleInvalidBox(InvalidBoxNumberException ex) {
    log.warn("Invalid box number", ex);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiError(ex.getMessage()));
}

@ExceptionHandler(BoxAlreadyOccupiedException.class)
ResponseEntity<ApiError> handleBoxTaken(BoxAlreadyOccupiedException ex) {
    log.warn("Box already occupied", ex);
    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(ex.getMessage()));
}
```

> Adaptar al patrón existente de `GlobalExceptionHandler` (puede usar `ProblemDetail` en lugar de `ApiError`).

- [ ] **Step 4: Build + arrancar backend + smoke con curl**

```
./mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

En otra terminal, login + curl:
```
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/internal/login -H "Content-Type: application/json" -d '{"email":"secretaria@lab-demo.test","password":"password"}' | jq -r .token)

# List (debería ser [])
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/branches/1001/box-occupations?type=ATENCION"

# Occupy box 3
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"boxType":"ATENCION","boxNumber":3}' \
  http://localhost:8080/api/v1/branches/1001/box-occupations/me

# List nuevamente (debería tener 1 entry)
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/branches/1001/box-occupations?type=ATENCION"

# Release
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/v1/branches/1001/box-occupations/me?type=ATENCION"
```

- [ ] **Step 5: Commit**

```
git add src/main/java/lab/laboratorio/modules/sucursales/presentation/
git commit -m "feat(sucursales): REST BranchBoxOccupationController + DTOs (KAN-XX)"
```

---

## Task 6: Modificar QueueEntry domain + JPA + DTOs (boxNumber String → Integer)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/turnos/domain/model/QueueEntry.java`
- Modify: `src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/QueueEntryJpaEntity.java`
- Modify: `src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/QueueEntryJpaMapper.java`
- Modify: `src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java`
- Modify: `src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/PublicQueueEntryResponse.java`

- [ ] **Step 1: QueueEntry — cambiar tipo y agregar withBoxNumber**

En `QueueEntry.java`:
- Cambiar `private String boxNumber;` por `private Integer boxNumber;`
- Cambiar el constructor: `Integer boxNumber` (donde estaba String)
- Cambiar el getter: `public Integer getBoxNumber() { return boxNumber; }`
- Modificar `recordCall(Instant calledAt)` para que acepte también `Integer fromBox`:

```java
public QueueEntry recordCall(Instant calledAt, Integer fromBox) {
    return new QueueEntry(id, tenantId, branchId, appointmentId, publicCode,
            nationalId, patientId, hasAppointment,
            status, attendedAt, fromBox,
            calledAt, callCount + 1, createdAt);
}
```

(Deja la versión anterior `recordCall(Instant)` si hay callers existentes — o reemplaza y ajusta. Buscar `recordCall(` para ver quién llama.)

- [ ] **Step 2: QueueEntryJpaEntity — cambiar tipo**

```java
@Column(name = "box_number")
private Integer boxNumber;
```

(Quitar `length = 10`.)

- [ ] **Step 3: Mapper — adaptar**

Si el mapper tenía `e.setBoxNumber(domain.getBoxNumber())` o similar, con el cambio de tipo Java se mapea solo. Verificar que no haya `String.valueOf` o `Integer.parseInt` que ya no aplican.

- [ ] **Step 4: PublicQueueEntryResponse — agregar field**

```java
public record PublicQueueEntryResponse(
        Long id,
        String publicCode,
        QueueStatus status,
        Instant lastCalledAt,
        int callCount,
        Instant createdAt,
        Integer boxNumber) {

    public static PublicQueueEntryResponse from(QueueEntry entry) {
        return new PublicQueueEntryResponse(
                entry.getId(),
                entry.getPublicCode(),
                entry.getStatus(),
                entry.getLastCalledAt(),
                entry.getCallCount(),
                entry.getCreatedAt(),
                entry.getBoxNumber());
    }
}
```

- [ ] **Step 5: QueueEntryResponse — `String boxNumber` → `Integer boxNumber`**

Cambio mecánico de tipo.

- [ ] **Step 6: Build + tests existentes verde**

```
./mvnw.cmd test -Dtest='*QueueEntry*,*Queue*'
```

Si algún test compara `boxNumber.equals("1")` (String) hay que adaptarlo a `Integer.valueOf(1)`. Si encuentra un fail, ajustar.

- [ ] **Step 7: Commit**

```
git add src/main/java/lab/laboratorio/modules/turnos/domain/model/QueueEntry.java \
        src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/QueueEntryJpaEntity.java \
        src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/QueueEntryJpaMapper.java \
        src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java \
        src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/PublicQueueEntryResponse.java
git commit -m "refactor(turnos): QueueEntry.boxNumber String -> Integer + expose en PublicQueueEntry (KAN-XX)"
```

---

## Task 7: Modificar CallQueueEntryUseCase para capturar box del operador

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCase.java`

- [ ] **Step 1: Inyectar dependencias nuevas**

Agregar al constructor (Lombok `@RequiredArgsConstructor` lo resuelve):
- `BranchBoxOccupationRepositoryPort occupationRepo`
- `CurrentUserProvider currentUser`

- [ ] **Step 2: Modificar execute()**

```java
@Transactional
@Override
public QueueEntry execute(Input input) {
    moduleGuard.requireEnabled(ModuleCode.TURNOS);
    Long tenantId = tenantProvider.requireTenantId();

    QueueEntry entry = queueEntryRepository.findById(input.id(), tenantId)
            .orElseThrow(() -> new QueueEntryNotFoundException(input.id()));

    String userSub = userSubProvider.currentUserSub().orElse(null);
    if (!userBranchPort.canAccessBranch(userSub, entry.getBranchId(), tenantId)) {
        throw new AccessDeniedException("Access to branch denied");
    }

    if (entry.getStatus() != QueueStatus.PENDING) {
        throw new QueueEntryNotCallableException(input.id(), entry.getStatus().name());
    }

    // KAN-XX: leer occupation activa del operador para capturar su box.
    Integer fromBox = currentUser.getUserId()
            .flatMap(uid -> occupationRepo.findActiveByUser(entry.getBranchId(), BoxType.ATENCION, uid, tenantId))
            .map(BranchBoxOccupation::getBoxNumber)
            .orElse(null);
    if (fromBox == null) {
        log.warn("[call] queue_entry {} llamado sin occupation activa del operador (caller={}). " +
                "queue_entries.box_number quedará en NULL.", input.id(), userSub);
    }

    QueueEntry called = entry.recordCall(Instant.now(), fromBox);
    return queueEntryRepository.save(called, tenantId);
}
```

Agregar imports:
```java
import lab.laboratorio.modules.sucursales.domain.model.BoxType;
import lab.laboratorio.modules.sucursales.domain.model.BranchBoxOccupation;
import lab.laboratorio.modules.sucursales.domain.port.BranchBoxOccupationRepositoryPort;
import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lombok.extern.slf4j.Slf4j;
```

Agregar `@Slf4j` al class.

- [ ] **Step 3: Tests del use case modificado**

Buscar `CallQueueEntryUseCaseTest.java` y agregar:

```java
@Test
void execute_setsBoxNumber_fromOperatorOccupation() {
    // entry PENDING, operator tiene occupation ATENCION box=4
    when(occupationRepo.findActiveByUser(eq(1001L), eq(BoxType.ATENCION), eq(10002L), eq(1L)))
        .thenReturn(Optional.of(BranchBoxOccupation.builder().boxNumber(4).build()));
    when(currentUser.getUserId()).thenReturn(Optional.of(10002L));
    // ... setup del resto del mock

    var result = useCase.execute(new CallQueueEntryUseCase.Input(99L));
    assertThat(result.getBoxNumber()).isEqualTo(4);
}

@Test
void execute_setsBoxNumberNull_whenNoOccupation() {
    when(occupationRepo.findActiveByUser(any(), any(), any(), any())).thenReturn(Optional.empty());
    when(currentUser.getUserId()).thenReturn(Optional.of(10002L));
    var result = useCase.execute(new CallQueueEntryUseCase.Input(99L));
    assertThat(result.getBoxNumber()).isNull();
}
```

- [ ] **Step 4: Build + tests**

```
./mvnw.cmd test -Dtest='CallQueueEntryUseCaseTest'
```

- [ ] **Step 5: Commit**

```
git add src/main/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCase.java \
        src/test/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCaseTest.java
git commit -m "feat(turnos): call captura box del operador desde branch_box_occupation (KAN-XX)"
```

---

## Task 8: Cron scheduler + @EnableScheduling

**Files:**
- Create: `src/main/java/lab/laboratorio/infrastructure/config/SchedulingConfig.java` (si no existe)
- Create: `src/main/java/lab/laboratorio/modules/sucursales/infrastructure/scheduling/BoxOccupationCleanupScheduler.java`

- [ ] **Step 1: Buscar si ya hay @EnableScheduling activo**

```
grep -rn "@EnableScheduling" "C:/Users/Mateo/Desktop/tesis/Backend/src/main/java"
```

Si no aparece, crear `SchedulingConfig`:
```java
package lab.laboratorio.infrastructure.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {}
```

- [ ] **Step 2: Crear el scheduler**

```java
package lab.laboratorio.modules.sucursales.infrastructure.scheduling;

import lab.laboratorio.modules.sucursales.application.usecase.ReleaseAllBoxOccupationsUseCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BoxOccupationCleanupScheduler {

    private final ReleaseAllBoxOccupationsUseCase releaseAllUseCase;

    /**
     * Corre todos los días a las 00:00. Marca released_at=NOW y active=null
     * en TODAS las occupations activas (todas las sucursales, todos los tenants).
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void cleanupAllOccupations() {
        int n = releaseAllUseCase.execute();
        if (n > 0) log.info("[box-occupation-cleanup] liberadas {} occupations activas", n);
    }
}
```

- [ ] **Step 3: Test rápido en dev**

Cambiar el cron a uno cada 5 minutos para validar (`"0 */5 * * * *"`), arrancar el backend, esperar, confirmar log. Después revertir al `"0 0 0 * * *"`.

- [ ] **Step 4: Commit**

```
git add src/main/java/lab/laboratorio/infrastructure/config/SchedulingConfig.java \
        src/main/java/lab/laboratorio/modules/sucursales/infrastructure/scheduling/BoxOccupationCleanupScheduler.java
git commit -m "feat(sucursales): cron diario a 00:00 libera box occupations activas (KAN-XX)"
```

---

## Task 9: Frontend — model + service + NgRx store

**Files:**
- Create: `src/app/features/turnos/box-occupation/models/box-occupation.model.ts`
- Create: `src/app/features/turnos/box-occupation/services/box-occupation.service.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.state.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.actions.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.reducer.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.effects.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.selectors.ts`
- Create: `src/app/features/turnos/box-occupation/store/box-occupation.reducer.spec.ts`

- [ ] **Step 1: Modelo TS**

```ts
// box-occupation.model.ts
export type BoxType = 'ATENCION' | 'EXTRACCION';

export interface BoxOccupation {
  id: number;
  branchId: number;
  userId: number;
  userName: string;
  boxType: BoxType;
  boxNumber: number;
  occupiedAt: string;
}

export interface OccupyBoxInput {
  boxType: BoxType;
  boxNumber: number;
}
```

- [ ] **Step 2: Service**

```ts
// box-occupation.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BoxOccupation, BoxType, OccupyBoxInput } from '../models/box-occupation.model';

@Injectable({ providedIn: 'root' })
export class BoxOccupationService {
  private http = inject(HttpClient);

  list(branchId: number, type: BoxType): Observable<BoxOccupation[]> {
    return this.http.get<BoxOccupation[]>(
      `/api/v1/branches/${branchId}/box-occupations`,
      { params: { type } },
    );
  }

  occupy(branchId: number, input: OccupyBoxInput): Observable<BoxOccupation> {
    return this.http.put<BoxOccupation>(
      `/api/v1/branches/${branchId}/box-occupations/me`,
      input,
    );
  }

  release(branchId: number, type: BoxType): Observable<void> {
    return this.http.delete<void>(
      `/api/v1/branches/${branchId}/box-occupations/me`,
      { params: { type } },
    );
  }
}
```

- [ ] **Step 3: State + Actions + Reducer + Selectors**

```ts
// box-occupation.state.ts
import { BoxOccupation } from '../models/box-occupation.model';

export const BOX_OCCUPATION_FEATURE_KEY = 'boxOccupation';

export interface BoxOccupationState {
  occupations: BoxOccupation[];
  loading: boolean;
  error: string | null;
}

export const initialBoxOccupationState: BoxOccupationState = {
  occupations: [],
  loading: false,
  error: null,
};
```

```ts
// box-occupation.actions.ts
import { createAction, props } from '@ngrx/store';
import { BoxOccupation, BoxType, OccupyBoxInput } from '../models/box-occupation.model';

export const loadBoxOccupations = createAction(
  '[BoxOccupation] Load',
  props<{ branchId: number; boxType: BoxType }>(),
);
export const loadBoxOccupationsSuccess = createAction(
  '[BoxOccupation] Load Success',
  props<{ occupations: BoxOccupation[] }>(),
);
export const loadBoxOccupationsFailure = createAction(
  '[BoxOccupation] Load Failure',
  props<{ error: string }>(),
);

export const occupyBox = createAction(
  '[BoxOccupation] Occupy',
  props<{ branchId: number; input: OccupyBoxInput }>(),
);
export const occupyBoxSuccess = createAction(
  '[BoxOccupation] Occupy Success',
  props<{ occupation: BoxOccupation }>(),
);
export const occupyBoxFailure = createAction(
  '[BoxOccupation] Occupy Failure',
  props<{ error: string }>(),
);

export const releaseBox = createAction(
  '[BoxOccupation] Release',
  props<{ branchId: number; boxType: BoxType }>(),
);
export const releaseBoxSuccess = createAction(
  '[BoxOccupation] Release Success',
);
export const releaseBoxFailure = createAction(
  '[BoxOccupation] Release Failure',
  props<{ error: string }>(),
);

export const clearBoxOccupations = createAction('[BoxOccupation] Clear');
```

```ts
// box-occupation.reducer.ts
import { createReducer, on } from '@ngrx/store';
import { BoxOccupationState, initialBoxOccupationState } from './box-occupation.state';
import * as A from './box-occupation.actions';

export const boxOccupationReducer = createReducer(
  initialBoxOccupationState,
  on(A.loadBoxOccupations, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.loadBoxOccupationsSuccess, (s, { occupations }): BoxOccupationState => ({ ...s, loading: false, occupations })),
  on(A.loadBoxOccupationsFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.occupyBox, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.occupyBoxSuccess, (s): BoxOccupationState => ({ ...s, loading: false })),
  on(A.occupyBoxFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.releaseBox, (s): BoxOccupationState => ({ ...s, loading: true, error: null })),
  on(A.releaseBoxSuccess, (s): BoxOccupationState => ({ ...s, loading: false })),
  on(A.releaseBoxFailure, (s, { error }): BoxOccupationState => ({ ...s, loading: false, error })),

  on(A.clearBoxOccupations, (): BoxOccupationState => initialBoxOccupationState),
);
```

```ts
// box-occupation.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { MessageService } from 'primeng/api';
import { BoxOccupationService } from '../services/box-occupation.service';
import * as A from './box-occupation.actions';

@Injectable()
export class BoxOccupationEffects {
  private actions$ = inject(Actions);
  private service = inject(BoxOccupationService);
  private toast = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadBoxOccupations),
    switchMap(({ branchId, boxType }) => this.service.list(branchId, boxType).pipe(
      map(occupations => A.loadBoxOccupationsSuccess({ occupations })),
      catchError(error => of(A.loadBoxOccupationsFailure({ error: String(error?.message ?? error) }))),
    )),
  ));

  occupy$ = createEffect(() => this.actions$.pipe(
    ofType(A.occupyBox),
    switchMap(({ branchId, input }) => this.service.occupy(branchId, input).pipe(
      switchMap(occupation => of(
        A.occupyBoxSuccess({ occupation }),
        A.loadBoxOccupations({ branchId, boxType: input.boxType }),  // refresh
      )),
      catchError(error => {
        const msg = error?.status === 409
          ? (error?.error?.message ?? 'Ese box ya fue ocupado, refrescá.')
          : 'No se pudo ocupar el box.';
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.occupyBoxFailure({ error: msg }));
      }),
    )),
  ));

  release$ = createEffect(() => this.actions$.pipe(
    ofType(A.releaseBox),
    switchMap(({ branchId, boxType }) => this.service.release(branchId, boxType).pipe(
      switchMap(() => of(
        A.releaseBoxSuccess(),
        A.loadBoxOccupations({ branchId, boxType }),  // refresh
      )),
      catchError(error => of(A.releaseBoxFailure({ error: String(error?.message ?? error) }))),
    )),
  ));
}
```

```ts
// box-occupation.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BoxOccupationState, BOX_OCCUPATION_FEATURE_KEY } from './box-occupation.state';

export const selectBoxOccupationState = createFeatureSelector<BoxOccupationState>(BOX_OCCUPATION_FEATURE_KEY);
export const selectAllOccupations = createSelector(selectBoxOccupationState, s => s.occupations);
export const selectOccupationsLoading = createSelector(selectBoxOccupationState, s => s.loading);
export const selectMyOccupation = (currentUserId: number) =>
  createSelector(selectAllOccupations, list => list.find(o => o.userId === currentUserId) ?? null);
```

- [ ] **Step 4: Spec del reducer (smoke)**

```ts
// box-occupation.reducer.spec.ts
import { boxOccupationReducer } from './box-occupation.reducer';
import { initialBoxOccupationState } from './box-occupation.state';
import * as A from './box-occupation.actions';

describe('boxOccupationReducer', () => {
  it('loadBoxOccupationsSuccess populates occupations', () => {
    const result = boxOccupationReducer(initialBoxOccupationState, A.loadBoxOccupationsSuccess({
      occupations: [
        { id: 1, branchId: 1001, userId: 10002, userName: 'Ana R.', boxType: 'ATENCION', boxNumber: 2, occupiedAt: '2026-06-05T09:00:00Z' },
      ],
    }));
    expect(result.occupations).toHaveLength(1);
    expect(result.loading).toBe(false);
  });

  it('clearBoxOccupations resets state', () => {
    const populated = boxOccupationReducer(initialBoxOccupationState, A.loadBoxOccupationsSuccess({
      occupations: [{ id: 1, branchId: 1001, userId: 10002, userName: 'A', boxType: 'ATENCION', boxNumber: 1, occupiedAt: '' }],
    }));
    const cleared = boxOccupationReducer(populated, A.clearBoxOccupations());
    expect(cleared.occupations).toHaveLength(0);
  });
});
```

- [ ] **Step 5: Verify + commit**

```
cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO"
npx ng test --no-watch --include='src/app/features/turnos/box-occupation/**/*.spec.ts'
git add src/app/features/turnos/box-occupation/
git commit -m "feat(turnos): scaffold box-occupation feature (model + service + store) (KAN-XX)"
```

---

## Task 10: Componentes BoxSelectorModal + BoxOccupationWidget

**Files:**
- Create: `src/app/features/turnos/box-occupation/components/box-selector-modal.component.{ts,html,scss}`
- Create: `src/app/features/turnos/box-occupation/components/box-selector-modal.component.spec.ts`
- Create: `src/app/features/turnos/box-occupation/components/box-occupation-widget.component.{ts,html,scss}`

- [ ] **Step 1: BoxSelectorModalComponent — TS**

```ts
// box-selector-modal.component.ts
import {
  ChangeDetectionStrategy, Component, Input, Output, EventEmitter,
  computed, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { BoxType, BoxOccupation } from '../models/box-occupation.model';
import { selectAllOccupations, selectMyOccupation } from '../store/box-occupation.selectors';
import { occupyBox } from '../store/box-occupation.actions';

@Component({
  selector: 'app-box-selector-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './box-selector-modal.component.html',
  styleUrl: './box-selector-modal.component.scss',
})
export class BoxSelectorModalComponent {
  @Input({ required: true }) branchId!: number;
  @Input({ required: true }) totalBoxes!: number;
  @Input() boxType: BoxType = 'ATENCION';
  @Input() currentUserId!: number;
  @Input() visible: boolean = false;
  @Input() canClose: boolean = false;

  @Output() closed = new EventEmitter<void>();

  private store = inject(Store);
  protected readonly allOccupations = this.store.selectSignal(selectAllOccupations);
  protected readonly myOccupation = computed(() =>
    this.allOccupations().find(o => o.userId === this.currentUserId) ?? null,
  );

  protected slots = computed(() => {
    const map = new Map<number, BoxOccupation>();
    for (const o of this.allOccupations()) {
      if (o.boxType === this.boxType) map.set(o.boxNumber, o);
    }
    return Array.from({ length: this.totalBoxes }, (_, i) => {
      const n = i + 1;
      return { boxNumber: n, occupation: map.get(n) ?? null };
    });
  });

  protected allOccupied = computed(() => this.slots().every(s => s.occupation !== null));

  onSlotClick(boxNumber: number, occupied: BoxOccupation | null) {
    if (occupied && occupied.userId !== this.currentUserId) return;  // ocupado por otro
    if (occupied && occupied.userId === this.currentUserId) return;  // ya es mi box
    this.store.dispatch(occupyBox({ branchId: this.branchId, input: { boxType: this.boxType, boxNumber } }));
    this.closed.emit();
  }

  onClose() {
    if (this.canClose) this.closed.emit();
  }
}
```

- [ ] **Step 2: BoxSelectorModalComponent — HTML**

```html
<!-- box-selector-modal.component.html -->
<p-dialog
  [visible]="visible"
  [modal]="true"
  [closable]="canClose"
  [closeOnEscape]="canClose"
  [dismissableMask]="canClose"
  [header]="myOccupation() ? 'Cambiar de box' : 'Elegí tu box para empezar tu turno'"
  styleClass="ui-box-selector-dialog"
  [style]="{ width: '480px' }"
  (onHide)="onClose()">

  @if (allOccupied() && !myOccupation()) {
    <div class="all-occupied">
      <i class="pi pi-exclamation-triangle"></i>
      <p>Todos los boxes están ocupados.<br>Pedí a alguien que libere o aumentá la cantidad en Configuración de sucursal.</p>
      @if (canClose) {
        <p-button label="Cerrar" (onClick)="onClose()" />
      }
    </div>
  } @else {
    <div class="boxes-grid">
      @for (slot of slots(); track slot.boxNumber) {
        <button
          type="button"
          class="box-slot"
          [class.box-slot--free]="!slot.occupation"
          [class.box-slot--occupied]="slot.occupation && slot.occupation.userId !== currentUserId"
          [class.box-slot--mine]="slot.occupation && slot.occupation.userId === currentUserId"
          [disabled]="!!slot.occupation"
          (click)="onSlotClick(slot.boxNumber, slot.occupation)">
          <div class="box-slot__label">Box {{ slot.boxNumber }}</div>
          @if (slot.occupation && slot.occupation.userId !== currentUserId) {
            <div class="box-slot__user">{{ slot.occupation.userName }}</div>
          } @else if (slot.occupation && slot.occupation.userId === currentUserId) {
            <div class="box-slot__user"><i class="pi pi-check"></i> Tu box</div>
          }
        </button>
      }
    </div>
    <div class="legend">Verde = libre · Gris = ocupado</div>
  }
</p-dialog>
```

- [ ] **Step 3: BoxSelectorModalComponent — SCSS**

```scss
// box-selector-modal.component.scss
.boxes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.box-slot {
  appearance: none;
  border: 2px solid #cbd5e1;
  background: white;
  padding: 1rem 0.5rem;
  border-radius: 0.5rem;
  text-align: center;
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: background 120ms, border-color 120ms;

  &__label { font-weight: 700; }
  &__user { font-size: 0.75rem; font-weight: 500; }

  &--free {
    border-color: #059669;
    background: #ecfdf5;
    color: #059669;
    &:hover { background: #d1fae5; }
  }
  &--occupied {
    background: #f1f5f9;
    color: #94a3b8;
    cursor: not-allowed;
  }
  &--mine {
    border-color: #059669;
    border-width: 3px;
    background: #ecfdf5;
    color: #059669;
    cursor: default;
  }
}

.legend {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: #94a3b8;
  text-align: right;
}

.all-occupied {
  text-align: center;
  padding: 1rem;
  color: #6b7280;

  .pi-exclamation-triangle { font-size: 3rem; color: #f59e0b; }
  p { margin: 1rem 0; }
}
```

- [ ] **Step 4: Spec del modal**

```ts
// box-selector-modal.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BoxSelectorModalComponent } from './box-selector-modal.component';
import { BOX_OCCUPATION_FEATURE_KEY } from '../store/box-occupation.state';

describe('BoxSelectorModalComponent', () => {
  let fixture: ComponentFixture<BoxSelectorModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BoxSelectorModalComponent],
      providers: [
        provideAnimationsAsync(),
        provideMockStore({
          initialState: {
            [BOX_OCCUPATION_FEATURE_KEY]: {
              occupations: [
                { id: 1, branchId: 1001, userId: 10005, userName: 'Lucía', boxType: 'ATENCION', boxNumber: 2, occupiedAt: '' },
              ],
              loading: false, error: null,
            },
          },
        }),
      ],
    });
    fixture = TestBed.createComponent(BoxSelectorModalComponent);
    fixture.componentRef.setInput('branchId', 1001);
    fixture.componentRef.setInput('totalBoxes', 4);
    fixture.componentRef.setInput('currentUserId', 10002);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
  });

  it('renders N slots', () => {
    const slots = fixture.nativeElement.querySelectorAll('.box-slot');
    expect(slots.length).toBe(4);
  });

  it('renders occupied slot with user name', () => {
    const occupiedSlot = fixture.nativeElement.querySelectorAll('.box-slot--occupied');
    expect(occupiedSlot.length).toBe(1);
    expect(occupiedSlot[0].textContent).toContain('Lucía');
  });
});
```

- [ ] **Step 5: BoxOccupationWidget — TS**

```ts
// box-occupation-widget.component.ts
import {
  ChangeDetectionStrategy, Component, Input,
  computed, inject, signal,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { BoxType } from '../models/box-occupation.model';
import { selectAllOccupations } from '../store/box-occupation.selectors';
import { releaseBox } from '../store/box-occupation.actions';
import { BoxSelectorModalComponent } from './box-selector-modal.component';

@Component({
  selector: 'app-box-occupation-widget',
  standalone: true,
  imports: [ButtonModule, MenuModule, BoxSelectorModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './box-occupation-widget.component.html',
  styleUrl: './box-occupation-widget.component.scss',
})
export class BoxOccupationWidgetComponent {
  @Input({ required: true }) branchId!: number;
  @Input({ required: true }) currentUserId!: number;
  @Input({ required: true }) totalBoxes!: number;
  @Input() boxType: BoxType = 'ATENCION';

  private store = inject(Store);
  protected readonly modalVisible = signal(false);

  protected readonly myBox = computed(() => {
    const all = this.store.selectSignal(selectAllOccupations)();
    return all.find(o => o.userId === this.currentUserId && o.boxType === this.boxType) ?? null;
  });

  protected readonly menuItems: MenuItem[] = [
    { label: 'Cambiar box', icon: 'pi pi-refresh', command: () => this.modalVisible.set(true) },
    { label: 'Liberar box', icon: 'pi pi-times', command: () => this.onRelease() },
  ];

  onRelease() {
    this.store.dispatch(releaseBox({ branchId: this.branchId, boxType: this.boxType }));
  }
}
```

- [ ] **Step 6: BoxOccupationWidget — HTML + SCSS**

```html
<!-- box-occupation-widget.component.html -->
<div class="box-widget">
  @if (myBox(); as box) {
    <button class="box-widget__pill" (click)="menu.toggle($event)">
      <span class="dot"></span>
      Box {{ box.boxNumber }}
      <i class="pi pi-angle-down"></i>
    </button>
    <p-menu #menu [model]="menuItems" [popup]="true" appendTo="body" />
  } @else {
    <span class="box-widget__no-box">Sin box</span>
  }

  <app-box-selector-modal
    [branchId]="branchId"
    [totalBoxes]="totalBoxes"
    [boxType]="boxType"
    [currentUserId]="currentUserId"
    [visible]="modalVisible()"
    [canClose]="!!myBox()"
    (closed)="modalVisible.set(false)" />
</div>
```

```scss
// box-occupation-widget.component.scss
.box-widget {
  display: inline-flex;
  align-items: center;

  &__pill {
    appearance: none;
    border: 1px solid #059669;
    background: #ecfdf5;
    color: #059669;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;

    .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #059669; }
    &:hover { background: #d1fae5; }
  }

  &__no-box {
    color: #94a3b8;
    font-size: 0.875rem;
    font-style: italic;
  }
}
```

- [ ] **Step 7: Verify + commit**

```
npx ng test --no-watch --include='src/app/features/turnos/box-occupation/**/*.spec.ts'
git add src/app/features/turnos/box-occupation/components/
git commit -m "feat(turnos): BoxSelectorModal + BoxOccupationWidget components (KAN-XX)"
```

---

## Task 11: Wire-up en recepción + registro de feature state

**Files:**
- Modify: `src/app/features/turnos/turnos.routes.ts`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.{ts,html}`
- Modify: `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.{ts,html}`

- [ ] **Step 1: Registrar feature state en turnos.routes**

Buscar el `recepcion` route en `turnos.routes.ts` y agregar `providers`:

```ts
{
  path: 'recepcion',
  canActivate: [recepcionAccessGuard],
  providers: [
    provideState(BOX_OCCUPATION_FEATURE_KEY, boxOccupationReducer),
    provideEffects([BoxOccupationEffects]),
  ],
  loadComponent: () => import('./pages/recepcion/recepcion.page').then(m => m.RecepcionPage),
},
```

Agregar imports correspondientes en el top.

- [ ] **Step 2: Modificar recepcion-con-totem.component.ts**

Agregar:
- Inject `Store`, `selectAllOccupations`, `selectMyOccupation`.
- Inject `OperatorBranchContextService` para tener `branchId`.
- Inject auth store / `TokenService.getUserId()` para `currentUserId`.
- Signal `currentUserId` y `totalBoxes` (necesita pedir al sucursal endpoint o ya viene en `OperatorBranchContextService`).
- Effect: en init dispatchar `loadBoxOccupations({ branchId, boxType: 'ATENCION' })`.
- Computed `myOccupation = computed(() => this.allOccupations().find(o => o.userId === this.currentUserId()) ?? null)`.
- Signal `selectorVisible = computed(() => loaded() && !myOccupation())`.

Imports nuevos:
```ts
import { BoxOccupationWidgetComponent } from '../../box-occupation/components/box-occupation-widget.component';
import { BoxSelectorModalComponent } from '../../box-occupation/components/box-selector-modal.component';
import { loadBoxOccupations } from '../../box-occupation/store/box-occupation.actions';
import { selectAllOccupations } from '../../box-occupation/store/box-occupation.selectors';
```

Agregar a `imports: [...]` los 2 standalone components.

- [ ] **Step 3: Modificar recepcion-con-totem.component.html**

Header — agregar widget al lado de "Turnos del día":

```html
<header class="recepcion-header">
  <h2 class="recepcion-title">Cola de espera</h2>
  <div class="recepcion-header__actions">
    <app-box-occupation-widget
      [branchId]="branchId()"
      [currentUserId]="currentUserId()"
      [totalBoxes]="totalBoxes()" />
    <p-button icon="pi pi-calendar" label="Turnos del día" ... />
    <p-button icon="pi pi-plus" label="Nueva atención" ... />
  </div>
</header>

<!-- Modal blocking si no hay box -->
<app-box-selector-modal
  [branchId]="branchId()"
  [currentUserId]="currentUserId()"
  [totalBoxes]="totalBoxes()"
  [visible]="selectorVisible()"
  [canClose]="false"
  (closed)="selectorVisible.set(false)" />
```

> El `totalBoxes` necesita cargarse desde el backend (`Branch.atencionBoxesCount`). Si `OperatorBranchContextService` no lo expone, agregar un selector que lo lea via `branch-service` o expandir el context. La forma más simple: tras conocer `branchId`, dispatch un `loadDetail({ branchId })` del store de sucursales y leer `atencionBoxesCount` con un selector.

- [ ] **Step 4: Repetir en recepcion-sin-totem.component**

Mismo patrón.

- [ ] **Step 5: Build + smoke a ojo en browser**

```
cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO"
npm run build
```

- [ ] **Step 6: Commit**

```
git add src/app/features/turnos/turnos.routes.ts \
        src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts \
        src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html \
        src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.ts \
        src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.html
git commit -m "feat(turnos): wire-up box-occupation en recepcion (modal blocking + widget) (KAN-XX)"
```

---

## Task 12: Logout integration — DELETE box-occupation antes de clearToken

**Files:**
- Modify: `src/app/features/profile/components/logout-confirm/logout-confirm.component.ts`

- [ ] **Step 1: Inyectar Store + BoxOccupationService**

```ts
import { Store } from '@ngrx/store';
import { BoxOccupationService } from '@features/turnos/box-occupation/services/box-occupation.service';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';
```

- [ ] **Step 2: Modificar el handler de "confirmar logout"**

Antes del `tokens.clearToken()` (o equivalente), hacer best-effort release:

```ts
private branchContext = inject(OperatorBranchContextService);
private boxOccupationService = inject(BoxOccupationService);

confirmLogout() {
  const branchId = this.branchContext.branchId();
  if (branchId != null) {
    // Best-effort: si falla por red, igual seguimos con logout. El cron limpia.
    this.boxOccupationService.release(branchId, 'ATENCION').subscribe({
      complete: () => this.doLogout(),
      error: () => this.doLogout(),
    });
  } else {
    this.doLogout();
  }
}

private doLogout() {
  // ... lógica actual de clearToken + redirect
}
```

> Adaptar a la estructura real del componente. Si el componente usa un service para logout, mover la lógica de release allá.

- [ ] **Step 3: Verify + commit**

```
npm run build
git add src/app/features/profile/components/logout-confirm/logout-confirm.component.ts
git commit -m "feat(profile): release box occupation antes del logout (best-effort) (KAN-XX)"
```

---

## Task 13: Smoke manual end-to-end

- [ ] **Step 1: Levantar todo**

```
# Backend con feat/KAN-XX-box-occupation
cd "C:/Users/Mateo/Desktop/tesis/Backend"
./mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Frontend con feat/KAN-73-recepcion-branch-context
cd "C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO"
npm start -- --port 4200
```

- [ ] **Step 2: Smoke — secretaria entra sin box**

1. Login como `secretaria@lab-demo.test / password`
2. Ir a `/turnos/recepcion`
3. **Verificar**: modal aparece automáticamente, **no se puede cerrar** (no hay X visible, ESC no cierra).
4. Grid de 6 boxes (asumiendo `atencionBoxesCount = 6` en Sede Central), todos libres (verde).
5. Click Box 3 → modal cierra, header muestra pill verde "● Box 3 ▾".

- [ ] **Step 3: Smoke — visibilidad organizativa**

1. En otra ventana incógnito, login como `admin@test.com / password`.
2. Ir a `/turnos/recepcion` (admin tiene rol + sections desde nuestra inserción manual).
3. Modal aparece — Box 3 gris con texto "Ana Rodríguez". Box 1, 2, 4, 5, 6 libres.
4. Elegir Box 1.

- [ ] **Step 4: Smoke — propagación al TV**

1. En cualquiera de las dos ventanas, hacer "Atender" sobre alguna entry de cola.
2. Abrir `/display/lab-demo/1001` (TV atención) → verificar que el último llamado dice `→ Box N` con el box del operador que llamó (no más derivado).

- [ ] **Step 5: Smoke — cambiar box**

1. En la ventana de secretaria, click en pill "Box 3 ▾" → menú con "Cambiar box" / "Liberar box".
2. Click "Cambiar box" → modal abre con Box 3 marcado como "Tu box" (no clickeable), Box 1 ahora gris ("admin").
3. Elegir Box 5 → modal cierra, pill muestra "Box 5".
4. Verificar via SQL que la fila vieja de Box 3 quedó `active=NULL, released_at=NOW`.

- [ ] **Step 6: Smoke — liberar box**

1. Click pill → "Liberar box" → modal blocking reabre.
2. SQL confirma fila marcada inactiva.

- [ ] **Step 7: Smoke — logout**

1. Logout de la ventana de secretaria.
2. SQL: confirmar que su occupation activa quedó `active=NULL, released_at=NOW`.
3. Re-login → modal vuelve a aparecer (no hay box).

---

## Self-Review

**Spec coverage:**

| Spec § | Tasks que lo cubren |
|---|---|
| §3 Requerimientos funcionales | Tasks 1-12 (todo) |
| §4 Modelo de datos | Task 1 |
| §5.1 GET list | Task 5 |
| §5.2 PUT occupy | Tasks 4, 5 |
| §5.3 DELETE release | Tasks 4, 5 |
| §5.4 Call captura box | Task 7 |
| §5.5 PublicQueueEntry expone box | Task 6 |
| §6 UX frontend | Tasks 9, 10, 11 |
| §7 Lifecycle (logout + cron) | Tasks 8, 12 |
| §8 Testing | Tasks 4, 7, 9, 10 |

**Placeholder scan**: el único placeholder intencional es `(KAN-XX)` en los commit messages, reemplazable con `sed` al crear el ticket Jira.

**Type consistency**: `BoxType` enum usado consistentemente. `boxNumber: number` (TS) ↔ `Integer` (Java) ↔ `INT` (SQL). `BranchBoxOccupation` shape consistente entre dominio Java, JPA entity, DTO response y TS model.
