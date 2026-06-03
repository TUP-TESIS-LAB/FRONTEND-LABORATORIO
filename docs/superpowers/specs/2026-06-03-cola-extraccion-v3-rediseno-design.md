# Cola de Extracción v3 — Rediseño (operador único por máquina) — Spec

> **Estado:** Diseño aprobado — pendiente plan + ticket
> **Fecha:** 2026-06-03
> **Rama:** `feat/cola-extraccion` (continuación de KAN-65 backend / KAN-66 frontend, ya mergeadas con development)
> **Depende de:** v2 (cola por sucursal + box occupancy + cancel con motivo) ya en el branch.
> **Jira:** _(pendiente — se crea con el plan vía jira-workflow)_

---

## 1. Contexto

La v2 (KAN-65/66) dejó operativa `/analitica/extraccion` con un modelo **por extractor**: cada extractor entra en su propio dispositivo, elige sucursal, configura "su box" (localStorage) y ve su cola + su única extracción en curso (MAX 1).

El uso real es distinto: **hay una sola máquina por sucursal**, operada por **un solo empleado**. Ese operador despacha pacientes a los boxes donde trabajan los extractores. Esta v3 rediseña la pantalla para ese flujo.

## 2. Objetivos

1. **Config de boxes persistente por sucursal**: definir qué extractor trabaja en cada box, guardado en backend (sobrevive refresh, compartido).
2. **Dos listas en paralelo**: la cola (esperando) y **todas las extracciones en curso** de la sucursal (varias a la vez — los N boxes pueden extraer simultáneamente; cada extractor sigue con MAX 1).
3. **Tomar con teclas F**: al tomar un paciente, un modal muestra info rápida + muestras a extraer + una fila de boxes con teclas `F1..Fn`. La tecla asigna el paciente al box (y a su extractor configurado).
4. **Deshacer de 5s**: tras asignar, la extracción arranca ya y hay una ventana de 5s para deshacer (por error de box), con feedback visible de a quién se asignó.
5. **Finalizar / Cancelar desde la lista**: acción por fila. Cancelar con 3 motivos rápidos que llenan un textarea editable.
6. **Muestras a extraer en el modal**: tubos agrupados por tipo (los rótulos que el paciente le entrega al extractor).

## 3. Decisiones cerradas

| Punto | Decisión |
|---|---|
| Persistencia config box→extractor | **Backend, por sucursal**. Nueva tabla `branch_box_assignments`. La pantalla la edita; el catálogo formal de boxes (cuántos tiene la sucursal) es **OUT** (irá en el stepper de config de sucursal a futuro). |
| Quién opera la pantalla | Un solo empleado (rol `EXTRACTOR` o `ADMINISTRADOR`). La extracción queda a nombre del **extractor configurado en el box**, no del operador. |
| Asignación (tomar) | El modal manda `boxNumber`; el backend resuelve el `extractorId` desde la config del box. Si el box no tiene extractor configurado → error. |
| Regla de capacidad | **MAX 1 por extractor** (se mantiene). Asignar a un box cuyo extractor ya tiene una en curso → 409 "Ese extractor ya tiene una extracción en curso". |
| Deshacer 5s | El assign es **inmediato** (pasa a `IN_EXTRACTION`). El undo llama a un endpoint liviano `unassign` que revierte a `AWAITING_EXTRACTION` **sin motivo** (es corrección de error, no cancelación auditada). Toast muestra "Asignado a Box N · <extractor> — Deshacer (5s)". |
| En curso | Listado **por sucursal** (todas las `IN_EXTRACTION`), no por extractor. |
| Muestras a extraer | **Por `SampleType`** con cantidad (tubos). Misma fuente que los rótulos que se imprimen al cerrar la atención (se calculan por las muestras que requiere cada análisis). |
| Cancelar | 3 motivos rápidos que llenan el textarea editable: **"Paciente no se presentó al box"**, **"No se pudo canalizar (vía difícil)"**, **"Paciente descompensado"**. Sigue exigiendo `>= 5` chars y persiste en `extraction_cancellation_reason`. |
| Catálogo de boxes | Sin catálogo formal todavía. La config de la pantalla agrega/asigna boxes ad-hoc (Box 1..N) y los persiste. F-keys mapean `F1..Fn` a los boxes configurados. |

