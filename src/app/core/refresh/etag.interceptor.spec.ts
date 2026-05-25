import { HttpClient, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';
import { etagInterceptor } from './etag.interceptor';
import { EtagCacheService } from './etag-cache.service';
import { isNotModified, withPolling } from './polling-context';

describe('etagInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let cache: EtagCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([etagInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(EtagCacheService);
  });

  afterEach(() => httpMock.verify());

  it('first polling call does NOT send If-None-Match and caches returned ETag', async () => {
    const promise = firstValueFrom(
      http.get<{ ok: boolean }>('/api/v1/foo', { context: withPolling() }),
    );
    const req = httpMock.expectOne('/api/v1/foo');
    expect(req.request.headers.has('If-None-Match')).toBe(false);
    req.flush({ ok: true }, { headers: { ETag: 'W/"abc"' } });
    const res = await promise;
    expect(res).toEqual({ ok: true });
    expect(cache.get('GET /api/v1/foo')).toBe('W/"abc"');
  });

  it('second polling call sends cached If-None-Match', async () => {
    cache.set('GET /api/v1/foo', 'W/"abc"');
    const promise = firstValueFrom(
      http.get<{ ok: boolean }>('/api/v1/foo', { context: withPolling() }),
    );
    const req = httpMock.expectOne('/api/v1/foo');
    expect(req.request.headers.get('If-None-Match')).toBe('W/"abc"');
    req.flush({ ok: true }, { headers: { ETag: 'W/"abc"' } });
    await promise;
  });

  it('translates a 304 response into the NotModified sentinel (no error)', async () => {
    cache.set('GET /api/v1/foo', 'W/"abc"');
    const promise = lastValueFrom(
      http.get<unknown>('/api/v1/foo', { context: withPolling() }).pipe(toArray()),
    );
    const req = httpMock.expectOne('/api/v1/foo');
    req.flush(null, { status: 304, statusText: 'Not Modified' });
    const values = await promise;
    expect(values).toHaveLength(1);
    expect(isNotModified(values[0])).toBe(true);
  });

  it('does NOT add If-None-Match for non-polling requests', () => {
    cache.set('GET /api/v1/other', 'W/"xyz"');
    http.get('/api/v1/other').subscribe();
    const req = httpMock.expectOne('/api/v1/other');
    expect(req.request.headers.has('If-None-Match')).toBe(false);
    req.flush({});
  });

  it('non-304 errors are propagated', async () => {
    const errPromise = firstValueFrom(
      http.get('/api/v1/boom', { context: withPolling() }),
    ).catch((e: unknown) => e);
    const req = httpMock.expectOne('/api/v1/boom');
    req.flush({ msg: 'no' }, { status: 500, statusText: 'Server Error' });
    const err = (await errPromise) as { status: number };
    expect(err.status).toBe(500);
  });

  it('cache key sorts query params so order does not matter', () => {
    const k1 = EtagCacheService.buildKey('GET', '/api/v1/x?b=2&a=1');
    const k2 = EtagCacheService.buildKey('GET', '/api/v1/x?a=1&b=2');
    expect(k1).toBe(k2);
  });
});

// Silence unused import warning when stripping types in some setups.
void HttpResponse;
