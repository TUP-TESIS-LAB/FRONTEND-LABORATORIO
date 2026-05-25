import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AgendaConfig,
  CreateAgendaConfigRequest,
  UpdateAgendaConfigRequest,
} from '../models/agenda-config.model';

@Injectable({ providedIn: 'root' })
export class AgendaConfigService {
  private http = inject(HttpClient);
  private base = '/api/v1/turnos/agenda-configs';

  list(branchId: number): Observable<AgendaConfig[]> {
    return this.http.get<AgendaConfig[]>(this.base, { params: { branchId } });
  }

  getById(id: number): Observable<AgendaConfig> {
    return this.http.get<AgendaConfig>(`${this.base}/${id}`);
  }

  create(body: CreateAgendaConfigRequest): Observable<number> {
    return this.http.post<number>(this.base, body);
  }

  update(id: number, body: UpdateAgendaConfigRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
