# Obras Sociales — Pantallas frontend con datos mock (diseño)

- **Fecha:** 2026-05-30
- **Proyecto:** `FRONTEND-LABORATORIO` (Angular 21 + PrimeNG 21 + Tailwind 4 + NgRx clásico)
- **Rama:** `feat/obras-sociales-mock` (worktree `.worktrees/obras-sociales-mock`, basada en `origin/development`)
- **Estado backend:** sin endpoints para obras sociales/coberturas → **todo mockeado en el frontend**, con el mock aislado en el límite del servicio para enchufar el backend después.

## 1. Objetivo

Implementar tres pantallas administrativas de **Obras Sociales** en el frontend, portando la funcionalidad del laboratorio viejo (sistema distribuido `2025-PIV-TPI-LCC-FE`, carpeta `coverage-administration`) pero adaptadas a las convenciones y al estilo visual del sistema actual (monolito):

1. **Listado** — tabla, imitando `pacientes` (`patient-list.page.ts`).
2. **Alta** — stepper de creación, imitando el stepper de `patient-form`.
3. **Detalle** — vista con tabs (solo lectura), imitando `patient-detail.page.ts`.

## 2. Alcance

### Dentro
- Listado de obras sociales en `p-table` con búsqueda, filtro de estado y de tipo, paginación y acción "Ver detalle".
- Stepper de alta de 3 pasos (Aseguradora → Planes y convenios → Resumen) con Reactive Forms y persistencia en memoria.
- Detalle **solo lectura** con 4 tabs: Información, Contactos, Planes y convenios, Convenios (historial).
- Capa de datos NgRx clásico (actions/effects/reducer/selectors/state) con un **servicio mock** que devuelve `Observable` desde un store en memoria.
- Catálogos mock: tipos de aseguradora, versiones NBU, tipos de contacto.
- Datos semilla (5–8 obras sociales con planes/convenios/contactos).

### Fuera (YAGNI)
- Endpoints/HTTP reales.
- Edición y borrado dentro de las tabs del detalle (es solo lectura).
- Settlement, reporting, billing, dashboards del lab viejo.
- Export Excel/PDF y toggle activar/desactivar en el listado (fáciles de sumar luego; se dejan los huecos).
- Tests E2E.

## 3. Decisiones de diseño (cerradas con el usuario)

| # | Decisión | Elección |
|---|----------|----------|
| 1 | Capa de datos mock | **NgRx clásico + servicio mock** (mock en el límite del servicio; swap = tocar solo el servicio) |
| 2 | Presentación del listado | **Tabla PrimeNG `p-table`** (patrón `pacientes`) |
| 3 | Ubicación / navegación | **Scaffold existente** `features/obras-sociales/`; el ítem de menú **ya existe** en `sidebar.nav.ts` |
| 4 | Interactividad del detalle | **Solo lectura**, 4 tabs |
| 5 | Modelos | Portados del lab = **fuente de verdad solo para el mock**; cambiarán cuando el backend monolito consolide los DTOs |
| 6 | Stepper | Header custom + signals + Reactive Forms (patrón `patient-form`), **no** `p-stepper` |

## 4. Estructura de carpetas

Sigue la convención del proyecto (`features/<feature>/{models,services,store,pages,components}` + `<feature>.routes.ts`) y la skill `angular-conventions`.

