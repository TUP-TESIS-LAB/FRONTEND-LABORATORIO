# Validación — enriquecer listado de protocolos pendientes de firma (front + back) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-06-14-validacion-enriquecer-encabezado-y-analisis-design.md`

**Goal:** Que `GET /api/v1/analitica/postanalitica/studies` devuelva, por estudio y en una sola query por página, los campos que la fila del subtab Validación necesita (`protocolCode`, `patientName`, `patientSex`, `patientBirthDate`, `date`, `analysisCount`, `determinationCount`, `signedAnalysisCount`), y reemplazar el mock del front por un store ngrx clásico que consuma ese contrato.

**Architecture:** Cambio **aditivo** en dos repos con dependencia back→front. Backend (`Backend`, módulo `postanalitica`): proyección JPQL de solo lectura (`StudyListItem`) que joinea `patients` + `protocols` y resuelve `analysisCount`/`determinationCount` con subqueries correlacionadas (una query SQL por página, sin N+1 desde la app); `protocolCode` se deriva en un helper de dominio; `StudyResponse` se enriquece. Frontend (`FRONTEND-LABORATORIO`): nuevo slice ngrx `validacion-protocolos` + método en `PostanaliticaApiService`, y se reescribe la page para consumir el store (edad derivada de `patientBirthDate`, estado/badge/filtros mapeados desde `currentStatus`), borrando el mock.

**Tech Stack:** Backend Java 21 / Spring Boot 3 / Hibernate 6 / JPA, arquitectura hexagonal, DTOs como `record`, mappers manuales, Flyway. Frontend Angular standalone + NgRx clásico (skill `ngrx-backend-request`), Vitest+TestBed.