## 4. Scope

### IN
**Backend**
- Tabla `branch_box_assignments` (config box→extractor por sucursal) + dominio/puerto/adapter JPA.
- `GET /api/v1/branches/{branchId}/extractors` → usuarios rol `EXTRACTOR` de la sucursal (para el dropdown de config). Nueva query por rol + branch.
- `GET /api/v1/branches/{branchId}/box-assignments` y `PUT /api/v1/branches/{branchId}/box-assignments` → leer/guardar config. ETag en el GET.
- `GET /api/v1/attentions/in-extraction?branchId` → cambia de **por-extractor** a **por-sucursal** (todas, con `box`, `extractorId`, `extractorFullName`).
- Muestras por atención: exponer `samples: [{ sampleType, count }]` en el item de `awaiting-extraction` (para el modal).
- `PATCH /api/v1/attentions/{id}/assign/extractor` → input `boxNumber` (+ `branchId`); resuelve `extractorId` desde la config; valida box configurado + MAX 1 del extractor.
- `PATCH /api/v1/attentions/{id}/unassign` (nuevo) → revierte `IN_EXTRACTION` → `AWAITING_EXTRACTION` sin motivo (undo 5s).
- Invalidación de cache ETag suma `box-assignments:${tenantId}:${branchId}`.

**Frontend**
- Página `extraction-queue` rediseñada: barra de config de boxes + dos columnas (cola | en curso lista).
- `box-config-bar` (nuevo): boxes con extractor asignado + dropdown desde extractores de la sucursal.
- `take-patient-modal` (reemplaza `take-patient-drawer`): info rápida + muestras (tubos) + fila de boxes con `F1..Fn` + toast/undo 5s.
- `in-progress-list` (reemplaza `in-progress-extraction-card`): tabla de todas las en curso (box, extractor, paciente, timer) con Finalizar/Cancelar por fila.
- `cancel-extraction-dialog`: agrega 3 botones de motivo rápido que llenan el textarea.
- Store `extraction`: `boxAssignments`, `branchExtractors`, `inProgress` como **lista**, `samples` por atención, timer de undo 5s. Polling 5s/ETag.
- Endpoints/servicio nuevos y firmas actualizadas.

### OUT (otra iteración)
- **Catálogo formal de boxes** por sucursal en el stepper de config de sucursal (cuántos boxes, labels, activo/inactivo). Hoy la pantalla los maneja ad-hoc.
- Impresión de rótulos (ya existe en el flujo de atención / preanalítica — no se toca acá).
- Nombres de análisis en el modal (solo tubos por tipo).
- Stats avanzadas; historial de canceladas; avatar real.
- Concurrencia atómica perfecta de MAX 1 (sigue siendo la validación no-atómica documentada como deuda; mitigada por optimistic lock).

## 5. Modelo de datos (backend)

### 5.1 Migración Flyway — `branch_box_assignments`
```sql
CREATE TABLE branch_box_assignments (
    id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id          BIGINT       NOT NULL,
    branch_id          BIGINT       NOT NULL,
    box_number         INT          NOT NULL,
    extractor_user_id  BIGINT       NULL,          -- box configurado sin extractor todavía
    active             TINYINT(1)   NOT NULL DEFAULT 1,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by         VARCHAR(64)  NOT NULL,
    updated_by         VARCHAR(64)  NOT NULL,
    version            BIGINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uq_branch_box (tenant_id, branch_id, box_number),
    KEY idx_branch_box_branch (tenant_id, branch_id, active),
    CONSTRAINT fk_branch_box_branch   FOREIGN KEY (branch_id)         REFERENCES branches (id),
    CONSTRAINT fk_branch_box_extractor FOREIGN KEY (extractor_user_id) REFERENCES users (id)
);
```
- **Número de versión**: usar el primer libre tras V77 (`V78__...`), **después** de resolver/numerar las colisiones Flyway de development (ver §8). No reusar V60/V70-73.
- Seed local-dev opcional: crear Box 1 y 2 para la sucursal del tenant 1 asignados a `extractor` (10003).

