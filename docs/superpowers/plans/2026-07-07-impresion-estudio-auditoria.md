# Impresión de estudio con auditoría — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la secretaría (y el resto del staff clínico) pueda imprimir desde el historial de paciente el PDF de resultado ya firmado de un protocolo, sin ver el valor clínico en pantalla, con auditoría de quién imprimió y cuándo.

**Architecture:** Backend en el módulo `atencion` (dueño del historial): nuevo endpoint + `PrintPatientReportUseCase` que reusa el puerto cross-módulo `PortalReportQueryPort` de `postanalitica` (extendido con un método que no filtra por tipo de reporte) para descargar el PDF más reciente, y persiste una fila de auditoría en una tabla nueva propia de `atencion`. Frontend: botón en la fila expandida del historial de paciente que descarga el blob y lo abre en pestaña nueva (mismo patrón ya usado para "Ver PDF" en validación), más un indicador de última impresión leído del mismo historial.

**Tech Stack:** Spring Boot / JPA / Flyway / MySQL-H2 (Backend); Angular 21 standalone + signals + PrimeNG (Frontend).

## Global Constraints

- Repos y ramas: **Backend** en `c:\Users\tobia\Desktop\TUP\TESIS\Backend\.worktrees\print-report-audit` (branch `feat/print-report-audit`, desde `development`); **Frontend** en `c:\Users\tobia\Desktop\TUP\TESIS\FRONTEND-LABORATORIO\.worktrees\print-report-audit` (branch `feat/print-report-audit`, desde `development`). Todos los comandos de cada tarea asumen `cd` a la raíz de ese worktree.
- Regla #4 (ambos CLAUDE.md): todo mensaje de error visible al usuario va en español, sin FQCN/stack traces/nombres de clase. Los `DomainException` propios pueden propagar `getMessage()` porque ya están en español.
- No usar `@PreAuthorize` a nivel de método sin verificar que overridea correctamente el de clase (`SecretaryAttentionController` tiene `@PreAuthorize("hasAnyRole('SECRETARIA', 'ADMINISTRADOR')")` a nivel de clase — otros métodos ya widen/narrow con su propio `@PreAuthorize` de método).
- Java: seguir el layout `domain → application → infrastructure → presentation` existente en `modules/analitica/atencion` y `modules/analitica/postanalitica`.
- Angular: no usar NgRx store para esta pantalla — el historial de paciente (`patient-detail.page.ts`) ya usa un `signal` + `PatientHistoryService` inyectado directo, sin store/effects (precedente local ya establecido); seguir ese mismo patrón para la acción de imprimir, no forzar el patrón NgRx global.
- Todo migration Flyway nuevo: **verificar el máximo real de `Vnnn` en `src/main/resources/db/migration` al momento de crear el archivo** (no asumir el número de este plan es el final — al momento de escribir este plan el máximo era `V1072`, así que se usa `V1074` para dejar margen a otros PRs en curso, pero hay que re-chequear antes de aplicar).

---

## Parte A — Backend (`Backend/.worktrees/print-report-audit`)

### Task 0: Portar los fixes de historial de paciente ya hechos hoy (N+1 + copago/autorización)

`development` tiene la versión pre-fix de estos archivos (verificado: idéntica a la rama vieja `feat/patient-attention-history` antes del commit `566cb547`). Esta tarea aplica el mismo cambio conceptual sobre los archivos tal cual están en este worktree (que parte de `development`).

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/GetPatientAttentionHistoryUseCase.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/dto/response/PatientAttentionHistoryResponse.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/atencion/application/GetPatientAttentionHistoryUseCaseTest.java`

**Interfaces:**
- Produces: `GetPatientAttentionHistoryUseCase.AnalysisLine(Long analysisId, String analysisName, BigDecimal chargedPrice, DeliveryStatus deliveryStatus)` y `AttentionHistoryItem(..., BigDecimal copaymentAmount, Long authorizationNumber, List<AnalysisLine> analyses)` — usados por Task 7 más adelante (no romper esta forma).

- [ ] **Step 1: Extender el use case con nombre de análisis en batch + copago/autorización**

Reemplazar el contenido completo de `GetPatientAttentionHistoryUseCase.java` por:

```java
package lab.laboratorio.modules.analitica.atencion.application.usecase;

