# Carga de resultados según tipo (cuant/cualit/semicuant) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Pasos con checkbox (`- [ ]`).
>
> **Jira:** [KAN-207](https://exequielsantoro.atlassian.net/browse/KAN-207) (follow-up de KAN-158).

**Goal:** En la planilla de carga de resultados, cada determinación se carga con el input correcto según su tipo efectivo: numérico (cuantitativo) o dropdown de valores permitidos (cualitativo / semicuantitativo ordinal); el backend valida el valor cualitativo al guardar.

**Architecture:** Backend agrega un endpoint tenant-scoped que devuelve las determinaciones cargables con su tipo **efectivo** (override del tenant ⟶ global ⟶ QUANTITATIVE) + los labels de su categoría cualitativa; y valida en el guardado batch. Frontend consume ese endpoint para armar el grid y ramifica la celda input/dropdown.

**Tech Stack:** Java 21 + Spring hexagonal, JUnit5/Mockito. Angular 21 standalone + signals + PrimeNG, Vitest.

## Global Constraints

- **Errores español sin leak** (Regla #4): `InvalidQualitativeReferenceException` (DomainException) → 422 con mensaje español; sin FQCN/SQL.
- **Sin migración** (la config de tipos/categorías ya existe de KAN-158). Backward-compatible: determinación sin tipo → QUANTITATIVE (numérico, como hoy).
- **Tipo efectivo** por determinación = `override.analyticalType` (si no-null) ⟶ `catálogo.analyticalType` (si no-null) ⟶ `QUANTITATIVE`. Valores cualitativos = labels de la `QualitativeCategory` de `override.qualitativeCategoryId`, ordenados por `displayOrder`.
- **PrimeIcons, no emojis. OnPush + signals.** JDK 21 para `mvnw`. FE: vitest + `npm run build` (NO `ng test`).
- **Worktrees** (off development): BE `feat/carga-resultados-cualitativos` (crear con superpowers:using-git-worktrees) + FE ya existe (`TESIS/FRONTEND-LABORATORIO/.worktrees/carga-resultados-cualitativos`). Un ticket, dos PRs.

---

# FASE A — Backend (`modules/analitica/resultados`)

### Task A1: Resolver de tipo efectivo + endpoint de determinaciones cargables

**Files:**
- Create: `application/service/DeterminationTypeResolver.java`
- Create: `application/usecase/catalog/ListLoadableDeterminationsUseCase.java`
- Create: `presentation/dto/LoadableDeterminationResponse.java`
- Modify: `presentation/DeterminationCatalogController.java` (nuevo `GET /loadable`)
- Test: `application/usecase/catalog/ListLoadableDeterminationsUseCaseTest.java`, `application/service/DeterminationTypeResolverTest.java`

**Interfaces:**
- Consumes: `DeterminationCatalogRepositoryPort.findByAnalysisCatalogIdAndActiveTrue(Long) -> List<DeterminationCatalog>` (`getAnalyticalType()`, `getId()`, `getName()`, `getUnit()`); `TenantDeterminationOverrideRepositoryPort.findByDeterminationCatalogIdAndTenantId(Long,Long) -> Optional<TenantDeterminationOverride>` (`getAnalyticalType()`, `getQualitativeCategoryId()`); `QualitativeCategoryRepositoryPort.findVisibleForTenant(Long) -> List<QualitativeCategory>` (`getId()`, `getValues()` → `QualitativeCategoryValue.getLabel()/getDisplayOrder()`).
- Produces: `DeterminationTypeResolver.resolve(DeterminationCatalog, Optional<TenantDeterminationOverride>, Map<Long,QualitativeCategory>) -> Resolved(AnalyticalType type, List<String> qualitativeValues)`; `ListLoadableDeterminationsUseCase.execute(Long tenantId, Long analysisCatalogId) -> List<LoadableDeterminationResponse>`; `LoadableDeterminationResponse(Long id, String name, String unit, AnalyticalType analyticalType, List<String> qualitativeValues)`.

- [ ] **Step 1: Test del resolver que falla** — `DeterminationTypeResolverTest`:
```java
@Test void override_type_wins_and_lists_ordered_labels() {
    var resolver = new DeterminationTypeResolver();
    var global = DeterminationCatalog.builder().id(10L).analyticalType(AnalyticalType.QUANTITATIVE).build();
    var override = TenantDeterminationOverride.builder().determinationCatalogId(10L)
            .analyticalType(AnalyticalType.QUALITATIVE).qualitativeCategoryId(5L).build();
    var cat = QualitativeCategory.builder().id(5L).ordinal(true).values(List.of(
            QualitativeCategoryValue.builder().label("+").displayOrder(2).build(),
            QualitativeCategoryValue.builder().label("Negativo").displayOrder(1).build())).build();
    var r = resolver.resolve(global, java.util.Optional.of(override), java.util.Map.of(5L, cat));
    assertThat(r.type()).isEqualTo(AnalyticalType.QUALITATIVE);
    assertThat(r.qualitativeValues()).containsExactly("Negativo", "+"); // ordenado por displayOrder
}
@Test void defaults_to_quantitative_when_no_type_configured() {
    var resolver = new DeterminationTypeResolver();
    var global = DeterminationCatalog.builder().id(10L).analyticalType(null).build();
    var r = resolver.resolve(global, java.util.Optional.empty(), java.util.Map.of());
    assertThat(r.type()).isEqualTo(AnalyticalType.QUANTITATIVE);
    assertThat(r.qualitativeValues()).isEmpty();
}
```
- [ ] **Step 2: Correr y ver fallar** — `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'; ./mvnw -q -Dtest=DeterminationTypeResolverTest test`. FAIL compilación.
- [ ] **Step 3: Implementar `DeterminationTypeResolver`**:
```java
package lab.laboratorio.modules.analitica.resultados.application.service;

import lab.laboratorio.modules.analitica.resultados.domain.model.*;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class DeterminationTypeResolver {
    public record Resolved(AnalyticalType type, List<String> qualitativeValues) {}

    public Resolved resolve(DeterminationCatalog global, Optional<TenantDeterminationOverride> override,
                            Map<Long, QualitativeCategory> categoriesById) {
        AnalyticalType type = override.map(TenantDeterminationOverride::getAnalyticalType).filter(Objects::nonNull)
                .orElseGet(() -> global.getAnalyticalType() != null ? global.getAnalyticalType() : AnalyticalType.QUANTITATIVE);
        if (type == AnalyticalType.QUANTITATIVE) {
            return new Resolved(type, List.of());
        }
        Long categoryId = override.map(TenantDeterminationOverride::getQualitativeCategoryId).orElse(null);
        QualitativeCategory cat = categoryId == null ? null : categoriesById.get(categoryId);
        if (cat == null) {
            return new Resolved(type, List.of()); // cualit/semi sin categoría configurada → sin valores (FE cae a input)
        }
        List<String> labels = cat.getValues().stream()
                .sorted(Comparator.comparingInt(QualitativeCategoryValue::getDisplayOrder))
                .map(QualitativeCategoryValue::getLabel).toList();
        return new Resolved(type, labels);
    }
}
```
- [ ] **Step 4: DTO + use case**:
```java
// LoadableDeterminationResponse.java
public record LoadableDeterminationResponse(Long id, String name, String unit,
        lab.laboratorio.modules.analitica.resultados.domain.model.AnalyticalType analyticalType,
        java.util.List<String> qualitativeValues) {}
```
```java
// ListLoadableDeterminationsUseCase.java
@Service @RequiredArgsConstructor @Transactional(readOnly = true)
public class ListLoadableDeterminationsUseCase {
    private final DeterminationCatalogRepositoryPort catalogRepository;
    private final TenantDeterminationOverrideRepositoryPort overrideRepository;
    private final QualitativeCategoryRepositoryPort categoryRepository;
    private final DeterminationTypeResolver resolver;

    public List<LoadableDeterminationResponse> execute(Long tenantId, Long analysisCatalogId) {
        var categoriesById = categoryRepository.findVisibleForTenant(tenantId).stream()
                .collect(java.util.stream.Collectors.toMap(QualitativeCategory::getId, c -> c, (a, b) -> a));
        return catalogRepository.findByAnalysisCatalogIdAndActiveTrue(analysisCatalogId).stream()
                .map(det -> {
                    var override = overrideRepository.findByDeterminationCatalogIdAndTenantId(det.getId(), tenantId);
                    var r = resolver.resolve(det, override, categoriesById);
                    return new LoadableDeterminationResponse(det.getId(), det.getName(), det.getUnit(),
                            r.type(), r.qualitativeValues());
                }).toList();
    }
}
```
- [ ] **Step 5: Endpoint** — en `DeterminationCatalogController` inyectar `ListLoadableDeterminationsUseCase loadableUseCase;` y agregar:
```java
    @GetMapping("/loadable")
    @Operation(summary = "Determinaciones cargables de un análisis con su tipo efectivo (para la planilla)")
    public ResponseEntity<List<LoadableDeterminationResponse>> loadable(@RequestParam Long analysisId) {
        Long tenantId = lab.laboratorio.infrastructure.tenancy.TenantContext.requireTenantId();
        return ResponseEntity.ok(loadableUseCase.execute(tenantId, analysisId));
    }
```
- [ ] **Step 6: Test del use case** — `ListLoadableDeterminationsUseCaseTest` (Mockito): 1 determinación global QUANTITATIVE + override QUALITATIVE con categoría (5L, valores) → response con type QUALITATIVE y labels ordenados; determinación sin override → QUANTITATIVE + valores vacíos.
- [ ] **Step 7: Correr y ver pasar** — `./mvnw -q -Dtest='DeterminationTypeResolverTest,ListLoadableDeterminationsUseCaseTest' test`. PASS.
- [ ] **Step 8: Commit** — `feat(analitica): endpoint determinations/loadable con tipo efectivo + valores cualitativos [KAN-207]`.

---

### Task A2: Validación del valor cualitativo en el guardado batch

**Files:**
- Modify: `application/usecase/BatchUpdateDeterminationsUseCase.java`
- Test: `application/usecase/BatchUpdateDeterminationsUseCaseTest.java`

**Interfaces:**
- Consumes: `DeterminationTypeResolver` (A1); `Determination.getDeterminationCatalogId()`; los 3 ports de A1; `DeterminationCatalogRepositoryPort.findById(Long) -> Optional<DeterminationCatalog>`.
- Produces: el batch rechaza con `InvalidQualitativeReferenceException` (422) un valor no permitido para una determinación cualit/semi.

- [ ] **Step 1: Test que falla** — en `BatchUpdateDeterminationsUseCaseTest`: una determinación cuyo catálogo es QUALITATIVE (override) con valores {"Positivo","Negativo"}; item con `resultValue="Reactivo"` → `InvalidQualitativeReferenceException`; con `resultValue="Positivo"` → persiste. (Reusar el setup del test existente; stubear `catalogRepository.findById`, `overrideRepository.findByDeterminationCatalogIdAndTenantId`, `categoryRepository.findVisibleForTenant`.)
```java
    @Test void rejects_qualitative_value_not_in_category() {
        // det catalogId=10 QUALITATIVE, categoría 5 = {Positivo, Negativo}
        // item value="Reactivo" -> InvalidQualitativeReferenceException, no guarda
        assertThatThrownBy(() -> useCase.execute(inputWith("Reactivo")))
            .isInstanceOf(InvalidQualitativeReferenceException.class)
            .hasMessageContaining("no corresponde");
        verify(determinationRepository, never()).saveAll(any());
    }
    @Test void accepts_valid_qualitative_value() {
        useCase.execute(inputWith("Positivo"));
        verify(determinationRepository).saveAll(any());
    }
```
- [ ] **Step 2: Correr y ver fallar** — `./mvnw -q -Dtest=BatchUpdateDeterminationsUseCaseTest test`. FAIL.
- [ ] **Step 3: Implementar** — inyectar `catalogRepository`, `overrideRepository`, `categoryRepository`, `resolver`. Antes del `for` cargar `categoriesById` una vez. Dentro del loop, tras validar ownership y ANTES de `det.recordValue(...)`:
```java
            DeterminationCatalog global = catalogRepository.findById(det.getDeterminationCatalogId()).orElse(null);
            if (global != null) {
                var override = overrideRepository.findByDeterminationCatalogIdAndTenantId(det.getDeterminationCatalogId(), input.tenantId());
                var resolved = resolver.resolve(global, override, categoriesById);
                boolean isQualitative = resolved.type() != AnalyticalType.QUANTITATIVE;
                if (isQualitative && !resolved.qualitativeValues().isEmpty()
                        && !resolved.qualitativeValues().contains(item.resultValue())) {
                    throw new InvalidQualitativeReferenceException(
                            "El valor cargado no corresponde a los valores permitidos de la determinación.");
                }
            }
```
(`categoriesById` = `categoryRepository.findVisibleForTenant(input.tenantId())` mapeado por id, calculado una vez antes del loop.)
- [ ] **Step 4: Correr y ver pasar** — `./mvnw -q -Dtest=BatchUpdateDeterminationsUseCaseTest test`. PASS.
- [ ] **Step 5: Commit** — `feat(analitica): validar valor cualitativo en el guardado batch (422 español) [KAN-207]`.

---

### Task A3: Verificación BE

- [ ] **Step 1:** `./mvnw -q -Dtest='*resultados*,DeterminationTypeResolverTest,ListLoadableDeterminationsUseCaseTest,BatchUpdateDeterminationsUseCaseTest' test` verde (anotar fallas pre-existentes ajenas si las hay).
- [ ] **Step 2:** Boot MySQL opcional (no hay migración). Push rama BE + PR contra development linkeando el ticket.

---

# FASE B — Frontend (`analitica/muestras`)

### Task B1: Modelo + servicio + builder con tipo y valores

**Files:**
- Modify: `src/app/features/analitica/muestras/models/resultado.model.ts`
- Modify: `src/app/features/analitica/muestras/services/resultados-api.service.ts`
- Modify: `src/app/features/analitica/muestras/services/planilla-grid-builder.service.ts`
- Test: `.../services/planilla-grid-builder.service.spec.ts` (o el spec del builder)

**Interfaces:**
- Produces: fila del grid (`GridRow`/`PlanillaRow`) += `analyticalType: 'QUANTITATIVE'|'QUALITATIVE'|'SEMI_QUALITATIVE'` + `qualitativeValues: string[]`. `getLoadableDeterminations(analysisId) -> Observable<LoadableDetermination[]>` donde `LoadableDetermination = { id, name, unit, analyticalType, qualitativeValues }`.

- [ ] **Step 1: Modelo** — en `resultado.model.ts`:
```ts
export type AnalyticalType = 'QUANTITATIVE' | 'QUALITATIVE' | 'SEMI_QUALITATIVE';
export interface LoadableDetermination {
  id: number; name: string; unit: string | null;
  analyticalType: AnalyticalType; qualitativeValues: string[];
}
```
Agregar a `GridRow`/`PlanillaRow`: `analyticalType: AnalyticalType; qualitativeValues: string[];`.
- [ ] **Step 2: Servicio** — en `resultados-api.service.ts`, reemplazar/renombrar el getter del catálogo del grid a:
```ts
getLoadableDeterminations(analysisId: number): Observable<LoadableDetermination[]> {
  return this.http.get<LoadableDetermination[]>(`${this.catalogBase}/loadable`, { params: { analysisId } });
}
```
(`catalogBase = '/api/v1/analitica/determinations'`.)
- [ ] **Step 3: Builder** — en `planilla-grid-builder.service.ts` (y `resultado.model.ts` si el mapeo de rows vive ahí), propagar `analyticalType` + `qualitativeValues` del `LoadableDetermination` a cada `row` (default `'QUANTITATIVE'`/`[]` si faltara). Spec del builder: una fila cualitativa lleva `analyticalType='QUALITATIVE'` y `qualitativeValues` no vacío.
- [ ] **Step 4: Correr** — `npx vitest run src/app/features/analitica/muestras`. PASS.
- [ ] **Step 5: Commit** — `feat(analitica): modelo/servicio/builder de planilla con tipo y valores cualitativos`.

---

### Task B2: Celda del grid ramifica input / dropdown

**Files:**
- Modify: `src/app/features/analitica/muestras/components/planilla-grid/planilla-grid.component.html` (+ `.ts` si necesita helper)
- Modify: `.../components/result-grid/result-grid.component.ts` (si está en uso — confirmar; ver riesgos)
- Test: spec del componente por lógica pura (el render de signal-inputs no corre bajo vitest — usar helper method + build)

- [ ] **Step 1:** En `planilla-grid.component.html`, reemplazar el `<input>` de la celda por una rama:
```html
@if (row.analyticalType !== 'QUANTITATIVE' && row.qualitativeValues.length) {
  <p-select class="ws-select" appendTo="body" [options]="row.qualitativeValues"
            [ngModel]="value(col.protocolId, row.catalogId, cell)" [showClear]="true" placeholder="—"
            (onChange)="setValue(col.protocolId, row.catalogId, $event.value ?? '')" />
} @else {
  <input class="ws-input" [class.is-filled]="filled(col.protocolId, row.catalogId, cell)"
         [value]="value(col.protocolId, row.catalogId, cell)" placeholder="—" inputmode="decimal"
         (input)="setValue(col.protocolId, row.catalogId, $any($event.target).value)" />
}
```
Importar `SelectModule` (PrimeNG) en el componente. `[options]` de string simple (el valor y el label son el mismo string). El `setValue` recibe el label como `value` (string) — mismo contrato de guardado.
- [ ] **Step 2:** `npx vitest run src/app/features/analitica/muestras` (lógica) + `npm run build`. PASS + build AOT OK.
- [ ] **Step 3: Commit** — `feat(analitica): planilla carga con dropdown para cualitativo/semicuant`.

---

### Task B3: Verificación FE + smoke

- [ ] **Step 1:** `npx vitest run src/app/features/analitica/muestras` verde. `npm run build` OK.
- [ ] **Step 2:** Smoke: levantar dev; configurar una determinación como cualitativa con categoría (o usar una ya configurada); en la planilla de carga la celda muestra el dropdown con los valores; guardar; ver que persiste el label. Screenshot.
- [ ] **Step 3:** Push rama FE + PR contra development linkeando el ticket.

---

## Self-Review (contra el spec)

**Spec coverage:** grid expone tipo efectivo + valores → A1 (resolver + endpoint) ✅. Validación cualitativa al guardar → A2 ✅. Default cuantitativo backward-compat → A1 resolver ✅. Celda input/dropdown → B2 ✅. Guarda el label (string) → B2 (`setValue` con el string) + A2 valida contra labels ✅. Sin migración ✅. Semicuant = dropdown ordinal (orden por displayOrder) → A1 resolver ✅.

**Placeholder scan:** el `[KAN-207]` de los commits se reemplaza por el ticket real; la nota "result-grid si está en uso — confirmar" es una decisión de alcance deliberada (ver riesgos), no un TODO de lógica. Sin placeholders de lógica.

**Type consistency:** `AnalyticalType` (BE enum QUANTITATIVE/QUALITATIVE/SEMI_QUALITATIVE ↔ FE union). `LoadableDeterminationResponse{id,name,unit,analyticalType,qualitativeValues}` (A1) ↔ `LoadableDetermination` (B1) ↔ `getLoadableDeterminations` (B1) ↔ fila del grid (B1) ↔ celda (B2). `DeterminationTypeResolver.Resolved{type,qualitativeValues}` reusado en A1 y A2. ✅

**Riesgo abierto (para el implementer):** `result-grid.component` es casi idéntico a `planilla-grid`; confirmar cuál rinde en `cargar-resultados` (screenshot = `planilla-grid`) y aplicar B2 a la usada; si `result-grid` también se muestra en algún flujo, replicar. N override queries por planilla (determinaciones pocas) — si preocupa, sumar un `findByTenantIdAndDeterminationCatalogIdIn` al port (optimización, no bloquea).
