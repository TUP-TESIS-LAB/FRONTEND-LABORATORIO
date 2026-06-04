import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { CallQueueEntryResponse, QueueEntry } from '../models/queue-entry.model';
import { QueueStatus } from '../models/queue-status.enum';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/queue';

  list(branchId: number): Observable<QueueEntry[]> {
    const params = new HttpParams().set('branchId', String(branchId));
    return this.http.get<QueueEntry[]>(this.base, { params });
  }

  call(id: number): Observable<CallQueueEntryResponse> {
    return this.http.post<CallQueueEntryResponse>(`${this.base}/${id}/call`, {});
  }

  callByAppointment(appointmentId: number): Observable<CallQueueEntryResponse> {
    return this.http.post<CallQueueEntryResponse>(
      `${this.base}/by-appointment/${appointmentId}/call`,
      {},
    );
  }

  /**
   * Atender desde Recepcion: registra el call (crea queue_entry si no
   * existe + incrementa callCount) y despues transiciona el entry a
   * COMPLETED en una sola operacion lineal. El paciente sale de la cola
   * y queda "en atencion" — el flujo del wizard despues se maneja aparte.
   */
  attendByAppointment(appointmentId: number): Observable<CallQueueEntryResponse> {
    return this.callByAppointment(appointmentId).pipe(
      switchMap(response =>
        this.updateStatus(response.id, QueueStatus.COMPLETED).pipe(map(() => response)),
      ),
    );
  }

  updateStatus(id: number, newStatus: QueueStatus): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { newStatus });
  }

  /** Cancelar desde la cola: marca entry como CANCELED y lo saca del listado. */
  cancel(id: number): Observable<void> {
    return this.updateStatus(id, QueueStatus.CANCELED);
  }
}
