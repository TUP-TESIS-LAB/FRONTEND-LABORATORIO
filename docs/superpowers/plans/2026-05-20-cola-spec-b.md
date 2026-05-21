# Cola del día + Sala de espera TV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Spec B del módulo TURNOS — pantalla de recepción para secretaria (CON/SIN tótem) + pantalla de TV pública de sala de espera, con los prereqs backend correspondientes (flag `branch_totem_config`, tracking de llamadas en `QueueEntry`, endpoint público de display).

**Architecture:** Spec abarca dos repos: **Backend** (Spring Boot, Hexagonal) y **FRONTEND-LABORATORIO** (Angular 21 + NgRx 21 + PrimeNG 21). Frontend resuelve "modo con/sin tótem" leyendo el flag por sucursal del usuario, renderizando sub-componente correspondiente. TV usa endpoint público sin auth + signals locales (sin store global). 3 slices NgRx nuevos en frontend (`queue`, `appointments`, `branch-totem-config`). El plan se ejecuta linealmente backend → frontend infra → frontend pantallas → validación.

**Tech Stack:**
- Backend: Java 21, Spring Boot 3.x, JPA, Flyway, MySQL/H2 syntax.
- Frontend: Angular 21, NgRx 21, PrimeNG 21, RxJS 7, vitest 4.

**Convenciones aplicadas:**
- Backend: módulo hexagonal (domain / application / infrastructure / presentation), `BaseJpaEntity` para auditoría, `TenantProvider` para multi-tenancy, `@PreAuthorize` para permisos.
- Frontend: `ngrx-backend-request` (shape `{ data, pending, error }`, sin `@ngrx/entity`, mutations pessimistic, `selectSignal`), `angular-conventions` (estructura core/shared/layout/features, signals locales, OnPush), `laboratory-ui` (PrimeNG + tokens DS).

**Spec de referencia:** `FRONTEND-LABORATORIO/docs/superpowers/specs/2026-05-20-cola-spec-b-design.md`.

**Repos involucrados:**
- **Backend:** `C:/Users/Mateo/Desktop/tesis/Backend` en branch `feat/turnos-specs` (creada el 2026-05-20 desde `development`).
- **Frontend laboratorio:** `C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO` en branch `feat/turnos-specs` (existente, donde vive el spec).

**Convención de commits:** prefijos `feat(turnos)`, `feat(sucursales)`, `chore(db)`, `test(turnos)`, `docs(turnos)`. Cada commit chico y verde.

**Sobre tests:** las tareas marcadas `[DELEGABLE]` son tests que se pueden saltear si vas a delegarlos a otro miembro del equipo o diferirlos como follow-up post-merge. La implementación funcional NO depende de esas tareas; el smoke manual del PR es el gate funcional. Si decidís correr los tests vos mismo, ejecutalos en el orden listado.

---

## File Structure

### Backend — archivos a CREAR

```
Backend/src/main/
├── resources/db/migration/
│   ├── V55__create_branch_totem_config.sql                          ← NEW
│   ├── V56__add_call_tracking_to_queue_entries.sql                  ← NEW
│   └── V57__add_slug_to_tenant.sql                                  ← NEW (condicional)
└── java/lab/laboratorio/modules/
    ├── sucursales/
    │   ├── domain/
    │   │   ├── model/BranchTotemConfig.java                         ← NEW
    │   │   └── port/BranchTotemConfigRepository.java                ← NEW
    │   ├── application/usecase/
    │   │   ├── GetBranchTotemConfigUseCase.java                     ← NEW
    │   │   └── UpsertBranchTotemConfigUseCase.java                  ← NEW
    │   ├── infrastructure/persistence/
    │   │   ├── entity/BranchTotemConfigJpaEntity.java               ← NEW
    │   │   ├── repository/BranchTotemConfigJpaRepository.java       ← NEW
    │   │   └── mapper/BranchTotemConfigJpaMapper.java               ← NEW
    │   └── presentation/
    │       ├── controller/BranchTotemConfigController.java          ← NEW
    │       └── dto/
    │           ├── BranchTotemConfigResponse.java                   ← NEW
    │           └── UpsertBranchTotemConfigRequest.java              ← NEW
    └── turnos/
        ├── application/usecase/
        │   └── CallQueueEntryUseCase.java                           ← NEW
        └── presentation/
            ├── dto/CallQueueEntryResponse.java                      ← NEW
            └── public_/
                ├── PublicDisplayQueueController.java                ← NEW
                └── dto/
                    ├── PublicQueueEntryResponse.java                ← NEW
                    └── DisplaySnapshotResponse.java                 ← NEW

Backend/src/test/java/lab/laboratorio/modules/
├── sucursales/
│   ├── application/
│   │   ├── GetBranchTotemConfigUseCaseTest.java                     ← NEW (DELEGABLE)
│   │   └── UpsertBranchTotemConfigUseCaseTest.java                  ← NEW (DELEGABLE)
│   ├── infrastructure/
│   │   └── BranchTotemConfigJpaMapperTest.java                      ← NEW (DELEGABLE)
│   └── presentation/
│       └── BranchTotemConfigControllerTest.java                     ← NEW (DELEGABLE)
└── turnos/
    ├── application/
    │   └── CallQueueEntryUseCaseTest.java                           ← NEW (DELEGABLE)
    └── presentation/
        ├── QueueControllerCallTest.java                             ← NEW (DELEGABLE)
        └── PublicDisplayQueueControllerTest.java                    ← NEW (DELEGABLE)
```

### Backend — archivos a MODIFICAR

```
Backend/src/main/java/lab/laboratorio/
├── modules/turnos/
│   ├── domain/model/QueueEntry.java                                 ← agregar lastCalledAt + callCount
│   ├── infrastructure/persistence/
│   │   ├── entity/QueueEntryJpaEntity.java                          ← agregar columnas
│   │   └── mapper/QueueEntryJpaMapper.java                          ← propagar campos
│   ├── presentation/
│   │   ├── controller/QueueController.java                          ← agregar POST /{id}/call
│   │   └── dto/QueueEntryResponse.java                              ← exponer nuevos campos
└── infrastructure/security/
    └── SecurityConfig.java                                          ← excluir /public/** del filter chain
```

### Frontend — archivos a CREAR

```
FRONTEND-LABORATORIO/src/app/
├── features/turnos/
│   ├── pages/
│   │   ├── recepcion/
│   │   │   ├── recepcion.page.ts                                    ← NEW (+ html + scss)
│   │   │   ├── recepcion-con-totem.component.ts                     ← NEW (+ html + scss)
│   │   │   └── recepcion-sin-totem.component.ts                     ← NEW (+ html + scss)
│   │   └── sala-espera/
│   │       ├── sala-espera.page.ts                                  ← NEW (+ html + scss)
│   │       ├── empty-state.component.ts                             ← NEW (+ html)
│   │       └── closed-state.component.ts                            ← NEW (+ html)
│   ├── components/
│   │   └── queue-row-actions.component.ts                           ← NEW (+ html)
│   ├── services/
│   │   ├── queue.service.ts                                         ← NEW
│   │   ├── branch-totem-config.service.ts                           ← NEW
│   │   ├── appointment.service.ts                                   ← NEW
│   │   └── public-display.service.ts                                ← NEW
│   ├── store/
│   │   ├── queue/
│   │   │   ├── queue.state.ts                                       ← NEW
│   │   │   ├── queue.actions.ts                                     ← NEW
│   │   │   ├── queue.reducer.ts                                     ← NEW
│   │   │   ├── queue.effects.ts                                     ← NEW
│   │   │   └── queue.selectors.ts                                   ← NEW
│   │   ├── appointments/
│   │   │   └── (mismos 5 archivos)                                  ← NEW
│   │   └── branch-totem-config/
│   │       └── (mismos 5 archivos)                                  ← NEW
│   ├── guards/
│   │   └── recepcion-access.guard.ts                                ← NEW
│   └── models/
│       ├── queue-entry.model.ts                                     ← NEW
│       ├── queue-status.enum.ts                                     ← NEW
│       ├── branch-totem-config.model.ts                             ← NEW
│       ├── appointment.model.ts                                     ← NEW
│       └── public-display.model.ts                                  ← NEW
├── shared/utils/
│   └── api-error-mapper.ts                                          ← NEW si no existe
└── assets/audio/
    └── beep.mp3                                                     ← NEW (~1 seg, ~10KB)
```

### Frontend — archivos a MODIFICAR

```
FRONTEND-LABORATORIO/src/app/
├── app.routes.ts                                                    ← agregar ruta /display/...
├── features/turnos/
│   ├── turnos.routes.ts                                             ← reemplazar colas por recepcion
│   └── pages/colas/colas.component.ts                               ← BORRAR
├── features/sucursales/
│   ├── pages/sucursales/sucursales.component.ts                     ← agregar columna toggle tótem
│   ├── services/sucursales.service.ts                               ← agregar updateTotemConfig
│   └── models/branch-totem-config.model.ts                          ← NEW (referencia local)
└── layout/admin-shell/
    └── sidebar (donde sea que viva)                                 ← link "Sala de espera" condicional
```

---

## Task 0: Preparación

**Goal:** verificar que las branches existen y que ambos baselines compilan.

- [ ] **Step 0.1: Verificar branch backend**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
git branch --show-current
```

Expected: `feat/turnos-specs`. Si estás en otra branch:

```bash
git checkout feat/turnos-specs
```

Si la branch no existe (debería haberse creado el 2026-05-20):

```bash
git checkout -b feat/turnos-specs development
```

- [ ] **Step 0.2: Verificar branch frontend**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
git branch --show-current
```

Expected: `feat/turnos-specs`.

- [ ] **Step 0.3: Baseline backend compila**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw clean compile
```

Expected: BUILD SUCCESS. Si falla algo no relacionado con turnos, parar y arreglar primero (no continuar el plan con baseline roto).

- [ ] **Step 0.4: Baseline frontend compila**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
npm run build
```

Expected: build OK.

- [ ] **Step 0.5: Verificar dev server frontend levanta**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
npm start
```

Expected: dev server en `http://localhost:4200` carga el login. Bajalo con Ctrl+C antes de seguir.

---

# Phase 1 — Backend

## Task 1: Migración V55 — `branch_totem_config`

**Files:**
- Create: `Backend/src/main/resources/db/migration/V55__create_branch_totem_config.sql`

- [ ] **Step 1.1: Crear migración V55**

```sql
-- Backend/src/main/resources/db/migration/V55__create_branch_totem_config.sql
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

- [ ] **Step 1.2: Aplicar migración en dev**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw flyway:migrate -Dspring.profiles.active=dev
```

Expected: `Successfully applied 1 migration to schema ... (execution time ...). Now at version V55`.

- [ ] **Step 1.3: Verificar tabla en DB**

```bash
./mvnw flyway:info -Dspring.profiles.active=dev | grep V55
```

Expected: línea con `V55` y estado `Success`.

- [ ] **Step 1.4: Commit**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
git add src/main/resources/db/migration/V55__create_branch_totem_config.sql
git commit -m "chore(db): V55 create branch_totem_config table"
```

---

## Task 2: Domain model + repository port — `BranchTotemConfig`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/domain/model/BranchTotemConfig.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/domain/port/BranchTotemConfigRepository.java`

- [ ] **Step 2.1: Crear domain model**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/domain/model/BranchTotemConfig.java
package lab.laboratorio.modules.sucursales.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchTotemConfig {
    private Long id;
    private Long branchId;
    private Long tenantId;
    private boolean enabled;
    private boolean active;
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private Long version;
}
```

- [ ] **Step 2.2: Crear repository port**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/domain/port/BranchTotemConfigRepository.java
package lab.laboratorio.modules.sucursales.domain.port;

import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;

import java.util.Optional;

public interface BranchTotemConfigRepository {
    Optional<BranchTotemConfig> findByBranchId(Long branchId, Long tenantId);
    BranchTotemConfig save(BranchTotemConfig config);
}
```

- [ ] **Step 2.3: Commit**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
git add src/main/java/lab/laboratorio/modules/sucursales/domain/
git commit -m "feat(sucursales): domain model + repo port for BranchTotemConfig"
```

---

## Task 3: JPA entity + repository + mapper — `BranchTotemConfig`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/entity/BranchTotemConfigJpaEntity.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/repository/BranchTotemConfigJpaRepository.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/mapper/BranchTotemConfigJpaMapper.java`

- [ ] **Step 3.1: Crear JPA entity**

> Antes de escribir, abrí `TenantSmtpConfigJpaEntity.java` y copiá el esqueleto de auditoría (extiende `BaseJpaEntity` si existe en el proyecto). Adaptá nombres de columna a `branch_totem_config`.

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/entity/BranchTotemConfigJpaEntity.java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lab.laboratorio.infrastructure.persistence.BaseJpaEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "branch_totem_config")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BranchTotemConfigJpaEntity extends BaseJpaEntity {

    @Column(name = "target_branch_id", nullable = false, unique = true)
    private Long targetBranchId;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;
}
```

> Nota: `BaseJpaEntity` (si existe) ya aporta `id`, `tenantId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `active`, `version`. Si la clase base se llama distinto en el proyecto, copiar lo que `TenantSmtpConfigJpaEntity` hace.

- [ ] **Step 3.2: Crear Spring Data repository**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/repository/BranchTotemConfigJpaRepository.java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.repository;

