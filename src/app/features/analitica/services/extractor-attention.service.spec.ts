import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { POLLING_REQUEST, etagInterceptor } from '@core/refresh';
import { ExtractorAttentionService } from './extractor-attention.service';

describe('ExtractorAttentionService', () => {
  let service: ExtractorAttentionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([etagInterceptor])),
        provideHttpClientTesting(),
        ExtractorAttentionService,
      ],
    });
    service = TestBed.inject(ExtractorAttentionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getMyBranches hits /me/branches with POLLING_REQUEST context', () => {
    service.getMyBranches().subscribe();
    const req = httpMock.expectOne('/api/v1/me/branches');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
    req.flush([]);
  });

  it('getBoxOccupancy hits /branches/{id}/extraction-boxes/occupancy', () => {
    service.getBoxOccupancy(7).subscribe();
    const req = httpMock.expectOne('/api/v1/branches/7/extraction-boxes/occupancy');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
    req.flush([]);
  });

  it('getAwaiting sends branchId as query param', () => {
    service.getAwaiting(3).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/attentions/awaiting-extraction');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('branchId')).toBe('3');
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
    req.flush([]);
  });

  it('getMine sends branchId as query param', () => {
    service.getMine(5).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/attentions/in-extraction');
    expect(req.request.params.get('branchId')).toBe('5');
    req.flush([]);
  });

  it('getStats sends branchId as query param', () => {
    service.getStats(2).subscribe();
    const req = httpMock.expectOne((r) => r.url === '/api/v1/attentions/extraction-stats');
    expect(req.request.params.get('branchId')).toBe('2');
    req.flush({ queueSize: 0, averageWaitMinutes: null, finishedTodayByMe: 0 });
  });

  it('assignExtractor sends attentionBox AND branchId in the body', () => {
    service.assignExtractor(99, 3, 7).subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/99/assign/extractor');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ attentionBox: 3, branchId: 7 });
    expect((req.request.body as Record<string, unknown>)['extractorId']).toBeUndefined();
    req.flush(null);
  });

  it('cancelExtraction PATCHes with reason in body', () => {
    service.cancelExtraction(7, 'paciente no se presentó').subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/7/cancel-extraction');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ reason: 'paciente no se presentó' });
    req.flush(null);
  });

  it('endExtraction PATCHes the correct endpoint with empty body', () => {
    service.endExtraction(7).subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/7/end-extraction');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(null);
  });
});
