import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthApiService } from './auth-api.service';
import { LoginResponse, UserResponse } from '../models/auth.models';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuthApiService],
    });
    service = TestBed.inject(AuthApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loginInternal posts credentials and returns LoginResponse', async () => {
    const mockUser: UserResponse = {
      id: 1, firstName: 'Ana', lastName: 'Perez', username: 'ana', email: 'a@b.com',
      phone: null, document: null, isEmailVerified: true, isExternal: false,
      branch: null, isFirstLogin: false, active: true, roles: [],
    };
    const mockResp: LoginResponse = { token: 'jwt', firstLoginToken: null, user: mockUser, isFirstLogin: false };

    const promise = service.loginInternal('a@b.com', 'pw12345678');
    const req = http.expectOne('/api/v1/auth/internal/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', password: 'pw12345678' });
    req.flush(mockResp);

    expect(await promise).toEqual(mockResp);
  });

  it('internalForgotPassword posts email', async () => {
    const promise = service.internalForgotPassword('a@b.com');
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com' });
    req.flush(null);
    await promise;
  });

  it('validateResetToken posts token with X-Tenant-Id header', async () => {
    const promise = service.validateResetToken('tok12345', 'lab1');
    const req = http.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345' });
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await promise;
  });

  it('resetPassword posts token + newPassword with X-Tenant-Id header', async () => {
    const promise = service.resetPassword('tok12345', 'newpw1234', 'lab1');
    const req = http.expectOne('/api/v1/auth/password/reset');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await promise;
  });

  it('setFirstLoginPassword posts token + newPassword', async () => {
    const promise = service.setFirstLoginPassword('tok12345', 'newpw1234');
    const req = http.expectOne('/api/v1/auth/first-login/set-password-with-token');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    req.flush(null);
    await promise;
  });
});
