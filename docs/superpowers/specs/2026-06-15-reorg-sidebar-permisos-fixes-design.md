# Reorg sidebar + permisos (2 capas) + 9 fixes de UI/UX

> **Estado:** Diseño aprobado (decisiones cerradas con el usuario 2026-06-15).
> **Rama:** `feat/reorg-sidebar-permisos` (worktree `.worktrees/reorg-sidebar`, off `development`).
> **Alcance:** Cross-stack. **1 PR de BE + 1 PR de FE** (pedido explícito: todo junto).
> **Jira:** _(pendiente)_

## Contexto

Lote consolidado de **9 fixes** sobre `development`. Tres son chicos e independientes (Sucursales, link primer login, bug Rol, sucursal stale); el grande es la **reorganización del sidebar + rediseño del modelo de permisos en 2 capas**, del cual cuelgan varios.

---

## Modelo de acceso (núcleo del rediseño) — 3 piezas

1. **Módulos del tenant (Capa 1 — qué existe).** Los módulos activados al tenant gobiernan qué secciones existen. **Módulo apagado → la sección no aparece en el sidebar de nadie y NO es asignable a ningún usuario.** Prerequisito duro (ya lo hace `GetGrantableSectionsUseCase` filtrando por `parentModule`).
2. **Rol = preset de secciones (atajo).** Asignar un rol pre-marca un set de secciones por defecto. No encierra: es solo el default editable.
3. **Secciones granulares (Capa 2 — acceso real).** El admin destilda/agrega cada sección por usuario. Acceso final = secciones marcadas del usuario, **siempre dentro de los módulos activos**.

**Regla compuesta:** el usuario ve la sección X ⟺ (módulo de X activo en el tenant) **Y** (X marcada para ese usuario). Recepción NO es baseline duro: se comporta como cualquier sección (viene en el preset del rol, destildable).

---

## Fix 5 — Reorganización del sidebar

Archivos: `src/app/layout/sidebar/sidebar.nav.ts` (estructura) y `sidebar.component.ts` (gating).

### Estructura nueva de `NAV_SECTIONS`
- **Recepción** (folder):
  - Recepción → `/turnos/recepcion` (sección `RECEPCION`)
  - Pacientes → `/pacientes` (sección `PACIENTES`)
  - Configuración de agendas → `/turnos/configuracion` (sección `AGENDAS`, módulo TURNOS)
  - Médicos derivantes → `/medicos` (sección `MEDICOS`, módulo MEDICOS)
  - TV sala de espera / TV extracción / Tótem → links externos, **dentro de Recepción**, gateados por la config de pantallas de la sucursal (como dejó el PR de sucursales).
- **Clínico** (folder):
  - Muestras (expandable, **icono `pi pi-flask`** — ya lo tiene; mantener) con sus hijos (Recolección, Traslado, Procesamiento, Validación, Descarte) → secciones `PREANALITICA`/`ANALITICA`/`POSTANALITICA`.
  - Cola de extracción → `/analitica/extraccion` (sección `EXTRACCIONES`)
- **Gestión** (folder, última):
  - Empresa → `/empresa` (sección `EMPRESA`)
  - Sucursales → `/sucursales` (sección `SUCURSALES`)
  - Obras sociales → `/obras-sociales` (sección `OBRAS_SOCIALES`)
  - Financiero → `/financiero` (sección `FINANCIERO`, módulo FINANCIERO)
  - Stock e insumos → `/stock` (sección `STOCK`, módulo STOCK)

### Eliminar
- Folder **Principal** + item **Inicio** (`/home`). Sin landing fijo: tras login redirigir a la **primera sección disponible** del usuario (guard/resolver que evalúa sus secciones en orden y navega a la primera con acceso).
- Folder **Servicios clínicos** (se disuelve; sus items se reparten arriba).
- **Portal de paciente**: eliminar el item del sidebar por completo (y la sección `PORTAL`, ver Fix 6).

### Gating
- Cada item se gatea por `sectionKey` (Capa 2) y, donde corresponda, `moduleKey` (Capa 1). Se elimina el uso de `roleKey` para Empresa/Sucursales/Agendas (pasan a `sectionKey`, ver Fix 6). Los items con módulo apagado no se muestran (ya lo hace `isItemVisible`).

---

## Fix 6 — `AccessSection` 1:1 con el sidebar (BE + FE) + migración

