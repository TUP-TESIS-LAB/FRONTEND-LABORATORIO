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
      // TODO: backend AppointmentResponse debería incluir patientFirstName +
      // patientLastName (hoy hay que hacer una segunda llamada por paciente
      // o mostrar el confirmationNumber). Mientras tanto usamos el número
      // de confirmación como identificador visible — Spec B no se diseñó
      // pensando en este endpoint cross-spec.
      map(rows => rows.map(r => ({
        id: r.id,
        patientId: r.patientId,
        patientName: `Turno ${r.confirmationNumber}`,
        appointmentTime: r.scheduledAt,
        branchId: r.branchId,
        status: r.status,
      } satisfies Appointment))),
    );
  }
}
