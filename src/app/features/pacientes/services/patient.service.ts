import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CreatePatientRequest, Patient, UpdatePatientRequest } from '../models/patient.model';
import { PatientPageRequest, PatientPageResult } from '../models/patient-page.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/analitica/patients';

  search(req: PatientPageRequest): Observable<PatientPageResult> {
    let params = new HttpParams()
      .set('state', req.state)
      .set('page', req.page)
      .set('size', req.size);
    if (req.q) params = params.set('q', req.q);
    if (req.status) params = params.set('status', req.status);
    return this.http.get<PatientPageResult>(`${this.baseUrl}/search`, { params });
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.baseUrl}/${id}`);
  }

  existsByDni(dni: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.baseUrl}/exists`, { params: { dni } })
      .pipe(map((r) => r.exists));
  }

  create(req: CreatePatientRequest): Observable<Patient> {
    return this.http.post<Patient>(this.baseUrl, req);
  }

  update(id: number, req: UpdatePatientRequest): Observable<Patient> {
    return this.http.put<Patient>(`${this.baseUrl}/${id}`, req);
  }

  toggleActive(id: number, deleted: boolean): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}`, { deleted });
  }
}
