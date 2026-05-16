import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthAdminApiService } from './auth-admin-api.service';

describe('AuthAdminApiService', () => {
  let service: AuthAdminApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthAdminApiService],
    });
    service = TestBed.inject(AuthAdminApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('resendEmailVerification POST con userId', () => {
    service.resendEmailVerification(42).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/auth/email/resend');
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('userId')).toBe('42');
    req.flush(null);
  });

  it('generateFirstLoginToken POST y devuelve text', () => {
    service.generateFirstLoginToken(42).subscribe((token) => {
      expect(token).toBe('xyz');
    });
    const req = http.expectOne((r) => r.url === '/api/v1/auth/first-login/generate-token');
    req.flush('xyz');
  });
});