import lab.laboratorio.modules.analitica.atencion.domain.model.AnalysisAuthorization;
import lab.laboratorio.modules.analitica.atencion.domain.model.Attention;
import lab.laboratorio.modules.analitica.atencion.domain.model.AttentionState;
import lab.laboratorio.modules.analitica.atencion.domain.model.DeliveryStatus;
import lab.laboratorio.modules.analitica.atencion.domain.port.AnalysisDeliveryStatusPort;
import lab.laboratorio.modules.analitica.atencion.domain.port.AttentionRepositoryPort;
import lab.laboratorio.modules.analitica.domain.model.catalog.AnalysisProjection;
import lab.laboratorio.modules.analitica.domain.port.catalog.AnalysisLookupPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Historial de atenciones de un paciente para el detalle del paciente.
 *
 * <p>Por atención devuelve: nro, fecha, estado, protocolo, plan/cobertura, importe, copago,
 * N° de autorización y los análisis con nombre + precio cobrado (snapshot persistido al cerrar la
 * fase de secretaría) y su estado de entrega (derivado del protocolo). Atenciones previas al
 * snapshot de precios devuelven precio e importe en {@code null} (la UI muestra "—"); no se
 * recalcula en vivo para no acoplar el GET al pricing (que puede fallar si el plan particular no
 * está configurado).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GetPatientAttentionHistoryUseCase {

    private final AttentionRepositoryPort attentionRepo;
    private final AnalysisDeliveryStatusPort deliveryStatusPort;
    private final AnalysisLookupPort analysisLookupPort;

    public record Input(Long patientId, Long tenantId) {}

    public record AnalysisLine(Long analysisId, String analysisName, BigDecimal chargedPrice, DeliveryStatus deliveryStatus) {}

    public record AttentionHistoryItem(
            Long attentionId,
            String attentionNumber,
            Instant createdAt,
            AttentionState attentionState,
            Long protocolId,
            Long insurancePlanId,
            BigDecimal total,
            BigDecimal copaymentAmount,
            Long authorizationNumber,
            List<AnalysisLine> analyses) {}

    public List<AttentionHistoryItem> execute(Input in) {
        List<Attention> attentions = attentionRepo.findByPatient(in.patientId(), in.tenantId());

        List<Long> analysisIds = attentions.stream()
                .flatMap(att -> att.getAnalysisAuthorizations().stream())
                .filter(AnalysisAuthorization::isActive)
                .map(AnalysisAuthorization::getAnalysisId)
                .distinct()
                .toList();
        Map<Long, String> nameByAnalysisId = analysisIds.isEmpty()
                ? Map.of()
                : analysisLookupPort.findByIds(analysisIds).stream()
                        .collect(Collectors.toMap(AnalysisProjection::getId, AnalysisProjection::getName));

        return attentions.stream()
                .map(att -> toHistoryItem(att, in.tenantId(), nameByAnalysisId))
                .toList();
    }

    private AttentionHistoryItem toHistoryItem(Attention att, Long tenantId, Map<Long, String> nameByAnalysisId) {
        List<AnalysisAuthorization> activeAuths = att.getAnalysisAuthorizations().stream()
                .filter(AnalysisAuthorization::isActive)
                .toList();

        Map<Long, DeliveryStatus> deliveryByAnalysis = att.getProtocolId() == null
                ? Map.of()
                : deliveryStatusPort.findByProtocol(att.getProtocolId(), tenantId);

        List<AnalysisLine> lines = activeAuths.stream()
                .map(a -> new AnalysisLine(
                        a.getAnalysisId(),
                        nameByAnalysisId.get(a.getAnalysisId()),
                        a.getChargedPrice(),
                        deliveryByAnalysis.getOrDefault(a.getAnalysisId(), DeliveryStatus.PENDING)))
                .toList();

        // Importe total: sólo si hay snapshot de precios (atención posterior al feature). Suma los
        // precios persistidos + copago. Si ninguna autorización tiene precio (atención vieja) → null.
        boolean hasSnapshot = activeAuths.stream().anyMatch(a -> a.getChargedPrice() != null);
        BigDecimal total = null;
        if (hasSnapshot) {
            BigDecimal sum = activeAuths.stream()
                    .map(AnalysisAuthorization::getChargedPrice)
                    .filter(p -> p != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal copay = att.getCopaymentAmount() == null ? BigDecimal.ZERO : att.getCopaymentAmount();
            total = sum.add(copay);
        }

        return new AttentionHistoryItem(
                att.getId(),
                att.getAttentionNumber(),
                att.getCreatedAt(),
                att.getAttentionState(),
                att.getProtocolId(),
                att.getInsurancePlanId(),
                total,
                att.getCopaymentAmount(),
                att.getAuthorizationNumber(),
                lines);
    }
}
```

- [ ] **Step 2: Extender el DTO de presentación**

Reemplazar el contenido completo de `PatientAttentionHistoryResponse.java` por:

```java
package lab.laboratorio.modules.analitica.atencion.presentation.dto.response;

import lab.laboratorio.modules.analitica.atencion.application.usecase.GetPatientAttentionHistoryUseCase.AttentionHistoryItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Una atención del Historial del paciente. Los enums (attentionState, deliveryStatus) viajan por
 * su nombre; el front los traduce a español (regla #4). Precio/importe pueden ser null en
 * atenciones previas al snapshot de precios.
 */
public record PatientAttentionHistoryResponse(
        Long attentionId,
        String attentionNumber,
        Instant createdAt,
        String attentionState,
        Long protocolId,
        Long insurancePlanId,
        int analysisCount,
        BigDecimal total,
        BigDecimal copaymentAmount,
        Long authorizationNumber,
        List<AnalysisLineResponse> analyses) {

    public record AnalysisLineResponse(Long analysisId, String analysisName, BigDecimal chargedPrice, String deliveryStatus) {}

    public static PatientAttentionHistoryResponse from(AttentionHistoryItem item) {
        List<AnalysisLineResponse> lines = item.analyses().stream()
                .map(a -> new AnalysisLineResponse(
                        a.analysisId(),
                        a.analysisName(),
                        a.chargedPrice(),
                        a.deliveryStatus() == null ? null : a.deliveryStatus().name()))
                .toList();
        return new PatientAttentionHistoryResponse(
                item.attentionId(),
                item.attentionNumber(),
                item.createdAt(),
                item.attentionState() == null ? null : item.attentionState().name(),
                item.protocolId(),
                item.insurancePlanId(),
                lines.size(),
                item.total(),
                item.copaymentAmount(),
                item.authorizationNumber(),
                lines);
    }
}
```

- [ ] **Step 3: Actualizar el test existente**

En `GetPatientAttentionHistoryUseCaseTest.java`:
1. Agregar imports:
```java
import lab.laboratorio.modules.analitica.domain.model.catalog.AnalysisProjection;
import lab.laboratorio.modules.analitica.domain.port.catalog.AnalysisLookupPort;
```
2. Agregar el mock y ajustar `@InjectMocks`:
```java
    @Mock AttentionRepositoryPort attentionRepo;
    @Mock AnalysisDeliveryStatusPort deliveryStatusPort;
    @Mock AnalysisLookupPort analysisLookupPort;
    @InjectMocks GetPatientAttentionHistoryUseCase useCase;

    private AnalysisAuthorization auth(long analysisId, boolean active, BigDecimal price) {
        return AnalysisAuthorization.builder()
                .attentionId(1L).analysisId(analysisId).isAuthorized(false)
                .active(active).chargedPrice(price).build();
    }

    private static AnalysisProjection projection(long id, String name) {
        return new AnalysisProjection() {
            @Override public Long getId() { return id; }
            @Override public String getNbuCode() { return "N-" + id; }
            @Override public String getName() { return name; }
            @Override public String getUnit() { return "u"; }
        };
    }
```
3. En el primer test (`mapsAttention_withPriceSnapshot_andDeliveryStatus_fromProtocol`), agregar antes del `execute`:
```java
        when(analysisLookupPort.findByIds(List.of(101L, 102L))).thenReturn(List.of(
                projection(101L, "Hemograma Completo"),
                projection(102L, "Orina Completa")));
```
y agregar al final del test:
```java
        assertThat(item.analyses()).extracting(GetPatientAttentionHistoryUseCase.AnalysisLine::analysisName)
                .containsExactlyInAnyOrder("Hemograma Completo", "Orina Completa");
```

- [ ] **Step 4: Correr el test**

Run: `./mvnw -q -Dtest=GetPatientAttentionHistoryUseCaseTest test` (con `JAVA_HOME` apuntando a JDK 21, ver `reference_backend-jdk21-build`)
Expected: BUILD SUCCESS, sin fallos.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/GetPatientAttentionHistoryUseCase.java src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/dto/response/PatientAttentionHistoryResponse.java src/test/java/lab/laboratorio/modules/analitica/atencion/application/GetPatientAttentionHistoryUseCaseTest.java
git commit -m "feat(atencion): nombre de analisis en batch + copago/autorizacion en historial"
```

---

### Task 1: Extender `PortalReportQueryPort` con un método que no filtra por tipo FINAL

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/port/in/PortalReportQueryPort.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/repository/PatientReportJpaRepository.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PortalReportQueryAdapter.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PortalReportQueryAdapterTest.java` (crear si no existe)

**Interfaces:**
- Produces: `PortalReportQueryPort.findLatestReportIdsByProtocolIds(Long tenantId, Collection<Long> protocolIds): Map<Long, Long>` — protocolId → reportId del reporte de **mayor versionNumber** (PARTIAL o FINAL), usado por Task 6 (`PrintPatientReportUseCase`) y Task 7 (extensión del historial).
- Consumes: `findDownload(Long tenantId, Long reportId)` ya existente (sin cambios).

- [ ] **Step 1: Escribir el test (esperado a fallar por método inexistente)**

Crear `src/test/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PortalReportQueryAdapterTest.java`:

```java
package lab.laboratorio.modules.analitica.postanalitica.infrastructure.persistence.adapter;

import lab.laboratorio.modules.analitica.postanalitica.domain.model.ReportType;
import lab.laboratorio.modules.analitica.postanalitica.infrastructure.persistence.repository.PatientReportJpaRepository;
import lab.laboratorio.modules.analitica.postanalitica.infrastructure.persistence.repository.PatientReportJpaRepository.ProtocolReportProjection;
import lab.laboratorio.modules.analitica.postanalitica.infrastructure.persistence.repository.PostAnalyticalStudyJpaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortalReportQueryAdapterTest {

    @Mock PatientReportJpaRepository reportRepo;
    @Mock PostAnalyticalStudyJpaRepository studyRepo;
    @InjectMocks PortalReportQueryAdapter adapter;

    private static ProtocolReportProjection projection(Long protocolId, Long reportId, Integer version) {
        return new ProtocolReportProjection() {
            @Override public Long getProtocolId() { return protocolId; }
            @Override public Long getReportId() { return reportId; }
            @Override public Integer getVersionNumber() { return version; }
        };
    }

    @Test
    void findLatestReportIdsByProtocolIds_picksHighestVersionRegardlessOfType() {
        // Protocolo 500 tiene un PARTIAL (v1) y luego un FINAL (v2) — debe devolver el FINAL (más nuevo).
        // Protocolo 600 solo tiene un PARTIAL (v1) — debe devolverlo igual (no filtra por tipo).
        when(reportRepo.findLatestReportsByProtocolIds(1L, List.of(500L, 600L))).thenReturn(List.of(
                projection(500L, 10L, 1),
                projection(500L, 11L, 2),
                projection(600L, 20L, 1)));

        Map<Long, Long> result = adapter.findLatestReportIdsByProtocolIds(1L, List.of(500L, 600L));

        assertThat(result).containsEntry(500L, 11L);
        assertThat(result).containsEntry(600L, 20L);
    }

    @Test
    void findLatestReportIdsByProtocolIds_emptyInput_returnsEmptyMap() {
        Map<Long, Long> result = adapter.findLatestReportIdsByProtocolIds(1L, List.of());
        assertThat(result).isEmpty();
    }
}
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `./mvnw -q -Dtest=PortalReportQueryAdapterTest test`
Expected: FAIL — `cannot find symbol: method findLatestReportIdsByProtocolIds` (el método todavía no existe en el adapter/repo).

- [ ] **Step 3: Agregar el método al puerto**

En `PortalReportQueryPort.java`, agregar dentro de la interfaz (después de `findFinalReportIdsByProtocolIds`):

```java
    /**
     * Dado un conjunto de protocolos (del mismo tenant), devuelve protocolId → reportId del informe
     * de MAYOR versionNumber disponible para cada uno — sin filtrar por tipo (PARTIAL o FINAL). A
     * diferencia de {@link #findFinalReportIdsByProtocolIds}, un informe PARTIAL ya construye su
     * contenido con TODOS los resultados firmados del estudio hasta ese momento (ver
     * {@code ReportBuilderService.ensurePartialReport} → {@code buildForStudySigned}), por lo que la
     * versión más alta es siempre "lo más completo posible" — no un resultado suelto. Usado por
     * impresión de mostrador (staff), NO por el portal del paciente (que solo debe ver FINAL).
     */
    Map<Long, Long> findLatestReportIdsByProtocolIds(Long tenantId, Collection<Long> protocolIds);
```

- [ ] **Step 4: Agregar la query al repositorio**

En `PatientReportJpaRepository.java`, agregar (después de `findFinalReportsByProtocolIds`):

```java
    /**
     * Todos los informes activos (PARTIAL o FINAL) de un conjunto de protocolos, sin cargar
     * pdf_bytes. El adapter se queda con el de mayor versionNumber por protocolo — esa es siempre
     * la versión más completa disponible (ver javadoc de {@code findLatestReportIdsByProtocolIds}
     * en el puerto).
     */
    @Query("SELECT s.protocolId AS protocolId, r.id AS reportId, r.versionNumber AS versionNumber " +
           "FROM PatientReportJpaEntity r, PostAnalyticalStudyJpaEntity s " +
           "WHERE r.studyId = s.id AND r.tenantId = :tenantId AND s.tenantId = :tenantId " +
           "AND s.protocolId IN :protocolIds AND s.active = true AND r.active = true")
    List<ProtocolReportProjection> findLatestReportsByProtocolIds(
            @Param("tenantId") Long tenantId,
            @Param("protocolIds") java.util.Collection<Long> protocolIds);
```

- [ ] **Step 5: Implementar el método en el adapter**

En `PortalReportQueryAdapter.java`, agregar (después de `findFinalReportIdsByProtocolIds`):

```java
    @Override
    public Map<Long, Long> findLatestReportIdsByProtocolIds(Long tenantId, Collection<Long> protocolIds) {
        if (protocolIds == null || protocolIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, Long> reportByProtocol = new HashMap<>();
        Map<Long, Integer> bestVersionByProtocol = new HashMap<>();
        for (var row : reportRepo.findLatestReportsByProtocolIds(tenantId, protocolIds)) {
            Long protocolId = row.getProtocolId();
            int version = row.getVersionNumber() == null ? 0 : row.getVersionNumber();
            Integer best = bestVersionByProtocol.get(protocolId);
            if (best == null || version > best) {
                bestVersionByProtocol.put(protocolId, version);
                reportByProtocol.put(protocolId, row.getReportId());
            }
        }
        return reportByProtocol;
    }
```

(El import de `ReportType` en el adapter puede quedar sin uso ahora en este método nuevo — no lo saques del import general, sigue usándose en `findFinalReportIdsByProtocolIds`.)

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `./mvnw -q -Dtest=PortalReportQueryAdapterTest test`
Expected: BUILD SUCCESS.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/postanalitica/domain/port/in/PortalReportQueryPort.java src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/repository/PatientReportJpaRepository.java src/main/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PortalReportQueryAdapter.java src/test/java/lab/laboratorio/modules/analitica/postanalitica/infrastructure/persistence/adapter/PortalReportQueryAdapterTest.java
git commit -m "feat(postanalitica): findLatestReportIdsByProtocolIds sin filtro FINAL para impresion de staff"
```

---

### Task 2: Tabla y persistencia de `report_print_audit`

**Files:**
- Create: `src/main/resources/db/migration/V1074__create_report_print_audit.sql` (**re-verificar el máximo `Vnnn` real en `src/main/resources/db/migration` antes de nombrar el archivo** — puede haber avanzado desde que se escribió este plan)
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/entity/ReportPrintAuditJpaEntity.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/repository/ReportPrintAuditJpaRepository.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/domain/model/ReportPrintAudit.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/domain/port/ReportPrintAuditPort.java`
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapter.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapterTest.java`

**Interfaces:**
- Produces: `ReportPrintAuditPort.record(ReportPrintAudit audit): void` y `ReportPrintAuditPort.findLatestByProtocolIds(Long tenantId, Collection<Long> protocolIds): Map<Long, ReportPrintAudit>` (protocolId → última impresión) — usados por Task 6 y Task 7.
- Produces: `ReportPrintAudit(Long id, Long tenantId, Long reportId, Long protocolId, Long patientId, Long printedByUserId, Instant printedAt, Long branchId)`.

- [ ] **Step 1: Migración Flyway**

Crear `V1074__create_report_print_audit.sql` (ajustar el número si el máximo real cambió):

```sql
-- V1074__create_report_print_audit.sql
-- Auditoria de impresion de informes de resultado desde el historial de paciente (staff/secretaria).

CREATE TABLE report_print_audit (
    id                  BIGINT          NOT NULL AUTO_INCREMENT,
    tenant_id           BIGINT          NOT NULL,
    report_id           BIGINT          NOT NULL,
    protocol_id         BIGINT          NOT NULL,
    patient_id          BIGINT          NOT NULL,
    printed_by_user_id  BIGINT          NOT NULL,
    printed_at          DATETIME        NOT NULL,
    branch_id           BIGINT          NULL,
    created_at          DATETIME        NOT NULL,
    updated_at          DATETIME        NOT NULL,
    created_by          VARCHAR(120)    NOT NULL,
    updated_by          VARCHAR(120)    NOT NULL,
    deleted_at          DATETIME        NULL,
    active              BOOLEAN         NOT NULL DEFAULT TRUE,
    version             BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    INDEX idx_report_print_audit_protocol (tenant_id, protocol_id)
);
```

- [ ] **Step 2: Dominio — modelo y puerto**

Crear `atencion/domain/model/ReportPrintAudit.java`:

```java
package lab.laboratorio.modules.analitica.atencion.domain.model;

import lombok.Builder;

import java.time.Instant;

@Builder
public record ReportPrintAudit(
        Long id,
        Long tenantId,
        Long reportId,
        Long protocolId,
        Long patientId,
        Long printedByUserId,
        Instant printedAt,
        Long branchId) {}
```

Crear `atencion/domain/port/ReportPrintAuditPort.java`:

```java
package lab.laboratorio.modules.analitica.atencion.domain.port;

import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;

import java.util.Collection;
import java.util.Map;

public interface ReportPrintAuditPort {

    /** Registra una impresión. {@code printedAt} lo completa el caller (Instant.now()). */
    void record(ReportPrintAudit audit);

    /**
     * Última impresión (más reciente por printedAt) por protocolo, para el conjunto dado.
     * Los protocolos sin ninguna impresión no aparecen en el mapa.
     */
    Map<Long, ReportPrintAudit> findLatestByProtocolIds(Long tenantId, Collection<Long> protocolIds);
}
```

- [ ] **Step 3: Infraestructura — entidad, repositorio, adapter**

Crear `atencion/infrastructure/persistence/entity/ReportPrintAuditJpaEntity.java`:

```java
package lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lab.laboratorio.infrastructure.persistence.entity.BaseJpaEntity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

@Entity
@Table(
        name = "report_print_audit",
        indexes = { @Index(name = "idx_report_print_audit_protocol", columnList = "tenant_id, protocol_id") }
)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ReportPrintAuditJpaEntity extends BaseJpaEntity {

    @Column(name = "report_id", nullable = false)
    private Long reportId;

    @Column(name = "protocol_id", nullable = false)
    private Long protocolId;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(name = "printed_by_user_id", nullable = false)
    private Long printedByUserId;

    @Column(name = "printed_at", nullable = false)
    private Instant printedAt;

    @Column(name = "branch_id")
    private Long branchId;
}
```

Crear `atencion/infrastructure/persistence/repository/ReportPrintAuditJpaRepository.java`:

```java
package lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.repository;

import lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.entity.ReportPrintAuditJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ReportPrintAuditJpaRepository extends JpaRepository<ReportPrintAuditJpaEntity, Long> {

    @Query("SELECT e FROM ReportPrintAuditJpaEntity e " +
           "WHERE e.tenantId = :tenantId AND e.protocolId IN :protocolIds AND e.active = true " +
           "ORDER BY e.printedAt DESC")
    List<ReportPrintAuditJpaEntity> findByProtocolIdsOrderByPrintedAtDesc(
            @Param("tenantId") Long tenantId,
            @Param("protocolIds") Collection<Long> protocolIds);
}
```

Crear `atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapter.java`:

```java
package lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.adapter;

import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort;
import lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.entity.ReportPrintAuditJpaEntity;
import lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.repository.ReportPrintAuditJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ReportPrintAuditAdapter implements ReportPrintAuditPort {

    private final ReportPrintAuditJpaRepository repo;

    @Override
    public void record(ReportPrintAudit audit) {
        repo.save(ReportPrintAuditJpaEntity.builder()
                .reportId(audit.reportId())
                .protocolId(audit.protocolId())
                .patientId(audit.patientId())
                .printedByUserId(audit.printedByUserId())
                .printedAt(audit.printedAt())
                .branchId(audit.branchId())
                .build());
    }

    @Override
    public Map<Long, ReportPrintAudit> findLatestByProtocolIds(Long tenantId, Collection<Long> protocolIds) {
        if (protocolIds == null || protocolIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, ReportPrintAudit> latestByProtocol = new LinkedHashMap<>();
        for (var e : repo.findByProtocolIdsOrderByPrintedAtDesc(tenantId, protocolIds)) {
            // La query ya viene ordenada DESC por printedAt: la primera vez que vemos un
            // protocolId es la más reciente — las siguientes apariciones se ignoran.
            latestByProtocol.putIfAbsent(e.getProtocolId(), toDomain(e));
        }
        return latestByProtocol;
    }

    private ReportPrintAudit toDomain(ReportPrintAuditJpaEntity e) {
        return ReportPrintAudit.builder()
                .id(e.getId())
                .tenantId(e.getTenantId())
                .reportId(e.getReportId())
                .protocolId(e.getProtocolId())
                .patientId(e.getPatientId())
                .printedByUserId(e.getPrintedByUserId())
                .printedAt(e.getPrintedAt())
                .branchId(e.getBranchId())
                .build();
    }
}
```

- [ ] **Step 4: Test del adapter**

Crear `src/test/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapterTest.java`:

```java
package lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.adapter;

import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.entity.ReportPrintAuditJpaEntity;
import lab.laboratorio.modules.analitica.atencion.infrastructure.persistence.repository.ReportPrintAuditJpaRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportPrintAuditAdapterTest {

    @Mock ReportPrintAuditJpaRepository repo;
    @InjectMocks ReportPrintAuditAdapter adapter;

    @Test
    void record_savesEntityWithGivenFields() {
        Instant now = Instant.parse("2026-07-07T12:00:00Z");
        adapter.record(ReportPrintAudit.builder()
                .reportId(11L).protocolId(500L).patientId(5L)
                .printedByUserId(42L).printedAt(now).branchId(1L).build());

        verify(repo).save(any(ReportPrintAuditJpaEntity.class));
    }

    @Test
    void findLatestByProtocolIds_keepsFirstOccurrencePerProtocol() {
        // La query ya ordena DESC por printedAt: para protocolo 500 la primera fila (más nueva) gana.
        var newer = ReportPrintAuditJpaEntity.builder()
                .id(2L).tenantId(1L).reportId(11L).protocolId(500L).patientId(5L)
                .printedByUserId(42L).printedAt(Instant.parse("2026-07-07T12:00:00Z")).build();
        var older = ReportPrintAuditJpaEntity.builder()
                .id(1L).tenantId(1L).reportId(10L).protocolId(500L).patientId(5L)
                .printedByUserId(7L).printedAt(Instant.parse("2026-07-01T12:00:00Z")).build();
        when(repo.findByProtocolIdsOrderByPrintedAtDesc(1L, List.of(500L))).thenReturn(List.of(newer, older));

        Map<Long, ReportPrintAudit> result = adapter.findLatestByProtocolIds(1L, List.of(500L));

        assertThat(result.get(500L).printedByUserId()).isEqualTo(42L);
    }

    @Test
    void findLatestByProtocolIds_emptyInput_returnsEmptyMap() {
        assertThat(adapter.findLatestByProtocolIds(1L, List.of())).isEmpty();
    }
}
```

- [ ] **Step 5: Correr el test**

Run: `./mvnw -q -Dtest=ReportPrintAuditAdapterTest test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/main/resources/db/migration/V1074__create_report_print_audit.sql src/main/java/lab/laboratorio/modules/analitica/atencion/domain/model/ReportPrintAudit.java src/main/java/lab/laboratorio/modules/analitica/atencion/domain/port/ReportPrintAuditPort.java src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/entity/ReportPrintAuditJpaEntity.java src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/repository/ReportPrintAuditJpaRepository.java src/main/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapter.java src/test/java/lab/laboratorio/modules/analitica/atencion/infrastructure/persistence/adapter/ReportPrintAuditAdapterTest.java
git commit -m "feat(atencion): tabla y persistencia de report_print_audit"
```

---

### Task 3: Excepción de dominio para "sin informe disponible"

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/domain/exception/AttentionReportNotAvailableException.java`
- Modify: `src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java`
- Test: `src/test/java/lab/laboratorio/presentation/error/GlobalExceptionHandlerReportPrintTest.java`

**Interfaces:**
- Produces: `AttentionReportNotAvailableException` (extiende `DomainException`), constructor sin argumentos con mensaje fijo en español — usado por Task 6.

- [ ] **Step 1: Crear la excepción**

```java
package lab.laboratorio.modules.analitica.atencion.domain.exception;

import lab.laboratorio.domain.exception.DomainException;

public class AttentionReportNotAvailableException extends DomainException {
    public AttentionReportNotAvailableException() {
        super("Todavía no hay un resultado disponible para imprimir.");
    }
}
```

- [ ] **Step 2: Registrar el import en `GlobalExceptionHandler.java`**

Agregar junto a los demás imports de `atencion.domain.exception` (cerca de `import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionNotFoundException;`):

```java
import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionReportNotAvailableException;
```

- [ ] **Step 3: Agregar la excepción al handler de 404 existente**

En el `@ExceptionHandler({...})` que empieza en la línea con `AttentionNotFoundException.class` (método `handleNotFound`), agregar `AttentionReportNotAvailableException.class` a la lista (junto a `AttentionNotFoundException.class`). No crear un handler nuevo — reusa `handleNotFound`, que ya devuelve 404 con `exception.getMessage()`.

- [ ] **Step 4: Test de no-leak**

Crear `src/test/java/lab/laboratorio/presentation/error/GlobalExceptionHandlerReportPrintTest.java`:

```java
package lab.laboratorio.presentation.error;

import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionReportNotAvailableException;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerReportPrintTest {

    @Test
    void handleNotFound_reportNotAvailable_returns404InSpanishWithoutLeak() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        HttpServletRequest request = Mockito.mock(HttpServletRequest.class);
        Mockito.when(request.getRequestURI()).thenReturn("/api/v1/attentions/patient/5/protocol/500/report-print");

        ResponseEntity<ApiErrorResponse> response = handler.handleNotFound(
                new AttentionReportNotAvailableException(), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        String message = response.getBody().message();
        assertThat(message).doesNotContain("lab.laboratorio.");
        assertThat(message).doesNotContain("java.");
        assertThat(message).doesNotContain("No enum constant");
        assertThat(message).isEqualTo("Todavía no hay un resultado disponible para imprimir.");
    }
}
```

Ajustar el nombre del campo `message()` de `ApiErrorResponse` si en el código real se llama distinto (revisar `ApiErrorResponse.java` antes de este step si el nombre no coincide).

- [ ] **Step 5: Correr el test**

Run: `./mvnw -q -Dtest=GlobalExceptionHandlerReportPrintTest test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/domain/exception/AttentionReportNotAvailableException.java src/main/java/lab/laboratorio/presentation/error/GlobalExceptionHandler.java src/test/java/lab/laboratorio/presentation/error/GlobalExceptionHandlerReportPrintTest.java
git commit -m "feat(atencion): excepcion de dominio para informe no disponible al imprimir"
```

---

### Task 4: `PrintPatientReportUseCase`

**Files:**
- Create: `src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/PrintPatientReportUseCase.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/atencion/application/PrintPatientReportUseCaseTest.java`

**Interfaces:**
- Consumes: `AttentionRepositoryPort.findByProtocolId(Long protocolId, Long tenantId): Optional<Attention>` (ya existente); `PortalReportQueryPort.findLatestReportIdsByProtocolIds` / `.findDownload` (Task 1); `ReportPrintAuditPort.record` (Task 2); `CurrentUserProvider.requireUserId()`; `UserBranchAccessPort.findActiveBranchIdsForUser(Long userId, Long tenantId): List<Long>` (ya existente).
- Produces: `PrintPatientReportUseCase.Input(Long tenantId, Long patientId, Long protocolId)`, `execute(Input): byte[]` — usado por Task 6 (controller).

- [ ] **Step 1: Escribir el test (falla porque la clase no existe)**

```java
package lab.laboratorio.modules.analitica.atencion.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionReportNotAvailableException;
import lab.laboratorio.modules.analitica.atencion.domain.model.Attention;
import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.domain.port.AttentionRepositoryPort;
import lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort.PortalReportDownload;
import lab.laboratorio.modules.empresa.domain.port.UserBranchAccessPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PrintPatientReportUseCaseTest {

    @Mock AttentionRepositoryPort attentionRepo;
    @Mock PortalReportQueryPort portalReportQueryPort;
    @Mock ReportPrintAuditPort auditPort;
    @Mock CurrentUserProvider currentUserProvider;
    @Mock UserBranchAccessPort userBranchAccessPort;
    @InjectMocks PrintPatientReportUseCase useCase;

    private Attention attentionForPatient(Long patientId) {
        return Attention.builder().id(1L).tenantId(1L).patientId(patientId).protocolId(500L).build();
    }

    @Test
    void execute_happyPath_returnsBytesAndRecordsAudit() {
        when(attentionRepo.findByProtocolId(500L, 1L)).thenReturn(Optional.of(attentionForPatient(5L)));
        when(portalReportQueryPort.findLatestReportIdsByProtocolIds(1L, List.of(500L)))
                .thenReturn(Map.of(500L, 11L));
        when(portalReportQueryPort.findDownload(1L, 11L))
                .thenReturn(Optional.of(new PortalReportDownload(5L, new byte[]{1, 2, 3})));
        when(currentUserProvider.requireUserId()).thenReturn(42L);
        when(userBranchAccessPort.findActiveBranchIdsForUser(42L, 1L)).thenReturn(List.of(9L));

        byte[] result = useCase.execute(new PrintPatientReportUseCase.Input(1L, 5L, 500L));

        assertThat(result).containsExactly(1, 2, 3);
        ArgumentCaptor<ReportPrintAudit> captor = ArgumentCaptor.forClass(ReportPrintAudit.class);
        verify(auditPort).record(captor.capture());
        assertThat(captor.getValue().reportId()).isEqualTo(11L);
        assertThat(captor.getValue().protocolId()).isEqualTo(500L);
        assertThat(captor.getValue().patientId()).isEqualTo(5L);
        assertThat(captor.getValue().printedByUserId()).isEqualTo(42L);
        assertThat(captor.getValue().branchId()).isEqualTo(9L);
    }

    @Test
    void execute_protocolBelongsToDifferentPatient_throwsNotAvailable() {
        when(attentionRepo.findByProtocolId(500L, 1L)).thenReturn(Optional.of(attentionForPatient(999L)));

        assertThatThrownBy(() -> useCase.execute(new PrintPatientReportUseCase.Input(1L, 5L, 500L)))
                .isInstanceOf(AttentionReportNotAvailableException.class);
    }

    @Test
    void execute_protocolNotFound_throwsNotAvailable() {
        when(attentionRepo.findByProtocolId(500L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.execute(new PrintPatientReportUseCase.Input(1L, 5L, 500L)))
                .isInstanceOf(AttentionReportNotAvailableException.class);
    }

    @Test
    void execute_noReportAvailable_throwsNotAvailable() {
        when(attentionRepo.findByProtocolId(500L, 1L)).thenReturn(Optional.of(attentionForPatient(5L)));
        when(portalReportQueryPort.findLatestReportIdsByProtocolIds(1L, List.of(500L))).thenReturn(Map.of());

        assertThatThrownBy(() -> useCase.execute(new PrintPatientReportUseCase.Input(1L, 5L, 500L)))
                .isInstanceOf(AttentionReportNotAvailableException.class);
    }
}
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `./mvnw -q -Dtest=PrintPatientReportUseCaseTest test`
Expected: FAIL — `PrintPatientReportUseCase` no existe (error de compilación).

- [ ] **Step 3: Implementar el caso de uso**

```java
package lab.laboratorio.modules.analitica.atencion.application.usecase;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.modules.analitica.atencion.domain.exception.AttentionReportNotAvailableException;
import lab.laboratorio.modules.analitica.atencion.domain.model.Attention;
import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.domain.port.AttentionRepositoryPort;
import lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort.PortalReportDownload;
import lab.laboratorio.modules.empresa.domain.port.UserBranchAccessPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Imprime (descarga con fines de impresión en mostrador) el informe más reciente disponible
 * (PARTIAL o FINAL) para un protocolo del historial de paciente, dejando registro de auditoría.
 *
 * <p>NO genera el PDF — reusa {@link PortalReportQueryPort}, el mismo puerto cross-módulo de
 * post-analítica que consume el portal del paciente (KAN-168), con el método
 * {@code findLatestReportIdsByProtocolIds} que sí incluye informes PARTIAL (a diferencia del que
 * usa el portal, que solo expone FINAL).</p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PrintPatientReportUseCase {

    private final AttentionRepositoryPort attentionRepo;
    private final PortalReportQueryPort portalReportQueryPort;
    private final ReportPrintAuditPort auditPort;
    private final CurrentUserProvider currentUserProvider;
    private final UserBranchAccessPort userBranchAccessPort;

    public record Input(Long tenantId, Long patientId, Long protocolId) {}

    public byte[] execute(Input in) {
        Attention attention = attentionRepo.findByProtocolId(in.protocolId(), in.tenantId())
                .orElseThrow(AttentionReportNotAvailableException::new);
        if (!in.patientId().equals(attention.getPatientId())) {
            // No 403: no confirmamos si el protocolo existe para otro paciente/tenant.
            throw new AttentionReportNotAvailableException();
        }

        Long reportId = portalReportQueryPort
                .findLatestReportIdsByProtocolIds(in.tenantId(), List.of(in.protocolId()))
                .get(in.protocolId());
        if (reportId == null) {
            throw new AttentionReportNotAvailableException();
        }

        PortalReportDownload download = portalReportQueryPort.findDownload(in.tenantId(), reportId)
                .orElseThrow(AttentionReportNotAvailableException::new);

        // Primero los bytes, recién después la auditoría — si algo de arriba falla, no queda
        // registro de una impresión que en realidad no se sirvió.
        byte[] pdfBytes = download.pdfBytes();

        Long userId = currentUserProvider.requireUserId();
        Long branchId = userBranchAccessPort.findActiveBranchIdsForUser(userId, in.tenantId())
                .stream().findFirst().orElse(null);

        auditPort.record(ReportPrintAudit.builder()
                .tenantId(in.tenantId())
                .reportId(reportId)
                .protocolId(in.protocolId())
                .patientId(in.patientId())
                .printedByUserId(userId)
                .printedAt(Instant.now())
                .branchId(branchId)
                .build());

        return pdfBytes;
    }
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `./mvnw -q -Dtest=PrintPatientReportUseCaseTest test`
Expected: BUILD SUCCESS, 4 tests OK.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/PrintPatientReportUseCase.java src/test/java/lab/laboratorio/modules/analitica/atencion/application/PrintPatientReportUseCaseTest.java
git commit -m "feat(atencion): PrintPatientReportUseCase con auditoria de impresion"
```

---

### Task 5: Extender el historial con `reportAvailable` / `lastPrintedAt` / `lastPrintedBy`

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/GetPatientAttentionHistoryUseCase.java`
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/dto/response/PatientAttentionHistoryResponse.java`
- Modify: `src/test/java/lab/laboratorio/modules/analitica/atencion/application/GetPatientAttentionHistoryUseCaseTest.java`

**Interfaces:**
- Consumes: `PortalReportQueryPort.findLatestReportIdsByProtocolIds` (Task 1), `ReportPrintAuditPort.findLatestByProtocolIds` (Task 2), `UserSummaryLookupPort.findByIds(List<Long> userIds, Long tenantId): List<UserSummary>` (`UserSummary(Long id, String fullName)`, ya existente en `lab.laboratorio.modules.empresa.domain.port.UserSummaryLookupPort` — batch, no 1-a-1; lista vacía de ids → lista vacía sin hit a DB).
- Produces: `AttentionHistoryItem` con 3 campos nuevos; usado por Task 6 (FE ya espera estos campos en el DTO).

- [ ] **Step 1: Inyectar los puertos nuevos en el use case**

Agregar campos al `GetPatientAttentionHistoryUseCase` (constructor por Lombok, agregar tras `analysisLookupPort`):

```java
    private final lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort portalReportQueryPort;
    private final lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort reportPrintAuditPort;
    private final lab.laboratorio.modules.empresa.domain.port.UserSummaryLookupPort userSummaryLookupPort;
```

- [ ] **Step 2: Extender `AttentionHistoryItem` y el mapeo en `execute`**

Agregar los 3 campos al record `AttentionHistoryItem` (después de `authorizationNumber`):
```java
            Boolean reportAvailable,
            java.time.Instant lastPrintedAt,
            String lastPrintedBy,
```

En `execute(Input in)`, después de calcular `nameByAnalysisId`, agregar:
```java
        List<Long> protocolIds = attentions.stream()
                .map(Attention::getProtocolId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        Map<Long, Long> latestReportByProtocol = protocolIds.isEmpty()
                ? Map.of()
                : portalReportQueryPort.findLatestReportIdsByProtocolIds(in.tenantId(), protocolIds);
        Map<Long, ReportPrintAudit> lastPrintByProtocol = protocolIds.isEmpty()
                ? Map.of()
                : reportPrintAuditPort.findLatestByProtocolIds(in.tenantId(), protocolIds);

        List<Long> printerUserIds = lastPrintByProtocol.values().stream()
                .map(ReportPrintAudit::printedByUserId)
                .distinct()
                .toList();
        Map<Long, String> printerNameByUserId = printerUserIds.isEmpty()
                ? Map.of()
                : userSummaryLookupPort.findByIds(printerUserIds, in.tenantId()).stream()
                        .collect(Collectors.toMap(UserSummaryLookupPort.UserSummary::id, UserSummaryLookupPort.UserSummary::fullName));
```

Agregar los imports:
```java
import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort;
import lab.laboratorio.modules.empresa.domain.port.UserSummaryLookupPort;
```

Y agregar los 3 campos nuevos como atributos inyectados por Lombok (tras `analysisLookupPort`):
```java
    private final PortalReportQueryPort portalReportQueryPort;
    private final ReportPrintAuditPort reportPrintAuditPort;
    private final UserSummaryLookupPort userSummaryLookupPort;
```

Pasar los 3 mapas a `toHistoryItem(att, in.tenantId(), nameByAnalysisId, latestReportByProtocol, lastPrintByProtocol, printerNameByUserId)`, ajustando la firma privada para construir los 3 campos nuevos:
```java
        Long protocolId = att.getProtocolId();
        boolean reportAvailable = protocolId != null && latestReportByProtocol.containsKey(protocolId);
        ReportPrintAudit lastPrint = protocolId != null ? lastPrintByProtocol.get(protocolId) : null;
        Instant lastPrintedAt = lastPrint != null ? lastPrint.printedAt() : null;
        String lastPrintedBy = lastPrint != null ? printerNameByUserId.get(lastPrint.printedByUserId()) : null;
```

Y sumar `reportAvailable, lastPrintedAt, lastPrintedBy` al `new AttentionHistoryItem(...)` final, en el mismo orden que en el record.

- [ ] **Step 3: Extender el DTO `PatientAttentionHistoryResponse`**

Agregar `Boolean reportAvailable, Instant lastPrintedAt, String lastPrintedBy` al record (después de `authorizationNumber`) y pasarlos en `from(...)` desde `item.reportAvailable()`, `item.lastPrintedAt()`, `item.lastPrintedBy()`.

- [ ] **Step 4: Extender el test existente**

Agregar a los imports de `GetPatientAttentionHistoryUseCaseTest.java`:
```java
import lab.laboratorio.modules.analitica.atencion.domain.model.ReportPrintAudit;
import lab.laboratorio.modules.analitica.atencion.domain.port.ReportPrintAuditPort;
import lab.laboratorio.modules.analitica.postanalitica.domain.port.in.PortalReportQueryPort;
import lab.laboratorio.modules.empresa.domain.port.UserSummaryLookupPort;
```

En `GetPatientAttentionHistoryUseCaseTest`, agregar mocks de los 3 puertos nuevos (`@Mock PortalReportQueryPort portalReportQueryPort;`, `@Mock ReportPrintAuditPort reportPrintAuditPort;`, `@Mock UserSummaryLookupPort userSummaryLookupPort;`) y, en el primer test, stubbear:
```java
        when(portalReportQueryPort.findLatestReportIdsByProtocolIds(1L, List.of(99L))).thenReturn(Map.of(99L, 11L));
        var printAudit = ReportPrintAudit.builder()
                .tenantId(1L).reportId(11L).protocolId(99L).patientId(5L)
                .printedByUserId(42L).printedAt(Instant.parse("2026-07-06T15:00:00Z")).build();
        when(reportPrintAuditPort.findLatestByProtocolIds(1L, List.of(99L))).thenReturn(Map.of(99L, printAudit));
        when(userSummaryLookupPort.findByIds(List.of(42L), 1L))
                .thenReturn(List.of(new UserSummaryLookupPort.UserSummary(42L, "Ana Pérez")));
```
y assertar:
```java
        assertThat(item.reportAvailable()).isTrue();
        assertThat(item.lastPrintedAt()).isEqualTo(Instant.parse("2026-07-06T15:00:00Z"));
        assertThat(item.lastPrintedBy()).isEqualTo("Ana Pérez");
```
En el segundo test (`oldAttention_withoutSnapshot...`, `protocolId = null`), no hace falta stubbear los 3 puertos nuevos — con `protocolIds` vacío el use case no los invoca, y Mockito en modo estricto (`@ExtendWith(MockitoExtension.class)`) solo falla por *stubs no usados*, no por mocks sin ninguna interacción.

- [ ] **Step 5: Correr el test**

Run: `./mvnw -q -Dtest=GetPatientAttentionHistoryUseCaseTest test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/application/usecase/GetPatientAttentionHistoryUseCase.java src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/dto/response/PatientAttentionHistoryResponse.java src/test/java/lab/laboratorio/modules/analitica/atencion/application/GetPatientAttentionHistoryUseCaseTest.java
git commit -m "feat(atencion): historial expone disponibilidad y ultima impresion del informe"
```

---

### Task 6: Endpoint + seguridad

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionController.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionReportPrintSecurityTest.java`

**Interfaces:**
- Produces: `GET /api/v1/attentions/patient/{patientId}/protocol/{protocolId}/report-print` → `byte[]` (PDF), roles `SECRETARIA, ADMINISTRADOR, BIOQUIMICO, TECNICO_LABORATORIO`. Usado por Task 8 (FE service).

- [ ] **Step 1: Inyectar el use case en el controller**

Agregar el campo `private final PrintPatientReportUseCase printPatientReportUseCase;` al constructor (vía `@RequiredArgsConstructor`, agregarlo como atributo más — no reordenar los existentes, agregarlo al final de la lista de atributos para no romper el orden posicional que ya usa `SecretaryAttentionControllerTest` al construir el controller con `new SecretaryAttentionController(null, null, ...)`).

- [ ] **Step 2: Agregar el endpoint**

Agregar después del método `getPatientHistory` (línea ~140):

```java
    @GetMapping("/patient/{patientId}/protocol/{protocolId}/report-print")
    @PreAuthorize("hasAnyRole('SECRETARIA', 'ADMINISTRADOR', 'BIOQUIMICO', 'TECNICO_LABORATORIO')")
    public void printPatientReport(@PathVariable Long patientId, @PathVariable Long protocolId,
                                    jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        Long tenantId = TenantContext.requireTenantId();
        byte[] pdf = printPatientReportUseCase.execute(
                new PrintPatientReportUseCase.Input(tenantId, patientId, protocolId));
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "inline; filename=\"informe-" + protocolId + ".pdf\"");
        response.setContentLength(pdf.length);
        response.getOutputStream().write(pdf);
    }
```

- [ ] **Step 3: Actualizar `SecretaryAttentionControllerTest`**

El constructor posicional de `SecretaryAttentionController` en `setUp()` (líneas 73-87) necesita un `null` extra al final de la lista de argumentos para el nuevo `printPatientReportUseCase` (el test no ejercita este endpoint, solo necesita que el constructor compile).

- [ ] **Step 4: Escribir el test de seguridad (falla porque el endpoint no está gateado todavía verificado)**

Crear `src/test/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionReportPrintSecurityTest.java`, siguiendo el patrón de `TenantDeterminationOverrideControllerSecurityTest`:

```java
package lab.laboratorio.modules.analitica.atencion.presentation;

import lab.laboratorio.infrastructure.security.CurrentUserProvider;
import lab.laboratorio.infrastructure.tenancy.JwtTenantResolver;
import lab.laboratorio.modules.analitica.atencion.application.usecase.PrintPatientReportUseCase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class SecretaryAttentionReportPrintSecurityTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    private MockMvc mockMvc;

    @MockitoBean private JwtTenantResolver jwtTenantResolver;
    @MockitoBean private CurrentUserProvider currentUserProvider;
    @MockitoBean private PrintPatientReportUseCase printPatientReportUseCase;

    @BeforeEach
    void setUp() {
        when(jwtTenantResolver.resolve(any())).thenReturn(Optional.of(1L));
        when(printPatientReportUseCase.execute(any())).thenReturn(new byte[]{1, 2, 3});

        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
    }

    @Test
    @WithMockUser(roles = "SECRETARIA")
    void printReport_asSecretaria_isOk() throws Exception {
        mockMvc.perform(get("/api/v1/attentions/patient/5/protocol/500/report-print"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "BIOQUIMICO")
    void printReport_asBioquimico_isOk() throws Exception {
        mockMvc.perform(get("/api/v1/attentions/patient/5/protocol/500/report-print"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "EXTRACTOR")
    void printReport_asExtractor_isForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/attentions/patient/5/protocol/500/report-print"))
                .andExpect(status().isForbidden());
    }
}
```

- [ ] **Step 5: Correr el test**

Run: `./mvnw -q -Dtest=SecretaryAttentionReportPrintSecurityTest,SecretaryAttentionControllerTest test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionController.java src/test/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionControllerTest.java src/test/java/lab/laboratorio/modules/analitica/atencion/presentation/SecretaryAttentionReportPrintSecurityTest.java
git commit -m "feat(atencion): endpoint de impresion de informe con roles de staff"
```

---

### Task 7: Suite completa + boot MySQL

- [ ] **Step 1: Correr la suite completa del módulo**

Run: `./mvnw -q test`
Expected: BUILD SUCCESS, 0 failures (aparte de las fallas pre-existentes ya conocidas de `development`, ver memoria `reference_v1060-authorized-h2-boolean` si aparecen).

- [ ] **Step 2: Verificar boot contra MySQL real**

Seguir el recipe de `reference_mysql-boot-verification` (perfil `local`, schema fresco vía `$env:SPRING_DATASOURCE_URL`) para confirmar que la migración `V1074` aplica limpio contra MySQL (no solo H2) — la migración usa `DATETIME`/`BOOLEAN` estándar, sin sintaxis específica de H2, así que no debería haber sorpresas, pero es el paso que ya rompió otras veces (`ADD COLUMN IF NOT EXISTS`).

- [ ] **Step 3: Commit (si el paso anterior requirió algún ajuste)**

Solo si hubo cambios: `git add -A && git commit -m "fix(atencion): ajuste post boot MySQL de report_print_audit"`.

---

## Parte B — Frontend (`FRONTEND-LABORATORIO/.worktrees/print-report-audit`)

### Task 0: Portar los 5 fixes de historial/form ya hechos hoy (adaptados a la estructura actual)

`development` ya tiene un refactor de header (`ui-page-header` / `PageHeaderComponent`) que la rama vieja `feat/pacientes-rework` no tenía todavía — esta tarea aplica el mismo cambio conceptual sobre la estructura ACTUAL de estos archivos (leída y verificada en este worktree), no un cherry-pick literal del commit viejo.

**Files:**
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`
- Modify: `src/app/features/pacientes/models/patient-history.model.ts`
- Modify: `src/app/features/pacientes/pages/patient-form/patient-form.page.ts`

**Interfaces:**
- Produces: `PatientHistoryAnalysis.analysisName: string | null`, `PatientHistoryItem.copaymentAmount`/`authorizationNumber: number | null` — consumidos por Task 3 más adelante (no romper esta forma).

- [ ] **Step 1: Rename de columna + fix del N+1 de nombre de análisis (`patient-detail.page.ts`)**

Reemplazar:
```ts
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DniPipe } from '@shared/pipes/dni.pipe';
```
por:
```ts
import { DniPipe } from '@shared/pipes/dni.pipe';
```

Reemplazar:
```ts
import { AnalysisService } from '@features/analitica/services/analysis.service';
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
```
por:
```ts
import {
  loadPatient, loadPatientFailure, clearSelectedPatient, togglePatientActive,
} from '../../store/patient.actions';
```

Reemplazar:
```ts
  private readonly historyService = inject(PatientHistoryService);
  private readonly analysisService = inject(AnalysisService);
  readonly canMutate = this.perms.canMutate;
```
por:
```ts
  private readonly historyService = inject(PatientHistoryService);
  readonly canMutate = this.perms.canMutate;
```

Reemplazar:
```ts
  readonly history = signal<PatientHistoryItem[]>([]);
  private readonly analysisNameById = signal<ReadonlyMap<number, string>>(new Map());
  readonly historyColumns: readonly TableColumn[] = [
```
por:
```ts
  readonly history = signal<PatientHistoryItem[]>([]);
  readonly historyColumns: readonly TableColumn[] = [
```

Reemplazar el método completo:
```ts
  /** Carga el historial y resuelve los nombres de los análisis (el BE devuelve sólo el id). */
  private loadHistory(patientId: number): void {
    this.historyService.getHistory(patientId).subscribe({
      next: (items) => {
        this.history.set(items);
        const ids = [...new Set(items.flatMap((i) => i.analyses.map((a) => a.analysisId)))];
        if (ids.length === 0) return;
        forkJoin(
          ids.map((id) => this.analysisService.getById(id).pipe(catchError(() => of(null)))),
        ).subscribe((details) => {
          const map = new Map<number, string>();
          details.forEach((d, idx) => { if (d) map.set(ids[idx], d.name); });
          this.analysisNameById.set(map);
        });
      },
      error: () => { /* historial vacío; no se expone el error al usuario */ },
    });
  }

  /** Nombre del análisis resuelto por id (fallback "#id" mientras carga). */
  analysisName(id: number): string {
    return this.analysisNameById().get(id) ?? `#${id}`;
  }
```
por:
```ts
  private loadHistory(patientId: number): void {
    this.historyService.getHistory(patientId).subscribe({
      next: (items) => this.history.set(items),
      error: () => { /* historial vacío; no se expone el error al usuario */ },
    });
  }
```

En el template, reemplazar:
```
                        <tr><th>Análisis</th><th class="cv-center">Valor</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        @for (a of row.analyses; track a.analysisId) {
                          <tr>
                            <td>{{ analysisName(a.analysisId) }}</td>
```
por:
```
                        <tr><th>Análisis</th><th class="cv-center">Importe cobrado</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        @for (a of row.analyses; track a.analysisId) {
                          <tr>
                            <td>{{ a.analysisName ?? ('#' + a.analysisId) }}</td>
```

- [ ] **Step 2: Grid de dirección label/valor + copago/N° autorización en el detalle**

Reemplazar:
```
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-1">Domicilio</div>
                <div>{{ addressLine(p) || 'Sin domicilio cargado' }}</div>
              </div>
```
por:
```
              <div class="mt-4 pt-3 border-t">
                <div class="text-xs text-surface-500 mb-2">Domicilio</div>
                @if (primaryAddress(p); as a) {
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                    <div><div class="text-xs text-surface-500">Calle</div><div>{{ a.street || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Número</div><div>{{ a.streetNumber || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Piso/Depto</div><div>{{ a.apartment || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Barrio</div><div>{{ a.neighborhood || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Ciudad</div><div>{{ a.city || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Provincia</div><div>{{ a.province || '—' }}</div></div>
                    <div><div class="text-xs text-surface-500">Código postal</div><div>{{ a.zipCode || '—' }}</div></div>
                  </div>
                } @else {
                  <div class="cv-muted">Sin domicilio cargado</div>
                }
              </div>
```

Reemplazar el método:
```ts
  /** Domicilio del paciente en una línea (primera dirección). */
  addressLine(p: Patient): string {
    const a = p.addresses[0];
    if (!a) return '';
    const head = [a.street, a.streetNumber].filter(Boolean).join(' ');
    const tail = [a.neighborhood, a.city, a.province].filter(Boolean).join(', ');
    return [head, tail].filter(Boolean).join(' · ');
  }
```
por:
```ts
  /** Dirección a mostrar: activa+primaria → activa → primera cargada. */
  primaryAddress(p: Patient): Address | undefined {
    return p.addresses.find((a) => a.active && a.isPrimary) ?? p.addresses.find((a) => a.active) ?? p.addresses[0];
  }
```

Actualizar el import de modelos, de:
```ts
import { ContactType, Patient } from '../../models/patient.model';
```
a:
```ts
import { Address, ContactType, Patient } from '../../models/patient.model';
```

En el template, reemplazar:
```
                  <ng-template uiRowExpansion let-row>
                    <div class="text-xs text-surface-500 mb-2 font-medium">
                      Protocolo {{ row.protocolId ? ('P-' + row.protocolId) : '—' }}
                    </div>
```
por:
```
                  <ng-template uiRowExpansion let-row>
                    <div class="flex flex-wrap gap-x-6 gap-y-1 mb-2">
                      <div class="text-xs font-medium text-surface-700">
                        Protocolo {{ row.protocolId ? ('P-' + row.protocolId) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        Copago: {{ row.copaymentAmount != null ? (row.copaymentAmount | currencyAr) : '—' }}
                      </div>
                      <div class="text-xs text-surface-500">
                        N° autorización: {{ row.authorizationNumber ?? '—' }}
                      </div>
                    </div>
```

- [ ] **Step 3: Modelo `patient-history.model.ts`**

Reemplazar:
```ts
// Historial de atenciones de un paciente (GET /api/v1/attentions/patient/{id}/history).
// El BE devuelve analysisId; el nombre lo resuelve el front con AnalysisService.

export type DeliveryStatus = 'DELIVERED' | 'IN_PROCESS' | 'PENDING' | 'CANCELED';

export interface PatientHistoryAnalysis {
  analysisId: number;
  /** Precio cobrado (snapshot). null en atenciones previas al feature. */
  chargedPrice: number | null;
  deliveryStatus: DeliveryStatus | null;
}

export interface PatientHistoryItem {
  attentionId: number;
  attentionNumber: string;
  createdAt: string | null;
  attentionState: string | null;
  protocolId: number | null;
  insurancePlanId: number | null;
  analysisCount: number;
  /** Importe total (snapshot + copago). null si la atención no tiene snapshot. */
  total: number | null;
  analyses: PatientHistoryAnalysis[];
}
```
por:
```ts
// Historial de atenciones de un paciente (GET /api/v1/attentions/patient/{id}/history).

export type DeliveryStatus = 'DELIVERED' | 'IN_PROCESS' | 'PENDING' | 'CANCELED';

export interface PatientHistoryAnalysis {
  analysisId: number;
  analysisName: string | null;
  /** Precio cobrado (snapshot). null en atenciones previas al feature. */
  chargedPrice: number | null;
  deliveryStatus: DeliveryStatus | null;
}

export interface PatientHistoryItem {
  attentionId: number;
  attentionNumber: string;
  createdAt: string | null;
  attentionState: string | null;
  protocolId: number | null;
  insurancePlanId: number | null;
  analysisCount: number;
  /** Importe total (snapshot + copago). null si la atención no tiene snapshot. */
  total: number | null;
  copaymentAmount: number | null;
  authorizationNumber: number | null;
  /** true si hay al menos un informe firmado (parcial o final) disponible para imprimir. */
  reportAvailable: boolean;
  lastPrintedAt: string | null;
  lastPrintedBy: string | null;
  analyses: PatientHistoryAnalysis[];
}
```

(Los campos `reportAvailable`/`lastPrintedAt`/`lastPrintedBy` los agrega esta tarea porque el modelo es un solo archivo — se usan recién en Task 2/3, pero conviene declararlos ya para no volver a tocar este archivo dos veces.)

- [ ] **Step 4: Navegación `returnTo` — botón Editar del detalle**

En `patient-detail.page.ts`, reemplazar:
```
            <a [routerLink]="['/pacientes', p.id, 'editar']">
              <p-button severity="secondary" [outlined]="true" label="Editar" />
            </a>
```
por:
```
            <a [routerLink]="['/pacientes', p.id, 'editar']" [queryParams]="{ returnTo: '/pacientes/' + p.id }">
              <p-button severity="secondary" [outlined]="true" label="Editar" />
            </a>
```

- [ ] **Step 5: Navegación `returnTo` — `onBack()` de `patient-form.page.ts`**

Reemplazar:
```ts
  onBack(): void {
    if (!this.form.dirty) {
      this.router.navigate(['/pacientes']);
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.router.navigate(['/pacientes']),
    });
  }
```
por:
```ts
  private navigateBack(): void {
    const target = this.returnTo();
    if (target && target.startsWith('/')) {
      this.router.navigateByUrl(target);
    } else {
      this.router.navigateByUrl('/pacientes');
    }
  }

  onBack(): void {
    if (!this.form.dirty) {
      this.navigateBack();
      return;
    }
    this.confirm.confirm({
      header: '¿Descartar cambios?',
      message: 'Vas a perder los cambios sin guardar.',
      acceptLabel: 'Descartar',
      rejectLabel: 'Seguir editando',
      accept: () => this.navigateBack(),
    });
  }
```

(El handler de éxito ya existente en el constructor —líneas 287-297— ya respeta `returnTo` con el patrón `target && target.startsWith('/')`; no hace falta tocarlo, solo `onBack()` lo tenía roto.)

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores (exit 0).

- [ ] **Step 7: Commit**

```bash
git add src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts src/app/features/pacientes/models/patient-history.model.ts src/app/features/pacientes/pages/patient-form/patient-form.page.ts
git commit -m "feat(pacientes): pulido de historial, domicilio y navegacion post-edicion"
```

---

### Task 1: Servicio de impresión + gating del botón en el historial

**Files:**
- Modify: `src/app/features/pacientes/services/patient-history.service.ts`
- Modify: `src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts`

**Interfaces:**
- Produces: `PatientHistoryService.printReport(patientId: number, protocolId: number): Observable<Blob>` — usado por el componente.

- [ ] **Step 1: Agregar el método al servicio**

En `patient-history.service.ts`, agregar:
```ts
  /** Descarga el PDF del informe más reciente disponible (parcial o final) de un protocolo. */
  printReport(patientId: number, protocolId: number): Observable<Blob> {
    return this.http.get(`/api/v1/attentions/patient/${patientId}/protocol/${protocolId}/report-print`, {
      responseType: 'blob',
    });
  }
```

- [ ] **Step 2: Botón "Imprimir estudio" + confirm de reimpresión + apertura del PDF**

En `patient-detail.page.ts`, dentro del `<ng-template uiRowExpansion let-row>`, después del bloque de copago/N° autorización agregado en Task 0 y antes de la tabla `hist-detail`, agregar:

```
                    @if (row.reportAvailable) {
                      <div class="mb-2 flex items-center gap-2">
                        <p-button
                          size="small"
                          icon="pi pi-print"
                          label="Imprimir estudio"
                          [outlined]="true"
                          (onClick)="printReport(row)" />
                        @if (row.lastPrintedBy) {
                          <span class="text-xs text-surface-500"
                                [pTooltip]="'Impreso el ' + (row.lastPrintedAt | date:'dd/MM/yy HH:mm') + ' por ' + row.lastPrintedBy">
                            <i class="pi pi-check-circle text-green-600"></i> Impreso
                          </span>
                        }
                      </div>
                    }
```

Agregar `TooltipModule` de PrimeNG a los imports del componente (`import { TooltipModule } from 'primeng/tooltip';` y sumarlo al array `imports` del `@Component`).

Agregar el método al componente (junto a `coverageLabel`):
```ts
  printReport(row: PatientHistoryItem): void {
    if (row.protocolId == null) return;
    const patientId = this.patient()?.id;
    if (patientId == null) return;
    if (row.lastPrintedBy) {
      this.confirm.confirm({
        header: 'Reimprimir estudio',
        message: `Ya se imprimió el ${row.lastPrintedAt} por ${row.lastPrintedBy}. ¿Reimprimir igual?`,
        acceptLabel: 'Reimprimir',
        rejectLabel: 'Cancelar',
        accept: () => this.downloadAndOpenReport(patientId, row.protocolId!),
      });
    } else {
      this.downloadAndOpenReport(patientId, row.protocolId);
    }
  }

  private downloadAndOpenReport(patientId: number, protocolId: number): void {
    this.historyService.printReport(patientId, protocolId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        this.loadHistory(patientId);
      },
      error: () => { /* toast genérico ya cubierto por el interceptor global de errores HTTP */ },
    });
  }
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/pacientes/services/patient-history.service.ts src/app/features/pacientes/pages/patient-detail/patient-detail.page.ts
git commit -m "feat(pacientes): boton de impresion de estudio + indicador de ultima impresion"
```

---

### Task 2: Verificación manual end-to-end

No hay test automatizado de UI para este flujo en el repo (el historial no tiene spec propio, ver memoria `project_pacientes-rework`). Verificar a mano:

- [ ] **Step 1:** Levantar BE (worktree `print-report-audit`) + FE (worktree `print-report-audit`) contra MySQL local, siguiendo `project_worktree-launcher`.
- [ ] **Step 2:** Loguear como usuario con rol `SECRETARIA`, ir a un paciente con al menos una atención con protocolo firmado (parcial o final).
- [ ] **Step 3:** Confirmar que en la fila expandida aparece "Imprimir estudio" solo si `reportAvailable`, que al clickear se abre el PDF en pestaña nueva, y que tras eso aparece el indicador "Impreso" con tooltip.
- [ ] **Step 4:** Clickear "Imprimir estudio" de nuevo sobre la misma fila y confirmar que aparece el diálogo de reimpresión.
- [ ] **Step 5:** Loguear como un rol sin permiso (ej. `EXTRACTOR`) y confirmar que el endpoint devuelve 403 (probar con la request directa si ese rol no tiene ni siquiera acceso a la pantalla de pacientes).

No hace falta commit en este task (es solo verificación).
