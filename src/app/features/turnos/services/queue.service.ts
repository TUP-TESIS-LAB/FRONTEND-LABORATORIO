import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CallQueueEntryResponse, QueueEntry } from '../models/queue-entry.model';

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
}
