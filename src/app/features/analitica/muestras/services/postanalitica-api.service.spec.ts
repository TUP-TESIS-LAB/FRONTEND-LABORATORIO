import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PostanaliticaApiService } from './postanalitica-api.service';

const BASE = '/api/v1/analitica/postanalitica';

describe('PostanaliticaApiService', () => {
  let service: PostanaliticaApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PostanaliticaApiService] });
    service = TestBed.inject(PostanaliticaApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getStudy → GET /studies/{protocolId}', () => {
    service.getStudy(9).subscribe();
    const req = http.expectOne(`${BASE}/studies/9`);
    expect(req.request.method).toBe('GET'); req.flush({});
  });
  it('getResultsValidation → GET /studies/{protocolId}/results/validation', () => {
    service.getResultsValidation(9).subscribe();
    const req = http.expectOne(`${BASE}/studies/9/results/validation`);
    expect(req.request.method).toBe('GET'); req.flush([]);
  });
  it('validateDetermination → POST /results/{id}/validate con {determinationId, outcome}', () => {
    service.validateDetermination(1, 500, 'PASS').subscribe();
    const req = http.expectOne(`${BASE}/results/1/validate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ determinationId: 500, outcome: 'PASS' }); req.flush({});
  });
  it('validateAll → POST /results/{id}/validate-all con {outcome}', () => {
    service.validateAll(1, 'PASS').subscribe();
    const req = http.expectOne(`${BASE}/results/1/validate-all`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ outcome: 'PASS' }); req.flush({});
  });
});