import lab.laboratorio.modules.sucursales.infrastructure.persistence.entity.BranchTotemConfigJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BranchTotemConfigJpaRepository extends JpaRepository<BranchTotemConfigJpaEntity, Long> {
    Optional<BranchTotemConfigJpaEntity> findByTargetBranchIdAndTenantIdAndActiveTrue(Long targetBranchId, Long tenantId);
}
```

- [ ] **Step 3.3: Crear mapper**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/mapper/BranchTotemConfigJpaMapper.java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.mapper;

import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.entity.BranchTotemConfigJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class BranchTotemConfigJpaMapper {

    public BranchTotemConfig toDomain(BranchTotemConfigJpaEntity entity) {
        return BranchTotemConfig.builder()
            .id(entity.getId())
            .branchId(entity.getTargetBranchId())
            .tenantId(entity.getTenantId())
            .enabled(entity.isEnabled())
            .active(entity.isActive())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .createdBy(entity.getCreatedBy())
            .updatedBy(entity.getUpdatedBy())
            .version(entity.getVersion())
            .build();
    }

    public BranchTotemConfigJpaEntity toEntity(BranchTotemConfig domain) {
        return BranchTotemConfigJpaEntity.builder()
            .targetBranchId(domain.getBranchId())
            .enabled(domain.isEnabled())
            .build();
    }
}
```

- [ ] **Step 3.4: Crear adapter del repo port (concrete repo class que implementa `BranchTotemConfigRepository`)**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/infrastructure/persistence/repository/BranchTotemConfigRepositoryAdapter.java
package lab.laboratorio.modules.sucursales.infrastructure.persistence.repository;

import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.domain.port.BranchTotemConfigRepository;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.mapper.BranchTotemConfigJpaMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BranchTotemConfigRepositoryAdapter implements BranchTotemConfigRepository {

    private final BranchTotemConfigJpaRepository jpa;
    private final BranchTotemConfigJpaMapper mapper;

    @Override
    public Optional<BranchTotemConfig> findByBranchId(Long branchId, Long tenantId) {
        return jpa.findByTargetBranchIdAndTenantIdAndActiveTrue(branchId, tenantId)
            .map(mapper::toDomain);
    }

    @Override
    public BranchTotemConfig save(BranchTotemConfig config) {
        var entity = mapper.toEntity(config);
        entity.setTenantId(config.getTenantId());
        if (config.getId() != null) {
            entity.setId(config.getId());
            entity.setVersion(config.getVersion());
        }
        var saved = jpa.save(entity);
        return mapper.toDomain(saved);
    }
}
```

- [ ] **Step 3.5: Compilar para verificar wiring**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw clean compile
```

Expected: BUILD SUCCESS. Si falla por `BaseJpaEntity` u otra clase, abrir el path real y ajustar (los nombres pueden diferir).

- [ ] **Step 3.6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/sucursales/infrastructure/
git commit -m "feat(sucursales): JPA entity + repo + mapper for BranchTotemConfig"
```

---

## Task 4: Use cases — `GetBranchTotemConfig` + `UpsertBranchTotemConfig`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/application/usecase/GetBranchTotemConfigUseCase.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/application/usecase/UpsertBranchTotemConfigUseCase.java`

- [ ] **Step 4.1: Crear `GetBranchTotemConfigUseCase`**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/application/usecase/GetBranchTotemConfigUseCase.java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.tenancy.TenantNotResolvedException;
import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.domain.port.BranchTotemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GetBranchTotemConfigUseCase {

    private final BranchTotemConfigRepository repository;
    private final TenantProvider tenantProvider;

    public Optional<BranchTotemConfig> execute(Long branchId) {
        Long tenantId = tenantProvider.currentTenantId()
            .orElseThrow(TenantNotResolvedException::new);
        return repository.findByBranchId(branchId, tenantId);
    }
}
```

- [ ] **Step 4.2: Crear `UpsertBranchTotemConfigUseCase`**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/application/usecase/UpsertBranchTotemConfigUseCase.java
package lab.laboratorio.modules.sucursales.application.usecase;

import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.tenancy.TenantNotResolvedException;
import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.domain.port.BranchTotemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UpsertBranchTotemConfigUseCase {

    private final BranchTotemConfigRepository repository;
    private final TenantProvider tenantProvider;

    public BranchTotemConfig execute(Long branchId, boolean enabled) {
        Long tenantId = tenantProvider.currentTenantId()
            .orElseThrow(TenantNotResolvedException::new);

        var existing = repository.findByBranchId(branchId, tenantId);

        var config = existing
            .map(c -> { c.setEnabled(enabled); return c; })
            .orElseGet(() -> BranchTotemConfig.builder()
                .branchId(branchId)
                .tenantId(tenantId)
                .enabled(enabled)
                .active(true)
                .build());

        return repository.save(config);
    }
}
```

- [ ] **Step 4.3: Compilar**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw compile
```

Expected: BUILD SUCCESS.

- [ ] **Step 4.4: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/sucursales/application/
git commit -m "feat(sucursales): use cases Get + Upsert BranchTotemConfig"
```

---

## Task 5: Controller + DTOs — `BranchTotemConfig`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/controller/BranchTotemConfigController.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/BranchTotemConfigResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/UpsertBranchTotemConfigRequest.java`

- [ ] **Step 5.1: Crear DTOs**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/BranchTotemConfigResponse.java
package lab.laboratorio.modules.sucursales.presentation.dto;

import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;

public record BranchTotemConfigResponse(Long branchId, boolean enabled, boolean active) {

    public static BranchTotemConfigResponse from(BranchTotemConfig domain) {
        return new BranchTotemConfigResponse(domain.getBranchId(), domain.isEnabled(), domain.isActive());
    }
}
```

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/dto/UpsertBranchTotemConfigRequest.java
package lab.laboratorio.modules.sucursales.presentation.dto;

import jakarta.validation.constraints.NotNull;

public record UpsertBranchTotemConfigRequest(@NotNull Boolean enabled) {}
```

- [ ] **Step 5.2: Crear controller**

```java
// Backend/src/main/java/lab/laboratorio/modules/sucursales/presentation/controller/BranchTotemConfigController.java
package lab.laboratorio.modules.sucursales.presentation.controller;

import jakarta.validation.Valid;
import lab.laboratorio.modules.sucursales.application.usecase.GetBranchTotemConfigUseCase;
import lab.laboratorio.modules.sucursales.application.usecase.UpsertBranchTotemConfigUseCase;
import lab.laboratorio.modules.sucursales.presentation.dto.BranchTotemConfigResponse;
import lab.laboratorio.modules.sucursales.presentation.dto.UpsertBranchTotemConfigRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sucursales/branches/{branchId}/totem-config")
@RequiredArgsConstructor
public class BranchTotemConfigController {

    private final GetBranchTotemConfigUseCase getUseCase;
    private final UpsertBranchTotemConfigUseCase upsertUseCase;

    @GetMapping
    @PreAuthorize("hasAnyRole('SECRETARIA','ADMINISTRADOR','RESPONSABLE_SECRETARIA')")
    public ResponseEntity<BranchTotemConfigResponse> get(@PathVariable Long branchId) {
        return getUseCase.execute(branchId)
            .map(BranchTotemConfigResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public BranchTotemConfigResponse upsert(
        @PathVariable Long branchId,
        @Valid @RequestBody UpsertBranchTotemConfigRequest request
    ) {
        var saved = upsertUseCase.execute(branchId, request.enabled());
        return BranchTotemConfigResponse.from(saved);
    }
}
```

- [ ] **Step 5.3: Compilar y arrancar app**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw spring-boot:run -Dspring.profiles.active=dev
```

Expected: app levanta sin error. Bajarla con Ctrl+C.

- [ ] **Step 5.4: Smoke manual con curl (token de admin)**

> Necesitas un JWT de admin. Login con `admin@test.com / password` contra `/api/v1/auth/login` y copiar el token.

```bash
# GET (sin config existente → 404)
curl -i http://localhost:8080/api/v1/sucursales/branches/1/totem-config \
  -H "Authorization: Bearer $TOKEN"

# PUT (crea)
curl -i -X PUT http://localhost:8080/api/v1/sucursales/branches/1/totem-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# GET (ahora 200 con enabled=true)
curl -i http://localhost:8080/api/v1/sucursales/branches/1/totem-config \
  -H "Authorization: Bearer $TOKEN"

# PUT (actualiza a false)
curl -i -X PUT http://localhost:8080/api/v1/sucursales/branches/1/totem-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

Expected: 404 → 200 → 200 (enabled=true) → 200 (enabled=false).

- [ ] **Step 5.5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/sucursales/presentation/
git commit -m "feat(sucursales): REST controller for BranchTotemConfig (GET + PUT)"
```

---

## Task 6 [DELEGABLE]: Tests Backend B1

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/sucursales/infrastructure/BranchTotemConfigJpaMapperTest.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/sucursales/application/GetBranchTotemConfigUseCaseTest.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/sucursales/application/UpsertBranchTotemConfigUseCaseTest.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/sucursales/presentation/BranchTotemConfigControllerTest.java`

> Esta task es **DELEGABLE**: podés saltearla si vas a asignar testing a otro miembro o diferirlo. La implementación funcional no depende de esto. Si la corrés, seguí TDD (test fallido → impl ya hecha → test pasa).

- [ ] **Step 6.1: Test del mapper (bidireccional)**

```java
// Backend/src/test/java/lab/laboratorio/modules/sucursales/infrastructure/BranchTotemConfigJpaMapperTest.java
package lab.laboratorio.modules.sucursales.infrastructure;

import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.entity.BranchTotemConfigJpaEntity;
import lab.laboratorio.modules.sucursales.infrastructure.persistence.mapper.BranchTotemConfigJpaMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BranchTotemConfigJpaMapperTest {

    private final BranchTotemConfigJpaMapper mapper = new BranchTotemConfigJpaMapper();

    @Test
    void toDomain_maps_all_fields() {
        var entity = BranchTotemConfigJpaEntity.builder()
            .targetBranchId(42L)
            .enabled(true)
            .build();
        entity.setId(1L);
        entity.setTenantId(7L);
        entity.setActive(true);
        entity.setVersion(0L);

        var domain = mapper.toDomain(entity);

        assertThat(domain.getId()).isEqualTo(1L);
        assertThat(domain.getBranchId()).isEqualTo(42L);
        assertThat(domain.getTenantId()).isEqualTo(7L);
        assertThat(domain.isEnabled()).isTrue();
        assertThat(domain.isActive()).isTrue();
    }

    @Test
    void toEntity_maps_minimum_fields() {
        var domain = BranchTotemConfig.builder()
            .branchId(42L)
            .enabled(true)
            .build();

        var entity = mapper.toEntity(domain);

        assertThat(entity.getTargetBranchId()).isEqualTo(42L);
        assertThat(entity.isEnabled()).isTrue();
    }
}
```

- [ ] **Step 6.2: Test del GetUseCase**

```java
// Backend/src/test/java/lab/laboratorio/modules/sucursales/application/GetBranchTotemConfigUseCaseTest.java
package lab.laboratorio.modules.sucursales.application;

import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.modules.sucursales.application.usecase.GetBranchTotemConfigUseCase;
import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.domain.port.BranchTotemConfigRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GetBranchTotemConfigUseCaseTest {

    private final BranchTotemConfigRepository repo = mock(BranchTotemConfigRepository.class);
    private final TenantProvider tenant = mock(TenantProvider.class);
    private final GetBranchTotemConfigUseCase useCase = new GetBranchTotemConfigUseCase(repo, tenant);

    @Test
    void returns_config_when_found() {
        when(tenant.currentTenantId()).thenReturn(Optional.of(7L));
        when(repo.findByBranchId(42L, 7L)).thenReturn(Optional.of(
            BranchTotemConfig.builder().branchId(42L).enabled(true).build()));

        var result = useCase.execute(42L);

        assertThat(result).isPresent();
        assertThat(result.get().isEnabled()).isTrue();
    }

    @Test
    void returns_empty_when_not_found() {
        when(tenant.currentTenantId()).thenReturn(Optional.of(7L));
        when(repo.findByBranchId(42L, 7L)).thenReturn(Optional.empty());

        assertThat(useCase.execute(42L)).isEmpty();
    }
}
```

- [ ] **Step 6.3: Test del UpsertUseCase**

```java
// Backend/src/test/java/lab/laboratorio/modules/sucursales/application/UpsertBranchTotemConfigUseCaseTest.java
package lab.laboratorio.modules.sucursales.application;

import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.modules.sucursales.application.usecase.UpsertBranchTotemConfigUseCase;
import lab.laboratorio.modules.sucursales.domain.model.BranchTotemConfig;
import lab.laboratorio.modules.sucursales.domain.port.BranchTotemConfigRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UpsertBranchTotemConfigUseCaseTest {

    private final BranchTotemConfigRepository repo = mock(BranchTotemConfigRepository.class);
    private final TenantProvider tenant = mock(TenantProvider.class);
    private final UpsertBranchTotemConfigUseCase useCase = new UpsertBranchTotemConfigUseCase(repo, tenant);

    @Test
    void creates_new_when_not_exists() {
        when(tenant.currentTenantId()).thenReturn(Optional.of(7L));
        when(repo.findByBranchId(42L, 7L)).thenReturn(Optional.empty());
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var saved = useCase.execute(42L, true);

        assertThat(saved.getBranchId()).isEqualTo(42L);
        assertThat(saved.isEnabled()).isTrue();
        verify(repo).save(any());
    }

    @Test
    void updates_existing_when_present() {
        var existing = BranchTotemConfig.builder().id(1L).branchId(42L).tenantId(7L).enabled(false).build();
        when(tenant.currentTenantId()).thenReturn(Optional.of(7L));
        when(repo.findByBranchId(42L, 7L)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var saved = useCase.execute(42L, true);

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.isEnabled()).isTrue();
    }
}
```

