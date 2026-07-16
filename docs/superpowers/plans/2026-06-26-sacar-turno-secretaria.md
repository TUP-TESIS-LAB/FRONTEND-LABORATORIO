# Sacar turno desde el laboratorio (secretaria) — stepper gateado por TURNOS

> **Jira:** [KAN-138](https://exequielsantoro.atlassian.net/browse/KAN-138)
> **Repo:** FRONTEND-LABORATORIO (Angular 21). Backend: sin cambios.
> **Fecha:** 2026-06-26

## Motivación

Cuando un tenant tiene el módulo **TURNOS activo** (caso típico: laboratorios **sin PORTAL**), los
pacientes no tienen forma de auto-agendarse. La secretaria necesita una pantalla **del lado del lab**
para **sacar un turno en nombre del paciente**. El flujo es casi idéntico al stepper "sacar turno" del
portal, adaptado a que **siempre lo opera la secretaria** (no el paciente logueado).

**Hallazgo de exploración:** el backend ya autoriza a `SECRETARIA` / `RESPONSABLE_SECRETARIA` /
`ADMINISTRADOR` en todos los endpoints necesarios → **esta feature es 100% frontend en el lab.**

## Decisiones de producto (confirmadas con el user)

1. **Gating:** la pantalla se habilita **siempre que el módulo TURNOS esté activo** (sin importar si
   PORTAL está activo o no). Gate simple: `moduleActiveGuard(ModuleKey.Turnos)` + nav item con
   `moduleKey: ModuleKey.Turnos`.
2. **Selección de paciente:** la secretaria **busca un paciente existente** (autocomplete por DNI/nombre)
   y, si no aparece, puede **darlo de alta rápido inline** (datos mínimos) sin salir del flujo.
3. **Sucursal:** default a la **sucursal activa del staff** (branch context), con **selector** para
   elegir otra sucursal accesible.

## Endpoints backend (ya existentes, sin cambios)

| Uso | Endpoint | Roles |
|-----|----------|-------|
| Buscar paciente | `GET /api/v1/analitica/patients/search?q=&state=active&page=&size=` | autenticado |
| Existe por DNI | `GET /api/v1/analitica/patients/exists?dni=` | autenticado |
| Alta rápida paciente | `POST /api/v1/analitica/patients` | ADMINISTRADOR, SECRETARIA |
| Catálogo tipos análisis | `GET /api/v1/turnos/catalog/tipos-analisis` | autenticado _(verificar en tasks)_ |
| Listar sucursales | `GET /api/v1/sucursales` | autenticado |
| Slots disponibles | `GET /api/v1/turnos/availability?branchId=&date=` | ADMIN/SECRETARIA/EXTERNO |
| Crear turno | `POST /api/v1/turnos/appointments` | ADMIN/SECRETARIA/EXTERNO |

**Payload de creación** (igual al portal):
```jsonc
{
  "patientId": 42,
  "branchId": 5,
  "scheduledAt": "2026-06-30T09:00:00",
  "determinations": [ { "determinationId": 100, "orderNumber": 1 } ],
  "comments": null,
  "prescriptionFileUrl": null
}
```

## Pasos del stepper

A diferencia del portal (paso "¿para quién?" sobre el grupo familiar), el paso 1 es búsqueda/alta de
paciente sobre toda la base del lab.

1. **Paciente** — `PatientSearchAutocompleteComponent` (ya existe, busca por DNI/nombre).
   Si no aparece → CTA "Dar de alta" abre un sub-form mínimo (DNI, nombre, apellido, fecha nac., sexo)
   que hace `POST /analitica/patients` y deja al paciente nuevo seleccionado. Reusar el form/alta de
   pacientes existente (`features/pacientes`), versión reducida.
2. **Tipo de análisis** — grid de selección múltiple desde `GET /turnos/catalog/tipos-analisis`.
   (Portar el `analysis-card-grid` del portal; no existe en el lab.)
3. **Sucursal** — pre-seleccionada con la sucursal activa del staff; `p-select` con el resto de las
   sucursales accesibles (`GET /sucursales`). Si tiene una sola, se muestra fija sin selector.
4. **Fecha y hora** — date picker + slots de `GET /turnos/availability`. (Portar el `slot-picker` del
   portal; no existe en el lab.)
5. **Confirmar** — resumen de paciente + análisis + sede + fecha/hora → `POST /turnos/appointments`.
   Éxito: toast + navegar a la agenda (`/turnos/agenda`) donde el turno ya aparece.

## Arquitectura en el lab

- **Feature nueva:** `src/app/features/turnos/pages/sacar-turno/` (o `nuevo-turno/`), dentro del feature
  turnos existente. Reusa el shell admin y el `form-stepper-header`.
- **Ruta:** agregar a `turnos.routes.ts` → `{ path: 'sacar', canMatch: [moduleActiveGuard(ModuleKey.Turnos)], ... }`.
- **Nav:** item en `sidebar.nav.ts` bajo la sección "Recepción" con `moduleKey: ModuleKey.Turnos`
  (sectionKey a definir; reusar RECEPCION o crear una sección de turnos).
- **Store NgRx (obligatorio por CLAUDE.md):** slice `sacar-turno` que cubra: cargar catálogo de tipos,
  cargar sucursales, buscar/crear paciente, cargar slots, crear turno. Componente despacha actions;
  effects llaman a los services; selectors con `selectSignal`. Logging meta-reducer + router-store según
  `ngrx-backend-request`.
- **Componentes a portar del portal** (no existen en el lab): grid de selección de análisis y slot-picker.
  Se adaptan al design system del lab (`laboratory-ui`).

## Fuera de alcance

- **Listado / gestión de turnos sacados:** ya lo cubre `/turnos/agenda` (panel de agendas) — el turno
  creado aparece ahí. No se construye una lista nueva.
- **Backend:** sin cambios (todos los endpoints ya autorizan a la secretaria).
- **Reprogramar / cancelar desde esta pantalla:** fuera de alcance (existe en la agenda/recepción).

## Verificación

- `ng build` del lab en verde.
- Tests: reducer/effects/selectors del slice + smoke de la página.
- Smoke e2e manual: login secretaria → sacar turno (paciente existente y paciente nuevo) → verificar que
  aparece en la agenda y que el `POST /turnos/appointments` responde 201.

## Riesgos / a validar en tasks

- Confirmar rol de `GET /turnos/catalog/tipos-analisis` (si no fuera accesible a SECRETARIA, sería el
  único toque de backend — ampliar `@PreAuthorize`).
- Mapeo tipo de análisis → `determinationId[]` (el portal lo resuelve desde el catálogo; replicar).
- `scheduledAt` en hora local sin TZ (formato `YYYY-MM-DDTHH:mm:ss`), igual que el portal.
