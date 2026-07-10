import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ExternalLab, ExternalLabRequest, ExternalLabState } from '../models/external-lab.model';

@Injectable({ providedIn: 'root' })
export class ExternalLabService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/derivaciones/external-labs';

  list(state: ExternalLabState = 'active'): Observable<ExternalLab[]> {
    const params = new HttpParams().set('state', state);
    return this.http.get<ExternalLab[]>(this.base, { params });
  }

  get(id: number): Observable<ExternalLab> {
    return this.http.get<ExternalLab>(`${this.base}/${id}`);
  }

  create(req: ExternalLabRequest): Observable<ExternalLab> {
    return this.http.post<ExternalLab>(this.base, req);
  }

  update(id: number, req: ExternalLabRequest): Observable<ExternalLab> {
    return this.http.put<ExternalLab>(`${this.base}/${id}`, req);
  }

  toggle(id: number, deleted: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { deleted });
  }
}
