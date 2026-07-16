import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';

export interface Patient { id: number; firstName: string; lastName: string; }

@Injectable({ providedIn: 'root' })
export class PacientesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/patients';

  getByIds(ids: number[]): Observable<Patient[]> {
    if (!ids.length) return of([]);
    let params = new HttpParams();
    for (const id of ids) params = params.append('ids', id);
    return this.http.get<Patient[]>(`${this.base}/by-ids`, { params });
  }
}
