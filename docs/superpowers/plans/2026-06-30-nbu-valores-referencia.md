# NBU: congruencia de valores de referencia + cualitativos/semicuant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar task-by-task. Los steps usan checkbox (`- [ ]`).
>
> **Spec:** `docs/superpowers/specs/2026-06-30-nbu-valores-referencia-congruencia-cualitativos-design.md`
> **Jira:** [KAN-158](https://exequielsantoro.atlassian.net/browse/KAN-158)

**Goal:** Validar congruencia (no solapar sexo+edad) en los valores de referencia de NBU y soportar valores cualitativos/semicuantitativos por categorías configurables (globales + del tenant).

**Architecture:** Hexagonal. Núcleo: un validador de dominio puro `ReferenceValueCongruenceValidator` (TDD exhaustivo). Categorías cualitativas como tablas nuevas (globales + tenant). Extensiones al override de determinación (tipo+categoría) y a `tenant_reference_values` (valor cualitativo). FE: drawer con validación cross-fila y editor cualitativo.

**Tech Stack:** Java 21, Spring Boot, JPA, Flyway, MySQL+H2, JUnit5+Mockito+AssertJ. Angular 21 standalone+signals, PrimeNG, Vitest.

## Global Constraints

- **Flyway: lane NBU, usar SOLO V1033, V1034, V1035** (V1030 KAN-142, V1031/V1032 KAN-154). Un solo `ADD COLUMN` por ALTER (H2+MySQL), sin generated columns. Revisar `db/migration-local` (solo seeds → no replicar).
- **JDK 21** BE: `export JAVA_HOME="/c/Program Files/Java/jdk-21"` antes de `./mvnw`.
- **Tests BE = Mockito/unit puros** (NO `@SpringBootTest`: contexto roto en H2 por migración pre-existente ajena V1028). La migración se valida por **boot MySQL real** (última task).
- **Congruencia = prohibir TODO solapamiento** de (sexo, edad). Sexo `null`=ambos (solapa M y F); edad `null` → min=0 / max=+∞; solape inclusivo `a1≤b2 ∧ a2≤b1`; además `ageMin ≤ ageMax`.
- **Errores español sin leak** vía subclases de `lab.laboratorio.domain.exception.DomainException` (NO `IllegalArgumentException`), registradas en `GlobalExceptionHandler` (grupo 422 `handleUnprocessableResultados`).
- **Tenant isolation:** categorías propias por `tenant_id`; globales `tenant_id` NULL (solo lectura para el tenant). `tenant_reference_values` sigue siendo plain table hard-delete (NO `BaseJpaEntity`).
- **Nunca IDs en formularios** (FE elige por label; el id se deriva). Sin emojis Unicode (PrimeIcons).
- `Gender` = `lab.laboratorio.modules.analitica.domain.model.Gender` (MALE, FEMALE; null = ambos).

---

## File Structure

**BE — `modules/analitica/resultados`:**
- `domain/model/ReferenceSegment.java` (create) — record (gender, ageMinMonths, ageMaxMonths).
- `domain/service/ReferenceValueCongruenceValidator.java` (create) — validador puro.
- `domain/exception/ReferenceValueRangeConflictException.java`, `InvalidQualitativeReferenceException.java`, `InvalidQualitativeCategoryException.java` (create).
- `domain/model/QualitativeCategory.java`, `QualitativeCategoryValue.java` (create).
- `domain/port/QualitativeCategoryRepositoryPort.java` (create).
- `application/usecase/qualitative/{ListQualitativeCategoriesUseCase,CreateQualitativeCategoryUseCase}.java` (create).
- `application/usecase/override/UpsertTenantReferenceValueOverrideUseCase.java` (modify — validar congruencia + cualitativo).
- `infrastructure/persistence/entity/{QualitativeCategoryJpaEntity,QualitativeCategoryValueJpaEntity}.java` + repos + adapter (create).
- `infrastructure/persistence/entity/TenantReferenceValueJpaEntity.java` (modify: + qualitative_value_id).
- `domain/model/TenantReferenceValue.java` (modify: + qualitativeValueId), DTOs request/response (modify).
- `presentation/QualitativeCategoryController.java` + DTOs (create); `TenantDeterminationOverrideController.java` (modify: campos cualitativos).
- `src/main/resources/db/migration/V1033__create_qualitative_categories.sql`, `V1034__add_qualitative_category_to_override.sql`, `V1035__add_qualitative_value_to_reference_values.sql` (create).
- `presentation/error/GlobalExceptionHandler.java` (modify: 3 excepciones nuevas → 422).
- `TenantDeterminationOverride` (domain) + JpaEntity + Upsert use case + DTO (modify: + qualitativeCategoryId).

**FE — `features/analitica`:**
- `services/nbu-config-api.service.ts` (modify) + spec.
- `pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts` (modify) + spec.
- `models/nomenclador.model.ts` si hace falta un tipo nuevo.

---

## Task 1: Validador de congruencia (dominio puro) — TDD exhaustivo

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/ReferenceSegment.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/ReferenceValueRangeConflictException.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/service/ReferenceValueCongruenceValidator.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/resultados/domain/service/ReferenceValueCongruenceValidatorTest.java`

**Interfaces:**
- Produces: `ReferenceSegment(Gender gender, Integer ageMinMonths, Integer ageMaxMonths)`.
- Produces: `ReferenceValueCongruenceValidator.validate(List<ReferenceSegment> segments)` → lanza `ReferenceValueRangeConflictException` (DomainException) si hay solape o `ageMin>ageMax`. Stateless (sin Spring).

- [ ] **Step 1: Test exhaustivo (matriz de congruencia)**

```java
package lab.laboratorio.modules.analitica.resultados.domain.service;

import lab.laboratorio.modules.analitica.domain.model.Gender;
import lab.laboratorio.modules.analitica.resultados.domain.exception.ReferenceValueRangeConflictException;
import lab.laboratorio.modules.analitica.resultados.domain.model.ReferenceSegment;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class ReferenceValueCongruenceValidatorTest {

    private final ReferenceValueCongruenceValidator validator = new ReferenceValueCongruenceValidator();

    private ReferenceSegment seg(Gender g, Integer min, Integer max) {
        return new ReferenceSegment(g, min, max);
    }

    @Test
    void emptyOrSingle_ok() {
        assertThatCode(() -> validator.validate(List.of())).doesNotThrowAnyException();
        assertThatCode(() -> validator.validate(List.of(seg(Gender.MALE, 0, 11)))).doesNotThrowAnyException();
    }

    @Test
    void adjacentAgesSameGender_ok() {
        // 0-11 y 12-35 NO se pisan (inclusivo, adyacentes)
        assertThatCode(() -> validator.validate(List.of(
                seg(Gender.MALE, 0, 11), seg(Gender.MALE, 12, 35)))).doesNotThrowAnyException();
    }

    @Test
    void overlappingAgesSameGender_throws() {
        assertThatThrownBy(() -> validator.validate(List.of(
                seg(Gender.MALE, 0, 30), seg(Gender.MALE, 20, 40))))
                .isInstanceOf(ReferenceValueRangeConflictException.class)
                .satisfies(e -> assertThat(e.getMessage()).doesNotContain("lab.laboratorio."))
                .satisfies(e -> assertThat(e.getMessage()).containsIgnoringCase("Masculino"));
    }

    @Test
    void differentGenders_neverOverlap() {
        assertThatCode(() -> validator.validate(List.of(
                seg(Gender.MALE, 0, 100), seg(Gender.FEMALE, 0, 100)))).doesNotThrowAnyException();
    }

    @Test
    void nullGenderOverlapsSpecific_throws() {
        // null = ambos → pisa a MALE
        assertThatThrownBy(() -> validator.validate(List.of(
                seg(null, 0, 100), seg(Gender.MALE, 10, 20))))
                .isInstanceOf(ReferenceValueRangeConflictException.class);
    }

    @Test
    void openEndedMax_overlaps() {
        // [12, +inf) pisa [200, 240]
        assertThatThrownBy(() -> validator.validate(List.of(
                seg(Gender.MALE, 12, null), seg(Gender.MALE, 200, 240))))
                .isInstanceOf(ReferenceValueRangeConflictException.class);
    }

    @Test
    void openEndedMin_overlaps() {
        // (-inf=0, 11] pisa [0, 5]
        assertThatThrownBy(() -> validator.validate(List.of(
                seg(Gender.MALE, null, 11), seg(Gender.MALE, 0, 5))))
                .isInstanceOf(ReferenceValueRangeConflictException.class);
    }

    @Test
    void identicalRows_throws() {
        assertThatThrownBy(() -> validator.validate(List.of(
                seg(Gender.MALE, 0, 11), seg(Gender.MALE, 0, 11))))
                .isInstanceOf(ReferenceValueRangeConflictException.class);
    }

    @Test
    void ageMinGreaterThanMax_throws() {
        assertThatThrownBy(() -> validator.validate(List.of(seg(Gender.MALE, 50, 10))))
                .isInstanceOf(ReferenceValueRangeConflictException.class)
                .satisfies(e -> assertThat(e.getMessage()).containsIgnoringCase("edad"));
    }

    @Test
    void manyAdjacentPediatricBands_ok() {
        // calca el informe real (creatinina): bandas etarias contiguas
        assertThatCode(() -> validator.validate(List.of(
                seg(null, 0, 2), seg(null, 3, 35), seg(null, 36, 59),
                seg(null, 60, 83), seg(null, 84, 107), seg(Gender.MALE, 180, null),
                seg(Gender.FEMALE, 180, null)))).doesNotThrowAnyException();
    }
}
```

- [ ] **Step 2: Correr — falla (clases inexistentes)**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=ReferenceValueCongruenceValidatorTest test`
Expected: FAIL (no compila).

- [ ] **Step 3: Crear `ReferenceSegment`**

```java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lab.laboratorio.modules.analitica.domain.model.Gender;

/** Segmento de aplicabilidad de un valor de referencia: sexo + rango etario (meses). null = abierto. */
public record ReferenceSegment(Gender gender, Integer ageMinMonths, Integer ageMaxMonths) {}
```

- [ ] **Step 4: Crear la excepción**

```java
package lab.laboratorio.modules.analitica.resultados.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class ReferenceValueRangeConflictException extends DomainException {
    public ReferenceValueRangeConflictException(String message) {
        super(message);
    }
}
```

- [ ] **Step 5: Implementar el validador**

```java
package lab.laboratorio.modules.analitica.resultados.domain.service;

import lab.laboratorio.modules.analitica.domain.model.Gender;
import lab.laboratorio.modules.analitica.resultados.domain.exception.ReferenceValueRangeConflictException;
import lab.laboratorio.modules.analitica.resultados.domain.model.ReferenceSegment;

import java.util.List;

/**
 * Valida que los valores de referencia de una determinación sean congruentes: ningún par de
 * segmentos (sexo, edad) puede solaparse, y en cada fila ageMin <= ageMax.
 * Servicio de dominio puro (sin Spring/JPA).
 */
public class ReferenceValueCongruenceValidator {

    public void validate(List<ReferenceSegment> segments) {
        for (ReferenceSegment s : segments) {
            if (s.ageMinMonths() != null && s.ageMaxMonths() != null
                    && s.ageMinMonths() > s.ageMaxMonths()) {
                throw new ReferenceValueRangeConflictException(
                        "La edad mínima no puede ser mayor a la edad máxima.");
            }
        }
        for (int i = 0; i < segments.size(); i++) {
            for (int j = i + 1; j < segments.size(); j++) {
                ReferenceSegment a = segments.get(i);
                ReferenceSegment b = segments.get(j);
                if (gendersOverlap(a.gender(), b.gender()) && agesOverlap(a, b)) {
                    throw new ReferenceValueRangeConflictException(
                            "Hay rangos de edad superpuestos para el sexo " + genderLabel(commonGender(a.gender(), b.gender())) + ".");
                }
            }
        }
    }

    private static boolean gendersOverlap(Gender a, Gender b) {
        return a == null || b == null || a == b;
    }

    private static boolean agesOverlap(ReferenceSegment a, ReferenceSegment b) {
        long lo1 = a.ageMinMonths() == null ? 0 : a.ageMinMonths();
        long hi1 = a.ageMaxMonths() == null ? Long.MAX_VALUE : a.ageMaxMonths();
        long lo2 = b.ageMinMonths() == null ? 0 : b.ageMinMonths();
        long hi2 = b.ageMaxMonths() == null ? Long.MAX_VALUE : b.ageMaxMonths();
        return lo1 <= hi2 && lo2 <= hi1;
    }

    /** El sexo a reportar: el específico si uno es null, o el común. */
    private static Gender commonGender(Gender a, Gender b) {
        return a != null ? a : b;
    }

    private static String genderLabel(Gender g) {
        if (g == Gender.MALE) return "Masculino";
        if (g == Gender.FEMALE) return "Femenino";
        return "Ambos";
    }
}
```

- [ ] **Step 6: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=ReferenceValueCongruenceValidatorTest test`
Expected: PASS (10 tests verdes).

- [ ] **Step 7: Registrar la excepción en `GlobalExceptionHandler` (422)**

En `src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java`, agregar `ReferenceValueRangeConflictException.class` al `@ExceptionHandler({...})` que devuelve `UNPROCESSABLE_ENTITY` (grupo `handleUnprocessableResultados`) e importar la clase.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/ReferenceSegment.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/ReferenceValueRangeConflictException.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/service/ReferenceValueCongruenceValidator.java \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/domain/service/ReferenceValueCongruenceValidatorTest.java
git commit -m "feat(nbu): validador de congruencia de valores de referencia (dominio puro)"
```

---

## Task 2: Integrar la congruencia en el upsert de reference-values (BE)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCase.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCaseTest.java`

**Interfaces:**
- Consumes: `ReferenceValueCongruenceValidator` (Task 1), `ReferenceSegment`.
- El use case valida congruencia ANTES de delete+insert; si falla, lanza `ReferenceValueRangeConflictException` y no persiste.

- [ ] **Step 1: Test (set incongruente → excepción, no persiste; set válido → persiste)**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.override;

import lab.laboratorio.modules.analitica.domain.model.Gender;
import lab.laboratorio.modules.analitica.resultados.domain.exception.ReferenceValueRangeConflictException;
import lab.laboratorio.modules.analitica.resultados.domain.port.TenantReferenceValueRepositoryPort;
import lab.laboratorio.modules.analitica.resultados.domain.service.ReferenceValueCongruenceValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpsertTenantReferenceValueOverrideUseCaseTest {

    @Mock TenantReferenceValueRepositoryPort repository;
    @Spy ReferenceValueCongruenceValidator congruenceValidator = new ReferenceValueCongruenceValidator();
    @InjectMocks UpsertTenantReferenceValueOverrideUseCase useCase;

    private UpsertTenantReferenceValueOverrideUseCase.ReferenceValueInput num(Gender g, Integer min, Integer max) {
        return new UpsertTenantReferenceValueOverrideUseCase.ReferenceValueInput(
                null, null, null, null, min, max, g, null, null, null);
    }

    @Test
    void execute_overlapping_throwsAndDoesNotPersist() {
        var input = new UpsertTenantReferenceValueOverrideUseCase.Input(1L, 10L, List.of(
                num(Gender.MALE, 0, 30), num(Gender.MALE, 20, 40)));
        assertThatThrownBy(() -> useCase.execute(input))
                .isInstanceOf(ReferenceValueRangeConflictException.class);
        verify(repository, never()).deleteAllByDeterminationCatalogIdAndTenantId(any(), any());
        verify(repository, never()).saveAll(any());
    }

    @Test
    void execute_valid_persists() {
        var input = new UpsertTenantReferenceValueOverrideUseCase.Input(1L, 10L, List.of(
                num(Gender.MALE, 0, 11), num(Gender.MALE, 12, 35)));
        when(repository.saveAll(any())).thenReturn(List.of());
        useCase.execute(input);
        verify(repository).deleteAllByDeterminationCatalogIdAndTenantId(1L, 10L);
        verify(repository).saveAll(any());
    }
}
```

> Nota: la firma de `ReferenceValueInput` suma `qualitativeValueId` (último parámetro) en la Task 6; este test usa el constructor que exista al correr. Si Task 6 ya está hecha, agregá el `null` final del `qualitativeValueId`.

- [ ] **Step 2: Correr — falla**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantReferenceValueOverrideUseCaseTest test`
Expected: FAIL (no se inyecta el validador todavía).

- [ ] **Step 3: Inyectar y llamar el validador**

En `UpsertTenantReferenceValueOverrideUseCase`:
- Agregar `import` de `ReferenceValueCongruenceValidator`, `ReferenceSegment`.
- Agregar campo `private final ReferenceValueCongruenceValidator congruenceValidator;` (lo provee Spring — registrar el validador como `@Component` o crear un `@Bean`; ver abajo).
- Al inicio de `execute(...)`, antes del delete:

```java
congruenceValidator.validate(input.values().stream()
        .map(v -> new ReferenceSegment(v.gender(), v.ageMinMonths(), v.ageMaxMonths()))
        .toList());
```

Para que Spring lo inyecte: anotar `ReferenceValueCongruenceValidator` con `@org.springframework.stereotype.Component` (es dominio puro pero sin dependencias; aceptable) **o** declarar un `@Bean` en una `@Configuration` del módulo. Elegir lo que matchee el patrón del repo (si hay `@Component` en otros validadores de dominio, usar eso).

- [ ] **Step 4: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantReferenceValueOverrideUseCaseTest test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/service/ReferenceValueCongruenceValidator.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCaseTest.java
git commit -m "feat(nbu): el upsert de reference-values valida congruencia antes de persistir"
```

---

## Task 3: Categorías cualitativas — tablas, modelo, persistencia, seed (BE)

**Files:**
- Create: `src/main/resources/db/migration/V1033__create_qualitative_categories.sql`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/QualitativeCategory.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/QualitativeCategoryValue.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/resultados/domain/port/QualitativeCategoryRepositoryPort.java`
- Create: entity `QualitativeCategoryJpaEntity`, `QualitativeCategoryValueJpaEntity`; repos; adapter `QualitativeCategoryRepositoryAdapter`.

**Interfaces:**
- Produces: `QualitativeCategory(Long id, Long tenantId, String name, boolean ordinal, List<QualitativeCategoryValue> values)`; `QualitativeCategoryValue(Long id, Long categoryId, String label, int displayOrder)`.
- Produces: `QualitativeCategoryRepositoryPort`:
  - `List<QualitativeCategory> findVisibleForTenant(Long tenantId)` (globales `tenant_id IS NULL` + propias)
  - `QualitativeCategory save(QualitativeCategory category)` (crea categoría tenant + sus valores)
  - `Optional<QualitativeCategory> findByIdVisibleForTenant(Long id, Long tenantId)`

- [ ] **Step 1: Migración V1033 (2 tablas + seed global)**

```sql
-- V1033: categorías cualitativas (globales tenant_id NULL + propias del tenant) y sus valores.
CREATE TABLE qualitative_category (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    tenant_id   BIGINT       NULL,           -- NULL = curada global
    name        VARCHAR(120) NOT NULL,
    ordinal     BOOLEAN      NOT NULL DEFAULT FALSE,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,
    created_by  VARCHAR(120) NOT NULL,
    updated_by  VARCHAR(120) NOT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE qualitative_category_value (
    id            BIGINT      NOT NULL AUTO_INCREMENT,
    category_id   BIGINT      NOT NULL,
    label         VARCHAR(80) NOT NULL,
    display_order INT         NOT NULL,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    CONSTRAINT fk_qual_value_category FOREIGN KEY (category_id) REFERENCES qualitative_category (id),
    CONSTRAINT uq_qual_value UNIQUE (category_id, label)
);

-- Seed de categorías curadas globales (tenant_id NULL).
INSERT INTO qualitative_category (tenant_id, name, ordinal, active, created_at, updated_at, created_by, updated_by) VALUES
 (NULL, 'Presencia', FALSE, TRUE, NOW(6), NOW(6), 'system', 'system'),
 (NULL, 'Serología', FALSE, TRUE, NOW(6), NOW(6), 'system', 'system'),
 (NULL, 'Reactividad', FALSE, TRUE, NOW(6), NOW(6), 'system', 'system'),
 (NULL, 'Aspecto', FALSE, TRUE, NOW(6), NOW(6), 'system', 'system'),
 (NULL, 'Abundancia', TRUE, TRUE, NOW(6), NOW(6), 'system', 'system'),
 (NULL, 'Cruces', TRUE, TRUE, NOW(6), NOW(6), 'system', 'system');

INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'NO CONTIENE', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Presencia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'TRAZAS', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Presencia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'CONTIENE', 2, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Presencia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'POSITIVO', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Serología';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'NEGATIVO', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Serología';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'REACTIVO', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Reactividad';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'NO REACTIVO', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Reactividad';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'LÍMPIDA', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Aspecto';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'LIGERAMENTE TURBIA', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Aspecto';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'TURBIA', 2, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Aspecto';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'NO SE OBSERVAN', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Abundancia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'ESCASOS', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Abundancia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'ALGUNOS', 2, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Abundancia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'ABUNDANTES', 3, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Abundancia';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, 'NEGATIVO', 0, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Cruces';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, '+', 1, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Cruces';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, '++', 2, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Cruces';
INSERT INTO qualitative_category_value (category_id, label, display_order, active)
 SELECT id, '+++', 3, TRUE FROM qualitative_category WHERE tenant_id IS NULL AND name='Cruces';
```

> Verificá que `NOW(6)` y los `INSERT ... SELECT` corran en H2 (modo MySQL del proyecto) al bootear tests; si H2 rechaza algo, usá `CURRENT_TIMESTAMP(6)`.

- [ ] **Step 2: Modelos de dominio**

```java
// QualitativeCategoryValue.java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lombok.*;

@Getter @Builder @NoArgsConstructor @AllArgsConstructor
public class QualitativeCategoryValue {
    private Long id;
    private Long categoryId;
    private String label;
    private int displayOrder;
}
```
```java
// QualitativeCategory.java
package lab.laboratorio.modules.analitica.resultados.domain.model;

import lombok.*;
import java.util.List;

@Getter @Builder @NoArgsConstructor @AllArgsConstructor
public class QualitativeCategory {
    private Long id;
    private Long tenantId;     // null = global
    private String name;
    private boolean ordinal;
    @Builder.Default
    private List<QualitativeCategoryValue> values = java.util.List.of();
}
```

- [ ] **Step 3: Puerto**

```java
package lab.laboratorio.modules.analitica.resultados.domain.port;

import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategory;
import java.util.List;
import java.util.Optional;

public interface QualitativeCategoryRepositoryPort {
    List<QualitativeCategory> findVisibleForTenant(Long tenantId);
    Optional<QualitativeCategory> findByIdVisibleForTenant(Long id, Long tenantId);
    QualitativeCategory save(QualitativeCategory category); // categoría tenant + valores
}
```

- [ ] **Step 4: Entidades JPA + repos + adapter**

Crear `QualitativeCategoryJpaEntity` (tabla `qualitative_category`, campos `tenantId` (nullable), `name`, `ordinal`, `active`, audit manual `createdAt/updatedAt/createdBy/updatedBy` — NO `BaseJpaEntity` porque `tenant_id` es nullable) y `QualitativeCategoryValueJpaEntity` (tabla `qualitative_category_value`). JpaRepositories Spring Data:
- `QualitativeCategoryJpaRepository`: `findByTenantIdIsNullOrTenantId(Long tenantId)`, `findByTenantIdIsNullAndId(...)`/`findByTenantIdAndId(...)`.
- `QualitativeCategoryValueJpaRepository`: `findByCategoryIdInOrderByDisplayOrder(Collection<Long> ids)`.
Adapter `QualitativeCategoryRepositoryAdapter` (`@Repository`): arma `QualitativeCategory` con sus `values` (carga los valores por categoría); `save` persiste la categoría con `tenantId` del input y luego sus valores. Seguir el patrón de un adapter existente del módulo (`TenantReferenceValueRepositoryAdapter`).

- [ ] **Step 5: Compilar**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=ReferenceValueCongruenceValidatorTest test`
Expected: PASS (compila el módulo con las clases nuevas; la migración aplica en el boot de tests si alguno levanta contexto — si V1028 lo bloquea, se valida en MySQL en la última task).

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V1033__create_qualitative_categories.sql \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/QualitativeCategory*.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/port/QualitativeCategoryRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/
git commit -m "feat(nbu): categorías cualitativas (tablas V1033 + persistencia + seed global)"
```

---

## Task 4: Categorías — use cases + endpoints (BE)

**Files:**
- Create: `application/usecase/qualitative/ListQualitativeCategoriesUseCase.java`, `CreateQualitativeCategoryUseCase.java`
- Create: `domain/exception/InvalidQualitativeCategoryException.java`
- Create: `presentation/QualitativeCategoryController.java` + DTOs `QualitativeCategoryResponse`, `CreateQualitativeCategoryRequest`
- Modify: `GlobalExceptionHandler.java` (registrar `InvalidQualitativeCategoryException` → 422)
- Test: `application/usecase/qualitative/CreateQualitativeCategoryUseCaseTest.java`

**Interfaces:**
- Consumes: `QualitativeCategoryRepositoryPort` (Task 3).
- Produces: `CreateQualitativeCategoryUseCase.execute(Long tenantId, String name, boolean ordinal, List<String> values): QualitativeCategory` (valida: name no vacío, ≥2 valores, labels no vacíos/únicos); `ListQualitativeCategoriesUseCase.execute(Long tenantId): List<QualitativeCategory>`.
- Endpoints: `GET /api/v1/analitica/qualitative-categories`, `POST /api/v1/analitica/qualitative-categories`.

- [ ] **Step 1: Test del Create (validaciones → 422; OK persiste tenant-scoped)**

```java
package lab.laboratorio.modules.analitica.resultados.application.usecase.qualitative;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidQualitativeCategoryException;
import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategory;
import lab.laboratorio.modules.analitica.resultados.domain.port.QualitativeCategoryRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreateQualitativeCategoryUseCaseTest {

    @Mock QualitativeCategoryRepositoryPort port;
    @InjectMocks CreateQualitativeCategoryUseCase useCase;

    @Test
    void create_valid_persistsTenantScoped() {
        when(port.save(any())).thenAnswer(i -> i.getArgument(0));
        useCase.execute(10L, "Color de orina", false, List.of("AMARILLO", "ÁMBAR", "ROJO"));
        verify(port).save(argThat(c -> c.getTenantId().equals(10L)
                && c.getName().equals("Color de orina") && c.getValues().size() == 3));
    }

    @Test
    void create_blankName_throws422() {
        assertThatThrownBy(() -> useCase.execute(10L, "  ", false, List.of("A", "B")))
                .isInstanceOf(InvalidQualitativeCategoryException.class);
        verify(port, never()).save(any());
    }

    @Test
    void create_lessThanTwoValues_throws422() {
        assertThatThrownBy(() -> useCase.execute(10L, "X", false, List.of("A")))
                .isInstanceOf(InvalidQualitativeCategoryException.class);
    }

    @Test
    void create_duplicateLabels_throws422() {
        assertThatThrownBy(() -> useCase.execute(10L, "X", false, List.of("A", "A")))
                .isInstanceOf(InvalidQualitativeCategoryException.class);
    }
}
```

- [ ] **Step 2: Correr — falla**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=CreateQualitativeCategoryUseCaseTest test`
Expected: FAIL.

- [ ] **Step 3: Excepción + use cases**

```java
// InvalidQualitativeCategoryException.java
package lab.laboratorio.modules.analitica.resultados.domain.exception;
import lab.laboratorio.domain.exception.DomainException;
public class InvalidQualitativeCategoryException extends DomainException {
    public InvalidQualitativeCategoryException(String message) { super(message); }
}
```
```java
// CreateQualitativeCategoryUseCase.java
package lab.laboratorio.modules.analitica.resultados.application.usecase.qualitative;

import lab.laboratorio.modules.analitica.resultados.domain.exception.InvalidQualitativeCategoryException;
import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategory;
import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategoryValue;
import lab.laboratorio.modules.analitica.resultados.domain.port.QualitativeCategoryRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class CreateQualitativeCategoryUseCase {

    private final QualitativeCategoryRepositoryPort port;

    public QualitativeCategory execute(Long tenantId, String name, boolean ordinal, List<String> values) {
        String n = name == null ? "" : name.trim();
        if (n.isEmpty()) {
            throw new InvalidQualitativeCategoryException("El nombre de la categoría es obligatorio.");
        }
        List<String> clean = (values == null ? List.<String>of() : values).stream()
                .map(v -> v == null ? "" : v.trim()).toList();
        if (clean.size() < 2 || clean.stream().anyMatch(String::isEmpty)) {
            throw new InvalidQualitativeCategoryException("La categoría necesita al menos dos valores no vacíos.");
        }
        Set<String> seen = new HashSet<>();
        List<QualitativeCategoryValue> vals = new ArrayList<>();
        int order = 0;
        for (String label : clean) {
            if (!seen.add(label.toUpperCase())) {
                throw new InvalidQualitativeCategoryException("Hay valores repetidos en la categoría: " + label);
            }
            vals.add(QualitativeCategoryValue.builder().label(label).displayOrder(order++).build());
        }
        return port.save(QualitativeCategory.builder()
                .tenantId(tenantId).name(n).ordinal(ordinal).values(vals).build());
    }
}
```
```java
// ListQualitativeCategoriesUseCase.java
package lab.laboratorio.modules.analitica.resultados.application.usecase.qualitative;

import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategory;
import lab.laboratorio.modules.analitica.resultados.domain.port.QualitativeCategoryRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListQualitativeCategoriesUseCase {
    private final QualitativeCategoryRepositoryPort port;
    public List<QualitativeCategory> execute(Long tenantId) { return port.findVisibleForTenant(tenantId); }
}
```

- [ ] **Step 4: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=CreateQualitativeCategoryUseCaseTest test`
Expected: PASS.

- [ ] **Step 5: DTOs + controller + registrar excepción**

```java
// CreateQualitativeCategoryRequest.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;
import java.util.List;
public record CreateQualitativeCategoryRequest(String name, boolean ordinal, List<String> values) {}
```
```java
// QualitativeCategoryResponse.java
package lab.laboratorio.modules.analitica.resultados.presentation.dto;
import java.util.List;
public record QualitativeCategoryResponse(Long id, String name, boolean ordinal, boolean global, List<Value> values) {
    public record Value(Long id, String label, int displayOrder) {}
}
```
```java
// QualitativeCategoryController.java
package lab.laboratorio.modules.analitica.resultados.presentation;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lab.laboratorio.infrastructure.tenancy.TenantContext;
import lab.laboratorio.modules.analitica.resultados.application.usecase.qualitative.CreateQualitativeCategoryUseCase;
import lab.laboratorio.modules.analitica.resultados.application.usecase.qualitative.ListQualitativeCategoriesUseCase;
import lab.laboratorio.modules.analitica.resultados.domain.model.QualitativeCategory;
import lab.laboratorio.modules.analitica.resultados.presentation.dto.CreateQualitativeCategoryRequest;
import lab.laboratorio.modules.analitica.resultados.presentation.dto.QualitativeCategoryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analitica/qualitative-categories")
@Tag(name = "Analítica - Categorías cualitativas")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class QualitativeCategoryController {

    private final ListQualitativeCategoriesUseCase listUseCase;
    private final CreateQualitativeCategoryUseCase createUseCase;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<QualitativeCategoryResponse>> list() {
        Long tenantId = TenantContext.requireTenantId();
        List<QualitativeCategoryResponse> body = listUseCase.execute(tenantId).stream()
                .map(this::toResponse).toList();
        return ResponseEntity.ok(body);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<QualitativeCategoryResponse> create(@RequestBody CreateQualitativeCategoryRequest req) {
        Long tenantId = TenantContext.requireTenantId();
        QualitativeCategory created = createUseCase.execute(tenantId, req.name(), req.ordinal(), req.values());
        return ResponseEntity.ok(toResponse(created));
    }

    private QualitativeCategoryResponse toResponse(QualitativeCategory c) {
        return new QualitativeCategoryResponse(c.getId(), c.getName(), c.isOrdinal(), c.getTenantId() == null,
                c.getValues().stream()
                        .map(v -> new QualitativeCategoryResponse.Value(v.getId(), v.getLabel(), v.getDisplayOrder()))
                        .toList());
    }
}
```
Registrar `InvalidQualitativeCategoryException.class` en el `@ExceptionHandler` 422 de `GlobalExceptionHandler`.

- [ ] **Step 6: Compilar y commitear**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=CreateQualitativeCategoryUseCaseTest test`
Expected: PASS.

```bash
git add src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/qualitative/ \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/InvalidQualitativeCategoryException.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/QualitativeCategoryController.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/QualitativeCategoryResponse.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/CreateQualitativeCategoryRequest.java \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/qualitative/CreateQualitativeCategoryUseCaseTest.java
git commit -m "feat(nbu): use cases y endpoints de categorías cualitativas"
```

---

## Task 5: Tipo + categoría en el override de determinación (BE)

**Files:**
- Create: `src/main/resources/db/migration/V1034__add_qualitative_category_to_override.sql`
- Modify: `domain/model/TenantDeterminationOverride.java` (+ `qualitativeCategoryId`)
- Modify: `infrastructure/persistence/entity/TenantDeterminationOverrideJpaEntity.java` (+ columna)
- Modify: `application/usecase/override/UpsertTenantDeterminationOverrideUseCase.java` (+ campo en Input + build)
- Modify: `presentation/dto/TenantDeterminationOverrideRequest.java` + `TenantDeterminationOverrideResponse.java` (+ `qualitativeCategoryId`)
- Modify: `presentation/TenantDeterminationOverrideController.java` (pasar el campo)

**Interfaces:**
- Produces: el override expone/persiste `qualitativeCategoryId` (Long, nullable). El `analyticalType` ya existe.

- [ ] **Step 1: Migración V1034**

```sql
-- V1034: categoría cualitativa asignada a la determinación (override por tenant).
ALTER TABLE tenant_determination_override ADD COLUMN qualitative_category_id BIGINT NULL;
```

- [ ] **Step 2: Agregar el campo en entidad, dominio, DTOs, use case y controller**

- `TenantDeterminationOverrideJpaEntity`: `@Column(name = "qualitative_category_id") private Long qualitativeCategoryId;`
- `TenantDeterminationOverride` (dominio): `private Long qualitativeCategoryId;`
- `TenantDeterminationOverrideRequest` y `...Response`: agregar `Long qualitativeCategoryId`.
- `UpsertTenantDeterminationOverrideUseCase.Input`: agregar `Long qualitativeCategoryId` (último parámetro) y setearlo en ambos builders (existing + new).
- `TenantDeterminationOverrideController.upsertOverride`: pasar `request.qualitativeCategoryId()` al `Input`; el `from(...)` del response debe incluirlo.

(Es un campo nullable agregado al patrón existente del override; replicar exactamente cómo se manejan los otros campos como `analyticalType`.)

- [ ] **Step 3: Compilar**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=ReferenceValueCongruenceValidatorTest test`
Expected: PASS (compila).

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/migration/V1034__add_qualitative_category_to_override.sql \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/TenantDeterminationOverride.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/persistence/entity/TenantDeterminationOverrideJpaEntity.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantDeterminationOverrideUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/TenantDeterminationOverrideRequest.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/dto/TenantDeterminationOverrideResponse.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/TenantDeterminationOverrideController.java
git commit -m "feat(nbu): categoría cualitativa asignada al override de determinación (V1034)"
```

---

## Task 6: Valor cualitativo en reference-values + validación de pertenencia (BE)

**Files:**
- Create: `src/main/resources/db/migration/V1035__add_qualitative_value_to_reference_values.sql`
- Modify: `domain/model/TenantReferenceValue.java` (+ `qualitativeValueId`)
- Modify: `infrastructure/persistence/entity/TenantReferenceValueJpaEntity.java` (+ columna)
- Modify: `application/usecase/override/UpsertTenantReferenceValueOverrideUseCase.java` (+ `qualitativeValueId` en Input + build; validar pertenencia)
- Modify: DTOs `TenantReferenceValueOverrideRequest` (+ `qualitativeValue`), `DeterminationReferenceValueResponse` (+ `qualitativeValueId`)
- Modify: `presentation/TenantDeterminationOverrideController.java` (mapear `qualitativeValue` → input)
- Create: `domain/exception/InvalidQualitativeReferenceException.java`
- Modify: `GlobalExceptionHandler.java` (registrar → 422)
- Test: extender `UpsertTenantReferenceValueOverrideUseCaseTest` (pertenencia)

**Interfaces:**
- Produces: `ReferenceValueInput` suma `Long qualitativeValueId` (último parámetro). El use case, si la determinación es cuali/semicuant (override con `qualitativeCategoryId`), valida que cada `qualitativeValueId` pertenezca a esa categoría → `InvalidQualitativeReferenceException`.

- [ ] **Step 1: Migración V1035**

```sql
-- V1035: valor cualitativo esperado/tope por segmento (override de reference-values por tenant).
ALTER TABLE tenant_reference_values ADD COLUMN qualitative_value_id BIGINT NULL;
```

- [ ] **Step 2: Test de pertenencia cualitativa (extiende el test de Task 2)**

Agregar al `UpsertTenantReferenceValueOverrideUseCaseTest`:

```java
@Test
void execute_qualitativeValueNotInCategory_throws422() {
    // override de la determinación tiene categoría X; el valor pasado no pertenece → 422
    when(overridePort.findByDeterminationCatalogIdAndTenantId(1L, 10L))
            .thenReturn(java.util.Optional.of(/* override con qualitativeCategoryId = 5 */ overrideWithCategory(5L)));
    when(categoryPort.findByIdVisibleForTenant(5L, 10L))
            .thenReturn(java.util.Optional.of(categoryWithValueIds(99L))); // categoría 5 sólo tiene value 99
    var input = new UpsertTenantReferenceValueOverrideUseCase.Input(1L, 10L, List.of(
            qual(Gender.MALE, 0, null, 1234L))); // 1234 no pertenece
    assertThatThrownBy(() -> useCase.execute(input))
            .isInstanceOf(InvalidQualitativeReferenceException.class);
    verify(repository, never()).saveAll(any());
}
```
(Definir helpers `overrideWithCategory`, `categoryWithValueIds`, `qual(...)` según las firmas reales; agregar los `@Mock` de `TenantDeterminationOverrideRepositoryPort overridePort` y `QualitativeCategoryRepositoryPort categoryPort`.)

- [ ] **Step 3: Correr — falla**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantReferenceValueOverrideUseCaseTest test`
Expected: FAIL.

- [ ] **Step 4: Implementar**

- `TenantReferenceValue`: + `private Long qualitativeValueId;`
- `TenantReferenceValueJpaEntity`: `@Column(name = "qualitative_value_id") private Long qualitativeValueId;` + mapear en adapter (save/read).
- `ReferenceValueInput` y `ReferenceValueItem` (DTO): + `Long qualitativeValueId` / `Long qualitativeValue` (en el DTO el FE manda el id del valor elegido).
- Crear `InvalidQualitativeReferenceException extends DomainException` y registrarla en el handler (422).
- En `UpsertTenantReferenceValueOverrideUseCase.execute`: inyectar `TenantDeterminationOverrideRepositoryPort` + `QualitativeCategoryRepositoryPort`. Tras la validación de congruencia: si el override de la determinación tiene `qualitativeCategoryId != null`, cargar la categoría y su set de value-ids; por cada value cuyo `qualitativeValueId != null`, verificar que pertenezca al set (si no → `InvalidQualitativeReferenceException("El valor de referencia no pertenece a la categoría seleccionada.")`). Luego setear `qualitativeValueId` en cada `TenantReferenceValue` del build.
- Controller: mapear `item.qualitativeValue()` → `ReferenceValueInput.qualitativeValueId`.

- [ ] **Step 5: Correr — pasa**

Run: `export JAVA_HOME="/c/Program Files/Java/jdk-21"; ./mvnw -q -Dtest=UpsertTenantReferenceValueOverrideUseCaseTest test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V1035__add_qualitative_value_to_reference_values.sql \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/model/TenantReferenceValue.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/domain/exception/InvalidQualitativeReferenceException.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/infrastructure/ \
        src/main/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/ \
        src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java \
        src/test/java/lab/laboratorio/modules/analitica/resultados/application/usecase/override/UpsertTenantReferenceValueOverrideUseCaseTest.java
git commit -m "feat(nbu): valor cualitativo en reference-values + validación de pertenencia (V1035)"
```

---

## Task 7: FE — service: categorías + campos cualitativos

**Files:**
- Modify: `src/app/features/analitica/services/nbu-config-api.service.ts`
- Modify: `src/app/features/analitica/services/nbu-config-api.service.spec.ts`

**Interfaces:**
- Endpoints: `GET/POST /api/v1/analitica/qualitative-categories`. `ReferenceValueItem` suma `qualitativeValue` (id). `DeterminationOverride` (interface FE) suma `qualitativeCategoryId`.
- Produces: `getQualitativeCategories(): Observable<QualitativeCategory[]>`, `createQualitativeCategory(name, ordinal, values): Observable<QualitativeCategory>`.

- [ ] **Step 1: Specs (URLs/method/body)**

```ts
it('getQualitativeCategories hace GET', () => {
  service.getQualitativeCategories().subscribe();
  const r = httpMock.expectOne('/api/v1/analitica/qualitative-categories');
  expect(r.request.method).toBe('GET'); r.flush([]);
});
it('createQualitativeCategory hace POST con name/ordinal/values', () => {
  service.createQualitativeCategory('Color de orina', false, ['AMARILLO','ÁMBAR']).subscribe();
  const r = httpMock.expectOne('/api/v1/analitica/qualitative-categories');
  expect(r.request.method).toBe('POST');
  expect(r.request.body).toEqual({ name: 'Color de orina', ordinal: false, values: ['AMARILLO','ÁMBAR'] });
  r.flush({});
});
```

- [ ] **Step 2: Correr — falla**

Run: `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Tipos + métodos**

```ts
export interface QualitativeCategoryValue { id: number; label: string; displayOrder: number; }
export interface QualitativeCategory { id: number; name: string; ordinal: boolean; global: boolean; values: QualitativeCategoryValue[]; }
```
```ts
private readonly qualCategoriesUrl = '/api/v1/analitica/qualitative-categories';

getQualitativeCategories(): Observable<QualitativeCategory[]> {
  return this.http.get<QualitativeCategory[]>(this.qualCategoriesUrl);
}
createQualitativeCategory(name: string, ordinal: boolean, values: string[]): Observable<QualitativeCategory> {
  return this.http.post<QualitativeCategory>(this.qualCategoriesUrl, { name, ordinal, values });
}
```
- En `ReferenceValueItem`: agregar `qualitativeValue: number | null;` (id del valor elegido).
- En `DeterminationOverride`: agregar `qualitativeCategoryId: number | null;`.

- [ ] **Step 4: Correr — pasa**

Run: `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/services/nbu-config-api.service.ts \
        src/app/features/analitica/services/nbu-config-api.service.spec.ts
git commit -m "feat(nbu): service de categorías cualitativas + campos cualitativos en reference-values"
```

---

## Task 8: FE — validación de congruencia cross-fila en el drawer (numérico)

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts`
- Modify: `.../nbu-config-drawer.component.spec.ts`

**Interfaces:**
- Reusa el `FormArray` de ref-values por determinación. Agrega detección de segmentos solapados (misma regla que el BE: sexo null=ambos; edad en meses, abierta si null; solape inclusivo) + `ageMin ≤ ageMax`.

- [ ] **Step 1: Spec (dos filas solapadas → guardar bloqueado)**

```ts
it('bloquea guardar si hay segmentos (sexo+edad) solapados', () => {
  const upsert = vi.spyOn(api, 'upsertReferenceValues');
  // armar un DetForm con dos filas: MALE 0-30 y MALE 20-40 (años) → solapan
  // (helper del spec según la estructura del DetForm/FormArray)
  // ... setear analysis + shortCode válido ...
  component['onSave']();
  expect(upsert).not.toHaveBeenCalled();
  // y se mostró un toast/marca de error de congruencia
});
```

- [ ] **Step 2: Correr — falla**

Run: `npx vitest run .../nbu-config-drawer.component.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar la validación cross-fila**

Agregar helpers (años→meses ya existen `yearsToMonths`):
```ts
private overlappingRefRows(det: DetForm): boolean {
  const rows = det.refValues.getRawValue() as Array<{ gender: 'MALE'|'FEMALE'|null; ageMinYears: number|null; ageMaxYears: number|null }>;
  const segs = rows.map(r => ({
    gender: r.gender,
    lo: r.ageMinYears == null ? 0 : Math.round(r.ageMinYears * 12),
    hi: r.ageMaxYears == null ? Number.MAX_SAFE_INTEGER : Math.round(r.ageMaxYears * 12),
  }));
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].lo > segs[i].hi) return true; // ageMin > ageMax
    for (let j = i + 1; j < segs.length; j++) {
      const g = segs[i].gender == null || segs[j].gender == null || segs[i].gender === segs[j].gender;
      const a = segs[i].lo <= segs[j].hi && segs[j].lo <= segs[i].hi;
      if (g && a) return true;
    }
  }
  return false;
}
private hasIncongruentRefValues(): boolean {
  return this.detForms.some(d => this.overlappingRefRows(d));
}
```
En `onSave`, junto a `hasInvalidRows()`, agregar:
```ts
if (this.hasIncongruentRefValues()) {
  this.messageService.add({ severity: 'warn', summary: 'Rangos superpuestos',
    detail: 'Hay valores de referencia con sexo y edad superpuestos. Revisá que cada combinación de sexo y edad tenga un solo rango.' });
  return;
}
```
Opcional: marcar las filas en conflicto reusando la clase `nbu-rv-row--invalid`.

- [ ] **Step 4: Correr — pasa**

Run: `npx vitest run .../nbu-config-drawer.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts \
        src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.spec.ts
