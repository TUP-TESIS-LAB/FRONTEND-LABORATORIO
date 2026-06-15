# Sucursales — Pulido stepper + resumen + pantallas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Jira:** _(pendiente — completar al pasar por `jira-workflow`, regla #1 de ambos repos)_
>
> **Spec:** `docs/superpowers/specs/2026-06-14-sucursales-pulido-pantallas-design.md`

**Goal:** Pulir el wizard de sucursal: sacar "Tipo de área" del modal (wireando OTRO desde el front), limpiar textos verbosos, mostrar un resumen real en el paso Confirmar, y agregar configuración de pantallas (TV) por sucursal con gating dinámico en el sidebar.

**Architecture:** Items 1, 2, 4 son frontend puro. Item 3 es cross-stack: dos flags booleanos nuevos en `BranchTotemConfig` (migración Flyway con backfill), upsert extendido, toggles en el paso Tótem, y links de sidebar dinámicos gateados por esos flags + tótem.

**Tech Stack:** Spring Boot (Clean Architecture), Flyway, JUnit; Angular 21 standalone + signals + NgRx clásico + PrimeNG + Tailwind; `ng test` (componentes) y `npx vitest` (store).

**Dos repos:** Backend en `c:\Users\tobia\Desktop\TUP\TESIS\Backend` (crear worktree off `development`, JDK 21). Frontend en este worktree `feat/sucursales-pulido-pantallas`; `npm ci` antes de testear.

**Orden:** B (item 4) → C (item 1) → A (item 3 BE) → D (item 3 FE) → E (item 2) → F (verificación). B y C son quick wins independientes; E consume los flags del item 3.

---

## FASE B — Item 4: "Tipo de área" fuera del modal (FE puro)

**Files:**
- Modify: `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/steps/workspaces-step.component.ts` (constante `AREA_TYPE_OPTIONS` ~líneas 37-47, signals `newAreaType`/`newAreaExternalLab` ~líneas 118/212, dispatch de crear área)
- Modify: `.../steps/workspaces-step.component.html` (modal "Nueva área", líneas ~72-95: campos Tipo y Laboratorio externo)
- Test: `workspaces-step.component.spec.ts`

### Task B1: Quitar Tipo/Lab externo del modal y hardcodear OTRO

- [ ] **Step 1: Test que falla**

En el spec del `workspaces-step`: al confirmar la creación de un área desde el modal con solo el nombre, la acción/servicio de crear área se invoca con `areaType: 'OTRO'` y `externalLabName: null`, y el modal ya NO renderiza el `p-select` de tipo ni el input de laboratorio externo.

- [ ] **Step 2: Correr (falla)**

Run: `ng test --include='**/workspaces-step.component.spec.ts' --watch=false`
Expected: FAIL.

- [ ] **Step 3: Implementar**

En el `.html`, borrar del modal "Nueva área" (líneas ~80-89) el bloque del campo "Tipo" (`p-select` con `newAreaType`) y el bloque condicional "Laboratorio externo" (`@if (newAreaType === 'EXTERNO')`). Dejar solo el campo Nombre.

En el `.ts`:
- Borrar la constante `AREA_TYPE_OPTIONS` y las signals/propiedades `newAreaType`, `newAreaExternalLab` (y cualquier `areaTypeOptions` expuesto al template).
- En el método que crea el área (el que hoy arma el payload con `newAreaType`/`newAreaExternalLab`), reemplazar por valores fijos:
```ts
// payload de creación del área desde el stepper:
this.store.dispatch(createArea({
  name: this.newAreaName.trim(),
  areaType: 'OTRO',          // wired: el tipo no se pide en el stepper
  externalLabName: null,     // EXTERNO no aplica acá
}));
```
(Mantener el nombre real de la acción/método existente; solo fijar `areaType`/`externalLabName`.)

- [ ] **Step 4: Correr (pasa)**

Run: `ng test --include='**/workspaces-step.component.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(sucursales): quitar tipo de area del modal, wire OTRO desde el front"
```

---

## FASE C — Item 1: Limpieza agresiva de textos (FE puro)

