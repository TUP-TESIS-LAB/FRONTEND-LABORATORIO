import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { EligibleRecipients, EventConfig, Recipient } from '../models/notificaciones-config.model';

/**
 * Único punto de acceso HTTP a la config de notificaciones (tab "Notificaciones" de
 * Empresa, admin). No es polleada — es config, no un feed en tiempo real.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/notification-configs';

  getConfigs(): Observable<EventConfig[]> {
    return this.http.get<EventConfig[]>(this.base);
  }

  updateConfig(eventType: string, body: { enabled: boolean; recipients: Recipient[] }): Observable<void> {
    return this.http.put<void>(`${this.base}/${eventType}`, body);
  }

  getEligible(eventType: string): Observable<EligibleRecipients> {
    return this.http.get<EligibleRecipients>(`${this.base}/${eventType}/eligible`);
  }
}
