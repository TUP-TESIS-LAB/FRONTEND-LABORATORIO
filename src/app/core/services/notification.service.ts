import { Injectable, signal } from '@angular/core';

export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

export interface Notification {
  id: number;
  severity: NotificationSeverity;
  summary: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _counter = 0;
  readonly notifications = signal<Notification[]>([]);

  show(severity: NotificationSeverity, summary: string, detail?: string): void {
    const id = ++this._counter;
    this.notifications.update((list) => [...list, { id, severity, summary, detail }]);
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