**Files:**
- Modify: `steps/datos-step.component.html`, `steps/horarios-step.component.html`, `steps/contactos-step.component.html`, `steps/totem-step.component.html`
- Modify: `sucursal-alta-stepper.steps.ts` (subtítulos de pasos)

### Task C1: Eliminar helper/subtítulos verbosos

- [ ] **Step 1: Editar cada paso**

- `datos-step.component.html` (~línea 2): borrar el `<p>` "Información general de la sucursal. La dirección es opcional y puede completarse después."
- `horarios-step.component.html`: borrar el `<p>` "Seleccioná los días, el horario y el tipo. Podés agregar múltiples bloques." y el `pTooltip` del campo Tipo (~línea 37).
- `contactos-step.component.html`: borrar el `<p>` "Agregá teléfonos, email, sitio web y otros canales de contacto."
- `totem-step.component.html`: borrar los 2 párrafos de ayuda (~líneas 2-5) y los subtítulos largos de sección ("Habilitá el tótem para aceptar walk-ins…", "Cantidad de boxes físicos…"); dejar labels de sección cortos: "Tótem", "Boxes".
- `sucursal-alta-stepper.steps.ts`: vaciar los `subtitle` de cada step (o dejar `undefined`) para que el shell muestre solo el `title`.

Mantener: labels de campos, los `*` de requeridos, y los contadores ("X horarios cargados", "X contactos cargados").

- [ ] **Step 2: Verificar render**

Run: `ng test --include='**/sucursal-alta-stepper/**' --watch=false`
Expected: PASS (ajustar specs que asserteaban los textos eliminados).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor(sucursales): limpiar textos verbosos del stepper (solo labels)"
```

---

## FASE A — Item 3 Backend: flags de pantallas en `BranchTotemConfig`

Rutas relativas a `Backend/src/main/java/lab/laboratorio/modules/sucursales/`.

### Task A1: Dominio + JPA + mapper

**Files:**
- Modify: `domain/model/BranchTotemConfig.java`
- Modify: `infrastructure/persistence/entity/BranchTotemConfigJpaEntity.java`
- Modify: el mapper domain↔entity de totem config

- [ ] **Step 1: Dominio**

En `BranchTotemConfig.java` agregar dos campos (con Lombok `@Getter/@Setter` ya presentes):
```java
    private boolean atencionDisplayEnabled;
    private boolean extraccionDisplayEnabled;
```

- [ ] **Step 2: JPA entity**

En `BranchTotemConfigJpaEntity.java`, junto a `enabled`:
```java
    @Column(name = "atencion_display_enabled", nullable = false)
    private boolean atencionDisplayEnabled;

    @Column(name = "extraccion_display_enabled", nullable = false)
    private boolean extraccionDisplayEnabled;
```

- [ ] **Step 3: Mapper**

En el mapper domain↔entity de totem config, mapear los dos campos en ambas direcciones (toDomain y toEntity).

- [ ] **Step 4: Compilar**

Run: `cd Backend && ./mvnw -q compile` (JDK 21)
Expected: compila.

### Task A2: Migración Flyway con backfill

**Files:**
- Create: `Backend/src/main/resources/db/migration/V9XX__add_display_flags_to_branch_totem_config.sql`

- [ ] **Step 1: Versión libre**

Run: `ls Backend/src/main/resources/db/migration/ | sort | tail -3`
Expected: último `V958...`. **Coordinar con Atención**, que reserva V959 en su rama; usar la siguiente libre (probablemente **V960**). Si hay colisión con un PR abierto, usar la próxima y avisar (memoria `flyway-version-collision-on-merge`).

- [ ] **Step 2: Escribir la migración**

```sql
-- Pantallas (TV) configurables por sucursal. Backfill: las sucursales que
-- ya tenían tótem habilitado conservan su pantalla de sala de espera.
ALTER TABLE branch_totem_config
    ADD COLUMN atencion_display_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN extraccion_display_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE branch_totem_config SET atencion_display_enabled = TRUE WHERE enabled = TRUE;
