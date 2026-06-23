# NBU — Configuración por tenant en drawer · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

> **Jira:** [KAN-130](https://exequielsantoro.atlassian.net/browse/KAN-130)
> **Spec:** `docs/superpowers/specs/2026-06-23-nbu-tenant-config-drawer-design.md`

**Goal:** Dar edición (drawer por análisis) + vista rápida de la configuración por tenant del NBU en la pantalla Nomenclador NBU, visible/operable solo por ADMINISTRADOR, y corregir 2 gatings del backend.

**Architecture:** El backend ya expone los endpoints (override de determinación, valores de referencia, sección del tenant). Se corrigen 2 `@PreAuthorize` mal puestos. En el frontend se agrega un service HTTP dedicado, se carga un *resumen de config* al expandir la fila (bloque CONFIGURACIÓN), y un drawer (`p-drawer`, patrón médicos) edita la config; al guardar refresca el resumen. Gating por rol con signal `isAdmin`.

**Tech Stack:** Spring Boot (BE) · Angular 21 standalone + OnPush + NgRx clásico + PrimeNG `p-drawer` + Tailwind + Vitest/ng test (FE).

## Global Constraints
- Mensajes de error en UI: español, user-friendly, sin leak de internals (FE/BE CLAUDE.md regla #4).
- BE: cambios de autorización requieren `/security-review` antes de merge.
- FE: tests obligatorios para services/effects/selectors; specs de componente al menos smoke. Component specs corren con `ng test`; services/store con `npx vitest run <file>`.
- PRs contra `development`. BE y FE en repos/PRs separados. El selector de versión NBU y el tab de precio particular NO se tocan.
- Solo `ADMINISTRADOR` ve/edita la config (gating FE + BE).

---

## PARTE A — Backend (PR aparte, repo Backend)

Worktree BE sugerido: crear `feat/nbu-tenant-config-gating` off `origin/development`.

### Task B1: Gating de TenantAnalysisController → ADMINISTRADOR

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantAnalysisController.java`
- Test: `src/test/java/lab/laboratorio/modules/analitica/presentation/catalog/TenantAnalysisControllerSecurityTest.java` (crear si no hay uno equivalente)

**Contexto:** Hoy los métodos POST/PATCH/DELETE tienen `@PreAuthorize("hasRole('TENANT_ADMIN')")`. El rol `TENANT_ADMIN` NO existe en la tabla `roles` (solo ADMINISTRADOR, SECRETARIA, …, SAAS_ADMIN) → 403 a todos.

- [ ] **Step 1:** Reemplazar en los 3 métodos (POST `/`, PATCH `/{id}`, DELETE `/{id}`) `hasRole('TENANT_ADMIN')` por `hasRole('ADMINISTRADOR')`. El GET `/` queda en `isAuthenticated()`.
- [ ] **Step 2:** Test de seguridad con `@WebMvcTest`/MockMvc o el patrón de tests de controller del repo: un usuario con rol ADMINISTRADOR puede PATCH `/api/v1/tenant-analyses/{id}` (200/204); un usuario SECRETARIA recibe 403. (Mirar `BranchBoxConfigControllerTest`/`PublicExtractionDisplayControllerTest` como patrón de test de presentación.)
- [ ] **Step 3:** Build + test: `set JAVA_HOME=jdk-21` y `mvnw -q test -Dtest=TenantAnalysisControllerSecurityTest`. Esperado: PASS.
- [ ] **Step 4:** Commit: `fix(analitica): tenant-analyses requiere ADMINISTRADOR (TENANT_ADMIN no existe)`.

### Task B2: Gating de TenantDeterminationOverrideController → ADMINISTRADOR en mutaciones

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/analitica/resultados/presentation/TenantDeterminationOverrideController.java`
- Test: `.../TenantDeterminationOverrideControllerSecurityTest.java`

**Contexto:** Clase con `@PreAuthorize("isAuthenticated()")`. Las mutaciones `PUT /{id}/override` y `PUT /{id}/reference-values/override` quedan abiertas a cualquier autenticado.

- [ ] **Step 1:** Dejar la clase/GETs en `isAuthenticated()`, y agregar `@PreAuthorize("hasRole('ADMINISTRADOR')")` por método en `PUT /{id}/override` y `PUT /{id}/reference-values/override`.
- [ ] **Step 2:** Test: ADMINISTRADOR puede PUT override (200); SECRETARIA recibe 403; GET override sigue accesible autenticado.
- [ ] **Step 3:** Build + test (scoped). Esperado: PASS.
- [ ] **Step 4:** Commit: `fix(analitica): override de determinaciones/ref-values solo ADMINISTRADOR`.

- [ ] **Step 5 (cierre Parte A):** `/security-review` del diff BE; push rama; abrir PR contra `development` linkeando KAN-130. Smoke contra MySQL real si Docker disponible.

---

## PARTE B — Frontend (PR en repo FRONTEND-LABORATORIO, rama `feat/nbu-tenant-config-drawer`)

### File Structure (FE)
- Create `src/app/features/analitica/services/nbu-config-api.service.ts` — HTTP de la config tenant (override, ref-values, sección).
- Create `src/app/features/analitica/services/nbu-config-api.service.spec.ts`
- Modify `src/app/features/analitica/models/nomenclador.model.ts` — tipos de config + `ConfigResumen`.
- Modify store `nomenclador/` (actions, effects, reducer, selectors, state) — cargar resumen de config al expandir.
- Create `src/app/features/analitica/pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts` — el drawer.
- Create `.../nbu-config-drawer/nbu-config-drawer.component.spec.ts`
- Modify `src/app/features/analitica/pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts` — bloque CONFIGURACIÓN + acción "Configurar" (solo admin) + montar drawer.
- Modify `.../nbu-catalogo-tab/nbu-catalogo-tab.component.spec.ts`

### Contratos backend (verbatim del BE)
- `GET /api/v1/analitica/determinations/{detId}/override` → `TenantOverrideResponse`
- `PUT /api/v1/analitica/determinations/{detId}/override` ← `{ percentageVariationTolerated?, preIndications?, preObservations?, analyticalType?, canBringSample?, measurementUnitId?, isPrintable?, printOrder?, printGroup?, specialPrintName?, loadingResultOrder?, requiresLoadValue?, requiresApproval?, canSelfApprove?, handlingTimeValue?, handlingTimeUnit? }`
- `GET /api/v1/analitica/determinations/{detId}/reference-values/override` → `DeterminationReferenceValueResponse[]`
- `PUT /api/v1/analitica/determinations/{detId}/reference-values/override` ← `ReferenceValueItem[]` con `{ minValue?, maxValue?, criticalMinValue?, criticalMaxValue?, ageMinMonths?, ageMaxMonths?, gender?, unit? }`
- `PATCH /api/v1/tenant-analyses/{tenantAnalysisId}` ← `{ defaultSectionId: number|null }`
- `GET /api/v1/tenant-analyses` → `{ id, catalogId, nbuCode, shortCode, customName, active }[]` (para mapear `analysis_catalog id` → `tenant_analysis id` + sección/estado actual)
- `GET /api/v1/analitica/catalog/{id}/determinations` → determinaciones (id + name) del análisis (ya se usa).
- `GET /api/v1/sucursales/sections?page&size` → `PageResponse<Section>` (combo de sección). Reusar `SectionService.list()`.

> **Nota de mapeo:** la fila del catálogo (`CatalogRow.id`) es `analysis_catalog.id`. Para PATCH de sección hace falta el `tenant_analysis.id` → resolver vía `GET /tenant-analyses` (match por `catalogId`).

---

### Task F1: `NbuConfigApiService` + spec

**Files:**
- Create: `src/app/features/analitica/services/nbu-config-api.service.ts`
- Test: `src/app/features/analitica/services/nbu-config-api.service.spec.ts`

**Interfaces (Produces):**
```ts
export interface DeterminationOverride {
  percentageVariationTolerated: number | null; preIndications: string | null;
  preObservations: string | null; analyticalType: string | null; canBringSample: boolean | null;
  measurementUnitId: number | null; isPrintable: boolean | null; printOrder: number | null;
  printGroup: number | null; specialPrintName: string | null; loadingResultOrder: number | null;
  requiresLoadValue: boolean | null; requiresApproval: boolean | null; canSelfApprove: boolean | null;
  handlingTimeValue: number | null; handlingTimeUnit: string | null;
}
export interface ReferenceValueItem {
  minValue: number | null; maxValue: number | null; criticalMinValue: number | null;
  criticalMaxValue: number | null; ageMinMonths: number | null; ageMaxMonths: number | null;
  gender: 'MALE'|'FEMALE'|null; unit: string | null;
}
export interface TenantAnalysisRow { id: number; catalogId: number; nbuCode: string|null; shortCode: string; customName: string|null; active: boolean; }

class NbuConfigApiService {
  getOverride(detId: number): Observable<DeterminationOverride>
  upsertOverride(detId: number, body: Partial<DeterminationOverride>): Observable<DeterminationOverride>
  getReferenceValues(detId: number): Observable<ReferenceValueItem[]>
  upsertReferenceValues(detId: number, items: ReferenceValueItem[]): Observable<ReferenceValueItem[]>
  listTenantAnalyses(): Observable<TenantAnalysisRow[]>
  patchSection(tenantAnalysisId: number, defaultSectionId: number | null): Observable<unknown>
}
```

- [ ] **Step 1: Escribir el spec** (patrón `resultados-api.service.spec.ts`, con `provideHttpClient()`+`provideHttpClientTesting()`): un test por método verificando verbo + URL exacta. Ej:
```ts
it('upsertOverride → PUT /determinations/{id}/override', () => {
  svc.upsertOverride(5, { preIndications: 'Ayuno 8h' }).subscribe();
  const req = http.expectOne('/api/v1/analitica/determinations/5/override');
  expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({ preIndications: 'Ayuno 8h' }); req.flush({});
});
it('patchSection → PATCH /tenant-analyses/{id}', () => {
  svc.patchSection(9, 3).subscribe();
  const req = http.expectOne('/api/v1/tenant-analyses/9');
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ defaultSectionId: 3 }); req.flush({});
});
```
(cubrir los 6 métodos)
- [ ] **Step 2:** Correr el spec → FAIL (servicio no existe). `npx vitest run src/app/features/analitica/services/nbu-config-api.service.spec.ts`
- [ ] **Step 3: Implementar** el service (patrón `ResultadosApiService`: `inject(HttpClient)`, paths literales, `HttpParams` no hace falta). `listTenantAnalyses()` → `GET /api/v1/tenant-analyses`. `patchSection` → `http.patch(.../tenant-analyses/${id}, { defaultSectionId })`.
- [ ] **Step 4:** Correr el spec → PASS.
- [ ] **Step 5:** Commit `feat(analitica): NbuConfigApiService (override, ref-values, sección)`.

### Task F2: Modelo `ConfigResumen` + carga del resumen al expandir (store)

**Files:**
- Modify: `src/app/features/analitica/models/nomenclador.model.ts`
- Modify: `store/nomenclador/nomenclador.{actions,state,reducer,selectors,effects}.ts`
- Test: `store/nomenclador.selectors.spec.ts` (+ effect spec si existe patrón)

**Interfaces:**
```ts
// nomenclador.model.ts
export interface ConfigResumen {
  sectionName: string | null;     // nombre de la sección/área
  ayuno: string | null;           // preIndications de la 1ª determinación con override
  active: boolean;                // tenant_analysis.active
  hasCustomConfig: boolean;       // tiene override/ref-values propios
  updatedBy: string | null; updatedAt: string | null;
  tenantAnalysisId: number | null;
}
```
- [ ] **Step 1:** `ConfigResumen` al modelo.
- [ ] **Step 2:** Actions: `loadConfigResumen({ analysisId })`, `loadConfigResumenSuccess({ analysisId, resumen })`, `loadConfigResumenFailure`. State: `configByAnalysis: Record<number, ConfigResumen>`. Reducer: guarda `configByAnalysis[analysisId]`. Selector factory: `selectConfigResumen(analysisId)`.
- [ ] **Step 3:** Effect `loadConfigResumen$` (mergeMap, patrón `loadDeterminations$`): arma el resumen combinando `listTenantAnalyses()` (match por catalogId → section/active/id) + (opcional) primer override para ayuno. Para v1, derivar `sectionName` del id vía `SectionService.list()` cacheado o mostrar id si no hay nombre; `ayuno`/`hasCustomConfig` desde el override de la 1ª determinación. `catchError` → resumen vacío (no rompe la fila).
- [ ] **Step 4:** Spec del selector (`selectConfigResumen` devuelve lo del slice / null). Correr con vitest → PASS.
- [ ] **Step 5:** Commit `feat(analitica): resumen de config por análisis en el store`.

### Task F3: Bloque CONFIGURACIÓN + acción "Configurar" (solo admin) en el tab catálogo

**Files:**
- Modify: `pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts` (+ spec)

**Consumes:** `selectConfigResumen`, `loadConfigResumen`, `TokenService`.

- [ ] **Step 1 (gating):** Agregar `private readonly tokens = inject(TokenService);` y `protected readonly isAdmin = signal(this.tokens.getRoles().includes('ADMINISTRADOR'));` (patrón `caja.page.ts`).
- [ ] **Step 2 (acción fila):** Pasar al `ui-table` un `[actions]` con un `TableAction` `{ key:'config', icon:'pi-pencil', label:'Configurar', hidden: () => !this.isAdmin() }` y manejar `(action)="onAction($event)"` → si `key==='config'`, abrir el drawer con `$event.row`. (El `ui-table` ya soporta `actions` + output `action` — ver data-table §2.3.)
- [ ] **Step 3 (quick-view):** En `onExpand(row)` despachar también `loadConfigResumen({ analysisId: row.id })`. En el template `uiRowExpansion`, debajo del bloque "Determinaciones", agregar:
```html
@let cfg = configResumenFor($any(row).id);
<div class="text-xs font-semibold text-[var(--ds-text-muted)] uppercase mt-3 mb-2">Configuración</div>
@if (cfg) {
  <div class="text-xs text-[var(--ds-text-muted)] flex flex-wrap gap-x-4 gap-y-1">
    <span>Sección: {{ cfg.sectionName ?? '—' }}</span>
    <span>Ayuno: {{ cfg.ayuno ?? '—' }}</span>
    <span>Estado: {{ cfg.active ? 'Activo' : 'Inactivo' }}</span>
    <span>Config propia: {{ cfg.hasCustomConfig ? 'Sí' : 'estándar' }}</span>
    @if (cfg.updatedBy) { <span>Modificado por {{ cfg.updatedBy }} · {{ cfg.updatedAt | date:'dd/MM/yyyy' }}</span> }
  </div>
} @else { <span class="text-xs italic text-[var(--ds-text-muted)]">Cargando…</span> }
```
(NO incluir versión NBU ni UB — eso es catálogo global.)
- [ ] **Step 4 (spec):** Con `ng test`: (a) con rol ADMINISTRADOR la acción "Configurar" existe; (b) sin el rol, `isAdmin()` es false y la acción queda oculta (`hidden`); (c) al expandir se despacha `loadConfigResumen`.
- [ ] **Step 5:** Commit `feat(analitica): bloque Configuración + acción Configurar (admin) en catálogo NBU`.

### Task F4: `NbuConfigDrawerComponent` (editar config del análisis)

**Files:**
- Create: `pages/nbu/nbu-config-drawer/nbu-config-drawer.component.ts` (+ spec)

**Patrón:** `p-drawer position="right" styleClass="ui-drawer-half"` como `medico-form-drawer.component.ts`. Inputs `visible`, `analysis` (CatalogRow), output `saved`, `cancel`.

**Secciones del form:**
1. **General**: combo Sección (`SectionService.list()`), toggle Activo (informativo en v1). PATCH sección vía `patchSection(tenantAnalysisId, sectionId)`.
2. **Determinaciones** (acordeón por determinación de `GET /catalog/{id}/determinations`): por cada una, form de override con foco en `preIndications` (**ayuno**), `measurementUnitId`/unidad (texto/num), `requiresApproval`/`canSelfApprove`, `printOrder`. Guarda con `upsertOverride(detId, body)`.
3. **Valores de referencia** (por determinación): tabla editable de `ReferenceValueItem[]` (min/max/crítico/género/edad/unidad). Guarda con `upsertReferenceValues(detId, items)`.

- [ ] **Step 1:** Esqueleto del componente standalone OnPush con `p-drawer` (copiar estructura de `medico-form-drawer`): inputs/outputs, `visibleInternal`, `onVisibleChange`, footer Cancelar/Guardar.
- [ ] **Step 2:** Al abrir (`visible` true): cargar determinaciones + tenant-analysis (match catalogId) + secciones. Señales locales con el form.
- [ ] **Step 3:** Guardado: por sección, llamar los endpoints correspondientes; toast de éxito/error en español (sin leak); al terminar emitir `saved.emit(analysisId)`.
- [ ] **Step 4 (spec, ng test):** smoke (renderiza con `visible=false` sin romper); al pasar `visible=true` con un analysis mock + HttpTestingController, dispara los GET de carga; "Guardar" dispara el PUT/PATCH esperado.
- [ ] **Step 5:** Commit `feat(analitica): drawer de configuración por análisis (NBU)`.

### Task F5: Montar el drawer en el tab y refrescar al guardar

**Files:**
- Modify: `pages/nbu/nbu-catalogo-tab/nbu-catalogo-tab.component.ts` (+ spec)

- [ ] **Step 1:** Importar `NbuConfigDrawerComponent`; señales `drawerVisible = signal(false)` y `drawerRow = signal<CatalogRow|null>(null)`. En `onAction`, si `key==='config'`: setear `drawerRow`, `drawerVisible(true)`.
- [ ] **Step 2:** En template, montar `<lab-nbu-config-drawer [visible]="drawerVisible()" [analysis]="drawerRow()" (cancel)="drawerVisible.set(false)" (saved)="onConfigSaved($event)" />`.
- [ ] **Step 3:** `onConfigSaved(analysisId)`: `drawerVisible.set(false)` + `store.dispatch(loadConfigResumen({ analysisId }))` (refresca el quick-view).
- [ ] **Step 4 (spec):** al emitir `saved`, se cierra el drawer y se re-despacha `loadConfigResumen`.
- [ ] **Step 5:** Commit `feat(analitica): integrar drawer de config en el tab catálogo + refresh`.

### Task F6: Verificación + PR

- [ ] **Step 1:** `npx vitest run` sobre los specs nuevos (service, selectors) → PASS.
- [ ] **Step 2:** `ng test` sobre los specs de componente del NBU → PASS.
- [ ] **Step 3:** `ng build` → sin errores de tipos/AOT.
- [ ] **Step 4:** Levantar dev (BE de Parte A + este FE) y verificar con Playwright como `admin@test.com`: en `/analitica/nbu`, expandir una fila muestra el bloque Configuración; el botón Configurar abre el drawer; guardar sección/ayuno persiste (network 200) y refresca el resumen. Verificar que con un usuario no-admin no aparece el botón.
- [ ] **Step 5:** Push rama + PR contra `development` linkeando KAN-130. Nota de dependencia: requiere la PR de Parte A (gatings) para operar con ADMINISTRADOR real.

---

## Self-Review
- **Cobertura del spec:** §2 vista rápida → F2/F3. §3 drawer → F4/F5. §4 gating FE → F3 (isAdmin) + BE B1/B2. §5 contratos → F1. §6 fixes gating → B1/B2. §7 última modificación → ConfigResumen (F2) + render (F3). §8 gaps: custom_name/short_code fuera de v1 (solo sección/estado) — explícito. §9 criterios → F6.
- **Gaps conocidos asumidos:** el resumen de ayuno/hasCustomConfig en v1 puede derivarse de la 1ª determinación; si resulta caro, degradar a "config propia: sí/estándar" sin detalle. `sectionName` puede requerir cruzar con `SectionService.list()` — cachear.
- **Riesgo de tipos:** `selectConfigResumen` (factory) y `loadConfigResumen` deben usar el mismo nombre en F2/F3/F5.
