# Rediseño Config de Notificaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar task-by-task. Los pasos usan checkboxes (`- [ ]`).
>
> **Jira:** _pendiente — crear con jira-workflow antes de implementar (follow-up de KAN-176)._

**Goal:** Rediseñar la tab "Notificaciones" de Empresa a una `ui-table` con filas expandibles + toolbar (buscar/módulo/solo-activos) y un editor de destinatarios rol-primero aditivo con exclusiones por usuario; escala con la cantidad de eventos y de usuarios.

**Architecture:** Backend (`modules/notificaciones`) suma `EXCLUDED_USER` al modelo de recipients (el fan-out resta los excluidos) y expone `section` en el config DTO. Frontend (`features/empresa`) reemplaza el `@for` de tarjetas por `ui-table` expandible; la fila expandida es el editor de destinatarios.

**Tech Stack:** Java 21 + Spring hexagonal, JPA, Flyway, JUnit5/Mockito. Angular 21 standalone + signals + NgRx + PrimeNG, Vitest.

## Global Constraints

- **Errores en español, sin leak** (Regla #4): ningún FQCN/`No enum constant`/SQL al cliente; toasts español.
- **Refresco/estado por el store existente**; no `setInterval`. Filtros de UI = signals locales del page.
- **PrimeIcons, no emojis Unicode.** OnPush + signals. Tests obligatorios (reducer/effects/selectors/page).
- **JDK 21 para `mvnw`:** `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'`. Rango Flyway libre a usar: **V1072** (development está en v1071).
- **Dos worktrees** (off `development`): BE `feat/notif-config-redesign` (crear con superpowers:using-git-worktrees) y FE `feat/notif-config-redesign` (ya existe en `TESIS/FRONTEND-LABORATORIO/.worktrees/notif-config-redesign`). Un ticket, dos PRs contra development.
- **Fan-out efectivo:** `destinatarios = (⋃ usuarios_de(rol) ∪ usuarios USER) − usuarios EXCLUDED_USER`. La exclusión gana incluso si el mismo id está como USER explícito.

---

# FASE A — Backend (`modules/notificaciones`)

### Task A1: `EXCLUDED_USER` en el modelo + widen de columna (migración V1072)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/notificaciones/domain/model/RecipientType.java`
- Create: `src/main/resources/db/migration/V1072__widen_notification_recipient_type.sql`
- Test: `src/test/java/lab/laboratorio/modules/notificaciones/domain/model/RecipientTypeTest.java`

**Interfaces:**
- Produces: `RecipientType.EXCLUDED_USER`.

- [ ] **Step 1: Test que falla**
```java
package lab.laboratorio.modules.notificaciones.domain.model;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class RecipientTypeTest {
    @Test
    void has_excluded_user_value() {
        assertThat(RecipientType.valueOf("EXCLUDED_USER")).isEqualTo(RecipientType.EXCLUDED_USER);
    }
}
```

- [ ] **Step 2: Correr y ver fallar** — `./mvnw -q -Dtest=RecipientTypeTest test`. Expected: FAIL de compilación (no existe el valor).

- [ ] **Step 3: Agregar el valor al enum**
```java
public enum RecipientType {
    USER,
    ROLE,
    EXCLUDED_USER
}
```

- [ ] **Step 4: Migración de columna** — `recipient_type` es hoy `VARCHAR(8)` (V1071) y "EXCLUDED_USER" son 13 chars. Crear `V1072__widen_notification_recipient_type.sql`:
```sql
-- EXCLUDED_USER (13) no entra en VARCHAR(8) original (V1071). Portable H2(modo MySQL)+MySQL.
ALTER TABLE notification_recipients MODIFY recipient_ref VARCHAR(64) NOT NULL;
ALTER TABLE notification_recipients MODIFY recipient_type VARCHAR(16) NOT NULL;
```
> Nota: el primer MODIFY es no-op de seguridad (deja ref igual); el segundo ensancha type. Si `MODIFY` diera problema en H2, usar `ALTER TABLE ... ALTER COLUMN recipient_type VARCHAR(16) NOT NULL` en un archivo `migration-local` y dejar el `MODIFY` MySQL en `migration/` — verificar contra el boot (ver Task A5). Actualizar también `NotificationRecipientJpaEntity`: `@Column(name="recipient_type", nullable=false, length=16)`.

- [ ] **Step 5: Actualizar la entity** — en `NotificationRecipientJpaEntity.java` cambiar `length = 8` → `length = 16` en `recipient_type`.

- [ ] **Step 6: Correr y ver pasar** — `./mvnw -q -Dtest=RecipientTypeTest test`. Expected: PASS.

- [ ] **Step 7: Commit**
```bash
git commit -am "feat(notificaciones): RecipientType.EXCLUDED_USER + widen recipient_type a VARCHAR(16) (V1072)"
```

---

### Task A2: Fan-out resta las exclusiones (`RecipientResolver`)

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/notificaciones/application/RecipientResolver.java`
- Test: `src/test/java/lab/laboratorio/modules/notificaciones/application/RecipientResolverTest.java`

**Interfaces:**
- Consumes: `RecipientType.EXCLUDED_USER` (Task A1).
- Produces: `resolveEligibleUserIds(...)` que excluye los `EXCLUDED_USER` del set final.

- [ ] **Step 1: Test que falla** (Mockito) — rol con 3 usuarios (10,11,12), todos con acceso a la sección; excluir el 11 → resultado {10,12}. Y un `EXCLUDED_USER` que también está como USER explícito → no recibe.
```java
package lab.laboratorio.modules.notificaciones.application;

import lab.laboratorio.modules.empresa.domain.port.UserAccessSectionRepositoryPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.modules.notificaciones.domain.model.NotificationEventType;
import lab.laboratorio.modules.notificaciones.domain.model.NotificationRecipient;
import lab.laboratorio.modules.notificaciones.domain.model.RecipientType;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecipientResolverTest {

    @Mock UserRepositoryPort userRepositoryPort;
    @Mock UserAccessSectionRepositoryPort accessPort;

    record U(Long id) implements UserRepositoryPort.UserRef { } // ajustar al tipo real devuelto por findActiveByRoleCode*

    @Test
    void excludes_excluded_users_from_role_fanout() {
        var resolver = new RecipientResolver(userRepositoryPort, accessPort);
        var type = NotificationEventType.URGENT_SLA_BREACHED;
        when(userRepositoryPort.findActiveByRoleCodeAndBranch(1L, "EXTRACTOR", 5L))
                .thenReturn(List.of(userRef(10L), userRef(11L), userRef(12L)));
        // todos con acceso a la sección del evento
        lenient().when(accessPort.findSectionsByUser(eq(1L), anyLong()))
                .thenReturn(Set.of(type.requiredSection()));

        var recipients = List.of(
                new NotificationRecipient(type, RecipientType.ROLE, "EXTRACTOR"),
                new NotificationRecipient(type, RecipientType.EXCLUDED_USER, "11"));

        Set<Long> result = resolver.resolveEligibleUserIds(1L, type, 5L, recipients);

        assertThat(result).containsExactlyInAnyOrder(10L, 12L);
    }

    @Test
    void exclusion_wins_over_explicit_user() {
        var resolver = new RecipientResolver(userRepositoryPort, accessPort);
        var type = NotificationEventType.URGENT_SLA_BREACHED;
        lenient().when(accessPort.findSectionsByUser(eq(1L), anyLong()))
                .thenReturn(Set.of(type.requiredSection()));
        var recipients = List.of(
                new NotificationRecipient(type, RecipientType.USER, "20"),
                new NotificationRecipient(type, RecipientType.EXCLUDED_USER, "20"));

        assertThat(resolver.resolveEligibleUserIds(1L, type, 5L, recipients)).isEmpty();
    }

    // helper — reemplazar por el factory real del UserRef que devuelven los finders
    private static Object userRef(Long id) { return /* new UserRef(id, ...) */ null; }
}
```
> **Nota al implementer:** el tipo exacto que devuelven `findActiveByRoleCode*` (tiene `.id()`) hay que leerlo de `UserRepositoryPort`; reemplazar `userRef(...)` por su constructor real. El test valida el comportamiento, no el tipo.

- [ ] **Step 2: Correr y ver fallar** — `./mvnw -q -Dtest=RecipientResolverTest test`. Expected: FAIL (hoy no resta exclusiones).

- [ ] **Step 3: Implementar** — en `resolveEligibleUserIds`, separar exclusiones y restarlas antes del filtro de acceso:
```java
public Set<Long> resolveEligibleUserIds(Long tenantId, NotificationEventType type,
                                         Long branchId, List<NotificationRecipient> recipients) {
    Set<Long> candidates = new HashSet<>();
    Set<Long> excluded = new HashSet<>();
    for (var recipient : recipients) {
        switch (recipient.type()) {
            case USER -> candidates.add(Long.valueOf(recipient.ref()));
            case EXCLUDED_USER -> excluded.add(Long.valueOf(recipient.ref()));
            case ROLE -> {
                var users = (branchId != null)
                        ? userRepositoryPort.findActiveByRoleCodeAndBranch(tenantId, recipient.ref(), branchId)
                        : userRepositoryPort.findActiveByRoleCode(tenantId, recipient.ref());
                users.forEach(u -> candidates.add(u.id()));
            }
        }
    }
    candidates.removeAll(excluded); // la exclusión gana (incluso sobre USER explícito)
    return candidates.stream()
            .filter(uid -> userAccessSectionRepositoryPort.findSectionsByUser(tenantId, uid)
                    .contains(type.requiredSection()))
            .collect(Collectors.toSet());
}
```

- [ ] **Step 4: Correr y ver pasar** — `./mvnw -q -Dtest=RecipientResolverTest test`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git commit -am "feat(notificaciones): fan-out resta EXCLUDED_USER (rol aditivo con excepciones)"
```

---

### Task A3: `UpdateNotificationConfigUseCase` acepta y valida `EXCLUDED_USER`

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/notificaciones/application/usecase/UpdateNotificationConfigUseCase.java`
- Test: `src/test/java/lab/laboratorio/modules/notificaciones/application/usecase/UpdateNotificationConfigUseCaseTest.java` (extender el existente si lo hay)

**Interfaces:**
- Produces: el update persiste recipients con type `EXCLUDED_USER`; valida ref numérico pero **NO** exige acceso ni existencia de rol para exclusiones.

- [ ] **Step 1: Test que falla** — un request con `{type:"EXCLUDED_USER", ref:"11"}` se persiste sin lanzar (aunque el user 11 no tenga acceso a la sección); un `EXCLUDED_USER` con ref no-numérico → `InvalidRecipientReferenceException` (400).
```java
    @Test
    void excluded_user_is_persisted_without_access_check() {
        // arrange: request enabled=true, recipients = [ROLE EXTRACTOR, EXCLUDED_USER "11"]
        // el user 11 NO tiene acceso (accessPort devuelve Set vacío) — no debe fallar por acceso.
        // roleRepository.findByCode("EXTRACTOR") -> present
        // act: useCase.execute(1L, URGENT_SLA_BREACHED, request)
        // assert: repositoryPort.replaceRecipients llamado con la lista incluyendo EXCLUDED_USER/11
        //         y NO se lanza RecipientWithoutAccessException.
    }

    @Test
    void excluded_user_with_non_numeric_ref_throws_invalid_reference() {
        // recipients = [EXCLUDED_USER "abc"] -> InvalidRecipientReferenceException
    }
```
> Completar con el estilo del test existente del use case (mismos mocks: `NotificationConfigRepositoryPort`, `UserAccessSectionRepositoryPort`, `RoleRepositoryPort`). Verificá el `verify(repositoryPort).replaceRecipients(eq(1L), eq(type), argThat(list -> list.stream().anyMatch(r -> r.type()==RecipientType.EXCLUDED_USER && r.ref().equals("11"))))`.

- [ ] **Step 2: Correr y ver fallar** — `./mvnw -q -Dtest=UpdateNotificationConfigUseCaseTest test`. Expected: FAIL (hoy el `else` trata EXCLUDED_USER como ROLE y `roleRepository.findByCode("11")` da vacío → `RecipientWithoutAccessException`).

- [ ] **Step 3: Implementar** — en el loop de validación, ramificar EXCLUDED_USER como USER en formato pero sin chequeo de acceso:
```java
    if (type == RecipientType.USER || type == RecipientType.EXCLUDED_USER) {
        Long userId = parseUserId(recipient.ref());
        if (userId == null) {
            invalidFormat.add(recipient.ref());
            continue;
        }
        // Solo los USER (destinatarios reales) requieren acceso; las exclusiones no.
        if (type == RecipientType.USER) {
            boolean hasAccess = userAccessSectionRepositoryPort.findSectionsByUser(tenantId, userId)
                    .contains(eventType.requiredSection());
            if (!hasAccess) {
                invalidAccess.add(recipient.ref());
            }
        }
    } else { // ROLE
        boolean roleExists = roleRepositoryPort.findByCode(recipient.ref()).isPresent();
        if (!roleExists) {
            invalidAccess.add(recipient.ref());
        }
    }
```
(El mapeo final `RecipientType.valueOf(r.type())` ya soporta EXCLUDED_USER tras Task A1.)

- [ ] **Step 4: Correr y ver pasar** — `./mvnw -q -Dtest=UpdateNotificationConfigUseCaseTest test`. Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git commit -am "feat(notificaciones): update config valida EXCLUDED_USER (ref numérico, sin chequeo de acceso)"
```

---

### Task A4: Exponer `section` en el config DTO

**Files:**
- Modify: `.../presentation/dto/NotificationConfigResponse.java`
- Modify: `.../application/usecase/GetNotificationConfigUseCase.java`
- Test: `.../application/usecase/GetNotificationConfigUseCaseTest.java`

**Interfaces:**
- Produces: `NotificationConfigResponse.section` (String = `requiredSection().name()`), consumido por el FE (Task B1).

- [ ] **Step 1: Test que falla** — el response de `SETTLEMENT_REPORTED` trae `section == "FINANCIERO"`.
```java
    @Test
    void config_exposes_section_from_event_type() {
        // repositoryPort.findAllSettings/-Recipients -> vacíos
        var out = useCase.execute(1L);
        var settlement = out.stream().filter(c -> c.eventType().equals("SETTLEMENT_REPORTED")).findFirst().orElseThrow();
        assertThat(settlement.section()).isEqualTo("FINANCIERO");
    }
```

- [ ] **Step 2: Correr y ver fallar** — `./mvnw -q -Dtest=GetNotificationConfigUseCaseTest test`. Expected: FAIL de compilación (no existe `section()`).

- [ ] **Step 3: Implementar** — agregar `String section` como último campo del record `NotificationConfigResponse` y poblarlo:
```java
public record NotificationConfigResponse(
        String eventType, String title, boolean enabled, boolean hasTrigger,
        List<RecipientDto> recipients, String section) {}
```
En `GetNotificationConfigUseCase.execute`, en el `.map(type -> new NotificationConfigResponse(...))` agregar `type.requiredSection().name()` como último arg.

- [ ] **Step 4: Correr y ver pasar** — PASS.

- [ ] **Step 5: Commit**
```bash
git commit -am "feat(notificaciones): config DTO expone section (módulo) del evento"
```

---

### Task A5: Verificación BE (boot MySQL + suite del módulo + security)

- [ ] **Step 1: Suite del módulo** — `$env:JAVA_HOME='C:\Program Files\Java\jdk-21'; ./mvnw -q -Dtest='*notificaciones*,RecipientResolverTest,RecipientTypeTest' test`. Expected: verde.
- [ ] **Step 2: Boot MySQL fresco** — recipe `mysql-boot-verification` a un schema nuevo; confirmar que **V1072 aplica** (recipient_type VARCHAR(16)) y "Started". Insertar por SQL un recipient `EXCLUDED_USER` y confirmar que entra (13 chars).
- [ ] **Step 3: `/security-review`** — foco: EXCLUDED_USER no filtra usuarios cross-tenant en el fan-out; el update sigue tenant-scoped; no-leak del tipo inválido (422 español).
- [ ] **Step 4: Commit + PR** — push rama BE, PR contra development linkeando el ticket.

---

# FASE B — Frontend (`features/empresa`, worktree ya creado)

### Task B1: Modelo + store — `section` y `EXCLUDED_USER`

**Files:**
- Modify: `src/app/features/empresa/models/notificaciones-config.model.ts`
- Modify: `src/app/features/empresa/store/notificaciones-config/*` (solo si el mapeo necesita `section`; los recipients pasan transparentes)
- Test: `.../store/notificaciones-config/notificaciones-config.reducer.spec.ts` (o el que corresponda)

**Interfaces:**
- Produces: `Recipient.type` incluye `'EXCLUDED_USER'`; `EventConfig.section: string`.

- [ ] **Step 1: Editar el modelo**
```ts
export interface Recipient {
  type: 'USER' | 'ROLE' | 'EXCLUDED_USER';
  ref: string;
}
export interface EventConfig {
  eventType: string;
  title: string;
  enabled: boolean;
  hasTrigger: boolean;
  recipients: Recipient[];
  section: string; // módulo (requiredSection del backend)
}
```

- [ ] **Step 2: Test del store** — si el reducer/selector mapea el response, agregar caso que preserva `section` y un recipient `EXCLUDED_USER`. Correr `npx vitest run src/app/features/empresa/store/notificaciones-config`. Expected: PASS.

- [ ] **Step 3: Commit** — `feat(empresa): modelo notif-config con section y EXCLUDED_USER`.

---

### Task B2: Componente editor de destinatarios (rol-primero, aditivo + excepciones)

**Files:**
- Create: `src/app/features/empresa/pages/notificaciones/components/recipients-editor/recipients-editor.component.ts`
- Create: `.../recipients-editor/recipients-editor.component.spec.ts`

**Interfaces:**
- Consumes: `EventConfig`, `EligibleRecipients` (users con `tieneAcceso`, roles).
- Produces: `@Input config`, `@Input eligible`; `@Output recipientsChange: Recipient[]`. Emite la lista completa (ROLE + USER + EXCLUDED_USER) en cada cambio.

Lógica (signals):
- `roles = recipients.filter(ROLE)`, `explicitUsers = recipients.filter(USER)`, `excluded = new Set(recipients.filter(EXCLUDED_USER).map(ref))`.
- **Usuarios efectivos de los roles** (computed): unión de `eligible.users` cuyo id ∈ (usuarios de los roles agregados). Como el backend no manda "usuarios por rol" acá, el editor muestra **todos los `eligible.users`** y marca "recibe" = `(está en algún rol agregado O es USER explícito) && !excluded`. (Si `eligible` no discrimina por rol, tratar "usuarios del rol" = todos los elegibles cuando hay ≥1 rol; refinamiento opcional: endpoint `eligible` por rol — diferido.)
- Agregar rol → push `{type:'ROLE', ref:code}` + limpiar exclusiones que ya no apliquen.
- Destildar un usuario que entra por rol → push `{type:'EXCLUDED_USER', ref:id}`. Volver a tildar → quitar la exclusión.
- Tildar un usuario que NO entra por rol → push `{type:'USER', ref:id}` (extra). Destildarlo → quitar el USER.
- Emitir `recipientsChange` con la lista reconstruida.

- [ ] **Step 1: Specs que fallan** (Vitest) — casos: (a) agregar rol emite `[{ROLE,X}]`; (b) con rol agregado, destildar user 11 emite incluye `{EXCLUDED_USER,'11'}`; (c) re-tildar 11 lo saca; (d) tildar user extra 99 (sin rol) emite `{USER,'99'}`; (e) usuario `tieneAcceso=false` se muestra deshabilitado.
```ts
it('destildar un usuario del rol lo agrega como exclusión', () => {
  const comp = setup({ recipients: [{type:'ROLE',ref:'EXTRACTOR'}] },
                     { users:[{id:11,nombre:'Ana',tieneAcceso:true}], roles:[{code:'EXTRACTOR',label:'Extractores'}] });
  const emitted = captureEmit(comp);
  comp.toggleUser(11, false);
  expect(emitted()).toContainEqual({ type:'EXCLUDED_USER', ref:'11' });
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run src/app/features/empresa/pages/notificaciones`. Expected: FAIL.

- [ ] **Step 3: Implementar el componente** — standalone OnPush; template con dos zonas (Roles violeta / Usuarios azul) usando `p-multiSelect` para roles y una lista de checkboxes para usuarios (con el ícono "sin acceso" del componente actual `event-config-row` — reusar ese markup/tooltip). Métodos `addRole/removeRole/toggleUser(id,checked)` que reconstruyen y emiten `recipients`. Estilos con las variables del design system (violeta `#6d28d9`/azul `#1d4ed8` como en los mockups aprobados; sin emojis, PrimeIcons `pi-users`/`pi-user`).

- [ ] **Step 4: Correr y ver pasar** — PASS.

- [ ] **Step 5: Commit** — `feat(empresa): editor de destinatarios rol-primero aditivo con exclusiones`.

---

### Task B3: Página con `ui-table` expandible + toolbar

**Files:**
- Modify: `src/app/features/empresa/pages/notificaciones/notificaciones-config.page.ts` (reescribe el template a `ui-table`)
- Modify: `.../notificaciones-config.page.spec.ts`
- (Opcional) Create: celdas como templates dentro del page (badge módulo, toggle, resumen destinatarios).

**Interfaces:**
- Consumes: `ui-table` (`@shared/ui/components/data-table`) con `[expandable]`, `uiCell`, `*uiRowExpansion`, output `(rowExpand)`. `RecipientsEditorComponent` (Task B2). `selectEventConfigs`, `selectEligible(eventType)`, `loadConfigs`, `loadEligible`, `updateConfig`.

- [ ] **Step 1: Specs que fallan** — (a) filtro "Solo activos" oculta los `enabled=false`; (b) buscar "caja" filtra por título; (c) filtro Módulo por `section`; (d) expandir una fila dispara `loadEligible({eventType})`; (e) toggle inline dispatch `updateConfig` con `enabled` flip.
```ts
it('expandir una fila carga los elegibles del evento', () => {
  const { comp, store } = setup(); const spy = vi.spyOn(store, 'dispatch');
  comp.onRowExpand({ eventType: 'CASH_BOX_CLOSED' } as any);
  expect(spy).toHaveBeenCalledWith(loadEligible({ eventType: 'CASH_BOX_CLOSED' }));
});
```

- [ ] **Step 2: Correr y ver fallar** — `npx vitest run src/app/features/empresa/pages/notificaciones`. Expected: FAIL.

- [ ] **Step 3: Implementar el page** — template:
```html
<p-toast />
<div class="emp-notif-toolbar">
  <input class="..." [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar evento…" />
  <p-select [options]="moduleOptions()" [ngModel]="moduleFilter()" (ngModelChange)="moduleFilter.set($event)" placeholder="Módulo: Todos" />
  <p-selectButton [options]="[{label:'Todos',value:'all'},{label:'Solo activos',value:'active'}]"
                  [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event ?? 'all')" />
  <span class="emp-notif-count">{{ visible().length }} eventos · {{ activeCount() }} activos</span>
</div>

<ui-table [value]="visible()" [columns]="columns" dataKey="eventType" [expandable]="true"
          (rowExpand)="onRowExpand($event)"
          emptyHeading="Sin eventos" emptyIcon="pi-bell">
  <ng-template [uiCell]="'section'" let-row><span class="emp-mod-badge" [attr.data-mod]="row.section">{{ moduleLabel(row.section) }}</span></ng-template>
  <ng-template [uiCell]="'enabled'" let-row>
    <p-toggleswitch [ngModel]="row.enabled" [disabled]="!row.hasTrigger" (onChange)="onToggle(row, $event.checked)" />
  </ng-template>
  <ng-template [uiCell]="'recipients'" let-row>
    @if (row.recipients.length) { <span class="emp-dest-summary">{{ recipientsSummary(row) }}</span> }
    @else { <span class="emp-dest-none">Sin destinatarios</span> }
  </ng-template>
  <ng-template [uiCell]="'title'" let-row>
    {{ row.title }} @if (!row.hasTrigger) { <p-tag value="Próximamente" severity="secondary" /> }
  </ng-template>
  <ng-template uiRowExpansion let-row>
    <emp-recipients-editor [config]="row" [eligible]="eligibleFor(row.eventType)()"
                           (recipientsChange)="onRecipients(row, $event)" />
  </ng-template>
</ui-table>
```
Class: signals `search/moduleFilter('all')/statusFilter('all')`; `columns: TableColumn[]` = `[{field:'title',header:'Evento'},{field:'section',header:'Módulo'},{field:'enabled',header:'Estado',align:'center'},{field:'recipients',header:'Destinatarios'}]`; `visible = computed(() => configs().filter(search + module + status))`; `moduleOptions`/`moduleLabel` (mapea section→label español); `onRowExpand(row)` → `dispatch(loadEligible({eventType: row.eventType}))`; `onToggle`/`onRecipients` → `dispatch(updateConfig({eventType, enabled, recipients}))`. Mantener el toast de éxito/error existente. Borrar `EventConfigRowComponent` viejo si queda sin uso (o dejarlo si algo más lo usa — verificar).

- [ ] **Step 4: Correr y ver pasar** + `npm run build`. Expected: PASS + build AOT OK.

- [ ] **Step 5: Commit** — `feat(empresa): tab notificaciones a ui-table expandible + toolbar (buscar/módulo/solo-activos)`.

---

### Task B4: Verificación FE + limpieza

- [ ] **Step 1:** `npx vitest run src/app/features/empresa` verde.
- [ ] **Step 2:** `npm run build` OK (AOT). (No usar `ng test` — AOT roto repo-wide por muestras.)
- [ ] **Step 3:** Smoke visual (levantar dev, activar módulo, ver la tabla + expandir + editar). Screenshot.
- [ ] **Step 4:** Si `EventConfigRowComponent` quedó huérfano, borrarlo (+ su spec). Commit.
- [ ] **Step 5:** Push rama FE, PR contra development linkeando el ticket.

---

## Self-Review (contra el spec)

**Spec coverage:**
- Tabla estándar + expandible → B3 ✅. Toolbar (buscar/módulo/solo-activos + contador) → B3 ✅. Columnas (evento/módulo/estado/destinatarios) → B3 ✅. "Próximamente" grisado → B3 ✅.
- Editor rol-primero aditivo + exclusiones → B2 ✅. Precarga tildados + destildar=exclusión + user extra + aviso sin-acceso → B2 ✅.
- BE: section en DTO → A4 ✅. EXCLUDED_USER modelo+columna → A1 ✅; fan-out resta → A2 ✅; update valida → A3 ✅.
- Errores español/no-leak → A3/A5 + Global Constraints ✅. Boot MySQL/security → A5 ✅.

**Placeholder scan:** los dos "reemplazar por el tipo real de UserRef" (A2) y "endpoint eligible por rol diferido" (B2) son notas de confirmación deliberadas contra código existente, no TODOs de lógica. Sin otros placeholders.

**Type consistency:** `Recipient.type` (`'USER'|'ROLE'|'EXCLUDED_USER'`) y `RecipientType` alineados. `NotificationConfigResponse.section` (A4) ↔ `EventConfig.section` (B1) ↔ columna `section` (B3). `recipientsChange: Recipient[]` (B2) ↔ `onRecipients` (B3) ↔ `updateConfig` payload. ✅

**Riesgo abierto (para el implementer):** el endpoint `eligible` no discrimina usuarios por rol; B2 asume "usuarios del rol = elegibles cuando hay ≥1 rol". Si se necesita fidelidad exacta por rol, sumar un endpoint/param — diferido, documentado.