```
src/app/features/obras-sociales/
├── obras-sociales.routes.ts            # EXPANDIR (hoy solo placeholder)
├── models/
│   ├── insurer.model.ts                # Insurer, InsurerComplete, InsurerSummary, SpecificData
│   ├── plan.model.ts                   # Plan, PlanComplete
│   ├── agreement.model.ts              # Agreement
│   ├── contact-info.model.ts           # InsurerContactInfo, ContactType
│   ├── catalogs.model.ts               # InsurerType, NbuVersion, NbuOption
│   ├── wizard.model.ts                 # WizardCreate, PlanWithAgreement, etc.
│   └── obra-social-page.model.ts       # PageRequest / PageResult (estilo patient-page.model.ts)
├── services/
│   ├── mock-data.ts                    # arrays semilla (insurers completos, NBU, tipos, contact-types)
│   ├── obra-social.service.ts          # store en memoria + métodos Observable (search/getById/createFromWizard/catálogos)
├── store/
│   ├── obra-social.state.ts
│   ├── obra-social.actions.ts
│   ├── obra-social.reducer.ts
│   ├── obra-social.effects.ts
│   └── obra-social.selectors.ts
├── pages/
│   ├── obras-sociales-list/            # PANTALLA 1 — reemplaza el placeholder
│   │   └── obras-sociales-list.page.ts
│   ├── obra-social-form/               # PANTALLA 2 — stepper de alta
│   │   ├── obra-social-form.page.ts
│   │   ├── obra-social-form-steps.ts
│   │   ├── components/form-stepper-header/   # header de pasos (reusar/clonar el de patient-form)
│   │   └── steps/
│   │       ├── aseguradora-step/aseguradora-step.component.ts
│   │       ├── planes-step/planes-step.component.ts
│   │       └── resumen-step/resumen-step.component.ts
│   └── obra-social-detail/             # PANTALLA 3 — detalle 4 tabs
│       └── obra-social-detail.page.ts
└── components/                         # piezas reutilizables si hacen falta (badges, tablas internas)
```

> Borrar el placeholder `pages/obras-sociales/obras-sociales.page.ts` (empty-state) tras mover su ruta a la nueva list page.

## 5. Modelos (TypeScript)

Portados del lab y alineados a la convención del proyecto: interfaces `PascalCase`, camelCase en campos, enums como `type` unión de literales. **Correcciones respecto del lab:** se corrige `autorizationUrl` → `authorizationUrl` y se camelCasean los campos anidados de `specificData` (`copay_policy` → `copayPolicy`, `accepted_payment_methods` → `acceptedPaymentMethods`). Se documenta que el contrato backend real podrá renombrar.

```typescript
// insurer.model.ts
export type InsurerTypeCode = 'SOCIAL' | 'PRIVATE' | 'SELF_PAY';

export interface InsurerSummary {        // fila del listado
  id: number;
  code: string;
  acronym: string;
  name: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;               // ej. "Obra Social"
  active: boolean;
}

export interface InsurerComplete {       // detalle + creación
  id: number;
  code: string;
  name: string;
  acronym: string;
  insurerType: InsurerTypeCode;
  insurerTypeName: string;
  description?: string;
  authorizationUrl?: string;
  active: boolean;
  specificData?: SpecificData | null;
  plans: PlanComplete[];
  contacts: InsurerContactInfo[];
}

// specificData según tipo (uno no-nulo por aseguradora)
export interface SpecificData {
  socialHealth?: { cuit: string } | null;          // SOCIAL
  privateHealth?: { cuit: string; copayPolicy: string } | null;  // PRIVATE
  selfPay?: { acceptedPaymentMethods: string } | null;           // SELF_PAY
}
```

```typescript
// plan.model.ts
export interface PlanComplete {
  id: number;
  insurerId: number;
  insurerName: string;
  code: string;
  acronym: string;
  name: string;
  description?: string;
  isActive: boolean;
  iva: number;                            // %
  actualAgreements: Agreement[];          // convenios vigentes
}

// agreement.model.ts
export interface Agreement {
  id: number;
  insurerPlanId: number;
  insurerPlanName?: string;
  versionNbu: number;                     // id de NbuVersion
  requiresCopayment: boolean;
  coveragePercentage: number;             // 0-100
  ubValue: number;                        // > 0
  validFromDate: string;                  // ISO yyyy-MM-dd
  validToDate?: string | null;
}
```

```typescript
// contact-info.model.ts
export type ContactTypeCode = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'WEBSITE';
export interface InsurerContactInfo {
  id: number;
  insurerId: number;
  contactType: ContactTypeCode;
  contact: string;
  isActive: boolean;
}
export interface ContactType { name: ContactTypeCode; description: string; }

// catalogs.model.ts
export interface InsurerType { name: InsurerTypeCode; description: string; }
export interface NbuVersion {
  id: number;
  versionCode: string;                    // ej. "2021_2024"
  publicationYear: number;
  effectivityDate: string;                // ISO
}
export interface NbuOption { label: string; value: number; }  // para selects
```

