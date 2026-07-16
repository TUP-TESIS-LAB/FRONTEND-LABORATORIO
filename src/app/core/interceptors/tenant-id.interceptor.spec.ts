import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { tenantIdInterceptor } from './tenant-id.interceptor';
import { TokenService } from '@core/auth/token.service';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return [header, body, 'sig']
    .join('.')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const MOCK_JWT = makeJwt({
  sub: 'admin',
  tenantId: 1,
  userId: 42,
  roles: ['ADMINISTRADOR'],
  isExternal: false,
  exp: 9999999999,
  iat: 1,
});

describe('tenantIdInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tenantIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenService = TestBed.inject(TokenService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add X-Tenant-ID header when token has tenantId', () => {
    tokenService.setToken(MOCK_JWT);
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-Tenant-ID')).toBe('1');
    req.flush({});
  });
});
