# Cola de Extracción — Spec

> **Estado:** Draft — pendiente de plan + ticket Jira
> **Fecha:** 2026-05-25
> **Rama:** `feat/cola-extraccion` (front + back)
> **Mockup:** [2026-05-25-cola-extraccion-mockup.html](./2026-05-25-cola-extraccion-mockup.html)
> **Estándar aplicado:** polling con ETag/304 (regla #5 de ambos CLAUDE.md — primera implementación de referencia)

---

## 1. Contexto

El módulo de atención del backend ya soporta el flujo completo paciente → atención → análisis cargados → cola de extracción → muestra tomada → finalizada. El frontend cubre todo hasta **carga de análisis**. Falta la pantalla que usa el rol **EXTRACTOR** para ver la cola y operar sobre ella.

El backend ya expone los 5 endpoints necesarios en `ExtractorAttentionController` (`/awaiting-extraction`, `/in-extraction`, `/assign/extractor`, `/cancel-extraction`, `/end-extraction`). Esta spec define la pantalla del frontend + los ajustes mínimos al backend para soportarla bien (filtrado por extractor, ordenamiento, ETag, validación de límite).

Esta es además la **primera implementación del estándar de polling con ETag** definido en CLAUDE.md regla #5. Lo que se construya acá debe quedar reutilizable para futuras pantallas con refresco.

## 2. Objetivos

- El extractor entra a `/analitica/extraccion` y ve la cola priorizada de pacientes esperando + sus extracciones en curso (si las hay).
- Puede tomar un paciente, registrar el box y confirmar — la atención queda asignada y pasa a `IN_EXTRACTION`.
- Puede finalizar o cancelar su extracción en curso.
- La pantalla se actualiza sola cada 5s sin recargar (ETag/304).
- Multi-tenant y permisos: solo `ROLE_EXTRACTOR` o `ROLE_ADMINISTRADOR` ven la ruta, y todo está filtrado por tenant del JWT.

## 3. Decisiones cerradas

| Punto | Decisión |
|---|---|
| Ruta | `/analitica/extraccion` (única página, sin tabs) |
| Layout | Stats strip arriba + sección "Mis extracciones en curso" + sección "Cola de extracción" |
| Acción "Tomar" | Drawer lateral derecho (440px), NO modal |
| Box del extractor | localStorage del navegador (no perfil de usuario) — el drawer lo autocompleta y permite editar |
| Filtros en cola | Solo buscador por nombre/DNI |
| Orden de cola | `isUrgent DESC, createdAt ASC` — urgentes primero |
| Límite por extractor | **Máximo 1 extracción simultánea** — validado en backend, reflejado en UI |
| extractorId | Del JWT en backend (NO del body) |
| Stats strip | Sí en MVP: En cola / Mis extracciones / Espera promedio / Hoy finalizadas por mí |
| Refresco | Polling cada 5s con ETag/304. Pausa con `visibilityState=hidden` o drawer abierto |
| Sin drag & drop | Toma manual explícita |

## 4. Scope

### IN
- Página `/analitica/extraccion` en feature `analitica`.
- Drawer "Tomar paciente" con autocomplete de box (localStorage).
- Confirmaciones para cancelar/finalizar.
- Helper genérico `core/refresh/createPollingEffect` reutilizable.
- Ajustes backend: filtrar `/in-extraction` por extractor del JWT, ordenar `/awaiting-extraction`, ETag en ambos GET, validar límite de 1 en `AssignExtractorUseCase`, ignorar `extractorId` del request body (tomarlo del JWT).
- Endpoint nuevo backend: `GET /api/v1/attentions/extraction-stats` (espera promedio en cola + finalizadas hoy por el extractor actual).

### OUT (futuras PRs)
- SSE / WebSockets / cualquier alternativa a polling.
- Filtros chip por urgente / ayunas.
- Asignación automática (round-robin).
- Drag & drop.
- Historial de extracciones realizadas (más allá del contador "hoy finalizadas").
- Cambiar análisis desde el drawer.
- Persistir box del extractor en el perfil del usuario.

## 5. Cambios — Backend

### 5.1. `GET /api/v1/attentions/awaiting-extraction`

- **Ordenar:** `ORDER BY is_urgent DESC, created_at ASC`. Agregar el orden en el repositorio (`AttentionRepositoryPort#findByStateAndTenant` o el método específico que use el use case).
- **ETag:** soportar `If-None-Match`. Calcular ETag como:
  ```
  W/"<hex(sha256(tenantId + ":" + maxUpdatedAt.toEpochMilli() + ":" + count))>"
  ```
  Cachearlo en Caffeine bajo clave `awaiting:${tenantId}`. Invalidar el cache al ejecutar cualquier mutación de atención del tenant.
- **Respuesta:** sin cambios estructurales en el body. Header `ETag` siempre presente; `304` cuando coincide `If-None-Match`.

### 5.2. `GET /api/v1/attentions/in-extraction`

- **Cambio funcional:** filtrar por `extractor_id = <usuario actual del JWT>` por defecto.
  - Cuando lo invoque un `ROLE_ADMINISTRADOR`, opcionalmente aceptar `?all=true` para ver todas (no requerido en MVP del frontend).
- **Ordenar:** `ORDER BY updated_at ASC` (las más antiguas en curso primero).
- **ETag:** mismo patrón que `awaiting-extraction`, clave `in-extraction:${tenantId}:${userId}`.

### 5.3. `PATCH /api/v1/attentions/{id}/assign/extractor`

- **Seguridad:** ignorar `request.extractorId()` — tomar el ID del usuario autenticado del JWT (`SecurityContextHolder`). El campo del DTO queda deprecado (mantener para no romper, pero el use case lo ignora). Documentar en el DTO con `@Deprecated`.
- **Validación nueva:** antes de asignar, contar atenciones en estado `IN_EXTRACTION` del extractor en el tenant. Si `count >= 1`, lanzar `ExtractorAtCapacityException extends DomainException` con mensaje en español:
  > "Ya tenés una extracción en curso. Finalizala o cancelala antes de tomar otra."
- **Invalidar caches ETag:** `awaiting:${tenantId}` y `in-extraction:${tenantId}:${userId}`.
- **Body request:** seguir requiriendo `attentionBox` (Long, obligatorio, >=1).

### 5.4. `PATCH /api/v1/attentions/{id}/cancel-extraction`, `/end-extraction`

- Sin cambios funcionales.
- Invalidar caches ETag al mutar.

### 5.5. `GET /api/v1/attentions/extraction-stats` (nuevo)

- **Respuesta:**
  ```json
  {
    "queueSize": 12,
    "averageWaitMinutes": 14,
    "finishedTodayByMe": 28
  }
  ```
- `queueSize`: count de atenciones en `AWAITING_EXTRACTION` del tenant.
- `averageWaitMinutes`: `AVG(now - created_at)` en minutos sobre atenciones `AWAITING_EXTRACTION` del tenant. Si no hay atenciones, `null`.
- `finishedTodayByMe`: count de atenciones del tenant que pasaron a `EXTRACTED` (o estado posterior) hoy y donde `extractor_id` = usuario actual. "Hoy" = zona horaria del tenant (default America/Argentina/Buenos_Aires).
- **ETag:** mismo patrón. Clave `extraction-stats:${tenantId}:${userId}`.
- **Acceso:** mismo `@PreAuthorize` que el resto del controller.

### 5.6. Mensajes de error (regla #4)

Todos los errores nuevos deben respetar la regla: español, sin FQCN, sin enum raws. Casos:
- Límite alcanzado: ver 5.3.
- Atención inexistente o de otro tenant: mensaje genérico "No encontramos la atención solicitada."
- Transición de estado inválida: mensaje genérico "La atención no está disponible para esta operación."

### 5.7. Tests backend

- Reducer / use case: `AssignExtractorUseCase` con extractor que ya tiene una en curso → lanza `ExtractorAtCapacityException`.
- Controller: `/in-extraction` filtra correctamente por usuario JWT (test con dos usuarios).
- Controller: `/assign/extractor` ignora `extractorId` del body.
- ETag: dos calls consecutivos con `If-None-Match` → segunda devuelve 304. Tras mutar, devuelve 200 con ETag distinto.
- Test de sanitización: el handler de `ExtractorAtCapacityException` devuelve el mensaje en español sin FQCN.

## 6. Cambios — Frontend

### 6.1. Helper genérico — `core/refresh/`

**Primera implementación del estándar de polling+ETag**. Debe quedar reutilizable.

Archivos:
- `core/refresh/etag-http-interceptor.ts` — interceptor HTTP que para requests marcadas con `context.set(POLLING_REQUEST, true)`:
  - Agrega `If-None-Match` si hay ETag cacheado para esa URL+query.
  - Captura el header `ETag` de respuestas 200 y lo guarda.
  - Trata `304` como un caso especial: completa el observable con un sentinel `{ notModified: true }` (no rompe el flujo).
- `core/refresh/polling.service.ts` — servicio que expone:
  ```ts
  startPolling(opts: {
    key: string;                          // identificador único para dedup
    intervalMs?: number;                  // default 5000
    pauseOnHidden?: boolean;              // default true
    poll: () => Observable<unknown>;      // qué disparar en cada tick
  }): { stop: () => void; pokeNow: () => void };
  ```
  Internamente:
  - Combina `interval(ms)` con `fromEvent(document, 'visibilitychange')`.
  - Pausa cuando `document.hidden === true`. Reanuda + dispara `pokeNow()` al volver visible.
  - Usa `switchMap` para que no se encolen requests si tarda más que el intervalo.
- `core/refresh/refresh-status.signal.ts` — signal `{ lastSuccessAt: Date | null; paused: boolean; reason?: 'hidden' | 'manual' }` para que las pantallas muestren el indicador.

Tests unitarios obligatorios para los 3.

### 6.2. Feature `analitica` — modelos

`src/app/features/analitica/models/extraction.model.ts`:
```ts
export interface AwaitingExtractionItem {
  id: number;
  patientId: number;
  patientFullName: string;
  patientDni: string;
  patientBirthDate: string | null;
  patientGender: Gender | null;
  attentionNumber: string;
  isUrgent: boolean;
  analysisCount: number;
  insurancePlanLabel: string | null;
  createdAt: string;       // ISO
  waitMinutes: number;     // computado server-side o cliente
}

export interface InExtractionItem extends AwaitingExtractionItem {
  attentionBox: number;
  extractionStartedAt: string;  // updated_at del passage a IN_EXTRACTION
  extractorId: number;
}

export interface ExtractionStats {
  queueSize: number;
  averageWaitMinutes: number | null;
  finishedTodayByMe: number;
}
```

### 6.3. NgRx — feature `extraction`

Nuevo slice en `features/analitica/store/extraction/`:

**State:**
```ts
{
  awaiting: AwaitingExtractionItem[];
  mine: InExtractionItem[];
  stats: ExtractionStats | null;
  search: string;
  pending: {
    awaiting: boolean;
    mine: boolean;
    stats: boolean;
    mutation: boolean;     // assign/cancel/end
  };
  error: string | null;
  lastRefreshAt: number | null;
}
```

**Actions:**
- `loadAwaiting / Success / Failure / NotModified`
- `loadMine / Success / Failure / NotModified`
- `loadStats / Success / Failure / NotModified`
- `setSearch(q)`
- `assignExtractor({ id, box }) / Success / Failure`
- `cancelExtraction({ id }) / Success / Failure`
- `endExtraction({ id }) / Success / Failure`
- `refreshAll()` — dispatch helper que dispara los 3 loads

**Selectors:**
- `selectAwaiting` (ordenado por urgent + tiempo, filtrado por `search`)
- `selectMine`
- `selectStats`
- `selectCanTakeMore` — `mine.length === 0` (regla MAX 1)
- `selectMutating`
- `selectRefreshStatus`

**Effects:**
- Tres effects que mapean cada `load*` action contra `ExtractorAttentionService` y manejan el sentinel `notModified` → dispatch `*NotModified`.
- Mutation effects: en `*Success` disparan `refreshAll()` (poke).
- `*Failure`: muestran toast con `error-messages` helper (regla #4).

### 6.4. Service HTTP

`features/analitica/services/extractor-attention.service.ts`:
- 5 métodos, uno por endpoint.
- Todos los GET pasan `HttpContext` marcando `POLLING_REQUEST = true` para que el interceptor maneje ETag.
- El backend ya filtra `in-extraction` por extractor del JWT → el frontend no pasa parámetro.

### 6.5. Pantalla — `pages/extraction-queue/`

`extraction-queue.page.ts`:
- Standalone, `ChangeDetectionStrategy.OnPush`.
- Imports: `TableModule`, `ButtonModule`, `InputTextModule`, `TagModule`, `ConfirmDialogModule`, `DrawerModule` (PrimeNG 21), `EmptyStateComponent`, pipes (`DniPipe`, `AgePipe`).
- Selecciona signals del store.
- En `ngOnInit`:
  - Dispatch inicial `refreshAll()`.
  - `polling.startPolling({ key: 'extraction-queue', poll: () => of(store.dispatch(refreshAll())) })`.
- En `ngOnDestroy`: `polling.stop()`.
- Layout exactamente como el mockup.

`components/take-patient-drawer/take-patient-drawer.component.ts`:
- Recibe `[(visible)]`, `[patient]: AwaitingExtractionItem | null`.
- Estado interno: `box` signal inicializado desde `localStorage['extractor.box']` o vacío.
- Botón "Confirmar y tomar" → emit `(confirm)({ id, box })`. La page hace el dispatch.
- Al confirmar exitoso: guarda `box` en localStorage y cierra el drawer.
- Si `canTakeMore() === false`: el drawer no se abre y se muestra toast: "Ya tenés una extracción en curso."

### 6.6. Indicador de refresco

Componente compartido `shared/ui/components/refresh-indicator/refresh-indicator.component.ts`:
- Recibe `[lastRefreshAt]: Date | null`, `[paused]: boolean`, `[intervalMs]: number`.
- Renderiza el pill del mockup con animación pulse.
- Reusable para futuras pantallas.

### 6.7. Routing

`analitica.routes.ts`: agregar
```ts
{
  path: 'extraccion',
  loadComponent: () => import('./pages/extraction-queue/extraction-queue.page').then(m => m.ExtractionQueuePage),
  canMatch: [hasRoleGuard('ROLE_EXTRACTOR', 'ROLE_ADMINISTRADOR')],
}
```

### 6.8. Manejo de "MAX 1"

- `selectCanTakeMore` controla:
  - Botón "Tomar" en cada fila de la cola: `disabled` + tooltip "Ya tenés una extracción en curso" cuando false.
- Backend igualmente valida — el frontend no es la única defensa.

### 6.9. Tests frontend

- `extraction.reducer.spec.ts` — actions de cada load incl. NotModified (no reemplaza state).
- `extraction.effects.spec.ts` — el sentinel `notModified` dispara la action correcta; mutation success dispara `refreshAll`.
- `extraction.selectors.spec.ts` — ordenamiento por urgent + búsqueda + `canTakeMore`.
- `extractor-attention.service.spec.ts` — endpoints + HttpContext con `POLLING_REQUEST`.
- `polling.service.spec.ts` — pausa con visibility hidden, poke on visible, dedup con switchMap.
- `etag-http-interceptor.spec.ts` — manda `If-None-Match`, parsea 304 al sentinel.
- `take-patient-drawer.component.spec.ts` — autocompleta box de localStorage, persiste al confirmar.
- `extraction-queue.page.spec.ts` — smoke test con mock store.

## 7. Modelo de datos / migraciones

**Sin migraciones nuevas.** Todos los campos requeridos ya existen en `attention`: `is_urgent`, `attention_box`, `extractor_id`, `created_at`, `updated_at`, `attention_state`.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| ETag mal invalidado → frontend ve datos viejos | Invalidar cache desde TODOS los use cases que muten atenciones (no solo los 3 nuevos — también end attention, cancel attention, etc.). Test que mute y assert que el siguiente GET devuelve 200 (no 304). |
| Reloj del cliente desincronizado afecta "Actualizado hace Xs" | Usar `lastRefreshAt` del cliente (cuando recibió la respuesta), no timestamps server-side. |
| Dos extractores toman al mismo paciente simultáneamente | El backend usa `@Version` (optimistic lock) en `Attention`. La segunda escritura falla con `OptimisticLockingFailureException`. Mapear a mensaje español: "Otro extractor tomó este paciente. La cola se actualizó." Tras error, hacer poke inmediato. |
| Helper de polling acoplado a esta pantalla | Vive en `core/refresh/`, NO en `features/analitica/`. Spec lo requiere genérico. |
| Box en localStorage se pierde al limpiar caché | Aceptado — el drawer lo pide vacío y el extractor lo escribe. Documentado en el mockup. |

## 9. Plan de implementación (resumen)

Se sugiere **dividir en 2 planes** (1 backend + 1 frontend) creados como Jira separados pero linkeados en este mismo spec:

1. **Backend** (`feat/cola-extraccion` en repo Backend) — sección 5. Estimado ~3h.
2. **Frontend** (`feat/cola-extraccion` en repo FRONTEND-LABORATORIO) — sección 6. Estimado ~5h.

Orden: backend primero (el frontend lo necesita para los ETags y para el filtrado de in-extraction).

## 10. Criterios de aceptación

- [ ] Extractor logueado entra a `/analitica/extraccion` y ve la cola ordenada (urgentes primero).
- [ ] Stats strip muestra los 4 valores correctos.
- [ ] "Mis extracciones" muestra solo las del extractor logueado.
- [ ] Polling refresca cada 5s; pausa con pestaña oculta y drawer abierto.
- [ ] Indicador "Actualizado hace Xs" se actualiza incluso con respuestas 304.
- [ ] Tomar paciente abre drawer, autocompleta box, confirma → desaparece de cola, aparece en "mis".
- [ ] Con 1 extracción en curso, los botones "Tomar" quedan deshabilitados.
- [ ] Backend rechaza tomar 2ª simultánea con mensaje en español.
- [ ] Finalizar / cancelar funcionan, con confirm dialog en español.
- [ ] Tests al verde en ambos repos.
- [ ] No hay mensajes de error con FQCN o stack traces visibles para el usuario (regla #4).