git commit -m "feat(nbu): validación de congruencia cross-fila en el drawer (numérico)"
```

---

## Task 9: FE — selector de tipo + editor cualitativo/semicuant en el drawer

**Files:**
- Modify: `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts`
- Modify: `.../nbu-config-drawer.component.spec.ts`

**Interfaces:**
- Consume: `getQualitativeCategories`, `createQualitativeCategory` (Task 7); el override con `analyticalType` + `qualitativeCategoryId`; `ReferenceValueItem.qualitativeValue` (id).

- [ ] **Step 1: Spec (guardar cualitativo manda qualitativeValue + override con tipo y categoría)**

```ts
it('en modo cualitativo guarda el valor esperado por fila y el tipo+categoría en el override', () => {
  const upsertRef = vi.spyOn(api, 'upsertReferenceValues').mockReturnValue(of([] as any));
  const upsertOv = vi.spyOn(api, 'upsertOverride').mockReturnValue(of({} as any));
  // det con tipo QUALITATIVE, categoría elegida (id 5), una fila MALE adultos con valor esperado id 99
  // ... onSave ...
  expect(upsertOv).toHaveBeenCalled(); // con analyticalType:'QUALITATIVE', qualitativeCategoryId:5
  expect(upsertRef).toHaveBeenCalledWith(expect.any(Number),
    expect.arrayContaining([expect.objectContaining({ qualitativeValue: 99 })]));
});
```

- [ ] **Step 2: Correr — falla**

Run: `npx vitest run .../nbu-config-drawer.component.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

