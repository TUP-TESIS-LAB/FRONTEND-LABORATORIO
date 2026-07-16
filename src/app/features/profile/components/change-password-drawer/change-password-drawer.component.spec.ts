import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { TokenService } from '@core/auth/token.service';
import { UserSessionService } from '@features/profile/services/user-session.service';
import { ProfileMenuService } from '@features/profile/services/profile-menu.service';
import { ChangePasswordDrawerComponent } from './change-password-drawer.component';

describe('ChangePasswordDrawerComponent', () => {
  let fixture: ComponentFixture<ChangePasswordDrawerComponent>;
  let http: HttpTestingController;
  let profileMenu: ProfileMenuService;

  const tokenStub = {
    getUserId: () => 42 as number | null,
    removeToken: () => {},
  };
  const userSessionStub = {
    clear: () => {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ChangePasswordDrawerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenService, useValue: tokenStub },
        { provide: UserSessionService, useValue: userSessionStub },
      ],
    });
    fixture = TestBed.createComponent(ChangePasswordDrawerComponent);
    http = TestBed.inject(HttpTestingController);
    profileMenu = TestBed.inject(ProfileMenuService);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reflects passwordDrawerOpen signal as the drawer visibility', () => {
    const comp = fixture.componentInstance as any;
    expect(comp.visible()).toBe(false);
    profileMenu.openPasswordDrawer();
    expect(comp.visible()).toBe(true);
  });

  it('calls closePasswordDrawer when the drawer visibility flips to false', () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    const closeSpy = vi.spyOn(profileMenu, 'closePasswordDrawer');
    comp.onVisibleChange(false);
    expect(closeSpy).toHaveBeenCalled();
  });

  it('blocks submit when the form is invalid', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    await comp.onSubmit();
    http.expectNone('/api/v1/user/42/password');
  });

  it('submits and shows success on 200', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await submit;
    expect(comp.success()).toBe(true);
  });

  it('triggers session clear and navigates after the autologout timeout', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    const router = TestBed.inject(Router);
    const removeSpy = vi.spyOn(tokenStub, 'removeToken');
    const clearSpy = vi.spyOn(userSessionStub, 'clear');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    http.expectOne('/api/v1/user/42/password').flush(null);
    await submit;

    expect(removeSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(removeSpy).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('shows specific error message on 401', async () => {
    profileMenu.openPasswordDrawer();
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'wrong1234', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    http.expectOne('/api/v1/user/42/password').flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await submit;
    expect(comp.error()).toBe('La contraseña actual es incorrecta.');
  });
});
