import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NbuConfigApiService, ReferenceValueItem } from './nbu-config-api.service';

describe('NbuConfigApiService', () => {
  let svc: NbuConfigApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NbuConfigApiService],
    });
    svc = TestBed.inject(NbuConfigApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('getOverride → GET /determinations/{id}/override', () => {
    svc.getOverride(5).subscribe();
    const req = http.expectOne('/api/v1/analitica/determinations/5/override');
    expect(req.request.method).toBe('GET');
    req.flush({ hasOverride: false, override: null });
  });

  it('upsertOverride → PUT /determinations/{id}/override con el body', () => {
    svc.upsertOverride(5, { preIndications: 'Ayuno 8h' }).subscribe();
    const req = http.expectOne('/api/v1/analitica/determinations/5/override');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ preIndications: 'Ayuno 8h' });
    req.flush({});
  });

  it('getReferenceValues → GET /determinations/{id}/reference-values/override', () => {
    svc.getReferenceValues(7).subscribe();
    const req = http.expectOne('/api/v1/analitica/determinations/7/reference-values/override');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('upsertReferenceValues → PUT /determinations/{id}/reference-values/override con el array', () => {
    const items: ReferenceValueItem[] = [{
      minValue: 13, maxValue: 17, criticalMinValue: 7, criticalMaxValue: 20,
      ageMinMonths: null, ageMaxMonths: null, gender: 'MALE', unit: 'g/dL',
      qualitativeValue: null,
    }];
    svc.upsertReferenceValues(7, items).subscribe();
    const req = http.expectOne('/api/v1/analitica/determinations/7/reference-values/override');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(items);
    req.flush(items);
  });

  it('listTenantAnalyses → GET /tenant-analyses', () => {
    svc.listTenantAnalyses().subscribe();
    const req = http.expectOne('/api/v1/tenant-analyses');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('patchSection → PATCH /tenant-analyses/{id} con {defaultSectionId}', () => {
    svc.patchSection(9, 3).subscribe();
    const req = http.expectOne('/api/v1/tenant-analyses/9');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ defaultSectionId: 3 });
    req.flush({});
  });

  it('updateTenantAnalysis → PATCH /tenant-analyses/{id} con {shortCode, customName}', () => {
    svc.updateTenantAnalysis(9, { shortCode: 'GLU', customName: 'Glucemia' }).subscribe();
    const req = http.expectOne('/api/v1/tenant-analyses/9');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ shortCode: 'GLU', customName: 'Glucemia' });
    req.flush({});
  });

  it('getPreparationTypes hace GET a /preparation/types', () => {
    svc.getPreparationTypes().subscribe();
    const req = http.expectOne('/api/v1/analitica/preparation/types');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('upsertPreparation hace PUT con {items} al endpoint de la determinación', () => {
    svc.upsertPreparation(7, [{ type: 'AYUNO', fastingHours: 8 }]).subscribe();
    const req = http.expectOne('/api/v1/analitica/determinations/7/preparation');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ items: [{ type: 'AYUNO', fastingHours: 8 }] });
    req.flush(null);
  });

  it('setActivation hace PUT a /tenant-analyses/activation', () => {
    svc.setActivation(100, true, 'GLU', 'Glucemia').subscribe();
    const req = http.expectOne('/api/v1/tenant-analyses/activation');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ catalogId: 100, active: true, shortCode: 'GLU', customName: 'Glucemia' });
    req.flush(null);
  });

  it('getQualitativeCategories hace GET', () => {
    svc.getQualitativeCategories().subscribe();
    const r = http.expectOne('/api/v1/analitica/qualitative-categories');
    expect(r.request.method).toBe('GET');
    r.flush([]);
  });

  it('createQualitativeCategory hace POST con name/ordinal/values', () => {
    svc.createQualitativeCategory('Color de orina', false, ['AMARILLO', 'ÁMBAR']).subscribe();
    const r = http.expectOne('/api/v1/analitica/qualitative-categories');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual({ name: 'Color de orina', ordinal: false, values: ['AMARILLO', 'ÁMBAR'] });
    r.flush({});
  });
});