**Repos / worktrees (crear en tiempo de ejecución):**
- Backend: rama nueva desde `origin/development` (Flyway V947 ya mergeado). Worktree sugerido `Backend-validacion`.
- Frontend: rama nueva desde `origin/development` (subtab ya mergeado vía PR #79). Worktree sugerido `FRONTEND-LABORATORIO-validacion-be` o reusar uno limpio.

**Comandos de test:**
- Backend (Windows, desde la raíz del repo Backend): `./mvnw.cmd test -Dtest=<Clase>`
- Frontend: `npm test` (NO `npx vitest run` — rompe en componentes con `templateUrl`).

---

## FASE A — BACKEND (`Backend`, módulo `analitica/postanalitica`)

Base package: `lab.laboratorio.modules.analitica.postanalitica`.

### Estructura de archivos (Fase A)

- Crear: `domain/model/StudyListItem.java` — read-model de la proyección (record).
- Crear: `domain/model/ProtocolCode.java` — helper determinístico `P-{yyMM}-{id}`.
- Crear: `src/test/.../postanalitica/domain/model/ProtocolCodeTest.java`
- Modificar: `presentation/dto/response/StudyResponse.java` — agregar campos + `from(StudyListItem)`.
- Modificar: `infrastructure/persistence/repository/PostAnalyticalStudyJpaRepository.java` — `@Query` de proyección paginada.
- Modificar: `domain/port/in/PostAnalyticalStudyRepositoryPort.java` — método `findStudyList(...)`.
- Modificar: `infrastructure/persistence/adapter/PostAnalyticalStudyRepositoryAdapter.java` — implementación.
- Modificar: `application/usecase/ListStudiesUseCase.java` — devolver `Page<StudyListItem>`.
- Modificar: `presentation/controller/PostAnalyticalStudyController.java` — `.map(StudyResponse::from)` (queda igual; ahora `from` toma `StudyListItem`).
- Modificar tests: `presentation/PostAnalyticalStudyControllerIT.java`, `infrastructure/PostAnalyticalStudyRepositoryAdapterIT.java`.

---

### Task A0: Verificación previa (no escribe código de producción)

- [ ] **Step 1: Confirmar campos exactos de las entidades referenciadas en el JPQL**

Leer y confirmar nombres de campo JPA (no de columna) en:
- `AnalysisOrderJpaEntity`: ¿campo escalar `protocolId` y `tenantId`? (Si en vez de `protocolId` existe solo la relación `protocol`, el JPQL usa `ao.protocol.id`.)
- `DeterminationJpaEntity`: campo `analyticalResultId`.
- `AnalyticalResultJpaEntity`: campos `protocolId` y `tenantId`.
- `PatientJpaEntity`: campos `lastName`, `firstName`, `sexAtBirth`, `gender`, `birthDate`.

Run: `grep -rn "private .* protocolId\|private .* tenantId\|protocol;" Backend/src/main/java/lab/laboratorio/modules/analitica/infrastructure/persistence/entity/protocol/AnalysisOrderJpaEntity.java`
Expected: ver si `protocolId` es escalar. Anotar el nombre real para el JPQL del Task A4.

- [ ] **Step 2: Confirmar usos de `StudyResponse.from(PostAnalyticalStudy)` y `fromList`**

Run: `grep -rn "StudyResponse.from\|StudyResponse::from\|fromList" Backend/src/main/java`
Expected: identificar si el endpoint de detalle (`getStudy`) u otro consumen `from(PostAnalyticalStudy)`. Si lo usan, en Task A3 se **mantiene** ese overload (rellenando los campos nuevos con `null`/`0`) y se **agrega** `from(StudyListItem)`. Si nadie más lo usa, igual lo mantenemos por seguridad (cambio aditivo).

- [ ] **Step 3: Confirmar comando Maven**

Run: `ls Backend/mvnw.cmd Backend/pom.xml`
Expected: ambos existen.

---

### Task A1: Helper `ProtocolCode` (TDD)

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/ProtocolCode.java`
- Test: `Backend/src/test/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/ProtocolCodeTest.java`

- [ ] **Step 1: Escribir el test que falla**

```java
package lab.laboratorio.modules.analitica.postanalitica.domain.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ProtocolCodeTest {

    @Test
    void format_buildsDeterministicCode() {
        Instant junio2026 = LocalDate.of(2026, 6, 10).atStartOfDay(ZoneOffset.UTC).toInstant();
        assertThat(ProtocolCode.format(junio2026, 41L)).isEqualTo("P-2606-0041");
    }

    @Test
    void format_zeroPadsIdAndKeepsLongIds() {
        Instant enero2026 = LocalDate.of(2026, 1, 5).atStartOfDay(ZoneOffset.UTC).toInstant();
        assertThat(ProtocolCode.format(enero2026, 7L)).isEqualTo("P-2601-0007");
        assertThat(ProtocolCode.format(enero2026, 123456L)).isEqualTo("P-2601-123456");
    }

    @Test
    void format_nullCreatedAt_returnsIdOnlyCode() {
        assertThat(ProtocolCode.format(null, 41L)).isEqualTo("P-0041");
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `./mvnw.cmd test -Dtest=ProtocolCodeTest`
Expected: FAIL — `ProtocolCode` no existe / no compila.

- [ ] **Step 3: Implementar el helper**

```java
package lab.laboratorio.modules.analitica.postanalitica.domain.model;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

/**
 * Código presentacional determinístico de protocolo: {@code P-{yyMM}-{id 4 dígitos}}.
 * No se persiste ni es clave de negocio (la clave sigue siendo el protocolId).
 * yyMM se deriva de createdAt en UTC para que el código sea estable e independiente de zona.
 */
public final class ProtocolCode {

    private ProtocolCode() {}

    public static String format(Instant createdAt, Long protocolId) {
        String id = String.format("%04d", protocolId);
        if (createdAt == null) {
            return "P-" + id;
        }
        ZonedDateTime z = createdAt.atZone(ZoneOffset.UTC);
        return String.format("P-%02d%02d-%s", z.getYear() % 100, z.getMonthValue(), id);
    }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `./mvnw.cmd test -Dtest=ProtocolCodeTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/ProtocolCode.java \
        src/test/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/ProtocolCodeTest.java
git commit -m "feat(postanalitica): helper ProtocolCode determinístico P-{yyMM}-{id}"
```

---

### Task A2: Read-model `StudyListItem`

**Files:**
- Create: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/StudyListItem.java`

> Record puro de lectura; sin test propio (se cubre vía el repo IT del Task A4). Los counts vienen como `long` desde `COUNT(...)` de JPQL.

- [ ] **Step 1: Crear el record**

```java
package lab.laboratorio.modules.analitica.postanalitica.domain.model;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Read-model de la proyección del listado de Validación. Campos crudos: la
 * armada de patientName / sex / protocolCode se hace al mapear a StudyResponse.
 */
public record StudyListItem(
        Long studyId,
        Long tenantId,
        Long protocolId,
        Long patientId,
        StudyStatus currentStatus,
        int expectedResultsCount,
        int signedResultsCount,
        Instant protocolCreatedAt,
        String patientLastName,
        String patientFirstName,
        String patientSexAtBirth,
        String patientGender,
        LocalDate patientBirthDate,
        Instant studyDate,
        long analysisCount,
        long determinationCount
) {}
```

- [ ] **Step 2: Compilar**

Run: `./mvnw.cmd -q -DskipTests compile`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/model/StudyListItem.java
git commit -m "feat(postanalitica): read-model StudyListItem para el listado enriquecido"
```

---

### Task A3: Enriquecer `StudyResponse`

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/presentation/dto/response/StudyResponse.java`

- [ ] **Step 1: Reemplazar el record por la versión enriquecida**

Reemplazar el contenido del record (mantener package e imports existentes; agregar imports `java.time.Instant`, `java.time.LocalDate`, y el de `StudyListItem`/`ProtocolCode` del mismo módulo si hace falta):

```java
public record StudyResponse(
        Long id,
        Long tenantId,
        Long protocolId,
        Long patientId,
        StudyStatus currentStatus,
        int expectedResultsCount,
        int signedResultsCount,
        // --- enriquecidos para el listado de Validación ---
        String protocolCode,
        String patientName,
        String patientSex,
        LocalDate patientBirthDate,
        Instant date,
        int analysisCount,
        int determinationCount,
        int signedAnalysisCount
) {
    /** Mapeo del listado enriquecido (proyección). */
    public static StudyResponse from(StudyListItem i) {
        String patientName = (i.patientLastName() == null ? "" : i.patientLastName())
                + ", " + (i.patientFirstName() == null ? "" : i.patientFirstName());
        String sex = i.patientSexAtBirth() != null ? i.patientSexAtBirth() : i.patientGender();
        return new StudyResponse(
                i.studyId(), i.tenantId(), i.protocolId(), i.patientId(), i.currentStatus(),
                i.expectedResultsCount(), i.signedResultsCount(),
                ProtocolCode.format(i.protocolCreatedAt(), i.protocolId()),
                patientName, sex, i.patientBirthDate(), i.studyDate(),
                (int) i.analysisCount(), (int) i.determinationCount(),
                // signedAnalysisCount = signedResultsCount: analytical_results es 1:1 con analysis_orders
                i.signedResultsCount());
    }

    /** Mapeo de detalle (sin enriquecer): los campos de listado van en null/0. */
    public static StudyResponse from(PostAnalyticalStudy study) {
        return new StudyResponse(
                study.getId(), study.getTenantId(), study.getProtocolId(),
                study.getPatientId(), study.getCurrentStatus(),
                study.getExpectedResultsCount(), study.getSignedResultsCount(),
                null, null, null, null, null, 0, 0, 0);
    }

    public static List<StudyResponse> fromList(List<PostAnalyticalStudy> studies) {
        return studies.stream().map(StudyResponse::from).toList();
    }
}
```

> Si el Task A0/Step 2 mostró que nadie usa `from(PostAnalyticalStudy)`/`fromList`, igual se dejan (aditivo, no rompen nada).

- [ ] **Step 2: Compilar**

Run: `./mvnw.cmd -q -DskipTests compile`
Expected: BUILD SUCCESS (el controller `.map(StudyResponse::from)` ahora resuelve a `from(StudyListItem)` una vez que el use-case devuelva `Page<StudyListItem>` — se completa en A6; hasta entonces puede no compilar el controller, por eso A3→A6 se commitean juntos al final de A6 si hace falta. Si compila aislado, commitear acá).

- [ ] **Step 3: Commit (si compila aislado)**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/postanalitica/presentation/dto/response/StudyResponse.java
git commit -m "feat(postanalitica): enriquecer StudyResponse con campos del listado (aditivo)"
```

---

### Task A4: Query de proyección en el JPA repository (TDD vía repo IT)

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/repository/PostAnalyticalStudyJpaRepository.java`
- Test: `Backend/src/test/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/PostAnalyticalStudyRepositoryAdapterIT.java`

- [ ] **Step 1: Agregar el test de adapter que falla** (depende de A5: el método del port `findStudyList`)

Agregar al IT existente (mismo estilo `@DataJpaTest`/IT del archivo; usa el seed o crea datos vía `adapter.findOrCreate`). Test mínimo que verifica que la proyección trae campos enriquecidos:

```java
@Test
void findStudyList_returnsEnrichedRows() {
    // Arrange: paciente + protocolo + orden + estudio ya seedeados o creados en el setup del IT.
    // (Reusar el patrón de setup del archivo; si el IT no seedea patient/protocol, crearlos vía las entidades JPA del test).

    Page<StudyListItem> page = adapter.findStudyList(TENANT_ID, null, PageRequest.of(0, 10));

    assertThat(page.getContent()).isNotEmpty();
    StudyListItem item = page.getContent().get(0);
    assertThat(item.protocolId()).isNotNull();
    assertThat(item.patientLastName()).isNotBlank();
    assertThat(item.analysisCount()).isGreaterThanOrEqualTo(0);
    assertThat(item.determinationCount()).isGreaterThanOrEqualTo(0);
}

@Test
void findStudyList_filtersByStatus() {
    Page<StudyListItem> partial = adapter.findStudyList(
            TENANT_ID, StudyStatus.PARTIALLY_SIGNED, PageRequest.of(0, 10));
    assertThat(partial.getContent())
            .allMatch(i -> i.currentStatus() == StudyStatus.PARTIALLY_SIGNED);
}
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `./mvnw.cmd test -Dtest=PostAnalyticalStudyRepositoryAdapterIT`
Expected: FAIL — `findStudyList` no existe (no compila).

- [ ] **Step 3: Agregar el `@Query` de proyección al JPA repository**

Agregar el método (ajustar `ao.protocolId` → `ao.protocol.id` si el Task A0/Step 1 lo indicó):

```java
@Query("""
        SELECT new lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyListItem(
            s.id, s.tenantId, s.protocolId, s.patientId, s.currentStatus,
            s.expectedResultsCount, s.signedResultsCount,
            p.createdAt,
            pat.lastName, pat.firstName, pat.sexAtBirth, pat.gender, pat.birthDate,
            s.updatedAt,
            (SELECT COUNT(ao) FROM AnalysisOrderJpaEntity ao
                WHERE ao.protocolId = s.protocolId AND ao.tenantId = s.tenantId AND ao.active = true),
            (SELECT COUNT(d) FROM DeterminationJpaEntity d
                JOIN AnalyticalResultJpaEntity ar ON ar.id = d.analyticalResultId
                WHERE ar.protocolId = s.protocolId AND ar.tenantId = s.tenantId
                  AND ar.active = true AND d.active = true)
        )
        FROM PostAnalyticalStudyJpaEntity s
        JOIN ProtocolJpaEntity p ON p.id = s.protocolId AND p.tenantId = s.tenantId
        JOIN PatientJpaEntity pat ON pat.id = s.patientId AND pat.tenantId = s.tenantId
        WHERE s.tenantId = :tenantId AND s.active = true
          AND (:status IS NULL OR s.currentStatus = :status)
        """,
        countQuery = """
        SELECT COUNT(s) FROM PostAnalyticalStudyJpaEntity s
        WHERE s.tenantId = :tenantId AND s.active = true
          AND (:status IS NULL OR s.currentStatus = :status)
        """)
Page<StudyListItem> findStudyList(@Param("tenantId") Long tenantId,
                                  @Param("status") StudyStatus status,
                                  Pageable pageable);
```

Agregar imports si faltan: `lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyListItem`, `org.springframework.data.domain.Page`, `org.springframework.data.domain.Pageable`, `org.springframework.data.jpa.repository.Query`, `org.springframework.data.repository.query.Param`.

> **Nota de coste / no N+1:** las subqueries son correlacionadas y se resuelven **en una sola sentencia SQL por página** (database-side); no hay round-trips por fila desde la app. Las FKs (`analysis_orders.protocol_id`, `patient_id`) ya están indexadas. Sin migración, sin índices nuevos.

- [ ] **Step 4: (bloqueado por A5/A6)** Este test compila y pasa recién con el método del port (A5) + adapter (A6). Continuar a A5/A6 y volver a correr este test ahí.

---

### Task A5: Puerto `findStudyList`

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/port/in/PostAnalyticalStudyRepositoryPort.java`

- [ ] **Step 1: Agregar la firma al port**

Agregar (mantener los métodos existentes):

```java
Page<StudyListItem> findStudyList(Long tenantId, StudyStatus status, Pageable pageable);
```

Imports: `lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyListItem` (Page/Pageable ya están en el archivo).

- [ ] **Step 2: Commit (junto con A6)** — el port sin implementación no compila el adapter; se commitea con A6.

---

### Task A6: Adapter + UseCase + Controller

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PostAnalyticalStudyRepositoryAdapter.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/application/usecase/ListStudiesUseCase.java`
- Modify: `Backend/src/main/java/lab/laboratorio/modules/analitica/postanalitica/presentation/controller/PostAnalyticalStudyController.java`

- [ ] **Step 1: Implementar `findStudyList` en el adapter**

Agregar al adapter (delega directo al JPA repo; la proyección ya produce el record, sin mapper):

```java
@Override
public Page<StudyListItem> findStudyList(Long tenantId, StudyStatus status, Pageable pageable) {
    return jpaRepository.findStudyList(tenantId, status, pageable);
}
```

(Usar el nombre real del campo del repo JPA inyectado en el adapter — `jpaRepository` o como esté.) Imports: `StudyListItem`.

- [ ] **Step 2: Cambiar `ListStudiesUseCase` para devolver `Page<StudyListItem>`**

```java
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ListStudiesUseCase {

    private final PostAnalyticalStudyRepositoryPort studyRepo;

    public record Input(Long tenantId, StudyStatus status, Pageable pageable) {}

    public Page<StudyListItem> execute(Input input) {
        return studyRepo.findStudyList(input.tenantId(), input.status(), input.pageable());
    }
}
```

Import: `lab.laboratorio.modules.analitica.postanalitica.domain.model.StudyListItem`.

- [ ] **Step 3: Ajustar el controller (queda casi igual)**

El método `list(...)` mantiene `.map(StudyResponse::from)`; ahora resuelve a `from(StudyListItem)`. Verificar tipos:

```java
@GetMapping
@Operation(summary = "Listar estudios paginados (filtro opcional por estado)")
public ResponseEntity<Page<StudyResponse>> list(
        @RequestParam(required = false) StudyStatus status,
        Pageable pageable) {
    Long tenantId = TenantContext.requireTenantId();
    Page<StudyResponse> page = listStudiesUseCase
            .execute(new ListStudiesUseCase.Input(tenantId, status, pageable))
            .map(StudyResponse::from);
    return ResponseEntity.ok(page);
}
```

- [ ] **Step 4: Compilar todo**

Run: `./mvnw.cmd -q -DskipTests compile`
Expected: BUILD SUCCESS.

- [ ] **Step 5: Correr el repo IT del Task A4**

Run: `./mvnw.cmd test -Dtest=PostAnalyticalStudyRepositoryAdapterIT`
Expected: PASS (incluye `findStudyList_returnsEnrichedRows` y `findStudyList_filtersByStatus`).

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/port/in/PostAnalyticalStudyRepositoryPort.java \
        src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PostAnalyticalStudyRepositoryAdapter.java \
        src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/repository/PostAnalyticalStudyJpaRepository.java \
        src/main/java/lab/laboratorio/modules/analitica/postanalitica/application/usecase/ListStudiesUseCase.java \
        src/main/java/lab/laboratorio/modules/analitica/postanalitica/presentation/controller/PostAnalyticalStudyController.java \
        src/test/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/PostAnalyticalStudyRepositoryAdapterIT.java
git commit -m "feat(postanalitica): GET /studies enriquecido (proyección StudyListItem, sin N+1)"
```

---

### Task A7: Test del controller (shape enriquecido)

**Files:**
- Modify: `Backend/src/test/java/lab/laboratorio/modules/analitica/postanalitica/presentation/PostAnalyticalStudyControllerIT.java`

- [ ] **Step 1: Actualizar el stub + assert del JSON enriquecido**

El IT mockea `listStudiesUseCase.execute(...)`. Ahora devuelve `Page<StudyListItem>`. Reemplazar `stubStudy()` por un `StudyListItem` y asertar los campos nuevos:

```java
private StudyListItem stubItem() {
    return new StudyListItem(
            55010L, 1L, 50012L, 20003L, StudyStatus.PENDING,
            2, 0,
            java.time.LocalDate.of(2026, 6, 10).atStartOfDay(java.time.ZoneOffset.UTC).toInstant(),
            "Pérez", "Juan", "M", null,
            java.time.LocalDate.of(1972, 3, 1),
            java.time.Instant.parse("2026-06-12T10:00:00Z"),
            3L, 7L);
}

@Test
@WithMockUser(roles = "BIOQUIMICO")
void listStudies_returnsEnrichedRows() throws Exception {
    when(listStudiesUseCase.execute(any()))
            .thenReturn(new PageImpl<>(List.of(stubItem())));

    mockMvc.perform(get("/api/v1/analitica/postanalitica/studies")
                    .header("X-Tenant-Id", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").value(1))
            .andExpect(jsonPath("$.content[0].protocolCode").value("P-2606-50012"))
            .andExpect(jsonPath("$.content[0].patientName").value("Pérez, Juan"))
            .andExpect(jsonPath("$.content[0].patientSex").value("M"))
            .andExpect(jsonPath("$.content[0].analysisCount").value(3))
            .andExpect(jsonPath("$.content[0].determinationCount").value(7))
            .andExpect(jsonPath("$.content[0].signedAnalysisCount").value(0));
}
```

> Nota: `protocolCode` con id 50012 → `P-2606-50012` (id de 5 dígitos no se trunca; el padding es a mínimo 4). Ajustar el valor esperado al `stubItem()`.

Quitar/actualizar el viejo `listStudies_returns200()` si su `stubStudy()` ya no compila.

- [ ] **Step 2: Correr el test**

Run: `./mvnw.cmd test -Dtest=PostAnalyticalStudyControllerIT`
Expected: PASS.

- [ ] **Step 3: Suite completa del módulo**

Run: `./mvnw.cmd test -Dtest=PostAnalytical*`
Expected: PASS (sin regresiones en el módulo postanalitica).

- [ ] **Step 4: Commit**

```bash
git add src/test/java/lab/laboratorio/modules/analitica/postanalitica/presentation/PostAnalyticalStudyControllerIT.java
git commit -m "test(postanalitica): GET /studies devuelve campos enriquecidos del listado"
```

---

### Task A8: Smoke manual contra seed V959 (verificación end-to-end backend)

- [ ] **Step 1: Levantar el backend con perfil local (seed V959) y pegarle al endpoint**

Levantar el back (perfil local con seed), autenticar como `admin@test.com` / `password`, y:

Run (con el token y tenant correctos):
`curl -s "http://localhost:8080/api/v1/analitica/postanalitica/studies?size=20" -H "Authorization: Bearer <token>"`

Expected: cada elemento de `content[]` trae `protocolCode` (formato `P-YYMM-...`), `patientName` ("Apellido, Nombre"), `patientSex`, `patientBirthDate` (ISO date), `date` (ISO), `analysisCount`, `determinationCount`, `signedAnalysisCount`. Los 4 estudios seedeados (PENDING/PARTIALLY_SIGNED/READY_FOR_SIGNATURE/CLOSED) aparecen; `?status=PARTIALLY_SIGNED` filtra correctamente.

- [ ] **Step 2: Verificar "una query por página" en el log SQL**

Con `spring.jpa.show-sql=true` (o el logger de Hibernate), confirmar que listar una página dispara **una** sentencia SELECT principal (+ la countQuery de paginación), no una por fila.

Expected: sin patrón N+1.

---

## FASE B — FRONTEND (`FRONTEND-LABORATORIO`)

> Aplica la skill `ngrx-backend-request` (NgRx clásico). El back debe estar emitiendo los campos (Fase A) antes del smoke final, pero el código front se puede escribir contra el contrato definido.

Base: `src/app/features/analitica/muestras`.

### Estructura de archivos (Fase B)

- Modify: `models/postanalitica.model.ts` — agregar `ValidationListRow`, `StudyListItemResponse`, `Page<T>`.
- Create: `services/...` → método nuevo en `services/postanalitica-api.service.ts`.
- Create: `store/validacion-protocolos/validacion-protocolos.state.ts`
- Create: `store/validacion-protocolos/validacion-protocolos.actions.ts`
- Create: `store/validacion-protocolos/validacion-protocolos.reducer.ts`
- Create: `store/validacion-protocolos/validacion-protocolos.selectors.ts`
- Create: `store/validacion-protocolos/validacion-protocolos.effects.ts`
- Create: `src/app/shared/utils/calcular-edad.ts` (+ test)
- Modify: `pages/validacion-protocolos/validacion-protocolos.page.ts` (+ `.html`, + `.spec.ts`)
- Modify: `src/app/app.config.ts` — registrar feature + effects.
- Delete: `data/validacion-protocolos.mock.ts`.

---

### Task B1: Helper `calcularEdad` (TDD)

**Files:**
- Create: `src/app/shared/utils/calcular-edad.ts`
- Test: `src/app/shared/utils/calcular-edad.spec.ts`

- [ ] **Step 1: Test que falla**

```ts
import { describe, it, expect } from 'vitest';
import { calcularEdad } from './calcular-edad';

describe('calcularEdad', () => {
  it('devuelve null si birthDate es null o vacío', () => {
    expect(calcularEdad(null)).toBeNull();
    expect(calcularEdad('')).toBeNull();
  });

  it('calcula la edad respecto a una fecha de referencia', () => {
    const hoy = new Date('2026-06-14');
    expect(calcularEdad('1972-03-01', hoy)).toBe(54);
  });

  it('resta un año si todavía no cumplió este año', () => {
    const hoy = new Date('2026-06-14');
    expect(calcularEdad('1972-12-31', hoy)).toBe(53);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npm test -- calcular-edad`
Expected: FAIL — `calcularEdad` no existe.

- [ ] **Step 3: Implementar**

```ts
/** Edad en años a partir de una fecha de nacimiento ISO (yyyy-MM-dd). null si no hay fecha. */
export function calcularEdad(birthDate: string | null, ref: Date = new Date()): number | null {
  if (!birthDate) return null;
  const nac = new Date(birthDate);
  if (Number.isNaN(nac.getTime())) return null;
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad--;
  return edad;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npm test -- calcular-edad`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/utils/calcular-edad.ts src/app/shared/utils/calcular-edad.spec.ts
git commit -m "feat(shared): helper calcularEdad desde birthDate ISO"
```

---

### Task B2: Modelos del listado

**Files:**
- Modify: `src/app/features/analitica/muestras/models/postanalitica.model.ts`

- [ ] **Step 1: Agregar tipos al final del archivo**

```ts
/** Respuesta cruda del back para una fila del listado (StudyResponse enriquecido). */
export interface StudyListItemResponse {
  id: number;
  protocolId: number;
  patientId: number;
  currentStatus: StudyStatus;
  expectedResultsCount: number;
  signedResultsCount: number;
  protocolCode: string;
  patientName: string;
  patientSex: string | null;
  patientBirthDate: string | null; // ISO date
  date: string;                    // ISO
  analysisCount: number;
  determinationCount: number;
  signedAnalysisCount: number;
}

/** Page<T> de Spring Data (solo lo que consumimos). */
export interface Page<T> {
  content: T[];
  totalElements: number;
}

/** Fila del listado de Validación (modelo de UI). */
export interface ValidationListRow {
  studyId: number;
  protocolId: number;
  protocolCode: string;
  patientName: string;
  patientSex: string | null;
  patientBirthDate: string | null;
  date: string;
  currentStatus: StudyStatus;
  analysisCount: number;
  determinationCount: number;
  signedAnalysisCount: number;
}

/** Estado de firma derivado de currentStatus, para badge y filtro. */
export type EstadoFirma = 'sin' | 'parcial' | 'total';

export function estadoFirmaDe(status: StudyStatus): EstadoFirma {
  switch (status) {
    case 'PENDING': return 'sin';
    case 'PARTIALLY_SIGNED': return 'parcial';
    case 'READY_FOR_SIGNATURE':
    case 'CLOSED': return 'total';
  }
}

export function badgeFirma(status: StudyStatus): [string, string] {
  switch (estadoFirmaDe(status)) {
    case 'sin': return ['st-sin', 'Sin firma'];
    case 'parcial': return ['st-parcial', 'Firma parcial'];
    case 'total': return ['st-total', 'Firma total'];
  }
}

/** Mapea la respuesta cruda del back a la fila de UI. */
export function toValidationListRow(r: StudyListItemResponse): ValidationListRow {
  return {
    studyId: r.id,
    protocolId: r.protocolId,
    protocolCode: r.protocolCode,
    patientName: r.patientName,
    patientSex: r.patientSex,
    patientBirthDate: r.patientBirthDate,
    date: r.date,
    currentStatus: r.currentStatus,
    analysisCount: r.analysisCount,
    determinationCount: r.determinationCount,
    signedAnalysisCount: r.signedAnalysisCount,
  };
}
```

> Las clases CSS de badge (`st-sin`/`st-parcial`/`st-total`) deben existir o agregarse al `.scss` de la page; el mock usaba `badgeProt` con clases propias — reusar/ajustar nombres al `.scss` real en B6.

- [ ] **Step 2: Compilar (typecheck)**

Run: `npm run build` (o `npx tsc --noEmit` si está configurado)
Expected: sin errores de tipos.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/muestras/models/postanalitica.model.ts
git commit -m "feat(validacion): modelos ValidationListRow + mapeo de StudyResponse enriquecido"
```

---

### Task B3: Método de service

**Files:**
- Modify: `src/app/features/analitica/muestras/services/postanalitica-api.service.ts`

- [ ] **Step 1: Agregar el método (thin, solo HTTP)**

Agregar imports de `Page`, `StudyListItemResponse`, `StudyStatus` y el método:

```ts
listStudies(status?: StudyStatus): Observable<Page<StudyListItemResponse>> {
  let params = new HttpParams().set('size', '200');
  if (status) params = params.set('status', status);
  return this.http.get<Page<StudyListItemResponse>>(`${this.base}/studies`, { params });
}
```

Agregar `import { HttpClient, HttpParams } from '@angular/common/http';` (HttpParams nuevo).

> `size=200`: el listado de Validación es de baja cardinalidad; se trae una página grande y se filtra/busca client-side (decisión del spec §Frontend). Si a futuro crece, se pagina server-side.

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/features/analitica/muestras/services/postanalitica-api.service.ts
git commit -m "feat(validacion): PostanaliticaApiService.listStudies (listado paginado)"
```

---

### Task B4: Store slice `validacion-protocolos`

**Files:**
- Create: los 5 archivos en `src/app/features/analitica/muestras/store/validacion-protocolos/`

- [ ] **Step 1: state**

`validacion-protocolos.state.ts`:
```ts
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationListRow } from '../../models/postanalitica.model';

export interface ValidacionProtocolosState {
  rows: ValidationListRow[];
  pending: boolean;
  error: HttpErrorResponse | null;
}

export const initialValidacionProtocolosState: ValidacionProtocolosState = {
  rows: [],
  pending: false,
  error: null,
};

export const VALIDACION_PROTOCOLOS_FEATURE_KEY = 'validacionProtocolos';
```

- [ ] **Step 2: actions**

`validacion-protocolos.actions.ts`:
```ts
import { createAction, props } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationListRow } from '../../models/postanalitica.model';

export const loadValidacionProtocolos = createAction(
  '[Validacion Protocolos Page] Load Validacion Protocolos'
);
export const loadValidacionProtocolosSuccess = createAction(
  '[Postanalitica API] Load Validacion Protocolos Success',
  props<{ rows: ValidationListRow[] }>()
);
export const loadValidacionProtocolosFailure = createAction(
  '[Postanalitica API] Load Validacion Protocolos Failure',
  props<{ error: HttpErrorResponse }>()
);
```

- [ ] **Step 3: reducer**

`validacion-protocolos.reducer.ts`:
```ts
import { createReducer, on } from '@ngrx/store';
import { initialValidacionProtocolosState, ValidacionProtocolosState } from './validacion-protocolos.state';
import {
  loadValidacionProtocolos,
  loadValidacionProtocolosSuccess,
  loadValidacionProtocolosFailure,
} from './validacion-protocolos.actions';

export const validacionProtocolosReducer = createReducer(
  initialValidacionProtocolosState,
  on(loadValidacionProtocolos, (s): ValidacionProtocolosState => ({ ...s, pending: true, error: null })),
  on(loadValidacionProtocolosSuccess, (s, { rows }): ValidacionProtocolosState => ({ ...s, rows, pending: false, error: null })),
  on(loadValidacionProtocolosFailure, (s, { error }): ValidacionProtocolosState => ({ ...s, pending: false, error })),
);
```

- [ ] **Step 4: selectors**

`validacion-protocolos.selectors.ts`:
```ts
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ValidacionProtocolosState, VALIDACION_PROTOCOLOS_FEATURE_KEY } from './validacion-protocolos.state';

