# Médicos / Empleados — Pulido + fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).
>
> **Jira:** _(pendiente — `jira-workflow`, regla #1 de ambos repos)_
>
> **Spec:** `docs/superpowers/specs/2026-06-14-medicos-empleados-pulido-design.md`

**Goal:** Arreglar el 500 de alta/invitación/edición de usuario interno, rutear errores de empleado a toast, refactorizar el stepper de empleados (email+celular fijos, dirección igual a paciente, precarga de usuario) y convertir médicos derivantes a un drawer quick-add repetible.

**PRs reales (uno por repo).** Cross-stack = PR de BE + PR de FE:

| Fase | Repo | PR |
|------|------|-----|
| A | Backend | fix 500 `existsActiveBranchForTenant` |
| B | Frontend | error empleado → toast |
| C-BE | Backend | Address texto-libre (barrio/ciudad/provincia) + migración |
| C-FE | Frontend | stepper empleado 3 pasos + precarga usuario |
| D | Frontend | drawer médicos quick-add repetible |

**Orden:** A primero (bloqueante). C-BE antes de C-FE (el FE consume los campos nuevos). B y D independientes.

**Repos:** Backend `c:\Users\tobia\Desktop\TUP\TESIS\Backend` (worktree off `development`, JDK 21). Frontend este worktree `feat/medicos-empleados-pulido` (`npm ci` antes de testear).

---

## FASE A — Backend: fix del 500 (`existsActiveBranchForTenant`)

Rutas: `Backend/src/main/java/lab/laboratorio/modules/empresa/`.

### Task A1: Cambiar el native query boolean → COUNT long

**Files:**
- Modify: `infrastructure/persistence/repository/UserBranchJpaRepository.java:41-46`
- Modify: `infrastructure/UserBranchAssignmentAdapter.java:64`
- Modify: `infrastructure/UserBranchAccessAdapter.java:56`

- [ ] **Step 1: Test de repositorio que reproduce el bug (DB real)**

Crear `src/test/java/lab/laboratorio/modules/empresa/infrastructure/persistence/repository/UserBranchJpaRepositoryIT.java`. Usar el harness de integración con **MySQL Testcontainers** del proyecto (NO `@DataJpaTest` con H2 — H2 mapea el boolean y oculta el bug). Insertar una branch activa del tenant y verificar:
```java
@Test
void cuenta_branch_activa_del_tenant_sin_lanzar() {
    // seed: branch (id=B, tenant=T, active=true)
    long count = repo.countActiveBranchForTenant(B, T);
    assertThat(count).isEqualTo(1L);
    assertThat(repo.countActiveBranchForTenant(999999L, T)).isZero();
}
```
Si no existe harness Testcontainers para repos, replicar el de boot MySQL ya usado por el proyecto (ver memoria `mysql-boot-verification`). Como fallback, un test de integración a nivel usecase que levante el contexto contra MySQL.

- [ ] **Step 2: Correr (falla a compilar — método no existe)**

Run: `cd Backend && ./mvnw -q -Dtest=UserBranchJpaRepositoryIT test` (JDK 21)
Expected: FAIL — `countActiveBranchForTenant` no existe.

- [ ] **Step 3: Reemplazar el query**

En `UserBranchJpaRepository.java`, reemplazar el método `existsActiveBranchForTenant` (líneas 41-46) por:
```java
    /**
     * Cantidad de coincidencias de una sucursal activa del tenant. Devuelve
     * COUNT (long) — NO boolean: el native `CASE WHEN ... THEN TRUE` no mapea a
     * boolean primitivo en Hibernate/MySQL y rompe con 500. El caller compara > 0.
     */
    @Query(value =
            "SELECT COUNT(b.id) FROM branches b " +
            "WHERE b.id = :branchId AND b.tenant_id = :tenantId AND b.active = TRUE",
            nativeQuery = true)
    long countActiveBranchForTenant(@Param("branchId") Long branchId, @Param("tenantId") Long tenantId);
```

- [ ] **Step 4: Actualizar los 2 call sites**

En `UserBranchAssignmentAdapter.java:64` y `UserBranchAccessAdapter.java:56`, reemplazar:
```java
return userBranchRepo.existsActiveBranchForTenant(branchId, tenantId);
```
por:
```java
return userBranchRepo.countActiveBranchForTenant(branchId, tenantId) > 0;
```

- [ ] **Step 5: Correr el test (pasa)**

Run: `cd Backend && ./mvnw -q -Dtest=UserBranchJpaRepositoryIT test`
Expected: PASS.

- [ ] **Step 6: Verificación manual (los 3 endpoints)**

Con el backend corriendo, re-correr los curls (ver memoria `mysql-boot-verification` para el login). Expected: ya NO 500:
- `POST /api/v1/user/internal` (alta/invitación) → 200/201 o 4xx de validación (no 500).
- `PUT /api/v1/user/11000` (edición) → 200 (no 500).

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "fix(empresa): existsActiveBranchForTenant boolean->COUNT long (rompía 500 alta/edición de usuario)"
```

---

## FASE B — Frontend: error de empleado → toast

Rutas: `src/app/features/sucursales/...` y `src/app/core/services/notification.service.ts`.

### Task B1: Rutear el error de guardar al NotificationService

**Files:**
- Modify: `features/sucursales/store/employee.effects.ts` (effects de `addEmployeeFailure`/`createEmployeeWithUserFailure`/`updateEmployeeFailure`)
- Modify: `features/sucursales/pages/empleado-form/empleado-form.page.ts` (quitar banner inline líneas 55-59)
- Create/Modify: helper de mapeo de error (mover `saveErrorMessage`)
- Test: `employee.effects.spec.ts`, `empleado-form.page.spec.ts`

- [ ] **Step 1: Test del effect**

En `employee.effects.spec.ts`: al emitir `addEmployeeFailure({ error: { status: 500 } })` (y los otros dos failures), el effect llama `notification.error(...)` con el mensaje humanizado (status 500 → "No se pudo guardar el empleado. Intentá de nuevo en unos minutos.").

- [ ] **Step 2: Correr (falla)** — Run: `npx vitest run src/app/features/sucursales/store/employee.effects.spec.ts` → FAIL.

- [ ] **Step 3: Implementar el toast en el effect**

En `employee.effects.ts`, agregar un effect (non-dispatching) que escuche los 3 failures y dispare el toast. Mover la lógica de `saveErrorMessage` (status→mensaje) a un helper reutilizable `employeeSaveErrorMessage(err)` (en `features/sucursales/.../employee-error.util.ts`) para usarla acá:
```ts
notifyEmployeeSaveError$ = createEffect(() =>
  this.actions$.pipe(
    ofType(addEmployeeFailure, createEmployeeWithUserFailure, updateEmployeeFailure),
    tap(({ error }) => this.notification.error(employeeSaveErrorMessage(error))),
  ),
  { dispatch: false },
);
```
(Inyectar `NotificationService`. Importar los `*Failure` actions.)

- [ ] **Step 4: Quitar el banner inline de la page**

En `empleado-form.page.ts`, borrar el bloque `@if (saveError(); as err) { ... {{ saveErrorMessage(err) }} ... }` (líneas 55-59) y el método `saveErrorMessage` (movido al util). El error ahora se ve por el toast top-right (consistente con los de éxito). Mantener `saveError` solo si se usa para deshabilitar algo; si no, quitarlo.

- [ ] **Step 5: Correr (pasa)** — `npx vitest run src/app/features/sucursales/store/` y `ng test --include='**/empleado-form/**' --watch=false` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(empleados): error de guardar al toast (no banner inline)"`

---

## FASE C-BE — Backend: Address texto-libre (barrio/ciudad/provincia)

Rutas: `Backend/.../modules/sucursales/`.

### Task C-BE-1: Migración V961 (columnas texto-libre)

**Files:**
- Create: `Backend/src/main/resources/db/migration/V961__add_freetext_location_to_addresses.sql`

- [ ] **Step 1: Versión libre** — Run: `ls Backend/src/main/resources/db/migration/ | sort | tail -3`. Coordinar con Atención (V959) y Sucursales (V960) → usar la próxima libre (**V961**); si hay colisión con PR abierto, la siguiente.

- [ ] **Step 2: Migración**

`addresses.city_id` ya es nullable en la DB; agregamos 3 columnas texto-libre (sintaxis H2-MySQL compatible, statements separados):
```sql
-- Dirección texto-libre (alineada a la del paciente): barrio/ciudad/provincia.
-- city_id/neighborhood_id quedan legacy (los usa el wizard de sucursales).
ALTER TABLE addresses ADD COLUMN neighborhood VARCHAR(120) NULL;
ALTER TABLE addresses ADD COLUMN city VARCHAR(120) NULL;
ALTER TABLE addresses ADD COLUMN province VARCHAR(120) NULL;
```

- [ ] **Step 3: Commit** — `git commit -m "feat(sucursales): migracion V961 address texto-libre barrio/ciudad/provincia"`

### Task C-BE-2: Domain + entity + DTO + mapper

**Files:**
- Modify: `domain/model/geography/Address.java`
- Modify: `infrastructure/persistence/entity/AddressJpaEntity.java`
- Modify: `presentation/dto/request/AddressRequest.java`
- Modify: el mapper `AddressRequest`→`Address` y `Address`↔`AddressJpaEntity`

- [ ] **Step 1: Domain** — en `Address.java` agregar 3 campos:
```java
    private String neighborhood;
    private String city;
    private String province;
```

- [ ] **Step 2: JPA entity** — en `AddressJpaEntity.java`:
```java
    @Column(name = "neighborhood", length = 120)
    private String neighborhood;
    @Column(name = "city", length = 120)
    private String city;
    @Column(name = "province", length = 120)
    private String province;
```
(También cambiar `city_id` a `nullable = true` para alinear la entity con la DB real, evitando sorpresas.)

- [ ] **Step 3: AddressRequest** — agregar los 3 campos texto-libre (street pasa a opcional, como paciente):
```java
public record AddressRequest(
        String street,
        String streetNumber,
        String neighborhood,
        String city,
        String province,
        Long cityId,        // legacy (wizard sucursales)
        Long neighborhoodId // legacy
) {}
```
(Quitar `@NotBlank` de street: la dirección del empleado es opcional y, cuando se manda, calle puede venir sin ser obligatoria a nivel DTO; la validación de "hay dirección" la hace el caller.)

- [ ] **Step 4: Mappers** — mapear los 3 campos nuevos en `AddressRequest`→`Address` y `Address`↔`AddressJpaEntity` (ambas direcciones). Buscar el mapper que construye `Address` desde `AddressRequest` (en el create de empleado/branch/doctor) y propagar `neighborhood/city/province`.

- [ ] **Step 5: Compilar + boot MySQL** — `cd Backend && ./mvnw -q compile` y boot perfil `local` con V961 aplicada; verificar columnas en `addresses`.

- [ ] **Step 6: Commit** — `git commit -m "feat(sucursales): Address con barrio/ciudad/provincia texto-libre"`

---

## FASE C-FE — Frontend: stepper de empleado a 3 pasos + precarga usuario

Rutas: `src/app/features/sucursales/pages/empleado-form/`.

### Task C-FE-1: Colapsar a 3 pasos (Datos generales · Usuario · Resumen)

**Files:**
- Modify: `empleado-form/employee-form-steps.ts` (definición de pasos)
- Modify: `steps/datos-step/datos-step.component.ts` (+ `.html`) — expandir
- Delete: `steps/contactos-step/` y `steps/direccion-step/` (absorbidos)
- Modify: `empleado-form.page.ts` (form groups, submit, hydrate)
- Modify: `steps/resumen-step/resumen-step.component.ts` (reflejar nueva estructura)
- Modify: modelos `CreateEmployeeRequest` (address con campos nuevos)
- Test: specs de los steps + page

- [ ] **Step 1: Pasos** — en `employee-form-steps.ts` dejar 3:
```ts
export const EMPLOYEE_FORM_STEPS = [
  { key: 'datos',   title: 'Datos generales' },
  { key: 'usuario', title: 'Usuario' },
  { key: 'resumen', title: 'Resumen' },
] as const;
```

- [ ] **Step 2: Datos generales — agregar contacto + dirección**

En `datos-step.component.ts`, extender el form group con:
```ts
// contacto (2 campos fijos; ocultan los 6 tipos del back)
email: ['', [Validators.email]],
mobile: [''],            // se guarda como contacto MOBILE (celular)
// dirección (igual a paciente): grupo reusando pat-address-fields
address: this.fb.group({
  street: [''], streetNumber: [''], neighborhood: [''], city: [''], province: [''],
}),
```
En el `.html`, agregar secciones "Contacto" (Email, Celular) y "Dirección" (`<pat-address-fields [group]="addressGroup()" />`, importando `AddressFieldsComponent`). Sin subtítulos verbosos.

- [ ] **Step 3: Mapeo contactos email/celular ↔ EMployeeContact**

En `empleado-form.page.ts`, al construir los contactos a enviar:
- email no vacío → `{ contactType: 'EMAIL', value: email }`
- mobile no vacío → `{ contactType: 'MOBILE', value: mobile }`
En **edición**: precargar `email` desde el contacto EMAIL existente y `mobile` desde el MOBILE; al guardar, hacer upsert de esos 2 (crear/editar/eliminar según corresponda) sin tocar contactos de otros tipos preexistentes. Reusar la lógica de diff de contactos actual (`toCreate/toUpdate/toDelete`) acotada a EMAIL+MOBILE.

- [ ] **Step 4: Dirección en el request**

`CreateEmployeeRequest.address` pasa a `{ street, streetNumber, neighborhood, city, province }` (texto libre). Enviar el address solo si algún campo no está vacío. Actualizar el modelo TS y el `onSubmit`.

- [ ] **Step 5: Resumen** — actualizar `resumen-step` para mostrar email, celular y la dirección completa (Calle Número, Barrio, Ciudad, Provincia). Quitar la sección "Contactos" tipo lista.

- [ ] **Step 6: Borrar los steps absorbidos** — eliminar `contactos-step/` y `direccion-step/` y sus imports/usos.

- [ ] **Step 7: Tests** — `ng test --include='**/empleado-form/**' --watch=false`. Casos: 3 pasos; email→EMAIL, celular→MOBILE; dirección persiste los 5 campos; edición precarga email/celular. → PASS.

- [ ] **Step 8: Commit** — `git commit -m "feat(empleados): stepper a 3 pasos, email+celular fijos, direccion igual a paciente"`

### Task C-FE-2: Precarga del usuario nuevo

**Files:**
- Modify: `steps/usuario-step/usuario-step.component.ts`

- [ ] **Step 1: Test** — al seleccionar modo "Crear usuario nuevo", el form de usuario nace con `firstName/lastName/document` = los de Datos generales del empleado; `email` vacío. Si el operador edita un campo del usuario, no se pisa al cambiar Datos.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar** — el `usuario-step` recibe (input) los datos del empleado (firstName/lastName/document) desde la page. Al cambiar a modo "new", `patchValue({ firstName, lastName, document })` sólo en los controles `pristine` (no tocados). Email no se precarga. Usar un effect/computed sobre el input de datos del empleado.

- [ ] **Step 4: Correr (pasa)** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(empleados): precargar nombre/apellido/documento al crear usuario nuevo"`

---

## FASE D — Frontend: médicos derivantes → drawer quick-add repetible

Rutas: `src/app/features/medicos/`.

### Task D1: Drawer de alta rápida con "Guardar y agregar otro"

**Files:**
- Create: `features/medicos/pages/medicos-list/components/medico-form-drawer.component.ts`
- Modify: `features/medicos/pages/medicos-list/medicos-list.page.ts` (+ `.html`) — abrir el drawer en "Nuevo médico"
- Modify: `features/medicos/store/doctor.actions.ts` / `doctor.effects.ts` si hace falta exponer success por acción
- Test: `medico-form-drawer.component.spec.ts`, `medicos-list.page.spec.ts`

- [ ] **Step 1: Test del drawer**

- Renderiza campos esenciales: nombre, apellido, matrícula, tipo de registro, especialidad (opc), email (opc), teléfono (opc).
- "Guardar y agregar otro" → emite `create` con el `CreateDoctorRequest` y, al confirmarse el éxito, **limpia el form** y deja el drawer abierto.
- "Guardar" → emite `create` y cierra.
- "Cancelar" → cierra sin guardar.

- [ ] **Step 2: Correr (falla)** → FAIL.

- [ ] **Step 3: Implementar el drawer**

Copiar el patrón de `empresa/.../usuario-form-drawer.component.ts` (PrimeNG `p-drawer`, position="right", `ui-drawer-half`, modal). API:
```ts
@Input() visible = false;
@Input() saving = false;
@Output() create = new EventEmitter<CreateDoctorRequest>();
@Output() createAndNext = new EventEmitter<CreateDoctorRequest>();
@Output() cancel = new EventEmitter<void>();
```
Form reactivo con los campos esenciales (sin firma — la firma queda para la edición individual). Footer: "Cancelar" · "Guardar y agregar otro" · "Guardar". Reset del form en el handler de `createAndNext` tras éxito.

- [ ] **Step 4: Cablear en la lista**

En `medicos-list.page.ts`: "Nuevo médico" abre el drawer (signal `drawerOpen`). Manejar `create`/`createAndNext` despachando `addDoctor({ req })`. En éxito (`addDoctorSuccess`): refrescar la lista (ya se hace por el reducer/efecto), y si vino de `createAndNext`, mantener `drawerOpen=true` y limpiar; si de `create`, cerrar. Usar el `NotificationService` para éxito/error (consistente con PR-B).
La edición de médico: reusar el mismo drawer precargado (sin "agregar otro") o mantener la página de edición existente — **default: drawer precargado para editar**, navegación de edición vieja removible en un follow-up.

- [ ] **Step 5: Correr (pasa)** — `ng test --include='**/medicos/**' --watch=false` → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(medicos): drawer quick-add repetible (guardar y agregar otro)"`

---

## FASE E — Verificación final

### Task E1: Suites + smoke

- [ ] **Step 1: BE** — `cd Backend && ./mvnw -q test` (JDK 21) + boot MySQL con V961. El test de `countActiveBranchForTenant` verde.
- [ ] **Step 2: FE** — `ng test --watch=false` + `npx vitest run src/app/features/sucursales/ src/app/features/medicos/`.
- [ ] **Step 3: Smoke E2E manual** (`start-worktree.ps1`):
  - Crear empleado con usuario nuevo → **ya no 500**; el empleado y el usuario se crean.
  - Editar usuario (`PUT /user/{id}`) e invitar uno nuevo → no 500.
  - Forzar un error de guardar empleado → sale por **toast** (top-right), no banner.
  - Empleado: 3 pasos; email+celular; dirección con Barrio/Ciudad/Provincia que persiste; al crear usuario, precarga nombre/apellido/documento (email no).
  - Médicos: cargar 3 derivantes seguidos con "Guardar y agregar otro".
- [ ] **Step 4: PRs** — abrir los 5 PRs (2 BE, 3 FE) contra `development`, cada uno linkeando el Jira.

---

## Self-review (cobertura del spec)

- PR-A (fix 500 crear/invitar/editar) → A1. ✅
- PR-B (error → toast) → B1. ✅
- PR-C-BE (Address texto-libre + migración) → C-BE-1, C-BE-2. ✅
- PR-C-FE (3 pasos, email+celular, dirección, precarga usuario) → C-FE-1, C-FE-2. ✅
- PR-D (drawer médicos quick-add) → D1. ✅

Sin placeholders: código real en el query fix, migración, entity/DTO, effect del toast, drawer. Tipos consistentes: `countActiveBranchForTenant: long` + `>0` en ambos adapters; address con `neighborhood/city/province` (String) en domain/entity/DTO/mapper/migración/FE; contacto celular = `MOBILE` en mapeo y precarga.
