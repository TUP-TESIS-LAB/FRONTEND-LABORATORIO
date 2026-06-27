# NBU: preparación estructurada + activación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-06-27-nbu-preparacion-estructurada-design.md`
> **Jira:** _(pendiente — se completa al crear el ticket)_

**Goal:** Reemplazar la preparación del paciente de texto libre por un modelo estructurado por determinación, con cómputo a nivel orden (capacidad BE) y un toggle de activación del análisis en el drawer de NBU.

**Architecture:** Hexagonal por módulos. BE en `modules/analitica.resultados` (preparación) y `modules/analitica` (activación): dominio → caso de uso → persistencia JPA (Flyway) → controller/DTO → tests. FE: extender `NbuConfigApiService` y el `nbu-config-drawer` (Angular 21, signals, PrimeNG).

**Tech Stack:** Java 21, Spring Boot, JPA/Hibernate, Flyway, MySQL (boot) + H2 (tests), JUnit5 + Mockito + AssertJ. Angular 21 standalone + signals + PrimeNG + Vitest.

## Global Constraints

- **Flyway: usar SOLO V1030** (rango asignado V1030–V1039 exclusivo). No salirse.
- **JDK 21** para compilar/testear BE: `$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"` antes de `./mvnw`.
- **Tenant isolation:** entidades nuevas extienden `BaseJpaEntity`; `tenantId` lo llena `TenantEntityListener` — **nunca** del body (S-65). En casos de uso, `tenantId` viaja por `Input` (lo resuelve el controller con `TenantContext.requireTenantId()`).
- **Errores español sin leak:** validaciones lanzan subclases de `lab.laboratorio.domain.exception.DomainException` (su `getMessage()` se propaga; `IllegalArgumentException` NO, porque el handler lo sanitiza). Registrar cada excepción nueva en `GlobalExceptionHandler`.
- **Nunca IDs en formularios:** tipos de preparación por `code/label`; activación por `catalogId` derivado de la fila.
- **Roles:** lectura `@PreAuthorize("isAuthenticated()")`; mutación `@PreAuthorize("hasRole('ADMINISTRADOR')")`.
- **FE:** correr `npm ci` ya hecho en el worktree. Errores de UI en español vía toast (`MessageService`), sin leak. Sin emojis Unicode (usar PrimeIcons).

---

## File Structure

**BE — `modules/analitica/resultados`:**
- `domain/model/PreparationType.java` (enum) — tipos + label + requiresHours.
- `domain/model/TenantDeterminationPreparation.java` — fila de prep por determinación.
- `domain/model/OrderPreparation.java` — resultado del cómputo.
- `domain/port/TenantDeterminationPreparationRepositoryPort.java`.
- `domain/exception/InvalidPreparationException.java` — 422.
- `application/usecase/preparation/GetTenantDeterminationPreparationUseCase.java`.
- `application/usecase/preparation/UpsertTenantDeterminationPreparationUseCase.java`.
- `application/usecase/preparation/ComputeOrderPreparationUseCase.java`.
- `infrastructure/persistence/entity/TenantDeterminationPreparationJpaEntity.java`.
- `infrastructure/persistence/repository/TenantDeterminationPreparationJpaRepository.java`.
- `infrastructure/persistence/adapter/TenantDeterminationPreparationRepositoryAdapter.java`.
- `presentation/PreparationController.java` + `presentation/dto/*` (request/response).
- `src/main/resources/db/migration/V1030__create_tenant_determination_preparation.sql`.

**BE — `modules/analitica` (activación):**
- `domain/exception/ShortCodeRequiredException.java` — 422.
- `domain/port/catalog/TenantAnalysisRepositoryPort.java` — agregar `findActiveByCatalogIdAndTenantId`.
- `application/usecase/tenantanalysis/SetTenantAnalysisActivationUseCase.java`.
- `presentation/catalog/TenantAnalysisController.java` — endpoint `PUT /activation` + DTO `SetTenantAnalysisActivationRequest`.
- `infrastructure/persistence/.../TenantAnalysisRepositoryAdapter.java` — implementar el método nuevo del port.
- `presentation/error/GlobalExceptionHandler.java` — registrar `InvalidPreparationException` y `ShortCodeRequiredException` (422).

**FE — `features/analitica`:**
- `services/nbu-config-api.service.ts` — métodos nuevos.
- `pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts` — toggle activación + editor estructurado.
- specs correspondientes.

---

## Task 1: `PreparationType` enum + endpoint de tipos

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/PreparationType.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/InvalidPreparationException.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/PreparationCatalogController.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/PreparationTypeResponse.java`
- Modify: `src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java` (registrar `InvalidPreparationException` → 422)
- Test: `src/test/java/lab/laboratorio/modules/analitica/resultados/domain/model/PreparationTypeTest.java`

**Interfaces:**
- Produces: `PreparationType` enum con `getLabel():String`, `isRequiresHours():boolean`, y `static PreparationType fromCode(String code)` que lanza `InvalidPreparationException` si el code es inválido.
- Produces: `InvalidPreparationException extends DomainException`.
- Produces: `GET /api/v1/analitica/preparation/types` → `List<PreparationTypeResponse>` con `{code,label,requiresHours}`.

- [ ] **Step 1: Test del enum (fromCode válido/ inválido + flags)**

```java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidPreparationException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class PreparationTypeTest {

    @Test
    void ayuno_requiresHours_andHasSpanishLabel() {
        assertThat(PreparationType.AYUNO.isRequiresHours()).isTrue();
        assertThat(PreparationType.AYUNO.getLabel()).isEqualTo("Ayuno");
        assertThat(PreparationType.NO_FUMAR.isRequiresHours()).isFalse();
    }

    @Test
    void fromCode_valid_returnsEnum() {
        assertThat(PreparationType.fromCode("AYUNO")).isEqualTo(PreparationType.AYUNO);
    }

    @Test
    void fromCode_invalid_throwsDomainExceptionWithSpanishMessage() {
        assertThatThrownBy(() -> PreparationType.fromCode("XXX"))
                .isInstanceOf(InvalidPreparationException.class)
                .hasMessageContaining("Tipo de preparación")
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("No enum constant"));
    }
}
```

- [ ] **Step 2: Correr el test — falla por clases inexistentes**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=PreparationTypeTest test`
Expected: FAIL (no compila: `PreparationType` / `InvalidPreparationException` no existen).

- [ ] **Step 3: Crear `InvalidPreparationException`**

```java
package lab.laboratorio.modules.analitica.resultados.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class InvalidPreparationException extends DomainException {
    public InvalidPreparationException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Crear `PreparationType`**

```java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidPreparationException;

/**
 * Tipos de preparación previa del paciente a nivel determinación.
 * Set fijo (los labs usan las mismas escalas). Solo AYUNO lleva horas.
 */
public enum PreparationType {
    AYUNO("Ayuno", true),
    NO_FUMAR("No fumar", false),
    SIN_ACTIVIDAD_FISICA("Sin actividad física", false),
    ORINA_24H("Recolección de orina 24 hs", false),
    SUSPENSION_MEDICACION("Suspensión de medicación", false),
    ABSTINENCIA_ALCOHOL("Abstinencia de alcohol", false);

    private final String label;
    private final boolean requiresHours;

    PreparationType(String label, boolean requiresHours) {
        this.label = label;
        this.requiresHours = requiresHours;
    }

    public String getLabel() { return label; }
    public boolean isRequiresHours() { return requiresHours; }

    public static PreparationType fromCode(String code) {
        if (code == null) {
            throw new InvalidPreparationException("Tipo de preparación no válido.");
        }
        try {
            return PreparationType.valueOf(code.trim());
        } catch (IllegalArgumentException ex) {
            throw new InvalidPreparationException("Tipo de preparación no válido: " + code);
        }
    }
}
```

- [ ] **Step 5: Correr el test del enum — pasa**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=PreparationTypeTest test`
Expected: PASS.