export const selectValidacionProtocolosState =
  createFeatureSelector<ValidacionProtocolosState>(VALIDACION_PROTOCOLOS_FEATURE_KEY);
export const selectValidacionRows = createSelector(selectValidacionProtocolosState, s => s.rows);
export const selectValidacionPending = createSelector(selectValidacionProtocolosState, s => s.pending);
export const selectValidacionError = createSelector(selectValidacionProtocolosState, s => s.error);
```

- [ ] **Step 5: effects**

`validacion-protocolos.effects.ts` (read → `switchMap`, `catchError` DENTRO):
```ts
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PostanaliticaApiService } from '../../services/postanalitica-api.service';
import { toValidationListRow } from '../../models/postanalitica.model';
import {
  loadValidacionProtocolos,
  loadValidacionProtocolosSuccess,
  loadValidacionProtocolosFailure,
} from './validacion-protocolos.actions';

@Injectable()
export class ValidacionProtocolosEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(PostanaliticaApiService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadValidacionProtocolos),
      switchMap(() =>
        this.api.listStudies().pipe(
          map(page => loadValidacionProtocolosSuccess({ rows: page.content.map(toValidationListRow) })),
          catchError((error: HttpErrorResponse) => of(loadValidacionProtocolosFailure({ error }))),
        ),
      ),
    ),
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `npm run build`
Expected: sin errores (aún sin registrar; se registra en B7).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/analitica/muestras/store/validacion-protocolos
git commit -m "feat(validacion): store ngrx validacion-protocolos (load listado)"
```

---

### Task B5: Reescribir la page (TS) para consumir el store

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.ts`

