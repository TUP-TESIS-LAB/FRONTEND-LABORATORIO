import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LiquidacionesApiService } from './liquidaciones-api.service';

describe('LiquidacionesApiService', () => {
  let api: LiquidacionesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LiquidacionesApiService],
    });
    api = TestBed.inject(LiquidacionesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('listSettlements arma los query params de los filtros presentes', () => {
    api.listSettlements({ insurerId: 7, status: 'PENDING', from: '2026-01-01' }).subscribe();
    const req = httpMock.expectOne(
      r => r.url === '/api/v1/financiero/settlements',
    );
    expect(req.request.params.get('insurerId')).toBe('7');
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.get('from')).toBe('2026-01-01');
    expect(req.request.params.get('to')).toBeNull();
    req.flush([]);
  });

  it('generateSettlement hace POST a /settlements con el body', () => {
    const body = { insurerId: 1, period: { from: '2026-01-01', to: '2026-01-31' }, specialRules: [] as [], excludedAnalysisIdsByPs: null };
    api.generateSettlement(body).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('informSettlement hace PATCH a /settlements/{id}/inform', () => {
    api.informSettlement(5, { informedDate: '2026-02-01', informedAmount: 1000 }).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements/5/inform');
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('cancelSettlement hace PATCH a /settlements/{id}/cancel', () => {
    api.cancelSettlement(5, { cancellationReason: 'error de carga' }).subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/settlements/5/cancel');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ cancellationReason: 'error de carga' });
    req.flush(null);
  });

  it('listPendingServices pega a /provided-services/pending', () => {
    api.listPendingServices().subscribe();
    const req = httpMock.expectOne('/api/v1/financiero/provided-services/pending');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  afterEach(() => httpMock.verify());
});