```typescript
// wizard.model.ts — payload de creación (mapea al futuro POST /wizard)
export interface WizardCreate {
  insurer: {
    code: string; name: string; acronym: string;
    insurerType: InsurerTypeCode;
    description?: string; authorizationUrl?: string;
    specificData: SpecificData | null;
  };
  plans: PlanWithAgreement[];
  contacts: { contactType: ContactTypeCode; contact: string }[];
}
export interface PlanWithAgreement {
  plan: { code: string; acronym: string; name: string; iva: number; description?: string };
  agreement: {
    versionNbu: number; requiresCopayment: boolean;
    coveragePercentage: number; ubValue: number; validFromDate: string;
  };
}

// obra-social-page.model.ts — estilo patient-page.model.ts
export type InsurerStateFilter = 'active' | 'inactive' | 'all';
export interface ObraSocialPageRequest {
  q?: string;
  state: InsurerStateFilter;
  insurerType?: InsurerTypeCode;
  page: number;
  size: number;
}
export interface ObraSocialPageResult {
  content: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
```

## 6. Capa de datos — NgRx clásico + servicio mock

Se aplica la skill `ngrx-backend-request` (NgRx clásico: `createAction` + `createReducer` + `createEffect` + selectors; mutaciones pessimistic; `selectSignal` en componentes; sin `@ngrx/entity`). La **única** diferencia con una feature normal es que el servicio devuelve datos mock en vez de HTTP.

### 6.1 Servicio mock (`obra-social.service.ts`)
- `@Injectable({ providedIn: 'root' })`.
- Mantiene un **array en memoria** `InsurerComplete[]` (inicializado desde `mock-data.ts`) → da **persistencia durante la sesión**: lo que se crea aparece en listado y detalle.
- Métodos (todos devuelven `Observable`, con `delay(300)` opcional para simular latencia):
  - `search(req: ObraSocialPageRequest): Observable<ObraSocialPageResult>` — filtra (q por nombre/sigla/código, state, insurerType), ordena, pagina en memoria y proyecta a `InsurerSummary`.
  - `getCompleteById(id: number): Observable<InsurerComplete>` — busca en memoria; error tipado si no existe.
  - `createFromWizard(payload: WizardCreate): Observable<InsurerComplete>` — arma un `InsurerComplete` (asigna ids fake incrementales a insurer/planes/convenios/contactos, deriva `insurerTypeName`, `active = true`), lo agrega al array y lo devuelve.
  - `getInsurerTypes(): Observable<InsurerType[]>`, `getNbuVersions(): Observable<NbuVersion[]>`, `getContactTypes(): Observable<ContactType[]>` — catálogos estáticos.
- **Swap a backend:** reemplazar el cuerpo de cada método por `this.http.get/post(...)`. Firmas y tipos no cambian → el store/effects/componentes quedan igual.

### 6.2 Store slice (`store/`)
```typescript
// obra-social.state.ts
export interface ObraSocialState {
  items: InsurerSummary[];
  totalElements: number;
  totalPages: number;
  pageRequest: ObraSocialPageRequest;     // default { state:'active', page:0, size:20 }
  selected: InsurerComplete | null;
  insurerTypes: InsurerType[];
  nbuVersions: NbuVersion[];
  contactTypes: ContactType[];
  pending: boolean;                        // listado/detalle
  creating: boolean;                       // alta
  error: string | null;
}
```
- **Actions** (`createAction` + `props`):
  - `setObraSocialPageRequest({ patch })`
  - `loadObrasSociales({ req })` / `...Success({ result })` / `...Failure({ error })`
  - `loadObraSocial({ id })` / `...Success({ insurer })` / `...Failure({ error })`
  - `createObraSocial({ payload })` / `...Success({ insurer })` / `...Failure({ error })`
  - `loadCatalogs()` / `...Success({ insurerTypes, nbuVersions, contactTypes })` / `...Failure`