- [ ] **Step 1: Reemplazar el componente**

```ts
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { calcularEdad } from '@shared/utils/calcular-edad';
import {
  estadoFirmaDe, badgeFirma,
  type ValidationListRow, type EstadoFirma,
} from '../../models/postanalitica.model';
import { loadValidacionProtocolos } from '../../store/validacion-protocolos/validacion-protocolos.actions';
import {
  selectValidacionRows, selectValidacionPending,
} from '../../store/validacion-protocolos/validacion-protocolos.selectors';

const FILTROS: ReadonlyArray<{ id: 'todos' | EstadoFirma; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'sin', label: 'Sin firma' },
  { id: 'parcial', label: 'Firma parcial' },
  { id: 'total', label: 'Firma total' },
];

@Component({
  selector: 'app-validacion-protocolos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  templateUrl: './validacion-protocolos.page.html',
  styleUrl: './validacion-protocolos.page.scss',
})
export class ValidacionProtocolosPage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  readonly FILTROS = FILTROS;
  readonly estadoFirmaDe = estadoFirmaDe;
  readonly badgeFirma = badgeFirma;
  readonly calcularEdad = calcularEdad;

  readonly rows = this.store.selectSignal(selectValidacionRows);
  readonly pending = this.store.selectSignal(selectValidacionPending);

  readonly q = signal('');
  readonly filtro = signal<'todos' | EstadoFirma>('todos');

  readonly cSin = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'sin').length);
  readonly cParcial = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'parcial').length);
  readonly cTotal = computed(() => this.rows().filter(r => estadoFirmaDe(r.currentStatus) === 'total').length);

  readonly visibles = computed<ValidationListRow[]>(() => {
    const q = this.q().trim().toLowerCase();
    const f = this.filtro();
    return this.rows().filter(r => {
      if (f !== 'todos' && estadoFirmaDe(r.currentStatus) !== f) return false;
      if (!q) return true;
      return (r.patientName + ' ' + r.protocolCode).toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.store.dispatch(loadValidacionProtocolos());
  }

  setQ(v: string): void { this.q.set(v); }
  setFiltro(v: 'todos' | EstadoFirma): void { this.filtro.set(v); }
  edad(r: ValidationListRow): number | null { return calcularEdad(r.patientBirthDate); }

  validar(r: ValidationListRow, ev: Event): void {
    ev.stopPropagation();
    this.router.navigate(['/analitica/validacion', r.protocolId]);
  }
}
```

