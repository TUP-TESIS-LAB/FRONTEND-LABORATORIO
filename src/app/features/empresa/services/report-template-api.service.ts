import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AuthorizerCandidate, GuardarReportTemplateTextPayload, ReportTemplate,
} from '../models/report-template.model';

@Injectable({ providedIn: 'root' })
export class ReportTemplateApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/empresa/report-template';

  get(): Observable<ReportTemplate> {
    return this.http.get<ReportTemplate>(this.base);
  }
  saveText(payload: GuardarReportTemplateTextPayload): Observable<ReportTemplate> {
    return this.http.put<ReportTemplate>(this.base, payload);
  }
  /** Admins del tenant elegibles como firmante autorizante (con o sin firma). */
  getAuthorizerCandidates(): Observable<AuthorizerCandidate[]> {
    return this.http.get<AuthorizerCandidate[]>(`${this.base}/authorizer-candidates`);
  }
  uploadHeaderLogo(file: File): Observable<void> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<void>(`${this.base}/header-logo`, fd);
  }
  uploadWatermark(file: File): Observable<void> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<void>(`${this.base}/watermark`, fd);
  }
  deleteHeaderLogo(): Observable<void> { return this.http.delete<void>(`${this.base}/header-logo`); }
  deleteWatermark(): Observable<void> { return this.http.delete<void>(`${this.base}/watermark`); }

  /**
   * Imagen del encabezado como blob. Se pide vía HttpClient para que pase por el
   * authTokenInterceptor (lleva el JWT en Authorization). Una `<img src>` directa al
   * endpoint NO lleva el token → 401. El llamador convierte el blob a object URL.
   */
  getHeaderLogoBlob(): Observable<Blob> {
    return this.http.get(`${this.base}/header-logo`, { responseType: 'blob' });
  }
  /** Marca de agua como blob (mismo motivo que getHeaderLogoBlob: JWT vía interceptor). */
  getWatermarkBlob(): Observable<Blob> {
    return this.http.get(`${this.base}/watermark`, { responseType: 'blob' });
  }
}
