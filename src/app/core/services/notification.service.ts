import { Injectable, signal } from '@angular/core';

export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

export interface Notification {
  id: number;
  severity: NotificationSeverity;
  summary: string;
  detail?: string;
}

/** Tiempo por defecto antes de auto-descartar una notificación (ms). */
const DEFAULT_AUTO_DISMISS_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _counter = 0;
  readonly notifications = signal<Notification[]>([]);

  /**
   * Muestra una notificación. Por defecto se auto-descarta a los 5s para que
   * los toasts no se apilen indefinidamente. Pasar `autoDismissMs = 0` para que
   * quede fija (el usuario la cierra con la X).
   */
  show(
    severity: NotificationSeverity,
    summary: string,
    detail?: string,
    autoDismissMs: number = DEFAULT_AUTO_DISMISS_MS,
  ): void {
    const id = ++this._counter;
    this.notifications.update((list) => [...list, { id, severity, summary, detail }]);

    if (autoDismissMs > 0 && typeof setTimeout !== 'undefined') {
      setTimeout(() => this.dismiss(id), autoDismissMs);
    }
  }

  success(summary: string, detail?: string): void {
    this.show('success', summary, detail);
  }

  error(summary: string, detail?: string): void {
    this.show('error', summary, detail);
  }

  dismiss(id: number): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  clear(): void {
    this.notifications.set([]);
  }
}
