import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-notification-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="notif-host" aria-live="polite">
      @for (n of notifications(); track n.id) {
        <div class="notif notif--{{ n.severity }}">
          <i class="pi" [class.pi-check-circle]="n.severity === 'success'"
                        [class.pi-times-circle]="n.severity === 'error'"
                        [class.pi-info-circle]="n.severity === 'info'"
                        [class.pi-exclamation-triangle]="n.severity === 'warn'"></i>
          <div class="notif__body">
            <strong>{{ n.summary }}</strong>
            @if (n.detail) { <span>{{ n.detail }}</span> }
          </div>
          <button type="button" class="notif__close" aria-label="Cerrar" (click)="dismiss(n.id)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .notif-host {
      position: fixed; top: var(--space-4); right: var(--space-4);
      display: flex; flex-direction: column; gap: var(--space-2);
      z-index: 1100; max-width: 360px;
    }
    .notif {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; border-radius: 10px; background: var(--ds-surface, #fff);
      box-shadow: 0 8px 24px rgba(0,0,0,.18); border-left: 4px solid var(--ds-text-muted);
    }
    .notif--success { border-left-color: #16a34a; }
    .notif--error   { border-left-color: #dc2626; }
    .notif--warn    { border-left-color: #d97706; }
    .notif--info    { border-left-color: #2563eb; }
    .notif__body { display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
    .notif__close { background: none; border: none; cursor: pointer; color: var(--ds-text-muted); }
  `],
})
export class NotificationHostComponent {
  private readonly service = inject(NotificationService);
  readonly notifications = this.service.notifications;
  dismiss(id: number): void { this.service.dismiss(id); }
}
