# Spec — ABM de Empleados y Médicos derivantes (Frontend Laboratorio)

> **Fecha:** 2026-05-30
> **Rama:** `feat/abm-empleados-medicos` (worktree `.worktrees/empleados-medicos`, base `origin/development`)
> **Estado:** Diseño aprobado — pendiente de plan + ticket Jira antes de implementar
> **Jira:** _(pendiente — se crea tras `writing-plans`, regla #1 del CLAUDE.md)_

---

## 1. Contexto y objetivo

El SaaS de laboratorio ya gestiona **usuarios de login** desde *Empresa › Usuarios* (UI funcional). Faltan dos pantallas de gestión cuyo **backend ya está 100% implementado**:

- **Empleados** (personal del laboratorio): backend en `modules/sucursales`, endpoints `/api/v1/sucursales/employees` (+ `/{id}/status`, `/{id}/contacts`). Sin UI.
- **Médicos derivantes** (médicos solicitantes externos): backend en `modules/sucursales`, endpoints `/api/v1/sucursales/doctors`. Solo existe un placeholder de UI (`/medicos`, "en construcción").

**Objetivo:** construir el ABM (alta/baja/modificación + listado) de ambas entidades en el frontend, con el **alta y edición como stepper full-page** con el mismo estilo que el de pacientes.

## 2. Alcance

**Dentro:**
- Componente genérico de stepper-header en `shared/` (reutilizable).
- Empleados: shell de tabs en Sucursales + lista + stepper (Datos / Contactos / Resumen) + store NgRx.
- Médicos: lista + stepper (Datos / Resumen) + store NgRx, llenando el módulo `/medicos`.
- Manejo de errores en español sin leak; tests; sin polling.

**Fuera (out of scope):**
- Cualquier cambio de **backend** (los 3 CRUD ya existen y alcanzan).
- **Sucursal del empleado** (filtrar/mostrar empleados por sucursal): el backend de `Employee`
  **no tiene `branchId`** (ni tabla, ni DTO, ni filtro). Se **difiere** (ver §10): ticket de
  backend aparte para agregar `branchId` + filtro, y una 2da iteración de frontend que lo
  consuma. En esta entrega el listado de empleados **no** muestra ni filtra por sucursal.
- Vincular empleado ↔ cuenta de login (`userId`). Empleado es **catálogo aparte**.
- Refactor de la duplicación pre-existente de stores de Sucursales (`sucursal.*` vs `sucursales.*`).
- Migrar la feature `pacientes` al stepper-header genérico (lo trabaja otro agente; se deja como follow-up).
- ABM de roles/permisos; gestión de usuarios (ya existe).

## 3. Decisiones tomadas (con el usuario)

| Decisión | Resolución |
|---|---|
| Ubicación Empleados | Nueva **tab dentro de Sucursales** (shell de tabs estilo Empresa) |
| Ubicación Médicos | Se queda en `/medicos` (Servicios clínicos), detrás de `moduleActiveGuard(ModuleKey.Medicos)` |
| Empleado ↔ login | **Catálogo aparte**, sin tocar `userId` |
| Alcance Empleados | ABM **+ contactos** (sub-CRUD) |
| Forma del alta/edición | **Stepper full-page** estilo pacientes (no drawer/modal) |
| Reutilización del stepper | **Componente genérico nuevo en `shared/`**, sin tocar `pacientes` (evita conflicto con `feat/patient-form-stepper-impl`) |
| Empleados vs Médicos | Dos features separadas (consistencia > DRY prematuro), compartiendo solo el stepper-header |
| Sucursal del empleado | **Diferida** — el backend no la soporta hoy; ticket de backend aparte para `branchId` + filtro, consumido en una 2da iteración (ver §10) |

## 4. Diseño

### 4.1 Componente genérico — stepper-header (shared)

Se crea `shared/ui/components/form-stepper-header/`, copiando el look & feel de
`features/pacientes/.../form-stepper-header` pero con un tipo de paso genérico.

```ts
// shared/ui/models/form-step.ts
export interface FormStep {
  key: string;
  title: string;
  subtitle?: string;
}

// shared/ui/components/form-stepper-header/form-stepper-header.component.ts
@Component({
  selector: 'ui-form-stepper-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // mismo template + styles que el de pacientes (círculos numerados, conectores,
  // estados is-current / is-done / is-locked / is-clickable, navegación por
  // teclado enter/space, aria-label "Paso N de M: <title> (<estado>)").
})
export class FormStepperHeaderComponent {
  readonly steps = input.required<readonly FormStep[]>();
  readonly currentIndex = input.required<number>();
  readonly visited = input.required<ReadonlySet<number>>();
  readonly stepSelected = output<number>();

  readonly isDone = (i: number) => this.visited().has(i) && i !== this.currentIndex();
  readonly isLocked = (i: number) => !this.visited().has(i) && i !== this.currentIndex();
  readonly isClickable = (i: number) => i !== this.currentIndex() && this.visited().has(i);
  // onClick / onKey / ariaLabelFor idénticos al de pacientes
}
```

**Por qué duplicar el estilo en vez de extraer el de pacientes:** la feature `pacientes`
está siendo modificada por otro agente (`feat/patient-form-stepper-impl`). Mover/editar
sus archivos generaría conflictos de merge. Aceptamos una duplicación temporal del CSS a
cambio de aislamiento. Follow-up opcional: migrar pacientes a `ui-form-stepper-header`.

### 4.2 Patrón "página stepper" (común a Empleados y Médicos)

Cada stepper full-page replica la estructura de `PatientFormPage`:

- **Layout:** `<form>` flex-column, `header` sticky (Volver + título + breadcrumb),
  `<ui-form-stepper-header>`, cuerpo scrolleable con `@switch (currentStep())`,
  `footer` sticky (estado del form + atajos `Ctrl+S`/`Esc` + botones
  Cancelar / ← Atrás / Continuar → / Registrar).
- **Estado:** `FormGroup` con un sub-group por paso; signals `currentStep` y
  `visited: ReadonlySet<number>`; `goNext()`, `goBack()`, `goToStep(i)`.
- **Validación de avance:** `canContinue()` valida el paso actual antes de avanzar;
  `canSubmit()` solo habilita el submit en el último paso (alta) o en cualquier paso (edición).
- **Submit:** despacha la action de NgRx; al `...Success` navega de vuelta a la lista.
- **Edición:** misma página, hidratada; todos los pasos quedan `visited` (clickeables).
- **Atajos:** `Ctrl+S` = submit, `Esc` = volver (con confirm si el form está dirty).
- **Errores:** `humanizeBackendError` (español, sin leak, mapeo por status).

### 4.3 Feature Empleados

**Routing** (`features/sucursales/sucursales.routes.ts`):
```
/sucursales
 ├─ ''  → SucursalesShellComponent (shell con tabs)
 │        ├─ 'sucursales' → SucursalesConfiguracionComponent  (CRUD de sedes actual, reusado)
 │        └─ 'empleados'  → EmpleadosListPage                  (tabla + botón "Nuevo")
 ├─ 'empleados/nuevo'       → EmpleadoFormPage  (stepper full-page, FUERA del shell)
 └─ 'empleados/:id/editar'  → EmpleadoFormPage  (stepper full-page, FUERA del shell)
```
- `SucursalesShellComponent`: promueve el placeholder `sucursales-dashboard`. Header
  "Sucursales" + nav de tabs (`Sucursales` | `Empleados`) + `<router-outlet>`. Estilo
  idéntico a `EmpresaDashboardComponent`.
- Sidebar (`sidebar.nav.ts`): el item "Sucursales" pasa a apuntar a `/sucursales`
  (hoy `/sucursales/configuracion`). Mantiene `roleKey: 'ADMINISTRADOR'`.
- Gating: rutas de empleados protegidas con `roleGuard('ADMINISTRADOR')` (igual que sedes).
- **Listado (tabla):** columnas Nombre · Documento · Matrícula · Bioquímico (tag) · Estado ·
  Acciones. **Sin** columna ni filtro de **sucursal** en esta iteración — el backend no
  expone ese dato todavía (ver §2 y §10). Botón "Nuevo" que navega al stepper.

**Pasos del stepper de Empleados:**
1. **Datos** — `firstName`, `lastName`, `document`, `registration` (matrícula, opcional),
   `isBiochemist` (toggle). Validaciones: nombre/apellido/documento requeridos.
2. **Contactos** — lista editable de contactos (`contactType` PHONE/EMAIL + `contactValue`).
   Paso opcional (se puede dejar vacío).
3. **Resumen** — vista de solo-lectura de Datos + Contactos, con botón "editar" por sección.

**Store NgRx** (`features/sucursales/store/employees.*` o sub-feature `employees`):
- Actions: `loadEmployees`, `loadEmployee`, `addEmployee(+Success/Failure)`,
  `updateEmployee(+...)`, `toggleEmployeeStatus(+...)`, y contactos:
  `addEmployeeContact`, `updateEmployeeContact`, `removeEmployeeContact`.
- Effects: pesimistas. **Orquestación de alta con contactos:** el effect de
  `addEmployee` crea el empleado y, con el `id` devuelto, postea cada contacto a
  `/employees/{id}/contacts` (secuencial); recién entonces emite `addEmployeeSuccess`.
  En edición, los contactos se gestionan contra el `id` existente.
- Selectors con `selectSignal`; sin `@ngrx/entity`.
- `EmployeesService`: HTTP contra `/api/v1/sucursales/employees`.

### 4.4 Feature Médicos derivantes

**Routing** (`features/medicos/medicos.routes.ts`):
```
/medicos
 ├─ ''            → MedicosListPage      (tabla + botón "Nuevo")
 ├─ 'nuevo'       → MedicoFormPage       (stepper full-page)
 └─ ':id/editar'  → MedicoFormPage       (stepper full-page)
```
- Reemplaza el placeholder `MedicosDashboardComponent`.
- Sigue detrás de `moduleActiveGuard(ModuleKey.Medicos)`. El chip "Beta" del sidebar se
  mantiene hasta validar (decisión menor, ajustable).

**Pasos del stepper de Médicos:**
1. **Datos** — `firstName`, `lastName`, `tuition` (matrícula), `registrationType`
   (NACIONAL | PROVINCIAL). Validaciones: nombre/apellido/matrícula requeridos.
2. **Resumen** — vista de solo-lectura, con botón "editar".

> Son 2 pasos porque el backend de `Doctor` es un catálogo simple sin contactos.

**Store NgRx** (`features/medicos/store/doctors.*`):
- Actions: `loadDoctors`, `loadDoctor`, `addDoctor(+...)`, `updateDoctor(+...)`,
  `toggleDoctorStatus(+...)`, `deleteDoctor(+...)`.
- Effects pesimistas; selectors con `selectSignal`; `DoctorsService` contra
  `/api/v1/sucursales/doctors`.

## 5. Paso a paso para construir un stepper por entidad (receta)

Una vez creado `ui-form-stepper-header`, para CADA entidad (empleados, médicos):

1. **Modelo + service** — `models/<entidad>.model.ts` (interface + Create/Update request) y
   `services/<entidad>.service.ts` (HTTP a su endpoint).
2. **Store NgRx** (ngrx-backend-request) — `actions` / `effects` / `reducer` /
   `selectors` / `state`. Mutaciones pesimistas; registrar la feature en sus rutas con
   `provideState` + `provideEffects`.
3. **Definición de pasos** — `<entidad>-form-steps.ts` exportando `FormStep[]`
   (key/title/subtitle de cada paso).
4. **Componentes de paso** — `pages/<entidad>-form/steps/<paso>-step/…` (uno por paso:
   datos, contactos si aplica, resumen). Cada uno recibe su `FormGroup`/`FormArray` por `input`.
5. **Página stepper** — `pages/<entidad>-form/<entidad>-form.page.ts` siguiendo §4.2:
   header + `<ui-form-stepper-header>` + `@switch(currentStep())` + footer; `currentStep`/
   `visited`; `goNext`/`goBack`/`goToStep`; `canContinue`/`canSubmit`; submit → action;
   navegación al `...Success`; hidratación en edición; `humanizeBackendError`.
6. **Lista** — `pages/<entidad>-list/…`: tabla PrimeNG (columnas + estado + acciones
   editar/activar-desactivar) y botón "Nuevo" que navega al stepper.
7. **Routing** — lista + `nuevo` + `:id/editar` (los dos últimos full-page, fuera de
   cualquier shell de tabs).
8. **Tests** — `<entidad>-form-steps.spec`, smoke de la página stepper, reducer/effects/
   selectors, y guard si aplica.

**Empleados** usa la receta con pasos `[Datos, Contactos, Resumen]` + la orquestación de
contactos en el effect de alta. **Médicos** usa `[Datos, Resumen]`.

## 6. Transversal

- **UI:** PrimeNG + Tailwind, `OnPush`, signals para estado local (laboratory-ui /
  angular-conventions). Iconos PrimeIcons (no emojis Unicode).
- **Errores (regla #4):** todo `HttpErrorResponse` pasa por `humanizeBackendError`;
  mensajes en español, de dominio, sin FQCN/stack/SQL. Mapeos por status (409 duplicado de
  documento/matrícula, 400/422 datos inválidos, 500 genérico).
- **Sin polling:** son ABM normales; no se usa `createPollingEffect`.
- **Tests (regla del repo):** obligatorios para reducers, effects, selectors, guards;
  smoke de páginas.

## 7. Componentes / unidades (boundaries testeables)

| Unidad | Qué hace | Depende de |
|---|---|---|
| `ui-form-stepper-header` (shared) | render del header de pasos + navegación | inputs/outputs |
| `SucursalesShellComponent` | navegación entre tabs de Sucursales | router |
| `EmpleadosListPage` + store `employees` | listado + acciones | `EmployeesService` |
| `EmpleadoFormPage` (stepper) | alta/edición multi-paso | store `employees` |
| `MedicosListPage` + store `doctors` | listado + acciones | `DoctorsService` |
| `MedicoFormPage` (stepper) | alta/edición multi-paso | store `doctors` |

## 8. Riesgos y mitigaciones

- **Conflicto con el agente del stepper de pacientes** → no tocamos `pacientes`; creamos
  el genérico en `shared`.
- **Duplicación de stores en Sucursales** → el shell reusa la pantalla CRUD ya en uso; no
  se refactoriza el resto (deuda anotada).
- **Módulo Médicos desactivado por tenant** → para verlo/probarlo hay que tener
  `ModuleKey.Medicos` activo en el tenant de dev.
- **Alta de empleado con contactos no atómica** (dos llamadas) → la orquestación vive en el
  effect; si falla el POST de contactos tras crear el empleado, se informa el error sin
  perder el empleado creado (el usuario puede completar contactos en edición).

## 9. Próximos pasos

1. Revisión de este spec por el usuario.
2. `superpowers:writing-plans` → plan implementable.
3. `jira-workflow` → ticket Jira (regla #1), linkeado al plan.
4. Implementación (empezando por `ui-form-stepper-header`), con tests, contra
   `feat/abm-empleados-medicos`.

## 10. Follow-ups diferidos

### 10.1 Sucursal del empleado (cambio de backend) — ticket aparte
El requerimiento "listar empleados filtrados por sucursal / mostrar en qué sucursal trabaja"
necesita backend, que hoy no existe. Se difiere a un cambio independiente en el repo
**Backend** (con su propio flujo SDD + ticket Jira + worktree):

- **Migración Flyway:** agregar `branch_id BIGINT` a la tabla `employees` (FK a `branches`,
  nullable para no romper filas existentes) + índice `(tenant_id, branch_id)`.
- **Dominio/DTO:** sumar `branchId` a `Employee`, `EmployeeJpaEntity`, `CreateEmployeeRequest`,
  `UpdateEmployeeRequest`, `EmployeeResponse` y mappers/use cases.
- **Filtro de listado:** `GET /api/v1/sucursales/employees?branchId=` (param opcional).
- **Modelo:** 1 sucursal por empleado (consistente con `User.branch`). Si se necesita
  multi-sucursal, sería tabla `employee_branches` (M:N) — fuera de este follow-up.

**2da iteración de frontend (este repo, después del backend):** selector de sucursal en el
listado de empleados, columna "Sucursal" en la tabla, y campo "Sucursal" en el paso *Datos*
del stepper.

### 10.2 Migrar `pacientes` al `ui-form-stepper-header` compartido (opcional)
Cuando el trabajo de `feat/patient-form-stepper-impl` esté mergeado, reemplazar el
`pat-form-stepper-header` por el genérico de `shared` para eliminar la duplicación.
