import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
   * Atender desde Recepcion: registra el call (crea el queue_entry si no existe, sella
   * lastCalledAt, incrementa callCount y refresca la TV).
   *
   * NO completa el entry (KAN-249): la atencion recien se crea en el paso 1 del wizard, asi
   * que completarlo aca dejaba al turno fuera de la cola y sin atencion que retomar — un back
   * o un F5 en esa ventana lo perdia para siempre. El entry queda PENDING (sigue en la cola,
   * sigue retomable) y lo completa el backend al crear la atencion, en la misma transaccion.
   *
   * El `id` del response viaja al wizard como `queueEntryId` y es el que el backend usa para
   * completarlo. Sigue siendo un metodo aparte de `callByAppointment` para que quede pineado
   * que atender no completa nada (ver queue.service.spec.ts).
   */
  attendByAppointment(appointmentId: number): Observable<CallQueueEntryResponse> {
    return this.callByAppointment(appointmentId);
  }

  updateStatus(id: number, newStatus: QueueStatus): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { newStatus });
  }

  /** Cancelar desde la cola: marca entry como CANCELED y lo saca del listado. */
  cancel(id: number): Observable<void> {
    return this.updateStatus(id, QueueStatus.CANCELED);
  }
}
