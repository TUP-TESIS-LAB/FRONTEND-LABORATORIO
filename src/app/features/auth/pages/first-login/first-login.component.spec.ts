import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { FirstLoginComponent } from './first-login.component';

describe('FirstLoginComponent', () => {
  let fixture: ComponentFixture<FirstLoginComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FirstLoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(FirstLoginComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows error placeholder when no firstLoginToken in navigation state', () => {
    fixture.detectChanges();
    expect((fixture.componentInstance as any).token()).toBeNull();
  });

  it('submits set-password with token from navigation state', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'getCurrentNavigation').mockReturnValue({
      extras: { state: { firstLoginToken: 'tok12345' } },
    } as unknown as ReturnType<Router['getCurrentNavigation']>);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.detectChanges();
    const comp = fixture.componentInstance as any;
    expect(comp.token()).toBe('tok12345');

    comp.form.patchValue({ newPassword: 'newpw1234', confirmPassword: 'newpw1234' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/auth/first-login/set-password-with-token');
    expect(req.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    req.flush(null);
    await submit;
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
