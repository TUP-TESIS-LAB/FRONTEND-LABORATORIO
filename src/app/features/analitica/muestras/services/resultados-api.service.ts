import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AnalyticalResult, Determination, DeterminationCatalogEntry } from '../models/resultado.model';

export interface BatchDeterminationItem { determinationId: number; resultValue: string; observations: string | null; }

@Injectable({ providedIn: 'root' })
export class ResultadosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/resultados';
  private readonly catalogBase = '/api/v1/analitica/determinations';

  getResultsByProtocol(protocolId: number): Observable<AnalyticalResult[]> {
    return this.http.get<AnalyticalResult[]>(`${this.base}/protocol/${protocolId}`);
  }
  getDeterminations(resultId: number): Observable<Determination[]> {
    return this.http.get<Determination[]>(`${this.base}/${resultId}/determinations`);
  }
  getDeterminationCatalog(catalogId: number): Observable<DeterminationCatalogEntry> {
    return this.http.get<DeterminationCatalogEntry>(`${this.catalogBase}/${catalogId}`);
  }
  /** Determinaciones de catálogo de un análisis (filas del grid de planilla). */
  getDeterminationCatalogByAnalysis(analysisCatalogId: number): Observable<DeterminationCatalogEntry[]> {
    const params = new HttpParams().set('analysisId', analysisCatalogId);
    return this.http.get<DeterminationCatalogEntry[]>(`${this.catalogBase}/loadable`, { params });
  }
  batchUpdate(resultId: number, items: BatchDeterminationItem[]): Observable<Determination[]> {
    return this.http.patch<Determination[]>(`${this.base}/${resultId}/determinations/batch`, { items });
  }
  markReady(resultId: number): Observable<AnalyticalResult> {
    return this.http.post<AnalyticalResult>(`${this.base}/${resultId}/mark-ready`, null);
  }
  markReadyBatch(resultIds: number[]): Observable<AnalyticalResult[]> {
    return this.http.post<AnalyticalResult[]>(`${this.base}/mark-ready`, { resultIds });
  }
  receiveExternalResult(protocolIds: number[]): Observable<AnalyticalResult[]> {
    return this.http.post<AnalyticalResult[]>(`${this.base}/receive-external-result`, { protocolIds });
  }
}