```
(`ADD COLUMN ... DEFAULT` sin `IF NOT EXISTS` — compatible H2-modo-MySQL + MySQL. NO usar `IF NOT EXISTS`, que rompe boot MySQL — memoria `migrations-h2-vs-mysql`.)

- [ ] **Step 3: Commit**

```bash
git add Backend/src/main/resources/db/migration/V9*__add_display_flags_to_branch_totem_config.sql
git commit -m "feat(sucursales): migracion flags de pantallas en branch_totem_config"
```

### Task A3: DTOs + UseCase + Controller

**Files:**
- Modify: `presentation/dto/UpsertBranchTotemConfigRequest.java`
- Modify: `presentation/dto/BranchTotemConfigResponse.java`
- Modify: `application/usecase/UpsertBranchTotemConfigUseCase.java`
- Modify: el controller PUT `/api/v1/sucursales/branches/{branchId}/totem-config`
- Test: test del usecase + controller (espejar lo existente)

- [ ] **Step 1: Request DTO**

```java
public record UpsertBranchTotemConfigRequest(
        @NotNull Boolean enabled,
        Boolean atencionDisplayEnabled,
        Boolean extraccionDisplayEnabled) {
}
```
(Los dos nuevos sin `@NotNull` para retrocompat; se tratan como `false` si vienen null.)

- [ ] **Step 2: Response DTO**

```java
public record BranchTotemConfigResponse(
        Long branchId, boolean enabled, boolean active,
        boolean atencionDisplayEnabled, boolean extraccionDisplayEnabled) {

    public static BranchTotemConfigResponse from(BranchTotemConfig domain) {
        return new BranchTotemConfigResponse(
                domain.getBranchId(), domain.isEnabled(), domain.isActive(),
                domain.isAtencionDisplayEnabled(), domain.isExtraccionDisplayEnabled());
    }
}
```

- [ ] **Step 3: Test del usecase que falla**

Espejar el test existente de upsert: dado branch sin config, al ejecutar con `enabled=true, atencion=true, extraccion=false`, el config guardado tiene esos tres valores; dado un config existente, se actualizan los tres.

- [ ] **Step 4: UseCase**

Extender la firma de `execute` para recibir los tres flags y setearlos en ambas ramas:
```java
    public BranchTotemConfig execute(Long branchId, boolean enabled,
                                     boolean atencionDisplayEnabled, boolean extraccionDisplayEnabled) {
        Long tenantId = tenantProvider.requireTenantId();
        BranchTotemConfig config = repository.findByBranchId(branchId, tenantId)
            .map(existing -> {
                existing.setEnabled(enabled);
                existing.setAtencionDisplayEnabled(atencionDisplayEnabled);
                existing.setExtraccionDisplayEnabled(extraccionDisplayEnabled);
                return existing;
            })
            .orElseGet(() -> BranchTotemConfig.builder()
                .branchId(branchId).tenantId(tenantId)
                .enabled(enabled)
                .atencionDisplayEnabled(atencionDisplayEnabled)
                .extraccionDisplayEnabled(extraccionDisplayEnabled)
                .active(true).build());
        return repository.save(config);
    }
```

- [ ] **Step 5: Controller**

En el PUT, pasar los flags del request (null → false):
```java
        var cfg = upsertBranchTotemConfigUseCase.execute(
                branchId,
                request.enabled(),
                Boolean.TRUE.equals(request.atencionDisplayEnabled()),
                Boolean.TRUE.equals(request.extraccionDisplayEnabled()));
        return ResponseEntity.ok(BranchTotemConfigResponse.from(cfg));
```

- [ ] **Step 6: Correr suite + boot MySQL**

Run: `cd Backend && ./mvnw -q -Dtest='*BranchTotemConfig*' test`
Expected: PASS. Luego boot perfil `local` con la migración aplicada; verificar columnas y backfill (sucursal con `enabled=true` → `atencion_display_enabled=true`).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(sucursales): upsert + DTOs con flags de pantallas"
```

---

## FASE D — Item 3 Frontend: toggles + store + sidebar gating

### Task D1: Modelos + store sucursal (upsert con flags)

**Files:**
- Modify: `src/app/features/sucursales/models/branch-totem-config.model.ts` (`BranchTotemConfig`, `UpsertBranchTotemConfigRequest`)
- Modify: `src/app/features/sucursales/services/branch-totem-config.service.ts` (método `update`)
- Modify: `src/app/features/sucursales/store/sucursal.actions.ts` (`upsertTotemConfig` ~línea 104)
- Modify: `src/app/features/sucursales/store/sucursal.effects.ts` (effect de upsert)
- Test: `sucursal.effects.spec.ts`

