import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ResultadosApiService } from './resultados-api.service';

describe('ResultadosApiService', () => {
  let service: ResultadosApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ResultadosApiService] });
    service = TestBed.inject(ResultadosApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getResultsByProtocol → GET /resultados/protocol/{id}', () => {
    service.getResultsByProtocol(9).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/protocol/9');
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('getDeterminations → GET /resultados/{id}/determinations', () => {
    service.getDeterminations(1).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/determinations');
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('getDeterminationCatalog → GET /determination-catalog/{id}', () => {
    service.getDeterminationCatalog(500).subscribe();
    const req = http.expectOne('/api/v1/analitica/determination-catalog/500');
    expect(req.request.method).toBe('GET'); req.flush({});
  });
  it('batchUpdate → PATCH /resultados/{id}/determinations/batch con {items}', () => {
    const items = [{ determinationId: 11, resultValue: '180', observations: null }];
    service.batchUpdate(1, items).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/determinations/batch');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ items }); req.flush([]);
  });
  it('markReady → POST /resultados/{id}/mark-ready', () => {
    service.markReady(1).subscribe();
    const req = http.expectOne('/api/v1/analitica/resultados/1/mark-ready');
    expect(req.request.method).toBe('POST'); req.flush({});
  });
});
