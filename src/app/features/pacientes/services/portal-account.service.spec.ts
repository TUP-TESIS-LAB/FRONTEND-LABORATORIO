import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { PortalAccountService } from './portal-account.service';

describe('PortalAccountService', () => {
  let http: { post: ReturnType<typeof vi.fn> };
  let service: PortalAccountService;

  beforeEach(() => {
    http = { post: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        PortalAccountService,
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(PortalAccountService);
  });

  describe('createAccount', () => {
    it('realiza POST al path correcto con body {}', async () => {
      http.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.createAccount(42));

      expect(http.post).toHaveBeenCalledWith('/api/v1/empresa/patients/42/account', {});
    });

    it('usa el patientId correcto en la URL', async () => {
      http.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.createAccount(99));

      expect(http.post).toHaveBeenCalledWith('/api/v1/empresa/patients/99/account', {});
    });
  });

  describe('resendAccess', () => {
    it('realiza POST al path /resend correcto con body {}', async () => {
      http.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.resendAccess(7));

      expect(http.post).toHaveBeenCalledWith('/api/v1/empresa/patients/7/account/resend', {});
    });

    it('usa el patientId correcto en la URL de resend', async () => {
      http.post.mockReturnValue(of(undefined));

      await firstValueFrom(service.resendAccess(100));

      expect(http.post).toHaveBeenCalledWith('/api/v1/empresa/patients/100/account/resend', {});
    });
  });
});