### 5.2 Muestras por atención
- No requiere tabla nueva. `samples: [{ sampleType, count }]` se deriva de los análisis de la atención y sus requerimientos de muestra (misma lógica que alimenta la creación de rótulos / `LabelCreationPort` + agrupación por `SampleType` que ya hace `ProtocolCreationAdapter`).
- El plan debe ubicar la fuente exacta del "cantidad por tipo" (catálogo de análisis: `SampleType` + cantidad por análisis) y exponerla como proyección de solo lectura.

## 6. Backend — cambios por caso de uso

- **`GetBranchExtractorsUseCase` (nuevo)**: lista usuarios activos rol `EXTRACTOR` con acceso a la sucursal. Requiere query por rol+branch (hoy inexistente — se agrega al `UserRepositoryPort`/adapter).
- **`GetBoxAssignmentsUseCase` / `SaveBoxAssignmentsUseCase` (nuevos)**: leer y guardar la config box→extractor de la sucursal (upsert por box). Valida que el extractor asignado tenga rol EXTRACTOR + acceso a la sucursal.
- **`AssignExtractorUseCase` (modificado)**: `Input(id, tenantId, branchId, boxNumber)`. Resuelve `extractorId` desde `branch_box_assignments`. Errores: box sin extractor configurado (422 español); extractor at capacity (409); atención no en `AWAITING_EXTRACTION` (409). Asigna `extractorId` + `attentionBox` y avanza a `IN_EXTRACTION`. Publica `AttentionMutatedEvent`.
- **`UnassignExtractionUseCase` (nuevo)**: `Input(id, tenantId)`. Valida `IN_EXTRACTION`; `revertState(AWAITING_EXTRACTION)`; limpia `extractorId` + `attentionBox` (es corrección, no auditoría). Publica evento. (Ventana de 5s es client-side; el endpoint es idempotente-ish y solo aplica si sigue `IN_EXTRACTION` de ese box.)
- **`GetInExtractionUseCase` (modificado)**: por **sucursal** (todas las `IN_EXTRACTION` del tenant+branch), enriquecido con nombre del extractor (`UserSummaryLookupPort`).
- **`GetAwaitingExtractionUseCase` (modificado)**: agrega `samples` por item.
- **`EndExtractionUseCase`, `CancelExtractionUseCase`**: sin cambios funcionales (cancel ya pide motivo ≥5).

**ETag**: keys nuevas/ajustadas — `in-extraction` pasa a `in-extraction:${tenantId}:${branchId}` (sin extractorId); suma `box-assignments:${tenantId}:${branchId}`. Invalidador AFTER_COMMIT cubre ambas en mutaciones.

## 7. Frontend — cambios

- **`extraction.model.ts`**: `BoxAssignment { boxNumber; extractorId|null; extractorFullName|null }`, `BranchExtractor { id; fullName }`, `SampleRequirement { sampleType; count }`; `InExtractionItem` ya tiene box/extractor; `AwaitingExtractionItem` suma `samples`.
- **`ExtractorAttentionService`**: `getBranchExtractors(branchId)`, `getBoxAssignments(branchId)`, `saveBoxAssignments(branchId, list)`, `assignExtractor(id, boxNumber, branchId)` (firma nueva), `unassignExtraction(id)`. `getInExtraction(branchId)` sin extractorId.
- **Store**: state suma `boxAssignments`, `branchExtractors`, `inProgress: InExtractionItem[]`. Actions: `loadBoxAssignments`/Success/.., `saveBoxAssignments`/.., `loadBranchExtractors`/.., `assignExtractor`/.., `unassignExtraction`/... Effects: refresco por sucursal; `assignSuccess` abre ventana undo (timer 5s en page o effect); `unassign` desde el undo. Selectors: `selectBoxAssignments`, `selectInProgress`, `selectBranchExtractors`, `selectSamplesFor(attentionId)`.
- **Componentes**:
  - `box-config-bar`: render de boxes con extractor + dropdown (extractores de sucursal) + agregar box.
  - `take-patient-modal`: header paciente, chips de muestras por tipo, fila de boxes con `F1..Fn` (libre/ocupado/sin-asignar), atajos de teclado, footer con la nota de undo. Emite `assign(boxNumber)`.
  - `in-progress-list`: tabla (box, extractor, paciente, timer) + acciones Finalizar/Cancelar.
  - `cancel-extraction-dialog`: 3 botones rápidos que setean el textarea + validación ≥5.
