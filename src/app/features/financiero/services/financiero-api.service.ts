import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { withPolling, NotModified } from '@core/refresh';
import {
  CashSession, SessionActivity, PaymentListItem, Payment, PaymentStatus,
  TransactionType, TenantFiscalConfig, FiscalProvider, FiscalInvoiceReference,
  CreatePaymentRequest, RegisterPaymentResponse,
  CashRegister, BankAccount, BankAccountInput,
  BranchOtherMedia, RegisterBranchMovementInput,
  BranchesSummary,
} from '../models/financiero.model';

@Injectable({ providedIn: 'root' })
export class FinancieroApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/financiero';

  // ── Sesión de caja (KAN-156: por subcaja, cashRegisterId) ──────────────────
  getOpenSession(cashRegisterId: number): Observable<CashSession | null> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/open`, {
      params: new HttpParams().set('cashRegisterId', cashRegisterId),
    }).pipe(map(s => s ?? null));
  }

  getSession(id: number): Observable<CashSession> {
    return this.http.get<CashSession>(`${this.base}/cash-sessions/${id}`, { context: withPolling() });
  }

  getActivity(id: number): Observable<SessionActivity | NotModified> {
    return this.http.get<SessionActivity | NotModified>(`${this.base}/cash-sessions/${id}/activity`, { context: withPolling() });
  }

  openSession(cashRegisterId: number, openingAmount: number): Observable<CashSession> {
    return this.http.post<CashSession>(`${this.base}/cash-sessions`, { cashRegisterId, openingAmount });
  }

  closeSession(id: number, declaredAmount: number): Observable<CashSession> {
    return this.http.patch<CashSession>(`${this.base}/cash-sessions/${id}/close`, { declaredAmount });
  }

  registerTransaction(id: number, body: { cashRegisterId: number; type: TransactionType; amount: number; description: string }): Observable<unknown> {
    return this.http.post(`${this.base}/cash-sessions/${id}/transactions`, body);
  }

  // ── Subcajas (cash-registers) ──────────────────────────────────────────────
  listCashRegisters(branchId: number): Observable<CashRegister[]> {
    return this.http.get<CashRegister[]>(`${this.base}/cash-registers`, {
      params: new HttpParams().set('branchId', branchId),
    });
  }

  createCashRegister(branchId: number, name: string): Observable<CashRegister> {
    return this.http.post<CashRegister>(`${this.base}/cash-registers`, { branchId, name });
  }

  deactivateCashRegister(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cash-registers/${id}`);
  }

  // ── Cuentas destino (bank-accounts) ────────────────────────────────────────
  listBankAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.base}/bank-accounts`);
  }

  createBankAccount(body: BankAccountInput): Observable<BankAccount> {
    return this.http.post<BankAccount>(`${this.base}/bank-accounts`, body);
  }

  updateBankAccount(id: number, body: BankAccountInput & { active: boolean }): Observable<BankAccount> {
    return this.http.put<BankAccount>(`${this.base}/bank-accounts/${id}`, body);
  }

  deactivateBankAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/bank-accounts/${id}`);
  }

  // ── Movimiento manual no-efectivo + otros medios (sucursal+día) ────────────
  registerBranchMovement(body: RegisterBranchMovementInput): Observable<unknown> {
    return this.http.post(`${this.base}/branch-movements`, body);
  }

  getBranchOtherMedia(branchId: number, from: string, to: string): Observable<BranchOtherMedia | NotModified> {
    return this.http.get<BranchOtherMedia | NotModified>(`${this.base}/branch-movements`, {
      params: new HttpParams().set('branchId', branchId).set('from', from).set('to', to),
      context: withPolling(),
    });
  }

  // ── Resumen multi-sucursal (KAN-161) ───────────────────────────────────────
  getBranchesSummary(from: string, to: string): Observable<BranchesSummary | NotModified> {
    return this.http.get<BranchesSummary | NotModified>(`${this.base}/branches-summary`, {
      params: new HttpParams().set('from', from).set('to', to),
      context: withPolling(),
    });
  }

  // ── Pagos / cobros ─────────────────────────────────────────────────────────
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