- [ ] **Step 6: Crear el DTO de respuesta**

```java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;

public record PreparationTypeResponse(String code, String label, boolean requiresHours) {}
```

- [ ] **Step 7: Crear el controller de tipos**

```java
package lab.laboratorio.modules.analitica.resultados.presentation;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lab.laboratorio.modules.analitica.resultados.domain.model.PreparationType;
import lab.laboratorio.modules.analitica.resultados.presentation.dto.PreparationTypeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/v1/analitica/preparation")
@Tag(name = "Analítica - Preparación del paciente")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("isAuthenticated()")
public class PreparationCatalogController {

    @GetMapping("/types")
    @Operation(summary = "Catálogo fijo de tipos de preparación (code + label español)")
    public ResponseEntity<List<PreparationTypeResponse>> types() {
        List<PreparationTypeResponse> types = Arrays.stream(PreparationType.values())
                .map(t -> new PreparationTypeResponse(t.name(), t.getLabel(), t.isRequiresHours()))
                .toList();
        return ResponseEntity.ok(types);
    }
}
```

- [ ] **Step 8: Registrar `InvalidPreparationException` en `GlobalExceptionHandler` (422)**

Localizar el handler de resultados que devuelve `UNPROCESSABLE_ENTITY` (alrededor de la línea 184, `handleUnprocessableResultados`) y agregar `InvalidPreparationException.class` a la lista de `@ExceptionHandler({...})`. Importar la clase.

```java
// en el @ExceptionHandler({InactiveDeterminationException.class, DeterminationOwnershipException.class, ... })
// agregar:  InvalidPreparationException.class
import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidPreparationException;
```

- [ ] **Step 9: Compilar y commitear**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=PreparationTypeTest test`
Expected: PASS y compila todo el módulo.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/PreparationType.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/InvalidPreparationException.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/PreparationCatalogController.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/PreparationTypeResponse.java \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/domain/model/PreparationTypeTest.java
git commit -m "feat(nbu): PreparationType enum + endpoint de tipos de preparación"
```

---

## Task 2: Tabla `tenant_determination_preparation` + persistencia

**Files:**
- Create: `src/main/resources/db/migration/V1030__create_tenant_determination_preparation.sql`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/TenantDeterminationPreparation.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/port/TenantDeterminationPreparationRepositoryPort.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/entity/TenantDeterminationPreparationJpaEntity.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/repository/TenantDeterminationPreparationJpaRepository.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/adapter/TenantDeterminationPreparationRepositoryAdapter.java`

**Interfaces:**
- Produces: `TenantDeterminationPreparation` (domain) con `Long id, Long tenantId, Long determinationCatalogId, PreparationType preparationType, Integer fastingHours` (Lombok `@Getter @Builder`).
- Produces: `TenantDeterminationPreparationRepositoryPort`:
  - `List<TenantDeterminationPreparation> findByDeterminationCatalogIdAndTenantId(Long detId, Long tenantId)`
  - `List<TenantDeterminationPreparation> findByDeterminationCatalogIdInAndTenantId(java.util.Set<Long> detIds, Long tenantId)`
  - `void replaceSet(Long detId, Long tenantId, List<TenantDeterminationPreparation> items)` (delete físico + insert)

- [ ] **Step 1: Crear la migración V1030**

```sql
-- V1030: tenant_determination_preparation
-- Preparación estructurada del paciente por determinación, override por tenant.
-- Set replace-on-save (delete-and-insert); unicidad plana por (tenant, determinación, tipo).
-- Válida en H2 (tests) y MySQL (boot): sin ADD COLUMN IF NOT EXISTS, sin generated columns.

CREATE TABLE tenant_determination_preparation (
    id                          BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id                   BIGINT          NOT NULL,
    determination_catalog_id    BIGINT          NOT NULL,
    preparation_type            VARCHAR(40)     NOT NULL,
    fasting_hours               INT             NULL,
    created_at                  DATETIME(6)     NOT NULL,
    updated_at                  DATETIME(6)     NOT NULL,
    deleted_at                  DATETIME(6)     NULL,
    created_by                  VARCHAR(120)    NOT NULL,
    updated_by                  VARCHAR(120)    NOT NULL,
    active                      BOOLEAN         NOT NULL DEFAULT TRUE,
    version                     BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_tenant_det_prep_catalog FOREIGN KEY (determination_catalog_id) REFERENCES determination_catalog (id),
    CONSTRAINT uq_tenant_det_prep UNIQUE (tenant_id, determination_catalog_id, preparation_type),
    INDEX idx_tenant_det_prep_lookup (tenant_id, determination_catalog_id)
);
```

- [ ] **Step 2: Crear el modelo de dominio**

```java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDeterminationPreparation {
    private Long id;
    private Long tenantId;
    private Long determinationCatalogId;
    private PreparationType preparationType;
    private Integer fastingHours;
}
```

- [ ] **Step 3: Crear el puerto**

```java
package lab.laboratorio.modules.analitica.resultados.domain.port;

import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;

import java.util.List;
import java.util.Set;

public interface TenantDeterminationPreparationRepositoryPort {

    List<TenantDeterminationPreparation> findByDeterminationCatalogIdAndTenantId(Long detId, Long tenantId);

    List<TenantDeterminationPreparation> findByDeterminationCatalogIdInAndTenantId(Set<Long> detIds, Long tenantId);

    /** Reemplaza todo el set de prep de (tenant, determinación): borra el existente e inserta el nuevo. */
    void replaceSet(Long detId, Long tenantId, List<TenantDeterminationPreparation> items);
}
```

- [ ] **Step 4: Crear la entidad JPA**

```java
package lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.entity;

import jakarta.persistence.*;
import lab.laboratorio.infrastructure.persistence.entity.BaseJpaEntity;
import lab.laboratorio.modules.analitica.resultados.domain.model.PreparationType;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(
        name = "tenant_determination_preparation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_tenant_det_prep",
                columnNames = {"tenant_id", "determination_catalog_id", "preparation_type"})
)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TenantDeterminationPreparationJpaEntity extends BaseJpaEntity {

    @Column(name = "determination_catalog_id", nullable = false)
    private Long determinationCatalogId;

    @Enumerated(EnumType.STRING)
    @Column(name = "preparation_type", nullable = false, length = 40)
    private PreparationType preparationType;

    @Column(name = "fasting_hours")
    private Integer fastingHours;
}
```

- [ ] **Step 5: Crear el JPA repository**

```java
package lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.repository;

import lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.entity.TenantDeterminationPreparationJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Set;

public interface TenantDeterminationPreparationJpaRepository
        extends JpaRepository<TenantDeterminationPreparationJpaEntity, Long> {

    List<TenantDeterminationPreparationJpaEntity> findByTenantIdAndDeterminationCatalogId(Long tenantId, Long detId);

    List<TenantDeterminationPreparationJpaEntity> findByTenantIdAndDeterminationCatalogIdIn(Long tenantId, Set<Long> detIds);

    void deleteByTenantIdAndDeterminationCatalogId(Long tenantId, Long detId);
}
```

- [ ] **Step 6: Crear el adapter**

```java
package lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.adapter;