- [ ] **Step 2: Typecheck (fallará hasta reescribir el HTML en B6)**

Run: `npm run build`
Expected: errores de template (referencias del HTML viejo: `protos`, `detsDe`, `isOpen`, etc.). Se resuelven en B6. No commitear todavía.

---

### Task B6: Reescribir el template (HTML) y ajustar SCSS

**Files:**
- Modify: `src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.html`
- Modify (si hace falta clases de badge): `...validacion-protocolos.page.scss`

- [ ] **Step 1: Reemplazar el HTML** (sin expansión por análisis; fila según spec)

```html
<section class="validacion-page">
  <ui-page-header
    heading="Validación"
    subtitle="Protocolos con resultados cargados, pendientes de firma bioquímica. Revisá los análisis y validá el protocolo."
  >
    <div class="stats">
      <div class="stat is-on"><b>{{ cSin() }}</b><span>sin firma</span></div>
      <div class="stat"><b>{{ cParcial() }}</b><span>firma parcial</span></div>
      <div class="stat"><b>{{ cTotal() }}</b><span>firma total</span></div>
    </div>
  </ui-page-header>

  <div class="scanbar">
    <div class="scan-input scan-input--sm">
      <i class="pi pi-search"></i>
      <input
        [value]="q()"
        (input)="setQ($any($event.target).value)"
        placeholder="Buscar por paciente o protocolo…"
        aria-label="Buscar por paciente o protocolo"
      />
    </div>
    <div class="seg">
      @for (f of FILTROS; track f.id) {
        <button type="button" class="seg-btn" [class.is-on]="filtro() === f.id" (click)="setFiltro(f.id)">
          {{ f.label }}
        </button>
      }
    </div>
  </div>

  <div class="thead-card prot-grid">
    <span>PROTOCOLO</span><span>ANÁLISIS</span><span>FECHA</span><span>ESTADO</span><span></span>
  </div>

  <section class="grp-card">
    <div class="grp-rows">
      @for (r of visibles(); track r.studyId) {
        <div class="prot-block">
          <div class="row prot-grid prot-row">
            <div class="cell-mx">
              <div class="mx-top"><span class="mx-code">{{ r.protocolCode }}</span></div>
              <div class="mx-pac">
                {{ r.patientName }}@if (r.patientSex || edad(r) !== null) { · {{ r.patientSex }} @if (edad(r) !== null) {{{ edad(r) }}a}}
              </div>
            </div>
            <div class="cell-an">
              <span class="an-count">{{ r.analysisCount }} análisis</span>
              <span class="an-sub">{{ r.determinationCount }} determinaciones</span>
              <span class="an-sub">{{ r.signedAnalysisCount }} de {{ r.analysisCount }} firmados</span>
            </div>
            <div class="cell-toma">
              <span class="toma-d">{{ r.date | date: 'dd/MM/yyyy' }}</span>
              <span class="toma-h">{{ r.date | date: 'HH:mm' }} hs</span>
            </div>
            <div class="cell-edo">
              <span [class]="'badge-st ' + badgeFirma(r.currentStatus)[0]"><span class="dot"></span>{{ badgeFirma(r.currentStatus)[1] }}</span>
            </div>
            <div class="cell-act">
              @if (estadoFirmaDe(r.currentStatus) === 'total') {
                <button type="button" class="prot-validar is-done" (click)="validar(r, $event)">
                  <i class="pi pi-eye"></i> Ver
                </button>
              } @else {
                <button type="button" class="prot-validar" (click)="validar(r, $event)">
                  Validar <i class="pi pi-check"></i>
                </button>
              }
            </div>
          </div>
        </div>
      }
      @if (!pending() && visibles().length === 0) {
        <div class="empty">
          <i class="pi pi-check-circle"></i>
          <p>No hay protocolos para este filtro.</p>
        </div>
      }
    </div>
  </section>
</section>
```

