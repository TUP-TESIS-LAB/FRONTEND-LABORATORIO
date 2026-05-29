# Pantalla de Configuración de Agendas — Laboratorio

## Contexto

El backend ya tiene implementado el módulo TURNOS completo (PR #13 mergeado a
`development`). Expone CRUD de `AgendaConfig` en `/api/v1/turnos/agenda-configs`
con cuatro endpoints (list por sucursal, create, update, delete). Las agendas
definen los horarios de atención, duración de slot y capacidad por slot de cada
sucursal — sin agendas configuradas, no hay disponibilidad para reservar turnos.

En el frontend (`features/turnos/`) el scaffolding existe (`turnos.routes.ts`
con sub-ruta `/configuracion`, store NgRx vacío, service stub) pero ningún
componente está implementado. La pantalla actual de `ConfiguracionComponent`
son 11 líneas de placeholder.

Esta es la primera de tres pantallas del módulo TURNOS en el laboratorio:

- **Spec A (este doc):** Configuración de agendas — gestión de horarios por sucursal.
- **Spec B (próximo):** Cola del día — walk-ins + turnos del día.
- **Spec C (próximo, en FRONTEND-PORTAL):** Reserva de turno por paciente externo.

A es prerequisito de B y C: sin agendas no hay disponibilidad ni cola con
horarios calculables.

## Decisiones

### UX

- **Pantalla full-page (no embebida en tabs)** en `/turnos/configuracion`,
  multi-sucursal: el admin ve todas las sucursales en un acordeón; los roles
  `RESPONSABLE_SECRETARIA` ven solo la suya con el selector oculto.
- **Stepper full-page para alta/edición** en `/turnos/configuracion/nueva` y
  `/:id/editar`, con 4 pasos (Sucursal, Horario, Vigencia, Confirmar).
  Decisión tomada en contra de la regla del design system de `laboratory-ui`,
  que indica drawer para entidades atómicas. Se eligió stepper para mejorar la
  asimilación de las 9 propiedades agrupadas en chunks conceptuales (dónde,
  cuándo, cuánto). Si la decisión envejece mal, refactorizar a drawer es
  reversible — el `FormGroup` y los sub-componentes son reutilizables.
- **Filtro por sucursal** en la lista principal (oculto para roles
  no-admin). Búsqueda local por horario.
- **Confirm dialog destructivo** antes de eliminar agendas (texto explícito de
  que los turnos ya reservados no se afectan).

### Permisos (espejo del backend)

- `ADMINISTRADOR`, `RESPONSABLE_SECRETARIA`: pueden crear, editar y eliminar.
- `SECRETARIA`: solo lectura. La pantalla principal renderiza sin botones de
  acción para este rol.
- `EXTERNO`: no accede.

### Manejo de errores

- `AgendaConfigOverlapException` (400) → toast destructivo + el stepper vuelve
  al paso 3 (vigencia) que es donde se decide el overlap.
- `AgendaConfigNotFoundException` (404, en edit/delete) → toast informativo +
  refresh + navegación a la lista.
- Validación con `fieldErrors` → marcas inline por campo, sin toast.
- `403` → toast "sin permiso" (no debería llegar acá si los guards funcionan).
- `503 ModuleDisabledException` → toast + navegación a `/home` con banner.
- Red caída / 5xx → banner sticky con botón "Reintentar".

### Caché y data flow

- NgRx clásico (mismo patrón que `sucursales`): `state` con `pending`,
  `error: ApiErrorResponse | null`, sub-store `agendas` con `configsByBranch:
  Record<number, AgendaConfig[]>`.
- Selectors expuestos como `Signal<T>` vía `selectSignal`, alineado con la regla
  del DS `laboratory-ui`.
- Invalidación: `createSuccess`/`updateSuccess`/`deleteSuccess` invalidan la
  branch afectada y disparan reload.

## Prerequisitos

### Backend: agregar `GET /api/v1/turnos/agenda-configs/{id}`

El backend hoy expone `GET /agenda-configs?branchId={x}` (list) pero no fetch
por id. El modo edición del stepper necesita rehidratar el form aunque el
usuario entre por URL directa sin pasar por la lista. Se decide pedir el
endpoint al backend en vez de derivarlo del cache, porque:

- Es 1 use case + 1 método de controller + 1 query en repository — trivial.
- Alinea con el resto del CRUD (que tiene endpoints individuales para el
  resto de las operaciones).
- Evita acoplar el componente al estado del store.

Este endpoint requiere su propio ciclo SDD en el backend (`/sdd-new` con
spec mínima). Spec A queda gateada hasta que esté disponible o se acepte la
alternativa temporal de filtrar del list cacheado (no recomendado; introduce
acoplamiento entre cache y deep-link).

