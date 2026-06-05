import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, firstValueFrom } from 'rxjs';
import { LabelsService } from './labels.service';
import { LabelResponse } from '../models/label.model';

describe('LabelsService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: LabelsService;
  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({ providers: [LabelsService, { provide: HttpClient, useValue: http }] });
    service = TestBed.inject(LabelsService);
  });
  it('getByProtocol pega a /api/v1/analitica/preanalitica/labels/protocol/{id}', async () => {
    const labels: LabelResponse[] = [{ id: 1, protocolId: 9, analysisId: 3 }];
    http.get.mockReturnValue(of(labels));
    const r = await firstValueFrom(service.getByProtocol(9));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/preanalitica/labels/protocol/9');
    expect(r).toEqual(labels);
  });
});
