import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Popover } from 'primeng/popover';
import { EMPTY } from 'rxjs';
import { PollingHandle, PollingService } from '@core/refresh';
import { NotificationItem } from '../../models/notification.model';
import { loadInbox, markAllRead, markRead } from '../../store/notifications.actions';
import { selectNotificationItems, selectUnreadCount } from '../../store/notifications.selectors';

/**
 * Campana de notificaciones del topbar: badge dinámico + panel con la bandeja.
 * Hace polling propio de `loadInbox` (el effect resuelve 304 sin repintar) y
 * expone acciones de mutación (marcar leída / marcar todas) delegando en el
 * store — ver `NotificationsEffects` para el flujo optimista de mutaciones.
 */
@Component({
  selector: 'notif-bell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Popover, DatePipe],
  template: `
    <button
      type="button"
      class="ui-topbar__icon-btn ui-topbar__icon-btn--notif"
      aria-label="Notificaciones"
      (click)="panel.toggle($event)">
      <i class="pi pi-bell"></i>
      @if (unreadCount() > 0) {
        <span class="notif-badge">{{ unreadCount() }}</span>
      }
    </button>

    <p-popover #panel styleClass="notif-popover">
      <div class="notif-panel">
        <header class="notif-panel__head">
          <span>Notificaciones</span>
          @if (unreadCount() > 0) {
            <button type="button" class="notif-panel__mark-all" (click)="onMarkAll()">
              Marcar todas como leídas
            </button>
          }
        </header>

        @if (items().length === 0) {
          <p class="notif-panel__empty">No tenés notificaciones.</p>
        } @else {
          <ul class="notif-panel__list">
            @for (n of items(); track n.id) {
              <li
                class="notif-item"
                [class.notif-item--unread]="!n.read"
                (click)="onOpen(n, panel)">
                <strong class="notif-item__title">{{ n.title }}</strong>
                <span class="notif-item__message">{{ n.message }}</span>
                <small class="notif-item__date">{{ n.createdAt | date: 'short' }}</small>
              </li>
            }
          </ul>
        }
      </div>
    </p-popover>
  `,
  styles: [`
    /*
     * El botón replica .ui-topbar__icon-btn del topbar (mismo look que "Ayuda").
     * No podemos depender de esa clase escrita en el <style> de TopbarComponent:
     * con ViewEncapsulation.Emulated cada componente tiene su propio scope y las
     * reglas del padre no cruzan al template de un componente hijo (mismo patrón
     * self-contained que ui-branch-badge).
     */
    :host { display: contents; }

    .ui-topbar__icon-btn {
      width: 32px;
      height: 32px;
      background: rgba(15,23,42,.04);
      border: 1px solid rgba(15,23,42,.1);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(30,41,59,.65);
      font-size: 14px;
      transition: background .15s, color .15s;
      position: relative;
    }
    .ui-topbar__icon-btn:hover {
      background: rgba(15,23,42,.08);
      color: #1e293b;
    }
    @media (max-width: 767px) {
      .ui-topbar__icon-btn { width: var(--ds-touch-target); height: var(--ds-touch-target); }
    }

    .notif-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--ds-danger);
      color: #fff;
      font-size: 9px;
      min-width: 14px;
      height: 14px;
      padding: 0 3px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      line-height: 1;
    }

    .notif-panel {
      width: 340px;
      max-width: calc(100vw - var(--space-6));
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      font-family: inherit;
    }

    .notif-panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      font-weight: 700;
      color: var(--ds-text);
    }

    .notif-panel__mark-all {
      background: transparent;
      border: 0;
      color: var(--brand-primary);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
    }
    .notif-panel__mark-all:hover { text-decoration: underline; }

    .notif-panel__empty {
      margin: 0;
      padding: var(--space-6) var(--space-4);
      text-align: center;
      color: var(--ds-text-muted);
      font-size: 12px;
    }

    .notif-panel__list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 360px;
      overflow-y: auto;
    }

    .notif-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      transition: background .12s;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: #f8fafc; }
    .notif-item--unread { background: color-mix(in srgb, var(--brand-primary) 6%, white); }
    .notif-item--unread:hover { background: color-mix(in srgb, var(--brand-primary) 10%, white); }

    .notif-item__title { font-size: 12px; color: var(--ds-text); }
    .notif-item__message {
      font-size: 12px;
      color: var(--ds-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .notif-item__date { font-size: 10px; color: var(--ds-text-muted); }
  `],
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly polling = inject(PollingService);
  private handle: PollingHandle | null = null;

  protected readonly unreadCount = this.store.selectSignal(selectUnreadCount);
  protected readonly items = this.store.selectSignal(selectNotificationItems);

  ngOnInit(): void {
    this.store.dispatch(loadInbox());
    this.handle = this.polling.startPolling({
      key: 'notif-inbox',
      poll: () => {
        this.store.dispatch(loadInbox());
        return EMPTY;
      },
    });
  }

  ngOnDestroy(): void {
    this.handle?.stop();
    this.handle = null;
  }

  protected onOpen(n: NotificationItem, panel: Popover): void {
    if (!n.read) this.store.dispatch(markRead({ id: n.id }));
    if (n.targetRoute) this.router.navigateByUrl(n.targetRoute);
    panel.hide();
  }

  protected onMarkAll(): void {
    this.store.dispatch(markAllRead());
  }
}
