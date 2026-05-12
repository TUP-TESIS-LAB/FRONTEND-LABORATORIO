# Pacientes — Feature Frontend Design

**Fecha:** 2026-05-12
**Rama:** feature/sidebard-topbar (mergeada con development)
**Stack:** Angular 21 · Standalone · OnPush · NgRx clásico (Store + Effects) · PrimeNG · Tailwind · Vitest

---

## 1. Contexto y alcance

El backend del monolito ya implementó el módulo **Patients** dentro de `modules/analitica` (Clean Architecture: domain + application + infrastructure + presentation). Expone un controller REST completo en `/api/v1/analitica/patients` con CRUD, paginación, búsqueda, validación de DNI y soft delete.

El frontend, en cambio, sólo tiene un placeholder huérfano: `features/analitica/pages/pacientes/pacientes.component.ts` (lista plana de `<li>`) con un modelo mínimo `Paciente` en `features/analitica/models/analitica.model.ts`. El mockup `full-mockup-v2.html` define a Pacientes como **Core clínico** con: listado paginado con filtros, modal de alta, vista de detalle/historial, y un buscador autocomplete reutilizable por otros flujos (Turnos, Atención).

Este spec cubre la implementación **full end-to-end** del feature Pacientes en el frontend administrativo, consumiendo directamente la API real del backend.

### En alcance

- Feature propio `features/pacientes/` (independiente de `analitica/`)
- Listado paginado con search server-side, filtros por estado (active/inactive/all) y por status (MIN/COMPLETE)
- Modal de alta y edición unificado con secciones expandibles (datos generales, contactos, direcciones, coberturas) — soporta múltiples items por sub-colección
- Validación async de DNI duplicado en alta usando `GET /exists?dni=`
- Página de detalle `/pacientes/:id` con tabs: Datos generales, Contactos, Direcciones, Coberturas, Historial (placeholder)
- Toggle soft-delete / reactivar desde fila y desde detalle
- Componente `PatientSearchAutocomplete` reutilizable, viviendo por ahora dentro del feature
- Catálogo local stub de planes de cobertura (no existe módulo financiero en el backend aún)
- Limpieza del código huérfano de Paciente dentro de `features/analitica/`

### Fuera de alcance

- Historial real de turnos / estudios (módulos no migrados)
- Médico derivante (módulo no migrado)
- Exportar listado (sin endpoint en backend)
- Portal del paciente
- Endpoint de catálogo de planes/obras sociales (se documenta como dependencia faltante)
- E2E con Playwright

### Decisiones acordadas en brainstorming

| Decisión | Valor |
|---|---|
| Alcance MVP | Full feature end-to-end |
| Origen de datos | Backend real ya disponible (`/api/v1/analitica/patients`) |
| Idioma de campos en TS | Inglés 1:1 con backend (sin mapper) |
| Ubicación | `features/pacientes/` (feature propio, no sub-feature de analitica) |
| Estado | NgRx clásico (actions/reducer/effects/selectors) |
| Edición | Mismo modal compartido con alta, modo create/edit |
| Detalle | Página propia ruteable `/pacientes/:id` con tabs |
| Multi-items en modal | Modal con secciones expandibles para contactos/direcciones/coberturas |
| Catálogo OS | Stub local hardcodeado en frontend (planIds 1..7) |
| Organización interna | Monolítica `models/services/store/pages/components` (Opción A) |

---

## 2. Contratos del backend consumidos

Base: `/api/v1/analitica/patients`

| Verbo | Path | Body / Params | Roles |
|---|---|---|---|
| POST | `/` | `CreatePatientRequest` | ADMINISTRADOR, SECRETARIA |
| PUT | `/{id}` | `UpdatePatientRequest` | ADMINISTRADOR, SECRETARIA |
| GET | `/` | `?state=active\|inactive\|all` → `PatientResponse[]` | autenticado |
| GET | `/{id}` | → `PatientResponse` | autenticado |
| GET | `/by-ids` | `?ids=1,2,3` → `PatientResponse[]` | autenticado |
| GET | `/exists` | `?dni=` → `{exists: boolean}` | autenticado |
| GET | `/dni/{dni}` | → `PatientResponse` | autenticado |
| PATCH | `/{id}` | `{deleted: boolean}` (toggle soft delete) | ADMINISTRADOR, SECRETARIA |
| GET | `/search` | `?q=&state=&status=&page=&size=` → `PaginatedPatientResponse` | autenticado |