import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.entity.TenantDeterminationPreparationJpaEntity;
import lab.laboratorio.modules.analitica.resultados.infrastructure.persistence.repository.TenantDeterminationPreparationJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class TenantDeterminationPreparationRepositoryAdapter
        implements TenantDeterminationPreparationRepositoryPort {

    private final TenantDeterminationPreparationJpaRepository jpa;

    @Override
    public List<TenantDeterminationPreparation> findByDeterminationCatalogIdAndTenantId(Long detId, Long tenantId) {
        return jpa.findByTenantIdAndDeterminationCatalogId(tenantId, detId).stream().map(this::toDomain).toList();
    }

    @Override
    public List<TenantDeterminationPreparation> findByDeterminationCatalogIdInAndTenantId(Set<Long> detIds, Long tenantId) {
        if (detIds.isEmpty()) return List.of();
        return jpa.findByTenantIdAndDeterminationCatalogIdIn(tenantId, detIds).stream().map(this::toDomain).toList();
    }

    @Override
    public void replaceSet(Long detId, Long tenantId, List<TenantDeterminationPreparation> items) {
        jpa.deleteByTenantIdAndDeterminationCatalogId(tenantId, detId);
        jpa.flush();
        List<TenantDeterminationPreparationJpaEntity> entities = items.stream()
                .map(i -> TenantDeterminationPreparationJpaEntity.builder()
                        .determinationCatalogId(detId)
                        .preparationType(i.getPreparationType())
                        .fastingHours(i.getFastingHours())
                        .build())
                .toList();
        jpa.saveAll(entities);
    }

    private TenantDeterminationPreparation toDomain(TenantDeterminationPreparationJpaEntity e) {
        return TenantDeterminationPreparation.builder()
                .id(e.getId())
                .tenantId(e.getTenantId())
                .determinationCatalogId(e.getDeterminationCatalogId())
                .preparationType(e.getPreparationType())
                .fastingHours(e.getFastingHours())
                .build();
    }
}
```

- [ ] **Step 7: Compilar (la migración corre en el boot de tests)**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=PreparationTypeTest test`
Expected: PASS (compila; Flyway aplica V1030 en H2 al levantar el contexto de tests existentes). Si algún `@SpringBootTest` corre, debe seguir verde.

- [ ] **Step 8: Commitear**

```bash
git add src/main/resources/db/migration/V1030__create_tenant_determination_preparation.sql \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/TenantDeterminationPreparation.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/port/TenantDeterminationPreparationRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/entity/TenantDeterminationPreparationJpaEntity.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/repository/TenantDeterminationPreparationJpaRepository.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/adapter/TenantDeterminationPreparationRepositoryAdapter.java
git commit -m "feat(nbu): tabla y persistencia de preparación estructurada (V1030)"
```

---

## Task 3: Get + Upsert preparación por determinación

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/GetTenantDeterminationPreparationUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/UpsertTenantDeterminationPreparationUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/DeterminationPreparationRequest.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/DeterminationPreparationResponse.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/PreparationCatalogController.java` (agregar GET/PUT por determinación)
- Test: `src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/UpsertTenantDeterminationPreparationUseCaseTest.java`

**Interfaces:**
- Consumes: `TenantDeterminationPreparationRepositoryPort` (Task 2), `PreparationType.fromCode` (Task 1).
- Produces: `UpsertTenantDeterminationPreparationUseCase` con `record Input(Long determinationCatalogId, Long tenantId, List<Item> items)` y `record Item(String type, Integer fastingHours)`; `execute(Input)` valida y persiste.
- Produces: `GetTenantDeterminationPreparationUseCase.execute(Long detId, Long tenantId): List<TenantDeterminationPreparation>`.

- [ ] **Step 1: Test del upsert (replace + validación AYUNO/dups/tipo inválido)**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.preparation;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidPreparationException;
import lab.laboratorio.modules.analitica.resultados.domain.model.PreparationType;
import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpsertTenantDeterminationPreparationUseCaseTest {

    @Mock TenantDeterminationPreparationRepositoryPort repository;
    @InjectMocks UpsertTenantDeterminationPreparationUseCase useCase;

    @Test
    void execute_validSet_replacesSet() {
        var input = new UpsertTenantDeterminationPreparationUseCase.Input(1L, 10L, List.of(
                new UpsertTenantDeterminationPreparationUseCase.Item("AYUNO", 8),
                new UpsertTenantDeterminationPreparationUseCase.Item("NO_FUMAR", null)));

        useCase.execute(input);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TenantDeterminationPreparation>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).replaceSet(eq(1L), eq(10L), captor.capture());
        assertThat(captor.getValue()).hasSize(2);
        assertThat(captor.getValue()).anyMatch(p -> p.getPreparationType() == PreparationType.AYUNO && p.getFastingHours() == 8);
        assertThat(captor.getValue()).anyMatch(p -> p.getPreparationType() == PreparationType.NO_FUMAR && p.getFastingHours() == null);
    }

    @Test
    void execute_ayunoWithoutHours_throws422() {
        var input = new UpsertTenantDeterminationPreparationUseCase.Input(1L, 10L, List.of(
                new UpsertTenantDeterminationPreparationUseCase.Item("AYUNO", null)));
        assertThatThrownBy(() -> useCase.execute(input))
                .isInstanceOf(InvalidPreparationException.class)
                .hasMessageContaining("horas de ayuno");
        verify(repository, never()).replaceSet(any(), any(), any());
    }

    @Test
    void execute_duplicateType_throws422() {
        var input = new UpsertTenantDeterminationPreparationUseCase.Input(1L, 10L, List.of(
                new UpsertTenantDeterminationPreparationUseCase.Item("NO_FUMAR", null),
                new UpsertTenantDeterminationPreparationUseCase.Item("NO_FUMAR", null)));
        assertThatThrownBy(() -> useCase.execute(input))
                .isInstanceOf(InvalidPreparationException.class)
                .hasMessageContaining("repetido");
    }

    @Test
    void execute_invalidType_throws422() {
        var input = new UpsertTenantDeterminationPreparationUseCase.Input(1L, 10L, List.of(
                new UpsertTenantDeterminationPreparationUseCase.Item("XXX", null)));
        assertThatThrownBy(() -> useCase.execute(input)).isInstanceOf(InvalidPreparationException.class);
    }

    @Test
    void execute_emptySet_clearsSet() {
        useCase.execute(new UpsertTenantDeterminationPreparationUseCase.Input(1L, 10L, List.of()));
        verify(repository).replaceSet(1L, 10L, List.of());
    }
}
```

- [ ] **Step 2: Correr el test — falla (clase inexistente)**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=UpsertTenantDeterminationPreparationUseCaseTest test`
Expected: FAIL (no compila).

- [ ] **Step 3: Implementar `UpsertTenantDeterminationPreparationUseCase`**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.preparation;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidPreparationException;
import lab.laboratorio.modules.analitica.resultados.domain.model.PreparationType;
import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UpsertTenantDeterminationPreparationUseCase {

    private final TenantDeterminationPreparationRepositoryPort repository;

    public record Item(String type, Integer fastingHours) {}
    public record Input(Long determinationCatalogId, Long tenantId, List<Item> items) {}

    public void execute(Input input) {
        EnumSet<PreparationType> seen = EnumSet.noneOf(PreparationType.class);
        List<TenantDeterminationPreparation> toSave = new ArrayList<>();

        for (Item item : input.items()) {
            PreparationType type = PreparationType.fromCode(item.type());  // 422 si inválido
            if (!seen.add(type)) {
                throw new InvalidPreparationException("Tipo de preparación repetido: " + type.getLabel());
            }
            Integer hours = item.fastingHours();
            if (type.isRequiresHours()) {
                if (hours == null || hours <= 0) {
                    throw new InvalidPreparationException("Ingresá las horas de ayuno (mayor a 0).");
                }
            } else {
                hours = null;  // ignorar horas en tipos que no las llevan
            }
            toSave.add(TenantDeterminationPreparation.builder()
                    .tenantId(input.tenantId())
                    .determinationCatalogId(input.determinationCatalogId())
                    .preparationType(type)
                    .fastingHours(hours)
                    .build());
        }
        repository.replaceSet(input.determinationCatalogId(), input.tenantId(), toSave);
    }
}
```

- [ ] **Step 4: Implementar `GetTenantDeterminationPreparationUseCase`**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.preparation;

import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetTenantDeterminationPreparationUseCase {

    private final TenantDeterminationPreparationRepositoryPort repository;

    public List<TenantDeterminationPreparation> execute(Long determinationCatalogId, Long tenantId) {
        return repository.findByDeterminationCatalogIdAndTenantId(determinationCatalogId, tenantId);
    }
}
```

- [ ] **Step 5: Correr el test — pasa**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=UpsertTenantDeterminationPreparationUseCaseTest test`
Expected: PASS.

