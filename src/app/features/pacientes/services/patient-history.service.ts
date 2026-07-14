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

  /** Descarga el PDF del informe más reciente disponible (parcial o final) de un protocolo. */
  printReport(patientId: number, protocolId: number): Observable<Blob> {
    return this.http.get(`/api/v1/attentions/patient/${patientId}/protocol/${protocolId}/report-print`, {
      responseType: 'blob',
    });
  }

  /** Dispara la re-inyección de una orden pendiente: genera una nueva muestra y reabre la extracción. */
  reinject(orderId: number): Observable<void> {
    return this.http.post<void>(`/api/v1/protocols/orders/${orderId}/reinject`, {});
  }
}