- [ ] **Step 6.4: Test del controller (WebMvc)**

> Copiar el patrón de `EmpresaSmtpControllerTest` o el equivalente más cercano. Cubrir: GET 200, GET 404, PUT 200 con rol ADMIN, PUT 403 sin rol.

- [ ] **Step 6.5: Correr tests del módulo**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw test -Dtest='*BranchTotemConfig*'
```

Expected: todos pasan.

- [ ] **Step 6.6: Commit**

```bash
git add src/test/java/lab/laboratorio/modules/sucursales/
git commit -m "test(sucursales): tests for BranchTotemConfig mapper, use cases, controller"
```

---

## Task 7: Migración V56 + extender `QueueEntry`

**Files:**
- Create: `Backend/src/main/resources/db/migration/V56__add_call_tracking_to_queue_entries.sql`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/QueueEntryJpaEntity.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/domain/model/QueueEntry.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/QueueEntryJpaMapper.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java`

- [ ] **Step 7.1: Crear migración V56**

```sql
-- Backend/src/main/resources/db/migration/V56__add_call_tracking_to_queue_entries.sql
ALTER TABLE queue_entries
    ADD COLUMN last_called_at TIMESTAMP(6) NULL,
    ADD COLUMN call_count INT NOT NULL DEFAULT 0;
```

- [ ] **Step 7.2: Aplicar migración**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw flyway:migrate -Dspring.profiles.active=dev
```

Expected: `Now at version V56`.

- [ ] **Step 7.3: Agregar campos a `QueueEntryJpaEntity`**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/entity/QueueEntryJpaEntity.java
// agregar en la clase, junto a los otros @Column:

@Column(name = "last_called_at")
private java.time.Instant lastCalledAt;

@Column(name = "call_count", nullable = false)
private int callCount;
```

- [ ] **Step 7.4: Agregar campos al domain model `QueueEntry`**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/domain/model/QueueEntry.java
// agregar en la clase:

private java.time.Instant lastCalledAt;
private int callCount;
```

- [ ] **Step 7.5: Propagar en el mapper**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/infrastructure/persistence/mapper/QueueEntryJpaMapper.java
// en toDomain agregar:
.lastCalledAt(entity.getLastCalledAt())
.callCount(entity.getCallCount())

// en toEntity agregar:
entity.setLastCalledAt(domain.getLastCalledAt());
entity.setCallCount(domain.getCallCount());
```

- [ ] **Step 7.6: Exponer en `QueueEntryResponse`**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/QueueEntryResponse.java
// agregar al record y al método from():
public record QueueEntryResponse(
    Long id,
    String publicCode,
    String nationalId,
    Long patientId,
    Long branchId,
    boolean hasAppointment,
    String status,
    java.time.Instant lastCalledAt,
    int callCount,
    java.time.Instant createdAt
) {
    public static QueueEntryResponse from(QueueEntry domain) {
        return new QueueEntryResponse(
            domain.getId(),
            domain.getPublicCode(),
            domain.getNationalId(),
            domain.getPatientId(),
            domain.getBranchId(),
            domain.isHasAppointment(),
            domain.getStatus().name(),
            domain.getLastCalledAt(),
            domain.getCallCount(),
            domain.getCreatedAt()
        );
    }
}
```

> Si el record actual tiene más o menos campos, ajustar — abrí el archivo y agregá `lastCalledAt` y `callCount` al final, propagando también en `from()`.

- [ ] **Step 7.7: Compilar**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw compile
```

- [ ] **Step 7.8: Commit**

```bash
git add src/main/resources/db/migration/V56__add_call_tracking_to_queue_entries.sql
git add src/main/java/lab/laboratorio/modules/turnos/
git commit -m "feat(turnos): V56 + add lastCalledAt + callCount to QueueEntry"
```

---

## Task 8: `CallQueueEntryUseCase` + endpoint `POST /queue/{id}/call`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCase.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/CallQueueEntryResponse.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/controller/QueueController.java`
- Modify (eventualmente): `QueueEntryRepository` para tener un `save(QueueEntry)` si no lo tiene.

- [ ] **Step 8.1: Crear excepción de conflict (si no existe)**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/domain/exception/QueueEntryNotCallableException.java
package lab.laboratorio.modules.turnos.domain.exception;

public class QueueEntryNotCallableException extends RuntimeException {
    public QueueEntryNotCallableException(Long id, String status) {
        super("QueueEntry " + id + " is not in PENDING state (status=" + status + ")");
    }
}
```

> Registrar el mapping a HTTP 409 en el `GlobalExceptionHandler` del backend (buscar dónde se hace para `AgendaConfigOverlapException` y replicar).

- [ ] **Step 8.2: Crear use case**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/CallQueueEntryUseCase.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.domain.port.TenantProvider;
import lab.laboratorio.infrastructure.tenancy.TenantNotResolvedException;
import lab.laboratorio.modules.turnos.domain.exception.QueueEntryNotCallableException;
import lab.laboratorio.modules.turnos.domain.exception.QueueEntryNotFoundException;
import lab.laboratorio.modules.turnos.domain.model.QueueEntry;
import lab.laboratorio.modules.turnos.domain.model.QueueStatus;
import lab.laboratorio.modules.turnos.domain.port.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CallQueueEntryUseCase {

    private final QueueEntryRepository repository;
    private final TenantProvider tenantProvider;

    public QueueEntry execute(Long id) {
        Long tenantId = tenantProvider.currentTenantId()
            .orElseThrow(TenantNotResolvedException::new);

        var entry = repository.findByIdAndTenant(id, tenantId)
            .orElseThrow(() -> new QueueEntryNotFoundException(id));

        if (entry.getStatus() != QueueStatus.PENDING) {
            throw new QueueEntryNotCallableException(id, entry.getStatus().name());
        }

        entry.setLastCalledAt(Instant.now());
        entry.setCallCount(entry.getCallCount() + 1);
        return repository.save(entry);
    }
}
```

> Si `QueueEntryRepository` no tiene `findByIdAndTenant` o `save`, agregalos al port y al adapter. Buscar el patrón en otros use cases del módulo turnos.

- [ ] **Step 8.3: Crear DTO de respuesta**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/dto/CallQueueEntryResponse.java
package lab.laboratorio.modules.turnos.presentation.dto;

import lab.laboratorio.modules.turnos.domain.model.QueueEntry;

import java.time.Instant;

public record CallQueueEntryResponse(Long id, Instant lastCalledAt, int callCount, String status) {

    public static CallQueueEntryResponse from(QueueEntry entry) {
        return new CallQueueEntryResponse(
            entry.getId(),
            entry.getLastCalledAt(),
            entry.getCallCount(),
            entry.getStatus().name()
        );
    }
}
```

- [ ] **Step 8.4: Agregar endpoint en `QueueController`**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/controller/QueueController.java
// agregar al controller:

@PostMapping("/{id}/call")
@PreAuthorize("hasAnyRole('SECRETARIA','ADMINISTRADOR','RESPONSABLE_SECRETARIA')")
public CallQueueEntryResponse call(@PathVariable Long id) {
    return CallQueueEntryResponse.from(callQueueEntryUseCase.execute(id));
}

// y al constructor / @RequiredArgsConstructor del controller, agregar:
private final CallQueueEntryUseCase callQueueEntryUseCase;
```

- [ ] **Step 8.5: Compilar y arrancar**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw spring-boot:run -Dspring.profiles.active=dev
```

- [ ] **Step 8.6: Smoke manual**

```bash
# 1. Crear un QueueEntry primero (POST /queue) con tu token
curl -i -X POST http://localhost:8080/api/v1/turnos/queue \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nationalId": "12345678", "branchId": 1, "hasAppointment": false}'

# (anotar el id del response)

# 2. Llamar al entry
curl -i -X POST http://localhost:8080/api/v1/turnos/queue/{id}/call \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 con { id, lastCalledAt: <now>, callCount: 1, status: "PENDING" }

# 3. Llamar de nuevo (re-llamada)
curl -i -X POST http://localhost:8080/api/v1/turnos/queue/{id}/call \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 con callCount: 2

# 4. Marcar como CANCELED y volver a intentar llamar
curl -i -X PATCH http://localhost:8080/api/v1/turnos/queue/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CANCELED"}'

curl -i -X POST http://localhost:8080/api/v1/turnos/queue/{id}/call \
  -H "Authorization: Bearer $TOKEN"

# Expected: 409
```

- [ ] **Step 8.7: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/turnos/
git commit -m "feat(turnos): POST /queue/{id}/call endpoint + tracking"
```

---

## Task 9 [DELEGABLE]: Tests Backend B2

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/application/CallQueueEntryUseCaseTest.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/presentation/QueueControllerCallTest.java`

> Cubrir: incrementa callCount, setea lastCalledAt, lanza `QueueEntryNotCallableException` cuando status != PENDING, lanza `QueueEntryNotFoundException` cuando no existe. Controller test: 200/409/404/403.

- [ ] **Step 9.1: Test del use case** (seguí patrón de `Task 6.2`/`6.3`).

- [ ] **Step 9.2: Test del controller** (seguí patrón equivalente a otros `*ControllerTest`).

- [ ] **Step 9.3: Correr**

```bash
./mvnw test -Dtest='CallQueueEntryUseCaseTest,QueueControllerCallTest'
```

- [ ] **Step 9.4: Commit**

```bash
git add src/test/java/lab/laboratorio/modules/turnos/
git commit -m "test(turnos): tests for CallQueueEntry use case + controller"
```

---

## Task 10: Verificación de prereqs adicionales

**Goal:** confirmar si `tenant.slug` y `GET /turnos/appointments` ya existen. Si no, agregar.

- [ ] **Step 10.1: Verificar `slug` en tabla `tenant`**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
grep -rn "slug" src/main/java/lab/laboratorio/modules/saasadmin/infrastructure/persistence/entity/ 2>/dev/null
# o donde sea que viva TenantJpaEntity
```

Si NO existe `@Column(name = "slug")` en la entidad tenant:

- Crear migración V57:

```sql
-- Backend/src/main/resources/db/migration/V57__add_slug_to_tenant.sql
ALTER TABLE tenant ADD COLUMN slug VARCHAR(80) NULL;
UPDATE tenant SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;
ALTER TABLE tenant MODIFY slug VARCHAR(80) NOT NULL;
ALTER TABLE tenant ADD CONSTRAINT uk_tenant_slug UNIQUE (slug);
```

- Agregar `private String slug;` a `TenantJpaEntity` con `@Column(name="slug")`.
- Aplicar: `./mvnw flyway:migrate -Dspring.profiles.active=dev`.

Si SÍ existe, anotar el nombre exacto del campo en Java (puede ser `slug` o `code`) — se usa en Task 11.

- [ ] **Step 10.2: Verificar `GET /turnos/appointments?branchId&date`**

```bash
grep -rn "appointments" src/main/java/lab/laboratorio/modules/turnos/presentation/controller/
```

Si NO existe ese endpoint:

```java
// Agregar al AppointmentController:
@GetMapping
@PreAuthorize("hasAnyRole('SECRETARIA','ADMINISTRADOR','RESPONSABLE_SECRETARIA')")
public List<AppointmentResponse> list(
    @RequestParam Long branchId,
    @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) java.time.LocalDate date
) {
    return listAppointmentsUseCase.execute(branchId, date).stream()
        .map(AppointmentResponse::from)
        .toList();
}
```

> Implementar `ListAppointmentsUseCase` (lookup en repo filtrando `branchId` + `appointmentDate = date` + `tenantId`). Si ya hay un endpoint similar pero con otro nombre/params, anotar y reutilizar.

- [ ] **Step 10.3: Commit (si hubo cambios)**

```bash
git add src/main/resources/db/migration/ src/main/java/lab/laboratorio/modules/
git commit -m "chore(db): V57 tenant slug (if missing) + appointments listing endpoint (if missing)"
```

---

## Task 11: Endpoint público de display TV + SecurityFilterChain

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/PublicDisplayQueueController.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/PublicQueueEntryResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/DisplaySnapshotResponse.java`
- Create: `Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/GetDisplaySnapshotUseCase.java`
- Modify: `Backend/src/main/java/lab/laboratorio/infrastructure/security/SecurityConfig.java`

- [ ] **Step 11.1: Crear DTOs**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/PublicQueueEntryResponse.java
package lab.laboratorio.modules.turnos.presentation.public_.dto;

import java.time.Instant;

public record PublicQueueEntryResponse(
    Long id,
    String publicCode,
    String status,
    Instant lastCalledAt,
    int callCount,
    Instant createdAt
) {}
```

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/dto/DisplaySnapshotResponse.java
package lab.laboratorio.modules.turnos.presentation.public_.dto;

import java.util.List;

