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

  it('getOpenSession mapea 204 a null', () => {
    let result: unknown = 'unset';
    svc.getOpenSession(5).subscribe(r => (result = r));
    const req = http.expectOne('/api/v1/financiero/cash-sessions/open?branchId=5');
    expect(req.request.method).toBe('GET');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toBeNull();
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
});
