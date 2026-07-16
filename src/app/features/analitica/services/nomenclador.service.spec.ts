import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NomencladorService } from './nomenclador.service';
import { AnalysisService } from './analysis.service';

describe('NomencladorService', () => {
  let svc: NomencladorService;
  let httpMock: HttpTestingController;
  const analysisStub = {
    list: () => of([{ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14 }]),
    getById: () => of({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14,
      determinations: [{ id: 9, name: 'Hemoglobina' }], nbuCode: '475' }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NomencladorService,
        { provide: AnalysisService, useValue: analysisStub },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    svc = TestBed.inject(NomencladorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getCatalog mapea análisis REALES a CatalogRow', async () => {
    const rows = await firstValueFrom(svc.getCatalog());
    expect(rows[0]).toEqual({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', nbuCode: null, cantidadUb: 14 });
  });

  it('getDeterminations devuelve nbuCode y determinaciones REALES del detalle', async () => {
    const result = await firstValueFrom(svc.getDeterminations(1));
    expect(result.nbuCode).toBe('475');
    expect(result.determinations).toEqual([{ id: 9, name: 'Hemoglobina' }]);
  });

  it('getVersions (REAL) mapea NbuVersionResponse y marca la vigente', async () => {
    const promise = firstValueFrom(svc.getVersions());
    const req = httpMock.expectOne('/api/v1/analitica/nbu-versions');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 7, versionCode: '2024_2025', active: true, status: 'active' },
      { id: 4, versionCode: '2021_2022', active: false, status: 'inactive' },
    ]);
    const vs = await promise;
    expect(vs).toEqual([
      { id: '7', label: 'NBU 2024/2025 — vigente', vigente: true },
      { id: '4', label: 'NBU 2021/2022', vigente: false },
    ]);
  });

  it('getVersions resiliente: ante error (ej. 403) devuelve [] sin romper la carga', async () => {
    const promise = firstValueFrom(svc.getVersions());
    httpMock.expectOne('/api/v1/analitica/nbu-versions').flush('forbidden', { status: 403, statusText: 'Forbidden' });
    expect(await promise).toEqual([]);
  });

  it('getParticularPricing compone valorUb (config) + overrides (lista)', () => {
    let result: any;
    svc.getParticularPricing().subscribe(r => (result = r));
    httpMock.expectOne('/api/v1/analitica/config/particular-ub').flush({ valorUbParticular: 350 });
    httpMock.expectOne('/api/v1/analitica/price-overrides').flush([{ analysisCatalogId: 7, overridePrice: 999 }]);
    expect(result.valorUb).toBe(350);
    expect(result.overrides).toEqual({ 7: 999 });
  });

  it('saveValorUb hace PUT a /config/particular-ub', () => {
    svc.saveValorUb(400).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/config/particular-ub');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ valorUbParticular: 400 });
    req.flush(null);
  });

  it('setOverride con precio hace PUT', () => {
    svc.setOverride(7, 999).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/price-overrides/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ overridePrice: 999 });
    req.flush(null);
  });

  it('setOverride con null hace DELETE (revert)', () => {
    svc.setOverride(7, null).subscribe();
    const req = httpMock.expectOne('/api/v1/analitica/price-overrides/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('cantidadUbForVersion (passthrough hoy) devuelve la base sin escalar', () => {
    expect(svc.cantidadUbForVersion(10, '7')).toBe(10);
    expect(svc.cantidadUbForVersion(10, '4')).toBe(10);
    expect(svc.cantidadUbForVersion(null, '7')).toBeNull();
  });
});