> Para usar el pipe `date` agregar `DatePipe` a `imports` del componente (`imports: [PageHeaderComponent, DatePipe]`) y `import { DatePipe } from '@angular/common';` en B5 (corregir ahí si se omitió).
> `prot-grid` tenía 6 columnas (con la del chevron). Al quitar el chevron pasa a 5: ajustar `grid-template-columns` en el `.scss` (quitar la primera columna). Confirmar clases `badge-st st-sin/st-parcial/st-total` en el `.scss` (mapear a las clases reales que ya tenía el mock para los tres estados).

- [ ] **Step 2: Ajustar el componente (DatePipe import) y typecheck**

Asegurar en `validacion-protocolos.page.ts`: `import { DatePipe } from '@angular/common';` y `imports: [PageHeaderComponent, DatePipe]`.

Run: `npm run build`
Expected: sin errores de template.

- [ ] **Step 3: Commit (page TS + HTML + SCSS juntos)**

```bash
git add src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.ts \
        src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.html \
        src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.scss
git commit -m "feat(validacion): page consume store (rows del back) — sin mock, sin expansión"
```

---

### Task B7: Registrar el feature en `app.config.ts`

**Files:**
- Modify: `src/app/app.config.ts`

- [ ] **Step 1: Agregar provideState + provideEffects**