### Secciones nuevas (reemplazan al enum actual)
| Sección | Reemplaza / nueva | parentModule (Capa 1) |
|---------|-------------------|-----------------------|
| `RECEPCION` | reemplaza `ATENCION` (no hay "Atención": es Recepción) | base (siempre activo) |
| `PACIENTES` | igual | base |
| `AGENDAS` | **nueva** (antes role-gated) | TURNOS |
| `MEDICOS` | **nueva** (antes solo módulo) | MEDICOS |
| `PREANALITICA` / `ANALITICA` / `POSTANALITICA` | iguales (Muestras, granular) | base |
| `EXTRACCIONES` | igual (Cola de extracción) | base |
| `EMPRESA` | **nueva** (antes role-gated) | base |
| `SUCURSALES` | igual | base |
| `OBRAS_SOCIALES` | igual, pero **deja de depender de Financiero/COVERAGES** (Fix 8) | base |
| `FINANCIERO` | igual | FINANCIERO |
| `STOCK` | igual | STOCK |
| ~~`PORTAL`~~ | **eliminada** | — |
| ~~`ATENCION`~~ → `RECEPCION` · ~~`TURNOS`~~ → `RECEPCION` | — | — |

> "base" = módulo del producto que está siempre activo para todo tenant (verificar en impl. cuál `ModuleCode` cumple ese rol — p.ej. `ANALITICA` como módulo base, default-enabled; las secciones core cuelgan de él para que la Capa 1 nunca las oculte).

### Cambios BE
- `shared/access/AccessSection.java`: redefinir valores + `parentModule` + `label` según la tabla.
- `GetGrantableSectionsUseCase`: sin cambios de lógica (ya filtra por módulo); hereda el enum nuevo.
- **Migración Flyway** de `user_access_sections` (próxima Vnnn libre):
  - `UPDATE ... SET section_code='RECEPCION' WHERE section_code IN ('ATENCION','TURNOS');`
  - `DELETE ... WHERE section_code='PORTAL';`
  - Para usuarios con rol **ADMINISTRADOR**: insertar las secciones nuevas que les corresponden por preset (`AGENDAS`, `MEDICOS`, `EMPRESA`) si no las tienen, para que no pierdan gestión. (Resto de roles: no se agregan; el preset aplica a usuarios nuevos.)
  - Dedup por la unique `(tenant_id, user_id, section_code)`.
  - Compatible H2+MySQL; validar boot real.

### Cambios FE
- `core/access/access.model.ts`: actualizar el type `AccessSection` a los valores nuevos.
- `roles-permisos/models/access-section-groups.ts` (`SECTION_GROUPS`): reagrupar a los **3 folders** (Recepción / Clínico / Gestión) con las secciones nuevas, en el orden del sidebar.
- `empresa/models/role-section-presets.ts` (`ROLE_SECTION_PRESETS`): actualizar cada rol a las secciones nuevas:
  - ADMINISTRADOR: todas.
  - SECRETARIA: `RECEPCION, PACIENTES, AGENDAS, OBRAS_SOCIALES`.
  - RESPONSABLE_SECRETARIA: `+ FINANCIERO, SUCURSALES, EMPRESA`.
  - FACTURISTA: `FINANCIERO, OBRAS_SOCIALES, PACIENTES`.
  - EXTRACTOR: `EXTRACCIONES, RECEPCION`.
  - TECNICO_LABORATORIO: `PREANALITICA, ANALITICA, EXTRACCIONES`.
  - BIOQUIMICO: `PREANALITICA, ANALITICA, POSTANALITICA, PACIENTES`.
  - MANAGER_STOCK: `STOCK`.
  - EXTERNO: `[]` (Portal eliminado).
- `AccessRegistry` (el que el sidebar consulta) y `selectMyEffectiveSections`: heredan los códigos nuevos.

---

## Fix 7 — Forms de permisos reflejan el sidebar, en grilla

Archivo: `roles-permisos/components/secciones-checklist.component.ts` (reusado en el drawer de usuario de Empresa Y en el paso 2 de empleados).
- **Grupos = los 3 folders del sidebar** (Recepción / Clínico / Gestión), con las secciones nuevas (vía `SECTION_GROUPS`).
- **Layout en grilla** (no lista vertical con scroll): los grupos/checkboxes en columnas (CSS grid responsive) para ocupar menos alto vertical.
- Mismo componente → el cambio aplica a ambos lugares automáticamente.

---

## Fix 8 — Desacoplar Obras Sociales de Financiero (incluido en Fix 6)
- `OBRAS_SOCIALES.parentModule`: de `COVERAGES` → **base** (siempre disponible). Es core para registrar la cobertura del paciente en la atención.
- Sidebar: item "Obras sociales" sin `moduleKey`.
- `SECTION_GROUPS`: OOSS fuera del grupo "Financiero"; va en Gestión como sección independiente.
- La futura **liquidación** sí colgará de Financiero (fuera de scope acá).

---

## Fix 1 — Editar sucursal → stepper editable