public record DisplaySnapshotResponse(
    String tenantName,
    String branchName,
    String serverTime,        // "HH:mm"
    OpenWindow openWindow,    // nullable
    List<PublicQueueEntryResponse> entries
) {
    public record OpenWindow(String startTime, String endTime) {}
}
```

- [ ] **Step 11.2: Crear use case `GetDisplaySnapshotUseCase`**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/application/usecase/GetDisplaySnapshotUseCase.java
package lab.laboratorio.modules.turnos.application.usecase;

import lab.laboratorio.modules.turnos.domain.model.QueueEntry;
import lab.laboratorio.modules.turnos.domain.model.QueueStatus;
import lab.laboratorio.modules.turnos.domain.port.AgendaConfigRepository;
import lab.laboratorio.modules.turnos.domain.port.QueueEntryRepository;
import lab.laboratorio.modules.sucursales.domain.port.BranchRepository;
import lab.laboratorio.modules.saasadmin.domain.port.TenantRepository;
import lab.laboratorio.modules.turnos.presentation.public_.dto.DisplaySnapshotResponse;
import lab.laboratorio.modules.turnos.presentation.public_.dto.PublicQueueEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GetDisplaySnapshotUseCase {

    private final TenantRepository tenantRepository;
    private final BranchRepository branchRepository;
    private final QueueEntryRepository queueRepository;
    private final AgendaConfigRepository agendaConfigRepository;

    public DisplaySnapshotResponse execute(String tenantSlug, Long branchId) {
        var tenant = tenantRepository.findBySlug(tenantSlug)
            .orElseThrow(() -> new IllegalArgumentException("tenant not found: " + tenantSlug));

        var branch = branchRepository.findByIdAndTenant(branchId, tenant.getId())
            .orElseThrow(() -> new IllegalArgumentException("branch not found: " + branchId));

        var entries = queueRepository.findByBranchAndStatus(branchId, tenant.getId(), QueueStatus.PENDING)
            .stream()
            .sorted(Comparator.comparing(QueueEntry::getCreatedAt))
            .map(e -> new PublicQueueEntryResponse(
                e.getId(),
                e.getPublicCode(),
                e.getStatus().name(),
                e.getLastCalledAt(),
                e.getCallCount(),
                e.getCreatedAt()
            ))
            .toList();

        var openWindow = computeOpenWindow(branchId, tenant.getId());
        var serverTime = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"));

        return new DisplaySnapshotResponse(
            tenant.getName(),
            branch.getName(),
            serverTime,
            openWindow,
            entries
        );
    }

    private DisplaySnapshotResponse.OpenWindow computeOpenWindow(Long branchId, Long tenantId) {
        var today = LocalDate.now();
        var dayOfWeek = today.getDayOfWeek();

        var agendas = agendaConfigRepository.findActiveForDay(branchId, tenantId, today, dayOfWeek);
        if (agendas.isEmpty()) return null;

        var start = agendas.stream().map(a -> a.getStartTime()).min(Comparator.naturalOrder()).orElseThrow();
        var end = agendas.stream().map(a -> a.getEndTime()).max(Comparator.naturalOrder()).orElseThrow();

        return new DisplaySnapshotResponse.OpenWindow(start.toString(), end.toString());
    }
}
```

> Si `TenantRepository.findBySlug`, `BranchRepository.findByIdAndTenant`, `QueueEntryRepository.findByBranchAndStatus`, o `AgendaConfigRepository.findActiveForDay` no existen como ports, agregarlos. La firma exacta depende del proyecto — adaptar.

- [ ] **Step 11.3: Crear controller público**

```java
// Backend/src/main/java/lab/laboratorio/modules/turnos/presentation/public_/PublicDisplayQueueController.java
package lab.laboratorio.modules.turnos.presentation.public_;

import lab.laboratorio.modules.turnos.application.usecase.GetDisplaySnapshotUseCase;
import lab.laboratorio.modules.turnos.presentation.public_.dto.DisplaySnapshotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/display")
@RequiredArgsConstructor
public class PublicDisplayQueueController {

    private final GetDisplaySnapshotUseCase getSnapshot;

    @GetMapping("/{tenantSlug}/{branchId}/queue")
    public ResponseEntity<DisplaySnapshotResponse> snapshot(
        @PathVariable String tenantSlug,
        @PathVariable Long branchId
    ) {
        try {
            var snapshot = getSnapshot.execute(tenantSlug, branchId);
            return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache().mustRevalidate())
                .body(snapshot);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
```

- [ ] **Step 11.4: Excluir `/public/**` del SecurityFilterChain**

```java
// Backend/src/main/java/lab/laboratorio/infrastructure/security/SecurityConfig.java
// dentro del bean SecurityFilterChain o equivalente,
// donde se configuran los authorizeHttpRequests, agregar:

.requestMatchers("/public/**").permitAll()

// y asegurarse que el TenantContextFilter saltee este path:
// (en TenantContextFilter o donde se aplique, agregar guard:)
// if (request.getRequestURI().startsWith("/public/")) {
//     chain.doFilter(request, response);
//     return;
// }
```

> Ubicación exacta de los archivos puede variar — buscar `SecurityFilterChain` y `TenantContextFilter` con grep.

- [ ] **Step 11.5: Compilar y arrancar**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw spring-boot:run -Dspring.profiles.active=dev
```

- [ ] **Step 11.6: Smoke manual SIN auth**

```bash
# Asumiendo tenant slug "lab-alamos" y branch id 1
curl -i http://localhost:8080/public/display/lab-alamos/1/queue

# Expected: 200 con body completo (tenantName, branchName, serverTime, openWindow, entries)
# Sin Authorization header.

# Slug inexistente
curl -i http://localhost:8080/public/display/no-existe/1/queue
# Expected: 404
```

- [ ] **Step 11.7: Commit**

```bash
git add src/main/java/lab/laboratorio/
git commit -m "feat(turnos): public display endpoint for TV (no auth) + security exclusion"
```

---

## Task 12 [DELEGABLE]: Tests Backend B3

**Files:**
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/presentation/PublicDisplayQueueControllerTest.java`
- Create: `Backend/src/test/java/lab/laboratorio/modules/turnos/application/GetDisplaySnapshotUseCaseTest.java`

> Cubrir: resuelve por slug, aísla por branch, **NO incluye PII en response** (assert que el JSON no tiene `patientId`, `nationalId`, `nombre`), 404 si slug/branch inválido, accesible sin Authorization header.

- [ ] **Step 12.1: Test del controller (MockMvc, sin auth)**

> Patrón: usar `MockMvcBuilders.standaloneSetup(...)` y verificar que `mockMvc.perform(get("/public/display/lab-alamos/1/queue"))` retorna 200 sin Authorization header. Assert `jsonPath("$.entries[*].patientId").doesNotExist()`.

- [ ] **Step 12.2: Test del use case** (mockear repos, validar flujo + openWindow null cuando no hay agendas).

- [ ] **Step 12.3: Correr**

```bash
./mvnw test -Dtest='*PublicDisplay*,*DisplaySnapshot*'
```

- [ ] **Step 12.4: Commit**

```bash
git add src/test/java/lab/laboratorio/modules/turnos/
git commit -m "test(turnos): tests for public display endpoint + snapshot use case"
```

---

# Phase 2 — Frontend infraestructura

A partir de acá todo es en `C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO` (branch `feat/turnos-specs`).

## Task 13: Modelos TypeScript

**Files:**
- Create: `src/app/features/turnos/models/queue-status.enum.ts`
- Create: `src/app/features/turnos/models/queue-entry.model.ts`
- Create: `src/app/features/turnos/models/branch-totem-config.model.ts`
- Create: `src/app/features/turnos/models/appointment.model.ts`
- Create: `src/app/features/turnos/models/public-display.model.ts`
- Delete: `src/app/features/turnos/models/turno.model.ts` (placeholder vacío)

- [ ] **Step 13.1: Crear `queue-status.enum.ts`**

```ts
// src/app/features/turnos/models/queue-status.enum.ts
export enum QueueStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED',
}
```

- [ ] **Step 13.2: Crear `queue-entry.model.ts`**

```ts
// src/app/features/turnos/models/queue-entry.model.ts
import { QueueStatus } from './queue-status.enum';

export interface QueueEntry {
  id: number;
  publicCode: string;             // "CT-0023" | "ST-0007"
  nationalId: string;
  patientId: number | null;
  branchId: number;
  hasAppointment: boolean;
  status: QueueStatus;
  lastCalledAt: string | null;    // ISO timestamp
  callCount: number;
  createdAt: string;
}

export interface CallQueueEntryResponse {
  id: number;
  lastCalledAt: string;
  callCount: number;
  status: QueueStatus;
}
```

- [ ] **Step 13.3: Crear `branch-totem-config.model.ts`**

```ts
// src/app/features/turnos/models/branch-totem-config.model.ts
export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
  active: boolean;
}

export interface UpsertBranchTotemConfigRequest {
  enabled: boolean;
}
```

- [ ] **Step 13.4: Crear `appointment.model.ts`**

```ts
// src/app/features/turnos/models/appointment.model.ts
export interface Appointment {
  id: number;
  patientId: number;
  patientName: string;
  appointmentTime: string;        // ISO
  branchId: number;
  status: string;
}
```

- [ ] **Step 13.5: Crear `public-display.model.ts`**

```ts
// src/app/features/turnos/models/public-display.model.ts
import { QueueStatus } from './queue-status.enum';

export interface PublicQueueEntry {
  id: number;
  publicCode: string;
  status: QueueStatus;
  lastCalledAt: string | null;
  callCount: number;
  createdAt: string;
}

export interface OpenWindow {
  startTime: string;              // "HH:mm"
  endTime: string;                // "HH:mm"
}

export interface DisplaySnapshot {
  tenantName: string;
  branchName: string;
  serverTime: string;             // "HH:mm"
  openWindow: OpenWindow | null;  // null = no agendas activas hoy
  entries: PublicQueueEntry[];
}
```

- [ ] **Step 13.6: Borrar placeholder vacío**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
rm src/app/features/turnos/models/turno.model.ts
```

- [ ] **Step 13.7: Build pasa**

```bash
npm run build
```

- [ ] **Step 13.8: Commit**

```bash
git add src/app/features/turnos/models/
git commit -m "feat(turnos): TS models for queue, totem config, appointment, public display"
```

---

## Task 14: Services HTTP

**Files:**
- Create: `src/app/features/turnos/services/queue.service.ts`
- Create: `src/app/features/turnos/services/branch-totem-config.service.ts`
- Create: `src/app/features/turnos/services/appointment.service.ts`
- Create: `src/app/features/turnos/services/public-display.service.ts`
- Delete: `src/app/features/turnos/services/turnos.service.ts` (placeholder)

- [ ] **Step 14.1: Crear `queue.service.ts`**

```ts
// src/app/features/turnos/services/queue.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CallQueueEntryResponse, QueueEntry } from '../models/queue-entry.model';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/queue';

  list(branchId: number): Observable<QueueEntry[]> {
    const params = new HttpParams().set('branchId', String(branchId));
    return this.http.get<QueueEntry[]>(this.base, { params });
  }

  call(id: number): Observable<CallQueueEntryResponse> {
    return this.http.post<CallQueueEntryResponse>(`${this.base}/${id}/call`, {});
  }
}
```

- [ ] **Step 14.2: Crear `branch-totem-config.service.ts`**

```ts
// src/app/features/turnos/services/branch-totem-config.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BranchTotemConfig, UpsertBranchTotemConfigRequest } from '../models/branch-totem-config.model';

@Injectable({ providedIn: 'root' })
export class BranchTotemConfigService {
  private http = inject(HttpClient);
  private base = '/api/v1/sucursales/branches';

  get(branchId: number): Observable<BranchTotemConfig> {
    return this.http.get<BranchTotemConfig>(`${this.base}/${branchId}/totem-config`);
  }

  update(branchId: number, body: UpsertBranchTotemConfigRequest): Observable<BranchTotemConfig> {
    return this.http.put<BranchTotemConfig>(`${this.base}/${branchId}/totem-config`, body);
  }
}
```

- [ ] **Step 14.3: Crear `appointment.service.ts`**

```ts
// src/app/features/turnos/services/appointment.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/appointments';

  listToday(branchId: number): Observable<Appointment[]> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const params = new HttpParams()
      .set('branchId', String(branchId))
      .set('date', today);
    return this.http.get<Appointment[]>(this.base, { params });
  }
}
```

- [ ] **Step 14.4: Crear `public-display.service.ts`**

```ts
// src/app/features/turnos/services/public-display.service.ts
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DisplaySnapshot } from '../models/public-display.model';

// flag para que el auth-token.interceptor NO agregue Authorization header
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class PublicDisplayService {
  private http = inject(HttpClient);

  fetchSnapshot(tenantSlug: string, branchId: number): Observable<DisplaySnapshot> {
    return this.http.get<DisplaySnapshot>(
      `/public/display/${tenantSlug}/${branchId}/queue`,
      { context: new HttpContext().set(SKIP_AUTH, true) }
    );
  }
}
```

> Si el interceptor de auth no soporta `HttpContextToken`, modificarlo para que respete `SKIP_AUTH=true` y no agregue header. Path típico: `src/app/core/interceptors/auth-token.interceptor.ts`. Si modificás el interceptor, commit aparte: `chore(auth): add SKIP_AUTH context for public endpoints`.

- [ ] **Step 14.5: Borrar placeholder vacío**

```bash
rm src/app/features/turnos/services/turnos.service.ts
```

- [ ] **Step 14.6: Build pasa**

```bash
npm run build
```

- [ ] **Step 14.7: Commit**

```bash
git add src/app/features/turnos/services/ src/app/core/interceptors/
git commit -m "feat(turnos): HTTP services for queue, totem config, appointment, public display"
```

---

## Task 15: Store `branch-totem-config`

**Files:**
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.state.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.actions.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.reducer.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.effects.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.selectors.ts`