- **Effects** (`createEffect`): un efecto de propagación `setPageRequest → loadObrasSociales` (igual que pacientes), `loadObrasSociales$ → service.search`, `loadObraSocial$ → service.getCompleteById`, `createObraSocial$ → service.createFromWizard` (al success: navega a `/obras-sociales` y notifica), `loadCatalogs$`. Errores → `NotificationService.error(...)` con mensaje **en español, user-friendly** (ver §14).
- **Selectors:** `selectItems`, `selectTotal`, `selectPageRequest`, `selectPending`, `selectCreating`, `selectSelected`, `selectInsurerTypes`, `selectNbuOptions` (deriva `NbuOption[]`), `selectContactTypes`.
- **Registro:** `provideState(obrasSocialesFeature)` + `provideEffects(ObraSocialEffects)` en `providers` de la ruta padre de `obras-sociales.routes.ts` (igual que pacientes registra su feature a nivel ruta).

## 7. Pantalla 1 — Listado (`obras-sociales-list.page.ts`)

Patrón de `patient-list.page.ts`: componente standalone, single-file (template inline), `OnPush`, datos vía `store.selectSignal(...)`.

- **Header (Tailwind flex):** breadcrumb "Gestión" (muted) + `<h1><i class="pi pi-id-card"></i> Obras Sociales</h1>` + a la derecha botón **"Nueva obra social"** (`pi pi-plus`) → `routerLink ['/obras-sociales','nueva']`. (Botón "Exportar" deshabilitado con tooltip "Próximamente", como pacientes — opcional.)
- **Toolbar:** input de búsqueda con ícono (`pi pi-search`, debounce 300ms via `Subject`); botones de filtro de **estado** (Activas / Inactivas / Todas, severidad dinámica, igual que pacientes); `p-select` (dropdown) de filtro por **tipo** (opción "Todas" + las de `selectInsurerTypes`: Obra Social, Prepaga, Particular).
- **Tabla `p-table`:** `[lazy]="true"`, `[paginator]="true"`, `[rows]="pageRequest().size"`, `[totalRecords]="total()"`, `[first]`, `[loading]="pending()"`, `(onLazyLoad)="onPage($event)"`, `dataKey="id"`.
  - **Columnas:** Código · Sigla · Nombre · Tipo (`insurerTypeName`) · Estado (`p-tag` con severidad: activa=success / inactiva=danger) · Acciones (alineado a la derecha).
  - **Acción de fila:** botón ícono `pi pi-eye` (text) → `routerLink ['/obras-sociales', os.id]` ("Ver detalle"). (Editar/toggle quedan fuera por alcance.)
  - **Empty:** `<ui-empty-state heading="Sin obras sociales" icon="pi-id-card" ctaLabel="Nueva obra social">` con link a `nueva`.
- **Flujo de datos:** la página despacha `setObraSocialPageRequest({patch})` ante búsqueda/filtro/paginación; el efecto de propagación dispara `loadObrasSociales`. En `ngOnInit` también despacha `loadCatalogs()` (para el filtro de tipos).

## 8. Pantalla 2 — Stepper de alta (`obra-social-form.page.ts`)

Patrón de `patient-form`: **header de pasos custom** (`FormStepperHeaderComponent`, reusar/clonar), navegación por **signals** (`currentStep`, `visited`), **Reactive Forms** con `FormGroup` raíz que tiene un sub-grupo/array por paso. `ConfirmationService` de PrimeNG para confirmar guardado. `OnPush`.

**FormGroup raíz:**
```typescript
form = fb.group({
  aseguradora: fb.group({
    code:        ['', [Validators.required, Validators.maxLength(20)]],
    name:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    acronym:     ['', [Validators.required, Validators.maxLength(10)]],
    insurerType: ['SOCIAL' as InsurerTypeCode, Validators.required], // opciones: SOCIAL | PRIVATE
    cuit:        ['', [Validators.required, Validators.pattern(/^\d{2}-?\d{8}-?\d$/)]],
    authorizationUrl: ['', [Validators.maxLength(255)]],
    description:      ['', [Validators.maxLength(255)]],
    // contactos opcionales
    phone: [''],
    email: ['', [Validators.email]],
  }),
  planes: fb.array<FormGroup>([]),   // al menos 1
});
```

