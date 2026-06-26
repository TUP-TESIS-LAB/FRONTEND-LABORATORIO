import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BookAppointmentRequest, SlotDisponible, TipoAnalisis } from '../models/sacar-turno.model';

/**
 * Shape de GET /api/v1/turnos/availability (AvailableSlotResponse del backend).
 * Sólo consumimos startTime + available; el resto se ignora.
 */
interface AvailableSlotResponse {
  startTime: string;   // "08:30:00"
  available: number;
}

/** Formatea una fecha local a "YYYY-MM-DD" sin convertir a UTC. */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formatea una fecha local a "YYYY-MM-DDTHH:mm:ss" sin convertir a UTC. */
export function toLocalDateTimeString(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${toLocalDateString(d)}T${hh}:${mm}:${ss}`;
}

@Injectable({ providedIn: 'root' })
export class SacarTurnoApiService {
  private readonly http = inject(HttpClient);

  getTipos(): Observable<TipoAnalisis[]> {
    return this.http.get<TipoAnalisis[]>('/api/v1/turnos/catalog/tipos-analisis');
  }

  getAvailability(branchId: number, date: Date): Observable<SlotDisponible[]> {
    const iso = toLocalDateString(date);
    return this.http
      .get<AvailableSlotResponse[]>(`/api/v1/turnos/availability?branchId=${branchId}&date=${iso}`)
      .pipe(map(slots => slots.map(s => ({
        hora: s.startTime.slice(0, 5), // "08:30:00" → "08:30"
        disponible: s.available > 0,
      }))));
  }

  book(req: BookAppointmentRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>('/api/v1/turnos/appointments', {
      patientId: req.patientId,
      branchId: req.branchId,
      scheduledAt: req.scheduledAt,
      comments: req.comments ?? null,
      prescriptionFileUrl: null,
      determinations: req.determinations,
    });
  }
}