Agregar imports y, dentro de `providers`, junto al registro de `postanalitica`:

```ts
import { VALIDACION_PROTOCOLOS_FEATURE_KEY } from '@features/analitica/muestras/store/validacion-protocolos/validacion-protocolos.state';
import { validacionProtocolosReducer } from '@features/analitica/muestras/store/validacion-protocolos/validacion-protocolos.reducer';
import { ValidacionProtocolosEffects } from '@features/analitica/muestras/store/validacion-protocolos/validacion-protocolos.effects';

// dentro de providers:
provideState(VALIDACION_PROTOCOLOS_FEATURE_KEY, validacionProtocolosReducer),
provideEffects(ValidacionProtocolosEffects),
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/app.config.ts
git commit -m "feat(validacion): registrar store validacion-protocolos en app.config"
```

---

### Task B8: Borrar el mock y actualizar el spec de la page

**Files:**
- Delete: `src/app/features/analitica/muestras/data/validacion-protocolos.mock.ts`
- Modify: `src/app/features/analitica/muestras/pages/validacion-protocolos/validacion-protocolos.page.spec.ts` (si existe; si no, crearlo)

- [ ] **Step 1: Confirmar que nadie más importa el mock**

Run: `grep -rn "validacion-protocolos.mock" src/app`
Expected: solo lo importaba la page (ya migrada). Si hay otros usos (p. ej. la page de detalle `validar-protocolo`), **NO** borrar todavía: migrar/aislar esos usos primero o dejar el mock solo para detalle (anotar y consultar).