- [ ] **Step 6: Crear los DTOs**

```java
// DeterminationPreparationRequest.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;

import java.util.List;

public record DeterminationPreparationRequest(List<Item> items) {
    public record Item(String type, Integer fastingHours) {}
}
```

```java
// DeterminationPreparationResponse.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;

import java.util.List;

public record DeterminationPreparationResponse(List<Item> items) {
    public record Item(String type, String label, Integer fastingHours) {}
}
```

- [ ] **Step 7: Agregar GET/PUT al `PreparationCatalogController`**

```java
// inyectar los dos use cases:
private final GetTenantDeterminationPreparationUseCase getPreparationUseCase;
private final UpsertTenantDeterminationPreparationUseCase upsertPreparationUseCase;

@GetMapping("/determinations/{id}/preparation")
@Operation(summary = "Preparación estructurada del tenant para una determinación")
public ResponseEntity<DeterminationPreparationResponse> getPreparation(@PathVariable Long id) {
    Long tenantId = TenantContext.requireTenantId();
    List<DeterminationPreparationResponse.Item> items = getPreparationUseCase.execute(id, tenantId).stream()
            .map(p -> new DeterminationPreparationResponse.Item(
                    p.getPreparationType().name(), p.getPreparationType().getLabel(), p.getFastingHours()))
            .toList();
    return ResponseEntity.ok(new DeterminationPreparationResponse(items));
}

@PutMapping("/determinations/{id}/preparation")
@PreAuthorize("hasRole('ADMINISTRADOR')")
@Operation(summary = "Reemplazar la preparación estructurada del tenant para una determinación")
public ResponseEntity<Void> upsertPreparation(
        @PathVariable Long id, @RequestBody DeterminationPreparationRequest request) {
    Long tenantId = TenantContext.requireTenantId();
    List<UpsertTenantDeterminationPreparationUseCase.Item> items =
            (request.items() == null ? List.<DeterminationPreparationRequest.Item>of() : request.items()).stream()
                    .map(i -> new UpsertTenantDeterminationPreparationUseCase.Item(i.type(), i.fastingHours()))
                    .toList();
    upsertPreparationUseCase.execute(
            new UpsertTenantDeterminationPreparationUseCase.Input(id, tenantId, items));
    return ResponseEntity.noContent().build();
}
```

Agregar imports: `lab.laboratorio.infrastructure.tenancy.TenantContext`, los DTOs, los use cases, `org.springframework.web.bind.annotation.*`, `java.util.List`. La clase necesita `@RequiredArgsConstructor` (agregarlo si no está) para inyectar los use cases.

- [ ] **Step 8: Compilar y commitear**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=UpsertTenantDeterminationPreparationUseCaseTest test`
Expected: PASS.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/ \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/PreparationCatalogController.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/DeterminationPreparationRequest.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/DeterminationPreparationResponse.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/UpsertTenantDeterminationPreparationUseCaseTest.java
git commit -m "feat(nbu): get/upsert de preparación estructurada por determinación"
```

---

## Task 4: Cómputo a nivel orden

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/OrderPreparation.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/ComputeOrderPreparationUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/ComputeOrderPreparationRequest.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/OrderPreparationResponse.java`
- Modify: `PreparationCatalogController.java` (POST `/compute`)
- Test: `src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/ComputeOrderPreparationUseCaseTest.java`

**Interfaces:**
- Consumes: `DeterminationCatalogRepositoryPort.findByAnalysisCatalogIdAndActiveTrue(Long)` (existente), `TenantDeterminationPreparationRepositoryPort.findByDeterminationCatalogIdInAndTenantId` (Task 2), `TenantDeterminationOverrideRepositoryPort.findByDeterminationCatalogIdAndTenantId` (existente, para `preObservations`).
- Produces: `OrderPreparation(Integer fastingHours, List<PreparationType> types, List<String> observations)`.
- Produces: `ComputeOrderPreparationUseCase.execute(java.util.Set<Long> analysisCatalogIds, Long tenantId): OrderPreparation`.

- [ ] **Step 1: Test del cómputo (máx ayuno + unión + dedup observaciones)**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.preparation;

import lab.laboratorio.modules.analitica.resultados.domain.model.*;
import lab.laboratorio.modules.analitica.resultados.domain.port.DeterminationCatalogRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationOverrideRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComputeOrderPreparationUseCaseTest {

    @Mock DeterminationCatalogRepositoryPort catalogPort;
    @Mock TenantDeterminationPreparationRepositoryPort prepPort;
    @Mock TenantDeterminationOverrideRepositoryPort overridePort;
    @InjectMocks ComputeOrderPreparationUseCase useCase;

    private DeterminationCatalog det(Long id) {
        return DeterminationCatalog.builder().id(id).build();
    }

    private TenantDeterminationPreparation prep(Long detId, PreparationType t, Integer h) {
        return TenantDeterminationPreparation.builder()
                .determinationCatalogId(detId).preparationType(t).fastingHours(h).build();
    }

    @Test
    void compute_maxFasting_unionTypes_dedupObservations() {
        when(catalogPort.findByAnalysisCatalogIdAndActiveTrue(100L)).thenReturn(List.of(det(1L)));
        when(catalogPort.findByAnalysisCatalogIdAndActiveTrue(200L)).thenReturn(List.of(det(2L)));
        when(prepPort.findByDeterminationCatalogIdInAndTenantId(Set.of(1L, 2L), 10L)).thenReturn(List.of(
                prep(1L, PreparationType.AYUNO, 8),
                prep(2L, PreparationType.AYUNO, 12),
                prep(2L, PreparationType.NO_FUMAR, null)));
        when(overridePort.findByDeterminationCatalogIdAndTenantId(any(), any()))
                .thenReturn(Optional.empty());

        OrderPreparation result = useCase.execute(Set.of(100L, 200L), 10L);

        assertThat(result.getFastingHours()).isEqualTo(12);       // máximo
        assertThat(result.getTypes()).containsExactlyInAnyOrder(  // unión
                PreparationType.AYUNO, PreparationType.NO_FUMAR);
    }

    @Test
    void compute_noPrep_returnsNullFastingAndEmptyTypes() {
        when(catalogPort.findByAnalysisCatalogIdAndActiveTrue(100L)).thenReturn(List.of(det(1L)));
        when(prepPort.findByDeterminationCatalogIdInAndTenantId(Set.of(1L), 10L)).thenReturn(List.of());
        when(overridePort.findByDeterminationCatalogIdAndTenantId(any(), any())).thenReturn(Optional.empty());

        OrderPreparation result = useCase.execute(Set.of(100L), 10L);

        assertThat(result.getFastingHours()).isNull();
        assertThat(result.getTypes()).isEmpty();
        assertThat(result.getObservations()).isEmpty();
    }
}
```

> Nota: si `DeterminationCatalog` no tiene `@Builder`, usar su constructor real en el helper `det(...)` (chequear la clase; tiene `id` como primer campo). Ajustar el helper a la firma existente.

