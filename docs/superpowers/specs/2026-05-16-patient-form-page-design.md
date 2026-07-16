# Pantalla dedicada para alta/edición de paciente

## Contexto

Hoy el alta y la edición de pacientes ocurren en `<pat-form-drawer>`, un drawer
lateral montado desde `PatientListPage`. El drawer es angosto, requiere scroll
vertical, y mezcla la lista con el form en la misma URL — no es deep-linkable y
limita el espacio disponible para futuras secciones.

Se reemplaza el drawer por **páginas dedicadas** con rutas propias, conservando
las secciones y validaciones del form actual.

## Decisiones

- **Routing dedicado:** `/pacientes/nuevo` (alta) y `/pacientes/:id/editar`
  (edición). La ruta `/pacientes/:id` sigue siendo solo lectura (detalle).
- **Botón "Volver":** esquina superior izquierda, navega siempre a `/pacientes`
  (lista). Destino fijo y predecible.
- **Post-guardado exitoso:** redirige a `/pacientes`.
- **Layout:** grilla de 2 columnas para aprovechar el ancho del shell y
  minimizar scroll vertical. Las 4 secciones quedan visibles en un viewport
  de ~1280px sin scroll (o con scroll mínimo). Esto está pensado para una
  secretaria que usa la pantalla a diario y necesita ver el estado completo
  del paciente de un vistazo.
  - Columna izquierda: **Datos personales** (arriba) + **Contacto** (abajo).
  - Columna derecha: **Cobertura** (arriba) + **Dirección** (abajo).
  - Contenedor con `max-w-screen-2xl mx-auto` para soportar pantallas anchas
    sin estirar campos infinitamente.
- **Atajos de teclado** (para uso intensivo diario):
  - `Esc` → equivalente a "Volver" (con guard de cambios si dirty).
  - `Ctrl+S` → submit del form.