- [ ] **Step 1: Modelos**

En `branch-totem-config.model.ts`:
```ts
export interface BranchTotemConfig {
  branchId: number;
  enabled: boolean;
  active: boolean;
  atencionDisplayEnabled: boolean;
  extraccionDisplayEnabled: boolean;
}
export interface UpsertBranchTotemConfigRequest {
  enabled: boolean;
  atencionDisplayEnabled: boolean;
  extraccionDisplayEnabled: boolean;
}
```

- [ ] **Step 2: Acción**

`upsertTotemConfig` pasa a llevar los tres flags:
```ts
export const upsertTotemConfig = createAction('[Sucursal] Upsert Totem Config',
  props<{ branchId: number; enabled: boolean; atencionDisplayEnabled: boolean; extraccionDisplayEnabled: boolean }>());
```

- [ ] **Step 3: Effect + service**

El effect arma el `UpsertBranchTotemConfigRequest` con los tres flags y llama `service.update(branchId, body)`. Ajustar `sucursal.effects.spec.ts`.

- [ ] **Step 4: Correr** — Run: `npx vitest run src/app/features/sucursales/store/` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(sucursales): upsert totem config con flags de pantallas (FE store)"`

### Task D2: Toggles en el paso Tótem

**Files:**
- Modify: `steps/totem-step.component.ts` + `.html` (y por paridad `sucursal-detalle/tabs/totem-tab.component.ts` + `.html`)

- [ ] **Step 1: Test** — el paso Tótem renderiza 2 toggles "Pantalla de sala de espera (atención)" y "Pantalla de extracción"; al cambiarlos, dispatcha `upsertTotemConfig` con el flag actualizado y preservando los otros dos valores.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

En `totem-step.component.ts`, agregar computeds:
```ts
protected readonly atencionDisplay  = computed(() => this.totemConfig()?.atencionDisplayEnabled ?? false);
protected readonly extraccionDisplay = computed(() => this.totemConfig()?.extraccionDisplayEnabled ?? false);

private upsert(partial: Partial<{ enabled: boolean; atencionDisplayEnabled: boolean; extraccionDisplayEnabled: boolean }>): void {
  this.store.dispatch(upsertTotemConfig({
    branchId: this.branchId,
    enabled: partial.enabled ?? this.enabled(),
    atencionDisplayEnabled: partial.atencionDisplayEnabled ?? this.atencionDisplay(),
    extraccionDisplayEnabled: partial.extraccionDisplayEnabled ?? this.extraccionDisplay(),
  }));
}
```
Reemplazar el dispatch actual del toggle de tótem por `this.upsert({ enabled: value })`. Agregar en el `.html` una sección "Pantallas" con dos `p-toggleswitch`:
```html
<div class="space-y-2">
  <label class="flex items-center gap-3">
    <p-toggleswitch [ngModel]="atencionDisplay()" (ngModelChange)="upsert({ atencionDisplayEnabled: $event })" />
    Pantalla de sala de espera (atención)
  </label>
  <label class="flex items-center gap-3">
    <p-toggleswitch [ngModel]="extraccionDisplay()" (ngModelChange)="upsert({ extraccionDisplayEnabled: $event })" />
    Pantalla de extracción
  </label>
</div>
```
Replicar lo mismo en `totem-tab.component.ts/.html` (edición post-creación).

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(sucursales): toggles de pantallas en paso totem"`

### Task D3: Store del sidebar (branch-totem-config) con los flags

**Files:**
- Modify: `src/app/features/turnos/store/branch-totem-config/branch-totem-config.state.ts`
- Modify: `.../branch-totem-config.actions.ts`
- Modify: `.../branch-totem-config.reducer.ts`
- Modify: `.../branch-totem-config.selectors.ts`
- Modify: `.../services/branch-totem-config.service.ts` (el de turnos: `get` devuelve los flags)
- Test: reducer/selectors spec

- [ ] **Step 1: State**

