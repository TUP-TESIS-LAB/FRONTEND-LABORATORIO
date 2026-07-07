# Impresión de estudio con auditoría — Diseño

> **Fecha:** 2026-07-07
> **Rama:** `feat/print-report-audit` (BE) / `feat/print-report-audit` (FE), ambas desde `development`
> **Estado:** Diseño aprobado, pendiente de plan + ticket Jira
> **Repos:** Backend + FRONTEND-LABORATORIO (feature full-stack)

## 1. Contexto y problema

El historial de atenciones del paciente (pestaña "Historial" en el detalle de paciente) hoy expone, por análisis, un precio cobrado — pero **no debe exponer el valor clínico del resultado** en pantalla: la secretaría no debería ver datos de laboratorio tal cual, solo el staff clínico autorizado.

Al mismo tiempo, la secretaría necesita poder **entregarle el resultado en papel** a un paciente que no tiene email ni acceso al portal de pacientes. El sistema ya genera ese PDF de resultado (membrete white-label, firmas de bioquímico/autorizante, hash de verificación) al firmar el estudio en post-analítica, pero el endpoint de descarga existente está gateado a `BIOQUIMICO/ADMINISTRADOR/TECNICO_LABORATORIO` y no audita quién lo descarga.

**Precedente directo ya mergeado:** el último merge a `development` (`feat/kan-168-portal-report-download`, PR #130) agregó `PortalReportQueryPort` — un puerto cross-módulo en `postanalitica` pensado exactamente para que otro módulo consuma reportes firmados sin acoplarse a los internals de post-analítica (batch de disponibilidad + descarga + patientId dueño para anti-IDOR). Es el mismo patrón que ya usamos hoy para el nombre de análisis (`AnalysisLookupPort`). Esta feature extiende ese mismo puerto en vez de inventar uno nuevo — con una salvedad importante: `findFinalReportIdsByProtocolIds` solo devuelve reportes **FINAL** (correcto para el portal del paciente, que no debe ver resultados parciales), pero nuestra decisión de negocio es permitir imprimir parcial o final desde el mostrador. Se agrega un método hermano en el mismo puerto para uso de `atencion` (ver §4.2).

**Objetivo:** que la secretaría pueda imprimir el PDF de resultado ya firmado desde el historial de paciente, sin ver el valor en pantalla, dejando registro de quién imprimió y cuándo.

## 2. Alcance

**Incluye:**
- Nuevo endpoint de impresión de reporte, accesible por `SECRETARIA` además de los roles ya habilitados sobre el reporte.
- Nueva tabla de auditoría de impresión (`report_print_audit`).
- Extensión del historial de paciente (`GetPatientAttentionHistoryUseCase` / `PatientAttentionHistoryResponse`) con disponibilidad de reporte + última impresión.
- Botón "Imprimir estudio" + indicador "Impreso" en la fila expandida del historial de paciente (frontend).
- Port de los 5 fixes de historial ya implementados en `feat/patient-attention-history`/`feat/pacientes-rework` (ramas stale, no mergeadas) hacia esta rama nueva, como primer paso antes de construir impresión encima.

**No incluye:**
- Cambios al endpoint de descarga existente de post-analítica (bioquímica/técnico/admin) — queda intacto, sin auditoría (no es "entrega al paciente").
- Cambios al `findFinalReportIdsByProtocolIds` / flujo del portal de pacientes (KAN-168) — se agrega un método hermano, no se modifica el existente.
- Impresión por análisis individual — el PDF es por protocolo/estudio completo, no se recorta.
- Límite o bloqueo de reimpresiones — se permite libremente, solo con confirmación.
- Selector de versión de reporte — siempre se imprime la más reciente disponible.
- Mecanismo de impresión "nativo" embebido en la UI (impresión térmica, drivers) — se abre el PDF en pestaña nueva y se usa el visor del navegador.

## 3. Decisiones (resultado del brainstorming)

| # | Decisión | Elegido |
|---|----------|---------|
| 1 | Base de rama | Worktrees nuevos desde `development` (no continuar sobre `patient-history`/`pacientes-rework`, ~500 commits atrasadas). |
| 2 | Fixes de historial ya hechos hoy | Se portan a la rama nueva **antes** de construir impresión, para que development los herede en el mismo PR. |
| 3 | Granularidad del botón | Uno por protocolo (no por análisis) — coincide con cómo se genera el PDF hoy. |
| 4 | Estado mínimo para mostrar el botón | Debe existir al menos un reporte firmado (parcial o final) para ese protocolo. |
| 5 | Reimpresión | Permitida sin límite; si ya hay impresión previa, confirmar antes con diálogo. |
| 6 | Integración de permisos | Endpoint **nuevo y separado** (no se toca el endpoint de post-analítica de bioquímica). |
| 7 | Qué versión de reporte se imprime | Siempre la más reciente disponible para el protocolo, sin selector. |
| 8 | Fuente del PDF/disponibilidad | Se extiende `PortalReportQueryPort` (KAN-168) con un método hermano sin filtro FINAL, en vez de crear un puerto nuevo desde cero. |

## 4. Diseño backend

### 4.1 Nuevo endpoint

```
GET /api/v1/analitica/atencion/patients/{patientId}/protocols/{protocolId}/report-print
@PreAuthorize("hasAnyRole('SECRETARIA', 'ADMINISTRADOR', 'BIOQUIMICO', 'TECNICO_LABORATORIO')")
```

Mismo set de roles que ya tiene el endpoint de post-analítica (`ReportController`, `hasAnyRole('BIOQUIMICO', 'ADMINISTRADOR', 'TECNICO_LABORATORIO')`) más `SECRETARIA` — no se restringe a solo secretaría porque el resto del staff clínico también puede necesitar imprimir en mostrador.

Vive en el módulo `atencion` (dueño del historial de paciente), no en `postanalitica` — evita mezclar audiencias/propósitos en el mismo controller.

### 4.2 `PrintPatientReportUseCase`

1. Valida que `protocolId` pertenece a `patientId` y al tenant del caller. Si no → **404** (nunca 403, para no confirmar existencia de datos de otro paciente/tenant).
2. Resuelve el reporte más reciente (parcial o final) para ese protocolo vía `PortalReportQueryPort` — se le agrega un método nuevo `findLatestReportIdsByProtocolIds(tenantId, protocolIds)` (batch, igual forma que el existente `findFinalReportIdsByProtocolIds` pero sin filtrar por tipo FINAL). El método de portal existente **no se toca** — sigue siendo solo-FINAL, es una decisión de negocio distinta y correcta para el paciente.
3. Descarga los bytes con el `findDownload(tenantId, reportId)` ya existente del mismo puerto (reuso total, sin cambios).
4. Si no existe ningún reporte → 404 con mensaje en español ("Todavía no hay un resultado disponible para imprimir").
5. En la **misma transacción**: obtiene los bytes primero y **luego** inserta la fila de auditoría — si la obtención de bytes falla, no queda auditoría fantasma.
6. Devuelve los bytes con headers de descarga (`Content-Type: application/pdf`).

### 4.3 Tabla `report_print_audit`

Nueva migración Flyway (número exacto a asignar en la fase de implementación, verificando el máximo real en `development` — ver [[reference_flyway-version-collision-on-merge]]).

| Columna | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `tenant_id` | bigint | |
| `report_id` | bigint | FK al reporte de post-analítica impreso |
| `protocol_id` | bigint | |
| `patient_id` | bigint | |
| `printed_by_user_id` | bigint | usuario autenticado que imprimió |
| `printed_at` | timestamp | |
| `branch_id` | bigint | sucursal del usuario al momento de imprimir |

No reusa `label_print_history` (acoplada a rótulos) — mismo espíritu de columnas, tabla propia.

### 4.4 Extensión del historial de paciente

`AttentionHistoryItem` / `PatientAttentionHistoryResponse` suman, por atención:
- `reportAvailable: boolean` — hay al menos un reporte firmado (parcial o final) para el protocolo.
- `lastPrintedAt: Instant | null`
- `lastPrintedBy: String | null` (nombre para mostrar, no el id)

Se resuelven en batch con el mismo `findLatestReportIdsByProtocolIds` de §4.2 (una sola llamada para todos los protocolos del historial) + un `findByProtocolIds` en `report_print_audit` para el último `printed_at/printed_by` — mismo patrón que el fix de nombres de análisis de hoy, nada de N+1 por atención.

## 5. Diseño frontend

- Fila expandida del historial: botón "Imprimir estudio", visible solo si `row.reportAvailable`.
- Si `row.lastPrintedBy` no es null: `ConfirmationService` antes de llamar al endpoint ("Ya se imprimió el {fecha} por {usuario}. ¿Reimprimir igual?").
- Al confirmar (o directo si es la primera impresión): `GET .../report-print`, la respuesta (blob) se abre en pestaña nueva — impresión vía visor nativo del navegador.
- Indicador "Impreso" (ícono + tooltip con usuario/fecha) junto al botón, leído del mismo historial ya cargado — sin round-trip extra.
- Tras una impresión exitosa, recarga el historial (mismo mecanismo que hoy) para reflejar el nuevo `lastPrintedAt/lastPrintedBy`.

## 6. Manejo de errores

- 404 (protocolo no pertenece al paciente/tenant, o sin reporte disponible) → mensaje genérico en español, sin leak (regla #4).
- 403 (rol sin permiso) → manejado por Spring Security, mensaje estándar ya sanitizado.
- Frontend: cualquier error de la descarga se muestra como toast, sin bloquear el resto del historial.

## 7. Testing

**Backend:**
- `PrintPatientReportUseCaseTest`: happy path (bytes devueltos + fila de auditoría insertada), 404 sin reporte, 404 con protocolo de otro paciente/tenant.
- Test de seguridad: `SECRETARIA` obtiene 200, un rol sin permiso obtiene 403.
- Extensión de `GetPatientAttentionHistoryUseCaseTest` para `reportAvailable`/`lastPrintedBy`/`lastPrintedAt`.
- Test del nuevo método `findLatestReportIdsByProtocolIds` en el adapter de `PortalReportQueryPort`, verificando que incluye reportes PARCIALES (a diferencia de `findFinalReportIdsByProtocolIds`).

**Frontend:**
- Gating del botón por `reportAvailable`.
- Confirm dialog se dispara solo cuando `lastPrintedBy` no es null.
- Smoke del flujo completo (click → descarga → refresco del indicador).

## 8. Follow-ups no bloqueantes

- El endpoint de post-analítica (bioquímica) sigue sin auditoría — si en el futuro se quiere trazar también esas descargas, es una extensión separada de esta misma tabla.
- No se contempla en v1 un reporte/dashboard de impresiones por sucursal — la auditoría es solo de registro, no de analítica.