- **Footer sticky** al pie del shell con estado del form ("Cambios sin
  guardar" / "Sin cambios" / "Guardando…"), atajo visible, y botones
  Cancelar + Guardar. Siempre accesible sin scroll, crítico para que la
  secretaria no pierda contexto.
- **Guard de cambios sin guardar:** al clickear "Volver" o "Cancelar" con
  `form.dirty === true`, abrir `p-confirmDialog` con opciones "Descartar
  cambios" / "Seguir editando". Si el form está limpio, navegar directo.

## Arquitectura

### Componentes nuevos

**`pages/patient-form/patient-form.page.ts`**

Page wrapper. Responsable de:

- Leer la ruta y determinar modo (`create` vs `edit`) y el `id` si aplica.
- En modo `edit`, hidratar el form desde el store (`selectPatientById`); si no
  está cacheado, despachar la carga.
- Renderizar el header sticky con botón "Volver" + título dinámico.
- Manejar el guard de descarte de cambios.
- Suscribirse a las actions `addPatientSuccess` / `updatePatientSuccess` (o al
  cambio de `pending` + ausencia de `error`) para redirigir a `/pacientes`
  tras un guardado exitoso.

**Reuso del form:** la lógica del `FormGroup` y los subcomponentes
`ContactSectionComponent`, `AddressSectionComponent`, `CoverageSectionComponent`
ya están extraídos. Se opta por **mover el FormGroup directamente a la page**
(no crear un wrapper componente de form) porque:

- Es el único consumidor del form.
- Evita una capa intermedia que solo reexporta props.
- El template de la page queda autocontenido y fácil de leer.

### Archivos modificados

**`pacientes.routes.ts`**

```ts
export const PACIENTES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./pages/patient-list/...').then(m => m.PatientListPage) },
  { path: 'nuevo', loadComponent: () => import('./pages/patient-form/...').then(m => m.PatientFormPage) },
  { path: ':id/editar', loadComponent: () => import('./pages/patient-form/...').then(m => m.PatientFormPage) },
  { path: ':id', loadComponent: () => import('./pages/patient-detail/...').then(m => m.PatientDetailPage) },
];
```

El orden importa: `nuevo` y `:id/editar` antes de `:id` para que `nuevo` no
matchee como id y `editar` se priorice correctamente.

**`pages/patient-list/patient-list.page.ts`**

- Eliminar imports y uso de `PatientFormDrawerComponent`.
- Eliminar signals `drawerOpen` y `editing` y los handlers `openCreate`,
  `openEdit`, `onDrawerClosed`.
- Botón "Nuevo paciente" pasa a `[routerLink]="['/pacientes', 'nuevo']"`.
- Botón icono "Editar" en cada fila pasa a `[routerLink]="['/pacientes', p.id, 'editar']"`.
- El empty-state ctaClick también navega a `/pacientes/nuevo`.

### Archivos eliminados

- `components/patient-form-drawer/patient-form-drawer.component.ts`
- `components/patient-form-drawer/patient-form-drawer.component.spec.ts`

La carpeta `patient-form-drawer/` queda vacía y se elimina.

## Layout

Renderiza dentro del `AdminShellComponent` existente (topbar oscuro + sidebar
oscuro con `Pacientes` activo). El area de contenido se compone de tres
zonas verticales:

```
┌── Topbar (shell) ────────────────────────────────────────────────────┐
├── Sidebar ──┬── Page header (sticky) ───────────────────────────────┤
│  Inicio     │  [← Volver]  Editar paciente · Pérez, María   Pacientes › Editar │
│  Analítica  ├── Form area (scroll si hace falta) ───────────────────┤
│ ▸Pacientes  │  ┌─────────────────────┐  ┌─────────────────────┐    │
│  Turnos     │  │ Datos personales    │  │ Cobertura           │    │
│  ...        │  │ [nombre][apellido]  │  │ [obra social][plan] │    │
│             │  │ [dni]  [fecha nac]  │  │ [afiliado] [venc]   │    │
│             │  │ [género][sexo]      │  │ + Agregar cobertura │    │
│             │  ├─────────────────────┤  ├─────────────────────┤    │
│             │  │ Contacto            │  │ Dirección           │    │
│             │  │ [tipo][valor] ✕     │  │ [calle][nro]        │    │
│             │  │ + Agregar           │  │ [ciudad][provincia] │    │
│             │  └─────────────────────┘  └─────────────────────┘    │
│             ├── Form footer (sticky bottom) ─────────────────────────┤
│             │  ● Cambios sin guardar      Ctrl+S    [Cancelar][💾 Guardar] │
└─────────────┴────────────────────────────────────────────────────────┘
```

- **Page header (sticky):** fondo `bg-surface-0`, borde inferior. A la
  izquierda `p-button` text con `icon="pi pi-arrow-left"` label "Volver".
  Luego el título del modo ("Nuevo paciente" / "Editar paciente · Apellido,
  Nombre" cuando hay paciente cargado). A la derecha, breadcrumb
  `Pacientes › Editar`.
- **Form area:** grilla CSS `grid-cols-1 lg:grid-cols-2 gap-4`, contenedor
  `max-w-screen-2xl mx-auto p-6`. Cada sección es una card
  (`bg-surface-0 border rounded-lg p-4`).
- **Form footer (sticky bottom):** `position: sticky; bottom: 0;` con
  estado del form a la izquierda (signal `formStatusLabel` computed sobre
  `pristine` / `dirty` / `pending`), atajo `Ctrl+S` visible, y a la derecha
  `Cancelar` (secundario) + `Guardar` (primario, `[loading]="pending()"`).

## UX para uso intensivo (secretaría)

La pantalla está pensada para una secretaria que la usa varias veces por día.
Decisiones que apuntan a velocidad y bajo error:

- **Todas las secciones visibles a la vez** (2 columnas) → menos scroll,
  menos pérdida de contexto.
- **Footer sticky** con estado y atajo → siempre sabe si tiene cambios sin
  guardar y puede cerrar la operación sin buscar el botón.
- **Atajos de teclado:** `Ctrl+S` para guardar y `Esc` para volver. Listener
  global en la page con `@HostListener('document:keydown', ...)`.
- **Foco inicial al primer campo** (`nombre` en create, primer campo
  dirty-able en edit) vía `autofocus` o `ViewChild` + `nativeElement.focus()`.
- **Validación inline en cada campo** (lo que ya hace el drawer) y deshabilitar
  Guardar solo cuando el form es inválido + dirty (no penalizar mientras
  todavía está completando).
- **Indicador de estado del form** en el footer:
  - "Sin cambios" (pristine).
  - "● Cambios sin guardar" (dirty, naranja).
  - "Guardando…" (pending, spinner).

## Flujos

### Alta

1. Lista → clic en "Nuevo paciente" → navega a `/pacientes/nuevo`.
2. Page monta con form vacío, modo `create`, header "Nuevo paciente".
3. Usuario completa y submite → dispatch `addPatient(payload)`.
4. Effect emite `addPatientSuccess` → page redirige a `/pacientes`.
5. En error, toast existente se dispara desde el effect y la page se queda
   con el form (sin redirigir).

### Edición

1. Lista → clic en icono ✏️ → navega a `/pacientes/:id/editar`.
2. Page lee `:id`, intenta `selectPatientById(id)`. Si no está, despacha
   carga. Mientras tanto muestra skeleton/loading.
3. Cuando llega el paciente, hidrata el form.
4. Submit → dispatch `updatePatient` → success → redirige a `/pacientes`.

### Descarte de cambios

1. Usuario clickea "Volver" o "Cancelar".
2. Si `form.dirty === false`: `router.navigate(['/pacientes'])`.
3. Si `form.dirty === true`: abre `p-confirmDialog` con header
   "¿Descartar cambios?", acept "Descartar", reject "Seguir editando".
4. Acept → navega. Reject → cierra dialog, no pasa nada.

## Testing

**Nuevos specs**

`patient-form.page.spec.ts`:

- Render en modo create: muestra header "Nuevo paciente", form vacío.
- Render en modo edit con paciente en store: form hidratado.
- Submit en create: dispatch `addPatient` con el payload correcto.
- Submit en edit: dispatch `updatePatient`.
- Click en "Volver" con form limpio: navega a `/pacientes`.
- Click en "Volver" con form dirty: abre confirmDialog, no navega.
- Aceptar confirmDialog: navega a `/pacientes`.
- Tras `addPatientSuccess` / `updatePatientSuccess`: navega a `/pacientes`.

**Specs modificados**

`patient-list.page.spec.ts`:

- Eliminar todos los casos de drawer (open/close, edit, etc.).
- Verificar `routerLink` correcto en botón "Nuevo paciente" y en el icono
  Editar de cada fila.

**Specs eliminados**

`patient-form-drawer.component.spec.ts`.

## Riesgos y notas para implementación

- **Success actions:** chequear si `addPatientSuccess` / `updatePatientSuccess`
  ya existen en `patient.actions.ts`. Si no, agregarlos y disparlos desde los
  effects correspondientes — la page los necesita para redirigir.
- **Carga directa por URL:** un usuario que entra a `/pacientes/:id/editar`
  sin pasar por la lista necesita que la page despache la carga del paciente.
  El effect de detalle existente puede reusarse, o agregar un selector que
  retorne el paciente y dispare la carga si falta.
- **Guard de navegación global:** si en el futuro queremos que el guard de
  descarte también cubra clic en otros links (sidebar, topbar), conviene
  implementarlo con `CanDeactivate` en lugar de chequearlo solo en el botón
  "Volver". Por ahora alcanza con manejar Volver + Cancelar en la page.
- **Layout responsive:** la grilla `lg:grid-cols-2` colapsa a 1 columna en
  viewports `<lg` (mobile/tablet), donde las secciones quedan apiladas en el
  orden Datos personales → Cobertura → Contacto → Dirección. El footer
  sticky con Cancelar/Guardar sigue funcionando, pero conviene revisar que
  los atajos `Ctrl+S` / `Esc` no interfieran con gestos táctiles (en
  tablets con teclado externo deberían seguir siendo útiles).
