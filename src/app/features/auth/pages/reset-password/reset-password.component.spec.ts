import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let http: HttpTestingController | undefined;

  function configure(token: string, tenantId: string) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ token, tenantId }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http?.verify());

  it('marks tokenInvalid when token query param missing', () => {
    configure('', '');
    fixture.detectChanges();
    expect((fixture.componentInstance as any).tokenInvalid()).toBe(true);
  });

  it('validates token on init and stays valid when API resolves', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    const req = http!.expectOne('/api/v1/auth/password/validate-token');
    expect(req.request.headers.get('X-Tenant-Id')).toBe('lab1');
    req.flush(null);
    await fixture.whenStable();
    expect((fixture.componentInstance as any).tokenInvalid()).toBe(false);
  });

  it('marks tokenInvalid when validate API errors', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    const req = http!.expectOne('/api/v1/auth/password/validate-token');
    req.flush(null, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect((fixture.componentInstance as any).tokenInvalid()).toBe(true);
  });

  it('submits reset and shows success', async () => {
    configure('tok12345', 'lab1');
    fixture.detectChanges();
    http!.expectOne('/api/v1/auth/password/validate-token').flush(null);
    await fixture.whenStable();
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ newPassword: 'newpw1234', confirmPassword: 'newpw1234' });
    comp.form.get('confirmPassword')?.updateValueAndValidity();
    const submit = comp.onSubmit();
    const resetReq = http!.expectOne('/api/v1/auth/password/reset');
    expect(resetReq.request.body).toEqual({ token: 'tok12345', newPassword: 'newpw1234' });
    resetReq.flush(null);
    await submit;
    expect(comp.success()).toBe(true);
  });
});
