import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { isNotModified, NotModified, withPolling } from '@core/refresh';
import { Appointment } from '../models/appointment.model';

// Shape real del backend (AppointmentResponse): patientId pero NO patientName,
// scheduledAt en vez de appointmentTime, nationalId (KAN-73 PR #36).
interface BackendAppointment {
  id: number;
  patientId: number;
  branchId: number;
  scheduledAt: string;
  confirmationNumber: string;
  status: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
  nationalId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/appointments';

  listToday(branchId: number): Observable<Appointment[] | NotModified> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const params = new HttpParams()
      .set('branchId', String(branchId))
      .set('date', today);
    return this.http.get<BackendAppointment[] | NotModified>(this.base, { params, context: withPolling() }).pipe(
      map(rows => isNotModified(rows) ? rows : rows.map(r => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientFirstName && r.patientLastName
          ? `${r.patientFirstName} ${r.patientLastName}`
          : `Turno ${r.confirmationNumber}`,
        nationalId: r.nationalId ?? null,
        appointmentTime: r.scheduledAt,
        branchId: r.branchId,
        status: r.status,
      } satisfies Appointment))),
    );
  }
}
