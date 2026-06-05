# Flujo end-to-end de la Atención (post replanteo) — KAN-77

> Cómo quedó el flujo de atención después del replanteo "recepción por DNI".
> Rama `feat/atencion-recepcion` · PRs: [Backend #39](https://github.com/TUP-TESIS-LAB/Backend/pull/39) · [Frontend #24](https://github.com/TUP-TESIS-LAB/FRONTEND-LABORATORIO/pull/24) · Jira: [KAN-77](https://exequielsantoro.atlassian.net/browse/KAN-77)
> Spec: `docs/superpowers/specs/2026-06-04-atencion-recepcion-design.md` · Plan: `docs/superpowers/plans/2026-06-04-atencion-recepcion.md`

`[BE]` = backend (monolito Spring) · `[FE]` = frontend (Angular). Los estados son los de la máquina de la atención (`AttentionState`).

---

## Diagrama del flujo

```
TURNO ──> /analitica/atencion/nueva?dni=18901234
   │
   ▼  PASO 1 · PACIENTE                                    (estado: pre-atención)
   ├─ [FE] al montar: resolvePatientByDni(dni)
   │      [BE] GET /api/v1/analitica/patients/exists?dni  ──┐
   │                              ┌──── existe ─────────────┘── GET /patients/dni/{dni}
   │      EXISTE → ficha solo-lectura "¿son correctos los datos?"
   │              └─ "Corregir" → editable → PUT /patients/{id}
   │      NO EXISTE → alta mínima inline (DNI+nombre+apellido+fecha nac+género+sexo al nacer)
   │              └─ POST /patients  → ficha COMPLETE      (sin salir a /pacientes/nuevo)
   │
   ├─ "Confirmar y seguir" → startAttentionForPatient(patientId, indicaciones)
   │      [BE] POST /attentions                 → crea atención (REGISTERING_GENERAL_DATA)
   │      [BE] PATCH /attentions/{id}/assign/general-data
   │                                            → valida paciente por tenant, asigna,
   │                                              avanza a REGISTERING_ANALYSES
   │      [FE] navega a /analitica/atencion/{id}
   ▼
   PASO 2 · ANÁLISIS                                       (estado: REGISTERING_ANALYSES)
   ├─ [FE] picker → catálogo REAL del tenant
   │      [BE] GET /api/v1/analitica/analysis?shortCode= / ?shortCodePrefix= / ?nameLike=
   │           (busca en tenant_analysis ⨝ analysis_catalog; id = id del catálogo global)
   │      (precio por UB oculto: el valor NBU quedó como follow-up)
   ├─ "Continuar" → addAnalysisList(analysisIds, urgente, autorización)
   │      [BE] PATCH /attentions/{id}/add/analysis
   ▼
   PASO 3 · TERMINAR                                       (estado: REGISTERING_ANALYSES → …)
   └─ "Finalizar atención" → endSecretaryPhase
          [BE] PATCH /attentions/{id}/end-secretary-phase  (EndSecretaryPhaseUseCase)
              1. ensureProtocolCreated  → crea el PROTOCOLO (samples por tipo de muestra)
              2. triggerLabels          → crea + manda a imprimir los RÓTULOS (PrintJob Zebra)
              3. advanceState           → AWAITING_EXTRACTION  (cola de extracción)
              · transaccional: si falla la impresión, NO cierra (nadie queda sin rótulos)
   ▼
   El paciente sale con los rótulos y va a extracción.
```

### Aguas abajo (extractor — sin cambios salvo uno)

```
AWAITING_EXTRACTION → [extractor toma de la cola] → assign/extractor → IN_EXTRACTION
   └─ end-extraction → notifySampleCollected (marca muestras tomadas en el protocolo) → FINISHED
       · cambio de esta entrega: la extracción YA NO crea rótulos (se crean en el paso 3)
```

---

## Paso a paso

### Paso 1 — Paciente
- La atención entra por `…/atencion/nueva?dni=<dni>` (el wizard bindea `?dni` y se lo pasa al paso 1 como `initialDni`).
- Al montar, el paso 1 dispara `resolvePatientByDni(dni)`. El effect: `GET /patients/exists?dni`; si existe, `GET /patients/dni/{dni}` para traer la ficha.
- **Existe** → ficha en **solo lectura** para verificar. Botón **"Corregir"** habilita la edición inline y guarda con `PUT /patients/{id}` (sin salir del wizard).
- **No existe** → **alta mínima inline** con datos generales completos obligatorios (DNI, nombre, apellido, fecha de nacimiento, género, sexo al nacer; género/sexo son selects con los enums del backend) → `POST /patients` → la ficha queda en estado `COMPLETE`.
- Recién con el paciente resuelto, **"Confirmar y seguir"** orquesta (en un solo effect): `POST /attentions` (crea la atención) → `PATCH /assign/general-data` (asigna paciente + indicaciones, y avanza a `REGISTERING_ANALYSES`) → navega a la atención creada.
- Se eliminó el redirect anterior a `/pacientes/nuevo` y el manejo de `sessionStorage` (pendingDni).

### Paso 2 — Análisis
- El picker consume el **catálogo real** del backend: `GET /api/v1/analitica/analysis?shortCode=|shortCodePrefix=&limit=|nameLike=&limit=` y `GET /api/v1/analitica/analysis/{id}` para el detalle.
- La búsqueda corre sobre las prácticas **activadas por el tenant** (`tenant_analysis`) unidas al catálogo global (`analysis_catalog`), siempre filtrada por tenant + activas.
- El **`id`** que devuelve es el del **catálogo global** (no el de `tenant_analysis`), porque la atención guarda ese id y el protocolo lo resuelve por ahí. El `shortCode`/nombre que se muestran salen de la capa del tenant.
- "Continuar" → `addAnalysisList(analysisIds, urgente, nro autorización)` → `PATCH /attentions/{id}/add/analysis`.
- El **precio por UB** (ubCount × valor NBU) se oculta: el valor NBU no existe aún en el backend (ver follow-up).

### Paso 3 — Terminar
- "Finalizar atención" → `endSecretaryPhase` → `PATCH /attentions/{id}/end-secretary-phase`.
- En `EndSecretaryPhaseUseCase` (rama sin Financiero, que es el core de hoy):
  1. `ensureProtocolCreated` — crea el **protocolo** (idempotente; exige análisis activos), agrupando muestras por tipo.
  2. `triggerLabels` — `LabelCreationPort.triggerLabelCreation(protocolId, attentionId, analysisIds, tenantId, branchId, userId)` → crea los **rótulos** (estado PENDING) + un **PrintJob** que el agente de impresora Zebra pollea e imprime.
  3. `advanceState(AWAITING_EXTRACTION)` — manda la atención a la **cola de extracción**.
  - Es **transaccional**: si falla la creación/impresión de rótulos, el "terminar" aborta (ninguna atención queda sin rótulos).

### Aguas abajo — Extracción
- El extractor toma de la cola (`GET /attentions/awaiting-extraction`), asigna (`assign/extractor` → `IN_EXTRACTION`), extrae, y `end-extraction` → `notifySampleCollected` (marca muestras tomadas en el protocolo) → `FINISHED`.
- **Cambio de esta entrega:** la extracción **ya no crea rótulos** (se crean en el paso 3).

---

## Qué cambió respecto a antes

| Antes | Ahora |
|---|---|
| Paso 1 buscaba con `lab-patient-search`; si no existía, **redirigía a `/pacientes/nuevo`** y volvía (con sessionStorage) | Entrada por `?dni`, **verificación/alta inline** en el mismo wizard; sin redirect |
| Paso 2 usaba un **catálogo demo/mock** hardcodeado en el front | Paso 2 pega al **catálogo real** del backend (endpoint nuevo) |
| Rótulos se creaban al **finalizar la extracción** | Rótulos se crean al **terminar la secretaría** (paso 3), para que el paciente los lleve al extractor |
| Protocolo se asociaba al cierre (ya existía sin Financiero) | Igual, pero ahora el cierre dispara **protocolo + rótulos** juntos |

---

## Detalles que importan

- **Module-aware (Financiero):** hoy Financiero no existe, así que el flujo core es `paciente → análisis → terminar`. Si se activa, **Cobro/Facturación** se intercalan solos entre análisis y terminar (el wizard ya los gatea por `ModuleKey.Financiero`); el protocolo se crearía en `end-billing` y el "terminar" sigue generando los rótulos.
- **`id` del análisis** = id del catálogo global (no de `tenant_analysis`).
- **Dos repos:** los **dos PRs deben mergear** para que el paso 2 funcione (el FE pega al endpoint nuevo del BE).

---

## Endpoints involucrados

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/api/v1/analitica/patients/exists?dni=` | verificar existencia (paso 1) |
| GET | `/api/v1/analitica/patients/dni/{dni}` | traer ficha (paso 1) |
| POST | `/api/v1/analitica/patients` | alta mínima inline (paso 1) |
| PUT | `/api/v1/analitica/patients/{id}` | corregir ficha inline (paso 1) |
| POST | `/api/v1/attentions` | crear atención |
| PATCH | `/api/v1/attentions/{id}/assign/general-data` | asignar paciente + avanzar |
| GET | `/api/v1/analitica/analysis?shortCode=\|shortCodePrefix=&limit=\|nameLike=&limit=` | búsqueda catálogo (paso 2) **[nuevo]** |
| GET | `/api/v1/analitica/analysis/{id}` | detalle de análisis (paso 2) **[nuevo]** |
| PATCH | `/api/v1/attentions/{id}/add/analysis` | agregar análisis |
| PATCH | `/api/v1/attentions/{id}/end-secretary-phase` | terminar → protocolo + rótulos + cola |
| GET/PATCH | `/api/v1/attentions/awaiting-extraction`, `/assign/extractor`, `/end-extraction` | extracción (aguas abajo) |

---

## Estado y pendientes

- **Implementado y testeado:** BE 8+4 use-case + 9 paso-2 + 33 IT; FE 546 unit + build. En review (PRs abiertos).
- **Follow-up — precio NBU (ticket aparte):** no existe el valor de la UB (`/api/v1/analitica/nbu/current`) ni el `ubCount` por práctica en el backend. Mientras tanto el front oculta el precio. Pendiente: modelar el valor UB (tabla + endpoint) + `ubCount` + seed, y definir quién carga el valor.
