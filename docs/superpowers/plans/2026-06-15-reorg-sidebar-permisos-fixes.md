# Reorg sidebar + permisos (2 capas) + 9 fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans. Steps con checkbox (`- [ ]`).
>
> **Jira:** _(pendiente — `jira-workflow`, regla #1, salvo "codeá directo")_
>
> **Spec:** `docs/superpowers/specs/2026-06-15-reorg-sidebar-permisos-fixes-design.md`

**Goal:** Reorganizar el sidebar en 3 folders (Recepción/Clínico/Gestión), rediseñar el modelo de permisos a 2 capas (módulo del tenant → sección del usuario, con AccessSection 1:1 con el sidebar), mostrar los permisos en grilla, y resolver 5 fixes sueltos (editar-sucursal→stepper, tótem toggles, link primer login, bug Rol, sucursal stale).

**Architecture:** Cross-stack. BE: redefinir el enum `AccessSection` + migración de `user_access_sections`. FE: sidebar nav nuevo, `SECTION_GROUPS`/presets/`access.model` alineados, grilla de permisos, y fixes de UI. Capa 1 (módulos) ya la aplica `GetGrantableSectionsUseCase`; Capa 2 (secciones por usuario) ya existe (`AccessRegistry` + role presets) — se reusa con los códigos nuevos.

**Tech Stack:** Spring Boot + Flyway + JUnit (JDK 21); Angular 21 standalone + signals + NgRx + PrimeNG; `ng test` / `npx vitest`.

**PRs (regla del usuario): 1 PR de BE + 1 PR de FE.** Las fases A* = PR de BE; las fases F* = PR de FE.

**Worktrees:** BE en `Backend` (crear off `origin/development`, JDK 21). FE en `.worktrees/reorg-sidebar` (`npm ci`).

**Orden:** BE primero (enum + migración = base). Luego FE: capa permisos → sidebar → fixes sueltos.

---

# PARTE BE — 1 PR

`Backend/.../shared/access/AccessSection.java` + migración. Crear worktree: `git -C Backend fetch origin && git -C Backend worktree add -b feat/reorg-sidebar-permisos .worktrees/reorg-sidebar origin/development`.

### Task A1: Redefinir el enum `AccessSection`

**Files:**
- Modify: `Backend/src/main/java/lab/laboratorio/shared/access/AccessSection.java`

- [ ] **Step 1: Reemplazar los valores del enum**

`ANALITICA` es el módulo base (clínico, siempre activo). Las secciones core cuelgan de él; las opcionales de su módulo.
```java
public enum AccessSection {

    RECEPCION(ModuleCode.ANALITICA, "Recepción"),
    PACIENTES(ModuleCode.ANALITICA, "Pacientes"),
    AGENDAS(ModuleCode.TURNOS, "Configuración de agendas"),
    MEDICOS(ModuleCode.MEDICOS, "Médicos derivantes"),
    PREANALITICA(ModuleCode.ANALITICA, "Preanalítica"),
    ANALITICA(ModuleCode.ANALITICA, "Analítica"),
    POSTANALITICA(ModuleCode.ANALITICA, "Postanalítica"),
    EXTRACCIONES(ModuleCode.ANALITICA, "Cola de extracción"),
    EMPRESA(ModuleCode.ANALITICA, "Empresa"),
    SUCURSALES(ModuleCode.ANALITICA, "Sucursales"),
    OBRAS_SOCIALES(ModuleCode.ANALITICA, "Obras sociales"),
    FINANCIERO(ModuleCode.FINANCIERO, "Financiero"),
    STOCK(ModuleCode.STOCK, "Stock e insumos");
    // ... resto del enum (constructor/getters) igual
}
```
(Quita `ATENCION`, `TURNOS`, `PORTAL`. `OBRAS_SOCIALES` pasa de `COVERAGES` → `ANALITICA` = core, Fix 8.)

- [ ] **Step 2: Verificar que ANALITICA sea siempre-activo**

Run: revisar `infrastructure/module/PropertiesTenantModuleDefaultsProvider` + `application.yml` (`app.modules.enabled-by-default`). Confirmar que `ANALITICA` está en los default-enabled (así las secciones core nunca se ocultan por Capa 1). Si no está, agregarlo a los defaults.
Expected: `isEnabledByDefault(tenant, ANALITICA) == true` para cualquier tenant.

- [ ] **Step 3: Compilar y arreglar usos de los valores viejos**

Run: `cd Backend && ./mvnw -q compile` (JDK 21)
Expected: errores donde se referencien `AccessSection.ATENCION` / `TURNOS` / `PORTAL`. Buscar (`grep -rn "AccessSection.ATENCION\|AccessSection.TURNOS\|AccessSection.PORTAL" src/main`) y reemplazar: `ATENCION`→`RECEPCION`; `TURNOS`→`RECEPCION` (o `AGENDAS` según el contexto de gating de cada uso — revisar caso por caso); quitar usos de `PORTAL`. Recompilar hasta verde.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(access): redefinir AccessSection 1:1 con el sidebar (RECEPCION/AGENDAS/MEDICOS/EMPRESA, sin PORTAL/ATENCION/TURNOS)"
```

### Task A2: Migración Flyway de `user_access_sections`

**Files:**
- Create: `Backend/src/main/resources/db/migration/V9XX__remap_access_sections.sql`

- [ ] **Step 1: Versión libre** — Run: `ls Backend/src/main/resources/db/migration/ | sort | tail -3`. Usar la siguiente libre (coordinar con lo ya mergeado, hoy V965 está en development → probablemente **V966**); si hay colisión, la próxima.

- [ ] **Step 2: Escribir la migración** (SQL plano, compatible H2-modo-MySQL + MySQL; el orden evita colisiones con la unique `(tenant_id,user_id,section_code)`)

```sql
-- Remap de secciones a la nomenclatura 1:1 con el sidebar nuevo.
-- Antes de esta migración NO existe 'RECEPCION', así que ATENCION->RECEPCION no colisiona.
UPDATE user_access_sections SET section_code = 'RECEPCION' WHERE section_code = 'ATENCION';

-- TURNOS también mapea a RECEPCION; borrar primero los TURNOS de usuarios que ya quedaron con RECEPCION para no duplicar.
DELETE FROM user_access_sections
 WHERE section_code = 'TURNOS'
   AND (tenant_id, user_id) IN (
     SELECT t.tenant_id, t.user_id FROM (
       SELECT tenant_id, user_id FROM user_access_sections WHERE section_code = 'RECEPCION'
     ) t);
UPDATE user_access_sections SET section_code = 'RECEPCION' WHERE section_code = 'TURNOS';

-- Portal eliminado.
DELETE FROM user_access_sections WHERE section_code = 'PORTAL';

-- Los ADMINISTRADOR conservan la gestión: insertar las secciones nuevas que les corresponden por preset.
INSERT INTO user_access_sections (tenant_id, user_id, section_code, active, created_at, updated_at, created_by, updated_by, version)
SELECT DISTINCT ur.tenant_id, ur.user_id, s.code, 1, NOW(6), NOW(6), 'migration-v9xx', 'migration-v9xx', 0
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.code = 'ADMINISTRADOR'
JOIN (SELECT 'AGENDAS' AS code UNION SELECT 'MEDICOS' UNION SELECT 'EMPRESA') s
WHERE ur.active = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_access_sections x
     WHERE x.tenant_id = ur.tenant_id AND x.user_id = ur.user_id AND x.section_code = s.code);
