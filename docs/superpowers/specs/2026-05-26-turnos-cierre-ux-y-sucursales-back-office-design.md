# Cierre UX de TURNOS + back-office de SUCURSALES — Design Spec

> **Fecha:** 2026-05-26
> **Repos afectados:** `Backend/`, `FRONTEND-LABORATORIO/`, `FRONTEND-PORTAL/`
> **Branches base:** `development` (los 3 repos, post-fetch al 2026-05-26)
> **Jira:** TBD (se crea durante `writing-plans` siguiendo la regla inviolable de `Backend/CLAUDE.md`)

---

## 1. Resumen ejecutivo

Cerrar los pendientes UX de TURNOS surgidos de los smokes A/B/C (ver `FRONTEND-PORTAL/docs/superpowers/specs/2026-05-22-turnos-spec-c-pr-drafts.md` §"Hallazgos del smoke A" / §"Hallazgos del smoke B" / §"UX polish pendiente") y construir el **back-office de sucursales** que hoy expone solo un form modal de 4 campos pese a que el backend ya soporta el modelo completo (`BranchSchedule`, `BranchContact`, `BranchWorkspace`, `BranchTotemConfig`, `Area`, `Section`).

El arco entrega **3 PRs** (4 si entra backend opcional):

| # | Repo | Rama | PR |
|---|---|---|---|
| 1 | FRONTEND-LABORATORIO | `feat/sucursales-back-office` | LAB / Sucursales — info completa + sub-recursos |
| 2 | FRONTEND-LABORATORIO | `feat/turnos-ux-lab` | LAB / Turnos UX — wizard, sidebar, TV, tótem |
| 3 | FRONTEND-PORTAL | `feat/turnos-ux-polish` | Portal / Turnos UX — family card, register, sticky |
| 4 (opcional) | Backend | `feat/branch-public-fields` | Backend / Branch público — telefono + horario |

---

## 2. Estado de partida (al 2026-05-26)

