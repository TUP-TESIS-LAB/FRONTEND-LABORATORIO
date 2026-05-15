import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TokenService } from '@core/auth/token.service';
import { ChangePasswordComponent } from './change-password.component';

describe('ChangePasswordComponent', () => {
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let http: HttpTestingController;
  const tokenStub = {
    getUserId: () => null as number | null,
    removeToken: () => {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TokenService, useValue: tokenStub },
      ],
    });
    fixture = TestBed.createComponent(ChangePasswordComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('does nothing when no userId', async () => {
    tokenStub.getUserId = () => null;
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    await comp.onSubmit();
    http.expectNone('/api/v1/user/42/password');
    expect(comp.success()).toBe(false);
  });

  it('submits and shows success', async () => {
    tokenStub.getUserId = () => 42;
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'old12345', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/user/42/password');
    expect(req.request.body).toEqual({ currentPassword: 'old12345', newPassword: 'new12345' });
    req.flush(null);
    await submit;
    expect(comp.success()).toBe(true);
  });

  it('shows specific error on 401', async () => {
    tokenStub.getUserId = () => 42;
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ currentPassword: 'wrong1234', newPassword: 'new12345', confirmPassword: 'new12345' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/user/42/password');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    await submit;
    expect(comp.error()).toBe('La contraseña actual es incorrecta.');
  });
});