## Arquitectura

### Routing

```ts
// features/turnos/turnos.routes.ts (sub-ruta /configuracion)
{
  path: 'configuracion',
  children: [
    {
      path: '',
      loadComponent: () => import('./pages/configuracion/configuracion-list.page')
        .then(m => m.ConfiguracionListPage),
    },
    {
      path: 'nueva',
      canActivate: [agendaWriteGuard],
      loadComponent: () => import('./pages/configuracion/agenda-wizard.page')
        .then(m => m.AgendaWizardPage),
    },
    {
      path: ':id/editar',
      canActivate: [agendaWriteGuard],
      resolve: { agenda: agendaConfigResolver },
      loadComponent: () => import('./pages/configuracion/agenda-wizard.page')
        .then(m => m.AgendaWizardPage),
    },
  ],
}
```

`agendaWriteGuard` es un nuevo guard funcional que valida que el rol del
usuario sea `ADMINISTRADOR` o `RESPONSABLE_SECRETARIA`. Reutiliza
`AuthService` existente.

### Componentes nuevos

```
features/turnos/
├── pages/configuracion/
│   ├── configuracion-list.page.ts        ← lista por sucursal
│   ├── configuracion-list.page.scss
│   ├── agenda-wizard.page.ts             ← stepper alta/edit
│   ├── agenda-wizard.page.scss
│   └── steps/
│       ├── step-sucursal.component.ts
│       ├── step-horario.component.ts
│       ├── step-vigencia.component.ts
│       └── step-confirmar.component.ts
├── components/
│   └── agenda-branch-section.component.ts ← sección colapsable por sucursal
├── services/
│   └── agenda-config.service.ts          ← HTTP wrapper
├── store/agendas/
│   ├── agendas.state.ts
│   ├── agendas.actions.ts
│   ├── agendas.reducer.ts
│   ├── agendas.effects.ts
│   └── agendas.selectors.ts
├── utils/
│   └── agenda-error-mapper.ts            ← mapeo backend → UX
├── guards/
│   └── agenda-write.guard.ts
├── resolvers/
│   └── agenda-config.resolver.ts
└── models/
    └── agenda-config.model.ts            ← DTOs alineados al backend
```

### Archivos modificados

- `features/turnos/turnos.routes.ts` → reemplaza el stub de `configuracion` por
  la sub-ruta con children.
- `features/turnos/pages/configuracion/configuracion.component.ts` →
  **eliminado**, queda reemplazado por las nuevas pages.

### Modelo (DTOs)

```ts
// alineado 1:1 con el backend
export interface AgendaConfig {
  id: number;
  branchId: number;
  tenantId: number;
  startTime: string;            // "HH:mm"
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  appointmentsCount: number;
  isRecurring: boolean;
  validFromDate: string;        // ISO date
  validToDate: string | null;
  recurringDaysOfWeek: string | null; // "MONDAY,TUESDAY,..."
}

export interface CreateAgendaConfigRequest {
  branchId: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  patientsPerSlot: number;
  isRecurring: boolean;
  validFromDate: string;
  validToDate?: string;
  recurringDaysOfWeek?: string;
}

export interface UpdateAgendaConfigRequest
  extends Omit<CreateAgendaConfigRequest, 'branchId'> {}
```

## Layout — Pantalla principal

### Desktop (≥1024px)

```
┌─ Topbar (shell) ────────────────────────────────────────────────────┐
├─ Sidebar ──┬─ Page header ─────────────────────────────────────────┤
│ ...        │ Configuración de turnos               [+ Nueva agenda]│
│ ▸ Turnos   │ Define horarios y capacidad por sucursal              │
│ ...        ├─ Toolbar ─────────────────────────────────────────────┤
│            │ [Sucursal: Todas v]              [Buscar agenda...]   │
│            ├─ Acordeón ────────────────────────────────────────────┤
│            │ ▼ CENTRAL — Sede Principal       [+ Agregar agenda]   │
│            │   Av. Corrientes 1234 · 3 agendas activas             │
│            │   ┌─────────────────────────────────────────────────┐ │
│            │   │ Horario   Días     Slot  Cap  Vigencia  Acción │ │
│            │   │ 08–12     LMXJV    15m   2    desde 01/06 ✎ 🗑 │ │
│            │   │ 14–18     LMXJV    30m   1    01/06—31/12 ✎ 🗑 │ │
│            │   │ 09–13     S        20m   2    desde 01/06 ✎ 🗑 │ │
│            │   └─────────────────────────────────────────────────┘ │
│            │ ▼ NORTE — Palermo                [+ Agregar agenda]   │
│            │   (tabla similar)                                     │
│            │ ▼ SUR — Lomas                    [+ Agregar agenda]   │
│            │   Sin agendas. [+ Crear primera agenda]               │
└────────────┴───────────────────────────────────────────────────────┘
```

