# Sucursales — Pulido del stepper + resumen real + pantallas configurables

> **Estado:** Diseño aprobado (decisiones cerradas con el usuario el 2026-06-14).
> **Rama:** `feat/sucursales-pulido-pantallas` (worktree `.worktrees/sucursales-pulido`, off `development`).
> **Alcance:** Items 1, 2, 4 son **frontend puro**; item 3 es **cross-stack** (FE + BE + migración).
> **Jira:** _(pendiente — completar al pasar por `jira-workflow`)_

## Contexto

El wizard de alta/edición de sucursal (`sucursal-alta-stepper`) ya usa `ui-wizard-shell` + `ui-form-stepper-header` y tiene 6 pasos: **Datos, Horarios, Contactos, Workspaces, Tótem, Confirmar**. Este sub-proyecto lo pule: saca ruido visual, agrega un resumen real en el último paso, simplifica el alta de áreas, y agrega configuración de pantallas (TV) por sucursal con gating en el sidebar.

Todo se especifica **sobre `development`** (checkout `TESIS-DEV/FRONTEND-LABORATORIO` y `TESIS-DEV/Backend`).

### Archivos núcleo (rutas reales)

Frontend — `src/app/features/sucursales/pages/configuracion/sucursal-alta-stepper/`:
- Page: `sucursal-alta-stepper.page.ts` / `.html`
- Steps: `sucursal-alta-stepper.steps.ts`
- `steps/datos-step.component.ts` + `.html`
- `steps/horarios-step.component.ts` + `.html`
- `steps/contactos-step.component.ts` + `.html`
- `steps/workspaces-step.component.ts` + `.html`
- `steps/totem-step.component.ts` + `.html`
- `steps/confirmar-step.component.html`

Sidebar — `src/app/layout/sidebar/`:
- `sidebar.nav.ts` (sección hardcodeada "Pantallas en sala", líneas ~67-75)
- `sidebar.component.ts` (`salaEsperaUrl` ~427-432, `totemEnabled` ~417, `ngOnInit` ~453)
- Store `src/app/features/turnos/store/branch-totem-config/` (selectors, actions, reducer, effects)

Backend (`Backend/src/main/java/lab/laboratorio/modules/sucursales/`):
- `domain/model/BranchTotemConfig.java`
- `infrastructure/persistence/entity/BranchTotemConfigJpaEntity.java`
- `application/usecase/UpsertBranchTotemConfigUseCase.java`
- `presentation/dto/UpsertBranchTotemConfigRequest.java`, `BranchTotemConfigResponse.java`
- `presentation/.../BranchTotemConfigController.java` (GET/PUT `/api/v1/sucursales/branches/{branchId}/totem-config`)
- Tabla `branch_totem_config` (creada en `V55__create_branch_totem_config.sql`)

---

## Item 4 — "Tipo de área" fuera del stepper (FE puro)

### Hallazgo de fondo (por qué es seguro)
`areaType` (enum de 9 valores) **no gobierna ninguna conducta en runtime**:
- 8 valores son etiqueta pura (nada se ramifica por ellos).
- Solo `EXTERNO` tiene referencias: valida `externalLabName` en `Area.java`, y `BranchSectionInfoAdapter.isSectionDerived()` devuelve `true` si el área es EXTERNO — **pero `isSectionDerived()` no lo llama ningún caso de uso** (código muerto).
- La derivación real a lab externo es manual vía `MarkAsDerivedUseCase` (`POST .../mark-as-derived`), independiente de `areaType`.

### Decisión: wire el default desde el front
- En el modal "Nueva área" del paso Workspaces (`workspaces-step.component.ts` / `.html`): **eliminar** los campos "Tipo" (`newAreaType`) y "Laboratorio externo" (`newAreaExternalLab`), y todo el bloque condicional de EXTERNO.
- Al crear el área, el front manda **hardcodeado** `areaType: 'OTRO'`, `externalLabName: null`. El contrato `@NotNull areaType` del backend queda satisfecho. **Cero cambios de backend.**
- El catálogo de áreas (`areas-panel.component.ts`, pantalla admin separada) **NO se toca** — ahí sigue disponible el tipo EXTERNO por si alguna vez se necesita.

