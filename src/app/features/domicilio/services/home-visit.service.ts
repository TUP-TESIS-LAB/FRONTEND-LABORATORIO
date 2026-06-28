import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
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

  myRoute(date?: string): Observable<HomeVisit[] | NotModified> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<HomeVisit[] | NotModified>(`${this.base}/my-route`, {
      params,
      context: withPolling(),
    });
  }

  detail(id: number): Observable<HomeVisit> {
    return this.http.get<HomeVisit>(`${this.base}/${id}`);
  }
}