**Paso 1 — Aseguradora** (`aseguradora-step`): campos del grupo `aseguradora`. El tipo ofrece **Obra Social (SOCIAL)** y **Prepaga (PRIVATE)** (igual que el lab; `SELF_PAY` no se crea por acá). `cuit` requerido para ambos. Validación en vivo; `step0Valid` (computed) habilita "Continuar".

**Paso 2 — Planes y convenios** (`planes-step`): formulario para agregar planes uno a uno → cada uno empuja un `FormGroup` al `FormArray planes`:
```
code (req, max20) · acronym (req, max10) · name (req, 3-100) ·
validFromDate (req, date) · versionNbu (req, p-select desde selectNbuOptions) ·
ubValue (req, > 0) · coveragePercentage (req, 0-100) · iva (req, 0-100) · description? (max255)
```
Tabla `p-table` con los planes agregados (editar/eliminar **local**, dentro del stepper). Validación: ≥ 1 plan → habilita "Continuar". Validaciones de unicidad de `code`/`name`/`acronym` entre planes agregados.

**Paso 3 — Resumen** (`resumen-step`): vista solo lectura de aseguradora + contactos + tabla de planes (con pipes de fecha/moneda/porcentaje y label de NBU). Botón **"Guardar"** → `confirm.confirm({ header:'Confirmar guardado', message:'¿Guardar la obra social y sus planes?' , accept })` → arma `WizardCreate` y despacha `createObraSocial({payload})`. El efecto persiste en memoria, notifica éxito y navega a `/obras-sociales` (la nueva OS ya aparece en el listado).

**Botonera (footer):** "Cancelar" (paso 1, con confirm si hay cambios) / "Volver" / "Continuar" (deshabilitado si el paso no es válido) / "Guardar" (paso 3).

## 9. Pantalla 3 — Detalle (`obra-social-detail.page.ts`)

Patrón de `patient-detail.page.ts`: carga por id (`loadObraSocial`), `selectSignal(selectSelected)`, `OnPush`, **PrimeNG 21 `p-tabs`** (API nueva: `p-tabs`/`p-tablist`/`p-tab`/`p-tabpanels`/`p-tabpanel`). **Solo lectura.**

- **Header:** breadcrumb + nombre de la OS + `p-tag` de estado + botón "Volver" (`/obras-sociales`).
- **Tab "Información"** (`value="info"`, default): código, nombre, sigla, tipo (humanizado), URL de autorización, descripción + **dato específico según tipo** (SOCIAL/PRIVATE: CUIT; PRIVATE: política de copago; SELF_PAY: medios de pago aceptados). Render como lista label/valor.
- **Tab "Contactos"** (`value="contacts"`): lista de contactos (`p-tag` con tipo + valor; badge "Inactivo" si corresponde). **Se oculta si `insurerType === 'SELF_PAY'`** (igual al lab). Empty-state si no hay.
- **Tab "Planes y convenios"** (`value="plans"`): `p-table` de planes (Código · Nombre · Sigla · Vigente desde · Versión NBU · Valor U.B. · % Cobertura · IVA · Estado). Pipes de fecha/moneda/porcentaje. Empty-state si no hay.
- **Tab "Convenios"** (`value="history"`): selector de plan (`p-select`, autoselecciona el primero) + rango de fechas (opcional) + `p-table` de convenios del plan (Versión NBU · Valor U.B. · % Cobertura · Vigente desde · Vigente hasta [— si null]).

## 10. Routing (`obras-sociales.routes.ts`)

```typescript
export const OBRAS_SOCIALES_ROUTES: Routes = [
  {
    path: '',
    providers: [provideState(obrasSocialesFeature), provideEffects(ObraSocialEffects)],
    children: [
      { path: '',      loadComponent: () => import('./pages/obras-sociales-list/obras-sociales-list.page').then(m => m.ObrasSocialesListPage) },
      { path: 'nueva', loadComponent: () => import('./pages/obra-social-form/obra-social-form.page').then(m => m.ObraSocialFormPage) },
      { path: ':id',   loadComponent: () => import('./pages/obra-social-detail/obra-social-detail.page').then(m => m.ObraSocialDetailPage) },
    ],
  },
];
```
- Sin cambios en `app.routes.ts` (ya hace `loadChildren` de `OBRAS_SOCIALES_ROUTES`).

