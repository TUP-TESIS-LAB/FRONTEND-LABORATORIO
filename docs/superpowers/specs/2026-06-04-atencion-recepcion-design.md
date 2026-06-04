# Replanteo del flujo de Atención — Recepción guiada por DNI

> **Fecha:** 2026-06-04
> **Rama:** `feat/atencion-recepcion` (worktrees en `Backend/` y `FRONTEND-LABORATORIO/`, base `origin/development`)
> **Estado:** Diseño aprobado (brainstorming). Pendiente: plan de implementación + ticket de Jira.
> **Jira:** [KAN-77](https://exequielsantoro.atlassian.net/browse/KAN-77)

## 1. Contexto y problema

La atención de laboratorio se dispara hoy desde el wizard `analitica/atencion/nueva`. En la operación real, **~90% de las atenciones las dispara un Turno**, que viaja con el DNI del paciente. El flujo actual obliga a buscar el paciente dentro del paso 1 y, si no existe, **redirige a `/pacientes/nuevo`** (con `returnTo` + `sessionStorage`) y vuelve — una fricción innecesaria. Además el paso de análisis usa un **catálogo demo/mock** hardcodeado en el frontend, y el cierre de la atención no deja listos los **rótulos** que el paciente necesita llevar al extractor.

Este cambio replantea el flujo para que el turno entre con `?dni`, se verifique el paciente **antes** de montar el wizard, y el paso final deje todo listo para la extracción.

## 2. Objetivos

- Entrar a la atención con `…/atencion/nueva?dni=<dni>` y resolver el paciente antes de crear la atención.
- Paso 1 con dos modos: **verificar** ficha existente (con corrección inline) o **alta mínima inline** (sin salir del wizard).
- Paso 2 consumiendo el **catálogo real** del backend (NBU), sin mock.
- Paso 3 ("terminar") que **genera el protocolo** y **crea + imprime los rótulos**, y manda la atención a la cola de extracción.

## 3. No-objetivos (YAGNI)

- Cobro / Facturación: el módulo **Financiero no existe** hoy (activable por tenant). El flujo core funciona sin él.
- Integración NBU **externa**: "conexión real con NBU" = consumir el catálogo real del backend, no una API externa.
- Edición de coberturas/contactos/direcciones en el alta mínima.
- Cambios en la cola de extracción (se mergea por separado, fuera de esta rama).

## 4. Enfoque elegido

**Evolucionar el `AtencionWizardComponent` existente in-place** (Enfoque A): reusar el componente, el store NgRx, la ruta y el stepper guiado por `AttentionState`. Menor riesgo, entregable por partes (paso 1 → 2 → 3). Descartados: pantalla de recepción separada (más piezas) y resolver de ruta + endpoint atómico en BE (acopla la UI al backend y no encaja con el alta inline interactiva).

## 5. Flujo general

```
Turno → /analitica/atencion/nueva?dni=18901234
   │  (antes de crear la atención)
   ▼
GET /api/v1/analitica/patients/exists?dni  ──► ¿existe?
        SÍ → Paso 1 modo "Verificar"   (GET /patients/dni/{dni} para la ficha)
        NO → Paso 1 modo "Alta mínima"
   ▼ (paciente resuelto → patientId)
createBlankAtencion → assignGeneralData({patientId, indicaciones})
   ▼
Paso 2 — Análisis (catálogo real + NBU)
   ▼
Paso 3 — Terminar → PATCH end-secretary-phase
        → ensureProtocolCreated (ya existe)
        → triggerLabelCreation (NUEVO acá)
        → advanceState(AWAITING_EXTRACTION)
```

Hoy, sin Financiero, el wizard muestra `Datos generales → Análisis → Confirmar`. Si en el futuro se activa Financiero, `Cobro`/`Facturación` se intercalan solos (el wizard ya los gatea por `ModuleKey.Financiero`). El paso 3 sigue siendo el cierre de secretaría en ambos casos.

## 6. Paso 1 — Paciente (frontend)

**Resolución por DNI.** Al montar el wizard con `?dni`, se dispara la acción `resolvePatientByDni(dni)`. El effect llama `GET /api/v1/analitica/patients/exists?dni=`; si existe, `GET /api/v1/analitica/patients/dni/{dni}` para traer la ficha. El store guarda `resolvedPatient | notFound`.

**Modo Verificar (existe).** Se muestra la ficha en **solo lectura** ("¿Los datos del paciente son correctos?"). Botón **"Corregir"** habilita los campos editables y guarda con `PUT /api/v1/analitica/patients/{id}`. Botón **"Confirmar y seguir"** avanza.

**Modo Alta mínima (no existe).** Form inline (sin redirigir a `/pacientes/nuevo`) con **datos generales completos obligatorios**: DNI (prellenado), Nombre, Apellido, Fecha de nacimiento, Género, Sexo al nacer → `POST /api/v1/analitica/patients` → la ficha queda en estado `COMPLETE` y pasa a `resolvedPatient`.

**Creación de la atención.** Recién con `patientId` resuelto, "Confirmar y seguir" orquesta en un effect: `createBlankAtencion` → `assignGeneralData({patientId, indicaciones})` → avanza a Análisis.

**Se elimina** el redirect a `/pacientes/nuevo?returnTo=…` y el manejo de `sessionStorage` asociado (`PENDING_DNI_KEY`).

## 7. Paso 2 — Análisis (frontend)

El `AnalysisPickerComponent` deja de usar el catálogo **demo/mock** hardcodeado y consume el backend real:
- `GET /api/v1/analitica/analysis?shortCode=…|shortCodePrefix=…|nameLike=…` para buscar prácticas.
- `GET /api/v1/analitica/nbu/current` para el valor de la UB y calcular precio (`ubCount` por análisis).

Si no hay endpoint NBU disponible, el precio se oculta (comportamiento ya existente). El catálogo de análisis sí es obligatorio: sin fallback a mock.

## 8. Paso 3 — Terminar (único cambio de backend)

**Estado verificado en `development`:** `EndSecretaryPhaseUseCase` ya contempla `canSkipFinanciero` (estado `REGISTERING_ANALYSES` + Financiero off): llama `ensureProtocolCreated` (idempotente, exige análisis activos) y avanza a `AWAITING_EXTRACTION`. **El protocolo del paso 3 ya está implementado.**

**Cambio:** mover el trigger de rótulos al cierre de secretaría.
- En `EndSecretaryPhaseUseCase`, tras asegurar el protocolo, invocar
  `labelCreationPort.triggerLabelCreation(protocolId, attentionId, analysisIds, tenantId, branchId, userId)`
  (idéntico a como lo hace hoy `EndExtractionUseCase`). `analysisIds` = autorizaciones activas y autorizadas; requiere `protocolId != null` (garantizado tras `ensureProtocolCreated`). Debe ejecutarse también en la rama `AWAITING_CONFIRMATION` (Financiero on, protocolo ya creado en end-billing).
- `EndSecretaryPhaseUseCase.Input` suma `userId`; el `SecretaryAttentionController` lo obtiene del security context (como `ExtractorAttentionController`).
- **Quitar** el `triggerLabelCreation` de `EndExtractionUseCase` para no duplicar rótulos. La extracción conserva `protocolSampleUpdatePort.notifySampleCollected`.

**Transaccionalidad (decisión):** la creación de rótulos es **transaccional** (las excepciones propagan y abortan el "terminar"), consistente con `EndExtractionUseCase`. Así ninguna atención queda sin rótulos. (Alternativa fire-and-forget descartada para esta versión.)

**Impresión física:** reusa el flujo Zebra existente — `LabelCreationAdapter` resuelve la impresora por sucursal y crea el `PrintJob`; el agente Zebra lo pollea e imprime.

## 9. Manejo de errores (regla #4: español, sin leak de internals)

- Falla/timeout de `exists` o `dni`: mensaje "No pudimos verificar el paciente, reintentá" + permitir reintento (no dejar el paso en blanco).
- `POST`/`PUT` de paciente inválido: errores de validación en español por campo.
- "Terminar" sin análisis activos: ya lanza `InvalidAttentionStateException` ("…sin análisis activos").
- Falla de creación/impresión de rótulos: aborta el "terminar" (transaccional) con mensaje en español; el detalle técnico solo va a `log`.

## 10. Testing

- **Frontend** (`ng test` componentes AOT; `vitest` store):
  - Paso 1: branching por `exists` (verify vs alta), guardado inline (`PUT`), alta (`POST`), validación de obligatorios.
  - Store/effects: `resolvePatientByDni` y la orquestación `createBlank → assignGeneralData`.
  - Paso 2: el picker consume el catálogo real (sin mock).
- **Backend** (unitario):
  - `EndSecretaryPhaseUseCase`: con Financiero off crea protocolo **y** dispara `LabelCreationPort` (mock); idempotencia del protocolo.
  - `EndExtractionUseCase`: ya **no** dispara rótulos; conserva `notifySampleCollected`.
  - Mensajes de error sin `lab.laboratorio.`, `java.`, `No enum constant`.

## 11. Archivos afectados (orientativo)

**Frontend** (`FRONTEND-LABORATORIO`):
- `src/app/features/analitica/pages/atencion/atencion-wizard/` — component + `steps/datos-generales-step`, `steps/analisis-step`, `steps/resumen-step`.
- `src/app/features/analitica/store/atencion/` — actions/effects/reducer/selectors (`resolvePatientByDni`, orquestación crear+asignar).
- `src/app/features/analitica/services/analysis.service.ts` — sacar catálogo mock.
- `src/app/features/pacientes/services/patient.service.ts` — `exists`, `by-dni`, `create`, `update`.
- `analitica.routes.ts` — binding de `?dni`.

**Backend** (`Backend`):
- `modules/analitica/atencion/application/usecase/EndSecretaryPhaseUseCase.java` — trigger de rótulos + `userId` en `Input`.
- `modules/analitica/atencion/presentation/SecretaryAttentionController.java` — pasar `userId`.
- `modules/analitica/atencion/application/usecase/EndExtractionUseCase.java` — quitar trigger de rótulos.
- Tests unitarios de ambos use cases.

## 12. Endpoints involucrados (ya existentes)

- `GET /api/v1/analitica/patients/exists?dni=` · `GET /api/v1/analitica/patients/dni/{dni}`
- `POST /api/v1/analitica/patients` · `PUT /api/v1/analitica/patients/{id}`
- `POST /api/v1/attentions` · `PATCH /api/v1/attentions/{id}/assign/general-data` · `PATCH /api/v1/attentions/{id}/add/analysis`
- `PATCH /api/v1/attentions/{id}/end-secretary-phase`
- `GET /api/v1/analitica/analysis?…` · `GET /api/v1/analitica/nbu/current`