```ts
export interface BranchTotemConfigState {
  branchId: number | null;
  enabled: boolean | null;
  atencionDisplayEnabled: boolean | null;
  extraccionDisplayEnabled: boolean | null;
  loading: boolean;
  error: unknown | null;
}
```
Agregar los dos a `initialBranchTotemConfigState` (`null`).

- [ ] **Step 2: Acciones**

`loadBranchTotemConfigSuccess` pasa a llevar los tres flags:
```ts
export const loadBranchTotemConfigSuccess = createAction(
  '[BranchTotemConfig] Load Success',
  props<{ branchId: number; enabled: boolean; atencionDisplayEnabled: boolean; extraccionDisplayEnabled: boolean }>());
```

- [ ] **Step 3: Reducer** — en `loadBranchTotemConfigSuccess` setear los tres; en `loadBranchTotemConfigFailure`/404 default `false`.

- [ ] **Step 4: Selectors**

```ts
export const selectAtencionDisplayEnabled = createSelector(
  selectBranchTotemConfigState, (s) => s?.atencionDisplayEnabled ?? false);
export const selectExtraccionDisplayEnabled = createSelector(
  selectBranchTotemConfigState, (s) => s?.extraccionDisplayEnabled ?? false);
```

- [ ] **Step 5: Effect/service** — el effect mapea `config.atencionDisplayEnabled`/`config.extraccionDisplayEnabled` al success (y `false` en el branch 404). El modelo `BranchTotemConfig` de turnos suma los dos campos.

- [ ] **Step 6: Correr** — `npx vitest run src/app/features/turnos/store/branch-totem-config/` → PASS.

- [ ] **Step 7: Commit** — `git commit -m "feat(turnos): flags de pantallas en store branch-totem-config (sidebar)"`

### Task D4: Sidebar — links dinámicos gateados

**Files:**
- Modify: `src/app/layout/sidebar/sidebar.nav.ts` (quitar sección hardcodeada "Pantallas en sala")
- Modify: `src/app/layout/sidebar/sidebar.component.ts`

- [ ] **Step 1: Test** — con `atencionDisplayEnabled=true, extraccionDisplayEnabled=false, enabled=false`, el sidebar muestra "TV sala de espera" con URL `/display/{slug}/{branchId}` y NO muestra "TV extracción" ni "Tótem".

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

- Borrar de `sidebar.nav.ts` la sección expandible "Pantallas en sala" (líneas ~67-75) con las URLs `lab-demo/1001`.
- En `sidebar.component.ts`, agregar signals de los selectors nuevos y computeds de URL:
```ts
private readonly atencionDisplay  = this.store.selectSignal(selectAtencionDisplayEnabled);
private readonly extraccionDisplay = this.store.selectSignal(selectExtraccionDisplayEnabled);

readonly tvSalaUrl = computed<string | null>(() => {
  if (!this.atencionDisplay()) return null;
  const slug = this.tenantSlug(); const id = this.branchId();
  return slug && id ? `/display/${slug}/${id}` : null;
});
readonly tvExtraccionUrl = computed<string | null>(() => {
  if (!this.extraccionDisplay()) return null;
  const slug = this.tenantSlug(); const id = this.branchId();
  return slug && id ? `/display/extraccion/${slug}/${id}` : null;
});
readonly totemUrl = computed<string | null>(() => {
  if (!this.totemEnabled()) return null;
  const slug = this.tenantSlug(); const id = this.branchId();
  return slug && id ? `/turnos/totem` : null;   // ajustar params reales si la ruta los requiere
});
```
- En el template del sidebar, reemplazar el link condicional único "Sala de espera" (hoy gateado por `totemEnabled`) por tres links condicionales (`@if (tvSalaUrl(); as url)`, idem extracción y tótem), externos, con el mismo estilo `ui-sidebar__item`. Evitar duplicar la pantalla de sala (un solo link a `/display/{slug}/{id}`).

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(sidebar): links de pantallas dinamicos gateados por config de sucursal"`

---

## FASE E — Item 2: Resumen real en el paso Confirmar

**Files:**
- Modify: `steps/confirmar-step.component.html` → pasar a componente con TS: `steps/confirmar-step.component.ts` (+ `.html`)
- Create (si conviene): helpers de formateo reusables (días, scheduleType, contactType)
- Test: `confirmar-step.component.spec.ts`

