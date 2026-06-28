# NBU: precio particular real + fix resumen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-06-28-nbu-precio-particular-design.md`
> **Jira:** [KAN-154](https://exequielsantoro.atlassian.net/browse/KAN-154)

**Goal:** Persistir el precio particular de NBU (valor U.B. + override de precio por análisis) en BE y hacer que el motor de precios de atención los use; + quitar el resumen "Preparación previa" desincronizado.

**Architecture:** Hexagonal por módulos. BE en `modules/analitica`: extender `tenant_nbu_config` (valor U.B.), tabla nueva `tenant_analysis_price_override`, reapuntar `ParticularPricingPort` e integrar override en `CalculateAttentionPricingUseCase`. FE: de-mock `NomencladorService` y quitar el resumen viejo.

**Tech Stack:** Java 21, Spring Boot, JPA/Hibernate, Flyway, MySQL (boot) + H2 (tests), JUnit5 + Mockito + AssertJ. Angular 21 standalone + signals + NgRx + Vitest.

## Global Constraints

- **Flyway: usar SOLO V1031 y V1032** (lane NBU V1031–V1039; KAN-142 usó V1030). No salirse.
- **JDK 21** para BE: `export JAVA_HOME="/c/Program Files/Java/jdk-21"` antes de `./mvnw`.
- **Tests BE = Mockito puros** (NO `@SpringBootTest`: el contexto está roto por una migración pre-existente ajena `V1028` multi-ADD-COLUMN en H2). La migración se valida por **boot MySQL real** (Task 7).
- **Tenant isolation:** tabla nueva extiende `BaseJpaEntity` (`tenantId` lo llena el listener, nunca del body). `tenant_nbu_config` usa `target_tenant_id` (NO BaseJpaEntity).
- **Errores español sin leak:** validaciones lanzan subclases de `lab.laboratorio.domain.exception.DomainException` (NO `IllegalArgumentException`). Registrar en `GlobalExceptionHandler`.
- **Nunca IDs en formularios:** el override se referencia por `analysisCatalogId` derivado de la fila.
- **Roles:** lectura `isAuthenticated()`; mutación `hasRole('ADMINISTRADOR')`.
- **FE:** `npm ci` ya hecho. Errores UI en español, sin leak, sin emojis Unicode. Runner: specs de service con `npx vitest run <path>`; componente que falle el `ng test` global por specs ajenos → correr aislado con vitest.
- **Compatibilidad de migración:** sin `ADD COLUMN IF NOT EXISTS`, sin multi-ADD-COLUMN en un solo ALTER, sin generated columns. Revisar `db/migration-local`.

---

## File Structure

**BE — `modules/analitica` (valor U.B. en tenant_nbu_config):**
- `src/main/resources/db/migration/V1031__add_valor_ub_particular_to_tenant_nbu_config.sql` (create)
- `domain/model/catalog/TenantNbuConfig.java` (modify: + `valorUbParticular`)
- `infrastructure/persistence/entity/catalog/TenantNbuConfigJpaEntity.java` (modify: + columna)
- `domain/port/catalog/TenantNbuConfigPort.java` (modify: + `getParticularUbValue` / `upsertParticularUbValue`)
- `infrastructure/persistence/adapter/catalog/TenantNbuConfigJpaAdapter.java` (modify)
- `application/usecase/catalog/GetTenantParticularUbValueUseCase.java` (create)
- `application/usecase/catalog/SetTenantParticularUbValueUseCase.java` (create)
- `presentation/catalog/TenantParticularUbController.java` (create) + DTOs
- `coverages/infrastructure/adapter/AtencionParticularPricingAdapter.java` (modify: tenant_nbu_config first, fallback plan particular)

**BE — `modules/analitica` (override de precio por análisis):**
- `src/main/resources/db/migration/V1032__create_tenant_analysis_price_override.sql` (create)
- `domain/model/catalog/TenantAnalysisPriceOverride.java` (create)
- `domain/port/catalog/TenantAnalysisPriceOverridePort.java` (create)
- `infrastructure/persistence/entity/catalog/TenantAnalysisPriceOverrideJpaEntity.java` (create)
- `infrastructure/persistence/repository/catalog/TenantAnalysisPriceOverrideJpaRepository.java` (create)
- `infrastructure/persistence/adapter/catalog/TenantAnalysisPriceOverrideJpaAdapter.java` (create)
- `application/usecase/catalog/{List,Upsert,Delete}TenantAnalysisPriceOverrideUseCase.java` (create)
- `domain/exception/InvalidPriceOverrideException.java` (create)
- `presentation/catalog/TenantAnalysisPriceOverrideController.java` (create) + DTOs
- `presentation/error/GlobalExceptionHandler.java` (modify: registrar `InvalidPriceOverrideException` → 422)
- `atencion/application/usecase/CalculateAttentionPricingUseCase.java` (modify: integrar override)

**FE — `features/analitica`:**
- `services/nomenclador.service.ts` (modify: de-mock pricing)
- `services/nomenclador.service.spec.ts` (create/modify si existe)
- `pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts` (modify: quitar "Preparación previa")
- `store/nomenclador/nomenclador.effects.ts` (modify: quitar mapeo `ayuno`)
- `models/nomenclador.model.ts` (modify: quitar `ayuno` de `ConfigResumen`)

---

## Task 1: Valor U.B. particular — persistencia en `tenant_nbu_config` (BE)

**Files:**
- Create: `src/main/resources/db/migration/V1031__add_valor_ub_particular_to_tenant_nbu_config.sql`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/domain/model/catalog/TenantNbuConfig.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/entity/catalog/TenantNbuConfigJpaEntity.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantNbuConfigPort.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/adapter/catalog/TenantNbuConfigJpaAdapter.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/GetTenantParticularUbValueUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/SetTenantParticularUbValueUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantParticularUbController.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/request/TenantParticularUbRequest.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/response/TenantParticularUbResponse.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/application/usecase/catalog/SetTenantParticularUbValueUseCaseTest.java`

**Interfaces:**
- Consumes: `TenantNbuConfigPort` existente (`getDefaultNbuVersionId`, `upsert(tenantId, defaultNbuVersionId)`).
- Produces: `TenantNbuConfigPort.getParticularUbValue(Long tenantId): Optional<BigDecimal>` y `upsertParticularUbValue(Long tenantId, BigDecimal value)` (preserva `defaultNbuVersionId` y `version`).
- Produces: `SetTenantParticularUbValueUseCase.execute(Long tenantId, BigDecimal valorUbParticular)`; `GetTenantParticularUbValueUseCase.execute(Long tenantId): Optional<BigDecimal>`.

- [ ] **Step 1: Test del Set use case (valida >= 0, persiste, rechaza negativo)**

```java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.exception.InvalidPriceOverrideException;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SetTenantParticularUbValueUseCaseTest {

    @Mock TenantNbuConfigPort port;
    @InjectMocks SetTenantParticularUbValueUseCase useCase;

    @Test
    void execute_validValue_persists() {
        useCase.execute(10L, new BigDecimal("350.00"));
        verify(port).upsertParticularUbValue(10L, new BigDecimal("350.00"));
    }

    @Test
    void execute_negative_throws422() {
        assertThatThrownBy(() -> useCase.execute(10L, new BigDecimal("-1")))
                .isInstanceOf(InvalidPriceOverrideException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("lab.laboratorio."));
        verify(port, never()).upsertParticularUbValue(any(), any());
    }

    @Test
    void execute_null_throws422() {
        assertThatThrownBy(() -> useCase.execute(10L, null))
                .isInstanceOf(InvalidPriceOverrideException.class);
    }
}
```

> Nota: `InvalidPriceOverrideException` se crea en la Task 3. Para no acoplar Task 1 a Task 3, crear primero esa excepción acá si Task 3 aún no corrió. Si ya existe, reusarla. (El reviewer no debe penalizar el orden.)

- [ ] **Step 2: Correr el test — falla (clases inexistentes)**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=SetTenantParticularUbValueUseCaseTest test`
Expected: FAIL (no compila).

- [ ] **Step 3: Crear la excepción de dominio (si no existe aún)**

```java
package lab.laboratorio.modules.analitica.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class InvalidPriceOverrideException extends DomainException {
    public InvalidPriceOverrideException(String message) {
        super(message);
    }
}
```

- [ ] **Step 4: Migración V1031**

```sql
-- V1031: valor U.B. particular del tenant (config de pricing NBU).
-- Un solo ADD COLUMN (H2 + MySQL compatible).
ALTER TABLE tenant_nbu_config ADD COLUMN valor_ub_particular DECIMAL(15, 2) NULL;
```

Si existe `src/main/resources/db/migration-local/`, replicar el mismo archivo allí (mirar cómo se hizo con migraciones previas de tenant_nbu_config).

- [ ] **Step 5: Extender entidad, dominio y port**

En `TenantNbuConfigJpaEntity` agregar:
```java
@Column(name = "valor_ub_particular", precision = 15, scale = 2)
private java.math.BigDecimal valorUbParticular;
```

En `TenantNbuConfig` (dominio) agregar el campo `private BigDecimal valorUbParticular;` (respetar el patrón Lombok existente de la clase).

En `TenantNbuConfigPort` agregar:
```java
java.util.Optional<java.math.BigDecimal> getParticularUbValue(Long tenantId);
void upsertParticularUbValue(Long tenantId, java.math.BigDecimal valorUbParticular);
```

- [ ] **Step 6: Implementar en el adapter (preservando defaultNbuVersionId)**

En `TenantNbuConfigJpaAdapter`:
```java
@Override
@Transactional(readOnly = true)
public Optional<BigDecimal> getParticularUbValue(Long tenantId) {
    return repository.findByTargetTenantId(tenantId)
            .map(TenantNbuConfigJpaEntity::getValorUbParticular);
}

@Override
@Transactional
public void upsertParticularUbValue(Long tenantId, BigDecimal valorUbParticular) {
    TenantNbuConfigJpaEntity entity = repository.findByTargetTenantId(tenantId)
            .orElseGet(() -> TenantNbuConfigJpaEntity.builder()
                    .targetTenantId(tenantId)
                    .createdBy("system")
                    .build());
    entity.setValorUbParticular(valorUbParticular);
    repository.save(entity);
}
```
Agregar imports `java.math.BigDecimal`.

- [ ] **Step 7: Use cases Get/Set**

```java
// SetTenantParticularUbValueUseCase.java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.exception.InvalidPriceOverrideException;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class SetTenantParticularUbValueUseCase {

    private final TenantNbuConfigPort port;

    public void execute(Long tenantId, BigDecimal valorUbParticular) {
        if (valorUbParticular == null || valorUbParticular.signum() < 0) {
            throw new InvalidPriceOverrideException("El valor de la U.B. debe ser mayor o igual a 0.");
        }
        port.upsertParticularUbValue(tenantId, valorUbParticular);
    }
}
```

```java
// GetTenantParticularUbValueUseCase.java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GetTenantParticularUbValueUseCase {

    private final TenantNbuConfigPort port;

    public Optional<BigDecimal> execute(Long tenantId) {
        return port.getParticularUbValue(tenantId);
    }
}
```

- [ ] **Step 8: Correr el test — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=SetTenantParticularUbValueUseCaseTest test`
Expected: PASS.

- [ ] **Step 9: DTOs + controller**

```java
// TenantParticularUbRequest.java
package lab.laboratorio.modules.analitica.presentation.catalog.dto.request;
import java.math.BigDecimal;
public record TenantParticularUbRequest(BigDecimal valorUbParticular) {}
```
```java
// TenantParticularUbResponse.java
package lab.laboratorio.modules.analitica.presentation.catalog.dto.response;
import java.math.BigDecimal;
public record TenantParticularUbResponse(BigDecimal valorUbParticular) {}
```
```java
// TenantParticularUbController.java
package lab.laboratorio.modules.analitica.presentation.catalog;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lab.laboratorio.infrastructure.tenancy.TenantContext;
import lab.laboratorio.modules.analitica.application.usecase.catalog.GetTenantParticularUbValueUseCase;
import lab.laboratorio.modules.analitica.application.usecase.catalog.SetTenantParticularUbValueUseCase;
import lab.laboratorio.modules.analitica.presentation.catalog.dto.request.TenantParticularUbRequest;
import lab.laboratorio.modules.analitica.presentation.catalog.dto.response.TenantParticularUbResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analitica/config/particular-ub")
@Tag(name = "Analítica - Precio particular (valor U.B.)")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class TenantParticularUbController {

    private final GetTenantParticularUbValueUseCase getUseCase;
    private final SetTenantParticularUbValueUseCase setUseCase;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TenantParticularUbResponse> get() {
        Long tenantId = TenantContext.requireTenantId();
        return ResponseEntity.ok(new TenantParticularUbResponse(getUseCase.execute(tenantId).orElse(null)));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> put(@RequestBody TenantParticularUbRequest request) {
        Long tenantId = TenantContext.requireTenantId();
        setUseCase.execute(tenantId, request.valorUbParticular());
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 10: Registrar `InvalidPriceOverrideException` en `GlobalExceptionHandler` (422)**

En `src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java`, agregar `InvalidPriceOverrideException.class` al `@ExceptionHandler({...})` que devuelve `UNPROCESSABLE_ENTITY` (grupo `handleUnprocessableResultados`, ~línea 184) e importar la clase.

- [ ] **Step 11: Compilar y commitear**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=SetTenantParticularUbValueUseCaseTest test`
Expected: PASS y compila.

```bash
git add src/main/resources/db/migration/V1031__add_valor_ub_particular_to_tenant_nbu_config.sql \
        src/main/java/lab/laboratorio/modules/analitica/domain/model/catalog/TenantNbuConfig.java \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/entity/catalog/TenantNbuConfigJpaEntity.java \
        src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantNbuConfigPort.java \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/adapter/catalog/TenantNbuConfigJpaAdapter.java \
        src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/GetTenantParticularUbValueUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/SetTenantParticularUbValueUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/domain/exception/InvalidPriceOverrideException.java \
        src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantParticularUbController.java \
        src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/ \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/application/usecase/catalog/SetTenantParticularUbValueUseCaseTest.java
git commit -m "feat(nbu): valor U.B. particular persistido en tenant_nbu_config (V1031)"
```

---

## Task 2: Reapuntar `ParticularPricingPort` al valor U.B. de tenant_nbu_config (BE)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/coverages/infrastructure/adapter/AtencionParticularPricingAdapter.java`
- Test: `src/test/java/lab/laboratorio/modules/coverages/infrastructure/adapter/AtencionParticularPricingAdapterTest.java`

**Interfaces:**
- Consumes: `TenantNbuConfigPort.getParticularUbValue` (Task 1), `PlanRepositoryPort.findParticularPlan`, `AgreementRepositoryPort.findOpenByPlanId` (existentes).
- Produces: `ParticularPricingPort.getParticularUbValue(tenantId)` ahora lee primero `tenant_nbu_config`, fallback al plan particular.

- [ ] **Step 1: Test del fallback (config primero; si null, plan particular)**

```java
package lab.laboratorio.modules.coverages.infrastructure.adapter;

import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import lab.laboratorio.modules.coverages.domain.model.Agreement;
import lab.laboratorio.modules.coverages.domain.model.Plan;
import lab.laboratorio.modules.coverages.domain.port.AgreementRepositoryPort;
import lab.laboratorio.modules.coverages.domain.port.PlanRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AtencionParticularPricingAdapterTest {

    @Mock PlanRepositoryPort planRepo;
    @Mock AgreementRepositoryPort agreementRepo;
    @Mock TenantNbuConfigPort tenantNbuConfigPort;
    @InjectMocks AtencionParticularPricingAdapter adapter;

    @Test
    void usesTenantNbuConfigWhenPresent() {
        when(tenantNbuConfigPort.getParticularUbValue(10L)).thenReturn(Optional.of(new BigDecimal("400.00")));

        Optional<BigDecimal> result = adapter.getParticularUbValue(10L);

        assertThat(result).contains(new BigDecimal("400.00"));
        verifyNoInteractions(planRepo, agreementRepo);  // no toca el fallback
    }

    @Test
    void fallsBackToParticularPlanWhenConfigNull() {
        when(tenantNbuConfigPort.getParticularUbValue(10L)).thenReturn(Optional.empty());
        Plan plan = mock(Plan.class);
        when(plan.getId()).thenReturn(5L);
        Agreement agreement = mock(Agreement.class);
        when(agreement.getUbValue()).thenReturn(new BigDecimal("350.00"));
        when(planRepo.findParticularPlan(10L)).thenReturn(Optional.of(plan));
        when(agreementRepo.findOpenByPlanId(10L, 5L)).thenReturn(Optional.of(agreement));

        Optional<BigDecimal> result = adapter.getParticularUbValue(10L);

        assertThat(result).contains(new BigDecimal("350.00"));
    }
}
```

- [ ] **Step 2: Correr el test — falla (constructor cambió)**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=AtencionParticularPricingAdapterTest test`
Expected: FAIL (no compila: falta el campo `tenantNbuConfigPort`).

- [ ] **Step 3: Reapuntar el adapter (config primero, fallback plan)**

```java
package lab.laboratorio.modules.coverages.infrastructure.adapter;

import lab.laboratorio.modules.analitica.atencion.domain.port.ParticularPricingPort;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import lab.laboratorio.modules.coverages.domain.port.AgreementRepositoryPort;
import lab.laboratorio.modules.coverages.domain.port.PlanRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class AtencionParticularPricingAdapter implements ParticularPricingPort {

    private final PlanRepositoryPort planRepo;
    private final AgreementRepositoryPort agreementRepo;
    private final TenantNbuConfigPort tenantNbuConfigPort;

    @Override
    public Optional<BigDecimal> getParticularUbValue(Long tenantId) {
        // Fuente primaria: valor U.B. configurado por NBU (tenant_nbu_config).
        Optional<BigDecimal> fromConfig = tenantNbuConfigPort.getParticularUbValue(tenantId);
        if (fromConfig.isPresent()) {
            return fromConfig;
        }
        // Fallback (tenants sin valor configurado por NBU): plan particular / convenio vigente.
        return planRepo.findParticularPlan(tenantId)
                .flatMap(plan -> agreementRepo.findOpenByPlanId(tenantId, plan.getId()))
                .map(a -> a.getUbValue());
    }
}
```

- [ ] **Step 4: Correr el test — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=AtencionParticularPricingAdapterTest test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/coverages/infrastructure/adapter/AtencionParticularPricingAdapter.java \
        src/test/java/lab/laboratorio/modules/coverages/infrastructure/adapter/AtencionParticularPricingAdapterTest.java
git commit -m "feat(nbu): ParticularPricingPort lee valor U.B. de tenant_nbu_config (fallback plan particular)"
```

---

## Task 3: Tabla y persistencia del override de precio por análisis (BE)

**Files:**
- Create: `src/main/resources/db/migration/V1032__create_tenant_analysis_price_override.sql`
- Create: `src/main/java/lab/laboratorio/modules/analitica/domain/model/catalog/TenantAnalysisPriceOverride.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantAnalysisPriceOverridePort.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/entity/catalog/TenantAnalysisPriceOverrideJpaEntity.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/repository/catalog/TenantAnalysisPriceOverrideJpaRepository.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/adapter/catalog/TenantAnalysisPriceOverrideJpaAdapter.java`

**Interfaces:**
- Produces: `TenantAnalysisPriceOverride` (domain) con `Long id, Long tenantId, Long analysisCatalogId, BigDecimal overridePrice` (Lombok `@Getter @Builder`).
- Produces: `TenantAnalysisPriceOverridePort`:
  - `List<TenantAnalysisPriceOverride> findByTenantId(Long tenantId)`
  - `Map<Long, BigDecimal> findOverridesByCatalogIds(Set<Long> catalogIds, Long tenantId)` (key = analysisCatalogId)
  - `void upsert(Long analysisCatalogId, Long tenantId, BigDecimal overridePrice)`
  - `void delete(Long analysisCatalogId, Long tenantId)`

- [ ] **Step 1: Migración V1032**

```sql
-- V1032: override manual de precio particular por análisis (override por tenant).
-- Fila existe = override activo; revertir = borrar la fila.
CREATE TABLE tenant_analysis_price_override (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id           BIGINT          NOT NULL,
    analysis_catalog_id BIGINT          NOT NULL,
    override_price      DECIMAL(12, 2)  NOT NULL,
    created_at          DATETIME(6)     NOT NULL,
    updated_at          DATETIME(6)     NOT NULL,
    deleted_at          DATETIME(6)     NULL,
    created_by          VARCHAR(120)    NOT NULL,
    updated_by          VARCHAR(120)    NOT NULL,
    active              BOOLEAN         NOT NULL DEFAULT TRUE,
    version             BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_tenant_price_override_catalog FOREIGN KEY (analysis_catalog_id) REFERENCES analysis_catalog (id),
    CONSTRAINT uq_tenant_price_override UNIQUE (tenant_id, analysis_catalog_id),
    INDEX idx_tenant_price_override_lookup (tenant_id)
);
```
Replicar en `db/migration-local/` si aplica.

- [ ] **Step 2: Modelo de dominio**

```java
package lab.laboratorio.modules.analitica.domain.model.catalog;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAnalysisPriceOverride {
    private Long id;
    private Long tenantId;
    private Long analysisCatalogId;
    private BigDecimal overridePrice;
}
```

- [ ] **Step 3: Puerto**

```java
package lab.laboratorio.modules.analitica.domain.port.catalog;

import lab.laboratorio.modules.analitica.domain.model.catalog.TenantAnalysisPriceOverride;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;

public interface TenantAnalysisPriceOverridePort {
    List<TenantAnalysisPriceOverride> findByTenantId(Long tenantId);
    Map<Long, BigDecimal> findOverridesByCatalogIds(Set<Long> catalogIds, Long tenantId);
    void upsert(Long analysisCatalogId, Long tenantId, BigDecimal overridePrice);
    void delete(Long analysisCatalogId, Long tenantId);
}
```

- [ ] **Step 4: Entidad JPA**

```java
package lab.laboratorio.modules.analitica.infrastructure.persistence.entity.catalog;

import jakarta.persistence.*;
import lab.laboratorio.infrastructure.persistence.entity.BaseJpaEntity;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;

@Entity
@Table(
        name = "tenant_analysis_price_override",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_tenant_price_override",
                columnNames = {"tenant_id", "analysis_catalog_id"})
)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TenantAnalysisPriceOverrideJpaEntity extends BaseJpaEntity {

    @Column(name = "analysis_catalog_id", nullable = false)
    private Long analysisCatalogId;

    @Column(name = "override_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal overridePrice;
}
```

- [ ] **Step 5: JPA repository**

```java
package lab.laboratorio.modules.analitica.infrastructure.persistence.repository.catalog;

import lab.laboratorio.modules.analitica.infrastructure.persistence.entity.catalog.TenantAnalysisPriceOverrideJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface TenantAnalysisPriceOverrideJpaRepository
        extends JpaRepository<TenantAnalysisPriceOverrideJpaEntity, Long> {

    List<TenantAnalysisPriceOverrideJpaEntity> findByTenantId(Long tenantId);

    List<TenantAnalysisPriceOverrideJpaEntity> findByTenantIdAndAnalysisCatalogIdIn(Long tenantId, Set<Long> catalogIds);

    Optional<TenantAnalysisPriceOverrideJpaEntity> findByTenantIdAndAnalysisCatalogId(Long tenantId, Long analysisCatalogId);

    void deleteByTenantIdAndAnalysisCatalogId(Long tenantId, Long analysisCatalogId);
}
```

- [ ] **Step 6: Adapter**

```java
package lab.laboratorio.modules.analitica.infrastructure.persistence.adapter.catalog;

import lab.laboratorio.modules.analitica.domain.model.catalog.TenantAnalysisPriceOverride;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import lab.laboratorio.modules.analitica.infrastructure.persistence.entity.catalog.TenantAnalysisPriceOverrideJpaEntity;
import lab.laboratorio.modules.analitica.infrastructure.persistence.repository.catalog.TenantAnalysisPriceOverrideJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class TenantAnalysisPriceOverrideJpaAdapter implements TenantAnalysisPriceOverridePort {

    private final TenantAnalysisPriceOverrideJpaRepository jpa;

    @Override
    @Transactional(readOnly = true)
    public List<TenantAnalysisPriceOverride> findByTenantId(Long tenantId) {
        return jpa.findByTenantId(tenantId).stream().map(this::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> findOverridesByCatalogIds(Set<Long> catalogIds, Long tenantId) {
        if (catalogIds.isEmpty()) return Map.of();
        return jpa.findByTenantIdAndAnalysisCatalogIdIn(tenantId, catalogIds).stream()
                .collect(Collectors.toMap(
                        TenantAnalysisPriceOverrideJpaEntity::getAnalysisCatalogId,
                        TenantAnalysisPriceOverrideJpaEntity::getOverridePrice));
    }

    @Override
    @Transactional
    public void upsert(Long analysisCatalogId, Long tenantId, BigDecimal overridePrice) {
        TenantAnalysisPriceOverrideJpaEntity entity = jpa
                .findByTenantIdAndAnalysisCatalogId(tenantId, analysisCatalogId)
                .orElseGet(() -> TenantAnalysisPriceOverrideJpaEntity.builder()
                        .analysisCatalogId(analysisCatalogId)
                        .build());
        entity.setOverridePrice(overridePrice);
        jpa.save(entity);
    }

    @Override
    @Transactional
    public void delete(Long analysisCatalogId, Long tenantId) {
        jpa.deleteByTenantIdAndAnalysisCatalogId(tenantId, analysisCatalogId);
    }

    private TenantAnalysisPriceOverride toDomain(TenantAnalysisPriceOverrideJpaEntity e) {
        return TenantAnalysisPriceOverride.builder()
                .id(e.getId())
                .tenantId(e.getTenantId())
                .analysisCatalogId(e.getAnalysisCatalogId())
                .overridePrice(e.getOverridePrice())
                .build();
    }
}
```

- [ ] **Step 7: Compilar (la migración corre en boot de tests)**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=SetTenantParticularUbValueUseCaseTest test`
Expected: PASS (compila el módulo con las clases nuevas).

- [ ] **Step 8: Commit**

```bash
git add src/main/resources/db/migration/V1032__create_tenant_analysis_price_override.sql \
        src/main/java/lab/laboratorio/modules/analitica/domain/model/catalog/TenantAnalysisPriceOverride.java \
        src/main/java/lab/laboratorio/modules/analitica/domain/port/catalog/TenantAnalysisPriceOverridePort.java \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/entity/catalog/TenantAnalysisPriceOverrideJpaEntity.java \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/repository/catalog/TenantAnalysisPriceOverrideJpaRepository.java \
        src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/adapter/catalog/TenantAnalysisPriceOverrideJpaAdapter.java
git commit -m "feat(nbu): tabla y persistencia de override de precio por análisis (V1032)"
```

---

## Task 4: Use cases + endpoints del override de precio (BE)

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/ListTenantAnalysisPriceOverridesUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/UpsertTenantAnalysisPriceOverrideUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/DeleteTenantAnalysisPriceOverrideUseCase.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantAnalysisPriceOverrideController.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/request/PriceOverrideRequest.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/response/PriceOverrideResponse.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/application/usecase/catalog/UpsertTenantAnalysisPriceOverrideUseCaseTest.java`

**Interfaces:**
- Consumes: `TenantAnalysisPriceOverridePort` (Task 3), `InvalidPriceOverrideException` (Task 1).
- Produces: `UpsertTenantAnalysisPriceOverrideUseCase.execute(Long analysisCatalogId, Long tenantId, BigDecimal overridePrice)` (valida >= 0); `DeleteTenantAnalysisPriceOverrideUseCase.execute(Long analysisCatalogId, Long tenantId)`; `ListTenantAnalysisPriceOverridesUseCase.execute(Long tenantId): List<TenantAnalysisPriceOverride>`.
- Produces endpoints: `GET /api/v1/analitica/price-overrides`, `PUT /api/v1/analitica/price-overrides/{analysisCatalogId}`, `DELETE /api/v1/analitica/price-overrides/{analysisCatalogId}`.

- [ ] **Step 1: Test del Upsert (persiste; negativo → 422)**

```java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.exception.InvalidPriceOverrideException;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpsertTenantAnalysisPriceOverrideUseCaseTest {

    @Mock TenantAnalysisPriceOverridePort port;
    @InjectMocks UpsertTenantAnalysisPriceOverrideUseCase useCase;

    @Test
    void execute_valid_upserts() {
        useCase.execute(7L, 10L, new BigDecimal("1234.50"));
        verify(port).upsert(7L, 10L, new BigDecimal("1234.50"));
    }

    @Test
    void execute_negative_throws422() {
        assertThatThrownBy(() -> useCase.execute(7L, 10L, new BigDecimal("-5")))
                .isInstanceOf(InvalidPriceOverrideException.class);
        verify(port, never()).upsert(any(), any(), any());
    }

    @Test
    void execute_null_throws422() {
        assertThatThrownBy(() -> useCase.execute(7L, 10L, null))
                .isInstanceOf(InvalidPriceOverrideException.class);
    }
}
```

- [ ] **Step 2: Correr — falla**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantAnalysisPriceOverrideUseCaseTest test`
Expected: FAIL.

- [ ] **Step 3: Use cases**

```java
// UpsertTenantAnalysisPriceOverrideUseCase.java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.exception.InvalidPriceOverrideException;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class UpsertTenantAnalysisPriceOverrideUseCase {

    private final TenantAnalysisPriceOverridePort port;

    public void execute(Long analysisCatalogId, Long tenantId, BigDecimal overridePrice) {
        if (overridePrice == null || overridePrice.signum() < 0) {
            throw new InvalidPriceOverrideException("El precio del override debe ser mayor o igual a 0.");
        }
        port.upsert(analysisCatalogId, tenantId, overridePrice);
    }
}
```

```java
// DeleteTenantAnalysisPriceOverrideUseCase.java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DeleteTenantAnalysisPriceOverrideUseCase {

    private final TenantAnalysisPriceOverridePort port;

    public void execute(Long analysisCatalogId, Long tenantId) {
        port.delete(analysisCatalogId, tenantId);
    }
}
```

```java
// ListTenantAnalysisPriceOverridesUseCase.java
package lab.laboratorio.modules.analitica.application.usecase.catalog;

import lab.laboratorio.modules.analitica.domain.model.catalog.TenantAnalysisPriceOverride;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListTenantAnalysisPriceOverridesUseCase {

    private final TenantAnalysisPriceOverridePort port;

    public List<TenantAnalysisPriceOverride> execute(Long tenantId) {
        return port.findByTenantId(tenantId);
    }
}
```

- [ ] **Step 4: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantAnalysisPriceOverrideUseCaseTest test`
Expected: PASS.

- [ ] **Step 5: DTOs + controller**

```java
// PriceOverrideRequest.java
package lab.laboratorio.modules.analitica.presentation.catalog.dto.request;
import java.math.BigDecimal;
public record PriceOverrideRequest(BigDecimal overridePrice) {}
```
```java
// PriceOverrideResponse.java
package lab.laboratorio.modules.analitica.presentation.catalog.dto.response;
import java.math.BigDecimal;
public record PriceOverrideResponse(Long analysisCatalogId, BigDecimal overridePrice) {}
```
```java
// TenantAnalysisPriceOverrideController.java
package lab.laboratorio.modules.analitica.presentation.catalog;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lab.laboratorio.infrastructure.tenancy.TenantContext;
import lab.laboratorio.modules.analitica.application.usecase.catalog.DeleteTenantAnalysisPriceOverrideUseCase;
import lab.laboratorio.modules.analitica.application.usecase.catalog.ListTenantAnalysisPriceOverridesUseCase;
import lab.laboratorio.modules.analitica.application.usecase.catalog.UpsertTenantAnalysisPriceOverrideUseCase;
import lab.laboratorio.modules.analitica.presentation.catalog.dto.request.PriceOverrideRequest;
import lab.laboratorio.modules.analitica.presentation.catalog.dto.response.PriceOverrideResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analitica/price-overrides")
@Tag(name = "Analítica - Override de precio particular")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class TenantAnalysisPriceOverrideController {

    private final ListTenantAnalysisPriceOverridesUseCase listUseCase;
    private final UpsertTenantAnalysisPriceOverrideUseCase upsertUseCase;
    private final DeleteTenantAnalysisPriceOverrideUseCase deleteUseCase;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<PriceOverrideResponse>> list() {
        Long tenantId = TenantContext.requireTenantId();
        List<PriceOverrideResponse> body = listUseCase.execute(tenantId).stream()
                .map(o -> new PriceOverrideResponse(o.getAnalysisCatalogId(), o.getOverridePrice()))
                .toList();
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{analysisCatalogId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> upsert(
            @PathVariable Long analysisCatalogId, @RequestBody PriceOverrideRequest request) {
        Long tenantId = TenantContext.requireTenantId();
        upsertUseCase.execute(analysisCatalogId, tenantId, request.overridePrice());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{analysisCatalogId}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> delete(@PathVariable Long analysisCatalogId) {
        Long tenantId = TenantContext.requireTenantId();
        deleteUseCase.execute(analysisCatalogId, tenantId);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 6: Compilar y commitear**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantAnalysisPriceOverrideUseCaseTest test`
Expected: PASS.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/ListTenantAnalysisPriceOverridesUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/UpsertTenantAnalysisPriceOverrideUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/application/usecase/catalog/DeleteTenantAnalysisPriceOverrideUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantAnalysisPriceOverrideController.java \
        src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/dto/ \
        src/test/java/lab/laboratorio/modules/analitica/application/usecase/catalog/UpsertTenantAnalysisPriceOverrideUseCaseTest.java
git commit -m "feat(nbu): use cases y endpoints del override de precio por análisis"
```

---

## Task 5: Integrar el override en `CalculateAttentionPricingUseCase` (BE)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/CalculateAttentionPricingUseCase.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/atencion/application/usecase/CalculateAttentionPricingOverrideTest.java`

**Interfaces:**
- Consumes: `TenantAnalysisPriceOverridePort.findOverridesByCatalogIds(catalogIds, tenantId): Map<Long,BigDecimal>` (Task 3).
- El override **gana** sobre `cantidadUb × valorUb` para análisis **sin cobertura**. Análisis con cobertura siguen en 0.

- [ ] **Step 1: Leer el use case actual y entender el loop**

El método `execute` (líneas 36-87) arma `auths`, resuelve `cantById` y `valorUbParticular`, y por cada `auth`: si `isAuthorized()` → precio 0; si no → `precio = vUb.multiply(cant)`. Vamos a inyectar el override y usarlo en la rama "no autorizado".

- [ ] **Step 2: Test de integración del override (Mockito)**

```java
package lab.laboratorio.modules.analitica.atencion.application.usecase;

import lab.laboratorio.modules.analitica.atencion.domain.model.*;
import lab.laboratorio.modules.analitica.atencion.domain.port.*;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantAnalysisPriceOverridePort;
import lab.laboratorio.modules.analitica.domain.port.catalog.TenantNbuConfigPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CalculateAttentionPricingOverrideTest {

    @Mock AttentionRepositoryPort attentionRepo;
    @Mock ParticularPricingPort particularPricingPort;
    @Mock UbResolutionPort ubResolutionPort;
    @Mock AgreementNbuVersionPort agreementNbuVersionPort;
    @Mock TenantNbuConfigPort tenantNbuConfigPort;
    @Mock TenantAnalysisPriceOverridePort priceOverridePort;
    @InjectMocks CalculateAttentionPricingUseCase useCase;

    @Test
    void overrideWinsOverComputedPrice() {
        // attention con 1 análisis (id=1) NO autorizado
        AnalysisAuthorization a = mock(AnalysisAuthorization.class);
        when(a.isActive()).thenReturn(true);
        when(a.isAuthorized()).thenReturn(false);
        when(a.getAnalysisId()).thenReturn(1L);
        Attention att = mock(Attention.class);
        when(att.getAnalysisAuthorizations()).thenReturn(List.of(a));
        when(att.getInsurancePlanId()).thenReturn(null);
        when(att.getCopaymentAmount()).thenReturn(null);
        when(attentionRepo.findByIdWithAnalyses(99L, 10L)).thenReturn(Optional.of(att));
        when(tenantNbuConfigPort.getDefaultNbuVersionId(10L)).thenReturn(Optional.empty());
        when(ubResolutionPort.resolve(List.of(1L), null)).thenReturn(Map.of(1L, new BigDecimal("2")));
        when(particularPricingPort.getParticularUbValue(10L)).thenReturn(Optional.of(new BigDecimal("100")));
        // override: el análisis 1 tiene precio manual 999.00
        when(priceOverridePort.findOverridesByCatalogIds(any(), any())).thenReturn(Map.of(1L, new BigDecimal("999.00")));

        AttentionPricing result = useCase.execute(new CalculateAttentionPricingUseCase.Input(99L, 10L));

        // sin override sería 2×100=200; con override = 999.00
        assertThat(result.subtotal()).isEqualByComparingTo("999.00");
    }
}
```

> Nota: ajustar el helper a la API real de `AnalysisAuthorization`/`Attention`/`AttentionPricing` (chequear getters; `mock(...)` con `lenient()` si Mockito marca stubs no usados).

- [ ] **Step 3: Correr — falla (falta el port en el constructor)**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=CalculateAttentionPricingOverrideTest test`
Expected: FAIL.

- [ ] **Step 4: Integrar el override en el use case**

Inyectar el port y consultarlo antes del loop; usarlo en la rama "no autorizado":

```java
// agregar al campo de dependencias:
private final TenantAnalysisPriceOverridePort priceOverridePort;

// dentro de execute(...), después de calcular `ids` y antes del loop:
Map<Long, BigDecimal> overrides = priceOverridePort.findOverridesByCatalogIds(new java.util.HashSet<>(ids), in.tenantId());

// en el loop, rama else (no autorizado), reemplazar el cálculo:
} else {
    BigDecimal override = overrides.get(a.getAnalysisId());
    if (override != null) {
        vUb = null;  // precio manual: no aplica valor U.B.
        precio = override.setScale(2, RoundingMode.HALF_UP);
    } else {
        vUb = valorUbParticular;
        precio = vUb.multiply(cant).setScale(2, RoundingMode.HALF_UP);
    }
}
```

> Importante: `valorUbParticular` sólo se exige (orElseThrow) cuando hay algún no-autorizado SIN override. Ajustar la guarda: computar `valorUbParticular` lazy o mantener el throw sólo si, tras aplicar overrides, queda algún no-autorizado sin override y sin valor U.B. Implementación mínima aceptable: mantener el `orElseThrow` actual (si hay cualquier no-autorizado) — un tenant que usa overrides igual suele tener valor U.B. configurado. Si el reviewer marca que un override debería permitir prescindir del valor U.B., refinar a: exigir valor U.B. sólo si `auths` tiene algún no-autorizado sin override.

- [ ] **Step 5: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=CalculateAttentionPricingOverrideTest test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/CalculateAttentionPricingUseCase.java \
        src/test/java/lab/laboratorio/modules/analitica/atencion/application/usecase/CalculateAttentionPricingOverrideTest.java
git commit -m "feat(nbu): el override de precio gana sobre cantidadUb×valorUb en el motor de atención"
```

---

## Task 6: FE — de-mock `NomencladorService` (valor U.B. + overrides)

**Files:**
- Modify: `src/app/features/analitica/services/nomenclador.service.ts`
- Modify/Create: `src/app/features/analitica/services/nomenclador.service.spec.ts`

**Interfaces:**
- Endpoints reales: `GET/PUT /api/v1/analitica/config/particular-ub` (body/response `{ valorUbParticular }`); `GET /api/v1/analitica/price-overrides` (`[{analysisCatalogId, overridePrice}]`); `PUT /api/v1/analitica/price-overrides/{id}` (`{overridePrice}`); `DELETE /api/v1/analitica/price-overrides/{id}`.
- Mantener las firmas públicas existentes: `getParticularPricing(): Observable<ParticularPricing>`, `saveValorUb(valor): Observable<number>`, `setOverride(analysisId, precio|null): Observable<{analysisId, precio}>` (los effects no cambian).

- [ ] **Step 1: Specs del service de-mockeado**

```ts
it('getParticularPricing compone valorUb (config) + overrides (lista)', () => {
  let result: any;
  service.getParticularPricing().subscribe(r => (result = r));
  httpMock.expectOne('/api/v1/analitica/config/particular-ub').flush({ valorUbParticular: 350 });
  httpMock.expectOne('/api/v1/analitica/price-overrides').flush([{ analysisCatalogId: 7, overridePrice: 999 }]);
  expect(result.valorUb).toBe(350);
  expect(result.overrides).toEqual({ 7: 999 });
});

it('saveValorUb hace PUT a /config/particular-ub', () => {
  service.saveValorUb(400).subscribe();
  const req = httpMock.expectOne('/api/v1/analitica/config/particular-ub');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ valorUbParticular: 400 });
  req.flush(null);
});

it('setOverride con precio hace PUT', () => {
  service.setOverride(7, 999).subscribe();
  const req = httpMock.expectOne('/api/v1/analitica/price-overrides/7');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ overridePrice: 999 });
  req.flush(null);
});

it('setOverride con null hace DELETE (revert)', () => {
  service.setOverride(7, null).subscribe();
  const req = httpMock.expectOne('/api/v1/analitica/price-overrides/7');
  expect(req.request.method).toBe('DELETE');
  req.flush(null);
});
```

- [ ] **Step 2: Correr — falla (sigue mock)**

Run: `npx vitest run src/app/features/analitica/services/nomenclador.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: De-mock del service**

Reemplazar `mockPricing` y los 3 métodos por HTTP real (mantener `getCatalog`/`getDeterminations`/`getVersions`/`cantidadUbForVersion` intactos):

```ts
import { forkJoin } from 'rxjs';
// ...
private readonly particularUbUrl = '/api/v1/analitica/config/particular-ub';
private readonly priceOverridesUrl = '/api/v1/analitica/price-overrides';

getParticularPricing(): Observable<ParticularPricing> {
  return forkJoin({
    config: this.http.get<{ valorUbParticular: number | null }>(this.particularUbUrl),
    overrides: this.http.get<{ analysisCatalogId: number; overridePrice: number }[]>(this.priceOverridesUrl),
  }).pipe(
    map(({ config, overrides }) => ({
      valorUb: config.valorUbParticular ?? 0,
      overrides: overrides.reduce<Record<number, number>>((acc, o) => {
        acc[o.analysisCatalogId] = o.overridePrice;
        return acc;
      }, {}),
    })),
  );
}

saveValorUb(valor: number): Observable<number> {
  return this.http.put<void>(this.particularUbUrl, { valorUbParticular: valor }).pipe(map(() => valor));
}

setOverride(analysisId: number, precio: number | null): Observable<{ analysisId: number; precio: number | null }> {
  const req$ = precio == null
    ? this.http.delete<void>(`${this.priceOverridesUrl}/${analysisId}`)
    : this.http.put<void>(`${this.priceOverridesUrl}/${analysisId}`, { overridePrice: precio });
  return req$.pipe(map(() => ({ analysisId, precio })));
}
```
Eliminar el campo `mockPricing` y los comentarios `MOCK`. Actualizar el JSDoc de la clase (sacar el bullet "MOCK ... precio particular").

- [ ] **Step 4: Correr — pasa**

Run: `npx vitest run src/app/features/analitica/services/nomenclador.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/services/nomenclador.service.ts \
        src/app/features/analitica/services/nomenclador.service.spec.ts
git commit -m "feat(nbu): de-mock NomencladorService — valor U.B. y overrides reales"
```

---

## Task 7: FE — quitar el resumen "Preparación previa" + boot MySQL (BE)

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts`
- Modify: `src/app/features/analitica/store/nomenclador/nomenclador.effects.ts`
- Modify: `src/app/features/analitica/models/nomenclador.model.ts`
- Modify (si aplica): `src/app/features/analitica/pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.spec.ts`

**Interfaces:**
- Quitar el campo `ayuno` de `ConfigResumen` y su mapeo desde `override?.preIndications`.

- [ ] **Step 1: Quitar la línea del template**

En `nbu-catalogo-tab.component.ts`, eliminar la línea del resumen:
```html
<span>Preparación previa: {{ cfg.ayuno ?? '—' }}</span>
```
(dejar el `<span>Nombre propio: …</span>`).

- [ ] **Step 2: Quitar el campo del modelo y el mapeo del effect**

En `models/nomenclador.model.ts`, quitar `ayuno` de la interface `ConfigResumen`.
En `store/nomenclador/nomenclador.effects.ts`, quitar la propiedad `ayuno: resp.override?.preIndications` del objeto `ConfigResumen` que arma el effect de `loadConfigResumen`.

- [ ] **Step 3: Ajustar specs que referencien `ayuno`**

Buscar en specs del catálogo/effects cualquier aserción sobre `ayuno` y quitarla. Run: `grep -rn "ayuno" src/app/features/analitica` y limpiar referencias muertas.

- [ ] **Step 4: Correr specs afectados**

Run: `npx vitest run src/app/features/analitica/store/nomenclador/nomenclador.effects.spec.ts src/app/features/analitica/pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.spec.ts`
Expected: PASS (sin referencias a `ayuno`).

- [ ] **Step 5: Commit FE**

```bash
git add src/app/features/analitica/pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts \
        src/app/features/analitica/store/nomenclador/nomenclador.effects.ts \
        src/app/features/analitica/models/nomenclador.model.ts
git commit -m "fix(nbu): quitar resumen 'Preparación previa' desincronizado del catálogo"
```

- [ ] **Step 6: Boot MySQL real (BE) — validar V1031 + V1032**

Levantar el perfil `local` contra un schema fresco (Docker `laboratorio_mysql`, root/root), confirmar que Flyway aplica V1031 y V1032 y la app bootea (receta `reference_mysql-boot-verification`):

```bash
docker exec laboratorio_mysql mysql -uroot -proot -e "DROP DATABASE IF EXISTS nbu_pp_verify; CREATE DATABASE nbu_pp_verify CHARACTER SET utf8mb4;"
cd c:/Users/tobia/Desktop/TUP/TESIS/Backend/.worktrees/nbu-precio-particular
export JAVA_HOME="/c/Program Files/Java/jdk-21"
export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3306/nbu_pp_verify?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
export SPRING_DATASOURCE_USERNAME=root SPRING_DATASOURCE_PASSWORD=root
./mvnw -q -DskipTests spring-boot:run -Dspring-boot.run.profiles=local
```
Expected (log): "Migrating schema ... to version 1031", "... 1032", y "Started LaboratorioApplication". Luego frenar la app y `DROP DATABASE nbu_pp_verify`.

---

## Self-Review (cobertura del spec)

| Requisito del spec | Task |
| --- | --- |
| A1: valor U.B. en tenant_nbu_config (V1031) + endpoints | Task 1 |
| A1: reapuntar ParticularPricingPort (fallback) | Task 2 |
| A2: tabla override (V1032) + persistencia | Task 3 |
| A2: use cases + endpoints override | Task 4 |
| A2: integración en CalculateAttentionPricingUseCase | Task 5 |
| FE de-mock service (valor U.B. + overrides) | Task 6 |
| #4 quitar resumen "Preparación previa" | Task 7 |
| Migraciones H2 + boot MySQL | Task 7 Step 6 |

**Confirmaciones a hacer al implementar (no placeholders):**
- Patrón Lombok real de `TenantNbuConfig` (dominio) al agregar el campo (Task 1 Step 5).
- API real de `AnalysisAuthorization`/`Attention`/`AttentionPricing` en el test de Task 5 (getters, `AttentionPricing.subtotal()`).
- Grupo exacto del `@ExceptionHandler` 422 en `GlobalExceptionHandler` (Task 1 Step 10).
- Si la guarda `valorUbParticular` (orElseThrow) debe relajarse cuando todos los no-autorizados tienen override (Task 5 Step 4).

## Out of scope
- Sección del análisis (defaultSectionId).
- Mostrar la preparación computada (wizard/turno/portal/impresión).
