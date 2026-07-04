# Nomenclador NBU — Configuración por tenant editable en drawer (Design)

> **Jira:** [KAN-130](https://exequielsantoro.atlassian.net/browse/KAN-130)

**Fecha:** 2026-06-23
**Rama:** feat/nbu-tenant-config-drawer
**Stack:** Angular 21 · Standalone · OnPush · NgRx clásico · PrimeNG · Tailwind · Vitest

---

## 1. Contexto y alcance

La pantalla **Nomenclador NBU** (`/analitica/nbu`, feature `features/analitica/pages/nbu/`) hoy es **read-only**: muestra el catálogo de análisis (tabla desplegable que al expandir lista las determinaciones), un selector de versión NBU y un tab de precio particular (parte mock).

El **NBU es de plataforma** (catálogo global + cantidad de UB + versiones, gestionado por SAAS_ADMIN). Encima, cada **laboratorio (tenant)** customiza una capa propia. Este spec cubre dar **soporte de edición a esa capa tenant**, por análisis, mediante un **drawer**, más una **vista rápida** de la config en la fila desplegable.

### Capa configurable por tenant (lo que edita esta feature)

| Capa | Tabla | Campos | Endpoint |
|---|---|---|---|
| Activación + alias + sección | `tenant_analysis` | `default_section_id` (editable por PATCH), `active` (alta/baja), `short_code`/`custom_name` (hoy solo en alta — ver gap) | `/api/v1/tenant-analyses` |
| Override preanalítico/proceso por determinación | `tenant_determination_override` | `preIndications` (**ayuno**), `preObservations`, `measurementUnitId`/unidad, `analyticalType`, `canBringSample`, impresión (`isPrintable`/`printOrder`/`printGroup`/`specialPrintName`), `loadingResultOrder`, `requiresLoadValue`, `requiresApproval`, `canSelfApprove`, `handlingTimeValue/Unit`, `percentageVariationTolerated` | `PUT /api/v1/analitica/determinations/{id}/override` |
| Valores de referencia propios | `tenant_reference_values` | por ítem: `minValue`, `maxValue`, `criticalMinValue`, `criticalMaxValue`, `ageMinMonths`, `ageMaxMonths`, `gender`, `unit` | `PUT /api/v1/analitica/determinations/{id}/reference-values/override` |

> La **versión NBU** (`tenant_nbu_config.default_nbu_version_id`) ya se elige en el selector de la pantalla; **no** entra al drawer por-análisis.

### En alcance
- **Vista rápida** en la fila desplegable: nuevo bloque `CONFIGURACIÓN` (debajo de `DETERMINACIONES`).
- **Drawer de edición por análisis**, abrible desde un botón **"Configurar" (lápiz)** en la fila desplegable.
- **Gating ADMINISTRADOR**: el botón Configurar y la edición solo se muestran/permiten a `ADMINISTRADOR`. A los demás usuarios no aparece.
- **Fix de 2 bugs de gating en el backend** (ver §6).
- **Última modificación**: mostrar `modificado por <usuario> · <fecha>` (de `updated_by`/`updated_at`).

### Fuera de alcance / diferido
- **Pantalla de configuración del catálogo UNIVERSAL** (global), para el rol `TENANT_ADMIN`. Es donde recién tendría sentido crear/usar ese rol. **Diferido** (ticket aparte).
- **Pantalla de auditoría/actividad**: listado que permita elegir distintas tablas y ver las últimas modificaciones/actualizaciones (quién y cuándo) para corroborar cambios desde otra pantalla. **Diferido** (ticket aparte).
- Edición de `custom_name`/`short_code` del tenant_analysis: ver gap en §8.
- Tab de **precio particular** (sigue su curso aparte / KAN-122).

---

## 2. Vista rápida en la fila desplegable

Hoy la fila expandida muestra:

```
DETERMINACIONES:
  · Hemoglobina · Hematocrito · Leucocitos · Plaquetas
```

Se agrega un segundo bloque (solo lectura) con la config **del tenant** (NO versión NBU ni UB — eso es catálogo global):

```
CONFIGURACIÓN:
  · Sección: Hematología      · Estado: Activo
  · Ayuno: 8 h                · Tipo de muestra: Sangre
  · Valores de referencia / unidades propias: Sí
  · Modificado por: M. Pérez · 12/06/2026
```

- Los datos de "ayuno", unidades y ref-values salen del override por determinación (si hay varias, se resume / se muestra por determinación dentro del drawer).
- Si el análisis usa los defaults del catálogo (sin override), se indica "usa configuración estándar".

## 3. Drawer de edición (por análisis)

- **Entrada única**: botón "Configurar" (ícono lápiz) en la fila desplegable. **No hay modal** en esta pantalla (las filas se expanden inline).
- **Componente**: drawer lateral (PrimeNG `p-drawer`/Sidebar o el patrón de drawer ya usado en médicos/empleados — reusar `ui-*` si existe).
- **Secciones del drawer**:
  1. **General** (tenant_analysis): sección/área (`defaultSectionId`), estado activo (alta/baja). *(short_code/custom_name: ver gap §8.)*
  2. **Determinaciones** (lista; por cada una, override): unidad, **indicaciones preanalíticas (ayuno)**, validación automática (`requiresApproval`/`canSelfApprove`), orden/grupo de impresión, tolerancia de variación.
  3. **Valores de referencia** (por determinación): filas min/max/crítico × género × rango etario.
  4. **Solo lectura (contexto NBU global)**: código NBU y familia, para referencia mientras se configura. *(UB/versión NO editables acá.)*
- **Footer**: Guardar / Cancelar. Guardado por sección (cada PUT/PATCH es independiente) con feedback de éxito/error (toast en español, regla #4).

## 4. Permisos / visibilidad

- **Solo `ADMINISTRADOR`** ve el botón "Configurar" y puede abrir el drawer / editar.
- Resto de usuarios: la pantalla NBU sigue visible en modo **read-only** (catálogo + vista rápida), **sin** el botón Configurar.
- FE: gating por `TokenService.getRoles().includes('ADMINISTRADOR')` (consistente con cómo el sidebar/otros lugares chequean rol). El backend es la barrera real (§6).

## 5. Contratos backend que consume el drawer

- `GET /api/v1/analitica/determinations/{id}/override` → `TenantOverrideResponse`
- `PUT /api/v1/analitica/determinations/{id}/override` ← `TenantDeterminationOverrideRequest` (campos en §1)
- `GET /api/v1/analitica/determinations/{id}/reference-values/override` → `List<DeterminationReferenceValueResponse>`
- `PUT /api/v1/analitica/determinations/{id}/reference-values/override` ← `List<ReferenceValueItem>`
- `PATCH /api/v1/tenant-analyses/{id}` ← `{ defaultSectionId }`
- `GET /api/v1/analitica/catalog/{id}/determinations` (ya usado) → filas base.
- Secciones para el combo: endpoint de secciones del tenant (a confirmar el path exacto en la fase de plan).

## 6. Fixes de gating en el backend (parte de esta feature)

Dos endpoints están mal gateados y hay que corregirlos para que ADMINISTRADOR pueda operar y otros no:

1. **`TenantAnalysisController`** (`/api/v1/tenant-analyses`, POST/PATCH/DELETE): hoy exige `hasRole('TENANT_ADMIN')`, **rol que no existe** en la tabla `roles` → hoy da **403 a todos**. Cambiar a `hasRole('ADMINISTRADOR')`.
2. **`TenantDeterminationOverrideController`** (`/api/v1/analitica/determinations`, override + reference-values/override): hoy `@PreAuthorize("isAuthenticated()")` a nivel clase → **cualquier usuario logueado** puede cambiar overrides/rangos. Restringir las mutaciones (`PUT .../override`, `PUT .../reference-values/override`) a `hasRole('ADMINISTRADOR')`; las lecturas (`GET`) pueden quedar autenticadas.

> Ambos cambios tocan autorización → requieren `/security-review` antes de merge (regla del repo BE).

## 7. Auditoría (mínimo en esta feature)

- Mostrar `updated_by` + `updated_at` ("Última modificación") en el drawer y en la vista rápida. El dato ya existe en las tablas `tenant_*`.
- **NO** se construye historial de cambios acá. La trazabilidad completa (quién cambió qué, valor anterior, histórico) y la pantalla para corroborarlo desde otro lado son **features diferidas** (ver §1, fuera de alcance).

## 8. Gaps / riesgos a resolver en el plan

- **`custom_name` / `short_code`**: el `UpdateTenantAnalysisRequest` actual solo acepta `defaultSectionId`. Editar nombre propio / código interno del análisis **no está soportado por el PATCH** hoy. Decisión pendiente: (a) dejar fuera del drawer en esta iteración, o (b) ampliar el request del BE. Por defecto: **fuera de alcance** en v1 (solo sección + estado).
- Resolver el **endpoint de secciones** del tenant para el combo de sección.
- Confirmar que el `id` que reciben los endpoints de override es el `determination_catalog_id` correcto (consistencia con `GET /catalog/{id}/determinations`).
- Reusar el patrón de drawer existente (médicos/empleados) en lugar de uno nuevo.

## 9. Criterios de aceptación

- Como ADMINISTRADOR, en `/analitica/nbu`, cada fila del catálogo tiene un botón "Configurar"; al abrirlo, el drawer carga la config tenant del análisis y permite editar sección/estado, override por determinación (incl. ayuno) y valores de referencia, persistiendo vía los endpoints de §5.
- La fila desplegable muestra el bloque `CONFIGURACIÓN` (sin versión/UB) + "última modificación".
- Usuarios no-ADMINISTRADOR no ven el botón Configurar; si llaman los endpoints igual, el BE responde 403 (gatings corregidos).
- Tests: store/effects/selectors del drawer; specs de componente (botón visible solo admin); specs de los services nuevos (HttpTestingController) con los paths de §5.
- Mensajes de error en español, sin leak (regla #4).

## 10. Notas de implementación (para la fase de plan)
- Feature dentro de `features/analitica/` (junto a la pantalla NBU existente) reusando su store `nomenclador`.
- Agregar al `NomencladorService`/un service nuevo los métodos para override + reference-values + patch de tenant-analysis.
- El FE depende de los fixes de gating del BE (§6) para funcionar con un ADMINISTRADOR real — coordinar PRs (BE primero o juntos).