### Task E1: Construir el resumen

- [ ] **Step 1: Test** — dado el store del alta con datos cargados (nombre, dirección, 1 horario, 1 contacto, 1 área con 2 secciones, tótem habilitado, pantallas atención=true/extracción=false), el confirmar-step renderiza: el nombre; "Calle 123, Córdoba, Córdoba"; "Lun, Mié · 09:00–17:00 · Día completo"; "Email: info@lab.com"; "Hematología: Sección A, Sección B"; "Tótem: Habilitado · Boxes atención: 2 · Boxes extracción: 1"; "Pantallas — Sala de espera: Sí · Extracción: No". Y los textos "Sin …" cuando una sección está vacía.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar**

Convertir `confirmar-step` en componente standalone con TS que lee los mismos selectors/signals que usan los pasos previos (datos, horarios, contactos, workspaces, tótem) del store de sucursal en alta. Resolver nombres (ciudad/provincia/área/sección) a texto, no IDs. Helpers:
```ts
const DAY_LABELS: Record<string,string> = { MON:'Lun', TUE:'Mar', WED:'Mié', THU:'Jue', FRI:'Vie', SAT:'Sáb', SUN:'Dom' };
const SCHEDULE_TYPE_LABELS: Record<string,string> = { FULL_DAY:'Día completo', MORNING:'Mañana', AFTERNOON:'Tarde', NIGHT:'Noche' };
const CONTACT_TYPE_LABELS: Record<string,string> = { PHONE:'Teléfono', MOBILE:'Celular', EMAIL:'Email', WHATSAPP:'WhatsApp', FAX:'Fax', WEBSITE:'Sitio web' };
```
(Reutilizar los labels que ya existen en los pasos correspondientes si están exportados, para no duplicar el mapeo — DRY.)
Render por secciones (Datos, Horarios, Contactos, Áreas, Tótem, Pantallas), cada una con su fallback "Sin …".

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(sucursales): resumen real legible en el paso confirmar"`

---

## FASE F — Verificación final

### Task F1: Suites + smoke

- [ ] **Step 1: FE componentes** — `ng test --watch=false` → verde.
- [ ] **Step 2: FE store** — `npx vitest run src/app/features/sucursales/store/ src/app/features/turnos/store/branch-totem-config/` → PASS.
- [ ] **Step 3: BE** — `cd Backend && ./mvnw -q test` (JDK 21) + boot MySQL real con la migración (backfill verificado).
- [ ] **Step 4: Smoke E2E manual** — levantar el worktree (`start-worktree.ps1`, schema dedicado). Verificar:
  - Modal Nueva área sin "Tipo"/"Lab externo"; el área se crea OK.
  - Stepper sin textos de ayuda largos.
  - Paso Confirmar muestra el resumen real legible.
  - En Tótem, prender solo "extracción" → en el sidebar aparece solo "TV extracción", no "TV sala de espera".
  - Prender solo "atención" → solo "TV sala de espera".
  - Sucursal con tótem habilitado (preexistente) conserva "TV sala de espera" por el backfill.
- [ ] **Step 5: PRs — exactamente 1 de BE + 1 de FE** contra `development`, cada uno linkeando el Jira (regla #1/#3). El PR de BE consolida TODO lo de backend (flags de pantallas + migración + upsert/endpoint); el PR de FE consolida TODO lo de frontend (item 4, item 1, toggles del paso Tótem, sidebar, resumen del paso 6). NO abrir un PR por fase.

---

## Self-review (cobertura del spec)

- Item 4 (tipo de área wireado OTRO desde FE) → B1. ✅
- Item 1 (limpieza agresiva) → C1. ✅
- Item 3 BE (flags + migración + backfill + upsert) → A1, A2, A3. ✅
- Item 3 FE (toggles + store + sidebar) → D1, D2, D3, D4. ✅
- Item 2 (resumen real) → E1. ✅

Sin placeholders: cada task trae código o edición exacta. Tipos consistentes: `atencionDisplayEnabled`/`extraccionDisplayEnabled` (boolean) en BE (domain/jpa/dto), FE models, ambos stores y selectors; acción `upsertTotemConfig` con los tres flags en todos los dispatchers (paso Tótem y tab de detalle).
