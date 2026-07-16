import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Study, ResultWithValidation, DetValidation, PostResult, ValidationOutcome, Page, StudyListItemResponse, StudyStatus, DetalleEstudioResponse } from '../models/postanalitica.model';

@Injectable({ providedIn: 'root' })
export class PostanaliticaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/analitica/postanalitica';

  getStudy(protocolId: number): Observable<Study> {
    return this.http.get<Study>(`${this.base}/studies/${protocolId}`);
  }
  getResultsValidation(protocolId: number): Observable<ResultWithValidation[]> {
    return this.http.get<ResultWithValidation[]>(`${this.base}/studies/${protocolId}/results/validation`);
  }
  validateDetermination(resultId: number, determinationId: number, outcome: ValidationOutcome): Observable<DetValidation> {
    return this.http.post<DetValidation>(`${this.base}/results/${resultId}/validate`, { determinationId, outcome });
  }
  validateAll(resultId: number, outcome: ValidationOutcome): Observable<PostResult> {
    return this.http.post<PostResult>(`${this.base}/results/${resultId}/validate-all`, { outcome });
  }

  listStudies(status?: StudyStatus): Observable<Page<StudyListItemResponse>> {
    let params = new HttpParams().set('size', '200');
    if (status) params = params.set('status', status);
    return this.http.get<Page<StudyListItemResponse>>(`${this.base}/studies`, { params });
  }

  getDetalle(protocolId: number): Observable<DetalleEstudioResponse> {
    return this.http.get<DetalleEstudioResponse>(`${this.base}/studies/${protocolId}/results/detail`);
  }
  signResult(resultId: number): Observable<unknown> {
    return this.http.post(`${this.base}/results/${resultId}/sign`, { token: 'ui-confirm' });
  }
  signStudy(protocolId: number): Observable<unknown> {
    return this.http.post(`${this.base}/studies/${protocolId}/sign`, { token: 'ui-confirm' });
  }

  /** Lista los informes generados de un estudio (para el flujo "Ver PDF"). */
  getStudyReports(protocolId: number): Observable<Array<{ id: number; versionNumber: number; reportType: string }>> {
    return this.http.get<Array<{ id: number; versionNumber: number; reportType: string }>>(
      `${this.base}/studies/${protocolId}/reports`);
  }

  /** Descarga el PDF de un informe de estudio (para el flujo "Ver PDF"). */
  downloadReport(protocolId: number, reportId: number): Observable<Blob> {
    return this.http.get(`${this.base}/studies/${protocolId}/reports/${reportId}/pdf`, { responseType: 'blob' });
  }
}