**Notas del contrato:**
- `dni` es inmutable después de creación; `UpdatePatientRequest` no lo incluye
- `status` (MIN/COMPLETE/VERIFIED) se calcula en backend según completitud; el frontend no lo manda
- `PUT /{id}` reemplaza el patient completo (no es patch). El modal de edición envía el patient entero
- Headers `Authorization` y `X-Tenant-ID` los inyectan los interceptors existentes

---

## 3. Models

`features/pacientes/models/patient.model.ts`:

```ts
export type PatientStatus = 'MIN' | 'COMPLETE' | 'VERIFIED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED';
export type SexAtBirth = 'MALE' | 'FEMALE' | 'INTERSEX';
export type ContactType = 'EMAIL' | 'PHONE' | 'MOBILE';

export interface Contact {
  id?: number;
  contactValue: string;
  contactType: ContactType;
  isPrimary: boolean;
  active: boolean;
}

export interface Address {
  id?: number;
  city?: string;
  province?: string;
  street?: string;
  streetNumber?: string;
  apartment?: string;
  neighborhood?: string;
  zipCode?: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Coverage {
  id?: number;
  planId: number;
  memberNumber: string;
  isPrimary: boolean;
  active: boolean;
}

export interface Patient {
  id: number;
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;   // ISO yyyy-MM-dd
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  status: PatientStatus;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
  active: boolean;
}

export interface CreatePatientRequest {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  gender: Gender | null;
  sexAtBirth: SexAtBirth | null;
  contacts: Contact[];
  addresses: Address[];
  coverages: Coverage[];
}

export type UpdatePatientRequest = Omit<CreatePatientRequest, 'dni'>;
```

`features/pacientes/models/patient-page.model.ts`:

```ts
export type PatientStateFilter = 'active' | 'inactive' | 'all';

export interface PatientPageRequest {
  q?: string;
  state: PatientStateFilter;
  status?: PatientStatus;
  page: number;
  size: number;
}

export interface PatientPageResult {
  content: Patient[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

`features/pacientes/models/coverage-plans.catalog.ts`:

```ts
export interface CoveragePlanOption {
  planId: number;
  label: string;
}

export const COVERAGE_PLAN_CATALOG: readonly CoveragePlanOption[] = [
  { planId: 1, label: 'Particular' },
  { planId: 2, label: 'OSDE 210' },
  { planId: 3, label: 'OSDE 310' },
  { planId: 4, label: 'Swiss Medical' },
  { planId: 5, label: 'PAMI' },
  { planId: 6, label: 'IOMA' },
  { planId: 7, label: 'Galeno' },
];
```

> **Dependencia:** estos `planId` deben existir en la base del backend antes del primer alta con cobertura. Coordinar seeding (migración Flyway o data fixture) en el plan de implementación.

---

## 4. Service (capa HTTP)

`features/pacientes/services/patient.service.ts`, `providedIn: 'root'`:

```ts
@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/patients';

  search(req: PatientPageRequest): Observable<PatientPageResult> { /* GET /search */ }
  getById(id: number): Observable<Patient> { /* GET /{id} */ }
  getByIds(ids: number[]): Observable<Patient[]> { /* GET /by-ids?ids= */ }
  existsByDni(dni: string): Observable<boolean> { /* GET /exists, unwrap */ }
  create(req: CreatePatientRequest): Observable<Patient> { /* POST / */ }
  update(id: number, req: UpdatePatientRequest): Observable<Patient> { /* PUT /{id} */ }
  toggleActive(id: number, deleted: boolean): Observable<void> { /* PATCH /{id} */ }
}
```

Reglas:
- Sin mapping: la respuesta JSON cumple las interfaces TS directamente
- `existsByDni` desenvuelve `{ exists }` y devuelve `boolean`
- No atrapa errores: propagación al store y al global error handler

---

## 5. Store (NgRx clásico)

### State

```ts
export interface PatientState {
  items: Patient[];
  totalElements: number;
  totalPages: number;
  pageRequest: PatientPageRequest;
  loading: boolean;
  error: HttpErrorResponse | null;

  selected: Patient | null;
  selectedLoading: boolean;

  saving: boolean;
  saveError: HttpErrorResponse | null;
  dniCheck: { dni: string; exists: boolean } | null;
}

