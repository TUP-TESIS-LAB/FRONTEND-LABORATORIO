import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateDoctorRequest, Doctor, UpdateDoctorRequest } from '../models/doctor.model';

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