---

## Item 1 — Limpieza agresiva del stepper (solo labels)

Quitar todo el texto de ayuda verboso, dejando labels concisos. Mantener: labels, el `*` de requeridos y los contadores ("X horarios cargados", "X contactos cargados").

- **Datos** (`datos-step.component.html` línea ~2): eliminar el párrafo "Información general de la sucursal. La dirección es opcional y puede completarse después."
- **Horarios** (`horarios-step.component.html` línea ~2 y tooltip línea ~37): eliminar "Seleccioná los días, el horario y el tipo. Podés agregar múltiples bloques." y el tooltip "Jornada completa, solo mañana…".
- **Contactos** (`contactos-step.component.html` línea ~2): eliminar "Agregá teléfonos, email, sitio web y otros canales de contacto."
- **Tótem** (`totem-step.component.html` líneas ~2-5 y subtítulos de sección): eliminar los 2 párrafos de ayuda y los subtítulos largos ("Habilitá el tótem para aceptar walk-ins…", "Cantidad de boxes físicos…"). Reemplazar por labels de sección cortos ("Tótem", "Boxes", "Pantallas").
- **Subtítulos de los steps** (`sucursal-alta-stepper.steps.ts`): si el subtítulo de cada paso (ej. "Información básica", "Días y franjas de atención") aparece redundante en el shell, recortarlo a vacío o a una palabra. (Decisión visual al implementar; el default es dejar solo el `title`.)

---

## Item 2 — Resumen real en el paso Confirmar

Reemplazar el mensaje estático de `confirmar-step.component.html` (8 líneas) por un resumen legible de todo lo cargado, **sin IDs**, derivado de los signals que cada paso ya expone en el store de sucursal en alta.

Secciones del resumen:
- **Datos:** Nombre; dirección formateada "Calle Número, Ciudad, Provincia" (resolviendo nombres de ciudad/provincia, no IDs). Si no hay dirección: "Sin dirección".
- **Horarios:** una línea por bloque, "Lun, Mié, Vie · 09:00–17:00 · Día completo" (días abreviados en texto y `scheduleType` mapeado a label en español). Si vacío: "Sin horarios".
- **Contactos:** una línea por contacto, "Email: info@lab.com", "Celular: +54…" (tipo mapeado a label). Si vacío: "Sin contactos".
- **Áreas y secciones:** agrupado por área, "Hematología: Sección A, Sección B". Si vacío: "Sin áreas asociadas".
- **Tótem:** "Habilitado" / "Deshabilitado"; "Boxes atención: N · Boxes extracción: M".
- **Pantallas** (item 3): "Sala de espera: Sí/No · Extracción: Sí/No".

Implementación: un componente de resumen que lee los mismos selectors/signals de los pasos previos (el `confirmar-step` pasa a ser un componente TS con esos signals, no solo HTML). Helpers de formateo (días, scheduleType, contactType) reutilizables.

---

## Item 3 — Pantallas configurables por sucursal + gating en sidebar (cross-stack)

### Backend
- **Dominio** `BranchTotemConfig.java`: agregar `private boolean atencionDisplayEnabled;` y `private boolean extraccionDisplayEnabled;` (con sus getters/setters Lombok).
- **JPA** `BranchTotemConfigJpaEntity.java`: dos `@Column(... nullable=false)` `atencion_display_enabled` y `extraccion_display_enabled`.
- **Mapper** domain↔entity: mapear los dos campos.
- **Migración Flyway** (próxima versión libre — coordinar con Atención que reserva V959; probablemente **V960**):
  ```sql
  ALTER TABLE branch_totem_config
    ADD COLUMN atencion_display_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN extraccion_display_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  -- Backfill: las sucursales que YA tenían tótem habilitado conservan su pantalla de atención.
  UPDATE branch_totem_config SET atencion_display_enabled = TRUE WHERE enabled = TRUE;
  ```
  (Usar sintaxis compatible H2-modo-MySQL + MySQL, igual que el resto de `migration/`. Validar boot MySQL real.)
