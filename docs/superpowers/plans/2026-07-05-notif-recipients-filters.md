# Editor de destinatarios — filtros rol/sucursal + búsqueda + asignados/resumen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans. Pasos con checkbox (`- [ ]`).
>
> **Jira:** _pendiente — crear con jira-workflow antes de implementar (follow-up de KAN-185)._

**Goal:** El editor de destinatarios (fila expandida de la config de notificaciones) filtra usuarios por rol/sucursal, tiene búsqueda + scroll, y un bloque "asignados + resumen" reactivo con chips que se despliegan ("Otros") y permiten quitar; manteniendo el modelo aditivo con excepciones de KAN-185.

**Architecture:** Backend enriquece `eligible` con `roleCodes` + `branchId` por usuario + lista de `branches`. Frontend rehace el `recipients-editor` a 2 cards (filtros / usuarios) + bloque inferior (resumen + asignados), con la lógica de filtrado/derivación en funciones puras testeables.

**Tech Stack:** Java 21 + Spring hexagonal, JUnit5/Mockito. Angular 21 standalone + signals + PrimeNG, Vitest. Skills UI: `laboratory-ui`, `laboratory-ui-table`.

## Global Constraints

- **Errores español sin leak** (Regla #4). **PrimeIcons, no emojis.** OnPush + signals. Auto-save (contrato `updateConfig` sin cambios).
- **Sin migración** (solo DTO/use case + FE). Backward-compatible.
- **Modelo de recipients intacto** (KAN-185): ROLE aditivo + USER + EXCLUDED_USER. La **sucursal es filtro visual**, no acota el rol.
- **JDK 21:** `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'` para `mvnw`. FE: vitest + `npm run build` (NO `ng test`; specs de componente que renderizan signal-inputs fallan bajo vitest → lógica en módulos puros).
- **Worktrees** (off development): BE `feat/notif-recipients-filters` (crear con superpowers:using-git-worktrees) + FE ya existe (`TESIS/FRONTEND-LABORATORIO/.worktrees/notif-recipients-filters`). Un ticket, dos PRs.

---

# FASE A — Backend (enriquecer `eligible`)

### Task A1: `eligible` expone roleCodes + branchId por usuario + lista de branches

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/notificaciones/presentation/dto/EligibleUserDto.java`
- Create: `.../presentation/dto/EligibleBranchDto.java`
- Modify: `.../presentation/dto/EligibleRecipientsResponse.java`
- Modify: `.../application/usecase/ListEligibleRecipientsUseCase.java`
- Test: `.../application/usecase/ListEligibleRecipientsUseCaseTest.java`

**Interfaces:**
- Produces: `EligibleUserDto(Long id, String nombre, boolean tieneAcceso, List<String> roleCodes, Long branchId)`; `EligibleBranchDto(Long id, String name)`; `EligibleRecipientsResponse(List<EligibleUserDto> users, List<EligibleRoleDto> roles, List<EligibleBranchDto> branches)`.
- Consumes: `User.roles()` (`List<Role>`, `Role.code()`), `User.branch()` (`Long`); `sucursales.domain.port.BranchRepositoryPort.findById(tenantId, id) -> Optional<Branch>` (`Branch.getId()`, `Branch.getDescription()` = nombre visible).

- [ ] **Step 1: Test que falla** — extender `ListEligibleRecipientsUseCaseTest`: un usuario con roles [EXTRACTOR] y branch 5 aparece con `roleCodes=["EXTRACTOR"]`, `branchId=5`; el response trae `branches` con `{5,"Sucursal Centro"}`.
```java
    @Test
    void exposes_roleCodes_branchId_and_branches() {
        // arrange: userRepositoryPort.findAllByTenantId(1L) -> [ user(id=10, roles=[role("EXTRACTOR")], branch=5) ]
        //          userAccessSectionRepositoryPort.findSectionsByUser(1L,10L) -> Set.of(evento.requiredSection())
        //          roleRepositoryPort.findAll() -> [ role("EXTRACTOR") ]
        //          branchRepositoryPort.findById(1L,5L) -> Optional.of(branch(5L,"Sucursal Centro"))
        var resp = useCase.execute(1L, NotificationEventType.URGENT_SLA_BREACHED);
        var u = resp.users().get(0);
        assertThat(u.roleCodes()).containsExactly("EXTRACTOR");
        assertThat(u.branchId()).isEqualTo(5L);
        assertThat(resp.branches()).extracting(EligibleBranchDto::id, EligibleBranchDto::name)
                .containsExactly(tuple(5L, "Sucursal Centro"));
    }
```
(Ajustar los factories `user(...)`/`role(...)`/`branch(...)` al estilo del test existente — `User` es el record con `roles`/`branch`; `Branch` se construye con `Branch.create(...)` o un mock con `getId()/getDescription()`.)

- [ ] **Step 2: Correr y ver fallar** — `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'; ./mvnw -q -Dtest=ListEligibleRecipientsUseCaseTest test`. Expected: FAIL compilación (campos nuevos no existen).

- [ ] **Step 3: DTOs** —
`EligibleBranchDto.java`:
```java
package lab.laboratorio.modules.notificaciones.presentation.dto;
/** Sucursal para el filtro del editor de destinatarios (nombre = description de Branch). */
public record EligibleBranchDto(Long id, String name) {}
```
`EligibleUserDto` → `public record EligibleUserDto(Long id, String nombre, boolean tieneAcceso, java.util.List<String> roleCodes, Long branchId) {}`.
`EligibleRecipientsResponse` → `public record EligibleRecipientsResponse(List<EligibleUserDto> users, List<EligibleRoleDto> roles, List<EligibleBranchDto> branches) {}`.

- [ ] **Step 4: Use case** — en `ListEligibleRecipientsUseCase`:
  - Inyectar `private final lab.laboratorio.modules.sucursales.domain.port.BranchRepositoryPort branchRepositoryPort;`.
  - Mapear cada user a `new EligibleUserDto(u.id(), fullName(u), <tieneAcceso>, u.roles().stream().map(Role::code).toList(), u.branch())`.
  - Después de armar `users`, construir `branches`: recolectar los `branchId` distintos no-nulos de los users, resolver cada uno con `branchRepositoryPort.findById(tenantId, id)` y mapear a `EligibleBranchDto(b.getId(), b.getDescription())` (ordenar por `name`). Ignorar los que no resuelven.
  - Devolver `new EligibleRecipientsResponse(users, roles, branches)`.

- [ ] **Step 5: Correr y ver pasar** — `./mvnw -q -Dtest=ListEligibleRecipientsUseCaseTest test`. Expected: PASS.

- [ ] **Step 6: Buscar otros callers/tests que rompan** — `grep -rn "new EligibleUserDto(\|new EligibleRecipientsResponse(" src` (ej. `NotificationConfigControllerTest`); actualizar la aridad con los campos nuevos (`List.of()` / `null` donde no importe).

- [ ] **Step 7: Commit**
```bash
git commit -am "feat(notificaciones): eligible expone roleCodes + branchId + branches para el editor [KAN-XXX]"
```

### Task A2: Verificación BE

- [ ] **Step 1:** `./mvnw -q -Dtest='*notificaciones*' test` verde.
- [ ] **Step 2:** Boot MySQL opcional (no hay migración; el cambio es DTO+use case). Si se corre, confirmar wiring de `BranchRepositoryPort` en el bean de notificaciones.
- [ ] **Step 3:** Push rama BE + PR contra development linkeando el ticket. Backward-compatible (agrega campos).

---

# FASE B — Frontend (rediseño del editor)

### Task B1: Modelo — roleCodes, branchId, branches

**Files:**
- Modify: `src/app/features/empresa/models/notificaciones-config.model.ts`
- Test: `.../store/notificaciones-config/notificaciones-config.reducer.spec.ts` (o el que mapee eligible)

**Interfaces:**
- Produces: `EligibleUser` += `roleCodes: string[]` + `branchId: number | null`; `interface EligibleBranch { id: number; name: string }`; `EligibleRecipients` += `branches: EligibleBranch[]`.

- [ ] **Step 1: Editar el modelo**
```ts
export interface EligibleUser { id: number; nombre: string; tieneAcceso: boolean; roleCodes: string[]; branchId: number | null; }
export interface EligibleBranch { id: number; name: string; }
export interface EligibleRecipients { users: EligibleUser[]; roles: EligibleRole[]; branches: EligibleBranch[]; }
```
- [ ] **Step 2: Ajustar factories de specs** que construyen `EligibleUser`/`EligibleRecipients` (agregar `roleCodes: []`, `branchId: null`, `branches: []`). Correr `npx vitest run src/app/features/empresa/store/notificaciones-config`. Expected: PASS.
- [ ] **Step 3: Commit** — `feat(empresa): modelo eligible con roleCodes/branchId/branches`.

### Task B2: Lógica pura — filtro por rol/sucursal/búsqueda + asignados

**Files:**
- Modify: `src/app/features/empresa/pages/notificaciones/components/recipients-editor/recipients-editor.logic.ts`
- Test: `.../recipients-editor/recipients-editor.logic.spec.ts`

**Interfaces:**
- Produces: `filterUsers(users, {roleCodes, branchId, search}) -> EligibleUser[]`; `deriveUserRows(recipients, users)` (actualizado: `enteredByRole` por-usuario vía roleCodes reales); `resolveAssigned(recipients, users) -> AssignedUser[]` (`{id, nombre, viaRole: boolean}`).

- [ ] **Step 1: Specs que fallan**
```ts
// filterUsers: por rol real (un user sin el rol NO aparece), por sucursal, por búsqueda, combinados
it('filtra a los usuarios que tienen el rol agregado', () => {
  const users = [ u(1,'Ana',['EXTRACTOR'],5), u(2,'Beto',['SECRETARIA'],5) ];
  expect(filterUsers(users, {roleCodes:['EXTRACTOR'], branchId:null, search:''}).map(x=>x.id)).toEqual([1]);
});
it('sin roles agregados muestra todos', () => {
  const users = [ u(1,'Ana',['EXTRACTOR'],5), u(2,'Beto',['SECRETARIA'],7) ];
  expect(filterUsers(users, {roleCodes:[], branchId:null, search:''}).length).toBe(2);
});
it('filtra por sucursal y por búsqueda', () => {
  const users = [ u(1,'Ana',['EXTRACTOR'],5), u(2,'Ariel',['EXTRACTOR'],7) ];
  expect(filterUsers(users, {roleCodes:['EXTRACTOR'], branchId:5, search:'ar'}).map(x=>x.id)).toEqual([]); // Ana no matchea 'ar'? -> ajustar: 'an' para Ana
});
// deriveUserRows con roleCodes reales: un user cuyo roleCodes NO intersecta los roles agregados no "recibe"
it('receives sólo si el user tiene alguno de los roles agregados o es USER', () => {
  const rec = [ {type:'ROLE',ref:'EXTRACTOR'} ];
  const users = [ u(1,'Ana',['EXTRACTOR'],5), u(2,'Beto',['SECRETARIA'],5) ];
  const rows = deriveUserRows(rec, users);
  expect(rows.find(r=>r.id===1)!.receives).toBe(true);
  expect(rows.find(r=>r.id===2)!.receives).toBe(false);
});
// resolveAssigned: rol − exclusiones + puntuales, con origen
it('resolveAssigned = usuarios de rol − exclusiones + puntuales', () => {
  const rec = [ {type:'ROLE',ref:'EXTRACTOR'}, {type:'EXCLUDED_USER',ref:'1'}, {type:'USER',ref:'9'} ];
  const users = [ u(1,'Ana',['EXTRACTOR'],5), u(3,'Cora',['EXTRACTOR'],5), u(9,'Nico',['SECRETARIA'],7) ];
  const a = resolveAssigned(rec, users).map(x=>[x.id,x.viaRole]);
  expect(a).toEqual([[3,true],[9,false]]); // Ana excluida; Cora por rol; Nico puntual
});
```
(Helper `u(id,nombre,roleCodes,branchId)` construye `EligibleUser` con `tieneAcceso:true`.)

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run src/app/features/empresa/pages/notificaciones`. Expected: FAIL.

- [ ] **Step 3: Implementar** en `recipients-editor.logic.ts`:
```ts
export function filterUsers(users: EligibleUser[], f: { roleCodes: string[]; branchId: number | null; search: string }): EligibleUser[] {
  const term = f.search.trim().toLowerCase();
  return users.filter(u =>
    (f.roleCodes.length === 0 || u.roleCodes.some(c => f.roleCodes.includes(c))) &&
    (f.branchId == null || u.branchId === f.branchId) &&
    (term === '' || u.nombre.toLowerCase().includes(term)));
}

// deriveUserRows: enteredByRole por-usuario (roleCodes reales) en vez del "hay ≥1 rol" global de KAN-185.
export function deriveUserRows(recipients: Recipient[], users: EligibleUser[]): RecipientUserRow[] {
  const roles = roleCodesOf(recipients);
  const explicit = userRefsOf(recipients);
  const excluded = excludedRefsOf(recipients);
  return users.map(u => {
    const idStr = String(u.id);
    const byRole = u.roleCodes.some(c => roles.includes(c));
    const receives = (byRole || explicit.includes(idStr)) && !excluded.includes(idStr);
    return { id: u.id, nombre: u.nombre, receives, disabled: !u.tieneAcceso };
  });
}

export interface AssignedUser { id: number; nombre: string; viaRole: boolean; }
export function resolveAssigned(recipients: Recipient[], users: EligibleUser[]): AssignedUser[] {
  const roles = roleCodesOf(recipients);
  const explicit = userRefsOf(recipients);
  const excluded = excludedRefsOf(recipients);
  return users
    .map(u => {
      const idStr = String(u.id);
      if (excluded.includes(idStr)) return null;
      const byRole = u.roleCodes.some(c => roles.includes(c));
      if (byRole) return { id: u.id, nombre: u.nombre, viaRole: true };
      if (explicit.includes(idStr)) return { id: u.id, nombre: u.nombre, viaRole: false };
      return null;
    })
    .filter((x): x is AssignedUser => x !== null);
}
```
> **Nota:** `applyUserToggle` ya existe (KAN-185) — pero su `enteredByRole` era global. Actualizarlo para que use roleCodes reales del user al destildar: al quitar el tilde, si el user tiene alguno de los roles agregados → `EXCLUDED_USER`; si no → quita el `USER`. Firma nueva: `applyUserToggle(recipients, user: EligibleUser, checked: boolean)` (recibe el user para conocer sus roleCodes). Actualizar sus tests. `quitarAsignado(recipients, user)` = `applyUserToggle(recipients, user, false)`.

- [ ] **Step 4: Correr y ver pasar** — `npx vitest run src/app/features/empresa/pages/notificaciones`. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(empresa): lógica filtro rol/sucursal/búsqueda + resolveAssigned (roleCodes reales)`.

### Task B3: Componente editor — 2 cards + bloque asignados/resumen

**Files:**
- Modify: `src/app/features/empresa/pages/notificaciones/components/recipients-editor/recipients-editor.component.ts`
- Test: `.../recipients-editor/recipients-editor.component.spec.ts` (los que no rendericen signal-inputs; el grueso ya está en `.logic.spec`)

**Interfaces:** Consume `filterUsers`/`deriveUserRows`/`resolveAssigned`/`applyRolesChange`/`applyUserToggle` (B2). Inputs `config`/`eligible` (con roleCodes/branchId/branches). Output `recipientsChange`.

- [ ] **Step 1: Specs de comportamiento** (sin render — vía métodos/computeds del componente): agregar rol filtra `visibleUsers()`; setear `branchFilter` filtra; `search` filtra; `assigned()` = `resolveAssigned(...)`; `removeAssigned(user)` emite recipients sin ese user (excepción/quita). Ej.:
```ts
it('agregar rol filtra la lista visible a los del rol', () => {
  const c = makeComp({config:{recipients:[]}, eligible:{users:[u(1,'Ana',['EXTRACTOR'],5),u(2,'Beto',['SECRETARIA'],5)], roles:[r('EXTRACTOR')], branches:[]}});
  c.onRolesChange(['EXTRACTOR']);
  expect(c.visibleUsers().map(x=>x.id)).toEqual([1]);
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run src/app/features/empresa/pages/notificaciones`. Expected: FAIL.

- [ ] **Step 3: Implementar** — signals locales `search=signal('')`, `branchFilter=signal<number|null>(null)`, `otrosOpen=signal(false)`. Computeds: `roleCodes = computed(()=>roleCodesOf(this.config().recipients))`, `visibleUsers = computed(()=>filterUsers(this.eligible().users, {roleCodes:this.roleCodes(), branchId:this.branchFilter(), search:this.search()}))`, `userRows = computed(()=>deriveUserRows(this.config().recipients, this.visibleUsers()))`, `assigned = computed(()=>resolveAssigned(this.config().recipients, this.eligible().users))`, `assignedVisible = computed(()=> this.otrosOpen() ? this.assigned() : this.assigned().slice(0, FIRST_ROW))`, `resumen = computed(()=> ...)`. Template (usar `laboratory-ui` para estilo):
  - **Card A**: `p-multiSelect` roles (`onChange` → `emit(applyRolesChange(...))`), `p-select` sucursal (`[options]="eligible().branches"`, opción "Todas" = null) → `branchFilter.set(...)`.
  - **Card B**: input búsqueda (`search`), chip "filtrado por…", lista de `userRows()` con checkbox (`onChange` → `emit(applyUserToggle(recipients, user, checked))`), aviso `disabled`, `max-height` + scroll.
  - **Bloque inferior**: resumen (contador `assigned().length` + desglose) + chips `assignedVisible()` (cada uno con × → `removeAssigned(user)` = `emit(applyUserToggle(recipients, user, false))`) + chip "+N otros ▾"/"menos ▲" (`otrosOpen` toggle) cuando `assigned().length > FIRST_ROW`. `FIRST_ROW` constante (ej. 8). PrimeIcons, sin emojis.
- [ ] **Step 4: Correr y ver pasar** + `npm run build`. Expected: PASS + build AOT OK.
- [ ] **Step 5: Commit** — `feat(empresa): editor destinatarios con filtros rol/sucursal + búsqueda + asignados/resumen (chips+Otros)`.

### Task B4: Verificación FE

- [ ] **Step 1:** `npx vitest run src/app/features/empresa` (notificaciones verde; anotar fallas ajenas pre-existentes de `usuarios.page.spec`).
- [ ] **Step 2:** `npm run build` OK.
- [ ] **Step 3:** Smoke: levantar dev, expandir una fila, agregar rol → ver filtro; buscar; filtrar sucursal; quitar un asignado; "Otros" despliega. Screenshot.
- [ ] **Step 4:** Push rama FE + PR contra development linkeando el ticket.

---

## Self-Review (contra el spec)

**Spec coverage:** filtro por rol real → B2 `filterUsers`/`deriveUserRows` (roleCodes) ✅; búsqueda + scroll → B3 ✅; filtro sucursal (visual) → B2/B3 ✅; 2 cards + bloque inferior → B3 ✅; asignados resuelto reactivo → B2 `resolveAssigned` + B3 computed ✅; chips + "Otros" despliega → B3 (`otrosOpen`, `assignedVisible`) ✅; quitar desde asignados (× = excepción/quita) → B2 `applyUserToggle(false)` + B3 ✅; BE roleCodes/branchId/branches → A1 ✅; modelo aditivo intacto → sin cambios de recipients ✅; sin migración ✅.

**Placeholder scan:** las notas "ajustar factory al test existente" (A1/B2) son de estilo contra código real, no TODOs de lógica. La corrección del test `filterUsers` con 'ar'/'an' es una nota deliberada al implementer. Sin placeholders de lógica.

**Type consistency:** `EligibleUser.roleCodes/branchId` (A1/B1) ↔ `filterUsers`/`deriveUserRows`/`resolveAssigned` (B2) ↔ computeds (B3). `EligibleBranch{id,name}` (A1/B1) ↔ `p-select` sucursal (B3). `AssignedUser{id,nombre,viaRole}` (B2) ↔ chips (B3). `applyUserToggle(recipients, user, checked)` firma nueva (B2) ↔ card B + removeAssigned (B3). ✅

**Riesgo abierto:** `applyUserToggle` cambia de firma (`id`→`user`) respecto de KAN-185; actualizar todos sus callers y tests (B2 step 3 nota). `branches` se arma resolviendo por branchId distinto (few queries) — si preocupa, cachear/una query; documentado.
