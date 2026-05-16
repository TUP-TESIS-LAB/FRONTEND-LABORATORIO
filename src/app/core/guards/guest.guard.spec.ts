import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { guestGuard } from './guest.guard';
import { TokenService } from '@core/auth/token.service';

describe('guestGuard', () => {
  let tokenService: TokenService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (c: unknown[]) => c } },
      ],
    });
    tokenService = TestBed.inject(TokenService);
    router = TestBed.inject(Router);
  });

  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('returns true when no valid token', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(false);
    expect(run()).toBe(true);
  });

  it('redirects to / when valid token present', () => {
    vi.spyOn(tokenService, 'isTokenValid').mockReturnValue(true);
    const result = run();
    expect(result).toEqual(['/']);
  });
});
