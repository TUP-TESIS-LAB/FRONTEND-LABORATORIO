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

  it('getAwaiting hits the correct URL with POLLING_REQUEST context', () => {
    service.getAwaiting().subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/awaiting-extraction');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(POLLING_REQUEST)).toBe(true);
    req.flush([]);
  });

  it('getMine hits in-extraction without any params (filter is JWT-based)', () => {
    service.getMine().subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/in-extraction');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });

  it('getStats hits extraction-stats', () => {
    service.getStats().subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/extraction-stats');
    expect(req.request.method).toBe('GET');
    req.flush({ queueSize: 0, averageWaitMinutes: null, finishedTodayByMe: 0 });
  });

  it('assignExtractor sends only attentionBox in the body (NOT extractorId)', () => {
    service.assignExtractor(99, 3).subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/99/assign/extractor');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ attentionBox: 3 });
    expect((req.request.body as Record<string, unknown>)['extractorId']).toBeUndefined();
    req.flush(null);
  });

  it('cancelExtraction PATCHes the correct endpoint with empty body', () => {
    service.cancelExtraction(7).subscribe();
    const req = httpMock.expectOne('/api/v1/attentions/7/cancel-extraction');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
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
