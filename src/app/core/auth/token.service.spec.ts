import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

// JWT with payload: { sub: '1', tenant_id: 'lab1', email: 'a@b.com', name: 'Ana', roles: ['admin'], exp: 9999999999, iat: 1 }
const MOCK_JWT = [
  'eyJhbGciOiJIUzI1NiJ9',
  'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MX0',
  'signature',
].join('.');

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  it('should store and retrieve a token', () => {
    service.setToken(MOCK_JWT);
    expect(service.getToken()).toBe(MOCK_JWT);
  });

  it('should decode tenant_id from JWT payload', () => {
    service.setToken(MOCK_JWT);
    expect(service.getTenantId()).toBe('lab1');
  });

  it('should return null for tenant_id when no token', () => {
    expect(service.getTenantId()).toBeNull();
  });

  it('should detect expired token', () => {
    const expiredJwt = [
      'eyJhbGciOiJIUzI1NiJ9',
      'eyJzdWIiOiIxIiwidGVuYW50X2lkIjoibGFiMSIsImVtYWlsIjoiYUBiLmNvbSIsIm5hbWUiOiJBbmEiLCJyb2xlcyI6WyJhZG1pbiJdLCJleHAiOjEsImlhdCI6MX0',
      'sig',
    ].join('.');
    service.setToken(expiredJwt);
    expect(service.isTokenValid()).toBe(false);
  });

  it('should clear token on removeToken', () => {
    service.setToken(MOCK_JWT);
    service.removeToken();
    expect(service.getToken()).toBeNull();
  });
});
