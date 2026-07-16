# Notificaciones in-app — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Spec:** `docs/superpowers/specs/2026-07-03-notificaciones-in-app-design.md`
> **Depende de:** `docs/superpowers/plans/2026-07-03-notificaciones-backend.md` (endpoints ya disponibles).
> **Jira:** [KAN-176](https://exequielsantoro.atlassian.net/browse/KAN-176)

**Goal:** Campana de notificaciones en el navbar (badge + panel con leídas/no leídas, click → navega al registro + marca leída) y tab "Notificaciones" en Empresa donde el admin activa eventos y elige destinatarios (usuarios/roles), bloqueando los que no tienen acceso a la pantalla del evento.

**Architecture:** Dos features NgRx clásicas. `notifications` (campana): store global registrado en `app.config.ts`, servicio HTTP con `withPolling()`, `PollingService` para el loop, efectos que distinguen 304 con `isNotModified`. `empresa/notificaciones-config` (tab admin): store scopeado a la ruta, CRUD contra los endpoints de config.

**Tech Stack:** Angular 21 standalone + signals, NgRx clásico, PrimeNG (Popover), Tailwind, Vitest + `ng test`. Infra de refresco en `@core/refresh` (`PollingService`, `withPolling`, `isNotModified`, `etagInterceptor`).

## Global Constraints

- **Errores/UI (regla #4):** todo texto en español, user-friendly, sin leak. Íconos **PrimeIcons** (nunca emojis).
- **Refresco (regla #5):** usar `PollingService` + `withPolling()` + `isNotModified()`; intervalo 5s; pausa en pestaña oculta (default del service). No `setInterval` propio.
- **NgRx clásico** (skill `ngrx-backend-request`): `createAction` + `createReducer`, mutaciones pesimistas, `selectSignal` en componentes, sin `@ngrx/entity`, sin patrón `loaded` por default. El **servicio es el único que toca HTTP**.
- **Estructura** (skill `angular-conventions`): `features/<name>/{store,pages,components,services,models}`; `OnPush` por default; signals para estado local.
- **UI** (skill `laboratory-ui`): white-label, tokens del design system (`var(--brand-*)`, `--space-*`), componentes PrimeNG.
- **Registro de store:** slice global → `app.config.ts` (`provideState` + `provideEffects`); slice de pantalla → `providers` de la ruta lazy.

## File Structure

```
core/ (o features/notifications/)
  features/notifications/
    models/notification.model.ts
    services/notification-api.service.ts        # ÚNICO acceso HTTP (withPolling)
    store/notifications.{actions,reducer,effects,selectors,state}.ts (+ *.spec.ts)
    components/notification-bell/notification-bell.component.ts   # campana + popover
layout/topbar/
  topbar.component.ts                           # MODIFICAR: insertar <notif-bell/>
features/empresa/
  empresa-dashboard/empresa-dashboard.component.ts   # MODIFICAR: tab "Notificaciones"
  empresa.routes.ts                                  # MODIFICAR: ruta 'notificaciones'
  pages/notificaciones/
    notificaciones-config.page.ts
    components/event-config-row/event-config-row.component.ts
  store/notificaciones-config/{actions,reducer,effects,selectors,state}.ts (+ *.spec.ts)
  services/notificaciones-config-api.service.ts
```

---

### Task 1: Modelos + servicio HTTP de la campana

**Files:**
- Create: `features/notifications/models/notification.model.ts`
- Create: `features/notifications/services/notification-api.service.ts`
- Test: `features/notifications/services/notification-api.service.spec.ts`

**Interfaces:**
- Consumes: `withPolling`, `NotModified` de `@core/refresh`; `HttpClient`.
- Produces:
  - `interface NotificationItem { id:number; eventType:string; title:string; message:string; targetRoute:string|null; read:boolean; createdAt:string }`
  - `interface NotificationInbox { items: NotificationItem[]; unreadCount: number }`
  - `NotificationApiService.getInbox(): Observable<NotificationInbox | NotModified>`
  - `markRead(id:number): Observable<void>`, `markAllRead(): Observable<void>`

- [ ] **Step 1: Modelos** (interfaces arriba) en `notification.model.ts`.

- [ ] **Step 2: Test del servicio** (HttpTestingController):

```ts
it('getInbox usa withPolling y pega a /api/v1/notifications', () => {
  service.getInbox().subscribe();
  const req = httpMock.expectOne(r => r.url === '/api/v1/notifications');
  expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
  req.flush({ items: [], unreadCount: 0 });
});
it('markRead pega POST /{id}/read', () => {
  service.markRead(5).subscribe();
  httpMock.expectOne({ method: 'POST', url: '/api/v1/notifications/5/read' }).flush(null);
});
```

- [ ] **Step 3: Run → FAIL.** `npx vitest run notification-api.service`

- [ ] **Step 4: Implementar el servicio.**

```ts
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/notifications';

  getInbox(): Observable<NotificationInbox | NotModified> {
    return this.http.get<NotificationInbox | NotModified>(this.base, { context: withPolling() });
  }
  markRead(id: number): Observable<void> { return this.http.post<void>(`${this.base}/${id}/read`, {}); }
  markAllRead(): Observable<void> { return this.http.post<void>(`${this.base}/read-all`, {}); }
}
```

- [ ] **Step 5: Run → PASS.**

- [ ] **Step 6: Commit.** `git commit -m "feat(notifications): modelos y servicio HTTP de la campana"`

---

### Task 2: Store NgRx de la campana

**Files:**
- Create: `features/notifications/store/notifications.{state,actions,reducer,selectors,effects}.ts`
- Test: `.../notifications.{reducer,effects,selectors}.spec.ts`

**Interfaces:**
- Consumes: `NotificationApiService`, `isNotModified`.
- Produces: `NOTIFICATIONS_FEATURE_KEY`, `notificationsReducer`, `NotificationsEffects`, selectores `selectNotificationItems`, `selectUnreadCount`.

State:
```ts
export interface NotificationsState { items: NotificationItem[]; unreadCount: number; error: HttpErrorResponse | null; }
export const initialState: NotificationsState = { items: [], unreadCount: 0, error: null };
```

Actions:
```ts
export const loadInbox = createAction('[Notifications] Load Inbox');
export const loadInboxSuccess = createAction('[Notifications API] Load Success', props<{ inbox: NotificationInbox }>());
export const loadInboxNotModified = createAction('[Notifications API] Load Not Modified');
export const loadInboxFailure = createAction('[Notifications API] Load Failure', props<{ error: HttpErrorResponse }>());
export const markRead = createAction('[Notifications] Mark Read', props<{ id: number }>());
export const markAllRead = createAction('[Notifications] Mark All Read');
export const mutateSuccess = createAction('[Notifications API] Mutate Success'); // re-dispara loadInbox
```

- [ ] **Step 1: Test del reducer.**

```ts
it('loadInboxSuccess setea items y unreadCount', () => {
  const s = notificationsReducer(initialState, loadInboxSuccess({ inbox: { items:[{id:1}] as any, unreadCount:1 } }));
  expect(s.items.length).toBe(1); expect(s.unreadCount).toBe(1);
});
it('loadInboxNotModified no cambia el estado', () => {
  const prev = { ...initialState, unreadCount: 3 };
  expect(notificationsReducer(prev, loadInboxNotModified())).toEqual(prev);
});
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run notifications.reducer`

- [ ] **Step 3: Implementar reducer + selectors.**

```ts
export const notificationsReducer = createReducer(initialState,
  on(loadInboxSuccess, (s, { inbox }) => ({ ...s, items: inbox.items, unreadCount: inbox.unreadCount, error: null })),
  on(loadInboxNotModified, (s) => s),
  on(loadInboxFailure, (s, { error }) => ({ ...s, error })),
);
export const selectNotificationsState = createFeatureSelector<NotificationsState>(NOTIFICATIONS_FEATURE_KEY);
export const selectNotificationItems = createSelector(selectNotificationsState, s => s.items);
export const selectUnreadCount = createSelector(selectNotificationsState, s => s.unreadCount);
```

- [ ] **Step 4: Test de effects** (marble o TestScheduler; seguir patrón de `extraction.effects.spec.ts`):

```ts
it('loadInbox 304 -> loadInboxNotModified', () => {
  api.getInbox.mockReturnValue(of(NOT_MODIFIED));
  actions$ = of(loadInbox());
  effects.loadInbox$.subscribe(a => expect(a).toEqual(loadInboxNotModified()));
});
it('markRead success -> mutateSuccess (que re-dispara loadInbox)', () => { /* api.markRead -> of(void); espera mutateSuccess */ });
```

- [ ] **Step 5: Run → FAIL, luego implementar effects.**

```ts
@Injectable()
export class NotificationsEffects {
  private actions$ = inject(Actions);
  private api = inject(NotificationApiService);

  loadInbox$ = createEffect(() => this.actions$.pipe(
    ofType(loadInbox),
    switchMap(() => this.api.getInbox().pipe(
      map(res => isNotModified(res) ? loadInboxNotModified() : loadInboxSuccess({ inbox: res })),
      catchError((error: HttpErrorResponse) => of(loadInboxFailure({ error }))),
    )),
  ));
  markRead$ = createEffect(() => this.actions$.pipe(
    ofType(markRead),
    mergeMap(({ id }) => this.api.markRead(id).pipe(
      map(() => mutateSuccess()), catchError(() => of(mutateSuccess())))), // optimista: refresca igual
  ));
  markAllRead$ = createEffect(() => this.actions$.pipe(
    ofType(markAllRead),
    exhaustMap(() => this.api.markAllRead().pipe(map(() => mutateSuccess()), catchError(() => of(mutateSuccess())))),
  ));
  refreshAfterMutate$ = createEffect(() => this.actions$.pipe(ofType(mutateSuccess), map(() => loadInbox())));
}
```

- [ ] **Step 6: Run → PASS.**

- [ ] **Step 7: Registrar en `app.config.ts`** (slice global — la campana está siempre montada):

```ts
provideState(NOTIFICATIONS_FEATURE_KEY, notificationsReducer),
provideEffects(NotificationsEffects),
```

- [ ] **Step 8: Commit.** `git commit -m "feat(notifications): store NgRx con polling ETag/304"`

---

### Task 3: Componente campana + integración en topbar

**Files:**
- Create: `features/notifications/components/notification-bell/notification-bell.component.ts`
- Create: `.../notification-bell.component.spec.ts`
- Modify: `layout/topbar/topbar.component.ts` (reemplazar el botón campana hardcodeado + badge `::after{content:'3'}`)

**Interfaces:**
- Consumes: `selectUnreadCount`, `selectNotificationItems`, acciones `loadInbox/markRead/markAllRead`; `PollingService`; `Router`.
- Produces: `<notif-bell/>` (selector `notif-bell`).

- [ ] **Step 1: Spec de componente** (`ng test`, renderiza signal inputs — ver `project_vitest-signal-input-rendering`):

```ts
it('muestra el badge con unreadCount y lo oculta si es 0', () => { /* store mock unreadCount=2 -> badge "2"; 0 -> sin badge */ });
it('al click en un item con targetRoute navega y despacha markRead', () => {
  // click item {id:5, targetRoute:'/x'} -> router.navigate(['/x']) + store.dispatch(markRead({id:5}))
});
```

- [ ] **Step 2: Run → FAIL.** `npm run test -- notification-bell` (AOT / `ng test`)

- [ ] **Step 3: Implementar el componente.**

```ts
@Component({
  selector: 'notif-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Popover, DatePipe],
  template: `
    <button type="button" class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
            aria-label="Notificaciones" (click)="panel.toggle($event)">
      <i class="pi pi-bell"></i>
      @if (unreadCount() > 0) { <span class="notif-badge">{{ unreadCount() }}</span> }
    </button>
    <p-popover #panel styleClass="notif-popover">
      <div class="notif-panel">
        <header class="notif-panel__head">
          <span>Notificaciones</span>
          @if (unreadCount() > 0) { <button type="button" (click)="onMarkAll()">Marcar todas como leídas</button> }
        </header>
        @if (items().length === 0) {
          <p class="notif-panel__empty">No tenés notificaciones.</p>
        } @else {
          <ul class="notif-panel__list">
            @for (n of items(); track n.id) {
              <li class="notif-item" [class.notif-item--unread]="!n.read" (click)="onOpen(n, panel)">
                <strong>{{ n.title }}</strong>
                <span>{{ n.message }}</span>
                <small>{{ n.createdAt | date:'short' }}</small>
              </li>
            }
          </ul>
        }
      </div>
    </p-popover>
  `,
  styles: [`/* badge + panel con tokens del design system (var(--ds-danger), --space-*), sin emojis */`],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private polling = inject(PollingService);
  private handle?: PollingHandle;

  protected readonly unreadCount = this.store.selectSignal(selectUnreadCount);
  protected readonly items = this.store.selectSignal(selectNotificationItems);

  ngOnInit() {
    this.store.dispatch(loadInbox());
    this.handle = this.polling.startPolling({ key: 'notif-inbox', poll: () => { this.store.dispatch(loadInbox()); return EMPTY; } });
  }
  ngOnDestroy() { this.handle?.stop(); }

  onOpen(n: NotificationItem, panel: Popover) {
    if (!n.read) this.store.dispatch(markRead({ id: n.id }));
    if (n.targetRoute) this.router.navigateByUrl(n.targetRoute);
    panel.hide();
  }
  onMarkAll() { this.store.dispatch(markAllRead()); }
}
```

> **Nota polling:** el loop solo re-despacha `loadInbox`; el effect + `etagInterceptor` resuelven 304 sin repintar. Alternativa: mover el poll al servicio con `switchMap` real — mantener el patrón del proyecto (ver `extraction` store, que usa `PollingService` + acción de refresh).

- [ ] **Step 4: Integrar en topbar.** En `topbar.component.ts`: importar `NotificationBellComponent`, reemplazar el `<button ...--notif>` hardcodeado por `<notif-bell />`, y eliminar la regla CSS `.ui-topbar__icon-btn--notif::after { content:'3'; ... }` (el badge ahora es dinámico). Quitar el TODO.

- [ ] **Step 5: Run tests → PASS.** `npm run test -- notification-bell topbar`

- [ ] **Step 6: Commit.** `git commit -m "feat(notifications): componente campana con badge dinámico + polling en topbar"`

---

### Task 4: Servicio + store de la tab de config

**Files:**
- Create: `features/empresa/services/notificaciones-config-api.service.ts`
- Create: `features/empresa/store/notificaciones-config/{state,actions,reducer,selectors,effects}.ts` (+ specs)
- Test: specs de servicio + reducer + effects

**Interfaces:**
- Produces:
  - Modelos: `EventConfig { eventType; title; enabled; hasTrigger; recipients: Recipient[] }`, `Recipient { type:'USER'|'ROLE'; ref:string }`, `EligibleRecipients { users:{id;nombre;tieneAcceso}[]; roles:{code;label}[] }`.
  - Service: `getConfigs(): Observable<EventConfig[]>`, `updateConfig(eventType, {enabled, recipients}): Observable<void>`, `getEligible(eventType): Observable<EligibleRecipients>`.
  - Store: `NOTIF_CONFIG_FEATURE_KEY`, `notifConfigReducer`, `NotifConfigEffects`, selectors `selectEventConfigs`, `selectEligible(eventType)`, `selectSaving`.

- [ ] **Step 1: Test del servicio** (HttpTestingController): `getConfigs` → GET `/api/v1/notification-configs`; `updateConfig('HOME_VISIT_ASSIGNED', ...)` → PUT `/api/v1/notification-configs/HOME_VISIT_ASSIGNED`.

- [ ] **Step 2: Run → FAIL.** `npx vitest run notificaciones-config-api.service`

- [ ] **Step 3: Implementar servicio** (sin `withPolling` — es config, no polleada).

```ts
@Injectable({ providedIn: 'root' })
export class NotificacionesConfigApiService {
  private http = inject(HttpClient);
  private base = '/api/v1/notification-configs';
  getConfigs() { return this.http.get<EventConfig[]>(this.base); }
  updateConfig(eventType: string, body: { enabled: boolean; recipients: Recipient[] }) {
    return this.http.put<void>(`${this.base}/${eventType}`, body);
  }
  getEligible(eventType: string) { return this.http.get<EligibleRecipients>(`${this.base}/${eventType}/eligible`); }
}
```

- [ ] **Step 4: Store** (mutación pesimista: `updateConfig` → on success re-`loadConfigs`). Tests de reducer: `loadConfigsSuccess` setea la lista; `updateConfigSuccess` limpia `saving`. Effects: `updateConfig$` usa `concatMap`, on success dispatch `loadConfigs`.

- [ ] **Step 5: Run tests → PASS.**

- [ ] **Step 6: Commit.** `git commit -m "feat(empresa): store y servicio de configuración de notificaciones"`

---

### Task 5: Página de config + fila por evento + ruta/tab

**Files:**
- Create: `features/empresa/pages/notificaciones/notificaciones-config.page.ts`
- Create: `features/empresa/pages/notificaciones/components/event-config-row/event-config-row.component.ts`
- Modify: `features/empresa/empresa-dashboard/empresa-dashboard.component.ts` (tab)
- Modify: `features/empresa/empresa.routes.ts` (ruta + `provideState`/`provideEffects`)
- Test: specs de página + fila

**Interfaces:**
- Consumes: store de config (`selectEventConfigs`, `selectEligible`, acciones `loadConfigs/updateConfig/loadEligible`).
- Produces: ruta `notificaciones` bajo empresa; componente `NotificacionesConfigPage`.

- [ ] **Step 1: Agregar la tab** en `empresa-dashboard.component.ts` (junto a las existentes):

```html
<a routerLink="notificaciones" routerLinkActive="is-active" role="tab">Notificaciones</a>
```

- [ ] **Step 2: Agregar la ruta + store scopeado** en `empresa.routes.ts`:

```ts
{ path: 'notificaciones',
  loadComponent: () => import('./pages/notificaciones/notificaciones-config.page').then(m => m.NotificacionesConfigPage),
  providers: [ provideState(NOTIF_CONFIG_FEATURE_KEY, notifConfigReducer), provideEffects(NotifConfigEffects) ] },
```

- [ ] **Step 3: Spec de la fila** (`ng test`):

```ts
it('toggle disabled cuando hasTrigger=false (evento inerte)', () => { /* CASH_BOX_CLOSED -> switch deshabilitado + nota "Próximamente" */ });
it('emite update al cambiar enabled o recipients', () => { /* (update) output con {enabled, recipients} */ });
it('marca con warning los usuarios sin acceso y no deja agregarlos', () => {
  // eligible.users con tieneAcceso=false -> opción deshabilitada + icono pi-exclamation-triangle + tooltip español
});
```

- [ ] **Step 4: Run → FAIL.**

- [ ] **Step 5: Implementar `EventConfigRowComponent`** (PrimeNG `ToggleSwitch` + `MultiSelect` para usuarios y para roles; `laboratory-ui`). Regla de bloqueo: en el multiselect de usuarios, `disabled` en las opciones con `tieneAcceso === false`, con `<i class="pi pi-exclamation-triangle">` + tooltip "Este usuario no tiene acceso a la pantalla de este evento". Evento inerte (`hasTrigger === false`) → toggle deshabilitado + badge "Próximamente". Emite `(update)` con `{ eventType, enabled, recipients }`.

- [ ] **Step 6: Implementar `NotificacionesConfigPage`**: `ngOnInit` → `loadConfigs()`; `@for` de `selectEventConfigs()` renderiza una `<emp-event-config-row>`; al `(update)` despacha `updateConfig(...)`. Carga `loadEligible(eventType)` on demand cuando se abre el picker. Estado de guardado con toast en español (sin leak).

- [ ] **Step 7: Run tests → PASS.** `npm run test -- notificaciones-config event-config-row`

- [ ] **Step 8: Commit.** `git commit -m "feat(empresa): tab Notificaciones con config de eventos y destinatarios"`

---

### Task 6: Verificación integral frontend

- [ ] **Step 1: Suite completa.** `npm run test` (Vitest, stores/servicios) + `ng test` (specs de componente). Esperado: verde. `npm ci` primero si es worktree nuevo (`project_vitest-signal-input-rendering`).

- [ ] **Step 2: Build.** `npm run build` → sin errores.

- [ ] **Step 3: Smoke manual** (dev levantado con `start-worktree.ps1`): login admin → Empresa → Notificaciones → activar "Se informó una liquidación" (o "Cambió un plan/convenio"), elegir un usuario con acceso a FINANCIERO/OBRAS_SOCIALES + un rol, guardar. Disparar la acción real (informar una liquidación / crear un plan) y verificar que a ese usuario le aparece el badge + el item, y que al clickear navega al registro y baja el contador. Verificar que un usuario sin acceso a la sección aparece bloqueado en el picker. (El evento "Turno a domicilio asignado" queda visible pero inerte — no dispara hasta que domicilio se mergee.)

- [ ] **Step 4: Commit** de ajustes. PR contra `development` (regla PR-workflow), linkeando el Jira.

## Self-Review (completado)

- **Spec coverage:** campana con badge/panel/click-navega-marca (Tasks 1-3), tab en Empresa con toggle + destinatarios usuarios/roles (Tasks 4-5), bloqueo de recipients sin acceso (Task 5 Step 5, decisión §9.3), evento inerte cierre de caja (Task 5), polling ETag/304 (Tasks 1-2). ✔
- **Placeholders:** los `/* ... */` en styles/reducers apuntan a patrones concretos del repo citados (extraction store, laboratory-ui); las firmas públicas están todas explícitas. ✔
- **Type consistency:** `NotificationItem`/`NotificationInbox` consistentes entre servicio (Task 1), store (Task 2) y componente (Task 3); `EventConfig`/`Recipient`/`EligibleRecipients` entre Tasks 4 y 5. ✔
- **Contrato con backend:** rutas `/api/v1/notifications*` y `/api/v1/notification-configs*` coinciden con el plan backend. ✔
