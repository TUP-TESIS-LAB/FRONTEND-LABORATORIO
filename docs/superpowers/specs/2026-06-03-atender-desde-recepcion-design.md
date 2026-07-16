# Atender desde Recepción — Design

> **Jira:** [KAN-73](https://exequielsantoro.atlassian.net/browse/KAN-73) (extiende el scope original con el item 4)
> **Branch:** `feat/KAN-73-recepcion-branch-context` (sigue la misma branch del sub-proyecto A)
> **Repo:** FRONTEND-LABORATORIO + Backend (cambio chico al DTO)
> **Scope:** Sub-proyecto B del backlog del 2026-06-02 (item 4) — sumado al alcance de KAN-73 por decisión del operador (2026-06-03)
> **Estado:** Diseño aprobado, listo para plan de implementación

---

## 1. Contexto

El botón "Atender" del sub-proyecto A (KAN-73) — disponible tanto en filas de la cola de espera como en filas del drawer de turnos del día — hoy navega a `/turnos/atencion-turno?appointmentId=X`, una pantalla vacía (EmptyState). La pantalla real donde se inicia una atención es `/analitica/atencion/nueva` (`AtencionWizardComponent` del módulo analítica).

Al mismo tiempo, ese wizard ya tiene un input de DNI con búsqueda y un flujo completo de **registro inline** cuando el paciente no existe (`/pacientes/nuevo?dni=X&returnTo=...` + sessionStorage para regresar). Lo único que falta es **cablear el botón Atender al wizard pasándole el DNI por URL query param**, para evitar que el operador tipee de nuevo un DNI que ya está en el turno o en la entrada de cola.

**Sin cambios de Backend salvo 2 líneas en `AppointmentResponse`**: exponer el `nationalId` del paciente para que el frontend lo tenga al iterar el drawer (igual patrón que `appointmentId` y `createdAt` que se agregaron en PR #36).

---

## 2. Decisiones de producto

| # | Decisión | Razón |
|---|----------|-------|
| 1 | Mantener el flujo "crear queue entry + llamar por pantalla + navegar" | Reusa `callAppointmentForAttention$`. El paciente queda anunciado en cola y la TV de espera lo llama. Coherente con el flujo manual. |
| 2 | Cambiar ruta destino: `/turnos/atencion-turno` → `/analitica/atencion/nueva` | El wizard real vive en analítica; la ruta vieja está vacía. |
| 3 | DNI por URL query param (`?dni=X`) | Pedido explícito del operador; URL legible y compartible. |
| 4 | Mantener sessionStorage como fallback en el wizard | No romper el flujo existente de `/pacientes/nuevo` → vuelta al wizard preservando el DNI. |
| 5 | Backend: exponer `nationalId` en `AppointmentResponse` | Evita un HTTP extra de lookup por click; mismo patrón que `appointmentId`/`createdAt` (sin migración, 2 líneas). |
| 6 | Si paciente existe → queda en step "Datos generales" (sin auto-avance) | El operador puede agregar indicaciones antes de continuar. |
| 7 | Si paciente no existe → reusar `/pacientes/nuevo` (flujo existente) | Ya está implementado y funciona. |

---

## 3. Arquitectura

```
Botón "Atender" (cola O drawer)
    │
    ├─ dispatch(callAppointmentForAttention({ appointmentId, dni }))   ← dni nuevo
    │
    ▼
queue.effects.callAppointmentForAttention$  (sin cambios funcionales)
    │
    └─ POST /api/v1/turnos/queue/by-appointment/:id/call
        └─ on success → dispatch(callAppointmentForAttentionSuccess({ appointmentId, dni }))
            │
            ▼
        navigateAfterCall$  (modificado)
            │
            └─ router.navigate(['/analitica/atencion/nueva'], { queryParams: { dni } })

AtencionWizardComponent  (sin cambios)
    │
    └─ DatosGeneralesStepComponent.initialDni()  (modificado)
        │
        ├─ leer queryParamMap.get('dni') con prioridad
        └─ fallback a readPendingDni() (flujo sessionStorage existente)
            │
            ▼
        PatientSearchComponent [initialDni]="dni"
        → auto-search on mount → emit (patientSelected | notFound)
            │                                              │
            ▼                                              ▼
        Paciente cargado, user clickea Continuar    /pacientes/nuevo?dni=X&returnTo=...
                                                    (flujo existente sin cambios)
```

---

## 4. Cambios concretos

### Backend (1 archivo)

| Archivo | Cambio |
|---------|--------|
| `modules/turnos/presentation/dto/AppointmentResponse.java` | Agregar `String nationalId` al record + factory que lo extraiga del Patient. Equivale al patrón de PR #36 (commit `33794f9`, `261f3a3`). |

### Frontend (~7 archivos)

| Archivo | Cambio |
|---------|--------|
| `features/turnos/models/appointment.model.ts` | Agregar `nationalId: string \| null` al interface `Appointment`. |
| `features/turnos/services/appointment.service.ts` | En el map de `BackendAppointment → Appointment`, copiar `nationalId`. Verificar también que el field viene desde el response (el `BackendAppointment` interno debe incluirlo). |
| `features/turnos/store/appointments/appointments.derived.selectors.ts` | Agregar `dni: string \| null` al `DrawerAppointmentRow` y mapearlo desde `a.nationalId`. |
| `features/turnos/store/queue/queue.actions.ts` | `callAppointmentForAttention` action: agregar `dni: string \| null` al payload. Igual para Success. |
| `features/turnos/store/queue/queue.effects.ts` | `navigateAfterCall$`: cambiar a `router.navigate(['/analitica/atencion/nueva'], { queryParams: { dni } })`. |
| `features/turnos/components/scheduled-appointments-drawer.component.ts` | `onAtender(appointmentId, dni)`: pasar el `dni` del row al dispatch. |
| `features/turnos/pages/recepcion/recepcion-con-totem.component.ts` | Cambiar el botón "Atender" de la cola para dispatchear `callAppointmentForAttention({ appointmentId: row.appointmentId, dni: row.nationalId })` en lugar de navegar al `/turnos/atencion-turno/:id`. Requiere que `row.appointmentId` esté disponible (PR #36 ya lo expone). Si `appointmentId` es null (ST walk-in), navegar directo a `/analitica/atencion/nueva?dni=X` sin crear queue entry adicional (ya está en cola). |
| `features/analitica/pages/atencion/atencion-wizard/steps/datos-generales-step/datos-generales-step.component.ts` | `initialDni()`: leer también del `route.snapshot.queryParamMap.get('dni')` con prioridad sobre `readPendingDni()`. Llamar `clearPendingDni()` solo si vino de sessionStorage. |

### Sin cambios

- `AtencionWizardComponent` (solo el step interno cambia).
- `PatientSearchComponent` (ya acepta `initialDni`).
- Flujo `/pacientes/nuevo` (ya redirige back con returnTo).

---

## 5. Comportamiento por origen

| Origen del click | appointmentId | nationalId | Acción |
|------------------|---------------|------------|--------|
| Drawer (turno del día) | sí | sí (vía nuevo DTO field) | dispatch `callAppointmentForAttention({ appointmentId, dni })` → crea queue entry + llama + navega |
| Cola con turno (CT) | sí (row.appointmentId) | sí (row.nationalId) | dispatch `callAppointmentForAttention({ appointmentId, dni })` → re-llama (idempotente backend) + navega |
| Cola sin turno (ST walk-in) | null | sí (row.nationalId tipeado en tótem) | navegar directo a `/analitica/atencion/nueva?dni=X` (sin re-llamar — ya está anunciado) |

---

## 6. Manejo de errores

| Caso | UX |
|------|-----|
| `POST /queue/by-appointment/:id/call` falla | Toast error (ya cubierto por `showErrorToast$` existente). No navega. |
| El DNI viene pero el paciente no existe | El `PatientSearchComponent` emite `notFound` → flujo existente redirige a `/pacientes/nuevo?dni=X&returnTo=/analitica/atencion/nueva`. |
| Query param `dni` faltante o vacío | El input del wizard queda vacío. El operador tipea manualmente (comportamiento actual). |
| Query param `dni` con caracteres no numéricos | `PatientSearchComponent.doSearch()` ya hace `replace(/\D/g, '')`. |
| Backend de turnos disponible pero `nationalId` viene null (paciente sin DNI registrado, edge case) | El query param se omite y el wizard queda vacío. |

---

## 7. Testing

| Tipo | Qué cubre |
|------|-----------|
| Unit effect | `navigateAfterCall$`: dispatcha success → navega a `/analitica/atencion/nueva` con `?dni=X`. |
| Unit effect | `callAppointmentForAttention$`: pasa el dni del payload al Success action. |
| Unit selector | `DrawerAppointmentRow` incluye `dni` desde `appointment.nationalId`. |
| Smoke | `DatosGeneralesStepComponent`: query param `dni` se lee y se pasa a `PatientSearchComponent`. |
| Smoke | `DatosGeneralesStepComponent`: si no hay query param, lee de sessionStorage (fallback). |

No agregamos tests al `PatientSearchComponent` (ya está cubierto su comportamiento de auto-search por tests existentes).

---

## 8. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| El backend del compañero (asignación de sucursal al user) llega al mismo tiempo y rompe la branch base | Coordinar handoff; ambos cambios son ortogonales (DTO de Appointment vs User entity). |
| El query param `dni` interfiere con el flujo de sessionStorage cuando el user vuelve de `/pacientes/nuevo` | Prioridad de query param + `clearPendingDni()` solo si vino del fallback (no si vino del query param) evita el bug. |
| `AppointmentResponse` agrega `nationalId` y rompe consumidores (Portal) | El field es opcional (`String nationalId` puede ser null). Los consumidores que no lo leen no se ven afectados. |

---

## 9. Definición de hecho

- [ ] Backend: `AppointmentResponse` expone `nationalId` (PR backend chica)
- [ ] Frontend: `Appointment` model + `appointment.service` mapean `nationalId`
- [ ] Frontend: `DrawerAppointmentRow` incluye `dni`
- [ ] Frontend: `callAppointmentForAttention` action acepta `dni`
- [ ] Frontend: `navigateAfterCall$` navega a `/analitica/atencion/nueva` con `?dni=X`
- [ ] Frontend: botón Atender del drawer pasa `dni: row.dni`
- [ ] Frontend: botón Atender de la cola dispatcha la action (en vez de navegar manual)
- [ ] Frontend: `DatosGeneralesStepComponent` lee `dni` del query param con prioridad
- [ ] Tests unitarios listados en sección 7 pasan
- [ ] Smoke manual: click en Atender de drawer → llega a wizard con DNI prellenado
- [ ] Smoke manual: click en Atender de cola CT → llega a wizard con DNI prellenado
- [ ] Smoke manual: si DNI no existe → redirige a `/pacientes/nuevo` y al volver el wizard preserva DNI
