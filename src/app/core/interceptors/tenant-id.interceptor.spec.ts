import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { tenantIdInterceptor } from './tenant-id.interceptor';
import { TokenService } from '@core/auth/token.service';

// JWT payload: { sub:'1', tenant_id:'lab1', email:'a@b.com', name:'Ana', roles:['admin'], exp:9999999999, iat:1 }
const MOCK_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MX0',
  'sig',
].join('.');

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

  it('should add X-Tenant-ID header when token has tenant_id', () => {
    tokenService.setToken(MOCK_JWT);
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-Tenant-ID')).toBe('lab1');
    req.flush({});
  });
});
