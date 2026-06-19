import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import {
  CashSession, SessionActivity, PaymentListItem, Payment, PaymentStatus,
  TransactionType, TenantFiscalConfig, FiscalProvider, FiscalInvoiceReference,
  CreatePaymentRequest, RegisterPaymentResponse,
} from '../models/financiero.model';

@Injectable({ providedIn: 'root' })
export class FinancieroApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero';

  getOpenSession(branchId: number): Observable<CashSession | null> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/open`, {
      params: new HttpParams().set('branchId', branchId),
    }).pipe(map(s => s ?? null));
  }

  getSession(id: number): Observable<CashSession> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/${id}`, { context: withPolling() });
  }

  getActivity(id: number): Observable<SessionActivity | NotModified> {
    return this.http.get<SessionActivity | NotModified>(`${this.base}/cash-sessions/${id}/activity`, { context: withPolling() });
  }

  openSession(branchId: number, openingAmount: number): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.base}/cash-sessions`, { branchId, openingAmount });
  }

  closeSession(id: number, declaredAmount: number): Observable<CashSession> {
    return this.http.patch<CashSession>(`${this.base}/cash-sessions/${id}/close`, { declaredAmount });
  }

  registerTransaction(id: number, body: { branchId: number; type: TransactionType; amount: number; description: string }): Observable<unknown> {
    return this.http.post(`${this.base}/cash-sessions/${id}/transactions`, body);
  }

  listPayments(filters: { branchId?: number; status?: PaymentStatus }): Observable<PaymentListItem[]> {
    let params = new HttpParams();
    if (filters.branchId != null) params = params.set('branchId', filters.branchId);
    if (filters.status) params = params.set('status', filters.status);
    return this.http.get<PaymentListItem[]>(`${this.base}/payments`, { params });
  }

  getPayment(id: number): Observable<Payment & { fiscalReference?: FiscalInvoiceReference }> {
    return this.http.get<Payment & { fiscalReference?: FiscalInvoiceReference }>(`${this.base}/payments/${id}`);
  }

  cancelPayment(id: number, reason: string): Observable<Payment> {
    return this.http.request<Payment>('delete', `${this.base}/payments/${id}`, { body: { reason } });
  }

  createPayment(body: CreatePaymentRequest): Observable<RegisterPaymentResponse> {
    return this.http.post<RegisterPaymentResponse>(`${this.base}/payments`, body);
  }

  getFiscalConfig(tenantId: number): Observable<TenantFiscalConfig> {
    return this.http.get<TenantFiscalConfig>(`${this.base}/tenant/fiscal-config/${tenantId}`);
  }

  saveFiscalConfig(body: { targetTenantId: number; provider: FiscalProvider; invoicePointOfSale?: string; configJson?: string }): Observable<TenantFiscalConfig> {
    return this.http.post<TenantFiscalConfig>(`${this.base}/tenant/fiscal-config`, body);
  }
}