**Develop ya tiene**:
- Backend: `feat/turnos-combined` mergeado (vía PR #18) + `migrate-analytical-mng` (#20, #22) + `e2e-whitelabel` (#24). Endpoints completos para `Branch`, `Area`, `Section`, `BranchSchedule`, `BranchContact`, `BranchWorkspace`, `BranchTotemConfig`, `Doctor`, `Employee`, `Geography`.
- LAB: `feat/turnos-specs` (#15) + `feat/atencion-module` (#11) + `feat/patient-form-stepper-impl` (#14). Existe CRUD básico de sucursales (form modal 4 campos), tótem kiosk, recepción con-tótem/sin-tótem (split por `BranchTotemConfig.enabled`), pantalla de display TV, módulo Atención clínico (analitica/atencion-dashboard + wizard).
- Portal: `feat/turnos-spec-c` (#8). Spec C completo: login/register externo, listado/cancelación de turnos, wizard sacar-turno.

**Develop NO tiene** (entrega este arco):
- Sucursales back-office con sub-recursos completos.
- Toggle de tótem expuesto en UI.
- Wizard de agendas rediseñado al patrón del portal.
- Sidebar entry para `/turnos/configuracion`.
- TV display con layout 70/30 (cola/publicidad mockup) + fondo claro + overlay para desbloquear audio.
- Tótem con numpad on-screen (input táctil de DNI).
- Portal: family card minimal, register split, sticky footer refine, cableo `Sede.telefono`/`.horario`.

---

## 3. Arquitectura global

```
┌─ Backend (rama 4, opcional) ────────────────────────────┐
│ BranchPublicController                                  │
│   GET /api/v1/sucursales/public?slug=X                 │
│   → response extendido con: phone, schedules            │
└─────────────────────────────────────────────────────────┘
                            ↑
                            │
┌─ FRONTEND-LABORATORIO ──────────────────────────────────┐
│ Rama 1 — Sucursales back-office                         │
│   /sucursales/configuracion                             │
│     ├ tabla (lista)                                     │
│     ├ /nueva       → SucursalAltaStepperComponent       │
│     │   (6 steps: Datos / Horarios / Contactos /        │
│     │    Workspaces / Tótem / Confirmar — Áreas y       │
│     │    Secciones gestionadas en página aparte)        │
│     └ /:id         → SucursalDetalleComponent (tabs)    │
│   /sucursales/catalogo (mini-CRUD Áreas + Secciones)    │
│                                                          │
│ Rama 2 — Turnos UX                                       │
│   /turnos/configuracion → wizard agendas (4 steps)      │
│   /display/:slug/:branchId → layout 70/30 + overlay     │
│   /turnos/totem → input táctil con numpad on-screen     │
│   Sidebar → item "Configuración de agendas"             │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─ FRONTEND-PORTAL ───────────────────────────────────────┐
│ Rama 3 — UX polish                                      │
│   /familia → family-card minimal                        │
│   /register → split nombre/apellido                     │
│   /turnos/sacar wizard → sticky footer refine           │
│   sede info → cablear telefono y horario                │
└─────────────────────────────────────────────────────────┘
```

**Stack** (sin cambios respecto al estado actual):
- Backend: Java 21, Spring Boot, Clean Architecture, JPA, Flyway, JUnit 5, Mockito.
- LAB: Angular 21 + NgRx classic + signals + PrimeNG 21 + vitest.
- Portal: Angular 21 + signals (sin NgRx) + PrimeNG.
- Tooling: jira-cli, gh, git worktrees opcional.

---

## 4. Rama 1 — `feat/sucursales-back-office` (LAB)

### 4.1 Patrón UX

- **Crear sucursal: stepper** porque el alta involucra completar varios sub-recursos. Lineal y formal.
- **Editar sucursal: tabs** porque la edición es no-secuencial (el admin entra a un sub-recurso puntual). Mismo patrón que `saas-admin` para tenant edit.
- **Catálogo de Áreas y Secciones**: página separada `/sucursales/catalogo` con mini-CRUD (lista + alta + edit nombre + soft-delete). Pre-requisito para crear Workspaces en el stepper.

### 4.2 Rutas nuevas

```ts
// sucursales.routes.ts
{ path: 'configuracion', children: [
    { path: '',         component: SucursalesListPage },           // existente
    { path: 'nueva',    component: SucursalAltaStepperPage },      // NUEVA
    { path: ':id',      component: SucursalDetallePage },          // NUEVA (tabs)
]},
{ path: 'catalogo',   component: SucursalesCatalogoPage }          // NUEVA (areas+sections)
```

La ruta existente `/sucursales/areas` (stub `AreasComponent`) se elimina o se redirige a `/sucursales/catalogo`.

### 4.3 Stepper de creación (`SucursalAltaStepperPage`)

Pasos:

| # | Step | Recurso backend | Endpoint |
|---|---|---|---|
| 1 | **Datos** | `Branch` (create) | `POST /api/v1/sucursales/branches` |
| 2 | **Horarios** | `BranchSchedule[]` | `POST /api/v1/sucursales/branches/{id}/schedules` (por cada uno) |
| 3 | **Contactos** | `BranchContact[]` | `POST /api/v1/sucursales/branches/{id}/contacts` |
| 4 | **Workspaces** | `BranchWorkspace[]` | `POST /api/v1/sucursales/branches/{id}/workspaces` |
| 5 | **Tótem** | `BranchTotemConfig` | `PUT /api/v1/sucursales/branches/{id}/totem-config` |
| 6 | **Confirmar** | resumen + submit | n/a (ya se fueron persistiendo) |

**Estrategia de persistencia**:
- **Step 1** crea el `Branch` y devuelve `branchId`. Sin `branchId` no se puede continuar (los sub-recursos lo requieren).
- **Steps 2-5** cada uno persiste cuando el user clickea "Siguiente". Si el step falla → error mapeado, queda en el mismo paso, el user reintenta.
- **Step 6** (Confirmar) muestra resumen read-only de todos los sub-recursos creados + botón "Finalizar" que solo redirige al detalle.
- **Cancelar a mitad de camino**: el Branch queda creado en backend (no implementamos rollback). Aparece en la lista con status `INACTIVE` o el default que use el backend. El user puede volver a editarlo desde el detalle. Decisión consciente — alternativa (rollback transaccional) exigiría endpoint composite que hoy no existe.

**Modelos de cada sub-recurso (referencia backend, fields key)**:

```ts
// BranchSchedule
interface BranchSchedule {
  dayFrom: DayOfWeek;   // 'MONDAY' | 'TUESDAY' | ...
  dayTo: DayOfWeek;
  fromTime: string;     // 'HH:mm'
  toTime: string;       // 'HH:mm'
  scheduleType: ScheduleType;  // enum del backend
}

// BranchContact
interface BranchContact {
  contactType: 'PHONE' | 'MOBILE' | 'EMAIL' | 'WHATSAPP' | 'FAX' | 'WEBSITE';
  value: string;
}

// BranchWorkspace (referencia a Area y Section globales)
interface BranchWorkspace {
  areaId: number;
  sectionId: number;
}

// BranchTotemConfig
interface BranchTotemConfig {
  enabled: boolean;
}
```

### 4.4 Detalle de edición (`SucursalDetallePage` con tabs)

Ruta `/sucursales/configuracion/:id`. Tabs:

```
┌─ Datos ──────────────────────────────────────┐
│  Form base (code, descripción, status, addr) │
│  PATCH /sucursales/branches/{id}             │
├─ Horarios ───────────────────────────────────┤
│  Lista + alta + edit + soft-delete           │
│  CRUD /sucursales/branches/{id}/schedules    │
├─ Contactos ──────────────────────────────────┤
│  Lista + alta + edit + soft-delete           │
│  CRUD /sucursales/branches/{id}/contacts     │
├─ Workspaces ─────────────────────────────────┤
│  Lista + alta (select Area + select Section) │
│  CRUD /sucursales/branches/{id}/workspaces   │
└─ Tótem ──────────────────────────────────────┘
   Único switch "Habilitar tótem"               
   PUT /sucursales/branches/{id}/totem-config   
```

### 4.5 Página catálogo (`SucursalesCatalogoPage`)

Mini-CRUD para `Area` y `Section` globales del tenant. Layout: **dos paneles lado a lado**.

```
┌─ Áreas ─────────────────────┬─ Secciones (de Área X) ─┐
│  + Nueva área               │  + Nueva sección        │
│  ─ Hematología       [edit] │  ─ Citología   [edit]   │
│  ─ Bioquímica        [edit] │  ─ Hemograma  [edit]    │
│  ─ Microbiología     [edit] │                         │
└─────────────────────────────┴─────────────────────────┘
```

- Click en una fila de Área → carga sus Sections en el panel derecho.
- Alta/edición simple: nombre + (para Area) areaType + (cuando areaType=EXTERNO) externalLabName.
- Soft-delete con confirm dialog.

Endpoints reutilizados (ya existen): `/api/v1/sucursales/areas` y `/api/v1/sucursales/sections`.

### 4.6 Store NgRx (`features/sucursales/store/`)

Extender el `sucursal.feature` existente:

```ts
interface SucursalState {
  list: Sucursal[];                  // existente
  current: SucursalDetail | null;    // NEW
  schedules: BranchSchedule[];       // NEW
  contacts: BranchContact[];         // NEW
  workspaces: BranchWorkspace[];     // NEW
  totemConfig: BranchTotemConfig | null;  // NEW
  areas: Area[];                     // existente (re-cableado)
  sections: Section[];               // NEW
  saving: boolean;                   // existente
  loadingDetail: boolean;            // NEW
}
```

Actions por sub-recurso (`addSchedule`, `updateSchedule`, `deleteSchedule`, etc.) + action compuesta `loadDetail(branchId)` que dispara en paralelo el load de los 5 sub-recursos.

Tests vitest: reducer (state transitions) + effects (HTTP success/error → toast mapping).

### 4.7 Files

**Nuevos**:
- `pages/configuracion/sucursal-alta-stepper/sucursal-alta-stepper.page.{ts,html,scss}`
- `pages/configuracion/sucursal-alta-stepper/steps/{datos,horarios,contactos,workspaces,totem,confirmar}-step.component.{ts,html,scss}` (6 sub-components)
- `pages/configuracion/sucursal-detalle/sucursal-detalle.page.{ts,html,scss}`
- `pages/configuracion/sucursal-detalle/tabs/{datos,horarios,contactos,workspaces,totem}-tab.component.{ts,html,scss}` (5 sub-components)
- `pages/catalogo/sucursales-catalogo.page.{ts,html,scss}`
- `services/branch-schedule.service.ts`
- `services/branch-contact.service.ts`
- `services/branch-workspace.service.ts`
- `services/branch-totem-config.service.ts`
- `services/section.service.ts`
- `models/branch-schedule.model.ts`, `branch-contact.model.ts`, `branch-workspace.model.ts`, `branch-totem-config.model.ts`, `section.model.ts`
- Store: actions/effects/reducer extensions + selectors

**Modificados**:
- `sucursales.routes.ts` (rutas nuevas + remover `/areas` stub)
- `pages/configuracion/sucursales-configuracion.component.ts` (click fila → `router.navigate :id`)
- `sucursal-form-modal.component.ts` → eliminar (reemplazado por stepper) o mantener como fallback
- `pages/areas/areas.component.ts` → eliminar (mergeado en catálogo)
- `services/sucursales.service.ts` extender con `getById`, `update`
- `layout/sidebar/sidebar.nav.ts` agregar item "Catálogo" si aplica

---

## 5. Rama 2 — `feat/turnos-ux-lab` (LAB)

### 5.1 Wizard de agendas rediseño

**Estado actual**: `pages/configuracion/agenda-wizard.page.ts` (149 líneas) + html (38 líneas) — form crudo, sin stepper visible. User reportó "se ve mal" en smoke A.

**Patrón a copiar**: `FRONTEND-PORTAL/src/app/features/main/turnos/sacar/` (stepper 4 steps con sub-componentes, sticky footer con botones, validación por paso).

**Steps del wizard de agendas**:

| # | Step | Campos |
|---|---|---|
| 1 | Sucursal | `branchId` (select del catálogo via `GET /sucursales/branches`) |
| 2 | Horario | `fromTime`, `toTime`, `slotDurationMinutes`, `patientsPerSlot` |
| 3 | Período | `daysOfWeek` (multi-check L-D), `validFrom`, `validTo` |
| 4 | Confirmar | resumen + submit |

**Modo edición**: misma página con `agendaId` en URL (`/turnos/configuracion/agenda/:id/editar`). Pre-llena los 4 pasos, permite navegación libre entre steps.

**Componentización**:
- `pages/configuracion/agenda-wizard/agenda-wizard.page.{ts,html,scss}` (orquestador, reescritura del existente)
- `pages/configuracion/agenda-wizard/steps/step-sucursal.component.{ts,html,scss}`
- `pages/configuracion/agenda-wizard/steps/step-horario.component.{ts,html,scss}`
- `pages/configuracion/agenda-wizard/steps/step-periodo.component.{ts,html,scss}`
- `pages/configuracion/agenda-wizard/steps/step-confirmar.component.{ts,html,scss}`

### 5.2 Sidebar item

**Cambio**: agregar a `layout/sidebar/sidebar.nav.ts`:

```ts
{
  label: 'Configuración de agendas',
  icon: 'pi pi-calendar-plus',
  routerLink: '/turnos/configuracion',
  roleKey: 'ADMINISTRADOR',  // ya respetado por isItemVisible
}
```

### 5.3 Error mapper — auditoría + extensión

**Estado actual**: `features/turnos/utils/agenda-error-mapper.ts` existe con casos `AGENDA_CONFIG_OVERLAP`, `fieldErrors`, `MODULE_DISABLED`, `404/403/500/0`.

**Tarea**:
1. **Grep + audit**: encontrar todos los `catchError` / `subscribe(..., err => ...)` en `features/turnos/**/*.ts` y verificar que usen `mapAgendaError`. Cualquiera que no lo use → cablearlo.
2. **Casos a agregar** si no están:
   - `400` con message en inglés crudo "An agenda configuration with overlapping..." sin code → fallback que reconoce el mensaje literal.
   - `400` con mensaje crudo del backend de bean validation (`must not be null`, etc.) → mensaje genérico en español.
   - Cualquier otro hallado al cablear.
3. **Test**: extender `agenda-error-mapper.spec.ts` con los casos nuevos.

### 5.4 TV display — layout 70/30 + fondo claro

**Estado actual**: `pages/display/display.component.{ts,html,scss}` con 115 líneas, fondo oscuro, ocupa todo el ancho con la cola/llamado.

**Cambios**:
- **Layout**: grid CSS `grid-template-columns: 7fr 3fr` o `display: flex` con `flex: 7` y `flex: 3`. Columna izquierda mantiene la cola/llamado actual. Columna derecha es panel `<aside class="ad-slot">`.
- **Panel publicidad** (mockup): imagen estática o gradiente decorativo con texto "Tu publicidad acá" o similar. Sin abstracción ni `<img [src]>`. Comentario `// TODO: configurable via tenant config` en código.
- **Fondo claro**: cambiar variables CSS de display (`--display-bg: #f5f5f5` o similar) y ajustar colores del cola/llamado para contrastar.
- **Responsive**: forzar landscape (TV físicamente acostada). Sin breakpoints mobile.

### 5.5 TV display — overlay para desbloquear audio

**Problema**: `Audio.play()` bloqueado por autoplay policy del browser. La TV nunca suena sin click previo.

**Solución**:
- Signal `audioUnlocked = signal(false)` + persistencia opcional en `sessionStorage`.
- Mientras `!audioUnlocked()`: overlay full-screen con CTA "Click para activar sonido" + audio silencioso reproducido en el handler del click → desbloquea el `AudioContext`.
- Al clickear: `audioUnlocked.set(true)` + `sessionStorage.setItem('tv-audio-unlocked', '1')`. El overlay desaparece. El beep funciona en cada `calledEntry` change.

```ts
// display.component.ts (additions)
audioUnlocked = signal(sessionStorage.getItem('tv-audio-unlocked') === '1');

unlockAudio() {
  const a = new Audio('/assets/beep.mp3');
  a.volume = 0;
  a.play().then(() => {
    this.audioUnlocked.set(true);
    sessionStorage.setItem('tv-audio-unlocked', '1');
  }).catch(err => console.warn('Audio unlock failed', err));
}
```

### 5.6 Tótem — numpad on-screen

**Estado actual**: `pages/totem/components/totem-input-dni.component.{ts,html,scss}` usa `<input>` editable → depende del teclado del browser/SO.

**Cambios**:
- Reemplazar `<input>` por display readonly grande (signal `dniInput`).
- Nuevo componente `pages/totem/components/totem-numpad.component.{ts,html,scss}` con grid 4x3 (botones 1-9, 0, "Borrar" ⌫, "Enviar" →).
- Botones touch-friendly: `min-height: 80px`, `font-size: clamp(2rem, 4vw, 3rem)`, espaciado generoso (`gap: 1rem`), feedback `:active` con `transform: scale(0.97)` y cambio de bg.
- Emisión de eventos: `digitPressed(n: number)`, `clearPressed()`, `submitPressed()`.
- El parent (`TotemInputDniComponent`) maneja el state del DNI y dispatch del submit.
- Validación: longitud máxima 8 dígitos. "Enviar" deshabilitado mientras `dniInput().length < 7` (o el mínimo del backend).

### 5.7 Files

**Nuevos**:
- `pages/configuracion/agenda-wizard/agenda-wizard.page.{ts,html,scss}` (reescribe el actual)
- `pages/configuracion/agenda-wizard/steps/*` (4 sub-components)
- `pages/totem/components/totem-numpad.component.{ts,html,scss}`

**Modificados**:
- `pages/display/display.component.{ts,html,scss}` (layout 70/30 + fondo claro + overlay audio)
- `pages/totem/components/totem-input-dni.component.{ts,html,scss}` (usar numpad)
- `layout/sidebar/sidebar.nav.ts` (item nuevo)
- `utils/agenda-error-mapper.ts` (casos nuevos)
- `utils/agenda-error-mapper.spec.ts` (tests nuevos)
- Consumers del mapper en `features/turnos/**/effects.ts` (auditoría)
- `pages/configuracion/agenda-wizard.page.ts` actual → eliminado o convertido en re-export del nuevo

**Asset nuevo si no existe**:
- `src/assets/beep.mp3` (verificar; si no está, agregar uno corto y open-license)

---

## 6. Rama 3 — `feat/turnos-ux-polish` (Portal)

### 6.1 Family card minimal

**Estado actual**: `features/main/familia/components/family-card/...` con avatar circular + nombre + vinculo·edad + 3 acciones. User pidió en smoke C "como tarjetitas, sólo con el nombre".

**Cambio**:
- Remover avatar.
- Card compacta: nombre del familiar + chevron derecho (`pi-angle-right`).
- Vínculo y edad como subtítulo chico debajo del nombre, o tooltip.
- Acciones (sacar turno, ver, editar) en menú overflow (`...`) o en página de detalle del familiar.

### 6.2 Register split nombre/apellido

**Estado actual**: `/register` tiene input único `nombreCompleto` que se splitea por primer espacio en el submit. Frágil con nombres compuestos.

**Cambio**:
- Form con `firstName` y `lastName` como inputs separados, ambos `required`, ambos `minLength=2`.
- Backend ya espera `firstName` y `lastName` separados (`RegisterPatientRequest`), no requiere cambios.

### 6.3 Sticky footer wizard mobile refine

**Estado actual**: tras varias iteraciones en smoke C, el footer queda con `max(--space-3, --ds-safe-bottom)` y el bottom-nav se oculta con `body.wizard-open`. Sigue habiendo posible refinamiento.

**Cambio**:
- Revisar inspector + screenshots en device real (iPhone Safari + Android Chrome) para validar que no haya gap visible debajo del footer.
- Si hace falta ajuste, modificar solo CSS del sticky footer (sin cambiar la lógica de `body.wizard-open` ni la `.css` del drawer/bottom-nav, que están funcionando).

### 6.4 Cableo de `Sede.telefono` / `.horario`

**Estado actual**: el step "sede" del wizard sacar-turno consume `Sede` con `telefono` y `horario` undefined porque el backend (`/api/v1/sucursales/public`) no los expone.

**Cambio**:
- Si **rama 4 (Backend) entra**: el endpoint `/sucursales/public?slug=X` devuelve `phone` y `schedules` → cablear en `sucursal-public.service.ts` para mapear a `Sede.telefono` y `Sede.horario`.
- Si **rama 4 NO entra**: dejar fallback `Sede.telefono = ''` y `Sede.horario = ''` (string vacío en lugar de `undefined`). La UI condiciona el render: si el valor es vacío, no muestra la fila o muestra "Sin información disponible".

### 6.5 Files

**Modificados**:
- `features/main/familia/components/family-card/family-card.component.{ts,html,scss}` (minimal)
- `features/main/auth/register/register.component.{ts,html}` (split inputs)
- `features/main/turnos/sacar/sacar-turno.component.scss` (sticky footer refine)
- `features/main/turnos/sacar/steps/step-sede/step-sede.component.{ts,html}` (cableo telefono/horario)
- `core/services/sucursal-public.service.ts` (mapeo de response → Sede)

---

## 7. Rama 4 — `feat/branch-public-fields` (Backend, opcional)

### 7.1 Scope

Exponer `phone` y `schedules` en el response de `BranchPublicController` para que el portal pueda cablear `Sede.telefono` y `Sede.horario`.

### 7.2 Cambios

**Modificar `BranchPublicController` y su DTO de response**:
- Agregar campos `phone: string` y `schedules: BranchScheduleDto[]` al DTO de `BranchPublicResponse`.
- `phone`: tomar el primer `BranchContact` con `contactType IN (PHONE, MOBILE)` para el branch. Si no hay, queda `null`.
- `schedules`: listar los `BranchSchedule` activos del branch, transformados a DTO público (`dayFrom`, `dayTo`, `fromTime`, `toTime`).

**Use case `ListPublicBranchesUseCase` (existente)**:
- Inyectar `BranchContactRepositoryPort` y `BranchScheduleRepositoryPort`.
- Para cada branch, hacer lookup batch de contacts y schedules.

**Test**:
- Extender `BranchPublicControllerTest` con assertions sobre los nuevos fields.
- Test del use case con mocks que verifican el batch lookup.

### 7.3 Sin migración

Backend ya tiene `BranchContact` y `BranchSchedule` con datos en local-dev seeds (`V902` solo crea branches sin sub-recursos — el smoke C local agregará seeds adicionales cuando se haga la verificación, no las incluye este spec). Producción asume que los admins crearon los datos vía el back-office (rama 1).

---

## 8. Decisiones técnicas clave

### 8.1 Stepper-crear + Tabs-editar para sucursales

**Por qué**: el alta es lineal y formal (el admin completa cada paso secuencialmente); la edición es no-secuencial (el admin entra a un sub-recurso puntual sin tocar el resto). Stepper en edición fricciona el flow ("¿paso por todos los steps para editar solo un horario?"). Mismo patrón ya usado en `saas-admin` (tenant wizard + tabs edit).

### 8.2 Catálogo Áreas/Secciones aparte

**Por qué**: `Area` y `Section` son tenant-level (no branch-level). Modelarlas dentro del stepper de sucursal acopla un recurso global a un flow específico. Modelarlas como dropdown vacío en el step Workspaces obliga al admin a pre-crear áreas/secciones desde otro lado igual. Mejor: una página dedicada `/sucursales/catalogo` que es pre-requisito documentado.

### 8.3 Persistencia incremental del stepper (no transaccional)

**Por qué**: el backend no expone endpoint composite "crear branch + N sub-recursos atómico". Implementar transacción client-side con rollback (DELETE en caso de fallo del step N) es complejo y propenso a estados inconsistentes. Aceptamos que un alta abandonada deja el branch parcialmente configurado — el admin puede continuar desde el detalle. Es la misma lógica que `saas-admin` con tenant create.

### 8.4 TV publicidad mock hoy

**Por qué**: el user explicitó "hoy solo mockups UX". No introducimos abstracción (servicio, store, endpoint) para un feature que no tiene backend definido. Comentario `// TODO: configurable` en el código apunta a la futura iteración.

### 8.5 No `BranchAtencionConfig` nuevo

**Por qué**: el render condicional de la "pantalla de atención" entre 1 columna y 2 columnas ya existe en `recepcion.page.ts`, leyendo `BranchTotemConfig.enabled`. El toggle de tótem hace doble función. Crear un segundo flag duplica configuración sin agregar capacidad.

### 8.6 Numpad on-screen vs `<input inputmode="numeric">`

**Por qué numpad propio**: el tótem es kiosk en pantalla táctil dedicada — no queremos depender del teclado del OS (puede aparecer/desaparecer, oculta UI, lenta interacción). Botones de la app garantizan UX consistente.

### 8.7 Tres ramas LAB en lugar de una grande

**Por qué split sucursales + turnos-ux**: son features disjoints en alcance (back-office vs UX polish), con touchpoints UI distintos. PR único de ~30 archivos mezclando ambos es difícil de revisar. Tres ramas LAB se descartó (TV + tótem son cambios chicos, vale fusionarlos con wizard agendas).

---

## 9. Out of scope (NO entra este arco)

Confirmar al cierre del review del spec:

- **Backend cleanup** del cierre KAN-41 anterior: formato inconsistente `recurring_days_of_week` (enum Spec A vs ISO Spec B/C), "today + 2 días" hardcoded en 3 use cases, tenant config duplicado front/back. Documentados en `Backend/docs/superpowers/specs/2026-05-24-turnos-cierre-y-prs-design.md`.
- **Pantalla `atencion-turno` real** (sigue stub de 11 líneas). Si el user quiere atender desde recepción → wizard de atención, eso ya está cableado al módulo `analitica/atencion` por `feat/atencion-module`. La página `features/turnos/pages/atencion-turno/` queda como redirección o desaparece según decisión futura.
- **CRUD pleno de áreas/secciones** con sub-features (asignar empleados, horarios propios de área, etc.). Solo lo mínimo: nombre, areaType, parent area para secciones, soft-delete.
- **Doctor / Employee** CRUD admin desde el back-office de sucursales. Tienen sus propios controllers backend; cuando se haga el front-office de RRHH, separado.
- **Geography** — endpoints existentes para país/provincia/ciudad. Address en el form de sucursal puede usar inputs simples o autocomplete; queda como mejora futura.
- **Configuración avanzada de TV publicidad** (cableado a config + admin UI). Hoy mock estático.
- **E2E Playwright automatizado** para los 4 flows nuevos.

---

## 10. Riesgos y dependencias

### 10.1 Dependencia rama 3 ↔ rama 4

Si **rama 4 (Backend) no entra en este arco**, rama 3 cablea `Sede.telefono`/`.horario` con fallback empty string. **No bloquea** el merge de rama 3. Cableo real se hace cuando rama 4 sea mergeada.

### 10.2 Tenants sin Áreas/Secciones cargadas

**Riesgo**: tenant nuevo entra al stepper de sucursales y el step Workspaces aparece sin opciones porque no hay catálogo cargado. **Mitigación**: el step Workspaces detecta lista vacía → CTA "Primero crea áreas y secciones en el catálogo" con link a `/sucursales/catalogo`. No bloquea el alta (workspaces es opcional según backend; verificar al implementar).

### 10.3 Wizard agendas — overlapping

**Riesgo**: la regla de no-overlap del backend puede generar errores en edición (cambiar el horario de una agenda existente puede colisionar con otra). El mapper ya cubre `AGENDA_CONFIG_OVERLAP`. **Mitigación**: extender mensaje del toast con sugerencia "Verificá que no se superponga con: <lista>".

### 10.4 TV display — assets

**Riesgo**: si `src/assets/beep.mp3` no existe, el overlay de audio no tiene nada que reproducir. **Mitigación**: agregar un beep.mp3 corto (≤1s) con licencia abierta en assets.

### 10.5 Tótem numpad — accesibilidad

**Riesgo**: usuarios con problemas motrices o pantallas chicas pueden encontrar el numpad difícil. **Mitigación**: tamaño de botón ≥80px (recomendado táctil ≥48px). No incluimos modo "input físico fallback" — el tótem es kiosk dedicado.

---

## 11. Verificación / smoke manual

Cada rama debe pasar un smoke manual antes del merge. Resumen por rama:

### Rama 1 — Sucursales back-office

1. Login con `admin@test.com` / `password` → navegar a `/sucursales/configuracion` desde sidebar.
2. Click "Catálogo" → crear área "Hematología" + sección "Hemograma".
3. "Nueva sucursal" → completar los 6 steps con datos válidos → llegar a Confirmar → Finalizar.
4. Verificar en `/sucursales/configuracion` (lista) que aparece la nueva sucursal.
5. Click sobre la sucursal → entrar a tabs.
6. Editar horario en tab Horarios → guardar → recargar página → cambio persiste.
7. Toggle Tótem en tab Tótem → toggle persistir → recepción de esa sucursal cambia de layout (sin-tótem ↔ con-tótem).
8. Eliminar contacto en tab Contactos → soft-delete OK.

### Rama 2 — Turnos UX

1. Login admin → ver sidebar item "Configuración de agendas" → entrar.
2. Click "Nueva agenda" → completar 4 steps → guardar → aparece en lista.
3. Forzar error overlap (crear agenda con horario ya tomado) → toast en español con sugerencia → no crashea.
4. Abrir `/display/lab-demo/1` en pestaña nueva → ver layout 70/30 con publicidad mock + fondo claro.
5. Sin click previo: overlay "Click para activar sonido" visible → click → overlay desaparece.
6. Disparar `POST /api/v1/turnos/queue/{id}/call` via curl → la TV suena el beep.
7. Abrir `/turnos/totem` → ver numpad → tipear DNI tocando botones → enviar → flow funciona.

### Rama 3 — Portal UX

1. Login externo en portal → ver `/familia` con cards minimal (sin avatar).
2. Logout → `/register` → ver 2 inputs separados firstName/lastName → registrar → success.
3. Mobile (iPhone Safari + Android Chrome): wizard sacar-turno → no hay gap visible debajo del sticky footer en ningún step.
4. Si rama 4 mergeada: step "sede" muestra teléfono y horarios reales. Si no: vacío sin crashear.

### Rama 4 — Backend (si entra)

1. `mvn test` pasa, incluyendo nuevos tests de `BranchPublicControllerTest`.
2. `curl /api/v1/sucursales/public?slug=lab-demo` devuelve `phone` y `schedules` poblados (asumiendo seed cargada).

---

## 12. Orden de merge sugerido

```
rama 4 (Backend) → develop  ──┐  (si entra)
                              │
rama 1 (LAB sucursales) → develop
rama 2 (LAB turnos UX)  → develop  (paralelo a 1)
                              │
                              ↓
rama 3 (Portal) → develop  ←──┘  (depende de rama 4 para campos reales; si rama 4
                                  no entra, se mergea con fallback vacío)
```

Ramas 1, 2 son independientes entre sí y se pueden trabajar/mergear en paralelo. Rama 3 se beneficia de rama 4 pero no la requiere.

---

## 13. Glosario rápido

| Término | Significado |
|---|---|
| Recepción | Puesto de check-in del paciente en la sucursal. Pantalla `recepcion.page.ts` en LAB. Tiene 2 layouts según `BranchTotemConfig.enabled`. |
| Atención (clínica) | Wizard de atención del módulo `analitica/atencion` (datos generales, análisis, cobro, facturación, end-secretary-phase). Ya mergeado vía `feat/atencion-module`. |
| Atención-turno | Stub legacy en `features/turnos/pages/atencion-turno/`. NO se toca en este arco. |
| Tótem | Kiosk físico en la sucursal donde walk-ins ingresan su DNI. UI: `features/turnos/pages/totem/`. |
| TV display | Pantalla pública que muestra la cola. UI: `pages/display/display.component.ts`. Polling cada 3s. |
| Workspace | Asociación (branch ↔ area ↔ section) que indica qué áreas/secciones operan en cada sucursal. |