## 11. Navegación

**Sin cambios.** El ítem ya existe en `src/app/layout/sidebar/sidebar.nav.ts`:
`{ kind: 'link', label: 'Obras Sociales', icon: 'pi pi-id-card', path: '/obras-sociales' }` (sección "Gestión").

## 12. Estilo visual

Se aplica la skill **`laboratory-ui`** (obligatoria para UI) en implementación. Convenciones del proyecto:
- **Tailwind utilities + PrimeNG** (no SCSS/BEM por componente, como hace `pacientes`).
- Tokens CSS (`--brand-*`, `--ds-*`, `--space-*`), tipografía Montserrat 14px, white-label por tenant.
- Pipes reutilizados: `DateEsPipe` (o `date:'dd/MM/yyyy'`), `CurrencyArPipe` para Valor U.B.; helper `humanizeInsurerType(code)` para los labels (`SOCIAL`→"Obra Social", `PRIVATE`→"Prepaga", `SELF_PAY`→"Particular"); porcentajes con sufijo "%".
- Estados con `p-tag` (success/danger). Loading con el skeleton de `p-table` / `pending()`.

## 13. Datos mock semilla (`mock-data.ts`)

5–8 `InsurerComplete` representativas:
- Mezcla de tipos: varias SOCIAL (ej. IOMA, OSDE como SOCIAL/PRIVATE según corresponda), PRIVATE (Swiss Medical, Galeno), al menos una SELF_PAY (Particular) y alguna `active:false` para probar el filtro.
- Cada una con 1–3 planes, cada plan con 1–N convenios (algunos con `validToDate` para el historial), y 1–3 contactos (PHONE/EMAIL/WHATSAPP/WEBSITE), salvo SELF_PAY sin contactos.
- Catálogos: `INSURER_TYPES` (3), `NBU_VERSIONS` (3–4, ej. 2012_2016 / 2017_2020 / 2021_2024), `CONTACT_TYPES` (4).

## 14. Manejo de errores / notificaciones

- Errores de los efectos → `NotificationService` (toast PrimeNG) con mensajes **en español, user-friendly**, sin leak de detalles internos (regla de proyecto / memoria `feedback_error_messages`). Ej.: "No se pudieron cargar las obras sociales.", "No se encontró la obra social.", "No se pudo crear la obra social.".

## 15. Testing (Vitest)

Siguiendo la convención del proyecto (specs de reducers/effects/selectors en `pacientes`):
- **Reducer:** transiciones de cada action (set page request, load success/failure, create success agrega y resetea `creating`).
- **Selectors:** `selectNbuOptions` deriva bien; proyección de filtros.
- **Service mock:** `search` filtra por q/state/insurerType y pagina; `createFromWizard` agrega y `getCompleteById` lo recupera.
- (Opcional) **Effects:** con `provideMockActions`, que `loadObrasSociales$` llame al service y emita success.

## 16. Setup git (hecho)

- Rama `feat/obras-sociales-mock` creada **desde `origin/development`**.
- Worktree aislado en `.worktrees/obras-sociales-mock`.

## 17. Riesgos y notas

- **Los modelos cambiarán:** el lab viejo era distribuido (microservicios); este es un monolito → los DTOs probablemente se consoliden/renombren al implementar el backend. El mock se mantiene aislado en el servicio para minimizar el costo del cambio.
- **NBU vive en otro dominio** (en el lab, `/v1/analysis/nbu/versions`): por ahora es catálogo mock; al haber backend podría venir de otro módulo del monolito.
- **`p-table` lazy con datos en memoria:** la paginación/orden se resuelven en el servicio mock (cliente), respetando la misma firma que tendría el `search` server-side.
- **Plan de swap a backend:** cuando existan endpoints, aplicar la skill `ngrx-backend-request` y reemplazar solo los cuerpos de los métodos del servicio (de `of(...)` a `http`). El resto del slice y las pantallas no cambian.
```
