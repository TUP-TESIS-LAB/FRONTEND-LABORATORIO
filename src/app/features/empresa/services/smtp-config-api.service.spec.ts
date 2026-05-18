import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { SmtpConfigApiService } from './smtp-config-api.service';

describe('SmtpConfigApiService', () => {
  let service: SmtpConfigApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SmtpConfigApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SmtpConfigApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /api/v1/empresa/smtp', () => {
    service.get().subscribe();
    const req = http.expectOne('/api/v1/empresa/smtp');
    expect(req.request.method).toBe('GET');
    req.flush({ configured: false });
  });

  it('PUT /api/v1/empresa/smtp with payload', () => {
    const payload = { gmailUsername: 'lab@gmail.com', appPassword: 'abcdefghijklmnop' };
    service.save(payload).subscribe();
    const req = http.expectOne('/api/v1/empresa/smtp');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({ configured: true });
  });

  it('POST /api/v1/empresa/smtp/test with destinatario', () => {
    service.sendTest({ to: 'me@x.com' }).subscribe();
    const req = http.expectOne('/api/v1/empresa/smtp/test');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ to: 'me@x.com' });
    req.flush({ delivered: true, sentAt: '2026-05-16T14:30:00Z' });
  });
});