- **DTOs:**
  - `UpsertBranchTotemConfigRequest`: agregar `Boolean atencionDisplayEnabled`, `Boolean extraccionDisplayEnabled` (no `@NotNull` para retrocompat; default false si vienen null).
  - `BranchTotemConfigResponse`: agregar los dos booleans.
- **UseCase** `UpsertBranchTotemConfigUseCase.execute(...)`: extender la firma para recibir y setear los dos flags (en la rama existente y en el `orElseGet`). El controller PUT pasa los nuevos campos del request.

### Frontend — paso Tótem
- Agregar una sección "Pantallas" con **2 toggles independientes**:
  - "Pantalla de sala de espera (atención)" → `atencionDisplayEnabled`.
  - "Pantalla de extracción" → `extraccionDisplayEnabled`.
- El toggle de tótem walk-in (`enabled`) queda como bloque aparte (independiente).
- Los toggles disparan el upsert del config (extender la acción/effect/reducer del store `branch-totem-config` para llevar los dos flags). El response del GET trae los valores para inicializar.

### Frontend — sidebar
- Eliminar la sección hardcodeada "Pantallas en sala" de `sidebar.nav.ts` (URLs `lab-demo/1001`).
- Construir los links dinámicamente en `sidebar.component.ts`, con `tenantSlug` + `branchId` reales (ya disponibles vía `session.currentUser()`):
  - **"TV sala de espera"** → visible solo si `atencionDisplayEnabled`; URL `/display/{slug}/{branchId}`.
  - **"TV extracción"** → visible solo si `extraccionDisplayEnabled`; URL `/display/extraccion/{slug}/{branchId}`.
  - **"Tótem"** → visible solo si `enabled` (tótem walk-in); URL `/turnos/totem` con los params reales que corresponda.
- Nuevos selectors en el store `branch-totem-config` espejando `selectBranchTotemEnabled`: `selectAtencionDisplayEnabled`, `selectExtraccionDisplayEnabled`. El reducer ya carga el config en `ngOnInit` del sidebar (`loadBranchTotemConfig`); extender el modelo/estado para incluir los dos flags.
- El link condicional "Sala de espera" del footer del sidebar (hoy gateado por `totemEnabled`) pasa a gatearse por `atencionDisplayEnabled` (o consolidarse con el link "TV sala de espera" para no duplicar). Evitar dos links a la misma pantalla.

---

## Plan de testing

- **FE:** `ng test` (componentes de pasos + sidebar) y `npx vitest` (store branch-totem-config). `npm ci` en el worktree.
  - Casos clave: modal Nueva área sin tipo/lab externo (manda OTRO/null); resumen muestra valores legibles (no IDs) y maneja vacíos; toggles de pantallas hacen upsert; sidebar muestra/oculta cada link según su flag con slug/branch reales.
- **BE:** suite + boot MySQL real con la migración aplicada (perfil `local`, schema fresco). Test del upsert usecase con los dos flags. Verificar el backfill (sucursal con tótem ON → atención ON).
- **Smoke E2E manual:** crear sucursal, recorrer el stepper limpio, ver el resumen real en el paso 6, prender solo "extracción" y verificar que en el sidebar aparece solo "TV extracción" y no "TV sala de espera".

## Orden sugerido de implementación

1. Item 4 (FE puro) — quick win, desbloquea el modal.
2. Item 1 (FE puro) — limpieza de textos.
3. Item 3 BE — flags + migración + endpoint.
4. Item 3 FE — toggles del paso Tótem + store + sidebar gating.
5. Item 2 — resumen real (consume también los flags del item 3).
6. Tests + smoke.

## Fuera de scope (otros sub-proyectos)

Atención (ya tiene spec+plan), Genérico (padding stepper), Médicos/Empleados, Obras Sociales/Liquidaciones, Extracción.
