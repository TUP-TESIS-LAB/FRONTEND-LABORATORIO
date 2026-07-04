import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import {
  BreakageReason,
  CreateHomeVisitPayload,
  CustodyEvent,
  HomeVisit,
  HomeVisitOutcomeReason,
  PreparedLabel,
} from '../models/home-visit.model';

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

  prepareLabels(id: number): Observable<{ visit: HomeVisit; labels: PreparedLabel[] }> {
    return this.http.post<{ visit: HomeVisit; labels: PreparedLabel[] }>(
      `${this.base}/${id}/prepare-labels`,
      {},
    );
  }

  markExtracted(id: number, scannedBarcode: string): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/extracted`, { scannedBarcode });
  }

  markOutcome(id: number, reason: HomeVisitOutcomeReason): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/outcome`, { reason });
  }

  reschedule(id: number): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/reschedule`, {});
  }

  markInTransit(id: number): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/in-transit`, {});
  }

  receiveVisit(id: number): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/received`, {});
  }

  markBroken(id: number, reason: BreakageReason): Observable<HomeVisit> {
    return this.http.patch<HomeVisit>(`${this.base}/${id}/broken`, { reason });
  }

  reExtract(id: number): Observable<HomeVisit> {
    return this.http.post<HomeVisit>(`${this.base}/${id}/re-extract`, {});
  }

  loadCustody(id: number): Observable<CustodyEvent[] | NotModified> {
    return this.http.get<CustodyEvent[] | NotModified>(`${this.base}/${id}/custody`, {
      context: withPolling(),
    });
  }
}
