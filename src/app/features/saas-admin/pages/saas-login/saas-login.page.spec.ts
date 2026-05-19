import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AuthApiService } from '@features/auth/services/auth-api.service';
import { TokenService } from '@core/auth/token.service';
import { SaasLoginPage } from './saas-login.page';

describe('SaasLoginPage', () => {
  let auth: { loginInternal: ReturnType<typeof vi.fn> };
  let tokens: TokenService;

  beforeEach(() => {
    auth = { loginInternal: vi.fn() };
    TestBed.configureTestingModule({
      imports: [SaasLoginPage, ReactiveFormsModule],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        MessageService,
        { provide: AuthApiService, useValue: auth },
      ],
    });
    tokens = TestBed.inject(TokenService);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  function jwtWith(roles: string[]): string {
    const header = btoa(JSON.stringify({ alg: 'none' }));
    const payload = btoa(JSON.stringify({ roles, exp: Math.floor(Date.now() / 1000) + 3600 }));
    return `${header}.${payload}.`;
  }

  it('navigates to /saas after successful login when token has SAAS_ADMIN', async () => {
    auth.loginInternal.mockResolvedValue({ token: jwtWith(['SAAS_ADMIN']), firstLoginToken: null, user: {} as any, isFirstLogin: false });
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SaasLoginPage);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ email: 'a@b.com', password: 'x' });
    await fixture.componentInstance.submit();
    expect(navSpy).toHaveBeenCalledWith(['/saas']);
    expect(tokens.getToken()).toBeTruthy();
  });

  it('rejects login when token lacks SAAS_ADMIN role and clears token', async () => {
    auth.loginInternal.mockResolvedValue({ token: jwtWith(['ADMINISTRADOR']), firstLoginToken: null, user: {} as any, isFirstLogin: false });
    const fixture = TestBed.createComponent(SaasLoginPage);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ email: 'a@b.com', password: 'x' });
    await fixture.componentInstance.submit();
    expect(tokens.getToken()).toBeNull();
    expect(fixture.componentInstance.errorMessage()).toContain('plataforma');
  });
});