```

- [ ] **Step 3: Validar boot** — boot perfil `local` contra MySQL fresco con la migración aplicada (memoria `mysql-boot-verification`); verificar que las filas viejas quedaron remapeadas y los admin tienen AGENDAS/MEDICOS/EMPRESA. Correr la suite (H2): la migración debe parsear aunque las tablas estén vacías.

- [ ] **Step 4: Commit** — `git commit -m "feat(access): migracion remap de user_access_sections (ATENCION/TURNOS->RECEPCION, drop PORTAL, admin sections)"`

### Task A3: Suite BE + abrir PR BE

- [ ] **Step 1** — `cd Backend && ./mvnw -q test` (JDK 21) → verde (ajustar tests que usaban los enums viejos).
- [ ] **Step 2** — Abrir **1 PR de BE** contra `development`, linkeando el Jira.

---

# PARTE FE — 1 PR

Worktree `.worktrees/reorg-sidebar` (branch `feat/reorg-sidebar-permisos`, ya creado con el spec). `npm ci`.

### Task F1: `AccessSection` (FE type) nuevo

**Files:** Modify `src/app/core/access/access.model.ts`

- [ ] **Step 1** — Reemplazar el type union por los códigos nuevos:
```ts
export type AccessSection =
  | 'RECEPCION' | 'PACIENTES' | 'AGENDAS' | 'MEDICOS'
  | 'PREANALITICA' | 'ANALITICA' | 'POSTANALITICA' | 'EXTRACCIONES'
  | 'EMPRESA' | 'SUCURSALES' | 'OBRAS_SOCIALES' | 'FINANCIERO' | 'STOCK';
