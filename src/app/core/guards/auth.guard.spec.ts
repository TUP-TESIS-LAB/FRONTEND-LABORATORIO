import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth.guard';
import { TokenService } from '@core/auth/token.service';
import { Router } from '@angular/router';

describe('authGuard', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (c: unknown[]) => c, navigate: vi.fn() } },
      ],
    });
    tokenService = TestBed.inject(TokenService);
    localStorage.clear();
  });

  it('should allow access when token is valid', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any),
    );
    expect(result).toBe(true);
  });

  it('should redirect to /login when token is invalid', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any),
    );
    expect(result).toEqual(['/login']);
  });
});