- [ ] **Step 2: Borrar el mock (si solo lo usaba el listado)**

Run: `rm src/app/features/analitica/muestras/data/validacion-protocolos.mock.ts`

- [ ] **Step 3: Smoke test de la page con store mockeado**

Reemplazar/crear el spec con un test que provee el store y verifica stats/filtros/búsqueda sobre `rows`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { ValidacionProtocolosPage } from './validacion-protocolos.page';
import { selectValidacionRows, selectValidacionPending } from '../../store/validacion-protocolos/validacion-protocolos.selectors';
import type { ValidationListRow } from '../../models/postanalitica.model';

const row = (over: Partial<ValidationListRow>): ValidationListRow => ({
  studyId: 1, protocolId: 1, protocolCode: 'P-2606-0001',
  patientName: 'Pérez, Juan', patientSex: 'M', patientBirthDate: '1972-03-01',
  date: '2026-06-12T10:00:00Z', currentStatus: 'PENDING',
  analysisCount: 3, determinationCount: 7, signedAnalysisCount: 0, ...over,
});

describe('ValidacionProtocolosPage', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ValidacionProtocolosPage],
      providers: [provideRouter([]), provideMockStore()],
    });
    store = TestBed.inject(MockStore);
    store.overrideSelector(selectValidacionPending, false);
    store.overrideSelector(selectValidacionRows, [
      row({ studyId: 1, currentStatus: 'PENDING' }),
      row({ studyId: 2, currentStatus: 'PARTIALLY_SIGNED' }),
      row({ studyId: 3, currentStatus: 'CLOSED' }),
    ]);
  });

  it('cuenta por estado de firma', () => {
    const c = TestBed.createComponent(ValidacionProtocolosPage).componentInstance;
    expect(c.cSin()).toBe(1);
    expect(c.cParcial()).toBe(1);
    expect(c.cTotal()).toBe(1);
  });

  it('filtra por estado', () => {
    const c = TestBed.createComponent(ValidacionProtocolosPage).componentInstance;
    c.setFiltro('parcial');
    expect(c.visibles().map(r => r.studyId)).toEqual([2]);
  });

  it('busca por paciente o protocolCode', () => {
    const c = TestBed.createComponent(ValidacionProtocolosPage).componentInstance;
    c.setQ('P-2606-0001');
    expect(c.visibles().length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 4: Correr el spec**

Run: `npm test -- validacion-protocolos.page`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(validacion): smoke de la page con store; borrar mock validacion-protocolos"
```

---

### Task B9: Suite + smoke visual end-to-end

- [ ] **Step 1: Correr la suite del feature**

Run: `npm test -- analitica`
Expected: PASS (sin regresiones; ver memoria sobre fails pre-existentes de baseline si aparecen).

- [ ] **Step 2: Smoke visual con back levantado**

Con el backend de la Fase A corriendo (seed V959) y el front (`npm start`), entrar a `/analitica/validacion`:
- Las filas se pueblan desde el back (no mock).
- Stats (sin/parcial/total) coinciden con los estados seedeados.
- Filtros y búsqueda operan.
- Edad correcta (derivada de `patientBirthDate`), sin badge URGENTE.
- "Validar"/"Ver" navega a `/analitica/validacion/{protocolId}`.

Expected: listado real funcionando end-to-end.

---

## Self-Review (cobertura del spec)

- `protocolCode` derivado `P-{yyMM}-{id}` → Task A1 (helper) + A3 (uso en `from`). ✔
- `patientName`, `patientSex` (sexAtBirth ?? gender), `patientBirthDate` → A4 (proyección) + A3 (armado). ✔
- `date` (study updatedAt) → A4 (`s.updatedAt`). ✔
- `analysisCount` (count analysis_orders por protocolo) → A4 subquery. ✔
- `determinationCount` (count determinations vía analytical_results) → A4 subquery. ✔
- `signedAnalysisCount` = `signedResultsCount` (1:1) → A3. ✔
- Filtro `?status=` sigue funcionando → A4 (`:status IS NULL OR ...`) + A6 (Input). ✔
- Sin N+1 (una query por página) → A4 (proyección + subqueries correlacionadas) + A8/Step 2 (verificación log SQL). ✔
- Cambio aditivo (no se rompen campos existentes) → A3 mantiene `from(PostAnalyticalStudy)`. ✔
- Front: `ValidationListRow`, edad derivada, estado/badge desde `currentStatus`, stats/filtros/búsqueda → B2/B5/B6. ✔
- Sin badge URGENTE, sin obra social/sección/NBU → B6 (no se renderizan). ✔
- Mensajes de error en español sin leak (regla del proyecto) → cubierto por el manejo de errores existente del back (no se agregan mensajes nuevos en este cambio). ✔
- FUERA de alcance (pantalla de detalle/validar, firma) → no se toca. ✔
```
