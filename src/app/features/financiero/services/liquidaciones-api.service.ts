import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import {
  SettlementSummary, SettlementDetail, SettlementFilters,
  GenerateSettlementBody, InformSettlementBody, CancelSettlementBody, PendingService,
} from '../models/liquidaciones.model';

@Injectable({ providedIn: 'root' })
export class LiquidacionesApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero';

  /** Listado polleable (ETag/304). */
  listSettlements(f: SettlementFilters): Observable<SettlementSummary[] | NotModified> {
    let params = new HttpParams();
    if (f.insurerId != null) params = params.set('insurerId', f.insurerId);
    if (f.from) params = params.set('from', f.from);
    if (f.to) params = params.set('to', f.to);
    if (f.status) params = params.set('status', f.status);
    return this.http.get<SettlementSummary[] | NotModified>(`${this.base}/settlements`, {
      params, context: withPolling(),
    });
  }

  getSettlement(id: number): Observable<SettlementDetail> {
    return this.http.get<SettlementDetail>(`${this.base}/settlements/${id}`);
  }

  generateSettlement(body: GenerateSettlementBody): Observable<SettlementDetail> {
    return this.http.post<SettlementDetail>(`${this.base}/settlements`, body);
  }

  informSettlement(id: number, body: InformSettlementBody): Observable<SettlementDetail> {
    return this.http.patch<SettlementDetail>(`${this.base}/settlements/${id}/inform`, body);
  }

  cancelSettlement(id: number, body: CancelSettlementBody): Observable<void> {
    return this.http.patch<void>(`${this.base}/settlements/${id}/cancel`, body);
  }

  /** Prestaciones pendientes polleable (ETag/304, sin filtros). */
  listPendingServices(): Observable<PendingService[] | NotModified> {
    return this.http.get<PendingService[] | NotModified>(`${this.base}/provided-services/pending`, {
      context: withPolling(),
    });
  }
}
