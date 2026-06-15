# Médicos / Empleados — Pulido + fixes (500 user/internal, toast)

> **Estado:** Diseño aprobado (2026-06-14).
> **Rama:** `feat/medicos-empleados-pulido` (worktree `.worktrees/medicos-empleados`, off `development`).
> **Alcance:** Cross-stack. Incluye 2 bugs confirmados + refactor de empleados + drawer de médicos.
> **Jira:** _(pendiente)_

## Recomendación de PRs (4)

Este sub-proyecto agrupa cosas independientes. Sugiero **4 PRs** para no bloquear:
1. **PR-A (urgente, chico):** Fix del 500 en alta/edición de usuario interno (backend). Bloqueante hoy.
2. **PR-B (chico, FE):** Error de guardar empleado → toast en vez de banner inline.
3. **PR-C (mediano, cross-stack):** Refactor del stepper de empleados (colapsar pasos, email+celular fijos, dirección completa) + precarga de usuario.
4. **PR-D (mediano, FE):** Médicos derivantes → drawer quick-add repetible.

---

## PR-A — Fix del 500: `existsActiveBranchForTenant` (BUG CONFIRMADO)

### Causa raíz (confirmada con evidencia)
`POST /api/v1/user/internal` (alta de usuario interno, usado por el flujo "crear empleado con usuario nuevo") devuelve **500 genérico**. La edición de usuario tiene el mismo bug.

