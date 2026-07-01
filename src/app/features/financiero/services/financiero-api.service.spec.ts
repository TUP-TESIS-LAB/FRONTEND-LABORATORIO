import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FinancieroApiService } from './financiero-api.service';

describe('FinancieroApiService', () => {
  let svc: FinancieroApiService; let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    svc = TestBed.inject(FinancieroApiService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getOpenSession consulta por cashRegisterId y mapea 204 a null', () => {
    let result: unknown = 'unset';
    svc.getOpenSession(5).subscribe(r => (result = r));
    const req = http.expectOne('/api/v1/financiero/cash-sessions/open?cashRegisterId=5');
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toBeNull();
  });

  it('openSession hace POST con { cashRegisterId, openingAmount }', () => {
    svc.openSession(5, 15000).subscribe();
    const req = http.expectOne('/api/v1/financiero/cash-sessions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ cashRegisterId: 5, openingAmount: 15000 });
    req.flush({});
  });

  it('registerTransaction hace POST a la sesión con cashRegisterId en el body', () => {
    const body = { cashRegisterId: 5, type: 'INGRESS' as const, amount: 500, description: 'Cambio' };
    svc.registerTransaction(100, body).subscribe();
    const req = http.expectOne('/api/v1/financiero/cash-sessions/100/transactions');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('listCashRegisters arma query con branchId', () => {
    svc.listCashRegisters(3).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/cash-registers');
    expect(req.request.params.get('branchId')).toBe('3');
    req.flush([]);
  });

  it('createCashRegister hace POST con { branchId, name }', () => {
    svc.createCashRegister(3, 'Caja mostrador').subscribe();
    const req = http.expectOne('/api/v1/financiero/cash-registers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ branchId: 3, name: 'Caja mostrador' });
    req.flush({});
  });

  it('listBankAccounts hace GET a /bank-accounts', () => {
    svc.listBankAccounts().subscribe();
    const req = http.expectOne('/api/v1/financiero/bank-accounts');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('registerBranchMovement hace POST a /branch-movements', () => {
    const body = { branchId: 3, type: 'INGRESS' as const, method: 'TRANSFER' as const, amount: 1000 };
    svc.registerBranchMovement(body).subscribe();
    const req = http.expectOne('/api/v1/financiero/branch-movements');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('getBranchOtherMedia arma query con branchId/from/to', () => {
    svc.getBranchOtherMedia(3, '2026-06-29T00:00:00.000Z', '2026-06-29T23:59:59.999Z').subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/branch-movements');
    expect(req.request.params.get('branchId')).toBe('3');
    expect(req.request.params.get('from')).toBe('2026-06-29T00:00:00.000Z');
    expect(req.request.params.get('to')).toBe('2026-06-29T23:59:59.999Z');
    req.flush({ rows: [], total: 0, count: 0 });
  });

  it('listPayments arma query con branchId y status', () => {
    svc.listPayments({ branchId: 5, status: 'PROCESSED' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/financiero/payments');
    expect(req.request.params.get('branchId')).toBe('5');
    expect(req.request.params.get('status')).toBe('PROCESSED');
    req.flush([]);
  });

  it('cancelPayment hace DELETE con body { reason }', () => {
    svc.cancelPayment(9, 'cobro duplicado').subscribe();
    const req = http.expectOne('/api/v1/financiero/payments/9');
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ reason: 'cobro duplicado' });
    req.flush({});
  });

  it('createPayment hace POST a /payments con el body y devuelve la respuesta', () => {
    const body = {
      attentionId: 7, branchId: 3, totalAmount: 1500, copaymentAmount: 1500,
      collections: [{ method: 'CASH' as const, amount: 1500, reference: null }],
      details: [{ analysisId: 10, coverageId: null, covered: false, chargedAmount: 1500 }],
      operatorOptedOutOfElectronic: false,
    };
    const resp = {
      payment: { id: 99, tenantId: 1, attentionId: 7, branchId: 3, totalAmount: 1500,
        copaymentAmount: 1500, status: 'CREATED', cashTransactionId: 1, cancelledAt: null,
        cancelReason: null, collections: [], details: [] },
      fiscalReference: { id: 1, paymentId: 99, provider: 'NONE', comprobanteTipo: 'FACTURA_X',
        internalReference: 'R-0001', externalInvoiceId: null, electronic: false, isVoid: false,
        emittedAt: '2026-06-19T10:00:00Z' },
    };

    let result: unknown;
    svc.createPayment(body).subscribe(r => (result = r));

    const req = http.expectOne('/api/v1/financiero/payments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(resp);

    expect(result).toEqual(resp);
  });
});