- [ ] **Step 15.1: State**

```ts
// src/app/features/turnos/store/branch-totem-config/branch-totem-config.state.ts
export interface BranchTotemConfigState {
  branchId: number | null;
  enabled: boolean | null;
  loading: boolean;
  error: unknown | null;
}

export const initialBranchTotemConfigState: BranchTotemConfigState = {
  branchId: null,
  enabled: null,
  loading: false,
  error: null,
};
```

- [ ] **Step 15.2: Actions**

```ts
// src/app/features/turnos/store/branch-totem-config/branch-totem-config.actions.ts
import { createAction, props } from '@ngrx/store';

export const loadBranchTotemConfig = createAction(
  '[BranchTotemConfig] Load',
  props<{ branchId: number }>()
);

export const loadBranchTotemConfigSuccess = createAction(
  '[BranchTotemConfig] Load Success',
  props<{ branchId: number; enabled: boolean }>()
);

export const loadBranchTotemConfigFailure = createAction(
  '[BranchTotemConfig] Load Failure',
  props<{ error: unknown }>()
);
```

- [ ] **Step 15.3: Reducer**

```ts
// src/app/features/turnos/store/branch-totem-config/branch-totem-config.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as A from './branch-totem-config.actions';
import { initialBranchTotemConfigState } from './branch-totem-config.state';

export const branchTotemConfigReducer = createReducer(
  initialBranchTotemConfigState,
  on(A.loadBranchTotemConfig, (s, { branchId }) => ({
    ...s, branchId, loading: true, error: null,
  })),
  on(A.loadBranchTotemConfigSuccess, (s, { branchId, enabled }) => ({
    ...s, branchId, enabled, loading: false, error: null,
  })),
  on(A.loadBranchTotemConfigFailure, (s, { error }) => ({
    ...s, loading: false, error,
  })),
);
```

- [ ] **Step 15.4: Effects (con 404 silent → enabled=false)**

```ts
// src/app/features/turnos/store/branch-totem-config/branch-totem-config.effects.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { BranchTotemConfigService } from '../../services/branch-totem-config.service';
import * as A from './branch-totem-config.actions';

@Injectable()
export class BranchTotemConfigEffects {
  private actions$ = inject(Actions);
  private service = inject(BranchTotemConfigService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadBranchTotemConfig),
    switchMap(({ branchId }) => this.service.get(branchId).pipe(
      map(config => A.loadBranchTotemConfigSuccess({ branchId, enabled: config.enabled })),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(A.loadBranchTotemConfigSuccess({ branchId, enabled: false }));
        }
        return of(A.loadBranchTotemConfigFailure({ error: err }));
      }),
    )),
  ));
}
```

- [ ] **Step 15.5: Selectors**

```ts
// src/app/features/turnos/store/branch-totem-config/branch-totem-config.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BranchTotemConfigState } from './branch-totem-config.state';

export const selectBranchTotemConfigState =
  createFeatureSelector<BranchTotemConfigState>('branchTotemConfig');

export const selectBranchTotemEnabled = createSelector(
  selectBranchTotemConfigState,
  (s) => s.enabled,
);

export const selectBranchTotemLoading = createSelector(
  selectBranchTotemConfigState,
  (s) => s.loading,
);
```

- [ ] **Step 15.6: Commit**

```bash
git add src/app/features/turnos/store/branch-totem-config/
git commit -m "feat(turnos): NgRx store for branch-totem-config (404 silent)"
```

---

## Task 16: Store `queue`

**Files:**
- Create: 5 archivos en `src/app/features/turnos/store/queue/`.

- [ ] **Step 16.1: State**

```ts
// src/app/features/turnos/store/queue/queue.state.ts
import { QueueEntry } from '../../models/queue-entry.model';

export interface QueueState {
  entries: QueueEntry[];
  loading: boolean;
  callingId: number | null;
  error: unknown | null;
}

export const initialQueueState: QueueState = {
  entries: [],
  loading: false,
  callingId: null,
  error: null,
};
```

- [ ] **Step 16.2: Actions**

```ts
// src/app/features/turnos/store/queue/queue.actions.ts
import { createAction, props } from '@ngrx/store';
import { QueueEntry } from '../../models/queue-entry.model';

export const loadQueue = createAction(
  '[Queue] Load',
  props<{ branchId: number }>()
);
export const loadQueueSuccess = createAction(
  '[Queue] Load Success',
  props<{ entries: QueueEntry[] }>()
);
export const loadQueueFailure = createAction(
  '[Queue] Load Failure',
  props<{ error: unknown }>()
);

export const callQueueEntry = createAction(
  '[Queue] Call Entry',
  props<{ id: number; branchId: number }>()
);
export const callQueueEntrySuccess = createAction(
  '[Queue] Call Entry Success',
  props<{ id: number; branchId: number }>()
);
export const callQueueEntryFailure = createAction(
  '[Queue] Call Entry Failure',
  props<{ error: unknown }>()
);
```

- [ ] **Step 16.3: Reducer**

```ts
// src/app/features/turnos/store/queue/queue.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as A from './queue.actions';
import { initialQueueState } from './queue.state';

export const queueReducer = createReducer(
  initialQueueState,
  on(A.loadQueue, (s) => ({ ...s, loading: true, error: null })),
  on(A.loadQueueSuccess, (s, { entries }) => ({ ...s, entries, loading: false })),
  on(A.loadQueueFailure, (s, { error }) => ({ ...s, loading: false, error })),

  on(A.callQueueEntry, (s, { id }) => ({ ...s, callingId: id })),
  on(A.callQueueEntrySuccess, (s) => ({ ...s, callingId: null })),
  on(A.callQueueEntryFailure, (s, { error }) => ({ ...s, callingId: null, error })),
);
```

- [ ] **Step 16.4: Effects**

```ts
// src/app/features/turnos/store/queue/queue.effects.ts
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { QueueService } from '../../services/queue.service';
import * as A from './queue.actions';

@Injectable()
export class QueueEffects {
  private actions$ = inject(Actions);
  private service = inject(QueueService);
  private toast = inject(MessageService);

  load$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadQueue),
    switchMap(({ branchId }) => this.service.list(branchId).pipe(
      map(entries => A.loadQueueSuccess({ entries })),
      catchError(error => of(A.loadQueueFailure({ error }))),
    )),
  ));

  call$ = createEffect(() => this.actions$.pipe(
    ofType(A.callQueueEntry),
    switchMap(({ id, branchId }) => this.service.call(id).pipe(
      tap(() => this.toast.add({ severity: 'success', summary: 'Llamado registrado' })),
      switchMap(() => of(
        A.callQueueEntrySuccess({ id, branchId }),
        A.loadQueue({ branchId }),  // refresh
      )),
      catchError(error => {
        const msg = error?.status === 409
          ? 'El turno ya fue completado o cancelado'
          : 'No se pudo registrar la llamada';
        this.toast.add({ severity: 'error', summary: msg });
        return of(A.callQueueEntryFailure({ error }));
      }),
    )),
  ));
}
```

- [ ] **Step 16.5: Selectors**

```ts
// src/app/features/turnos/store/queue/queue.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { QueueStatus } from '../../models/queue-status.enum';
import { QueueState } from './queue.state';

export const selectQueueState = createFeatureSelector<QueueState>('queue');

export const selectQueueEntriesWithAppointment = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && e.hasAppointment),
);

export const selectQueueEntriesWalkIn = createSelector(
  selectQueueState,
  (s) => s.entries.filter(e => e.status === QueueStatus.PENDING && !e.hasAppointment),
);

export const selectQueueLoading = createSelector(selectQueueState, (s) => s.loading);
export const selectQueueCallingId = createSelector(selectQueueState, (s) => s.callingId);
```

- [ ] **Step 16.6: Commit**

```bash
git add src/app/features/turnos/store/queue/
git commit -m "feat(turnos): NgRx store for queue (load + call entry)"
```

---

## Task 17: Store `appointments`

**Files:**
- Create: 5 archivos en `src/app/features/turnos/store/appointments/`.

- [ ] **Step 17.1: State**

```ts
// src/app/features/turnos/store/appointments/appointments.state.ts
import { Appointment } from '../../models/appointment.model';

export interface AppointmentsState {
  todayByBranch: Appointment[];
  loading: boolean;
  error: unknown | null;
}

export const initialAppointmentsState: AppointmentsState = {
  todayByBranch: [],
  loading: false,
  error: null,
};
```

- [ ] **Step 17.2: Actions**

```ts
// src/app/features/turnos/store/appointments/appointments.actions.ts
import { createAction, props } from '@ngrx/store';
import { Appointment } from '../../models/appointment.model';

export const loadTodayAppointments = createAction(
  '[Appointments] Load Today',
  props<{ branchId: number }>()
);
export const loadTodayAppointmentsSuccess = createAction(
  '[Appointments] Load Today Success',
  props<{ appointments: Appointment[] }>()
);
export const loadTodayAppointmentsFailure = createAction(
  '[Appointments] Load Today Failure',
  props<{ error: unknown }>()
);
```

- [ ] **Step 17.3: Reducer**

```ts
// src/app/features/turnos/store/appointments/appointments.reducer.ts
import { createReducer, on } from '@ngrx/store';
import * as A from './appointments.actions';
import { initialAppointmentsState } from './appointments.state';

export const appointmentsReducer = createReducer(
  initialAppointmentsState,
  on(A.loadTodayAppointments, (s) => ({ ...s, loading: true, error: null })),
  on(A.loadTodayAppointmentsSuccess, (s, { appointments }) => ({
    ...s, todayByBranch: appointments, loading: false,
  })),
  on(A.loadTodayAppointmentsFailure, (s, { error }) => ({ ...s, loading: false, error })),
);
```

- [ ] **Step 17.4: Effects**

```ts
// src/app/features/turnos/store/appointments/appointments.effects.ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AppointmentService } from '../../services/appointment.service';
import * as A from './appointments.actions';

@Injectable()
export class AppointmentsEffects {
  private actions$ = inject(Actions);
  private service = inject(AppointmentService);

  loadToday$ = createEffect(() => this.actions$.pipe(
    ofType(A.loadTodayAppointments),
    switchMap(({ branchId }) => this.service.listToday(branchId).pipe(
      map(appointments => A.loadTodayAppointmentsSuccess({ appointments })),
      catchError(error => of(A.loadTodayAppointmentsFailure({ error }))),
    )),
  ));
}
```

- [ ] **Step 17.5: Selectors**

```ts
// src/app/features/turnos/store/appointments/appointments.selectors.ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AppointmentsState } from './appointments.state';

export const selectAppointmentsState = createFeatureSelector<AppointmentsState>('appointments');
export const selectTodayAppointments = createSelector(selectAppointmentsState, (s) => s.todayByBranch);
export const selectAppointmentsLoading = createSelector(selectAppointmentsState, (s) => s.loading);
```

- [ ] **Step 17.6: Commit**

```bash
git add src/app/features/turnos/store/appointments/
git commit -m "feat(turnos): NgRx store for today appointments"
```

---

## Task 18: Registrar feature stores en `turnos.routes.ts`

**Files:**
- Modify: `src/app/features/turnos/turnos.routes.ts`

- [ ] **Step 18.1: Editar `turnos.routes.ts`**

```ts
// src/app/features/turnos/turnos.routes.ts
import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { queueReducer } from './store/queue/queue.reducer';
import { QueueEffects } from './store/queue/queue.effects';
import { appointmentsReducer } from './store/appointments/appointments.reducer';
import { AppointmentsEffects } from './store/appointments/appointments.effects';
import { branchTotemConfigReducer } from './store/branch-totem-config/branch-totem-config.reducer';
import { BranchTotemConfigEffects } from './store/branch-totem-config/branch-totem-config.effects';

export const TURNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      provideState('queue', queueReducer),
      provideState('appointments', appointmentsReducer),
      provideState('branchTotemConfig', branchTotemConfigReducer),
      provideEffects([QueueEffects, AppointmentsEffects, BranchTotemConfigEffects]),
    ],
    children: [
      { path: '', redirectTo: 'agenda', pathMatch: 'full' },
      { path: 'agenda',         loadComponent: () => import('./pages/agenda/agenda.component').then(m => m.AgendaComponent) },
      { path: 'configuracion',  loadComponent: () => import('./pages/configuracion/configuracion.component').then(m => m.ConfiguracionComponent) },
      { path: 'totem',          loadComponent: () => import('./pages/totem/totem.component').then(m => m.TotemComponent) },
      { path: 'atencion-turno', loadComponent: () => import('./pages/atencion-turno/atencion-turno.component').then(m => m.AtencionTurnoComponent) },
      // recepcion va a sumarse en Task 22.
      // colas se elimina.
    ],
  },
];
```