- Hoy: editar navega a `/sucursales/configuracion/:id` → `sucursal-detalle.page` (tabs).
- Target: editar navega al **stepper** (`sucursal-alta-stepper`) en **modo edición** (precarga la sucursal existente y permite editar todos los pasos). Reemplaza la vista por tabs como destino del "editar".
  - Si el stepper hoy es solo alta, agregar modo edición (cargar branch por id, precargar cada paso, y en cada paso hacer update en vez de create).
- **Quitar el botón "Guardar boxes"** del paso Tótem: los boxes (atención/extracción) se guardan junto al **"guardar y confirmar"** final del stepper, no con un botón aparte.

---

## Fix 2 — Paso Tótem: 3 toggles ordenados

Archivo: `sucursal-alta-stepper/steps/totem-step.component.*` (y el `totem-tab` si queda).
- Sacar el tótem de la "card grande"; los **3 toggles en una fila/lista limpia, en este orden**:
  1. **Tótem**
  2. **Pantalla sala de espera** (label exacto: "Pantalla sala de espera" — sin "(atención)")
  3. **Pantalla de extracción**
- Los boxes quedan debajo (sin botón "Guardar boxes", Fix 1).

---

## Fix 3 — Link de primer login en la UI (crear/regenerar)

- Hoy: al crear usuario el back devuelve `firstLoginToken` y el FE muestra "Invitación enviada al email" (pero **no se manda email** y el token no se ve). Regenerar token tampoco lo muestra.
- Target: al **crear** y al **regenerar token**, mostrar en la UI el **link de primer login** (`/first-login?token=<token>`) en un dialog/panel con botón **"Copiar link"**, para que el admin se lo pase al usuario (sirve con o sin email).
- Aplica en `empresa/store/empresa.effects.ts` (`addUsuarioSuccess` / `regenerateFirstLoginTokenSuccess`, que ya tienen el token) + un componente de dialog. El token ya viaja en el store; solo falta mostrarlo.

---

## Fix 4 — Bug Rol no precarga (paso 2 empleados)

Archivo: `sucursales/pages/empleado-form/steps/usuario-step/usuario-step.component.ts`.
- Causa: el `usuario-step` carga roles con una llamada directa en el constructor (`rolesApi.list().subscribe(...)`) **sin manejo de error ni estado**; si falla o llega tarde, el `p-select` queda vacío. El flujo de Empresa funciona porque usa el store (`loadRoles`).
- Target: cargar roles de forma robusta (mismo patrón que Empresa o con manejo de error + retry). Asegurar que las opciones del Rol aparezcan en el paso 2. Idem el catálogo de secciones si sufre lo mismo.

---

## Fix 9 — Sucursal stale al cambiar de tenant

- Síntoma: el topbar muestra una sucursal de otro tenant (de localStorage) que no existe en el tenant actual → rompe el alta de atención.
- Causa: persistencia de branch en localStorage **no scopeada por tenant+usuario** y/o no revalidada al login. Hay varias fuentes: `branch-bootstrap.service` (ya valida stale), `OperatorBranchContextService`, `extractor-box.service`, `totem-config.service`, `branch-badge`.
- Target: al login, **derivar la sucursal del usuario** (cada usuario opera en UNA sucursal — `sucursal-por-usuario`) y **descartar/validar** cualquier branch persistido contra las sucursales del tenant nuevo; **scopear las keys de localStorage por `tenantId+userId`**. Extender la validación del `branch-bootstrap` al topbar/operator/extractor para que ninguna fuente quede stale.

---

## Estructura de PRs (regla del usuario)
- **1 PR de BE:** AccessSection nuevo + migración de `user_access_sections` (Fixes 6, 8). + lo que requiera el editar-sucursal/stepper si toca BE (probablemente no).
- **1 PR de FE:** sidebar reorg, SECTION_GROUPS + presets + grilla, link primer login, bug Rol, sucursal stale, editar→stepper + tótem toggles (Fixes 1,2,3,4,5,7,9 + parte FE de 6/8).

## Testing
- BE: suite + boot MySQL con la migración (verificar mapeo de secciones viejas→nuevas y que los admins conservan gestión). Test del enum/usecase.
- FE: `ng test` (sidebar, secciones-checklist grilla, usuario-step roles, totem-step, empleado/empresa drawers) + `npx vitest` (stores). Smoke: login con tenant nuevo (no arrastra sucursal stale; cae en primera sección disponible); permisos en grilla agrupados como el sidebar; editar sucursal abre el stepper; link de primer login visible/copiable.

## Orden sugerido
1. BE: AccessSection + migración (base de todo el modelo).
2. FE Capa permisos: access.model + SECTION_GROUPS + presets + grilla.
3. FE sidebar reorg + landing primera-sección.
4. FE fixes sueltos: bug Rol, link primer login, sucursal stale, editar→stepper + tótem.
5. Tests + smoke.