- Cargar categorías una vez (`getQualitativeCategories()`), signal `qualitativeCategories`.
- Extender `DetForm` con: `valueType: 'QUANTITATIVE'|'QUALITATIVE'|'SEMI_QUALITATIVE'` (inicial desde `override.analyticalType ?? 'QUANTITATIVE'`), `qualitativeCategoryId: number|null` (desde override), y para cada fila cualitativa un `qualitativeValue: number|null` (id) en lugar de min/max.
- Template: por determinación, **selector de tipo** (`p-select` con las 3 opciones). Si QUANTITATIVE → la tabla actual. Si QUALITATIVE/SEMI_QUALITATIVE → selector de **categoría** (con botón "+ nueva categoría" que abre un mini-form: nombre + valores + flag ordinal → `createQualitativeCategory` y refresca la lista) y, por fila (sexo, edad), un `p-select` con los **valores** de la categoría (label visible; value = id). Para ordinal el label de ayuda dice "normal hasta".
- `onSave`: si el tipo no es QUANTITATIVE, persistir el override con `analyticalType` = tipo y `qualitativeCategoryId`; y `upsertReferenceValues` con items que llevan `qualitativeValue` (id) + sexo/edad (sin min/max). La validación de congruencia (Task 8) aplica igual (usa solo sexo/edad).
- Errores en español, sin emojis, nunca IDs visibles.