export const initialPatientState: PatientState = {
  items: [], totalElements: 0, totalPages: 0,
  pageRequest: { state: 'active', page: 0, size: 20 },
  loading: false, error: null,
  selected: null, selectedLoading: false,
  saving: false, saveError: null, dniCheck: null,
};

export const PATIENT_FEATURE_KEY = 'patients';
```

### Actions (grupos `createActionGroup`)

| Source | Acciones |
|---|---|
| `Patient/List` | `searchRequested({req})`, `searchSucceeded({result})`, `searchFailed({error})`, `pageRequestChanged({patch})` |
| `Patient/Detail` | `loadRequested({id})`, `loadSucceeded({patient})`, `loadFailed({error})`, `cleared()` |
| `Patient/Form` | `createRequested({req})`, `createSucceeded({patient})`, `updateRequested({id,req})`, `updateSucceeded({patient})`, `saveFailed({error})`, `formReset()` |
| `Patient/Dni` | `checkRequested({dni})`, `checkSucceeded({dni,exists})`, `checkFailed({error})` |
| `Patient/Toggle` | `toggleRequested({id,deleted})`, `toggleSucceeded({id,deleted})`, `toggleFailed({error})` |

### Reducer (reglas clave)
- `pageRequestChanged` merge-patchea `pageRequest`
- `searchSucceeded` reemplaza `items`, `totalElements`, `totalPages`
- `updateSucceeded` y `toggleSucceeded` mutan dentro de `items` por id sin recargar
- `createSucceeded` no inserta directamente: dispara una nueva búsqueda con el `pageRequest` vigente (en el effect)
- `loadSucceeded` setea `selected`
- `cleared` resetea `selected` y `selectedLoading`

### Effects

| Effect | Operador | Detalle |
|---|---|---|
| `search$` | `switchMap` con `debounceTime(300)` | sólo al `searchRequested` |
| `pageRequestPropagation$` | `concatLatestFrom` + `map` | `pageRequestChanged` → `searchRequested({req: mergedPageRequest})` |
| `loadDetail$` | `switchMap` | `getById` |
| `create$` | `exhaustMap` | bloquea doble submit; on success dispara `searchRequested` con state vigente |
| `update$` | `exhaustMap` | on success cierra modal (señal via selector `saving=false && !saveError`) |
| `toggle$` | `mergeMap` | múltiples toggles concurrentes permitidos |
| `checkDni$` | `switchMap` + `debounceTime(400)` + `distinctUntilChanged` | sólo si `dni.length >= 7` |

### Selectors

```
selectPatientFeature, selectPatientItems, selectPatientTotalElements,
selectPatientPageRequest, selectPatientLoading, selectPatientError,
selectSelectedPatient, selectSelectedLoading,
selectPatientSaving, selectPatientSaveError,
selectDniCheck(dni: string)   // factory
```

### Registro

`providePatientFeature()` exportada desde el feature:

```ts
export const providePatientFeature = () => [
  provideState(PATIENT_FEATURE_KEY, patientReducer),
  provideEffects([PatientEffects]),
];
```

Se aplica en `pacientes.routes.ts` a nivel array de rutas, así el store vive mientras se navega entre list y detail.

---

## 6. Routing y estructura de carpetas

```
features/pacientes/
├── models/
│   ├── patient.model.ts
│   ├── patient-page.model.ts
│   └── coverage-plans.catalog.ts
├── services/
│   └── patient.service.ts
├── store/
│   ├── patient.actions.ts
│   ├── patient.reducer.ts
│   ├── patient.effects.ts
│   ├── patient.selectors.ts
│   └── patient.state.ts
├── pages/
│   ├── patient-list/
│   │   └── patient-list.page.ts
│   └── patient-detail/
│       └── patient-detail.page.ts
├── components/
│   ├── patient-form-modal/
│   │   └── patient-form-modal.component.ts
│   ├── patient-search-autocomplete/
│   │   └── patient-search-autocomplete.component.ts
│   ├── contact-section/
│   │   └── contact-section.component.ts
│   ├── address-section/
│   │   └── address-section.component.ts
│   └── coverage-section/
│       └── coverage-section.component.ts
└── pacientes.routes.ts
```

`pacientes.routes.ts`:

```ts
export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    providers: [providePatientFeature()],
    children: [
      { path: '', loadComponent: () => import('./pages/patient-list/patient-list.page').then(m => m.PatientListPage) },
      { path: ':id', loadComponent: () => import('./pages/patient-detail/patient-detail.page').then(m => m.PatientDetailPage) },
    ],
  },
];
```

Registro en `app.routes.ts`:

```ts
{
  path: 'pacientes',
  canMatch: [authGuard],
  loadChildren: () => import('./features/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
}
```

---

## 7. UI/UX

### 7.1. `PatientListPage`

- Header: breadcrumb "Core clínico" → título "Pacientes" + acciones (Exportar disabled tooltip "Próximamente"; Nuevo paciente → abre modal)
- Toolbar de filtros: input search ("Buscar por nombre o DNI…"), chips de `state` (Todos/Activos/Inactivos), chip toggle de `status` (Mínimos/Completos)
- Card con `<p-table>` lazy server-side. Columnas: Paciente (avatar + nombre + género + edad), DNI (formateado), Fecha nac., Obra social (label de primary coverage resuelto vía catálogo), Teléfono (primary contact), Estado (badge MIN/COMPLETE), Acciones
- Acciones por fila: Ver detalle (router-link), Editar (modal), Toggle activo (confirm dialog si desactiva)
- Paginator del p-table dispara `pageRequestChanged({patch:{page,size}})`
- Empty state con `<ui-empty-state>` cuando `items.length === 0 && !loading`
- Skeleton rows mientras `loading`
- Botones mutadores condicionados por `canMutatePatients()` (lee del auth store existente)

### 7.2. `PatientFormModal`

- PrimeNG `<p-dialog>` centered, modal, ~720px
- Modo `create | edit` según input `[patient]`
- Reactive Forms con `FormBuilder`, sub-grupos y `FormArray` para contacts/addresses/coverages
- `<p-accordion multiple>` con 4 secciones:
  1. **Datos generales** (expandida): Apellido*, Nombre*, DNI* (disabled en edit, async validator en create on blur), Fecha nac.*, Género (select), Sexo registral (select). Indicador en vivo del status estimado
  2. **Contactos** (expandida en create): `<contact-section>` con add/remove, regla "exactamente uno con isPrimary+active"
  3. **Direcciones** (colapsada): `<address-section>` con add/remove
  4. **Coberturas** (colapsada): `<coverage-section>` con select desde `COVERAGE_PLAN_CATALOG`
- Footer: Cancelar + Guardar (label dinámico). Disabled si `saving`. Banner rojo arriba si `saveError`
- Edición desde tabs del detalle: abre el modal con la sección correspondiente pre-expandida y otras colapsadas, **único punto de mutación**

### 7.3. `PatientDetailPage`

- Header: back link, título "{lastName}, {firstName}", badge status, badge activo/inactivo, acciones Editar/Toggle
- Card resumen: DNI, fecha nac., edad calculada, género, sexo registral
- `<p-tabs>`:
  - **Datos generales** (más completa que el resumen)
  - **Contactos** — lista CRUD via modal
  - **Direcciones** — lista CRUD via modal
  - **Coberturas** — lista CRUD via modal, labels resueltos via catálogo
  - **Historial** — `<ui-empty-state>` placeholder
- Las pestañas de Contactos/Direcciones/Coberturas no editan inline: cada acción abre el modal con su sección, se persiste con PUT completo

### 7.4. `PatientSearchAutocomplete`

- PrimeNG `<p-autoComplete>` con `[suggestions]` ligado a signal local del componente
- `(completeMethod)` llama directo a `PatientService.search({q, state:'active', page:0, size:10})` — no contamina el store del listado
- Template del item: avatar (iniciales + color), "Apellido, Nombre", meta "DNI · género · edad · obra social primaria"
- Output `(selected)` emite el `Patient` completo
- Vive en `features/pacientes/components/`. Se moverá a `shared/` cuando aparezca un segundo consumidor

---

## 8. Permisos

Selector `canMutatePatients()` deriva de `selectAuthRoles` (existente) y retorna true si el rol incluye `ADMINISTRADOR` o `SECRETARIA`. Se usa para mostrar/ocultar botones de crear/editar/toggle. Defensivamente, si el 403 llega igual, se muestra toast "No tenés permisos para esta acción".

---

## 9. Errores

| Caso | Manejo |
|---|---|
| Error al listar/cargar detalle | `state.error` + toast informativo |
| Error al crear/editar | Banner inline en el modal, `saveError` en store, modal **no** se cierra |
| 409 al crear (DNI duplicado) | Mensaje específico debajo del input DNI |
| 404 al cargar detalle | Redirect a `/pacientes` con toast "Paciente no encontrado" |
| 403 al mutar | Toast "No tenés permisos" |
| Falla de red | Mismo trato que error HTTP genérico |

Si no existe un `ErrorToastService` shared, se crea uno mínimo dentro de `shared/ui/services/` como parte de este feature.

---

## 10. Accesibilidad

- Modal con `role="dialog"`, foco al primer input al abrir, `Escape` cierra, retorno de foco al trigger
- Tabla con headers semánticos, botones de fila con `aria-label`
- Filter chips son `button` con `aria-pressed`
- Badges con `aria-label` legible
- Mensajes de error vinculados con `aria-describedby` al input correspondiente

---

## 11. i18n / formato

- Labels en español
- Fechas: mostrar `dd/MM/yyyy` con `DatePipe`, enviar al backend en `yyyy-MM-dd`
- DNI: pipe nuevo `DniPipe` en `shared/pipes/` para mostrar (`32.456.789`), sanitización numérica al enviar
- Edad: pipe nuevo `AgePipe` en `shared/pipes/` que recibe `birthDate` y retorna años

---

## 12. Testing (Vitest)

| Capa | Cobertura |
|---|---|
| Service | `HttpTestingController` por método (search con params, exists unwrap, manejo de errores) |
| Reducer | Tests puros por acción crítica (`searchSucceeded`, `updateSucceeded` reemplaza por id, `toggleSucceeded` muta solo el id afectado) |
| Effects | `provideMockActions` para `search$` (debounce), `create$` (exhaustMap), `checkDni$` (debounce + distinct) |
| Selectors | Selector factory `selectDniCheck` |
| Componentes | Smoke render + 1 interacción clave: `PatientListPage` (dispatch de filtros), `PatientFormModal` (async DNI dispara checkDni; submit create vs edit), `PatientSearchAutocomplete` (emite `selected`) |
| E2E | Fuera de scope |

---

## 13. Limpieza del código viejo

Tareas de cleanup obligatorias en el plan de implementación:

1. Borrar `src/app/features/analitica/pages/pacientes/` (carpeta completa)
2. Quitar `Paciente` de `src/app/features/analitica/models/analitica.model.ts`
3. Quitar acciones/effects/reducer/selectors de `loadPacientes*` en `features/analitica/store/`
4. Quitar el método `getPacientes()` del `AnaliticaService`
5. Si el sidebar tiene un item "Pacientes" apuntando a `analitica/pacientes`, re-rutearlo a `/pacientes`
6. Si `app.routes.ts` referencia la ruta vieja, eliminarla

---

## 14. Dependencias y riesgos

| Riesgo | Mitigación |
|---|---|
| Backend no tiene catálogo de planes/obras sociales | Stub local con planIds 1..7. Coordinar seeding de planes en backend antes de habilitar coberturas en producción |
| Backend espera `planId: Long` válido — alta con cobertura falla si el plan no existe en DB | Antes de mergear, ejecutar migración seed con los planIds del catálogo |
| `PUT` reemplaza patient completo | El modal carga el patient actual y reenvía todo; tener cuidado al editar desde tabs (siempre cargar `selected` antes de abrir modal) |
| Roles del frontend ≠ roles backend | Validar nombres exactos contra `JwtTenantResolver` / claim de rol |

---

## 15. Definition of Done

- [ ] Estructura de carpetas `features/pacientes/` creada según sección 6
- [ ] Models, service, store completos según secciones 3-5
- [ ] `PatientListPage` con filtros, paginación server-side y acciones funcionando contra `/search`
- [ ] `PatientFormModal` con accordion completo y validación async DNI en create
- [ ] `PatientDetailPage` con tabs (Historial como placeholder)
- [ ] `PatientSearchAutocomplete` funcional (sin consumidor externo todavía)
- [ ] Toggle soft-delete con confirm dialog
- [ ] Catálogo `COVERAGE_PLAN_CATALOG` y seed coordinado en backend
- [ ] Limpieza completa de código viejo (sección 13)
- [ ] Permisos por rol aplicados a botones mutadores
- [ ] Pipes `DniPipe` y `AgePipe` en `shared/pipes/`
- [ ] Tests unitarios de service, reducer, effects, selector factory y smoke de componentes clave
- [ ] `ng build` sin errores; `ng test` (Vitest) verde