```
- [ ] **Step 2** — `npx tsc -p tsconfig.app.json --noEmit` → anota los usos de `'ATENCION'`/`'TURNOS'`/`'PORTAL'` (se arreglan en F2/F3/F5).

### Task F2: `SECTION_GROUPS` = 3 folders del sidebar

**Files:** Modify `src/app/features/roles-permisos/models/access-section-groups.ts`

- [ ] **Step 1: Test** — el spec verifica que los grupos son Recepción/Clínico/Gestión con las secciones nuevas en orden.
- [ ] **Step 2: Implementar**
```ts
export const SECTION_GROUPS: SectionGroup[] = [
  { label: 'Recepción', sections: ['RECEPCION', 'PACIENTES', 'AGENDAS', 'MEDICOS'] },
  { label: 'Clínico',   sections: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA', 'EXTRACCIONES'] },
  { label: 'Gestión',   sections: ['EMPRESA', 'SUCURSALES', 'OBRAS_SOCIALES', 'FINANCIERO', 'STOCK'] },
];
```
- [ ] **Step 3** — `ng test --include='**/access-section-groups.spec.ts' --watch=false` → PASS. Commit.

### Task F3: Presets por rol (`ROLE_SECTION_PRESETS`)

**Files:** Modify `src/app/features/empresa/models/role-section-presets.ts`

- [ ] **Step 1: Implementar** (alineado a las secciones nuevas)
```ts
export const ROLE_SECTION_PRESETS: Record<string, AccessSection[]> = {
  ADMINISTRADOR: ['RECEPCION','PACIENTES','AGENDAS','MEDICOS','PREANALITICA','ANALITICA','POSTANALITICA','EXTRACCIONES','EMPRESA','SUCURSALES','OBRAS_SOCIALES','FINANCIERO','STOCK'],
  SECRETARIA: ['RECEPCION','PACIENTES','AGENDAS','OBRAS_SOCIALES'],
  RESPONSABLE_SECRETARIA: ['RECEPCION','PACIENTES','AGENDAS','OBRAS_SOCIALES','FINANCIERO','SUCURSALES','EMPRESA'],
  FACTURISTA: ['FINANCIERO','OBRAS_SOCIALES','PACIENTES'],
  EXTRACTOR: ['EXTRACCIONES','RECEPCION'],
  TECNICO_LABORATORIO: ['PREANALITICA','ANALITICA','EXTRACCIONES'],
  BIOQUIMICO: ['PREANALITICA','ANALITICA','POSTANALITICA','PACIENTES'],
  MANAGER_STOCK: ['STOCK'],
  EXTERNO: [],
};
```
- [ ] **Step 2** — actualizar `role-section-presets.spec.ts`. `ng test --include='**/role-section-presets.spec.ts' --watch=false` → PASS. Commit.

### Task F4: Grilla en `secciones-checklist`

**Files:** Modify `src/app/features/roles-permisos/components/secciones-checklist.component.ts`

- [ ] **Step 1: Test** — el componente renderiza los grupos en grilla (varias columnas), no en una sola columna vertical.
- [ ] **Step 2: Implementar** — cambiar el layout a CSS grid:
```css
.rp-secciones__groups { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4) var(--space-6); }
```
Envolver los grupos en ese contenedor; cada grupo (h4 + checkboxes) es una celda. Responsive: 1 columna en mobile (el `auto-fit minmax` lo resuelve).
- [ ] **Step 3** — `ng test --include='**/secciones-checklist.component.spec.ts' --watch=false` → PASS. Commit `feat(permisos): grilla de secciones agrupada por folder`.

### Task F5: Sidebar nuevo (`sidebar.nav.ts`) + TV/Tótem en Recepción

**Files:** Modify `src/app/layout/sidebar/sidebar.nav.ts` y `sidebar.component.ts`

- [ ] **Step 1: Reemplazar `NAV_SECTIONS`**
```ts
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Recepción',
    items: [
      { kind: 'link', label: 'Recepción', icon: 'pi pi-bell', path: '/turnos/recepcion', sectionKey: 'RECEPCION' },
      { kind: 'link', label: 'Pacientes', icon: 'pi pi-address-book', path: '/pacientes', sectionKey: 'PACIENTES' },
      { kind: 'link', label: 'Configuración de agendas', icon: 'pi pi-calendar-plus', path: '/turnos/configuracion', moduleKey: ModuleKey.Turnos, sectionKey: 'AGENDAS' },
      { kind: 'link', label: 'Médicos derivantes', icon: 'pi pi-heart', path: '/medicos', moduleKey: ModuleKey.Medicos, sectionKey: 'MEDICOS' },
    ],
  },
  {
    label: 'Clínico',
    items: [
      { kind: 'expandable', label: 'Muestras', icon: 'pi pi-flask', children: [
        { label: 'Recolección',   path: '/analitica/recoleccion',   sectionKey: 'PREANALITICA' },
        { label: 'Traslado',      path: '/analitica/traslado',      sectionKey: 'PREANALITICA' },
        { label: 'Procesamiento', path: '/analitica/procesamiento', sectionKey: 'ANALITICA' },
        { label: 'Validación',    path: '/analitica/validacion',    sectionKey: 'ANALITICA' },
        { label: 'Descarte',      path: '/analitica/descarte',      sectionKey: 'POSTANALITICA' },
      ]},
      { kind: 'link', label: 'Cola de extracción', icon: 'pi pi-bolt', path: '/analitica/extraccion', sectionKey: 'EXTRACCIONES' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { kind: 'link', label: 'Empresa',        icon: 'pi pi-building', path: '/empresa', sectionKey: 'EMPRESA' },
      { kind: 'link', label: 'Sucursales',     icon: 'pi pi-building', path: '/sucursales', sectionKey: 'SUCURSALES' },
      { kind: 'link', label: 'Obras sociales', icon: 'pi pi-id-card', path: '/obras-sociales', sectionKey: 'OBRAS_SOCIALES' },
      { kind: 'link', label: 'Financiero',     icon: 'pi pi-wallet', path: '/financiero', moduleKey: ModuleKey.Financiero, sectionKey: 'FINANCIERO' },
      { kind: 'link', label: 'Stock e insumos', icon: 'pi pi-box', path: '/stock', moduleKey: ModuleKey.Stock, sectionKey: 'STOCK' },
    ],
  },
];
```
(Empresa/Sucursales/Agendas dejan de usar `roleKey`; ahora gatean por `sectionKey`. Médicos pasa a tener `sectionKey: 'MEDICOS'`.)

- [ ] **Step 2: TV/Tótem dentro de Recepción** — en `sidebar.component.ts`, los links dinámicos de TV sala / TV extracción / Tótem (gateados por la config de pantallas de la sucursal, agregados por el PR de sucursales) hoy se inyectan en el footer; moverlos para que se rendericen dentro del folder **Recepción**. Mantener su gating por `selectAtencionDisplayEnabled` / `selectExtraccionDisplayEnabled` / `selectBranchTotemEnabled`.

- [ ] **Step 3: Tests del sidebar** — `ng test --include='**/sidebar*' --watch=false` → ajustar y PASS. Commit `feat(sidebar): reorg Recepción/Clínico/Gestión, sin Principal/Portal`.

### Task F6: Landing = primera sección disponible (sacar Inicio)

**Files:** Modify `src/app/app.routes.ts` (+ crear `src/app/core/access/landing-redirect.guard.ts`)

- [ ] **Step 1: Guard de landing** — crear un `CanActivateFn` que calcule la primera ruta accesible según las secciones efectivas del usuario y redirija:
```ts
export const landingRedirectGuard: CanActivateFn = () => {
  const access = inject(AccessRegistry);
  const router = inject(Router);
  const order: { section: AccessSection; path: string }[] = [
    { section: 'RECEPCION', path: '/turnos/recepcion' },
    { section: 'EXTRACCIONES', path: '/analitica/extraccion' },
    { section: 'PACIENTES', path: '/pacientes' },
    { section: 'PREANALITICA', path: '/analitica/recoleccion' },
    { section: 'EMPRESA', path: '/empresa' },
    // ...resto en orden razonable
  ];
  const target = order.find((o) => access.has(o.section))?.path ?? '/turnos/recepcion';
  return router.parseUrl(target);
};
```
- [ ] **Step 2: Rutas** — quitar la ruta `/home` (y su componente Inicio del sidebar ya salió en F5). La ruta `''` (post-login) usa `landingRedirectGuard` para redirigir. Verificar que el guard de auth siga primero.
- [ ] **Step 3** — smoke: un EXTRACTOR cae en Cola de extracción; un admin en Recepción. Commit `feat(nav): landing a la primera seccion disponible (sin Inicio)`.

### Task F7: Bug Rol no precarga (paso 2 empleados)

**Files:** Modify `src/app/features/sucursales/pages/empleado-form/steps/usuario-step/usuario-step.component.ts`

- [ ] **Step 1: Test** — al iniciar el `usuario-step`, las opciones de Rol están pobladas (mock del `RolesApiService.list()` que devuelve roles → el `roles()` signal queda con datos; el `p-select` los muestra).
- [ ] **Step 2: Implementar** — robustecer la carga: manejar error y reintento, y asegurar que se dispare. Reemplazar la suscripción silenciosa del constructor:
```ts
this.rolesApi.list().pipe(
  catchError(() => { this.notification.error('No se pudieron cargar los roles. Reintentá.'); return of([] as Rol[]); }),
  takeUntilDestroyed(),
).subscribe((r) => this.roles.set(r));
```
Verificar también el catálogo de secciones (`sectionsApi.getGrantable()`) con el mismo patrón. Confirmar que el endpoint `GET /api/v1/role` responde (sin 401/403) en el contexto del paso 2.
- [ ] **Step 3** — `ng test --include='**/usuario-step.component.spec.ts' --watch=false` → PASS. Commit `fix(empleados): cargar roles del paso 2 con manejo de error`.

### Task F8: Link de primer login en la UI (crear/regenerar)

**Files:** Create `src/app/features/empresa/pages/usuarios/components/first-login-link-dialog.component.ts`; Modify `usuarios.page.ts` + `empresa.effects.ts`/`empresa.reducer.ts` (exponer el token).

- [ ] **Step 1: Test** — tras `addUsuarioSuccess`/`regenerateFirstLoginTokenSuccess`, la page muestra un dialog con el link `/first-login?token=<token>` y un botón "Copiar link".
- [ ] **Step 2: Implementar**
  - El reducer ya guarda `firstLoginToken` en `addUsuarioSuccess`; agregar lo mismo para `regenerateFirstLoginTokenSuccess` (guardar `token` en un signal/estado `lastFirstLoginToken`).
  - Selector `selectLastFirstLoginToken`.
  - Dialog component (`p-dialog`) que recibe el token, arma `window.location.origin + '/first-login?token=' + token`, lo muestra (readonly input) + botón "Copiar link" (`navigator.clipboard.writeText`).
  - En `usuarios.page`, abrir el dialog cuando el token cambia (effect sobre el selector). Cambiar el toast actual "Invitación enviada al email" por "Usuario creado — copiá el link de acceso" (el email no se manda hoy).
- [ ] **Step 3** — `ng test --include='**/usuarios*' --watch=false` → PASS. Commit `feat(empresa): mostrar link de primer login al crear/regenerar`.

### Task F9: Sucursal stale al cambiar de tenant

**Files:** Modify `src/app/core/branch/branch-bootstrap.service.ts` (+ las fuentes que persisten branch: `OperatorBranchContextService`, `extractor-box.service`, `totem-config.service`).

- [ ] **Step 1: Test** — dado un `branchId` persistido que NO pertenece al tenant/usuario actual, al bootear la sesión la branch se descarta y se deriva de la sucursal del usuario (o se limpia). Key de localStorage scopeada por `tenantId+userId`.
- [ ] **Step 2: Implementar**
  - Scopear las keys de localStorage de branch por `tenantId:userId` (ej. `operatorBranch:{tenantId}:{userId}`), así no se filtran entre tenants.
  - En el bootstrap de sesión (post-login): si el branch persistido no está en las sucursales del usuario/tenant, descartarlo y setear la sucursal del usuario (cada usuario opera en UNA — `UserBranchAccessPort`/perfil). El `branch-bootstrap.service` ya valida stale; extender esa validación a las otras fuentes y al `branch-badge`.
- [ ] **Step 3** — `ng test --include='**/branch-bootstrap*' --watch=false` → PASS. Smoke: login con otro tenant → el topbar muestra la sucursal correcta, no arrastra la anterior; el alta de atención funciona. Commit `fix(branch): descartar sucursal stale al cambiar de tenant (key por tenant+usuario)`.

### Task F10: Editar sucursal → stepper editable (sin botón "Guardar boxes")

**Files:** Modify `sucursales.routes.ts`, `sucursal-alta-stepper.page.ts` (modo edición), `sucursales-configuracion.component.ts` (el `openDetail`/edit navega al stepper), `totem-step.component.*`.

- [ ] **Step 1: Ruteo del editar** — el editar de la lista de sucursales navega a la ruta del stepper en modo edición (ej. `/sucursales/configuracion/:id/editar`), no a `sucursal-detalle`. Agregar/usar esa ruta apuntando a `sucursal-alta-stepper.page` con el id.
- [ ] **Step 2: Modo edición en el stepper** — el `sucursal-alta-stepper.page` detecta `:id`; precarga la sucursal (datos, horarios, contactos, workspaces, tótem/boxes) y en cada paso hace **update** en vez de create. El "guardar y confirmar" final persiste todo (incluidos los boxes).
- [ ] **Step 3: Quitar "Guardar boxes"** — en `totem-step`, eliminar el botón "Guardar boxes" y su acción; los boxes se incluyen en el guardado final del stepper.
- [ ] **Step 4** — tests de los componentes tocados + smoke: editar una sucursal abre el stepper precargado; cambiar boxes y confirmar persiste. Commit `feat(sucursales): editar abre el stepper editable; boxes se guardan al confirmar`.

### Task F11: Paso Tótem — 3 toggles ordenados

**Files:** Modify `sucursal-alta-stepper/steps/totem-step.component.html` (+ `.ts` si hace falta)

- [ ] **Step 1: Implementar** — sacar el tótem de la "card grande"; renderizar los 3 toggles en una lista/fila limpia, en este orden y labels:
  1. **Tótem**
  2. **Pantalla sala de espera** (label exacto: "Pantalla sala de espera")
  3. **Pantalla de extracción**
  Los boxes quedan debajo (sin botón "Guardar boxes", Task F10).
- [ ] **Step 2** — `ng test --include='**/totem-step*' --watch=false` → PASS. Commit `feat(sucursales): paso totem con 3 toggles ordenados`.

### Task F12: Verificación FE + PR

- [ ] **Step 1** — `ng test --watch=false` → verde. `npx ng build` → compila.
- [ ] **Step 2** — `npx vitest run src/app/features/empresa src/app/features/sucursales src/app/features/roles-permisos` → PASS.
- [ ] **Step 3: Smoke E2E** — login tenant nuevo (sucursal correcta, landing a primera sección); permisos en grilla agrupados como el sidebar; sidebar Recepción/Clínico/Gestión sin Inicio/Portal; OOSS visible sin Financiero; rol carga en paso 2; link de primer login copiable; editar sucursal → stepper; tótem 3 toggles.
- [ ] **Step 4** — Abrir **1 PR de FE** contra `development`, linkeando el Jira.

---

## Self-review (cobertura del spec)

- Fix 5 sidebar reorg → F5, F6. ✅
- Fix 6 AccessSection 1:1 + migración → A1, A2, F1, F2, F3. ✅
- Fix 7 grilla → F4. ✅
- Fix 8 desacoplar OOSS → A1 (parentModule ANALITICA), F2/F5 (sin módulo). ✅
- Fix 1 editar→stepper + sin "Guardar boxes" → F10. ✅
- Fix 2 tótem 3 toggles → F11. ✅
- Fix 3 link primer login → F8. ✅
- Fix 4 bug Rol → F7. ✅
- Fix 9 sucursal stale → F9. ✅

Tipos consistentes: secciones nuevas idénticas en BE enum, FE type, SECTION_GROUPS, presets, sidebar y migración. Sin placeholders salvo el Vnnn de migración (se resuelve al crearla) y la verificación de ANALITICA default-enabled (A1 Step 2).
