# Atención — Wizard CORE en profundidad

**Fecha:** 2026-05-21
**Branch destino:** `feat/atencion-wizard-deep-core` (NUEVA, reemplaza el wizard del PR #11 ya mergeado)
**Predecesores:** [2026-05-20-atencion-module-design.md](./2026-05-20-atencion-module-design.md), PR #11 mergeado en `development`.

---

## Motivación

El wizard actual mergeado en `development` es funcional pero **muy básico** vs lo que el laboratorio necesita realmente. El proyecto viejo `C:\Users\tobia\Desktop\TUP\CUARTO CUATRIMESTRE\TPI REPOS\2025-PIV-TPI-LCC-FE` cubre 8 capas de profundidad (paciente, médico, análisis con detalle, pricing, cobranza, facturación, resumen, persistencia). Este spec replica las capas **CORE** de ese flujo, dejando las activables (Financiero, Médicos) para iteraciones futuras.

**Decisión de scope:** solo CORE en esta iteración. Las capas que dependen de activables (cobertura, médico, pricing, cobro, facturación) se diseñarán cuando los módulos correspondientes estén listos. El wizard sigue siendo extensible con `requires?: ModuleKey` declarativo.

---

## Mapeo módulo ↔ capa del wizard

| Capa | Módulo | CORE? |
|---|---|---|
| Buscar paciente por DNI, ver datos | ANALITICA / pacientes | **CORE** |
| Listar coberturas + seleccionar plan | FINANCIERO | activable |
| Autocomplete de médico solicitante | Médicos | activable |
| Indicaciones, urgente | ANALITICA / atención | **CORE** |
| Input por shortCode + autocomplete por nombre | ANALITICA / análisis | **CORE** |
| Tabla de análisis con modal de detalle (familia, NBU, determinaciones) | ANALITICA / análisis + NBU | **CORE** |
| **Precio base por análisis (`ubCount × ubValue`)** | **ANALITICA / NBU** | **CORE — integración futura, ver sección "Precio base CORE"** |
| Cálculo coberturas (covered/patient amounts) | FINANCIERO | activable |
| Checkbox "autorizado" por fila + Nº autorización | FINANCIERO (OS) | activable |
| Modal stepper de cobranza (montos, métodos) | FINANCIERO | activable |
| Facturación + PDF | FINANCIERO | activable |
| Resumen + ticket de impresión | ANALITICA / atención | **CORE** |
| Persistencia con sessionStorage | Cross-cutting | **CORE** |

---

## Wizard CORE — 3 pasos

```
[1] Datos generales  →  [2] Análisis  →  [3] Resumen
```

Con Financiero / Médicos activos se intercalan los pasos extra (cobertura como sub-componente del paso 1, columna de pricing en paso 2, pasos 2.5 cobro y 2.7 facturación). Esos NO se implementan ahora.

### Paso 1 — Datos generales

**Campos** (todos visibles si el módulo está activo):
- **Búsqueda de paciente por DNI** (CORE)
- *(Selector de cobertura — Financiero ON)*
- *(Autocomplete de médico — Médicos ON)*
- **Indicaciones** (texto libre, CORE)
- **Urgente** (checkbox, CORE)

**Comportamiento de la búsqueda de paciente**:
1. Input numérico de DNI + botón Buscar.
2. Al buscar dispara `GET /api/v1/patients?dni={dni}`.
3. **Si encuentra:** renderiza una card con `lastName, firstName · DNI · birthDate · gender · sexAtBirth` + botón "Ver/editar" (abre modal con datos completos del paciente, no editable en esta iteración).
4. **Si NO encuentra:**
   - Guarda en `sessionStorage`: `current_attention_id = {atencionId}` y `attention_pending_dni = {dni}`.
   - Redirige a `/pacientes/form?dni={dni}&returnTo=/analitica/atencion/{atencionId}`.
   - Al volver, el wizard rehidrata desde sessionStorage, hace nueva búsqueda con el DNI guardado, y precarga la card.

**Validación para Continuar:** paciente seleccionado (obligatorio en CORE).

**Acción al Continuar:**
- `PATCH /api/v1/attentions/{id}/assign/general-data` con `{ patientId, doctorId: null, insurancePlanId: null, indications }`.
- El estado avanza a `REGISTERING_ANALYSES`.
- Persiste `is_urgent` en `addAnalysisList` (se hará en paso 2; en paso 1 se guarda en signal local del wizard).

### Paso 2 — Análisis

**Input dual** (un solo control):
- Detecta tipo de valor: si es solo numérico → `GET /api/v1/analysis?shortCode={n}` (lookup directo).
- Si tiene letras → autocomplete con `GET /api/v1/analysis?nameLike={txt}&limit=10` (debounce 250ms).
- Enter agrega el primer resultado (shortCode) o el highlighted del dropdown (autocomplete).
- Foco automático al input después de cada agregado.
- Bloqueo de duplicados con alert inline.

**Tabla**:
| Columna | Origen | CORE? |
|---|---|---|
| shortCode | `analysis.shortCode` | sí |
| Nombre / Práctica | `analysis.name` | sí |
| Familia | `analysis.familyName` | sí (si el back lo expone — ver auditoría) |
| **Precio base** | `analysis.ubCount × nbu.ubValue` | **sí** — fallback "—" si NBU no configurado, ver sección dedicada |
| *(Cobertura — covered/patient)* | — | activable Financiero |
| *(Autorizado)* | — | activable Financiero |
| Acción: 👁 detalle, 🗑 eliminar | — | sí |

**Total CORE de la atención**: suma de precios base. Se muestra al pie de la tabla. Si NBU no está configurado para alguno → "—" en esa fila y total marcado con asterisco indicando que el cálculo no incluyó esos análisis.

**Modal de detalle** (click 👁): muestra familia, código NBU (módulo NBU es CORE), lista de determinaciones (si el back expone), tiempo de procesamiento + unidad traducida al español, descripción.

**Acción al Continuar:**
- `PATCH /api/v1/attentions/{id}/add/analysis` con `{ analysisIds, isUrgent, authorizationNumber: null }` (el `authorizationNumber` es null en CORE porque es activable de Financiero).
- Si Financiero OFF (caso de esta iteración): después de `add-analysis`, dispatch `endSecretaryPhase` (ya implementado, salta a `AWAITING_EXTRACTION`).
- Si Financiero ON: avanza UI step a `cobro` (lógica ya existente).

**Validación:** al menos 1 análisis.

### Paso 3 — Resumen

**Renderiza**:
- Cabecera: número de atención + fecha.
- Paciente: nombre completo, DNI, género, fecha de nacimiento.
- *(Cobertura — Financiero ON)*
- *(Médico — Médicos ON)*
- Indicaciones (texto), badge "URGENTE" si corresponde.
- Lista de análisis con `shortCode — name` y familia.
- *(Resumen de cobro + facturación — Financiero ON)*

**Acción "Finalizar atención"**:
1. Modal de confirmación con opción "¿Imprimir ticket?".
2. Si SÍ → genera PDF/HTML del ticket (servicio `TicketBuilderService` a portear del proyecto viejo, simplificado a CORE — solo paciente + análisis).
3. Dispatch `endSecretaryPhase` → backend pasa a `AWAITING_EXTRACTION`.
4. Limpia sessionStorage.
5. Navega a la bandeja de atenciones.

### Volver fase / Cancelar / Observaciones

Sin cambios respecto al wizard actual. Botones siempre visibles cuando el estado no es terminal.

---

## Componentes reusables nuevos

Ubicación: `features/analitica/components/`

### `<lab-patient-search>`
- Input: `dni: number | null`, `disabled?: boolean`
- Outputs: `patientSelected: EventEmitter<Patient>`, `notFound: EventEmitter<number>` (emite el DNI)
- Render: input + botón + card de paciente cuando hay resultado.
- Reusable en futuros features (turnos, portal).

### `<lab-analysis-picker>`
- Inputs: `existingAnalysisIds?: number[]`
- Outputs: `analysisAdded: EventEmitter<Analysis>`, `analysisRemoved: EventEmitter<number>`
- Render: input dual + tabla local con acciones.
- Maneja debounce y detección numérica/texto internamente.

### `<lab-analysis-detail-modal>`
- Inputs: `analysisId: number | null`, `visible: boolean`
- Outputs: `closed: EventEmitter<void>`
- Render: dialog con info expandida del análisis (fetch lazy al abrir).

### `<lab-attention-ticket-modal>`
- Inputs: `attention: AttentionResponse`, `visible: boolean`
- Outputs: `confirmed: EventEmitter<boolean>` (true = imprimir, false = solo finalizar), `dismissed: EventEmitter<void>`
- Render: modal con botones "Sin ticket" / "Imprimir ticket".

---

## Persistencia con sessionStorage

```ts
const KEYS = {
  attentionId: 'atencion:currentId',
  pendingDni:  'atencion:pendingDni',
  uiStep:      (id: number) => `atencion:uiStep:${id}`,
};
```

Al **montar el wizard**:
1. Si la URL trae `:id` → carga desde backend.
2. Si la URL no trae ID pero hay `attentionId` en sessionStorage → carga desde backend.
3. Si trae `?dni={dni}` (retorno desde alta de paciente) → busca paciente y precarga la card.
4. `determineWorkflowState()` arranca el wizard en el paso correcto basándose en los datos cargados.

Al **finalizar o cancelar**: limpia las 3 keys.

---

## Precio base CORE (sin Financiero, vía NBU)

**Concepto**: cada análisis tiene asociada una cantidad de unidades bioquímicas (`ubCount`) en su definición de catálogo. El módulo NBU configura, por tenant, el **valor monetario por UB** (`ubValue`). El precio base del análisis = `analysis.ubCount × nbu.ubValue`. Este precio NO incluye cobertura (eso es Financiero) — es el "precio de lista" antes de aplicar obra social.

Mostrar este precio en CORE le da a la secretaria la información mínima para informar al paciente cuánto vale un análisis, sin requerir el módulo Financiero.

### Estado actual del backend

El módulo NBU **no existe todavía** en el monolito (verificado por grep en `Backend/src/main/java`). Para que el precio base funcione es necesario:

1. Crear módulo NBU en backend (ticket separado en repo `Backend`):
   - Entidad `NbuVersion` con `tenantId`, `effectiveDate`, `ubValue`.
   - Endpoint `GET /api/v1/nbu/current` → versión vigente del tenant.
   - Que `Analysis` exponga `ubCount` (asumir que ya existe; si no, agregar en otro ticket).
2. Una vez que existan los endpoints, agregar la columna real.

### Comportamiento en el wizard mientras NBU no exista

- El frontend llama `GET /api/v1/nbu/current` con `catchError` que devuelve `null`.
- Si `null` → la columna "Precio base" se oculta (no renderiza). La tabla queda con las columnas CORE más simples.
- Si responde con `ubValue` → calcula `analysis.ubCount × ubValue` y muestra la columna.
- Implementación: `ModuleRegistry.isActive(ModuleKey.Nbu)` agregado al enum cuando se cree el módulo backend.

### Decisión de scope para esta iteración (confirmada)

**Pre-cableado en frontend con fallback graceful.** El wizard incluye desde este PR:
- El servicio `NbuService.getCurrent()` que llama `GET /api/v1/nbu/current` con `catchError → of(null)`.
- Una `computed` signal `ubValue()` que devuelve el valor vigente o `null`.
- La columna "Precio base" se renderiza condicionalmente con `@if (ubValue() != null)`.
- El total CORE al pie sigue la misma regla — se muestra solo si la columna está activa.

Cuando el ticket de backend mergee el endpoint NBU, **no se toca frontend** — el wizard se enciende solo al primer reload del tenant.

---

## Endpoints requeridos del backend

Auditar contra el monolito actual. Si alguno no existe, crear ticket separado en `Backend` antes de implementar.

| Endpoint | Uso | Existe? |
|---|---|---|
| `GET /api/v1/patients?dni={dni}` | Búsqueda en paso 1 | **AUDITAR** |
| `GET /api/v1/patients/{id}` | Render de paciente completo | sí (asumido) |
| `GET /api/v1/analysis?shortCode={n}` | Lookup directo en paso 2 | **AUDITAR** |
| `GET /api/v1/analysis?nameLike={txt}&limit=10` | Autocomplete por nombre | **AUDITAR** — si no existe, crear |
| `GET /api/v1/analysis/{id}` | Modal de detalle | sí (asumido) |
| `GET /api/v1/nbu/current` | Precio base por análisis | **NO existe — ticket aparte en Backend, fallback graceful en frontend** |
| `PATCH /api/v1/attentions/{id}/assign/general-data` | Cierre del paso 1 | sí |
| `PATCH /api/v1/attentions/{id}/add/analysis` | Cierre del paso 2 | sí |
| `PATCH /api/v1/attentions/{id}/end-secretary-phase` | Finalizar | sí |

**Bloqueante:** si el endpoint de búsqueda por shortCode o nameLike no existe en el monolito, la implementación se pausa hasta que esté.

---

## Estrategia de entrega

**Un PR único** que reemplaza el wizard básico mergeado en `development`:
- Branch: `feat/atencion-wizard-deep-core`.
- Reemplaza por completo `atencion-wizard.component.ts`.
- Agrega los 4 componentes reusables + 3 step components.
- Mantiene `ALL_STEPS` declarativo (para no romper el filtrado Financiero/Médicos del futuro).
- No toca backend.

---

## Fuera de scope (queda para iteraciones futuras)

- **Financiero**: cobertura en paso 1, pricing column en paso 2, paso de cobro completo, paso de facturación, PDF de factura. Requiere endpoints y módulo Financiero en backend.
- **Médicos**: autocomplete + creación inline. Requiere módulo activable Médicos en backend.
- **Tutorial overlay**: el proyecto viejo tiene `TutorialOverlayComponent`. Útil pero no MVP.
- **Sincronización con cola de turnos**: el proyecto viejo actualiza el queue al cancelar. Lo dejamos cuando esté el módulo TURNOS.
- **Edición inline del paciente**: el proyecto viejo permite editar contactos/direcciones desde el modal. Por ahora solo "Ver" (read-only).

---

## Tests requeridos

- `patient-search.spec.ts`: query por DNI, found/notFound emit.
- `analysis-picker.spec.ts`: input dual, debounce, bloqueo de duplicados.
- `analysis-detail-modal.spec.ts`: fetch lazy al abrir.
- `attention-ticket-modal.spec.ts`: emisiones según botón clickeado.
- `datos-generales-step.spec.ts`: redirect a `/pacientes/form` cuando no existe + retorno con DNI en URL.
- `analisis-step.spec.ts`: agregado, eliminado, validación de mínimo 1.
- `resumen-step.spec.ts`: render correcto, modal de ticket.
- Extender `atencion-wizard.spec.ts` (a crear): `determineWorkflowState()` para los 3 estados CORE.
