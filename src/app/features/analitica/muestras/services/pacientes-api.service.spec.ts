import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PacientesApiService } from './pacientes-api.service';

describe('PacientesApiService', () => {
  let service: PacientesApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), PacientesApiService] });
    service = TestBed.inject(PacientesApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('getByIds → GET /patients/by-ids con ids repetidos', () => {
    let result: unknown;
    service.getByIds([20002, 20003]).subscribe(r => (result = r));
    const req = http.expectOne(r => r.url === '/api/v1/analitica/patients/by-ids');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.getAll('ids')).toEqual(['20002', '20003']);
    req.flush([{ id: 20002, firstName: 'Ana', lastName: 'López' }]);
    expect(result).toEqual([{ id: 20002, firstName: 'Ana', lastName: 'López' }]);
  });

  it('getByIds con lista vacía no pega y devuelve []', () => {
    let result: unknown;
    service.getByIds([]).subscribe(r => (result = r));
    http.expectNone(r => r.url === '/api/v1/analitica/patients/by-ids');
    expect(result).toEqual([]);
  });
});
