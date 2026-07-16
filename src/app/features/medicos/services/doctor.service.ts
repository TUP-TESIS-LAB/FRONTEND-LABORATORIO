import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateDoctorRequest, Doctor, QuickCreateDoctorRequest, UpdateDoctorRequest } from '../models/doctor.model';

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/sucursales/doctors';

  list(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.baseUrl);
  }
  getById(id: number): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.baseUrl}/${id}`);
  }
  create(req: CreateDoctorRequest): Observable<Doctor> {
    return this.http.post<Doctor>(this.baseUrl, req);
  }
  /**
   * Alta rápida del médico solicitante (recepción): sólo nombre + matrícula.
   * El backend completa registrationType=NACIONAL por defecto. Endpoint accesible
   * a SECRETARIA (el POST completo es sólo ADMINISTRADOR).
   */
  quickCreate(req: QuickCreateDoctorRequest): Observable<Doctor> {
    return this.http.post<Doctor>(`${this.baseUrl}/quick`, req);
  }
  update(id: number, req: UpdateDoctorRequest): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.baseUrl}/${id}`, req);
  }
  toggleStatus(id: number): Observable<Doctor> {
    return this.http.patch<Doctor>(`${this.baseUrl}/${id}/status`, {});
  }
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