- [ ] **Step 4: Correr — pasa**

Run: `npx vitest run .../nbu-config-drawer.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Suite analitica FE + commit**

Run (puntual, ng test global está roto por specs ajenos): `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts .../nbu-config-drawer.component.spec.ts`
Expected: verdes.

```bash
git add src/app/features/analitica/pages/nbu/nbu-config-drawer/
git commit -m "feat(nbu): selector de tipo + editor cualitativo/semicuant en el drawer"
```

---

## Task 10: Boot MySQL real (BE) — validar V1033/V1034/V1035 + seed

**Files:** ninguno (verificación).

- [ ] **Step 1: Boot perfil `local` contra schema fresco**

```bash
docker exec laboratorio_mysql mysql -uroot -proot -e "DROP DATABASE IF EXISTS nbu_vr_verify; CREATE DATABASE nbu_vr_verify CHARACTER SET utf8mb4;"
cd c:/Users/tobia/Desktop/TUP/TESIS/Backend/.worktrees/nbu-valores-referencia
export JAVA_HOME="/c/Program Files/Java/jdk-21"
export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3306/nbu_vr_verify?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
export SPRING_DATASOURCE_USERNAME=root SPRING_DATASOURCE_PASSWORD=root
./mvnw -q -DskipTests spring-boot:run -Dspring-boot.run.profiles=local
```
Expected (log): "Migrating schema ... to version 1033 / 1034 / 1035" y "Started LaboratorioApplication". Verificar el seed:
```bash
docker exec laboratorio_mysql mysql -uroot -proot -e "SELECT name,ordinal FROM nbu_vr_verify.qualitative_category WHERE tenant_id IS NULL;"
```
Expected: 6 categorías globales. Luego frenar la app y `DROP DATABASE nbu_vr_verify`.

---

## Self-Review (cobertura del spec)

| Requisito del spec | Task |
| --- | --- |
| Validador de congruencia (matriz) | Task 1 |
| Congruencia integrada en upsert (422) | Task 2 |
| Categorías (tablas + seed global + tenant) | Task 3 |
| Categorías: use cases + endpoints + 422 | Task 4 |
| Tipo + categoría en el override (V1034) | Task 5 |
| Valor cualitativo en reference-values + pertenencia (V1035) | Task 6 |
| FE service (categorías + campos cualitativos) | Task 7 |
| FE congruencia cross-fila (numérico) | Task 8 |
| FE selector de tipo + editor cualitativo/semicuant | Task 9 |
| Migraciones H2 + boot MySQL | Task 10 |

**Confirmaciones al implementar (no placeholders, sino verificaciones contra el repo):**
- Patrón real de adapter del módulo (`TenantReferenceValueRepositoryAdapter`) al escribir el adapter de categorías (Task 3).
- Cómo registra el repo los validadores de dominio como bean (`@Component` vs `@Bean`) (Task 2 Step 3).
- Firma exacta de `TenantDeterminationOverrideRequest/Response.from(...)` al sumar `qualitativeCategoryId` (Task 5).
- Estructura real del `DetForm`/template de ref-values en el drawer (heredado de KAN-142/154) al sumar tipo+editor (Tasks 8-9).
- H2 acepta el seed `INSERT ... SELECT` + `NOW(6)` (si no, `CURRENT_TIMESTAMP(6)`).

## Out of scope
- Conteo "(N–M x campo)" del semicuantitativo.
- Bandas interpretativas LDL (siguen como `referenceTemplate`).
- Usar estos valores en la carga de resultados.
- Multi-valor esperado por segmento.
