import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let http: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  let service: AnalysisService;

  beforeEach(() => {
    http = { get: vi.fn(), put: vi.fn(), post: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AnalysisService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(AnalysisService);
  });

  it('findByShortCode calls /api/v1/analitica/analysis?shortCode=S and unwraps array[0]', async () => {
    http.get.mockReturnValue(of([{ id: 5, shortCode: '1001', name: 'Hemograma', familyName: 'Hematología', ubCount: 3 }]));
    const r = await firstValueFrom(service.findByShortCode('1001'));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { shortCode: '1001' } });
    expect(r?.shortCode).toBe('1001');
  });

  it('findByShortCode returns null when backend array is empty', async () => {
    http.get.mockReturnValue(of([]));
    const r = await firstValueFrom(service.findByShortCode('9999'));
    expect(r).toBeNull();
  });

  it('searchByName calls /api/v1/analitica/analysis?nameLike=...&limit=10', async () => {
    http.get.mockReturnValue(of([
      { id: 5, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: 3 },
    ]));
    const r = await firstValueFrom(service.searchByName('hemo'));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { nameLike: 'hemo', limit: '10' } });
    expect(r).toHaveLength(1);
  });

  it('getById calls /api/v1/analitica/analysis/{id} and returns AnalysisDetail', async () => {
    http.get.mockReturnValue(of({
      id: 5, shortCode: '1001', name: 'Hemograma', familyName: 'Hematología', ubCount: 3,
      description: 'Recuento celular', determinations: [], processingTime: 30, processingTimeUnit: 'MINUTES', nbuCode: 'NBU-123',
    }));
    const r = await firstValueFrom(service.getById(5));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis/5');
    expect(r.nbuCode).toBe('NBU-123');
  });

  it('searchByShortCodePrefix calls /api/v1/analitica/analysis?shortCodePrefix=...&limit=...', async () => {
    http.get.mockReturnValue(of([
      { id: 5, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: 3 },
    ]));
    const r = await firstValueFrom(service.searchByShortCodePrefix('100', 5));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { shortCodePrefix: '100', limit: '5' } });
    expect(r).toHaveLength(1);
  });

  // ── KAN-246: búsqueda unificada (nombre / código interno / código NBU) ────
  it('search calls /api/v1/analitica/analysis?q=...&limit=10 (default limit)', async () => {
    http.get.mockReturnValue(of([
      { id: 5, shortCode: '1001', name: 'Hemograma', familyName: null, ubCount: 3, nbuCode: 'NBU-123' },
    ]));
    const r = await firstValueFrom(service.search('001'));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { q: '001', limit: '10' } });
    expect(r).toHaveLength(1);
  });

  it('search respeta el limit explícito', async () => {
    http.get.mockReturnValue(of([]));
    await firstValueFrom(service.search('hem', 5));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analysis', { params: { q: 'hem', limit: '5' } });
  });

  // ── Secciones (KAN-218) ─────────────────────────────────────────────────────

  it('countBySection calls GET /api/v1/analitica/analyses/count-by-section', async () => {
    http.get.mockReturnValue(of({ 1: 4, 2: 0 }));
    const r = await firstValueFrom(service.countBySection());
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analyses/count-by-section');
    expect(r).toEqual({ 1: 4, 2: 0 });
  });

  it('unassignedCount calls GET /api/v1/analitica/analyses/unassigned-count', async () => {
    http.get.mockReturnValue(of(7));
    const r = await firstValueFrom(service.unassignedCount());
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/analyses/unassigned-count');
    expect(r).toBe(7);
  });

  it('sectionAnalyses calls GET /api/v1/analitica/section-assignments/{id}', async () => {
    http.get.mockReturnValue(of([{ analysisId: 5, name: 'Hemograma', shortCode: '1001' }]));
    const r = await firstValueFrom(service.sectionAnalyses(3));
    expect(http.get).toHaveBeenCalledWith('/api/v1/analitica/section-assignments/3');
    expect(r).toHaveLength(1);
  });

  it('setSectionAnalyses PUTs {analysisIds} to /section-assignments/{id}', async () => {
    http.put.mockReturnValue(of(undefined));
    await firstValueFrom(service.setSectionAnalyses(3, [5, 6]));
    expect(http.put).toHaveBeenCalledWith('/api/v1/analitica/section-assignments/3', { analysisIds: [5, 6] });
  });

  it('resolveByNames POSTs {names} to /api/v1/analitica/analysis/resolve', async () => {
    http.post.mockReturnValue(of([{ name: 'hemograma', analysisId: 5, matched: true }]));
    const r = await firstValueFrom(service.resolveByNames(['hemograma', 'xxx']));
    expect(http.post).toHaveBeenCalledWith('/api/v1/analitica/analysis/resolve', { names: ['hemograma', 'xxx'] });
    expect(r[0].matched).toBe(true);
  });
});