El método [`UserBranchJpaRepository.existsActiveBranchForTenant`](Backend/src/main/java/lab/laboratorio/modules/empresa/infrastructure/persistence/repository/UserBranchJpaRepository.java#L41) define un native query con retorno **`boolean`**:
```sql
SELECT CASE WHEN COUNT(b.id) > 0 THEN TRUE ELSE FALSE END FROM branches b
WHERE b.id = :branchId AND b.tenant_id = :tenantId AND b.active = TRUE
```
El SQL corre OK (devuelve 0/1), pero **Hibernate no puede mapear ese escalar al `boolean` primitivo** → excepción no mapeada → catch-all `@ExceptionHandler(Exception.class)` → 500 genérico. Rompe `branchBelongsToTenant`, usado por `RegisterInternalUserUseCase` y `UpdateUserUseCase`.

**Evidencia (no hipótesis):**
- `general_log` de MySQL: corren los 3 checks de duplicados + el branch check → ROLLBACK inmediato, sin INSERT ni query de roles.
- Reproducciones controladas: con `roleIds:[]` y `sections:[]` → 500 igual (descarta roles/sections); con branch inexistente (`999999`) y branch de otro tenant (`1`) → **500, no el 422** esperado de `UserBranchNotFoundException`. Como no da el 422 mapeado, el método **lanza en vez de retornar** — y lo único que puede tirar ahí es el mapeo del native query (`User` es un `record` plano).
- **Por qué pasó CI:** los tests de ese flujo mockean `branchBelongsToTenant`; el native query nunca se ejecuta contra una DB. Se introdujo en el commit `21a5254` y nunca corrió contra MySQL.

### Fix
Cambiar el query para que devuelva un tipo que Hibernate mapea siempre (`COUNT → long`) y comparar en Java:
```java
@Query(value =
    "SELECT COUNT(b.id) FROM branches b " +
    "WHERE b.id = :branchId AND b.tenant_id = :tenantId AND b.active = TRUE",
    nativeQuery = true)
long countActiveBranchForTenant(@Param("branchId") Long branchId, @Param("tenantId") Long tenantId);
```
Renombrar el método y actualizar los 2 call sites (`UserBranchAssignmentAdapter:64`, `UserBranchAccessAdapter:56`) a `... > 0`.

### Test (clave: el bug existe porque no había test de integración)
Agregar un test de **repositorio contra DB real** (Testcontainers MySQL, no H2 — H2 podría mapear el boolean y ocultar el bug) que ejecute `countActiveBranchForTenant` y verifique que devuelve el conteo correcto sin lanzar. Como mínimo, un `@DataJpaTest` que ejercite el query. Verificación manual: re-correr el curl de alta de usuario → ya no 500.

---

## PR-B — Error de guardar empleado → toast (no inline)

### Estado actual
[`empleado-form.page.ts:307-317`](FRONTEND-LABORATORIO/.worktrees/medicos-empleados/src/app/features/sucursales/pages/empleado-form/empleado-form.page.ts#L307) computa `saveErrorMessage(err)` y lo muestra en un **banner inline** (cartel rojo arriba del resumen). Los toasts de éxito salen por `NotificationService` en el `notification-host` (**arriba a la derecha**).

### Fix
Rutear el error de guardar al **mismo toast** que los de éxito: en vez de setear el signal del banner inline, llamar `NotificationService.error(saveErrorMessage(err))`. Quitar el banner inline (o dejarlo solo para errores de validación de formulario, no de backend). Mantener la posición actual (top-right) — el pedido es consistencia con los de éxito, no mover el host.
- `NotificationService` (`core/services/notification.service.ts`): métodos `success(summary, detail?)`, `error(summary, detail?)`.
- Aplica al alta Y edición de empleado. Idealmente también a médicos (mismo patrón inline hoy).

---

## PR-C — Refactor del stepper de empleados

### Estado actual (5 pasos)
Datos · Contactos (FormArray, 6 tipos) · Dirección (solo Calle+Número) · Usuario · Resumen.

### Target (3 pasos)
**Datos generales · Usuario · Resumen.** Contactos y Dirección se absorben en "Datos generales".

1. **Contactos → 2 campos fijos en Datos generales.** Ocultar la complejidad del back (6 tipos): exponer solo **Email** y **Celular**. Mapeo:
   - Email → `EmployeeContact { contactType: EMAIL }`.
   - Celular → `EmployeeContact { contactType: MOBILE }`.
   - En edición: precargar email/celular desde los contactos EMAIL/MOBILE existentes; al guardar, upsert de esos 2 (y no tocar otros tipos si existieran de antes). Eliminar el paso Contactos y su `contactos-step`.

2. **Dirección → en Datos generales, igual a paciente.** Reusar el componente `pat-address-fields` (Calle, Número, Barrio, Ciudad, Provincia — texto libre). Eliminar el `direccion-step`.
   - **Backend:** extender el value object `Address` (geography, tabla `addresses`, join `address_id` en empleados) con columnas texto-libre `neighborhood`, `city`, `province`. Migración Flyway (próxima libre — coordinar con Atención V959 / Sucursales V960 → probablemente **V961**). `AddressRequest` pasa a aceptar esos campos (street opcional, como paciente). `cityId`/`neighborhoodId` quedan como legacy nullable (deuda explícita ya existente) — no se usan desde el FE.
   - El mismo cambio de Address beneficia a médicos (comparten el value object) — su dirección puede alinearse después.

3. **Layout:** "Datos generales" agrupa: identidad (nombre, apellido, documento, matrícula, es bioquímico), contacto (email, celular) y dirección (5 campos). Secciones visuales dentro del paso, sin subtítulos verbosos (alineado al estándar de [[ui-estandar-stepper-tabla]]).

### Usuario — precarga al crear nuevo
En el paso Usuario, modo "Crear usuario nuevo": **precargar** `firstName`, `lastName`, `document` desde los Datos generales del empleado. **NO** precargar email (el del usuario puede ser otro). Mantener `username`, `roleId`, `branchId`, secciones como están. Si el usuario edita los datos del empleado, re-sincronizar la precarga solo si el campo del usuario no fue tocado manualmente.

---

## PR-D — Médicos derivantes → drawer quick-add repetible

### Estado actual
Médicos = página full con stepper de 4 pasos (Datos, Contacto, Firma, Resumen). Single-add; navega a `/medicos/nuevo`.

### Target
Drawer de **quick-add repetible** (reusar el patrón de [`usuario-form-drawer.component.ts`](FRONTEND-LABORATORIO/.worktrees/medicos-empleados/src/app/features/empresa/pages/usuarios/components/usuario-form-drawer.component.ts), PrimeNG `p-drawer`):
- Se abre desde la lista de médicos con "Nuevo médico".
- Campos esenciales: nombre, apellido, matrícula, tipo de registro, y opcionales especialidad / email / teléfono.
- **"Guardar y agregar otro":** persiste el médico (POST individual) y **limpia el form** dejando el drawer abierto para cargar el siguiente. Botón normal "Guardar" persiste y cierra. Así se cargan muchos derivantes rápido.
- **Firma:** fuera del quick-add (la firma del derivante no es necesaria al alta rápida). Editar la firma queda para la edición individual del médico (mantener el flujo existente para editar, o un paso/campo aparte). Confirmar si la edición sigue siendo página o también drawer (default: edición reusa el mismo drawer precargado, sin "agregar otro").
- La lista se refresca tras cada persistencia (la fila aparece arriba).
- Errores → toast (consistente con PR-B).

---

## Testing

- **BE:** suite + el nuevo test de repositorio del branch count (Testcontainers MySQL). Migración de Address: boot MySQL real + verificar columnas. Tests de empleado contact upsert (email/celular) y de precarga.
- **FE:** `ng test` (steps de empleado, drawer de médicos, address-fields reuse) + `npx vitest` (stores empleado/médico). Casos: 3 pasos del empleado, email+celular mapean a EMAIL/MOBILE, dirección persiste los 5 campos, precarga usuario (nombre/apellido/doc, no email), error → toast, drawer "guardar y agregar otro".
- **Smoke E2E:** alta de empleado con usuario nuevo (que el 500 ya no ocurra), carga de varios médicos por el drawer.

## Orden sugerido

PR-A (fix 500) primero — desbloquea. Luego PR-B (toast), PR-C (refactor empleado), PR-D (drawer médicos). PR-C y PR-D son independientes y paralelizables.

## Fuera de scope

Atención, Sucursales, Genérico (ya con spec+plan), Extracción, Obras Sociales/Liquidaciones.