> Nota: la ruta `colas` la sacamos (era placeholder). `recepcion` se agrega más adelante (Task 22).

- [ ] **Step 18.2: Borrar el placeholder de colas (y stagear el delete)**

```bash
git rm -r src/app/features/turnos/pages/colas
```

- [ ] **Step 18.3: Build pasa**

```bash
npm run build
```

- [ ] **Step 18.4: Commit**

```bash
git add src/app/features/turnos/turnos.routes.ts
git commit -m "feat(turnos): register feature stores + drop colas placeholder"
```

---

## Task 19: Guard `recepcion-access.guard.ts`

**Files:**
- Create: `src/app/features/turnos/guards/recepcion-access.guard.ts`

- [ ] **Step 19.1: Crear guard**

```ts
// src/app/features/turnos/guards/recepcion-access.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

const ALLOWED = ['SECRETARIA', 'ADMINISTRADOR', 'RESPONSABLE_SECRETARIA'];

export const recepcionAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const roles = auth.currentUser()?.roles?.map(r => r.code) ?? [];
  if (roles.some(r => ALLOWED.includes(r))) return true;

  router.navigate(['/home']);
  return false;
};
```

> Adaptar `currentUser()` y `roles` al shape real del `AuthService`. Buscar el path real con `grep -rn "currentUser" src/app/core/auth`.

- [ ] **Step 19.2: Build pasa**

```bash
npm run build
```

- [ ] **Step 19.3: Commit**

```bash
git add src/app/features/turnos/guards/
git commit -m "feat(turnos): recepcion access guard (SECRETARIA | ADMINISTRADOR | RESPONSABLE_SECRETARIA)"
```

---

## Task 20: Util `api-error-mapper` compartido (si no existe)

**Files:**
- Create (condicional): `src/app/shared/utils/api-error-mapper.ts`

- [ ] **Step 20.1: Verificar si existe**

```bash
find src/app -name "api-error-mapper*" -o -name "agenda-error-mapper*"
```

- [ ] **Step 20.2: Si NO existe, crearlo**

```ts
// src/app/shared/utils/api-error-mapper.ts
import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function toApiError(err: unknown): ApiErrorResponse {
  if (err instanceof HttpErrorResponse) {
    const body = err.error ?? {};
    return {
      code: body.code ?? `HTTP_${err.status}`,
      message: body.message ?? err.message,
      fieldErrors: body.fieldErrors,
    };
  }
  return { code: 'UNKNOWN', message: String(err) };
}
```

- [ ] **Step 20.3: Build pasa**

```bash
npm run build
```

- [ ] **Step 20.4: Commit (si se creó)**

```bash
git add src/app/shared/utils/
git commit -m "feat(shared): api-error-mapper utility (shared by features)"
```

---

## Task 21 [DELEGABLE]: Tests stores + services frontend

**Files:**
- Create: `src/app/features/turnos/store/queue/queue.reducer.spec.ts`
- Create: `src/app/features/turnos/store/queue/queue.effects.spec.ts`
- Create: `src/app/features/turnos/store/queue/queue.selectors.spec.ts`
- Create: `src/app/features/turnos/store/appointments/appointments.reducer.spec.ts`
- Create: `src/app/features/turnos/store/appointments/appointments.effects.spec.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.reducer.spec.ts`
- Create: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.effects.spec.ts`
- Create: `src/app/features/turnos/services/queue.service.spec.ts`
- Create: `src/app/features/turnos/services/branch-totem-config.service.spec.ts`
- Create: `src/app/features/turnos/services/appointment.service.spec.ts`
- Create: `src/app/features/turnos/services/public-display.service.spec.ts`

> DELEGABLE. Patrón sugerido para cada uno:
> - **Reducer:** crear state, dispatch action, assert state mutado correctamente.
> - **Effects:** mock service con `marbles` o `firstValueFrom`, dispatch action, assert action de output.
> - **Selectors:** crear state fixture, llamar selector, assert resultado.
> - **Services:** `HttpTestingController` smoke (URL + method + body correctos).

**Caso crítico de `branch-totem-config.effects.spec.ts`** (no skip si vas a correr tests):

```ts
it('on 404, dispatches Success with enabled=false', (done) => {
  service.get.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
  actions$ = of(loadBranchTotemConfig({ branchId: 1 }));

  effects.load$.subscribe(action => {
    expect(action).toEqual(loadBranchTotemConfigSuccess({ branchId: 1, enabled: false }));
    done();
  });
});
```

- [ ] **Step 21.N: Correr tests**

```bash
npx vitest run --reporter=verbose src/app/features/turnos
```

Expected: todos pasan.

- [ ] **Step 21.N+1: Commit**

```bash
git add src/app/features/turnos/{store,services}
git commit -m "test(turnos): tests for stores and services"
```

---

# Phase 3 — Frontend pantallas

## Task 22: Toggle inline "Tiene tótem" en `/sucursales/lista`

**Files:**
- Modify: `src/app/features/sucursales/pages/sucursales/sucursales.component.ts`
- Modify: `src/app/features/sucursales/services/sucursales.service.ts`
- Create: `src/app/features/sucursales/models/branch-totem-config.model.ts`

- [ ] **Step 22.1: Crear modelo local en sucursales**

```ts
// src/app/features/sucursales/models/branch-totem-config.model.ts
export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
}
```

- [ ] **Step 22.2: Agregar método al service**

```ts
// src/app/features/sucursales/services/sucursales.service.ts
// agregar al SucursalesService existente:

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BranchTotemConfig } from '../models/branch-totem-config.model';

// dentro de la clase:
getTotemConfig(branchId: number): Observable<BranchTotemConfig | null> {
  return this.http.get<BranchTotemConfig>(`/api/v1/sucursales/branches/${branchId}/totem-config`).pipe(
    catchError((err: HttpErrorResponse) => err.status === 404 ? of(null) : throwError(() => err)),
  );
}

updateTotemConfig(branchId: number, enabled: boolean): Observable<BranchTotemConfig> {
  return this.http.put<BranchTotemConfig>(
    `/api/v1/sucursales/branches/${branchId}/totem-config`,
    { enabled }
  );
}
```

> Imports a sumar: `import { catchError, of, throwError } from 'rxjs';` y `import { HttpErrorResponse } from '@angular/common/http';`.

- [ ] **Step 22.3: Modificar `sucursales.component.ts` para sumar columna tótem con `p-inputSwitch`**

> Adaptar al template/estructura existente. Pasos:
> 1. Inyectar `SucursalesService` (ya está).
> 2. Crear signal `totemEnabledById = signal<Record<number, boolean>>({})`.
> 3. En `ngOnInit` (o donde se carguen las sucursales), para cada sucursal: `service.getTotemConfig(s.id).subscribe(c => totemEnabledById.update(m => ({ ...m, [s.id]: c?.enabled ?? false })))`.
> 4. En el template, agregar columna en la tabla:

```html
<p-column header="Tótem">
  <ng-template pTemplate="body" let-row>
    <p-inputSwitch
      [ngModel]="totemEnabledById()[row.id]"
      [disabled]="!isAdmin()"
      (onChange)="onToggleTotem(row.id, $event.checked)"
    />
  </ng-template>
</p-column>
```

> 5. Agregar método `onToggleTotem(branchId: number, enabled: boolean)`:

```ts
onToggleTotem(branchId: number, enabled: boolean) {
  const prev = this.totemEnabledById()[branchId];
  this.totemEnabledById.update(m => ({ ...m, [branchId]: enabled })); // optimistic
  this.service.updateTotemConfig(branchId, enabled).subscribe({
    next: () => this.toast.add({ severity: 'success', summary: 'Tótem actualizado' }),
    error: () => {
      this.totemEnabledById.update(m => ({ ...m, [branchId]: prev })); // revert
      this.toast.add({ severity: 'error', summary: 'No se pudo actualizar' });
    },
  });
}

isAdmin = computed(() => this.auth.currentUser()?.roles?.some(r => r.code === 'ADMINISTRADOR') ?? false);
```

- [ ] **Step 22.4: Build + dev server smoke**

```bash
npm run build && npm start
```

Abrir `http://localhost:4200/sucursales/lista` como ADMINISTRADOR. Toggle debería cambiar el estado y persistir tras reload.

- [ ] **Step 22.5: Commit**

```bash
git add src/app/features/sucursales/
git commit -m "feat(sucursales): inline totem toggle on branches list"
```

---

## Task 23: `recepcion.page.ts` — contenedor + rutas

**Files:**
- Create: `src/app/features/turnos/pages/recepcion/recepcion.page.ts`
- Create: `src/app/features/turnos/pages/recepcion/recepcion.page.html`
- Create: `src/app/features/turnos/pages/recepcion/recepcion.page.scss`
- Modify: `src/app/features/turnos/turnos.routes.ts` (sumar ruta)

- [ ] **Step 23.1: Crear contenedor**

```ts
// src/app/features/turnos/pages/recepcion/recepcion.page.ts
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthService } from '@core/auth/auth.service';
import { loadBranchTotemConfig } from '../../store/branch-totem-config/branch-totem-config.actions';
import { selectBranchTotemEnabled, selectBranchTotemLoading } from '../../store/branch-totem-config/branch-totem-config.selectors';
import { RecepcionConTotemComponent } from './recepcion-con-totem.component';
import { RecepcionSinTotemComponent } from './recepcion-sin-totem.component';

@Component({
  selector: 'app-recepcion-page',
  standalone: true,
  imports: [RecepcionConTotemComponent, RecepcionSinTotemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion.page.html',
  styleUrl: './recepcion.page.scss',
})
export class RecepcionPage implements OnInit {
  private store = inject(Store);
  private auth = inject(AuthService);

  enabled = this.store.selectSignal(selectBranchTotemEnabled);
  loading = this.store.selectSignal(selectBranchTotemLoading);

  branchId = this.resolveBranchId();

  ngOnInit() {
    this.store.dispatch(loadBranchTotemConfig({ branchId: this.branchId }));
  }

  private resolveBranchId(): number {
    const id = this.auth.currentUser()?.branch;
    if (id == null) {
      console.warn('[recepcion] currentUser.branchId no resuelto — usando mock branchId=1');
      return 1;
    }
    return id;
  }
}
```

- [ ] **Step 23.2: Template del contenedor**

```html
<!-- src/app/features/turnos/pages/recepcion/recepcion.page.html -->
@if (loading()) {
  <p-skeleton width="100%" height="20rem" />
} @else if (enabled() === true) {
  <app-recepcion-con-totem [branchId]="branchId" />
} @else {
  <app-recepcion-sin-totem [branchId]="branchId" />
}
```

- [ ] **Step 23.3: SCSS (puede quedar vacío)**

```scss
/* src/app/features/turnos/pages/recepcion/recepcion.page.scss */
:host { display: block; padding: 1rem; }
```

- [ ] **Step 23.4: Agregar ruta en `turnos.routes.ts`**

```ts
// dentro de children:
{
  path: 'recepcion',
  canActivate: [recepcionAccessGuard],
  loadComponent: () => import('./pages/recepcion/recepcion.page').then(m => m.RecepcionPage),
},
```

> Importar el guard en el top del archivo:
> `import { recepcionAccessGuard } from './guards/recepcion-access.guard';`

- [ ] **Step 23.5: Commit (los sub-componentes vienen en las siguientes tasks; build aún no pasa)**

```bash
git add src/app/features/turnos/pages/recepcion/recepcion.page.* src/app/features/turnos/turnos.routes.ts
git commit -m "feat(turnos): recepcion page container (decides mode by totem flag)"
```

---

## Task 24: `recepcion-con-totem.component`

**Files:**
- Create: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss`

- [ ] **Step 24.1: Component TS**

```ts
// src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { callQueueEntry, loadQueue } from '../../store/queue/queue.actions';
import { selectQueueEntriesWalkIn, selectQueueEntriesWithAppointment, selectQueueLoading } from '../../store/queue/queue.selectors';
import { QueueRowActionsComponent } from '../../components/queue-row-actions.component';

@Component({
  selector: 'app-recepcion-con-totem',
  standalone: true,
  imports: [TableModule, ButtonModule, MenuModule, CardModule, BadgeModule, QueueRowActionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-con-totem.component.html',
  styleUrl: './recepcion-con-totem.component.scss',
})
export class RecepcionConTotemComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  withAppointment = this.store.selectSignal(selectQueueEntriesWithAppointment);
  walkIn = this.store.selectSignal(selectQueueEntriesWalkIn);
  loading = this.store.selectSignal(selectQueueLoading);

  ngOnInit() {
    this.store.dispatch(loadQueue({ branchId: this.branchId }));
    interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.store.dispatch(loadQueue({ branchId: this.branchId }));
    });
  }

  onCall(id: number) {
    this.store.dispatch(callQueueEntry({ id, branchId: this.branchId }));
  }

  onNuevaAtencion(id: number) {
    this.router.navigate(['/turnos/atencion-turno', id]);
  }
}
```

- [ ] **Step 24.2: Template**

```html
<!-- src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.html -->
<div class="grid">
  <p-card class="col" header="Con turno">
    <p-table [value]="withAppointment()" [loading]="loading()">
      <ng-template pTemplate="header">
        <tr><th>Código</th><th>DNI</th><th>Llamadas</th><th></th></tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.publicCode }}</td>
          <td>{{ row.nationalId }}</td>
          <td>
            @if (row.callCount > 0) {
              <p-badge [value]="row.callCount" severity="warn" />
            }
          </td>
          <td>
            <app-queue-row-actions
              [entryId]="row.id"
              (call)="onCall(row.id)"
              (nuevaAtencion)="onNuevaAtencion(row.id)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4">Sin pacientes con turno en cola</td></tr>
      </ng-template>
    </p-table>
  </p-card>

  <p-card class="col" header="Sin turno">
    <p-table [value]="walkIn()" [loading]="loading()">
      <ng-template pTemplate="header">
        <tr><th>Código</th><th>DNI</th><th>Llamadas</th><th></th></tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.publicCode }}</td>
          <td>{{ row.nationalId }}</td>
          <td>
            @if (row.callCount > 0) {
              <p-badge [value]="row.callCount" severity="warn" />
            }
          </td>
          <td>
            <app-queue-row-actions
              [entryId]="row.id"
              (call)="onCall(row.id)"
              (nuevaAtencion)="onNuevaAtencion(row.id)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="4">Sin walk-ins en cola</td></tr>
      </ng-template>
    </p-table>
  </p-card>
