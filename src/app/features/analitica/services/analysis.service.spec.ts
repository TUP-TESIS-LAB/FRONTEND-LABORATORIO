import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let http: { get: ReturnType<typeof vi.fn> };
  let service: AnalysisService;

  beforeEach(() => {
    http = { get: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AnalysisService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(AnalysisService);
  });

  it('findByShortCode calls /api/v1/analitica/analysis?shortCode=N', async () => {
    http.get.mockReturnValue(of({ id: 5, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3 }));
    const r = await firstValueFrom(service.findByShortCode(1001));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { shortCode: '1001' } });
    expect(r?.shortCode).toBe(1001);
  });

  it('searchByName calls /api/v1/analitica/analysis?nameLike=...&limit=10', async () => {
    http.get.mockReturnValue(of([
      { id: 5, shortCode: 1001, name: 'Hemograma', familyName: null, ubCount: 3 },
    ]));
    const r = await firstValueFrom(service.searchByName('hemo'));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { nameLike: 'hemo', limit: '10' } });
    expect(r).toHaveLength(1);
  });

  it('getById calls /api/v1/analitica/analysis/{id} and returns AnalysisDetail', async () => {
    http.get.mockReturnValue(of({
      id: 5, shortCode: 1001, name: 'Hemograma', familyName: 'Hematología', ubCount: 3,
      description: 'Recuento celular', determinations: [], processingTime: 30, processingTimeUnit: 'MINUTES', nbuCode: 'NBU-123',
    }));
    const r = await firstValueFrom(service.getById(5));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis/5');
    expect(r.nbuCode).toBe('NBU-123');
  });
});
