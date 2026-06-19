import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { NomencladorService } from './nomenclador.service';
import { AnalysisService } from './analysis.service';

describe('NomencladorService', () => {
  let svc: NomencladorService;
  const analysisStub = {
    list: () => of([{ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14 }]),
    getById: () => of({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', ubCount: 14,
      determinations: [{ id: 9, name: 'Hemoglobina' }], nbuCode: '475' }),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [NomencladorService, { provide: AnalysisService, useValue: analysisStub }] });
    svc = TestBed.inject(NomencladorService);
  });

  it('getCatalog mapea análisis REALES a CatalogRow', async () => {
    const rows = await firstValueFrom(svc.getCatalog());
    expect(rows[0]).toEqual({ id: 1, shortCode: 'HEMO', name: 'Hemograma', familyName: 'Hematología', nbuCode: null, cantidadUb: 14 });
  });

  it('getDeterminations devuelve las determinaciones REALES del detalle', async () => {
    const dets = await firstValueFrom(svc.getDeterminations(1));
    expect(dets).toEqual([{ id: 9, name: 'Hemoglobina' }]);
  });

  it('getVersions (MOCK) devuelve al menos la versión vigente', async () => {
    const vs = await firstValueFrom(svc.getVersions());
    expect(vs.some(v => v.vigente)).toBe(true);
  });

  it('getParticularPricing (MOCK) trae valorUb y overrides', async () => {
    const p = await firstValueFrom(svc.getParticularPricing());
    expect(p.valorUb).toBeGreaterThan(0);
    expect(typeof p.overrides).toBe('object');
  });

  it('cantidadUbForVersion (MOCK) ajusta la base por versión', () => {
    expect(svc.cantidadUbForVersion(10, 'v2024')).toBe(10);
    expect(svc.cantidadUbForVersion(10, 'v2018')).toBeLessThan(10);
    expect(svc.cantidadUbForVersion(null, 'v2024')).toBeNull();
  });
});