</div>
```

- [ ] **Step 24.3: SCSS**

```scss
/* src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.scss */
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
.col { min-height: 60vh; }
```

- [ ] **Step 24.4: Commit (build aún falla porque falta `QueueRowActionsComponent`)**

```bash
git add src/app/features/turnos/pages/recepcion/recepcion-con-totem.*
git commit -m "feat(turnos): recepcion-con-totem with two lists + polling"
```

---

## Task 25: `recepcion-sin-totem.component`

**Files:**
- Create: `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.ts`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.html`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.scss`

- [ ] **Step 25.1: Component TS**

```ts
// src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { loadTodayAppointments } from '../../store/appointments/appointments.actions';
import { selectAppointmentsLoading, selectTodayAppointments } from '../../store/appointments/appointments.selectors';

@Component({
  selector: 'app-recepcion-sin-totem',
  standalone: true,
  imports: [TableModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recepcion-sin-totem.component.html',
  styleUrl: './recepcion-sin-totem.component.scss',
})
export class RecepcionSinTotemComponent implements OnInit {
  @Input({ required: true }) branchId!: number;

  private store = inject(Store);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  appointments = this.store.selectSignal(selectTodayAppointments);
  loading = this.store.selectSignal(selectAppointmentsLoading);

  ngOnInit() {
    this.store.dispatch(loadTodayAppointments({ branchId: this.branchId }));
    interval(5000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.store.dispatch(loadTodayAppointments({ branchId: this.branchId }));
    });
  }

  onAtender(appointmentId: number) {
    this.router.navigate(['/turnos/atencion-turno'], { queryParams: { appointmentId } });
  }

  onWalkIn() {
    this.router.navigate(['/turnos/atencion-turno']);
  }
}
```

- [ ] **Step 25.2: Template**

```html
<!-- src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.html -->
<div class="header">
  <h2>Turnos de hoy</h2>
  <p-button label="Atención nueva (walk-in)" icon="pi pi-plus" (onClick)="onWalkIn()" />
</div>

<p-table [value]="appointments()" [loading]="loading()">
  <ng-template pTemplate="header">
    <tr><th>Hora</th><th>Paciente</th><th></th></tr>
  </ng-template>
  <ng-template pTemplate="body" let-row>
    <tr>
      <td>{{ row.appointmentTime | date: 'HH:mm' }}</td>
      <td>{{ row.patientName }}</td>
      <td>
        <p-button label="Atender" size="small" (onClick)="onAtender(row.id)" />
      </td>
    </tr>
  </ng-template>
  <ng-template pTemplate="emptymessage">
    <tr><td colspan="3">Sin turnos para hoy</td></tr>
  </ng-template>
</p-table>
```

- [ ] **Step 25.3: SCSS**

```scss
/* src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.scss */
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
```

- [ ] **Step 25.4: Commit**

```bash
git add src/app/features/turnos/pages/recepcion/recepcion-sin-totem.*
git commit -m "feat(turnos): recepcion-sin-totem with today appointments + walk-in"
```

---

## Task 26: `queue-row-actions.component` (menú 3 puntitos)

**Files:**
- Create: `src/app/features/turnos/components/queue-row-actions.component.ts`
- Create: `src/app/features/turnos/components/queue-row-actions.component.html`

- [ ] **Step 26.1: Component**

```ts
// src/app/features/turnos/components/queue-row-actions.component.ts
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-queue-row-actions',
  standalone: true,
  imports: [MenuModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './queue-row-actions.component.html',
})
export class QueueRowActionsComponent {
  @Input({ required: true }) entryId!: number;
  @Output() call = new EventEmitter<void>();
  @Output() nuevaAtencion = new EventEmitter<void>();

  items: MenuItem[] = [
    { label: 'Llamar por pantalla', icon: 'pi pi-megaphone', command: () => this.call.emit() },
    { label: 'Nueva atención', icon: 'pi pi-arrow-right', command: () => this.nuevaAtencion.emit() },
  ];
}
```

- [ ] **Step 26.2: Template**

```html
<!-- src/app/features/turnos/components/queue-row-actions.component.html -->
<p-menu #menu [model]="items" [popup]="true" appendTo="body" />
<p-button icon="pi pi-ellipsis-v" rounded text severity="secondary"
  (onClick)="menu.toggle($event)" [ariaLabel]="'Acciones turno ' + entryId" />
```

- [ ] **Step 26.3: Build pasa (recepción ya debería compilar entera)**

```bash
npm run build
```

- [ ] **Step 26.4: Dev server smoke**

```bash
npm start
# abrir http://localhost:4200/turnos/recepcion como SECRETARIA
# verificar que renderiza skeleton → modo correcto según flag de la sucursal del user
```

- [ ] **Step 26.5: Commit**

```bash
git add src/app/features/turnos/components/
git commit -m "feat(turnos): reusable queue-row-actions menu"
```

---

## Task 27: Beep audio asset

**Files:**
- Create: `src/assets/audio/beep.mp3`
- Modify: `angular.json` (asegurar que `src/assets` está en assets array)

- [ ] **Step 27.1: Descargar / generar un beep de ~1 seg**

> Opciones:
> - Generar online (ej: https://onlinetonegenerator.com/, descargar como mp3, 1 seg, 800 Hz).
> - Usar uno free como `https://cdn.pixabay.com/audio/2022/03/15/audio_8b07eb6f95.mp3` (verificar licencia).
> - Cualquier mp3 de ~10KB sirve.

Guardar como `src/assets/audio/beep.mp3`.

- [ ] **Step 27.2: Verificar assets en `angular.json`**

```bash
grep -A3 '"assets"' angular.json
```

Si `src/assets` no está, agregarlo al array de assets del target build.

- [ ] **Step 27.3: Commit**

```bash
git add src/assets/audio/beep.mp3 angular.json
git commit -m "feat(turnos): beep audio asset for TV"
```

---

## Task 28: `sala-espera.page` (TV) — contenedor + signals + polling

**Files:**
- Create: `src/app/features/turnos/pages/sala-espera/sala-espera.page.ts`
- Create: `src/app/features/turnos/pages/sala-espera/sala-espera.page.html`
- Create: `src/app/features/turnos/pages/sala-espera/sala-espera.page.scss`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 28.1: Component TS con signals**

```ts
// src/app/features/turnos/pages/sala-espera/sala-espera.page.ts
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, startWith, switchMap } from 'rxjs';
import { DisplaySnapshot, PublicQueueEntry } from '../../models/public-display.model';
import { QueueStatus } from '../../models/queue-status.enum';
import { PublicDisplayService } from '../../services/public-display.service';
import { EmptyStateComponent } from './empty-state.component';
import { ClosedStateComponent } from './closed-state.component';

@Component({
  selector: 'app-sala-espera-page',
  standalone: true,
  imports: [EmptyStateComponent, ClosedStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sala-espera.page.html',
  styleUrl: './sala-espera.page.scss',
})
export class SalaEsperaPage implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PublicDisplayService);
  private destroyRef = inject(DestroyRef);

  tenantSlug = this.route.snapshot.paramMap.get('tenantSlug') ?? '';
  branchId = Number(this.route.snapshot.paramMap.get('branchId') ?? '');

  snapshot = signal<DisplaySnapshot | null>(null);
  lastSuccessfulFetch = signal<number>(0);
  previousCalledId = signal<number | null>(null);

  connectionLost = computed(() => {
    const last = this.lastSuccessfulFetch();
    return last > 0 && Date.now() - last > 15000;
  });

  calledEntry = computed<PublicQueueEntry | null>(() => {
    const entries = this.snapshot()?.entries ?? [];
    const pending = entries.filter(e => e.status === QueueStatus.PENDING && e.lastCalledAt);
    if (!pending.length) return null;
    const mostRecent = pending.reduce((a, b) =>
      new Date(a.lastCalledAt!) > new Date(b.lastCalledAt!) ? a : b
    );
    const ageSeconds = (Date.now() - new Date(mostRecent.lastCalledAt!).getTime()) / 1000;
    return ageSeconds < 15 ? mostRecent : null;
  });

  upcomingEntries = computed<PublicQueueEntry[]>(() => {
    const entries = this.snapshot()?.entries ?? [];
    const called = this.calledEntry();
    return entries
      .filter(e => e.status === QueueStatus.PENDING && e.id !== called?.id && !e.lastCalledAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, 5);
  });

  viewMode = computed<'loading' | 'queue' | 'empty' | 'closed'>(() => {
    const snap = this.snapshot();
    if (!snap) return 'loading';
    if (this.isClosed(snap)) return 'closed';
    if (snap.entries.filter(e => e.status === QueueStatus.PENDING).length === 0) return 'empty';
    return 'queue';
  });

  constructor() {
    effect(() => {
      const current = this.calledEntry();
      if (current && current.id !== this.previousCalledId()) {
        this.playBeep();
        this.previousCalledId.set(current.id);
      }
    });
  }

  ngOnInit() {
    if (!this.tenantSlug || !this.branchId) return;
    interval(3000).pipe(
      startWith(0),
      switchMap(() => this.service.fetchSnapshot(this.tenantSlug, this.branchId)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: snap => {
        this.snapshot.set(snap);
        this.lastSuccessfulFetch.set(Date.now());
      },
      // network error: mantenemos último snapshot
    });
  }

  private isClosed(snap: DisplaySnapshot): boolean {
    if (!snap.openWindow) return false;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return hhmm < snap.openWindow.startTime || hhmm > snap.openWindow.endTime;
  }

  private playBeep() {
    try {
      const audio = new Audio('/assets/audio/beep.mp3');
      audio.play().catch(err => console.warn('[sala-espera] beep blocked:', err));
    } catch (e) {
      console.warn('[sala-espera] beep error:', e);
    }
  }
}
```

- [ ] **Step 28.2: Template**

```html
<!-- src/app/features/turnos/pages/sala-espera/sala-espera.page.html -->
@if (!tenantSlug || !branchId) {
  <div class="invalid-url">URL inválida — falta tenantSlug o branchId</div>
} @else {
  @if (connectionLost()) {
    <div class="banner-disconnected">⚠ Reconectando...</div>
  }

  @switch (viewMode()) {
    @case ('loading') {
      <div class="loading">Cargando...</div>
    }
    @case ('empty') {
      <app-empty-state
        [serverTime]="snapshot()?.serverTime ?? ''"
        [branchName]="snapshot()?.branchName ?? ''"
      />
    }
    @case ('closed') {
      <app-closed-state [reopenTime]="snapshot()?.openWindow?.startTime ?? ''" />
    }
    @case ('queue') {
      <div class="layout">
        @if (calledEntry()) {
          <div class="destacado">
            <h1>LLAMANDO AHORA</h1>
            <div class="code">{{ calledEntry()!.publicCode }}</div>
            <div class="hint">→ acercate al mostrador</div>
          </div>
        }
        @if (upcomingEntries().length) {
          <div class="proximos">
            <h2>Próximos turnos:</h2>
            <ul>
              @for (e of upcomingEntries(); track e.id) {
                <li>{{ e.publicCode }}</li>
              }
            </ul>
          </div>
        }
        <div class="footer">
          {{ snapshot()?.serverTime }} hs &mdash;
          {{ snapshot()?.tenantName }} — {{ snapshot()?.branchName }}
        </div>
      </div>
    }
  }
}
```

- [ ] **Step 28.3: SCSS**

```scss
/* src/app/features/turnos/pages/sala-espera/sala-espera.page.scss */
:host { display: block; height: 100vh; background: #0f172a; color: white; padding: 2rem; }

.invalid-url { font-size: 2rem; text-align: center; padding-top: 30vh; }
.loading { font-size: 2rem; text-align: center; padding-top: 40vh; }

.banner-disconnected {
  position: fixed; top: 0; left: 0; right: 0;
  background: #f59e0b; color: black;
  padding: 0.5rem 1rem; text-align: center; font-weight: 600;
  z-index: 100;
}

.layout { display: grid; grid-template-rows: 1fr auto auto; height: 100%; gap: 2rem; }

.destacado {
  text-align: center;
  display: flex; flex-direction: column; justify-content: center;
  h1 { font-size: 2rem; letter-spacing: 0.2em; opacity: 0.7; margin-bottom: 1rem; }
  .code { font-size: 12rem; font-weight: 900; line-height: 1; }
  .hint { font-size: 1.5rem; margin-top: 1rem; opacity: 0.8; }
}

.proximos {
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  padding-top: 1.5rem;
  h2 { font-size: 1.5rem; margin-bottom: 1rem; opacity: 0.7; }
  ul { display: flex; gap: 2rem; list-style: none; padding: 0; font-size: 2rem; }
}

.footer { text-align: center; opacity: 0.5; font-size: 1.2rem; padding-top: 1rem; }
```

