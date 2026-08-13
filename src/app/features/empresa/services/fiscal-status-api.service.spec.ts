import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { FiscalStatusApiService } from './fiscal-status-api.service';

describe('FiscalStatusApiService', () => {
  let service: FiscalStatusApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FiscalStatusApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FiscalStatusApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /api/v1/financiero/fiscal-status sin parámetros de tenant', () => {
    service.get().subscribe();
    const req = http.expectOne('/api/v1/financiero/fiscal-status');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({
      electronicInvoicingEnabled: false,
      environment: null,
      missingFields: ['CUIT'],
      readyToInvoice: false,
    });
  });
});