- [ ] **Step 2: Correr el test — falla**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=ComputeOrderPreparationUseCaseTest test`
Expected: FAIL (no compila).

- [ ] **Step 3: Crear el modelo `OrderPreparation`**

```java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class OrderPreparation {
    private Integer fastingHours;          // máximo de horas de AYUNO; null si ninguna
    private List<PreparationType> types;   // unión de tipos presentes
    private List<String> observations;     // preObservations no vacías, deduplicadas
}
```

- [ ] **Step 4: Implementar `ComputeOrderPreparationUseCase`**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.preparation;

import lab.laboratorio.modules.analitica.resultados.domain.model.DeterminationCatalog;
import lab.laboratorio.modules.analitica.resultados.domain.model.OrderPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.model.PreparationType;
import lab.laboratorio.modules.analitica.resultados.domain.model.TenantDeterminationPreparation;
import lab.laboratorio.modules.analitica.resultados.domain.port.DeterminationCatalogRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationOverrideRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantDeterminationPreparationRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ComputeOrderPreparationUseCase {

    private final DeterminationCatalogRepositoryPort catalogPort;
    private final TenantDeterminationPreparationRepositoryPort prepPort;
    private final TenantDeterminationOverrideRepositoryPort overridePort;

    public OrderPreparation execute(Set<Long> analysisCatalogIds, Long tenantId) {
        // 1. expandir análisis → determinaciones activas
        Set<Long> detIds = new LinkedHashSet<>();
        for (Long analysisId : analysisCatalogIds) {
            for (DeterminationCatalog det : catalogPort.findByAnalysisCatalogIdAndActiveTrue(analysisId)) {
                detIds.add(det.getId());
            }
        }

        // 2. preparación del tenant sobre esas determinaciones
        List<TenantDeterminationPreparation> preps = prepPort.findByDeterminationCatalogIdInAndTenantId(detIds, tenantId);

        Integer maxFasting = null;
        EnumSet<PreparationType> types = EnumSet.noneOf(PreparationType.class);
        for (TenantDeterminationPreparation p : preps) {
            types.add(p.getPreparationType());
            if (p.getPreparationType() == PreparationType.AYUNO && p.getFastingHours() != null) {
                maxFasting = (maxFasting == null) ? p.getFastingHours() : Math.max(maxFasting, p.getFastingHours());
            }
        }

        // 3. observaciones (preObservations no vacías, deduplicadas) de los overrides de esas determinaciones
        LinkedHashSet<String> observations = new LinkedHashSet<>();
        for (Long detId : detIds) {
            overridePort.findByDeterminationCatalogIdAndTenantId(detId, tenantId)
                    .map(o -> o.getPreObservations())
                    .filter(s -> s != null && !s.isBlank())
                    .ifPresent(observations::add);
        }

        return OrderPreparation.builder()
                .fastingHours(maxFasting)
                .types(new ArrayList<>(types))
                .observations(new ArrayList<>(observations))
                .build();
    }
}
```

> Verificar el nombre real del getter de observaciones en `TenantDeterminationOverride` (`getPreObservations()`) y el método del catálogo (`findByAnalysisCatalogIdAndActiveTrue`). Ambos confirmados en la exploración.

- [ ] **Step 5: Correr el test — pasa**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=ComputeOrderPreparationUseCaseTest test`
Expected: PASS.

- [ ] **Step 6: DTOs + endpoint POST `/compute`**

```java
// ComputeOrderPreparationRequest.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;

import java.util.Set;

public record ComputeOrderPreparationRequest(Set<Long> analysisCatalogIds) {}
```

```java
// OrderPreparationResponse.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;

import java.util.List;

public record OrderPreparationResponse(Integer fastingHours, List<TypeItem> types, List<String> observations) {
    public record TypeItem(String code, String label) {}
}
```

```java
// en PreparationCatalogController:
private final ComputeOrderPreparationUseCase computeUseCase;

@PostMapping("/compute")
@Operation(summary = "Computa la preparación de una orden (máx ayuno + unión de tipos) — capacidad")
public ResponseEntity<OrderPreparationResponse> compute(@RequestBody ComputeOrderPreparationRequest request) {
    Long tenantId = TenantContext.requireTenantId();
    Set<Long> ids = request.analysisCatalogIds() == null ? Set.of() : request.analysisCatalogIds();
    var result = computeUseCase.execute(ids, tenantId);
    var types = result.getTypes().stream()
            .map(t -> new OrderPreparationResponse.TypeItem(t.name(), t.getLabel()))
            .toList();
    return ResponseEntity.ok(new OrderPreparationResponse(result.getFastingHours(), types, result.getObservations()));
}
```

Agregar import de `java.util.Set`.

- [ ] **Step 7: Compilar y commitear**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=ComputeOrderPreparationUseCaseTest test`
Expected: PASS.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/OrderPreparation.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/ComputeOrderPreparationUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/ \
        src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/preparation/ComputeOrderPreparationUseCaseTest.java
git commit -m "feat(nbu): cómputo de preparación a nivel orden (capacidad)"
```

---

## Task 5: Activación idempotente del análisis

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/domain/exception/ShortCodeRequiredException.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantAnalysisRepositoryPort.java` (agregar `findActiveByCatalogIdAndTenantId`)
- Modify: el adapter que implementa ese port (`infrastructure/persistence/.../TenantAnalysisRepositoryAdapter.java`) — implementar el método nuevo
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/tenantanalysis/SetTenantAnalysisActivationUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/request/SetTenantAnalysisActivationRequest.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantAnalysisController.java` (endpoint `PUT /activation`)
- Modify: `GlobalExceptionHandler.java` (registrar `ShortCodeRequiredException` → 422)
- Test: `src/test/java/lab/laboratorio/modules/analitica/application/usecase/tenantanalysis/SetTenantAnalysisActivationUseCaseTest.java`

**Interfaces:**
- Consumes: `TenantAnalysisRepositoryPort` (existente + método nuevo), `AnalysisLookupPort.existsById` (existente).
- Produces: `TenantAnalysisRepositoryPort.findActiveByCatalogIdAndTenantId(Long catalogId, Long tenantId): Optional<TenantAnalysis>`.
- Produces: `SetTenantAnalysisActivationUseCase` con `record Input(Long catalogId, boolean active, String shortCode, String customName, Long tenantId, String actor)`; `execute(Input)`.

- [ ] **Step 1: Test del use case (crear si no existe / noop / desactivar / shortCode faltante)**

```java
package lab.laboratorio.modules.analitica.application.usecase.tenantanalysis;

