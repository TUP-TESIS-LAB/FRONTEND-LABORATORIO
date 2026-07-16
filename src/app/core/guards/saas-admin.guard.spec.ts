import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { TokenService } from '@core/auth/token.service';
import { saasAdminGuard } from './saas-admin.guard';

describe('saasAdminGuard', () => {
  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => saasAdminGuard({} as never, {} as never)) as boolean | UrlTree;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (cmds: unknown[]) => ({ cmds } as unknown as UrlTree) } },
        { provide: TokenService, useValue: { isTokenValid: () => false, getRoles: () => [] } },
      ],
    });
  });

  it('redirects to /saas/login when token is missing', () => {
    const result = run() as UrlTree & { cmds: unknown[] };
    expect(result.cmds).toEqual(['/saas/login']);
  });

  it('redirects to /saas/login when token has no SAAS_ADMIN role', () => {
    TestBed.overrideProvider(TokenService, {
      useValue: { isTokenValid: () => true, getRoles: () => ['ADMINISTRADOR'] },
    });
    const result = run() as UrlTree & { cmds: unknown[] };
    expect(result.cmds).toEqual(['/saas/login']);
  });

  it('returns true when token carries SAAS_ADMIN', () => {
    TestBed.overrideProvider(TokenService, {
      useValue: { isTokenValid: () => true, getRoles: () => ['SAAS_ADMIN'] },
    });
    expect(run()).toBe(true);
  });
});
