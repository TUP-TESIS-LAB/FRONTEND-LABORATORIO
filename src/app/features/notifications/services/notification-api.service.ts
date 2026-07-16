import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotModified, withPolling } from '@core/refresh';
import { NotificationInbox } from '../models/notification.model';

/** Único punto de acceso HTTP a la campana de notificaciones in-app. */
@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/notifications';

  getInbox(): Observable<NotificationInbox | NotModified> {
    return this.http.get<NotificationInbox | NotModified>(this.base, { context: withPolling() });
  }

  markRead(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
