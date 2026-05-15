import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

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

  it('should decode tenantId from JWT payload as string', () => {
    service.setToken(MOCK_JWT);
    expect(service.getTenantId()).toBe('1');
  });

  it('should return null for tenantId when no token', () => {
    expect(service.getTenantId()).toBeNull();
  });

  it('should detect expired token', () => {
    const expiredJwt = makeJwt({
      sub: 'admin',
      tenantId: 1,
      userId: 42,
      roles: ['ADMINISTRADOR'],
      isExternal: false,
      exp: 1,
      iat: 1,
    });
    service.setToken(expiredJwt);
    expect(service.isTokenValid()).toBe(false);
  });

  it('should clear token on removeToken', () => {
    service.setToken(MOCK_JWT);
    service.removeToken();
    expect(service.getToken()).toBeNull();
  });

  it('should decode userId from JWT userId claim', () => {
    service.setToken(MOCK_JWT);
    expect(service.getUserId()).toBe(42);
  });

  it('should return null for userId when no token', () => {
    expect(service.getUserId()).toBeNull();
  });

  it('should return null for userId when payload missing userId claim', () => {
    const jwtWithoutUserId = makeJwt({
      sub: 'admin',
      tenantId: 1,
      roles: ['ADMINISTRADOR'],
      isExternal: false,
      exp: 9999999999,
      iat: 1,
    });
    service.setToken(jwtWithoutUserId);
    expect(service.getUserId()).toBeNull();
  });
});