- [ ] **Step 28.4: Commit**

```bash
git add src/app/features/turnos/pages/sala-espera/sala-espera.page.*
git commit -m "feat(turnos): sala-espera TV page with signals + polling + beep"
```

---

## Task 29: `empty-state` + `closed-state` components

**Files:**
- Create: `src/app/features/turnos/pages/sala-espera/empty-state.component.ts`
- Create: `src/app/features/turnos/pages/sala-espera/closed-state.component.ts`

- [ ] **Step 29.1: Empty state**

```ts
// src/app/features/turnos/pages/sala-espera/empty-state.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <h1>Esperando pacientes</h1>
      <div class="meta">
        <span class="time">{{ serverTime }} hs</span>
        <span class="branch">{{ branchName }}</span>
      </div>
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 2rem; }
    h1 { font-size: 4rem; opacity: 0.7; }
    .meta { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; opacity: 0.5; font-size: 1.5rem; }
  `],
})
export class EmptyStateComponent {
  @Input() serverTime = '';
  @Input() branchName = '';
}
```

- [ ] **Step 29.2: Closed state**

```ts
// src/app/features/turnos/pages/sala-espera/closed-state.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-closed-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <h1>CERRADO</h1>
      @if (reopenTime) {
        <p>Reabrimos a las {{ reopenTime }}</p>
      }
    </div>
  `,
  styles: [`
    .wrap { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 1rem; }
    h1 { font-size: 6rem; letter-spacing: 0.2em; opacity: 0.6; }
    p { font-size: 2rem; opacity: 0.5; }
  `],
})
export class ClosedStateComponent {
  @Input() reopenTime = '';
}
```

- [ ] **Step 29.3: Build pasa**

```bash
npm run build
```

- [ ] **Step 29.4: Commit**

```bash
git add src/app/features/turnos/pages/sala-espera/
git commit -m "feat(turnos): empty + closed state components for TV"
```

---

## Task 30: Registrar ruta `/display/...` en `app.routes.ts`

**Files:**
- Modify: `src/app/app.routes.ts`

- [ ] **Step 30.1: Agregar ruta top-level**

```ts
// src/app/app.routes.ts
// agregar al array de rutas, FUERA del bloque admin-shell:

{
  path: 'display/:tenantSlug/:branchId',
  loadComponent: () => import('./features/turnos/pages/sala-espera/sala-espera.page')
    .then(m => m.SalaEsperaPage),
},
```

- [ ] **Step 30.2: Smoke manual TV**

```bash
npm start
# abrir http://localhost:4200/display/lab-alamos/1 (sin login)
# Expected: pantalla TV carga, polling activo, sin admin-shell visible
```

- [ ] **Step 30.3: Commit**

```bash
git add src/app/app.routes.ts
git commit -m "feat(routes): public /display/:tenantSlug/:branchId route for TV"
```

---

## Task 31: Sidebar — link condicional a "Sala de espera"

**Files:**
- Modify: el componente del sidebar del `admin-shell` (path real depende del proyecto, buscar con `grep -rn "sidebar\|nav-menu" src/app/layout/`).

- [ ] **Step 31.1: Identificar el archivo del sidebar**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
grep -rln "Turnos\|turnos" src/app/layout/
```

Buscar el archivo que arma los items del menú.

- [ ] **Step 31.2: Agregar item condicional**

Lógica: el sidebar debería mostrar "Sala de espera" solo si:
- El usuario actual tiene una sucursal asignada.
- Esa sucursal tiene `branch_totem_config.enabled = true`.

Para evitar acoplar el sidebar al store de turnos, **opción más simple**:

1. En el contenedor del sidebar, leer `currentUser.branch` y `currentUser.tenantSlug`.
2. En ngOnInit, disparar `loadBranchTotemConfig({ branchId: currentUser.branch })`.
3. Suscribirse al selector `selectBranchTotemEnabled`.
4. Renderizar el item TV solo si `enabled === true`.

```ts
// dentro del componente del sidebar (adaptar nombres reales):
enabled = this.store.selectSignal(selectBranchTotemEnabled);
branchId = computed(() => this.auth.currentUser()?.branch);
tenantSlug = computed(() => this.auth.currentUser()?.tenantSlug);

salaEsperaUrl = computed(() => {
  const slug = this.tenantSlug();
  const id = this.branchId();
  return slug && id ? `/display/${slug}/${id}` : null;
});
```

```html
<!-- en el template, donde van los items de menú -->
@if (enabled() && salaEsperaUrl()) {
  <a [href]="salaEsperaUrl()" target="_blank">
    <i class="pi pi-desktop"></i> Sala de espera
  </a>
}
```

> Usar `target="_blank"` para abrir la TV en pestaña nueva (porque sale del admin-shell).

> Si `currentUser.tenantSlug` no existe (porque el `/me` endpoint no lo expone), parar acá y aplicar Step de Task 10.3 backend para sumar `slug` al response de `/me`. Coordinar.

- [ ] **Step 31.3: Smoke manual**

```bash
npm start
# como ADMINISTRADOR, asegurarte que la sucursal tiene tótem activado:
#   /sucursales/lista → toggle ON
# refrescar /home → el sidebar muestra "Sala de espera"
# click → abre nueva pestaña con /display/...
# desactivar tótem en sucursal → refrescar → "Sala de espera" desaparece
```

- [ ] **Step 31.4: Commit**

```bash
git add src/app/layout/
git commit -m "feat(layout): conditional Sala de espera link in sidebar"
```

---

## Task 32 [DELEGABLE]: Tests components

**Files:**
- Create: `src/app/features/turnos/pages/recepcion/recepcion.page.spec.ts`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-con-totem.component.spec.ts`
- Create: `src/app/features/turnos/pages/recepcion/recepcion-sin-totem.component.spec.ts`
- Create: `src/app/features/turnos/pages/sala-espera/sala-espera.page.spec.ts`

> DELEGABLE. Patrón sugerido: `TestBed` con `provideMockStore`, smoke render, assert que el sub-componente correcto se renderiza según el estado. Para `sala-espera`, mockear el service y validar `calledEntry`/`upcomingEntries`/`viewMode` con snapshots fixture.

- [ ] **Step 32.1: Tests componentes**
- [ ] **Step 32.2: Correr `npx vitest run src/app/features/turnos/pages`**
- [ ] **Step 32.3: Commit**

```bash
git add src/app/features/turnos/pages/
git commit -m "test(turnos): smoke tests for recepcion and sala-espera"
```

---

# Phase 4 — Validación

## Task 33: Smoke manual checklist

**Goal:** ejecutar todo el flujo end-to-end con backend + frontend levantados.

- [ ] **Step 33.1: Levantar backend**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
./mvnw spring-boot:run -Dspring.profiles.active=dev
```

- [ ] **Step 33.2: Levantar frontend**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
npm start
```

- [ ] **Step 33.3: Checklist completo**

Loguearte como `admin@test.com / password`. Asegurarte que existe al menos una sucursal con id conocido (ej `1`).

- [ ] **CON tótem — activar:** `/sucursales/lista` → toggle tótem en sucursal X → ON.
- [ ] **Crear queue entry simulando tótem:**
  ```bash
  curl -X POST http://localhost:8080/api/v1/turnos/queue \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"nationalId": "12345678", "branchId": 1, "hasAppointment": false}'
  ```
- [ ] **Recepción CON tótem:** `/turnos/recepcion` → ver el entry en lista "Sin turno".
- [ ] **Llamar por pantalla:** click menú 3 puntitos → "Llamar por pantalla" → toast "Llamado registrado", `callCount` incrementa.
- [ ] **TV destaca:** abrir `/display/{tenantSlug}/1` en otra pestaña → ver `CT-XXXX`/`ST-XXXX` destacado en ≤3 seg.
- [ ] **Beep suena:** confirmar audio (chrome puede bloquear primer autoplay; interactuar con la pestaña una vez).
- [ ] **Re-llamar:** segundo click "Llamar" → `callCount` ahora 2, TV resetea destacado.
- [ ] **Sidebar condicional:** verificar que "Sala de espera" aparece en sidebar.
- [ ] **Desactivar tótem:** toggle OFF → recepción cambia a modo "Sin tótem" → TV redirige a recepción (o muestra 404 al refresh).
- [ ] **Recepción SIN tótem:** ver lista vacía o appointments del día.
- [ ] **Walk-in:** click "Atención nueva" → router navega a `/turnos/atencion-turno`.
- [ ] **Sidebar sin tótem:** "Sala de espera" no aparece.
- [ ] **TV pierde conexión:** matar backend → TV banner "Reconectando..." en ≤15s, sigue mostrando último snapshot → re-levantar backend → recupera solo.
- [ ] **URL TV inválida:** `/display/no-existe/1` → mensaje "URL inválida".

Cualquier fallo → arreglar antes de seguir.

---

## Task 34: Crear ticket Jira

- [ ] **Step 34.1: Invocar skill `jira-workflow`**

> Desde la conversación con Claude Code, ejecutar el slash command `/jira-ticket` o simplemente pedir "crear ticket Jira para este plan". El skill leerá este archivo y creará el ticket linkeado al plan.

- [ ] **Step 34.2: Anotar la URL del ticket en este plan**

Editar la sección Header de este archivo y agregar bajo "Spec de referencia":

```markdown
**Jira ticket:** <URL>
```

- [ ] **Step 34.3: Commit**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
git add docs/superpowers/plans/2026-05-20-cola-spec-b.md
git commit -m "docs(turnos): link Jira ticket in plan"
```

---

## Task 35: PRs (backend + frontend)

- [ ] **Step 35.1: Push branches**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
git push -u origin feat/turnos-specs

cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
git push -u origin feat/turnos-specs
```

- [ ] **Step 35.2: Crear PR backend → development**

```bash
cd C:/Users/Mateo/Desktop/tesis/Backend
gh pr create --base development --title "feat(turnos): Spec B backend (branch_totem_config + queue call + public display)" --body "$(cat <<'EOF'
## Summary
- Tabla `branch_totem_config` + endpoints GET/PUT (módulo sucursales)
- Tracking de llamadas en `QueueEntry` + endpoint `POST /queue/{id}/call`
- Endpoint público `GET /public/display/{slug}/{branch}/queue` sin auth

Spec: FRONTEND-LABORATORIO/docs/superpowers/specs/2026-05-20-cola-spec-b-design.md
Plan: FRONTEND-LABORATORIO/docs/superpowers/plans/2026-05-20-cola-spec-b.md
Jira: <URL del ticket>

## Test plan
- [x] Migraciones V55/V56 (y V57 si fue necesaria) aplican sin error
- [x] Smoke curl GET/PUT branch_totem_config funciona (200/404/403)
- [x] Smoke curl POST /queue/{id}/call (200/409/404)
- [x] Smoke curl GET /public/display/{slug}/{branch}/queue (200 sin auth, 404 slug inválido, sin PII)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 35.3: Crear PR frontend → development**

```bash
cd C:/Users/Mateo/Desktop/tesis/FRONTEND-LABORATORIO
gh pr create --base development --title "feat(turnos): Spec B frontend (recepción + TV sala de espera)" --body "$(cat <<'EOF'
## Summary
- Pantalla `/turnos/recepcion` con dos modos según flag tiene_totem
- Pantalla `/display/{tenantSlug}/{branchId}` TV pública
- Toggle inline en `/sucursales/lista`
- Sidebar condicional

Spec: docs/superpowers/specs/2026-05-20-cola-spec-b-design.md
Plan: docs/superpowers/plans/2026-05-20-cola-spec-b.md
Jira: <URL del ticket>

Dependencia: PR backend `feat(turnos): Spec B backend` debe estar mergeado primero.

## Test plan (smoke obligatorio firmado)
- [x] Sucursal con tótem → recepción muestra 2 listados, "Llamar" funciona, TV destaca en ≤3s
- [x] Sucursal sin tótem → recepción muestra lista de appointments, walk-in navega
- [x] Toggle en /sucursales/lista cambia comportamiento sin reload
- [x] TV pierde conexión → banner "Reconectando", sigue mostrando último snapshot
- [x] Sidebar muestra "Sala de espera" solo si la sucursal tiene tótem

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 35.4: Linkear ambos PRs en el ticket Jira**

---

# Apéndices

## Verificación final del plan

Antes de empezar a ejecutar, verificar:
- [ ] Branch `feat/turnos-specs` existe en ambos repos.
- [ ] Backend y frontend baseline compilan.
- [ ] Tenés un usuario `ADMINISTRADOR` para probar.
- [ ] Sabés el `tenantSlug` de tu tenant (lo necesitás en Task 28+ para la TV).
- [ ] Tenés `gh` CLI configurado para PRs (Task 35).