### Mobile (<768px)

Acordeón por sucursal con `ui-list-card` en vez de tabla, siguiendo el
patrón "tabla adaptativa" de `laboratory-ui`.

```
┌─────────────────────────────┐
│ Config. de turnos    [+]    │
├─────────────────────────────┤
│ ▼ CENTRAL                   │
│   3 agendas activas         │
│   ┌─────────────────────┐   │
│   │ 08:00–12:00       ↗ │   │
│   │ L M X J V · 15m·2cap│   │
│   │ desde 01/06         │   │
│   └─────────────────────┘   │
│   [+ Agregar agenda]        │
│ ▶ NORTE (colapsado)         │
│ ▶ SUR                       │
└─────────────────────────────┘
```

### Componentes y bindings clave

| Elemento | Componente | Notas |
|----------|-----------|-------|
| Page header | inline siguiendo `tokens.scss` | título + subtítulo + CTA primary |
| Toolbar | `p-toolbar` desktop / `p-drawer` mobile | filtros |
| Acordeón | `p-accordion` con `multiple` | default expandido si ≤3 sucursales |
| Sección por sucursal | `AgendaBranchSectionComponent` | header custom con count y CTA |
| Tabla desktop | `p-table` con `stripedRows` | columns: Horario, Días, Slot, Cap, Vigencia, Acciones |
| Cards mobile | `ui-list-card` del DS | chevron a la derecha que dispara edit |
| Empty state por sucursal | `ui-empty-state` del DS | icon `pi-calendar` + CTA |
| Confirm delete | `p-confirmDialog` | texto explícito sobre turnos reservados |

### Estados

- **Loading inicial:** `p-skeleton` con 2 secciones falsas (header + 3 rows).
- **Error de fetch:** banner `severity=error` sticky arriba con "Reintentar".
- **Acción en curso (delete):** spinner sobre la fila + bloqueo de botones de
  fila.
- **Empty sin sucursales (caso edge):** empty state global con link a
  `/sucursales` para crear una primero.

## Layout — Stepper de alta/edición

### Estructura general (siguiendo `laboratory-ui § 9 stepper`)

```
┌──────────────────────────────────────────────────────────┐
│ ← Volver    Nueva agenda · Paso 2 de 4                   │
├──────────────────────────────────────────────────────────┤
│ ●━━━━━●━━━━━○━━━━━○                                       │
│ Sucursal  Horario  Vigencia  Confirmar                   │
├──────────────────────────────────────────────────────────┤
│        ┌─────────────────────────────────────┐           │
│        │  Contenido del paso (max-width 720) │           │
│        └─────────────────────────────────────┘           │
├──────────────────────────────────────────────────────────┤
│ [← Volver]                          [Continuar →]        │
└──────────────────────────────────────────────────────────┘
```

- `p-stepper` arriba para indicador visual.
- Body centrado `max-width: 720px` (`laboratory-ui § 9`).
- Footer sticky con botones.
- `Esc` o "← Volver" → confirm dialog si hay cambios sin guardar.

### Paso 1 — Sucursal

Field: `branchId`.

- Auto-skip si vino con `?branchId=X` en URL o si el usuario solo gestiona 1.
- En modo edición: campo deshabilitado, info readonly.
- `p-select` con sucursales activas del store. Validación: required.

### Paso 2 — Horario y capacidad

Fields: `startTime`, `endTime`, `slotDurationMinutes`, `patientsPerSlot`.

- `p-datepicker timeOnly="true"` para inicio/fin.
- `p-select` con valores estandarizados de slot (10, 15, 20, 30, 45, 60 min).
- `p-inputNumber` para capacidad (min 1).
- **Preview en vivo:** card informativo con
  `Math.floor((endMin − startMin) / slot) × patientsPerSlot = N pacientes/día`.

Validaciones inline:
- start < end (helper text "La hora de fin debe ser posterior a la de inicio").
- slot y capacidad > 0.

### Paso 3 — Vigencia y recurrencia

Fields: `isRecurring`, `validFromDate`, `validToDate`, `recurringDaysOfWeek`.

- Radio "Recurrente / Por fecha única".
- Si recurrente: `p-selectButton` multi-select de 7 días (L M X J V S D).
- `p-datepicker` para desde/hasta. `hasta` opcional con checkbox
  "Sin fecha de fin".
- Serializa días como `"MONDAY,TUESDAY,..."` para alinear con el backend
  (que ya migró a VARCHAR(100)).