- **Page**: layout dos columnas; barra de config arriba; pausa el polling con modal/dialog abierto; toast de undo con cuenta de 5s.
- **Undo UX**: al `assignSuccess`, mostrar toast con "Box N · <extractor>" + botón Deshacer; a los 5s se descarta. Deshacer → `unassignExtraction(id)`.

## 8. Riesgos y dependencias

| Riesgo | Mitigación |
|---|---|
| **BE no compila/bootea** por colisiones Flyway de development (V60/V70-73) — diferido. | Resolver (renumerar) antes de implementar/testear el BE, o como primer paso del plan. Nuestra migración va a `V78+` sin colisión. |
| Box→extractor sin catálogo formal de boxes. | Aceptado: la pantalla maneja boxes ad-hoc; el stepper de sucursal será la fuente formal a futuro (OUT). |
| `unassign` (undo) vs `cancelExtraction` (auditado) se confunden. | Endpoints separados: `unassign` no guarda motivo y limpia campos; `cancel` exige motivo y preserva auditoría. |
| MAX 1 no atómico al asignar a otros extractores. | Validación + optimistic lock (segunda escritura falla); UI refresca en 409. |
| Origen de "cantidad por tipo de muestra" no trivial. | El plan ubica la fuente (catálogo análisis: SampleType + cantidad) y reusa la lógica de rótulos; si no está disponible, se acota a "tipos presentes" sin cantidad. |
| Payload de `samples` en la lista de cola. | Resumen liviano por item; si pesa, mover a `GET /attentions/{id}/samples` on-demand al abrir el modal. |

## 9. Criterios de aceptación

- [ ] `branch_box_assignments` aplica limpio (migración V78+ sin colisión); CRUD por sucursal funciona.
- [ ] `GET /branches/{id}/extractors` lista solo extractores activos de la sucursal.
- [ ] Config box→extractor persiste y se ve igual tras refresh / desde otra apertura de la pantalla.
- [ ] `in-extraction?branchId` devuelve **todas** las en curso de la sucursal con box + nombre extractor.
- [ ] Tomar con F-key asigna al extractor del box; si ese extractor ya tiene una en curso → 409 español.
- [ ] Tomar a un box sin extractor configurado → 422 español.
- [ ] Deshacer dentro de 5s revierte la atención a la cola sin dejar motivo; pasados 5s queda firme.
- [ ] Modal muestra muestras por tipo de tubo con cantidad.
- [ ] Finalizar desde la fila → `FINISHED`. Cancelar desde la fila con uno de los 3 motivos rápidos (editable, ≥5) → vuelve a la cola con `extraction_cancellation_reason` guardado.
- [ ] Mensajes de error en español, sin FQCN/leak.
- [ ] Tests verdes (reducer/effects/selectors/guards + use cases backend); build FE OK.

## 10. Follow-ups documentados (no en este PR)
- Catálogo formal `branch_boxes` (count + label + activo) en el stepper de config de sucursal; la pantalla lo consumiría en vez de manejarlos ad-hoc.
- Nombres de análisis y más datos del paciente en el modal.
- Concurrencia atómica de MAX 1 (trigger / unique parcial / SELECT FOR UPDATE).
- Historial/auditoría de extracciones canceladas y deshacer.
