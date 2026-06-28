# NBU: precio particular real (valor U.B. + override por análisis) + fix resumen

> **Estado:** diseño aprobado · **Fecha:** 2026-06-28
> **Branch:** `feat/nbu-precio-particular` (Backend + FRONTEND-LABORATORIO), apilada sobre `feat/nbu-preparacion-estructurada` (KAN-142).
> **Flyway asignado:** lane NBU **V1031–V1039** (KAN-142 usó V1030). Esta tanda usa **V1031** y **V1032**.
> **Jira:** [KAN-154](https://exequielsantoro.atlassian.net/browse/KAN-154)

## Problema

En la pantalla de NBU, el tab **"Precio particular"** está implementado en el FE pero **no persiste**: `NomencladorService.mockPricing` guarda en memoria el **valor U.B.** (valor de la unidad bioquímica, a nivel laboratorio) y los **overrides de precio manual por análisis**. Se pierde al recargar.

El backend ya tiene un motor de precios particular real:
- El **valor U.B. particular** vive en el `ub_value` del **plan particular** del tenant (`insurer_plan_agreement`, módulo coverages), leído por `ParticularPricingPort` (`AtencionParticularPricingAdapter`).
- `CalculateAttentionPricingUseCase` computa, para análisis sin cobertura, `precio = cantidadUb × valorUb` y lo snapshotea en `analysis_authorizations.charged_price`.
- **No existe** override de precio manual por análisis.

Además, como secuela de KAN-142 (se dejó de escribir `preIndications` desde el drawer), el resumen **"Preparación previa"** en `nbu-catalogo-tab` quedará desincronizado (lee `preIndications`).

## Objetivo

Hacer que la config de precio particular de NBU **persista y maneje el motor de precios real**: el valor U.B. configurado y los overrides por análisis se usan al computar el precio cobrado en atención. Más un fix cosmético del resumen desincronizado.

### Fuera de alcance (no en esta tanda)

- Edición de la **sección** del análisis (`defaultSectionId`) — no la hacemos.
- **Mostrar** la preparación computada en wizard/turno/portal/impresión.

## Decisiones tomadas (no re-discutir)

1. **Valor U.B. → `tenant_nbu_config`.** Se persiste en una columna nueva de `tenant_nbu_config` (NBU pasa a ser dueño del valor), y **el motor se reapunta** a leer de ahí. Fallback de seguridad: si la columna está null, cae al `ub_value` del plan particular (no rompe tenants existentes).
2. **Override por análisis → completo en este SDD.** Tabla nueva + integración en `CalculateAttentionPricingUseCase` (el override gana) + snapshot.
3. **Sección del análisis → FUERA.**
4. **Fix #resumen → quitar** el resumen "Preparación previa" de `nbu-catalogo-tab` (no reemplazarlo por los tipos estructurados; "mostrar" está diferido).

## Parte A1 — Valor U.B. particular (tenant-level)

### BE
- **`V1031`**: `ALTER TABLE tenant_nbu_config ADD COLUMN valor_ub_particular DECIMAL(15,2) NULL;` (un solo `ADD COLUMN` → H2-compatible; revisar `db/migration-local`). `tenant_nbu_config` usa `target_tenant_id` (NO `BaseJpaEntity`).
- Extender `TenantNbuConfigJpaEntity`, dominio `TenantNbuConfig`, DTOs con `valorUbParticular` (BigDecimal, nullable).
- `TenantNbuConfigPort`: agregar `getParticularUbValue(tenantId): Optional<BigDecimal>` y `upsertParticularUbValue(tenantId, value)` (preserva `defaultNbuVersionId` y `version`).
- Use cases `GetTenantParticularUbValueUseCase` / `SetTenantParticularUbValueUseCase`.
- Endpoint `GET /api/v1/analitica/config/particular-ub` (authenticated) y `PUT` (ADMINISTRADOR). Body/response `{ valorUbParticular }`.
- **Reapuntar el motor:** el bean que implementa `ParticularPricingPort` pasa a leer `tenant_nbu_config.valor_ub_particular`. **Fallback:** si null, usa el `ub_value` del plan particular como hoy. (El nuevo adapter vive en el módulo `analitica`, dueño de `tenant_nbu_config`; debe quedar **un solo** bean del port.)

### FE
- `NomencladorService.saveValorUb(valor)` → `PUT /config/particular-ub`. La carga del valor U.B. → `GET /config/particular-ub`.

## Parte A2 — Override de precio manual por análisis

### BE
- **`V1032`**: `CREATE TABLE tenant_analysis_price_override` (extiende `BaseJpaEntity`, tenant-scoped):
  - `analysis_catalog_id BIGINT NOT NULL` (FK → `analysis_catalog(id)`),
  - `override_price DECIMAL(12,2) NOT NULL`,
  - `UNIQUE(tenant_id, analysis_catalog_id)`, índice de lectura `(tenant_id)`.
  - Fila existe = override activo; **revertir = borrar la fila** (hard delete, sin soft-delete).
  - H2 + MySQL compatible; revisar `db/migration-local`.
- Dominio `TenantAnalysisPriceOverride`; port `TenantAnalysisPriceOverridePort`
  (`findByTenantId(tenantId): List`, `findOverridesByCatalogIds(catalogIds, tenantId): Map<Long,BigDecimal>`,
  `upsert(catalogId, tenantId, price)`, `delete(catalogId, tenantId)`).
- Use cases `ListTenantAnalysisPriceOverridesUseCase` / `UpsertTenantAnalysisPriceOverrideUseCase` / `DeleteTenantAnalysisPriceOverrideUseCase`. Validación: `override_price >= 0`, si no → 422 español (DomainException).
- Endpoints (mutación ADMINISTRADOR):
  - `GET /api/v1/analitica/price-overrides` → `[{ analysisCatalogId, overridePrice }]`.
  - `PUT /api/v1/analitica/price-overrides/{analysisCatalogId}` body `{ overridePrice }`.
  - `DELETE /api/v1/analitica/price-overrides/{analysisCatalogId}` (revert).
- **Integración en el motor:** `CalculateAttentionPricingUseCase` — para cada análisis **sin cobertura**: si hay override para `(tenant, analysisCatalogId)` → usa el override; si no → `cantidadUb × valorUb` (como hoy). El snapshot a `analysis_authorizations.charged_price` refleja el override automáticamente. Nuevo port consumido por el motor (`TenantAnalysisPriceOverridePort.findOverridesByCatalogIds`).

### FE
- `NomencladorService.getPricing()` → compone `ParticularPricing` desde `GET /config/particular-ub` (valorUb) + `GET /price-overrides` (overrides). `setOverride(analysisId, precio)` → `PUT /price-overrides/{id}` (precio) o `DELETE` (revert, `precio==null`). Eliminar `mockPricing` y los comentarios MOCK. Los effects no cambian.

## #4 — Fix resumen desincronizado (FE)

- En `nbu-catalogo-tab`: **quitar** el campo/columna "Preparación previa" que lee `preIndications`, y el mapeo `ayuno: override?.preIndications` en `nomenclador.effects.ts`. La preparación ahora es estructurada (se edita en el drawer); su display queda diferido.

## Componentes

**BE — módulo `analitica`:**
- `tenant_nbu_config` (extensión) — config, dominio, port, use cases, controller, adapter.
- `tenant_analysis_price_override` (nuevo) — migración, entidad JPA, repo, adapter, dominio, port, use cases, controller, DTOs.
- `ParticularPricingPort` impl reapuntado (+fallback) en `analitica`.
- `CalculateAttentionPricingUseCase` (módulo `analitica.atencion`) — integración del override.

**FE — `features/analitica`:**
- `services/nomenclador.service.ts` — de-mock (valor U.B. + overrides reales).
- `pages/nbu/nbu-catalogo-tab/...` y `store/nomenclador/nomenclador.effects.ts` — quitar el resumen/mapeo de `preIndications`.

## Testing

- **BE:**
  - `UpsertTenantAnalysisPriceOverrideUseCase` / Delete / List (override_price < 0 → 422).
  - `CalculateAttentionPricingUseCase`: override gana sobre `cantidadUb×valorUb`; sin override usa el cálculo; análisis con cobertura → 0 (sin cambios).
  - Get/Set valor U.B.; fallback del `ParticularPricingPort` (null → plan particular).
  - Migraciones V1031/V1032 verdes en H2 **y** boot MySQL real.
- **FE:**
  - `NomencladorService` de-mockeado: valor U.B. (GET/PUT) y overrides (GET/PUT/DELETE) con `HttpTestingController`.
  - `nbu-catalogo-tab` sin el resumen viejo (spec ajustado).

## Estándares
- Errores español sin leak (DomainException → 422); nunca IDs en formularios (override por `analysisCatalogId` derivado de la fila, no pedido al usuario); tenant isolation (`BaseJpaEntity` en la tabla nueva; `target_tenant_id` en `tenant_nbu_config`).
- `/security-review`: se tocan endpoints nuevos (ADMINISTRADOR) y el motor de precios — evaluar al cerrar.

## Branch / dependencia
Apilada sobre `feat/nbu-preparacion-estructurada` (KAN-142, en PR) por el #4. A1/A2 son independientes de KAN-142. PRs basadas en la rama KAN-142 hasta que mergee (o en `development` si mergea antes). Flyway en la lane NBU (V1031/V1032), sin colisión con urgente/domicilio/liquidaciones (V1040+).
