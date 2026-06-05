# Plan — Cola de Extracción (Frontend)

> **Jira:** [KAN-44](https://exequielsantoro.atlassian.net/browse/KAN-44) (depende de [KAN-43](https://exequielsantoro.atlassian.net/browse/KAN-43))
> **Spec:** [2026-05-25-cola-extraccion-spec.md](../specs/2026-05-25-cola-extraccion-spec.md)
> **Mockup:** [2026-05-25-cola-extraccion-mockup.html](../specs/2026-05-25-cola-extraccion-mockup.html)
> **Plan backend par:** [`Backend/docs/plans/2026-05-25-cola-extraccion-backend.md`](../../../../Backend/docs/plans/2026-05-25-cola-extraccion-backend.md)
> **Rama:** `feat/cola-extraccion`
> **Estimación:** ~5h
> **Depende de:** plan backend mergeado en `development` (necesita endpoints con ETag + filtro por extractor + stats).

## Objetivo

Implementar la pantalla `/analitica/extraccion` para el rol EXTRACTOR + el helper genérico `core/refresh/` que será el estándar del proyecto para polling con ETag (regla #5 CLAUDE.md).

## Pasos

### 1. Helper genérico `core/refresh/` (primera implementación del estándar)

Es importante que quede **agnóstico** de la feature. Tres archivos + tests.

1.1. **`core/refresh/polling-context.ts`**
- Exporta `POLLING_REQUEST: HttpContextToken<boolean>` (default false).
- Exporta helper `withPolling(): HttpContext` para usar en services.

1.2. **`core/refresh/etag-cache.service.ts`**
- `@Injectable({ providedIn: 'root' })`.
- API: `get(key: string): string | null`, `set(key: string, etag: string): void`, `clear(key?: string): void`.
- Key = `method + ' ' + url + '?' + sortedParams`.
- Implementación: `Map<string,string>` en memoria. No persistencia.

1.3. **`core/refresh/etag.interceptor.ts`**
- `HttpInterceptorFn` que para requests con `req.context.get(POLLING_REQUEST) === true`:
  - Antes: si hay etag cacheado para esa key, agregar `If-None-Match`.
  - Después (tap on response): si status 200 y hay `ETag` header, guardarlo.
  - Si status 304: el handler de Angular ya tira un error de parsing porque el body está vacío. Capturar con `catchError`: si `err.status === 304` → emit `{ notModified: true } as const` y completar. Tipo de salida `T | NotModified`.
- Tests con `HttpClientTestingModule`:
  - Primer call: no manda `If-None-Match`, guarda ETag de la respuesta.
  - Segundo call: manda `If-None-Match` con el ETag guardado.
  - Respuesta 304: emite `{ notModified: true }`.

1.4. **`core/refresh/polling.service.ts`**
- `@Injectable({ providedIn: 'root' })`.
- `startPolling(opts)` retorna `{ stop, pokeNow }` como en el spec.
- Implementación:
  - `interval(intervalMs)` + `startWith(0)`.
  - `switchMap(() => opts.poll())` para que tarde menos no encole.
  - Subscribe interno; el caller solo recibe handles.
  - Manejo visibility: `fromEvent(document, 'visibilitychange')` que pausa/reanuda. Pausa = `takeWhile(() => !document.hidden)` no funciona — mejor: stream interno con `BehaviorSubject<boolean>(true)` activo/pausado y usar `switchMap` desde ahí.
  - `pokeNow()` emite un valor extra al stream interno.
- Test: pausa con hidden, reanuda con visible + dispara poll inmediato.

1.5. **`core/refresh/refresh-status.signal.ts`**
- Factory `createRefreshStatusSignal()` que retorna `{ status: Signal<{ lastSuccessAt: Date | null; paused: boolean; reason?: 'hidden' | 'manual' }>, markSuccess(), markPaused(reason), markActive() }`.
- Usado por el componente indicador y por las pantallas.

1.6. Registrar `etagInterceptor` en `app.config.ts` → `provideHttpClient(withInterceptors([..., etagInterceptor]))`.

### 2. Componente compartido — indicador de refresco

**`shared/ui/components/refresh-indicator/refresh-indicator.component.ts`**
- Standalone, OnPush.
- Inputs: `lastRefreshAt: Date | null`, `paused: boolean`, `intervalMs = 5000`.
- Renderiza el pill del mockup (dot animado + "Actualizado hace Xs").
- Cuenta los segundos con un `interval(1000)` interno + signal.
- Test smoke.

### 3. Feature `analitica` — modelos + store

3.1. **`features/analitica/models/extraction.model.ts`** (interfaces del spec).

3.2. Crear slice NgRx en `features/analitica/store/extraction/`:
- `extraction.actions.ts` — todas las acciones del spec (load*/*Success/*Failure/*NotModified, setSearch, mutation actions, refreshAll).
- `extraction.reducer.ts` — manejar todas. NotModified solo actualiza `lastRefreshAt` y limpia pending. Success actualiza también la data + ETag virtual.
- `extraction.selectors.ts` — incluyendo `selectAwaiting` ordenado por urgent+wait y filtrado por search, `selectCanTakeMore` (mine.length === 0), `selectRefreshStatus`.
- `extraction.state.ts` — interface del state.
- Registrar en `analitica.config.ts` o donde se registren los features actuales (`provideState` + `provideEffects`).

3.3. Tests para reducer y selectors (specs separados).

### 4. Service HTTP

**`features/analitica/services/extractor-attention.service.ts`**
- 5 métodos: `getAwaiting()`, `getMine()`, `getStats()`, `assignExtractor(id, box)`, `cancelExtraction(id)`, `endExtraction(id)`.
- Los 3 GET marcan `context: withPolling()`.
- Tipo de retorno de los GET: `Observable<T | NotModified>`.
- `assignExtractor` NO manda `extractorId` (el backend lo toma del JWT) — solo manda `attentionBox`.
- Test del service mockeando HttpClient.

### 5. Effects

**`features/analitica/store/extraction/extraction.effects.ts`**
- Un effect por cada load: dispara el método del service, mapea a `*Success` o `*NotModified` o `*Failure`. Helper:
  ```ts
  private toAction<T>(success: (p: T) => Action, notMod: () => Action, fail: (e: any) => Action) {
    return (src: Observable<T | NotModified>) => src.pipe(
      map(r => 'notModified' in r ? notMod() : success(r as T)),
      catchError(e => of(fail(e))),
    );
  }
  ```
- `refreshAll$` → dispatch los 3 loads.
- Mutation effects (assign/cancel/end) → en success dispatch `refreshAll` + toast OK; en failure → toast con `mapHttpErrorToMessage` (regla #4).
- Test de effects con `provideMockActions`.

### 6. Pantalla

**`features/analitica/pages/extraction-queue/extraction-queue.page.ts`**
- Standalone, OnPush, `providers: [ConfirmationService]`.
- Imports: PrimeNG `TableModule`, `ButtonModule`, `TagModule`, `InputTextModule`, `DrawerModule`, `ConfirmDialogModule`, pipes shared, `RefreshIndicatorComponent`, `TakePatientDrawerComponent`, `EmptyStateComponent`.
- Inject: `Store`, `PollingService`, `ConfirmationService`, `DestroyRef`.
- Signals desde el store: `awaiting`, `mine`, `stats`, `pending`, `canTakeMore`, `refreshStatus`.
- En `ngOnInit`:
  ```ts
  this.store.dispatch(refreshAll());
  this.handle = this.polling.startPolling({
    key: 'extraction-queue',
    poll: () => { this.store.dispatch(refreshAll()); return of(void 0); },
  });
  ```
- `ngOnDestroy`: `this.handle.stop()`.
- Template fiel al mockup (escenas A y C).
- Acciones:
  - `onTake(item)` → setea `selectedPatient`, abre drawer. Si `!canTakeMore()` → toast warn "Ya tenés una extracción en curso." y no abre.
  - `onCancel(item)` → `confirmationService.confirm` → dispatch `cancelExtraction`.
  - `onEnd(item)` → confirmación + dispatch `endExtraction`.
  - `onSearch(q)` → dispatch `setSearch(q)`.
- Cuando el drawer abre, pausar el polling: `handle.pauseUntil(drawerClosed$)` — o más simple: el drawer emite `(visibleChange)` y al cerrar disparar `handle.pokeNow()`. Implementar como signal local `drawerOpen()` y un `effect()` que pausa/reanuda.

### 7. Drawer "Tomar paciente"

**`features/analitica/components/take-patient-drawer/take-patient-drawer.component.ts`**
- Standalone, OnPush.
- Inputs: `[(visible)]`, `[patient]: AwaitingExtractionItem | null`, `[saving]: boolean`.
- Output: `(confirm) EventEmitter<{ id: number; box: number }>`.
- Estado interno: signal `box` inicializado desde `localStorage.getItem('extractor.box')` (parseInt o null).
- Form: input numérico `Box de atención *`. Validación: requerido, entero >= 1.
- Botón "Confirmar y tomar":
  - Disabled si form inválido o `saving`.
  - Al click: `localStorage.setItem('extractor.box', String(box()))` + emit `confirm`.
- Layout = mockup escena B.
- Test: autocomplete desde localStorage, persiste al confirmar.

### 8. Routing

**`features/analitica/analitica.routes.ts`** — agregar:
```ts
{
  path: 'extraccion',
  loadComponent: () => import('./pages/extraction-queue/extraction-queue.page').then(m => m.ExtractionQueuePage),
  canMatch: [hasRoleGuard(['ROLE_EXTRACTOR', 'ROLE_ADMINISTRADOR'])],
  title: 'Cola de extracción',
}
```

Si `hasRoleGuard` no existe (revisar `core/auth/` o `core/guards/`), crearlo:
```ts
export function hasRoleGuard(roles: string[]): CanMatchFn {
  return () => {
    const token = inject(TokenService);
    return roles.some(r => token.hasRole(r)) || router.createUrlTree(['/']);
  };
}
```

### 9. Navegación

Agregar entry en el menú lateral si existe (revisar `layout/sidebar/`) — link "Cola de extracción" visible solo para roles `ROLE_EXTRACTOR` / `ROLE_ADMINISTRADOR`. Si no hay menú lateral aún (improbable a esta altura), saltear este paso y dejar la ruta accesible por URL.

### 10. Manejo de OptimisticLockingFailure

Cuando assignExtractor falla con 409 (otro extractor lo tomó):
- Toast: "Otro extractor tomó este paciente. La cola se actualizó."
- Cerrar drawer.
- Disparar `refreshAll()`.

### 11. Tests

Obligatorios para:
- `etag-http-interceptor.spec.ts` — 3 escenarios del paso 1.3.
- `polling.service.spec.ts` — visibility + pokeNow + dedup.
- `extraction.reducer.spec.ts` — todas las actions incl. NotModified.
- `extraction.selectors.spec.ts` — ordenamiento (urgent primero), filtro search, canTakeMore.
- `extraction.effects.spec.ts` — sentinel NotModified, mutation dispara refreshAll.
- `extractor-attention.service.spec.ts` — endpoints + headers.
- `take-patient-drawer.component.spec.ts` — localStorage.
- `extraction-queue.page.spec.ts` — smoke test con mock store.
- `refresh-indicator.component.spec.ts` — smoke.

Target: 95%+ coverage en `core/refresh/` y `store/extraction/`.

### 12. Build + verificación manual

- `npm run test` verde.
- `npm run build` verde.
- `npm start` y probar manualmente:
  - Login como EXTRACTOR.
  - Ir a `/analitica/extraccion`.
  - Verificar polling cada 5s (DevTools Network: hay request, cambia 200 → 304 → 200 al mutar).
  - Cambiar pestaña y volver — ver "Pausado" y un poll inmediato al volver.
  - Tomar paciente, confirmar — pasa a "mis".
  - Intentar tomar otro — botones disabled.
  - Finalizar — vuelve a aparecer "Tomar" en cola.
- Probar con dos navegadores logueados como dos extractores distintos del mismo tenant.

### 13. Commit + PR

- Commit convencional: `feat(analitica): cola de extracción + helper polling/ETag`.
- PR a `development` con:
  - Link al spec.
  - Link al plan.
  - Link al ticket Jira.
  - Test plan (manual + automated).

## Pre-condiciones

- Backend mergeado en `development` (sección 5 del spec). Si no está, mockear los endpoints con MSW para desarrollo y dejar nota en PR description.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Helper de polling termina acoplado a la feature | Pasa el code review con grep — nada en `core/refresh/` puede importar de `features/`. |
| Drawer abierto + polling sigue → paciente desaparece mid-confirm | Implementar pausa del polling cuando drawer abierto (paso 6). |
| `EventSource`/SSE termina siendo más simple — tentación de cambiar de estrategia | NO. Regla #5. Si surge la duda, abrir issue, no cambiar el plan. |
| 304 manejado como error de parsing → flujos fallan en silencio | Test específico en el interceptor (paso 1.3). |
