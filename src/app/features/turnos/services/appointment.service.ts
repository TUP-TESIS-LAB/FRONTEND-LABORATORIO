import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Appointment } from '../models/appointment.model';

// Shape real del backend (AppointmentResponse): patientId pero NO patientName,
// scheduledAt en vez de appointmentTime. Mapeamos en este service para no
// arrastrar la fricción al store ni a la página.
interface BackendAppointment {
  id: number;
  patientId: number;
  branchId: number;
  scheduledAt: string;
  confirmationNumber: string;
  status: string;
  patientFirstName?: string | null;
  patientLastName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/appointments';

  listToday(branchId: number): Observable<Appointment[]> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const params = new HttpParams()
      .set('branchId', String(branchId))
      .set('date', today);
    return this.http.get<BackendAppointment[]>(this.base, { params }).pipe(
      map(rows => rows.map(r => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patientFirstName && r.patientLastName
          ? `${r.patientFirstName} ${r.patientLastName}`
          : `Turno ${r.confirmationNumber}`,
        appointmentTime: r.scheduledAt,
        branchId: r.branchId,
        status: r.status,
      } satisfies Appointment))),
    );
  }
}
