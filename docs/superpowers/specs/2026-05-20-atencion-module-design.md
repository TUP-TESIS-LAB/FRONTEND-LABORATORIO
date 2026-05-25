# Módulo Atención — Dashboard + Wizard

**Fecha:** 2026-05-20
**Branch:** `feat/atencion-module` → `development`
**Backend pre-req:** [TUP-TESIS-LAB/Backend#16](https://github.com/TUP-TESIS-LAB/Backend/pull/16) — skip-financiero en `end-secretary-phase`.

## Objetivo

Reemplazar el placeholder de `/analitica/atencion` por un módulo funcional compuesto por dos pantallas:

1. **Dashboard de Atención** — KPIs del día + listado filtrable de atenciones (hoy y días anteriores). Permite retomar atenciones en curso buscando por DNI, nombre o Nº de atención.
2. **Wizard de Atención** — flujo paso a paso por las fases de secretaría. Los pasos de **cobro** y **facturación** son aditivos: visibles únicamente cuando el tenant tiene `ModuleKey.Financiero` activo.

La cola de turnos (módulo turnos, propiedad de otro equipo) es el disparador natural del wizard para flujos normales. Walk-ins (atención sin turno previo) los maneja turnos también. Este PR no toca turnos.

## Arquitectura

```
features/analitica/
├── pages/atencion/
│   ├── atencion-dashboard/        ← nueva
│   ├── atencion-wizard/           ← nueva
│   │   └── steps/                 ← componentes por fase
│   └── atencion.component.ts      ← reemplazado por dashboard
├── store/atencion/                ← NgRx clásico (actions/effects/reducer/selectors)
├── services/atencion-api.service.ts
└── models/atencion.model.ts       ← AttentionResponse + AttentionState (mirror del backend)
```

**Rutas:**
- `/analitica/atencion` → dashboard
- `/analitica/atencion/:id` → wizard (retoma una atención existente)
- `/analitica/atencion/nueva?appointmentId=X` → wizard creando desde turno (`POST /api/v1/attentions/prefilled`)

El módulo Atención es **core** (siempre accesible), no se le aplica `moduleActiveGuard`. La gating de Financiero ocurre dentro del wizard.

## Dashboard

**KPIs** (todos como `computed()` derivados del listado del día en el store):
- Atenciones del día (total)
- Pendientes (no terminales)
- Esperando extracción (`AWAITING_EXTRACTION`)
- Finalizadas (`FINISHED`)
- Urgentes (atenciones con `isUrgent == true`)

**Listado:**
- Columnas: Nº atención · DNI · Paciente · Fecha · Estado · Acción.
- Acción: "Retomar" para estados no terminales → navega al wizard; "Ver" para terminales → wizard en modo read-only.
- Filtros: búsqueda libre (DNI / nombre / Nº atención), estados (multi-select), rango de fechas (default = hoy).
- Búsqueda y filtros se aplican client-side sobre el listado completo del rango. El backend solo expone `GET /api/v1/attentions?excludeStates=...`; un endpoint paginado/filtrado queda como follow-up si el volumen crece.

## Wizard

**Mecanismo de pasos declarativo + extensible:**

```ts
interface WizardStep {
  key: 'datos' | 'analisis' | 'cobro' | 'facturacion' | 'confirmar';
  label: string;
  requires?: ModuleKey;             // si OFF para el tenant, el paso se filtra
  matchesStates: AttentionState[];  // mapea estado del backend → step activo
  component: Type<unknown>;
}

readonly steps = computed(() =>
  ALL_STEPS.filter(s => !s.requires || this.moduleRegistry.isActive(s.requires))
);
```

Este patrón es el contrato para cualquier feature futura cuyo flujo dependa de un `ModuleKey` activable.

**Pasos:**
1. `datos` — formulario para `PATCH /attentions/{id}/assign/general-data`
2. `analisis` — selector de análisis + flag urgente + Nº autorización → `PATCH /attentions/{id}/add/analysis`
3. `cobro` *(requires Financiero)* — `PATCH /attentions/{id}/add/payment` luego `PATCH /attentions/{id}/end-collection`
4. `facturacion` *(requires Financiero)* — `PATCH /attentions/{id}/end-billing`
5. `confirmar` — `PATCH /attentions/{id}/end-secretary-phase`

**Para tenants con Financiero OFF:** "Continuar" desde `analisis` llama directo a `end-secretary-phase`. El backend (PR coordinado) reconoce el salto.

**Layout:** Stepper horizontal (PrimeNG). Botonera al pie: `Volver fase` (`return-phase`), `Observaciones` (modal), `Cancelar atención` (modal con motivo), `Continuar`. Estados terminales (`FINISHED`/`CANCELED`/`FAILED`) → modo read-only, sin botones de avance.

**Sincronización con state machine:** al cargar `/atencion/:id`, el step activo se deriva de `attentionState` vía `matchesStates`. Si el backend devuelve un error `InvalidAttentionState` (otro usuario movió el estado) → toast + recarga del detalle.

## NgRx (siguiendo convención `ngrx-backend-request`)

**Estado:**
```ts
interface AtencionState {
  list: { items: AttentionResponse[]; loading: boolean; error: string | null };
  filters: { search: string; states: AttentionState[]; dateFrom: string; dateTo: string };
  detail: { item: AttentionResponse | null; loading: boolean; error: string | null };
}
```

**Acciones principales:** `loadAttentions / Success / Failure`, `setFilters`, `loadAttention(id)`, `createBlank`, `createPreFilled(appointmentId)`, `assignGeneralData`, `addAnalysisList`, `addPayment`, `endCollection`, `endBilling`, `endSecretaryPhase`, `returnPhase`, `cancelAttention`, `addObservations`. Todas con la triada `Action / Success / Failure`.

**Selectors:** `selectAttentionList`, `selectFilteredAttentions` (aplica filtros client-side), `selectAttentionKpis` (deriva los 5 KPIs), `selectAttentionDetail`, `selectActiveStep`.

## Errores

Los 7 handlers que ya tiene `GlobalExceptionHandler` del backend (AttentionNotFound, InvalidAttentionState, AppointmentNotFound, AnalysisNotFound, BranchNotFoundForAttention, InvalidAppointmentData, ModuleDisabledException) mapean a toasts via interceptor existente. `409 InvalidAttentionState` dispara recarga del detalle (alguien más cambió el estado).

## No-objetivos

- Cola de pacientes / walk-in (turnos)
- Pantalla del extractor (`/awaiting-extraction`, `/in-extraction`) — entrega separada
- Endpoint paginado o filtrado server-side — follow-up si crece el volumen
- Edición de atenciones terminales (solo read-only + observaciones)
