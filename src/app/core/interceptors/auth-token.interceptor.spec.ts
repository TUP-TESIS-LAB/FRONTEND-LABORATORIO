import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { authTokenInterceptor } from './auth-token.interceptor';
import { TokenService } from '@core/auth/token.service';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
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

  it('should add Authorization header when token exists', () => {
    tokenService.setToken('my.jwt.token');
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my.jwt.token');
    req.flush({});
  });

  it('should NOT add Authorization header when no token', () => {
    localStorage.clear();
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush({});
  });

  it('clears token and redirects to /login on 401', async () => {
    const router = TestBed.inject(Router);
    const removeSpy = vi.spyOn(tokenService, 'removeToken');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(tokenService, 'getToken').mockReturnValue('some.jwt.token');

    const errorPromise = firstValueFrom(http.get('/api/v1/anything')).catch((e: unknown) => e);

    const req = httpMock.expectOne('/api/v1/anything');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const err = await errorPromise as { status: number };
    expect(err.status).toBe(401);
    expect(removeSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
