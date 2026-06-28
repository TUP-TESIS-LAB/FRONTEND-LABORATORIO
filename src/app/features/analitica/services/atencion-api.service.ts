import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AddAnalysisListRequest,
  AddObservationsRequest,
  AddPaymentRequest,
  AssignGeneralDataRequest,
  AttentionResponse,
  AttentionState,
  CancelAttentionRequest,
  CreateBlankAttentionRequest,
  CreatePreFilledAttentionRequest,
  SetAuthorizationNumberRequest,
  SetCopaymentRequest,
} from '../models/atencion.model';
import { AttentionPricing } from '../models/pricing.model';

@Injectable({ providedIn: 'root' })
export class AtencionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/attentions';

  list(excludeStates: AttentionState[] = []): Observable<AttentionResponse[]> {
    let params = new HttpParams();
    for (const s of excludeStates) {
      params = params.append('excludeStates', s);
    }
    return this.http.get<AttentionResponse[]>(this.base, { params });
  }

  getById(id: number): Observable<AttentionResponse> {
    return this.http.get<AttentionResponse>(`${this.base}/${id}`);
  }

  createBlank(body: CreateBlankAttentionRequest): Observable<AttentionResponse> {
    return this.http.post<AttentionResponse>(this.base, body);
  }

  createPreFilled(body: CreatePreFilledAttentionRequest): Observable<AttentionResponse> {
    return this.http.post<AttentionResponse>(`${this.base}/prefilled`, body);
  }

  assignGeneralData(id: number, body: AssignGeneralDataRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/assign/general-data`, body);
  }

  addAnalysis(id: number, body: AddAnalysisListRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/add/analysis`, body);
  }

  addPayment(id: number, body: AddPaymentRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/add/payment`, body);
  }

  endCollection(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/end-collection`, {});
  }

  endBilling(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/end-billing`, {});
  }

  endSecretaryPhase(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/end-secretary-phase`, {});
  }

  returnPhase(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/return-phase`, {});
  }

  cancel(id: number, body: CancelAttentionRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/cancel`, body);
  }

  addObservations(id: number, body: AddObservationsRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/add/observations`, body);
  }

  getPricing(id: number): Observable<AttentionPricing> {
    return this.http.get<AttentionPricing>(`${this.base}/${id}/pricing`);
  }

  setCopayment(id: number, body: SetCopaymentRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/copayment`, body);
  }

  setAuthorizationNumber(id: number, body: SetAuthorizationNumberRequest): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/authorization-number`, body);
  }

  setUrgentFlag(id: number, isUrgent: boolean): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/urgent`, { isUrgent });
  }

  advanceUrgent(id: number): Observable<AttentionResponse> {
    return this.http.post<AttentionResponse>(`${this.base}/${id}/urgent/advance`, {});
  }

  // ── KAN-153: Bandeja urgentes pendientes (reconciliación) ──────────────────

  /**
   * Listado de atenciones urgentes con pendientes de reconciliación.
   * Soporta If-None-Match → 304 (observe:'response' para acceder al ETag).
   */
  listUrgentPending(etag: string | null): Observable<HttpResponse<AttentionResponse[]>> {
    let headers = new HttpHeaders();
    if (etag) headers = headers.set('If-None-Match', etag);
    return this.http.get<AttentionResponse[]>(`${this.base}/urgent-pending`, { headers, observe: 'response' });
  }

  /** Completa datos administrativos pendientes (médico / plan de obra social). */
  completeAdminData(id: number, body: { doctorId?: number; insurancePlanId?: number }): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/complete-admin-data`, body);
  }

  /** Marca el cobro como regularizado (sin cuerpo). */
  cobroRegularizado(id: number): Observable<AttentionResponse> {
    return this.http.patch<AttentionResponse>(`${this.base}/${id}/cobro-regularizado`, {});
  }
}
