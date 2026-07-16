import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('disables submit while email invalid', () => {
    const comp = fixture.componentInstance as any;
    expect(comp.form.invalid).toBe(true);
    comp.form.patchValue({ email: 'not-email' });
    expect(comp.form.invalid).toBe(true);
    comp.form.patchValue({ email: 'a@b.com' });
    expect(comp.form.valid).toBe(true);
  });

  it('shows success state after API call resolves', async () => {
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ email: 'a@b.com' });
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    expect(req.request.body).toEqual({ email: 'a@b.com' });
    req.flush(null);
    await submit;
    expect(comp.sent()).toBe(true);
    expect(comp.error()).toBeNull();
  });

  it('shows error on failed API call', async () => {
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ email: 'a@b.com' });
    const submit = comp.onSubmit();
    const req = http.expectOne('/api/v1/auth/internal/password/forgot');
    req.flush(null, { status: 500, statusText: 'Server Error' });
    await submit;
    expect(comp.sent()).toBe(false);
    expect(comp.error()).toBe('Ocurrió un error. Intentá de nuevo más tarde.');
  });
});