import lab.laboratorio.modules.analitica.domain.exception.ShortCodeRequiredException;
import lab.laboratorio.modules.analitica.domain.model.catalog.TenantAnalysis;
import lab.laboratorio.modules.analitica.domain.port.catalog.AnalysisLookupPort;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SetTenantAnalysisActivationUseCaseTest {

    @Mock TenantAnalysisRepositoryPort repo;
    @Mock AnalysisLookupPort analysisLookupPort;
    @InjectMocks SetTenantAnalysisActivationUseCase useCase;

    private SetTenantAnalysisActivationUseCase.Input on(String shortCode) {
        return new SetTenantAnalysisActivationUseCase.Input(100L, true, shortCode, "Glucemia", 10L, "admin");
    }

    @Test
    void activate_noRow_createsActive() {
        when(repo.findActiveByCatalogIdAndTenantId(100L, 10L)).thenReturn(Optional.empty());
        when(analysisLookupPort.existsById(100L)).thenReturn(true);
        when(repo.existsActiveByTenantIdAndShortCode(10L, "GLU")).thenReturn(false);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(on("GLU"));

        ArgumentCaptor<TenantAnalysis> captor = ArgumentCaptor.forClass(TenantAnalysis.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().isActive()).isTrue();
        assertThat(captor.getValue().getCatalogId()).isEqualTo(100L);
        assertThat(captor.getValue().getShortCode()).isEqualTo("GLU");
    }

    @Test
    void activate_alreadyActive_noop() {
        TenantAnalysis existing = TenantAnalysis.builder().id(5L).catalogId(100L).tenantId(10L).active(true).build();
        when(repo.findActiveByCatalogIdAndTenantId(100L, 10L)).thenReturn(Optional.of(existing));

        useCase.execute(on("GLU"));

        verify(repo, never()).save(any());
    }

    @Test
    void activate_noRow_blankShortCode_throws422() {
        when(repo.findActiveByCatalogIdAndTenantId(100L, 10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.execute(on("  ")))
                .isInstanceOf(ShortCodeRequiredException.class);
        verify(repo, never()).save(any());
    }

    @Test
    void deactivate_activeRow_softDeletes() {
        TenantAnalysis existing = TenantAnalysis.builder().id(5L).catalogId(100L).tenantId(10L).active(true).build();
        when(repo.findActiveByCatalogIdAndTenantId(100L, 10L)).thenReturn(Optional.of(existing));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        useCase.execute(new SetTenantAnalysisActivationUseCase.Input(100L, false, null, null, 10L, "admin"));

        ArgumentCaptor<TenantAnalysis> captor = ArgumentCaptor.forClass(TenantAnalysis.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().isActive()).isFalse();
    }

    @Test
    void deactivate_noActiveRow_noop() {
        when(repo.findActiveByCatalogIdAndTenantId(100L, 10L)).thenReturn(Optional.empty());
        useCase.execute(new SetTenantAnalysisActivationUseCase.Input(100L, false, null, null, 10L, "admin"));
        verify(repo, never()).save(any());
    }
}
```

- [ ] **Step 2: Correr el test — falla**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=SetTenantAnalysisActivationUseCaseTest test`
Expected: FAIL (no compila).

- [ ] **Step 3: Crear `ShortCodeRequiredException`**

```java
package lab.laboratorio.modules.analitica.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class ShortCodeRequiredException extends DomainException {
    public ShortCodeRequiredException() {
        super("Ingresá el código interno antes de activar el análisis.");
    }
}
```

- [ ] **Step 4: Agregar el método al port + adapter**

En `TenantAnalysisRepositoryPort.java` agregar:

```java
Optional<TenantAnalysis> findActiveByCatalogIdAndTenantId(Long catalogId, Long tenantId);
```

En el adapter (buscar la clase que implementa `TenantAnalysisRepositoryPort`; tiene un `TenantAnalysisJpaRepository`). Agregar al JpaRepository un finder y al adapter el mapeo:

```java
// en TenantAnalysisJpaRepository (Spring Data):
Optional<TenantAnalysisJpaEntity> findByTenantIdAndCatalogIdAndActiveTrueAndDeletedAtIsNull(Long tenantId, Long catalogId);

// en el adapter:
@Override
public Optional<TenantAnalysis> findActiveByCatalogIdAndTenantId(Long catalogId, Long tenantId) {
    return jpa.findByTenantIdAndCatalogIdAndActiveTrueAndDeletedAtIsNull(tenantId, catalogId)
            .map(this::toDomain);  // usar el mapeo a dominio ya existente en el adapter
}
```

> Usar el nombre real del método de mapeo a dominio del adapter (en estos adapters suele ser `toDomain(...)` o un mapper). Si el adapter ya carga active-only, igual el finder explícito `...ActiveTrueAndDeletedAtIsNull` deja la intención clara.

- [ ] **Step 5: Implementar `SetTenantAnalysisActivationUseCase`**

```java
package lab.laboratorio.modules.analitica.application.usecase.tenantanalysis;

import lab.laboratorio.modules.analitica.domain.exception.AnalysisCatalogNotFoundException;
import lab.laboratorio.modules.analitica.domain.exception.DuplicateTenantShortCodeException;
import lab.laboratorio.modules.analitica.domain.exception.ShortCodeRequiredException;
import lab.laboratorio.modules.analitica.domain.model.catalog.TenantAnalysis;
import lab.laboratorio.modules.analitica.domain.port.catalog.AnalysisLookupPort;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Activa o desactiva un análisis para el tenant de forma idempotente.
 * tenantId/actor vienen por Input (el controller los resuelve de TenantContext).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SetTenantAnalysisActivationUseCase {

    private final TenantAnalysisRepositoryPort repo;
    private final AnalysisLookupPort analysisLookupPort;

    public record Input(Long catalogId, boolean active, String shortCode, String customName,
                        Long tenantId, String actor) {}

    public void execute(Input input) {
        Optional<TenantAnalysis> existing = repo.findActiveByCatalogIdAndTenantId(input.catalogId(), input.tenantId());

        if (input.active()) {
            if (existing.isPresent()) {
                return;  // ya activa → noop
            }
            String code = input.shortCode() == null ? "" : input.shortCode().trim();
            if (code.isEmpty()) {
                throw new ShortCodeRequiredException();
            }
            if (!analysisLookupPort.existsById(input.catalogId())) {
                throw new AnalysisCatalogNotFoundException(input.catalogId());
            }
            if (repo.existsActiveByTenantIdAndShortCode(input.tenantId(), code)) {
                throw new DuplicateTenantShortCodeException(code);
            }
            String customName = (input.customName() == null || input.customName().isBlank())
                    ? null : input.customName().trim();
            repo.save(TenantAnalysis.builder()
                    .tenantId(input.tenantId())
                    .catalogId(input.catalogId())
                    .shortCode(code)
                    .customName(customName)
                    .active(true)
                    .build());
        } else {
            existing.ifPresent(ta -> {
                ta.softDelete(input.actor());
                repo.save(ta);
            });
        }
    }
}
```

- [ ] **Step 6: Correr el test — pasa**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=SetTenantAnalysisActivationUseCaseTest test`
Expected: PASS.

- [ ] **Step 7: DTO + endpoint en `TenantAnalysisController`**

```java
// SetTenantAnalysisActivationRequest.java
package lab.laboratorio.modules.analitica.presentation.catalog.dto.request;

public record SetTenantAnalysisActivationRequest(
        Long catalogId, boolean active, String shortCode, String customName) {}
```

```java
// en TenantAnalysisController: inyectar el use case
private final SetTenantAnalysisActivationUseCase activationUseCase;

@PutMapping("/activation")
@PreAuthorize("hasRole('ADMINISTRADOR')")
public ResponseEntity<Void> setActivation(
        @RequestBody SetTenantAnalysisActivationRequest request,
        @AuthenticationPrincipal UserDetails user) {
    Long tenantId = TenantContext.requireTenantId();
    String actor = user != null ? user.getUsername() : "system";
    activationUseCase.execute(new SetTenantAnalysisActivationUseCase.Input(
            request.catalogId(), request.active(), request.shortCode(), request.customName(),
            tenantId, actor));
    return ResponseEntity.noContent().build();
}
```

Agregar imports: `PutMapping`, `SetTenantAnalysisActivationUseCase`, el DTO request, `TenantContext`.

- [ ] **Step 8: Registrar `ShortCodeRequiredException` en `GlobalExceptionHandler` (422)**

Agregar `ShortCodeRequiredException.class` al `@ExceptionHandler({...})` que devuelve `UNPROCESSABLE_ENTITY` (p. ej. el grupo `handleUnprocessableResultados` o crear uno análogo para analitica). Importar la clase.

- [ ] **Step 9: Compilar y commitear**

Run: `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q -Dtest=SetTenantAnalysisActivationUseCaseTest test`
Expected: PASS.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/domain/exception/ShortCodeRequiredException.java \
        src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantAnalysisRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/analitica/application/usecase/tenantanalysis/SetTenantAnalysisActivationUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/ \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/ \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/application/usecase/tenantanalysis/SetTenantAnalysisActivationUseCaseTest.java
git commit -m "feat(nbu): activación idempotente del análisis (PUT /tenant-analyses/activation)"
```

- [ ] **Step 10: Suite BE completa + boot MySQL real**

Run (suite): `$env:JAVA_HOME="C:\Program Files\Java\jdk-21"; ./mvnw -q test`
Expected: verde (salvo fallas pre-existentes de development ya conocidas — listarlas si aparecen).

Run (boot MySQL): seguir la receta de `reference_mysql-boot-verification` — levantar perfil `local` contra un schema fresco vía `$env:SPRING_DATASOURCE_URL`, confirmar que Flyway aplica V1030 y la app bootea. Documentar OK.

---

## Task 6: FE — métodos de `NbuConfigApiService`

**Files:**
- Modify: `src/app/features/analitica/services/nbu-config-api.service.ts`
- Test: `src/app/features/analitica/services/nbu-config-api.service.spec.ts`

**Interfaces:**
- Produces: tipos `PreparationTypeOption {code,label,requiresHours}`, `PreparationItem {type, label?, fastingHours}`.
- Produces métodos: `getPreparationTypes(): Observable<PreparationTypeOption[]>`, `getPreparation(detId): Observable<{items: PreparationItem[]}>`, `upsertPreparation(detId, items: {type,fastingHours}[]): Observable<void>`, `setActivation(catalogId, active, shortCode, customName): Observable<void>`.

- [ ] **Step 1: Agregar specs al test del service**

Agregar al `nbu-config-api.service.spec.ts` (sigue el patrón `HttpTestingController` ya usado):

```ts
it('getPreparationTypes hace GET a /preparation/types', () => {
  service.getPreparationTypes().subscribe();
  const req = httpMock.expectOne('/api/v1/analitica/preparation/types');
  expect(req.request.method).toBe('GET');
  req.flush([]);
});

it('upsertPreparation hace PUT con {items} al endpoint de la determinación', () => {
  service.upsertPreparation(7, [{ type: 'AYUNO', fastingHours: 8 }]).subscribe();
  const req = httpMock.expectOne('/api/v1/analitica/determinations/7/preparation');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ items: [{ type: 'AYUNO', fastingHours: 8 }] });
  req.flush(null);
});

it('setActivation hace PUT a /tenant-analyses/activation', () => {
  service.setActivation(100, true, 'GLU', 'Glucemia').subscribe();
  const req = httpMock.expectOne('/api/v1/tenant-analyses/activation');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ catalogId: 100, active: true, shortCode: 'GLU', customName: 'Glucemia' });
  req.flush(null);
});
```

- [ ] **Step 2: Correr el spec — falla (métodos inexistentes)**

Run: `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts`
Expected: FAIL (TS: los métodos no existen).

- [ ] **Step 3: Agregar tipos + métodos al service**

```ts
/** Opción de tipo de preparación (catálogo fijo del BE). */
export interface PreparationTypeOption {
  code: string;
  label: string;
  requiresHours: boolean;
}

/** Item de preparación estructurada de una determinación. */
export interface PreparationItem {
  type: string;
  label?: string;       // presente en lectura, opcional en escritura
  fastingHours: number | null;
}
```

```ts
// dentro de NbuConfigApiService:
private readonly preparationBase = '/api/v1/analitica/preparation';

getPreparationTypes(): Observable<PreparationTypeOption[]> {
  return this.http.get<PreparationTypeOption[]>(`${this.preparationBase}/types`);
}

getPreparation(determinationId: number): Observable<{ items: PreparationItem[] }> {
  return this.http.get<{ items: PreparationItem[] }>(`${this.detBase}/${determinationId}/preparation`);
}

upsertPreparation(
  determinationId: number,
  items: { type: string; fastingHours: number | null }[],
): Observable<void> {
  return this.http.put<void>(`${this.detBase}/${determinationId}/preparation`, { items });
}

setActivation(
  catalogId: number,
  active: boolean,
  shortCode: string,
  customName: string | null,
): Observable<void> {
  return this.http.put<void>(`${this.tenantAnalysesBase}/activation`, {
    catalogId, active, shortCode, customName,
  });
}
```

- [ ] **Step 4: Correr el spec — pasa**

Run: `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commitear**

```bash
git add src/app/features/analitica/services/nbu-config-api.service.ts \
        src/app/features/analitica/services/nbu-config-api.service.spec.ts
git commit -m "feat(nbu): métodos de preparación estructurada y activación en NbuConfigApiService"
```

---

## Task 7: FE — toggle de activación en el drawer

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts`
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `NbuConfigApiService.setActivation` (Task 6). `analysis.id` es el `catalogId`; `generalForm.controls.shortCode` provee el shortCode; `active()` signal el estado actual.

- [ ] **Step 1: Spec — togglear activación llama setActivation con catalogId/active/shortCode**

Agregar al spec del drawer (sigue el patrón de mocks del service ya existente):

```ts
it('onToggleActive(true) llama setActivation con catalogId, active y shortCode', () => {
  const setActivation = vi.spyOn(api, 'setActivation').mockReturnValue(of(undefined));
  component.analysis = { id: 100, name: 'Glucemia' } as any;
  component['generalForm'].controls.shortCode.setValue('GLU');
  component['active'].set(false);

  component['onToggleActive'](true);

  expect(setActivation).toHaveBeenCalledWith(100, true, 'GLU', null);
});
```

- [ ] **Step 2: Correr el spec — falla (método inexistente)**

Run: `ng test --include=**/nbu-config-drawer.component.spec.ts --watch=false`
Expected: FAIL.

- [ ] **Step 3: Agregar el toggle al template (sección General) + handler**

En `imports` del componente agregar `ToggleSwitchModule` (`import { ToggleSwitchModule } from 'primeng/toggleswitch';`).

Reemplazar el `<span>` de estado read-only en la sección General por el toggle:

```html
<div class="pat-form__field" style="grid-column: 1 / -1;" class="flex items-center gap-2">
  <p-toggleswitch [ngModel]="active()" [ngModelOptions]="{ standalone: true }"
                  (ngModelChange)="onToggleActive($event)" inputId="nbu-active" />
  <label for="nbu-active" class="pat-form__label" style="margin:0;">
    {{ active() ? 'Análisis activo' : 'Análisis inactivo' }}
  </label>
  <span class="text-xs text-[var(--ds-text-muted)]">
    · Cód. NBU: {{ analysis?.nbuCode ?? '—' }} · Familia: {{ analysis?.familyName ?? '—' }}
  </span>
</div>
```

> `p-toggleswitch` usa `ngModel`; agregar `FormsModule` a `imports` si no está (el drawer ya usa `ReactiveFormsModule`; sumar `FormsModule`).

Handler:

```ts
protected onToggleActive(next: boolean): void {
  if (!this.analysis) return;
  const shortCode = (this.generalForm.controls.shortCode.value ?? '').trim();
  if (next && shortCode.length === 0) {
    this.messageService.add({
      severity: 'warn', summary: 'Falta el código interno',
      detail: 'Ingresá el código interno antes de activar el análisis.',
    });
    return;  // no flipear el estado
  }
  const customName = (this.generalForm.controls.customName.value ?? '').trim() || null;
  const prev = this.active();
  this.active.set(next);
  this.nbuConfig.setActivation(this.analysis.id, next, shortCode, customName).subscribe({
    next: () => this.messageService.add({
      severity: 'success', summary: next ? 'Análisis activado' : 'Análisis desactivado',
      detail: 'El cambio se guardó correctamente.',
    }),
    error: () => {
      this.active.set(prev);  // revertir
      this.messageService.add({
        severity: 'error', summary: 'Error',
        detail: 'No se pudo cambiar el estado del análisis. Intentá de nuevo.',
      });
    },
  });
}
```

- [ ] **Step 4: Correr el spec — pasa**

Run: `ng test --include=**/nbu-config-drawer.component.spec.ts --watch=false`
Expected: PASS.

- [ ] **Step 5: Commitear**

```bash
git add src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts \
        src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.spec.ts
git commit -m "feat(nbu): toggle de activación del análisis en el drawer"
```

---

## Task 8: FE — editor de preparación estructurada por determinación

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts`
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `getPreparationTypes`, `getPreparation`, `upsertPreparation` (Task 6).
- Cambia el modelo `DetForm`: agrega `prepTypes` (Set de codes seleccionados), `fastingHours` (number|null), `observations` (string), y snapshot `originalPrep` para diff. Elimina el textarea único analysis-level "Preparación previa" y su replicación a `preIndications`.

- [ ] **Step 1: Spec — guardar persiste la preparación cambiada por determinación**

```ts
it('guarda la preparación estructurada cambiada vía upsertPreparation', () => {
  const upsert = vi.spyOn(api, 'upsertPreparation').mockReturnValue(of(undefined));
  // armar un DetForm con AYUNO 8 y NO_FUMAR seleccionados (helper del spec según estructura final)
  component['detForms'] = [{
    detId: 7, detName: 'Glucemia', unit: 'mg/dL', existingOverride: null,
    refValues: component['fb'].array([]), originalRefValues: '[]',
    prepTypes: new Set(['AYUNO', 'NO_FUMAR']), fastingHours: 8, observations: '',
    originalPrep: JSON.stringify({ types: [], hours: null, obs: '' }),
  } as any];
  component.analysis = { id: 100, name: 'Glucemia' } as any;
  component['generalForm'].controls.shortCode.setValue('GLU');

  component['onSave']();

  expect(upsert).toHaveBeenCalledWith(7, [
    { type: 'AYUNO', fastingHours: 8 },
    { type: 'NO_FUMAR', fastingHours: null },
  ]);
});
```

- [ ] **Step 2: Correr el spec — falla**

Run: `ng test --include=**/nbu-config-drawer.component.spec.ts --watch=false`
Expected: FAIL.

- [ ] **Step 3: Extender el modelo `DetForm` y cargar tipos + prep**

En la interface `DetForm` agregar:

```ts
/** Codes de PreparationType seleccionados. */
prepTypes: Set<string>;
/** Horas de ayuno (solo si AYUNO seleccionado). */
fastingHours: number | null;
/** Observaciones libres (→ preObservations del override). */
observations: string;
/** Snapshot serializado de la preparación al cargar (para diff). */
originalPrep: string;
```

Agregar signal de opciones de tipos y cargarlas en `loadConfig`:

```ts
protected readonly prepTypeOptions = signal<PreparationTypeOption[]>([]);

private snapshotPrep(types: Set<string>, hours: number | null, obs: string): string {
  return JSON.stringify({ types: [...types].sort(), hours, obs });
}
```

En `loadConfig`, agregar `getPreparationTypes()` al `forkJoin` inicial (una vez) y guardarlo en `prepTypeOptions`. En `loadDeterminations`, agregar por determinación `preparation: this.nbuConfig.getPreparation(det.id)` al `forkJoin`, y construir `DetForm` con:

```ts
const prepTypes = new Set<string>(preparation.items.map((i) => i.type));
const fastingHours = preparation.items.find((i) => i.type === 'AYUNO')?.fastingHours ?? null;
const observations = override?.preObservations ?? '';
// originalPrep = this.snapshotPrep(prepTypes, fastingHours, observations)
```

> El textarea único "Preparación previa" (signal `ayuno`) y su lógica de replicación a `preIndications` en `onSave` se **eliminan** (Steps 5-6).

- [ ] **Step 4: Template — editor de preparación dentro del acordeón**

Dentro de `<p-accordion-content>` de cada determinación, **antes** de la tabla de valores de referencia, agregar:

```html
<div class="mb-3">
  <span class="text-xs font-medium text-[var(--ds-text-muted)] block mb-1">Preparación del paciente</span>
  <div class="flex flex-wrap gap-3">
    @for (opt of prepTypeOptions(); track opt.code) {
      <label class="flex items-center gap-1 text-xs">
        <p-checkbox [binary]="true"
                    [ngModel]="det.prepTypes.has(opt.code)"
                    [ngModelOptions]="{ standalone: true }"
                    (ngModelChange)="onPrepTypeToggle(det, opt.code, $event)" />
        {{ opt.label }}
      </label>
    }
  </div>
  @if (det.prepTypes.has('AYUNO')) {
    <div class="mt-2 flex items-center gap-2">
      <label class="text-xs">Horas de ayuno</label>
      <p-inputnumber [ngModel]="det.fastingHours" [ngModelOptions]="{ standalone: true }"
                     (ngModelChange)="det.fastingHours = $event" [min]="1" [useGrouping]="false"
                     inputStyleClass="pat-form__input w-20" />
    </div>
  }
  <div class="mt-2">
    <label class="text-xs block">Observaciones</label>
    <textarea pTextarea rows="2" autocomplete="off" class="pat-form__input"
              [ngModel]="det.observations" [ngModelOptions]="{ standalone: true }"
              (ngModelChange)="det.observations = $event"></textarea>
  </div>
</div>
```

Agregar `CheckboxModule` (`primeng/checkbox`) y `FormsModule` a `imports`. Handler:

```ts
protected onPrepTypeToggle(det: DetForm, code: string, checked: boolean): void {
  if (checked) det.prepTypes.add(code);
  else {
    det.prepTypes.delete(code);
    if (code === 'AYUNO') det.fastingHours = null;
  }
}
```

- [ ] **Step 5: `onSave` — persistir prep + observaciones cambiadas, quitar el ayuno global**

En `onSave`, **eliminar** el bloque del ayuno global (`ayunoChanged` / replicación de `preIndications`). Agregar, dentro del loop por determinación:

```ts
// Preparación estructurada: si cambió el set/horas/observaciones de la determinación.
const currentPrepSnapshot = this.snapshotPrep(det.prepTypes, det.fastingHours, det.observations.trim());
if (currentPrepSnapshot !== det.originalPrep) {
  const items = [...det.prepTypes].map((type) => ({
    type,
    fastingHours: type === 'AYUNO' ? det.fastingHours : null,
  }));
  calls.push(this.nbuConfig.upsertPreparation(det.detId, items));

  // Observaciones → preObservations del override (merge sobre el existente).
  const body: Partial<DeterminationOverride> = {
    ...(det.existingOverride ?? {}),
    preObservations: det.observations.trim().length > 0 ? det.observations.trim() : null,
  };
  calls.push(this.nbuConfig.upsertOverride(det.detId, body));
}
```

> Validación FE: si AYUNO está seleccionado y `fastingHours` es null/≤0, mostrar toast `warn` "Ingresá las horas de ayuno (mayor a 0)." y abortar el guardado (analogía con `hasInvalidRows`).

- [ ] **Step 6: Correr el spec del drawer — pasa**

Run: `ng test --include=**/nbu-config-drawer.component.spec.ts --watch=false`
Expected: PASS.

- [ ] **Step 7: Suite FE de analitica + commit**

Run: `ng test --include=**/analitica/**/*.spec.ts --watch=false`
Expected: verde.

```bash
git add src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts \
        src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.spec.ts
git commit -m "feat(nbu): editor de preparación estructurada por determinación en el drawer"
```

---

## Self-Review (cobertura del spec)

| Requisito del spec | Task |
| --- | --- |
| `PreparationType` enum + labels español + endpoint types | Task 1 |
| Tabla `tenant_determination_preparation` (V1030) tenant-scoped | Task 2 |
| GET/PUT prep por determinación + validación 422 español | Task 3 |
| Cómputo orden (máx ayuno, unión, observaciones) + endpoint | Task 4 |
| Activación idempotente `PUT /activation` (crear/noop/desactivar) | Task 5 |
| Métodos FE en `NbuConfigApiService` | Task 6 |
| Toggle activación en el drawer | Task 7 |
| Editor estructurado por determinación + quitar textarea libre | Task 8 |
| Unidad read-only (no editable) | Sin cambios (ya está así) |
| No auto-parsear texto libre | Por diseño — ninguna migración de datos |
| Boot MySQL real | Task 5 Step 10 |

**Notas de verificación en implementación (no placeholders, sino confirmaciones a hacer al tocar el código):**
- Confirmar firma real del constructor/`@Builder` de `DeterminationCatalog` en el helper del test de Task 4.
- Confirmar nombre del método de mapeo a dominio del adapter de `TenantAnalysis` en Task 5 Step 4.
- Confirmar el grupo exacto de `@ExceptionHandler` 422 en `GlobalExceptionHandler` (línea ~184) al registrar las excepciones nuevas.

## Out of scope (no implementar en esta tanda)
- Consumir `/compute` desde el FE (wizard/turno/portal/impresión).
- Edición de sección del análisis.
- Unidad configurable.
- Preparación a nivel catálogo global.
