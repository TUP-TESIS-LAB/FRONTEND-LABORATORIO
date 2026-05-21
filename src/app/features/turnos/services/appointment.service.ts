import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment.model';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/appointments';

  listToday(branchId: number): Observable<Appointment[]> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const params = new HttpParams()
      .set('branchId', String(branchId))
      .set('date', today);
    return this.http.get<Appointment[]>(this.base, { params });
  }
}