Validaciones:
- validFromDate requerido, ≥ today.
- Si recurrente: ≥1 día seleccionado.
- Si validToDate presente: ≥ validFromDate.

### Paso 4 — Confirmar

Resumen en 3 cards (uno por paso anterior) con botón `✎` que vuelve al step
manteniendo el state. Banner informativo sobre la posibilidad de overlap.

Footer cambia a "Crear agenda" (primary) o "Guardar cambios" (modo edit).

## Data flow

### Servicio

```ts
@Injectable({ providedIn: 'root' })
export class AgendaConfigService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/agenda-configs';

  list(branchId: number) { /* GET ?branchId */ }
  getById(id: number)     { /* GET /:id  ← requiere endpoint backend */ }
  create(body: CreateAgendaConfigRequest) { /* POST */ }
  update(id: number, body: UpdateAgendaConfigRequest) { /* PUT /:id */ }
  delete(id: number) { /* DELETE /:id */ }
}
```

### Store (sub-feature `agendas` dentro de `turnos`)

```ts
export interface AgendasState {
  configsByBranch: Record<number, AgendaConfig[]>;
  loadingBranch: number | null;
  pending: boolean;
  error: ApiErrorResponse | null;
}
```

Actions: `loadAgendas`, `createAgenda`, `updateAgenda`, `deleteAgenda` con
sus respectivos `*Success` y `*Failure`.

Effects:
- `loadAgendas` → llamar `service.list(branchId)`, dispatch success/failure.
- `createAgenda` → `service.create(req)`, en success: toast + `loadAgendas`.
- `updateAgenda`, `deleteAgenda` → análogos.

Selectors (todos `selectSignal`):
- `selectAgendasByBranch(branchId)`
- `selectLoadingForBranch(branchId)`
- `selectPending`, `selectError`

### Mapeo de errores

`utils/agenda-error-mapper.ts` recibe `HttpErrorResponse` y devuelve un
objeto con `{ display: 'toast'|'banner'|'inline', severity, message,
returnToStep? }`. El stepper observa este shape para decidir si vuelve a
un paso específico (caso overlap → step 3).

| Excepción backend | HTTP | UX |
|-------------------|------|-----|
| `AgendaConfigOverlapException` | 400 | toast destructivo + stepper a step 3 |
| `AgendaConfigNotFoundException` | 404 | toast info + reload + navegar a list |
| Validación con `fieldErrors` | 400 | marcas inline + helper text |
| `403` AuthorizationDenied | 403 | toast "sin permiso" |
| `ModuleDisabledException` | 403 | toast + navegar a /home con banner |
| Network / 5xx | — | banner sticky con "Reintentar" |

## Testing

### Unit

- `agenda-error-mapper.spec.ts`: cubre cada caso de la tabla de mapeo.
- `agendas.reducer.spec.ts`: cada acción muta state correctamente.
- `agendas.effects.spec.ts`: cada effect invoca el service correcto y
  despacha success/failure (`HttpTestingController`).
- `agenda-config.service.spec.ts`: smoke por método (URL, body, params).

### Component (TestBed)

- `ConfiguracionListPage`:
  - render con 0, 1 y N sucursales.
  - filtros por sucursal/estado/search local.
  - delete dispara `p-confirmDialog` y luego acción.
- `AgendaWizardPage`:
  - navegación entre steps requiere validación.
  - `?branchId=X` preselecciona y skip step 1.
  - modo edición precarga form correctamente.
  - submit final llama `createAgenda` o `updateAgenda` según modo.
  - error overlap vuelve al step 3.

### E2E (Playwright)

Dos flujos como mínimo:
- **HP:** ADMIN → /turnos/configuracion → Nueva → completar 4 steps → ver en
  la lista.
- **Error overlap:** crear agenda con horario solapado → toast + stepper a
  step 3.

Cobertura objetivo: 80% en reducer, mapper y service. Component tests pueden
ser smoke.

## Out of scope

- Visualización de la disponibilidad calculada (eso es la pantalla "Agenda"
  del Spec B).
- Edición masiva de agendas o templates compartidos entre sucursales.
- Configuración del módulo TURNOS a nivel tenant (constantes hoy hardcoded
  en backend — 2 días antelación, 24h cancelación). Se difiere a un futuro
  spec si se decide externalizarlas.
- Cualquier flujo del paciente externo / portal (Spec C).

## Siguientes pasos después de aprobar este spec

1. Crear sub-spec backend para `GET /api/v1/turnos/agenda-configs/{id}`
   (1 use case + 1 controller method + 1 repository query). Ciclo SDD del
   backend.
2. Una vez disponible, invocar `superpowers:writing-plans` con este spec
   como entrada para generar el implementation plan del frontend.
