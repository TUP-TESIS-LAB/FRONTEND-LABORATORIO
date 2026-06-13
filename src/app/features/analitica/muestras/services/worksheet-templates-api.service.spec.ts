import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorksheetTemplatesApiService } from './worksheet-templates-api.service';
import type { WorksheetTemplate } from '../models/worksheet-template.model';

const BASE = '/api/v1/analitica/worksheets/templates';

const sample: WorksheetTemplate = {
  id: 1, name: 'Coagulación', analyses: [{ analysisTypeId: 10, displayOrder: 0 }], active: true, version: 1,
};

describe('WorksheetTemplatesApiService', () => {
  let service: WorksheetTemplatesApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), WorksheetTemplatesApiService],
    });
    service = TestBed.inject(WorksheetTemplatesApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listTemplates hace GET al endpoint', () => {
    let result: WorksheetTemplate[] | undefined;
    service.listTemplates().subscribe(r => (result = r));
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('GET');
    req.flush([sample]);
    expect(result).toEqual([sample]);
  });

  it('createTemplate hace POST con el body', () => {
    const body = { name: 'Nueva', analyses: [{ analysisTypeId: 10, displayOrder: 0 }] };
    service.createTemplate(body).subscribe();
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(sample);
  });

  it('updateTemplate hace PUT a /{id} con el body', () => {
    const body = { name: 'Editada', analyses: [{ analysisTypeId: 11, displayOrder: 0 }] };
    service.updateTemplate(1, body).subscribe();
    const req = http.expectOne(`${BASE}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush(sample);
  });
});
