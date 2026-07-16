# Asignación de rol + secciones en el drawer — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Jira:** [KAN-68](https://exequielsantoro.atlassian.net/browse/KAN-68)
> **Spec:** `docs/superpowers/specs/2026-06-01-roles-permisos-drawer-design.md`

**Goal:** Unificar la asignación de accesos en el drawer de alta/edición de usuario: un rol único que pre-marca un preset de secciones editable, guardado en una sola llamada atómica; más los 2 bug fixes (dropdown de roles, host de notificaciones) y el borrado de la pantalla `/roles`.

**Architecture:** El backend extiende los endpoints de create/update de usuario para recibir también las secciones y asignarlas en la misma transacción (reusando `SetUserSectionsUseCase`). El frontend reemplaza el multiselect de roles por un dropdown único que aplica un preset de secciones (constante FE), reusa `rp-secciones-checklist` dentro del drawer, y elimina la pantalla dedicada. El enforcement (`/me/access-sections`, guards, sidebar del usuario logueado) no se toca.

**Tech Stack:** Backend Spring Boot 4 / Java 21 / Clean Architecture / Flyway / JUnit5 + Mockito + MockMvc. Frontend Angular 21 standalone + signals / NgRx clásico / PrimeNG / Vitest.

**Dos repos / worktrees:**
- **Phase A (Backend):** `c:\Users\tobia\Desktop\TUP\TESIS\Backend\.worktrees\permisos-modulares` — rama `feat/permisos-modulares-por-usuario` (PR #29).
- **Phase B (Frontend):** `c:\Users\tobia\Desktop\TUP\TESIS\FRONTEND-LABORATORIO\.worktrees\roles-permisos` — rama `feat/roles-permisos` (PR #20).

Hacer Phase A primero (la B consume los endpoints atómicos). Cada task termina en commit en el worktree que corresponda.

---

## Phase A — Backend

Comandos desde el worktree del backend. Build/test con `mvnw` (JDK 21). Para correr un test puntual:
`set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=NombreDelTest`
(los E2E Playwright están excluidos de la fase `test`).

### Task A1: Fix del trailing slash en RoleController

El front pega `GET /api/v1/role` (sin barra) pero el controller mapea `@GetMapping("/")` → `/api/v1/role/`. En Spring Boot 4 el trailing-slash matching está apagado → 404 → dropdown vacío.

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/empresa/presentation/controller/RoleController.java:25`
- Modify (test E2E que asume la barra): `src/test/java/lab/laboratorio/e2e/empresa/RoleE2eTest.java:29`

- [ ] **Step 1: Cambiar el mapping**

En `RoleController.java`, línea 25:

```java
    @GetMapping("/")
```
→
```java
    @GetMapping
```

- [ ] **Step 2: Actualizar el path del E2E para que matchee el nuevo mapping**

En `RoleE2eTest.java`, línea 29:

```java
    private static final String ROLES_PATH = "/api/v1/role/";
```
→
```java
    private static final String ROLES_PATH = "/api/v1/role";
```

(Los 4 tests del E2E usan `ROLES_PATH`; con el mapping sin barra, `/api/v1/role/` daría 404. No cambia ninguna aserción, solo la constante.)

- [ ] **Step 3: Compilar (verifica que el controller sigue válido)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q -o compile`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/presentation/controller/RoleController.java src/test/java/lab/laboratorio/e2e/empresa/RoleE2eTest.java
git commit -m "fix(empresa): GET /api/v1/role sin trailing slash (SB4 no matchea la barra)"
```

---

### Task A2: Alta atómica — el POST /user/internal asigna también las secciones

`RegisterInternalUserUseCase` reusa `SetUserSectionsUseCase` (que ya valida módulo-activo + invalida cache) para asignar las secciones en la misma `@Transactional`. El `actor` de auditoría sale del `Principal` del admin.

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/empresa/presentation/dto/request/InternalUserRegisterRequest.java`
- Modify: `src/main/java/lab/laboratorio/modules/empresa/application/usecase/identity/RegisterInternalUserUseCase.java`
- Modify: `src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java:84-103`
- Test: `src/test/java/lab/laboratorio/modules/empresa/application/usecase/identity/RegisterInternalUserUseCaseTest.java` (crear si no existe; si existe, agregar los casos)

- [ ] **Step 1: Escribir el test del use case (falla)**

Crear/editar `RegisterInternalUserUseCaseTest.java`. Mockear todos los puertos + `SetUserSectionsUseCase`. Verifica que tras guardar el user se llama a `setUserSectionsUseCase.execute(...)` con las secciones y el tenant correctos.

```java
package lab.laboratorio.modules.empresa.application.usecase.identity;

import lab.laboratorio.modules.empresa.application.access.SetUserSectionsUseCase;
import lab.laboratorio.modules.empresa.domain.model.Role;
import lab.laboratorio.modules.empresa.domain.model.User;
import lab.laboratorio.modules.empresa.domain.port.RoleRepositoryPort;
import lab.laboratorio.modules.empresa.domain.port.TokenRepositoryPort;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.shared.access.AccessSection;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RegisterInternalUserUseCaseTest {

    @Mock UserRepositoryPort userRepo;
    @Mock RoleRepositoryPort roleRepositoryPort;
    @Mock TokenRepositoryPort tokenRepositoryPort;
    @Mock SetUserSectionsUseCase setUserSectionsUseCase;

    @InjectMocks RegisterInternalUserUseCase useCase;

    private User savedUserWithId(Long id) {
        return new User(id, "María", "García", "mgarcia", "m@l.com", null, "321",
                null, false, false, null, true, null, null, true, null, List.of(), 1L);
    }

    @Test
    void crea_el_usuario_y_asigna_sus_secciones_en_la_misma_operacion() {
        when(userRepo.existsByUsernameAndTenantId(any(), any())).thenReturn(false);
        when(userRepo.existsByEmailAndTenantIdAndIsExternal(any(), any(), eq(false))).thenReturn(false);
        when(userRepo.existsByDocumentAndTenantIdAndIsExternal(any(), any(), eq(false))).thenReturn(false);
        when(roleRepositoryPort.findByIds(List.of(2L))).thenReturn(List.of(new Role(2L, "SECRETARIA", "Secretaría", 1, true)));
        when(userRepo.save(any())).thenReturn(savedUserWithId(50L));

        var input = new RegisterInternalUserUseCase.Input(
                "María", "García", "m@l.com", "321", "mgarcia",
                List.of(2L), List.of(AccessSection.ATENCION, AccessSection.TURNOS), 1L, "admin");

        useCase.execute(input);

        ArgumentCaptor<SetUserSectionsUseCase.Input> cap = ArgumentCaptor.forClass(SetUserSectionsUseCase.Input.class);
        verify(setUserSectionsUseCase).execute(cap.capture());
        assertThat(cap.getValue().tenantId()).isEqualTo(1L);
        assertThat(cap.getValue().userId()).isEqualTo(50L);
        assertThat(cap.getValue().sections()).containsExactlyInAnyOrder(AccessSection.ATENCION, AccessSection.TURNOS);
        assertThat(cap.getValue().actor()).isEqualTo("admin");
    }

    @Test
    void sin_secciones_no_rompe_y_asigna_set_vacio() {
        when(userRepo.existsByUsernameAndTenantId(any(), any())).thenReturn(false);
        when(userRepo.existsByEmailAndTenantIdAndIsExternal(any(), any(), eq(false))).thenReturn(false);
        when(userRepo.existsByDocumentAndTenantIdAndIsExternal(any(), any(), eq(false))).thenReturn(false);
        when(roleRepositoryPort.findByIds(List.of(2L))).thenReturn(List.of(new Role(2L, "SECRETARIA", "Secretaría", 1, true)));
        when(userRepo.save(any())).thenReturn(savedUserWithId(50L));

        var input = new RegisterInternalUserUseCase.Input(
                "María", "García", "m@l.com", "321", "mgarcia", List.of(2L), null, 1L, "admin");

        useCase.execute(input);

        ArgumentCaptor<SetUserSectionsUseCase.Input> cap = ArgumentCaptor.forClass(SetUserSectionsUseCase.Input.class);
        verify(setUserSectionsUseCase).execute(cap.capture());
        assertThat(cap.getValue().sections()).isEmpty();
    }
}
```

- [ ] **Step 2: Correr el test (debe fallar a compilar — Input aún no tiene `sections`/`actor`)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=RegisterInternalUserUseCaseTest`
Expected: FAIL (no compila: el record `Input` no tiene esos campos).

- [ ] **Step 3: Extender el DTO de request**

`InternalUserRegisterRequest.java` completo:

```java
package lab.laboratorio.modules.empresa.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lab.laboratorio.shared.access.AccessSection;

import java.util.List;

public record InternalUserRegisterRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String email,
        @NotBlank String document,
        @NotBlank String username,
        @NotEmpty List<Long> roleIds,
        List<AccessSection> sections
) {}
```

(`sections` sin `@NotEmpty`: puede venir vacío o null = el usuario no ve ninguna sección.)

- [ ] **Step 4: Extender el use case**

En `RegisterInternalUserUseCase.java`:

1. Agregar import e inyección:
```java
import lab.laboratorio.modules.empresa.application.access.SetUserSectionsUseCase;
import lab.laboratorio.shared.access.AccessSection;
import java.util.Set;
import java.util.HashSet;
```
```java
    private final UserRepositoryPort userRepo;
    private final RoleRepositoryPort roleRepositoryPort;
    private final TokenRepositoryPort tokenRepositoryPort;
    private final SetUserSectionsUseCase setUserSectionsUseCase;   // <-- nuevo
```

2. Cambiar el record `Input` (agregar `sections` y `actor` al final):
```java
    public record Input(
            String firstName,
            String lastName,
            String email,
            String document,
            String username,
            List<Long> roleIds,
            List<AccessSection> sections,
            Long tenantId,
            String actor
    ) {}
```

3. Al final de `execute`, después de `tokenRepositoryPort.save(token);` y antes del `return`:
```java
        Set<AccessSection> sections = (input.sections() == null)
                ? Set.of()
                : new HashSet<>(input.sections());
        setUserSectionsUseCase.execute(new SetUserSectionsUseCase.Input(
                input.tenantId(), savedUser.id(), sections, input.actor()));

        return new Output(savedUser, plain);
```

- [ ] **Step 5: Actualizar el controller para pasar `sections` + `actor`**

En `UserController.java`, método `registerInternal` (L84-103). Agregar `java.security.Principal principal` al método y construir el Input con los dos campos nuevos:

```java
    @PostMapping("/internal")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<RegisterInternalUserResponse> registerInternal(
            @Valid @RequestBody InternalUserRegisterRequest request,
            java.security.Principal principal) {
        Long tenantId = TenantContext.requireTenantId();
        RegisterInternalUserUseCase.Input input = new RegisterInternalUserUseCase.Input(
                request.firstName(),
                request.lastName(),
                request.email(),
                request.document(),
                request.username(),
                request.roleIds(),
                request.sections(),
                tenantId,
                principal.getName()
        );
        RegisterInternalUserUseCase.Output output = registerInternalUserUseCase.execute(input);
        RegisterInternalUserResponse response = new RegisterInternalUserResponse(
                mapper.toResponse(output.user()),
                output.firstLoginToken()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
```

- [ ] **Step 6: Correr el test (debe pasar)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=RegisterInternalUserUseCaseTest`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/presentation/dto/request/InternalUserRegisterRequest.java src/main/java/lab/laboratorio/modules/empresa/application/usecase/identity/RegisterInternalUserUseCase.java src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java src/test/java/lab/laboratorio/modules/empresa/application/usecase/identity/RegisterInternalUserUseCaseTest.java
git commit -m "feat(empresa): alta de usuario atómica con secciones de acceso"
```

---

### Task A3: Edición atómica — el PUT /user/{id} asigna también las secciones

Mismo patrón en `UpdateUserUseCase`.

**Files:**
- Modify: `src/main/java/lab/laboratorio/modules/empresa/presentation/dto/request/UpdateUserRequest.java`
- Modify: `src/main/java/lab/laboratorio/modules/empresa/application/usecase/identity/UpdateUserUseCase.java`
- Modify: `src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java:105-123`
- Test: `src/test/java/lab/laboratorio/modules/empresa/application/usecase/identity/UpdateUserUseCaseTest.java`

- [ ] **Step 1: Escribir el test (falla)**

```java
package lab.laboratorio.modules.empresa.application.usecase.identity;

import lab.laboratorio.modules.empresa.application.access.SetUserSectionsUseCase;
import lab.laboratorio.modules.empresa.domain.model.User;
import lab.laboratorio.modules.empresa.domain.port.UserRepositoryPort;
import lab.laboratorio.shared.access.AccessSection;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UpdateUserUseCaseTest {

    @Mock UserRepositoryPort userRepo;
    @Mock SetUserSectionsUseCase setUserSectionsUseCase;
    @InjectMocks UpdateUserUseCase useCase;

    private User existing() {
        return new User(7L, "M", "G", "mg", "m@l.com", null, "321",
                null, true, false, null, false, null, null, true, null, List.of(), 1L);
    }

    @Test
    void actualiza_el_usuario_y_reemplaza_sus_secciones() {
        when(userRepo.findByIdAndTenantId(7L, 1L)).thenReturn(Optional.of(existing()));
        when(userRepo.save(any())).thenReturn(existing());

        var input = new UpdateUserUseCase.Input(
                7L, "M", "G", "m@l.com", "321", "mg",
                List.of(2L), List.of(AccessSection.PACIENTES), 1L, "admin");

        useCase.execute(input);

        ArgumentCaptor<SetUserSectionsUseCase.Input> cap = ArgumentCaptor.forClass(SetUserSectionsUseCase.Input.class);
        verify(setUserSectionsUseCase).execute(cap.capture());
        assertThat(cap.getValue().userId()).isEqualTo(7L);
        assertThat(cap.getValue().sections()).containsExactly(AccessSection.PACIENTES);
        assertThat(cap.getValue().actor()).isEqualTo("admin");
    }
}
```

- [ ] **Step 2: Correr (falla a compilar)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=UpdateUserUseCaseTest`
Expected: FAIL (Input sin `sections`/`actor`).

- [ ] **Step 3: Extender `UpdateUserRequest.java`**

```java
package lab.laboratorio.modules.empresa.presentation.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lab.laboratorio.shared.access.AccessSection;

import java.util.List;

public record UpdateUserRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @NotBlank String email,
        @NotBlank String document,
        @NotBlank String username,
        @NotEmpty List<Long> roleIds,
        List<AccessSection> sections
) {}
```

- [ ] **Step 4: Extender `UpdateUserUseCase.java`**

1. Imports + inyección:
```java
import lab.laboratorio.modules.empresa.application.access.SetUserSectionsUseCase;
import lab.laboratorio.shared.access.AccessSection;
import java.util.HashSet;
import java.util.Set;
```
```java
    private final UserRepositoryPort userRepo;
    private final SetUserSectionsUseCase setUserSectionsUseCase;   // <-- nuevo
```

2. Record `Input` (agregar `sections` y `actor`):
```java
    public record Input(
            Long userId,
            String firstName,
            String lastName,
            String email,
            String document,
            String username,
            List<Long> roleIds,
            List<AccessSection> sections,
            Long tenantId,
            String actor
    ) {}
```

3. En `execute`, reemplazar `return userRepo.save(updated);` por:
```java
        User saved = userRepo.save(updated);

        Set<AccessSection> sections = (input.sections() == null)
                ? Set.of()
                : new HashSet<>(input.sections());
        setUserSectionsUseCase.execute(new SetUserSectionsUseCase.Input(
                input.tenantId(), saved.id(), sections, input.actor()));

        return saved;
```

- [ ] **Step 5: Actualizar el controller `updateUser`**

```java
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            java.security.Principal principal) {
        Long tenantId = TenantContext.requireTenantId();
        UpdateUserUseCase.Input input = new UpdateUserUseCase.Input(
                id,
                request.firstName(),
                request.lastName(),
                request.email(),
                request.document(),
                request.username(),
                request.roleIds(),
                request.sections(),
                tenantId,
                principal.getName()
        );
        User user = updateUserUseCase.execute(input);
        return ResponseEntity.ok(mapper.toResponse(user));
    }
```

- [ ] **Step 6: Correr el test (pasa)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=UpdateUserUseCaseTest`
Expected: PASS.

- [ ] **Step 7: Correr la suite del módulo empresa (no romper callers existentes)**

Run: `set "JAVA_HOME=C:\Users\tobia\.sdkman\candidates\java\21.0.5-tem" && .\mvnw.cmd -q test -Dtest=*UseCaseTest,UserControllerTest`
Expected: PASS. Si `UserControllerTest` construye `InternalUserRegisterRequest`/`UpdateUserRequest` con el constructor canónico, actualizá esas llamadas para pasar `sections` (ej. `List.of()` o `null`) y, si el test arma el request por JSON, no requiere cambios.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/lab/laboratorio/modules/empresa/presentation/dto/request/UpdateUserRequest.java src/main/java/lab/laboratorio/modules/empresa/application/usecase/identity/UpdateUserUseCase.java src/main/java/lab/laboratorio/modules/empresa/presentation/controller/UserController.java src/test/java/lab/laboratorio/modules/empresa/application/usecase/identity/UpdateUserUseCaseTest.java
git commit -m "feat(empresa): edición de usuario atómica con secciones de acceso"
```

---

## Phase B — Frontend

Comandos desde el worktree del frontend. Tests con `npx vitest run <archivo>` (store/lógica) o `ng test` para specs de componente que rendericen signal inputs (ver memoria del proyecto). Type-check: `npx tsc -p tsconfig.app.json --noEmit`.

### Task B1: Notification host (renderiza los toasts que hoy son invisibles)

`NotificationService` empuja a un signal `notifications` que nadie renderiza. Creamos un host y lo montamos en `AdminShellComponent`.

**Files:**
- Create: `src/app/core/components/notification-host/notification-host.component.ts`
- Create (test): `src/app/core/components/notification-host/notification-host.component.spec.ts`
- Modify: `src/app/layout/admin-shell/admin-shell.component.ts`

- [ ] **Step 1: Escribir el test (falla)**

```ts
import { TestBed } from '@angular/core/testing';
import { NotificationHostComponent } from './notification-host.component';
import { NotificationService } from '@core/services/notification.service';

describe('NotificationHostComponent', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [NotificationHostComponent] });
    const fixture = TestBed.createComponent(NotificationHostComponent);
    const svc = TestBed.inject(NotificationService);
    fixture.detectChanges();
    return { fixture, svc };
  }

  it('renderiza una notificación del servicio', () => {
    const { fixture, svc } = setup();
    svc.success('Accesos actualizados');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accesos actualizados');
  });

  it('al cerrar, la quita del servicio', () => {
    const { fixture, svc } = setup();
    svc.success('Hola');
    fixture.detectChanges();
    const close = fixture.nativeElement.querySelector('.notif__close') as HTMLButtonElement;
    close.click();
    fixture.detectChanges();
    expect(svc.notifications().length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Hola');
  });
});
```

- [ ] **Step 2: Correr (falla — el componente no existe)**

Run: `npx vitest run src/app/core/components/notification-host/notification-host.component.spec.ts`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Crear el componente**

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notif-host" aria-live="polite">
      @for (n of notifications(); track n.id) {
        <div class="notif notif--{{ n.severity }}">
          <i class="pi" [class.pi-check-circle]="n.severity === 'success'"
                        [class.pi-times-circle]="n.severity === 'error'"
                        [class.pi-info-circle]="n.severity === 'info'"
                        [class.pi-exclamation-triangle]="n.severity === 'warn'"></i>
          <div class="notif__body">
            <strong>{{ n.summary }}</strong>
            @if (n.detail) { <span>{{ n.detail }}</span> }
          </div>
          <button type="button" class="notif__close" aria-label="Cerrar" (click)="dismiss(n.id)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notif-host {
      position: fixed; top: var(--space-4); right: var(--space-4);
      display: flex; flex-direction: column; gap: var(--space-2);
      z-index: 1100; max-width: 360px;
    }
    .notif {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border-radius: 10px; background: var(--ds-surface, #fff);
      box-shadow: 0 8px 24px rgba(0,0,0,.18); border-left: 4px solid var(--ds-text-muted);
    }
    .notif--success { border-left-color: #16a34a; }
    .notif--error   { border-left-color: #dc2626; }
    .notif--warn    { border-left-color: #d97706; }
    .notif--info    { border-left-color: #2563eb; }
    .notif__body { display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
    .notif__close { background: none; border: none; cursor: pointer; color: var(--ds-text-muted); }
  `],
})
export class NotificationHostComponent {
  private readonly service = inject(NotificationService);
  readonly notifications = this.service.notifications;
  dismiss(id: number): void { this.service.dismiss(id); }
}
```

- [ ] **Step 4: Correr (pasa)**

Run: `npx vitest run src/app/core/components/notification-host/notification-host.component.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Montar el host en el shell**

En `src/app/layout/admin-shell/admin-shell.component.ts`:

1. Import:
```ts
import { NotificationHostComponent } from '@core/components/notification-host/notification-host.component';
```
2. Agregar `NotificationHostComponent` al array `imports` del `@Component`.
3. En el template, antes de `</div>` del `.ui-admin-shell` (junto a `<ui-change-password-drawer />` / `<ui-logout-confirm />`), agregar:
```html
      <app-notification-host />
```

- [ ] **Step 6: Type-check + commit**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores.

```bash
git add src/app/core/components/notification-host/ src/app/layout/admin-shell/admin-shell.component.ts
git commit -m "fix(core): host global de notificaciones (toasts del NotificationService eran invisibles)"
```

---

### Task B2: Constante de presets rol → secciones

**Files:**
- Create: `src/app/features/empresa/models/role-section-presets.ts`
- Create (test): `src/app/features/empresa/models/role-section-presets.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

```ts
import { presetForRole, ROLE_SECTION_PRESETS } from './role-section-presets';

describe('role-section-presets', () => {
  it('SECRETARIA pre-marca atención/pacientes/turnos/obras sociales', () => {
    expect(ROLE_SECTION_PRESETS['SECRETARIA']).toEqual(
      ['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES'],
    );
  });

  it('presetForRole intersecta con las grantable', () => {
    const grantable = ['ATENCION', 'PACIENTES', 'TURNOS'] as const;
    expect(presetForRole('SECRETARIA', [...grantable])).toEqual(['ATENCION', 'PACIENTES', 'TURNOS']);
  });

  it('rol desconocido → preset vacío', () => {
    expect(presetForRole('NO_EXISTE', ['ATENCION'])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr (falla)**

Run: `npx vitest run src/app/features/empresa/models/role-section-presets.spec.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Crear la constante + helper**

```ts
import { AccessSection } from '@core/access/access.model';

/** Secciones que pre-marca cada rol al elegirlo en el drawer. Defaults editables por el admin. */
export const ROLE_SECTION_PRESETS: Record<string, AccessSection[]> = {
  ADMINISTRADOR: [
    'ATENCION', 'EXTRACCIONES', 'PREANALITICA', 'ANALITICA', 'POSTANALITICA',
    'PACIENTES', 'TURNOS', 'FINANCIERO', 'OBRAS_SOCIALES', 'STOCK', 'PORTAL', 'SUCURSALES',
  ],
  SECRETARIA: ['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES'],
  RESPONSABLE_SECRETARIA: ['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES', 'FINANCIERO', 'SUCURSALES'],
  FACTURISTA: ['FINANCIERO', 'OBRAS_SOCIALES', 'PACIENTES'],
  EXTRACTOR: ['EXTRACCIONES', 'ATENCION'],
  TECNICO_LABORATORIO: ['PREANALITICA', 'ANALITICA', 'EXTRACCIONES'],
  BIOQUIMICO: ['PREANALITICA', 'ANALITICA', 'POSTANALITICA', 'PACIENTES'],
  MANAGER_STOCK: ['STOCK'],
  EXTERNO: ['PORTAL'],
};

/** Preset del rol ∩ secciones grantable del tenant (si un módulo no está activo, su sección se descarta). */
export function presetForRole(roleCode: string, grantable: AccessSection[]): AccessSection[] {
  const preset = ROLE_SECTION_PRESETS[roleCode] ?? [];
  const allowed = new Set(grantable);
  return preset.filter((s) => allowed.has(s));
}
```

- [ ] **Step 4: Correr (pasa) + commit**

Run: `npx vitest run src/app/features/empresa/models/role-section-presets.spec.ts`
Expected: PASS.

```bash
git add src/app/features/empresa/models/role-section-presets.ts src/app/features/empresa/models/role-section-presets.spec.ts
git commit -m "feat(empresa): preset de secciones por rol"
```

---

### Task B3: Agregar `sections` al payload de usuario

**Files:**
- Modify: `src/app/features/empresa/models/usuario.model.ts`

- [ ] **Step 1: Agregar el campo**

En `usuario.model.ts`, agregar el import y el campo en `CrearUsuarioPayload` (recordar que `ActualizarUsuarioPayload = CrearUsuarioPayload`, así que cubre ambos):

```ts
import { Rol } from './rol.model';
import { AccessSection } from '@core/access/access.model';
```
```ts
export interface CrearUsuarioPayload {
  firstName: string;
  lastName: string;
  email: string;
  document: string;
  username: string;
  roleIds: number[];
  sections: AccessSection[];
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: aparecerán errores en `usuario-form-drawer.component.ts` (el `getRawValue()` aún no tiene `sections`) — se resuelven en Task B4. Verificá que NO haya otros errores fuera del drawer.

```bash
git add src/app/features/empresa/models/usuario.model.ts
git commit -m "feat(empresa): sections en el payload de alta/edición de usuario"
```

---

### Task B4: Rediseño del drawer (rol único + checklist + preset + emite sections)

**Files:**
- Modify: `src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.ts`
- Modify (test): `src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.spec.ts` (crear si no existe)

Reusa `rp-secciones-checklist` (de roles-permisos). El drawer mantiene un `workingSet` local (signal); el rol lo re-aplica con el preset; el checklist emite toggles que actualizan el signal.

- [ ] **Step 1: Escribir el test (falla)**

```ts
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { UsuarioFormDrawerComponent } from './usuario-form-drawer.component';
import { Rol } from '../../../models/rol.model';
import { SectionResponse } from '@core/access/access.model';

const ROLES: Rol[] = [
  { id: 2, code: 'SECRETARIA', description: 'Secretaría', hierarchy: 1 },
  { id: 5, code: 'BIOQUIMICO', description: 'Bioquímico', hierarchy: 2 },
];
const CATALOG: SectionResponse[] = [
  { code: 'ATENCION', label: 'Atención' }, { code: 'PACIENTES', label: 'Pacientes' },
  { code: 'TURNOS', label: 'Turnos' }, { code: 'OBRAS_SOCIALES', label: 'Obras Sociales' },
  { code: 'ANALITICA', label: 'Analítica' },
];

function build() {
  TestBed.configureTestingModule({ imports: [UsuarioFormDrawerComponent], providers: [provideNoopAnimations()] });
  const fixture = TestBed.createComponent(UsuarioFormDrawerComponent);
  fixture.componentRef.setInput('roles', ROLES);
  fixture.componentRef.setInput('catalog', CATALOG);
  fixture.componentRef.setInput('initialSections', []);
  fixture.componentRef.setInput('visible', true);
  fixture.detectChanges();
  return { fixture, comp: fixture.componentInstance as any };
}

describe('UsuarioFormDrawerComponent', () => {
  it('al elegir un rol, aplica su preset ∩ catálogo al workingSet', () => {
    const { comp } = build();
    comp.onRoleChange(2); // SECRETARIA → ATENCION,PACIENTES,TURNOS,OBRAS_SOCIALES (todas en el catálogo)
    expect(comp.workingSet()).toEqual(['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES']);
  });

  it('cambiar de rol reemplaza el preset', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    comp.onRoleChange(5); // BIOQUIMICO → PRE/ANALITICA/POST/PACIENTES; del catálogo solo ANALITICA,PACIENTES
    expect(comp.workingSet()).toEqual(['ANALITICA', 'PACIENTES']);
  });

  it('toggle agrega/saca una sección', () => {
    const { comp } = build();
    comp.onRoleChange(2);
    comp.onToggleSection('ATENCION'); // saca
    expect(comp.workingSet()).not.toContain('ATENCION');
    comp.onToggleSection('ANALITICA'); // agrega
    expect(comp.workingSet()).toContain('ANALITICA');
  });

  it('submit emite el payload con roleIds:[rol] y sections=workingSet', () => {
    const { comp } = build();
    comp.form.patchValue({ firstName: 'M', lastName: 'G', email: 'm@l.com', document: '1', username: 'mg' });
    comp.onRoleChange(2);
    let emitted: any = null;
    comp.create.subscribe((p: any) => (emitted = p));
    comp.onSubmit();
    expect(emitted.roleIds).toEqual([2]);
    expect(emitted.sections).toEqual(['ATENCION', 'PACIENTES', 'TURNOS', 'OBRAS_SOCIALES']);
  });
});
```

- [ ] **Step 2: Correr (falla)**

Run: `ng test --include src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.spec.ts --watch=false`
Expected: FAIL (no existen `onRoleChange`/`workingSet`/`catalog`/`onToggleSection`).

- [ ] **Step 3: Reescribir el drawer**

Reemplazo completo de `usuario-form-drawer.component.ts`:

```ts
import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges,
  computed, inject, signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Rol } from '../../../models/rol.model';
import { ActualizarUsuarioPayload, CrearUsuarioPayload, Usuario } from '../../../models/usuario.model';
import { AccessSection, SectionResponse } from '@core/access/access.model';
import { SeccionesChecklistComponent } from '@features/roles-permisos/components/secciones-checklist.component';
import { presetForRole } from '../../../models/role-section-presets';

@Component({
  selector: 'emp-usuario-form-drawer',
  standalone: true,
  imports: [
    ReactiveFormsModule, DrawerModule, ButtonModule, InputTextModule, SelectModule,
    SeccionesChecklistComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="visibleInternal"
      (visibleChange)="onVisibleChange($event)"
      position="right"
      styleClass="ui-drawer-half"
      [modal]="true"
      [dismissible]="true"
      [header]="editing() ? 'Editar usuario' : 'Invitar usuario'">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col h-full">
        <div class="pat-form" style="flex:1; overflow-y:auto;">
          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-user" style="margin-right:6px"></i>Datos del usuario</span>
            </div>
            <div class="pat-form__grid">
              <div class="pat-form__field">
                <label class="pat-form__label">Nombre*</label>
                <input pInputText formControlName="firstName" class="pat-form__input" placeholder="María" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Apellido*</label>
                <input pInputText formControlName="lastName" class="pat-form__input" placeholder="García" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Email*</label>
                <input pInputText type="email" formControlName="email" class="pat-form__input" placeholder="maria@laboratorio.com" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Documento*</label>
                <input pInputText formControlName="document" class="pat-form__input" placeholder="32456789" />
              </div>
              <div class="pat-form__field">
                <label class="pat-form__label">Usuario*</label>
                <input pInputText formControlName="username" class="pat-form__input" placeholder="mgarcia" />
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-id-card" style="margin-right:6px"></i>Rol</span>
            </div>
            <div class="pat-form__grid pat-form__grid--full">
              <div class="pat-form__field">
                <label class="pat-form__label">Rol*</label>
                <p-select
                  [options]="roles"
                  optionLabel="description"
                  optionValue="id"
                  formControlName="roleId"
                  appendTo="body"
                  class="w-full"
                  placeholder="Elegí un rol"
                  (onChange)="onRoleChange($event.value)" />
                <small class="ui-text-muted">El rol pre-marca las secciones. Podés ajustarlas abajo.</small>
              </div>
            </div>
          </section>

          <section class="pat-form__card">
            <div class="pat-form__card-header">
              <span><i class="pi pi-th-large" style="margin-right:6px"></i>Accesos (secciones)</span>
            </div>
            <rp-secciones-checklist
              [catalog]="catalog"
              [workingSet]="workingSet()"
              (toggle)="onToggleSection($event)" />
          </section>
        </div>

        <div class="pat-form__footer">
          <p-button label="Cancelar" severity="secondary" text type="button" (onClick)="cancel.emit()" />
          <p-button
            [label]="editing() ? 'Guardar' : 'Invitar'"
            severity="primary"
            type="submit"
            [disabled]="!canSubmit() || saving"
            [loading]="saving" />
        </div>
      </form>
    </p-drawer>
  `,
})
export class UsuarioFormDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() visible = false;
  @Input({ required: true }) roles!: Rol[];
  @Input({ required: true }) catalog!: SectionResponse[];
  @Input() initialSections: AccessSection[] = [];
  @Input() usuario: Usuario | null = null;
  @Input() saving = false;

  @Output() create = new EventEmitter<CrearUsuarioPayload>();
  @Output() update = new EventEmitter<{ id: number; payload: ActualizarUsuarioPayload }>();
  @Output() cancel = new EventEmitter<void>();

  visibleInternal = false;
  readonly workingSet = signal<AccessSection[]>([]);

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    document: ['', [Validators.required]],
    username: ['', [Validators.required]],
    roleId: [null as number | null, [Validators.required]],
  });

  readonly status = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly canSubmit = computed(() => this.status() === 'VALID');
  readonly editing = computed(() => !!this.usuario);

  private wasVisible = false;

  private grantableCodes(): AccessSection[] {
    return this.catalog.map((s) => s.code);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      this.visibleInternal = this.visible;
      if (this.visible && !this.wasVisible) {
        if (this.usuario) {
          const firstRoleId = this.usuario.roles[0]?.id ?? null;
          this.form.reset({
            firstName: this.usuario.firstName,
            lastName: this.usuario.lastName,
            email: this.usuario.email,
            document: this.usuario.document,
            username: this.usuario.username,
            roleId: firstRoleId,
          });
          this.workingSet.set([...this.initialSections]);
        } else {
          this.form.reset({ firstName: '', lastName: '', email: '', document: '', username: '', roleId: null });
          this.workingSet.set([]);
        }
      }
      this.wasVisible = this.visible;
    }
  }

  onRoleChange(roleId: number | null): void {
    const role = this.roles.find((r) => r.id === roleId);
    if (!role) { this.workingSet.set([]); return; }
    this.workingSet.set(presetForRole(role.code, this.grantableCodes()));
  }

  onToggleSection(code: AccessSection): void {
    const current = this.workingSet();
    this.workingSet.set(
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  onVisibleChange(open: boolean): void {
    this.visibleInternal = open;
    if (!open) this.cancel.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: CrearUsuarioPayload = {
      firstName: raw.firstName!,
      lastName: raw.lastName!,
      email: raw.email!,
      document: raw.document!,
      username: raw.username!,
      roleIds: raw.roleId != null ? [raw.roleId] : [],
      sections: this.workingSet(),
    };
    if (this.usuario) {
      this.update.emit({ id: this.usuario.id, payload });
    } else {
      this.create.emit(payload);
    }
  }
}
```

> Nota: `p-select` es el dropdown de PrimeNG 21 (antes `p-dropdown`). Si el repo aún expone `DropdownModule`, usar `import { DropdownModule } from 'primeng/dropdown'` y `<p-dropdown>`. Verificar cuál está disponible con un grep de `primeng/select` vs `primeng/dropdown` en el repo antes de implementar.

- [ ] **Step 4: Correr (pasa)**

Run: `ng test --include src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.spec.ts --watch=false`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.ts src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.spec.ts
git commit -m "feat(empresa): drawer con rol único + checklist de secciones y preset"
```

---

### Task B5: Wiring de la página de usuarios (catálogo + precarga de secciones en edición)

La página dispara la carga del catálogo grantable y, al editar, precarga las secciones del usuario; pasa ambos al drawer. Reusa el store de roles-permisos (`loadCatalog`/`selectCatalog`, `selectUser`/`selectWorkingSet`).

**Files:**
- Modify: `src/app/features/empresa/pages/usuarios/usuarios.page.ts`
- Modify (test): la spec de `usuarios.page` si existe; si no, agregar asserts mínimos al describe nuevo.

- [ ] **Step 1: Editar `usuarios.page.ts`**

1. Imports nuevos:
```ts
import { loadCatalog, selectUser } from '@features/roles-permisos/store/roles-permisos.actions';
import { selectCatalog, selectWorkingSet } from '@features/roles-permisos/store/roles-permisos.selectors';
```
2. Signals nuevos (junto a los demás `selectSignal`):
```ts
  readonly catalog = this.store.selectSignal(selectCatalog);
  readonly editingSections = this.store.selectSignal(selectWorkingSet);
```
3. En `ngOnInit`, agregar el dispatch del catálogo:
```ts
  ngOnInit(): void {
    this.store.dispatch(loadRoles());
    this.store.dispatch(loadCatalog());
    this.store.dispatch(loadUsuarios({ filters: this.filters() }));
  }
```
4. En `openEdit`, precargar las secciones del usuario:
```ts
  openEdit(u: Usuario): void {
    this.editingUser.set(u);
    this.store.dispatch(selectUser({ userId: u.id }));
    this.formOpen.set(true);
  }
```
5. En el template, pasar los inputs nuevos al drawer:
```html
    <emp-usuario-form-drawer
      [visible]="formOpen()"
      [usuario]="editingUser()"
      [roles]="roles()"
      [catalog]="catalog()"
      [initialSections]="editingUser() ? editingSections() : []"
      [saving]="pending()"
      (create)="onCreate($event)"
      (update)="onUpdate($event)"
      (cancel)="closeForm()" />
```

- [ ] **Step 2: Test (dispatch de loadCatalog en init y selectUser en edición)**

Agregar/crear `usuarios.page.spec.ts` siguiendo el patrón de `roles-permisos.page.spec.ts` (provideMockStore con `EMPRESA_FEATURE_KEY` + `ROLES_PERMISOS_FEATURE_KEY` en initialState, `provideNoopAnimations()`):

```ts
it('en init dispara loadCatalog', () => {
  const { fixture, store } = setup();
  const spy = vi.spyOn(store, 'dispatch');
  fixture.detectChanges();
  expect(spy).toHaveBeenCalledWith(loadCatalog());
});

it('openEdit precarga las secciones del usuario', () => {
  const { fixture, store } = setup();
  fixture.detectChanges();
  const spy = vi.spyOn(store, 'dispatch');
  fixture.componentInstance.openEdit({ id: 7, roles: [] } as any);
  expect(spy).toHaveBeenCalledWith(selectUser({ userId: 7 }));
});
```

- [ ] **Step 3: Correr (pasa) + type-check**

Run: `ng test --include src/app/features/empresa/pages/usuarios/usuarios.page.spec.ts --watch=false`
Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: PASS / sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/empresa/pages/usuarios/usuarios.page.ts src/app/features/empresa/pages/usuarios/usuarios.page.spec.ts
git commit -m "feat(empresa): usuarios.page carga catálogo y precarga secciones para el drawer"
```

---

### Task B6: Borrar la pantalla /roles y su ítem del sidebar

La gestión de secciones ahora vive en el drawer. Se borran la página, su ruta y el ítem del sidebar. **Se conservan** el store/effects/selectors de roles-permisos (los consume el drawer vía `loadCatalog`/`selectCatalog`/`selectUser`/`selectWorkingSet`), el `secciones-checklist`, los models y el `RolesPermisosApiService`.

**Files:**
- Delete: `src/app/features/roles-permisos/pages/roles-permisos.page.ts` y su `.spec.ts`
- Delete: `src/app/features/roles-permisos/roles-permisos.routes.ts`
- Delete: `src/app/features/empresa/pages/usuarios/components/usuarios-picker.component.ts` (+ spec si tiene) — **solo si no lo usa la pantalla de usuarios**; verificar con grep antes.
- Modify: `src/app/app.routes.ts` (quitar la ruta `roles`)
- Modify: `src/app/layout/sidebar/sidebar.nav.ts` (quitar el ítem)

- [ ] **Step 1: Quitar la ruta `/roles` de `app.routes.ts`**

Borrar el bloque (dentro de los children del `''` → AdminShell):
```ts
      {
        path: 'roles',
        loadChildren: () =>
          import('./features/roles-permisos/roles-permisos.routes').then((m) => m.ROLES_PERMISOS_ROUTES),
      },
```

- [ ] **Step 2: Quitar el ítem del sidebar**

En `src/app/layout/sidebar/sidebar.nav.ts`, sección `'Gestión'`, borrar la línea:
```ts
      { kind: 'link', label: 'Roles y permisos', icon: 'pi pi-shield',   path: '/roles',   roleKey: 'ADMINISTRADOR' },
```

- [ ] **Step 3: Borrar los archivos de la página y la ruta**

```bash
git rm src/app/features/roles-permisos/pages/roles-permisos.page.ts src/app/features/roles-permisos/pages/roles-permisos.page.spec.ts src/app/features/roles-permisos/roles-permisos.routes.ts
```

Verificar antes de borrar `usuarios-picker` (puede no existir o usarse en otro lado):
Run: `grep -rn "usuarios-picker\|UsuariosPicker" src/app`
Si solo aparece su definición/spec, borrarlo con `git rm`.

- [ ] **Step 4: Verificar que no queden imports colgados**

Run: `npx tsc -p tsconfig.app.json --noEmit`
Expected: sin errores. Si algún import apuntaba a `roles-permisos.page` o `roles-permisos.routes`, resolverlo (no debería: la página solo se cargaba por ruta).

- [ ] **Step 5: Smoke — la app compila sin /roles**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(roles-permisos): elimina la pantalla /roles (la gestión vive en el drawer de usuario)"
```

---

## Self-review (cobertura del spec)

- Modelo B (rol → preset editable en el drawer): **B4** (drawer) + **B2** (preset) + **B5** (wiring).
- Rol único: **B4** (form `roleId` single, payload `roleIds:[roleId]`).
- Guardado atómico create/update con secciones: **A2/A3** (BE) + **B3** (payload) + **B5/B4** (FE envía `sections` por el alta/edición existente).
- Fix dropdown roles (trailing slash, BE): **A1**.
- Fix host de notificaciones: **B1**.
- Borrar `/roles` + sidebar: **B6**.
- Preset ∩ grantable / solo módulos activos: **B2** (`presetForRole`) + el `secciones-checklist` ya filtra por catálogo (`catalog`).
- Enforcement intacto (`/me/access-sections`, guards): no se toca en ninguna task. ✔

**Notas de consistencia verificadas:** `SetUserSectionsUseCase.Input(tenantId, userId, Set<AccessSection>, actor)` se usa idéntico en A2 y A3. El front envía `sections: AccessSection[]` (strings) → el BE recibe `List<AccessSection>` (Jackson mapea por `name()`). `presetForRole(roleCode, grantable)` se llama en B4 con `this.catalog.map(s => s.code)`. El `secciones-checklist` toma `catalog` + `workingSet` y emite `toggle` (no un set completo) — el drawer mantiene el `workingSet` local (B4).
