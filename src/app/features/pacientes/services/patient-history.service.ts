import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PatientHistoryItem } from '../models/patient-history.model';

/** Historial de atenciones de un paciente para el detalle. */
@Injectable({ providedIn: 'root' })
export class PatientHistoryService {
  private readonly http = inject(HttpClient);

  getHistory(patientId: number): Observable<PatientHistoryItem[]> {
    return this.http.get<PatientHistoryItem[]>(`/api/v1/attentions/patient/${patientId}/history`);
  }
}
