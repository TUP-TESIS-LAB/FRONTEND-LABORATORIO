import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateHomeVisitPayload, HomeVisit } from '../models/home-visit.model';

@Injectable({ providedIn: 'root' })
export class HomeVisitService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/domicilio/visits';

  create(payload: CreateHomeVisitPayload): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(this.base, payload);
  }

  list(branchId: number): Observable<HomeVisit[]> {
    return this.http.get<HomeVisit[]>(this.base, { params: { branchId } });
  }
}
